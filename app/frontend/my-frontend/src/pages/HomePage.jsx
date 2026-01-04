import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { companiesAPI, servicesAPI, tokenManager } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

function HomePage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);

  const [featuredServices, setFeaturedServices] = useState([]);
  const [featuredSalons, setFeaturedSalons] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const [heroIndex, setHeroIndex] = useState(0);
  const [heroIsFading, setHeroIsFading] = useState(false);

  const categories = useMemo(
    () => [
      { label: t('home.categoryHair'), query: 'strzyżenie', hint: t('home.categoryHairHint') },
      { label: t('home.categoryBarber'), query: 'broda', hint: t('home.categoryBarberHint') },
      { label: t('home.categoryNails'), query: 'paznokcie', hint: t('home.categoryNailsHint') },
      { label: t('home.categoryCosmetology'), query: 'kosmet', hint: t('home.categoryCosmetologyHint') },
      { label: t('home.categoryMassage'), query: 'masaż', hint: t('home.categoryMassageHint') },
      { label: t('home.categoryBrows'), query: 'rzęsy', hint: t('home.categoryBrowsHint') },
    ],
    [t],
  );

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
      } catch {
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [city]);

  useEffect(() => {
    let cancelled = false;

    const loadFeatured = async () => {
      setFeaturedLoading(true);
      try {
        const [servicesRes, salonsRes] = await Promise.all([
          servicesAPI.getAll({ page: 1, pageSize: 10, sort: 'rating' }),
          companiesAPI.getAll({ page: 1, pageSize: 10, sort: 'rating' }),
        ]);

        if (cancelled) return;

        const serviceItems = servicesRes?.data?.items || [];
        const salonItems = salonsRes?.data?.items || [];
        setFeaturedServices(serviceItems);
        setFeaturedSalons(salonItems);
      } catch {
        if (!cancelled) {
          setFeaturedServices([]);
          setFeaturedSalons([]);
        }
      } finally {
        if (!cancelled) {
          setFeaturedLoading(false);
        }
      }
    };

    loadFeatured();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (featuredLoading) return undefined;
    if (!Array.isArray(featuredServices) || featuredServices.length < 2) return undefined;

    let cancelled = false;
    let fadeTimeout = null;

    const interval = setInterval(() => {
      if (cancelled) return;

      setHeroIsFading(true);
      fadeTimeout = setTimeout(() => {
        if (cancelled) return;
        setHeroIndex((idx) => (idx + 1) % featuredServices.length);
        setHeroIsFading(false);
      }, 240);
    }, 4800);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [featuredLoading, featuredServices]);

  const heroService = featuredServices[heroIndex] || featuredServices[0] || null;
  const heroSalonName = heroService?.companyName || heroService?.company?.companyName || t('home.featuredSalonFallback');
  const heroServiceName = heroService?.serviceName || t('home.exampleServiceFallback');
  const heroCity = heroService?.city || heroService?.branch?.city || t('home.yourCityFallback');
  const heroDuration = heroService?.durationMinutes ? `${heroService.durationMinutes} min` : null;
  const heroPrice = Number.isFinite(Number(heroService?.price)) ? `${heroService.price} zł` : null;

  const handleSearch = (nextQuery, nextCity) => {
    navigate('/services', {
      state: {
        prefill: {
          query: String(nextQuery || '').trim(),
          city: String(nextCity || '').trim(),
        },
      },
    });
  };

  const isAuthenticated = tokenManager.isAuthenticated();
  const user = tokenManager.getUser();
  const businessLink = !isAuthenticated
    ? '/login'
    : user?.companyId
      ? '/company-panel'
      : '/account?openCompanyForm=1';

  return (
    <div className="home-page">
      <section className="home-cta home-cta-top">
        <div className="home-cta-card">
          <div>
            <h2>{t('home.businessHeading')}</h2>
            <p>{t('home.businessText')}</p>
          </div>
          <Link to={businessLink} className="btn btn-primary">
            {!isAuthenticated
              ? t('home.businessCtaLogin')
              : user?.companyId
                ? t('home.businessCtaPanel')
                : t('home.businessCtaAdd')}
          </Link>
        </div>
      </section>

      <section className="home-hero">
        <div className="home-hero-text">
          <h1>{t('home.heroTitle')}</h1>
          <p>
            {t('home.heroText')}
          </p>

          <form
            className="home-search"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(searchQuery, city);
            }}
          >
            <div className="home-search-field">
              <label className="home-search-label" htmlFor="home-search-query">
                {t('home.searchQueryLabel')}
              </label>
              <input
                id="home-search-query"
                type="text"
                className="home-search-input"
                placeholder={t('home.searchQueryPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="home-search-field">
              <label className="home-search-label" htmlFor="home-search-city">
                {t('home.searchCityLabel')}
              </label>
              <input
                id="home-search-city"
                type="text"
                className="home-search-input"
                placeholder={t('home.searchCityPlaceholder')}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                list="home-city-options"
              />
              <datalist id="home-city-options">
                {citySuggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <button type="submit" className="btn btn-primary home-search-submit">
              {t('common.search')}
            </button>
          </form>

          <div className="home-hero-actions">
            <Link to="/services" className="btn btn-primary">
              {t('home.browseServices')}
            </Link>
            <Link to="/salons" className="btn btn-outline">
              {t('home.browseCompanies')}
            </Link>
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn btn-ghost">
                  {t('home.login')}
                </Link>
                <Link to="/register" className="btn btn-outline">
                  {t('home.register')}
                </Link>
              </>
            ) : (
              <Link to="/dashboard" className="btn btn-ghost">
                {t('home.myBookings')}
              </Link>
            )}
          </div>
        </div>

        <Link
          to={heroService?.id ? `/services/${heroService.id}` : '/services'}
          state={heroService?.id ? { service: heroService } : undefined}
          className="home-hero-card"
        >
          <div className={heroIsFading ? 'home-hero-showcase home-hero-showcase-fade' : 'home-hero-showcase'}>
            <div className="home-hero-card-header">
              <div className="home-hero-avatar" />
              <div>
                <div className="home-hero-salon-name">{heroSalonName}</div>
                <div className="home-hero-salon-meta">{heroCity}</div>
              </div>
            </div>
            <div className="home-hero-service">
              <div>
                <div className="home-hero-service-name">{heroServiceName}</div>
                <div className="home-hero-service-meta">
                  {[heroDuration, heroService?.branchName || heroService?.branch?.branchName]
                    .filter(Boolean)
                    .join(' | ') || t('home.serviceDetailsHint')}
                </div>
              </div>
              <div className="home-hero-service-price">{heroPrice || '—'}</div>
            </div>
            <div className="home-hero-footer">
              <span>
                {featuredLoading
                  ? t('home.featuredServiceLoading')
                  : t('home.featuredServiceHint')}
              </span>
            </div>
          </div>
        </Link>
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <h2>{t('home.categoriesTitle')}</h2>
          <p>{t('home.categoriesSubtitle')}</p>
        </div>
        <div className="home-categories-grid">
          {categories.map((cat) => (
            <button
              key={cat.label}
              type="button"
              className="home-category-card"
              onClick={() => handleSearch(cat.query, city)}
            >
              <div className="home-category-title">{cat.label}</div>
              <div className="home-category-meta">{cat.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <h2>{t('home.featuredServicesTitle')}</h2>
          <p>{t('home.featuredServicesSubtitle')}</p>
        </div>

        {featuredLoading ? (
          <div className="list-state">{t('home.featuredServiceLoading')}</div>
        ) : featuredServices.length === 0 ? (
          <div className="list-state">{t('home.noFeaturedServices')}</div>
        ) : (
          <section className="card-grid">
            {featuredServices.map((service) => (
              <article
                key={service.id}
                className="card card-clickable service-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/services/${service.id}`, { state: { service } })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/services/${service.id}`, { state: { service } });
                  }
                }}
              >
                <div className="service-card-header">
                  <h2>{service.serviceName}</h2>
                  {service.companyName && <span className="service-company">{service.companyName}</span>}
                </div>
                {service.city && <div className="service-location">{service.city}</div>}
                {service.description && <p className="service-description">{service.description}</p>}
                <div className="service-meta">
                  <span className="service-price">{service.price} zł</span>
                  <span className="service-duration">{service.durationMinutes} min</span>
                </div>
                <div className="service-actions">
                  <span className="service-note">{t('home.clickToBook')}</span>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <h2>{t('home.featuredCompaniesTitle')}</h2>
          <p>{t('home.featuredCompaniesSubtitle')}</p>
        </div>

        {featuredLoading ? (
          <div className="list-state">{t('home.featuredCompaniesLoading')}</div>
        ) : featuredSalons.length === 0 ? (
          <div className="list-state">{t('home.noFeaturedCompanies')}</div>
        ) : (
          <section className="card-grid">
            {featuredSalons.map((salon) => {
              const name = salon.name || salon.companyName || t('home.featuredCompanyFallbackName');
              const description = salon.description || t('home.featuredCompanyFallbackDescription');
              const cityLabel = salon.city || '—';

              return (
                <article
                  key={salon.id}
                  className="card card-clickable salon-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/salons/${salon.id}`, { state: { salon } })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/salons/${salon.id}`, { state: { salon } });
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
                    <span>{t('home.clickToDetails')}</span>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>

      <section className="home-features">
        <h2>{t('home.featuresTitle')}</h2>
        <div className="home-features-grid">
          <div className="home-feature">
            <h3>{t('home.featureCalendarTitle')}</h3>
            <p>{t('home.featureCalendarText')}</p>
          </div>
          <div className="home-feature">
            <h3>{t('home.featureServicesTitle')}</h3>
            <p>{t('home.featureServicesText')}</p>
          </div>
          <div className="home-feature">
            <h3>{t('home.featureCustomerPanelTitle')}</h3>
            <p>{t('home.featureCustomerPanelText')}</p>
          </div>
        </div>
      </section>

    </div>
  );
}

export default HomePage;
