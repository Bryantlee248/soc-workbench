import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataFile = join(dirname(fileURLToPath(import.meta.url)), 'data', 'db.json');

export function load() {
  if (!existsSync(dataFile)) return { alerts: [], events: [] };
  try { return JSON.parse(readFileSync(dataFile, 'utf8')); } catch { return { alerts: [], events: [] }; }
}
export function save(db) {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(db, null, 2));
}
