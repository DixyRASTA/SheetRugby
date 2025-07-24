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
  const scriptProperties = PropertiesService.getScriptProperties();

  // --- Vérification des propriétés avant calcul de l'état du temps ---
  Logger.log('getDataForSidebar - Propriétés du script au début:');
  Logger.log('currentScoreLocal: ' + scriptProperties.getProperty('currentScoreLocal'));
  Logger.log('currentScoreVisiteur: ' + scriptProperties.getProperty('currentScoreVisiteur'));
  Logger.log('localTeamName: ' + scriptProperties.getProperty('localTeamName'));
  Logger.log('visitorTeamName: ' + scriptProperties.getProperty('visitorTeamName'));
  Logger.log('isTimerRunning: ' + scriptProperties.getProperty('isTimerRunning'));
  Logger.log('currentMatchPhase: ' + scriptProperties.getProperty('currentMatchPhase'));
  Logger.log('startTime: ' + scriptProperties.getProperty('startTime'));
  Logger.log('gameTimeAtLastPause: ' + scriptProperties.getProperty('gameTimeAtLastPause'));
  
  const timeState = getMatchTimeState();

  const currentScoreLocal = scriptProperties.getProperty('currentScoreLocal') || '0';
  const currentScoreVisiteur = scriptProperties.getProperty('currentScoreVisiteur') || '0';
  const alertMessage = scriptProperties.getProperty('alertMessage') || '';
  const currentMatchPhase = timeState.phase;

  // Récupérer les noms des équipes directement des propriétés
  const teamNameLocal = scriptProperties.getProperty('localTeamName') || 'Local'; 
  const teamNameVisiteur = scriptProperties.getProperty('visitorTeamName') || 'Visiteur'; 

  // ... (le reste de la logique pour `timerStatus` et `actions` reste inchangée) ...

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
    actions = [{ gameTime: '--:--', remark: 'Aucune action enregistrée.' }];
  }

  // --- Vérification des données AVANT le retour ---
  Logger.log('getDataForSidebar - Données retournées:');
  Logger.log('scoreLocal: ' + currentScoreLocal);
  Logger.log('scoreVisiteur: ' + currentScoreVisiteur);
  Logger.log('teamNameLocal: ' + teamNameLocal);
  Logger.log('teamNameVisiteur: ' + teamNameVisiteur);
  Logger.log('tempsDeJeu: ' + timeState.tempsDeJeuFormatted);
  Logger.log('actions: ' + JSON.stringify(actions)); // Utilisez JSON.stringify pour voir le contenu du tableau d'objets

  return {
    scoreLocal: currentScoreLocal,
    scoreVisiteur: currentScoreVisiteur,
    teamNameLocal: teamNameLocal,
    teamNameVisiteur: teamNameVisiteur,
    tempsDeJeu: timeState.tempsDeJeuFormatted,
    actions: actions,
    alertMessage: alertMessage
  };
}

