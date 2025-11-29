import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function RegisterPage({ setUser, setIsLoggedIn }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('handleSubmit został wywołany');
    setError('');

    // Walidacja pól wymaganych
    const requiredFields = ['firstName','lastName','email','password','confirmPassword'];
    for (let field of requiredFields) {
      if (!formData[field]) {
        setError('Wszystkie wymagane pola muszą być wypełnione.');
        return;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne!');
      return;
    }

    if (formData.password.length < 6) {
      setError('Hasło musi mieć minimum 6 znaków!');
      return;
    }

    if (!/\d/.test(formData.password)) {
      setError('Hasło musi zawierać przynajmniej jedną cyfrę!');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      };
      console.log('➡ Payload do rejestracji:', payload);

      const userData = await authAPI.register(payload);
      console.log('⬅ Odpowiedź backendu:', userData);

      // Sukces: pokaż komunikat i przekierowanie
      setSuccess(true);
      if (userData.user) {
        setUser(userData.user);
        setIsLoggedIn(true);
      }

      // Przekierowanie po 1 sekundzie
      setTimeout(() => navigate('/dashboard'), 1000);

    } catch (err) {
      console.error('❌ Błąd rejestracji:', err);

      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        setError(
          <div>
            <strong>Błędy rejestracji:</strong>
            <ul className="list-disc list-inside mt-1">
              {err.response.data.errors.map((e, idx) => (
                <li key={idx}>{e.description || JSON.stringify(e)}</li>
              ))}
            </ul>
          </div>
        );
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Wystąpił błąd połączenia z serwerem.');
      }

      console.log('➡ Response data:', err.response?.data);
      console.log('➡ Response status:', err.response?.status);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-blue-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transition-all duration-300 transform hover:scale-[1.01] m-4">
        <h2 className="text-3xl font-bold text-center text-blue-800 mb-8">
          📝 Rejestracja
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-6 border border-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-6 border border-green-300">
            ✅ Rejestracja zakończona sukcesem! Przekierowywanie...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Imię*', name: 'firstName', type: 'text' },
            { label: 'Nazwisko*', name: 'lastName', type: 'text' },
            { label: 'Email*', name: 'email', type: 'email' },
            { label: 'Telefon', name: 'phone', type: 'text' },
            { label: 'Hasło*', name: 'password', type: 'password' },
            { label: 'Potwierdź hasło*', name: 'confirmPassword', type: 'password' }
          ].map((f,i) => (
            <div key={i}>
              <label className="block text-gray-700 font-medium mb-2">{f.label}</label>
              <input
                type={f.type}
                name={f.name}
                value={formData[f.name]}
                onChange={handleChange}
                placeholder={f.label}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading || success}
            className={`w-full py-3 text-lg font-semibold rounded-lg transition-all duration-300 shadow-md
              ${loading || success ? 'bg-gray-400 cursor-not-allowed text-gray-700' : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'}`}
          >
            {loading ? 'Rejestrowanie...' : 'Zarejestruj'}
          </button>
        </form>

        <div className="text-center mt-6 space-y-2 text-sm">
          <p className="text-gray-600">
            Masz już konto? <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">Zaloguj się</Link>
          </p>
          <Link to="/" className="text-gray-500 hover:text-gray-700">← Powrót do strony głównej</Link>
        </div>
      </div>
    </div>
  );
}
