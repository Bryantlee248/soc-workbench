import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { mapWazuhAlert } from '../engine/wazuh-map.mjs';
import { load, save } from './store.mjs';

const WAZUH_ALERTS = process.env.WAZUH_ALERTS || '/var/ossec/logs/alerts/alerts.json';

export function ingestWazuh(maxLines = 500) {
  const text = readFileSync(WAZUH_ALERTS, 'utf8');
  const lines = text.trim().split(/\r?\n/).filter(Boolean).slice(-maxLines);
  const db = load();
  const seen = new Set(db.alerts.map((a) => a.wazuh_id).filter(Boolean));
  let added = 0;
  for (const line of lines) {
    let w;
    try { w = JSON.parse(line); } catch { continue; }
    if (!w || w.id == null) continue;
    if (seen.has(String(w.id))) continue; // 已入库，跳过
    const mapped = mapWazuhAlert(w);
    db.alerts.push({
      id: randomUUID(),
      ...mapped,
      wazuh_id: String(w.id),
      status: 'open',
      verdict: 'pending',
      disposition: 'pending',
      note: '',
      count: 1,
      createdAt: w.timestamp || new Date().toISOString()
    });
    seen.add(String(w.id));
    added++;
  }
  if (added > 0) save(db);
  return added;
}
