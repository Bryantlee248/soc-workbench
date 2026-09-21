# Scaffold · "保证做对"的起步模板

把本目录内容复制到新项目根，即得到一套**内建质量门**的骨架（目标：少走弯路）。

## 用法
```bash
cp -r scaffold/* <new-project>/
cp -r scaffold/.github <new-project>/
cd <new-project>
# 1) 填 docs/adr/0001（形态+技术栈）与 AGENTS.md（定位）
# 2) 填 specs/spec.md（用户旅程）与 specs/plan.md（技术方案，第 3 步填）
# 3) 填 DESIGN.md（有 UI 才需要，但强烈建议）
# 4) 把 e2e/J1.sh、e2e/integration.sh 替成真实 E2E
# 5) 开发；每次交付前：
node tools/converge.mjs     # 必须 CONVERGED(gaps=0)，否则算未完成
node tools/verify.mjs       # 独立复核(只读产物，堵"自我美化")
```

## 它保证什么
| 文件 | 挡住的坑 |
|---|---|
| `AGENTS.md` | 行为类失败（假设/完成驱动/撒谎式通过/不提交…） |
| `docs/adr/0001` | 技术栈随意改、无决策留档 |
| `specs/spec.md` | 没有用户旅程与验收 → "不确定能不能用" |
| `DESIGN.md` | UI 裸写 → "千篇一律的丑" |
| `specs/plan.md` | 架构/接口漂移、多 agent 撞车 |
| `specs/tasks.md` | 水平切 → "后端做完前端欠账" |
| `tools/converge.mjs` | 缺收敛 → 功能堆山、从不回补 |
| `.github/workflows/ci.yml` | 让"未收敛"直接**流水线红**，不靠自觉 |
| `tools/verify.mjs` | agent 自我美化（完成由产物判定，不看自述） |
| `docs/failure-modes.md` | 无知类失败（不知道有这坑） |

## 三条硬纪律（缺一不可）
1. **规格先行**：无 spec/DESIGN 不写码。
2. **垂直切片**：每条旅程后端+前端+测试一起交付，随时可演示。
3. **converge 收口**：`tools/converge.mjs` 不过，不许说"完成"。

_模板 v0.1；配套见 ../05-ai-failure-modes.md 与 ../06-systemic-assurance.md。_
