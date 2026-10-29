import type { Completion, ISODate, Item, Recurrence, Timestamp } from "./types";
import { dayOfWeek, scheduleOn } from "./today";

// ---- Date helpers ----

export function addDays(date: ISODate, n: number): ISODate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Every date from `from` to `to`, inclusive, oldest first. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

// ---- Habit grid ----

export type CellState =
  | "done"     // ticked
  | "missed"   // was scheduled, in the past, not ticked
  | "pending"  // scheduled today or later, not ticked yet
  | "off";     // not scheduled, nothing ticked

export type HabitCell = {
  date: ISODate;
  state: CellState;
  extra: boolean; // ticked on a day it wasn't scheduled (a bonus session)
};

/** Was the recurrence scheduled on this date, according to the schedule version then in force? */
function wasScheduled(rec: Recurrence, date: ISODate): boolean {
  if (date < rec.startDate) return false;
  if (rec.endDate && date > rec.endDate) return false;
  const schedule = scheduleOn(rec, date);
  return !!schedule && schedule.daysOfWeek.includes(dayOfWeek(date));
}

export type GridInput = {
  recurrence: Recurrence;
  completions: Completion[];
  from: ISODate;
  to: ISODate;
  today: ISODate; // use the logical date (respects "day starts at")
};

export function getHabitGrid({ recurrence, completions, from, to, today }: GridInput): HabitCell[] {
  const doneDates = new Set(
    completions
      .filter((c) => c.recurrenceId === recurrence.id && !c.deletedAt)
      .map((c) => c.date)
  );

  return dateRange(from, to).map((date) => {
    // Pausing only affects today and later; past days keep their history.
    const scheduled = wasScheduled(recurrence, date) && !(recurrence.paused && date >= today);
    const done = doneDates.has(date);

    if (done) return { date, state: "done", extra: !scheduled };
    if (scheduled) return { date, state: date < today ? "missed" : "pending", extra: false };
    return { date, state: "off", extra: false };
  });
}

/**
 * Streaks count scheduled days only, so a Mon/Wed/Fri habit isn't broken by Tuesday.
 * Today still being pending doesn't break a streak. Bonus sessions don't count or break.
 */
export function getStreaks(cells: HabitCell[]): { current: number; longest: number } {
  let longest = 0;
  let run = 0;
  for (const c of cells) {
    if (c.state === "done" && !c.extra) {
      run += 1;
      longest = Math.max(longest, run);
    } else if (c.state === "missed") {
      run = 0;
    }
  }

  let current = 0;
  for (let i = cells.length - 1; i >= 0; i--) {
    const c = cells[i]!;
    if (c.state === "missed") break;
    if (c.state === "done" && !c.extra) current += 1;
  }
  return { current, longest };
}

/** Share of scheduled days (already passed) that were done, 0 to 1. Undefined if none were due yet. */
export function completionRate(cells: HabitCell[]): number | undefined {
  const done = cells.filter((c) => c.state === "done" && !c.extra).length;
  const missed = cells.filter((c) => c.state === "missed").length;
  return done + missed === 0 ? undefined : done / (done + missed);
}

/** Groups cells into Sunday-to-Saturday columns, like a GitHub graph. The first week is padded with nulls. */
export function toWeeks(cells: HabitCell[]): (HabitCell | null)[][] {
  const first = cells[0];
  if (!first) return [];

  const weeks: (HabitCell | null)[][] = [];
  let week: (HabitCell | null)[] = [];
  for (let i = 0; i < dayOfWeek(first.date); i++) week.push(null);

  for (const cell of cells) {
    week.push(cell);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);
  return weeks;
}

// ---- Daily log: "what did I do each day?" ----

export type LogEntry = {
  kind: "item" | "recurrence";
  id: string;
  text: string;
  completedAt: Timestamp;
  category?: Recurrence["category"];
  projectId?: string;
};

export type LogDay = { date: ISODate; entries: LogEntry[] };

export type LogInput = {
  items: Item[];
  recurrences: Recurrence[];
  completions: Completion[];
  from: ISODate;
  to: ISODate;
};

/** Days with at least one completion, newest first. Entries within a day are in the order you did them. */
export function getDailyLog({ items, recurrences, completions, from, to }: LogInput): LogDay[] {
  const byDate = new Map<ISODate, LogEntry[]>();
  const add = (date: ISODate, entry: LogEntry) => {
    const list = byDate.get(date) ?? [];
    list.push(entry);
    byDate.set(date, list);
  };

  for (const item of items) {
    if (item.deletedAt || item.status !== "done" || !item.completedOn || !item.completedAt) continue;
    if (item.completedOn < from || item.completedOn > to) continue;
    add(item.completedOn, {
      kind: "item",
      id: item.id,
      text: item.text,
      completedAt: item.completedAt,
      projectId: item.projectId,
    });
  }

  const recById = new Map(recurrences.map((r) => [r.id, r]));
  for (const c of completions) {
    if (c.deletedAt || c.date < from || c.date > to) continue;
    const rec = recById.get(c.recurrenceId);
    if (!rec) continue;
    add(c.date, {
      kind: "recurrence",
      id: rec.id,
      text: rec.text,
      completedAt: c.completedAt,
      category: rec.category,
      projectId: rec.projectId,
    });
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entries]) => ({
      date,
      entries: entries.sort((a, b) => a.completedAt.localeCompare(b.completedAt)),
    }));
}