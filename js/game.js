/* ═══════════════════════════════════════════
   GAME.JS v4
   - ring x3 APRÈS l'appel
   - ambiance coupée pendant l'appel, 30sec max par piste
   - portes et bruits de pas uniquement si Brad est réellement passé
   - couloir = écran criblé "pas d'image, son uniquement"
   - bouton Maintenance clignote en rouge si erreur active
════════════════════════════════════════════ */

(() => {

  // ══════════════════════════════════════
  // CONFIG
  // ══════════════════════════════════════

  const NIGHT_NUMBER        = 1;
  const NIGHT_DURATION      = 10 * 60 * 1000;
  const HOURS               = ['12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM'];
  const BRAD_VISIBLE_HOUR   = 2;
  const AMBIANCE_MAX_DURATION = 30000; // 30 secondes par piste

  const BRAD_PATH = [
    'cellier','wc','salle-de-bain','cuisine',
    'salle-a-manger','salon','couloir','etage',
  ];

  // Index max atteint par Brad (pour les portes)
  // On se base sur bradIndex réel, pas sur un compteur séparé

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

  const BRAD_MOVE_BASE      = 20000;
  const BRAD_MOVE_MIN       = 8000;
  const STAIR_WINDOW_BASE   = 8000;
  const STAIR_WINDOW_MIN    = 3000;
  const ERROR_INTERVAL_BASE = 45000;
  const ERROR_INTERVAL_MIN  = 20000;


  // ══════════════════════════════════════
  // ÉTAT
  // ══════════════════════════════════════

  const state = {
    over: false, nightProgress: 0, currentHour: 0,
    selectedRoom: 'cellier', bradVisible: false,
    bradIndex: 0, bradPhase: 1,
    // Index max jamais atteint par Brad (pour les portes ouvertes)
    bradMaxIndex: 0,
    stairActive: false, stairTimer: null,
    modules: {
      audio:       { error: false, rebooting: false },
      camera:      { error: false, rebooting: false },
      ventilation: { error: false, rebooting: false },
    },
    callPlaying: false, callMuted: false,
    ambiancePaused: false,
    audioCooldown: false,
  };


  // ══════════════════════════════════════
  // DOM
  // ══════════════════════════════════════

  const screenNightStart    = document.getElementById('screen-nightstart');
  const screenGame          = document.getElementById('screen-game');
  const screenJumpscare     = document.getElementById('screen-jumpscare');
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
    jumpscare:     document.getElementById('snd-jumpscare'),
  };

  if (snd.call) snd.call.src = 'assets/audio/effect/night1-call.m4a';

  function playSound(audio, vol = 0.8) {
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = Math.min(1, vol);
    audio.play().catch(() => {});
  }
  function stopSound(audio) {
    if (!audio) return;
    audio.pause(); audio.currentTime = 0;
  }


  // ══════════════════════════════════════
  // AMBIANCE — 30sec max, coupée pendant l'appel
  // ══════════════════════════════════════

  let ambianceTimeout = null;
  let currentAmbiance = null;

  function startAmbiance() {
    if (state.ambiancePaused || state.over) return;
    const idx = Math.floor(Math.random() * 3);
    currentAmbiance = snd.ambiance[idx];
    currentAmbiance.volume = 0.35;
    currentAmbiance.play().catch(() => {});

    // Couper après 30 secondes max puis relancer
    clearTimeout(ambianceTimeout);
    ambianceTimeout = setTimeout(() => {
      stopCurrentAmbiance();
      // Pause de 3-8 secondes entre les pistes
      const pause = 3000 + Math.random() * 5000;
      ambianceTimeout = setTimeout(() => {
        if (!state.ambiancePaused && !state.over) startAmbiance();
      }, pause);
    }, AMBIANCE_MAX_DURATION);
  }

  function stopCurrentAmbiance() {
    if (currentAmbiance) {
      currentAmbiance.pause();
      currentAmbiance.currentTime = 0;
      currentAmbiance = null;
    }
    clearTimeout(ambianceTimeout);
  }

  function pauseAmbiance() {
    state.ambiancePaused = true;
    stopCurrentAmbiance();
  }

  function resumeAmbiance() {
    if (!state.ambiancePaused) return;
    state.ambiancePaused = false;
    // Reprise après 2 secondes
    setTimeout(() => {
      if (!state.over && !state.ambiancePaused) startAmbiance();
    }, 2000);
  }

  function stopAllAmbiance() {
    state.ambiancePaused = true;
    stopCurrentAmbiance();
  }


  // ══════════════════════════════════════
  // BRUIT STATIQUE
  // ══════════════════════════════════════

  function resizeNoise() {
    noiseCanvas.width  = window.innerWidth;
    noiseCanvas.height = window.innerHeight;
  }
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
  // CAMÉRAS
  // Portes ouvertes uniquement si bradMaxIndex a dépassé la pièce
  // Couloir = écran criblé "pas d'image"
  // ══════════════════════════════════════

  // Overlay couloir — crée dynamiquement si pas encore dans le DOM
  function showCouloir() {
    camImg.style.display = 'none';

    let overlay = document.getElementById('cam-no-signal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cam-no-signal';
      overlay.style.cssText = `
        position:absolute; inset:0; z-index:6;
        display:flex; flex-direction:column;
        align-items:center; justify-content:center;
        background:#000;
      `;
      // Canvas statique
      const c = document.createElement('canvas');
      c.id = 'static-canvas';
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0.85;';
      overlay.appendChild(c);
      // Texte
      const txt = document.createElement('div');
      txt.style.cssText = `
        position:relative; z-index:2;
        font-family:'Share Tech Mono',monospace;
        font-size:13px; letter-spacing:4px;
        color:#cc2020; text-align:center;
        animation:blink 0.8s step-start infinite;
        text-shadow:0 0 8px rgba(200,30,30,0.6);
      `;
      txt.innerHTML = 'PAS D\'IMAGE<br><span style="font-size:10px;color:#555;letter-spacing:3px;">SON UNIQUEMENT</span>';
      overlay.appendChild(txt);
      camView.appendChild(overlay);

      // Animer le canvas statique
      const sctx = c.getContext('2d');
      function drawStatic() {
        if (!document.getElementById('cam-no-signal')) return;
        c.width = c.offsetWidth || 400;
        c.height = c.offsetHeight || 300;
        const img = sctx.createImageData(c.width, c.height);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.floor(Math.random() * 80);
          img.data[i] = img.data[i+1] = img.data[i+2] = v;
          img.data[i+3] = 255;
        }
        sctx.putImageData(img, 0, 0);
        requestAnimationFrame(drawStatic);
      }
      drawStatic();
    }
    overlay.style.display = 'flex';

    // Son robot si Brad est dans le couloir
    if (BRAD_PATH[state.bradIndex] === 'couloir' && state.bradVisible) {
      playSound(snd.robot, 0.6);
    }
  }

  function hideCouloir() {
    const overlay = document.getElementById('cam-no-signal');
    if (overlay) overlay.style.display = 'none';
    camImg.style.display = 'block';
  }

  function selectRoom(roomId) {
    if (roomId === 'etage') return;
    if (state.modules.camera.error) {
      hideCouloir();
      camImg.style.display = 'block';
      camImg.src = '';
      errorDisplay.classList.remove('hidden');
      errorText.textContent = 'erreur caméra';
      return;
    }

    state.selectedRoom = roomId;
    playSound(snd.clicCamera, 0.5);

    mapRooms.forEach(r => r.classList.remove('active'));
    const el = document.getElementById(`room-${roomId}`);
    if (el) el.classList.add('active');
    camBadgeName.textContent = `CAM — ${roomId.replace(/-/g,' ').toUpperCase()}`;

    // Couloir → écran criblé
    if (roomId === 'couloir') {
      showCouloir();
      return;
    }
    hideCouloir();

    // Portes ouvertes uniquement si Brad a RÉELLEMENT dépassé cette pièce
    // (bradMaxIndex > index de la pièce dans BRAD_PATH)
    const roomPathIdx = BRAD_PATH.indexOf(roomId);
    let baseSrc = CAM_IMAGES[roomId] || '';

    if (roomId === 'salle-de-bain' && state.bradMaxIndex > 2)
      baseSrc = 'assets/images/cameras/salle-de-bain-ouverte.jpeg';
    if (roomId === 'cuisine' && state.bradMaxIndex > 3)
      baseSrc = 'assets/images/cameras/cuisine-ouverte.jpeg';

    // Brad visible uniquement à partir de 2AM et s'il est dans cette pièce
    const bradHere = BRAD_PATH[state.bradIndex] === roomId && state.bradVisible;
    if (bradHere) {
      let bradKey = roomId;
      if (roomId === 'cellier') bradKey = `cellier-${state.bradPhase}`;
      if (roomId === 'cuisine' && Math.random() < 0.05) bradKey = 'cuisine-rare';
      camImg.src = BRAD_IMAGES[bradKey] || baseSrc;
    } else {
      camImg.src = baseSrc;
    }
  }

  mapRooms.forEach(r => {
    r.addEventListener('click', () => {
      const id = r.dataset.room;
      if (id && id !== 'etage') selectRoom(id);
    });
  });


  // ══════════════════════════════════════
  // CARTE
  // ══════════════════════════════════════

  function refreshMap() {
    mapRooms.forEach(r => r.classList.remove('brad-here'));
    if (!state.bradVisible) return;
    const el = document.getElementById(`room-${BRAD_PATH[state.bradIndex]}`);
    if (el) el.classList.add('brad-here');
  }


  // ══════════════════════════════════════
  // DÉPLACEMENT BRAD
  // bradMaxIndex = index max jamais atteint (pour les portes)
  // pounding uniquement quand Brad avance réellement
  // ══════════════════════════════════════

  function getBradInterval() {
    return Math.max(BRAD_MOVE_MIN,
      BRAD_MOVE_BASE - (BRAD_MOVE_BASE - BRAD_MOVE_MIN) * state.nightProgress);
  }

  function moveBrad() {
    if (state.over || state.bradIndex >= BRAD_PATH.length - 1) return;

    // Phase cellier 1 → 2
    if (state.bradIndex === 0 && state.bradPhase === 1) {
      state.bradPhase = 2;
      refreshMap();
      if (state.selectedRoom === 'cellier') selectRoom('cellier');
      scheduleBradMove();
      return;
    }

    state.bradIndex++;
    state.bradPhase = 1;

    // Mettre à jour l'index max (pour les portes)
    if (state.bradIndex > state.bradMaxIndex) {
      state.bradMaxIndex = state.bradIndex;
    }

    // Son de pas UNIQUEMENT quand Brad avance (pas quand il recule via audio)
    playSound(snd.pounding, 0.7);
    refreshMap();

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
    bradMoveTimeout = setTimeout(moveBrad,
      (watching ? interval : interval * 0.6) + Math.random() * 4000);
  }


  // ══════════════════════════════════════
  // ACCÈS ÉTAGE
  // ══════════════════════════════════════

  function triggerStairAlert() {
    if (state.stairActive) return;
    state.stairActive = true;
    stairAlert.classList.remove('hidden');
    playSound(snd.pounding, 0.9);
    const total = Math.max(STAIR_WINDOW_MIN,
      STAIR_WINDOW_BASE - (STAIR_WINDOW_BASE - STAIR_WINDOW_MIN) * state.nightProgress);
    const start = Date.now();
    function tick() {
      if (!state.stairActive) return;
      const rem = Math.max(0, total - (Date.now() - start));
      stairTimerFill.style.width = ((rem / total) * 100) + '%';
      if (rem <= 0) { triggerJumpscare(); }
      else { state.stairTimer = requestAnimationFrame(tick); }
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
    state.bradPhase = 1;
    refreshMap();
    // Pas de pounding ici — Brad recule silencieusement
    scheduleBradMove();
  }


  // ══════════════════════════════════════
  // PLAY AUDIO
  // ══════════════════════════════════════

  btnAudio.addEventListener('click', () => {
    if (state.audioCooldown || state.modules.audio.error || state.over) return;

    playSound(snd.pounding, 0.4);

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
      if (targetIdx !== -1 && targetIdx < bradIdx) {
        // Derrière → recule (attiré)
        state.bradIndex = Math.max(0, bradIdx - 1);
        state.bradPhase = state.bradIndex === 0 ? 2 : 1;
        // Pas de pounding : Brad se déplace vers le son discrètement
      } else if (targetIdx !== -1 && targetIdx > bradIdx) {
        // Devant → avance
        state.bradIndex = Math.min(BRAD_PATH.length - 2, bradIdx + 1);
        state.bradPhase = 1;
        if (state.bradIndex > state.bradMaxIndex)
          state.bradMaxIndex = state.bradIndex;
        if (BRAD_PATH[state.bradIndex] === 'etage') {
          triggerStairAlert(); return;
        }
        playSound(snd.pounding, 0.5);
      }
      refreshMap();
      if (state.selectedRoom === BRAD_PATH[state.bradIndex] ||
          state.selectedRoom === BRAD_PATH[bradIdx]) {
        selectRoom(state.selectedRoom);
      }
      scheduleBradMove();
    }, 3000);
  });

  function startAudioCooldown() {
    state.audioCooldown  = true;
    btnAudio.disabled    = true;
    btnAudio.textContent = 'Audio en cours...';
    setTimeout(() => {
      state.audioCooldown  = false;
      btnAudio.disabled    = false;
      btnAudio.textContent = 'Play audio';
    }, 5000);
  }


  // ══════════════════════════════════════
  // MAINTENANCE — bouton clignote si erreur
  // ══════════════════════════════════════

  btnMaintenance.addEventListener('click', () => {
    if (state.over) return;
    playSound(snd.tabletteOpen, 0.6);
    panelMaintenance.classList.remove('hidden');
  });
  btnMaintenanceClose.addEventListener('click', () => {
    playSound(snd.tabletteClose, 0.6);
    panelMaintenance.classList.add('hidden');
  });
  maintItems.forEach(item => {
    item.addEventListener('click', () => {
      const mod = item.dataset.module;
      if (!mod || state.modules[mod].rebooting) return;
      rebootModule(mod);
    });
  });
  maintRebootAll.addEventListener('click', () => {
    ['audio','camera','ventilation'].forEach(m => {
      if (!state.modules[m].rebooting) rebootModule(m);
    });
  });

  function rebootModule(mod) {
    const m = state.modules[mod];
    m.rebooting = true; m.error = false;
    const item = document.getElementById(`maint-${mod}`);
    if (item) { item.classList.remove('error'); item.classList.add('rebooting'); }
    playSound(snd.reboot, 0.6);
    updateMaintenanceBtnState();
    setTimeout(() => {
      m.rebooting = false;
      if (item) item.classList.remove('rebooting');
      updateErrorDisplay();
      updateMaintenanceBtnState();
    }, 6000 + Math.random() * 4000);
  }

  // Fait clignoter le bouton Maintenance en rouge si erreur
  function updateMaintenanceBtnState() {
    if (hasAnyError()) {
      btnMaintenance.classList.add('has-error');
    } else {
      btnMaintenance.classList.remove('has-error');
    }
  }

  function scheduleNextError() {
    if (state.over) return;
    const interval = Math.max(ERROR_INTERVAL_MIN,
      ERROR_INTERVAL_BASE - (ERROR_INTERVAL_BASE - ERROR_INTERVAL_MIN) * state.nightProgress);
    setTimeout(() => {
      if (state.over) return;
      const targets = ['audio','camera','ventilation']
        .filter(m => !state.modules[m].error && !state.modules[m].rebooting);
      if (targets.length > 0) {
        const mod = targets[Math.floor(Math.random() * targets.length)];
        state.modules[mod].error = true;
        const item = document.getElementById(`maint-${mod}`);
        if (item) item.classList.add('error');
        updateErrorDisplay();
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
      if (hasAnyError()) { playSound(snd.alarm, 0.7); }
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
  // Ring x3 APRÈS l'appel — ambiance coupée pendant
  // ══════════════════════════════════════

  function startPhoneCall() {
    if (state.over) return;
    state.callPlaying = true;
    pauseAmbiance(); // coupe l'ambiance pendant l'appel
    playSound(snd.call, 0.75);

    setTimeout(() => {
      if (state.callPlaying) btnMuteCall.classList.remove('hidden');
    }, 5000);

    snd.call.onended = () => {
      if (state.callMuted) return;
      state.callPlaying = false;
      btnMuteCall.classList.add('hidden');
      // Ring x3 après l'appel
      ringAfterCall(3, () => {
        resumeAmbiance(); // reprend l'ambiance après les sonneries
      });
    };
  }

  function ringAfterCall(times, onDone) {
    if (times <= 0 || state.over) { if (onDone) onDone(); return; }
    playSound(snd.ring, 0.6);
    const ringDur = (snd.ring.duration || 2) * 1000;
    setTimeout(() => {
      ringAfterCall(times - 1, onDone);
    }, Math.min(ringDur, 2500) + 300);
  }

  btnMuteCall.addEventListener('click', () => {
    if (state.callMuted) return;
    state.callMuted = true;
    stopSound(snd.call);
    stopSound(snd.ring);
    btnMuteCall.classList.add('hidden');
    state.callPlaying = false;
    resumeAmbiance(); // reprend l'ambiance si on coupe l'appel
  });


  // ══════════════════════════════════════
  // JUMPSCARE
  // ══════════════════════════════════════

  function triggerJumpscare() {
    if (state.over) return;
    state.over = true;
    stopAllAmbiance();
    clearTimeout(bradMoveTimeout);
    screenGame.classList.add('hidden');
    screenJumpscare.classList.remove('hidden');
    playSound(snd.jumpscare, 1.0);
    jumpscareVideo.muted = true;
    jumpscareVideo.play().catch(() => {});
    setTimeout(() => { window.location.href = 'index.html'; }, 3500);
  }


  // ══════════════════════════════════════
  // HORLOGE
  // ══════════════════════════════════════

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
          state.bradVisible = true;
          refreshMap();
          selectRoom(state.selectedRoom);
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
    stopAllAmbiance();
    clearTimeout(bradMoveTimeout);
    playSound(snd.nightEnd, 0.8);
    screenGame.classList.add('hidden');
    screenNightEnd.classList.remove('hidden');
    Save.completeNight(NIGHT_NUMBER);
    setTimeout(() => { window.location.href = 'index.html'; }, 4000);
  }


  // ══════════════════════════════════════
  // DÉMARRAGE
  // ══════════════════════════════════════

  function startNight() {
    playSound(snd.nightStart, 0.8);
    setTimeout(() => {
      screenNightStart.classList.add('hidden');
      screenGame.classList.remove('hidden');
      drawNoise();
      selectRoom('cellier');
      refreshMap();
      startAmbiance();
      startGameClock();
      scheduleBradMove();
      scheduleNextError();
      // Sonnerie → appel
      setTimeout(() => {
        playSound(snd.ring, 0.7);
        setTimeout(() => { stopSound(snd.ring); startPhoneCall(); }, 3000);
      }, 1000);
    }, 3000);
  }

  startNight();

})();
