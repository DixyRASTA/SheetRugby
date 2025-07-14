/**
 * @file Gère toute la logique et l'état du chronomètre du match.
 */

/**
 * Démarre le chronomètre du match (ou le reprend après une pause).
 * Enregistre le temps de début de la période de jeu en cours.
 */
function startMatchTimer() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const isTimerRunning = scriptProperties.getProperty('isTimerRunning') === 'true';

  if (!isTimerRunning) {
    const now = new Date().getTime();
    scriptProperties.setProperty('matchStartTime', now.toString()); // Enregistre le VRAI début du chrono 
    scriptProperties.setProperty('isTimerRunning', 'true');
    Logger.log("Chronomètre démarré ou repris.");
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
    let gameTimeAtLastPause = parseInt(scriptProperties.getProperty('gameTimeAtLastPause') || '0', 10);

    // Ajoute le temps écoulé depuis le dernier démarrage/reprise au temps accumulé
    gameTimeAtLastPause += (now - matchStartTime); // Accumule le temps de la dernière "course" du chrono
    scriptProperties.setProperty('gameTimeAtLastPause', gameTimeAtLastPause.toString());
    
    scriptProperties.setProperty('isTimerRunning', 'false');
    Logger.log("Chronomètre mis en pause. Temps de jeu accumulé: " + formatMillisecondsToHMS(gameTimeAtLastPause));
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
  scriptProperties.setProperty('gameTimeAtLastPause', '0'); // Le temps total de jeu accumulé est remis à zéro
  scriptProperties.setProperty('matchStartTime', '0'); // Le point de départ pour la prochaine "course" du chrono
  scriptProperties.setProperty('finalDisplayedTimeMs', '0');
  Logger.log("Chronomètre réinitialisé.");
}

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

  // LOGIQUE DE RÉAJUSTEMENT ET CALCUL DU TEMPS DE JEU
  if (isTimerRunning) {
    const now = new Date().getTime();
    // Le temps de jeu est le temps accumulé PRÉCÉDEMMENT (gameTimeAtLastPause)
    // plus le temps écoulé depuis la dernière mise en marche (now - matchStartTime)
    tempsDeJeuMs = gameTimeAtLastPause + (now - matchStartTime);
    if (tempsDeJeuMs < 0) tempsDeJeuMs = 0; // Sécurité pour éviter les temps négatifs
  } else {
    // Si le chrono n'est PAS en cours, le temps de jeu est simplement le temps accumulé jusqu'à la dernière pause
    tempsDeJeuMs = gameTimeAtLastPause;
  }

  // Gérer les cas où le chrono doit être à 0 ou à un temps final
  if (currentMatchPhase === 'non_demarre' || currentMatchPhase === 'mi_temps') {
    tempsDeJeuMs = 0; // Dans ces phases, le chrono affiché est 0
    // On s'assure que les propriétés internes reflètent bien un état "non couru" pour ces phases
    scriptProperties.setProperty('isTimerRunning', 'false');
    scriptProperties.setProperty('gameTimeAtLastPause', '0');
    scriptProperties.setProperty('matchStartTime', '0');
  } else if (currentMatchPhase === 'fin_de_match') {
    tempsDeJeuMs = parseInt(scriptProperties.getProperty('finalDisplayedTimeMs') || '0', 10);
    // Assurer que le chrono est arrêté
    scriptProperties.setProperty('isTimerRunning', 'false');
  }

  return {
    isTimerRunning: isTimerRunning,
    tempsDeJeuMs: tempsDeJeuMs,
    tempsDeJeuFormatted: formatMillisecondsToHMS(tempsDeJeuMs)
  };
}