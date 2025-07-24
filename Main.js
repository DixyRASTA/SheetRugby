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
 * Ouvre la barre latérale personnalisée "Match en direct".
 * Cette fonction ne devrait être appelée qu'une seule fois pour afficher la sidebar.
 * Le rafraîchissement des données est géré par le JavaScript dans Sidebar.html.
 */
function ouvrirTableauDeBord() {
  const html = HtmlService.createTemplateFromFile('Sidebar').evaluate()
      .setTitle('Tableau de Bord Match Rugby')
      .setWidth(300); // Ajuste la largeur si nécessaire
  SpreadsheetApp.getUi().showSidebar(html);
}


function updateSidebar() {
  getMatchTimeState(); // Cela rafraîchit les propriétés du timer.
}

/**
 * Fonction appelée par le client (dans la sidebar) pour récupérer le contenu HTML mis à jour.
 * C'est le lien entre le JS de la sidebar et les fonctions Apps Script côté serveur.
 */
function getSidebarContent() {
  const timeState = getMatchTimeState();
  const scriptProperties = PropertiesService.getScriptProperties();

  const matchTimeState = getMatchTimeState();
  const formattedTime = matchTimeState.tempsDeJeuFormatted;

  const currentScoreLocal = scriptProperties.getProperty('currentScoreLocal') || '0';
  const currentScoreVisiteur = scriptProperties.getProperty('currentScoreVisiteur') || '0';
  const alertMessage = timeState.message;
  const currentMatchPhase = timeState.phase;

  let timerStatus = "ARRÊTÉ";
  if (timeState.isTimerRunning) {
    timerStatus = "EN COURS";
  } else if (currentMatchPhase === 'non_demarre' || currentMatchPhase === 'fin_de_match') {
    timerStatus = "NON DÉMARRÉ";
  } else if (currentMatchPhase === 'mi_temps') {
    timerStatus = "MI-TEMPS";
  } else if (currentMatchPhase === 'pause') { // <-- Ajouté pour clarifier si le jeu est en pause manuelle
    timerStatus = "PAUSE";
  }
  // Ligne supprimée: else if (currentMatchPhase === 'awaiting_conversion' || currentMatchPhase === 'awaiting_penalty_kick') { ... }

  return {
    scoreLocal: currentScoreLocal,
    scoreVisiteur: currentScoreVisiteur,
    tempsDeJeu: timeState.tempsDeJeuFormatted,
    timerStatus: timerStatus,
    matchPhase: currentMatchPhase,
    alert: alertMessage
  };
}