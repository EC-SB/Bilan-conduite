/* Déployé le 12/10/2026 — v1148 */
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
   dernier signe. Rien n'est écrit, nulle part.

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
   ============================================================ */
const etatCarteDirect = { voitures: [], branche: true, suivie: '', lu: 0,
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
  await relireLesVoituresEnDirect(true);

  clearInterval(etatCarteDirect.minuteur);
  etatCarteDirect.minuteur = setInterval(() => {
    if(carteDirectSousLesYeux()) relireLesVoituresEnDirect(false);
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
      dessinerLeFondDirect([]);
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
  etatCarteDirect.lu = maintenant;
  etatCarteDirect.etats = '';
  dessinerVoituresEnDirect(true);
}

/* Le logo de la voiture : celui de sa catégorie dans la Flotte,
   quand la Flotte est chargée ; 🚙 pour une Q-quelque-chose. */
function emojiDeLaVoiture(nom){
  const n = (typeof normaliserMot === 'function') ? normaliserMot(nom) : String(nom || '').toLowerCase();
  if(typeof flotte !== 'undefined' && Array.isArray(flotte) && typeof CATEGORIES_FLOTTE !== 'undefined'){
    const v = flotte.find(x => ((typeof normaliserMot === 'function') ? normaliserMot(x.nom) : String(x.nom || '').toLowerCase()) === n);
    if(v && v.categorie && v.categorie !== 'voiture'){
      const cat = CATEGORIES_FLOTTE.find(c => c.cle === v.categorie);
      if(cat) return String(cat.nom).split(' ')[0];
    }
  }
  return /^q\s*\d/.test(n) ? '🚙' : '🚗';
}

function ageEnMotsDirect(ms){
  const s = Math.max(0, Math.round(ms / 1000));
  if(s < 60) return s + ' s';
  const m = Math.floor(s / 60), r = s % 60;
  return m + ' min' + (r ? ' ' + String(r).padStart(2, '0') : '');
}

function dessinerVoituresEnDirect(forcer){
  const maintenant = Date.now();
  /* Celles qui ont dépassé deux minutes partent aussi d'ici */
  etatCarteDirect.voitures = etatCarteDirect.voitures.filter(v => maintenant - v.recu < VOITURE_EFFACEE);
  const actives = etatCarteDirect.voitures.filter(v => maintenant - v.recu < VOITURE_SANS_SIGNAL);
  if(etatCarteDirect.suivie && !actives.some(v => v.cle === etatCarteDirect.suivie)){
    etatCarteDirect.suivie = '';
  }

  /* La seconde qui passe ne redessine que les « il y a » ; une
     voiture qui change d'état redessine tout. */
  const etats = etatCarteDirect.voitures.map(v => v.cle + (maintenant - v.recu < VOITURE_SANS_SIGNAL ? '+' : '-')).join('|') +
                '#' + etatCarteDirect.suivie + '#' + etatCarteDirect.branche;
  if(!forcer && etats === etatCarteDirect.etats){
    document.querySelectorAll('#directCard [data-recu]').forEach(s => {
      const age = maintenant - Number(s.getAttribute('data-recu'));
      const genre = s.getAttribute('data-genre');
      if(genre === 'vu') s.textContent = 'il y a ' + ageEnMotsDirect(age);
      else if(genre === 'perdu') s.textContent = 'plus de signal depuis ' + ageEnMotsDirect(age);
      else if(genre === 'reste') s.textContent = 'elle disparaîtra dans ' + ageEnMotsDirect(VOITURE_EFFACEE - age);
    });
    return;
  }
  etatCarteDirect.etats = etats;

  dessinerLeFondDirect(actives);
  dessinerLaListeDirect(actives);
}

/* ---- la carte : les tuiles du Plan IGN, et les pastilles ---- */
function vueDeLaCarteDirect(actives, L, H){
  const marge = 70;
  if(etatCarteDirect.suivie){
    const v = actives.find(x => x.cle === etatCarteDirect.suivie);
    if(v) return { z: VOITURE_ZOOM_MAX, cx: carteX(v.lon, VOITURE_ZOOM_MAX), cy: carteY(v.lat, VOITURE_ZOOM_MAX) };
  }
  const pts = actives.length ? actives : VOITURES_PAR_DEFAUT;
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

function dessinerLeFondDirect(actives){
  const boite = $('directCarte');
  if(!boite) return;
  const L = boite.clientWidth || 600;
  const H = Math.round(Math.min(380, Math.max(240, L * 0.48)));
  boite.style.height = H + 'px';

  const vue = vueDeLaCarteDirect(actives, L, H);
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

  if(!actives.length){
    const vide = document.createElement('div');
    vide.className = 'surCarteDirect';
    vide.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
      'background:rgba(255,255,255,.82);color:#3A3B37;border-radius:10px;padding:10px 16px;' +
      'font-size:14px;text-align:center;max-width:calc(100% - 32px);';
    vide.textContent = 'Aucune voiture en cours en ce moment.';
    boite.appendChild(vide);
  }

  actives.forEach(v => {
    const x = carteX(v.lon, vue.z) - gauche, y = carteY(v.lat, vue.z) - haut;
    if(x < -20 || y < -20 || x > L + 20 || y > H + 20) return;
    const m = document.createElement('div');
    m.className = 'surCarteDirect marqueVoiture';
    m.style.cssText = 'position:absolute;left:' + Math.round(x) + 'px;top:' + Math.round(y) + 'px;width:0;height:0;';
    m.innerHTML =
      '<span style="position:absolute;left:-7px;top:-7px;width:14px;height:14px;border-radius:50%;' +
        'background:#B6FF0E;border:2.5px solid #14161B;box-sizing:border-box;"></span>' +
      '<span style="position:absolute;left:0;bottom:14px;transform:translateX(-50%);white-space:nowrap;' +
        'background:#14161B;color:#C9CBC4;border-radius:8px;padding:5px 10px;font-size:13px;line-height:1.3;' +
        'box-shadow:0 2px 6px rgba(0,0,0,.25);">' +
        echapper(emojiDeLaVoiture(v.voiture)) + ' <strong style="color:#B6FF0E;">' +
        echapper((v.voiture || 'Voiture ?') + ' · ' + (v.qui || '')) + '</strong> · ' +
        '<span data-recu="' + v.recu + '" data-genre="vu">il y a ' + ageEnMotsDirect(Date.now() - v.recu) + '</span>' +
        '<span style="position:absolute;left:50%;bottom:-5px;margin-left:-5px;width:0;height:0;' +
          'border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid #14161B;"></span>' +
      '</span>';
    boite.appendChild(m);
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

/* ---- la liste sous la carte ---- */
function dessinerLaListeDirect(actives){
  const z = $('directListe');
  if(!z) return;
  z.innerHTML = '';
  const maintenant = Date.now();

  if(!etatCarteDirect.branche){
    const w = document.createElement('div');
    w.style.cssText = 'border:1px solid var(--red);background:var(--warn-bg);color:var(--warn-text);' +
      'border-radius:10px;padding:10px 12px;margin-top:12px;font-size:13px;line-height:1.5;';
    w.innerHTML = '⚠️ <strong>La carte attend un réglage dans Cloudflare</strong> : la liaison ' +
      '« FIL » du Worker (la même que la messagerie en direct). Tant qu’elle manque, les ' +
      'téléphones n’envoient rien.';
    z.appendChild(w);
    return;
  }

  const toutes = etatCarteDirect.voitures.slice().sort((a, b) => b.recu - a.recu);
  if(!toutes.length) return;

  const t = document.createElement('div');
  t.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent-text);margin:14px 0 4px;';
  t.textContent = 'En cours maintenant · ' + actives.length;
  z.appendChild(t);

  toutes.forEach(v => {
    const age = maintenant - v.recu;
    const perdue = age >= VOITURE_SANS_SIGNAL;
    const l = document.createElement('div');
    l.className = 'ligneDirect';
    l.style.cssText = 'display:flex;gap:12px;align-items:flex-start;padding:10px 8px;' +
      'border-bottom:1px solid var(--line);font-size:14px;line-height:1.5;';
    const ic = document.createElement('span');
    ic.style.cssText = 'flex-shrink:0;font-size:18px;width:24px;text-align:center;';
    ic.textContent = perdue ? '⚪' : emojiDeLaVoiture(v.voiture);
    l.appendChild(ic);

    const txt = document.createElement('div');
    txt.style.cssText = 'flex:1;min-width:0;overflow-wrap:anywhere;' + (perdue ? 'color:var(--muted);' : '');
    const nomVoiture = '<strong>' + echapper(v.voiture || 'Voiture ?') + '</strong> · ' + echapper(v.qui || '');
    if(perdue){
      txt.innerHTML = nomVoiture + ' — <span data-recu="' + v.recu + '" data-genre="perdu">plus de signal depuis ' +
        ageEnMotsDirect(age) + '</span>' +
        '<div style="font-size:13px;">Écran éteint ou hors réseau : <span data-recu="' + v.recu +
        '" data-genre="reste">elle disparaîtra dans ' + ageEnMotsDirect(VOITURE_EFFACEE - age) + '</span></div>';
    }else{
      txt.innerHTML = nomVoiture +
        '<div style="font-size:13px;color:var(--muted);">' +
        (v.site ? echapper(v.site) + ' · ' : '') +
        (v.voiture ? '' : 'voiture absente de l’écran d’accueil · ') +
        'vu <span data-recu="' + v.recu + '" data-genre="vu">il y a ' + ageEnMotsDirect(age) + '</span></div>';
    }
    l.appendChild(txt);

    if(!perdue){
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'centrerDirect';
      b.style.cssText = 'flex-shrink:0;width:auto;border:0;background:none;color:var(--accent-text);' +
        'font-size:14px;font-weight:700;padding:2px 4px;cursor:pointer;';
      b.textContent = '📍 Centrer';
      b.addEventListener('click', () => {
        etatCarteDirect.suivie = v.cle;
        dessinerVoituresEnDirect(true);
        const c = $('directCarte');
        if(c && c.scrollIntoView) c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      l.appendChild(b);
    }
    z.appendChild(l);
  });
}

/* Une carte se recalcule quand la fenêtre change de taille */
if(typeof window !== 'undefined'){
  window.addEventListener('resize', () => {
    if(typeof carteDirectSousLesYeux === 'function' && carteDirectSousLesYeux()){
      dessinerVoituresEnDirect(true);
    }
  });
}
