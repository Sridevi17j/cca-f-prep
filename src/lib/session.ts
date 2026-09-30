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
