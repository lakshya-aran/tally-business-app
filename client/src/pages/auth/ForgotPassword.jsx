import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { useForm } from '../../hooks/useForm';
import { authService } from '../../services/authService';
import { parseError } from '../../services/api';
import { emailError } from '../../utils/validators';
import DevLinkNotice from './DevLinkNotice';

export default function ForgotPassword() {
  const { field, handleSubmit } = useForm({ email: '' }, (v) => ({ email: emailError(v.email) }));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onSubmit = handleSubmit(async ({ email }) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.forgotPassword(email);
      setResult(res);
    } catch (err) {
      setError(parseError(err).message);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <>
      <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <h2 className="text-2xl font-semibold tracking-tight">Reset your password</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Enter your account email and we'll send you a link to choose a new password.
      </p>

      {result ? (
        <>
          <Alert tone="success" className="mt-6">
            {result.message}
          </Alert>
          <DevLinkNotice link={result.data?.devLink} />
        </>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <Input label="Email" type="email" autoComplete="email" autoFocus {...field('email')} />
          <Button type="submit" className="w-full" size="lg" loading={submitting}>
            Send reset link
          </Button>
        </form>
      )}
    </>
  );
}
