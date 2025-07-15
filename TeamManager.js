/**
 * @file Gère la lecture et le stockage des noms des équipes.
 */

const SHEET_NAME_EQUIPES = "Equipes"; // Nom de la feuille où sont les noms des équipes

/**
 * Lit les noms des équipes (Locale et Visiteur) depuis la feuille "Équipes"
 * et les stocke dans les propriétés du script pour un accès facile.
 * Cette fonction devrait être appelée lors de l'initialisation du match.
 */
function loadTeamNames() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const equipesSheet = spreadsheet.getSheetByName(SHEET_NAME_EQUIPES);

  if (!equipesSheet) {
    Logger.log(`La feuille "${SHEET_NAME_EQUIPES}" n'existe pas.`);
    SpreadsheetApp.getUi().alert("Erreur", `La feuille "${SHEET_NAME_EQUIPES}" est introuvable. Veuillez vous assurer qu'elle existe et contient les noms des équipes.`, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // Assumons que le nom de l'équipe Locale est en A2 et Visiteur en A3
  const localTeamName = equipesSheet.getRange('A2').getValue();
  const visitorTeamName = equipesSheet.getRange('A3').getValue();

  if (!localTeamName || !visitorTeamName) {
    Logger.log("Noms d'équipes non trouvés ou incomplets dans la feuille 'Équipes'.");
    SpreadsheetApp.getUi().alert("Attention", "Les noms des équipes (Locale en A2, Visiteur en A3) n'ont pas été trouvés dans la feuille 'Équipes'. Veuillez les renseigner.", SpreadsheetApp.getUi().ButtonSet.OK);
    // On peut définir des valeurs par défaut si on veut éviter des erreurs plus tard
    scriptProperties.setProperty('localTeamName', localTeamName || 'Équipe Locale');
    scriptProperties.setProperty('visitorTeamName', visitorTeamName || 'Équipe Visiteur');
    return;
  }

  scriptProperties.setProperty('localTeamName', localTeamName.toString());
  scriptProperties.setProperty('visitorTeamName', visitorTeamName.toString());
  Logger.log(`Noms d'équipes chargés : Locale = ${localTeamName}, Visiteur = ${visitorTeamName}`);
}

/**
 * Récupère le nom de l'équipe Locale stocké dans les propriétés du script.
 * @returns {string} Le nom de l'équipe Locale.
 */
function getLocalTeamName() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty('localTeamName') || 'Équipe Locale'; // Fallback si non défini
}

/**
 * Récupère le nom de l'équipe Visiteur stocké dans les propriétés du script.
 * @returns {string} Le nom de l'équipe Visiteur.
 */
function getVisitorTeamName() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty('visitorTeamName') || 'Équipe Visiteur'; // Fallback si non défini
}