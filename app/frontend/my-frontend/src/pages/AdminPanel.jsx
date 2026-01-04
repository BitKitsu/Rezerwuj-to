import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import "../admin.css";
import { useI18n } from "../i18n/I18nContext";
import {
  adminAPI,
  companiesAPI,
  notificationTemplatesAPI,
  tokenManager,
} from "../services/api";

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

const sanitizePhoneNumberInput = (value) => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  if (!digits) return "";
  return `+${digits}`;
};

const formatPhoneDisplay = (value) => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  if (!digits) {
    return raw.startsWith("+") ? "+" : "";
  }
  const plus = "+";

  const inferredCountryLen = digits.length > 9 ? Math.min(3, digits.length - 9) : Math.min(3, digits.length);
  const country = digits.slice(0, inferredCountryLen);
  const rest = digits.slice(inferredCountryLen);

  const groups = rest.match(/.{1,3}/g) || [];
  const grouped = groups.join("-");

  return plus + country + (grouped ? ` ${grouped}` : "");
};

const AdminPanel = () => {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => tabFromUrl || "users");
  const currentUser = tokenManager.getUser();
  const isSystemAdmin = (currentUser?.roles || []).includes("Admin");

  const tx = (value) => {
    if (!value) return "";
    if (typeof value === "object" && value.key) {
      return t(value.key, value.vars);
    }
    const s = String(value);
    if (s.startsWith("adminPanel.") || s.startsWith("common.")) return t(s);
    return s;
  };

  const templateTypeOptions = [
    { value: 0, label: "AppointmentReminder" },
    { value: 1, label: "AppointmentConfirmation" },
    { value: 2, label: "AppointmentCancellation" },
    { value: 3, label: "AppointmentRescheduled" },
    { value: 4, label: "SystemNotification" },
    { value: 5, label: "PromotionalOffer" },
    { value: 6, label: "AccountUpdate" },
  ];

  const templateChannelOptions = [
    { value: 0, label: "Email" },
    { value: 1, label: "SMS" },
    { value: 2, label: "InApp" },
  ];

  const templatePlaceholders = [
    { token: "{{userName}}", label: "userName" },
    { token: "{{userFirstName}}", label: "userFirstName" },
    { token: "{{userLastName}}", label: "userLastName" },
    { token: "{{userFullName}}", label: "userFullName" },
    { token: "{{companyName}}", label: "companyName" },
    { token: "{{branchName}}", label: "branchName" },
    { token: "{{serviceName}}", label: "serviceName" },
    { token: "{{appointmentDate}}", label: "appointmentDate" },
    { token: "{{appointmentTime}}", label: "appointmentTime" },
    { token: "{{appointmentDateTime}}", label: "appointmentDateTime" },
    { token: "{{appointmentShort}}", label: "appointmentShort" },
    { token: "{{appointmentId}}", label: "appointmentId" },
    { token: "{{companyAddress}}", label: "companyAddress" },
    { token: "{{companyAddressShort}}", label: "companyAddressShort" },
    { token: "{{companyEmail}}", label: "companyEmail" },
    { token: "{{companyPhone}}", label: "companyPhone" },
    { token: "{{contact}}", label: "contact" },
  ];

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);
  const [activeTemplateField, setActiveTemplateField] = useState("body");

  const getHttpErrorMessage = (err, fallback) => {
    const reqUrl = err?.config
      ? `${String(err.config.baseURL || "").replace(/\/$/, "")}${String(err.config.url || "")}`
      : "";
    const msg =
      err?.response?.data?.message ||
      (typeof err?.response?.data === "string" ? err.response.data : "") ||
      (err?.response?.status ? `HTTP ${err.response.status}` : "") ||
      fallback;
    return [String(msg), reqUrl ? `URL: ${reqUrl}` : ""].filter(Boolean).join(" | ");
  };

  const insertTemplateToken = (token) => {
    const field = activeTemplateField === "subject" ? "subject" : "body";
    const ref = field === "subject" ? subjectRef : bodyRef;
    const el = ref.current;

    const currentValue = String(editingTemplate?.[field] ?? "");

    if (el && typeof el.selectionStart === "number" && typeof el.selectionEnd === "number") {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
      handleTemplateFormChange(field, next);
      requestAnimationFrame(() => {
        try {
          el.focus();
          el.setSelectionRange(start + token.length, start + token.length);
        } catch {
        }
      });
      return;
    }

    handleTemplateFormChange(field, `${currentValue}${token}`);
  };

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

  const renderTemplatesTab = () => (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">{t("adminPanel.templates.title")}</h2>
        <div className="admin-section__actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateTemplate}
            disabled={!isSystemAdmin}
          >
            {t("adminPanel.templates.add")}
          </button>
        </div>
      </div>

      {templatesError && (
        <div className="admin-alert admin-alert--error">{tx(templatesError)}</div>
      )}

      {!isSystemAdmin ? (
        <div className="admin-alert admin-alert--error">
          {t("adminPanel.templates.noPermissions")}
        </div>
      ) : null}

      <div className="admin-card">
        {templatesLoading && templates.length === 0 ? (
          <p>{t("adminPanel.templates.loading")}</p>
        ) : templates.length === 0 ? (
          <p>{t("adminPanel.templates.empty")}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("adminPanel.templates.table.name")}</th>
                <th>{t("adminPanel.templates.table.type")}</th>
                <th>{t("adminPanel.templates.table.channel")}</th>
                <th>{t("adminPanel.templates.table.active")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id}>
                  <td>{tpl.name}</td>
                  <td>
                    {(() => {
                      const label = templateTypeOptions.find((x) => x.value === tpl.type)?.label;
                      return label
                        ? t(`adminPanel.templates.types.${label}`)
                        : String(tpl.type);
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const label = templateChannelOptions.find((x) => x.value === tpl.channel)?.label;
                      return label
                        ? t(`adminPanel.templates.channels.${label}`)
                        : String(tpl.channel ?? "");
                    })()}
                  </td>
                  <td>{tpl.isActive ? t("common.yes") : t("common.no")}</td>
                  <td>
                    <div className="admin-user-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => handleOpenEditTemplate(tpl)}
                        disabled={!isSystemAdmin}
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs admin-table__delete-btn"
                        onClick={() => handleDeleteTemplate(tpl)}
                        disabled={!isSystemAdmin}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {templateFormVisible && editingTemplate && (
        <div className="admin-card--form-container">
          <div className="admin-card admin-card--form">
            <div className="admin-form__header">
              <h2>
                {editingTemplate.id == null
                  ? t("adminPanel.templates.form.titleCreate")
                  : t("adminPanel.templates.form.titleEdit")}
              </h2>
              <button type="button" className="btn-close" onClick={handleCloseTemplateForm} aria-label={t("common.close")} />
            </div>
            <form className="admin-form" onSubmit={handleTemplateFormSubmit}>
            <div className="admin-form__grid">
              <label className="admin-form__field">
                <span>{t("adminPanel.templates.form.name")}</span>
                <input
                  type="text"
                  className="admin-input"
                  value={editingTemplate.name}
                  onChange={(e) =>
                    handleTemplateFormChange("name", e.target.value)
                  }
                  required
                  maxLength={200}
                />
              </label>

              <label className="admin-form__field">
                <span>{t("adminPanel.templates.form.type")}</span>
                <select
                  className="admin-input"
                  value={String(editingTemplate.type)}
                  onChange={(e) =>
                    handleTemplateFormChange("type", Number(e.target.value))
                  }
                >
                  {templateTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`adminPanel.templates.types.${opt.label}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-form__field">
                <span>{t("adminPanel.templates.form.channel")}</span>
                <select
                  className="admin-input"
                  value={String(editingTemplate.channel ?? 0)}
                  onChange={(e) =>
                    handleTemplateFormChange("channel", Number(e.target.value))
                  }
                >
                  {templateChannelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`adminPanel.templates.channels.${opt.label}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-form__field admin-form__field--full">
                <span>{t("adminPanel.templates.form.subject")}</span>
                <input
                  type="text"
                  className="admin-input"
                  ref={subjectRef}
                  value={editingTemplate.subject}
                  onChange={(e) =>
                    handleTemplateFormChange("subject", e.target.value)
                  }
                  onFocus={() => setActiveTemplateField("subject")}
                />
              </label>

              <label className="admin-form__field admin-form__field--full">
                <span>{t("adminPanel.templates.form.body")}</span>
                <textarea
                  className="admin-input"
                  rows={5}
                  ref={bodyRef}
                  value={editingTemplate.body}
                  onChange={(e) =>
                    handleTemplateFormChange("body", e.target.value)
                  }
                  onFocus={() => setActiveTemplateField("body")}
                />
              </label>

              <div className="admin-form__field admin-form__field--full">
                <span className="admin-muted">
                  {t("adminPanel.templates.insertVariable", {
                    field:
                      activeTemplateField === "subject"
                        ? t("adminPanel.templates.fields.subject")
                        : t("adminPanel.templates.fields.body"),
                  })}
                </span>
                <div className="admin-user-actions" style={{ flexWrap: "wrap" }}>
                  {templatePlaceholders.map((p) => (
                    <button
                      key={`token-${p.token}`}
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={() => insertTemplateToken(p.token)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="admin-form__field">
                <span>{t("adminPanel.templates.form.active")}</span>
                <select
                  className="admin-input"
                  value={editingTemplate.isActive ? "true" : "false"}
                  onChange={(e) =>
                    handleTemplateFormChange(
                      "isActive",
                      e.target.value === "true",
                    )
                  }
                >
                  <option value="true">{t("common.yes")}</option>
                  <option value="false">{t("common.no")}</option>
                </select>
              </label>
            </div>

            <div className="admin-form__actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleCloseTemplateForm}
              >
                {t("common.cancel")}
              </button>
              <button type="submit" className="btn btn-primary">
                {t("common.save")}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );

  useEffect(() => {
    const allowedTabs = isSystemAdmin ? ["users", "companies", "templates"] : ["users", "companies"];
    if (!allowedTabs.includes(activeTab)) {
      setTab("users");
    }
  }, [activeTab, isSystemAdmin, setTab]);

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

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState("");
  const [templateFormVisible, setTemplateFormVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

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

  const resetTemplateForm = () => {
    setEditingTemplate({
      id: null,
      name: "",
      type: 0,
      channel: 0,
      subject: "",
      body: "",
      isActive: true,
    });
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError("");
    try {
      const res = await notificationTemplatesAPI.getAll(true);
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error loading templates", error);
      setTemplatesError(getHttpErrorMessage(error, t("adminPanel.templates.loadError")));
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleOpenCreateTemplate = () => {
    resetTemplateForm();
    setTemplateFormVisible(true);
  };

  const handleOpenEditTemplate = (template) => {
    setEditingTemplate({
      id: template.id,
      name: template.name || "",
      type:
        typeof template.type === "number" ? template.type : Number(template.type) || 0,
      channel:
        typeof template.channel === "number"
          ? template.channel
          : Number(template.channel) || 0,
      subject: template.subject || "",
      body: template.body || "",
      isActive: template.isActive !== false,
    });
    setTemplateFormVisible(true);
  };

  const handleCloseTemplateForm = () => {
    setTemplateFormVisible(false);
  };

  const handleTemplateFormChange = (field, value) => {
    setEditingTemplate((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTemplateFormSubmit = async (event) => {
    event.preventDefault();
    if (!editingTemplate) return;

    if (!isSystemAdmin) {
      window.alert(t("adminPanel.templates.noPermissionsSave"));
      return;
    }

    const payload = {
      name: (editingTemplate.name || "").trim(),
      type: Number(editingTemplate.type) || 0,
      channel: Number(editingTemplate.channel) || 0,
      subject: editingTemplate.subject || "",
      body: editingTemplate.body || "",
      isActive: !!editingTemplate.isActive,
    };

    if (!payload.name) {
      window.alert(t("adminPanel.templates.validation.nameRequired"));
      return;
    }

    try {
      if (editingTemplate.id == null) {
        await notificationTemplatesAPI.create(payload);
      } else {
        await notificationTemplatesAPI.update(editingTemplate.id, payload);
      }
      setTemplateFormVisible(false);
      await loadTemplates();
    } catch (error) {
      console.error("Save template error", error);
      window.alert(getHttpErrorMessage(error, t("adminPanel.templates.saveError")));
    }
  };

  const handleDeleteTemplate = async (template) => {
    if (
      !window.confirm(
        t("adminPanel.templates.deleteConfirm", { name: template.name }),
      )
    ) {
      return;
    }
    try {
      await notificationTemplatesAPI.delete(template.id);
      await loadTemplates();
    } catch (error) {
      console.error("Delete template error", error);
      window.alert(t("adminPanel.templates.deleteError"));
    }
  };

  useEffect(() => {
    loadUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab !== "templates") return;
    if (isSystemAdmin) {
      loadTemplates();
    } else {
      setTemplates([]);
      setTemplatesError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isSystemAdmin]);

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
      setUsersError("adminPanel.users.loadError");
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
      setCompaniesError("adminPanel.companies.loadError");
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
      window.alert(t("adminPanel.users.grantAdminError"));
    }
  };

  const handleRevokeAdmin = async (userId) => {
    if (
      !window.confirm(
        t("adminPanel.users.revokeAdminConfirm"),
      )
    ) {
      return;
    }
    try {
      await adminAPI.revokeAdmin(userId);
      await loadUsers(usersPage);
    } catch (error) {
      console.error("Revoke admin error", error);
      window.alert(t("adminPanel.users.revokeAdminError"));
    }
  };

  const handleDeleteUser = async (user) => {
    if (
      !window.confirm(
        t("adminPanel.users.deleteConfirm", { email: user.email }),
      )
    ) {
      return;
    }

    try {
      await adminAPI.deleteUser(user.id);
      await loadUsers(usersPage);
    } catch (error) {
      console.error("Delete user error", error);
      window.alert(t("adminPanel.users.deleteError"));
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
      phone: formatPhoneDisplay(company.phone || ""),
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
    if (field === "phone") {
      nextValue = formatPhoneDisplay(value);
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
        phone: sanitizePhoneNumberInput(editingCompany.phone),
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
      window.alert(t("adminPanel.companies.saveError"));
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
        t("adminPanel.companies.deleteConfirm", { name: company.companyName }),
      )
    ) {
      return;
    }

    try {
      await companiesAPI.delete(company.id);
      await loadCompanies(companiesPage);
    } catch (error) {
      console.error("Delete company error", error);
      window.alert(t("adminPanel.companies.deleteError"));
    }
  };

  const renderUsersTab = () => (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">{t("adminPanel.tabs.users")}</h2>
        <input
          type="text"
          className="admin-input"
          placeholder={t("adminPanel.users.searchPlaceholder")}
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
        />
      </div>

      {usersError && (
        <div className="admin-alert admin-alert--error">{tx(usersError)}</div>
      )}

      <div className="admin-card">
        {usersLoading && users.length === 0 ? (
          <p>{t("adminPanel.users.loading")}</p>
        ) : users.length === 0 ? (
          <p>{t("adminPanel.users.empty")}</p>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("adminPanel.users.table.email")}</th>
                  <th>{t("adminPanel.users.table.name")}</th>
                  <th>{t("adminPanel.users.table.companyId")}</th>
                  <th>{t("adminPanel.users.table.accountType")}</th>
                  <th>{t("adminPanel.users.table.adminPermissions")}</th>
                  <th>{t("common.actions")}</th>
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
                    accountType = t("adminPanel.users.accountType.admin");
                  } else if (
                    roles.includes("Company") ||
                    roles.includes("CompanyOwner")
                  ) {
                    accountType = t("adminPanel.users.accountType.company");
                  } else {
                    accountType = t("adminPanel.users.accountType.user");
                  }
                  return (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>
                        {user.firstName} {user.lastName}
                      </td>
                      <td>{user.companyId ?? t("common.dash")}</td>
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
                                ? t("adminPanel.users.cantRevokeSelf")
                                : undefined
                            }
                          >
                            {t("adminPanel.users.revoke")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => handleGrantAdmin(user.id)}
                          >
                            {t("adminPanel.users.grant")}
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
                                ? t("adminPanel.users.cantDeleteSelf")
                                : t("adminPanel.users.deleteTitle")
                            }
                          >
                            {t("common.delete")}
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
                {t("common.previous")}
              </button>
              <span>
                {t("common.page")} {usersPage} {t("common.of")}{" "}
                {Math.max(1, Math.ceil(usersTotalCount / usersPageSize))}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => handleUsersPageChange(usersPage + 1)}
                disabled={usersPage * usersPageSize >= usersTotalCount}
              >
                {t("common.next")}
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
        <h2 className="admin-section__title">{t("adminPanel.tabs.companies")}</h2>
        <div className="admin-section__actions">
          <div className="admin-section__filters">
            <input
              type="text"
              className="admin-input"
              placeholder={t("adminPanel.companies.searchPlaceholder")}
              value={companyQuery}
              onChange={(e) => setCompanyQuery(e.target.value)}
            />
            <input
              type="text"
              className="admin-input"
              placeholder={t("common.city")}
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
            {t("adminPanel.companies.add")}
          </button>
        </div>
      </div>

      {companiesError && (
        <div className="admin-alert admin-alert--error">{tx(companiesError)}</div>
      )}

      <div className="admin-card">
        {companiesLoading && companies.length === 0 ? (
          <p>{t("adminPanel.companies.loading")}</p>
        ) : companies.length === 0 ? (
          <p>{t("adminPanel.companies.empty")}</p>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("adminPanel.companies.table.name")}</th>
                  <th>{t("adminPanel.companies.table.city")}</th>
                  <th>{t("adminPanel.companies.table.description")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.companyName}</td>
                    <td>{company.city || t("common.dash")}</td>
                    <td>{company.description || t("common.dash")}</td>
                    <td>
                      <div className="admin-user-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => handleOpenEditCompany(company)}
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs admin-table__delete-btn"
                          onClick={() => handleDeleteCompany(company)}
                        >
                          {t("common.delete")}
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
                {t("common.previous")}
              </button>
              <span>
                {t("common.page")} {companiesPage} {t("common.of")}{" "}
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
                {t("common.next")}
              </button>
            </div>
          </>
        )}
      </div>

      {companyFormVisible && editingCompany && (
        <div className="admin-card--form-container">
          <div className="admin-card admin-card--form">
            <div className="admin-form__header">
              <h2>
                {editingCompany.id == null
                  ? t("adminPanel.companies.form.titleCreate")
                  : t("adminPanel.companies.form.titleEdit")}
              </h2>
              <button type="button" className="btn-close" onClick={handleCloseCompanyForm} aria-label={t("common.close")} disabled={companyFormSubmitting} />
            </div>
            <form className="admin-form" onSubmit={handleCompanyFormSubmit}>
            <div className="admin-form__grid">
              <label className="admin-form__field">
                <span>{t("adminPanel.companies.form.companyName")}</span>
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
                <span>{t("adminPanel.companies.form.email")}</span>
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
                <span>{t("adminPanel.companies.form.phone")}</span>
                <input
                  type="tel"
                  className="admin-input"
                  value={editingCompany.phone}
                  onChange={(e) =>
                    handleCompanyFormChange("phone", e.target.value)
                  }
                  placeholder={t("adminPanel.companies.form.phonePlaceholder")}
                />
              </label>
              <label className="admin-form__field">
                <span>{t("adminPanel.companies.form.street")}</span>
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
                <span>{t("adminPanel.companies.form.buildingNumber")}</span>
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
                <span>{t("adminPanel.companies.form.apartmentOptional")}</span>
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
                <span>{t("common.city")}</span>
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
                <span>{t("adminPanel.companies.form.postalCode")}</span>
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
                  title={t("adminPanel.companies.form.postalCodeTitle")}
                />
              </label>
              <label className="admin-form__field">
                <span>{t("adminPanel.companies.form.country")}</span>
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
                <span>{t("adminPanel.companies.form.website")}</span>
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
                <span>{t("adminPanel.companies.form.description")}</span>
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
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={companyFormSubmitting}
              >
                {companyFormSubmitting ? t("common.saving") : t("common.save")}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1 className="admin-page__title">{t("adminPanel.title")}</h1>
        <p className="admin-page__subtitle">
          {t("adminPanel.subtitle")}
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
          {t("adminPanel.tabs.users")}
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
          {t("adminPanel.tabs.companies")}
        </button>
        {isSystemAdmin ? (
          <button
            type="button"
            className={
              activeTab === "templates"
                ? "admin-tab admin-tab--active"
                : "admin-tab"
            }
            onClick={() => setTab("templates")}
          >
            {t("adminPanel.tabs.templates")}
          </button>
        ) : null}
      </div>

      <section className="admin-page__content">
        {activeTab === "users"
          ? renderUsersTab()
          : activeTab === "companies"
            ? renderCompaniesTab()
            : renderTemplatesTab()}
      </section>
    </div>
  );
};

export default AdminPanel;
