/**
 * @file Fonctions utilitaires diverses pour le projet RugbySheet.
 */

/**
 * Formate un nombre de millisecondes en un format MM:SS.
 *
 * @param {number} milliseconds Le temps en millisecondes.
 * @returns {string} Le temps formaté en "MM:SS".
 */
function formatMillisecondsToHMS(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Utilise String.padStart pour s'assurer que les minutes et les secondes ont toujours deux chiffres
  // même si les minutes dépassent 99.
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  return `${formattedMinutes}:${formattedSeconds}`;
}