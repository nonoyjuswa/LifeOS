import {
  completeItem, uncompleteItem, completeRecurrence, uncompleteRecurrence, completionId,
  scheduleItem, sendToBacklog, dropItem, setItemTime, moveWithin, arrangeDay,
  createRecurrence, deleteRecurrence,
  type Item, type Recurrence, type ISODate, type NewRecurrence,
} from "@lifeos/core";
import { store } from "./store";

export const now = () => new Date().toISOString();

// ---- Items ----
export const checkItem = (item: Item, on: ISODate) =>
  store.put("items", completeItem(item, now(), on));
export const uncheckItem = (item: Item) =>
  store.put("items", uncompleteItem(item, now()));
export const planItem = (item: Item, date: ISODate) =>
  store.put("items", scheduleItem(item, date, now()));
export const toBacklog = (item: Item) =>
  store.put("items", sendToBacklog(item, now()));
export const drop = (item: Item) =>
  store.put("items", dropItem(item, now()));
export const changeTime = (item: Item, time: string) =>
  store.put("items", setItemTime(item, time || undefined, now()));
export const reorder = (list: Item[], index: number, delta: -1 | 1) =>
  store.putMany("items", arrangeDay(moveWithin(list, index, delta), now()));

// ---- Repeating things ----
export async function tickRecurrence(rec: Recurrence, date: ISODate) {
  const existing = await store.get("completions", completionId(rec.id, date));
  await store.put("completions", completeRecurrence(rec, date, now(), existing));
}
export async function untickRecurrence(rec: Recurrence, date: ISODate) {
  const existing = await store.get("completions", completionId(rec.id, date));
  if (existing) await store.put("completions", uncompleteRecurrence(existing, now()));
}
export const addRecurrence = (input: NewRecurrence, today: ISODate) =>
  store.put("recurrences", createRecurrence(input, today, now()));
export const removeRecurrence = (rec: Recurrence) =>
  store.put("recurrences", deleteRecurrence(rec, now()));