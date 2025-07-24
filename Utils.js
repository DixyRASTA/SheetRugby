/**
 * @file Fonctions utilitaires diverses pour le projet RugbySheet.
 */

/**
 * Formate un nombre de millisecondes en une chaîne de caractères HH:mm:ss.
 * @param {number} milliseconds Le nombre de millisecondes à formater.
 * @return {string} Le temps formaté (HH:mm:ss).
 */
function formatMillisecondsToHMS(milliseconds) {
  // Gère les cas où la valeur n'est pas un nombre valide ou est négative
  if (typeof milliseconds !== 'number' || isNaN(milliseconds) || milliseconds < 0) {
    return "00:00:00"; 
  }
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Fonction utilitaire pour ajouter un zéro initial si le nombre est inférieur à 10
  const pad = (num) => num.toString().padStart(2, '0');
  
  // Retourne le temps formaté en HH:mm:ss
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}