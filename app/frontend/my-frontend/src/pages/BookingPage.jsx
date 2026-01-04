import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { appointmentsAPI, authAPI, servicesAPI, tokenManager } from "../services/api";
import { useI18n } from "../i18n/I18nContext";

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

function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useI18n();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [availableSlots, setAvailableSlots] = useState([]);
  const [availableSlotsLoading, setAvailableSlotsLoading] = useState(false);
  const [availableSlotsError, setAvailableSlotsError] = useState("");

  const isAuthenticated = tokenManager.isAuthenticated();

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [form, setForm] = useState({
    date: "",
    slotIndex: "",
    staffId: "",
    dateStart: "",
    selectedStaffId: "",
    customerEmail: "",
    customerPhone: "",
  });

  const [contactErrors, setContactErrors] = useState({
    customerEmail: "",
    customerPhone: "",
  });

  const validateContact = (next) => {
    const email = String(next.customerEmail || "").trim();
    const phone = sanitizePhoneNumberInput(next.customerPhone);

    const hasEmail = email.length > 0;
    const hasPhone = phone.length > 0;

    const emailOk = !hasEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneOk = !hasPhone || /^\+\d{8,15}$/.test(phone);

    return {
      customerEmail: emailOk ? "" : "booking.invalidEmail",
      customerPhone: phoneOk ? "" : "booking.invalidPhone",
      _bothMissing: !hasEmail && !hasPhone ? "booking.provideContact" : "",
    };
  };

  const tx = (value) => {
    if (!value) return "";
    const s = String(value);
    if (s.startsWith("booking.")) return t(s);
    return s;
  };

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadService = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await servicesAPI.getById(id);
        if (cancelled) return;
        setService(res.data ?? null);
      } catch (err) {
        if (cancelled) return;
        setService(null);
        setError("booking.serviceLoadError");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadService();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const user = tokenManager.getUser();
    const email = user?.email || "";

    setForm((prev) => ({
      ...prev,
      customerEmail: prev.customerEmail || email,
    }));

    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError("");
      try {
        const res = await authAPI.getProfile();
        if (cancelled) return;

        const phone = res.data?.phone || "";
        const profileEmail = res.data?.email || "";

        setForm((prev) => ({
          ...prev,
          customerEmail: prev.customerEmail || profileEmail || email,
          customerPhone: prev.customerPhone || formatPhoneDisplay(phone),
        }));
      } catch (err) {
        if (!cancelled) {
          setProfileError("booking.profilePhoneError");
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const serviceId = useMemo(() => {
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [id]);

  const filteredAvailableSlots = useMemo(() => {
    if (!form.date) return [];
    if (!form.staffId) return [];
    return availableSlots.filter((s) => String(s.staffId || "") === String(form.staffId));
  }, [availableSlots, form.date, form.staffId]);

  const staffOptions = useMemo(() => {
    const map = new Map();
    for (const slot of availableSlots) {
      const staffId = String(slot?.staffId || "").trim();
      const staffName = String(slot?.staffName || "").trim();
      if (!staffId || !staffName) continue;
      if (!map.has(staffId)) {
        map.set(staffId, staffName);
      }
    }
    return Array.from(map.entries())
      .map(([staffId, staffName]) => ({ id: staffId, name: staffName }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), locale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSlots, locale]);

  useEffect(() => {
    if (!serviceId || !form.date) {
      setAvailableSlots([]);
      setForm((prev) => ({ ...prev, slotIndex: "", dateStart: "", selectedStaffId: "" }));
      return;
    }

    let cancelled = false;

    const load = async () => {
      setAvailableSlotsLoading(true);
      setAvailableSlotsError("");
      try {
        const res = await appointmentsAPI.getPublicAvailableSlots(serviceId, form.date);
        const items = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) {
          setAvailableSlots(items);
        }
      } catch (err) {
        if (!cancelled) {
          setAvailableSlots([]);
          const msg =
            err?.response?.data?.message ||
            (typeof err?.response?.data === "string" ? err.response.data : "") ||
            (err?.response?.status ? `HTTP ${err.response.status}` : "") ||
            "booking.slotsLoadError";
          setAvailableSlotsError(String(msg));
        }
      } finally {
        if (!cancelled) setAvailableSlotsLoading(false);
      }
    };

    setForm((prev) => ({ ...prev, slotIndex: "", dateStart: "", selectedStaffId: "" }));
    load();

    return () => {
      cancelled = true;
    };
  }, [serviceId, form.date]);

  useEffect(() => {
    if (!form.date) return;
    if (staffOptions.length === 0) {
      setForm((prev) => ({ ...prev, staffId: "" }));
      return;
    }

    const hasSelected = staffOptions.some((s) => String(s.id) === String(form.staffId));
    if (!hasSelected) {
      setForm((prev) => ({ ...prev, staffId: String(staffOptions[0].id) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffOptions]);

  useEffect(() => {
    const idxRaw = form.slotIndex;
    if (idxRaw === "") return;

    const slot = filteredAvailableSlots[Number(idxRaw)];
    if (!slot) return;

    setForm((prev) => ({
      ...prev,
      dateStart: slot.start || "",
      selectedStaffId: slot.staffId || "",
    }));
  }, [filteredAvailableSlots, form.slotIndex]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, slotIndex: "", dateStart: "", selectedStaffId: "" }));
  }, [form.staffId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSubmitError("");
    setSubmitSuccess("");
    if (name === "customerPhone") {
      setForm((prev) => {
        const next = { ...prev, [name]: formatPhoneDisplay(value) };
        const nextErrors = validateContact(next);
        setContactErrors({
          customerEmail: nextErrors.customerEmail,
          customerPhone: nextErrors.customerPhone,
        });
        return next;
      });
      return;
    }
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "customerEmail") {
        const nextErrors = validateContact(next);
        setContactErrors({
          customerEmail: nextErrors.customerEmail,
          customerPhone: nextErrors.customerPhone,
        });
      }
      return next;
    });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name !== "customerEmail") return;

    const trimmed = String(value || "").trim();
    setForm((prev) => {
      const next = { ...prev, customerEmail: trimmed };
      const nextErrors = validateContact(next);
      setContactErrors({
        customerEmail: nextErrors.customerEmail,
        customerPhone: nextErrors.customerPhone,
      });
      return next;
    });
  };

  const sanitizePhone = (value) => sanitizePhoneNumberInput(value);
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  const isValidPhone = (value) => {
    const v = sanitizePhone(value);
    if (!v) return false;
    return /^\+\d{8,15}$/.test(v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      if (!serviceId) {
        setSubmitError("booking.invalidService");
        return;
      }

      const selectedSlot = form.slotIndex !== "" ? filteredAvailableSlots[Number(form.slotIndex)] : null;
      const staffId = selectedSlot?.staffId || form.selectedStaffId;
      const dateStart = selectedSlot?.start || form.dateStart;

      if (!dateStart || !staffId) {
        setSubmitError("booking.chooseSlot");
        return;
      }

      const startDate = new Date(dateStart);
      if (Number.isNaN(startDate.getTime())) {
        setSubmitError("booking.invalidDate");
        return;
      }

      if (startDate.getTime() < Date.now()) {
        setSubmitError("booking.pastDate");
        return;
      }

      const email = String(form.customerEmail || "").trim();
      const phone = sanitizePhoneNumberInput(form.customerPhone);

      const hasEmail = email.length > 0;
      const hasPhone = phone.length > 0;

      if (!hasEmail && !hasPhone) {
        setSubmitError("booking.provideContact");
        return;
      }

      if (hasEmail && !isValidEmail(email)) {
        setSubmitError("booking.invalidEmail");
        return;
      }

      if (hasPhone && !isValidPhone(phone)) {
        setSubmitError("booking.invalidPhone");
        return;
      }

      await appointmentsAPI.createPublic({
        serviceId,
        staffId,
        dateStart,
        customerEmail: hasEmail ? email : null,
        customerPhone: hasPhone ? phone : null,
      });

      setSubmitSuccess("booking.created");
      setTimeout(() => {
        navigate(`/services/${serviceId}`, { replace: true });
      }, 1200);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : "") ||
        "booking.createError";
      setSubmitError(String(msg));
    } finally {
      setSubmitLoading(false);
    }
  };

  useEffect(() => {
    const nextErrors = validateContact(form);
    setContactErrors({
      customerEmail: nextErrors.customerEmail,
      customerPhone: nextErrors.customerPhone,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    if (serviceId) {
      navigate(`/services/${serviceId}`, { replace: true });
      return;
    }
    navigate('/services', { replace: true });
  };

  if (loading) {
    return (
      <div className="auth-modal-overlay" onClick={handleClose}>
        <div className="auth-modal auth-modal--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button type="button" className="auth-modal-close" onClick={handleClose} aria-label={t('common.close')}>
            ×
          </button>
          <div className="auth-modal-body">
            <h1 className="auth-modal-title">{t('booking.title')}</h1>
            <p className="auth-modal-subtitle">{t('booking.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-modal-overlay" onClick={handleClose}>
        <div className="auth-modal auth-modal--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button type="button" className="auth-modal-close" onClick={handleClose} aria-label={t('common.close')}>
            ×
          </button>
          <div className="auth-modal-body">
            <h1 className="auth-modal-title">{t('booking.title')}</h1>
            <div className="services-state services-state-error" style={{ marginBottom: 12 }}>
              {tx(error)}
            </div>
            <Link to="/services" className="btn btn-outline">
              {t('booking.backToServices')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="auth-modal-overlay" onClick={handleClose}>
        <div className="auth-modal auth-modal--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button type="button" className="auth-modal-close" onClick={handleClose} aria-label={t('common.close')}>
            ×
          </button>
          <div className="auth-modal-body">
            <h1 className="auth-modal-title">{t('booking.title')}</h1>
            <div className="services-state" style={{ marginBottom: 12 }}>
              {t('booking.serviceNotFound')}
            </div>
            <Link to="/services" className="btn btn-outline">
              {t('booking.backToServices')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-modal-overlay" onClick={handleClose}>
      <div className="auth-modal auth-modal--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="auth-modal-close" onClick={handleClose} aria-label={t('common.close')}>
          ×
        </button>
        <div className="auth-modal-body">
          <h1 className="auth-modal-title">{t('booking.title')}</h1>
          <p className="auth-modal-subtitle">{service.serviceName}</p>
        {isAuthenticated ? (
          <div style={{ marginBottom: 8 }}>
            <strong>{t('booking.loggedIn')}</strong> {t('booking.loggedInHint')}
          </div>
        ) : (
          <div style={{ marginBottom: 8 }}>
            <strong>{t('booking.loggedOut')}</strong> {t('booking.loggedOutHint')}
          </div>
        )}

        {profileError ? <div className="list-state list-state-error">{tx(profileError)}</div> : null}

        <form onSubmit={handleSubmit}>
          {submitError ? (
            <div className="list-state list-state-error" style={{ marginBottom: 12 }}>
              {tx(submitError)}
            </div>
          ) : null}
          {submitSuccess ? (
            <div className="list-state" style={{ marginBottom: 12 }}>
              {tx(submitSuccess)}
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6 }}>{t('booking.date')}</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="list-filter-input"
                min={new Date().toISOString().split("T")[0]}
                required
              />
              {availableSlotsError ? (
                <div style={{ marginTop: 6, opacity: 0.85 }}>{tx(availableSlotsError)}</div>
              ) : null}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>{t('booking.staff')}</label>
              <select
                name="staffId"
                value={form.staffId}
                onChange={handleChange}
                className="list-filter-select"
                disabled={availableSlotsLoading || !form.date}
                required
              >
                <option value="">{t('booking.select')}</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {!availableSlotsLoading && form.date && staffOptions.length === 0 ? (
                <div style={{ marginTop: 6, opacity: 0.85 }}>{t('booking.noStaff')}</div>
              ) : null}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>{t('booking.slot')}</label>
              <select
                name="slotIndex"
                value={form.slotIndex}
                onChange={handleChange}
                className="list-filter-select"
                disabled={availableSlotsLoading}
                required
              >
                <option value="">{t('booking.select')}</option>
                {filteredAvailableSlots.map((slot, idx) => (
                  <option key={`${slot.start}-${slot.staffId}-${idx}`} value={String(idx)}>
                    {new Date(slot.start).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} - {new Date(slot.end).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                    {slot.staffName ? ` | ${slot.staffName}` : ""}
                  </option>
                ))}
              </select>
              {!availableSlotsLoading && form.date && filteredAvailableSlots.length === 0 ? (
                <div style={{ marginTop: 6, opacity: 0.85 }}>{t('booking.noSlots')}</div>
              ) : null}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>{t('booking.email')}</label>
              <input
                type="email"
                name="customerEmail"
                value={form.customerEmail}
                onChange={handleChange}
                onBlur={handleBlur}
                className="list-filter-input"
                placeholder={t('booking.emailPlaceholder')}
                disabled={profileLoading}
              />
              {contactErrors.customerEmail ? (
                <div style={{ marginTop: 6, opacity: 0.85 }}>{tx(contactErrors.customerEmail)}</div>
              ) : null}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>{t('booking.phone')}</label>
              <input
                type="text"
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                className="list-filter-input"
                placeholder={t('booking.phonePlaceholder')}
                disabled={profileLoading}
              />
              {contactErrors.customerPhone ? (
                <div style={{ marginTop: 6, opacity: 0.85 }}>{tx(contactErrors.customerPhone)}</div>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <Link to={`/services/${serviceId}`} className="btn btn-outline">
              {t('booking.back')}
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitLoading}>
              {submitLoading ? t('booking.submitting') : t('booking.submit')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

export default BookingPage;
