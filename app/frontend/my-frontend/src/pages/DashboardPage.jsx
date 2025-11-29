import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { servicesAPI, appointmentsAPI, authAPI, tokenManager } from '../services/api';

function DashboardPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [newCompanyData, setNewCompanyData] = useState({ name: '', address: '' });
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);

  // --- Ładowanie usera z tokena ---
const loadUser = () => {
  console.log('[DashboardPage] Sprawdzam, czy użytkownik jest zalogowany...');
  if (!tokenManager.isAuthenticated()) {
    navigate('/login');
    return;
  }

  const tokenUser = tokenManager.getUser();
  console.log('[DashboardPage] Token user:', tokenUser);

  setUser(tokenUser); // ustawiamy bez dodatkowego fetcha
  setLoadingUser(false);
};

  // --- Ładowanie firmy ---
  const loadCompany = async (user) => {
    if (!user?.companyId) {
      console.log('[DashboardPage] User nie ma przypisanej firmy');
      setCompany(null);
      setLoadingCompany(false);
      return;
    }

    try {
      const data = await authAPI.getCompany(user.companyId);
      console.log('[DashboardPage] Pobrana firma:', data);
      setCompany(data);
    } catch (err) {
      console.error('[DashboardPage] Błąd ładowania firmy:', err);
      setCompany(null);
    } finally {
      setLoadingCompany(false);
    }
  };

  // --- Ładowanie usług i rezerwacji ---
  const loadData = async () => {
    if (!user?.companyId) {
      console.log('[DashboardPage] Brak companyId, nie ładuję usług');
      setServices([]);
      setAppointments([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    try {
      const [servicesRes, appointmentsRes] = await Promise.all([
        servicesAPI.getByCompany(user.companyId),
        appointmentsAPI.getAll(),
      ]);
      console.log('[DashboardPage] Pobrane usługi:', servicesRes.data);
      console.log('[DashboardPage] Pobrane rezerwacje:', appointmentsRes.data);
      setServices(servicesRes.data);
      setAppointments(appointmentsRes.data);
    } catch (err) {
      console.error('[DashboardPage] Błąd ładowania usług/rezerwacji:', err);
      setServices([]);
      setAppointments([]);
    } finally {
      setLoadingData(false);
    }
  };

  // --- Tworzenie nowej firmy ---
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    console.log('[DashboardPage] Tworzę nową firmę:', newCompanyData);
    try {
      const createdCompany = await authAPI.createCompany(newCompanyData);
      console.log('[DashboardPage] Firma utworzona:', createdCompany);
      const updatedUser = { ...user, companyId: createdCompany.id };
      setUser(updatedUser);
      setCompany(createdCompany);
      alert('Firma została utworzona pomyślnie!');
      loadData(); // załaduj usługi po utworzeniu firmy
    } catch (err) {
      console.error('[DashboardPage] Błąd tworzenia firmy:', err);
      alert('Nie udało się utworzyć firmy.');
    }
  };

  // --- Obsługa wyboru daty ---
  const handleDateChange = async (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (selectedService && date) {
      try {
        const response = await appointmentsAPI.getAvailableSlots(selectedService.id, date);
        setAvailableSlots(response.data);
      } catch (err) {
        console.error('[DashboardPage] Błąd pobierania slotów:', err);
        setAvailableSlots([]);
      }
    }
  };

  // --- Rezerwacja usługi ---
  const handleBookAppointment = async (slot) => {
    if (!selectedService || !slot || !user) return;
    try {
      await appointmentsAPI.create({
        serviceId: selectedService.id,
        customerId: user.userId,
        staffId: 'staff-1',
        dateStart: slot.start,
        dateEnd: slot.end,
      });
      alert('Rezerwacja utworzona pomyślnie!');
      loadData();
      setAvailableSlots([]);
      setSelectedService(null);
      setSelectedDate('');
    } catch (err) {
      console.error('[DashboardPage] Błąd tworzenia rezerwacji:', err);
      alert('Błąd podczas tworzenia rezerwacji');
    }
  };

  // --- useEffect ---
  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadCompany(user);
      loadData();
    }
  }, [user]);

  // --- Render ---
  if (loadingUser || loadingCompany || loadingData) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Ładowanie danych...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>📊 Dashboard</h1>
      {user && <p>Witaj, {user.firstName} {user.lastName} ({user.email})</p>}

      {company ? (
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '5px', marginBottom: '1rem' }}>
          <h2>Twoja firma:</h2>
          <p>Nazwa: {company.companyName}</p>
          <p>Email: {company.email}</p>
          <p>Telefon: {company.phone}</p>
          <p>Adres: {company.street}, {company.city}, {company.postalCode}, {company.country}</p>
        </div>
      ) : (
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '5px', marginBottom: '1rem' }}>
          <h2>Nie masz jeszcze firmy</h2>
          <form onSubmit={handleCreateCompany}>
            <input
              type="text"
              placeholder="Nazwa firmy"
              value={newCompanyData.name}
              onChange={e => setNewCompanyData({ ...newCompanyData, name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Adres firmy"
              value={newCompanyData.address}
              onChange={e => setNewCompanyData({ ...newCompanyData, address: e.target.value })}
              required
            />
            <button type="submit">Utwórz firmę</button>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '5px', padding: '1rem' }}>
          <h2>💇 Dostępne usługi</h2>
          {services.length > 0 ? (
            <ul>
              {services.map(service => (
                <li
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  style={{ cursor: 'pointer', backgroundColor: selectedService?.id === service.id ? '#e3f2fd' : 'transparent' }}
                >
                  {service.serviceName} - {service.price} zł
                </li>
              ))}
            </ul>
          ) : <p>Brak usług</p>}
        </div>

        <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '5px', padding: '1rem' }}>
          <h2>📅 Nowa rezerwacja</h2>
          {selectedService ? (
            <>
              <p>Wybrana usługa: {selectedService.serviceName}</p>
              <input type="date" value={selectedDate} onChange={handleDateChange} />
              {availableSlots.length > 0 && (
                <div>
                  {availableSlots.map((slot, idx) => (
                    <button key={idx} onClick={() => handleBookAppointment(slot)}>
                      {new Date(slot.start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : <p>Wybierz usługę z listy po lewej</p>}
        </div>
      </div>

      <div style={{ marginTop: '2rem', border: '1px solid #ddd', borderRadius: '5px', padding: '1rem' }}>
        <h2>📋 Moje rezerwacje</h2>
        {appointments.length > 0 ? (
          <ul>
            {appointments.map(appt => (
              <li key={appt.id}>
                {appt.service?.serviceName || 'Usługa #' + appt.serviceId} - {new Date(appt.dateStart).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : <p>Brak rezerwacji</p>}
      </div>
    </div>
  );
}

export default DashboardPage;
