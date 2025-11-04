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
 * Ouvre le dialogue HTML pour enregistrer un essai
 */
function addEssai() {
  if (!isScoreAllowedForPhase()) {
    return;
  }
  
  // Créer le template HTML
  const template = HtmlService.createTemplateFromFile('EssaiDialog');
  
  // Passer les noms d'équipes au template
  template.localTeamName = getLocalTeamName();
  template.visitorTeamName = getVisitorTeamName();
  
  // Évaluer et afficher le dialogue
  const html = template.evaluate()
    .setWidth(450)
    .setHeight(550);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Enregistrer un Essai');
}

/**
 * Fonction appelée par le dialogue HTML pour récupérer le nom d'un joueur
 * @param {string} playerNumber Le numéro du joueur
 * @param {string} teamChoice "1" pour local, "2" pour visiteur
 * @returns {string} Le nom du joueur ou chaîne vide
 */
function getPlayerNameForDialog(playerNumber, teamChoice) {
  if (!playerNumber || playerNumber === '') {
    return '';
  }
  
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();
  const teamName = teamChoice === '1' ? localTeamName : visitorTeamName;
  
  return getPlayerNameByNumber(playerNumber, teamName);
}

/**
 * Traite les données du formulaire d'essai
 * @param {Object} data Les données du formulaire
 */
function processEssaiFromDialog(data) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  
  // Récupérer le temps de l'essai
  const matchTimeStateAtEssai = getMatchTimeState();
  const timeOfEssaiMs = matchTimeStateAtEssai.tempsDeJeuMs;
  
  // Déterminer l'équipe
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();
  const scoringTeam = data.equipe === '1' ? localTeamName : visitorTeamName;
  
  // Récupérer les noms des joueurs
  let joueurEssaiName = '';
  if (data.joueurEssai && data.joueurEssai !== '') {
    joueurEssaiName = getPlayerNameByNumber(data.joueurEssai, scoringTeam);
    if (!joueurEssaiName) {
      joueurEssaiName = `Joueur N°${data.joueurEssai}`;
    }
  }
  
  let joueurTransfoName = '';
  if (data.joueurTransfo && data.joueurTransfo !== '') {
    joueurTransfoName = getPlayerNameByNumber(data.joueurTransfo, scoringTeam);
    if (!joueurTransfoName) {
      joueurTransfoName = `Joueur N°${data.joueurTransfo}`;
    }
  }
  
  // Mettre à jour le score de l'essai
  const currentScoreKey = scoringTeam === localTeamName ? 'currentScoreLocal' : 'currentScoreVisiteur';
  let currentScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
  currentScore += ESSAI_POINTS;
  scriptProperties.setProperty(currentScoreKey, currentScore.toString());
  
  // Enregistrer l'essai
  recordEvent(
    new Date(),
    formatMillisecondsToHMS(timeOfEssaiMs),
    scoringTeam,
    'Essai',
    joueurEssaiName,
    parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
    parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
    joueurEssaiName ? `Essai marqué par ${joueurEssaiName} pour ${scoringTeam}` : `Essai marqué pour ${scoringTeam}`
  );
  
  // Traiter la transformation
  if (data.transformation === 'reussie') {
    let conversionScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
    conversionScore += TRANSFO_POINTS;
    scriptProperties.setProperty(currentScoreKey, conversionScore.toString());
    
    recordEvent(
      new Date(),
      formatMillisecondsToHMS(timeOfEssaiMs), // Même temps que l'essai
      scoringTeam,
      'Transformation réussie',
      joueurTransfoName,
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      //`Transformation réussie par ${joueurTransfoName || 'joueur non spécifié'} pour ${scoringTeam}`
      joueurTransfoName ? `Transformation réussie par ${joueurTransfoName} pour ${scoringTeam}` : `Transformation réussie pour ${scoringTeam}`
    );
  } else {
    recordEvent(
      new Date(),
      formatMillisecondsToHMS(timeOfEssaiMs), // Même temps que l'essai
      scoringTeam,
      'Transformation ratée',
      joueurTransfoName,
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      //`Transformation ratée par ${joueurTransfoName || 'joueur non spécifié'} pour ${scoringTeam}`
      joueurTransfoName ? `Transformation ratée par ${joueurTransfoName} pour ${scoringTeam}` : `Transformation ratée pour ${scoringTeam}`
    );
  }
  
  scriptProperties.setProperty('alertMessage', '');
  ouvrirTableauDeBord();
  
  // Message de confirmation
  ui.alert("Essai", `Essai enregistré pour ${scoringTeam}\nTransformation: ${data.transformation === 'reussie' ? 'Réussie ✅' : 'Ratée ❌'}`, ui.ButtonSet.OK);
}


// --- FONCTION POUR GÉRER LES PÉNALITÉS ---
/**
 * Ouvre le dialogue HTML pour enregistrer une pénalité
 */
function addPenalite() {
  if (!isScoreAllowedForPhase()) {
    return;
  }
  
  // Créer le template HTML
  const template = HtmlService.createTemplateFromFile('PenaliteDialog');
  
  // Passer les noms d'équipes au template
  template.localTeamName = getLocalTeamName();
  template.visitorTeamName = getVisitorTeamName();
  
  // Évaluer et afficher le dialogue
  const html = template.evaluate()
    .setWidth(450)
    .setHeight(450);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Tentative de Pénalité');
}

/**
 * Traite les données du formulaire de pénalité
 * @param {Object} data Les données du formulaire
 */
function processPenaliteFromDialog(data) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  
  // Récupérer le temps de la pénalité
  const currentRunningTimeState = getMatchTimeState();
  const timeOfPenalty = currentRunningTimeState.tempsDeJeuMs;
  
  // Déterminer l'équipe
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();
  const penalizedTeam = data.equipe === '1' ? localTeamName : visitorTeamName;
  
  // Récupérer le nom du buteur
  let joueurButeurName = '';
  if (data.joueurButeur && data.joueurButeur !== '') {
    joueurButeurName = getPlayerNameByNumber(data.joueurButeur, penalizedTeam);
    if (!joueurButeurName) {
      joueurButeurName = `Joueur N°${data.joueurButeur}`;
    }
  }
  
  // Mettre à jour le score et enregistrer
  const currentScoreKey = penalizedTeam === localTeamName ? 'currentScoreLocal' : 'currentScoreVisiteur';
  let currentScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
  
  if (data.resultat === 'reussie') {
    currentScore += PENALITE_POINTS; // Ajouter 3 points pour la pénalité réussie
    scriptProperties.setProperty(currentScoreKey, currentScore.toString());
    
    // Enregistrer la pénalité réussie
    recordEvent(
      new Date(),
      formatMillisecondsToHMS(timeOfPenalty),
      penalizedTeam,
      'Pénalité réussie',
      joueurButeurName,
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      joueurButeurName ? `Pénalité réussie par ${joueurButeurName} pour ${penalizedTeam}` : `Pénalité réussie pour ${penalizedTeam}`
    );
  } else {
    // Enregistrer la pénalité ratée
    recordEvent(
      new Date(),
      formatMillisecondsToHMS(timeOfPenalty),
      penalizedTeam,
      'Pénalité ratée',
      joueurButeurName,
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      joueurButeurName ? `Pénalité ratée par ${joueurButeurName} pour ${penalizedTeam}` : `Pénalité ratée pour ${penalizedTeam}`
    );
  }
  
  ouvrirTableauDeBord();
  
  // Message de confirmation
  ui.alert("Pénalité", `Pénalité ${data.resultat === 'reussie' ? 'réussie ✅' : 'ratée ❌'} par ${joueurButeurName || 'joueur non spécifié'} pour ${penalizedTeam}`, ui.ButtonSet.OK);
}


// --- FONCTION POUR GÉRER LES DROPS ---

/**
 * Ouvre le dialogue HTML pour enregistrer un drop
 */
function addDrop() {
  if (!isScoreAllowedForPhase()) {
    return;
  }
  
  // Créer le template HTML
  const template = HtmlService.createTemplateFromFile('DropDialog');
  
  // Passer les noms d'équipes au template
  template.localTeamName = getLocalTeamName();
  template.visitorTeamName = getVisitorTeamName();
  
  // Évaluer et afficher le dialogue
  const html = template.evaluate()
    .setWidth(450)
    .setHeight(450);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Tentative de Drop');
}

/**
 * Traite les données du formulaire de drop
 * @param {Object} data Les données du formulaire
 */
function processDropFromDialog(data) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  
  // Récupérer le temps du drop
  const currentRunningTimeState = getMatchTimeState();
  const timeOfDrop = currentRunningTimeState.tempsDeJeuMs;
  
  // Déterminer l'équipe
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();
  const dropTeam = data.equipe === '1' ? localTeamName : visitorTeamName;
  
  // Récupérer le nom du buteur
  let joueurButeurName = '';
  if (data.joueurButeur && data.joueurButeur !== '') {
    joueurButeurName = getPlayerNameByNumber(data.joueurButeur, dropTeam);
    if (!joueurButeurName) {
      joueurButeurName = `Joueur N°${data.joueurButeur}`;
    }
  }
  
  // Mettre à jour le score et enregistrer
  const currentScoreKey = dropTeam === localTeamName ? 'currentScoreLocal' : 'currentScoreVisiteur';
  let currentScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
  
  if (data.resultat === 'reussi') {
    currentScore += DROP_POINTS; // Ajouter 3 points pour le drop réussi
    scriptProperties.setProperty(currentScoreKey, currentScore.toString());
    
    // Enregistrer le drop réussi
    recordEvent(
      new Date(),
      formatMillisecondsToHMS(timeOfDrop),
      dropTeam,
      'Drop réussi',
      joueurButeurName,
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      joueurButeurName ? `Drop réussi par ${joueurButeurName} pour ${dropTeam}` : `Drop réussi pour ${dropTeam}`
    );
  } else {
    // Enregistrer le drop raté
    recordEvent(
      new Date(),
      formatMillisecondsToHMS(timeOfDrop),
      dropTeam,
      'Drop raté',
      joueurButeurName,
      parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
      parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
      joueurButeurName ? `Drop raté par ${joueurButeurName} pour ${dropTeam}` : `Drop raté pour ${dropTeam}`
    );
  }
  
  ouvrirTableauDeBord();
  
  // Message de confirmation
  ui.alert("Drop", `Drop ${data.resultat === 'reussi' ? 'réussi ✅' : 'raté ❌'} par ${joueurButeurName || 'joueur non spécifié'} pour ${dropTeam}`, ui.ButtonSet.OK);
}


/**
* Gère un essai de penalité.
*/
/**
 * Ouvre le dialogue HTML pour enregistrer un essai de pénalité
 * REMPLACE la fonction addEssaiPenalite() existante
 */
function addEssaiPenalite() {
  if (!isScoreAllowedForPhase()) {
    return;
  }
  
  // Créer le template HTML
  const template = HtmlService.createTemplateFromFile('EssaiPenaliteDialog');
  
  // Passer les noms d'équipes au template
  template.localTeamName = getLocalTeamName();
  template.visitorTeamName = getVisitorTeamName();
  
  // Évaluer et afficher le dialogue
  const html = template.evaluate()
    .setWidth(450)
    .setHeight(400);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Essai de Pénalité');
}

/**
 * Traite les données du formulaire d'essai de pénalité
 * @param {Object} data Les données du formulaire
 */
function processEssaiPenaliteFromDialog(data) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  
  // Récupérer le temps de l'essai de pénalité
  const matchTimeStateAtEssai = getMatchTimeState();
  const timeOfEssaiMs = matchTimeStateAtEssai.tempsDeJeuMs;
  
  // Déterminer l'équipe
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();
  const scoringTeam = data.equipe === '1' ? localTeamName : visitorTeamName;
  
  // Mettre à jour le score de l'essai de pénalité
  const currentScoreKey = scoringTeam === localTeamName ? 'currentScoreLocal' : 'currentScoreVisiteur';
  let currentScore = parseInt(scriptProperties.getProperty(currentScoreKey) || '0', 10);
  currentScore += ESSAI_PENALITE_POINTS; // Ajouter 7 points
  scriptProperties.setProperty(currentScoreKey, currentScore.toString());
  
  // Enregistrer l'essai de pénalité (pas de joueur spécifique)
  recordEvent(
    new Date(),
    formatMillisecondsToHMS(timeOfEssaiMs),
    scoringTeam,
    'Essai de pénalité',
    '', // Pas de joueur spécifique
    parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10),
    parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10),
    `Essai de pénalité pour ${scoringTeam}`
  );
  
  scriptProperties.setProperty('alertMessage', '');
  ouvrirTableauDeBord();
  
  // Message de confirmation
  ui.alert("Essai de pénalité", `Essai de pénalité accordé à ${scoringTeam}\n+7 points 🚨`, ui.ButtonSet.OK);
}