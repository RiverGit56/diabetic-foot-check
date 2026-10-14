# 糖尿病足检查助手 · FootCheck

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;For the English version, see **[README.md](README.md)**.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;项目名称： FootCheck — 糖尿病足筛查助手  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;一句话简介： 为糖尿病长者提供清晰的下一步足部筛查。

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;🟢 Diabetic Foot Check Assistant — 面向新加坡 <ins>**60 岁以上已确诊糖尿病患者**</ins>的足部筛查与健康教育工具，适合<ins>**长者**</ins>和<ins>**看护者**</ins>使用，<ins>**提供 5 种语言**</ins>。

> ⚠️ 这是筛查与教育工具，不是诊断设备。它不提供用药建议，也不替代专业医疗。任何不适请及时就医。

---

## 🌐 WEB APP - 试用

**https://b67d3face37d47fd8db26026af6e1931.sg.agentos-app.run**

WEB APP：无需注册、无需安装，打开即用。  
适合长者和看护者。5 种语言。

<img src="Cover%20Image/Cover%20Image-380x216@3x.png" alt="FootCheck · 糖尿病足检查助手" width="428">

---

## 项目简介

FootCheck 帮助老年糖尿病患者在**居家**完成一次结构化的足部自查，并给出**明确的下一步**：

- **就医层级（主结果）**：`EMERGENCY`（立即急诊）／ `PRIMARY_CARE`（尽快基层就医）／ `SELF_CARE`（居家自护）／ `ABSTAIN`（信息不足，建议就医）。
- **风险等级**：`low` / `moderate` / `high` / `urgent`。
- **IWGDF 分级（0–3）**：决定建议的**筛查/复评间隔**（12 / 6 / 3 / 1 个月）。
- **建议与教育**：按结果给出就医指引与足部自我护理要点。

**技术栈：** Next.js 14（App Router，静态导出）· React 18 · TypeScript · Tailwind CSS · i18next。

---

## 架构与文档

| 内容 | 文档 |
| --- | --- |
| 系统架构图（Mermaid + SVG/PNG） | [`docs/docs English version/system-architecture.md`](docs/docs%20English%20version/system-architecture.md) |
| 信任边界图（Mermaid + SVG/PNG） | [`docs/docs English version/trust-boundary.md`](docs/docs%20English%20version/trust-boundary.md) |
| 数据源登记与分级标准 | [`docs/中文说明/data-sources-and-grading-zh.md`](docs/中文说明/data-sources-and-grading-zh.md) |
| 逐条「结果 ↔ 标准 ↔ 来源」对照 | [`docs/中文说明/assessment-criteria-source-mapping-zh.md`](docs/中文说明/assessment-criteria-source-mapping-zh.md) |
| CloudBase（生产阶段设计，当前未启用） | [`docs/中文说明/cloudbase-integration.md`](docs/中文说明/cloudbase-integration.md) |
| 关键设计取舍与已知局限 | [`docs/中文说明/design-tradeoffs-zh.md`](docs/中文说明/design-tradeoffs-zh.md) |
| 版本历史 | [`VERSIONS.md`](VERSIONS.md) |
| WorkBuddy 使用凭证截图（AI 对话证据） | [`Proof of Workbuddy usage/`](Proof%20of%20Workbuddy%20usage/) |
| 封面图（16:9）— SVG · PNG 380×216 · PNG @3x（1140×648） | [`Cover Image/`](Cover%20Image/) |

---

## 医学规则与数据来源（仅列实际使用）

> 只列出**代码中实际引用**的来源；逐条「结果 ↔ 标准 ↔ 出处」对照见 [`docs/中文说明/assessment-criteria-source-mapping-zh.md`](docs/中文说明/assessment-criteria-source-mapping-zh.md)。

**临床规则（分诊引擎实际使用）：**

| 来源 | 用途 |
| --- | --- |
| **IWGDF 2023** — Prevention and Management of Foot Problems in Diabetes | 风险分层（0–3）、预防与自我护理建议 |
| **NICE NG19** — Diabetic foot problems: prevention and management | 红旗症状、转诊阈值、居家监测 |
| **NICE NG28** — Type 2 diabetes in adults: management | 血糖控制相关规则（1 条） |
| **IWGDF/IDSA 2023** — Diagnosis and Treatment of Foot Infection in Diabetes | 感染分级（1–4；重度 = 局部感染 + SIRS） |
| **ACCP/SCCM 1992 SIRS 标准**（Bone et al., *Chest* 1992;101:1644‑55） | SIRS 4 项标准（≥2 项为阳性） |
| **qSOFA / Sepsis‑3**（Singer et al., *JAMA* 2016） | 意识改变作为独立急症触发项 |

> 说明：本工具仅采集 4 项 SIRS 标准中的**体温**一项（经红旗问题）；心率、呼吸、白细胞需临床测量，超出本筛查工具范围。

**数据来源（运行时/内置）：**

| 来源 | 用途 |
| --- | --- |
| **data.gov.sg / api.data.gov.sg**（公开、免密钥） | 天气、PSI 空气质量、MOH 数据集（糖尿病患病率、NPHS 指标等） |
| **MOH National Population Health Survey (NPHS) 2022** | 新加坡人群慢性病统计（高血压、血脂、肥胖、吸烟等） |
| **World Bank (2024) / IDF Diabetes Atlas（第 10 版）** | 新加坡糖尿病患病率 |
| **内置护理机构目录** | 新加坡医院 / 综合诊疗所 / 伤口护理中心（公开信息） |
| **Kaggle: Diabetes Health Indicators（CDC BRFSS 2015）** | 高危画像的**特征参考**（非校准） |
| **MIMIC‑III / PhysioNet** | ICU 特征**参考**（非校准） |
| **Synthea** | **合成**患者测试画像 |

> 唯一的外部主机是 `data.gov.sg` / `api.data.gov.sg`——公开、免密钥。项目**不含任何 API key / 密钥**。

---

## 🧪 测试指引（Try it yourself）

**无需注册。** 打开 Demo 链接即可。

**首次访问流程：**
1. 打开链接 → 看到**欢迎页**（首次引导）。
2. 填写**个人资料**（12 项必填，用于个性化选题与评分）。
3. 进入**评估** → **逐题作答**（每题选一项，点「下一题」）。
4. 查看**结果页**：顶部为**就医层级**横幅，下方为风险等级、建议与 IWGDF 分级。

**推荐试用的 3 个场景及预期结果：**

| 场景 | 如何作答 | 预期结果 |
| --- | --- | --- |
| **① 居家自护（低风险）** | 所有红旗问题选「否」；无破损/水泡；仅有轻微受压发红 | 层级 **`SELF_CARE`**，风险 **low** |
| **② 尽快基层就医** | 出现**新水泡 / 浅表皮肤破损**，但**无**发热、无扩散红肿、无坏疽 | 层级 **`PRIMARY_CARE`**，风险偏高 |
| **③ 立即急诊（红旗）** | 任一红旗为「是」——如**发黑/坏疽**、**红肿迅速蔓延**、**恶臭脓液**，或**发热 + 足部红肿** | 层级 **`EMERGENCY`**（红色横幅，建议立即就医） |

> 补充：若 **≥2 项红旗问题选「不确定」**，无法排除重度感染，结果为 **`ABSTAIN`**（建议就医）——这是**保守设计**，宁可多建议就医。

**如何切换语言：** 点击页面**右上角的语言选择器**，在 English / 简体中文 / Bahasa Melayu / Tamil / Filipino 之间切换；界面文字**即时更新**（离线也可切换）。

**如何验证离线可用：** 浏览器 DevTools → Network → 勾选 **Offline** → 刷新 → 应用仍可正常使用（评估与历史不受影响；环境数据卡回退内置数据）。

---

## 合成数据与测试说明

> **重要：以下测试均为「回归测试（regression tests）」，用于确保代码行为稳定、分级可复现，\*\*不是\*\*临床试验或医学验证，不能证明临床有效性。**

- **测试目的：** 保证**同一组输入永远得到同一结果**，且**跨语言一致**（`test:crosslang` 验证：固定输入在 5 种语言下 care tier 与 risk level 完全一致）。
- **数据性质：** 演示与测试使用**合成 / 内置数据**（内置人群统计、公开指南阈值、合成病例画像）。**不采集、不使用任何真实患者数据**。
- **云端路径默认关闭：** 演示版**不把数据上传服务器**；`cloudDb.ts` 在云端关闭时为空操作，写入失败自动落回本地，**绝不阻塞主流程**。

---

## 5 种语言 & AI 翻译说明

**支持语言：** English（`en`）· 简体中文（`zh-CN`）· Bahasa Melayu（`ms`）· தமிழ் / Tamil（`ta`）· Filipino（`fil`）。

- **切换方式：** 页面右上角**语言选择器**，选择后界面文字即时切换（**不需要联网**）。
- **实现方式：** 5 份词条在**构建时全部打进 JS**，运行时缺失的 key **自动回退英文**（i18next `fallbackLng: "en"`）。
- **语言与临床逻辑解耦：** 规则引擎只产出**翻译 key 与枚举值**，由 UI 按语言渲染，因此**分级/阈值/红旗/血糖单位逻辑与语言无关**，新增语言不影响判定。

> **关于 AI 翻译（如实说明）：** `ms` / `ta` / `fil` 的词条由 **AI 从英文基线翻译**而来，并经过自动化一致性校验（key 对齐、占位符、空值检查：`npm run test:i18n-keys` 结果为 **0 缺失 / 0 孤儿**）。**尚未经逐条人工母语审校**——建议在正式使用前请母语者复核医学与口语术语。

---

## 边界声明（Scope & Safety）

- ✅ **是**：足部**筛查**与**健康教育**、就医层级提示、自我护理指导。
- ❌ **不是**：诊断设备；**不提供任何用药/剂量建议**；**不替代**执业医疗人员的评估与治疗。
- 输出仅为**初步风险指标**，不构成诊断结论。出现以下任一情况请**立即就医**：发黑/坏疽、红肿迅速蔓延、恶臭脓液、发热伴足部红肿、意识改变。
- 本项目为**演示原型**，未做监管审批；正式临床使用前需另行评估。

---

## 本地运行指南

**前置条件：** Node.js 18+（建议 20+）。

```bash
# 1. 进入前端目录
cd web

# 2. 安装依赖
npm install

# 3. 启动开发服务器（默认 http://localhost:3000）
npm run dev
```

**生产构建（静态导出）：**

```bash
cd web
npm run build          # 产出静态站点到 web/out/
# 本地预览静态产物（任选其一）
npx serve out          # 或：python3 -m http.server 4173 --directory out
```

> 该应用 `output: "export"`，**没有服务端**，构建产物 `web/out/` 可直接部署到任意静态托管。

**运行测试：**

```bash
cd web
npm run test:triage     # 分诊引擎
npm run test:assess     # 评估/风险分级
npm run test:profile    # 必填资料校验
npm run test:i18n       # 5 语言 key 覆盖
npm run test:i18n-keys  # 5 语言与 en.json 对齐（缺失/孤儿）
npm run test:crosslang  # 同一输入在 5 语言下分级一致
npm run test:cloud      # 云端回退（不阻塞主流程）
npm run test:firstrun   # 首次欢迎/引导
npm run test:interval   # 筛查间隔
npm run test:reassess   # 再评估/升级比较
```

---

## 许可证

[MIT License](LICENSE)（含医学用途声明）。

---

## 免责声明

本软件为**筛查与健康教育**用途的原型，**不构成医疗建议**，**不提供用药建议**，**不替代专业医疗诊断与治疗**。使用者应就任何健康问题咨询执业医疗人员。软件按「现状」提供，作者不对使用后果承担责任。
