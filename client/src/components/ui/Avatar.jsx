import { useState } from 'react';
import { cn } from '../../utils/cn';

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

export default function Avatar({ name, src, size = 'md', className }) {
  const [failed, setFailed] = useState(false);
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-20 w-20 text-xl' };
  const cls = cn('shrink-0 rounded-full object-cover', sizes[size], className);

  if (src && !failed) {
    return <img src={src} alt={name ? `${name}'s avatar` : ''} className={cls} onError={() => setFailed(true)} />;
  }
  return (
    <span className={cn(cls, 'inline-flex items-center justify-center bg-navy-100 font-semibold text-navy-800 dark:bg-navy-800 dark:text-navy-100')} aria-hidden>
      {initials(name)}
    </span>
  );
}
