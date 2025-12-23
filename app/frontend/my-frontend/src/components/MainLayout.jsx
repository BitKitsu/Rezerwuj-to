import { Link, useLocation } from 'react-router-dom';
import LogoIcon from './LogoIcon';
import { IconMoon, IconSun } from './ThemeIcons';

function MainLayout({ children, theme, toggleTheme }) {
  const location = useLocation();

  const navLinkClass = (path) => {
    const isActive = location.pathname === path;
    return isActive ? 'nav-link nav-link-active' : 'nav-link';
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">
            <span className="logo-mark">
              <LogoIcon />
            </span>
            <span className="logo-text">SalonBook</span>
          </div>

          <nav className="app-nav">
            <Link to="/" className={navLinkClass('/')}>Strona główna</Link>
            <Link to="/services" className={navLinkClass('/services')}>
              Usługi
            </Link>
            <Link to="/salons" className={navLinkClass('/salons')}>
              Salony
            </Link>
            <Link to="/dashboard" className={navLinkClass('/dashboard')}>
              Panel rezerwacji
            </Link>
          </nav>

          <div className="app-header-actions">
            <button type="button" className="theme-toggle" onClick={toggleTheme}>
              <span className="theme-toggle-icon" aria-hidden="true">
                {theme === 'light' ? <IconMoon filled={false} /> : <IconSun filled={false} />}
              </span>
              <span className="theme-toggle-label">
                {theme === 'light' ? 'Tryb ciemny' : 'Tryb jasny'}
              </span>
            </button>
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
