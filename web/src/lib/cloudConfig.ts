/**
 * WorkBuddy Cloud Service — public configuration (front-end safe).
 *
 * This file holds ONLY the public config returned by the WorkBuddy
 * cloud-service tool after you bind the environment. It carries NO secrets:
 * the environment id and provider keys stay server-side. Never paste an
 * admin/API key here.
 *
 * HOW TO FILL (see docs/中文说明/cloudbase-integration.md → "Bind the environment"):
 *   1. Activate the cloud service in WorkBuddy (the agent calls
 *      workbuddy_cloud_service with action "activate").
 *   2. Paste the four fields from the tool's `publicConfig` result below.
 *   3. `cloudEnabled` flips to true automatically (it just checks that
 *      endpoint + publishableKey are non-empty).
 *
 * Until then, `cloudEnabled` is false and the app keeps using local storage,
 * so nothing breaks during development.
 */
export interface CloudPublicConfig {
  resourceId: string;
  endpoint: string;
  oauthRelayBaseUrl: string;
  publishableKey: string;
}

/**
 * Placeholder — replace the empty strings with your real `publicConfig`.
 * `endpoint` + `publishableKey` are mandatory; `oauthRelayBaseUrl` is only
 * needed if you later add WeChat QR sign-in (not used by this app yet).
 */
export const publicConfig: CloudPublicConfig = {
  resourceId: "",
  endpoint: "",
  oauthRelayBaseUrl: "",
  publishableKey: "",
};

export const cloudEnabled =
  publicConfig.endpoint !== "" && publicConfig.publishableKey !== "";
