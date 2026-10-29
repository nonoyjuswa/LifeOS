import type { Completion, ISODate, ISOTime, Item, Recurrence, Timestamp } from "./types";

export const DEFAULT_DAY_STARTS_AT: ISOTime = "04:00";

function minutesOf(time: ISOTime): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/**
 * Which "day" a moment belongs to, given the local wall-clock time
 * ("2026-10-30T01:00") and when your day starts.
 * 1 a.m. with a 4 a.m. day start still counts as the previous day.
 */
export function logicalDate(
  localWallClock: string,
  dayStartsAt: ISOTime = DEFAULT_DAY_STARTS_AT
): ISODate {
  const asUtc = Date.parse(`${localWallClock.slice(0, 16)}:00Z`);
  return new Date(asUtc - minutesOf(dayStartsAt) * 60_000).toISOString().slice(0, 10);
}

/** Reads the device's local clock into the format logicalDate expects. */
export function toLocalWallClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---- One-off items ----

/** Mark an item done. `on` is normally logicalDate(...); pass an earlier date for a late check-off. */
export function completeItem(item: Item, now: Timestamp, on: ISODate): Item {
  return {
    ...item,
    status: "done",
    completedAt: now,
    completedOn: on,
    updatedAt: now,
  };
}

/** Un-check by mistake: clears the record so no false history remains. */
export function uncompleteItem(item: Item, now: Timestamp): Item {
  return {
    ...item,
    status: "active",
    completedAt: undefined,
    completedOn: undefined,
    updatedAt: now,
  };
}

// ---- Recurrences ----

/** Same recurrence + same date always gives the same id, so two devices merge. */
export function completionId(recurrenceId: string, date: ISODate): string {
  return `${recurrenceId}:${date}`;
}

/**
 * Tick a recurrence for a date. If a record already exists (even a
 * soft-deleted one from an earlier un-tick), it is revived, not duplicated.
 */
export function completeRecurrence(
  rec: Recurrence,
  date: ISODate,
  now: Timestamp,
  existing?: Completion
): Completion {
  if (existing) {
    return { ...existing, deletedAt: undefined, completedAt: now, updatedAt: now };
  }
  return {
    id: completionId(rec.id, date),
    recurrenceId: rec.id,
    date,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

/** Un-tick: a soft delete, so the un-tick can sync to the other device. */
export function uncompleteRecurrence(completion: Completion, now: Timestamp): Completion {
  return { ...completion, deletedAt: now, updatedAt: now };
}