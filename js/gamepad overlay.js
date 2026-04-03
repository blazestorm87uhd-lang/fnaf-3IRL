/* ═══════════════════════════════════════════
   GAMEPAD-OVERLAY.JS
   Affiche les contrôles manette au début de la nuit
   si une manette est connectée et le mode manette activé
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

  const CONTROLS = {
    ps: [
      { icon: '✕',  label: 'Valider / Ouvrir' },
      { icon: '○',  label: 'Rembobiner boîte (maintenir)' },
      { icon: '△',  label: 'Maintenance' },
      { icon: 'L1', label: 'Play Audio' },
      { icon: '←→', label: 'Naviguer caméras' },
    ],
    xbox: [
      { icon: 'A',  label: 'Valider / Ouvrir' },
      { icon: 'B',  label: 'Rembobiner boîte (maintenir)' },
      { icon: 'Y',  label: 'Maintenance' },
      { icon: 'LB', label: 'Play Audio' },
      { icon: '←→', label: 'Naviguer caméras' },
    ],
    switch: [
      { icon: 'A',  label: 'Valider / Ouvrir' },
      { icon: 'B',  label: 'Rembobiner boîte (maintenir)' },
      { icon: 'X',  label: 'Maintenance' },
      { icon: 'L',  label: 'Play Audio' },
      { icon: '←→', label: 'Naviguer caméras' },
    ],
  };

  function showGamepadControls(gpType, onDone) {
    const overlay = document.createElement('div');
    overlay.id = 'gp-controls-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:8500;
      background:rgba(0,0,0,0.92);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      gap:24px;
      animation:fadeIn 0.5s ease forwards;
    `;

    const title = document.createElement('div');
    title.style.cssText = "font-family:'Cinzel',serif;font-size:14px;color:#888;letter-spacing:6px;margin-bottom:8px;";
    const gpName = gpType === 'ps' ? 'PlayStation' : gpType === 'switch' ? 'Nintendo Switch' : 'Xbox';
    title.textContent = `CONTRÔLES — ${gpName.toUpperCase()}`;
    overlay.appendChild(title);

    const list = document.createElement('div');
    list.style.cssText = "display:flex;flex-direction:column;gap:10px;min-width:280px;";

    const bindings = CONTROLS[gpType] || CONTROLS.xbox;
    bindings.forEach(b => {
      const row = document.createElement('div');
      row.style.cssText = "display:flex;align-items:center;gap:16px;";

      const badge = document.createElement('div');
      badge.style.cssText = `
        min-width:44px;height:36px;
        border:1px solid rgba(255,255,255,0.25);
        border-radius:6px;
        display:flex;align-items:center;justify-content:center;
        font-family:'Share Tech Mono',monospace;
        font-size:${b.icon.length > 2 ? '10px' : '14px'};
        color:#ddd;
        letter-spacing:1px;
        flex-shrink:0;
      `;
      badge.textContent = b.icon;

      const lbl = document.createElement('div');
      lbl.style.cssText = "font-family:'Share Tech Mono',monospace;font-size:11px;color:#666;letter-spacing:2px;";
      lbl.textContent = b.label;

      row.appendChild(badge);
      row.appendChild(lbl);
      list.appendChild(row);
    });

    overlay.appendChild(list);

    const skip = document.createElement('div');
    skip.style.cssText = "font-family:'Share Tech Mono',monospace;font-size:9px;color:#333;letter-spacing:3px;margin-top:16px;animation:blink 1.4s step-start infinite;";
    const confirmBtn = gpType === 'ps' ? 'X' : 'A';
    skip.textContent = `APPUYER SUR ${confirmBtn} OU CLIQUER POUR CONTINUER`;
    overlay.appendChild(skip);

    document.body.appendChild(overlay);

    // Fermer sur clic ou btn A/X
    let closed = false;
    function close() {
      if (closed) return; closed = true;
      overlay.style.animation = 'fadeOut 0.4s ease forwards';
      setTimeout(() => { overlay.remove(); if (onDone) onDone(); }, 400);
    }

    overlay.addEventListener('click', close);

    // Fermer sur bouton manette
    const closeInterval = setInterval(() => {
      const gp = getGP(); if (!gp) return;
      if (gp.buttons[0]?.pressed || gp.buttons[2]?.pressed) {
        clearInterval(closeInterval); close();
      }
    }, 50);

    // Auto-close après 8s
    setTimeout(() => { clearInterval(closeInterval); close(); }, 8000);
  }

  // Exposer globalement
  window.showGamepadControlsIfNeeded = function(onDone) {
    const gp = getGP();
    // Afficher si manette connectée (mode manette OU manette détectée même sans mode actif)
    if (gp && isGamepadMode()) {
      showGamepadControls(getGpType(), onDone);
    } else {
      if (onDone) onDone();
    }
  };

})();
