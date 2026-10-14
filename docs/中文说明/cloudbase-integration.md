# CloudBase 数据存储集成（Tencent CloudBase via WorkBuddy）

> 状态：**云端激活已尝试一次，仍返回 `cloud_service_unavailable`，按约定不再重试。**
> 当前 `cloudEnabled = false`，`publicConfig` 保持为空，`cloudDb.ts` 未接入应用主流程。
> 应用主流程（localStorage）完全不受影响，离线/断网均正常工作。
>
> 隔离模型决策（见下方 §1）：**公共演示表（无登录），仅存合成数据**。`cloud/schema.sql`
> 已改为该模型；`cloudDb.ts` 写入强制字段白名单 + 长度限制，且云端可用才写、失败自动落本地。

> 绑定环境的具体步骤见 §3（仅在云端资源恢复、你主动要求时再执行）。

## 0. 需求规格（已定稿：公共演示表模型）

> **Integrate cloud storage (WorkBuddy Cloud Service = Tencent CloudBase under the hood) as an OPTIONAL, best-effort mirror of SYNTHETIC demo cases and check-in history.**
>
> 1. **Two core tables**
>    - `assessments`: `synthetic_case_id`, `selected_symptoms` (JSONB), `triggered_rule_id`, `care_tier`, `created_at`.
>    - `reassessments`: `followup_checkin_updates` (JSONB), `delta_changes` (JSONB), `escalation_outcome`, `created_at`.
> 2. **No login required — PUBLIC DEMO TABLE.** The isolation model is a single shared, public demo table. There is NO `owner_id` / `auth.uid()` and NO sign-in. RLS permits `anon, authenticated` read & write (`USING (true) WITH CHECK (true)`). This is safe **only** because the data is 100% synthetic (see §8).
> 3. **No secrets in client code.** Data access goes through the managed SDK (`@tencent-ai/workbuddy-cloud-sdk`); the publishable key + the demo session are attached automatically by the SDK. The environment id and provider keys stay server-side.
> 4. **App-side field whitelist + length limits on every write.** `cloudDb.ts` only ever writes the whitelisted synthetic columns and bounds string / JSONB sizes — the schema is permissive, so the safeguard is the app code.
> 5. **Best-effort, never blocks.** When the cloud is unavailable (`cloudEnabled === false`) or any request fails, the functions return `null` / `false` and the app keeps using local storage. Cloud activation is attempted **once**; if it returns `cloud_service_unavailable`, we stop touching the cloud and keep `cloudEnabled = false`.

**为什么用公共演示表而非按用户隔离：** 本应用当前无登录，按用户隔离的 RLS（`owner_id = auth.uid()`）要求登录后才能写，否则写入被拒。作为演示用途且数据全为合成，采用公共演示表可「无登录即写」，契合 hackathon 演示场景；代价是表级公开，因此 **必须** 靠 `cloudDb.ts` 的字段白名单 + 长度限制保证只存合成字段。

## 1. 架构

```
┌──────────────┐      publishableKey + session (自动注入)
│  Web (Next.js)│ ───────────────────────────────────────┐
│  cloudDb.ts   │                                         ▼
└──────────────┘                              ┌──────────────────────────┐
                                               │  WorkBuddy 数据平面        │
                                               │  /.cloud/database/rest/**  │
                                               │  (Tencent CloudBase 底座)  │
                                               └───────────┬──────────────┘
                                                           ▼
                                               ┌──────────────────────────┐
                                               │  PostgreSQL + RLS         │
                                               │  assessments / reassess-  │
                                               │  ments (公共演示表, 无登录) │
                                               └──────────────────────────┘
```

- 前端**只**持有 `publicConfig`（endpoint + publishableKey，二者都公开、无权限）。
- 无登录、无 `owner_id`；写入隔离靠 `cloudDb.ts` 的字段白名单，而非数据库账号。

## 2. 已落地的代码

| 文件 | 作用 |
|------|------|
| `web/src/lib/cloudConfig.ts` | 仅存放公开配置；`cloudEnabled = endpoint && publishableKey 非空`。当前为空 → `false` |
| `web/src/lib/cloudDb.ts` | SDK 初始化 + `assessments` / `reassessments` 的 CRUD；**字段白名单 + 长度限制**；全部 best-effort，未绑定或失败时返回 null/false，并回退本地存储镜像，绝不阻塞 |
| `cloud/schema.sql` | 两张表的 DDL + **公共演示表 RLS**（`anon, authenticated` 可读写，`USING(true) WITH CHECK(true)`），无 `owner_id` |

> `cloudDb.ts` 当前**未**接入 `assessment.ts` 等应用主流程——应用始终以 localStorage 为主存储，云端只是「可选增强」。云端不可用（`cloudEnabled=false`）时，`cloudDb` 所有函数直接返回 `false/null`，主流程零影响。现有 244+ 项测试与 `tsc` 不受影响。

## 3. 绑定环境（在 WorkBuddy 中的确切步骤）

云端资源紧张时此步会返回 `cloud_service_unavailable`。按约定**只尝试一次**；若仍不可用，则停止触碰云端，保持 `cloudEnabled=false`，不修改现有应用代码。

1. 让 Agent 调用 `workbuddy_cloud_service`：
   - `action: "inspect"` → 列出本会话已有应用（首次为空）。
   - `action: "activate", applicationMode: "create", appName: "糖尿病足筛查", domainPrefix: "diabetic-foot-check"` → 受信任的 WorkBuddy UI 弹出确认框，由你授权（涉及可能计费/配额，不在前端/对话里自行批准）。
2. 激活成功后，工具返回 `publicConfig`（含 `resourceId` / `endpoint` / `oauthRelayBaseUrl` / `publishableKey`）。
3. 把这四个值填进 `web/src/lib/cloudConfig.ts` 的 `publicConfig` 占位符。`cloudEnabled` 随即生效。
4. 用 §4 建表（或走 cloud-service 管理面板）。
5. 公开演示表无需登录即可写入。

> 注：截至本版，步骤 1 已尝试一次并返回 `cloud_service_unavailable`，故 `publicConfig` 仍为空、`cloudEnabled=false`，云端未接通。何时资源恢复、你主动要求时再执行。

## 4. 创建集合（表）

把 `cloud/schema.sql` 在 cloud-service 管理流程/SQL 控制台执行。该文件**默认即为公共演示表模型**（无登录，RLS `anon, authenticated` 可读写），无需再做 §3 旧版的「ALTERNATIVE」替换。

只存合成、非个人字段；写入端（`cloudDb.ts`）额外做字段白名单与长度限制作为第二道防线。

## 5. 客户端 SDK 调用片段（来自 `cloudDb.ts`）

初始化（**仅需一次**，从 `publicConfig` 读取，绝不硬编码 endpoint / 密钥）：

```ts
import { createWorkBuddyCloud, type WorkBuddyCloudClient } from "@tencent-ai/workbuddy-cloud-sdk";
import { publicConfig } from "./cloudConfig";

const cloud: WorkBuddyCloudClient = createWorkBuddyCloud({
  endpoint: publicConfig.endpoint,
  publishableKey: publicConfig.publishableKey,
  oauthRelayBaseUrl: publicConfig.oauthRelayBaseUrl, // 仅微信扫码登录需要
});
```

写入一条评估（公共演示表，无 `owner_id`，字段由 `cloudDb.ts` 白名单约束）：

```ts
await cloud.database.from("assessments").insert({
  synthetic_case_id: "DEMO-0001",
  selected_symptoms: { rf1: "rf1a", w1: "w1a" },
  triggered_rule_id: "PC-02",
  care_tier: "SELF_CARE",
});
```

读取（按时间倒序，最新在前）：

```ts
const { data, error } = await cloud.database
  .from("assessments")
  .select("synthetic_case_id, selected_symptoms, triggered_rule_id, care_tier, created_at")
  .order("created_at", { ascending: false })
  .limit(50);
```

写入一条复查/升级记录：

```ts
await cloud.database.from("reassessments").insert({
  followup_checkin_updates: { rf1: "rf1b", w1: "w1c" },
  delta_changes: { care_tier: ["SELF_CARE", "PRIMARY_CARE"] },
  escalation_outcome: "ESCALATED",
});
```

错误处理（`{ data, error }` 信封；空数组 = RLS 拦截，必须提示而非当成功）：

```ts
const { data, error } = await cloud.database.from("assessments").insert({ /* ... */ });
if (error) {
  if (error.code === "23505") showMessage("已存在");
  else if (error.code === "42501") showMessage("无权操作");
  else showMessage(error.message);
}
```

## 6. Cloud Function 代码（何时需要 / 如何正确写）

**默认不需要**：托管 SDK 的数据平面已提供安全 CRUD，「前端→自建云函数→管理员密钥」反而更可能泄漏密钥。只有当你需要**服务端校验、聚合、或触发第三方**时才写云函数，且管理员密钥**只能**留在云函数服务端。

示例（CloudBase Node.js 云函数，服务端上下文，密钥不出服务端）：

```js
// 云函数：校验并写入一条演示评估（仅在服务端运行）
const tcb = require("@cloudbase/node-sdk");
// SECRETID / SECRETKEY 由运行环境注入，绝不前/后端暴露
const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const db = app.database();

exports.main = async (event) => {
  const { synthetic_case_id, selected_symptoms, triggered_rule_id, care_tier } = event;
  if (!synthetic_case_id || !care_tier) return { ok: false, error: "missing fields" };
  await db.collection("assessments").add({
    synthetic_case_id, selected_symptoms, triggered_rule_id, care_tier,
    created_at: new Date(),
  });
  return { ok: true };
};
```

前端改调用该云函数（而非直连数据库）时，**依旧不要**把任何密钥放进前端；云函数地址走 WorkBuddy 数据平面/函数路由。

## 7. 接入到应用热路径（决策：公共演示表；当前未接入）

隔离模型已定为**公共演示表（无登录）**。但按本版约定，`cloudDb.ts` 暂**未**接入 `assessment.ts` 等主流程——应用仍以 localStorage 为主存储，云端为「可选增强」。待你明确要求时再接入：

- 在 `saveAssessmentResult()` 内追加一行 `await saveAssessment({ ... })`（fire-and-forget，try/catch，失败不影响本地，且 `cloudDb` 会回退本地镜像）。
- 在 `getAssessmentHistory()` 内：若 `listAssessments()` 返回非 null，可优先用云端；否则回退 localStorage。
- 公共演示表无需登录即可写入，故无需先接登录。

> 当前「主流程正常」的验证（Task #76）覆盖了两种场景：云端开启（注入假客户端，验证写入成功且不阻塞）与云端不可用/断网（`cloudEnabled=false`，`cloudDb` 直接 no-op，应用 localStorage 不受影响）。

## 8. PDPA（新加坡）检查清单

- [x] 仅存合成、非个人字段（`synthetic_case_id`，无姓名/NRIC/电话）。
- [x] 无自由文本可识别个人身份。
- [x] 前端不持有任何管理员密钥 / API key。
- [x] 公共演示表为无登录模型；因数据 100% 合成，表级公开可接受。
- [x] **写入端字段白名单 + 长度限制**（`cloudDb.ts`）保证只写合成列，作为 RLS 之上的第二道防线。
- [x] 云端激活仅尝试一次；不可用即 `cloudEnabled=false`，不触碰云端、不改动应用代码。
- [ ] 上线前在隐私声明中注明数据为演示用途、非真实病历。
- [ ] 若未来要存真实个人数据，必须改回按用户隔离 RLS + 登录，不可放松上述三条保证。
