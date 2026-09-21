// 规则引擎：按 fingerprint 去重（相同指纹合并计数）
export function dedupe(alerts) {
  const byFp = new Map();
  for (const a of alerts) {
    const prev = byFp.get(a.fingerprint);
    if (prev) {
      prev.count = (prev.count || 1) + 1;
      // 严重度取更高者
      if (severityRank(a.severity) > severityRank(prev.severity)) prev.severity = a.severity;
    } else {
      byFp.set(a.fingerprint, { ...a, count: 1 });
    }
  }
  return [...byFp.values()];
}

const RANK = { low: 1, medium: 2, high: 3, critical: 4 };
function severityRank(s) { return RANK[s] || 0; }
