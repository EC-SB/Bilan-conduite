/* Déployé le 20/11/2026 à 10:13 — v1505 */
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
/* ============================================================
   🤖 v1505 — C'EST BIEN UNE PERSONNE (Cloudflare Turnstile)

   David, le 20/11 : « tu peux faire ça pour nous aussi ». Le Worker
   ne regarde plus un code sans un LAISSEZ-PASSER lié à ce code (deux
   mois). Ici, une fois pour tous les modules :
     · chaque appel au Worker qui porte un code part avec les
       laissez-passer gardés sur cet appareil (les cinq derniers codes :
       un ordinateur du bureau sert à plusieurs) ;
     · si le Worker répond « humain », Cloudflare vérifie (le plus
       souvent sans rien demander ; une case seulement en cas de doute),
       /auth rend le laissez-passer, et l'appel repart tout seul.
   L'ordinateur de la salle de code envoie sa clé « poste » : il est
   dispensé, même quand quelqu'un y tape son code.
   ============================================================ */
(function(){
  if(!window.fetch || window.__fetchEnTexte) return;
  window.__fetchEnTexte = true;
  const natif = window.fetch.bind(window);
  const WORKER = 'https://bilan-proxy.evolutionconduites.workers.dev';
  const CLE_PASSES = 'ec_passes_equipe';
  const lirePasses = () => { try{ const l = JSON.parse(localStorage.getItem(CLE_PASSES) || '[]'); return Array.isArray(l) ? l.filter(x => typeof x === 'string') : []; }catch(e){ return []; } };
  const garderPasse = (p) => { try{ const l = [p].concat(lirePasses().filter(x => x !== p)).slice(0, 5); localStorage.setItem(CLE_PASSES, JSON.stringify(l)); }catch(e){} };
  const versLeWorker = (url) => { const base = (window.CONFIG && CONFIG.WORKER_URL) || WORKER; return url.indexOf(base) === 0 || url.indexOf(WORKER) === 0; };
  /* 🔁 v1504 — en texte : le navigateur ne demande plus la permission avant chaque appel */
  const enTexte = (options) => {
    const h = options && options.headers;
    if(!h || typeof h !== 'object' || (typeof Headers !== 'undefined' && h instanceof Headers)) return options;
    const k = Object.keys(h).find(x => x.toLowerCase() === 'content-type');
    if(!k || !/^application\/json/i.test(String(h[k]))) return options;
    const h2 = Object.assign({}, h);
    h2[k] = 'text/plain;charset=UTF-8';
    return Object.assign({}, options, { headers: h2 });
  };
  const posteJeton = () => {
    if(!window.EC_POSTE) return '';
    try{ const p = JSON.parse(localStorage.getItem('ec_poste') || 'null'); return (p && p.jeton) || ''; }catch(e){ return ''; }
  };

  /* ---- la vérification, une seule à la fois ---- */
  let enCours = null;
  function chargerTurnstile(){
    if(window.turnstile) return Promise.resolve(window.turnstile);
    return new Promise((ok, non) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => { let n = 0; (function attendre(){ if(window.turnstile) ok(window.turnstile); else if(n++ > 50) non(new Error('Vérification indisponible.')); else setTimeout(attendre, 100); })(); };
      s.onerror = () => non(new Error('La vérification ne se charge pas : vérifie la connexion internet.'));
      document.head.appendChild(s);
    });
  }
  function carte(){
    let c = document.getElementById('ecHumainEquipe');
    if(!c){
      c = document.createElement('div');
      c.id = 'ecHumainEquipe';
      c.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;' +
        'background:rgba(10,12,6,.45);opacity:0;pointer-events:none;transition:opacity .15s ease;';
      c.innerHTML = '<div class="card" style="max-width:380px;width:100%;text-align:center;padding:18px 16px;margin:0;">' +
        '<div style="font-weight:800;font-size:17px;margin:0 0 6px;">🔒 Une petite vérification</div>' +
        '<div style="font-size:14px;line-height:1.45;color:var(--muted);margin:0 0 12px;">Coche la case pour montrer que tu es bien une personne. ' +
        'Ça ne te sera plus demandé avant longtemps sur cet appareil.</div>' +
        '<div class="ecHW" style="display:flex;justify-content:center;min-height:65px;"></div>' +
        '<div class="ecHM" style="font-size:13px;margin-top:8px;min-height:18px;"></div></div>';
      document.body.appendChild(c);
    }
    return c;
  }
  const voir = (c, oui) => { c.style.opacity = oui ? '1' : '0'; c.style.pointerEvents = oui ? 'auto' : 'none'; };
  /* Rend la réponse de /auth (avec le laissez-passer si le code est bon) */
  function obtenirHumain(corps, cle){
    if(enCours) return enCours;
    enCours = new Promise((ok, non) => {
      const c = carte(), w = c.querySelector('.ecHW'), m = c.querySelector('.ecHM');
      let fini = false, id = null;
      const finir = (err, rep) => {
        if(fini) return; fini = true;
        try{ if(id !== null && window.turnstile) window.turnstile.remove(id); }catch(e){}
        voir(c, false);
        if(err) non(err); else ok(rep);
      };
      w.innerHTML = ''; m.textContent = '';
      chargerTurnstile().then(ts => {
        id = ts.render(w, {
          sitekey: cle, language: 'fr', appearance: 'interaction-only',
          theme: document.body.classList.contains('clair') ? 'light' : 'auto',
          'before-interactive-callback': () => voir(c, true),
          'after-interactive-callback': () => { m.textContent = 'Merci, un instant…'; },
          callback: (jeton) => {
            const base = (window.CONFIG && CONFIG.WORKER_URL) || WORKER;
            const q = { code: corps.code, humain: jeton };
            if(corps.identifiant) q.identifiant = corps.identifiant;
            natif(base + '/auth', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(q), cache: 'no-store' })
              .then(r => r.clone().json().catch(() => ({})).then(d => { if(d && d.passe) garderPasse(d.passe); finir(null, r); }))
              .catch(() => finir(new Error('Le serveur ne répond pas : réessaie dans un instant.')));
          },
          'error-callback': () => { voir(c, true); m.textContent = '⚠️ La vérification n’a pas marché. Recharge la page et réessaie.'; setTimeout(() => finir(new Error('Vérification impossible : recharge la page.')), 4000); return true; },
          'expired-callback': () => { try{ window.turnstile.reset(id); }catch(e){} }
        });
      }).catch(e => finir(e));
    });
    const p = enCours;
    p.then(() => { enCours = null; }, () => { enCours = null; });
    return p;
  }

  window.fetch = async function(entree, options){
    let url = '';
    try{ url = typeof entree === 'string' ? entree : String((entree && entree.url) || ''); }catch(e){}
    if(!url || !versLeWorker(url)) return natif(entree, options);
    try{ options = enTexte(options); }catch(e){ /* en cas de doute, l'appel part tel quel */ }
    let corps = null;
    try{ if(options && typeof options.body === 'string' && options.body.charAt(0) === '{') corps = JSON.parse(options.body); }catch(e){ corps = null; }
    if(!corps || !corps.code || corps.humain) return natif(entree, options);
    const avecPasses = () => {
      const c2 = Object.assign({}, corps);
      const l = lirePasses();
      if(l.length) c2.passe = l.join(',');
      const pj = posteJeton();
      if(pj && !c2.poste) c2.poste = pj;
      return Object.assign({}, options, { body: JSON.stringify(c2) });
    };
    const r = await natif(entree, avecPasses());
    if(r.status !== 401) return r;
    let d = null;
    try{ d = await r.clone().json(); }catch(e){ d = null; }
    if(!d || !d.humain || !d.cle) return r;
    const rAuth = await obtenirHumain(corps, d.cle);
    let dAuth = null;
    try{ dAuth = await rAuth.clone().json(); }catch(e){ dAuth = null; }
    /* code faux, compte bloqué… : la réponse de /auth dit pourquoi */
    if(!dAuth || !dAuth.passe) return rAuth;
    return natif(entree, avecPasses());
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
