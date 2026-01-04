import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

function LoginPage() {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    loginIdentifier: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const removeWhitespace = (value) => String(value ?? '').replace(/\s+/g, '');

  const handleClose = () => {
    navigate('/');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'loginIdentifier' || name === 'password') {
      setFormData((prev) => ({
        ...prev,
        [name]: removeWhitespace(value)
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleKeyDownNoWhitespace = (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
    }
  };

  const handlePasteNoWhitespace = (e) => {
    const name = e.target?.name;
    if (name !== 'loginIdentifier' && name !== 'password') return;

    const pasted = e.clipboardData?.getData('text') ?? '';
    const sanitized = removeWhitespace(pasted);

    const target = e.target;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const nextValue = `${target.value.slice(0, start)}${sanitized}${target.value.slice(end)}`;

    e.preventDefault();
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const next = {
        loginIdentifier: removeWhitespace(formData.loginIdentifier),
        password: removeWhitespace(formData.password)
      };

      await authAPI.login({
        ...next
      });
      
      // JWT tokeny są automatycznie zapisywane w authAPI.login()
      // Przekieruj do dashboardu
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      
      // Obsługa błędów
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 401) {
        setError('Nieprawidłowy email lub hasło.');
      } else if (err.response?.status === 400) {
        setError('Nieprawidłowe dane logowania.');
      } else {
        setError('Błąd połączenia z serwerem. Sprawdź czy backend działa.');
      }
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading
    && String(formData.loginIdentifier || '').length > 0
    && String(formData.password || '').length > 0;

  return (
    <div className="auth-modal-overlay" onClick={handleClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="auth-modal-close" onClick={handleClose} aria-label={t('common.close')}>
          ×
        </button>
        <div className="auth-modal-body">
          <h2 className="auth-modal-title">{t('auth.loginTitle')}</h2>
          <p className="auth-modal-subtitle">{t('auth.loginSubtitle')}</p>

          {error && (
            <div className="form-message form-message-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-field">
              <label className="form-label" htmlFor="loginIdentifier">
                {t('auth.email')}
              </label>
              <input
                id="loginIdentifier"
                type="email"
                name="loginIdentifier"
                value={formData.loginIdentifier}
                onChange={handleChange}
                onKeyDown={handleKeyDownNoWhitespace}
                onPaste={handlePasteNoWhitespace}
                required
                className="form-input"
                placeholder="jan@example.com"
                autoComplete="email"
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="password">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onKeyDown={handleKeyDownNoWhitespace}
                onPaste={handlePasteNoWhitespace}
                required
                className="form-input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-primary form-button"
            >
              {loading ? t('auth.loggingIn') : t('auth.loginAction')}
            </button>
          </form>

          <div className="form-footer">
            <p>
              {t('auth.noAccount')} <Link to="/register">{t('auth.signUp')}</Link>
            </p>
          </div>

          <div className="form-info">
            <small>
              <strong>{t('auth.testData')}:</strong>
              <br />
              {t('auth.testEmail')}: test@example.com
              <br />
              {t('auth.testPassword')}: Test123!
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
