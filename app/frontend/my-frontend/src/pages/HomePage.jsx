import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { companiesAPI, servicesAPI, tokenManager } from '../services/api';

function HomePage() {
  const navigate = useNavigate();

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
      { label: 'Fryzjer', query: 'strzyżenie', hint: 'Strzyżenie, modelowanie, koloryzacja' },
      { label: 'Barber', query: 'broda', hint: 'Broda i włosy — szybkie terminy' },
      { label: 'Paznokcie', query: 'paznokcie', hint: 'Manicure, pedicure, hybryda' },
      { label: 'Kosmetyczka', query: 'kosmet', hint: 'Zabiegi i pielęgnacja twarzy' },
      { label: 'Masaż', query: 'masaż', hint: 'Relaks i regeneracja' },
      { label: 'Brwi i rzęsy', query: 'rzęsy', hint: 'Stylizacja brwi i rzęs' },
    ],
    [],
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
  const heroSalonName = heroService?.companyName || heroService?.company?.companyName || 'Polecany salon';
  const heroServiceName = heroService?.serviceName || 'Przykładowa usługa';
  const heroCity = heroService?.city || heroService?.branch?.city || 'Twoje miasto';
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
  const businessCtaLabel = !isAuthenticated
    ? 'Zaloguj się i dodaj firmę'
    : user?.companyId
      ? 'Przejdź do panelu firmy'
      : 'Dodaj swoją firmę';

  return (
    <div className="home-page">
      <section className="home-cta home-cta-top">
        <div className="home-cta-card">
          <div>
            <h2>Masz firmę usługową?</h2>
            <p>Dodaj ofertę, ustaw grafik i przyjmuj rezerwacje online — bez telefonów.</p>
          </div>
          <Link to={businessLink} className="btn btn-primary">
            {businessCtaLabel}
          </Link>
        </div>
      </section>

      <section className="home-hero">
        <div className="home-hero-text">
          <h1>Umów wizytę online</h1>
          <p>
            Prosty system rezerwacji dla małych firm usługowych. Salony fryzjerskie,
            stylizacja paznokci, salony piękności i inne usługi lokalne w jednym miejscu.
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
                Czego szukasz?
              </label>
              <input
                id="home-search-query"
                type="text"
                className="home-search-input"
                placeholder="Np. strzyżenie, masaż, manicure..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="home-search-field">
              <label className="home-search-label" htmlFor="home-search-city">
                Miasto
              </label>
              <input
                id="home-search-city"
                type="text"
                className="home-search-input"
                placeholder="Np. Warszawa"
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
              Szukaj
            </button>
          </form>

          <div className="home-hero-actions">
            <Link to="/services" className="btn btn-primary">
              Przeglądaj usługi
            </Link>
            <Link to="/salons" className="btn btn-outline">
              Przeglądaj firmy
            </Link>
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn btn-ghost">
                  Zaloguj się
                </Link>
                <Link to="/register" className="btn btn-outline">
                  Załóż konto
                </Link>
              </>
            ) : (
              <Link to="/dashboard" className="btn btn-ghost">
                Moje rezerwacje
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
                    .join(' | ') || 'Sprawdź szczegóły usługi'}
                </div>
              </div>
              <div className="home-hero-service-price">{heroPrice || '—'}</div>
            </div>
            <div className="home-hero-footer">
              <span>
                {featuredLoading
                  ? 'Ładowanie polecanych usług...'
                  : 'Top usługi zmieniają się automatycznie — kliknij, aby przejść do rezerwacji.'}
              </span>
            </div>
          </div>
        </Link>
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <h2>Kategorie</h2>
          <p>Najczęściej wybierane usługi — kliknij i zobacz dostępne terminy.</p>
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
          <h2>Polecane usługi</h2>
          <p>Top 10 usług z najwyższymi ocenami.</p>
        </div>

        {featuredLoading ? (
          <div className="list-state">Ładowanie polecanych usług...</div>
        ) : featuredServices.length === 0 ? (
          <div className="list-state">Brak danych do wyświetlenia. Sprawdź zakładkę „Usługi”.</div>
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
                  <span className="service-note">Kliknij, aby przejść do rezerwacji.</span>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <h2>Polecane firmy</h2>
          <p>Top 10 firm z najwyższymi ocenami.</p>
        </div>

        {featuredLoading ? (
          <div className="list-state">Ładowanie firm...</div>
        ) : featuredSalons.length === 0 ? (
          <div className="list-state">Brak firm do wyświetlenia. Sprawdź zakładkę „Firmy”.</div>
        ) : (
          <section className="card-grid">
            {featuredSalons.map((salon) => {
              const name = salon.name || salon.companyName || 'Firma usługowa';
              const description = salon.description || 'Zobacz dostępne usługi i terminy.';
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
                    <span>Kliknij, aby zobaczyć szczegóły.</span>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>

      <section className="home-features">
        <h2>Co oferuje system</h2>
        <div className="home-features-grid">
          <div className="home-feature">
            <h3>Kalendarz online</h3>
            <p>Przeglądaj wszystkie nadchodzące wizyty w jednym miejscu.</p>
          </div>
          <div className="home-feature">
            <h3>Usługi i cennik</h3>
            <p>Definiuj własne usługi, czas trwania oraz ceny.</p>
          </div>
          <div className="home-feature">
            <h3>Panel klienta</h3>
            <p>Klient może samodzielnie rezerwować i przeglądać swoje wizyty.</p>
          </div>
        </div>
      </section>

    </div>
  );
}

export default HomePage;
