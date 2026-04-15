// Uses Node.js 22+ built-in SQLite (node:sqlite)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH || "./data/lab.db";
const resolvedPath = path.resolve(process.cwd(), DB_PATH);

const dataDir = path.dirname(resolvedPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Singleton DB instance
let _db: InstanceType<typeof DatabaseSync> | null = null;

function getDb() {
  if (!_db) {
    _db = new DatabaseSync(resolvedPath);
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: InstanceType<typeof DatabaseSync>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS lab_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      lab_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started',
      completed_tasks TEXT NOT NULL DEFAULT '[]',
      started_at INTEGER,
      completed_at INTEGER,
      UNIQUE(user_id, lab_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      lab_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_progress_user ON lab_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_user_lab ON chat_history(user_id, lab_id);
  `);
}

// ── Users ──────────────────────────────────────────────────────────────────

export function createUser(
  id: string,
  email: string,
  username: string,
  passwordHash: string
) {
  const db = getDb();
  db.prepare(
    "INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)"
  ).run(id, email, username, passwordHash);
}

export function getUserByEmail(email: string): UserRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as unknown as UserRow | undefined;
}

export function getUserByUsername(username: string): UserRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as unknown as UserRow | undefined;
}

export function getUserById(id: string): Omit<UserRow, "password_hash"> | undefined {
  const db = getDb();
  return db
    .prepare("SELECT id, email, username, created_at FROM users WHERE id = ?")
    .get(id) as unknown as Omit<UserRow, "password_hash"> | undefined;
}

// ── Lab Progress ───────────────────────────────────────────────────────────

export function getLabProgress(userId: string, labId: string): LabProgressRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM lab_progress WHERE user_id = ? AND lab_id = ?")
    .get(userId, labId) as unknown as LabProgressRow | undefined;
}

export function getAllLabProgress(userId: string): LabProgressRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM lab_progress WHERE user_id = ?")
    .all(userId) as unknown as LabProgressRow[];
}

export function upsertLabProgress(
  id: string,
  userId: string,
  labId: string,
  status: string,
  completedTasks: string[],
  startedAt?: number,
  completedAt?: number | null
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO lab_progress (id, user_id, lab_id, status, completed_tasks, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, lab_id) DO UPDATE SET
       status = excluded.status,
       completed_tasks = excluded.completed_tasks,
       started_at = COALESCE(lab_progress.started_at, excluded.started_at),
       completed_at = excluded.completed_at`
  ).run(
    id,
    userId,
    labId,
    status,
    JSON.stringify(completedTasks),
    startedAt ?? Math.floor(Date.now() / 1000),
    completedAt ?? null
  );
}

// ── Chat History ───────────────────────────────────────────────────────────

export function getChatHistory(userId: string, labId: string): ChatRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM chat_history WHERE user_id = ? AND lab_id = ? ORDER BY created_at ASC"
    )
    .all(userId, labId) as unknown as ChatRow[];
}

export function addChatMessage(
  id: string,
  userId: string,
  labId: string,
  role: string,
  content: string
) {
  const db = getDb();
  db.prepare(
    "INSERT INTO chat_history (id, user_id, lab_id, role, content) VALUES (?, ?, ?, ?, ?)"
  ).run(id, userId, labId, role, content);
}

export function clearChatHistory(userId: string, labId: string) {
  const db = getDb();
  db.prepare("DELETE FROM chat_history WHERE user_id = ? AND lab_id = ?").run(userId, labId);
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  created_at: number;
}

export interface LabProgressRow {
  id: string;
  user_id: string;
  lab_id: string;
  status: string;
  completed_tasks: string;
  started_at: number | null;
  completed_at: number | null;
}

export interface ChatRow {
  id: string;
  user_id: string;
  lab_id: string;
  role: string;
  content: string;
  created_at: number;
}
