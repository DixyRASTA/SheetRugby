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
      .addItem('Actions de Match...', 'showCustomMenu') // <-- NOUVEAU : pour ouvrir le menu d'actions détaillé
      .addSeparator()
      .addItem('Annuler dernier événement (attention!)', 'deleteLastEvent') // Fonction de Evenements.gs
      .addToUi();

  // Assure la création du déclencheur au premier chargement si le menu est déjà affiché.
  // Cela n'affichera pas la sidebar immédiatement, il faut cliquer sur "Ouvrir Tableau de Bord".
  // createTimeDrivenTriggers(); // On ne l'appelle plus ici directement pour éviter la sidebar au démarrage de chaque feuille
}

// NOUVELLE FONCTION à ajouter dans Main.gs (après onOpen(), par exemple)

/**
 * Affiche un menu personnalisé pour les actions de match (scores, cartons, remplacements).
 * Chaque élément du menu appellera une fonction correspondante dans ScoreManager.gs.
 */
function showCustomMenu() {
  const ui = SpreadsheetApp.getUi();
  const teamPromptResult = ui.prompt(
      'Action de Match',
      'Choisissez l\'équipe concernée (Locale ou Visiteur) ou laissez vide pour une action neutre :',
      ui.ButtonSet.OK_CANCEL
  );

  if (teamPromptResult.getSelectedButton() === ui.Button.CANCEL) {
    return; // L'utilisateur a annulé
  }

  const team = teamPromptResult.getResponseText().trim(); // 'Locale', 'Visiteur', ou vide

  const actionMenu = ui.createMenu('Actions de Match');

  // Sous-menu des scores
  actionMenu.addSubMenu(ui.createMenu('Score')
      .addItem('Essai Locale (5 pts)', 'addScoreLocaleEssai')
      .addItem('Transformation Locale (2 pts)', 'addScoreLocaleTransfo')
      .addItem('Pénalité Locale (3 pts)', 'addScoreLocalePenalite')
      .addItem('Drop Locale (3 pts)', 'addScoreLocaleDrop')
      .addSeparator()
      .addItem('Essai Visiteur (5 pts)', 'addScoreVisiteurEssai')
      .addItem('Transformation Visiteur (2 pts)', 'addScoreVisiteurTransfo')
      .addItem('Pénalité Visiteur (3 pts)', 'addScoreVisiteurPenalite')
      .addItem('Drop Visiteur (3 pts)', 'addScoreVisiteurDrop')
  );

  // Sous-menu des cartons
  actionMenu.addSubMenu(ui.createMenu('Cartons')
      .addItem('Carton Jaune', 'handleCardPrompt')
      .addItem('Carton Rouge', 'handleCardPrompt')
  );

  // Sous-menu des remplacements
  actionMenu.addItem('Remplacement...', 'handleSubstitutionPrompt');
  
  actionMenu.addToUi(); // Affiche le nouveau menu flottant
}

// NOUVELLES FONCTIONS D'ASSISTANT pour les prompts d'utilisateur (à ajouter dans Main.gs)
// Ces fonctions recueillent les informations via des boîtes de dialogue et appellent ScoreManager.gs

function addScoreLocaleEssai() { addScore('Locale', 'Essai', 5, promptForPlayer()); }
function addScoreLocaleTransfo() { addScore('Locale', 'Transformation', 2, promptForPlayer()); }
function addScoreLocalePenalite() { addScore('Locale', 'Pénalité', 3, promptForPlayer()); }
function addScoreLocaleDrop() { addScore('Locale', 'Drop', 3, promptForPlayer()); }

function addScoreVisiteurEssai() { addScore('Visiteur', 'Essai', 5, promptForPlayer()); }
function addScoreVisiteurTransfo() { addScore('Visiteur', 'Transformation', 2, promptForPlayer()); }
function addScoreVisiteurPenalite() { addScore('Visiteur', 'Pénalité', 3, promptForPlayer()); }
function addScoreVisiteurDrop() { addScore('Visiteur', 'Drop', 3, promptForPlayer()); }

function handleCardPrompt() {
  const ui = SpreadsheetApp.getUi();
  const cardTypeResult = ui.prompt(
      'Type de Carton',
      'Entrez le type de carton (Jaune ou Rouge) :',
      ui.ButtonSet.OK_CANCEL
  );
  if (cardTypeResult.getSelectedButton() === ui.Button.CANCEL || !cardTypeResult.getResponseText().trim()) return;
  const cardType = cardTypeResult.getResponseText().trim();

  const player = promptForPlayer();
  if (!player) return; // L'utilisateur a annulé

  const teamPromptResult = ui.prompt(
      'Équipe du joueur',
      'Équipe (Locale ou Visiteur) du joueur qui reçoit le carton :',
      ui.ButtonSet.OK_CANCEL
  );
  if (teamPromptResult.getSelectedButton() === ui.Button.CANCEL || !teamPromptResult.getResponseText().trim()) return;
  const team = teamPromptResult.getResponseText().trim();

  handleCard(team, `Carton ${cardType}`, player);
}

function handleSubstitutionPrompt() {
  const ui = SpreadsheetApp.getUi();
  const playerOut = ui.prompt('Remplacement', 'Nom du joueur sortant :', ui.ButtonSet.OK_CANCEL);
  if (playerOut.getSelectedButton() === ui.Button.CANCEL || !playerOut.getResponseText().trim()) return;

  const playerIn = ui.prompt('Remplacement', 'Nom du joueur entrant :', ui.ButtonSet.OK_CANCEL);
  if (playerIn.getSelectedButton() === ui.Button.CANCEL || !playerIn.getResponseText().trim()) return;

  const teamPromptResult = ui.prompt(
      'Équipe du remplacement',
      'Équipe (Locale ou Visiteur) :',
      ui.ButtonSet.OK_CANCEL
  );
  if (teamPromptResult.getSelectedButton() === ui.Button.CANCEL || !teamPromptResult.getResponseText().trim()) return;
  const team = teamPromptResult.getResponseText().trim();

  handleSubstitution(team, playerOut.getResponseText().trim(), playerIn.getResponseText().trim());
}

// Fonction utilitaire pour demander le nom du joueur
function promptForPlayer() {
  const ui = SpreadsheetApp.getUi();
  const playerResult = ui.prompt(
      'Nom du Joueur',
      'Entrez le nom du joueur (laissez vide si non applicable) :',
      ui.ButtonSet.OK_CANCEL
  );
  if (playerResult.getSelectedButton() === ui.Button.CANCEL) {
    return ''; // L'utilisateur a annulé
  }
  return playerResult.getResponseText().trim();
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