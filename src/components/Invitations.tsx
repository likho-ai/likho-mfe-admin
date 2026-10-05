/** Inviting people: an email, a role, and the link that comes back. */
import { Button, StatusChip } from '@likho-ai/ui';
import {
  useInvitations,
  useInviteUser,
  useRevokeInvitation,
  type Invitation,
  type Role,
} from '@likho-ai/web-sdk';
import { useState, type FormEvent } from 'react';
import { ROLE_WORDS, when } from '../lib/format';

function standing(invitation: Invitation): { chip: 'done' | 'failed' | 'queued' | 'new'; label: string } {
  if (invitation.acceptedAt) return { chip: 'done', label: 'Accepted' };
  if (invitation.revokedAt) return { chip: 'failed', label: 'Revoked' };
  if (new Date(invitation.expiresAt).getTime() < Date.now()) return { chip: 'failed', label: 'Expired' };
  return { chip: 'queued', label: 'Open' };
}

export function Invitations() {
  const invitations = useInvitations();
  const invite = useInviteUser();
  const revoke = useRevokeInvitation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [made, setMade] = useState<{ email: string; link: string; sent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    invite.mutate(
      { email: email.trim(), name: name.trim() || null, role },
      {
        onSuccess: (data) => {
          setMade({ email: data.invitation.email, link: data.link, sent: data.sent });
          setCopied(false);
          setEmail('');
          setName('');
        },
      },
    );
  };

  const copy = async () => {
    if (!made) return;
    try {
      await navigator.clipboard.writeText(made.link);
      setCopied(true);
    } catch {
      /* the link is shown; it can be selected */
    }
  };

  return (
    <section
      className="rounded-card border border-line bg-surface p-6 shadow-card"
      aria-labelledby="invitations"
    >
      <h2 id="invitations" className="text-xl font-bold">
        Invite someone
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        They get a link that works once, for seven days, and choose their own password.
      </p>
      <form
        onSubmit={submit}
        className="mt-4 grid gap-2 sm:grid-cols-[1.3fr_1fr_auto_auto]"
        aria-label="Invite"
      >
        <label className="block">
          <span className="sr-only">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@company.com"
            className="min-h-11 w-full rounded-input border border-line-strong bg-surface px-3 text-ink focus-visible:outline-accent"
          />
        </label>
        <label className="block">
          <span className="sr-only">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="min-h-11 w-full rounded-input border border-line-strong bg-surface px-3 text-ink focus-visible:outline-accent"
          />
        </label>
        <label className="block">
          <span className="sr-only">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="min-h-11 w-full rounded-input border border-line-strong bg-surface px-3 text-ink"
          >
            {(['member', 'viewer', 'admin'] as Role[]).map((option) => (
              <option key={option} value={option}>
                {ROLE_WORDS[option]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="primary" disabled={invite.isPending}>
          {invite.isPending ? 'Inviting…' : 'Invite'}
        </Button>
      </form>
      {invite.error && (
        <p role="alert" className="mt-3 text-sm text-[var(--likho-status-failed-ink)]">
          {invite.error.message}
        </p>
      )}
      {made && (
        <div className="mt-3 rounded-input bg-surface-2 px-3 py-2 text-sm" role="status">
          <p>
            {made.sent
              ? `The link was mailed to ${made.email}. In case it does not arrive, it is here too:`
              : `Mail is not set up: pass this link to ${made.email} yourself.`}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <code className="select-all break-all font-mono text-xs">{made.link}</code>
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </p>
        </div>
      )}

      <h3 className="mt-6 text-sm font-medium text-ink-3">Invitations sent</h3>
      <ul className="mt-2 divide-y divide-line text-sm" aria-label="Invitations sent">
        {(invitations.data ?? []).map((invitation) => {
          const state = standing(invitation);
          return (
            <li key={invitation.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
              <span className="font-medium text-ink">{invitation.email}</span>
              <span className="text-ink-2">{ROLE_WORDS[invitation.role]}</span>
              <StatusChip status={state.chip} label={state.label} />
              <span className="text-ink-3">{when(invitation.createdAt)}</span>
              {state.label === 'Open' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate({ id: invitation.id })}
                >
                  Revoke
                </Button>
              )}
            </li>
          );
        })}
        {invitations.isSuccess && invitations.data.length === 0 && (
          <li className="py-2 text-ink-3">Nobody has been invited yet.</li>
        )}
      </ul>
    </section>
  );
}
