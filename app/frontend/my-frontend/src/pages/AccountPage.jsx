import { tokenManager } from '../services/api';

function AccountPage() {
  const user = tokenManager.getUser();

  const displayName = user
    ? user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.email || 'Użytkownik'
    : 'Użytkownik';

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Ustawienia konta</h1>
          <p className="dashboard-greeting">
            Zarządzaj podstawowymi informacjami o swoim koncie SalonBook.
          </p>
        </div>
      </header>

      <section className="dashboard-card">
        <h2>Dane użytkownika</h2>
        <p><strong>Nazwa wyświetlana:</strong> {displayName}</p>
        {user?.email && <p><strong>Email:</strong> {user.email}</p>}
        {user?.firstName && <p><strong>Imię:</strong> {user.firstName}</p>}
        {user?.lastName && <p><strong>Nazwisko:</strong> {user.lastName}</p>}
        <p className="account-note">
          Szczegółowe ustawienia profilu (zmiana hasła, danych kontaktowych itp.) mogą zostać
          dodane w przyszłej wersji aplikacji.
        </p>
      </section>
    </div>
  );
}

export default AccountPage;
