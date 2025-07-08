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
  const matchStartTimeMs = parseInt(scriptProperties.getProperty('matchStartTimeMs') || '0', 10);
  const totalPausedTimeMs = parseInt(scriptProperties.getProperty('totalPausedTimeMs') || '0', 10);
  const lastKnownGameTimeMs = parseInt(scriptProperties.getProperty('lastKnownGameTimeMs') || '0', 10);

  if (isTimerRunning) {
    const now = new Date().getTime();
    tempsDeJeuMs = (now - matchStartTimeMs) - totalPausedTimeMs;
    if (tempsDeJeuMs < 0) tempsDeJeuMs = 0; // S'assurer que le temps n'est pas négatif
  } else {
    tempsDeJeuMs = lastKnownGameTimeMs; // Utilise le dernier temps de jeu enregistré
  }

  // Ajuster tempsDeJeuMs à 0 si la phase est 'non_demarre' ou 'mi_temps' (début de mi-temps)
  // ou si le match est terminé, utiliser le temps final enregistré
  if (currentMatchPhase === 'non_demarre' || currentMatchPhase === 'mi_temps') {
    tempsDeJeuMs = 0;
  } else if (currentMatchPhase === 'fin_de_match') {
    tempsDeJeuMs = parseInt(scriptProperties.getProperty('finalDisplayedTimeMs') || '0', 10);
  }

  return {
    isTimerRunning: isTimerRunning,
    tempsDeJeuMs: tempsDeJeuMs,
    tempsDeJeuFormatted: formatMillisecondsToHMS(tempsDeJeuMs) // Utilise la fonction de Utils.gs
  };
}

/**
 * Démarre le chronomètre du match.
 * Enregistre le temps de début et met le statut du chrono à "en cours".
 */
function startMatchTimer() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const now = new Date().getTime();
  const totalPausedTimeMs = parseInt(scriptProperties.getProperty('totalPausedTimeMs') || '0', 10);

  // Le nouveau temps de début est le temps actuel moins le temps total passé en pause.
  // Cela permet au chrono de reprendre là où il s'est arrêté.
  scriptProperties.setProperty('matchStartTimeMs', now - totalPausedTimeMs);
  scriptProperties.setProperty('isTimerRunning', 'true');
  Logger.log("Chronomètre démarré.");
}

/**
 * Met le chronomètre du match en pause.
 * Enregistre le temps de jeu actuel et met le statut du chrono à "arrêté".
 */
function pauseMatchTimer() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const isTimerRunning = scriptProperties.getProperty('isTimerRunning') === 'true';

  if (isTimerRunning) {
    const now = new Date().getTime();
    const matchStartTimeMs = parseInt(scriptProperties.getProperty('matchStartTimeMs') || '0', 10);
    const totalPausedTimeMs = parseInt(scriptProperties.getProperty('totalPausedTimeMs') || '0', 10);

    // Calcule le temps de jeu écoulé jusqu'à cette pause
    const currentElapsedTimeMs = (now - matchStartTimeMs) - totalPausedTimeMs;
    
    // Met à jour le temps de pause total pour la prochaine reprise
    scriptProperties.setProperty('totalPausedTimeMs', totalPausedTimeMs + (now - (matchStartTimeMs + totalPausedTimeMs)));
    
    scriptProperties.setProperty('lastKnownGameTimeMs', currentElapsedTimeMs); // Enregistre le temps de jeu au moment de la pause
    scriptProperties.setProperty('isTimerRunning', 'false');
    Logger.log("Chronomètre mis en pause. Temps de jeu: " + formatMillisecondsToHMS(currentElapsedTimeMs));
  } else {
    Logger.log("Le chronomètre n'est pas en cours, impossible de le mettre en pause.");
  }
}

/**
 * Reprend le chronomètre du match après une pause.
 * Ajuste le temps de début pour continuer le décompte.
 */
function resumeMatchTimer() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const isTimerRunning = scriptProperties.getProperty('isTimerRunning') === 'true';

  if (!isTimerRunning) {
    const now = new Date().getTime();
    const lastKnownGameTimeMs = parseInt(scriptProperties.getProperty('lastKnownGameTimeMs') || '0', 10);
    
    // Ajuste le temps de début pour que le chrono continue à partir de lastKnownGameTimeMs
    // Le nouveau matchStartTimeMs est le temps actuel moins le temps de jeu déjà écoulé
    scriptProperties.setProperty('matchStartTimeMs', now - lastKnownGameTimeMs);
    scriptProperties.setProperty('isTimerRunning', 'true');
    scriptProperties.setProperty('totalPausedTimeMs', '0'); // Réinitialise le temps de pause pour le prochain calcul
    Logger.log("Chronomètre repris.");
  } else {
    Logger.log("Le chronomètre est déjà en cours, impossible de le reprendre.");
  }
}

/**
 * Réinitialise le chronomètre du match à zéro.
 * Utilisé lors de l'initialisation d'un nouveau match.
 */
function resetMatchTimer() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('isTimerRunning', 'false');
  scriptProperties.setProperty('matchStartTimeMs', '0');
  scriptProperties.setProperty('totalPausedTimeMs', '0');
  scriptProperties.setProperty('lastKnownGameTimeMs', '0');
  scriptProperties.setProperty('finalDisplayedTimeMs', '0'); // S'assurer que le temps final est aussi remis à zéro
  Logger.log("Chronomètre réinitialisé.");
}