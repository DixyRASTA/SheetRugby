/**
 * @file Code pour gérer le suivi d'un match de rugby dans Google Sheets.
 * Gère l'interface utilisateur (sidebar, menus) et orchestre les appels aux autres managers.
 */

// Dans Main.gs

/**
 * Fonction appelée automatiquement à l'ouverture de la feuille Google Sheet.
 * Ajoute les menus personnalisés pour un accès facile aux scripts.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Match Rugby')
      .addItem('Ouvrir Tableau de Bord', 'ouvrirTableauDeBord') // Dans Main.gs, pas de préfixe
      .addSeparator()
      .addSubMenu(ui.createMenu('Phases de Match')
          .addItem('Initialiser Nouveau Match', 'initialiserFeuilleEtProprietes') // <-- APPEL SANS PRÉFIXE
          .addItem('Coup d\'envoi 1ère MT', 'debutPremiereMiTemps') // <-- APPEL SANS PRÉFIXE
          .addItem('Fin 1ère MT', 'finPremiereMiTemps') // <-- APPEL SANS PRÉFIXE
          .addItem('Coup d\'envoi 2ème MT', 'debutDeuxiemeMiTemps') // <-- APPEL SANS PRÉFIXE
          .addItem('Arrêter Jeu (Pause)', 'arretJeu') // <-- APPEL SANS PRÉFIXE
          .addItem('Reprendre Jeu', 'reprendreJeu') // <-- APPEL SANS PRÉFIXE
          .addItem('Fin de Match', 'finDeMatch')) // <-- APPEL SANS PRÉFIXE
      .addSeparator()
      .addSubMenu(ui.createMenu('Scores')
          .addItem('Essai Locale (5 pts)', 'addScoreLocaleEssai') // <-- APPEL SANS PRÉFIXE
          .addItem('Transformation Locale Réussie (2 pts)', 'addScoreLocaleTransfoReussie') // <-- APPEL SANS PRÉFIXE
          .addItem('Transformation Locale Manquée', 'addScoreLocaleTransfoManquee') // <-- APPEL SANS PRÉFIXE
          .addItem('Pénalité Locale Réussie (3 pts)', 'addScoreLocalePenaliteReussie') // <-- APPEL SANS PRÉFIXE
          .addItem('Pénalité Locale Manquée', 'addScoreLocalePenaliteManquee') // <-- APPEL SANS PRÉFIXE
          .addItem('Drop Locale (3 pts)', 'addScoreLocaleDrop') // <-- APPEL SANS PRÉFIXE
          .addSeparator()
          .addItem('Essai Visiteur (5 pts)', 'addScoreVisiteurEssai') // <-- APPEL SANS PRÉFIXE
          .addItem('Transformation Visiteur Réussie (2 pts)', 'addScoreVisiteurTransfoReussie') // <-- APPEL SANS PRÉFIXE
          .addItem('Transformation Visiteur Manquée', 'addScoreVisiteurTransfoManquee') // <-- APPEL SANS PRÉFIXE
          .addItem('Pénalité Visiteur Réussie (3 pts)', 'addScoreVisiteurPenaliteReussie') // <-- APPEL SANS PRÉFIXE
          .addItem('Pénalité Visiteur Manquée', 'addScoreVisiteurPenaliteManquee') // <-- APPEL SANS PRÉFIXE
          .addItem('Drop Visiteur (3 pts)', 'addScoreVisiteurDrop')) // <-- APPEL SANS PRÉFIXE
      .addSeparator()
      .addSubMenu(ui.createMenu('Sanctions')
          .addItem('Carton Jaune...', 'recordCartonJaunePrompt') // <-- APPEL SANS PRÉFIXE
          .addItem('Carton Rouge...', 'recordCartonRougePrompt')) // <-- APPEL SANS PRÉFIXE
      .addSeparator()
      .addItem('Annuler dernier événement (attention!)', 'deleteLastEvent') // <-- APPEL SANS PRÉFIXE
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
  const timeState = TimeManager.getMatchTimeState(); // TimeManager est un objet global, donc préfixe ok ici
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
  const timeState = TimeManager.getMatchTimeState(); // TimeManager est un objet global, donc préfixe ok ici
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

