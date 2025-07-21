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
  const ui = SpreadsheetApp.getUi();
  const scriptProperties = PropertiesService.getScriptProperties();

  const defaultLocal = scriptProperties.getProperty('localTeamName') || 'UA Issigeac';
  const defaultVisitor = scriptProperties.getProperty('visitorTeamName') || 'US Lalinde';

  const localPrompt = ui.prompt(
    'Nom de l\'équipe Locale',
    'Entrez le nom de l\'équipe Locale (par défaut: ' + defaultLocal + ')',
    ui.ButtonSet.OK_CANCEL
  );
  if (localPrompt.getSelectedButton() === ui.Button.OK && localPrompt.getResponseText() !== '') {
    scriptProperties.setProperty('localTeamName', localPrompt.getResponseText());
  } else {
    scriptProperties.setProperty('localTeamName', defaultLocal);
  }

  const visitorPrompt = ui.prompt(
    'Nom de l\'équipe Visiteur',
    'Entrez le nom de l\'équipe Visiteur (par défaut: ' + defaultVisitor + ')',
    ui.ButtonSet.OK_CANCEL
  );
  if (visitorPrompt.getSelectedButton() === ui.Button.OK && visitorPrompt.getResponseText() !== '') {
    scriptProperties.setProperty('visitorTeamName', visitorPrompt.getResponseText());
  } else {
    scriptProperties.setProperty('visitorTeamName', defaultVisitor);
  }
  Logger.log(`Noms d'équipes chargés : Locale = ${getLocalTeamName()}, Visiteur = ${getVisitorTeamName()}`);
}

function getLocalTeamName() {
  return PropertiesService.getScriptProperties().getProperty('localTeamName') || 'Locale';
}

function getVisitorTeamName() {
  return PropertiesService.getScriptProperties().getProperty('visitorTeamName') || 'Visiteur';
}