# AGENTS.md · 项目宪法（AI 交付模板）

> 本文件是项目**最高行为标准**。任何 agent 或人开工前必读。红线见 §5。

## 0. 项目定位
（填写：一句话定位、目标用户、核心价值）

## 1. 效力层级（高 → 低）
1. 用户当前任务的明确指令
2. 本宪法
3. `specs/spec.md`（用户旅程 + 验收）
4. `DESIGN.md`（设计系统，根目录）
5. `docs/adr/`（架构决策：形态+技术栈）
6. `specs/plan.md` / `specs/tasks.md`
7. 其它文档 / 聊天

## 2. 完成定义（DoD）
一项工作**同时满足**才算完成：
- [ ] 有**可复现证据**（命令输出 / 录屏）；**未运行 = 未验证**
- [ ] 涉及 UI 的，有 DESIGN.md 依据且 lint 通过
- [ ] 对应**用户旅程 verify 通过**（`e2e/`）
- [ ] `tools/converge.mjs` 判定 **CONVERGED（gaps=0）**
- [ ] 已 commit **且 push**（未推送 = 未完成）

## 3. 文档分级（改任何文档先判类）
| 类别 | 例子 | 规则 |
|---|---|---|
| 状态 | tasks | 随进度变，只凭证据变 |
| 证据 | evidence/、gaps.md | **只增不改** |
| 冻结快照 | 验收基线 | 永不追改 |
| 活文档 | spec/DESIGN/宪法 | 可改但须登记 |

## 4. 规格锚（Spec Anchoring）
- `specs/spec.md`：**用户旅程**（每条带可执行 `verify`）+ 可测验收标准。
- `DESIGN.md`（根目录）：**视觉系统**（Google DESIGN.md 格式，tokens + prose）。**有 UI 就必须有它**。
- `specs/plan.md`：**技术方案（轻量）**——架构 / 核心数据模型 / 接口契约 / 前端组件 / 共享约定。
- `specs/tasks.md`：按**垂直切片**（一条旅程端到端）拆；每任务带 `verify`。
- 变更策略：默认 **Living Spec**（小/中改就地改+登记）；大改（方向变）→ **Flow-Forward**（同仓另起一版）。

## 5. 红线（AI 失败模式 · 禁止）
**行为**：①只假设不观察 ②把提问当指令 ③完成驱动 ④跳过依赖 ⑤不提交 ⑥恐慌回滚 ⑦撒谎式通过
**代码**：⑧catch-all 吞错 ⑨硬编码成功/幻觉 API ⑩过早抽象 ⑪测试虚胖 ⑫文档与代码漂移
**流程**：⑬一次性大段生成 ⑭跳过 converge ⑮UI 无 DESIGN ⑯只做接口验证 ⑰密钥落库 ⑱水平切
> 每条详解见 `docs/failure-modes.md`（**仅在需要理解"为什么"时读，不常读**）。

## 6. 强制流程
- **实现前**：spec / DESIGN / tasks 就绪；无 spec 不写码。
- **实现中**：小步、每步验证、小步 commit。
- **实现后**：跑 `node tools/converge.mjs`（不含 = 未完成）；跑 guard 第二遍。
- **合并前**：CI 全绿（converge + verify + 测试）。

## 7. 会话接续（省 token 纪律）
切换会话时，新 agent 恢复上下文**只读**：
1. 本 AGENTS.md（宪法）
2. `specs/tasks.md`（进度：已勾=完成，未勾=待办）
3. `git log --oneline -20`（最近的提交 = 最近的状态）

按需再读 spec / DESIGN / plan（进入对应步骤时）；**不要一次读全部文件**。
`evidence/` **只在交接（第 5 步④）或审计时读**，平时不重读。

## 8. 人的角色
**verify（不只是 steer）**：每阶段 reflect & refine；守卫、验收、密钥、UAT 由人负责。

_变更记录：模板 v1.1（token 优化 + 会话接续纪律）_
