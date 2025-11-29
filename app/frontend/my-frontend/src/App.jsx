import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BookingPage from './pages/BookingPage';
import CompanySetupPage from './pages/CompanySetupPage';
import Header from './pages/Header';

console.log("APP RENDERUJE SIĘ");

function App() {
  // Stan dla aktualnie zalogowanego użytkownika
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Header user={user} />
      <Routes>
        <Route path="/" element={<HomePage />} /> 
        <Route path="/booking" element={<BookingPage />} /> 
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route path="/register" element={<RegisterPage setUser={setUser} />} />
        <Route path="/dashboard" element={<DashboardPage user={user} setUser={setUser} />} />
        <Route path="/dashboard/staff" element={<DashboardPage user={user} setUser={setUser} />} />
        <Route path="/company/create" element={<CompanySetupPage user={user} setUser={setUser} />} />
      </Routes>
    </Router>
  );
}

export default App;
