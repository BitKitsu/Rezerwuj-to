import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-text">
          <h1>Umów wizytę online</h1>
          <p>
            Prosty system rezerwacji dla małych firm usługowych. Salony fryzjerskie,
            stylizacja paznokci, salony piękności i inne usługi lokalne w jednym miejscu.
          </p>

          <div className="home-hero-actions">
            <Link to="/services" className="btn btn-primary">
              Przeglądaj usługi
            </Link>
            <Link to="/login" className="btn btn-ghost">
              Zaloguj się
            </Link>
            <Link to="/register" className="btn btn-outline">
              Załóż konto
            </Link>
          </div>
        </div>

        <Link to="/services" className="home-hero-card">
          <div className="home-hero-card-header">
            <div className="home-hero-avatar" />
            <div>
              <div className="home-hero-salon-name">Przykładowy Fryzjer</div>
              <div className="home-hero-salon-meta">Strzyżenie damskie i męskie</div>
            </div>
          </div>
          <div className="home-hero-service">
            <div>
              <div className="home-hero-service-name">Strzyżenie damskie</div>
              <div className="home-hero-service-meta">Modelowanie | 60 min</div>
            </div>
            <div className="home-hero-service-price">80 zł</div>
          </div>
          <div className="home-hero-footer">
            <span>Następny dostępny termin dzisiaj po południu</span>
          </div>
        </Link>
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
