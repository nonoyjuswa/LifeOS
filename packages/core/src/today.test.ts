import { describe, it, expect } from "vitest";
import { getToday, recurrenceAppliesOn } from "./today";
import type { Item, Recurrence, Completion } from "./types";

const stamp = "2026-10-01T00:00:00Z";

function item(over: Partial<Item> = {}): Item {
  return {
    id: crypto.randomUUID(),
    text: "task",
    status: "active",
    source: "app",
    createdAt: stamp,
    updatedAt: stamp,
    ...over,
  };
}

function gym(over: Partial<Recurrence> = {}): Recurrence {
  return {
    id: "gym",
    text: "Gym",
    startDate: "2026-09-01",
    paused: false,
    schedules: [{ effectiveFrom: "2026-09-01", daysOfWeek: [1, 3, 5] }], // Mon/Wed/Fri
    createdAt: stamp,
    updatedAt: stamp,
    ...over,
  };
}

const empty = { items: [], recurrences: [], completions: [] };

describe("getToday", () => {
  it("shows items scheduled for the date, timed first", () => {
    const view = getToday({
      ...empty,
      date: "2026-10-29",
      items: [
        item({ text: "untimed", scheduledFor: "2026-10-29" }),
        item({ text: "class", scheduledFor: "2026-10-29", scheduledTime: "08:00" }),
        item({ text: "tomorrow", scheduledFor: "2026-10-30" }),
      ],
    });
    expect(view.todo.map((e) => e.text)).toEqual(["class", "untimed"]);
  });

  it("never shows inbox items", () => {
    const view = getToday({
      ...empty,
      date: "2026-10-29",
      items: [item({ status: "inbox", scheduledFor: "2026-10-29" })],
    });
    expect(view.todo).toHaveLength(0);
  });

  it("puts earlier unfinished items in leftovers, not todo", () => {
    const view = getToday({
      ...empty,
      date: "2026-10-29",
      items: [item({ scheduledFor: "2026-10-28" })],
    });
    expect(view.todo).toHaveLength(0);
    expect(view.leftovers).toHaveLength(1);
  });

  it("moves completed items to done on their completedOn date", () => {
    const view = getToday({
      ...empty,
      date: "2026-10-29",
      items: [item({ status: "done", completedOn: "2026-10-29" })],
    });
    expect(view.done).toHaveLength(1);
    expect(view.needsPlanning).toBe(false);
  });

  it("flags needsPlanning when nothing was chosen, even with recurrences", () => {
    // 2026-10-30 is a Friday
    const view = getToday({ ...empty, date: "2026-10-30", recurrences: [gym()] });
    expect(view.todo.map((e) => e.text)).toEqual(["Gym"]);
    expect(view.needsPlanning).toBe(true);
  });

  it("moves a recurrence to done when it has a completion", () => {
    const completion: Completion = {
      id: "gym:2026-10-30",
      recurrenceId: "gym",
      date: "2026-10-30",
      completedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp,
    };
    const view = getToday({
      ...empty,
      date: "2026-10-30",
      recurrences: [gym()],
      completions: [completion],
    });
    expect(view.todo).toHaveLength(0);
    expect(view.done.map((e) => e.text)).toEqual(["Gym"]);
  });

  it("surfaces due-today items that were never scheduled", () => {
    const view = getToday({
      ...empty,
      date: "2026-10-29",
      items: [item({ dueOn: "2026-10-29" })],
    });
    expect(view.dueUnplanned).toHaveLength(1);
  });
});

describe("recurrenceAppliesOn", () => {
  it("skips non-scheduled weekdays", () => {
    expect(recurrenceAppliesOn(gym(), "2026-10-27")).toBe(false); // Tuesday
  });

  it("respects paused and end date", () => {
    expect(recurrenceAppliesOn(gym({ paused: true }), "2026-10-30")).toBe(false);
    expect(recurrenceAppliesOn(gym({ endDate: "2026-10-01" }), "2026-10-30")).toBe(false);
  });

  it("uses the schedule version in force on that date", () => {
    const changed = gym({
      schedules: [
        { effectiveFrom: "2026-09-01", daysOfWeek: [1, 3, 5] },
        { effectiveFrom: "2026-10-15", daysOfWeek: [2, 4] }, // changed to Tue/Thu
      ],
    });
    expect(recurrenceAppliesOn(changed, "2026-10-12")).toBe(true);  // old Monday
    expect(recurrenceAppliesOn(changed, "2026-10-19")).toBe(false); // new Monday
    expect(recurrenceAppliesOn(changed, "2026-10-20")).toBe(true);  // new Tuesday
  });
});