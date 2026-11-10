import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Database, HardDrive, Mail, ShieldCheck } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Badge, Skeleton } from '../components/ui/Feedback';
import { useAuth, ROLE_LABELS } from '../hooks/useAuth';
import { systemService } from '../services/authService';

const PERMISSION_GROUPS = [
  ['Companies', 'company'],
  ['Parties', 'parties'],
  ['Inventory', 'inventory'],
  ['Sales', 'sales'],
  ['Purchases', 'purchase'],
  ['Accounting', 'accounting'],
  ['Expenses', 'expenses'],
  ['GST', 'gst'],
  ['Reports', 'reports'],
  ['Users', 'users'],
  ['Audit log', 'audit'],
];

function accessLevel(permissions, prefix) {
  const mine = permissions.filter((p) => p.startsWith(`${prefix}:`));
  if (mine.some((p) => /:(write|manage)$/.test(p))) return 'full';
  if (mine.length) return 'view';
  return 'none';
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function StatusRow({ icon: Icon, label, value, ok }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2.5 text-sm">
        <Icon className="h-4 w-4 text-slate-400" />
        {label}
      </span>
      <Badge tone={ok ? 'green' : 'amber'}>{value}</Badge>
    </li>
  );
}

export default function Dashboard() {
  const { user, permissions, can } = useAuth();
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    systemService
      .health()
      .then((r) => setHealth(r.data))
      .catch(() => setHealthError(true));
  }, []);

  const checklist = [
    { done: user.isEmailVerified, label: 'Verify your email address' },
    { done: Boolean(user.avatar?.url), label: 'Add a profile photo', to: '/profile' },
    ...(can('users:manage') ? [{ label: 'Invite your accountant or staff', to: '/users' }] : []),
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        description={`You're signed in to ${user.account?.name} as ${ROLE_LABELS[user.role]}.`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-blue-600" /> Your access
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            What your role can do in this workspace. Admins can change roles under Users &amp; roles.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {PERMISSION_GROUPS.map(([label, prefix]) => {
              const level = accessLevel(permissions, prefix);
              return (
                <li key={prefix} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                  <span className="text-sm">{label}</span>
                  <Badge tone={level === 'full' ? 'green' : level === 'view' ? 'blue' : 'slate'}>
                    {level === 'full' ? 'Full access' : level === 'view' ? 'View only' : 'No access'}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-semibold">Get started</h2>
            <ul className="mt-3 space-y-2.5">
              {checklist.map((item) => {
                const content = (
                  <span className="flex items-center gap-2.5 text-sm">
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                    )}
                    <span className={item.done ? 'text-slate-400 line-through' : ''}>{item.label}</span>
                  </span>
                );
                return (
                  <li key={item.label}>
                    {item.to && !item.done ? (
                      <Link to={item.to} className="hover:text-blue-600 dark:hover:text-blue-400">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold">System status</h2>
            {healthError ? (
              <p className="mt-3 text-sm text-red-600">Could not reach the API.</p>
            ) : !health ? (
              <div className="mt-3 space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : (
              <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
                <StatusRow icon={Database} label="Database" value={health.db} ok={health.db === 'connected'} />
                <StatusRow
                  icon={HardDrive}
                  label="File storage"
                  value={health.storage === 'configured' ? 'Firebase' : 'Not configured'}
                  ok={health.storage === 'configured'}
                />
                <StatusRow
                  icon={Mail}
                  label="Email delivery"
                  value={health.email === 'smtp' ? 'SMTP' : 'Console (dev)'}
                  ok={health.email === 'smtp'}
                />
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
