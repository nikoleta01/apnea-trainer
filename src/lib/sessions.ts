// Client-side session helpers — talks to /api/sessions (authenticated)

export interface SessionRecord {
  date: string; // "YYYY-MM-DD"
  type: string;
  rounds: number;
  holdTime: number;
  breatheTime: number;
  completed: boolean;
}

interface DbSession {
  id: string;
  date: string;
  type: string;
  rounds: number;
  holdTime: number;
  breatheTime: number;
  completed: boolean;
}

export async function saveSession(session: Omit<SessionRecord, "date">) {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error("Failed to save session");
  return res.json();
}

export async function fetchSessions(): Promise<DbSession[]> {
  const res = await fetch("/api/sessions");
  if (!res.ok) return [];
  return res.json();
}

/** Extract YYYY-MM-DD from a DbSession's ISO date string */
export function sessionDay(s: DbSession): string {
  return s.date.slice(0, 10);
}

export function getSessionDates(sessions: DbSession[]): Set<string> {
  return new Set(sessions.map(sessionDay));
}

export function getSessionCount(sessions: DbSession[]): number {
  return sessions.length;
}

/** Sessions filtered to a specific month (0-indexed) */
export function getMonthSessions(
  sessions: DbSession[],
  year: number,
  month: number
): DbSession[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return sessions.filter((s) => sessionDay(s).startsWith(prefix));
}

/** Current streak: consecutive days ending today or yesterday */
export function getCurrentStreak(sessions: DbSession[]): number {
  const dates = getSessionDates(sessions);
  if (dates.size === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStr = formatDate(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  let current: Date;
  if (dates.has(todayStr)) current = today;
  else if (dates.has(yesterdayStr)) current = yesterday;
  else return 0;

  let streak = 0;
  while (dates.has(formatDate(current))) {
    streak++;
    current.setDate(current.getDate() - 1);
  }
  return streak;
}

export function getLongestStreak(sessions: DbSession[]): number {
  const dates = [...getSessionDates(sessions)].sort();
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
  }
  return longest;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
