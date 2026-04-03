/* ═══════════════════════════════════════════
   LOADER v2
   - Indicateur chargement pendant que la musique se charge
   - Manette détectée dès l'avertissement (X/A pour continuer)
   - "Three Nights at Chez Moi"
════════════════════════════════════════════ */

(() => {

  const loader      = document.getElementById('loader');
  const loaderNoise = document.getElementById('loader-noise');
  const loaderClick = document.getElementById('loader-click');
  const menu        = document.getElementById('menu');
  const audioMenu   = document.getElementById('audio-menu');

  // ── Bruit statique ──
  const ctx = loaderNoise.getContext('2d');
  function resizeNoise() { loaderNoise.width = window.innerWidth; loaderNoise.height = window.innerHeight; }
  resizeNoise();
  window.addEventListener('resize', resizeNoise);
  function drawNoise() {
    if (!loader || loader.classList.contains('hidden')) return;
    const w = loaderNoise.width, h = loaderNoise.height;
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v;
      img.data[i+3] = Math.random() * 28;
    }
    ctx.putImageData(img, 0, 0);
    requestAnimationFrame(drawNoise);
  }
  drawNoise();

  // ── Indicateur de chargement ──
  const loadingEl = document.createElement('div');
  loadingEl.id = 'loader-loading-indicator';
  loadingEl.style.cssText = `
    position:absolute;bottom:24px;right:24px;
    font-family:'Share Tech Mono',monospace;
    font-size:10px;color:#333;letter-spacing:3px;
    display:flex;align-items:center;gap:5px;z-index:20;
  `;
  loadingEl.innerHTML = '<span>CHARGEMENT</span><span id="loader-dots"></span>';
  loader.appendChild(loadingEl);

  let dotsCount = 0;
  const dotsInterval = setInterval(() => {
    dotsCount = (dotsCount + 1) % 4;
    const d = document.getElementById('loader-dots');
    if (d) d.textContent = '.'.repeat(dotsCount);
  }, 400);

  // ── Indicateur manette sur loader ──
  const gpLoaderHint = document.createElement('div');
  gpLoaderHint.id = 'loader-gp-hint';
  gpLoaderHint.style.cssText = `
    position:absolute;bottom:24px;left:24px;
    font-family:'Share Tech Mono',monospace;
    font-size:9px;color:#2a8a2a;letter-spacing:2px;
    display:none;z-index:20;
  `;
  loader.appendChild(gpLoaderHint);

  function getGpType() {
    try { return localStorage.getItem('fnaf_opt_gamepadType') || 'xbox'; } catch(e) { return 'xbox'; }
  }
  function checkLoaderGamepad() {
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    if (gps.length > 0) {
      const t = getGpType();
      const btn = t === 'ps' ? 'X' : 'A';
      gpLoaderHint.textContent = `● Manette — appuyer ${btn} pour continuer`;
      gpLoaderHint.style.display = 'block';
    } else {
      gpLoaderHint.style.display = 'none';
    }
  }
  checkLoaderGamepad();
  window.addEventListener('gamepadconnected',    checkLoaderGamepad);
  window.addEventListener('gamepaddisconnected', checkLoaderGamepad);

  // Preload musique en parallèle
  let musicReady = false;
  if (audioMenu) {
    audioMenu.load();
    audioMenu.addEventListener('canplaythrough', () => {
      musicReady = true;
      clearInterval(dotsInterval);
      // Masquer indicateur chargement, afficher cliquer
      loadingEl.style.opacity = '0';
      if (loaderClick) loaderClick.style.animationPlayState = 'running';
    }, { once: true });
    // Fallback si canplaythrough ne se déclenche pas
    setTimeout(() => {
      musicReady = true;
      clearInterval(dotsInterval);
      loadingEl.style.opacity = '0';
    }, 4000);
  }

  // ── Transition vers le menu ──
  let clicked = false;

  function handleStart() {
    if (clicked) return;
    clicked = true;

    // Débloquer AudioContext
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const buf = ac.createBuffer(1,1,22050);
      const src = ac.createBufferSource();
      src.buffer = buf; src.connect(ac.destination); src.start(0);
    } catch(e) {}

    if (audioMenu) {
      audioMenu.volume = 0;
      audioMenu.play().catch(() => {});
      let vol = 0;
      const fi = setInterval(() => {
        vol = Math.min(vol + 0.03, 0.65);
        audioMenu.volume = vol;
        if (vol >= 0.65) clearInterval(fi);
      }, 80);
    }

    loader.classList.add('glitch-out');
    clearInterval(dotsInterval);

    setTimeout(() => {
      loader.classList.add('hidden');
      menu.classList.remove('hidden');
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('visible')));
      if (typeof initMenu === 'function') initMenu();
    }, 600);
  }

  loader.addEventListener('click', handleStart);
  document.addEventListener('keydown', e => {
    if (!clicked && e.key !== 'Tab') handleStart();
  });

  // Manette sur l'écran d'avertissement
  let prevGpBtns = {};
  const gpLoaderInterval = setInterval(() => {
    if (clicked) { clearInterval(gpLoaderInterval); return; }
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    if (!gps.length) return;
    const gp = gps[0];
    // A (btn 0) ou X/Croix PS (btn 2)
    const pressed0 = gp.buttons[0]?.pressed;
    const pressed2 = gp.buttons[2]?.pressed;
    const wasP0 = prevGpBtns[0] || false;
    const wasP2 = prevGpBtns[2] || false;
    if ((pressed0 && !wasP0) || (pressed2 && !wasP2)) handleStart();
    prevGpBtns[0] = pressed0;
    prevGpBtns[2] = pressed2;
  }, 50);

})();
