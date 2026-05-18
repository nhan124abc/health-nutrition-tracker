import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import FoodDiary from './pages/FoodDiary';
import Reports from './pages/Reports';
import ActivityTracker from './pages/ActivityTracker';
import PlaceholderPage from './pages/PlaceholderPage';

function ProtectedRoute({ children }) {
  const isAuthDisabled = process.env.REACT_APP_DISABLE_AUTH === 'true';
  const token = localStorage.getItem('jwtToken');
  if (!isAuthDisabled && !token) {
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
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/nutrition" element={<FoodDiary />} />
          <Route path="/food-diary" element={<Navigate to="/nutrition" replace />} />
          <Route path="/activity" element={<ActivityTracker />} />
          <Route
            path="/water"
            element={<PlaceholderPage titleKey="nav.water" descriptionKey="placeholder.water" />}
          />
          <Route
            path="/goals"
            element={<PlaceholderPage titleKey="nav.goals" descriptionKey="placeholder.goals" />}
          />
          <Route path="/reports" element={<Reports />} />
          <Route
            path="/news"
            element={<PlaceholderPage titleKey="nav.news" descriptionKey="placeholder.news" />}
          />
          <Route
            path="/settings"
            element={<PlaceholderPage titleKey="nav.settings" descriptionKey="placeholder.settings" />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
