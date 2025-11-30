// src/pages/CreateCompanyPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { companiesAPI, tokenManager, authAPI, decodeToken } from "../services/api"; 

export default function CreateCompanyPage({ user, setUser }) {
  const [companyData, setCompanyData] = useState({
    companyName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    postalCode: "",
    country: "",
    description: "",
    website: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    const dataToSend = { ...companyData, services: [], appointments: [] };

    try {
      const currentUserId = user?.userId || tokenManager.getUser()?.userId;
      if (!currentUserId) throw new Error("Brak ID użytkownika. Proszę zalogować się ponownie.");

      const companyRes = await companiesAPI.create(dataToSend);
      const newCompanyId = companyRes.data.id;

      await authAPI.updateCompanyId(currentUserId, newCompanyId);

      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) throw new Error("Brak Refresh Tokena. Wymagane ponowne logowanie.");

      const refreshRes = await authAPI.refreshToken(refreshToken);
      const finalUserDetails = decodeToken(refreshRes.data.accessToken);

      if (finalUserDetails) {
        tokenManager.setUser(finalUserDetails);
        setUser(finalUserDetails);
        setSuccess(true);

        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        throw new Error("Nie udało się zdekodować końcowego tokena.");
      }

    } catch (err) {
      console.error("Błąd tworzenia firmy:", err);
      const httpStatus = err.response?.status;
      let errorMessage = err.message || "Nieznany błąd";

      if (httpStatus === 401 || httpStatus === 403 || errorMessage.includes("Brak ID użytkownika")) {
        tokenManager.clearTokens();
        navigate('/login');
        errorMessage = "Błąd autoryzacji sesji. Wymagane ponowne logowanie.";
      } else if (err.response?.data?.errors) {
        errorMessage = err.response.data.errors.map(e => e.description).join('; ');
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-blue-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg transition-all duration-300 transform hover:scale-[1.01]">
        <h2 className="text-2xl font-bold text-center text-blue-800 mb-6">Utwórz nową firmę</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 border border-red-300" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 border border-green-300" role="alert">
            Firma utworzona! Przekierowywanie...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {[
            { name: 'companyName', label: 'Nazwa firmy', type: 'text', required: true },
            { name: 'email', label: 'Email kontaktowy', type: 'email', required: true },
            { name: 'phone', label: 'Telefon', type: 'tel', required: true },
            { name: 'website', label: 'Strona WWW (opcjonalnie)', type: 'text', required: false }
          ].map(field => (
            <div key={field.name}>
              <label className="block text-gray-700 font-medium mb-1">{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={companyData[field.name]}
                onChange={handleChange}
                placeholder={field.label}
                required={field.required}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="street"
              placeholder="Ulica i numer"
              value={companyData.street}
              onChange={handleChange}
              required
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            />
            <input
              type="text"
              name="city"
              placeholder="Miasto"
              value={companyData.city}
              onChange={handleChange}
              required
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            />
            <input
              type="text"
              name="postalCode"
              placeholder="Kod pocztowy"
              value={companyData.postalCode}
              onChange={handleChange}
              required
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            />
            <input
              type="text"
              name="country"
              placeholder="Kraj"
              value={companyData.country}
              onChange={handleChange}
              required
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Opis działalności</label>
            <textarea
              name="description"
              value={companyData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Opis firmy"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className={`w-full py-3 text-lg font-semibold rounded-lg transition-all duration-300 shadow-md
              ${loading || success ? 'bg-gray-400 cursor-not-allowed text-gray-700' : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'}`}
          >
            {loading ? "Tworzenie firmy..." : "Utwórz firmę"}
          </button>
        </form>
      </div>
    </div>
  );
}
