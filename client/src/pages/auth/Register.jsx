import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Input, PasswordInput } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { useForm } from '../../hooks/useForm';
import { authService } from '../../services/authService';
import { parseError } from '../../services/api';
import { emailError, nameError, passwordError, passwordIssues } from '../../utils/validators';
import DevLinkNotice from './DevLinkNotice';

const validate = (v) => ({
  name: nameError(v.name, 'Your name'),
  businessName: nameError(v.businessName, 'Business name'),
  email: emailError(v.email),
  password: passwordError(v.password),
  confirm: v.confirm !== v.password ? 'Passwords do not match' : undefined,
});

export function PasswordChecklist({ password }) {
  const all = ['at least 8 characters', 'a lowercase letter', 'an uppercase letter', 'a number'];
  const missing = new Set(passwordIssues(password));
  return (
    <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
      {all.map((rule) => (
        <li key={rule} className={missing.has(rule) ? 'text-slate-400' : 'text-green-600 dark:text-green-400'}>
          {missing.has(rule) ? '○' : '●'} {rule.replace(/^a |^at least /, '')}
        </li>
      ))}
    </ul>
  );
}

export default function Register() {
  const { field, handleSubmit, values, setErrors } = useForm(
    { name: '', businessName: '', email: '', password: '', confirm: '' },
    validate
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const onSubmit = handleSubmit(async ({ confirm, ...body }) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.register(body);
      setDone(res.data);
    } catch (err) {
      const e = parseError(err);
      setError(e.message);
      setErrors(e.fields);
    } finally {
      setSubmitting(false);
    }
  });

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400">
          <MailCheck className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Check your email</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          We sent a verification link to <span className="font-medium text-slate-700 dark:text-slate-200">{done.email}</span>.
          Verify your address, then sign in.
        </p>
        <div className="text-left">
          <DevLinkNotice link={done.devLink} />
        </div>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Set up your business workspace in under a minute.</p>

      {error && (
        <Alert tone="error" className="mt-6">
          {error}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Input label="Your name" autoComplete="name" autoFocus required {...field('name')} />
        <Input label="Business name" autoComplete="organization" required {...field('businessName')} />
        <Input label="Work email" type="email" autoComplete="email" required {...field('email')} />
        <div>
          <PasswordInput label="Password" autoComplete="new-password" required {...field('password')} />
          {values.password && <PasswordChecklist password={values.password} />}
        </div>
        <PasswordInput label="Confirm password" autoComplete="new-password" required {...field('confirm')} />
        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          Sign in
        </Link>
      </p>
    </>
  );
}
