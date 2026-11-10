import { Outlet } from 'react-router-dom';
import { BarChart3, ShieldCheck, Boxes, Moon, Sun } from 'lucide-react';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';

const points = [
  { icon: BarChart3, text: 'Double-entry books, GST invoices and live financial reports' },
  { icon: Boxes, text: 'Inventory that updates itself on every sale and purchase' },
  { icon: ShieldCheck, text: 'Role-based access and a full audit trail for every change' },
];

export default function AuthLayout() {
  const { resolvedTheme, toggle } = useTheme();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-green-500/10 blur-3xl" />
        <Logo light />
        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">Run your business books with confidence.</h1>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-navy-100">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-green-400" />
                </span>
                <span className="text-sm leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-navy-300">© {new Date().getFullYear()} Tally Business</p>
      </aside>

      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo className="lg:invisible" />
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
