// DashboardPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { servicesAPI, appointmentsAPI, tokenManager, companiesAPI } from '../services/api';

const DashboardPage = ({ user, setUser }) => {
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);

  // --- Ładowanie użytkownika ---
  const loadUser = () => {
    if (!tokenManager.isAuthenticated()) {
      navigate('/login');
      return;
    }

    const tokenUser = tokenManager.getUser();
    if (!tokenUser?.userId) {
      tokenManager.clearTokens();
      navigate('/login');
      return;
    }

    setUser(tokenUser);
    setLoadingUser(false);
  };

  // --- Ładowanie firmy ---
  const loadCompany = async (userData) => {
    setLoadingCompany(true);

    const companyId = userData?.companyId;
    if (!companyId || companyId <= 0) {
      setCompany(null);
      setLoadingCompany(false);
      return;
    }

    try {
      const response = await companiesAPI.getById(companyId);
      setCompany(response.data);
    } catch (error) {
      console.error('[DASH] Błąd ładowania firmy:', error);
      setCompany(null);
    } finally {
      setLoadingCompany(false);
    }
  };

  // --- Ładowanie usług i rezerwacji ---
  const loadData = async (userData) => {
    const companyId = userData?.companyId;

    if (!companyId || companyId <= 0) {
      setServices([]);
      setAppointments([]);
      setStaff([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    try {
      const [servicesRes, appointmentsRes] = await Promise.all([
        servicesAPI.getByCompany(companyId),
        appointmentsAPI.getAll(),
      ]);

      setServices(servicesRes.data);
      setAppointments(appointmentsRes.data);
    } catch (error) {
      console.error('[DASH] Błąd ładowania danych:', error);
      setServices([]);
      setAppointments([]);
    } finally {
      setLoadingData(false);
    }
  };

  // --- Nawigacja ---
  const navigateToCreateCompany = () => navigate('/create-company');
  const navigateToEditCompany = () => navigate('/manage-company');
  const navigateToManageServices = () => alert('Funkcjonalność zarządzania usług w budowie.');
  const navigateToManageStaff = () => alert('Funkcjonalność zarządzania personelem w budowie.');

  // --- Obsługa daty i slotów ---
  const handleDateChange = async (e) => {
    const date = e.target.value;
    setSelectedDate(date);

    if (selectedService && date) {
      try {
        const response = await appointmentsAPI.getAvailableSlots(selectedService.id, date);
        setAvailableSlots(response.data);
      } catch (err) {
        console.error('[DASH] Błąd pobierania slotów:', err);
        setAvailableSlots([]);
      }
    }
  };

  // --- Rezerwacja ---
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
      loadData(user);
      setSelectedService(null);
      setSelectedDate('');
      setAvailableSlots([]);
    } catch (err) {
      console.error('[DASH] Błąd tworzenia rezerwacji:', err);
      alert('Błąd podczas tworzenia rezerwacji');
    }
  };

  // --- Efekty montowania ---
  useEffect(() => {
    loadUser();

    const handlePageShow = (event) => {
      if (event.persisted) {
        if (tokenManager.isAuthenticated()) {
          window.location.reload();
        } else {
          navigate('/login');
        }
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  useEffect(() => {
    if (user) {
      loadCompany(user);
      loadData(user);
    }
  }, [user]);

  // --- Render loading ---
  if (loadingUser || loadingCompany || loadingData) {
    return (
      <div style={{ padding: 40, textAlign: 'center', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
        <h2 style={{ color: '#007bff' }}>Ładowanie danych...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, backgroundColor: '#f4f7f9', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #ddd', paddingBottom: 10 }}>
        Witaj, {user?.firstName} {user?.lastName}
      </h1>

      {/* --- Panel firmy --- */}
      {company ? (
        <div style={panelStyle('#28a745')}>
          <h2 style={{ margin: 0, marginBottom: 10, color: '#28a745' }}>Zarządzanie firmą: {company.companyName}</h2>
          <p style={{ color: '#555', fontSize: 14 }}>Adres: {company.street}, {company.city} ({company.postalCode})</p>
          {company.description && <p style={{ color: '#333', marginTop: 10, whiteSpace: 'pre-wrap' }}>Opis: {company.description}</p>}

          <button onClick={navigateToEditCompany} style={buttonStyle.action}>Edytuj dane firmy</button>

          <h2 style={{ marginTop: 30, color: '#333' }}>Panel administracyjny</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <button onClick={navigateToManageServices} style={buttonStyle.manage}>
              Lista usług ({services.length})
            </button>
            <button onClick={navigateToManageStaff} style={buttonStyle.manage}>
              Personel ({staff.length})
            </button>
          </div>
        </div>
      ) : (
        <div style={panelStyle('#ffc107', true)}>
          <h2 style={{ color: '#333' }}>Brak aktywnej firmy</h2>
          <p style={{ color: '#555' }}>Musisz utworzyć firmę, aby zarządzać usługami i personelem.</p>
          <button onClick={navigateToCreateCompany} style={buttonStyle.primary}>Utwórz nową firmę</button>
        </div>
      )}

      {/* --- Rezerwacje --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
        <div style={containerStyle}>
          <h2 style={headerStyle}>Nowa rezerwacja</h2>
          {selectedService ? (
            <div style={slotContainerStyle}>
              <p>Wybrana usługa: {selectedService.serviceName} ({selectedService.price} zł)</p>
              <input type="date" value={selectedDate} onChange={handleDateChange} style={inputStyle} />

              {availableSlots.length > 0 ? (
                <div style={{ marginTop: 10 }}>
                  {availableSlots.map((slot, idx) => (
                    <button key={idx} onClick={() => handleBookAppointment(slot)} style={buttonStyle.slot}>
                      {new Date(slot.start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              ) : selectedDate ? <p style={{ color: '#dc3545', marginTop: 10 }}>Brak slotów.</p> : null}
            </div>
          ) : <p style={{ color: '#888' }}>Wybierz usługę z listy, aby rozpocząć rezerwację.</p>}

          <h2 style={{ ...headerStyle, marginTop: 30 }}>Moje rezerwacje ({appointments.length})</h2>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {appointments.slice(0, 3).map(appt => (
              <li key={appt.id} style={listItemStyle}>
                {appt.service?.serviceName || 'Usługa #' + appt.serviceId} — {new Date(appt.dateStart).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
              </li>
            ))}
            {appointments.length > 3 && <li style={{ textAlign: 'center', color: '#007bff' }}>... więcej</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

// --- Style ---
const panelStyle = (color, center = false) => ({
  backgroundColor: '#fff',
  borderLeft: `5px solid ${color}`,
  padding: 20,
  borderRadius: 8,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  marginBottom: 30,
  textAlign: center ? 'center' : 'left'
});

const containerStyle = {
  backgroundColor: '#fff',
  padding: 30,
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  height: 'fit-content'
};

const slotContainerStyle = {
  padding: 15,
  border: '1px solid #007bff',
  borderRadius: 4,
  backgroundColor: '#e3f2fd'
};

const headerStyle = {
  borderBottom: '1px solid #eee',
  paddingBottom: 10,
  marginBottom: 20,
  color: '#333'
};

const inputStyle = {
  padding: 10,
  border: '1px solid #ccc',
  borderRadius: 4,
  width: '100%',
  marginBottom: 10
};

const buttonStyle = {
  primary: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 5,
    cursor: 'pointer',
    marginTop: 15,
    transition: 'background-color 0.2s'
  },
  manage: {
    backgroundColor: '#f8f9fa',
    color: '#333',
    border: '1px solid #ccc',
    padding: '10px 15px',
    borderRadius: 5,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  action: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: 5,
    cursor: 'pointer',
    marginTop: 15,
    fontSize: 14
  },
  slot: {
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    marginRight: 5,
    marginBottom: 5
  }
};

const listItemStyle = {
  padding: '8px 0',
  borderBottom: '1px dotted #eee'
};

export default DashboardPage;
