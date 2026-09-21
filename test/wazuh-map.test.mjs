import { test } from 'node:test';
import assert from 'node:assert';
import { mapWazuhAlert, mapLevel } from '../engine/wazuh-map.mjs';

test('mapLevel 映射 Wazuh level → severity', () => {
  assert.equal(mapLevel(3), 'low');
  assert.equal(mapLevel(7), 'medium');
  assert.equal(mapLevel(10), 'high');
  assert.equal(mapLevel(14), 'critical');
});

test('mapWazuhAlert 字段映射 + fingerprint 去重键', () => {
  const w = {
    id: '12345',
    timestamp: '2026-09-21T13:05:36+0800',
    rule: { id: '533', level: 7, description: 'Listened ports status changed' },
    agent: { id: '001', name: 'web-01' },
    location: '/var/log/netstat'
  };
  const a = mapWazuhAlert(w);
  assert.equal(a.title, 'Listened ports status changed');
  assert.equal(a.severity, 'medium');
  assert.equal(a.fingerprint, 'wazuh:533:001:/var/log/netstat');
  assert.equal(a.source, 'web-01');
});
