/* ═══════════════════════════════════════════
   GAME2.JS — Nuit 2
   Brad (plus rapide) + Frank Lebœuf (boîte à musique)
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

  // ══════════════════════════════════════
  // CONFIG
  // ══════════════════════════════════════

  const NIGHT_NUMBER          = 2;
  const NIGHT_DURATION        = 10 * 60 * 1000;
  const HOURS                 = ['12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM'];
  const BRAD_VISIBLE_HOUR     = 1;
  const AMBIANCE_MAX_DURATION = 30000;
  const JUMPSCARE_DURATION    = 4000;
  const DEATH_SCREEN_MIN      = 6000;
  const REBOOT_ALL_DURATION   = 17000;
  const RING_PAUSE_MS         = 2200;  // pause plus longue entre sonneries
  const BRAD_CAM_SHOW_INDEX   = 6; // couloir+

  // Brad nuit 2 — légèrement plus rapide
  const BRAD_MOVE_BASE        = 16000;
  const BRAD_MOVE_MIN         = 6000;

  // Erreurs nuit 2 — légèrement plus fréquentes
  const ERROR_INTERVAL_BASE   = 110000;
  const ERROR_INTERVAL_MIN    =  60000;

  // Boîte à musique
  const MUSICBOX_DRAIN_MS     = 130000; // 130s pour se vider complètement
  const MUSICBOX_WARN_THRESH  = 0.25;   // jaune sous 25%
  const MUSICBOX_CRIT_THRESH  = 0.10;   // rouge à 10%
  const MUSICBOX_FRANK_DELAY  = 6000;   // secondes avant jumpscare une fois vide
  const REWIND_RATE           = 0.008;  // gain par tick (100ms) — plus lent
  const REWIND_SOUND_COOLDOWN = 750;    // ms entre chaque son remonter

  const STAIR_WINDOW_BASE     = 8000;
  const STAIR_WINDOW_MIN      = 3000;

  // Chemin Brad
  const BRAD_PATH = [
    'cellier','wc','salle-de-bain','cuisine',
    'salle-a-manger','salon','couloir','etage',
  ];

  // Exposer les pièces au module manette
  window._gpRooms = [...BRAD_PATH, 'etage-2'];

  const DOOR_THRESHOLDS = { 'salle-de-bain': 2, 'cuisine': 3 };

  const CAM_IMAGES = {
    'cellier':        'assets/images/cameras/cellier.jpeg',
    'wc':             'assets/images/cameras/wc.jpeg',
    'salle-de-bain':  'assets/images/cameras/salle-de-bain-ferme.jpeg',
    'cuisine':        'assets/images/cameras/cuisine-ferme.jpeg',
    'salle-a-manger': 'assets/images/cameras/salle-a-manger.jpeg',
    'salon':          'assets/images/cameras/salon.jpeg',
    'couloir':        'assets/images/cameras/couloir.jpeg',
  };

  // Images Frank (boîte à musique)
  const FRANK_IMAGES = {
    safe:     'assets/images/cameras/frank/boite-ferme.png',
    warning:  'assets/images/cameras/frank/boite-frank.png',
    critical: 'assets/images/cameras/frank/boite-ouverte.png',
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


  // ══════════════════════════════════════
  // ÉTAT
  // ══════════════════════════════════════

  const state = {
    over: false, nightProgress: 0, currentHour: 0,
    selectedRoom: 'cellier', bradVisible: false,
    bradIndex: 0, bradPhase: 1, bradMaxIndex: 0,
    stairActive: false, stairTimer: null,
    modules: {
      audio:  { error: false, rebooting: false },
      camera: { error: false, rebooting: false },
    },
    callPlaying: false, callMuted: false,
    ambiancePaused: false, audioCooldown: false,
    helloToggle: false, rebootingAll: false,

    // Boîte à musique
    musicBox: {
      gauge: 1.0,        // 0..1
      draining: false,   // commence après la fin de l'appel
      frankOut: false,   // frank est sorti (ouverte sans frank)
      frankTimer: null,  // compte à rebours avant jumpscare frank
      lastDrainTick: 0,
      warnState: 'none', // 'none' | 'yellow' | 'red'
      critiquePlaying: false,
    },

    // Première visite étage-2
    etage2Visited: false,
  };


  // ══════════════════════════════════════
  // DOM
  // ══════════════════════════════════════

  const screenPlayGate         = document.getElementById('screen-play-gate');
  const btnPlayGate            = document.getElementById('btn-play-gate');
  const screenNightStart       = document.getElementById('screen-nightstart');
  const screenGame             = document.getElementById('screen-game');
  const screenJumpscare        = document.getElementById('screen-jumpscare');
  const screenJumpscareFrank   = document.getElementById('screen-jumpscare-frank');
  const screenDeath            = document.getElementById('screen-death');
  const screenNightEnd         = document.getElementById('screen-nightend');
  const camImg                 = document.getElementById('cam-img');
  const camBadgeName           = document.getElementById('cam-badge-name');
  const camView                = document.getElementById('cam-view');
  const stairAlert             = document.getElementById('stair-alert');
  const stairTimerFill         = document.getElementById('stair-timer-fill');
  const errorDisplay           = document.getElementById('error-display');
  const errorText              = document.getElementById('error-text');
  const hudHour                = document.getElementById('hud-hour');
  const mapRooms               = document.querySelectorAll('.map-room[data-room]');
  const btnAudio               = document.getElementById('btn-audio');
  const btnMaintenance         = document.getElementById('btn-maintenance');
  const btnMuteCall            = document.getElementById('btn-mute-call');
  const panelMaintenance       = document.getElementById('panel-maintenance');
  const btnMaintenanceClose    = document.getElementById('btn-maintenance-close');
  const maintLockMsg           = document.getElementById('maint-lock-msg');
  const maintItems             = document.querySelectorAll('.maint-item');
  const maintRebootAll         = document.getElementById('maint-reboot-all');
  const jumpscareVideo         = document.getElementById('jumpscare-video');
  const jumpscareFrankVideo    = document.getElementById('jumpscare-frank-video');
  const noiseCanvas            = document.getElementById('game-noise');
  const nctx                   = noiseCanvas.getContext('2d');
  const musicboxCanvas         = document.getElementById('musicbox-gauge');
  const btnRewind              = document.getElementById('btn-rewind-musicbox');
  const musicboxMapWarn        = document.getElementById('musicbox-map-warn');
  const roomEtage2             = document.getElementById('room-etage-2');


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
    call:          document.getElementById('snd-night2-call'),
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
    musicBox:      document.getElementById('snd-musicbox'),
    rewindBox:     document.getElementById('snd-rewind-box'),
    critiqueBox:   document.getElementById('snd-critique-box'),
  };

  function playSound(audio, vol = 0.8) {
    if (!audio) return;
    try {
      audio.currentTime = 0;
      // Appliquer le volume général sauvegardé
      const gv = window._vol_general !== undefined ? window._vol_general : 0.8;
      audio.volume = Math.min(1, Math.max(0, vol * gv));
      const p = audio.play(); if (p && p.catch) p.catch(() => {});
    } catch(e) {}
  }
  function stopSound(audio) {
    if (!audio) return;
    try { audio.pause(); audio.currentTime = 0; } catch(e) {}
  }
  function playHello() {
    state.helloToggle = !state.helloToggle;
    const a = state.helloToggle ? snd.hello1 : snd.hello2;
    if (!a) return;
    try { a.currentTime = 0; a.volume = 0.85; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch(e) {}
  }
  function playRebootSound() {
    try { const a = new Audio('assets/audio/effect/reboot.mp3'); a.volume = 0.6; a.play().catch(() => {}); } catch(e) { playSound(snd.reboot, 0.6); }
  }


  // ══════════════════════════════════════
  // PLAY GATE
  // ══════════════════════════════════════

  const gateCanvas = document.getElementById('gate-noise');
  if (gateCanvas) {
    const gc = gateCanvas.getContext('2d');
    (function gn() {
      if (!screenPlayGate || screenPlayGate.classList.contains('hidden')) return;
      gateCanvas.width = window.innerWidth; gateCanvas.height = window.innerHeight;
      const img = gc.createImageData(gateCanvas.width, gateCanvas.height);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() > 0.5 ? 255 : 0;
        img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = Math.random() * 22;
      }
      gc.putImageData(img, 0, 0); requestAnimationFrame(gn);
    })();
  }

  btnPlayGate.addEventListener('click', () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = ctx.createBuffer(1,1,22050); const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination); src.start(0);
    } catch(e) {}
    screenPlayGate.classList.add('hidden');
    screenNightStart.classList.remove('hidden');
    startNight();
  });


  // ══════════════════════════════════════
  // AMBIANCE — réduite pendant l'appel
  // ══════════════════════════════════════

  let ambianceTimeout = null;
  let currentAmbiance = null;

  function startAmbiance() {
    if (state.ambiancePaused || state.over) return;
    if (currentAmbiance && !currentAmbiance.paused) return; // garde-fou
    stopCurrentAmbiance();
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
    if (currentAmbiance && !currentAmbiance.paused) return;
    setTimeout(() => { if (!state.over && !state.ambiancePaused) startAmbiance(); }, 2000);
  }
  function stopAllAmbiance() { state.ambiancePaused = true; stopCurrentAmbiance(); }

  // Volume alarme réduit pendant l'appel
  function getAlarmVolume() { return state.callPlaying ? 0.3 : 0.7; }


  // ══════════════════════════════════════
  // BRUIT STATIQUE
  // ══════════════════════════════════════

  function resizeNoise() { noiseCanvas.width = window.innerWidth; noiseCanvas.height = window.innerHeight; }
  resizeNoise(); window.addEventListener('resize', resizeNoise);

  function drawNoise() {
    if (state.over) return;
    const w = noiseCanvas.width, h = noiseCanvas.height;
    const img = nctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = Math.random() * 18;
    }
    nctx.putImageData(img, 0, 0); requestAnimationFrame(drawNoise);
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
      o.appendChild(txt); camView.appendChild(o);
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
  function hideNoSignal() { const o = document.getElementById('cam-no-signal'); if (o) o.style.display = 'none'; camImg.style.display = 'block'; }
  function showBlackScreen() {
    camImg.style.display = 'none'; hideNoSignal();
    let b = document.getElementById('cam-black');
    if (!b) {
      b = document.createElement('div'); b.id = 'cam-black';
      b.style.cssText = "position:absolute;inset:0;z-index:6;background:#000;display:flex;align-items:center;justify-content:center;";
      const txt = document.createElement('div');
      txt.style.cssText = "font-family:'Share Tech Mono',monospace;font-size:11px;color:#333;letter-spacing:4px;animation:blink 1.2s step-start infinite;";
      txt.textContent = 'SIGNAL PERDU'; b.appendChild(txt); camView.appendChild(b);
    }
    b.style.display = 'flex';
  }
  function hideBlackScreen() { const b = document.getElementById('cam-black'); if (b) b.style.display = 'none'; camImg.style.display = 'block'; }


  // ══════════════════════════════════════
  // CAMÉRAS
  // ══════════════════════════════════════

  function getFrankImage() {
    const g = state.musicBox.gauge;
    if (state.musicBox.frankOut)  return FRANK_IMAGES.critical; // boite-ouverte
    if (g <= MUSICBOX_WARN_THRESH) return FRANK_IMAGES.warning; // boite-frank
    return FRANK_IMAGES.safe;                                    // boite-ferme
  }

  function selectRoom(roomId) {
    // Bloquer si maintenance ouvert
    if (!panelMaintenance.classList.contains('hidden')) return;

    // Accès étage → pas d'image
    if (roomId === 'etage') {
      state.selectedRoom = 'etage';
      mapRooms.forEach(r => r.classList.remove('active'));
      document.getElementById('room-etage').classList.add('active');
      camBadgeName.textContent = 'CAM — ACCÈS ÉTAGE';
      showNoSignal();
      muteAllCamSounds();
      if (BRAD_PATH[state.bradIndex] === 'etage' && state.bradVisible) playSound(snd.robot, 0.6);
      return;
    }

    // Erreur / reboot caméra
    if (state.modules.camera.error || state.modules.camera.rebooting) {
      state.selectedRoom = roomId;
      mapRooms.forEach(r => r.classList.remove('active'));
      const el = document.getElementById(`room-${roomId}`); if (el) el.classList.add('active');
      camBadgeName.textContent = `CAM — ${roomId.replace(/-/g,' ').toUpperCase()}`;
      const mbp = document.getElementById('musicbox-panel');
      if (mbp) mbp.style.display = 'none';
      // Étage-2 → "pas de signal" plutôt qu'écran noir
      if (roomId === 'etage-2') {
        hideBlackScreen(); showNoSignal(); muteAllCamSounds(); return;
      }
      hideNoSignal(); showBlackScreen(); muteAllCamSounds(); return;
    }

    hideNoSignal(); hideBlackScreen();
    muteAllCamSounds();

    state.selectedRoom = roomId;
    playSound(snd.clicCamera, 0.5);
    mapRooms.forEach(r => r.classList.remove('active'));
    const el = document.getElementById(`room-${roomId}`); if (el) el.classList.add('active');
    camBadgeName.textContent = `CAM — ${roomId.replace(/-/g,' ').toUpperCase()}`;

    // ── Étage 2 : boîte à musique ──
    if (roomId === 'etage-2') {
      camImg.src = getFrankImage();

      // Afficher le panneau boîte à musique
      const mbPanel = document.getElementById('musicbox-panel');
      if (mbPanel) mbPanel.style.display = 'flex';

      // Musique boîte à musique — audible seulement ici
      if (snd.musicBox && !state.over && state.musicBox.warnState === 'none') {
        snd.musicBox.volume = state.callPlaying ? 0.2 : 0.65;
        snd.musicBox.play().catch(() => {});
      }

      // Première visite — arrêter le clignotement jaune
      if (!state.etage2Visited) {
        state.etage2Visited = true;
        try { localStorage.setItem('fnaf_irl_etage2_visited', '1'); } catch(e) {}
        if (roomEtage2) roomEtage2.classList.remove('first-visit');
      }
      return;
    }

    // Masquer le panneau boîte sur les autres pièces
    const mbPanel = document.getElementById('musicbox-panel');
    if (mbPanel) mbPanel.style.display = 'none';

    // Autres pièces
    let baseSrc = CAM_IMAGES[roomId] || '';
    const thr = DOOR_THRESHOLDS[roomId];
    if (thr !== undefined && state.bradMaxIndex > thr) {
      if (roomId === 'salle-de-bain') baseSrc = 'assets/images/cameras/salle-de-bain-ouverte.jpeg';
      if (roomId === 'cuisine')       baseSrc = 'assets/images/cameras/cuisine-ouverte.jpeg';
    }

    const bradHere = BRAD_PATH[state.bradIndex] === roomId && state.bradVisible;
    if (bradHere) {
      let bradKey = roomId;
      if (roomId === 'cellier') bradKey = 'cellier-' + state.bradPhase;
      if (roomId === 'cuisine' && Math.random() < 0.05) { bradKey = 'cuisine-rare'; if(window.Achievements) Achievements.unlock('brad_dab'); }
      if (roomId === 'couloir') playSound(snd.robot, 0.6);
      camImg.src = BRAD_IMAGES[bradKey] || baseSrc;
    } else {
      camImg.src = baseSrc;
    }
  }

  // Couper musique boîte si on quitte étage-2
  function muteAllCamSounds() {
    if (snd.musicBox) { snd.musicBox.volume = 0; }
  }

  mapRooms.forEach(r => {
    r.addEventListener('click', () => {
      if (!panelMaintenance.classList.contains('hidden')) return;
      const id = r.dataset.room; if (id) selectRoom(id);
    });
  });


  // ══════════════════════════════════════
  // CARTE
  // ══════════════════════════════════════

  function refreshMap() {
    mapRooms.forEach(r => r.classList.remove('brad-here'));
    if (!state.bradVisible) return;
    if (state.bradIndex < BRAD_CAM_SHOW_INDEX) return;
    const el = document.getElementById(`room-${BRAD_PATH[state.bradIndex]}`);
    if (el) el.classList.add('brad-here');
  }


  // ══════════════════════════════════════
  // BOÎTE À MUSIQUE — drain + jauge
  // ══════════════════════════════════════

  let musicBoxBlinkInterval = null;

  function startMusicBoxDrain() {
    state.musicBox.draining = true;
    state.musicBox.lastDrainTick = Date.now();
    musicBoxLoop();
  }

  function musicBoxLoop() {
    if (state.over || !state.musicBox.draining) return;

    const now     = Date.now();
    const elapsed = now - state.musicBox.lastDrainTick;
    state.musicBox.lastDrainTick = now;

    // Drain progressif
    const drain = elapsed / MUSICBOX_DRAIN_MS;
    state.musicBox.gauge = Math.max(0, state.musicBox.gauge - drain);

    drawMusicBoxGauge();
    updateMusicBoxWarning();

    // frankOut est maintenant géré dans updateMusicBoxWarning()

    // Rafraîchir image étage-2 si on y est
    if (state.selectedRoom === 'etage-2' && !state.modules.camera.error && !state.modules.camera.rebooting) {
      camImg.src = getFrankImage();
    }

    setTimeout(musicBoxLoop, 100);
  }

  function drawMusicBoxGauge() {
    if (!musicboxCanvas) return;
    const ctx = musicboxCanvas.getContext('2d');
    const W = musicboxCanvas.width, H = musicboxCanvas.height;
    const cx = W/2, cy = H/2, r = W/2 - 5;
    const gauge = state.musicBox.gauge;

    ctx.clearRect(0, 0, W, H);

    // Fond
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 5; ctx.stroke();

    if (gauge > 0) {
      const endAngle = -Math.PI / 2 + Math.PI * 2 * gauge;
      let color;
      if (gauge > 0.5)                              color = '#2a8a2a';
      else if (gauge > MUSICBOX_WARN_THRESH)        color = '#c0a010';
      else                                          color = '#cc2020';

      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, endAngle);
      ctx.strokeStyle = color; ctx.lineWidth = 5;
      ctx.lineCap = 'round'; ctx.stroke();
    }
  }

  function updateMusicBoxWarning() {
    const g = state.musicBox.gauge;

    // Rouge à 10% (panneau seulement), Frank sort de sa boite à 0%
    if (state.musicBox.gauge <= 0 && !state.musicBox.frankOut && !state.musicBox.frankTimer) {
      state.musicBox.frankOut = true;
      if (state.selectedRoom === 'etage-2') camImg.src = FRANK_IMAGES.critical;
      const delay = MUSICBOX_FRANK_DELAY + Math.random() * 3000;
      state.musicBox.frankTimer = setTimeout(() => { triggerJumpscareFrank(); }, delay);
    }
    if (state.musicBox.frankOut) {
      if (state.musicBox.warnState !== 'red') {
        state.musicBox.warnState = 'red';
        setMusicBoxMapWarn('red');
        if (snd.musicBox) snd.musicBox.pause();
        if (!state.musicBox.critiquePlaying && snd.critiqueBox) {
          state.musicBox.critiquePlaying = true;
          snd.critiqueBox.volume = 0.85;
          snd.critiqueBox.play().catch(() => {});
        }
      }
    } else if (g <= MUSICBOX_CRIT_THRESH && g > 0) {
      // Rouge à 10% — panneau seulement, Frank pas encore sorti
      if (state.musicBox.warnState !== 'red') {
        state.musicBox.warnState = 'red';
        setMusicBoxMapWarn('red');
        if (snd.musicBox) snd.musicBox.pause();
        if (!state.musicBox.critiquePlaying && snd.critiqueBox) {
          state.musicBox.critiquePlaying = true;
          snd.critiqueBox.volume = 0.85;
          snd.critiqueBox.play().catch(() => {});
        }
      }
    } else if (g <= MUSICBOX_WARN_THRESH && g > MUSICBOX_CRIT_THRESH) {
      if (state.musicBox.warnState !== 'yellow') {
        state.musicBox.warnState = 'yellow';
        setMusicBoxMapWarn('yellow');
        // Couper musicbox, lancer critique
        if (snd.musicBox) { snd.musicBox.pause(); }
        if (!state.musicBox.critiquePlaying && snd.critiqueBox) {
          state.musicBox.critiquePlaying = true;
          snd.critiqueBox.volume = 0.65;
          snd.critiqueBox.play().catch(() => {});
        }
      }
    } else if (g > MUSICBOX_WARN_THRESH) {
      if (state.musicBox.warnState !== 'none') {
        state.musicBox.warnState = 'none';
        setMusicBoxMapWarn('none');
        stopSound(snd.critiqueBox);
        state.musicBox.critiquePlaying = false;
        // Reprendre musicbox si joueur est sur étage-2
        if (state.selectedRoom === 'etage-2' && snd.musicBox && !state.over) {
          snd.musicBox.volume = 0.65;
          snd.musicBox.play().catch(() => {});
        }
      }
    }
  }

  function setMusicBoxMapWarn(type) {
    if (!musicboxMapWarn) return;
    musicboxMapWarn.className = 'musicbox-map-warn';
    clearInterval(musicBoxBlinkInterval);

    if (type === 'none') {
      musicboxMapWarn.classList.add('hidden');
      musicboxMapWarn.style.opacity = '1';
      return;
    }

    musicboxMapWarn.classList.remove('hidden');
    musicboxMapWarn.classList.add(type === 'red' ? 'warn-red' : 'warn-yellow');

    const speed = type === 'red' ? 300 : 600;
    let vis = true;
    musicBoxBlinkInterval = setInterval(() => {
      vis = !vis;
      musicboxMapWarn.style.opacity = vis ? '1' : '0';
    }, speed);
  }


  // ══════════════════════════════════════
  // REMBOBINAGE (hold button)
  // ══════════════════════════════════════

  let rewindActive   = false;
  let rewindInterval = null;
  let rewindSoundCD  = false;

  function startRewind() {
    if (rewindActive || state.over) return;
    if (window.Achievements) Achievements.unlock('rewind_first');
    // Ne pas rembobiner si Frank est déjà sorti (trop tard)
    if (state.musicBox.frankOut) return;
    rewindActive = true;
    btnRewind.classList.add('holding');
    rewindInterval = setInterval(() => {
      state.musicBox.gauge = Math.min(1, state.musicBox.gauge + REWIND_RATE);
      // Son de remontage (court, répété)
      if (!rewindSoundCD && snd.rewindBox) {
        rewindSoundCD = true;
        snd.rewindBox.currentTime = 0;
        snd.rewindBox.volume = 0.7;
        snd.rewindBox.play().catch(() => {});
        setTimeout(() => { rewindSoundCD = false; }, REWIND_SOUND_COOLDOWN);
      }
      drawMusicBoxGauge();
      updateMusicBoxWarning();
    }, 100);
  }

  function stopRewind() {
    rewindActive = false;
    btnRewind.classList.remove('holding');
    if (rewindInterval) { clearInterval(rewindInterval); rewindInterval = null; }
  }

  btnRewind.addEventListener('mousedown',   startRewind);
  btnRewind.addEventListener('touchstart',  (e) => { e.preventDefault(); startRewind(); }, { passive: false });
  btnRewind.addEventListener('mouseup',     stopRewind);
  btnRewind.addEventListener('mouseleave',  stopRewind);
  btnRewind.addEventListener('touchend',    stopRewind);
  btnRewind.addEventListener('touchcancel', stopRewind);


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
  // ACCÈS ÉTAGE (Brad)
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
      if (rem <= 0) triggerJumpscareBrad();
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
    // Pas d'audio depuis la chambre d'ami
    if (state.selectedRoom === 'etage-2') return;
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
      if (targetIdx !== -1 && targetIdx === bradIdx - 1) {
        // Recul uniquement si audio joué dans la pièce JUSTE avant Brad
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
    state.audioCooldown = true; btnAudio.disabled = true; btnAudio.textContent = 'Audio en cours...';
    setTimeout(() => { state.audioCooldown = false; btnAudio.disabled = false; btnAudio.textContent = 'Play audio'; }, 5000);
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
    if (anyRebooting) { maintLockMsg.classList.remove('hidden'); setTimeout(() => maintLockMsg.classList.add('hidden'), 2000); return; }
    playSound(snd.tabletteClose, 0.6);
    panelMaintenance.classList.add('hidden');
  });
  maintItems.forEach(item => {
    item.addEventListener('click', () => {
      const mod = item.dataset.module;
      if (!mod || !state.modules[mod] || state.modules[mod].rebooting || !state.modules[mod].error) return;
      rebootModule(mod, 6000 + Math.random() * 4000);
    });
  });
  maintRebootAll.addEventListener('click', () => {
    if (state.rebootingAll) return;
    state.rebootingAll = true;
    if (window.Achievements) Achievements.unlock('reboot_all');
    ['audio','camera'].forEach(m => { if (state.modules[m] && !state.modules[m].rebooting) { state.modules[m].rebooting = true; state.modules[m].error = false; } });
    playRebootSound();
    updateModuleIndicators(); updateMaintenanceBtnState();
    selectRoom(state.selectedRoom);
    setTimeout(() => {
      ['audio','camera'].forEach(m => { if (state.modules[m]) state.modules[m].rebooting = false; });
      state.rebootingAll = false;
      updateErrorDisplay(); updateModuleIndicators(); updateMaintenanceBtnState(); selectRoom(state.selectedRoom);
    }, REBOOT_ALL_DURATION);
  });

  function rebootModule(mod, duration) {
    if (window.Achievements) Achievements.unlock('reboot_module');
    const m = state.modules[mod]; if (!m) return;
    m.rebooting = true; m.error = false;
    playRebootSound(); updateModuleIndicators(); updateMaintenanceBtnState();
    if (mod === 'camera') selectRoom(state.selectedRoom);
    setTimeout(() => {
      m.rebooting = false; updateErrorDisplay(); updateModuleIndicators(); updateMaintenanceBtnState();
      if (mod === 'camera') selectRoom(state.selectedRoom);
    }, duration || 8000);
  }

  function updateMaintenanceBtnState() {
    if (hasAnyError()) { btnMaintenance.classList.add('has-error'); btnMaintenance.textContent = 'Maintenance — erreur'; }
    else { btnMaintenance.classList.remove('has-error'); btnMaintenance.textContent = 'Maintenance'; }
  }

  const blinkIntervals = {};
  function startBlink(el, color, speed) {
    stopBlink(el); let vis = true; el.style.color = color;
    blinkIntervals[el.id] = setInterval(() => { vis = !vis; el.style.opacity = vis ? '1' : '0'; }, speed);
  }
  function stopBlink(el) {
    if (blinkIntervals[el.id]) { clearInterval(blinkIntervals[el.id]); delete blinkIntervals[el.id]; }
    el.style.opacity = '1';
  }

  function updateModuleIndicators() {
    ['audio','camera'].forEach(mod => {
      const m = state.modules[mod];
      const status = document.getElementById('maint-' + mod + '-status');
      if (!status || !m) return;
      status.removeAttribute('style'); stopBlink(status);
      if (m.error)       { status.textContent = 'erreur';        status.style.cssText = 'font-weight:bold;font-size:10px;letter-spacing:2px;'; startBlink(status, '#cc2020', 350); }
      else if (m.rebooting) { status.textContent = 'redémarrage...'; status.style.cssText = 'font-size:10px;letter-spacing:2px;'; startBlink(status, '#c0a010', 600); }
      else                { status.textContent = 'OK';           status.style.cssText = 'color:#2a8a2a;font-size:10px;letter-spacing:2px;opacity:1;'; }
    });
  }

  function scheduleNextError() {
    if (state.over) return;
    const interval = Math.max(ERROR_INTERVAL_MIN, ERROR_INTERVAL_BASE - (ERROR_INTERVAL_BASE - ERROR_INTERVAL_MIN) * state.nightProgress);
    setTimeout(() => {
      if (state.over || state.callPlaying) { scheduleNextError(); return; }
      const targets = ['audio','camera'].filter(m => !state.modules[m].error && !state.modules[m].rebooting);
      if (targets.length > 0) {
        const mod = targets[Math.floor(Math.random() * targets.length)];
        state.modules[mod].error = true; state.hadError = true;
        updateErrorDisplay(); updateModuleIndicators(); updateMaintenanceBtnState(); startAlarm();
      }
      scheduleNextError();
    }, interval * (0.7 + Math.random() * 0.6));
  }

  let alarmInterval = null;
  function startAlarm() {
    if (alarmInterval) return;
    playSound(snd.alarm, getAlarmVolume());
    alarmInterval = setInterval(() => {
      if (hasAnyError()) playSound(snd.alarm, getAlarmVolume());
      else { clearInterval(alarmInterval); alarmInterval = null; }
    }, 2500);
  }
  function hasAnyError() { return Object.values(state.modules).some(m => m.error); }
  function updateErrorDisplay() {
    const errors = Object.entries(state.modules).filter(([, m]) => m.error).map(([k]) => 'erreur ' + k);
    if (errors.length > 0) { errorDisplay.classList.remove('hidden'); errorText.textContent = errors.join(' — '); }
    else errorDisplay.classList.add('hidden');
  }


  // ══════════════════════════════════════
  // APPEL PHONE GUY (night2-call)
  // ══════════════════════════════════════

  function startPhoneCall() {
    if (state.over) return;
    state.callPlaying = true;
    pauseAmbiance();
    snd.call.volume = Math.min(1, 0.75 * (window._vol_voices !== undefined ? window._vol_voices : 0.8));
    snd.call.play().catch(() => {});
    // Baisser musicbox pendant l'appel
    if (snd.musicBox) snd.musicBox.volume = 0.2;
    setTimeout(() => { if (state.callPlaying) btnMuteCall.classList.remove('hidden'); }, 5000);
    snd.call.onended = () => {
      if (state.callMuted) return;
      state.callPlaying = false;
      btnMuteCall.classList.add('hidden');
      resumeAmbiance();
      // Remonter le volume musicbox si on est sur étage-2
      if (snd.musicBox && state.selectedRoom === 'etage-2') snd.musicBox.volume = 0.65;
      // Démarrer le drain APRÈS la fin de l'appel
      startMusicBoxDrain();
    };
  }

  btnMuteCall.addEventListener('click', () => {
    if (state.callMuted) return;
    state.callMuted = true; stopSound(snd.call);
    btnMuteCall.classList.add('hidden'); state.callPlaying = false;
    resumeAmbiance();
    // Si appel coupé manuellement, drain démarre quand même
    startMusicBoxDrain();
  });

  function playRingTimes(times, onDone) {
    if (times <= 0 || state.over) { if (onDone) onDone(); return; }
    playSound(snd.ring, 0.7);
    const dur = (snd.ring && snd.ring.duration > 0) ? snd.ring.duration * 1000 : 2000;
    setTimeout(() => playRingTimes(times - 1, onDone), dur + RING_PAUSE_MS);
  }


  // ══════════════════════════════════════
  // JUMPSCARES
  // ══════════════════════════════════════

  function triggerJumpscareBrad() {
    if (state.over) return;
    state.over = true;
    if (window.Achievements) { Achievements.unlock('js_brad'); const d=Achievements.loadAll(); if(d.js_frank&&d.js_mama) Achievements.unlock('js_all'); }
    cleanup();
    screenGame.classList.add('hidden');
    screenJumpscare.classList.remove('hidden');
    jumpscareVideo.muted = false; jumpscareVideo.volume = 1;
    jumpscareVideo.play().catch(() => {});
    const d = document.getElementById('death-sub'); if (d) d.textContent = 'Brad Bitt vous a trouvé.';
    setTimeout(() => { screenJumpscare.classList.add('hidden'); showDeathScreen(); }, JUMPSCARE_DURATION);
  }

  function triggerJumpscareFrank() {
    if (state.over) return;
    state.over = true;
    if (window.Achievements) { Achievements.unlock('js_frank'); const d=Achievements.loadAll(); if(d.js_brad&&d.js_mama) Achievements.unlock('js_all'); }
    cleanup();
    screenGame.classList.add('hidden');
    screenJumpscareFrank.classList.remove('hidden');
    jumpscareFrankVideo.muted = false; jumpscareFrankVideo.volume = 1;
    jumpscareFrankVideo.play().catch(() => {});
    const d = document.getElementById('death-sub'); if (d) d.textContent = 'Frank Lebœuf vous a trouvé.';
    setTimeout(() => { screenJumpscareFrank.classList.add('hidden'); showDeathScreen(); }, JUMPSCARE_DURATION);
  }

  function cleanup() {
    stopAllAmbiance();
    clearTimeout(bradMoveTimeout);
    clearInterval(musicBoxBlinkInterval);
    clearInterval(rewindInterval);
    if (state.musicBox.frankTimer) clearTimeout(state.musicBox.frankTimer);
    stopSound(snd.musicBox);
    stopSound(snd.critiqueBox);
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
          img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = Math.random() * 20;
        }
        dctx.putImageData(img, 0, 0); requestAnimationFrame(dn);
      })();
    }
    const btn = document.getElementById('death-btn-menu');
    if (btn) {
      btn.style.display = 'none';
      setTimeout(() => {
        btn.style.display = 'block'; btn.classList.add('visible');
        // Manette : n'importe quel bouton principal pour retourner au menu
        const _gpDI = setInterval(() => {
          const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
          if (!gps.length) return;
          const gp = gps[0];
          if (gp.buttons[0]?.pressed || gp.buttons[1]?.pressed || gp.buttons[2]?.pressed) {
            clearInterval(_gpDI); btn.click();
          }
        }, 100);
      }, DEATH_SCREEN_MIN);
      btn.addEventListener('click', () => { window.location.href = 'index.html'; });
    }
  }


  // ══════════════════════════════════════
  // HORLOGE
  // ══════════════════════════════════════

  // ── DEV SHORTCUT : clic sur l'heure pour finir la nuit ──
  const devHour2  = document.getElementById('hud-hour');
  const devNight2 = document.getElementById('hud-night');
  function devFinish2() { if (!state.over) triggerNightEnd(); }
  if (devHour2)  devHour2.addEventListener('click',  devFinish2);
  if (devNight2) devNight2.addEventListener('click', devFinish2);

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
    cleanup();
    if (window.Achievements) {
      Achievements.unlock('night2');
      if (!state.usedAudio) Achievements.unlock('no_audio');
      if (!state.hadError)  Achievements.unlock('no_error');
      if (!state.callMuted) Achievements.unlock('no_mute');
    }
    screenGame.classList.add('hidden');
    showNightEndScreen();
  }

  function showNightEndScreen() {
    const screen = document.getElementById('screen-nightend');
    screen.classList.remove('hidden');

    // Animation 5→6 AM : seulement le chiffre, AM fixe
    const timeEl = document.getElementById('ns-end-time');
    if (timeEl) {
      timeEl.innerHTML = '<span id="end-number" style="display:inline-block;">5</span> AM';
      const numEl = document.getElementById('end-number');
      setTimeout(() => {
        numEl.style.cssText = 'display:inline-block;animation:slideDown 1.4s ease forwards;';
        setTimeout(() => {
          numEl.textContent = '6';
          numEl.style.cssText = 'display:inline-block;opacity:0;transform:translateY(-40px);animation:slideUp 1.4s ease forwards;';
        }, 1600);
      }, 600);
    }

    if (snd.nightEnd) { snd.nightEnd.currentTime = 0; snd.nightEnd.volume = 0.8; snd.nightEnd.play().catch(() => {}); }
    const audioDur = (snd.nightEnd && snd.nightEnd.duration > 0) ? snd.nightEnd.duration * 1000 : 4000;
    Save.completeNight(NIGHT_NUMBER);
    setTimeout(() => { window.location.href = 'index.html'; }, audioDur + 3000);
  }


  // ══════════════════════════════════════
  // DÉMARRAGE
  // ══════════════════════════════════════

  function startNight() {
    state.startTime = Date.now(); state.usedAudio = false; state.hadError = false;
    // Vérifier si étage-2 a déjà été visité (sauvegarder entre sessions)
    try {
      if (localStorage.getItem('fnaf_irl_etage2_visited') === '1') {
        state.etage2Visited = true;
      }
    } catch(e) {}

    // Clignotement jaune étage-2 si jamais visité
    if (!state.etage2Visited && roomEtage2) {
      roomEtage2.classList.add('first-visit');
    }

    playSound(snd.nightStart, 0.8);

    setTimeout(() => {
      stopSound(snd.nightStart);
      screenNightStart.classList.add('hidden');
      screenGame.classList.remove('hidden');
      drawNoise();
      drawMusicBoxGauge();
      selectRoom('cellier');
      refreshMap();
      updateModuleIndicators();
      startGameClock();
      scheduleBradMove();
      scheduleNextError();

      // 3 sonneries → appel night2
      setTimeout(() => {
        playRingTimes(2, () => {
          startPhoneCall();
          // Fallback ambiance si appel très court
          setTimeout(() => {
            if (!state.callPlaying && !state.over && !state.musicBox.draining) {
              startMusicBoxDrain();
              startAmbiance();
            }
          }, 40000);
        });
      }, 1000);

    }, 3000);
  }

  startNight();

})();
