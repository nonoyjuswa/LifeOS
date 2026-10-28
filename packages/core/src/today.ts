import type { ISODate, Item, Recurrence, Completion, Schedule } from "./types";

export type TodayInput = {
  date: ISODate;
  items: Item[];
  recurrences: Recurrence[];
  completions: Completion[];
};

export type TodayEntry = {
  kind: "item" | "recurrence";
  id: string;
  text: string;
  time?: string;
  order: number;
  createdAt: string;
  item?: Item;
  recurrence?: Recurrence;
};

export type TodayView = {
  todo: TodayEntry[];
  done: TodayEntry[];
  dueUnplanned: Item[]; // due today, not scheduled
  leftovers: Item[];    // scheduled earlier, still active
  needsPlanning: boolean;
};

// Day of week from a "YYYY-MM-DD" string, independent of timezone.
export function dayOfWeek(date: ISODate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

// The schedule version in force on a given date (latest effectiveFrom <= date).
export function scheduleOn(rec: Recurrence, date: ISODate): Schedule | undefined {
  return rec.schedules
    .filter((s) => s.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

export function recurrenceAppliesOn(rec: Recurrence, date: ISODate): boolean {
  if (rec.deletedAt || rec.paused) return false;
  if (date < rec.startDate) return false;
  if (rec.endDate && date > rec.endDate) return false;
  const schedule = scheduleOn(rec, date);
  return !!schedule && schedule.daysOfWeek.includes(dayOfWeek(date));
}

function byTimeThenOrder(a: TodayEntry, b: TodayEntry): number {
  if (a.time && b.time) return a.time.localeCompare(b.time);
  if (a.time) return -1;
  if (b.time) return 1;
  if (a.order !== b.order) return a.order - b.order;
  return a.createdAt.localeCompare(b.createdAt);
}

const UNORDERED = Number.MAX_SAFE_INTEGER;

function itemEntry(item: Item): TodayEntry {
  return {
    kind: "item",
    id: item.id,
    text: item.text,
    time: item.scheduledTime,
    order: item.sortOrder ?? UNORDERED,
    createdAt: item.createdAt,
    item,
  };
}

function recurrenceEntry(rec: Recurrence, date: ISODate): TodayEntry {
  return {
    kind: "recurrence",
    id: rec.id,
    text: rec.text,
    time: scheduleOn(rec, date)?.time,
    order: UNORDERED,
    createdAt: rec.createdAt,
    recurrence: rec,
  };
}

export function getToday({ date, items, recurrences, completions }: TodayInput): TodayView {
  const live = items.filter((i) => !i.deletedAt);

  const doneRecurrenceIds = new Set(
    completions
      .filter((c) => !c.deletedAt && c.date === date)
      .map((c) => c.recurrenceId)
  );

  const plannedItems = live.filter((i) => i.status === "active" && i.scheduledFor === date);
  const doneItems = live.filter((i) => i.status === "done" && i.completedOn === date);

  const todaysRecurrences = recurrences.filter((r) => recurrenceAppliesOn(r, date));

  const todo = [
    ...plannedItems.map(itemEntry),
    ...todaysRecurrences
      .filter((r) => !doneRecurrenceIds.has(r.id))
      .map((r) => recurrenceEntry(r, date)),
  ].sort(byTimeThenOrder);

  const done = [
    ...doneItems.map(itemEntry),
    ...todaysRecurrences
      .filter((r) => doneRecurrenceIds.has(r.id))
      .map((r) => recurrenceEntry(r, date)),
  ].sort(byTimeThenOrder);

  const dueUnplanned = live.filter(
    (i) => i.status === "active" && i.dueOn === date && !i.scheduledFor
  );

  const leftovers = live.filter(
    (i) => i.status === "active" && !!i.scheduledFor && i.scheduledFor < date
  );

  // Recurrences alone don't count as a plan; you must have chosen something.
  const needsPlanning = plannedItems.length === 0 && doneItems.length === 0;

  return { todo, done, dueUnplanned, leftovers, needsPlanning };
}