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
          .addItem('Evènement','promptAndRecordCustomEvent')) // <-- Assurez-vous que c'est bien le nom de la fonction générique
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
  const ui = SpreadsheetApp.getUi(); // Déclarer ui ici si non déjà fait dans la portée globale
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('Tableau de Bord Match Rugby')
      .setWidth(300); // Ajuste la largeur si nécessaire
  ui.showSidebar(html); // <-- CORRECTION ICI : Utilise 'html' au lieu de 'htmlOutput'
}


/**
 * Fonction appelée par le client (dans la sidebar) pour récupérer le contenu HTML mis à jour.
 * C'est le lien entre le JS de la sidebar et les fonctions Apps Script côté serveur.
 */
function getDataForSidebar() { // <-- CORRECTION ICI : Renommé de getSidebarContent à getDataForSidebar
  const timeState = getMatchTimeState();
  const scriptProperties = PropertiesService.getScriptProperties();

  const currentScoreLocal = scriptProperties.getProperty('currentScoreLocal') || '0';
  const currentScoreVisiteur = scriptProperties.getProperty('currentScoreVisiteur') || '0';
  const alertMessage = timeState.message; // Non retourné, mais peut être utilisé pour le débogage
  const currentMatchPhase = timeState.phase; // Non retourné, mais peut être utilisé pour le débogage

  let timerStatus = "ARRÊTÉ"; // Non retourné, mais peut être utilisé pour le débogage
  if (timeState.isTimerRunning) {
    timerStatus = "EN COURS";
  } else if (currentMatchPhase === 'non_demarre' || currentMatchPhase === 'fin_de_match') {
    timerStatus = "NON DÉMARRÉ";
  } else if (currentMatchPhase === 'mi_temps') {
    timerStatus = "MI-TEMPS";
  } else if (currentMatchPhase === 'pause') {
    timerStatus = "PAUSE";
  }

  // Récupérer les noms des équipes
  const teamNameLocal = getLocalTeamName(); // Assurez-vous que getLocalTeamName est accessible (TeamManager.gs)
  const teamNameVisiteur = getVisitorTeamName(); // Assurez-vous que getVisitorTeamName est accessible (TeamManager.gs)

  // Récupérer les dernières actions de la feuille "Saisie"
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
  let actions = []; // Initialiser le tableau d'actions
  if (sheet && sheet.getLastRow() >= 3) { // Vérifier si la feuille existe et s'il y a des données (au moins 3 lignes pour l'en-tête + 1 ligne de données)
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(3, lastRow - 9); // Récupérer jusqu'à 10 dernières actions (lastRow - 10 + 1)
    const numRowsToFetch = lastRow - startRow + 1;

    // S'assurer qu'il y a des lignes à récupérer
    if (numRowsToFetch > 0) {
      const actionsData = sheet.getRange(startRow, 1, numRowsToFetch, 8).getValues(); // Colonne 8 = H
      actions = actionsData.map(row => ({
        gameTime: row[1], // Temps de jeu (colonne B, index 1)
        remark: row[7]    // Remarque (colonne H, index 7)
      }));
    }
  } else {
    // Si pas de données, renvoyer un message d'absence d'actions
    actions = [{ gameTime: '--:--', remark: 'Aucune action enregistrée.' }];
  }

  return {
    scoreLocal: currentScoreLocal,
    scoreVisiteur: currentScoreVisiteur,
    teamNameLocal: teamNameLocal,
    teamNameVisiteur: teamNameVisiteur,
    tempsDeJeu: timeState.tempsDeJeuFormatted,
    actions: actions // Le nom 'actions' correspond à ce que Sidebar.html attend
  };
}