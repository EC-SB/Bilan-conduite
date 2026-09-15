/* Déployé le 15/09/2026 à 10:45 — v991 */
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

/* ============================================================
   LA CARTE — v988

   Le fond vient du « Plan IGN », relayé par le Worker (voir la
   route « /tuile » : c'est lui qui pose la permission sans
   laquelle le navigateur refuserait de rendre les pixels du
   dessin).

   ⚠️ TOUT SE PASSE DANS LE TÉLÉPHONE. Les tuiles arrivent, le
   tracé se dessine par-dessus, et il en sort UNE image. Rien de ce
   qui est ici ne repart ailleurs, sinon l'image finie dans le mail
   de l'élève.

   ⚠️ ET TOUJOURS AUCUNE VITESSE. Un trait, des pastilles, une
   distance, une durée.
   ============================================================ */
const CARTE_LARGEUR = 640;
const CARTE_HAUTEUR = 400;
const CARTE_TUILE = 256;
const CARTE_MARGE = 46;          /* pour que les pastilles tiennent */
const CARTE_ZOOM_MAX = 17;
const CARTE_ZOOM_MIN = 8;

/* Web Mercator, la projection des tuiles : une longitude devient
   une colonne, une latitude devient une ligne. */
function carteX(lon, z){
  return (lon + 180) / 360 * Math.pow(2, z) * CARTE_TUILE;
}
function carteY(lat, z){
  const r = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI)
         / 2 * Math.pow(2, z) * CARTE_TUILE;
}

/* Le plus gros zoom auquel le trajet entier tient dans l'image.
   On part du plus précis et on recule : le premier qui rentre est
   le meilleur. */
function zoomQuiRentre(points){
  let latMin = 90, latMax = -90, lonMin = 180, lonMax = -180;
  (points || []).forEach((p) => {
    if(p.lat < latMin) latMin = p.lat;
    if(p.lat > latMax) latMax = p.lat;
    if(p.lon < lonMin) lonMin = p.lon;
    if(p.lon > lonMax) lonMax = p.lon;
  });

  const utileL = CARTE_LARGEUR - CARTE_MARGE * 2;
  const utileH = CARTE_HAUTEUR - CARTE_MARGE * 2;
  const centre = (z) => ({
    z: z,
    cx: (carteX(lonMin, z) + carteX(lonMax, z)) / 2,
    cy: (carteY(latMin, z) + carteY(latMax, z)) / 2
  });

  for(let z = CARTE_ZOOM_MAX; z >= CARTE_ZOOM_MIN; z--){
    const l = Math.abs(carteX(lonMax, z) - carteX(lonMin, z));
    const h = Math.abs(carteY(latMin, z) - carteY(latMax, z));
    if(l <= utileL && h <= utileH) return centre(z);
  }
  return centre(CARTE_ZOOM_MIN);
}

/* Une tuile, demandée au Worker. Elle revient vide plutôt que de
   tout faire échouer : un carré manquant vaut mieux qu'un mail
   sans carte. */
function chargerUneTuile(z, x, y){
  return new Promise((ok) => {
    const img = new Image();
    /* ⚠️ SANS CETTE LIGNE, LE CANVAS EST « SALI » et l'export
       échoue au dernier moment, avec une erreur de sécurité — au
       moment précis où le moniteur croit son bilan parti. C'est la
       route « /tuile » du Worker qui la rend possible. */
    img.crossOrigin = 'anonymous';
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    const base = (typeof CONFIG === 'object' && CONFIG && CONFIG.WORKER_URL)
      ? CONFIG.WORKER_URL : '';
    img.src = base + '/tuile?z=' + z + '&x=' + x + '&y=' + y;
    /* Une tuile qui ne répond pas ne doit pas tenir le bilan. */
    setTimeout(() => ok(null), 8000);
  });
}

/* Le dessin, de bout en bout. Rend une image en base64, ou ''. */
async function dessinerLaCarte(){
  if(!trajetComplet()) return '';
  if(typeof document === 'undefined' || !document.createElement) return '';

  const points = simplifierTrajet(trajetPoints);
  if(points.length < 2) return '';

  const vue = zoomQuiRentre(points);
  const z = vue.z;

  const toile = document.createElement('canvas');
  toile.width = CARTE_LARGEUR;
  toile.height = CARTE_HAUTEUR;
  const c = toile.getContext('2d');
  if(!c) return '';

  /* Le fond crème du Plan IGN : ce qu'on voit là où une tuile
     manque, plutôt qu'un trou noir. */
  c.fillStyle = '#F7F5F0';
  c.fillRect(0, 0, CARTE_LARGEUR, CARTE_HAUTEUR);

  /* Le coin haut-gauche de l'image, en pixels du monde entier */
  const gauche = vue.cx - CARTE_LARGEUR / 2;
  const haut = vue.cy - CARTE_HAUTEUR / 2;

  const t0x = Math.floor(gauche / CARTE_TUILE);
  const t0y = Math.floor(haut / CARTE_TUILE);
  const t1x = Math.floor((gauche + CARTE_LARGEUR) / CARTE_TUILE);
  const t1y = Math.floor((haut + CARTE_HAUTEUR) / CARTE_TUILE);
  const max = Math.pow(2, z);

  /* Toutes les tuiles partent ENSEMBLE : demandées l'une après
     l'autre, neuf allers-retours feraient attendre le moniteur. */
  const demandes = [];
  for(let tx = t0x; tx <= t1x; tx++){
    for(let ty = t0y; ty <= t1y; ty++){
      if(tx < 0 || ty < 0 || tx >= max || ty >= max) continue;
      demandes.push({ tx: tx, ty: ty, p: chargerUneTuile(z, tx, ty) });
    }
  }

  for(const d of demandes){
    const img = await d.p;
    if(!img) continue;
    c.drawImage(img, d.tx * CARTE_TUILE - gauche, d.ty * CARTE_TUILE - haut,
                CARTE_TUILE, CARTE_TUILE);
  }

  /* Le tracé */
  const chemin = points.map((p) => ({
    x: carteX(p.lon, z) - gauche,
    y: carteY(p.lat, z) - haut
  }));

  const tracer = () => {
    c.beginPath();
    chemin.forEach((p, i) => { i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); });
  };

  /* ⚠️ UN LISERÉ BLANC SOUS LE TRAIT. Sur un plan, un trait de
     couleur posé sur des rues de la même valeur se perd : c'est le
     blanc dessous qui le décolle du fond. */
  c.lineJoin = 'round'; c.lineCap = 'round';
  tracer();
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 11; c.stroke();
  tracer();
  c.strokeStyle = '#3B6900'; c.lineWidth = 4; c.stroke();

  /* Le départ : un cercle creux. L'arrivée : un carré plein. */
  const a = chemin[0], b = chemin[chemin.length - 1];
  c.beginPath(); c.arc(a.x, a.y, 7, 0, Math.PI * 2);
  c.fillStyle = '#FFFFFF'; c.fill();
  c.strokeStyle = '#3B3B3B'; c.lineWidth = 2.5; c.stroke();
  c.fillStyle = '#14161B';
  c.fillRect(b.x - 7, b.y - 7, 14, 14);

  /* Les repères, numérotés, cerclés de blanc pour rester lisibles
     sur n'importe quel fond. */
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  trajetReperes.forEach((r, i) => {
    if(r.lat == null || r.lon == null) return;
    const x = carteX(r.lon, z) - gauche;
    const y = carteY(r.lat, z) - haut;
    c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2);
    c.fillStyle = '#3B6900'; c.fill();
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#FFFFFF';
    c.font = 'bold 15px Arial, sans-serif';
    c.fillText(String(i + 1), x, y + 1);
  });

  /* ⚠️ L'ATTRIBUTION EST OBLIGATOIRE, et elle vit DANS l'image :
     écrite à côté dans le mail, elle disparaîtrait au premier
     transfert. */
  const mention = 'Plan IGNV2 — Carte © IGN/Géoportail';
  c.font = '11px Arial, sans-serif';
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  const l = c.measureText(mention).width + 12;
  c.fillStyle = 'rgba(255,255,255,.78)';
  c.fillRect(CARTE_LARGEUR - l, CARTE_HAUTEUR - 18, l, 18);
  c.fillStyle = '#5A5A5A';
  c.fillText(mention, CARTE_LARGEUR - 6, CARTE_HAUTEUR - 5);

  try{
    return toile.toDataURL('image/jpeg', 0.82);
  }catch(e){
    /* Le canvas a été sali malgré tout : mieux vaut un mail sans
       carte qu'un bilan qui ne part pas. */
    console.warn('Carte du trajet impossible :', e);
    return '';
  }
}

/* ⚠️ ET LE MÊME TRAJET NE SE DIT PAS DEUX FOIS DANS LE MÊME MAIL.

   Le bloc texte de blocTrajet() est DANS le bilan ; la version
   riche le redit en plus joli, avec la carte. Un client qui
   affiche le HTML verrait donc la liste des repères deux fois de
   suite. On le retire de la version riche — et d'elle seulement :
   la version en texte brut le garde, c'est tout ce qu'elle a. */
/* ⚠️ OÙ LE BLOC COMMENCE ET OÙ IL FINIT : UNE SEULE RÉPONSE.

   Deux fonctions en ont besoin — celle qui le retire du mail
   riche, et celle qui le réécrit quand un repère vient d'être
   nommé. Écrites séparément, elles finiraient par ne plus couper
   au même endroit, et le bilan garderait deux blocs de trajet ou
   perdrait la signature. */
function ouEstLeBlocTrajet(t){
  const s = String(t || '');
  const i = s.indexOf('\n\n\u{1F5FA}\u{FE0F} ');
  if(i < 0) return null;
  /* Le bloc s'arrête au prochain paragraphe : ce qui suit, c'est
     la signature du moniteur, et elle reste. */
  const j = s.indexOf('\n\n', i + 2);
  return { debut: i, fin: (j < 0) ? s.length : j };
}

function texteSansBlocTrajet(t){
  const s = String(t || '');
  const ou = ouEstLeBlocTrajet(s);
  return ou ? (s.slice(0, ou.debut) + s.slice(ou.fin)) : s;
}

/* ⚠️ UN REPÈRE QU'ON VIENT DE NOMMER DOIT SE VOIR DANS LE BILAN.

   Sans ça, le moniteur tape « Rond-point de la Croix » dans le
   tiroir, le nom part bien dans le classeur et dans le mail — et
   le texte qu'il a sous les yeux, celui qu'il va copier sur
   Messenger, continue d'afficher une heure toute seule. Deux
   vérités pour le même repère, et c'est celle qu'il voit qui a
   l'air fausse.

   Le bloc est réécrit à SA place. Si le bilan n'en a pas encore
   un — bilan repris, écran rechargé — on ne l'invente pas : on
   ne saurait pas où le mettre, et un bloc collé à la fin
   passerait après la signature. */
function rafraichirBlocTrajet(t){
  const s = String(t || '');
  const ou = ouEstLeBlocTrajet(s);
  if(!ou) return s;
  return s.slice(0, ou.debut) + blocTrajet() + s.slice(ou.fin);
}

/* Ce que le mail reçoit : l'image, et le HTML qui la montre. */
async function carteDuTrajetPourMail(){
  const image = await dessinerLaCarte();
  if(!image) return null;

  const t = trajetPourEnvoi();
  if(!t) return null;

  const echapper = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const km = String(t.km).replace('.', ',');
  const h = Math.floor(t.minutes / 60);
  const m = t.minutes % 60;
  const duree = h ? (h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''))
                  : (m + ' min');

  let html =
    '<div style="margin-top:22px;">' +
    '<h3 style="font-size:15px;font-weight:800;margin:0 0 4px;' +
      'color:#3B6900;">🗺️ Notre trajet</h3>' +
    '<div style="font-size:13px;color:#64655F;margin:0 0 14px;">' +
      km + ' km · ' + duree + '</div>' +
    '<img src="cid:trajet" alt="Le tracé de notre trajet" ' +
      'style="display:block;width:100%;max-width:520px;height:auto;' +
      'border:1px solid #DCDCD3;border-radius:12px;">';

  if(t.reperes.length){
    html += '<div style="margin-top:14px;">';
    t.reperes.forEach((r) => {
      html += '<div style="padding:8px 0;border-top:1px solid #DCDCD3;' +
        'font-size:14px;line-height:1.5;color:#14161B;">' +
        '<b style="color:#3B6900;">' + r.n + '</b> · ' +
        '<span style="color:#64655F;font-size:12.5px;">' +
          echapper(r.heure) + '</span>' +
        (r.nom ? ' — ' + echapper(r.nom) : '') +
        '</div>';
    });
    html += '</div>' +
      '<p style="font-size:11.5px;color:#64655F;line-height:1.6;' +
      'border-top:1px solid #DCDCD3;padding-top:12px;margin-top:4px;">' +
      'Les points numérotés sont les endroits que ton moniteur a marqués ' +
      'pendant le cours : ce sont tes points de travail pour la prochaine ' +
      'fois. Le tracé est indicatif, il ne dit rien de ta façon de ' +
      'conduire.</p>';
  }
  html += '</div>';

  return {
    html: html,
    image: { cid: 'trajet', nom: 'trajet.jpg', type: 'image/jpeg',
             contenu: image }
  };
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

/* ============================================================
   OÙ SE RANGE LE BLOC « 📍 REPÈRE ICI » — v991

   David, le 15 septembre : « Remets le bouton repère sous le bloc
   de transcription », puis « et sur le bilan manuel sous
   manœuvre ».

   ⚠️ DEUX PLACES, MAIS UN SEUL BLOC.

   La solution évidente serait un bouton dans chaque écran. Ce
   serait le même geste écrit à deux endroits : deux états à tenir
   d'accord, deux écouteurs de clic, et le jour où l'un des deux
   change, c'est le moniteur qui découvre lequel. Le bloc reste
   donc unique — c'est LUI qui voyage, d'un écran à l'autre.

   ⚠️ ET SUR LE BILAN MANUEL, LA PLACE SE CHERCHE. La rubrique
   « manœuvres » n'existe pas dans tous les modèles : un examen
   blanc n'en a pas. Sans elle, le bloc se range en bas des champs
   plutôt que de disparaître — une place un peu moins bonne vaut
   mieux qu'un bouton introuvable.
   ============================================================ */
/* ⚠️ ET LE BLOC NE DOIT PAS ÊTRE EMPORTÉ PAR UN REDESSIN.

   Les champs du bilan manuel se redessinent en vidant leur zone
   d'un coup (« innerHTML = '' ») : à chaque changement de modèle,
   à chaque changement de niveau. Le bloc rangé au milieu d'eux
   partirait avec — et comme il est UNIQUE, il ne reviendrait pas.
   Le bouton disparaîtrait pour le reste de la session, sans un
   message, et le moniteur croirait avoir mal vu.

   On le met donc à l'abri AVANT le vidage, dans la place du cours,
   qui n'est jamais vidée. Il revient ensuite tout seul. */
function mettreLeBlocTrajetALAbri(){
  const bloc = (typeof $ === 'function') ? $('blocTrajet') : null;
  const abri = (typeof $ === 'function') ? $('trajetIciCours') : null;
  if(!bloc || !abri || !abri.appendChild) return;
  if(bloc.parentNode !== abri) abri.appendChild(bloc);
}

function poserLeBlocTrajet(){
  const bloc = (typeof $ === 'function') ? $('blocTrajet') : null;
  if(!bloc || typeof document === 'undefined') return;

  const manuelOuvert = (() => {
    const v = $('manuelView');
    return !!(v && v.style && v.style.display !== 'none');
  })();

  let place = null;

  if(manuelOuvert){
    /* Sous les manœuvres, quand il y en a. */
    const champs = $('manuelChamps');
    const m = champs && champs.querySelector
      ? champs.querySelector('[data-champ="manoeuvres"]') : null;
    if(m && m.parentNode){
      if(m.nextSibling !== bloc) m.parentNode.insertBefore(bloc, m.nextSibling);
      return;
    }
    place = $('trajetIciManuel');
  }else{
    place = $('trajetIciCours');
  }

  /* Rien où le poser — écran pas encore dessiné, ou page réduite :
     on le laisse là où il est plutôt que de le perdre. */
  if(!place || !place.appendChild) return;
  if(bloc.parentNode !== place) place.appendChild(bloc);
}

/* Montrer ou cacher le bloc, selon le droit et l'état du cours. */
function montrerLeTrajet(oui){
  const bloc = (typeof $ === 'function') ? $('blocTrajet') : null;
  const visible = !!oui && trajetPossible();
  if(visible) poserLeBlocTrajet();
  if(bloc) bloc.style.display = visible ? 'block' : 'none';
  if(visible) dessinerEtatDuTrajet();
}

/* ============================================================
   LES NOMS DE REPÈRES, PROPOSÉS PAR L'IA — v990, lot 3

   David, le 15 septembre : « l'IA propose le nom des repères
   d'après la dictée ».

   Un repère sans nom, c'est une heure dans une liste : « 📍 2 ·
   09h41 ». L'élève ne sait pas de quoi il s'agit. Le moniteur,
   lui, l'a dit à voix haute au moment où il a appuyé — c'est
   justement pour ça que la marque « 📍n » est posée DANS la
   dictée, à l'endroit où on en était.

   ⚠️ UN APPEL À PART, ET PAS UN CHAMP DE PLUS DANS LE BILAN.

   Le premier réflexe serait d'ajouter « reperes » au schéma JSON
   que l'IA rend déjà pour le bilan. C'est la mauvaise porte :
   ce schéma peut être ENTIÈREMENT réécrit depuis l'écran des
   consignes (consignesPersonnalisees), et le jour où l'auto-école
   réécrit le sien, le champ disparaîtrait sans que personne ne
   comprenne pourquoi les repères ont cessé d'avoir des noms. Un
   appel séparé ne peut pas être effacé par une consigne, ne peut
   pas abîmer le bilan s'il échoue, et coûte trois cents jetons.

   ⚠️ ET LE MONITEUR GARDE LE DERNIER MOT. Ce qui revient est une
   PROPOSITION, posée dans un tiroir où elle se corrige et s'efface.
   L'IA lit une transcription automatique de voiture : elle se
   trompera.
   ============================================================ */
const REPERE_NOM_MAX = 40;

function consigneNommerReperes(){
  return 'Tu lis la transcription automatique d\'un cours de conduite. ' +
    'Le moniteur y a posé des marques « 📍1 », « 📍2 », etc., en ' +
    'appuyant sur un bouton au moment précis où il voulait retenir un ' +
    'endroit ou une situation.\n\n' +
    'Pour CHAQUE marque, donne un titre très court (deux à cinq mots) ' +
    'qui dise l\'endroit ou la manœuvre dont il était question JUSTE ' +
    'AVANT la marque.\n\n' +
    'RÈGLES ABSOLUES :\n' +
    '- Tu réponds une ligne par marque, au format « 1 = titre ». Rien ' +
    'd\'autre : pas de phrase d\'introduction, pas de conclusion, pas ' +
    'de markdown.\n' +
    '- Tu n\'inventes RIEN. Si la transcription ne dit rien de clair ' +
    'autour d\'une marque, tu écris « 1 = » et tu passes à la suivante. ' +
    'Un titre vide vaut infiniment mieux qu\'un titre inventé : l\'élève ' +
    'va le lire et croire que c\'est là qu\'il a travaillé.\n' +
    '- Pas de phrase, pas de verbe conjugué : un lieu ou une manœuvre. ' +
    '« Rond-point de la Croix », « Créneau rue de Brest », « Insertion ' +
    'sur la voie rapide ».\n' +
    '- Aucun jugement sur la conduite de l\'élève, aucune note, aucune ' +
    'vitesse. Le titre dit OÙ, pas COMMENT.\n' +
    '- Jamais de nom de personne.\n';
}

/* « 1 = Rond-point de la Croix » → { 1: 'Rond-point de la Croix' } */
function lireLesNomsProposes(reponse){
  const out = {};
  String(reponse || '').split('\n').forEach((ligne) => {
    const m = ligne.match(/^\s*(\d{1,2})\s*[=:.\-]\s*(.*)$/);
    if(!m) return;
    const n = parseInt(m[1], 10);
    if(!n) return;
    /* Une IA bavarde met parfois des guillemets ou une puce */
    const nom = m[2].replace(/^["'«\s]+|["'»\s.]+$/g, '')
                    .slice(0, REPERE_NOM_MAX);
    out[n] = nom;
  });
  return out;
}

/* Demande les noms et les pose. Rend le nombre de repères nommés.
   Ne lève jamais : un bilan ne se perd pas pour un titre. */
async function proposerLesNomsDesReperes(transcription){
  if(!combienDeReperes()) return 0;
  if(typeof appelBrutIA !== 'function') return 0;

  const texte = String(transcription || '');
  /* Sans les marques, l'IA n'a aucun point d'ancrage : elle
     inventerait des titres à partir du cours entier. Mieux vaut
     des repères sans nom. */
  if(!/📍\s*\d/.test(texte)) return 0;

  try{
    const reponse = await appelBrutIA(
      consigneNommerReperes(),
      'Transcription du cours :\n"""\n' + texte + '\n"""\n\n' +
      'Il y a ' + combienDeReperes() + ' marque(s) à nommer.',
      400, 'Noms des repères du trajet');

    const noms = lireLesNomsProposes(reponse);
    let poses = 0;
    for(const n in noms){
      if(!noms[n]) continue;
      if(nommerRepere(parseInt(n, 10), noms[n])) poses++;
    }
    return poses;
  }catch(e){
    console.warn('Noms des repères non proposés :', e);
    return 0;
  }
}


/* ============================================================
   LE TIROIR DES REPÈRES, DANS L'ÉCRAN DE RELECTURE

   Un champ par repère, le titre proposé dedans. Le moniteur
   corrige, et le bilan qu'il a sous les yeux se réécrit aussitôt
   — sinon il copierait sur Messenger un texte qui ne dit pas la
   même chose que le mail de l'élève.
   ============================================================ */
function montrerLeTiroirDesReperes(){
  const tiroir = (typeof $ === 'function') ? $('tiroirReperes') : null;
  const zone = (typeof $ === 'function') ? $('listeReperes') : null;
  if(!tiroir || !zone) return;

  const liste = trajetComplet() ? listeDesReperes() : [];
  if(!liste.length){ tiroir.style.display = 'none'; return; }

  tiroir.style.display = '';
  zone.innerHTML = '';

  liste.forEach((r) => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;gap:10px;align-items:center;' +
      'padding:6px 0;border-bottom:1px solid var(--line);' +
      'text-transform:none;margin:0;font-size:13px;';

    const num = document.createElement('div');
    num.style.cssText = 'flex-shrink:0;font-weight:700;color:var(--accent-text);' +
      'min-width:62px;';
    num.textContent = '📍 ' + r.n + ' · ' + r.heure;
    l.appendChild(num);

    const champ = document.createElement('input');
    champ.type = 'text';
    champ.maxLength = REPERE_NOM_MAX;
    champ.value = r.nom || '';
    champ.placeholder = 'Sans titre — l’élève ne verra que l’heure';
    champ.style.cssText = 'flex:1;min-width:0;';
    champ.addEventListener('input', () => {
      nommerRepere(r.n, champ.value);
      /* ⚠️ LE BILAN AFFICHÉ SE RÉÉCRIT TOUT DE SUITE. Deux vérités
         pour le même repère, et c'est celle qu'il voit qui aurait
         l'air fausse. */
      const ta = (typeof $ === 'function') ? $('resultText') : null;
      if(ta && ta.value) ta.value = rafraichirBlocTrajet(ta.value);
    });
    l.appendChild(champ);

    zone.appendChild(l);
  });
}


/* ============================================================
   RANGER LE TRACÉ — v990, lot 3

   ⚠️ AU MOMENT OÙ LA LIGNE DU BILAN EST ÉCRITE, ET PAS AVANT.

   C'est le seul instant qui vaut : avant, le cours peut encore
   être abandonné ; après, l'écran est remis à zéro et le tracé
   oublié. C'est exactement le raisonnement qui a déplacé la mort
   du brouillon à cet endroit-là (voir exporterVersSheets).

   ⚠️ ET ÇA NE TIENT PAS LE BILAN. Si le rangement échoue, le
   bilan est enregistré quand même : un tracé perdu est un
   agrément en moins, un bilan perdu est deux heures de travail.
   ============================================================ */
async function enregistrerLeTrajet(meta){
  if(!trajetComplet()) return false;
  if(typeof appelPrep !== 'function') return false;

  const t = trajetPourEnvoi();
  if(!t) return false;

  const m = meta || {};
  try{
    const r = await appelPrep({
      action: 'trajetSet',
      eleve: String(m.eleve || ''),
      date: String(m.date || ''),
      moniteur: String(m.moniteur || ''),
      site: String(m.site || ''),
      km: t.km,
      minutes: t.minutes,
      debut: heureDuTrajet(trajetDebut),
      fin: heureDuTrajet(trajetFin),
      trace: t.polyligne,
      reperes: t.reperes
    });
    return !!(r && r.status === 'ok');
  }catch(e){
    console.warn('Trajet non enregistré :', e);
    return false;
  }
}

/* Une heure de cours, pour le classeur : 09h14, pas un horodatage
   à la milliseconde. ⚠️ ON NE RANGE PAS L'HEURE DE CHAQUE POINT —
   ce serait un journal de déplacement. Deux heures : celle du
   départ, celle de l'arrivée. */
function heureDuTrajet(t){
  if(!t) return '';
  const d = new Date(t);
  return String(d.getHours()).padStart(2, '0') + 'h' +
         String(d.getMinutes()).padStart(2, '0');
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-trajet.js'] = true;
