import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SurveyProvider } from './context/SurveyContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SurveyPage from './pages/SurveyPage';
import SurveyListPage from './pages/SurveyListPage';
import SyncPage from './pages/SyncPage';
import SupervisorPage from './pages/SupervisorPage';
import UnitDetailPage from './pages/UnitDetailPage';
import AdminPage from './pages/AdminPage';
import Layout from './components/Layout';

export default function App() {
  return (
    <AuthProvider>
      <SurveyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="surveys" element={<SurveyListPage />} />
              <Route path="surveys/new" element={<SurveyPage />} />
              <Route path="surveys/:id" element={<SurveyPage />} />
              <Route path="sync" element={<SyncPage />} />
              <Route path="supervisor" element={<SupervisorPage />} />
              <Route path="supervisor/units/:id" element={<UnitDetailPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SurveyProvider>
    </AuthProvider>
  );
}
