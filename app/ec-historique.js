/* Déployé le 17/09/2026 à 10:47 — v1016 */
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


/* ============================================================
   ÉCRIRE UNE LIGNE AU CLASSEUR, ET DIRE QUE LE COURS EST FINI

   David, le 17 septembre 2026 : « les rendez-vous post permis sont
   encore dans cours non terminés alors qu'ils ont été terminés et
   je ne les retrouve pas dans l'historique des cours, par contre le
   résultat remonte bien ».

   ⚠️ UNE SEULE CAUSE POUR LES DEUX SYMPTÔMES, ET ELLE EST ICI.

   Le signal de fin vivait au milieu de « exporterVersSheets » —
   « le seul endroit que les DEUX chemins traversent, la dictée
   comme le bilan manuel ». C'était vrai pour DEUX chemins sur
   trois. Le rendez-vous post-permis, lui, a son propre écran : il
   conclut dans le suivi et s'arrête là. Pas de passage, donc ni
   ligne au classeur, ni signal de fin. Il signalait pourtant bien
   son DÉBUT, comme les quatre autres façons de commencer un cours :
   il restait donc dans 🩹 Cours non terminés pour toujours. Et il
   poussait le vice à supprimer son brouillon en partant, ce qui le
   rendait PLUS visible que les autres — l'écran cache les lignes
   dont l'élève a un brouillon.

   Écrire la ligne et dire que c'est fini, c'est le MÊME geste : les
   deux marquent l'instant où le cours cesse d'être en cours. Ils
   vivent donc ensemble, ici, dans le fichier dont c'est tout
   l'objet, et non plus au milieu d'une fonction qui fait dix autres
   choses et que tout le monde ne traverse pas.

   ⚠️ LE SIGNAL NE PART QUE SI LA LIGNE EST PASSÉE. Un classeur
   d'une autre version, un réseau coupé : le cours n'est pas
   enregistré, et le dire fini le ferait disparaître de la seule
   liste qui le réclame encore. Un cours qu'on croit rangé est pire
   qu'un cours qui traîne.

   Rend { ok, ligne } — le numéro de ligne quand le classeur le dit.
   ============================================================ */
async function envoyerLigneDeBilan(data){
  const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'append', code: ACCES.code, data: data })
  });
  if(!r.ok) throw new Error('HTTP ' + r.status);

  const rep = await r.json().catch(() => ({}));
  /* ⚠️ LE « await » N'EST PAS DÉCORATIF. Il manquait autrefois :
     la fonction est asynchrone, et une promesse est toujours vraie.
     Le garde-fou ne s'est jamais déclenché — un bilan enregistré
     sans sa note passait pour enregistré. */
  if(typeof verifierVersionScript === 'function' &&
     !await verifierVersionScript(rep)){
    return { ok: false, ligne: null };
  }

  if(typeof signalerCoursFini === 'function') await signalerCoursFini();
  return { ok: true, ligne: rep && rep.ligne };
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-historique.js'] = true;
