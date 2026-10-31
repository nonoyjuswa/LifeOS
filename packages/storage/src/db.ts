import { Dexie, type EntityTable } from "dexie";
import type {
  Item, Recurrence, Completion, Project, Goal, JournalEntry,
} from "@lifeos/core";

export type Setting = { key: string; value: unknown };

export type LifeOSDB = Dexie & {
  items: EntityTable<Item, "id">;
  recurrences: EntityTable<Recurrence, "id">;
  completions: EntityTable<Completion, "id">;
  projects: EntityTable<Project, "id">;
  goals: EntityTable<Goal, "id">;
  journal: EntityTable<JournalEntry, "id">;
  settings: EntityTable<Setting, "key">;
};

export function openDatabase(name = "lifeos"): LifeOSDB {
  const db = new Dexie(name) as LifeOSDB;

  // Only fields you search by are listed. Everything else is stored automatically.
  db.version(1).stores({
    items: "id, status, scheduledFor, dueOn, completedOn, projectId",
    recurrences: "id, projectId, goalId",
    completions: "id, recurrenceId, date",
    projects: "id, goalId, status",
    goals: "id, status",
    journal: "id, date",
    settings: "key",
  });

  return db;
}