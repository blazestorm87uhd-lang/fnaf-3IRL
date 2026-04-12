/* ═══════════════════════════════════════════
   BONUS.JS
════════════════════════════════════════════ */
(() => {

  // ── Musique bonus ──
  const audioBonus = document.getElementById('audio-bonus');

  function startBonusMusic() {
    if (!audioBonus || !audioBonus.paused) return;
    // Ne pas démarrer si le jukebox est actif
    const activeNav = document.querySelector('.bonus-nav-btn.active');
    if (activeNav && activeNav.dataset.section === 'jukebox') return;
    audioBonus.volume = window._vol_general !== undefined ? window._vol_general * 0.6 : 0.6;
    audioBonus.play().catch(() => {});
  }
  function stopBonusMusic() {
    if (!audioBonus) return;
    audioBonus.pause();
    // Ne pas réinitialiser currentTime pour reprendre où on était
  }

  startBonusMusic();
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
  function handleBonusAudio(section) {
    if (section === 'jukebox') {
      stopBonusMusic();
    } else {
      // Arrêter aussi le jukebox si il jouait
      const jkAudioEl = window._jkCurrentAudio;
      if (jkAudioEl && !jkAudioEl.paused) {
        jkAudioEl.pause();
        window._jkCurrentAudio = null;
      }
      startBonusMusic();
    }
  }

  document.querySelectorAll('.bonus-nav-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bonus-nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.bonus-section').forEach(s => s.style.display = 'none');
      btn.classList.add('active');
      const sec = document.getElementById('section-' + btn.dataset.section);
      if (sec) sec.style.display = 'block';
      // Restaurer le focus de la section
      setTimeout(restoreFocus, 80);
      // Muter/démarrer la musique bonus selon la section
      handleBonusAudio(btn.dataset.section);
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
    // Réinitialiser aussi les modes
    document.querySelectorAll('#custom-modes-list input[type=checkbox]').forEach(cb => {
      cb.checked = false;
    });
    updateDiffScore();
  });

  // ── Modes enrichis — persistance et score ──
  const MODE_WEIGHTS = {
    fast_night: 2, radar_map: -1, no_camera: 3, silent_night: 2, frank_blind: 1
  };

  function loadModes() {
    try { return JSON.parse(localStorage.getItem('fnaf_custom_modes') || '{}'); } catch(e) { return {}; }
  }
  function saveModes(m) {
    try { localStorage.setItem('fnaf_custom_modes', JSON.stringify(m)); } catch(e) {}
  }

  // Charger les modes sauvegardés
  const savedModes = loadModes();
  document.querySelectorAll('#custom-modes-list input[type=checkbox]').forEach(cb => {
    const modeId = cb.id.replace('mode-', '');
    if (savedModes[modeId]) cb.checked = true;
    cb.addEventListener('change', () => {
      const m = loadModes();
      m[modeId] = cb.checked;
      saveModes(m);
      updateDiffScore();
    });
  });

  function updateDiffScore() {
    const scoreEl = document.getElementById('custom-diff-score');
    if (!scoreEl) return;
    const diffs = loadDiffs();
    const modes = loadModes();
    // Score de base : moyenne des robots actifs
    let base = 0, robotCount = 0;
    ['brad','frank','mama'].forEach(r => {
      if (diffs[r] > 1) { base += diffs[r]; robotCount++; }
    });
    const avgRobot = robotCount > 0 ? base / robotCount : 0;
    // Bonus/malus des modes
    let modeBonus = 0;
    Object.entries(MODE_WEIGHTS).forEach(([id, w]) => { if (modes[id]) modeBonus += w; });
    const total = Math.max(0, Math.min(20, Math.round(avgRobot + modeBonus)));
    // Label
    let label, color;
    if (total <= 3)       { label = 'Très facile';    color = '#2a8a2a'; }
    else if (total <= 6)  { label = 'Facile';         color = '#5aaa5a'; }
    else if (total <= 9)  { label = 'Modéré';         color = '#c0a010'; }
    else if (total <= 12) { label = 'Difficile';      color = '#cc6010'; }
    else if (total <= 15) { label = 'Très difficile'; color = '#cc2020'; }
    else                  { label = 'CAUCHEMAR';      color = '#aa0000'; }
    scoreEl.textContent = label + ' (' + total + '/20)';
    scoreEl.style.color = color;
  }
  updateDiffScore();

  // Recalculer quand les sliders changent
  document.querySelectorAll('.robot-slider').forEach(sl => {
    sl.addEventListener('input', updateDiffScore);
  });

  // Lancer
  document.getElementById('custom-start')?.addEventListener('click', () => {
    const d = loadDiffs();
    const m = loadModes();
    try {
      localStorage.setItem('fnaf_custom_active', JSON.stringify({ ...d, modes: m }));
    } catch(e) {}
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

// ══════════════════════════════════════
// JUKEBOX
// ══════════════════════════════════════
(function initJukebox() {

  // ── Catalogue des pistes ──
  const TRACKS = [
    // Catégorie : Appels
    { cat:'Appels',     name:'Appel — Nuit 1',         src:'assets/audio/effect/night1-call.m4a' },
    { cat:'Appels',     name:'Appel — Nuit 2',         src:'assets/audio/effect/night2-call.m4a' },
    { cat:'Appels',     name:'Appel — Nuit 3',         src:'assets/audio/effect/night-3-call.m4a' },
    { cat:'Appels',     name:'Appel — Nightmare',      src:'assets/audio/effect/nightmare-call.m4a' },
    // Catégorie : Ambiances
    { cat:'Ambiances',  name:'Ambiance 1',             src:'assets/audio/effect/ambiance-1.mp3' },
    { cat:'Ambiances',  name:'Ambiance 2',             src:'assets/audio/effect/ambiance-2.mp3' },
    { cat:'Ambiances',  name:'Ambiance 3',             src:'assets/audio/effect/ambiance-3.mp3' },
    { cat:'Ambiances',  name:'Ambiance 4',             src:'assets/audio/effect/ambiance-4.wav' },
    { cat:'Ambiances',  name:'Ambiance 5',             src:'assets/audio/effect/ambiance-5.wav' },
    // Catégorie : Musiques
    { cat:'Musiques',   name:'Menu principal',         src:'assets/audio/menu.mp3' },
    { cat:'Musiques',   name:'Bonus',                  src:'assets/audio/bonus.mp3' },
    { cat:'Musiques',   name:'Générique de fin',       src:'assets/audio/merci.m4a' },
    { cat:'Musiques',   name:'Boîte à musique',        src:'assets/audio/effect/music-box/music-box.mp3' },
    // Catégorie : Effets
    { cat:'Effets',     name:'Démarrage nuit',         src:'assets/audio/effect/night-start.mp3' },
    { cat:'Effets',     name:'Fin de nuit',            src:'assets/audio/effect/night-end.mp3' },
    { cat:'Effets',     name:'Alarme',                 src:'assets/audio/effect/alarm.mp3' },
    { cat:'Effets',     name:'Bruit de pas',           src:'assets/audio/effect/bruit-pas.wav' },
    { cat:'Effets',     name:'Course rapide',          src:'assets/audio/effect/fastrun.wav' },
    { cat:'Effets',     name:'Robot',                  src:'assets/audio/effect/robot.mp3' },
    { cat:'Effets',     name:'Sonnerie',               src:'assets/audio/effect/ring.mp3' },
    { cat:'Effets',     name:'tk4play',                src:'assets/audio/effect/tk4play.wav' },
  ];

  const CATS = [...new Set(TRACKS.map(t => t.cat))];

  // ── État ──
  let currentTrack  = null;  // index dans TRACKS
  let currentCat    = CATS[0];
  let isPlaying     = false;
  let jkAudio       = new Audio();
  let progressRaf   = null;

  // ── Éléments DOM ──
  const catsEl    = document.getElementById('jukebox-cats');
  const listEl    = document.getElementById('jukebox-tracklist');
  const nameEl    = document.getElementById('jk-track-name');
  const curEl     = document.getElementById('jk-time-cur');
  const durEl     = document.getElementById('jk-time-dur');
  const fillEl    = document.getElementById('jk-progress-fill');
  const barEl     = document.getElementById('jk-progress-bar');
  const playBtn   = document.getElementById('jk-play');
  const prevBtn   = document.getElementById('jk-prev');
  const nextBtn   = document.getElementById('jk-next');
  const volEl     = document.getElementById('jk-vol');

  if (!catsEl || !listEl) return; // Pas encore dans le DOM

  // ── Utilitaires ──
  function fmt(s) {
    if (!s || isNaN(s) || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }
  function getVol() { return parseInt(volEl.value) / 100; }

  // ── Rendu des catégories ──
  function renderCats() {
    catsEl.innerHTML = '';
    CATS.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'jk-cat-btn' + (cat === currentCat ? ' active' : '');
      btn.textContent = cat;
      btn.onclick = () => { currentCat = cat; renderCats(); renderList(); };
      catsEl.appendChild(btn);
    });
  }

  // ── Rendu de la liste ──
  function renderList() {
    listEl.innerHTML = '';
    const filtered = TRACKS.map((t, i) => ({...t, idx: i})).filter(t => t.cat === currentCat);
    filtered.forEach((t, n) => {
      const row = document.createElement('div');
      row.className = 'jk-track' + (t.idx === currentTrack ? ' active' : '');
      row.setAttribute('tabindex', '0');
      row.innerHTML =
        '<span class="jk-track-num">' + (n+1) + '</span>' +
        '<span class="jk-track-lbl">' + t.name + '</span>' +
        '<span class="jk-track-dur" id="jk-dur-' + t.idx + '">—</span>';
      row.onclick = () => loadTrack(t.idx, true);
      row.onkeydown = e => { if(e.key==='Enter'||e.key===' ') { e.preventDefault(); loadTrack(t.idx, true); } };
      listEl.appendChild(row);
      // Charger la durée en avance
      const probe = new Audio(t.src);
      probe.preload = 'metadata';
      probe.addEventListener('loadedmetadata', () => {
        const d = document.getElementById('jk-dur-' + t.idx);
        if (d) d.textContent = fmt(probe.duration);
      });
    });
  }

  // ── Charger une piste ──
  function loadTrack(idx, autoplay) {
    currentTrack = idx;
    const t = TRACKS[idx];
    jkAudio.pause();
    cancelAnimationFrame(progressRaf);
    jkAudio = new Audio(t.src);
    window._jkCurrentAudio = jkAudio; // Exposer pour handleBonusAudio
    jkAudio.volume = getVol();
    nameEl.textContent = t.name;
    nameEl.className = 'playing';
    fillEl.style.width = '0%';
    curEl.textContent = '0:00';
    durEl.textContent = '—';
    jkAudio.addEventListener('loadedmetadata', () => { durEl.textContent = fmt(jkAudio.duration); });
    jkAudio.addEventListener('ended', () => { isPlaying = false; updatePlayBtn(); nextTrack(); });
    renderList();
    // Mettre en évidence la piste dans la liste
    setTimeout(() => {
      const active = listEl.querySelector('.jk-track.active');
      if (active) active.scrollIntoView({ block: 'nearest' });
    }, 50);
    if (autoplay) {
      // Couper la musique bonus avant de jouer
      if (audioBonus && !audioBonus.paused) audioBonus.pause();
      play();
    } else { isPlaying = false; updatePlayBtn(); }
  }

  // ── Lecture / Pause ──
  function play() {
    if (currentTrack === null) { if (TRACKS.length) loadTrack(0, true); return; }
    // Couper la musique bonus
    if (audioBonus && !audioBonus.paused) audioBonus.pause();
    jkAudio.volume = Math.max(0.01, getVol()); // volume > 0 requis
    const p = jkAudio.play();
    if (p && p.catch) {
      p.then(() => {
        isPlaying = true;
        updatePlayBtn();
        updateProgress();
      }).catch(err => {
        // Si autoplay bloqué, marquer comme en attente d'interaction
        window._jkPendingPlay = true;
        isPlaying = false;
        updatePlayBtn();
      });
    } else {
      isPlaying = true;
      updatePlayBtn();
      updateProgress();
    }
  }
  function pause() {
    jkAudio.pause();
    isPlaying = false;
    updatePlayBtn();
    cancelAnimationFrame(progressRaf);
  }
  function togglePlay() {
    if (currentTrack === null) { loadTrack(0, true); return; }
    if (isPlaying) pause(); else play();
  }

  // ── Navigation ──
  function prevTrack() {
    if (currentTrack === null) return;
    const filtered = TRACKS.map((t,i)=>({...t,idx:i})).filter(t=>t.cat===currentCat);
    const pos = filtered.findIndex(t=>t.idx===currentTrack);
    if (pos > 0) loadTrack(filtered[pos-1].idx, isPlaying);
    else if (filtered.length) loadTrack(filtered[filtered.length-1].idx, isPlaying);
  }
  function nextTrack() {
    if (currentTrack === null) { loadTrack(0, true); return; }
    const filtered = TRACKS.map((t,i)=>({...t,idx:i})).filter(t=>t.cat===currentCat);
    const pos = filtered.findIndex(t=>t.idx===currentTrack);
    if (pos < filtered.length - 1) loadTrack(filtered[pos+1].idx, true);
    else loadTrack(filtered[0].idx, false); // Retour au début, pause
  }

  // ── Progression ──
  function updateProgress() {
    if (!isPlaying) return;
    const dur = jkAudio.duration;
    const cur = jkAudio.currentTime;
    if (dur && isFinite(dur)) {
      fillEl.style.width = ((cur/dur)*100) + '%';
      curEl.textContent = fmt(cur);
    }
    progressRaf = requestAnimationFrame(updateProgress);
  }

  function updatePlayBtn() {
    if (isPlaying) { playBtn.innerHTML = '&#9646;&#9646;'; playBtn.classList.add('playing'); }
    else           { playBtn.innerHTML = '&#9654;';        playBtn.classList.remove('playing'); }
  }

  // ── Events contrôles ──
  playBtn.onclick = togglePlay;
  prevBtn.onclick = prevTrack;
  nextBtn.onclick = nextTrack;
  volEl.oninput = () => { jkAudio.volume = getVol(); };

  // Si le play était en attente (autoplay bloqué), relancer au prochain clic
  document.getElementById('section-jukebox')?.addEventListener('click', () => {
    if (window._jkPendingPlay) {
      window._jkPendingPlay = false;
      if (currentTrack !== null && !isPlaying) play();
    }
  });

  // Barre de progression — seek au clic
  barEl.addEventListener('click', e => {
    if (!jkAudio.duration || !isFinite(jkAudio.duration)) return;
    const rect = barEl.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    jkAudio.currentTime = pct * jkAudio.duration;
    curEl.textContent = fmt(jkAudio.currentTime);
    fillEl.style.width = (pct * 100) + '%';
  });

  // Navigation clavier dans la liste
  listEl.addEventListener('keydown', e => {
    const tracks = listEl.querySelectorAll('.jk-track');
    const cur2 = Array.from(tracks).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); tracks[Math.min(tracks.length-1, cur2+1)]?.focus(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); tracks[Math.max(0, cur2-1)]?.focus(); }
  });

  // Arrêter le jukebox quand on quitte la section
  document.querySelectorAll('.bonus-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.section !== 'jukebox') { pause(); }
    });
  });

  // ── Init ──
  renderCats();
  renderList();

})();

// Surbrillance robot sélectionné (manette)
  document.querySelectorAll('.robot-slider').forEach(sl => {
    sl.addEventListener('focus', () => {
      document.querySelectorAll('.robot-card').forEach(c => c.classList.remove('gp-selected'));
      sl.closest('.robot-card')?.classList.add('gp-selected');
    });
    sl.addEventListener('blur', () => {
      sl.closest('.robot-card')?.classList.remove('gp-selected');
    });
  });

// ══════════════════════════════════════
// SECTION SUCCÈS
// ══════════════════════════════════════
(function initAchievements() {
  function render() {
    if (!window.Achievements) return;
    const listEl  = document.getElementById('achievements-list');
    const countEl = document.getElementById('ach-count');
    const fillEl  = document.getElementById('ach-progress-fill');
    const pctEl   = document.getElementById('ach-pct');
    if (!listEl) return;

    const stats   = Achievements.getStats();
    const unlData = Achievements.loadAll();

    if (countEl) countEl.textContent = stats.unlocked + ' / ' + stats.total;
    if (fillEl)  fillEl.style.width  = stats.pct + '%';
    if (pctEl)   pctEl.textContent   = stats.pct + '%';

    // Grouper par catégorie
    const cats = {};
    Achievements.CATALOGUE.forEach(a => {
      if (!cats[a.cat]) cats[a.cat] = [];
      cats[a.cat].push(a);
    });

    listEl.innerHTML = '';
    Object.entries(cats).forEach(([cat, items]) => {
      const title = document.createElement('div');
      title.className = 'ach-cat-title';
      title.textContent = cat;
      listEl.appendChild(title);

      items.forEach(a => {
        const isUnlocked = !!unlData[a.id];
        const ts = unlData[a.id]?.ts;

        const item = document.createElement('div');
        item.className = 'ach-item ' + (isUnlocked ? 'unlocked' : 'locked');
        item.setAttribute('tabindex', '0');

        const icon = document.createElement('div');
        icon.className = 'ach-icon';
        icon.textContent = isUnlocked ? a.icon : (a.secret ? '?' : a.icon);

        const text = document.createElement('div');
        text.className = 'ach-text';

        const name = document.createElement('div');
        name.className = 'ach-name';
        name.textContent = isUnlocked ? a.name : (a.secret ? '???' : a.name);

        const desc = document.createElement('div');
        desc.className = 'ach-desc';
        if (isUnlocked) {
          desc.textContent = a.secret ? (a.realDesc || a.desc) : a.desc;
        } else {
          desc.textContent = a.secret ? '???' : a.desc;
        }

        text.appendChild(name);
        text.appendChild(desc);
        item.appendChild(icon);
        item.appendChild(text);

        if (isUnlocked && ts) {
          const date = document.createElement('div');
          date.className = 'ach-date';
          const d = new Date(ts);
          date.textContent = d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
          item.appendChild(date);
        }

        listEl.appendChild(item);
      });
    });
  }

  // Rendre quand on entre dans la section succès
  document.addEventListener('click', e => {
    const btn = e.target.closest('.bonus-nav-btn');
    if (btn && btn.dataset.section === 'achievements') {
      setTimeout(render, 50);
    }
  });

  // Rendre immédiatement si on est déjà sur la section
  setTimeout(render, 200);

})();

// ══════════════════════════════════════
// GALERIE CAMÉRAS
// ══════════════════════════════════════
(function initCamGallery() {

  // ── Catalogue des images par caméra ──
  const CAMS = {
    cellier:        { base:'assets/images/cameras/cellier.jpeg',         label:'CAM — CELLIER' },
    wc:             { base:'assets/images/cameras/wc.jpeg',              label:'CAM — WC' },
    'salle-de-bain':{ base:'assets/images/cameras/salle-de-bain-ferme.jpeg', label:'CAM — SALLE DE BAIN' },
    cuisine:        { base:'assets/images/cameras/cuisine-ferme.jpeg',   label:'CAM — CUISINE' },
    'salle-a-manger':{ base:'assets/images/cameras/salle-a-manger.jpeg', label:'CAM — SALLE À MANGER' },
    salon:          { base:'assets/images/cameras/salon.jpeg',           label:'CAM — SALON' },
    couloir:        { base:'assets/images/cameras/couloir.jpeg',         label:'CAM — COULOIR' },
    rue:            { base:'assets/images/cameras/mama-coco/mama-coco-inactive.png', label:'CAM — EXTÉRIEUR RUE' },
    'etage-2':      { base:'assets/images/cameras/frank/boite-ferme.png', label:"CAM — CHAMBRE D'AMI" },
  };

  // Images robots par caméra
  const ROBOT_IMGS = {
    cellier:        ['assets/images/cameras/brad/cellier-brad-1.png','assets/images/cameras/brad/cellier-brad-2.png'],
    wc:             ['assets/images/cameras/brad/wc-brad.png'],
    'salle-de-bain':['assets/images/cameras/brad/salle-de-bain-brad.png'],
    cuisine:        ['assets/images/cameras/brad/cuisine-brad.png','assets/images/cameras/brad/cuisine-brad-rare.png'],
    'salle-a-manger':['assets/images/cameras/brad/salle-a-manger-brad.png'],
    salon:          ['assets/images/cameras/brad/salon-brad.png'],
    couloir:        ['assets/images/cameras/brad/couloir-brad.png'],
    rue:            ['assets/images/cameras/mama-coco/mama-coco-debout.png'],
    'etage-2':      ['assets/images/cameras/frank/boite-frank.png'],
  };

  // Événements rares par caméra (probabilité faible)
  const RARE_EVENTS = {
    cuisine:  { img:'assets/images/cameras/brad/cuisine-brad-rare.png', label:'⚠ ANOMALIE DÉTECTÉE', prob:0.08 },
    cellier:  { img:'assets/images/cameras/brad/cellier-brad-2.png',    label:'⚠ MOUVEMENT DÉTECTÉ', prob:0.06 },
    couloir:  { img:'assets/images/cameras/brad/couloir-brad.png',      label:'⚠ PRÉSENCE DÉTECTÉE', prob:0.07 },
  };

  // ── DOM ──
  const imgEl       = document.getElementById('cam-gallery-img');
  const labelEl     = document.getElementById('cam-gallery-label');
  const placeholder = document.querySelector('.cam-gallery-placeholder');
  const noiseCanvas = document.getElementById('cam-gallery-noise');
  const glitchEl    = document.getElementById('cam-gallery-glitch');
  const roomBtns    = document.querySelectorAll('.cam-gallery-room');
  const modeBtns    = document.querySelectorAll('.cam-gallery-mode');

  if (!imgEl) return;

  let currentMode = 'robots';
  let currentCam  = null;
  let noiseRaf    = null;
  let glitchTimer = null;
  let rareTimer   = null;
  let isRareActive= false;

  // ── Bruit statique ──
  function drawNoise() {
    if (!noiseCanvas) return;
    const ctx = noiseCanvas.getContext('2d');
    noiseCanvas.width  = noiseCanvas.offsetWidth  || 400;
    noiseCanvas.height = noiseCanvas.offsetHeight || 225;
    const img = ctx.createImageData(noiseCanvas.width, noiseCanvas.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v;
      img.data[i+3] = Math.random() * 22;
    }
    ctx.putImageData(img, 0, 0);
    if (currentCam) noiseRaf = requestAnimationFrame(drawNoise);
  }

  // ── Glitch aléatoire ──
  function scheduleGlitch() {
    clearTimeout(glitchTimer);
    glitchTimer = setTimeout(() => {
      if (!currentCam || !glitchEl) { scheduleGlitch(); return; }
      // Flash de glitch sur l'image
      imgEl.style.animation = 'glitchShift 0.4s ease';
      if (glitchEl) {
        glitchEl.style.opacity = '0.3';
        glitchEl.style.background = `rgba(${Math.random()>0.5?'0,255,170':'255,0,80'},0.08)`;
      }
      setTimeout(() => {
        imgEl.style.animation = '';
        if (glitchEl) glitchEl.style.opacity = '0';
      }, 400);
      scheduleGlitch();
    }, 4000 + Math.random() * 12000);
  }

  // ── Événement rare ──
  function scheduleRare(camId) {
    clearTimeout(rareTimer);
    isRareActive = false;
    const rare = RARE_EVENTS[camId];
    if (!rare || currentMode !== 'robots') return;
    rareTimer = setTimeout(() => {
      if (currentCam !== camId) return;
      isRareActive = true;
      imgEl.src = rare.img;
      const prevLabel = labelEl.textContent;
      labelEl.textContent = rare.label;
      labelEl.style.color = '#cc2020';
      setTimeout(() => {
        if (currentCam === camId) {
          isRareActive = false;
          showCam(camId); // Remettre l'image normale
          labelEl.style.color = '';
        }
      }, 3000 + Math.random() * 2000);
    }, 15000 + Math.random() * 30000);
  }

  // ── Afficher une caméra ──
  function showCam(camId) {
    currentCam = camId;
    const cam = CAMS[camId];
    if (!cam) return;

    // Masquer placeholder
    if (placeholder) placeholder.style.display = 'none';
    imgEl.style.display = 'block';

    // Choisir l'image selon le mode
    let src = cam.base;
    if (currentMode === 'robots') {
      const robots = ROBOT_IMGS[camId];
      if (robots && robots.length) {
        // Probabilité d'événement rare
        const rare = RARE_EVENTS[camId];
        if (rare && Math.random() < rare.prob && !isRareActive) {
          src = rare.img;
          isRareActive = true;
          setTimeout(() => { isRareActive = false; if(currentCam===camId) showCam(camId); }, 4000);
        } else {
          src = robots[Math.floor(Math.random() * robots.length)];
        }
      }
    }

    imgEl.src = src;
    labelEl.textContent = cam.label;
    labelEl.style.color = '';

    // Bruit
    cancelAnimationFrame(noiseRaf);
    drawNoise();

    // Glitch + rare
    scheduleGlitch();
    if (currentMode === 'robots') scheduleRare(camId);
  }

  // ── Boutons mode ──
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      if (currentCam) showCam(currentCam);
    });
  });

  // ── Boutons caméras ──
  roomBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      roomBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showCam(btn.dataset.cam);
    });
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
  });

  // ── Arrêter quand on quitte la section ──
  document.querySelectorAll('.bonus-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.section !== 'cameras') {
        clearTimeout(glitchTimer);
        clearTimeout(rareTimer);
        cancelAnimationFrame(noiseRaf);
      }
    });
  });

})();

// ══════════════════════════════════════
// NAVIGATION MANETTE — BONUS
// ══════════════════════════════════════
(function initBonusGamepad() {
  const prev = {};
  let lastNav = 0;
  const DEBOUNCE = 200;

  function getGP() {
    try {
      const all = navigator.getGamepads();
      for (let i = 0; i < all.length; i++) if (all[i]?.connected) return all[i];
    } catch(e) {} return null;
  }
  function jp(gp, i) {
    const k='b'+i, now=!!(gp.buttons[i]?.pressed), was=prev[k]||false;
    prev[k]=now; return now && !was;
  }
  function ja(gp, axis, dir) {
    const k='a'+axis+dir, v=gp.axes[axis]||0;
    const now=dir>0?v>0.52:v<-0.52, was=prev[k]||false;
    prev[k]=now; return now && !was;
  }

  // Obtenir tous les éléments focusables de la section active
  function getFocusables() {
    const activeSection = document.querySelector('.bonus-section[style*="block"]') ||
                          document.querySelector('.bonus-section.active');
    if (!activeSection) return [];
    return Array.from(activeSection.querySelectorAll(
      'button:not(:disabled), input[type=range], .jk-track, .bonus-nav-btn:not(.disabled), .jk-cat-btn, input[type=checkbox], .ach-item, .cam-gallery-room'
    )).filter(el => el.offsetParent !== null);
  }

  // Mémoriser le dernier élément focusé par section
  const _sectionFocus = {};
  function saveFocus(el) {
    const sec = document.querySelector('.bonus-nav-btn.active');
    if (sec) _sectionFocus[sec.dataset.section] = el;
  }
  function restoreFocus() {
    const sec = document.querySelector('.bonus-nav-btn.active');
    if (!sec) return null;
    const saved = _sectionFocus[sec.dataset.section];
    if (saved && saved.offsetParent !== null) { saved.focus(); return saved; }
    // Sinon focus le premier élément
    const els = getFocusables();
    if (els.length) { els[0].focus(); return els[0]; }
    return null;
  }

  // Navigation dans les onglets du bonus
  function getNavBtns() {
    return Array.from(document.querySelectorAll('.bonus-nav-btn:not(.disabled)'))
      .filter(b => b.offsetParent !== null);
  }

  let currentFocusIdx = -1;

  setInterval(() => {
    const gp = getGP(); if (!gp) return;
    const now = Date.now();

    const up    = jp(gp,12) || ja(gp,1,-1);
    const down  = jp(gp,13) || ja(gp,1,1);
    const left  = jp(gp,14) || ja(gp,0,-1);
    const right = jp(gp,15) || ja(gp,0,1);
    const bConf = jp(gp,0) || jp(gp,2);  // A/X ou ✕
    const bBack = jp(gp,1);              // B/Rond = retour menu
    const bBump = jp(gp,4);             // L1/LB = onglet précédent
    const bBump2= jp(gp,5);             // R1/RB = onglet suivant

    // Retour au menu
    if (bBack) {
      document.getElementById('bonus-back')?.click();
      return;
    }

    // Navigation entre onglets (LB/RB ou L1/R1)
    if ((bBump || bBump2) && now - lastNav > DEBOUNCE) {
      lastNav = now;
      const navBtns = getNavBtns();
      const ci = navBtns.findIndex(b => b.classList.contains('active'));
      let ni = ci < 0 ? 0 : ci + (bBump ? -1 : 1);
      ni = Math.max(0, Math.min(navBtns.length - 1, ni));
      navBtns[ni]?.click();
      return;
    }

    // Scroll de page avec le joystick DROIT (axes 2 et 3)
    const rightY = gp.axes[3] || 0;
    if (Math.abs(rightY) > 0.25) {
      window.scrollBy({ top: rightY * 20, behavior: 'auto' });
    }

    // Navigation dans la section active avec joystick GAUCHE / D-pad
    const els = getFocusables();
    if (!els.length) return;
    const ci = els.indexOf(document.activeElement);

    if ((up || left) && now - lastNav > DEBOUNCE) {
      lastNav = now;
      const ni = ci <= 0 ? els.length - 1 : ci - 1;
      els[ni].focus(); saveFocus(els[ni]);
      els[ni].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    if ((down || right) && now - lastNav > DEBOUNCE) {
      lastNav = now;
      const ni = ci < 0 || ci >= els.length - 1 ? 0 : ci + 1;
      els[ni].focus(); saveFocus(els[ni]);
      els[ni].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    // Valider / Interagir
    if (bConf && now - lastNav > DEBOUNCE) {
      lastNav = now;
      const focused = document.activeElement;
      if (!focused) return;

      if (focused.type === 'range') return; // Géré par les axes
      if (focused.type === 'checkbox') {
        focused.checked = !focused.checked;
        focused.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      focused.click();
    }

    // Slider : joystick DROIT (axe 2) OU D-pad gauche/droite quand slider focusé
    const focused = document.activeElement;
    if (focused && focused.type === 'range') {
      const rightX = gp.axes[2] || 0; // joystick droit horizontal
      const step = focused.id === 'jk-vol' ? 5 : 1;
      // D-pad ou joystick droit
      const slLeft  = (left  || rightX < -0.3) && now - lastNav > 80;
      const slRight = (right || rightX > 0.3)  && now - lastNav > 80;
      if (slLeft) {
        lastNav = now;
        focused.value = Math.max(parseInt(focused.min), parseInt(focused.value) - step);
        focused.dispatchEvent(new Event('input'));
        focused.dispatchEvent(new Event('change'));
      }
      if (slRight) {
        lastNav = now;
        focused.value = Math.min(parseInt(focused.max), parseInt(focused.value) + step);
        focused.dispatchEvent(new Event('input'));
        focused.dispatchEvent(new Event('change'));
      }
    }

  }, 16);

  // Afficher hint manette en bas du bonus
  function showBonusGpHint() {
    const gp = getGP(); if (!gp) return;
    let hint = document.getElementById('bonus-gp-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'bonus-gp-hint';
      hint.style.cssText = "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);font-family:'Share Tech Mono',monospace;font-size:9px;color:#333;letter-spacing:2px;z-index:100;text-align:center;";
      document.body.appendChild(hint);
    }
    try {
      const t = localStorage.getItem('fnaf_opt_gamepadType') || 'xbox';
      const confirm = t === 'ps' ? '✕' : 'A';
      hint.textContent = `${confirm}=valider  B=retour  LB/RB=onglets  ↕=naviguer`;
    } catch(e) {}
  }

  window.addEventListener('gamepadconnected', showBonusGpHint);
  setTimeout(() => { if (getGP()) showBonusGpHint(); }, 500);

  // Rendre les pistes jukebox focusables (tabindex)
  const trackObs = new MutationObserver(() => {
    document.querySelectorAll('.jk-track').forEach(t => {
      if (!t.getAttribute('tabindex')) t.setAttribute('tabindex', '0');
    });
  });
  trackObs.observe(document.body, { childList: true, subtree: true });

})();
