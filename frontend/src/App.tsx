import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { EmergencyAlert } from './components/controls/EmergencyButton';
import { useSessionStore } from './stores/sessionStore';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { CampusView } from './pages/campus/CampusView';
import { ControlRoom } from './pages/control-room/ControlRoom';
import { SettingsPage } from './pages/control-room/SettingsPage';
import { RecordsPage } from './pages/control-room/RecordsPage';
import { UserManagement } from './pages/admin/UserManagement';
import { queryClient } from './lib/queryClient';

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
            path="/control-room/recordings"
            element={
              <ProtectedRoute allowedRoles={['principal', 'admin']}>
                <RecordsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['principal', 'admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
