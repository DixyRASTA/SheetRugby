/**
 * @file Gère les interruptions de jeu et les transitions de phases du match.
 * Appelle TimeManager pour manipuler le chronomètre et Evenements pour enregistrer les actions.
 */

/**
 * Réinitialise toutes les propriétés du match à leur état initial.
 * Appelé lors de l'initialisation d'un nouveau match.
 */
function initialiserFeuilleEtProprietes() {
  const scriptProperties = PropertiesService.getScriptProperties();

  // Réinitialiser les propriétés du chrono
  resetMatchTimer(); // Appel à la fonction dans TimeManager.gs

  // Réinitialiser les scores et noms d'équipes (valeurs par défaut)
  scriptProperties.setProperty('currentScoreLocal', '0');
  scriptProperties.setProperty('currentScoreVisiteur', '0');
  scriptProperties.setProperty('nomEquipeLocale', 'Locale'); // Peut être remplacé par un nom dynamique plus tard
  scriptProperties.setProperty('nomEquipeVisiteur', 'Visiteur'); // Peut être remplacé par un nom dynamique plus tard

  // Réinitialiser la phase du match
  scriptProperties.setProperty('currentMatchPhase', 'non_demarre'); // Nouvelle partie, non démarrée

  // Réinitialiser les alertes
  scriptProperties.setProperty('alertMessage', '');

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
  SpreadsheetApp.getUi().alert("Match initialisé", "Un nouveau match a été initialisé. Vous pouvez démarrer la 1ère mi-temps.", SpreadsheetApp.getUi().ButtonSet.OK);
}

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
  
  scriptProperties.setProperty('currentMatchPhase', 'premiere_mi_temps');
  startMatchTimer(); // Appel à la fonction dans TimeManager.gs
  scriptProperties.setProperty('alertMessage', ''); // Efface le message d'alerte s'il y en avait un

  // Enregistrer l'événement "Coup d'envoi" dans la feuille "Saisie"
  // NOTE: recordEvent n'est pas encore implémenté dans Evenements.gs. Cela générera une erreur pour l'instant.
  // Nous l'implémenterons ensuite !
  const matchTimeState = getMatchTimeState(); // Pour obtenir le temps formaté
  
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Coup d\'envoi 1ère MT', '', '', currentScoreLocal, currentScoreVisiteur, 'Début de la rencontre'); 
  
  updateSidebar(); // Mettre à jour la sidebar pour refléter le changement
  SpreadsheetApp.getUi().alert("1ère Mi-temps démarrée !", "Le match est en cours.", SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Arrête le jeu pour la fin de la première mi-temps.
 * Met le chronomètre en pause et enregistre l'événement.
 */
function finPremiereMiTemps() {
  
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Vérification de sécurité
  if (currentPhase !== 'premiere_mi_temps') {
    scriptProperties.setProperty('alertMessage', 'Impossible de terminer la 1ère mi-temps. Le match n\'est pas en 1ère MT.');
    updateSidebar();
    return;
  }

  scriptProperties.setProperty('currentMatchPhase', 'mi_temps');
  pauseMatchTimer(); // Appel à la fonction dans TimeManager.gs
  scriptProperties.setProperty('alertMessage', '');

  // Enregistrer l'événement "Fin 1ère MT"
  const matchTimeState = getMatchTimeState();
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
     
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Fin 1ère MT', '', '', currentScoreLocal, currentScoreVisiteur, 'Pause');

  updateSidebar();
  SpreadsheetApp.getUi().alert("Fin de la 1ère mi-temps !", "Le jeu est en pause.", SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Démarre la deuxième mi-temps et relance le chronomètre.
 * Enregistre l'événement dans la feuille "Saisie".
 */
function debutDeuxiemeMiTemps() {
 
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Vérification de sécurité
  if (currentPhase !== 'mi_temps') {
    scriptProperties.setProperty('alertMessage', 'Impossible de démarrer la 2ème mi-temps. Le match n\'est pas en pause mi-temps.');
    updateSidebar();
    return;
  }

  scriptProperties.setProperty('currentMatchPhase', 'deuxieme_mi_temps');
  resumeMatchTimer(); // Appel à la fonction dans TimeManager.gs
  scriptProperties.setProperty('alertMessage', '');

  // Enregistrer l'événement "Coup d'envoi 2e MT"
  const matchTimeState = getMatchTimeState();
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Coup d\'envoi 2e MT', '', '', currentScoreLocal, currentScoreVisiteur, 'Reprise de la rencontre');

  updateSidebar();
  SpreadsheetApp.getUi().alert("2ème Mi-temps démarrée !", "Le match est en cours.", SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Met fin au match.
 * Arrête le chronomètre et enregistre l'événement.
 */
function finDeMatch() {
  
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Vérification de sécurité
  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match') {
    scriptProperties.setProperty('alertMessage', 'Impossible de terminer le match. Le match n\'a pas démarré ou est déjà terminé.');
    updateSidebar();
    return;
  }

  scriptProperties.setProperty('currentMatchPhase', 'fin_de_match');
  pauseMatchTimer(); // Arrête le chrono
  // Enregistrer le temps final affiché pour la permanence
  scriptProperties.setProperty('finalDisplayedTimeMs', getMatchTimeState().tempsDeJeuMs.toString());
  scriptProperties.setProperty('alertMessage', '');

  // Enregistrer l'événement "Fin de Match"
  const matchTimeState = getMatchTimeState();
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Fin de Match', '', '', currentScoreLocal, currentScoreVisiteur, 'Fin de la rencontre');

  updateSidebar();
  SpreadsheetApp.getUi().alert("Match Terminé !", "La partie est terminée.", SpreadsheetApp.getUi().ButtonSet.OK);
}


/**
 * Met le jeu en pause (arrêt temporaire du chrono).
 * Enregistre l'événement.
 */
function arretJeu() {
  
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Vérification de sécurité
  if (!['premiere_mi_temps', 'deuxieme_mi_temps'].includes(currentPhase)) {
    scriptProperties.setProperty('alertMessage', 'Impossible d\'arrêter le jeu. Le match n\'est pas en cours.');
    updateSidebar();
    return;
  }
  
  if (scriptProperties.getProperty('isTimerRunning') !== 'true') {
    scriptProperties.setProperty('alertMessage', 'Le chrono est déjà arrêté.');
    updateSidebar();
    return;
  }

  pauseMatchTimer(); // Appel à la fonction dans TimeManager.gs
  scriptProperties.setProperty('alertMessage', '');

  // Enregistrer l'événement "Arrêt du jeu"
  const matchTimeState = getMatchTimeState();
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Arrêt du jeu', '', '', currentScoreLocal, currentScoreVisiteur, 'Jeu arrêté');

  updateSidebar();
  SpreadsheetApp.getUi().alert("Jeu Arrêté !", "Le chronomètre est en pause.", SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Reprend le jeu après une pause (relance le chrono).
 * Enregistre l'événement.
 */
function repriseJeu() {
 
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Vérification de sécurité
  if (!['premiere_mi_temps', 'deuxieme_mi_temps'].includes(currentPhase)) {
    scriptProperties.setProperty('alertMessage', 'Impossible de reprendre le jeu. Le match n\'est pas en cours ou en pause.');
    updateSidebar();
    return;
  }

  if (scriptProperties.getProperty('isTimerRunning') === 'true') {
    scriptProperties.setProperty('alertMessage', 'Le chrono est déjà en cours.');
    updateSidebar();
    return;
  }

  resumeMatchTimer(); // Appel à la fonction dans TimeManager.gs
  scriptProperties.setProperty('alertMessage', '');

  // Enregistrer l'événement "Reprise du jeu"
  const matchTimeState = getMatchTimeState();
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Reprise du jeu', '', '', currentScoreLocal, currentScoreVisiteur, 'Jeu repris');

  updateSidebar();
  SpreadsheetApp.getUi().alert("Jeu Repris !", "Le chronomètre redémarre.", SpreadsheetApp.getUi().ButtonSet.OK);
}