/**
 * Enregistre un événement dans la feuille "Saisie".
 * @param {Date} timestamp L'heure exacte de l'événement.
 * @param {string} gameTime Le temps de jeu formaté (HH:mm:ss).
 * @param {string} teamName Le nom de l'équipe concernée (Ex: "XV du Poireau", "Stade Toulousain", ou vide si non applicable).
 * @param {string} action Le type d'action (Ex: "Essai", "Coup d'envoi", "Carton Jaune").
 * @param {string} player Le nom du joueur concerné (vide si non applicable).
 * @param {number} finalScoreLocal Le score de l'équipe locale APRÈS l'événement.
 * @param {number} finalScoreVisitor Le score de l'équipe visiteur APRÈS l'événement.
 * @param {string} remark Une remarque ou un détail supplémentaire sur l'événement.
 */
function recordEvent(timestamp, gameTime, teamName, action, player, finalScoreLocal, finalScoreVisitor, remark) {
  const feuilleSaisie = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
  if (!feuilleSaisie) {
    Logger.log("Erreur: La feuille 'Saisie' n'a pas été trouvée.");
    SpreadsheetApp.getUi().alert("Erreur", "La feuille 'Saisie' est introuvable. Veuillez vérifier son nom.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // Le paramètre 'teamName' contient déjà le nom réel de l'équipe.
  // Plus besoin de variable intermédiaire ou de conversion ici.
  
  // Formater l'heure de l'événement pour la colonne A
  const formattedTimestamp = Utilities.formatDate(timestamp, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "HH:mm:ss");
  
  const rowData = [
    formattedTimestamp, // A : Heure de l'événement (réelle)
    gameTime,           // B : Temps de jeu (chrono)
    teamName,           // C : Nom de l'équipe (UTILISE DIRECTEMENT LE PARAMÈTRE teamName)
    action,             // D : Type d'action
    player,             // E : Joueur concerné
    finalScoreLocal,    // F : Score Local final
    finalScoreVisitor,  // G : Score Visiteur final
    remark              // H : Remarque
  ];

  feuilleSaisie.appendRow(rowData);
  Logger.log(`Événement enregistré: ${action} pour ${teamName} - ${gameTime}`);

  // Mettre à jour la sidebar après l'enregistrement
  updateSidebar();
}

/**
 * Récupère les N derniers événements enregistrés pour affichage (par exemple, dans la sidebar).
 * @param {number} count Le nombre d'événements à récupérer.
 * @returns {Array<Object>} Un tableau d'objets représentant les événements.
 */

function getLatestEvents(count = 5) {
  const feuilleSaisie = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
  const derniersEvenements = [];
  
  if (!feuilleSaisie || feuilleSaisie.getLastRow() < 3) { 
    return derniersEvenements;
  }

  const lastRow = feuilleSaisie.getLastRow();
  const dataStartRow = 3;
  const numRowsAvailable = lastRow - dataStartRow + 1;

  if (numRowsAvailable > 0) {
    const numRowsToFetch = Math.min(count, numRowsAvailable); 
    const eventDataRange = feuilleSaisie.getRange(lastRow - numRowsToFetch + 1, 1, numRowsToFetch, 8); 
    
    // NOUVEAU : Utiliser getDisplayValues() pour obtenir les valeurs telles qu'affichées (formatées)
    const eventData = eventDataRange.getDisplayValues(); 

    eventData.reverse().forEach(row => { 
        derniersEvenements.push({
            heure_capture: row[0], // row[0] devrait maintenant être une chaîne "HH:mm:ss"
            temps_formatte: row[1], 
            equipe: row[2], 
            action: row[3], 
            joueur: row[4], 
            scoreLocal: row[5], // Attention: getDisplayValues() renvoie des chaînes pour les nombres aussi
            scoreVisiteur: row[6], // Il faudra les parseInt() si on les utilise comme des nombres ailleurs
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
