/* Déployé le 21/10/2026 à 10:24 — v1224 */
/* ============================================================
   ec-direct.js
   🗺️ Les voitures en direct — Gestion › Le parc › En direct,
   et le petit envoi de position du téléphone du moniteur
   Application Bilan de conduite — Évolution Conduites

   David, le 12 octobre : « une carte avec la position des véhicules
   en temps réel grâce à la remontée des points GPS ». Ses
   arbitrages : le téléphone du moniteur, pendant un cours, page
   ouverte ; la dernière position seulement ; rien d'enregistré ;
   administrateurs seuls.

   ⚠️ LA CNIL : AUCUNE VITESSE, AUCUN HISTORIQUE. Le téléphone
   n'envoie que latitude, longitude, le nom de la voiture et le
   site. Le Worker la remet au Durable Object de la messagerie en
   direct, qui la garde EN MÉMOIRE et l'efface 2 min après le
   dernier signe.

   📍 v1224 — ET UN SEUL POINT PAR VOITURE EST GARDÉ (choix de
   David) : la dernière position connue, remplacée à chaque signal,
   effacée au retour au bureau. Voir le Worker, « LA DERNIÈRE
   POSITION CONNUE DE CHAQUE VOITURE ».

   ⚠️ LE RELEVÉ DU TRAJET RESTE LE SEUL CAPTEUR. Ce fichier ne pose
   aucune veille GPS à lui : il reçoit les positions que le relevé
   du trajet (ec-trajet.js) lit déjà, et n'existe donc que pour les
   moniteurs qui ont ce relevé (⚙️ Accès › 🗺️ Trajet du cours).
   ============================================================ */

const VOITURE_PARTAGE_PAS = 30000;     /* une position toutes les 30 s */
const VOITURE_SANS_SIGNAL = 60000;     /* au-delà : grisée, hors de la carte */
const VOITURE_EFFACEE = 120000;        /* au-delà : partie (le serveur l'a oubliée) */
const VOITURE_FIX_VIEUX = 300000;      /* une position plus vieille ne part pas */
const VOITURE_PRECISION_MAX = 100;     /* mètres */
const VOITURE_ZOOM_MAX = 16;
const VOITURE_ZOOM_MIN = 9;

/* Sans voiture en cours, la carte montre nos deux villes */
const VOITURES_PAR_DEFAUT = [
  { lat: 48.5136, lon: -2.7603 },   /* Saint-Brieuc */
  { lat: 48.1779, lon: -2.7536 }    /* Loudéac */
];


/* ============================================================
   CÔTÉ MONITEUR — LA POSITION DU COURS
   ============================================================ */
const partageVoiture = { fix: null, dernier: 0, ok: 0, coupe: false,
                         enVol: false, minuteur: null };

/* Appelée par la veille du trajet à chaque position reçue. On garde
   la dernière, et seulement elle : latitude, longitude, et l'heure
   de LA PAGE (pour ne pas envoyer une position vieille de dix
   minutes). La vitesse que le téléphone fournit n'est pas lue. */
function noterLaPositionPourLeDirect(pos){
  if(partageVoiture.coupe || !pos || !pos.coords) return;
  const c = pos.coords;
  if(typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return;
  if(typeof c.accuracy === 'number' && c.accuracy > VOITURE_PRECISION_MAX) return;
  partageVoiture.fix = { lat: c.latitude, lon: c.longitude, t: Date.now() };

  /* ⚠️ UN MINUTEUR EN PLUS DE LA VEILLE. Un iPhone arrêté à un feu
     ne donne plus de position : sans lui, la voiture disparaîtrait
     de la carte au bout de deux minutes de bouchon. La dernière
     position connue repart donc toutes les 30 s, tant que le
     relevé tourne. */
  if(!partageVoiture.minuteur){
    partageVoiture.minuteur = setInterval(envoyerLaPositionDuCours, 10000);
  }
  envoyerLaPositionDuCours();
}

async function envoyerLaPositionDuCours(){
  if(partageVoiture.coupe){ arreterLeMinuteurDuPartage(); return; }
  if(typeof releveEnCours === 'function' && !releveEnCours()){
    finirLePartageDePosition();
    return;
  }
  if(typeof aDroit !== 'function' || !aDroit('trajet')) return;
  if(typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  const f = partageVoiture.fix;
  if(!f || Date.now() - f.t > VOITURE_FIX_VIEUX) return;
  if(partageVoiture.enVol) return;
  if(partageVoiture.dernier && Date.now() - partageVoiture.dernier < VOITURE_PARTAGE_PAS) return;
  if(typeof appelPrep !== 'function') return;

  partageVoiture.dernier = Date.now();
  partageVoiture.enVol = true;
  try{
    let voiture = '';
    try{
      voiture = (typeof lireLaVoitureDuCours === 'function') ? await lireLaVoitureDuCours() : '';
    }catch(e){ voiture = ''; }
    const site = (typeof $ === 'function' && $('site') && $('site').value) || '';
    const r = await appelPrep({ action: 'positionVoiture', lat: f.lat, lon: f.lon,
                                voiture: voiture, site: site });
    if(r && r.partage === false){
      /* Le Worker n'a pas la liaison : on se tait pour la session */
      partageVoiture.coupe = true;
      partageVoiture.ok = 0;
      arreterLeMinuteurDuPartage();
    }else if(r && r.status === 'ok'){
      partageVoiture.ok = Date.now();
    }
  }catch(e){
    /* Un envoi raté ne dit rien au moniteur : le suivant repart */
  }finally{
    partageVoiture.enVol = false;
    if(typeof dessinerEtatDuTrajet === 'function') dessinerEtatDuTrajet();
  }
}

function arreterLeMinuteurDuPartage(){
  clearInterval(partageVoiture.minuteur);
  partageVoiture.minuteur = null;
}

/* Le cours se termine : la voiture quitte la carte tout de suite,
   sans attendre ses deux minutes. */
function finirLePartageDePosition(){
  arreterLeMinuteurDuPartage();
  const avait = partageVoiture.ok && !partageVoiture.coupe;
  partageVoiture.fix = null;
  partageVoiture.dernier = 0;
  partageVoiture.ok = 0;
  if(avait && typeof appelPrep === 'function'){
    appelPrep({ action: 'positionVoiture', fin: true }).catch(() => {});
  }
}

/* Pour la ligne du trajet : « · 📡 position partagée » */
function positionPartagee(){
  return !!partageVoiture.ok && !partageVoiture.coupe &&
         (Date.now() - partageVoiture.ok) < 75000;
}


/* ============================================================
   CÔTÉ BUREAU — LA CARTE

   📍 v1224 — David : « il faut que j'aie les dernières positions
   connues ; si pas de position, une bulle “dernière position connue”
   avec la date et l'heure ; et que je puisse dire si la voiture est
   de nouveau au bureau. J'ai besoin de savoir où sont les véhicules
   en temps réel avec les infos que l'on a ».

   Trois états par voiture, dans cet ordre :
     📡 en direct (un téléphone l'envoie en ce moment) ;
     📍 dernière position connue (gardée par le Worker : UN point par
        voiture, remplacé, sans historique) ;
     🏠 au bureau (le bouton, ou toute seule à moins de 150 m) —
        sinon ❔ position inconnue.
   Et pour chacune, d'après le planning d'aujourd'hui et de demain :
   qui l'a (le cours en cours), et quand elle ressort.
   ============================================================ */
const VOITURE_INFOS_PAS = 300000;      /* le planning : toutes les 5 min */
const VOITURE_COURS_MINUTES = 150;     /* un cours commencé il y a moins de 2 h 30 est « en cours » */

const etatCarteDirect = { voitures: [], dernieres: [], infos: null, infosLu: 0,
                          branche: true, suivie: '', lu: 0,
                          minuteur: null, horloge: null, cleVue: '',
                          etats: '' };

function carteDirectSousLesYeux(){
  const c = $('directCard');
  return !!(c && c.offsetParent !== null && document.visibilityState === 'visible' &&
            typeof ongletActif !== 'undefined' && ongletActif === 'gestion' &&
            typeof vueActive !== 'undefined' && vueActive.gestion === 'direct');
}

async function afficherVoituresEnDirect(){
  if(typeof ACCES === 'undefined' || ACCES.role !== 'admin') return;
  if(!$('directCarte')) return;
  await Promise.all([relireLesVoituresEnDirect(true), relireLesInfosDesVoitures()]);
  dessinerVoituresEnDirect(true);

  clearInterval(etatCarteDirect.minuteur);
  etatCarteDirect.minuteur = setInterval(() => {
    if(!carteDirectSousLesYeux()) return;
    relireLesVoituresEnDirect(false);
    if(Date.now() - etatCarteDirect.infosLu > VOITURE_INFOS_PAS) relireLesInfosDesVoitures().then(() => dessinerVoituresEnDirect(true));
  }, 15000);
  clearInterval(etatCarteDirect.horloge);
  etatCarteDirect.horloge = setInterval(() => {
    if(carteDirectSousLesYeux()) dessinerVoituresEnDirect();
  }, 1000);
}

async function relireLesVoituresEnDirect(forcer){
  let r;
  try{
    r = await appelPrep({ action: 'voituresEnDirect' });
  }catch(e){
    if(forcer){
      const z = $('directListe');
      if(z) z.innerHTML = '<div class="empty">⚠️ ' + echapper(String((e && e.message) || e)) + '</div>';
      dessinerLeFondDirect([], []);
    }
    return;
  }
  const maintenant = Date.now();
  etatCarteDirect.branche = !(r && r.branche === false);
  /* L'âge arrive du serveur ; l'heure se refait ici, sur l'horloge
     de cet écran — celle du téléphone qui regarde peut être fausse. */
  etatCarteDirect.voitures = ((r && r.voitures) || []).map(v => Object.assign({}, v, {
    recu: maintenant - (Number(v.age) || 0)
  }));
  /* 📍 La dernière position connue : son heure vient d'un âge, elle
     aussi — et elle se lit en date et heure. */
  etatCarteDirect.dernieres = ((r && r.dernieres) || []).map(d => Object.assign({}, d, {
    quand: d.age === null || d.age === undefined ? 0 : maintenant - Number(d.age),
    auBureauQuand: d.auBureauAge === null || d.auBureauAge === undefined ? 0 : maintenant - Number(d.auBureauAge)
  }));
  etatCarteDirect.lu = maintenant;
  etatCarteDirect.etats = '';
  dessinerVoituresEnDirect(true);
}

async function relireLesInfosDesVoitures(){
  try{
    const r = await appelPrep({ action: 'voituresInfos' });
    if(r && r.status === 'ok'){ etatCarteDirect.infos = r; etatCarteDirect.infosLu = Date.now(); }
  }catch(e){ /* sans le planning, la carte reste lisible */ }
}

/* Le logo de la voiture : celui de sa catégorie dans la Flotte,
   quand la Flotte est chargée ; 🚙 pour une Q-quelque-chose. */
function emojiDeLaVoiture(nom){
  const n = cleDeVoitureDirect(nom);
  const flotteVue = (etatCarteDirect.infos && etatCarteDirect.infos.flotte) ||
                    ((typeof flotte !== 'undefined' && Array.isArray(flotte)) ? flotte : []);
  if(typeof CATEGORIES_FLOTTE !== 'undefined'){
    const v = flotteVue.find(x => cleDeVoitureDirect(x.nom) === n);
    if(v && v.categorie && v.categorie !== 'voiture'){
      const cat = CATEGORIES_FLOTTE.find(c => c.cle === v.categorie);
      if(cat) return String(cat.nom).split(' ')[0];
    }
  }
  return /^q\s*\d/.test(n) ? '🚙' : '🚗';
}

function cleDeVoitureDirect(nom){
  return (typeof normaliserMot === 'function') ? normaliserMot(nom) : String(nom || '').toLowerCase().trim();
}

function ageEnMotsDirect(ms){
  const s = Math.max(0, Math.round(ms / 1000));
  if(s < 60) return s + ' s';
  const m = Math.floor(s / 60), r = s % 60;
  if(m < 60) return m + ' min' + (r ? ' ' + String(r).padStart(2, '0') : '');
  const h = Math.floor(m / 60);
  return h + ' h ' + String(m % 60).padStart(2, '0');
}

/* « 21/10 à 14:32 » — et « aujourd'hui à 14:32 » le jour même */
function dateHeureDirect(ms){
  const d = new Date(Number(ms) || 0);
  if(!Number(ms) || isNaN(d.getTime())) return '';
  const z = n => String(n).padStart(2, '0');
  const auj = new Date();
  const memeJour = d.getDate() === auj.getDate() && d.getMonth() === auj.getMonth() && d.getFullYear() === auj.getFullYear();
  return (memeJour ? 'aujourd’hui' : 'le ' + z(d.getDate()) + '/' + z(d.getMonth() + 1)) +
         ' à ' + z(d.getHours()) + ':' + z(d.getMinutes());
}

/* Les voitures, telles qu'on les connaît maintenant : une ligne par
   voiture de la Flotte, et une par voiture vue qui n'y est pas. */
function voituresConnuesDirect(){
  const maintenant = Date.now();
  const enDirect = etatCarteDirect.voitures.filter(v => maintenant - v.recu < VOITURE_EFFACEE);
  const parCle = {};
  const ordre = [];
  const fiche = (nom) => {
    const k = cleDeVoitureDirect(nom) || '?';
    if(!parCle[k]){ parCle[k] = { cle: k, nom: nom || 'Voiture ?', flotte: null, live: null, derniere: null }; ordre.push(k); }
    return parCle[k];
  };
  const fl = (etatCarteDirect.infos && etatCarteDirect.infos.flotte) || [];
  fl.forEach(v => { fiche(v.nom).flotte = v; });
  etatCarteDirect.dernieres.forEach(d => { fiche(d.voiture).derniere = d; });
  enDirect.forEach(v => {
    if(!v.voiture) return;
    const f = fiche(v.voiture);
    if(!f.live || v.recu > f.live.recu) f.live = v;
  });
  return ordre.map(k => {
    const f = parCle[k];
    const vivant = f.live && maintenant - f.live.recu < VOITURE_SANS_SIGNAL;
    const d = f.derniere;
    f.etat = vivant ? 'direct'
      : (d && d.auBureau) ? 'bureau'
      : (d && d.lat !== null && d.lat !== undefined) ? 'derniere'
      : (f.live) ? 'derniere'
      : 'inconnue';
    /* Une voiture en direct qui vient de perdre le signal : sa
       dernière position est celle du direct, plus fraîche que D1 */
    if(f.etat === 'derniere' && f.live && (!d || d.lat === null || d.lat === undefined || f.live.recu > (d.quand || 0))){
      f.point = { lat: f.live.lat, lon: f.live.lon, quand: f.live.recu, qui: f.live.qui };
    }else if(f.etat === 'derniere'){
      f.point = { lat: d.lat, lon: d.lon, quand: d.quand, qui: d.qui };
    }
    return f;
  });
}

/* Le planning de cette voiture : le cours en cours, le précédent, le suivant */
function coursDeLaVoitureDirect(nom){
  const inf = etatCarteDirect.infos;
  if(!inf || !Array.isArray(inf.cours)) return null;
  const k = cleDeVoitureDirect(nom);
  const siens = inf.cours.filter(c => cleDeVoitureDirect(c.voiture) === k)
    .sort((a, b) => (a.jour + a.heure).localeCompare(b.jour + b.heure));
  const z = n => String(n).padStart(2, '0');
  const t = new Date();
  const maintenant = z(t.getHours()) + ':' + z(t.getMinutes());
  const enMin = h => { const m = String(h || '').match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const now = enMin(maintenant);
  const auj = siens.filter(c => c.jour === inf.aujourdhui && enMin(c.heure) !== null);
  const commences = auj.filter(c => enMin(c.heure) <= now);
  const dernier = commences[commences.length - 1] || null;
  const enCours = dernier && (now - enMin(dernier.heure)) <= VOITURE_COURS_MINUTES ? dernier : null;
  const prochain = auj.find(c => enMin(c.heure) > now) ||
                   siens.find(c => c.jour === inf.demain) || null;
  return { enCours: enCours, dernier: enCours ? null : dernier, prochain: prochain, demain: inf.demain };
}

function libelleDuCoursDirect(c){
  const m = (typeof MODELES === 'object' && MODELES && MODELES[c.modele]) ? MODELES[c.modele].label : '';
  return c.heure + (c.moniteur ? ' avec ' + c.moniteur : '') + (m ? ' (' + m + ')' : '');
}

function dessinerVoituresEnDirect(forcer){
  const maintenant = Date.now();
  /* Celles qui ont dépassé deux minutes partent du direct (elles
     restent en « dernière position connue ») */
  etatCarteDirect.voitures = etatCarteDirect.voitures.filter(v => maintenant - v.recu < VOITURE_EFFACEE);
  const actives = etatCarteDirect.voitures.filter(v => maintenant - v.recu < VOITURE_SANS_SIGNAL);
  const connues = voituresConnuesDirect();
  const anciennes = connues.filter(f => f.etat === 'derniere' && f.point && isFinite(f.point.lat) && isFinite(f.point.lon));
  if(etatCarteDirect.suivie && !actives.some(v => v.cle === etatCarteDirect.suivie) &&
     !anciennes.some(f => 'd:' + f.cle === etatCarteDirect.suivie) &&
     !bureauxDirect().some(b => 'b:' + b.id === etatCarteDirect.suivie)){
    etatCarteDirect.suivie = '';
  }

  /* La seconde qui passe ne redessine que les « il y a » ; une
     voiture qui change d'état redessine tout. */
  const etats = connues.map(f => f.cle + ':' + f.etat).join('|') + '#' +
                etatCarteDirect.voitures.map(v => v.cle + (maintenant - v.recu < VOITURE_SANS_SIGNAL ? '+' : '-')).join('|') +
                '#' + etatCarteDirect.suivie + '#' + etatCarteDirect.branche + '#' + etatCarteDirect.infosLu + '#' + etatCarteDirect.lu;
  if(!forcer && etats === etatCarteDirect.etats){
    document.querySelectorAll('#directCard [data-recu]').forEach(s => {
      const age = maintenant - Number(s.getAttribute('data-recu'));
      const genre = s.getAttribute('data-genre');
      if(genre === 'vu') s.textContent = 'il y a ' + ageEnMotsDirect(age);
    });
    return;
  }
  etatCarteDirect.etats = etats;

  dessinerLeFondDirect(actives, anciennes);
  dessinerLaListeDirect(actives, connues);
}

/* 🏠 Les bureaux connus du Worker (leur adresse, géolocalisée) */
function bureauxDirect(){
  return (etatCarteDirect.infos && etatCarteDirect.infos.bureaux) || [];
}
function bureauDuNomDirect(nom){
  const k = cleDeVoitureDirect(nom);
  return bureauxDirect().find(b => cleDeVoitureDirect(b.nom) === k) || null;
}

/* ---- la carte : les tuiles du Plan IGN, et les pastilles ---- */
function vueDeLaCarteDirect(points, L, H){
  const marge = 70;
  if(etatCarteDirect.suivie){
    const v = points.find(x => x.cle === etatCarteDirect.suivie);
    if(v) return { z: VOITURE_ZOOM_MAX, cx: carteX(v.lon, VOITURE_ZOOM_MAX), cy: carteY(v.lat, VOITURE_ZOOM_MAX) };
  }
  const pts = points.length ? points : VOITURES_PAR_DEFAUT;
  let latMin = 90, latMax = -90, lonMin = 180, lonMax = -180;
  pts.forEach(p => {
    latMin = Math.min(latMin, p.lat); latMax = Math.max(latMax, p.lat);
    lonMin = Math.min(lonMin, p.lon); lonMax = Math.max(lonMax, p.lon);
  });
  const centre = z => ({ z: z, cx: (carteX(lonMin, z) + carteX(lonMax, z)) / 2,
                                cy: (carteY(latMin, z) + carteY(latMax, z)) / 2 });
  for(let z = VOITURE_ZOOM_MAX; z >= VOITURE_ZOOM_MIN; z--){
    const l = Math.abs(carteX(lonMax, z) - carteX(lonMin, z));
    const h = Math.abs(carteY(latMin, z) - carteY(latMax, z));
    if(l <= L - marge * 2 && h <= H - marge * 2) return centre(z);
  }
  return centre(VOITURE_ZOOM_MIN);
}

function dessinerLeFondDirect(actives, anciennes){
  const boite = $('directCarte');
  if(!boite) return;
  anciennes = anciennes || [];
  const L = boite.clientWidth || 600;
  const H = Math.round(Math.min(380, Math.max(240, L * 0.48)));
  boite.style.height = H + 'px';

  const points = actives.map(v => ({ cle: v.cle, lat: v.lat, lon: v.lon }))
    .concat(anciennes.map(f => ({ cle: 'd:' + f.cle, lat: f.point.lat, lon: f.point.lon })));
  /* 🏠 Un bureau compte dans le cadrage s'il a des voitures, ou si on l'a choisi */
  const auBureau = {};
  voituresConnuesDirect().forEach(f => {
    if(f.etat !== 'bureau') return;
    const b = bureauDuNomDirect(f.derniere.auBureau);
    if(b) (auBureau[b.id] = auBureau[b.id] || []).push(f.nom);
  });
  bureauxDirect().forEach(b => {
    if(etatCarteDirect.suivie === 'b:' + b.id || (auBureau[b.id] || []).length) points.push({ cle: 'b:' + b.id, lat: b.lat, lon: b.lon });
  });
  const vue = vueDeLaCarteDirect(points, L, H);
  const gauche = vue.cx - L / 2, haut = vue.cy - H / 2;

  /* Les tuiles ne se refont que si la vue a bougé : sinon la carte
     clignoterait toutes les quinze secondes. */
  const cleVue = vue.z + ':' + Math.round(gauche) + ':' + Math.round(haut) + ':' + L + 'x' + H;
  let tuiles = boite.querySelector('.tuilesDirect');
  if(!tuiles || cleVue !== etatCarteDirect.cleVue){
    etatCarteDirect.cleVue = cleVue;
    boite.innerHTML = '';
    tuiles = document.createElement('div');
    tuiles.className = 'tuilesDirect';
    tuiles.style.cssText = 'position:absolute;inset:0;';
    const base = (typeof CONFIG === 'object' && CONFIG && CONFIG.WORKER_URL) ? CONFIG.WORKER_URL : '';
    const T = 256, max = Math.pow(2, vue.z);
    for(let tx = Math.floor(gauche / T); tx <= Math.floor((gauche + L) / T); tx++){
      for(let ty = Math.floor(haut / T); ty <= Math.floor((haut + H) / T); ty++){
        if(tx < 0 || ty < 0 || tx >= max || ty >= max) continue;
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        img.style.cssText = 'position:absolute;width:256px;height:256px;max-width:none;' +
          'left:' + Math.round(tx * T - gauche) + 'px;top:' + Math.round(ty * T - haut) + 'px;';
        /* Une tuile qui ne vient pas laisse le fond crème, pas
           l'icône d'image cassée */
        img.onerror = () => { img.style.visibility = 'hidden'; };
        img.src = base + '/tuile?z=' + vue.z + '&x=' + tx + '&y=' + ty;
        tuiles.appendChild(img);
      }
    }
    boite.appendChild(tuiles);
    const mention = document.createElement('div');
    mention.style.cssText = 'position:absolute;right:6px;bottom:6px;font-size:11px;color:#3A3B37;' +
      'background:rgba(255,255,255,.82);border-radius:6px;padding:2px 7px;';
    mention.textContent = 'Plan IGN — © IGN/Géoportail';
    boite.appendChild(mention);
  }

  /* Ce qui se pose par-dessus se refait à chaque fois */
  boite.querySelectorAll('.surCarteDirect').forEach(x => x.remove());

  if(!actives.length && !anciennes.length){
    const vide = document.createElement('div');
    vide.className = 'surCarteDirect';
    vide.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
      'background:rgba(255,255,255,.82);color:#3A3B37;border-radius:10px;padding:10px 16px;' +
      'font-size:14px;text-align:center;max-width:calc(100% - 32px);';
    vide.textContent = 'Aucune voiture en cours en ce moment.';
    boite.appendChild(vide);
  }

  /* 📍 Les dernières positions connues d'abord : les voitures en
     direct passent par-dessus. Grises, avec la date et l'heure. */
  const pastille = (x, y, fond, bord, html, classe) => {
    if(x < -20 || y < -20 || x > L + 20 || y > H + 20) return;
    const m = document.createElement('div');
    m.className = 'surCarteDirect ' + classe;
    m.style.cssText = 'position:absolute;left:' + Math.round(x) + 'px;top:' + Math.round(y) + 'px;width:0;height:0;';
    m.innerHTML =
      '<span style="position:absolute;left:-7px;top:-7px;width:14px;height:14px;border-radius:50%;' +
        'background:' + fond + ';border:2.5px solid ' + bord + ';box-sizing:border-box;"></span>' +
      '<span style="position:absolute;left:0;bottom:14px;transform:translateX(-50%);white-space:nowrap;' +
        'background:' + (classe === 'marqueVoiture' ? '#14161B' : '#F2F2EC') + ';color:' + (classe === 'marqueVoiture' ? '#C9CBC4' : '#3A3B37') + ';' +
        'border:1px solid ' + (classe === 'marqueVoiture' ? '#14161B' : '#B9BAB2') + ';' +
        'border-radius:8px;padding:5px 10px;font-size:13px;line-height:1.3;box-shadow:0 2px 6px rgba(0,0,0,.25);">' + html + '</span>';
    boite.appendChild(m);
  };
  bureauxDirect().forEach(b => {
    const l = auBureau[b.id] || [];
    if(!l.length && etatCarteDirect.suivie !== 'b:' + b.id) return;
    pastille(carteX(b.lon, vue.z) - gauche, carteY(b.lat, vue.z) - haut, '#FFFFFF', '#3B6900',
      '🏠 <strong>Bureau de ' + echapper(b.nom) + '</strong>' +
      (l.length ? ' · ' + echapper(l.join(', ')) : ' · aucune voiture'), 'marqueBureau');
  });
  anciennes.forEach(f => {
    pastille(carteX(f.point.lon, vue.z) - gauche, carteY(f.point.lat, vue.z) - haut, '#9A9B94', '#3A3B37',
      echapper(emojiDeLaVoiture(f.nom)) + ' <strong>' + echapper(f.nom) + '</strong> · dernière position ' +
      echapper(dateHeureDirect(f.point.quand)), 'marqueAncienne');
  });
  actives.forEach(v => {
    pastille(carteX(v.lon, vue.z) - gauche, carteY(v.lat, vue.z) - haut, '#B6FF0E', '#14161B',
      echapper(emojiDeLaVoiture(v.voiture)) + ' <strong style="color:#B6FF0E;">' +
      echapper((v.voiture || 'Voiture ?') + ' · ' + (v.qui || '')) + '</strong> · ' +
      '<span data-recu="' + v.recu + '" data-genre="vu">il y a ' + ageEnMotsDirect(Date.now() - v.recu) + '</span>', 'marqueVoiture');
  });

  if(etatCarteDirect.suivie){
    const retour = document.createElement('button');
    retour.type = 'button';
    retour.className = 'surCarteDirect';
    retour.style.cssText = 'position:absolute;left:8px;top:8px;width:auto;border:1px solid #DCDCD3;' +
      'background:rgba(255,255,255,.92);color:#14161B;border-radius:999px;padding:6px 12px;' +
      'font-size:13px;font-weight:700;cursor:pointer;';
    retour.textContent = '← Toutes les voitures';
    retour.addEventListener('click', () => { etatCarteDirect.suivie = ''; dessinerVoituresEnDirect(true); });
    boite.appendChild(retour);
  }
}

/* ---- la liste sous la carte : TOUTES les voitures ---- */
function dessinerLaListeDirect(actives, connues){
  const z = $('directListe');
  if(!z) return;
  z.innerHTML = '';
  const maintenant = Date.now();

  if(!etatCarteDirect.branche){
    const w = document.createElement('div');
    w.style.cssText = 'border:1px solid var(--red);background:var(--warn-bg);color:var(--warn-text);' +
      'border-radius:10px;padding:10px 12px;margin-top:12px;font-size:13px;line-height:1.5;';
    w.innerHTML = '⚠️ <strong>Le direct attend un réglage dans Cloudflare</strong> : la liaison ' +
      '« FIL » du Worker (la même que la messagerie en direct). Les dernières positions connues, ' +
      'elles, restent à jour.';
    z.appendChild(w);
  }

  connues = connues || voituresConnuesDirect();
  /* Les voitures en direct qui n'ont pas de nom : on les montre quand même */
  const sansNom = actives.filter(v => !v.voiture);
  if(!connues.length && !sansNom.length) return;

  const rang = { direct: 0, derniere: 1, bureau: 2, inconnue: 3 };
  const tri = connues.slice().sort((a, b) => (rang[a.etat] - rang[b.etat]) ||
    String((a.flotte && a.flotte.numero) || a.nom).localeCompare(String((b.flotte && b.flotte.numero) || b.nom), 'fr', { numeric: true }));
  const nb = e => tri.filter(f => f.etat === e).length;

  const t = document.createElement('div');
  t.className = 'titreDirect';
  t.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent-text);margin:14px 0 4px;';
  t.textContent = 'Toutes les voitures · ' + tri.length + '  —  📡 ' + (nb('direct') + sansNom.length) +
    ' en direct · 📍 ' + nb('derniere') + ' dernière position · 🏠 ' + nb('bureau') + ' au bureau' +
    (nb('inconnue') ? ' · ❔ ' + nb('inconnue') : '');
  z.appendChild(t);

  /* 🔍 v1224 — David : « que je puisse cliquer dessus pour zoomer sur
     la carte ». Toute la ligne : en direct ou dernière position, on
     zoome sur elle ; au bureau, sur le bureau. */
  const cibleDeLaLigne = (f) => {
    if(f.etat === 'direct' && f.live) return f.live.cle;
    if(f.etat === 'derniere' && f.point) return 'd:' + f.cle;
    if(f.etat === 'bureau'){ const b = bureauDuNomDirect(f.derniere.auBureau); return b ? 'b:' + b.id : ''; }
    return '';
  };
  const zoomer = (cible) => {
    etatCarteDirect.suivie = cible;
    dessinerVoituresEnDirect(true);
    const cc = $('directCarte');
    if(cc && cc.scrollIntoView) cc.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const ligne = (f) => {
    const l = document.createElement('div');
    const cible = cibleDeLaLigne(f);
    l.className = 'ligneDirect etat-' + f.etat + (cible && cible === etatCarteDirect.suivie ? ' suivieDirect' : '');
    l.style.cssText = 'display:flex;gap:12px;align-items:flex-start;padding:10px 8px;' +
      'border-bottom:1px solid var(--line);font-size:14px;line-height:1.5;' +
      (cible ? 'cursor:pointer;' : '') +
      (cible && cible === etatCarteDirect.suivie ? 'background:var(--orange-soft);border-radius:10px;' : '');
    if(cible){
      l.setAttribute('role', 'button');
      l.title = 'Zoomer sur la carte';
      l.addEventListener('click', ev => {
        if(ev.target && ev.target.closest && ev.target.closest('button')) return;
        zoomer(cible);
      });
    }else{
      l.addEventListener('click', ev => {
        if(ev.target && ev.target.closest && ev.target.closest('button')) return;
        if(typeof showToast === 'function') showToast('Pas de position connue pour « ' + f.nom + ' ».');
      });
    }
    const ic = document.createElement('span');
    ic.style.cssText = 'flex-shrink:0;font-size:18px;width:24px;text-align:center;';
    ic.textContent = f.etat === 'direct' ? emojiDeLaVoiture(f.nom) : f.etat === 'derniere' ? '📍' : f.etat === 'bureau' ? '🏠' : '❔';
    l.appendChild(ic);

    const txt = document.createElement('div');
    txt.style.cssText = 'flex:1;min-width:0;overflow-wrap:anywhere;';
    let h = '<strong>' + echapper(f.nom) + '</strong>' +
      (f.flotte && f.flotte.boite ? ' <span style="color:var(--muted);font-size:12px;">' + echapper(f.flotte.boite) + '</span>' : '');
    if(f.etat === 'direct'){
      h += ' · ' + echapper(f.live.qui || '') +
        '<div style="font-size:13px;color:var(--muted);">📡 En direct · vu <span data-recu="' + f.live.recu +
        '" data-genre="vu">il y a ' + ageEnMotsDirect(maintenant - f.live.recu) + '</span></div>';
    }else if(f.etat === 'derniere'){
      h += '<div style="font-size:13px;">📍 Dernière position connue : <strong>' + echapper(dateHeureDirect(f.point.quand)) +
        '</strong>' + (f.point.qui ? ' · ' + echapper(f.point.qui) : '') + '</div>';
    }else if(f.etat === 'bureau'){
      const d = f.derniere;
      h += '<div style="font-size:13px;color:var(--muted);">🏠 Au bureau de ' + echapper(d.auBureau) +
        (d.auBureauQuand ? ' depuis ' + echapper(dateHeureDirect(d.auBureauQuand)) : '') +
        (d.auBureauPar === 'auto' ? ' (revenue toute seule)' : d.auBureauPar ? ' (dit par ' + echapper(d.auBureauPar) + ')' : '') + '</div>';
    }else{
      h += '<div style="font-size:13px;color:var(--muted);">❔ Position inconnue</div>';
    }
    /* 🔧 au garage */
    const fl = f.flotte;
    const auj = etatCarteDirect.infos && etatCarteDirect.infos.aujourdhui;
    if(fl && (fl.etat === 'immobilise' || (fl.indispoDu && auj && auj >= fl.indispoDu && (!fl.indispoAu || auj <= fl.indispoAu)))){
      h += '<div style="font-size:13px;color:var(--warn-text);">🔧 Indisponible' + (fl.motifIndispo ? ' · ' + echapper(fl.motifIndispo) : '') + '</div>';
    }
    /* 🧑‍🏫 qui l'a, et quand elle ressort */
    const c = coursDeLaVoitureDirect(f.nom);
    if(c){
      if(c.enCours) h += '<div style="font-size:13px;">🧑‍🏫 En cours : ' + echapper(libelleDuCoursDirect(c.enCours)) + '</div>';
      else if(c.dernier) h += '<div style="font-size:13px;color:var(--muted);">Dernier cours : ' + echapper(libelleDuCoursDirect(c.dernier)) + '</div>';
      if(c.prochain){
        h += '<div style="font-size:13px;color:var(--muted);">⏭️ Prochain : ' +
          (c.prochain.jour === c.demain ? 'demain ' : '') + echapper(libelleDuCoursDirect(c.prochain)) + '</div>';
      }else if(etatCarteDirect.infos){
        h += '<div style="font-size:13px;color:var(--muted);">⏭️ Pas de cours prévu d’ici demain</div>';
      }
    }
    txt.innerHTML = h;
    l.appendChild(txt);

    const actions = document.createElement('div');
    actions.style.cssText = 'flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px;';
    const bouton = (texte, faire, classe) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = classe;
      b.style.cssText = 'width:auto;border:0;background:none;color:var(--accent-text);' +
        'font-size:14px;font-weight:700;padding:2px 4px;cursor:pointer;white-space:nowrap;margin:0;';
      b.textContent = texte;
      b.addEventListener('click', faire);
      actions.appendChild(b);
    };
    if(cible){
      bouton('📍 Centrer', () => zoomer(cible), 'centrerDirect');
    }
    if(f.etat === 'derniere' || f.etat === 'inconnue'){
      bouton('🏠 Revenue au bureau', () => direVoitureAuBureau(f), 'auBureauDirect');
    }
    l.appendChild(actions);
    return l;
  };

  tri.forEach(f => z.appendChild(ligne(f)));
  sansNom.forEach(v => z.appendChild(ligne({ cle: v.cle, nom: 'Voiture ?', etat: 'direct', live: v, flotte: null })));
}

/* 🏠 « Elle est revenue au bureau » : lequel ? Celui de la voiture
   d'abord (sa fiche Flotte), l'autre ensuite. */
async function direVoitureAuBureau(f){
  const site = cleDeVoitureDirect((f.flotte && f.flotte.site) || '');
  const choix = [
    { nom: '🏠 Saint-Brieuc', valeur: 'saint-brieuc', principal: !/loudeac/.test(site) },
    { nom: '🏠 Loudéac', valeur: 'loudeac', principal: /loudeac/.test(site) }
  ];
  if(/loudeac/.test(site)) choix.reverse();
  choix.unshift({ nom: 'Annuler', valeur: null });
  const b = (typeof fenetre === 'function')
    ? await fenetre('« ' + f.nom + ' » est revenue au bureau de… ?\n\nSa dernière position connue sera effacée.', choix, '🏠 Revenue au bureau')
    : null;
  if(!b) return;
  try{
    const r = await appelPrep({ action: 'voitureAuBureau', voiture: f.nom, bureau: b });
    if(r && r.status === 'error') throw new Error(r.message || 'refusé');
    if(typeof showToast === 'function') showToast('🏠 ' + f.nom + ' : au bureau');
    await relireLesVoituresEnDirect(true);
  }catch(e){
    if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e));
  }
}

/* Une carte se recalcule quand la fenêtre change de taille */
if(typeof window !== 'undefined'){
  window.addEventListener('resize', () => {
    if(typeof carteDirectSousLesYeux === 'function' && carteDirectSousLesYeux()){
      dessinerVoituresEnDirect(true);
    }
  });
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-direct.js'] = true;
