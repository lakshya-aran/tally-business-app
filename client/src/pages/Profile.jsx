import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PageHeader from '../components/PageHeader';
import AvatarUploader from '../components/AvatarUploader';
import Button from '../components/ui/Button';
import { Input, PasswordInput } from '../components/ui/Field';
import { Badge } from '../components/ui/Feedback';
import { ConfirmDialog } from '../components/ui/Modal';
import { useAuth, ROLE_LABELS } from '../hooks/useAuth';
import { useForm } from '../hooks/useForm';
import { authService } from '../services/authService';
import { parseError } from '../services/api';
import { setSession, logout } from '../store/authSlice';
import { signOutStorage } from '../firebase/storageService';
import { nameError, passwordError, phoneError, required } from '../utils/validators';
import { PasswordChecklist } from './auth/Register';

function Section({ title, description, children }) {
  return (
    <section className="card grid gap-6 p-5 md:grid-cols-3 md:p-6">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="md:col-span-2">{children}</div>
    </section>
  );
}

function ProfileForm({ user }) {
  const dispatch = useDispatch();
  const { field, handleSubmit, setErrors, values } = useForm(
    { name: user.name, phone: user.phone ?? '' },
    (v) => ({ name: nameError(v.name), phone: phoneError(v.phone) })
  );
  const [saving, setSaving] = useState(false);
  const dirty = values.name !== user.name || values.phone !== (user.phone ?? '');

  const onSubmit = handleSubmit(async (vals) => {
    setSaving(true);
    try {
      const res = await authService.updateProfile({ name: vals.name.trim(), phone: vals.phone.trim() });
      dispatch(setSession(res.data));
      toast.success('Profile updated');
    } catch (err) {
      const e = parseError(err);
      setErrors(e.fields);
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" autoComplete="name" required {...field('name')} />
        <Input label="Phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" {...field('phone')} />
      </div>
      <Input label="Email" value={user.email} disabled hint="Contact support to change your sign-in email." />
      <div className="flex justify-end">
        <Button type="submit" loading={saving} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const { field, handleSubmit, setErrors, values, reset } = useForm(
    { currentPassword: '', newPassword: '', confirm: '' },
    (v) => ({
      currentPassword: required(v.currentPassword, 'Current password'),
      newPassword: passwordError(v.newPassword),
      confirm: v.confirm !== v.newPassword ? 'Passwords do not match' : undefined,
    })
  );
  const [saving, setSaving] = useState(false);

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setSaving(true);
    try {
      const res = await authService.changePassword({ currentPassword, newPassword });
      toast.success(res.message);
      reset();
    } catch (err) {
      const e = parseError(err);
      setErrors(e.fields);
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <PasswordInput label="Current password" autoComplete="current-password" {...field('currentPassword')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <PasswordInput label="New password" autoComplete="new-password" {...field('newPassword')} />
          {values.newPassword && <PasswordChecklist password={values.newPassword} />}
        </div>
        <PasswordInput label="Confirm new password" autoComplete="new-password" {...field('confirm')} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Update password
        </Button>
      </div>
    </form>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const saveAvatar = async (avatar) => {
    setSavingAvatar(true);
    try {
      const res = await authService.updateProfile({ avatar });
      dispatch(setSession(res.data));
      toast.success(avatar ? 'Photo updated' : 'Photo removed');
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setSavingAvatar(false);
    }
  };

  const logoutEverywhere = async () => {
    setLoggingOut(true);
    await Promise.all([dispatch(logout({ everywhere: true })), signOutStorage()]);
    toast.success('Signed out of all devices');
    navigate('/login', { replace: true });
  };

  return (
    <>
      <PageHeader title="My profile" description="Manage your personal details, password and sessions." />
      <div className="space-y-6">
        <Section title="Profile photo" description="Shown in the top bar and on audit records.">
          <AvatarUploader user={user} busy={savingAvatar} onUploaded={saveAvatar} onRemove={() => saveAvatar(null)} />
        </Section>

        <Section title="Personal details">
          <ProfileForm key={user.updatedAt} user={user} />
        </Section>

        <Section title="Workspace & role">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Workspace</dt>
              <dd className="mt-0.5 font-medium">{user.account?.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Role</dt>
              <dd className="mt-1">
                <Badge tone="navy">{ROLE_LABELS[user.role]}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Member since</dt>
              <dd className="mt-0.5 font-medium">{new Date(user.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Last sign-in</dt>
              <dd className="mt-0.5 font-medium">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
              </dd>
            </div>
          </dl>
        </Section>

        <Section title="Password" description="Changing your password signs you out on every other device.">
          <PasswordForm />
        </Section>

        <Section title="Sessions" description="Lost a device or signed in somewhere public?">
          <Button variant="outline" onClick={() => setConfirmLogoutAll(true)}>
            Sign out of all devices
          </Button>
        </Section>
      </div>

      <ConfirmDialog
        open={confirmLogoutAll}
        onClose={() => setConfirmLogoutAll(false)}
        onConfirm={logoutEverywhere}
        loading={loggingOut}
        title="Sign out everywhere?"
        message="You will be signed out on all devices, including this one."
        confirmLabel="Sign out everywhere"
      />
    </>
  );
}
