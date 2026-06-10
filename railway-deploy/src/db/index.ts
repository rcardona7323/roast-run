import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

let _pool: pg.Pool | undefined;
let _db: NodePgDatabase<typeof schema> | undefined;

function init() {
  if (_db) return { pool: _pool!, db: _db };
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Is .env loaded?");
  }
  _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  _db = drizzle(_pool, { schema });
  return { pool: _pool, db: _db };
}

export { schema };

export function getDb() {
  return init().db;
}

export function getPool() {
  return init().pool;
}

// Convenience re-export that initializes on first use
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    return init().db[prop as keyof NodePgDatabase<typeof schema>];
  },
});

export * from "./schema/index.js";
