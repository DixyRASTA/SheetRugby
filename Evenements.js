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
    ouvrirTableauDeBord();
    return;
  }

  const formattedTimestamp = Utilities.formatDate(timestamp, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "HH:mm:ss");
  const rowData = [
    formattedTimestamp, // A : Heure de l'événement (réelle)
    "'" + gameTime,           // B : Temps de jeu (chrono)<-- MODIFICATION ICI : Ajout de l'apostrophe
    teamName,           // C : Nom de l'équipe
    action,             // D : Type d'action
    player,             // E : Joueur concerné
    finalScoreLocal,    // F : Score Local final
    finalScoreVisitor,  // G : Score Visiteur final
    remark              // H : Remarque
  ];

  feuilleSaisie.appendRow(rowData);
  Logger.log(`Événement enregistré: ${action} pour ${teamName} - ${gameTime}`);

  // La mise à jour de l'interface utilisateur est gérée par le setInterval de la sidebar.
  // Plus besoin de `updateSidebar()` ici, car cela causait des clignotements.
  // La logique a été simplifiée pour laisser la sidebar se rafraîchir d'elle-même.
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
 * Supprime la dernière ligne d'événement enregistrée dans la feuille "Saisie"
 * et remet à jour les scores en conséquence.
 * @returns {boolean} True si un événement a été supprimé, false sinon.
 */
function deleteLastEvent() {
  const ui = SpreadsheetApp.getUi();
  const feuilleSaisie = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
  
  if (!feuilleSaisie) {
    Logger.log("Erreur: La feuille 'Saisie' est introuvable. Impossible d'annuler le dernier événement.");
    return false;
  }

  const lastRow = feuilleSaisie.getLastRow();
  const dataStartRow = 3; // Les données commencent à la ligne 3

  if (lastRow >= dataStartRow) {
    // Récupérer les données de la dernière ligne avant suppression
    const lastEventData = feuilleSaisie.getRange(lastRow, 1, 1, 8).getValues()[0];
    const lastEventInfo = {
      heure: lastEventData[0],
      tempsJeu: lastEventData[1],
      equipe: lastEventData[2],
      action: lastEventData[3],
      joueur: lastEventData[4],
      scoreLocal: lastEventData[5],
      scoreVisiteur: lastEventData[6],
      remarque: lastEventData[7]
    };

    const response = ui.alert(
      'Confirmation',
      `Voulez-vous vraiment annuler le dernier événement ?\n\n` +
      `${lastEventInfo.tempsJeu} - ${lastEventInfo.action}` +
      `${lastEventInfo.equipe ? ' (' + lastEventInfo.equipe + ')' : ''}` +
      `${lastEventInfo.joueur ? ' - ' + lastEventInfo.joueur : ''}\n` +
      `Score actuel: ${lastEventInfo.scoreLocal} - ${lastEventInfo.scoreVisiteur}`,
      ui.ButtonSet.YES_NO
    );

    if (response == ui.Button.YES) {
      // Supprimer la ligne
      feuilleSaisie.deleteRow(lastRow);
      Logger.log("Dernier événement supprimé de la feuille 'Saisie'.");

      // Recalculer et mettre à jour les scores
      updateScoresAfterDeletion();
      
      ouvrirTableauDeBord();
      return true;
    } else {
      Logger.log("Annulation du dernier événement annulée par l'utilisateur.");
      return false;
    }
  } else {
    Logger.log("Il n'y a pas d'événements à annuler dans la feuille 'Saisie'.");
    ui.alert("Information", "Il n'y a pas d'événements à annuler.", ui.ButtonSet.OK);
    return false;
  }
}

/**
 * Met à jour les scores dans les propriétés du script après suppression d'un événement.
 * Prend le score de la dernière ligne restante, ou remet à 0-0 s'il n'y a plus d'événements.
 */
function updateScoresAfterDeletion() {
  const feuilleSaisie = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisie");
  const scriptProperties = PropertiesService.getScriptProperties();
  
  if (!feuilleSaisie) {
    Logger.log("Erreur: Impossible de mettre à jour les scores, feuille 'Saisie' introuvable.");
    return;
  }

  const lastRow = feuilleSaisie.getLastRow();
  const dataStartRow = 3;

  let newScoreLocal = '0';
  let newScoreVisiteur = '0';

  // S'il reste des événements, prendre le score de la dernière ligne
  if (lastRow >= dataStartRow) {
    const lastEventData = feuilleSaisie.getRange(lastRow, 6, 1, 2).getValues()[0];
    newScoreLocal = String(lastEventData[0] || '0');
    newScoreVisiteur = String(lastEventData[1] || '0');
  }

  // Mettre à jour les propriétés
  scriptProperties.setProperties({
    'currentScoreLocal': newScoreLocal,
    'currentScoreVisiteur': newScoreVisiteur
  });

  Logger.log(`Scores mis à jour après suppression: ${newScoreLocal} - ${newScoreVisiteur}`);
}

