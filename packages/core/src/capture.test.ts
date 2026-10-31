import { describe, it, expect } from "vitest";
import { createItem } from "./capture";

describe("createItem", () => {
  it("creates an untriaged inbox item from text alone", () => {
    const item = createItem("  call the dentist ", "quick", "2026-10-29T10:00:00Z", "id-1");
    expect(item).toEqual({
      id: "id-1",
      text: "call the dentist",
      status: "inbox",
      source: "quick",
      createdAt: "2026-10-29T10:00:00Z",
      updatedAt: "2026-10-29T10:00:00Z",
    });
  });

  it("rejects blank text", () => {
    expect(() => createItem("   ", "quick", "2026-10-29T10:00:00Z")).toThrow();
  });

  it("generates a unique id by default", () => {
    const a = createItem("a", "app", "2026-10-29T10:00:00Z");
    const b = createItem("b", "app", "2026-10-29T10:00:00Z");
    expect(a.id).not.toBe(b.id);
  });
});