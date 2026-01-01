import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { appointmentsAPI, authAPI, servicesAPI, tokenManager } from "../services/api";

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

function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

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
        setError("Nie udało się pobrać szczegółów usługi.");
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
          setProfileError("Nie udało się pobrać numeru telefonu z profilu.");
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
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "pl"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSlots]);

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
            "Nie udało się załadować dostępnych terminów.";
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
      setForm((prev) => ({ ...prev, [name]: formatPhoneDisplay(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const sanitizePhone = (value) => sanitizePhoneNumberInput(value);
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  const isValidPhone = (value) => {
    const v = sanitizePhone(value);
    if (!v) return false;
    return /^\+\d{1,3}(\s?\d{3}){3}$/.test(v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      if (!serviceId) {
        setSubmitError("Nieprawidłowa usługa.");
        return;
      }

      const selectedSlot = form.slotIndex !== "" ? filteredAvailableSlots[Number(form.slotIndex)] : null;
      const staffId = selectedSlot?.staffId || form.selectedStaffId;
      const dateStart = selectedSlot?.start || form.dateStart;

      if (!dateStart || !staffId) {
        setSubmitError("Wybierz dostępny termin.");
        return;
      }

      const email = String(form.customerEmail || "").trim();
      const phone = sanitizePhoneNumberInput(form.customerPhone);

      const hasEmail = email.length > 0;
      const hasPhone = phone.length > 0;

      if (!hasEmail && !hasPhone) {
        setSubmitError("Podaj email lub numer telefonu.");
        return;
      }

      if (hasEmail && !isValidEmail(email)) {
        setSubmitError("Niepoprawny email.");
        return;
      }

      if (hasPhone && !isValidPhone(phone)) {
        setSubmitError("Niepoprawny numer telefonu.");
        return;
      }

      await appointmentsAPI.createPublic({
        serviceId,
        staffId,
        dateStart,
        customerEmail: hasEmail ? email : null,
        customerPhone: hasPhone ? phone : null,
      });

      setSubmitSuccess("Rezerwacja została utworzona.");
      setTimeout(() => {
        navigate(`/services/${serviceId}`, { replace: true });
      }, 1200);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : "") ||
        "Nie udało się utworzyć rezerwacji.";
      setSubmitError(String(msg));
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return <div className="list-page">Ładowanie...</div>;
  }

  if (error) {
    return (
      <div className="list-page">
        <div className="list-state list-state-error">{error}</div>
        <Link to="/services" className="btn btn-outline">
          Wróć do usług
        </Link>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="list-page">
        <div className="list-state">Nie znaleziono usługi.</div>
        <Link to="/services" className="btn btn-outline">
          Wróć do usług
        </Link>
      </div>
    );
  }

  return (
    <div className="list-page">
      <header className="list-header">
        <h1>Rezerwacja terminu</h1>
        <p>{service.serviceName}</p>
      </header>

      <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
        {isAuthenticated ? (
          <div style={{ marginBottom: 8 }}>
            <strong>Zalogowano.</strong> Dane kontaktowe zostały wstępnie uzupełnione.
          </div>
        ) : (
          <div style={{ marginBottom: 8 }}>
            <strong>Nie jesteś zalogowany.</strong> Podaj email lub numer telefonu.
          </div>
        )}

        {profileError ? <div className="list-state list-state-error">{profileError}</div> : null}

        <form onSubmit={handleSubmit}>
          {submitError ? (
            <div className="list-state list-state-error" style={{ marginBottom: 12 }}>
              {submitError}
            </div>
          ) : null}
          {submitSuccess ? (
            <div className="list-state" style={{ marginBottom: 12 }}>
              {submitSuccess}
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Data</label>
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
                <div style={{ marginTop: 6, opacity: 0.85 }}>{availableSlotsError}</div>
              ) : null}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Pracownik</label>
              <select
                name="staffId"
                value={form.staffId}
                onChange={handleChange}
                className="list-filter-select"
                disabled={availableSlotsLoading || !form.date}
                required
              >
                <option value="">(wybierz)</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {!availableSlotsLoading && form.date && staffOptions.length === 0 ? (
                <div style={{ marginTop: 6, opacity: 0.85 }}>Brak pracowników w wybranym dniu.</div>
              ) : null}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Termin</label>
              <select
                name="slotIndex"
                value={form.slotIndex}
                onChange={handleChange}
                className="list-filter-select"
                disabled={availableSlotsLoading}
                required
              >
                <option value="">(wybierz)</option>
                {filteredAvailableSlots.map((slot, idx) => (
                  <option key={`${slot.start}-${slot.staffId}-${idx}`} value={String(idx)}>
                    {new Date(slot.start).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} - {new Date(slot.end).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                    {slot.staffName ? ` | ${slot.staffName}` : ""}
                  </option>
                ))}
              </select>
              {!availableSlotsLoading && form.date && filteredAvailableSlots.length === 0 ? (
                <div style={{ marginTop: 6, opacity: 0.85 }}>Brak terminów w wybranym dniu.</div>
              ) : null}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Email</label>
              <input
                type="email"
                name="customerEmail"
                value={form.customerEmail}
                onChange={handleChange}
                className="list-filter-input"
                placeholder="np. jan@x.pl"
                disabled={profileLoading}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Telefon</label>
              <input
                type="text"
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                className="list-filter-input"
                placeholder="np. +48 123 123 123"
                disabled={profileLoading}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <Link to={`/services/${serviceId}`} className="btn btn-outline">
              Wróć
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitLoading}>
              {submitLoading ? "Rezerwuję..." : "Zarezerwuj"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BookingPage;
