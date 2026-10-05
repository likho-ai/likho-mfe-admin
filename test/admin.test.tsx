import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { fakeApi, person, renderAt } from './helpers';

const user = (id: string, email: string, name: string, role: string, disabledAt: string | null = null) => ({
  id,
  email,
  name,
  role,
  createdAt: new Date().toISOString(),
  disabledAt,
});

const invitation = (id: string, email: string, role: string, extra: Record<string, unknown> = {}) => ({
  id,
  email,
  name: '',
  role,
  invitedBy: 'usr_1',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  acceptedAt: null,
  revokedAt: null,
  ...extra,
});

const entry = (id: string, action: string, actorName: string, details: Record<string, unknown> = {}) => ({
  id,
  actorKind: 'user',
  actorId: 'usr_1',
  actorName,
  action,
  targetKind: action.split('.')[0],
  targetId: 'x_' + id,
  details: JSON.stringify(details),
  ip: '127.0.0.1',
  createdAt: new Date().toISOString(),
});

const quiet = {
  Me: () => ({ me: person }),
  Users: () => ({ users: [user('usr_1', 'a@example.test', 'Asha', 'admin')] }),
  Invitations: () => ({ invitations: [] }),
  ApiKeys: () => ({ apiKeys: [] }),
  Settings: () => ({ settings: { autoTranscribe: true } }),
  Engines: () => ({
    engines: [{ registryId: 'whisper-turbo', engine: 'faster-whisper', available: true, isDefault: true }],
  }),
  AuditLog: () => ({ auditLog: { items: [], hasMore: false, endCursor: null } }),
};

describe('the admin app', () => {
  it('shows people with their roles, and changes a role', async () => {
    const people = [
      user('usr_1', 'a@example.test', 'Asha', 'admin'),
      user('usr_2', 'v@example.test', 'Vee', 'viewer'),
      user('usr_3', 'd@example.test', 'Dev', 'member', new Date().toISOString()),
    ];
    const { client, calls } = fakeApi({
      ...quiet,
      Users: () => ({ users: people }),
      SetUserRole: (v) => {
        const found = people.find((p) => p.id === v.userId)!;
        found.role = v.role as string;
        return { setUserRole: found };
      },
      EnableUser: (v) => {
        const found = people.find((p) => p.id === v.userId)!;
        found.disabledAt = null;
        return { enableUser: found };
      },
    });
    renderAt('/admin', <App />, client);
    expect(await screen.findByRole('heading', { name: 'People' })).toBeInTheDocument();
    expect(await screen.findByText('3 people')).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]!).getByText('(you)')).toBeInTheDocument();
    expect(within(rows[0]!).getByLabelText('Role of Asha')).toBeDisabled(); // not your own role
    expect(within(rows[0]!).queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument();

    const u = userEvent.setup();
    await u.selectOptions(within(rows[1]!).getByLabelText('Role of Vee'), 'member');
    await waitFor(() =>
      expect(calls.find((c) => c.name === 'SetUserRole')?.variables).toEqual({
        userId: 'usr_2',
        role: 'member',
      }),
    );
    await waitFor(() => expect(within(rows[1]!).getByLabelText('Role of Vee')).toHaveValue('member'));

    await u.click(within(rows[2]!).getByRole('button', { name: 'Enable' }));
    await waitFor(() => expect(calls.some((c) => c.name === 'EnableUser')).toBe(true));
    await waitFor(() =>
      expect(within(rows[2]!).getByRole('button', { name: 'Disable' })).toBeInTheDocument(),
    );
  });

  it('invites a person and shows the link to pass on', async () => {
    const sent: Record<string, unknown>[] = [];
    const { client } = fakeApi({
      ...quiet,
      Invitations: () => ({ invitations: sent }),
      InviteUser: (v) => {
        const input = v.input as { email: string; role: string; name: string | null };
        const made = invitation('inv_1', input.email, input.role);
        sent.push(made);
        return { inviteUser: { invitation: made, link: 'http://localhost:8080/invite/t0k', sent: false } };
      },
      RevokeInvitation: () => {
        sent[0]!.revokedAt = new Date().toISOString();
        return { revokeInvitation: true };
      },
    });
    renderAt('/admin', <App />, client);
    const form = await screen.findByRole('form', { name: 'Invite' });
    const u = userEvent.setup();
    await u.type(within(form).getByLabelText('Email'), 'new@example.test');
    await u.selectOptions(within(form).getByLabelText('Role'), 'viewer');
    await u.click(within(form).getByRole('button', { name: 'Invite' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Mail is not set up: pass this link to new@example.test yourself.');
    expect(status).toHaveTextContent('http://localhost:8080/invite/t0k');

    const list = screen.getByRole('list', { name: 'Invitations sent' });
    expect(await within(list).findByText('new@example.test')).toBeInTheDocument();
    expect(within(list).getByText('Open')).toBeInTheDocument();
    await u.click(within(list).getByRole('button', { name: 'Revoke' }));
    expect(await within(list).findByText('Revoked')).toBeInTheDocument();
  });

  it('makes an API key, shows it once, and lists the audit log by kind', async () => {
    const { client } = fakeApi({
      ...quiet,
      CreateApiKey: () => ({ createApiKey: { id: 'key_1', key: 'lk_secret' } }),
      ApiKeys: () => ({
        apiKeys: [{ id: 'key_1', name: 'dialer', createdAt: 't', lastUsedAt: null, revokedAt: null }],
      }),
      AuditLog: (v) => {
        const filter = v.filter as { action?: string } | null;
        const items = [
          entry('aud_3', 'recording.deleted', 'Asha', { originalName: 'call.mp3' }),
          entry('aud_2', 'user.invited', 'Asha', { email: 'v@example.test', role: 'viewer' }),
          entry('aud_1', 'api_key.created', 'Asha', { name: 'dialer' }),
        ].filter((e) => !filter?.action || e.action === filter.action);
        return { auditLog: { items, hasMore: false, endCursor: null } };
      },
    });
    renderAt('/admin', <App />, client);
    const u = userEvent.setup();
    const keys = await screen.findByRole('form', { name: 'Make a key' });
    await u.type(within(keys).getByLabelText('Name of the new key'), 'dialer');
    await u.click(within(keys).getByRole('button', { name: 'Make a key' }));
    expect(await screen.findByText('lk_secret')).toBeInTheDocument();

    const changes = await screen.findByRole('list', { name: 'Changes' });
    await waitFor(() => expect(within(changes).getAllByRole('listitem')).toHaveLength(3));
    expect(within(changes).getAllByRole('listitem')[0]).toHaveTextContent('Asha recording deleted');
    expect(within(changes).getAllByRole('listitem')[0]).toHaveTextContent('originalName: call.mp3');
    await u.click(screen.getByRole('button', { name: 'People' }));
    await waitFor(() => expect(within(changes).getAllByRole('listitem')).toHaveLength(1));
    expect(within(changes).getByRole('listitem')).toHaveTextContent('user invited');
  });

  it('tells a member there is nothing here for them', async () => {
    const { client } = fakeApi({ ...quiet, Me: () => ({ me: { ...person, role: 'member' } }) });
    renderAt('/admin', <App />, client);
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin can see this page.');
    expect(screen.queryByRole('heading', { name: 'People' })).not.toBeInTheDocument();
  });
});
