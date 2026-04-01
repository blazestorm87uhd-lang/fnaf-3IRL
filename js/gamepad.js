/* ═══════════════════════════════════════════
   GAMEPAD.JS — Support manette en jeu
   PS: X=valider, Rond=retour/musique, Triangle=maintenance
   Xbox: A=valider, B=musique, Y=maintenance
   Switch: A=valider, B=musique, X=maintenance
   D-pad/joystick = navigation caméras
════════════════════════════════════════════ */

(function initGamepad() {
  let prevBtns = {};
  let prevAxes = {};
  let lastInput = 0;
  const DEBOUNCE = 180;

  // Ordre des pièces pour la navigation (rempli par le jeu)
  // window._gpRooms = ['cellier','wc',...]

  function gp() {
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    return gps[0] || null;
  }

  function justPressed(btnIdx) {
    const pad = gp(); if (!pad) return false;
    const key = 'b' + btnIdx;
    const now = pad.buttons[btnIdx]?.pressed || false;
    const was = prevBtns[key] || false;
    prevBtns[key] = now;
    return now && !was;
  }

  function justAxis(axisIdx, dir) {
    const pad = gp(); if (!pad) return false;
    const key = 'a' + axisIdx + dir;
    const val = pad.axes[axisIdx] || 0;
    const now = dir > 0 ? val > 0.55 : val < -0.55;
    const was = prevAxes[key] || false;
    prevAxes[key] = now;
    return now && !was;
  }

  // Type de manette stocké dans options
  function getGpType() {
    try { return localStorage.getItem('fnaf_opt_gamepadType') || 'xbox'; } catch(e) { return 'xbox'; }
  }
  function isGamepadMode() {
    try { return localStorage.getItem('fnaf_opt_controlType') === 'gamepad'; } catch(e) { return false; }
  }

  // Mapping boutons selon type
  function getMapping() {
    const t = getGpType();
    if (t === 'ps')    return { confirm: [0,2], back: [1],  special: [1],  maint: [3] }; // X, Rond, Triangle
    if (t === 'switch')return { confirm: [0],   back: [1],  special: [1],  maint: [2] }; // A, B, X
    return               { confirm: [0],   back: [1],  special: [1],  maint: [3] }; // A, B, Y (Xbox)
  }

  function anyPressed(indices) {
    return indices.some(i => justPressed(i));
  }

  // Navigation caméras
  function navigateCams(dir) {
    const rooms = window._gpRooms;
    if (!rooms || !rooms.length) return;
    const map = document.querySelectorAll('.map-room[data-room]');
    const visible = Array.from(map).filter(r => r.offsetParent !== null);
    const cur = Array.from(visible).findIndex(r => r.classList.contains('active'));
    let next = cur < 0 ? 0 : cur + dir;
    next = Math.max(0, Math.min(visible.length - 1, next));
    visible[next]?.click();
  }

  // Rembobinage boîte (hold)
  let rewindHeld = false;

  setInterval(() => {
    const pad = gp();
    if (!pad) return;
    if (!isGamepadMode()) {
      // Même sans mode manette, mettre à jour prevBtns pour éviter faux positifs
      pad.buttons.forEach((b, i) => { prevBtns['b' + i] = b.pressed; });
      pad.axes.forEach((a, i) => { prevAxes['a' + i + 1] = false; prevAxes['a' + i + -1] = false; });
      return;
    }

    const now = Date.now();
    const map = getMapping();

    const up      = justPressed(12) || justAxis(1, -1);
    const down    = justPressed(13) || justAxis(1, 1);
    const left    = justPressed(14) || justAxis(0, -1);
    const right   = justPressed(15) || justAxis(0, 1);
    const confirm = anyPressed(map.confirm);
    const maint   = anyPressed(map.maint);
    const special = pad.buttons[map.special[0]]?.pressed; // Hold pour rembobinage

    // Navigation caméras
    if (up || left)    navigateCams(-1);
    if (down || right) navigateCams(1);

    // Maintenance
    if (maint && (now - lastInput > DEBOUNCE)) {
      lastInput = now;
      const btnM = document.getElementById('btn-maintenance');
      const panel = document.getElementById('panel-maintenance');
      if (panel && !panel.classList.contains('hidden')) {
        document.getElementById('btn-maintenance-close')?.click();
      } else if (btnM) {
        btnM.click();
      }
    }

    // Rembobinage boîte (hold spécial)
    const rewindBtn = document.getElementById('btn-rewind-musicbox');
    if (rewindBtn && rewindBtn.offsetParent !== null) {
      if (special && !rewindHeld) {
        rewindHeld = true;
        rewindBtn.dispatchEvent(new MouseEvent('mousedown'));
      } else if (!special && rewindHeld) {
        rewindHeld = false;
        rewindBtn.dispatchEvent(new MouseEvent('mouseup'));
      }
    }

    // Confirm (A/X) — valider dans maintenance
    if (confirm && (now - lastInput > DEBOUNCE)) {
      lastInput = now;
      const panel = document.getElementById('panel-maintenance');
      if (panel && !panel.classList.contains('hidden')) {
        // Naviguer dans la liste maintenance
        const focused = document.activeElement;
        if (focused?.classList.contains('maint-item') || focused?.classList.contains('maint-reboot')) {
          focused.click();
        }
      }
    }

    // Play audio (bouton dédié = btn 4 L1/LB)
    if (justPressed(4) && (now - lastInput > DEBOUNCE)) {
      lastInput = now;
      document.getElementById('btn-audio')?.click();
    }

  }, 50);

  // Afficher hint manette sur la play gate
  window.addEventListener('load', () => {
    setTimeout(() => {
      const gate = document.getElementById('btn-play-gate');
      if (!gate) return;
      const type = getGpType();
      const label = type === 'ps' ? 'X' : 'A';
      if (isGamepadMode()) {
        const hint = document.createElement('div');
        hint.style.cssText = "font-family:'Share Tech Mono',monospace;font-size:10px;color:#555;letter-spacing:3px;text-align:center;margin-top:10px;";
        hint.textContent = `Manette : ${label} pour jouer`;
        gate.parentElement?.appendChild(hint);
      }
    }, 500);
  });

  // Rendre le bouton play-gate activable par la manette
  setInterval(() => {
    const gate = document.getElementById('screen-play-gate');
    if (!gate || gate.classList.contains('hidden')) return;
    const pad = gp(); if (!pad) return;
    if (!isGamepadMode()) return;
    const map = getMapping();
    if (anyPressed(map.confirm)) {
      document.getElementById('btn-play-gate')?.click();
    }
  }, 50);

})();
