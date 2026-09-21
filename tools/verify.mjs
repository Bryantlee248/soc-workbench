#!/usr/bin/env node
// verify.mjs — 独立验证器骨架（只看"产物"，不看任何 agent 自述）
// 目标：堵住"agent 自我美化"——完成与否由本脚本的 JSON 判定，而非 agent 的完成语。
// 依据：oh-my-agent「checks the artifacts」；LLM-as-judge 的 self-preference 偏差。
//
// 运行：node tools/verify.mjs
// 输出：verify-report.json + 控制台 JSON；未全过 exit 1。

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const checks = [];
function add(id, desc, fn) {
  let ok = false, detail = '';
  try { const r = fn(); ok = !!r.ok; detail = r.detail || ''; }
  catch (e) { ok = false; detail = String(e.message || e); }
  checks.push({ id, desc, ok, detail });
}

// 1) 规格存在（产物）
add('SPEC_EXISTS', 'specs/spec.md 存在且含旅程', () => {
  const p = 'specs/spec.md';
  if (!existsSync(p)) return { ok: false, detail: 'missing ' + p };
  const t = readFileSync(p, 'utf8');
  const n = (t.match(/^\s*-\s*id:\s*\S+/gm) || []).length;
  return { ok: n > 0, detail: 'journeys=' + n };
});

// 2) DESIGN 存在（有 UI 就必须）
add('DESIGN_EXISTS', 'DESIGN.md 存在（有 UI 项目必须）', () => {
  return { ok: existsSync('DESIGN.md'), detail: existsSync('DESIGN.md') ? 'present' : 'missing (UI 项目视为失败)' };
});

// 3) 旅程 e2e 脚本存在（跳过注释行）
add('E2E_SCRIPTS_EXIST', 'e2e 验收脚本存在', () => {
  if (!existsSync('specs/spec.md')) return { ok: false, detail: 'no spec' };
  const lines = readFileSync('specs/spec.md', 'utf8').split(/\r?\n/);
  const cmds = [];
  for (const l of lines) {
    if (/^\s*#/.test(l)) continue;
    const m = l.match(/verify:\s*"?bash\s+(\S+?)"?\s*$/);
    if (m) cmds.push(m[1]);
  }
  const missing = cmds.filter(c => !existsSync(c));
  return { ok: cmds.length > 0 && missing.length === 0, detail: 'scripts=' + cmds.length + ' missing=' + (missing.join(',') || 'none') };
});

// 4) converge 已收敛（读其产物 gaps.md，而非重跑）
add('CONVERGED_ARTIFACT', 'converge 产物显示已收敛', () => {
  const p = 'specs/gaps.md';
  if (!existsSync(p)) return { ok: false, detail: 'no gaps.md (converge 未跑)' };
  const t = readFileSync(p, 'utf8');
  return { ok: /CONVERGED ✅/.test(t) && !/NOT CONVERGED/.test(t), detail: /NOT CONVERGED/.test(t) ? 'NOT CONVERGED' : 'CONVERGED' };
});

// 5) 项目自带 test/build 脚本
add('PROJECT_TEST_CMD', '项目自带 test/build 脚本', () => {
  const found = ['package.json', 'pom.xml', 'Makefile'].filter(f => existsSync(f));
  return { ok: found.length > 0, detail: 'found: ' + (found.join(',') || 'none') };
});

// 6) 无密钥落库（静态扫描，纯 Node 读文件）
add('NO_SECRETS_COMMITTED', '无密钥明文入库（扫描常见模式）', () => {
  let files = [];
  try { files = execSync('git ls-files', { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean); }
  catch { return { ok: true, detail: 'scan skipped (no git)' }; }
  files = files.filter(f => !/\.md$/i.test(f) && !/example/i.test(f) && !/node_modules/.test(f));
  const patterns = [ /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /password\s*=\s*["'`][^"'`]{6,}/i ];
  const hits = [];
  for (const f of files) {
    let c; try { c = readFileSync(f, 'utf8'); } catch { continue; }
    for (const re of patterns) if (re.test(c)) { hits.push(f + ' :: ' + String(re)); break; }
  }
  return { ok: hits.length === 0, detail: hits.length ? 'possible secrets: ' + hits[0] : 'clean' };
});

const allOk = checks.every(c => c.ok);
const report = { tool: 'verify', at: new Date().toISOString(), note: 'independent verification: judged by artifacts, not by agent narration', all_pass: allOk, checks };
writeFileSync('verify-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!allOk) process.exit(1);
