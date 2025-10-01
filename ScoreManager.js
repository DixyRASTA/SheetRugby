// --- CONSTANTES DE POINTS ---
const ESSAI_POINTS = 5;
const TRANSFO_POINTS = 2;
const PENALITE_POINTS = 3;
const DROP_POINTS = 3;
const ESSAI_PENALITE_POINTS = 7;

/**
 * Fonction utilitaire pour récupérer le nom d'un joueur à partir de son numéro
 * @param {string|number} playerNumber Le numéro du joueur (1-22)
 * @param {string} teamName Le nom de l'équipe pour déterminer quelle feuille utiliser
 * @returns {string} Le nom du joueur ou une chaîne vide si non trouvé
 */
function getPlayerNameByNumber(playerNumber, teamName) {
  if (!playerNumber || playerNumber.toString().trim() === '') {
    return '';
  }
  
  const num = parseInt(playerNumber, 10);
  if (isNaN(num) || num < 1 || num > 22) {
    Logger.log(`Numéro de joueur invalide: ${playerNumber}`);
    return '';
  }
  
  try {
    // Déterminer quelle feuille utiliser selon l'équipe
    const localTeamName = getLocalTeamName();
    const isLocalTeam = teamName === localTeamName;
    const sheetName = isLocalTeam ? "Joueurs 1" : "Joueurs 2";
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      Logger.log(`Erreur: La feuille '${sheetName}' n'a pas été trouvée.`);
      return '';
    }
    
    // Supposant que les numéros sont en colonne A (1-22) et les noms en colonne B
    // Ligne 1 = joueur n°1, ligne 2 = joueur n°2, etc.
    const playerName = sheet.getRange(num, 2).getValue();
    
    if (playerName && playerName.toString().trim() !== '') {
      Logger.log(`Joueur trouvé dans ${sheetName}: N°${num} = ${playerName}`);
      return playerName.toString().trim();
    } else {
      Logger.log(`Aucun nom trouvé pour le joueur N°${num} dans ${sheetName}`);
      return '';
    }
    
  } catch (error) {
    Logger.log(`Erreur lors de la récupération du joueur N°${num}: ${error.message}`);
    return '';
  }
}

/**
 * Fonction utilitaire pour demander le numéro de joueur avec gestion d'erreur
 * @param {string} action Le type d'action (pour le message)
 * @param {string} teamName Le nom de l'équipe
 * @returns {Object} Objet contenant {playerNumber: string, playerName: string, cancelled: boolean}
 */
function promptForPlayer(action, teamName) {
  const ui = SpreadsheetApp.getUi();
  
  const playerPrompt = ui.prompt(
    `${action} - Joueur`,
    `Numéro du joueur de ${teamName} (1-22) ?\n(Laissez vide si non applicable)`,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (playerPrompt.getSelectedButton() !== ui.Button.OK) {
    return { playerNumber: '', playerName: '', cancelled: true };
  }
  
  const playerNumberInput = playerPrompt.getResponseText().trim();
  let playerName = '';
  
  if (playerNumberInput !== '') {
    const num = parseInt(playerNumberInput, 10);
    if (isNaN(num) || num < 1 || num > 22) {
      ui.alert("Numéro invalide", "Le numéro de joueur doit être compris entre 1 et 22.", ui.ButtonSet.OK);
      // On ne bloque pas, on continue avec un joueur vide
      return { playerNumber: '', playerName: '', cancelled: false };
    } else {
      playerName = getPlayerNameByNumber(num, teamName);
  if (playerName === '') {
        ui.alert("Joueur non trouvé", `Aucun nom trouvé pour le joueur N°${num} dans la feuille correspondante.`, ui.ButtonSet.OK);
        // On continue avec le numéro mais sans nom
        playerName = `Joueur N°${num}`;
      }
    }
  }
  
  return { 
    playerNumber: playerNumberInput, 
    playerName: playerName, 
    cancelled: false 
  };
}

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
ouvrirTableauDeBord();
return;
}

// NOUVEAU : Demander le joueur qui a marqué l'essai
const playerInfo = promptForPlayer('Essai', scoringTeam);
if (playerInfo.cancelled) {
ui.alert("Annulé", "L'ajout d'essai a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// Mettre à jour le score de l'essai
const currentScoreKey = scoringTeam === localTeamName ? 'currentScoreLocal' : 'currentScoreVisiteur';
let currentScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
currentScore += ESSAI_POINTS; // Ajouter 5 points pour l'essai
scriptProperties.setProperty(currentScoreKey, currentScore.toString());

// Enregistrer l'essai avec le nom du joueur
recordEvent(
new Date(),
formatMillisecondsToHMS(timeOfEssaiMs), // Temps de l'essai
scoringTeam,
'Essai',
playerInfo.playerName, // NOUVEAU : Nom du joueur récupéré
parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
`Essai marqué par ${playerInfo.playerName || 'joueur non spécifié'} pour ${scoringTeam}`
);

// Demander si la transformation est réussie
const conversionResponse = ui.alert('Transformation', 'La transformation est-elle réussie ?', ui.ButtonSet.YES_NO);

// NOUVEAU : Demander le buteur pour la transformation
const conversionPlayerInfo = promptForPlayer('Transformation', scoringTeam);
if (conversionPlayerInfo.cancelled) {
// Si annulé, on continue sans joueur pour la transformation
conversionPlayerInfo.playerName = '';
}

// CORRECTION : Utiliser le même temps que l'essai pour la transformation
if (conversionResponse === ui.Button.YES) {
let conversionScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
conversionScore += TRANSFO_POINTS; // Ajouter 2 points pour la transformation réussie
scriptProperties.setProperty(currentScoreKey, conversionScore.toString());

// Enregistrer la transformation réussie avec le MÊME temps que l'essai
recordEvent(
new Date(),
formatMillisecondsToHMS(timeOfEssaiMs), // CORRECTION : Utilise le temps de l'essai
scoringTeam,
'Transformation réussie',
conversionPlayerInfo.playerName, // NOUVEAU : Nom du buteur
parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
`Transformation réussie par ${conversionPlayerInfo.playerName || 'joueur non spécifié'} pour ${scoringTeam}`
);
} else {
// Enregistrer la transformation ratée avec le MÊME temps que l'essai
recordEvent(
new Date(),
formatMillisecondsToHMS(timeOfEssaiMs), // CORRECTION : Utilise le temps de l'essai
scoringTeam,
'Transformation ratée',
conversionPlayerInfo.playerName, // NOUVEAU : Nom du buteur
parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
`Transformation ratée par ${conversionPlayerInfo.playerName || 'joueur non spécifié'} pour ${scoringTeam}`
);
}

scriptProperties.setProperty('alertMessage', '');
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
ouvrirTableauDeBord();
return;
}

// NOUVEAU : Demander le joueur qui tire la pénalité
const playerInfo = promptForPlayer('Pénalité', penalizedTeam);
if (playerInfo.cancelled) {
ui.alert("Annulé", "L'ajout de pénalité a été annulé.", ui.ButtonSet.OK);
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
playerInfo.playerName, // NOUVEAU : Nom du buteur
parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
`Pénalité réussie par ${playerInfo.playerName || 'joueur non spécifié'} pour ${penalizedTeam}`
);
} else {
// Enregistrer la pénalité ratée
recordEvent(
new Date(),
formatMillisecondsToHMS(timeOfPenalty),
penalizedTeam,
'Pénalité ratée',
playerInfo.playerName, // NOUVEAU : Nom du buteur
parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
`Pénalité ratée par ${playerInfo.playerName || 'joueur non spécifié'} pour ${penalizedTeam}`
);
}

ouvrirTableauDeBord();
ui.alert("Pénalité", `Pénalité ${successResponse === ui.Button.YES ? 'réussie' : 'ratée'} par ${playerInfo.playerName || 'joueur non spécifié'}.`, ui.ButtonSet.OK);
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
ouvrirTableauDeBord();
return;
}

// NOUVEAU : Demander le joueur qui tire le drop
const playerInfo = promptForPlayer('Drop', dropTeam);
if (playerInfo.cancelled) {
ui.alert("Annulé", "L'ajout du drop a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

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
playerInfo.playerName, // NOUVEAU : Nom du buteur
parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
`Drop réussi par ${playerInfo.playerName || 'joueur non spécifié'} pour ${dropTeam}`
);
} else {
// Enregistrer le drop raté
recordEvent(
new Date(),
formatMillisecondsToHMS(timeOfDrop),
dropTeam,
'Drop raté',
playerInfo.playerName, // NOUVEAU : Nom du buteur
parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
`Drop raté par ${playerInfo.playerName || 'joueur non spécifié'} pour ${dropTeam}`
);
}

ouvrirTableauDeBord();
ui.alert("Drop", `Drop ${successResponse === ui.Button.YES ? 'réussi' : 'raté'} par ${playerInfo.playerName || 'joueur non spécifié'}.`, ui.ButtonSet.OK);
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

// Demander quelle équipe a bénéficié l'essai de pénalité
const localTeamName = getLocalTeamName();
const visitorTeamName = getVisitorTeamName();

const teamChoice = ui.prompt(
'Essai de pénalité pour :',
`1. ${localTeamName}\n2. ${visitorTeamName}\nEntrez 1 ou 2:`,
ui.ButtonSet.OK_CANCEL
);

if (teamChoice.getSelectedButton() !== ui.Button.OK) {
ui.alert("Annulé", "L'ajout de l'essai a été annulé.", ui.ButtonSet.OK);
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
ouvrirTableauDeBord();
return;
}

// Mettre à jour le score de l'essai de pénalité
const currentScoreKey = scoringTeam === localTeamName ? 'currentScoreLocal' : 'currentScoreVisiteur';
let currentScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
currentScore += ESSAI_PENALITE_POINTS; // Ajouter 7 points pour l'essai
scriptProperties.setProperty(currentScoreKey, currentScore.toString());

// Enregistrer l'essai de pénalité (pas de joueur spécifique pour un essai de pénalité)
recordEvent(
new Date(),
formatMillisecondsToHMS(timeOfEssaiMs), // Temps de l'essai
scoringTeam,
'Essai de pénalité',
'', // Pas de joueur spécifique pour un essai de pénalité
parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
`Essai de pénalité pour ${scoringTeam}`
);

scriptProperties.setProperty('alertMessage', '');
ouvrirTableauDeBord();
ui.alert("Essai de pénalité", `Essai de pénalité pour ${scoringTeam}.`, ui.ButtonSet.OK);
}