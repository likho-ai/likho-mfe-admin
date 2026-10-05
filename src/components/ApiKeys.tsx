/** Keys for scripts and connectors: made once, shown once, revocable. */
import { Button } from '@likho-ai/ui';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '@likho-ai/web-sdk';
import { useState, type FormEvent } from 'react';
import { when } from '../lib/format';

export function ApiKeys() {
  const keys = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const [keyName, setKeyName] = useState('');
  const [shownKey, setShownKey] = useState<string | null>(null);

  const makeKey = (event: FormEvent) => {
    event.preventDefault();
    if (!keyName.trim()) return;
    createKey.mutate(
      { name: keyName.trim() },
      {
        onSuccess: (data) => {
          setShownKey(data.createApiKey.key);
          setKeyName('');
        },
      },
    );
  };

  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-card" aria-labelledby="keys">
      <h2 id="keys" className="text-xl font-bold">
        API keys
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        For scripts and connectors: <code className="font-mono text-xs">Authorization: Bearer lk_…</code> on
        the REST API (/api/docs). A key acts as a member.
      </p>
      <form onSubmit={makeKey} className="mt-4 flex flex-wrap gap-2" aria-label="Make a key">
        <input
          aria-label="Name of the new key"
          value={keyName}
          onChange={(e) => setKeyName(e.target.value)}
          placeholder="dialer connector"
          className="min-h-11 flex-1 rounded-input border border-line-strong bg-surface px-3 text-ink focus-visible:outline-accent"
        />
        <Button type="submit" variant="primary" disabled={createKey.isPending}>
          Make a key
        </Button>
      </form>
      {createKey.error && (
        <p role="alert" className="mt-3 text-sm text-[var(--likho-status-failed-ink)]">
          {createKey.error.message}
        </p>
      )}
      {shownKey && (
        <p className="mt-3 rounded-input bg-surface-2 px-3 py-2 text-sm" role="status">
          Copy it now; it is not shown again: <code className="select-all font-mono">{shownKey}</code>
        </p>
      )}
      <ul className="mt-4 divide-y divide-line text-sm" aria-label="API keys">
        {(keys.data ?? []).map((key) => (
          <li key={key.id} className="flex items-center justify-between py-2">
            <span>
              <span className="font-medium">{key.name}</span>
              <span className="ml-2 text-ink-3">
                {key.revokedAt
                  ? 'revoked'
                  : key.lastUsedAt
                    ? `last used ${when(key.lastUsedAt)}`
                    : 'never used'}
              </span>
            </span>
            {!key.revokedAt && (
              <Button variant="ghost" size="sm" onClick={() => revokeKey.mutate({ id: key.id })}>
                Revoke
              </Button>
            )}
          </li>
        ))}
        {keys.isSuccess && keys.data.length === 0 && <li className="py-2 text-ink-3">No keys yet.</li>}
      </ul>
    </section>
  );
}
