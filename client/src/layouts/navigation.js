import { LayoutDashboard, Users, UserCircle } from 'lucide-react';

/**
 * Sidebar navigation. Each module adds its entry here as it is built;
 * `permission` hides items the current role can't use (the API enforces it too).
 */
export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Administration',
    items: [
      { to: '/users', label: 'Users & roles', icon: Users, permission: 'users:manage' },
      { to: '/profile', label: 'My profile', icon: UserCircle },
    ],
  },
];
