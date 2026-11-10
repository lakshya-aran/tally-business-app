import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Toaster } from 'sonner';
import { fetchSession, sessionExpired } from './store/authSlice';
import { setUnauthorizedHandler } from './services/api';
import { useTheme } from './context/ThemeContext';
import { ProtectedRoute, GuestRoute } from './components/RouteGuards';
import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Users from './pages/Users';
import NotFound from './pages/NotFound';

export default function App() {
  const dispatch = useDispatch();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setUnauthorizedHandler(() => dispatch(sessionExpired()));
    dispatch(fetchSession());
  }, [dispatch]);

  return (
    <>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>
        </Route>

        {/* Reachable whether or not signed in (links arrive by email). */}
        <Route element={<AuthLayout />}>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route element={<ProtectedRoute permission="users:manage" />}>
              <Route path="/users" element={<Users />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
      <Toaster richColors closeButton position="top-right" theme={resolvedTheme} />
    </>
  );
}
