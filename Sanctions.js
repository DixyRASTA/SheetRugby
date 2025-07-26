/**
 * @file Gère la logique des sanctions (cartons) et des événements génériques.
 */

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
    ouvrirTableauDeBord(); // Rafraîchir la sidebar
    return;
  }

  let penalizedTeam;
  if (teamChoice.getResponseText().trim() === '1') {
    penalizedTeam = localTeamName;
  } else if (teamChoice.getResponseText().trim() === '2') {
    penalizedTeam = visitorTeamName;
  } else {
    ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
    ouvrirTableauDeBord(); // Rafraîchir la sidebar
    return;
  }

  const playerResponse = ui.prompt(
    'Carton Blanc - Joueur et Remarque',
    `Nom du joueur de ${penalizedTeam} (optionnel) et/ou remarque (ex: "faute technique") :`,
    ui.ButtonSet.OK_CANCEL
  );

  if (playerResponse.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Annulé", "L'ajout du carton Blanc a été annulé.", ui.ButtonSet.OK);
    ouvrirTableauDeBord(); // Rafraîchir la sidebar
    return;
  }

  const userInput = playerResponse.getResponseText().trim();
  let joueur = '';
  let remarque = '';

  if (userInput.includes(',')) {
    const parts = userInput.split(',', 2);
    joueur = parts[0].trim();
    remarque = parts[1].trim();
  } else {
    remarque = userInput;
  }

  // Si la remarque est vide après traitement, définir une remarque par défaut
  if (!remarque) {
    remarque = `Carton Blanc pour ${penalizedTeam}${joueur ? ' (' + joueur + ')' : ''}`;
  } else {
    remarque = `Carton Blanc pour ${penalizedTeam}${joueur ? ' (' + joueur + ')' : ''}: ${remarque}`;
  }

  if (!joueur && userInput && !userInput.includes(',')) {
    joueur = userInput;
  }

  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  recordEvent(
    new Date(),
    formatMillisecondsToHMS(timeOfEvent),
    penalizedTeam,
    'Carton Blanc',
    joueur,
    currentScoreLocal,
    currentScoreVisiteur,
    remarque // Utilise la remarque (par défaut ou saisie)
  );
  scriptProperties.setProperty('alertMessage', '');
  ouvrirTableauDeBord(); // Rafraîchir la sidebar
  ui.alert("Carton Blanc", `Carton Blanc enregistré pour ${penalizedTeam}.`, ui.ButtonSet.OK);
}


function recordCartonJaunePrompt() {
  const ui = SpreadsheetApp.getUi();
  const scriptProperties = PropertiesService.getScriptProperties();

  if (!isScoreAllowedForPhase()) { // Utilise la même vérification que pour les scores
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
    ouvrirTableauDeBord(); // Rafraîchir la sidebar
    return;
  }

  let penalizedTeam;
  if (teamChoice.getResponseText().trim() === '1') {
    penalizedTeam = localTeamName;
  } else if (teamChoice.getResponseText().trim() === '2') {
    penalizedTeam = visitorTeamName;
  } else {
    ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
    ouvrirTableauDeBord(); // Rafraîchir la sidebar
    return;
  }

  const playerResponse = ui.prompt(
    'Carton Jaune - Joueur et Remarque',
    `Nom du joueur de ${penalizedTeam} (optionnel) et/ou remarque (ex: "faute technique", "plaquage haut") :`,
    ui.ButtonSet.OK_CANCEL
  );

  if (playerResponse.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Annulé", "L'ajout du carton jaune a été annulé.", ui.ButtonSet.OK);
    ouvrirTableauDeBord(); // Rafraîchir la sidebar
    return;
  }

  const userInput = playerResponse.getResponseText().trim();
  let joueur = '';
  let remarque = '';

  // Tente de séparer le nom du joueur et la remarque si une virgule est présente
  if (userInput.includes(',')) {
    const parts = userInput.split(',', 2); // Sépare en max 2 parties
    joueur = parts[0].trim();
    remarque = parts[1].trim();
  } else {
    // Si pas de virgule, tout est considéré comme remarque, joueur est vide
    remarque = userInput;
  }

  // Si la remarque est vide après traitement, définir une remarque par défaut
  if (!remarque) {
    remarque = `Carton Jaune pour ${penalizedTeam}${joueur ? ' (' + joueur + ')' : ''}`;
  } else {
    // Si une remarque a été saisie, on peut la préfixer pour être plus explicite
    remarque = `Carton Jaune pour ${penalizedTeam}${joueur ? ' (' + joueur + ')' : ''}: ${remarque}`;
  }
  
  // Assurez-vous que le joueur est bien défini pour recordEvent
  if (!joueur && userInput && !userInput.includes(',')) {
    // Si l'utilisateur a juste tapé un nom sans virgule, on peut l'assigner au joueur
    // et laisser la remarque par défaut générée ci-dessus.
    joueur = userInput;
  }
  
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  recordEvent(
    new Date(),
    formatMillisecondsToHMS(timeOfEvent),
    penalizedTeam,
    'Carton Jaune',
    joueur,
    currentScoreLocal,
    currentScoreVisiteur,
    remarque // Utilise la remarque (par défaut ou saisie)
  );

  scriptProperties.setProperty('alertMessage', '');
  ouvrirTableauDeBord(); // Rafraîchir la sidebar
  ui.alert("Carton Jaune", `Carton Jaune enregistré pour ${penalizedTeam}.`, ui.ButtonSet.OK);
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
    ouvrirTableauDeBord(); // Rafraîchir la sidebar
    return;
  }

  let penalizedTeam;
  if (teamChoice.getResponseText().trim() === '1') {
    penalizedTeam = localTeamName;
  } else if (teamChoice.getResponseText().trim() === '2') {
    penalizedTeam = visitorTeamName;
  } else {
    ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
    ouvrirTableauDeBord(); // Rafraîchir la sidebar
    return;
  }

  const playerResponse = ui.prompt(
    'Carton Rouge - Joueur et Remarque',
    `Nom du joueur de ${penalizedTeam} (optionnel) et/ou remarque (ex: "faute grave", "anti-jeu") :`,
    ui.ButtonSet.OK_CANCEL
  );

  if (playerResponse.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Annulé", "L'ajout du carton rouge a été annulé.", ui.ButtonSet.OK);
    ouvrirTableauDeBord(); // Rafraîchir la sidebar
    return;
  }

  const userInput = playerResponse.getResponseText().trim();
  let joueur = '';
  let remarque = '';

  if (userInput.includes(',')) {
    const parts = userInput.split(',', 2);
    joueur = parts[0].trim();
    remarque = parts[1].trim();
  } else {
    remarque = userInput;
  }

  // Si la remarque est vide après traitement, définir une remarque par défaut
  if (!remarque) {
    remarque = `Carton Rouge pour ${penalizedTeam}${joueur ? ' (' + joueur + ')' : ''}`;
  } else {
    remarque = `Carton Rouge pour ${penalizedTeam}${joueur ? ' (' + joueur + ')' : ''}: ${remarque}`;
  }

  if (!joueur && userInput && !userInput.includes(',')) {
    joueur = userInput;
  }

  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  recordEvent(
    new Date(),
    formatMillisecondsToHMS(timeOfEvent),
    penalizedTeam,
    'Carton Rouge',
    joueur,
    currentScoreLocal,
    currentScoreVisiteur,
    remarque // Utilise la remarque (par défaut ou saisie)
  );

  scriptProperties.setProperty('alertMessage', '');
  ouvrirTableauDeBord(); // Rafraîchir la sidebar
  ui.alert("Carton Rouge", `Carton Rouge enregistré pour ${penalizedTeam}.`, ui.ButtonSet.OK);
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
    'Carton Beu - Équipe',
    `Quelle équipe a reçu un carton bleu ?\n1. ${localTeamName}\n2. ${visitorTeamName}`,
    ui.ButtonSet.OK_CANCEL
  );

  if (teamChoice.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Annulé", "L'ajout du carton bleu a été annulé.", ui.ButtonSet.OK);
    ouvrirTableauDeBord(); // Rafraîchir la sidebar
    return;
  }

  let penalizedTeam;
  if (teamChoice.getResponseText().trim() === '1') {
    penalizedTeam = localTeamName;
  } else if (teamChoice.getResponseText().trim() === '2') {
    penalizedTeam = visitorTeamName;
  } else {
    ui.alert("Entrée invalide", "Veuillez entrer '1' ou '2'.", ui.ButtonSet.OK);
    ouvrirTableauDeBord(); // Rafraîchir la sidebar
    return;
  }

  const playerResponse = ui.prompt(
    'Carton Bleu - Joueur et Remarque',
    `Nom du joueur de ${penalizedTeam} (optionnel) et/ou remarque (ex: "faute grave", "anti-jeu") :`,
    ui.ButtonSet.OK_CANCEL
  );

  if (playerResponse.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Annulé", "L'ajout du carton Bleu a été annulé.", ui.ButtonSet.OK);
    ouvrirTableauDeBord(); // Rafraîchir la sidebar
    return;
  }

  const userInput = playerResponse.getResponseText().trim();
  let joueur = '';
  let remarque = '';

  if (userInput.includes(',')) {
    const parts = userInput.split(',', 2);
    joueur = parts[0].trim();
    remarque = parts[1].trim();
  } else {
    remarque = userInput;
  }

  // Si la remarque est vide après traitement, définir une remarque par défaut
  if (!remarque) {
    remarque = `Carton Bleu pour ${penalizedTeam}${joueur ? ' (' + joueur + ')' : ''}`;
  } else {
    remarque = `Carton Bleu pour ${penalizedTeam}${joueur ? ' (' + joueur + ')' : ''}: ${remarque}`;
  }

  if (!joueur && userInput && !userInput.includes(',')) {
    joueur = userInput;
  }

  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  recordEvent(
    new Date(),
    formatMillisecondsToHMS(timeOfEvent),
    penalizedTeam,
    'Carton Bleu',
    joueur,
    currentScoreLocal,
    currentScoreVisiteur,
    remarque // Utilise la remarque (par défaut ou saisie)
  );
  scriptProperties.setProperty('alertMessage', '');
  ouvrirTableauDeBord(); // Rafraîchir la sidebar
  ui.alert("Carton Bleu", `Carton Bleu enregistré pour ${penalizedTeam}.`, ui.ButtonSet.OK);
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
    // Rafraîchir la sidebar après l'alerte
    // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
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
    // Rafraîchir la sidebar si l'utilisateur annule
    // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
    ouvrirTableauDeBord();
    return;
  }

  const customEventType = eventTypeResult.getResponseText().trim();
  if (!customEventType) {
      ui.alert("Erreur", "Le type d'événement ne peut pas être vide.", ui.ButtonSet.OK);
      // Rafraîchir la sidebar si l'entrée est invalide
      // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
      ouvrirTableauDeBord();
      return;
  }

  // Demander à l'utilisateur de choisir l'équipe
  const team = promptForTeam();

  // Si l'utilisateur annule le choix de l'équipe, quitter la fonction
  if (team === null) {
    ui.alert("Annulé", "L'enregistrement de l'événement a été annulé.", ui.ButtonSet.OK);
    // Rafraîchir la sidebar si l'utilisateur annule
    // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
    ouvrirTableauDeBord();
    return;
  }

  // Demander à l'utilisateur de saisir le nom du joueur
  const player = promptForPlayer();

  // Demander à l'utilisateur de saisir une remarque
  const remark = promptForRemark();

  // Récupérer les scores actuels et le temps de jeu
  const currentLocalScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentVisitorScore = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  const matchTimeState = getMatchTimeState();

  // Enregistrer l'événement
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, team, customEventType, player, currentLocalScore, currentVisitorScore, remark);

  // Afficher une confirmation
  let message = `${team}`;
  if (player) {
    message += ` (${player})`;
  }
  message += `: ${customEventType}.`;

  if (remark) {
    message += ` Remarque: ${remark}`;
  }

  Logger.log(message);
  ui.alert("Événement enregistré", message, ui.ButtonSet.OK);
  // CORRECTION : Remplacer updateSidebar() par l'appel direct au rafraîchissement de la sidebar
  // SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput('<script>if(window.refreshSidebar) { window.refreshSidebar(); }</script>'));
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