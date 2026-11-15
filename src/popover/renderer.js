// UI only for now: battery levels and noise mode are placeholder state.
const state = {
  deviceName: 'Nothing Ear',
  battery: {
    left: { level: 82, charging: false },
    right: { level: 76, charging: false },
    case: { level: 54, charging: true },
  },
  noiseMode: 'anc',
};

function applySymbols(symbols) {
  for (const el of document.querySelectorAll('[data-sym]')) {
    const url = symbols[el.dataset.sym];
    if (url) el.style.setProperty('--sym', `url("${url}")`);
  }
}

function renderBattery() {
  for (const [part, { level, charging }] of Object.entries(state.battery)) {
    const el = document.querySelector(`.bud[data-part="${part}"]`);
    el.querySelector('.pct').textContent = `${level}%`;
    el.querySelector('.fill').style.width = `${level}%`;
    el.classList.toggle('low', level <= 20 && !charging);
    el.classList.toggle('charging', charging);
  }
}

function renderNoiseMode() {
  for (const btn of document.querySelectorAll('.option')) {
    btn.setAttribute('aria-checked', String(btn.dataset.mode === state.noiseMode));
  }
}

function reportHeight() {
  window.nx.setHeight(document.getElementById('panel').getBoundingClientRect().height);
}

async function main() {
  const { accent, symbols } = await window.nx.init();
  document.documentElement.style.setProperty('--accent', accent);
  window.nx.onAccent((c) => document.documentElement.style.setProperty('--accent', c));

  applySymbols(symbols);
  document.getElementById('device-name').textContent = state.deviceName;
  renderBattery();
  renderNoiseMode();

  document.getElementById('noise-options').addEventListener('click', (e) => {
    const btn = e.target.closest('.option');
    if (!btn) return;
    state.noiseMode = btn.dataset.mode;
    renderNoiseMode();
  });

  document.getElementById('quit').addEventListener('click', () => window.nx.quit());

  reportHeight();
}

main();
