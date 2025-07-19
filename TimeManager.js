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

  // --- AJOUTEZ CES LIGNES DE LOG ICI ---
  Logger.log("getMatchTimeState - Propriétés LUES AU DÉBUT:");
  Logger.log("  currentMatchPhase (lue): " + scriptProperties.getProperty('currentMatchPhase'));
  Logger.log("  isTimerRunning (lue): " + scriptProperties.getProperty('isTimerRunning'));
  Logger.log("  gameTimeAtEventMs (lue): " + scriptProperties.getProperty('gameTimeAtEventMs'));
  Logger.log("  startTime (lue): " + scriptProperties.getProperty('startTime'));
  // --- FIN DES LOGS À AJOUTER ---
  
  const isTimerRunning = scriptProperties.getProperty('isTimerRunning') === 'true'; // L'état réel du chrono
  const currentPhase = scriptProperties.getProperty('currentMatchPhase') || 'non_demarre';
  const startTime = parseInt(scriptProperties.getProperty('startTime') || '0', 10);
  const gameTimeAtLastPause = parseInt(scriptProperties.getProperty('gameTimeAtLastPause') || '0', 10);
  const alertMessage = scriptProperties.getProperty('alertMessage') || '';

  let tempsDeJeuMs; // Variable pour le temps de jeu en millisecondes

  // 1. Logique pour les phases de "temps figé" (prioritaire)
  if (currentPhase === 'awaiting_conversion' || currentPhase === 'awaiting_penalty_kick') {
    const gameTimeAtEventMs = parseInt(scriptProperties.getProperty('gameTimeAtEventMs') || '0', 10);
    tempsDeJeuMs = gameTimeAtEventMs; // Fige le temps à celui de l'événement
  }
  // 2. Si le chrono est en cours ET qu'on n'est PAS dans une phase de temps figé
  else if (isTimerRunning && startTime > 0) {
    const currentTime = new Date().getTime();
    tempsDeJeuMs = gameTimeAtLastPause + (currentTime - startTime);
    if (tempsDeJeuMs < 0) tempsDeJeuMs = 0; // Sécurité pour éviter les temps négatifs
  }
  // 3. Si le chrono n'est PAS en cours (pause normale, non démarré, fin de match)
  else {
    tempsDeJeuMs = gameTimeAtLastPause;
  }

  // 4. Logique spécifique pour les phases de match finales ou initiales (peut surcharger si nécessaire)
  if (currentPhase === 'non_demarre') {
    tempsDeJeuMs = 0; // Au tout début, le chrono est à zéro
  } else if (currentPhase === 'fin_de_match') {
    tempsDeJeuMs = parseInt(scriptProperties.getProperty('finalDisplayedTimeMs') || '0', 10);
  }
  // La phase 'mi_temps' utilise implicitement `gameTimeAtLastPause`, ce qui est correct.


  return {
    isTimerRunning: isTimerRunning, // IMPORTANT : Renvoie l'état réel de la propriété isTimerRunning
    tempsDeJeuMs: tempsDeJeuMs,
    // Appel à la fonction de formatage qui se trouve dans Utils.gs
    tempsDeJeuFormatted: formatMillisecondsToHMS(tempsDeJeuMs),
    phase: currentPhase,
    message: alertMessage
  };
}