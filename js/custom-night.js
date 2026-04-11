/* ═══════════════════════════════════════════
   CUSTOM-NIGHT.JS
   Lit fnaf_custom_active depuis localStorage
   et adapte la difficulté de chaque robot (1-10)
   Réutilise la même mécanique que game-nightmare.js
════════════════════════════════════════════ */
(() => {

  // ── Lire les paramètres custom ──
  let CUSTOM = { brad: 5, frank: 5, mama: 5 };
  try {
    const raw = localStorage.getItem('fnaf_custom_active');
    if (raw) CUSTOM = { ...CUSTOM, ...JSON.parse(raw) };
  } catch(e) {}

  // ── Interpolation niveau 2-10 → valeurs de jeu ──
  // niveau 1 = INACTIF (pas d'impact sur le jeu)
  // niveau 2 = très facile, niveau 10 = très difficile
  function lerp(min, max, level) {
    if (level <= 1) return Infinity; // inactif
    return Math.round(min + (max - min) * ((level - 2) / 8));
  }

  // Brad : intervalle en ms
  const BRAD_INACTIVE   = CUSTOM.brad <= 1;
  const BRAD_MOVE_BASE  = BRAD_INACTIVE ? Infinity : lerp(40000, 8000,  CUSTOM.brad);
  const BRAD_MOVE_MIN   = BRAD_INACTIVE ? Infinity : lerp(20000, 3000,  CUSTOM.brad);

  // Frank : drain total en ms (Infinity = pas de drain)
  const FRANK_INACTIVE  = CUSTOM.frank <= 1;
  const MB_DRAIN_MS     = FRANK_INACTIVE ? Infinity : lerp(200000, 60000, CUSTOM.frank);

  // Mama : intervalle de vérification en ms
  const MAMA_INACTIVE   = CUSTOM.mama <= 1;
  const MAMA_CHECK_BASE = MAMA_INACTIVE ? Infinity : lerp(50000, 15000, CUSTOM.mama);
  const MAMA_CHECK_MIN  = MAMA_INACTIVE ? Infinity : lerp(25000, 8000,  CUSTOM.mama);
  const MAMA_MAX_LOOK_B = MAMA_INACTIVE ? Infinity : lerp(10000, 4000,  CUSTOM.mama);
  const MAMA_MAX_LOOK_M = MAMA_INACTIVE ? Infinity : lerp(6000,  2500,  CUSTOM.mama);

  // ── Config fixe ──
  const NIGHT_NUMBER      = 'custom';
  const NIGHT_DURATION    = 10 * 60 * 1000;
  const HOURS             = ['12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM'];
  const BRAD_VISIBLE_HOUR = 1;
  const JUMPSCARE_DUR     = 4000;
  const DEATH_MIN         = 6000;
  const REBOOT_ALL_DUR    = 17000;
  const RING_PAUSE_MS     = 2200;
  const BRAD_CAM_SHOW     = 6;
  const MB_WARN           = 0.25;
  const MB_CRIT           = 0.10;
  const MB_FRANK_DELAY    = 6000;
  const REWIND_RATE       = 0.008;
  const REWIND_SND_CD     = 750;
  const MAMA_MIN_LOOK     = 1500;
  const MAMA_PARTE_DELAY  = 5000;
  const MAMA_FASTRUN_LD   = 1500;
  const ERR_BASE          = 90000;
  const ERR_MIN           = 50000;
  const STAIR_B           = 8000;
  const STAIR_M           = 3000;

  const BRAD_PATH = ['cellier','wc','salle-de-bain','cuisine','salle-a-manger','salon','couloir','etage'];
  window._gpRooms = [...BRAD_PATH, 'rue', 'etage-2'];

  const DOOR_THRESHOLDS = { 'salle-de-bain': 2, 'cuisine': 3 };

  const CAM_IMAGES = {
    cellier:'assets/images/cameras/cellier.jpeg',
    wc:'assets/images/cameras/wc.jpeg',
    'salle-de-bain':'assets/images/cameras/salle-de-bain-ferme.jpeg',
    cuisine:'assets/images/cameras/cuisine-ferme.jpeg',
    'salle-a-manger':'assets/images/cameras/salle-a-manger.jpeg',
    salon:'assets/images/cameras/salon.jpeg',
    couloir:'assets/images/cameras/couloir.jpeg',
  };
  const FRANK_IMG = {
    safe:'assets/images/cameras/frank/boite-ferme.png',
    warning:'assets/images/cameras/frank/boite-frank.png',
    critical:'assets/images/cameras/frank/boite-ouverte.png',
  };
  const MAMA_IMG = {
    inactive:'assets/images/cameras/mama-coco/mama-coco-inactive.png',
    debout:'assets/images/cameras/mama-coco/mama-coco-debout.png',
    partie:'assets/images/cameras/mama-coco/mama-coco-partie.png',
  };
  const BRAD_IMG = {
    'cellier-1':'assets/images/cameras/brad/cellier-brad-1.png',
    'cellier-2':'assets/images/cameras/brad/cellier-brad-2.png',
    wc:'assets/images/cameras/brad/wc-brad.png',
    'salle-de-bain':'assets/images/cameras/brad/salle-de-bain-brad.png',
    cuisine:'assets/images/cameras/brad/cuisine-brad.png',
    'cuisine-rare':'assets/images/cameras/brad/cuisine-brad-rare.png',
    'salle-a-manger':'assets/images/cameras/brad/salle-a-manger-brad.png',
    salon:'assets/images/cameras/brad/salon-brad.png',
    couloir:'assets/images/cameras/brad/couloir-brad.png',
  };

  // ── État ──
  const S = {
    over:false, nightProgress:0, currentHour:0,
    selectedRoom:'cellier', bradVisible:false,
    bradIndex:0, bradPhase:1, bradMaxIndex:0,
    stairActive:false, stairTimer:null,
    modules:{ audio:{error:false,rebooting:false}, camera:{error:false,rebooting:false} },
    callPlaying:false, callMuted:false,
    ambiancePaused:false, audioCooldown:false,
    helloToggle:false, rebootingAll:false,
    ambIdx:0,
    musicBox:{gauge:1,draining:false,frankOut:false,frankTimer:null,lastTick:0,warnState:'none',critPlaying:false},
    etage2Visited:false,
    mama:{phase:'inactive',active:false,checkTimer:null,lookStartTime:null,partieTimer:null,_lookReset:null,_lookLong:null},
    rueVisited:false,
  };

  // ── DOM ──
  const $id = id => document.getElementById(id);
  const screenGate    = $id('screen-play-gate');
  const btnGate       = $id('btn-play-gate');
  const screenStart   = $id('screen-nightstart');
  const screenGame    = $id('screen-game');
  const screenDeath   = $id('screen-death');
  const screenNightEnd= $id('screen-nightend');
  const camImg        = $id('cam-img');
  const camBadge      = $id('cam-badge-name');
  const camView       = $id('cam-view');
  const stairAlert    = $id('stair-alert');
  const stairFill     = $id('stair-timer-fill');
  const errDisp       = $id('error-display');
  const errText       = $id('error-text');
  const hudHour       = $id('hud-hour');
  const mapRooms      = document.querySelectorAll('.map-room[data-room]');
  const btnAudio      = $id('btn-audio');
  const btnMaint      = $id('btn-maintenance');
  const btnMuteCall   = $id('btn-mute-call');
  const panelMaint    = $id('panel-maintenance');
  const btnMaintClose = $id('btn-maintenance-close');
  const maintLockMsg  = $id('maint-lock-msg');
  const mbCanvas      = $id('musicbox-gauge');
  const btnRewind     = $id('btn-rewind-musicbox');
  const mbMapWarn     = $id('musicbox-map-warn');
  const roomEtage2    = $id('room-etage-2');
  const roomRue       = $id('room-rue');
  const noiseCanvas   = $id('game-noise');
  const nctx          = noiseCanvas.getContext('2d');
  const JV_brad       = $id('jumpscare-video');
  const JV_frank      = $id('jumpscare-frank-video');
  const JV_mama       = $id('jumpscare-mama-video');

  const SND = {
    amb4:   $id('snd-ambiance-4'),
    amb5:   $id('snd-ambiance-5'),
    ring:   $id('snd-ring'),
    call:   $id('snd-nm-call'),  // réutilise nightmare call ou night3
    start:  $id('snd-night-start'),
    end:    $id('snd-night-end'),
    clic:   $id('snd-clic-camera'),
    robot:  $id('snd-robot'),
    pound:  $id('snd-pounding'),
    alarm:  $id('snd-alarm'),
    reboot: $id('snd-reboot'),
    tabO:   $id('snd-tablette-open'),
    tabC:   $id('snd-tablette-close'),
    dead:   $id('snd-dead'),
    h1:     $id('snd-hello-1'),
    h2:     $id('snd-hello-2'),
    mb:     $id('snd-musicbox'),
    rew:    $id('snd-rewind-box'),
    crit:   $id('snd-critique-box'),
    pas:    $id('snd-bruit-pas'),
    fast:   $id('snd-fastrun'),
  };

  function ps(a, v=0.8) {
    if (!a) return;
    try {
      const gv = window._vol_general !== undefined ? window._vol_general : 1;
      a.currentTime=0; a.volume=Math.min(1,Math.max(0,v*gv));
      a.play().catch(()=>{});
    } catch(e){}
  }
  function ss(a) { if(!a) return; try{a.pause();a.currentTime=0;}catch(e){} }
  function playHello() {
    S.helloToggle=!S.helloToggle;
    const a=S.helloToggle?SND.h1:SND.h2;
    if(!a) return;
    try{a.currentTime=0;a.volume=0.85;a.play().catch(()=>{});}catch(e){}
  }
  function rebootSnd() {
    try{const a=new Audio('assets/audio/effect/reboot.mp3');a.volume=0.6;a.play().catch(()=>{});}
    catch(e){ps(SND.reboot,0.6);}
  }

  // Ambiance alternée
  let ambCurrent = null;
  function startAmbiance() {
    if (S.ambiancePaused || S.over) return;
    stopAmbiance();
    ambCurrent = S.ambIdx===0 ? SND.amb4 : SND.amb5;
    if (ambCurrent) { ambCurrent.volume=0.35; ambCurrent.play().catch(()=>{}); }
  }
  function stopAmbiance() {
    [SND.amb4, SND.amb5].forEach(a => { if(a){a.pause();a.currentTime=0;} });
    ambCurrent = null;
  }
  function pauseAmbiance() { S.ambiancePaused=true; stopAmbiance(); }
  function resumeAmbiance() {
    S.ambiancePaused=false; S.ambIdx=(S.ambIdx+1)%2;
    setTimeout(()=>{ if(!S.over&&!S.ambiancePaused) startAmbiance(); }, 1500);
  }
  function stopAllAmbiance() { S.ambiancePaused=true; stopAmbiance(); }

  // Bruit statique
  function resNoise(){noiseCanvas.width=window.innerWidth;noiseCanvas.height=window.innerHeight;}
  resNoise(); window.addEventListener('resize',resNoise);
  function drawNoise(){
    if(S.over) return;
    const w=noiseCanvas.width,h=noiseCanvas.height,img=nctx.createImageData(w,h);
    for(let i=0;i<img.data.length;i+=4){const v=Math.random()>0.5?255:0;img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=Math.random()*18;}
    nctx.putImageData(img,0,0); requestAnimationFrame(drawNoise);
  }

  // Play Gate
  const gc=$id('gate-noise');
  if(gc){const gctx=gc.getContext('2d');(function gn(){if(!screenGate||screenGate.classList.contains('hidden'))return;gc.width=window.innerWidth;gc.height=window.innerHeight;const img=gctx.createImageData(gc.width,gc.height);for(let i=0;i<img.data.length;i+=4){const v=Math.random()>0.5?255:0;img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=Math.random()*22;}gctx.putImageData(img,0,0);requestAnimationFrame(gn);})();}
  btnGate.addEventListener('click',()=>{
    try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const buf=ctx.createBuffer(1,1,22050);const src=ctx.createBufferSource();src.buffer=buf;src.connect(ctx.destination);src.start(0);}catch(e){}
    screenGate.classList.add('hidden');
    screenStart.classList.remove('hidden');
    startNight();
  });

  // Overlays caméra (identiques à game-nightmare.js)
  function showNoSignal(){
    camImg.style.display='none';
    let o=$id('cam-no-signal');
    if(!o){o=document.createElement('div');o.id='cam-no-signal';o.style.cssText='position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;';const c2=document.createElement('canvas');c2.style.cssText='position:absolute;inset:0;width:100%;height:100%;opacity:0.85;';o.appendChild(c2);const t=document.createElement('div');t.style.cssText="position:relative;z-index:2;font-family:'Share Tech Mono',monospace;font-size:13px;letter-spacing:4px;color:#2a8a2a;text-align:center;animation:blink 0.8s step-start infinite;";t.innerHTML="PAS D'IMAGE<br><span style='font-size:10px;color:#555;'>SON UNIQUEMENT</span>";o.appendChild(t);camView.appendChild(o);const sc2=c2.getContext('2d');(function ds(){const el=$id('cam-no-signal');if(!el||el.style.display==='none')return;c2.width=c2.offsetWidth||400;c2.height=c2.offsetHeight||300;const img=sc2.createImageData(c2.width,c2.height);for(let i=0;i<img.data.length;i+=4){const v=Math.floor(Math.random()*80);img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=255;}sc2.putImageData(img,0,0);requestAnimationFrame(ds);})();}
    o.style.display='flex';hideBlack();
  }
  function hideNoSignal(){const o=$id('cam-no-signal');if(o)o.style.display='none';camImg.style.display='block';}
  function showBlack(){camImg.style.display='none';hideNoSignal();let b=$id('cam-black');if(!b){b=document.createElement('div');b.id='cam-black';b.style.cssText="position:absolute;inset:0;z-index:6;background:#000;display:flex;align-items:center;justify-content:center;";const t=document.createElement('div');t.style.cssText="font-family:'Share Tech Mono',monospace;font-size:11px;color:#333;letter-spacing:4px;animation:blink 1.2s step-start infinite;";t.textContent='SIGNAL PERDU';b.appendChild(t);camView.appendChild(b);}b.style.display='flex';}
  function hideBlack(){const b=$id('cam-black');if(b)b.style.display='none';camImg.style.display='block';}

  // Caméras
  function getFrankImg(){if(S.musicBox.frankOut)return FRANK_IMG.critical;if(S.musicBox.gauge<=MB_WARN)return FRANK_IMG.warning;return FRANK_IMG.safe;}
  function getMamaImg(){return MAMA_IMG[S.mama.phase]||MAMA_IMG.inactive;}
  function hideMbPanel(){const p=$id('musicbox-panel');if(p)p.style.display='none';}
  function showMbPanel(){const p=$id('musicbox-panel');if(p)p.style.display='flex';}

  function selectRoom(r){
    if(!panelMaint.classList.contains('hidden'))return;
    if(S.selectedRoom==='rue'&&r!=='rue')stopLookingMama();
    if(r==='etage'){_setRoom(r,'CAM — ACCÈS ÉTAGE 1');showNoSignal();hideMbPanel();if(BRAD_PATH[S.bradIndex]==='etage'&&S.bradVisible)ps(SND.robot,0.6);return;}
    if(S.modules.camera.error||S.modules.camera.rebooting){_setRoom(r,`CAM — ${r.replace(/-/g,' ').toUpperCase()}`);hideMbPanel();if(r==='rue'||r==='etage-2'){hideBlack();showNoSignal();}else{hideNoSignal();showBlack();}if(SND.mb)SND.mb.volume=0;return;}
    hideNoSignal();hideBlack();if(SND.mb)SND.mb.volume=0;
    _setRoom(r,`CAM — ${r.replace(/-/g,' ').toUpperCase()}`);ps(SND.clic,0.5);
    if(r==='rue'){hideMbPanel();camImg.src=getMamaImg();if(!S.rueVisited){S.rueVisited=true;try{localStorage.setItem('fnaf_irl_rue_visited','1');}catch(e){};if(roomRue)roomRue.classList.remove('first-visit');}startLookingMama();return;}
    if(r==='etage-2'){showMbPanel();camImg.src=getFrankImg();if(SND.mb&&!S.over&&S.musicBox.warnState==='none'){SND.mb.volume=S.callPlaying?0.2:0.65;SND.mb.play().catch(()=>{});}if(!S.etage2Visited){S.etage2Visited=true;try{localStorage.setItem('fnaf_irl_etage2_visited','1');}catch(e){};if(roomEtage2)roomEtage2.classList.remove('first-visit');}return;}
    hideMbPanel();
    let baseSrc=CAM_IMAGES[r]||'';const thr=DOOR_THRESHOLDS[r];
    if(thr!==undefined&&S.bradMaxIndex>thr){if(r==='salle-de-bain')baseSrc='assets/images/cameras/salle-de-bain-ouverte.jpeg';if(r==='cuisine')baseSrc='assets/images/cameras/cuisine-ouverte.jpeg';}
    const bHere=BRAD_PATH[S.bradIndex]===r&&S.bradVisible;
    if(bHere){let k=r;if(r==='cellier')k='cellier-'+S.bradPhase;if(r==='cuisine'&&Math.random()<0.05)k='cuisine-rare';if(r==='couloir')ps(SND.robot,0.6);camImg.src=BRAD_IMG[k]||baseSrc;}else{camImg.src=baseSrc;}
  }
  function _setRoom(r,label){S.selectedRoom=r;mapRooms.forEach(el=>el.classList.remove('active'));const el=$id('room-'+r);if(el)el.classList.add('active');camBadge.textContent=label;}
  mapRooms.forEach(el=>el.addEventListener('click',()=>{if(el.dataset.room)selectRoom(el.dataset.room);}));

  function refreshMap(){mapRooms.forEach(r=>r.classList.remove('brad-here'));if(!S.bradVisible||S.bradIndex<BRAD_CAM_SHOW)return;const el=$id('room-'+BRAD_PATH[S.bradIndex]);if(el)el.classList.add('brad-here');}

  // Brad
  function bradInterval(){return Math.max(BRAD_MOVE_MIN,BRAD_MOVE_BASE-(BRAD_MOVE_BASE-BRAD_MOVE_MIN)*S.nightProgress);}
  function moveBrad(){
    if(S.over||S.bradIndex>=BRAD_PATH.length-1)return;
    if(!S.bradVisible){schedBrad();return;}
    if(S.bradIndex===0&&S.bradPhase===1){S.bradPhase=2;refreshMap();if(S.selectedRoom==='cellier')selectRoom('cellier');schedBrad();return;}
    S.bradIndex++;S.bradPhase=1;if(S.bradIndex>S.bradMaxIndex)S.bradMaxIndex=S.bradIndex;
    ps(SND.pound,0.7);refreshMap();
    const nr=BRAD_PATH[S.bradIndex];if(nr==='etage'){trigStair();return;}
    if(S.selectedRoom===nr)selectRoom(nr);if(S.selectedRoom===BRAD_PATH[S.bradIndex-1])selectRoom(S.selectedRoom);schedBrad();
  }
  let bradTO=null;
  function schedBrad(){
    if(S.over) return;
    if(BRAD_INACTIVE) return; // Brad inactif : ne jamais bouger
    clearTimeout(bradTO);const iv=bradInterval(),w=S.selectedRoom===BRAD_PATH[S.bradIndex];bradTO=setTimeout(moveBrad,(w?iv:iv*0.6)+Math.random()*4000);
  }

  function trigStair(){if(S.stairActive)return;S.stairActive=true;stairAlert.classList.remove('hidden');ps(SND.pound,0.9);const total=Math.max(STAIR_M,STAIR_B-(STAIR_B-STAIR_M)*S.nightProgress);const start=Date.now();function tick(){if(!S.stairActive)return;const rem=Math.max(0,total-(Date.now()-start));stairFill.style.width=((rem/total)*100)+'%';if(rem<=0)trigJsBrad();else S.stairTimer=requestAnimationFrame(tick);}S.stairTimer=requestAnimationFrame(tick);}
  function resolveStair(){if(!S.stairActive)return;S.stairActive=false;cancelAnimationFrame(S.stairTimer);stairAlert.classList.add('hidden');stairFill.style.width='100%';S.bradIndex=Math.max(0,S.bradIndex-1);S.bradPhase=1;refreshMap();schedBrad();}

  // Mama Coco
  function mamaCheckInterval(){return Math.max(MAMA_CHECK_MIN,MAMA_CHECK_BASE-(MAMA_CHECK_BASE-MAMA_CHECK_MIN)*S.nightProgress);}
  function mamaMaxLook(){return Math.max(MAMA_MAX_LOOK_M,MAMA_MAX_LOOK_B-(MAMA_MAX_LOOK_B-MAMA_MAX_LOOK_M)*S.nightProgress);}
  function schedMamaCheck(){if(S.over||!S.mama.active)return;clearTimeout(S.mama.checkTimer);S.mama.checkTimer=setTimeout(()=>{if(!S.over)advanceMama();},mamaCheckInterval());}
  function advanceMama(){if(S.over)return;if(S.mama.phase==='inactive'){setMamaPhase('debout');S.mama.checkTimer=setTimeout(()=>{if(!S.over&&S.mama.phase==='debout')setMamaPhase('partie');},mamaCheckInterval()*0.5);}else if(S.mama.phase==='debout'){setMamaPhase('partie');}}
  function setMamaPhase(phase){if(S.over)return;S.mama.phase=phase;ps(SND.pas,0.7);if(S.selectedRoom==='rue')camImg.src=getMamaImg();if(phase==='partie'){clearTimeout(S.mama.partieTimer);setTimeout(()=>{if(!S.over&&S.mama.phase==='partie')ps(SND.fast,0.9);},Math.max(0,MAMA_PARTE_DELAY-MAMA_FASTRUN_LD));S.mama.partieTimer=setTimeout(()=>{if(!S.over&&S.mama.phase==='partie')trigJsMama();},MAMA_PARTE_DELAY);}if(roomRue)roomRue.classList.toggle('mama-alert',phase==='partie');}
  function startLookingMama(){if(S.over||!S.mama.active)return;S.mama.lookStartTime=Date.now();if(S.mama.phase==='debout'){S.mama._lookReset=setTimeout(()=>{if(S.selectedRoom==='rue'&&S.mama.phase==='debout'){setMamaPhase('inactive');schedMamaCheck();}},MAMA_MIN_LOOK);}S.mama._lookLong=setTimeout(()=>{if(S.selectedRoom==='rue'&&!S.over)trigJsMama();},mamaMaxLook());}
  function stopLookingMama(){clearTimeout(S.mama._lookReset);clearTimeout(S.mama._lookLong);S.mama.lookStartTime=null;if(S.mama.active&&S.mama.phase==='inactive')schedMamaCheck();}

  // Boîte à musique
  let mbBlinkIv=null;
  function startMbDrain(){
    if(FRANK_INACTIVE){ S.musicBox.draining=false; return; } // Frank inactif : pas de drain
    S.musicBox.draining=true;S.musicBox.lastTick=Date.now();mbLoop();
  }
  function mbLoop(){if(S.over||!S.musicBox.draining)return;const now=Date.now();S.musicBox.gauge=Math.max(0,S.musicBox.gauge-(now-S.musicBox.lastTick)/MB_DRAIN_MS);S.musicBox.lastTick=now;drawMbGauge();updateMbWarn();if(S.musicBox.gauge<=0&&!S.musicBox.frankOut&&!S.musicBox.frankTimer){S.musicBox.frankOut=true;if(S.selectedRoom==='etage-2')camImg.src=FRANK_IMG.critical;S.musicBox.frankTimer=setTimeout(()=>trigJsFrank(),MB_FRANK_DELAY+Math.random()*3000);}if(S.selectedRoom==='etage-2')camImg.src=getFrankImg();setTimeout(mbLoop,100);}
  function drawMbGauge(){if(!mbCanvas)return;const ctx=mbCanvas.getContext('2d'),W=mbCanvas.width,H=mbCanvas.height,cx=W/2,cy=H/2,r=W/2-5;ctx.clearRect(0,0,W,H);ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=5;ctx.stroke();if(S.musicBox.gauge>0){const ea=-Math.PI/2+Math.PI*2*S.musicBox.gauge;const col=S.musicBox.gauge>0.5?'#2a8a2a':S.musicBox.gauge>MB_WARN?'#c0a010':'#cc2020';ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,ea);ctx.strokeStyle=col;ctx.lineWidth=5;ctx.lineCap='round';ctx.stroke();}}
  function updateMbWarn(){const g=S.musicBox.gauge;if(S.musicBox.frankOut){if(S.musicBox.warnState!=='red'){S.musicBox.warnState='red';setMbMapWarn('red');if(SND.mb)SND.mb.pause();if(!S.musicBox.critPlaying&&SND.crit){S.musicBox.critPlaying=true;SND.crit.volume=0.85;SND.crit.play().catch(()=>{});}}}else if(g<=MB_CRIT&&g>0){if(S.musicBox.warnState!=='red'){S.musicBox.warnState='red';setMbMapWarn('red');if(SND.mb)SND.mb.pause();if(!S.musicBox.critPlaying&&SND.crit){S.musicBox.critPlaying=true;SND.crit.volume=0.85;SND.crit.play().catch(()=>{});}}}else if(g<=MB_WARN&&g>MB_CRIT){if(S.musicBox.warnState!=='yellow'){S.musicBox.warnState='yellow';setMbMapWarn('yellow');if(SND.mb)SND.mb.pause();if(!S.musicBox.critPlaying&&SND.crit){S.musicBox.critPlaying=true;SND.crit.volume=0.65;SND.crit.play().catch(()=>{});}}}else if(g>MB_WARN){if(S.musicBox.warnState!=='none'){S.musicBox.warnState='none';setMbMapWarn('none');ss(SND.crit);S.musicBox.critPlaying=false;if(S.selectedRoom==='etage-2'&&SND.mb&&!S.over){SND.mb.volume=S.callPlaying?0.2:0.65;SND.mb.play().catch(()=>{});}}}}
  function setMbMapWarn(t){if(!mbMapWarn)return;mbMapWarn.className='musicbox-map-warn';clearInterval(mbBlinkIv);if(t==='none'){mbMapWarn.classList.add('hidden');mbMapWarn.style.opacity='1';return;}mbMapWarn.classList.remove('hidden');mbMapWarn.classList.add(t==='red'?'warn-red':'warn-yellow');const spd=t==='red'?280:600;let v=true;mbBlinkIv=setInterval(()=>{v=!v;mbMapWarn.style.opacity=v?'1':'0';},spd);}

  let rewActive=false,rewIv=null,rewSndCD=false;
  function startRew(){if(rewActive||S.over||S.musicBox.frankOut)return;rewActive=true;if(btnRewind)btnRewind.classList.add('holding');rewIv=setInterval(()=>{S.musicBox.gauge=Math.min(1,S.musicBox.gauge+REWIND_RATE);if(!rewSndCD&&SND.rew){rewSndCD=true;SND.rew.currentTime=0;SND.rew.volume=0.7;SND.rew.play().catch(()=>{});setTimeout(()=>{rewSndCD=false;},REWIND_SND_CD);}drawMbGauge();updateMbWarn();},100);}
  function stopRew(){rewActive=false;if(btnRewind)btnRewind.classList.remove('holding');if(rewIv){clearInterval(rewIv);rewIv=null;}}
  if(btnRewind){btnRewind.addEventListener('mousedown',startRew);btnRewind.addEventListener('touchstart',e=>{e.preventDefault();startRew();},{passive:false});btnRewind.addEventListener('mouseup',stopRew);btnRewind.addEventListener('mouseleave',stopRew);btnRewind.addEventListener('touchend',stopRew);btnRewind.addEventListener('touchcancel',stopRew);}

  // Play Audio
  btnAudio.addEventListener('click',()=>{if(S.audioCooldown||S.modules.audio.error||S.over)return;if(S.selectedRoom==='etage-2'||S.selectedRoom==='rue')return;playHello();if(S.stairActive){startAudioCD();setTimeout(()=>{if(!S.over)resolveStair();},1500);return;}const ti=BRAD_PATH.indexOf(S.selectedRoom),bi=S.bradIndex;startAudioCD();clearTimeout(bradTO);setTimeout(()=>{if(S.over)return;if(ti!==-1&&ti===bi-1){S.bradIndex=Math.max(0,bi-1);S.bradPhase=S.bradIndex===0?2:1;}else if(ti!==-1&&ti>bi){S.bradIndex=Math.min(BRAD_PATH.length-2,bi+1);S.bradPhase=1;if(BRAD_PATH[S.bradIndex]==='etage'){trigStair();return;}ps(SND.pound,0.5);}refreshMap();if(S.selectedRoom===BRAD_PATH[S.bradIndex]||S.selectedRoom===BRAD_PATH[bi])selectRoom(S.selectedRoom);schedBrad();},3000);});
  function startAudioCD(){S.audioCooldown=true;btnAudio.disabled=true;btnAudio.textContent='Audio en cours...';setTimeout(()=>{S.audioCooldown=false;btnAudio.disabled=false;btnAudio.textContent='Play audio';},5000);}

  // Maintenance
  btnMaint.addEventListener('click',()=>{if(S.over)return;ps(SND.tabO,0.6);panelMaint.classList.remove('hidden');});
  btnMaintClose.addEventListener('click',()=>{if(Object.values(S.modules).some(m=>m.rebooting)){maintLockMsg.classList.remove('hidden');setTimeout(()=>maintLockMsg.classList.add('hidden'),2000);return;}ps(SND.tabC,0.6);panelMaint.classList.add('hidden');});
  document.querySelectorAll('.maint-item').forEach(item=>item.addEventListener('click',()=>{const m=item.dataset.module;if(!m||!S.modules[m]||S.modules[m].rebooting||!S.modules[m].error)return;rebootMod(m,6000+Math.random()*4000);}));
  $id('maint-reboot-all').addEventListener('click',()=>{if(S.rebootingAll)return;S.rebootingAll=true;['audio','camera'].forEach(m=>{if(S.modules[m]&&!S.modules[m].rebooting){S.modules[m].rebooting=true;S.modules[m].error=false;}});rebootSnd();updateModIndicators();updateMaintBtn();selectRoom(S.selectedRoom);setTimeout(()=>{['audio','camera'].forEach(m=>{if(S.modules[m])S.modules[m].rebooting=false;});S.rebootingAll=false;updateErrDisp();updateModIndicators();updateMaintBtn();selectRoom(S.selectedRoom);},REBOOT_ALL_DUR);});
  function rebootMod(m,dur){const mod=S.modules[m];if(!mod)return;mod.rebooting=true;mod.error=false;rebootSnd();updateModIndicators();updateMaintBtn();if(m==='camera')selectRoom(S.selectedRoom);setTimeout(()=>{mod.rebooting=false;updateErrDisp();updateModIndicators();updateMaintBtn();if(m==='camera')selectRoom(S.selectedRoom);},dur||8000);}
  function updateMaintBtn(){if(hasErr()){btnMaint.classList.add('has-error');btnMaint.textContent='Maintenance — erreur';}else{btnMaint.classList.remove('has-error');btnMaint.textContent='Maintenance';}}
  const blinkIvs={};
  function startBlink(el,col,spd){stopBlink(el);let v=true;el.style.color=col;blinkIvs[el.id]=setInterval(()=>{v=!v;el.style.opacity=v?'1':'0';},spd);}
  function stopBlink(el){if(blinkIvs[el.id]){clearInterval(blinkIvs[el.id]);delete blinkIvs[el.id];}el.style.opacity='1';}
  function updateModIndicators(){['audio','camera'].forEach(m=>{const mod=S.modules[m],status=$id('maint-'+m+'-status');if(!status||!mod)return;status.removeAttribute('style');stopBlink(status);if(mod.error){status.textContent='erreur';status.style.cssText='font-weight:bold;font-size:10px;letter-spacing:2px;';startBlink(status,'#cc2020',350);}else if(mod.rebooting){status.textContent='redémarrage...';status.style.cssText='font-size:10px;letter-spacing:2px;';startBlink(status,'#c0a010',600);}else{status.textContent='OK';status.style.cssText='color:#2a8a2a;font-size:10px;letter-spacing:2px;opacity:1;';}});}
  function schedNextErr(){if(S.over)return;const iv=Math.max(ERR_MIN,ERR_BASE-(ERR_BASE-ERR_MIN)*S.nightProgress);setTimeout(()=>{if(S.over||S.callPlaying){schedNextErr();return;}const t=['audio','camera'].filter(m=>!S.modules[m].error&&!S.modules[m].rebooting);if(t.length){const m=t[Math.floor(Math.random()*t.length)];S.modules[m].error=true;updateErrDisp();updateModIndicators();updateMaintBtn();startAlarm();}schedNextErr();},iv*(0.7+Math.random()*0.6));}
  let alarmIv=null;
  function startAlarm(){if(alarmIv)return;ps(SND.alarm,0.7);alarmIv=setInterval(()=>{if(hasErr())ps(SND.alarm,0.7);else{clearInterval(alarmIv);alarmIv=null;}},2500);}
  function hasErr(){return Object.values(S.modules).some(m=>m.error);}
  function updateErrDisp(){const errs=Object.entries(S.modules).filter(([,m])=>m.error).map(([k])=>'erreur '+k);if(errs.length){errDisp.classList.remove('hidden');errText.textContent=errs.join(' — ');}else errDisp.classList.add('hidden');}

  // Appel
  function startCall(){if(S.over)return;S.callPlaying=true;pauseAmbiance();if(SND.mb)SND.mb.volume=0.2;SND.call.volume=0.75;SND.call.play().catch(()=>{});setTimeout(()=>{if(S.callPlaying)btnMuteCall.classList.remove('hidden');},5000);SND.call.onended=()=>{if(S.callMuted)return;S.callPlaying=false;btnMuteCall.classList.add('hidden');if(SND.mb&&S.selectedRoom==='etage-2')SND.mb.volume=0.65;S.ambiancePaused=false;startAmbiance();startMbDrain();startMamaCoco();};}
  btnMuteCall.addEventListener('click',()=>{if(S.callMuted)return;S.callMuted=true;ss(SND.call);btnMuteCall.classList.add('hidden');S.callPlaying=false;if(SND.mb&&S.selectedRoom==='etage-2')SND.mb.volume=0.65;S.ambiancePaused=false;startAmbiance();startMbDrain();startMamaCoco();});
  function startMamaCoco(){
    if(MAMA_INACTIVE) return; // Mama inactive : ne jamais bouger
    if(S.mama.active||S.over)return;S.mama.active=true;schedMamaCheck();
  }
  function playRings(n,done){if(n<=0||S.over){if(done)done();return;}ps(SND.ring,0.7);const dur=(SND.ring&&SND.ring.duration>0)?SND.ring.duration*1000:2000;setTimeout(()=>playRings(n-1,done),dur+RING_PAUSE_MS);}

  // Jumpscares
  function cleanup(){stopAllAmbiance();clearTimeout(bradTO);clearInterval(mbBlinkIv);clearInterval(rewIv);if(S.musicBox.frankTimer)clearTimeout(S.musicBox.frankTimer);if(S.mama.checkTimer)clearTimeout(S.mama.checkTimer);if(S.mama.partieTimer)clearTimeout(S.mama.partieTimer);if(S.mama._lookReset)clearTimeout(S.mama._lookReset);if(S.mama._lookLong)clearTimeout(S.mama._lookLong);document.querySelectorAll('audio').forEach(a=>{if(a.id!=='snd-night-end'){try{a.pause();a.currentTime=0;}catch(e){}}});}
  function trigJsBrad(){if(S.over)return;S.over=true;cleanup();screenGame.classList.add('hidden');$id('screen-jumpscare').classList.remove('hidden');JV_brad.muted=false;JV_brad.volume=1;JV_brad.play().catch(()=>{});const d=$id('death-sub');if(d)d.textContent='Brad Bitt vous a trouvé.';setTimeout(()=>{$id('screen-jumpscare').classList.add('hidden');showDeath();},JUMPSCARE_DUR);}
  function trigJsFrank(){if(S.over)return;S.over=true;cleanup();screenGame.classList.add('hidden');$id('screen-jumpscare-frank').classList.remove('hidden');JV_frank.muted=false;JV_frank.volume=1;JV_frank.play().catch(()=>{});const d=$id('death-sub');if(d)d.textContent='Frank Lebœuf vous a trouvé.';setTimeout(()=>{$id('screen-jumpscare-frank').classList.add('hidden');showDeath();},JUMPSCARE_DUR);}
  function trigJsMama(){if(S.over)return;S.over=true;cleanup();screenGame.classList.add('hidden');$id('screen-jumpscare-mama').classList.remove('hidden');JV_mama.muted=false;JV_mama.volume=1;JV_mama.play().catch(()=>{});const d=$id('death-sub');if(d)d.textContent='Mama Coco vous a trouvé.';setTimeout(()=>{$id('screen-jumpscare-mama').classList.add('hidden');showDeath();},JUMPSCARE_DUR);}
  function showDeath(){$id('screen-death').classList.remove('hidden');ps(SND.dead,0.9);const dc=$id('death-noise');if(dc){const dctx=dc.getContext('2d');(function dn(){if($id('screen-death').classList.contains('hidden'))return;dc.width=window.innerWidth;dc.height=window.innerHeight;const img=dctx.createImageData(dc.width,dc.height);for(let i=0;i<img.data.length;i+=4){const v=Math.random()>0.5?255:0;img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=Math.random()*20;}dctx.putImageData(img,0,0);requestAnimationFrame(dn);})();}const btn=$id('death-btn-menu');if(btn){btn.style.display='none';setTimeout(()=>{btn.style.display='block';btn.classList.add('visible');},DEATH_MIN);btn.addEventListener('click',()=>{window.location.href='bonus.html';});}}

  // Horloge
  function startClock(){const t0=Date.now(),hiv=NIGHT_DURATION/(HOURS.length-1);function tick(){if(S.over)return;const el=Date.now()-t0;S.nightProgress=Math.min(1,el/NIGHT_DURATION);const hi=Math.min(Math.floor(el/hiv),HOURS.length-1);if(hi!==S.currentHour){S.currentHour=hi;hudHour.textContent=HOURS[hi];if(hi>=BRAD_VISIBLE_HOUR&&!S.bradVisible){S.bradVisible=true;refreshMap();selectRoom(S.selectedRoom);}}if(S.nightProgress>=1){trigNightEnd();return;}requestAnimationFrame(tick);}requestAnimationFrame(tick);}

  // Fin de nuit — retour bonus
  function trigNightEnd(){if(S.over)return;S.over=true;cleanup();
    if(window.Achievements){
      Achievements.unlock('custom_win');
      const d=JSON.parse(localStorage.getItem('fnaf_custom_diffs')||'{}');
      if(d.brad>=10&&d.frank>=10&&d.mama>=10) Achievements.unlock('custom_max');
    }screenGame.classList.add('hidden');screenNightEnd.classList.remove('hidden');// Nettoyer le flag custom
    try{localStorage.removeItem('fnaf_custom_active');}catch(e){}
    ps(SND.end,0.8);const audioDur=(SND.end&&SND.end.duration>0)?SND.end.duration*1000:4000;setTimeout(()=>{window.location.href='bonus.html';},audioDur+3000);}

  // DEV shortcut
  if(hudHour)hudHour.addEventListener('click',()=>{if(!S.over)trigNightEnd();});

  // Démarrage
  function startNight(){
    try{if(localStorage.getItem('fnaf_irl_etage2_visited')==='1')S.etage2Visited=true;if(localStorage.getItem('fnaf_irl_rue_visited')==='1')S.rueVisited=true;}catch(e){}
    if(!S.etage2Visited&&roomEtage2)roomEtage2.classList.add('first-visit');
    ps(SND.start,0.8);
    setTimeout(()=>{
      ss(SND.start);
      screenStart.classList.add('hidden');
      screenGame.classList.remove('hidden');
      drawNoise();drawMbGauge();
      // Afficher le badge de difficulté
      const badge=$id('custom-diff-badge');
      if(badge){
        const bTxt = BRAD_INACTIVE  ? 'Brad : inactif'  : `Brad ${CUSTOM.brad}/10`;
        const fTxt = FRANK_INACTIVE ? 'Frank : inactif' : `Frank ${CUSTOM.frank}/10`;
        const mTxt = MAMA_INACTIVE  ? 'Mama : inactive' : `Mama ${CUSTOM.mama}/10`;
        badge.textContent = bTxt + ' · ' + fTxt + ' · ' + mTxt;
      }
      selectRoom('cellier');refreshMap();updateModIndicators();
      startMbDrain();
      startClock();schedBrad();schedNextErr();
      setTimeout(()=>playRings(2,()=>startCall()),1000);
    },3000);
  }
})();
