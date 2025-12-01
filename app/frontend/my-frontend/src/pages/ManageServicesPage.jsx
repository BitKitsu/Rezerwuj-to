// src/pages/ManageServicesPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { servicesAPI } from '../services/api';

const initialServiceState = { serviceName: '', description: '', price: 0, durationMinutes: 30 };

export default function ManageServicesPage({ user }) {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
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
        alert('Funkcjonalność dodawania/edycji usług jest w budowie.');
    };

    if (loading) return <div style={centerContainerStyle}>Ładowanie usług...</div>;
    if (error) return <div style={errorStyle}>Błąd: {error}</div>;

    return (
        <div style={pageStyle}>
            <h1 style={headerStyle}>Zarządzanie Usługami Firmy</h1>
            
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
        </div>
    );
}

// ----------------------------------------------------
// STYLIZACJE
// ----------------------------------------------------
const pageStyle = { maxWidth: '900px', margin: '40px auto', padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };
const headerStyle = { borderBottom: '2px solid #007bff', paddingBottom: '10px', marginBottom: '20px', color: '#007bff' };
const centerContainerStyle = { padding: '20px', textAlign: 'center' };
const errorStyle = { padding: '20px', textAlign: 'center', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '4px' };
const listStyle = { listStyleType: 'none', padding: 0 };
const listItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #eee' };

const buttonStyle = {
    add: { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px', display: 'block' },
    edit: { backgroundColor: '#ffc107', color: '#333', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px', marginRight: '5px', fontSize: '14px' },
    delete: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }
};
