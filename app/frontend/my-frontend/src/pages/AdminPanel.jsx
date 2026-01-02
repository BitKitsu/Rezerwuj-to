import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import "../admin.css";
import { adminAPI, companiesAPI, tokenManager } from "../services/api";

const normalizePostalCodeInput = (value) => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 5);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
};

const stripAllWhitespace = (value) => {
  return String(value || "").replace(/\s+/g, "");
};

const AdminPanel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => tabFromUrl || "users");
  const currentUser = tokenManager.getUser();

  const setTab = useCallback(
    (tab) => {
      setActiveTab(tab);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", tab);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const allowedTabs = ["users", "companies"];
    if (!allowedTabs.includes(activeTab)) {
      setTab("users");
    }
  }, [activeTab, setTab]);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalCount, setUsersTotalCount] = useState(0);
  const usersPageSize = 20;

  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState("");
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companiesTotalCount, setCompaniesTotalCount] = useState(0);
  const companiesPageSize = 10;

  const [companyFormVisible, setCompanyFormVisible] = useState(false);
  const [companyFormSubmitting, setCompanyFormSubmitting] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [companyFilterCitySuggestions, setCompanyFilterCitySuggestions] =
    useState([]);
  const [companyFormCitySuggestions, setCompanyFormCitySuggestions] = useState(
    [],
  );

  const resetCompanyForm = () => {
    setEditingCompany({
      id: null,
      companyName: "",
      email: "",
      phone: "",
      streetName: "",
      streetNumber: "",
      apartmentNumber: "",
      city: "",
      postalCode: "",
      country: "Polska",
      description: "",
      website: "",
    });
  };

  useEffect(() => {
    loadUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only trigger if we're on the companies tab
    if (activeTab !== "companies") return;

    const debounceTimer = setTimeout(() => {
      loadCompanies(companiesPage);
    }, 300);
    return () => clearTimeout(debounceTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyQuery, companyCity, activeTab, companiesPage]);

  useEffect(() => {
    const q = companyCity.trim();
    if (!q || q.length < 2) {
      setCompanyFilterCitySuggestions([]);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const res = await companiesAPI.getCities(q);
        if (!cancelled) {
          setCompanyFilterCitySuggestions(res.data || []);
        }
      } catch (error) {
        console.error("City suggestions load error (admin filter):", error);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [companyCity]);

  const loadUsers = async (page) => {
    setUsersLoading(true);
    setUsersError("");
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
      console.error("Error loading users", error);
      setUsersError("Nie udało się pobrać listy użytkowników.");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadCompanies = async (page) => {
    setCompaniesLoading(true);
    setCompaniesError("");
    try {
      const response = await companiesAPI.getAll({
        page,
        pageSize: companiesPageSize,
        query: companyQuery || undefined,
        city: companyCity || undefined,
        sort: "name_asc",
      });
      const data = response.data;
      setCompanies(data.items || data.Items || []);
      setCompaniesTotalCount(data.totalCount || data.TotalCount || 0);
      setCompaniesPage(data.page || data.Page || page);
    } catch (error) {
      console.error("Error loading companies", error);
      setCompaniesError("Nie udało się pobrać listy firm.");
    } finally {
      setCompaniesLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadUsers(1);
    }, 300);
    return () => clearTimeout(debounceTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery]);

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
      console.error("Grant admin error", error);
      window.alert("Nie udało się nadać roli administratora.");
    }
  };

  const handleRevokeAdmin = async (userId) => {
    if (
      !window.confirm(
        "Na pewno chcesz odebrać rolę administratora temu użytkownikowi?",
      )
    ) {
      return;
    }
    try {
      await adminAPI.revokeAdmin(userId);
      await loadUsers(usersPage);
    } catch (error) {
      console.error("Revoke admin error", error);
      window.alert("Nie udało się odebrać roli administratora.");
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
      console.error("Delete user error", error);
      window.alert("Nie udało się usunąć użytkownika.");
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
      email: company.email || "",
      phone: company.phone || "",
      streetName: company.streetName || "",
      streetNumber: company.streetNumber || "",
      apartmentNumber: company.apartmentNumber || "",
      city: company.city || "",
      postalCode: company.postalCode || "",
      country: company.country || "Polska",
      description: company.description || "",
      website: company.website || "",
    });
    setCompanyFormVisible(true);
  };

  const handleCloseCompanyForm = () => {
    setCompanyFormVisible(false);
  };

  const handleCompanyFormChange = (field, value) => {
    let nextValue = value;
    if (field === "postalCode") {
      nextValue = normalizePostalCodeInput(value);
    }
    if (field === "streetNumber" || field === "apartmentNumber") {
      nextValue = stripAllWhitespace(value);
    }
    setEditingCompany((prev) => ({
      ...prev,
      [field]: nextValue,
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
        streetName: editingCompany.streetName,
        streetNumber: editingCompany.streetNumber,
        apartmentNumber: editingCompany.apartmentNumber,
        city: editingCompany.city,
        postalCode: editingCompany.postalCode,
        country: editingCompany.country,
        description: editingCompany.description,
        website: editingCompany.website,
      };

      if (editingCompany.id == null) {
        await companiesAPI.create(payload);
      } else {
        await companiesAPI.update(editingCompany.id, {
          id: editingCompany.id,
          ...payload,
        });
      }

      setCompanyFormVisible(false);
      await loadCompanies(companiesPage);
    } catch (error) {
      console.error("Save company error", error);
      window.alert("Nie udało się zapisać danych firmy.");
    } finally {
      setCompanyFormSubmitting(false);
    }
  };

  useEffect(() => {
    if (!editingCompany || !editingCompany.city) {
      setCompanyFormCitySuggestions([]);
      return;
    }
    const q = editingCompany.city.trim();
    if (!q || q.length < 2) {
      setCompanyFormCitySuggestions([]);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const res = await companiesAPI.getCities(q);
        if (!cancelled) {
          setCompanyFormCitySuggestions(res.data || []);
        }
      } catch (error) {
        console.error("City suggestions load error (admin form):", error);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCompany?.city]);

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
      console.error("Delete company error", error);
      window.alert("Nie udało się usunąć firmy.");
    }
  };

  const renderUsersTab = () => (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">Użytkownicy</h2>
        <input
          type="text"
          className="admin-input"
          placeholder="Szukaj po emailu lub nazwisku..."
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
        />
      </div>

      {usersError && (
        <div className="admin-alert admin-alert--error">{usersError}</div>
      )}

      <div className="admin-card">
        {usersLoading && users.length === 0 ? (
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
                  const isAdmin = roles.includes("Admin");
                  const isCurrentUser =
                    currentUser && currentUser.userId === user.id;

                  let accountType;
                  if (isAdmin) {
                    accountType = "Administrator";
                  } else if (
                    roles.includes("Company") ||
                    roles.includes("CompanyOwner")
                  ) {
                    accountType = "Firma";
                  } else {
                    accountType = "Użytkownik";
                  }
                  return (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>
                        {user.firstName} {user.lastName}
                      </td>
                      <td>{user.companyId ?? "-"}</td>
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
                                ? "Nie możesz odebrać sobie uprawnień administratora"
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
                                ? "Nie możesz usunąć własnego konta z poziomu panelu administratora"
                                : "Usuń użytkownika"
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
                Strona {usersPage} z{" "}
                {Math.max(1, Math.ceil(usersTotalCount / usersPageSize))}
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
          <div className="admin-section__filters">
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
              list="admin-companies-filter-city-options"
            />
            <datalist id="admin-companies-filter-city-options">
              {companyFilterCitySuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateCompany}
          >
            Dodaj firmę
          </button>
        </div>
      </div>

      {companiesError && (
        <div className="admin-alert admin-alert--error">{companiesError}</div>
      )}

      <div className="admin-card">
        {companiesLoading && companies.length === 0 ? (
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
                    <td>{company.city || "-"}</td>
                    <td>{company.description || "-"}</td>
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
                Strona {companiesPage} z{" "}
                {Math.max(
                  1,
                  Math.ceil(companiesTotalCount / companiesPageSize),
                )}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => loadCompanies(companiesPage + 1)}
                disabled={
                  companiesPage * companiesPageSize >= companiesTotalCount
                }
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
            {editingCompany.id == null ? "Dodaj firmę" : "Edytuj firmę"}
          </h3>
          <form className="admin-form" onSubmit={handleCompanyFormSubmit}>
            <div className="admin-form__grid">
              <label className="admin-form__field">
                <span>Nazwa firmy</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.companyName}
                  onChange={(e) =>
                    handleCompanyFormChange("companyName", e.target.value)
                  }
                  required
                  maxLength={100}
                />
              </label>
              <label className="admin-form__field">
                <span>Email</span>
                <input
                  type="email"
                  className="admin-input"
                  value={editingCompany.email}
                  onChange={(e) =>
                    handleCompanyFormChange("email", e.target.value)
                  }
                />
              </label>
              <label className="admin-form__field">
                <span>Telefon</span>
                <input
                  type="tel"
                  className="admin-input"
                  value={editingCompany.phone}
                  onChange={(e) =>
                    handleCompanyFormChange("phone", e.target.value)
                  }
                  placeholder="+48 111 222 333"
                />
              </label>
              <label className="admin-form__field">
                <span>Ulica</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.streetName || ""}
                  onChange={(e) =>
                    handleCompanyFormChange("streetName", e.target.value)
                  }
                  required
                />
              </label>
              <label className="admin-form__field">
                <span>Numer budynku</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.streetNumber || ""}
                  onChange={(e) =>
                    handleCompanyFormChange("streetNumber", e.target.value)
                  }
                  required
                />
              </label>
              <label className="admin-form__field">
                <span>Nr lokalu (opcjonalnie)</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.apartmentNumber || ""}
                  onChange={(e) =>
                    handleCompanyFormChange("apartmentNumber", e.target.value)
                  }
                />
              </label>
              <label className="admin-form__field">
                <span>Miasto</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.city}
                  onChange={(e) =>
                    handleCompanyFormChange("city", e.target.value)
                  }
                  list="admin-company-form-city-options"
                />
                <datalist id="admin-company-form-city-options">
                  {companyFormCitySuggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="admin-form__field">
                <span>Kod pocztowy</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.postalCode}
                  onChange={(e) =>
                    handleCompanyFormChange("postalCode", e.target.value)
                  }
                  placeholder="00-000"
                  pattern="^[0-9]{2}-[0-9]{3}$"
                  maxLength={6}
                  title="Kod pocztowy w formacie 00-000"
                />
              </label>
              <label className="admin-form__field">
                <span>Kraj</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.country}
                  onChange={(e) =>
                    handleCompanyFormChange("country", e.target.value)
                  }
                />
              </label>
              <label className="admin-form__field admin-form__field--full">
                <span>Strona WWW</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingCompany.website}
                  onChange={(e) =>
                    handleCompanyFormChange("website", e.target.value)
                  }
                />
              </label>
              <label className="admin-form__field admin-form__field--full">
                <span>Opis (max. 1000 znaków)</span>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={editingCompany.description}
                  onChange={(e) =>
                    handleCompanyFormChange("description", e.target.value)
                  }
                  maxLength={1000}
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
                {companyFormSubmitting ? "Zapisywanie..." : "Zapisz"}
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
            activeTab === "users" ? "admin-tab admin-tab--active" : "admin-tab"
          }
          onClick={() => setTab("users")}
        >
          Użytkownicy
        </button>
        <button
          type="button"
          className={
            activeTab === "companies"
              ? "admin-tab admin-tab--active"
              : "admin-tab"
          }
          onClick={() => setTab("companies")}
        >
          Firmy
        </button>
      </div>

      <section className="admin-page__content">
        {activeTab === "users" ? renderUsersTab() : renderCompaniesTab()}
      </section>
    </div>
  );
};

export default AdminPanel;
