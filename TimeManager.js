/**
 * @file Gère toute la logique et l'état du chronomètre du match.
 */

/**
 * Récupère l'état actuel du chronomètre du match.
 * Calcule le temps de jeu écoulé en fonction des propriétés stockées.
 * @returns {Object} Un objet contenant l'état du chrono (isTimerRunning, tempsDeJeuMs, tempsDeJeuFormatted).
 */
function getMatchTimeState() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const isTimerRunning = scriptProperties.getProperty('isTimerRunning') === 'true';
  const currentMatchPhase = scriptProperties.getProperty('currentMatchPhase') || 'non_demarre';

  let tempsDeJeuMs = 0;
  const gameTimeAtLastPause = parseInt(scriptProperties.getProperty('gameTimeAtLastPause') || '0', 10);
  const matchStartTime = parseInt(scriptProperties.getProperty('matchStartTime') || '0', 10);

  if (isTimerRunning) {
    const now = new Date().getTime();
    tempsDeJeuMs = gameTimeAtLastPause + (now - matchStartTime);
    if (tempsDeJeuMs < 0) tempsDeJeuMs = 0; // S'assurer que le temps n'est pas négatif
  } else {
    tempsDeJeuMs = gameTimeAtLastPause; // Si le chrono est arrêté, on affiche le temps figé à la dernière pause
  }

  // Ajuster tempsDeJeuMs à 0 si la phase est 'non_demarre' ou 'mi_temps'
  // ou si le match est terminé, utiliser le temps final enregistré
  if (currentMatchPhase === 'non_demarre' || currentMatchPhase === 'mi_temps') {
    tempsDeJeuMs = 0;
  } else if (currentMatchPhase === 'fin_de_match') {
    // Si le match est terminé, on affiche le temps final qui a été figé
    tempsDeJeuMs = parseInt(scriptProperties.getProperty('finalDisplayedTimeMs') || '0', 10);
  }

  return {
    isTimerRunning: isTimerRunning,
    tempsDeJeuMs: tempsDeJeuMs,
    tempsDeJeuFormatted: formatMillisecondsToHMS(tempsDeJeuMs) // Utilise la fonction de Utils.gs
  };
}

/**
 * Démarre le chronomètre du match (ou le reprend après une pause).
 * Enregistre le temps de début de la période de jeu en cours.
 */
function startMatchTimer() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const isTimerRunning = scriptProperties.getProperty('isTimerRunning') === 'true';

  if (!isTimerRunning) {
    scriptProperties.setProperty('matchStartTime', new Date().getTime().toString());
    scriptProperties.setProperty('isTimerRunning', 'true');
    Logger.log("Chronomètre démarré.");
  } else {
    Logger.log("Le chronomètre est déjà en cours.");
  }
}

/**
 * Met le chronomètre du match en pause.
 * Calcule et enregistre le temps de jeu accumulé jusqu'à cette pause.
 */
function pauseMatchTimer() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const isTimerRunning = scriptProperties.getProperty('isTimerRunning') === 'true';

  if (isTimerRunning) {
    const now = new Date().getTime();
    const matchStartTime = parseInt(scriptProperties.getProperty('matchStartTime') || '0', 10);
    const gameTimeAtLastPause = parseInt(scriptProperties.getProperty('gameTimeAtLastPause') || '0', 10);

    // Ajoute le temps écoulé depuis le dernier démarrage/reprise au temps accumulé
    const newGameTimeAtLastPause = gameTimeAtLastPause + (now - matchStartTime);
    scriptProperties.setProperty('gameTimeAtLastPause', newGameTimeAtLastPause.toString());
    
    scriptProperties.setProperty('isTimerRunning', 'false');
    Logger.log("Chronomètre mis en pause. Temps de jeu accumulé: " + formatMillisecondsToHMS(newGameTimeAtLastPause));
  } else {
    Logger.log("Le chronomètre n'est pas en cours, impossible de le mettre en pause.");
  }
}

/**
 * Reprend le chronomètre du match après une pause.
 * C'est la même logique que startMatchTimer, mais on la sépare pour la clarté.
 */
function resumeMatchTimer() {
  startMatchTimer(); // Réutilise la fonction startMatchTimer pour la reprise
}

/**
 * Réinitialise le chronomètre du match à zéro.
 * Utilisé lors de l'initialisation d'un nouveau match.
 */
function resetMatchTimer() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('isTimerRunning', 'false');
  scriptProperties.setProperty('gameTimeAtLastPause', '0');
  scriptProperties.setProperty('matchStartTime', '0'); // Point de départ pour le prochain démarrage
  scriptProperties.setProperty('finalDisplayedTimeMs', '0'); // S'assurer que le temps final est aussi remis à zéro
  Logger.log("Chronomètre réinitialisé.");
}