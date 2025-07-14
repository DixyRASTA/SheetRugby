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

// Fonction générique pour enregistrer un événement de sanction
function recordSanctionEvent(team, sanctionType, player = '') {
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentLocalScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentVisitorScore = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  const matchTimeState = getMatchTimeState(); // Récupère le temps de jeu actuel
  
  // Enregistre l'événement de sanction avec les scores actuels
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, team, sanctionType, player, currentLocalScore, currentVisitorScore, '');

  Logger.log(`${player} (${team}) reçoit un ${sanctionType}.`);
  SpreadsheetApp.getUi().alert("Sanction enregistrée", `${player} (${team}) reçoit un ${sanctionType}.`, SpreadsheetApp.getUi().ButtonSet.OK);

  updateSidebar(); // Met à jour la sidebar après l'événement
}


// --- Fonctions utilitaires pour les prompts (peuvent être déplacées dans Main.gs si on veut les réutiliser) ---
// Pour l'instant, on les met ici pour la clarté et l'isolement de Sanctions.gs

/**
 * Demande à l'utilisateur de choisir l'équipe (Locale ou Visiteur).
 * @returns {string|null} 'Locale', 'Visiteur' ou null si annulé.
 */
function promptForTeam() {
  const ui = SpreadsheetApp.getUi();
  const teamChoice = ui.alert(
      'Équipe concernée',
      'Quelle équipe est concernée ?\n\nOui = Locale\nNon = Visiteur',
      ui.ButtonSet.YES_NO_CANCEL // YES pour Locale, NO pour Visiteur
  );

  if (teamChoice === ui.Button.YES) {
    return 'Locale';
  } else if (teamChoice === ui.Button.NO) {
    return 'Visiteur';
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