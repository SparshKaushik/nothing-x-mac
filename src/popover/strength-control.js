// Noise-cancellation intensity: a macOS-style segmented control
// (Low / Mid / High / Auto) with an SF Symbol and label in each segment.
// Shown only while noise cancellation is on and the model supports it.
//
// Loaded as a classic script before renderer.js; exposes one global factory.

const STRENGTH_SEGMENTS = {
  low: { label: 'Low', symbol: 'ancLow' },
  mid: { label: 'Mid', symbol: 'ancMid' },
  high: { label: 'High', symbol: 'ancHigh' },
  adaptive: { label: 'Auto', symbol: 'ancAdaptive', title: 'Adaptive' },
};

window.createStrengthControl = function createStrengthControl({ onChange, symbols, lock }) {
  const root = document.getElementById('strength');
  const group = document.getElementById('strength-segments');
  let built = '';

  function build(list) {
    const key = list.join();
    if (key === built) return;
    built = key;

    group.replaceChildren(
      ...list.map((strength) => {
        const { label, symbol, title } = STRENGTH_SEGMENTS[strength];
        const btn = document.createElement('button');
        btn.className = 'segment';
        btn.dataset.strength = strength;
        btn.setAttribute('role', 'radio');
        btn.title = title ?? label;

        const icon = document.createElement('i');
        icon.className = 'sym';
        if (symbols[symbol]) icon.style.setProperty('--sym', `url("${symbols[symbol]}")`);

        // Replaces the icon while the buds are switching to this strength.
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        spinner.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.textContent = label;

        btn.append(icon, spinner, text);
        return btn;
      })
    );
  }

  function select(strength, pending) {
    for (const btn of group.children) {
      const selected = btn.dataset.strength === strength;
      btn.setAttribute('aria-checked', String(selected));
      btn.classList.toggle('pending', selected && pending);
      btn.setAttribute('aria-busy', String(selected && pending));
    }
  }

  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.segment');
    if (!btn || lock.locked || btn.getAttribute('aria-checked') === 'true') return;
    lock.lock(); // no more changes until the buds confirm this one
    select(btn.dataset.strength, true); // instant feedback; device state confirms
    onChange(btn.dataset.strength);
  });

  function render(state) {
    const caps = state.capabilities;
    const visible = state.connected && state.noiseMode === 'anc' && caps.strengths.length > 0;
    root.hidden = !visible;
    if (!visible) return;

    build(caps.adaptive ? [...caps.strengths, 'adaptive'] : caps.strengths);
    select(state.ancStrength, state.noisePending);
  }

  return { render };
};
