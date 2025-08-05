// --- CONSTANTES DE POINTS ---
const ESSAI_POINTS = 5;
const TRANSFO_POINTS = 2;
const PENALITE_POINTS = 3;
const DROP_POINTS = 3;
const ESSAI_PENALITE_POINTS = 7;

/**
 * Fonction utilitaire interne pour vérifier si l'ajout d'un score est permis en phase actuelle.
 * @returns {boolean} True si l'action est permise, false sinon.
 */
function isScoreAllowedForPhase() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');

  if (currentPhase === 'non_demarre' || currentPhase === 'fin_de_match' || currentPhase === 'mi_temps' || currentPhase === 'pause') {
    ui.alert("Action impossible", "Veuillez démarrer le match ou reprendre le jeu avant d'ajouter un score.", ui.ButtonSet.OK);
    // AJOUT IMPORTANT : Déclenche le rafraîchissement de la sidebar même en cas d'erreur
    // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
    ouvrirTableauDeBord();
    return false;
  }
  return true;
}

// --- FONCTION POUR GÉRER LES ESSAIS ---
/**
 * Gère un essai.
 */
function addEssai() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();

  if (!isScoreAllowedForPhase()) {
    return;
  }

  // Récupérer le temps actuel du chronomètre pour l'enregistrement de l'essai
  const matchTimeStateAtEssai = getMatchTimeState();
  const timeOfEssaiMs = matchTimeStateAtEssai.tempsDeJeuMs;

  // Demander quelle équipe a marqué l'essai
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();

  const teamChoice = ui.prompt(
    'Essai marqué par:',
    `1. ${localTeamName}\n2. ${visitorTeamName}\nEntrez 1 ou 2:`,
    ui.ButtonSet.OK_CANCEL
  );

  if (teamChoice.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Annulé", "L'ajout d'essai a été annulé.", ui.ButtonSet.OK);
    // AJOUT IMPORTANT : Déclenche le rafraîchissement de la sidebar même si annulé
    // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
    ouvrirTableauDeBord();
    return;
  }

  let scoringTeam;
  if (teamChoice.getResponseText().trim() === '1') {
    scoringTeam = localTeamName;
  } else if (teamChoice.getResponseText().trim() === '2') {
    scoringTeam = visitorTeamName;
  } else {
    ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
    // AJOUT IMPORTANT : Déclenche le rafraîchissement de la sidebar même si l'entrée est invalide
    // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
    ouvrirTableauDeBord();
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
    `Essai marqué pour ${scoringTeam}`
  );

  // Demander si la transformation est réussie
  const conversionResponse = ui.alert('Transformation', 'La transformation est-elle réussie ?', ui.ButtonSet.YES_NO);

  // Récupérer le temps actuel pour l'enregistrement de la transformation
  const matchTimeStateAtConversion = getMatchTimeState();
  const timeOfConversionMs = matchTimeStateAtConversion.tempsDeJeuMs;

  if (conversionResponse === ui.Button.YES) {
    let conversionScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
    conversionScore += TRANSFO_POINTS; // Ajouter 2 points pour la transformation réussie
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
      `Transformation réussie pour ${scoringTeam}`
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
      `Transformation ratée pour ${scoringTeam}`
    );
  }

  scriptProperties.setProperty('alertMessage', '');
  // CORRECTION : Remplacer updateSidebar() par l'appel direct au rafraîchissement de la sidebar
  // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
  ouvrirTableauDeBord();
  ui.alert("Essai", `Essai de l'équipe ${scoringTeam} et transformation gérée.`, ui.ButtonSet.OK);
}

// --- FONCTION POUR GÉRER LES PÉNALITÉS ---
/**
 * Gère une tentative de pénalité.
 */
function addPenalite() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();

  if (!isScoreAllowedForPhase()) {
    return;
  }

  // Récupérer le temps actuel du chronomètre
  const currentRunningTimeState = getMatchTimeState();
  const timeOfPenalty = currentRunningTimeState.tempsDeJeuMs;

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
    // AJOUT IMPORTANT : Déclenche le rafraîchissement de la sidebar même si annulé
    // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
    ouvrirTableauDeBord();
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
    // AJOUT IMPORTANT : Déclenche le rafraîchissement de la sidebar même si l'entrée est invalide
    // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
    ouvrirTableauDeBord();
    return;
  }

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
      `Pénalité réussie pour ${penalizedTeam}`
    );
  } else {
    // Enregistrer la pénalité ratée
    recordEvent(
      new Date(),
      formatMillisecondsToHMS(timeOfPenalty),
      penalizedTeam,
      'Pénalité ratée',
      '', // Joueur (vide si non applicable ici)
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      `Pénalité ratée pour ${penalizedTeam}`
    );
  }

  // CORRECTION : Remplacer updateSidebar() par l'appel direct au rafraîchissement de la sidebar
  // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
  ouvrirTableauDeBord();
  ui.alert("Pénalité", `Pénalité ${successResponse === ui.Button.YES ? 'réussie' : 'ratée'} par ${penalizedTeam}.`, ui.ButtonSet.OK);
}

// --- FONCTIONS POUR GÉRER LES DROPS ---
/**
 * Gère une tentative de drop.
 */
function addDrop() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();

  if (!isScoreAllowedForPhase()) {
    return;
  }

  // Récupérer le temps actuel du chronomètre
  const currentRunningTimeState = getMatchTimeState();
  const timeOfDrop = currentRunningTimeState.tempsDeJeuMs;

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
    // AJOUT IMPORTANT : Déclenche le rafraîchissement de la sidebar même si annulé
    // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
    ouvrirTableauDeBord();
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
    // AJOUT IMPORTANT : Déclenche le rafraîchissement de la sidebar même si l'entrée est invalide
    // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
    ouvrirTableauDeBord();
    return;
  }

  // Demander si le drop est réussi
  const successResponse = ui.alert('Drop réussi ?', 'Le  drop est-il réussi ?', ui.ButtonSet.YES_NO);

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
      `Drop réussi pour ${dropTeam}`
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
      `Drop ratée pour ${dropTeam}`
    );
  }

  // CORRECTION : Remplacer updateSidebar() par l'appel direct au rafraîchissement de la sidebar
  // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
  ouvrirTableauDeBord();
  ui.alert("Drop", `Drop ${successResponse === ui.Button.YES ? 'réussi' : 'raté'} par ${dropTeam}.`, ui.ButtonSet.OK);
}

/**
 * Gère un essai de penalité.
 */
function addEssaiPenalite() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();

  if (!isScoreAllowedForPhase()) {
    return;
  }

  // Récupérer le temps actuel du chronomètre pour l'enregistrement de l'essai
  const matchTimeStateAtEssai = getMatchTimeState();
  const timeOfEssaiMs = matchTimeStateAtEssai.tempsDeJeuMs;

  // Demander quelle équipe a bénéficié l'essai de pénlité
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();

  const teamChoice = ui.prompt(
    'Essai de pénalité pour :',
    `1. ${localTeamName}\n2. ${visitorTeamName}\nEntrez 1 ou 2:`,
    ui.ButtonSet.OK_CANCEL
  );

  if (teamChoice.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Annulé", "L'ajout de l'essai a été annulé.", ui.ButtonSet.OK);
    // AJOUT IMPORTANT : Déclenche le rafraîchissement de la sidebar même si annulé
    // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
    ouvrirTableauDeBord();
    return;
  }

  let scoringTeam;
  if (teamChoice.getResponseText().trim() === '1') {
    scoringTeam = localTeamName;
  } else if (teamChoice.getResponseText().trim() === '2') {
    scoringTeam = visitorTeamName;
  } else {
    ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
    // AJOUT IMPORTANT : Déclenche le rafraîchissement de la sidebar même si l'entrée est invalide
    // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
    ouvrirTableauDeBord();
    return;
  }

  // Mettre à jour le score de l'essai de pénalité
  const currentScoreKey = scoringTeam === localTeamName ? 'currentScoreLocal' : 'currentScoreVisiteur';
  let currentScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
  currentScore += ESSAI_PENALITE_POINTS; // Ajouter 7 points pour l'essai
  scriptProperties.setProperty(currentScoreKey, currentScore.toString());

  // Enregistrer l'essai de pénalité
  recordEvent(
    new Date(),
    formatMillisecondsToHMS(timeOfEssaiMs), // Temps de l'essai
    scoringTeam,
    'Essai de pénalité',
    '', // Joueur non spécifié ici, à ajouter si besoin
    parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
    parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
    `Essai de pénalité pour ${scoringTeam}`
  );

  scriptProperties.setProperty('alertMessage', '');
  // CORRECTION : Remplacer updateSidebar() par l'appel direct au rafraîchissement de la sidebar
  // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
  ouvrirTableauDeBord();
  ui.alert("Essai de pénalité", `Essai de pénalité pour ${scoringTeam}.`, ui.ButtonSet.OK);
}
