/* ═══════════════════════════════════════════
   MENU — Logique principale
   Glitch Brad, boutons, modal Nightmare, saves
════════════════════════════════════════════ */

function initMenu() {

  // ── Éléments ──
  const noiseCanvas    = document.getElementById('noise');
  const bradNormal     = document.getElementById('brad-normal');
  const bradBroken     = document.getElementById('brad-broken');
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

  function resizeNoise() {
    noiseCanvas.width  = window.innerWidth;
    noiseCanvas.height = window.innerHeight;
  }
  resizeNoise();
  window.addEventListener('resize', resizeNoise);

  function drawNoise() {
    const w = noiseCanvas.width, h = noiseCanvas.height;
    const img = nctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v;
      img.data[i+3] = Math.random() * 20;
    }
    nctx.putImageData(img, 0, 0);
    requestAnimationFrame(drawNoise);
  }
  drawNoise();

  // ── Glitch Brad ──
  function doGlitch() {
    // Passage sur photo brisée
    bradNormal.style.opacity = '0';
    bradBroken.style.opacity = '1';

    const shifts = [
      { delay: 0,   tx: -7,  filter: 'hue-rotate(20deg) saturate(2)' },
      { delay: 50,  tx:  5,  filter: 'none' },
      { delay: 90,  tx: -4,  filter: 'hue-rotate(-15deg)' },
      { delay: 130, tx:  0,  filter: 'none' },
    ];

    shifts.forEach(s => {
      setTimeout(() => {
        bradBroken.style.transform = `translateX(${s.tx}px)`;
        bradBroken.style.filter   = s.filter;
      }, s.delay);
    });

    const duration = 120 + Math.random() * 200;
    setTimeout(() => {
      bradNormal.style.opacity  = '1';
      bradBroken.style.opacity  = '0';
      bradBroken.style.transform = '';
      bradBroken.style.filter   = '';
      scheduleGlitch();
    }, duration);
  }

  function scheduleGlitch() {
    const delay = 3000 + Math.random() * 9000;
    setTimeout(doGlitch, delay);
  }

  scheduleGlitch();

  // ── Chargement de la sauvegarde ──
  const saveData = Save.load();

  // Continue
  if (Save.hasActiveGame()) {
    btnContinue.classList.remove('disabled');
    continueNote.textContent = `reprendre — nuit ${saveData.currentNight}`;
    continueNote.style.color = '#555';
  } else {
    btnContinue.classList.add('disabled');
  }

  // Nightmare
  if (saveData.nightmareUnlocked) {
    btnNightmare.style.display = 'flex';
  }

  // Bonus
  if (saveData.bonusUnlocked) {
    btnBonus.style.display = 'flex';
  }

  // ── Actions boutons ──
  btnNewGame.addEventListener('click', () => {
    Save.startNight(1);
    launchGame(1);
  });

  btnContinue.addEventListener('click', () => {
    const d = Save.load();
    if (d.currentNight) launchGame(d.currentNight);
  });

  btnNightmare.addEventListener('click', () => {
    openNightmareModal();
  });

  btnBonus.addEventListener('click', () => {
    // TODO : rediriger vers page bonus
    console.log('Bonus — à implémenter');
  });

  // ── Modal Nightmare ──
  function openNightmareModal() {
    modalNightmare.classList.remove('hidden');
  }

  function closeNightmareModal() {
    modalNightmare.classList.add('hidden');
  }

  modalCancel.addEventListener('click', closeNightmareModal);

  modalConfirm.addEventListener('click', () => {
    closeNightmareModal();

    // Coupe musique menu, lance musique nightmare
    fadeAudio(audioMenu, 0, 600, () => {
      audioMenu.pause();
      audioMenu.currentTime = 0;
    });
    audioNightmare.volume = 0;
    audioNightmare.play().catch(() => {});
    fadeAudio(audioNightmare, 0.65, 800);

    Save.startNight('nightmare');
    launchGame('nightmare');
  });

  // Fermer modal avec Échap
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNightmareModal();
  });

  // ── Lancement du jeu ──
  function launchGame(night) {
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';
    setTimeout(() => {
      if (night === 2)          window.location.href = 'game2.html';
      else if (night === 'nightmare') window.location.href = 'game.html?night=nightmare';
      else                      window.location.href = 'game.html';
    }, 500);
  }

  // ── Utilitaire fade audio ──
  function fadeAudio(audio, targetVol, duration, callback) {
    const steps    = 30;
    const interval = duration / steps;
    const startVol = audio.volume;
    const delta    = (targetVol - startVol) / steps;
    let   step     = 0;

    const t = setInterval(() => {
      step++;
      audio.volume = Math.max(0, Math.min(1, startVol + delta * step));
      if (step >= steps) {
        clearInterval(t);
        if (callback) callback();
      }
    }, interval);
  }

}
