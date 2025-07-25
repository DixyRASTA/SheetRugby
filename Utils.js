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
  const hours = Math.floor(totalSeconds / 3600); // <-- NOUVEAU : Calcul des heures
  const minutes = Math.floor((totalSeconds % 3600) / 60); // Ajusté pour ne prendre que les minutes restantes après les heures
  const seconds = totalSeconds % 60;

  // Utilise String.padStart pour s'assurer que les heures, minutes et secondes ont toujours deux chiffres
  const pad = (num) => String(num).padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`; // <-- MODIFIÉ : Inclut les heures
}