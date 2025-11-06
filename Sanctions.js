/**
 * @file Gère la logique des sanctions (cartons).
 * VERSION SIMPLIFIÉE avec interface HTML unique pour tous les cartons.
 */

/**
 * Ouvre le dialogue HTML unique pour enregistrer un carton
 */


function recordCarton() {
  if (!isScoreAllowedForPhase()) {
    return;
  }
  
  // Créer le template HTML
  const template = HtmlService.createTemplateFromFile('CartonDialog');
  
  // Passer les noms d'équipes au template
  template.localTeamName = getLocalTeamName();
  template.visitorTeamName = getVisitorTeamName();
  
  // Évaluer et afficher le dialogue
  const html = template.evaluate()
    .setWidth(500)
    .setHeight(520);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Enregistrer un Carton');
}

/**
 * Traite les données du formulaire de carton
 * @param {Object} data Les données du formulaire {carton, equipe, joueur}
 */
function processCartonFromDialog(data) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  
  // Récupérer le temps du carton
  const matchTimeState = getMatchTimeState();
  const timeOfEvent = matchTimeState.tempsDeJeuMs;
  
  // Déterminer l'équipe
  const localTeamName = getLocalTeamName();
  const visitorTeamName = getVisitorTeamName();
  const penalizedTeam = data.equipe === '1' ? localTeamName : visitorTeamName;
  
  // Récupérer le nom du joueur
  let joueurName = '';
  if (data.joueur && data.joueur !== '') {
    joueurName = getPlayerNameByNumber(data.joueur, penalizedTeam);
    if (!joueurName) {
      joueurName = `Joueur N°${data.joueur}`;
    }
  }
  
  // Créer la remarque
  const finalRemark = joueurName ? 
    `${data.carton} pour ${penalizedTeam} (${joueurName})` : 
    `${data.carton} pour ${penalizedTeam}`;
  
  // Récupérer les scores actuels
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);
  
  // Enregistrer le carton
  recordEvent(
    new Date(),
    formatMillisecondsToHMS(timeOfEvent),
    penalizedTeam,
    data.carton,
    joueurName,
    currentScoreLocal,
    currentScoreVisiteur,
    finalRemark
  );
  
  scriptProperties.setProperty('alertMessage', '');
  ouvrirTableauDeBord();
  
  // Message de confirmation
  const cartonEmoji = {
    'Carton Blanc': '⬜',
    'Carton Jaune': '🟨',
    'Carton Rouge': '🟥',
    'Carton Bleu': '🟦'
  };
  
  ui.alert(
    data.carton, 
    `${cartonEmoji[data.carton]} ${data.carton} enregistré pour ${penalizedTeam}${joueurName ? '\nJoueur: ' + joueurName : ''}`, 
    ui.ButtonSet.OK
  );
}

/**
 * Vérifie si le jeu est dans une phase active pour permettre des actions de score/sanction.
 * @returns {boolean} True si le jeu est actif (1ère ou 2ème mi-temps), false sinon.
 */
function isGameActive() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentPhase = scriptProperties.getProperty('currentMatchPhase');
  return currentPhase === 'premiere_mi_temps' || currentPhase === 'deuxieme_mi_temps';
}