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
      .addItem('Ouvrir Tableau de Bord', 'ouvrirTableauDeBord')
      .addSeparator()
      .addSubMenu(ui.createMenu('Phases de Match')
          .addItem('Initialiser Nouveau Match', 'initialiserFeuilleEtProprietes')
          .addItem('Coup d\'envoi 1ère MT', 'debutPremiereMiTemps')
          .addItem('Fin 1ère MT', 'finPremiereMiTemps')
          .addItem('Coup d\'envoi 2ème MT', 'debutDeuxiemeMiTemps')
          .addItem('Arrêter Jeu (Pause)', 'arretJeu')
          .addItem('Reprendre Jeu', 'reprendreJeu')
          .addItem('Fin de Match', 'finDeMatch'))
      .addSeparator()
      .addSubMenu(ui.createMenu('Scores')
          .addItem('Essai Locale (5 pts)', 'addScoreLocaleEssai')
          .addItem('Transformation Locale Réussie (2 pts)', 'addScoreLocaleTransfoReussie')
          .addItem('Transformation Locale Manquée', 'addScoreLocaleTransfoManquee')
          .addItem('Pénalité Locale Réussie (3 pts)', 'addScoreLocalePenaliteReussie')
          .addItem('Pénalité Locale Manquée', 'addScoreLocalePenaliteManquee')
          .addItem('Drop Locale (3 pts)', 'addScoreLocaleDrop')
          .addSeparator()
          .addItem('Essai Visiteur (5 pts)', 'addScoreVisiteurEssai')
          .addItem('Transformation Visiteur Réussie (2 pts)', 'addScoreVisiteurTransfoReussie')
          .addItem('Transformation Visiteur Manquée', 'addScoreVisiteurTransfoManquee')
          .addItem('Pénalité Visiteur Réussie (3 pts)', 'addScoreVisiteurPenaliteReussie')
          .addItem('Pénalité Visiteur Manquée', 'addScoreVisiteurPenaliteManquee')
          .addItem('Drop Visiteur (3 pts)', 'addScoreVisiteurDrop'))
      .addSeparator()
      .addSubMenu(ui.createMenu('Sanctions')
          .addItem('Carton Jaune...', 'recordCartonJaunePrompt')
          .addItem('Carton Rouge...', 'recordCartonRougePrompt'))
      .addSeparator()
      .addItem('Annuler dernier événement (attention!)', 'deleteLastEvent')
      .addToUi();
}

/**
 * Fonction utilitaire pour demander quelle équipe donne le coup d'envoi.
 * Peut être appelée par d'autres fonctions.
 */
function promptForKickOffTeam() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Coup d\'envoi',
    'Quelle équipe donne le coup d\'envoi ?',
    ui.ButtonSet.YES_NO_CANCEL // YES pour Locale, NO pour Visiteur
  );
  if (response === ui.Button.YES) {
    return 'Locale';
  } else if (response === ui.Button.NO) {
    return 'Visiteur';
  }
  return null; // Annulé
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

/**
 * La fonction qui génère et affiche le HTML de la sidebar, elle est appelée par le déclencheur temporel et par l'utilisateur,
 * elle appelle TimeManager pour obtenir l'état du chronomètre et les autres managers pour obtenir les données.
 */
function updateSidebar() {
  const timeState = getMatchTimeState(); // <-- CORRIGÉ : Suppression de TimeManager.
  const scriptProperties = PropertiesService.getScriptProperties();

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
  } else if (currentMatchPhase === 'awaiting_conversion' || currentMatchPhase === 'awaiting_penalty_kick') {
    timerStatus = "JEU FIGÉ (COUP DE PIED)";
  } else if (currentMatchPhase === 'pause') {
    timerStatus = "PAUSE";
  }

  SpreadsheetApp.getUi().getSidebar().setTitle('Tableau de Bord Match Rugby');
  SpreadsheetApp.getUi().getSidebar().setContent(
    HtmlService.createTemplateFromFile('Sidebar').evaluate()
      .setContent({
        scoreLocal: currentScoreLocal,
        scoreVisiteur: currentScoreVisiteur,
        tempsDeJeu: timeState.tempsDeJeuFormatted,
        timerStatus: timerStatus,
        matchPhase: currentMatchPhase,
        alert: alertMessage
      })
  );
}

/**
 * Fonction appelée par le client (dans la sidebar) pour récupérer le contenu HTML mis à jour.
 * C'est le lien entre le JS de la sidebar et les fonctions Apps Script côté serveur.
 */
function getSidebarContent() {
  const timeState = getMatchTimeState(); // <-- CORRIGÉ : Suppression de TimeManager.
  const scriptProperties = PropertiesService.getScriptProperties();

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
  } else if (currentMatchPhase === 'awaiting_conversion' || currentMatchPhase === 'awaiting_penalty_kick') {
    timerStatus = "JEU FIGÉ (COUP DE PIED)";
  } else if (currentMatchPhase === 'pause') {
    timerStatus = "PAUSE";
  }

  return {
    scoreLocal: currentScoreLocal,
    scoreVisiteur: currentScoreVisiteur,
    tempsDeJeu: timeState.tempsDeJeuFormatted,
    timerStatus: timerStatus,
    matchPhase: currentMatchPhase,
    alert: alertMessage
  };
}