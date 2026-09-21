#!/usr/bin/env node
// converge.mjs — 可机器化的"收敛对账器"骨架（无第三方依赖）
// 用途：把"实现 vs 承诺(spec/tasks/DESIGN)"的缺口算出来，未收敛 exit 1（供 CI 拦截）。
//
// 约定：
//  - specs/spec.md 里含一个 ```yaml converge block，形如：
//      journeys:
//        - id: J1
//          name: 管理员登记资产并入库
//          verify: "bash e2e/J1.sh"
//  - specs/tasks.md 里含：
//      - [ ] T1 ... verify: "bash tools/check-t1.sh"
//      - [x] T2 ...
//  - 可选 DESIGN.md：若安装了 @google/design.md CLI 则跑 lint；否则标 SKIP。
//  - 单一事实源：散文旅程标题（### Jn）与 yaml 块 id 必须一一对应（J0 主档除外）。
//
// 输出：写 specs/gaps.md；控制台打印汇总；未收敛 exit 1。

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const SPEC = resolve(ROOT, 'specs/spec.md');
const TASKS = resolve(ROOT, 'specs/tasks.md');
const DESIGN = resolve(ROOT, 'DESIGN.md');
const GAPS = resolve(ROOT, 'specs/gaps.md');

const gaps = [];
function gap(stage, item, reason) { gaps.push({ stage, item, reason }); }

// --- 解析 spec.md 中 ```yaml converge 块（极简解析：只取 journeys 列表） ---
function parseJourneys(md) {
  const m = md.match(/```yaml\s+converge\r?\n([\s\S]*?)```/);
  if (!m) return [];
  const body = m[1];
  const journeys = [];
  let cur = null;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const idm = line.match(/^\s*-\s*id:\s*(\S+)/);
    if (idm) { cur = { id: idm[1] }; journeys.push(cur); continue; }
    if (cur) {
      const nm = line.match(/^\s*name:\s*(.+)$/); if (nm) cur.name = nm[1].trim();
      const vm = line.match(/^\s*verify:\s*(.+)$/); if (vm) cur.verify = vm[1].replace(/^["']|["']$/g, '').trim();
    }
  }
  return journeys;
}

function runVerify(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 120000 });
    return { ok: true };
  } catch (e) {
    const out = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
    return { ok: false, detail: out.split(/\r?\n/).slice(-3).join(' | ') || String(e.message) };
  }
}

// --- (a) 旅程对账 ---
if (!existsSync(SPEC)) {
  gap('specify', 'spec.md', '缺失：specs/spec.md 不存在');
} else {
  const journeys = parseJourneys(readFileSync(SPEC, 'utf8'));
  if (journeys.length === 0) gap('specify', 'spec.md', '未找到 ```yaml converge 旅程块 或 旅程为空');
  for (const j of journeys) {
    if (!j.verify) { gap('specify', j.id, '旅程缺少 verify（无法验收）'); continue; }
    const r = runVerify(j.verify);
    if (!r.ok) gap('implement', j.id + ' ' + (j.name || ''), '旅程验收未通过: ' + j.verify + ' :: ' + (r.detail || ''));
  }
}

// --- (b) 任务对账 ---
if (existsSync(TASKS)) {
  const lines = readFileSync(TASKS, 'utf8').split(/\r?\n/);
  for (const ln of lines) {
    const m = ln.match(/^\s*-\s*\[( |x|X)\]\s*(.+?)(?:\s*verify:\s*(.+))?$/);
    if (!m) continue;
    const done = m[1].toLowerCase() === 'x';
    const title = m[2].trim();
    const verify = m[3] && m[3].replace(/^["']|["']$/g, '').trim();
    if (verify) {
      const r = runVerify(verify);
      if (!r.ok) gap('tasks', title, 'task verify 未通过: ' + verify + ' :: ' + (r.detail || ''));
    } else if (!done) {
      gap('tasks', title, '未完成且无 verify');
    }
  }
}

// --- (c) DESIGN 对账（可选） ---
if (existsSync(DESIGN)) {
  try {
    const out = execSync('npx -y @google/design.md lint DESIGN.md', { cwd: ROOT, stdio: 'pipe', timeout: 180000 }).toString();
    let parsed = null; try { parsed = JSON.parse(out); } catch {}
    const errs = parsed?.summary?.errors ?? 0;
    if (errs > 0) gap('design', 'DESIGN.md', `lint 有 ${errs} 个 error`);
  } catch (e) {
    const out = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
    if (/not found|ENOENT|Cannot find|404/i.test(out)) {
      console.log('[converge] DESIGN lint: SKIP (未安装 @google/design.md)');
    } else {
      gap('design', 'DESIGN.md', 'lint 失败/有 error: ' + out.split(/\r?\n/).slice(-2).join(' | '));
    }
  }
} else {
  console.log('[converge] DESIGN.md 不存在：跳过设计对账（若项目有 UI，应补 DESIGN.md 以避免"丑"）');
}

// --- (d) 单一事实源对账：散文旅程标题 ↔ yaml 旅程 id 一一对应 ---
// 约定：J0 保留给"主档/前置"切片（无 e2e verify），不计入；J1..Jn 是用户旅程。
// 仅当 spec 里存在散文旅程标题时检查（yaml-only 的 spec 跳过，避免误报）。
if (existsSync(SPEC)) {
  const specText = readFileSync(SPEC, 'utf8');
  const yamlIds = parseJourneys(specText).map((j) => j.id);
  const proseIds = [];
  for (const line of specText.split(/\r?\n/)) {
    const m = line.match(/^#{2,4}\s*(J\d+)\b/);
    if (m && m[1] !== 'J0') proseIds.push(m[1]);
  }
  if (proseIds.length > 0) {
    const ySet = new Set(yamlIds);
    const pSet = new Set(proseIds);
    for (const id of proseIds) if (!ySet.has(id)) gap('specify', 'spec.md', `散文旅程 ${id} 未在 converge yaml 块登记（漂移）`);
    for (const id of yamlIds) if (!pSet.has(id)) gap('specify', 'spec.md', `converge yaml 旅程 ${id} 无对应散文标题（漂移）`);
  }
}

// --- 汇报 ---
const converged = gaps.length === 0;
const md = [
  '# converge gaps（机器生成，勿手改）',
  '',
  `时间: ${new Date().toISOString()}`,
  `结论: ${converged ? 'CONVERGED ✅' : 'NOT CONVERGED ❌ (' + gaps.length + ' gaps)'}`,
  '',
  '| # | 阶段 | 项 | 原因 |',
  '|---|---|---|---|',
  ...gaps.map((g, i) => `| ${i + 1} | ${g.stage} | ${g.item} | ${String(g.reason).replace(/\|/g, '/')} |`),
  '',
].join('\n');
try { writeFileSync(GAPS, md); } catch {}
console.log(`[converge] ${converged ? 'CONVERGED ✅' : 'NOT CONVERGED ❌'} gaps=${gaps.length} -> ${GAPS}`);
if (!converged) { console.log(md); process.exit(1); }
