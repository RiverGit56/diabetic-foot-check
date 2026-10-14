/**
 * Generate the full question-bank + selection-logic document from the LIVE
 * code, so the listing can never drift from what the app actually asks.
 *
 * Output: docs/中文说明/question-bank-and-selection-logic-zh.md
 *
 * Run: npm run doc:bank
 */
import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from "node:url";

// Repo root = two levels up from web/scripts/
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { QUESTION_BANK, CORE_QUESTIONS, SESSION_ROTATING_COUNT } = await import(
  path.join(ROOT, "web/src/lib/assessment.ts")
);
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "web/public/locales/en.json"), "utf8"));
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "web/public/locales/zh-CN.json"), "utf8"));

const CAT_ZH = {
  redflags: "红旗症状（紧急）",
  neuropathy: "神经病变",
  skin: "皮肤与趾甲",
  wound: "伤口／溃疡",
  circulation: "血液循环（下肢动脉）",
  selfcare: "自我护理习惯",
  history: "病史与整体健康",
};
const CAT_EN = {
  redflags: "Red flags (emergency)",
  neuropathy: "Neuropathy",
  skin: "Skin & nails",
  wound: "Wound / ulcer",
  circulation: "Circulation (PAD)",
  selfcare: "Self-care habits",
  history: "History & general health",
};

/** Why a personalised question is asked (mirrors the code's relevance()). */
const PERSONALISATION = {
  n4: "病程 >10 年 或 HbA1c >8%",
  n5: "病程 >10 年 或 HbA1c >8%",
  n6: "年龄 ≥80 岁",
  n8: "病程 >10 年 或 HbA1c >8%",
  n9: "病程 >10 年 或 年龄 ≥80 岁",
  n10: "病程 >10 年 或 HbA1c >8%",
  s6: "HbA1c >8% 或 经常赤脚",
  s7: "病程 >10 年",
  s8: "常穿凉鞋/拖鞋 或 有截肢史",
  s9: "年龄 ≥80 岁",
  s10: "年龄 ≥80 岁 或 HbA1c >8%",
  s11: "年龄 ≥80 岁 或 很少检查足部",
  s12: "常穿凉鞋/拖鞋 或 有时/经常赤脚",
  s13: "年龄 ≥80 岁 或 HbA1c >8%",
  c3: "吸烟 或 病程 >10 年 或 心脏病 或 高胆固醇",
  c5: "吸烟 或 心脏病",
  c6: "肾病 或 心脏病",
  c7: "吸烟 或 心脏病",
  c8: "吸烟 或 病程 >10 年",
  g1: "HbA1c >8%",
  g2: "有眼病（视网膜病变）",
  h1: "病程 >10 年 或 HbA1c >8%",
};

/** Trigger that reveals an adaptive follow-up (mirrors the code's showIf()). */
const TRIGGER = {
  w2: "**仅当** 上一题「伤口状态」选择「现在有伤口」（w1c）",
  w4: "**仅当** 上一题「伤口状态」选择「现在有伤口」（w1c）",
  w5: "**仅当** 上一题「伤口状态」选择「现在有伤口」（w1c）",
  n7: "**仅当** 「脚部麻木」选「经常」（n5c）**或**「触觉」选「感觉减退」（n1b）",
  c4: "**仅当** 「走路腿痛」选「有时」或「经常」（c3b/c3c）",
};

const esc = (s) => String(s).replace(/\|/g, "\\|");
const w = (o) => (o.weight === 0 ? "0" : String(o.weight));

const byCat = new Map();
for (const q of QUESTION_BANK) {
  if (!byCat.has(q.category)) byCat.set(q.category, []);
  byCat.get(q.category).push(q);
}

const lines = [];
const P = (s = "") => lines.push(s);

P("# 题库全览 & 每次出题逻辑");
P();
P("> 本文件由 `web/src/lib/assessment.ts` 的**实时代码自动生成**，与 App 实际出题完全一致（生成脚本见 `web/scripts/` 说明）。");
P();
P("> **目标人群：** 60 岁及以上、已确诊 **1 型或 2 型**糖尿病的成年人。评估与分诊逻辑**不按糖尿病类型区分**（IWGDF 2023 / NICE NG19 对两型的足部风险分层一致）。");
P();
P("## 一、总览");
P();
P("| 项目 | 数值 |");
P("| --- | --- |");
P(`| 题库总题数 | **${QUESTION_BANK.length} 题** |`);
P(`| 每次检查固定必答题（安全筛查） | **${CORE_QUESTIONS.length} 题** |`);
P(`| 每次检查个性化抽取题 | **${SESSION_ROTATING_COUNT} 题** |`);
P(`| 每次检查实际题量 | **约 11 题**（7 必答 + 4 个性化），若触发条件分支可到 **13–15 题** |`);
P(`| 条件分支（根据上一题追问） | **${QUESTION_BANK.filter((q) => q.showIf).length} 题** |`);
P(`| 临床分类（有题目） | **${byCat.size} 类**（红旗 · 神经 · 皮肤 · 伤口 · 循环 · 病史） |`);
P("| 由个人资料推算的分类 | **1 类**（自我护理习惯，无题目） |");
P("| 语言 | 英文 / 简体中文（马来语、泰米尔语、菲律宾语后续补齐） |");
P();
P("### 三类题目");
P();
P("| 类型 | 含义 | 数量 | 每次是否出现 |");
P("| --- | --- | --- | --- |");
P(`| 🔒 **必答（core）** | 安全筛查题，直接决定「就医分级」结果，**任何一次检查都不能跳过** | ${CORE_QUESTIONS.length} | 每次都问 |`);
P(`| 🔀 **条件分支（adaptive）** | 根据**上一题的回答**动态出现（追问） | ${QUESTION_BANK.filter((q) => q.showIf).length} | 满足触发条件才问 |`);
P(`| 🎯 **个性化（personalised）** | 根据**个人资料**（年龄、病程、血糖、吸烟、合并症、穿鞋、赤脚、护理习惯、截肢史）相关度 + 日期轮换抽取 | ${QUESTION_BANK.length - CORE_QUESTIONS.length - QUESTION_BANK.filter((q) => q.showIf).length} | 每次抽 4 题，逐次/逐日变化 |`);
P();
P("> **题库只保留「检测疾病症状」的题目。** 原先的「足部护理习惯」类（怎么剪趾甲、涂不涂润肤霜、在不在家穿鞋、是否赤脚等 9 题）**已全部移除**，改为**在「个人资料」页采集**并单独计入风险评估的「自我护理」分类 —— 所以下面的题库里**不再有这一类题目**，腾出的名额换成了神经／皮肤／循环／病史的**症状检测题**。");
P();

P("## 二、完整题库（全部 " + QUESTION_BANK.length + " 题）");
P();

let n = 0;
for (const [cat, list] of byCat) {
  P(`### ${CAT_ZH[cat]} · ${CAT_EN[cat]}　（${list.length} 题）`);
  P();
  P("| # | 题号 | 类型 | 题目（中文） | Question (EN) | 选项（权重） | 何时出现 / 为什么问 |");
  P("| --- | --- | --- | --- | --- | --- | --- |");
  for (const q of list) {
    n++;
    const type = q.core ? "🔒 必答" : q.showIf ? "🔀 条件分支" : "🎯 个性化";
    const opts = q.options
      .map((o) => `${esc(zh.assess.options[o.id])}（${w(o)}${o.emergencyFlag ? " ⚠️" : ""}）`)
      .join("；");
    let why = "通用题（无特定资料条件，按轮换出现）";
    if (q.core) why = "安全筛查，每次必问";
    else if (q.showIf) why = TRIGGER[q.id] ?? "根据上一题回答";
    else if (PERSONALISATION[q.id]) why = `资料相关度：${PERSONALISATION[q.id]}`;
    P(
      `| ${n} | \`${q.id}\` | ${type} | ${esc(zh.assess.questions[q.id])} | ${esc(en.assess.questions[q.id])} | ${opts} | ${why} |`
    );
  }
  P();
}

P("> ⚠️ = 选择该项会点亮「紧急警示」，在结果页以红色横幅提示立即就医。");
P();

P("## 三、每次检查的出题逻辑（算法）");
P();
P("```");
P("┌─────────────────────────────────────────────────────────────┐");
P("│  1. 必答安全筛查  rf1–rf5 · w1 · sk1                 7 题    │");
P("│     （永远最先问，无法排除急症时系统会「安全弃权」）          │");
P("├─────────────────────────────────────────────────────────────┤");
P("│  2. 个性化抽取    4 题（见下方 4 步算法）                    │");
P("├─────────────────────────────────────────────────────────────┤");
P("│  3. 条件分支      满足触发条件才追加（0–4 题）                │");
P("└─────────────────────────────────────────────────────────────┘");
P("        每次实际题量 ≈ 11 题（触发分支后最多约 15 题）");
P("```");
P();
P("### 第 2 步：4 道个性化题是怎么选出来的");
P();
P("1. **资格过滤（appliesIf）** — 从题库里剔除「必答题」和「条件分支题」，只留下对该用户**适用**的题目。");
P("2. **相关度排序（relevance）** — 在**每个分类内部**，按个人资料给每题打分（年龄、病程、HbA1c、吸烟、合并症、穿鞋、赤脚、护理习惯、截肢史）。得分 >0 的「相关题」永远排在前面。");
P("3. **轮换（rotation）** — 把每个分类里的「相关题」和「其余题」分别用种子 `seed` 旋转，所以**具体问到哪一道会变化**，但一定优先考虑最相关的候选。");
P("4. **轮询取题（round-robin）** — 按「相关度最高的分类优先」的顺序，**每个分类轮流取 1 题**，直到取满 4 题。这样保证一次检查能**覆盖不同临床领域**，而不是集中在某一类。目前可轮换的分类正好 4 个（神经、皮肤、循环、病史），所以**每次检查这 4 个领域各出 1 题**，逐次只更换「具体哪一道」。");
P();
P("### 种子（seed）：怎么保证「每次不一样」");
P();
P("```");
P("seed = 当天日期序号 × 1000 + 当天第几次检查");
P("```");
P();
P("| 场景 | 结果 |");
P("| --- | --- |");
P("| 同一天、同一次检查内 | 题目**稳定不变**（老人不会中途看到题变） |");
P("| 同一天、重新做一次检查 | 抽到**不同的** 4 道个性化题 |");
P("| 不同的一天 | 再次**变化**（满足「不一定每天一样」） |");
P("| 相同资料 + 相同 seed | **完全可复现**（结果可审计、可解释） |");
P();
P("### 关键设计取舍");
P();
P("- **为什么 7 题必答？** 这 7 题是安全底线：5 个红旗症状 + 伤口状态 + 皮肤检查，直接决定「该不该马上去急诊」。若跳过，系统就无法排除严重感染，只能保守地「安全弃权」。");
P("- **同类题不会在一次检查里重复**：轮询取题保证**每个临床分类最多出 1 题**，所以即使题库里同一分类有多道相近题（如 n2 与 n4），老人同一次也不会被重复追问。");
P("- **性别是否参与出题？** 个人资料**采集**性别，但**不**用它来筛题或加权。因为 IWGDF / NICE 的风险分层**并不按性别**区分足部风险；把它排除在外是刻意的**公平性**设计（本项目含公平性测试能力）。");
P("- **个性化 vs 安全**：个性化只影响「非关键问题」；关键安全题永远固定，保证不漏诊。");
P();
P("### 触发条件分支的实例（根据上一题回答）");
P();
P("| 上一题回答 | 触发的追问 |");
P("| --- | --- |");
for (const q of QUESTION_BANK.filter((q) => q.showIf)) {
  P(`| ${TRIGGER[q.id] ?? "—"} | 「${esc(zh.assess.questions[q.id])}」 |`);
}
P();
P("## 四、举例：两种资料抽到的题不一样");
P();
P("| 用户 | 资料 | 个性化 4 题（示例 seed：A=1，B=2） |");
P("| --- | --- | --- |");
P("| A | 82 岁 · 病程>10 年 · HbA1c>8% · 吸烟 · 心脏病+肾病 · 人字拖 · 常赤脚 · 从不查脚 | 烧灼/针扎感(n4) · 趾甲周围红肿(s11) · 下肢发亮掉毛(c5) · 医生诊断过神经/循环(h1) |");
P("| B | 63 岁 · 病程<5 年 · HbA1c<7% · 不吸烟 · 无合并症 · 包脚鞋 · 从不赤脚 · 每天查脚 | 轻触感觉(n3) · 趾甲下暗斑(s12) · 下肢发亮掉毛(c5) · 血糖控制(g1) |");
P();
P("> 同一用户重新做一次检查，个性化 4 题也会变化（见「种子」一节）。");
P();

const out = path.join(ROOT, "docs/中文说明/question-bank-and-selection-logic-zh.md");
fs.writeFileSync(out, lines.join("\n"));
console.log("wrote", out, "(" + lines.length + " lines,", QUESTION_BANK.length, "questions)");
