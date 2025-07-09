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
      .addItem('Ouvrir Tableau de Bord', 'ouvrirTableauDeBord') // Bouton pour ouvrir la sidebar
      .addSeparator()
      .addItem('Initialiser le match', 'initialiserFeuilleEtProprietes') // Réinitialise les données (scores à 0, chrono à 0, phase "non_demarre")
      .addSeparator() 
      .addSubMenu(ui.createMenu('Phases de Match')
          .addItem('Coup d\'envoi 1ère MT', 'debutPremiereMiTemps') // Fonction de Interruption.gs
          .addItem('Fin 1ère MT', 'finPremiereMiTemps') // Fonction de Interruption.gs
          .addItem('Coup d\'envoi 2e MT', 'debutDeuxiemeMiTemps') // Fonction de Interruption.gs
          .addItem('Fin de Match', 'finDeMatch') // Fonction de Interruption.gs
      )
      .addSeparator()
      .addSubMenu(ui.createMenu('Réalisations (points)') // Renommé pour plus de clarté
          .addItem('Essai', 'recordEssai') // Fonction de Actions.gs
          .addItem('Transformation Réussie', 'recordTransformationReussie') // Fonction de Actions.gs
          .addItem('Transformation Manquée', 'recordTransformationManquee') // Fonction de Actions.gs
          .addItem('Drop Réussi', 'recordDropReussi') // Fonction de Actions.gs
          .addItem('Drop Manqué', 'recordDropManque') // Fonction de Actions.gs
          .addItem('Pénalité Réussie', 'recordPenaliteReussie') 
          .addItem('Pénalité Manquée', 'recordPenaliteManquee') 
          .addItem('Essai de Pénalité', 'recordEssaiDePenalite') // Fonction de Sanctions.gs (mais rapporte des points)
      )
      .addSeparator() 
      .addSubMenu(ui.createMenu('Fautes & Sanctions') // Renommé pour plus de clarté
          .addItem('Pénalité Tentée', 'recordPenaliteTentee') // Tentative de pénalité, gestion à suivre (Réussie/Manquée)
          .addItem('Carton Blanc', 'recordCartonBlanc') // Fonction de Sanctions.gs
          .addItem('Carton Jaune', 'recordCartonJaune') // Fonction de Sanctions.gs
          .addItem('Carton Rouge', 'recordCartonRouge') // Fonction de Sanctions.gs
        )
      .addSeparator()
      .addSubMenu(ui.createMenu('Événements Divers') // Renommé pour englober plus de choses
          .addItem('Arrêt du jeu', 'arretJeu') // Fonction d'Interruption.gs
          .addItem('Reprise du jeu', 'repriseJeu') // Fonction d'Interruption.gs
          .addItem('Ajouter un événement manuel', 'ajouterEvenementManuel') // Fonction de Evenements.gs
          .addItem('Annuler dernier événement', 'annulerDernierEvenement') // Fonction de Evenements.gs (deleteLastEvent)
          .addItem('Carton Bleu', 'recordCartonBleu') // Fonction de Evenements.gs ou Sanctions.gs selon la définition finale
        )
      .addToUi();
}

/**
 * Ouvre le tableau de bord (sidebar) du match.
 * Cette fonction est appelée via le menu personnalisé.
 */
function ouvrirTableauDeBord() {
  updateSidebar(); // Appelle la fonction qui génère et affiche la sidebar
  createTimeDrivenTriggers(); // S'assure que le déclencheur de rafraîchissement est créé
}

/**
 * Crée ou met à jour les déclencheurs temporels nécessaires pour le script.
 * Exécute 'updateSidebar' toutes les minutes pour rafraîchir le chronomètre.
 * Ne crée le déclencheur que s'il n'existe pas déjà pour 'updateSidebar'.
 */
 function createTimeDrivenTriggers(){
  const triggers = ScriptApp.getProjectTriggers();
  let triggerExists = false;

  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'updateSidebar') {
      triggerExists = true;
      // Optionnel: Si vous voulez toujours un seul déclencheur et réinitialiser la fréquence
      // ScriptApp.deleteTrigger(trigger); 
      // triggerExists = false; // Permet de recréer le déclencheur avec la nouvelle config
      break; 
    }
  }

  if (!triggerExists) {
    ScriptApp.newTrigger('updateSidebar')
      .timeBased()
      .everyMinutes(1) // Rafraîchissement toutes les 1 minute pour le chrono
      .create();
    Logger.log("Déclencheur temporel pour updateSidebar créé (toutes les minutes).");
  } else {
    Logger.log("Déclencheur pour updateSidebar existe déjà, pas de nouvelle création.");
  }
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