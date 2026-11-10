import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Menu, X, Moon, Sun, LogOut, ChevronDown, UserCircle, MonitorSmartphone } from 'lucide-react';
import { toast } from 'sonner';
import Logo from '../components/Logo';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { useAuth, ROLE_LABELS } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { logout } from '../store/authSlice';
import { signOutStorage } from '../firebase/storageService';
import { NAV_SECTIONS } from './navigation';
import { cn } from '../utils/cn';

function Sidebar({ onNavigate }) {
  const { can, user } = useAuth();
  return (
    <div className="flex h-full flex-col bg-navy-900 text-navy-100">
      <div className="flex h-16 items-center px-5">
        <Logo light />
      </div>
      <div className="mx-3 mb-3 rounded-lg bg-white/5 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wider text-navy-300">Workspace</p>
        <p className="truncate text-sm font-medium text-white">{user?.account?.name}</p>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6" aria-label="Main">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((i) => !i.permission || can(i.permission));
          if (!items.length) return null;
          return (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400">{section.title}</p>
              <ul className="space-y-0.5">
                {items.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive ? 'bg-blue-600 text-white' : 'text-navy-200 hover:bg-white/5 hover:text-white'
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

function UserMenu() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const signOut = async (everywhere) => {
    setOpen(false);
    await Promise.all([dispatch(logout({ everywhere })), signOutStorage()]);
    toast.success(everywhere ? 'Signed out of all devices' : 'Signed out');
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user?.name} src={user?.avatar?.url} size="sm" />
        <span className="hidden text-left sm:block">
          <span className="block max-w-36 truncate text-sm font-medium leading-tight">{user?.name}</span>
          <span className="block text-xs leading-tight text-slate-500 dark:text-slate-400">{ROLE_LABELS[user?.role]}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <Link role="menuitem" to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
            <UserCircle className="h-4 w-4 text-slate-400" /> My profile
          </Link>
          <button role="menuitem" onClick={() => signOut(true)} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
            <MonitorSmartphone className="h-4 w-4 text-slate-400" /> Sign out everywhere
          </button>
          <button role="menuitem" onClick={() => signOut(false)} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, toggle } = useTheme();
  const { sessionExpired } = useAuth();
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    if (sessionExpired) toast.error('Your session has ended. Please sign in again.');
  }, [sessionExpired]);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-navy-200 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/90">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <UserMenu />
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
