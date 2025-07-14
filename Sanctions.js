/**
 * @file Gère la logique des sanctions (cartons) et des pénalités sifflées.
 */

/**
 * Gère l'attribution d'un carton (jaune ou rouge) à un joueur.
 * Cette fonction est appelée par Main.gs après les prompts utilisateur.
 * @param {string} team 'Locale' ou 'Visiteur'.
 * @param {string} cardType 'Carton Jaune' ou 'Carton Rouge'.
 * @param {string} player Le nom du joueur recevant le carton (optionnel).
 * @param {string} [remark=''] Remarque additionnelle (optionnel).
 */
function handleCard(team, cardType, player, remark = '') {
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentLocalScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentVisitorScore = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  const matchTimeState = getMatchTimeState(); // Récupère le temps de jeu actuel
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, team, cardType, player, currentLocalScore, currentVisitorScore, remark);

  Logger.log(`${player} (${team}) reçoit un ${cardType}.`);
  SpreadsheetApp.getUi().alert("Carton attribué", `${player} (${team}) reçoit un ${cardType}.`, SpreadsheetApp.getUi().ButtonSet.OK);

  updateSidebar(); // Met à jour la sidebar après l'événement
}

// NOTE: Plus tard, nous pourrons ajouter une fonction pour comptabiliser les pénalités sifflées ici.
/*
function recordPenaltyWhistle(team, reason = '') {
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentLocalScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentVisitorScore = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  const matchTimeState = getMatchTimeState();

  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, team, 'Pénalité sifflée', '', currentLocalScore, currentVisitorScore, reason);
  Logger.log(`Pénalité sifflée contre ${team}.`);
  updateSidebar();
}
*/
