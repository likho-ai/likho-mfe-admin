/** What the workspace does on its own. */
import { useEngines, useSettings, useUpdateSettings } from '@likho-ai/web-sdk';

export function WorkspaceSettings() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const engines = useEngines();

  return (
    <section
      className="rounded-card border border-line bg-surface p-6 shadow-card"
      aria-labelledby="workspace"
    >
      <h2 id="workspace" className="text-xl font-bold">
        Workspace
      </h2>
      <label className="mt-4 flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-5 accent-[var(--likho-accent)]"
          checked={settings.data?.autoTranscribe ?? true}
          disabled={settings.isPending || update.isPending}
          onChange={(e) => update.mutate({ autoTranscribe: e.target.checked })}
        />
        <span>
          <span className="font-medium">Transcribe every recording as soon as it is ready</span>
          <span className="block text-sm text-ink-2">
            Off: recordings wait until someone presses Transcribe.
          </span>
        </span>
      </label>
      {update.error && (
        <p role="alert" className="mt-2 text-sm text-[var(--likho-status-failed-ink)]">
          {update.error.message}
        </p>
      )}
      <p className="mt-4 text-sm text-ink-2">
        Models the workers can run:{' '}
        {(engines.data ?? []).map((e) => (
          <span key={e.registryId} className="mr-2 font-mono text-xs">
            {e.registryId}
            {e.isDefault ? ' (default)' : ''}
          </span>
        ))}
        {engines.isError && <span>not known right now (the transcription service is not answering).</span>}
      </p>
    </section>
  );
}
