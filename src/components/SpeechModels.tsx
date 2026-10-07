/**
 * The speech models: which one transcribes, how well each does on the gold set (calls a person
 * corrected with care), and what people's corrections have given as training data so far.
 */
import {
  useAddToGoldSet,
  useEvaluation,
  useEvaluations,
  useGoldSet,
  useRemoveFromGoldSet,
  useSetDefaultSpeechModel,
  useSpeechModels,
  useStartEvaluation,
  useTrainingStats,
  type ErrorRates,
} from '@likho-ai/web-sdk';
import { useState } from 'react';
import { when } from '../lib/format';

const percent = (rate: number) => `${(rate * 100).toFixed(1)}%`;
const minutes = (seconds: number) => `${Math.round(seconds / 60)} min`;

function Rates({ rates }: { rates: ErrorRates | null | undefined }) {
  if (!rates) return <span className="text-ink-2">not evaluated</span>;
  return (
    <span className="tabular-nums">
      <abbr title="Word error rate of the script layer (lower is better)">{percent(rates.werScript)}</abbr>
      {' · '}
      <abbr title="Word error rate of the Hinglish layer, spelling variants forgiven">
        {percent(rates.werRoman)}
      </abbr>
    </span>
  );
}

const STATUS_WORDS: Record<string, string> = {
  queued: 'Waiting',
  running: 'Running',
  completed: 'Done',
  failed: 'Failed',
};

function EvaluationDetail({ id }: { id: string }) {
  const evaluation = useEvaluation(id);
  const e = evaluation.data;
  if (!e) return <p className="text-sm text-ink-2">Loading…</p>;
  return (
    <div className="mt-2 rounded-card border border-line p-3 text-sm">
      {e.error && (
        <p role="alert" className="text-[var(--likho-status-failed-ink)]">
          {e.error}
        </p>
      )}
      <table className="w-full text-left">
        <thead className="text-ink-2">
          <tr>
            <th className="font-medium">Recording</th>
            <th className="font-medium">Words</th>
            <th className="font-medium">Script · Hinglish</th>
          </tr>
        </thead>
        <tbody>
          {e.items.map((item) => (
            <tr key={item.recordingId}>
              <td className="font-mono text-xs">{item.recordingId}</td>
              <td className="tabular-nums">{item.words}</td>
              <td>
                {item.error ? (
                  <span className="text-[var(--likho-status-failed-ink)]">{item.error}</span>
                ) : (
                  <Rates rates={item.scores} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SpeechModels() {
  const models = useSpeechModels();
  const gold = useGoldSet();
  const evaluations = useEvaluations();
  const training = useTrainingStats();
  const choose = useSetDefaultSpeechModel();
  const evaluate = useStartEvaluation();
  const add = useAddToGoldSet();
  const remove = useRemoveFromGoldSet();
  const [recordingId, setRecordingId] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const error = choose.error ?? evaluate.error ?? add.error ?? remove.error;
  const goldCount = gold.data?.items.length ?? 0;

  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-card" aria-labelledby="models">
      <h2 id="models" className="text-xl font-bold">
        Speech models
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        The default transcribes every new call. Evaluate a model on the gold set before choosing it: lower
        error rates are better.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--likho-status-failed-ink)]">
          {error.message}
        </p>
      )}
      {models.isError && (
        <p role="alert" className="mt-3 text-sm text-ink-2">
          The model service is not answering right now.
        </p>
      )}

      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-ink-2">
          <tr>
            <th className="font-medium">Model</th>
            <th className="font-medium">Latest scores (script · Hinglish)</th>
            <th className="sr-only">Actions</th>
          </tr>
        </thead>
        <tbody>
          {(models.data ?? []).map((m) => (
            <tr key={m.id} className="border-t border-line align-top">
              <td className="py-2">
                <span className="font-mono">{m.registryId}</span>
                {m.isDefault && (
                  <span className="ml-2 rounded-full bg-[var(--likho-accent)] px-2 py-0.5 text-xs text-white">
                    default
                  </span>
                )}
                {m.description && <span className="block text-ink-2">{m.description}</span>}
              </td>
              <td className="py-2">
                <Rates rates={m.latestScores} />
              </td>
              <td className="py-2 text-right whitespace-nowrap">
                <button
                  type="button"
                  className="mr-2 rounded-card border border-line px-3 py-1 hover:bg-surface-2 disabled:opacity-50"
                  disabled={goldCount === 0 || evaluate.isPending}
                  title={
                    goldCount === 0
                      ? 'Add calls to the gold set first'
                      : 'Transcribe the gold set with this model and score it'
                  }
                  onClick={() => evaluate.mutate(m.id)}
                >
                  Evaluate
                </button>
                {!m.isDefault && (
                  <button
                    type="button"
                    className="rounded-card border border-line px-3 py-1 hover:bg-surface-2 disabled:opacity-50"
                    disabled={choose.isPending}
                    onClick={() => {
                      if (window.confirm(`Transcribe every new call with ${m.registryId}?`))
                        choose.mutate(m.id);
                    }}
                  >
                    Make default
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-bold">Gold set</h3>
          <p className="text-sm text-ink-2">
            {goldCount} {goldCount === 1 ? 'call' : 'calls'}, {minutes(gold.data?.audioSeconds ?? 0)} of
            audio. Add calls whose transcript someone has checked line by line: they are what a model is
            scored against.
          </p>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (recordingId.trim()) add.mutate(recordingId.trim(), { onSuccess: () => setRecordingId('') });
            }}
          >
            <label className="sr-only" htmlFor="gold-recording">
              Recording id
            </label>
            <input
              id="gold-recording"
              className="min-w-0 flex-1 rounded-card border border-line bg-surface px-3 py-1 font-mono text-sm"
              placeholder="rec_…"
              value={recordingId}
              onChange={(e) => setRecordingId(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-card border border-line px-3 py-1 text-sm hover:bg-surface-2"
              disabled={add.isPending}
            >
              Add
            </button>
          </form>
          <ul className="mt-2 space-y-1 text-sm">
            {(gold.data?.items ?? []).map((item) => (
              <li key={item.recordingId} className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-mono text-xs">{item.recordingId}</span>{' '}
                  <span className="text-ink-2">
                    version {item.transcriptVersion}, {item.lines} lines, {minutes(item.audioSeconds)}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-ink-2 underline"
                  aria-label={`Remove ${item.recordingId} from the gold set`}
                  onClick={() => remove.mutate(item.recordingId)}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold">Training data</h3>
          <p className="text-sm text-ink-2">
            {training.data
              ? `${training.data.examples} corrected lines (${training.data.scriptExamples} script, ${training.data.romanExamples} Hinglish) from ${training.data.recordings} calls, ${minutes(training.data.audioSeconds)} of audio. Last: ${when(training.data.lastExampleAt)}.`
              : 'Every line people correct becomes a training example for fine-tuning.'}
          </p>
          <h3 className="mt-4 font-bold">Evaluations</h3>
          <ul className="mt-1 space-y-2 text-sm">
            {(evaluations.data ?? []).length === 0 && <li className="text-ink-2">None yet.</li>}
            {(evaluations.data ?? []).map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className="w-full text-left"
                  aria-expanded={open === e.id}
                  onClick={() => setOpen(open === e.id ? null : e.id)}
                >
                  <span className="font-mono">{e.registryId}</span>{' '}
                  <span className="text-ink-2">
                    {STATUS_WORDS[e.status] ?? e.status}
                    {e.status === 'running' || e.status === 'queued'
                      ? ` ${e.itemsDone}/${e.itemsTotal}`
                      : ''}{' '}
                    · {when(e.createdAt)}
                  </span>
                  {e.status === 'completed' && (
                    <span className="block">
                      <Rates rates={e.scores} />
                    </span>
                  )}
                </button>
                {open === e.id && <EvaluationDetail id={e.id} />}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
