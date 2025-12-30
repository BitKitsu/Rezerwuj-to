import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { branchesAPI, companiesAPI } from "../services/api";

function CompanyDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const initialCompany = location.state?.salon || location.state?.company || null;

  const [company, setCompany] = useState(() => initialCompany);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [companyRes, branchesRes] = await Promise.all([
          companiesAPI.getById(id),
          branchesAPI.getByCompany(id),
        ]);

        if (!cancelled) {
          setCompany(companyRes.data);
          setBranches(branchesRes.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Nie udało się pobrać szczegółów firmy.");
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
  }, [id]);

  const companyName = company?.companyName || company?.name || "Firma";

  const addressText = useMemo(() => {
    if (!company) return null;
    const streetLine = [company.streetName, company.streetNumber]
      .filter(Boolean)
      .join(" ");
    const cityLine = [company.postalCode, company.city].filter(Boolean).join(" ");
    const lines = [streetLine, cityLine].filter((x) => String(x).trim().length > 0);
    return lines.length ? lines.join(", ") : null;
  }, [company]);

  const hoursText = useMemo(() => {
    const open = company?.openingHour;
    const close = company?.closingHour;
    if (open && close) return `${open}–${close}`;
    if (open) return open;
    if (close) return close;
    return null;
  }, [company?.openingHour, company?.closingHour]);

  if (loading) {
    return <div className="list-page">Ładowanie szczegółów firmy...</div>;
  }

  if (error) {
    return (
      <div className="list-page">
        <div className="list-state list-state-error">{error}</div>
        <Link to="/salons" className="btn btn-outline">
          Wróć do listy firm
        </Link>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="list-page">
        <div className="list-state">Nie znaleziono firmy.</div>
        <Link to="/salons" className="btn btn-outline">
          Wróć do listy firm
        </Link>
      </div>
    );
  }

  return (
    <div className="list-page">
      <header className="list-header">
        <h1>{companyName}</h1>
        {company.city && <p>{company.city}</p>}
      </header>

      <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
        {company.description && <p>{company.description}</p>}

        {addressText && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Adres:</strong> {addressText}
          </div>
        )}

        {company.phone && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Telefon:</strong> {company.phone}
          </div>
        )}

        {hoursText && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Godziny otwarcia:</strong> {hoursText}
          </div>
        )}

        {company.email && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Email:</strong> {company.email}
          </div>
        )}

        <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link to="/salons" className="btn btn-outline">
            Wróć
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
        <h2 style={{ marginTop: 0 }}>Oddziały</h2>

        {branches.length === 0 ? (
          <p>Brak zdefiniowanych oddziałów.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "18px" }}>
            {branches.map((branch) => {
              const line1 = [branch.branchName, branch.city]
                .filter(Boolean)
                .join(" · ");
              const line2 = [branch.streetName, branch.streetNumber]
                .filter(Boolean)
                .join(" ");

              return (
                <li
                  key={branch.id}
                  style={{ marginBottom: "10px", cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/services?branchId=${branch.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/services?branchId=${branch.id}`);
                    }
                  }}
                >
                  <div>
                    <strong>{line1}</strong>
                  </div>
                  {line2 && <div style={{ opacity: 0.85 }}>{line2}</div>}
                </li>
              );
            })}
          </ul>
        )}

        <div style={{ marginTop: "12px", opacity: 0.85 }}>
          Kliknij usługę na liście usług, aby zobaczyć szczegóły i zarezerwować termin.
        </div>
      </div>
    </div>
  );
}

export default CompanyDetailsPage;
