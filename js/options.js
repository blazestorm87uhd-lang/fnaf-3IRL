/* ═══════════════════════════════════════════
   OPTIONS.JS — Chargé avant loader.js et menu.js
   Les options sont appliquées IMMÉDIATEMENT au chargement
   sans avoir besoin d'ouvrir le panneau.
   Persistance via localStorage.
════════════════════════════════════════════ */

// ══════════════════════════════════════
// LECTURE / ÉCRITURE
// ══════════════════════════════════════
const Opts = (() => {
  const PREFIX = 'fnaf_opt_';
  function get(k, def) { try { const v = localStorage.getItem(PREFIX+k); return v !== null ? v : def; } catch(e) { return def; } }
  function set(k, v)   { try { localStorage.setItem(PREFIX+k, v); } catch(e) {} }

  return {
    get, set,
    display:    () => get('displayMode', 'pc'),
    control:    () => get('controlType', 'mouse'),
    gpType:     () => get('gamepadType', 'xbox'),
    volGeneral: () => parseFloat(get('vol-general', '80')) / 100,
    volEffects: () => parseFloat(get('vol-effects', '80')) / 100,
    volVoices:  () => parseFloat(get('vol-voices',  '80')) / 100,
  };
})();

// ══════════════════════════════════════
// APPLICATION IMMÉDIATE AU CHARGEMENT
// ══════════════════════════════════════
(function applyOnLoad() {
  // Volumes dans window pour game*.js
  window._vol_general = Opts.volGeneral();
  window._vol_effects = Opts.volEffects();
  window._vol_voices  = Opts.volVoices();

  // Mode d'affichage
  const mode = Opts.display();
  document.body.classList.remove('display-tv', 'display-pc', 'display-phone');
  document.body.classList.add('display-' + mode);
})();

// ══════════════════════════════════════
// CONSTRUCTION DU PANNEAU OPTIONS
// ══════════════════════════════════════
function openOptionsModal() {
  // Fermer si déjà ouvert
  const existing = document.getElementById('modal-options');
  if (existing) { existing.remove(); return; }

  const modal = document.createElement('div');
  modal.id = 'modal-options';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9500;
    background:rgba(0,0,0,0.9);
    display:flex;align-items:center;justify-content:center;
    font-family:'Share Tech Mono',monospace;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background:#0a0a0a;border:0.5px solid rgba(255,255,255,0.12);
    width:min(92vw,520px);max-height:85vh;overflow-y:auto;
    display:flex;flex-direction:column;
  `;

  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-bottom:0.5px solid rgba(255,255,255,0.08);">
      <div style="font-family:'Cinzel',serif;font-size:15px;color:#ddd;letter-spacing:5px;">OPTIONS</div>
      <button id="opts-close" style="background:transparent;border:none;color:#555;font-size:18px;cursor:pointer;padding:4px 8px;">✕</button>
    </div>

    <!-- ONGLETS -->
    <div style="display:flex;border-bottom:0.5px solid rgba(255,255,255,0.08);overflow-x:auto;">
      <button class="opts-tab active" data-tab="display" style="${TAB_STYLE}border-bottom:2px solid rgba(192,160,16,0.6);color:#ddd;">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-right:5px;vertical-align:middle"><rect x="1" y="1" width="11" height="8" rx="1.2"/><path d="M4 12h5M6.5 9v3" stroke-linecap="round"/></svg>
        Affichage
      </button>
      <button class="opts-tab" data-tab="controls" style="${TAB_STYLE}">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-right:5px;vertical-align:middle"><rect x="1" y="3" width="11" height="7" rx="3"/><line x1="3.5" y1="6.5" x2="3.5" y2="8.5"/><line x1="2.5" y1="7.5" x2="4.5" y2="7.5"/><circle cx="9.5" cy="6" r=".8" fill="currentColor"/><circle cx="9.5" cy="8" r=".8" fill="currentColor"/></svg>
        Contrôles
      </button>
      <button class="opts-tab" data-tab="audio" style="${TAB_STYLE}">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-right:5px;vertical-align:middle"><path d="M2 4.5h2l3-2.5v9l-3-2.5H2v-4z"/><path d="M9 4c1 .7 1 4.3 0 5" stroke-linecap="round"/></svg>
        Audio
      </button>
    </div>

    <!-- AFFICHAGE -->
    <div class="opts-panel" id="opts-display" style="display:flex;flex-direction:column;gap:10px;padding:18px 22px;">
      <div style="font-size:9px;color:#444;letter-spacing:4px;margin-bottom:4px;">MODE D'AFFICHAGE</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="opts-mode" data-mode="tv" style="${MODE_STYLE}">
          <svg width="26" height="22" viewBox="0 0 26 22" fill="none" stroke="currentColor" stroke-width="1.3" style="margin-bottom:4px"><rect x="1" y="1" width="24" height="15" rx="2"/><path d="M9 21h8M13 16v5" stroke-linecap="round"/></svg>
          <div>Mode TV</div><div style="font-size:8px;color:#333;margin-top:2px;">Texte agrandi</div>
        </button>
        <button class="opts-mode" data-mode="pc" style="${MODE_STYLE}">
          <svg width="26" height="22" viewBox="0 0 26 22" fill="none" stroke="currentColor" stroke-width="1.3" style="margin-bottom:4px"><rect x="2" y="1" width="22" height="14" rx="2"/><path d="M8 21h10M13 15v6" stroke-linecap="round"/><rect x="9" y="18" width="8" height="3" rx="1"/></svg>
          <div>Mode PC</div><div style="font-size:8px;color:#333;margin-top:2px;">Affichage standard</div>
        </button>
        <button class="opts-mode" data-mode="phone" style="${MODE_STYLE}">
          <svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="currentColor" stroke-width="1.3" style="margin-bottom:4px"><rect x="1" y="1" width="16" height="24" rx="3"/><circle cx="9" cy="22" r="1.2" fill="currentColor"/></svg>
          <div>Téléphone</div><div style="font-size:8px;color:#333;margin-top:2px;">Interface tactile</div>
        </button>
      </div>
    </div>

    <!-- CONTRÔLES -->
    <div class="opts-panel" id="opts-controls" style="display:none;flex-direction:column;gap:10px;padding:18px 22px;">
      <div style="font-size:9px;color:#444;letter-spacing:4px;margin-bottom:4px;">TYPE DE CONTRÔLE</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="opts-ctrl" data-ctrl="mouse" style="${CTRL_STYLE}">Clavier / Souris</button>
        <button class="opts-ctrl" data-ctrl="gamepad" style="${CTRL_STYLE}">Manette</button>
        <button class="opts-ctrl" data-ctrl="touch" style="${CTRL_STYLE}">Tactile</button>
      </div>
      <div id="opts-gp-sub" style="display:none;flex-direction:column;gap:8px;margin-top:4px;">
        <div style="font-size:9px;color:#444;letter-spacing:4px;">TYPE DE MANETTE</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="opts-gp" data-gp="switch" style="${CTRL_STYLE}">Nintendo Switch</button>
          <button class="opts-gp" data-gp="xbox"   style="${CTRL_STYLE}">Xbox</button>
          <button class="opts-gp" data-gp="ps"     style="${CTRL_STYLE}">PlayStation</button>
        </div>
        <div id="opts-bindings" style="display:flex;flex-direction:column;gap:5px;margin-top:4px;"></div>
        <div id="opts-no-gp" style="display:none;font-size:9px;color:#cc2020;letter-spacing:2px;">⚠ Aucune manette détectée</div>
      </div>
    </div>

    <!-- AUDIO -->
    <div class="opts-panel" id="opts-audio" style="display:none;flex-direction:column;gap:12px;padding:18px 22px;">
      <div style="font-size:9px;color:#444;letter-spacing:3px;padding:8px 12px;border:0.5px solid rgba(255,255,255,0.06);">
        Certains indices sonores sont discrets — un volume suffisant est recommandé.
      </div>
      ${makeSlider('vol-general', 'Volume général')}
      ${makeSlider('vol-effects', 'Effets sonores', 'assets/audio/effect/test-sound.wav')}
      ${makeSlider('vol-voices',  'Voix / appels',  'assets/audio/effect/test-sound-2.wav')}
      <button id="opts-reset-vol" style="align-self:flex-start;font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:3px;color:#555;background:transparent;border:0.5px solid rgba(255,255,255,0.1);padding:8px 16px;cursor:pointer;margin-top:4px;">↺ Réinitialiser les volumes</button>
    </div>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  // ── Remplir les états actuels ──
  _loadCurrentState(modal);
  _bindEvents(modal);

  // Fermer sur clic fond
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  function makeSlider(id, label, testSrc) { return ''; } // inline dans le HTML
}

// Helpers CSS inline
const TAB_STYLE = "background:transparent;border:none;border-bottom:2px solid transparent;color:#555;font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:2px;padding:12px 16px;cursor:pointer;white-space:nowrap;transition:color .15s;";
const MODE_STYLE = "flex:1;min-width:80px;display:flex;flex-direction:column;align-items:center;padding:14px 8px;background:transparent;border:0.5px solid rgba(255,255,255,0.1);cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;color:#555;letter-spacing:1px;transition:all .15s;";
const CTRL_STYLE = "font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;color:#555;background:transparent;border:0.5px solid rgba(255,255,255,0.1);padding:8px 14px;cursor:pointer;transition:color .15s,border-color .15s;";

// ── Charger l'état actuel dans l'UI ──
function _loadCurrentState(modal) {
  const mode  = Opts.display();
  const ctrl  = Opts.control();
  const gpT   = Opts.gpType();
  const vg    = Math.round(Opts.volGeneral() * 100);
  const ve    = Math.round(Opts.volEffects() * 100);
  const vv    = Math.round(Opts.volVoices()  * 100);

  // Affichage
  modal.querySelectorAll('.opts-mode').forEach(b => {
    const active = b.dataset.mode === mode;
    b.style.color = active ? '#c0a010' : '#555';
    b.style.borderColor = active ? 'rgba(192,160,16,0.5)' : 'rgba(255,255,255,0.1)';
    b.style.background = active ? 'rgba(192,160,16,0.05)' : 'transparent';
  });

  // Contrôles
  modal.querySelectorAll('.opts-ctrl').forEach(b => {
    const active = b.dataset.ctrl === ctrl;
    b.style.color = active ? '#c0a010' : '#555';
    b.style.borderColor = active ? 'rgba(192,160,16,0.5)' : 'rgba(255,255,255,0.1)';
  });
  const gpSub = modal.querySelector('#opts-gp-sub');
  if (gpSub) gpSub.style.display = ctrl === 'gamepad' ? 'flex' : 'none';

  // Type manette
  modal.querySelectorAll('.opts-gp').forEach(b => {
    const active = b.dataset.gp === gpT;
    b.style.color = active ? '#c0a010' : '#555';
    b.style.borderColor = active ? 'rgba(192,160,16,0.5)' : 'rgba(255,255,255,0.1)';
  });
  _renderBindings(modal, gpT);

  // Construire les sliders dynamiquement
  const audioPanel = modal.querySelector('#opts-audio');
  if (audioPanel) {
    audioPanel.innerHTML = `
      <div style="font-size:9px;color:#444;letter-spacing:3px;padding:8px 12px;border:0.5px solid rgba(255,255,255,0.06);">
        Certains indices sonores sont discrets — un volume suffisant est recommandé.
      </div>
      ${_sliderHtml('vol-general','Volume général',vg,null)}
      ${_sliderHtml('vol-effects','Effets sonores',ve,'assets/audio/effect/test-sound.wav')}
      ${_sliderHtml('vol-voices','Voix / appels',vv,'assets/audio/effect/test-sound-2.wav')}
      <button id="opts-reset-vol" style="align-self:flex-start;font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:3px;color:#555;background:transparent;border:0.5px solid rgba(255,255,255,0.1);padding:8px 16px;cursor:pointer;margin-top:4px;">↺ Réinitialiser</button>
    `;
    // Rebind sliders après reconstruction
    _bindSliders(modal);
  }
}

function _sliderHtml(id, label, val, testSrc) {
  return `
    <div style="display:flex;align-items:center;gap:12px;font-family:'Share Tech Mono',monospace;font-size:10px;color:#666;letter-spacing:1px;">
      <label style="flex:1;min-width:110px;">${label}</label>
      <input type="range" id="${id}" data-test="${testSrc||''}" min="0" max="100" value="${val}" style="flex:2;">
      <span id="${id}-val" style="min-width:28px;text-align:right;color:#aaa;">${val}</span>
    </div>`;
}

function _renderBindings(modal, gpType) {
  const BINDINGS = {
    ps:     [{a:'Naviguer',k:'Joystick/D-pad'},{a:'Valider/Démarrer',k:'✕'},{a:'Boîte à musique',k:'○ (maintenir)'},{a:'Mute appel',k:'□'},{a:'Maintenance',k:'△'},{a:'Play Audio',k:'L1'}],
    xbox:   [{a:'Naviguer',k:'Joystick/D-pad'},{a:'Valider/Démarrer',k:'A'},{a:'Boîte à musique',k:'B (maintenir)'},{a:'Mute appel',k:'X'},{a:'Maintenance',k:'Y'},{a:'Play Audio',k:'LB'}],
    switch: [{a:'Naviguer',k:'Joystick/D-pad'},{a:'Valider/Démarrer',k:'A'},{a:'Boîte à musique',k:'B (maintenir)'},{a:'Mute appel',k:'Y'},{a:'Maintenance',k:'X'},{a:'Play Audio',k:'L'}],
  };
  const cont = modal.querySelector('#opts-bindings'); if(!cont) return;
  const binds = BINDINGS[gpType] || BINDINGS.xbox;
  cont.innerHTML = binds.map(b => `
    <div style="display:flex;justify-content:space-between;font-family:'Share Tech Mono',monospace;font-size:9px;padding:6px 0;border-bottom:0.5px solid rgba(255,255,255,0.04);">
      <span style="color:#555;">${b.a}</span>
      <span style="color:#c0a010;letter-spacing:2px;">${b.k}</span>
    </div>`).join('');

  // Détecter manette
  const noGp = modal.querySelector('#opts-no-gp');
  if(noGp){
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    noGp.style.display = gps.length === 0 ? 'block' : 'none';
  }
}

// ── Bind tous les événements ──
function _bindEvents(modal) {
  // Fermer
  modal.querySelector('#opts-close').onclick = () => modal.remove();

  // Onglets
  modal.querySelectorAll('.opts-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modal.querySelectorAll('.opts-tab').forEach(t => {
        t.style.borderBottomColor = 'transparent'; t.style.color = '#555';
      });
      modal.querySelectorAll('.opts-panel').forEach(p => p.style.display = 'none');
      tab.style.borderBottomColor = 'rgba(192,160,16,0.6)'; tab.style.color = '#ddd';
      const panel = modal.querySelector('#opts-' + tab.dataset.tab);
      if (panel) { panel.style.display = 'flex'; _bindSliders(modal); }
    });
  });

  // Modes affichage
  modal.querySelectorAll('.opts-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.opts-mode').forEach(b => {
        b.style.color='#555'; b.style.borderColor='rgba(255,255,255,0.1)'; b.style.background='transparent';
      });
      btn.style.color='#c0a010'; btn.style.borderColor='rgba(192,160,16,0.5)'; btn.style.background='rgba(192,160,16,0.05)';
      const mode = btn.dataset.mode;
      Opts.set('displayMode', mode);
      document.body.classList.remove('display-tv','display-pc','display-phone');
      document.body.classList.add('display-' + mode);
    });
  });

  // Types contrôle
  modal.querySelectorAll('.opts-ctrl').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.opts-ctrl').forEach(b => {b.style.color='#555';b.style.borderColor='rgba(255,255,255,0.1)';});
      btn.style.color='#c0a010'; btn.style.borderColor='rgba(192,160,16,0.5)';
      Opts.set('controlType', btn.dataset.ctrl);
      const sub = modal.querySelector('#opts-gp-sub');
      if(sub) sub.style.display = btn.dataset.ctrl==='gamepad'?'flex':'none';
    });
  });

  // Types manette
  modal.querySelectorAll('.opts-gp').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.opts-gp').forEach(b=>{b.style.color='#555';b.style.borderColor='rgba(255,255,255,0.1)';});
      btn.style.color='#c0a010'; btn.style.borderColor='rgba(192,160,16,0.5)';
      Opts.set('gamepadType', btn.dataset.gp);
      _renderBindings(modal, btn.dataset.gp);
    });
  });

  _bindSliders(modal);
}

function _bindSliders(modal) {
  ['vol-general','vol-effects','vol-voices'].forEach(id => {
    const sl = modal.querySelector('#'+id); if(!sl) return;
    const lbl = modal.querySelector('#'+id+'-val');
    sl.oninput = () => {
      if(lbl) lbl.textContent = sl.value;
      Opts.set(id, sl.value);
      _applyVolumesNow();
    };
    sl.onchange = () => {
      const testSrc = sl.dataset.test;
      if(testSrc){
        try{const a=new Audio(testSrc);a.volume=Math.min(1,parseInt(sl.value)/100);a.play().catch(()=>{});}catch(e){}
      }
    };
  });

  const reset = modal.querySelector('#opts-reset-vol');
  if(reset) reset.onclick = () => {
    ['vol-general','vol-effects','vol-voices'].forEach(id=>{
      Opts.set(id,'80');
      const sl=modal.querySelector('#'+id); if(sl) sl.value=80;
      const lbl=modal.querySelector('#'+id+'-val'); if(lbl) lbl.textContent=80;
    });
    _applyVolumesNow();
  };
}

function _applyVolumesNow() {
  window._vol_general = Opts.volGeneral();
  window._vol_effects = Opts.volEffects();
  window._vol_voices  = Opts.volVoices();
  // Appliquer aux audios actifs sur la page
  document.querySelectorAll('audio').forEach(a => {
    if(!a.paused) a.volume = Math.min(1, window._vol_general);
  });
}

// Exposer globalement
window.openOptionsModal = openOptionsModal;
window.Opts = Opts;
