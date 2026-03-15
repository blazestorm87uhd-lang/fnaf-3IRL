/* ═══════════════════════════════════════════
   GAME.JS — Logique nuit 1
   Brad Bitt, caméras, audio, maintenance, jumpscare
════════════════════════════════════════════ */

(() => {

  // ══════════════════════════════════════
  // CONSTANTES & CONFIG
  // ══════════════════════════════════════

  const NIGHT_NUMBER   = 1;
  const NIGHT_DURATION = 10 * 60 * 1000; // 10 min en ms
  const HOURS          = ['12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM'];

  // Chemin de déplacement de Brad
  const BRAD_PATH = [
    'cellier',       // index 0 — phase 1 puis phase 2
    'wc',            // index 1
    'salle-de-bain', // index 2
    'cuisine',       // index 3
    'salle-a-manger',// index 4
    'salon',         // index 5
    'couloir',       // index 6
    'etage',         // index 7 — accès étage, pas de caméra
  ];

  // Images caméras (pièce → fichier)
  const CAM_IMAGES = {
    'cellier':        'assets/images/cameras/cellier.jpeg',
    'wc':             'assets/images/cameras/wc.jpeg',
    'salle-de-bain':  'assets/images/cameras/salle-de-bain-ferme.jpeg',
    'cuisine':        'assets/images/cameras/cuisine-ferme.jpeg',
    'salle-a-manger': 'assets/images/cameras/salle-a-manger.jpeg',
    'salon':          'assets/images/cameras/salon.jpeg',
    'couloir':        'assets/images/cameras/couloir.jpeg',
  };

  // Images Brad par pièce
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

  // Intervalle de base déplacement Brad (ms) — se réduit au fil du temps
  const BRAD_MOVE_BASE  = 20000;
  const BRAD_MOVE_MIN   = 8000;

  // Fenêtre de réaction accès étage (ms) — se réduit aussi
  const STAIR_WINDOW_BASE = 8000;
  const STAIR_WINDOW_MIN  = 3000;

  // Fréquence des erreurs modules (ms)
  const ERROR_INTERVAL_BASE = 45000;
  const ERROR_INTERVAL_MIN  = 20000;


  // ══════════════════════════════════════
  // ÉTAT DU JEU
  // ══════════════════════════════════════

  const state = {
    started:        false,
    over:           false,
    nightProgress:  0,      // 0..1 au fil des 10 min
    currentHour:    0,      // index dans HOURS
    selectedRoom:   'cellier',

    // Brad
    bradIndex:      0,      // index dans BRAD_PATH
    bradPhase:      1,      // 1 ou 2 (uniquement au cellier)
    bradMoving:     false,

    // Accès étage
    stairActive:    false,
    stairTimer:     null,
    stairRemaining: 0,

    // Modules
    modules: {
      audio:       { error: false, rebooting: false },
      camera:      { error: false, rebooting: false },
      ventilation: { error: false, rebooting: false },
    },

    // Appel Phone Guy
    callPlaying:   false,
    callMuted:     false,

    // Ambiance
    ambianceIndex: 0,

    // Audio en cours de play
    audioPlayed:   false,
    audioCooldown: false,
  };


  // ══════════════════════════════════════
  // ÉLÉMENTS DOM
  // ══════════════════════════════════════

  const screenNightStart  = document.getElementById('screen-nightstart');
  const screenGame        = document.getElementById('screen-game');
  const screenJumpscare   = document.getElementById('screen-jumpscare');
  const screenNightEnd    = document.getElementById('screen-nightend');

  const camImg            = document.getElementById('cam-img');
  const camBadgeName      = document.getElementById('cam-badge-name');
  const stairAlert        = document.getElementById('stair-alert');
  const stairTimerFill    = document.getElementById('stair-timer-fill');
  const errorDisplay      = document.getElementById('error-display');
  const errorText         = document.getElementById('error-text');

  const hudHour           = document.getElementById('hud-hour');
  const hudNight          = document.getElementById('hud-night');
  const mapRooms          = document.querySelectorAll('.map-room[data-room]');

  const btnAudio          = document.getElementById('btn-audio');
  const btnMaintenance    = document.getElementById('btn-maintenance');
  const btnMuteCall       = document.getElementById('btn-mute-call');
  const panelMaintenance  = document.getElementById('panel-maintenance');
  const btnMaintenanceClose = document.getElementById('btn-maintenance-close');
  const maintItems        = document.querySelectorAll('.maint-item');
  const maintRebootAll    = document.getElementById('maint-reboot-all');

  const jumpscareVideo    = document.getElementById('jumpscare-video');
  const noiseCanvas       = document.getElementById('game-noise');
  const nctx              = noiseCanvas.getContext('2d');

  // Sons
  const snd = {
    ambiance:   [
      document.getElementById('snd-ambiance-1'),
      document.getElementById('snd-ambiance-2'),
      document.getElementById('snd-ambiance-3'),
    ],
    ring:            document.getElementById('snd-ring'),
    call:            document.getElementById('snd-night1-call'),
    nightStart:      document.getElementById('snd-night-start'),
    nightEnd:        document.getElementById('snd-night-end'),
    clicCamera:      document.getElementById('snd-clic-camera'),
    robot:           document.getElementById('snd-robot'),
    pounding:        document.getElementById('snd-pounding'),
    alarm:           document.getElementById('snd-alarm'),
    reboot:          document.getElementById('snd-reboot'),
    tabletteOpen:    document.getElementById('snd-tablette-open'),
    tabletteClose:   document.getElementById('snd-tablette-close'),
    jumpscare:       document.getElementById('snd-jumpscare'),
  };


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
  // UTILITAIRES AUDIO
  // ══════════════════════════════════════

  function playSound(audio, volume = 0.8) {
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  }

  function stopSound(audio) {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  function fadeOut(audio, duration = 800) {
    if (!audio) return;
    const steps = 20;
    const interval = duration / steps;
    const delta = audio.volume / steps;
    const t = setInterval(() => {
      audio.volume = Math.max(0, audio.volume - delta);
      if (audio.volume <= 0) { clearInterval(t); stopSound(audio); }
    }, interval);
  }

  // Lance une ambiance aléatoire, alterne
  function startAmbiance() {
    const idx = Math.floor(Math.random() * 3);
    state.ambianceIndex = idx;
    const amb = snd.ambiance[idx];
    amb.volume = 0.35;
    amb.play().catch(() => {});

    // Quand elle se termine, en lancer une autre
    amb.onended = () => {
      let next = Math.floor(Math.random() * 3);
      if (next === idx) next = (next + 1) % 3;
      state.ambianceIndex = next;
      snd.ambiance[next].volume = 0.35;
      snd.ambiance[next].play().catch(() => {});
      snd.ambiance[next].onended = amb.onended;
    };
  }

  function stopAllAmbiance() {
    snd.ambiance.forEach(a => { a.pause(); a.currentTime = 0; });
  }


  // ══════════════════════════════════════
  // CAMÉRAS
  // ══════════════════════════════════════

  function selectRoom(roomId) {
    if (roomId === 'etage') return; // pas de caméra pour l'étage

    // Erreur caméra active → image bruitée (on garde juste l'overlay)
    if (state.modules.camera.error) {
      errorDisplay.classList.remove('hidden');
      errorText.textContent = 'erreur caméra';
      return;
    }

    state.selectedRoom = roomId;
    playSound(snd.clicCamera, 0.5);

    // Mettre à jour la carte
    mapRooms.forEach(r => r.classList.remove('active'));
    const activeEl = document.getElementById(`room-${roomId}`);
    if (activeEl) activeEl.classList.add('active');

    // Badge
    camBadgeName.textContent = `CAM — ${roomId.replace(/-/g, ' ').toUpperCase()}`;

    // Image de base
    let baseSrc = CAM_IMAGES[roomId] || '';

    // Si Brad est dans cette pièce → superposer l'image Brad
    const bradRoom = BRAD_PATH[state.bradIndex];
    if (bradRoom === roomId && roomId !== 'etage') {
      let bradKey = roomId;

      // Cellier : phase 1 ou 2
      if (roomId === 'cellier') bradKey = `cellier-${state.bradPhase}`;

      // Cuisine : rare aléatoire (5% de chance)
      if (roomId === 'cuisine' && Math.random() < 0.05) bradKey = 'cuisine-rare';

      // Salle de bain / cuisine : version ouverte si Brad est passé
      if (roomId === 'salle-de-bain') baseSrc = CAM_IMAGES['salle-de-bain'].replace('ferme','ouverte');
      if (roomId === 'cuisine' && state.bradIndex > 3) baseSrc = CAM_IMAGES['cuisine'].replace('ferme','ouverte');

      camImg.src = BRAD_IMAGES[bradKey] || baseSrc;

      // Son robot si Brad est dans le couloir
      if (roomId === 'couloir') playSound(snd.robot, 0.6);

    } else {
      // Ouvrir les portes si Brad est déjà passé
      if (roomId === 'salle-de-bain' && state.bradIndex > 2) {
        baseSrc = 'assets/images/cameras/salle-de-bain-ouverte.jpeg';
      }
      if (roomId === 'cuisine' && state.bradIndex > 3) {
        baseSrc = 'assets/images/cameras/cuisine-ouverte.jpeg';
      }
      camImg.src = baseSrc;
    }
  }

  // Lier les clics sur la carte
  mapRooms.forEach(room => {
    room.addEventListener('click', () => {
      const id = room.dataset.room;
      if (id && id !== 'etage') selectRoom(id);
    });
  });


  // ══════════════════════════════════════
  // DÉPLACEMENT DE BRAD
  // ══════════════════════════════════════

  function getBradMoveInterval() {
    const base = BRAD_MOVE_BASE;
    const min  = BRAD_MOVE_MIN;
    return Math.max(min, base - (base - min) * state.nightProgress);
  }

  function moveBrad() {
    if (state.over || state.bradIndex >= BRAD_PATH.length - 1) return;

    // Phase cellier : 1 → 2 d'abord
    if (state.bradIndex === 0 && state.bradPhase === 1) {
      state.bradPhase = 2;
      refreshMap();
      if (state.selectedRoom === 'cellier') selectRoom('cellier');
      scheduleBradMove();
      return;
    }

    state.bradIndex++;
    state.bradPhase = 1;

    const newRoom = BRAD_PATH[state.bradIndex];

    // Son de pas
    playSound(snd.pounding, 0.7);

    refreshMap();

    // Si Brad arrive à l'accès étage
    if (newRoom === 'etage') {
      triggerStairAlert();
      return;
    }

    // Refresh vue si on est sur la même caméra
    if (state.selectedRoom === newRoom) selectRoom(newRoom);
    if (state.selectedRoom === BRAD_PATH[state.bradIndex - 1]) selectRoom(state.selectedRoom);

    scheduleBradMove();
  }

  let bradMoveTimeout = null;

  function scheduleBradMove() {
    if (state.over) return;
    clearTimeout(bradMoveTimeout);
    const interval = getBradMoveInterval();
    // Chance d'avancer plus vite si le joueur ne regarde pas
    const watching = state.selectedRoom === BRAD_PATH[state.bradIndex];
    const delay    = watching ? interval : interval * 0.6;
    bradMoveTimeout = setTimeout(moveBrad, delay + Math.random() * 4000);
  }

  // Met à jour l'indicateur Brad sur la carte
  function refreshMap() {
    mapRooms.forEach(r => r.classList.remove('brad-here'));
    const bradRoom = BRAD_PATH[state.bradIndex];
    const el = document.getElementById(`room-${bradRoom}`);
    if (el) el.classList.add('brad-here');
  }


  // ══════════════════════════════════════
  // ACCÈS ÉTAGE
  // ══════════════════════════════════════

  function getStairWindow() {
    const base = STAIR_WINDOW_BASE;
    const min  = STAIR_WINDOW_MIN;
    return Math.max(min, base - (base - min) * state.nightProgress);
  }

  function triggerStairAlert() {
    if (state.stairActive) return;
    state.stairActive   = true;
    state.stairRemaining = getStairWindow();

    stairAlert.classList.remove('hidden');
    playSound(snd.pounding, 0.9);

    const totalTime = state.stairRemaining;
    const start     = Date.now();

    function tick() {
      if (!state.stairActive) return;
      const elapsed   = Date.now() - start;
      const remaining = Math.max(0, totalTime - elapsed);
      const pct       = (remaining / totalTime) * 100;

      stairTimerFill.style.width = pct + '%';

      if (remaining <= 0) {
        triggerJumpscare();
      } else {
        state.stairTimer = requestAnimationFrame(tick);
      }
    }
    state.stairTimer = requestAnimationFrame(tick);
  }

  function resolveStairAlert() {
    if (!state.stairActive) return;
    state.stairActive = false;
    cancelAnimationFrame(state.stairTimer);
    stairAlert.classList.add('hidden');
    stairTimerFill.style.width = '100%';

    // Brad recule d'une pièce (jouer audio dans le couloir l'attire)
    state.bradIndex = Math.max(0, state.bradIndex - 1);
    state.bradPhase = 1;
    refreshMap();
    playSound(snd.pounding, 0.5);
    scheduleBradMove();
  }


  // ══════════════════════════════════════
  // PLAY AUDIO
  // ══════════════════════════════════════

  btnAudio.addEventListener('click', () => {
    if (state.audioCooldown || state.modules.audio.error || state.over) return;

    // Son de retour audio immédiat pour feedback joueur
    playSound(snd.pounding, 0.45);

    // Si Brad est à l'accès étage → résout l'alerte
    if (state.stairActive) {
      // Petit délai réaliste avant que Brad réagisse
      setTimeout(() => {
        resolveStairAlert();
      }, 1500);
      startAudioCooldown();
      return;
    }

    // Sinon : attirer Brad vers la pièce N-1
    // Brad ne bouge pas immédiatement — délai de 3s
    if (state.bradIndex > 0) {
      const bradRoomBefore = BRAD_PATH[state.bradIndex];
      clearTimeout(bradMoveTimeout); // annule le prochain déplacement prévu

      setTimeout(() => {
        if (state.over) return;
        state.bradIndex--;
        state.bradPhase = state.bradIndex === 0 ? 2 : 1;
        refreshMap();
        playSound(snd.pounding, 0.5);

        // Refresh caméra si nécessaire
        if (state.selectedRoom === BRAD_PATH[state.bradIndex] ||
            state.selectedRoom === bradRoomBefore) {
          selectRoom(state.selectedRoom);
        }
        scheduleBradMove();
      }, 3000);
    }

    startAudioCooldown();
  });

  function startAudioCooldown() {
    state.audioCooldown = true;
    btnAudio.disabled   = true;
    btnAudio.textContent = 'Audio en cours...';
    setTimeout(() => {
      state.audioCooldown  = false;
      btnAudio.disabled    = false;
      btnAudio.textContent = 'Play audio';
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
    ['audio','camera','ventilation'].forEach(mod => {
      if (!state.modules[mod].rebooting) rebootModule(mod);
    });
  });

  function rebootModule(mod) {
    const m = state.modules[mod];
    m.rebooting = true;
    m.error     = false;

    const item = document.getElementById(`maint-${mod}`);
    if (item) { item.classList.remove('error'); item.classList.add('rebooting'); }

    playSound(snd.reboot, 0.6);

    const rebootTime = 6000 + Math.random() * 4000;
    setTimeout(() => {
      m.rebooting = false;
      if (item) item.classList.remove('rebooting');
      updateErrorDisplay();
    }, rebootTime);
  }

  // Déclenchement aléatoire des erreurs
  function scheduleNextError() {
    if (state.over) return;
    const base     = ERROR_INTERVAL_BASE;
    const min      = ERROR_INTERVAL_MIN;
    const interval = Math.max(min, base - (base - min) * state.nightProgress);
    const delay    = interval * (0.7 + Math.random() * 0.6);

    setTimeout(() => {
      if (state.over) return;
      const mods    = ['audio','camera','ventilation'];
      const targets = mods.filter(m => !state.modules[m].error && !state.modules[m].rebooting);
      if (targets.length > 0) {
        const mod = targets[Math.floor(Math.random() * targets.length)];
        state.modules[mod].error = true;
        const item = document.getElementById(`maint-${mod}`);
        if (item) item.classList.add('error');
        updateErrorDisplay();
        startAlarm();
      }
      scheduleNextError();
    }, delay);
  }

  let alarmInterval = null;
  function startAlarm() {
    if (alarmInterval) return;
    playSound(snd.alarm, 0.7);
    alarmInterval = setInterval(() => {
      if (hasAnyError()) {
        playSound(snd.alarm, 0.7);
      } else {
        clearInterval(alarmInterval);
        alarmInterval = null;
      }
    }, 2500);
  }

  function hasAnyError() {
    return Object.values(state.modules).some(m => m.error);
  }

  function updateErrorDisplay() {
    const errors = Object.entries(state.modules)
      .filter(([, m]) => m.error)
      .map(([k]) => `erreur ${k}`);

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

    // Lance l'enregistrement directement (la sonnerie a déjà joué)
    playSound(snd.call, 0.75);

    // Bouton mute call apparaît après 5s
    setTimeout(() => {
      if (state.callPlaying) btnMuteCall.classList.remove('hidden');
    }, 5000);

    snd.call.onended = () => {
      state.callPlaying = false;
      state.callMuted   = false;
      btnMuteCall.classList.add('hidden');
    };
  }

  btnMuteCall.addEventListener('click', () => {
    if (state.callMuted) return;
    state.callMuted = true;
    stopSound(snd.call);
    stopSound(snd.ring);
    btnMuteCall.classList.add('hidden');
    state.callPlaying = false;
  });


  // ══════════════════════════════════════
  // JUMPSCARE
  // ══════════════════════════════════════

  function triggerJumpscare() {
    if (state.over) return;
    state.over = true;

    stopAllAmbiance();
    clearTimeout(bradMoveTimeout);

    // Affiche l'écran jumpscare
    screenGame.classList.add('hidden');
    screenJumpscare.classList.remove('hidden');

    // Lance le son (pas l'audio de la vidéo)
    playSound(snd.jumpscare, 1.0);

    // Lance la vidéo sans son
    jumpscareVideo.muted = true;
    jumpscareVideo.play().catch(() => {});

    // Après 3.5 secondes → retour menu
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 3500);
  }


  // ══════════════════════════════════════
  // HORLOGE DE JEU
  // ══════════════════════════════════════

  function startGameClock() {
    const startTime = Date.now();
    const hourInterval = NIGHT_DURATION / (HOURS.length - 1);

    function tick() {
      if (state.over) return;

      const elapsed       = Date.now() - startTime;
      state.nightProgress = Math.min(1, elapsed / NIGHT_DURATION);

      // Heure courante
      const hourIdx = Math.min(
        Math.floor(elapsed / hourInterval),
        HOURS.length - 1
      );

      if (hourIdx !== state.currentHour) {
        state.currentHour = hourIdx;
        hudHour.textContent = HOURS[hourIdx];
      }

      // 6 AM → victoire
      if (state.nightProgress >= 1) {
        triggerNightEnd();
        return;
      }

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

    // Sauvegarder la progression
    Save.completeNight(NIGHT_NUMBER);

    // Retour menu après 4s
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 4000);
  }


  // ══════════════════════════════════════
  // SÉQUENCE DE DÉMARRAGE
  // ══════════════════════════════════════

  function startNight() {
    // Son night-start joue sur l'écran 12 AM
    playSound(snd.nightStart, 0.8);

    // Brad visible dès le départ sur la carte
    refreshMap();

    // Affiche "12 AM Night 1" pendant 3s puis bascule sur le jeu
    setTimeout(() => {
      screenNightStart.classList.add('hidden');
      screenGame.classList.remove('hidden');

      drawNoise();
      selectRoom('cellier');   // caméra cellier par défaut
      refreshMap();            // indicateur Brad visible immédiatement
      startAmbiance();
      startGameClock();
      scheduleBradMove();
      scheduleNextError();

      // Sonnerie après 1s, puis appel Phone Guy
      setTimeout(() => {
        playSound(snd.ring, 0.7);
        // L'appel démarre quand la sonnerie se termine (ou après 3s max)
        const ringDuration = (snd.ring.duration || 3) * 1000;
        setTimeout(startPhoneCall, Math.min(ringDuration, 3000));
      }, 1000);

    }, 3000);
  }

  // Lancer au chargement de la page
  startNight();

})();
