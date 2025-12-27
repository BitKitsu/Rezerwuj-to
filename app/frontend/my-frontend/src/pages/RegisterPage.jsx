import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Walidacja pól wymaganych
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Imię i nazwisko są wymagane!');
      return;
    }

    // Walidacja hasła
    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne!');
      return;
    }

    if (formData.password.length < 6) {
      setError('Hasło musi mieć minimum 6 znaków!');
      return;
    }
    
    // Sprawdź czy hasło ma cyfrę
    if (!/\d/.test(formData.password)) {
      setError('Hasło musi zawierać przynajmniej jedną cyfrę!');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone
      });
      
      setSuccess(true);
      
      // Po 2 sekundach przekieruj do logowania
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      console.error('Registration error:', err);

      // Szczegółowa obsługa błędów walidacji (zarówno ModelState, jak i IdentityResult)
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        let errorMessages = [];

        if (Array.isArray(errors)) {
          // IdentityResult z backendu: [{ code, description }, ...]
          errorMessages = errors
            .map((e) => e.description || e.Description)
            .filter(Boolean);
        } else if (typeof errors === 'object' && errors !== null) {
          // ModelState: { field: ["komunikat1", ...], ... }
          for (const [, value] of Object.entries(errors)) {
            if (Array.isArray(value)) {
              errorMessages = errorMessages.concat(value);
            }
          }
        }

        if (errorMessages.length > 0) {
          setError(
            <div>
              <strong>Błędy walidacji:</strong>
              <ul className="form-error-list">
                {errorMessages.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          );
        } else {
          setError('Błąd rejestracji. Sprawdź poprawność danych.');
        }
      } else {
        setError(err.response?.data?.title || 'Błąd rejestracji. Spróbuj ponownie.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2 className="form-title">Rejestracja</h2>
        
        {error && (
          <div className="form-message form-message-error">
            {error}
          </div>
        )}

        {success && (
          <div className="form-message form-message-success">
            Rejestracja zakończona sukcesem! Przekierowywanie do logowania...
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-field">
            <label className="form-label" htmlFor="firstName">
              Imię: *
            </label>
            <input
              id="firstName"
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="Jan"
            />
          </div>
          
          <div className="form-field">
            <label className="form-label" htmlFor="lastName">
              Nazwisko: *
            </label>
            <input
              id="lastName"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="Kowalski"
            />
          </div>
          
          <div className="form-field">
            <label className="form-label" htmlFor="email">
              Email: *
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="twoj@email.com"
            />
          </div>
          
          <div className="form-field">
            <label className="form-label" htmlFor="phone">
              Telefon: (opcjonalnie)
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="form-input"
              placeholder="+48 123 456 789"
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="password">
              Hasło:
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="Min. 6 znaków + cyfra"
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="confirmPassword">
              Potwierdź hasło:
            </label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="Powtórz hasło"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="btn btn-primary form-button"
          >
            {loading ? 'Rejestrowanie...' : 'Zarejestruj'}
          </button>
        </form>

        <div className="form-footer">
          <p>Masz już konto? <Link to="/login">Zaloguj się</Link></p>
          <Link to="/">Powrót do strony głównej</Link>
        </div>
        
        <div className="form-help">
          <strong>Wymagania hasła:</strong>
          <ul className="form-help-list">
            <li>Minimum 6 znaków</li>
            <li>Przynajmniej 1 cyfra</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
