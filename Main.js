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
 {
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

  // Appelle TimeManager pour obtenir l'état du temps de jeu
  const matchTimeState = getMatchTimeState(); // Appel à la fonction dans TimeManager.gs

  // Préparer un objet d'état de match complet (sera enrichi plus tard)
  // Pour l'instant, on se concentre sur le temps
  const matchState = {
    isTimerRunning: matchTimeState.isTimerRunning,
    currentMatchPhase: PropertiesService.getScriptProperties().getProperty('currentMatchPhase') || 'non_demarre',
    tempsDeJeuFormatted: matchTimeState.tempsDeJeuFormatted,
    currentLocalScore: PropertiesService.getScriptProperties().getProperty('currentScoreLocal') || '0',
    currentVisitorScore: PropertiesService.getScriptProperties().getProperty('currentScoreVisiteur') || '0',
    nomEquipeLocale: PropertiesService.getScriptProperties().getProperty('nomEquipeLocale') || 'Locale',
    nomEquipeVisiteur: PropertiesService.getScriptProperties().getProperty('nomEquipeVisiteur') || 'Visiteur',
    alertMessage: PropertiesService.getScriptProperties().getProperty('alertMessage') || '',
    derniersEvenements: [] // Pour l'instant vide, sera géré par Evenements.gs plus tard
  };
  
  const htmlContent = HtmlService.createHtmlOutput(
    ` 
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <style>
        body { font-family: 'Arial', sans-serif; margin: 10px; background-color: #f4f4f4; color: #333; }
        .card { background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 15px; margin-bottom: 10px; }
        h3 { color: #0056b3; margin-top: 0; }
        .score { font-size: 2.2em; font-weight: bold; text-align: center; margin: 10px 0; color: #007bff; }
        .time { font-size: 1.8em; font-weight: bold; text-align: center; color: #28a745; margin: 10px 0; }
        .phase, .status { font-size: 1em; text-align: center; margin-bottom: 5px; color: #555; }
        .button-container { display: flex; flex-direction: column; gap: 8px; margin-top: 15px; }
        .button {
          background-color: #007bff;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1em;
          width: 100%;
          box-sizing: border-box;
        }
        .button:hover { background-color: #0056b3; }
        .alert-message {
            text-align: center;
            margin-top: 10px;
            font-weight: bold;
            color: orange; /* Couleur d'alerte */
        }
        .event-history-item {
            font-size: 0.9em;
            margin-bottom: 3px;
        }
        .event-history-item strong {
            color: #0056b3;
        }
      </style>
    </head>
    <body>
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

      <script>
        // Aucun JavaScript complexe de chrono ici, tout est géré par le serveur
        // Le rafraîchissement se fera par le déclencheur Apps Script.
      </script>
    </body>
    </html>
    `
  ).setTitle('Tableau de Bord Rugby').setHeight(650); 

  ui.showSidebar(htmlContent);
  Logger.log("Sidebar mise à jour.");
}