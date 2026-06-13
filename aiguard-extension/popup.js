const ui = {
  enabled: document.getElementById("enabled"),
  protectionCard: document.getElementById("protectionCard"),
  protectionIcon: document.getElementById("protectionIcon"),
  protectionTitle: document.getElementById("protectionTitle"),
  protectionDescription: document.getElementById("protectionDescription"),
  hostname: document.getElementById("hostname"),
  userEmail: document.getElementById("userEmail"),
  policyVersion: document.getElementById("policyVersion"),
  apiBaseUrl: document.getElementById("apiBaseUrl"),
  testResult: document.getElementById("testResult"),
  test: document.getElementById("test"),
  settings: document.getElementById("settings"),
  version: document.getElementById("version")
};

document.addEventListener("DOMContentLoaded", loadStatus);
ui.enabled.addEventListener("change", toggleProtection);
ui.test.addEventListener("click", testConnection);
ui.settings.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "AIGUARD_OPEN_OPTIONS" });
  window.close();
});

async function loadStatus() {
  const status = await chrome.runtime.sendMessage({ type: "AIGUARD_STATUS" });
  ui.enabled.checked = status.enabled;
  ui.hostname.textContent = status.hostname || "Chưa đăng ký";
  ui.userEmail.textContent = status.userEmail || "—";
  ui.policyVersion.textContent = status.policyVersion || "—";
  ui.apiBaseUrl.textContent = status.apiBaseUrl || "—";
  ui.apiBaseUrl.title = status.apiBaseUrl || "";
  ui.version.textContent = `AIGuard Extension v${status.version}`;

  if (!status.configured) {
    setProtectionState("error", "Chưa đăng ký", "Mở cấu hình và nhập enrollment token.");
  } else if (!status.enabled) {
    setProtectionState("disabled", "Bảo vệ đang tắt", "Prompt và file sẽ không được quét.");
  } else {
    setProtectionState("success", "AIGuard đang bảo vệ", "Prompt và file được kiểm tra trước khi gửi.");
  }
}

async function toggleProtection() {
  await chrome.storage.local.set({ enabled: ui.enabled.checked });
  await loadStatus();
}

async function testConnection() {
  ui.test.disabled = true;
  ui.test.textContent = "Đang kiểm tra...";
  ui.testResult.className = "popup-result hidden";

  const response = await chrome.runtime.sendMessage({ type: "AIGUARD_TEST" });
  if (response?.ok) {
    const policy = response.payload?.data;
    ui.testResult.textContent = `Kết nối thành công${policy?.version ? ` · ${policy.version}` : ""}`;
    ui.testResult.className = "popup-result success";
    if (policy?.version) ui.policyVersion.textContent = policy.version;
  } else {
    ui.testResult.textContent = response?.error || "Không thể kết nối Backend API";
    ui.testResult.className = "popup-result error";
  }

  ui.test.disabled = false;
  ui.test.textContent = "Kiểm tra";
}

function setProtectionState(tone, title, description) {
  ui.protectionCard.className = `protection-card ${tone}`;
  ui.protectionIcon.textContent = tone === "success" ? "✓" : tone === "disabled" ? "—" : "!";
  ui.protectionTitle.textContent = title;
  ui.protectionDescription.textContent = description;
}
