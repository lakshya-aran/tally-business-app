import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { Input, PasswordInput } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { useForm } from '../../hooks/useForm';
import { login } from '../../store/authSlice';
import { authService } from '../../services/authService';
import { parseError } from '../../services/api';
import { emailError, required } from '../../utils/validators';
import DevLinkNotice from './DevLinkNotice';

const validate = (v) => ({ email: emailError(v.email), password: required(v.password, 'Password') });

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { field, handleSubmit, values, setErrors } = useForm({ email: '', password: '' }, validate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [resending, setResending] = useState(false);
  const [devLink, setDevLink] = useState(null);

  const onSubmit = handleSubmit(async (vals) => {
    setSubmitting(true);
    setError(null);
    const result = await dispatch(login(vals));
    setSubmitting(false);
    if (login.fulfilled.match(result)) {
      toast.success(`Welcome back, ${result.payload.user.name.split(' ')[0]}`);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } else {
      setError(result.payload);
      setErrors(result.payload?.fields ?? {});
    }
  });

  const resend = async () => {
    setResending(true);
    try {
      const res = await authService.resendVerification(values.email);
      setDevLink(res.data?.devLink ?? null);
      toast.success('Verification email sent. Check your inbox.');
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Welcome back. Enter your details to continue.</p>

      {error && (
        <Alert tone="error" className="mt-6">
          {error.message}
          {error.code === 'EMAIL_NOT_VERIFIED' && (
            <button onClick={resend} disabled={resending} className="mt-1 block font-medium underline disabled:opacity-60">
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
        </Alert>
      )}
      <DevLinkNotice link={devLink} />

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" autoFocus {...field('email')} />
        <div>
          <PasswordInput label="Password" autoComplete="current-password" {...field('password')} />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        New to Tally Business?{' '}
        <Link to="/register" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          Create an account
        </Link>
      </p>
    </>
  );
}
