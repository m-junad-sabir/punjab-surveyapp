import { createBrowserRouter, RouterProvider, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
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

function SignOut() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);
  return null;
}

function SurveyRoute() {
  const { id } = useParams();
  return <SurveyPage key={id ?? 'new'} />;
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/sign-out', element: <SignOut /> },
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'surveys', element: <SurveyListPage /> },
      { path: 'surveys/new', element: <SurveyRoute /> },
      { path: 'surveys/:id', element: <SurveyRoute /> },
      { path: 'sync', element: <SyncPage /> },
      { path: 'supervisor', element: <SupervisorPage /> },
      { path: 'supervisor/units/:id', element: <UnitDetailPage /> },
      { path: 'admin', element: <AdminPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
], { future: { v7_relativeSplatPath: true } });

export default function App() {
  return (
    <AuthProvider>
      <SurveyProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </SurveyProvider>
    </AuthProvider>
  );
}
