// src/pages/ManageCompanyPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companiesAPI } from '../services/api';

export default function ManageCompanyPage({ user }) {
  const navigate = useNavigate();
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const companyId = user?.companyId;

  useEffect(() => {
    if (!companyId || Number(companyId) <= 0) {
      setError('Brak ID firmy przypisanej do konta.');
      setLoading(false);
      return;
    }

    const fetchCompany = async () => {
      try {
        const response = await companiesAPI.getById(companyId);
        setCompanyData(response.data);
      } catch (err) {
        console.error('Błąd pobierania firmy:', err);
        setError('Nie udało się załadować danych firmy.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCompanyData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      // 🔧 Tworzymy payload bez services i appointments
      const { services, appointments, ...payload } = companyData;

      await companiesAPI.update(companyId, payload);

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      console.error('Błąd aktualizacji firmy:', err);
      setError('Nie udało się zapisać zmian. Sprawdź dane.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Ładowanie danych firmy...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Błąd: {error}</div>;
  if (!companyData) return <div className="p-8 text-center">Brak danych do edycji.</div>;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-blue-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg transition-all duration-300 transform hover:scale-[1.01]">
        <h2 className="text-2xl font-bold text-center text-blue-800 mb-6">
          Edytuj firmę
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 border border-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 border border-green-300">
            Dane zapisane! Powrót do panelu...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'companyName', label: 'Nazwa firmy', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'Telefon', type: 'tel', required: true },
            { name: 'street', label: 'Ulica', type: 'text', required: true },
            { name: 'city', label: 'Miasto', type: 'text', required: true },
            { name: 'postalCode', label: 'Kod pocztowy', type: 'text', required: true },
            { name: 'country', label: 'Kraj', type: 'text', required: true },
            { name: 'website', label: 'Strona WWW (opcjonalnie)', type: 'text', required: false },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-gray-700 font-medium mb-1">{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={companyData[field.name] || ''}
                onChange={handleChange}
                placeholder={field.label}
                required={field.required}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              />
            </div>
          ))}

          <div>
            <label className="block text-gray-700 font-medium mb-1">Opis</label>
            <textarea
              name="description"
              value={companyData.description || ''}
              onChange={handleChange}
              rows="4"
              placeholder="Opis firmy"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className={`w-full py-3 text-lg font-semibold rounded-lg transition-all duration-300 shadow-md ${
              loading || success
                ? 'bg-gray-400 cursor-not-allowed text-gray-700'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
            }`}
          >
            {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>
        </form>
      </div>
    </div>
  );
}
