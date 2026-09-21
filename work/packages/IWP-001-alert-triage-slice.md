# 实施工作包（IWP）· IWP-001

## 目标与价值
交付「告警 → 聚合 → 研判 → 处置 → 事件」最小垂直切片：一条从合成告警注入到事件沉淀的端到端链路，验证 C/S 架构与契约。

## 范围与非目标
- 范围：POST /alerts 注入；GET /alerts 列表（规则引擎去重）；POST /alerts/{id}/triage 研判；POST /alerts/{id}/disposition 处置；POST /events 生成事件；Electron 客户端（告警列表 + 研判/处置操作）。
- 非目标：真实 Wazuh 接入、报表、多用户权限、SOAR 自动响应、移动端。

## 架构与契约
- client/（Electron 桌面：列表 + 研判 + 处置）
- server/（Node 零依赖 http：API + 事件库 + JSON 存储）
- engine/（规则引擎：按 fingerprint 去重 + 简单关联）
- 契约单一事实源：contracts/openapi.yaml（实施据此实现，验收按此核对）

## 测试与验收
- 单测：node:test（engine 去重 + server API）
- 验收：validate-governance.mjs 绿 + 契约测试绿 + 端到端走查（注入→列表→研判→处置→事件）

## 依赖、批准与回滚
- 依赖：无（零依赖 Node；Electron 客户端 MVP 用最小壳）
- 批准点：人工授权 W-001 启动；架构评审 R2 批准
- 回滚：git revert；数据为合成，可重建

## 文件所有权（分权）
- Primary（实施AI）：client/、server/、engine/、test/、package.json
- Verifier（验证AI）：work/verifications/W-001/（独立复现，不改 Primary 路径）
- 架构AI：控制面（PROJECT.json / GOVERNANCE / ROADMAP / DECISIONS / WORKLOG / scripts / contracts / work/packages / docs / .github）
