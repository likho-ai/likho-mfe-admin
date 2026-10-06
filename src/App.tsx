/**
 * The admin app: the people of the workspace and their roles, invitations, API keys, the
 * workspace settings, the dialer connector, whether every service answers, and the audit log. Exposed to the shell as ./App; mounted at /admin.
 * Only an admin gets here (the shell checks the role; the API refuses everyone else).
 */
import { useMe } from '@likho-ai/web-sdk';
import { ApiKeys } from './components/ApiKeys';
import { AuditLog } from './components/AuditLog';
import { DialerSettings } from './components/DialerSettings';
import { Invitations } from './components/Invitations';
import { People } from './components/People';
import { SystemStatus } from './components/SystemStatus';
import { WorkspaceSettings } from './components/WorkspaceSettings';
import './app.css';

export default function App() {
  const me = useMe();
  const admin = me.data?.role === 'admin';

  return (
    <div data-mfe="admin" className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="mt-1 text-ink-2">
          {me.data ? (
            <>
              Workspace <span className="font-medium text-ink">{me.data.workspace.name}</span>: who is in it,
              what they may do, and what changed.
            </>
          ) : (
            '…'
          )}
        </p>
      </div>
      {me.isSuccess && !admin && (
        <p role="alert" className="rounded-card border border-line bg-surface p-6 shadow-card">
          Only an admin can see this page.
        </p>
      )}
      {admin && (
        <>
          <People />
          <Invitations />
          <div className="grid gap-6 lg:grid-cols-2">
            <ApiKeys />
            <WorkspaceSettings />
          </div>
          <DialerSettings />
          <SystemStatus />
          <AuditLog />
        </>
      )}
    </div>
  );
}
