export type IncomeExpenseItem = {
  id: string;
  amount: number;
  comment: string;
};

export type LinkItem = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  domain: string;
  iconCache?: string;
};

export type Project = {
  id: string;
  title: string;
  shortDescription: string;
  monthlyOperatingCosts: IncomeExpenseItem[];
  monthlyIncome: IncomeExpenseItem[];
  orderIndex: number;
};

export type Tag = {
  id: string;
  name: string;
};

export type AppState = {
  locale: "ru" | "en";
  projects: Project[];
  links: LinkItem[];
  tags: Tag[];
  selectedProjectId?: string;
  faviconCache: Record<string, string>;
};

const DB_NAME = "projecthub-db";
const STORE_NAME = "app";
const STATE_KEY = "state";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function loadState(): Promise<AppState | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(STATE_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as AppState) ?? null);
  });
}

export async function saveState(state: AppState): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(state, STATE_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
