/* Déployé le 04/09/2026 à 13:25 — v866 */
/* ============================================================
   ec-etat.js
   État partagé entre les modules.
   Déclaré en premier pour être disponible partout, quel que
   soit l'ordre de chargement des autres fichiers.
   ============================================================ */

/* ============================================================
   ⚠️ LA VERSION DES MODULES, DITE PAR LES MODULES EUX-MÊMES

   v1120. David, le 9 octobre : « je suis en 1119 et rien à
   changer dans mon dossier élève ».

   Le badge de l'en-tête lisait le « ?v= » du PREMIER <script>
   d'index.html — c'est-à-dire un morceau d'index.html. Il
   prouvait donc qu'index.html était à jour, et RIEN D'AUTRE.
   Pousser la page sans le dossier « app/ » affichait « v1119 »
   au-dessus d'une application entièrement en v1116, sans un mot.

   Le commentaire du badge disait pourtant déjà la bonne règle —
   « l'écran annonçait alors une version qu'il n'avait pas ». Il
   avait réparé le numéro recopié à la main ; il n'avait pas vu
   qu'il restait un second recopiage, entre la page et ses
   modules.

   Ce nombre-ci vit DANS le dossier app/. S'il ne correspond pas
   à ce que la page réclame, c'est que les deux n'ont pas été
   poussés ensemble, et le badge le dit en toutes lettres.

   ⚠️ IL NE PROUVE PAS QUE LES 71 MODULES SONT À JOUR — il prouve
   que ce fichier-ci l'est. C'est la panne courante (tout ou rien)
   qu'il attrape, pas une poussée partielle module par module. Un
   banc le tient aligné sur le « ?v= » d'index.html à chaque
   livraison : les deux ne peuvent plus diverger en silence.
   ============================================================ */
var VERSION_MODULES = 1130;

/* Raccourci d'accès au DOM, défini dès le premier module.
   S'il n'était déclaré que dans ec-noyau.js, une panne dans ce
   fichier rendrait toute l'application inutilisable. */
window.$ = window.$ || function (id) { return document.getElementById(id); };
var $ = window.$;

var ACCES = { code: null, moniteur: '', role: '', emoji: '', genre: '', droits: [] };
var recognition = null;
var isRecording = false;
var finalTranscript = '';
var currentLessonMeta = null;
var committedTranscript = '';
var wakeLock = null;
var interruptions = 0;
var sessionActive = false;
var demarrageEnCours = false;   /* évite d'empiler les démarrages */
var dernierMot = 0;
var dernierEvenement = '—';   /* diagnostic */
var dernierEchecCorrection = null;
var bilanEnregistre = false;
var moniteursActifs = [];
/* TOUS les comptes, pas seulement ceux qui donnent des cours :
   { nom, role, cours }. Le relais les rend depuis toujours, sous
   « comptes » ; personne ne les lisait. David, le 4 septembre,
   sur qui doit apparaître dans les manquants d'un message poussé :
   « tous les comptes ». */
var comptesActifs = [];
var champsManuels = {};   /* valeurs saisies */
var modeManuel = false;
var cacheBureau = null;
var elevesConnus = [];
var contexteDepart = null;   /* mémorise les réponses du questionnaire */
var noteQuestionnaire = '';   /* dernière note produite par le questionnaire */
var questionnaireOuvert = false;   /* empêche deux ouvertures simultanées */
var minuteurHistorique = null;
var derniereBoiteEleve = '';
var dernierEleveCharge = '';
var elevePermis = null;
var prepares = [];
var prepareEnCours = null;   /* préparation ouverte, à retirer une fois le cours fait */
var rdvPostEnCours = null;
var etatBureau = { eleves: [], consignes: [], suivi: [] };
var placesConfig = { mois: [] };
var eleveAffiche = '';
var nbBilansAffiches = 0;
var derniereSauvegarde = 0;

/* Suivi bureau — ces deux-là étaient utilisées sans être déclarées,
   ce qui faisait échouer la déconnexion. */
var minuteurBureau = null;
var bureauDejaCharge = false;

var premierAffichagePrepares = false;

window.EC_MODULES = window.EC_MODULES || {};
/* Suivi bureau — ces deux-là étaient utilisées sans être déclarées,
   ce qui faisait échouer la déconnexion. */


window.EC_MODULES['ec-etat.js'] = true;


/* ============================================================
   LES EMPLACEMENTS

   Une seule liste, partagée par l'affichage et les rappels.
   Elle est écrite ici, en clair : c'est le seul endroit à
   modifier pour en ajouter un.
   ============================================================ */
var EMPLACEMENTS_BASE = [
  { cle:'devant', emoji:'🛣️', nom:'Devant, le long du trottoir',
    financeur:"devant l'auto-école",
    sms:'𝗧𝗮 𝘃𝗼𝗶𝘁𝘂𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗮𝗻𝘀 𝗹𝗮 𝗿𝘂𝗲 𝗹𝗲 𝗹𝗼𝗻𝗴 𝗱𝘂 𝘁𝗿𝗼𝘁𝘁𝗼𝗶𝗿 !' },

  { cle:'cour', emoji:'🅿️', nom:'Cour intérieure',
    financeur:"cour intérieure de l'auto-école",
    sms:"𝗧𝗮 𝘃𝗼𝗶𝘁𝘂𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗮𝗻𝘀 𝗹𝗮 𝗰𝗼𝘂𝗿 𝗶𝗻𝘁𝗲́𝗿𝗶𝗲𝘂𝗿𝗲 𝗱𝗲 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !" },

  { cle:'moto', emoji:'🏍️', nom:'Moto',
    financeur:"à l'auto-école",
    sms:"𝗧𝗮 𝗺𝗼𝘁𝗼 𝘁'𝗮𝘁𝘁𝗲𝗻𝗱 𝗮̀ 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !" },

  { cle:'scooter', emoji:'🛵', nom:'Scooter',
    financeur:"à l'auto-école",
    sms:"𝗧𝗼𝗻 𝘀𝗰𝗼𝗼𝘁𝗲𝗿 𝘁'𝗮𝘁𝘁𝗲𝗻𝗱 𝗮̀ 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !" },

  { cle:'bureau', emoji:'🏢', nom:'Bureau', sansVehicule:true,
    financeur:"bureau de l'auto-école",
    sms:"𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗮𝘂 𝗯𝘂𝗿𝗲𝗮𝘂 𝗱𝗲 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !" },

  { cle:'tablettes', emoji:'📱', nom:'Salle des tablettes', sansVehicule:true,
    financeur:"salle des tablettes de l'auto-école",
    sms:'𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗱𝗮𝗻𝘀 𝗹𝗮 𝘀𝗮𝗹𝗹𝗲 𝗱𝗲𝘀 𝘁𝗮𝗯𝗹𝗲𝘁𝘁𝗲𝘀 !' },

  { cle:'cours', emoji:'📚', nom:'Salle de cours', sansVehicule:true,
    financeur:"salle de cours de l'auto-école",
    sms:'𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗱𝗮𝗻𝘀 𝗹𝗮 𝘀𝗮𝗹𝗹𝗲 𝗱𝗲 𝗰𝗼𝘂𝗿𝘀 !' },

  { cle:'simulateur', emoji:'🖥️', nom:'Simulateur', sansVehicule:true,
    financeur:"simulateur de l'auto-école",
    sms:'𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗱𝗲𝘃𝗮𝗻𝘁 𝗹𝗲 𝘀𝗶𝗺𝘂𝗹𝗮𝘁𝗲𝘂𝗿 !' },

  { cle:'voiturette', emoji:'🚙', nom:'Voiturette',
    financeur:"à l'auto-école",
    sms:"𝗧𝗮 𝘃𝗼𝗶𝘁𝘂𝗿𝗲𝘁𝘁𝗲 𝘁'𝗮𝘁𝘁𝗲𝗻𝗱 𝗮̀ 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !" },

  /* Rien à venir chercher : le rendez-vous est à distance. */
  { cle:'visio', emoji:'💻', nom:'En visio', sansVehicule:true,
    financeur:"en visio",
    sms:'𝗢𝗻 𝘀𝗲 𝗿𝗲𝘁𝗿𝗼𝘂𝘃𝗲 𝗲𝗻 𝘃𝗶𝘀𝗶𝗼 !' }
];

/* Les emplacements que le bureau a modifiés.

   Trois couches, dans cet ordre : la liste ci-dessus, toujours
   présente ; ce qui est gardé sur ce poste ; ce que le classeur
   partage entre les postes. Si les deux dernières manquent, la
   première suffit — la liste n'est jamais vide. */
var CLE_LIEUX = 'ec_emplacements';

function lieuxActuels(){
  try{
    var brut = localStorage.getItem(CLE_LIEUX);
    if(brut){
      var l = JSON.parse(brut);
      /* Un emplacement a une clé et un nom. Autre chose veut dire
         qu'on a rangé au mauvais endroit — c'est arrivé avec les
         lieux du secteur de la mémoire, qui portent le même mot. */
      if(l && l.length && l[0] && l[0].cle && l[0].nom !== undefined){
        return l;
      }
      localStorage.removeItem(CLE_LIEUX);
    }
  }catch(e){}
  return EMPLACEMENTS_BASE;
}

/* L'ancienne clé a pu recevoir les lieux du secteur : on la vide
   une fois pour toutes. */
try{ localStorage.removeItem('ec_lieux'); }catch(e){}

function garderLieux(liste){
  try{
    localStorage.setItem(CLE_LIEUX, JSON.stringify(liste));
  }catch(e){}

}

/* Remplit une liste déroulante d'emplacements */
function remplirListeLieux(sel, actuel, finale){
  if(!sel) return;

  var liste = lieuxActuels();
  var connu = liste.some(function(x){ return x.cle === actuel; });

  sel.innerHTML =
    (finale ? '' : '<option value="">— où —</option>') +
    liste.map(function(x){
      return '<option value="' + x.cle + '"' +
             (x.cle === actuel ? ' selected' : '') + '>' +
             (x.emoji ? x.emoji + ' ' : '') + x.nom + '</option>';
    }).join('') +
    (finale ? '<option value="">Ne pas préciser</option>' : '') +
    (actuel && !connu
      ? '<option value="' + actuel + '" selected>' + actuel + '</option>'
      : '');
}

function lieuPar(cle){
  var liste = lieuxActuels();
  for(var i = 0; i < liste.length; i++){
    if(liste[i].cle === cle) return liste[i];
  }
  return null;
}

function lieuSansVehicule(cle){
  var l = lieuPar(cle);
  return !!(l && l.sansVehicule);
}

function texteDuLieu(cle){
  var l = lieuPar(cle);
  return (l && l.sms) || '';
}

/* ============================================================
   LE LIEU, DIT AU FINANCEUR — v1125

   Le mail du financeur prenait « texteDuLieu », c'est-à-dire la
   phrase écrite pour l'ÉLÈVE : une mission locale recevait, dans
   un courrier qui lui sert de justificatif, « Lieu de rendez-vous :
   𝗧𝗮 𝘃𝗼𝗶𝘁𝘂𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗮𝗻𝘀 𝗹𝗮 𝗰𝗼𝘂𝗿… ! » — en gras Unicode, tutoyée,
   avec son point d'exclamation. Constat n° 6 de la planche du
   9 octobre ; David n'a pas de modèle financeur à lui, c'était donc
   ce qui partait.

   Chaque lieu porte maintenant sa phrase pour le financeur, dans
   la MÊME liste que celle de l'élève : c'est le seul endroit à
   modifier pour ajouter un lieu, et il le reste.

   ⚠️ UN LIEU GARDÉ SUR CE POSTE PEUT ÊTRE PLUS ANCIEN QUE CE CHAMP.
   On retombe alors sur la liste de base pour la même clé, puis sur
   le nom du lieu ramené en lettres simples. Jamais sur « sms ». */
function texteDuLieuFinanceur(cle){
  if(!cle) return '';
  var l = lieuPar(cle);
  if(l && l.financeur) return l.financeur;
  for(var i = 0; i < EMPLACEMENTS_BASE.length; i++){
    if(EMPLACEMENTS_BASE[i].cle === cle && EMPLACEMENTS_BASE[i].financeur){
      return EMPLACEMENTS_BASE[i].financeur;
    }
  }
  var nom = (l && l.nom) || '';
  if(typeof lettresSimples === 'function') nom = lettresSimples(nom);
  return String(nom).normalize('NFC').toLowerCase();
}
