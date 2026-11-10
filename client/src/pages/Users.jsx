import { useCallback, useEffect, useState } from 'react';
import { Search, UserPlus, Users as UsersIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { Input, Select } from '../components/ui/Field';
import { Badge, EmptyState, Skeleton, Alert } from '../components/ui/Feedback';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { useAuth, ROLE_LABELS } from '../hooks/useAuth';
import { useForm } from '../hooks/useForm';
import { useDebounce } from '../hooks/useDebounce';
import { userService } from '../services/authService';
import { parseError } from '../services/api';
import { emailError, nameError } from '../utils/validators';
import DevLinkNotice from './auth/DevLinkNotice';

const ASSIGNABLE = ['admin', 'accountant', 'staff'];
const ROLE_HELP = {
  admin: 'Full access, including users and settings',
  accountant: 'Books, vouchers, invoices, GST and reports',
  staff: 'Day-to-day sales, parties and expenses',
};

function InviteModal({ open, onClose, onInvited }) {
  const { field, handleSubmit, setErrors, reset, values } = useForm(
    { name: '', email: '', role: 'staff' },
    (v) => ({ name: nameError(v.name), email: emailError(v.email) })
  );
  const [saving, setSaving] = useState(false);
  const [devLink, setDevLink] = useState(null);

  const close = () => {
    reset();
    setErrors({});
    setDevLink(null);
    onClose();
  };

  const onSubmit = handleSubmit(async (vals) => {
    setSaving(true);
    try {
      const res = await userService.invite(vals);
      toast.success(res.message);
      onInvited();
      if (res.data.devLink) setDevLink(res.data.devLink);
      else close();
    } catch (err) {
      const e = parseError(err);
      setErrors(e.fields);
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  });

  return (
    <Modal
      open={open}
      onClose={close}
      title="Invite a team member"
      description="They'll get an email with a link to set their password."
      footer={
        devLink ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form="invite-form" loading={saving}>
              Send invitation
            </Button>
          </>
        )
      }
    >
      {devLink ? (
        <DevLinkNotice link={devLink} />
      ) : (
        <form id="invite-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input label="Full name" required autoFocus {...field('name')} />
          <Input label="Email" type="email" required {...field('email')} />
          <Select label="Role" {...field('role')} hint={ROLE_HELP[values.role]}>
            {ASSIGNABLE.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </form>
      )}
    </Modal>
  );
}

function TableSkeleton() {
  return Array.from({ length: 4 }, (_, i) => (
    <tr key={i}>
      <td className="px-4 py-3" colSpan={5}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </td>
    </tr>
  ));
}

export default function Users() {
  const { user: me } = useAuth();
  const [query, setQuery] = useState({ search: '', role: '', status: '', page: 1 });
  const search = useDebounce(query.search);
  const [state, setState] = useState({ loading: true, items: [], pagination: null, error: null });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, setPending] = useState(null); // { user, change, label }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const params = { page: query.page, limit: 10 };
      if (search) params.search = search;
      if (query.role) params.role = query.role;
      if (query.status) params.status = query.status;
      const res = await userService.list(params);
      setState({ loading: false, items: res.data, pagination: res.pagination, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: parseError(err).message }));
    }
  }, [query.page, query.role, query.status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key) => (e) => setQuery((q) => ({ ...q, [key]: e.target.value, page: 1 }));

  const applyChange = async () => {
    setSaving(true);
    try {
      await userService.update(pending.user._id, pending.change);
      toast.success(`${pending.user.name} updated`);
      setPending(null);
      load();
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const { items, pagination, loading, error } = state;
  const filtersActive = search || query.role || query.status;

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Invite your team and control what each person can access."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite user
          </Button>
        }
      />

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by name or email"
              value={query.search}
              onChange={setFilter('search')}
              aria-label="Search users"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <select className="input sm:w-40" value={query.role} onChange={setFilter('role')} aria-label="Filter by role">
              <option value="">All roles</option>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select className="input sm:w-36" value={query.status} onChange={setFilter('status')} aria-label="Filter by status">
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4">
            <Alert tone="error">
              {error}{' '}
              <button className="font-medium underline" onClick={load}>
                Retry
              </button>
            </Alert>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Last sign-in</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && !items.length ? (
                <TableSkeleton />
              ) : (
                items.map((u) => {
                  const isMe = u._id === me._id;
                  const locked = isMe || u.role === 'super_admin';
                  return (
                    <tr key={u._id} className={loading ? 'opacity-60' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} src={u.avatar?.url} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {u.name} {isMe && <span className="font-normal text-slate-400">(you)</span>}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {locked ? (
                          <Badge tone="navy">{ROLE_LABELS[u.role]}</Badge>
                        ) : (
                          <select
                            className="input h-8 w-36 py-1 text-xs"
                            value={u.role}
                            aria-label={`Role for ${u.name}`}
                            onChange={(e) =>
                              setPending({
                                user: u,
                                change: { role: e.target.value },
                                label: `Change ${u.name}'s role to ${ROLE_LABELS[e.target.value]}? They will be signed out so the new permissions apply.`,
                              })
                            }
                          >
                            {ASSIGNABLE.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!u.isActive ? (
                          <Badge tone="red">Inactive</Badge>
                        ) : u.mustSetPassword ? (
                          <Badge tone="amber">Invited</Badge>
                        ) : (
                          <Badge tone="green">Active</Badge>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-slate-500 md:table-cell dark:text-slate-400">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!locked && (
                          <Button
                            variant={u.isActive ? 'ghost' : 'outline'}
                            size="sm"
                            className={u.isActive ? 'text-red-600 dark:text-red-400' : ''}
                            onClick={() =>
                              setPending({
                                user: u,
                                change: { isActive: !u.isActive },
                                label: u.isActive
                                  ? `Deactivate ${u.name}? They will be signed out immediately and won't be able to sign in.`
                                  : `Reactivate ${u.name}? They will be able to sign in again.`,
                              })
                            }
                          >
                            {u.isActive ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon={UsersIcon}
            title={filtersActive ? 'No users match your filters' : 'No users yet'}
            description={filtersActive ? 'Try a different search or clear the filters.' : 'Invite your accountant or staff to collaborate.'}
          />
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">
              Page {pagination.page} of {pagination.pages} · {pagination.total} users
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages || loading}
                onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={load} />
      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={applyChange}
        loading={saving}
        tone={pending?.change.isActive === false ? 'danger' : 'primary'}
        title="Confirm change"
        message={pending?.label}
        confirmLabel="Confirm"
      />
    </>
  );
}
