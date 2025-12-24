import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { servicesAPI, appointmentsAPI, authAPI, tokenManager } from '../services/api';

function DashboardPage() {
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Sprawdź czy użytkownik jest zalogowany
    if (!tokenManager.isAuthenticated()) {
      navigate('/login');
      return;
    }

    // Pobierz dane użytkownika
    const userData = tokenManager.getUser();
    setUser(userData);

    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [servicesRes, appointmentsRes] = await Promise.all([
        servicesAPI.getAll({ pageSize: 50 }),
        appointmentsAPI.getAll()
      ]);

      const servicesData = servicesRes.data?.items ?? servicesRes.data ?? [];
      setServices(servicesData);
      setAppointments(appointmentsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Nawet jeśli logout się nie uda, wyczyść lokalnie
      tokenManager.clearTokens();
      navigate('/');
    }
  };

  const handleDateChange = async (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    
    if (selectedService && date) {
      try {
        const response = await appointmentsAPI.getAvailableSlots(selectedService.id, date);
        setAvailableSlots(response.data);
      } catch (error) {
        console.error('Error loading slots:', error);
        setAvailableSlots([]);
      }
    }
  };

  const handleBookAppointment = async (slot) => {
    if (!selectedService || !slot || !user) return;

    try {
      await appointmentsAPI.create({
        serviceId: selectedService.id,
        customerId: user.userId, // Używamy prawdziwego userId z JWT
        staffId: 'staff-1', // TODO: Select staff
        dateStart: slot.start,
        dateEnd: slot.end
      });
      
      alert('Rezerwacja utworzona pomyślnie!');
      loadData(); // Odśwież dane
      setAvailableSlots([]);
      setSelectedService(null);
      setSelectedDate('');
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Błąd podczas tworzenia rezerwacji');
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Ładowanie...</div>;
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Panel zarządzania</h1>
          {user && (
            <p className="dashboard-greeting">
              Witaj, {user.firstName} {user.lastName} ({user.email})
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-danger"
        >
          Wyloguj
        </button>
      </header>

      <section className="dashboard-grid">
        {/* Lista usług */}
        <div className="dashboard-card">
          <h2>Dostępne usługi</h2>
          {services.length > 0 ? (
            <ul className="dashboard-services-list">
              {services.map((service) => (
                <li
                  key={service.id}
                  className={
                    'dashboard-service-item' +
                    (selectedService?.id === service.id ? ' dashboard-service-item--active' : '')
                  }
                  onClick={() => setSelectedService(service)}
                >
                  <div className="dashboard-service-name">{service.serviceName}</div>
                  {service.description && (
                    <div className="dashboard-service-description">{service.description}</div>
                  )}
                  <div className="dashboard-service-meta">
                    Cena: {service.price} zł | Czas: {service.durationMinutes} min
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-empty">Brak dostępnych usług</p>
          )}
        </div>

        {/* Rezerwacja */}
        <div className="dashboard-card">
          <h2>Nowa rezerwacja</h2>
          {selectedService ? (
            <>
              <div className="dashboard-selected-service">
                <strong>Wybrana usługa:</strong> {selectedService.serviceName}
              </div>

              <div className="dashboard-field">
                <label className="dashboard-field-label" htmlFor="reservation-date">
                  Wybierz datę:
                </label>
                <input
                  id="reservation-date"
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="form-input"
                />
              </div>

              {availableSlots.length > 0 && (
                <div className="dashboard-slots">
                  <h3>Dostępne terminy:</h3>
                  <div className="dashboard-slots-grid">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleBookAppointment(slot)}
                        className="dashboard-slot-button"
                      >
                        {new Date(slot.start).toLocaleTimeString('pl-PL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="dashboard-empty">Wybierz usługę z listy po lewej stronie</p>
          )}
        </div>
      </section>

      {/* Lista rezerwacji */}
      <section className="dashboard-card dashboard-appointments">
        <h2>Moje rezerwacje</h2>
        {appointments.length > 0 ? (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Usługa</th>
                <th>Data</th>
                <th>Godzina</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>
                    {appointment.service?.serviceName || 'Usługa #' + appointment.serviceId}
                  </td>
                  <td>
                    {new Date(appointment.dateStart).toLocaleDateString('pl-PL')}
                  </td>
                  <td>
                    {new Date(appointment.dateStart).toLocaleTimeString('pl-PL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <span
                      className={
                        'status-badge ' +
                        (appointment.status === 'confirmed'
                          ? 'status-badge--confirmed'
                          : appointment.status === 'pending'
                          ? 'status-badge--pending'
                          : 'status-badge--cancelled')
                      }
                    >
                      {appointment.status === 'confirmed'
                        ? 'Potwierdzone'
                        : appointment.status === 'pending'
                        ? 'Oczekuje'
                        : 'Anulowane'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="dashboard-empty">Nie masz jeszcze żadnych rezerwacji</p>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
