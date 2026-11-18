/* Déployé le 18/11/2026 à 14:27 — v1467 */
/* ============================================================
   ec-salle-code.js — v1467
   🖥️ L'ORDINATEUR DE LA SALLE DE CODE

   David, le 18 novembre 2026 : « une page pour gérer les visios de
   code que je mette sur mon ordi de la salle de cours sans qu'on ait
   besoin de nous connecter avec nos comptes, sachant qu'il faut qu'on
   ait accès pour lancer les visios et renseigner les résultats ».
   Ses réponses au schéma : le code de chacun pour agir ; pas de
   « Qui est là ? » ; on garde tout (🎯, ardoises, corrigés
   modifiables, QR codes, visio, grille) ; Saint-Brieuc ET Loudéac ;
   installer et retirer : les admins.

   L'ADRESSE : app.evolutionconduites.fr/?poste=1 (repérée tout en
   haut d'index.html, avant le reste : window.EC_POSTE).

   ① PAS ENCORE INSTALLÉ : la page de connexion devient « Installer
     🖥️ » — la salle, puis le prénom et le code d'un admin. Le Worker
     rend une clé (posteInstaller), gardée ici dans « ec_poste ».
   ② INSTALLÉ : la page s'ouvre seule sur Élèves › 🎓 Code, sans le
     reste de l'appli. Avec la clé seule, l'ordinateur ne fait que
     LIRE (voir POSTE_LECTURES dans le Worker).
   ③ AGIR : lancer, reprendre, saisir une ardoise, renseigner une
     séance, poser un corrigé… demandent « Ton code 🔑 ». Le code
     n'est pas gardé : il sert tant qu'on touche l'écran, et s'oublie
     après 2 minutes sans rien toucher (comme les tablettes). Une
     visio lancée continue : elle tient par son billet.
   ④ Gestion › Accès › 🖥️ Les ordinateurs des salles : la liste, et
     « Retirer » (chargerPostesSalle, appelée à l'ouverture de la vue).

   ⚠️ TOUT CE QUI EST ICI ENVELOPPE, RIEN NE REMPLACE. Les fonctions
   de l'écran du code (ec-code.js, ec-visio.js) restent telles
   quelles ; ce module les entoure au moment où l'ordinateur s'ouvre,
   et seulement en mode « poste ». L'appli de l'équipe ne voit rien.
   ============================================================ */

const CLE_POSTE = 'ec_poste';
const POSTE_CODE_MS = 120000;              /* 2 minutes sans rien toucher */
const POSTE_SALLES_NOMS = { 'saint-brieuc': 'Saint-Brieuc', 'loudeac': 'Loudéac' };
/* Les gestes qui écrivent : un refus « code requis » sur l'un d'eux
   ouvre le clavier, puis l'appel repart. Un refus sur une LECTURE de
   fond ne doit jamais ouvrir le clavier tout seul. */
const POSTE_GESTES = ['visioLancer', 'visioBillet', 'visioInviter', 'visioMail', 'codeArdoises',
                      'codeCorrigePoser', 'etgCorriger', 'etgCorrigesForms', 'codeRetirer'];

let posteInfos = null;                     /* { jeton, salle, nom, creePar, creeLe } */
let posteQui = null;                       /* { code, nom } : la personne qui vient de taper son code */
let posteDernierGeste = Date.now();
let posteChargeLe = Date.now();
let posteClavierOuvert = null;             /* la promesse du clavier, s'il est déjà à l'écran */

function posteLu(){
  try{
    const p = JSON.parse(localStorage.getItem(CLE_POSTE) || 'null');
    return (p && p.jeton && POSTE_SALLES_NOMS[p.salle]) ? p : null;
  }catch(e){ return null; }
}
function posteNomSalle(s){ return POSTE_SALLES_NOMS[s] || s || ''; }
function posteDate(t){
  if(!t) return '';
  const d = new Date(t);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}
function posteEch(v){
  return (typeof echapper === 'function') ? echapper(v)
    : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/* ------------------------------------------------------------
   AU DÉMARRAGE — appelée par reprendreSession (ec-depart.js)
   ------------------------------------------------------------ */
function posteDemarrer(){
  const p = posteLu();
  const quand = (f) => {
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', f, { once: true });
    else setTimeout(f, 0);
  };
  if(!p){ quand(posteEcranInstaller); return false; }
  quand(() => posteOuvrir(p));
  return true;
}

/* ---------- ① L'installation, sur la page de connexion ---------- */
let posteSalleChoisie = '';
function posteHabillerInstallation(){
  if(!window.EC_POSTE || posteInfos) return;
  const carte = document.querySelector('#lockView .cnxCarte');
  if(!carte) return;
  const j = $('cnxJour'), h = $('cnxBonjour');
  if(j) j.textContent = 'L’ordinateur de la salle de code · une seule fois';
  if(h) h.textContent = 'Installer 🖥️';
  const lab = document.querySelector('#cnxChampNom label');
  if(lab) lab.textContent = 'Ton prénom (un admin)';
  if(!$('posteSalles')){
    const z = document.createElement('div');
    z.id = 'posteSalles';
    z.className = 'posteSalles';
    z.innerHTML = '<label>La salle</label><div class="posteSallesL">' +
      Object.keys(POSTE_SALLES_NOMS).map(s => '<button type="button" data-salle="' + s + '">📍 ' + POSTE_SALLES_NOMS[s] + '</button>').join('') +
      '</div>';
    z.addEventListener('click', e => {
      const b = e.target.closest('button[data-salle]');
      if(!b) return;
      posteSalleChoisie = b.dataset.salle;
      z.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    });
    const qui = $('cnxQui');
    carte.insertBefore(z, qui || $('cnxChampNom'));
  }
  const btn = $('codeBtn');
  if(btn && !btn.disabled) btn.textContent = 'Installer l’ordinateur';
  if(!$('posteInstAide')){
    const a = document.createElement('div');
    a.id = 'posteInstAide';
    a.className = 'posteInstAide';
    a.textContent = 'Ensuite, l’ordinateur s’ouvre tout seul sur la salle de code : plus de prénom ni de code à taper pour regarder. ' +
      'Pour lancer une visio ou saisir des résultats, chacun tape son code.';
    btn.parentNode.insertBefore(a, $('codeMsg').nextSibling);
  }
  let dit = '';
  try{ dit = sessionStorage.getItem('ec_poste_msg') || ''; sessionStorage.removeItem('ec_poste_msg'); }catch(e){}
  if(dit && $('codeMsg')){ $('codeMsg').style.color = 'var(--warn-text)'; $('codeMsg').textContent = dit; }
}

function posteEcranInstaller(){
  document.documentElement.classList.add('posteInstall');
  const avant = window.preparerConnexion;
  if(typeof avant === 'function' && !avant.posteHabille){
    const p = function(){ avant.apply(this, arguments); posteHabillerInstallation(); };
    p.posteHabille = true;
    window.preparerConnexion = p;
    try{ preparerConnexion = p; }catch(e){}
  }
  posteHabillerInstallation();
}

/* Le bouton « Installer l'ordinateur » : deverrouiller() passe la main ici */
async function posteInstallerDepuisLaPage(){
  const msg = $('codeMsg'), btn = $('codeBtn');
  const code = $('codeInput').value.trim();
  const ident = $('identInput') ? $('identInput').value.trim() : '';
  const dire = (t) => { msg.style.color = 'var(--warn-text)'; msg.textContent = t; };
  if(!posteSalleChoisie) return dire('Choisis la salle : Saint-Brieuc ou Loudéac.');
  if(!ident){ dire('Indique ton prénom.'); if($('identInput')) $('identInput').focus(); return; }
  if(code.length < 6){ dire('Le code compte au moins 6 chiffres.'); return; }
  if(btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Installation…';
  msg.style.color = 'var(--muted)';
  msg.textContent = '';
  try{
    const r = await fetchFiable(CONFIG.AUTH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, identifiant: ident }) });
    const d = await r.json().catch(() => ({}));
    if(!r.ok || !d.ok){
      dire(d.error || 'Prénom ou code incorrect.');
      $('codeInput').value = '';
      if(typeof majRondsCode === 'function') majRondsCode();
      return;
    }
    if(d.role !== 'admin'){
      dire('Seul un admin installe l’ordinateur de la salle.');
      $('codeInput').value = '';
      if(typeof majRondsCode === 'function') majRondsCode();
      return;
    }
    const r2 = await fetchFiable(CONFIG.SHEETS_PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'posteInstaller', code: code, identifiant: ident, salle: posteSalleChoisie }) });
    const d2 = await r2.json().catch(() => ({}));
    if(!r2.ok || !d2.jeton) return dire(d2.error || d2.message || 'L’installation n’a pas pu se faire.');
    const p = { jeton: d2.jeton, salle: d2.poste.salle, nom: d2.poste.nom, creePar: d2.poste.creePar, creeLe: d2.poste.creeLe };
    try{ localStorage.setItem(CLE_POSTE, JSON.stringify(p)); }
    catch(e){ return dire('Ce navigateur refuse de garder la clé (navigation privée ?) : l’ordinateur ne pourra pas s’ouvrir seul.'); }
    /* Une session personnelle restée sur l'ordinateur de la salle s'en va */
    if(typeof oublierSession === 'function'){ try{ oublierSession(); }catch(e){} }
    $('codeInput').value = '';
    if(typeof majRondsCode === 'function') majRondsCode();
    document.documentElement.classList.remove('posteInstall');
    posteOuvrir(p);
    if(typeof showToast === 'function') showToast('🖥️ Ordinateur installé : salle de code de ' + posteNomSalle(p.salle));
  }catch(e){
    dire('Connexion impossible : ' + ((e && e.message) || e));
  }finally{
    btn.disabled = false;
    if(!posteInfos) btn.textContent = 'Installer l’ordinateur';
  }
}

/* ---------- ② L'ordinateur ouvert ---------- */
function posteOuvrir(p){
  if(posteInfos) return;
  posteInfos = p;
  posteChargeLe = Date.now();
  ACCES = { code: null, moniteur: p.nom, role: 'moniteur', emoji: '🖥️', genre: '',
            /* l'écran du code tel qu'il est pour un moniteur qui a les deux droits ;
               c'est le Worker qui décide, avec le code de chacun */
            droits: { code: 'm', visio_code: 'm' }, droitsRegles: true, poste: true };
  document.body.classList.add('posteOuvert');
  posteEnvelopper();

  $('lockView').style.display = 'none';
  $('appView').style.display = 'block';
  const lieux = document.querySelector('header .ec-lieux');
  if(lieux) lieux.textContent = '🎓 Salle de code · ' + posteNomSalle(p.salle) + ' · ';

  [['droits', () => appliquerDroits()],
   ['onglets', () => initOnglets()],
   ['élèves', () => { if(typeof elevesDuCache === 'function') elevesDuCache(); chargerEleves(); }],
   ['code', () => posteAllerAuCode()]].forEach(([nom, f]) => {
    try{ f(); }catch(e){ console.warn('Ordinateur de la salle — « ' + nom + ' » :', e); }
  });

  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(t =>
    document.addEventListener(t, () => { posteDernierGeste = Date.now(); }, { capture: true, passive: true }));
  setInterval(posteVeiller, 5000);

  /* La clé vaut-elle encore ? (retirée depuis Gestion : on le saura ici) */
  appelPrep({ action: 'posteMoi' }).catch(() => {});
}

function posteAllerAuCode(){
  const o = (typeof ongletDeVue === 'function') ? ongletDeVue('code') : 'eleves';
  afficherOnglet(o, false);
  afficherVue(o, 'code');
  if(typeof reveillerVue === 'function') reveillerVue('code');
}

function posteCoursOuvert(){
  try{ return typeof visioCoursOuvert === 'function' && visioCoursOuvert(); }catch(e){ return false; }
}

/* Toutes les 5 s : le code qui s'oublie, l'écran qui se relit */
let posteDerniereRelecture = Date.now();
function posteVeiller(){
  const t = Date.now();
  if(posteQui && t - posteDernierGeste > POSTE_CODE_MS) posteFermer(true);
  majBandeauPoste();
  const calme = t - posteDernierGeste > 90000 && !document.querySelector('.overlay.show') &&
                !posteClavierOuvert && !posteCoursOuvert();
  if(!calme) return;
  /* Une page laissée ouverte des jours prend la version du jour, la nuit */
  if(t - posteChargeLe > 20 * 3600000 && new Date().getHours() < 6){ location.reload(); return; }
  /* L'écran se relit seul toutes les 5 minutes (les visios du jour, la grille) */
  if(t - posteDerniereRelecture > 300000){
    posteDerniereRelecture = t;
    const haut = window.scrollY;
    try{ afficherCode(); }catch(e){}
    try{ window.scrollTo(0, haut); }catch(e){}
  }
}

/* ---------- ③ « Ton code 🔑 » ---------- */
function posteFermer(dire){
  if(!posteQui) return;
  posteQui = null;
  ACCES.code = null;
  ACCES.moniteur = posteInfos ? posteInfos.nom : '';
  majBandeauPoste();
  if(dire && typeof showToast === 'function') showToast('🔒 L’ordinateur s’est refermé (2 minutes sans rien toucher).');
}

function majBandeauPoste(){
  let b = $('posteBandeau');
  if(!posteQui){ if(b) b.remove(); return; }
  if(!b){
    b = document.createElement('div');
    b.id = 'posteBandeau';
    b.className = 'posteBandeau';
    b.innerHTML = '<span></span><button type="button">🔒 Fermer</button>';
    b.querySelector('button').addEventListener('click', () => posteFermer(false));
    document.body.appendChild(b);
  }
  const reste = Math.max(0, Math.ceil((POSTE_CODE_MS - (Date.now() - posteDernierGeste)) / 1000));
  b.querySelector('span').innerHTML = '🔓 <b>' + posteEch(posteQui.nom) + '</b> · se referme après 2 minutes sans rien toucher' +
    (reste <= 30 ? ' <small>(' + reste + ' s)</small>' : '');
}

/* Promet true quand quelqu'un a tapé un code valable (ou l'avait déjà fait) */
function posteDemanderCode(pourquoi){
  if(posteQui){ posteDernierGeste = Date.now(); return Promise.resolve(true); }
  if(posteClavierOuvert) return posteClavierOuvert;
  posteClavierOuvert = new Promise(fin => {
    const fond = document.createElement('div');
    fond.className = 'overlay show posteClavier';
    fond.innerHTML =
      '<div class="modal cnxCarte">' +
        '<div class="cnxJour">' + posteEch(pourquoi || 'Pour continuer') + '</div>' +
        '<h2 class="cnxBonjour">Ton code 🔑</h2>' +
        '<span class="cnxChamp" data-ico="🔑"><input type="password" inputmode="numeric" maxlength="8" placeholder="••••••" autocomplete="off"></span>' +
        '<div class="cnxPave">' +
          [1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => '<button type="button" data-k="' + k + '">' + k + '</button>').join('') +
          '<button type="button" data-k="eff" class="eff" aria-label="Effacer">⌫</button><button type="button" data-k="0">0</button>' +
          '<button type="button" data-k="ok" class="ok" aria-label="Valider">✓</button>' +
        '</div>' +
        '<div class="posteMsg"></div>' +
        '<div class="posteInstAide">Le code avec lequel tu ouvres l’appli. Il n’est pas gardé : l’ordinateur se referme après 2 minutes sans rien toucher.</div>' +
        '<button type="button" class="btn btn-secondary posteAnnuler">Annuler</button>' +
      '</div>';
    document.body.appendChild(fond);
    const ch = fond.querySelector('input'), msg = fond.querySelector('.posteMsg');
    let occupe = false;
    const finir = (ok) => { fond.remove(); posteClavierOuvert = null; fin(ok); };
    const valider = async () => {
      const code = ch.value.trim();
      if(occupe) return;
      if(code.length < 6){ msg.textContent = 'Le code compte au moins 6 chiffres.'; return; }
      occupe = true;
      msg.style.color = 'var(--muted)';
      msg.textContent = 'Vérification…';
      try{
        const r = await fetchFiable(CONFIG.AUTH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code }) });
        const d = await r.json().catch(() => ({}));
        if(!r.ok || !d.ok){
          msg.style.color = 'var(--warn-text)';
          msg.textContent = d.error || 'Code incorrect.';
          ch.value = '';
          occupe = false;
          return;
        }
        posteQui = { code: code, nom: d.moniteur || '' };
        ACCES.code = code;
        ACCES.moniteur = d.moniteur || '';
        posteDernierGeste = Date.now();
        majBandeauPoste();
        finir(true);
      }catch(e){
        msg.style.color = 'var(--warn-text)';
        msg.textContent = 'Connexion impossible : ' + ((e && e.message) || e);
        occupe = false;
      }
    };
    fond.querySelector('.cnxPave').addEventListener('click', e => {
      const b = e.target.closest('button[data-k]');
      if(!b) return;
      const k = b.dataset.k;
      if(k === 'ok') return valider();
      if(k === 'eff') ch.value = ch.value.slice(0, -1);
      else if(ch.value.length < 8) ch.value += k;
      msg.textContent = '';
    });
    ch.addEventListener('keydown', e => {
      if(e.key === 'Enter'){ e.preventDefault(); valider(); }
      if(e.key === 'Escape'){ e.preventDefault(); finir(false); }
    });
    fond.querySelector('.posteAnnuler').addEventListener('click', () => finir(false));
    setTimeout(() => ch.focus(), 30);
  });
  return posteClavierOuvert;
}

/* Une fonction de l'écran du code, qui demande d'abord le code */
function posteAvecCode(f, raison){
  const g = async function(){
    const r = (typeof raison === 'function') ? raison.apply(this, arguments) : raison;
    if(r === null) return f.apply(this, arguments);       /* rien à demander */
    if(!await posteDemanderCode(r)) return;
    return f.apply(this, arguments);
  };
  g.posteEnveloppe = true;
  return g;
}

function posteRemplacer(nom, fabrique){
  const f = window[nom];
  if(typeof f !== 'function' || f.posteEnveloppe) return;
  const g = fabrique(f);
  g.posteEnveloppe = true;
  window[nom] = g;
}

function posteEnvelopper(){
  /* Toutes les requêtes du classeur partent avec la clé de l'ordinateur,
     sauf quand quelqu'un vient de taper son code : c'est alors le sien. */
  if(!window.fetch.posteEnveloppe){
    const f0 = window.fetch;
    const f1 = function(url, init){
      try{
        if(posteInfos && String(url) === CONFIG.SHEETS_PROXY_URL && init && typeof init.body === 'string'){
          const c = JSON.parse(init.body);
          if(c && typeof c === 'object' && !c.code){
            c.poste = posteInfos.jeton;
            delete c.code;
            init = Object.assign({}, init, { body: JSON.stringify(c) });
          }
        }
      }catch(e){}
      return f0.call(this, url, init);
    };
    f1.posteEnveloppe = true;
    window.fetch = f1;
  }

  /* Un geste refusé faute de code : le clavier, puis l'appel repart */
  posteRemplacer('appelPrep', f => async function(corps){
    try{ return await f.apply(this, arguments); }
    catch(e){
      if(e && e.posteRetire){ posteRetire(); throw e; }
      if(!(e && e.codeRequis) || POSTE_GESTES.indexOf(corps && corps.action) === -1) throw e;
      if(!await posteDemanderCode('Pour continuer')) throw new Error('🔑 Il faut ton code pour faire ça.');
      return await f.apply(this, arguments);
    }
  });

  posteRemplacer('visioLancer', f => posteAvecCode(f, () =>
    'Pour lancer la séance ' + ((typeof visioChoix !== 'undefined' && visioChoix.numero) || '') + ' en visio'));
  posteRemplacer('visioReprendre', f => posteAvecCode(f, () => posteCoursOuvert() ? null : 'Pour reprendre le cours en visio'));
  posteRemplacer('ouvrirArdoisesEtg', f => posteAvecCode(f, 'Pour saisir des ardoises'));
  posteRemplacer('ouvrirSaisieEtg', f => posteAvecCode(f, (eleve, seance) =>
    'Pour renseigner la séance ' + (seance || '') + (eleve ? ' de ' + eleve : '')));

  /* Ce qui n'est pas pour la salle : ♿ Code aménagé, 🚦 l'atelier du jeu */
  posteRemplacer('afficherCode', f => async function(){
    try{ vueCode = 'salle'; }catch(e){}
    const r = await f.apply(this, arguments);
    const zone = $('codeZone');
    if(zone){
      const barre = zone.firstElementChild;
      if(barre && barre.id !== 'codeSousZone' && /Code aménagé/.test(barre.textContent)) barre.style.display = 'none';
      if(!$('postePied')){
        const pied = document.createElement('div');
        pied.id = 'postePied';
        pied.className = 'cdAide posteBas';
        pied.innerHTML = '<span>🖥️ Ordinateur de la salle de code · ' + posteEch(posteNomSalle(posteInfos.salle)) +
          (posteInfos.creePar ? ' · installé par ' + posteEch(posteInfos.creePar) + (posteInfos.creeLe ? ' le ' + posteDate(posteInfos.creeLe) : '') : '') +
          ' · ne montre que le code</span><span>Pour l’enlever : Gestion › Accès › 🖥️ Les ordinateurs des salles</span>';
        zone.appendChild(pied);
      }
    }
    return r;
  });
  posteRemplacer('barreCorrigesEtg', f => function(){
    const b = f.apply(this, arguments);
    if(b) b.querySelectorAll('button').forEach(x => { if(/jeu du code/i.test(x.textContent)) x.remove(); });
    return b;
  });
  /* La messagerie ne s'ouvre pas d'ici */
  posteRemplacer('visioDessiner', f => function(){
    const r = f.apply(this, arguments);
    document.querySelectorAll('#vsCarte .vsActs button').forEach(x => { if(/Le groupe/.test(x.textContent)) x.remove(); });
    return r;
  });
}

/* La clé ne vaut plus : on oublie, on repasse par « Installer » */
function posteRetire(){
  try{ localStorage.removeItem(CLE_POSTE); }catch(e){}
  try{ sessionStorage.setItem('ec_poste_msg', 'Cet ordinateur a été retiré de la salle de code : un admin doit le réinstaller.'); }catch(e){}
  if(!posteRetire.fait){ posteRetire.fait = true; setTimeout(() => location.reload(), 300); }
}

/* ------------------------------------------------------------
   ④ GESTION › ACCÈS — LES ORDINATEURS DES SALLES
   ------------------------------------------------------------ */
async function chargerPostesSalle(){
  const z = $('postesZone');
  if(!z) return;
  if(window.EC_POSTE || !ACCES || ACCES.role !== 'admin'){ z.innerHTML = ''; z.style.display = 'none'; return; }
  z.style.display = '';
  const adresse = location.origin + location.pathname.replace(/index\.html$/, '') + '?poste=1';
  z.innerHTML = '<div class="section-title">🖥️ Les ordinateurs des salles</div>' +
    '<div class="cdAide posteAideG">Un ordinateur installé s’ouvre tout seul sur la salle de code, sans prénom ni code, et ne montre que le code. ' +
    'Pour lancer une visio ou saisir des résultats, chacun y tape son code. Pour en installer un : sur l’ordinateur de la salle, ouvrir ' +
    '<b>' + posteEch(adresse) + '</b> (à mettre en page d’accueil de Chrome), puis un admin choisit la salle et tape son prénom et son code.</div>' +
    '<div class="posteListe">' + (typeof htmlAttente === 'function' ? htmlAttente('Lecture des ordinateurs…') : '⏳') + '</div>';
  const l = z.querySelector('.posteListe');
  let d;
  try{ d = await appelPrep({ action: 'postesListe' }); }
  catch(e){ l.innerHTML = '<div class="cdAide">⚠️ ' + posteEch((e && e.message) || e) + '</div>'; return; }
  const postes = (d && d.postes) || [];
  if(!postes.length){ l.innerHTML = '<div class="cdAide">Aucun ordinateur installé pour l’instant.</div>'; return; }
  l.innerHTML = '';
  const auj = posteDate(Date.now());
  postes.forEach(p => {
    const r = document.createElement('div');
    r.className = 'posteLigne';
    const vu = p.vuLe ? (posteDate(p.vuLe) === auj ? 'encore vu aujourd’hui' : 'vu pour la dernière fois le ' + posteDate(p.vuLe)) : '';
    r.innerHTML = '<span><b>🎓 Salle de code · ' + posteEch(posteNomSalle(p.salle)) + '</b><small>installé par ' + posteEch(p.creePar || '?') +
      ' le ' + posteDate(p.creeLe) + (vu ? ' · ' + vu : '') + '</small></span>';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-secondary';
    b.textContent = 'Retirer';
    b.addEventListener('click', async () => {
      const ok = (typeof confirmer === 'function')
        ? await confirmer('Retirer l’ordinateur de la salle de code de ' + posteNomSalle(p.salle) + ' ?\n\nIl ne s’ouvrira plus : il faudra le réinstaller.', 'Retirer', true)
        : window.confirm('Retirer cet ordinateur ?');
      if(!ok) return;
      b.disabled = true;
      try{
        await appelPrep({ action: 'posteRetirer', id: p.id });
        if(typeof showToast === 'function') showToast('🖥️ Ordinateur retiré');
        chargerPostesSalle();
      }catch(e){
        b.disabled = false;
        if(typeof showToast === 'function') showToast('⚠️ ' + ((e && e.message) || e));
      }
    });
    r.appendChild(b);
    l.appendChild(r);
  });
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-salle-code.js'] = true;
