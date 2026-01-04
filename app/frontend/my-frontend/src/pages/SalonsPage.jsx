import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { companiesAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

function SalonsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const appliedPrefillKeyRef = useRef(null);
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

  const prefill = location.state?.prefill;

  useEffect(() => {
    const hasPrefill =
      prefill && (typeof prefill.query === 'string' || typeof prefill.city === 'string');
    if (!hasPrefill) return;
    if (appliedPrefillKeyRef.current === location.key) return;

    appliedPrefillKeyRef.current = location.key;

    if (typeof prefill.query === 'string') {
      setQuery(prefill.query);
    }
    if (typeof prefill.city === 'string') {
      setCity(prefill.city);
    }
    setPage(1);

    navigate(
      {
        pathname: location.pathname,
        search: location.search,
      },
      { replace: true, state: null },
    );
  }, [prefill, location.key, location.pathname, location.search, navigate]);

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
        setError('salons.loadError');
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
        <h1>{t('salons.title')}</h1>
        <p>{t('salons.subtitle')}</p>
      </header>

      <section className="list-filters">
        <div className="list-filters-row">
          <div className="list-filter-group">
            <label className="list-filter-label">{t('common.whatAreYouLookingFor')}</label>
            <input
              type="text"
              className="list-filter-input"
              placeholder={t('salons.queryPlaceholder')}
              value={query}
              onChange={handleQueryChange}
            />
          </div>

          <div className="list-filter-group">
            <label className="list-filter-label">{t('common.city')}</label>
            <input
              type="text"
              className="list-filter-input"
              placeholder={t('salons.cityPlaceholder')}
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
            <label className="list-filter-label">{t('salons.sorting')}</label>
            <select className="list-filter-select" value={sortBy} onChange={handleSortChange}>
              <option value="recommended">{t('salons.sortRecommended')}</option>
              <option value="name_asc">{t('salons.sortNameAsc')}</option>
              <option value="rating">{t('salons.sortRating')}</option>
            </select>
          </div>
        </div>
      </section>

      {loading && <div className="list-state">{t('salons.loading')}</div>}

      {error && !loading && <div className="list-state list-state-error">{t(error)}</div>}

      {!loading && !error && salons.length === 0 && (
        <div className="list-state">{t('salons.empty')}</div>
      )}

      {!loading && !error && salons.length > 0 && (
        <>
          <section className="card-grid">
            {visibleSalons.map((salon) => {
              const name = salon.name || salon.companyName || t('salons.fallbackName');
              const description = salon.description || t('salons.fallbackDescription');
              const cityLabel = salon.city || t('salons.cityUnknown');

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
                    <span>{t('salons.cardHint')}</span>
                  </div>
                </article>
              );
            })}
          </section>

          <div className="list-pagination">
            <div className="list-page-size">
              <span>{t('common.perPage')}</span>
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
                {t('common.previous')}
              </button>
              <span>
                {t('common.page')} {currentPage} {t('common.of')} {pageCount}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={currentPage === pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SalonsPage;
