const elements = {
  quickSetup: document.getElementById("quickSetup"),
  parseSetup: document.getElementById("parseSetup"),
  enrollQuick: document.getElementById("enrollQuick"),
  api: document.getElementById("api"),
  host: document.getElementById("host"),
  email: document.getElementById("email"),
  department: document.getElementById("department"),
  enrollmentToken: document.getElementById("enrollmentToken"),
  key: document.getElementById("key"),
  offline: document.getElementById("offline"),
  enabled: document.getElementById("enabled"),
  enroll: document.getElementById("enroll"),
  save: document.getElementById("save"),
  test: document.getElementById("test"),
  statusBanner: document.getElementById("statusBanner"),
  version: document.getElementById("version")
};

document.addEventListener("DOMContentLoaded", async () => {
  await loadConfiguration();
  applySetupFromUrl();
});
elements.parseSetup.addEventListener("click", parseQuickSetup);
elements.enrollQuick.addEventListener("click", enroll);
elements.enroll.addEventListener("click", enroll);
elements.save.addEventListener("click", saveConfiguration);
elements.test.addEventListener("click", testConnection);

async function loadConfiguration() {
  const value = await chrome.storage.local.get([
    "apiBaseUrl",
    "hostname",
    "userEmail",
    "departmentName",
    "endpointKey",
    "offlineCriticalBlock",
    "enabled",
    "policyVersion",
    "managedConfigApplied",
    "managedLockSettings",
    "lastEnrollmentError"
  ]);

  elements.api.value = value.apiBaseUrl || "http://127.0.0.1:5185";
  elements.host.value = value.hostname || "";
  elements.email.value = value.userEmail || "";
  elements.department.value = value.departmentName || "";
  elements.key.value = value.endpointKey || "";
  elements.offline.checked = value.offlineCriticalBlock !== false;
  elements.enabled.checked = value.enabled !== false;
  elements.version.textContent = `v${chrome.runtime.getManifest().version}`;

  setManagedLock(value.managedLockSettings === true);

  if (value.endpointKey) {
    showStatus(
      `Thiết bị đã đăng ký${value.policyVersion ? ` · Policy ${value.policyVersion}` : ""}`,
      "success"
    );
    return;
  }

  if (value.lastEnrollmentError) {
    showStatus(`Tự đăng ký chưa thành công: ${value.lastEnrollmentError}`, "error");
    return;
  }

  if (value.managedConfigApplied) {
    showStatus("Đã nhận cấu hình doanh nghiệp. Nếu chưa đăng ký, hãy kiểm tra email/phòng ban hoặc token triển khai.", "info");
  }
}

function setManagedLock(locked) {
  const fields = [
    elements.quickSetup,
    elements.api,
    elements.host,
    elements.email,
    elements.department,
    elements.enrollmentToken,
    elements.offline,
    elements.enabled
  ];
  for (const field of fields) field.disabled = locked;
  elements.parseSetup.disabled = locked;
  elements.enrollQuick.disabled = locked;
  elements.enroll.disabled = locked;

  if (locked) {
    showStatus("Cấu hình extension đang được quản lý bởi chính sách doanh nghiệp.", "info");
  }
}

async function requestOriginPermission(apiUrl) {
  const url = new URL(apiUrl.trim());
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("API URL phải sử dụng HTTP hoặc HTTPS");
  }

  const originPattern = `${url.origin}/*`;
  const alreadyGranted = await chrome.permissions.contains({ origins: [originPattern] });
  if (alreadyGranted) return true;
  return chrome.permissions.request({ origins: [originPattern] });
}

function applySetupFromUrl() {
  const raw = [
    location.search.startsWith("?") ? location.search.slice(1) : "",
    location.hash.startsWith("#") ? location.hash.slice(1) : ""
  ].filter(Boolean).join("&");
  if (!raw) return;

  const params = new URLSearchParams(raw);
  const payload = {
    apiBaseUrl: params.get("api") || params.get("apiBaseUrl"),
    enrollmentToken: params.get("token") || params.get("enrollmentToken"),
    userEmail: params.get("email") || params.get("userEmail"),
    departmentName: params.get("department") || params.get("departmentName"),
    hostname: params.get("host") || params.get("hostname")
  };
  applySetupPayload(payload);
  if (params.get("auto") === "1") enroll();
}

function parseQuickSetup() {
  try {
    const payload = extractSetupPayload(elements.quickSetup.value);
    applySetupPayload(payload);
    showStatus("Đã tự điền thông tin triển khai. Kiểm tra lại email rồi bấm đăng ký.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  }
}

function extractSetupPayload(rawValue) {
  const raw = rawValue.trim();
  if (!raw) throw new Error("Vui lòng dán token, link hoặc lệnh triển khai.");

  if (raw.startsWith("{")) {
    const parsed = JSON.parse(raw);
    return {
      apiBaseUrl: parsed.api || parsed.apiBaseUrl,
      enrollmentToken: parsed.token || parsed.enrollmentToken,
      userEmail: parsed.email || parsed.userEmail,
      departmentName: parsed.department || parsed.departmentName,
      hostname: parsed.host || parsed.hostname
    };
  }

  try {
    const url = new URL(raw);
    const params = url.searchParams;
    return {
      apiBaseUrl: params.get("api") || params.get("apiBaseUrl"),
      enrollmentToken: params.get("token") || params.get("enrollmentToken"),
      userEmail: params.get("email") || params.get("userEmail"),
      departmentName: params.get("department") || params.get("departmentName"),
      hostname: params.get("host") || params.get("hostname")
    };
  } catch {
    // Not a URL; continue parsing command/text.
  }

  const payload = {
    apiBaseUrl: readArgument(raw, "api") || readArgument(raw, "apiBaseUrl"),
    enrollmentToken: readArgument(raw, "token") || readArgument(raw, "enrollmentToken"),
    userEmail: readArgument(raw, "email") || readArgument(raw, "userEmail"),
    departmentName: readArgument(raw, "department") || readArgument(raw, "departmentName"),
    hostname: readArgument(raw, "host") || readArgument(raw, "hostname")
  };

  if (!payload.enrollmentToken && !raw.includes(" ") && raw.length >= 24) {
    payload.enrollmentToken = raw;
  }

  if (!payload.apiBaseUrl && /https?:\/\/[^\s"']+/i.test(raw)) {
    payload.apiBaseUrl = raw.match(/https?:\/\/[^\s"']+/i)?.[0];
  }

  if (!Object.values(payload).some(Boolean)) {
    throw new Error("Không đọc được thông tin triển khai từ nội dung đã dán.");
  }
  return payload;
}

function readArgument(raw, name) {
  const pattern = new RegExp(`--${name}\\s+(?:"([^"]+)"|'([^']+)'|([^\\s]+))`, "i");
  const match = raw.match(pattern);
  return match ? (match[1] || match[2] || match[3] || "").trim() : "";
}

function applySetupPayload(payload) {
  if (payload.apiBaseUrl) elements.api.value = payload.apiBaseUrl;
  if (payload.enrollmentToken) elements.enrollmentToken.value = payload.enrollmentToken;
  if (payload.userEmail) elements.email.value = payload.userEmail.toLowerCase();
  if (payload.departmentName) elements.department.value = payload.departmentName;
  if (payload.hostname) elements.host.value = payload.hostname;
}

async function enroll() {
  setBusy(elements.enroll, true, "Đang đăng ký...");
  setBusy(elements.enrollQuick, true, "Đang đăng ký...");
  try {
    if (!elements.api.value || !elements.email.value ||
        !elements.department.value || !elements.enrollmentToken.value) {
      throw new Error("Vui lòng điền API URL, email, phòng ban và enrollment token.");
    }

    const granted = await requestOriginPermission(elements.api.value);
    if (!granted) throw new Error("Bạn chưa cấp quyền kết nối đến Backend API");

    const response = await chrome.runtime.sendMessage({
      type: "AIGUARD_ENROLL",
      body: {
        apiBaseUrl: elements.api.value,
        hostname: elements.host.value,
        userEmail: elements.email.value,
        departmentName: elements.department.value,
        enrollmentToken: elements.enrollmentToken.value
      }
    });

    if (!response?.ok) throw new Error(response?.error || "Đăng ký thiết bị thất bại");
    elements.enrollmentToken.value = "";
    elements.quickSetup.value = "";
    await loadConfiguration();
    showStatus("Đăng ký thành công. AIGuard đang bảo vệ trình duyệt.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    setBusy(elements.enroll, false, "Đăng ký và bật bảo vệ");
    setBusy(elements.enrollQuick, false, "Đăng ký ngay");
  }
}

async function saveConfiguration() {
  setBusy(elements.save, true, "Đang lưu...");
  try {
    const granted = await requestOriginPermission(elements.api.value);
    if (!granted) throw new Error("Bạn chưa cấp quyền kết nối đến Backend API");

    const apiBaseUrl = new URL(elements.api.value.trim());
    await chrome.storage.local.set({
      apiBaseUrl: apiBaseUrl.origin + apiBaseUrl.pathname.replace(/\/+$/, ""),
      hostname: elements.host.value.trim(),
      userEmail: elements.email.value.trim().toLowerCase(),
      departmentName: elements.department.value.trim(),
      endpointKey: elements.key.value.trim(),
      offlineCriticalBlock: elements.offline.checked,
      enabled: elements.enabled.checked
    });
    showStatus("Đã lưu cấu hình.", "success");
    return true;
  } catch (error) {
    showStatus(error.message, "error");
    return false;
  } finally {
    setBusy(elements.save, false, "Lưu cấu hình");
  }
}

async function testConnection() {
  setBusy(elements.test, true, "Đang kiểm tra...");
  try {
    if (!await saveConfiguration()) return;
    const response = await chrome.runtime.sendMessage({ type: "AIGUARD_TEST" });
    if (!response?.ok) throw new Error(response?.error || "Không thể kết nối Backend API");

    const policy = response.payload?.data;
    showStatus(
      `Kết nối thành công${policy?.version ? ` · Policy ${policy.version}` : ""}`,
      "success"
    );
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    setBusy(elements.test, false, "Kiểm tra kết nối");
  }
}

function showStatus(message, tone) {
  elements.statusBanner.textContent = message;
  elements.statusBanner.className = `status-banner ${tone}`;
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = label;
}
