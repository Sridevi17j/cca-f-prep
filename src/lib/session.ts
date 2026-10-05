export const SESSION_PREFIX = "pihive-ccaf:v1:";

export type StoredSession = {
  index: number;
  answers: Record<string, string>;
  updatedAt: number;
};

export type SavedSession = {
  storageKey: string;
  href: string;
  label: string;
  answered: number;
  index: number;
  updatedAt: number;
};

export function fullStorageKey(storageKey: string): string {
  return `${SESSION_PREFIX}${storageKey}`;
}

const sessionListeners = new Set<() => void>();

export function subscribeSessions(onChange: () => void): () => void {
  sessionListeners.add(onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    sessionListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
  };
}

function notifySessions(): void {
  for (const listener of sessionListeners) listener();
}

export function scoreAnswers(
  questions: readonly { id: string; correct: string }[],
  answers: Record<string, string>,
): { answered: number; correct: number } {
  let answered = 0;
  let correct = 0;
  for (const question of questions) {
    const choice = answers[question.id];
    if (!choice) continue;
    answered += 1;
    if (choice === question.correct) correct += 1;
  }
  return { answered, correct };
}

export function readStoredAnswers(): { storageKey: string; answers: Record<string, string> }[] {
  if (typeof window === "undefined") return [];

  const rows: { storageKey: string; answers: Record<string, string> }[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const fullKey = window.localStorage.key(index);
    if (!fullKey?.startsWith(SESSION_PREFIX)) continue;

    const storageKey = fullKey.slice(SESSION_PREFIX.length);
    try {
      const parsed = JSON.parse(window.localStorage.getItem(fullKey) ?? "") as Partial<StoredSession>;
      const answers: Record<string, string> = {};
      if (parsed.answers) {
        for (const [id, value] of Object.entries(parsed.answers)) {
          if (typeof value === "string") answers[id] = value;
        }
      }
      rows.push({ storageKey, answers });
    } catch {
      // Ignore a malformed row rather than blocking the rest.
    }
  }

  rows.sort((left, right) => left.storageKey.localeCompare(right.storageKey));
  return rows;
}

export function clearSession(storageKey: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(fullStorageKey(storageKey));
  notifySessions();
}

export function clearAllSessions(): void {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const fullKey = window.localStorage.key(index);
    if (fullKey?.startsWith(SESSION_PREFIX)) keys.push(fullKey);
  }
  for (const fullKey of keys) window.localStorage.removeItem(fullKey);
  notifySessions();
}

export function practiceHrefFromStorageKey(storageKey: string): string | null {
  if (storageKey === "latest") return "/practice?bank=latest";
  if (storageKey.startsWith("latest:")) {
    return `/practice?bank=latest&topic=${storageKey.slice("latest:".length)}`;
  }
  if (storageKey === "older") return "/practice?bank=older";
  if (storageKey.startsWith("older:")) {
    return `/practice?bank=older&exam=${storageKey.slice("older:".length)}`;
  }
  return null;
}

export function labelForStorageKey(storageKey: string): string {
  if (storageKey === "latest") return "Latest · All topics";
  if (storageKey.startsWith("latest:")) {
    return `Latest · ${decodeURIComponent(storageKey.slice("latest:".length))}`;
  }
  if (storageKey === "older") return "Older dump · All six exams";
  if (storageKey.startsWith("older:")) return `Older dump · Exam ${storageKey.slice("older:".length)}`;
  return storageKey;
}

export function readSavedSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];

  const sessions: SavedSession[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const fullKey = window.localStorage.key(index);
    if (!fullKey?.startsWith(SESSION_PREFIX)) continue;

    const storageKey = fullKey.slice(SESSION_PREFIX.length);
    const href = practiceHrefFromStorageKey(storageKey);
    if (!href) continue;

    try {
      const parsed = JSON.parse(window.localStorage.getItem(fullKey) ?? "") as Partial<StoredSession>;
      const answered = parsed.answers ? Object.keys(parsed.answers).length : 0;
      if (answered < 1) continue;

      sessions.push({
        storageKey,
        href,
        label: labelForStorageKey(storageKey),
        answered,
        index: typeof parsed.index === "number" ? parsed.index : 0,
        updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
      });
    } catch {
      // Ignore a malformed row rather than blocking the rest of the desk.
    }
  }

  sessions.sort((left, right) => right.updatedAt - left.updatedAt);
  return sessions;
}
