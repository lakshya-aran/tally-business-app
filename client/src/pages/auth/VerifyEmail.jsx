import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Spinner } from '../../components/ui/Feedback';
import { authService } from '../../services/authService';
import { parseError } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState({ status: 'loading', message: '' });
  const started = useRef(false); // tokens are single-use: don't double-submit under StrictMode

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setState({ status: 'error', message: 'This verification link is incomplete or malformed.' });
      return;
    }
    authService
      .verifyEmail(token)
      .then((res) => setState({ status: 'success', message: res.message }))
      .catch((err) => setState({ status: 'error', message: parseError(err).message }));
  }, [token]);

  return (
    <div className="text-center">
      {state.status === 'loading' && (
        <>
          <Spinner className="h-8 w-8" />
          <p className="mt-4 text-sm text-slate-500">Verifying your email…</p>
        </>
      )}
      {state.status === 'success' && (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">Email verified</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{state.message}</p>
        </>
      )}
      {state.status === 'error' && (
        <>
          <XCircle className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">Verification failed</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {state.message} You can request a new link from the sign-in page.
          </p>
        </>
      )}
      {state.status !== 'loading' && (
        <Link
          to={isAuthenticated ? '/dashboard' : '/login'}
          className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {isAuthenticated ? 'Go to dashboard' : 'Continue to sign in'}
        </Link>
      )}
    </div>
  );
}
