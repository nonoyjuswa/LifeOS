import { describe, it, expect } from "vitest";
import {
  getPlan,
  scheduleItem,
  sendToBacklog,
  dropItem,
  arrangeDay,
} from "./planning";
import type { Item, Recurrence } from "./types";

const stamp = "2026-10-01T00:00:00Z";
const now = "2026-10-29T21:00:00Z";
const tomorrow = "2026-10-30"; // a Friday

let n = 0;
function item(over: Partial<Item> = {}): Item {
  n += 1;
  return {
    id: `item-${n}`,
    text: `task ${n}`,
    status: "active",
    source: "app",
    createdAt: stamp,
    updatedAt: stamp,
    ...over,
  };
}

const gym: Recurrence = {
  id: "gym",
  text: "Gym",
  startDate: "2026-09-01",
  paused: false,
  schedules: [{ effectiveFrom: "2026-09-01", daysOfWeek: [1, 3, 5] }],
  createdAt: stamp,
  updatedAt: stamp,
};

describe("getPlan", () => {
  it("lists unfinished earlier items as leftovers", () => {
    const plan = getPlan({
      date: tomorrow,
      recurrences: [],
      items: [
        item({ text: "old", scheduledFor: "2026-10-28" }),
        item({ text: "future", scheduledFor: "2026-11-02" }),
        item({ text: "finished", status: "done", scheduledFor: "2026-10-28" }),
      ],
    });
    expect(plan.leftovers.map((i) => i.text)).toEqual(["old"]);
  });

  it("shows what is already fixed for the day", () => {
    const plan = getPlan({
      date: tomorrow,
      recurrences: [gym],
      items: [
        item({ text: "planned", scheduledFor: tomorrow }),
        item({ text: "due", dueOn: tomorrow }),
      ],
    });
    expect(plan.fixed.recurrences.map((r) => r.text)).toEqual(["Gym"]);
    expect(plan.fixed.scheduled.map((i) => i.text)).toEqual(["planned"]);
    expect(plan.fixed.due.map((i) => i.text)).toEqual(["due"]);
  });

  it("separates inbox from backlog and does not repeat due items", () => {
    const plan = getPlan({
      date: tomorrow,
      recurrences: [],
      items: [
        item({ text: "raw thought", status: "inbox" }),
        item({ text: "someday" }),
        item({ text: "due", dueOn: tomorrow }),
      ],
    });
    expect(plan.inbox.map((i) => i.text)).toEqual(["raw thought"]);
    expect(plan.backlog.map((i) => i.text)).toEqual(["someday"]);
  });

  it("ignores deleted items", () => {
    const plan = getPlan({
      date: tomorrow,
      recurrences: [],
      items: [item({ status: "inbox", deletedAt: stamp })],
    });
    expect(plan.inbox).toHaveLength(0);
  });
});

describe("planning actions", () => {
  it("scheduling an inbox item makes it active and dated", () => {
    const result = scheduleItem(item({ status: "inbox" }), tomorrow, now, "08:00");
    expect(result.status).toBe("active");
    expect(result.scheduledFor).toBe(tomorrow);
    expect(result.scheduledTime).toBe("08:00");
    expect(result.updatedAt).toBe(now);
  });

  it("moving a leftover clears its old time", () => {
    const old = item({ scheduledFor: "2026-10-28", scheduledTime: "15:00" });
    const result = scheduleItem(old, tomorrow, now);
    expect(result.scheduledFor).toBe(tomorrow);
    expect(result.scheduledTime).toBeUndefined();
  });

  it("sending to backlog keeps the item but removes the date", () => {
    const result = sendToBacklog(item({ scheduledFor: "2026-10-28" }), now);
    expect(result.status).toBe("active");
    expect(result.scheduledFor).toBeUndefined();
  });

  it("dropping archives instead of deleting", () => {
    const result = dropItem(item({ scheduledFor: "2026-10-28" }), now);
    expect(result.status).toBe("archived");
    expect(result.deletedAt).toBeUndefined();
  });

  it("arranging assigns sort order by position", () => {
    const [a, b, c] = arrangeDay([item(), item(), item()], now);
    expect([a!.sortOrder, b!.sortOrder, c!.sortOrder]).toEqual([0, 1, 2]);
  });

  it("does not modify the original item", () => {
    const original = item({ status: "inbox" });
    scheduleItem(original, tomorrow, now);
    expect(original.status).toBe("inbox");
  });
});