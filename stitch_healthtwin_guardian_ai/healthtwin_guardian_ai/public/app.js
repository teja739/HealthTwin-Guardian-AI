const state = {
  challengeToken: "",
  sessionToken: localStorage.getItem("healthtwin_session") || "",
  language: localStorage.getItem("healthtwin_language") || "en",
  dashboard: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(state.sessionToken ? { authorization: `Bearer ${state.sessionToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
};

const showNotice = (message, tone = "normal") => {
  const notice = $("#notice");
  if (!notice) return;
  notice.textContent = message;
  notice.style.color = tone === "error" ? "var(--red)" : "var(--teal)";
  if (message) setTimeout(() => (notice.textContent = ""), 3200);
};

const setAuthStep = (step) => {
  $("#login-card").classList.toggle("hidden", step !== "login");
  $("#totp-card").classList.toggle("hidden", step !== "totp");
};

const showDashboard = async () => {
  $("#auth-view").classList.add("hidden");
  $("#dashboard-view").classList.remove("hidden");
  await loadDashboard();
};

const showAuth = () => {
  $("#dashboard-view").classList.add("hidden");
  $("#auth-view").classList.remove("hidden");
  setAuthStep("login");
};

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(date);
};

const initHealth = async () => {
  try {
    const health = await api("/api/health", { headers: {} });
    $("#api-status").textContent = health.ok ? "API + database ready" : "API unavailable";
  } catch {
    $("#api-status").textContent = "API unavailable";
  }
};

const renderQr = (otpauthUri) => {
  const canvas = $("#qr-canvas");
  if (window.QRCode?.toCanvas) {
    window.QRCode.toCanvas(canvas, otpauthUri, {
      width: 210,
      margin: 2,
      color: { dark: "#101827", light: "#ffffff" },
    });
  } else {
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#101827";
    context.font = "14px Inter";
    context.fillText("QR library loading", 20, 40);
  }
};

const handleLogin = async (event) => {
  event.preventDefault();
  const email = $("#email").value.trim();
  const password = $("#password").value;

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: {},
    });

    state.challengeToken = data.challengeToken;
    setAuthStep("totp");

    $("#enrollment-block").classList.toggle("hidden", !data.totp.enrollmentRequired);
    if (data.totp.enrollmentRequired) {
      $("#manual-secret").textContent = data.totp.secret;
      renderQr(data.totp.otpauthUri);
    }
  } catch (error) {
    alert(error.message);
  }
};

const handleTotp = async (event) => {
  event.preventDefault();
  const code = $("#totp-code").value.trim();

  try {
    const data = await api("/api/auth/totp/verify", {
      method: "POST",
      body: JSON.stringify({ challengeToken: state.challengeToken, code }),
      headers: {},
    });

    state.sessionToken = data.sessionToken;
    localStorage.setItem("healthtwin_session", state.sessionToken);
    await showDashboard();
  } catch (error) {
    alert(error.message);
  }
};

const loadDashboard = async () => {
  try {
    const data = await api(`/api/dashboard?lang=${encodeURIComponent(state.language)}`);
    state.dashboard = data;
    renderDashboard(data);
  } catch (error) {
    localStorage.removeItem("healthtwin_session");
    state.sessionToken = "";
    showAuth();
    if (error.message !== "Authentication required") alert(error.message);
  }
};

const renderLanguages = (languages) => {
  const select = $("#language-select");
  select.innerHTML = languages
    .map((language) => `<option value="${language.code}">${language.name}</option>`)
    .join("");
  select.value = state.language;
};

const renderDashboard = (data) => {
  const { patient, vitals, metrics, medications, suggestions, records, languages } = data;
  renderLanguages(languages);

  $("#dashboard-title").textContent = `${patient.fullName}'s HealthTwin`;
  $("#health-score").textContent = metrics.healthScore;
  $("#score-ring-value").style.strokeDashoffset = `${301.59 - (301.59 * metrics.healthScore) / 100}`;
  $("#overview-copy").textContent =
    `${patient.fullName}'s digital twin is tracking ${metrics.medicineCount} daily medicines, ` +
    `${vitals.heart_rate} BPM heart rate, ${vitals.blood_pressure} blood pressure, and ${metrics.riskLevel.toLowerCase()} risk today.`;
  $("#sync-chip").textContent = `Twin sync ${metrics.twinSync}%`;
  $("#risk-chip").textContent = metrics.riskLevel;
  $("#adherence-chip").textContent = `${metrics.adherenceAverage}%`;

  $("#vitals-grid").innerHTML = [
    ["Heart Rate", `${vitals.heart_rate} BPM`],
    ["Blood Pressure", vitals.blood_pressure],
    ["Glucose", `${vitals.glucose_mg_dl} mg/dL`],
    ["SpO2", `${vitals.spo2}%`],
    ["Sleep", `${vitals.sleep_score}%`],
    ["Stress", vitals.stress_level],
  ]
    .map(([label, value]) => `<div class="vital-card"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  $("#metrics-grid").innerHTML = [
    ["Medicines", metrics.medicineCount],
    ["Taken Today", metrics.completedToday],
    ["Adherence", `${metrics.adherenceAverage}%`],
    ["Last Sync", formatDate(vitals.recorded_at)],
  ]
    .map(([label, value]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");

  $("#patient-details").innerHTML = [
    ["Full Name", patient.fullName],
    ["Date of Birth", formatDate(patient.dateOfBirth)],
    ["Gender", patient.gender],
    ["Blood Group", patient.bloodGroup],
    ["Height", `${patient.heightCm} cm`],
    ["Weight", `${patient.weightKg} kg`],
    ["Insurance ID", patient.insuranceId],
    ["Last Visit", formatDate(patient.lastVisit)],
  ]
    .map(([term, description]) => `<div><dt>${term}</dt><dd>${description}</dd></div>`)
    .join("");

  $("#care-safety").innerHTML = [
    ["Primary Condition", patient.primaryCondition],
    ["Allergies", patient.allergies.join(", ")],
    ["Emergency Contact", `${patient.emergencyContact.name} · ${patient.emergencyContact.phone}`],
    ["Care Team", patient.careTeam.join(", ")],
    ["Recent Record", records[0]?.summary || "No recent records found."],
  ]
    .map(([title, body]) => `<div class="stack-item"><strong>${title}</strong><span>${body}</span></div>`)
    .join("");

  $("#medicine-list").innerHTML = medications.map(renderMedicine).join("");
  $("#suggestion-list").innerHTML = suggestions.map(renderSuggestion).join("");
};

const renderMedicine = (medicine) => `
  <article class="medicine-card">
    <div>
      <h3>${medicine.name}</h3>
      <div class="medicine-meta">
        <span class="chip">${medicine.dosage}</span>
        <span class="chip">${medicine.schedule}</span>
        <span class="chip">${medicine.timing}</span>
        <span class="chip">Adherence <strong>${medicine.adherence_percent}%</strong></span>
      </div>
      <div class="medicine-note">
        <span><strong>Purpose:</strong> ${medicine.purpose}</span>
        <span><strong>Suggestion:</strong> ${medicine.safety_note}</span>
        <span><strong>Interaction:</strong> ${medicine.interaction_risks}</span>
      </div>
    </div>
    <button class="button secondary dose-button" data-medication-id="${medicine.id}" type="button">
      <span class="material-symbols-outlined">check_circle</span>
      Mark Taken
    </button>
  </article>
`;

const renderSuggestion = (suggestion) => `
  <article class="suggestion-card">
    <span class="priority ${suggestion.priority}">${suggestion.priority}</span>
    <div>
      <span class="kicker">${suggestion.category}</span>
      <h3>${suggestion.title}</h3>
      <p>${suggestion.body}</p>
    </div>
  </article>
`;

const switchSection = (section) => {
  $$(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === section);
  });
  $$("[data-content]").forEach((content) => {
    content.classList.toggle("hidden", content.dataset.content !== section);
  });
};

const markMedicineTaken = async (id) => {
  try {
    await api(`/api/medications/${id}/checkin`, { method: "POST", body: "{}" });
    showNotice("Medicine marked as taken.");
    await loadDashboard();
  } catch (error) {
    showNotice(error.message, "error");
  }
};

const resetDemo = async () => {
  await api("/api/auth/demo-reset", { method: "POST", body: "{}", headers: {} });
  localStorage.removeItem("healthtwin_session");
  state.sessionToken = "";
  state.challengeToken = "";
  $("#totp-code").value = "";
  showAuth();
  alert("Demo 2FA enrollment reset. Sign in again to scan a fresh Authenticator QR code.");
};

const logout = async () => {
  try {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
  } catch {
    // Local logout still clears the browser session.
  }
  localStorage.removeItem("healthtwin_session");
  state.sessionToken = "";
  showAuth();
};

document.addEventListener("submit", (event) => {
  if (event.target.id === "login-form") handleLogin(event);
  if (event.target.id === "totp-form") handleTotp(event);
});

document.addEventListener("click", (event) => {
  const navButton = event.target.closest(".nav-item");
  if (navButton) switchSection(navButton.dataset.section);

  const doseButton = event.target.closest("[data-medication-id]");
  if (doseButton) markMedicineTaken(doseButton.dataset.medicationId);
});

$("#language-select")?.addEventListener("change", (event) => {
  state.language = event.target.value;
  localStorage.setItem("healthtwin_language", state.language);
  loadDashboard();
});

$("#refresh-dashboard")?.addEventListener("click", loadDashboard);
$("#logout")?.addEventListener("click", logout);
$("#reset-demo")?.addEventListener("click", resetDemo);

initHealth();
if (state.sessionToken) {
  showDashboard();
} else {
  showAuth();
}
