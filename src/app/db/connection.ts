import 'dotenv/config';
import path from 'node:path';
import Database from 'better-sqlite3';

const configuredPath = process.env.DB_PATH;

if (!configuredPath) {
  throw new Error('DB_PATH is not set. Add it to the .env file.');
}

const databasePath = path.resolve(process.cwd(), configuredPath);

export const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
