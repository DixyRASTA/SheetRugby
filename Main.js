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
 * Ouvre le tableau de bord (sidebar) du match.
 */
function ouvrirTableauDeBord() {
  const html = HtmlService.createTemplateFromFile('Sidebar').evaluate()
      .setTitle('Tableau de Bord Match Rugby')
      .setWidth(300); // Ajuste la largeur si nécessaire
  SpreadsheetApp.getUi().showSidebar(html);
}


function updateSidebar() {
  getMatchTimeState(); // Cela rafraîchit les propriétés du timer.
  const ui = SpreadsheetApp.getUi();
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('Match en direct')
      .setWidth(300); // Ou la largeur désirée
  ui.showSidebar(html);
}

/**
 * Récupère toutes les données nécessaires pour mettre à jour la sidebar.
 * @returns {Object} Un objet contenant le temps de jeu, les scores, les noms d'équipes et les dernières actions.
 */
function getDataForSidebar() {
  const scriptProperties = PropertiesService.getScriptProperties();

  // 1. Récupération du temps de jeu
  const matchTimeState = getMatchTimeState();
  const formattedTime = matchTimeState.tempsDeJeuFormatted;

  // 2. Récupération des scores et noms d'équipes
  const currentScoreLocal = scriptProperties.getProperty('currentScoreLocal') || '0';
  const currentScoreVisiteur = scriptProperties.getProperty('currentScoreVisiteur') || '0';
  const localTeamName = getLocalTeamName(); // Assurez-vous que cette fonction est accessible (TeamManager.gs)
  const visitorTeamName = getVisitorTeamName(); // Assurez-vous que cette fonction est accessible (TeamManager.gs)

  // 3. Récupération des dernières actions de la feuille "Saisie"
  const feuilleSaisie = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
  let lastActions = [];
  if (feuilleSaisie && feuilleSaisie.getLastRow() > 2) { // Vérifie s'il y a des données après l'en-tête
    // Récupère toutes les données à partir de la 3ème ligne
    const dataRange = feuilleSaisie.getRange(3, 1, feuilleSaisie.getLastRow() - 2, feuilleSaisie.getLastColumn());
    const allData = dataRange.getValues();
    
    // Filtre pour ne garder que les colonnes nécessaires (Temps de jeu et Remarque)
    // Colonnes : A=Date, B=Temps de jeu, C=Équipe, D=Événement, E=Joueur, F=Score Local, G=Score Visiteur, H=Remarque
    // Nous avons besoin des colonnes B (index 1) et H (index 7)
    lastActions = allData.map(row => [row[1], row[7]]); // [Temps de jeu, Remarque]

    // Le HTML va prendre les 10 dernières actions, mais ici on peut récupérer tout ou un peu plus.
    // L'idéal est de laisser le HTML gérer la limite d'affichage si on veut un ascenseur.
  }
  
  return {
    time: formattedTime,
    localScore: currentScoreLocal,
    visitorScore: currentScoreVisiteur,
    localTeamName: localTeamName,
    visitorTeamName: visitorTeamName,
    lastActions: lastActions // Les actions brutes seront formatées par le JS côté client
  };
}
