/* ═══════════════════════════════════════════
   MENU — v3
   - Continue grisé si aucune donnée
   - New Game conserve nightmare/bonus
   - New Game reset personnages à Brad
   - Bonus caché après nuit 3
   - Rotation personnages (15s)
   - Indicateur de chargement
════════════════════════════════════════════ */

// ══════════════════════════════════════
// DÉTECTION MANETTE
// ══════════════════════════════════════
function initGamepadDetection() {
  const indicator = document.getElementById('gamepad-indicator');

  function checkGamepads() {
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    if (indicator) {
      if (gps.length > 0) {
        indicator.style.display = 'block';
        indicator.textContent = '● Manette détectée';
      } else {
        indicator.style.display = 'none';
      }
    }
    return gps;
  }

  checkGamepads();
  window.addEventListener('gamepadconnected',    checkGamepads);
  window.addEventListener('gamepaddisconnected', checkGamepads);
  setInterval(checkGamepads, 3000);

  // ── Navigation manette ──
  let prevButtons = {};
  let focusIdx = 0;
  // Debounce : éviter la répétition trop rapide
  let lastInput = 0;
  const DEBOUNCE = 200;

  function getMenuFocusables() {
    return Array.from(document.querySelectorAll(
      '.menu-item:not([style*="display:none"]):not([style*="display: none"]), #btn-options'
    )).filter(b => b.offsetParent !== null && !b.classList.contains('disabled'));
  }

  function getOptionsFocusables() {
    const modal = document.getElementById('modal-options');
    if (!modal || modal.classList.contains('hidden')) return [];
    // Onglets actifs + sliders + boutons dans le panneau actif
    return Array.from(modal.querySelectorAll(
      '.opt-tab, .opt-mode, .opt-ctrl, .opt-gp, input[type=range], .opt-reset-btn, #options-close'
    )).filter(b => b.offsetParent !== null);
  }

  function isOptionsOpen() {
    const m = document.getElementById('modal-options');
    return m && !m.classList.contains('hidden');
  }

  // Détecter pression unique (pas hold)
  function justPressed(gp, idx) {
    const key = 'b' + idx;
    const pressed = gp.buttons[idx]?.pressed;
    const was = prevButtons[key] || false;
    prevButtons[key] = pressed;
    return pressed && !was;
  }
  function justPressedAxis(gp, axis, dir) {
    const key = 'a' + axis + dir;
    const val = gp.axes[axis] || 0;
    const pressed = dir > 0 ? val > 0.6 : val < -0.6;
    const was = prevButtons[key] || false;
    prevButtons[key] = pressed;
    return pressed && !was;
  }

  setInterval(() => {
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    if (!gps.length) return;
    const gp = gps[0];
    const now = Date.now();
    if (now - lastInput < DEBOUNCE) return;

    const up    = justPressed(gp, 12) || justPressedAxis(gp, 1, -1);
    const down  = justPressed(gp, 13) || justPressedAxis(gp, 1, 1);
    const left  = justPressed(gp, 14) || justPressedAxis(gp, 0, -1);
    const right = justPressed(gp, 15) || justPressedAxis(gp, 0, 1);
    // A = btn 0 (Xbox/Switch), X = btn 2 (PS), aussi btn 0
    const confirm = justPressed(gp, 0) || justPressed(gp, 2);
    // B = btn 1 (Xbox/Switch), Cercle = btn 1 (PS) → retour/fermer
    const back  = justPressed(gp, 1);

    if (up || down || left || right || confirm || back) lastInput = now;

    if (isOptionsOpen()) {
      // Navigation dans les options
      const els = getOptionsFocusables();
      if (!els.length) return;
      let ci = els.indexOf(document.activeElement);
      if (ci < 0) ci = 0;

      if (up || left)    ci = Math.max(0, ci - 1);
      if (down || right) ci = Math.min(els.length - 1, ci + 1);
      if (up || down || left || right) els[ci]?.focus();

      if (confirm) {
        const el = document.activeElement;
        if (el && el.tagName === 'INPUT' && el.type === 'range') {
          // Incrémenter/décrémenter le slider
          // (géré par left/right au-dessus)
        } else {
          el?.click();
        }
      }
      // Ajuster slider avec gauche/droite quand slider en focus
      const focused = document.activeElement;
      if (focused?.type === 'range') {
        const step = 5;
        if (left)  { focused.value = Math.max(0,   parseInt(focused.value) - step); focused.dispatchEvent(new Event('input')); }
        if (right) { focused.value = Math.min(100, parseInt(focused.value) + step); focused.dispatchEvent(new Event('change')); }
      }
      if (back) {
        document.getElementById('options-close')?.click();
      }
      return;
    }

    // Navigation menu principal
    const btns = getMenuFocusables();
    if (!btns.length) return;
    let ci = btns.indexOf(document.activeElement);
    if (ci < 0) ci = focusIdx;

    if (up)   ci = Math.max(0, ci - 1);
    if (down) ci = Math.min(btns.length - 1, ci + 1);
    if (up || down) { focusIdx = ci; btns[focusIdx]?.focus(); }

    if (confirm && document.activeElement) {
      document.activeElement.click();
    }
  }, 50);
}

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
  // Continue : nuit max 3 (nightmare = nuit séparée, pas une continuation)
  // Continue : nuit max 3 (nightmare = séparé)
  const rawNext  = saveData.currentNight !== null ? saveData.currentNight : saveData.nightReached;
  const nextNight = Math.min(rawNext || 1, 3);

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

  // Initialiser la détection manette et l'indicateur
  initGamepadDetection();

  // Appliquer les options sauvegardées immédiatement au chargement
  applyVolumes();
  applyDisplayMode(loadOption('displayMode', 'pc'));

  // ── Options ──
  const btnOptions = document.getElementById('btn-options');
  if (btnOptions) {
    btnOptions.addEventListener('click', openOptionsModal);
    btnOptions.addEventListener('touchend', e => { e.preventDefault(); openOptionsModal(); });
  }
  // Fallback délégation pour s'assurer que le bouton répond
  document.addEventListener('click', e => {
    if (e.target && (e.target.id === 'btn-options' || e.target.closest('#btn-options'))) {
      openOptionsModal();
    }
  });

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
  if (!modal) {
    modal = buildOptionsModal();
    // TOUJOURS dans document.body pour éviter l'overflow:hidden du menu
    document.body.appendChild(modal);
  }
  // Forcer display:flex même si hidden/CSS interfère
  modal.style.display = 'flex';
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
        <button class="opt-tab active" data-tab="affichage">
          <svg class="opt-tab-icon" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5 14h6M8 12v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          Affichage
        </button>
        <button class="opt-tab" data-tab="controles">
          <svg class="opt-tab-icon" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="5" width="12" height="7" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="5.5" cy="8.5" r="1" fill="currentColor"/><circle cx="10.5" cy="7.5" r="0.8" fill="currentColor"/><circle cx="10.5" cy="9.5" r="0.8" fill="currentColor"/><path d="M7 8.5h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          Contrôles
        </button>
        <button class="opt-tab" data-tab="audio">
          <svg class="opt-tab-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M3 6h2l3-3v10l-3-3H3V6z" stroke="currentColor" stroke-width="1.1" fill="none"/><path d="M10 5.5c1.2 0.8 1.2 4.2 0 5M12 4c2 1.5 2 6.5 0 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg>
          Audio
        </button>

      </div>

      <!-- AFFICHAGE -->
      <div class="opt-panel active" id="tab-affichage">
        <div class="opt-section-label">Mode d'affichage</div>
        <div class="opt-modes">
          <button class="opt-mode" data-mode="tv">
            <span class="opt-mode-icon"><svg width="28" height="24" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="2" width="24" height="16" rx="2"/><path d="M10 22h8M14 18v4" stroke-linecap="round"/></svg></span>
            <span>Mode TV</span>
            <span class="opt-mode-desc">Texte agrandi, usage à distance</span>
          </button>
          <button class="opt-mode active" data-mode="pc">
            <span class="opt-mode-icon"><svg width="28" height="24" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="2" width="22" height="15" rx="2"/><path d="M9 22h10M14 17v5" stroke-linecap="round"/><rect x="10" y="19" width="8" height="3" rx="1"/></svg></span>
            <span>Mode PC</span>
            <span class="opt-mode-desc">Affichage standard</span>
          </button>
          <button class="opt-mode" data-mode="phone">
            <span class="opt-mode-icon"><svg width="20" height="28" viewBox="0 0 20 28" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="1" width="16" height="26" rx="3"/><circle cx="10" cy="24" r="1.2" fill="currentColor"/></svg></span>
            <span>Téléphone</span>
            <span class="opt-mode-desc">Interface tactile élargie</span>
          </button>
        </div>
      </div>

      <!-- CONTRÔLES -->
      <div class="opt-panel" id="tab-controles">
        <div class="opt-section-label">Type de contrôle</div>
        <div class="opt-ctrl-types">
          <button class="opt-ctrl active" data-ctrl="mouse"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-right:5px;vertical-align:middle"><rect x="2" y="1" width="10" height="12" rx="5"/><line x1="7" y1="1" x2="7" y2="7"/><circle cx="7" cy="9" r="1" fill="currentColor"/></svg> Clavier / Souris</button>
          <button class="opt-ctrl" data-ctrl="gamepad"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-right:5px;vertical-align:middle"><rect x="1" y="4" width="12" height="7" rx="3"/><line x1="4" y1="7" x2="4" y2="9"/><line x1="3" y1="8" x2="5" y2="8"/><circle cx="10" cy="7" r="0.8" fill="currentColor"/><circle cx="10" cy="9" r="0.8" fill="currentColor"/></svg> Manette</button>
          <button class="opt-ctrl" data-ctrl="touch"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-right:5px;vertical-align:middle"><path d="M7 2v6M4 5L7 2l3 3" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 9c0 2 1.5 3 4 3s4-1 4-3V8" stroke-linecap="round"/></svg> Tactile</button>
        </div>

        <!-- Sous-menu manette -->
        <div class="opt-gamepad-sub hidden" id="gamepad-sub">
          <div class="opt-section-label" style="margin-top:14px;">Type de manette</div>
          <div class="opt-ctrl-types">
            <button class="opt-gp active" data-gp="switch">Switch</button>
            <button class="opt-gp" data-gp="xbox">Xbox</button>
            <button class="opt-gp" data-gp="ps">PlayStation</button>
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
        <div class="opt-hint"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#c0a010" stroke-width="1.2" style="margin-right:6px;vertical-align:middle"><circle cx="7" cy="7" r="5.5"/><line x1="7" y1="5" x2="7" y2="7.5" stroke-linecap="round"/><circle cx="7" cy="9.5" r="0.8" fill="#c0a010"/></svg> Certains indices sonores sont discrets. Un volume suffisant est recommandé pour profiter pleinement du jeu.</div>
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
        <button class="opt-reset-btn" id="btn-reset-volumes">&#8635; Remettre les volumes par défaut</button>
      </div>

      
  `;

  // Fermer
  modal.addEventListener('click', e => {
    if (e.target === modal) { modal.style.display='none'; modal.classList.add('hidden'); }
  });
  modal.querySelector('#options-close').addEventListener('click', () => {
    modal.style.display='none'; modal.classList.add('hidden');
  });

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
  const audioSliders = [
    ['vol-general', 'vol-general-val', null],
    ['vol-effects', 'vol-effects-val', 'assets/audio/effect/test-sound.wav'],
    ['vol-voices',  'vol-voices-val',  'assets/audio/effect/test-sound-2.wav'],
  ];
  audioSliders.forEach(([id, valId, testSrc]) => {
    const slider = modal.querySelector('#' + id);
    const label  = modal.querySelector('#' + valId);
    slider.addEventListener('input', () => {
      label.textContent = slider.value;
      saveOption(id, slider.value);
      applyVolumes();
    });
    // Son de test au relâchement du curseur
    if (testSrc) {
      slider.addEventListener('change', () => {
        try {
          const vol = parseInt(slider.value) / 100;
          const a = new Audio(testSrc);
          a.volume = Math.min(1, vol);
          a.play().catch(() => {});
        } catch(e) {}
      });
    }
  });

  // Bouton reset volumes
  const resetBtn = modal.querySelector('#btn-reset-volumes');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      ['vol-general','vol-effects','vol-voices'].forEach(id => {
        saveOption(id, '80');
        const s = modal.querySelector('#' + id);
        const l = modal.querySelector('#' + id + '-val');
        if (s) s.value = '80';
        if (l) l.textContent = '80';
      });
      applyVolumes();
    });
  }

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
  // Appliquer immédiatement aux audios du menu
  document.querySelectorAll('audio').forEach(el => {
    el.volume = Math.min(1, general);
  });
  // Stocker pour utilisation dans le jeu (lu par game.js au démarrage)
  try {
    localStorage.setItem('fnaf_vol_general', general.toFixed(3));
    localStorage.setItem('fnaf_vol_effects', effects.toFixed(3));
    localStorage.setItem('fnaf_vol_voices',  voices.toFixed(3));
  } catch(e) {}
}

// Lecture des volumes dans le jeu (à appeler en début de startNight)
function getGameVolumes() {
  return {
    general: parseFloat(localStorage.getItem('fnaf_vol_general') || '0.8'),
    effects: parseFloat(localStorage.getItem('fnaf_vol_effects') || '0.8'),
    voices:  parseFloat(localStorage.getItem('fnaf_vol_voices')  || '0.8'),
  };
}
