import { test } from 'node:test';
import assert from 'node:assert';
import { dedupe } from '../engine/dedup.mjs';

test('相同 fingerprint 合并并计数', () => {
  const alerts = [
    { id: 'a1', title: 'SSH 爆破', fingerprint: 'fp-1', severity: 'high' },
    { id: 'a2', title: 'SSH 爆破', fingerprint: 'fp-1', severity: 'critical' },
    { id: 'a3', title: '端口扫描', fingerprint: 'fp-2', severity: 'low' }
  ];
  const out = dedupe(alerts);
  assert.equal(out.length, 2);
  const fp1 = out.find((a) => a.fingerprint === 'fp-1');
  assert.equal(fp1.count, 2);
  assert.equal(fp1.severity, 'critical'); // 取更高严重度
});

test('不同 fingerprint 保留', () => {
  const out = dedupe([
    { fingerprint: 'x', title: 'x', severity: 'low' },
    { fingerprint: 'y', title: 'y', severity: 'low' }
  ]);
  assert.equal(out.length, 2);
});
