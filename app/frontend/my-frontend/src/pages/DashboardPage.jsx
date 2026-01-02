import { useEffect, useMemo, useState } from 'react';
import { appointmentsAPI, tokenManager } from '../services/api';

function DashboardPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingCancelId, setSubmittingCancelId] = useState(null);
  const [user, setUser] = useState(null);

  const sortedAppointments = useMemo(() => {
    return [...(appointments || [])].sort((a, b) => {
      const da = new Date(a?.dateStart || 0).getTime();
      const db = new Date(b?.dateStart || 0).getTime();
      return db - da;
    });
  }, [appointments]);

  useEffect(() => {
    const userData = tokenManager.getUser();
    setUser(userData);

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setError('');
    try {
      const appointmentsRes = await appointmentsAPI.getMy(300);
      setAppointments(appointmentsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Nie udało się pobrać rezerwacji.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointment) => {
    const id = appointment?.id;
    if (!id) return;
    if (appointment?.status === 'cancelled') return;

    if (!window.confirm('Na pewno anulować rezerwację?')) return;

    setSubmittingCancelId(id);
    setError('');
    try {
      await appointmentsAPI.cancelMy(id);
      await loadData();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      setError(
        err?.response?.data?.message ||
          (typeof err?.response?.data === 'string' ? err.response.data : '') ||
          'Nie udało się anulować rezerwacji.',
      );
    } finally {
      setSubmittingCancelId(null);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Ładowanie...</div>;
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Moje rezerwacje</h1>
          {user && (
            <p className="dashboard-greeting">
              Witaj, {user.firstName} {user.lastName} ({user.email})
            </p>
          )}
        </div>
      </header>

      <section className="dashboard-card dashboard-appointments">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Lista rezerwacji</h2>
          <button type="button" className="btn btn-outline" onClick={loadData}>
            Odśwież
          </button>
        </div>

        {error ? <div className="dashboard-empty">{error}</div> : null}

        {sortedAppointments.length > 0 ? (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Firma</th>
                <th>Usługa</th>
                <th>Data</th>
                <th>Godzina</th>
                <th>Status</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {sortedAppointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>{appointment.company?.companyName || '—'}</td>
                  <td>{appointment.service?.serviceName || 'Usługa #' + appointment.serviceId}</td>
                  <td>{new Date(appointment.dateStart).toLocaleDateString('pl-PL')}</td>
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
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      disabled={appointment.status === 'cancelled' || submittingCancelId === appointment.id}
                      onClick={() => handleCancel(appointment)}
                    >
                      {submittingCancelId === appointment.id ? 'Anulowanie...' : 'Anuluj'}
                    </button>
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
