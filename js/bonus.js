/* ═══════════════════════════════════════════
   BONUS.JS
════════════════════════════════════════════ */
(() => {

  // ── Musique bonus — lancer après interaction (autoplay policy) ──
  const audioBonus = document.getElementById('audio-bonus');
  function startBonusMusic() {
    if (!audioBonus || !audioBonus.paused) return;
    audioBonus.volume = window._vol_general !== undefined ? window._vol_general * 0.6 : 0.6;
    audioBonus.play().catch(() => {});
  }
  // Essayer immédiatement (fonctionne si on vient de cliquer sur Bonus)
  startBonusMusic();
  // Fallback sur premier clic/touch si autoplay bloqué
  document.addEventListener('click', startBonusMusic, { once: true });
  document.addEventListener('touchend', startBonusMusic, { once: true });

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
    setTimeout(() => { window.location.href = 'custom-night.html'; }, 300);
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
      { type:'duo',    label:'Développé par :',                   studios:['IMAGINe Studio','HwR Engine'], dur:6000 },
      { type:'single', label:'Musique par :',                     name:'lılyO',                             dur:4500, highlight:true },
      { type:'single', label:'Échantillons par :',                name:'Mixvibes',                          dur:4000 },
      { type:'single', label:'Effets sonores par :',              name:'The Sounds Resource', sub:'Website by Skyla Doragono', dur:5000 },
      { type:'single', label:'Contribution aux effets sonores :', name:'MilesTheCreator, IndigoPupper, Cooper', dur:5000 },
      { type:'single', label:'Le mec au téléphone :',             name:'H.D.N',               dur:4000 },
      { type:'single', label:'Propulsé par :',                    name:'Netlify',               dur:4000 },
      { special:'ia',           dur:6000 },
      { special:'inspiration',  dur:6000 },
      { special:'final',        dur:0 },
    ];

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:0 24px;pointer-events:none;';
    overlay.appendChild(wrap);

    let i2 = 0;

    function fi(el, dur) {
      dur = dur || 1000;
      el.style.opacity = '0'; el.style.transition = 'opacity '+dur+'ms ease';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ el.style.opacity='1'; }));
    }
    function clr(cb) {
      Array.from(wrap.children).forEach(ch=>{ ch.style.transition='opacity 1s ease'; ch.style.opacity='0'; });
      setTimeout(()=>{ wrap.innerHTML=''; if(cb)cb(); }, 1050);
    }
    function next() {
      if(i2>=SLIDES.length) return;
      const s=SLIDES[i2++];
      if(s.special){ clr(()=>showSp(s)); return; }
      if(s.type==='duo') clr(()=>showDuo(s));
      else clr(()=>showSin(s));
    }
    function showDuo(s) {
      const lbl=document.createElement('div'); lbl.className='credits-label'; lbl.textContent=s.label; wrap.appendChild(lbl); fi(lbl,800);
      const nm=document.createElement('div'); nm.className='credits-name'; nm.textContent=s.studios[0]; wrap.appendChild(nm); fi(nm,800);
      setTimeout(()=>{
        nm.style.transition='opacity 900ms ease'; nm.style.opacity='0';
        setTimeout(()=>{ nm.textContent=s.studios[1]; fi(nm,900); setTimeout(()=>clr(next),s.dur); },950);
      },s.dur);
    }
    function showSin(s) {
      if(s.label){ const lbl=document.createElement('div'); lbl.className='credits-label'; lbl.textContent=s.label; wrap.appendChild(lbl); fi(lbl); }
      const nm=document.createElement('div'); nm.className='credits-name'+(s.highlight?' highlight':''); nm.textContent=s.name; wrap.appendChild(nm); fi(nm);
      if(s.sub){ const sub=document.createElement('div'); sub.className='credits-sub'; sub.textContent=s.sub; wrap.appendChild(sub); fi(sub,1200); }
      if(s.dur>0) setTimeout(()=>clr(next),s.dur);
    }
    function showSp(s) {
      if(s.special==='ia'){
        const el=document.createElement('div'); el.className='credits-sub'; el.style.cssText='max-width:340px;line-height:2;color:#444;';
        el.innerHTML="Ce jeu a été développé avec l'aide de l'intelligence artificielle.<br>Les idées, la conception et la direction créative<br>restent entièrement humaines.";
        wrap.appendChild(el); fi(el); setTimeout(()=>clr(next),s.dur);
      } else if(s.special==='inspiration'){
        const el=document.createElement('div'); el.className='credits-sub'; el.style.cssText='max-width:340px;line-height:2;color:#333;';
        el.innerHTML="Ce jeu est inspiré de <span style='color:#555'>Five Nights at Freddy\'s</span><br>de Scott Cawthon.<br>Il ne s\'agit pas d\'une œuvre officielle.";
        wrap.appendChild(el); fi(el); setTimeout(()=>clr(next),s.dur);
      } else if(s.special==='final'){
        const fe=document.createElement('div'); fe.className='credits-final'; fe.textContent="Brad et ses amis reviendront."; wrap.appendChild(fe); fi(fe);
        setTimeout(()=>{
          const btn=document.createElement('button'); btn.className='credits-continue'; btn.style.pointerEvents='all'; btn.textContent='CLIQUEZ POUR CONTINUER';
          btn.onclick=function(){ overlay.style.display='none'; overlay.innerHTML=''; if(audioMerci){audioMerci.pause();audioMerci.currentTime=0;} if(audioBonus)audioBonus.play().catch(()=>{}); };
          wrap.appendChild(btn); fi(btn,600);
        },2000);
      }
    }
    next();
  });

})();
