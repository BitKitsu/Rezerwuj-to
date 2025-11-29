import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { tokenManager, authAPI } from '../services/api';

function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    const [isLoggedIn, setIsLoggedIn] = useState(tokenManager.isAuthenticated());
    const [user, setUser] = useState(tokenManager.getUser());

    useEffect(() => {
        setIsLoggedIn(tokenManager.isAuthenticated());
        setUser(tokenManager.getUser());
    }, [location.pathname]);  // <--- poprawnione

    const handleLogout = async () => {
        try {
            if (authAPI.logout) {
                await authAPI.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            tokenManager.clearTokens();
            setIsLoggedIn(false);
            setUser(null);
            navigate('/');
        }
    };

    return (
        <header
            style={{
                backgroundColor: '#3b82f6',
                padding: '1rem 2rem',
                height: '70px',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    Salon
                </Link>

                <Link to="/booking" style={{ color: '#fff', opacity: 0.8, textDecoration: 'none', marginLeft: '1.5rem' }}>
                    Rezerwuj Wizytę
                </Link>

                {isLoggedIn && (
                    <Link to="/dashboard" style={{ color: '#ffeb3b', textDecoration: 'none', fontWeight: 'bold' }}>
                        Panel
                    </Link>
                )}
            </div>

            <div>
                {isLoggedIn ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link
                            to="/dashboard"
                            style={{
                                fontSize: '0.9rem',
                                color: 'white',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '5px',
                                transition: 'background-color 0.2s',
                                fontWeight: 'bold'
                            }}
                        >
                            Witaj, {user?.firstName || 'Użytkowniku'} ({user?.role})
                        </Link>

                        <button
                            onClick={handleLogout}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer'
                            }}
                        >
                            Wyloguj
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <Link
                            to="/company/create"
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#10b981',
                                color: 'white',
                                borderRadius: '5px',
                                textDecoration: 'none',
                                fontWeight: 'bold'
                            }}
                        >
                            Załóż Firmę
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header;
