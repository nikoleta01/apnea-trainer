// Session storage — localStorage for now, swap to API + DB after auth

const STORAGE_KEY = "apnea-trainer-session-dates";

export interface SessionRecord {
  date: string; // ISO date string "YYYY-MM-DD"
  type: string;
  rounds: number;
  holdTime: number;
  breatheTime: number;
  completed: boolean;
}

function getStoredSessions(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveSessions(sessions: SessionRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function saveSession(session: SessionRecord) {
  const sessions = getStoredSessions();
  sessions.push(session);
  saveSessions(sessions);
}

export function getSessions(): SessionRecord[] {
  return getStoredSessions();
}

export function getSessionDates(): Set<string> {
  return new Set(getStoredSessions().map((s) => s.date));
}

export function getSessionCount(): number {
  return getStoredSessions().length;
}

/** Get unique training days for a given month (0-indexed) */
export function getMonthSessions(year: number, month: number): SessionRecord[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return getStoredSessions().filter((s) => s.date.startsWith(prefix));
}

/** Current streak: consecutive days ending today (or yesterday) */
export function getCurrentStreak(): number {
  const dates = getSessionDates();
  if (dates.size === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if today or yesterday has a session (streak is still alive)
  const todayStr = formatDate(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  let current: Date;
  if (dates.has(todayStr)) {
    current = today;
  } else if (dates.has(yesterdayStr)) {
    current = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  while (dates.has(formatDate(current))) {
    streak++;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

/** Longest streak ever */
export function getLongestStreak(): number {
  const dates = [...getSessionDates()].sort();
  if (dates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
    // diffDays === 0 means same day, skip
  }

  return longest;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
