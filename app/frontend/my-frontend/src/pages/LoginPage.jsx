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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      
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
    <div className="auth-shell">
      <div className="auth-card">
        <h2 className="form-title">Logowanie</h2>

        {error && (
          <div className="form-message form-message-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-field">
            <label className="form-label" htmlFor="loginIdentifier">
              Nazwa użytkownika lub e-mail
            </label>
            <input
              id="loginIdentifier"
              type="text"
              name="loginIdentifier"
              value={formData.loginIdentifier}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="np. jankowalski lub jan@example.com"
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
          <Link to="/">Powrót do strony głównej</Link>
        </div>

        {/* Dane testowe dla łatwiejszego testowania */}
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
  );
}

export default LoginPage;
