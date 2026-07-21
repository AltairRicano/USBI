import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './features/auth/ProtectedRoute';

const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const PrivacyPage = lazy(() => import('./features/legal/PrivacyPage'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const MakerPage = lazy(() => import('./features/maker').then((mod) => ({ default: mod.MakerPage })));
const AdminContentPage = lazy(() => import('./features/content/AdminContentPage').then((mod) => ({ default: mod.AdminContentPage })));
const OfficialLevelPage = lazy(() => import('./features/content/OfficialLevelPage').then((mod) => ({ default: mod.OfficialLevelPage })));
const SectionLevelsPage = lazy(() => import('./features/content/SectionLevelsPage').then((mod) => ({ default: mod.SectionLevelsPage })));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage').then((mod) => ({ default: mod.ProfilePage })));
const ArcoRequestPage = lazy(() => import('./features/arco/ArcoPage').then((mod) => ({ default: mod.ArcoRequestPage })));
const ArcoAdminPage = lazy(() => import('./features/arco/ArcoPage').then((mod) => ({ default: mod.ArcoAdminPage })));

export default function App() {
  return (
    <BrowserRouter>
      <AuthEventBridge />
      {/* SVG para filtros daltónicos globales */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <filter id="deuteranopia-filter">
            <feColorMatrix type="matrix"
              values="0.625 0.375 0   0 0
                      0.7   0.3   0   0 0
                      0     0.3   0.7 0 0
                      0     0     0   1 0"/>
          </filter>
          <filter id="protanopia-filter">
            <feColorMatrix type="matrix"
              values="0.567 0.433 0     0 0
                      0.558 0.442 0     0 0
                      0     0.242 0.758 0 0
                      0     0     0     1 0"/>
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix type="matrix"
              values="0.95 0.05  0    0 0
                      0    0.433 0.567 0 0
                      0    0.475 0.525 0 0
                      0    0     0     1 0"/>
          </filter>
        </defs>
      </svg>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Raíz → login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/privacidad" element={<PrivacyPage />} />

          {/* Rutas protegidas */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sections/:sectionId"
            element={
              <ProtectedRoute>
                <SectionLevelsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/levels/:levelId/play"
            element={
              <ProtectedRoute>
                <OfficialLevelPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/arco"
            element={
              <ProtectedRoute>
                <ArcoRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operator', 'director']}>
                <AdminContentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/arco"
            element={
              <ProtectedRoute allowedRoles={['admin', 'director']}>
                <ArcoAdminPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/maker"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operator', 'director']}>
                <MakerPage />
              </ProtectedRoute>
            }
          />

          {/* Ruta de acceso denegado */}
          <Route
            path="/unauthorized"
            element={
              <main className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                  <h1 style={{ color: 'var(--color-error)' }}>Acceso no autorizado</h1>
                  <p style={{ color: 'var(--color-muted)' }}>
                    No tienes permiso para ver esta página.
                  </p>
                </div>
              </main>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function RouteFallback() {
  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
      <p className="text-[--color-muted]">Cargando...</p>
    </main>
  );
}

function AuthEventBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => navigate('/login', { replace: true });
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [navigate]);

  return null;
}
