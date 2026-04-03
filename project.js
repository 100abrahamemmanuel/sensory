// ── CONFIG ──────────────────────────────────────────────────────────────────
const ALERT_EMAIL = 'abrahamemmanuel620@gmail.com';

const MACHINES = [
  { id: 'MCH-001', name: 'Compressor A',  icon: '⚙️',
    base: { temp: 72,  pressure: 4.2, rpm: 1450, vibration: 0.8 } },
  { id: 'MCH-002', name: 'Pump Station B', icon: '💧',
    base: { temp: 58,  pressure: 6.1, rpm: 2200, vibration: 0.5 } },
  { id: 'MCH-003', name: 'Turbine Unit C', icon: '⚡',
    base: { temp: 85,  pressure: 3.8, rpm: 3600, vibration: 1.1 } },
  { id: 'MCH-004', name: 'Conveyor D',     icon: '📦',
    base: { temp: 45,  pressure: 1.5, rpm: 800,  vibration: 0.3 } }
];

const LIMITS = {
  temp:      { warn: 100, crit: 130 },
  pressure:  { warn: 8,   crit: 10  },
  rpm:       { warn: 4000,crit: 5000},
  vibration: { warn: 2.5, crit: 4   }
};

const UNITS  = { temp: '°C', pressure: ' bar', rpm: ' RPM', vibration: ' g' };
const LABELS = { temp: 'Temperature', pressure: 'Pressure', rpm: 'RPM', vibration: 'Vibration' };

// ── STATE ───────────────────────────────────────────────────────────────────
let state = MACHINES.map(m => ({
  ...m,
  values: { ...m.base },
  status: 'ok',
  fault: null
}));

let alertsSent = 0;
let toastTimer = null;
let startTime  = Date.now();

// ── HELPERS ─────────────────────────────────────────────────────────────────
function jitter(v, spread) { return +( v + (Math.random() - 0.5) * spread ).toFixed(1); }

function getClass(key, val) {
  if (val >= LIMITS[key].crit) return 'danger';
  if (val >= LIMITS[key].warn) return 'warning';
  return 'ok';
}

function getMeterPct(key, val) {
  return Math.min(100, Math.round((val / (LIMITS[key].crit * 1.15)) * 100));
}

// ── UPDATE LIVE VALUES ───────────────────────────────────────────────────────
function updateValues() {
  state.forEach(m => {
    if (m.status !== 'fault') {
      m.values.temp      = jitter(m.base.temp, 2);
      m.values.pressure  = jitter(m.base.pressure, 0.15);
      m.values.rpm       = Math.round(jitter(m.base.rpm, 30));
      m.values.vibration = Math.max(0.1, jitter(m.base.vibration, 0.05));
    }
  });
  renderCards();
  updateStats();
}

// ── RENDER MACHINE CARDS ────────────────────────────────────────────────────
function renderCards() {
  const grid = document.getElementById('machines-grid');
  grid.innerHTML = state.map((m, i) => {
    const v = m.values;
    const tc = getClass('temp',      v.temp);
    const pc = getClass('pressure',  v.pressure);
    const rc = getClass('rpm',       v.rpm);
    const vc = getClass('vibration', v.vibration);
    const isFault = m.status === 'fault';

    return `<div class="machine-card${isFault ? ' fault-state' : ''}" id="card-${i}">
      <div class="corner tl"></div><div class="corner tr"></div>
      <div class="corner bl"></div><div class="corner br"></div>
      ${isFault ? '<div class="notif-dot"></div>' : ''}
      <div class="card-header">
        <div class="machine-info">
          <div class="machine-avatar">${m.icon}</div>
          <div>
            <div class="machine-name">${m.name}</div>
            <div class="machine-id">${m.id}</div>
          </div>
        </div>
        <span class="status-badge ${isFault ? 'fault' : 'ok'}">${isFault ? '⚠ FAULT' : '● NOMINAL'}</span>
      </div>
      <div class="metrics-grid">
        ${metricHTML('temp',      v.temp,      tc)}
        ${metricHTML('pressure',  v.pressure,  pc)}
        ${metricHTML('rpm',       v.rpm,       rc)}
        ${metricHTML('vibration', v.vibration, vc)}
      </div>
      ${isFault ? `
      <button class="view-fault-btn" onclick="showFaultDetail(${i})">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 4l8.5 15H3.5L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
        View Alert Details
      </button>` : ''}
    </div>`;
  }).join('');
}

function metricHTML(key, val, cls) {
  const label = key === 'rpm' ? 'RPM' : key.charAt(0).toUpperCase() + key.slice(1);
  const unit  = key === 'rpm' ? '' : UNITS[key];
  const disp  = key === 'rpm' ? val : val.toFixed(1);
  const pct   = getMeterPct(key, val);
  return `<div class="metric ${cls}">
    <div class="metric-label">${label}</div>
    <div class="metric-value ${cls}">${disp}<span class="metric-unit">${unit}</span></div>
    <div class="meter-bar"><div class="meter-fill ${cls}" style="width:${pct}%"></div></div>
  </div>`;
}

// ── STATS ROW ────────────────────────────────────────────────────────────────
function updateStats() {
  const faults = state.filter(m => m.status === 'fault').length;
  const online = state.length;
  const uptime = Math.round((Date.now() - startTime) / 1000);
  const mins   = Math.floor(uptime / 60);
  const secs   = uptime % 60;

  const onlineEl = document.getElementById('stat-online');
  onlineEl.textContent = `${online - faults} / ${online}`;
  onlineEl.className   = 'stat-value ' + (faults > 0 ? 'fault' : 'ok');

  const faultEl = document.getElementById('stat-faults');
  faultEl.textContent = faults;
  faultEl.className   = 'stat-value ' + (faults > 0 ? 'fault' : 'ok');

  document.getElementById('stat-alerts').textContent = alertsSent;
  document.getElementById('stat-uptime').textContent = `${mins}m ${secs}s`;

  // Stat bars
  const onlineBar = document.getElementById('stat-bar-online');
  if (onlineBar) onlineBar.style.width = `${((online - faults) / online) * 100}%`;
  const faultBar = document.getElementById('stat-bar-faults');
  if (faultBar)  faultBar.style.width  = `${(faults / online) * 100}%`;

  // Sys health indicator
  const sysVal = document.getElementById('sys-health');
  if (sysVal) {
    if (faults > 0) {
      sysVal.textContent = 'FAULT DETECTED';
      sysVal.style.color = 'var(--red-text)';
    } else {
      sysVal.textContent = 'NOMINAL';
      sysVal.style.color = 'var(--green-text)';
    }
  }
}

// ── SIMULATE FAULT ──────────────────────────────────────────────────────────
function simulateFault() {
  const available = state.map((m,i) => i).filter(i => state[i].status !== 'fault');
  if (available.length === 0) { showToast('All machines already have active faults'); return; }

  const idx     = available[Math.floor(Math.random() * available.length)];
  const m       = state[idx];
  const params  = ['temp', 'pressure', 'rpm', 'vibration'];
  const param   = params[Math.floor(Math.random() * params.length)];
  const mult    = 1.3 + Math.random() * 0.6;
  const faultVal = param === 'rpm'
    ? Math.round(m.base[param] * mult)
    : +( m.base[param] * mult ).toFixed(1);

  m.values[param] = faultVal;
  m.status = 'fault';
  m.fault  = { param, value: faultVal, time: new Date().toLocaleTimeString() };

  renderCards();
  updateStats();
  showNotificationBanner(idx);
}

// ── RESET ALL ───────────────────────────────────────────────────────────────
function resetAll() {
  removeNotifBanner();
  state.forEach(m => { m.status = 'ok'; m.fault = null; m.values = { ...m.base }; });
  renderCards();
  updateStats();
  showToast('All machines reset to nominal');
}

// ── NOTIFICATION BANNER ──────────────────────────────────────────────────────
function removeNotifBanner() {
  const b = document.getElementById('notif-banner');
  if (b) b.remove();
}

function showNotificationBanner(idx) {
  removeNotifBanner();
  const m = state[idx], f = m.fault;
  const val = f.param === 'rpm' ? f.value : f.value.toFixed(1);
  const banner = document.createElement('div');
  banner.className = 'notif-banner';
  banner.id = 'notif-banner';
  banner.innerHTML = `
    <div class="notif-alert-icon">
      <svg viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 4l8.5 15H3.5L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
    </div>
    <div class="notif-text">
      <div class="notif-title">Fault Detected — ${m.name}</div>
      <div class="notif-sub">${f.param.toUpperCase()}: ${val}${UNITS[f.param]}</div>
      <div class="notif-hint">Click to view details & send alert</div>
    </div>
    <div class="notif-pulse"></div>`;
  banner.onclick = () => showFaultDetail(idx);
  document.body.appendChild(banner);
}

// ── FAULT DETAIL MODAL ───────────────────────────────────────────────────────
function showFaultDetail(idx) {
  removeNotifBanner(); removeModal();
  const m = state[idx], f = m.fault;
  const val     = f.param === 'rpm' ? f.value : f.value.toFixed(1);
  const warnVal = f.param === 'temp' ? '100°C' : f.param === 'pressure' ? '8 bar' : f.param === 'rpm' ? '4000 RPM' : '2.5 g';

  const overlay = document.createElement('div');
  overlay.className = 'overlay'; overlay.id = 'fault-overlay';
  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 4l8.5 15H3.5L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
        </div>
        <div>
          <div class="modal-title">Critical Fault — ${m.name}</div>
          <div class="modal-machine">${m.id} &nbsp;·&nbsp; Detected at ${f.time}</div>
        </div>
      </div>
      <div class="fault-table">
        <div class="fault-row"><span class="fault-key">Machine</span><span class="fault-val">${m.name} (${m.id})</span></div>
        <div class="fault-row"><span class="fault-key">Parameter</span><span class="fault-val danger">${LABELS[f.param]}</span></div>
        <div class="fault-row"><span class="fault-key">Measured Value</span><span class="fault-val danger">${val}${UNITS[f.param]}</span></div>
        <div class="fault-row"><span class="fault-key">Warning Threshold</span><span class="fault-val">${warnVal}</span></div>
        <div class="fault-row"><span class="fault-key">Status</span><span class="fault-val danger">FAULT</span></div>
        <div class="fault-row"><span class="fault-key">Time</span><span class="fault-val">${f.time}</span></div>
      </div>
      <div class="email-note">
        <strong>Send Alert Email</strong> will open your mail client addressed to <strong>${ALERT_EMAIL}</strong> with a pre-filled diagnostic report.
      </div>
      <div class="modal-actions">
        <button class="btn-dismiss" onclick="dismissModal()">Dismiss</button>
        <button class="btn-send-email" onclick="sendAlertEmail(${idx})">
          <svg viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
          Send Alert Email
        </button>
      </div>
    </div>`;
  overlay.onclick = dismissModal;
  document.body.appendChild(overlay);
}

function removeModal() { const o = document.getElementById('fault-overlay'); if (o) o.remove(); }
function dismissModal() { removeModal(); }

// ── SEND EMAIL ───────────────────────────────────────────────────────────────
function sendAlertEmail(idx) {
  removeModal();
  const m = state[idx], f = m.fault;
  const val = f.param === 'rpm' ? f.value : f.value.toFixed(1);
  const subject = `[FAULT ALERT] ${m.name} — ${LABELS[f.param]} Critical`;
  const body =
    `MACHINE FAULT ALERT\n${'─'.repeat(40)}\n\n` +
    `Machine:    ${m.name} (${m.id})\n` +
    `Parameter:  ${LABELS[f.param]}\n` +
    `Reading:    ${val}${UNITS[f.param]}\n` +
    `Threshold:  See system limits\n` +
    `Status:     FAULT\n` +
    `Detected:   ${f.time}\n\n` +
    `Please inspect the machine immediately and take corrective action.\n\n` +
    `-- Factory Monitoring System\n   Auto-generated alert · Do not reply`;

  window.location.href =
    `mailto:${ALERT_EMAIL}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  alertsSent++;
  state[idx].status = 'ok';
  state[idx].fault  = null;
  state[idx].values[f.param] = m.base[f.param];
  renderCards(); updateStats();
  showToast(`Alert sent to ${ALERT_EMAIL} — machine reset`);
}

// ── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const existing = document.getElementById('toast-el');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'toast-el'; toast.className = 'toast';
  toast.innerHTML = `<div class="toast-tick">✓</div><span>${msg}</span>`;
  document.body.appendChild(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.remove(), 3500);
}

// ── CLOCK ────────────────────────────────────────────────────────────────────
function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}

// ── KEYBOARD ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { removeModal(); removeNotifBanner(); }
});

// ── BOOT ─────────────────────────────────────────────────────────────────────
renderCards();
updateStats();
updateClock();
setInterval(updateValues, 1800);
setInterval(updateClock,  1000);
setInterval(updateStats,  1000);
