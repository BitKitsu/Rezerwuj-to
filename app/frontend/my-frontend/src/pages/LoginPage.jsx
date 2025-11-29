import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      setSuccess(true);

      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      console.error('Login error:', err);

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
    <div className="min-h-screen w-full flex items-center justify-center bg-blue-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transition-all duration-300 transform hover:scale-[1.01] m-4">
        <h2 className="text-3xl font-bold text-center text-blue-800 mb-8">🔐 Logowanie</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-6 border border-red-300" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-6 border border-green-300" role="alert">
            ✅ Zalogowano! Przekierowywanie...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="jan@example.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Hasło</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className={`w-full py-3 text-lg font-semibold rounded-lg transition-all duration-300 shadow-md
              ${loading || success ? 'bg-gray-400 cursor-not-allowed text-gray-700' : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'}`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logowanie...
              </div>
            ) : 'Zaloguj'}
          </button>
        </form>

        <div className="text-center mt-6 space-y-2 text-sm">
          <p className="text-gray-600">
            Nie masz konta? <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">Zarejestruj się</Link>
          </p>
          <Link to="/" className="text-gray-500 hover:text-gray-700 transition-colors">← Powrót do strony głównej</Link>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
          <strong>Dane testowe:</strong><br />
          Email: test@example.com<br />
          Hasło: Test123!
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
