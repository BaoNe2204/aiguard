const params = new URLSearchParams(location.search);
document.getElementById("domain").textContent = params.get("domain") || "-";
document.getElementById("decision").textContent = params.get("decision") || "Block";
document.getElementById("back").addEventListener("click", () => history.back());
document.getElementById("settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
