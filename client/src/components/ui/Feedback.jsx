import { Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Spinner({ className, label = 'Loading' }) {
  return (
    <span role="status" className="inline-flex items-center">
      <Loader2 className={cn('h-5 w-5 animate-spin text-blue-600', className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-800', className)} aria-hidden />;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const badgeTones = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  green: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  navy: 'bg-navy-100 text-navy-800 dark:bg-navy-800 dark:text-navy-100',
};

export function Badge({ tone = 'slate', children, className }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', badgeTones[tone], className)}>
      {children}
    </span>
  );
}

const alertTones = {
  error: { cls: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200', Icon: AlertCircle },
  success: { cls: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/50 dark:text-green-200', Icon: CheckCircle2 },
  info: { cls: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200', Icon: Info },
};

export function Alert({ tone = 'info', children, className }) {
  const { cls, Icon } = alertTones[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm', cls, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function ProgressBar({ value }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${value}%` }} />
    </div>
  );
}
