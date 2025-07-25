// Utils.gs

/**
 * @file Fonctions utilitaires diverses pour le projet RugbySheet.
 */

/**
 * Formate un nombre de millisecondes en une chaîne de caractères HH:mm:ss.
 *
 * @param {number} milliseconds Le nombre de millisecondes.
 * @returns {string} Le temps formaté en HH:mm:ss.
 */
function formatMillisecondsToHMS(milliseconds) {
  if (milliseconds < 0) {
    milliseconds = 0; // S'assurer que le temps ne soit jamais négatif
  }
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Utilise String.padStart pour s'assurer que les minutes et les secondes ont toujours deux chiffres
  // même si les minutes dépassent 99.
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  return `${formattedMinutes}:${formattedSeconds}`;
}
  