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
  let gameTimeAtLastPause = parseInt(scriptProperties.getProperty('gameTimeAtLastPause') || '0', 10);
  let matchStartTime = parseInt(scriptProperties.getProperty('matchStartTime') || '0', 10);

  // NOUVEAU : Logique de réajustement au cas où le chrono était en cours à la fermeture
  // Si le chrono était "en cours" mais que matchStartTime n'est pas 0 (donc il a déjà démarré une fois)
  // Et que la dernière phase n'était pas 'fin_de_match' ou 'mi_temps' (où le chrono est intentionnellement arrêté)
  if (isTimerRunning && matchStartTime !== 0 && currentMatchPhase !== 'fin_de_match' && currentMatchPhase !== 'mi_temps') {
      const now = new Date().getTime();
      // Si le temps de début est très ancien par rapport à maintenant, cela signifie qu'il n'a pas été "pausé" correctement.
      // On estime le temps écoulé depuis la dernière "vraie" mise en marche.
      // Si la différence est très grande, c'est qu'on a rouvert la feuille après une longue période.
      // Dans ce cas, le temps de jeu est le temps au moment de la dernière lecture (gameTimeAtLastPause)
      // et le chronomètre devrait être considéré comme en pause pour éviter un temps irréaliste.
      if ((now - matchStartTime) > (5 * 60 * 1000) && (currentMatchPhase !== 'non_demarre' && currentMatchPhase !== 'fin_de_match')) { // Plus de 5 minutes de différence sans interaction
          Logger.log("Détection d'une longue période d'inactivité du script. Mise en pause simulée.");
          scriptProperties.setProperty('isTimerRunning', 'false'); // Met le timer en pause
          // Recalculer gameTimeAtLastPause avec le temps écoulé
          gameTimeAtLastPause = gameTimeAtLastPause + (now - matchStartTime);
          scriptProperties.setProperty('gameTimeAtLastPause', gameTimeAtLastPause.toString());
          matchStartTime = 0; // Réinitialise matchStartTime
          scriptProperties.setProperty('matchStartTime', '0');
          // On change le statut pour refléter la pause
          isTimerRunning = false; // Mettre à jour la variable locale pour le calcul immédiat
      }
  }


  if (isTimerRunning) { // Si après la vérification ci-dessus, il est toujours 'true'
    const now = new Date().getTime();
    tempsDeJeuMs = gameTimeAtLastPause + (now - matchStartTime);
    if (tempsDeJeuMs < 0) tempsDeJeuMs = 0;
  } else {
    tempsDeJeuMs = gameTimeAtLastPause;
  }

  // Ajuster tempsDeJeuMs à 0 si la phase est 'non_demarre' ou 'mi_temps'
  // ou si le match est terminé, utiliser le temps final enregistré
  if (currentMatchPhase === 'non_demarre' || currentMatchPhase === 'mi_temps') {
    tempsDeJeuMs = 0;
    // Si la phase est "non_demarre" ou "mi_temps", on s'assure que le chrono est bien arrêté en arrière-plan
    scriptProperties.setProperty('isTimerRunning', 'false');
    scriptProperties.setProperty('gameTimeAtLastPause', '0'); // Remettre à zéro pour ces phases
    scriptProperties.setProperty('matchStartTime', '0');
  } else if (currentMatchPhase === 'fin_de_match') {
    tempsDeJeuMs = parseInt(scriptProperties.getProperty('finalDisplayedTimeMs') || '0', 10);
     scriptProperties.setProperty('isTimerRunning', 'false'); // Assurer qu'il est arrêté en fin de match
  }

  return {
    isTimerRunning: isTimerRunning,
    tempsDeJeuMs: tempsDeJeuMs,
    tempsDeJeuFormatted: formatMillisecondsToHMS(tempsDeJeuMs)
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