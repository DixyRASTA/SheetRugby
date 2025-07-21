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
//function promptForKickOffTeam() {
//  const ui = SpreadsheetApp.getUi();
//  const response = ui.alert(
//    'Coup d\'envoi',
//    'Quelle équipe donne le coup d\'envoi ?',
//    ui.ButtonSet.YES_NO_CANCEL // YES pour Locale, NO pour Visiteur
//  );
//  if (response === ui.Button.YES) {
//    return 'Locale';
//  } else if (response === ui.Button.NO) {
//   return 'Visiteur';
//  }
//  return null; // Annulé
//}

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
  // Cette fonction peut être vide si son seul but était de "rafraîchir" visuellement la sidebar.
  // Puisque la sidebar se rafraîchit via google.script.run.getSidebarContent() toutes les X secondes,
  // updateSidebar() n'a plus de rôle actif de "push" l'UI.
  // Son existence est utile si d'autres fonctions ont besoin de la "déclencher" pour mettre à jour les propriétés
  // avant que la sidebar ne fasse son prochain "pull".
  // Pour éviter le TypeError, on s'assure qu'elle ne touche plus à l'UI directement.

  // Si tu as des logs ou des traitements en arrière-plan ici, tu peux les laisser.
  // Pour l'instant, la ligne qui posait problème a été retirée.
  // La logique de récupération des données reste pertinente si d'autres fonctions l'appellent pour s'assurer
  // que les propriétés sont correctement mises à jour en vue du prochain 'pull' de la sidebar.
  
  // Par exemple, si tu veux que updateSidebar() enregistre l'état du timer dans les propriétés
  // indépendamment du rafraîchissement visuel de la sidebar, tu laisses la logique de calcul.
  // Mais la partie 'SpreadsheetApp.getUi().getSidebar()...' est celle qui doit être supprimée.

  // Si initialiserFeuilleEtProprietes() appelle updateSidebar(), et que updateSidebar()
  // n'a plus de logique de rafraichissement direct de l'UI (ce qui est le cas ici),
  // l'appel à updateSidebar() n'est plus la cause directe de l'erreur.
  // L'erreur venait de l'absence de la sidebar active quand getSidebar() était appelée.

  // Conclusion: L'erreur venait de tentatives de manipulation de l'UI de la sidebar dans updateSidebar()
  // alors qu'elle n'était pas nécessairement affichée. getSidebarContent() est la bonne fonction pour cela.
  // Donc, le contenu original de updateSidebar, AVANT les lignes .setTitle et .setContent,
  // doit être conservé si elles ont une utilité (ex: écriture dans les propriétés).
  // Mais la partie problématique est supprimée.

  // Mettons une version qui ne fait rien si la sidebar n'est pas ouverte,
  // ou qui fait juste le nécessaire pour que getSidebarContent ait les bonnes données.

  // La version la plus sûre pour updateSidebar() (pour éviter l'erreur) est :
  // Elle ne doit pas appeler getSidebar() directement.
  // Elle doit juste s'assurer que les données nécessaires sont prêtes pour getSidebarContent().
  // Donc, si elle modifie des propriétés, c'est utile. Sinon, elle peut être vide.
  // La logique de TimeManager.getMatchTimeState() est essentielle, donc on la garde.
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