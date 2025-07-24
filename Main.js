/**
 * @file Code pour gérer le suivi d'un match de rugby dans Google Sheets.
 * Gère l'interface utilisateur (sidebar, menus) et orchestre les appels aux autres managers.
 */


/**
 * Fonction appelée automatiquement à l'ouverture de la feuille Google Sheet.
 * Ajoute les menus personnalisés pour un accès facile aux scripts.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Match Rugby')
      .addSubMenu(ui.createMenu('Phases de Match')
          .addItem('Coup d\'envoi 1ère MT', 'debutPremiereMiTemps')
          .addItem('Fin 1ère MT', 'finPremiereMiTemps')
          .addItem('Coup d\'envoi 2ème MT', 'debutDeuxiemeMiTemps')
          .addItem('Fin de Match', 'finDeMatch')
          .addItem('Arrêter Jeu (Pause)', 'arretJeu')
          .addItem('Reprendre Jeu', 'reprendreJeu'))
      .addSeparator()
      .addSubMenu(ui.createMenu('Scores')
          .addItem('Essai', 'addEssai')
          .addItem('Pénélité tentée', 'addPenalite')
          .addItem('Drop tenté', 'addDrop'))
      .addSeparator()
      .addSubMenu(ui.createMenu('Sanctions')
          .addItem('Carton Jaune', 'recordCartonJaunePrompt')
          .addItem('Carton Rouge', 'recordCartonRougePrompt')
          .addItem('Carton Bleu', 'recordCartonBleuPrompt')
          .addItem('Evènement','promptAndRecordCustomEvent'))
      .addSeparator()
      .addItem('Annuler dernier événement (attention!)', 'deleteLastEvent')
      .addToUi();
  ui.createMenu('Initialisation')    
      .addItem('Initialiser Nouveau Match', 'initialiserFeuilleEtProprietes')
      .addToUi();
}

/**
 * Ouvre la barre latérale personnalisée "Match en direct".
 * Cette fonction ne devrait être appelée qu'une seule fois pour afficher la sidebar.
 * Le rafraîchissement des données est géré par le JavaScript dans Sidebar.html.
 */
function ouvrirTableauDeBord() {
  const ui = SpreadsheetApp.getUi();
  const htmlOutput = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('Match en direct')
      .setWidth(300);
  ui.showSidebar(htmlOutput);
}

/**
 * Récupère toutes les données nécessaires pour mettre à jour la sidebar.
 * Cette fonction est appelée par le JavaScript côté client (Sidebar.html).
 * @returns {Object} Un objet contenant le temps de jeu, les scores, les noms d'équipes et les dernières actions.
 */
function getDataForSidebar() {
  const scriptProperties = PropertiesService.getScriptProperties();

  const matchTimeState = getMatchTimeState();
  const formattedTime = matchTimeState.tempsDeJeuFormatted;

  const currentScoreLocal = scriptProperties.getProperty('currentScoreLocal') || '0';
  const currentScoreVisiteur = scriptProperties.getProperty('currentScoreVisiteur') || '0';
  const localTeamName = getLocalTeamName(); 
  const visitorTeamName = getVisitorTeamName(); 

  const feuilleSaisie = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
  let lastActions = [];
  if (feuilleSaisie && feuilleSaisie.getLastRow() > 2) { 
    const dataRange = feuilleSaisie.getRange(3, 1, feuilleSaisie.getLastRow() - 2, 8); 
    const allData = dataRange.getValues();
    lastActions = allData.map(row => [row[1], row[7]]); 
  }
  
  return {
    time: formattedTime,
    localScore: currentScoreLocal,
    visitorScore: currentScoreVisiteur,
    localTeamName: localTeamName,
    visitorTeamName: visitorTeamName,
    lastActions: lastActions 
  };
}