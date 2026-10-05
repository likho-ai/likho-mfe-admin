/** The people of the workspace: who they are, what they may do, and whether they can sign in. */
import { Button } from '@likho-ai/ui';
import { useDisableUser, useEnableUser, useMe, useSetUserRole, useUsers, type Role } from '@likho-ai/web-sdk';
import { ROLE_HELP, ROLE_WORDS, when } from '../lib/format';

const ROLES: Role[] = ['admin', 'member', 'viewer'];

export function People() {
  const me = useMe();
  const users = useUsers();
  const setRole = useSetUserRole();
  const disable = useDisableUser();
  const enable = useEnableUser();
  const busy = setRole.isPending || disable.isPending || enable.isPending;
  const error = setRole.error ?? disable.error ?? enable.error;

  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-card" aria-labelledby="people">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="people" className="text-xl font-bold">
          People
        </h2>
        <p className="text-sm text-ink-3">
          {users.data ? `${users.data.length} ${users.data.length === 1 ? 'person' : 'people'}` : '…'}
        </p>
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-ink-2 sm:grid-cols-3">
        {ROLES.map((role) => (
          <div key={role}>
            <dt className="inline font-medium text-ink">{ROLE_WORDS[role]}: </dt>
            <dd className="inline">{ROLE_HELP[role]}</dd>
          </div>
        ))}
      </dl>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--likho-status-failed-ink)]">
          {error.message}
        </p>
      )}
      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-ink-3">
          <tr>
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Email</th>
            <th className="py-2 pr-4 font-medium">Role</th>
            <th className="py-2 pr-4 font-medium">Joined</th>
            <th className="py-2 text-right font-medium">
              <span className="sr-only">Standing</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.isPending && (
            <tr className="animate-pulse border-t border-line">
              <td colSpan={5} className="py-4">
                <div className="h-4 w-1/2 rounded bg-surface-2" />
              </td>
            </tr>
          )}
          {users.isError && (
            <tr className="border-t border-line">
              <td colSpan={5} className="py-4">
                <p role="alert">{users.error.message}</p>
              </td>
            </tr>
          )}
          {(users.data ?? []).map((user) => {
            const self = user.id === me.data?.id;
            return (
              <tr key={user.id} className={`border-t border-line ${user.disabledAt ? 'text-ink-3' : ''}`}>
                <td className="py-3 pr-4 font-medium text-ink">
                  {user.name}
                  {self && <span className="ml-2 text-xs font-normal text-ink-3">(you)</span>}
                </td>
                <td className="py-3 pr-4">{user.email}</td>
                <td className="py-3 pr-4">
                  <label className="sr-only" htmlFor={`role-${user.id}`}>
                    Role of {user.name}
                  </label>
                  <select
                    id={`role-${user.id}`}
                    value={user.role}
                    disabled={self || busy || Boolean(user.disabledAt)}
                    onChange={(e) => setRole.mutate({ userId: user.id, role: e.target.value as Role })}
                    className="min-h-9 rounded-input border border-line-strong bg-surface px-2 text-ink disabled:opacity-60"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_WORDS[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 pr-4">{when(user.createdAt)}</td>
                <td className="py-3 text-right">
                  {user.disabledAt ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => enable.mutate({ userId: user.id })}
                    >
                      Enable
                    </Button>
                  ) : (
                    !self && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(`Disable ${user.name}? They are signed out at once and cannot sign in.`)
                          )
                            disable.mutate({ userId: user.id });
                        }}
                      >
                        Disable
                      </Button>
                    )
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
