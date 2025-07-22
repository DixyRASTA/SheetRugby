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
    ui.alert('Avertissement', 'Le nom de l\'équipe locale est absent.', ui.ButtonSet.OK);
    const localPrompt = ui.prompt(
      'Nom de l\'équipe Locale',
      'Entrez le nom de l\'équipe Locale (si non renseignée, par défaut: Local)',
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
    ui.alert('Avertissement', 'Le nom de l\'équipe visiteur est absent.', ui.ButtonSet.OK);
    const visitorPrompt = ui.prompt(
      'Nom de l\'équipe Visiteur',
      'Entrez le nom de l\'équipe Visiteur (si non renseignée, par défaut: Visiteur)',
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
  ui.alert('Information', 'Les noms des équipes sont renseignés. Le match va être initialisé.', ui.ButtonSet.OK);
}

function getLocalTeamName() {
  return PropertiesService.getScriptProperties().getProperty('localTeamName') || 'Local';
}

function getVisitorTeamName() {
  return PropertiesService.getScriptProperties().getProperty('visitorTeamName') || 'Visiteur';
}

/**
 * Demande à l'utilisateur de sélectionner l'équipe qui donne le coup d'envoi.
 * @return {string|null} Le nom de l'équipe sélectionnée ou null si annulé.
 */
function promptForKickOffTeam() {
  const ui = SpreadsheetApp.getUi();
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();

  const response = ui.prompt(
    'Coup d\'envoi',
    `Quelle équipe donne le coup d'envoi ?\n\n1. ${localTeamName}\n2. ${visitorTeamName}`,
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const userInput = response.getResponseText().trim();
    if (userInput === '1' || userInput.toLowerCase() === localTeamName.toLowerCase()) {
      return localTeamName;
    } else if (userInput === '2' || userInput.toLowerCase() === visitorTeamName.toLowerCase()) {
      return visitorTeamName;
    } else {
      ui.alert("Entrée invalide", "Veuillez entrer 1 ou 2, ou le nom de l'équipe.");
      return promptForKickOffTeam(); // Redemander en cas d'entrée invalide
    }
  } else {
    return null; // L'utilisateur a annulé
  }
}