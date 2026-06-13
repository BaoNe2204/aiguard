const elements = {
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

document.addEventListener("DOMContentLoaded", loadConfiguration);
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
    "policyVersion"
  ]);

  elements.api.value = value.apiBaseUrl || "http://127.0.0.1:5185";
  elements.host.value = value.hostname || "";
  elements.email.value = value.userEmail || "";
  elements.department.value = value.departmentName || "";
  elements.key.value = value.endpointKey || "";
  elements.offline.checked = value.offlineCriticalBlock !== false;
  elements.enabled.checked = value.enabled !== false;
  elements.version.textContent = `v${chrome.runtime.getManifest().version}`;

  if (value.endpointKey) {
    showStatus(
      `Thiết bị đã đăng ký${value.policyVersion ? ` · Policy ${value.policyVersion}` : ""}`,
      "success"
    );
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

async function enroll() {
  setBusy(elements.enroll, true, "Đang đăng ký...");
  try {
    if (!elements.api.value || !elements.host.value || !elements.email.value ||
        !elements.department.value || !elements.enrollmentToken.value) {
      throw new Error("Vui lòng điền đầy đủ thông tin đăng ký");
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
    await loadConfiguration();
    showStatus("Đăng ký thành công. AIGuard đang bảo vệ trình duyệt.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    setBusy(elements.enroll, false, "Đăng ký và bật bảo vệ");
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
