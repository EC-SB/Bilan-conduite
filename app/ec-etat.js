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

var ACCES = { code: null, moniteur: '', role: '', emoji: '', droits: [] };
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
