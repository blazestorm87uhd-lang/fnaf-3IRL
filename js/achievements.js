/* ═══════════════════════════════════════════
   ACHIEVEMENTS.JS
   Système de succès persistants
   Chargé dans toutes les pages de jeu et dans bonus.html
════════════════════════════════════════════ */

const Achievements = (() => {

  const STORAGE_KEY = 'fnaf_irl_achievements';

  // ── Catalogue complet ──
  const CATALOGUE = [

    // ── Progression ──
    { id:'night1',       cat:'Progression', icon:'★', name:'Première nuit',           desc:'Survivre à la nuit 1.',                              secret:false },
    { id:'night2',       cat:'Progression', icon:'★', name:'Deuxième nuit',           desc:'Survivre à la nuit 2.',                              secret:false },
    { id:'night3',       cat:'Progression', icon:'★', name:'Troisième nuit',          desc:'Survivre à la nuit 3.',                              secret:false },
    { id:'nightmare',    cat:'Progression', icon:'☆', name:'Cauchemar accompli',      desc:'Survivre à la nuit Nightmare.',                      secret:false },
    { id:'custom_win',   cat:'Progression', icon:'⊙', name:'Nuit personnalisée',      desc:'Terminer une Custom Night.',                         secret:false },

    // ── Jumpscares ──
    { id:'js_brad',      cat:'Rencontres',  icon:'!', name:'Il vous a trouvé',        desc:'Subir un jumpscare de Brad Bitt.',                   secret:false },
    { id:'js_frank',     cat:'Rencontres',  icon:'!', name:'Frank s\'invite',         desc:'Subir un jumpscare de Frank Lebœuf.',                secret:false },
    { id:'js_mama',      cat:'Rencontres',  icon:'!', name:'Visite nocturne',         desc:'Subir un jumpscare de Mama Coco.',                   secret:false },
    { id:'js_all',       cat:'Rencontres',  icon:'☠', name:'Collectionneur',          desc:'Subir un jumpscare de chaque robot.',                secret:false },

    // ── Mécanique ──
    { id:'mute_call',    cat:'Mécanique',   icon:'✦', name:'Pas envie d\'écouter',    desc:'Muter un appel téléphonique.',                       secret:false },
    { id:'rewind_first', cat:'Mécanique',   icon:'✦', name:'Musicien du dimanche',    desc:'Rembobiner la boîte à musique pour la première fois.',secret:false },
    { id:'reboot_module',cat:'Mécanique',   icon:'✦', name:'Technicien',              desc:'Redémarrer un module en maintenance.',                secret:false },
    { id:'reboot_all',   cat:'Mécanique',   icon:'✦', name:'Tout réinitialiser',      desc:'Utiliser "Tout redémarrer" en maintenance.',          secret:false },
    { id:'all_cameras',  cat:'Mécanique',   icon:'✦', name:'Voyeur',                  desc:'Visiter toutes les caméras en une seule nuit.',       secret:false },

    // ── Défi ──
    { id:'no_audio',     cat:'Défi',        icon:'◈', name:'Silence radio',           desc:'Finir une nuit sans utiliser Play Audio.',            secret:false },
    { id:'no_mute',      cat:'Défi',        icon:'◈', name:'Bon élève',               desc:'Finir une nuit sans muter l\'appel.',                 secret:false },
    { id:'no_error',     cat:'Défi',        icon:'◈', name:'Zéro défaut',             desc:'Finir une nuit sans aucune erreur système.',          secret:false },
    { id:'mb_above50',   cat:'Défi',        icon:'◈', name:'Chef d\'orchestre',       desc:'Terminer la nuit 3 sans laisser la jauge descendre sous 50%.',  secret:false },
    { id:'custom_max',   cat:'Défi',        icon:'◈', name:'Masochiste',              desc:'Finir une Custom Night avec Brad, Frank et Mama à 10/10.',      secret:false },

    // ── Nightmare ──
    { id:'nm_no_mute',   cat:'Nightmare',   icon:'☠', name:'Jusqu\'au bout',         desc:'Finir Nightmare sans muter l\'appel.',                secret:false },
    { id:'nm_no_error',  cat:'Nightmare',   icon:'☠', name:'Indestructible',         desc:'Finir Nightmare sans aucune erreur système.',         secret:false },

    // ── Secrets ──
    { id:'js_fast',      cat:'Secret',      icon:'?', name:'???',                     desc:'Découvrir le secret de la nuit.',                     secret:true, realDesc:'Subir un jumpscare dans les 2 premières minutes.' },
    { id:'dev_skip',     cat:'Secret',      icon:'?', name:'Tricheur',                desc:'???',                                                 secret:true, realDesc:'Utiliser le raccourci développeur pour passer une nuit.' },
  ];

  // ── Stockage ──
  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) { return {}; }
  }
  function saveAll(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
  }
  function isUnlocked(id) {
    return !!loadAll()[id];
  }
  function getUnlockTime(id) {
    const d = loadAll(); return d[id] ? d[id].ts : null;
  }

  // ── Débloquer un succès ──
  function unlock(id) {
    const entry = CATALOGUE.find(a => a.id === id);
    if (!entry) return false;
    const data = loadAll();
    if (data[id]) return false; // Déjà débloqué
    data[id] = { ts: Date.now() };
    saveAll(data);
    showToast(entry);
    return true;
  }

  // ── Toast de notification ──
  function showToast(entry) {
    // Supprimer toast existant
    const existing = document.getElementById('achievement-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'achievement-toast';
    toast.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);
      z-index:9999;background:#0a0a0a;
      border:0.5px solid rgba(192,160,16,0.5);
      padding:12px 20px;display:flex;align-items:center;gap:14px;
      font-family:'Share Tech Mono',monospace;
      transition:transform 0.4s cubic-bezier(0.16,1,0.3,1),opacity 0.4s;
      opacity:0;min-width:260px;max-width:min(90vw,400px);
      box-shadow:0 0 20px rgba(192,160,16,0.15);
    `;

    const iconEl = document.createElement('div');
    iconEl.style.cssText = 'font-size:22px;flex-shrink:0;color:#c0a010;';
    iconEl.textContent = entry.icon;

    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

    const topLine = document.createElement('div');
    topLine.style.cssText = 'font-size:8px;letter-spacing:4px;color:#c0a010;';
    topLine.textContent = 'SUCCÈS DÉBLOQUÉ';

    const nameLine = document.createElement('div');
    nameLine.style.cssText = 'font-size:12px;letter-spacing:2px;color:#ddd;';
    nameLine.textContent = entry.name;

    const descLine = document.createElement('div');
    descLine.style.cssText = 'font-size:9px;letter-spacing:1px;color:#555;';
    descLine.textContent = entry.secret ? (entry.realDesc || entry.desc) : entry.desc;

    textWrap.appendChild(topLine);
    textWrap.appendChild(nameLine);
    textWrap.appendChild(descLine);
    toast.appendChild(iconEl);
    toast.appendChild(textWrap);
    document.body.appendChild(toast);

    // Animation entrée
    requestAnimationFrame(() => requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
      toast.style.opacity = '1';
    }));

    // Sortie après 4s
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(80px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 450);
    }, 4000);
  }

  // ── Stats ──
  function getStats() {
    const data = loadAll();
    const total    = CATALOGUE.length;
    const unlocked = Object.keys(data).length;
    return { total, unlocked, pct: Math.round((unlocked/total)*100) };
  }

  return { CATALOGUE, unlock, isUnlocked, getUnlockTime, loadAll, getStats, showToast };

})();

// Exposer globalement
window.Achievements = Achievements;
