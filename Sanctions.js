/**
* @file Gère la logique des sanctions (cartons) et des événements génériques.
*/

/**
 * Fonction utilitaire pour récupérer le nom d'un joueur à partir de son numéro (pour les sanctions)
 * @param {string|number} playerNumber Le numéro du joueur (1-22)
 * @param {string} teamName Le nom de l'équipe pour déterminer quelle feuille utiliser
 * @returns {string} Le nom du joueur ou une chaîne vide si non trouvé
 */
function getPlayerNameByNumberForSanction(playerNumber, teamName) {
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
 * Fonction utilitaire pour demander le numéro de joueur avec gestion d'erreur (pour sanctions)
 * @param {string} sanctionType Le type de sanction (pour le message)
 * @param {string} teamName Le nom de l'équipe
 * @returns {Object} Objet contenant {playerNumber: string, playerName: string, cancelled: boolean}
 */
function promptForPlayerSanction(sanctionType, teamName) {
  const ui = SpreadsheetApp.getUi();
  
  const playerPrompt = ui.prompt(
    `${sanctionType} - Joueur`,
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
      playerName = getPlayerNameByNumberForSanction(num, teamName);
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
* Enregistre un carton Blanc pour un joueur d'une équipe.
* Déclenche les prompts pour l'équipe et le joueur.
*/
function recordCartonBlancPrompt() {
const ui = SpreadsheetApp.getUi();
const scriptProperties = PropertiesService.getScriptProperties();

if (!isScoreAllowedForPhase()) {
return;
}

const matchTimeState = getMatchTimeState();
const timeOfEvent = matchTimeState.tempsDeJeuMs;

const localTeamName = getLocalTeamName();
const visitorTeamName = getVisitorTeamName();

const teamChoice = ui.prompt(
'Carton Blanc - Équipe',
`Quelle équipe a reçu un carton blanc ?\n1. ${localTeamName}\n2. ${visitorTeamName}`,
ui.ButtonSet.OK_CANCEL
);

if (teamChoice.getSelectedButton() !== ui.Button.OK) {
ui.alert("Annulé", "L'ajout du carton blanc a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

let penalizedTeam;
if (teamChoice.getResponseText().trim() === '1') {
penalizedTeam = localTeamName;
} else if (teamChoice.getResponseText().trim() === '2') {
penalizedTeam = visitorTeamName;
} else {
ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// NOUVEAU : Utiliser la nouvelle gestion des joueurs
const playerInfo = promptForPlayerSanction('Carton Blanc', penalizedTeam);
if (playerInfo.cancelled) {
ui.alert("Annulé", "L'ajout du carton blanc a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// Demander une remarque optionnelle
const remarkResponse = ui.prompt(
'Carton Blanc - Remarque',
`Remarque optionnelle (ex: "faute technique") :`,
ui.ButtonSet.OK_CANCEL
);

if (remarkResponse.getSelectedButton() !== ui.Button.OK) {
ui.alert("Annulé", "L'ajout du carton blanc a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

const remarque = remarkResponse.getResponseText().trim();
const finalRemark = remarque ? 
`Carton Blanc pour ${penalizedTeam}${playerInfo.playerName ? ' (' + playerInfo.playerName + ')' : ''}: ${remarque}` :
`Carton Blanc pour ${penalizedTeam}${playerInfo.playerName ? ' (' + playerInfo.playerName + ')' : ''}`;

const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

recordEvent(
new Date(),
formatMillisecondsToHMS(timeOfEvent),
penalizedTeam,
'Carton Blanc',
playerInfo.playerName,
currentScoreLocal,
currentScoreVisiteur,
finalRemark
);
scriptProperties.setProperty('alertMessage', '');
ouvrirTableauDeBord();
ui.alert("Carton Blanc", `Carton Blanc pour ${penalizedTeam}.`, ui.ButtonSet.OK);
}

function recordCartonJaunePrompt() {
const ui = SpreadsheetApp.getUi();
const scriptProperties = PropertiesService.getScriptProperties();

if (!isScoreAllowedForPhase()) {
return;
}

const matchTimeState = getMatchTimeState();
const timeOfEvent = matchTimeState.tempsDeJeuMs;

const localTeamName = getLocalTeamName();
const visitorTeamName = getVisitorTeamName();

const teamChoice = ui.prompt(
'Carton Jaune - Équipe',
`Quelle équipe a reçu un carton jaune ?\n1. ${localTeamName}\n2. ${visitorTeamName}`,
ui.ButtonSet.OK_CANCEL
);

if (teamChoice.getSelectedButton() !== ui.Button.OK) {
ui.alert("Annulé", "L'ajout du carton jaune a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

let penalizedTeam;
if (teamChoice.getResponseText().trim() === '1') {
penalizedTeam = localTeamName;
} else if (teamChoice.getResponseText().trim() === '2') {
penalizedTeam = visitorTeamName;
} else {
ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// NOUVEAU : Utiliser la nouvelle gestion des joueurs
const playerInfo = promptForPlayerSanction('Carton Jaune', penalizedTeam);
if (playerInfo.cancelled) {
ui.alert("Annulé", "L'ajout du carton jaune a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// Demander une remarque optionnelle
const remarkResponse = ui.prompt(
'Carton Jaune - Remarque',
`Remarque optionnelle (ex: "faute technique", "plaquage haut") :`,
ui.ButtonSet.OK_CANCEL
);

if (remarkResponse.getSelectedButton() !== ui.Button.OK) {
ui.alert("Annulé", "L'ajout du carton jaune a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

const remarque = remarkResponse.getResponseText().trim();
const finalRemark = remarque ? 
`Carton Jaune pour ${penalizedTeam}${playerInfo.playerName ? ' (' + playerInfo.playerName + ')' : ''}: ${remarque}` :
`Carton Jaune pour ${penalizedTeam}${playerInfo.playerName ? ' (' + playerInfo.playerName + ')' : ''}`;

const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

recordEvent(
new Date(),
formatMillisecondsToHMS(timeOfEvent),
penalizedTeam,
'Carton Jaune',
playerInfo.playerName,
currentScoreLocal,
currentScoreVisiteur,
finalRemark
);

scriptProperties.setProperty('alertMessage', '');
ouvrirTableauDeBord();
ui.alert("Carton Jaune", `Carton Jaune pour ${penalizedTeam}.`, ui.ButtonSet.OK);
}

/**
* Demande les détails d'un carton rouge et l'enregistre.
*/
function recordCartonRougePrompt() {
const ui = SpreadsheetApp.getUi();
const scriptProperties = PropertiesService.getScriptProperties();

if (!isScoreAllowedForPhase()) {
return;
}

const matchTimeState = getMatchTimeState();
const timeOfEvent = matchTimeState.tempsDeJeuMs;

const localTeamName = getLocalTeamName();
const visitorTeamName = getVisitorTeamName();

const teamChoice = ui.prompt(
'Carton Rouge - Équipe',
`Quelle équipe a reçu un carton rouge ?\n1. ${localTeamName}\n2. ${visitorTeamName}`,
ui.ButtonSet.OK_CANCEL
);

if (teamChoice.getSelectedButton() !== ui.Button.OK) {
ui.alert("Annulé", "L'ajout du carton rouge a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

let penalizedTeam;
if (teamChoice.getResponseText().trim() === '1') {
penalizedTeam = localTeamName;
} else if (teamChoice.getResponseText().trim() === '2') {
penalizedTeam = visitorTeamName;
} else {
ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// NOUVEAU : Utiliser la nouvelle gestion des joueurs
const playerInfo = promptForPlayerSanction('Carton Rouge', penalizedTeam);
if (playerInfo.cancelled) {
ui.alert("Annulé", "L'ajout du carton rouge a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// Demander une remarque optionnelle
const remarkResponse = ui.prompt(
'Carton Rouge - Remarque',
`Remarque optionnelle (ex: "faute grave", "anti-jeu") :`,
ui.ButtonSet.OK_CANCEL
);

if (remarkResponse.getSelectedButton() !== ui.Button.OK) {
ui.alert("Annulé", "L'ajout du carton rouge a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

const remarque = remarkResponse.getResponseText().trim();
const finalRemark = remarque ? 
`Carton Rouge pour ${penalizedTeam}${playerInfo.playerName ? ' (' + playerInfo.playerName + ')' : ''}: ${remarque}` :
`Carton Rouge pour ${penalizedTeam}${playerInfo.playerName ? ' (' + playerInfo.playerName + ')' : ''}`;

const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

recordEvent(
new Date(),
formatMillisecondsToHMS(timeOfEvent),
penalizedTeam,
'Carton Rouge',
playerInfo.playerName,
currentScoreLocal,
currentScoreVisiteur,
finalRemark
);

scriptProperties.setProperty('alertMessage', '');
ouvrirTableauDeBord();
ui.alert("Carton Rouge", `Carton Rouge pour ${penalizedTeam}.`, ui.ButtonSet.OK);
}

/**
* Enregistre un carton Bleu pour un joueur d'une équipe.
* Déclenche les prompts pour l'équipe et le joueur.
*/
function recordCartonBleuPrompt() {
const ui = SpreadsheetApp.getUi();
const scriptProperties = PropertiesService.getScriptProperties();

if (!isScoreAllowedForPhase()) {
return;
}

const matchTimeState = getMatchTimeState();
const timeOfEvent = matchTimeState.tempsDeJeuMs;

const localTeamName = getLocalTeamName();
const visitorTeamName = getVisitorTeamName();

const teamChoice = ui.prompt(
'Carton Bleu - Équipe',
`Quelle équipe a reçu un carton bleu ?\n1. ${localTeamName}\n2. ${visitorTeamName}`,
ui.ButtonSet.OK_CANCEL
);

if (teamChoice.getSelectedButton() !== ui.Button.OK) {
ui.alert("Annulé", "L'ajout du carton bleu a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

let penalizedTeam;
if (teamChoice.getResponseText().trim() === '1') {
penalizedTeam = localTeamName;
} else if (teamChoice.getResponseText().trim() === '2') {
penalizedTeam = visitorTeamName;
} else {
ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// NOUVEAU : Utiliser la nouvelle gestion des joueurs
const playerInfo = promptForPlayerSanction('Carton Bleu', penalizedTeam);
if (playerInfo.cancelled) {
ui.alert("Annulé", "L'ajout du carton bleu a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// Demander une remarque optionnelle
const remarkResponse = ui.prompt(
'Carton Bleu - Remarque',
`Remarque optionnelle (ex: "faute grave", "anti-jeu") :`,
ui.ButtonSet.OK_CANCEL
);

if (remarkResponse.getSelectedButton() !== ui.Button.OK) {
ui.alert("Annulé", "L'ajout du carton bleu a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

const remarque = remarkResponse.getResponseText().trim();
const finalRemark = remarque ? 
`Carton Bleu pour ${penalizedTeam}${playerInfo.playerName ? ' (' + playerInfo.playerName + ')' : ''}: ${remarque}` :
`Carton Bleu pour ${penalizedTeam}${playerInfo.playerName ? ' (' + playerInfo.playerName + ')' : ''}`;

const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

recordEvent(
new Date(),
formatMillisecondsToHMS(timeOfEvent),
penalizedTeam,
'Carton Bleu',
playerInfo.playerName,
currentScoreLocal,
currentScoreVisiteur,
finalRemark
);
scriptProperties.setProperty('alertMessage', '');
ouvrirTableauDeBord();
ui.alert("Carton Bleu", `Carton Bleu pour ${penalizedTeam}.`, ui.ButtonSet.OK);
}

/**
* Demande à l'utilisateur de choisir l'équipe (Locale ou Visiteur).
* Affiche les noms réels des équipes et retourne le nom réel choisi.
* @returns {string|null} Le nom réel de l'équipe ('XV du Poireau', 'Stade Toulousain') ou null si annulé.
*/
function promptForTeam() {
const ui = SpreadsheetApp.getUi();
const localTeamName = getLocalTeamName(); // Récupère le nom réel de l'équipe Locale
const visitorTeamName = getVisitorTeamName(); // Récupère le nom réel de l'équipe Visiteur

let selectedTeam = null;
let isValidInput = false;

while (!isValidInput) {
const response = ui.prompt(
'Équipe concernée',
`Quelle équipe est concernée ?\n\n1. ${localTeamName}\n2. ${visitorTeamName}`,
ui.ButtonSet.OK_CANCEL
);

if (response.getSelectedButton() === ui.Button.OK) {
const userInput = response.getResponseText().trim();
if (userInput === '1' || userInput.toLowerCase() === localTeamName.toLowerCase()) {
selectedTeam = localTeamName;
isValidInput = true;
} else if (userInput === '2' || userInput.toLowerCase() === visitorTeamName.toLowerCase()) {
selectedTeam = visitorTeamName;
isValidInput = true;
} else {
ui.alert("Entrée invalide", "Veuillez entrer 1 ou 2, ou le nom de l'équipe.");
// Reste dans la boucle pour redemander
}
} else {
// L'utilisateur a annulé
selectedTeam = null;
isValidInput = true; // Quitter la boucle
}
}
return selectedTeam;
}

/**
* Demande le nom du joueur (optionnel).
* @returns {string} Le nom du joueur ou une chaîne vide si non renseigné/annulé.
*/
function promptForPlayer() {
const ui = SpreadsheetApp.getUi();
const playerResult = ui.prompt(
'Nom du Joueur (Optionnel)',
'Nom ou numéro du joueur (laisser vide si inconnu) :',
ui.ButtonSet.OK_CANCEL
);
if (playerResult.getSelectedButton() === ui.Button.OK) {
return playerResult.getResponseText().trim();
}
return ''; // Annulé ou vide
}

/**
* Demande une remarque optionnelle.
* @returns {string} La remarque ou une chaîne vide si non renseignée/annulée.
*/
function promptForRemark() {
const ui = SpreadsheetApp.getUi();
const remarkResult = ui.prompt(
'Remarque (Optionnelle)',
'Ajouter une remarque (laisser vide si aucune) :',
ui.ButtonSet.OK_CANCEL
);

if (remarkResult.getSelectedButton() === ui.Button.OK) {
return remarkResult.getResponseText().trim();
}
return ''; // Annulé ou vide
}

/**
* Fonction générique pour demander et enregistrer un événement personnalisé.
* Peut être appelée depuis un menu si l'utilisateur veut ajouter un événement non prédéfini.
*/
function promptAndRecordCustomEvent() {
const ui = SpreadsheetApp.getUi();
const scriptProperties = PropertiesService.getScriptProperties();

if (!isGameActive()) {
ui.alert("Action impossible", "Veuillez démarrer le match ou reprendre le jeu pour enregistrer un événement.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// Demander à l'utilisateur de saisir le type d'événement
const eventTypeResult = ui.prompt(
'Type d\'événement',
'Veuillez entrer le type d\'événement (ex: Mêlée, Touche, etc.) :',
ui.ButtonSet.OK_CANCEL
);

// Si l'utilisateur annule, quitter la fonction
if (eventTypeResult.getSelectedButton() !== ui.Button.OK) {
ui.alert("Annulé", "L'enregistrement de l'événement a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

const customEventType = eventTypeResult.getResponseText().trim();
if (!customEventType) {
ui.alert("Erreur", "Le type d'événement ne peut pas être vide.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// Demander à l'utilisateur de choisir l'équipe
const team = promptForTeam();

// Si l'utilisateur annule le choix de l'équipe, quitter la fonction
if (team === null) {
ui.alert("Annulé", "L'enregistrement de l'événement a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// NOUVEAU : Utiliser la nouvelle gestion des joueurs pour l'événement personnalisé
const playerInfo = promptForPlayerSanction(customEventType, team);
if (playerInfo.cancelled) {
ui.alert("Annulé", "L'enregistrement de l'événement a été annulé.", ui.ButtonSet.OK);
ouvrirTableauDeBord();
return;
}

// Demander à l'utilisateur de saisir une remarque
const remark = promptForRemark();

// Récupérer les scores actuels et le temps de jeu
const currentLocalScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
const currentVisitorScore = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
const matchTimeState = getMatchTimeState();

// Enregistrer l'événement
recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, team, customEventType, playerInfo.playerName, currentLocalScore, currentVisitorScore, remark);

// Afficher une confirmation
let message = `${team}`;
if (playerInfo.playerName) {
message += ` (${playerInfo.playerName})`;
}
message += `: ${customEventType}.`;

if (remark) {
message += ` Remarque: ${remark}`;
}

Logger.log(message);
ui.alert("Événement enregistré", message, ui.ButtonSet.OK);
ouvrirTableauDeBord();
}

/**
* Vérifie si le jeu est dans une phase active pour permettre des actions de score/sanction.
* @returns {boolean} True si le jeu est actif (1ère ou 2ème mi-temps), false sinon.
*/
function isGameActive() {
const scriptProperties = PropertiesService.getScriptProperties();
const currentPhase = scriptProperties.getProperty('currentMatchPhase');
return currentPhase === 'premiere_mi_temps' || currentPhase === 'deuxieme_mi_temps';
}