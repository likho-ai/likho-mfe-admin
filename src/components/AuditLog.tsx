/** Who changed what, newest first, with a filter by kind of change. */
import { Button } from '@likho-ai/ui';
import { useAuditLog } from '@likho-ai/web-sdk';
import { useState } from 'react';
import { actionWords, detailWords, moment } from '../lib/format';

const KINDS: { key: string; label: string }[] = [
  { key: '', label: 'Everything' },
  { key: 'user.', label: 'People' },
  { key: 'invitation.', label: 'Invitations' },
  { key: 'recording.', label: 'Recordings' },
  { key: 'job.', label: 'Jobs' },
  { key: 'transcript.', label: 'Transcripts' },
  { key: 'import.', label: 'Imports' },
  { key: 'api_key.', label: 'API keys' },
  { key: 'settings.', label: 'Settings' },
];

export function AuditLog() {
  const [action, setAction] = useState('');
  const [kind, setKind] = useState('');
  const log = useAuditLog(action ? { action } : undefined, 50);
  const entries = (log.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (entry) => !kind || entry.action.startsWith(kind),
  );

  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-card" aria-labelledby="audit">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="audit" className="text-xl font-bold">
          Audit log
        </h2>
        <p className="text-sm text-ink-3">Every change, with who made it.</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Kind of change" className="flex flex-wrap gap-1">
          {KINDS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={kind === option.key}
              onClick={() => {
                setKind(option.key);
                setAction('');
              }}
              className={`min-h-9 rounded-full px-3 text-sm font-medium ${
                kind === option.key ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="ml-auto block">
          <span className="sr-only">Exact action</span>
          <input
            value={action}
            onChange={(e) => {
              setAction(e.target.value.trim());
              setKind('');
            }}
            placeholder="e.g. recording.deleted"
            className="min-h-9 rounded-full border border-line bg-surface px-4 font-mono text-xs text-ink focus-visible:outline-accent"
          />
        </label>
      </div>
      {log.isError && (
        <p role="alert" className="mt-3 text-sm text-[var(--likho-status-failed-ink)]">
          {log.error.message}
        </p>
      )}
      <ol className="mt-4 divide-y divide-line text-sm" aria-label="Changes">
        {entries.map((entry) => (
          <li key={entry.id} className="grid gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[9rem_1fr]">
            <time dateTime={entry.createdAt} className="text-ink-3">
              {moment(entry.createdAt)}
            </time>
            <div>
              <p>
                <span className="font-medium text-ink">{entry.actorName || 'Someone'}</span>{' '}
                <span className="text-ink-2">{actionWords(entry.action).toLowerCase()}</span>
                {entry.targetId && (
                  <code className="ml-2 font-mono text-xs text-ink-3">{entry.targetId}</code>
                )}
              </p>
              {entry.details !== '{}' && <p className="text-xs text-ink-3">{detailWords(entry.details)}</p>}
            </div>
          </li>
        ))}
        {log.isSuccess && entries.length === 0 && <li className="py-3 text-ink-3">Nothing to show.</li>}
        {log.isPending && (
          <li className="animate-pulse py-3">
            <div className="h-4 w-1/2 rounded bg-surface-2" />
          </li>
        )}
      </ol>
      {log.hasNextPage && (
        <div className="mt-3 text-center">
          <Button onClick={() => log.fetchNextPage()} disabled={log.isFetchingNextPage}>
            {log.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </section>
  );
}
