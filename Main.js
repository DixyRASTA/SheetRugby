/**
 * @file Code pour gérer le suivi d'un match de rugby dans Google Sheets.
 */
 
/**
 * Fonction appelée automatiquement à l'ouverture de la feuille Google Sheet.
 * Ajoute les menus personnalisés pour un accès facile aux scripts.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Match Rugby')
      .addItem('Ouvrir Tableau de Bord', 'ouvrirTableauDeBord') // Bouton pour ouvrir la sidebar
      .addSeparator()
      .addItem('Initialiser le match', 'initialiserFeuilleEtProprietes') // Réinitialise les données (scores à 0, chrono à 0, phase "non_demarre")
      .addSeparator() 
      .addSubMenu(ui.createMenu('Phases de Match')
          .addItem('Coup d\'envoi 1ère MT', 'debutPremiereMiTemps') // Fonction de Interruption.gs
          .addItem('Fin 1ère MT', 'finPremiereMiTemps') // Fonction de Interruption.gs
          .addItem('Coup d\'envoi 2e MT', 'debutDeuxiemeMiTemps') // Fonction de Interruption.gs
          .addItem('Fin de Match', 'finDeMatch') // Fonction de Interruption.gs
      )
      .addSeparator()
      .addSubMenu(ui.createMenu('Réalisations (points)') // Renommé pour plus de clarté
          .addItem('Essai', 'recordEssai') // Fonction de Actions.gs
          .addItem('Transformation Réussie', 'recordTransformationReussie') // Fonction de Actions.gs
          .addItem('Transformation Manquée', 'recordTransformationManquee') // Fonction de Actions.gs
          .addItem('Drop Réussi', 'recordDropReussi') // Fonction de votre Actions.gs
          .addItem('Drop Manqué', 'recordDropManque') // Fonction de votre Actions.gs
          .addItem('Pénalité Réussie', 'recordPenaliteReussie') // Si ça rapporte des points, ici
          .addItem('Pénalité Manquée', 'recordPenaliteManquee') // Si ça rapporte des points, ici
          .addItem('Essai de Pénalité', 'recordEssaiDePenalite') // Fonction de votre Sanctions.gs (mais rapporte des points)
      )
      .addSeparator() 
      .addSubMenu(ui.createMenu('Fautes & Sanctions') // Renommé pour plus de clarté
          .addItem('Pénalité Tentée', 'recordPenaliteTentee') // Tentative de pénalité, gestion à suivre (Réussie/Manquée)
          .addItem('Carton Blanc', 'recordCartonBlanc') // Fonction de votre Sanctions.gs
          .addItem('Carton Jaune', 'recordCartonJaune') // Fonction de votre Sanctions.gs
          .addItem('Carton Rouge', 'recordCartonRouge') // Fonction de votre Sanctions.gs
        )
      .addSeparator()
      .addSubMenu(ui.createMenu('Événements Divers') // Renommé pour englober plus de choses
          .addItem('Arrêt du jeu', 'arretJeu') // Fonction de votre Interruption.gs
          .addItem('Reprise du jeu', 'repriseJeu') // Fonction de votre Interruption.gs
          .addItem('Ajouter un événement manuel', 'ajouterEvenementManuel') // Fonction de votre Evenements.gs
          .addItem('Annuler dernier événement', 'annulerDernierEvenement') // Fonction de votre Evenements.gs (deleteLastEvent)
          .addItem('Carton Bleu', 'recordCartonBleu') // Fonction de votre Sanctions.gs
        )
      .addToUi();
}