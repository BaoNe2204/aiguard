(() => {
  const SITE = location.hostname.includes("gemini")
    ? "Gemini"
    : location.hostname.includes("claude")
      ? "Claude"
      : location.hostname.includes("copilot")
        ? "Copilot"
        : "ChatGPT";
  const MAX_FILE_BYTES = 25 * 1024 * 1024;
  const replayButtons = new WeakSet();
  const replayFileInputs = new WeakSet();
  let submitInProgress = false;

  async function getConfig() {
    return chrome.storage.local.get([
      "apiBaseUrl", "hostname", "endpointKey", "offlineCriticalBlock", "enabled"
    ]);
  }

  async function sendApi(method, path, body, file) {
    const response = await chrome.runtime.sendMessage({
      type: "AIGUARD_API", method, path, body, file
    });
    if (!response?.ok || !response.payload?.data) {
      throw new Error(response?.error || `AIGuard API failed (${response?.status || 0})`);
    }
    return response.payload.data;
  }

  async function sha256(text) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, "0")).join("");
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
  }

  async function scanText(text) {
    const config = await getConfig();
    if (config.enabled === false) return { config, result: null, disabled: true };
    if (!config.apiBaseUrl || !config.hostname || !config.endpointKey) {
      throw new Error("AIGuard chua duoc dang ky");
    }
    const result = await sendApi("POST", "/api/dlp/scan", {
      content: text,
      hostname: config.hostname,
      websiteAi: SITE
    });
    return { config, result, disabled: false };
  }

  async function recordTextEvent(text, result, eventType, businessJustification = null) {
    const config = await getConfig();
    return sendApi("POST", "/api/endpoints/events", {
      scanId: result.scanId,
      receipt: result.receipt,
      hostname: config.hostname,
      userEmail: "derived-by-server",
      browser: navigator.userAgent.slice(0, 100),
      websiteAi: SITE,
      eventType,
      originalHash: await sha256(text),
      riskScore: 0,
      riskLevel: "server",
      decision: "server",
      dataTypeMatched: "server",
      policyVersion: result.policyVersion || "server",
      businessJustification
    });
  }

  async function recordFileEvent(file, result, businessJustification = null) {
    const config = await getConfig();
    return sendApi("POST", "/api/endpoints/events", {
      scanId: result.scanId,
      receipt: result.receipt,
      hostname: config.hostname,
      userEmail: "derived-by-server",
      browser: navigator.userAgent.slice(0, 100),
      websiteAi: SITE,
      eventType: ["Block", "PendingApproval"].includes(result.decision)
        ? "FileUploadBlocked" : "FileUploadChecked",
      originalHash: result.contentHash,
      riskScore: 0,
      riskLevel: "server",
      decision: "server",
      dataTypeMatched: file.name,
      policyVersion: result.policyVersion || "server",
      businessJustification
    });
  }

  function readEditor(editor) {
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) return editor.value;
    return editor.innerText || editor.textContent || "";
  }

  function writeEditor(editor, value) {
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      const prototype = editor instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (setter) setter.call(editor, value);
      else editor.value = value;
    } else {
      editor.textContent = value;
    }
    editor.dispatchEvent(new InputEvent("input", {
      bubbles: true, inputType: "insertText", data: value
    }));
  }

  function insertAtSelection(editor, value) {
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      const start = editor.selectionStart ?? editor.value.length;
      const end = editor.selectionEnd ?? start;
      writeEditor(editor, `${editor.value.slice(0, start)}${value}${editor.value.slice(end)}`);
      editor.setSelectionRange(start + value.length, start + value.length);
      return;
    }
    editor.focus();
    const selection = window.getSelection();
    if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(value);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      editor.dispatchEvent(new InputEvent("input", {
        bubbles: true, inputType: "insertText", data: value
      }));
    } else {
      writeEditor(editor, `${readEditor(editor)}${value}`);
    }
  }

  function findVisibleEditor() {
    const selectors = [
      "#prompt-textarea",
      "textarea",
      "rich-textarea [contenteditable='true']",
      "[contenteditable='true'][role='textbox']",
      "[contenteditable='true']"
    ];
    for (const selector of selectors) {
      const visible = [...document.querySelectorAll(selector)].find(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (visible) return visible;
    }
    return null;
  }

  function editorFor(node) {
    const editor = findVisibleEditor();
    return editor && node && (node === editor || editor.contains(node)) ? editor : null;
  }

  function isSendButton(button, editor) {
    if (!(button instanceof HTMLButtonElement)) return false;
    if (button.matches("[data-testid='send-button']")) return true;
    const label = [
      button.getAttribute("aria-label"),
      button.getAttribute("data-tooltip"),
      button.title,
      button.textContent
    ].filter(Boolean).join(" ").toLowerCase();
    if (/(send|submit|gui|envoyer|senden)/i.test(label)) return true;
    return button.type === "submit" && editor instanceof Element &&
      button.form instanceof HTMLFormElement && button.form.contains(editor);
  }

  function findSendButton(editor) {
    const candidates = [
      document.querySelector("[data-testid='send-button']"),
      editor?.closest("form")?.querySelector("button[type='submit']"),
      ...document.querySelectorAll("button")
    ];
    return candidates.find(candidate => isSendButton(candidate, editor)) || null;
  }

  function notify(message, tone = "danger") {
    document.getElementById("aiguard-notification")?.remove();
    const box = document.createElement("div");
    box.id = "aiguard-notification";
    const colors = tone === "success"
      ? ["#052e20", "#16a34a"]
      : tone === "warning" ? ["#422006", "#f59e0b"] : ["#450a0a", "#ef4444"];
    Object.assign(box.style, {
      position: "fixed", zIndex: 2147483647, right: "20px", top: "20px",
      maxWidth: "430px", padding: "13px 16px", color: "white",
      border: `1px solid ${colors[1]}`, borderRadius: "10px",
      background: colors[0], boxShadow: "0 16px 40px rgba(0,0,0,.35)",
      font: "600 13px/1.5 'Segoe UI', sans-serif"
    });
    box.textContent = message;
    document.documentElement.appendChild(box);
    setTimeout(() => box.remove(), 6500);
  }

  function closeDecisionModal() {
    document.getElementById("aiguard-decision-overlay")?.remove();
  }

  function showDecisionModal(result, options = {}) {
    closeDecisionModal();
    return new Promise(resolve => {
      const overlay = document.createElement("div");
      overlay.id = "aiguard-decision-overlay";
      overlay.innerHTML = `
        <style>
          #aiguard-decision-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(3,7,18,.78);backdrop-filter:blur(7px);display:grid;place-items:center;padding:20px;font-family:Inter,"Segoe UI",sans-serif}
          #aiguard-decision-overlay *{box-sizing:border-box}
          .ag-dialog{width:min(680px,100%);max-height:92vh;overflow:auto;color:#e5e7eb;background:linear-gradient(160deg,#111827,#090d18);border:1px solid #334155;border-radius:18px;box-shadow:0 30px 90px rgba(0,0,0,.62);padding:22px}
          .ag-head{display:flex;align-items:center;gap:12px}.ag-logo{width:44px;height:44px;display:grid;place-items:center;border-radius:12px;background:#4f46e5;color:#fff;font-weight:900}.ag-head h2{font-size:21px;line-height:1.25;margin:2px 0 0;color:#fff}.ag-eye{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#818cf8;font-weight:700}.ag-close{margin-left:auto;border:0;background:#1f2937;color:#cbd5e1;width:32px;height:32px;border-radius:8px;cursor:pointer}
          .ag-chips{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 12px}.ag-chip{padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;background:#1f2937}.ag-risk{color:#fb7185}.ag-score{color:#fbbf24}.ag-decision{color:#a5b4fc}.ag-reason{color:#cbd5e1;font-size:13px;line-height:1.6}
          .ag-findings{display:grid;gap:8px;margin-top:14px}.ag-finding{padding:11px 12px;border:1px solid #293548;background:#0f172a;border-radius:10px}.ag-finding strong{display:block;color:#fff;font-size:13px}.ag-finding small{display:block;color:#94a3b8;margin-top:4px;line-height:1.45}
          .ag-mask{margin-top:14px}.ag-mask label,.ag-input{display:block;color:#cbd5e1;font-size:12px;font-weight:700}.ag-mask pre{white-space:pre-wrap;max-height:160px;overflow:auto;background:#020617;border:1px solid #253047;border-radius:10px;padding:12px;color:#a7f3d0;font:12px/1.5 Consolas,monospace}.ag-input{margin-top:14px}.ag-input textarea{display:block;width:100%;min-height:86px;margin-top:7px;resize:vertical;background:#020617;border:1px solid #334155;border-radius:10px;padding:11px;color:#fff;font:13px/1.5 "Segoe UI",sans-serif}
          .ag-status{margin-top:12px;padding:10px;border-radius:9px;background:#172554;color:#bfdbfe;font-size:12px}.ag-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:18px}.ag-actions button{border:1px solid #334155;background:#1f2937;color:#e5e7eb;border-radius:9px;padding:9px 12px;font-weight:700;font-size:12px;cursor:pointer}.ag-actions .primary{background:#4f46e5;border-color:#6366f1}.ag-actions .safe{background:#065f46;border-color:#10b981}.ag-actions .danger{color:#fecdd3;border-color:#9f1239}
        </style>
        <div class="ag-dialog" role="dialog" aria-modal="true">
          <div class="ag-head"><div class="ag-logo">AG</div><div><div class="ag-eye">AIGuard Control Tower</div><h2></h2></div><button class="ag-close">x</button></div>
          <div class="ag-chips"><span class="ag-chip ag-risk"></span><span class="ag-chip ag-score"></span><span class="ag-chip ag-decision"></span></div>
          <p class="ag-reason"></p><div class="ag-findings"></div>
          <div class="ag-mask" hidden><label>Du lieu sau khi che</label><pre></pre></div>
          <label class="ag-input" hidden>Ly do nghiep vu / bao cao<textarea maxlength="2000" placeholder="Nhap ly do..."></textarea></label>
          <div class="ag-status" hidden></div><div class="ag-actions"></div>
        </div>`;

      const isPending = result.decision === "PendingApproval";
      overlay.querySelector("h2").textContent = isPending
        ? "Noi dung can phe duyet"
        : result.decision === "Mask" ? "Phat hien du lieu nhay cam" : "Da chan gui du lieu";
      overlay.querySelector(".ag-risk").textContent = `Muc do: ${result.riskLevel}`;
      overlay.querySelector(".ag-score").textContent = `Diem: ${result.riskScore}/100`;
      overlay.querySelector(".ag-decision").textContent = `Xu ly: ${result.decision}`;
      overlay.querySelector(".ag-reason").textContent =
        result.policyReason || "Noi dung vi pham chinh sach bao ve du lieu doanh nghiep.";

      const findings = overlay.querySelector(".ag-findings");
      for (const match of result.matches || []) {
        const card = document.createElement("div");
        card.className = "ag-finding";
        const title = document.createElement("strong");
        title.textContent = `${match.dataType} (${match.count})`;
        const detail = document.createElement("small");
        const locations = (match.locations || []).slice(0, 5)
          .map(location => `dong ${location.line}, cot ${location.column}`).join("; ");
        detail.textContent = `${match.reason || "Du lieu nhay cam"}${locations ? ` - ${locations}` : ""}`;
        card.append(title, detail);
        findings.appendChild(card);
      }

      const mask = overlay.querySelector(".ag-mask");
      if (result.maskedContent) {
        mask.hidden = false;
        mask.querySelector("pre").textContent = result.maskedContent;
      }
      const inputLabel = overlay.querySelector(".ag-input");
      const reasonInput = inputLabel.querySelector("textarea");
      if (isPending || options.allowReport) inputLabel.hidden = false;
      const status = overlay.querySelector(".ag-status");
      const actions = overlay.querySelector(".ag-actions");
      const finish = value => {
        closeDecisionModal();
        resolve(value);
      };
      const addButton = (label, handler, className = "") => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.className = className;
        button.addEventListener("click", () => handler(button));
        actions.appendChild(button);
      };
      addButton("Sua prompt", () => finish({ action: "edit" }));
      if (result.maskedContent) addButton("Dung ban da che", () => finish({ action: "masked" }), "safe");
      if (options.allowReport && options.eventId) {
        addButton("Bao cao chan nham", async button => {
          const reason = reasonInput.value.trim();
          if (!reason) {
            status.hidden = false;
            status.textContent = "Vui long nhap ly do bao cao.";
            return;
          }
          button.disabled = true;
          try {
            await reportFalsePositive(options.eventId, result, reason);
            status.hidden = false;
            status.textContent = "Da gui bao cao den Security Admin.";
            setTimeout(() => finish({ action: "reported" }), 800);
          } catch (error) {
            status.hidden = false;
            status.textContent = error.message;
            button.disabled = false;
          }
        }, "danger");
      }
      if (isPending) {
        addButton("Gui phe duyet", () => {
          const reason = reasonInput.value.trim();
          if (!reason) {
            status.hidden = false;
            status.textContent = "Vui long nhap ly do nghiep vu.";
            return;
          }
          finish({ action: "approval", reason });
        }, "primary");
      }
      addButton("Dong", () => finish({ action: "cancel" }));
      overlay.querySelector(".ag-close").addEventListener("click", () => finish({ action: "cancel" }));
      document.documentElement.appendChild(overlay);
      if (!inputLabel.hidden) reasonInput.focus();
    });
  }

  async function reportFalsePositive(eventId, result, reason) {
    const config = await getConfig();
    return sendApi(
      "POST",
      `/api/endpoints/false-positives?hostname=${encodeURIComponent(config.hostname)}`,
      {
        endpointEventId: eventId,
        detectorName: result.matches?.[0]?.dataType || "Unknown detector",
        reason
      }
    );
  }

  async function pollApproval(approvalId, expiresAt) {
    const config = await getConfig();
    const expiration = expiresAt ? new Date(expiresAt).getTime() : Date.now() + 30 * 60 * 1000;
    const deadline = Math.min(expiration, Date.now() + 30 * 60 * 1000);
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        const approval = await sendApi(
          "GET",
          `/api/endpoints/approvals/${approvalId}?hostname=${encodeURIComponent(config.hostname)}`
        );
        if (approval.status !== "Pending") return approval;
      } catch {
        // Keep polling through temporary network failures.
      }
    }
    return { status: "Expired" };
  }

  async function evaluateText(text, eventType) {
    try {
      const { config, result, disabled } = await scanText(text);
      if (disabled) return { outcome: "allow", content: text };

      if (result.decision === "Block") {
        const event = await recordTextEvent(text, result, eventType);
        const choice = await showDecisionModal(result, { allowReport: true, eventId: event.id });
        return choice.action === "masked" && result.maskedContent
          ? { outcome: "masked", content: result.maskedContent }
          : { outcome: "blocked", content: text };
      }

      if (result.decision === "Mask" && result.maskedContent) {
        const choice = await showDecisionModal(result);
        if (choice.action !== "masked") return { outcome: "blocked", content: text };
        await recordTextEvent(text, result, eventType);
        return { outcome: "masked", content: result.maskedContent };
      }

      if (result.decision === "PendingApproval") {
        const choice = await showDecisionModal(result);
        if (choice.action === "masked" && result.maskedContent) {
          return { outcome: "masked", content: result.maskedContent };
        }
        if (choice.action !== "approval") return { outcome: "blocked", content: text };
        const event = await recordTextEvent(text, result, eventType, choice.reason);
        if (!event.approvalId) throw new Error("Backend khong tra ve ma phe duyet.");
        notify("Da gui yeu cau phe duyet. Dang cho quan ly xu ly.", "warning");
        const approval = await pollApproval(event.approvalId, event.expiresAt);
        if (approval.status === "Approved") {
          notify("Yeu cau da duoc phe duyet.", "success");
          return { outcome: "allow", content: text };
        }
        if (approval.status === "ApprovedWithMasking" && result.maskedContent) {
          notify("Da phe duyet voi du lieu duoc che.", "success");
          return { outcome: "masked", content: result.maskedContent };
        }
        notify(`Yeu cau phe duyet: ${approval.status}.`);
        return { outcome: "blocked", content: text };
      }

      await recordTextEvent(text, result, eventType);
      return { outcome: "allow", content: text };
    } catch (error) {
      const config = await getConfig();
      notify(`AIGuard khong the xac minh thao tac: ${error.message}`);
      return {
        outcome: config.offlineCriticalBlock === false ? "allow" : "blocked",
        content: text
      };
    }
  }

  async function handleSubmit(editor, button) {
    if (submitInProgress) return;
    const text = readEditor(editor).trim();
    if (!text) return;
    submitInProgress = true;
    try {
      const evaluation = await evaluateText(text, "PromptSubmitChecked");
      if (evaluation.outcome === "blocked") return;
      if (evaluation.outcome === "masked") writeEditor(editor, evaluation.content);
      const targetButton = button || findSendButton(editor);
      if (targetButton) {
        replayButtons.add(targetButton);
        targetButton.click();
        return;
      }
      const form = editor.closest("form");
      if (form instanceof HTMLFormElement) {
        form.requestSubmit();
        return;
      }
      editor.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter", code: "Enter", bubbles: true, cancelable: true
      }));
    } finally {
      setTimeout(() => { submitInProgress = false; }, 0);
    }
  }

  document.addEventListener("paste", event => {
    const editor = editorFor(event.target);
    const text = event.clipboardData?.getData("text/plain");
    if (!editor || !text) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void evaluateText(text, "PromptPasteDetected").then(evaluation => {
      if (evaluation.outcome !== "blocked") insertAtSelection(editor, evaluation.content);
    });
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing || submitInProgress) return;
    const editor = editorFor(event.target);
    if (!editor) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void handleSubmit(editor, null);
  }, true);

  document.addEventListener("click", event => {
    const button = event.target?.closest?.("button");
    const editor = findVisibleEditor();
    if (!editor || !isSendButton(button, editor)) return;
    if (replayButtons.has(button)) {
      replayButtons.delete(button);
      return;
    }
    if (!readEditor(editor).trim()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void handleSubmit(editor, button);
  }, true);

  document.addEventListener("change", event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
    if (replayFileInputs.has(input)) {
      replayFileInputs.delete(input);
      return;
    }
    const files = [...(input.files || [])];
    if (!files.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void scanFilesBeforeUpload(input, files);
  }, true);

  async function scanFilesBeforeUpload(input, files) {
    const config = await getConfig();
    if (config.enabled === false) return replayFileSelection(input, files);
    try {
      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} vuot qua 25 MB`);
        const result = await sendApi("POST", "/api/dlp/files/scan", null, {
          name: file.name,
          type: file.type,
          base64: arrayBufferToBase64(await file.arrayBuffer())
        });
        if (result.decision === "Block") {
          const event = await recordFileEvent(file, result);
          input.value = "";
          await showDecisionModal(result, {
            allowReport: true,
            eventId: event.id
          });
          return;
        }
        if (result.decision === "PendingApproval") {
          input.value = "";
          const choice = await showDecisionModal(result);
          if (choice.action !== "approval") return;
          const event = await recordFileEvent(file, result, choice.reason);
          if (!event.approvalId) throw new Error("Backend khong tra ve ma phe duyet.");
          notify(`Tep ${file.name} dang cho phe duyet.`, "warning");
          const approval = await pollApproval(event.approvalId, event.expiresAt);
          if (approval.status !== "Approved") {
            notify(`Khong the upload tep: ${approval.status}.`);
            return;
          }
          notify(`Tep ${file.name} da duoc phe duyet.`, "success");
          continue;
        }
        if (result.decision === "Mask") {
          await recordFileEvent(file, result);
          input.value = "";
          await showDecisionModal({
            ...result,
            decision: "Block",
            policyReason: "File contains sensitive data. Automatic file rewriting is not supported, so upload is blocked."
          });
          return;
        }
        await recordFileEvent(file, result);
      }
      replayFileSelection(input, files);
      notify(`AIGuard da kiem tra ${files.length} tep.`, "success");
    } catch (error) {
      input.value = "";
      if (config.offlineCriticalBlock === false) {
        replayFileSelection(input, files);
        notify("Khong the quet tep; dang cho phep theo policy offline.", "warning");
      } else {
        notify(`AIGuard chan upload: ${error.message}`);
      }
    }
  }

  function replayFileSelection(input, files) {
    const transfer = new DataTransfer();
    files.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
    replayFileInputs.add(input);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
})();
