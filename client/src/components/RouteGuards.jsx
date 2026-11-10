import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { FullPageSpinner, EmptyState } from './ui/Feedback';

/** Requires a session (and optionally a permission). */
export function ProtectedRoute({ permission }) {
  const { isAuthenticated, isChecking, can } = useAuth();
  const location = useLocation();

  if (isChecking) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (permission && !can(permission)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You don't have access to this page"
        description="Ask an administrator in your organization to grant you the required role."
      />
    );
  }
  return <Outlet />;
}

/** Login/register pages: bounce signed-in users to where they were going. */
export function GuestRoute() {
  const { isAuthenticated, isChecking } = useAuth();
  const location = useLocation();
  if (isChecking) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />;
  return <Outlet />;
}
