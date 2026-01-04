import { useEffect, useMemo, useState } from 'react';
import { appointmentsAPI, tokenManager } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

function DashboardPage() {
  const { t, locale } = useI18n();
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
      setError('dashboard.loadError');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointment) => {
    const id = appointment?.id;
    if (!id) return;
    if (appointment?.status === 'cancelled') return;

    if (!window.confirm(t('dashboard.cancelConfirm'))) return;

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
          'dashboard.cancelError',
      );
    } finally {
      setSubmittingCancelId(null);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">{t('common.loading')}</div>;
  }

  const errorText = error
    ? (String(error).startsWith('dashboard.') ? t(error) : error)
    : '';

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>{t('dashboard.title')}</h1>
          {user && (
            <p className="dashboard-greeting">
              {t('dashboard.greeting', {
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
              })}
            </p>
          )}
        </div>
      </header>

      <section className="dashboard-card dashboard-appointments">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0 }}>{t('dashboard.listTitle')}</h2>
          <button type="button" className="btn btn-outline" onClick={loadData}>
            {t('common.refresh')}
          </button>
        </div>

        {errorText ? <div className="dashboard-empty">{errorText}</div> : null}

        {sortedAppointments.length > 0 ? (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>{t('dashboard.company')}</th>
                <th>{t('dashboard.service')}</th>
                <th>{t('dashboard.date')}</th>
                <th>{t('dashboard.time')}</th>
                <th>{t('dashboard.status')}</th>
                <th>{t('dashboard.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedAppointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>{appointment.company?.companyName || '—'}</td>
                  <td>{appointment.service?.serviceName || 'Usługa #' + appointment.serviceId}</td>
                  <td>{new Date(appointment.dateStart).toLocaleDateString(locale)}</td>
                  <td>
                    {new Date(appointment.dateStart).toLocaleTimeString(locale, {
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
                        ? t('dashboard.statusConfirmed')
                        : appointment.status === 'pending'
                        ? t('dashboard.statusPending')
                        : t('dashboard.statusCancelled')}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      disabled={appointment.status === 'cancelled' || submittingCancelId === appointment.id}
                      onClick={() => handleCancel(appointment)}
                    >
                      {submittingCancelId === appointment.id ? t('dashboard.cancelling') : t('dashboard.cancel')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="dashboard-empty">{t('dashboard.empty')}</p>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
