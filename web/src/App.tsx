import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import LandingPage from './pages/LandingPage';
import PublicMapPage from './pages/PublicMapPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPage from './pages/PrivacyPage';
import HowItWorksPage from './pages/HowItWorksPage';
import FeedbackPage from './pages/FeedbackPage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import OverviewPage from './pages/OverviewPage';
import MapPage from './pages/MapPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import FeedbackManagePage from './pages/FeedbackManagePage';
import ApiKeysPage from './pages/ApiKeysPage';
import WeatherDashboardPage from './pages/WeatherDashboardPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/admin" />;
};

function App() {
  return (
    <ThemeProvider>
    <LanguageProvider>
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/live-map" element={<PublicMapPage />} />
          <Route path="/admin" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="feedback" element={<FeedbackManagePage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="weather" element={<WeatherDashboardPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
    </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
