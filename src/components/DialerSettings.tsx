/**
 * What the dialer connector does for this workspace: whether it fetches new calls by itself,
 * which campaigns, the shortest talk time, how many a day, and whether transcripts go back to
 * the CRM. The campaigns to choose from are the dialer's own, with their calls of the last week.
 * The connector picks the change up at once (likho.settings.changed).
 */
import { Button } from '@likho-ai/ui';
import {
  useDialerCampaigns,
  useDialerStatus,
  useSettings,
  useUpdateSettings,
  type WorkspaceSettings,
} from '@likho-ai/web-sdk';
import { useMemo, useState, type FormEvent } from 'react';
import { when } from '../lib/format';

type Draft = WorkspaceSettings['dialer'];

const lastWeek = () => {
  const until = new Date();
  until.setHours(0, 0, 0, 0);
  until.setDate(until.getDate() + 1);
  const since = new Date(until);
  since.setDate(since.getDate() - 7);
  return { since: since.toISOString(), until: until.toISOString() };
};

const input =
  'min-h-11 w-full rounded-input border border-line-strong bg-surface px-3 text-ink focus-visible:outline-accent';

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="font-medium">{label}</span>
      <span className="block text-sm text-ink-2">{hint}</span>
      <input
        type="number"
        className={`${input} mt-1`}
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        className="mt-1 size-5 accent-[var(--likho-accent)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-sm text-ink-2">{hint}</span>
      </span>
    </label>
  );
}

export function DialerSettings() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const status = useDialerStatus();
  const window = useMemo(() => lastWeek(), []);
  const campaigns = useDialerCampaigns(window);
  // The edits; until the first one (and after a save) the saved settings are shown as they are.
  const [edited, setEdited] = useState<Draft | null>(null);
  const [saved, setSaved] = useState(false);
  const current = settings.data?.dialer;
  const draft: Draft | null = edited ?? (current ? { ...current } : null);
  const setDraft = (next: Draft | null) => setEdited(next);

  const changed = draft && current && JSON.stringify(draft) !== JSON.stringify(current);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setSaved(false);
    if (draft) setDraft({ ...draft, [key]: value });
  };
  const toggleCampaign = (name: string) =>
    set(
      'campaigns',
      draft!.campaigns.includes(name)
        ? draft!.campaigns.filter((c) => c !== name)
        : [...draft!.campaigns, name],
    );
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    update.mutate(
      { dialer: draft },
      {
        onSuccess: () => {
          setDraft(null); // the saved settings, as the API answered them
          setSaved(true);
        },
      },
    );
  };

  // The dialer's campaigns of the last week, and any chosen one that had no calls in it.
  const known = campaigns.data ?? [];
  const extra = (draft?.campaigns ?? []).filter((c) => !known.some((k) => k.name === c));
  const s = status.data;

  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-card" aria-labelledby="dialer">
      <h2 id="dialer" className="text-xl font-bold">
        Dialer
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        Which calls the dialer connector fetches by itself, and what it does with them. A person can always
        fetch a call by hand from Recordings.
      </p>

      <dl
        className="mt-4 grid grid-cols-2 gap-3 rounded-input bg-surface-2 p-4 text-sm sm:grid-cols-4"
        aria-label="The connector now"
      >
        <div>
          <dt className="text-ink-3">Connector</dt>
          <dd className="font-medium">
            {status.isError
              ? 'not answering'
              : s
                ? `${s.version}, ${s.scheduleEnabled ? 'schedule on' : 'schedule off'}`
                : '…'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-3">Today</dt>
          <dd className="font-medium">{s ? `${s.importedToday} of ${s.dailyLimit} calls` : '–'}</dd>
        </div>
        <div>
          <dt className="text-ink-3">Up to</dt>
          <dd className="font-mono text-xs">{s?.cursor || '–'}</dd>
        </div>
        <div>
          <dt className="text-ink-3">Last run</dt>
          <dd>{s?.lastRunAt ? `${when(s.lastRunAt)}: ${s.lastRunSummary}` : '–'}</dd>
        </div>
      </dl>
      {s && !s.databaseConfigured && (
        <p role="status" className="mt-3 text-sm text-ink-2">
          The dialer’s reporting database is not configured on the connector, so it cannot list calls or
          follow a schedule; calls can still be fetched one by one.
        </p>
      )}

      {draft && (
        <form onSubmit={save} className="mt-6 space-y-5" aria-label="Dialer settings">
          <Toggle
            label="Fetch new calls by themselves"
            hint="Every few minutes, the new connected calls of the chosen campaigns, within the day’s limit."
            checked={draft.scheduleEnabled}
            onChange={(v) => set('scheduleEnabled', v)}
          />

          <fieldset>
            <legend className="font-medium">Campaigns</legend>
            <p className="text-sm text-ink-2">
              None chosen: every campaign. Calls of the last 7 days are shown beside each.
            </p>
            {campaigns.isError && (
              <p role="alert" className="mt-2 text-sm text-[var(--likho-status-failed-ink)]">
                {campaigns.error.message}
              </p>
            )}
            <div
              className="mt-2 grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2"
              role="group"
              aria-label="Campaigns to choose from"
            >
              {known.map((c) => (
                <label
                  key={c.name}
                  className="flex items-center gap-2 rounded-input px-2 py-1 hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--likho-accent)]"
                    checked={draft.campaigns.includes(c.name)}
                    onChange={() => toggleCampaign(c.name)}
                  />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="font-mono text-xs text-ink-3">
                    {c.connected}/{c.calls}
                  </span>
                </label>
              ))}
              {extra.map((name) => (
                <label key={name} className="flex items-center gap-2 rounded-input px-2 py-1">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--likho-accent)]"
                    checked
                    onChange={() => toggleCampaign(name)}
                  />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className="text-xs text-ink-3">no calls this week</span>
                </label>
              ))}
              {campaigns.isPending && <p className="text-sm text-ink-3">Asking the dialer…</p>}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Shortest talk time (seconds)"
              hint="Shorter calls are left out."
              value={draft.minTalkSeconds}
              min={0}
              max={3600}
              onChange={(v) => set('minTalkSeconds', v)}
            />
            <NumberField
              label="Calls a day"
              hint="At most this many are fetched each day."
              value={draft.dailyLimit}
              min={1}
              max={100000}
              onChange={(v) => set('dailyLimit', v)}
            />
            <NumberField
              label="Calls a run"
              hint="At most this many each time it looks."
              value={draft.batchLimit}
              min={1}
              max={1000}
              onChange={(v) => set('batchLimit', v)}
            />
            <NumberField
              label="Look every (seconds)"
              hint="How often it looks for new calls."
              value={draft.pollIntervalSeconds}
              min={30}
              max={86400}
              onChange={(v) => set('pollIntervalSeconds', v)}
            />
            <NumberField
              label="Phone digits kept"
              hint="The rest of a number is never stored; 0 = none."
              value={draft.phoneDigits}
              min={0}
              max={10}
              onChange={(v) => set('phoneDigits', v)}
            />
          </div>

          <Toggle
            label="Write transcripts back to the CRM"
            hint="When a transcript is done, its Hinglish goes into the CRM’s row of the call (the connector needs the CRM’s address)."
            checked={draft.writebackEnabled}
            onChange={(v) => set('writebackEnabled', v)}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" disabled={!changed || update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
            {changed && (
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                Undo changes
              </Button>
            )}
            {saved && !changed && (
              <span role="status" className="text-sm text-ink-2">
                Saved. The connector follows at once.
              </span>
            )}
          </div>
          {update.error && (
            <p role="alert" className="text-sm text-[var(--likho-status-failed-ink)]">
              {update.error.message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
