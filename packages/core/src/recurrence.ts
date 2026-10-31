import type { ISODate, ISOTime, Recurrence, Timestamp } from "./types";

export type NewRecurrence = {
  text: string;
  daysOfWeek: number[]; // 0=Sun ... 6=Sat
  time?: ISOTime;
  category?: Recurrence["category"];
};

export function createRecurrence(
  input: NewRecurrence,
  today: ISODate,
  now: Timestamp,
  id: string = crypto.randomUUID()
): Recurrence {
  const text = input.text.trim();
  if (!text) throw new Error("Give it a name");
  const days = [...new Set(input.daysOfWeek)].sort((a, b) => a - b);
  if (days.length === 0) throw new Error("Pick at least one day");
  return {
    id,
    text,
    category: input.category,
    schedules: [{ effectiveFrom: today, daysOfWeek: days, time: input.time }],
    startDate: today,
    paused: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Soft delete: past history in the grid is kept. */
export function deleteRecurrence(rec: Recurrence, now: Timestamp): Recurrence {
  return { ...rec, deletedAt: now, updatedAt: now };
}