// Wazuh 告警 → 工作台告警格式映射（D-004）
export function mapWazuhAlert(w) {
  const rule = w.rule || {};
  const agent = w.agent || {};
  return {
    title: rule.description || w.description || 'unknown',
    fingerprint: `wazuh:${rule.id || '?'}:${agent.id || '000'}:${w.location || ''}`,
    source: agent.name || w.location || 'wazuh',
    severity: mapLevel(rule.level)
  };
}

export function mapLevel(level) {
  if (level >= 13) return 'critical';
  if (level >= 9) return 'high';
  if (level >= 5) return 'medium';
  return 'low';
}
