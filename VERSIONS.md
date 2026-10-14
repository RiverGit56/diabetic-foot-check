# 版本记录 (Version History)

本文件记录项目的里程碑版本。每个版本对应一个 git tag，可通过 `git checkout <tag>` 回到该状态。

> **命名说明**：`版本1` / `版本2` / `版本3` 是**用户命名的预览快照**（tag `v1-preview` / `v2-preview` / `v3-preview`）；下面的 `版本 2.x` / `版本 3.x` 是**内部开发编号**，两条编号线互相独立。

> **目标人群（项目统一定义）**：**60 岁及以上、已确诊 1 型或 2 型糖尿病的成年人**。年龄分段 60–69 / 70–79 / 80–89 / 大于 89。不覆盖：60 岁以下、未确诊糖尿病、妊娠糖尿病、糖尿病前期。评估与分诊逻辑**不按糖尿病类型区分**（IWGDF 2023 / NICE NG19 对两型分层一致）。

---

---

## 版本 3.17（内部编号）— `v3.17-docs-and-license`

**日期：** 2026-10-14
**状态：** 开发版
**Git tag：** `v3.17-docs-and-license`

### 一句话描述
**补齐竞赛交付物**：系统架构图与信任边界图（Mermaid + SVG/PNG）、关键设计取舍说明、根 README、LICENSE；并再次确认全仓无敏感信息。

### 主要变化
| 领域 | 变化 |
|------|------|
| **架构图** | `docs/system-architecture.{mmd,svg,png,md}` — 前端 Web / i18n 模块 / 确定性分诊引擎 / 本地存储 / 只读医学规则库；CloudBase 云函数与数据库以**虚线**标注「生产阶段设计，当前未启用」 |
| **信任边界图** | `docs/trust-boundary.{mmd,svg,png,md}` — 4 个信任区 + 边界 B1–B5，每条边界标注安全措施 |
| **设计取舍** | `docs/中文说明/design-tradeoffs-zh.md` — 确定性规则 vs 大模型盲判、5 语言与不做 AI 图像诊断、隐私与 PDPA、为何演示版不上传服务器、8 条已知局限 |
| **README** | 根 `README.md` — 简介、在线 Demo 网址、本地运行、5 语言与 AI 翻译说明、合成数据与测试说明（回归测试，非临床验证）、边界声明、测试指引 |
| **LICENSE** | MIT + 医学/临床用途附加声明（非医疗器械、不做用药建议） |
| **密钥复查** | 无 `.env`；密钥模式扫描零命中；`.gitignore` 增补 `.workbuddy/`、`.wbapp_*.genie` |
| **工具** | 打通 mermaid-cli + 系统 Chrome 出图通道（`PUPPETEER_SKIP_DOWNLOAD=true` + 指定 executablePath） |

---

## 版本 3.16（内部编号）— `v3.16-static-export`

**日期：** 2026-10-14
**状态：** 开发版
**Git tag：** `v3.16-static-export`

### 一句话描述
**改为静态导出并公网部署**：删除 4 个服务端 API route，数据访问下沉到客户端，构建产物 `web/out/` 部署上线；密钥审计零命中。

### 主要变化
| 领域 | 变化 |
|------|------|
| **静态导出** | `next.config.mjs` 加 `output: "export"` + `trailingSlash: true`；`next build` 产出 9 条静态路由 → `web/out/` |
| **删除服务端路由** | 移除 `src/app/api/{environment,health-stats,care-facilities,risk-profile}/route.ts`（均不含密钥，仅包裹内置数据 / 公开 data.gov.sg） |
| **客户端数据访问** | `app/page.tsx` + `app/data/page.tsx` 直接调用 `dataSources.ts`，失败自动兜底 |
| **部署** | `workbuddy_sites_deploy`（static，`web/out`）→ `https://b67d3face37d47fd8db26026af6e1931.sg.agentos-app.run`；CloudBase 未使用 |
| **安全** | `cloudDb.ts` 的 SDK 动态 import 加 `webpackIgnore`；产物无同源 `/api/*` 依赖；唯一外部主机 data.gov.sg |

---

## 版本 3.15（内部编号）— `v3.15-i18n-cloud`

**日期：** 2026-10-14
**状态：** 开发版
**Git tag：** `v3.15-i18n-cloud`

### 一句话描述
**补全全部 5 种语言翻译**（ms/ta/fil 从英文译完、与 en.json key 完全对齐），并**敲定云端隔离模型为「公共演示表（无登录）」**；云端激活只尝试一次，结果未接通，应用继续走本地 localStorage。

### 用户指令
- Request B：完成 ms/ta/fil 翻译，key 与 en 对齐，写脚本查缺失，运行时缺失回退英文，分级/阈值/红旗/血糖单位逻辑与语言无关不得改动，新增「同组输入 5 语言分级一致」测试。
- Request D：隔离模型定为公共演示表（无登录，仅合成数据）；写入做字段白名单 + 长度限制；cloudDb 仅云端可用才写、失败自动落 localStorage、绝不阻塞；云端激活只试一次，失败则保持 `cloudEnabled=false` 不改现有代码；分别验证「云开启」「云不可用/断网」主流程正常。

### 主要变化
| 领域 | 变化 |
|------|------|
| **多语言补全** | `web/public/locales/ms.json` / `ta.json` / `fil.json` 从 en 全量翻译；与 `en.json` key 树逐字对齐 |
| **缺失 key 检查脚本** | 新增 `web/scripts/i18n-missing-keys.ts` + `npm run test:i18n-keys`：以 en 为基准，逐 locale 比对叶子/对象 key，缺漏与孤儿键双查；退出码 1 可卡 CI。实测 4 个目标 locale 均 0 缺失 / 0 孤儿 |
| **跨语言分级一致性测试** | 新增 `web/scripts/i18n-crosslang-test.ts` + `npm run test:crosslang`：**静态守卫**（triageEngine / assessment / clinicalRules 无代码级 i18n 依赖——注释里的「i18n key」字样不算）+ **运行守卫**（固定输入在 5 种语言下 care tier 与 risk level 完全一致，覆盖 SELF_CARE/PRIMARY_CARE/EMERGENCY/ABSTAIN + 500 次确定性）；证明分级逻辑与语言无关 |
| **i18n 覆盖测试扩到 5 语言** | `web/scripts/i18n-coverage-test.ts` 的 `LOCALES` 从 `["en","zh-CN"]` 扩到全部 5 种 |
| **云端隔离模型（公共演示表）** | `cloud/schema.sql` 重写：删除 `owner_id`；RLS 改为 `anon, authenticated` 可读写（`USING(true) WITH CHECK(true)`）；索引保留。无登录、无个人账号，靠 `cloudDb.ts` 的字段白名单 + 长度限制保证只写合成字段 |
| **cloudDb.ts 加固** | 写入强制**字段白名单 + 长度限制**（合成列白名单；字符串截断、JSONB 字节上限）；SDK 改为**懒加载**（`await import`，模块无 SDK 也能跑单测）；全部 best-effort、绝不抛错；云端写入失败时把记录**镜像到独立 localStorage**（不碰应用历史 key）；新增测试注入口 `__setTestClientFactory` |
| **文档** | `docs/中文说明/cloudbase-integration.md` 重写 §0 需求规格（公共演示表模型）、§4 建表（默认即公共演示表）、§7 接入（决策：公共演示表、当前未接入）、§8 PDPA 清单 |
| **tsconfig** | 新增 `allowImportingTsExtensions: true`（让 cloudDb.ts 的 `.ts` 运行时导入在 Node strip-types 下可解析；配合 `noEmit` + `moduleResolution: bundler` 安全） |
| **package.json** | 新增 `test:i18n-keys` / `test:crosslang` / `test:cloud` 三个脚本 |

### 云端激活（只一次）
- `workbuddy_cloud_service` `activate`（applicationMode create，appName 糖尿病足筛查，domainPrefix diabetic-foot-check）→ 结果 **`cancelled` + `useLocalImplementation: true`**（`activated:false`）。
- **结论：云端未接通**。`cloudEnabled` 保持 false，`publicConfig` 为空，**未改动任何现有应用/功能代码**（assessment / triageEngine / 组件 / i18n 运行时不在此列）。
- 工具明确「继续本地实现」——应用本就用 localStorage，与该指令一致。

### 验证
- `tsc --noEmit` **零错误**
- 全量单测全绿：`test:i18n` **161**（已扩到 5 语言）· `test:i18n-keys` **0 缺失** · `test:crosslang` **34** · `test:cloud` **19** · `test:triage` 45 · `test:assess` 35 · `test:profile` 14 · `test:firstrun` 11 · `test:interval` 38 · `test:reassess` 30
- `web/scripts/cloud-fallback-test.ts`（`npm run test:cloud`，19 项）证明：**云关闭** → 无操作、不抛错、应用 localStorage 不受影响；**云开启成功** → 写入成功且白名单/长度生效；**云开启失败** → 捕获且落本地镜像；两种主流程（云开/云断网）均正常

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v3.14-remove-recheck
```

---

## 版本 3（用户命名预览快照）— `v3-preview`

**日期：** 2026-10-13
**状态：** 用户命名预览版（对应内部编号 v3.12，commit `554bb71`）
**Git tag：** `v3-preview`

### 一句话描述
**用户在 v3.12 工作基础上命名的预览快照**：评估题目全部改为「是/否」二态（移除「不确定」选项，结果更精确），首页「基于医学证据」区块描述校准，检查页介绍文案改为 6 个临床类别。

### 主要变化（相对 v3.11）
| 领域 | 变化 |
|------|------|
| **评估题目二态化** | 红旗题（rf1–rf5）、神经病变（n1、n3）、一般健康（g1）移除「不确定 / Not sure」选项，仅保留「是/否」 |
| **分诊引擎** | 红旗现仅二态（是/否）；`undefined` 仅表示「未作答」（UI 每题必答后才会进入下一题），作为编程接口安全网保留；AB-02 仍在 ≥2 项未作答且无明确局部伤口时触发 ABSTAIN |
| **首页证据区块** | `home.source4`（Synthea）标注「计划中」，`home.source5`（data.gov.sg）描述改为实际用途（实时天气/空气质量 + 新加坡卫生统计背景） |
| **检查页介绍** | `assess.introDesc`「5 个临床类别」→「6 个临床类别」（红旗筛查、神经病变、皮肤与指甲、伤口状况、血液循环、病史） |
| **多语言** | en/zh-CN/ms/ta/fil 的对应文案同步更新 |
| **测试** | 单测 214 项全通过（interval 38 · i18n 71 · assess 35 · triage 45 · firstrun 11 · profile 14） |

### 回归守卫（继承 v3.11）
- 所有 13 条分诊规则来源均为可查证指南（IWGDF 2023 / NICE NG19 / IWGDF/IDSA 2023 / SIRS 1992 / Sepsis-3 / Safety），无 ACE 2024、无 MIMIC-III 规则来源
- 三态逻辑仅作为「未作答」安全网，正常 UI 流程不出现

---

## 版本 3.13（内部编号）— `v3.13-dynamic-recheck`

**日期：** 2026-10-13
**状态：** 开发版（基于 `v3-preview` / v3.12 之上新增）
**Git tag：** `v3.13-dynamic-recheck`

### 一句话描述
新增**动态重新评估（Dynamic Re-assessment）闭环**：结果页展示「建议就医等级 + 临床依据（带来源）+ 护理指引 + 复查提醒」；新增 `/recheck` 复查页，用户输入状态更新后由**确定性分诊引擎比较前后两次状态**，触发**升级（Escalation）**展示层级变化与原因。

### 用户约束（已遵守）
- **题库（QUESTION_BANK）与评估标准完全未改动**——本次只新增「复查」能力，不动既有 24 题 / 7 类题目与选项。
- **ACE 2024 引用未恢复**——IWGDF/IDSA 2023 + NICE NG19 已在前序版本核实为真、可公开下载，故沿用；所有规则来源仍为可查证指南（回归守卫见下）。

### 主要变化
| 领域 | 变化 |
|------|------|
| **分诊引擎（复查逻辑）** | `triageEngine.ts` 新增 `TIER_SEVERITY_RANK`（EMERGENCY 0 / PRIMARY_CARE 1 / SELF_CARE 2 / ABSTAIN 3）、`ACTIONABLE_TIERS`、`isEscalated(prev,next)`、`ReassessmentResult` 接口、`evaluateReassessment(prevAnswers,newAnswers)`（对两次输入各跑一次确定性 `evaluateTriage` 再比较）；**不新增任何临床规则** |
| **临床规则（复查时间）** | `clinicalRules.ts` 新增 `RECHECK_OFFSET_DAYS`（`EMERGENCY:0` · `PRIMARY_CARE:2` · `SELF_CARE:2` · `ABSTAIN:14`）与 `recheckDateForTier(tier)`（EMERGENCY 返回 `null` = 立即） |
| **结果页** | `recommendations/page.tsx`：新增**按层级配色**的确定性就医等级横幅（用 `latest.triageTier`）、「下次常规筛查」日期（`nextScreeningDate(latest.timestamp, iwgdfCategory)`）、「临床依据」区块（列出 `TRIAGE_SOURCES` 可查证来源）、动态复查 CTA `<Link href="/recheck">`；补 `import Link from "next/link"` |
| **检查页** | `assess/page.tsx`：结果区新增**复查提醒**（下次筛查日期 + `assess.recheckReminder` / `assess.recheckReminderNote`）、复查 CTA（在「查看建议」与「重新评估」之间） |
| **新页面 `/recheck`** | `web/src/app/recheck/page.tsx`（client 组件）：载入最近一次评估历史预填 rf1–rf5 / w1（单选）/ sk1（多选）；用户输入关键状态更新 + 可选备注 → 调 `evaluateReassessment()` → 展示**升级横幅**（prev→new 箭头 + 原因）、**稳定横幅**、**ABSTAIN 横幅**、`TriageCard`（新决策）、原因列表、用户备注、复查提醒日期；「重新填写」「查看护理建议」按钮；无历史时引导去 `/assess`。复用 `TIER_BADGE` 配色（镜像 TriageCard 样式） |
| **底部导航** | `BottomNav.tsx` 在「个人资料」前新增 `/recheck` 项（key `recheck`，图标为刷新/循环 path，aria `aria.recheck`） |
| **多语言（5 语言固定文案）** | `en.json` / `zh-CN.json` 新增：`recommendations.{careTierLabel,nextScreeningLabel,clinicalBasis,recheckCta}`、`assess.{recheckReminder,recheckReminderNote,recheckCta}`、`nav.recheck`、`aria.recheck`、整块 `recheck.*`（标题 / 副标题 / 无评估引导 / 升级标题 / 升级原因 / 稳定 / 弃权 / 原因 / 备注 / 复查提醒 / 重新填写 / 查看护理 / 立即 等）。**en + zh-CN 全翻译**；ms/ta/fil 沿用 `fallbackLng:"en"`（与项目既有模式一致，覆盖测试仅校验 en + zh-CN） |
| **评估持久化** | `assessment.ts`：`AssessmentHistoryEntry` 新增可选 `answers?: Record<string,string>`；`saveAssessmentResult()` 写入 `result.answers`（向后兼容，旧记录无 answers） |
| **测试** | 新增 `web/scripts/reassessment-test.ts` + `npm run test:reassess`（**30 项**：层级排序 / isEscalated 全部正反面 / evaluateReassessment 5 场景 / 确定性 / 复查日期偏移 / ABSTAIN 不计为升级）；`package.json` 新增脚本 |

### 升级（Escalation）语义
- 仅比较三个**可行动**层级（EMERGENCY / PRIMARY_CARE / SELF_CARE）：`next` 比 `prev` **更紧急**才算升级。
- `SELF_CARE → PRIMARY_CARE`、`PRIMARY_CARE → EMERGENCY`、`SELF_CARE → EMERGENCY` 升级；反向（好转）**不是**升级；任何 → ABSTAIN **不是**升级（属「无法判定安全」单独展示）。

### 质量
- `tsc --noEmit` **零错误**
- 全量单测：triage **45** · assess **35** · i18n **71** · firstrun **11** · interval **38** · profile **14** · reassess **30** = **244 全通过**（较 v3-preview 的 214 项 +30）

### 本地测试动态升级流程
```bash
cd web
NODE_OPTIONS="" node node_modules/next/dist/bin/next dev -p 3000
# 1. 打开 http://localhost:3000/?reset=1  → 走完资料门禁 + 一次评估（或点「重新评估」）
# 2. 首页 / 建议页出现「复查提醒」与「动态复查」按钮 → 进入 /recheck
# 3. 将 rf1（发热）改为「是」→ 提交后应显示 ⚠️ 升级横幅：SELF_CARE → EMERGENCY
# 4. 切换语言（右上角）验证结果页 / 复查页 5 语言固定文案无原始 key 泄露
# 5. 将全部红旗保持「否」、仅把 w1（伤口）改为「活动伤口」→ 应升级 PRIMARY_CARE
```
> 注：开发模式 Fast Refresh 改动 locale JSON 无需硬刷新（`i18n.ts` 已在 v2.8 修复）。

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v3-preview
```

---

## 版本 3.14（内部编号）— `v3.14-remove-recheck`

**日期：** 2026-10-14
**状态：** 开发版
**Git tag：** `v3.14-remove-recheck`

### 一句话描述
按用户要求**删除独立的 `/recheck` 复查页**，把「与上一次记录的对比」功能**移入追踪页（`/followup`）**，并**保留全部历史检测记录**。

### 用户指令
> 复查这个页面删掉。跟上一次记录的对比要在追踪里查看，同时追踪可以保留之前的检测记录。

### 主要变化
| 领域 | 变化 |
|------|------|
| **删除 `/recheck`** | `web/src/app/recheck/page.tsx` 整页删除；`BottomNav.tsx` 移除 `/recheck` 导航项（刷新图标 + `aria.recheck`） |
| **结果页 CTA 改指 `/followup`** | `recommendations/page.tsx` + `assess/page.tsx` 的「动态复查」按钮 `<Link href="/recheck">` → `<Link href="/followup">`；标签改为「查看追踪记录 / View tracking records」（`assess.recheckCta`、`recommendations.recheckCta`） |
| **追踪页新增升级对比卡** | `followup/page.tsx` 复用既有 `isEscalated(prevTier,newTier)`（`triageEngine.ts`）计算前后两次层级：**升级** → ⚠️ 红色横幅（上次 → 本次 层级 + 箭头 + 原因）；**稳定/好转** → 绿色横幅；**无历史** → 「再完成一次检查，即可与上次结果进行对比」引导卡。**完整评估历史列表保留** |
| **多语言** | `en.json` / `zh-CN.json`：重标 `assess.recheckCta` / `recommendations.recheckCta`；新增 `followup.escalationTitle|prevLabel|nowLabel|escalated|stable|noPrevious`（en + zh-CN 全翻译；ms/ta/fil 回退英文） |
| **保留** | v3.13 的 `evaluateReassessment()` / `RECHECK_OFFSET_DAYS` / `recheckDateForTier()` 仍在 `triageEngine.ts` / `clinicalRules.ts`（追踪页对比与复查提醒仍用） |

### 质量
- `tsc --noEmit` **零错误**
- 全量单测：**244 全通过**（triage 45 · assess 35 · i18n 71 · firstrun 11 · interval 38 · profile 14 · reassess 30）

### CloudBase 集成包（同会话编写，本 tag 不含后端激活）
- 新增 `web/src/lib/cloudConfig.ts`（仅公共配置 + `cloudEnabled` 标志，**无密钥**）、`web/src/lib/cloudDb.ts`（托管 SDK 的 `assessments` / `reassessments` CRUD，best-effort，无客户端时返回 null）、`cloud/schema.sql`（DDL + RLS `owner_id = auth.uid()`）、`docs/中文说明/cloudbase-integration.md`（优化后的 prompt + 绑定步骤 + SDK 片段）。
- **环境开通被阻塞**：`workbuddy_cloud_service` 返回 `cloud_service_unavailable`（后端预热池空）；`cloudEnabled` 为 false，应用仍走 localStorage，全部 244 测试通过。
- `cloudDb.ts` **尚未**接入 `assessment.ts`（取决于「按用户登录隔离」还是「公共演示表」的隔离模型决策，暂缓）。

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v3.13-dynamic-recheck
```

---

## 版本 3.11（内部编号）— `v3.11-source-reattribution`

**日期：** 2026-10-13
**状态：** 开发版
**Git tag：** `v3.11-source-reattribution`

### 一句话描述
**全部 11 条 ACE 归因规则改标完成**——逐一找到可公开下载的 IWGDF 2023 / NICE NG19 指南原文作为替代来源；源码、界面、测试、文档全部同步更新。

### 主要变化
| 领域 | 变化 |
|------|------|
| **临床规则改标** | `clinicalRules.ts`：18 条规则全部改标为 **IWGDF 2023 / NICE NG19**，每条新增 `sourceRef` 字段（逐条可查）；`getApplicableRules()` 修复 `ADA-SC01/02` → `IWGDF-SC01/02` 的残留 ID |
| **分诊引擎改标** | `triageEngine.ts`：RF-02 → IWGDF/IDSA 2023；RF-03 → NICE NG19；RF-01 → SIRS 1992；RF-04 → IWGDF/IDSA 2023；RF-05 → Sepsis-3；SC-01 → IWGDF 2023；移除不可查证的 `"ACE 2024"` 来源值 |
| **界面徽标** | `recommendations/page.tsx` `sourceBadge()` 改为 **IWGDF（紫）/ NICE（蓝）**；弃用 ACE/ADA 徽标 |
| **多语言文案** | 5 个 locale 的 `rules.source.*`、`iwgdf.rulesDisclaimer`、`assess.introDesc`、`recommendations.learnMoreText`、`home.source1/source1Desc` 全部移除 ACE/ADA 引用，改标 NICE NG19 |
| **代码注释** | `dataSources.ts`、`data/page.tsx`、`assessment.ts`、`generate-bank-doc.mjs` 中的 ACE/ADA 注释全部替换为 IWGDF/NICE |
| **文档** | `docs/中文说明/assessment-criteria-source-mapping-zh.md`、`docs/中文说明/data-sources-and-grading-zh.md` 的引用表、§7 诚实披露、§10 引用清单全部同步；原「未能核实的引用」改为「已解决」 |
| **回归守卫** | `triage-test.ts` 新增 7 条 re-attribution guard（来源白名单、无 ACE、无 MIMIC-III 规则来源、TRIAGE_SOURCES 含 NICE 等）；`i18n-coverage-test.ts` 新增「来源恰好 IWGDF+NICE」「无 ACE/ADA 规则 ID」「每条规则有 sourceRef」 |

### 质量
- `tsc --noEmit` **零错误**
- 单元测试 **208 项全通过**（interval 38 · i18n 71 · assess 35 · triage 46 · firstrun 11 · profile 14）
- 浏览器回归 **59 项全通过**（`recommendations-evidence-test.mjs` 28 项 + `home-followup-layout-test.mjs` 31 项），**0 控制台错误**

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v3.10-consistency-fixes
```

---

## 版本 3.10（内部编号）— `v3.10-consistency-fixes`

**日期：** 2026-10-13
**状态：** 开发版
**Git tag：** `v3.10-consistency-fixes`

### 一句话描述
修掉 v3.9 审计发现的 **7 项代码不一致**，并把**临床知识层接入界面** —— 建议页新增「IWGDF 风险等级」与「临床决策规则（带来源徽标）」两张卡片。

### 主要变化
| 领域 | 变化 |
|------|------|
| **① SIRS 注释** | `triageEngine.ts` 改为「本工具仅采集 **4 项 SIRS 中的 1 项**（体温 rf1）；rf5 意识改变属 **qSOFA / Sepsis-3**」 |
| **② 弃权论证** | `UNKNOWN_ABSTAIN_THRESHOLD` 改述为**我方安全保守标定**，SIRS「≥2 项」降为**支持性**证据；`TRIAGE_METADATA.abstainThreshold` 注释同步 |
| **③ 筛查区间** | `IWGDF_CATEGORIES[].screeningFrequency` + `CLINICAL_RULES` 动作描述统一为 **12 / 6–12 / 3–6 / 1–3 个月**，与 `IWGDF_SCREENING_INTERVAL_MONTHS`（12/6/3/1）一致 |
| **④ IWGDF 映射** | `mapToIWGDFCategory()` 改为**忠实组合规则**：LOPS / PAD / 畸形三项占其二 → 2 级；恰好一项 → 1 级；单独畸形 → 0 级（修复「单纯 PAD 被判 0 级」） |
| **⑤ historyUlcer** | `w1b`（已愈合溃疡）现赋 `historyUlcer` 标志 → 分支可达；既往溃疡者由「低风险」修正为「高风险」（**安全性修正**） |
| **⑥ 规则来源** | PC-02 由 `"Kaggle"` 改标 **IWGDF 2023**；`TriageRule.source` 联合类型移除 Kaggle；`TRIAGE_SOURCES` 补入 Sepsis-3、移除 Kaggle |
| **⑦ 接入界面** | 建议页新增 **IWGDF 风险等级卡片** + **临床决策规则卡片**（18 条规则，带 ACE 2024 / IWGDF 2023 / ADA 2024 来源徽标）；`getApplicableRules()` 已接入 |
| **删除死代码** | `getFullRiskAssessment()`（无调用方）与 `RISK_ACTION_MATRIX`（与分诊引擎时间窗重复且冲突） |
| **i18n** | 新增 `rules.*`（18 条 + 3 个来源徽标）与 `iwgdf.catDesc0–3` / `catFreq0–3`，en + zh-CN；`iwgdf.cat1/cat2` 更正为忠实 IWGDF 表述 |
| **测试** | `screening-interval-test.ts` 改为断言「**数值必须落在文字区间内**」，新增单纯 PAD / 单独畸形用例；`i18n-coverage-test.ts` 新增 18 条规则 × en/zh-CN 的 key 覆盖与孤儿 key 检查 |

### 质量
- `tsc --noEmit` **零错误**
- 单元测试 **205 项全通过**（interval 38 · i18n 68 · assess 35 · triage 39 · firstrun 11 · profile 14）
- 浏览器回归 **59 项全通过**（新增 `recommendations-evidence-test.mjs` 28 项 + 原 `home-followup-layout-test.mjs` 31 项），**0 控制台错误**

### 仍待处理
- ✅ **ACE 2024 引用未核实** → **已在 v3.11 解决**：全部 11 条 ACE 归因规则改标为 IWGDF 2023 / NICE NG19，源码与文档均已同步。

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v3.9-criteria-mapping
```

---

## 版本 3.9（内部编号）— `v3.9-criteria-mapping`

**日期：** 2026-10-13
**状态：** 开发版（文档，无代码改动）
**Git tag：** `v3.9-criteria-mapping`

### 一句话描述
新增**比赛讲解用**的《评估结果 ↔ 医学标准 对照表》，把「代码怎么判」与「依据哪条医学标准」逐条对齐，并诚实区分「指南来源」与「我方标定」。

### 主要变化
| 领域 | 变化 |
|------|------|
| **新文档** | `docs/中文说明/assessment-criteria-source-mapping-zh.md`（10 节）：30 秒讲解路径 / 5 类结果 / 13 条就医层级规则逐条对照 / 风险等级 / 9 个紧急标志 / IWGDF 分级 / 弃权依据 / 诚实披露 / **7 项待处理不一致** / 评委提问速答 / 引用清单 |
| **交叉引用** | `docs/中文说明/data-sources-and-grading-zh.md` 头部加入配套文件指引 |

### 核查结论
- ✅ **已核对一致**：SIRS 4 项阈值与「≥2」（Bone 1992, *Chest* 101:1644-55）；IWGDF 2023 风险分级定义与筛查区间（12 / 6–12 / 3–6 / 1–3 个月）；IWGDF/IDSA 2023 感染 4 级（重度 = 局部感染 + SIRS）；ABI < 0.9；10 g 单丝；HbA1c ≥ 64 mmol/mol；病程 > 10 年；伤口 > 14 天。
- ❌ **未能核实**：ACE 2024「糖尿病足临床指导」—— ACE 官网临床指导库中未见该专题。已在文档中标注为「需核实」，并给出替代引用方案。
- ⚠️ **新发现 7 项代码不一致**（未修改，仅记录）：其中最严重两项为 —— ① `triageEngine.ts` 注释称「采集 4 项 SIRS 中的 2 项」，但**意识改变不是 SIRS 项**（属 qSOFA/Sepsis-3），实际只采到 1 项；② **`historyUlcer` 标志从未被赋值**，导致「既往溃疡 → IWGDF 3 级」分支不可达，而 `w1b`（已愈合溃疡）不加任何标志。
- 另确认 `getApplicableRules` / `getFullRiskAssessment` / `CLINICAL_RULES` / `RISK_ACTION_MATRIX` **无调用方**，属库内未展示。

> **后续：** 以上 7 项不一致与「库内未展示」问题均已在 **版本 3.10（`v3.10-consistency-fixes`）** 修复。

### 质量
- 无代码改动，`tsc` 与全部测试不受影响（188 单测 + 31 浏览器）

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v3.8-checkin-consolidated
```

---

## 版本 3.8（内部编号）— `v3.8-checkin-consolidated`

**日期：** 2026-10-13
**状态：** 开发版
**Git tag：** `v3.8-checkin-consolidated`

### 一句话描述
按用户要求把**每日打卡合并到追踪页**：首页的「每日打卡」卡片删除，追踪页的「每日足部打卡」卡片吸收连续天数，原独立的「当前连续天数」卡片取消。

### 主要变化
| 领域 | 变化 |
|------|------|
| **首页** | 删除整块「每日打卡 / Daily Check-in」卡片（标题、说明、是的/还没有 按钮、内嵌连续天数）；`app/page.tsx` 一并删除 `checkinDone` / `streak` 状态、`useEffect` 里的打卡读取与连续天数计算、`handleCheckin` |
| **追踪页** | 「每日足部打卡」卡片内新增一条**连续天数条**（`bg-primary-50` 圆角行：左侧「当前连续天数」、右侧「N 天」或「从今天开始您的打卡记录吧！」）；原独立的「当前连续天数」卡片删除。卡片顺序变为：风险趋势 → 评估历史 → 每日足部打卡 |
| **打卡逻辑不变** | 仍写入 localStorage `footcheck-checkins`（含 `date` / `noticed` / `note`）；现在**只有追踪页**能写，首页不再重复一份 |
| **i18n** | 删除 5 个语言文件共 **25 个**已无引用的键：`home.dailyCheckinTitle` / `home.dailyCheckinDesc` / `home.streakLabel` / `home.yesIDid` / `home.notYet`。追踪页继续用 `followup.checkinTitle` / `checkinQuestion` / `checkinYes` / `checkinNo` / `changesLabel` / `streakLabel` / `streakDays` / `noStreak` / `checkinSaved` |
| **文档** | `docs/中文说明/data-sources-and-grading-zh.md` 2.7 的「每日足部自查」改指追踪页；`docs/中文说明/technical-approach-zh.md` 打卡说明补「位于追踪页」 |
| **测试** | `next-assessment-removed-test.mjs` 删除，改为 `home-followup-layout-test.mjs`（**31 项**）：断言两处「下次评估」与首页「每日打卡」均消失，并**结构化断言连续天数确实在追踪页的打卡卡片内部**（而非另一张卡片） |

### 质量
- `tsc --noEmit` 干净
- 全量单测：间隔 **31** + i18n **58** + 题库 **35** + 分诊 **39** + 首次使用 **11** + 资料 **14** = **188 全通过**
- 浏览器实测（`home-followup-layout-test.mjs`，**31/31**）：中英双语；连续天数 3 天时卡片显示「当前连续天数 3 天 / Current streak 3 days」且显示「打卡已保存」，0 天时显示「从今天开始您的打卡记录吧！」并保留备注框；0 控制台错误

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v3.7-remove-next-assessment
```

---

## 版本 3.7（内部编号）— `v3.7-remove-next-assessment`

**日期：** 2026-10-13
**状态：** 开发版
**Git tag：** `v3.7-remove-next-assessment`

### 一句话描述
按用户要求**移除两处「下次评估」界面区域**：首页的「下次评估时间」卡片，以及追踪页的「下次评估」卡片。

### 主要变化
| 领域 | 变化 |
|------|------|
| **首页** | 删除「Next Assessment Due / 下次评估时间」整块卡片（含「立即预约」按钮、分级说明行）；`app/page.tsx` 一并删除 `nextDateStr` / `nextInterval` 状态、计算用 `useEffect`、`activeWound` 常量与 `clinicalRules` 导入 |
| **追踪页** | 删除「Next Assessment / 下次评估」整块卡片（含「预约评估」按钮）；`app/followup/page.tsx` |
| **i18n** | 删除 5 个语言文件中已无引用的 **30 个键**：`home.nextCheckTitle` / `home.scheduleNow` / `home.nextCheckUrgent` / `home.nextCheckReason_one` / `home.nextCheckReason_other`、`followup.nextAssessmentTitle` / `followup.nextAssessmentDue` / `followup.scheduleNow` |
| **保留** | 临床规则层的分级算法**未删除**：`IWGDF_SCREENING_INTERVAL_MONTHS` / `screeningIntervalMonths()` / `nextScreeningDate()` 与单测 `npm run test:interval` 保留；`mapToIWGDFCategory()` 仍在 `buildExplanationContract()` 中使用 |
| **文档** | `docs/中文说明/data-sources-and-grading-zh.md` 2.6 / 2.7 标注「界面暂未展示」，保留算法说明 |
| **测试** | 删除浏览器脚本 `next-check-interval-test.mjs`（对象已移除），新增 `next-assessment-removed-test.mjs`（**20 项**，断言两处区域消失、相邻卡片仍在） |

### 质量
- `tsc --noEmit` 干净
- 全量单测：间隔 **31** + i18n **58** + 题库 **35** + 分诊 **39** + 首次使用 **11** + 资料 **14** = **188 全通过**
- 浏览器实测（`next-assessment-removed-test.mjs`，**20/20**）：首页 / 追踪页（中英双语）均无「下次评估」区域，且「上次评估」「每日打卡」「连续天数」等相邻卡片完好；0 控制台错误（该脚本已在 v3.8 由 `home-followup-layout-test.mjs` 取代）

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v3.6-screening-interval
```

---

## 版本 3.6（内部编号）— `v3.6-screening-interval`

**日期：** 2026-10-13
**状态：** 开发版
**Git tag：** `v3.6-screening-interval`

### 一句话描述
首页「下次评估时间」不再用**写死的 90 天**，改为按 **IWGDF 风险分级**计算（**0 级 12 个月 / 1 级 6 个月 / 2 级 3 个月 / 3 级 1 个月**，IWGDF 2023）；并修掉日期在中文界面显示英文格式的问题。

### 主要变化
| 领域 | 变化 |
|------|------|
| **复评间隔** | 新增 `clinicalRules.ts` → `IWGDF_SCREENING_INTERVAL_MONTHS`、`screeningIntervalMonths()`、`nextScreeningDate()`；取各指南区间的**保守端**（1 级 6 而非 12；2 级 3 而非 6） |
| **首页** | `app/page.tsx` 删除 `base + (latest ? 90 : 30) 天` 的写死算法，改按分级计算；日期卡片新增「每 N 个月复评一次 · IWGDF 风险 N 级」说明行 |
| **开放伤口保护** | 若最近一次评估带 `activeWound` / `chronicWound`，卡片**不显示日期**，改为「请立即就医」—— 开放伤口不是常规复评 |
| **`mapToIWGDFCategory`** | 签名收窄为 `{ emergencyFlags, categoryScores }`，可直接吃 `AssessmentHistoryEntry`（不必重跑整份评估） |
| **日期本地化** | 新增 `lib/languages.ts`（`dateLocale()`）；首页 / 建议页 / 随访页 5 处写死的 `toLocaleDateString("en-US")` 全部改为跟随界面语言（中文显示 `2027年10月3日`） |
| **清理** | 删除 5 个语言文件里废弃的 mock 键 `home.lastCheckDate` / `home.nextCheckDate`（`Oct 10, 2026` / `Jan 8, 2027`，已无任何引用） |
| **i18n** | 新增 `home.nextCheckReason_one/_other`（i18next 复数，修掉「1 months」）、`home.nextCheckUrgent` |
| **文档** | `docs/中文说明/data-sources-and-grading-zh.md` 新增 **2.7 复评间隔** 一节（含分级表与依据）；3.1 类别表按当前题库更正 |

### 质量
- `tsc --noEmit` 干净
- 单元测试新增 `npm run test:interval`（**31 项**）：间隔表、指南区间校验、自然月推算、分级映射、与 `RISK_ACTION_MATRIX` 一致性、日期本地化
- 全量单测：间隔 **31** + i18n **58** + 题库 **35** + 分诊 **39** + 首次使用 **11** + 资料 **14** = **188 全通过**
- 浏览器实测（`next-check-interval-test.mjs`，**13/13**）：低风险→12 个月、神经病变→6 个月、神经+循环→3 个月、截肢史→1 个月、开放伤口→「立即就医」、中文界面显示 `2027年10月3日`；0 控制台错误

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v3.6-screening-interval
```

---

## 版本 3.5（内部编号）— `v3.5-target-population`

**日期：** 2026-10-13
**状态：** 文档 / 定位更新（无代码改动）

### 一句话描述
统一并明确**目标人群定义**为「**60 岁及以上、已确诊 1 型或 2 型糖尿病**」，修正项目资料里残留的旧口径（40–75 岁 / 仅 2 型）。

### 改动
| 文件 | 改动 |
|------|------|
| `docs/中文说明/technical-approach-zh.md` | 目标用户 → 60+ / 1 型或 2 型；新增 **「0. 目标人群」** 定义节（含为什么聚焦 60+、为什么覆盖 1 型、公平性说明）；公平性测试年龄段 → 60–69/70–79/80–89/大于 89；「年龄段偏差」风险行改写 |
| `docs/docs English version/technical-approach-en.md` | 同上（新增 **0. Target Population** 节） |
| `docs/docs English version/tech-stack-recommendation.md` | users 集合 schema 注释：`ageRange` → 60+ 四段；`diabetesType` → `"type1" \| "type2"` |
| `docs/中文说明/question-bank-and-selection-logic-zh.md` | 自动生成；头部新增目标人群说明（`npm run doc:bank`） |
| `.workbuddy-ai/memory/MEMORY.md` | 项目概述同步为新定义 |

### 说明
App 代码**无需改动**：年龄分段早已是 60+，糖尿病类型早已同时提供 1 型 / 2 型，分诊引擎与评分逻辑从不按类型区分。

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v3.5-target-population
```

---

## 版本 3.4（内部编号）— `v3.4-symptom-bank`

**日期：** 2026-10-13
**状态：** 开发版
**Git tag：** `v3.4-symptom-bank`

### 一句话描述
题库**只保留「检测疾病症状」的题目**：移除全部 9 道「自我护理习惯」题（怎么剪趾甲／涂润肤霜／检查鞋内／是否赤脚等），换成 9 道**症状检测题**（神经 3 · 皮肤 3 · 循环 2 · 病史 1）。足部护理习惯改由「个人资料」页采集并单独计分。

### 主要变化
| 领域 | 变化 |
|------|------|
| **移除** | `sc4 sc5 sc6 sc7 fw1 fw2 ac1 ac2 ac3`（9 题，全是「怎么保养」而非「有没有症状」）+ 其 23 个选项 + `assess.reason.footCare/activity` |
| **新增** | 神经：`n8` 足部变形 · `n9` 冷热感觉减退 · `n10` 无痛性外伤；皮肤：`s11` 甲周红肿／流脓 · `s12` 趾甲下暗斑 · `s13` 足跟深裂口；循环：`c7` 下肢下垂性发红 · `c8` 双脚不对称（一侧更冷／更苍白）；病史：`h1` 医生曾诊断神经病变／循环不良 |
| **自我护理分类** | `CATEGORIES` 新增 `profileOnly` 标记：该分类**由个人资料推算**（查脚频率／穿鞋／赤脚），仍出现在结果页与临床规则，但**不出现在「将问什么」总览** |
| **题库总量** | 仍 **41 题**；分类变为 红旗 5 · 伤口 4 · 皮肤 11 · 神经 10 · 循环 8 · 病史 3（自我护理 0 题） |
| **出题引擎** | 不变（7 必答 + 4 个性化 + 条件追问 ≈ 11 题）。可轮换分类正好 4 个 → **每次检查神经／皮肤／循环／病史各出 1 题**，逐次只换「具体哪一道」 |
| **i18n** | en/zh-CN 各移除 34 键、新增 36 键（9 题 + 26 选项 + `assess.reason.history`），并按题库顺序重排 |

### 质量
- `tsc --noEmit` 干净
- 单元测试：分诊 **39** + 题库/选题 **35**（+2） + i18n **58** + 资料必填 **14** + 首次使用 **11** = **157 全通过**
- 题库文档已重新生成（`npm run doc:bank`）

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v3.4-symptom-bank
```

---

## 版本 3.3（内部编号）— `v3.3-personalised-bank`

**日期：** 2026-10-13
**状态：** 开发版
**Git tag：** `v3.3-personalised-bank`

### 一句话描述
把题库从 17 题扩到 **41 题 / 7 类**，并引入**「7 题安全必答 + 4 题个性化抽取 + 条件追问」**的出题引擎：每次只问约 11 题，个性化题**按资料相关度选、按种子逐次逐日轮换**，跨临床领域分布。

### 主要变化
| 领域 | 变化 |
|------|------|
| **题库** | 17 → **41 题**（新增 n4–n7、s6–s10、c3–c6、sc4–sc7、fw1/fw2、ac1–ac3、g1/g2；合并 w1+w3、s3+s4+s5） |
| **出题引擎** | 新增 `selectSessionQuestions()`：资格过滤 → 相关度排序 → 种子轮换 → **跨分类轮询取题**（每类最多 1 题，保证领域分散） |
| **必答安全屏** | 固定 7 题（rf1–rf5 红旗 + w1 伤口 + sk1 皮肤），直接决定分诊层级，永不可跳过 |
| **条件追问** | 5 条：报告伤口→追问病程/趋势/深度；麻木/感觉减退→追问 Charcot；间歇性跛行→追问静息痛 |
| **种子** | `seed = 当天序号 × 1000 + 当天第几次检查`：同次稳定、重做换题、跨日再换、可复现 |
| **可解释性** | 每道个性化题在界面上显示「为什么问您这题」标签（`assess.reason.*`） |
| **i18n** | en/zh-CN 各新增约 100 个键（41 题 + 110 选项 + 10 条理由）；覆盖测试扩展为**校验整个题库**并检测孤儿键 |
| **文档** | 新增 `docs/中文说明/question-bank-and-selection-logic-zh.md`（由代码自动生成，`npm run doc:bank`） |

### 质量
- `tsc --noEmit` 干净
- 单元测试：分诊 **39** + 题库/选题 **33**（新增） + i18n **58** + 资料必填 **14** + 首次使用 **11** = **155 全通过**
- 浏览器实测：同一用户重做检查 → 7 题安全屏不变、**4 题个性化题变化**；报告伤口触发 3 条追问、跛行触发静息痛追问；0 控制台错误

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v3.3-personalised-bank
```

---

## 版本 2（预览快照）— `v2-preview`

**日期：** 2026-10-13
**状态：** 可运行的预览版（Preview）
**Git tag：** `v2-preview`
**对应内部编号：** 版本 3.2

### 一句话描述
在版本1的基础上，完成了**确定性分诊引擎**、**个人资料门禁（12 项全必填）**、**聚焦 60+ 人群**、**首次使用欢迎页（含语言选择）**，中英文完整可用，并修掉了图标与免责声明的细节问题。

### 相比版本1的主要变化
| 领域 | 变化 |
|------|------|
| **分诊** | 新增确定性分诊引擎 `triageEngine`（4 个就医层级 / 13 条有序规则 / LLM 护栏）→ 结果页主结果变为"**去哪就医**"，与"多严重"解耦 |
| **评估** | 24 题 / 7 类别（新增红旗题 rf1–rf5，置于最前）；每题新增显式「下一步」按钮 |
| **个人资料** | 新增资料页，**12 项全部必填**（含「以上都没有」哨兵选项）；首次开始检查前强制填写 |
| **人群聚焦** | 年龄段改为 **60+**（60-69 / 70-79 / 80-89 / >89）；糖尿病类型仅保留 2 型 / 1 型 |
| **首次使用** | 新增欢迎页（语言选择在「开始足部检查」**下方**）；之后直接进首页；右上角语言切换器保留 |
| **演示** | 新增 `?reset=1`，一键回到"全新用户"状态 |
| **界面细节** | 移除检查页顶部免责声明框；头部 logo 与「检查」标签图标改为**脚印**（原来分别像"高脚杯"/"四叶草"） |

### 质量
- TypeScript `tsc --noEmit` 干净；`next build` 13/13 路由
- 单元测试：分诊 **39** + 资料必填 **14** + i18n 覆盖 **40** + 首次使用 **11**
- 浏览器实测：门禁 / 首次使用 / 图标 / 免责声明等场景全部通过，0 控制台错误

### 回滚
```bash
cd "/Users/river/WorkBuddy AI/hackathon" && git checkout v2-preview
```

---

## 版本 3.2 (Version 3.2) — `v3.2-footprint-icon`

**日期：** 2026-10-13
**状态：** 已实现、验证并打标签
**Git tag：** `v3.2-footprint-icon`

### 一句话描述
把头部左上角那个「**看起来像高脚杯**」的 logo 换成真正的**脚印**图标；底部导航「检查」标签的图标（原本渲染成**四叶草**）一并换成脚印。

### 问题
- **头部 logo**（`app.title` = 「足部检查」左侧）：原 SVG 路径的**设计意图是一只脚**（3 个脚趾 + 脚掌 + 脚踝 + 地面线），但「圆杯 + 细柄 + 底座」的剪影看起来就是个**高脚杯**。
  - `M9 3v2 M12 3v2 M15 3v2` → 三个脚趾
  - `M7.5 8c...z` → 圆润的脚掌（看起来像杯体）
  - `M12 14v4` → 脚踝（看起来像杯柄）
  - `M10 21h4` → 地面线（看起来像杯座）
- **底部导航「检查」图标**：原路径 `M12 2a4 4 0 00-4 4v2...` 渲染成**四叶草 / 四瓣花**，也不像脚。

### 修复
- 两处统一改用 **Lucide `footprints`** 图标（ISC 许可，可商用）：
  - `web/src/components/Header.tsx` — 头部 logo（4 条 path）
  - `web/src/components/BottomNav.tsx` — 「检查」标签图标（4 条 path）
- 头部 `strokeWidth` 2 → 1.7（脚印细节较多，避免 32px 下过粗）
- 选型过程：渲染了 20+ 个候选（俯视脚印 / 侧视脚型 / 实心 / 描边 / Lucide 双脚印等），在 32px 白色深底实测下对比，Lucide 双脚印辨识度最高、风格最一致

### 验证
- `tsc --noEmit` 干净
- 单元测试全绿：分诊 39/39、资料必填 14/14、i18n 覆盖 40/40、首次使用 11/11
- **Playwright 7/7**：头部与「检查」标签图标均为 4 条 path 的脚印（EN + zh-CN），旧四叶草路径已消失，0 控制台/页面/HTTP 错误
- 截图：`header-after-zh.png`、`nav-zh.png`、`app-full-zh.png`

---

## 版本 3.1 (Version 3.1) — `v3.1-assess-disclaimer-removed`

**日期：** 2026-10-13
**状态：** 已实现、验证并打标签
**Git tag：** `v3.1-assess-disclaimer-removed`

### 一句话描述
**检查页（`/assess`）** 顶部那条琥珀色免责声明框「仅供护理导航使用；不提供诊断或用药建议」**已移除**。其余页面（首页、推荐、数据）的免责声明**保持不变**。

### 改动范围
- 只改 **检查页**：`web/src/app/assess/page.tsx`
  - 删除 `<Disclaimer />`（原位于 `phase === "intro"` 的标题下方）
  - 删除随之无用的 `import Disclaimer from "@/components/Disclaimer";`
- **未改动**：`web/src/components/Disclaimer.tsx` 组件本身，以及首页（`page.tsx` 欢迎页 + 首页各一处）、推荐页（`recommendations/page.tsx`）、数据页（`data/page.tsx`）中的免责声明框

### 验证
- TypeScript：`tsc --noEmit` 干净
- **`next build` 成功**（13/13 路由）
- 单元测试全绿：分诊 39/39、资料必填 14/14、i18n 覆盖 40/40、首次使用 11/11
- **Playwright 浏览器实测（英文 + 中文）：8/8 通过**
  - `/assess`：免责声明**不存在**（EN 与 zh-CN 两种语言均验证）✓
  - `/`（首页 / 欢迎页）、`/recommendations`、`/data`：免责声明**仍然存在** ✓

---

## 版本 3.0 (Version 3.0) — `v3.0-first-run-welcome`

**日期：** 2026-10-13
**状态：** 已实现、验证并打标签
**Git tag：** `v3.0-first-run-welcome`

### 一句话描述
**首次使用**时，首页位置先显示一个**欢迎页**（含语言选择）；选好语言后点「开始足部检查」→ 进入首页。之后每次打开**直接进首页**，不再选语言。

### 交互流程
1. 首次打开 `/`（或 `?reset=1`）→ **欢迎页**：
   - 上半部分与首页一致（「您好 / 欢迎使用足部检查 / 您的个人糖尿病足筛查助手」）
   - 「开始足部检查」大按钮（与首页同款）
   - **按钮下方**：语言选择（5 种语言，2 列按钮，当前语言高亮）
   - 底部：免责声明
2. 点「开始足部检查」→ 标记首次使用完成 → **进入首页**（不跳转，直接切换内容）
3. 之后每次打开 `/` → **直接进入首页**
4. 右上角语言切换器**完全不变**（Header 未改动）

### 代码改动
- `web/src/lib/assessment.ts`：
  - 新增 `hasCompletedFirstRun()` / `markFirstRunComplete()`（localStorage `footcheck-onboarded`）
  - `clearStoredData()` 现在**也会清除**该标志 → `?reset=1` 可复现首次使用
- `web/src/app/page.tsx`：
  - 新增 `firstRun` 状态，在 `useEffect` 中解析（**SSR 读不到 localStorage**，避免 hydration 不一致）
  - `firstRun === null` 时返回 `null`（仅一帧）→ 老用户不会看到欢迎页闪一下
  - 数据加载 effect 加 `firstRun !== false` 守卫 → 欢迎页阶段不请求 `/api/environment`、不读历史
  - 语言按钮复用现有 `language.*` 文案 + `changeLanguage()`；另用局部 `langVersion` 计数确保切换后本页立即重渲染
- i18n（en + zh-CN）：新增 `firstRun.chooseLanguage`（"Choose your language" / "选择您的语言"）

### 验证
- TypeScript：`tsc --noEmit` 干净
- **`next build` 成功**：13/13 路由生成，无 prerender / SSR 报错
- 分诊 39/39；资料必填 14/14；i18n 覆盖 40/40
- **新增 `npm run test:firstrun`：11/11 通过**（全新安装为首次使用 / 标记后为老用户 / 幂等 / `clearStoredData()` 清除 profile、history、首次标志、门禁标志，且**保留语言**）
- **Playwright 浏览器实测：17/17 通过**
  - 首次进入显示欢迎页（不是首页）✓
  - 标题块 / 「开始足部检查」按钮存在，首页的「上次评估」卡片**不出现** ✓
  - 语言选项 5 个、用母语名、**位置在按钮下方**（实测 y 坐标 192 → 273）✓
  - 切换语言后欢迎页**立即**变成英文 ✓，语言已持久化 ✓
  - 点「开始足部检查」→ 进入首页，语言选择消失，`footcheck-onboarded=1` ✓
  - **刷新直接进首页**，不再显示欢迎页 ✓
  - 右上角语言切换器仍在 ✓
  - `?reset=1` 能重新回到首次使用状态 ✓
- 截图：`firstrun-en.png`、`firstrun-zh.png`
- 回归：资料门禁 16/16、`?reset=1` 9/9

---

## 版本 2.9 (Version 2.9) — `v2.9-demo-reset`

**日期：** 2026-10-13
**状态：** 已实现、验证并打标签
**Git tag：** `v2.9-demo-reset`

### 一句话描述
新增 **`?reset=1`** —— 打开任意页面加上该参数即可清空本地数据，获得「全新用户」体验，方便测试与现场演示。

### 用法
```
http://localhost:3000/?reset=1        # 清空后回到首页
http://localhost:3000/assess?reset=1  # 清空后直接进入评估页
```
清空内容：**个人资料 + 评估历史 + profile 门禁的 session 标志**
保留内容：**界面语言**（不会突然切回英文）

行为细节：
- 清空后**自动从 URL 移除 `?reset=1`** → 之后刷新不会反复清空
- 清空后**强制重新挂载页面内容**（复用已有的 `langKey` 机制）→ 页面立刻显示空数据，不会残留旧内容

### 代码改动
- `web/src/lib/assessment.ts`：新增 `clearStoredData()`
- `web/src/components/AppWrapper.tsx`：挂载时检测 `?reset=1` → 清空 → 改写 URL → `setLangKey(k=>k+1)` 重挂载

### 验证
- TypeScript：`tsc --noEmit` 干净
- 分诊 39/39；资料必填 14/14；i18n 覆盖 40/40；Playwright 门禁 16/16
- **新增 `?reset` 测试 9/9**：资料与历史被清空 / 语言保留 / 参数已从 URL 移除 / 首页无残留旧数据 / 刷新不会再次清空 / 清空后点「开始评估」正确跳转到个人资料页

---

## 版本 2.8 (Version 2.8) — `v2.8-i18n-hmr-fix`

**日期：** 2026-10-13
**状态：** 已实现、验证并打标签
**Git tag：** `v2.8-i18n-hmr-fix`

### 现象
用户报告：个人资料「您是否有以下疾病？」的**最后一个选项显示为乱码**（形如 `profile.comorbidityOpt.none`）。

### 根因（不是缺 key，而是热更新陈旧）
`comorbidityOpt.none` 这个 key **确实存在**于 en/zh-CN（已截图确认渲染正常）。真正原因是 **开发模式 Fast Refresh 陈旧**：
1. v2.5 同时新增了「以上都没有」选项（`profile/page.tsx`）与对应翻译（locale JSON）
2. 但 **`i18n.ts` 没有改动** → Fast Refresh 只重跑了 `page.tsx`，**没有重跑 `i18n.ts`**
3. 运行中的 i18n 实例仍持有**旧的语言包**（不含新 key）→ 新选项渲染成**原始 key**
4. 完整刷新页面后一切正常 —— 这正是 Playwright 测试（每次都完整 reload）没发现问题的原因

### 修复
- `web/src/lib/i18n.ts`：已初始化时（即开发期 Fast Refresh 重跑本模块），对每个语言调用
  `i18n.addResourceBundle(lng, "translation", bundle, true, true)` 重新注入语言包
  → 此后**编辑 locale JSON 无需硬刷新**即可生效
- **新增回归护栏** `web/scripts/i18n-coverage-test.ts` + `npm run test:i18n`：
  - 每个 profile 选项 id 都有对应标签
  - 无「删了选项却留下 key」的孤儿键
  - 全部 23 个字面 key 存在
  - 没有任何 value 本身是原始 key
  - **已反向验证**：临时删掉 `comorbidityOpt.none` → 测试报 `FAIL ... missing: none`；恢复后 40/40

### 验证
- TypeScript：`tsc --noEmit` 干净
- 分诊 39/39；资料必填 14/14；**i18n 覆盖 40/40**；Playwright 门禁 **16/16**
- 5 种语言下最后一个选项：en "None of the above"、zh-CN「以上都没有」、ms/ta/fil 回退英文
- 截图：`comorbid-zh-CN.png`、`comorbid-en.png`

### 用户操作
已打开的页面需要**刷新一次**（加载修复后的 `i18n.ts`）；之后同类问题不再出现。

---

## 版本 2.7 (Version 2.7) — `v2.7-diabetes-type`

**日期：** 2026-10-13
**状态：** 已实现、验证并打标签
**Git tag：** `v2.7-diabetes-type`

### 一句话描述
糖尿病类型选项只保留 **2 型 / 1 型**，删除「妊娠糖尿病」与「糖尿病前期」。

### 改动
- `web/src/app/profile/page.tsx`：`["type2","type1","gestational","prediabetes"]` → `["type2","type1"]`
- i18n（en + zh-CN）：删除已成孤儿键 `profile.diabetesTypeOpt.gestational`、`.prediabetes`

### 验证
- TypeScript：`tsc --noEmit` 干净
- Playwright 门禁流程：**16/16**（新增断言：选项恰为 `["2型糖尿病","1型糖尿病"]`）
- 截图：`diabetes-type-zh.png`

---

## 版本 2.6 (Version 2.6) — `v2.6-age-60plus`

**日期：** 2026-10-13
**状态：** 已实现、验证并打标签
**Git tag：** `v2.6-age-60plus`

### 一句话描述
个人资料年龄段改为 **60-69 / 70-79 / 80-89 / 大于 89** —— 本项目（黑客松）聚焦 60 岁以上人群。

### 改动
- `web/src/app/profile/page.tsx`：年龄段选项从 `40-49 / 50-59 / 60-69 / 70-75` 改为新四档
  - 标签移入 i18n（`profile.ageRangeOpt.*`），使「大于 89」可翻译（en: "Over 89"）
  - 存储值：`60-69` / `70-79` / `80-89` / `89+`
- `web/src/lib/riskProfiles.ts`：`AGE_RISK_PROFILES` 同步为新四档（否则年龄查表会失配）
  - `60-69`（mult 1.6 / 患病率 25.4% / 溃疡风险 14.2% / 6 个月）与 `70-79`（2.0 / 24.2% / 22.0% / 3 个月）沿用原有 NPHS/MOH 锚定值
  - **`80-89` 与 `89+` 为外推占位值**，代码中已显式注释 `EXTRAPOLATED — placeholder, pending real data`，**非已发表数据**，临床/监管使用前必须替换
- i18n（en + zh-CN）：新增 `profile.ageRangeOpt.{60to69,70to79,80to89,over89}`

### 未改动（有意）
- `dataSources.ts` 中的「新加坡糖尿病患病率按年龄」数据保留 40-49/50-59/60-69 —— 那是 **NPHS 已发布的真实统计数据**，不是本应用的用户年龄选择器，不应改动

### 验证
- TypeScript：`tsc --noEmit` 干净
- 分诊单元测试：39/39；资料必填单元测试：14/14
- Playwright 门禁流程：**15/15**（新增断言：年龄段选项恰为 `["60-69","70-79","80-89","大于 89"]`）
- 截图：`age-options-zh.png`、`age-options-en.png`

### 已知遗留（与本次改动无关）
`/api/risk-profile` 是**服务端路由**却调用 `getProfile()`（读 localStorage），服务端 `typeof window === "undefined"` → 恒返回 404；且当前无任何页面调用它。属既有设计问题，未在本次处理。

---

## 版本 2.5 (Version 2.5) — `v2.5-profile-all-required`

**日期：** 2026-10-13
**状态：** 已实现、验证并打标签
**Git tag：** `v2.5-profile-all-required`

### 一句话描述
个人资料**全部 12 项均为必填** —— 未填完时「保存资料」按钮**禁用**，无法保存。

### 解决的问题
v2.4 只把 9 项设为必填（`insulinUse`、`comorbidities`、`smoking` 选填）。用户要求"每一个问题都需要强制填写，然后才能保存资料"。

### 关键设计：合并症的「以上都没有」
`comorbidities` 是**多选**，空数组既可能是"没填"也可能是"没有合并症"——无法区分。
新增显式选项 **「以上都没有」**，以哨兵值 `COMORBIDITY_NONE = "none"` 存入数组：
- 选中「以上都没有」→ 清空其他选择，只存 `["none"]`（互斥）
- 选中任一真实疾病 → 自动移除 `"none"`
- 新增 `countComorbidities()`，**排除哨兵**后再计数 —— 因此 `["none"]` 与 `[]` 评分完全一致（已验证）

### 代码改动
- `web/src/lib/assessment.ts`：
  - `REQUIRED_PROFILE_FIELDS` 扩到 **12 项**（新增 `insulinUse`、`comorbidities`、`smoking`）
  - `isFieldFilled()` 增加数组分支（`length > 0`）；布尔 `false` 仍算已答
  - 新增 `COMORBIDITY_NONE`、`countComorbidities()`；`calculateRiskWithProfile` 改用后者
- `web/src/app/profile/page.tsx`：
  - 必填红星覆盖**全部** label（原 9 个 → 12 个）
  - 「保存资料」按钮 `disabled={!isComplete}`
  - 底部实时进度提示：**"所有项目均为必填 —— 请完成以下内容后保存（已完成 X / 12 项）"** + 缺失清单（随填写实时减少）
  - 移除旧的"尝试保存后才出现"逻辑（已不可达）；`missing` 改为渲染期直接计算，不再用 state
- i18n（en + zh-CN）：新增 `profile.requiredHint`（含 `{{done}}` / `{{total}}` 插值）、`profile.comorbidityOpt.none`
- `web/package.json`：新增 `npm run test:profile`
- `web/scripts/profile-required-test.ts`：新增 14 项单元测试

### 验证
- TypeScript：`tsc --noEmit` 干净
- 分诊单元测试：39/39 通过
- **新增** 资料必填单元测试：**14/14 通过**（哨兵计数、12 项完整性、布尔 false 算已答、`["none"]` 与 `[]` 评分一致）
- Playwright 门禁流程：**14/14 通过**（保存禁用 / 进度 0-12 / 无成功提示 / 填完清单消失 + 按钮启用 / 保存后自动返回并开始 / 「以上都没有」互斥）

---

## 版本 2.4 (Version 2.4) — `v2.4-profile-gate`

**日期：** 2026-10-13
**状态：** 已实现、验证并打标签
**Git tag：** `v2.4-profile-gate`

### 一句话描述
首次使用（个人资料未填写）时，点「开始评估」先跳转**个人资料页**填写，保存后**自动返回并开始问卷**。

### 解决的问题
个人资料提供 Self-Care 与 Medical History 两个类别的评分数据 —— 不填就等于这两个类别为 0，结果不可靠。因此首次使用必须先填资料。

### 交互流程
1. 评估页「开始评估」按钮上方有一行小字：**"首次使用本应用，请先填写个人资料后再开始"**
2. 点「开始评估」→ 若资料不完整 → 跳转 `/profile`（顶部显示蓝色提示条）
3. 资料页必填项带**红色星号**；若未填完就点保存 → 停留在本页并列出**"还需填写以下内容才能开始"**清单（随填写实时减少）
4. 填完并保存 → 自动返回 `/assess` 并**直接进入问卷第 1 题**（无需再点一次）
5. 资料已完整时，点「开始评估」直接进入问卷

### 必填字段（9 项，均为影响评估结果的字段）
`ageRange`、`gender`、`diabetesType`、`diabetesDuration`、`lastHbA1c`、`footInspection`、`barefootFrequency`、`footwearType`、`priorAmputation`

- `comorbidities` **不设为必填** —— 空列表本身就是有效答案（"无合并症"），无法与"未作答"区分
- `insulinUse`、`smoking` 不参与当前评分，保持选填

### 代码改动
- `web/src/lib/assessment.ts`：
  - 新增 `REQUIRED_PROFILE_FIELDS`、`isProfileComplete()`、`getMissingProfileFields()`
  - 新增 sessionStorage 握手键 `PROFILE_GATE_KEY`、`ASSESS_AUTOSTART_KEY`
- `web/src/app/assess/page.tsx`：`handleBegin()` 加门禁；挂载时检测自动开始标志；小字提示
- `web/src/app/profile/page.tsx`：门禁提示条、必填红星、缺失清单、保存后自动返回
- i18n（en + zh-CN）：`assess.firstTimeNote`、`profile.gateBanner`、`profile.gateMissingIntro`

### 验证
- TypeScript：`tsc --noEmit` 干净
- 分诊单元测试：39/39 通过
- Playwright 门禁流程：**10/10 通过**
  - 小字提示显示 ✓
  - 无资料点开始 → 跳转 `/profile` ✓
  - 提示条显示 ✓
  - 未填完保存 → 停留本页 + 缺失清单 ✓
  - 填完后清单消失 ✓
  - 保存后返回 `/assess` 且**自动开始问卷** ✓
  - 资料完整时点开始直接进入问卷 ✓

---

## 版本 2.3 (Version 2.3) — `v2.3-next-button`

**日期：** 2026-10-13
**状态：** 已实现、验证并打标签
**Git tag：** `v2.3-next-button`

### 一句话描述
评估流程改为**显式「下一步」按钮** —— 每个问题下方都有「下一步」，不再自动跳题。

### 解决的问题
用户反馈：**"点了返回按键以后，没有下一步按键"**。
- 旧行为：单选后 250ms 自动跳到下一题 → 页面上根本没有「下一步」按钮
- 旧行为：按「返回」回到上一题后，必须重新点选项才能前进（且会再次自动跳走），体验上"卡住"

### 代码改动（`web/src/app/assess/page.tsx`）
- `handleSingleSelect()`：**删除** 250ms `setTimeout` 自动跳题，只保存答案
- 删除 `handleMultiConfirm()`，合并为统一的 `handleNext()`（校验选择 → 前进或结束）
- 导航区：「下一步」按钮**始终渲染**（此前仅多选题目才渲染）
  - 未选择时禁用：`disabled={isMulti ? multiSelected.length === 0 : !answers[currentQuestion.id]}`
- 返回上一题时会恢复该题已选答案，因此「下一步」在返回后仍可点

### 验证
- TypeScript：`tsc --noEmit` 干净
- 分诊单元测试：39/39 通过
- Playwright 实时 UI：11/11 通过，覆盖用户原始问题
  - 每个问题都有「下一步」按钮 ✓
  - 选中选项后**不再自动跳题** ✓
  - 点「下一步」前进 ✓
  - **按「返回」后「下一步」仍然存在且可用** ✓（核心修复）

---

## 版本 2.2 (Version 2.2) — `v2.2-triage`

**日期：** 2026-10-13
**状态：** 已实现、验证并打标签
**Git tag：** `v2.2-triage`

### 一句话描述
按**医学数据库实际标准**修正分诊阈值 —— 删除此前由 AI 自行拟定的"≥3 个危险信号"与"≥4 个不确定"两条规则。

### 更正内容

| 项 | 原（自拟，无医学依据） | 现（医学依据） |
|----|----------------------|----------------|
| 急症触发 | ≥3 个危险信号（规则 RF-00） | **无数量门槛**：任一单一严重征象即急症（IWGDF/IDSA 2023 + ACE 2024） |
| 弃权阈值 | ≥4 个不确定 | **≥2 个不明确**（SIRS 需 ≥2 项，无法排除重度感染） |

**医学依据：**
- **重度感染 = 局部感染 + SIRS**（IWGDF/IDSA 2023 糖尿病足感染分级 4 级）
- **SIRS = 以下 4 项中 ≥2 项**（ACCP/SCCM 1992）：体温 >38/<36°C、心率 >90、呼吸 >20 或 PaCO₂ <32、白细胞 >12/<4 或杆状核 >10%
- 因此弃权阈值 **2** 直接来自 SIRS 的"≥2 项"规则，非拍脑袋数字

### 代码改动
- `triageEngine.ts`：
  - 删除规则 RF-00（≥3 红旗）；规则数回到 13
  - 新增 `SIRS_CRITERIA`（可审计阈值常量）
  - 新增 `IDSA_INFECTION_GRADES`（感染 1–4 级）
  - `UNKNOWN_ABSTAIN_THRESHOLD = SIRS_CRITERIA.requiredCriteria = 2`（替代原 `UNSURE_ABSTAIN_THRESHOLD = 4`）
  - 删除 `MULTI_REDFLAG_OVERRIDE_THRESHOLD`
  - AB-02 规则改为：`countUnsureRedFlags >= 2 && !hasClearLocalFinding`
  - `TRIAGE_METADATA.version` 1.1.0 → 1.2.0；新增 `sirsCriteria`、`idsaGrading`
  - `TRIAGE_SOURCES` 增补 IWGDF/IDSA 2023 + ACCP/SCCM 1992
- i18n（en + zh-CN）：删除 `triage.criteria.multiRedFlag`；改写 `insufficientData` 与 `abstention.insufficientDetail`，说明 SIRS 依据
- `docs/中文说明/data-sources-and-grading-zh.md`：重写，新增「医学依据」章节（SIRS + IWGDF/IDSA 表格）

### 验证
- 单元测试：39/39 通过（规则数 13）
- 实时 UI：1 个不明确 → SELF_CARE ✓；2 个不明确 → ABSTAIN ✓；1 个已确认 → EMERGENCY ✓
- TypeScript：`tsc --noEmit` 干净

### 说明（本工具范围）
本工具仅采集 5 项红旗中的 2 项 SIRS 相关项（体温、意识）。完整 SIRS 还需心率、呼吸、白细胞，需临床测量，超出筛查工具范围 —— 已在代码注释中说明。

---

## 版本 2.1 (Version 2.1) — `v2.1-triage`

**日期：** 2026-10-13
**状态：** 已实现、验证并打标签
**Git tag：** `v2.1-triage`

### 一句话描述
基于用户反馈调整分诊引擎的弃权与紧急判定阈值 —— 更智能地处理"部分不确定"的输入。

### 关键改动
| 改动 | 旧逻辑 | 新逻辑 |
|------|--------|--------|
| 红旗问题不确定 < 4 个 | 直接 ABSTAIN | 根据已回答问题正常评估 |
| 红旗问题不确定 ≥ 4 个 | （隐含，任何不确定 → ABSTAIN） | ABSTAIN |
| ≥ 3 个已确认红旗症状 | 无此规则 | **新规则 RF-00**：直接 EMERGENCY 覆盖 |
| AB-02 触发条件 | `!isRedFlagScreenComplete && !hasClearLocalFinding` | `countUnsureRedFlags >= 4 && !hasClearLocalFinding && countConfirmed < 3` |

### 新增的辅助函数
- `countUnsureRedFlags(input)`：计算 5 个红旗问题中 `undefined`（不确定）的数量
- `countConfirmedRedFlags(input)`：计算明确回答"是"的红旗数量
- `UNSURE_ABSTAIN_THRESHOLD = 4`（可配置）
- `MULTI_REDFLAG_OVERRIDE_THRESHOLD = 3`（可配置）

### 新增的 i18n 键
- `triage.criteria.multiRedFlag`：EN + zh-CN
- 更新 `triage.criteria.insufficientData` 文案，强调"4 或以上"
- 更新 `triage.abstention.insufficientDetail` 文案

### 验证
- 单元测试：**39/39 通过**（`npm run test:triage`）—— 13 个新增场景 + 6 个阈值辅助测试
- TypeScript：`tsc --noEmit` 干净
- 实时 UI 验证：3/3 场景通过
  - 3 个不确定 → SELF_CARE ✓
  - 4 个不确定 → ABSTAIN ✓
  - 3 个已确认 → EMERGENCY ✓

### 元数据更新
- `TRIAGE_METADATA.version`：1.0.0 → 1.1.0
- 新增字段：`abstainThreshold`、`multiRedFlagThreshold`

---

## 版本 2.0 (Version 2.0) — `v2.1-triage`（内部编号；已并入 2.1）

### 一句话描述
在版本1基础上，新增**独立确定性分诊引擎 `triageEngine`**，把"就医层级"从风险评分中解耦，并锁定 LLM 只能解释、不能更改层级。

### 新增内容
| 文件 | 说明 |
|------|------|
| `web/src/lib/triageEngine.ts` | 核心分诊模块：4 个就医层级 + 13 条有序规则 + LLM 解释契约 |
| `web/src/components/TriageCard.tsx` | 分诊结果卡片（层级 / 去哪 / 何时 / 做什么 / 为何 / 锁定说明）|
| `web/scripts/triage-test.ts` | 20 项测试：层级覆盖 + 确定性(1000×) + LLM 约束 |

### 4 个就医层级（确定性，纯函数）
| 层级 | 触发条件 | 指引 |
|------|----------|------|
| **EMERGENCY** | ACE 2024 红旗 + MIMIC-III 危重感染指标：发热>38°C、扩散性红肿、坏疽、恶臭脓液、意识改变 | 拨打 995 / 急诊科，立即 |
| **PRIMARY_CARE** | IWGDF 分层 + Kaggle 并发症画像：新水泡、浅表溃疡、皮肤破损（无全身症状） | 全科/综合诊疗所，24–48 小时 |
| **SELF_CARE** | ACE 2024 自我管理：轻度受压发红、皮肤未破损 | 居家护理+减压，24–48 小时复查 |
| **ABSTAIN** | 输入矛盾或不完整（审慎弃权） | "无法安全评估，请咨询医疗专业人士" |

### 关键设计
- **确定性**：无随机、无时钟、无 I/O；规则按 (priority, id) 排序，同一输入永远同一结果（测试验证 1000 次一致）
- **LLM 约束**：`buildExplanationContract()` 产出带锁层级的系统提示 + 允许/禁止清单；`isTierUnchanged()` 守卫函数
- **失败安全**：红旗"不确定"→ 视为未知（非"否"），必要时 ABSTAIN，绝不猜测
- **高危升级**：既往溃疡/截肢或血糖控制不佳者，轻度发红也升级为 PRIMARY_CARE（confidence = escalated）
- **红旗前置**：评估新增 rf1–rf5 五道红旗题，置于最前

### 验证
- 单元测试：20/20 通过（`npm run test:triage`）
- UI 走查（Playwright）：EMERGENCY / PRIMARY_CARE / SELF_CARE / ABSTAIN 四层级均正确，0 错误
- 中英双语：分诊卡片正确渲染，0 原始键泄露，0 hydration 错误
- 类型检查：`tsc --noEmit` 干净

---

## 版本 1 (Version 1) — `v1-preview`

**日期：** 2026-10-13
**状态：** 可运行的预览版（Preview）
**Git tag：** `v1-preview`

### 一句话描述
移动优先的多语言糖尿病足筛查助手 Web 应用首个完整预览版 —— 6 个页面、5 种语言、真实数据接入、临床规则引擎。

### 已实现功能

**页面（6 个）**
| 页面 | 路径 | 内容 |
|------|------|------|
| 首页 | `/` | 欢迎页、上次评估卡片、每日打卡、当前环境状况（实时天气/PSI）、数据来源说明 |
| 足部检查 | `/assess` | 16 题临床评估引擎，6 个临床类别，风险评分与分级 |
| 护理建议 | `/recommendations` | 基于评估结果的个性化建议（日常护理 / 医疗随访 / 生活方式） |
| 追踪 | `/followup` | 评估历史、风险趋势、每日打卡与连续天数 |
| 个人资料 | `/profile` | 年龄、性别、糖尿病类型、病程、胰岛素、HbA1c、并发症、吸烟 |
| 数据来源 | `/data` | data.gov.sg 实时连接状态、新加坡健康统计、环境快照 |

**语言（5 种）**
- 英语 (en) — 完整，100+ 键
- 简体中文 (zh-CN) — 完整，100+ 键全部翻译
- 马来语 (ms) — 已有翻译保留，新增键回退英文（待补）
- 泰米尔语 (ta) — 已有翻译保留，新增键回退英文（待补）
- 菲律宾语 (fil) — 已有翻译保留，新增键回退英文（待补）

**数据与规则**
- `src/lib/dataSources.ts` — 接入 data.gov.sg 真实 API（天气、PSI、糖尿病患病率、NPHS 健康指标）
- `src/lib/clinicalRules.ts` — 18 条临床决策规则（ACE 2024 + IWGDF 2023 + ADA 2024）
- `src/lib/riskProfiles.ts` — 新加坡人群风险画像（NPHS 2022）
- `src/lib/assessment.ts` — 16 题评估引擎与 localStorage 持久化
- 4 个 API 路由：`/api/environment`、`/api/health-stats`、`/api/care-facilities`、`/api/risk-profile`

**技术栈**
- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS 3.4
- i18next 23 + react-i18next 15
- 移动优先：375×812 视窗，18px 基础字号，44px 最小触控区

### 验证状态
- 全部 6 页 × 英/中：0 原始 i18n 键泄露、0 hydration 错误、0 控制台错误
- 5 种语言页面均正常渲染

### 已知限制（后续版本处理）
- 马来语/泰米尔语/菲律宾语的新增键待翻译
- 后端（Tencent CloudBase）尚未接入，数据存于 localStorage
- LLM 对话式评估尚未接入（当前为确定性规则引擎）
- PWA / 离线能力尚未实现
- 部分数据页文案仍为英文硬编码

### 预览方式
```bash
cd web
NODE_OPTIONS="" node node_modules/next/dist/bin/next dev -p 3000
# 打开 http://localhost:3000
```

---

## 后续计划（按用户优先级）

- **B. 接入真实数据源** — B1 data.gov.sg ✅ / B2 临床规则引擎 ✅ / B3 Kaggle 风险画像 / B4 Synthea 测试数据 / B5 CloudBase 后端
- **C. LLM 对话式评估** — 通过 CloudBase 免密钥调用
- **D. PWA + 离线** — Service Worker
- **A. 语言翻译** — 补全 ms/ta/fil 的新增键（最后做）
