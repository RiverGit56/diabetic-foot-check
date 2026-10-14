# FootCheck — 比赛提交材料（中文对照）

**项目：** FootCheck — 糖尿病足筛查助手（Diabetic Foot Check Assistant）  
**类型：** 移动优先、五语言、可离线运行的筛查与健康教育 Web 应用  
**目标用户：** 新加坡 60 岁及以上、已确诊 1 型或 2 型糖尿病的成年人  
**在线演示：** <https://b67d3face37d47fd8db26026af6e1931.sg.agentos-app.run>  
**版本：** v3.17 ｜ **日期：** 2026-10-14

> 本文是英文提交材料 `competition-submission-en.md` 的中文对照版本。

> **✅ 最终选定** —— **项目名称：** `FootCheck — 糖尿病足筛查助手` ｜ **短简介：** `Clear next-step foot screening for older adults with diabetes.`

---

## 1. 项目名称

**FootCheck — 糖尿病足筛查助手**

---

## 2. 一句话简介

**"Clear next-step foot screening for older adults with diabetes."**

中文参考译文：为糖尿病长者提供清晰的下一步足部筛查。

---

## 3. 项目描述

### (a) 项目概述 —— 目标场景、用户、价值主张

**目标场景。** FootCheck 用于最日常的家庭场景：一位糖尿病长者坐下来，用几分钟看看自己的双脚，在手机上回答一份简短的结构化问卷。应用随即告诉他最需要知道的那件事——**下一步该做什么**。

**用户。**

- **主要：** **60 岁及以上、已确诊 1 型或 2 型糖尿病**的成年人——他们是足溃疡与截肢风险最高的人群，且常伴有感觉、视力与行动能力下降。
- **次要：** 协助家中长者检查双脚的**家属照护者**。
- **再次：** **临床医生**——可收到一份简短、结构化、通俗易懂的"患者自述摘要"。

**价值主张。** FootCheck 把一句模糊的观察（"我的脚发红——严重吗？"）转化为一个**确定性的、有指南依据的就医决策**，用用户自己的语言给出，**无需登录、数据不出设备**。它不做诊断，而是补上**分诊与就医导航**这一环——即"发现异常"到"知道去哪"之间的缺口。

### (b) 真实场景洞察 —— 痛点来源、目标人群、核心问题

**痛点来源。** 糖尿病足并发症——溃疡、感染乃至下肢截肢——是糖尿病最令人恐惧的后果之一，且风险随年龄陡增。而衰老带来的两个特点让这些问题极易被漏掉：

1. **周围神经病变**剥夺了本该警示受伤的痛觉，伤口可能在无声中发展。
2. **视力与行动能力下降**使每日检查双脚、或在发现异常后迅速就医都变得困难。

**目标人群。** 新加坡 **60 岁及以上、已确诊糖尿病**的居民——这是一个**多语言**群体（英语、华语、马来语、泰米尔语、菲律宾语）。现有数字工具大多假设使用者具备英文读写能力与临床测量条件，因此**风险最高的人反而最缺乏服务**。

**核心问题。** 问题**不是缺少信息，而是缺少决策**。长者能看见一块红印、一个水泡或一个变色的脚趾，却无法判断它是小事、是紧急、还是急症；也往往无法判断该去哪个医疗层级。这正是 FootCheck 要补的缺口：**筛查与就医导航**，并刻意**不做诊断**。

### (c) 完整方案设计 —— 业务与技术架构，以及 prompts 如何驱动 AI 生成

#### 业务架构

一次筛查会话产出**四项解耦的输出**，让用户同时得到决策与它的来龙去脉：

| 输出              | 取值                                                                        | 回答的问题                        |
| --------------- | ------------------------------------------------------------------------- | ---------------------------- |
| **就医层级**        | `EMERGENCY`（急诊）/ `PRIMARY_CARE`（基层就医）/ `SELF_CARE`（居家护理）/ `ABSTAIN`（无法判定） | *我该去哪？*                      |
| **风险等级**        | `low` / `moderate` / `high` / `urgent`                                    | *风险有多大？*                     |
| **IWGDF 风险分级**  | 0 / 1 / 2 / 3                                                             | *多久复筛一次？*（12 / 6 / 3 / 1 个月） |
| **健康教育 + 适用规则** | 自我护理指引 + 命中的具体临床规则（每条带来源）                                                 | *为什么？我能做什么？*                 |

**信任与交付模型。** 以患者为主导、对照护者友好；**本地优先**（数据全部留在浏览器）、**免登录**、**默认不上传**——因此项目在完全不采集个人数据的前提下，天然契合新加坡 PDPA。产品明确定位为**筛查与健康教育工具，而非诊断设备**，且**不提供用药建议**。**安全弃权是一等公民**：当输入不清晰或自相矛盾时，应用会说"无法安全评估——请就医"，而不是猜测。

#### 技术架构

- **前端：** Next.js 14（App Router）+ React 18 + TypeScript + Tailwind CSS 3.4，以**静态导出**（`output: "export"`）构建并作为纯静态站点发布——交付产物**没有服务端、没有 API 路由**。
- **国际化：** i18next，**5 种语言**（en / zh-CN / ms / ta / fil），**每种 542 个叶子键**，在构建期打包进 JavaScript，因此**可离线运行**。引擎只产出**翻译键**，因此新增语言绝不可能改变临床逻辑——这一性质由自动化跨语言测试守住。
- **确定性引擎**（纯函数：无随机、无时钟、无 I/O——同样输入永远同样输出）：
  - `triageEngine.ts` —— **4 个就医层级**及其有序规则（EMERGENCY → PRIMARY_CARE → ABSTAIN → SELF_CARE，先命中者胜）。红旗题是**二态是/否**；**任一单一严重征象即为急症**（没有"最少几个症状"的门槛）。
  - `assessment.ts` —— 跨 7 类的 **41 题题库**、固定的 **7 题安全必答屏** + 每次按相关度抽取的个性化题、**12 项必填资料**、以及融合资料的评分。
  - `clinicalRules.ts` —— **18 条临床规则**，来源为 **IWGDF 2023 / NICE NG19 / NG28 / IWGDF-IDSA 2023 / SIRS 1992 / Sepsis-3**，每条带 `sourceRef`；并映射到 IWGDF 分级与复筛间隔。
- **数据：** `dataSources.ts` 由客户端直接调用公开、**免密钥**的 `data.gov.sg` API（天气、PSI、MOH 统计），失败自动兜底到内置数据；`riskProfiles.ts` 存放以 NPHS 为锚的人群风险画像；全部用户数据存于浏览器 `localStorage`。
- **可选云端（默认关闭）：** `cloudDb.ts` + `cloud/schema.sql` 实现了"公共演示表、无登录、仅合成数据"的模型，含字段白名单、长度限制与行级安全（RLS）。应用在没有云端时完全可用，且**绝不因云端而阻塞**。
- **质量：** TypeScript `tsc --noEmit` 零错误，**10 套自动化测试全绿**——分诊 45、评估 35、资料 14、i18n 161、键对齐 0 缺失 / 0 孤儿、跨语言 34、云端兜底 19、首次使用 11、筛查间隔 38、复查对比 30——另有浏览器回归脚本。

#### prompts 如何驱动 AI 生成

本项目以 **WorkBuddy（CodeBuddy）作为"提示词驱动"的 AI 开发伙伴**完成。其中涉及**两个截然不同的"prompt → 生成"回路**，且二者被**严格分离**：

**1. 构建期——由 prompts 生成产品。** 开发者用自然语言写下需求、临床约束与验收标准，由 AI 生成实现。具体而言，提示词驱动的 AI 产出了：

- React/Next.js 页面与组件；
- 确定性引擎、41 题题库与 18 条临床规则（依据提示词中指定的具名指南）；
- **5 个语言 JSON 文件**——其中 4 个非英文语言由英文基线 AI 翻译，再做键对齐的机器校验；
- **10 个测试脚本**与浏览器回归脚本；
- **双语文档**与 Mermaid 架构图 / 信任边界图（渲染为 SVG 与 PNG）；
- **静态构建与公网部署**。

提示词也驱动**纠错**，而不仅是生成。一条要求"对照引用来源对代码做一致性审计"的提示词，产出了一份**7 处"代码与来源不一致"**&#x7684;报告，随后又用一条后续提示词修复；另一条提示词把 **11 条无法核实的引用**改标到可公开下载的指南。

**2. 运行期——刻意不让 prompts 做决策。** 在产品内部，**没有任何大模型参与临床判断**。就医层级由规则引擎产出并被**锁定**。即便将来使用语言模型，它**也只能解释或科普**：`buildExplanationContract()` 交给模型一段禁止更改层级的系统提示，`isTierUnchanged()` 校验层级原样返回。这一分离是本项目的核心安全设计：**AI 负责造工具，AI 不为患者做决定。**

### (d) 业务价值 —— 只写本项目真正能支撑的内容

**仓库中真实可测量、可核验的指标**（无任何编造统计）：

- **4** 个确定性就医层级，**3** 项解耦输出（层级 / 风险 / IWGDF 分级）。
- **41** 题题库与 **18** 条临床规则，**每条都可追溯到一份可下载的指南**。
- **5** 种完整语言，**每种 542 个键**，**0 缺失 / 0 孤儿**，且**跨语言分级被证明完全一致**。
- **10** 套自动化测试全绿；**静态**构建、**无服务端依赖**、**零数据上传**。
- **6** 个面向用户的页面；仓库内**无任何 API 密钥或敏感信息**。

**设计真正带来的定性影响**（无需结果数据即可成立）：

- **把模糊变成行动**——用清晰、合语言习惯的"下一步"取代"这严重吗？"。
- **设计上安全保守**——输入不清晰时**弃权**（"请就医"）而非安抚。
- **对长者友好**——5 种语言、18px 基础字号、44px 触控区、可离线。
- **架构级隐私**——数据不出设备，**显著降低 PDPA 合规负担**。
- **可审计**——每一项输出都能逐条追溯到公开指南，这是黑箱模型无法提供的性质。

**明确不宣称的内容（诚实声明）：**

- **不**宣称降低截肢率、降低住院率或节省费用——**本项目未采集任何结局数据**。
- 项目**未经临床验证**；测试是**回归测试**，不是临床试验。
- 非英文翻译为 **AI 生成 + 自动校验**，**未经母语者逐行人工审校**。
- 本工具**仅采集 4 项 SIRS 中的 1 项**（体温）；心率、呼吸频率、白细胞计数需临床测量，超出范围。

**潜在价值（明确标注为"假设"而非"实测"）：** 更早的恰当转诊、更少的非必要急诊、照护者信心提升。这些是设计的**预期方向**，需真实世界试点才能证实。

---

## 4. 开发过程说明

*（用于书面证明本项目全程使用 CodeBuddy / WorkBuddy。以下每个里程碑都是公开仓库中的一个 git tag，过程可被独立核验。）*

### 4.1 按时间顺序的里程碑（含 git tag）

| 日期         | 里程碑                                                                           | Git tag                                                |
| ---------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| 2026-10-13 | **首个完整预览**——6 个页面、5 种语言、接入 `data.gov.sg` 实时数据、首版临床规则。                         | `v1-preview`                                           |
| 2026-10-13 | 引入**确定性分诊引擎**；删除 AI 自拟阈值并重新锚定到指南。                                             | `v2.1-triage`、`v2.2-triage`                            |
| 2026-10-13 | **交互与安全打磨**——显式"下一步"按钮；资料门禁；12 项全必填；年龄改 60+；糖尿病类型限 1 型/2 型；i18n 热更新修复；一键演示重置。 | `v2.3-next-button` … `v2.9-demo-reset`                 |
| 2026-10-13 | **首次使用欢迎页**、检查页免责声明精简、脚印图标。                                                   | `v3.0-first-run-welcome` … `v3.2-footprint-icon`       |
| 2026-10-13 | **用户命名的预览快照**（对 v3.2 代码状态的书签）。                                                | `v2-preview`                                           |
| 2026-10-13 | **内容深化**——41 题个性化题库；只保留症状题；统一定义目标人群；IWGDF 分级复筛间隔；界面清理。                        | `v3.3-personalised-bank` … `v3.8-checkin-consolidated` |
| 2026-10-13 | **比赛讲解文档**——每个结果 ↔ 标准 ↔ 医学来源 的逐条对照。                                           | `v3.9-criteria-mapping`                                |
| 2026-10-13 | **审计修复**——修掉 7 处"代码与来源不一致"；把临床知识层接入界面。                                        | `v3.10-consistency-fixes`                              |
| 2026-10-13 | **引用改标**——11 条无法核实的引用改标为 IWGDF 2023 / NICE NG19。                              | `v3.11-source-reattribution`                           |
| 2026-10-13 | **用户命名的预览快照**（二态是/否题目，无"不确定"选项）。                                              | `v3-preview`                                           |
| 2026-10-13 | **动态复查**（升级对比），后并入追踪页。                                                        | `v3.13-dynamic-recheck`                                |
| 2026-10-14 | **补全全部 5 种语言**；云端隔离模型敲定为"公共演示表"（未接通）。                                         | `v3.15-i18n-cloud`                                     |
| 2026-10-14 | **静态导出 + 公网部署**；删除服务端 API 路由。                                                 | `v3.16-static-export`                                  |
| 2026-10-14 | **竞赛交付物**——系统架构图与信任边界图、设计取舍说明、README、LICENSE。                                 | `v3.17-docs-and-license`                               |

> 文档中有两个内部编号没有独立 tag：**v3.12** 即用户命名快照 `v3-preview` 的代码状态；**v3.14**（删除独立复查页）有文档记录但未打 tag。

### 4.2 WorkBuddy 完成了什么（人做了什么）

**在开发者的提示词驱动下，WorkBuddy 生成并编辑了几乎全部代码、测试、文档与图表。** 开发者担任**产品负责人与审阅者**：给出需求、临床约束与设计决策，逐项验证结果，并下达纠错提示词。

| 领域       | 由提示词驱动的 AI（WorkBuddy）产出                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **应用代码** | 全部 6 个页面；React 组件；`triageEngine.ts`、`assessment.ts`、`clinicalRules.ts`、`dataSources.ts`、`riskProfiles.ts`、`i18n.ts`、`languages.ts`、`cloudDb.ts`、`cloudConfig.ts`。 |
| **临床内容** | 41 题题库；18 条临床规则（逐条带 `sourceRef`）；5 × 542 个翻译键。                                                                                                                    |
| **测试**   | 10 个 Node 测试脚本（`npm run test:*`）及浏览器回归脚本。                                                                                                                         |
| **文档**   | 双语 README；8+ 份文档；Mermaid 图表渲染为 SVG 与 PNG。                                                                                                                         |
| **运维**   | 静态导出构建；密钥审计（114 个跟踪文件零命中）；公网部署。                                                                                                                                   |

**人类在环的证据。** 开发者审阅了每一处改动、运行了完整测试套件，并下达了改变产品方向的纠错提示词——例如：触发**一致性审计**（修复 7 处）的提示词、**改标引用**的提示词、把 **AI 图像诊断移出范围**的决策、坚持用**确定性引擎而非大模型裁判**的决策，以及**保留中文文档、另加英文版**对外发布的决定。

**最终效果。** 一名开发者以提示词优先的方式与 WorkBuddy 协作，完成并交付了一个五语言、有指南依据、经测试、有文档、已公网部署的应用——AI 承担了绝大部分"写作"，人掌握"判断"。

---

## 5. 演示视频脚本（5–8 分钟）

**总时长：** 约 7 分 30 秒。**形式：** 屏幕录制 + 旁白。**语言：** 英文旁白；把应用切到中文（并短暂展示马来语/泰米尔语/菲律宾语）以证明多语言能力。

| 时间            | 画面                                            | 旁白（英文，括号为中文参考）                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0:00–0:40** | 封面图 → 应用首页。                                   | "Meet **FootCheck** — a five-language, offline screening tool that helps older adults with diabetes check their feet at home, and tells them exactly what to do next."（认识 FootCheck——一个五语言、可离线的筛查工具，帮助糖尿病长者在家检查双脚，并明确告诉他下一步该做什么。）                                                                                                                                                                                    |
| **0:40–1:30** | 简洁的屏幕文字；一张长者足部的示意照片。                          | "Diabetic foot problems — ulcers, infection, amputation — rise steeply with age. Neuropathy removes the pain that warns you, and reduced vision and mobility make feet hard to inspect. The problem is not a lack of information; it is the **absence of a decision**."（糖尿病足问题——溃疡、感染、截肢——随年龄陡增。神经病变夺走了警示的痛觉，视力与行动能力下降又让检查双脚变得困难。问题不在于缺少信息，而在于**缺少决策**。）                                                             |
| **1:30–2:15** | 架构图（`docs/docs English version/system-architecture.svg`）。          | "FootCheck answers one question: **where should I go?** A deterministic rule engine produces a care tier — emergency, primary care, self-care, or abstain. **No AI makes the clinical decision**; the tier is locked. Everything runs in the browser, in five languages, with no login and no upload."（FootCheck 只回答一个问题：**我该去哪？** 确定性规则引擎产出就医层级——急诊、基层就医、居家护理或弃权。**没有 AI 参与临床决策**，层级被锁定。一切都在浏览器中运行，五种语言，无需登录、无需上传。） |
| **2:15–2:55** | 首次使用欢迎页；切换语言；12 项资料。                          | "On first use, you pick your language and fill in a short profile — twelve required fields that personalise the scoring. That's it — no account, no email."（首次使用时，选择语言并填写一份简短资料——12 个必填项，用于个性化评分。就这样——没有账号、没有邮箱。）                                                                                                                                                                                                    |
| **2:55–3:45** | **场景 A —— 轻微、居家护理。** 所有红旗题答"否"；勾选*轻度发红、皮肤完整*。 | "Scenario one: nothing serious. All red flags are 'No', and the only finding is mild redness with the skin intact. FootCheck returns **self-care** — manage it at home, keep pressure off, and re-check in 24 to 48 hours."（场景一：无大碍。所有红旗均为"否"，唯一发现是皮肤完整的轻度发红。FootCheck 返回**居家护理**——在家处理、减压、24–48 小时后复看。）*（展示绿色层级横幅、IWGDF 卡片与 12 个月复筛间隔。）*                                                                            |


| **3:45–4:45** | **场景 B —— 红旗急症。** 对*黑色或坏死组织*（或*发热伴红肿的脚*）答"是"。 | "Scenario two: a red flag. Watch what happens when a single severe sign is reported — black, dead tissue. FootCheck immediately returns **emergency** — a red banner telling the user to seek care now. There is no 'minimum number of symptoms' — **one severe sign is enough**, exactly as the guidelines require."（场景二：红旗。看当报告单一严重征象——黑色、坏死的组织——会发生什么。FootCheck 立刻返回**急诊**——红色横幅，提示立即就医。没有"最少症状数"——**一个严重征象就够了**，正如指南所要求。） |  
| **4:45–5:30** | **场景 C —— 弃权。** 给出自相矛盾的答案（如"从未有过足部伤口"同时又"今天新出现水泡"）。 | "Scenario three: what if your answers don't add up? Here the user says they have never had a foot wound, but also reports a new blister today. FootCheck **refuses to guess** — it returns **abstain**: 'unable to assess safely, please see a clinician.' Safe abstention is a feature, not a bug: we would rather over-refer than miss a red flag."（场景三：如果答案自相矛盾呢？这里用户说从未有过足部伤口，却又报告今天新出现水泡。FootCheck **拒绝猜测**——返回**弃权**："无法安全评估，请就医。" 安全弃权是特性，不是缺陷：宁可多转诊，也不漏掉一个红旗。） |  
| **5:30–6:20** | 建议页（层级横幅、IWGDF 卡片、18 条带来源徽标的规则）；追踪页的升级对比。 | "Every result is explained. The recommendations page lists the clinical rules that fired, **each with its source** — IWGDF, NICE, SIRS, Sepsis-3. The tracking page compares this check with the last one and flags **escalation** — if your foot has become more urgent since last time, it says so."（每个结果都有解释。建议页列出命中的临床规则，**每条都带来源**——IWGDF、NICE、SIRS、Sepsis-3。追踪页把本次与上次对比并标出**升级**——若您的足部比上次更紧急，它会明确提示。） |  
| **6:20–7:10** | 终端：git tag、测试输出、审计报告。 | "And here's how it was built. This project was written **prompt-first with WorkBuddy**. I described the clinical requirements; the AI generated the engine, the question bank, the five translations, the tests and the documentation. When I asked for a **consistency audit**, it found seven places where the code disagreed with its cited sources — and then fixed them. The key lesson: **keep AI in the build loop, and keep it out of the clinical decision.**"（这是它的构建方式。本项目以 **WorkBuddy 提示词优先**写成。我描述临床需求；AI 生成引擎、题库、五种翻译、测试与文档。当我要求一次**一致性审计**时，它找出 7 处代码与引用来源不符之处——随后修复。关键心得：**让 AI 留在构建回路里，把它挡在临床决策之外。**） |  
| **7:10–7:30** | 封面图；屏幕上显示在线链接。 | "FootCheck — clear, safe, multilingual foot screening for older adults with diabetes. It is a screening tool, not a diagnosis — and it is live right now at the link on screen. Thank you."（FootCheck——为糖尿病长者提供清晰、安全、多语言的足部筛查。它是筛查工具，不是诊断——此刻正运行在屏幕上的链接里。谢谢。） |

**需提前准备的字幕/标注：** 三个场景各自的就医层级横幅；IWGDF 复筛间隔；来源徽标；升级横幅；在线链接。

---

*FootCheck 是筛查与健康教育工具，不是诊断设备；不提供诊断或用药建议。*
