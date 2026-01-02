import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function LoginPage() {
  const [formData, setFormData] = useState({
    loginIdentifier: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'loginIdentifier' || name === 'password' ? value.trim() : value;

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.login({
        ...formData,
        loginIdentifier: formData.loginIdentifier.trim(),
        password: formData.password.trim()
      });
      
      // JWT tokeny są automatycznie zapisywane w authAPI.login()
      // Przekieruj do dashboardu
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      
      // Obsługa błędów
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 401) {
        setError('Nieprawidłowy email lub hasło.');
      } else if (err.response?.status === 400) {
        setError('Nieprawidłowe dane logowania.');
      } else {
        setError('Błąd połączenia z serwerem. Sprawdź czy backend działa.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={handleClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="auth-modal-close" onClick={handleClose} aria-label="Zamknij">
          ×
        </button>
        <div className="auth-modal-body">
          <h2 className="auth-modal-title">Zaloguj się</h2>
          <p className="auth-modal-subtitle">Zaloguj się, aby rezerwować i zarządzać wizytami.</p>

          {error && (
            <div className="form-message form-message-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-field">
              <label className="form-label" htmlFor="loginIdentifier">
                Email
              </label>
              <input
                id="loginIdentifier"
                type="email"
                name="loginIdentifier"
                value={formData.loginIdentifier}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="jan@example.com"
                autoComplete="email"
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="password">
                Hasło
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary form-button"
            >
              {loading ? 'Logowanie...' : 'Zaloguj'}
            </button>
          </form>

          <div className="form-footer">
            <p>
              Nie masz konta? <Link to="/register">Zarejestruj się</Link>
            </p>
          </div>

          <div className="form-info">
            <small>
              <strong>Dane testowe:</strong>
              <br />
              Email: test@example.com
              <br />
              Hasło: Test123!
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
