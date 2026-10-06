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

const dialerDefaults = () => ({
  scheduleEnabled: false,
  campaigns: [] as string[],
  minTalkSeconds: 20,
  dailyLimit: 200,
  batchLimit: 50,
  pollIntervalSeconds: 300,
  phoneDigits: 4,
  writebackEnabled: false,
});

const dialerStatus = (extra: Record<string, unknown> = {}) => ({
  databaseConfigured: true,
  scheduleEnabled: false,
  cursor: '2026-10-02 10:56:04',
  importedToday: 3,
  dailyLimit: 200,
  campaigns: [],
  minTalkSeconds: 20,
  writebackEnabled: false,
  archiveEnabled: true,
  version: '0.4.0',
  lastRunAt: null,
  lastRunSummary: '',
  ...extra,
});

const quiet = {
  Me: () => ({ me: person }),
  Users: () => ({ users: [user('usr_1', 'a@example.test', 'Asha', 'admin')] }),
  Invitations: () => ({ invitations: [] }),
  ApiKeys: () => ({ apiKeys: [] }),
  Settings: () => ({ settings: { autoTranscribe: true, dialer: dialerDefaults() } }),
  DialerStatus: () => ({ dialerStatus: dialerStatus() }),
  DialerCampaigns: () => ({ dialerCampaigns: [] }),
  SystemStatus: () => ({
    systemStatus: { version: '0.11.0', checkedAt: new Date().toISOString(), services: [] },
  }),
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

describe('the dialer and the system', () => {
  it('lists the dialer’s campaigns to choose from, and saves the schedule, the campaigns and the limits', async () => {
    let dialer = dialerDefaults();
    const { client, calls } = fakeApi({
      ...quiet,
      Settings: () => ({ settings: { autoTranscribe: true, dialer } }),
      DialerStatus: () => ({
        dialerStatus: dialerStatus({
          lastRunAt: new Date().toISOString(),
          lastRunSummary: 'seen 50, taken 4',
        }),
      }),
      DialerCampaigns: () => ({
        dialerCampaigns: [
          { name: 'Sales', calls: 900, connected: 700, interactions: 880, talkSeconds: 90000 },
          { name: 'Support', calls: 300, connected: 120, interactions: 300, talkSeconds: 9000 },
        ],
      }),
      UpdateSettings: (v) => {
        dialer = { ...dialer, ...(v.input as { dialer: typeof dialer }).dialer };
        return { updateSettings: { autoTranscribe: true, dialer } };
      },
    });
    renderAt('/admin', <App />, client);
    const now = await screen.findByLabelText('The connector now');
    await waitFor(() => expect(now).toHaveTextContent('0.4.0, schedule off'));
    expect(now).toHaveTextContent('3 of 200 calls');
    expect(now).toHaveTextContent('seen 50, taken 4');

    const form = await screen.findByRole('form', { name: 'Dialer settings' });
    const group = within(form).getByRole('group', { name: 'Campaigns to choose from' });
    await waitFor(() => expect(within(group).getByText('Sales')).toBeInTheDocument());
    expect(within(group).getByText('700/900')).toBeInTheDocument();
    const save = within(form).getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled(); // nothing changed yet

    const u = userEvent.setup();
    await u.click(within(form).getByLabelText(/Fetch new calls by themselves/));
    await u.click(within(group).getByLabelText(/Sales/));
    const limit = within(form).getByLabelText(/Calls a day/);
    await u.clear(limit);
    await u.type(limit, '500');
    await u.click(save);
    await waitFor(() => expect(calls.some((c) => c.name === 'UpdateSettings')).toBe(true));
    expect(calls.find((c) => c.name === 'UpdateSettings')!.variables).toEqual({
      input: {
        dialer: { ...dialerDefaults(), scheduleEnabled: true, campaigns: ['Sales'], dailyLimit: 500 },
      },
    });
    expect(await within(form).findByRole('status')).toHaveTextContent('Saved');
  });

  it('shows whether every service answers', async () => {
    const { client } = fakeApi({
      ...quiet,
      SystemStatus: () => ({
        systemStatus: {
          version: '0.11.0',
          checkedAt: new Date().toISOString(),
          services: [
            { name: 'likho-media', address: 'localhost:5010', ok: true, detail: 'answers', latencyMs: 4 },
            {
              name: 'likho-connector-ameyo',
              address: 'localhost:5060',
              ok: false,
              detail: 'no answer within 3 s',
              latencyMs: 3000,
            },
          ],
        },
      }),
    });
    renderAt('/admin', <App />, client);
    const table = await screen.findByRole('table', { name: 'Services' });
    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(3));
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('likho-media');
    expect(rows[0]).toHaveTextContent('answering');
    expect(rows[1]).toHaveTextContent('not answering');
    expect(rows[1]).toHaveTextContent('no answer within 3 s');
    expect(screen.getByText(/1 not answering/)).toBeInTheDocument();
  });
});
