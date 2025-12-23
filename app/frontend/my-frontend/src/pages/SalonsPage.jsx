import { useEffect, useMemo, useState } from 'react';
import { companiesAPI } from '../services/api';

function SalonsPage() {
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await companiesAPI.getAll();
        setSalons(res.data || []);
      } catch (err) {
        console.error('Error loading salons', err);
        setError('Nie udało się pobrać listy salonów. Sprawdź, czy backend działa.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredSalons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    let items = salons.filter((salon) => {
      if (!normalizedQuery && !city.trim()) return true;

      const name = (salon.name || salon.companyName || '').toLowerCase();
      const description = (salon.description || '').toLowerCase();
      const cityValue = (salon.city || '').toLowerCase();

      const matchesQuery = normalizedQuery
        ? name.includes(normalizedQuery) || description.includes(normalizedQuery)
        : true;

      const matchesCity = city.trim() ? cityValue.includes(city.trim().toLowerCase()) : true;

      return matchesQuery && matchesCity;
    });

    if (sortBy === 'name_asc') {
      items = [...items].sort((a, b) => {
        const an = (a.name || a.companyName || '').localeCompare(b.name || b.companyName || '');
        return an;
      });
    }

    // TODO (backend): sortowanie po odległości i ocenach powinno być realizowane po stronie API

    return items;
  }, [salons, query, city, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredSalons.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleSalons = filteredSalons.slice(startIndex, startIndex + pageSize);

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
        <h1>Salony fryzjerskie</h1>
        <p>Znajdź salon w swoim mieście i umów wizytę w kilka kliknięć.</p>
      </header>

      <section className="list-filters">
        <div className="list-filters-row">
          <div className="list-filter-group">
            <label className="list-filter-label">Czego szukasz?</label>
            <input
              type="text"
              className="list-filter-input"
              placeholder="Nazwa salonu lub usługi"
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
            />
          </div>

          <div className="list-filter-group">
            <label className="list-filter-label">Sortowanie</label>
            <select className="list-filter-select" value={sortBy} onChange={handleSortChange}>
              <option value="recommended">Polecane (placeholder)</option>
              <option value="name_asc">Nazwa (A–Z)</option>
              <option value="distance">Najbliżej (TODO: backend)</option>
              <option value="rating">Najwyżej oceniane (TODO: backend)</option>
            </select>
          </div>
        </div>
      </section>

      {loading && <div className="list-state">Ładowanie salonów...</div>}

      {error && !loading && <div className="list-state list-state-error">{error}</div>}

      {!loading && !error && filteredSalons.length === 0 && (
        <div className="list-state">Brak dopasowanych salonów. Zmień kryteria wyszukiwania.</div>
      )}

      {!loading && !error && filteredSalons.length > 0 && (
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
                    // TODO: nawigacja do szczegółów salonu / ścieżki rezerwacji
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
                    <span>Rezerwacja dostępna po zalogowaniu.</span>
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
