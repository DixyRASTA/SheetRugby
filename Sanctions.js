/**
 * @file Gère la logique des sanctions (cartons) et des pénalités sifflées.
 */

/**
 * Enregistre un carton Jaune pour un joueur d'une équipe.
 * Déclenche les prompts pour l'équipe et le joueur.
 */
function recordCartonJaunePrompt() {
  const team = promptForTeam(); // Utilise une fonction utilitaire pour demander l'équipe
  if (!team) return; // Si l'utilisateur annule

  const player = promptForPlayer(); // Utilise une fonction utilitaire pour demander le joueur (optionnel)

  recordSanctionEvent(team, 'Carton Jaune', player);
}

/**
 * Enregistre un carton Rouge pour un joueur d'une équipe.
 * Déclenche les prompts pour l'équipe et le joueur.
 */
function recordCartonRougePrompt() {
  const team = promptForTeam(); // Utilise une fonction utilitaire pour demander l'équipe
  if (!team) return; // Si l'utilisateur annule

  const player = promptForPlayer(); // Utilise une fonction utilitaire pour demander le joueur (optionnel)

  recordSanctionEvent(team, 'Carton Rouge', player);
}

/**
 * Enregistre un carton Bleu pour un joueur d'une équipe.
 * Déclenche les prompts pour l'équipe et le joueur.
 */
function recordCartonBleuPrompt() {
  const team = promptForTeam(); // Utilise une fonction utilitaire pour demander l'équipe
  if (!team) return; // Si l'utilisateur annule

  const player = promptForPlayer(); // Utilise une fonction utilitaire pour demander le joueur (optionnel)

  recordSanctionEvent(team, 'Carton Bleu', player);
}


/**
 * Demande à l'utilisateur de choisir l'équipe (Locale ou Visiteur).
 * Affiche les noms réels des équipes.
 * @returns {string|null} 'Locale', 'Visiteur' (les chaînes génériques pour la logique interne) ou null si annulé.
 */
function promptForTeam() {
  const ui = SpreadsheetApp.getUi();
  const localTeam = getLocalTeamName(); // Récupère le nom réel de l'équipe Locale
  const visitorTeam = getVisitorTeamName(); // Récupère le nom réel de l'équipe Visiteur

  const teamChoice = ui.alert(
      'Équipe concernée',
      `Quelle équipe est concernée ?\n\nOui = ${localTeam}\nNon = ${visitorTeam}`, // <-- MODIFIÉ ICI
      ui.ButtonSet.YES_NO_CANCEL
  );

 if (teamChoice === ui.Button.YES) {
    return 'Locale'; // Retourne 'Locale' pour la logique interne
  } else if (teamChoice === ui.Button.NO) {
    return 'Visiteur'; // Retourne 'Visiteur' pour la logique interne
  } else {
    return null; // Annulé
  }
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

// Fonction générique pour enregistrer un événement hors nomenclature
function recordSanctionEvent() {
  const ui = SpreadsheetApp.getUi();
  const scriptProperties = PropertiesService.getScriptProperties();

  // Demander à l'utilisateur de saisir le type d'événement
  const eventTypeResult = ui.prompt(
    'Type d\'événement',
    'Veuillez entrer le type d\'événement (laisser vide si inconnu) :',
    ui.ButtonSet.OK_CANCEL
  );

  // Si l'utilisateur annule, quitter la fonction
  if (eventTypeResult.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Annulé", "L'enregistrement de l'événement a été annulé.", ui.ButtonSet.OK);
    return;
  }

  const sanctionType = eventTypeResult.getResponseText().trim();

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
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, team, sanctionType, player, currentLocalScore, currentVisitorScore, remark);

  // Afficher une confirmation
  let message = `${team}`;
  if (player) {
    message += ` (${player})`;
  }
  message += ` reçoit un ${sanctionType}.`;

  if (remark) {
    message += ` Remarque: ${remark}`;
  }

  Logger.log(message);
  ui.alert("Événement enregistré", message, ui.ButtonSet.OK);

  // Mettre à jour la sidebar
  updateSidebar();
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
