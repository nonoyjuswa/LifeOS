import type { Item, Timestamp } from "./types";

/** Builds a new inbox item. Text is the only thing you ever have to provide. */
export function createItem(
  text: string,
  source: Item["source"],
  now: Timestamp,
  id: string = crypto.randomUUID()
): Item {
  const clean = text.trim();
  if (!clean) throw new Error("Nothing to capture");
  return {
    id,
    text: clean,
    status: "inbox",
    source,
    createdAt: now,
    updatedAt: now,
  };
}