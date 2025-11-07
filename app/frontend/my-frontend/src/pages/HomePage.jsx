import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🏢 System Rezerwacji dla Małych Firm</h1>
      <p style={{ fontSize: '1.2rem', margin: '2rem 0' }}>
        Zarządzaj rezerwacjami swojej firmy w prosty sposób!
      </p>
      
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '3rem' }}>
        <Link to="/login">
          <button style={{ 
            padding: '1rem 2rem', 
            fontSize: '1.1rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}>
            Zaloguj się
          </button>
        </Link>
        
        <Link to="/register">
          <button style={{ 
            padding: '1rem 2rem', 
            fontSize: '1.1rem',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}>
            Zarejestruj się
          </button>
        </Link>
      </div>

      <div style={{ marginTop: '4rem' }}>
        <h2>📋 Nasze funkcje:</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>✅ Zarządzanie kalendarzem rezerwacji</li>
          <li>✅ Definiowanie usług i cennika</li>
          <li>✅ Powiadomienia dla klientów</li>
          <li>✅ Panel administracyjny</li>
        </ul>
      </div>
    </div>
  );
}

export default HomePage;
