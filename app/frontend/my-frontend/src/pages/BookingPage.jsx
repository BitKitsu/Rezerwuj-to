import React, { useState, useEffect } from 'react';
// Pamiętaj, że musisz zaimportować swoje API do usług i rezerwacji
import { servicesAPI, appointmentsAPI } from '../services/api'; 

function BookingPage() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    
    // Dane klienta, który się umawia
    const [clientData, setClientData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    });
    
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        try {
            // Zakładamy, że getAll() usług jest endpointem publicznym
            const servicesRes = await servicesAPI.getAll(); 
            setServices(servicesRes.data);
        } catch (error) {
            console.error('Error loading services:', error);
            setError('Nie udało się załadować dostępnych usług.');
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = async (e) => {
        const date = e.target.value;
        setSelectedDate(date);
        setAvailableSlots([]);
        
        if (selectedService && date) {
            try {
                // Ta funkcja API musi być publiczna i nie wymagać autoryzacji
                const response = await appointmentsAPI.getAvailableSlots(selectedService.id, date);
                setAvailableSlots(response.data);
            } catch (error) {
                console.error('Error loading slots:', error);
                setError('Błąd ładowania dostępnych terminów.');
                setAvailableSlots([]);
            }
        }
    };

    const handleClientDataChange = (e) => {
        setClientData({
            ...clientData,
            [e.target.name]: e.target.value
        });
    };

    const handleBookAppointment = async (slot) => {
        if (!selectedService) return;

        setError('');
        setSuccess('');

        // Walidacja podstawowych danych klienta
        if (!clientData.firstName || !clientData.email) {
            setError('Imię i adres email są polami wymaganymi.');
            return;
        }

        try {
            // Ważne: W tym miejscu wywołujemy endpoint na backendzie, 
            // który tworzy rezerwację, używając danych klienta, 
            // a NIE wymagając zalogowanego użytkownika (customerId).
            await appointmentsAPI.createPublic({
                serviceId: selectedService.id,
                dateStart: slot.start,
                dateEnd: slot.end,
                // Przekazanie danych klienta
                clientDetails: {
                    firstName: clientData.firstName,
                    lastName: clientData.lastName,
                    email: clientData.email,
                    phone: clientData.phone,
                    // Backend automatycznie ustawi, że to rezerwacja Klienta (roli nie podajemy)
                },
                staffId: 'staff-1', // Możesz to dostosować do wyboru pracownika, jeśli zaimplementujesz
            });
            
            setSuccess('✅ Twoja wizyta została pomyślnie umówiona! Oczekuj na potwierdzenie mailowe.');
            
            // Resetowanie stanu po pomyślnej rezerwacji
            setSelectedService(null);
            setSelectedDate('');
            setAvailableSlots([]);
            setClientData({ firstName: '', lastName: '', email: '', phone: '' });

        } catch (error) {
            console.error('Error booking appointment:', error);
            // Sprawdzenie, czy błąd pochodzi z API (np. 'Slot zajęty')
            const errorMessage = error.response?.data?.message || 'Błąd podczas tworzenia rezerwacji. Spróbuj ponownie.';
            setError(errorMessage);
        }
    };

    // Style dla pól input
    const inputStyle = {
        padding: '0.75rem',
        border: '1px solid #ddd',
        borderRadius: '5px',
        width: '100%',
        boxSizing: 'border-box'
    };

    if (loading) {
        return <div style={{ minHeight: '100vh', backgroundColor: '#eff6ff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>Ładowanie usług...</div>;
    }

    return (
        <div style={{ 
            padding: '2rem', 
            minHeight: '100vh', 
            backgroundColor: '#eff6ff'
        }}>
            <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', color: '#333' }}>Umów się na wizytę 📅</h1>
            
            {/* Komunikaty */}
            {error && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>}
            {success && <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>{success}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '3rem', maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* 1. Wybór Usługi */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', height: 'fit-content' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>1. Wybierz Usługę 💇</h2>
                    {services.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {services.map(service => (
                                <li 
                                    key={service.id} 
                                    onClick={() => { setSelectedService(service); setAvailableSlots([]); setSelectedDate(''); }}
                                    style={{ 
                                        padding: '1rem',
                                        borderBottom: '1px solid #f5f5f5',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                        backgroundColor: selectedService?.id === service.id ? '#e3f2fd' : 'transparent',
                                        borderRadius: '5px'
                                    }}
                                >
                                    <strong style={{ display: 'block' }}>{service.serviceName}</strong>
                                    <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                        💰 {service.price} zł | ⏱️ {service.durationMinutes} min
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (<p>Brak dostępnych usług.</p>)}
                </div>

                {/* 2. Dane Klienta i Termin */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>2. Podaj Dane i Wybierz Termin 🕒</h2>

                    {selectedService ? (
                        <>
                            {/* Formularz Danych Klienta */}
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Twoje dane kontaktowe (Wymagane do rezerwacji)</h3>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <input type="text" name="firstName" placeholder="Imię *" required value={clientData.firstName} onChange={handleClientDataChange} style={inputStyle} />
                                    <input type="text" name="lastName" placeholder="Nazwisko" value={clientData.lastName} onChange={handleClientDataChange} style={inputStyle} />
                                    <input type="email" name="email" placeholder="Email *" required value={clientData.email} onChange={handleClientDataChange} style={{ ...inputStyle, gridColumn: 'span 2' }} />
                                    <input type="tel" name="phone" placeholder="Telefon" value={clientData.phone} onChange={handleClientDataChange} style={{ ...inputStyle, gridColumn: 'span 2' }} />
                                </div>
                                <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>* Pola wymagane</p>
                            </div>
                            
                            {/* Wybór Daty */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Wybierz datę wizyty:</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                    min={new Date().toISOString().split('T')[0]}
                                    style={inputStyle}
                                />
                            </div>

                            {/* Dostępne Terminy */}
                            {selectedDate && availableSlots.length > 0 && (
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Wybierz godzinę:</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                                        {availableSlots.map((slot, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleBookAppointment(slot)}
                                                // Przycisk jest nieaktywny, jeśli brakuje wymaganych danych
                                                disabled={!clientData.firstName || !clientData.email} 
                                                style={{
                                                    padding: '0.75rem',
                                                    backgroundColor: (!clientData.firstName || !clientData.email) ? '#ccc' : '#4CAF50',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    cursor: (!clientData.firstName || !clientData.email) ? 'not-allowed' : 'pointer',
                                                    transition: 'background-color 0.2s'
                                                }}
                                            >
                                                {new Date(slot.start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                            </button>
                                        ))}
                                    </div>
                                    <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#888' }}>
                                        Kliknięcie w godzinę automatycznie rezerwuje wizytę.
                                    </p>
                                </div>
                            )}
                            {selectedDate && availableSlots.length === 0 && (
                                <p style={{ color: '#d32f2f', marginTop: '1rem' }}>Brak wolnych terminów w tym dniu. Wybierz inną datę.</p>
                            )}
                        </>
                    ) : (
                        <p style={{ color: '#666', padding: '1rem', border: '1px dashed #ccc', borderRadius: '5px' }}>
                            Aby kontynuować, wybierz usługę z listy po lewej stronie.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BookingPage;