/* ═══════════════════════════════════════════
   GAMEPAD-OVERLAY.JS
   - Overlay contrôles affiché AVANT la nuit (sur new game / continue)
   - S'affiche sur l'écran night start (12AM Night 1...)
   - Joueur appuie sur A/X pour démarrer
   Emplacement : js/gamepad-overlay.js ✓
════════════════════════════════════════════ */

(() => {

  function isGamepadMode() {
    try { return localStorage.getItem('fnaf_opt_controlType') === 'gamepad'; } catch(e) { return false; }
  }
  function getGpType() {
    try { return localStorage.getItem('fnaf_opt_gamepadType') || 'xbox'; } catch(e) { return 'xbox'; }
  }
  function getGP() {
    try {
      const all = navigator.getGamepads();
      for (let i = 0; i < all.length; i++) if (all[i]?.connected) return all[i];
    } catch(e) {}
    return null;
  }

  // Mappings visuels par type de manette
  const CONTROLS = {
    ps: [
      { icon: '✕',   label: 'Valider / Ouvrir / Démarrer' },
      { icon: '○',   label: 'Rembobiner boîte à musique (maintenir)' },
      { icon: '□',   label: 'Mute appel en cours' },
      { icon: '△',   label: 'Maintenance' },
      { icon: 'L1',  label: 'Play Audio' },
      { icon: '←→↑↓', label: 'Naviguer entre caméras' },
    ],
    xbox: [
      { icon: 'A',   label: 'Valider / Ouvrir / Démarrer' },
      { icon: 'B',   label: 'Rembobiner boîte à musique (maintenir)' },
      { icon: 'X',   label: 'Mute appel en cours' },
      { icon: 'Y',   label: 'Maintenance' },
      { icon: 'LB',  label: 'Play Audio' },
      { icon: '←→↑↓', label: 'Naviguer entre caméras' },
    ],
    switch: [
      { icon: 'A',   label: 'Valider / Ouvrir / Démarrer' },
      { icon: 'B',   label: 'Rembobiner boîte à musique (maintenir)' },
      { icon: 'Y',   label: 'Mute appel en cours' },
      { icon: 'X',   label: 'Maintenance' },
      { icon: 'L',   label: 'Play Audio' },
      { icon: '←→↑↓', label: 'Naviguer entre caméras' },
    ],
  };

  // Couleurs des badges selon manette
  const GP_COLORS = {
    ps:     { bg: '#003087', border: '#0070cc', accent: '#fff' },
    xbox:   { bg: '#107c10', border: '#52b043', accent: '#fff' },
    switch: { bg: '#e4000f', border: '#ff6b7a', accent: '#fff' },
  };

  function buildOverlay(gpType, onConfirm) {
    const colors  = GP_COLORS[gpType] || GP_COLORS.xbox;
    const bindings = CONTROLS[gpType] || CONTROLS.xbox;
    const gpLabel = { ps: 'PlayStation', xbox: 'Xbox', switch: 'Nintendo Switch' }[gpType] || 'Manette';
    const confirmBtn = gpType === 'ps' ? '✕' : 'A';

    const overlay = document.createElement('div');
    overlay.id = 'gp-controls-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9500;
      background:rgba(0,0,0,0.95);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      gap:20px;
      font-family:'Share Tech Mono',monospace;
    `;

    // Titre
    const title = document.createElement('div');
    title.style.cssText = `font-family:'Cinzel',serif;font-size:13px;color:#888;letter-spacing:6px;text-align:center;`;
    title.textContent = `CONTRÔLES — ${gpLabel.toUpperCase()}`;
    overlay.appendChild(title);

    // Séparateur
    const sep = document.createElement('div');
    sep.style.cssText = `width:200px;height:0.5px;background:rgba(255,255,255,0.1);`;
    overlay.appendChild(sep);

    // Liste des contrôles
    const list = document.createElement('div');
    list.style.cssText = `display:flex;flex-direction:column;gap:8px;min-width:min(320px,85vw);`;

    bindings.forEach(b => {
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;gap:14px;`;

      const badge = document.createElement('div');
      const isLong = b.icon.length > 2;
      badge.style.cssText = `
        min-width:48px;height:34px;padding:0 6px;
        background:${colors.bg};
        border:1px solid ${colors.border};
        border-radius:6px;
        display:flex;align-items:center;justify-content:center;
        font-size:${isLong ? '9px' : '13px'};
        color:${colors.accent};
        letter-spacing:${isLong ? '1px' : '0'};
        flex-shrink:0;
        box-shadow:0 0 8px ${colors.border}44;
      `;
      badge.textContent = b.icon;

      const lbl = document.createElement('div');
      lbl.style.cssText = `font-size:10px;color:#666;letter-spacing:2px;line-height:1.4;`;
      lbl.textContent = b.label;

      row.appendChild(badge);
      row.appendChild(lbl);
      list.appendChild(row);
    });
    overlay.appendChild(list);

    // Séparateur bas
    const sep2 = document.createElement('div');
    sep2.style.cssText = `width:200px;height:0.5px;background:rgba(255,255,255,0.1);margin-top:8px;`;
    overlay.appendChild(sep2);

    // Bouton continuer
    const hint = document.createElement('div');
    hint.style.cssText = `
      font-size:10px;color:#444;letter-spacing:3px;text-align:center;
      animation:blink 1.4s step-start infinite;
      cursor:pointer;padding:10px 20px;
      border:0.5px solid rgba(255,255,255,0.08);
      transition:color 0.15s,border-color 0.15s;
    `;
    hint.textContent = `APPUYER SUR ${confirmBtn} OU CLIQUER POUR CONTINUER`;
    hint.onmouseenter = () => { hint.style.color='#aaa'; hint.style.borderColor='rgba(255,255,255,0.25)'; };
    hint.onmouseleave = () => { hint.style.color='#444'; hint.style.borderColor='rgba(255,255,255,0.08)'; };
    overlay.appendChild(hint);

    // Auto-close + interactions
    let closed = false;
    function close() {
      if (closed) return; closed = true;
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(() => { overlay.remove(); if (onConfirm) onConfirm(); }, 320);
    }

    overlay.addEventListener('click', close);

    // Manette
    let prevBtn0 = false;
    const gpInterval = setInterval(() => {
      const gp = getGP(); if (!gp) return;
      const pressed = gp.buttons[0]?.pressed;
      if (pressed && !prevBtn0) { clearInterval(gpInterval); close(); }
      prevBtn0 = pressed;
    }, 50);

    // Auto-close 10s
    setTimeout(() => { clearInterval(gpInterval); close(); }, 10000);

    return overlay;
  }

  // ── API publique ──────────────────────────
  // Appelée par menu.js quand joueur clique new game/continue
  // onConfirm = callback après fermeture (lancer le jeu)
  window.showGamepadControlsOverlay = function(onConfirm) {
    const gp = getGP();
    if (!gp) { if (onConfirm) onConfirm(); return; } // Pas de manette → direct
    const overlay = buildOverlay(getGpType(), onConfirm);
    document.body.appendChild(overlay);
  };

  // Appelée par les fichiers de jeu pour afficher sur night start
  // (uniquement si manette connectée ET mode manette)
  window.showGamepadControlsIfNeeded = function(onDone) {
    const gp = getGP();
    if (gp && isGamepadMode()) {
      const overlay = buildOverlay(getGpType(), onDone);
      document.body.appendChild(overlay);
    } else {
      if (onDone) onDone();
    }
  };

})();
