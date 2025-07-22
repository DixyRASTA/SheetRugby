function addEssai() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Bloquer si on est déjà en attente d'un coup de pied
  if (currentPhase === 'awaiting_conversion' || currentPhase === 'awaiting_penalty_kick') {
    ui.alert("Action impossible", "Une transformation ou pénalité est déjà en cours. Veuillez la résoudre d'abord.", ui.ButtonSet.OK);
    return;
  }

  // Bloquer si le match n'est pas démarré ou déjà terminé
  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match') {
    ui.alert("Match non démarré", "Veuillez démarrer le match avant d'ajouter un score.", ui.ButtonSet.OK);
    return;
  }

  // Récupérer le temps actuel du chronomètre
  const currentRunningTimeState = getMatchTimeState();
  const timeToFreeze = currentRunningTimeState.tempsDeJeuMs;

  // Demander quelle équipe a marqué l'essai
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();
  const teamChoice = ui.prompt(`Essai marqué par:\n1. ${localTeamName}\n2. ${visitorTeamName}\nEntrez 1 ou 2:`, ui.ButtonSet.OK_CANCEL);

  if (teamChoice.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Annulé", "L'ajout d'essai a été annulé.", ui.ButtonSet.OK);
    return;
  }

  let scoringTeam;
  if (teamChoice.getResponseText().trim() === '1') {
    scoringTeam = localTeamName;
  } else if (teamChoice.getResponseText().trim() === '2') {
    scoringTeam = visitorTeamName;
  } else {
    ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
    return;
  }

  // Définir les propriétés pour figer le temps et changer la phase
  scriptProperties.setProperty('previousMatchPhase', currentPhase);
  scriptProperties.setProperty('currentMatchPhase', 'awaiting_conversion');
  scriptProperties.setProperty('teamAwaitingKick', scoringTeam);
  scriptProperties.setProperty('gameTimeAtEventMs', timeToFreeze.toString());
  scriptProperties.setProperty('isTimerRunning', 'false');

  // Mettre à jour le score
  const currentScoreKey = scoringTeam === localTeamName ? 'currentScoreLocal' : 'currentScoreVisiteur';
  let currentScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
  currentScore += 5; // Ajouter 5 points pour l'essai
  scriptProperties.setProperty(currentScoreKey, currentScore.toString());

  // Enregistrer l'événement
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Saisie');

  // Formater l'heure sans la date
  const formattedTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss");

  // Enregistrer l'essai
  sheet.appendRow([
    formattedTime,
    formatMillisecondsToHMS(timeToFreeze),
    scoringTeam,
    'Essai',
    '',
    parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
    parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
    `Essai marqué par ${scoringTeam}`
  ]);

  // Demander si la transformation est réussie
  const conversionResponse = ui.alert('Transformation', 'La transformation est-elle réussie ?', ui.ButtonSet.YES_NO);

  // Calculer le temps écoulé pendant la tentative
  const startAttemptTime = new Date().getTime();
  const conversionEndTime = new Date().getTime();
  const attemptDuration = conversionEndTime - startAttemptTime;

  if (conversionResponse === ui.Button.YES) {
    let conversionScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
    conversionScore += 2; // Ajouter 2 points pour la transformation réussie
    scriptProperties.setProperty(currentScoreKey, conversionScore.toString());

    // Enregistrer la transformation réussie
    sheet.appendRow([
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss"),
      formatMillisecondsToHMS(timeToFreeze + attemptDuration),
      scoringTeam,
      'Transformation réussie',
      '',
      scoringTeam === localTeamName ? conversionScore : parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      scoringTeam === visitorTeamName ? conversionScore : parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      `Transformation réussie par ${scoringTeam}`
    ]);
  } else {
    // Enregistrer la transformation ratée
    sheet.appendRow([
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss"),
      formatMillisecondsToHMS(timeToFreeze + attemptDuration),
      scoringTeam,
      'Transformation ratée',
      '',
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      `Transformation ratée par ${scoringTeam}`
    ]);
  }

  // Reprendre le jeu en tenant compte du temps écoulé pendant la tentative
  scriptProperties.setProperty('currentMatchPhase', scriptProperties.getProperty('previousMatchPhase'));
  scriptProperties.setProperty('isTimerRunning', 'true');
  scriptProperties.setProperty('gameTimeAtLastPause', (timeToFreeze + attemptDuration).toString());

  resumeMatchTimer();

  updateSidebar();
  ui.alert("Essai", `Essai de l'équipe ${scoringTeam}.`, ui.ButtonSet.OK);
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

// Fonctions d'assistant pour les prompts d'utilisateur (à ajouter dans Main.gs)
// (Les addScore... restent inchangées, elles appellent déjà addScore directement)
// ... Laissez toutes vos fonctions addScoreLocaleEssai, etc. INCHANGÉES ...

// NOUVELLES FONCTIONS D'ASSISTANT pour les prompts d'utilisateur (à ajouter dans Main.gs)
// Ces fonctions recueillent les informations via des boîtes de dialogue et appellent ScoreManager.gs

function addScoreLocaleEssai() { addScore('Locale', 'Essai', 5, promptForPlayer()); }
function addScoreLocaleTransfo() { addScore('Locale', 'Transformation', 2, promptForPlayer()); }
function addScoreLocalePenalite() { addScore('Locale', 'Pénalité', 3, promptForPlayer()); }
function addScoreLocaleDrop() { addScore('Locale', 'Drop', 3, promptForPlayer()); }

function addScoreVisiteurEssai() { addScore('Visiteur', 'Essai', 5, promptForPlayer()); }
function addScoreVisiteurTransfo() { addScore('Visiteur', 'Transformation', 2, promptForPlayer()); }
function addScoreVisiteurPenalite() { addScore('Visiteur', 'Pénalité', 3, promptForPlayer()); }
function addScoreVisiteurDrop() { addScore('Visiteur', 'Drop', 3, promptForPlayer()); }



// --- FONCTION COMMUNE POUR GÉRER LA FIN D'UN ÉVÉNEMENT DE COUP DE PIED ---
/**
 * Gère la fin d'un événement où le temps était figé (transformation, pénalité).
 * Reprend le jeu si nécessaire ou passe à la mi-temps/fin de match.
 */
function handleKickEventEnd() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();

  const previousPhase = scriptProperties.getProperty('previousMatchPhase');
  const gameTimeAtEventMs = parseInt(scriptProperties.getProperty('gameTimeAtEventMs') || '0', 10);
  const totalMatchTime = 2 * 40 * 60 * 1000; // 2 mi-temps de 40 minutes en ms 

  // Nettoyer les propriétés de l'événement figé
  scriptProperties.setProperty('gameTimeAtEventMs', '0');
  scriptProperties.setProperty('teamAwaitingKick', '');

  // Vérifier si le temps total du match est écoulé
  // Si le temps de l'événement (quand l'essai/pénalité a eu lieu) est >= temps total du match
  // et qu'on était en 2ème mi-temps ou que previousMatchPhase est 'deuxieme_mi_temps'
  if (gameTimeAtEventMs >= totalMatchTime && previousPhase === 'deuxieme_mi_temps') {
    finDeMatch(); // Appelle la fonction de fin de match (présumée être dans Interruptions.gs)
    scriptProperties.setProperty('alertMessage', 'Fin de match après l\'événement.');
  } else if (previousPhase === 'premiere_mi_temps' || previousPhase === 'deuxieme_mi_temps') {
    // Si le match n'est pas fini, reprendre le jeu
    scriptProperties.setProperty('currentMatchPhase', previousPhase); // Restaurer la phase précédente
    resumeMatchTimer(); // Relancer le chronomètre (présumée être dans TimeManager.gs)
    scriptProperties.setProperty('alertMessage', 'Jeu repris après le coup de pied.');
  } else if (previousPhase === 'mi_temps') {
    // Si l'événement a eu lieu juste avant la mi-temps, on passe à la mi-temps
    scriptProperties.setProperty('currentMatchPhase', 'mi_temps');
    scriptProperties.setProperty('alertMessage', 'Mi-temps.');
  } else {
    // Cas par défaut ou imprévu, remettre en pause ou dans un état sûr
    scriptProperties.setProperty('currentMatchPhase', 'pause');
    scriptProperties.setProperty('alertMessage', 'État du jeu incertain après coup de pied, mis en pause.');
  }

  updateSidebar(); // Mettre à jour la sidebar
}

// --- FONCTIONS POUR GÉRER LES TRANSFORMATIONS ---
/**
 * Gère le résultat d'une transformation de l'équipe locale.
 * @param {boolean} isSuccessful Vrai si la transformation est réussie, faux sinon.
 */
function addScoreLocaleTransfo(isSuccessful) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');
  const teamAwaitingKick = scriptProperties.getProperty('teamAwaitingKick');
  const gameTimeAtEventMs = parseInt(scriptProperties.getProperty('gameTimeAtEventMs') || '0', 10);
  const formattedGameTime = formatMillisecondsToHMS(gameTimeAtEventMs); // Utilise le temps figé

  if (currentPhase !== 'awaiting_conversion' || teamAwaitingKick !== 'Locale') {
    ui.alert("Action impossible", "Ce n'est pas le moment pour une transformation Locale.", ui.ButtonSet.OK);
    return;
  }

  let points = 0;
  let actionDescription = 'Transformation Manquée';
  let currentScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  let scoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  if (isSuccessful) {
    points = TRANSFO_POINTS;
    actionDescription = 'Transformation Réussie';
    currentScore += points;
    scriptProperties.setProperty('currentScoreLocal', currentScore.toString());
  }

  recordEvent(new Date(), formattedGameTime, 'Locale', actionDescription, '', currentScore, scoreVisiteur, '');
  ui.alert("Transformation Locale", `${actionDescription}. Nouveau score Locale: ${currentScore}`, ui.ButtonSet.OK);

  // Appelle la fonction commune de fin d'événement de coup de pied
  handleKickEventEnd();
}

/**
 * Gère le résultat d'une transformation de l'équipe visiteur.
 * @param {boolean} isSuccessful Vrai si la transformation est réussie, faux sinon.
 */
function addScoreVisiteurTransfo(isSuccessful) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');
  const teamAwaitingKick = scriptProperties.getProperty('teamAwaitingKick');
  const gameTimeAtEventMs = parseInt(scriptProperties.getProperty('gameTimeAtEventMs') || '0', 10);
  const formattedGameTime = formatMillisecondsToHMS(gameTimeAtEventMs);

  if (currentPhase !== 'awaiting_conversion' || teamAwaitingKick !== 'Visiteur') {
    ui.alert("Action impossible", "Ce n'est pas le moment pour une transformation Visiteur.", ui.ButtonSet.OK);
    return;
  }

  let points = 0;
  let actionDescription = 'Transformation Manquée';
  let currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  let currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  if (isSuccessful) {
    points = TRANSFO_POINTS;
    actionDescription = 'Transformation Réussie';
    currentScoreVisiteur += points;
    scriptProperties.setProperty('currentScoreVisiteur', currentScoreVisiteur.toString());
  }

  recordEvent(new Date(), formattedGameTime, 'Visiteur', actionDescription, '', currentScoreLocal, currentScoreVisiteur, '');
  ui.alert("Transformation Visiteur", `${actionDescription}. Nouveau score Visiteur: ${currentScoreVisiteur}`, ui.ButtonSet.OK);

  handleKickEventEnd();
}

/**
 * Gère une transformation réussie de l'équipe locale.
 * C'est la fonction appelée par le menu.
 */
function addScoreLocaleTransfoReussie() {
  addScoreLocaleTransfo(true); // Appelle la fonction principale avec isSuccessful = true
}

/**
 * Gère une transformation manquée de l'équipe locale.
 * C'est la fonction appelée par le menu.
 */
function addScoreLocaleTransfoManquee() {
  addScoreLocaleTransfo(false); // Appelle la fonction principale avec isSuccessful = false
}

/**
 * Gère une transformation réussie de l'équipe visiteur.
 * C'est la fonction appelée par le menu.
 */
function addScoreVisiteurTransfoReussie() {
  addScoreVisiteurTransfo(true); // Appelle la fonction principale avec isSuccessful = true
}

/**
 * Gère une transformation manquée de l'équipe visiteur.
 * C'est la fonction appelée par le menu.
 */
function addScoreVisiteurTransfoManquee() {
  addScoreVisiteurTransfo(false); // Appelle la fonction principale avec isSuccessful = false
}


// --- FONCTIONS POUR GÉRER LES PÉNALITÉS ---
/**
 * Gère une pénalité réussie de l'équipe locale.
 */
function addScoreLocalePenaliteReussie() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');
  const gameTimeAtEventMs = parseInt(scriptProperties.getProperty('gameTimeAtEventMs') || '0', 10);
  const formattedGameTime = formatMillisecondsToHMS(gameTimeAtEventMs);

  // Vérifier si nous sommes bien en attente de pénalité ou si le jeu est en cours (peut être tirée en jeu)
  // Pour l'instant, on suppose qu'elle fige le temps. Si elle est tirée en jeu, la logique serait différente.
  // Pour simplifier, on gère la pénalité comme un événement qui fige le temps pour l'instant.
  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match' || currentPhase === 'mi_temps') {
     ui.alert("Action impossible", "Le match n'est pas en cours pour marquer une pénalité.", ui.ButtonSet.OK);
     return;
  }

  // --- NOUVEAU: Mettre en pause le chrono et figer le temps si ce n'est pas déjà fait pour une pénalité ---
  // Si la phase n'est pas "awaiting_penalty_kick", cela signifie que la pénalité est marquée en jeu courant.
  // Il faut donc figer le temps MAINTENANT et changer la phase.
  let timeToFreeze;
  if (currentPhase !== 'awaiting_penalty_kick') {
      const currentRunningTimeState = getMatchTimeState();
      timeToFreeze = currentRunningTimeState.tempsDeJeuMs;
      scriptProperties.setProperty('previousMatchPhase', currentPhase); // Sauvegarder la phase
      scriptProperties.setProperty('isTimerRunning', 'false'); // Figer le chrono
      scriptProperties.setProperty('gameTimeAtEventMs', timeToFreeze.toString()); // Enregistrer le temps figé
      scriptProperties.setProperty('currentMatchPhase', 'awaiting_penalty_kick'); // Passer à la phase de pénalité pour cohérence
      scriptProperties.setProperty('teamAwaitingKick', 'Locale'); // Indique qui a la pénalité
  } else {
      timeToFreeze = gameTimeAtEventMs; // Si on était déjà en attente, on reprend le temps figé
  }
  const actualFormattedGameTime = formatMillisecondsToHMS(timeToFreeze);

  let currentScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  let scoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  currentScore += PENALITE_DROP_POINTS;
  scriptProperties.setProperty('currentScoreLocal', currentScore.toString());

  recordEvent(new Date(), actualFormattedGameTime, 'Locale', 'Pénalité Réussie', '', currentScore, scoreVisiteur, '');
  ui.alert("Pénalité Locale", `Pénalité réussie. Nouveau score Locale: ${currentScore}`, ui.ButtonSet.OK);

  // Appelle la fonction commune de fin d'événement de coup de pied
  handleKickEventEnd();
}

/**
 * Gère une pénalité manquée de l'équipe locale.
 */
function addScoreLocalePenaliteManquee() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');
  const gameTimeAtEventMs = parseInt(scriptProperties.getProperty('gameTimeAtEventMs') || '0', 10);
  const formattedGameTime = formatMillisecondsToHMS(gameTimeAtEventMs);

  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match' || currentPhase === 'mi_temps') {
     ui.alert("Action impossible", "Le match n'est pas en cours pour manquer une pénalité.", ui.ButtonSet.OK);
     return;
  }

  // --- NOUVEAU: Mettre en pause le chrono et figer le temps si ce n'est pas déjà fait pour une pénalité ---
  let timeToFreeze;
  if (currentPhase !== 'awaiting_penalty_kick') {
      const currentRunningTimeState = getMatchTimeState();
      timeToFreeze = currentRunningTimeState.tempsDeJeuMs;
      scriptProperties.setProperty('previousMatchPhase', currentPhase);
      scriptProperties.setProperty('isTimerRunning', 'false');
      scriptProperties.setProperty('gameTimeAtEventMs', timeToFreeze.toString());
      scriptProperties.setProperty('currentMatchPhase', 'awaiting_penalty_kick');
      scriptProperties.setProperty('teamAwaitingKick', 'Locale');
  } else {
      timeToFreeze = gameTimeAtEventMs;
  }
  const actualFormattedGameTime = formatMillisecondsToHMS(timeToFreeze);

  let currentScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  let scoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  recordEvent(new Date(), actualFormattedGameTime, 'Locale', 'Pénalité Manquée', '', currentScore, scoreVisiteur, '');
  ui.alert("Pénalité Locale", `Pénalité manquée. Score inchangé.`, ui.ButtonSet.OK);

  handleKickEventEnd();
}

/**
 * Gère une pénalité réussie de l'équipe visiteur.
 */
function addScoreVisiteurPenaliteReussie() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');
  const gameTimeAtEventMs = parseInt(scriptProperties.getProperty('gameTimeAtEventMs') || '0', 10);
  const formattedGameTime = formatMillisecondsToHMS(gameTimeAtEventMs);

  // Vérifier si nous sommes bien en attente de pénalité ou si le jeu est en cours (peut être tirée en jeu)
  // Pour l'instant, on suppose qu'elle fige le temps. Si elle est tirée en jeu, la logique serait différente.
  // Pour simplifier, on gère la pénalité comme un événement qui fige le temps pour l'instant.
  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match' || currentPhase === 'mi_temps') {
     ui.alert("Action impossible", "Le match n'est pas en cours pour marquer une pénalité.", ui.ButtonSet.OK);
     return;
  }

  // --- NOUVEAU: Mettre en pause le chrono et figer le temps si ce n'est pas déjà fait pour une pénalité ---
  // Si la phase n'est pas "awaiting_penalty_kick", cela signifie que la pénalité est marquée en jeu courant.
  // Il faut donc figer le temps MAINTENANT et changer la phase.
  let timeToFreeze;
  if (currentPhase !== 'awaiting_penalty_kick') {
      const currentRunningTimeState = getMatchTimeState();
      timeToFreeze = currentRunningTimeState.tempsDeJeuMs;
      scriptProperties.setProperty('previousMatchPhase', currentPhase); // Sauvegarder la phase
      scriptProperties.setProperty('isTimerRunning', 'false'); // Figer le chrono
      scriptProperties.setProperty('gameTimeAtEventMs', timeToFreeze.toString()); // Enregistrer le temps figé
      scriptProperties.setProperty('currentMatchPhase', 'awaiting_penalty_kick'); // Passer à la phase de pénalité pour cohérence
      scriptProperties.setProperty('teamAwaitingKick', 'Locale'); // Indique qui a la pénalité
  } else {
      timeToFreeze = gameTimeAtEventMs; // Si on était déjà en attente, on reprend le temps figé
  }
  const actualFormattedGameTime = formatMillisecondsToHMS(timeToFreeze);

  let currentScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  let scoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  currentScore += PENALITE_DROP_POINTS;
  scriptProperties.setProperty('currentScoreLocal', currentScore.toString());

  recordEvent(new Date(), actualFormattedGameTime, 'Locale', 'Pénalité Réussie', '', currentScore, scoreVisiteur, '');
  ui.alert("Pénalité Locale", `Pénalité réussie. Nouveau score Locale: ${currentScore}`, ui.ButtonSet.OK);

  // Appelle la fonction commune de fin d'événement de coup de pied
  handleKickEventEnd();
}

/**
 * Gère une pénalité manquée de l'équipe visiteur.
 */
function addScoreVisiteurPenaliteManquee() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');
  const gameTimeAtEventMs = parseInt(scriptProperties.getProperty('gameTimeAtEventMs') || '0', 10);
  const formattedGameTime = formatMillisecondsToHMS(gameTimeAtEventMs);

  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match' || currentPhase === 'mi_temps') {
     ui.alert("Action impossible", "Le match n'est pas en cours pour manquer une pénalité.", ui.ButtonSet.OK);
     return;
  }

  // --- NOUVEAU: Mettre en pause le chrono et figer le temps si ce n'est pas déjà fait pour une pénalité ---
  let timeToFreeze;
  if (currentPhase !== 'awaiting_penalty_kick') {
      const currentRunningTimeState = getMatchTimeState();
      timeToFreeze = currentRunningTimeState.tempsDeJeuMs;
      scriptProperties.setProperty('previousMatchPhase', currentPhase);
      scriptProperties.setProperty('isTimerRunning', 'false');
      scriptProperties.setProperty('gameTimeAtEventMs', timeToFreeze.toString());
      scriptProperties.setProperty('currentMatchPhase', 'awaiting_penalty_kick');
      scriptProperties.setProperty('teamAwaitingKick', 'Locale');
  } else {
      timeToFreeze = gameTimeAtEventMs;
  }
  const actualFormattedGameTime = formatMillisecondsToHMS(timeToFreeze);

  let currentScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  let scoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  recordEvent(new Date(), actualFormattedGameTime, 'Locale', 'Pénalité Manquée', '', currentScore, scoreVisiteur, '');
  ui.alert("Pénalité Locale", `Pénalité manquée. Score inchangé.`, ui.ButtonSet.OK);

  handleKickEventEnd();
}

// --- FONCTIONS POUR GÉRER LES DROPS ---
/**
 * Gère un drop réussi de l'équipe locale.
 */
function addScoreLocaleDrop() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');
  
  // Vérifier si le match est dans une phase active où un drop peut être marqué
  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match' || 
      currentPhase === 'mi_temps' || currentPhase === 'pause' || // Pas pendant une pause "chrono"
      currentPhase === 'awaiting_conversion' || currentPhase === 'awaiting_penalty_kick') { // Pas pendant un temps figé
     ui.alert("Action impossible", "Le match n'est pas en cours pour marquer un drop.", ui.ButtonSet.OK);
     return;
  }

  // Obtenir le temps de jeu ACTUEL qui tourne
  const currentRunningTimeState = getMatchTimeState();
  const timeOfDropMs = currentRunningTimeState.tempsDeJeuMs; // C'est le temps quand l'action est enregistrée
  const formattedGameTime = formatMillisecondsToHMS(timeOfDropMs);

  let currentScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  let scoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  currentScore += PENALITE_DROP_POINTS; // Généralement 3 points
  scriptProperties.setProperty('currentScoreLocal', currentScore.toString());

  // Enregistrer l'événement avec le temps actuel
  recordEvent(new Date(), formattedGameTime, 'Locale', 'Drop Réussi', '', currentScore, scoreVisiteur, '');
  ui.alert("Drop Locale", `Drop réussi. Nouveau score Locale: ${currentScore}`, ui.ButtonSet.OK);

  // AUCUNE action pour figer le temps ou changer la phase après un drop réussi
  // Le chrono continuera naturellement de tourner car il n'a pas été arrêté.
  updateSidebar(); // Juste pour rafraîchir le score et l'alerte dans la sidebar
}

/**
 * Gère un drop réussi de l'équipe visiteur.
 */
function addScoreVisiteurDrop() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');
  
  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match' || 
      currentPhase === 'mi_temps' || currentPhase === 'pause' || 
      currentPhase === 'awaiting_conversion' || currentPhase === 'awaiting_penalty_kick') {
     ui.alert("Action impossible", "Le match n'est pas en cours pour marquer un drop.", ui.ButtonSet.OK);
     return;
  }

  const currentRunningTimeState = getMatchTimeState();
  const timeOfDropMs = currentRunningTimeState.tempsDeJeuMs;
  const formattedGameTime = formatMillisecondsToHMS(timeOfDropMs);

  let currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  let currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  currentScoreVisiteur += PENALITE_DROP_POINTS;
  scriptProperties.setProperty('currentScoreVisiteur', currentScoreVisiteur.toString());

  recordEvent(new Date(), formattedGameTime, 'Visiteur', 'Drop Réussi', '', currentScoreLocal, currentScoreVisiteur, '');
  ui.alert("Drop Visiteur", `Drop réussi. Nouveau score Visiteur: ${currentScoreVisiteur}`, ui.ButtonSet.OK);

  updateSidebar();
}
