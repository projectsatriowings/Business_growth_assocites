import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, UserRole } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { PageLoadingFallback } from './components/Skeleton';
import { ErrorBoundary } from './components/ErrorBoundary';

// Route-level lazy loading with automatic self-recovery from stale build chunks
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<any>,
  componentName: string
) {
  return lazy(async () => {
    const sessionKey = `retry_chunk_${componentName}`;
    try {
      const module = await factory();
      sessionStorage.removeItem(sessionKey);
      const Component = module[componentName] || module.default;
      return { default: Component as T };
    } catch (error: any) {
      const hasRetried = sessionStorage.getItem(sessionKey);
      if (!hasRetried) {
        sessionStorage.setItem(sessionKey, 'true');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'), 'LandingPage');
const RegisterBgaPage = lazyWithRetry(() => import('./pages/RegisterBgaPage'), 'RegisterBgaPage');
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'), 'LoginPage');
const ResetPasswordPage = lazyWithRetry(() => import('./pages/ResetPasswordPage'), 'ResetPasswordPage');
const AdminPortal = lazyWithRetry(() => import('./pages/admin/AdminPortal'), 'AdminPortal');
const BgaPortal = lazyWithRetry(() => import('./pages/bga/BgaPortal'), 'BgaPortal');
const AccountsPortal = lazyWithRetry(() => import('./pages/accounts/AccountsPortal'), 'AccountsPortal');
const TechnicalPortal = lazyWithRetry(() => import('./pages/technical/TechnicalPortal'), 'TechnicalPortal');

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
    return <PageLoadingFallback />;
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
            className="mt-6 inline-block px-5 py-2.5 bg-[#3066BE] text-white rounded-xl text-xs font-bold hover:bg-[#25549e] shadow-md transition-all"
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
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/register" element={<RegisterBgaPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/:role" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Admin Protected Routes */}
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
                  <ProtectedRoute allowedRoles={['TECHNICAL', 'ADMIN', 'BGA']} redirectPath="/login/technical">
                    <TechnicalPortal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/technical/*"
                element={
                  <ProtectedRoute allowedRoles={['TECHNICAL', 'ADMIN', 'BGA']} redirectPath="/login/technical">
                    <TechnicalPortal />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </ErrorBoundary>
  );
}

export default App;
