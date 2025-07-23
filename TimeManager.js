/**
 * Démarre ou reprend le chronomètre du match.
 */
function startMatchTimer() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentTime = new Date().getTime(); // Moment exact où le chrono démarre

  scriptProperties.setProperty('startTime', currentTime.toString());
  scriptProperties.setProperty('isTimerRunning', 'true');
  Logger.log("Chronomètre démarré. StartTime: " + currentTime);
}

/**
 * Met le chronomètre du match en pause.
 * Calcule le temps de jeu accumulé.
 */
function pauseMatchTimer() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const startTime = parseInt(scriptProperties.getProperty('startTime') || '0', 10);
  let gameTimeAtLastPause = parseInt(scriptProperties.getProperty('gameTimeAtLastPause') || '0', 10);

  if (scriptProperties.getProperty('isTimerRunning') === 'true' && startTime > 0) {
    const currentTime = new Date().getTime();
    gameTimeAtLastPause += (currentTime - startTime); // Ajoute le temps écoulé depuis le dernier démarrage
    if (gameTimeAtLastPause < 0) gameTimeAtLastPause = 0; // Sécurité
    scriptProperties.setProperty('gameTimeAtLastPause', gameTimeAtLastPause.toString());
    Logger.log("Chronomètre mis en pause. Temps accumulé: " + gameTimeAtLastPause);
  }
  scriptProperties.setProperty('isTimerRunning', 'false');
  scriptProperties.setProperty('startTime', '0'); // <-- TRÈS IMPORTANT : Réinitialiser le startTime après la pause
}

/**
 * Réinitialise complètement le chronomètre du match.
 */
function resetMatchTimer() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('isTimerRunning', 'false');
  scriptProperties.setProperty('startTime', '0');
  scriptProperties.setProperty('gameTimeAtLastPause', '0');
  scriptProperties.setProperty('finalDisplayedTimeMs', '0'); // Réinitialiser le temps final aussi
  Logger.log("Chronomètre réinitialisé.");
}

/**
 * Reprend le chronomètre du match après une pause.
 * @param {number} timeToResumeFrom - Le temps à partir duquel reprendre le chronomètre.
 */
function resumeMatchTimer(timeToResumeFrom) {
  const scriptProperties = PropertiesService.getScriptProperties();

  // Si un temps spécifique est fourni, l'utiliser pour reprendre le chronomètre
  if (timeToResumeFrom) {
    scriptProperties.setProperty('gameTimeAtLastPause', timeToResumeFrom.toString());
  }

  // Démarrer le chronomètre
  startMatchTimer();
}

/**
 * Calcule le temps de jeu écoulé et la phase actuelle du match.
 * @returns {{isTimerRunning: boolean, tempsDeJeuMs: number, tempsDeJeuFormatted: string, phase: string, message: string}} L'état actuel du temps et du match.
 */
function getMatchTimeState() {
  const scriptProperties = PropertiesService.getScriptProperties();

  // Logs retirés ou commentés pour la production
  // Logger.log("getMatchTimeState - Propriétés LUES AU DÉBUT:");
  // Logger.log("  currentMatchPhase (lue): " + scriptProperties.getProperty('currentMatchPhase'));
  // Logger.log("  isTimerRunning (lue): " + scriptProperties.getProperty('isTimerRunning'));
  // Logger.log("  gameTimeAtEventMs (lue): " + scriptProperties.getProperty('gameTimeAtEventMs')); // N'est plus utilisé
  // Logger.log("  startTime (lue): " + scriptProperties.getProperty('startTime'));
  
  const isTimerRunning = scriptProperties.getProperty('isTimerRunning') === 'true';
  const currentPhase = scriptProperties.getProperty('currentMatchPhase') || 'non_demarre';
  const startTime = parseInt(scriptProperties.getProperty('startTime') || '0', 10);
  const gameTimeAtLastPause = parseInt(scriptProperties.getProperty('gameTimeAtLastPause') || '0', 10);
  const alertMessage = scriptProperties.getProperty('alertMessage') || '';

  let tempsDeJeuMs;

  // L'ancienne logique de "temps figé" pour awaiting_conversion/penalty_kick a été supprimée
  // car le chrono ne gèle plus pour ces événements dans le nouveau flux.
  if (isTimerRunning && startTime > 0) {
    const currentTime = new Date().getTime();
    tempsDeJeuMs = gameTimeAtLastPause + (currentTime - startTime);
    if (tempsDeJeuMs < 0) tempsDeJeuMs = 0; // Sécurité
  }
  else { // Si le chrono n'est PAS en cours (pause normale, non démarré, fin de match)
    tempsDeJeuMs = gameTimeAtLastPause;
  }

  // Logique spécifique pour les phases de match finales ou initiales
  if (currentPhase === 'non_demarre') {
    tempsDeJeuMs = 0;
  } else if (currentPhase === 'fin_de_match') {
    tempsDeJeuMs = parseInt(scriptProperties.getProperty('finalDisplayedTimeMs') || '0', 10);
  }
  // La phase 'mi_temps' utilise implicitement `gameTimeAtLastPause`, ce qui est correct.

  return {
    isTimerRunning: isTimerRunning,
    tempsDeJeuMs: tempsDeJeuMs,
    tempsDeJeuFormatted: formatMillisecondsToHMS(tempsDeJeuMs), // Appel à formatMillisecondsToHMS de Utils.gs
    phase: currentPhase,
    message: alertMessage
  };
}