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

  // 1. Récupération du temps de jeu
  const matchTimeState = getMatchTimeState(); // S'assure que le timer est mis à jour
  const formattedTime = matchTimeState.tempsDeJeuFormatted;

  // 2. Récupération des scores et noms d'équipes
  const currentScoreLocal = scriptProperties.getProperty('currentScoreLocal') || '0';
  const currentScoreVisiteur = scriptProperties.getProperty('currentScoreVisiteur') || '0';
  const localTeamName = getLocalTeamName(); 
  const visitorTeamName = getVisitorTeamName(); 

  // 3. Récupération des dernières actions de la feuille "Saisie"
  const feuilleSaisie = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
  let lastActions = [];
  if (feuilleSaisie && feuilleSaisie.getLastRow() > 2) { 
    const dataRange = feuilleSaisie.getRange(3, 1, feuilleSaisie.getLastRow() - 2, 8); // On prend jusqu'à la colonne H (Remarque)
    const allData = dataRange.getValues();
    
    // On ne garde que les colonnes nécessaires : Temps de jeu (index 1) et Remarque (index 7)
    // Le HTML s'attend à un tableau de [temps, remarque]
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

/**
 * Met à jour la sidebar. Cette fonction est appelée depuis le code serveur
 * (par exemple, après un recordEvent) pour signaler au client de se rafraîchir.
 * IMPORTANT : Elle ne doit PAS recréer la sidebar, mais appeler le JS côté client.
 */
function updateSidebar() {
  // getMatchTimeState(); // Pas nécessaire ici, getDataForSidebar le fait déjà.

  // Appelle la fonction refreshSidebar() dans le JavaScript de la sidebar pour qu'elle se rafraîchisse.
  // Assurez-vous que refreshSidebar est une fonction globale dans Sidebar.html
  // et que la sidebar est déjà ouverte.
  try {
    const htmlOutput = HtmlService.createHtmlOutput('<script>if (window.refreshSidebar) window.refreshSidebar();</script>');
    SpreadsheetApp.getUi().showSidebar(htmlOutput); // Ceci ne va pas rouvrir, juste exécuter le script
  } catch (e) {
    Logger.log("Erreur lors de la mise à jour de la sidebar: " + e.message);
    // Si la sidebar n'est pas ouverte, ouvrez-la.
    ouvrirTableauDeBord(); 
  }
}