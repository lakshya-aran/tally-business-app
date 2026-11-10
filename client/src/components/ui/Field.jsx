import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

function FieldShell({ id, label, error, hint, required, children }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, className, required, id, ...props }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint} required={required}>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn('input', error && 'input-error', className)}
        {...props}
      />
    </FieldShell>
  );
});

export const PasswordInput = forwardRef(function PasswordInput({ label, error, hint, required, id, ...props }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint} required={required}>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn('input pr-10', error && 'input-error')}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FieldShell>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, required, id, className, children, ...props }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint} required={required}>
      <select
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        className={cn('input pr-8', error && 'input-error', className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
});
