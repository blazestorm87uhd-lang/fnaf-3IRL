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
    // Si la musique menu n'a pas démarré, la relancer dès qu'une manette est là
    if (gps.length > 0 && typeof window._tryMenuAudio === 'function') {
      window._tryMenuAudio();
      window._tryMenuAudio = null; // Une seule fois
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
      '.menu-item:not([style*="display:none"]):not([style*="display: none"])'
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

  // Relancer la musique si elle n'a pas pu démarrer (autoplay bloqué)
  // Essayer immédiatement, puis au premier clic/touch/manette
  if (audioMenu && audioMenu.paused) {
    const tryMenuAudio = () => {
      if (typeof window._playMenuAudio === 'function') window._playMenuAudio();
      else if (audioMenu.paused) { audioMenu.volume = 0.65; audioMenu.play().catch(()=>{}); }
    };
    setTimeout(tryMenuAudio, 150);
    document.addEventListener('click',    tryMenuAudio, { once: true });
    document.addEventListener('touchend', tryMenuAudio, { once: true });
    document.addEventListener('keydown',  tryMenuAudio, { once: true });
    // Aussi sur interaction manette : polled dans initGamepadDetection
    window._tryMenuAudio = tryMenuAudio;
  }
  window._menuAudioPending = false;

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
  // Continue : grisé si première visite (aucune progression réelle)
  // Continue : a des données si au moins une nuit commencée ou nightmare terminé
  const hasProgress = saveData.nightCompleted > 0
    || saveData.currentNight !== null
    || (saveData.nightReached && saveData.nightReached > 1)
    || saveData.nightmareUnlocked   // a débloqué nightmare = a fini nuit 3
    || saveData.nightmareCompleted; // a fini nightmare

  // Si nightmare terminé, Continue pointe sur nuit 3 (pas de nuit 4)
  const rawNext   = saveData.currentNight !== null ? saveData.currentNight : saveData.nightReached;
  const nextNight = Math.min(rawNext || 1, 3);

  if (hasProgress) {
    btnContinue.classList.remove('disabled');
    // N'afficher "nuit 3" que si nightmare terminé ET la progression n'a pas été réinitialisée
    if (saveData.nightmareCompleted && saveData.nightCompleted >= 3) {
      continueNote.textContent = 'reprendre — nuit 3';
    } else {
      continueNote.textContent = 'reprendre — nuit ' + nextNight;
    }
    continueNote.style.color = '#555';
  } else {
    btnContinue.classList.add('disabled');
    continueNote.textContent = 'aucune donnée de jeu';
    continueNote.style.color = '#2a2a2a';
  }

  // Nightmare
  if (saveData.nightmareUnlocked) btnNightmare.style.display = 'flex';

  // Bonus — visible uniquement si nightmare terminé
  if (saveData.nightmareCompleted) {
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
  // S'assurer que la musique joue dès la première action
  function ensureMenuAudio() {
    if (typeof window._playMenuAudio === 'function') window._playMenuAudio();
  }

  btnNewGame.addEventListener('click', () => {
    ensureMenuAudio();
    const d = Save.load();
    // Conserver les déblocages acquis (bonus, nightmare, nightmareCompleted)
    const keepNightmare          = d.nightmareUnlocked;
    const keepBonus              = d.bonusUnlocked || d.nightmareCompleted;
    const keepNightmareCompleted = d.nightmareCompleted;
    // Reset progression (nuits)
    Save.save({
      nightReached:       1,
      nightCompleted:     0,
      nightmareUnlocked:  keepNightmare,
      nightmareCompleted: keepNightmareCompleted,
      bonusUnlocked:      keepBonus,
      currentNight:       1,
    });
    launchGame(1);
  });

  // ── Nightmare ──
  btnNightmare.addEventListener('click', openNightmareModal);
  btnBonus.addEventListener('click', () => {
    document.body.style.transition = 'opacity 0.3s';
    document.body.style.opacity = '0';
    setTimeout(() => { window.location.href = 'bonus.html'; }, 300);
  });

  function openNightmareModal()  { modalNightmare.classList.remove('hidden'); }
  function closeNightmareModal() { modalNightmare.classList.add('hidden'); }
  if (modalCancel)  modalCancel.addEventListener('click', closeNightmareModal);

  // Navigation manette dans la modal nightmare
  setInterval(() => {
    const modal = document.getElementById('modal-nightmare');
    if (!modal || modal.classList.contains('hidden')) return;
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    if (!gps.length) return;
    const gp = gps[0];
    // A/X = confirmer (lancer nightmare)
    if (gp.buttons[0]?.pressed) {
      if (!modal._gpConfirmCooldown) {
        modal._gpConfirmCooldown = true;
        document.getElementById('modal-confirm')?.click();
        setTimeout(() => { modal._gpConfirmCooldown = false; }, 500);
      }
    }
    // B/Rond = annuler
    if (gp.buttons[1]?.pressed) {
      if (!modal._gpCancelCooldown) {
        modal._gpCancelCooldown = true;
        closeNightmareModal();
        setTimeout(() => { modal._gpCancelCooldown = false; }, 500);
      }
    }
  }, 100);

  if (modalConfirm) modalConfirm.addEventListener('click', () => {
    closeNightmareModal();
    fadeAudio(audioMenu, 0, 600, () => { audioMenu.pause(); audioMenu.currentTime = 0; });
    Save.startNight('nightmare'); launchGame('nightmare');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNightmareModal(); });

  // Bouton Options — en position fixe hors du menu
  _setupOptionsButton();
  _setupOstLink();

  // Initialiser la détection manette et l'indicateur
  initGamepadDetection();

  // ── Options ──

  // ── Lancement ──
  function launchGame(night) {
    // Afficher overlay contrôles manette avant de lancer
    const gpConnected = navigator.getGamepads && Array.from(navigator.getGamepads()).some(g => g);
    if (gpConnected && typeof window.showGamepadControlsOverlay === 'function') {
      window.showGamepadControlsOverlay(() => _doLaunch(night));
    } else {
      _doLaunch(night);
    }
  }

  function _doLaunch(night) {
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity    = '0';
    setTimeout(() => {
      if      (night === 1)           window.location.href = 'game.html';
      else if (night === 2)           window.location.href = 'game2.html';
      else if (night === 3)           window.location.href = 'game3.html';
      else if (night === 'nightmare') window.location.href = 'game-nightmare.html';
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



function _setupOstLink() {
  // Injecter le lien directement dans menu-dev-credit, après les studios
  var credit = document.querySelector('.menu-dev-credit');
  if (!credit || document.getElementById('ost-link-menu')) return;
  var link = document.createElement('a');
  link.id = 'ost-link-menu';
  link.href = 'https://soundcloud.com/l-ly-39181851/sets/o-s-t-3irl';
  link.target = '_blank';
  link.rel = 'noopener';
  link.title = "Écouter l'OST sur SoundCloud";
  link.setAttribute('style', [
    'display:inline-flex', 'align-items:center', 'gap:4px',
    "font-family:var(--font-mono,'Share Tech Mono',monospace)",
    'font-size:9px', 'color:#888', 'text-decoration:none',
    'letter-spacing:2px', 'transition:color .15s', 'margin-top:3px'
  ].join(';'));
  link.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.6;flex-shrink:0"><path d="M1.5 13.5c0 1.1.9 2 2 2s2-.9 2-2V11c0-1.1-.9-2-2-2s-2 .9-2 2v2.5zm4.5 2c0 1.1.9 2 2 2s2-.9 2-2V9c0-1.1-.9-2-2-2s-2 .9-2 2v6.5zm4.5 1c0 1.1.9 2 2 2s2-.9 2-2V7.5c0-1.1-.9-2-2-2s-2 .9-2 2V16.5zm4.5-1.5c0 1.1.9 2 2 2s2-.9 2-2V6c0-1.1-.9-2-2-2s-2 .9-2 2v9zm4.5 0c0 1.7 1.3 3 3 3s3-1.3 3-3c0-1.4-.9-2.5-2.2-2.9V5c0-.6-.4-1-.8-1s-.8.4-.8 1v7.1c-1.3.4-2.2 1.5-2.2 2.9z"/></svg>O.S.T — 3IRL';
  link.addEventListener('mouseenter', function(){ this.style.color='#ff5500'; });
  link.addEventListener('mouseleave', function(){ this.style.color='#888'; });
  // Ajouter un saut de ligne puis le lien dans le crédit
  credit.appendChild(document.createElement('br'));
  credit.appendChild(link);
}

function _setupOptionsButton() {
  var btn = document.getElementById('btn-options');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btn-options';
    // Pas de 'Share Tech Mono' dans cssText pour éviter les conflits de quotes
    btn.setAttribute('style', [
      'position:fixed', 'bottom:68px', 'right:18px', 'z-index:8000',
      "font-family:var(--font-mono,'Share Tech Mono',monospace)",
      'font-size:clamp(14px,2vw,18px)', 'font-weight:700', 'color:#fff',
      'background:transparent', 'border:none',
      'border-bottom:0.5px solid rgba(255,255,255,0.07)',
      'padding:10px 0', 'cursor:pointer', 'letter-spacing:2px',
      'transition:color .15s', 'text-align:left', 'display:block'
    ].join(';'));
    var title = document.createElement('div');
    title.textContent = 'Options';
    var sub = document.createElement('div');
    sub.setAttribute('style', 'font-size:9px;color:#444;font-weight:400;letter-spacing:2px;margin-top:3px;');
    sub.textContent = 'affichage · contrôles · audio';
    btn.appendChild(title);
    btn.appendChild(sub);
    document.body.appendChild(btn);
  }
  btn.style.display = 'block';
  btn.onclick = function() {
    if (typeof window.openOptionsModal === 'function') window.openOptionsModal();
  };
}
