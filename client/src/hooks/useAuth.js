import { useSelector } from 'react-redux';
import { useCallback } from 'react';

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  accountant: 'Accountant',
  staff: 'Staff',
};

export function useAuth() {
  const { user, permissions, status, sessionExpired } = useSelector((s) => s.auth);
  const can = useCallback((perm) => permissions.includes(perm), [permissions]);
  return {
    user,
    permissions,
    status,
    sessionExpired,
    isAuthenticated: status === 'authenticated',
    isChecking: status === 'idle' || status === 'loading',
    can,
  };
}
