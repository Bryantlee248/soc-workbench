#!/usr/bin/env node
// validate-governance.mjs — 企业级治理校验器（零依赖 Node，跨平台）
//
// 用法：
//   node validate-governance.mjs [--dir <项目根>] [--ci] [--base <ref>] [--pr-body <文件>] [--summary]
//
// 本地模式：五文件存在 / manifest schema / 引用存在 / 状态一致 / 批准链 / 分权 / 等级一致
// CI 模式  ：+ PR diff 归属检查 + 权威文档同变更检查
// --summary：额外输出一句话状态速览（给人读）

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const HELP = `用法: node validate-governance.mjs [选项]
  --dir <目录>      项目根（默认当前目录）
  --ci              启用 CI 门（diff 归属 + 权威文档同变更）
  --base <ref>      diff 基线（默认 GITHUB_BASE_REF 或 HEAD~1）
  --pr-body <文件>  PR 正文来源（默认读 PR_BODY 或 PR_BODY_FILE）
  --summary         输出一句话状态速览
  --make-anchor <path>:<line>  计算证据锚的 sha256（填 evidence_anchors 用）`;

function parseArgs(argv) {
  const a = { dir: '.', ci: false, base: null, prBody: null, summary: false, makeAnchor: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--dir') a.dir = argv[++i];
    else if (x === '--ci') a.ci = true;
    else if (x === '--base') a.base = argv[++i];
    else if (x === '--pr-body') a.prBody = argv[++i];
    else if (x === '--summary') a.summary = true;
    else if (x === '--make-anchor') a.makeAnchor = argv[++i];
    else if (x === '--help' || x === '-h') a.help = true;
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) { console.log(HELP); process.exit(0); }

const root = resolve(args.dir);
const read = (p) => readFileSync(join(root, p), 'utf8');

// --make-anchor：计算某行 sha256，供 evidence_anchors 使用
if (args.makeAnchor) {
  const i = args.makeAnchor.lastIndexOf(':');
  if (i <= 0) { console.error('用法: --make-anchor <path>:<line>'); process.exit(1); }
  const p = args.makeAnchor.slice(0, i);
  const line = Number(args.makeAnchor.slice(i + 1));
  const abs = resolve(root, p);
  if (!existsSync(abs)) { console.error('文件不存在: ' + p); process.exit(1); }
  const lines = readFileSync(abs, 'utf8').split(/\r?\n/);
  if (!Number.isInteger(line) || line < 1 || line > lines.length) { console.error(`行号越界: ${line}（共 ${lines.length} 行）`); process.exit(1); }
  const sha256 = createHash('sha256').update(lines[line - 1], 'utf8').digest('hex');
  console.log(JSON.stringify({ path: p, line, sha256 }, null, 2));
  console.log('把 path/line/sha256 填入 PROJECT.json 的 evidence_anchors[]（自行加 id 如 ANCHOR-001 与 claim）。');
  process.exit(0);
}
const errors = [];
const warnings = [];

// ---------- 基础校验 ----------
function check(cond, msg) { if (!cond) errors.push(msg); }
function warn(cond, msg) { if (cond) warnings.push(msg); }

function safeResolve(p) {
  if (!p || typeof p !== 'string') return null;
  if (p.startsWith('/') || p.startsWith('\\') || /^[A-Za-z]:/.test(p)) return null;
  const abs = resolve(root, p);
  const rootAbs = resolve(root) + sep;
  if (!abs.startsWith(rootAbs)) return null;
  return abs;
}

function exists(p) { const abs = safeResolve(p); return abs && existsSync(abs); }

// ---------- 1. 五文件 ----------
const FIVE = ['PROJECT.json', 'GOVERNANCE.md', 'ROADMAP.md', 'DECISIONS.md', 'WORKLOG.md'];
for (const f of FIVE) check(exists(f), `缺少五文件之一: ${f}`);

let m = null;
try {
  m = JSON.parse(read('PROJECT.json'));
} catch (e) {
  errors.push(`PROJECT.json 无法解析: ${e.message}`);
}

if (m) {
  // ---------- 2. schema ----------
  check(m.schema_version === 1, 'schema_version 必须为 1');
  const p = m.project || {};
  check(/^[a-z0-9-]+$/.test(p.id || ''), 'project.id 格式错误（^[a-z0-9-]+$，不能是 CHANGE-ME）');
  check(typeof p.name === 'string' && p.name && p.name !== 'CHANGE-ME', 'project.name 未填写');
  check(['L0', 'L1', 'L2', 'L3'].includes(p.governance_level), 'project.governance_level 必须为 L0|L1|L2|L3');
  check(['discovery', 'feasibility', 'poc', 'pilot', 'production', 'retired'].includes(p.lifecycle), 'project.lifecycle 非法');

  const st = m.state || {};
  check(/^G[0-4]$/.test(st.current_gate || ''), 'state.current_gate 必须为 G0-G4');
  check(Array.isArray(st.active_work_items), 'state.active_work_items 必须是数组');
  if (st.next_work_item != null) check(/^W-\d{3}$/.test(st.next_work_item), 'state.next_work_item 格式错误');

  const au = m.authority || {};
  for (const k of ['governance', 'roadmap', 'decisions', 'worklog']) check(exists(au[k]), `authority.${k} 文件不存在: ${au[k]}`);
  check(typeof au.human_authorizer === 'string' && au.human_authorizer && au.human_authorizer !== 'CHANGE-ME', 'authority.human_authorizer 未填写');

  const roles = m.roles || {};
  check(typeof roles.architecture === 'string' && roles.architecture && roles.architecture !== 'CHANGE-ME', 'roles.architecture 未填写');
  check(Array.isArray(roles.delivery), 'roles.delivery 必须是数组');

  const enf = m.enforcement || {};
  check(typeof enf.file_ownership === 'boolean', 'enforcement.file_ownership 必须是布尔');

  const eff = m.effective || {};
  check(Array.isArray(eff.decisions) && Array.isArray(eff.work_packages) && Array.isArray(eff.artifacts), 'effective 三数组缺失');

  check(Array.isArray(m.gates) && m.gates.length > 0, 'gates 不能为空');
  check(Array.isArray(m.superseded), 'superseded 必须是数组');

  // ---------- 3. ROADMAP 解析与状态一致 ----------
  let roadmapRows = [];
  let roadmapStates = {};
  if (exists(au.roadmap)) {
    const re = /^\|\s*(W-\d{3})\s*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*(PLANNED|ACTIVE|BLOCKED|DONE|CANCELLED)\s*\|/gm;
    let mm;
    const text = read(au.roadmap);
    while ((mm = re.exec(text))) {
      if (roadmapStates[mm[1]]) errors.push(`Roadmap 重复工作项: ${mm[1]}`);
      roadmapStates[mm[1]] = mm[2];
      roadmapRows.push({ id: mm[1], status: mm[2] });
    }
    check(roadmapRows.length > 0, 'Roadmap 无有效工作项（检查表格格式）');
  }

  const activeInManifest = [...new Set(st.active_work_items || [])];
  for (const w of activeInManifest) check(roadmapStates[w] !== undefined, `active_work_items 不存在于 Roadmap: ${w}`);
  const activeInRoadmap = Object.entries(roadmapStates).filter(([, s]) => s === 'ACTIVE').map(([id]) => id).sort();
  const activeSorted = [...activeInManifest].sort();
  check(JSON.stringify(activeSorted) === JSON.stringify(activeInRoadmap), 'Manifest 与 Roadmap 的 ACTIVE 工作项不一致');

  if (st.next_work_item != null) {
    check(roadmapStates[st.next_work_item] !== undefined, `next_work_item 不存在于 Roadmap: ${st.next_work_item}`);
    if (roadmapStates[st.next_work_item]) {
      const s = roadmapStates[st.next_work_item];
      check(s === 'PLANNED' || s === 'ACTIVE', `next_work_item 状态应为 PLANNED/ACTIVE，实际 ${s}`);
    }
  }

  // ---------- 4. WORKLOG：DONE 必须有证据 ----------
  if (exists(au.worklog)) {
    const lines = read(au.worklog).split(/\r?\n/);
    const blocks = [];
    let cur = null;
    for (const line of lines) {
      const h = line.match(/^###\s+\d{4}-\d{2}-\d{2}\s*\|\s*(W-\d{3})\s*\|\s*(STARTED|BLOCKED|DONE|CANCELLED)\s*$/);
      if (h) { if (cur) blocks.push(cur); cur = { id: h[1], status: h[2], text: '' }; }
      else if (cur) cur.text += line + '\n';
    }
    if (cur) blocks.push(cur);

    for (const [id, s] of Object.entries(roadmapStates)) {
      if (s !== 'DONE') continue;
      const done = blocks.filter((b) => b.id === id && b.status === 'DONE');
      check(done.length > 0, `完成工作项 ${id} 无 DONE 记录`);
      if (done.length > 0) check(/Evidence:\s*\S+/.test(done[done.length - 1].text), `完成工作项 ${id} 的 DONE 记录缺少非空 Evidence`);
    }
  }

  // ---------- 5. 决策双向一致 ----------
  if (exists(au.decisions)) {
    const docIds = [...new Set([...read(au.decisions).matchAll(/^\|\s*(D-\d{3})\s*\|/gm)].map((x) => x[1]))];
    const manifestIds = [...new Set((eff.decisions || []).map((d) => d.id))];
    for (const id of docIds) check(manifestIds.includes(id), `DECISIONS.md 中的决策未登记进 manifest: ${id}`);
    for (const id of manifestIds) check(docIds.includes(id), `manifest 决策不在 DECISIONS.md: ${id}`);
    for (const d of eff.decisions) check(['accepted', 'provisional'].includes(d.status), `决策 ${d.id} 状态非法`);
  }

  // ---------- 6. 工作包：批准链 + 分权 ----------
  for (const wp of eff.work_packages || []) {
    check(/^IWP-\d{3}$/.test(wp.id || ''), '工作包 id 格式错误');
    check(roadmapStates[wp.roadmap_id] !== undefined, `工作包 ${wp.id} 引用未知 Roadmap 项: ${wp.roadmap_id}`);
    const TERMINAL = ['APPROVED', 'CLOSED'];
    if (TERMINAL.includes(wp.status)) {
      check(typeof wp.approval === 'string' && wp.approval.trim(), `工作包 ${wp.id} 状态 ${wp.status} 必须挂批准证据 approval`);
    }
    if (wp.primary && wp.verifier) check(wp.primary !== wp.verifier, `工作包 ${wp.id} primary 与 verifier 必须独立`);

    if (enf.file_ownership) {
      const fo = wp.file_ownership || [];
      if (wp.primary) check(fo.length > 0, `工作包 ${wp.id} 未声明 file_ownership（分权硬约束开）`);
      const owners = [];
      for (const o of fo) {
        for (const path of o.paths || []) {
          if (!safeResolve(path)) { errors.push(`工作包 ${wp.id} 拥有路径越界: ${path}`); continue; }
          owners.push({ owner: o.owner, path: String(path).replace(/\\/g, '/').replace(/\/+$/, '') });
        }
      }
      for (let i = 0; i < owners.length; i++) for (let j = i + 1; j < owners.length; j++) {
        const a = owners[i], b = owners[j];
        if (a.owner !== b.owner && overlap(a.path, b.path)) {
          errors.push(`工作包 ${wp.id} 写路径重叠: ${a.owner}:${a.path} 冲突 ${b.owner}:${b.path}`);
        }
      }
    }
  }

  // ---------- 7. 制品 + 阶段门 ----------
  for (const art of eff.artifacts || []) check(typeof art.approval === 'string' && art.approval.trim(), `制品 ${art.id} 缺少批准证据`);

  const gateIds = (m.gates || []).map((g) => g.id);
  check(gateIds.includes(st.current_gate), `current_gate ${st.current_gate} 不在 gates 中`);
  for (const g of m.gates || []) {
    check(/^G[0-4]$/.test(g.id || ''), `门 id 非法: ${g.id}`);
    check(['planned', 'in_progress', 'passed', 'conditional', 'blocked', 'failed'].includes(g.status), `门 ${g.id} 状态非法`);
    if (g.status === 'passed') check(typeof g.approval === 'string' && g.approval.trim(), `门 ${g.id} passed 必须挂批准证据`);
  }

  // ---------- 8. 等级与对象一致 ----------
  const L = p.governance_level;
  if (L === 'L2' || L === 'L3') {
    check(Array.isArray(m.environments), `${L} 必须声明 environments`);
    check(Array.isArray(m.components), `${L} 必须声明 components`);
  }
  if (L === 'L3') {
    check(Array.isArray(m.risks), 'L3 必须声明 risks');
    check(Array.isArray(m.exceptions), 'L3 必须声明 exceptions');
  }
  if (L === 'L0' || L === 'L1') {
    warn((m.environments || []).length || (m.components || []).length || (m.risks || []).length || (m.exceptions || []).length,
      '提示：低等级建了高等级治理对象，疑似过度治理');
  }

  // ---------- 9. superseded 引用 ----------
  for (const s of m.superseded || []) {
    if (s.path) check(safeResolve(s.path) !== null, `superseded 路径越界: ${s.path}`);
  }

  // ---------- 10. 证据锚漂移检测 ----------
  for (const a of m.evidence_anchors || []) {
    check(/^ANCHOR-\d{3}$/.test(a.id || ''), `证据锚 id 格式错误: ${a.id}`);
    if (!a.path || !Number.isInteger(a.line) || typeof a.sha256 !== 'string') { errors.push(`证据锚字段缺失: ${a.id}`); continue; }
    const abs = safeResolve(a.path);
    if (!abs || !existsSync(abs)) { errors.push(`证据锚文件不存在或越界: ${a.id} (${a.path})`); continue; }
    const lines = readFileSync(abs, 'utf8').split(/\r?\n/);
    if (a.line < 1 || a.line > lines.length) { errors.push(`证据锚行号越界: ${a.id} (${a.path}:${a.line})`); continue; }
    const actual = createHash('sha256').update(lines[a.line - 1], 'utf8').digest('hex');
    if (actual !== a.sha256) {
      errors.push(`证据锚漂移: ${a.id} (${a.path}:${a.line}) — 声称的证据已失效（该行内容已改动）`);
    }
  }

  // ---------- summary ----------
  if (args.summary) {
    console.log(`[governance] ${p.id} | ${p.name} | ${L}/${p.lifecycle} | 门 ${st.current_gate} | 活动 ${activeInManifest.length} | 下一项 ${st.next_work_item || '-'}`);
  }
}

// ---------- CI 模式 ----------
if (args.ci && m) {
  const base = args.base || process.env.GITHUB_BASE_REF || 'HEAD~1';
  let changed = [];
  try {
    changed = execFileSync('git', ['-C', root, 'diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' })
      .split(/\r?\n/).filter(Boolean);
  } catch { /* 无 git 历史时跳过 */ }

  let prBody = '';
  if (args.prBody) prBody = readFileSync(resolve(args.prBody), 'utf8');
  else if (process.env.PR_BODY) prBody = process.env.PR_BODY;
  else if (process.env.PR_BODY_FILE) prBody = readFileSync(resolve(process.env.PR_BODY_FILE), 'utf8');

  const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '');
  const authorityDocs = new Set([m.authority?.governance, m.authority?.roadmap, m.authority?.decisions, m.authority?.worklog].filter(Boolean));
  const controlPlane = new Set(['PROJECT.json', ...authorityDocs, 'scripts/', 'contracts/', 'work/', '.github/', 'docs/']);
  const inControlPlane = (f) => [...controlPlane].some((c) => f === c || f.startsWith(c.replace(/\/$/, '') + '/'));

  // 检查 A：改权威文档必须同 PR 改 PROJECT.json（仅 4 个权威文档）
  const docChanged = changed.map(norm).filter((f) => authorityDocs.has(f));
  if (docChanged.length > 0 && !changed.map(norm).includes('PROJECT.json')) {
    errors.push(`权威文档变更未同步改 PROJECT.json: ${docChanged.join(', ')}`);
  }

  // 检查 B：分权 diff 归属（仅 PR 上下文——有 PR body 时；push 事件无 body，跳过）
  if (m.enforcement && m.enforcement.file_ownership && prBody.trim()) {
    const role = (prBody.match(/<!--\s*gov:role\s*=\s*(\S+)\s*-->/)?.[1] || '').toLowerCase();
    const iwp = prBody.match(/<!--\s*gov:iwp\s*=\s*(\S+)\s*-->/)?.[1] || '';
    const declared = (prBody.match(/<!--\s*gov:paths\s*=\s*(.*?)\s*-->/)?.[1] || '')
      .split(',').map((s) => s.trim()).filter(Boolean).map(norm);
    const isArch = role.includes('arch');

    const cpChanged = changed.map(norm).filter((f) => inControlPlane(f));
    const implChanged = changed.map(norm).filter((f) => !inControlPlane(f));

    // B1：非架构角色不得改控制面文件
    if (!isArch && cpChanged.length > 0) {
      errors.push(`越权改动控制面文件: ${cpChanged.join(', ')}（角色=${role || '未声明'}）`);
    }
    // B2：实现文件必须在声明路径内
    if (implChanged.length > 0 && declared.length === 0) {
      errors.push('PR 未声明 gov:paths（分权硬约束开）');
    }
    for (const f of implChanged) {
      if (!declared.some((d) => f === d || f.startsWith(d.replace(/\/$/, '') + '/'))) {
        errors.push(`越权改动（不在声明路径内）: ${f}`);
      }
    }
    // B3：实施/验证角色的声明路径必须绑定 manifest 的 file_ownership
    if (!isArch) {
      const wp = (m.effective?.work_packages || []).find((w) => w.id === iwp);
      if (!wp) {
        if (iwp || implChanged.length > 0) errors.push(`PR 声明的 gov:iwp 未在 manifest 登记: ${iwp || '(空)'}`);
      } else {
        const owned = (wp.file_ownership || []).flatMap((o) => (o.paths || []).map(norm));
        for (const d of declared) {
          const ok = owned.some((p) => d === p || d.startsWith(p.replace(/\/$/, '') + '/') || p.startsWith(d.replace(/\/$/, '') + '/'));
          if (!ok) errors.push(`声明路径不在 IWP ${iwp} 的 file_ownership 内: ${d}`);
        }
      }
    }
  }
}

function overlap(a, b) {
  const A = a.replace(/\/+$/, ''), B = b.replace(/\/+$/, '');
  return A === B || A.startsWith(B + '/') || B.startsWith(A + '/');
}

// ---------- 输出 ----------
for (const w of warnings) console.log(w);
if (errors.length > 0) {
  for (const e of errors) console.error('✗ ' + e);
  console.error(`\n校验失败：${errors.length} 个问题。`);
  process.exit(1);
}
console.log('✓ 治理校验通过。');
