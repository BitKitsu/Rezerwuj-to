import React, { useState, useEffect } from 'react';
import { authAPI, companiesAPI, tokenManager } from '../services/api';
import '../admin.css'; // Reuse some admin styles for the form

function AccountPage() {
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
          phone: data.phone || '',
        });
      } catch (err) {
        console.error('Profile load error:', err);
        setProfileError('Nie udało się załadować danych profilu.');
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setSavingProfile(true);

    try {
      const response = await authAPI.updateProfile(profileForm);
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

      setProfileSuccess('Zapisano zmiany profilu.');
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
        setProfileError('Nie udało się zapisać zmian profilu.');
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
      setPasswordError('Nowe hasło i potwierdzenie muszą być takie same.');
      return;
    }

    setChangingPassword(true);

    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordSuccess('Hasło zostało pomyślnie zmienione.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      console.error('Change password error:', err);

      if (err.response?.data?.errors) {
        const message = err.response.data.errors
          .map((e) => e.description)
          .join(' ');
        setPasswordError(message);
      } else if (err.response?.data?.message) {
        setPasswordError(err.response.data.message);
      } else {
        setPasswordError('Nie udało się zmienić hasła.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCompanyFormChange = (e) => {
    const { name, value } = e.target;
    setCompanyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompanyFormSubmit = async (e) => {
    e.preventDefault();
    setCompanyFormError('');
    if (
      companyForm.openingHour &&
      companyForm.closingHour &&
      companyForm.closingHour <= companyForm.openingHour
    ) {
      setCompanyFormError('Godzina zamknięcia musi być późniejsza niż godzina otwarcia.');
      return;
    }
    setCompanyFormLoading(true);

    try {
      // Step 1: Create the company in ReservationService
      const createCompanyResponse = await companiesAPI.create(companyForm);
      const newCompanyId = createCompanyResponse.data.id;

      if (!newCompanyId) {
        throw new Error('Nie udało się uzyskać ID nowej firmy.');
      }

      // Step 2: Assign the new company to the user in IdentityService
      await authAPI.assignCompany(newCompanyId);

      setShowCompanyForm(false);
      // The user's state is updated by assignCompany, no need to reload page
    } catch (err) {
      console.error('Create company error:', err);
      if (err.response?.data?.errors) {
        const message = Object.values(err.response.data.errors).flat().join(' ');
        setCompanyFormError(message);
      } else if (err.response?.data?.message) {
        setCompanyFormError(err.response.data.message);
      } else {
        setCompanyFormError('Wystąpił nieoczekiwany błąd podczas tworzenia firmy.');
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
        'Na pewno chcesz trwale usunąć swoje konto? Ta operacja jest nieodwracalna.',
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
        setDeleteError('Nie udało się usunąć konta.');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const currentUser = tokenManager.getUser();
  const hasCompany = currentUser && currentUser.companyId;

  const renderCreateCompanyForm = () => (
    <div className="admin-card--form-container">
      <div className="admin-card admin-card--form">
        <div className="admin-form__header">
          <h2>Zarejestruj swoją firmę</h2>
          <button type="button" className="btn-close" onClick={() => setShowCompanyForm(false)} aria-label="Close"></button>
        </div>
        <form onSubmit={handleCompanyFormSubmit} className="admin-form">
          {companyFormError && <div className="admin-alert admin-alert--error">{companyFormError}</div>}
          <div className="admin-form__grid">
            <div className="admin-form__field admin-form__field--full">
              <label htmlFor="companyName">Nazwa firmy</label>
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
              <label htmlFor="email">Email kontaktowy</label>
              <input id="email" name="email" type="email" value={companyForm.email} onChange={handleCompanyFormChange} required className="admin-input" />
            </div>
            <div className="admin-form__field">
              <label htmlFor="phone">Telefon kontaktowy</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={companyForm.phone}
                onChange={handleCompanyFormChange}
                required
                className="admin-input"
                placeholder="+48 111 222 333"
              />
            </div>
            <div className="admin-form__field">
              <label htmlFor="city">Miasto</label>
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
              <label htmlFor="streetName">Ulica</label>
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
              <label htmlFor="streetNumber">Numer budynku</label>
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
              <label htmlFor="apartmentNumber">Nr lokalu (opcjonalnie)</label>
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
              <label htmlFor="postalCode">Kod pocztowy</label>
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
                title="Kod pocztowy w formacie 00-000"
              />
            </div>
            <div className="admin-form__field admin-form__field--full">
              <label htmlFor="description">Opis firmy (max. 1000 znaków)</label>
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
              <label htmlFor="openingHour">Godzina otwarcia</label>
              <input id="openingHour" name="openingHour" type="time" value={companyForm.openingHour} onChange={handleCompanyFormChange} required className="admin-input" />
            </div>
            <div className="admin-form__field">
              <label htmlFor="closingHour">Godzina zamknięcia</label>
              <input id="closingHour" name="closingHour" type="time" value={companyForm.closingHour} onChange={handleCompanyFormChange} required className="admin-input" />
            </div>
          </div>
          <div className="admin-form__actions">
            <button type="button" className="btn btn-outline" onClick={() => setShowCompanyForm(false)}>Anuluj</button>
            <button type="submit" className="btn btn-primary" disabled={companyFormLoading}>
              {companyFormLoading ? 'Tworzenie firmy...' : 'Utwórz firmę'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      {showCompanyForm && renderCreateCompanyForm()}
      <header className="dashboard-header">
        <div>
          <h1>Ustawienia konta</h1>
          <p className="dashboard-greeting">
            Zarządzaj podstawowymi informacjami o swoim koncie REZERWUJ.TO
          </p>
        </div>
      </header>

      {!hasCompany && (
        <section className="dashboard-card">
          <h2>Zostań partnerem REZERWUJ.TO</h2>
          <p>
            Chcesz dotrzeć do nowych klientów i usprawnić zarządzanie rezerwacjami w swojej firmie? Zarejestruj swój biznes na naszej platformie.
          </p>
          <button
            type="button"
            className="btn btn-primary form-button"
            onClick={() => setShowCompanyForm(true)}
          >
            Dodaj swoją firmę
          </button>
        </section>
      )}

      <section className="dashboard-card">
        <h2>Dane profilu</h2>

        {profileLoading && <p>Ładowanie danych profilu...</p>}

        {!profileLoading && (
          <>
            {profileError && (
              <div className="form-message form-message-error">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="form-message form-message-success">
                {profileSuccess}
              </div>
            )}

            {profile && (
              <>
                <p>
                  <strong>Nazwa użytkownika:</strong> {profile.username}
                </p>
                <p>
                  <strong>Email:</strong> {profile.email}
                </p>
                <p>
                  <strong>Imię:</strong> {profile.firstName}
                </p>

                <form onSubmit={handleProfileSubmit} className="form">
                  <div className="form-field">
                    <label className="form-label" htmlFor="username">
                      Nazwa użytkownika
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      className="form-input"
                      value={profileForm.username}
                      onChange={handleProfileInputChange}
                      placeholder="Twoja nazwa użytkownika"
                      minLength="3"
                      maxLength="50"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="firstName">
                      Imię
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      className="form-input"
                      value={profileForm.firstName}
                      onChange={handleProfileInputChange}
                      placeholder="Twoje imię"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="lastName">
                      Nazwisko
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      className="form-input"
                      value={profileForm.lastName}
                      onChange={handleProfileInputChange}
                      placeholder="Twoje nazwisko"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="phone">
                      Telefon
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="form-input"
                      value={profileForm.phone}
                      onChange={handleProfileInputChange}
                      placeholder="+48 123 456 789"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary form-button"
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Zapisywanie...' : 'Zapisz zmiany'}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </section>

      <section className="dashboard-card">
        <h2>Zmiana hasła</h2>

        {passwordError && (
          <div className="form-message form-message-error">
            {passwordError}
          </div>
        )}
        {passwordSuccess && (
          <div className="form-message form-message-success">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="form">
          <div className="form-field">
            <label className="form-label" htmlFor="currentPassword">
              Obecne hasło
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
              Nowe hasło
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
              Powtórz nowe hasło
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
            {changingPassword ? 'Zmiana hasła...' : 'Zmień hasło'}
          </button>
        </form>
      </section>

      <section className="dashboard-card">
        <h2>Usunięcie konta</h2>
        <p>
          Usunięcie konta spowoduje trwałe skasowanie Twoich danych logowania i dostępu do
          historii rezerwacji. Tej operacji nie można cofnąć.
        </p>

        {deleteError && (
          <div className="form-message form-message-error">{deleteError}</div>
        )}

        <button
          type="button"
          className="btn btn-outline form-button"
          style={{ borderColor: '#ef4444', color: '#fecaca' }}
          onClick={handleDeleteAccount}
          disabled={deleteLoading}
        >
          {deleteLoading ? 'Usuwanie konta...' : 'Usuń konto'}
        </button>
      </section>
    </div>
  );
}

export default AccountPage;
