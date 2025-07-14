/**
 * @file Gère la logique des scores du match et des actions spécifiques (cartons, remplacements).
 * Met à jour les propriétés du script et enregistre les événements.
 */

/**
 * Ajoute des points au score d'une équipe et enregistre l'événement.
 * @param {string} team 'Locale' ou 'Visiteur'.
 * @param {string} actionType Le type d'action (ex: 'Essai', 'Transformation', 'Pénalité', 'Drop').
 * @param {number} points Le nombre de points à ajouter.
 * @param {string} [player=''] Le nom du joueur ayant réalisé l'action (optionnel).
 * @param {string} [remark=''] Remarque additionnelle (optionnel).
 */
function addScore(team, actionType, points, player = '', remark = '') {
  const scriptProperties = PropertiesService.getScriptProperties();
  let currentLocalScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  let currentVisitorScore = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  if (team === 'Locale') {
    currentLocalScore += points;
    scriptProperties.setProperty('currentScoreLocal', currentLocalScore.toString());
  } else if (team === 'Visiteur') {
    currentVisitorScore += points;
    scriptProperties.setProperty('currentScoreVisiteur', currentVisitorScore.toString());
  } else {
    SpreadsheetApp.getUi().alert("Erreur de score", "Équipe non reconnue : " + team, SpreadsheetApp.getUi().ButtonSet.OK);
    Logger.log("Erreur: Équipe non reconnue pour addScore: " + team);
    return;
  }

  // Enregistrer l'événement
  const matchTimeState = getMatchTimeState(); // On récupère le temps de jeu actuel
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, team, actionType, player, currentLocalScore, currentVisitorScore, remark);

  Logger.log(`${team} marque ${points} points (${actionType}). Nouveau score: ${currentLocalScore}-${currentVisitorScore}`);
  SpreadsheetApp.getUi().alert("Score mis à jour", `${team} marque ${points} points (${actionType}). Nouveau score: ${currentLocalScore} - ${currentVisitorScore}`, SpreadsheetApp.getUi().ButtonSet.OK);
  
  updateSidebar(); // Met à jour la sidebar après le changement de score
}

/**
 * Gère l'attribution d'un carton (jaune ou rouge) à un joueur.
 * @param {string} team 'Locale' ou 'Visiteur'.
 * @param {string} cardType 'Carton Jaune' ou 'Carton Rouge'.
 * @param {string} player Le nom du joueur recevant le carton.
 * @param {string} [remark=''] Remarque additionnelle (optionnel).
 */
function handleCard(team, cardType, player, remark = '') {
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentLocalScore = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentVisitorScore = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  const matchTimeState = getMatchTimeState();
  recordEvent(new Date(), matchTimeState.tempsDeJeuFormatted, team, cardType, player, currentLocalScore, currentVisitorScore, remark);

  Logger.log(`${player} (${team}) reçoit un ${cardType}.`);
  SpreadsheetApp.getUi().alert("Carton attribué", `${player} (${team}) reçoit un ${cardType}.`, SpreadsheetApp.getUi().ButtonSet.OK);

  updateSidebar();
}

// Suppression de handleSubstitution qui n'est plus nécessaire


// NOTE: Plus tard, nous pourrons ajouter des fonctions pour gérer des événements plus complexes
// comme les pénalités manquées, les en-avant, les mêlées, etc., si besoin.
