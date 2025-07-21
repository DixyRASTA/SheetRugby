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
    ui.alert('Avertissement', 'Le nom de l\'équipe locale est obligatoire.', ui.ButtonSet.OK);
    const localPrompt = ui.prompt(
      'Nom de l\'équipe Locale',
      'Veuillez entrer le nom de l\'équipe Locale',
      ui.ButtonSet.OK_CANCEL
    );
    if (localPrompt.getSelectedButton() === ui.Button.OK && localPrompt.getResponseText() !== '') {
      localTeamName = localPrompt.getResponseText();
      scriptProperties.setProperty('localTeamName', localTeamName);
      sheet.getRange('A2').setValue(localTeamName); // Mettre à jour la feuille
    } else {
      ui.alert('Erreur', 'L\'initialisation du match nécessite le nom de l\'équipe locale.', ui.ButtonSet.OK);
      return; // Arrêter l'exécution si le nom n'est pas saisi
    }
  } else {
    scriptProperties.setProperty('localTeamName', localTeamName);
  }

  // Vérifier si le nom de l'équipe visiteur est absent
  if (!visitorTeamName) {
    ui.alert('Avertissement', 'Le nom de l\'équipe visiteur est obligatoire.', ui.ButtonSet.OK);
    const visitorPrompt = ui.prompt(
      'Nom de l\'équipe Visiteur',
      'Veuillez entrer le nom de l\'équipe Visiteur',
      ui.ButtonSet.OK_CANCEL
    );
    if (visitorPrompt.getSelectedButton() === ui.Button.OK && visitorPrompt.getResponseText() !== '') {
      visitorTeamName = visitorPrompt.getResponseText();
      scriptProperties.setProperty('visitorTeamName', visitorTeamName);
      sheet.getRange('A3').setValue(visitorTeamName); // Mettre à jour la feuille
    } else {
      ui.alert('Erreur', 'L\'initialisation du match nécessite le nom de l\'équipe visiteur.', ui.ButtonSet.OK);
      return; // Arrêter l'exécution si le nom n'est pas saisi
    }
  } else {
    scriptProperties.setProperty('visitorTeamName', visitorTeamName);
  }

  Logger.log(`Noms d'équipes chargés : Locale = ${getLocalTeamName()}, Visiteur = ${getVisitorTeamName()}`);
  ui.alert('Information', 'Les noms des équipes ont été renseignés avec succès. Le match peut être initialisé.', ui.ButtonSet.OK);
}

function getLocalTeamName() {
  return PropertiesService.getScriptProperties().getProperty('localTeamName') || 'Locale';
}

function getVisitorTeamName() {
  return PropertiesService.getScriptProperties().getProperty('visitorTeamName') || 'Visiteur';
}
