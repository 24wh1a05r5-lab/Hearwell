const state = {
  aiEnabled: true,
  autoControl: true,
  emergencyMode: false,
  manualOverride: false,
  maxVolume: 80,
  currentDb: 62,
  displayedDb: 62,
  healthScore: 94,
  safeSeconds: 0,
  unsafeSeconds: 0,
  sessionSeconds: 0,
  monitoring: false,
  deviceName: "No device paired",
  bluetoothConnected: false,
  detectionMode: "Simulation",
  currentUser: null,
  lastProtectionAt: 0,
  protectionGain: 1,
  monitorError: "",
};

const storageKeys = {
  users: "hearwell-users",
  session: "hearwell-session",
  theme: "hearwell-theme",
};

const ui = {
  body: document.body,
  themeToggle: document.getElementById("themeToggle"),
  authTrigger: document.getElementById("authTrigger"),
  authModal: document.getElementById("authModal"),
  authClose: document.getElementById("authClose"),
  authTabs: document.querySelectorAll(".auth-tab"),
  authPanels: {
    login: document.getElementById("loginPanel"),
    register: document.getElementById("registerPanel"),
  },
  authFeedback: document.getElementById("authFeedback"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  sessionBadge: document.getElementById("sessionBadge"),
  activeUserName: document.getElementById("activeUserName"),
  heroDeviceName: document.getElementById("heroDeviceName"),
  heroDeviceStatus: document.getElementById("heroDeviceStatus"),
  heroAiStatus: document.getElementById("heroAiStatus"),
  liveDbHero: document.getElementById("liveDbHero"),
  protectionMode: document.getElementById("protectionMode"),
  healthScoreHero: document.getElementById("healthScoreHero"),
  deviceName: document.getElementById("deviceName"),
  deviceState: document.getElementById("deviceState"),
  currentDb: document.getElementById("currentDb"),
  healthScore: document.getElementById("healthScore"),
  maxVolumeDisplay: document.getElementById("maxVolumeDisplay"),
  zoneLabel: document.getElementById("zoneLabel"),
  zoneChip: document.getElementById("zoneChip"),
  meterProgress: document.getElementById("meterProgress"),
  meterValue: document.getElementById("meterValue"),
  aiStatusText: document.getElementById("aiStatusText"),
  aiToggle: document.getElementById("aiToggle"),
  aiToggleStatus: document.getElementById("aiToggleStatus"),
  emergencyToggle: document.getElementById("emergencyToggle"),
  overrideToggle: document.getElementById("overrideToggle"),
  autoControlToggle: document.getElementById("autoControlToggle"),
  maxVolumeRange: document.getElementById("maxVolumeRange"),
  safeTime: document.getElementById("safeTime"),
  unsafeTime: document.getElementById("unsafeTime"),
  safeBar: document.getElementById("safeBar"),
  unsafeBar: document.getElementById("unsafeBar"),
  adjustingIndicator: document.getElementById("adjustingIndicator"),
  backendStatusText: document.getElementById("backendStatusText"),
  bluetoothStatus: document.getElementById("bluetoothStatus"),
  deviceTypeLabel: document.getElementById("deviceTypeLabel"),
  listeningSession: document.getElementById("listeningSession"),
  detectionMode: document.getElementById("detectionMode"),
  bluetoothHelper: document.getElementById("bluetoothHelper"),
  connectBluetooth: document.getElementById("connectBluetooth"),
  startMonitoring: document.getElementById("startMonitoring"),
  visualizer: document.getElementById("visualizer"),
  simulateBurst: document.getElementById("simulateBurst"),
  demoMode: document.getElementById("demoMode"),
  demoMessage: document.getElementById("demoMessage"),
  alertPopup: document.getElementById("alertPopup"),
};

const chartLabels = [];
const chartPoints = [];
let soundChart;
let audioContext;
let analyser;
let micData;
let monitoringStream;
let burstFrames = 0;

function init() {
  buildVisualizer();
  bindEvents();
  restoreTheme();
  restoreUsers();
  createChart();
  updateUI();
  window.setInterval(runSimulationTick, 1000);
}

function bindEvents() {
  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.scroll);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  ui.themeToggle.addEventListener("click", toggleTheme);
  ui.authTrigger.addEventListener("click", () => setAuthModal(true));
  ui.authClose.addEventListener("click", () => setAuthModal(false));
  ui.authModal.addEventListener("click", (event) => {
    if (event.target === ui.authModal) {
      setAuthModal(false);
    }
  });

  ui.authTabs.forEach((tab) => {
    tab.addEventListener("click", () => activateAuthTab(tab.dataset.authTab));
  });

  ui.loginForm.addEventListener("submit", handleLogin);
  ui.registerForm.addEventListener("submit", handleRegister);

  ui.aiToggle.addEventListener("change", () => {
    state.aiEnabled = ui.aiToggle.checked;
    updateUI();
  });

  ui.emergencyToggle.addEventListener("change", () => {
    state.emergencyMode = ui.emergencyToggle.checked;
    updateUI();
  });

  ui.overrideToggle.addEventListener("change", () => {
    state.manualOverride = ui.overrideToggle.checked;
    updateUI();
  });

  ui.autoControlToggle.addEventListener("change", () => {
    state.autoControl = ui.autoControlToggle.checked;
    updateUI();
  });

  ui.maxVolumeRange.addEventListener("input", () => {
    state.maxVolume = Number(ui.maxVolumeRange.value);
    updateUI();
  });

  ui.connectBluetooth.addEventListener("click", connectBluetoothDevice);
  ui.startMonitoring.addEventListener("click", startMonitoring);
  ui.simulateBurst.addEventListener("click", () => {
    burstFrames = 10;
    ui.demoMode.textContent = "Burst";
    ui.demoMessage.textContent = "A loud burst has been injected to test automatic protection.";
  });
}

function restoreTheme() {
  const theme = localStorage.getItem(storageKeys.theme);
  if (theme === "light") {
    ui.body.classList.add("light-mode");
  }
}

function toggleTheme() {
  ui.body.classList.toggle("light-mode");
  localStorage.setItem(storageKeys.theme, ui.body.classList.contains("light-mode") ? "light" : "dark");
}

function restoreUsers() {
  const session = JSON.parse(localStorage.getItem(storageKeys.session) || "null");
  if (session) {
    state.currentUser = session;
  }
}

function activateAuthTab(tabName) {
  ui.authTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.authTab === tabName));
  ui.authPanels.login.classList.toggle("active", tabName === "login");
  ui.authPanels.register.classList.toggle("active", tabName === "register");
}

function setAuthModal(open) {
  ui.authModal.classList.toggle("open", open);
  ui.authModal.setAttribute("aria-hidden", String(!open));
}

function getUsers() {
  return JSON.parse(localStorage.getItem(storageKeys.users) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(storageKeys.users, JSON.stringify(users));
}

function saveSession(user) {
  localStorage.setItem(storageKeys.session, JSON.stringify(user));
  state.currentUser = user;
}

function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim().toLowerCase();
  const password = document.getElementById("registerPassword").value.trim();
  const users = getUsers();

  if (users.some((user) => user.email === email)) {
    ui.authFeedback.textContent = "This email is already registered. Please login instead.";
    activateAuthTab("login");
    return;
  }

  const newUser = { name, email, password };
  users.push(newUser);
  saveUsers(users);
  saveSession({ name, email });
  ui.authFeedback.textContent = "Registration successful. Your hearing dashboard is now personalized.";
  ui.registerForm.reset();
  setAuthModal(false);
  updateUI();
}

function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value.trim();
  const user = getUsers().find((entry) => entry.email === email && entry.password === password);

  if (!user) {
    ui.authFeedback.textContent = "Login failed. Please check your email and password.";
    return;
  }

  saveSession({ name: user.name, email: user.email });
  ui.authFeedback.textContent = "Login successful. Personalized protection is active.";
  ui.loginForm.reset();
  setAuthModal(false);
  updateUI();
}

function buildVisualizer() {
  for (let index = 0; index < 16; index += 1) {
    const bar = document.createElement("span");
    bar.className = "bar";
    bar.style.animationDelay = `${index * 0.08}s`;
    ui.visualizer.appendChild(bar);
  }
}

function createChart() {
  const ctx = document.getElementById("soundChart");
  soundChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "Detected dB",
          data: chartPoints,
          borderColor: "#5ce1e6",
          backgroundColor: "rgba(92, 225, 230, 0.18)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#96afc8" },
          grid: { display: false },
        },
        y: {
          min: 0,
          max: 110,
          ticks: { color: "#96afc8" },
          grid: { color: "rgba(150, 175, 200, 0.15)" },
        },
      },
    },
  });
}

async function connectBluetoothDevice() {
  if (!navigator.bluetooth) {
    state.bluetoothConnected = false;
    state.deviceName = "Browser does not support Web Bluetooth";
    state.detectionMode = "Simulation";
    state.monitorError = "Web Bluetooth is not available in this browser.";
    ui.bluetoothHelper.textContent = "This browser does not support Web Bluetooth, so HearWell will stay in simulation mode.";
    updateUI();
    return;
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["battery_service"],
    });

    state.bluetoothConnected = true;
    state.deviceName = device.name || "Bluetooth audio device";
    state.detectionMode = "Bluetooth + microphone";
    state.monitorError = "";
    ui.bluetoothHelper.textContent = "Bluetooth device paired. HearWell is trying to start live monitoring now.";
    updateUI();
    await startMonitoring(true);
  } catch (error) {
    state.bluetoothConnected = false;
    state.monitorError = "Bluetooth pairing was cancelled or blocked.";
    ui.bluetoothHelper.textContent = "Bluetooth pairing was cancelled or blocked. You can still use microphone monitoring.";
    updateUI();
  }
}

async function startMonitoring(autoStarted = false) {
  if (state.monitoring) {
    ui.bluetoothHelper.textContent = "Live monitoring is already running.";
    updateUI();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    state.monitorError = "Microphone access is not supported in this browser.";
    ui.bluetoothHelper.textContent = "Microphone monitoring is not supported in this browser.";
    updateUI();
    return;
  }

  if (!window.isSecureContext) {
    state.monitorError = "Live monitoring requires a secure page such as http://localhost or HTTPS.";
    ui.bluetoothHelper.textContent = "Open this app on http://localhost:3000 or HTTPS, then allow microphone access.";
    updateUI();
    return;
  }

  try {
    monitoringStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    micData = new Uint8Array(analyser.fftSize);

    const source = audioContext.createMediaStreamSource(monitoringStream);
    source.connect(analyser);

    state.monitoring = true;
    state.monitorError = "";
    state.detectionMode = state.bluetoothConnected ? "Bluetooth + microphone" : "Microphone monitor";
    ui.bluetoothHelper.textContent = "Microphone monitoring is live. HearWell now watches sound exposure every second.";
    ui.startMonitoring.textContent = "Monitoring Live";
    ui.startMonitoring.disabled = true;
    updateUI();
  } catch (error) {
    state.monitorError = "Microphone permission was denied or blocked.";
    ui.bluetoothHelper.textContent = autoStarted
      ? "Bluetooth connected, but microphone permission is still needed to start monitoring."
      : "Microphone permission is required for live sound detection.";
    updateUI();
  }
}

function readMicrophoneDb() {
  if (!analyser || !micData) {
    return null;
  }

  analyser.getByteTimeDomainData(micData);
  let sumSquares = 0;
  for (let index = 0; index < micData.length; index += 1) {
    const normalized = (micData[index] - 128) / 128;
    sumSquares += normalized * normalized;
  }

  const rms = Math.sqrt(sumSquares / micData.length);
  if (rms <= 0.01) {
    return 32;
  }

  const db = 20 * Math.log10(rms) + 90;
  return clamp(Math.round(db), 32, 110);
}

function runSimulationTick() {
  state.sessionSeconds += 1;

  let nextDb = readMicrophoneDb();
  if (nextDb === null) {
    const wave = 62 + Math.sin(Date.now() / 1200) * 12 + (Math.random() * 8 - 4);
    nextDb = Math.round(wave);
  }

  if (burstFrames > 0) {
    nextDb = Math.max(nextDb, 96 + Math.round(Math.random() * 8));
    burstFrames -= 1;
  }

  state.currentDb = clamp(nextDb, 25, 110);
  applyProtectionRules();
  updateExposureCounters();
  pushChartPoint(state.displayedDb);
  updateUI();
}

function applyProtectionRules() {
  const emergencyLimit = state.maxVolume + (state.emergencyMode ? 8 : 0);
  const isUnsafe = state.currentDb > emergencyLimit;
  const canProtect = state.aiEnabled && state.autoControl && !state.manualOverride;

  state.protectionGain = 1;
  state.displayedDb = state.currentDb;

  if (isUnsafe && canProtect) {
    const reduction = Math.min(18, Math.round((state.currentDb - emergencyLimit) * 0.7) + 4);
    state.displayedDb = Math.max(emergencyLimit - 2, state.currentDb - reduction);
    state.protectionGain = Number((state.displayedDb / state.currentDb).toFixed(2));
    state.healthScore = Math.max(55, state.healthScore - 1);
    state.lastProtectionAt = Date.now();
    showAlert();
  } else if (isUnsafe) {
    state.healthScore = Math.max(40, state.healthScore - 2);
  } else {
    state.healthScore = Math.min(100, state.healthScore + 0.4);
  }
}

function updateExposureCounters() {
  const unsafe = state.currentDb > state.maxVolume;
  if (unsafe) {
    state.unsafeSeconds += 1;
  } else {
    state.safeSeconds += 1;
  }
}

function pushChartPoint(value) {
  const now = new Date();
  chartLabels.push(now.toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }));
  chartPoints.push(value);

  if (chartLabels.length > 18) {
    chartLabels.shift();
    chartPoints.shift();
  }

  soundChart.update("none");
}

function updateUI() {
  const effectiveUser = state.currentUser?.name || "Guest";
  const zone = getZoneLabel(state.currentDb);
  const limitUnsafe = state.currentDb > state.maxVolume;
  const recentlyProtected = Date.now() - state.lastProtectionAt < 3500;

  ui.sessionBadge.textContent = effectiveUser;
  ui.activeUserName.textContent = effectiveUser;
  ui.heroDeviceName.textContent = state.bluetoothConnected ? state.deviceName : "No device";
  ui.heroDeviceStatus.textContent = state.bluetoothConnected ? "Connected" : "Ready";
  ui.heroDeviceStatus.classList.toggle("online", state.bluetoothConnected);
  ui.heroAiStatus.textContent = state.aiEnabled ? "Active" : "Paused";

  ui.deviceName.textContent = state.deviceName;
  ui.deviceState.textContent = state.bluetoothConnected ? "Bluetooth Active" : "Waiting for Bluetooth";
  ui.deviceState.classList.toggle("online", state.bluetoothConnected);
  ui.bluetoothStatus.textContent = state.bluetoothConnected ? "Paired" : "Not paired";
  ui.detectionMode.textContent = state.detectionMode;
  ui.listeningSession.textContent = formatTime(state.sessionSeconds);

  ui.currentDb.textContent = `${state.displayedDb} dB`;
  ui.liveDbHero.textContent = `${state.displayedDb} dB`;
  ui.meterValue.textContent = String(state.displayedDb);
  ui.healthScore.textContent = `${Math.round(state.healthScore)}`;
  ui.healthScoreHero.textContent = `${Math.round(state.healthScore)}`;
  ui.maxVolumeDisplay.textContent = `${state.maxVolume} dB`;
  ui.zoneLabel.textContent = zone.label;
  ui.zoneChip.textContent = zone.chip;
  ui.zoneChip.style.background = zone.background;
  ui.protectionMode.textContent = getProtectionMode();

  ui.aiToggleStatus.textContent = state.aiEnabled ? "AI ON" : "AI OFF";
  ui.aiStatusText.textContent = recentlyProtected
    ? `Protection applied. Output reduced to ${state.displayedDb} dB (${Math.round(state.protectionGain * 100)}% of source).`
    : `AI monitoring ${state.monitoring ? "live" : "simulated"} audio conditions`;

  ui.adjustingIndicator.lastElementChild.textContent = recentlyProtected
    ? "Unsafe audio controlled automatically"
    : limitUnsafe
      ? "Unsafe audio detected"
      : "System stable";

  ui.backendStatusText.textContent = state.monitoring
    ? "Microphone sound detection is active."
    : state.monitorError || "Local monitoring logic ready.";

  ui.safeTime.textContent = formatTime(state.safeSeconds);
  ui.unsafeTime.textContent = formatTime(state.unsafeSeconds);
  const totalExposure = Math.max(1, state.safeSeconds + state.unsafeSeconds);
  ui.safeBar.style.width = `${(state.safeSeconds / totalExposure) * 100}%`;
  ui.unsafeBar.style.width = `${(state.unsafeSeconds / totalExposure) * 100}%`;

  const circumference = 377;
  const dashOffset = circumference - (clamp(state.displayedDb, 0, 100) / 100) * circumference;
  ui.meterProgress.style.strokeDashoffset = String(dashOffset);
  ui.meterProgress.style.stroke = zone.stroke;

  Array.from(ui.visualizer.children).forEach((bar, index) => {
    const variance = 20 + ((index * 7) % 30);
    const height = clamp(state.displayedDb + variance - Math.random() * 15, 24, 160);
    bar.style.height = `${height}px`;
    bar.style.background = zone.bar;
  });

  ui.demoMode.textContent = recentlyProtected ? "Protecting" : state.monitoring ? "Live Input" : "Monitoring";
  ui.demoMessage.textContent = recentlyProtected
    ? "Unsafe listening was detected and HearWell reduced the effective output."
    : "AI is ready to protect your hearing.";
}

function getProtectionMode() {
  if (state.manualOverride) return "Manual";
  if (state.emergencyMode) return "Emergency";
  if (!state.aiEnabled) return "Paused";
  if (Date.now() - state.lastProtectionAt < 3500) return "Protecting";
  return "Balanced";
}

function getZoneLabel(db) {
  if (db < 60) {
    return {
      label: "Safe Zone",
      chip: "Green",
      stroke: "#49e79a",
      background: "rgba(73, 231, 154, 0.18)",
      bar: "linear-gradient(180deg, rgba(73, 231, 154, 0.2), rgba(73, 231, 154, 0.95))",
    };
  }

  if (db <= 80) {
    return {
      label: "Moderate Zone",
      chip: "Yellow",
      stroke: "#ffc857",
      background: "rgba(255, 200, 87, 0.18)",
      bar: "linear-gradient(180deg, rgba(255, 200, 87, 0.18), rgba(255, 200, 87, 0.95))",
    };
  }

  return {
    label: "Danger Zone",
    chip: "Red",
    stroke: "#ff6b6b",
    background: "rgba(255, 107, 107, 0.18)",
    bar: "linear-gradient(180deg, rgba(255, 107, 107, 0.18), rgba(255, 107, 107, 0.95))",
  };
}

function showAlert() {
  ui.alertPopup.classList.add("show");
  window.clearTimeout(showAlert.timeoutId);
  showAlert.timeoutId = window.setTimeout(() => {
    ui.alertPopup.classList.remove("show");
  }, 2200);
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

init();
