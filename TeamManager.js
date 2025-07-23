// TeamManager.gs

/**
 * @file Gère la lecture et le stockage des noms des équipes.
 */
const SHEET_NAME_EQUIPES = "Equipes"; // Nom de la feuille où sont les noms des équipes

/**
 * Lit les noms des équipes (Locale et Visiteur) depuis la feuille "Équipes"
 * et les stocke dans les propriétés du script pour un accès facile.
 * Cette fonction devrait être appelée lors de l'initialisation du match.
 *
 * Optimisation: Demande les noms si absents sans alertes multiples.
 */
function loadTeamNames() {
  const ui = SpreadsheetApp.getUi();
  const scriptProperties = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_EQUIPES);

  if (!sheet) {
    ui.alert('Erreur', `La feuille "${SHEET_NAME_EQUIPES}" est introuvable. Veuillez la créer.`, ui.ButtonSet.OK);
    return;
  }

  // --- Fonction utilitaire interne pour gérer la lecture/saisie d'un nom d'équipe ---
  function getOrPromptTeamName(propertyKey, cellRef, defaultName, promptTitle, promptMessage) {
    let teamName = sheet.getRange(cellRef).getValue();

    if (!teamName) {
      const response = ui.prompt(
        promptTitle,
        `${promptMessage} (par défaut: ${defaultName})`,
        ui.ButtonSet.OK_CANCEL
      );

      if (response.getSelectedButton() === ui.Button.OK && response.getResponseText().trim() !== '') {
        teamName = response.getResponseText().trim();
      } else {
        teamName = defaultName; // Utiliser le nom par défaut si annulation ou vide
      }
      sheet.getRange(cellRef).setValue(teamName); // Mettre à jour la feuille
    }
    scriptProperties.setProperty(propertyKey, teamName); // Toujours stocker dans les propriétés
    return teamName;
  }

  const localTeamName = getOrPromptTeamName(
    'localTeamName',
    'A2',
    'Local',
    'Nom de l\'équipe Locale',
    'Entrez le nom de l\'équipe Locale:'
  );

  const visitorTeamName = getOrPromptTeamName(
    'visitorTeamName',
    'A3',
    'Visiteur',
    'Nom de l\'équipe Visiteur',
    'Entrez le nom de l\'équipe Visiteur:'
  );

  Logger.log(`Noms d'équipes chargés : Locale = ${localTeamName}, Visiteur = ${visitorTeamName}`);
  ui.alert('Information', 'Les noms des équipes sont renseignés. Le match va être initialisé.', ui.ButtonSet.OK);
}

/**
 * Récupère le nom de l'équipe locale à partir des propriétés du script.
 * @returns {string} Le nom de l'équipe locale ou 'Local' par défaut.
 */
function getLocalTeamName() {
  return PropertiesService.getScriptProperties().getProperty('localTeamName') || 'Local';
}

/**
 * Récupère le nom de l'équipe visiteur à partir des propriétés du script.
 * @returns {string} Le nom de l'équipe visiteur ou 'Visiteur' par défaut.
 */
function getVisitorTeamName() {
  return PropertiesService.getScriptProperties().getProperty('visitorTeamName') || 'Visiteur';
}

/**
 * Demande à l'utilisateur de sélectionner l'équipe qui donne le coup d'envoi.
 * Gère les entrées invalides avec une boucle.
 * @return {string|null} Le nom de l'équipe sélectionnée ou null si annulé.
 */
function promptForKickOffTeam() {
  const ui = SpreadsheetApp.getUi();
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();

  let selectedTeam = null;
  let isValidInput = false;

  while (!isValidInput) {
    const response = ui.prompt(
      'Coup d\'envoi',
      `Quelle équipe donne le coup d'envoi ?\n\n1. ${localTeamName}\n2. ${visitorTeamName}`,
      ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() === ui.Button.OK) {
      const userInput = response.getResponseText().trim();
      if (userInput === '1' || userInput.toLowerCase() === localTeamName.toLowerCase()) {
        selectedTeam = localTeamName;
        isValidInput = true;
      } else if (userInput === '2' || userInput.toLowerCase() === visitorTeamName.toLowerCase()) {
        selectedTeam = visitorTeamName;
        isValidInput = true;
      } else {
        ui.alert("Entrée invalide", "Veuillez entrer 1 ou 2, ou le nom de l'équipe.");
        // Reste dans la boucle pour redemander
      }
    } else {
      // L'utilisateur a annulé
      selectedTeam = null;
      isValidInput = true; // Quitter la boucle
    }
  }
  return selectedTeam;
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