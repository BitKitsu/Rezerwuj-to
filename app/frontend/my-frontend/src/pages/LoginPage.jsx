import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
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
      
      // Zapisz token i dane użytkownika
      if (response.data.accessToken) {
        localStorage.setItem('token', response.data.accessToken);
        localStorage.setItem('user', JSON.stringify(response.data));
        
        // Przekieruj do dashboardu
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Szczegółowa obsługa błędów
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        let errorMessages = [];
        
        for (const [key, value] of Object.entries(errors)) {
          if (Array.isArray(value)) {
            errorMessages = errorMessages.concat(value);
          }
        }
        
        if (errorMessages.length > 0) {
          setError(
            <div>
              <strong>Błędy logowania:</strong>
              <ul style={{ textAlign: 'left', marginTop: '0.5rem' }}>
                {errorMessages.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          );
        } else {
          setError('Nieprawidłowy email lub hasło.');
        }
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(err.response?.data?.title || 'Błąd logowania. Sprawdź dane i spróbuj ponownie.');
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
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>🔐 Logowanie</h2>
        
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Email:
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
              placeholder="jan@example.com"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
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
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1.1rem',
              backgroundColor: loading ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Logowanie...' : 'Zaloguj'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p>Nie masz konta? <Link to="/register">Zarejestruj się</Link></p>
          <Link to="/">Powrót do strony głównej</Link>
        </div>

        {/* Dane testowe dla łatwiejszego testowania */}
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          backgroundColor: '#f0f8ff',
          borderRadius: '5px'
        }}>
          <small>
            <strong>Dane testowe:</strong><br />
            Email: test@example.com<br />
            Hasło: Test123!
          </small>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
