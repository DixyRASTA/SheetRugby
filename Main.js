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
          .addItem('Reprendre Jeu', 'repriseJeu')
          .addItem('Fin de Match', 'finDeMatch'))
      .addSeparator()
      .addSubMenu(ui.createMenu('Actions de Match') // Renomme le sous-menu existant
          .addItem('Essai Locale (5 pts)', 'addScoreLocaleEssai')
          .addItem('Transformation Locale (2 pts)', 'addScoreLocaleTransfo')
          .addItem('Pénalité Locale (3 pts)', 'addScoreLocalePenalite')
          .addItem('Drop Locale (3 pts)', 'addScoreLocaleDrop')
          .addSeparator()
          .addItem('Essai Visiteur (5 pts)', 'addScoreVisiteurEssai')
          .addItem('Transformation Visiteur (2 pts)', 'addScoreVisiteurTransfo')
          .addItem('Pénalité Visiteur (3 pts)', 'addScoreVisiteurPenalite')
          .addItem('Drop Visiteur (3 pts)', 'addScoreVisiteurDrop'))
      .addSeparator()
      .addSubMenu(ui.createMenu('Sanctions') // <-- NOUVEAU SOUS-MENU SANCTIONS
          .addItem('Carton Jaune...', 'recordCartonJaunePrompt')
          .addItem('Carton Rouge...', 'recordCartonRougePrompt'))
          // Tu pourras ajouter recordPenaliteSifflee ici plus tard si besoin
      .addSeparator()
      .addItem('Annuler dernier événement (attention!)', 'deleteLastEvent')
      .addToUi();
}


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

/**
 * Affiche un menu personnalisé pour les actions de match (scores, cartons, remplacements).
 * Cette fonction est appelée par showCustomMenu() ou directement par les menus.
 */
function showCustomMenu() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt(
    'Menu Actions',
    'Sélectionnez une action de jeu :',
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() === ui.Button.OK) {
    const action = result.getResponseText().toLowerCase();
    switch (action) {
      // ... (autres cas existants comme Essai Local) ...

      // --- NOUVEAUX CAS POUR LA TRANSFORMATION ---
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

      // --- NOUVEAUX CAS POUR LES PÉNALITÉS ---
      case 'penalite locale reussie':
        ScoreManager.addScoreLocalePenaliteReussie();
        break;
      case 'penalite locale manquee':
        ScoreManager.addScoreLocalePenaliteManquee();
        break;
      case 'penalite visiteur reussie':
        ScoreManager.addScoreVisiteurPenaliteReussie(); // Tu devras créer cette fonction
        break;
      case 'penalite visiteur manquee':
        ScoreManager.addScoreVisiteurPenaliteManquee(); // Tu devras créer cette fonction
        break;

      // --- NOUVEAUX CAS POUR LES DROPS ---
      case 'drop locale': // On considère qu'un drop est toujours réussi par défaut s'il est enregistré
        ScoreManager.addScoreLocaleDrop();
        break;
      case 'drop visiteur':
        ScoreManager.addScoreVisiteurDrop(); // Tu devras créer cette fonction
        break;

      default:
        ui.alert('Action Inconnue', 'L\'action "' + action + '" n\'est pas reconnue.', ui.ButtonSet.OK);
        break;
    }
  }
  updateSidebar(); // Assurez-vous que la sidebar est mise à jour après l'action
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