// --- CONSTANTES DE POINTS ---
const ESSAI_POINTS = 5;
const TRANSFO_POINTS = 2;
const PENALITE_POINTS = 3;
const DROP_POINTS = 3;

// --- FONCTION POUR GÉRER LES ESSAIS ---
/**
 * Gère un essai.
 */

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
  currentScore += ESSAI_POINTS; // Ajouter 5 points pour l'essai
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

// --- FONCTION POUR GÉRER LES PÉNALITÉS ---
/**
 * Gère une tentative de pénalité.
 */
function addPenalite() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Bloquer si le match n'est pas démarré ou déjà terminé
  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match' || currentPhase === 'mi_temps' || currentPhase === 'pause') { // Ajout mi_temps et pause
    ui.alert("Match non démarré", "Veuillez démarrer le match ou reprendre le jeu avant d'ajouter un score.", ui.ButtonSet.OK);
    return;
  }

  // Récupérer le temps actuel du chronomètre
  const currentRunningTimeState = getMatchTimeState();
  const timeOfPenalty = currentRunningTimeState.tempsDeJeuMs;

  // Formater l'heure sans la date
  const formattedTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss");

  // Récupérer les noms des équipes
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();

  // Demander quelle équipe bénéficie de la pénalité
  const response = ui.prompt(
    'Pénalité pour quelle équipe ?',
    `1. ${localTeamName}\n2. ${visitorTeamName}\nEntrez 1 ou 2:`,
    ui.ButtonSet.OK_CANCEL
  );

  // Vérifier si l'utilisateur a annulé
  if (response.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Annulé", "L'ajout de pénalité a été annulé.", ui.ButtonSet.OK);
    return;
  }

  // Déterminer l'équipe qui bénéficie de la pénalité
  let penalizedTeam;
  if (response.getResponseText().trim() === '1') {
    penalizedTeam = localTeamName;
  } else if (response.getResponseText().trim() === '2') {
    penalizedTeam = visitorTeamName;
  } else {
    ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
    return;
  }

  // Ouvrir la feuille et préparer les données
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Saisie');

  // Demander si la pénalité est réussie
  const successResponse = ui.alert('Pénalité réussie ?', 'La pénalité est-elle réussie ?', ui.ButtonSet.YES_NO);

  // Mettre à jour le score et écrire dans la feuille
  const currentScoreKey = penalizedTeam === localTeamName ? 'currentScoreLocal' : 'currentScoreVisiteur';
  let currentScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);

  if (successResponse === ui.Button.YES) {
    currentScore += PENALITE_POINTS; // Ajouter 3 points pour la pénalité réussie
    scriptProperties.setProperty(currentScoreKey, currentScore.toString());

    // Enregistrer la pénalité réussie
    recordEvent(
      new Date(),
      formatMillisecondsToHMS(timeOfPenalty),
      penalizedTeam,
      'Pénalité réussie',
      '', // Joueur (vide si non applicable ici)
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      `Pénalité réussie par ${penalizedTeam}`
    );
  } else {
    // Enregistrer la pénalité ratée
    recordEvent(
      new Date,
      formatMillisecondsToHMS(timeOfPenalty),
      penalizedTeam,
      'Pénalité ratée',
      '', // Joueur (vide si non applicable ici)
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      `Pénalité ratée par ${penalizedTeam}`
    );
  }

  updateSidebar();
  ui.alert("Pénalité", `Pénalité ${successResponse === ui.Button.YES ? 'réussie' : 'ratée'} par ${penalizedTeam}.`, ui.ButtonSet.OK);
}


// --- FONCTIONS POUR GÉRER LES DROPS ---
/**
 * Gère une tentative de drop.
 */
function addDrop() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  // Bloquer si le match n'est pas démarré ou déjà terminé
  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match' || currentPhase === 'mi_temps' || currentPhase === 'pause') { // Ajout mi_temps et pause
    ui.alert("Match non démarré", "Veuillez démarrer le match ou reprendre le jeu avant d'ajouter un score.", ui.ButtonSet.OK);
    return;
  }

  // Récupérer le temps actuel du chronomètre
  const currentRunningTimeState = getMatchTimeState();
  const timeOfDrop = currentRunningTimeState.tempsDeJeuMs;

  // Formater l'heure sans la date
  const formattedTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss");

  // Récupérer les noms des équipes
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();

  // Demander quelle équipe bénéficie du drop
  const response = ui.prompt(
    'Drop pour quelle équipe ?',
    `1. ${localTeamName}\n2. ${visitorTeamName}\nEntrez 1 ou 2:`,
    ui.ButtonSet.OK_CANCEL
  );

  // Vérifier si l'utilisateur a annulé
  if (response.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Annulé", "L'ajout du drop a été annulé.", ui.ButtonSet.OK);
    return;
  }

  // Déterminer l'équipe qui bénéficie du drop
  let dropTeam;
  if (response.getResponseText().trim() === '1') {
    dropTeam = localTeamName;
  } else if (response.getResponseText().trim() === '2') {
    dropTeam = visitorTeamName;
  } else {
    ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
    return;
  }

  // Ouvrir la feuille et préparer les données
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Saisie');

  // Demander si le drop est réussi
  const successResponse = ui.alert('Drop réussi ?', 'Le drop est-il réussi ?', ui.ButtonSet.YES_NO);

  // Mettre à jour le score et écrire dans la feuille
  const currentScoreKey = dropTeam === localTeamName ? 'currentScoreLocal' : 'currentScoreVisiteur';
  let currentScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);

  if (successResponse === ui.Button.YES) {
    currentScore += DROP_POINTS; // Ajouter 3 points pour le drop réussi
    scriptProperties.setProperty(currentScoreKey, currentScore.toString());

    // Enregistrer le drop réussi
    recordEvent(
      new Date(),
      formatMillisecondsToHMS(timeOfDrop),
      dropTeam,
      'Drop réussi',
      '',
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      `Drop réussi par ${dropTeam}`
    );
  } else {
    // Enregistrer le drop raté
    recordEvent(
      new Date(),
      formatMillisecondsToHMS(timeOfDrop),
      dropTeam,
      'Drop raté',
      '',
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      `Drop raté par ${dropTeam}`
    );
  }

  updateSidebar();
  ui.alert("Drop", `Drop ${successResponse === ui.Button.YES ? 'réussi' : 'raté'} par ${dropTeam}.`, ui.ButtonSet.OK);
}
