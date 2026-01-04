import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../services/api', () => {
  return {
    tokenManager: {
      isAuthenticated: vi.fn(),
      getUser: vi.fn(),
    },
  };
});

import ProtectedRoute from './ProtectedRoute';
import { tokenManager } from '../services/api';

const renderWithRoutes = (element, initialEntries = ['/dashboard']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route path="/account" element={<div>ACCOUNT</div>} />
        <Route path="/dashboard" element={element} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /login when unauthenticated', () => {
    tokenManager.isAuthenticated.mockReturnValue(false);
    tokenManager.getUser.mockReturnValue(null);

    renderWithRoutes(
      <ProtectedRoute>
        <div>SECRET</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    tokenManager.isAuthenticated.mockReturnValue(true);
    tokenManager.getUser.mockReturnValue({ roles: [] });

    renderWithRoutes(
      <ProtectedRoute>
        <div>SECRET</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });

  it('redirects to / when requiredRole is missing', () => {
    tokenManager.isAuthenticated.mockReturnValue(true);
    tokenManager.getUser.mockReturnValue({ roles: ['User'] });

    renderWithRoutes(
      <ProtectedRoute requiredRole="Admin">
        <div>SECRET</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('HOME')).toBeInTheDocument();
  });

  it('redirects to /account when requireCompany and companyId missing', () => {
    tokenManager.isAuthenticated.mockReturnValue(true);
    tokenManager.getUser.mockReturnValue({ roles: ['User'], companyId: null });

    renderWithRoutes(
      <ProtectedRoute requireCompany>
        <div>SECRET</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('ACCOUNT')).toBeInTheDocument();
  });
});
