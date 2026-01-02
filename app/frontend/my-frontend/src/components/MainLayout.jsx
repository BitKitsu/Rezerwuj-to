import { Link, useLocation } from 'react-router-dom';
import LogoIcon from './LogoIcon';
import { IconMoon, IconSun } from './ThemeIcons';
import { authAPI, tokenManager } from '../services/api';
import { useEffect, useState } from 'react';

function MainLayout({ children, theme, toggleTheme }) {
  const location = useLocation();

  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'PL';
    const stored = localStorage.getItem('language');
    return stored === 'EN' ? 'EN' : 'PL';
  });

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'PL' ? 'EN' : 'PL'));
  };

  const headerAuthLabel = language === 'PL' ? 'Zaloguj / Rejestruj' : 'Log in / Sign Up';
  const headerBusinessLabel = language === 'PL' ? 'Dodaj firmę' : 'List your business';

  const showListYourBusiness = !isAuthenticated || !user?.companyId;
  const listYourBusinessTo = !isAuthenticated
    ? '/login'
    : user?.companyId
      ? '/company-panel'
      : '/account?openCompanyForm=1';

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
          <Link to="/" className="app-logo" aria-label="Przejdź do strony głównej">
            <span className="logo-mark">
              <LogoIcon />
            </span>
            <span className="logo-text">REZERWUJ.TO</span>
          </Link>

          <nav className="app-nav">
            <Link to="/" className={navLinkClass('/')}>
              Strona główna
            </Link>
            <Link to="/services" className={navLinkClass('/services')}>
              Usługi
            </Link>
            <Link to="/salons" className={navLinkClass('/salons')}>
              Firmy
            </Link>
            {isAuthenticated && (
              <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                Moje rezerwacje
              </Link>
            )}
            {isAuthenticated && user?.roles?.includes('Admin') && (
              <Link to="/admin" className={navLinkClass('/admin')}>
                Panel administratora
              </Link>
            )}
            {(isAuthenticated && user?.companyId) && (
              <Link to="/company-panel" className={navLinkClass('/company-panel')}>
                Panel Firmy
              </Link>
            )}
          </nav>

          <div className="app-header-actions">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="header-auth-btn">
                  <span className="header-auth-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Zm0 2c-4.418 0-8 2.015-8 4.5V21h16v-2.5c0-2.485-3.582-4.5-8-4.5Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span className="header-auth-text">{headerAuthLabel}</span>
                </Link>

                <button
                  type="button"
                  className="header-lang-btn"
                  aria-label="Wybór języka (placeholder)"
                  onClick={toggleLanguage}
                >
                  {language}
                </button>

                {showListYourBusiness && (
                  <Link to={listYourBusinessTo} className="header-business-link">
                    {headerBusinessLabel}
                  </Link>
                )}

                <button
                  type="button"
                  role="switch"
                  aria-checked={theme !== 'light'}
                  className={
                    theme === 'light'
                      ? 'theme-toggle theme-toggle--icon'
                      : 'theme-toggle theme-toggle--icon theme-toggle--dark'
                  }
                  onClick={toggleTheme}
                  aria-label={theme === 'light' ? 'Włącz tryb ciemny' : 'Włącz tryb jasny'}
                >
                  <span
                    className={
                      theme === 'light'
                        ? 'theme-toggle-icon theme-toggle-icon--active'
                        : 'theme-toggle-icon'
                    }
                    aria-hidden="true"
                  >
                    <IconSun filled={false} />
                  </span>
                  <span
                    className={
                      theme !== 'light'
                        ? 'theme-toggle-icon theme-toggle-icon--active'
                        : 'theme-toggle-icon'
                    }
                    aria-hidden="true"
                  >
                    <IconMoon filled={false} />
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

                <button
                  type="button"
                  className="header-lang-btn"
                  aria-label="Wybór języka (placeholder)"
                  onClick={toggleLanguage}
                >
                  {language}
                </button>

                {showListYourBusiness && (
                  <Link to={listYourBusinessTo} className="header-business-link">
                    {headerBusinessLabel}
                  </Link>
                )}

                <button
                  type="button"
                  role="switch"
                  aria-checked={theme !== 'light'}
                  className={
                    theme === 'light'
                      ? 'theme-toggle theme-toggle--icon'
                      : 'theme-toggle theme-toggle--icon theme-toggle--dark'
                  }
                  onClick={toggleTheme}
                  aria-label={theme === 'light' ? 'Włącz tryb ciemny' : 'Włącz tryb jasny'}
                >
                  <span
                    className={
                      theme === 'light'
                        ? 'theme-toggle-icon theme-toggle-icon--active'
                        : 'theme-toggle-icon'
                    }
                    aria-hidden="true"
                  >
                    <IconSun filled={false} />
                  </span>
                  <span
                    className={
                      theme !== 'light'
                        ? 'theme-toggle-icon theme-toggle-icon--active'
                        : 'theme-toggle-icon'
                    }
                    aria-hidden="true"
                  >
                    <IconMoon filled={false} />
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
