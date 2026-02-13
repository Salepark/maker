import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import pg from "pg";
import * as pgSchema from "@shared/schema";
import * as sqliteSchema from "../shared/schema.sqlite";
import fs from "fs";
import path from "path";

export type DbDriver = "pg" | "sqlite";

let _driver: DbDriver = "pg";
let _db: any;
let _sqliteRaw: any;

function initDb() {
  const useSqlite = process.env.MAKER_DB === "sqlite";

  if (useSqlite) {
    const filePath = process.env.MAKER_SQLITE_PATH || "./data/maker.db";

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const sqlite = new Database(filePath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    _sqliteRaw = sqlite;
    _db = drizzleSqlite(sqlite, { schema: sqliteSchema });
    _driver = "sqlite";

    console.log(`[DB] SQLite initialized: ${filePath}`);
  } else {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    _db = drizzlePg(pool, { schema: pgSchema });
    _driver = "pg";
  }
}

initDb();

export const db = _db;
export const driver: DbDriver = _driver;
export const sqliteRaw = _sqliteRaw;
