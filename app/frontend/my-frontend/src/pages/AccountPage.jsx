import { useEffect, useState } from 'react';
import { authAPI, tokenManager } from '../services/api';

function AccountPage() {
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError('');

      try {
        const response = await authAPI.getProfile();
        const data = response.data;

        setProfile(data);
        setProfileForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
        });
      } catch (err) {
        console.error('Profile load error:', err);
        setProfileError('Nie udało się załadować danych profilu.');
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, []);

  const displayName = profile
    ? profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.firstName || profile.email || 'Użytkownik'
    : 'Użytkownik';

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setSavingProfile(true);

    try {
      const response = await authAPI.updateProfile(profileForm);
      const data = response.data;

      setProfile(data);
      setProfileForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
      });

      const currentUser = tokenManager.getUser();
      tokenManager.setUser({
        ...(currentUser || {}),
        firstName: data.firstName,
        lastName: data.lastName,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('authChanged'));
      }

      setProfileSuccess('Zapisano zmiany profilu.');
    } catch (err) {
      console.error('Profile update error:', err);

      if (err.response?.data?.errors) {
        const message = err.response.data.errors
          .map((e) => e.description)
          .join(' ');
        setProfileError(message);
      } else if (err.response?.data?.message) {
        setProfileError(err.response.data.message);
      } else {
        setProfileError('Nie udało się zapisać zmian profilu.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Nowe hasło i potwierdzenie muszą być takie same.');
      return;
    }

    setChangingPassword(true);

    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordSuccess('Hasło zostało pomyślnie zmienione.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      console.error('Change password error:', err);

      if (err.response?.data?.errors) {
        const message = err.response.data.errors
          .map((e) => e.description)
          .join(' ');
        setPasswordError(message);
      } else if (err.response?.data?.message) {
        setPasswordError(err.response.data.message);
      } else {
        setPasswordError('Nie udało się zmienić hasła.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Ustawienia konta</h1>
          <p className="dashboard-greeting">
            Zarządzaj podstawowymi informacjami o swoim koncie SalonBook.
          </p>
        </div>
      </header>

      <section className="dashboard-card">
        <h2>Dane profilu</h2>

        {profileLoading && <p>Ładowanie danych profilu...</p>}

        {!profileLoading && (
          <>
            {profileError && (
              <div className="form-message form-message-error">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="form-message form-message-success">
                {profileSuccess}
              </div>
            )}

            {profile && (
              <>
                <p>
                  <strong>Email:</strong> {profile.email}
                </p>
                <p>
                  <strong>Nazwa wyświetlana:</strong> {displayName}
                </p>

                <form onSubmit={handleProfileSubmit} className="form">
                  <div className="form-field">
                    <label className="form-label" htmlFor="firstName">
                      Imię
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      className="form-input"
                      value={profileForm.firstName}
                      onChange={handleProfileInputChange}
                      placeholder="Twoje imię"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="lastName">
                      Nazwisko
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      className="form-input"
                      value={profileForm.lastName}
                      onChange={handleProfileInputChange}
                      placeholder="Twoje nazwisko"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="phone">
                      Telefon
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="form-input"
                      value={profileForm.phone}
                      onChange={handleProfileInputChange}
                      placeholder="+48 123 456 789"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary form-button"
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Zapisywanie...' : 'Zapisz zmiany'}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </section>

      <section className="dashboard-card">
        <h2>Zmiana hasła</h2>

        {passwordError && (
          <div className="form-message form-message-error">
            {passwordError}
          </div>
        )}
        {passwordSuccess && (
          <div className="form-message form-message-success">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="form">
          <div className="form-field">
            <label className="form-label" htmlFor="currentPassword">
              Obecne hasło
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              className="form-input"
              value={passwordForm.currentPassword}
              onChange={handlePasswordInputChange}
              placeholder="••••••••"
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="newPassword">
              Nowe hasło
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              className="form-input"
              value={passwordForm.newPassword}
              onChange={handlePasswordInputChange}
              placeholder="••••••••"
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="confirmPassword">
              Powtórz nowe hasło
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="form-input"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordInputChange}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary form-button"
            disabled={changingPassword}
          >
            {changingPassword ? 'Zmiana hasła...' : 'Zmień hasło'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default AccountPage;
