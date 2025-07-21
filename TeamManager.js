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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_EQUIPES);

  // Lire les noms des équipes à partir de la feuille
  let localTeamName = sheet.getRange('A2').getValue();
  let visitorTeamName = sheet.getRange('A3').getValue();

  // Vérifier si le nom de l'équipe locale est absent
  if (!localTeamName) {
    ui.alert('Avertissement', 'Le nom de l\'équipe locale est absent. Utilisation de "Local" par défaut.', ui.ButtonSet.OK);
    const localPrompt = ui.prompt(
      'Nom de l\'équipe Locale',
      'Entrez le nom de l\'équipe Locale (par défaut: Local)',
      ui.ButtonSet.OK_CANCEL
    );
    if (localPrompt.getSelectedButton() === ui.Button.OK && localPrompt.getResponseText() !== '') {
      localTeamName = localPrompt.getResponseText();
    } else {
      localTeamName = 'Local'; // Utiliser le nom par défaut
    }
    scriptProperties.setProperty('localTeamName', localTeamName);
    sheet.getRange('A2').setValue(localTeamName); // Mettre à jour la feuille
  } else {
    scriptProperties.setProperty('localTeamName', localTeamName);
  }

  // Vérifier si le nom de l'équipe visiteur est absent
  if (!visitorTeamName) {
    ui.alert('Avertissement', 'Le nom de l\'équipe visiteur est absent. Utilisation de "Visiteur" par défaut.', ui.ButtonSet.OK);
    const visitorPrompt = ui.prompt(
      'Nom de l\'équipe Visiteur',
      'Entrez le nom de l\'équipe Visiteur (par défaut: Visiteur)',
      ui.ButtonSet.OK_CANCEL
    );
    if (visitorPrompt.getSelectedButton() === ui.Button.OK && visitorPrompt.getResponseText() !== '') {
      visitorTeamName = visitorPrompt.getResponseText();
    } else {
      visitorTeamName = 'Visiteur'; // Utiliser le nom par défaut
    }
    scriptProperties.setProperty('visitorTeamName', visitorTeamName);
    sheet.getRange('A3').setValue(visitorTeamName); // Mettre à jour la feuille
  } else {
    scriptProperties.setProperty('visitorTeamName', visitorTeamName);
  }

  Logger.log(`Noms d'équipes chargés : Locale = ${getLocalTeamName()}, Visiteur = ${getVisitorTeamName()}`);
  ui.alert('Information', 'Les noms des équipes ont été renseignés. Le match peut être initialisé.', ui.ButtonSet.OK);
}

function getLocalTeamName() {
  return PropertiesService.getScriptProperties().getProperty('localTeamName') || 'Local';
}

function getVisitorTeamName() {
  return PropertiesService.getScriptProperties().getProperty('visitorTeamName') || 'Visiteur';
}
