import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import fs from "node:fs/promises";
import { authMode } from "../config/db.js";

const USERS_FILE = "auth/users.json";

const getUsersPath = () => {
  const base =
    process.env.TALLY_HELPER_DATA_DIR ||
    path.resolve(process.cwd(), "storage", "data");
  return path.join(base, USERS_FILE);
};

const readUsers = async () => {
  const filePath = getUsersPath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const writeUsers = async (users) => {
  const filePath = getUsersPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(users, null, 2), "utf8");
};

export const isLocalAuthEnabled = () => authMode === "local";

export const ensureLocalUsersSeeded = async () => {
  if (!isLocalAuthEnabled()) return;

  const users = await readUsers();
  if (users.length > 0) return;

  const email = (
    process.env.DEV_AUTH_EMAIL || "dev@importease.local"
  ).toLowerCase();
  const password = process.env.DEV_AUTH_PASSWORD || "dev123";
  const passwordHash = await bcrypt.hash(password, 10);

  const seedUser = {
    _id: uuidv4(),
    email,
    passwordHash,
    subscriptionActive: true,
    subscriptionExpiry: new Date("2099-01-01T00:00:00.000Z").toISOString(),
    subscriptionPlan: "dev",
    softwareToken: null,
    deviceId: null,
    isMaster: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await writeUsers([seedUser]);
  console.log(
    `[auth] Seeded local dev user "${email}" (password from DEV_AUTH_PASSWORD or default "dev123")`,
  );
};

export const findLocalUserByEmail = async (email) => {
  const users = await readUsers();
  return (
    users.find((u) => u.email === email.toLowerCase().trim()) || null
  );
};

export const findLocalUserByToken = async (token) => {
  const users = await readUsers();
  return users.find((u) => u.softwareToken === token) || null;
};

export const saveLocalUser = async (user) => {
  const users = await readUsers();
  const index = users.findIndex((u) => u._id === user._id);
  const record = {
    ...user,
    updatedAt: new Date().toISOString(),
  };

  if (index === -1) {
    users.push(record);
  } else {
    users[index] = record;
  }

  await writeUsers(users);
  return record;
};

export const generateSoftwareToken = () =>
  `SW-${crypto.randomBytes(24).toString("hex")}`;
