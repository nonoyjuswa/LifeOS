import { openDatabase, Store } from "@lifeos/storage";

export const db = openDatabase();
export const store = new Store(db);