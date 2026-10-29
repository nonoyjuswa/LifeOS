import { describe, it, expect } from "vitest";
import {
  addDays,
  dateRange,
  getHabitGrid,
  getStreaks,
  completionRate,
  toWeeks,
  getDailyLog,
} from "./history";
import type { Completion, Item, Recurrence } from "./types";

const stamp = "2026-10-01T00:00:00Z";

function gym(over: Partial<Recurrence> = {}): Recurrence {
  return {
    id: "gym",
    text: "Gym",
    category: "Health",
    startDate: "2026-09-01",
    paused: false,
    schedules: [{ effectiveFrom: "2026-09-01", daysOfWeek: [1, 3, 5] }], // Mon/Wed/Fri
    createdAt: stamp,
    updatedAt: stamp,
    ...over,
  };
}

function tick(date: string, completedAt = `${date}T10:00:00Z`): Completion {
  return {
    id: `gym:${date}`,
    recurrenceId: "gym",
    date,
    completedAt,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

// Week used below: Mon 2026-10-26 ... Sat 2026-10-31. Today is Friday the 30th.
const week = { from: "2026-10-26", to: "2026-10-31", today: "2026-10-30" };
const states = (cells: { state: string }[]) => cells.map((c) => c.state);

describe("date helpers", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("builds an inclusive range", () => {
    expect(dateRange("2026-10-29", "2026-11-01")).toEqual([
      "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01",
    ]);
  });
});

describe("getHabitGrid", () => {
  it("marks done, missed, pending and off correctly", () => {
    const cells = getHabitGrid({
      ...week,
      recurrence: gym(),
      completions: [tick("2026-10-26")],
    });
    // Mon done, Tue off, Wed missed, Thu off, Fri pending, Sat off
    expect(states(cells)).toEqual(["done", "off", "missed", "off", "pending", "off"]);
  });

  it("flags a tick on an unscheduled day as an extra", () => {
    const cells = getHabitGrid({
      ...week,
      recurrence: gym(),
      completions: [tick("2026-10-27")],
    });
    expect(cells[1]).toMatchObject({ state: "done", extra: true });
  });

  it("ignores un-ticked (soft deleted) completions", () => {
    const cells = getHabitGrid({
      ...week,
      recurrence: gym(),
      completions: [{ ...tick("2026-10-26"), deletedAt: stamp }],
    });
    expect(cells[0]!.state).toBe("missed");
  });

  it("does not rewrite the past when the schedule changes", () => {
    const changed = gym({
      schedules: [
        { effectiveFrom: "2026-09-01", daysOfWeek: [1, 3, 5] },
        { effectiveFrom: "2026-10-15", daysOfWeek: [2, 4] }, // now Tue/Thu
      ],
    });
    const cells = getHabitGrid({
      recurrence: changed,
      completions: [],
      from: "2026-10-12", // Monday, old schedule
      to: "2026-10-20",   // Tuesday, new schedule
      today: "2026-10-30",
    });
    const byDate = Object.fromEntries(cells.map((c) => [c.date, c.state]));
    expect(byDate["2026-10-12"]).toBe("missed"); // old Monday still counts
    expect(byDate["2026-10-19"]).toBe("off");    // new Monday is not scheduled
    expect(byDate["2026-10-20"]).toBe("missed"); // new Tuesday
  });

  it("keeps past history when paused, but stops expecting it from today", () => {
    const cells = getHabitGrid({
      ...week,
      recurrence: gym({ paused: true }),
      completions: [tick("2026-10-26")],
    });
    expect(cells[0]!.state).toBe("done");
    expect(cells[4]!.state).toBe("off"); // Friday, today
  });

  it("shows nothing before the start date", () => {
    const cells = getHabitGrid({
      ...week,
      recurrence: gym({ startDate: "2026-10-30" }),
      completions: [],
    });
    expect(states(cells)).toEqual(["off", "off", "off", "off", "pending", "off"]);
  });
});

describe("getStreaks", () => {
  it("counts scheduled days only, so Tuesday doesn't break the streak", () => {
    const cells = getHabitGrid({
      ...week,
      recurrence: gym(),
      completions: [tick("2026-10-26"), tick("2026-10-28")],
    });
    expect(getStreaks(cells)).toEqual({ current: 2, longest: 2 });
  });

  it("is not broken by today still being pending", () => {
    const cells = getHabitGrid({
      ...week,
      recurrence: gym(),
      completions: [tick("2026-10-28")],
    });
    // Mon missed, Wed done, Fri pending
    expect(getStreaks(cells)).toEqual({ current: 1, longest: 1 });
  });

  it("resets after a missed day", () => {
    const cells = getHabitGrid({
      ...week,
      recurrence: gym(),
      completions: [tick("2026-10-26")], // Wed missed
    });
    expect(getStreaks(cells)).toEqual({ current: 0, longest: 1 });
  });

  it("ignores bonus sessions", () => {
    const cells = getHabitGrid({
      ...week,
      recurrence: gym(),
      completions: [tick("2026-10-26"), tick("2026-10-27"), tick("2026-10-28")],
    });
    expect(getStreaks(cells)).toEqual({ current: 2, longest: 2 });
  });
});

describe("completionRate", () => {
  it("is done divided by done plus missed", () => {
    const cells = getHabitGrid({
      ...week,
      recurrence: gym(),
      completions: [tick("2026-10-26")],
    });
    expect(completionRate(cells)).toBe(0.5);
  });

  it("is undefined when nothing was due yet", () => {
    const cells = getHabitGrid({
      recurrence: gym(),
      completions: [],
      from: "2026-10-30",
      to: "2026-10-31",
      today: "2026-10-30",
    });
    expect(completionRate(cells)).toBeUndefined();
  });
});

describe("toWeeks", () => {
  it("pads the first week and splits on Sundays", () => {
    // Wed 2026-10-28 to Tue 2026-11-03
    const cells = getHabitGrid({
      recurrence: gym(),
      completions: [],
      from: "2026-10-28",
      to: "2026-11-03",
      today: "2026-10-30",
    });
    const weeks = toWeeks(cells);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]!.filter((c) => c === null)).toHaveLength(3); // Sun, Mon, Tue empty
    expect(weeks[0]).toHaveLength(7);
    expect(weeks[1]).toHaveLength(3); // Sun, Mon, Tue
  });
});

describe("getDailyLog", () => {
  const done = (over: Partial<Item>): Item => ({
    id: crypto.randomUUID(),
    text: "task",
    status: "done",
    source: "app",
    createdAt: stamp,
    updatedAt: stamp,
    ...over,
  });

  it("groups completions by day, newest first, in the order done", () => {
    const log = getDailyLog({
      from: "2026-10-01",
      to: "2026-10-31",
      recurrences: [gym()],
      completions: [tick("2026-10-30", "2026-10-30T09:00:00Z")],
      items: [
        done({ text: "Report", completedOn: "2026-10-29", completedAt: "2026-10-29T15:00:00Z" }),
        done({ text: "Laundry", completedOn: "2026-10-29", completedAt: "2026-10-29T08:00:00Z" }),
      ],
    });
    expect(log.map((d) => d.date)).toEqual(["2026-10-30", "2026-10-29"]);
    expect(log[0]!.entries.map((e) => e.text)).toEqual(["Gym"]);
    expect(log[1]!.entries.map((e) => e.text)).toEqual(["Laundry", "Report"]);
  });

  it("excludes days outside the range and undone things", () => {
    const log = getDailyLog({
      from: "2026-10-29",
      to: "2026-10-31",
      recurrences: [gym()],
      completions: [{ ...tick("2026-10-30"), deletedAt: stamp }],
      items: [
        done({ completedOn: "2026-09-01", completedAt: "2026-09-01T10:00:00Z" }),
        done({ status: "active", completedOn: "2026-10-30", completedAt: "2026-10-30T10:00:00Z" }),
      ],
    });
    expect(log).toEqual([]);
  });
});