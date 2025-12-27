import React, { useEffect, useState } from 'react';
import '../admin.css';
import { adminAPI, companiesAPI, tokenManager } from '../services/api';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('users');
  const currentUser = tokenManager.getUser();

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalCount, setUsersTotalCount] = useState(0);
  const usersPageSize = 20;

  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState('');
  const [companyQuery, setCompanyQuery] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companiesTotalCount, setCompaniesTotalCount] = useState(0);
  const companiesPageSize = 10;

  const [companyFormVisible, setCompanyFormVisible] = useState(false);
  const [companyFormSubmitting, setCompanyFormSubmitting] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  const resetCompanyForm = () => {
    setEditingCompany({
      id: null,
      companyName: '',
      email: '',
      phone: '',
      street: '',
      city: '',
      postalCode: '',
      country: 'Polska',
      description: '',
      website: '',
    });
  };

  useEffect(() => {
    loadUsers(1);
  }, []);

  useEffect(() => {
    if (activeTab === 'companies') {
      loadCompanies(companiesPage);
    }
  }, [activeTab, companiesPage, companyQuery, companyCity]);

  const loadUsers = async (page) => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const response = await adminAPI.getUsers({
        page,
        pageSize: usersPageSize,
        query: userQuery || undefined,
      });
      const data = response.data;
      setUsers(data.items || []);
      setUsersTotalCount(data.totalCount || 0);
      setUsersPage(data.page || page);
    } catch (error) {
      console.error('Error loading users', error);
      setUsersError('Nie udało się pobrać listy użytkowników.');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadCompanies = async (page) => {
    setCompaniesLoading(true);
    setCompaniesError('');
    try {
      const response = await companiesAPI.getAll({
        page,
        pageSize: companiesPageSize,
        query: companyQuery || undefined,
        city: companyCity || undefined,
        sort: 'name_asc',
      });
      const data = response.data;
      setCompanies(data.items || data.Items || []);
      setCompaniesTotalCount(data.totalCount || data.TotalCount || 0);
      setCompaniesPage(data.page || data.Page || page);
    } catch (error) {
      console.error('Error loading companies', error);
      setCompaniesError('Nie udało się pobrać listy firm.');
    } finally {
      setCompaniesLoading(false);
    }
  };

  const handleUserSearchSubmit = (event) => {
    event.preventDefault();
    loadUsers(1);
  };

  const handleUsersPageChange = (newPage) => {
    if (newPage < 1) return;
    const maxPage = Math.max(1, Math.ceil(usersTotalCount / usersPageSize));
    if (newPage > maxPage) return;
    loadUsers(newPage);
  };

  const handleGrantAdmin = async (userId) => {
    try {
      await adminAPI.grantAdmin(userId);
      await loadUsers(usersPage);
    } catch (error) {
      console.error('Grant admin error', error);
      window.alert('Nie udało się nadać roli administratora.');
    }
  };

  const handleRevokeAdmin = async (userId) => {
    if (!window.confirm('Na pewno chcesz odebrać rolę administratora temu użytkownikowi?')) {
      return;
    }
    try {
      await adminAPI.revokeAdmin(userId);
      await loadUsers(usersPage);
    } catch (error) {
      console.error('Revoke admin error', error);
      window.alert('Nie udało się odebrać roli administratora.');
    }
  };

  const handleDeleteUser = async (user) => {
    if (
      !window.confirm(
        `Na pewno chcesz usunąć konto użytkownika "${user.email}"? Ta operacja jest nieodwracalna.`,
      )
    ) {
      return;
    }

    try {
      await adminAPI.deleteUser(user.id);
      await loadUsers(usersPage);
    } catch (error) {
      console.error('Delete user error', error);
      window.alert('Nie udało się usunąć użytkownika.');
    }
  };

  const handleOpenCreateCompany = () => {
    resetCompanyForm();
    setCompanyFormVisible(true);
  };

  const handleOpenEditCompany = (company) => {
    setEditingCompany({
      id: company.id,
      companyName: company.companyName,
      email: company.email || '',
      phone: company.phone || '',
      street: company.street || '',
      city: company.city || '',
      postalCode: company.postalCode || '',
      country: company.country || 'Polska',
      description: company.description || '',
      website: company.website || '',
    });
    setCompanyFormVisible(true);
  };

  const handleCloseCompanyForm = () => {
    setCompanyFormVisible(false);
  };

  const handleCompanyFormChange = (field, value) => {
    setEditingCompany((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCompanyFormSubmit = async (event) => {
    event.preventDefault();
    if (!editingCompany) return;
    setCompanyFormSubmitting(true);
    try {
      const payload = {
        companyName: editingCompany.companyName,
        email: editingCompany.email,
        phone: editingCompany.phone,
        street: editingCompany.street,
        city: editingCompany.city,
        postalCode: editingCompany.postalCode,
        country: editingCompany.country,
        description: editingCompany.description,
        website: editingCompany.website,
      };

      if (editingCompany.id == null) {
        await companiesAPI.create(payload);
      } else {
        await companiesAPI.update(editingCompany.id, { id: editingCompany.id, ...payload });
      }

      setCompanyFormVisible(false);
      await loadCompanies(companiesPage);
    } catch (error) {
      console.error('Save company error', error);
      window.alert('Nie udało się zapisać danych firmy.');
    } finally {
      setCompanyFormSubmitting(false);
    }
  };

  const handleDeleteCompany = async (company) => {
    if (
      !window.confirm(
        `Na pewno chcesz usunąć firmę "${company.companyName}"? Operacja może usunąć także powiązane dane.`,
      )
    ) {
      return;
    }

    try {
      await companiesAPI.delete(company.id);
      await loadCompanies(companiesPage);
    } catch (error) {
      console.error('Delete company error', error);
      window.alert('Nie udało się usunąć firmy.');
    }
  };

  const renderUsersTab = () => (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">Użytkownicy</h2>
        <form className="admin-section__filters" onSubmit={handleUserSearchSubmit}>
          <input
            type="text"
            className="admin-input"
            placeholder="Szukaj po emailu lub nazwisku..."
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Szukaj
          </button>
        </form>
      </div>

      {usersError && <div className="admin-alert admin-alert--error">{usersError}</div>}

      <div className="admin-card">
        {usersLoading ? (
          <p>Ładowanie użytkowników...</p>
        ) : users.length === 0 ? (
          <p>Brak użytkowników do wyświetlenia.</p>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Imię i nazwisko</th>
                  <th>Firma (CompanyId)</th>
                  <th>Typ konta</th>
                  <th>Uprawnienia administratora</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roles = user.roles || [];
                  const isAdmin = roles.includes('Admin');
                  const isCurrentUser =
                    currentUser && currentUser.userId === user.id;

                  let accountType;
                  if (isAdmin) {
                    accountType = 'Administrator';
                  } else if (
                    roles.includes('Company') ||
                    roles.includes('CompanyOwner')
                  ) {
                    accountType = 'Firma';
                  } else {
                    accountType = 'Użytkownik';
                  }
                  return (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>
                        {user.firstName} {user.lastName}
                      </td>
                      <td>{user.companyId ?? '-'}</td>
                      <td>{accountType}</td>
                      <td>
                        {isAdmin ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => handleRevokeAdmin(user.id)}
                            disabled={isCurrentUser}
                            title={
                              isCurrentUser
                                ? 'Nie możesz odebrać sobie uprawnień administratora'
                                : undefined
                            }
                          >
                            Odbierz
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => handleGrantAdmin(user.id)}
                          >
                            Nadaj
                          </button>
                        )}
                      </td>
                      <td>
                        <div className="admin-user-actions">
                          <button
                            type="button"
                            className="btn btn-outline btn-xs admin-table__delete-btn"
                            onClick={() => handleDeleteUser(user)}
                            disabled={isCurrentUser}
                            title={
                              isCurrentUser
                                ? 'Nie możesz usunąć własnego konta z poziomu panelu administratora'
                                : 'Usuń użytkownika'
                            }
                          >
                            Usuń
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="admin-pagination">
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => handleUsersPageChange(usersPage - 1)}
                disabled={usersPage <= 1}
              >
                Poprzednia
              </button>
              <span>
                Strona {usersPage} z {Math.max(1, Math.ceil(usersTotalCount / usersPageSize))}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => handleUsersPageChange(usersPage + 1)}
                disabled={usersPage * usersPageSize >= usersTotalCount}
              >
                Następna
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );

  const renderCompaniesTab = () => (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">Firmy</h2>
        <div className="admin-section__actions">
          <form
            className="admin-section__filters"
            onSubmit={(e) => {
              e.preventDefault();
              loadCompanies(1);
            }}
          >
            <input
              type="text"
              className="admin-input"
              placeholder="Szukaj po nazwie lub opisie..."
              value={companyQuery}
              onChange={(e) => setCompanyQuery(e.target.value)}
            />
            <input
              type="text"
              className="admin-input"
              placeholder="Miasto"
              value={companyCity}
              onChange={(e) => setCompanyCity(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Filtruj
            </button>
          </form>
          <button type="button" className="btn btn-primary" onClick={handleOpenCreateCompany}>
            Dodaj firmę
          </button>
        </div>
      </div>

      {companiesError && <div className="admin-alert admin-alert--error">{companiesError}</div>}

      <div className="admin-card">
        {companiesLoading ? (
          <p>Ładowanie firm...</p>
        ) : companies.length === 0 ? (
          <p>Brak firm do wyświetlenia.</p>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Miasto</th>
                  <th>Opis</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.companyName}</td>
                    <td>{company.city || '-'}</td>
                    <td>{company.description || '-'}</td>
                    <td>
                      <div className="admin-user-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => handleOpenEditCompany(company)}
                        >
                          Edytuj
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs admin-table__delete-btn"
                          onClick={() => handleDeleteCompany(company)}
                        >
                          Usuń
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="admin-pagination">
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => loadCompanies(Math.max(1, companiesPage - 1))}
                disabled={companiesPage <= 1}
              >
                Poprzednia
              </button>
              <span>
                Strona {companiesPage} z{' '}
                {Math.max(1, Math.ceil(companiesTotalCount / companiesPageSize))}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => loadCompanies(companiesPage + 1)}
                disabled={companiesPage * companiesPageSize >= companiesTotalCount}
              >
                Następna
              </button>
            </div>
          </>
        )}
      </div>

      {companyFormVisible && editingCompany && (
        <div className="admin-card admin-card--form">
          <h3 className="admin-card__title">
            {editingCompany.id == null ? 'Dodaj firmę' : 'Edytuj firmę'}
          </h3>
          <form className="admin-form" onSubmit={handleCompanyFormSubmit}>
            <div className="admin-form__grid">
              <label className="admin-form__field">
                <span>Nazwa firmy</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.companyName}
                  onChange={(e) => handleCompanyFormChange('companyName', e.target.value)}
                  required
                />
              </label>
              <label className="admin-form__field">
                <span>Email</span>
                <input
                  type="email"
                  className="admin-input"
                  value={editingCompany.email}
                  onChange={(e) => handleCompanyFormChange('email', e.target.value)}
                />
              </label>
              <label className="admin-form__field">
                <span>Telefon</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.phone}
                  onChange={(e) => handleCompanyFormChange('phone', e.target.value)}
                />
              </label>
              <label className="admin-form__field">
                <span>Ulica</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.street}
                  onChange={(e) => handleCompanyFormChange('street', e.target.value)}
                />
              </label>
              <label className="admin-form__field">
                <span>Miasto</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.city}
                  onChange={(e) => handleCompanyFormChange('city', e.target.value)}
                />
              </label>
              <label className="admin-form__field">
                <span>Kod pocztowy</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.postalCode}
                  onChange={(e) => handleCompanyFormChange('postalCode', e.target.value)}
                />
              </label>
              <label className="admin-form__field">
                <span>Kraj</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.country}
                  onChange={(e) => handleCompanyFormChange('country', e.target.value)}
                />
              </label>
              <label className="admin-form__field admin-form__field--full">
                <span>Strona WWW</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.website}
                  onChange={(e) => handleCompanyFormChange('website', e.target.value)}
                />
              </label>
              <label className="admin-form__field admin-form__field--full">
                <span>Opis</span>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={editingCompany.description}
                  onChange={(e) => handleCompanyFormChange('description', e.target.value)}
                />
              </label>
            </div>
            <div className="admin-form__actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleCloseCompanyForm}
                disabled={companyFormSubmitting}
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={companyFormSubmitting}
              >
                {companyFormSubmitting ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1 className="admin-page__title">Panel administratora</h1>
        <p className="admin-page__subtitle">
          Zarządzaj użytkownikami i firmami w systemie rezerwacji.
        </p>
      </header>

      <div className="admin-page__tabs">
        <button
          type="button"
          className={
            activeTab === 'users'
              ? 'admin-tab admin-tab--active'
              : 'admin-tab'
          }
          onClick={() => setActiveTab('users')}
        >
          Użytkownicy
        </button>
        <button
          type="button"
          className={
            activeTab === 'companies'
              ? 'admin-tab admin-tab--active'
              : 'admin-tab'
          }
          onClick={() => setActiveTab('companies')}
        >
          Firmy
        </button>
      </div>

      <section className="admin-page__content">
        {activeTab === 'users' ? renderUsersTab() : renderCompaniesTab()}
      </section>
    </div>
  );
};

export default AdminPanel;
