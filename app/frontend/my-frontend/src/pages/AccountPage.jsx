import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI, auditAPI, companiesAPI, tokenManager } from '../services/api';
import '../admin.css'; // Reuse some admin styles for the form
import { useI18n } from '../i18n/I18nContext';

const normalizePostalCodeInput = (value) => {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 5);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
};

const stripAllWhitespace = (value) => {
  return String(value || '').replace(/\s+/g, '');
};

const normalizeHumanNameInput = (value) => {
  return String(value || '').trim().replace(/\s+/g, ' ');
};

const sanitizePhoneNumberInput = (value) => {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  if (!digits) return '';
  return `+${digits}`;
};

const formatPhoneDisplay = (value) => {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  if (!digits) {
    return raw.startsWith('+') ? '+' : '';
  }
  const plus = '+';

  const inferredCountryLen = digits.length > 9 ? Math.min(3, digits.length - 9) : Math.min(3, digits.length);
  const country = digits.slice(0, inferredCountryLen);
  const rest = digits.slice(inferredCountryLen);

  const groups = rest.match(/.{1,3}/g) || [];
  const grouped = groups.join('-');

  return plus + country + (grouped ? ` ${grouped}` : '');
};

function AccountPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, locale } = useI18n();

  const tx = (value) => {
    if (!value) return '';
    const s = String(value);
    if (s.startsWith('account.') || s.startsWith('common.')) return t(s);
    return s;
  };

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [profileForm, setProfileForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    email: '',
    phone: '',
    city: '',
    streetName: '',
    streetNumber: '',
    apartmentNumber: '',
    postalCode: '',
    description: '',
    openingHour: '08:00',
    closingHour: '18:00',
  });
  const [companyFormError, setCompanyFormError] = useState('');
  const [companyFormLoading, setCompanyFormLoading] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState([]);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');

  const [auditPageSize, setAuditPageSize] = useState(10);
  const [auditPage, setAuditPage] = useState(1);

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    setAuditError('');
    try {
      const res = await auditAPI.getMy(200);
      const items = Array.isArray(res.data) ? res.data : [];
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAuditLogs(items);
      setAuditPage(1);
    } catch (err) {
      console.error('Audit logs load error:', err);
      setAuditError('account.audit.loadError');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError('');

      try {
        const response = await authAPI.getProfile();
        const data = response.data;

        setProfile(data);
        setProfileForm({
          username: data.username || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: formatPhoneDisplay(data.phone || ''),
        });
      } catch (err) {
        console.error('Profile load error:', err);
        setProfileError('account.profile.loadError');
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
    loadAuditLogs();
  }, []);

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === 'username') {
      nextValue = String(value || '').replace(/\s+/g, '');
    }
    if (name === 'phone') {
      nextValue = formatPhoneDisplay(value);
    }
    setProfileForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setSavingProfile(true);

    try {
      const payload = {
        username: String(profileForm.username || '').replace(/\s+/g, ''),
        firstName: normalizeHumanNameInput(profileForm.firstName),
        lastName: normalizeHumanNameInput(profileForm.lastName),
        phone: sanitizePhoneNumberInput(profileForm.phone),
      };

      if (!payload.firstName || !payload.lastName) {
        setProfileError('account.profile.validation.nameRequired');
        return;
      }

      if (!payload.username) {
        setProfileError('account.profile.validation.usernameRequired');
        return;
      }

      const response = await authAPI.updateProfile(payload);
      const data = response.data;

      setProfile(data);
      setProfileForm({
        username: data.username || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
      });

      const currentUser = tokenManager.getUser();
      tokenManager.setUser({
        ...(currentUser || {}),
        firstName: data.firstName,
        lastName: data.lastName,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('authChanged'));
      }

      setProfileSuccess('account.profile.saved');
      loadAuditLogs();
    } catch (err) {
      console.error('Profile update error:', err);

      if (err.response?.data?.errors) {
        const message = err.response.data.errors
          .map((e) => e.description)
          .join(' ');
        setProfileError(message);
      } else if (err.response?.data?.message) {
        setProfileError(err.response.data.message);
      } else {
        setProfileError('account.profile.saveError');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('account.password.mismatch');
      return;
    }

    setChangingPassword(true);

    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordSuccess('account.password.success');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      loadAuditLogs();
    } catch (err) {
      console.error('Password change error:', err);

      if (err.response?.data?.errors) {
        const message = err.response.data.errors
          .map((e) => e.description)
          .join(' ');
        setPasswordError(message);
      } else if (err.response?.data?.message) {
        setPasswordError(err.response.data.message);
      } else {
        setPasswordError('account.password.error');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCompanyFormChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === 'postalCode') {
      nextValue = normalizePostalCodeInput(value);
    }
    if (name === 'streetNumber' || name === 'apartmentNumber') {
      nextValue = stripAllWhitespace(value);
    }
    if (name === 'phone') {
      nextValue = formatPhoneDisplay(value);
    }
    setCompanyForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const closeCompanyForm = () => {
    setShowCompanyForm(false);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('openCompanyForm');
        return next;
      },
      { replace: true },
    );
  };

  const handleCompanyFormSubmit = async (e) => {
    e.preventDefault();
    setCompanyFormError('');
    if (
      companyForm.openingHour &&
      companyForm.closingHour &&
      companyForm.closingHour <= companyForm.openingHour
    ) {
      setCompanyFormError('account.company.hoursError');
      return;
    }
    setCompanyFormLoading(true);

    try {
      // Step 1: Create the company in ReservationService
      const createCompanyResponse = await companiesAPI.create({
        ...companyForm,
        phone: sanitizePhoneNumberInput(companyForm.phone),
      });
      const newCompanyId = createCompanyResponse.data.id;

      if (!newCompanyId) {
        throw new Error('account.company.missingId');
      }

      // Step 2: Assign the new company to the user in IdentityService
      await authAPI.assignCompany(newCompanyId);

      closeCompanyForm();
      navigate('/company-panel');
      // The user's state is updated by assignCompany, no need to reload page
    } catch (err) {
      console.error('Create company error:', err);

      if (typeof err?.message === 'string' && err.message.startsWith('account.')) {
        setCompanyFormError(err.message);
        return;
      }

      if (err.response?.status === 403) {
        setCompanyFormError('account.company.emailConfirmRequired');
        return;
      }
      if (err.response?.data?.errors) {
        const message = Object.values(err.response.data.errors).flat().join(' ');
        setCompanyFormError(message);
      } else if (err.response?.data?.message) {
        setCompanyFormError(err.response.data.message);
      } else {
        setCompanyFormError('account.company.createUnexpectedError');
      }
    } finally {
      setCompanyFormLoading(false);
    }
  };

  useEffect(() => {
    const query = companyForm.city?.trim();
    if (!query || query.length < 2) {
      setCitySuggestions([]);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const res = await companiesAPI.getCities(query);
        if (!cancelled) {
          setCitySuggestions(res.data || []);
        }
      } catch (err) {
        console.error('City suggestions load error:', err);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [companyForm.city]);

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        t('account.delete.confirm'),
      )
    ) {
      return;
    }

    setDeleteError('');
    setDeleteLoading(true);

    try {
      await authAPI.deleteAccount();

      try {
        await authAPI.logout();
      } catch (err) {
        console.error('Logout after delete error:', err);
        tokenManager.clearTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('authChanged'));
          window.location.href = '/';
        }
      }
    } catch (err) {
      console.error('Delete account error:', err);
      if (err.response?.data?.errors) {
        const message = err.response.data.errors
          .map((e) => e.description)
          .join(' ');
        setDeleteError(message);
      } else if (err.response?.data?.message) {
        setDeleteError(err.response.data.message);
      } else {
        setDeleteError('account.delete.error');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const currentUser = tokenManager.getUser();
  const hasCompany = currentUser && currentUser.companyId;

  useEffect(() => {
    const shouldOpenCompanyForm = searchParams.get('openCompanyForm') === '1';
    if (!shouldOpenCompanyForm || hasCompany) return;
    if (profileLoading) return;

    if (profile && profile.emailConfirmed === false) {
      setProfileError('account.company.emailConfirmRequired');
      return;
    }

    setShowCompanyForm(true);
  }, [searchParams, hasCompany, profileLoading, profile]);

  const formatAuditDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(locale);
  };

  const formatAuditAction = (log) => {
    if (!log) return '';
    if (log.action === 'Login') return t('account.audit.login');
    if (log.action === 'Update' && log.entityName === 'Password') return t('account.audit.passwordChanged');
    if (log.action === 'Update' && log.entityName === 'ApplicationUser') {
      try {
        const raw = log.changes;
        const changes = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(changes) && changes.length > 0) {
          const allowedFields = new Set([
            'UserName',
            'Username',
            'FirstName',
            'LastName',
            'PhoneNumber',
            'Phone',
            'Email',
          ]);
          const labels = {
            UserName: t('account.audit.field.username'),
            Username: t('account.audit.field.username'),
            FirstName: t('account.audit.field.firstName'),
            LastName: t('account.audit.field.lastName'),
            PhoneNumber: t('account.audit.field.phone'),
            Phone: t('account.audit.field.phone'),
            Email: t('account.audit.field.email'),
          };

          const fields = changes
            .map((c) => c?.Field)
            .filter(Boolean)
            .filter((f) => allowedFields.has(f))
            .map((f) => labels[f] || f);

          const unique = Array.from(new Set(fields));
          if (unique.length === 1) return t('account.audit.profileUpdatedField', { field: unique[0] });
          if (unique.length > 1) return t('account.audit.profileUpdatedFields', { fields: unique.join(', ') });
        }
      } catch {
      }

      return t('account.audit.profileUpdated');
    }
    if (log.action === 'Delete' && log.entityName === 'ApplicationUser') return t('account.audit.accountDeleted');
    return `${log.action || ''}`;
  };

  const isRelevantProfileUpdateLog = (log) => {
    if (!log) return false;
    if (log.action !== 'Update' || log.entityName !== 'ApplicationUser') return false;

    try {
      const raw = log.changes;
      const changes = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!Array.isArray(changes) || changes.length === 0) return true;

      const allowedFields = new Set([
        'UserName',
        'Username',
        'FirstName',
        'LastName',
        'PhoneNumber',
        'Phone',
        'Email',
      ]);

      return changes.some((c) => c?.Field && allowedFields.has(c.Field));
    } catch {
      return true;
    }
  };

  const getCriticalAuditLogs = (items) => {
    const result = [];
    const seenLoginKeys = new Set();

    for (const log of items) {
      if (!log) continue;

      if (log.action === 'Login') {
        const key = `${log.ipAddress || ''}|${log.userAgent || ''}`;
        if (seenLoginKeys.has(key)) continue;
        seenLoginKeys.add(key);
        result.push(log);
        continue;
      }

      if (log.action === 'Update' && log.entityName === 'Password') {
        result.push(log);
        continue;
      }

      if (isRelevantProfileUpdateLog(log)) {
        result.push(log);
        continue;
      }

      if (log.action === 'Delete' && log.entityName === 'ApplicationUser') {
        result.push(log);
        continue;
      }
    }

    return result;
  };

  const criticalAuditLogs = getCriticalAuditLogs(auditLogs);
  const auditPageCount = Math.max(1, Math.ceil(criticalAuditLogs.length / auditPageSize));
  const auditCurrentPage = Math.min(auditPage, auditPageCount);
  const auditStart = (auditCurrentPage - 1) * auditPageSize;
  const visibleAuditLogs = criticalAuditLogs.slice(auditStart, auditStart + auditPageSize);

  const handleAuditPageSizeChange = (e) => {
    setAuditPageSize(Number(e.target.value));
    setAuditPage(1);
  };

  const renderAuditLogs = () => (
    <section className="dashboard-card">
      <div className="admin-section" style={{ gap: '0.75rem' }}>
        <div className="admin-section__header">
          <h2 className="admin-section__title">{t('account.audit.title')}</h2>
          <div className="admin-section__actions">
            <button type="button" className="btn btn-outline" onClick={loadAuditLogs} disabled={auditLoading}>
              {t('common.refresh')}
            </button>
          </div>
        </div>

        {auditError && <div className="admin-alert admin-alert--error">{tx(auditError)}</div>}

        {auditLoading ? (
          <p>{t('common.loading')}</p>
        ) : criticalAuditLogs.length === 0 ? (
          <p>{t('account.audit.empty')}</p>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('account.audit.date')}</th>
                  <th>{t('account.audit.action')}</th>
                  <th>{t('account.audit.ip')}</th>
                  <th>{t('account.audit.browser')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleAuditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatAuditDate(log.createdAt)}</td>
                    <td>{formatAuditAction(log)}</td>
                    <td>{log.ipAddress || '—'}</td>
                    <td style={{ maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.userAgent || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="list-pagination">
              <div className="list-page-size">
                <span>{t('common.perPage')}</span>
                <select value={auditPageSize} onChange={handleAuditPageSizeChange}>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <div className="list-page-controls">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={auditCurrentPage === 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                >
                  {t('common.previous')}
                </button>
                <span>
                  {t('account.audit.pageInfo', { page: auditCurrentPage, count: auditPageCount })}
                </span>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={auditCurrentPage === auditPageCount}
                  onClick={() => setAuditPage((p) => Math.min(auditPageCount, p + 1))}
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );

  const renderCreateCompanyForm = () => (
    <div className="auth-modal-overlay" onClick={closeCompanyForm}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="auth-modal-close" onClick={closeCompanyForm} aria-label={t('common.close')}>
          ×
        </button>
        <div className="auth-modal-body">
          <h2 className="auth-modal-title">{t('account.companyForm.title')}</h2>
          <p className="auth-modal-subtitle">{t('account.companyForm.subtitle')}</p>

          <form onSubmit={handleCompanyFormSubmit} className="admin-form">
            {companyFormError && <div className="admin-alert admin-alert--error">{tx(companyFormError)}</div>}
            <div className="admin-form__grid">
              <div className="admin-form__field admin-form__field--full">
                <label htmlFor="companyName">{t('account.companyForm.companyName')}</label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={companyForm.companyName}
                  onChange={handleCompanyFormChange}
                  required
                  maxLength={100}
                  className="admin-input"
                />
              </div>
            <div className="admin-form__field">
              <label htmlFor="email">{t('account.companyForm.email')}</label>
              <input id="email" name="email" type="email" value={companyForm.email} onChange={handleCompanyFormChange} required className="admin-input" />
            </div>
            <div className="admin-form__field">
              <label htmlFor="phone">{t('account.companyForm.phone')}</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={companyForm.phone}
                onChange={handleCompanyFormChange}
                required
                className="admin-input"
                placeholder={t('account.companyForm.phonePlaceholder')}
              />
            </div>
            <div className="admin-form__field">
              <label htmlFor="city">{t('account.companyForm.city')}</label>
              <input
                id="city"
                name="city"
                type="text"
                value={companyForm.city}
                onChange={handleCompanyFormChange}
                required
                className="admin-input"
                list="account-city-options"
              />
              <datalist id="account-city-options">
                {citySuggestions.map((cityOption) => (
                  <option key={cityOption} value={cityOption} />
                ))}
              </datalist>
            </div>
            <div className="admin-form__field">
              <label htmlFor="streetName">{t('account.companyForm.street')}</label>
              <input
                id="streetName"
                name="streetName"
                type="text"
                value={companyForm.streetName}
                onChange={handleCompanyFormChange}
                required
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label htmlFor="streetNumber">{t('account.companyForm.streetNumber')}</label>
              <input
                id="streetNumber"
                name="streetNumber"
                type="text"
                value={companyForm.streetNumber}
                onChange={handleCompanyFormChange}
                required
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label htmlFor="apartmentNumber">{t('account.companyForm.apartmentNumber')}</label>
              <input
                id="apartmentNumber"
                name="apartmentNumber"
                type="text"
                value={companyForm.apartmentNumber}
                onChange={handleCompanyFormChange}
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label htmlFor="postalCode">{t('account.companyForm.postalCode')}</label>
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                value={companyForm.postalCode}
                onChange={handleCompanyFormChange}
                required
                className="admin-input"
                placeholder="00-000"
                pattern="^[0-9]{2}-[0-9]{3}$"
                maxLength={6}
                title={t('account.companyForm.postalCodeTitle')}
              />
            </div>
            <div className="admin-form__field admin-form__field--full">
              <label htmlFor="description">{t('account.companyForm.description')}</label>
              <textarea
                id="description"
                name="description"
                value={companyForm.description}
                onChange={handleCompanyFormChange}
                rows="4"
                maxLength={1000}
                className="admin-input"
              ></textarea>
            </div>
            <div className="admin-form__field">
              <label htmlFor="openingHour">{t('account.companyForm.openingHour')}</label>
              <input id="openingHour" name="openingHour" type="time" value={companyForm.openingHour} onChange={handleCompanyFormChange} required className="admin-input" />
            </div>
            <div className="admin-form__field">
              <label htmlFor="closingHour">{t('account.companyForm.closingHour')}</label>
              <input id="closingHour" name="closingHour" type="time" value={companyForm.closingHour} onChange={handleCompanyFormChange} required className="admin-input" />
            </div>
            </div>
            <div className="admin-form__actions">
              <button type="button" className="btn btn-outline" onClick={closeCompanyForm}>{t('account.companyForm.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={companyFormLoading}>
                {companyFormLoading ? t('account.companyForm.creating') : t('account.companyForm.create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      {showCompanyForm && renderCreateCompanyForm()}
      <header className="dashboard-header">
        <div>
          <h1>{t('account.title')}</h1>
          <p className="dashboard-greeting">
            {t('account.subtitle')}
          </p>
        </div>
      </header>

      <section className="dashboard-card">
        <h2>{t('account.profile.title')}</h2>

        {profileLoading && <p>{t('account.profile.loading')}</p>}

        {!profileLoading && (
          <>
            {profileError && (
              <div className="form-message form-message-error">
                {tx(profileError)}
              </div>
            )}
            {profileSuccess && (
              <div className="form-message form-message-success">
                {tx(profileSuccess)}
              </div>
            )}

            {profile && (
              <>
                <p>
                  <strong>{t('account.profile.summary.username')}</strong> {profile.username}
                </p>
                <p>
                  <strong>{t('account.profile.summary.email')}</strong> {profile.email}
                </p>
                <p>
                  <strong>{t('account.profile.summary.firstName')}</strong> {profile.firstName}
                </p>

                <form onSubmit={handleProfileSubmit} className="form">
                  <div className="form-field">
                    <label className="form-label" htmlFor="username">
                      {t('account.profile.form.username')}
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      className="form-input"
                      value={profileForm.username}
                      onChange={handleProfileInputChange}
                      placeholder={t('account.profile.form.usernamePlaceholder')}
                      minLength="3"
                      maxLength="50"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="firstName">
                      {t('account.profile.form.firstName')}
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      className="form-input"
                      value={profileForm.firstName}
                      onChange={handleProfileInputChange}
                      placeholder={t('account.profile.form.firstNamePlaceholder')}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="lastName">
                      {t('account.profile.form.lastName')}
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      className="form-input"
                      value={profileForm.lastName}
                      onChange={handleProfileInputChange}
                      placeholder={t('account.profile.form.lastNamePlaceholder')}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="phone">
                      {t('account.profile.form.phone')}
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="form-input"
                      value={profileForm.phone}
                      onChange={handleProfileInputChange}
                      placeholder={t('account.profile.form.phonePlaceholder')}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary form-button"
                    disabled={savingProfile}
                  >
                    {savingProfile ? t('account.profile.form.saving') : t('account.profile.form.save')}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </section>

      {renderAuditLogs()}

      <section className="dashboard-card">
        <h2>{t('account.password.title')}</h2>

        {passwordError && (
          <div className="form-message form-message-error">
            {tx(passwordError)}
          </div>
        )}
        {passwordSuccess && (
          <div className="form-message form-message-success">
            {tx(passwordSuccess)}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="form">
          <div className="form-field">
            <label className="form-label" htmlFor="currentPassword">
              {t('account.password.current')}
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              className="form-input"
              value={passwordForm.currentPassword}
              onChange={handlePasswordInputChange}
              placeholder="••••••••"
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="newPassword">
              {t('account.password.new')}
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              className="form-input"
              value={passwordForm.newPassword}
              onChange={handlePasswordInputChange}
              placeholder="••••••••"
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="confirmPassword">
              {t('account.password.confirm')}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="form-input"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordInputChange}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary form-button"
            disabled={changingPassword}
          >
            {changingPassword ? t('account.password.changing') : t('account.password.change')}
          </button>
        </form>
      </section>

      <section className="dashboard-card">
        <h2>{t('account.delete.title')}</h2>
        <p>
          {t('account.delete.description')}
        </p>

        {deleteError && (
          <div className="form-message form-message-error">{tx(deleteError)}</div>
        )}

        <button
          type="button"
          className="btn btn-outline form-button"
          style={{ borderColor: '#ef4444', color: '#fecaca' }}
          onClick={handleDeleteAccount}
          disabled={deleteLoading}
        >
          {deleteLoading ? t('account.delete.deleting') : t('account.delete.action')}
        </button>
      </section>
    </div>
  );
}

export default AccountPage;
