function addEssai() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Bloquer si le match n'est pas démarré ou déjà terminé
  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match' || currentPhase === 'mi_temps' || currentPhase === 'pause') { // Ajout mi_temps et pause
    ui.alert("Match non démarré", "Veuillez démarrer le match ou reprendre le jeu avant d'ajouter un score.", ui.ButtonSet.OK);
    return;
  }

  // Récupérer le temps actuel du chronomètre pour l'enregistrement de l'essai
  const matchTimeStateAtEssai = getMatchTimeState();
  const timeOfEssaiMs = matchTimeStateAtEssai.tempsDeJeuMs;

  // Demander quelle équipe a marqué l'essai
  const localTeamName = getLocalTeamName(); // Assumé être dans TeamManager.gs
  const visitorTeamName = getVisitorTeamName(); // Assumé être dans TeamManager.gs

  const teamChoice = ui.prompt(
    'Essai marqué par:',
    `1. ${localTeamName}\n2. ${visitorTeamName}\nEntrez 1 ou 2:`,
    ui.ButtonSet.OK_CANCEL
  );

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

  // Mettre à jour le score de l'essai
  const currentScoreKey = scoringTeam === localTeamName ? 'currentScoreLocal' : 'currentScoreVisiteur';
  let currentScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
  currentScore += 5; // Ajouter 5 points pour l'essai
  scriptProperties.setProperty(currentScoreKey, currentScore.toString());

  // Enregistrer l'essai
  recordEvent(
    new Date(),
    formatMillisecondsToHMS(timeOfEssaiMs), // Temps de l'essai
    scoringTeam,
    'Essai',
    '', // Joueur non spécifié ici, à ajouter si besoin
    parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
    parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
    `Essai marqué par ${scoringTeam}`
  );

  // Demander si la transformation est réussie
  const conversionResponse = ui.alert('Transformation', 'La transformation est-elle réussie ?', ui.ButtonSet.YES_NO);

  // Récupérer le temps actuel pour l'enregistrement de la transformation
  // Le chrono continue de tourner, donc on prend le temps au moment de la réponse
  const matchTimeStateAtConversion = getMatchTimeState();
  const timeOfConversionMs = matchTimeStateAtConversion.tempsDeJeuMs;

  if (conversionResponse === ui.Button.YES) {
    let conversionScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
    conversionScore += 2; // Ajouter 2 points pour la transformation réussie
    scriptProperties.setProperty(currentScoreKey, conversionScore.toString());

    // Enregistrer la transformation réussie
    recordEvent(
      new Date(),
      formatMillisecondsToHMS(timeOfConversionMs), // Temps de la transformation
      scoringTeam,
      'Transformation réussie',
      '',
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      `Transformation réussie par ${scoringTeam}`
    );
  } else {
    // Enregistrer la transformation ratée
    recordEvent(
      new Date(),
      formatMillisecondsToHMS(timeOfConversionMs), // Temps de la transformation
      scoringTeam,
      'Transformation ratée',
      '',
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      `Transformation ratée par ${scoringTeam}`
    );
  }

  // Reprendre le jeu : Le jeu n'a pas été arrêté, donc le chrono continue de tourner.
  // La phase du match doit rester la même qu'avant l'essai.
  // Pas besoin de `resumeMatchTimer()` ni de changer `isTimerRunning` si elle était déjà `true`.
  // S'assurer que le message d'alerte est vide après l'action.
  scriptProperties.setProperty('alertMessage', '');

  updateSidebar();
  ui.alert("Essai", `Essai de l'équipe ${scoringTeam} et transformation gérée.`, ui.ButtonSet.OK);
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

// NOUVELLES FONCTIONS D'ASSISTANT pour les prompts d'utilisateur (à ajouter dans Main.gs)
// Ces fonctions recueillent les informations via des boîtes de dialogue et appellent ScoreManager.gs

function addScoreLocalePenalite() { addScore('Locale', 'Pénalité', 3, promptForPlayer()); }
function addScoreLocaleDrop() { addScore('Locale', 'Drop', 3, promptForPlayer()); }


function addScoreVisiteurPenalite() { addScore('Visiteur', 'Pénalité', 3, promptForPlayer()); }
function addScoreVisiteurDrop() { addScore('Visiteur', 'Drop', 3, promptForPlayer()); }
 

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
