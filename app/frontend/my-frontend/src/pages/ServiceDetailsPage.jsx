import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { branchReviewsAPI, geocodeAPI, servicesAPI } from "../services/api";

function ServiceDetailsPage() {
  const { id } = useParams();
  const location = useLocation();

  const initialService = location.state?.service || null;

  const [service, setService] = useState(() => initialService);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [branchSummary, setBranchSummary] = useState(null);
  const [branchSummaryError, setBranchSummaryError] = useState("");
  const [branchReviews, setBranchReviews] = useState([]);
  const [branchReviewsLoading, setBranchReviewsLoading] = useState(false);
  const [branchReviewsError, setBranchReviewsError] = useState("");

  const [mapCoords, setMapCoords] = useState(null);

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
  const branchId = branch?.id ?? service?.branchId ?? null;

  const companyName = company?.companyName || service?.companyName;
  const branchName = branch?.branchName || service?.branchName;
  const cityName = branch?.city || company?.city || service?.city;

  const branchPhoneHref = useMemo(() => {
    const phone = branch?.phone;
    if (!phone) return null;
    return `tel:${String(phone).replace(/\s+/g, "")}`;
  }, [branch?.phone]);

  const companyPhoneHref = useMemo(() => {
    const phone = company?.phone;
    if (!phone) return null;
    return `tel:${String(phone).replace(/\s+/g, "")}`;
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

  const branchHoursText = useMemo(() => {
    const open = branch?.openingHour;
    const close = branch?.closingHour;
    if (!open && !close) return null;
    if (open && close) return `${open} - ${close}`;
    if (open) return open;
    return close;
  }, [branch?.openingHour, branch?.closingHour]);

  const companyHoursText = useMemo(() => {
    const open = company?.openingHour;
    const close = company?.closingHour;
    if (!open && !close) return null;
    if (open && close) return `${open} - ${close}`;
    if (open) return open;
    return close;
  }, [company?.openingHour, company?.closingHour]);

  const hoursText = branchHoursText || companyHoursText;
  const hoursLabel = branchHoursText ? "Godziny oddziału:" : "Godziny firmy (domyślne):";

  const normalizeStreet = (value) => {
    if (!value) return null;
    return String(value)
      .trim()
      .replace(/^(ul\.|ulica|al\.|aleja|pl\.|plac)\s+/i, "")
      .trim();
  };

  const osmQuery = useMemo(() => {
    const streetNameRaw = branch?.streetName || company?.streetName;
    const streetName = normalizeStreet(streetNameRaw);
    const streetNumber = branch?.streetNumber || company?.streetNumber;
    const city = cityName;
    const country = branch?.country || company?.country;

    const parts = [streetName, streetNumber, city, country]
      .filter(Boolean)
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0);

    const raw = parts.join(" ").trim();
    return raw || null;
  }, [branch?.streetName, branch?.streetNumber, branch?.country, company?.streetName, company?.streetNumber, company?.country, cityName]);

  const mapSearchLink = osmQuery
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(osmQuery)}`
    : null;

  const mapLink = mapCoords
    ? `https://www.openstreetmap.org/?mlat=${mapCoords.lat}&mlon=${mapCoords.lon}#map=18/${mapCoords.lat}/${mapCoords.lon}`
    : mapSearchLink;

  const mapEmbedSrc = useMemo(() => {
    if (!mapCoords) return null;
    const delta = 0.005;
    const left = mapCoords.lon - delta;
    const right = mapCoords.lon + delta;
    const top = mapCoords.lat + delta;
    const bottom = mapCoords.lat - delta;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${mapCoords.lat}%2C${mapCoords.lon}`;
  }, [mapCoords]);

  useEffect(() => {
    if (!osmQuery) {
      setMapCoords(null);
      return;
    }

    let cancelled = false;

    const geocode = async () => {
      try {
        const res = await geocodeAPI.geocode(osmQuery);
        if (cancelled) return;

        if (res.data?.found && Number.isFinite(res.data.lat) && Number.isFinite(res.data.lon)) {
          setMapCoords({ lat: res.data.lat, lon: res.data.lon });
          return;
        }

        setMapCoords(null);
      } catch (err) {
        if (!cancelled) {
          setMapCoords(null);
        }
      }
    };

    geocode();

    return () => {
      cancelled = true;
    };
  }, [osmQuery]);

  useEffect(() => {
    let cancelled = false;

    const loadBranchSummary = async () => {
      if (!branchId) {
        setBranchSummary(null);
        setBranchSummaryError("");
        return;
      }

      try {
        const res = await branchReviewsAPI.getBranchSummary(branchId);
        if (!cancelled) {
          setBranchSummary(res.data);
          setBranchSummaryError("");
        }
      } catch (err) {
        if (!cancelled) {
          const status = err?.response?.status;
          setBranchSummary(null);
          setBranchSummaryError(
            status
              ? `Nie udało się pobrać oceny. (HTTP ${status})`
              : "Nie udało się pobrać oceny.",
          );
        }
      }
    };

    const loadBranchReviews = async () => {
      if (!branchId) {
        setBranchReviews([]);
        setBranchReviewsError("");
        return;
      }

      setBranchReviewsLoading(true);
      setBranchReviewsError("");

      try {
        const res = await branchReviewsAPI.getBranchReviews(branchId);
        if (!cancelled) {
          setBranchReviews(res.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          const status = err?.response?.status;
          setBranchReviews([]);
          setBranchReviewsError(
            status
              ? `Nie udało się pobrać opinii. (HTTP ${status})`
              : "Nie udało się pobrać opinii.",
          );
        }
      } finally {
        if (!cancelled) {
          setBranchReviewsLoading(false);
        }
      }
    };

    loadBranchSummary();
    loadBranchReviews();

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const formatBranchSummary = (summary) => {
    if (!summary) return "—";
    const count = summary.reviewCount ?? 0;
    const avg = summary.averageRating ?? 0;
    if (count === 0) return "Brak ocen";
    return `${Number(avg).toFixed(1)}/5 (${count})`;
  };

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
          <Link to={`/services/${id}/book`} className="btn btn-primary">
            Zarezerwuj
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
                  Otwórz w OpenStreetMap
                </a>
                {!mapCoords && osmQuery && (
                  <div style={{ fontSize: "0.85em", opacity: 0.8, marginTop: "4px" }}>
                    Nie udało się dopasować mapy do adresu – możesz użyć linku powyżej.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {hoursText && (
          <div style={{ marginBottom: "8px" }}>
            <strong>{hoursLabel}</strong> {hoursText}
          </div>
        )}

        {branch?.phone && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Telefon oddziału:</strong>{" "}
            {branchPhoneHref ? (
              <a href={branchPhoneHref}>{branch.phone}</a>
            ) : (
              branch.phone
            )}
          </div>
        )}

        {company?.phone && (!branch?.phone || company.phone !== branch.phone) && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Telefon firmy:</strong>{" "}
            {companyPhoneHref ? (
              <a href={companyPhoneHref}>{company.phone}</a>
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

      <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
        <h2 style={{ marginTop: 0 }}>Oceny i opinie</h2>
        <div style={{ marginBottom: "8px" }}>
          <strong>Ocena oddziału:</strong>{" "}
          {branchSummaryError ? branchSummaryError : formatBranchSummary(branchSummary)}
        </div>

        {branchReviewsLoading ? (
          <p>Ładowanie...</p>
        ) : branchReviewsError ? (
          <div className="list-state list-state-error">{branchReviewsError}</div>
        ) : branchReviews.length === 0 ? (
          <p>Brak opinii dla tego oddziału.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "18px" }}>
            {branchReviews.map((review) => {
              const dateText = review.createdAt
                ? new Date(review.createdAt).toLocaleDateString()
                : "";
              return (
                <li key={review.id} style={{ marginBottom: "10px" }}>
                  <div>
                    <strong>{review.rating}/5</strong>
                    {review.comment ? ` — ${review.comment}` : ""}
                  </div>
                  {dateText && (
                    <div style={{ fontSize: "0.85em", opacity: 0.8 }}>{dateText}</div>
                  )}
                </li>
              );
            })}
          </ul>
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
          />
        </div>
      )}
    </div>
  );
}

export default ServiceDetailsPage;
