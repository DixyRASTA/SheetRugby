/**
 * @file Gère les interruptions de jeu et les transitions de phases du match.
 * Appelle TimeManager pour manipuler le chronomètre et Evenements pour enregistrer les actions.
 */

// Dans Interruptions.gs

/**
 * Réinitialise toutes les propriétés du match à leur état initial.
 * Appelé lors de l'initialisation d'un nouveau match.
 */
function initialiserFeuilleEtProprietes() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Initialiser Nouveau Match',
    'Ceci va effacer toutes les données du match précédent et réinitialiser le chronomètre. Êtes-vous sûr ?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    const scriptProperties = PropertiesService.getScriptProperties();
    // TRÈS IMPORTANT : REMPLACER scriptProperties.deleteAllProperties();
    // par une initialisation explicite de toutes les propriétés nécessaires.
    // Cela garantit un état propre et prévisible.

    // Réinitialisation des propriétés de base du match
    scriptProperties.setProperty('currentScoreLocal', '0');
    scriptProperties.setProperty('currentScoreVisiteur', '0');
    scriptProperties.setProperty('currentMatchPhase', 'non_demarre');
    scriptProperties.setProperty('alertMessage', 'Match non démarré.');
    scriptProperties.setProperty('previousMatchPhase', 'non_demarre');
    
    // Réinitialisation des propriétés spécifiques au coup d'envoi et aux phases de gel du temps
    scriptProperties.setProperty('kickoffTeam1stHalf', ''); 
    scriptProperties.setProperty('kickoffTeam2ndHalf', ''); 
    scriptProperties.setProperty('teamAwaitingKick', ''); 
    scriptProperties.setProperty('gameTimeAtEventMs', '0'); // Réinitialise le temps figé

    // Réinitialiser les propriétés du chrono via la fonction dédiée
    // Cette fonction s'assure que 'isTimerRunning', 'startTime', 'gameTimeAtLastPause', 'finalDisplayedTimeMs' sont à '0'/'false'
    resetMatchTimer(); 

    // Charge les noms des équipes (cette fonction gère ses propres propriétés)
    loadTeamNames(); 

    // Effacer la feuille "Saisie" sauf les deux premières lignes d'en-tête
    try {
      const feuilleSaisie = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
      if (feuilleSaisie && feuilleSaisie.getLastRow() > 2) {
        feuilleSaisie.getRange(3, 1, feuilleSaisie.getLastRow() - 2, feuilleSaisie.getLastColumn()).clearContent();
        Logger.log("Feuille 'Saisie' réinitialisée.");
      }
    } catch (e) {
      Logger.log("Erreur lors de la réinitialisation de la feuille 'Saisie': " + e.message);
      SpreadsheetApp.getUi().alert("Erreur", "Impossible de réinitialiser la feuille 'Saisie'. Vérifiez son nom ou ses permissions.", SpreadsheetApp.getUi().ButtonSet.OK);
    }

    updateSidebar(); // Mettre à jour la sidebar pour refléter l'initialisation
    ui.alert("Match initialisé", "Un nouveau match a été initialisé. Vous pouvez démarrer la 1ère mi-temps.", ui.ButtonSet.OK);
  }
}

// Les fonctions debutPremiereMiTemps, finPremiereMiTemps, debutDeuxiemeMiTemps,
// arretJeu, repriseJeu, finDeMatch restent telles que définies dans nos dernières discussions.
// Elles devraient fonctionner correctement avec des propriétés bien initialisées.


/**
 * Démarre la première mi-temps du match et lance le chronomètre.
 * Enregistre l'événement dans la feuille "Saisie".
 */
function debutPremiereMiTemps() {

  const scriptProperties = PropertiesService.getScriptProperties();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');
  
  // Vérification de sécurité (sera enrichie avec SecurityManager plus tard)
  if (currentPhase !== 'non_demarre' && currentPhase !== 'fin_de_match' && currentPhase !== 'mi_temps') {
    scriptProperties.setProperty('alertMessage', 'Le match est déjà en cours ou dans une phase incorrecte.');
    updateSidebar();
    return;
  }

   // Demander et stocker l'équipe qui donne le coup d'envoi de la 1ère MT
  const kickoffTeam1stHalf = promptForKickOffTeam();
  if (!kickoffTeam1stHalf) {
      ui.alert("Annulation", "Le coup d'envoi de la 1ère mi-temps a été annulé.");
      updateSidebar();
      return;
  }
  scriptProperties.setProperty('kickoffTeam1stHalf', kickoffTeam1stHalf);
  // Calculer et stocker l'équipe qui aura le coup d'envoi de la 2nde MT (l'inverse)
  const kickoffTeam2ndHalf = (kickoffTeam1stHalf === 'Locale') ? 'Visiteur' : 'Locale';
  scriptProperties.setProperty('kickoffTeam2ndHalf', kickoffTeam2ndHalf);

  scriptProperties.setProperty('currentMatchPhase', 'premiere_mi_temps');
  startMatchTimer(); // Démarre le chronomètre
  scriptProperties.setProperty('alertMessage', '');

  const matchTimeState = getMatchTimeState();
  const kickoffTeamName = (kickoffTeam1stHalf === 'Locale') ? getLocalTeamName() : getVisitorTeamName(); // Récupère le nom réel

  // Enregistrement de l'événement "Coup d'envoi 1ère MT"
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, kickoffTeam1stHalf, 'Coup d\'envoi 1ère MT', '', 
              parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10), 
              parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10), 
              `Coup d'envoi par ${kickoffTeamName}`); // Utilise le nom réel dans la remarque
  
  updateSidebar();
  SpreadsheetApp.getUi().alert("Coup d'envoi 1ère mi-temps !", "Le match a commencé.", SpreadsheetApp.getUi().ButtonSet.OK);
}


/**
 * Arrête le jeu pour la fin de la première mi-temps.
 * Met le chronomètre en pause et enregistre l'événement.
 */
function finPremiereMiTemps() {

  const scriptProperties = PropertiesService.getScriptProperties(); // Déclaration unique de scriptProperties au début de la fonction
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Vérification de sécurité
  if (currentPhase !== 'premiere_mi_temps') {
    scriptProperties.setProperty('alertMessage', 'Impossible de terminer la 1ère mi-temps. Le match n\'est pas en 1ère MT.');
    updateSidebar();
    return;
  }

   pauseMatchTimer(); // Cette fonction met à jour gameTimeAtLastPause avec le temps RÉEL de la 1ère MT (ex: 43:00)
                     // C'est ce temps réel que nous voulons enregistrer pour l'événement "Fin 1ère MT".
  
  const matchTimeState = getMatchTimeState(); // Récupère l'état avec le temps réel de fin de 1ère MT
  scriptProperties.setProperty('currentMatchPhase', 'mi_temps');
  scriptProperties.setProperty('alertMessage', '');
  
  // Enregistrer l'événement "Fin 1ère MT" avec le temps de jeu RÉEL accumulé
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Fin 1ère MT', '', currentScoreLocal, currentScoreVisiteur, 'Mi-temps');

  updateSidebar();
  SpreadsheetApp.getUi().alert("Mi-temps", "La 1ère mi-temps est terminée.", SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Démarre la deuxième mi-temps et relance le chronomètre.
 * Enregistre l'événement dans la feuille "Saisie".
 */
function debutDeuxiemeMiTemps() {

  const scriptProperties = PropertiesService.getScriptProperties(); // Déclaration unique de scriptProperties au début de la fonction
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Vérification de sécurité
  if (currentPhase !== 'mi_temps') {
    scriptProperties.setProperty('alertMessage', 'Impossible de démarrer la 2ème mi-temps. Le match n\'est pas en pause mi-temps.');
    updateSidebar();
    return;
  }

  // Ici, le chrono DOIT reprendre à partir du temps accumulé à la fin de la 1ère MT.
  // startMatchTimer() va utiliser gameTimeAtLastPause qui contient déjà le temps de la 1ère MT.
  // NOUVEAU : Forcer le temps de jeu accumulé à 40 minutes (2400000 ms) pour le début de la 2ème MT.
  const QUARANTE_MINUTES_MS = 40 * 60 * 1000;
  scriptProperties.setProperty('gameTimeAtLastPause', QUARANTE_MINUTES_MS.toString());
  
  scriptProperties.setProperty('currentMatchPhase', 'deuxieme_mi_temps');
  startMatchTimer(); // startMatchTimer va utiliser le gameTimeAtLastPause que l'on vient de forcer à 40 minutes.
  scriptProperties.setProperty('alertMessage', '');

  const matchTimeState = getMatchTimeState(); // Cette fonction va maintenant calculer à partir des 40 minutes
  const kickoffTeam = scriptProperties.getProperty('kickoffTeam2ndHalf') || ''; // Récupère l'équipe qui donne le coup d'envoi de la 2ème MT
  
  // Enregistrement de l'événement "Coup d'envoi 2ème MT"
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, kickoffTeam, 'Coup d\'envoi 2ème MT', '', 
              parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10), 
              parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10), 
              ''); // La remarque sera l'équipe qui donne le coup d'envoi

  updateSidebar();
  SpreadsheetApp.getUi().alert("Coup d'envoi 2ème mi-temps !", "Le jeu a repris.", SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Met fin au match.
 * Arrête le chronomètre et enregistre l'événement.
 */
function finDeMatch() {

  const scriptProperties = PropertiesService.getScriptProperties(); // Déclaration unique de scriptProperties au début de la fonction
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Vérification de sécurité
  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match') {
    scriptProperties.setProperty('alertMessage', 'Impossible de terminer le match. Le match n\'a pas démarré ou est déjà terminé.');
    updateSidebar();
    return;
  }

  pauseMatchTimer(); // Arrête le chrono et met à jour gameTimeAtLastPause
  
  const matchTimeState = getMatchTimeState();
  // NOUVEAU : Enregistrer le temps final du match
  scriptProperties.setProperty('finalDisplayedTimeMs', matchTimeState.tempsDeJeuMs.toString());
  scriptProperties.setProperty('currentMatchPhase', 'fin_de_match');
  scriptProperties.setProperty('alertMessage', 'Match Terminé !');

  // Enregistrer l'événement "Fin de Match" avec le temps final
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Fin de Match', '', currentScoreLocal, currentScoreVisiteur, 'Fin');

  updateSidebar();
  SpreadsheetApp.getUi().alert("Fin du Match !", "Le match est terminé.", SpreadsheetApp.getUi().ButtonSet.OK);
}


// Dans Interruptions.gs

/**
 * Arrête le jeu (mise en pause du chronomètre).
 */
function arretJeu() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi(); // Assurez-vous d'avoir l'objet UI

  const currentPhaseBeforeArret = scriptProperties.getProperty('currentMatchPhase');
  Logger.log("arretJeu - Début. Phase actuelle: " + currentPhaseBeforeArret);

  if (currentPhaseBeforeArret === 'premiere_mi_temps' || currentPhaseBeforeArret === 'deuxieme_mi_temps') {
    scriptProperties.setProperty('previousMatchPhase', currentPhaseBeforeArret); // Stocke la phase avant la pause
    scriptProperties.setProperty('currentMatchPhase', 'pause'); // Définit la nouvelle phase comme "pause"
    pauseMatchTimer(); // Met le chronomètre en pause

    scriptProperties.setProperty('alertMessage', 'Jeu arrêté.');
    Logger.log("arretJeu - Jeu mis en pause. currentMatchPhase: " + scriptProperties.getProperty('currentMatchPhase') + ", previousMatchPhase: " + scriptProperties.getProperty('previousMatchPhase'));

  } else {
    scriptProperties.setProperty('alertMessage', 'Le jeu n\'est pas en cours pour être arrêté.');
    Logger.log("arretJeu - Impossible d'arrêter. Phase actuelle: " + currentPhaseBeforeArret);
  }
  updateSidebar();
  ui.alert("Jeu Arrêté", scriptProperties.getProperty('alertMessage'), ui.ButtonSet.OK); // Ajout d'une alerte pour confirmation
}

/**
 * Reprend le jeu après une pause.
 * Relance le chronomètre et restaure la phase de match précédente.
 */
function repriseJeu() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();

  const currentPhaseAtStartOfReprise = scriptProperties.getProperty('currentMatchPhase');
  const previousPhase = scriptProperties.getProperty('previousMatchPhase');

  Logger.log("repriseJeu - Début. currentPhase (au moment du clic): " + currentPhaseAtStartOfReprise + ", previousPhase: " + previousPhase);

  if (currentPhaseAtStartOfReprise === 'pause') {
    // Restaure la phase précédente (avant la pause), par défaut à 'premiere_mi_temps' si indéfini.
    const phaseToResumeTo = previousPhase || 'premiere_mi_temps';
    scriptProperties.setProperty('currentMatchPhase', phaseToResumeTo); 
    
    resumeMatchTimer(); // Appelle la fonction de TimeManager pour relancer le chrono
    scriptProperties.setProperty('alertMessage', ''); 
    Logger.log("repriseJeu - Jeu repris. currentMatchPhase: " + scriptProperties.getProperty('currentMatchPhase') + 
               ", isTimerRunning: " + scriptProperties.getProperty('isTimerRunning') + 
               ", startTime: " + scriptProperties.getProperty('startTime') + 
               ", gameTimeAtLastPause: " + scriptProperties.getProperty('gameTimeAtLastPause'));

    updateSidebar();
    ui.alert("Reprise du jeu", "Le jeu a repris.", ui.ButtonSet.OK);

  } else {
    scriptProperties.setProperty('alertMessage', 'Le jeu n\'est pas en pause pour être repris.');
    Logger.log("repriseJeu - Impossible de reprendre. Phase actuelle: " + currentPhaseAtStartOfReprise);
    updateSidebar();
    ui.alert("Impossible de reprendre", "Le jeu n'est pas en pause.", ui.ButtonSet.OK);
  }
}