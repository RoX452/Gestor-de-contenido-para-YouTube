import { openDB, IDBPDatabase } from 'idb';
import { HistoryItem } from '../types';

export type { HistoryItem };

const DB_NAME = 'GeminiStudioDB_v2';
const STORE_NAME = 'history';

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('workspaceId', 'workspaceId');
      }
    },
  });
}

export async function saveHistory(item: HistoryItem) {
  const db = await initDB();
  await db.put(STORE_NAME, item);
}

export async function getByWorkspace(workspaceId: string): Promise<HistoryItem[]> {
  const db = await initDB();
  return db.getAllFromIndex(STORE_NAME, 'workspaceId', workspaceId);
}

export async function getAllHistory(): Promise<HistoryItem[]> {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function deleteHistory(id: string) {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
}
