import { cn } from '../utils/cn';

export default function Logo({ className, light = false }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? '#ffffff' : '#0b1f3a'} />
        <path d="M9 10h14v3h-5.5v11h-3V13H9z" fill={light ? '#0b1f3a' : '#ffffff'} />
        <circle cx="23" cy="22" r="3" fill="#16a34a" />
      </svg>
      <span className={cn('text-lg', light ? 'text-white' : 'text-navy-900 dark:text-white')}>Tally Business</span>
    </span>
  );
}
