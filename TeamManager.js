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
  const localTeamName = sheet.getRange('A2').getValue();
  const visitorTeamName = sheet.getRange('A3').getValue();

  // Vérifier si le nom de l'équipe locale est absent
  if (!localTeamName) {
    ui.alert('Avertissement', 'Le nom de l\'équipe locale est absent.', ui.ButtonSet.OK);
    const localPrompt = ui.prompt(
      'Nom de l\'équipe Locale',
      'Entrez le nom de l\'équipe Locale',
      ui.ButtonSet.OK_CANCEL
    );
    if (localPrompt.getSelectedButton() === ui.Button.OK && localPrompt.getResponseText() !== '') {
      scriptProperties.setProperty('localTeamName', localPrompt.getResponseText());
      sheet.getRange('A2').setValue(localPrompt.getResponseText()); // Mettre à jour la feuille
    } else {
      ui.alert('Avertissement', 'Aucun nom saisi pour l\'équipe locale.', ui.ButtonSet.OK);
    }
  } else {
    scriptProperties.setProperty('localTeamName', localTeamName);
  }

  // Vérifier si le nom de l'équipe visiteur est absent
  if (!visitorTeamName) {
    ui.alert('Avertissement', 'Le nom de l\'équipe visiteur est absent.', ui.ButtonSet.OK);
    const visitorPrompt = ui.prompt(
      'Nom de l\'équipe Visiteur',
      'Entrez le nom de l\'équipe Visiteur',
      ui.ButtonSet.OK_CANCEL
    );
    if (visitorPrompt.getSelectedButton() === ui.Button.OK && visitorPrompt.getResponseText() !== '') {
      scriptProperties.setProperty('visitorTeamName', visitorPrompt.getResponseText());
      sheet.getRange('A3').setValue(visitorPrompt.getResponseText()); // Mettre à jour la feuille
    } else {
      ui.alert('Avertissement', 'Aucun nom saisi pour l\'équipe visiteur.', ui.ButtonSet.OK);
    }
  } else {
    scriptProperties.setProperty('visitorTeamName', visitorTeamName);
  }

  Logger.log(`Noms d'équipes chargés : Locale = ${getLocalTeamName()}, Visiteur = ${getVisitorTeamName()}`);
}

function getLocalTeamName() {
  return PropertiesService.getScriptProperties().getProperty('localTeamName') || 'Locale';
}

function getVisitorTeamName() {
  return PropertiesService.getScriptProperties().getProperty('visitorTeamName') || 'Visiteur';
}
