// Dans TimeManager.gs

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
 * C'est la même logique que startMatchTimer, mais on la sépare pour la clarté.
 */
function resumeMatchTimer() {
  startMatchTimer(); // Réutilise la fonction startMatchTimer pour la reprise
}

/**
 * Calcule le temps de jeu écoulé et la phase actuelle du match.
 * @returns {{isTimerRunning: boolean, tempsDeJeuMs: number, tempsDeJeuFormatted: string, phase: string, message: string}} L'état actuel du temps et du match.
 */
function getMatchTimeState() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const isTimerRunning = scriptProperties.getProperty('isTimerRunning') === 'true';
  const currentPhase = scriptProperties.getProperty('currentMatchPhase') || 'non_demarre';
  const startTime = parseInt(scriptProperties.getProperty('startTime') || '0', 10);
  const gameTimeAtLastPause = parseInt(scriptProperties.getProperty('gameTimeAtLastPause') || '0', 10);
  const alertMessage = scriptProperties.getProperty('alertMessage') || '';

  let tempsDeJeuMs; // Initialisation par défaut

  // 1. Déterminer le temps de base en fonction de l'état du chrono (en cours ou en pause normale)
  if (isTimerRunning && startTime > 0) {
    const currentTime = new Date().getTime();
    tempsDeJeuMs = gameTimeAtLastPause + (currentTime - startTime);
    if (tempsDeJeuMs < 0) tempsDeJeuMs = 0; // Sécurité
  } else {
    tempsDeJeuMs = gameTimeAtLastPause;
  }

  // 2. Surcharger le temps si le match est dans une phase spécifique (non_demarre, gel du temps, fin_de_match)
  if (currentPhase === 'non_demarre') {
    tempsDeJeuMs = 0; // Au tout début, le chrono est à zéro
  } else if (currentPhase === 'awaiting_conversion' || currentPhase === 'awaiting_penalty_kick') {
    const gameTimeAtEventMs = parseInt(scriptProperties.getProperty('gameTimeAtEventMs') || '0', 10);
    tempsDeJeuMs = gameTimeAtEventMs; // Fige le temps à celui de l'événement
  } else if (currentPhase === 'fin_de_match') {
    tempsDeJeuMs = parseInt(scriptProperties.getProperty('finalDisplayedTimeMs') || '0', 10);
  }
  // La phase 'mi_temps' utilise implicitement `gameTimeAtLastPause`, ce qui est correct.

  return {
    isTimerRunning: isTimerRunning,
    tempsDeJeuMs: tempsDeJeuMs,
    // Appel à la fonction de formatage qui se trouve dans Utils.gs
    tempsDeJeuFormatted: formatMillisecondsToHMS(tempsDeJeuMs),
    phase: currentPhase,
    message: alertMessage
  };
}