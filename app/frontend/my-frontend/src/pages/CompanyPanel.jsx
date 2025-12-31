import React, { useState, useEffect, useCallback } from "react";
import {
  tokenManager,
  companiesAPI,
  companyAuditAPI,
  servicesAPI,
  branchesAPI,
  branchReviewsAPI,
  authAPI,
  companyUsersAPI,
} from "../services/api";
import "../admin.css"; // Reusing admin panel styles for consistency

const CompanyPanel = () => {
  const [activeTab, setActiveTab] = useState("details");
  const [company, setCompany] = useState(null);
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchReviewSummaries, setBranchReviewSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [panelSuccess, setPanelSuccess] = useState("");

  const [companyAuditLogs, setCompanyAuditLogs] = useState([]);
  const [companyAuditLoading, setCompanyAuditLoading] = useState(false);
  const [companyAuditError, setCompanyAuditError] = useState("");

  // Company details form
  const [companyForm, setCompanyForm] = useState(null);
  const [companyFormSubmitting, setCompanyFormSubmitting] = useState(false);
  const [companyFormError, setCompanyFormError] = useState("");
  const [companyFormSuccess, setCompanyFormSuccess] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);

  // Services form (for create/edit)
  const [serviceFormVisible, setServiceFormVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceFormSubmitting, setServiceFormSubmitting] = useState(false);
  const [serviceFormError, setServiceFormError] = useState("");

  const [branchFormVisible, setBranchFormVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchFormSubmitting, setBranchFormSubmitting] = useState(false);
  const [branchFormError, setBranchFormError] = useState("");

  // Delete company state
  const [deleteCompanyError, setDeleteCompanyError] = useState("");
  const [deleteCompanyLoading, setDeleteCompanyLoading] = useState(false);

  // Employees state
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [addUserFormVisible, setAddUserFormVisible] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    email: "",
    role: "Employee",
  });
  const [addUserFormError, setAddUserFormError] = useState("");
  const [addUserFormSubmitting, setAddUserFormSubmitting] = useState(false);

  const companyId = tokenManager.getUser()?.companyId;
  const companyRole = tokenManager.getUser()?.companyRole;
  const currentUserId = tokenManager.getUser()?.userId;
  const userRoles = tokenManager.getUser()?.roles || [];
  const isAdmin = userRoles.includes("Admin");
  const isOwner = companyRole === "Owner";
  const isManager = companyRole === "Manager";
  const isEmployee = companyRole === "Employee";
  const canViewReservations = Boolean(companyId) && (isAdmin || isOwner || isManager || isEmployee);
  const canManageEmployees = isAdmin || isOwner || isManager;
  const canEditCompany = isAdmin || isOwner;
  const canManageEmployeesActions = isAdmin || isOwner || isManager;
  const canTransferOwnership = isAdmin || isOwner;
  const canManageCompanyCatalog = isAdmin || isOwner || isManager;

  useEffect(() => {
    if (!panelSuccess) return undefined;

    const handle = setTimeout(() => {
      setPanelSuccess("");
    }, 3500);

    return () => {
      clearTimeout(handle);
    };
  }, [panelSuccess]);

  useEffect(() => {
    const allowedTabs = [];
    if (canEditCompany) {
      allowedTabs.push("reservations", "details", "branches", "services", "employees", "audit", "settings");
    } else if (canManageEmployees) {
      allowedTabs.push("reservations", "branches", "services", "employees");
    } else if (canViewReservations) {
      allowedTabs.push("reservations");
    }

    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [activeTab, canEditCompany, canManageEmployees, canViewReservations]);

  const renderReservationsTab = () => (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">Rezerwacje</h2>
      </div>
      <div className="admin-card">
        <p>Wkrótce: lista rezerwacji do potwierdzenia/odrzucenia.</p>
      </div>
    </section>
  );

  const loadCompanyAudit = useCallback(async () => {
    if (!companyId) return;
    setCompanyAuditLoading(true);
    setCompanyAuditError("");
    try {
      const res = await companyAuditAPI.getByCompany(companyId, 200);
      setCompanyAuditLogs(res.data || []);
    } catch (err) {
      console.error("Failed to load company audit", err);
      setCompanyAuditError("Nie udało się załadować audytu firmy.");
    } finally {
      setCompanyAuditLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (activeTab === "audit" && canEditCompany) {
      loadCompanyAudit();
    }
  }, [activeTab, canEditCompany, loadCompanyAudit]);

  const loadCompanyData = useCallback(async () => {
    if (!companyId) {
      setError("Nie znaleziono przypisanej firmy.");
      setLoading(false);
      return;
    }
    try {
      const companyResponse = await companiesAPI.getById(companyId);
      const backendCompany = companyResponse.data;

      // Pola godzin są na razie tylko po stronie frontendu – backend ich nie przechowuje,
      // dlatego ustawiamy sensowne wartości domyślne, jeśli nie istnieją w odpowiedzi.
      const formWithDefaults = {
        ...backendCompany,
        openingHour:
          (companyForm && companyForm.openingHour) ||
          backendCompany.openingHour ||
          "08:00",
        closingHour:
          (companyForm && companyForm.closingHour) ||
          backendCompany.closingHour ||
          "18:00",
      };

      setCompany(backendCompany);
      setCompanyForm(formWithDefaults);
    } catch (err) {
      console.error("Failed to load company data", err);
      if (err.response?.status === 404) {
        // Firma przypisana w Identity nie istnieje już w ReservationService
        setError(
          "Nie znaleziono firmy przypisanej do Twojego konta. Firma mogła zostać usunięta. Zostaniesz przekierowany do ustawień konta, aby dodać nową firmę.",
        );
        try {
          await authAPI.unassignCompany();
        } catch (unassignErr) {
          console.error("Failed to unassign company after 404", unassignErr);
        }

        if (typeof window !== "undefined") {
          setTimeout(() => {
            window.location.href = "/account";
          }, 2500);
        }
      } else {
        setError("Nie udało się załadować danych firmy.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const response = await companyUsersAPI.getUsers();
      setEmployees(response.data);
    } catch (err) {
      console.error("Failed to load employees", err);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  const loadServices = useCallback(async () => {
    if (!companyId) return;
    try {
      const servicesResponse = await servicesAPI.getByCompany(companyId);
      setServices(servicesResponse.data || []);
    } catch (err) {
      console.error("Failed to load services", err);
      // Don't block the UI for this, just log it.
    }
  }, [companyId]);

  const loadBranches = useCallback(async () => {
    if (!companyId) return;
    try {
      const response = await branchesAPI.getByCompany(companyId);
      setBranches(response.data || []);
    } catch (err) {
      console.error("Failed to load branches", err);
    }
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;

    const loadBranchReviewSummaries = async () => {
      if (branches.length === 0) {
        setBranchReviewSummaries({});
        return;
      }

      try {
        const results = await Promise.all(
          branches.map(async (branch) => {
            try {
              const res = await branchReviewsAPI.getBranchSummary(branch.id);
              return [branch.id, res.data];
            } catch (err) {
              console.error(
                `Failed to load branch review summary for branch ${branch.id}`,
                err,
              );
              return [branch.id, null];
            }
          }),
        );

        if (!cancelled) {
          setBranchReviewSummaries(Object.fromEntries(results));
        }
      } catch (err) {
        if (!cancelled) {
          setBranchReviewSummaries({});
        }
      }
    };

    loadBranchReviewSummaries();

    return () => {
      cancelled = true;
    };
  }, [branches]);

  const formatBranchReviewSummary = (summary) => {
    if (!summary) return "—";
    const count = summary.reviewCount ?? 0;
    const avg = summary.averageRating ?? 0;
    if (count === 0) return "Brak ocen";
    return `${Number(avg).toFixed(1)}/5 (${count})`;
  };

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setError("");
      await Promise.all([loadCompanyData(), loadServices(), loadBranches(), loadEmployees()]);
      setLoading(false);
    };
    loadAllData();
  }, [loadCompanyData, loadServices, loadBranches, loadEmployees]);

  useEffect(() => {
    const rawQuery = branchFormVisible
      ? editingBranch?.city
      : companyForm?.city;
    const query = rawQuery?.trim();

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
        console.error("City suggestions load error (company panel):", err);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [branchFormVisible, editingBranch, companyForm]);

  // --- Handlers for Company Details ---
  const handleCompanyFormChange = (e) => {
    const { name, value } = e.target;
    setCompanyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompanyFormSubmit = async (e) => {
    e.preventDefault();
    setCompanyFormSubmitting(true);
    setCompanyFormError("");
    setCompanyFormSuccess("");
    if (
      companyForm.openingHour &&
      companyForm.closingHour &&
      companyForm.closingHour <= companyForm.openingHour
    ) {
      setCompanyFormSubmitting(false);
      setCompanyFormError(
        "Godzina zamknięcia musi być późniejsza niż godzina otwarcia.",
      );
      return;
    }
    try {
      await companiesAPI.update(companyId, companyForm);
      setCompanyFormSuccess("Dane firmy zostały zaktualizowane.");
      // Nie przeładowuj danych z backendu, aby nie nadpisywać lokalnych pól front-endowych
      // (np. godzin otwarcia/zamknięcia, które backend na razie ignoruje).
    } catch (err) {
      console.error("Failed to update company", err);
      if (err.response?.data?.errors) {
        const message = Array.isArray(err.response.data.errors)
          ? err.response.data.errors.join(" ")
          : Object.values(err.response.data.errors).flat().join(" ");
        setCompanyFormError(message);
      } else if (err.response?.data?.message) {
        setCompanyFormError(err.response.data.message);
      } else {
        setCompanyFormError("Nie udało się zaktualizować danych firmy.");
      }
    } finally {
      setCompanyFormSubmitting(false);
    }
  };

  const resetBranchForm = () => {
    setEditingBranch({
      branchName: "",
      phone: companyForm?.phone || "",
      streetName: companyForm?.streetName || "",
      streetNumber: companyForm?.streetNumber || "",
      apartmentNumber: companyForm?.apartmentNumber || "",
      city: companyForm?.city || "",
      postalCode: companyForm?.postalCode || "",
      country: companyForm?.country || "Polska",
      openingHour: companyForm?.openingHour || "",
      closingHour: companyForm?.closingHour || "",
    });
    setBranchFormError("");
  };

  const handleOpenCreateBranch = () => {
    resetBranchForm();
    setBranchFormVisible(true);
  };

  const handleOpenEditBranch = (branch) => {
    setEditingBranch({
      ...branch,
      openingHour: branch.openingHour || "",
      closingHour: branch.closingHour || "",
    });
    setBranchFormError("");
    setBranchFormVisible(true);
  };

  const handleBranchFormChange = (e) => {
    const { name, value } = e.target;
    setEditingBranch((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBranchFormSubmit = async (e) => {
    e.preventDefault();
    setBranchFormSubmitting(true);
    setBranchFormError("");
    try {
      const payload = {
        ...editingBranch,
        companyId,
      };

      if (editingBranch.id) {
        await branchesAPI.update(editingBranch.id, payload);
        setPanelSuccess("Oddział został zaktualizowany.");
      } else {
        await branchesAPI.create(payload);
        setPanelSuccess("Oddział został dodany.");
      }

      setBranchFormVisible(false);
      await loadBranches();
      await loadServices();
    } catch (err) {
      console.error("Failed to save branch", err);
      if (err.response?.data?.errors) {
        const message = Array.isArray(err.response.data.errors)
          ? err.response.data.errors.join(" ")
          : Object.values(err.response.data.errors).flat().join(" ");
        setBranchFormError(message);
      } else if (err.response?.data?.message) {
        setBranchFormError(err.response.data.message);
      } else {
        setBranchFormError("Nie udało się zapisać oddziału.");
      }
    } finally {
      setBranchFormSubmitting(false);
    }
  };

  const handleDeleteBranch = async (branchId) => {
    if (window.confirm("Na pewno chcesz usunąć ten oddział?")) {
      try {
        await branchesAPI.delete(branchId);
        await loadBranches();
        await loadServices();
        setPanelSuccess("Oddział został usunięty.");
      } catch (err) {
        console.error("Failed to delete branch", err);
        alert(err.response?.data?.message || "Nie udało się usunąć oddziału.");
      }
    }
  };

  // --- Handlers for Services ---
  const resetServiceForm = () => {
    const defaultBranchId = branches.length > 0 ? branches[0].id : "";
    setEditingService({
      serviceName: "",
      description: "",
      durationMinutes: 30,
      price: 50,
      branchId: defaultBranchId,
    });
    setServiceFormError("");
  };

  const handleOpenCreateService = () => {
    resetServiceForm();
    setServiceFormVisible(true);
  };

  const handleOpenEditService = (service) => {
    setEditingService(service);
    setServiceFormError("");
    setServiceFormVisible(true);
  };

  const handleServiceFormChange = (e) => {
    const { name, value, type } = e.target;
    setEditingService((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? parseFloat(value)
          : name === "branchId"
            ? parseInt(value, 10)
            : value,
    }));
  };

  const handleServiceFormSubmit = async (e) => {
    e.preventDefault();
    setServiceFormSubmitting(true);
    setServiceFormError("");
    try {
      const serviceData = { ...editingService, companyId };
      if (editingService.id) {
        await servicesAPI.update(editingService.id, serviceData);
        setPanelSuccess("Usługa została zaktualizowana.");
      } else {
        await servicesAPI.create(serviceData);
        setPanelSuccess("Usługa została dodana.");
      }
      setServiceFormVisible(false);
      await loadServices();
    } catch (err) {
      console.error("Failed to save service", err);
      if (err.response?.data?.errors) {
        const message = Array.isArray(err.response.data.errors)
          ? err.response.data.errors.join(" ")
          : Object.values(err.response.data.errors).flat().join(" ");
        setServiceFormError(message);
      } else if (err.response?.data?.message) {
        setServiceFormError(err.response.data.message);
      } else {
        setServiceFormError("Nie udało się zapisać usługi.");
      }
    } finally {
      setServiceFormSubmitting(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (
      !window.confirm(
        "Czy na pewno chcesz trwale usunąć swoją firmę? Spowoduje to usunięcie wszystkich jej danych i usług. Ta operacja jest nieodwracalna.",
      )
    ) {
      return;
    }

    setDeleteCompanyLoading(true);
    setDeleteCompanyError("");

    try {
      // Step 1: Remove all non-owner employees from the company in IdentityService
      const removableEmployees = employees.filter((e) => e.role !== "Owner");
      for (const employee of removableEmployees) {
        try {
          await companyUsersAPI.removeUser(employee.id);
        } catch (innerErr) {
          console.error(
            "Failed to remove employee during company delete",
            innerErr,
          );
          // Continue with other employees and overall flow
        }
      }

      // Step 2: Delete company from ReservationService
      await companiesAPI.delete(companyId);

      // Step 3: Unassign company from current user (owner) in IdentityService
      await authAPI.unassignCompany();

      // Step 4: Redirect to account page
      if (typeof window !== "undefined") {
        window.location.href = "/account";
      }
    } catch (err) {
      console.error("Failed to delete company", err);
      setDeleteCompanyError(
        "Nie udało się usunąć firmy. Skontaktuj się z administratorem.",
      );
    } finally {
      setDeleteCompanyLoading(false);
    }
  };

  // --- Handlers for Employees ---
  const handleAddUserFormChange = (e) => {
    const { name, value } = e.target;
    setAddUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddUserFormSubmit = async (e) => {
    e.preventDefault();
    setAddUserFormSubmitting(true);
    setAddUserFormError("");
    try {
      await companyUsersAPI.addUser(addUserForm);
      setAddUserFormVisible(false);
      setAddUserForm({ email: "", role: "Employee" });
      await loadEmployees();
    } catch (err) {
      console.error("Failed to add user", err);
      setAddUserFormError(
        err.response?.data?.message || "Nie udało się dodać użytkownika.",
      );
    } finally {
      setAddUserFormSubmitting(false);
    }
  };

  const handleRemoveUser = async (userId) => {
    if (window.confirm("Na pewno chcesz usunąć tego pracownika z firmy?")) {
      try {
        await companyUsersAPI.removeUser(userId);
        await loadEmployees();
      } catch (err) {
        console.error("Failed to remove user", err);
        alert(
          err.response?.data?.message || "Nie udało się usunąć użytkownika.",
        );
      }
    }
  };

  const handleTransferOwnership = async (newOwner) => {
    if (
      window.confirm(
        `Czy na pewno chcesz przekazać własność firmy użytkownikowi ${newOwner.email}? Utracisz uprawnienia właściciela.`,
      )
    ) {
      try {
        await companyUsersAPI.transferOwnership(newOwner.id);
        alert(
          "Własność została przekazana. Zostaniesz wylogowany, aby odświeżyć uprawnienia.",
        );
        // Force logout to refresh roles on next login
        authAPI.logout();
      } catch (err) {
        console.error("Failed to transfer ownership", err);
        alert(
          err.response?.data?.message || "Nie udało się przekazać własności.",
        );
      }
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await companyUsersAPI.updateUserRole(userId, newRole);
      await loadEmployees();
    } catch (err) {
      console.error("Failed to update role", err);
      alert(err.response?.data?.message || "Nie udało się zaktualizować roli.");
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (window.confirm("Na pewno chcesz usunąć tę usługę?")) {
      try {
        await servicesAPI.delete(serviceId);
        await loadServices();
        setPanelSuccess("Usługa została usunięta.");
      } catch (err) {
        console.error("Failed to delete service", err);
        alert("Nie udało się usunąć usługi.");
      }
    }
  };

  // --- Render Methods ---
  const renderCompanyDetailsTab = () => (
    <section className="admin-section">
      {companyFormError && (
        <div className="admin-alert admin-alert--error">{companyFormError}</div>
      )}
      {companyFormSuccess && (
        <div className="admin-alert admin-alert--success">
          {companyFormSuccess}
        </div>
      )}
      {companyForm && (
        <form onSubmit={handleCompanyFormSubmit} className="admin-form">
          <div className="admin-form__grid">
            <div className="admin-form__field admin-form__field--full">
              <label>Nazwa firmy</label>
              <input
                name="companyName"
                type="text"
                value={companyForm.companyName}
                onChange={handleCompanyFormChange}
                required
                maxLength={100}
                className="admin-input"
              />
            </div>
            {/* Add other company fields here, similar to AccountPage company form */}
            <div className="admin-form__field">
              <label>Email</label>
              <input
                name="email"
                type="email"
                value={companyForm.email}
                onChange={handleCompanyFormChange}
                required
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label>Telefon</label>
              <input
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
              <label>Miasto</label>
              <input
                name="city"
                type="text"
                value={companyForm.city}
                onChange={handleCompanyFormChange}
                required
                className="admin-input"
                list="company-panel-city-options"
              />
              <datalist id="company-panel-city-options">
                {citySuggestions.map((cityOption) => (
                  <option key={cityOption} value={cityOption} />
                ))}
              </datalist>
            </div>
            <div className="admin-form__field">
              <label>Ulica</label>
              <input
                name="streetName"
                type="text"
                value={companyForm.streetName || ""}
                onChange={handleCompanyFormChange}
                required
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label>Numer budynku</label>
              <input
                name="streetNumber"
                type="text"
                value={companyForm.streetNumber || ""}
                onChange={handleCompanyFormChange}
                required
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label>Nr lokalu (opcjonalnie)</label>
              <input
                name="apartmentNumber"
                type="text"
                value={companyForm.apartmentNumber || ""}
                onChange={handleCompanyFormChange}
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label>Kod pocztowy</label>
              <input
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
              <label>Opis (max. 1000 znaków)</label>
              <textarea
                name="description"
                value={companyForm.description}
                onChange={handleCompanyFormChange}
                rows="4"
                maxLength={1000}
                className="admin-input"
              ></textarea>
            </div>
            <div className="admin-form__field">
              <label>Godzina otwarcia</label>
              <input
                name="openingHour"
                type="time"
                value={companyForm.openingHour}
                onChange={handleCompanyFormChange}
                required
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label>Godzina zamknięcia</label>
              <input
                name="closingHour"
                type="time"
                value={companyForm.closingHour}
                onChange={handleCompanyFormChange}
                required
                className="admin-input"
              />
            </div>
          </div>
          <div className="admin-form__actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={companyFormSubmitting}
            >
              {companyFormSubmitting ? "Zapisywanie..." : "Zapisz zmiany"}
            </button>
          </div>
        </form>
      )}
    </section>
  );

  const renderServicesTab = () => (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">Usługi</h2>
        <div className="admin-section__actions">
          {canManageCompanyCatalog && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateService}
            >
              Dodaj usługę
            </button>
          )}
        </div>
      </div>
      <div className="admin-card">
        {branches.length === 0 ? (
          <p>Brak oddziałów. Najpierw dodaj oddział.</p>
        ) : services.length === 0 ? (
          <p>Brak zdefiniowanych usług.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nazwa usługi</th>
                <th>Oddział</th>
                <th>Czas trwania (min)</th>
                <th>Cena (PLN)</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>{service.serviceName}</td>
                  <td>
                    {(() => {
                      const branch = branches.find((b) => b.id === service.branchId);
                      const name = branch?.branchName || service.branchId;
                      return branch?.city ? `${name} (${branch.city})` : name;
                    })()}
                  </td>
                  <td>{service.durationMinutes}</td>
                  <td>{service.price.toFixed(2)}</td>
                  <td>
                    {canManageCompanyCatalog ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => handleOpenEditService(service)}
                        >
                          Edytuj
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs admin-table__delete-btn"
                          onClick={() => handleDeleteService(service.id)}
                        >
                          Usuń
                        </button>
                      </>
                    ) : (
                      <span className="admin-muted">Brak uprawnień</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );

  const renderBranchesTab = () => (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">Oddziały</h2>
        <div className="admin-section__actions">
          {canManageCompanyCatalog && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateBranch}
            >
              Dodaj oddział
            </button>
          )}
        </div>
      </div>
      <div className="admin-card">
        {branches.length === 0 ? (
          <p>Brak zdefiniowanych oddziałów.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Miasto</th>
                <th>Adres</th>
                <th>Telefon</th>
                <th>Oceny</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <td>{branch.branchName}</td>
                  <td>{branch.city || ""}</td>
                  <td>
                    {(branch.streetName || "") +
                      (branch.streetNumber ? ` ${branch.streetNumber}` : "")}
                  </td>
                  <td>{branch.phone || "—"}</td>
                  <td>
                    {formatBranchReviewSummary(branchReviewSummaries[branch.id])}
                  </td>
                  <td>
                    {canManageCompanyCatalog ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => handleOpenEditBranch(branch)}
                        >
                          Edytuj
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs admin-table__delete-btn"
                          onClick={() => handleDeleteBranch(branch.id)}
                        >
                          Usuń
                        </button>
                      </>
                    ) : (
                      <span className="admin-muted">Brak uprawnień</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );

  const renderSettingsTab = () => (
    <section className="admin-section">
      <h2 className="admin-section__title">Strefa zagrożenia</h2>
      <div className="admin-card">
        <div className="admin-card__body">
          <h4>Trwałe usunięcie firmy</h4>
          <p>
            Usunięcie firmy spowoduje skasowanie wszystkich jej danych, w tym
            listy usług i historii rezerwacji. Tej operacji nie można cofnąć.
          </p>
          {deleteCompanyError && (
            <div className="admin-alert admin-alert--error">
              {deleteCompanyError}
            </div>
          )}
          <button
            type="button"
            className="btn btn-outline"
            style={{ color: "#ef4444", borderColor: "#fca5a5" }}
            onClick={handleDeleteCompany}
            disabled={deleteCompanyLoading}
          >
            {deleteCompanyLoading ? "Usuwanie firmy..." : "Usuń firmę na stałe"}
          </button>
        </div>
      </div>
    </section>
  );

  const renderEmployeesTab = () => (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">Pracownicy</h2>
        <div className="admin-section__actions">
          {canManageEmployeesActions && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setAddUserFormVisible(true)}
            >
              Dodaj pracownika
            </button>
          )}
        </div>
      </div>
      <div className="admin-card">
        {employeesLoading ? (
          <p>Ładowanie...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Imię i nazwisko</th>
                <th>Rola</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>
                    {user.firstName} {user.lastName}
                  </td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleUpdateUserRole(user.id, e.target.value)
                      }
                      className="admin-input admin-input--inline"
                      disabled={
                        !canManageEmployeesActions ||
                        user.role === "Owner" ||
                        (currentUserId && user.id === currentUserId)
                      }
                    >
                      <option value="Owner" disabled>
                        Właściciel
                      </option>
                      <option value="Manager">Manager</option>
                      <option value="Employee">Pracownik</option>
                    </select>
                  </td>
                  <td>
                    <div className="admin-user-actions admin-user-actions--center">
                      <button
                        type="button"
                        className="btn btn-outline btn-xs admin-table__delete-btn"
                        onClick={() => handleRemoveUser(user.id)}
                        disabled={
                          !canManageEmployeesActions ||
                          user.role === "Owner" ||
                          (currentUserId && user.id === currentUserId)
                        }
                      >
                        Usuń
                      </button>
                      {canTransferOwnership && (
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => handleTransferOwnership(user)}
                          disabled={user.role === "Owner"}
                        >
                          Przekaż Własność
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );

  const renderAuditTab = () => (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">Audyt firmy</h2>
        <div className="admin-section__actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={loadCompanyAudit}
            disabled={companyAuditLoading}
          >
            Odśwież
          </button>
        </div>
      </div>

      {companyAuditError && (
        <div className="admin-alert admin-alert--error">{companyAuditError}</div>
      )}

      <div className="admin-card">
        {companyAuditLoading ? (
          <p>Ładowanie...</p>
        ) : companyAuditLogs.length === 0 ? (
          <p>Brak wpisów.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Akcja</th>
                <th>Obiekt</th>
                <th>Użytkownik</th>
              </tr>
            </thead>
            <tbody>
              {companyAuditLogs.map((log) => (
                <tr
                  key={
                    log.eventId ||
                    `${log.occurredAt}-${log.entityName}-${log.entityDisplayName || ''}`
                  }
                >
                  <td>
                    {log.occurredAt
                      ? new Date(log.occurredAt).toLocaleString()
                      : "—"}
                  </td>
                  <td>{log.action || "—"}</td>
                  <td>
                    {log.entityDisplayName || log.entityName || "—"}
                  </td>
                  <td
                    style={{
                      maxWidth: 220,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {log.userEmail || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );

  const renderAddUserForm = () => (
    <div className="admin-card--form-container">
      <div className="admin-card admin-card--form">
        <div className="admin-form__header">
          <h2>Dodaj pracownika do firmy</h2>
          <button
            type="button"
            className="btn-close"
            onClick={() => setAddUserFormVisible(false)}
          ></button>
        </div>
        <form onSubmit={handleAddUserFormSubmit} className="admin-form">
          {addUserFormError && (
            <div className="admin-alert admin-alert--error">
              {addUserFormError}
            </div>
          )}
          <p>
            Użytkownik musi już posiadać konto w systemie. Po dodaniu, zostanie
            przypisany do Twojej firmy.
          </p>
          <div className="admin-form__field">
            <label>Email użytkownika</label>
            <input
              name="email"
              type="email"
              value={addUserForm.email}
              onChange={handleAddUserFormChange}
              required
              className="admin-input"
            />
          </div>
          <div className="admin-form__field">
            <label>Rola</label>
            <select
              name="role"
              value={addUserForm.role}
              onChange={handleAddUserFormChange}
              className="admin-input"
            >
              <option value="Employee">Pracownik</option>
              <option value="Manager">Manager</option>
            </select>
          </div>
          <div className="admin-form__actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setAddUserFormVisible(false)}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={addUserFormSubmitting}
            >
              {addUserFormSubmitting ? "Dodawanie..." : "Dodaj użytkownika"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderBranchForm = () => (
    <div className="admin-card--form-container">
      <div className="admin-card admin-card--form">
        <div className="admin-form__header">
          <h2>{editingBranch?.id ? "Edytuj oddział" : "Dodaj nowy oddział"}</h2>
          <button
            type="button"
            className="btn-close"
            onClick={() => setBranchFormVisible(false)}
          ></button>
        </div>
        <form onSubmit={handleBranchFormSubmit} className="admin-form">
          {branchFormError && (
            <div className="admin-alert admin-alert--error">{branchFormError}</div>
          )}
          <div className="admin-form__grid">
            <div className="admin-form__field admin-form__field--full">
              <label>Nazwa oddziału</label>
              <input
                name="branchName"
                type="text"
                value={editingBranch?.branchName || ""}
                onChange={handleBranchFormChange}
                required
                className="admin-input"
                maxLength={100}
              />
            </div>
            <div className="admin-form__field">
              <label>Telefon (opcjonalnie)</label>
              <input
                name="phone"
                type="tel"
                value={editingBranch?.phone || ""}
                onChange={handleBranchFormChange}
                className="admin-input"
                placeholder="+48 111 222 333"
              />
            </div>
            <div className="admin-form__field">
              <label>Miasto</label>
              <input
                name="city"
                type="text"
                value={editingBranch?.city || ""}
                onChange={handleBranchFormChange}
                className="admin-input"
                list="company-panel-branch-city-options"
              />
              <datalist id="company-panel-branch-city-options">
                {citySuggestions.map((cityOption) => (
                  <option key={cityOption} value={cityOption} />
                ))}
              </datalist>
            </div>
            <div className="admin-form__field">
              <label>Ulica</label>
              <input
                name="streetName"
                type="text"
                value={editingBranch?.streetName || ""}
                onChange={handleBranchFormChange}
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label>Numer budynku</label>
              <input
                name="streetNumber"
                type="text"
                value={editingBranch?.streetNumber || ""}
                onChange={handleBranchFormChange}
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label>Nr lokalu (opcjonalnie)</label>
              <input
                name="apartmentNumber"
                type="text"
                value={editingBranch?.apartmentNumber || ""}
                onChange={handleBranchFormChange}
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label>Kod pocztowy</label>
              <input
                name="postalCode"
                type="text"
                value={editingBranch?.postalCode || ""}
                onChange={handleBranchFormChange}
                className="admin-input"
                placeholder="00-000"
                pattern="^[0-9]{2}-[0-9]{3}$"
                maxLength={6}
                title="Kod pocztowy w formacie 00-000"
              />
            </div>
            <div className="admin-form__field">
              <label>Kraj</label>
              <input
                name="country"
                type="text"
                value={editingBranch?.country || ""}
                onChange={handleBranchFormChange}
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label>Godzina otwarcia</label>
              <input
                name="openingHour"
                type="time"
                value={editingBranch?.openingHour || ""}
                onChange={handleBranchFormChange}
                className="admin-input"
              />
            </div>
            <div className="admin-form__field">
              <label>Godzina zamknięcia</label>
              <input
                name="closingHour"
                type="time"
                value={editingBranch?.closingHour || ""}
                onChange={handleBranchFormChange}
                className="admin-input"
              />
            </div>
          </div>
          <div className="admin-form__actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setBranchFormVisible(false)}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={branchFormSubmitting}
            >
              {branchFormSubmitting ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderServiceForm = () => (
    <div className="admin-card--form-container">
      <div className="admin-card admin-card--form">
        <div className="admin-form__header">
          <h2>{editingService?.id ? "Edytuj usługę" : "Dodaj nową usługę"}</h2>
          <button
            type="button"
            className="btn-close"
            onClick={() => setServiceFormVisible(false)}
          ></button>
        </div>
        <form onSubmit={handleServiceFormSubmit} className="admin-form">
          {serviceFormError && (
            <div className="admin-alert admin-alert--error">
              {serviceFormError}
            </div>
          )}
          <div className="admin-form__grid">
            <div className="admin-form__field admin-form__field--full">
              <label>Oddział</label>
              <select
                name="branchId"
                value={editingService?.branchId || ""}
                onChange={handleServiceFormChange}
                required
                className="admin-input"
                disabled={branches.length === 0}
              >
                <option value="" disabled>
                  Wybierz oddział
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branchName}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-form__field admin-form__field--full">
              <label>Nazwa usługi</label>
              <input
                name="serviceName"
                type="text"
                value={editingService?.serviceName || ""}
                onChange={handleServiceFormChange}
                required
                className="admin-input"
              />
            </div>
            <div className="admin-form__field admin-form__field--full">
              <label>Opis</label>
              <textarea
                name="description"
                value={editingService?.description || ""}
                onChange={handleServiceFormChange}
                rows="3"
                className="admin-input"
              ></textarea>
            </div>
            <div className="admin-form__field">
              <label>Czas trwania (w minutach)</label>
              <input
                name="durationMinutes"
                type="number"
                value={editingService?.durationMinutes || 0}
                onChange={handleServiceFormChange}
                required
                className="admin-input"
                min="1"
              />
            </div>
            <div className="admin-form__field">
              <label>Cena (PLN)</label>
              <input
                name="price"
                type="number"
                value={editingService?.price || 0}
                onChange={handleServiceFormChange}
                required
                className="admin-input"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="admin-form__actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setServiceFormVisible(false)}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={serviceFormSubmitting}
            >
              {serviceFormSubmitting ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading) return <p>Ładowanie panelu firmy...</p>;
  if (error)
    return <div className="admin-alert admin-alert--error">{error}</div>;
  if (!company)
    return (
      <div className="admin-alert admin-alert--error">
        Nie udało się załadować danych firmy.
      </div>
    );

  return (
    <div className="admin-page">
      {serviceFormVisible && renderServiceForm()}
      {branchFormVisible && renderBranchForm()}
      {addUserFormVisible && renderAddUserForm()}
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Panel Firmy</h1>
          <p className="admin-page__subtitle">
            Zarządzaj danymi firmy {company.companyName} i jej usługami
          </p>
        </div>
      </header>

      {panelSuccess && (
        <div className="admin-alert admin-alert--success" style={{ marginBottom: "12px" }}>
          {panelSuccess}
        </div>
      )}

      <div className="admin-page__tabs">
        {canViewReservations && (
          <button
            type="button"
            className={`admin-tab ${activeTab === "reservations" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("reservations")}
          >
            Rezerwacje
          </button>
        )}
        {canEditCompany && (
          <button
            type="button"
            className={`admin-tab ${activeTab === "details" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            Dane Firmy
          </button>
        )}
        {canManageCompanyCatalog && (
          <button
            type="button"
            className={`admin-tab ${activeTab === "branches" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("branches")}
          >
            Oddziały
          </button>
        )}
        {canManageCompanyCatalog && (
          <button
            type="button"
            className={`admin-tab ${activeTab === "services" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("services")}
          >
            Usługi
          </button>
        )}
        {canManageEmployees && (
          <button
            type="button"
            className={`admin-tab ${activeTab === "employees" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("employees")}
          >
            Pracownicy
          </button>
        )}
        {canEditCompany && (
          <button
            type="button"
            className={`admin-tab ${activeTab === "audit" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            Audyt
          </button>
        )}
        {canEditCompany && (
          <button
            type="button"
            className={`admin-tab ${activeTab === "settings" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            Ustawienia
          </button>
        )}
      </div>

      <div className="admin-page__content">
        {activeTab === "reservations" && canViewReservations && renderReservationsTab()}
        {activeTab === "details" && canEditCompany && renderCompanyDetailsTab()}
        {activeTab === "branches" && canManageCompanyCatalog && renderBranchesTab()}
        {activeTab === "services" && canManageCompanyCatalog && renderServicesTab()}
        {activeTab === "employees" && canManageEmployees && renderEmployeesTab()}
        {activeTab === "audit" && canEditCompany && renderAuditTab()}
        {activeTab === "settings" && canEditCompany && renderSettingsTab()}
      </div>
    </div>
  );
};

export default CompanyPanel;
