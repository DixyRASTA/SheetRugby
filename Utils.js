/**
 * @file Fonctions utilitaires diverses pour le projet RugbySheet.
 */

/**
 * Formate un nombre de millisecondes en une chaîne de caractères HH:mm:ss.
 * @param {number} milliseconds Le nombre de millisecondes à formater.
 * @return {string} Le temps formaté (HH:mm:ss).
 */
function formatMillisecondsToHMS(milliseconds) {
  if (typeof milliseconds !== 'number' || isNaN(milliseconds) || milliseconds < 0) {
    return "00:00:00"; 
  }
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formate un nombre de minutes entières en une chaîne de caractères HH:mm:ss.
 * Utilisé pour l'historique des événements qui sont enregistrés en minutes entières.
 * @param {number} minutes Le nombre de minutes entières à formater.
 * @return {string} Le temps formaté (HH:mm:ss).
 */
function formatMinutesToHMS(minutes) {
  if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0) {
    return "00:00:00"; 
  }
  const totalSeconds = minutes * 60; // Convertir les minutes en secondes
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60; // Secondes seront 00 si on travaille avec des minutes entières

  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`; 
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