const CONFIG_KEYS = [
  "apiBaseUrl",
  "hostname",
  "endpointKey",
  "deviceId",
  "policyVersion",
  "userEmail",
  "departmentName",
  "offlineCriticalBlock",
  "enabled",
  "shadowAiPatterns",
  "shadowPolicySyncedAt",
  "managedConfigApplied",
  "managedLockSettings",
  "lastEnrollmentError"
];

const MANAGED_KEYS = [
  "apiBaseUrl",
  "enrollmentToken",
  "userEmail",
  "departmentName",
  "hostname",
  "enabled",
  "offlineCriticalBlock",
  "autoEnroll",
  "lockSettings"
];

const LOCAL_AI_DOMAINS = [
  "chatgpt.com", "chat.openai.com", "gemini.google.com", "claude.ai",
  "copilot.microsoft.com", "perplexity.ai", "poe.com", "you.com",
  "phind.com", "character.ai", "meta.ai", "mistral.ai", "chat.mistral.ai",
  "deepseek.com", "chat.deepseek.com", "groq.com", "chat.groq.com",
  "huggingface.co", "pi.ai", "writesonic.com", "jasper.ai", "notion.so",
  "gamma.app", "replit.com", "cursor.com", "lovable.dev", "bolt.new"
];

const recentDiscoveries = new Map();

chrome.runtime.onInstalled.addListener(async details => {
  await bootstrapExtension(details.reason);
});

chrome.runtime.onStartup.addListener(async () => {
  await bootstrapExtension("startup");
});
chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === "local") updateBadge();
  if (areaName === "managed") bootstrapExtension("managed").catch(() => undefined);
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "aiguard-shadow-policy") syncShadowPolicy().catch(() => undefined);
  if (alarm.name === "aiguard-extension-heartbeat") sendExtensionHeartbeat().catch(() => undefined);
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || (changeInfo.status === "complete" ? tab.url : null);
  if (url) discoverAiNavigation(tabId, url, tab.title || "").catch(() => undefined);
});

async function bootstrapExtension(reason) {
  const current = await chrome.storage.local.get(CONFIG_KEYS);
  const defaults = {};

  if (typeof current.enabled !== "boolean") defaults.enabled = true;
  if (typeof current.offlineCriticalBlock !== "boolean") defaults.offlineCriticalBlock = true;
  if (!current.apiBaseUrl) defaults.apiBaseUrl = "http://127.0.0.1:5185";
  if (!current.hostname) defaults.hostname = createDeviceName();

  if (Object.keys(defaults).length > 0) {
    await chrome.storage.local.set(defaults);
  }

  await applyManagedConfiguration();
  await autoEnrollFromManaged();
  await updateBadge();
  await ensureShadowDiscovery();

  const status = await getStatus();
  if (reason === "install" && !status.configured) {
    await chrome.runtime.openOptionsPage();
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return false;

  const handlers = {
    AIGUARD_API: () => handleApi(message),
    AIGUARD_ENROLL: () => enrollDevice(message),
    AIGUARD_TEST: () => testConnection(),
    AIGUARD_STATUS: () => getStatus(),
    AIGUARD_OPEN_OPTIONS: async () => {
      await chrome.runtime.openOptionsPage();
      return { ok: true };
    }
  };

  const handler = handlers[message.type];
  if (!handler) return false;

  handler()
    .then(sendResponse)
    .catch(error => sendResponse({
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error)
    }));
  return true;
});

async function getConfig() {
  return chrome.storage.local.get(CONFIG_KEYS);
}

async function getManagedConfig() {
  try {
    return await chrome.storage.managed.get(MANAGED_KEYS);
  } catch {
    return {};
  }
}

async function applyManagedConfiguration() {
  const managed = await getManagedConfig();
  const updates = {};

  for (const key of ["apiBaseUrl", "userEmail", "departmentName", "hostname"]) {
    if (typeof managed[key] === "string" && managed[key].trim()) {
      updates[key] = key === "apiBaseUrl"
        ? normalizeApiUrl(managed[key])
        : managed[key].trim();
    }
  }
  if (typeof managed.enabled === "boolean") updates.enabled = managed.enabled;
  if (typeof managed.offlineCriticalBlock === "boolean") {
    updates.offlineCriticalBlock = managed.offlineCriticalBlock;
  }
  if (typeof managed.lockSettings === "boolean") updates.managedLockSettings = managed.lockSettings;
  updates.managedConfigApplied = Object.keys(managed).length > 0;

  if (Object.keys(updates).length > 0) await chrome.storage.local.set(updates);
  return managed;
}

async function autoEnrollFromManaged() {
  const managed = await getManagedConfig();
  const config = await getConfig();
  if (config.endpointKey) return;
  if (managed.autoEnroll === false) return;
  if (!managed.enrollmentToken || !managed.apiBaseUrl || !managed.userEmail || !managed.departmentName) return;

  try {
    await enrollDevice({
      body: {
        apiBaseUrl: managed.apiBaseUrl,
        hostname: managed.hostname || config.hostname || createDeviceName(),
        userEmail: managed.userEmail,
        departmentName: managed.departmentName,
        enrollmentToken: managed.enrollmentToken
      }
    });
    await chrome.storage.local.set({ lastEnrollmentError: "" });
  } catch (error) {
    await chrome.storage.local.set({
      lastEnrollmentError: error instanceof Error ? error.message : String(error)
    });
  }
}

function normalizeApiUrl(value) {
  const url = new URL(String(value || "").trim());
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("API URL must use HTTP or HTTPS");
  }
  return url.origin + url.pathname.replace(/\/+$/, "");
}

async function requestApi({ apiBaseUrl, path, method = "GET", endpointKey, body, file }) {
  if (!path.startsWith("/api/")) throw new Error("Invalid API path");

  const headers = {};
  let requestBody;
  if (endpointKey) headers["X-Endpoint-Key"] = endpointKey;

  if (file) {
    requestBody = new FormData();
    requestBody.append("hostname", file.hostname);
    const fileBytes = file.base64
      ? base64ToBytes(file.base64)
      : new Uint8Array(file.bytes || []);
    requestBody.append(
      "file",
      new Blob([fileBytes], { type: file.type || "application/octet-stream" }),
      file.name
    );
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${normalizeApiUrl(apiBaseUrl)}${path}`, {
    method,
    headers,
    body: requestBody
  });
  const payload = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    payload,
    error: response.ok ? null : apiError(payload, `API request failed (${response.status})`)
  };
}

async function handleApi(message) {
  const config = await getConfig();
  if (config.enabled === false) throw new Error("AIGuard protection is disabled");
  if (!config.apiBaseUrl || !config.hostname || !config.endpointKey) {
    throw new Error("AIGuard is not enrolled");
  }

  return requestApi({
    apiBaseUrl: config.apiBaseUrl,
    path: message.path,
    method: message.method || "GET",
    endpointKey: config.endpointKey,
    body: message.body,
    file: message.file ? { ...message.file, hostname: config.hostname } : null
  });
}

async function enrollDevice(message) {
  const request = message.body || {};
  const apiBaseUrl = normalizeApiUrl(request.apiBaseUrl);
  const hostname = String(request.hostname || "").trim() || createDeviceName();
  const userEmail = String(request.userEmail || "").trim().toLowerCase();
  const departmentName = String(request.departmentName || "").trim();
  const enrollmentToken = String(request.enrollmentToken || "").trim();

  if (!userEmail || !departmentName || !enrollmentToken) {
    throw new Error("Please complete all enrollment fields");
  }

  const response = await requestApi({
    apiBaseUrl,
    path: "/api/endpoints/deployment/enroll",
    method: "POST",
    body: {
      enrollmentToken,
      hostname,
      userEmail,
      departmentName,
      extensionVersion: chrome.runtime.getManifest().version
    }
  });

  if (!response.ok || !response.payload?.data?.endpointKey) {
    throw new Error(response.error || "Device enrollment failed");
  }

  const data = response.payload.data;
  await chrome.storage.local.set({
    apiBaseUrl,
    hostname,
    userEmail,
    departmentName,
    endpointKey: data.endpointKey,
    deviceId: data.deviceId,
    policyVersion: data.policyVersion,
    enabled: true
  });
  await updateBadge();
  return { ok: true, status: response.status, payload: response.payload };
}

async function testConnection() {
  const config = await getConfig();
  if (!config.apiBaseUrl || !config.hostname || !config.endpointKey) {
    return { ok: false, status: 0, error: "AIGuard is not enrolled" };
  }

  const result = await requestApi({
    apiBaseUrl: config.apiBaseUrl,
    path: `/api/policies/current?hostname=${encodeURIComponent(config.hostname)}`,
    endpointKey: config.endpointKey
  });

  if (result.ok && result.payload?.data?.version) {
    await chrome.storage.local.set({ policyVersion: result.payload.data.version });
  }
  return result;
}

async function getStatus() {
  const config = await getConfig();
  return {
    ok: true,
    configured: Boolean(config.apiBaseUrl && config.hostname && config.endpointKey),
    enabled: config.enabled !== false,
    apiBaseUrl: config.apiBaseUrl || "",
    hostname: config.hostname || "",
    userEmail: config.userEmail || "",
    departmentName: config.departmentName || "",
    policyVersion: config.policyVersion || "",
    offlineCriticalBlock: config.offlineCriticalBlock !== false,
    managedConfigApplied: config.managedConfigApplied === true,
    managedLockSettings: config.managedLockSettings === true,
    lastEnrollmentError: config.lastEnrollmentError || "",
    version: chrome.runtime.getManifest().version
  };
}

async function updateBadge() {
  const config = await getConfig();
  const configured = Boolean(config.apiBaseUrl && config.hostname && config.endpointKey);
  const enabled = config.enabled !== false;

  await chrome.action.setBadgeText({ text: !enabled ? "OFF" : configured ? "ON" : "!" });
  await chrome.action.setBadgeBackgroundColor({
    color: !enabled ? "#52525b" : configured ? "#16a34a" : "#dc2626"
  });
}

function apiError(payload, fallback) {
  return payload?.message || payload?.error || payload?.errors?.join?.(", ") || fallback;
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function createDeviceName() {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `BROWSER-${suffix}`;
}

async function ensureShadowDiscovery() {
  await chrome.alarms.create("aiguard-shadow-policy", { periodInMinutes: 15 });
  await chrome.alarms.create("aiguard-extension-heartbeat", { periodInMinutes: 1 });
  await syncShadowPolicy().catch(() => undefined);
  await sendExtensionHeartbeat().catch(() => undefined);
}

async function syncShadowPolicy() {
  const config = await getConfig();
  if (config.enabled === false || !config.apiBaseUrl || !config.hostname || !config.endpointKey) return;
  const response = await requestApi({
    apiBaseUrl: config.apiBaseUrl,
    path: `/api/endpoints/shadow-ai/policy?hostname=${encodeURIComponent(config.hostname)}`,
    endpointKey: config.endpointKey
  });
  if (!response.ok) return;
  const websites = response.payload?.data?.websites || [];
  await chrome.storage.local.set({
    shadowAiPatterns: websites.map(item => ({
      pattern: item.domainPattern,
      mode: item.mode,
      name: item.name
    })),
    shadowPolicySyncedAt: new Date().toISOString()
  });
}

async function sendExtensionHeartbeat() {
  const config = await getConfig();
  if (config.enabled === false || !config.apiBaseUrl || !config.hostname || !config.endpointKey) return;
  const response = await requestApi({
    apiBaseUrl: config.apiBaseUrl,
    path: "/api/endpoints/devices/heartbeat",
    method: "POST",
    endpointKey: config.endpointKey,
    body: {
      hostname: config.hostname,
      extensionVersion: chrome.runtime.getManifest().version,
      extensionActive: true,
      policyVersion: config.policyVersion || null
    }
  });
  if (response.ok && response.payload?.data?.policyVersion) {
    await chrome.storage.local.set({ policyVersion: response.payload.data.policyVersion });
  }
}

async function discoverAiNavigation(tabId, url, title) {
  if (url.startsWith("chrome-extension://") || url.startsWith("edge-extension://")) return;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return;

  const config = await getConfig();
  if (config.enabled === false || !config.endpointKey || !config.hostname) return;
  const patterns = Array.isArray(config.shadowAiPatterns) ? config.shadowAiPatterns : [];
  const isCandidate = LOCAL_AI_DOMAINS.some(domain => domainMatches(parsed.hostname, domain))
    || patterns.some(item => domainMatches(parsed.hostname, item.pattern));
  if (!isCandidate) return;

  const key = `${tabId}:${parsed.hostname}:${parsed.pathname}`;
  const previous = recentDiscoveries.get(key) || 0;
  if (Date.now() - previous < 30000) return;
  recentDiscoveries.set(key, Date.now());

  const response = await requestApi({
    apiBaseUrl: config.apiBaseUrl,
    path: "/api/endpoints/shadow-ai/discover",
    method: "POST",
    endpointKey: config.endpointKey,
    body: {
      hostname: config.hostname,
      url: url.slice(0, 1000),
      pageTitle: String(title || "").slice(0, 500),
      browser: navigator.userAgent.includes("Edg/") ? "Edge" : "Chrome"
    }
  });
  if (!response.ok || !response.payload?.data?.shouldBlock) return;

  const blockedUrl = chrome.runtime.getURL("blocked.html")
    + `?domain=${encodeURIComponent(parsed.hostname)}`
    + `&decision=${encodeURIComponent(response.payload.data.decision || "Block")}`;
  await chrome.tabs.update(tabId, { url: blockedUrl });
}

function domainMatches(hostname, pattern) {
  const host = String(hostname || "").toLowerCase();
  let value = String(pattern || "").trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "").split("/")[0];
  value = value.replace(/^\*\./, "").replace(/\*+$/, "").replace(/\.+$/, "");
  return Boolean(value) && (host === value || host.endsWith(`.${value}`));
}
