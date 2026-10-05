/** Dates and words shared by the sections. */

export function when(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function moment(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ROLE_WORDS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export const ROLE_HELP: Record<string, string> = {
  admin: 'Manages people, keys and settings, and does everything a member does.',
  member: 'Uploads, transcribes, corrects and keeps the vocabulary.',
  viewer: 'Reads, plays and searches. Cannot change anything.',
};

/** 'recording.deleted' -> 'Recording deleted'. */
export function actionWords(action: string): string {
  const [kind = '', what = ''] = action.split('.');
  const subject = kind.replace(/_/g, ' ');
  const verb = what.replace(/_/g, ' ');
  return (subject.charAt(0).toUpperCase() + subject.slice(1) + ' ' + verb).trim();
}

/** The one or two details worth a glance, from the JSON an audit entry carries. */
export function detailWords(details: string): string {
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return Object.entries(parsed)
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
      .slice(0, 4)
      .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
      .join(' · ');
  } catch {
    return details;
  }
}
