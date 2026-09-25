import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { authApi } from './api/auth.api';
import { EmergencyAlert } from './components/controls/EmergencyButton';
import { useSessionStore } from './stores/sessionStore';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { CampusView } from './pages/campus/CampusView';
import { ControlRoom } from './pages/control-room/ControlRoom';
import { SettingsPage } from './pages/control-room/SettingsPage';
import { AdminPage } from './pages/admin/AdminPage';
import { queryClient } from './lib/queryClient';
import { unlockEmergencyAudio } from './lib/emergencySound';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const isEmergency = useSessionStore((s) => s.isEmergency);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    authApi.getMe()
      .then((u) => {
        if (!cancelled && u) useAuthStore.getState().updateUser(u);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!token) useSessionStore.getState().setEmergency(false);
  }, [token]);

  useEffect(() => {
    const unlock = () => unlockEmergencyAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {isEmergency && <EmergencyAlert />}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/campus/:campusName"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'staff', 'admin', 'principal']}>
                <CampusView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/control-room"
            element={
              <ProtectedRoute allowedRoles={['principal', 'admin']}>
                <ControlRoom />
              </ProtectedRoute>
            }
          />

          <Route
            path="/control-room/settings"
            element={
              <ProtectedRoute allowedRoles={['principal', 'admin', 'teacher', 'staff']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['principal', 'admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          <Route path="/admin/users" element={<Navigate to="/admin?tab=users" replace />} />
          <Route path="/admin/recordings" element={<Navigate to="/admin?tab=recordings" replace />} />
          <Route path="/admin/audit-logs" element={<Navigate to="/admin?tab=audit-logs" replace />} />
          <Route path="/admin/session-history" element={<Navigate to="/admin?tab=session-history" replace />} />
          <Route path="/admin/system" element={<Navigate to="/admin?tab=system" replace />} />
          <Route path="/control-room/recordings" element={<Navigate to="/admin?tab=recordings" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
