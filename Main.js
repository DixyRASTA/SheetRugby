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
      .addItem('Ouvrir Tableau de Bord', 'ouvrirTableauDeBord') // Appel direct car dans Main.gs
      .addSeparator()
      .addSubMenu(ui.createMenu('Phases de Match')
          .addItem('Initialiser Nouveau Match', 'initialiserFeuilleEtProprietes') // Appel sans préfixe
          .addItem('Coup d\'envoi 1ère MT', 'debutPremiereMiTemps') // Appel sans préfixe
          .addItem('Fin 1ère MT', 'finPremiereMiTemps') // Appel sans préfixe
          .addItem('Coup d\'envoi 2ème MT', 'debutDeuxiemeMiTemps') // Appel sans préfixe
          .addItem('Arrêter Jeu (Pause)', 'arretJeu') // Appel sans préfixe
          .addItem('Reprendre Jeu', 'reprendreJeu') // Appel sans préfixe
          .addItem('Fin de Match', 'finDeMatch')) // Appel sans préfixe
      .addSeparator()
      .addSubMenu(ui.createMenu('Scores')
          .addItem('Essai Locale (5 pts)', 'addScoreLocaleEssai') // Appel sans préfixe
          .addItem('Transformation Locale Réussie (2 pts)', 'addScoreLocaleTransfoReussie') // Appel sans préfixe
          .addItem('Transformation Locale Manquée', 'addScoreLocaleTransfoManquee') // Appel sans préfixe
          .addItem('Pénalité Locale Réussie (3 pts)', 'addScoreLocalePenaliteReussie') // Appel sans préfixe
          .addItem('Pénalité Locale Manquée', 'addScoreLocalePenaliteManquee') // Appel sans préfixe
          .addItem('Drop Locale (3 pts)', 'addScoreLocaleDrop') // Appel sans préfixe
          .addSeparator()
          .addItem('Essai Visiteur (5 pts)', 'addScoreVisiteurEssai') // Appel sans préfixe
          .addItem('Transformation Visiteur Réussie (2 pts)', 'addScoreVisiteurTransfoReussie') // Appel sans préfixe
          .addItem('Transformation Visiteur Manquée', 'addScoreVisiteurTransfoManquee') // Appel sans préfixe
          .addItem('Pénalité Visiteur Réussie (3 pts)', 'addScoreVisiteurPenaliteReussie') // Appel sans préfixe
          .addItem('Pénalité Visiteur Manquée', 'addScoreVisiteurPenaliteManquee') // Appel sans préfixe
          .addItem('Drop Visiteur (3 pts)', 'addScoreVisiteurDrop')) // Appel sans préfixe
      .addSeparator()
      .addSubMenu(ui.createMenu('Sanctions')
          .addItem('Carton Jaune...', 'recordCartonJaunePrompt') // Appel sans préfixe
          .addItem('Carton Rouge...', 'recordCartonRougePrompt')) // Appel sans préfixe
      .addSeparator()
      .addItem('Annuler dernier événement (attention!)', 'deleteLastEvent') // Appel sans préfixe
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
 * La fonction qui met à jour les données que la sidebar va afficher.
 * Elle ne manipule PAS l'interface utilisateur directement (SpreadsheetApp.getUi().getSidebar()...).
 * Elle est appelée par le déclencheur temporel, mais son but est de s'assurer que les données sont à jour
 * pour le prochain appel de getSidebarContent() depuis le client (Sidebar.html).
 */
function updateSidebar() {
  // Cette fonction est appelée pour s'assurer que les propriétés du timer sont rafraîchies.
  // Elle ne manipule plus l'UI directement pour éviter les erreurs si la sidebar n'est pas ouverte.
  getMatchTimeState(); // Cela rafraîchit les propriétés du timer.
}

/**
 * Fonction appelée par le client (dans la sidebar) pour récupérer le contenu HTML mis à jour.
 * C'est le lien entre le JS de la sidebar et les fonctions Apps Script côté serveur.
 */
function getSidebarContent() {
  const timeState = getMatchTimeState(); // Appel sans préfixe
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