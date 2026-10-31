import type { EntityTable } from "dexie";
import {
  createItem,
  type Item, type Recurrence, type Completion,
  type Project, type Goal, type JournalEntry,
} from "@lifeos/core";
import type { LifeOSDB } from "./db";

type Records = {
  items: Item;
  recurrences: Recurrence;
  completions: Completion;
  projects: Project;
  goals: Goal;
  journal: JournalEntry;
};
export type TableName = keyof Records;

export type Snapshot = { [K in TableName]: Records[K][] };

const TABLES: TableName[] = ["items", "recurrences", "completions", "projects", "goals", "journal"];

export class Store {
  constructor(
    readonly db: LifeOSDB,
    private clock: () => string = () => new Date().toISOString()
  ) {}

  private table(name: TableName) {
    return this.db[name] as EntityTable<{ id: string }, "id">;
  }

  /** Every write goes through here. Later, this is where sync events get recorded. */
  async put<T extends TableName>(table: T, record: Records[T]): Promise<void> {
    await this.table(table).put(record);
  }

  /** Saves several records all-or-nothing. */
  async putMany<T extends TableName>(table: T, records: Records[T][]): Promise<void> {
    await this.table(table).bulkPut(records);
  }

  async get<T extends TableName>(table: T, id: string): Promise<Records[T] | undefined> {
    return (await this.table(table).get(id)) as Records[T] | undefined;
  }

  /** Everything, in one read. Fine at personal scale, and it feeds the core's pure functions directly. */
  async snapshot(): Promise<Snapshot> {
    return this.db.transaction("r", TABLES.map((t) => this.db[t]), async () => {
      const [items, recurrences, completions, projects, goals, journal] = await Promise.all(
        TABLES.map((t) => this.db[t].toArray())
      );
      return { items, recurrences, completions, projects, goals, journal } as Snapshot;
    });
  }

  // ---- Capture ----

  /** The fastest path from thought to Inbox. Returns undefined if the text is blank. */
  async capture(text: string, source: Item["source"] = "quick"): Promise<Item | undefined> {
    if (!text.trim()) return undefined;
    const item = createItem(text, source, this.clock());
    await this.put("items", item);
    return item;
  }

  // ---- Settings ----

  async getSetting<T>(key: string, fallback: T): Promise<T> {
    const row = await this.db.settings.get(key);
    return row ? (row.value as T) : fallback;
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    await this.db.settings.put({ key, value });
  }

  /** Created once per device and kept forever. Sync will use it to name this device's event file. */
  async deviceId(): Promise<string> {
    const existing = await this.getSetting<string | undefined>("deviceId", undefined);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    await this.setSetting("deviceId", fresh);
    return fresh;
  }
}