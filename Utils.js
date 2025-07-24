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
