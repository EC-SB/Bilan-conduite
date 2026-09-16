/* Déployé le 16/09/2026 à 10:24 — v1012 */
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
let trajetRefus = '';         /* le message du navigateur, s'il a REFUSÉ */

/* ⚠️ ET CE N'EST PAS LA MÊME CHOSE QU'UNE PANNE PASSAGÈRE — v998.

   Un refus est DÉFINITIF : la permission n'est pas accordée, et
   rien de ce cours ne sera relevé. Une panne est PASSAGÈRE : un
   tunnel, un parking couvert, le hall de l'agence, un capteur qui
   met dix secondes de plus à répondre. Tous les GPS en font, tout
   le temps.

   Je traitais les deux avec la même variable, et cette variable
   n'était jamais effacée. Un seul incident, à n'importe quel
   moment de l'heure, tuait le trajet entier : les points
   continuaient d'arriver, la distance restait juste, et
   « trajetComplet » rendait faux jusqu'à la fin du cours. Prouvé
   dans un vrai navigateur — un cours de quatorze relevés sur un
   kilomètre, sans le moindre problème, ressortait « Position
   indisponible ».

   La panne s'efface donc au premier point retenu, et elle ne
   décide pas de la validité du trajet : le temps réellement perdu
   est déjà mesuré par le silence (voir TRAJET_SILENCE), qui est
   la mesure honnête. Une panne de trente secondes suivie d'une
   heure de relevé parfait n'est pas un trajet qui ment. */
let trajetPanne = '';         /* incident passager, effacé au point suivant */
let carteEnPreparation = null; /* l'image du tracé, lancée d'avance */
/* ⚠️ UNE IDENTITÉ STABLE POUR CHAQUE POINT — v1004. Le NUMÉRO d'un
   point est son rang : il change dès qu'on en retire un. Les lignes
   d'observation d'un examen, elles, doivent continuer de désigner
   LEUR point — sinon « point 5 sur la carte » finit par montrer le
   point d'à côté. Le rang s'affiche, l'identité se garde. */
let trajetCompteur = 0;

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

  /* ⚠️ ET LA PANNE S'EFFACE ICI — v998. Le capteur vient de
     répondre : ce qui s'est passé avant est derrière nous. C'est
     le seul endroit où on peut le savoir, et c'est pour ça que
     l'effacement est ici et pas chez l'appelant. */
  trajetPanne = '';
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
  trajetPanne = '';
  /* Un nouveau cours, une nouvelle carte : l'image préparée pour
     le précédent partirait dans le mail de cet élève-ci. */
  carteEnPreparation = null;
  trajetCompteur = 0;

  try{
    trajetVeille = navigator.geolocation.watchPosition(
      (pos) => { retenirPoint(pos); dessinerEtatDuTrajet(); },
      (err) => {
        /* ⚠️ UN REFUS SE DIT, IL NE SE TAIT PAS. Sans ça, le
           moniteur croit son trajet enregistré pendant deux heures
           et ne découvre le contraire qu'au moment d'envoyer.

           ⚠️ MAIS UNE PANNE N'EST PAS UN REFUS — v998. Seul le
           code 1 (permission refusée) est définitif. Les codes 2
           et 3 — position indisponible, délai dépassé — arrivent
           en permanence sur un vrai téléphone : un porche, un
           parking, un capteur lent. Les ranger avec le refus
           condamnait l'heure entière pour trois secondes de
           tunnel. La panne s'efface au premier point suivant. */
        if(err && err.code === 1){
          trajetRefus = 'Localisation refusée pour ce site.';
        }else{
          trajetPanne = 'Position perdue — le relevé reprend tout seul.';
        }
        dessinerEtatDuTrajet();
      },
      /* Le délai reste large : sur une veille, un délai court ne
         fait qu'émettre des erreurs pendant que le capteur
         cherche. Le temps réellement perdu est compté par le
         silence, qui, lui, ne se trompe pas. */
      { enableHighAccuracy: true, maximumAge: 0, timeout: TRAJET_SILENCE });
  }catch(e){
    trajetRefus = 'Localisation impossible sur cet appareil.';
    return false;
  }

  /* ⚠️ L'ÉCRAN SE TIENT ICI, PAS CHEZ L'APPELANT — v997.

     Un écran verrouillé ARRÊTE la géolocalisation : iOS comme
     Android, et sans contournement. Le bilan vocal tenait l'écran
     — mais pour son micro, et par hasard ; le bilan manuel ne l'a
     jamais tenu, et le trajet d'un cours rempli à la main était
     donc structurellement toujours incomplet. David, le 15
     septembre, après un vrai cours : « je n'ai rien du tout dans
     le bilan que j'ai reçu ».

     Une parade posée chez l'appelant est une parade qu'on oublie :
     celle-ci part avec le relevé, pour les deux écrans à la fois. */
  if(typeof garderEcranAllume === 'function') garderEcranAllume();
  return true;
}

function arreterTrajet(){
  if(trajetVeille !== null){
    try{ navigator.geolocation.clearWatch(trajetVeille); }catch(e){}
    trajetVeille = null;
  }
  if(trajetDebut && !trajetFin) trajetFin = Date.now();

  /* L'écran pris au démarrage se rend ici — sauf si le micro
     tourne encore : lui en a besoin jusqu'à sa propre fin, et
     c'est lui qui le rendra. */
  if(typeof libererEcran === 'function' &&
     !(typeof isRecording !== 'undefined' && isRecording)){
    libererEcran();
  }
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
  trajetPanne = '';
  carteEnPreparation = null;
  trajetCompteur = 0;
}

function trajetEnCours(){ return trajetVeille !== null; }


/* ============================================================
   LES REPÈRES

   Un appui, rien d'autre. La voiture roule, l'élève conduit : ce
   n'est pas le moment d'ouvrir un clavier.
   ============================================================ */
function poserRepere(type, nom){
  if(!trajetDebut) return 0;

  /* ⚠️ L'HEURE ET LA POSITION VIENNENT DU MÊME POINT — v1000.

     Le repère prenait sa position sur le dernier relevé et son
     heure sur l'horloge : deux sources pour un même fait. L'écart
     est petit en vrai cours — cinq secondes au plus — mais c'est
     la même faute que partout ailleurs, et elle devient énorme dès
     que les points portent des horodatages plus anciens que
     l'horloge : tous les repères prendraient alors l'heure de la
     relecture au lieu de celle du passage.

     Un repère est attaché à un endroit ; son heure est celle de
     cet endroit. Sans aucun point encore reçu, l'horloge reste le
     seul recours. */
  const dernier = trajetPoints[trajetPoints.length - 1];
  trajetReperes.push({
    id: ++trajetCompteur,
    t: dernier ? dernier.t : Date.now(),
    lat: dernier ? dernier.lat : null,
    lon: dernier ? dernier.lon : null,
    nom: String(nom || ''),
    /* ⚠️ CE QUE L'ERREUR DIT — v1006. Vide à la pose : le moniteur
       appuie en roulant, il écrit ses remarques après. Elles sont
       versées ici au moment où le bilan se compose, c'est-à-dire à
       l'instant précis où le texte du bilan se fige — les deux
       disent donc forcément la même chose. */
    theme: '', insp: '', mon: '',
    /* La nature vaut « repere » par défaut : le bouton 📍 n'a pas
       à la connaître, et tout ce qui existait avant continue. */
    type: NATURES_DU_POINT[type] ? type : 'repere'
  });

  /* ⚠️ ET LA MARQUE ENTRE DANS LA DICTÉE, À L'ENDROIT OÙ ON EN
     EST. C'est ce texte-là qui part à l'IA : elle lira « on arrive
     au rond-point 📍 et là tu as oublié ton clignotant » et saura
     de quoi ce repère parle. Sans cette marque, elle n'aurait
     qu'une heure, et une heure ne dit rien.

     ⚠️ MAIS C'EST LE POINT GPS QUI FAIT FOI. Le moniteur peut
     corriger sa dictée à la main et effacer un « 📍 » : le repère
     existe toujours, il arrive simplement sans nom proposé. */
  /* ⚠️ LA MARQUE DANS LA DICTÉE NE CONCERNE QUE LE 📍 — v1004. Une
     ☠️ ou un ⚠️ est déjà attaché à SA ligne d'observation, qui dit
     bien mieux de quoi il s'agit ; l'écrire en plus dans un texte
     que l'écran d'examen n'affiche pas, ce serait laisser traîner
     une donnée que personne ne relira. */
  if((NATURES_DU_POINT[type] ? type : 'repere') === 'repere'){
    marquerDansLaDictee(trajetReperes.length);
  }

  if(typeof vibrer === 'function') vibrer();
  else if(navigator && navigator.vibrate){ try{ navigator.vibrate(60); }catch(e){} }

  oublierLaCarteDuTrajet();
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
/* ⚠️ COMBIEN DE TEMPS, ET COMBIEN DE PERDU : UNE SEULE RÉPONSE — v999.

   Trois fonctions calculaient la durée et le silence chacune de son
   côté — « trajetComplet », « manqueAuTrajet » et « trajetPourEnvoi ».
   Elles n'étaient déjà pas d'accord, et c'est ce désaccord que David
   a mis au jour : « l'enregistrement du trajet commence bien dès
   qu'on démarre le cours, il ne faut pas attendre 1 point ? »

   ⚠️ DEUX DURÉES, ET IL FAUT LES DEUX.

   · « duree » court du BOUTON à la fin : c'est le cours. C'est le
     dénominateur du dixième — la question « qu'est-ce qu'on a
     manqué » n'a de sens que rapportée au cours entier.

   · « releve » court du PREMIER POINT au dernier : c'est le TRACÉ.
     C'est lui, et lui seul, qu'on écrit à l'élève. Le bloc disait
     « 2,9 km en 30 min » quand le capteur avait mis dix minutes à
     accrocher et que vingt minutes seulement avaient été tracées.
     Une phrase fausse dans son mail.

   ⚠️ ET LE SILENCE DU DÉBUT COMPTE COMME CELUI DE LA FIN. Le trou
   d'APRÈS le dernier point était compté, le trou d'AVANT le premier
   ne l'était pas : la même minute sans relevé valait zéro au départ
   et pénalisait à l'arrivée. Une asymétrie n'est pas un choix, c'est
   un oubli. Le seuil d'une minute (TRAJET_SILENCE) laisse passer
   l'accroche normale d'un GPS, qui prend dix à trente secondes. */
function mesureDuTrajet(){
  const fin = trajetFin || Date.now();
  const premier = trajetPoints.length ? trajetPoints[0].t : 0;

  let perdu = trajetPerdu;

  /* Le trou de tête : le capteur cherchait, la voiture roulait. */
  if(premier && (premier - trajetDebut) > TRAJET_SILENCE){
    perdu += (premier - trajetDebut);
  }
  /* Le trou de queue : plus rien ne vient, et le cours dure encore. */
  if(trajetDernier && (fin - trajetDernier) > TRAJET_SILENCE){
    perdu += (fin - trajetDernier);
  }

  return {
    duree: trajetDebut ? (fin - trajetDebut) : 0,   /* le COURS */
    releve: premier ? (trajetDernier - premier) : 0, /* le TRACÉ */
    perdu: perdu
  };
}

function trajetComplet(){
  if(!trajetDebut) return false;
  if(trajetRefus) return false;
  if(trajetPoints.length < 10) return false;

  const m = mesureDuTrajet();
  if(m.duree < 60000) return false;

  /* ⚠️ ET LE TRACÉ LUI-MÊME DOIT DURER UNE MINUTE. Un cours d'une
     heure dont le capteur n'a rendu que quarante secondes au bout
     n'a pas de trajet à montrer, même si le cours, lui, a duré. */
  if(m.releve < 60000) return false;

  const perdu = m.perdu;
  const duree = m.duree;

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

  const m = mesureDuTrajet();
  const min = (x) => Math.max(1, Math.round(x / 60000));
  if(trajetPoints.length < 10) return 'Trop peu de relevés pour un tracé.';
  if(etendueDuTrajet(trajetPoints) < 300){
    return 'La voiture n’a pas bougé : pas de trajet.';
  }
  return 'Trajet incomplet : ' + min(m.duree - m.perdu) + ' min relevées sur ' +
         min(m.duree) + '.';
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
    manque: manqueAuTrajet(),
    /* L'incident en cours, s'il y en a un. Il se dit à l'écran —
       le moniteur doit savoir que le capteur cherche — mais il ne
       condamne PAS le trajet : voir le ⚠️ de la v998. */
    panne: trajetPanne
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
    /* ⚠️ LA DURÉE DU TRACÉ, PAS CELLE DU COURS — v999. C'est cette
       ligne-là que l'élève lit sous sa carte : elle doit décrire ce
       qu'elle montre. Voir mesureDuTrajet. */
    minutes: Math.round(mesureDuTrajet().releve / 60000),
    reperes: trajetReperes.map((r, i) => ({
      n: i + 1,
      heure: heure(r.t),
      nom: String(r.nom || ''),
      type: r.type || 'repere',
      /* ⚠️ LA POSITION DU REPÈRE PART AUSSI — v1010. Sans elle, un
         trajet relu dans le classeur rend un trait SANS SES
         PASTILLES : c'est-à-dire exactement ce qu'on vient
         chercher. Le point est sur le tracé, qui est déjà rangé
         entier : on n'ajoute pas un lieu, on dit lequel des points
         déjà écrits porte une marque. */
      lat: (r.lat == null) ? '' : Math.round(r.lat * 1e5) / 1e5,
      lon: (r.lon == null) ? '' : Math.round(r.lon * 1e5) / 1e5,
      /* Le thème et les deux remarques ne servent QUE pour le lien
         du mail, monté dans la foulée. Ils ne sont pas rangés dans
         le classeur : ils sont déjà dans le bilan, et le même fait
         gardé à deux endroits finit par être servi par sa copie
         périmée. */
      theme: String(r.theme || ''),
      insp: String(r.insp || ''),
      mon: String(r.mon || '')
    }))
  };
}

/* ============================================================
   CE QUI SE DIT AVANT DE GÉNÉRER — v997

   ⚠️ UN TRAJET COUPÉ SE SIGNALE AVANT DE GÉNÉRER, PAS AU MOMENT
   D'ENVOYER. Le bilan vocal appliquait la règle depuis la v986 :
   sa ligne d'alerte porte « trajet incomplet » à côté des autres
   soucis, sous les yeux du moniteur, avant qu'il n'appuie.

   Le bilan manuel, lui, ajoutait « blocTrajet() » — qui rend une
   chaîne VIDE quand le trajet ne vaut rien — et ne disait rien du
   tout. David, le 15 septembre, après un vrai cours : « j'ai
   envoyé mon bilan et je n'ai rien du tout dans le bilan que j'ai
   reçu ni sur ma génération je n'ai pas les points repéré ». Il
   avait pourtant appuyé sur 📍 plusieurs fois. Une règle que je
   n'avais écrite que sur un des deux écrans.

   Cette porte-ci est celle du bilan manuel : elle clôt le relevé
   (la durée du trajet, c'est la durée du cours) et, si le tracé
   ne partira pas, elle le dit et laisse le choix.
   ============================================================ */
async function signalerLeTrajetAvantDeGenerer(){
  if(!trajetDebut) return true;        /* aucun relevé : rien à dire */

  arreterTrajet();                     /* le cours est fini */
  if(trajetComplet()) return true;

  const n = trajetReperes.length;
  const reperes = n
    ? '\n\n' + n + (n > 1 ? ' repères ont été posés' : ' repère a été posé') +
      ' pendant ce cours : ' + (n > 1 ? 'ils ne partiront pas' : 'il ne partira pas') +
      ' non plus.'
    : '';

  const suite = await confirmer(
    '⚠️ ' + (manqueAuTrajet() || 'Trajet incomplet.') +
    '\n\nLe tracé ne sera donc PAS joint à ce bilan.' + reperes +
    '\n\nLe plus souvent, c\'est l\'écran qui s\'est verrouillé pendant ' +
    'la conduite : le téléphone doit rester allumé, écran vers le haut, ' +
    'pendant tout le cours.' +
    '\n\nGénérer quand même le bilan, sans le trajet ?',
    'Trajet non joint');

  return suite === true;
}

/* Nommer un repère depuis l'écran de relecture */
function nommerRepere(numero, nom){
  const r = trajetReperes[numero - 1];
  if(!r) return false;
  r.nom = String(nom || '').trim();
  return true;
}

/* ============================================================
   CHANGER LA NATURE D'UN POINT, ET EN RETIRER UN — v1004

   ⚠️ RETIRER LA MARQUE NE RETIRE PAS LE POINT. Le moniteur a
   appuyé à cet endroit-là : le moment est vrai, seule sa
   qualification a changé. Un point qui disparaît décale tous les
   numéros suivants — « regarde le 4 » désignerait le 5 — et la
   ligne d'observation qui pointait vers lui montrerait autre
   chose. Une marque retirée redevient donc un point de travail.

   ⚠️ SAUF L'APPUI RATÉ, qui n'a jamais rien voulu dire : celui-là
   se retire pour de bon, et c'est le seul cas.
   ============================================================ */
function changerNatureDuPoint(numero, type, nom){
  const r = trajetReperes[numero - 1];
  if(!r) return false;
  r.type = NATURES_DU_POINT[type] ? type : 'repere';
  if(nom !== undefined) r.nom = String(nom || '').trim();
  oublierLaCarteDuTrajet();
  return true;
}

function retirerLePoint(numero){
  if(numero < 1 || numero > trajetReperes.length) return false;
  trajetReperes.splice(numero - 1, 1);
  oublierLaCarteDuTrajet();
  return true;
}

/* ============================================================
   LE RANG D'UN POINT, DEPUIS SON IDENTITÉ — v1004

   C'est la seule porte entre « la ligne d'observation d'un examen »
   et « la pastille sur la carte ». La ligne garde l'IDENTITÉ, qui
   ne bouge jamais ; elle affiche le RANG, qui se recalcule. Un
   point retiré renumérote tout le reste, et personne ne montre le
   mauvais endroit.

   Rend 0 quand le point n'existe plus : la ligne dira qu'elle n'a
   pas de point, au lieu d'en désigner un faux.
   ============================================================ */
function rangDuPoint(id){
  if(!id) return 0;
  for(let i = 0; i < trajetReperes.length; i++){
    if(trajetReperes[i].id === Number(id)) return i + 1;
  }
  return 0;
}

/* ⚠️ POSER LE POINT AU MOMENT DE L'APPUI, PAS APRÈS LA FENÊTRE.

   Le bouton ☠️ ouvre « Quelle catégorie ? », le ⚠️ en ouvre deux.
   Entre l'appui et la réponse, la voiture a roulé — parfois trois
   cents mètres. Prendre la position à la fermeture de la fenêtre
   poserait la faute au carrefour SUIVANT. On la prend ici, tout de
   suite, et on annule si le moniteur renonce.

   Rend 0 si aucun relevé ne tourne : une ☠️ doit se marquer même
   sans GPS — c'est la fiche qui compte, la carte est un plus. */
function poserLePointDUneMarque(type){
  const n = poserRepere(type);
  if(!n) return 0;
  if(typeof dessinerEtatDuTrajet === 'function') dessinerEtatDuTrajet();
  return trajetReperes[n - 1].id;
}

/* Le moniteur a fermé la fenêtre sans choisir : le point n'a plus
   de raison d'être. C'est le dernier posé, donc rien ne bouge. */
function annulerLePointDUneMarque(id){
  const rang = rangDuPoint(id);
  if(rang) retirerLePoint(rang);
}

/* La marque est retirée de la ligne : le point redevient un point
   de travail. Il ne disparaît pas — voir le ⚠️ ci-dessus. */
function rendreLePointAuTravail(id){
  const rang = rangDuPoint(id);
  if(rang) changerNatureDuPoint(rang, 'repere', '');
}

/* ============================================================
   CE QUE L'ERREUR DIT, VERSÉ DANS SON POINT — v1006

   David : « pour le GPS examen blanc il faut que ça note dans le
   bilan des erreurs les points correspondants. Et sur la page voir
   en grand que ça renote tout pour l'erreur : réflexion de
   l'inspecteur, remarque du moniteur et les 3 questions du dessous
   pour le thème complet. » Puis, pour l'officiel : « au bout de la
   ligne remarque de l'inspecteur le numéro du point, et sur la
   page que ça reprenne les 2 remarques ».

   ⚠️ LES TEXTES SONT VERSÉS AU MOMENT DE LA COMPOSITION, PAS À LA
   POSE. Le moniteur appuie sur ☠️ en roulant et écrit sa remarque
   plus tard : à la pose, il n'y a rien à copier. On les verse donc
   quand le bilan se compose — le même instant où son texte se
   fige. Les deux ne peuvent pas diverger, puisqu'ils sont pris
   ensemble.

   ⚠️ ET LES TROIS QUESTIONS NE VOYAGENT PAS. Elles sont les mêmes
   pour tout le monde et pour toujours : la page les porte
   elle-même. Les mettre dans le lien, ce serait les recopier une
   fois par erreur dans une adresse déjà longue.
   ============================================================ */
function decrireLePoint(id, d){
  const rang = rangDuPoint(id);
  if(!rang) return false;
  const r = trajetReperes[rang - 1];
  const propre = (v) => String(v === undefined || v === null ? '' : v).trim();
  r.theme = propre(d && d.theme);
  r.insp  = propre(d && d.insp);
  r.mon   = propre(d && d.mon);
  return true;
}

/* ⚠️ LA MENTION DU POINT DANS LE BILAN — v1006, et UNE SEULE FOIS.

   Trois écrans écrivent la ligne d'une erreur : le bilan d'examen
   blanc, celui de l'examen officiel, et le cadre qui se remplit en
   direct pendant l'examen. Ils disaient déjà la même phrase à trois
   endroits — c'est écrit dans leurs commentaires depuis la v911.
   La mention du point sort donc d'ici, sinon elle finira par ne
   plus se dire pareil selon l'écran.

   ⚠️ ET ELLE SE TAIT SI LE TRACÉ NE PART PAS. « Point 4 sur la
   carte » dans un bilan sans carte envoie l'élève chercher une
   image qui n'existe pas. */
function phraseDuPoint(rang){
  return rang ? ' · point ' + rang + ' sur la carte' : '';
}

function mentionDuPoint(o){
  if(!o || !o.point) return '';
  /* ⚠️ LA PHRASE EST LA MÊME, LA CONDITION NON. Le bilan ne renvoie
     à un point que si le tracé PART ; la fiche d'examen, elle,
     l'affiche dès l'appui — le moniteur doit voir tout de suite
     quel numéro il vient de poser, même si le trajet n'est pas
     encore assez long pour être envoyé. Deux conditions, une seule
     écriture : voir phraseDuPoint, et surLaCarte dans ec-manuel.js. */
  if(!trajetComplet()) return '';
  return phraseDuPoint(rangDuPoint(o.point));
}

/* Les trois questions accompagnent-elles ce bilan ? L'examen blanc
   les pose, l'officiel non — voir buildExamen. */
let trajetAvecQuestions = false;
function poserLesQuestionsDuTrajet(oui){ trajetAvecQuestions = !!oui; }

/* La marque est confirmée : le point prend sa nature et son nom,
   et rend son rang — c'est ce que la ligne affichera. */
function marquerLePoint(id, type, nom){
  const rang = rangDuPoint(id);
  if(rang) changerNatureDuPoint(rang, type, nom);
  return rang;
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
  const duree = dureeDuTrajetEnMots(t.minutes);

  let out = '\n\n🗺️ 𝗡𝗼𝘁𝗿𝗲 𝘁𝗿𝗮𝗷𝗲𝘁 : ' + km + ' km en ' + duree;

  /* Les repères nommés d'abord ; ceux qui n'ont pas de nom
     portent au moins leur heure — c'est déjà un rendez-vous dans
     le récit du cours. */
  t.reperes.forEach((r) => {
    /* ⚠️ L'ICÔNE SORT DE LA TABLE — v1004. C'est la même qui sert
       sur la carte, dans le mail et dans le tiroir : trois écritures
       finiraient par ne plus dire la même chose. */
    out += '\n' + natureDuPoint(r.type).icone + ' ' + r.n + ' · ' + r.heure +
           (r.nom ? ' — ' + r.nom : '');
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
/* ⚠️ LA CARTE EST DESSINÉE EN DOUBLE — v1002.

   David, en regardant la sienne : « je ne suis pas sûr que ce soit
   assez précis là avec juste une image ». Il avait raison : huit
   kilomètres étalés sur six cent quarante pixels, ça fait douze
   mètres par pixel, et les noms de rue sont à peine lisibles.

   Doubler le canevas SEUL n'aurait rien donné : on aurait grossi
   les mêmes tuiles. Ce qui apporte du détail, c'est que la fenêtre
   fasse 1280 × 800 pixels de carte : « zoomQuiRentre » descend
   alors d'un cran de zoom, et l'IGN rend des tuiles plus fines.
   L'image est ensuite affichée en 520 px de large dans le mail —
   nette sur un écran de téléphone, et zoomable du doigt. */
/* ============================================================
   CE QU'UN POINT PEUT ÊTRE — v1004

   David : « sur les examens blancs et les examens officiels,
   est-ce que quand on met une tête de mort ça peut faire un point
   sur la carte, pareil quand on appuie sur le Attention, et que ce
   soit lié en bas ».

   Un point posé pendant un cours a une NATURE. Elle décide de sa
   couleur sur la carte, de son icône dans le mail, et de rien
   d'autre : la position, l'heure et le numéro se calculent pareil
   pour les trois. Une seule liste, une seule série de numéros —
   « regarde le 4 » doit désigner le même point partout.

   ⚠️ ET LA TABLE EST ICI, UNE SEULE FOIS. La couleur du canevas,
   celle de la page « en grand », l'icône du texte et celle du
   tiroir sortent toutes de ces trois lignes. Écrites quatre fois,
   elles finiraient par ne plus dire la même chose, et l'élève
   verrait une pastille rouge en face d'un point de travail. */
const NATURES_DU_POINT = {
  repere:    { icone: '📍', couleur: '#3B6900', mot: 'Point de travail' },
  attention: { icone: '⚠️', couleur: '#C2700B', mot: 'Erreur à reprendre' },
  elim:      { icone: '☠️', couleur: '#B3261E', mot: 'Erreur éliminatoire' }
};
function natureDuPoint(t){
  return NATURES_DU_POINT[t] || NATURES_DU_POINT.repere;
}

const CARTE_ECHELLE = 2;
const CARTE_LARGEUR = 640 * CARTE_ECHELLE;
const CARTE_HAUTEUR = 400 * CARTE_ECHELLE;
const CARTE_TUILE = 256;
const CARTE_MARGE = 46 * CARTE_ECHELLE;  /* pour que les pastilles tiennent */
const CARTE_ZOOM_MAX = 18;       /* la borne haute de la route « /tuile » */
const CARTE_ZOOM_MIN = 8;

/* ⚠️ LES TUILES NE PARTENT PLUS TOUTES ENSEMBLE — v1002.

   David, sur sa première vraie carte : « c'est bizarre ». Elle
   avait deux bandes de plan et des trous crème au milieu.

   Les vingt-quatre tuiles étaient demandées d'un seul coup, chacune
   avec huit secondes de patience et AUCUN réessai : celles qui
   n'arrivaient pas laissaient un carré vide définitif dans le mail
   de l'élève. Sur un Worker froid et un cache vide — exactement le
   premier essai après une mise en ligne — la moitié tombait.

   On les demande donc par petits paquets, et une tuile qui rate a
   droit à une seconde chance : à ce moment-là le Worker est chaud
   et la tuile voisine est déjà en cache pour un mois.

   ⚠️ MAIS LE BILAN NE SE FAIT JAMAIS ATTENDRE INDÉFINIMENT. Passé
   le budget global, on dessine avec ce qu'on a. Un bilan qui
   n'arriverait pas parce qu'une carte n'a pas pu se dessiner
   serait une belle image payée très cher. */
const CARTE_TUILES_EN_MEME_TEMPS = 4;
const CARTE_DELAI_TUILE = 9000;      /* une tentative */
const CARTE_BUDGET_TUILES = 30000;   /* toutes tentatives confondues */

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
function chargerUneTuile(z, x, y, delai){
  return new Promise((ok) => {
    const img = new Image();
    /* ⚠️ SANS CETTE LIGNE, LE CANVAS EST « SALI » et l'export
       échoue au dernier moment, avec une erreur de sécurité — au
       moment précis où le moniteur croit son bilan parti. C'est la
       route « /tuile » du Worker qui la rend possible. */
    img.crossOrigin = 'anonymous';
    /* Une seule réponse, quoi qu'il arrive : le délai peut tomber
       pendant que l'image finit d'arriver. */
    let rendu = false;
    const rendre = (v) => { if(!rendu){ rendu = true; ok(v); } };
    img.onload = () => rendre(img);
    img.onerror = () => rendre(null);
    const base = (typeof CONFIG === 'object' && CONFIG && CONFIG.WORKER_URL)
      ? CONFIG.WORKER_URL : '';
    img.src = base + '/tuile?z=' + z + '&x=' + x + '&y=' + y;
    /* Une tuile qui ne répond pas ne doit pas tenir le bilan. */
    setTimeout(() => rendre(null), delai || CARTE_DELAI_TUILE);
  });
}

/* Les tuiles, par petits paquets, avec une seconde chance pour
   celles qui ratent — et un budget qui ne se dépasse pas. */
async function chargerLesTuiles(demandes, z){
  const fini = Date.now() + CARTE_BUDGET_TUILES;
  let prochaine = 0;

  const front = async () => {
    while(prochaine < demandes.length){
      const d = demandes[prochaine++];
      if(Date.now() > fini){ d.img = null; continue; }

      d.img = await chargerUneTuile(z, d.tx, d.ty);

      /* ⚠️ LA SECONDE CHANCE EST CE QUI BOUCHE LES TROUS. Au
         premier passage le Worker se réveille et le cache est
         vide ; au second il est chaud, et la tuile voisine a déjà
         payé l'attente pour tout le monde. */
      if(!d.img && Date.now() < fini){
        d.img = await chargerUneTuile(z, d.tx, d.ty);
      }
    }
  };

  const fronts = [];
  const combien = Math.min(CARTE_TUILES_EN_MEME_TEMPS, demandes.length);
  for(let i = 0; i < combien; i++) fronts.push(front());
  await Promise.all(fronts);
  return demandes.filter(d => !d.img).length;   /* les trous restants */
}

/* Le dessin, de bout en bout. Rend une image en base64, ou ''. */
/* ⚠️ LA CARTE NE VIENT PLUS FORCÉMENT DE LA MÉMOIRE — v1011.

   David : « qu'on voit la carte directement dans le bilan » et
   « le lien de la carte sous le cours dans les anciens cours ».
   Un ancien cours n'est plus en mémoire : son tracé revient du
   classeur, décodé. C'est donc le MÊME dessin qui sert aux deux —
   un second dessinateur pour les anciens cours finirait par ne
   plus peindre comme celui d'aujourd'hui, et l'élève recevrait
   deux cartes qui ne se ressemblent pas.

   Sans arguments : le relevé du cours ouvert, comme avant. */
async function dessinerLaCarte(pointsFournis, reperesFournis){
  const surMesure = Array.isArray(pointsFournis);
  if(!surMesure && !trajetComplet()) return '';
  if(typeof document === 'undefined' || !document.createElement) return '';

  const marques = surMesure ? (reperesFournis || []) : trajetReperes;
  const points = simplifierTrajet(surMesure ? pointsFournis : trajetPoints);
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

  const demandes = [];
  for(let tx = t0x; tx <= t1x; tx++){
    for(let ty = t0y; ty <= t1y; ty++){
      if(tx < 0 || ty < 0 || tx >= max || ty >= max) continue;
      demandes.push({ tx: tx, ty: ty, img: null });
    }
  }

  const trous = await chargerLesTuiles(demandes, z);
  if(trous) console.warn('Carte : ' + trous + ' tuile(s) manquante(s) sur ' +
                         demandes.length);

  demandes.forEach((d) => {
    if(!d.img) return;
    c.drawImage(d.img, d.tx * CARTE_TUILE - gauche, d.ty * CARTE_TUILE - haut,
                CARTE_TUILE, CARTE_TUILE);
  });

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
  /* ⚠️ TOUT CE QUI EST DESSINÉ SUIT L'ÉCHELLE — v1002. Un trait de
     onze pixels sur un canevas deux fois plus grand devient un
     cheveu : les épaisseurs, les rayons et les textes se
     multiplient comme la fenêtre, sinon doubler la résolution
     revient à effacer le tracé. */
  const e = (n) => n * CARTE_ECHELLE;

  c.lineJoin = 'round'; c.lineCap = 'round';
  tracer();
  c.strokeStyle = '#FFFFFF'; c.lineWidth = e(11); c.stroke();
  tracer();
  c.strokeStyle = '#3B6900'; c.lineWidth = e(4); c.stroke();

  /* Le départ : un cercle creux. L'arrivée : un carré plein. */
  const a = chemin[0], b = chemin[chemin.length - 1];
  c.beginPath(); c.arc(a.x, a.y, e(7), 0, Math.PI * 2);
  c.fillStyle = '#FFFFFF'; c.fill();
  c.strokeStyle = '#3B3B3B'; c.lineWidth = e(2.5); c.stroke();
  c.fillStyle = '#14161B';
  c.fillRect(b.x - e(7), b.y - e(7), e(14), e(14));

  /* Les repères, numérotés, cerclés de blanc pour rester lisibles
     sur n'importe quel fond. */
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  marques.forEach((r, i) => {
    if(r.lat == null || r.lon == null || r.lat === '' || r.lon === '') return;
    const x = carteX(r.lon, z) - gauche;
    const y = carteY(r.lat, z) - haut;
    c.beginPath(); c.arc(x, y, e(14), 0, Math.PI * 2);
    /* ⚠️ LA COULEUR SORT DE LA TABLE, PAS D'ICI — v1004. Une
       pastille rouge en face d'un point de travail, ce serait dire
       à l'élève qu'il a commis une faute là où on a juste
       travaillé. Voir NATURES_DU_POINT. */
    c.fillStyle = natureDuPoint(r.type).couleur; c.fill();
    c.strokeStyle = '#FFFFFF'; c.lineWidth = e(2.5); c.stroke();
    c.fillStyle = '#FFFFFF';
    c.font = 'bold ' + e(15) + 'px Arial, sans-serif';
    c.fillText(String(i + 1), x, y + e(1));
  });

  /* ⚠️ L'ATTRIBUTION EST OBLIGATOIRE, et elle vit DANS l'image :
     écrite à côté dans le mail, elle disparaîtrait au premier
     transfert. */
  const mention = 'Plan IGNV2 — Carte © IGN/Géoportail';
  c.font = e(11) + 'px Arial, sans-serif';
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  const l = c.measureText(mention).width + e(12);
  c.fillStyle = 'rgba(255,255,255,.78)';
  c.fillRect(CARTE_LARGEUR - l, CARTE_HAUTEUR - e(18), l, e(18));
  c.fillStyle = '#5A5A5A';
  c.fillText(mention, CARTE_LARGEUR - e(6), CARTE_HAUTEUR - e(5));

  try{
    /* ⚠️ 0,72 ET NON 0,82 — v1002. À résolution double, une
       compression un peu plus forte rend une image plus nette
       qu'une compression douce à résolution simple, et le mail
       reste léger. C'est le nombre de pixels qui fait la finesse,
       pas la qualité JPEG. */
    return toile.toDataURL('image/jpeg', 0.72);
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

/* ============================================================
   LE LIEN « VOIR EN GRAND » — v1002

   ⚠️ IL PORTE SON CONTENU, IL NE DÉSIGNE RIEN. Le tracé et les
   repères voyagent DANS l'adresse : aucune recherche dans le
   classeur, aucun identifiant à deviner, rien à stocker, rien à
   effacer. Voir carte.html.

   ⚠️ ET IL A UNE LIMITE DE LONGUEUR. Certaines messageries coupent
   les adresses très longues, et une adresse coupée rend une page
   vide — pire qu'une absence de lien, parce que l'élève clique. Au
   delà de la limite, on ne met pas de lien : l'image, elle, est
   toujours là.
   ============================================================ */
/* ⚠️ CE QU'UNE ADRESSE PEUT PORTER — v1006.

   Les navigateurs encaissent bien plus, mais certaines messageries
   coupent les adresses très longues, et une adresse coupée rend une
   page vide — pire qu'une absence de lien, parce que l'élève clique
   quand même.

   Quatre mille caractères tiennent partout où nous envoyons. Une
   remarque plus longue que deux cents signes est tronquée : le
   texte entier est de toute façon dans le corps du mail, et la page
   sert à SITUER l'erreur, pas à remplacer le bilan. */
const CARTE_LIEN_MAX = 4000;
const CARTE_REMARQUE_MAX = 200;

function lienVersLaCarte(t){
  try{
    if(!t || !t.polyligne) return '';

    const court = (v) => {
      const s = String(v || '').replace(/[~|]/g, ' ')
                               .replace(/\s+/g, ' ').trim();
      return (s.length > CARTE_REMARQUE_MAX)
        ? s.slice(0, CARTE_REMARQUE_MAX - 1) + '…' : s;
    };

    /* Les repères : « numéro~heure~nom~lat~lon~nature~thème~
       inspecteur~moniteur », séparés par des barres. Les coordonnées
       au dix-millième suffisent pour poser une pastille — dix
       mètres — et raccourcissent l'adresse d'autant. */
    /* ⚠️ LA POSITION VIENT DU REPÈRE, PLUS DE LA MÉMOIRE — v1011.
       Elle allait la chercher dans « trajetReperes » par son rang :
       ça marchait pour le cours ouvert, et rendait une carte sans
       pastilles pour un cours relu dans le classeur. Le repère
       porte sa position depuis la v1010 ; on la lit là. */
    const ecrire = (avecTextes) => (t.reperes || []).map((x) => {
      const lat = (x.lat === '' || x.lat == null)
        ? '' : Number(x.lat).toFixed(4);
      const lon = (x.lon === '' || x.lon == null)
        ? '' : Number(x.lon).toFixed(4);
      const base = [x.n, x.heure, court(x.nom), lat, lon,
                    x.type || 'repere'];
      return avecTextes
        ? base.concat([court(x.theme), court(x.insp), court(x.mon)]).join('~')
        : base.join('~');
    }).join('|');

    const monter = (r) =>
      'https://app.evolutionconduites.fr/carte.html' +
      '?t=' + encodeURIComponent(t.polyligne) +
      '&km=' + encodeURIComponent(String(t.km).replace('.', ',')) +
      '&min=' + encodeURIComponent(String(t.minutes)) +
      (trajetAvecQuestions ? '&q=1' : '') +
      (r ? '&r=' + encodeURIComponent(r) : '');

    /* ⚠️ ON DÉGRADE, ON N'ABANDONNE PAS. Un bilan très bavard ne
       doit pas coûter la carte entière à l'élève : s'il ne tient pas
       avec les remarques, il repart sans elles — les pastilles
       restent, et le texte est dans le mail juste au-dessus. */
    const complet = monter(ecrire(true));
    if(complet.length <= CARTE_LIEN_MAX) return complet;

    const nu = monter(ecrire(false));
    return (nu.length > CARTE_LIEN_MAX) ? '' : nu;
  }catch(e){
    return '';
  }
}

/* ============================================================
   LA CARTE SE DESSINE D'AVANCE — v1003

   David : « l'envoi par mail c'est super long ». Le calcul, lui,
   ne prend que deux cents millisecondes ; ce qui dure, c'est
   d'aller chercher vingt-quatre tuiles. Et on les cherchait au
   moment PRÉCIS où le moniteur appuie sur « envoyer », donc en
   pleine attente.

   Or le cours est fini bien avant : dès que le relevé s'arrête, le
   tracé ne bougera plus. On lance donc le dessin à ce moment-là —
   pendant que l'IA rédige le bilan, pendant que le moniteur relit
   son texte et nomme ses repères. Quand il appuie, l'image est
   déjà là.

   ⚠️ ON NE GARDE QUE L'IMAGE, JAMAIS LE BLOC HTML. L'image ne
   porte que des NUMÉROS ; le bloc, lui, porte les NOMS des repères
   — et ces noms se tapent APRÈS, dans le tiroir de relecture.
   Garder le bloc reviendrait à envoyer à l'élève les noms d'avant
   sa correction : le même fait gardé à deux endroits, et c'est la
   copie périmée qui gagne. Le bloc se reconstruit donc à chaque
   envoi, sur les noms du moment.

   ⚠️ ET ELLE NE FAIT JAMAIS ÉCHOUER QUOI QUE CE SOIT. Si le dessin
   rate, on rend une chaîne vide : le mail part sans carte, et
   l'élève a son bilan.
   ============================================================ */
function preparerLaCarteDuTrajet(){
  if(carteEnPreparation) return carteEnPreparation;
  if(!trajetComplet()) return null;
  carteEnPreparation = dessinerLaCarte().catch((e) => {
    console.warn('Carte du trajet préparée en vain :', e);
    return '';
  });
  return carteEnPreparation;
}

/* L'image du trajet : celle préparée d'avance si elle existe, et
   sinon dessinée maintenant. Une seule porte pour les deux cas. */
async function imageDuTrajet(){
  return (await preparerLaCarteDuTrajet()) || '';
}

/* ============================================================
   ⚠️ L'IMAGE PRÉPARÉE MEURT DÈS QUE LES PASTILLES BOUGENT — v1012

   L'image porte les NUMÉROS et les COULEURS des points. Retirer un
   point renumérote tout ce qui suit ; changer sa nature le
   repeint ; en poser un de plus en ajoute un que l'image n'a pas.
   Garder l'image d'avant, c'est envoyer à l'élève une carte qui
   désigne le mauvais endroit — un tampon qui ment est pire qu'un
   tampon absent.

   ⚠️ LES NOMS, EUX, NE PÉRIMENT RIEN : ils ne sont pas dans
   l'image (voir le ⚠️ de « preparerLaCarteDuTrajet »). Renommer un
   repère dans le tiroir de relecture ne redessine donc pas — et
   c'est heureux, sinon chaque lettre tapée relancerait
   vingt-quatre tuiles.

   Une seule porte, appelée par les trois seules fonctions qui
   touchent à la composition des repères : « poserRepere »,
   « changerNatureDuPoint » et « retirerLePoint ». Tout le reste
   passe par elles.
   ============================================================ */
function oublierLaCarteDuTrajet(){
  carteEnPreparation = null;
}

/* ⚠️ LA DURÉE S'ÉCRIT UNE SEULE FOIS — v1012. Elle se lit à trois
   endroits : dans le texte du bilan, sous la carte du mail, et
   sous la carte de l'écran. Trois écritures du même calcul, et
   c'est la troisième qui dirait « 65 min » là où les deux autres
   disent « 1 h 05 ». */
function dureeDuTrajetEnMots(minutes){
  const n = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? (h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''))
           : (m + ' min');
}

/* ============================================================
   ⚠️ LE TRACÉ N'APPARTIENT QU'AU COURS OUVERT — v1009

   David, le 16 septembre : « j'ai renvoyé par mail un cours en
   manuel, c'était l'examen blanc d'un élève, et je ne vois pas la
   carte avec les points. »

   La carte manquait, oui — le relevé n'est plus en mémoire quand
   on renvoie un ancien bilan depuis l'historique. Mais en
   regardant pourquoi, j'ai trouvé pire : « carteDuTrajetPourMail »
   ne regardait PAS de qui était le bilan. Elle joignait le tracé
   présent en mémoire, quel qu'il soit.

   ⚠️ DONC : un moniteur qui a un cours EN COURS, et qui renvoie
   depuis l'historique le bilan d'un AUTRE élève, lui envoyait le
   trajet de l'élève assis à côté de lui. Le trajet d'un élève dans
   le mail d'un autre — exactement ce que « oublierLeTrajet »
   empêche entre deux cours, et que ce chemin-ci contournait.

   La carte ne part donc que si le tracé est bien celui du cours
   ouvert, et c'est le MODULE qui le vérifie, pas l'appelant : une
   parade posée chez l'appelant est une parade qu'on oublie, et il
   y a déjà deux appelants.
   ============================================================ */
function leTrajetEstDeCeCours(eleve){
  const demande = String(eleve || '').trim().toLowerCase();
  const ouvert = (typeof $ === 'function' && $('studentName'))
    ? String($('studentName').value || '').trim().toLowerCase() : '';
  return !!demande && !!ouvert && demande === ouvert;
}

/* ============================================================
   UN TRAJET RELU DANS LE CLASSEUR — v1011

   David : « j'ai renvoyé par mail un cours en manuel […] je ne
   vois pas la carte avec les points », puis, sur ce qu'il veut :
   « la carte comme au premier envoi ».

   Le classeur rend une ligne : un tracé encodé, des kilomètres,
   des minutes, et des repères qui portent désormais leur position
   et leur nature (v1010). On le remet dans la forme que tout le
   reste attend — celle de « trajetPourEnvoi » — et à partir de là
   il n'y a plus qu'un seul chemin : le même dessin, le même bloc
   HTML, le même lien.

   ⚠️ LE THÈME ET LES DEUX REMARQUES NE SONT TOUJOURS PAS RANGÉS
   DANS LE CLASSEUR — et ils ne le seront pas. Ils sont dans le
   bilan ; les ranger une seconde fois, c'était garantir qu'une des
   deux copies serait fausse un jour.

   Ils reviennent quand même sur une carte relue, depuis la v1012 :
   on les RELIT dans le bilan de ce cours-là, qui est juste à côté
   dans le classeur. Voir « verserLeBilanDansLesPoints ». Une seule
   source, aucune copie.
   ============================================================ */
function trajetRangeVersPaquet(t){
  if(!t || !t.trace) return null;

  const points = decoderPolyligne(t.trace);
  if(points.length < 2) return null;

  const reperes = (t.reperes || []).map((r, i) => ({
    n: Number(r && r.n) || (i + 1),
    heure: String((r && r.heure) || ''),
    nom: String((r && r.nom) || ''),
    type: String((r && r.type) || 'repere'),
    lat: (r && r.lat !== '' && r.lat != null) ? Number(r.lat) : '',
    lon: (r && r.lon !== '' && r.lon != null) ? Number(r.lon) : '',
    theme: '', insp: '', mon: ''
  }));

  return {
    points: points,
    reperes: reperes,
    polyligne: String(t.trace),
    km: Number(String(t.km || '').replace(',', '.')) || 0,
    minutes: Number(t.minutes) || 0
  };
}

/* La carte d'un cours relu : la même que celle du jour même. Le
   texte du bilan, quand l'appelant l'a sous la main, lui rend ses
   remarques — voir « verserLeBilanDansLesPoints ». */
async function carteDunTrajetRange(t, texte){
  const p = verserLeBilanDansLesPoints(trajetRangeVersPaquet(t), texte);
  if(!p) return null;

  const image = await dessinerLaCarte(p.points, p.reperes);
  if(!image) return null;

  return paquetDeLaCarte(p, image);
}

/* ============================================================
   CE QUE L'ERREUR DISAIT, RELU DANS LE BILAN — v1012

   David, le 16 septembre, en rouvrant un ancien cours : « je n'ai
   pas les points affichés sur la carte avec l'explication en
   dessous ».

   Le thème, la réflexion de l'inspecteur et la remarque du
   moniteur ne voyagent que dans le lien du mail, monté à l'instant
   où le bilan se fige. Sur un cours relu, ce lien n'existe plus :
   il faut les retrouver.

   ⚠️ ON NE LES RANGE PAS UNE DEUXIÈME FOIS. Ils sont déjà dans le
   classeur — DANS LE BILAN, qui est la seule chose que l'élève a
   reçue. Les recopier à côté du tracé, ce serait s'engager à
   corriger deux textes chaque fois qu'on en corrige un, et c'est
   toujours la copie périmée qui finit par être servie. On relit
   donc la source.

   ⚠️ ET LE RENVOI SE CHERCHE PAR SA PHRASE, PAS PAR UN LITTÉRAL
   RECOPIÉ. « phraseDuPoint » écrit « · point 4 sur la carte » ;
   c'est elle qui fabrique ici le motif qui la reconnaît. Le jour
   où la phrase change, les deux changent ensemble.
   ============================================================ */
function motifDuRenvoiAuPoint(){
  return new RegExp(
    phraseDuPoint(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    .replace('1', '(\\d+)') + '\\s*$');
}

function lesPointsDuBilan(texte){
  const trouve = {};
  const motif = motifDuRenvoiAuPoint();
  const clair = (s) => (typeof sansGras === 'function')
    ? sansGras(String(s || '')) : String(s || '');

  const numero = (l) => {
    const m = clair(l).match(motif);
    return m ? Number(m[1]) : 0;
  };
  /* La ligne sans son émoji de tête et sans son renvoi : le renvoi
     serait redit sous une pastille qui le dit déjà. */
  const nettoyer = (l) => clair(l).replace(motif, '')
                                  .replace(/^[^\p{L}\p{N}]+/u, '')
                                  .trim();

  /* ⚠️ L'INSPECTEUR SE RECONNAÎT, LE MONITEUR NON. Son émoji change
     d'un moniteur à l'autre (emojiMoniteur) : sa ligne se reconnaît
     donc à sa PLACE — celle qui suit immédiatement l'inspecteur,
     avant la ligne vide ou les trois questions. */
  const TETES = ['👨‍✈️', '☠️'];

  let theme = '';
  let dernier = 0;

  String(texte || '').split('\n').forEach((brute) => {
    const l = String(brute).trim();
    if(!l){ dernier = 0; return; }

    if(l.indexOf('👉') === 0){          /* 👉 le titre de compétence */
      theme = nettoyer(l);
      dernier = 0;
      return;
    }
    /* ⚠️ AUCUNE GARDE POUR LES TROIS QUESTIONS. Elles sont toujours
       précédées d'une ligne vide — voir questionsElim — et la ligne
       vide a rendu la main juste au-dessus. J'en avais posé une :
       la retirer ne changeait rien à ce que le test lit, donc elle
       ne gardait rien. Une garde qu'aucun cas ne fait jouer est une
       garde qu'on croit avoir. */
    const n = numero(l);

    if(TETES.some(e => l.indexOf(e) === 0)){
      if(n){ trouve[n] = { theme: theme, insp: nettoyer(l), mon: '' }; dernier = n; }
      else dernier = 0;
      return;
    }

    if(dernier && trouve[dernier]){
      trouve[dernier].mon = nettoyer(l);
      dernier = 0;
      return;
    }
    /* Une erreur sans remarque d'inspecteur porte son renvoi sur la
       ligne du moniteur : elle compte autant. */
    if(n) trouve[n] = { theme: theme, insp: '', mon: nettoyer(l) };
    dernier = 0;
  });

  return trouve;
}

/* ⚠️ ON COMPLÈTE, ON N'ÉCRASE JAMAIS. Le cours du jour a ses
   remarques en mémoire, versées à la composition : elles sont plus
   sûres que ce qu'on relit d'un texte. Le bilan ne parle que là où
   la mémoire se tait. */
function verserLeBilanDansLesPoints(p, texte){
  if(!p || !texte) return p;

  const par = lesPointsDuBilan(texte);
  (p.reperes || []).forEach((r) => {
    const d = par[Number(r.n)];
    if(!d) return;
    if(!r.theme) r.theme = d.theme;
    if(!r.insp)  r.insp  = d.insp;
    if(!r.mon)   r.mon   = d.mon;
  });
  return p;
}

/* Ce que le mail reçoit : l'image, et le HTML qui la montre.

   ⚠️ « eleve » N'EST PAS DÉCORATIF : sans lui, pas de carte. Un
   appelant qui l'oublie n'obtient rien — c'est voulu, et c'est
   plus sûr que de lui faire confiance. */
async function carteDuTrajetPourMail(eleve){
  if(!leTrajetEstDeCeCours(eleve)) return null;

  const image = await imageDuTrajet();
  if(!image) return null;

  const t = trajetPourEnvoi();
  if(!t) return null;

  return paquetDeLaCarte(t, image);
}

/* ⚠️ LE BLOC DU MAIL, ÉCRIT UNE SEULE FOIS — v1011. Deux chemins y
   arrivent : le cours du jour et un cours relu. Deux écritures du
   même bloc, et l'élève recevrait deux mises en page selon qu'on
   lui renvoie son bilan ou qu'on le lui envoie. */
function paquetDeLaCarte(t, image){

  const echapper = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const km = String(t.km).replace('.', ',');
  const duree = dureeDuTrajetEnMots(t.minutes);

  let html =
    '<div style="margin-top:22px;">' +
    '<h3 style="font-size:15px;font-weight:800;margin:0 0 4px;' +
      'color:#3B6900;">🗺️ Notre trajet</h3>' +
    '<div style="font-size:13px;color:#64655F;margin:0 0 14px;">' +
      km + ' km · ' + duree + '</div>' +
    '<img src="cid:trajet" alt="Le tracé de notre trajet" ' +
      'style="display:block;width:100%;max-width:520px;height:auto;' +
      'border:1px solid #DCDCD3;border-radius:12px;">';

  /* ⚠️ ET LE MÊME TRAJET, EN GRAND — v1002.

     L'image reste : elle se lit sans rien ouvrir, même hors ligne,
     même dix ans plus tard. Mais elle est figée. Le lien ouvre la
     page « carte.html », où l'élève zoome jusqu'au nom de sa rue.

     ⚠️ LE LIEN PORTE SON CONTENU, IL NE DÉSIGNE RIEN. Pas
     d'identifiant, pas de recherche dans le classeur, rien de
     devinable en changeant un numéro : le tracé est DANS l'adresse.
     Un lien qui ne pointe sur rien ne peut rien laisser fuir, et il
     meurt avec le mail qui le portait.

     Si le lien ne peut pas être fabriqué, le mail part sans lui :
     l'image, elle, est déjà là. */
  const grand = lienVersLaCarte(t);
  if(grand){
    html +=
      '<div style="margin-top:10px;">' +
      '<a href="' + echapper(grand) + '" ' +
        'style="display:inline-block;font-size:13px;font-weight:700;' +
        'color:#3B6900;text-decoration:none;border:1px solid #DCDCD3;' +
        'border-radius:9px;padding:9px 14px;">🔍 Voir le trajet en grand</a>' +
      '</div>';
  }

  if(t.reperes.length){
    html += '<div style="margin-top:14px;">';
    t.reperes.forEach((r) => {
      const nat = natureDuPoint(r.type);
      html += '<div style="padding:8px 0;border-top:1px solid #DCDCD3;' +
        'font-size:14px;line-height:1.5;color:#14161B;">' +
        nat.icone + ' <b style="color:' + nat.couleur + ';">' + r.n + '</b> · ' +
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
    n: i + 1, heure: heure(r.t), nom: String(r.nom || ''),
    type: r.type || 'repere'
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
  /* ⚠️ LA PANNE SE VOIT, MAIS NE CONDAMNE RIEN — v998. Le capteur
     cherche : le moniteur a le droit de le savoir, et il a aussi
     le droit qu'on ne lui annonce pas un trajet perdu pour trois
     secondes sous un porche. Le trajet reste « en cours ». */
  mot.textContent = r.panne ? '📡 Position cherchée…' : 'Trajet en cours';
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

   ⚠️ ET SUR LE BILAN MANUEL, C'EST AU BOUT DES CHAMPS.

   J'avais d'abord compris « sous la rubrique manœuvres » et je
   l'insérais DANS les champs, juste après elle. David, dans la
   foulée : « en fait c'est juste au-dessus de composer le bilan,
   sous la fiche manœuvre ». C'est-à-dire tout en bas, après la
   dernière rubrique, avant le bouton.

   Ce n'est pas qu'un déplacement de quelques pixels : les champs
   du bilan manuel se redessinent en vidant leur zone d'un coup, à
   chaque changement de modèle et de niveau. Le bloc rangé AU
   MILIEU d'eux partait avec — et comme il est unique, il ne
   revenait pas. Il fallait donc le mettre à l'abri avant chaque
   vidage et le reposer après : deux gardes, un attribut sur
   chaque champ, et une place qui pouvait manquer selon le modèle.

   La bonne place ne demande rien de tout ça. Elle est HORS de la
   zone qui se vide, elle existe pour tous les modèles, et il n'y a
   plus rien à protéger. Tout ce que j'avais écrit pour tenir
   l'autre a été retiré.
   ============================================================ */
function poserLeBlocTrajet(){
  const bloc = (typeof $ === 'function') ? $('blocTrajet') : null;
  if(!bloc) return;

  const manuel = $('manuelView');
  const ouvert = !!(manuel && manuel.style && manuel.style.display !== 'none');
  const place = ouvert ? $('trajetIciManuel') : $('trajetIciCours');

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

    /* ⚠️ LA NATURE SE VOIT ICI AUSSI — v1004, et elle sort de la
       MÊME table que la carte et le mail. Un ☠️ posé en roulant
       doit se reconnaître d'un coup d'œil, sinon le moniteur
       renomme le mauvais point. */
    const nat = natureDuPoint(r.type);
    const num = document.createElement('div');
    num.style.cssText = 'flex-shrink:0;font-weight:700;min-width:74px;' +
      'color:' + nat.couleur + ';';
    num.textContent = nat.icone + ' ' + r.n + ' · ' + r.heure;
    num.title = nat.mot;
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

    /* ⚠️ L'APPUI RATÉ SE RETIRE — v1004, et LUI SEUL. Retirer une
       marque ☠️ ou ⚠️ la ramène à un point de travail (voir
       changerNatureDuPoint) ; ici on retire le point entier, parce
       qu'il n'aurait jamais dû exister. C'est le seul geste qui
       décale les numéros suivants, et c'est pour ça qu'il vit dans
       le tiroir, à l'arrêt, avant que le mail parte. */
    const bX = document.createElement('button');
    bX.type = 'button';
    bX.textContent = '✕';
    bX.title = 'Retirer ce point — appui malencontreux';
    bX.style.cssText = 'flex-shrink:0;border:1px solid var(--line);' +
      'background:transparent;color:var(--muted);border-radius:8px;' +
      'width:30px;height:30px;font-size:13px;cursor:pointer;padding:0;';
    bX.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const quoi = nat.icone + ' ' + r.n + (r.nom ? ' — ' + r.nom : '');
      if(typeof confirmer === 'function' &&
         !await confirmer('Retirer ' + quoi + ' du trajet ?\n\n' +
                          'Les points suivants seront renumérotés.',
                          'Retirer ce point', true)) return;
      retirerLePoint(r.n);
      /* ⚠️ ET LA CARTE AVEC — v1012. Le point retiré renumérote les
         suivants : l'image d'avant désignerait le mauvais endroit.
         « retirerLePoint » l'a déjà oubliée ; ici on la redemande. */
      montrerLeTrajetDansLeBilan();
      const ta = (typeof $ === 'function') ? $('resultText') : null;
      if(ta && ta.value) ta.value = rafraichirBlocTrajet(ta.value);
    });
    l.appendChild(bX);

    zone.appendChild(l);
  });
}


/* ============================================================
   LA CARTE SOUS LE BILAN GÉNÉRÉ — v1012

   David, le 16 septembre : « est-ce qu'on peut voir la carte dans
   le bilan généré ou c'est trop compliqué ? »

   ⚠️ SOUS LE BILAN, JAMAIS DEDANS. Le bilan est du TEXTE, et ce
   texte se copie tel quel dans Messenger, dans un SMS, dans le
   classeur. Une image n'y entre pas ; y écrire « [carte] » à sa
   place, ce serait une ligne de plus que l'élève lirait sans rien
   voir. La carte se pose donc sous la zone de texte, dans l'écran,
   et le texte reste copiable au caractère près.

   ⚠️ ET C'EST LA MÊME IMAGE QUE CELLE DU MAIL — « imageDuTrajet »,
   dessinée d'avance depuis la v1003. Pas un second dessin : le
   moniteur doit voir EXACTEMENT ce que l'élève recevra, sinon il
   relit une carte et l'élève en reçoit une autre. C'est aussi ce
   qui rend l'affichage gratuit : l'image est presque toujours déjà
   prête quand l'écran de relecture s'ouvre.

   ⚠️ LES POINTS NE SONT PAS RÉÉCRITS ICI. Le tiroir juste au-dessus
   les liste déjà, avec leurs noms modifiables : les redire sous la
   carte, c'est garder le même fait à deux endroits, et celui d'en
   bas serait périmé dès la première lettre tapée en haut.
   ============================================================ */
let carteDuBilanJeton = 0;

/* ⚠️ CACHER, C'EST AUSSI ANNULER CE QUI EST EN ROUTE. Le jeton
   avance ici, et pas seulement à l'affichage : sans ça, l'écran
   remis à zéro pour le cours suivant verrait arriver, trois
   secondes plus tard, la carte du cours précédent — que le dessin
   avait commencée avant la remise à zéro. */
function cacherLaCarteDuBilan(){
  carteDuBilanJeton++;
  const z = (typeof $ === 'function') ? $('carteDuBilan') : null;
  if(!z) return;
  z.style.display = 'none';
  z.innerHTML = '';
}

async function montrerLaCarteDansLeBilan(){
  const z = (typeof $ === 'function') ? $('carteDuBilan') : null;
  if(!z) return;

  /* On efface d'abord — ce qui annule la demande précédente — puis
     on prend le jeton qui vient d'avancer : il est le nôtre. */
  cacherLaCarteDuBilan();
  const jeton = carteDuBilanJeton;
  /* ⚠️ LA CONDITION NE SE TESTE QU'APRÈS LE DESSIN, ET UNE SEULE
     FOIS. La tester aussi avant ne garderait rien de plus — sans
     trajet, « imageDuTrajet » rend déjà une chaîne vide — et ce
     serait une deuxième écriture de la même règle, celle qu'on
     oublierait de corriger le jour où elle change. */
  let image = '';
  try{ image = await imageDuTrajet(); }
  catch(e){ console.warn('Carte du bilan non dessinée :', e); return; }

  /* ⚠️ LE COURS A PU CHANGER PENDANT LE DESSIN. Les tuiles mettent
     quelques secondes à venir ; si un autre bilan s'est affiché
     entre-temps, ou si l'écran a été remis à zéro, l'image qui
     arrive est celle d'avant.

     Deux filets, parce qu'il y a deux façons de partir : le jeton
     attrape l'écran qui a changé de bilan, et « trajetPourEnvoi »
     attrape le cours SUIVANT qui a démarré son relevé pendant que
     le tracé du précédent finissait de se dessiner — il ne rend
     plus rien dès qu'il n'y a plus de trajet à envoyer.

     ⚠️ ET C'EST LUI, PAS « trajetComplet ». Les deux répondraient
     la même chose aujourd'hui ; poser deux fois la même question à
     deux lignes d'écart, c'est n'en corriger qu'une le jour où la
     réponse change. On demande ce dont on a besoin : le paquet. */
  if(jeton !== carteDuBilanJeton) return;
  if(!image) return;

  const t = trajetPourEnvoi();
  if(!t) return;

  z.innerHTML = '';

  const titre = document.createElement('div');
  titre.style.cssText = 'font-size:13px;font-weight:700;' +
    'color:var(--accent-text);margin-bottom:2px;';
  titre.textContent = '🗺️ Le trajet du cours';
  z.appendChild(titre);

  const sous = document.createElement('div');
  sous.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;';
  sous.textContent = String(t.km).replace('.', ',') + ' km · ' +
                     dureeDuTrajetEnMots(t.minutes) +
                     ' — c\'est cette carte que l\'élève recevra.';
  z.appendChild(sous);

  const img = document.createElement('img');
  img.src = image;
  img.alt = 'Le tracé du trajet du cours';
  img.style.cssText = 'display:block;width:100%;height:auto;' +
    'border:1px solid var(--line);border-radius:12px;';
  z.appendChild(img);

  /* Le même lien que dans le mail, monté par la même fonction : le
     moniteur ouvre ce que l'élève ouvrira. */
  const grand = lienVersLaCarte(t);
  if(grand){
    const a = document.createElement('a');
    a.href = grand;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = '🔍 Voir le trajet en grand';
    a.style.cssText = 'display:inline-block;margin-top:8px;font-size:13px;' +
      'font-weight:700;color:var(--accent-text);text-decoration:none;' +
      'border:1px solid var(--line);border-radius:9px;padding:9px 14px;';
    z.appendChild(a);
  }

  z.style.display = 'block';
}

/* ============================================================
   ⚠️ UNE SEULE PORTE POUR LE TRAJET DANS L'ÉCRAN DE RELECTURE —
   v1012.

   Le tiroir des repères et la carte parlent du MÊME trajet, vivent
   dans le MÊME écran et s'ouvrent aux MÊMES instants. Deux portes,
   et un appelant sur cinq en oublierait une : l'écran montrerait
   les repères d'un cours et la carte d'un autre. C'est exactement
   la faute que la v1009 a réparée pour le mail ; on ne la refait
   pas ici.

   La carte s'affiche sans faire attendre : rien de ce qui suit ne
   dépend d'elle, et un dessin raté ne doit pas remonter.
   ============================================================ */
function montrerLeTrajetDansLeBilan(){
  montrerLeTiroirDesReperes();
  try{
    const p = montrerLaCarteDansLeBilan();
    if(p && typeof p.catch === 'function') p.catch(() => {});
  }catch(e){
    console.warn('Carte du bilan non affichée :', e);
  }
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
