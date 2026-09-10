/* Déployé le 10/09/2026 à 15:38 — v920 */
/* ============================================================
   ec-historique.js
   Le cours en train de se faire : on le dit, et on dit qu'il est
   fini.

   ─ CE QUI A ÉTÉ RETIRÉ LE 1ER SEPTEMBRE 2026 ─

   Ce fichier portait aussi un écran, « 📚 Historique des cours »,
   dans l'onglet Outils. Il ne s'est JAMAIS affiché : sa vue
   n'était branchée nulle part dans « reveillerVue », et la carte
   restait sur « Chargement… » indéfiniment. Deux cents lignes que
   personne n'a jamais pu lire, et un droit « historique » qu'on
   pouvait accorder sans que rien ne s'ouvre.

   Ses deux moitiés existent ailleurs, et en mieux :

     · les cours en cours → 🩹 Cours non terminés (Gestion), qui
       montre en plus les dictées déposées et va vérifier si le
       bilan a été enregistré avant de se plaindre ;
     · les cours enregistrés → 📚 Historique des leçons (onglet
       Élèves).

   Ce qui reste ici est ce dont le reste de l'application se sert
   vraiment : le signal de début et de fin d'un cours. C'est lui
   qui alimente la liste des cours non terminés — le supprimer
   avec l'écran l'aurait vidée.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Le moniteur s'inscrit au démarrage. Un échec ne bloque rien :
   c'est une commodité, pas une étape du cours. */
async function signalerCoursDemarre(eleve, type, site){
  /* ⚠️ UN COURS QUI COMMENCE LÈVE L'INTERDIT DE DÉPÔT — v920.

     Un cours terminé refuse les dépôts en retard pendant trois
     heures (voir « depotInterdit »). Mais le même élève peut
     revenir le soir : ce cours-là a le droit de se mettre à
     l'abri, et c'est ici qu'on le sait — c'est le seul endroit par
     où passent les quatre façons de commencer. */
  if(typeof reprendreLesDepots === 'function') reprendreLesDepots(eleve);

  try{
    await appelPrep({ action: 'coursDemarre',
                      moniteur: ACCES.moniteur || '',
                      eleve: eleve || '', type: type || '', site: site || '',
                      appareil: (navigator.userAgent || '').slice(0, 40) });
  }catch(e){ console.warn('Cours démarré non signalé :', e); }
}

async function signalerCoursFini(){
  try{
    await appelPrep({ action: 'coursFini', moniteur: ACCES.moniteur || '' });
  }catch(e){ console.warn('Fin de cours non signalée :', e); }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-historique.js'] = true;
