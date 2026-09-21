# 独立验证 · W-001

## 验证范围
- 对象：IWP-001（告警研判垂直切片），PR #1（merge 58391c6）
- 方式：独立 clone + 独立执行（验证AI，verify@local）

## 独立复现
- node --test：5 pass / 0 fail
- GET /healthz → 200 {"status":"ok"}
- POST /alerts → 201（fingerprint 去重生效）
- GET /alerts → 200（列表，去重后计数正确）
- 研判/处置/事件链路：api.test.mjs 覆盖

## Findings
- F-001（P3）：client/renderer.js 硬编码 API 地址（与 AR-001 一致，进 backlog）
- 无 P0/P1/P2

## 结论
VERIFIED（独立复现通过，无阻断问题）
