/**
 * @file Gère l'enregistrement et la récupération des événements du match sur la feuille "Saisie".
 */

/**
 * Enregistre un événement dans la feuille "Saisie".
 * @param {Date} timestamp L'heure exacte de l'événement.
 * @param {string} gameTime Le temps de jeu formaté (HH:mm:ss).
 * @param {string} team L'équipe concernée (Locale, Visiteur, ou vide si non applicable).
 * @param {string} action Le type d'action (Ex: "Essai", "Coup d'envoi", "Carton Jaune").
 * @param {string} player Le nom du joueur concerné (vide si non applicable).
 * @param {number} scoreLocal Le score de l'équipe locale après l'événement.
 * @param {number} scoreVisitor Le score de l'équipe visiteur après l'événement.
 * @param {string} remark Une remarque ou un détail supplémentaire sur l'événement.
 */
function recordEvent(timestamp, gameTime, team, action, player, scoreLocal, scoreVisitor, remark) {
  const feuilleSaisie = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
  if (!feuilleSaisie) {
    Logger.log("Erreur: La feuille 'Saisie' n'a pas été trouvée.");
    SpreadsheetApp.getUi().alert("Erreur", "La feuille 'Saisie' est introuvable. Veuillez vérifier son nom.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // Obtenir les scores actuels pour s'assurer qu'ils sont bien enregistrés
  // (même si les paramètres sont passés, c'est une bonne pratique de les récupérer au dernier moment)
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentScoreLocal = parseInt(scriptProperties.getProperty('currentScoreLocal') || '0', 10);
  const currentScoreVisiteur = parseInt(scriptProperties.getProperty('currentScoreVisiteur') || '0', 10);

  // Formater l'heure de l'événement pour la colonne A
  const formattedTimestamp = Utilities.formatDate(timestamp, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "HH:mm:ss");
  
  // La ligne à ajouter :
  // A2 Heure | B2 Temps de jeu | C2 Equipe | D2 Action | E2 Joueurs | F2 Score Loc. | G2 Score Visit. | H2 Remarque
  const rowData = [
    formattedTimestamp, // A
    gameTime,           // B
    team,               // C
    action,             // D
    player,             // E
    scoreLocal !== undefined ? scoreLocal : currentScoreLocal, // F (Utiliser le paramètre ou le score actuel)
    scoreVisitor !== undefined ? scoreVisitor : currentScoreVisiteur, // G (Utiliser le paramètre ou le score actuel)
    remark              // H
  ];

  feuilleSaisie.appendRow(rowData);
  Logger.log(`Événement enregistré: ${action} - ${gameTime}`);
}

/**
 * Récupère les N derniers événements enregistrés pour affichage (par exemple, dans la sidebar).
 * @param {number} count Le nombre d'événements à récupérer.
 * @returns {Array<Object>} Un tableau d'objets représentant les événements.
 */
function getLatestEvents(count = 5) {
  const feuilleSaisie = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
  const derniersEvenements = [];
  
  if (!feuilleSaisie || feuilleSaisie.getLastRow() < 3) { // Moins de 3 lignes = juste les en-têtes ou vide
    return derniersEvenements;
  }

  const lastRow = feuilleSaisie.getLastRow();
  const dataStartRow = 3; // Les données commencent à la ligne 3 (après les deux lignes d'en-tête)
  const numRowsAvailable = lastRow - dataStartRow + 1;

  if (numRowsAvailable > 0) {
    const numRowsToFetch = Math.min(count, numRowsAvailable); 
    // Récupérer les données depuis la dernière ligne vers le haut
    const eventDataRange = feuilleSaisie.getRange(lastRow - numRowsToFetch + 1, 1, numRowsToFetch, 8); 
    const eventData = eventDataRange.getValues();

    // Inverser pour avoir le plus récent en premier dans la liste affichée
    eventData.reverse().forEach(row => { 
        derniersEvenements.push({
            heure_capture: Utilities.formatDate(new Date(row[0]), SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "HH:mm:ss"), // Re-formatter si besoin ou prendre tel quel
            temps_formatte: row[1], // Déjà formaté par recordEvent
            equipe: row[2], 
            action: row[3], 
            joueur: row[4], 
            scoreLocal: row[5],
            scoreVisiteur: row[6],
            remarque: row[7]
        });
    });
  }
  return derniersEvenements;
}

/**
 * Supprime la dernière ligne d'événement enregistrée dans la feuille "Saisie".
 * @returns {boolean} True si un événement a été supprimé, false sinon.
 */
function deleteLastEvent() {
  const ui = SpreadsheetApp.getUi();
  const feuilleSaisie = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
  
  if (!feuilleSaisie) {
    ui.alert("Erreur", "La feuille 'Saisie' est introuvable. Impossible d'annuler le dernier événement.", ui.ButtonSet.OK);
    return false;
  }

  const lastRow = feuilleSaisie.getLastRow();
  const dataStartRow = 3; // Les données commencent à la ligne 3

  if (lastRow >= dataStartRow) {
    const response = ui.alert(
      'Confirmation',
      'Voulez-vous vraiment annuler le dernier événement enregistré ?',
      ui.ButtonSet.YES_NO
    );
    if (response == ui.Button.YES) {
      feuilleSaisie.deleteRow(lastRow);
      Logger.log("Dernier événement supprimé de la feuille 'Saisie'.");
      ui.alert("Succès", "Le dernier événement a été annulé.", ui.ButtonSet.OK);
      
      // OPTIONNEL: Mettre à jour les scores dans les propriétés si le dernier événement annulé était un score.
      // Cela demande une logique plus complexe pour "défaire" le score.
      // Pour l'instant, nous ne le ferons pas, l'utilisateur devra ajuster manuellement si besoin.
      
      updateSidebar(); // Mettre à jour la sidebar après suppression
      return true;
    } else {
      Logger.log("Annulation du dernier événement annulée par l'utilisateur.");
      return false;
    }
  } else {
    ui.alert("Information", "Il n'y a pas d'événements à annuler dans la feuille 'Saisie'.", ui.ButtonSet.OK);
    return false;
  }
}
