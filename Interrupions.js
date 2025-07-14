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
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Fin 1ère MT', '', '', currentScoreLocal, currentScoreVisiteur, 'Mi-temps');

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

  // Pour l'événement, on veut afficher 40:00:00
  const matchTimeState = getMatchTimeState(); // Cette fonction va maintenant calculer à partir des 40 minutes
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Coup d\'envoi 2ème MT', '', 
              parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10), 
              parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10), 
              'Reprise');

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
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Fin de Match', '', '', currentScoreLocal, currentScoreVisiteur, 'Fin');

  updateSidebar();
  SpreadsheetApp.getUi().alert("Fin du Match !", "Le match est terminé.", SpreadsheetApp.getUi().ButtonSet.OK);
}


/**
 * Met le jeu en pause (arrêt temporaire du chrono).
 * Enregistre l'événement.
 */
function arretJeu() {

  const scriptProperties = PropertiesService.getScriptProperties(); // Déclaration unique de scriptProperties au début de la fonction
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Vérification de sécurité
  if (currentPhase !== 'premiere_mi_temps' && currentPhase !== 'deuxieme_mi_temps') {
    scriptProperties.setProperty('alertMessage', 'Le jeu n\'est pas en cours.');
    updateSidebar();
    return;
  }
  
  pauseMatchTimer(); // Met le chrono en pause

  scriptProperties.setProperty('currentMatchPhase', 'jeu_arrete');
  scriptProperties.setProperty('alertMessage', 'Jeu arrêté.');

  const matchTimeState = getMatchTimeState();
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  
  // Assure-toi que les scores sont passés même si l'action n'est pas un score
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Arrêt du jeu', '', currentScoreLocal, currentScoreVisiteur, '');

  updateSidebar();
  SpreadsheetApp.getUi().alert("Jeu arrêté", "Le chronomètre est en pause.", SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Reprend le jeu après une pause (relance le chrono).
 * Enregistre l'événement.
 */
function repriseJeu() {
  const scriptProperties = PropertiesService.getScriptProperties(); // Déclaration unique de scriptProperties au début de la fonction
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Vérification de sécurité
  if (currentPhase !== 'jeu_arrete') {
    scriptProperties.setProperty('alertMessage', 'Le jeu n\'est pas arrêté.');
    updateSidebar();
    return;
  }

   // Déterminer la phase précédente pour y revenir
  const previousPhase = scriptProperties.getProperty('previousMatchPhase') || 'premiere_mi_temps'; // Fallback
  scriptProperties.setProperty('currentMatchPhase', previousPhase); // Revenir à la phase d'avant l'arrêt
  
  resumeMatchTimer(); // Reprend le chrono

  scriptProperties.setProperty('alertMessage', '');

  const matchTimeState = getMatchTimeState();
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  
  // Assure-toi que les scores sont passés même si l'action n'est pas un score
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, '', 'Reprise du jeu', '', currentScoreLocal, currentScoreVisiteur, '');

  updateSidebar();
  SpreadsheetApp.getUi().alert("Reprise du jeu", "Le chronomètre est en cours.", SpreadsheetApp.getUi().ButtonSet.OK);
}