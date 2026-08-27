/* Déployé le 27/08/2026 à 09:39 — v592 */
/* ============================================================
   ec-reseau.js
   Appels réseau avec délai borné et nouvelle tentative
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   RÉSEAU
   Au changement de wifi/4G, une connexion morte peut bloquer
   une requête très longtemps. On borne l'attente et on réessaie.
   ============================================================ */
async function fetchFiable(url, options, delaiMs, essais){
  const limite = delaiMs || 12000;
  const max = essais || 2;
  let derniere = null;

  for(let i = 1; i <= max; i++){
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), limite);
    try{
      const r = await fetch(url, Object.assign({}, options, {
        signal: ctrl.signal,
        cache: 'no-store'
      }));
      clearTimeout(minuteur);
      return r;
    }catch(e){
      clearTimeout(minuteur);
      derniere = e;
      /* Une connexion morte échoue vite une fois abandonnée :
         la tentative suivante en ouvre une neuve. */
      if(i < max) await new Promise(r => setTimeout(r, 400));
    }
  }
  /* Dire combien de temps on a attendu : « le réseau ne répond
     pas » après 40 secondes n'a pas le même sens qu'après 5. */
  const secondes = Math.round(limite / 1000);

  throw new Error(
    (derniere && derniere.name === 'AbortError')
      ? 'Pas de réponse après ' + secondes + ' s. ' +
        'Vérifie ta connexion et réessaie.'
      : 'Connexion impossible : ' + (derniere ? derniere.message : 'erreur inconnue')
  );
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-reseau.js'] = true;
