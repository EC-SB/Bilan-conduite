/* Déployé le 22/08/2026 à 09:21 — v496 */
/* ============================================================
   ec-etat.js
   État partagé entre les modules.
   Déclaré en premier pour être disponible partout, quel que
   soit l'ordre de chargement des autres fichiers.
   ============================================================ */

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
var LIEUX = [
  { cle:'devant', emoji:'🛣️', nom:'Devant, le long du trottoir',
    sms:'𝗧𝗮 𝘃𝗼𝗶𝘁𝘂𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗮𝗻𝘀 𝗹𝗮 𝗿𝘂𝗲 𝗹𝗲 𝗹𝗼𝗻𝗴 𝗱𝘂 𝘁𝗿𝗼𝘁𝘁𝗼𝗶𝗿 !' },

  { cle:'cour', emoji:'🅿️', nom:'Cour intérieure',
    sms:"𝗧𝗮 𝘃𝗼𝗶𝘁𝘂𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗮𝗻𝘀 𝗹𝗮 𝗰𝗼𝘂𝗿 𝗶𝗻𝘁𝗲́𝗿𝗶𝗲𝘂𝗿𝗲 𝗱𝗲 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !" },

  { cle:'moto', emoji:'🏍️', nom:'Moto',
    sms:"𝗧𝗮 𝗺𝗼𝘁𝗼 𝘁'𝗮𝘁𝘁𝗲𝗻𝗱 𝗮̀ 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !" },

  { cle:'scooter', emoji:'🛵', nom:'Scooter',
    sms:"𝗧𝗼𝗻 𝘀𝗰𝗼𝗼𝘁𝗲𝗿 𝘁'𝗮𝘁𝘁𝗲𝗻𝗱 𝗮̀ 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !" },

  { cle:'bureau', emoji:'🏢', nom:'Bureau', sansVehicule:true,
    sms:"𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗮𝘂 𝗯𝘂𝗿𝗲𝗮𝘂 𝗱𝗲 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !" },

  { cle:'tablettes', emoji:'📱', nom:'Salle des tablettes', sansVehicule:true,
    sms:'𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗱𝗮𝗻𝘀 𝗹𝗮 𝘀𝗮𝗹𝗹𝗲 𝗱𝗲𝘀 𝘁𝗮𝗯𝗹𝗲𝘁𝘁𝗲𝘀 !' },

  { cle:'cours', emoji:'📚', nom:'Salle de cours', sansVehicule:true,
    sms:'𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗱𝗮𝗻𝘀 𝗹𝗮 𝘀𝗮𝗹𝗹𝗲 𝗱𝗲 𝗰𝗼𝘂𝗿𝘀 !' },

  { cle:'simulateur', emoji:'🖥️', nom:'Simulateur', sansVehicule:true,
    sms:'𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗱𝗲𝘃𝗮𝗻𝘁 𝗹𝗲 𝘀𝗶𝗺𝘂𝗹𝗮𝘁𝗲𝘂𝗿 !' }
];

/* Les emplacements que le bureau a modifiés.

   Trois couches, dans cet ordre : la liste ci-dessus, toujours
   présente ; ce qui est gardé sur ce poste ; ce que le classeur
   partage entre les postes. Si les deux dernières manquent, la
   première suffit — la liste n'est jamais vide. */
var CLE_LIEUX = 'ec_lieux';

function lieuxActuels(){
  try{
    var brut = localStorage.getItem(CLE_LIEUX);
    if(brut){
      var l = JSON.parse(brut);
      if(l && l.length) return l;
    }
  }catch(e){}
  return LIEUX;
}

function garderLieux(liste){
  try{
    localStorage.setItem(CLE_LIEUX, JSON.stringify(liste));
  }catch(e){}

  /* On tente de partager, sans en dépendre : le poste garde sa
     liste même si le classeur ne répond pas. */
  try{
    if(typeof appelPrep === 'function'){
      appelPrep({
        action: 'reglageSet',
        cle: 'lieux',
        valeur: liste.map(function(x){
          return [x.cle, x.emoji, x.nom, x.sms || '',
                  x.sansVehicule ? 'sansvehicule' : ''].join('|');
        }).join('\n'),
        par: (typeof ACCES !== 'undefined' && ACCES.moniteur) || ''
      }).catch(function(){});
    }
  }catch(e){}
}

/* Reprend ce que le classeur partage, s'il en a */
function synchroniserLieux(){
  try{
    if(typeof appelPrep !== 'function') return;
    appelPrep({ action: 'lieuxList' })
      .then(function(d){
        var recu = (d && d.lieux) || [];
        if(!recu.length) return;
        try{ localStorage.setItem(CLE_LIEUX, JSON.stringify(recu)); }catch(e){}
      })
      .catch(function(){ /* le poste garde la sienne */ });
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
