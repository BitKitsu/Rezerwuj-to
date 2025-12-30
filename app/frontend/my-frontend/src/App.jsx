import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ServicesPage from './pages/ServicesPage'
import SalonsPage from './pages/SalonsPage'
import ServiceDetailsPage from './pages/ServiceDetailsPage'
import CompanyDetailsPage from './pages/CompanyDetailsPage'
import AccountPage from './pages/AccountPage'
import AdminPanel from './pages/AdminPanel'
import CompanyPanel from './pages/CompanyPanel'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/MainLayout'
import './App.css'

function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'

    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })

  useEffect(() => {
    if (typeof document === 'undefined') return

    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <Router>
      <MainLayout theme={theme} toggleTheme={toggleTheme}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:id" element={<ServiceDetailsPage />} />
          <Route path="/salons" element={<SalonsPage />} />
          <Route path="/salons/:id" element={<CompanyDetailsPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/company-panel"
            element={
              <ProtectedRoute requiredRole={['Admin', 'CompanyOwner']}>
                <CompanyPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MainLayout>
    </Router>
  )
}

export default App
