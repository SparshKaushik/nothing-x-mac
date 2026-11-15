// Quick Settings page: Control Center style tiles for in-ear detection, low
// latency, the ear tip fit test and find my earbuds, plus the firmware version.
// Opened from the gear in the main header; Back or Esc returns.
//
// Loaded as a classic script before renderer.js; exposes one global factory.

const FIT_TILE_TEXT = {
  idle: 'Run test',
  running: 'Testing…',
  timeout: 'Try again',
};

function fitResultMessage({ status, left, right }) {
  if (status === 'running') return 'Testing… keep both earbuds in your ears.';
  if (status === 'timeout') return 'No result. Make sure both earbuds are in your ears and try again.';
  if (status !== 'done') return '';
  if (left === 'not-in-ear' || right === 'not-in-ear') {
    return 'Put both earbuds in your ears and try again.';
  }
  if (left === 'good' && right === 'good') return 'Both earbuds fit well.';
  if (left === 'adjust' && right === 'adjust') return 'Adjust both earbuds or try another tip size.';
  return `Adjust the ${left === 'adjust' ? 'left' : 'right'} earbud or try another tip size.`;
}

function fitTileText(fitTest) {
  if (fitTest.status !== 'done') return FIT_TILE_TEXT[fitTest.status] ?? FIT_TILE_TEXT.idle;
  return fitTest.left === 'good' && fitTest.right === 'good' ? 'Good fit' : 'Adjust fit';
}

window.createQuickSettings = function createQuickSettings({ api, views }) {
  const $ = (id) => document.getElementById(id);
  const gear = $('settings');

  const tiles = {
    inEar: $('qs-in-ear'),
    lowLatency: $('qs-latency'),
    fitTest: $('qs-fit-test'),
    find: $('qs-find'),
  };
  const fitResult = $('qs-fit-result');
  const findPanel = $('qs-find-panel');
  const firmware = $('qs-firmware');

  let state = null;
  let findOpen = false;

  // ---- navigation -----------------------------------------------------------

  gear.addEventListener('click', () => {
    if (state?.connected) views.open('view-settings');
  });
  $('qs-back').addEventListener('click', () => views.back());
  views.onBack(() => {
    findOpen = false;
  });

  // ---- actions --------------------------------------------------------------

  for (const name of ['inEar', 'lowLatency']) {
    tiles[name].addEventListener('click', () => {
      if (!state || state.quick.pending[name]) return;
      api.setQuickToggle(name, !state.quick[name]);
    });
  }

  tiles.fitTest.addEventListener('click', () => {
    if (state?.quick.fitTest.status !== 'running') api.startFitTest();
  });

  tiles.find.addEventListener('click', () => {
    if (!state) return;
    if (state.capabilities.ring === 'buds') {
      findOpen = !findOpen;
      render(state);
    } else {
      api.ring('all', state.quick.ringing === null);
    }
  });

  findPanel.addEventListener('click', (e) => {
    const btn = e.target.closest('.qs-find-btn');
    if (!btn || !state) return;
    const side = btn.dataset.side;
    api.ring(side, state.quick.ringing !== side);
  });

  // ---- rendering ------------------------------------------------------------

  function renderToggle(tile, value, pending) {
    tile.setAttribute('aria-checked', String(Boolean(value)));
    tile.classList.toggle('on', Boolean(value));
    tile.querySelector('.qs-icon').classList.toggle('pending', pending);
    tile.querySelector('.qs-state').textContent = value === null ? '—' : value ? 'On' : 'Off';
  }

  function render(next) {
    state = next;
    gear.disabled = !next.connected;
    if (!next.connected) {
      if (views.isOpen('view-settings')) views.back();
      return;
    }

    const { quick, capabilities: caps } = next;

    tiles.inEar.hidden = !caps.inEar;
    tiles.lowLatency.hidden = !caps.lowLatency;
    tiles.fitTest.hidden = !caps.fitTest;

    renderToggle(tiles.inEar, quick.inEar, quick.pending.inEar);
    renderToggle(tiles.lowLatency, quick.lowLatency, quick.pending.lowLatency);

    // Fit test
    const running = quick.fitTest.status === 'running';
    tiles.fitTest.querySelector('.qs-icon').classList.toggle('pending', running);
    tiles.fitTest.classList.toggle('on', running);
    tiles.fitTest.querySelector('.qs-state').textContent = fitTileText(quick.fitTest);
    const message = caps.fitTest ? fitResultMessage(quick.fitTest) : '';
    fitResult.hidden = !message;
    fitResult.textContent = message;

    // Find my earbuds
    const ringing = quick.ringing;
    tiles.find.classList.toggle('on', ringing !== null);
    tiles.find.setAttribute('aria-expanded', String(findOpen));
    tiles.find.querySelector('.qs-state').textContent = ringing
      ? ringing === 'all' ? 'Playing… tap to stop' : `Playing ${ringing}`
      : 'Play sound';
    findPanel.hidden = !(caps.ring === 'buds' && (findOpen || ringing));
    for (const btn of findPanel.querySelectorAll('.qs-find-btn')) {
      const active = ringing === btn.dataset.side;
      btn.classList.toggle('on', active);
      btn.textContent = active ? 'Stop' : btn.dataset.side === 'left' ? 'Left' : 'Right';
    }

    firmware.textContent = quick.firmware ?? '—';
  }

  return { render };
};
