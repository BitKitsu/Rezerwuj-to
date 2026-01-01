import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  tokenManager,
  companiesAPI,
  companyAuditAPI,
  appointmentsAPI,
  staffBreaksAPI,
  schedulesAPI,
  servicesAPI,
  branchesAPI,
  branchReviewsAPI,
  authAPI,
  companyUsersAPI,
} from "../services/api";
import "../admin.css"; // Reusing admin panel styles for consistency

const dayLabels = {
  0: "Niedziela",
  1: "Poniedziałek",
  2: "Wtorek",
  3: "Środa",
  4: "Czwartek",
  5: "Piątek",
  6: "Sobota",
};

const daysOrder = [1, 2, 3, 4, 5, 6, 0];
const allDays = [0, 1, 2, 3, 4, 5, 6];
const workdays = [1, 2, 3, 4, 5];

const normalizeDays = (days) => {
  const unique = Array.from(
    new Set((Array.isArray(days) ? days : []).map((d) => Number(d)).filter((d) => Number.isFinite(d) && d >= 0 && d <= 6)),
  );
  unique.sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));
  return unique;
};

const daysEqual = (a, b) => {
  const aa = normalizeDays(a);
  const bb = normalizeDays(b);
  if (aa.length !== bb.length) return false;
  return aa.every((x, i) => x === bb[i]);
};

const getDaysSummaryLabel = (days) => {
  const normalized = normalizeDays(days);
  if (daysEqual(normalized, allDays)) return "Wszystkie dni";
  if (daysEqual(normalized, workdays)) return "Dni robocze";
  if (normalized.length === 0) return "Wybierz dni";
  return normalized.map((d) => dayLabels[d] || d).join(", ");
};

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
  const raw = String(value || "");
  const plus = raw.trim().startsWith("+") ? "+" : "";
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  if (!plus && !digits) return "";
  return plus + digits;
};

const formatPhoneDisplay = (value) => {
  const sanitized = sanitizePhoneNumberInput(value);
  if (!sanitized) return "";
  const plus = sanitized.startsWith("+") ? "+" : "";
  const digits = sanitized.replace(/^\+/, "");
  if (!digits) return plus;

  const inferredCountryLen = digits.length > 9 ? Math.min(3, digits.length - 9) : Math.min(3, digits.length);
  const country = digits.slice(0, inferredCountryLen);
  const rest = digits.slice(inferredCountryLen);

  const groups = rest.match(/.{1,3}/g) || [];
  const grouped = groups.join("-");

  return plus + country + (grouped ? ` ${grouped}` : "");
};

const DaysChecklistDropdown = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const normalizedValue = normalizeDays(value);
  const label = getDaysSummaryLabel(normalizedValue);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  const setSelected = (days) => {
    onChange(normalizeDays(days));
  };

  const toggleDay = (day) => {
    const d = Number(day);
    const current = normalizeDays(normalizedValue);
    const next = current.includes(d) ? current.filter((x) => x !== d) : [...current, d];
    setSelected(next);
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="admin-input"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: "var(--admin-card-bg, #0b1020)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: 10,
            boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => {
                setSelected(allDays);
                setOpen(false);
              }}
              disabled={disabled}
            >
              Wszystkie dni
            </button>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => {
                setSelected(workdays);
                setOpen(false);
              }}
              disabled={disabled}
            >
              Dni robocze
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
            {daysOrder.map((day) => (
              <label
                key={day}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: disabled ? "default" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={normalizedValue.includes(day)}
                  onChange={() => toggleDay(day)}
                  disabled={disabled}
                />
                <span>{dayLabels[day]}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const CompanyPanel = () => {
  const [activeTab, setActiveTab] = useState("details");
  const [company, setCompany] = useState(null);
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchReviewSummaries, setBranchReviewSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [panelSuccess, setPanelSuccess] = useState("");

  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [appointmentsListPage, setAppointmentsListPage] = useState(1);
  const [appointmentEvents, setAppointmentEvents] = useState([]);
  const [appointmentEventsLoading, setAppointmentEventsLoading] = useState(false);
  const [appointmentEventsError, setAppointmentEventsError] = useState("");

  const [createAppointmentVisible, setCreateAppointmentVisible] = useState(false);
  const [createAppointmentSubmitting, setCreateAppointmentSubmitting] = useState(false);
  const [createAppointmentError, setCreateAppointmentError] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [availableSlotsLoading, setAvailableSlotsLoading] = useState(false);
  const [availableSlotsError, setAvailableSlotsError] = useState("");
  const [createAppointmentForm, setCreateAppointmentForm] = useState({
    serviceId: "",
    date: "",
    slotIndex: "",
    dateStart: "",
    dateEnd: "",
    customerEmail: "",
    customerPhone: "",
    staffId: "",
  });

  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState("");
  const [scheduleCreateVisible, setScheduleCreateVisible] = useState(false);
  const [scheduleCreateSubmitting, setScheduleCreateSubmitting] = useState(false);
  const [scheduleCreateError, setScheduleCreateError] = useState("");
  const [scheduleCreateForm, setScheduleCreateForm] = useState({
    branchId: "",
    serviceId: "",
    staffId: "",
    dayOfWeek: workdays,
    startTime: "09:00",
    endTime: "17:00",
  });

  const [companyAuditLogs, setCompanyAuditLogs] = useState([]);
  const [companyAuditLoading, setCompanyAuditLoading] = useState(false);
  const [companyAuditError, setCompanyAuditError] = useState("");

  const [companyAuditPageSize, setCompanyAuditPageSize] = useState(10);
  const [companyAuditPage, setCompanyAuditPage] = useState(1);

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

  const [staffBreaks, setStaffBreaks] = useState([]);
  const [staffBreaksLoading, setStaffBreaksLoading] = useState(false);
  const [staffBreaksError, setStaffBreaksError] = useState("");
  const [staffBreakFilters, setStaffBreakFilters] = useState({
    branchId: "",
    staffId: "",
    dayOfWeek: workdays,
  });
  const [staffBreakForm, setStaffBreakForm] = useState({
    startTime: "12:00",
    endTime: "13:00",
  });
  const [staffBreakFormError, setStaffBreakFormError] = useState("");
  const [staffBreakSubmitting, setStaffBreakSubmitting] = useState(false);

  const [staffBreaksPageSize, setStaffBreaksPageSize] = useState(10);
  const [staffBreaksPage, setStaffBreaksPage] = useState(1);
  const [staffBreaksSortKey, setStaffBreaksSortKey] = useState("staff");
  const [staffBreaksSortDir, setStaffBreaksSortDir] = useState("asc");

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

  const getHttpErrorMessage = (err, fallback) => {
    const msg =
      err?.response?.data?.message ||
      (typeof err?.response?.data === "string" ? err.response.data : "") ||
      (err?.response?.status ? `HTTP ${err.response.status}` : "") ||
      fallback;
    return String(msg);
  };

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
      allowedTabs.push("reservations", "schedules", "details", "branches", "services", "employees", "audit", "settings");
    } else if (canManageEmployees) {
      allowedTabs.push("reservations", "schedules", "branches", "services", "employees");
    } else if (canViewReservations) {
      allowedTabs.push("reservations");
    }

    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [activeTab, canEditCompany, canManageEmployees, canViewReservations]);

  const loadCompanyAppointments = useCallback(async () => {
    if (!companyId) return;

    setAppointmentsLoading(true);
    setAppointmentsError("");
    try {
      const res = await appointmentsAPI.getByCompany(companyId, 200);
      const items = Array.isArray(res.data) ? res.data : [];
      items.sort((a, b) => new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime());
      setAppointments(items);
      setSelectedAppointmentId((prev) => {
        if (prev && items.some((x) => x.id === prev)) return prev;
        return items.length > 0 ? items[0].id : null;
      });
    } catch (err) {
      console.error("Failed to load appointments", err);
      setAppointmentsError("Nie udało się załadować rezerwacji.");
      setAppointments([]);
      setSelectedAppointmentId(null);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [companyId]);

  const loadSchedules = useCallback(async () => {
    if (!companyId) return;
    setSchedulesLoading(true);
    setSchedulesError("");
    try {
      const res = await schedulesAPI.getByCompany(companyId);
      setSchedules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load schedules", err);
      setSchedulesError("Nie udało się załadować harmonogramów.");
      setSchedules([]);
    } finally {
      setSchedulesLoading(false);
    }
  }, [companyId]);

  const loadAppointmentEvents = useCallback(async (appointmentId) => {
    if (!appointmentId) {
      setAppointmentEvents([]);
      return;
    }

    setAppointmentEventsLoading(true);
    setAppointmentEventsError("");
    try {
      const res = await appointmentsAPI.getEvents(appointmentId, 200);
      const items = Array.isArray(res.data) ? res.data : [];
      items.sort((a, b) => (a.version ?? 0) - (b.version ?? 0));
      setAppointmentEvents(items);
    } catch (err) {
      console.error("Failed to load appointment events", err);
      setAppointmentEventsError("Nie udało się załadować historii zmian rezerwacji.");
      setAppointmentEvents([]);
    } finally {
      setAppointmentEventsLoading(false);
    }
  }, []);

  const loadStaffBreaks = useCallback(async () => {
    if (!companyId) return;
    setStaffBreaksLoading(true);
    setStaffBreaksError("");
    try {
      const res = await staffBreaksAPI.getByCompany(companyId, {});
      setStaffBreaks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load staff breaks", err);
      setStaffBreaks([]);
      setStaffBreaksError(getHttpErrorMessage(err, "Nie udało się załadować przerw."));
    } finally {
      setStaffBreaksLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!staffBreakFilters.branchId && branches.length > 0) {
      setStaffBreakFilters((prev) => ({ ...prev, branchId: String(branches[0].id) }));
    }
  }, [branches, staffBreakFilters.branchId]);

  useEffect(() => {
    if (!staffBreakFilters.staffId && employees.length > 0) {
      setStaffBreakFilters((prev) => ({ ...prev, staffId: String(employees[0].id) }));
    }
  }, [employees, staffBreakFilters.staffId]);

  useEffect(() => {
    if (activeTab !== "employees" || !canManageEmployees) return;
    loadSchedules();
    loadStaffBreaks();
  }, [activeTab, canManageEmployees, loadSchedules, loadStaffBreaks]);

  const handleStaffBreakFilterChange = (e) => {
    const { name, value } = e.target;
    setStaffBreakFilters((prev) => ({ ...prev, [name]: value }));
    setStaffBreakFormError("");
  };

  const handleStaffBreakFormChange = (e) => {
    const { name, value } = e.target;
    setStaffBreakForm((prev) => ({ ...prev, [name]: value }));
    setStaffBreakFormError("");
  };

  const handleCreateStaffBreak = async (e) => {
    e.preventDefault();
    setStaffBreakFormError("");
    setStaffBreakSubmitting(true);
    try {
      if (!companyId) {
        setStaffBreakFormError("Brak CompanyId.");
        return;
      }
      const branchId = Number(staffBreakFilters.branchId);
      if (!branchId) {
        setStaffBreakFormError("Wybierz oddział.");
        return;
      }
      const staffId = String(staffBreakFilters.staffId || "").trim();
      if (!staffId) {
        setStaffBreakFormError("Wybierz pracownika.");
        return;
      }

      const dayValuesRaw = Array.isArray(staffBreakFilters.dayOfWeek) ? staffBreakFilters.dayOfWeek : [];
      const daysToCreate = Array.from(
        new Set(dayValuesRaw.map((d) => Number(d)).filter((d) => Number.isFinite(d) && d >= 0 && d <= 6)),
      );
      if (daysToCreate.length === 0) {
        setStaffBreakFormError("Wybierz dzień tygodnia.");
        return;
      }

      const startTime = String(staffBreakForm.startTime || "").trim();
      const endTime = String(staffBreakForm.endTime || "").trim();
      if (!startTime || !endTime) {
        setStaffBreakFormError("Podaj start i koniec przerwy.");
        return;
      }
      if (endTime <= startTime) {
        setStaffBreakFormError("Koniec przerwy musi być później niż start.");
        return;
      }

      const startMin = parseTimeToMinutes(startTime);
      const endMin = parseTimeToMinutes(endTime);
      if (startMin === null || endMin === null) {
        setStaffBreakFormError("Niepoprawny format godziny.");
        return;
      }

      const selectedBranch = branches.find((b) => String(b.id) === String(branchId));
      const openRaw = selectedBranch?.openingHour || company?.openingHour;
      const closeRaw = selectedBranch?.closingHour || company?.closingHour;
      const openMin = parseTimeToMinutes(openRaw);
      const closeMin = parseTimeToMinutes(closeRaw);
      const hasOpenHours = openMin !== null && closeMin !== null && closeMin > openMin;

      if (hasOpenHours && (startMin < openMin || endMin > closeMin)) {
        setStaffBreakFormError(
          `Przerwa musi mieścić się w godzinach otwarcia (${openRaw} - ${closeRaw}).`,
        );
        return;
      }

      const schedulesList = Array.isArray(schedules) ? schedules : [];

      for (const d of daysToCreate) {
        const daySchedules = schedulesList.filter((s) =>
          Number(s?.branchId) === Number(branchId)
          && String(s?.staffId || "") === String(staffId)
          && Number(s?.dayOfWeek) === Number(d)
          && Boolean(s?.isActive),
        );

        if (daySchedules.length === 0) {
          setStaffBreakFormError(
            `Brak harmonogramu dla pracownika w ${dayLabels[d] || d}. Najpierw dodaj harmonogram.`,
          );
          return;
        }

        let minStart = Infinity;
        let maxEnd = -Infinity;
        let ok = false;
        for (const s of daySchedules) {
          const sStart = parseTimeToMinutes(String(s?.startTime || ""));
          const sEnd = parseTimeToMinutes(String(s?.endTime || ""));
          if (sStart === null || sEnd === null) continue;
          minStart = Math.min(minStart, sStart);
          maxEnd = Math.max(maxEnd, sEnd);
          let allowedStart = sStart;
          let allowedEnd = sEnd;
          if (hasOpenHours) {
            allowedStart = Math.max(allowedStart, openMin);
            allowedEnd = Math.min(allowedEnd, closeMin);
          }
          if (allowedEnd <= allowedStart) continue;
          if (startMin >= allowedStart && endMin <= allowedEnd) {
            ok = true;
            break;
          }
        }

        if (!ok) {
          const effStart = hasOpenHours ? Math.max(minStart, openMin) : minStart;
          const effEnd = hasOpenHours ? Math.min(maxEnd, closeMin) : maxEnd;
          setStaffBreakFormError(
            `Przerwa musi mieścić się w godzinach pracy (${minutesToTime(effStart)} - ${minutesToTime(effEnd)}) dla ${dayLabels[d] || d}.`,
          );
          return;
        }
      }

      await Promise.all(
        daysToCreate.map((d) =>
          staffBreaksAPI.create({
            companyId,
            branchId,
            staffId,
            dayOfWeek: d,
            startTime,
            endTime,
          }),
        ),
      );

      await loadStaffBreaks();
    } catch (err) {
      console.error("Failed to create staff break", err);
      setStaffBreakFormError(getHttpErrorMessage(err, "Nie udało się dodać przerwy."));
    } finally {
      setStaffBreakSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    if (!schedule?.id) return;
    if (!window.confirm("Usunąć ten harmonogram na stałe?")) return;
    try {
      await schedulesAPI.delete(schedule.id);
      setPanelSuccess("Harmonogram usunięty.");
      await loadSchedules();
    } catch (err) {
      console.error("Failed to delete schedule", err);
      alert(err.response?.data?.message || "Nie udało się usunąć harmonogramu.");
    }
  };

  const handleToggleStaffBreak = async (b) => {
    if (!b?.id) return;
    try {
      await staffBreaksAPI.update(b.id, {
        dayOfWeek: b.dayOfWeek,
        startTime: String(b.startTime),
        endTime: String(b.endTime),
        isActive: !b.isActive,
      });
      await loadStaffBreaks();
    } catch (err) {
      console.error("Failed to toggle staff break", err);
      alert(getHttpErrorMessage(err, "Nie udało się zmienić statusu przerwy."));
    }
  };

  const handleDeleteStaffBreak = async (b) => {
    if (!b?.id) return;
    if (!window.confirm("Usunąć tę przerwę?")) return;
    try {
      await staffBreaksAPI.delete(b.id);
      await loadStaffBreaks();
    } catch (err) {
      console.error("Failed to delete staff break", err);
      alert(getHttpErrorMessage(err, "Nie udało się usunąć przerwy."));
    }
  };

  useEffect(() => {
    if (activeTab === "reservations" && canViewReservations) {
      loadCompanyAppointments();
    }
    if (activeTab === "schedules" && canManageCompanyCatalog) {
      loadSchedules();
    }
  }, [activeTab, canManageCompanyCatalog, canViewReservations, loadCompanyAppointments, loadSchedules]);

  useEffect(() => {
    if (activeTab !== "reservations" || !canViewReservations) return;
    loadAppointmentEvents(selectedAppointmentId);
  }, [activeTab, canViewReservations, loadAppointmentEvents, selectedAppointmentId]);

  useEffect(() => {
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil((appointments?.length || 0) / pageSize));
    setAppointmentsListPage((prev) => Math.min(Math.max(1, prev), totalPages));
  }, [appointments.length]);

  const selectedAppointment = appointments.find((a) => a.id === selectedAppointmentId) || null;

  const employeeOptions = Array.isArray(employees) ? employees : [];
  const formatEmployeeLabel = (u) => {
    if (!u) return "—";
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    if (name) {
      return name;
    }
    return u.id || "—";
  };

  const formatEmployeeShortLabel = (u) => {
    if (!u) return "—";
    const first = (u.firstName || "").trim();
    const last = (u.lastName || "").trim();
    if (first || last) {
      return `${first} ${last}`.trim();
    }
    return u.id || "—";
  };

  const employeeHasId = (id) => employeeOptions.some((u) => u.id === id);

  const getEmployeeLabelById = (id) => {
    if (!id) return "—";
    const match = employeeOptions.find((u) => u.id === id);
    return match ? formatEmployeeLabel(match) : id;
  };

  const getEmployeeShortLabelById = (id) => {
    if (!id) return "—";
    const match = employeeOptions.find((u) => u.id === id);
    return match ? formatEmployeeShortLabel(match) : id;
  };

  const staffBreakItems = Array.isArray(staffBreaks) ? staffBreaks : [];

  const getStaffBreakBranchName = (branchId) => {
    const match = branches.find((b) => String(b.id) === String(branchId));
    return String(match?.branchName || branchId || "");
  };

  const getStaffBreakStaffName = (staffId) => {
    const match = employeeOptions.find((u) => String(u.id) === String(staffId));
    return String(formatEmployeeShortLabel(match) || staffId || "");
  };

  const getStaffBreakSortValue = (b, key) => {
    if (!b) return "";
    if (key === "branch") return getStaffBreakBranchName(b.branchId);
    if (key === "staff") return getStaffBreakStaffName(b.staffId);
    if (key === "day") return Number(b.dayOfWeek) || 0;
    if (key === "start") return String(b.startTime || "").slice(0, 5);
    if (key === "end") return String(b.endTime || "").slice(0, 5);
    if (key === "status") return b.isActive ? 1 : 0;
    return "";
  };

  const staffBreaksSorted = [...staffBreakItems].sort((a, b) => {
    const dir = staffBreaksSortDir === "desc" ? -1 : 1;
    const av = getStaffBreakSortValue(a, staffBreaksSortKey);
    const bv = getStaffBreakSortValue(b, staffBreaksSortKey);

    if (typeof av === "number" && typeof bv === "number") {
      return (av - bv) * dir;
    }
    return String(av).localeCompare(String(bv), "pl", { sensitivity: "base" }) * dir;
  });

  const staffBreaksPageCount = Math.max(1, Math.ceil(staffBreaksSorted.length / staffBreaksPageSize));
  const staffBreaksCurrentPage = Math.min(staffBreaksPage, staffBreaksPageCount);
  const staffBreaksStart = (staffBreaksCurrentPage - 1) * staffBreaksPageSize;
  const visibleStaffBreaks = staffBreaksSorted.slice(staffBreaksStart, staffBreaksStart + staffBreaksPageSize);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((staffBreaks?.length || 0) / staffBreaksPageSize));
    setStaffBreaksPage((prev) => Math.min(Math.max(1, prev), totalPages));
  }, [staffBreaks.length, staffBreaksPageSize]);

  const handleStaffBreaksPageSizeChange = (e) => {
    setStaffBreaksPageSize(Number(e.target.value));
    setStaffBreaksPage(1);
  };

  const handleStaffBreaksSort = (key) => {
    setStaffBreaksPage(1);
    setStaffBreaksSortKey((prevKey) => {
      if (prevKey === key) {
        setStaffBreaksSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setStaffBreaksSortDir("asc");
      return key;
    });
  };

  const getStaffBreaksHeaderLabel = (label, key) => {
    if (staffBreaksSortKey !== key) return label;
    return `${label} ${staffBreaksSortDir === "asc" ? "↑" : "↓"}`;
  };

  const filteredAvailableSlots = (Array.isArray(availableSlots) ? availableSlots : []).filter((slot) => {
    const staffId = (createAppointmentForm.staffId || "").trim();
    if (!staffId) return true;
    return String(slot?.staffId || "") === staffId;
  });

  const parseTimeToMinutes = (timeValue) => {
    if (!timeValue || typeof timeValue !== "string") return null;
    const parts = timeValue.split(":");
    if (parts.length < 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };

  const minutesToTime = (minutes) => {
    if (!Number.isFinite(minutes)) return "";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}`;
  };

  const toDateTimeLocalValue = (isoValue) => {
    if (!isoValue) return "";
    const d = new Date(isoValue);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const fromDateTimeLocalValue = (localValue) => {
    if (!localValue) return "";
    const d = new Date(localValue);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  };

  const getScheduleHoursLabel = (s) => {
    if (!s) return "—";
    const start = String(s.startTime);
    const end = String(s.endTime);
    const open = s.branch?.openingHour;
    const close = s.branch?.closingHour;

    const openMin = parseTimeToMinutes(open);
    const closeMin = parseTimeToMinutes(close);
    const startMin = parseTimeToMinutes(start);
    const endMin = parseTimeToMinutes(end);

    if (openMin !== null && closeMin !== null && startMin !== null && endMin !== null) {
      if (startMin < openMin || endMin > closeMin) {
        return `${start} - ${end} (poza godzinami oddziału ${open} - ${close})`;
      }
    }

    return `${start} - ${end}`;
  };

  const openCreateSchedule = () => {
    if (branches.length === 0 || services.length === 0) {
      setSchedulesError(
        branches.length === 0 && services.length === 0
          ? "Brak oddziałów i usług. Dodaj je najpierw w zakładkach Oddziały i Usługi."
          : branches.length === 0
            ? "Brak oddziałów. Dodaj oddział w zakładce Oddziały."
            : "Brak usług. Dodaj usługę w zakładce Usługi."
      );
      return;
    }

    if (employeeOptions.length === 0 && !currentUserId) {
      setSchedulesError("Brak pracowników. Dodaj pracownika w zakładce Pracownicy.");
      return;
    }

    const defaultBranchId = branches.length > 0 ? String(branches[0].id) : "";
    const defaultService = services.find((s) => String(s.branchId) === defaultBranchId) || services[0];
    const defaultServiceId = defaultService ? String(defaultService.id) : "";
    const defaultStaffId = currentUserId || employeeOptions[0]?.id || "";
    setScheduleCreateError("");
    setScheduleCreateForm({
      branchId: defaultBranchId,
      serviceId: defaultServiceId,
      staffId: defaultStaffId,
      dayOfWeek: workdays,
      startTime: "09:00",
      endTime: "17:00",
    });
    setScheduleCreateVisible(true);
  };

  const closeCreateSchedule = () => {
    setScheduleCreateVisible(false);
  };

  const handleScheduleCreateChange = (e) => {
    const { name, value } = e.target;
    setScheduleCreateForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "branchId") {
        const svc = services.find((s) => String(s.branchId) === String(value));
        next.serviceId = svc ? String(svc.id) : "";

        const b = branches.find((x) => String(x.id) === String(value));
        if (b?.openingHour && b?.closingHour) {
          next.startTime = b.openingHour;
          next.endTime = b.closingHour;
        }
      }
      return next;
    });
  };

  const handleScheduleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!companyId) return;

    setScheduleCreateSubmitting(true);
    setScheduleCreateError("");
    try {
      const staffId = (scheduleCreateForm.staffId || "").trim();

      const dayValuesRaw = Array.isArray(scheduleCreateForm.dayOfWeek) ? scheduleCreateForm.dayOfWeek : [];
      const daysToCreate = Array.from(
        new Set(dayValuesRaw.map((d) => Number(d)).filter((d) => Number.isFinite(d) && d >= 0 && d <= 6)),
      );
      if (daysToCreate.length === 0) {
        setScheduleCreateError("Wybierz dzień tygodnia.");
        return;
      }

      const payloadBase = {
        companyId,
        branchId: Number(scheduleCreateForm.branchId),
        serviceId: Number(scheduleCreateForm.serviceId),
        staffId,
        startTime: scheduleCreateForm.startTime,
        endTime: scheduleCreateForm.endTime,
      };

      if (!payloadBase.branchId || !payloadBase.serviceId) {
        setScheduleCreateError("Wybierz oddział i usługę.");
        return;
      }

      if (!payloadBase.startTime || !payloadBase.endTime || payloadBase.endTime <= payloadBase.startTime) {
        setScheduleCreateError("Nieprawidłowe godziny (koniec musi być później niż start).");
        return;
      }

      const selectedBranch = branches.find((b) => String(b.id) === String(payloadBase.branchId));
      const branchOpen = selectedBranch?.openingHour;
      const branchClose = selectedBranch?.closingHour;
      const openMin = parseTimeToMinutes(branchOpen);
      const closeMin = parseTimeToMinutes(branchClose);
      const startMin = parseTimeToMinutes(payloadBase.startTime);
      const endMin = parseTimeToMinutes(payloadBase.endTime);

      if (openMin !== null && closeMin !== null && startMin !== null && endMin !== null) {
        if (startMin < openMin || endMin > closeMin) {
          setScheduleCreateError(
            `Harmonogram musi mieścić się w godzinach otwarcia oddziału (${branchOpen} - ${branchClose}).`
          );
          return;
        }
      }

      if (!payloadBase.staffId) {
        setScheduleCreateError("Wybierz pracownika.");
        return;
      }

      for (const d of daysToCreate) {
        try {
          await schedulesAPI.create({
            ...payloadBase,
            dayOfWeek: d,
          });
        } catch (err) {
          const msg =
            err?.response?.data?.message ||
            (typeof err?.response?.data === "string" ? err.response.data : "") ||
            String(err?.response?.data || "Nie udało się dodać harmonogramu.");
          setScheduleCreateError(`Nie udało się dodać harmonogramu dla ${dayLabels[d] || d}. ${msg}`);
          return;
        }
      }
      setPanelSuccess("Harmonogram dodany.");
      setScheduleCreateVisible(false);
      await loadSchedules();
    } catch (err) {
      console.error("Failed to create schedule", err);
      setScheduleCreateError(err.response?.data?.message || String(err.response?.data || "Nie udało się dodać harmonogramu."));
    } finally {
      setScheduleCreateSubmitting(false);
    }
  };

  const handleDeactivateSchedule = async (scheduleId) => {
    if (!window.confirm("Wyłączyć ten harmonogram?")) return;
    try {
      await schedulesAPI.delete(scheduleId);
      setPanelSuccess("Harmonogram wyłączony.");
      await loadSchedules();
    } catch (err) {
      console.error("Failed to delete schedule", err);
      alert(err.response?.data?.message || "Nie udało się wyłączyć harmonogramu.");
    }
  };

  const handleToggleSchedule = async (schedule) => {
    if (!schedule) return;
    const nextIsActive = !schedule.isActive;
    const confirmText = nextIsActive ? "Włączyć ten harmonogram?" : "Wyłączyć ten harmonogram?";
    if (!window.confirm(confirmText)) return;

    try {
      await schedulesAPI.update(schedule.id, {
        dayOfWeek: schedule.dayOfWeek,
        startTime: String(schedule.startTime),
        endTime: String(schedule.endTime),
        isActive: nextIsActive,
      });

      setPanelSuccess(nextIsActive ? "Harmonogram włączony." : "Harmonogram wyłączony.");
      await loadSchedules();
    } catch (err) {
      console.error("Failed to toggle schedule", err);
      alert(err.response?.data?.message || "Nie udało się zmienić statusu harmonogramu.");
    }
  };

  const openCreateAppointment = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const defaultDate = `${yyyy}-${mm}-${dd}`;

    const defaultServiceId = services.length > 0 ? String(services[0].id) : "";
    const defaultStaffId = currentUserId || employeeOptions[0]?.id || "";

    setCreateAppointmentError("");
    setAvailableSlots([]);
    setAvailableSlotsError("");
    setCreateAppointmentForm({
      serviceId: defaultServiceId,
      date: defaultDate,
      slotIndex: "",
      dateStart: "",
      dateEnd: "",
      customerEmail: "",
      customerPhone: "",
      staffId: defaultStaffId,
    });
    setCreateAppointmentVisible(true);
  };

  const closeCreateAppointment = () => {
    setCreateAppointmentVisible(false);
  };

  const handleCreateAppointmentFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "staffId") {
      setCreateAppointmentForm((prev) => ({
        ...prev,
        staffId: value,
        slotIndex: "",
        dateStart: "",
        dateEnd: "",
      }));
      return;
    }
    if (name === "customerPhone") {
      setCreateAppointmentForm((prev) => ({ ...prev, [name]: formatPhoneDisplay(value) }));
      return;
    }
    setCreateAppointmentForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const serviceId = Number(createAppointmentForm.serviceId);
    const date = createAppointmentForm.date;

    if (!createAppointmentVisible || !serviceId || !date) {
      return;
    }

    setCreateAppointmentForm((prev) => ({
      ...prev,
      slotIndex: "",
      dateStart: "",
      dateEnd: "",
    }));

    let cancelled = false;
    const load = async () => {
      setAvailableSlotsLoading(true);
      setAvailableSlotsError("");
      try {
        const res = await appointmentsAPI.getAvailableSlots(serviceId, date);
        const items = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) {
          setAvailableSlots(items);
        }
      } catch (err) {
        console.error("Failed to load available slots", err);
        if (!cancelled) {
          setAvailableSlots([]);
          const msg =
            err?.response?.data?.message ||
            (typeof err?.response?.data === "string" ? err.response.data : "") ||
            (err?.response?.status ? `HTTP ${err.response.status}` : "") ||
            "Nie udało się załadować dostępnych slotów.";
          setAvailableSlotsError(String(msg));
        }
      } finally {
        if (!cancelled) {
          setAvailableSlotsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [createAppointmentForm.date, createAppointmentForm.serviceId, createAppointmentVisible]);

  useEffect(() => {
    if (!createAppointmentVisible) return;

    const idx = createAppointmentForm.slotIndex;
    if (idx === "") return;

    const slot = filteredAvailableSlots[Number(idx)];
    if (!slot) return;

    setCreateAppointmentForm((prev) => ({
      ...prev,
      dateStart: slot.start || "",
      dateEnd: slot.end || "",
      staffId: slot.staffId || prev.staffId,
    }));
  }, [filteredAvailableSlots, createAppointmentForm.slotIndex, createAppointmentVisible]);

  useEffect(() => {
    if (!createAppointmentVisible) return;

    const serviceId = Number(createAppointmentForm.serviceId);
    if (!serviceId) return;

    const svc = services.find((s) => Number(s.id) === serviceId);
    if (!svc || !svc.durationMinutes) return;

    const startIso = createAppointmentForm.dateStart;
    if (!startIso) return;

    const start = new Date(startIso);
    if (Number.isNaN(start.getTime())) return;

    const end = new Date(start.getTime() + Number(svc.durationMinutes) * 60000);
    const endIso = end.toISOString();

    if (createAppointmentForm.dateEnd !== endIso) {
      setCreateAppointmentForm((prev) => ({ ...prev, dateEnd: endIso }));
    }
  }, [createAppointmentForm.dateStart, createAppointmentForm.serviceId, createAppointmentVisible, services]);

  const handleCreateAppointmentSubmit = async (e) => {
    e.preventDefault();
    setCreateAppointmentSubmitting(true);
    setCreateAppointmentError("");

    try {
      const serviceId = Number(createAppointmentForm.serviceId);
      if (!serviceId) {
        setCreateAppointmentError("Wybierz usługę.");
        return;
      }

      const staffId = (createAppointmentForm.staffId || "").trim();
      if (!staffId) {
        setCreateAppointmentError("Wybierz pracownika.");
        return;
      }

      const sanitizePhone = (value) => String(value || "").replace(/[^0-9+]/g, "");
      const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
      const isValidPhone = (value) => {
        const v = sanitizePhoneNumberInput(value);
        if (!v) return false;
        return /^\+\d{1,3}(\s?\d{3}){3}$/.test(v);
      };

      const email = String(createAppointmentForm.customerEmail || "").trim();
      const phone = sanitizePhoneNumberInput(createAppointmentForm.customerPhone || "");

      const hasEmail = Boolean(email);
      const hasPhone = Boolean(phone);

      if (!hasEmail && !hasPhone) {
        setCreateAppointmentError("Email lub telefon klienta jest wymagany.");
        return;
      }

      if (hasEmail && !isValidEmail(email)) {
        setCreateAppointmentError("Nieprawidłowy email klienta.");
        return;
      }

      if (hasPhone && !isValidPhone(phone)) {
        setCreateAppointmentError("Nieprawidłowy telefon klienta.");
        return;
      }

      const customerId = hasEmail ? email : phone;

      const dateStart = createAppointmentForm.dateStart;
      const dateEnd = createAppointmentForm.dateEnd;
      if (!dateStart) {
        setCreateAppointmentError("Wybierz dostępny slot.");
        return;
      }

      const res = await appointmentsAPI.create({
        serviceId,
        staffId,
        customerId,
        dateStart,
        dateEnd,
      });

      const createdId = res?.data?.id;
      setPanelSuccess("Rezerwacja została utworzona.");
      setCreateAppointmentVisible(false);
      await loadCompanyAppointments();
      if (createdId) {
        setSelectedAppointmentId(createdId);
        await loadAppointmentEvents(createdId);
      }
    } catch (err) {
      console.error("Failed to create appointment", err);
      setCreateAppointmentError(err.response?.data || err.response?.data?.message || "Nie udało się utworzyć rezerwacji.");
    } finally {
      setCreateAppointmentSubmitting(false);
    }
  };

  const handleConfirmSelectedAppointment = async () => {
    if (!selectedAppointmentId) return;
    try {
      await appointmentsAPI.confirm(selectedAppointmentId);
      setPanelSuccess("Rezerwacja potwierdzona.");
      await loadCompanyAppointments();
      await loadAppointmentEvents(selectedAppointmentId);
    } catch (err) {
      console.error("Failed to confirm appointment", err);
      alert(err.response?.data?.message || "Nie udało się potwierdzić rezerwacji.");
    }
  };

  const handleCancelSelectedAppointment = async () => {
    if (!selectedAppointmentId) return;
    if (!window.confirm("Na pewno anulować rezerwację?")) return;
    try {
      await appointmentsAPI.cancel(selectedAppointmentId);
      setPanelSuccess("Rezerwacja anulowana.");
      await loadCompanyAppointments();
      await loadAppointmentEvents(selectedAppointmentId);
    } catch (err) {
      console.error("Failed to cancel appointment", err);
      alert(err.response?.data?.message || "Nie udało się anulować rezerwacji.");
    }
  };

  const handleDeleteSelectedAppointment = async () => {
    if (!selectedAppointmentId) return;
    if (!window.confirm("Usunąć rezerwację? (operacja nieodwracalna)")) return;
    try {
      await appointmentsAPI.delete(selectedAppointmentId);
      setPanelSuccess("Rezerwacja usunięta.");
      await loadCompanyAppointments();
      setAppointmentEvents([]);
    } catch (err) {
      console.error("Failed to delete appointment", err);
      alert(err.response?.data?.message || "Nie udało się usunąć rezerwacji.");
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatAppointmentLabel = (appointment) => {
    if (!appointment) return "";

    const parts = [];
    if (appointment.service?.serviceName) parts.push(appointment.service.serviceName);
    if (appointment.branch?.branchName) parts.push(appointment.branch.branchName);
    if (appointment.dateStart) parts.push(formatDateTime(appointment.dateStart));

    return parts.join(" | ");
  };

  const formatEventLabel = (evt) => {
    if (!evt) return "—";
    const type = evt.eventType || "";
    if (type === "AppointmentCreatedEvent") return "Utworzono";
    if (type === "AppointmentConfirmedEvent") return "Potwierdzono";
    if (type === "AppointmentCancelledEvent") return "Anulowano";
    if (type === "AppointmentRescheduledEvent") return "Zmieniono termin";
    if (type === "AppointmentDeletedEvent") return "Usunięto";
    return type;
  };

  const tryParseJson = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const formatEventDetails = (evt) => {
    const payload = tryParseJson(evt?.eventData);
    if (!payload) return "—";

    if (evt?.eventType === "AppointmentCreatedEvent") {
      const start = payload.dateStart || payload.DateStart;
      const end = payload.dateEnd || payload.DateEnd;
      const staffId = payload.staffId || payload.StaffId;
      const customerId = payload.customerId || payload.CustomerId;
      const staffLabel = staffId ? getEmployeeShortLabelById(String(staffId)) : "";
      return [
        start ? `Start: ${formatDateTime(start)}` : null,
        end ? `Koniec: ${formatDateTime(end)}` : null,
        staffId ? `Pracownik: ${staffLabel || staffId}` : null,
        customerId ? `Klient: ${customerId}` : null,
      ].filter(Boolean).join(" | ") || "—";
    }

    if (evt?.eventType === "AppointmentRescheduledEvent") {
      const oldStart = payload.oldDateStart || payload.OldDateStart;
      const newStart = payload.newDateStart || payload.NewDateStart;
      return [
        oldStart ? `Stary termin: ${formatDateTime(oldStart)}` : null,
        newStart ? `Nowy termin: ${formatDateTime(newStart)}` : null,
      ].filter(Boolean).join(" | ") || "—";
    }

    if (evt?.eventType === "AppointmentCancelledEvent") {
      return payload.reason || payload.Reason || "—";
    }

    return "—";
  };

  const renderReservationsTab = () => (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">Rezerwacje</h2>
        <div className="admin-section__actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateAppointment}
            disabled={appointmentsLoading || services.length === 0}
          >
            Dodaj rezerwację
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={loadCompanyAppointments}
            disabled={appointmentsLoading}
          >
            Odśwież
          </button>
        </div>
      </div>

      {appointmentsError ? (
        <div className="admin-alert admin-alert--error">{appointmentsError}</div>
      ) : null}

      {branches.length === 0 ? (
        <div className="admin-alert admin-alert--error" style={{ marginBottom: 12 }}>
          Brak oddziałów. Dodaj oddział w zakładce Oddziały.
        </div>
      ) : null}

      {services.length === 0 ? (
        <div className="admin-alert admin-alert--error" style={{ marginBottom: 12 }}>
          Brak usług. Dodaj usługę w zakładce Usługi.
        </div>
      ) : null}

      {canManageCompanyCatalog ? (
        <div className="admin-alert admin-alert--info" style={{ marginBottom: 12 }}>
          Jeśli nie widzisz dostępnych slotów w modalu dodawania rezerwacji, sprawdź zakładkę Harmonogram.
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => setActiveTab("schedules")}
            >
              Przejdź do Harmonogramu
            </button>
          </div>
        </div>
      ) : null}

      <div className="admin-card" style={{ padding: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 1fr) minmax(360px, 2fr)",
            gap: 16,
            padding: 16,
          }}
        >
          <div>
            <h4 style={{ marginTop: 0 }}>Wizyty</h4>
            {appointmentsLoading ? (
              <p>Ładowanie...</p>
            ) : appointments.length === 0 ? (
              <p>Brak rezerwacji.</p>
            ) : (
              <div>
                {(() => {
                  const pageSize = 10;
                  const totalPages = Math.max(1, Math.ceil(appointments.length / pageSize));
                  const safePage = Math.min(Math.max(1, appointmentsListPage), totalPages);
                  const startIndex = (safePage - 1) * pageSize;
                  const pageItems = appointments.slice(startIndex, startIndex + pageSize);

                  return (
                    <>
                <select
                  className="admin-input"
                  value={selectedAppointmentId ?? ""}
                  onChange={(e) => setSelectedAppointmentId(Number(e.target.value))}
                >
                  {appointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {formatAppointmentLabel(a)}
                    </option>
                  ))}
                </select>

                <div style={{ marginTop: 12 }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Usługa</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((a) => (
                        <tr
                          key={a.id}
                          style={{
                            cursor: "pointer",
                            background:
                              a.id === selectedAppointmentId ? "rgba(59,130,246,0.08)" : undefined,
                          }}
                          onClick={() => setSelectedAppointmentId(a.id)}
                        >
                          <td>{formatDateTime(a.dateStart)}</td>
                          <td>{a.service?.serviceName || "—"}</td>
                          <td>{a.status || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
                    <span className="admin-muted">
                      Strona {safePage} / {totalPages}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => setAppointmentsListPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                      >
                        Poprzednia
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => setAppointmentsListPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                      >
                        Następna
                      </button>
                    </div>
                  </div>
                </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h4 style={{ marginTop: 0, marginBottom: 0 }}>Timeline</h4>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleConfirmSelectedAppointment}
                  disabled={!selectedAppointmentId || selectedAppointment?.status === "confirmed"}
                >
                  Potwierdź
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCancelSelectedAppointment}
                  disabled={!selectedAppointmentId || selectedAppointment?.status === "cancelled"}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleDeleteSelectedAppointment}
                  disabled={!selectedAppointmentId}
                >
                  Usuń
                </button>
              </div>
            </div>
            {appointmentEventsError ? (
              <div className="admin-alert admin-alert--error">{appointmentEventsError}</div>
            ) : null}

            {!selectedAppointmentId ? (
              <p>Wybierz rezerwację, aby zobaczyć historię zdarzeń.</p>
            ) : appointmentEventsLoading ? (
              <p>Ładowanie...</p>
            ) : appointmentEvents.length === 0 ? (
              <p>Brak zdarzeń dla tej rezerwacji.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Wersja</th>
                    <th>Data</th>
                    <th>Zdarzenie</th>
                    <th>Szczegóły</th>
                  </tr>
                </thead>
                <tbody>
                  {appointmentEvents.map((evt) => (
                    <tr key={evt.eventId || `${evt.occurredAt}-${evt.version}`}>
                      <td>{evt.version ?? "—"}</td>
                      <td>{formatDateTime(evt.occurredAt)}</td>
                      <td>{formatEventLabel(evt)}</td>
                      <td
                        style={{
                          maxWidth: 520,
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                        }}
                        title={formatEventDetails(evt)}
                      >
                        {formatEventDetails(evt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

    </section>
  );

  const renderSchedulesTab = () => (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">Harmonogram</h2>
        <div className="admin-section__actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={loadSchedules}
            disabled={schedulesLoading}
          >
            Odśwież
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateSchedule}
            disabled={branches.length === 0 || services.length === 0}
          >
            Dodaj harmonogram
          </button>
        </div>
      </div>

      {branches.length === 0 || services.length === 0 ? (
        <div className="admin-alert admin-alert--error" style={{ marginBottom: 12 }}>
          {branches.length === 0 && services.length === 0
            ? "Brak oddziałów i usług. Dodaj je najpierw w zakładkach Oddziały i Usługi."
            : branches.length === 0
              ? "Brak oddziałów. Dodaj oddział w zakładce Oddziały."
              : "Brak usług. Dodaj usługę w zakładce Usługi."}
        </div>
      ) : null}

      {schedulesError ? (
        <div className="admin-alert admin-alert--error">{schedulesError}</div>
      ) : null}

      <div className="admin-card">
        {schedulesLoading ? (
          <p>Ładowanie...</p>
        ) : schedules.length === 0 ? (
          <p>
            Brak harmonogramu. Dodaj harmonogram dla usługi i dnia tygodnia, aby pojawiły się sloty.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Dzień</th>
                <th>Oddział</th>
                <th>Usługa</th>
                <th>Pracownik</th>
                <th>Godziny</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td>{dayLabels[s.dayOfWeek] || s.dayOfWeek}</td>
                  <td>{s.branch?.branchName || s.branchId}</td>
                  <td>{s.service?.serviceName || s.serviceId}</td>
                  <td>{getEmployeeLabelById(s.staffId)}</td>
                  <td>
                    {getScheduleHoursLabel(s)}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => handleToggleSchedule(s)}
                      >
                        {s.isActive ? "Wyłącz" : "Włącz"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs admin-table__delete-btn"
                        onClick={() => handleDeleteSchedule(s)}
                      >
                        Usuń
                      </button>
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

  const renderCreateScheduleForm = () => (
    <div className="admin-card--form-container">
      <div className="admin-card admin-card--form">
        <div className="admin-form__header">
          <h2>Dodaj harmonogram (MVP)</h2>
          <button type="button" className="btn-close" onClick={closeCreateSchedule}></button>
        </div>
        <form onSubmit={handleScheduleCreateSubmit} className="admin-form">
          {scheduleCreateError ? (
            <div className="admin-alert admin-alert--error">{scheduleCreateError}</div>
          ) : null}

          <div className="admin-form__grid">
            <div className="admin-form__field">
              <label>Oddział</label>
              <select
                name="branchId"
                value={scheduleCreateForm.branchId}
                onChange={handleScheduleCreateChange}
                className="admin-input"
                required
              >
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form__field">
              <label>Usługa</label>
              <select
                name="serviceId"
                value={scheduleCreateForm.serviceId}
                onChange={handleScheduleCreateChange}
                className="admin-input"
                required
              >
                {services
                  .filter((s) => !scheduleCreateForm.branchId || String(s.branchId) === String(scheduleCreateForm.branchId))
                  .map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.serviceName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="admin-form__field">
              <label>Dzień tygodnia</label>
              <DaysChecklistDropdown
                value={scheduleCreateForm.dayOfWeek}
                onChange={(days) => {
                  setScheduleCreateError("");
                  setScheduleCreateForm((prev) => ({ ...prev, dayOfWeek: days }));
                }}
                disabled={scheduleCreateSubmitting}
              />
            </div>

            <div className="admin-form__field">
              <label>Start</label>
              <input
                type="time"
                name="startTime"
                value={scheduleCreateForm.startTime}
                onChange={handleScheduleCreateChange}
                className="admin-input"
                required
              />
            </div>

            <div className="admin-form__field">
              <label>Koniec</label>
              <input
                type="time"
                name="endTime"
                value={scheduleCreateForm.endTime}
                onChange={handleScheduleCreateChange}
                className="admin-input"
                required
              />
            </div>

            {(() => {
              const b = branches.find((x) => String(x.id) === String(scheduleCreateForm.branchId));
              if (!b?.openingHour || !b?.closingHour) return null;
              return (
                <div className="admin-form__field admin-form__field--full">
                  <div className="admin-muted">
                    Godziny otwarcia oddziału: {b.openingHour} - {b.closingHour}
                  </div>
                </div>
              );
            })()}

            <div className="admin-form__field admin-form__field--full">
              <label>Pracownik</label>
              {employeeOptions.length === 0 && !employeesLoading ? (
                currentUserId ? (
                  <div className="admin-alert admin-alert--info" style={{ marginTop: 8 }}>
                    Nie udało się pobrać listy pracowników lub nie ma jeszcze pracowników w firmie.
                    Możesz tymczasowo wybrać tylko siebie.
                  </div>
                ) : (
                  <div className="admin-alert admin-alert--error" style={{ marginTop: 8 }}>
                    Brak pracowników w firmie. Dodaj pracownika w zakładce Pracownicy.
                  </div>
                )
              ) : null}
              <select
                name="staffId"
                value={scheduleCreateForm.staffId}
                onChange={handleScheduleCreateChange}
                className="admin-input"
                required
                disabled={employeesLoading || (employeeOptions.length === 0 && !currentUserId)}
              >
                {employeesLoading ? <option value="">Ładowanie...</option> : null}
                {employeeOptions.length > 0 ? (
                  employeeOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {formatEmployeeLabel(u)}
                    </option>
                  ))
                ) : currentUserId ? (
                  <option value={currentUserId}>Ja (moje UserId)</option>
                ) : (
                  <option value="">Brak pracowników</option>
                )}
              </select>
            </div>
          </div>

          <div className="admin-form__actions">
            <button type="button" className="btn btn-outline" onClick={closeCreateSchedule}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary" disabled={scheduleCreateSubmitting}>
              {scheduleCreateSubmitting ? "Zapisywanie..." : "Dodaj"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderCreateAppointmentForm = () => (
    <div className="admin-card--form-container">
      <div className="admin-card admin-card--form">
        <div className="admin-form__header">
          <h2>Dodaj rezerwację (MVP)</h2>
          <button type="button" className="btn-close" onClick={closeCreateAppointment}></button>
        </div>
        <form onSubmit={handleCreateAppointmentSubmit} className="admin-form">
          {createAppointmentError ? (
            <div className="admin-alert admin-alert--error">{String(createAppointmentError)}</div>
          ) : null}

          <div className="admin-form__grid">
            <div className="admin-form__field admin-form__field--full">
              <label>Usługa</label>
              <select
                name="serviceId"
                value={createAppointmentForm.serviceId}
                onChange={handleCreateAppointmentFormChange}
                className="admin-input"
                required
              >
                {services.map((s) => {
                  const branch = branches.find((b) => b.id === s.branchId);
                  const branchLabel = branch?.branchName ? ` (${branch.branchName})` : "";
                  return (
                    <option key={s.id} value={String(s.id)}>
                      {s.serviceName}{branchLabel}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="admin-form__field">
              <label>Data (do slotów)</label>
              <input
                type="date"
                name="date"
                value={createAppointmentForm.date}
                onChange={handleCreateAppointmentFormChange}
                className="admin-input"
              />
              {availableSlotsError ? (
                <div className="admin-muted" style={{ marginTop: 6 }}>
                  {availableSlotsError}
                </div>
              ) : null}
            </div>

            <div className="admin-form__field">
              <label>Pracownik</label>
              <select
                name="staffId"
                value={createAppointmentForm.staffId}
                onChange={handleCreateAppointmentFormChange}
                className="admin-input"
                required
                disabled={employeesLoading || (employeeOptions.length === 0 && !currentUserId)}
              >
                {employeesLoading ? <option value="">Ładowanie...</option> : null}
                {employeeOptions.length > 0 ? (
                  employeeOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {formatEmployeeLabel(u)}
                    </option>
                  ))
                ) : currentUserId ? (
                  <option value={currentUserId}>Ja (moje UserId)</option>
                ) : (
                  <option value="">Brak pracowników</option>
                )}
              </select>
            </div>

            <div className="admin-form__field">
              <label>Dostępny slot</label>
              <select
                name="slotIndex"
                value={createAppointmentForm.slotIndex}
                onChange={handleCreateAppointmentFormChange}
                className="admin-input"
                disabled={availableSlotsLoading}
              >
                <option value="">(wybierz)</option>
                {filteredAvailableSlots.map((slot, idx) => (
                  <option key={`${slot.start}-${slot.staffId}-${idx}`} value={String(idx)}>
                    {formatDateTime(slot.start)} - {formatDateTime(slot.end)} | {getEmployeeShortLabelById(slot.staffId)}
                  </option>
                ))}
              </select>
              {!availableSlotsLoading && createAppointmentForm.serviceId && filteredAvailableSlots.length === 0 ? (
                <div className="admin-muted" style={{ marginTop: 6 }}>
                  Brak slotów. Dodaj harmonogram dla tej usługi w zakładce Harmonogram (oraz przerwy pracownika, jeśli dotyczy).
                </div>
              ) : null}
            </div>

            <div className="admin-form__field">
              <label>Email</label>
              <input
                type="email"
                name="customerEmail"
                value={createAppointmentForm.customerEmail}
                onChange={handleCreateAppointmentFormChange}
                className="admin-input"
                placeholder="np. jan@x.pl"
              />
            </div>

            <div className="admin-form__field">
              <label>Telefon</label>
              <input
                type="text"
                name="customerPhone"
                value={createAppointmentForm.customerPhone}
                onChange={handleCreateAppointmentFormChange}
                className="admin-input"
                placeholder="np. +48 123 123 123"
              />
            </div>
          </div>

          <div className="admin-form__actions">
            <button type="button" className="btn btn-outline" onClick={closeCreateAppointment}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary" disabled={createAppointmentSubmitting}>
              {createAppointmentSubmitting ? "Zapisywanie..." : "Utwórz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const loadCompanyAudit = useCallback(async () => {
    if (!companyId) return;
    setCompanyAuditLoading(true);
    setCompanyAuditError("");
    try {
      const res = await companyAuditAPI.getByCompany(companyId, 200);
      setCompanyAuditLogs(res.data || []);
      setCompanyAuditPage(1);
    } catch (err) {
      console.error("Failed to load company audit", err);
      setCompanyAuditError("Nie udało się załadować audytu firmy.");
    } finally {
      setCompanyAuditLoading(false);
    }
  }, [companyId]);

  const companyAuditItems = Array.isArray(companyAuditLogs) ? companyAuditLogs : [];
  const companyAuditPageCount = Math.max(1, Math.ceil(companyAuditItems.length / companyAuditPageSize));
  const companyAuditCurrentPage = Math.min(companyAuditPage, companyAuditPageCount);
  const companyAuditStart = (companyAuditCurrentPage - 1) * companyAuditPageSize;
  const visibleCompanyAuditLogs = companyAuditItems.slice(companyAuditStart, companyAuditStart + companyAuditPageSize);

  const handleCompanyAuditPageSizeChange = (e) => {
    setCompanyAuditPageSize(Number(e.target.value));
    setCompanyAuditPage(1);
  };

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
        phone: formatPhoneDisplay(backendCompany.phone || ""),
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
    let nextValue = value;
    if (name === "postalCode") {
      nextValue = normalizePostalCodeInput(value);
    }
    if (name === "streetNumber" || name === "apartmentNumber") {
      nextValue = stripAllWhitespace(value);
    }
    if (name === "phone") {
      nextValue = formatPhoneDisplay(value);
    }
    setCompanyForm((prev) => ({ ...prev, [name]: nextValue }));
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
      const payload = {
        ...companyForm,
        phone: sanitizePhoneNumberInput(companyForm?.phone || ""),
      };
      await companiesAPI.update(companyId, payload);
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
      phone: formatPhoneDisplay(companyForm?.phone || ""),
      streetName: companyForm?.streetName || "",
      streetNumber: companyForm?.streetNumber || "",
      apartmentNumber: companyForm?.apartmentNumber || "",
      city: companyForm?.city || "",
      postalCode: companyForm?.postalCode || "",
      country: companyForm?.country || "",
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
      phone: formatPhoneDisplay(branch?.phone || ""),
      openingHour: branch?.openingHour || "",
      closingHour: branch?.closingHour || "",
    });
    setBranchFormError("");
    setBranchFormVisible(true);
  };

  const handleBranchFormChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === "postalCode") {
      nextValue = normalizePostalCodeInput(value);
    }
    if (name === "streetNumber" || name === "apartmentNumber") {
      nextValue = stripAllWhitespace(value);
    }
    if (name === "phone") {
      nextValue = formatPhoneDisplay(value);
    }
    setEditingBranch((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleBranchFormSubmit = async (e) => {
    e.preventDefault();
    setBranchFormSubmitting(true);
    setBranchFormError("");
    try {
      if (!companyId) {
        setBranchFormError("Brak ID firmy.");
        return;
      }

      if (!editingBranch) {
        setBranchFormError("Brak danych oddziału.");
        return;
      }

      const payload = {
        ...editingBranch,
        companyId,
        phone: sanitizePhoneNumberInput(editingBranch?.phone || "") || null,
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
      bufferMinutesAfter: 0,
      price: "50",
      branchId: defaultBranchId,
    });
    setServiceFormError("");
  };

  const handleOpenCreateService = () => {
    resetServiceForm();
    setServiceFormVisible(true);
  };

  const handleOpenEditService = (service) => {
    setEditingService({
      ...service,
      price: service?.price === null || service?.price === undefined ? "" : String(service.price),
    });
    setServiceFormError("");
    setServiceFormVisible(true);
  };

  const handleServiceFormChange = (e) => {
    const { name, value, type } = e.target;
    if (name === "price") {
      const normalized = String(value || "")
        .replace(/\s+/g, "")
        .replace(/,/g, ".")
        .replace(/[^0-9.]/g, "");
      setEditingService((prev) => ({
        ...prev,
        price: normalized,
      }));
      return;
    }
    setEditingService((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? parseInt(value, 10)
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
      const serviceName = String(editingService?.serviceName || "").trim();
      if (!serviceName) {
        setServiceFormError("Nazwa usługi jest wymagana.");
        return;
      }

      if (serviceName.length > 120) {
        setServiceFormError("Nazwa usługi może mieć maksymalnie 120 znaków.");
        return;
      }

      const rawPrice = String(editingService?.price ?? "").trim();
      const normalizedPrice = rawPrice.replace(/\s+/g, "").replace(/,/g, ".");
      const parsedPrice = normalizedPrice === "" ? NaN : Number(normalizedPrice);
      if (!Number.isFinite(parsedPrice)) {
        setServiceFormError("Podaj poprawną cenę (np. 50 lub 49.99). ");
        return;
      }

      if (parsedPrice < 0) {
        setServiceFormError("Cena nie może być ujemna.");
        return;
      }

      const serviceData = {
        ...editingService,
        companyId,
        serviceName,
        price: parsedPrice,
        durationMinutes: parseInt(editingService?.durationMinutes, 10),
        bufferMinutesAfter: parseInt(editingService?.bufferMinutesAfter ?? 0, 10),
        branchId: parseInt(editingService?.branchId, 10),
      };
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
                <th>Bufor po (min)</th>
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
                  <td>{service.bufferMinutesAfter ?? 0}</td>
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
                  <td>{formatPhoneDisplay(branch.phone || "") || "—"}</td>
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

      <div className="admin-card" style={{ marginTop: 16 }}>
        <div className="admin-card__body">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Przerwy pracowników</h3>
          </div>

          {branches.length === 0 ? (
            <div className="admin-alert admin-alert--error" style={{ marginBottom: 12 }}>
              Brak oddziałów. Dodaj oddział w zakładce Oddziały.
            </div>
          ) : null}

          {employees.length === 0 ? (
            <div className="admin-alert admin-alert--error" style={{ marginBottom: 12 }}>
              Brak pracowników. Dodaj pracownika lub przypisz go do firmy.
            </div>
          ) : null}

          {staffBreaksError ? (
            <div className="admin-alert admin-alert--error">{staffBreaksError}</div>
          ) : null}

          <div className="admin-form__grid" style={{ marginBottom: 12 }}>
            <div className="admin-form__field">
              <label>Oddział</label>
              <select
                name="branchId"
                value={staffBreakFilters.branchId}
                onChange={handleStaffBreakFilterChange}
                className="admin-input"
                disabled={branches.length === 0 || employees.length === 0}
              >
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.branchName || b.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form__field">
              <label>Pracownik</label>
              <select
                name="staffId"
                value={staffBreakFilters.staffId}
                onChange={handleStaffBreakFilterChange}
                className="admin-input"
                disabled={branches.length === 0 || employees.length === 0}
              >
                {employees.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {formatEmployeeShortLabel(u)}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form__field">
              <label>Dzień tygodnia</label>
              <DaysChecklistDropdown
                value={staffBreakFilters.dayOfWeek}
                onChange={(days) => {
                  setStaffBreakFormError("");
                  setStaffBreakFilters((prev) => ({ ...prev, dayOfWeek: days }));
                }}
                disabled={branches.length === 0 || employees.length === 0}
              />
            </div>
          </div>

          <form onSubmit={handleCreateStaffBreak} className="admin-form">
            {staffBreakFormError ? (
              <div className="admin-alert admin-alert--error">{staffBreakFormError}</div>
            ) : null}

            <div className="admin-form__grid">
              <div className="admin-form__field">
                <label>Start</label>
                <input
                  type="time"
                  name="startTime"
                  value={staffBreakForm.startTime}
                  onChange={handleStaffBreakFormChange}
                  className="admin-input"
                  required
                />
              </div>

              <div className="admin-form__field">
                <label>Koniec</label>
                <input
                  type="time"
                  name="endTime"
                  value={staffBreakForm.endTime}
                  onChange={handleStaffBreakFormChange}
                  className="admin-input"
                  required
                />
              </div>
            </div>

            <div className="admin-form__actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={loadStaffBreaks}
                disabled={staffBreaksLoading || branches.length === 0 || employees.length === 0}
              >
                Odśwież
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={staffBreakSubmitting || branches.length === 0 || employees.length === 0}
              >
                {staffBreakSubmitting ? "Dodawanie..." : "Dodaj przerwę"}
              </button>
            </div>
          </form>

          {staffBreaksLoading ? (
            <p>Ładowanie...</p>
          ) : staffBreaks.length === 0 ? (
            <p>Brak przerw.</p>
          ) : (
            <table className="admin-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      onClick={() => handleStaffBreaksSort("branch")}
                      style={{ background: "transparent", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
                    >
                      {getStaffBreaksHeaderLabel("Oddział", "branch")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      onClick={() => handleStaffBreaksSort("staff")}
                      style={{ background: "transparent", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
                    >
                      {getStaffBreaksHeaderLabel("Pracownik", "staff")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      onClick={() => handleStaffBreaksSort("day")}
                      style={{ background: "transparent", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
                    >
                      {getStaffBreaksHeaderLabel("Dzień", "day")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      onClick={() => handleStaffBreaksSort("start")}
                      style={{ background: "transparent", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
                    >
                      {getStaffBreaksHeaderLabel("Start", "start")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      onClick={() => handleStaffBreaksSort("end")}
                      style={{ background: "transparent", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
                    >
                      {getStaffBreaksHeaderLabel("Koniec", "end")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      onClick={() => handleStaffBreaksSort("status")}
                      style={{ background: "transparent", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
                    >
                      {getStaffBreaksHeaderLabel("Status", "status")}
                    </button>
                  </th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {visibleStaffBreaks.map((b) => (
                  <tr key={b.id}>
                    <td>{branches.find((x) => x.id === b.branchId)?.branchName || b.branchId}</td>
                    <td>{getEmployeeShortLabelById(b.staffId)}</td>
                    <td>{dayLabels[b.dayOfWeek] || b.dayOfWeek}</td>
                    <td>{String(b.startTime || "").slice(0, 5)}</td>
                    <td>{String(b.endTime || "").slice(0, 5)}</td>
                    <td>{b.isActive ? "Aktywna" : "Wyłączona"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="btn btn-outline btn-xs" onClick={() => handleToggleStaffBreak(b)}>
                          {b.isActive ? "Wyłącz" : "Włącz"}
                        </button>
                        <button type="button" className="btn btn-outline btn-xs" onClick={() => handleDeleteStaffBreak(b)}>
                          Usuń
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!staffBreaksLoading && staffBreaks.length > 0 ? (
            <div className="list-pagination" style={{ marginTop: 12 }}>
              <div className="list-page-size">
                <span>Na stronie:</span>
                <select value={staffBreaksPageSize} onChange={handleStaffBreaksPageSizeChange}>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <div className="list-page-controls">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={staffBreaksCurrentPage === 1}
                  onClick={() => setStaffBreaksPage((p) => Math.max(1, p - 1))}
                >
                  Poprzednia
                </button>
                <span>
                  Strona {staffBreaksCurrentPage} z {staffBreaksPageCount}
                </span>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={staffBreaksCurrentPage === staffBreaksPageCount}
                  onClick={() => setStaffBreaksPage((p) => Math.min(staffBreaksPageCount, p + 1))}
                >
                  Następna
                </button>
              </div>
            </div>
          ) : null}
        </div>
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

      {companyAuditError ? (
        <div className="admin-alert admin-alert--error">{companyAuditError}</div>
      ) : null}

      <div className="admin-card">
        {companyAuditLoading ? (
          <p>Ładowanie...</p>
        ) : companyAuditItems.length === 0 ? (
          <p>Brak wpisów.</p>
        ) : (
          <>
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
                {visibleCompanyAuditLogs.map((log) => (
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

            <div className="list-pagination">
              <div className="list-page-size">
                <span>Na stronie:</span>
                <select value={companyAuditPageSize} onChange={handleCompanyAuditPageSizeChange}>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <div className="list-page-controls">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={companyAuditCurrentPage === 1}
                  onClick={() => setCompanyAuditPage((p) => Math.max(1, p - 1))}
                >
                  Poprzednia
                </button>
                <span>
                  Strona {companyAuditCurrentPage} z {companyAuditPageCount}
                </span>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={companyAuditCurrentPage === companyAuditPageCount}
                  onClick={() => setCompanyAuditPage((p) => Math.min(companyAuditPageCount, p + 1))}
                >
                  Następna
                </button>
              </div>
            </div>
          </>
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
                required
                pattern="^[0-9]{2}-[0-9]{3}$"
                maxLength={6}
                title="Kod pocztowy w formacie 00-000"
                className="admin-input"
                placeholder="00-000"
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
                maxLength={120}
                title="Maksymalnie 120 znaków"
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
              <label>Bufor po wizycie (w minutach)</label>
              <input
                name="bufferMinutesAfter"
                type="number"
                value={editingService?.bufferMinutesAfter ?? 0}
                onChange={handleServiceFormChange}
                className="admin-input"
                min="0"
              />
            </div>
            <div className="admin-form__field">
              <label>Cena (PLN)</label>
              <input
                name="price"
                type="text"
                inputMode="decimal"
                value={editingService?.price ?? ""}
                onChange={handleServiceFormChange}
                required
                className="admin-input"
                placeholder="np. 49.99"
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
      {scheduleCreateVisible && renderCreateScheduleForm()}
      {createAppointmentVisible && renderCreateAppointmentForm()}
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
        {canManageCompanyCatalog && (
          <button
            type="button"
            className={`admin-tab ${activeTab === "schedules" ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab("schedules")}
          >
            Harmonogram
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
        {activeTab === "schedules" && canManageCompanyCatalog && renderSchedulesTab()}
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
