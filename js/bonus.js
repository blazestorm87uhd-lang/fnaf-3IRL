/* ═══════════════════════════════════════════
   BONUS.JS
════════════════════════════════════════════ */
(() => {

  // ── Musique bonus ──
  const audioBonus = document.getElementById('audio-bonus');
  if (audioBonus) {
    audioBonus.volume = window._vol_general !== undefined ? window._vol_general * 0.6 : 0.6;
    audioBonus.play().catch(() => {});
  }

  // ── Retour au menu ──
  document.getElementById('bonus-back').addEventListener('click', () => {
    if (audioBonus) { audioBonus.pause(); }
    document.body.style.transition = 'opacity 0.3s';
    document.body.style.opacity = '0';
    setTimeout(() => { window.location.href = 'index.html'; }, 300);
  });

  // ── Navigation sections ──
  document.querySelectorAll('.bonus-nav-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bonus-nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.bonus-section').forEach(s => s.style.display = 'none');
      btn.classList.add('active');
      const sec = document.getElementById('section-' + btn.dataset.section);
      if (sec) sec.style.display = 'block';
    });
  });

  // ══════════════════════════════════════
  // CUSTOM NIGHT
  // ══════════════════════════════════════
  const DESCS = {
    1:  'Inactif',
    2:  'Très calme',
    3:  'Débutant',
    4:  'Facile',
    5:  'Niveau modéré',
    6:  'Intermédiaire',
    7:  'Difficile',
    8:  'Très difficile',
    9:  'Brutal',
    10: 'Impossible'
  };

  function levelColor(v) {
    if (v <= 3) return 'low';
    if (v <= 6) return 'medium';
    return 'high';
  }

  // Charger depuis localStorage
  function loadDiffs() {
    try {
      const saved = JSON.parse(localStorage.getItem('fnaf_custom_diffs') || '{}');
      return { brad: saved.brad || 5, frank: saved.frank || 5, mama: saved.mama || 5 };
    } catch(e) { return { brad:5, frank:5, mama:5 }; }
  }
  function saveDiffs(d) {
    try { localStorage.setItem('fnaf_custom_diffs', JSON.stringify(d)); } catch(e) {}
  }

  const diffs = loadDiffs();

  ['brad','frank','mama'].forEach(robot => {
    const slider = document.getElementById('diff-' + robot);
    const valEl  = document.getElementById('diff-' + robot + '-val');
    const descEl = document.getElementById('diff-' + robot + '-desc');

    if (!slider) return;
    slider.value = diffs[robot];

    function update() {
      const v = parseInt(slider.value);
      diffs[robot] = v;
      saveDiffs(diffs);
      if (valEl) {
        valEl.textContent = v;
        valEl.className = 'robot-level-val ' + levelColor(v);
      }
      if (descEl) descEl.textContent = DESCS[v] || '';
    }
    update();
    slider.addEventListener('input', update);
  });

  // Reset
  document.getElementById('custom-reset')?.addEventListener('click', () => {
    ['brad','frank','mama'].forEach(r => {
      const sl = document.getElementById('diff-' + r);
      if (sl) { sl.value = 5; sl.dispatchEvent(new Event('input')); }
    });
  });

  // Lancer
  document.getElementById('custom-start')?.addEventListener('click', () => {
    const d = loadDiffs();
    try { localStorage.setItem('fnaf_custom_active', JSON.stringify(d)); } catch(e) {}
    if (audioBonus) audioBonus.pause();
    document.body.style.transition = 'opacity 0.3s';
    document.body.style.opacity = '0';
    setTimeout(() => { window.location.href = 'game-nightmare.html'; }, 300);
  });

  // ══════════════════════════════════════
  // REPLAY GÉNÉRIQUE
  // ══════════════════════════════════════
  document.getElementById('replay-credits')?.addEventListener('click', () => {
    if (audioBonus) audioBonus.pause();
    const overlay = document.getElementById('credits-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const audioMerci = document.getElementById('audio-merci');
    if (audioMerci) { audioMerci.volume = 0.75; audioMerci.play().catch(() => {}); }

    // Bouton fermer
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;background:transparent;border:0.5px solid rgba(255,255,255,0.15);color:#555;font-family:\'Share Tech Mono\',monospace;font-size:10px;letter-spacing:3px;padding:8px 16px;cursor:pointer;';
    closeBtn.textContent = '✕ FERMER';
    closeBtn.onclick = () => {
      overlay.style.display = 'none';
      overlay.innerHTML = '';
      if (audioMerci) { audioMerci.pause(); audioMerci.currentTime = 0; }
      if (audioBonus) audioBonus.play().catch(() => {});
    };
    overlay.appendChild(closeBtn);

    const SLIDES = [
      { label:'Développé par :', name:'IMAGINe Studio', dur:5500 },
      { label:'Développé par :', name:'HwR Engine', dur:5500 },
      { label:'Musique par :', name:'lılyO', dur:4000, highlight:true },
      { label:'Effets sonores par :', name:'The Sounds Resource', sub:'Website by Skyla Doragono', dur:4000 },
      { label:'Contribution aux effets sonores :', name:'MilesTheCreator, IndigoPupper, Cooper', dur:5500 },
      { label:'Le mec au téléphone :', name:'H.D.N', dur:3000 },
      { label:'Propulsé par :', name:'Netlify', dur:2000 },
      { label:'Propulsé par :', name:'Mixvibes', dur:2000 },
      { special:'ia', dur:5000 },
      { special:'inspiration', dur:5000 },
      { special:'final', dur:0 },
    ];

    let i = 0, cur = null;
    function next() {
      if (i >= SLIDES.length) return;
      const s = SLIDES[i++];
      if (cur) { cur.style.opacity='0'; setTimeout(()=>{ cur?.remove(); cur=null; show(s); },1300); }
      else show(s);
    }
    function show(s) {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;text-align:center;font-family:\'Share Tech Mono\',monospace;display:flex;flex-direction:column;gap:10px;opacity:0;transition:opacity 1.2s ease;padding:0 24px;';
      if (s.special==='ia') {
        el.innerHTML = '<div style="font-size:clamp(10px,1.5vw,13px);color:#444;letter-spacing:2px;line-height:2;max-width:340px;">Ce jeu a été développé avec l\'aide de l\'intelligence artificielle.<br>Les idées, la conception et la direction créative<br>restent entièrement humaines.</div>';
      } else if (s.special==='inspiration') {
        el.innerHTML = '<div style="font-size:clamp(10px,1.5vw,13px);color:#333;letter-spacing:2px;line-height:2;max-width:340px;">Ce jeu est inspiré de <span style="color:#555">Five Nights at Freddy\'s</span><br>de Scott Cawthon.<br>Il ne s\'agit pas d\'une œuvre officielle.</div>';
      } else if (s.special==='final') {
        el.innerHTML = '<div style="font-family:\'Cinzel\',serif;font-size:clamp(18px,3vw,28px);color:#cc2020;letter-spacing:4px;text-shadow:0 0 20px rgba(200,30,30,0.4);">Brad et ses amis reviendront.</div>';
        overlay.appendChild(el); cur=el; setTimeout(()=>el.style.opacity='1',50); return;
      } else {
        el.innerHTML = `
          ${s.label?`<div style="font-size:clamp(9px,1.2vw,11px);color:#444;letter-spacing:4px;">${s.label}</div>`:''}
          <div style="font-family:'Cinzel',serif;font-size:clamp(16px,2.5vw,24px);color:${s.highlight?'#c0a010':'#aaa'};letter-spacing:3px;">${s.name}</div>
          ${s.sub?`<div style="font-size:clamp(9px,1.2vw,11px);color:#333;letter-spacing:2px;">${s.sub}</div>`:''}
        `;
      }
      overlay.appendChild(el); cur=el;
      setTimeout(()=>el.style.opacity='1',50);
      if (s.dur>0) setTimeout(next, s.dur);
    }
    next();
  });

})();
