import { Link, useLocation } from 'react-router-dom';
import LogoIcon from './LogoIcon';
import { IconMoon, IconSun } from './ThemeIcons';
import { authAPI, tokenManager, notificationsAPI } from '../services/api';
import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useI18n } from '../i18n/I18nContext';

function MainLayout({ children, theme, toggleTheme }) {
  const location = useLocation();

  const { language, toggleLanguage, t, locale } = useI18n();

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

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user?.userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const res = await notificationsAPI.getMyNotifications(false, { skip: 0, take: 50 });
        const items = Array.isArray(res.data) ? res.data : [];
        if (cancelled) return;
        setNotifications(items.slice(0, 20));
        setUnreadCount(items.filter((n) => !n.readAt).length);
      } catch {
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    if (!isAuthenticated || !user?.userId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`http://localhost:5000/notification/hub`, {
        accessTokenFactory: () => tokenManager.getAccessToken() || '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Error)
      .build();

    connection.on('ReceiveNotification', (notification) => {
      setNotifications((prev) => {
        const next = [notification, ...prev].slice(0, 20);
        return next;
      });

      if (!notification?.readAt) {
        setUnreadCount((c) => c + 1);
      }
    });

    connection.start().catch(() => {
    });

    return () => {
      connection.stop().catch(() => {
      });
    };
  }, [isAuthenticated, user?.userId]);

  const markNotificationAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
    } catch {
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n))
    );
    setUnreadCount((c) => (c > 0 ? c - 1 : 0));
  };

  const displayNameRaw = user
    ? user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.email || t('header.userFallback')
    : t('header.userFallback');

  const displayName =
    displayNameRaw.length > 24 ? `${displayNameRaw.slice(0, 21)}…` : displayNameRaw;

  const initialsSource = `${
    (user?.firstName && user.firstName[0]) || (user?.email && user.email[0]) || 'U'
  }${user?.lastName && user.lastName[0] ? user.lastName[0] : ''}`;

  const initials = initialsSource.toUpperCase().slice(0, 2);

  const headerAuthLabel = t('header.auth');
  const headerBusinessLabel = t('header.business');

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
          <Link to="/" className="app-logo" aria-label={t('header.logoAria')}>
            <span className="logo-mark">
              <LogoIcon />
            </span>
            <span className="logo-text">REZERWUJ.TO</span>
          </Link>

          <nav className="app-nav">
            <Link to="/" className={navLinkClass('/')}> 
              {t('header.home')}
            </Link>
            <Link to="/services" className={navLinkClass('/services')}>
              {t('header.services')}
            </Link>
            <Link to="/salons" className={navLinkClass('/salons')}>
              {t('header.companies')}
            </Link>
            {isAuthenticated && (
              <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                {t('header.myBookings')}
              </Link>
            )}
            {isAuthenticated && user?.roles?.includes('Admin') && (
              <Link to="/admin" className={navLinkClass('/admin')}>
                {t('header.adminPanel')}
              </Link>
            )}
            {(isAuthenticated && user?.companyId) && (
              <Link to="/company-panel" className={navLinkClass('/company-panel')}>
                {t('header.companyPanel')}
              </Link>
            )}
          </nav>

          <div className="app-header-actions">
            {!isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="header-lang-btn"
                  aria-label={t('header.languageToggleAria')}
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
                  aria-label={theme === 'light' ? t('header.themeDark') : t('header.themeLight')}
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
              </>
            ) : (
              <>
                {showListYourBusiness && (
                  <Link to={listYourBusinessTo} className="header-business-link">
                    {headerBusinessLabel}
                  </Link>
                )}

                <button
                  type="button"
                  className="header-lang-btn"
                  aria-label={t('header.languageToggleAria')}
                  onClick={toggleLanguage}
                >
                  {language}
                </button>

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
                  aria-label={theme === 'light' ? t('header.themeDark') : t('header.themeLight')}
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

                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen((v) => !v)}
                    aria-label={t('header.notifications')}
                    className="header-icon-btn header-notifications-btn"
                  >
                    <svg
                      fill="currentColor"
                      viewBox="0 0 32 32"
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      aria-hidden="true"
                    >
                      <path d="M28.3 22.247c-1.167-1.419-2.765-3.429-2.765-5.48v-6.53c0-5.625-4.207-10.202-9.584-10.202-5.378 0-9.552 4.577-9.552 10.202v6.53c0 2.016-1.734 3.921-2.833 5.4-0.989 1.328-1.77 2.378-1.242 3.427 0.463 0.923 1.624 1.041 2.583 1.041h5.73c0.002 2.944 2.389 5.331 5.333 5.331s5.333-2.386 5.334-5.331h5.864c0.61 0 2.036 0 2.527-1.038 0.495-1.050-0.297-2.016-1.395-3.351zM15.969 29.871c-1.788 0-3.239-1.448-3.241-3.235h6.482c-0.003 1.787-1.452 3.235-3.241 3.235zM27.168 24.506h-22.262c-0.153 0-0.281-0.005-0.386-0.012 0.206-0.319 0.508-0.727 0.755-1.058 1.218-1.637 3.255-3.949 3.255-6.669v-6.53c0-4.452 3.22-8.073 7.423-8.073s7.455 3.622 7.455 8.073v6.53c0 2.813 1.878 5.164 3.249 6.832 0.231 0.281 0.507 0.617 0.722 0.905-0.064 0.002-0.134 0.003-0.209 0.003z" />
                    </svg>
                    {unreadCount > 0 ? (
                      <span
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          minWidth: 18,
                          height: 18,
                          padding: '0 5px',
                          borderRadius: 999,
                          background: '#e11d48',
                          color: 'white',
                          fontSize: 11,
                          lineHeight: '18px',
                          fontWeight: 700,
                          textAlign: 'center'
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : null}
                  </button>

                  {notificationsOpen ? (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 46,
                        width: 360,
                        maxWidth: 'calc(100vw - 24px)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border-subtle)',
                        borderRadius: 14,
                        boxShadow: 'var(--shadow-soft)',
                        padding: 10,
                        zIndex: 50
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>{t('header.notifications')}</div>
                        <button
                          type="button"
                          onClick={() => setNotificationsOpen(false)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, lineHeight: 1, color: 'inherit' }}
                          aria-label={t('common.close')}
                        >
                          ×
                        </button>
                      </div>

                      {notifications.length === 0 ? (
                        <div style={{ opacity: 0.75, padding: 10 }}>{t('header.notificationsEmpty')}</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflow: 'auto' }}>
                          {notifications.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => markNotificationAsRead(n.id)}
                              style={{
                                textAlign: 'left',
                                border: '1px solid var(--color-border-subtle)',
                                borderRadius: 12,
                                padding: 10,
                                background: n.readAt ? 'transparent' : 'var(--color-primary-soft)',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{n.title}</div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                                  {n.createdAt ? new Date(n.createdAt).toLocaleString(locale) : ''}
                                </div>
                              </div>
                              <div style={{ opacity: 0.9, marginTop: 6, fontSize: 13, whiteSpace: 'pre-wrap' }}>{n.message}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <Link
                  to="/account"
                  className="header-user"
                  aria-label={t('header.accountAria')}
                >
                  <div className="header-user-avatar">{initials}</div>
                  <div className="header-user-text">
                    <span className="header-user-greeting">{t('header.hello')}</span>
                    <span className="header-user-name">{displayName}</span>
                  </div>
                </Link>

                <button
                  type="button"
                  className="btn btn-ghost header-login-btn header-logout-btn"
                  onClick={handleLogout}
                >
                  {t('header.logout')}
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
