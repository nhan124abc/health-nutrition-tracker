import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import AdminLayout from './layouts/AdminLayout';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import GuestGoalPage from './pages/GuestGoalPage';
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
import HealthInsights from './pages/HealthInsights';
import Planner from './pages/Planner';
import Plans from './pages/Plans';
import Settings from './pages/Settings';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminCatalogs from './pages/admin/AdminCatalogs';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminManagementPage from './pages/admin/AdminManagementPage';
import AdminProfile from './pages/admin/AdminProfile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/guest-goals" element={<GuestGoalPage />} />
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
          <Route path="/plans" element={<Plans />} />
          <Route path="/health-insights" element={<HealthInsights />} />
          <Route path="/settings" element={<Settings />} />
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
          <Route path="catalogs" element={<AdminCatalogs />} />
          <Route path="catalogs/food-categories" element={<AdminCatalogs type="food" />} />
          <Route path="catalogs/activity-categories" element={<AdminCatalogs type="activity" />} />
          <Route path="all-foods" element={<AdminManagementPage type="foods" />} />
          <Route path="all-activities" element={<AdminManagementPage type="exercises" />} />
          <Route path="catalogs/foods" element={<Navigate to="/admin/catalogs/food-categories" replace />} />
          <Route path="catalogs/activities" element={<Navigate to="/admin/catalogs/activity-categories" replace />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
