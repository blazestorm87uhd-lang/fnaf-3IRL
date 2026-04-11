/* ═══════════════════════════════════════════
   GAMEPAD.JS v3 — Support manette en jeu
   PS:     ✕=valider □=mute △=maint L1=audio ○=rewind(hold)
   Xbox:   A=valider X=mute  Y=maint  LB=audio B=rewind(hold)
   Switch: A=valider Y=mute  X=maint  L=audio  B=rewind(hold)
   D-pad / Joystick gauche = navigation caméras
   js/gamepad.js — chargé dans game*.html après gamepad-overlay.js
════════════════════════════════════════════ */
(() => {
  // window._gpRooms est défini par chaque game*.js

  const prev = {};    // état précédent des boutons et axes
  let lastNav = 0;    // timestamp dernière navigation caméra
  let rewindHeld = false;
  const NAV_MS = 200; // debounce navigation

  /* ─── Helpers ─── */
  function getGP() {
    try {
      const all = navigator.getGamepads();
      for (let i = 0; i < all.length; i++) if (all[i]?.connected) return all[i];
    } catch(e) {} return null;
  }

  // Pression nouvelle (bouton vient d'être appuyé ce tick)
  function jp(gp, i) {
    const k='b'+i, now=!!(gp.buttons[i]?.pressed), was=prev[k]||false;
    prev[k]=now; return now && !was;
  }
  // Axe venant de franchir seuil
  function ja(gp, axis, dir) {
    const k='a'+axis+dir, v=gp.axes[axis]||0;
    const now=dir>0?v>0.52:v<-0.52, was=prev[k]||false;
    prev[k]=now; return now && !was;
  }
  // Bouton maintenu (pour rembobinage)
  function held(gp, i) { return !!(gp.buttons[i]?.pressed); }

  function getType() {
    try { return localStorage.getItem('fnaf_opt_gamepadType')||'xbox'; } catch(e) { return 'xbox'; }
  }
  // Mapping : confirm / mute / maint / audio / rewind
  function map() {
    const t = getType();
    if (t==='ps')     return {c:0, mu:2, ma:3, au:4, rw:1}; // ✕ □ △ L1 ○
    if (t==='switch') return {c:0, mu:3, ma:2, au:4, rw:1}; // A Y X L B
    return                   {c:0, mu:2, ma:3, au:4, rw:1}; // A X Y LB B (Xbox)
  }

  /* ─── Navigation caméras ─── */
  function navCam(dir) {
    const panel = document.getElementById('panel-maintenance');
    if (panel && !panel.classList.contains('hidden')) {
      // Navigation dans maintenance
      const items = Array.from(panel.querySelectorAll(
        '.maint-item[data-module], .maint-reboot, #btn-maintenance-close'
      )).filter(e => e.offsetParent !== null);
      if (!items.length) return;
      const ci = items.indexOf(document.activeElement);
      const ni = Math.max(0, Math.min(items.length-1, (ci<0?0:ci)+dir));
      items[ni].focus();
      return;
    }
    // Navigation caméras normale
    const els = Array.from(document.querySelectorAll('.map-room[data-room]'))
      .filter(e => e.offsetParent !== null);
    if (!els.length) return;
    const ci = els.findIndex(e => e.classList.contains('active'));
    const ni = Math.max(0, Math.min(els.length-1, (ci<0?0:ci)+dir));
    els[ni].click();
  }

  /* ─── Navigation maintenance ─── */
  function _navMaint(dir) {
    const panel = document.getElementById('panel-maintenance');
    if (!panel || panel.classList.contains('hidden')) return;
    const items = Array.from(panel.querySelectorAll(
      '.maint-item[data-module], .maint-reboot, #btn-maintenance-close'
    )).filter(el => el.offsetParent !== null);
    if (!items.length) return;
    // S'assurer que tous les items sont focusables
    items.forEach(el => { if (!el.getAttribute('tabindex')) el.setAttribute('tabindex','0'); });
    const ci = items.indexOf(document.activeElement);
    let ni;
    if (ci < 0) ni = dir > 0 ? 0 : items.length - 1;
    else ni = Math.max(0, Math.min(items.length - 1, ci + dir));
    items[ni].focus();
  }

  /* ─── Indicateur manette ─── */
  function updateIndicator(gp) {
    const ind = document.getElementById('gamepad-indicator');
    if (!ind) return;
    if (gp) { ind.style.display='block'; ind.textContent='● Manette détectée'; }
    else     { ind.style.display='none'; }
  }

  /* ─── Boucle principale ─── */
  let started = false;
  function startLoop() {
    if (started) return; started = true;
    setInterval(() => {
      const gp = getGP();
      updateIndicator(gp);
      if (!gp) {
        if (rewindHeld) {
          rewindHeld = false;
          document.getElementById('btn-rewind-musicbox')
            ?.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
        }
        return;
      }

      const now = Date.now();
      const m   = map();

      const up    = jp(gp,12) || ja(gp,1,-1);
      const down  = jp(gp,13) || ja(gp,1,1);
      const left  = jp(gp,14) || ja(gp,0,-1);
      const right = jp(gp,15) || ja(gp,0,1);
      const bConf = jp(gp,m.c);
      const bMute = jp(gp,m.mu);
      const bMaint= jp(gp,m.ma);
      const bAud  = jp(gp,m.au);
      const bRew  = held(gp,m.rw);

      /* Play Gate (▶ JOUER) */
      const gate = document.getElementById('screen-play-gate');
      if (gate && !gate.classList.contains('hidden')) {
        if (bConf || jp(gp,2)) document.getElementById('btn-play-gate')?.click();
        return;
      }

      /* Menu principal */
      const sg = document.getElementById('screen-game');
      if (!sg || sg.classList.contains('hidden')) {
        const btns = Array.from(document.querySelectorAll('.menu-item:not(.disabled)'))
          .filter(b => b.offsetParent !== null);
        const ci = btns.indexOf(document.activeElement);
        if ((up||left) && now-lastNav>NAV_MS) { lastNav=now; const ni=Math.max(0,(ci<0?0:ci)-1); btns[ni]?.focus(); }
        if ((down||right) && now-lastNav>NAV_MS) { lastNav=now; const ni=Math.min(btns.length-1,(ci<0?0:ci)+1); btns[ni]?.focus(); }
        if (bConf && document.activeElement?.classList.contains('menu-item')) document.activeElement.click();
        return;
      }

      /* Jeu actif */

      // Navigation : caméras OU maintenance selon contexte
      const _maintPanel = document.getElementById('panel-maintenance');
      const _maintOpen  = !!(_maintPanel && !_maintPanel.classList.contains('hidden'));
      if ((up||left) && now-lastNav>NAV_MS) {
        lastNav=now;
        if (_maintOpen) _navMaint(-1); else navCam(-1);
      }
      if ((down||right) && now-lastNav>NAV_MS) {
        lastNav=now;
        if (_maintOpen) _navMaint(1); else navCam(1);
      }

      // Maintenance toggle
      if (bMaint) {
        const panel = document.getElementById('panel-maintenance');
        if (panel && !panel.classList.contains('hidden')) {
          document.getElementById('btn-maintenance-close')?.click();
        } else {
          document.getElementById('btn-maintenance')?.click();
          // Focus le premier item dès l'ouverture
          setTimeout(() => {
            const p = document.getElementById('panel-maintenance');
            if (!p || p.classList.contains('hidden')) return;
            const first = p.querySelector('.maint-item[data-module], .maint-reboot, #btn-maintenance-close');
            if (first) { first.setAttribute('tabindex','0'); first.focus(); }
          }, 80);
        }
      }

      // Confirmer dans maintenance (redémarrer module focalisé)
      if (bConf) {
        const panel = document.getElementById('panel-maintenance');
        if (panel && !panel.classList.contains('hidden')) {
          const focused = document.activeElement;
          if (focused && panel.contains(focused)) focused.click();
        }
      }

      // Play Audio
      if (bAud) document.getElementById('btn-audio')?.click();

      // Mute appel en cours
      if (bMute) {
        const muteBtn = document.getElementById('btn-mute-call');
        if (muteBtn && !muteBtn.classList.contains('hidden')) muteBtn.click();
      }

      // Rembobinage boîte à musique (hold)
      const rb = document.getElementById('btn-rewind-musicbox');
      if (rb && rb.offsetParent !== null) {
        if (bRew && !rewindHeld) {
          rewindHeld = true;
          rb.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
        } else if (!bRew && rewindHeld) {
          rewindHeld = false;
          rb.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
        }
      } else if (rewindHeld) {
        rewindHeld = false;
      }

    }, 16);
  }

  window.addEventListener('gamepadconnected', startLoop);
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { if (getGP()) startLoop(); }, 200));
  setTimeout(startLoop, 600); // fallback

})();
