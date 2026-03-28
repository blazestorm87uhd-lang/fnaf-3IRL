/* ═══════════════════════════════════════════
   MENU — Logique principale v2
   Brad → Frank (nuit 2+) → Mama Coco (nuit 3+)
════════════════════════════════════════════ */

function initMenu() {

  const noiseCanvas    = document.getElementById('noise');
  const btnNewGame     = document.getElementById('btn-newgame');
  const btnContinue    = document.getElementById('btn-continue');
  const btnNightmare   = document.getElementById('btn-nightmare');
  const btnBonus       = document.getElementById('btn-bonus');
  const continueNote   = document.getElementById('continue-note');
  const modalNightmare = document.getElementById('modal-nightmare');
  const modalConfirm   = document.getElementById('modal-confirm');
  const modalCancel    = document.getElementById('modal-cancel');
  const audioMenu      = document.getElementById('audio-menu');
  const audioNightmare = document.getElementById('audio-nightmare');

  // ── Bruit statique ──
  const nctx = noiseCanvas.getContext('2d');
  function resizeNoise() { noiseCanvas.width = window.innerWidth; noiseCanvas.height = window.innerHeight; }
  resizeNoise();
  window.addEventListener('resize', resizeNoise);
  function drawNoise() {
    const w = noiseCanvas.width, h = noiseCanvas.height;
    const img = nctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = Math.random() * 20;
    }
    nctx.putImageData(img, 0, 0); requestAnimationFrame(drawNoise);
  }
  drawNoise();

  // ── Personnage selon progression ──
  const saveData = Save.load();
  const nightCompleted = saveData.nightCompleted || 0;

  // Éléments de chaque personnage
  const chars = {
    brad:  { normal: document.getElementById('brad-normal'),  broken: document.getElementById('brad-broken')  },
    frank: { normal: document.getElementById('frank-normal'), broken: document.getElementById('frank-broken') },
    mama:  { normal: document.getElementById('mama-normal'),  broken: document.getElementById('mama-broken')  },
  };

  // Déterminer les personnages disponibles selon progression
  const availableChars = ['brad'];
  if (nightCompleted >= 2) availableChars.push('frank');
  if (nightCompleted >= 3) availableChars.push('mama');

  // Masquer tout
  Object.keys(chars).forEach(key => {
    const ch = chars[key];
    if (ch.normal) ch.normal.classList.add('hidden');
    if (ch.broken) ch.broken.classList.add('hidden');
  });

  let currentCharIdx = 0;
  let currentGlitchTimeout = null;

  function showChar(charKey) {
    Object.keys(chars).forEach(key => {
      const ch = chars[key];
      if (ch.normal) { ch.normal.classList.add('hidden'); ch.normal.style.opacity = '1'; }
      if (ch.broken) { ch.broken.classList.add('hidden'); ch.broken.style.opacity = '0'; }
    });
    const active = chars[charKey];
    if (!active) return;
    if (active.normal) { active.normal.classList.remove('hidden'); active.normal.style.opacity = '1'; }
    if (active.broken) { active.broken.classList.remove('hidden'); active.broken.style.opacity = '0'; }
  }

  // ── Glitch ──
  function doGlitch() {
    const charKey = availableChars[currentCharIdx];
    const active  = chars[charKey];
    if (!active) { scheduleGlitch(); return; }
    const n = active.normal, b = active.broken;
    if (!n || !b) { scheduleGlitch(); return; }
    n.style.opacity = '0'; b.style.opacity = '1';
    const shifts = [
      { delay: 0,   tx: -7, filter: 'hue-rotate(20deg) saturate(2)' },
      { delay: 50,  tx:  5, filter: 'none' },
      { delay: 90,  tx: -4, filter: 'hue-rotate(-15deg)' },
      { delay: 130, tx:  0, filter: 'none' },
    ];
    shifts.forEach(s => setTimeout(() => {
      if (b) { b.style.transform = `translateX(${s.tx}px)`; b.style.filter = s.filter; }
    }, s.delay));
    setTimeout(() => {
      if (n) n.style.opacity = '1';
      if (b) { b.style.opacity = '0'; b.style.transform = ''; b.style.filter = ''; }
      scheduleGlitch();
    }, 120 + Math.random() * 200);
  }
  function scheduleGlitch() { currentGlitchTimeout = setTimeout(doGlitch, 3000 + Math.random() * 9000); }

  // Afficher le premier personnage
  showChar(availableChars[0]);
  scheduleGlitch();

  // Rotation toutes les 15s si plusieurs personnages
  if (availableChars.length > 1) {
    setInterval(() => {
      clearTimeout(currentGlitchTimeout);
      currentCharIdx = (currentCharIdx + 1) % availableChars.length;
      showChar(availableChars[currentCharIdx]);
      scheduleGlitch();
    }, 15000);
  }

  // ── Sauvegarde ──
  const nextNight = saveData.currentNight !== null ? saveData.currentNight : saveData.nightReached;

  if (nextNight && nextNight >= 1) {
    btnContinue.classList.remove('disabled');
    continueNote.textContent = `reprendre — nuit ${nextNight}`;
    continueNote.style.color = '#555';
  } else {
    btnContinue.classList.add('disabled');
  }

  if (saveData.nightmareUnlocked) btnNightmare.style.display = 'flex';
  if (saveData.bonusUnlocked)     btnBonus.style.display     = 'flex';

  // ── Actions ──
  btnNewGame.addEventListener('click', () => { Save.startNight(1); launchGame(1); });

  btnContinue.addEventListener('click', () => {
    const d = Save.load();
    const night = d.currentNight !== null ? d.currentNight : d.nightReached;
    if (night) { Save.startNight(night); launchGame(night); }
  });

  btnNightmare.addEventListener('click', openNightmareModal);
  btnBonus.addEventListener('click', () => { console.log('Bonus — à implémenter'); });

  function openNightmareModal()  { modalNightmare.classList.remove('hidden'); }
  function closeNightmareModal() { modalNightmare.classList.add('hidden'); }

  modalCancel.addEventListener('click', closeNightmareModal);
  modalConfirm.addEventListener('click', () => {
    closeNightmareModal();
    fadeAudio(audioMenu, 0, 600, () => { audioMenu.pause(); audioMenu.currentTime = 0; });
    audioNightmare.volume = 0; audioNightmare.play().catch(() => {});
    fadeAudio(audioNightmare, 0.65, 800);
    Save.startNight('nightmare'); launchGame('nightmare');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNightmareModal(); });

  // ── Lancement ──
  function launchGame(night) {
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity    = '0';
    setTimeout(() => {
      if      (night === 1)          window.location.href = 'game.html';
      else if (night === 2)          window.location.href = 'game2.html';
      else if (night === 3)          window.location.href = 'game3.html';
      else if (night === 'nightmare')window.location.href = 'game.html?night=nightmare';
      else                           window.location.href = 'game.html';
    }, 500);
  }

  function fadeAudio(audio, targetVol, duration, callback) {
    const steps = 30, interval = duration / steps;
    const startVol = audio.volume, delta = (targetVol - startVol) / steps;
    let step = 0;
    const t = setInterval(() => {
      step++;
      audio.volume = Math.max(0, Math.min(1, startVol + delta * step));
      if (step >= steps) { clearInterval(t); if (callback) callback(); }
    }, interval);
  }
}
