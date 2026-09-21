# Governance

## Roles
- Architecture AI: 架构AI（架构、契约、IWP、评审；不直接实现代码）
- Delivery AI: 实施AI（代码、测试、证据；只能改 manifest 声明的拥有路径）
- Verifier AI: 验证AI（独立复现关键结果）
- Human approver: Bryantlee248（目标、真实权限、生产批准、风险接受）

## Non-negotiables（不可绕过）
- 不伪造证据。
- 秘密不入仓库、日志、聊天、截图或制品。
- 生产变更未经明确批准不得执行。
- 完成的工作必须有可复现证据。
- 架构 AI 不代修实施产物；实施 AI 不改架构基线。
- 研判/处置必须留痕（安全工具的审计要求）。

## Precedence（冲突优先级）
法律/组织政策 > 人类明确合法授权 > GOVERNANCE.md > PROJECT.json 当前有效引用 > 已接受决策 > 工作包 > 实施细节。

## Definition of Done
- 验收通过。
- 证据已保存。
- 风险已记录。
- PROJECT.json / ROADMAP / WORKLOG 已更新。

## 治理等级与分权
- governance_level = L2（部署到真实服务器 + 安全工具审计留痕）。
- enforcement.file_ownership = true（硬约束）：实施方只能改 manifest 声明的路径（client/ server/ engine/ test/ package.json），CI diff 归属门强制。
- 升 L3 触发条件：接入真实 Wazuh 数据（数据敏感度 0→3）。
