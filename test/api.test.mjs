import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../server/server.mjs';

const dbFile = join(dirname(fileURLToPath(import.meta.url)), '..', 'server', 'data', 'db.json');
let server;
let base;
before(async () => {
  rmSync(dbFile, { force: true });
  server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('healthz', async () => {
  assert.equal((await call('GET', '/healthz')).status, 200);
});

test('注入告警 → 列表（去重）', async () => {
  await call('POST', '/alerts', { title: 'SSH 爆破', fingerprint: 'fp-ssh', severity: 'high' });
  await call('POST', '/alerts', { title: 'SSH 爆破', fingerprint: 'fp-ssh', severity: 'high' });
  const list = await call('GET', '/alerts');
  assert.equal(list.status, 200);
  assert.equal(list.data.length, 1); // 去重后 1 条
  assert.equal(list.data[0].count, 2);
});

test('研判 → 处置 → 事件', async () => {
  const created = await call('POST', '/alerts', { title: 'Web 攻击', fingerprint: 'fp-web', severity: 'critical' });
  const id = created.data.id;
  const triaged = await call('POST', `/alerts/${id}/triage`, { verdict: 'confirmed' });
  assert.equal(triaged.status, 200);
  assert.equal(triaged.data.verdict, 'confirmed');
  const disposed = await call('POST', `/alerts/${id}/disposition`, { disposition: 'resolved' });
  assert.equal(disposed.status, 200);
  assert.equal(disposed.data.disposition, 'resolved');
  const ev = await call('POST', '/events', { alert_id: id });
  assert.equal(ev.status, 201);
  const events = await call('GET', '/events');
  assert.equal(events.data.length, 1);
});
