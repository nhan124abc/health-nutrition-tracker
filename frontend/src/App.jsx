import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import AdminLayout from './layouts/AdminLayout';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import HomePage from './pages/HomePage';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import ForgotPassword from './features/auth/ForgotPassword';
import VerifyEmail from './features/auth/VerifyEmail';
import OAuth2Redirect from './features/auth/OAuth2Redirect';
import Profile from './features/profile/Profile';
import Nutrition from './features/nutrition/Nutrition';
import FoodDiary from './features/meals/FoodDiary';
import WaterTracker from './features/water/WaterTracker';
import ActivityTracker from './features/activities/ActivityTracker';
import BodyMetrics from './features/profile/BodyMetrics';
import GoalPlanner from './features/profile/GoalPlanner';
import Reports from './pages/Reports';
import Planner from './pages/Planner';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminManagementPage from './pages/admin/AdminManagementPage';
import AdminProfile from './pages/admin/AdminProfile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/verify-email"
          element={
            <PublicRoute>
              <VerifyEmail />
            </PublicRoute>
          }
        />
        <Route path="/oauth2/redirect" element={<OAuth2Redirect />} />
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
          <Route path="/water" element={<WaterTracker />} />
          <Route path="/activity" element={<ActivityTracker />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/analytics" element={<Navigate to="/reports" replace />} />
          <Route path="/body-metrics" element={<BodyMetrics />} />
          <Route path="/goals" element={<GoalPlanner />} />
          <Route path="/planner" element={<Planner />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminManagementPage type="users" />} />
          <Route path="catalogs/foods" element={<AdminManagementPage type="foods" />} />
          <Route path="catalogs/activities" element={<AdminManagementPage type="exercises" />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
