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
          .addItem('Reprendre Jeu', 'reprendreJeu')) // Reprendre Jeu ne doit pas déclencher un prompt
      .addSeparator()
      .addSubMenu(ui.createMenu('Scores')
          .addItem('Essai', 'addEssai')
          .addItem('Pénalité tentée', 'addPenalite') // Correction de faute de frappe
          .addItem('Drop tenté', 'addDrop'))
      .addSeparator()
      .addSubMenu(ui.createMenu('Sanctions')
          .addItem('Carton Jaune', 'recordCartonJaunePrompt')
          .addItem('Carton Rouge', 'recordCartonRougePrompt')
          .addItem('Carton Bleu', 'recordCartonBleuPrompt')
          .addItem('Événement', 'promptAndRecordCustomEvent')) // Correction de faute de frappe et s'assurer que c'est le nom de la fonction générique
      .addSeparator()
      .addItem('Annuler dernier événement (attention!)', 'deleteLastEvent')
      .addToUi();
  ui.createMenu('Initialisation')    
      .addItem('Initialiser Nouveau Match', 'initialiserFeuilleEtProprietes')
      .addToUi();
}

/**
 * Ouvre ou rafraîchit le tableau de bord (sidebar) du match en s'assurant qu'il conserve ses propriétés.
 */
function ouvrirTableauDeBord() {
  const ui = SpreadsheetApp.getUi(); 
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('Tableau de Bord Match Rugby')
      .setWidth(300) 
      .setSandboxMode(HtmlService.SandboxMode.IFRAME); // Assure que le mode sandbox est toujours appliqué
  ui.showSidebar(html); // Affiche la sidebar avec les paramètres désirés
}

/**
 * Fonction appelée par le client (dans la sidebar) pour récupérer le contenu HTML mis à jour.
 * C'est le lien entre le JS de la sidebar et les fonctions Apps Script côté serveur.
 */
function getDataForSidebar() { 
  const timeState = getMatchTimeState();
  const scriptProperties = PropertiesService.getScriptProperties();

  const currentScoreLocal = scriptProperties.getProperty('currentScoreLocal') || '0';
  const currentScoreVisiteur = scriptProperties.getProperty('currentScoreVisiteur') || '0';
  const alertMessage = scriptProperties.getProperty('alertMessage') || ''; // S'assurer que alertMessage est bien récupéré des propriétés.
  const currentMatchPhase = timeState.phase; 

  // ... (le reste de la fonction getDataForSidebar reste inchangé) ...

  let timerStatus = "ARRÊTÉ"; 
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
  const teamNameLocal = getLocalTeamName(); 
  const teamNameVisiteur = getVisitorTeamName(); 

  // Récupérer les dernières actions de la feuille "Saisie"
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
  let actions = []; 
  if (sheet && sheet.getLastRow() >= 3) { 
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(3, lastRow - 9); 
    const numRowsToFetch = lastRow - startRow + 1;

    // S'assurer qu'il y a des lignes à récupérer
    if (numRowsToFetch > 0) {
      const actionsData = sheet.getRange(startRow, 1, numRowsToFetch, 8).getValues(); 
      actions = actionsData.map(row => ({
        gameTime: row[1], 
        remark: row[7]    
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
    actions: actions,
    alertMessage: alertMessage // Inclure le message d'alerte pour affichage potentiel dans la sidebar
  };
}
