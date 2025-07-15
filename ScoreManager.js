// Dans ScoreManager.gs

const ESSAI_POINTS = 5;
const TRANSFORMATION_POINTS = 2;
const PENALITE_POINTS = 3;
const DROP_POINTS = 3;

/**
 * Ajoute un essai pour l'équipe locale.
 */
function addScoreLocaleEssai() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // NOUVEAU : Bloquer si on est déjà en attente d'un coup de pied
  if (currentPhase === 'awaiting_conversion' || currentPhase === 'awaiting_penalty_kick') {
    ui.alert("Action impossible", "Une transformation ou pénalité est déjà en cours. Veuillez la résoudre d'abord.", ui.ButtonSet.OK);
    return;
  }
  
  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match') {
    ui.alert("Match non démarré", "Veuillez démarrer le match avant d'ajouter un score.", ui.ButtonSet.OK);
    return;
  }

  // ÉTAPE CLÉ : D'ABORD RÉCUPÉRER LE TEMPS ACTUEL DU CHRONO QUI TOURNE
  const currentRunningTimeState = getMatchTimeState(); // Appel pour obtenir l'état actuel
  const timeToFreeze = currentRunningTimeState.tempsDeJeuMs;

  // Ensuite, définir les propriétés pour figer le temps et changer la phase
  scriptProperties.setProperty('previousMatchPhase', currentPhase); // Sauvegarder la phase avant de la changer
  scriptProperties.setProperty('currentMatchPhase', 'awaiting_conversion'); // Nouvelle phase
  scriptProperties.setProperty('teamAwaitingKick', 'Locale'); // Qui va tenter le coup de pied
  scriptProperties.setProperty('gameTimeAtEventMs', timeToFreeze.toString()); // ENREGISTRER LE TEMPS À FIGER

  // ET C'EST NOUVEAU ET TRÈS IMPORTANT ICI : METTRE isTimerRunning À FALSE
  // C'est ce qui indique à la sidebar que le chrono est "arrêté" et non "en cours" pendant la phase gelée.
  scriptProperties.setProperty('isTimerRunning', 'false'); 

  let currentScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  currentScore += ESSAI_POINTS;
  scriptProperties.setProperty('currentScoreLocal', currentScore.toString());

  // ENFIN, ENREGISTRER L'ÉVÉNEMENT AVEC LE TEMPS FIGÉ
  // On utilise 'timeToFreeze' pour s'assurer que c'est le temps capturé.
  recordEvent(new Date(), formatMillisecondsToHMS(timeToFreeze), 'Locale', 'Essai', '', currentScore, parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10), '');
  
  updateSidebar(); // Mettre à jour la sidebar
  ui.alert("Essai Locale", `Essai de l'équipe Locale. Score : ${currentScore}. En attente de transformation...`, ui.ButtonSet.OK);
}

/**
 * Ajoute un essai pour l'équipe visiteur.
 */
function addScoreVisiteurEssai() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // NOUVEAU : Bloquer si on est déjà en attente d'un coup de pied
  if (currentPhase === 'awaiting_conversion' || currentPhase === 'awaiting_penalty_kick') {
    ui.alert("Action impossible", "Une transformation ou pénalité est déjà en cours. Veuillez la résoudre d'abord.", ui.ButtonSet.OK);
    return;
  }

  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match') {
    ui.alert("Match non démarré", "Veuillez démarrer le match avant d'ajouter un score.", ui.ButtonSet.OK);
    return;
  }

  // ÉTAPE CLÉ : D'ABORD RÉCUPÉRER LE TEMPS ACTUEL DU CHRONO QUI TOURNE
  const currentRunningTimeState = getMatchTimeState(); // Appel pour obtenir l'état actuel
  const timeToFreeze = currentRunningTimeState.tempsDeJeuMs;

  // Ensuite, définir les propriétés pour figer le temps et changer la phase
  scriptProperties.setProperty('previousMatchPhase', currentPhase); // Sauvegarder la phase avant de la changer
  scriptProperties.setProperty('currentMatchPhase', 'awaiting_conversion'); // Nouvelle phase
  scriptProperties.setProperty('teamAwaitingKick', 'Locale'); // Qui va tenter le coup de pied
  scriptProperties.setProperty('gameTimeAtEventMs', timeToFreeze.toString()); // ENREGISTRER LE TEMPS À FIGER

  // ET C'EST NOUVEAU ET TRÈS IMPORTANT ICI : METTRE isTimerRunning À FALSE
  // C'est ce qui indique à la sidebar que le chrono est "arrêté" et non "en cours" pendant la phase gelée.
  scriptProperties.setProperty('isTimerRunning', 'false'); 

  let currentScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  currentScore += ESSAI_POINTS;
  scriptProperties.setProperty('currentScoreLocal', currentScore.toString());

  // ENFIN, ENREGISTRER L'ÉVÉNEMENT AVEC LE TEMPS FIGÉ
  // On utilise 'timeToFreeze' pour s'assurer que c'est le temps capturé.
  recordEvent(new Date(), formatMillisecondsToHMS(timeToFreeze), 'Locale', 'Essai', '', currentScore, parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10), '');
  
  updateSidebar(); // Mettre à jour la sidebar
  ui.alert("Essai Locale", `Essai de l'équipe Locale. Score : ${currentScore}. En attente de transformation...`, ui.ButtonSet.OK);
}

/**
 * Ajoute une pénalité pour l'équipe locale.
 * NOUVEAU : Passe en mode "awaiting_penalty_kick"
 */
function addScoreLocalePenalite() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // NOUVEAU : Bloquer si on est déjà en attente d'un coup de pied
  if (currentPhase === 'awaiting_conversion' || currentPhase === 'awaiting_penalty_kick') {
    ui.alert("Action impossible", "Une transformation ou pénalité est déjà en cours. Veuillez la résoudre d'abord.", ui.ButtonSet.OK);
    return;
  }

  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match') {
    ui.alert("Match non démarré", "Veuillez démarrer le match avant d'ajouter un score.", ui.ButtonSet.OK);
    return;
  }

  // ÉTAPE CLÉ : D'ABORD RÉCUPÉRER LE TEMPS ACTUEL DU CHRONO QUI TOURNE
  const currentRunningTimeState = getMatchTimeState(); // Appel pour obtenir l'état actuel
  const timeToFreeze = currentRunningTimeState.tempsDeJeuMs;

  // Ensuite, définir les propriétés pour figer le temps et changer la phase
  scriptProperties.setProperty('previousMatchPhase', currentPhase); // Sauvegarder la phase avant de la changer
  scriptProperties.setProperty('currentMatchPhase', 'awaiting_conversion'); // Nouvelle phase
  scriptProperties.setProperty('teamAwaitingKick', 'Locale'); // Qui va tenter le coup de pied
  scriptProperties.setProperty('gameTimeAtEventMs', timeToFreeze.toString()); // ENREGISTRER LE TEMPS À FIGER

  // ET C'EST NOUVEAU ET TRÈS IMPORTANT ICI : METTRE isTimerRunning À FALSE
  // C'est ce qui indique à la sidebar que le chrono est "arrêté" et non "en cours" pendant la phase gelée.
  scriptProperties.setProperty('isTimerRunning', 'false'); 

  let currentScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  currentScore += ESSAI_POINTS;
  scriptProperties.setProperty('currentScoreLocal', currentScore.toString());

  // ENFIN, ENREGISTRER L'ÉVÉNEMENT AVEC LE TEMPS FIGÉ
  // On utilise 'timeToFreeze' pour s'assurer que c'est le temps capturé.
  recordEvent(new Date(), formatMillisecondsToHMS(timeToFreeze), 'Locale', 'Essai', '', currentScore, parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10), '');
  
  updateSidebar(); // Mettre à jour la sidebar
  ui.alert("Essai Locale", `Essai de l'équipe Locale. Score : ${currentScore}. En attente de transformation...`, ui.ButtonSet.OK);
}

/**
 * Ajoute une pénalité pour l'équipe visiteur.
 * NOUVEAU : Passe en mode "awaiting_penalty_kick"
 */
function addScoreVisiteurPenalite() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // NOUVEAU : Bloquer si on est déjà en attente d'un coup de pied
  if (currentPhase === 'awaiting_conversion' || currentPhase === 'awaiting_penalty_kick') {
    ui.alert("Action impossible", "Une transformation ou pénalité est déjà en cours. Veuillez la résoudre d'abord.", ui.ButtonSet.OK);
    return;
  }

  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match') {
    ui.alert("Match non démarré", "Veuillez démarrer le match avant d'ajouter un score.", ui.ButtonSet.OK);
    return;
  }

  // ÉTAPE CLÉ : D'ABORD RÉCUPÉRER LE TEMPS ACTUEL DU CHRONO QUI TOURNE
  const currentRunningTimeState = getMatchTimeState(); // Appel pour obtenir l'état actuel
  const timeToFreeze = currentRunningTimeState.tempsDeJeuMs;

  // Ensuite, définir les propriétés pour figer le temps et changer la phase
  scriptProperties.setProperty('previousMatchPhase', currentPhase); // Sauvegarder la phase avant de la changer
  scriptProperties.setProperty('currentMatchPhase', 'awaiting_conversion'); // Nouvelle phase
  scriptProperties.setProperty('teamAwaitingKick', 'Locale'); // Qui va tenter le coup de pied
  scriptProperties.setProperty('gameTimeAtEventMs', timeToFreeze.toString()); // ENREGISTRER LE TEMPS À FIGER

  // ET C'EST NOUVEAU ET TRÈS IMPORTANT ICI : METTRE isTimerRunning À FALSE
  // C'est ce qui indique à la sidebar que le chrono est "arrêté" et non "en cours" pendant la phase gelée.
  scriptProperties.setProperty('isTimerRunning', 'false'); 

  let currentScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  currentScore += ESSAI_POINTS;
  scriptProperties.setProperty('currentScoreLocal', currentScore.toString());

  // ENFIN, ENREGISTRER L'ÉVÉNEMENT AVEC LE TEMPS FIGÉ
  // On utilise 'timeToFreeze' pour s'assurer que c'est le temps capturé.
  recordEvent(new Date(), formatMillisecondsToHMS(timeToFreeze), 'Locale', 'Essai', '', currentScore, parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10), '');
  
  updateSidebar(); // Mettre à jour la sidebar
  ui.alert("Essai Locale", `Essai de l'équipe Locale. Score : ${currentScore}. En attente de transformation...`, ui.ButtonSet.OK);
}


/**
 * @file Gère la logique des scores du match et des actions spécifiques (cartons, remplacements).
 * Met à jour les propriétés du script et enregistre les événements.
 */

/**
 * Ajoute des points au score d'une équipe et enregistre l'événement.
 * @param {string} team 'Locale' ou 'Visiteur'.
 * @param {string} actionType Le type d'action (ex: 'Essai', 'Transformation', 'Pénalité', 'Drop').
 * @param {number} points Le nombre de points à ajouter.
 * @param {string} [player=''] Le nom du joueur ayant réalisé l'action (optionnel).
 * @param {string} [remark=''] Remarque additionnelle (optionnel).
 */
function addScore(team, actionType, points, player = '', remark = '') {
  const scriptProperties = PropertiesService.getScriptProperties();
  let currentLocalScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  let currentVisitorScore = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  if (team === 'Locale') {
    currentLocalScore += points;
    scriptProperties.setProperty('currentScoreLocal', currentLocalScore.toString());
  } else if (team === 'Visiteur') {
    currentVisitorScore += points;
    scriptProperties.setProperty('currentScoreVisiteur', currentVisitorScore.toString());
  } else {
    SpreadsheetApp.getUi().alert("Erreur de score", "Équipe non reconnue : " + team, SpreadsheetApp.getUi().ButtonSet.OK);
    Logger.log("Erreur: Équipe non reconnue pour addScore: " + team);
    return;
  }

  // Enregistrer l'événement
  const matchTimeState = getMatchTimeState(); // On récupère le temps de jeu actuel
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, team, actionType, player, currentLocalScore, currentVisitorScore, remark);

  Logger.log(`${team} marque ${points} points (${actionType}). Nouveau score: ${currentLocalScore}-${currentVisitorScore}`);
  SpreadsheetApp.getUi().alert("Score mis à jour", `${team} marque ${points} points (${actionType}). Nouveau score: ${currentLocalScore} - ${currentVisitorScore}`, SpreadsheetApp.getUi().ButtonSet.OK);
  
  updateSidebar(); // Met à jour la sidebar après le changement de score
}


