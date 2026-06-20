const elements = {
  api: document.getElementById("api"),
  host: document.getElementById("host"),
  email: document.getElementById("email"),
  emailOptions: document.getElementById("emailOptions"),
  emailList: document.getElementById("emailList"),
  department: document.getElementById("department"),
  enrollmentToken: document.getElementById("enrollmentToken"),
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
  if (elements.enrollmentToken.value) {
    await refreshTokenUsers();
  }
});
elements.enroll.addEventListener("click", enroll);
elements.save.addEventListener("click", saveConfiguration);
elements.test.addEventListener("click", testConnection);

// Show a selectable email list after the key is entered, then map department automatically.
elements.enrollmentToken.addEventListener("input", refreshTokenUsers);
elements.api.addEventListener("input", refreshTokenUsers);
elements.email.addEventListener("input", () => {
  const selectedEmail = elements.email.value.trim();
  const found = tokenUsersList.find(u => u.email.trim().toLowerCase() === selectedEmail.trim().toLowerCase());
  if (found && found.departmentName) {
    elements.department.value = found.departmentName;
  } else {
    elements.department.value = "";
  }
  renderEmailList();
});


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
    elements.api,
    elements.host,
    elements.email,
    elements.department,
    elements.enrollmentToken,
    elements.offline,
    elements.enabled
  ];
  for (const field of fields) field.disabled = locked;
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
    let urlStr = raw;
    if (urlStr.includes("<") || urlStr.includes(">")) {
      urlStr = urlStr.replace(/<([^>]+)>/g, "$1");
    }
    const url = new URL(urlStr);
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

async function applySetupPayload(payload) {
  if (payload.apiBaseUrl) elements.api.value = payload.apiBaseUrl;
  if (payload.enrollmentToken) elements.enrollmentToken.value = payload.enrollmentToken;

  if (payload.userEmail) {
    const cleanedEmail = payload.userEmail.replace(/[<>]/g, "").toLowerCase();
    if (cleanedEmail !== "employee@company.com" && cleanedEmail !== "nhanvien@company.com") {
      elements.email.value = cleanedEmail;
    } else {
      elements.email.value = "";
    }
  } else {
    elements.email.value = "";
  }

  if (payload.departmentName) {
    const cleanedDept = payload.departmentName.replace(/[<>]/g, "");
    if (cleanedDept !== "department") {
      elements.department.value = cleanedDept;
    }
  } else {
    elements.department.value = "";
  }

  if (payload.hostname) elements.host.value = payload.hostname;

  await refreshTokenUsers();
}

async function enroll() {
  setBusy(elements.enroll, true, "Đang đăng ký...");
  try {
    if (!elements.api.value || !elements.email.value || !elements.enrollmentToken.value) {
      throw new Error("Vui lòng điền API URL, chọn email và nhập key đăng ký.");
    }

    const granted = await requestOriginPermission(elements.api.value);
    if (!granted) throw new Error("Bạn chưa cấp quyền kết nối đến Backend API");

    let finalHost = elements.host.value.trim();

    const response = await chrome.runtime.sendMessage({
      type: "AIGUARD_ENROLL",
      body: {
        apiBaseUrl: elements.api.value,
        hostname: finalHost,
        userEmail: elements.email.value.replace(/[<>]/g, "").trim().toLowerCase(),
        departmentName: elements.department.value.replace(/[<>]/g, "").trim(),
        enrollmentToken: elements.enrollmentToken.value.replace(/\s/g, "")
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

let tokenUsersList = [];

async function refreshTokenUsers() {
  const token = elements.enrollmentToken.value.trim();
  const api = elements.api.value.trim();
  if (!token || !api) {
    tokenUsersList = [];
    updateEmailDatalist();
    showStatus("Dán key để tải danh sách email.", "info");
    return;
  }

  try {
    showStatus("Đang tải danh sách email từ key...", "info");
    const url = `${api.replace(/\/+$/, "")}/api/endpoints/deployment/token-users?token=${encodeURIComponent(token)}`;
    const response = await fetch(url);
    const json = await response.json().catch(() => null);
    const payload = json?.data ?? json?.payload ?? null;
    const success = json?.success ?? json?.ok ?? false;
    const message = json?.message ?? json?.error ?? "";
    if (!response.ok) {
      throw new Error(message || `Không thể tải danh sách tài khoản cho key này (${response.status}).`);
    }
    if (success && Array.isArray(payload)) {
      tokenUsersList = payload;
      updateEmailDatalist();
      if (tokenUsersList.length > 0) {
        showStatus(`Đã tải danh sách ${tokenUsersList.length} nhân viên từ key. Hãy chọn Email bên dưới.`, "success");
      } else {
        showStatus("Key hợp lệ nhưng danh sách email đang trống.", "warning");
      }
    } else {
      tokenUsersList = [];
      updateEmailDatalist();
      throw new Error(message || "API không trả về danh sách email hợp lệ.");
    }
  } catch (err) {
    console.error("Could not fetch token users", err);
    tokenUsersList = [];
    updateEmailDatalist();
    showStatus(err instanceof Error ? err.message : String(err), "error");
  }
}

function updateEmailDatalist() {
  if (tokenUsersList.length > 0) {
    elements.emailOptions.innerHTML = "";
    elements.emailList.classList.remove("hidden");

    for (const u of tokenUsersList) {
      if (u.email) {
        const option = document.createElement("option");
        option.value = u.email;
        elements.emailOptions.appendChild(option);
      }
    }

    const currentVal = elements.email.value.trim().toLowerCase();
    const matchesCurrent = tokenUsersList.find(u => u.email.trim().toLowerCase() === currentVal);
    if (matchesCurrent) {
      elements.email.value = matchesCurrent.email;
      elements.department.value = matchesCurrent.departmentName || "";
    } else {
      if (elements.department.readOnly) elements.department.value = "";
    }
    renderEmailList();
  } else {
    elements.emailOptions.innerHTML = "";
    elements.emailList.innerHTML = "";
    elements.emailList.classList.add("hidden");
  }
}

function renderEmailList() {
  if (!elements.emailList) return;
  const filter = elements.email.value.trim().toLowerCase();
  const matches = tokenUsersList.filter(u => {
    const email = u.email.trim().toLowerCase();
    return !filter || email.includes(filter);
  });

  elements.emailList.innerHTML = "";
  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "text-sm text-zinc-400";
    empty.textContent = tokenUsersList.length > 0
      ? "Không có email phù hợp."
      : "Dán key để tải danh sách email.";
    elements.emailList.appendChild(empty);
    elements.emailList.classList.remove("hidden");
    return;
  }

  for (const user of matches.slice(0, 24)) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = user.email;
    button.addEventListener("click", () => {
      elements.email.value = user.email;
      elements.department.value = user.departmentName || "";
      elements.email.focus();
      renderEmailList();
    });
    elements.emailList.appendChild(button);
  }

  elements.emailList.classList.remove("hidden");
}
