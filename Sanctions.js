// --- CONSTANTES DE POINTS --- // (Ces constantes pourraient être déplacées dans un fichier commun si elles sont utilisées ailleurs)
// const ESSAI_POINTS = 5; // Supprimé si déjà dans ScoreManager.gs
// const TRANSFO_POINTS = 2; // Supprimé si déjà dans ScoreManager.gs
// const PENALITE_POINTS = 3; // Supprimé si déjà dans ScoreManager.gs
// const DROP_POINTS = 3; // Supprimé si déjà dans ScoreManager.gs

/**
 * @file Gère la logique des sanctions (cartons) et des événements génériques.
 */

/**
 * Enregistre un carton Jaune pour un joueur d'une équipe.
 * Déclenche les prompts pour l'équipe et le joueur.
 */
function recordCartonJaunePrompt() {
  const ui = SpreadsheetApp.getUi();
  if (!isGameActive()) { // Utilise une fonction de sécurité pour vérifier la phase de jeu
    ui.alert("Action impossible", "Veuillez démarrer le match ou reprendre le jeu pour enregistrer un carton.", ui.ButtonSet.OK);
    return;
  }

  const team = promptForTeam(); // Demande l'équipe (retourne le nom réel de l'équipe ou null)
  if (!team) return; // Si l'utilisateur annule

  const player = promptForPlayer(); // Demande le joueur (optionnel)
  const remark = promptForRemark(); // Demande la remarque

  recordSanctionEvent(team, 'Carton Jaune', player, remark); // Ajout du paramètre remark 
}

/**
 * Enregistre un carton Rouge pour un joueur d'une équipe.
 * Déclenche les prompts pour l'équipe et le joueur.
 */
function recordCartonRougePrompt() {
  const ui = SpreadsheetApp.getUi();
  if (!isGameActive()) { // Utilise une fonction de sécurité pour vérifier la phase de jeu
    ui.alert("Action impossible", "Veuillez démarrer le match ou reprendre le jeu pour enregistrer un carton.", ui.ButtonSet.OK);
    return;
  }

  const team = promptForTeam(); // Demande l'équipe
  if (!team) return; // Si l'utilisateur annule

  const player = promptForPlayer(); // Demande le joueur (optionnel)
  const remark = promptForRemark(); // Demande la remarque

  recordSanctionEvent(team, 'Carton Rouge', player, remark); // Ajout du paramètre remark 
}

/**
 * Enregistre un carton Bleu pour un joueur d'une équipe.
 * Déclenche les prompts pour l'équipe et le joueur.
 */
function recordCartonBleuPrompt() {
  const ui = SpreadsheetApp.getUi();
  if (!isGameActive()) { // Utilise une fonction de sécurité pour vérifier la phase de jeu
    ui.alert("Action impossible", "Veuillez démarrer le match ou reprendre le jeu pour enregistrer un carton.", ui.ButtonSet.OK);
    return;
  }

  const team = promptForTeam(); // Demande l'équipe
  if (!team) return; // Si l'utilisateur annule

  const player = promptForPlayer(); // Demande le joueur (optionnel)
  const remark = promptForRemark(); // Demande la remarque

  recordSanctionEvent(team, 'Carton Bleu', player, remark); // Ajout du paramètre remark 
}

/**
 * Fonction interne pour enregistrer un événement de sanction (Carton Jaune/Rouge/Bleu).
 * Appelée par recordCarton...Prompt.
 * @param {string} teamName Le nom réel de l'équipe concernée.
 * @param {string} sanctionType Le type de sanction (ex: 'Carton Jaune').
 * @param {string} playerName Le nom du joueur concerné (vide si non applicable).
 * @param {string} remark Une remarque optionnelle.
 */
function recordSanctionEvent(teamName, sanctionType, playerName, remark) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();

  const currentLocalScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentVisitorScore = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  const matchTimeState = getMatchTimeState();

  recordEvent(
    new Date(),
    matchTimeState.tempsDeJeuFormatted,
    teamName,
    sanctionType,
    playerName,
    currentLocalScore,
    currentVisitorScore,
    remark // Passe la remarque
  );

  let message = `${teamName}`;
  if (playerName) {
    message += ` (${playerName})`;
  }
  message += ` reçoit un ${sanctionType}.`;

  if (remark) {
    message += ` Remarque: ${remark}`;
  }

  Logger.log(message);
  ui.alert("Sanction enregistrée", message, ui.ButtonSet.OK);
  updateSidebar();
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
    return;
  }

  const customEventType = eventTypeResult.getResponseText().trim();
  if (!customEventType) {
      ui.alert("Erreur", "Le type d'événement ne peut pas être vide.", ui.ButtonSet.OK);
      return;
  }

  // Demander à l'utilisateur de choisir l'équipe
  const team = promptForTeam();

  // Si l'utilisateur annule le choix de l'équipe, quitter la fonction
  if (team === null) {
    ui.alert("Annulé", "L'enregistrement de l'événement a été annulé.", ui.ButtonSet.OK);
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
  updateSidebar();
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