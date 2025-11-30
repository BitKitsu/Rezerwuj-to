// src/pages/ManageServicesPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { servicesAPI, tokenManager } from '../services/api';

const initialServiceState = { serviceName: '', description: '', price: 0, durationMinutes: 30 };

export default function ManageServicesPage({ user }) {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState(initialServiceState);

    const companyId = user?.companyId;

    useEffect(() => {
        if (!companyId || Number(companyId) <= 0) {
            setError('Brak ID firmy. Nie można zarządzać usługami.');
            setLoading(false);
            return;
        }
        fetchServices();
    }, [companyId]);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const response = await servicesAPI.getByCompany(companyId);
            setServices(response.data);
        } catch (err) {
            setError('Nie udało się załadować listy usług.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let newValue;

        if (name === 'price') {
            const standardizedValue = value.replace(',', '.'); 
            newValue = standardizedValue === '' ? 0 : parseFloat(standardizedValue) || 0; 
        } else if (name === 'durationMinutes') {
            newValue = value === '' ? 0 : parseInt(value) || 0; 
        } else {
            newValue = value === '' ? null : value;
        }

        setCurrentService(prevData => ({
            ...prevData,
            [name]: newValue
        }));
    };

    const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // ✅ Poprawka: companyId jako number
    const serviceToSave = { 
        ...currentService, 
        companyId: Number(companyId)  // <-- tutaj konwersja na int
    };

    try {
        if (serviceToSave.id) {
            await servicesAPI.update(serviceToSave.id, serviceToSave);
        } else {
            await servicesAPI.create(serviceToSave);
        }
        setIsModalOpen(false);
        fetchServices();
    } catch (err) {
        let message = 'Błąd zapisu usługi. Sprawdź, czy dane są poprawne.';
        if (err.response) {
            if (err.response.status === 400) {
                message = err.response.data?.message || 'Błąd danych. Wypełnij poprawnie wszystkie pola.';
            } else if (err.response.status === 403) {
                message = err.response.data?.message || 'Brak uprawnień. Usługa nie należy do Twojej firmy.';
            }
        }
        setError(message);
    } finally {
        setLoading(false);
    }
};

    const handleDelete = async (id) => {
        if (window.confirm('Czy na pewno chcesz usunąć tę usługę?')) {
            try {
                await servicesAPI.delete(id);
                fetchServices();
            } catch (err) {
                let message = 'Nie udało się usunąć usługi.';
                if (err.response?.status === 403) {
                    message = err.response.data?.message || 'Brak uprawnień do usunięcia tej usługi.';
                }
                setError(message);
            }
        }
    };

    const openModal = (service = initialServiceState) => {
        setCurrentService(service);
        setIsModalOpen(true);
    };

    if (loading) return <div style={centerContainerStyle}>Ładowanie usług...</div>;
    if (error) return <div style={errorStyle}>Błąd: {error}</div>;

    return (
        <div style={pageStyle}>
            <h1 style={headerStyle}>🧰 Zarządzanie Usługami Firmy</h1>
            
            <button onClick={() => openModal()} style={buttonStyle.add}>
                + Dodaj Nową Usługę
            </button>

            <ul style={listStyle}>
                {services.map(service => (
                    <li key={service.id} style={listItemStyle}>
                        <span>{service.serviceName} ({service.durationMinutes} min) - {service.price} zł</span>
                        <div>
                            <button onClick={() => openModal(service)} style={buttonStyle.edit}>Edytuj</button>
                            <button onClick={() => handleDelete(service.id)} style={buttonStyle.delete}>Usuń</button>
                        </div>
                    </li>
                ))}
            </ul>

            {isModalOpen && (
                <ServiceModal 
                    service={currentService} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleSave} 
                    onChange={handleInputChange} 
                />
            )}
        </div>
    );
}

// ----------------------------------------------------
// MODAL / FORMULARZ USŁUGI
// ----------------------------------------------------
const ServiceModal = ({ service, onClose, onSave, onChange }) => (
    <div style={modalOverlayStyle}>
        <div style={modalContentStyle}>
            <h3 style={modalHeaderStyle}>{service.id ? 'Edytuj Usługę' : 'Dodaj Usługę'}</h3>
            <form onSubmit={onSave} style={{ display: 'grid', gap: '10px' }}>
                <input 
                    name="serviceName" 
                    type="text" 
                    placeholder="Nazwa usługi" 
                    value={service.serviceName || ''} 
                    onChange={onChange} 
                    style={inputStyle} 
                    required 
                />
                <textarea 
                    name="description" 
                    placeholder="Opis" 
                    value={service.description || ''} 
                    onChange={onChange} 
                    style={inputStyle} 
                    rows="2" 
                />
                <input 
                    name="price" 
                    type="number" 
                    step="0.01" 
                    placeholder="Cena (zł)" 
                    value={service.price !== null && service.price !== undefined ? String(service.price) : ''} 
                    onChange={onChange} 
                    style={inputStyle} 
                    required 
                />
                <input 
                    name="durationMinutes" 
                    type="number" 
                    placeholder="Czas trwania (min)" 
                    value={service.durationMinutes !== null && service.durationMinutes !== undefined ? String(service.durationMinutes) : ''} 
                    onChange={onChange} 
                    style={inputStyle} 
                    required 
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <button type="button" onClick={onClose} style={buttonStyle.cancel}>Anuluj</button>
                    <button type="submit" style={buttonStyle.primary}>Zapisz</button>
                </div>
            </form>
        </div>
    </div>
);

// ----------------------------------------------------
// STYLIZACJE
// ----------------------------------------------------
const pageStyle = { maxWidth: '900px', margin: '40px auto', padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };
const headerStyle = { borderBottom: '2px solid #007bff', paddingBottom: '10px', marginBottom: '20px', color: '#007bff' };
const inputStyle = { padding: '10px', border: '1px solid #ccc', borderRadius: '4px', width: '100%' };
const centerContainerStyle = { padding: '20px', textAlign: 'center' };
const errorStyle = { padding: '20px', textAlign: 'center', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '4px' };
const listStyle = { listStyleType: 'none', padding: 0 };
const listItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #eee' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: '#fff', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' };
const modalHeaderStyle = { borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px', color: '#333' };

const buttonStyle = {
    primary: { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', transition: 'background-color 0.2s' },
    add: { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px', display: 'block' },
    edit: { backgroundColor: '#ffc107', color: '#333', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px', marginRight: '5px', fontSize: '14px' },
    delete: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
    cancel: { backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer' }
};
