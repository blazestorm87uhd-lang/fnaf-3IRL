/* GAMEPAD.JS v2 */
(() => {
  const prevBtns = {}, prevAxes = {};
  let lastNavTime = 0, rewindHeld = false;
  const NAV_DEBOUNCE = 220;

  function getGP() {
    try {
      const all = navigator.getGamepads();
      for (let i = 0; i < all.length; i++) if (all[i] && all[i].connected) return all[i];
    } catch(e) {}
    return null;
  }

  function justPressed(gp, idx) {
    const k = 'b'+idx, now = !!(gp.buttons[idx] && gp.buttons[idx].pressed), was = prevBtns[k]||false;
    prevBtns[k] = now; return now && !was;
  }

  function justAxis(gp, axis, dir) {
    const k='a'+axis+'_'+dir, v=gp.axes[axis]||0, now=dir>0?v>0.5:v<-0.5, was=prevAxes[k]||false;
    prevAxes[k]=now; return now && !was;
  }

  function mapping() {
    try {
      const t = localStorage.getItem('fnaf_opt_gamepadType') || 'xbox';
      // mute = PS:Carré(3), Switch:Y(3), Xbox:X(2)
      if (t==='ps')     return {confirm:0,rewind:1,maint:3,audio:4,mute:2};  // □=2, △=3
      if (t==='switch') return {confirm:0,rewind:1,maint:2,audio:4,mute:3};  // Y=3, X=2
      return                   {confirm:0,rewind:1,maint:3,audio:4,mute:2};  // X=2, Y=3
    } catch(e) { return {confirm:0,rewind:1,maint:3,audio:4,mute:2}; }
  }

  function navigateCam(dir) {
    const panel = document.getElementById('panel-maintenance');
    if (panel && !panel.classList.contains('hidden')) {
      const items = Array.from(panel.querySelectorAll('.maint-item, .maint-reboot, #btn-maintenance-close'));
      const ci = items.indexOf(document.activeElement);
      const ni = Math.max(0, Math.min(items.length-1, (ci<0?0:ci)+dir));
      items[ni]?.focus(); return;
    }
    const els = Array.from(document.querySelectorAll('.map-room[data-room]')).filter(e=>e.offsetParent!==null);
    const ci = els.findIndex(e=>e.classList.contains('active'));
    const ni = Math.max(0, Math.min(els.length-1, (ci<0?0:ci)+dir));
    els[ni]?.click();
  }

  function updateIndicator(gp) {
    const ind = document.getElementById('gamepad-indicator');
    if (!ind) return;
    if (gp) { ind.style.display='block'; ind.textContent='● Manette détectée'; }
    else ind.style.display='none';
  }

  let loopStarted = false;
  function startLoop() {
    if (loopStarted) return; loopStarted = true;
    setInterval(() => {
      const gp = getGP();
      updateIndicator(gp);
      if (!gp) { if(rewindHeld){rewindHeld=false;document.getElementById('btn-rewind-musicbox')?.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));} return; }

      const now = Date.now(), m = mapping();
      const up    = justPressed(gp,12)||justAxis(gp,1,-1);
      const down  = justPressed(gp,13)||justAxis(gp,1,1);
      const left  = justPressed(gp,14)||justAxis(gp,0,-1);
      const right = justPressed(gp,15)||justAxis(gp,0,1);
      const bConf = justPressed(gp,m.confirm);
      const bX    = justPressed(gp,2); // PS X = btn2
      const bMaint= justPressed(gp,m.maint);
      const bAudio= justPressed(gp,m.audio);
      const bRew  = !!(gp.buttons[m.rewind]?.pressed);

      // Play gate
      const gate = document.getElementById('screen-play-gate');
      if (gate && !gate.classList.contains('hidden')) {
        if (bConf||bX) document.getElementById('btn-play-gate')?.click();
        return;
      }

      // Menu principal (si jeu pas affiché)
      const sg = document.getElementById('screen-game');
      if (!sg || sg.classList.contains('hidden')) {
        // Options ouvertes ?
        const opt = document.getElementById('modal-options');
        if (opt && !opt.classList.contains('hidden')) {
          const focusables = Array.from(opt.querySelectorAll('.opt-tab,.opt-mode,.opt-ctrl,.opt-gp,input[type=range],.opt-reset-btn,#options-close')).filter(e=>e.offsetParent!==null);
          const ci = focusables.indexOf(document.activeElement);
          const nav = (up||left)?-1:(down||right)?1:0;
          if (nav) { const ni=Math.max(0,Math.min(focusables.length-1,(ci<0?0:ci)+nav)); focusables[ni]?.focus(); }
          // Slider gauche/droite
          const foc = document.activeElement;
          if (foc?.type==='range') {
            const step=5;
            if (left){foc.value=Math.max(0,parseInt(foc.value)-step);foc.dispatchEvent(new Event('input'));}
            if (right){foc.value=Math.min(100,parseInt(foc.value)+step);foc.dispatchEvent(new Event('change'));}
          }
          if (bConf||bX) document.activeElement?.click();
          if (justPressed(gp,1)) document.getElementById('options-close')?.click(); // B/Rond = retour
          return;
        }
        // Navigation menu
        const btns = Array.from(document.querySelectorAll('.menu-item:not(.disabled)')).filter(b=>b.offsetParent!==null);
        const ci = btns.indexOf(document.activeElement);
        if ((up||left)&&now-lastNavTime>NAV_DEBOUNCE){lastNavTime=now;const ni=Math.max(0,(ci<0?0:ci)-1);btns[ni]?.focus();}
        if ((down||right)&&now-lastNavTime>NAV_DEBOUNCE){lastNavTime=now;const ni=Math.min(btns.length-1,(ci<0?0:ci)+1);btns[ni]?.focus();}
        if ((bConf||bX)&&document.activeElement?.classList.contains('menu-item')) document.activeElement.click();
        return;
      }

      // En jeu
      if ((up||left)&&now-lastNavTime>NAV_DEBOUNCE){lastNavTime=now;navigateCam(-1);}
      if ((down||right)&&now-lastNavTime>NAV_DEBOUNCE){lastNavTime=now;navigateCam(1);}
      if (bMaint) {
        const p=document.getElementById('panel-maintenance');
        if(p&&!p.classList.contains('hidden')) document.getElementById('btn-maintenance-close')?.click();
        else { document.getElementById('btn-maintenance')?.click(); }
      }
      // Navigation dans le panneau maintenance
      const maintPanel = document.getElementById('panel-maintenance');
      if (maintPanel && !maintPanel.classList.contains('hidden')) {
        const items = Array.from(maintPanel.querySelectorAll('.maint-item, .maint-reboot, #btn-maintenance-close'))
          .filter(el => el.offsetParent !== null);
        const ci = items.indexOf(document.activeElement);
        if ((up||left) && now-lastNavTime>NAV_DEBOUNCE) {
          lastNavTime=now;
          const ni = Math.max(0,(ci<0?0:ci)-1);
          items[ni]?.focus();
        }
        if ((down||right) && now-lastNavTime>NAV_DEBOUNCE) {
          lastNavTime=now;
          const ni = Math.min(items.length-1,(ci<0?0:ci)+1);
          items[ni]?.focus();
        }
        // Confirmer = cliquer sur l'item focalisé
        if ((bConf||bX) && document.activeElement && items.includes(document.activeElement)) {
          document.activeElement.click();
        }
        // Si maintPanel ouvert, ne pas naviguer les caméras
        return;
      }
      if (bAudio) document.getElementById('btn-audio')?.click();

      // Mute appel en cours (PS=□, Switch=Y, Xbox=X)
      const bMute = justPressed(gp, m.mute);
      if (bMute) {
        const muteBtn = document.getElementById('btn-mute-call');
        if (muteBtn && !muteBtn.classList.contains('hidden')) muteBtn.click();
      }
      // Rembobinage hold
      const rb=document.getElementById('btn-rewind-musicbox');
      if(rb&&rb.offsetParent!==null){
        if(bRew&&!rewindHeld){rewindHeld=true;rb.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));}
        else if(!bRew&&rewindHeld){rewindHeld=false;rb.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));}
      } else if(rewindHeld){rewindHeld=false;}
      if(bConf||bX){const p=document.getElementById('panel-maintenance');if(p&&!p.classList.contains('hidden')&&document.activeElement)document.activeElement.click();}
    }, 16);
  }

  window.addEventListener('gamepadconnected', startLoop);
  document.addEventListener('DOMContentLoaded', ()=>setTimeout(()=>{if(getGP())startLoop();},300));
  setTimeout(startLoop, 800); // fallback
})();
