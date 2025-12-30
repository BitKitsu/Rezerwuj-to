import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companiesAPI } from '../services/api';

function SalonsPage() {
  const navigate = useNavigate();
  const [salons, setSalons] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [sortBy, setSortBy] = useState('recommended');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await companiesAPI.getAll({
          query: query.trim() || undefined,
          city: city.trim() || undefined,
          sort: sortBy === 'recommended' ? undefined : sortBy,
          page,
          pageSize,
        });

        const data = res.data || {};
        const items = data.items || [];
        const total =
          typeof data.totalCount === 'number'
            ? data.totalCount
            : items.length;

        setSalons(items);
        setTotalCount(total);
      } catch (err) {
        console.error('Error loading salons', err);
        setError('Nie udało się pobrać listy salonów. Sprawdź, czy backend działa.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [query, city, sortBy, page, pageSize]);

  useEffect(() => {
    const q = city.trim();
    if (!q || q.length < 2) {
      setCitySuggestions([]);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const res = await companiesAPI.getCities(q);
        if (!cancelled) {
          setCitySuggestions(res.data || []);
        }
      } catch (err) {
        console.error('City suggestions load error (salons):', err);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [city]);

  const pageCount = Math.max(1, Math.ceil((totalCount || salons.length) / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleSalons = salons;

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setPage(1);
  };

  const handleCityChange = (e) => {
    setCity(e.target.value);
    setPage(1);
  };

  return (
    <div className="list-page">
      <header className="list-header">
        <h1>Firmy usługowe</h1>
        <p>Znajdź firmę w swoim mieście i umów wizytę w kilka kliknięć.</p>
      </header>

      <section className="list-filters">
        <div className="list-filters-row">
          <div className="list-filter-group">
            <label className="list-filter-label">Czego szukasz?</label>
            <input
              type="text"
              className="list-filter-input"
              placeholder="Nazwa firmy lub usługi"
              value={query}
              onChange={handleQueryChange}
            />
          </div>

          <div className="list-filter-group">
            <label className="list-filter-label">Miasto</label>
            <input
              type="text"
              className="list-filter-input"
              placeholder="np. Warszawa"
              value={city}
              onChange={handleCityChange}
              list="salons-city-options"
            />
            <datalist id="salons-city-options">
              {citySuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="list-filter-group">
            <label className="list-filter-label">Sortowanie</label>
            <select className="list-filter-select" value={sortBy} onChange={handleSortChange}>
              <option value="recommended">Polecane (placeholder)</option>
              <option value="name_asc">Nazwa (A–Z)</option>
              <option value="rating">Najwyżej oceniane</option>
            </select>
          </div>
        </div>
      </section>

      {loading && <div className="list-state">Ładowanie firm...</div>}

      {error && !loading && <div className="list-state list-state-error">{error}</div>}

      {!loading && !error && salons.length === 0 && (
        <div className="list-state">Brak dopasowanych firm. Zmień kryteria wyszukiwania.</div>
      )}

      {!loading && !error && salons.length > 0 && (
        <>
          <section className="card-grid">
            {visibleSalons.map((salon) => {
              const name = salon.name || salon.companyName || 'Salon fryzjerski';
              const description = salon.description || 'Profesjonalne usługi fryzjerskie.';
              const cityLabel = salon.city || 'Miasto nieznane';

              return (
                <article
                  key={salon.id}
                  className="card card-clickable salon-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    navigate(`/salons/${salon.id}`, {
                      state: { salon },
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/salons/${salon.id}`, {
                        state: { salon },
                      });
                    }
                  }}
                >
                  <div className="salon-card-header">
                    <div className="salon-avatar" />
                    <div>
                      <div className="salon-name">{name}</div>
                      <div className="salon-meta">{cityLabel}</div>
                    </div>
                  </div>

                  <p className="salon-description">{description}</p>

                  <div className="salon-footer">
                    <span>Kliknij firmę, aby zobaczyć oddziały i szczegóły.</span>
                  </div>
                </article>
              );
            })}
          </section>

          <div className="list-pagination">
            <div className="list-page-size">
              <span>Na stronie:</span>
              <select value={pageSize} onChange={handlePageSizeChange}>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </div>

            <div className="list-page-controls">
              <button
                type="button"
                className="btn btn-outline"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Poprzednia
              </button>
              <span>
                Strona {currentPage} z {pageCount}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={currentPage === pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Następna
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SalonsPage;
