/* Déployé le 18/11/2026 à 10:39 — v1460 */
/* ============================================================
   ec-coin-cafe.js — v1456
   ☕ LE COIN CAFÉ, CÔTÉ ÉQUIPE : LES DEUX PORTES CACHÉES

   David, le 17 novembre : « j'aime bien les 2 secondes sur le logo,
   et il faudra mettre aussi un mot dans la loupe : café, pour avoir
   2 entrées possibles ». Le jeu lui-même est dans cafe-commun.js
   (le même pour l'espace élève) ; ici, on le branche sur l'appli :
   - 2 secondes sur le logo « EC » (un anneau vert se remplit) ;
   - « café » dans la loupe 🔍 : la ligne « ☕ Le coin café » ;
   - la notification d'un défi (« ?vue=cafe ») ;
   - la relecture de fond, qui ouvre l'invitation quand elle arrive
     (même pendant un cours : David ne veut pas les bloquer).

   ⚠️ LA RELECTURE DE FOND NE PROLONGE PAS LA SESSION. Elle part
   toutes les 20 secondes : passer par appelPrep (qui repousse le
   délai d'inactivité de 48 h) aurait gardé ouverte pour toujours
   une appli oubliée sur un ordinateur. Seuls les gestes (lancer,
   jouer, répondre) comptent comme de l'activité.

   ⚠️ RIEN DANS LE PANNEAU D'À CÔTÉ (?cote=1) : une seule fenêtre
   doit sonner, celle de l'appli.

   v1459 — David : « je n'ai qu'une notif et pas de pop-up qui
   apparaît pour jouer — attention, si on met un pop-up il ne faut
   pas que ça coupe un cours ».
   - La Messagerie EC seule ouvre aussi le coin café : c'est elle
     que la notification rouvre quand l'abonnement vient d'elle, et
     elle ne montrait rien.
   - La notification prévient la page (sw.js, « cafe ») : la relecture
     part tout de suite, sans attendre ses 20 secondes.
   - « occupe » : un cours en route (coursEnRoute, la seule source de
     l'appli), un appel ou la visio en cours. L'invitation arrive
     alors dans un petit bandeau en bas, jamais en fenêtre.
   ============================================================ */
(function(){
  if(typeof window.CafeEC === 'undefined') return;

  const ACTIONS = { etat: 'cafeEtat', agir: 'cafeAgir', lancer: 'cafeLancer', palmares: 'cafePalmares',
                    tournoiLancer: 'cafeTournoiLancer', tournoiArreter: 'cafeTournoiArreter',
                    record: 'cafeRecord',     /* 🏅 v1458 — le résultat d'un jeu solo */
                    infos: 'cafeInfos' };     /* 📰 v1460 — actualités, horoscope, météo */
  const GESTES = { agir: 1, lancer: 1, tournoiLancer: 1, tournoiArreter: 1, record: 1 };

  function pret(){
    if(window.EC_COTE) return false;
    return !!(typeof ACCES !== 'undefined' && ACCES && ACCES.code && ACCES.moniteur);
  }
  async function appeler(quoi, donnees){
    if(GESTES[quoi] && typeof rafraichirSession === 'function') rafraichirSession();
    const ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    const t = setTimeout(() => { if(ctrl) ctrl.abort(); }, 12000);
    try{
      const r = await fetch(CONFIG.SHEETS_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ code: ACCES.code, action: ACTIONS[quoi] }, donnees || {})),
        signal: ctrl ? ctrl.signal : undefined
      });
      const j = await r.json().catch(() => ({}));
      if(!r.ok) throw new Error(j.error || ('Le coin café ne répond pas (' + r.status + ')'));
      return j;
    }catch(e){
      if(e && e.name === 'AbortError') throw new Error('Le coin café ne répond pas.');
      throw e;
    }finally{ clearTimeout(t); }
  }
  /* ⏸️ v1459 — un cours, un appel, la visio : rien ne s'ouvre en grand */
  function occupe(){
    try{ if(typeof coursEnRoute === 'function' && coursEnRoute()) return true; }catch(e){}
    try{ if(typeof AppelEC !== 'undefined' && AppelEC.enCours && AppelEC.enCours()) return true; }catch(e){}
    return false;
  }
  function comptes(){
    try{ if(typeof comptesActifs !== 'undefined' && Array.isArray(comptesActifs)) return comptesActifs; }catch(e){}
    return [];
  }
  function eleves(){
    try{
      if(typeof nomsConnusEleves === 'function') return nomsConnusEleves();
      if(typeof elevesConnus !== 'undefined' && Array.isArray(elevesConnus)) return elevesConnus.slice();
    }catch(e){}
    return [];
  }

  CafeEC.brancher({
    mode: 'equipe',
    appeler: appeler,
    pret: pret,
    occupe: occupe,
    moi: () => ({ nom: (typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || '' }),
    admin: () => !!(typeof ACCES !== 'undefined' && ACCES && ACCES.role === 'admin'),
    comptes: comptes,
    eleves: eleves,
    classes: { fond: 'overlay show', boite: 'modal', titreTag: 'h3', titre: '' },
    toast: (t) => { if(typeof showToast === 'function') showToast(t); },
    confirmer: (m, t) => (typeof confirmer === 'function') ? confirmer(m, t, true) : Promise.resolve(true)
  });

  /* ---------- porte n°1 : 2 secondes sur le logo « EC » ---------- */
  function brancherLogo(){
    const logo = document.querySelector('.wrap > header .logo');
    if(logo) CafeEC.porteCachee(logo, () => { if(pret()) CafeEC.ouvrir(); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', brancherLogo);
  else brancherLogo();

  /* ---------- porte n°2 : « café » dans la loupe ---------- */
  function sansAccent(q){ return String(q || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  const vraiTrouver = window.ecransTrouvables;
  if(typeof vraiTrouver === 'function'){
    window.ecransTrouvables = function(q){
      const l = vraiTrouver.apply(this, arguments) || [];
      const n = sansAccent(q);
      if(pret() && (n === 'cafe' || n === 'coin cafe' || n === 'le coin cafe')){
        return [{ nom: '☕ Le coin café', ou: 'les petits jeux', cafe: true }].concat(l);
      }
      return l;
    };
  }
  const vraiOuvrir = window.ouvrirLEcran;
  if(typeof vraiOuvrir === 'function'){
    window.ouvrirLEcran = function(x){
      if(x && x.cafe){ CafeEC.ouvrir(); return; }
      return vraiOuvrir.apply(this, arguments);
    };
  }

  /* ---------- la notification d'un défi : « ?vue=cafe » ---------- */
  function ouvrirQuandPret(n){
    if(!pret()){ if(n < 120) setTimeout(() => ouvrirQuandPret(n + 1), 500); return; }
    CafeEC.aLaUne();
  }
  try{
    const u = new URL(location.href);
    if(u.searchParams.get('vue') === 'cafe'){
      u.searchParams.delete('vue');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
      ouvrirQuandPret(0);
    }
  }catch(e){}
  if(navigator.serviceWorker){
    navigator.serviceWorker.addEventListener('message', ev => {
      const d = ev && ev.data;
      if(d && d.quoi === 'ouvrirVue' && d.vue === 'cafe') ouvrirQuandPret(0);
      /* ☕ v1459 — un défi vient d'arriver : on relit tout de suite */
      if(d && d.quoi === 'cafe' && pret()) CafeEC.relire();
    });
  }

  /* En se déconnectant : la fenêtre du jeu se ferme */
  const verr = window.verrouiller;
  if(typeof verr === 'function'){
    window.verrouiller = function(){ try{ CafeEC.fermer(); }catch(e){} return verr.apply(this, arguments); };
    if(verr.__ot) window.verrouiller.__ot = true;
  }
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-coin-cafe.js'] = true;
