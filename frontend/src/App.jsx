import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import HomePage from './pages/HomePage';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import ForgotPassword from './features/auth/ForgotPassword';
import Profile from './pages/Profile';
import Nutrition from './features/nutrition/Nutrition';
import FoodDiary from './features/meals/FoodDiary';
import ActivityTracker from './features/activities/ActivityTracker';
import Reports from './pages/Reports';
import BodyMetrics from './pages/BodyMetrics';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminManagementPage from './pages/admin/AdminManagementPage';
import { getAccessToken } from './api/api';
import authConfig from './config/authConfig';

function ProtectedRoute({ children }) {
  if (!authConfig.disableAuth && !getAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/meals" element={<FoodDiary />} />
          <Route path="/food-diary" element={<Navigate to="/meals" replace />} />
          <Route path="/activity" element={<ActivityTracker />} />
          <Route path="/analytics" element={<Reports />} />
          <Route path="/reports" element={<Navigate to="/analytics" replace />} />
          <Route path="/body-metrics" element={<BodyMetrics />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminManagementPage type="users" />} />
          <Route path="foods" element={<AdminManagementPage type="foods" />} />
          <Route path="exercises" element={<AdminManagementPage type="exercises" />} />
          <Route path="submissions" element={<AdminManagementPage type="submissions" />} />
          <Route path="reports" element={<AdminManagementPage type="reports" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
