/* ═══════════════════════════════════════════
   SAVE — Gestion de la progression
   Stocké dans localStorage sous la clé "fnaf_irl_save"
════════════════════════════════════════════ */

const Save = (() => {

  const KEY = 'fnaf_irl_save';

  const DEFAULT = {
    nightReached:    1,      // nuit max atteinte (1 à 3)
    nightCompleted:  0,      // nuits terminées avec succès
    nightmareUnlocked: false,
    bonusUnlocked:   false,
    currentNight:    null,   // null = pas de partie en cours
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT };
    } catch {
      return { ...DEFAULT };
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Save échoué :', e);
    }
  }

  function reset() {
    localStorage.removeItem(KEY);
  }

  function hasActiveGame() {
    const d = load();
    return d.currentNight !== null;
  }

  function completeNight(nightNumber) {
    const d = load();
    d.nightCompleted = Math.max(d.nightCompleted, nightNumber);
    // Cap à 3 : la nuit 4 n'existe pas (nightmare = séparé)
    d.nightReached   = Math.min(Math.max(d.nightReached, nightNumber + 1), 3);
    d.currentNight   = null;

    if (d.nightCompleted >= 3) d.nightmareUnlocked = true;
    if (d.nightCompleted >= 3) d.bonusUnlocked = true;

    save(d);
    return d;
  }

  function startNight(nightNumber) {
    const d = load();
    d.currentNight = nightNumber;
    save(d);
  }

  return { load, save, reset, hasActiveGame, completeNight, startNight };

})();
