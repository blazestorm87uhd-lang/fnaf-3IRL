/* ═══════════════════════════════════════════
   GAMEPAD-OVERLAY.JS — js/gamepad-overlay.js ✓
   Overlay contrôles manette affiché AVANT de lancer une nuit
   (déclenché depuis menu.js via window.showGamepadControlsOverlay)
════════════════════════════════════════════ */
(() => {
  function getGP() {
    try {
      const all = navigator.getGamepads();
      for (let i = 0; i < all.length; i++) if (all[i]?.connected) return all[i];
    } catch(e) {} return null;
  }
  function getGpType() {
    try { return localStorage.getItem('fnaf_opt_gamepadType') || 'xbox'; } catch(e) { return 'xbox'; }
  }

  const CONTROLS = {
    ps:     [
      { icon:'✕',   desc:'Valider / Ouvrir / Démarrer' },
      { icon:'○',   desc:'Rembobiner boîte à musique (maintenir)' },
      { icon:'□',   desc:'Mute appel en cours' },
      { icon:'△',   desc:'Panneau Maintenance' },
      { icon:'L1',  desc:'Play Audio' },
      { icon:'D-pad', desc:'Naviguer entre caméras' },
    ],
    xbox:   [
      { icon:'A',   desc:'Valider / Ouvrir / Démarrer' },
      { icon:'B',   desc:'Rembobiner boîte à musique (maintenir)' },
      { icon:'X',   desc:'Mute appel en cours' },
      { icon:'Y',   desc:'Panneau Maintenance' },
      { icon:'LB',  desc:'Play Audio' },
      { icon:'D-pad', desc:'Naviguer entre caméras' },
    ],
    switch: [
      { icon:'A',   desc:'Valider / Ouvrir / Démarrer' },
      { icon:'B',   desc:'Rembobiner boîte à musique (maintenir)' },
      { icon:'Y',   desc:'Mute appel en cours' },
      { icon:'X',   desc:'Panneau Maintenance' },
      { icon:'L',   desc:'Play Audio' },
      { icon:'D-pad', desc:'Naviguer entre caméras' },
    ],
  };
  const GP_STYLE = {
    ps:     { bg:'#00307a', border:'#0066cc' },
    xbox:   { bg:'#0a5c0a', border:'#3aa13a' },
    switch: { bg:'#b50010', border:'#ff3a50' },
  };

  function buildOverlay(gpType, onNext) {
    const binds  = CONTROLS[gpType] || CONTROLS.xbox;
    const style  = GP_STYLE[gpType] || GP_STYLE.xbox;
    const gpName = { ps:'PlayStation', xbox:'Xbox', switch:'Nintendo Switch' }[gpType] || 'Manette';
    const confirmKey = gpType === 'ps' ? '✕' : 'A';

    const ov = document.createElement('div');
    ov.id = 'gp-controls-overlay';
    ov.style.cssText = `
      position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,0.96);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:16px;font-family:'Share Tech Mono',monospace;
    `;

    const title = document.createElement('div');
    title.style.cssText = `font-family:'Cinzel',serif;font-size:13px;color:#888;letter-spacing:6px;margin-bottom:6px;`;
    title.textContent = `CONTRÔLES — ${gpName.toUpperCase()}`;
    ov.appendChild(title);

    const sep = document.createElement('div');
    sep.style.cssText = `width:min(320px,80vw);height:0.5px;background:rgba(255,255,255,0.1);`;
    ov.appendChild(sep);

    const list = document.createElement('div');
    list.style.cssText = `display:flex;flex-direction:column;gap:7px;width:min(320px,80vw);`;
    binds.forEach(b => {
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;gap:12px;`;
      const badge = document.createElement('div');
      badge.style.cssText = `
        min-width:46px;height:32px;padding:0 6px;flex-shrink:0;
        background:${style.bg};border:1px solid ${style.border};border-radius:5px;
        display:flex;align-items:center;justify-content:center;
        font-size:${b.icon.length > 2 ? '9px' : '12px'};color:#fff;letter-spacing:1px;
      `;
      badge.textContent = b.icon;
      const lbl = document.createElement('div');
      lbl.style.cssText = `font-size:10px;color:#666;letter-spacing:1px;`;
      lbl.textContent = b.desc;
      row.appendChild(badge); row.appendChild(lbl); list.appendChild(row);
    });
    ov.appendChild(list);

    const sep2 = document.createElement('div');
    sep2.style.cssText = sep.style.cssText + 'margin-top:4px;';
    ov.appendChild(sep2);

    const nextBtn = document.createElement('button');
    nextBtn.style.cssText = `
      font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:4px;
      color:#ccc;background:transparent;border:0.5px solid rgba(255,255,255,0.2);
      padding:12px 32px;cursor:pointer;margin-top:4px;
      transition:color .15s,border-color .15s;
    `;
    nextBtn.textContent = `▶  SUIVANT  (${confirmKey})`;
    nextBtn.onmouseenter = () => { nextBtn.style.color='#fff'; nextBtn.style.borderColor='rgba(255,255,255,0.5)'; };
    nextBtn.onmouseleave = () => { nextBtn.style.color='#ccc'; nextBtn.style.borderColor='rgba(255,255,255,0.2)'; };
    ov.appendChild(nextBtn);

    let closed = false;
    function close() {
      if (closed) return; closed = true;
      clearInterval(gpInt);
      ov.style.transition = 'opacity 0.3s';
      ov.style.opacity = '0';
      setTimeout(() => { ov.remove(); if (onNext) onNext(); }, 320);
    }

    nextBtn.addEventListener('click', close);
    nextBtn.addEventListener('touchend', e => { e.preventDefault(); close(); });

    // Manette : A/X = suivant
    // Initialiser prevBtn à l'état ACTUEL du bouton pour éviter close() immédiat
    // si le bouton est déjà enfoncé au moment où l'overlay s'affiche
    const _initGp = getGP();
    let prevBtn = _initGp ? !!(_initGp.buttons[0]?.pressed) : false;
    // Délai court de sécurité avant d'activer la détection
    let gpReady = false;
    setTimeout(() => { gpReady = true; }, 300);
    const gpInt = setInterval(() => {
      if (!gpReady) return;
      const gp = getGP(); if (!gp) return;
      const pressed = gp.buttons[0]?.pressed;
      if (pressed && !prevBtn) close();
      prevBtn = pressed;
    }, 50);

    // Auto-close 12s
    setTimeout(() => close(), 12000);

    return ov;
  }

  // API publique — appelée depuis menu.js
  window.showGamepadControlsOverlay = function(onNext) {
    const gp = getGP();
    if (!gp) { if (onNext) onNext(); return; }
    const existing = document.getElementById('gp-controls-overlay');
    if (existing) existing.remove();
    document.body.appendChild(buildOverlay(getGpType(), onNext));
  };

})();
