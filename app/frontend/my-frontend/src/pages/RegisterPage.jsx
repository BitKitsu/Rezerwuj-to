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
      
      // Szczegółowa obsługa błędów walidacji
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        let errorMessages = [];
        
        // Sprawdź różne typy błędów
        for (const [key, value] of Object.entries(errors)) {
          if (Array.isArray(value)) {
            errorMessages = errorMessages.concat(value);
          }
        }
        
        if (errorMessages.length > 0) {
          setError(
            <div>
              <strong>Błędy walidacji:</strong>
              <ul style={{ textAlign: 'left', marginTop: '0.5rem' }}>
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
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ 
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>📝 Rejestracja</h2>
        
        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '0.75rem',
            borderRadius: '5px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '0.75rem',
            borderRadius: '5px',
            marginBottom: '1rem'
          }}>
            ✅ Rejestracja zakończona sukcesem! Przekierowywanie do logowania...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Imię: *
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
              placeholder="Jan"
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Nazwisko: *
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
              placeholder="Kowalski"
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Email: *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
              placeholder="twoj@email.com"
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Telefon: (opcjonalnie)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
              placeholder="+48 123 456 789"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Hasło:
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
              placeholder="Min. 6 znaków + cyfra"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Potwierdź hasło:
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
              placeholder="Powtórz hasło"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1.1rem',
              backgroundColor: loading || success ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading || success ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Rejestrowanie...' : 'Zarejestruj'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p>Masz już konto? <Link to="/login">Zaloguj się</Link></p>
          <Link to="/">Powrót do strony głównej</Link>
        </div>
        
        <div style={{ 
          marginTop: '1rem',
          padding: '0.5rem',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px',
          fontSize: '0.9rem'
        }}>
          <strong>Wymagania hasła:</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', textAlign: 'left' }}>
            <li>Minimum 6 znaków</li>
            <li>Przynajmniej 1 cyfra</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
