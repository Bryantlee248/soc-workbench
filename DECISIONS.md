# Decisions

| ID | 状态 | 决定 | 理由 | 替代 |
|---|---|---|---|---|
| D-001 | ACCEPTED | 重档 L2 开发，走 ai-delivery-lifecycle 统一流程（打分：数据1/环境2/影响1/协作1/合规2） | 部署到真实服务器 + 安全工具审计留痕；合成数据暂不配 L3 | L3（接真实数据时升级） |
| D-002 | ACCEPTED | 技术栈：Electron（客户端）+ Node 零依赖 http（服务端）+ JSON 文件存储（MVP，生产换 SQLite）+ 原生规则引擎 | 零依赖、可复现、跨平台；MVP 优先验证流程 | Tauri / SQLite / 独立规则服务 |
| D-003 | ACCEPTED | 模块划分：client/（桌面）+ server/（API+事件库）+ engine/（去重/关联规则）；契约单一事实源 contracts/openapi.yaml | 分权边界清晰；契约先行防接口漂移 | 单体混杂 |
