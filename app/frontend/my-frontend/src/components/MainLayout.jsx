import { Link, useLocation } from 'react-router-dom';
import LogoIcon from './LogoIcon';
import { IconMoon, IconSun } from './ThemeIcons';
import { authAPI, tokenManager } from '../services/api';
import { useEffect, useState } from 'react';

function MainLayout({ children, theme, toggleTheme }) {
  const location = useLocation();

  const [authState, setAuthState] = useState(() => ({
    isAuthenticated: tokenManager.isAuthenticated(),
    user: tokenManager.getUser(),
  }));

  useEffect(() => {
    const updateAuth = () => {
      setAuthState({
        isAuthenticated: tokenManager.isAuthenticated(),
        user: tokenManager.getUser(),
      });
    };

    updateAuth();

    window.addEventListener('authChanged', updateAuth);

    return () => {
      window.removeEventListener('authChanged', updateAuth);
    };
  }, [location.pathname]);

  const { isAuthenticated, user } = authState;

  const displayNameRaw = user
    ? user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.email || 'Użytkowniku'
    : 'Użytkowniku';

  const displayName =
    displayNameRaw.length > 24 ? `${displayNameRaw.slice(0, 21)}…` : displayNameRaw;

  const initialsSource = `${
    (user?.firstName && user.firstName[0]) || (user?.email && user.email[0]) || 'U'
  }${user?.lastName && user.lastName[0] ? user.lastName[0] : ''}`;

  const initials = initialsSource.toUpperCase().slice(0, 2);

  const navLinkClass = (path) => {
    const isActive = location.pathname === path;
    return isActive ? 'nav-link nav-link-active' : 'nav-link';
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">
            <span className="logo-mark">
              <LogoIcon />
            </span>
            <span className="logo-text">REZERWUJ.TO</span>
          </div>

          <nav className="app-nav">
            <Link to="/" className={navLinkClass('/')}>Strona główna</Link>
            <Link to="/services" className={navLinkClass('/services')}>
              Usługi
            </Link>
            <Link to="/salons" className={navLinkClass('/salons')}>
              Firmy
            </Link>
            <Link to="/dashboard" className={navLinkClass('/dashboard')}>
              Panel rezerwacji
            </Link>
            {isAuthenticated && user?.roles?.includes('Admin') && (
              <Link to="/admin" className={navLinkClass('/admin')}>
                Panel administratora
              </Link>
            )}
            {(isAuthenticated && (user?.roles?.includes('Admin') || user?.roles?.includes('CompanyOwner')) && user?.companyId) && (
              <Link to="/company-panel" className={navLinkClass('/company-panel')}>
                Panel Firmy
              </Link>
            )}
          </nav>

          <div className="app-header-actions">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn btn-outline header-login-btn">
                  Logowanie
                </Link>
                <button type="button" className="theme-toggle" onClick={toggleTheme}>
                  <span className="theme-toggle-icon" aria-hidden="true">
                    {theme === 'light' ? <IconMoon filled={false} /> : <IconSun filled={false} />}
                  </span>
                  <span className="theme-toggle-label">
                    {theme === 'light' ? 'Tryb ciemny' : 'Tryb jasny'}
                  </span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/account"
                  className="header-user"
                  aria-label="Przejdź do ustawień konta"
                >
                  <div className="header-user-avatar">{initials}</div>
                  <div className="header-user-text">
                    <span className="header-user-greeting">Witaj,</span>
                    <span className="header-user-name">{displayName}</span>
                  </div>
                </Link>
                <button
                  type="button"
                  className="btn btn-outline header-login-btn"
                  onClick={handleLogout}
                >
                  Wyloguj
                </button>
                <button type="button" className="theme-toggle" onClick={toggleTheme}>
                  <span className="theme-toggle-icon" aria-hidden="true">
                    {theme === 'light' ? <IconMoon filled={false} /> : <IconSun filled={false} />}
                  </span>
                  <span className="theme-toggle-label">
                    {theme === 'light' ? 'Tryb ciemny' : 'Tryb jasny'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={isAuthPage ? 'app-main auth-page' : 'app-main'}>
        {children}
      </main>
    </div>
  );
}

export default MainLayout;
