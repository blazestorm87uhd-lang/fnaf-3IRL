/* ═══════════════════════════════════════════
   GAME.JS v5
   - 3 sonneries au démarrage AVANT l'appel
   - Écran criblé sur CAM ÉTAGE (pas couloir)
   - Portes ouvertes uniquement si bradMaxIndex > index pièce
   - Pounding uniquement si bradVisible (après 2AM)
   - Texte "erreur" rouge sur bouton Maintenance
════════════════════════════════════════════ */

(() => {

  // ══════════════════════════════════════
  // CONFIG
  // ══════════════════════════════════════

  const NIGHT_NUMBER          = 1;
  const NIGHT_DURATION        = 10 * 60 * 1000;
  const HOURS                 = ['12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM'];
  const BRAD_VISIBLE_HOUR     = 2;
  const AMBIANCE_MAX_DURATION = 30000;

  const BRAD_PATH = [
    'cellier','wc','salle-de-bain','cuisine',
    'salle-a-manger','salon','couloir','etage',
  ];

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

  // Index dans BRAD_PATH à partir duquel les portes s'ouvrent
  // salle-de-bain = index 2, cuisine = index 3
  // La porte s'ouvre uniquement si bradMaxIndex > cet index (Brad EST PASSÉ)
  const DOOR_THRESHOLDS = {
    'salle-de-bain': 2,
    'cuisine':       3,
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
    bradMaxIndex: 0,          // index max réellement atteint par Brad
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

  // Enregistrement perso en .m4a
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
  // AMBIANCE — 30sec max, pause pendant appel
  // ══════════════════════════════════════

  let ambianceTimeout = null;
  let currentAmbiance = null;

  function startAmbiance() {
    if (state.ambiancePaused || state.over) return;
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
  // OVERLAY "PAS D'IMAGE" — utilisé pour l'ÉTAGE
  // ══════════════════════════════════════

  function showNoSignal() {
    camImg.style.display = 'none';
    let overlay = document.getElementById('cam-no-signal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cam-no-signal';
      overlay.style.cssText = `
        position:absolute;inset:0;z-index:6;
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        background:#000;
      `;
      const c = document.createElement('canvas');
      c.id = 'static-canvas';
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0.85;';
      overlay.appendChild(c);
      const txt = document.createElement('div');
      txt.style.cssText = `
        position:relative;z-index:2;
        font-family:'Share Tech Mono',monospace;
        font-size:13px;letter-spacing:4px;
        color:#cc2020;text-align:center;
        animation:blink 0.8s step-start infinite;
        text-shadow:0 0 8px rgba(200,30,30,0.6);
      `;
      txt.innerHTML = "PAS D'IMAGE<br><span style='font-size:10px;color:#555;letter-spacing:3px;'>SON UNIQUEMENT</span>";
      overlay.appendChild(txt);
      camView.appendChild(overlay);
      // Canvas statique animé
      const sctx = c.getContext('2d');
      function drawStatic() {
        if (!document.getElementById('cam-no-signal') ||
            document.getElementById('cam-no-signal').style.display === 'none') return;
        c.width  = c.offsetWidth  || 400;
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
  }

  function hideNoSignal() {
    const overlay = document.getElementById('cam-no-signal');
    if (overlay) overlay.style.display = 'none';
    camImg.style.display = 'block';
  }


  // ══════════════════════════════════════
  // CAMÉRAS
  // - étage → overlay "pas d'image"
  // - couloir → image normale
  // - portes → uniquement si bradMaxIndex > seuil
  // ══════════════════════════════════════

  function selectRoom(roomId) {
    // L'étage est cliquable mais affiche "pas d'image"
    if (roomId === 'etage') {
      state.selectedRoom = 'etage';
      mapRooms.forEach(r => r.classList.remove('active'));
      const el = document.getElementById('room-etage');
      if (el) el.classList.add('active');
      camBadgeName.textContent = 'CAM — ACCÈS ÉTAGE';
      showNoSignal();
      // Son robot si Brad est à l'étage
      if (BRAD_PATH[state.bradIndex] === 'etage' && state.bradVisible)
        playSound(snd.robot, 0.6);
      return;
    }

    if (state.modules.camera.error) {
      hideNoSignal();
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

    hideNoSignal();

    // Image de base
    let baseSrc = CAM_IMAGES[roomId] || '';

    // Porte ouverte UNIQUEMENT si Brad a réellement dépassé cette pièce
    // bradMaxIndex doit être STRICTEMENT supérieur à l'index de la pièce
    const threshold = DOOR_THRESHOLDS[roomId];
    if (threshold !== undefined && state.bradMaxIndex > threshold) {
      if (roomId === 'salle-de-bain')
        baseSrc = 'assets/images/cameras/salle-de-bain-ouverte.jpeg';
      if (roomId === 'cuisine')
        baseSrc = 'assets/images/cameras/cuisine-ouverte.jpeg';
    }

    // Brad visible seulement après 2AM ET s'il est dans cette pièce
    const bradHere = BRAD_PATH[state.bradIndex] === roomId && state.bradVisible;
    if (bradHere) {
      let bradKey = roomId;
      if (roomId === 'cellier') bradKey = `cellier-${state.bradPhase}`;
      if (roomId === 'cuisine' && Math.random() < 0.05) bradKey = 'cuisine-rare';
      camImg.src = BRAD_IMAGES[bradKey] || baseSrc;
      if (roomId === 'couloir') playSound(snd.robot, 0.6);
    } else {
      camImg.src = baseSrc;
    }
  }

  mapRooms.forEach(r => {
    r.addEventListener('click', () => {
      const id = r.dataset.room;
      if (id) selectRoom(id); // étage inclus maintenant
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
  // Pounding uniquement si bradVisible (après 2AM)
  // bradMaxIndex mis à jour uniquement quand Brad avance
  // ══════════════════════════════════════

  function getBradInterval() {
    return Math.max(BRAD_MOVE_MIN,
      BRAD_MOVE_BASE - (BRAD_MOVE_BASE - BRAD_MOVE_MIN) * state.nightProgress);
  }

  function moveBrad() {
    if (state.over || state.bradIndex >= BRAD_PATH.length - 1) return;
    // Brad ne bouge pas avant 2AM
    if (!state.bradVisible) { scheduleBradMove(); return; }

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

    // Mettre à jour l'index max (portes)
    if (state.bradIndex > state.bradMaxIndex)
      state.bradMaxIndex = state.bradIndex;

    // Pounding UNIQUEMENT si Brad est visible (après 2AM)
    if (state.bradVisible) playSound(snd.pounding, 0.7);

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
    if (state.bradVisible) playSound(snd.pounding, 0.9);
    const total = Math.max(STAIR_WINDOW_MIN,
      STAIR_WINDOW_BASE - (STAIR_WINDOW_BASE - STAIR_WINDOW_MIN) * state.nightProgress);
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
    state.bradPhase = 1;
    refreshMap();
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
        state.bradIndex = Math.max(0, bradIdx - 1);
        state.bradPhase = state.bradIndex === 0 ? 2 : 1;
        // Recul silencieux
      } else if (targetIdx !== -1 && targetIdx > bradIdx) {
        state.bradIndex = Math.min(BRAD_PATH.length - 2, bradIdx + 1);
        state.bradPhase = 1;
        if (state.bradIndex > state.bradMaxIndex)
          state.bradMaxIndex = state.bradIndex;
        if (BRAD_PATH[state.bradIndex] === 'etage') {
          triggerStairAlert(); return;
        }
        if (state.bradVisible) playSound(snd.pounding, 0.5);
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
  // MAINTENANCE — texte erreur visible
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

  // Texte "erreur" en rouge sur le bouton Maintenance + clignotement
  function updateMaintenanceBtnState() {
    if (hasAnyError()) {
      btnMaintenance.classList.add('has-error');
      btnMaintenance.textContent = 'Maintenance — erreur';
    } else {
      btnMaintenance.classList.remove('has-error');
      btnMaintenance.textContent = 'Maintenance';
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
  // 3 sonneries AVANT l'appel, ambiance coupée
  // ══════════════════════════════════════

  function startPhoneCall() {
    if (state.over) return;
    state.callPlaying = true;
    pauseAmbiance();
    playSound(snd.call, 0.75);
    setTimeout(() => {
      if (state.callPlaying) btnMuteCall.classList.remove('hidden');
    }, 5000);
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

  // Joue ring N fois puis appelle onDone
  function playRingTimes(times, onDone) {
    if (times <= 0 || state.over) { if (onDone) onDone(); return; }
    playSound(snd.ring, 0.7);
    // Attend la fin du son ring (ou 2.5s max) puis rejoue
    const ringDur = snd.ring.duration > 0
      ? snd.ring.duration * 1000
      : 2500;
    setTimeout(() => playRingTimes(times - 1, onDone), Math.min(ringDur, 2500) + 200);
  }


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
  // Séquence : night-start → écran 3s → jeu
  // → 3 sonneries → appel Phone Guy → ambiance
  // ══════════════════════════════════════

  function startNight() {
    playSound(snd.nightStart, 0.8);

    setTimeout(() => {
      screenNightStart.classList.add('hidden');
      screenGame.classList.remove('hidden');
      drawNoise();
      selectRoom('cellier');
      refreshMap();
      startGameClock();
      scheduleBradMove();
      scheduleNextError();

      // 3 sonneries dès le lancement, PUIS appel, PUIS ambiance
      setTimeout(() => {
        playRingTimes(3, () => {
          startPhoneCall();             // appel après les 3 sonneries
          // L'ambiance démarre après la fin de l'appel (géré dans onended)
          // mais on la lance aussi en fallback après 30s au cas où
          setTimeout(() => {
            if (!state.callPlaying && !state.over) startAmbiance();
          }, 30000);
        });
      }, 1000);

    }, 3000);
  }

  startNight();

})();
