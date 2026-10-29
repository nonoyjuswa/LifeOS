import { describe, it, expect } from "vitest";
import {
  logicalDate,
  toLocalWallClock,
  completeItem,
  uncompleteItem,
  completionId,
  completeRecurrence,
  uncompleteRecurrence,
} from "./completion";
import type { Item, Recurrence } from "./types";

const stamp = "2026-10-01T00:00:00Z";
const now = "2026-10-29T13:00:00Z";

const task: Item = {
  id: "t1",
  text: "Submit report",
  status: "active",
  source: "app",
  scheduledFor: "2026-10-29",
  createdAt: stamp,
  updatedAt: stamp,
};

const gym: Recurrence = {
  id: "gym",
  text: "Gym",
  startDate: "2026-09-01",
  paused: false,
  schedules: [{ effectiveFrom: "2026-09-01", daysOfWeek: [1, 3, 5] }],
  createdAt: stamp,
  updatedAt: stamp,
};

describe("logicalDate", () => {
  it("counts 1 a.m. as the previous day", () => {
    expect(logicalDate("2026-10-30T01:00")).toBe("2026-10-29");
  });

  it("switches to the new day exactly at the day-start time", () => {
    expect(logicalDate("2026-10-30T03:59")).toBe("2026-10-29");
    expect(logicalDate("2026-10-30T04:00")).toBe("2026-10-30");
  });

  it("works across month and year boundaries", () => {
    expect(logicalDate("2026-11-01T02:00")).toBe("2026-10-31");
    expect(logicalDate("2027-01-01T00:30")).toBe("2026-12-31");
  });

  it("respects a custom day start", () => {
    expect(logicalDate("2026-10-30T01:00", "00:00")).toBe("2026-10-30");
  });
});

describe("toLocalWallClock", () => {
  it("formats the device's local time", () => {
    expect(toLocalWallClock(new Date(2026, 9, 30, 1, 5))).toBe("2026-10-30T01:05");
  });
});

describe("completing items", () => {
  it("records when and on which day", () => {
    const done = completeItem(task, now, "2026-10-29");
    expect(done.status).toBe("done");
    expect(done.completedAt).toBe(now);
    expect(done.completedOn).toBe("2026-10-29");
  });

  it("supports a late check-off on an earlier day", () => {
    const done = completeItem(task, now, "2026-10-28");
    expect(done.completedOn).toBe("2026-10-28");
  });

  it("un-checking clears the record completely", () => {
    const undone = uncompleteItem(completeItem(task, now, "2026-10-29"), now);
    expect(undone.status).toBe("active");
    expect(undone.completedAt).toBeUndefined();
    expect(undone.completedOn).toBeUndefined();
  });

  it("does not modify the original", () => {
    completeItem(task, now, "2026-10-29");
    expect(task.status).toBe("active");
  });
});

describe("completing recurrences", () => {
  it("creates a deterministic id", () => {
    const c = completeRecurrence(gym, "2026-10-30", now);
    expect(c.id).toBe(completionId("gym", "2026-10-30"));
    expect(c.id).toBe("gym:2026-10-30");
  });

  it("two devices ticking the same day produce the same id", () => {
    const phone = completeRecurrence(gym, "2026-10-30", "2026-10-30T10:00:00Z");
    const laptop = completeRecurrence(gym, "2026-10-30", "2026-10-30T10:00:05Z");
    expect(phone.id).toBe(laptop.id);
  });

  it("un-ticking is a soft delete", () => {
    const c = completeRecurrence(gym, "2026-10-30", now);
    const undone = uncompleteRecurrence(c, now);
    expect(undone.deletedAt).toBe(now);
    expect(undone.id).toBe(c.id);
  });

  it("re-ticking after an un-tick revives the same record", () => {
    const c = completeRecurrence(gym, "2026-10-30", now);
    const undone = uncompleteRecurrence(c, now);
    const again = completeRecurrence(gym, "2026-10-30", "2026-10-30T12:00:00Z", undone);
    expect(again.id).toBe(c.id);
    expect(again.deletedAt).toBeUndefined();
  });
});