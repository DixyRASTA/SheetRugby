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

// Dans TimeManager.gs

/**
 * Calcule le temps de jeu écoulé et la phase actuelle du match.
 * @returns {{isTimerRunning: boolean, tempsDeJeuMs: number, tempsDeJeuFormatted: string, phase: string, message: string}} L'état actuel du temps et du match.
 */
function getMatchTimeState() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const isTimerRunning = scriptProperties.getProperty('isTimerRunning') === 'true'; // Variable pour l'état du chrono
  const currentPhase = scriptProperties.getProperty('currentMatchPhase') || 'non_demarre';
  const startTime = parseInt(scriptProperties.getProperty('startTime') || '0', 10);
  const gameTimeAtLastPause = parseInt(scriptProperties.getProperty('gameTimeAtLastPause') || '0', 10);
  const alertMessage = scriptProperties.getProperty('alertMessage') || '';

  let tempsDeJeuMs = 0; // Initialisation

  // NOUVEAU: Logique pour les phases de "temps figé"
  if (currentPhase === 'awaiting_conversion' || currentPhase === 'awaiting_penalty_kick') {
    const gameTimeAtEventMs = parseInt(scriptProperties.getProperty('gameTimeAtEventMs') || '0', 10);
    tempsDeJeuMs = gameTimeAtEventMs; // Fige le temps à celui de l'événement
    // Important: Le chrono N'EST PAS censé courir dans ces phases, donc isTimerRunning reste 'false' pour le calcul suivant
    // Nous ne changeons pas la valeur de isTimerRunning dans scriptProperties ici.
  } else if (isTimerRunning) { // Si le chronomètre est en cours (et non figé par un événement)
    const currentTime = new Date().getTime();
    tempsDeJeuMs = gameTimeAtLastPause + (currentTime - startTime);
    if (tempsDeJeuMs < 0) tempsDeJeuMs = 0; // Sécurité
  } else { // Si le chrono n'est PAS en cours (pause normale, non démarré, fin de match)
    tempsDeJeuMs = gameTimeAtLastPause;
  }

  // --- LOGIQUE EXISTANTE POUR LES PHASES SPÉCIFIQUES (DOIT RESTER) ---
  if (currentPhase === 'non_demarre') {
    tempsDeJeuMs = 0; // Au tout début, le chrono est à zéro
    // On ne touche pas à isTimerRunning ici, il est géré par les fonctions start/pause/reset
  } else if (currentPhase === 'mi_temps') {
    // Pendant la mi-temps, on affiche le temps RÉEL de fin de 1ère MT
    // tempsDeJeuMs contient déjà gameTimeAtLastPause, qui est ce temps.
  } else if (currentPhase === 'fin_de_match') {
    // En fin de match, on affiche le temps final du match.
    tempsDeJeuMs = parseInt(scriptProperties.getProperty('finalDisplayedTimeMs') || '0', 10);
  }

  // Conversion en format MM:SS
  const totalSeconds = Math.floor(tempsDeJeuMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tempsDeJeuFormatted = Utilities.formatString('%02d:%02d', minutes, seconds);

  return {
    isTimerRunning: isTimerRunning, // Retourne l'état réel du chrono
    tempsDeJeuMs: tempsDeJeuMs,
    tempsDeJeuFormatted: tempsDeJeuFormatted,
    phase: currentPhase,
    message: alertMessage // Inclut le message d'alerte pour la sidebar
  };
}