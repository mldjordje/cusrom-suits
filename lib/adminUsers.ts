import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";
import {
  getAdminPermissionsForRoles,
  isKnownAdminRole,
  type AdminRoleId,
} from "@/lib/adminRoles";
import type { AdminPermission, AdminViewer } from "@/lib/adminRoles";

export type AdminUserRecord = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  roleIds: AdminRoleId[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
};

export type AdminUserSafe = Omit<AdminUserRecord, "passwordHash"> & {
  permissions: AdminPermission[];
};

type AdminUsersFile = {
  version: number;
  users: AdminUserRecord[];
};

const ADMIN_USERS_PATH = "data/admin-users.json";
const ADMIN_USERS_FILE_VERSION = 1;
const PASSWORD_HASH_PREFIX = "scrypt";
const DEFAULT_ADMIN_USERNAME = "santos";
const DEFAULT_ADMIN_PASSWORD = "santorini";

const normalize = (value: string) => value.trim();
const nowIso = () => new Date().toISOString();
const createId = (prefix: string) => `${prefix}_${randomBytes(6).toString("hex")}`;
const isReadOnlyStorageError = (error: unknown) => {
  const code = String((error as { code?: string } | null)?.code || "").toUpperCase();
  return code === "EROFS" || code === "EPERM" || code === "EACCES";
};
const formatUsersWriteError = (error: unknown) =>
  isReadOnlyStorageError(error)
    ? "Ovaj deployment koristi read-only storage za admin korisnike. Login radi sa bootstrap nalogom, ali izmene korisnika ne mogu da se sacuvaju dok se admin users ne prebace na trajni storage."
    : `Ne mogu da sacuvam admin korisnike: ${String((error as { message?: string } | null)?.message || error)}`;

const normalizeRoleIds = (roleIds: AdminRoleId[] | undefined): AdminRoleId[] => {
  const seen = new Set<AdminRoleId>();
  for (const roleId of roleIds ?? []) {
    if (!isKnownAdminRole(roleId)) continue;
    seen.add(roleId);
  }
  if (!seen.size) seen.add("manager");
  return Array.from(seen);
};

const toSafeUser = (user: AdminUserRecord): AdminUserSafe => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  roleIds: normalizeRoleIds(user.roleIds),
  isActive: Boolean(user.isActive),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastLoginAt: user.lastLoginAt ?? null,
  permissions: getAdminPermissionsForRoles(normalizeRoleIds(user.roleIds)),
});

const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${PASSWORD_HASH_PREFIX}:${salt}:${derived}`;
};

const verifyPassword = (password: string, passwordHash: string) => {
  const [prefix, salt, expectedHex] = String(passwordHash || "").split(":");
  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const normalizeStoredUser = (user: AdminUserRecord): AdminUserRecord => ({
  id: normalize(user.id) || createId("admin"),
  username: normalize(user.username).toLowerCase(),
  displayName: normalize(user.displayName) || normalize(user.username),
  passwordHash: user.passwordHash,
  roleIds: normalizeRoleIds(user.roleIds),
  isActive: user.isActive !== false,
  createdAt: user.createdAt || nowIso(),
  updatedAt: user.updatedAt || nowIso(),
  lastLoginAt: user.lastLoginAt ?? null,
});

const getBootstrapCredentials = () => ({
  username: normalize(process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME).toLowerCase(),
  password: normalize(process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD),
});

const createBootstrapOwner = (): AdminUserRecord => {
  const { username, password } = getBootstrapCredentials();
  const now = nowIso();
  return {
    id: "admin_owner_bootstrap",
    username,
    displayName: "Santos Owner",
    passwordHash: hashPassword(password),
    roleIds: ["owner"],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
};

const readUsersFile = async (): Promise<AdminUsersFile> => {
  const fallback: AdminUsersFile = { version: ADMIN_USERS_FILE_VERSION, users: [] };
  const raw = await readPersistentJsonFile<AdminUsersFile>(ADMIN_USERS_PATH, fallback);
  const users = Array.isArray(raw?.users) ? raw.users.map(normalizeStoredUser) : [];

  if (users.length) {
    return { version: ADMIN_USERS_FILE_VERSION, users };
  }

  const seeded = { version: ADMIN_USERS_FILE_VERSION, users: [createBootstrapOwner()] };
  try {
    await writePersistentJsonFile(ADMIN_USERS_PATH, seeded);
  } catch (error) {
    console.warn(`[adminUsers] Bootstrap user is available in-memory only. ${formatUsersWriteError(error)}`);
  }
  return seeded;
};

const writeUsersFile = async (users: AdminUserRecord[]) => {
  try {
    await writePersistentJsonFile(ADMIN_USERS_PATH, {
      version: ADMIN_USERS_FILE_VERSION,
      users,
    } satisfies AdminUsersFile);
  } catch (error) {
    throw new Error(formatUsersWriteError(error));
  }
};

const ensureOwnerSurvives = (users: AdminUserRecord[]) => {
  const activeOwners = users.filter((user) => user.isActive && normalizeRoleIds(user.roleIds).includes("owner"));
  if (!activeOwners.length) {
    throw new Error("Mora da postoji bar jedan aktivan owner nalog.");
  }
};

export async function listAdminUsers() {
  const file = await readUsersFile();
  return file.users.map(toSafeUser);
}

export async function getAdminUserByUsername(username: string) {
  const target = normalize(username).toLowerCase();
  if (!target) return null;
  const file = await readUsersFile();
  return file.users.find((user) => user.username === target) ?? null;
}

export async function authenticateAdminUser(username: string, password: string): Promise<AdminViewer | null> {
  const target = await getAdminUserByUsername(username);
  if (!target || !target.isActive) return null;
  if (!verifyPassword(normalize(password), target.passwordHash)) return null;

  const file = await readUsersFile();
  const nextUsers = file.users.map((user) =>
    user.id === target.id ? { ...user, lastLoginAt: nowIso(), updatedAt: nowIso() } : user
  );
  try {
    await writeUsersFile(nextUsers);
    const fresh = nextUsers.find((user) => user.id === target.id) ?? target;
    return toSafeUser(fresh);
  } catch (error) {
    console.warn(
      `[adminUsers] Skipping lastLoginAt persistence for ${target.username}. ${String((error as { message?: string } | null)?.message || error)}`,
    );
    return toSafeUser(target);
  }
}

export async function createAdminUser(input: {
  username: string;
  displayName: string;
  password: string;
  roleIds: AdminRoleId[];
  isActive?: boolean;
}) {
  const file = await readUsersFile();
  const username = normalize(input.username).toLowerCase();
  const displayName = normalize(input.displayName);
  const password = normalize(input.password);

  if (!username) throw new Error("Korisnicko ime je obavezno.");
  if (!displayName) throw new Error("Ime za prikaz je obavezno.");
  if (!password) throw new Error("Lozinka je obavezna.");
  if (file.users.some((user) => user.username === username)) {
    throw new Error("Korisnicko ime vec postoji.");
  }

  const now = nowIso();
  const user: AdminUserRecord = {
    id: createId("admin"),
    username,
    displayName,
    passwordHash: hashPassword(password),
    roleIds: normalizeRoleIds(input.roleIds),
    isActive: input.isActive !== false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  const nextUsers = [user, ...file.users];
  ensureOwnerSurvives(nextUsers);
  await writeUsersFile(nextUsers);
  return toSafeUser(user);
}

export async function updateAdminUser(
  id: string,
  input: {
    username: string;
    displayName: string;
    password?: string;
    roleIds: AdminRoleId[];
    isActive?: boolean;
  }
) {
  const file = await readUsersFile();
  const username = normalize(input.username).toLowerCase();
  const displayName = normalize(input.displayName);
  const password = normalize(input.password || "");
  const target = file.users.find((user) => user.id === id);

  if (!target) throw new Error("Korisnik nije pronadjen.");
  if (!username) throw new Error("Korisnicko ime je obavezno.");
  if (!displayName) throw new Error("Ime za prikaz je obavezno.");
  if (file.users.some((user) => user.id !== id && user.username === username)) {
    throw new Error("Korisnicko ime vec postoji.");
  }

  const nextUsers = file.users.map((user) =>
    user.id === id
      ? {
          ...user,
          username,
          displayName,
          roleIds: normalizeRoleIds(input.roleIds),
          isActive: input.isActive !== false,
          passwordHash: password ? hashPassword(password) : user.passwordHash,
          updatedAt: nowIso(),
        }
      : user
  );
  ensureOwnerSurvives(nextUsers);
  await writeUsersFile(nextUsers);
  return toSafeUser(nextUsers.find((user) => user.id === id)!);
}

export async function deleteAdminUser(id: string) {
  const file = await readUsersFile();
  const nextUsers = file.users.filter((user) => user.id !== id);
  if (nextUsers.length === file.users.length) {
    throw new Error("Korisnik nije pronadjen.");
  }
  ensureOwnerSurvives(nextUsers);
  await writeUsersFile(nextUsers);
}
