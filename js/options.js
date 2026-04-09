/* ═══════════════════════════════════════════
   OPTIONS.JS v2 — Chargé avant loader.js et menu.js
   - Application immédiate des réglages au chargement
   - Panneau complet : Affichage / Contrôles / Audio
   - Persistance localStorage
   - Pas d'erreur au chargement (aucune fonction appelée avant déclaration)
════════════════════════════════════════════ */

// ══════════════════════════════════════
// LECTURE / ÉCRITURE
// ══════════════════════════════════════
var Opts = (function() {
  var P = 'fnaf_opt_';
  function get(k, def) {
    try { var v = localStorage.getItem(P+k); return v !== null ? v : def; } catch(e) { return def; }
  }
  function set(k, v) { try { localStorage.setItem(P+k, v); } catch(e) {} }
  return {
    get: get, set: set,
    display:    function() { return get('displayMode', 'pc'); },
    control:    function() { return get('controlType', 'mouse'); },
    gpType:     function() { return get('gamepadType', 'xbox'); },
    volGeneral: function() { return parseFloat(get('vol-general', '80')) / 100; },
    volEffects: function() { return parseFloat(get('vol-effects', '80')) / 100; },
    volVoices:  function() { return parseFloat(get('vol-voices',  '80')) / 100; },
  };
})();

// ══════════════════════════════════════
// APPLICATION IMMÉDIATE AU CHARGEMENT
// ══════════════════════════════════════
(function applyOnLoad() {
  window._vol_general = Opts.volGeneral();
  window._vol_effects = Opts.volEffects();
  window._vol_voices  = Opts.volVoices();
  document.body.classList.remove('display-tv', 'display-pc', 'display-phone');
  document.body.classList.add('display-' + Opts.display());
})();

// ══════════════════════════════════════
// STYLES CSS INLINE
// ══════════════════════════════════════
var _S = {
  tab:  "background:transparent;border:none;border-bottom:2px solid transparent;color:#555;font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:2px;padding:12px 16px;cursor:pointer;white-space:nowrap;transition:color .15s,border-color .15s;display:inline-flex;align-items:center;gap:5px;",
  mode: "flex:1;min-width:80px;display:flex;flex-direction:column;align-items:center;padding:14px 8px;background:transparent;border:0.5px solid rgba(255,255,255,0.1);cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;color:#555;letter-spacing:1px;transition:all .15s;gap:6px;",
  ctrl: "font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;color:#555;background:transparent;border:0.5px solid rgba(255,255,255,0.1);padding:8px 14px;cursor:pointer;transition:color .15s,border-color .15s;",
  lbl:  "font-size:9px;color:#444;letter-spacing:4px;text-transform:uppercase;margin-bottom:6px;font-family:'Share Tech Mono',monospace;",
};

// ══════════════════════════════════════
// CONSTRUCTION DU PANNEAU
// ══════════════════════════════════════
function openOptionsModal() {
  // Toggle — si déjà ouvert, fermer
  var existing = document.getElementById('modal-options');
  if (existing) { existing.remove(); return; }

  var modal = document.createElement('div');
  modal.id = 'modal-options';
  modal.style.cssText = "position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;";

  var box = document.createElement('div');
  box.style.cssText = "background:#0a0a0a;border:0.5px solid rgba(255,255,255,0.12);width:min(92vw,500px);max-height:85vh;overflow-y:auto;display:flex;flex-direction:column;";

  // Header
  var header = document.createElement('div');
  header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-bottom:0.5px solid rgba(255,255,255,0.08);";
  header.innerHTML = "<div style=\"font-family:'Cinzel',serif;font-size:15px;color:#ddd;letter-spacing:5px;\">OPTIONS</div>";
  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = "background:transparent;border:none;color:#555;font-size:18px;cursor:pointer;padding:4px 8px;line-height:1;";
  closeBtn.textContent = '✕';
  closeBtn.onclick = function() { modal.remove(); };
  header.appendChild(closeBtn);
  box.appendChild(header);

  // Onglets
  var tabBar = document.createElement('div');
  tabBar.style.cssText = "display:flex;border-bottom:0.5px solid rgba(255,255,255,0.08);overflow-x:auto;";

  var tabs = [
    { id:'display',  label:'Affichage' },
    { id:'controls', label:'Contrôles' },
    { id:'audio',    label:'Audio'     },
  ];
  var panels = {};

  tabs.forEach(function(t) {
    var btn = document.createElement('button');
    btn.style.cssText = _S.tab;
    btn.textContent = t.label;
    btn.dataset.tab = t.id;
    btn.className = 'opts-tab';
    tabBar.appendChild(btn);

    var panel = document.createElement('div');
    panel.id = 'opts-' + t.id;
    panel.style.cssText = "display:none;flex-direction:column;gap:12px;padding:18px 22px;";
    panels[t.id] = panel;
    box.appendChild(panel);
  });
  box.insertBefore(tabBar, panels['display']);

  // ── Onglet Affichage ──
  var pDisp = panels['display'];
  var lDisp = document.createElement('div'); lDisp.style.cssText = _S.lbl; lDisp.textContent = 'MODE D\'AFFICHAGE';
  var modesWrap = document.createElement('div'); modesWrap.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;";
  [
    { id:'tv',    label:'Mode TV',    desc:'Texte agrandi', svg:'<svg width="26" height="22" viewBox="0 0 26 22" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1" y="1" width="24" height="15" rx="2"/><path d="M9 21h8M13 16v5" stroke-linecap="round"/></svg>' },
    { id:'pc',    label:'Mode PC',    desc:'Standard',      svg:'<svg width="26" height="22" viewBox="0 0 26 22" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="1" width="22" height="14" rx="2"/><path d="M8 21h10M13 15v6" stroke-linecap="round"/><rect x="9" y="18" width="8" height="3" rx="1"/></svg>' },
    { id:'phone', label:'Téléphone', desc:'Tactile',        svg:'<svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1" y="1" width="16" height="24" rx="3"/><circle cx="9" cy="22" r="1.2" fill="currentColor"/></svg>' },
  ].forEach(function(m) {
    var btn = document.createElement('button');
    btn.style.cssText = _S.mode; btn.dataset.mode = m.id; btn.className = 'opts-mode';
    btn.innerHTML = m.svg + '<div>' + m.label + '</div><div style="font-size:8px;color:#333;margin-top:2px;">' + m.desc + '</div>';
    modesWrap.appendChild(btn);
  });
  pDisp.appendChild(lDisp); pDisp.appendChild(modesWrap);

  // ── Onglet Contrôles ──
  var pCtrl = panels['controls'];
  var lCtrl = document.createElement('div'); lCtrl.style.cssText = _S.lbl; lCtrl.textContent = 'TYPE DE CONTRÔLE';
  var ctrlWrap = document.createElement('div'); ctrlWrap.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;";
  [['mouse','Clavier / Souris'],['gamepad','Manette'],['touch','Tactile']].forEach(function(c) {
    var btn = document.createElement('button');
    btn.style.cssText = _S.ctrl; btn.dataset.ctrl = c[0]; btn.className = 'opts-ctrl';
    btn.textContent = c[1]; ctrlWrap.appendChild(btn);
  });
  var gpSub = document.createElement('div'); gpSub.id = 'opts-gp-sub'; gpSub.style.cssText = "display:none;flex-direction:column;gap:8px;margin-top:4px;";
  var lGp = document.createElement('div'); lGp.style.cssText = _S.lbl; lGp.textContent = 'TYPE DE MANETTE';
  var gpWrap = document.createElement('div'); gpWrap.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;";
  [['switch','Nintendo Switch'],['xbox','Xbox'],['ps','PlayStation']].forEach(function(g) {
    var btn = document.createElement('button');
    btn.style.cssText = _S.ctrl; btn.dataset.gp = g[0]; btn.className = 'opts-gp';
    btn.textContent = g[1]; gpWrap.appendChild(btn);
  });
  var bindingsDiv = document.createElement('div'); bindingsDiv.id = 'opts-bindings';
  var noGpDiv = document.createElement('div'); noGpDiv.id = 'opts-no-gp';
  noGpDiv.style.cssText = "font-family:'Share Tech Mono',monospace;font-size:9px;color:#cc2020;letter-spacing:2px;display:none;";
  noGpDiv.textContent = '⚠ Aucune manette détectée';
  gpSub.appendChild(lGp); gpSub.appendChild(gpWrap); gpSub.appendChild(bindingsDiv); gpSub.appendChild(noGpDiv);
  pCtrl.appendChild(lCtrl); pCtrl.appendChild(ctrlWrap); pCtrl.appendChild(gpSub);

  // ── Onglet Audio ──
  var pAud = panels['audio'];
  var hint = document.createElement('div');
  hint.style.cssText = "font-family:'Share Tech Mono',monospace;font-size:9px;color:#444;letter-spacing:2px;padding:8px 12px;border:0.5px solid rgba(255,255,255,0.06);line-height:1.8;";
  hint.textContent = 'Certains indices sonores sont discrets — un volume suffisant est recommandé.';
  pAud.appendChild(hint);

  function addSlider(parent, id, label, testSrc) {
    var row = document.createElement('div');
    row.style.cssText = "display:flex;align-items:center;gap:12px;";
    var lbl = document.createElement('label');
    lbl.style.cssText = "font-family:'Share Tech Mono',monospace;font-size:10px;color:#666;letter-spacing:1px;flex:1;min-width:110px;";
    lbl.textContent = label;
    var sl = document.createElement('input');
    sl.type = 'range'; sl.id = id; sl.min = 0; sl.max = 100;
    sl.value = Math.round(parseFloat(Opts.get(id, '80')));
    sl.style.cssText = "flex:2;accent-color:#2a8a2a;";
    var valSpan = document.createElement('span');
    valSpan.id = id + '-val';
    valSpan.style.cssText = "font-family:'Share Tech Mono',monospace;font-size:10px;color:#aaa;min-width:28px;text-align:right;";
    valSpan.textContent = sl.value;
    sl.addEventListener('input', function() {
      valSpan.textContent = sl.value;
      Opts.set(id, sl.value);
      window._vol_general = Opts.volGeneral();
      window._vol_effects = Opts.volEffects();
      window._vol_voices  = Opts.volVoices();
      // Appliquer immédiatement aux audios en cours (menu, ambiance...)
      var gv = window._vol_general;
      document.querySelectorAll('audio').forEach(function(a) {
        if (!a.paused) a.volume = Math.min(1, gv);
      });
    });
    sl.addEventListener('change', function() {
      if (testSrc) {
        try { var a=new Audio(testSrc); a.volume=Math.min(1,parseInt(sl.value)/100); a.play().catch(function(){}); } catch(e) {}
      }
    });
    row.appendChild(lbl); row.appendChild(sl); row.appendChild(valSpan);
    parent.appendChild(row);
  }
  addSlider(pAud, 'vol-general', 'Volume général',  null);
  addSlider(pAud, 'vol-effects', 'Effets sonores',   'assets/audio/effect/test-sound.wav');
  addSlider(pAud, 'vol-voices',  'Voix / appels',    'assets/audio/effect/test-sound-2.wav');

  var resetBtn = document.createElement('button');
  resetBtn.style.cssText = "align-self:flex-start;font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:3px;color:#555;background:transparent;border:0.5px solid rgba(255,255,255,0.1);padding:8px 16px;cursor:pointer;margin-top:4px;";
  resetBtn.textContent = '↺ Réinitialiser';
  resetBtn.onclick = function() {
    ['vol-general','vol-effects','vol-voices'].forEach(function(id) {
      Opts.set(id, '80');
      var sl = pAud.querySelector('#'+id); if(sl) sl.value = 80;
      var vl = pAud.querySelector('#'+id+'-val'); if(vl) vl.textContent = 80;
    });
    window._vol_general = 0.8; window._vol_effects = 0.8; window._vol_voices = 0.8;
  };
  pAud.appendChild(resetBtn);

  modal.appendChild(box);
  document.body.appendChild(modal);

  // ── Activer le premier onglet ──
  activateTab('display');

  // ── Remplir les états actuels ──
  applyCurrentState();

  // ── Events ──
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

  tabBar.querySelectorAll('.opts-tab').forEach(function(btn) {
    btn.addEventListener('click', function() { activateTab(btn.dataset.tab); });
  });

  modal.querySelectorAll('.opts-mode').forEach(function(btn) {
    btn.addEventListener('click', function() {
      Opts.set('displayMode', btn.dataset.mode);
      document.body.classList.remove('display-tv','display-pc','display-phone');
      document.body.classList.add('display-' + btn.dataset.mode);
      highlightActive(modal.querySelectorAll('.opts-mode'), btn, 'mode');
    });
  });

  modal.querySelectorAll('.opts-ctrl').forEach(function(btn) {
    btn.addEventListener('click', function() {
      Opts.set('controlType', btn.dataset.ctrl);
      highlightActive(modal.querySelectorAll('.opts-ctrl'), btn, 'ctrl');
      gpSub.style.display = btn.dataset.ctrl === 'gamepad' ? 'flex' : 'none';
    });
  });

  modal.querySelectorAll('.opts-gp').forEach(function(btn) {
    btn.addEventListener('click', function() {
      Opts.set('gamepadType', btn.dataset.gp);
      highlightActive(modal.querySelectorAll('.opts-gp'), btn, 'ctrl');
      renderBindings(btn.dataset.gp);
    });
  });

  function activateTab(id) {
    tabs.forEach(function(t) {
      var tb = tabBar.querySelector('[data-tab="'+t.id+'"]');
      if (tb) {
        if (t.id === id) { tb.style.borderBottomColor='rgba(192,160,16,0.6)'; tb.style.color='#ddd'; }
        else             { tb.style.borderBottomColor='transparent'; tb.style.color='#555'; }
      }
      var p = panels[t.id];
      if (p) p.style.display = t.id === id ? 'flex' : 'none';
    });
  }

  function highlightActive(els, active, type) {
    els.forEach(function(el) {
      el.style.color = '#555'; el.style.borderColor = 'rgba(255,255,255,0.1)';
      if (type === 'mode') el.style.background = 'transparent';
    });
    active.style.color = '#c0a010'; active.style.borderColor = 'rgba(192,160,16,0.5)';
    if (type === 'mode') active.style.background = 'rgba(192,160,16,0.05)';
  }

  function renderBindings(gpType) {
    var BINDINGS = {
      ps:     [{a:'Naviguer',k:'Joystick/D-pad'},{a:'Valider/Démarrer',k:'✕'},{a:'Boîte à musique',k:'○ (maintenir)'},{a:'Mute appel',k:'□'},{a:'Maintenance',k:'△'},{a:'Play Audio',k:'L1'}],
      xbox:   [{a:'Naviguer',k:'Joystick/D-pad'},{a:'Valider/Démarrer',k:'A'},{a:'Boîte à musique',k:'B (maintenir)'},{a:'Mute appel',k:'X'},{a:'Maintenance',k:'Y'},{a:'Play Audio',k:'LB'}],
      switch: [{a:'Naviguer',k:'Joystick/D-pad'},{a:'Valider/Démarrer',k:'A'},{a:'Boîte à musique',k:'B (maintenir)'},{a:'Mute appel',k:'Y'},{a:'Maintenance',k:'X'},{a:'Play Audio',k:'L'}],
    };
    var bd = bindingsDiv; bd.innerHTML = '';
    (BINDINGS[gpType]||BINDINGS.xbox).forEach(function(b) {
      var row = document.createElement('div');
      row.style.cssText = "display:flex;justify-content:space-between;font-family:'Share Tech Mono',monospace;font-size:9px;padding:6px 0;border-bottom:0.5px solid rgba(255,255,255,0.04);";
      row.innerHTML = '<span style="color:#555;">'+b.a+'</span><span style="color:#c0a010;letter-spacing:2px;">'+b.k+'</span>';
      bd.appendChild(row);
    });
    var gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    noGpDiv.style.display = gps.length === 0 ? 'block' : 'none';
  }

  function applyCurrentState() {
    var mode = Opts.display();
    modal.querySelectorAll('.opts-mode').forEach(function(b) {
      if (b.dataset.mode===mode) { b.style.color='#c0a010'; b.style.borderColor='rgba(192,160,16,0.5)'; b.style.background='rgba(192,160,16,0.05)'; }
    });
    var ctrl = Opts.control();
    modal.querySelectorAll('.opts-ctrl').forEach(function(b) {
      if (b.dataset.ctrl===ctrl) { b.style.color='#c0a010'; b.style.borderColor='rgba(192,160,16,0.5)'; }
    });
    gpSub.style.display = ctrl==='gamepad' ? 'flex' : 'none';
    var gpT = Opts.gpType();
    modal.querySelectorAll('.opts-gp').forEach(function(b) {
      if (b.dataset.gp===gpT) { b.style.color='#c0a010'; b.style.borderColor='rgba(192,160,16,0.5)'; }
    });
    renderBindings(gpT);
  }
}

// Exposer
window.openOptionsModal = openOptionsModal;
window.Opts = Opts;
