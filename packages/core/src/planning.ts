import type { ISODate, ISOTime, Item, Recurrence, Timestamp } from "./types";
import { recurrenceAppliesOn } from "./today";

export type PlanInput = {
  date: ISODate; // the day being planned (tomorrow by default)
  items: Item[];
  recurrences: Recurrence[];
};

export type PlanView = {
  leftovers: Item[];            // scheduled before `date`, still active
  fixed: {
    recurrences: Recurrence[];  // repeating things that apply on `date`
    scheduled: Item[];          // already planned for `date`
    due: Item[];                // due on `date` but not scheduled yet
  };
  inbox: Item[];                // captured, untriaged
  backlog: Item[];              // active, no date
};

function byOrder(a: Item, b: Item): number {
  const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return a.createdAt.localeCompare(b.createdAt);
}

export function getPlan({ date, items, recurrences }: PlanInput): PlanView {
  const live = items.filter((i) => !i.deletedAt);

  const leftovers = live
    .filter((i) => i.status === "active" && !!i.scheduledFor && i.scheduledFor < date)
    .sort((a, b) => a.scheduledFor!.localeCompare(b.scheduledFor!) || byOrder(a, b));

  const scheduled = live
    .filter((i) => i.status === "active" && i.scheduledFor === date)
    .sort(byOrder);

  const due = live.filter(
    (i) => i.status === "active" && i.dueOn === date && !i.scheduledFor
  );

  const dueIds = new Set(due.map((i) => i.id));

  const inbox = live
    .filter((i) => i.status === "inbox")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const backlog = live
    .filter((i) => i.status === "active" && !i.scheduledFor && !dueIds.has(i.id))
    .sort(byOrder);

  return {
    leftovers,
    fixed: {
      recurrences: recurrences.filter((r) => recurrenceAppliesOn(r, date)),
      scheduled,
      due,
    },
    inbox,
    backlog,
  };
}

// ---- Actions: each returns an updated copy of the item ----

function touch(item: Item, now: Timestamp, patch: Partial<Item>): Item {
  return { ...item, ...patch, updatedAt: now };
}

/** Pick an item for a day. Also triages it out of the inbox. */
export function scheduleItem(
  item: Item,
  date: ISODate,
  now: Timestamp,
  time?: ISOTime
): Item {
  return touch(item, now, {
    status: "active",
    scheduledFor: date,
    scheduledTime: time,
    sortOrder: undefined,
  });
}

/** Leftover action: "move to tomorrow". Same as scheduling it again. */
export const moveToDate = scheduleItem;

/** Leftover action: "back to backlog". Keeps the item, removes the date. */
export function sendToBacklog(item: Item, now: Timestamp): Item {
  return touch(item, now, {
    status: "active",
    scheduledFor: undefined,
    scheduledTime: undefined,
    sortOrder: undefined,
  });
}

/** Leftover action: "drop". Archives instead of deleting. */
export function dropItem(item: Item, now: Timestamp): Item {
  return touch(item, now, {
    status: "archived",
    scheduledFor: undefined,
    scheduledTime: undefined,
    sortOrder: undefined,
  });
}

/** The arrange step: given items in the order you want, assign sortOrder. */
export function arrangeDay(ordered: Item[], now: Timestamp): Item[] {
  return ordered.map((item, index) => touch(item, now, { sortOrder: index }));
}