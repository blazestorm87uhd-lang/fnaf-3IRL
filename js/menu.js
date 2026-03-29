/* ═══════════════════════════════════════════
   MENU — v3
   - Continue grisé si aucune donnée
   - New Game conserve nightmare/bonus
   - New Game reset personnages à Brad
   - Bonus caché après nuit 3
   - Rotation personnages (15s)
   - Indicateur de chargement
════════════════════════════════════════════ */

function initMenu() {

  const noiseCanvas     = document.getElementById('noise');
  const btnNewGame      = document.getElementById('btn-newgame');
  const btnContinue     = document.getElementById('btn-continue');
  const btnNightmare    = document.getElementById('btn-nightmare');
  const btnBonus        = document.getElementById('btn-bonus');
  const continueNote    = document.getElementById('continue-note');
  const modalNightmare  = document.getElementById('modal-nightmare');
  const modalConfirm    = document.getElementById('modal-confirm');
  const modalCancel     = document.getElementById('modal-cancel');
  const audioMenu       = document.getElementById('audio-menu');
  const audioNightmare  = document.getElementById('audio-nightmare');

  // ── Bruit statique ──
  const nctx = noiseCanvas.getContext('2d');
  function resizeNoise() { noiseCanvas.width = window.innerWidth; noiseCanvas.height = window.innerHeight; }
  resizeNoise(); window.addEventListener('resize', resizeNoise);
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

  // ── Personnages ──
  const chars = {
    brad:  { normal: document.getElementById('brad-normal'),  broken: document.getElementById('brad-broken')  },
    frank: { normal: document.getElementById('frank-normal'), broken: document.getElementById('frank-broken') },
    mama:  { normal: document.getElementById('mama-normal'),  broken: document.getElementById('mama-broken')  },
  };

  const saveData = Save.load();
  const nightCompleted = saveData.nightCompleted || 0;

  // Personnages disponibles selon progression
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

  // ── Sauvegarde & boutons ──
  const hasAnyData = saveData.nightCompleted > 0 || saveData.currentNight !== null;
  const nextNight  = saveData.currentNight !== null ? saveData.currentNight : saveData.nightReached;

  // Continue — grisé si aucune donnée
  if (hasAnyData && nextNight && nextNight >= 1) {
    btnContinue.classList.remove('disabled');
    continueNote.textContent = `reprendre — nuit ${nextNight}`;
    continueNote.style.color = '#555';
  } else {
    btnContinue.classList.add('disabled');
    continueNote.textContent = 'aucune donnée de jeu';
    continueNote.style.color = '#2a2a2a';
  }

  // Nightmare
  if (saveData.nightmareUnlocked) btnNightmare.style.display = 'flex';

  // Bonus — masqué si nightmare est débloqué (nuit 3 terminée)
  if (saveData.bonusUnlocked && !saveData.nightmareUnlocked) {
    btnBonus.style.display = 'flex';
  }

  // ── Panel "aucune donnée" pour Continue ──
  const noDataModal = document.getElementById('modal-no-data');

  btnContinue.addEventListener('click', () => {
    if (btnContinue.classList.contains('disabled')) {
      // Afficher panneau si existe, sinon créer à la volée
      if (noDataModal) {
        noDataModal.classList.remove('hidden');
      } else {
        showNoDataPanel();
      }
      return;
    }
    const d = Save.load();
    const night = d.currentNight !== null ? d.currentNight : d.nightReached;
    if (night) { Save.startNight(night); launchGame(night); }
  });

  function showNoDataPanel() {
    let panel = document.getElementById('no-data-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'no-data-panel';
      panel.style.cssText = `
        position:fixed;inset:0;z-index:600;
        background:rgba(0,0,0,0.85);
        display:flex;align-items:center;justify-content:center;
      `;
      const box = document.createElement('div');
      box.style.cssText = `
        background:#0d0d0d;border:0.5px solid rgba(255,255,255,0.15);
        padding:36px 44px;max-width:380px;text-align:center;
        display:flex;flex-direction:column;gap:18px;
      `;
      box.innerHTML = `
        <div style="font-family:'Cinzel',serif;font-size:16px;color:#888;letter-spacing:4px;">AUCUNE DONNÉE</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#555;letter-spacing:2px;line-height:1.8;">
          Aucune donnée de jeu détectée.<br>Lance une nouvelle partie pour commencer.
        </div>
        <button id="no-data-close" style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:4px;color:#888;background:transparent;border:0.5px solid rgba(255,255,255,0.15);padding:10px 24px;cursor:pointer;margin-top:8px;">Fermer</button>
      `;
      panel.appendChild(box);
      document.body.appendChild(panel);
      document.getElementById('no-data-close').addEventListener('click', () => { panel.style.display = 'none'; });
      panel.addEventListener('click', e => { if (e.target === panel) panel.style.display = 'none'; });
    }
    panel.style.display = 'flex';
  }

  // ── New Game — conserve nightmare/bonus, reset progression ──
  btnNewGame.addEventListener('click', () => {
    const d = Save.load();
    // Conserver les déblocages acquis
    const keepNightmare = d.nightmareUnlocked;
    const keepBonus     = d.bonusUnlocked;
    // Reset progression (nuits)
    Save.save({
      nightReached:      1,
      nightCompleted:    0,
      nightmareUnlocked: keepNightmare,
      bonusUnlocked:     keepBonus,
      currentNight:      1,
    });
    launchGame(1);
  });

  // ── Nightmare ──
  btnNightmare.addEventListener('click', openNightmareModal);
  btnBonus.addEventListener('click',     () => { console.log('Bonus — à implémenter'); });

  function openNightmareModal()  { modalNightmare.classList.remove('hidden'); }
  function closeNightmareModal() { modalNightmare.classList.add('hidden'); }
  if (modalCancel)  modalCancel.addEventListener('click', closeNightmareModal);
  if (modalConfirm) modalConfirm.addEventListener('click', () => {
    closeNightmareModal();
    fadeAudio(audioMenu, 0, 600, () => { audioMenu.pause(); audioMenu.currentTime = 0; });
    if (audioNightmare) { audioNightmare.volume = 0; audioNightmare.play().catch(() => {}); fadeAudio(audioNightmare, 0.65, 800); }
    Save.startNight('nightmare'); launchGame('nightmare');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNightmareModal(); });

  // ── Options ──
  const btnOptions = document.getElementById('btn-options');
  if (btnOptions) btnOptions.addEventListener('click', openOptionsModal);

  // ── Lancement ──
  function launchGame(night) {
    showLoadingIndicator();
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity    = '0';
    setTimeout(() => {
      if      (night === 1)           window.location.href = 'game.html';
      else if (night === 2)           window.location.href = 'game2.html';
      else if (night === 3)           window.location.href = 'game3.html';
      else if (night === 'nightmare') window.location.href = 'game.html?night=nightmare';
      else                            window.location.href = 'game.html';
    }, 500);
  }

  function fadeAudio(audio, targetVol, duration, callback) {
    if (!audio) return;
    const steps = 30, interval = duration / steps;
    const startVol = audio.volume, delta = (targetVol - startVol) / steps;
    let step = 0;
    const t = setInterval(() => {
      step++; audio.volume = Math.max(0, Math.min(1, startVol + delta * step));
      if (step >= steps) { clearInterval(t); if (callback) callback(); }
    }, interval);
  }
}

// ══════════════════════════════════════
// INDICATEUR DE CHARGEMENT
// ══════════════════════════════════════

function showLoadingIndicator() {
  let el = document.getElementById('loading-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-indicator';
    el.style.cssText = `
      position:fixed;bottom:16px;right:20px;z-index:9999;
      font-family:'Share Tech Mono',monospace;
      font-size:11px;color:#555;letter-spacing:3px;
      display:flex;align-items:center;gap:6px;
    `;
    const label = document.createElement('span');
    label.textContent = 'CHARGEMENT';
    const dots = document.createElement('span');
    dots.id = 'loading-dots';
    dots.textContent = '';
    el.appendChild(label); el.appendChild(dots);
    document.body.appendChild(el);
    let d = 0;
    setInterval(() => {
      d = (d + 1) % 4;
      dots.textContent = '.'.repeat(d);
    }, 400);
  }
  el.style.display = 'flex';
}

// ══════════════════════════════════════
// MODAL OPTIONS
// ══════════════════════════════════════

function openOptionsModal() {
  let modal = document.getElementById('modal-options');
  if (!modal) { modal = buildOptionsModal(); document.body.appendChild(modal); }
  modal.classList.remove('hidden');
  loadOptionsFromStorage();
}

function buildOptionsModal() {
  const modal = document.createElement('div');
  modal.id = 'modal-options';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="options-box" id="options-box">
      <div class="options-header">
        <div class="options-title">OPTIONS</div>
        <button class="options-close" id="options-close">✕</button>
      </div>

      <div class="options-tabs">
        <button class="opt-tab active" data-tab="affichage">🖥 Affichage</button>
        <button class="opt-tab" data-tab="controles">🎮 Contrôles</button>
        <button class="opt-tab" data-tab="audio">🔊 Audio</button>
        <button class="opt-tab" data-tab="accessibilite">♿ Accessibilité</button>
      </div>

      <!-- AFFICHAGE -->
      <div class="opt-panel active" id="tab-affichage">
        <div class="opt-section-label">Mode d'affichage</div>
        <div class="opt-modes">
          <button class="opt-mode" data-mode="tv">
            <span class="opt-mode-icon">📺</span>
            <span>Mode TV</span>
            <span class="opt-mode-desc">Texte agrandi, usage à distance</span>
          </button>
          <button class="opt-mode active" data-mode="pc">
            <span class="opt-mode-icon">🖥</span>
            <span>Mode PC</span>
            <span class="opt-mode-desc">Affichage standard</span>
          </button>
          <button class="opt-mode" data-mode="phone">
            <span class="opt-mode-icon">📱</span>
            <span>Téléphone</span>
            <span class="opt-mode-desc">Interface tactile élargie</span>
          </button>
        </div>
      </div>

      <!-- CONTRÔLES -->
      <div class="opt-panel" id="tab-controles">
        <div class="opt-section-label">Type de contrôle</div>
        <div class="opt-ctrl-types">
          <button class="opt-ctrl active" data-ctrl="mouse">⌨ Clavier / Souris</button>
          <button class="opt-ctrl" data-ctrl="gamepad">🎮 Manette</button>
          <button class="opt-ctrl" data-ctrl="touch">👆 Tactile</button>
        </div>

        <!-- Sous-menu manette -->
        <div class="opt-gamepad-sub hidden" id="gamepad-sub">
          <div class="opt-section-label" style="margin-top:14px;">Type de manette</div>
          <div class="opt-ctrl-types">
            <button class="opt-gp active" data-gp="switch">🟥🔵 Nintendo Switch</button>
            <button class="opt-gp" data-gp="xbox">🟢 Xbox</button>
            <button class="opt-gp" data-gp="ps">🟦 PlayStation</button>
          </div>
          <div class="opt-bindings" id="opt-bindings"></div>
          <div class="opt-no-gamepad hidden" id="opt-no-gamepad">
            ⚠ Aucune manette détectée. Branchez votre manette et rechargez la page.
          </div>
        </div>

        <!-- Infos tactile -->
        <div class="opt-touch-info hidden" id="touch-info">
          <div class="opt-hint">En mode tactile, des boutons apparaissent directement à l'écran.<br>Maintenir un bouton pour les actions continues (ex. boîte à musique).</div>
        </div>
      </div>

      <!-- AUDIO -->
      <div class="opt-panel" id="tab-audio">
        <div class="opt-hint">💡 Certains indices sonores sont discrets. Un volume suffisant est recommandé pour profiter pleinement du jeu.</div>
        <div class="opt-slider-row">
          <label>Volume général</label>
          <input type="range" id="vol-general" min="0" max="100" value="80" />
          <span id="vol-general-val">80</span>
        </div>
        <div class="opt-slider-row">
          <label>Effets sonores</label>
          <input type="range" id="vol-effects" min="0" max="100" value="80" />
          <span id="vol-effects-val">80</span>
        </div>
        <div class="opt-slider-row">
          <label>Voix / appels</label>
          <input type="range" id="vol-voices" min="0" max="100" value="80" />
          <span id="vol-voices-val">80</span>
        </div>
      </div>

      <!-- ACCESSIBILITÉ -->
      <div class="opt-panel" id="tab-accessibilite">
        <div class="opt-section-label">Indices visuels</div>
        <div class="opt-toggle-row">
          <label>Flash visuel en cas de danger</label>
          <label class="opt-toggle-switch">
            <input type="checkbox" id="acc-flash" />
            <span class="opt-toggle-track"></span>
          </label>
        </div>
        <div class="opt-toggle-row">
          <label>Signal lumineux sur sons importants</label>
          <label class="opt-toggle-switch">
            <input type="checkbox" id="acc-signal" />
            <span class="opt-toggle-track"></span>
          </label>
        </div>
        <div class="opt-section-label" style="margin-top:14px;">Gameplay</div>
        <div class="opt-slider-row">
          <label>Vitesse navigation caméras</label>
          <input type="range" id="cam-speed" min="1" max="3" step="1" value="2" />
          <span id="cam-speed-val">Normal</span>
        </div>
      </div>

    </div>
  `;

  // Fermer
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
  modal.querySelector('#options-close').addEventListener('click', () => modal.classList.add('hidden'));

  // Onglets
  modal.querySelectorAll('.opt-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modal.querySelectorAll('.opt-tab').forEach(t => t.classList.remove('active'));
      modal.querySelectorAll('.opt-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      modal.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Mode affichage
  modal.querySelectorAll('.opt-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.opt-mode').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyDisplayMode(btn.dataset.mode);
      saveOption('displayMode', btn.dataset.mode);
    });
  });

  // Type contrôle
  modal.querySelectorAll('.opt-ctrl').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.opt-ctrl').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sub = modal.querySelector('#gamepad-sub');
      const touch = modal.querySelector('#touch-info');
      sub.classList.add('hidden'); touch.classList.add('hidden');
      if (btn.dataset.ctrl === 'gamepad') {
        sub.classList.remove('hidden');
        checkGamepad();
      } else if (btn.dataset.ctrl === 'touch') {
        touch.classList.remove('hidden');
      }
      saveOption('controlType', btn.dataset.ctrl);
    });
  });

  // Type manette
  const BINDINGS = {
    switch: [
      { action: 'Naviguer caméras', key: 'Joystick / Flèches' },
      { action: 'Valider / Ouvrir', key: 'A' },
      { action: 'Boîte à musique', key: 'B (sur caméra dédiée)' },
      { action: 'Maintenance',     key: 'X' },
    ],
    xbox: [
      { action: 'Naviguer caméras', key: 'Joystick / Flèches' },
      { action: 'Valider / Ouvrir', key: 'A' },
      { action: 'Boîte à musique', key: 'B (sur caméra dédiée)' },
      { action: 'Maintenance',     key: 'Y' },
    ],
    ps: [
      { action: 'Naviguer caméras', key: 'Joystick / Flèches' },
      { action: 'Valider / Ouvrir', key: '✕' },
      { action: 'Boîte à musique', key: '○ (sur caméra dédiée)' },
      { action: 'Maintenance',     key: '△' },
    ],
  };

  modal.querySelectorAll('.opt-gp').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.opt-gp').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderBindings(btn.dataset.gp);
      saveOption('gamepadType', btn.dataset.gp);
    });
  });

  function renderBindings(type) {
    const container = modal.querySelector('#opt-bindings');
    const binds = BINDINGS[type] || [];
    container.innerHTML = binds.map(b => `
      <div class="opt-binding-row">
        <span class="opt-binding-action">${b.action}</span>
        <span class="opt-binding-key">${b.key}</span>
      </div>
    `).join('');
  }
  renderBindings('switch');

  function checkGamepad() {
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const warn = modal.querySelector('#opt-no-gamepad');
    if (gps.length === 0) warn.classList.remove('hidden');
    else warn.classList.add('hidden');
  }

  // Sliders audio
  [
    ['vol-general', 'vol-general-val'],
    ['vol-effects', 'vol-effects-val'],
    ['vol-voices',  'vol-voices-val'],
  ].forEach(([id, valId]) => {
    const slider = modal.querySelector('#' + id);
    const label  = modal.querySelector('#' + valId);
    slider.addEventListener('input', () => {
      label.textContent = slider.value;
      saveOption(id, slider.value);
      applyVolumes();
    });
  });

  // Slider vitesse caméras
  const camSpeed = modal.querySelector('#cam-speed');
  const camSpeedVal = modal.querySelector('#cam-speed-val');
  camSpeed.addEventListener('input', () => {
    const labels = { 1: 'Lent', 2: 'Normal', 3: 'Rapide' };
    camSpeedVal.textContent = labels[camSpeed.value] || 'Normal';
    saveOption('camSpeed', camSpeed.value);
  });

  // Toggles accessibilité
  ['acc-flash', 'acc-signal'].forEach(id => {
    modal.querySelector('#' + id).addEventListener('change', e => {
      saveOption(id, e.target.checked ? '1' : '0');
    });
  });

  return modal;
}

function saveOption(key, value) {
  try { localStorage.setItem('fnaf_opt_' + key, value); } catch(e) {}
}
function loadOption(key, def) {
  try { return localStorage.getItem('fnaf_opt_' + key) || def; } catch(e) { return def; }
}

function loadOptionsFromStorage() {
  const modal = document.getElementById('modal-options');
  if (!modal) return;

  // Affichage
  const mode = loadOption('displayMode', 'pc');
  modal.querySelectorAll('.opt-mode').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  applyDisplayMode(mode);

  // Contrôles
  const ctrl = loadOption('controlType', 'mouse');
  modal.querySelectorAll('.opt-ctrl').forEach(b => {
    b.classList.toggle('active', b.dataset.ctrl === ctrl);
  });
  if (ctrl === 'gamepad') modal.querySelector('#gamepad-sub').classList.remove('hidden');
  if (ctrl === 'touch')   modal.querySelector('#touch-info').classList.remove('hidden');

  // Manette
  const gp = loadOption('gamepadType', 'switch');
  modal.querySelectorAll('.opt-gp').forEach(b => b.classList.toggle('active', b.dataset.gp === gp));

  // Audio
  ['vol-general','vol-effects','vol-voices'].forEach(id => {
    const slider = modal.querySelector('#' + id);
    const label  = modal.querySelector('#' + id + '-val');
    if (slider) { slider.value = loadOption(id, '80'); if (label) label.textContent = slider.value; }
  });

  // Cam speed
  const cs = modal.querySelector('#cam-speed');
  const csv = modal.querySelector('#cam-speed-val');
  if (cs) {
    cs.value = loadOption('camSpeed', '2');
    const labels = { 1: 'Lent', 2: 'Normal', 3: 'Rapide' };
    if (csv) csv.textContent = labels[cs.value] || 'Normal';
  }

  // Accessibilité
  ['acc-flash','acc-signal'].forEach(id => {
    const cb = modal.querySelector('#' + id);
    if (cb) cb.checked = loadOption(id, '0') === '1';
  });

  applyVolumes();
}

function applyDisplayMode(mode) {
  document.body.classList.remove('display-tv','display-pc','display-phone');
  document.body.classList.add('display-' + mode);
}

function applyVolumes() {
  const general = parseInt(loadOption('vol-general', '80')) / 100;
  const effects = parseInt(loadOption('vol-effects', '80')) / 100;
  const voices  = parseInt(loadOption('vol-voices',  '80')) / 100;
  // Appliquer aux éléments audio du menu
  ['audio-menu','audio-nightmare'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.volume = general;
  });
  // Stocker pour utilisation dans le jeu
  try {
    localStorage.setItem('fnaf_vol_general', general);
    localStorage.setItem('fnaf_vol_effects', effects);
    localStorage.setItem('fnaf_vol_voices',  voices);
  } catch(e) {}
}
