/* ═══════════════════════════════════════════
   LOADER — Écran de chargement
   Clic → transition glitch → affiche le menu
════════════════════════════════════════════ */

(() => {

  const loader     = document.getElementById('loader');
  const loaderNoise = document.getElementById('loader-noise');
  const menu       = document.getElementById('menu');
  const audioMenu  = document.getElementById('audio-menu');

  // ── Bruit statique sur le loader ──
  const ctx = loaderNoise.getContext('2d');

  function resizeLoaderNoise() {
    loaderNoise.width  = window.innerWidth;
    loaderNoise.height = window.innerHeight;
  }
  resizeLoaderNoise();
  window.addEventListener('resize', resizeLoaderNoise);

  function drawLoaderNoise() {
    if (!loader || loader.classList.contains('hidden')) return;
    const w = loaderNoise.width, h = loaderNoise.height;
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v;
      img.data[i+3] = Math.random() * 28;
    }
    ctx.putImageData(img, 0, 0);
    requestAnimationFrame(drawLoaderNoise);
  }
  drawLoaderNoise();

  // ── Clic ou touche → lancer la transition ──
  let clicked = false;

  function handleStart() {
    if (clicked) return;
    clicked = true;

    // Lance la musique du menu (autorisé car interaction utilisateur)
    audioMenu.volume = 0;
    audioMenu.play().catch(() => {});

    // Fondu progressif du volume
    let vol = 0;
    const fadeIn = setInterval(() => {
      vol = Math.min(vol + 0.03, 0.65);
      audioMenu.volume = vol;
      if (vol >= 0.65) clearInterval(fadeIn);
    }, 80);

    // Transition glitch sur le loader
    loader.classList.add('glitch-out');

    // Affiche le menu après la transition (0.6s)
    setTimeout(() => {
      loader.classList.add('hidden');
      menu.classList.remove('hidden');

      // Petit délai puis fade-in du menu
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          menu.classList.add('visible');
        });
      });

      // Init du menu
      if (typeof initMenu === 'function') initMenu();

    }, 600);
  }

  loader.addEventListener('click', handleStart);
  document.addEventListener('keydown', handleStart);

})();
