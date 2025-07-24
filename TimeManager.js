/**
 * Démarre ou reprend le chronomètre du match.
 */
function startMatchTimer() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentTime = new Date().getTime(); // Moment exact où le chrono démarre

  scriptProperties.setProperty('startTime', currentTime.toString());
  scriptProperties.setProperty('isTimerRunning', 'true');
  Logger.log("Chronomètre démarré. StartTime: " + currentTime);
  // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
  ouvrirTableauDeBord();
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
  // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
  ouvrirTableauDeBord();
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
  // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
  ouvrirTableauDeBord();
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
  // L'appel au refresh se fait déjà dans startMatchTimer(), donc pas besoin ici.
  // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>')); // <-- LIGNE À SUPPRIMER
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
  const alertMessage = scriptProperties.getProperty('alertMessage') || ''; // Garder pour le retour si d'autres fonctions l'utilisent

  let tempsDeJeuMs;

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
  // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>')); // <-- LIGNE À SUPPRIMER
}
