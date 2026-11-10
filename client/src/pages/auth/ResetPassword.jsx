import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { PasswordInput } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { useForm } from '../../hooks/useForm';
import { authService } from '../../services/authService';
import { parseError } from '../../services/api';
import { logout } from '../../store/authSlice';
import { passwordError } from '../../utils/validators';
import { PasswordChecklist } from './Register';

const validate = (v) => ({
  password: passwordError(v.password),
  confirm: v.confirm !== v.password ? 'Passwords do not match' : undefined,
});

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const isInvite = params.get('invite') === '1';
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { field, handleSubmit, values, setErrors } = useForm({ password: '', confirm: '' }, validate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = handleSubmit(async ({ password }) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.resetPassword({ token, password });
      // The server revoked all sessions; clear any local one too.
      await dispatch(logout());
      toast.success(res.message);
      navigate('/login', { replace: true });
    } catch (err) {
      const e = parseError(err);
      setError(e);
      setErrors(e.fields);
    } finally {
      setSubmitting(false);
    }
  });

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <>
        <h2 className="text-2xl font-semibold tracking-tight">Invalid link</h2>
        <Alert tone="error" className="mt-6">
          This link is incomplete or malformed. Copy the full link from your email, or request a new one.
        </Alert>
        <Link to="/forgot-password" className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          Request a new reset link
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-semibold tracking-tight">{isInvite ? 'Set up your account' : 'Choose a new password'}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {isInvite ? 'Create a password to accept your invitation.' : 'Your new password will sign you out of all other devices.'}
      </p>

      {error && (
        <Alert tone="error" className="mt-6">
          {error.message}
          {error.code === 'INVALID_TOKEN' && (
            <Link to="/forgot-password" className="mt-1 block font-medium underline">
              Request a new link
            </Link>
          )}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <PasswordInput label="New password" autoComplete="new-password" autoFocus {...field('password')} />
          {values.password && <PasswordChecklist password={values.password} />}
        </div>
        <PasswordInput label="Confirm new password" autoComplete="new-password" {...field('confirm')} />
        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          {isInvite ? 'Set password' : 'Update password'}
        </Button>
      </form>
    </>
  );
}
