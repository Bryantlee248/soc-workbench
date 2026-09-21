import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { load, save } from './store.mjs';
import { dedupe } from '../engine/dedup.mjs';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    try {
      if (req.method === 'GET' && p === '/healthz') return json(res, 200, { status: 'ok' });

      if (p === '/alerts') {
        if (req.method === 'GET') {
          const db = load();
          let alerts = dedupe(db.alerts);
          const status = url.searchParams.get('status');
          if (status) alerts = alerts.filter((a) => a.status === status);
          return json(res, 200, alerts);
        }
        if (req.method === 'POST') {
          const input = await readBody(req);
          if (!input || !input.title || !input.fingerprint || !SEVERITIES.includes(input.severity)) {
            return json(res, 400, { error: 'invalid input: title/fingerprint/severity required' });
          }
          const db = load();
          const alert = {
            id: randomUUID(),
            title: input.title.trim(),
            fingerprint: input.fingerprint,
            source: input.source || '',
            severity: input.severity,
            status: 'open',
            verdict: 'pending',
            disposition: 'pending',
            note: '',
            count: 1,
            createdAt: new Date().toISOString()
          };
          db.alerts.push(alert);
          save(db);
          return json(res, 201, alert);
        }
      }

      const m = p.match(/^\/alerts\/([^/]+)\/(triage|disposition)$/);
      if (req.method === 'POST' && m) {
        const db = load();
        const alert = db.alerts.find((a) => a.id === m[1]);
        if (!alert) return json(res, 404, { error: 'not found' });
        const input = await readBody(req);
        if (m[2] === 'triage') {
          if (!['confirmed', 'false_positive'].includes(input.verdict)) return json(res, 400, { error: 'invalid verdict' });
          alert.verdict = input.verdict;
          alert.note = input.note || '';
          alert.status = 'triaged';
        } else {
          if (!['resolved', 'ignored'].includes(input.disposition)) return json(res, 400, { error: 'invalid disposition' });
          alert.disposition = input.disposition;
          alert.note = input.note || '';
          alert.status = input.disposition === 'ignored' ? 'ignored' : 'resolved';
        }
        save(db);
        return json(res, 200, alert);
      }

      if (p === '/events') {
        if (req.method === 'GET') return json(res, 200, load().events);
        if (req.method === 'POST') {
          const input = await readBody(req);
          const db = load();
          const alert = db.alerts.find((a) => a.id === (input && input.alert_id));
          if (!alert) return json(res, 400, { error: 'alert not found' });
          if (alert.verdict !== 'confirmed') return json(res, 400, { error: 'alert not confirmed' });
          const event = {
            id: randomUUID(),
            alert_id: alert.id,
            title: alert.title,
            disposition: alert.disposition,
            createdAt: new Date().toISOString()
          };
          db.events.push(event);
          save(db);
          return json(res, 201, event);
        }
      }

      json(res, 404, { error: 'not found' });
    } catch (e) {
      json(res, 500, { error: String((e && e.message) || e) });
    }
  });
}
