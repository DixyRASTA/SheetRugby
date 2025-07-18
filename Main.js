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
          .addItem('Initialiser Nouveau Match', 'initialiserFeuilleEtProprietes') // <-- CORRIGÉ
          .addItem('Coup d\'envoi 1ère MT', 'debutPremiereMiTemps') // <-- CORRIGÉ
          .addItem('Fin 1ère MT', 'finPremiereMiTemps') // <-- CORRIGÉ
          .addItem('Coup d\'envoi 2ème MT', 'debutDeuxiemeMiTemps') // <-- CORRIGÉ
          .addItem('Arrêter Jeu (Pause)', 'arretJeu') // <-- CORRIGÉ
          .addItem('Reprendre Jeu', 'repriseJeu') // <-- CORRIGÉ
          .addItem('Fin de Match', 'finDeMatch')) // <-- CORRIGÉ
      .addSeparator()
      // Un seul item pour toutes les actions de score/sanction via showCustomMenu
      .addItem('Ajouter Action (Score/Carton/Drop...)', 'showCustomMenu')
      .addSeparator()
      .addItem('Annuler dernier événement (attention!)', 'Evenements.deleteLastEvent') // Déjà correct
      .addToUi();
}

// Assurez-vous que la fonction showCustomMenu() est bien définie dans Main.gs
// et qu'elle contient tous les 'case' pour les scores et les cartons,
// appelant les fonctions de ScoreManager.gs et Sanctions.gs comme discuté précédemment.
// ... (le reste de Main.gs, y compris showCustomMenu, promptForKickOffTeam, updateSidebar, getSidebarContent) ...

// Assurez-vous que la fonction showCustomMenu() est bien définie dans Main.gs
// et qu'elle contient tous les 'case' pour les scores et les cartons,
// appelant les fonctions de ScoreManager.gs (ex: ScoreManager.addScoreLocaleEssai())
// et Sanctions.gs (ex: Sanctions.recordCartonJaunePrompt()).
// ... (le reste de Main.gs, y compris showCustomMenu, promptForKickOffTeam, updateSidebar, getSidebarContent) ...


/**
 * Fonction utilitaire pour demander quelle équipe donne le coup d'envoi.
 * @returns {string|null} 'Locale', 'Visiteur' ou null si annulé.
 */
function promptForKickOffTeam() {
  const ui = SpreadsheetApp.getUi();
  const localTeam = getLocalTeamName();
  const visitorTeam = getVisitorTeamName();

  const teamChoice = ui.alert(
      'Coup d\'envoi',
      `Quelle équipe donne le coup d'envoi ?\n\nOui = ${localTeam}\nNon = ${visitorTeam}`,
      ui.ButtonSet.YES_NO_CANCEL
  );

  if (teamChoice === ui.Button.YES) {
    return 'Locale';
  } else if (teamChoice === ui.Button.NO) {
    return 'Visiteur';
  } else {
    return null; // Annulé
  }
}

// Dans Main.gs

/**
 * Affiche un menu personnalisé pour les actions de match (scores, cartons).
 * Cette fonction est appelée par le menu "Actions de Match...".
 */
function showCustomMenu() {
  const ui = SpreadsheetApp.getUi();
  Logger.log("showCustomMenu: Fonction appelée."); // NOUVEAU LOG

  const result = ui.prompt(
    'Menu Actions',
    'Sélectionnez une action de jeu (ex: essai locale, transfo locale reussie, carton jaune) :', // Ajout d'exemples pour guider l'utilisateur
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() === ui.Button.OK) {
    const action = result.getResponseText().toLowerCase().trim(); // Ajout de .trim() pour enlever les espaces accidentels

    Logger.log("showCustomMenu: Action saisie par l'utilisateur: " + action); // NOUVEAU LOG

    switch (action) {
      // --- CAS POUR LES ESSAIS ---
      case 'essai locale':
        ScoreManager.addScoreLocaleEssai();
        break;
      case 'essai visiteur':
        ScoreManager.addScoreVisiteurEssai();
        break;

      // --- CAS POUR LES TRANSFORMATIONS ---
      case 'transfo locale reussie':
        ScoreManager.addScoreLocaleTransfo(true);
        break;
      case 'transfo locale manquee':
        ScoreManager.addScoreLocaleTransfo(false);
        break;
      case 'transfo visiteur reussie':
        ScoreManager.addScoreVisiteurTransfo(true);
        break;
      case 'transfo visiteur manquee':
        ScoreManager.addScoreVisiteurTransfo(false);
        break;

      // --- CAS POUR LES PÉNALITÉS ---
      case 'penalite locale reussie':
        ScoreManager.addScoreLocalePenaliteReussie();
        break;
      case 'penalite locale manquee':
        ScoreManager.addScoreLocalePenaliteManquee();
        break;
      case 'penalite visiteur reussie':
        ScoreManager.addScoreVisiteurPenaliteReussie();
        break;
      case 'penalite visiteur manquee':
        ScoreManager.addScoreVisiteurPenaliteManquee();
        break;

      // --- CAS POUR LES DROPS ---
      case 'drop locale':
        ScoreManager.addScoreLocaleDrop();
        break;
      case 'drop visiteur':
        ScoreManager.addScoreVisiteurDrop();
        break;

      // --- CAS POUR LES CARTONS (qui appellent Sanctions.gs) ---
      case 'carton jaune': // L'utilisateur tape "carton jaune"
        Sanctions.recordCartonJaunePrompt(); // Appelle la fonction qui gère les prompts pour le carton
        break;
      case 'carton rouge': // L'utilisateur tape "carton rouge"
        Sanctions.recordCartonRougePrompt(); // Appelle la fonction qui gère les prompts pour le carton
        break;

      default:
        Logger.log("showCustomMenu: Action non reconnue: " + action); // NOUVEAU LOG
        ui.alert('Action Inconnue', 'L\'action "' + action + '" n\'est pas reconnue. Veuillez vérifier la saisie.', ui.ButtonSet.OK);
        break;
    }
  }else {
    Logger.log("showCustomMenu: Annulé par l'utilisateur."); // NOUVEAU LOG
  }
  updateSidebar(); // Assurez-vous que la sidebar est mise à jour après l'action
  Logger.log("showCustomMenu: Fin de la fonction."); // NOUVEAU LOG
}

/**
 * Génère et affiche le contenu HTML de la sidebar.
 * Appelle TimeManager pour obtenir l'état du chronomètre.
 * Cette fonction est appelée par le déclencheur temporel et par l'utilisateur.
 */
function updateSidebar() {
  const ui = SpreadsheetApp.getUi();

  const matchTimeState = getMatchTimeState();
  const matchState = {
    isTimerRunning: matchTimeState.isTimerRunning,
    currentMatchPhase: PropertiesService.getScriptProperties().getProperty('currentMatchPhase') || 'non_demarre',
    tempsDeJeuFormatted: matchTimeState.tempsDeJeuFormatted,
    currentLocalScore: PropertiesService.getScriptProperties().getProperty('currentScoreLocal') || '0',
    currentVisitorScore: PropertiesService.getScriptProperties().getProperty('currentScoreVisiteur') || '0',
    nomEquipeLocale: PropertiesService.getScriptProperties().getProperty('nomEquipeLocale') || 'Locale',
    nomEquipeVisiteur: PropertiesService.getScriptProperties().getProperty('nomEquipeVisiteur') || 'Visiteur',
    alertMessage: PropertiesService.getScriptProperties().getProperty('alertMessage') || '',
    derniersEvenements: getLatestEvents() // Appel à la fonction dans Evenements.gs
  };
  
  const htmlContent = HtmlService.createHtmlOutput(
    ` 
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <style>
        /* ... votre CSS existant ... */
      </style>
      <script>
        // Fonction pour demander la mise à jour de la sidebar au serveur
        function requestSidebarUpdate() {
          google.script.run
            .withSuccessHandler(function(html) {
              document.body.innerHTML = html; // Remplace le contenu du body par le nouveau HTML
            })
            .withFailureHandler(function(error) {
              console.error("Erreur lors de la mise à jour de la sidebar :", error.message);
            })
            .getSidebarContent(); // Appel à la nouvelle fonction côté serveur
        }

        // Rafraîchir la sidebar toutes les 1 seconde (ou 1000 ms) pour une fluidité visuelle du chrono
        // Le déclencheur Apps Script "toutes les minutes" est pour la persistance en cas de fermeture/réouverture.
        // Ce setInterval est pour le rafraîchissement temps réel.
        setInterval(requestSidebarUpdate, 1000); 
      </script>
    </head>
    <body>
      <div class="button-container">
        <button class="button" onclick="google.script.run.arretJeu()">Arrêter Jeu</button>
        <button class="button" onclick="google.script.run.repriseJeu()">Reprendre Jeu</button>
        </div>

      </body>
    </html>
    `
  ).setTitle('Tableau de Bord Rugby').setHeight(650); 

  ui.showSidebar(htmlContent);
  Logger.log("Sidebar mise à jour.");
}

// NOUVELLE FONCTION à ajouter dans Main.gs
/**
 * Fonction appelée par le client (dans la sidebar) pour récupérer le contenu HTML mis à jour.
 * Cela permet un rafraîchissement dynamique sans recharger la sidebar entière.
 */
function getSidebarContent() {
  const matchTimeState = getMatchTimeState();
  const matchState = {
    isTimerRunning: matchTimeState.isTimerRunning,
    currentMatchPhase: PropertiesService.getScriptProperties().getProperty('currentMatchPhase') || 'non_demarre',
    tempsDeJeuFormatted: matchTimeState.tempsDeJeuFormatted,
    currentLocalScore: PropertiesService.getScriptProperties().getProperty('currentScoreLocal') || '0',
    currentVisitorScore: PropertiesService.getScriptProperties().getProperty('currentScoreVisiteur') || '0',
    nomEquipeLocale: PropertiesService.getScriptProperties().getProperty('nomEquipeLocale') || 'Locale',
    nomEquipeVisiteur: PropertiesService.getScriptProperties().getProperty('nomEquipeVisiteur') || 'Visiteur',
    alertMessage: PropertiesService.getScriptProperties().getProperty('alertMessage') || '',
    derniersEvenements: getLatestEvents()
  };

  // On renvoie juste le contenu du <body> pour le rafraîchissement partiel
  return `
    <div class="card">
      <h3>Match Info</h3>
      <div class="phase">Phase: ${matchState.currentMatchPhase.replace(/_/g, ' ').toUpperCase()}</div>
      <div class="time">Chrono: ${matchState.tempsDeJeuFormatted}</div>
      <div class="status">Statut Chrono: ${matchState.isTimerRunning ? 'EN COURS' : 'NON DÉMARRÉ'}</div>
    </div>

    <div class="card">
      <h3>Score Actuel</h3>
      <div class="score">${matchState.nomEquipeLocale} ${matchState.currentLocalScore} - ${matchState.currentVisitorScore} ${matchState.nomEquipeVisiteur}</div>
    </div>
    
    ${matchState.alertMessage ? `<div class="alert-message">${matchState.alertMessage}</div>` : ''}
    
    <div class="button-container">
      <button class="button" onclick="google.script.run.initialiserFeuilleEtProprietes()">Initialiser Nouveau Match</button>
      <button class="button" onclick="google.script.run.debutPremiereMiTemps()">Démarrer 1ère Mi-temps</button>
      <button class="button" onclick="google.script.run.finPremiereMiTemps()">Fin 1ère Mi-temps</button>
      <button class="button" onclick="google.script.run.debutDeuxiemeMiTemps()">Démarrer 2ème Mi-temps</button>
      <button class="button" onclick="google.script.run.arretJeu()">Arrêter Jeu</button>
      <button class="button" onclick="google.script.run.repriseJeu()">Reprendre Jeu</button>
      <button class="button" onclick="google.script.run.finDeMatch()">Fin de Match</button>
      <button class="button" onclick="google.script.run.showCustomMenu()">Ouvrir Menu Actions</button>
    </div>

    <div class="card">
      <h3>Derniers Événements</h3>
      <div id="eventHistory">
          ${matchState.derniersEvenements && matchState.derniersEvenements.length > 0 ?
              matchState.derniersEvenements.map(event => `
                  <p class="event-history-item"><strong>${event.temps_formatte}</strong> - ${event.equipe} : ${event.action} ${event.joueur ? `(${event.joueur})` : ''}</p>
              `).join('')
              : '<p class="event-history-item">Aucun événement enregistré.</p>'}
      </div>
    </div>
  `;
}