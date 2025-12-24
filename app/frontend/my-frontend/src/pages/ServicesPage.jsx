import { useEffect, useState } from 'react';
import { servicesAPI } from '../services/api';

const demoServices = [
  {
    id: 'demo-1',
    serviceName: 'Strzyżenie damskie',
    description: 'Strzyżenie i modelowanie',
    durationMinutes: 60,
    price: 80,
    companyName: 'Przykładowy Fryzjer',
  },
  {
    id: 'demo-2',
    serviceName: 'Strzyżenie męskie',
    description: 'Profesjonalne strzyżenie',
    durationMinutes: 30,
    price: 50,
    companyName: 'Przykładowy Fryzjer',
  },
];

function ServicesPage() {
  const [services, setServices] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
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
        const res = await servicesAPI.getAll({
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

        // Fallback do danych demo, jeśli backend nie zwraca nic (np. w trybie offline)
        if (!items.length) {
          setServices(demoServices);
          setTotalCount(demoServices.length);
        } else {
          setServices(items);
          setTotalCount(total);
        }
      } catch (err) {
        console.error('Error loading services', err);
        setError('Nie udało się pobrać listy usług. Sprawdź, czy backend działa.');
        // W trybie błędu zostaw ostatnie dane; jeśli ich nie ma, pokaż demo
        if (!services.length) {
          setServices(demoServices);
          setTotalCount(demoServices.length);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [query, city, sortBy, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil((totalCount || services.length) / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleServices = services;

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

  const hasRealData = services.length > 0;

  return (
    <div className="list-page">
      <header className="list-header">
        <h1>Umów wizytę w salonie</h1>
        <p>Przeglądaj dostępne usługi i znajdź idealny termin dla siebie.</p>
      </header>

      <section className="list-filters">
        <div className="list-filters-row">
          <div className="list-filter-group">
            <label className="list-filter-label">Czego szukasz?</label>
            <input
              type="text"
              className="list-filter-input"
              placeholder="Nazwa usługi lub salonu"
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
              <option value="price_asc">Cena: od najniższej</option>
              <option value="price_desc">Cena: od najwyższej</option>
              <option value="duration_asc">Czas trwania: najkrótszy</option>
              <option value="distance">Najbliżej (TODO: backend)</option>
              <option value="rating">Najwyżej oceniane (TODO: backend)</option>
            </select>
          </div>
        </div>
      </section>

      {loading && <div className="list-state">Ładowanie usług...</div>}

      {error && !loading && (
        <div className="list-state list-state-error">{error}</div>
      )}

      {!loading && !error && services.length === 0 && (
        <div className="list-state">Brak dopasowanych usług. Zmień kryteria wyszukiwania.</div>
      )}

      {!loading && !error && services.length > 0 && (
        <>
          {!hasRealData && (
            <div className="list-state list-state-spaced">
              Brak danych z backendu. Poniżej przykładowe usługi demonstracyjne.
            </div>
          )}

          <section className="card-grid">
            {visibleServices.map((service) => (
              <article
                key={service.id}
                className="card card-clickable service-card"
                role="button"
                tabIndex={0}
                onClick={() => {
                  // TODO: nawigacja do szczegółów usługi / ścieżki rezerwacji
                }}
              >
                <div className="service-card-header">
                  <h2>{service.serviceName}</h2>
                  {service.companyName && (
                    <span className="service-company">{service.companyName}</span>
                  )}
                </div>

                {service.description && (
                  <p className="service-description">{service.description}</p>
                )}

                <div className="service-meta">
                  <span className="service-price">{service.price} zł</span>
                  <span className="service-duration">{service.durationMinutes} min</span>
                </div>

                <div className="service-actions">
                  <span className="service-note">
                    Rezerwacji dokonasz po zalogowaniu w panelu.
                  </span>
                </div>
              </article>
            ))}
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

export default ServicesPage;
