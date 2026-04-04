import { extractDomain, isSafeExternalUrl } from "./utils";

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
  preferences?: {
    showBudgets: boolean;
    isTrusted: boolean;
  };
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
  lastExportSignature?: string;
};

export type SingleProjectExport = {
  version: 1;
  exportedAt: string;
  project: Project;
  links: LinkItem[];
  tags: Tag[];
};

export type ExportSingleProjectResult = {
  filename: string;
  payload: SingleProjectExport;
};

export type ImportSingleProjectInvalidReason =
  | "schema"
  | "unsafe_link_url"
  | "unsafe_icon_url"
  | "string_too_long"
  | "too_many_links"
  | "too_many_tags"
  | "too_many_finance_records";

export type ImportSingleProjectResult =
  | {
      status: "success";
      state: AppState;
      projectName: string;
      importedLinks: number;
      importedFinanceRecords: number;
    }
  | {
      status: "conflict";
      projectName: string;
      jsonData: SingleProjectExport;
      suggestedName: string;
    }
  | {
      status: "invalid";
      reason: ImportSingleProjectInvalidReason;
    };

export type ImportSingleProjectOptions = {
  baseState?: AppState;
  conflictResolution?: "rename" | "skip";
  newProjectName?: string;
};

const DB_NAME = "projecthub-db";
const STORE_NAME = "app";
const STATE_KEY = "state";
const LAST_EXPORT_TIMESTAMP_KEY = "lastExportTimestamp";
const MAX_PROJECT_TITLE_LENGTH = 200;
const MAX_PROJECT_DESCRIPTION_LENGTH = 4000;
const MAX_LINK_TITLE_LENGTH = 200;
const MAX_LINK_DESCRIPTION_LENGTH = 4000;
const MAX_TAG_NAME_LENGTH = 80;
const MAX_URL_LENGTH = 2048;
const MAX_COMMENT_LENGTH = 500;
const MAX_IMPORTED_LINKS = 500;
const MAX_IMPORTED_TAGS = 200;
const MAX_IMPORTED_FINANCE_RECORDS = 1000;

function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function faviconProxy(url: string) {
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIncomeExpenseItem(value: unknown): value is IncomeExpenseItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.amount === "number" &&
    typeof value.comment === "string"
  );
}

function isProject(value: unknown): value is Project {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.shortDescription === "string" &&
    Array.isArray(value.monthlyOperatingCosts) &&
    value.monthlyOperatingCosts.every(isIncomeExpenseItem) &&
    Array.isArray(value.monthlyIncome) &&
    value.monthlyIncome.every(isIncomeExpenseItem) &&
    typeof value.orderIndex === "number"
  );
}

function isTag(value: unknown): value is Tag {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  );
}

function isLinkItem(value: unknown): value is LinkItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.projectId === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.url === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every(tag => typeof tag === "string") &&
    typeof value.domain === "string" &&
    (typeof value.iconCache === "string" || typeof value.iconCache === "undefined")
  );
}

function isSingleProjectExport(value: unknown): value is SingleProjectExport {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.exportedAt === "string" &&
    isProject(value.project) &&
    Array.isArray(value.links) &&
    value.links.every(isLinkItem) &&
    Array.isArray(value.tags) &&
    value.tags.every(isTag)
  );
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
}

function createUniqueProjectName(baseName: string, existingNames: Set<string>) {
  const trimmed = baseName.trim() || "Imported project";
  if (!existingNames.has(trimmed.toLowerCase())) {
    return trimmed;
  }
  let suffix = 2;
  while (existingNames.has(`${trimmed} (${suffix})`.toLowerCase())) {
    suffix += 1;
  }
  return `${trimmed} (${suffix})`;
}

function countFinanceRecords(project: Project) {
  return project.monthlyOperatingCosts.length + project.monthlyIncome.length;
}

function isWithinLength(value: string, maxLength: number) {
  return value.length <= maxLength;
}

function validateImportedProjectSecurity(
  data: SingleProjectExport,
): ImportSingleProjectInvalidReason | null {
  if (data.links.length > MAX_IMPORTED_LINKS) return "too_many_links";
  if (data.tags.length > MAX_IMPORTED_TAGS) return "too_many_tags";
  if (countFinanceRecords(data.project) > MAX_IMPORTED_FINANCE_RECORDS) {
    return "too_many_finance_records";
  }

  if (
    !isWithinLength(data.project.title, MAX_PROJECT_TITLE_LENGTH) ||
    !isWithinLength(data.project.shortDescription, MAX_PROJECT_DESCRIPTION_LENGTH)
  ) {
    return "string_too_long";
  }

  for (const item of data.project.monthlyOperatingCosts) {
    if (!isWithinLength(item.comment, MAX_COMMENT_LENGTH)) {
      return "string_too_long";
    }
  }

  for (const item of data.project.monthlyIncome) {
    if (!isWithinLength(item.comment, MAX_COMMENT_LENGTH)) {
      return "string_too_long";
    }
  }

  for (const tag of data.tags) {
    if (!isWithinLength(tag.name, MAX_TAG_NAME_LENGTH)) {
      return "string_too_long";
    }
  }

  for (const link of data.links) {
    if (
      !isWithinLength(link.title, MAX_LINK_TITLE_LENGTH) ||
      !isWithinLength(link.description, MAX_LINK_DESCRIPTION_LENGTH) ||
      !isWithinLength(link.url, MAX_URL_LENGTH) ||
      (link.iconCache !== undefined && !isWithinLength(link.iconCache, MAX_URL_LENGTH))
    ) {
      return "string_too_long";
    }
    if (!isSafeExternalUrl(link.url)) {
      return "unsafe_link_url";
    }
    if (link.iconCache !== undefined && link.iconCache.trim().length > 0) {
      return "unsafe_icon_url";
    }
  }

  return null;
}

function normalizeImportedProjectData(
  data: SingleProjectExport,
  nextProjectName?: string,
) {
  const projectId = generateId("project");
  const normalizedProject: Project = {
    ...data.project,
    id: projectId,
    title: nextProjectName?.trim() || data.project.title.trim() || "Imported project",
    preferences: {
      showBudgets: data.project.preferences?.showBudgets ?? true,
      isTrusted: false,
    },
    monthlyOperatingCosts: data.project.monthlyOperatingCosts.map(item => ({
      id: generateId("cost"),
      amount: Number.isFinite(item.amount) ? item.amount : 0,
      comment: item.comment,
    })),
    monthlyIncome: data.project.monthlyIncome.map(item => ({
      id: generateId("income"),
      amount: Number.isFinite(item.amount) ? item.amount : 0,
      comment: item.comment,
    })),
  };

  const importedTagsById = new Map(data.tags.map(tag => [tag.id, tag]));

  return {
    project: normalizedProject,
    links: data.links.map(link => ({
      ...link,
      id: generateId("link"),
      projectId,
      domain: link.domain || extractDomain(link.url),
      iconCache: link.iconCache || faviconProxy(link.url),
      tags: link.tags.filter(tagId => importedTagsById.has(tagId)),
    })),
    tags: data.tags,
  };
}

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

export async function loadLastExportTimestamp(): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(LAST_EXPORT_TIMESTAMP_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as string) ?? null);
  });
}

export async function saveLastExportTimestamp(timestamp: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(timestamp, LAST_EXPORT_TIMESTAMP_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearLastExportTimestamp(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(LAST_EXPORT_TIMESTAMP_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function exportSingleProject(
  projectId: string,
): Promise<ExportSingleProjectResult | null> {
  const state = await loadState();
  if (!state) return null;

  const project = state.projects.find(item => item.id === projectId);
  if (!project) return null;

  const links = state.links.filter(link => link.projectId === projectId);
  const tagIds = new Set(links.flatMap(link => link.tags));
  const tags = state.tags.filter(tag => tagIds.has(tag.id));
  const date = new Date().toISOString().slice(0, 10);

  return {
    filename: `project-${slugify(project.title)}-${date}.json`,
    payload: {
      version: 1,
      exportedAt: new Date().toISOString(),
      project,
      links: links.map(link => ({
        ...link,
        iconCache: "",
      })),
      tags,
    },
  };
}

export async function importSingleProject(
  jsonData: unknown,
  options?: ImportSingleProjectOptions,
): Promise<ImportSingleProjectResult> {
  if (!isSingleProjectExport(jsonData)) {
    return { status: "invalid", reason: "schema" };
  }

  const state = (await loadState()) ?? options?.baseState;
  if (!state) return { status: "invalid", reason: "schema" };

  const securityError = validateImportedProjectSecurity(jsonData);
  if (securityError) {
    return { status: "invalid", reason: securityError };
  }

  const existingNames = new Set(
    state.projects.map(project => project.title.trim().toLowerCase()),
  );
  const importedName = jsonData.project.title.trim() || "Imported project";
  const hasConflict = existingNames.has(importedName.toLowerCase());

  if (hasConflict && !options?.conflictResolution) {
    return {
      status: "conflict",
      projectName: importedName,
      jsonData,
      suggestedName: createUniqueProjectName(importedName, existingNames),
    };
  }

  if (hasConflict && options?.conflictResolution === "skip") {
    return {
      status: "conflict",
      projectName: importedName,
      jsonData,
      suggestedName: createUniqueProjectName(importedName, existingNames),
    };
  }

  const finalProjectName =
    options?.conflictResolution === "rename"
      ? createUniqueProjectName(options.newProjectName || importedName, existingNames)
      : importedName;

  const normalized = normalizeImportedProjectData(jsonData, finalProjectName);
  const tagNameToId = new Map(
    state.tags.map(tag => [tag.name.trim().toLowerCase(), tag.id]),
  );
  const newTags: Tag[] = [...state.tags];
  const importedTagIdMap = new Map<string, string>();

  for (const tag of normalized.tags) {
    const key = tag.name.trim().toLowerCase();
    const existingTagId = tagNameToId.get(key);
    if (existingTagId) {
      importedTagIdMap.set(tag.id, existingTagId);
      continue;
    }
    const nextTagId = generateId("tag");
    newTags.push({ id: nextTagId, name: tag.name.trim() || "tag" });
    tagNameToId.set(key, nextTagId);
    importedTagIdMap.set(tag.id, nextTagId);
  }

  const nextProjectOrderIndex =
    state.projects.length === 0
      ? 0
      : Math.max(...state.projects.map(project => project.orderIndex)) + 1;

  const project: Project = {
    ...normalized.project,
    orderIndex: nextProjectOrderIndex,
  };

  const links = normalized.links.map(link => ({
    ...link,
    tags: link.tags
      .map(tagId => importedTagIdMap.get(tagId))
      .filter((tagId): tagId is string => Boolean(tagId)),
  }));

  const nextState: AppState = {
    ...state,
    projects: [...state.projects, project],
    links: [...state.links, ...links],
    tags: newTags,
    selectedProjectId: project.id,
  };

  await saveState(nextState);

  return {
    status: "success",
    state: nextState,
    projectName: project.title,
    importedLinks: links.length,
    importedFinanceRecords: countFinanceRecords(project),
  };
}
