import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, UserRole } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

import { LandingPage } from './pages/LandingPage';
import { RegisterBgaPage } from './pages/RegisterBgaPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPortal } from './pages/admin/AdminPortal';
import { BgaPortal } from './pages/bga/BgaPortal';
import { AccountsPortal } from './pages/accounts/AccountsPortal';
import { TechnicalPortal } from './pages/technical/TechnicalPortal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectPath = '/login',
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectPath} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-md shadow-lg">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
            ✕
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-2">
            Your authenticated role is <strong>{user.role}</strong>. You are not authorized to access this department's portal.
          </p>
          <a
            href="/"
            className="mt-6 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
          >
            Return to Authorized Portal
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<RegisterBgaPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/:role" element={<LoginPage />} />

            {/* Admin Protected Routes (matching both /admin and /admin/*) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']} redirectPath="/login/admin">
                  <AdminPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']} redirectPath="/login/admin">
                  <AdminPortal />
                </ProtectedRoute>
              }
            />

            {/* BGA Protected Routes */}
            <Route
              path="/bga"
              element={
                <ProtectedRoute allowedRoles={['BGA']} redirectPath="/login">
                  <BgaPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bga/*"
              element={
                <ProtectedRoute allowedRoles={['BGA']} redirectPath="/login">
                  <BgaPortal />
                </ProtectedRoute>
              }
            />

            {/* Accounts Protected Routes */}
            <Route
              path="/accounts"
              element={
                <ProtectedRoute allowedRoles={['ACCOUNTS', 'ADMIN']} redirectPath="/login/accounts">
                  <AccountsPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts/*"
              element={
                <ProtectedRoute allowedRoles={['ACCOUNTS', 'ADMIN']} redirectPath="/login/accounts">
                  <AccountsPortal />
                </ProtectedRoute>
              }
            />

            {/* Technical Protected Routes */}
            <Route
              path="/technical"
              element={
                <ProtectedRoute allowedRoles={['TECHNICAL', 'ADMIN']} redirectPath="/login/technical">
                  <TechnicalPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/technical/*"
              element={
                <ProtectedRoute allowedRoles={['TECHNICAL', 'ADMIN']} redirectPath="/login/technical">
                  <TechnicalPortal />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

