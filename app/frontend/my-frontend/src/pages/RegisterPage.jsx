import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

const normalizeHumanNameInput = (value) => {
  return String(value || '').trim().replace(/\s+/g, ' ');
};

const sanitizePhoneNumberInput = (value) => {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  if (!digits) return '';
  return `+${digits}`;
};

const formatPhoneDisplay = (value) => {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  if (!digits) {
    return raw.startsWith('+') ? '+' : '';
  }
  const plus = '+';

  const inferredCountryLen = digits.length > 9 ? Math.min(3, digits.length - 9) : Math.min(3, digits.length);
  const country = digits.slice(0, inferredCountryLen);
  const rest = digits.slice(inferredCountryLen);

  const groups = rest.match(/.{1,3}/g) || [];
  const grouped = groups.join('-');

  return plus + country + (grouped ? ` ${grouped}` : '');
};

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');

  const handleClose = () => {
    navigate('/');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === 'username') {
      nextValue = String(value || '').replace(/\s+/g, '');
    }
    if (name === 'email') {
      nextValue = String(value || '').replace(/\s+/g, '');
    }
    if (name === 'phone') {
      nextValue = formatPhoneDisplay(value);
    }
    setFormData({
      ...formData,
      [name]: nextValue
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setVerificationMessage('');

    const email = String(formData.email || '').trim().toLowerCase();
    const username = String(formData.username || '').replace(/\s+/g, '');
    const firstName = normalizeHumanNameInput(formData.firstName);
    const lastName = normalizeHumanNameInput(formData.lastName);
    const phone = sanitizePhoneNumberInput(formData.phone);

    if (step === 1) {
      if (!email) {
        setError('Email jest wymagany!');
        return;
      }

      if (!username) {
        setError('Nazwa użytkownika jest wymagana!');
        return;
      }

      if (!firstName || !lastName) {
        setError('Imię i nazwisko są wymagane!');
        return;
      }

      if (!phone) {
        setError('Numer telefonu jest wymagany!');
        return;
      }

      setStep(2);
      return;
    }

    if (step === 3) {
      const code = String(verificationCode || '').replace(/\D/g, '').slice(0, 6);
      if (code.length !== 6) {
        setError('Kod musi mieć 6 cyfr.');
        return;
      }

      setLoading(true);
      try {
        await authAPI.verifyEmail({
          email,
          code
        });
        setVerified(true);
        setVerificationMessage('Email potwierdzony. Przekierowywanie do logowania...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } catch (err) {
        setError(err.response?.data?.message || 'Nie udało się potwierdzić email.');
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!email) {
      setError('Email jest wymagany!');
      return;
    }

    if (!username) {
      setError('Nazwa użytkownika jest wymagana!');
      return;
    }

    // Walidacja pól wymaganych
    if (!firstName || !lastName) {
      setError('Imię i nazwisko są wymagane!');
      return;
    }

    if (!phone) {
      setError('Numer telefonu jest wymagany!');
      return;
    }

    // Walidacja hasła
    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne!');
      return;
    }

    if (formData.password.length < 6) {
      setError('Hasło musi mieć minimum 6 znaków!');
      return;
    }
    
    // Sprawdź czy hasło ma cyfrę
    if (!/\d/.test(formData.password)) {
      setError('Hasło musi zawierać przynajmniej jedną cyfrę!');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register({
        email,
        username,
        password: formData.password,
        firstName,
        lastName,
        phone
      });

      setRegistered(true);
      setStep(3);
      setVerificationCode('');
      const sent = Boolean(response?.data?.emailVerificationSent);
      const details = response?.data?.emailVerificationDetails;
      if (sent) {
        setVerificationMessage('Wysłaliśmy kod potwierdzający na email. Wpisz go poniżej.');
      } else {
        setVerificationMessage('Konto utworzone, ale nie udało się wysłać kodu. Użyj opcji "Wyślij kod ponownie".');
        setError(
          `Nie udało się wysłać kodu email.${details ? ` Szczegóły: ${details}` : ''}`
        );
      }
      
    } catch (err) {
      console.error('Registration error:', err);

      // Szczegółowa obsługa błędów walidacji (zarówno ModelState, jak i IdentityResult)
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        let errorMessages = [];

        if (Array.isArray(errors)) {
          // IdentityResult z backendu: [{ code, description }, ...]
          errorMessages = errors
            .map((e) => e.description || e.Description)
            .filter(Boolean);
        } else if (typeof errors === 'object' && errors !== null) {
          // ModelState: { field: ["komunikat1", ...], ... }
          for (const [, value] of Object.entries(errors)) {
            if (Array.isArray(value)) {
              errorMessages = errorMessages.concat(value);
            }
          }
        }

        if (errorMessages.length > 0) {
          setError(
            <div>
              <strong>Błędy walidacji:</strong>
              <ul className="form-error-list">
                {errorMessages.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          );
        } else {
          setError('Błąd rejestracji. Sprawdź poprawność danych.');
        }
      } else {
        setError(err.response?.data?.title || 'Błąd rejestracji. Spróbuj ponownie.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={handleClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="auth-modal-close" onClick={handleClose} aria-label="Zamknij">
          ×
        </button>
        <div className="auth-modal-body">
          <h2 className="auth-modal-title">Załóż konto</h2>
          <p className="auth-modal-subtitle">Utwórz konto, aby rezerwować i zarządzać wizytami.</p>
          
          {error && (
            <div className="form-message form-message-error">
              {error}
            </div>
          )}

          {verificationMessage ? (
            <div className="form-message form-message-success">
              {verificationMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="form">
            {step === 1 ? (
              <>
                <div className="form-field">
                  <label className="form-label" htmlFor="firstName">
                    Imię: *
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Jan"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="lastName">
                    Nazwisko: *
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Kowalski"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="email">
                    Email: *
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="twoj@email.com"
                    autoComplete="email"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="username">
                    Nazwa użytkownika: *
                  </label>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="np. jankowalski123"
                    minLength="3"
                    maxLength="50"
                    autoComplete="username"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="phone">
                    Telefon: *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="+48 111-222-333"
                    autoComplete="tel"
                  />
                </div>

                <button type="submit" disabled={registered || verified} className="btn btn-primary form-button">
                  Dalej
                </button>
              </>
            ) : step === 2 ? (
              <>
                <div className="form-field">
                  <label className="form-label" htmlFor="password">
                    Hasło: *
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Min. 6 znaków + cyfra"
                    autoComplete="new-password"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="confirmPassword">
                    Potwierdź hasło:
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Powtórz hasło"
                    autoComplete="new-password"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" disabled={loading || registered || verified} className="btn btn-primary form-button" style={{ marginTop: 0, flex: 1 }}>
                    {loading ? 'Rejestrowanie...' : 'Zarejestruj'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="form-field">
                  <label className="form-label" htmlFor="verificationCode">
                    Kod z emaila (6 cyfr):
                  </label>
                  <input
                    id="verificationCode"
                    type="text"
                    inputMode="numeric"
                    name="verificationCode"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(String(e.target.value || '').replace(/\D/g, '').slice(0, 6))}
                    required
                    className="form-input"
                    placeholder="123456"
                    disabled={loading || verified}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="submit"
                    disabled={loading || verified}
                    className="btn btn-primary form-button"
                    style={{ marginTop: 0, flex: 1 }}
                  >
                    {loading ? 'Potwierdzanie...' : 'Potwierdź email'}
                  </button>

                  <button
                    type="button"
                    disabled={loading || verified}
                    className="btn form-button"
                    style={{ marginTop: 0, flex: 1 }}
                    onClick={async () => {
                      setError('');
                      setVerificationMessage('');
                      setLoading(true);
                      try {
                        const resendEmail = String(formData.email || '').trim().toLowerCase();
                        const resp = await authAPI.resendEmailVerification({ email: resendEmail });
                        const sent = Boolean(resp?.data?.sent);
                        const details = resp?.data?.details;
                        if (sent) {
                          setVerificationMessage('Wysłaliśmy nowy kod. Sprawdź email.');
                        } else {
                          const isRateLimited = typeof details === 'string' && details.includes('Możesz wysłać kod ponownie');
                          if (isRateLimited) {
                            setVerificationMessage(details);
                          } else {
                            setVerificationMessage('Nie udało się wysłać kodu ponownie.');
                            setError(
                              `Nie udało się wysłać kodu ponownie.${details ? ` Szczegóły: ${details}` : ''}`
                            );
                          }
                        }
                      } catch (err) {
                        setError(err.response?.data?.message || 'Nie udało się wysłać kodu ponownie.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Wyślij kod ponownie
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="form-footer">
            <p>Masz już konto? <Link to="/login">Zaloguj się</Link></p>
          </div>

          <div className="auth-stepper">
            <button
              type="button"
              className="auth-stepper-back"
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              disabled={step === 1 || loading || registered || verified}
              aria-label="Wróć do poprzedniego kroku"
            />
            <div className="auth-stepper-indicator">{step}/3</div>
          </div>

          {step === 2 ? (
            <div className="form-help">
              <strong>Wymagania hasła:</strong>
              <ul className="form-help-list">
                <li>Minimum 6 znaków</li>
                <li>Przynajmniej 1 cyfra</li>
              </ul>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="form-help">
              <strong>Potwierdzenie email:</strong>
              <ul className="form-help-list">
                <li>Kod jest ważny przez 15 minut</li>
                <li>Możesz wysłać nowy kod, jeśli poprzedni nie dotarł</li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
