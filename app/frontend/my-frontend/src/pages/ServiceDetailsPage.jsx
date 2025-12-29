import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { servicesAPI } from "../services/api";

function ServiceDetailsPage() {
  const { id } = useParams();
  const location = useLocation();

  const initialService = location.state?.service || null;

  const [service, setService] = useState(() => initialService);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await servicesAPI.getById(id);
        if (!cancelled) {
          setService(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          if (!location.state?.service) {
            setError("Nie udało się pobrać szczegółów usługi.");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id, initialService]);

  const company = service?.company;
  const branch = service?.branch;

  const companyName = company?.companyName || service?.companyName;
  const branchName = branch?.branchName || service?.branchName;
  const cityName = branch?.city || company?.city || service?.city;

  const phoneHref = useMemo(() => {
    const phone = company?.phone;
    if (!phone) return null;
    return `tel:${phone.replace(/\s+/g, "")}`;
  }, [company?.phone]);

  const addressText = useMemo(() => {
    const city = cityName || "";
    const streetName = branch?.streetName || company?.streetName || "";
    const streetNumber = branch?.streetNumber || company?.streetNumber || "";
    const postalCode = branch?.postalCode || company?.postalCode || "";

    const streetLine = [streetName, streetNumber].filter(Boolean).join(" ");
    const cityLine = [postalCode, city].filter(Boolean).join(" ");

    const lines = [streetLine, cityLine].filter((x) => x.trim().length > 0);
    return lines.join(", ");
  }, [branch, company, cityName]);

  const hoursText = useMemo(() => {
    const open = branch?.openingHour || company?.openingHour;
    const close = branch?.closingHour || company?.closingHour;
    if (!open && !close) return null;
    if (open && close) return `${open} - ${close}`;
    if (open) return open;
    return close;
  }, [branch, company]);

  const mapQuery = useMemo(() => {
    const parts = [
      branchName,
      companyName,
      branch?.streetName,
      branch?.streetNumber,
      branch?.postalCode,
      cityName,
      branch?.country || company?.country,
    ].filter(Boolean);

    const raw = parts.join(" ").trim();
    return raw ? encodeURIComponent(raw) : null;
  }, [branch?.streetName, branch?.streetNumber, branch?.postalCode, branch?.country, company?.country, branchName, companyName, cityName]);

  const mapLink = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}`
    : null;
  const mapEmbedSrc = mapQuery
    ? `https://www.google.com/maps?q=${mapQuery}&output=embed`
    : null;

  if (loading) {
    return <div className="list-page">Ładowanie szczegółów usługi...</div>;
  }

  if (error) {
    return (
      <div className="list-page">
        <div className="list-state list-state-error">{error}</div>
        <Link to="/services" className="btn btn-outline">
          Wróć do listy usług
        </Link>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="list-page">
        <div className="list-state">Nie znaleziono usługi.</div>
        <Link to="/services" className="btn btn-outline">
          Wróć do listy usług
        </Link>
      </div>
    );
  }

  return (
    <div className="list-page">
      <header className="list-header">
        <h1>{service.serviceName}</h1>
        <p>
          {companyName || ""}
          {branchName ? ` · ${branchName}` : ""}
        </p>
      </header>

      <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
        {service.description && <p>{service.description}</p>}

        <div className="service-meta" style={{ marginTop: "12px" }}>
          <span className="service-price">{service.price} zł</span>
          <span className="service-duration">{service.durationMinutes} min</span>
        </div>

        <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link to="/login" className="btn btn-primary">
            Zarezerwuj (wkrótce)
          </Link>
          <Link to="/services" className="btn btn-outline">
            Wróć
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
        <h2 style={{ marginTop: 0 }}>Dane salonu</h2>

        {companyName && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Firma:</strong> {companyName}
          </div>
        )}

        {addressText && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Adres:</strong> {addressText}
            {mapLink && (
              <div style={{ marginTop: "6px" }}>
                <a href={mapLink} target="_blank" rel="noreferrer">
                  Otwórz w Google Maps
                </a>
              </div>
            )}
          </div>
        )}

        {hoursText && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Godziny otwarcia:</strong> {hoursText}
          </div>
        )}

        {company?.phone && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Telefon:</strong>{" "}
            {phoneHref ? (
              <a href={phoneHref}>{company.phone}</a>
            ) : (
              company.phone
            )}
          </div>
        )}

        {company?.email && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Email:</strong> <a href={`mailto:${company.email}`}>{company.email}</a>
          </div>
        )}

        {company?.website && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Strona:</strong>{" "}
            <a href={company.website} target="_blank" rel="noreferrer">
              {company.website}
            </a>
          </div>
        )}
      </div>

      {mapEmbedSrc && (
        <div className="card" style={{ padding: "0", overflow: "hidden" }}>
          <iframe
            title="map"
            src={mapEmbedSrc}
            width="100%"
            height="320"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </div>
  );
}

export default ServiceDetailsPage;
