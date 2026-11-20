/* Déployé le 20/11/2026 à 10:00 — v1504 */
/* ============================================================
   ec-reseau.js
   Appels réseau avec délai borné et nouvelle tentative
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   🔁 v1504 — SANS DEMANDER LA PERMISSION À CHAQUE APPEL

   David, le 20/11 : « tu peux régler les OPTIONS tant que ça ne met
   pas en péril la sécurité ». Un appel au Worker envoyé en « JSON »
   obligeait le navigateur à demander d'abord la permission (une
   requête OPTIONS, un aller-retour de plus) : 38 % des requêtes de la
   journée. Envoyé en texte, le même contenu part directement — le
   Worker le lit pareil (request.json() ne regarde pas l'en-tête).

   La sécurité ne bouge pas : le Worker ne se fie à aucun cookie, il
   vérifie le code de la personne dans CHAQUE appel ; et ses réponses
   ne se lisent toujours que depuis les adresses de l'appli.

   Fait ici, une fois, pour tous les modules de l'appli : seuls les
   appels au Worker sont touchés, et seulement l'en-tête.
   ============================================================ */
(function(){
  if(!window.fetch || window.__fetchEnTexte) return;
  window.__fetchEnTexte = true;
  const natif = window.fetch.bind(window);
  const WORKER = 'https://bilan-proxy.evolutionconduites.workers.dev';
  window.fetch = function(entree, options){
    try{
      const url = typeof entree === 'string' ? entree : String((entree && entree.url) || '');
      const base = (window.CONFIG && CONFIG.WORKER_URL) || WORKER;
      const h = options && options.headers;
      if(h && typeof h === 'object' && !(h instanceof Headers) && (url.indexOf(base) === 0 || url.indexOf(WORKER) === 0)){
        const k = Object.keys(h).find(x => x.toLowerCase() === 'content-type');
        if(k && /^application\/json/i.test(String(h[k]))){
          const h2 = Object.assign({}, h);
          h2[k] = 'text/plain;charset=UTF-8';
          options = Object.assign({}, options, { headers: h2 });
        }
      }
    }catch(e){ /* en cas de doute, l'appel part tel quel */ }
    return natif(entree, options);
  };
})();

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
