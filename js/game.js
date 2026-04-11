/* ═══════════════════════════════════════════
   GAME.JS v9
   - night-start coupé au lancement du jeu
   - hello-1/2 en .wav (assets/audio/effect/)
   - Brad masqué sur caméras sauf si au couloir
   - ventilation erreur/reboot animés
   - tout redémarrer : son reboot rejoué à chaque fois
   - mobile : layout portrait/paysage corrigé
════════════════════════════════════════════ */

(() => {

  // ── Appliquer volumes sauvegardés ──
  (function applyStoredVolumes() {
    try {
      const gVol = parseFloat(localStorage.getItem('fnaf_vol_general') || '0.8');
      const eVol = parseFloat(localStorage.getItem('fnaf_vol_effects') || '0.8');
      const vVol = parseFloat(localStorage.getItem('fnaf_vol_voices')  || '0.8');
      // Volumes généraux sur tous les audios
      document.querySelectorAll('audio').forEach(a => { a.volume = gVol; });
      // Stocker pour accès rapide dans playSound
      window._vol_general = gVol;
      window._vol_effects = eVol;
      window._vol_voices  = vVol;
    } catch(e) {}
  })();

  const NIGHT_NUMBER          = 1;
  const NIGHT_DURATION        = 10 * 60 * 1000;
  const HOURS                 = ['12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM'];
  const BRAD_VISIBLE_HOUR     = 2;
  const AMBIANCE_MAX_DURATION = 30000;
  const JUMPSCARE_DURATION    = 4000;
  const DEATH_SCREEN_MIN      = 6000;
  const REBOOT_ALL_DURATION   = 17000;
  const RING_PAUSE_MS         = 1200;

  // Brad masqué sur caméras sauf à partir de ce seuil (couloir = index 6)
  const BRAD_CAM_SHOW_INDEX   = 6;

  const BRAD_PATH = [
    'cellier','wc','salle-de-bain','cuisine',
    'salle-a-manger','salon','couloir','etage',
  ];

  // Exposer les pièces au module manette
  window._gpRooms = BRAD_PATH.slice();

  const CAM_IMAGES = {
    'cellier':        'assets/images/cameras/cellier.jpeg',
    'wc':             'assets/images/cameras/wc.jpeg',
    'salle-de-bain':  'assets/images/cameras/salle-de-bain-ferme.jpeg',
    'cuisine':        'assets/images/cameras/cuisine-ferme.jpeg',
    'salle-a-manger': 'assets/images/cameras/salle-a-manger.jpeg',
    'salon':          'assets/images/cameras/salon.jpeg',
    'couloir':        'assets/images/cameras/couloir.jpeg',
  };

  const BRAD_IMAGES = {
    'cellier-1':      'assets/images/cameras/brad/cellier-brad-1.png',
    'cellier-2':      'assets/images/cameras/brad/cellier-brad-2.png',
    'wc':             'assets/images/cameras/brad/wc-brad.png',
    'salle-de-bain':  'assets/images/cameras/brad/salle-de-bain-brad.png',
    'cuisine':        'assets/images/cameras/brad/cuisine-brad.png',
    'cuisine-rare':   'assets/images/cameras/brad/cuisine-brad-rare.png',
    'salle-a-manger': 'assets/images/cameras/brad/salle-a-manger-brad.png',
    'salon':          'assets/images/cameras/brad/salon-brad.png',
    'couloir':        'assets/images/cameras/brad/couloir-brad.png',
  };

  const DOOR_THRESHOLDS = { 'salle-de-bain': 2, 'cuisine': 3 };

  const BRAD_MOVE_BASE      = 20000;
  const BRAD_MOVE_MIN       = 8000;
  const STAIR_WINDOW_BASE   = 8000;
  const STAIR_WINDOW_MIN    = 3000;
  const ERROR_INTERVAL_BASE = 90000;  // 90s de base
  const ERROR_INTERVAL_MIN  = 50000;  // 50s minimum

  // ══════════════════════════════════════
  // ÉTAT
  // ══════════════════════════════════════

  const state = {
    over: false, nightProgress: 0, currentHour: 0,
    selectedRoom: 'cellier', bradVisible: false,
    bradIndex: 0, bradPhase: 1, bradMaxIndex: 0,
    stairActive: false, stairTimer: null,
    modules: {
      audio:       { error: false, rebooting: false },
      camera:      { error: false, rebooting: false },
      ventilation: { error: false, rebooting: false },
    },
    callPlaying: false, callMuted: false,
    ambiancePaused: false, audioCooldown: false,
    helloToggle: false,
    rebootingAll: false,
  };

  // ══════════════════════════════════════
  // DOM
  // ══════════════════════════════════════

  const screenPlayGate      = document.getElementById('screen-play-gate');
  const btnPlayGate         = document.getElementById('btn-play-gate');
  const screenNightStart    = document.getElementById('screen-nightstart');
  const screenGame          = document.getElementById('screen-game');
  const screenJumpscare     = document.getElementById('screen-jumpscare');
  const screenDeath         = document.getElementById('screen-death');
  const screenNightEnd      = document.getElementById('screen-nightend');
  const camImg              = document.getElementById('cam-img');
  const camBadgeName        = document.getElementById('cam-badge-name');
  const camView             = document.getElementById('cam-view');
  const stairAlert          = document.getElementById('stair-alert');
  const stairTimerFill      = document.getElementById('stair-timer-fill');
  const errorDisplay        = document.getElementById('error-display');
  const errorText           = document.getElementById('error-text');
  const hudHour             = document.getElementById('hud-hour');
  const mapRooms            = document.querySelectorAll('.map-room[data-room]');
  const btnAudio            = document.getElementById('btn-audio');
  const btnMaintenance      = document.getElementById('btn-maintenance');
  const btnMuteCall         = document.getElementById('btn-mute-call');
  const panelMaintenance    = document.getElementById('panel-maintenance');
  const btnMaintenanceClose = document.getElementById('btn-maintenance-close');
  const maintLockMsg        = document.getElementById('maint-lock-msg');
  const maintItems          = document.querySelectorAll('.maint-item');
  const maintRebootAll      = document.getElementById('maint-reboot-all');
  const jumpscareVideo      = document.getElementById('jumpscare-video');
  const noiseCanvas         = document.getElementById('game-noise');
  const nctx                = noiseCanvas.getContext('2d');

  // ══════════════════════════════════════
  // SONS
  // ══════════════════════════════════════

  const snd = {
    ambiance: [
      document.getElementById('snd-ambiance-1'),
      document.getElementById('snd-ambiance-2'),
      document.getElementById('snd-ambiance-3'),
    ],
    ring:          document.getElementById('snd-ring'),
    call:          document.getElementById('snd-night1-call'),
    nightStart:    document.getElementById('snd-night-start'),
    nightEnd:      document.getElementById('snd-night-end'),
    clicCamera:    document.getElementById('snd-clic-camera'),
    robot:         document.getElementById('snd-robot'),
    pounding:      document.getElementById('snd-pounding'),
    alarm:         document.getElementById('snd-alarm'),
    reboot:        document.getElementById('snd-reboot'),
    tabletteOpen:  document.getElementById('snd-tablette-open'),
    tabletteClose: document.getElementById('snd-tablette-close'),
    dead:          document.getElementById('snd-dead'),
    hello1:        document.getElementById('snd-hello-1'),
    hello2:        document.getElementById('snd-hello-2'),
  };

  if (snd.call) snd.call.src = 'assets/audio/effect/night1-call.m4a';

  function playSound(audio, vol = 0.8) {
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.volume = Math.min(1, Math.max(0, vol));
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    } catch(e) {}
  }

  function stopSound(audio) {
    if (!audio) return;
    try { audio.pause(); audio.currentTime = 0; } catch(e) {}
  }

  // hello-1.wav / hello-2.wav en alternance
  function playHello() {
    state.helloToggle = !state.helloToggle;
    const audio = state.helloToggle ? snd.hello1 : snd.hello2;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.volume = 0.85;
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    } catch(e) {}
  }

  // ══════════════════════════════════════
  // PLAY GATE
  // ══════════════════════════════════════

  const gateCanvas = document.getElementById('gate-noise');
  if (gateCanvas) {
    const gctx = gateCanvas.getContext('2d');
    (function gNoise() {
      if (!screenPlayGate || screenPlayGate.classList.contains('hidden')) return;
      gateCanvas.width = window.innerWidth;
      gateCanvas.height = window.innerHeight;
      const img = gctx.createImageData(gateCanvas.width, gateCanvas.height);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() > 0.5 ? 255 : 0;
        img.data[i] = img.data[i+1] = img.data[i+2] = v;
        img.data[i+3] = Math.random() * 22;
      }
      gctx.putImageData(img, 0, 0);
      requestAnimationFrame(gNoise);
    })();
  }

  btnPlayGate.addEventListener('click', () => {
    // Débloque l'audio du navigateur
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination); src.start(0);
    } catch(e) {}
    screenPlayGate.classList.add('hidden');
    screenNightStart.classList.remove('hidden');
    startNight();
  });

  // ══════════════════════════════════════
  // AMBIANCE
  // ══════════════════════════════════════

  let ambianceTimeout = null;
  let currentAmbiance = null;

  function startAmbiance() {
    if (state.ambiancePaused || state.over) return;
    // Garde-fou : ne pas démarrer si une ambiance joue déjà
    if (currentAmbiance && !currentAmbiance.paused) return;
    stopCurrentAmbiance(); // Nettoyer l'état précédent
    const idx = Math.floor(Math.random() * 3);
    currentAmbiance = snd.ambiance[idx];
    currentAmbiance.volume = 0.35;
    currentAmbiance.play().catch(() => {});
    clearTimeout(ambianceTimeout);
    ambianceTimeout = setTimeout(() => {
      stopCurrentAmbiance();
      ambianceTimeout = setTimeout(() => {
        if (!state.ambiancePaused && !state.over) startAmbiance();
      }, 3000 + Math.random() * 5000);
    }, AMBIANCE_MAX_DURATION);
  }

  function stopCurrentAmbiance() {
    if (currentAmbiance) { currentAmbiance.pause(); currentAmbiance.currentTime = 0; currentAmbiance = null; }
    clearTimeout(ambianceTimeout);
  }
  function pauseAmbiance()  { state.ambiancePaused = true; stopCurrentAmbiance(); }
  function resumeAmbiance() {
    if (!state.ambiancePaused) return;
    state.ambiancePaused = false;
    // Garde-fou : ne relancer que si rien ne joue
    if (currentAmbiance && !currentAmbiance.paused) return;
    setTimeout(() => { if (!state.over && !state.ambiancePaused) startAmbiance(); }, 2000);
  }
  function stopAllAmbiance() { state.ambiancePaused = true; stopCurrentAmbiance(); }

  // ══════════════════════════════════════
  // BRUIT STATIQUE
  // ══════════════════════════════════════

  function resizeNoise() { noiseCanvas.width = window.innerWidth; noiseCanvas.height = window.innerHeight; }
  resizeNoise();
  window.addEventListener('resize', resizeNoise);

  function drawNoise() {
    if (state.over) return;
    const w = noiseCanvas.width, h = noiseCanvas.height;
    const img = nctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v;
      img.data[i+3] = Math.random() * 18;
    }
    nctx.putImageData(img, 0, 0);
    requestAnimationFrame(drawNoise);
  }

  // ══════════════════════════════════════
  // OVERLAYS CAMÉRA
  // ══════════════════════════════════════

  function showNoSignal() {
    camImg.style.display = 'none';
    let o = document.getElementById('cam-no-signal');
    if (!o) {
      o = document.createElement('div');
      o.id = 'cam-no-signal';
      o.style.cssText = 'position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;';
      const c = document.createElement('canvas');
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0.85;';
      o.appendChild(c);
      const txt = document.createElement('div');
      txt.style.cssText = "position:relative;z-index:2;font-family:'Share Tech Mono',monospace;font-size:13px;letter-spacing:4px;color:#cc2020;text-align:center;animation:blink 0.8s step-start infinite;";
      txt.innerHTML = "PAS D'IMAGE<br><span style='font-size:10px;color:#555;letter-spacing:3px;'>SON UNIQUEMENT</span>";
      o.appendChild(txt);
      camView.appendChild(o);
      const sc = c.getContext('2d');
      (function ds() {
        const el = document.getElementById('cam-no-signal');
        if (!el || el.style.display === 'none') return;
        c.width = c.offsetWidth || 400; c.height = c.offsetHeight || 300;
        const img = sc.createImageData(c.width, c.height);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.floor(Math.random() * 80);
          img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = 255;
        }
        sc.putImageData(img, 0, 0); requestAnimationFrame(ds);
      })();
    }
    o.style.display = 'flex'; hideBlackScreen();
  }

  function hideNoSignal() {
    const o = document.getElementById('cam-no-signal');
    if (o) o.style.display = 'none';
    camImg.style.display = 'block';
  }

  function showBlackScreen() {
    camImg.style.display = 'none'; hideNoSignal();
    let b = document.getElementById('cam-black');
    if (!b) {
      b = document.createElement('div');
      b.id = 'cam-black';
      b.style.cssText = "position:absolute;inset:0;z-index:6;background:#000;display:flex;align-items:center;justify-content:center;";
      const txt = document.createElement('div');
      txt.style.cssText = "font-family:'Share Tech Mono',monospace;font-size:11px;color:#333;letter-spacing:4px;animation:blink 1.2s step-start infinite;";
      txt.textContent = 'SIGNAL PERDU';
      b.appendChild(txt); camView.appendChild(b);
    }
    b.style.display = 'flex';
  }

  function hideBlackScreen() {
    const b = document.getElementById('cam-black');
    if (b) b.style.display = 'none';
    camImg.style.display = 'block';
  }

  // ══════════════════════════════════════
  // CAMÉRAS
  // Brad masqué sauf si bradIndex >= BRAD_CAM_SHOW_INDEX (couloir+)
  // ══════════════════════════════════════

  function selectRoom(roomId) {
    if (roomId === 'etage') {
      state.selectedRoom = 'etage';
      mapRooms.forEach(r => r.classList.remove('active'));
      const el = document.getElementById('room-etage');
      if (el) el.classList.add('active');
      camBadgeName.textContent = 'CAM — ACCÈS ÉTAGE';
      showNoSignal();
      if (BRAD_PATH[state.bradIndex] === 'etage' && state.bradVisible) playSound(snd.robot, 0.6);
      return;
    }
    if (state.modules.camera.error || state.modules.camera.rebooting) {
      state.selectedRoom = roomId;
      mapRooms.forEach(r => r.classList.remove('active'));
      const el = document.getElementById(`room-${roomId}`);
      if (el) el.classList.add('active');
      camBadgeName.textContent = `CAM — ${roomId.replace(/-/g,' ').toUpperCase()}`;
      hideNoSignal(); showBlackScreen(); return;
    }
    hideNoSignal(); hideBlackScreen();
    state.selectedRoom = roomId;
    playSound(snd.clicCamera, 0.5);
    mapRooms.forEach(r => r.classList.remove('active'));
    const el = document.getElementById(`room-${roomId}`);
    if (el) el.classList.add('active');
    camBadgeName.textContent = `CAM — ${roomId.replace(/-/g,' ').toUpperCase()}`;

    let baseSrc = CAM_IMAGES[roomId] || '';
    const thr = DOOR_THRESHOLDS[roomId];
    if (thr !== undefined && state.bradMaxIndex > thr) {
      if (roomId === 'salle-de-bain') baseSrc = 'assets/images/cameras/salle-de-bain-ouverte.jpeg';
      if (roomId === 'cuisine')       baseSrc = 'assets/images/cameras/cuisine-ouverte.jpeg';
    }

    // Brad visible sur toutes les caméras dès 2AM (bradVisible)
    const bradHere = BRAD_PATH[state.bradIndex] === roomId && state.bradVisible;

    if (bradHere) {
      let bradKey = roomId;
      if (roomId === 'cellier') bradKey = 'cellier-' + state.bradPhase;
      if (roomId === 'cuisine' && Math.random() < 0.05) bradKey = 'cuisine-rare';
      if (roomId === 'couloir') playSound(snd.robot, 0.6);
      camImg.src = BRAD_IMAGES[bradKey] || baseSrc;
    } else {
      camImg.src = baseSrc;
    }
  }

  mapRooms.forEach(r => {
    r.addEventListener('click', () => {
      // Pas de navigation si maintenance ouvert
      if (!panelMaintenance.classList.contains('hidden')) return;
      const id = r.dataset.room;
      if (id) selectRoom(id);
    });
  });

  // ══════════════════════════════════════
  // CARTE — Brad visible seulement si bradIndex >= BRAD_CAM_SHOW_INDEX
  // ══════════════════════════════════════

  function refreshMap() {
    mapRooms.forEach(r => r.classList.remove('brad-here'));
    if (!state.bradVisible) return;
    if (state.bradIndex < BRAD_CAM_SHOW_INDEX) return; // masqué avant le couloir
    const el = document.getElementById(`room-${BRAD_PATH[state.bradIndex]}`);
    if (el) el.classList.add('brad-here');
  }

  // ══════════════════════════════════════
  // DÉPLACEMENT BRAD
  // ══════════════════════════════════════

  function getBradInterval() {
    return Math.max(BRAD_MOVE_MIN, BRAD_MOVE_BASE - (BRAD_MOVE_BASE - BRAD_MOVE_MIN) * state.nightProgress);
  }

  function moveBrad() {
    if (state.over || state.bradIndex >= BRAD_PATH.length - 1) return;
    if (!state.bradVisible) { scheduleBradMove(); return; }
    if (state.bradIndex === 0 && state.bradPhase === 1) {
      state.bradPhase = 2; refreshMap();
      if (state.selectedRoom === 'cellier') selectRoom('cellier');
      scheduleBradMove(); return;
    }
    state.bradIndex++; state.bradPhase = 1;
    if (state.bradIndex > state.bradMaxIndex) state.bradMaxIndex = state.bradIndex;
    playSound(snd.pounding, 0.7); refreshMap();
    const newRoom = BRAD_PATH[state.bradIndex];
    if (newRoom === 'etage') { triggerStairAlert(); return; }
    if (state.selectedRoom === newRoom) selectRoom(newRoom);
    if (state.selectedRoom === BRAD_PATH[state.bradIndex - 1]) selectRoom(state.selectedRoom);
    scheduleBradMove();
  }

  let bradMoveTimeout = null;
  function scheduleBradMove() {
    if (state.over) return;
    clearTimeout(bradMoveTimeout);
    const interval = getBradInterval();
    const watching = state.selectedRoom === BRAD_PATH[state.bradIndex];
    bradMoveTimeout = setTimeout(moveBrad, (watching ? interval : interval * 0.6) + Math.random() * 4000);
  }

  // ══════════════════════════════════════
  // ACCÈS ÉTAGE
  // ══════════════════════════════════════

  function triggerStairAlert() {
    if (state.stairActive) return;
    state.stairActive = true;
    stairAlert.classList.remove('hidden');
    playSound(snd.pounding, 0.9);
    const total = Math.max(STAIR_WINDOW_MIN, STAIR_WINDOW_BASE - (STAIR_WINDOW_BASE - STAIR_WINDOW_MIN) * state.nightProgress);
    const start = Date.now();
    function tick() {
      if (!state.stairActive) return;
      const rem = Math.max(0, total - (Date.now() - start));
      stairTimerFill.style.width = ((rem / total) * 100) + '%';
      if (rem <= 0) triggerJumpscare();
      else state.stairTimer = requestAnimationFrame(tick);
    }
    state.stairTimer = requestAnimationFrame(tick);
  }

  function resolveStairAlert() {
    if (!state.stairActive) return;
    state.stairActive = false;
    cancelAnimationFrame(state.stairTimer);
    stairAlert.classList.add('hidden');
    stairTimerFill.style.width = '100%';
    state.bradIndex = Math.max(0, state.bradIndex - 1);
    state.bradPhase = 1; refreshMap(); scheduleBradMove();
  }

  // ══════════════════════════════════════
  // PLAY AUDIO
  // ══════════════════════════════════════

  btnAudio.addEventListener('click', () => {
    if (state.audioCooldown || state.modules.audio.error || state.over) return;
    playHello();
    if (state.stairActive) {
      startAudioCooldown();
      setTimeout(() => { if (!state.over) resolveStairAlert(); }, 1500);
      return;
    }
    const targetIdx = BRAD_PATH.indexOf(state.selectedRoom);
    const bradIdx   = state.bradIndex;
    startAudioCooldown();
    clearTimeout(bradMoveTimeout);
    setTimeout(() => {
      if (state.over) return;
      // Recule uniquement si audio joué dans la pièce JUSTE avant Brad
      if (targetIdx !== -1 && targetIdx === bradIdx - 1) {
        state.bradIndex = Math.max(0, bradIdx - 1);
        state.bradPhase = state.bradIndex === 0 ? 2 : 1;
      } else if (targetIdx !== -1 && targetIdx > bradIdx) {
        state.bradIndex = Math.min(BRAD_PATH.length - 2, bradIdx + 1);
        state.bradPhase = 1;
        if (BRAD_PATH[state.bradIndex] === 'etage') { triggerStairAlert(); return; }
        playSound(snd.pounding, 0.5);
      }
      refreshMap();
      if (state.selectedRoom === BRAD_PATH[state.bradIndex] ||
          state.selectedRoom === BRAD_PATH[bradIdx]) selectRoom(state.selectedRoom);
      scheduleBradMove();
    }, 3000);
  });

  function startAudioCooldown() {
    state.audioCooldown = true;
    btnAudio.disabled = true; btnAudio.textContent = 'Audio en cours...';
    setTimeout(() => {
      state.audioCooldown = false;
      btnAudio.disabled = false; btnAudio.textContent = 'Play audio';
    }, 5000);
  }

  // ══════════════════════════════════════
  // MAINTENANCE
  // ══════════════════════════════════════

  btnMaintenance.addEventListener('click', () => {
    if (state.over) return;
    playSound(snd.tabletteOpen, 0.6);
    panelMaintenance.classList.remove('hidden');
  });

  btnMaintenanceClose.addEventListener('click', () => {
    const anyRebooting = Object.values(state.modules).some(m => m.rebooting);
    if (anyRebooting) {
      maintLockMsg.classList.remove('hidden');
      setTimeout(() => maintLockMsg.classList.add('hidden'), 2000);
      return;
    }
    playSound(snd.tabletteClose, 0.6);
    panelMaintenance.classList.add('hidden');
  });

  maintItems.forEach(item => {
    item.addEventListener('click', () => {
      const mod = item.dataset.module;
      if (!mod || !state.modules[mod]) return;
      if (state.modules[mod].rebooting || !state.modules[mod].error) return;
      rebootModule(mod, 6000 + Math.random() * 4000);
    });
  });

  // Tout redémarrer — son reboot rejoué à chaque appel
  maintRebootAll.addEventListener('click', () => {
    if (state.rebootingAll) return;
    state.rebootingAll = true;
    ['audio','camera'].forEach(m => {
      if (state.modules[m] && !state.modules[m].rebooting) {
        state.modules[m].rebooting = true;
        state.modules[m].error = false;
      }
    });
    // Son reboot créé dynamiquement pour éviter le bug de cache audio
    playRebootSound();
    updateModuleIndicators();
    updateMaintenanceBtnState();
    selectRoom(state.selectedRoom);
    setTimeout(() => {
      ['audio','camera'].forEach(m => {
        if (state.modules[m]) state.modules[m].rebooting = false;
      });
      state.rebootingAll = false;
      updateErrorDisplay();
      updateModuleIndicators();
      updateMaintenanceBtnState();
      selectRoom(state.selectedRoom);
    }, REBOOT_ALL_DURATION);
  });

  // Crée un nouvel élément audio à chaque fois pour éviter le blocage
  function playRebootSound() {
    try {
      const a = new Audio('assets/audio/effect/reboot.mp3');
      a.volume = 0.6;
      a.play().catch(() => {});
    } catch(e) {
      // Fallback sur l'élément existant
      playSound(snd.reboot, 0.6);
    }
  }

  function rebootModule(mod, duration) {
    const m = state.modules[mod];
    if (!m) return;
    m.rebooting = true; m.error = false;
    playRebootSound();
    updateModuleIndicators();
    updateMaintenanceBtnState();
    if (mod === 'camera') selectRoom(state.selectedRoom);
    setTimeout(() => {
      m.rebooting = false;
      updateErrorDisplay();
      updateModuleIndicators();
      updateMaintenanceBtnState();
      if (mod === 'camera') selectRoom(state.selectedRoom);
    }, duration || 8000);
  }

  function updateMaintenanceBtnState() {
    if (hasAnyError()) {
      btnMaintenance.classList.add('has-error');
      btnMaintenance.textContent = 'Maintenance — erreur';
    } else {
      btnMaintenance.classList.remove('has-error');
      btnMaintenance.textContent = 'Maintenance';
    }
  }

  // Statuts — textContent UNIQUEMENT
  // Clignotement géré par setInterval JS pur — aucune dépendance CSS
  const blinkIntervals = {};
  function startBlink(el, color, speed) {
    stopBlink(el);
    let visible = true;
    el.style.color = color;
    blinkIntervals[el.id] = setInterval(() => {
      visible = !visible;
      el.style.opacity = visible ? '1' : '0';
    }, speed);
  }
  function stopBlink(el) {
    if (blinkIntervals[el.id]) {
      clearInterval(blinkIntervals[el.id]);
      delete blinkIntervals[el.id];
    }
    el.style.opacity = '1';
  }

  function updateModuleIndicators() {
    ['audio','camera'].forEach(mod => {
      const m      = state.modules[mod];
      const status = document.getElementById('maint-' + mod + '-status');
      if (!status || !m) return;
      status.removeAttribute('style');
      stopBlink(status);
      if (m.error) {
        status.textContent = 'erreur';
        status.style.cssText = 'font-weight:bold;font-size:10px;letter-spacing:2px;';
        startBlink(status, '#cc2020', 350);
      } else if (m.rebooting) {
        status.textContent = 'redémarrage...';
        status.style.cssText = 'font-size:10px;letter-spacing:2px;';
        startBlink(status, '#c0a010', 600);
      } else {
        status.textContent = 'OK';
        status.style.cssText = 'color:#2a8a2a;font-size:10px;letter-spacing:2px;opacity:1;';
      }
    });
  }

  function scheduleNextError() {
    if (state.over) return;
    const interval = Math.max(ERROR_INTERVAL_MIN,
      ERROR_INTERVAL_BASE - (ERROR_INTERVAL_BASE - ERROR_INTERVAL_MIN) * state.nightProgress);
    setTimeout(() => {
      if (state.over || state.callPlaying) { scheduleNextError(); return; }
      const targets = ['audio','camera']
        .filter(m => !state.modules[m].error && !state.modules[m].rebooting);
      if (targets.length > 0) {
        const mod = targets[Math.floor(Math.random() * targets.length)];
        state.modules[mod].error = true;
        updateErrorDisplay();
        updateModuleIndicators();
        updateMaintenanceBtnState();
        startAlarm();
      }
      scheduleNextError();
    }, interval * (0.7 + Math.random() * 0.6));
  }

  let alarmInterval = null;
  function startAlarm() {
    if (alarmInterval) return;
    playSound(snd.alarm, 0.7);
    alarmInterval = setInterval(() => {
      if (hasAnyError()) playSound(snd.alarm, 0.7);
      else { clearInterval(alarmInterval); alarmInterval = null; }
    }, 2500);
  }

  function hasAnyError() {
    return Object.values(state.modules).some(m => m.error);
  }

  function updateErrorDisplay() {
    const errors = Object.entries(state.modules)
      .filter(([, m]) => m.error).map(([k]) => `erreur ${k}`);
    if (errors.length > 0) {
      errorDisplay.classList.remove('hidden');
      errorText.textContent = errors.join(' — ');
    } else {
      errorDisplay.classList.add('hidden');
    }
  }

  // ══════════════════════════════════════
  // APPEL PHONE GUY
  // ══════════════════════════════════════

  function startPhoneCall() {
    if (state.over) return;
    state.callPlaying = true;
    pauseAmbiance();
    playSound(snd.call, 0.75);
    setTimeout(() => { if (state.callPlaying) btnMuteCall.classList.remove('hidden'); }, 5000);
    snd.call.onended = () => {
      if (state.callMuted) return;
      state.callPlaying = false;
      btnMuteCall.classList.add('hidden');
      resumeAmbiance();
    };
  }

  btnMuteCall.addEventListener('click', () => {
    if (state.callMuted) return;
    state.callMuted = true;
    stopSound(snd.call);
    btnMuteCall.classList.add('hidden');
    state.callPlaying = false;
    resumeAmbiance();
  });

  function playRingTimes(times, onDone) {
    if (times <= 0 || state.over) { if (onDone) onDone(); return; }
    playSound(snd.ring, 0.7);
    const dur = (snd.ring && snd.ring.duration > 0) ? snd.ring.duration * 1000 : 2000;
    setTimeout(() => playRingTimes(times - 1, onDone), dur + RING_PAUSE_MS);
  }

  // ══════════════════════════════════════
  // JUMPSCARE + MORT
  // ══════════════════════════════════════

  function triggerJumpscare() {
    if (state.over) return;
    state.over = true;
    stopAllAmbiance(); clearTimeout(bradMoveTimeout);
    screenGame.classList.add('hidden');
    screenJumpscare.classList.remove('hidden');
    jumpscareVideo.muted = false;
    jumpscareVideo.volume = 1;
    jumpscareVideo.play().catch(() => {});
    setTimeout(() => {
      screenJumpscare.classList.add('hidden');
      showDeathScreen();
    }, JUMPSCARE_DURATION);
  }

  function showDeathScreen() {
    screenDeath.classList.remove('hidden');
    playSound(snd.dead, 0.9);
    const dc = document.getElementById('death-noise');
    if (dc) {
      const dctx = dc.getContext('2d');
      (function dn() {
        if (screenDeath.classList.contains('hidden')) return;
        dc.width = window.innerWidth; dc.height = window.innerHeight;
        const img = dctx.createImageData(dc.width, dc.height);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.random() > 0.5 ? 255 : 0;
          img.data[i] = img.data[i+1] = img.data[i+2] = v;
          img.data[i+3] = Math.random() * 20;
        }
        dctx.putImageData(img, 0, 0); requestAnimationFrame(dn);
      })();
    }
    const btn = document.getElementById('death-btn-menu');
    if (btn) {
      btn.style.display = 'none';
      setTimeout(() => { btn.style.display = 'block'; btn.classList.add('visible'); }, DEATH_SCREEN_MIN);
      btn.addEventListener('click', () => { window.location.href = 'index.html'; });
    }
  }

  // ══════════════════════════════════════
  // HORLOGE
  // ══════════════════════════════════════

  // ── DEV SHORTCUT : clic sur l'heure pour finir la nuit ──
  const devHour = document.getElementById('hud-hour');
  const devNight = document.getElementById('hud-night');
  function devFinish() { if (!state.over) triggerNightEnd(); }
  if (devHour)  devHour.addEventListener('click',  devFinish);
  if (devNight) devNight.addEventListener('click', devFinish);

  function startGameClock() {
    const startTime    = Date.now();
    const hourInterval = NIGHT_DURATION / (HOURS.length - 1);
    function tick() {
      if (state.over) return;
      const elapsed       = Date.now() - startTime;
      state.nightProgress = Math.min(1, elapsed / NIGHT_DURATION);
      const hourIdx = Math.min(Math.floor(elapsed / hourInterval), HOURS.length - 1);
      if (hourIdx !== state.currentHour) {
        state.currentHour = hourIdx;
        hudHour.textContent = HOURS[hourIdx];
        if (hourIdx >= BRAD_VISIBLE_HOUR && !state.bradVisible) {
          state.bradVisible = true; refreshMap(); selectRoom(state.selectedRoom);
        }
      }
      if (state.nightProgress >= 1) { triggerNightEnd(); return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ══════════════════════════════════════
  // FIN DE NUIT
  // ══════════════════════════════════════

  function triggerNightEnd() {
    if (state.over) return;
    state.over = true;
    stopAllAmbiance(); clearTimeout(bradMoveTimeout);
    screenGame.classList.add('hidden');
    showNightEndScreen();
  }

  function showNightEndScreen() {
    const screen = document.getElementById('screen-nightend');
    screen.classList.remove('hidden');

    // Animation 5AM → 6AM : seulement le chiffre change, AM reste fixe
    const timeEl  = screen.querySelector('.ns-time');
    const nightEl = screen.querySelector('.ns-night');
    if (timeEl) {
      // Construire le HTML avec chiffre animable séparé du AM
      timeEl.innerHTML = '<span id="end-number" style="display:inline-block;">5</span> AM';
      const numEl = document.getElementById('end-number');
      // Animation lente : glissement vers le bas puis le 6 arrive d'en haut
      setTimeout(() => {
        numEl.style.cssText = 'display:inline-block;animation:slideDown 1.4s ease forwards;';
        setTimeout(() => {
          numEl.textContent = '6';
          numEl.style.cssText = 'display:inline-block;opacity:0;transform:translateY(-40px);animation:slideUp 1.4s ease forwards;';
        }, 1600);
      }, 600);
    }
    if (nightEl) nightEl.textContent = 'NUIT TERMINÉE';

    if (snd.nightEnd) {
      snd.nightEnd.currentTime = 0;
      snd.nightEnd.volume = 0.8;
      snd.nightEnd.play().catch(() => {});
    }
    const audioDur = (snd.nightEnd && snd.nightEnd.duration > 0)
      ? snd.nightEnd.duration * 1000
      : 4000;

    Save.completeNight(NIGHT_NUMBER);
    setTimeout(() => { window.location.href = 'index.html'; }, audioDur + 3000);
  }

  // ══════════════════════════════════════
  // DÉMARRAGE
  // night-start coupé dès que le jeu se lance
  // ══════════════════════════════════════

  function startNight() {
    playSound(snd.nightStart, 0.8);

    setTimeout(() => {
      // Couper le night-start au moment où le jeu s'affiche
      stopSound(snd.nightStart);

      screenNightStart.classList.add('hidden');
      screenGame.classList.remove('hidden');
      drawNoise();
      selectRoom('cellier');
      refreshMap();
      updateModuleIndicators();
      startGameClock();
      scheduleBradMove();
      scheduleNextError();

      setTimeout(() => {
        playRingTimes(3, () => {
          startPhoneCall();
          // L'ambiance démarre depuis resumeAmbiance() à la fin de l'appel
        });
      }, 1000);
    }, 3000);
  }

})();
