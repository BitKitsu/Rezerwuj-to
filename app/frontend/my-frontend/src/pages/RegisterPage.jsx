import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

const normalizeHumanNameInput = (value) => {
  return String(value || '').trim().replace(/\s+/g, ' ');
};

const sanitizePhoneNumberInput = (value) => {
  const raw = String(value || '');
  const plus = raw.trim().startsWith('+') ? '+' : '';
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  if (!plus && !digits) return '';
  return plus + digits;
};

const formatPhoneDisplay = (value) => {
  const sanitized = sanitizePhoneNumberInput(value);
  if (!sanitized) return '';
  const plus = sanitized.startsWith('+') ? '+' : '';
  const digits = sanitized.replace(/^\+/, '');
  if (!digits) return plus;

  const inferredCountryLen = digits.length > 9 ? Math.min(3, digits.length - 9) : Math.min(3, digits.length);
  const country = digits.slice(0, inferredCountryLen);
  const rest = digits.slice(inferredCountryLen);

  const groups = rest.match(/.{1,3}/g) || [];
  const grouped = groups.join('-');

  return plus + country + (grouped ? ` ${grouped}` : '');
};

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
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
    const { name, value } = e.target;
    let nextValue = value;
    if (name === 'username') {
      nextValue = String(value || '').replace(/\s+/g, '');
    }
    if (name === 'email') {
      nextValue = String(value || '').replace(/\s+/g, '');
    }
    if (name === 'phone') {
      nextValue = formatPhoneDisplay(value);
    }
    setFormData({
      ...formData,
      [name]: nextValue
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const email = String(formData.email || '').trim().toLowerCase();
    const username = String(formData.username || '').replace(/\s+/g, '');
    const firstName = normalizeHumanNameInput(formData.firstName);
    const lastName = normalizeHumanNameInput(formData.lastName);
    const phone = sanitizePhoneNumberInput(formData.phone);

    if (!email) {
      setError('Email jest wymagany!');
      return;
    }

    if (!username) {
      setError('Nazwa użytkownika jest wymagana!');
      return;
    }

    // Walidacja pól wymaganych
    if (!firstName || !lastName) {
      setError('Imię i nazwisko są wymagane!');
      return;
    }

    if (!phone) {
      setError('Numer telefonu jest wymagany!');
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
      await authAPI.register({
        email,
        username,
        password: formData.password,
        firstName,
        lastName,
        phone
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
            <label className="form-label" htmlFor="username">
              Nazwa użytkownika: *
            </label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="np. jankowalski123"
              minLength="3"
              maxLength="50"
            />
          </div>
          
          <div className="form-field">
            <label className="form-label" htmlFor="phone">
              Telefon: *
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="+48 111-222-333"
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="password">
              Hasło: *
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
