/* ═══════════════════════════════════════════
   GAME-NIGHTMARE.JS
   Brad + Frank + Mama Coco — fréquence maximale
   Appel : nightmare-call.m4a
   Ambiance : ambiance-4.wav / ambiance-5.wav alternés
   Fin : générique avec merci.m4a
════════════════════════════════════════════ */
(() => {

  // ══════════════════════════════════════
  // CONFIG — tout plus difficile qu'en nuit 3
  // ══════════════════════════════════════
  const NIGHT_NUMBER     = 'nightmare';
  const NIGHT_DURATION   = 10 * 60 * 1000;
  const HOURS            = ['12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM'];
  const BRAD_VISIBLE_HOUR= 0;  // Actif dès 12AM
  const JUMPSCARE_DUR    = 4000;
  const DEATH_MIN        = 6000;
  const REBOOT_ALL_DUR   = 17000;
  const RING_PAUSE_MS    = 2200;

  // Brad — très rapide
  const BRAD_MOVE_BASE   = 10000;
  const BRAD_MOVE_MIN    = 4000;
  const BRAD_CAM_SHOW    = 6;

  // Frank — drain rapide
  const MB_DRAIN_MS      = 80000;
  const MB_WARN          = 0.25;
  const MB_CRIT          = 0.10;
  const MB_FRANK_DELAY   = 5000;
  const REWIND_RATE      = 0.007;
  const REWIND_SND_CD    = 750;

  // Mama Coco — très agressive
  const MAMA_CHECK_BASE  = 20000;
  const MAMA_CHECK_MIN   = 10000;
  const MAMA_MAX_LOOK_B  = 5000;
  const MAMA_MAX_LOOK_M  = 3000;
  const MAMA_MIN_LOOK    = 1200;
  const MAMA_PARTE_DELAY = 4000;
  const MAMA_FASTRUN_LD  = 1500;

  // Erreurs — fréquentes
  const ERR_BASE         = 50000;
  const ERR_MIN          = 25000;

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
  const STAIR_B = 7000, STAIR_M = 2500;

  // ══════════════════════════════════════
  // ÉTAT
  // ══════════════════════════════════════
  const S = {
    over:false, nightProgress:0, currentHour:0,
    selectedRoom:'cellier', bradVisible:false,
    bradIndex:0, bradPhase:1, bradMaxIndex:0,
    stairActive:false, stairTimer:null,
    modules:{ audio:{error:false,rebooting:false}, camera:{error:false,rebooting:false} },
    callPlaying:false, callMuted:false,
    ambiancePaused:false, audioCooldown:false,
    helloToggle:false, rebootingAll:false,
    ambIdx:0, // 0=ambiance-4, 1=ambiance-5
    musicBox:{gauge:1,draining:false,frankOut:false,frankTimer:null,lastTick:0,warnState:'none',critPlaying:false},
    etage2Visited:false,
    mama:{phase:'inactive',active:false,checkTimer:null,lookStartTime:null,partieTimer:null,_lookReset:null,_lookLong:null},
    rueVisited:false,
  };

  // ══════════════════════════════════════
  // DOM
  // ══════════════════════════════════════
  const $id = id => document.getElementById(id);
  const screenGate    = $id('screen-play-gate');
  const btnGate       = $id('btn-play-gate');
  const screenStart   = $id('screen-nightstart');
  const screenGame    = $id('screen-game');
  const screenDeath   = $id('screen-death');
  const screenCredits = $id('screen-credits');
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

  const JV_brad  = $id('jumpscare-video');
  const JV_frank = $id('jumpscare-frank-video');
  const JV_mama  = $id('jumpscare-mama-video');

  // Sons
  const SND = {
    amb4:   $id('snd-ambiance-4'),
    amb5:   $id('snd-ambiance-5'),
    ring:   $id('snd-ring'),
    call:   $id('snd-nm-call'),
    start:  $id('snd-night-start'),
    end:    $id('snd-night-end'),
    merci:  $id('snd-merci'),
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

  // ── Ambiance alternée ──
  let ambCurrent = null;
  function startAmbiance() {
    if (S.ambiancePaused || S.over) return;
    stopAmbiance();
    ambCurrent = S.ambIdx===0 ? SND.amb4 : SND.amb5;
    if (ambCurrent) { ambCurrent.volume=0.38; ambCurrent.play().catch(()=>{}); }
  }
  function stopAmbiance() {
    [SND.amb4, SND.amb5].forEach(a => { if(a){a.pause();a.currentTime=0;} });
    ambCurrent = null;
  }
  function pauseAmbiance() { S.ambiancePaused=true; stopAmbiance(); }
  function resumeAmbiance() {
    S.ambiancePaused=false;
    // Alterner
    S.ambIdx = (S.ambIdx+1)%2;
    setTimeout(()=>{ if(!S.over&&!S.ambiancePaused) startAmbiance(); }, 1500);
  }
  function stopAllAmbiance() { S.ambiancePaused=true; stopAmbiance(); }

  // ── Bruit statique ──
  function resNoise(){noiseCanvas.width=window.innerWidth;noiseCanvas.height=window.innerHeight;}
  resNoise(); window.addEventListener('resize',resNoise);
  function drawNoise(){
    if(S.over) return;
    const w=noiseCanvas.width,h=noiseCanvas.height;
    const img=nctx.createImageData(w,h);
    for(let i=0;i<img.data.length;i+=4){
      const v=Math.random()>0.5?255:0;
      img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=Math.random()*18;
    }
    nctx.putImageData(img,0,0); requestAnimationFrame(drawNoise);
  }

  // ── Play Gate ──
  const gc=document.getElementById('gate-noise');
  if(gc){const gctx=gc.getContext('2d');(function gn(){
    if(!screenGate||screenGate.classList.contains('hidden')) return;
    gc.width=window.innerWidth;gc.height=window.innerHeight;
    const img=gctx.createImageData(gc.width,gc.height);
    for(let i=0;i<img.data.length;i+=4){const v=Math.random()>0.5?255:0;img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=Math.random()*22;}
    gctx.putImageData(img,0,0);requestAnimationFrame(gn);
  })();}

  btnGate.addEventListener('click',()=>{
    try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const buf=ctx.createBuffer(1,1,22050);const src=ctx.createBufferSource();src.buffer=buf;src.connect(ctx.destination);src.start(0);}catch(e){}
    screenGate.classList.add('hidden');
    screenStart.classList.remove('hidden');
    startNight();
  });

  // ── Overlays caméra ──
  function showNoSignal(){
    camImg.style.display='none';
    let o=$id('cam-no-signal');
    if(!o){
      o=document.createElement('div');o.id='cam-no-signal';
      o.style.cssText='position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;';
      const c=document.createElement('canvas');c.style.cssText='position:absolute;inset:0;width:100%;height:100%;opacity:0.85;';o.appendChild(c);
      const t=document.createElement('div');t.style.cssText="position:relative;z-index:2;font-family:'Share Tech Mono',monospace;font-size:13px;letter-spacing:4px;color:#cc2020;text-align:center;animation:blink 0.8s step-start infinite;";
      t.innerHTML="PAS D'IMAGE<br><span style='font-size:10px;color:#555;'>SON UNIQUEMENT</span>";o.appendChild(t);camView.appendChild(o);
      const sc=c.getContext('2d');(function ds(){const el=$id('cam-no-signal');if(!el||el.style.display==='none') return;c.width=c.offsetWidth||400;c.height=c.offsetHeight||300;const img=sc.createImageData(c.width,c.height);for(let i=0;i<img.data.length;i+=4){const v=Math.floor(Math.random()*80);img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=255;}sc.putImageData(img,0,0);requestAnimationFrame(ds);})();
    }
    o.style.display='flex'; hideBlack();
  }
  function hideNoSignal(){const o=$id('cam-no-signal');if(o)o.style.display='none';camImg.style.display='block';}
  function showBlack(){
    camImg.style.display='none';hideNoSignal();
    let b=$id('cam-black');
    if(!b){b=document.createElement('div');b.id='cam-black';b.style.cssText="position:absolute;inset:0;z-index:6;background:#000;display:flex;align-items:center;justify-content:center;";const t=document.createElement('div');t.style.cssText="font-family:'Share Tech Mono',monospace;font-size:11px;color:#333;letter-spacing:4px;animation:blink 1.2s step-start infinite;";t.textContent='SIGNAL PERDU';b.appendChild(t);camView.appendChild(b);}
    b.style.display='flex';
  }
  function hideBlack(){const b=$id('cam-black');if(b)b.style.display='none';camImg.style.display='block';}

  // ── Caméras ──
  function getFrankImg(){
    if(S.musicBox.frankOut) return FRANK_IMG.critical;
    if(S.musicBox.gauge<=MB_WARN) return FRANK_IMG.warning;
    return FRANK_IMG.safe;
  }
  function getMamaImg(){ return MAMA_IMG[S.mama.phase]||MAMA_IMG.inactive; }
  function hideMbPanel(){const p=$id('musicbox-panel');if(p)p.style.display='none';}
  function showMbPanel(){const p=$id('musicbox-panel');if(p)p.style.display='flex';}

  function selectRoom(r){
    if(!panelMaint.classList.contains('hidden')) return;
    if(S.selectedRoom==='rue' && r!=='rue') stopLookingMama();
    if(r==='etage'){
      _setRoom(r,'CAM — ACCÈS ÉTAGE 1'); showNoSignal(); hideMbPanel();
      if(BRAD_PATH[S.bradIndex]==='etage'&&S.bradVisible) ps(SND.robot,0.6); return;
    }
    if(S.modules.camera.error||S.modules.camera.rebooting){
      _setRoom(r,`CAM — ${r.replace(/-/g,' ').toUpperCase()}`); hideMbPanel();
      if(r==='rue'||r==='etage-2'){hideBlack();showNoSignal();}else{hideNoSignal();showBlack();}
      if(SND.mb) SND.mb.volume=0; return;
    }
    hideNoSignal();hideBlack();
    if(SND.mb) SND.mb.volume=0;
    _setRoom(r,`CAM — ${r.replace(/-/g,' ').toUpperCase()}`);
    ps(SND.clic,0.5);
    if(r==='rue'){
      hideMbPanel(); camImg.src=getMamaImg();
      if(!S.rueVisited){S.rueVisited=true;try{localStorage.setItem('fnaf_irl_rue_visited','1');}catch(e){};if(roomRue)roomRue.classList.remove('first-visit');}
      startLookingMama(); return;
    }
    if(r==='etage-2'){
      showMbPanel(); camImg.src=getFrankImg();
      if(SND.mb&&!S.over&&S.musicBox.warnState==='none'){SND.mb.volume=S.callPlaying?0.2:0.65;SND.mb.play().catch(()=>{});}
      if(!S.etage2Visited){S.etage2Visited=true;try{localStorage.setItem('fnaf_irl_etage2_visited','1');}catch(e){};if(roomEtage2)roomEtage2.classList.remove('first-visit');}
      return;
    }
    hideMbPanel();
    let baseSrc=CAM_IMAGES[r]||'';
    const thr=DOOR_THRESHOLDS[r];
    if(thr!==undefined&&S.bradMaxIndex>thr){
      if(r==='salle-de-bain') baseSrc='assets/images/cameras/salle-de-bain-ouverte.jpeg';
      if(r==='cuisine') baseSrc='assets/images/cameras/cuisine-ouverte.jpeg';
    }
    const bHere=BRAD_PATH[S.bradIndex]===r&&S.bradVisible;
    if(bHere){
      let k=r;
      if(r==='cellier') k='cellier-'+S.bradPhase;
      if(r==='cuisine'&&Math.random()<0.05) k='cuisine-rare';
      if(r==='couloir') ps(SND.robot,0.6);
      camImg.src=BRAD_IMG[k]||baseSrc;
    } else { camImg.src=baseSrc; }
  }
  function _setRoom(r,label){
    S.selectedRoom=r; mapRooms.forEach(el=>el.classList.remove('active'));
    const el=$id('room-'+r); if(el) el.classList.add('active');
    camBadge.textContent=label;
  }

  mapRooms.forEach(el=>el.addEventListener('click',()=>{if(el.dataset.room)selectRoom(el.dataset.room);}));

  // ── Carte Brad ──
  function refreshMap(){
    mapRooms.forEach(r=>r.classList.remove('brad-here'));
    if(!S.bradVisible||S.bradIndex<BRAD_CAM_SHOW) return;
    const el=$id('room-'+BRAD_PATH[S.bradIndex]); if(el) el.classList.add('brad-here');
  }

  // ── Brad ──
  function bradInterval(){ return Math.max(BRAD_MOVE_MIN,BRAD_MOVE_BASE-(BRAD_MOVE_BASE-BRAD_MOVE_MIN)*S.nightProgress); }
  function moveBrad(){
    if(S.over||S.bradIndex>=BRAD_PATH.length-1) return;
    if(!S.bradVisible){schedBrad();return;}
    if(S.bradIndex===0&&S.bradPhase===1){S.bradPhase=2;refreshMap();if(S.selectedRoom==='cellier')selectRoom('cellier');schedBrad();return;}
    S.bradIndex++;S.bradPhase=1;
    if(S.bradIndex>S.bradMaxIndex) S.bradMaxIndex=S.bradIndex;
    ps(SND.pound,0.7);refreshMap();
    const nr=BRAD_PATH[S.bradIndex];
    if(nr==='etage'){trigStair();return;}
    if(S.selectedRoom===nr) selectRoom(nr);
    if(S.selectedRoom===BRAD_PATH[S.bradIndex-1]) selectRoom(S.selectedRoom);
    schedBrad();
  }
  let bradTO=null;
  function schedBrad(){
    if(S.over) return; clearTimeout(bradTO);
    const iv=bradInterval(), w=S.selectedRoom===BRAD_PATH[S.bradIndex];
    bradTO=setTimeout(moveBrad,(w?iv:iv*0.55)+Math.random()*3000);
  }

  // ── Escalier ──
  function trigStair(){
    if(S.stairActive) return; S.stairActive=true;
    stairAlert.classList.remove('hidden'); ps(SND.pound,0.9);
    const total=Math.max(STAIR_M,STAIR_B-(STAIR_B-STAIR_M)*S.nightProgress);
    const start=Date.now();
    function tick(){
      if(!S.stairActive) return;
      const rem=Math.max(0,total-(Date.now()-start));
      stairFill.style.width=((rem/total)*100)+'%';
      if(rem<=0) trigJsBrad(); else S.stairTimer=requestAnimationFrame(tick);
    }
    S.stairTimer=requestAnimationFrame(tick);
  }
  function resolveStair(){
    if(!S.stairActive) return; S.stairActive=false;
    cancelAnimationFrame(S.stairTimer); stairAlert.classList.add('hidden'); stairFill.style.width='100%';
    S.bradIndex=Math.max(0,S.bradIndex-1);S.bradPhase=1;refreshMap();schedBrad();
  }

  // ── Mama Coco ──
  function mamaCheckInterval(){ return Math.max(MAMA_CHECK_MIN,MAMA_CHECK_BASE-(MAMA_CHECK_BASE-MAMA_CHECK_MIN)*S.nightProgress); }
  function mamaMaxLook(){ return Math.max(MAMA_MAX_LOOK_M,MAMA_MAX_LOOK_B-(MAMA_MAX_LOOK_B-MAMA_MAX_LOOK_M)*S.nightProgress); }
  function schedMamaCheck(){
    if(S.over||!S.mama.active) return;
    clearTimeout(S.mama.checkTimer);
    S.mama.checkTimer=setTimeout(()=>{ if(!S.over) advanceMama(); }, mamaCheckInterval());
  }
  function advanceMama(){
    if(S.over) return;
    if(S.mama.phase==='inactive'){
      setMamaPhase('debout');
      S.mama.checkTimer=setTimeout(()=>{ if(!S.over&&S.mama.phase==='debout') setMamaPhase('partie'); }, mamaCheckInterval()*0.4);
    } else if(S.mama.phase==='debout'){
      setMamaPhase('partie');
    }
  }
  function setMamaPhase(phase){
    if(S.over) return;
    S.mama.phase=phase;
    ps(SND.pas,0.7);
    if(S.selectedRoom==='rue') camImg.src=getMamaImg();
    if(phase==='partie'){
      clearTimeout(S.mama.partieTimer);
      setTimeout(()=>{ if(!S.over&&S.mama.phase==='partie') ps(SND.fast,0.9); }, Math.max(0,MAMA_PARTE_DELAY-MAMA_FASTRUN_LD));
      S.mama.partieTimer=setTimeout(()=>{ if(!S.over&&S.mama.phase==='partie') trigJsMama(); }, MAMA_PARTE_DELAY);
    }
    // Indicateur sur carte
    if(roomRue){
      roomRue.classList.toggle('mama-alert', phase==='partie');
    }
  }
  function startLookingMama(){
    if(S.over||!S.mama.active) return;
    S.mama.lookStartTime=Date.now();
    if(S.mama.phase==='debout'){
      S.mama._lookReset=setTimeout(()=>{
        if(S.selectedRoom==='rue'&&S.mama.phase==='debout'){setMamaPhase('inactive');schedMamaCheck();}
      }, MAMA_MIN_LOOK);
    }
    S.mama._lookLong=setTimeout(()=>{ if(S.selectedRoom==='rue'&&!S.over) trigJsMama(); }, mamaMaxLook());
  }
  function stopLookingMama(){
    clearTimeout(S.mama._lookReset); clearTimeout(S.mama._lookLong);
    S.mama.lookStartTime=null;
    if(S.mama.active&&S.mama.phase==='inactive') schedMamaCheck();
  }

  // ── Boîte à musique (Frank) ──
  let mbBlinkIv=null;
  function startMbDrain(){ S.musicBox.draining=true; S.musicBox.lastTick=Date.now(); mbLoop(); }
  function mbLoop(){
    if(S.over||!S.musicBox.draining) return;
    const now=Date.now();
    S.musicBox.gauge=Math.max(0,S.musicBox.gauge-(now-S.musicBox.lastTick)/MB_DRAIN_MS);
    S.musicBox.lastTick=now;
    drawMbGauge(); updateMbWarn();
    if(S.musicBox.gauge<=0&&!S.musicBox.frankOut&&!S.musicBox.frankTimer){
      S.musicBox.frankOut=true;
      if(S.selectedRoom==='etage-2') camImg.src=FRANK_IMG.critical;
      S.musicBox.frankTimer=setTimeout(()=>trigJsFrank(), MB_FRANK_DELAY+Math.random()*2000);
    }
    if(S.selectedRoom==='etage-2') camImg.src=getFrankImg();
    setTimeout(mbLoop,100);
  }
  function drawMbGauge(){
    if(!mbCanvas) return;
    const ctx=mbCanvas.getContext('2d'),W=mbCanvas.width,H=mbCanvas.height,cx=W/2,cy=H/2,r=W/2-5;
    ctx.clearRect(0,0,W,H);
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=5;ctx.stroke();
    if(S.musicBox.gauge>0){
      const ea=-Math.PI/2+Math.PI*2*S.musicBox.gauge;
      const col=S.musicBox.gauge>0.5?'#2a8a2a':S.musicBox.gauge>MB_WARN?'#c0a010':'#cc2020';
      ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,ea);ctx.strokeStyle=col;ctx.lineWidth=5;ctx.lineCap='round';ctx.stroke();
    }
  }
  function updateMbWarn(){
    const g=S.musicBox.gauge;
    if(S.musicBox.frankOut){
      if(S.musicBox.warnState!=='red'){S.musicBox.warnState='red';setMbMapWarn('red');if(SND.mb)SND.mb.pause();if(!S.musicBox.critPlaying&&SND.crit){S.musicBox.critPlaying=true;SND.crit.volume=0.85;SND.crit.play().catch(()=>{});}}
    } else if(g<=MB_CRIT&&g>0){
      if(S.musicBox.warnState!=='red'){S.musicBox.warnState='red';setMbMapWarn('red');if(SND.mb)SND.mb.pause();if(!S.musicBox.critPlaying&&SND.crit){S.musicBox.critPlaying=true;SND.crit.volume=0.85;SND.crit.play().catch(()=>{});}}
    } else if(g<=MB_WARN&&g>MB_CRIT){
      if(S.musicBox.warnState!=='yellow'){S.musicBox.warnState='yellow';setMbMapWarn('yellow');if(SND.mb)SND.mb.pause();if(!S.musicBox.critPlaying&&SND.crit){S.musicBox.critPlaying=true;SND.crit.volume=0.65;SND.crit.play().catch(()=>{});}}
    } else if(g>MB_WARN){
      if(S.musicBox.warnState!=='none'){S.musicBox.warnState='none';setMbMapWarn('none');ss(SND.crit);S.musicBox.critPlaying=false;if(S.selectedRoom==='etage-2'&&SND.mb&&!S.over){SND.mb.volume=S.callPlaying?0.2:0.65;SND.mb.play().catch(()=>{});}}
    }
  }
  function setMbMapWarn(t){
    if(!mbMapWarn) return; mbMapWarn.className='musicbox-map-warn'; clearInterval(mbBlinkIv);
    if(t==='none'){mbMapWarn.classList.add('hidden');mbMapWarn.style.opacity='1';return;}
    mbMapWarn.classList.remove('hidden'); mbMapWarn.classList.add(t==='red'?'warn-red':'warn-yellow');
    const spd=t==='red'?280:600; let v=true;
    mbBlinkIv=setInterval(()=>{v=!v;mbMapWarn.style.opacity=v?'1':'0';},spd);
  }

  // Rembobinage
  let rewActive=false,rewIv=null,rewSndCD=false;
  function startRew(){
    if(rewActive||S.over||S.musicBox.frankOut) return;
    rewActive=true; if(btnRewind) btnRewind.classList.add('holding');
    rewIv=setInterval(()=>{
      S.musicBox.gauge=Math.min(1,S.musicBox.gauge+REWIND_RATE);
      if(!rewSndCD&&SND.rew){rewSndCD=true;SND.rew.currentTime=0;SND.rew.volume=0.7;SND.rew.play().catch(()=>{});setTimeout(()=>{rewSndCD=false;},REWIND_SND_CD);}
      drawMbGauge();updateMbWarn();
    },100);
  }
  function stopRew(){
    rewActive=false; if(btnRewind) btnRewind.classList.remove('holding');
    if(rewIv){clearInterval(rewIv);rewIv=null;}
  }
  if(btnRewind){
    btnRewind.addEventListener('mousedown',startRew);
    btnRewind.addEventListener('touchstart',e=>{e.preventDefault();startRew();},{passive:false});
    btnRewind.addEventListener('mouseup',stopRew);
    btnRewind.addEventListener('mouseleave',stopRew);
    btnRewind.addEventListener('touchend',stopRew);
    btnRewind.addEventListener('touchcancel',stopRew);
  }

  // ── Play Audio ──
  btnAudio.addEventListener('click',()=>{
    if(S.audioCooldown||S.modules.audio.error||S.over) return;
    if(S.selectedRoom==='etage-2'||S.selectedRoom==='rue') return;
    playHello();
    if(S.stairActive){startAudioCD();setTimeout(()=>{if(!S.over)resolveStair();},1500);return;}
    const ti=BRAD_PATH.indexOf(S.selectedRoom),bi=S.bradIndex;
    startAudioCD();clearTimeout(bradTO);
    setTimeout(()=>{
      if(S.over) return;
      if(ti!==-1&&ti===bi-1){S.bradIndex=Math.max(0,bi-1);S.bradPhase=S.bradIndex===0?2:1;}
      else if(ti!==-1&&ti>bi){S.bradIndex=Math.min(BRAD_PATH.length-2,bi+1);S.bradPhase=1;if(BRAD_PATH[S.bradIndex]==='etage'){trigStair();return;}ps(SND.pound,0.5);}
      refreshMap();
      if(S.selectedRoom===BRAD_PATH[S.bradIndex]||S.selectedRoom===BRAD_PATH[bi]) selectRoom(S.selectedRoom);
      schedBrad();
    },3000);
  });
  function startAudioCD(){
    S.audioCooldown=true;btnAudio.disabled=true;btnAudio.textContent='Audio en cours...';
    setTimeout(()=>{S.audioCooldown=false;btnAudio.disabled=false;btnAudio.textContent='Play audio';},5000);
  }

  // ── Maintenance ──
  btnMaint.addEventListener('click',()=>{if(S.over) return;ps(SND.tabO,0.6);panelMaint.classList.remove('hidden');});
  btnMaintClose.addEventListener('click',()=>{
    if(Object.values(S.modules).some(m=>m.rebooting)){maintLockMsg.classList.remove('hidden');setTimeout(()=>maintLockMsg.classList.add('hidden'),2000);return;}
    ps(SND.tabC,0.6);panelMaint.classList.add('hidden');
  });
  document.querySelectorAll('.maint-item').forEach(item=>item.addEventListener('click',()=>{
    const m=item.dataset.module;if(!m||!S.modules[m]||S.modules[m].rebooting||!S.modules[m].error) return;
    rebootMod(m,6000+Math.random()*4000);
  }));
  $id('maint-reboot-all').addEventListener('click',()=>{
    if(S.rebootingAll) return; S.rebootingAll=true;
    ['audio','camera'].forEach(m=>{if(S.modules[m]&&!S.modules[m].rebooting){S.modules[m].rebooting=true;S.modules[m].error=false;}});
    rebootSnd();updateModIndicators();updateMaintBtn();selectRoom(S.selectedRoom);
    setTimeout(()=>{['audio','camera'].forEach(m=>{if(S.modules[m])S.modules[m].rebooting=false;});S.rebootingAll=false;updateErrDisp();updateModIndicators();updateMaintBtn();selectRoom(S.selectedRoom);},REBOOT_ALL_DUR);
  });
  function rebootMod(m,dur){
    const mod=S.modules[m];if(!mod) return;
    mod.rebooting=true;mod.error=false;rebootSnd();updateModIndicators();updateMaintBtn();
    if(m==='camera') selectRoom(S.selectedRoom);
    setTimeout(()=>{mod.rebooting=false;updateErrDisp();updateModIndicators();updateMaintBtn();if(m==='camera')selectRoom(S.selectedRoom);},dur||8000);
  }
  function updateMaintBtn(){
    if(hasErr()){btnMaint.classList.add('has-error');btnMaint.textContent='Maintenance — erreur';}
    else{btnMaint.classList.remove('has-error');btnMaint.textContent='Maintenance';}
  }

  const blinkIvs={};
  function startBlink(el,col,spd){
    stopBlink(el);let v=true;el.style.color=col;
    blinkIvs[el.id]=setInterval(()=>{v=!v;el.style.opacity=v?'1':'0';},spd);
  }
  function stopBlink(el){if(blinkIvs[el.id]){clearInterval(blinkIvs[el.id]);delete blinkIvs[el.id];}el.style.opacity='1';}
  function updateModIndicators(){
    ['audio','camera'].forEach(m=>{
      const mod=S.modules[m],status=$id('maint-'+m+'-status');if(!status||!mod) return;
      status.removeAttribute('style');stopBlink(status);
      if(mod.error){status.textContent='erreur';status.style.cssText='font-weight:bold;font-size:10px;letter-spacing:2px;';startBlink(status,'#cc2020',350);}
      else if(mod.rebooting){status.textContent='redémarrage...';status.style.cssText='font-size:10px;letter-spacing:2px;';startBlink(status,'#c0a010',600);}
      else{status.textContent='OK';status.style.cssText='color:#2a8a2a;font-size:10px;letter-spacing:2px;opacity:1;';}
    });
  }
  function schedNextErr(){
    if(S.over) return;
    const iv=Math.max(ERR_MIN,ERR_BASE-(ERR_BASE-ERR_MIN)*S.nightProgress);
    setTimeout(()=>{
      if(S.over||S.callPlaying){schedNextErr();return;}
      const t=['audio','camera'].filter(m=>!S.modules[m].error&&!S.modules[m].rebooting);
      if(t.length){const m=t[Math.floor(Math.random()*t.length)];S.modules[m].error=true;updateErrDisp();updateModIndicators();updateMaintBtn();startAlarm();}
      schedNextErr();
    },iv*(0.7+Math.random()*0.6));
  }
  let alarmIv=null;
  function startAlarm(){
    if(alarmIv) return; ps(SND.alarm,0.7);
    alarmIv=setInterval(()=>{if(hasErr())ps(SND.alarm,0.7);else{clearInterval(alarmIv);alarmIv=null;}},2500);
  }
  function hasErr(){ return Object.values(S.modules).some(m=>m.error); }
  function updateErrDisp(){
    const errs=Object.entries(S.modules).filter(([,m])=>m.error).map(([k])=>'erreur '+k);
    if(errs.length){errDisp.classList.remove('hidden');errText.textContent=errs.join(' — ');}
    else errDisp.classList.add('hidden');
  }

  // ── Appel ──
  function startCall(){
    if(S.over) return; S.callPlaying=true; pauseAmbiance();
    if(SND.mb) SND.mb.volume=0.2;
    SND.call.volume=0.75; SND.call.play().catch(()=>{});
    setTimeout(()=>{if(S.callPlaying)btnMuteCall.classList.remove('hidden');},5000);
    SND.call.onended=()=>{
      if(S.callMuted) return;
      S.callPlaying=false;btnMuteCall.classList.add('hidden');
      if(SND.mb&&S.selectedRoom==='etage-2') SND.mb.volume=0.65;
      S.ambiancePaused=false; startAmbiance();
      startMbDrain(); startMamaCoco();
    };
  }
  btnMuteCall.addEventListener('click',()=>{
    if(S.callMuted) return; S.callMuted=true; ss(SND.call);
    btnMuteCall.classList.add('hidden'); S.callPlaying=false;
    if(SND.mb&&S.selectedRoom==='etage-2') SND.mb.volume=0.65;
    S.ambiancePaused=false; startAmbiance();
    startMbDrain(); startMamaCoco();
  });
  function startMamaCoco(){ if(S.mama.active||S.over) return; S.mama.active=true; schedMamaCheck(); }

  function playRings(n,done){
    if(n<=0||S.over){if(done)done();return;}
    ps(SND.ring,0.7);
    const dur=(SND.ring&&SND.ring.duration>0)?SND.ring.duration*1000:2000;
    setTimeout(()=>playRings(n-1,done),dur+RING_PAUSE_MS);
  }

  // ── Jumpscares ──
  function cleanup(){
    stopAllAmbiance();clearTimeout(bradTO);clearInterval(mbBlinkIv);clearInterval(rewIv);
    if(S.musicBox.frankTimer)clearTimeout(S.musicBox.frankTimer);
    if(S.mama.checkTimer)clearTimeout(S.mama.checkTimer);
    if(S.mama.partieTimer)clearTimeout(S.mama.partieTimer);
    if(S.mama._lookReset)clearTimeout(S.mama._lookReset);
    if(S.mama._lookLong)clearTimeout(S.mama._lookLong);
    document.querySelectorAll('audio').forEach(a=>{if(a.id!=='snd-night-end'&&a.id!=='snd-merci'){try{a.pause();a.currentTime=0;}catch(e){}}});
  }
  function doJumpscare(video, deathMsg, onDone){
    if(S.over) return; S.over=true; cleanup();
    screenGame.classList.add('hidden');
    video.closest('[id^="screen-jumpscare"]').classList.remove('hidden');
    video.muted=false; video.volume=1; video.play().catch(()=>{});
    const ds=$id('death-sub'); if(ds) ds.textContent=deathMsg;
    setTimeout(()=>{video.closest('[id^="screen-jumpscare"]').classList.add('hidden');showDeath();if(onDone)onDone();},JUMPSCARE_DUR);
  }
  function trigJsBrad(){doJumpscare(JV_brad,'Brad Bitt vous a trouvé.');}
  function trigJsFrank(){doJumpscare(JV_frank,'Frank Lebœuf vous a trouvé.');}
  function trigJsMama(){doJumpscare(JV_mama,'Mama Coco vous a trouvé.');}

  function showDeath(){
    $id('screen-death').classList.remove('hidden'); ps(SND.dead,0.9);
    const dc=$id('death-noise');
    if(dc){const dctx=dc.getContext('2d');(function dn(){if($id('screen-death').classList.contains('hidden')) return;dc.width=window.innerWidth;dc.height=window.innerHeight;const img=dctx.createImageData(dc.width,dc.height);for(let i=0;i<img.data.length;i+=4){const v=Math.random()>0.5?255:0;img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=Math.random()*20;}dctx.putImageData(img,0,0);requestAnimationFrame(dn);})();}
    const btn=$id('death-btn-menu');
    if(btn){btn.style.display='none';setTimeout(()=>{btn.style.display='block';btn.classList.add('visible');},DEATH_MIN);btn.addEventListener('click',()=>{window.location.href='index.html';});}
  }

  // ── Horloge ──
  function startClock(){
    const t0=Date.now(), hiv=NIGHT_DURATION/(HOURS.length-1);
    function tick(){
      if(S.over) return;
      const el=Date.now()-t0; S.nightProgress=Math.min(1,el/NIGHT_DURATION);
      const hi=Math.min(Math.floor(el/hiv),HOURS.length-1);
      if(hi!==S.currentHour){
        S.currentHour=hi; hudHour.textContent=HOURS[hi];
        if(hi>=BRAD_VISIBLE_HOUR&&!S.bradVisible){S.bradVisible=true;refreshMap();selectRoom(S.selectedRoom);}
      }
      if(S.nightProgress>=1){trigNightEnd();return;}
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ── Fin de nuit ──
  function trigNightEnd(){
    if(S.over) return; S.over=true; cleanup();
    screenGame.classList.add('hidden');
    Save.completeNight('nightmare');
    showNightEndAnimation();
  }

  function showNightEndAnimation(){
    // Afficher écran nightend (même structure que les autres nuits)
    let endScr = document.getElementById('screen-nightend-nm');
    if(!endScr){
      endScr = document.createElement('div');
      endScr.id = 'screen-nightend-nm';
      endScr.style.cssText = 'position:fixed;inset:0;background:#000;z-index:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;';
      const timeEl = document.createElement('div');
      timeEl.id = 'nm-end-time';
      timeEl.style.cssText = "font-family:'Cinzel',serif;font-size:clamp(36px,7vw,72px);font-weight:700;color:#cc2020;letter-spacing:8px;";
      timeEl.innerHTML = '<span id="nm-end-number">5</span> AM';
      const nightEl = document.createElement('div');
      nightEl.style.cssText = "font-family:'Cinzel',serif;font-size:clamp(20px,4vw,40px);font-weight:700;color:#8a1010;letter-spacing:10px;";
      nightEl.textContent = 'NIGHTMARE';
      endScr.appendChild(timeEl); endScr.appendChild(nightEl);
      document.body.appendChild(endScr);
    }
    endScr.style.display='flex';

    // Démarrer merci.m4a en fondu progressif
    if(SND.merci){
      SND.merci.volume=0; SND.merci.play().catch(()=>{});
      let vol=0;
      const fi=setInterval(()=>{
        vol=Math.min(vol+0.02,0.75); SND.merci.volume=vol;
        if(vol>=0.75) clearInterval(fi);
      },80);
    }

    // Animation 5→6AM
    const numEl = document.getElementById('nm-end-number');
    if(numEl){
      setTimeout(()=>{
        numEl.style.cssText='display:inline-block;transition:all 1.4s ease;opacity:0;transform:translateY(40px);';
        setTimeout(()=>{
          numEl.textContent='6';
          numEl.style.cssText='display:inline-block;transition:all 1.4s ease;opacity:1;transform:translateY(0);';
        },1600);
      },800);
    }

    // Après animation → générique
    setTimeout(()=>{
      endScr.style.transition='opacity 1s'; endScr.style.opacity='0';
      setTimeout(()=>{ endScr.remove(); showCredits(); },1100);
    },5000);
  }

  // ── DEV SHORTCUT ──
  if(hudHour) hudHour.addEventListener('click',()=>{if(!S.over)trigNightEnd();});
  const hudNight=$id('hud-night'); if(hudNight) hudNight.addEventListener('click',()=>{if(!S.over)trigNightEnd();});

  // ══════════════════════════════════════
  // GÉNÉRIQUE DE FIN
  // ══════════════════════════════════════
  function showCredits(){
    const sc = screenCredits;
    sc.classList.remove('hidden');

    if(SND.merci && SND.merci.paused){ SND.merci.volume=0.75; SND.merci.play().catch(()=>{}); }

    const slides = [
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

    // Conteneur centré — tout s'affiche ici
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:0 24px;pointer-events:none;';
    sc.appendChild(wrap);

    let idx = 0;

    function fadeIn(el, dur) {
      dur = dur || 1000;
      el.style.opacity = '0';
      el.style.transition = 'opacity ' + dur + 'ms ease';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ el.style.opacity = '1'; }));
    }
    function clearWrap(cb) {
      const children = Array.from(wrap.children);
      children.forEach(ch => { ch.style.transition = 'opacity 1s ease'; ch.style.opacity = '0'; });
      setTimeout(()=>{ wrap.innerHTML = ''; if(cb) cb(); }, 1050);
    }

    function next() {
      if(idx >= slides.length) return;
      const s = slides[idx++];
      if(s.special) { clearWrap(()=>showSpecial(s)); return; }
      if(s.type === 'duo') { clearWrap(()=>showDuo(s)); }
      else                  { clearWrap(()=>showSingle(s)); }
    }

    // DUO : label fixe + noms alternés
    function showDuo(s) {
      // Label fixe
      const lbl = document.createElement('div');
      lbl.className = 'credits-label';
      lbl.textContent = s.label;
      wrap.appendChild(lbl);
      fadeIn(lbl, 800);

      // Nom (div réutilisé)
      const nmEl = document.createElement('div');
      nmEl.className = 'credits-name';
      nmEl.textContent = s.studios[0];
      wrap.appendChild(nmEl);
      fadeIn(nmEl, 800);

      // Après dur : fade out NOM seulement → afficher studio 2 → fade out TOUT
      setTimeout(()=>{
        nmEl.style.transition = 'opacity 900ms ease';
        nmEl.style.opacity = '0';
        setTimeout(()=>{
          nmEl.textContent = s.studios[1];
          fadeIn(nmEl, 900);
          setTimeout(()=>clearWrap(next), s.dur);
        }, 950);
      }, s.dur);
    }

    // SINGLE : label + nom ensemble
    function showSingle(s) {
      if(s.label) {
        const lbl = document.createElement('div');
        lbl.className = 'credits-label';
        lbl.textContent = s.label;
        wrap.appendChild(lbl);
        fadeIn(lbl);
      }
      const nm = document.createElement('div');
      nm.className = 'credits-name' + (s.highlight ? ' highlight' : '');
      nm.textContent = s.name;
      wrap.appendChild(nm);
      fadeIn(nm);
      if(s.sub) {
        const sub = document.createElement('div');
        sub.className = 'credits-sub';
        sub.textContent = s.sub;
        wrap.appendChild(sub);
        fadeIn(sub, 1200);
      }
      if(s.dur > 0) setTimeout(()=>clearWrap(next), s.dur);
    }

    // SPECIAL
    function showSpecial(s) {
      if(s.special === 'ia') {
        const el = document.createElement('div');
        el.className = 'credits-sub';
        el.style.cssText = 'max-width:340px;line-height:2;color:#444;';
        el.innerHTML = "Ce jeu a été développé avec l\'aide de l\'intelligence artificielle.<br>Les idées, la conception et la direction créative<br>restent entièrement humaines.";
        wrap.appendChild(el); fadeIn(el);
        setTimeout(()=>clearWrap(next), s.dur);
      } else if(s.special === 'inspiration') {
        const el = document.createElement('div');
        el.className = 'credits-sub';
        el.style.cssText = 'max-width:340px;line-height:2;color:#333;';
        el.innerHTML = "Ce jeu est inspiré de <span style=\"color:#555\">Five Nights at Freddy\'s</span><br>de Scott Cawthon.<br>Il ne s\'agit pas d\'une œuvre officielle.";
        wrap.appendChild(el); fadeIn(el);
        setTimeout(()=>clearWrap(next), s.dur);
      } else if(s.special === 'final') {
        const finalEl = document.createElement('div');
        finalEl.className = 'credits-final';
        finalEl.textContent = "Brad et ses amis reviendront.";
        wrap.appendChild(finalEl); fadeIn(finalEl);
        setTimeout(()=>{
          const btn = document.createElement('button');
          btn.className = 'credits-continue';
          btn.style.pointerEvents = 'all';
          btn.textContent = 'CLIQUEZ POUR CONTINUER';
          btn.addEventListener('click', ()=>{ window.location.href='index.html'; });
          wrap.appendChild(btn); fadeIn(btn, 600);
        }, 2000);
      }
    }

    next();
  }
  // ══════════════════════════════════════
  // DÉMARRAGE
  // ══════════════════════════════════════
  function startNight(){
    try{
      if(localStorage.getItem('fnaf_irl_etage2_visited')==='1') S.etage2Visited=true;
      if(localStorage.getItem('fnaf_irl_rue_visited')==='1') S.rueVisited=true;
    }catch(e){}
    if(!S.etage2Visited&&roomEtage2) roomEtage2.classList.add('first-visit');

    // Adapter le texte si Custom Night
    try {
      if (localStorage.getItem('fnaf_custom_active')) {
        const nsTime = screenStart.querySelector('.ns-time');
        const nsNight = screenStart.querySelector('.ns-night');
        if (nsNight) nsNight.textContent = 'CUSTOM NIGHT';
        if (nsTime) nsTime.textContent = '12 AM';
      }
    } catch(e) {}

    ps(SND.start,0.8);
    setTimeout(()=>{
      ss(SND.start);
      screenStart.classList.add('hidden');
      screenGame.classList.remove('hidden');
      drawNoise(); drawMbGauge();
      selectRoom('cellier'); refreshMap(); updateModIndicators();
      startMbDrain();
      startClock(); schedBrad(); schedNextErr();
      setTimeout(()=>playRings(2,()=>startCall()),1000);
    },3000);
  }
})();
