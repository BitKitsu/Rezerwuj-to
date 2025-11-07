import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { servicesAPI, appointmentsAPI } from '../services/api';

function DashboardPage() {
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Sprawdź czy użytkownik jest zalogowany
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [servicesRes, appointmentsRes] = await Promise.all([
        servicesAPI.getAll(),
        appointmentsAPI.getAll()
      ]);
      
      setServices(servicesRes.data);
      setAppointments(appointmentsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
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
    if (!selectedService || !slot) return;

    try {
      await appointmentsAPI.create({
        serviceId: selectedService.id,
        customerId: 'current-user', // TODO: Get from auth context
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
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Ładowanie...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1>📊 Panel Zarządzania</h1>
        <button 
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Wyloguj
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Lista usług */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h2>💇 Dostępne Usługi</h2>
          {services.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {services.map(service => (
                <li key={service.id} style={{ 
                  padding: '1rem',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  backgroundColor: selectedService?.id === service.id ? '#e3f2fd' : 'transparent'
                }}
                onClick={() => setSelectedService(service)}
                >
                  <strong>{service.serviceName}</strong>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>
                    {service.description}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    💰 {service.price} zł | ⏱️ {service.durationMinutes} min
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>Brak dostępnych usług</p>
          )}
        </div>

        {/* Rezerwacja */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h2>📅 Nowa Rezerwacja</h2>
          
          {selectedService ? (
            <>
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f0f8ff', borderRadius: '5px' }}>
                <strong>Wybrana usługa:</strong> {selectedService.serviceName}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Wybierz datę:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                />
              </div>

              {availableSlots.length > 0 && (
                <div>
                  <h3>Dostępne terminy:</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => handleBookAppointment(slot)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        {new Date(slot.start).toLocaleTimeString('pl-PL', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#666' }}>Wybierz usługę z listy po lewej stronie</p>
          )}
        </div>
      </div>

      {/* Lista rezerwacji */}
      <div style={{ 
        marginTop: '2rem',
        backgroundColor: 'white', 
        padding: '1.5rem', 
        borderRadius: '10px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
      }}>
        <h2>📋 Moje Rezerwacje</h2>
        {appointments.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Usługa</th>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Data</th>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Godzina</th>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(appointment => (
                <tr key={appointment.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>
                    {appointment.service?.serviceName || 'Usługa #' + appointment.serviceId}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {new Date(appointment.dateStart).toLocaleDateString('pl-PL')}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {new Date(appointment.dateStart).toLocaleTimeString('pl-PL', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '15px',
                      fontSize: '0.9rem',
                      backgroundColor: 
                        appointment.status === 'confirmed' ? '#d4edda' :
                        appointment.status === 'pending' ? '#fff3cd' : '#f8d7da',
                      color:
                        appointment.status === 'confirmed' ? '#155724' :
                        appointment.status === 'pending' ? '#856404' : '#721c24'
                    }}>
                      {appointment.status === 'confirmed' ? '✅ Potwierdzone' :
                       appointment.status === 'pending' ? '⏳ Oczekuje' : '❌ Anulowane'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Nie masz jeszcze żadnych rezerwacji</p>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
