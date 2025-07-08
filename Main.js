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
      .addItem('Initialiser le match', 'initialiserFeuilleEtProprietes') //Réinitialise les données scores à 0, chrono à 0, phase "non_demarre"
      .addSeparator() 
      .addSubMenu(ui.createMenu('Phases de match')
          .addItem('Début 1ère MT', 'debutPremiereMiTemps')
          .addItem('Fin 1ère MT', 'finPremiereMiTemps')
          .addItem('debut 2ème MT', 'debutDeuxiemeMiTemps')
          .addItem('Fin de Match', 'finDeMatch')
      )
      .addSeparator()
      .addSubMenu(ui.createMenu('Réalisations')
          .addItem('Essai', 'ajouterEssai')
          .addItem('Transformation Réussie', 'ajouterTransformationReussie')
          .addItem('Transformation Manquée', 'ajouterTransformationManquee')
          .addItem('Drop Réussi', 'ajouterDropReussi')
          .addItem('Drop Manqué', 'ajouterDropManque')
          .addItem('Essai de Pénalité', 'ajouterEssaiDePenalite')
      )
      .addSeparator()
      .addSubMenu(ui.createMenu('Pénalités & Sanctions')
          .addItem('Pénalité Tentée', 'ajouterPenaliteTentee')
          .addItem('Pénalité Réussie', 'ajouterPenaliteReussie')
          .addItem('Pénalité Manquée', 'ajouterPenaliteManquee')
          .addItem('Carton Blanc', 'ajouterCartonBlanc')
          .addItem('Carton Jaune', 'ajouterCartonJaune')
          .addItem('Carton Rouge', 'ajouterCartonRouge')
        )
      .addSeparator()
      .addSubMenu(ui.createMenu('Evenements')
          .addItem('Arrêt du jeu', 'arretJeu')
          .addItem('Reprise du jeu', 'repriseJeu')
          .addItem('Ajouter un événement manuel', 'ajouterEvenement')
          .addItem('Annuler un événement', 'annulerEvenement')
          .addItem('Carton Bleu', 'ajouterCartonBleu')
        )
      .addToUi();
}