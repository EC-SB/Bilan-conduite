/* Déployé le 15/09/2026 à 09:12 — v986 */
/* ============================================================
   ec-trajet.js
   Le trajet du cours, et les repères posés en route
   Application Bilan de conduite — Évolution Conduites

   David, le 15 septembre 2026 : « Est-ce que c'est possible de
   mettre en place un suivi gps pendant un cours avec
   retranscription du trajet à l'élève en même temps que son
   bilan ? » puis « J'aimerai le tracé complet + le repère des
   points de travail ».

   ─ CE QUE CE MODULE FAIT, ET CE QU'IL NE FAIT PAS ─

   Il relève la position pendant le cours, garde tout DANS LE
   TÉLÉPHONE, et ne rend son résumé qu'à la fin. Rien ne part sur
   le réseau pendant qu'on roule : pas un réveil du classeur, pas
   un octet.

   ⚠️ IL N'ENREGISTRE AUCUNE VITESSE, ET C'EST UNE RÈGLE, PAS UN
   OUBLI. La CNIL interdit d'utiliser un dispositif de
   géolocalisation pour contrôler le respect des limitations de
   vitesse. La vitesse ne sert ici qu'à jeter les points aberrants,
   le temps d'un calcul, et n'est écrite nulle part. Ce qui sort
   d'ici, c'est un tracé, une distance et une durée.

   ⚠️ ET IL S'ARRÊTE DÈS QUE L'ÉCRAN S'ÉTEINT. C'est la limite du
   navigateur, sur iPhone comme sur Android, et elle ne se
   contourne pas. D'où « trajetComplet() » : un trajet interrompu
   est un trajet qui ment, et il vaut mieux n'en envoyer aucun
   qu'un parcours faux.
   ============================================================ */

/* ------------------------------------------------------------
   L'ÉTAT — il vit ICI et nulle part ailleurs.

   Les autres modules n'y touchent pas : ils appellent les
   fonctions du bas. Un état partagé de plus dans ec-etat.js, ce
   serait un fait écrit à deux endroits pour rien.
   ------------------------------------------------------------ */
let trajetPoints = [];        /* { lat, lon, t } — t en millisecondes */
let trajetReperes = [];       /* { t, lat, lon, nom } */
let trajetVeille = null;      /* l'identifiant de watchPosition */
let trajetDebut = 0;
let trajetFin = 0;
let trajetPerdu = 0;          /* millisecondes passées sans relevé */
let trajetDernier = 0;        /* horodatage du dernier point retenu */
let trajetCacheA = 0;         /* quand la page est passée derrière */
let trajetRefus = '';         /* le message du navigateur, s'il a refusé */

/* Un point toutes les cinq secondes suffit à dessiner une route.
   À une seconde, on garde sept fois plus de points pour le même
   trait. */
const TRAJET_PAS = 5000;

/* ⚠️ AU-DELÀ, CE N'EST PLUS UNE POSITION, C'EST UNE SUPPOSITION.
   Sous un pont, entre deux immeubles, le téléphone rend un point
   à cent mètres près : le tracé fait un saut de côté que personne
   n'a conduit. */
const TRAJET_PRECISION_MAX = 60;   /* mètres */

/* Un relevé qui impliquerait plus de 200 km/h entre deux points
   est une erreur du capteur, pas un excès de vitesse. On le jette
   sans rien en conserver. */
const TRAJET_BOND_MAX = 200;       /* km/h */

/* Passé une minute sans le moindre point, on considère que le
   relevé s'est tu — écran éteint, tunnel, GPS perdu. */
const TRAJET_SILENCE = 60000;


/* ============================================================
   LES CALCULS — ils ne dépendent de rien et se testent seuls
   ============================================================ */

/* La distance entre deux points, en mètres. Formule de haversine :
   la Terre est ronde, et à l'échelle d'un cours ça se voit déjà. */
function distanceEntre(a, b){
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/* La longueur d'un tracé, en mètres */
function longueurDuTrajet(points){
  const p = points || [];
  let total = 0;
  for(let i = 1; i < p.length; i++) total += distanceEntre(p[i - 1], p[i]);
  return total;
}

/* ⚠️ CE N'EST PAS LA DISTANCE PARCOURUE QUI DIT QU'ON A ROULÉ.

   Premier jet : « moins de cinq cents mètres parcourus, pas de
   trajet ». Rouge au premier essai — et c'est le test qui avait
   raison. Un GPS à l'arrêt DÉRIVE : deux mètres par-ci, trois
   par-là, trois cents relevés dans l'heure, et le compteur affiche
   six cents mètres sans que la voiture ait bougé d'un pouce.

   Ce qui dit qu'on est allé quelque part, c'est l'ÉTENDUE : la
   distance entre les deux coins du rectangle qui contient tout le
   tracé. Elle ne grandit pas avec le temps qui passe, seulement
   avec le chemin fait. */
function etendueDuTrajet(points){
  const p = points || [];
  if(p.length < 2) return 0;
  let latMin = p[0].lat, latMax = p[0].lat;
  let lonMin = p[0].lon, lonMax = p[0].lon;
  for(let i = 1; i < p.length; i++){
    if(p[i].lat < latMin) latMin = p[i].lat;
    if(p[i].lat > latMax) latMax = p[i].lat;
    if(p[i].lon < lonMin) lonMin = p[i].lon;
    if(p[i].lon > lonMax) lonMax = p[i].lon;
  }
  return distanceEntre({ lat: latMin, lon: lonMin },
                       { lat: latMax, lon: lonMax });
}

/* La distance d'un point à la droite qui joint deux autres.
   Sert à la simplification. En degrés, mais corrigée en longitude
   par la latitude : sans ça, à nos latitudes, un écart est-ouest
   compterait une fois et demie trop peu. */
function ecartALaDroite(p, a, b){
  const k = Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  const px = (p.lon - a.lon) * k, py = p.lat - a.lat;
  const bx = (b.lon - a.lon) * k, by = b.lat - a.lat;
  const norme = bx * bx + by * by;
  if(!norme) return Math.sqrt(px * px + py * py);
  let t = (px * bx + py * by) / norme;
  t = Math.max(0, Math.min(1, t));
  const dx = px - t * bx, dy = py - t * by;
  return Math.sqrt(dx * dx + dy * dy);
}

/* ⚠️ MILLE CINQ CENTS POINTS POUR UN TRAIT QU'ON REGARDE SUR
   HUIT CENTIMÈTRES. Deux heures de cours à un point toutes les
   cinq secondes font environ mille quatre cents relevés. À
   l'écran, un virage se lit avec trois points ; les autres ne
   font que peser.

   Douglas-Peucker : on garde le point le plus éloigné de la corde,
   on recommence de chaque côté, on s'arrête quand tout le monde
   est à moins de « tolerance » de la droite. Ce qui est droit se
   résume à ses deux bouts ; ce qui tourne garde ses virages. */
function simplifierTrajet(points, tolerance){
  const p = points || [];
  if(p.length < 3) return p.slice();
  const tol = tolerance || 0.00004;   /* ~4 m à nos latitudes */

  const garder = new Array(p.length).fill(false);
  garder[0] = true;
  garder[p.length - 1] = true;

  /* Une pile plutôt que la récursion : mille quatre cents points
     en profondeur, c'est une pile d'appels qui déborde. */
  const aFaire = [[0, p.length - 1]];
  while(aFaire.length){
    const [debut, fin] = aFaire.pop();
    let pire = 0, ou = -1;
    for(let i = debut + 1; i < fin; i++){
      const d = ecartALaDroite(p[i], p[debut], p[fin]);
      if(d > pire){ pire = d; ou = i; }
    }
    if(ou > 0 && pire > tol){
      garder[ou] = true;
      aFaire.push([debut, ou]);
      aFaire.push([ou, fin]);
    }
  }

  return p.filter((x, i) => garder[i]);
}

/* La polyligne encodée de Google : chaque point ne coûte plus que
   cinq à huit caractères au lieu d'une trentaine. Cent cinquante
   points tiennent ainsi dans une seule cellule du classeur. */
function encoderPolyligne(points){
  let out = '', prevLat = 0, prevLon = 0;

  const morceau = (v) => {
    let n = v < 0 ? ~(v << 1) : (v << 1);
    let s = '';
    while(n >= 0x20){
      s += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    s += String.fromCharCode(n + 63);
    return s;
  };

  (points || []).forEach((p) => {
    const lat = Math.round(p.lat * 1e5);
    const lon = Math.round(p.lon * 1e5);
    out += morceau(lat - prevLat) + morceau(lon - prevLon);
    prevLat = lat; prevLon = lon;
  });

  return out;
}

/* Et la lecture, pour le jour où on redessine un trajet rangé */
function decoderPolyligne(texte){
  const s = String(texte || '');
  const out = [];
  let i = 0, lat = 0, lon = 0;

  while(i < s.length){
    let shift = 0, res = 0, b;
    do { b = s.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; }
    while(b >= 0x20 && i < s.length);
    lat += (res & 1) ? ~(res >> 1) : (res >> 1);

    shift = 0; res = 0;
    do { b = s.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; }
    while(b >= 0x20 && i < s.length);
    lon += (res & 1) ? ~(res >> 1) : (res >> 1);

    out.push({ lat: lat / 1e5, lon: lon / 1e5 });
  }
  return out;
}


/* ============================================================
   LE RELEVÉ
   ============================================================ */

/* ⚠️ TOUS LES BILANS SAUF LE SIMULATEUR — v986, demandé par David
   le 15 septembre : « le tracé sur tous les bilans sauf
   simulateur ».

   Un simulateur ne bouge pas. Relever sa position deux heures
   durant rendrait un petit tas de points à l'adresse de
   l'auto-école, et ce tas partirait dans le mail de l'élève comme
   s'il avait conduit.

   On lit le GROUPE du modèle, pas la liste de ses clés : le jour
   où un troisième simulateur arrive, il sera exclu sans que
   personne ait à y penser. */
function trajetPourCeModele(cle){
  if(typeof MODELES !== 'object' || !MODELES) return true;
  const m = MODELES[cle || ''];
  if(!m) return true;
  return String(m.groupe || '') !== 'Simulateur';
}

/* Le trajet ne se propose qu'à qui a la section d'essai, si le
   navigateur sait où il est, et pas sur un simulateur. */
function trajetPossible(){
  if(typeof aDroit !== 'function' || !aDroit('trajet')) return false;
  if(typeof $ === 'function' && $('modele') &&
     !trajetPourCeModele($('modele').value)) return false;
  return !!(typeof navigator !== 'undefined' && navigator.geolocation);
}

/* Un point retenu, ou écarté avec sa raison. Séparé du capteur
   pour être exécutable dans un test, sans navigateur. */
function retenirPoint(pos){
  if(!pos || !pos.coords) return 'sans coordonnées';

  const c = pos.coords;
  const t = pos.timestamp || Date.now();

  if(typeof c.accuracy === 'number' && c.accuracy > TRAJET_PRECISION_MAX){
    return 'trop imprécis';
  }
  /* Le pas : on ne garde qu'un point toutes les cinq secondes,
     même si le téléphone en propose dix. */
  if(trajetDernier && (t - trajetDernier) < TRAJET_PAS) return 'trop tôt';

  const p = { lat: c.latitude, lon: c.longitude, t: t };

  const avant = trajetPoints[trajetPoints.length - 1];
  if(avant){
    const dt = (t - avant.t) / 1000;
    if(dt > 0){
      const kmh = (distanceEntre(avant, p) / dt) * 3.6;
      /* ⚠️ CE CHIFFRE NE SORT PAS D'ICI. Il sert à reconnaître un
         saut du capteur, le temps d'un « if », et n'est écrit nulle
         part : ni dans le classeur, ni dans le mail. */
      if(kmh > TRAJET_BOND_MAX) return 'bond impossible';
    }
    /* Une minute sans rien : le relevé s'est tu, on compte le
       silence. C'est lui qui dira si le trajet est complet. */
    if((t - avant.t) > TRAJET_SILENCE) trajetPerdu += (t - avant.t);
  }

  trajetPoints.push(p);
  trajetDernier = t;
  return '';
}

function demarrerTrajet(){
  if(trajetVeille !== null) return true;      /* déjà en route */
  if(!trajetPossible()) return false;

  trajetPoints = [];
  trajetReperes = [];
  trajetDebut = Date.now();
  trajetFin = 0;
  trajetPerdu = 0;
  trajetDernier = 0;
  trajetCacheA = 0;
  trajetRefus = '';

  try{
    trajetVeille = navigator.geolocation.watchPosition(
      (pos) => { retenirPoint(pos); dessinerEtatDuTrajet(); },
      (err) => {
        /* ⚠️ UN REFUS SE DIT, IL NE SE TAIT PAS. Sans ça, le
           moniteur croit son trajet enregistré pendant deux heures
           et ne découvre le contraire qu'au moment d'envoyer. */
        trajetRefus = (err && err.code === 1)
          ? 'Localisation refusée pour ce site.'
          : 'Position indisponible.';
        dessinerEtatDuTrajet();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  }catch(e){
    trajetRefus = 'Localisation impossible sur cet appareil.';
    return false;
  }
  return true;
}

function arreterTrajet(){
  if(trajetVeille !== null){
    try{ navigator.geolocation.clearWatch(trajetVeille); }catch(e){}
    trajetVeille = null;
  }
  if(trajetDebut && !trajetFin) trajetFin = Date.now();
}

/* On repart de zéro : après un bilan enregistré, après un
   abandon. Sans ça, le cours suivant hériterait du précédent. */
function oublierLeTrajet(){
  arreterTrajet();
  trajetPoints = [];
  trajetReperes = [];
  trajetDebut = 0;
  trajetFin = 0;
  trajetPerdu = 0;
  trajetDernier = 0;
  trajetCacheA = 0;
  trajetRefus = '';
}

function trajetEnCours(){ return trajetVeille !== null; }


/* ============================================================
   LES REPÈRES

   Un appui, rien d'autre. La voiture roule, l'élève conduit : ce
   n'est pas le moment d'ouvrir un clavier.
   ============================================================ */
function poserRepere(){
  if(!trajetDebut) return 0;

  const dernier = trajetPoints[trajetPoints.length - 1];
  trajetReperes.push({
    t: Date.now(),
    lat: dernier ? dernier.lat : null,
    lon: dernier ? dernier.lon : null,
    nom: ''
  });

  /* ⚠️ ET LA MARQUE ENTRE DANS LA DICTÉE, À L'ENDROIT OÙ ON EN
     EST. C'est ce texte-là qui part à l'IA : elle lira « on arrive
     au rond-point 📍 et là tu as oublié ton clignotant » et saura
     de quoi ce repère parle. Sans cette marque, elle n'aurait
     qu'une heure, et une heure ne dit rien.

     ⚠️ MAIS C'EST LE POINT GPS QUI FAIT FOI. Le moniteur peut
     corriger sa dictée à la main et effacer un « 📍 » : le repère
     existe toujours, il arrive simplement sans nom proposé. */
  marquerDansLaDictee(trajetReperes.length);

  if(typeof vibrer === 'function') vibrer();
  else if(navigator && navigator.vibrate){ try{ navigator.vibrate(60); }catch(e){} }

  return trajetReperes.length;
}

/* La marque, posée à la fin de ce qui est acquis. La dictée qui
   suit s'ajoutera après elle, toute seule. */
function marquerDansLaDictee(numero){
  if(typeof committedTranscript !== 'string') return;
  const marque = ' 📍' + numero + ' ';
  committedTranscript = (committedTranscript + marque).replace(/\s+/g, ' ').trim() + ' ';

  const boite = (typeof $ === 'function') ? $('transcriptBox') : null;
  if(boite && boite.value !== undefined){
    boite.value = (boite.value + marque).replace(/[ \t]+/g, ' ');
    if(typeof avantDerniereEcriture !== 'undefined'){
      avantDerniereEcriture = boite.value;
    }
    boite.scrollTop = boite.scrollHeight;
  }
}

/* Combien de repères posés */
function combienDeReperes(){ return trajetReperes.length; }


/* ============================================================
   EST-CE QUE CE TRAJET DIT LA VÉRITÉ ?

   ⚠️ UN TRAJET INTERROMPU EST UN TRAJET QUI MENT. Si l'écran s'est
   verrouillé une heure, le tracé montre un trait qui saute d'un
   bout à l'autre de la ville, et l'élève croira l'avoir conduit.
   Mieux vaut n'envoyer aucun tracé qu'un parcours faux.
   ============================================================ */
function trajetComplet(){
  if(!trajetDebut) return false;
  if(trajetRefus) return false;
  if(trajetPoints.length < 10) return false;

  const duree = (trajetFin || Date.now()) - trajetDebut;
  if(duree < 60000) return false;

  /* Le silence accumulé, plus celui qui court encore */
  let perdu = trajetPerdu;
  const t = trajetFin || Date.now();
  if(trajetDernier && (t - trajetDernier) > TRAJET_SILENCE){
    perdu += (t - trajetDernier);
  }

  /* ⚠️ ET UNE VOITURE QUI N'A PAS BOUGÉ N'A PAS DE TRAJET — v986.
     Un rendez-vous post-permis, une fiche remplie au bureau, un
     cours annulé au dernier moment : le relevé tourne, les points
     s'accumulent sur place, et le tracé serait un pâté devant
     l'auto-école.

     On mesure l'ÉTENDUE, pas la distance parcourue — voir
     etendueDuTrajet : à l'arrêt, la dérive du capteur fait monter
     la seconde sans que la première bouge. Trois cents mètres,
     c'est moins que le tour du pâté de maisons. */
  if(etendueDuTrajet(trajetPoints) < 300) return false;

  /* Un dixième de la leçon sans relevé, et on ne garantit plus
     rien. Un feu rouge sous un porche ne fait pas six minutes. */
  return perdu <= duree * 0.1;
}

/* Ce qu'il manque, en clair, pour l'écran */
function manqueAuTrajet(){
  if(trajetRefus) return trajetRefus;
  if(!trajetDebut) return 'Trajet non démarré.';
  if(trajetComplet()) return '';

  const duree = (trajetFin || Date.now()) - trajetDebut;
  let perdu = trajetPerdu;
  const t = trajetFin || Date.now();
  if(trajetDernier && (t - trajetDernier) > TRAJET_SILENCE){
    perdu += (t - trajetDernier);
  }
  const min = (x) => Math.max(1, Math.round(x / 60000));
  if(trajetPoints.length < 10) return 'Trop peu de relevés pour un tracé.';
  if(etendueDuTrajet(trajetPoints) < 300){
    return 'La voiture n’a pas bougé : pas de trajet.';
  }
  return 'Trajet incomplet : ' + min(duree - perdu) + ' min relevées sur ' +
         min(duree) + '.';
}


/* ============================================================
   CE QUI SORT D'ICI
   ============================================================ */
function resumeDuTrajet(){
  const brut = longueurDuTrajet(trajetPoints);
  return {
    actif: trajetEnCours(),
    points: trajetPoints.length,
    km: Math.round(brut / 100) / 10,
    reperes: trajetReperes.length,
    debut: trajetDebut,
    fin: trajetFin,
    complet: trajetComplet(),
    manque: manqueAuTrajet()
  };
}

/* Le paquet rangé avec le bilan. Rien de plus : pas de vitesse,
   pas d'adresse, pas d'horaire autre que ceux des repères. */
function trajetPourEnvoi(){
  if(!trajetComplet()) return null;

  const simple = simplifierTrajet(trajetPoints);
  const heure = (t) => {
    const d = new Date(t);
    return String(d.getHours()).padStart(2, '0') + 'h' +
           String(d.getMinutes()).padStart(2, '0');
  };

  return {
    polyligne: encoderPolyligne(simple),
    points: simple.length,
    km: Math.round(longueurDuTrajet(trajetPoints) / 100) / 10,
    minutes: Math.round(((trajetFin || Date.now()) - trajetDebut) / 60000),
    reperes: trajetReperes.map((r, i) => ({
      n: i + 1,
      heure: heure(r.t),
      nom: String(r.nom || '')
    }))
  };
}

/* Nommer un repère depuis l'écran de relecture */
function nommerRepere(numero, nom){
  const r = trajetReperes[numero - 1];
  if(!r) return false;
  r.nom = String(nom || '').trim();
  return true;
}

/* ============================================================
   CE QUI ENTRE DANS LE BILAN — v986

   David, le 15 septembre : « voir comment ça se traduit sur la
   génération de bilan car là pour le moment on a que les bilans
   généré en vocal ».

   ⚠️ LA MARQUE DANS LA DICTÉE NE SUFFISAIT PAS, ET NE POUVAIT PAS
   SUFFIRE. Elle sert à l'IA : elle lui dit à quel moment du récit
   le repère a été posé, pour qu'elle sache de quoi il parle. Mais
   un bilan REMPLI À LA MAIN n'a pas de dictée — il n'y a aucun
   texte où poser une marque. Les repères d'un cours manuel
   n'allaient donc nulle part.

   Ce bloc-ci est l'autre moitié, et il est la même pour les deux
   chemins : il s'ajoute au bilan fini, qu'il vienne du micro ou du
   formulaire. Une seule fonction, appelée aux deux endroits qui
   assemblent un bilan — comme « blocProcedures » avant lui.

   ⚠️ TOUJOURS AUCUNE VITESSE. Une distance, une durée, des heures
   de repère. Rien d'autre.
   ============================================================ */
function blocTrajet(){
  if(!trajetComplet()) return '';

  const t = trajetPourEnvoi();
  if(!t) return '';

  const km = String(t.km).replace('.', ',');
  const h = Math.floor(t.minutes / 60);
  const m = t.minutes % 60;
  const duree = h ? (h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''))
                  : (m + ' min');

  let out = '\n\n🗺️ 𝗡𝗼𝘁𝗿𝗲 𝘁𝗿𝗮𝗷𝗲𝘁 : ' + km + ' km en ' + duree;

  /* Les repères nommés d'abord ; ceux qui n'ont pas de nom
     portent au moins leur heure — c'est déjà un rendez-vous dans
     le récit du cours. */
  t.reperes.forEach((r) => {
    out += '\n📍 ' + r.n + ' · ' + r.heure + (r.nom ? ' — ' + r.nom : '');
  });

  return out;
}

/* Les repères, pour le tiroir de l'écran de relecture */
function listeDesReperes(){
  const heure = (t) => {
    const d = new Date(t);
    return String(d.getHours()).padStart(2, '0') + 'h' +
           String(d.getMinutes()).padStart(2, '0');
  };
  return trajetReperes.map((r, i) => ({
    n: i + 1, heure: heure(r.t), nom: String(r.nom || '')
  }));
}


/* ============================================================
   LA PAGE PASSE DERRIÈRE

   Le relevé s'arrête, et le navigateur ne prévient pas. On note
   le moment : au retour, la durée compte comme perdue, et c'est
   ce qui fera dire au trajet qu'il est incomplet.
   ============================================================ */
if(typeof document !== 'undefined' && document.addEventListener){
  document.addEventListener('visibilitychange', () => {
    if(!trajetEnCours()) return;
    if(document.hidden){
      trajetCacheA = Date.now();
    }else if(trajetCacheA){
      trajetPerdu += (Date.now() - trajetCacheA);
      trajetCacheA = 0;
      dessinerEtatDuTrajet();
    }
  });
}


/* ============================================================
   L'AFFICHAGE — la ligne d'état sous le compteur de mots
   ============================================================ */
function dessinerEtatDuTrajet(){
  const z = (typeof $ === 'function') ? $('trajetEtat') : null;
  if(!z) return;

  if(!trajetDebut){
    z.style.display = 'none';
    z.innerHTML = '';
    return;
  }

  const r = resumeDuTrajet();
  z.style.display = 'flex';
  z.innerHTML = '';

  if(r.manque){
    z.className = 'trajet-etat perdu';
    const t = document.createElement('span');
    t.textContent = '⚠️ ' + r.manque;
    z.appendChild(t);
    return;
  }

  z.className = 'trajet-etat';
  const rond = document.createElement('span');
  rond.className = 'rond';
  z.appendChild(rond);

  const mot = document.createElement('span');
  mot.textContent = 'Trajet en cours';
  z.appendChild(mot);

  const chiffres = document.createElement('span');
  chiffres.className = 'gris';
  chiffres.textContent = '· ' + String(r.km).replace('.', ',') + ' km · ' +
    r.reperes + ' repère' + (r.reperes > 1 ? 's' : '');
  z.appendChild(chiffres);
}

/* Le gros bouton se remplit une seconde et demie, puis redevient
   lui-même. Aucune fenêtre, aucune confirmation. */
function appuyerSurRepere(){
  const b = (typeof $ === 'function') ? $('repereBtn') : null;
  const n = poserRepere();
  if(!n) return;
  dessinerEtatDuTrajet();
  if(!b) return;
  b.classList.add('pose');
  b.textContent = '📍 Repère ' + n + ' posé';
  clearTimeout(b._retour);
  b._retour = setTimeout(() => {
    b.classList.remove('pose');
    b.textContent = '📍 Repère ici';
  }, 1500);
}

/* Montrer ou cacher le bloc, selon le droit et l'état du cours.

   ⚠️ UN SEUL CONTENEUR, ET IL VIT AU-DESSUS DES DEUX ÉCRANS DE
   COURS — v986. Le bouton doit être le même que le bilan soit
   dicté ou rempli à la main : un second bouton dans l'écran
   manuel, ce serait le même geste écrit à deux endroits. */
function montrerLeTrajet(oui){
  const bloc = (typeof $ === 'function') ? $('blocTrajet') : null;
  const visible = !!oui && trajetPossible();
  if(bloc) bloc.style.display = visible ? 'block' : 'none';
  if(visible) dessinerEtatDuTrajet();
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-trajet.js'] = true;
