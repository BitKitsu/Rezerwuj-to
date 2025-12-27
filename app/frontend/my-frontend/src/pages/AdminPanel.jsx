import React from 'react';
import '../admin.css';

const AdminPanel = () => {
  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1 className="admin-page__title">Panel administratora</h1>
        <p className="admin-page__subtitle">
          To jest wstępna wersja panelu admina. Tutaj w przyszłości dodamy listę użytkowników,
          firm i dodatkowe operacje administracyjne.
        </p>
      </header>

      <section className="admin-page__content">
        <div className="admin-card">
          <h2 className="admin-card__title">Status</h2>
          <p className="admin-card__body">
            Zalogowany użytkownik ma rolę <strong>Admin</strong> i ma dostęp do tego widoku.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AdminPanel;
