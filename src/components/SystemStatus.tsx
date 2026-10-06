/** Whether every service of the platform answers, checked every half minute. */
import { Button } from '@likho-ai/ui';
import { useSystemStatus } from '@likho-ai/web-sdk';
import { when } from '../lib/format';

export function SystemStatus() {
  const status = useSystemStatus();
  const services = status.data?.services ?? [];
  const down = services.filter((s) => !s.ok).length;

  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-card" aria-labelledby="system">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="system" className="text-xl font-bold">
          System
        </h2>
        <span className="flex items-center gap-2 text-sm text-ink-2">
          {status.data &&
            `likho-api ${status.data.version}; checked ${when(status.data.checkedAt)}${down ? `; ${down} not answering` : '; all answering'}`}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void status.refetch()}
            disabled={status.isFetching}
          >
            {status.isFetching ? 'Checking…' : 'Check now'}
          </Button>
        </span>
      </div>
      {status.isError && (
        <p role="alert" className="mt-3 text-sm text-[var(--likho-status-failed-ink)]">
          {status.error.message}
        </p>
      )}
      <table className="mt-4 w-full text-sm" aria-label="Services">
        <thead>
          <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
            <th className="px-3 py-2">Service</th>
            <th className="px-3 py-2">State</th>
            <th className="px-3 py-2">What it says</th>
            <th className="px-3 py-2 text-right">Answer</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.name} className="border-b border-line last:border-0">
              <td className="px-3 py-2">
                <span className="font-medium">{s.name}</span>
                <span className="block font-mono text-xs text-ink-3">{s.address}</span>
              </td>
              <td className="px-3 py-2">
                <span
                  className={`inline-flex items-center gap-1.5 font-medium ${s.ok ? 'text-[var(--likho-status-done-ink)]' : 'text-[var(--likho-status-failed-ink)]'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full ${s.ok ? 'bg-[var(--likho-status-done-ink)]' : 'bg-[var(--likho-status-failed-ink)]'}`}
                  />
                  {s.ok ? 'answering' : 'not answering'}
                </span>
              </td>
              <td className="px-3 py-2 text-ink-2">{s.detail}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">{Math.round(s.latencyMs)} ms</td>
            </tr>
          ))}
          {status.isPending && (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-ink-3">
                Asking every service…
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
