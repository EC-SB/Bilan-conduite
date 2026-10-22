/* Déployé le 22/10/2026 à 11:31 — v1240 */
/* ============================================================
   ec-manuel.js
   Bilan à remplir à la main
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   BILAN MANUEL — sans micro ni résumé automatique
   Le moniteur remplit chaque rubrique ; il peut dicter dans
   chaque champ séparément s'il le souhaite.
   ============================================================ */

/* La phrase que David écrivait à la main à chaque examen blanc.
   Écrite ICI, une seule fois : la case qui la pose et le code qui
   la retire lisent la même. Deux copies auraient fini par ne plus
   se reconnaître, et la case n'aurait plus rien décoché. */
const PHRASE_VOITURE_APPORTEE =
  "Tu as oublié de dire c'est moi qui aie emmener la voiture, " +
  "j'ai déjà fais mes réglages";

/* ------------------------------------------------------------
   🚗 L'ALERTE DE SURVITESSE — v1144

   David, le 12 octobre : « si tu conduis avec le Q3 n°10, l'A3
   n°2, l'A3 BV de Loudéac ou l'A3 BEA de Loudéac, tu as oublié
   d'enlever l'alerte de survitesse », et une case « pense à
   enlever l'alerte de survitesse ». Ses réponses : la liste des
   voitures est une CONDITION — les deux cases n'apparaissent que
   sur ces voitures-là — et la voiture se lit sur l'écran
   d'accueil, là où le bureau la pose. Examen blanc ET officiel.
   ------------------------------------------------------------ */
const PHRASE_SURVITESSE_OUBLIEE = "Tu as oublié d'enlever l'alerte de survitesse.";
const PHRASE_SURVITESSE_PENSE   = "Pense à enlever l'alerte de survitesse.";

/* Les quatre voitures, reconnues sur le nom que la flotte leur
   donne : « Q3 10 », « Q3 n°10 », « A3 2 », « A3 BV Loudéac »,
   « Audi A3 BEA Loudeac »… Un chiffre se compare EN ENTIER : l'A3
   12 n'est pas l'A3 2. */
function voitureAvecAlerteSurvitesse(nom){
  const mots = String(nom || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/n\s*°/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim().split(' ');
  const a = mots.indexOf('a3') !== -1;
  const q = mots.indexOf('q3') !== -1;
  const loudeac = mots.indexOf('loudeac') !== -1;
  return (q && mots.indexOf('10') !== -1) ||
         (a && mots.indexOf('2') !== -1) ||
         (a && loudeac && mots.indexOf('bv') !== -1) ||
         (a && loudeac && mots.indexOf('bea') !== -1);
}

/* La voiture du cours ouvert, une fois par élève et par jour */
let voitureDuCoursManuel = { cle: '', promesse: null };
function lireLaVoitureDuCours(){
  const eleve = ($('studentName') && $('studentName').value.trim()) || '';
  const jour = ($('lessonDate') && $('lessonDate').value) || '';
  const moniteur = ($('monitorName') && $('monitorName').value) || '';
  if(!eleve || typeof appelPrep !== 'function') return Promise.resolve('');
  const cle = eleve + '|' + jour;
  if(voitureDuCoursManuel.cle !== cle || !voitureDuCoursManuel.promesse){
    voitureDuCoursManuel = {
      cle: cle,
      promesse: appelPrep({ action: 'vehiculeDuCours', eleve: eleve, jour: jour,
                            moniteur: moniteur })
        .then(r => String((r && r.vehicule) || ''))
        .catch(() => { voitureDuCoursManuel.promesse = null; return ''; })
    };
  }
  return voitureDuCoursManuel.promesse;
}

/* ============================================================
   🚗 LES SPÉCIFICITÉS DES VÉHICULES — v1211

   David, le 20 octobre : « dans le constructeur des bilans il me
   manque la partie pour les spécificités des véhicules, les phrases
   qui s'affichent uniquement quand c'est telle ou telle voiture ».
   Ses choix : une CASE à cocher réservée à certaines voitures, une
   ZONE ENTIÈRE réservée à certaines voitures, et la survitesse
   reprise dans ce mécanisme.

   Une condition, c'est une liste de noms de la flotte (« Q3 10 »,
   « A3 BV Loudéac »…), ou « @survitesse » — les quatre voitures de la
   v1144, reconnues comme avant. La voiture du cours vient toujours de
   l'écran d'accueil (vehiculeDuCours), une fois par élève et par jour.

   ⚠️ CACHÉE N'EST PAS RETIRÉE. Une case ou une zone hors voiture reste
   dessinée, invisible : les saisies se replacent par leur RANG, elle
   doit garder le sien. Et ses cases sont hors saisie : leur état se
   relit dans le texte.

   ⚠️ CE QUI EST DÉJÀ COCHÉ RESTE VISIBLE, quelle que soit la voiture :
   une fiche reprise doit pouvoir décocher.

   ⚠️ « COCHÉE D'OFFICE » ATTEND LA VOITURE. Une phrase réservée au Q3
   ne se pose pas sur l'A3 le temps que la réponse arrive : elle se
   pose quand la voiture est connue et qu'elle correspond — et
   seulement si personne n'a encore touché au cadre.
   ============================================================ */
const VOITURES_SURVITESSE = '@survitesse';
function casesSurvitesse(){
  return [
    { libelle: '', phrase: PHRASE_SURVITESSE_OUBLIEE, ou: 'debut', office: 0, voitures: [VOITURES_SURVITESSE] },
    { libelle: '', phrase: PHRASE_SURVITESSE_PENSE,   ou: 'debut', office: 0, voitures: [VOITURES_SURVITESSE] }
  ];
}
/* « Audi Q3 n°10 » et « Q3 10 » : les mêmes mots qui comptent */
function motsDeLaVoiture(nom){
  const vides = ['audi', 'de', 'du', 'la', 'le', 'n', 'no', 'num'];
  return String(nom || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/n\s*°/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim().split(' ')
    .filter(m => m && vides.indexOf(m) === -1);
}
function voitureCorrespond(voiture, voitures){
  const liste = Array.isArray(voitures) ? voitures : String(voitures || '').split('|');
  const v = motsDeLaVoiture(voiture);
  if(!v.length) return false;
  return liste.some(x => {
    if(x === VOITURES_SURVITESSE) return voitureAvecAlerteSurvitesse(voiture);
    const m = motsDeLaVoiture(x);
    return m.length > 0 && m.length === v.length && m.every(y => v.indexOf(y) !== -1);
  });
}
/* Le nom à montrer pour une condition */
function libelleVoitures(voitures){
  return (voitures || []).map(x => x === VOITURES_SURVITESSE ? '⚡ voitures à alerte de survitesse' : x).join(', ');
}

/* Dans le créateur, en réglage : tout se voit (on règle ce qu'on voit) */
function ficheEnReglage(){
  return !!(window.essaiFicheEnCours && typeof fiS !== 'undefined' && fiS && !fiS.essai);
}
function voitureDeLEssai(){
  return (typeof fiS !== 'undefined' && fiS && fiS.voitureEssai) ? String(fiS.voitureEssai) : '';
}

let zoneVoituresCourante = null;
let minuteurVoitures = null;
function planifierMajVoitures(zone){
  if(zone) zoneVoituresCourante = zone;
  clearTimeout(minuteurVoitures);
  minuteurVoitures = setTimeout(() => { majCasesSelonVoiture(zoneVoituresCourante); }, 0);
}

async function majCasesSelonVoiture(racine){
  const zone = racine || zoneVoituresCourante || $('manuelChamps');
  if(!zone) return;
  const cases = zone.querySelectorAll('label[data-voitures], label[data-office-differe]');
  const blocs = zone.querySelectorAll('[data-zone][data-voitures]');
  if(!cases.length && !blocs.length) return;
  const reglage = ficheEnReglage();
  let voiture = '';
  if(window.essaiFicheEnCours) voiture = voitureDeLEssai();
  else{ try{ voiture = await lireLaVoitureDuCours(); }catch(e){ voiture = ''; } }

  const blocOk = b => !b || !b.dataset.voitures || reglage || voitureCorrespond(voiture, b.dataset.voitures);

  Array.prototype.forEach.call(blocs, b => {
    const rempli = Array.prototype.some.call(b.querySelectorAll('textarea'), t => String(t.value).trim() &&
                     String(t.value) !== String(t.dataset.valeurOuverture || '')) ||
                   Array.prototype.some.call(b.querySelectorAll('input.caseSeule'), x => x.checked);
    b.classList.toggle('horsVoiture', !(blocOk(b) || rempli));
    b.classList.toggle('selonVoiture', reglage);
    if(reglage) b.setAttribute('data-voitures-txt', '🚗 ' + libelleVoitures(b.dataset.voitures.split('|')));
  });

  Array.prototype.forEach.call(cases, lab => {
    const cb = lab.querySelector('input');
    const b = lab.closest('[data-zone]');
    const ok = (!lab.dataset.voitures || reglage || voitureCorrespond(voiture, lab.dataset.voitures)) && blocOk(b);
    const t = (b && !lab.classList.contains('caseSeuleL')) ? b.querySelector('textarea') : null;
    const phrase = lab.getAttribute('data-phrase') || '';
    /* L'état se relit dans le cadre : une reprise y remet le texte
       sans prévenir la case. */
    if(cb && t && phrase) cb.checked = String(t.value).indexOf(phrase) !== -1;

    /* Cochée d'office, une fois, quand la voiture correspond */
    if(!reglage && ok && cb && !cb.checked && lab.hasAttribute('data-office-differe') && !lab.dataset.officeFait &&
       (window.essaiFicheEnCours || voiture)){
      lab.dataset.officeFait = '1';
      if(t){
        if(String(t.value) === String(t.dataset.valeurOuverture || '')){
          const fin = lab.getAttribute('data-fin') === '1';
          t.value = t.value ? (fin ? t.value + '\n' + phrase : phrase + '\n' + t.value) : phrase;
          t.dataset.valeurOuverture = t.value;
          const cle = t.getAttribute('data-cle-champ');
          if(cle) champsManuels[cle] = t.value;
          cb.checked = true;
        }
      }else{
        const cle = cb.getAttribute('data-cle');
        if(!cle || champsManuels[cle] === undefined){
          cb.checked = true;
          cb.dispatchEvent(new Event('change'));
        }
      }
    }
    if(lab.dataset.voitures){
      lab.style.display = (ok || (cb && cb.checked)) ? 'flex' : 'none';
      if(reglage){
        lab.title = 'Seulement avec : ' + libelleVoitures(lab.dataset.voitures.split('|'));
        if(!lab.dataset.marqueVoiture){
          lab.dataset.marqueVoiture = '1';
          lab.appendChild(document.createTextNode(' 🚗'));
        }
      }
    }
  });
}
/* L'ancien nom : la reprise d'une fiche l'appelle encore */
function majCasesSurvitesse(){ return majCasesSelonVoiture(); }

/* Les champs dont la fiche garde la trace, PAR LEUR RANG.

   ⚠️ LES CASES DE LA SURVITESSE N'EN SONT PAS (data-hors-saisie).
   Une fiche commencée avant leur arrivée se replace par le rang de
   ses champs : deux cases de plus au milieu, et tout ce qui suit
   tomberait une case plus bas, dans le mauvais cadre. Elles n'ont
   d'ailleurs rien à garder : leur état se relit dans le texte. */
function champsDeSaisieManuelle(zone){
  return Array.prototype.filter.call(
    zone.querySelectorAll('input, textarea, select'),
    el => !el.hasAttribute('data-hors-saisie'));
}

/* La phrase des vérifications — v1142. David, le 12 octobre : « ajoute
   une case à cocher : tu n'as pas bossé tes vérifications, ça rapporte
   3 points le jour de l'examen, donc bosse-les à fond — et que ça note
   cette phrase dans le cadre de remarque ». Version corrigée retenue.
   Même mécanique, même règle que PHRASE_VOITURE_APPORTEE : écrite une
   fois, ici, pour la case qui la pose et le code qui la retire — à
   l'examen blanc ET à l'examen officiel (son choix). */
const PHRASE_VERIFS_A_BOSSER =
  "Tu n'as pas bossé tes vérifications : ça rapporte 3 points le jour " +
  "de l'examen, donc bosse-les à fond !";

/* « Pas de repassage pour le moment » — v912.

   Une valeur, pas un nombre : c'est ce qui distingue « aucun » de
   « zéro heure », qui voudrait dire le contraire. Elle vit ICI et
   nulle part ailleurs — la case l'écrit, la note la relit, le
   test la relit. Deux orthographes, et la note dirait « Demandé :
   pas de repassage heures ». */
const REPASSAGE_AUCUN = 'aucun';

/* Ce que le moniteur doit renseigner, selon le modèle choisi */
/* Les rubriques du résumé, dans l'ordre du bilan */
const THEMES_ERREURS = [
  { cle:'commandes',   nom:'🚙 MANIPULATION DES COMMANDES' },
  { cle:'trajectoire', nom:'👀 TRAJECTOIRE' },
  { cle:'giratoires',  nom:'🍩 GIRATOIRES' },
  { cle:'vavd',        nom:'🛣️ VA VD' },
  { cle:'pad',         nom:'❌ PAD' },
  { cle:'allures',     nom:'🏎️💨 ALLURES' },
  { cle:'controles',   nom:'👀 CONTRÔLES' },
  { cle:'divers',      nom:'🧠 DIVERS' },
  { cle:'manoeuvres',  nom:'🚙🚗🚙 MANŒUVRES' }
];

/* ============================================================
   LA FICHE D'ÉVALUATION HANDICAP

   Elle reprend le document papier ligne pour ligne : chaque
   contrôle a ses trois notes et son champ d'observations.
   ============================================================ */

function schemaHandicap(){
  const out = [
    { cle:'__th', type:'titre', nom:'𝗙𝗜𝗖𝗛𝗘 𝗗\'𝗘́𝗩𝗔𝗟𝗨𝗔𝗧𝗜𝗢𝗡' },
    /* Ces trois-là se remplissent tout seuls : l'élève, le
       moniteur et la date du cours sont déjà connus. */
    { cle:'handicap.conducteur',    type:'court', nom:'Conducteur' },
    { cle:'handicap.formateur',     type:'court', nom:'Formateur' },
    { cle:'handicap.date',          type:'court', nom:'Date' },
    { cle:'handicap.problematique', type:'texte', lignes:4,
      nom:'Problématique',
      aide:'Ce qui amène cette évaluation.' },

    { cle:'__tc', type:'titre', nom:'𝗖𝗢𝗡𝗧𝗥𝗢̂𝗟𝗘' }
  ];

  /* Le tableau entier en un seul champ : le dessiner ligne par
     ligne perdait le moniteur, qui connaît le document papier. */
  out.push({ cle:'__tableau', type:'tableauHandicap' });

  out.push({ cle:'__tf', type:'titre', nom:'𝗖𝗢𝗡𝗖𝗟𝗨𝗦𝗜𝗢𝗡' });
  out.push({ cle:'handicap.conclusion', type:'texte', lignes:6,
             nom:'Conclusion' });

  return out;
}


const CHAMPS_MANUELS = {
  conduiteResume: [
    { cle:'__entete', type:'entete', nom:'Carte SD — Installation — Vérifications' },
    { cle:'texteDicte',  type:'texte', nom:'🎙️ Ton cours', lignes:8,
      aide:'Ce que tu as dit pendant le cours. Peut rester vide.' },
    { cle:'resume',      type:'themes', nom:'🧠 Erreurs de ce jour' },
    { cle:'manoeuvres',  type:'manoeuvres', nom:'🦉 Manœuvres travaillées' },
    { cle:'groupesTravail', type:'ok', nom:'4 groupes de travail suivis', defaut:'' },
    { cle:'ecoutes',     type:'ok',    nom:"Plus d'écoutes que de conduite", defaut:'' }
  ],
  conduite: [
    { cle:'__entete', type:'entete', nom:'Carte SD — Installation — Vérifications' },
    { cle:'resume',      type:'themes', nom:'🧠 Erreurs de ce jour' },
    { cle:'manoeuvres',  type:'manoeuvres', nom:'🦉 Manœuvres travaillées' },
    { cle:'groupesTravail', type:'ok', nom:'4 groupes de travail suivis', defaut:'' },
    { cle:'ecoutes',     type:'ok',    nom:"Plus d'écoutes que de conduite", defaut:'' }
  ],
  simu: [
    { cle:'competences', type:'competences', nom:'Compétences travaillées' },
    { cle:'resume',      type:'texte', nom:'🧠 Remarques du cours', lignes:10 }
  ],
  /* L'évaluation se remplit rubrique par rubrique, comme la fiche
     papier. Un bloc de notes libre ne suffisait pas : le bilan
     attend un état ET un détail par rubrique, et ce qui était écrit
     dans le bloc n'arrivait nulle part. */
  eval: [
    { cle:'passif', type:'texte', lignes:3, nom:'🔍 Passif',
      aide:'Ce qu\'il a déjà conduit, ce qu\'il sait déjà faire.' },

    { cle:'__tdef', type:'titre',
      nom:'🚨 Résumé des défauts vus ce jour à corriger' },

    { cle:'installation', type:'texte', lignes:2, nom:'Installation' },

    { cle:'rubriques.manipulation', type:'eval3', nom:'Manipulation commandes' },
    { cle:'rubriques.trajectoire',  type:'eval3', nom:'Trajectoire' },
    { cle:'rubriques.giratoires',   type:'eval3', nom:'Giratoires' },
    { cle:'rubriques.vavd',         type:'eval3', nom:'VA / VD' },
    { cle:'rubriques.manoeuvres',   type:'eval3', nom:'Manœuvres' },
    { cle:'rubriques.pad',          type:'eval3', nom:'PAD' },
    { cle:'rubriques.allures',      type:'eval3', nom:'Allures' },
    { cle:'rubriques.controles',    type:'eval3', nom:'Contrôles' },

    /* v1143 — David : « un cadre autre avant là où on renseigne
       les heures ». Il porte « data-cle » (marque) : une fiche
       commencée avant cette version se replace par le rang de ses
       champs, et ce cadre neuf ne doit pas hériter de ce qui était
       tapé dans l'ancienne case des heures. */
    { cle:'autre', type:'texte', lignes:2, nom:'Autre', marque:true,
      indication:'Ce qui ne rentre dans aucune rubrique — une ligne par point' },

    /* v1143 — des cases chiffrées : des HEURES pour le simulateur,
       des LEÇONS avant et après examen blanc (« côté moniteur on
       remet en nombre de leçons »). Le bilan écrit leçons ET heures. */
    { cle:'simuHeures',  type:'nombreEval', nom:'Heures de simulateur',
      unite:'h', entete:'🕙 Estimation' },
    { cle:'leconsAvant', type:'nombreEval', nom:'Leçons avant examen blanc',
      unite:'leçons', enHeures:true },
    { cle:'leconsApres', type:'nombreEval', nom:'Leçons après examen blanc',
      unite:'leçons', enHeures:true },

    /* L'aperçu modifiable, juste au-dessus de « Composer le bilan » :
       de « ESTIMATION DU NOMBRE D'HEURES » à la fin du contrat. */
    { cle:'estimationTexte', type:'apercuEval',
      nom:'👁️ Aperçu de l’estimation — modifiable',
      aide:'Se remplit tout seul avec les cases ci-dessus. Tu peux le retoucher : c’est ce texte-là qui part dans le bilan.' }
  ],
  examenblanc: [
    { cle:'__t1', type:'titre', nom:"𝟭 - 𝗔𝗩𝗔𝗡𝗧 𝗟'𝗘𝗫𝗔𝗠𝗘𝗡" },
    { cle:'avant.carteSD',      type:'ok', nom:'1-1 · Carte SD', defaut:'✅' },

    /* Un bloc de texte plutôt que des cases : le moniteur efface
       l'émoji qui ne convient pas, ✅ ou ❌, directement dans le
       texte. Plus rapide que trois sélecteurs. */
    { cle:'avant.installation', type:'texte', lignes:6,
      nom:'1-2 · Installation',
      aide:'Efface l\'émoji qui ne convient pas.',
      defaut:'𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗮𝘁𝗶𝗼𝗻 ✅❌\n' +
             'https://www.facebook.com/groups/963972327360861/permalink/969918630099564/\n' +
             '𝗣𝗮𝘀𝘀𝗮𝗴𝗲𝗿 ✅❌\n' +
             '𝗩𝗼𝘆𝗮𝗻𝘁𝘀 ✅❌\n' +
             '𝙉𝙤𝙩𝙚 :  /2' },

    { cle:'avant.erreursRoute', type:'texte', lignes:5,
      nom:"1-3 · Erreurs que tu as faites en allant au centre d'examen",
      aide:'Une erreur par ligne.' },

    { cle:'__t2', type:'titre', nom:"𝟮 - 𝗣𝗘𝗡𝗗𝗔𝗡𝗧 𝗟'𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖" },
    /* Trois boutons plutôt qu'un texte à corriger.

       L'INSTALLATION NE COMPTE PAS DANS LA NOTE. David : « elle
       est sur 2 sur le CEPC ». La note reste Passager + Voyants,
       comme au barème officiel : la case Installation dit ce qui
       s'est passé, elle ne note pas. */
    { cle:'examen.instInstallation', type:'ok', nom:'2-1 · Installation', defaut:'' },
    { cle:'examen.instPassager',     type:'ok', nom:'2-1 · Passager', defaut:'' },
    { cle:'examen.instVoyants',      type:'ok', nom:'2-1 · Voyants',  defaut:'' },
    { cle:'examen.installation', type:'texte', lignes:3,
      nom:'2-1 · Remarque sur installation, passagers, voyants',
      aide:'Facultatif : ce qui a manqué à son installation.',
      /* La phrase qui revient à chaque examen blanc : une case
         plutôt que dix-huit mots à retaper dans la voiture. Elle
         se pose EN PREMIER dans le cadre et repart si on décoche,
         sans toucher au reste de ce qui est écrit. */
      phraseCoche:PHRASE_VOITURE_APPORTEE, survitesse:true },

    /* Le même repère qu'à l'examen officiel : les numéros 2-1,
       2-2 séparaient déjà, mais pas assez pour un écran de
       téléphone tenu à bout de bras. */
    { cle:'__sVerifB', type:'sousTitre', nom:'🧰 Vérifications' },
    { cle:'examen.verifNote',     type:'note3',
      nom:'2-2 · Note des vérifications' },
    { cle:'examen.verifQuestion', type:'court',
      nom:'2-2 · N° de la question' },
    /* Ce qui s'est dit pendant la vérification n'avait aucune
       case : il finissait dans les observations, mêlé à la
       conduite, ou nulle part. Laissé vide, il ne laisse aucune
       trace dans le bilan. */
    { cle:'examen.verifRemarque', type:'texte', lignes:3,
      nom:'2-2 · Remarque sur les vérifications',
      aide:'Facultatif : ce qu\'il a su, ce qui a manqué.',
      phraseCoche:PHRASE_VERIFS_A_BOSSER },

    /* ⚠️ LA MANŒUVRE ET L'AUTONOMIE, SOUS LES VÉRIFICATIONS — v966.

       David : « sous les vérifications, juste avant 2-3, tu écris
       MANŒUVRE en majuscules avec les boutons tête de mort et
       attention, qui font la même chose qu'une remarque ».

       Deux lignes seulement — « met en 2 ». Ce sont de vraies
       lignes de remarque : mêmes champs, mêmes boutons, même
       rangement sous la compétence du CEPC que le moniteur choisit.
       Ce qui change, c'est la mention « Manœuvre » qui les précède
       dans le bilan, « pour qu'on voie que l'erreur est survenue
       pendant la manœuvre ». */
    /* 🅿️ v1211 — le titre devient « Manœuvre : … », une liste où le
       moniteur choisit la manœuvre faite. Voir choixManoeuvre. */
    /* 🎯 v1238 — L'ARRÊT DE PRÉCISION, AVANT LA MANŒUVRE, DANS LE MÊME
       CADRE. David, le 22/10 : « Manœuvre : Arrêt de précision, avec en
       dessous Remarque de l'inspecteur et Explication ou correction ».
       Les mêmes lignes que la manœuvre ; « faite » (cochée d'office)
       la compte dans la fiche des manœuvres de l'élève. */
    { cle:'__sArret', type:'sousTitre', nom:'🅿️ Manœuvre : Arrêt de précision', fond:'ardoise',
      choixFait:'examen.arretPrecisionFaite' },
    { cle:'examen.arretPrecision', type:'observations', zone:'obsArretPrecision',
      lignes:2, mention:'Arrêt de précision', fond:'ardoise',
      nom:'Ce qui s\'est passé pendant l\'arrêt de précision' },
    { cle:'__sManoeuvre', type:'sousTitre', nom:'🅿️ Manœuvre', fond:'ardoise',
      choixManoeuvre:'examen.manoeuvreFaite' },
    { cle:'examen.manoeuvre', type:'observations', zone:'obsManoeuvre',
      lignes:2, mention:'Manœuvre', fond:'ardoise',
      nom:'Ce qui s\'est passé pendant la manœuvre' },

    { cle:'__sAutonomie', type:'sousTitre', nom:'🧭 AUTONOMIE', fond:'ardoise' },
    { cle:'examen.autonomie', type:'autonomie', ligne:'Conduite autonome',
      nom:'Conduite autonome', fond:'ardoise',
      aide:'Ce qui a manqué en conduite autonome.' },
    /* 🔁 v1238 — PASSAGER ET VOYANTS, REVUS APRÈS LA MANŒUVRE. David :
       « après la manœuvre on doit revoir si l'élève a vérifié à nouveau
       passagers et voyants, et ça doit enlever des points sur le CEPC
       même si c'était bon avant ». Un ❌ = 1 point de moins (son choix). */
    { cle:'__sApres', type:'sousTitre', nom:'🔁 Après la manœuvre', fond:'ardoise' },
    { cle:'examen.apresPassager', type:'ok', nom:'Passager (revu après la manœuvre)', defaut:'', fond:'ardoise',
      cepcMoins:{ ligne:"Savoir s'installer et assurer la sécurité à bord", points:1 } },
    { cle:'examen.apresVoyants', type:'ok', nom:'Voyants (revus après la manœuvre)', defaut:'', fond:'ardoise',
      cepcMoins:{ ligne:"Savoir s'installer et assurer la sécurité à bord", points:1 } },

    /* Vingt paires, comme pour l'examen officiel : la remarque de
       l'inspecteur, puis l'explication du moniteur. */
    { cle:'examen.observations', type:'observations',
      nom:"2-3 · Remarques de l'inspecteur et explications" },

    /* Le CEPC clôt le point 2 : il résume l'examen qui vient de se
       dérouler, il n'a rien à faire dans le bilan des erreurs. */
    { cle:'cepc',        type:'cepc',  nom:'🧾 CEPC — bilan des compétences' },

    /* ⚠️ SOUS LE CEPC, ET GROS — v1069. David, le 7 octobre :
       « assez gros pour que ce soit visible ». C'est le plus gros
       élément de la fiche après les titres, et c'est voulu : il se
       coche au retour d'un examen interrompu, dans la voiture,
       au milieu d'une fiche qu'on vient de remplir pour rien. */
    { cle:'nonMene', type:'nonMene', nom:'Examen non mené à son terme',
      aide:'Le CEPC garde ses notes et se remplit toujours. ' +
           '« 🧹 Vider le CEPC et le griser », dessous, le vide.' },

    { cle:'observations',type:'texte', lignes:12,
      nom:'2-4 · Observations',
      aide:'Une observation par ligne.' },

    /* ⚠️ LE 2-5 « FAUTES ÉLIMINATOIRES » A ÉTÉ RETIRÉ — v890.

       David : « le bloc 2-5 n'a plus de raison d'exister puisque
       tout va dans le 3 - Bilan des erreurs ».

       C'était devenu une deuxième liste des mêmes fautes : depuis
       que le bouton ☠️ range chaque erreur sous sa ligne du CEPC
       et remplit le bloc 3 tout seul, ce cadre ne servait plus
       qu'à les retaper. Deux endroits pour la même chose, et un
       jour l'un des deux aurait dit autre chose que l'autre.

       Ce qui a été écrit dedans autrefois ne s'affiche plus : le
       même ⚠️ est posé dans buildExamenBlanc, d'où l'impression a
       été retirée en même temps. Les deux vont ensemble — laisser
       l'un des deux ferait réapparaître le bloc par un bout. */

    { cle:'__t3', type:'titre', nom:'𝟯 - 𝗕𝗜𝗟𝗔𝗡 𝗗𝗘𝗦 𝗘𝗥𝗥𝗘𝗨𝗥𝗦' },

    /* Les éliminatoires viennent se poser ici dès qu'elles sont
       marquées : le moniteur y répond à la fin de l'examen, sans
       attendre la génération. */
    /* ⚠️ IL S'APPELAIT « 3 · Erreurs éliminatoires » — v909.

       Il ne contient pas que des éliminatoires, et depuis
       longtemps : les ☠️, les ⚠️ et les points retirés s'y rangent
       tous, sous leur compétence. Le nom promettait autre chose que
       son contenu, et un titre qui annonce « éliminatoires » sur un
       bloc qui n'en porte parfois aucune, c'est un moniteur qui
       hésite à y écrire. La CLÉ, elle, ne bouge pas : c'est elle
       qui relie les brouillons en cours à leur champ. */
    { cle:'bilanElim', type:'texte', lignes:14,
      nom:'3 · Bilan des erreurs',
      aide:'Rempli tout seul quand tu marques une ☠️ ou un ⚠️ plus haut. ' +
           'Réponds aux questions à la fin de l\'examen.' },

    /* ⚠️ LE BLOC « 3 · Autres erreurs » A ÉTÉ RETIRÉ — v909.

       David : « il faut enlever le bloc 3 · autres erreurs, il ne
       sert plus à rien ».

       Il ne servait effectivement plus : c'était un canevas à
       remplir à la main — trois fois « 👉 … qu'en penses-tu ? » —
       du temps où rien ne se rangeait tout seul. Depuis que les
       boutons ☠️ et ⚠️ posent chaque erreur sous sa compétence dans
       le bloc au-dessus, celui-ci ne pouvait plus qu'en dire une
       deuxième version, écrite à la main et jamais la même.

       ⚠️ ET L'IMPRESSION PART AVEC. Le même ⚠️ est posé dans
       buildExamenBlanc, d'où le canevas a été retiré au même
       moment. Les deux vont ensemble — laisser l'un des deux ferait
       réapparaître le bloc par un bout, exactement comme la note du
       2-5 le disait déjà en v890.

       ⚠️ ET « bilanErreurs » EXISTE AILLEURS. Le rendez-vous
       pédagogique a un champ du même nom, alimenté par l'IA
       (buildRvp) : il n'a rien à voir avec celui-ci, et il reste.
       C'est justement pourquoi les clés d'examen blanc sont
       préfixées — voir prefixeExamenBlanc. */

    { cle:'__t4', type:'titre', nom:'𝟰 - 𝗡𝗜𝗩𝗘𝗔𝗨 𝗣𝗘𝗥𝗠𝗜𝗦' },

    /* Sa frise et ses leçons faites, avant les questions : c'est
       sur quoi le moniteur s'appuie pour répondre. */
    { cle:'__rappelFrise', type:'rappelFrise' },

    { cle:'niveau',      type:'niveau', nom:'4 · Niveau permis ?' },
    { cle:'heuresAvant', type:'heures', siNiveau:'oui',
      nom:"4 · Combien d'heures avant permis (+ 3h avant examen)" },
    { cle:'aDate',       type:'ouinon', siNiveau:'oui',
      nom:'4 · A déjà sa date de permis' },
    { cle:'friseAvant',  type:'ouinon', siNiveau:'oui',
      nom:'4 · Frise respectée avant examen blanc' },
    { cle:'friseAvantH', type:'court',  siNiveau:'oui',
      nom:'4 · Si non, heures en plus' },
    { cle:'frisePost',   type:'ouinon', siNiveau:'oui',
      nom:'4 · Frise respectée post permis' },
    { cle:'frisePostH',  type:'court',  siNiveau:'oui',
      nom:'4 · Si non, heures en plus' },
    { cle:'heuresPlanifiees', type:'ok', siNiveau:'oui',
      nom:'4 · Heures avant permis planifiées', defaut:'' },
    { cle:'heuresPosees',     type:'ok', siNiveau:'oui',
      nom:'4 · Heures posées (2×2h + 1×1h)', defaut:'' },

    /* ⚠️ CE QUE CHAQUE BOUTON VA ÉCRIRE, AVANT DE GÉNÉRER — v968.

       David, trois captures à l'appui : « le moniteur veut voir
       avant de générer le bilan ce que va écrire chaque bouton de
       cette partie, et pouvoir le modifier avant de générer. »

       Ces huit réponses ne font pas huit textes : elles composent
       UN bloc, celui qui part sous « 4- NIVEAU PERMIS ? ». Le cadre
       le montre en entier, tel qu'il sera écrit, et se refait à
       chaque bouton.

       ⚠️ PAS DE « siNiveau » ICI. Le bloc existe pour les trois
       réponses — Oui, Pourrait, Pas le niveau — et c'est justement
       pour les comparer que David veut le voir. */
    { cle:'niveauTexte', type:'apercuNiveau',
      nom:'4 · Ce qui partira dans le bilan' }
  ],
  examen: [
    /* Deux moments distincts : le trajet vers le centre, puis
       l'examen lui-même. Le moniteur envoie le premier dès que
       l'élève descend, et reprend le second à son tour. */
    { cle:'__titreAvant', type:'titre', nom:'🚗 Avant examen',
      aide:'Le trajet jusqu\'au centre. À envoyer dès que l\'élève ' +
           'a fini de conduire.' },
    { cle:'avantExamen.installation', type:'ok', nom:'AVANT — Installation', defaut:'' },
    { cle:'avantExamen.passager',     type:'ok', nom:'AVANT — Passager',     defaut:'' },
    { cle:'avantExamen.voyants',      type:'ok', nom:'AVANT — Voyants',      defaut:'' },
    { cle:'avantExamen.erreurs',      type:'texte', lignes:5,
      nom:'AVANT — Erreurs à ne pas refaire (trajet vers le centre)',
      /* La même case que sur l'examen blanc — v911. C'est sur le
         trajet vers le centre que l'oubli se produit le plus
         souvent : l'élève monte dans une voiture déjà réglée sans
         penser à le dire. */
      phraseCoche:PHRASE_VOITURE_APPORTEE, survitesse:true },

    /* Le bouton vient après ce qu'il envoie : le moniteur remplit
       d'abord, puis expédie. */
    { cle:'__envoiAvant', type:'envoiAvant' },

    { cle:'__titreExamen', type:'titre', nom:'🏁 Examen',
      aide:'Ce que l\'inspecteur a noté. À remplir au retour de ' +
           'l\'élève.' },
    /* Ces champs se rangent sous « examen » : c'est là que le
       constructeur du bilan va les chercher. Sans le préfixe,
       ils n'apparaissaient nulle part. */
    /* ⚠️ QUATRE SUJETS SE SUIVAIENT SANS RIEN ENTRE EUX.

       « Mettre plus visible vérif pour séparer. » Installation,
       vérifications, sécurité routière et premiers secours ont
       chacun leur case ✅/❌ et leur explication : à bout de bras
       dans une voiture, on ne voyait plus où finissait l'un. Un
       sous-titre par sujet, et la case cochée est la bonne. */
    { cle:'__sInstall', type:'sousTitre', nom:'🚗 Installation' },
    { cle:'examen.installation', type:'ok', nom:'EXAMEN — Installation', defaut:'' },
    { cle:'examen.passager',     type:'ok', nom:'EXAMEN — Passager',     defaut:'' },
    { cle:'examen.voyants',      type:'ok', nom:'EXAMEN — Voyants',      defaut:'' },
    /* Une seule case pour les trois : installation, passager et
       voyants se notent ensemble sur /2, et ce qui a coincé se
       raconte d'une traite. Trois cases auraient fait répéter la
       même phrase. */
    { cle:'examen.installTexte', type:'texte', lignes:3,
      nom:'Explication ou correction — installation, passager et voyants',
      /* La même case que sur l'examen blanc — v911. Elle y était
         depuis longtemps et manquait ici, alors que c'est le MÊME
         oubli, le même jour, dans la même voiture. Dix-huit mots à
         retaper à bout de bras : personne ne les retape, et
         l'explication disparaît. Une seule phrase, écrite à un seul
         endroit (PHRASE_VOITURE_APPORTEE), pour les trois cases. */
      phraseCoche:PHRASE_VOITURE_APPORTEE, survitesse:true },
    { cle:'__sVerif', type:'sousTitre', nom:'🧰 Vérification' },
    { cle:'examen.verifQuestion', type:'court',
      nom:'N° de la question de vérification' },
    { cle:'examen.vi',           type:'ok', nom:'Vérification', defaut:'' },
    { cle:'examen.viTexte',      type:'texte', lignes:3,
      nom:'Explication ou correction — vérification',
      /* La même case qu'à l'examen blanc — v1142, choix de David. */
      phraseCoche:PHRASE_VERIFS_A_BOSSER },
    { cle:'__sQser', type:'sousTitre', nom:'🚦 Question sécurité routière' },
    { cle:'examen.qser',         type:'ok', nom:'Question sécurité routière', defaut:'' },
    { cle:'examen.qserTexte',    type:'texte', lignes:3,
      nom:'Explication ou correction — sécurité routière' },
    { cle:'__sSecours', type:'sousTitre', nom:'🚑 Premiers secours' },
    { cle:'examen.secours',      type:'ok', nom:'Premiers secours', defaut:'' },
    { cle:'examen.secoursTexte', type:'texte', lignes:3,
      nom:'Explication ou correction — premiers secours' },
    /* ⚠️ LES BOUTONS ☠️ ET ⚠️ ÉTAIENT DÉJÀ LÀ, ET NE MENAIENT NULLE
       PART — v910.

       Le rendu des observations est le MÊME pour l'examen blanc et
       pour l'examen officiel : une seule fonction construit chaque
       ligne, et elle pose ses deux boutons sans savoir dans quel
       modèle elle se trouve. Ils s'affichaient donc ici depuis
       toujours, et un moniteur pouvait les appuyer.

       Sauf que les deux choses qu'ils déclenchent visaient des
       champs de l'examen blanc : le CEPC et son bloc « Bilan des
       erreurs ». Aucun des deux n'existait sur l'officiel. La
       marque se posait, et RIEN ne se rangeait ni ne s'imprimait —
       une marque qui ne mène nulle part, comme un droit qui ne mène
       nulle part.

       Ce qui change en v910 n'est donc pas d'ajouter les boutons :
       c'est de leur donner un endroit où atterrir. Le CEPC ci-
       dessous est cet endroit, et buildExamen range désormais les
       remarques sous leur compétence. */
    /* Les deux mêmes blocs que sur l'examen blanc. David : « sur
       examen officiel tu le mets juste avant OBSERVATIONS DE
       L'INSPECTEUR ». Il n'y a pas de repère « 2-3 » ici — c'est
       ce titre-là qui sert de repère. */
    /* 🎯 v1238 — L'ARRÊT DE PRÉCISION, AVANT LA MANŒUVRE, DANS LE MÊME
       CADRE. David, le 22/10 : « Manœuvre : Arrêt de précision, avec en
       dessous Remarque de l'inspecteur et Explication ou correction ».
       Les mêmes lignes que la manœuvre ; « faite » (cochée d'office)
       la compte dans la fiche des manœuvres de l'élève. */
    { cle:'__sArretOff', type:'sousTitre', nom:'🅿️ Manœuvre : Arrêt de précision', fond:'ardoise',
      choixFait:'examen.arretPrecisionFaite' },
    { cle:'examen.arretPrecision', type:'observations', zone:'obsArretPrecision',
      lignes:2, mention:'Arrêt de précision', fond:'ardoise',
      nom:'Ce qui s\'est passé pendant l\'arrêt de précision' },
    { cle:'__sManoeuvreOff', type:'sousTitre', nom:'🅿️ Manœuvre', fond:'ardoise',
      choixManoeuvre:'examen.manoeuvreFaite' },
    { cle:'examen.manoeuvre', type:'observations', zone:'obsManoeuvre',
      lignes:2, mention:'Manœuvre', fond:'ardoise',
      nom:'Ce qui s\'est passé pendant la manœuvre' },

    { cle:'__sAutonomieOff', type:'sousTitre', nom:'🧭 AUTONOMIE', fond:'ardoise' },
    { cle:'examen.autonomie', type:'autonomie', ligne:'Conduite autonome',
      nom:'Conduite autonome', fond:'ardoise',
      aide:'Ce qui a manqué en conduite autonome.' },
    /* 🔁 v1238 — PASSAGER ET VOYANTS, REVUS APRÈS LA MANŒUVRE. David :
       « après la manœuvre on doit revoir si l'élève a vérifié à nouveau
       passagers et voyants, et ça doit enlever des points sur le CEPC
       même si c'était bon avant ». Un ❌ = 1 point de moins (son choix). */
    { cle:'__sApresOff', type:'sousTitre', nom:'🔁 Après la manœuvre', fond:'ardoise' },
    { cle:'examen.apresPassager', type:'ok', nom:'Passager (revu après la manœuvre)', defaut:'', fond:'ardoise',
      cepcMoins:{ ligne:"Savoir s'installer et assurer la sécurité à bord", points:1 } },
    { cle:'examen.apresVoyants', type:'ok', nom:'Voyants (revus après la manœuvre)', defaut:'', fond:'ardoise',
      cepcMoins:{ ligne:"Savoir s'installer et assurer la sécurité à bord", points:1 } },

    { cle:'observations',type:'observations', nom:'Observations de l\'inspecteur' },

    /* Ce qui suit ne part jamais à l'élève : c'est pour nous,
       et pour le moniteur qui fera le rendez-vous post-permis. */
    { cle:'__titrePourNous', type:'titre', nom:'🔒 Pour nous seulement',
      aide:'Rien de ce qui suit ne figure sur le bilan de l\'élève. ' +
           'Tout va dans ses notes, pour l\'équipe.' },

    /* ⚠️ NOTRE CEPC, PAS CELUI DE L'INSPECTEUR — v910.

       David : « on va mettre en place un CEPC aussi, mais qui n'est
       visible que pour les moniteurs, et qui apparaît sur le
       rendez-vous post-permis aussi, pour le comparer avec le CEPC
       officiel ».

       Il est SOUS le titre « 🔒 Pour nous seulement », et c'est tout
       ce qui le rend invisible à l'élève : buildExamen ne
       l'imprime pas. L'examen blanc, lui, imprime le sien — c'est
       le même écran de saisie, deux destinations différentes.

       ⚠️ ET IL NE SE COMPARE PAS TOUT SEUL. Le CEPC officiel arrive
       au rendez-vous post-permis en PHOTO — la galerie des captures.
       La comparaison se fait donc à l'œil, notre grille au-dessus
       des siennes. Calculer un écart demanderait de retaper les
       quatorze notes de l'inspecteur, et une grille qu'on ne
       remplit pas est une grille qui ment. */
    { cle:'cepc', type:'cepc',
      nom:'🧾 Notre CEPC — pour nous, jamais pour l\'élève' },

    /* ⚠️ ET LA MÊME CASE QU'À L'EXAMEN BLANC, AU MÊME ENDROIT — v1069.
       Celle-ci, en revanche, PART À L'ÉLÈVE : elle est la seule
       chose de ce bloc « pour nous » à franchir la porte, parce
       qu'un examen interrompu le concerne au premier chef. Voir
       buildExamen. */
    { cle:'nonMene', type:'nonMene', nom:'Examen non mené à son terme',
      aide:'L\'inspecteur a interrompu l\'examen ; l\'enseignant a ramené ' +
           'le véhicule au centre.' },

    { cle:'inspecteur',  type:'inspecteur', nom:'Inspecteur' },
    { cle:'repassage',   type:'repassage',  nom:'Heures avant repassage' },
    { cle:'noteEquipe',  type:'texte', lignes:5,
      nom:'Note pour l\'équipe',
      aide:'Ce que le moniteur du rendez-vous post-permis doit savoir : ' +
           'l\'état de l\'élève, un souci pendant l\'examen, une ' +
           'remarque de l\'inspecteur.' }
  ],
  /* ------------------------------------------------------------
     LA PRÉSENTATION À LA PRÉFECTURE

     « Ils repassent, mais ce n'est pas vraiment un examen : il n'y
     a pas de CEPC, c'est juste validé ou non validé. Par contre il
     y a quand même des réflexions à noter que fait l'inspecteur. »

     ⚠️ PAS DE CEPC, DONC PAS D'« observations ».

     Le type « observations » de l'examen officiel range chaque
     remarque sous une catégorie du CEPC : elle décide du E et du
     rangement dans le bilan. Ici il n'y a pas de grille — s'en
     servir quand même donnerait un CEPC vide sur un bilan qui n'en
     a pas, et l'élève lirait des cases qui ne veulent rien dire.
     Les réflexions de l'inspecteur sont donc du texte, tel qu'il
     l'a dit.
     ------------------------------------------------------------ */
  prefecture: [
    { cle:'__titre', type:'titre', nom:'♿ Présentation à la préfecture',
      aide:'Pas de CEPC : le nouveau permis est validé ou non, et on ' +
           "note ce que l'inspecteur a dit." },
    { cle:'valide',  type:'ouinon', nom:'Nouveau permis validé' },
    { cle:'quand',   type:'court',  nom:'Date de la présentation' },
    { cle:'poste',   type:'texte',  lignes:2,
      nom:'Aménagements présentés',
      aide:'Le poste de conduite tel qu\'il a été présenté. Repris de ' +
           'sa fiche, à corriger si besoin.' },
    { cle:'reflexions', type:'texte', lignes:6,
      nom:"Réflexions de l'inspecteur",
      aide:"Ce qu'il a dit pendant et après la présentation, dans ses " +
           'mots.' },
    { cle:'suite',   type:'texte', lignes:3,
      nom:'Ce qui reste à faire',
      aide:'Vide si le permis est validé.' },

    /* Comme pour l'examen officiel : ce qui suit ne part jamais à
       l'élève. */
    { cle:'__titrePourNous', type:'titre', nom:'🔒 Pour nous seulement',
      aide:"Rien de ce qui suit ne figure sur le bilan de l'élève. " +
           "Tout va dans ses notes, pour l'équipe." },
    { cle:'noteEquipe', type:'texte', lignes:4,
      nom:"Note pour l'équipe" }
  ],
  /* Le rendez-vous pédagogique : ce que le constructeur attend,
     et rien d'autre. Le bloc de notes unique d'avant n'était lu
     nulle part — tout ce qu'on y écrivait était perdu. */
  rvp: [
    { cle:'carteSD',      type:'ok', nom:'Carte SD', defaut:'✅' },
    { cle:'installation', type:'ok', nom:'Installation', defaut:'✅' },
    { cle:'passager',     type:'ok', nom:'Passager', defaut:'✅' },
    { cle:'voyants',      type:'ok', nom:'Voyants', defaut:'✅' },
    { cle:'rubriques',    type:'rubriques', nom:'🧠 Erreurs de ce jour' }
  ],
  /* La formation accompagnateur : carte SD, installation et les
     neuf rubriques. Même constat que pour le RVP. */
  accompagnateur: [
    { cle:'carteSD',      type:'ok', nom:'Carte SD', defaut:'✅' },
    { cle:'installation', type:'ok', nom:'Installation', defaut:'✅' },
    { cle:'rubriques',    type:'rubriques', nom:'🧠 Erreurs de ce jour' }
  ]
};

/* ============================================================
   L'EXAMEN BLANC GLISSÉ DANS UN RENDEZ-VOUS PÉDAGOGIQUE

   Les mêmes champs qu'un examen blanc, moins la section 1 : au
   RVP l'élève ne roule pas jusqu'au centre d'examen, et sa carte
   SD comme son installation sont déjà en haut du bilan.

   Le schéma est DÉRIVÉ de celui de l'examen blanc, jamais recopié :
   un champ ajouté là-bas arrive ici tout seul. Les clés sont
   préfixées, sinon « bilanErreurs » écraserait celui du RVP.
   ============================================================ */
CHAMPS_MANUELS.rvp = CHAMPS_MANUELS.rvp.concat(
  /* La question d'abord. « Non » ferme le sujet et le bilan le dit
     par un ❌ ; « oui » ouvre les champs de l'examen blanc. Sans
     réponse, le bilan garde sa forme d'avant. */
  [{ cle:'examenBlancFait', type:'ouinon',
     nom:'📝 Tu peux faire un examen blanc ?' }],

  CHAMPS_MANUELS.examenblanc
    /* La section 1 saute : elle n'a pas lieu d'être ici */
    .filter(c => c.cle.indexOf('avant.') !== 0 && c.cle !== '__t1')
    .map(c => Object.assign({}, c, {
      cle: (c.cle.indexOf('__') === 0) ? c.cle + 'Rvp' : 'examenBlanc.' + c.cle,
      /* 🅿️ v1211 — la manœuvre choisie se range avec le reste de
         l'examen blanc, sous « examenBlanc. » */
      ...(c.choixManoeuvre ? { choixManoeuvre: 'examenBlanc.' + c.choixManoeuvre } : {}),
      ...(c.choixFait ? { choixFait: 'examenBlanc.' + c.choixFait } : {}),
      /* Tout le module ne s'affiche que sur un « oui » */
      siEb: 'oui'
    }))
);

/* La boîte automatique part du même formulaire que la boîte manuelle,
   puis les deux évoluent séparément. */
CHAMPS_MANUELS.conduiteResumeAuto =
  JSON.parse(JSON.stringify(CHAMPS_MANUELS.conduiteResume));


/* Le préfixe des champs d'examen blanc.

   Sur un examen blanc, ils vivent à la racine : « niveau »,
   « cepc », « examen.verifNote ». Glissés dans un rendez-vous
   pédagogique, ils sont rangés sous « examenBlanc. » — sinon
   « bilanErreurs » écraserait celui du RVP, qui n'a ni la même
   forme ni le même sens. */
let prefixeExamenBlanc = '';

/* ============================================================
   ✍️ LA FORME D'UNE FICHE — v1206

   David, le 20 octobre : « que je puisse choisir le fond de certaines
   zones pour que les moniteurs se repèrent […] ajouter des cases à
   cocher et modifier celles qui y sont pour mettre une phrase
   directement, ajouter ou enlever les boutons de micro en bout de
   ligne ». Ses choix : une forme par MODÈLE, publiée par un admin.

   ⚠️ UNE FORME NE TOUCHE PAS AU BILAN. Elle se pose sur les rubriques
   d'origine (CHAMPS_MANUELS) : titres, aides, fonds, cases, micros,
   ordre, zones masquées. Les clés ne changent jamais : le bilan se
   compose comme avant, avec ce que le moniteur a rempli.

   ⚠️ ET UNE FICHE COMMENCÉE GARDE SA FORME. Les saisies se replacent
   par leur RANG : une fiche qui changerait d'ordre entre deux
   ouvertures écrirait dans les mauvaises cases. Le brouillon emporte
   donc la forme avec laquelle il a commencé (« formeEnCours »).
   ============================================================ */
let formesFiches = {};          /* modèle → forme publiée */
let formeEnCours = null;        /* la forme de la fiche ouverte */
let formeImposee;               /* reprise d'un brouillon : SA forme */
/* ✍️ v1207 — la fiche ouverte, telle qu'elle est dessinée (ordre,
   titres, zones ajoutées) : la lecture des saisies, le miroir du
   bureau et la place des zones ajoutées dans le bilan la relisent. */
let champsFicheOuverte = null, ficheOuverteModele = '';
function champsDeLaFicheOuverte(modeleCle){
  return (champsFicheOuverte && ficheOuverteModele && ficheOuverteModele === modeleCle) ? champsFicheOuverte : null;
}
const FONDS_FICHE = {
  '#DCD0FF': { nom: 'Violet',  fort: '#7C5CE6' }, '#E8EDF3': { nom: 'Ardoise', fort: '#5B6B80' },
  '#EEFFC2': { nom: 'Citron',  fort: '#6E9E00' }, '#D6ECFF': { nom: 'Bleu',    fort: '#2F7FD8' },
  '#FFD9E6': { nom: 'Rose',    fort: '#D9467A' }, '#FFE7A8': { nom: 'Sable',   fort: '#B88A12' },
  '#FFD8B8': { nom: 'Orange',  fort: '#E07A1F' }, '#D4F5DF': { nom: 'Vert',    fort: '#2E9E5B' }
};
const INTENSITES_FICHE = ['leger', 'franc', 'fort'];
/* Les zones qui calculent (CEPC, observations, niveau…) : elles se
   déplacent, se renomment, se colorent — elles ne se masquent pas. */
const TYPES_LIBRES_FICHE = ['texte', 'court', 'ok', 'titre', 'sousTitre', 'photo', 'note3', 'ouinon', 'abc', 'heures', 'cases', 'liste'];

/* ✍️ v1207 — LES ZONES AJOUTÉES (livraison ②). Ce qu'on peut poser
   « ➕ Ici » entre deux zones. Leur contenu part dans le bilan juste
   sous la zone qui les précède sur la fiche (choix B de David) : voir
   « placerAjoutsDansLeBilan ». */
const TYPES_AJOUT_FICHE = {
  titre:     { nom: '📌 Titre de partie',        aide: 'Un grand repère, comme « 2 - Pendant l’examen »' },
  sousTitre: { nom: '🔖 Sous-titre en couleur',  aide: 'Sépare deux sujets dans une partie' },
  texte:     { nom: '✍️ Cadre de texte',         aide: 'Le moniteur écrit ou dicte 🎙️ ; des cases peuvent y poser des phrases' },
  court:     { nom: '▪️ Ligne courte',           aide: 'Une seule ligne : un numéro, un mot, un lieu' },
  cases:     { nom: '☑ Cases à cocher seules',   aide: 'Chaque case cochée écrit sa phrase dans le bilan' },
  ok:        { nom: '✅❌ Trois états',           aide: '✅, ❌ ou —' },
  ouinon:    { nom: '👍 Oui / non',              aide: 'Oui, non ou —' },
  note3:     { nom: '🔢 Note de 0 à 3',          aide: 'Quatre boutons : 0, 1, 2, 3' },
  /* ▾ v1236 — David : « que je puisse ajouter des listes déroulantes,
     où je veux, et les lier avec certaines choses » */
  liste:     { nom: '▾ Liste déroulante',        aide: 'Le moniteur choisit dans une liste : chaque choix peut écrire une phrase, faire apparaître des zones, cocher son dossier' },
  /* 🎯 v1238 — des lignes « Remarque de l'inspecteur / Explication »,
     comme la manœuvre (examens seulement : elles se rangent sous le CEPC) */
  remarques: { nom: '👨‍✈️ Remarques de l’inspecteur + explications', aide: 'Des lignes Remarque / Explication avec ☠️ ⚠️, rangées sous le CEPC (examens)', examens: true }
};
/* Les fiches qui ont un CEPC (les remarques et les points s'y rangent) */
const SCHEMAS_CEPC_FICHE = ['examenblanc', 'examen', 'rvp'];
function lignesCepcFiche(){
  const out = [];
  ((typeof CEPC_BLOCS !== 'undefined' && CEPC_BLOCS) || []).forEach(b => (b.items || []).forEach(it => out.push(it.nom)));
  return out;
}
/* ▾ v1236 — d'où viennent les choix d'une liste. « Ma liste » : écrits
   par l'admin. Les autres suivent l'appli (les voitures : la Flotte,
   reprise à chaque publication — un moniteur ne lit pas la Flotte). */
const SOURCES_LISTE_FICHE = {
  main: '✍️ Ma liste', manoeuvres: '🅿️ Les manœuvres', voitures: '🚗 Les voitures', moniteurs: '👤 Les moniteurs',
  centres: '📍 Les centres d’examen', procedures: '📋 Les procédures', formations: '🎓 Les formations'
};
/* 🅿️ v1236 — le menu « Manœuvre : … » de l'examen blanc, de l'examen
   officiel et du RVP : UNE liste pour les trois (choix de David), rangée
   comme une fiche, sous ce nom-là (brouillon, puis « 💾 Publier »). */
const CLE_MENU_MANOEUVRES = 'menu-manoeuvres';
function textesFiche(l, combien, max){
  const out = [];
  (Array.isArray(l) ? l : []).slice(0, combien).forEach(x => {
    if(typeof x !== 'string') return;
    const v = texteFiche(x, max).replace(/\s+/g, ' ').trim();
    if(v && out.indexOf(v) === -1) out.push(v);
  });
  return out;
}
function nettoyerMenuManoeuvres(f){
  return { v: 1, liste: textesFiche(f && f.liste, 60, 80) };
}
/* La liste du menu : celle du créateur ouvert, sinon la publiée, sinon
   celle de l'école */
function listeDuMenuManoeuvres(){
  const ecole = (typeof BLOC !== 'undefined' && BLOC.ficheListeConduite) || [];
  if(typeof fiS !== 'undefined' && fiS && Array.isArray(fiS.menu)) return fiS.menu.length ? fiS.menu : ecole;
  const f = (typeof formesFiches !== 'undefined' && formesFiches) ? formesFiches[CLE_MENU_MANOEUVRES] : null;
  const l = f ? nettoyerMenuManoeuvres(f).liste : [];
  return l.length ? l : ecole;
}
/* Les libellés d'une source de l'appli */
function itemsDeLaSourceFiche(source, ch){
  const tri = l => l.slice().sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  if(source === 'manoeuvres') return ((typeof BLOC !== 'undefined' && BLOC.ficheListeConduite) || []).slice();
  if(source === 'voitures'){
    const vivante = (typeof fiS !== 'undefined' && fiS && Array.isArray(fiS.flotte) && fiS.flotte.length) ? fiS.flotte : null;
    return (vivante || (ch && ch.items) || []).slice();
  }
  if(source === 'moniteurs') return tri(textesFiche((typeof moniteursActifs !== 'undefined' && moniteursActifs) || [], 60, 60));
  if(source === 'centres') return ((typeof CENTRES_EXAMEN !== 'undefined' && CENTRES_EXAMEN) || ['Saint-Brieuc', 'Loudéac']).slice();
  if(source === 'procedures'){
    let l = [];
    try{ l = (typeof toutesLesProcedures === 'function') ? toutesLesProcedures().map(p => String((p && p.nom) || '').trim()) : []; }catch(e){ l = []; }
    return tri(textesFiche(l, 200, 120));
  }
  if(source === 'formations'){
    return (typeof FORMATIONS_BASE !== 'undefined' ? FORMATIONS_BASE : []).map(x => String(x.cle || '').trim()).filter(Boolean);
  }
  return [];
}
/* Les choix d'une liste, avec leurs réglages (phrase, zones montrées,
   manœuvre comptée faite, voitures) */
function choixDeLaListeFiche(ch){
  const reglages = Array.isArray(ch && ch.choix) ? ch.choix : [];
  if(!ch || !ch.source || ch.source === 'main') return reglages.map(c => Object.assign({}, c));
  return itemsDeLaSourceFiche(ch.source, ch).map(lib => Object.assign({}, reglages.find(c => c.libelle === lib) || {}, { libelle: lib }));
}
function valeursDeLaListeFiche(v){
  return String(v == null ? '' : v).split('\n').map(x => x.trim()).filter(Boolean);
}
function couleurTexteFiche(v){
  const s = String(v || '');
  return /^#[0-9a-f]{6}$/i.test(s) ? s.toUpperCase() : '';
}
const RE_CLE_AJOUT_FICHE = /^z[a-z0-9]{2,12}$/;
const TYPES_TITRES_FICHE = ['titre', 'sousTitre'];
const RE_CLE_CADRE_FICHE = /^c[a-z0-9]{2,12}$/;
function nouvelleCleFiche(prefixe, prises){
  let k;
  do{ k = prefixe + Math.random().toString(36).slice(2, 8).replace(/[^a-z0-9]/g, 'x'); }while(prises.indexOf(k) !== -1);
  return k;
}
/* Les zones ajoutées d'une forme, prêtes à dessiner comme les autres */
function ajoutsDeLaForme(forme){
  const a = (forme && Array.isArray(forme.ajouts)) ? forme.ajouts : [];
  return a.map(z => {
    const c = { cle: z.cle, type: z.type, nom: z.nom || '', ajout: true };
    /* ✍️ v1208 — « 🔒 Pour nous seulement » : dans la note interne,
       jamais dans le bilan de l'élève */
    if(z.bureau && TYPES_TITRES_FICHE.indexOf(z.type) === -1) c.pourNous = true;
    if(z.aide) c.aide = z.aide;
    if(z.type === 'texte') c.lignes = z.lignes || 4;
    /* 🎯 v1238 — des remarques : dessinées et lues comme celles de la manœuvre */
    if(z.type === 'remarques'){
      c.type = 'observations'; c.typeAjout = 'remarques';
      c.zone = 'obs_' + z.cle; c.mention = z.mention || z.nom || 'Remarque'; c.lignes = z.lignes || 2;
    }
    if(z.type === 'ok' && z.cepcMoins) c.cepcMoins = Object.assign({}, z.cepcMoins);
    if(z.type === 'liste'){
      c.source = z.source || 'main';
      c.choix = Array.isArray(z.choix) ? z.choix : [];
      if(z.multi) c.multi = true;
      if(Array.isArray(z.items)) c.items = z.items;
    }
    return c;
  });
}
const CLES_VERROUILLEES_FICHE = ['heuresAvant', 'bilanElim', 'examen.verifNote', 'estimationTexte'];
function zoneVerrouilleeFiche(ch){
  if(!ch) return true;
  const c = String(ch.cle || '').replace(/^examenBlanc\./, '');
  return TYPES_LIBRES_FICHE.indexOf(ch.type) === -1 || CLES_VERROUILLEES_FICHE.indexOf(c) !== -1 ||
         /(^|\.)bilanElim$/.test(c) || !!ch.siNiveau;
}
function couleurFiche(v){
  const s = String(v || '');
  return /^#[0-9a-f]{6}$/i.test(s) ? s.toUpperCase() : (s === 'ardoise' ? 'ardoise' : '');
}
/* 🚗 v1211 — une liste de voitures : des noms courts, sans « | »,
   trente au plus, sans doublon ; « @survitesse » passe tel quel */
function voituresFiche(l){
  const out = [];
  (Array.isArray(l) ? l : []).slice(0, 30).forEach(x => {
    if(typeof x !== 'string') return;
    const v = (x === '@survitesse') ? x : texteFiche(x, 60).replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
    if(v && out.indexOf(v) === -1) out.push(v);
  });
  return out;
}
function texteFiche(v, max){ return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').slice(0, max); }
/* La forme telle qu'on peut s'en servir : rien d'autre que des clés
   connues, des textes bornés, des couleurs vérifiées. */
function nettoyerFormeFiche(forme, champs){
  const f = (forme && typeof forme === 'object') ? forme : {};
  const clesOrigine = (champs || []).map(ch => ch.cle);
  /* ✍️ v1207 — les zones ajoutées : une clé à nous (« z… »), un type
     de la liste, un titre et une aide bornés. Rien d'autre ne passe. */
  const ajouts = [];
  (Array.isArray(f.ajouts) ? f.ajouts : []).slice(0, 40).forEach(z => {
    if(!z || typeof z !== 'object') return;
    const k = String(z.cle || '');
    if(!RE_CLE_AJOUT_FICHE.test(k) || clesOrigine.indexOf(k) !== -1 || ajouts.some(x => x.cle === k)) return;
    if(!Object.prototype.hasOwnProperty.call(TYPES_AJOUT_FICHE, z.type)) return;
    const o = { cle: k, type: z.type, nom: texteFiche(z.nom, 120) };
    if(typeof z.aide === 'string' && z.aide.trim()) o.aide = texteFiche(z.aide, 240);
    if(z.type === 'texte'){ const n = parseInt(z.lignes, 10); o.lignes = (n >= 1 && n <= 12) ? n : 4; }
    if(z.bureau && TYPES_TITRES_FICHE.indexOf(z.type) === -1) o.bureau = 1;
    if(z.type === 'remarques'){
      const m = texteFiche(z.mention, 80).replace(/\s+/g, ' ').trim();
      if(m) o.mention = m;
      const n = parseInt(z.lignes, 10); o.lignes = (n >= 1 && n <= 20) ? n : 2;
      delete o.bureau;   /* elles vont au CEPC, donc à l'élève */
    }
    if(z.type === 'ok' && z.cepcMoins && typeof z.cepcMoins === 'object'){
      const l = String(z.cepcMoins.ligne || '');
      const pts = parseInt(z.cepcMoins.points, 10);
      if(lignesCepcFiche().indexOf(l) !== -1) o.cepcMoins = { ligne: l, points: (pts >= 1 && pts <= 3) ? pts : 1 };
    }
    /* ▾ v1236 — une liste : sa source, ses choix et leurs liens */
    if(z.type === 'liste'){
      o.source = Object.prototype.hasOwnProperty.call(SOURCES_LISTE_FICHE, z.source) ? z.source : 'main';
      const vus = [];
      o.choix = (Array.isArray(z.choix) ? z.choix : []).slice(0, 80).map(c => {
        if(!c || typeof c !== 'object') return null;
        const n = { libelle: texteFiche(c.libelle, 80).replace(/\s+/g, ' ').trim() };
        if(!n.libelle || vus.indexOf(n.libelle) !== -1) return null;
        vus.push(n.libelle);
        const ph = texteFiche(c.phrase, 500).trim();
        if(ph) n.phrase = ph;
        const m = (Array.isArray(c.montre) ? c.montre : []).filter(k => typeof k === 'string' && k.length <= 80).slice(0, 20);
        if(m.length) n.montre = m;
        if(c.fait) n.fait = 1;
        const vz = voituresFiche(c.voitures);
        if(vz.length) n.voitures = vz;
        return n;
      }).filter(Boolean);
      if(z.multi) o.multi = 1;
      if(o.source === 'voitures') o.items = textesFiche(z.items, 60, 60);
    }
    ajouts.push(o);
  });
  const cles = clesOrigine.concat(ajouts.map(z => z.cle));
  /* ▾ les zones qu'un choix fait apparaître : des clés de CETTE fiche */
  ajouts.forEach(z => { if(z.type === 'liste') z.choix.forEach(c => {
    if(!c.montre) return;
    c.montre = c.montre.filter((k, i, t) => k !== z.cle && cles.indexOf(k) !== -1 && t.indexOf(k) === i);
    if(!c.montre.length) delete c.montre;
  }); });
  const zones = {};
  const src = (f.zones && typeof f.zones === 'object') ? f.zones : {};
  cles.forEach(k => {
    const z = src[k];
    if(!z || typeof z !== 'object') return;
    const o = {};
    if(typeof z.nom === 'string') o.nom = texteFiche(z.nom, 120);
    if(typeof z.aide === 'string') o.aide = texteFiche(z.aide, 240);
    if(z.fond !== undefined) o.fond = couleurFiche(z.fond);
    if(INTENSITES_FICHE.indexOf(z.intensite) !== -1) o.intensite = z.intensite;
    if(z.micro === 0 || z.micro === 1) o.micro = z.micro;
    if(z.cache === 1) o.cache = 1;
    if(Array.isArray(z.cases)){
      o.cases = z.cases.slice(0, 8).map(c => ({
        libelle: texteFiche(c && c.libelle, 80).trim(),
        phrase: texteFiche(c && c.phrase, 500).trim(),
        ou: (c && c.ou === 'fin') ? 'fin' : 'debut',
        office: (c && c.office) ? 1 : 0,
        voitures: voituresFiche(c && c.voitures)
      })).filter(c => c.phrase).map(c => { if(!c.voitures.length) delete c.voitures; return c; });
    }
    /* 🚗 v1211 — les voitures d'une zone, et « sv » : les cases de la
       survitesse sont déjà dans « cases » (l'admin les a reprises) */
    if(z.sv === 1) o.sv = 1;
    /* 🎨 v1236 — la couleur du titre (t), de l'aide (a), de ce que le
       moniteur écrit (x) ; « b » : aussi dans le bilan */
    if(z.couleurs && typeof z.couleurs === 'object'){
      const cc = {};
      ['t', 'a', 'x'].forEach(q => { const v = couleurTexteFiche(z.couleurs[q]); if(v) cc[q] = v; });
      if(cc.t || cc.a || cc.x){ if(z.couleurs.b) cc.b = 1; o.couleurs = cc; }
    }
    const vz = voituresFiche(z.voitures);
    if(vz.length) o.voitures = vz;
    if(Object.keys(o).length) zones[k] = o;
  });
  const ordre = [];
  (Array.isArray(f.ordre) ? f.ordre : []).forEach(k => { if(cles.indexOf(k) !== -1 && ordre.indexOf(k) === -1) ordre.push(k); });
  /* ✍️ v1207 — « 📦 Encadrer » : un fond pour plusieurs zones qui se
     suivent, de « de » à « a » dans l'ordre de la fiche. */
  const cadres = [];
  (Array.isArray(f.cadres) ? f.cadres : []).slice(0, 16).forEach(c => {
    if(!c || typeof c !== 'object') return;
    const id = String(c.id || '');
    if(!RE_CLE_CADRE_FICHE.test(id) || cadres.some(x => x.id === id)) return;
    if(cles.indexOf(c.de) === -1 || cles.indexOf(c.a) === -1) return;
    const fond = couleurFiche(c.fond);
    if(!fond) return;
    cadres.push({ id: id, de: c.de, a: c.a, fond: fond,
                  intensite: INTENSITES_FICHE.indexOf(c.intensite) !== -1 ? c.intensite : 'franc' });
  });
  const o = { v: 1, zones: zones, ordre: ordre };
  if(ajouts.length) o.ajouts = ajouts;
  if(cadres.length) o.cadres = cadres;
  return o;
}
/* Les rubriques d'origine (et les zones ajoutées), habillées par la forme */
function champsAvecForme(champs, forme){
  if(!Array.isArray(champs)) return champs;
  const f = nettoyerFormeFiche(forme, champs);
  let liste = champs.concat(ajoutsDeLaForme(f)).map(ch => {
    const c = Object.assign({}, ch);
    const z = f.zones[ch.cle] || {};
    if(z.nom !== undefined && z.nom.trim()) c.nom = z.nom;
    if(z.aide !== undefined) c.aide = z.aide;
    if(z.fond !== undefined){
      if(z.fond) c.fond = z.fond; else delete c.fond;
    }
    c.intensite = z.intensite || (c.fond === 'ardoise' || !c.fond ? 'leger' : 'franc');
    if(z.cases) c.cases = z.cases;
    else if(c.phraseCoche) c.cases = [{ libelle: '', phrase: String(c.phraseCoche), ou: 'debut', office: 0 }];
    delete c.phraseCoche;
    /* 🚗 v1211 — les deux cases de la survitesse deviennent deux cases
       comme les autres, réservées à leurs voitures. Tant que l'admin
       n'a pas touché aux cases de la zone (« sv »), elles s'ajoutent
       au bout, comme avant. */
    if(c.survitesse){
      if(!z.sv) c.cases = (c.cases || []).concat(casesSurvitesse());
      delete c.survitesse;
    }
    /* Une zone entière réservée à certaines voitures */
    if(Array.isArray(z.voitures) && z.voitures.length && (ch.ajout || !zoneVerrouilleeFiche(ch))) c.voitures = z.voitures.slice();
    if(z.micro === 0) c.sansMicro = true;
    if(z.cache && (ch.ajout || !zoneVerrouilleeFiche(ch))) c.cacheFiche = true;
    if(z.couleurs) c.couleurs = Object.assign({}, z.couleurs);
    return c;
  });
  /* ▾ v1236 — une zone qu'un choix de liste fait apparaître : cachée
     tant que ce choix n'est pas pris (siListe) */
  liste.forEach(l => {
    if(l.type !== 'liste' || l.cacheFiche) return;
    (l.choix || []).forEach(it => (it.montre || []).forEach(k => {
      const t = liste.find(x => x.cle === k);
      if(!t || t === l || !(t.ajout || !zoneVerrouilleeFiche(t))) return;
      t.siListe = (t.siListe || []).concat([{ l: l.cle, v: it.libelle }]);
    }));
  });
  const nouvelles = {};
  if(f.ordre.length){
    /* ⚠️ v1240 — UNE ZONE QUE L'ORDRE NE CONNAÎT PAS (arrivée avec une
       mise à jour, après la publication de la fiche) se range juste
       derrière la zone qui la précède dans la fiche d'origine — et non
       plus tout en bas de la fiche. */
    const pos = {};
    f.ordre.forEach((k, i) => { pos[k] = i; });
    /* Elle va juste AVANT la zone qui la suit dans la fiche d'origine
       (après ce que l'admin a ajouté derrière sa voisine) — seulement
       si l'ordre connaît ses deux voisines ; sinon, comme avant, en bas. */
    /* (un ordre qui ne liste que quelques zones les met en tête : là,
       les autres suivent en bas, comme toujours) */
    const bases = liste.filter(c => !c.ajout);
    const complet = bases.length && bases.filter(c => pos[c.cle] !== undefined).length >= 0.8 * bases.length;
    const rangs = liste.map((c, i) => {
      if(pos[c.cle] !== undefined) return pos[c.cle];
      if(c.ajout || !complet) return 1e6;
      let avant = false, apres = null;
      for(let j = i - 1; j >= 0; j--){ if(!liste[j].ajout && pos[liste[j].cle] !== undefined){ avant = true; break; } }
      for(let j = i + 1; j < liste.length; j++){ if(!liste[j].ajout && pos[liste[j].cle] !== undefined){ apres = pos[liste[j].cle]; break; } }
      if(avant && apres !== null){ nouvelles[c.cle] = true; return apres - 0.5 + i / 1e5; }
      return 1e6;
    });
    const dOrigine = liste.map((c, i) => [c, i, rangs[i]]);
    dOrigine.sort((a, b) => (a[2] - b[2]) || (a[1] - b[1]));
    liste = dOrigine.map(x => x[0]);
  }
  /* Les cadres se posent APRÈS l'ordre : un cadre va « de telle zone
     à telle zone », telles qu'elles se suivent sur la fiche. Il
     l'emporte sur le fond propre de chaque zone qu'il entoure. */
  (f.cadres || []).forEach(cd => {
    let i = liste.findIndex(c => c.cle === cd.de), j = liste.findIndex(c => c.cle === cd.a);
    if(i === -1 || j === -1) return;
    if(i > j){ const t = i; i = j; j = t; }
    /* v1240 — une zone arrivée après la publication, posée juste derrière
       la dernière zone du cadre, en fait partie */
    while(j + 1 < liste.length && nouvelles[liste[j + 1].cle]) j++;
    for(let k = i; k <= j; k++){
      liste[k].fond = cd.fond; liste[k].intensite = cd.intensite; liste[k].cadre = cd.id;
    }
  });
  return liste;
}
/* La forme publiée d'un modèle (gardée sur l'appareil : une fiche
   s'ouvre aussi sans réseau, dans la voiture) */
function formePublieeDe(modeleCle){
  const f = formesFiches && formesFiches[modeleCle];
  return (f && typeof f === 'object') ? f : null;
}
function lireFormesFichesEnCache(){
  try{ const o = JSON.parse(localStorage.getItem('ec_formes_fiches') || '{}'); if(o && typeof o === 'object') formesFiches = o; }catch(e){}
}
async function chargerFormesFiches(){
  lireFormesFichesEnCache();
  try{
    const r = await appelPrep({ action: 'fichesManuellesLire' });
    if(r && r.status === 'ok' && r.publiees && typeof r.publiees === 'object'){
      formesFiches = r.publiees;
      try{ localStorage.setItem('ec_formes_fiches', JSON.stringify(formesFiches)); }catch(e){}
    }
    return r;
  }catch(e){ return null; }
}
lireFormesFichesEnCache();

/* Le fond d'un cadre : la couleur, et sa force */
function peindreCadreFond(cadre, fond, intensite){
  cadre.className = 'cadreFond';
  cadre.removeAttribute('style');
  if(fond === 'ardoise' && intensite === 'leger'){ cadre.classList.add('ardoise'); return; }
  const c = fond === 'ardoise' ? '#E8EDF3' : fond;
  const fort = (FONDS_FICHE[c] && FONDS_FICHE[c].fort) || melangerCouleurFiche(c, '#000000', 0.45);
  const clair = document.body.classList.contains('clair');
  cadre.classList.add('fond-' + intensite);
  if(intensite === 'leger'){
    cadre.style.background = clair ? melangerCouleurFiche(c, '#FFFFFF', 0.45) : avecAlphaFiche(fort, 0.16);
    cadre.style.border = '1px solid ' + avecAlphaFiche(fort, 0.35);
  }else if(intensite === 'franc'){
    cadre.style.background = clair ? c : avecAlphaFiche(fort, 0.26);
    cadre.style.border = '1px solid ' + avecAlphaFiche(fort, 0.6);
  }else{
    cadre.style.background = clair ? c : avecAlphaFiche(fort, 0.32);
    cadre.style.border = '2px solid ' + fort;
    cadre.style.borderLeftWidth = '9px';
    cadre.style.setProperty('--fond-fort', fort);
  }
}
function melangerCouleurFiche(a, b, t){
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function avecAlphaFiche(h, a){
  const p = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  return 'rgba(' + p.join(',') + ',' + a + ')';
}
/* Sans micro : on cache les 🎙️ de la zone, et ceux des lignes qu'on
   y ajoutera (« ➕ Ajouter une ligne »). */
function estBoutonMicro(b){
  return b && b.tagName === 'BUTTON' && (/^\s*(🎙️|🎙|⏹️)\s*$/.test(b.textContent) || /^Dicter/.test(b.title || ''));
}
function masquerMicrosFiche(bloc){
  const cacher = racine => racine.querySelectorAll('button').forEach(b => { if(estBoutonMicro(b)) b.classList.add('micoCache'); });
  cacher(bloc);
  if(typeof MutationObserver === 'function'){
    new MutationObserver(() => cacher(bloc)).observe(bloc, { childList: true, subtree: true });
  }
}

/* ============================================================
   ✍️ OÙ VONT LES ZONES AJOUTÉES DANS LE BILAN — v1207

   Le choix B de David : « juste sous la zone qui la précède sur la
   fiche ». Le bilan, lui, est composé par le constructeur du modèle
   (ec-modeles.js), qui ne connaît pas ces zones : on les y glisse
   APRÈS coup, sans toucher à une seule ligne de ce qu'il a écrit.

   Pour savoir où finit une zone d'origine dans le texte, on refait
   le bilan avec une marque invisible au bout de SA valeur, et on
   regarde où elle sort. ⚠️ ON NE GARDE LA PLACE QUE SI, MARQUE
   ÔTÉE, LE BILAN EST IDENTIQUE À LA LIGNE PRÈS : une zone dont la
   valeur change la forme du bilan (un titre qui n'apparaît que
   s'il y a du texte…) n'est pas un repère, on remonte à la
   précédente. Rien de trouvé au-dessus : à la fin du bilan.
   ============================================================ */
const MARQUE_AJOUT_FICHE = '';
function grasFiche(t){ return (typeof grasUnicode === 'function') ? grasUnicode(t) : String(t || ''); }
function lignesDUnAjoutFiche(c, v){
  const nom = String(c.nom || '').trim();
  const val = (v == null) ? '' : String(v).trim();
  if(c.type === 'titre') return nom ? [grasFiche(nom.toUpperCase()), '━━━━━━━━━━━━━━━━━━'] : [];
  if(c.type === 'sousTitre') return nom ? [grasFiche(nom)] : [];
  if(!val) return [];
  if(c.type === 'texte' || c.type === 'cases'){
    const l = val.split('\n');
    return nom ? [grasFiche(nom) + ' :'].concat(l) : l;
  }
  if(c.type === 'court') return [(nom ? grasFiche(nom) + ' : ' : '') + val.replace(/\s*\n\s*/g, ' ')];
  if(c.type === 'ok') return (val === '✅' || val === '❌') ? [(nom ? grasFiche(nom) + ' ' : '') + val] : [];
  if(c.type === 'ouinon') return (val === 'oui' || val === 'non') ? [(nom ? grasFiche(nom) + ' : ' : '') + (val === 'oui' ? '✅ Oui' : '❌ Non')] : [];
  if(c.type === 'note3') return /^[0-3]$/.test(val) ? [(nom ? grasFiche(nom) + ' : ' : '') + val + ' /3'] : [];
  if(c.type === 'liste'){
    /* ▾ v1236 — les phrases des choix pris (dans l'ordre de la liste),
       puis les manœuvres à compter faites : la même ligne que la
       manœuvre d'un examen, que la fiche de l'élève sait relire. */
    const pris = valeursDeLaListeFiche(val);
    const phrases = [], faites = [];
    choixDeLaListeFiche(c).forEach(it => {
      if(pris.indexOf(it.libelle) === -1) return;
      if(it.phrase) String(it.phrase).split('\n').forEach(x => { if(x.trim()) phrases.push(x.trim()); });
      if(it.fait && c.source === 'manoeuvres') faites.push(it.libelle);
    });
    const out = phrases.length ? (nom ? [grasFiche(nom) + ' :'].concat(phrases) : phrases) : [];
    if(faites.length){
      const emoji = (typeof ACCES !== 'undefined' && ACCES && ACCES.emoji) ? String(ACCES.emoji).trim() : '';
      const prefixe = (typeof PREFIXE_MANOEUVRE_EXAMEN !== 'undefined') ? PREFIXE_MANOEUVRE_EXAMEN : '🅿️ Manœuvre : ';
      const marque = emoji || ((typeof MARQUE_FAITE !== 'undefined') ? MARQUE_FAITE : '✅');
      faites.forEach(f => out.push(prefixe + f + ' ' + marque));
    }
    return out;
  }
  return [];
}
/* Une suite de zones ajoutées → ses lignes. Un titre ajouté ne sort
   que si une zone remplie le suit : pas de titre orphelin. */
function lignesDesAjoutsFiche(zones, valeurs){
  const out = [];
  let enAttente = [];
  zones.forEach(c => {
    if(c.cacheFiche || c.pourNous) return;   /* 🔒 pour nous : dans la note interne */
    const l = lignesDUnAjoutFiche(c, valeurs[c.cle]);
    if(c.type === 'titre' || c.type === 'sousTitre'){
      if(c.type === 'titre') enAttente = [];
      if(l.length) enAttente.push(l);
      return;
    }
    if(!l.length) return;
    enAttente.forEach(t => { if(out.length) out.push(''); t.forEach(x => out.push(x)); });
    enAttente = [];
    if(out.length) out.push('');
    l.forEach(x => out.push(x));
  });
  return out;
}
/* ✍️ v1208 — « 🔒 Pour nous seulement » : une ligne par zone remplie,
   dans la note interne (jamais envoyée à l'élève). Elles portent
   toutes « 🔒 ✍️ » : un bilan refait les remplace au lieu de les
   doubler. */
const MARQUE_NOTE_FICHE = '🔒 ✍️ ';
function lignesPourNousFiche(champsFiche, valeurs){
  const out = [];
  (champsFiche || []).forEach(c => {
    if(!c || !c.ajout || !c.pourNous || c.cacheFiche) return;
    const v = (valeurs[c.cle] == null) ? '' : String(valeurs[c.cle]).trim();
    if(!v) return;
    let t = '';
    if(c.type === 'texte' || c.type === 'court' || c.type === 'cases') t = v.split('\n').map(x => x.trim()).filter(Boolean).join(' · ');
    else if(c.type === 'ok') t = (v === '✅' || v === '❌') ? v : '';
    else if(c.type === 'ouinon') t = v === 'oui' ? '✅ Oui' : (v === 'non' ? '❌ Non' : '');
    else if(c.type === 'note3') t = /^[0-3]$/.test(v) ? v + ' /3' : '';
    else if(c.type === 'liste'){
      /* les phrases des choix pris, sinon les choix eux-mêmes */
      const pris = valeursDeLaListeFiche(v);
      const ph = choixDeLaListeFiche(c).filter(it => pris.indexOf(it.libelle) !== -1 && it.phrase).map(it => String(it.phrase).replace(/\s*\n\s*/g, ' '));
      t = (ph.length ? ph : pris).join(' · ');
    }
    if(!t) return;
    const nom = String(c.nom || '').replace(/\s+/g, ' ').trim();
    out.push(MARQUE_NOTE_FICHE + (nom ? nom + ' : ' : '') + t);
  });
  return out;
}
function poserPourNousDansLaNote(note, champsFiche, valeurs){
  const garde = String(note || '').split('\n').filter(l => l.indexOf(MARQUE_NOTE_FICHE.trim()) !== 0);
  const l = lignesPourNousFiche(champsFiche, valeurs);
  return garde.concat(l).join('\n').trim();
}

/* Un titre de la fiche et celui du bilan s'écrivent dans des alphabets
   différents (« 𝟯 - 𝗕𝗜𝗟𝗔𝗡 » en gras Unicode) : on compare leurs lettres. */
function normeTitreFiche(t){
  return String(t || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function placerAjoutsDansLeBilan(bilan, champsFiche, valeurs, donneesJson, construire){
  if(!Array.isArray(champsFiche) || !champsFiche.some(c => c && c.ajout)) return bilan;
  const lignes0 = String(bilan).split('\n');
  /* les suites de zones ajoutées, dans l'ordre de la fiche */
  const suites = [];
  let cur = null;
  champsFiche.forEach((c, i) => {
    if(c && c.ajout){ if(!cur){ cur = { debut: i, zones: [] }; suites.push(cur); } cur.zones.push(c); }
    else cur = null;
  });
  const egales = (a, b) => a.length === b.length && a.every((x, i) => String(x).replace(/\s+$/, '') === String(b[i]).replace(/\s+$/, ''));
  const lire = (d, cle) => { const p = String(cle).split('.'); let o = d; for(const k of p){ if(!o || typeof o !== 'object') return undefined; o = o[k]; } return o; };
  const memo = {};
  const placeApres = c => {
    if(memo[c.cle] !== undefined) return memo[c.cle];
    let r = -1;
    try{
      const d = JSON.parse(donneesJson);
      const v = lire(d, c.cle);
      if(v === undefined || v === null || typeof v === 'string'){
        const p = String(c.cle).split('.');
        let o = d;
        for(let i = 0; i < p.length - 1; i++){ if(!o[p[i]] || typeof o[p[i]] !== 'object') o[p[i]] = {}; o = o[p[i]]; }
        o[p[p.length - 1]] = (v || '') + MARQUE_AJOUT_FICHE;
        const l = String(construire(d)).split('\n');
        const k = l.findIndex(x => x.indexOf(MARQUE_AJOUT_FICHE) !== -1);
        if(k !== -1){
          const sans = l.map(x => x.split(MARQUE_AJOUT_FICHE).join(''));
          if(egales(sans, lignes0)) r = k + 1;
          else if(!sans[k].trim() && egales(sans.slice(0, k).concat(sans.slice(k + 1)), lignes0)) r = k;
          else if(!v && sans.length > lignes0.length){
            /* Vide, la zone ne laisse rien ; remplie, elle ajoute ses
               lignes (un titre et son texte) À UN SEUL ENDROIT, tout le
               reste à l'identique : c'est là qu'elle aurait été. */
            let j = 0;
            while(j < lignes0.length && egales([sans[j]], [lignes0[j]])) j++;
            const n = sans.length - lignes0.length;
            if(j <= k && k < j + n && egales(sans.slice(j + n), lignes0.slice(j))) r = j;
          }
        }
      }
    }catch(e){ r = -1; }
    memo[c.cle] = r;
    return r;
  };
  const poses = [];
  let plancher = 0;
  suites.forEach(su => {
    const lignes = lignesDesAjoutsFiche(su.zones, valeurs);
    if(!lignes.length) return;
    /* On remonte la fiche zone par zone, sans franchir le début de
       la partie (un titre) ni une zone qui calcule : elle écrit des
       lignes qu'on ne sait pas situer, et passer par-dessus ferait
       sortir le bloc bien plus haut qu'elle. */
    let idx = -1, essais = 0;
    for(let i = su.debut - 1; i >= 0 && idx === -1 && essais < 12; i--){
      const c = champsFiche[i];
      if(!c || c.ajout || c.type === 'sousTitre') continue;
      if(c.type === 'titre' || zoneVerrouilleeFiche(c)) break;
      if(c.type !== 'texte' && c.type !== 'court') continue;
      essais++;
      idx = placeApres(c);
    }
    /* Rien au-dessus : à la fin de SA partie, juste avant le titre de
       la suivante quand on le retrouve dans le bilan… */
    if(idx === -1){
      const t = champsFiche.slice(su.debut).find(c => c && !c.ajout && c.type === 'titre');
      const n = t ? normeTitreFiche(t.nom) : '';
      if(n.length >= 6){
        const k = lignes0.findIndex((l, i) => {
          if(i < plancher) return false;
          const x = normeTitreFiche(l);
          return x && (x === n || (x.length >= 8 && n.indexOf(x) === 0) || (n.length >= 8 && x.indexOf(n) === 0));
        });
        if(k !== -1){
          let j = k;
          while(j > plancher && !String(lignes0[j - 1]).trim()) j--;
          idx = j;
          plancher = idx;
          poses.push({ idx: idx, lignes: lignes });
          return;
        }
      }
      /* … sinon tout à la fin, sans peser sur les suivantes */
      poses.push({ idx: lignes0.length, lignes: lignes, fin: true });
      return;
    }
    /* Sous la zone, c'est sous TOUT ce qu'elle a laissé : on passe les
       lignes vides et les cases à remplir restées vides (« 👉 »,
       « 👨‍✈️ »…), pour ne pas se glisser au milieu d'une liste. */
    while(idx < lignes0.length && /^[^\p{L}\p{N}]{0,8}$/u.test(String(lignes0[idx]).trim())) idx++;
    idx = Math.max(idx, plancher);
    plancher = idx;
    poses.push({ idx: idx, lignes: lignes });
  });
  if(!poses.length) return bilan;
  /* les blocs de la fin passent après tous les autres, dans l'ordre de la fiche */
  poses.sort((a, b) => (a.idx - b.idx) || ((a.fin ? 1 : 0) - (b.fin ? 1 : 0)));
  const out = [];
  let p = 0;
  const glisser = pose => {
    if(out.length && String(out[out.length - 1]).trim()) out.push('');
    pose.lignes.forEach(x => out.push(x));
    out.push('');
  };
  for(let i = 0; i <= lignes0.length; i++){
    while(p < poses.length && poses[p].idx === i){ glisser(poses[p]); p++; }
    if(i < lignes0.length){
      /* pas deux lignes vides de suite là où on a glissé un bloc */
      if(out.length && out[out.length - 1] === '' && !String(lignes0[i]).trim() && p > 0 && poses[p - 1].idx === i) continue;
      out.push(lignes0[i]);
    }
  }
  /* posé tout au bout : pas de ligne vide de plus après lui */
  if(poses[poses.length - 1].idx === lignes0.length && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}

/* L'identifiant d'un champ. TOUS les points sont remplacés :
   replace('.','_') n'en remplaçait qu'un, et une clé préfixée en
   compte deux (« examenBlanc.examen.verifNote »). */
function idChamp(cle){
  return 'man_' + String(cle || '').split('.').join('_');
}

/* La clé du champ « niveau » en cours : elle change avec le
   préfixe, et c'est elle qui décide de ce qui s'affiche. */
let cleNiveauCourante = 'niveau';

/* champsManuels : déclaré dans ec-etat.js */
/* modeManuel : déclaré dans ec-etat.js */

/* La dictée est-elle possible sur ce navigateur ? */
function dicteePossible(){
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/* Dictée dans un champ précis, sans toucher au reste.

   Ce que ec-vocal.js avait déjà appris et qui manquait ici :
   sur Android, Chrome empile les résultats provisoires au lieu de
   les remplacer, et une instance de reconnaissance relancée relivre
   les phrases de la session précédente. Les deux ensemble
   recopiaient le texte dicté plusieurs fois de suite. */
function dicterDans(champ, bouton){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ showToast('La dictée demande Chrome sur Android.'); return; }

  /* Un second appui arrête pour de bon */
  if(bouton.dataset.actif === 'oui'){
    bouton.dataset.stop = 'oui';
    if(bouton._sr) try{ bouton._sr.stop(); }catch(e){}
    return;
  }

  /* ============================================================
     🎙️ ON ÉCRIT LÀ OÙ EST LE MONITEUR — v1142

     David, le 12 octobre : « le micro du bilan des erreurs écrit les
     phrases à la toute fin au lieu d'écrire là où est le moniteur ».
     Dans « 3 · Bilan des erreurs », il clique après « ce que je te
     PROPOSE : » d'une compétence — et sa phrase tombait sous la
     dernière.

     Le texte se coupe donc en deux au curseur : « depart » (avant) et
     « suite » (après). La dictée s'écrit entre les deux, la suite ne
     bouge pas. Un champ où l'on n'a pas cliqué a son curseur à la
     fin — c'est la règle du navigateur quand une valeur est posée
     par le code : rien ne change alors par rapport à avant.

     ⚠️ LE CURSEUR SE GARDE D'UNE DICTÉE À L'AUTRE. Réécrire « value »
     renvoie le curseur du navigateur à la fin : sans ce repère, la
     deuxième phrase dictée au même endroit serait repartie en bas.
     Un clic ou une frappe dans le champ l'efface — le moniteur a
     choisi un autre endroit.
     ============================================================ */
  if(!champ._suiviCurseur){
    champ._suiviCurseur = true;
    ['click', 'keyup', 'select', 'input'].forEach(ev =>
      champ.addEventListener(ev, e => { if(e.isTrusted) champ._posDictee = null; }));
  }
  const valeurDepart = champ.value;
  let pos = (champ._posDictee !== null && champ._posDictee !== undefined &&
             champ._valeurDictee === valeurDepart)
    ? champ._posDictee
    : (typeof champ.selectionStart === 'number' ? champ.selectionStart : valeurDepart.length);
  pos = Math.max(0, Math.min(valeurDepart.length, pos));

  /* Le texte acquis. Il se fige à la fin de chaque session : la
     boîte fait autorité, et le moniteur peut corriger entre deux
     phrases sans que la dictée suivante ramène ce qu'il a effacé. */
  let depart = valeurDepart.slice(0, pos);
  let suite = valeurDepart.slice(pos);

  /* Chaque session porte un jeton. Une instance abandonnée qui
     livre un résultat en retard n'écrit plus rien : c'est ce qui
     faisait se marcher dessus deux reconnaissances. */
  let jeton = 0;

  /* Deux fins de session vides coup sur coup, très vite : le micro
     ne répond pas. On rend la main plutôt que de relancer sans fin. */
  let vides = 0;

  const ecrire = (texteSession) => {
    const dit = terminerPhrase(texteSession);
    /* Rien d'entendu : on n'ajoute rien, pas même un blanc — sur
       Android une session vide se relance toutes les quelques
       secondes, et chacune aurait poussé une espace de plus. */
    const base = (depart && dit) ? depart + (/\s$/.test(depart) ? '' : ' ') : depart;
    /* Collé à la suite sans blanc, le mot dicté et le mot suivant ne
       feraient plus qu'un. */
    const joint = (dit && suite && !/^\s/.test(suite)) ? ' ' : '';
    champ.value = base + dit + joint + suite;
    const fin = (base + dit).length;
    champ._posDictee = fin;
    champ._valeurDictee = champ.value;
    if(!suite) champ.scrollTop = champ.scrollHeight;
    if(document.activeElement === champ){
      try{ champ.setSelectionRange(fin, fin); }catch(e){}
    }

    /* ⚠️ ET ON PRÉVIENT CE QUI ÉCOUTE LE CHAMP — v1066.

       Écrire dans « value » ne déclenche aucun événement : le
       navigateur ne signale que ce qu'un humain tape. Tout ce qui
       suit un champ à la saisie restait donc aveugle à la dictée —
       le récapitulatif des remarques d'examen, qui se réécrit à
       chaque frappe ; la case à cocher d'une phrase toute faite ;
       le bilan des éliminatoires, qui se fige dès que le moniteur y
       touche et qui ne se figeait pas quand il le DICTAIT.

       Ça ne se voyait pas tant que les micros étaient posés sur des
       champs que personne n'écoutait. Le premier micro posé sur un
       champ écouté — celui des remarques, ci-dessous — l'aurait
       révélé par un bilan qui oublie ce qu'on vient de dicter.

       Un événement qui remonte, comme une vraie frappe : les
       écouteurs ne font pas la différence, et c'est tout ce qu'on
       leur demande. */
    champ.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const arreter = () => {
    jeton++;                      /* plus rien de l'ancienne session */
    bouton.dataset.actif = '';
    bouton.dataset.stop = '';
    bouton.textContent = '🎙️';
    bouton.style.background = '';
    bouton.title = 'Dicter dans ce champ';
    bouton._sr = null;
  };

  /* Une instance NEUVE à chaque session. Rappeler start() sur une
     instance terminée fait relivrer par Chrome tout ce qui venait
     d'être dit — la cause de la recopie. */
  const nouvelleSession = () => {
    const sr = new SR();
    sr.lang = 'fr-FR';
    /* Android ignore le mode continu et se comporte mal avec :
       on relance nous-mêmes à chaque fin de session. */
    sr.continuous = !estAndroid;
    /* Les provisoires ne sont gardés que là où ils fonctionnent.
       Sur Android ils s'empilent au lieu de se remplacer. */
    sr.interimResults = !estAndroid;
    sr.maxAlternatives = 3;

    const monJeton = ++jeton;
    let session = '';
    const debut = Date.now();

    sr.onresult = ev => {
      if(monJeton !== jeton) return;      /* instance abandonnée */

      /* On reconstruit TOUT depuis l'index 0 à chaque fois, au lieu
         d'ajouter à la suite : impossible d'accumuler des doublons. */
      const bouts = [];
      for(let i = 0; i < ev.results.length; i++){
        let meilleur = ev.results[i][0].transcript;
        let score = -1;
        for(let k = 0; k < ev.results[i].length; k++){
          const s = scoreMetier(ev.results[i][k].transcript);
          if(s > score){ score = s; meilleur = ev.results[i][k].transcript; }
        }
        const t = String(meilleur || '').trim();
        if(t) bouts.push(t);
      }

      /* fusionner() ne garde que la version la plus complète de
         chaque phrase. Chrome sur Android livre « pense » / « pense
         à tes » / « pense à tes contrôles » comme trois résultats
         distincts : les mettre bout à bout écrivait la phrase trois
         fois de suite. ec-vocal.js s'en servait déjà, pas ce module —
         c'est toute la différence entre les deux dictées. */
      session = corrigerVocabulaire(fusionner(bouts));
      ecrire(session);
    };

    sr.onerror = e => {
      /* Un silence n'est pas une erreur : on relancera. */
      if(e.error === 'no-speech' || e.error === 'aborted') return;
      if(e.error === 'not-allowed' || e.error === 'service-not-allowed'){
        bouton.dataset.stop = 'oui';
        showToast('Le micro est refusé. Autorise-le dans le navigateur.');
        return;
      }
      if(e.error === 'network') return;
      showToast('Dictée : ' + e.error);
    };

    sr.onend = () => {
      if(monJeton !== jeton) return;      /* instance abandonnée */

      /* Ce qui vient d'être dit rejoint l'acquis. Les espaces de
         fin sont retirés, sinon chaque relance en ajoutait un. */
      ecrire(session);
      /* Ce qui vient d'être dit rejoint « depart » ; « suite » reste
         la suite. Sans suite, on retire les blancs de fin comme avant. */
      const fin = (typeof champ._posDictee === 'number') ? champ._posDictee : champ.value.length;
      depart = champ.value.slice(0, fin);
      if(!suite){
        depart = depart.replace(/[ \t]+$/, '');
        champ.value = depart;
      }
      champ._posDictee = depart.length;
      champ._valeurDictee = champ.value;

      if(bouton.dataset.stop === 'oui'){ arreter(); return; }

      /* Rien entendu et session expédiée : le micro ne répond pas. */
      vides = (!session && (Date.now() - debut) < 500) ? vides + 1 : 0;
      if(vides >= 20){
        showToast('Le micro ne répond plus. Appuie à nouveau sur 🎙️.');
        arreter();
        return;
      }

      try{
        bouton._sr = nouvelleSession();
      }catch(e){
        showToast('Dictée interrompue.');
        arreter();
      }
    };

    sr.start();
    return sr;
  };

  bouton.dataset.actif = 'oui';
  bouton.dataset.stop = '';
  bouton.textContent = '⏹️';
  bouton.style.background = 'var(--red)';
  bouton.title = 'Appuie pour arrêter la dictée';

  try{
    bouton._sr = nouvelleSession();
    showToast('🎙️ Dictée en cours — appuie sur ⏹️ pour arrêter');
  }catch(e){
    showToast('Dictée indisponible.');
    arreter();
  }
}


/* Une ligne du CEPC : la compétence et son niveau */
/* Une compétence : son libellé, puis les cases de notation alignées
   à droite comme sur le CEPC de l'inspecteur. Le moniteur retrouve
   le geste du document officiel plutôt qu'un menu déroulant. */
function ligneCepc(nom, valeurs, rang){
  const l = document.createElement('div');
  /* Une ligne sur deux teintée, comme sur le document */
  l.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 12px;' +
    'background:' + ((rang % 2 === 0) ? '#EDF1F5' : '#FFFFFF') + ';';

  const t = document.createElement('span');
  t.style.cssText = 'flex:1;font-size:12px;color:#1B6AC9;line-height:1.35;min-width:0;';
  t.textContent = nom;
  l.appendChild(t);

  /* La mention éliminatoire, à gauche des cases */
  const alerte = document.createElement('span');
  alerte.className = 'cepcAlerte';
  alerte.style.cssText = 'display:none;font-size:10px;font-weight:800;' +
    'color:#E5322D;flex-shrink:0;text-align:right;line-height:1.2;';
  alerte.textContent = 'Résultat éliminatoire';
  l.appendChild(alerte);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:4px;flex-shrink:0;';

  /* Le champ qui porte la valeur : les boutons ne font que l'écrire.

     ⚠️ ON PART DE TOUS LES POINTS — v911.

     David : « sur le CEPC, on part sur le même principe : on part de
     tous les points et on enlève au fur et à mesure, et à la fin le
     moniteur modifie si besoin ».

     C'est le raisonnement de l'inspecteur, et c'est aussi ce qui
     rend le ➖ honnête : sur une grille vierge, retirer un cran
     n'avait rien à amputer. Le bouton marquait l'erreur, et la note
     ne bougeait pas — la moitié du geste se perdait en silence.

     ⚠️ ET CE MAXIMUM N'APPARTIENT À PERSONNE. « parDefaut » le dit :
     c'est une note posée par la machine, que les marques peuvent
     encore corriger. Dès que le moniteur touche la ligne, elle
     devient la sienne et plus rien ne l'écrase — voir le clic
     ci-dessous et la garde de retirerPointsCepc. */
  const champ = document.createElement('input');
  champ.type = 'hidden';
  champ.className = 'cepcNiveau';
  champ.setAttribute('data-comp', nom);

  const maxLigne = valeurs.filter(v => v !== 'E')
    .map(Number).reduce((a, x) => Math.max(a, x), 0);
  champ.value = String(maxLigne);
  champ.dataset.parDefaut = 'oui';

  l.appendChild(champ);

  /* Toutes les colonnes du document, même celles qui n'existent pas
     pour cette compétence : l'alignement des cases est ce qui rend
     la grille lisible. */
  const colonnes = (valeurs.indexOf('0.5') !== -1)
    ? ['', '0', '0.5', '1', '']
    : ['E', '0', '1', '2', '3'].map(v => (valeurs.indexOf(v) !== -1 ? v : ''));

  const boutons = [];

  colonnes.forEach(val => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.cssText = 'width:34px;height:30px;padding:0;margin:0;font-size:13px;' +
      'border-radius:6px;font-family:inherit;cursor:pointer;flex-shrink:0;' +
      'transition:background .12s, color .12s;';

    if(val === ''){
      /* Colonne inexistante : grisée, comme sur le CEPC */
      b.disabled = true;
      b.style.background = '#E6EAEE';
      b.style.border = '1px solid #E6EAEE';
      b.style.cursor = 'default';
      r.appendChild(b);
      return;
    }

    b.textContent = (val === '0.5') ? '0,5' : val;
    b.setAttribute('data-val', val);
    boutons.push(b);

    const peindre = () => {
      const pris = (champ.value === val);
      const rouge = (val === 'E');
      b.style.background = pris ? (rouge ? '#E5322D' : '#1568C8') : '#FFFFFF';
      b.style.border = '1px solid ' +
        (pris ? (rouge ? '#E5322D' : '#1568C8') : '#C9D6E2');
      b.style.color = pris ? '#FFFFFF' : '#1B6AC9';
      b.style.fontWeight = pris ? '800' : '400';
    };
    b._peindre = peindre;

    b.addEventListener('click', () => {
      /* Un second appui retire la note : le moniteur peut se raviser */
      champ.value = (champ.value === val) ? '' : val;

      /* ⚠️ CETTE LIGNE EST MAINTENANT LA SIENNE — v911. « à la fin le
         moniteur modifie si besoin » : ce qu'il pose ne doit plus
         être écrasé par un ➖ ou par le retour au maximum. Les trois
         marques de provenance tombent d'un coup : en laisser une
         suffirait à ce qu'un recalcul reprenne la main. */
      champ.dataset.parDefaut = '';
      champ.dataset.parMoins = '';
      champ.dataset.parElim = '';

      boutons.forEach(x => x._peindre());
      alerte.style.display = (champ.value === 'E') ? 'block' : 'none';
      majTotalCepc();
    });

    peindre();
    r.appendChild(b);
  });

  l.appendChild(r);
  return l;
}

/* ============================================================
   EXAMEN NON MENÉ À SON TERME — v1069

   David, le 7 octobre : « l'inspecteur a mis un terme à l'examen et
   c'est l'enseignant qui a ramené le véhicule au centre d'examen,
   le CEPC est vierge sans aucune note ».

   Une seule case commande trois choses, et c'est pour ça qu'elles
   vivent ici plutôt que dans le dessin du bouton :

     · la grille se VIDE et passe en retrait — mais rien n'est
       verrouillé : « on ne verrouille rien », les cases restent
       touchables, parce qu'un examen interrompu peut avoir eu ses
       vérifications avant l'arrêt ;
     · la ligne du bas — « Total général », celle qui dit
       FAVORABLE 23 / 31 — est remplacée par la mention en rouge :
       un total calculé sur une grille vierge dirait INSUFFISANT,
       c'est-à-dire un jugement sur un examen qui n'a pas eu lieu ;
     · sur l'examen blanc seulement, le point 4 se pose sur
       « Pas le niveau ». Modifiable : c'est un point de départ,
       pas une décision.

   ⚠️ ET DÉCOCHER REND LA GRILLE TELLE QU'ELLE ÉTAIT. On garde une
   copie au moment de cocher, et on la repose. Repartir du maximum
   serait plus simple et faux : le moniteur a pu noter trois lignes
   avant que l'inspecteur n'arrête tout, et une case cochée par
   erreur lui coûterait son travail.
   ============================================================ */
let cleNonMeneCourante = 'nonMene';

function examenNonMene(){
  return String(champsManuels[cleNonMeneCourante] || '') === 'oui';
}

/* Le texte de la case du bas, quand l'examen s'est arrêté. Il
   remplace le total : voir majTotalCepc, son seul appelant. */
function mentionCepcNonMene(){
  /* v1236 — la grille peut garder ses notes (David, le 22/10) */
  const notes = Array.prototype.some.call(document.querySelectorAll('.cepcNiveau'), c => String(c.value || '') !== '');
  return '<span style="display:block;text-align:center;color:#E5322D;' +
    'font-size:17px;font-weight:800;line-height:1.3;">' +
    'EXAMEN NON MENÉ À SON TERME</span>' +
    '<span style="display:block;text-align:center;color:#8A94A0;' +
    'font-size:10.5px;font-weight:400;margin-top:5px;line-height:1.4;">' +
    (notes ? 'Les notes portées jusqu’à l’arrêt de l’examen — pas de total' : 'Grille vierge — aucune note n\'a été portée') + '</span>';
}

/* La grille en retrait, ou rendue. On ne touche QUE l'opacité :
   les boutons restent cliquables, c'est la demande. */
function grisailleDuCepc(mettre){
  const z = document.getElementById('cepcTotal');
  const cadre = z ? z.parentNode : null;
  if(!cadre) return;
  Array.prototype.forEach.call(cadre.children, (el) => {
    /* Le titre « Résultat » et la case du total gardent leur
       lisibilité : c'est là que la mention s'écrit. */
    if(el === z || el.id === 'cepcTotal') return;
    if(el.previousSibling === null) return;          /* l'en-tête */
    el.style.opacity = mettre ? '.4' : '';
  });
}

/* ⚠️ v1236 — COCHER NE VIDE PLUS LE CEPC. David, le 22/10 : « quand on
   coche examen non mené à son terme, il faut qu'on puisse quand même
   remplir le CEPC, qu'il garde ses notes et qu'on puisse le modifier ;
   ajouter un bouton sous la case, dans le même cadre : vider le CEPC et
   le griser ». La case ne fait plus que dire l'arrêt (et « pas le
   niveau » au point 4) ; le bouton, lui, vide et grise — et rend les
   notes au second appui. */
function cleCepcVide(){ return cleNonMeneCourante + 'Vide'; }
function cepcVide(){ return String(champsManuels[cleCepcVide()] || '') === 'oui'; }
function basculerNonMene(bouton){
  const avant = examenNonMene();
  const apres = !avant;
  champsManuels[cleNonMeneCourante] = apres ? 'oui' : '';

  if(apres){
    /* ⚠️ LE POINT 4, SUR L'EXAMEN BLANC SEULEMENT. L'examen officiel
       n'en a pas : le bouton n'existe pas, et on ne va pas le
       chercher. */
    const g = document.getElementById('ouinon_' + cleNiveauCourante);
    const bNon = g ? g.querySelector('[data-val="non"]') : null;
    if(bNon) bNon.click();
    /* une fiche reprise : le CEPC qu'on avait vidé reste vidé et grisé */
    const bv0 = bouton.parentNode && bouton.parentNode.querySelector('.cepcViderBouton');
    if(bv0 && cepcVide()){ peindreViderCepc(bv0, true); grisailleDuCepc(true); }
  }else if(cepcVide()){
    /* décochée : un CEPC vidé retrouve ses notes */
    const bv = bouton.parentNode && bouton.parentNode.querySelector('.cepcViderBouton');
    if(bv) basculerViderCepc(bv);
  }

  peindreNonMene(bouton, apres);
  const bv = bouton.parentNode && bouton.parentNode.querySelector('.cepcViderBouton');
  if(bv) bv.style.display = apres ? 'flex' : 'none';
  majTotalCepc();
}

/* 🧹 « Vider le CEPC et le griser », ou le rendre comme il était */
function basculerViderCepc(bouton){
  const vider = !cepcVide();
  const champs = document.querySelectorAll('.cepcNiveau');
  if(vider){
    const copie = {};
    champs.forEach((c) => {
      copie[c.getAttribute('data-comp')] = { valeur: c.value, parDefaut: c.dataset.parDefaut || '' };
      c.value = '';
      c.dataset.parDefaut = '';
      if(typeof repeindreLigneCepc === 'function') repeindreLigneCepc(c);
    });
    bouton._cepcAvant = copie;
    champsManuels[cleCepcVide()] = 'oui';
  }else{
    const copie = bouton._cepcAvant || null;
    champs.forEach((c) => {
      const d = copie ? copie[c.getAttribute('data-comp')] : null;
      if(!d) return;
      c.value = d.valeur;
      c.dataset.parDefaut = d.parDefaut;
      if(typeof repeindreLigneCepc === 'function') repeindreLigneCepc(c);
    });
    bouton._cepcAvant = null;
    delete champsManuels[cleCepcVide()];
  }
  peindreViderCepc(bouton, vider);
  grisailleDuCepc(vider);
  majTotalCepc();
  if(typeof planifierSauvegardeManuelle === 'function') planifierSauvegardeManuelle();
}
function peindreViderCepc(b, vide){
  b.textContent = vide ? '↩️ Remettre les notes du CEPC' : '🧹 Vider le CEPC et le griser';
  b.style.borderColor = vide ? 'var(--red)' : 'var(--line)';
}

/* Le bouton lui-même : coché, il est rouge et plein. */
function peindreNonMene(b, mis){
  b.style.borderColor = mis ? 'var(--red)' : 'var(--line)';
  b.style.background = mis ? 'rgba(255,92,51,.12)' : 'transparent';
  const coche = b.querySelector('.nonMeneCoche');
  const mot = b.querySelector('.nonMeneMot');
  if(coche){
    coche.style.borderColor = mis ? 'var(--red)' : 'var(--muted)';
    coche.style.color = mis ? 'var(--red)' : 'transparent';
  }
  if(mot){
    mot.style.color = mis ? 'var(--red)' : 'var(--soft)';
    mot.style.fontWeight = mis ? '800' : '700';
  }
}

function majTotalCepc(){
  const z = document.getElementById('cepcTotal');
  if(!z) return;

  /* ⚠️ LA MENTION PREND LA PLACE DU TOTAL, ET C'EST ICI QU'ELLE SE
     POSE — v1069. Une dizaine d'endroits appellent cette fonction :
     chaque appui sur une case, chaque point retiré, chaque reprise
     de brouillon. Poser la mention ailleurs, c'est la voir
     disparaître au premier de ces appels. */
  if(examenNonMene()){
    z.style.display = 'block';
    z.innerHTML = mentionCepcNonMene();
    return;
  }
  z.style.display = 'flex';

  const c = {};
  document.querySelectorAll('.cepcNiveau').forEach(s => {
    if(s.value) c[s.getAttribute('data-comp')] = s.value;
  });
  const r = calculerCepc(c);

  /* Mise en page du document : le libellé à gauche, le verdict et
     la note à droite dans sa case colorée. */
  let etat, couleur, note;
  if(r.elimine){
    etat = 'ÉLIMINATOIRE'; couleur = '#E5322D'; note = 'E';
  }else if(r.favorable){
    etat = 'FAVORABLE'; couleur = '#1568C8'; note = String(r.total).replace('.', ',');
  }else{
    etat = 'INSUFFISANT'; couleur = '#E5322D'; note = String(r.total).replace('.', ',');
  }

  z.innerHTML =
    '<span style="color:#1B6AC9;font-weight:400;font-size:12px;">Total général</span>' +
    '<span style="display:flex;align-items:center;gap:8px;">' +
      '<span style="color:' + couleur + ';font-size:11px;">' + etat + '</span>' +
      '<span style="background:' + couleur + ';color:#fff;padding:4px 10px;' +
        'border-radius:4px;font-size:12px;">' + note + '</span>' +
      (r.elimine ? '' : '<span style="color:#8A94A0;font-weight:400;font-size:10px;">/ ' +
        r.max + '</span>') +
    '</span>';
}

/* Construit le formulaire du bilan manuel */
async function ouvrirBilanManuel(){
  /* ⚠️ LE MÊME REFUS QUE LE BOUTON VERT — v1013. Celui-ci passait
     par un toast : il s'en va au bout de trois secondes, il ne dit
     pas QUEL champ manque, et il ne laisse rien derrière lui. Une
     seule porte pour les deux boutons, voir refuserLeDepart. */
  const manque = cequiManqueAuDepart();
  if(manque){ refuserLeDepart($('manuelBtn'), manque); return; }

  /* ⚠️ UNE FICHE COMMENCÉE SE REPREND, ELLE NE SE RECOMMENCE PAS —
     v1160.

     David, le 13 octobre : « avec la refonte, les moniteurs ne
     retrouvent pas les cours des bilans examen quand ils ont
     plusieurs élèves ». En le reproduisant : la carte de 📅 Mes
     prochains cours ouvrait une fiche VIDE pour un élève dont la
     partie avant examen était déjà remplie et envoyée — et la
     sauvegarde automatique, quelques secondes plus tard, REMPLAÇAIT
     la fiche de l'élève par cette fiche vide.

     Tout bouton qui ouvre la fiche d'un élève passe par ici : s'il a
     une fiche commencée du même type (moins de 48 h), c'est elle qui
     revient. La reprise elle-même repasse par ici — le drapeau évite
     qu'elle se reprenne à l'infini. */
  if(!ouvertureParReprise){
    const deja = ficheCommenceeDe($('studentName').value.trim(), $('modele').value);
    if(deja){ reprendreBrouillon(deja); return; }
  }

  /* Modifiables : l'examen officiel peut basculer d'une boîte à
     l'autre quand la question est posée au moniteur. */
  let modeleCle = $('modele').value;
  let modele = MODELES[modeleCle];

  /* Le rendez-vous post-permis a son propre écran. Le nom est déjà
     garanti par le refus ci-dessus : il ne se revérifie pas ici. */
  if(modeleCle === 'rdv-post'){
    const nom = $('studentName').value.trim();
    ouvrirRdvPost({ eleve: nom, date: $('lessonDate').value,
                    moniteur: ACCES.moniteur || '', note: '', modele: 'rdv-post' });
    return;
  }

  /* La fiche handicap se construit ligne par ligne depuis le
     document papier : elle est trop longue pour être écrite à
     la main dans le tableau des schémas. */
  const champsBase = (modele.schema === 'handicap')
    ? schemaHandicap()
    : CHAMPS_MANUELS[modele.schema];
  if(!champsBase){ showToast('Ce modèle ne se remplit pas encore à la main.'); return; }
  /* ✍️ v1206 — la forme publiée de ce modèle ; une fiche reprise
     garde la sienne (voir « LA FORME D'UNE FICHE ») */
  formeEnCours = (formeImposee !== undefined) ? formeImposee
               : (modele.schema === 'handicap' ? null : formePublieeDe(modeleCle));
  formeImposee = undefined;
  const champs = formeEnCours ? champsAvecForme(champsBase, formeEnCours) : champsAvecForme(champsBase, null);
  champsFicheOuverte = champs; ficheOuverteModele = modeleCle;

  const eleve = $('studentName').value.trim();
  const btn = $('manuelBtn');
  btn.disabled = true;
  btn.textContent = 'Préparation…';

  /* L'examen officiel n'a pas de leçon à préparer : le
     questionnaire n'apprendrait rien, et son bilan ne dépend pas
     de la boîte de vitesses. On passe directement à la fiche. */
  /* Le questionnaire ne s'ouvre plus avant le bilan : même règle
     qu'en vocal. Ce qui manque s'écrit en rouge sur le bouton
     « 📋 Compléter les infos », et le questionnaire de fin
     redemandera ce qui a bougé pendant le cours. */
  if(typeof majBoutonCompleter === 'function') majBoutonCompleter();

  /* Ce qui se remplit tout seul : frise, manœuvres déjà validées */
  let dossier = { manoeuvres: [], frise: '' };
  try{ dossier = await chargerDossierEleve(eleve); }catch(e){}

  /* Gardé pour la génération : les frises s'y comparent */
  dossierManuel = dossier;


  btn.disabled = false;
  btn.textContent = '✍️ Bilan à remplir à la main';

  champsManuels = {};
  modeManuel = true;

  /* ⚠️ LE BUREAU DOIT SAVOIR QU'UN EXAMEN EST EN COURS.

     David, un matin d'examens : « je sais que j'ai 3 cours qui se
     déroulent et je ne vois rien ». Elle avait raison, et le trou
     était là depuis le début.

     🩹 Cours non terminés ne lit que le classeur, et une fiche
     remplie à la main n'y arrivait JAMAIS : les deux signaux — le
     cours démarré et la dictée déposée — partent tous les deux du
     MICRO. Un examen officiel, un examen blanc, un rendez-vous
     post-permis n'allument pas le micro : ils n'existaient donc
     pour personne d'autre que le téléphone qui les portait.

     Même appel que le vocal, au même moment : au démarrage. Il part
     en fond, sans « await » — un examen ne doit pas attendre le
     réseau pour commencer. */
  /* Le même relâchement des verrous que le vocal : une fiche
     ouverte après un bilan enregistré doit se déposer, elle aussi.
     Voir « reinitialiserDepotBrouillon ». */
  if(typeof reinitialiserDepotBrouillon === 'function'){
    reinitialiserDepotBrouillon();
  }
  dernierDepotManuel = 0;

  if(typeof marquerCoursSignale === 'function') marquerCoursSignale();
  if(typeof signalerCoursDemarre === 'function'){
    try{
      signalerCoursDemarre(eleve,
        ($('modele').selectedOptions[0]
          ? $('modele').selectedOptions[0].textContent : modeleCle),
        $('site') ? $('site').value : '');
    }catch(e){ /* un signalement raté n'arrête pas un examen */ }
  }

  /* Sa date de permis, si elle est connue : la redemander au
     moniteur n'apprend rien de plus. */
  if(modeleCle === 'examen-blanc'){
    const s = (typeof suiviDe === 'function') ? suiviDe(eleve) : {};
    const aUneDate = !!String(s.datePermis || '').trim() ||
                     !!String((dossier && dossier.datePermis) || '').trim();
    champsManuels.aDate = aUneDate ? 'oui' : 'non';
  }

  /* La liste des inspecteurs, pour l'examen officiel */
  if(modeleCle === 'examen-officiel'){
    try{ await chargerInspecteurs(); }catch(e){}
  }

  const zone = $('manuelChamps');
  /* Le bloc « 📍 Repère ici » vit HORS de cette zone, juste
     au-dessus de « Composer le bilan » : ce vidage ne peut pas
     l'emporter, et il n'y a donc rien à mettre à l'abri. */
  zone.innerHTML = '';

  /* Chaque saisie sera gardée : une coupure ne doit plus rien
     coûter. */
  if(!zone.dataset.surveille){
    zone.dataset.surveille = 'oui';
    surveillerChampsManuels();
  }

  /* Le module d'examen blanc du RVP range ses champs à part ; sur
     un vrai examen blanc ils restent à la racine. */
  prefixeExamenBlanc = (modele.schema === 'rvp') ? 'examenBlanc.' : '';
  cleNiveauCourante = prefixeExamenBlanc + 'niveau';

  dessinerChampsManuels(champs, zone, modele, dossier);
  if(typeof majChampsSelonExamenBlanc === 'function') majChampsSelonExamenBlanc();

  /* Tant qu'aucun niveau n'est choisi, on ne demande rien qui en
     dépende. */
  if(typeof majChampsSelonNiveau === 'function') majChampsSelonNiveau();

  /* L élève part avec tous les points du CEPC : chaque erreur en
     retire. C est ainsi que l inspecteur raisonne. */
  if(modeleCle === 'examen-blanc' && typeof poserCepcAuMaximum === 'function'){
    poserCepcAuMaximum();
  }

  /* La fiche d'évaluation connaît déjà son en-tête : l'élève, le
     moniteur et la date sont à l'écran, les retaper est inutile. */
  if(modeleCle === 'handicap'){
    const poser = (cle, valeur) => {
      if(!valeur) return;
      const el = document.getElementById(idChamp(cle));
      if(el && !el.value){
        el.value = valeur;
        champsManuels[cle] = valeur;
      }
    };

    poser('handicap.conducteur', eleve);
    poser('handicap.formateur',
          (ACCES.emoji ? ACCES.emoji + ' ' : '') + (ACCES.moniteur || ''));
    poser('handicap.date',
          dateEnToutesLettres($('lessonDate').value) ||
          $('lessonDate').value || todayLocal());

    /* La problématique vient du questionnaire ou de ses notes */
    poser('handicap.problematique',
          (contexteDepart && contexteDepart.problematique) ||
          (typeof problematiqueConnue === 'function'
            ? problematiqueConnue() : ''));
  }

  /* Frise récupérée automatiquement */
  const aide = $('aideManuel');
  if(aide){
    aide.textContent = dicteePossible()
      ? "Remplis chaque rubrique. Le 🎙️ à côté d'un champ permet de dicter au lieu d'écrire."
      : "Remplis chaque rubrique en écrivant. La dictée demanderait Chrome sur Android, "
        + "mais tout le reste fonctionne normalement ici.";
  }

  const info = $('manuelInfo');
  const frise = dossier.frise || extraireFrise($('noteInterne').value);
  const versionApp = (document.querySelector('.version') || {}).textContent || '';
  info.innerHTML = '<strong>' + (eleve || '') + '</strong> · ' + modele.label +
    (versionApp ? ' · <span style="color:var(--muted);">' + versionApp + '</span>' : '') +
    (frise ? '<br>Frise reprise : ' + frise.replace(/</g,'&lt;') : '') +
    ((dossier.manoeuvres || []).length
      ? '<br>' + dossier.manoeuvres.length + ' manœuvre(s) déjà validée(s), reprises automatiquement'
      : '');

  /* Le cadre suit sur cet écran, que le questionnaire vienne
     d'être rempli ou qu'il l'ait été au démarrage du cours. */
  if(contexteDepart && typeof afficherSaisieDuJour === 'function'){
    afficherSaisieDuJour(contexteDepart, 'preparationManuel');
  }

  $('recordView').style.display = 'none';
  $('resultView').style.display = 'none';
  $('manuelView').style.display = 'block';
  /* 📋 v1211 — les procédures à joindre, juste avant « Composer » */
  if(typeof dessinerProceduresAJoindre === 'function'){
    try{ dessinerProceduresAJoindre('proceduresManuel'); }catch(e){}
  }
  if(typeof dessinerSegmentsARevoir === 'function'){
    try{ dessinerSegmentsARevoir('revoirManuel'); }catch(e){}
  }

  /* ⚠️ LE TRAJET PART AUSSI D'ICI — v986. Il ne démarrait qu'avec
     le micro : un moniteur qui remplit son bilan à la main
     conduisait pourtant, et n'avait ni bouton ni tracé.

     Ne fait rien pour qui n'a pas la section d'essai, ni sur un
     simulateur. Voir ec-trajet.js. */
  /* ⚠️ ET LE RELEVÉ SAIT POUR QUI IL TOURNE — v1067. Ce bouton est
     celui par lequel passent tous les examens d'une journée, l'un
     après l'autre, et il n'a aucun garde-fou « un cours est encore
     ouvert » : sans ce nom, le deuxième examen héritait du relevé du
     premier. Voir demarrerTrajet. */
  if(typeof demarrerTrajet === 'function' && demarrerTrajet(eleve)){
    if(typeof montrerLeTrajet === 'function') montrerLeTrajet(true);
  }

  /* 🎓 v1160 — les examens du même bloc, en haut de la fiche */
  dessinerMesExamens();

  window.scrollTo(0, 0);
}

/* Peindre un choix oui/non comme si le moniteur avait appuyé.

   Une bordure seule se remarque mal : c'est le fond plein qui
   fait qu'on voit la réponse d'un coup d'œil. */
/* Masquer ce qui ne sert pas.

   Sans le niveau, ni avec « pourrait », les heures avant permis
   et les frises n'ont pas d'objet : elles n'apparaissent nulle
   part dans le bilan. */
/* Le module d'examen blanc du rendez-vous pédagogique n'apparaît
   qu'après un « oui ». Sans réponse, il reste fermé : on ne fait
   pas remplir une grille d'examen à qui n'en passe pas. */
function majChampsSelonExamenBlanc(){
  const v = champsManuels.examenBlancFait || '';
  document.querySelectorAll('[data-si-eb]').forEach(b => {
    b.style.display = (v === b.dataset.siEb) ? '' : 'none';
  });

  /* L'examen commence : l'élève part avec tous les points, chaque
     erreur en retire. On ne le fait qu'à l'ouverture du module —
     poser la grille plus tôt ferait passer un RVP sans examen pour
     un examen blanc rempli. */
  if(v === 'oui' && typeof poserCepcAuMaximum === 'function'){
    poserCepcAuMaximum();
    if(typeof majTotalCepc === 'function') majTotalCepc();
  }
}

function majChampsSelonNiveau(){
  const n = champsManuels[cleNiveauCourante] || '';

  document.querySelectorAll('#manuelChamps [data-si-niveau]').forEach(b => {
    const requis = b.dataset.siNiveau;
    b.style.display = (n === requis) ? '' : 'none';
  });
}


function peindreOuiNon(rangee, valeur){
  const couleurs = {
    'oui': ['var(--orange)', '#0B0B0B'],
    'non': ['var(--red)', '#FFFFFF'],
    'peut': ['var(--accent-text)', '#0B0B0B'],
    '':    ['var(--muted)', '#0B0B0B']
  };

  Array.prototype.forEach.call(rangee.children, b => {
    if(b.getAttribute('data-val') !== valeur){
      b.style.background = 'var(--navy)';
      b.style.borderColor = 'var(--line)';
      b.style.color = 'var(--cream)';
      b.style.fontWeight = '400';
      b.style.transform = 'none';
      b.style.boxShadow = 'none';
      return;
    }

    const [fond, texte] = couleurs[valeur] || couleurs[''];
    b.style.background = fond;
    b.style.borderColor = fond;
    b.style.color = texte;
    b.style.fontWeight = '700';
    b.style.transform = 'scale(1.04)';
    b.style.boxShadow = '0 2px 10px rgba(0,0,0,.35)';
  });
}


/* ============================================================
   ⚠️ TOUTES LES LIGNES DE REMARQUE, D'OÙ QU'ELLES VIENNENT — v966

   Une fiche d'examen porte maintenant DEUX zones de remarques :
   les observations de l'inspecteur, et le bloc MANŒUVRE que David
   a demandé le 12 septembre — « c'est une demande moniteur de
   l'avoir en dehors de la liste des remarques ».

   Or quatre endroits comptaient les marques en cherchant
   « #obsManuel > div » : le CEPC, les points retirés, le bilan des
   erreurs et l'enregistrement. Quatre endroits à retrouver au
   prochain bloc ajouté — et celui qu'on oublie ne compte rien,
   sans rien dire à personne.

   La question « quelles sont les lignes de remarque de cette
   fiche ? » se pose donc ICI, une fois. Une zone qui porte la
   classe « zoneObs » est comptée ; c'est tout ce qu'il y a à savoir
   pour en ajouter une troisième.
   ============================================================ */
function lignesObservations(){
  const out = [];
  document.querySelectorAll('.zoneObs').forEach(z => {
    Array.prototype.forEach.call(z.children, d => out.push(d));
  });
  return out;
}

/* ============================================================
   LE MICRO D'UNE LIGNE DE REMARQUE — v1066

   ⚠️ IL REND TOUJOURS QUELQUE CHOSE, MÊME SANS DICTÉE. Un navigateur
   qui ne sait pas dicter rend un écarteur vide, de la largeur exacte
   du bouton : sans lui, les deux lignes d'une même remarque
   n'auraient pas la même longueur utile, et le champ du bas
   dépasserait celui du haut. Un « if » chez l'appelant aurait marché
   aussi — jusqu'au jour où l'on en oublie un.

   ⚠️ ET LE BOUTON EST LE MÊME QUE PARTOUT AILLEURS : même classe,
   même emoji, même « dicterDans ». Trois micros dessinés à trois
   endroits différents, c'est trois micros qui finissent par ne plus
   se ressembler.
   ============================================================ */
function microDObservation(champ, quoi){
  if(!dicteePossible()){
    const vide = document.createElement('span');
    vide.style.cssText = 'width:45px;flex-shrink:0;';
    return vide;
  }
  const mic = document.createElement('button');
  mic.type = 'button';
  mic.className = 'btn btn-secondary';
  mic.style.cssText = 'width:auto;padding:10px 13px;font-size:17px;' +
    'margin:0;flex-shrink:0;';
  mic.textContent = '🎙️';
  mic.title = 'Dicter ' + quoi;
  mic.addEventListener('click', () => dicterDans(champ, mic));
  return mic;
}

function ajouterObservationManuelle(zone, valeurs){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px;';

  /* ⚠️ LA MENTION SUIT LA LIGNE, PAS LA ZONE. David : « il faut
     mettre la mention Manœuvre devant la remarque et l'explication
     en plus, pour qu'on voie que l'erreur est survenue pendant la
     manœuvre — mais on garde bien la catégorie du CEPC ». Elle est
     posée sur la ligne au moment où on la crée : le bilan lit des
     lignes, il n'a pas à savoir de quelle zone elles viennent. */
  const mention = (valeurs && valeurs.mention) ||
                  (zone && zone.dataset ? (zone.dataset.mention || '') : '');
  if(mention) d.dataset.mention = mention;

  /* ⚠️ LA REMARQUE EST SUR UNE LIGNE, MAINTENANT — v1066.

     David, le 6 octobre : « tu peux ajouter des boutons micro au
     bout des lignes remarques de l'inspecteur et explication ou
     correction ». Le champ occupait toute la largeur ; il lui faut
     une ligne pour porter son micro à côté.

     ⚠️ ET LA MARGE A CHANGÉ DE PORTEUR : elle était sur le champ,
     elle est sur la ligne. Laissée sur le champ, elle décalerait le
     micro vers le haut d'un demi-cran — le genre de détail qu'on ne
     voit qu'une fois en voiture. */
  const ligneInsp = document.createElement('div');
  ligneInsp.style.cssText = 'display:flex;gap:6px;align-items:center;' +
    'margin-bottom:6px;';

  const insp = document.createElement('input');
  insp.type = 'text';
  insp.className = 'obsInsp';
  insp.placeholder = "Remarque de l'inspecteur";
  /* Deux fonds distincts : ce que dit l'inspecteur et ce que
     répond le moniteur ne se confondent plus d'un coup d'œil. */
  insp.style.cssText = 'flex:1;min-width:0;margin:0;' +
    'background:rgba(46,124,196,.14);border-color:rgba(46,124,196,.4);';
  /* Le récapitulatif suit ce qui s'écrit */
  /* La remarque alimente le bilan, mais seulement quand le
     moniteur a fini de taper : réécrire à chaque lettre coupait
     ses phrases en morceaux. */
  let minuteurObs = null;
  const surSaisie = () => {
    clearTimeout(minuteurObs);
    minuteurObs = setTimeout(() => {
      if(typeof majBilanEliminatoires === 'function') majBilanEliminatoires();
    }, 900);
  };
  insp.addEventListener('input', surSaisie);
  ligneInsp.appendChild(insp);
  ligneInsp.appendChild(microDObservation(insp, "la remarque de l'inspecteur"));
  d.appendChild(ligneInsp);

  /* L'explication, avec de quoi marquer une erreur éliminatoire */
  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:6px;align-items:center;';

  const rep = document.createElement('input');
  rep.type = 'text';
  rep.className = 'obsRep';
  rep.placeholder = 'Explication ou correction';
  rep.style.cssText = 'flex:1;min-width:0;margin:0;' +
    'background:rgba(255,255,255,.05);';
  /* L explication aussi : le bilan la reprend */
  rep.addEventListener('input', surSaisie);
  r.appendChild(rep);

  const bMort = document.createElement('button');
  bMort.type = 'button';
  bMort.className = 'btn btn-secondary';
  bMort.style.cssText = 'width:auto;padding:10px 13px;font-size:17px;margin:0;flex-shrink:0;';
  bMort.textContent = '☠️';
  bMort.title = 'Marquer comme erreur éliminatoire';

  /* La catégorie du CEPC, gardée sur le bloc : c'est elle qui
     décide où le E se coche et comment l'erreur se range. */
  const majMort = () => {
    const cat = d.dataset.categorie || '';
    bMort.style.borderColor = cat ? 'var(--red)' : 'var(--line)';
    bMort.style.color = cat ? 'var(--red)' : '';

    let etiq = d.querySelector('.obsCat');
    if(cat){
      if(!etiq){
        etiq = document.createElement('div');
        etiq.className = 'obsCat';
        etiq.style.cssText = 'font-size:11px;color:var(--red);margin-top:6px;';
        d.appendChild(etiq);
      }
      etiq.textContent = '☠️ ' + cat + surLaCarte(d);
    }else if(etiq){
      etiq.remove();
    }
  };

  bMort.addEventListener('click', async () => {
    /* Déjà marquée : un second appui retire la marque — et rend
       son point au trajet, il ne le supprime pas. */
    if(d.dataset.categorie){
      d.dataset.categorie = '';
      rendreSonPoint(d);
      majMortEtCepc();
      return;
    }

    /* ⚠️ LE POINT SE POSE AVANT LA FENÊTRE — v1004. Voir
       poserLePointDUneMarque dans ec-trajet.js : entre l'appui et
       la réponse, la voiture a roulé. */
    const idPoint = poserSonPoint('elim');

    const cat = await choisirCategorieCepc();
    if(!cat){ oublierSonPoint(idPoint); return; }

    d.dataset.categorie = cat;
    poserLeLienDuPoint(d, idPoint, 'elim', cat);
    majMortEtCepc();

    /* 📝 v1176 — puis la remarque, dans la ligne bleue. Fermer sans
       choisir laisse la ligne du CEPC marquée : rien n'est défait. */
    await remarqueDansLaLigne(insp, cat, '☠️');
  });

  /* Le CEPC se met à jour à chaque changement : le moniteur voit
     le E se cocher, il n'a pas à attendre la génération pour
     savoir si c'est bien enregistré. */
  const majMortEtCepc = () => {
    majMort();
    if(typeof rafraichirEliminatoires === 'function') rafraichirEliminatoires();
  };
  r.appendChild(bMort);

  /* ============================================================
     ⚠️ — UNE ERREUR À REPRENDRE, ET LE POINT EN OPTION

     David, le 10 septembre 2026 : « il faut enlever le bouton ➖ en
     bout de ligne, et à la place quand un moniteur appuie sur le
     ⚠️, après avoir choisi la catégorie, il faut une option pour
     savoir si le moniteur veut enlever un point ».

     ⚠️ TROIS BOUTONS POUR DEUX QUESTIONS.

     Le ➖ et le ⚠️ posaient LA MÊME question — sur quelle compétence
     ranger cette erreur — et se distinguaient par une seule chose :
     est-ce que ça coûte un point. Deux boutons côte à côte pour un
     seul choix, à bout de bras dans une voiture, c'est un moniteur
     qui hésite ; et rien n'empêchait d'en marquer un sans l'autre,
     donc de retirer un point sur une compétence sans que l'erreur
     soit écrite en face.

     Une seule porte, deux temps : la compétence, puis le point.

     ⚠️ ET LE POINT PART SUR LA COMPÉTENCE DU ⚠️ — pas sur une autre.
     Le ➖ avait sa catégorie à lui, indépendante : on pouvait ranger
     l'erreur sous « Appréhender la route » et retirer le point sur
     « Partager la route ». Personne ne l'a jamais voulu, et ça
     rendait le bilan illisible — la ligne perdait un point sans
     qu'aucune erreur ne l'explique.

     ⚠️ « dataset.moins » RESTE LE CHAMP QUI PORTE LE POINT. Le
     bouton disparaît, pas la donnée : les brouillons d'examens en
     cours en portent, retirerPointsCepc le lit, et l'impression
     aussi. Le renommer, c'était perdre les points déjà posés dans
     les examens de cette semaine.
     ============================================================ */
  const bGrave = document.createElement('button');
  bGrave.type = 'button';
  bGrave.className = 'btn btn-secondary';
  bGrave.style.cssText = 'width:auto;padding:10px 13px;font-size:17px;' +
    'margin:0;flex-shrink:0;';
  bGrave.textContent = '⚠️';
  bGrave.title = 'À reprendre dans le bilan des erreurs — avec ou sans point';

  const majGrave = () => {
    const cat = d.dataset.grave || '';
    /* Un point retiré se voit sur le bouton : orange quand l'erreur
       est seulement à reprendre, rouge-orangé quand elle coûte. */
    const coute = cat && d.dataset.moins === cat;
    bGrave.style.borderColor = cat
      ? (coute ? 'var(--warn-text)' : 'var(--accent-text)') : 'var(--line)';
    bGrave.style.color = cat
      ? (coute ? 'var(--warn-text)' : 'var(--accent-text)') : '';

    let etiq = d.querySelector('.obsGrave');
    if(cat){
      if(!etiq){
        etiq = document.createElement('div');
        etiq.className = 'obsGrave';
        etiq.style.cssText = 'font-size:11px;margin-top:6px;';
        d.appendChild(etiq);
      }
      etiq.style.color = coute ? 'var(--warn-text)' : 'var(--accent-text)';
      etiq.textContent = '⚠️ ' + cat + (coute ? ' · ➖ 1 point' : '') +
                        surLaCarte(d);
    }else if(etiq){
      etiq.remove();
    }
  };

  bGrave.addEventListener('click', async () => {
    /* Déjà marquée : un second appui retire la marque ET son point.
       Les séparer laisserait un point orphelin sur une compétence
       dont l'erreur a disparu. */
    if(d.dataset.grave){
      if(d.dataset.moins === d.dataset.grave) d.dataset.moins = '';
      d.dataset.grave = '';
      rendreSonPoint(d);
      majGrave();
      retirerPointsCepc();
      if(typeof majBilanEliminatoires === 'function') majBilanEliminatoires();
      return;
    }

    /* ⚠️ LE POINT SE POSE AVANT LES DEUX FENÊTRES — v1004. Celui-ci
       en ouvre DEUX : la compétence, puis le point du CEPC. C'est
       encore plus de route entre l'appui et la réponse. */
    const idPoint = poserSonPoint('attention');

    const cat = await choisirCategorieCepc(true, 'grave');
    if(!cat){ oublierSonPoint(idPoint); return; }

    /* 📝 v1176 — la remarque de cette ligne, entre la compétence et
       le point. « ✍️ Écrire directement » continue vers le point, et
       le curseur attend dans la ligne quand on revient. */
    const texteRem = await choisirRemarqueCepc(cat, '⚠️');

    /* Puis, et seulement alors, la question du point. Annuler ici
       ne pose rien : on ne marque pas une erreur à moitié parce que
       quelqu'un a hésité sur le point. */
    const point = await demanderPointCepc(cat);
    if(point === null){ oublierSonPoint(idPoint); return; }

    d.dataset.grave = cat;
    if(point) d.dataset.moins = cat;
    poserLeLienDuPoint(d, idPoint, 'attention', cat);
    majGrave();
    retirerPointsCepc();
    if(typeof majBilanEliminatoires === 'function') majBilanEliminatoires();
    /* La remarque s'écrit quand l'erreur est vraiment posée : fermer la
       question du point n'écrit rien. */
    if(texteRem === ECRIRE_DIRECTEMENT) curseurDansLaLigne(insp);
    else if(texteRem) ecrireLaRemarqueCepc(insp, texteRem);
  });
  r.appendChild(bGrave);

  /* ⚠️ LE MICRO EN DERNIER, ET DANS LES DEUX LIGNES AU MÊME ENDROIT
     — v1066. Mis avant ☠️ et ⚠️, il aurait été à hauteur du champ
     sur une ligne et au milieu des boutons sur l'autre : deux micros
     qui ne tombent pas l'un sous l'autre, dans une voiture, c'est un
     appui raté sur ☠️. */
  r.appendChild(microDObservation(rep, "l'explication"));

  /* ⚠️ LE BOUTON ➖ A ÉTÉ RETIRÉ — v909. David : « il faut enlever le
     bouton ➖ en bout de ligne ». Le point se demande maintenant
     dans le ⚠️, juste au-dessus. La DONNÉE, elle, reste :
     « dataset.moins » porte toujours le point, retirerPointsCepc le
     lit toujours, et un brouillon d'examen ouvert avant cette
     livraison garde les siens. */

  d.appendChild(r);
  zone.appendChild(d);

  /* ------------------------------------------------------------
     REPOSER UNE OBSERVATION GARDÉE

     « Si ça saute, ça disparaît, on ne le retrouve pas. » Il avait
     raison : les remarques revenaient — elles sont dans les
     champs, et la reprise les replace par leur rang — mais
     ☠️, ⚠️ et ➖ vivent sur le BLOC, dans son « dataset ». Rien ne
     les reposait, et une ligne au-delà de la vingtième n'existait
     même plus pour les recevoir.

     On les repose ici, dans la fonction qui construit la ligne :
     c'est le seul endroit d'où l'on peut rallumer les deux
     boutons, parce que ce sont ses fonctions à elle qui savent les
     peindre. Le faire ailleurs demanderait de les réécrire, et
     deux peintres finiraient par ne pas peindre pareil.
     ------------------------------------------------------------ */
  if(valeurs){
    insp.value = String(valeurs.inspecteur || '');
    rep.value = String(valeurs.reponse || '');
    d.dataset.categorie = String(valeurs.categorie || '');
    d.dataset.grave = String(valeurs.grave || '');
    d.dataset.moins = String(valeurs.moins || '');

    /* ⚠️ UN POINT ORPHELIN SE RATTACHE — v909.

       Un brouillon d'avant cette livraison peut porter un ➖ sans
       ⚠️ : le bouton qui le posait n'existe plus, et personne ne
       pourrait donc plus ni le voir ni le retirer — un point retiré
       pour toujours, sans rien à l'écran pour le dire. La marque ⚠️
       reprend sa compétence : le point reste compté, et il redevient
       effaçable d'un appui. */
    if(d.dataset.moins && !d.dataset.grave) d.dataset.grave = d.dataset.moins;

    /* ⚠️ ET LE LIEN VERS LE POINT DE LA CARTE SE REPOSE AUSSI —
       v1004. Il vit sur le BLOC, comme ☠️, ⚠️ et ➖ : oublié ici,
       une fiche reprise après un plantage garderait ses marques et
       perdrait ses points, et l'étiquette cesserait d'annoncer le
       point sans que rien ne l'explique.

       Le trajet, lui, ne survit pas à un rechargement : le rang
       rendu vaudra 0 et l'étiquette se taira toute seule, ce qui
       est exactement ce qu'on veut — elle ne désignera jamais un
       point qui n'existe plus. */
    d.dataset.point = String(valeurs.point || '');

    majMort();
    majGrave();
  }

  return d;
}

/* ------------------------------------------------------------
   REMETTRE TOUTES LES OBSERVATIONS D'UN BROUILLON

   Vingt lignes vides sont posées à l'ouverture ; un examen peut
   en compter davantage. On reconstruit donc la zone à partir de
   ce qui a été gardé, puis on complète jusqu'à vingt — jamais
   moins, sinon le moniteur repartirait sans place pour écrire.
   ------------------------------------------------------------ */
function replacerObservationsManuelles(liste, ouZone, minimum){
  const zone = document.getElementById(ouZone || 'obsManuel');
  if(!zone || !Array.isArray(liste) || !liste.length) return 0;

  zone.innerHTML = '';
  let n = 0;
  liste.forEach(o => {
    if(!o) return;
    ajouterObservationManuelle(zone, o);
    if(String(o.inspecteur || '').trim() || String(o.reponse || '').trim()) n++;
  });
  /* Le bloc Manœuvre en garde deux, les observations vingt : on
     complète jusqu'au nombre que ce bloc-là propose, jamais moins,
     sinon le moniteur repart sans place pour écrire. */
  const bas = minimum || 20;
  while(zone.children.length < bas) ajouterObservationManuelle(zone);

  /* Le CEPC et le bilan des erreurs se déduisent de ces marques :
     les reposer sans les recalculer laisserait une grille qui
     contredit les lignes juste au-dessus. */
  try{
    if(typeof retirerPointsCepc === 'function') retirerPointsCepc();
    if(typeof rafraichirEliminatoires === 'function') rafraichirEliminatoires();
    if(typeof majBilanEliminatoires === 'function') majBilanEliminatoires();
  }catch(e){ /* un repeint raté ne doit pas perdre les remarques */ }

  return n;
}


/* ============================================================
   LE CEPC, TENU À JOUR

   Le moniteur coche une éliminatoire : le E apparaît aussitôt
   sur le CEPC, et la liste des erreurs se remplit sous ses yeux.
   Attendre la génération le laisserait dans le doute.
   ============================================================ */

function rafraichirEliminatoires(){
  /* Les catégories marquées, sans doublon */
  const touchees = {};
  document.querySelectorAll('#manuelChamps [data-categorie]').forEach(d => {
    const cat = d.dataset.categorie;
    if(cat) touchees[cat] = true;
  });

  /* Sur le CEPC : un E là où il faut, retiré ailleurs.

     Seules les cases posées par une éliminatoire sont retirées :
     un E coché à la main par le moniteur lui appartient. */
  document.querySelectorAll('.cepcNiveau').forEach(champ => {
    const ligne = champ.getAttribute('data-comp');
    const vise = !!touchees[ligne];
    const pose = (champ.dataset.parElim === 'oui');

    if(vise && champ.value !== 'E'){
      champ.value = 'E';
      champ.dataset.parElim = 'oui';
    }else if(!vise && pose){
      /* ⚠️ UNE ☠️ RETIRÉE REND SES POINTS — v911. Elle laissait la
         ligne VIDE : sur une grille qui part du maximum, se raviser
         coûtait donc les points de la compétence, en silence. On
         revient au maximum, et « retirerPointsCepc » reprendra la
         main juste après si un ⚠️ l'ampute encore. */
      champ.value = String(maxCepc(ligne));
      champ.dataset.parElim = '';
      champ.dataset.parDefaut = 'oui';
      champ.dataset.parMoins = '';
    }else{
      return;                          /* rien à changer sur cette ligne */
    }

    /* Les boutons se repeignent, sinon le E reste invisible */
    const l = champ.parentNode;
    if(!l) return;
    l.querySelectorAll('button').forEach(b => {
      if(typeof b._peindre === 'function') b._peindre();
    });
    const al = l.querySelector('.cepcAlerte');
    if(al) al.style.display = (champ.value === 'E') ? 'block' : 'none';
  });

  if(typeof majTotalCepc === 'function') majTotalCepc();
  majBilanEliminatoires();
}


/* ============================================================
   LE BILAN DES ÉLIMINATOIRES, ÉCRIT EN DIRECT

   Le moniteur répond aux questions à la fin de l'examen : il lui
   faut la structure sous les yeux, pas après la génération.

   Ce qu'il a déjà écrit ne disparaît jamais — on ajoute les
   blocs manquants en tête et on laisse le reste intact. Un bloc
   devenu inutile, à lui de l'effacer.
   ============================================================ */

function majBilanEliminatoires(){
  const zone = document.getElementById(idChamp(prefixeExamenBlanc + 'bilanElim'));
  if(!zone) return;

  /* Tout ce qui est marqué, rangé par ligne du CEPC. Les trois
     boutons se retrouvent sous le même titre : c'est la
     compétence qui regroupe, pas le type de marque. */
  const par = {};
  const sansCategorie = [];

  lignesObservations().forEach(d => {
    if(!d.dataset) return;

    const i = d.querySelector('.obsInsp');
    const r = d.querySelector('.obsRep');
    const o = {
      inspecteur: i ? i.value.trim() : '',
      reponse: r ? r.value.trim() : '',
      /* L'élimination se signale sur l'erreur, pas sur le titre */
      elim: !!d.dataset.categorie,
      mention: d.dataset.mention || '',
      /* Le lien vers le point de la carte — v1006. Sans lui, ce
         cadre-ci n'afficherait pas le renvoi que le bilan généré
         affichera : deux textes pour la même erreur. */
      point: d.dataset.point || ''
    };
    if(!o.inspecteur && !o.reponse) return;

    const cat = d.dataset.categorie || d.dataset.moins || d.dataset.grave || '';

    if(cat) (par[cat] = par[cat] || []).push(o);
    else sansCategorie.push(o);
  });

  const noms = Object.keys(par);
  if(!noms.length && !sansCategorie.length){
    /* Plus rien de marqué : on ne laisse pas de blocs orphelins,
       sauf si le moniteur y a déjà répondu. */
    if(!zone.value.trim() || zone.dataset.intact === 'oui'){
      zone.value = '';
      champsManuels[prefixeExamenBlanc + 'bilanElim'] = '';
    }
    return;
  }

  /* L'ordre du CEPC, celui que suit l'inspecteur */
  const ordre = (typeof toutesCategoriesCepc === 'function')
    ? toutesCategoriesCepc().filter(n => par[n]) : noms;

  const bouts = [];

  /* ------------------------------------------------------------
     LES TROIS QUESTIONS NE SE POSENT QU'UNE FOIS PAR COMPÉTENCE

     Elles suivaient chaque remarque : trois erreurs de commandes
     donnaient trois fois « qu'en penses-tu ? », et l'élève
     répondait trois fois à la même question. On regroupe les
     remarques de la compétence, et on demande une seule fois.

     LE MÊME TEXTE EST ÉCRIT DANS ec-modeles.js, pour le bilan
     généré quand ce cadre est resté vide. Les deux doivent dire
     la même chose — test-bilan-eliminatoires.js le vérifie.
     ------------------------------------------------------------ */
  const QUESTIONS = ["- qu'en penses-tu ?",
                     '- quelles sont TES solutions ?',
                     '- ce que je te PROPOSE : '];

  /* Une remarque : ce que l'inspecteur a dit, ce que le moniteur
     a expliqué. Sans les questions — elles viennent après le
     groupe. */
  const ecrire = o => {
    const m = mentionObs(o);
    /* ⚠️ LE MÊME RENVOI QUE DANS LES DEUX BILANS — v1006, et il
       sort du même endroit : ce cadre-ci doit dire exactement ce
       que dira le bilan généré. */
    const pt = (typeof mentionDuPoint === 'function' ? mentionDuPoint(o) : '');
    if(o.inspecteur){
      bouts.push('👨‍✈️ ' + m + o.inspecteur +
                 (o.elim ? ' ☠️ Erreur éliminatoire' : '') + pt);
    }else if(o.elim){
      bouts.push('☠️ ' + m + 'Erreur éliminatoire' + pt);
    }
    /* Même règle que dans les deux bilans : le renvoi se pose une
       seule fois, et jamais sur une ligne à lui tout seul. */
    const posee = o.inspecteur || o.elim;
    if(o.reponse){
      bouts.push(emojiMoniteur() + ' ' + m + o.reponse + (posee ? '' : pt));
    }else if(!posee && pt){
      bouts.push(emojiMoniteur() + ' ' + m + 'à revoir' + pt);
    }
  };

  /* Un groupe : ses remarques les unes sous les autres, puis les
     trois questions, une seule fois. */
  const ecrireGroupe = liste => {
    liste.forEach(ecrire);
    bouts.push('');
    QUESTIONS.forEach(q => bouts.push(q));
    bouts.push('');
  };

  ordre.forEach(cat => {
    bouts.push('👉 ' + grasUnicode(cat));
    bouts.push('');
    ecrireGroupe(par[cat]);
  });

  /* Les remarques sans compétence : un seul bloc de questions
     pour tout le groupe, comme une compétence. */
  if(sansCategorie.length) ecrireGroupe(sansCategorie);

  const propose = bouts.join('\n').trim();

  /* Tant que le moniteur n'a pas écrit dans le champ, on le
     réécrit entièrement : c'est ce qui évite les blocs coupés en
     morceaux à mesure qu'il tape ses remarques.

     Dès qu'il y touche, on n'y revient plus. */
  const intact = (zone.dataset.intact !== 'non');

  if(intact){
    zone.value = propose;
    zone.dataset.intact = 'oui';
    zone.dataset.propose = propose;
  }else{
    /* Il a répondu : on ajoute seulement les compétences absentes */
    const manquantes = ordre.filter(n =>
      zone.value.indexOf(grasUnicode(n)) === -1 &&
      zone.value.indexOf(n) === -1);
    if(!manquantes.length) return;

    const sup = [];
    manquantes.forEach(cat => {
      sup.push('👉 ' + grasUnicode(cat));
      sup.push('');
      const avant = bouts.length;
      bouts.length = 0;
      ecrireGroupe(par[cat]);
      sup.push.apply(sup, bouts);
      bouts.length = avant;
    });

    zone.value = (sup.join('\n') + '\n' + zone.value).trim();
  }

  champsManuels[prefixeExamenBlanc + 'bilanElim'] = zone.value;

  /* ⚠️ ON SAUVE TOUT DE SUITE, ET SOUS SON VRAI NOM — v1103.

     Ces deux lignes appelaient « sauvegarderBrouillonManuel », une
     fonction qui n'a jamais été écrite nulle part. Le garde-fou
     « if(typeof … === 'function') » ne levait rien : le bilan des
     éliminatoires que l'outil vient de composer tout seul attendait
     simplement la sauvegarde suivante — au plus une seconde après
     une frappe, et jamais du tout si le moniteur ne touchait plus
     à rien. Un onglet fermé entre-temps l'emportait.

     Un nom de plus pour une chose qui en avait déjà un, c'est la
     faute de ce dossier depuis le début. On appelle donc la VRAIE
     porte, « sauvegarderManuel », et il n'y a plus de synonyme à
     tenir à jour. */
  sauvegarderManuel();
}


/* Le moniteur a écrit dans le champ : on cesse de le réécrire */
function figerBilanEliminatoires(){
  const zone = document.getElementById(idChamp(prefixeExamenBlanc + 'bilanElim'));
  if(!zone) return;

  /* Ce que l'application a proposé ne compte pas comme une
     saisie : seul un texte différent en est une. */
  if(zone.value !== (zone.dataset.propose || '')){
    zone.dataset.intact = 'non';
  }
}


/* Combien de leçons l'élève a réellement faites.

   Compter les bilans ne suffit pas : un élève arrivé en cours de
   route n'en a qu'un ou deux dans l'outil alors qu'il en est à sa
   huitième leçon. Le numéro écrit dans son dernier bilan dit la
   vérité. */
function leconsFaites(){
  const d = dossierManuel || {};

  const n = parseInt(d.leconNum, 10);
  if(!isNaN(n) && n > 0) return n;

  /* ⚠️ PAR LA PORTE COMMUNE — v1100. Le motif était écrit ici, en
     clair, et c'était le quatrième. Il ne connaissait pas « au
     total » (sur « 2ÈME LEÇON APRÈS LE POST-PERMIS (24ÈME AU
     TOTAL) » il rendait 2) et il acceptait le pluriel (« 5 leçons
     de 2h » dans une frise lui faisait dire 5). Voir
     rangDansLaNote : la règle y vit, et tout le monde l'appelle. */
  const t = ($('noteInterne') && $('noteInterne').value) || '';
  const v = (typeof rangDansLaNote === 'function') ? rangDansLaNote(t) : null;
  if(v > 0) return v;

  const c = Number(d.lecons);
  return c > 0 ? c : null;
}


/* ============================================================
   LES FRISES, DÉDUITES

   La frise dit combien de leçons étaient prévues avant et après
   l'examen blanc. Comparer avec ce qui a été fait évite au
   moniteur de le faire de tête.
   ============================================================ */

function remplirFrises(champs, surEcran){
  const frise = (dossierManuel && dossierManuel.frise) ||
                extraireFrise($('noteInterne').value);
  if(!frise) return;

  /* Ce que le calcul a posé lui-même, par opposition à ce que le
     moniteur a saisi : le premier se recalcule, le second est
     sacré. */
  if(!champs.__frisesAuto) champs.__frisesAuto = {};

  const poser = (cle, valeur) => {
    if(champs[cle] === valeur) return;

    champs[cle] = valeur;
    champs.__frisesAuto[cle] = valeur;
    if(!surEcran) return;

    const zone = document.getElementById(idChamp(cle));
    if(zone){ zone.value = valeur; return; }

    const r = document.getElementById('ouinon_' + cle);
    if(!r) return;
    peindreOuiNon(r, valeur);
  };

  /* On recalcule tant que le moniteur n'a pas corrigé lui-même */
  const aMoi = cle => !champs[cle] ||
                      champs.__frisesAuto[cle] === champs[cle];

  /* Avant l'examen blanc : ce que la frise prévoyait, contre ce
     que l'élève a réellement fait. */
  const prevues = leconsAvantExamenBlanc(frise);
  const faites = leconsFaites();

  if(prevues !== null && faites !== null && aMoi('friseAvant')){
    if(faites <= prevues){
      poser('friseAvant', 'oui');
    }else{
      poser('friseAvant', 'non');
      if(aMoi('friseAvantH')){
        poser('friseAvantH', String((faites - prevues) * 2));
      }
    }
  }

  /* Après l'examen blanc : ce que la frise prévoyait, contre les
     heures que le moniteur vient d'annoncer. */
  const apres = leconsApresExamenBlanc(frise);
  const annoncees = Number(String(champs.heuresAvant || '').trim());

  if(apres !== null && annoncees && aMoi('frisePost')){
    /* Les 3h avant examen sont dans les deux comptes : elles
       s'annulent. « 4 + 3 » se compare donc à 4h de leçons. */
    const prevuH = heuresPourLecons(apres);

    if(annoncees <= prevuH){
      poser('frisePost', 'oui');
      if(aMoi('frisePostH') && champs.frisePostH) poser('frisePostH', '');
    }else{
      poser('frisePost', 'non');
      if(aMoi('frisePostH')){
        poser('frisePostH', String(annoncees - prevuH));
      }
    }
  }
}


/* ============================================================
   LES HEURES QUI REMONTENT AU BUREAU

   Le moniteur décide, à l'examen blanc, combien d'heures il faut
   encore. Le bureau en a besoin pour placer les dates : sans ce
   report, il fallait le lui redemander.
   ============================================================ */

/* ⚠️ LE QUATRIÈME ARGUMENT N'EST PAS UN DÉTAIL — v879.

   « estExamenBlanc » dit si le cours qu'on vient de terminer ÉTAIT
   l'examen blanc. Sans lui, cette fonction écrivait « ebNiveau » et
   surtout « ebDate = la date du jour » à la fin de N'IMPORTE QUEL
   cours — la colonne s'appelle « date de l'examen blanc », et elle
   recevait la date d'une leçon ordinaire.

   David, le 5 septembre : « ça considère tous les précédents
   cours comme un examen blanc, ça m'a foutu une merde sans nom ».
   Une 2ème leçon portait « EXAMEN BLANC PASSÉ le samedi 29 août »,
   une AAC sans examen blanc en portait un aussi.

   Les heures avant permis, elles, remontent depuis n'importe quel
   cours : c'est le sens même de la question posée au moniteur. Ce
   sont les DEUX AUTRES colonnes qui ne devaient jamais partir de
   là.

   L'appelant le sait ; cette fonction, non. On le lui dit plutôt
   que de lui faire relire « $('modele') » — une fonction qui va
   chercher son contexte sur l'écran d'à côté finit toujours par
   répondre à la mauvaise question. */
/* Le repère du jour : le compteur de la note qu'on vient
   d'écrire, lu avec la règle commune. À défaut de note lisible, on
   retombe sur le dernier état connu de l'élève — mieux vaut le rang
   de sa dernière leçon que pas de repère du tout, qui ferait fondre
   la réserve de toutes les leçons déjà faites. */
function repereDuJour(eleve, note){
  const a = (typeof analyserNote === 'function' && note)
    ? analyserNote(note) : null;
  const c = a && a.apresCharniere;
  if(c && c.rang > 0) return { rang: c.rang, quoi: c.quoi };

  return (typeof charniereDeLEleve === 'function')
    ? charniereDeLEleve(eleve) : null;
}


async function remonterHeuresAuBureau(eleve, heures, niveau, estExamenBlanc,
                                      duJour, note, departChoisi, rangAffiche){
  if(!eleve) return;

  const h = String(heures || '').trim();

  /* ⚠️ ZÉRO N'EST PAS VIDE — corrigé en v1041.

     Cette ligne écartait « 0 » comme si c'était une case laissée
     blanche : un moniteur qui concluait « plus que la leçon de
     veille » — c'est-à-dire « elle est prête » — faisait EFFACER la
     réserve, et le bureau relisait « heures à préciser » sur une
     élève dont on venait de dire qu'elle était prête.

     La règle était pourtant déjà écrite en toutes lettres à trois
     mètres d'ici, dans ec-permis-listes : « Zéro n'est pas vide :
     "plus que les 3h" est une réponse, et c'est la plus utile des
     deux. » Elle était appliquée à la LECTURE et pas à l'ÉCRITURE.

     Pas le niveau, en revanche, efface bien : un nombre d'heures
     n'a alors plus de sens. */

  /* ============================================================
     ⚠️ ET VIDE VEUT DIRE « JE N'AI RIEN DIT » — v1048

     David, le 19 septembre : « quand je rappuie sur le crayon pour
     modifier, ça s'enlève, heures restantes ».

     C'est ici. Un bilan enregistré alors que la case des heures
     n'a pas été touchée — parce que le bloc était caché, ou parce
     que le moniteur n'avait rien à en dire — arrivait avec « h »
     vide, et la ligne du dessous écrivait une réserve VIDE.
     Autrement dit : chaque cours ordinaire pouvait effacer les
     heures prescrites à l'examen blanc ou au rendez-vous
     post-permis. Ambre avait 6 + 3 au post-permis ; il n'en restait
     plus trace.

     La v1041 avait pourtant écrit la règle trois lignes plus haut :
     « zéro n'est pas vide ». Elle l'avait appliquée à « 0 » et pas
     à « rien ». Ce sont les deux faces de la même chose — une
     réponse qu'on n'a pas donnée ne vaut pas zéro, et elle
     n'autorise surtout pas à effacer celle d'avant.
     ============================================================ */
  if(!h) return;                               /* rien n'a été dit */

  const valeur = (niveau === 'oui') ? h : '';

  if(niveau !== 'oui' && !valeur) return;      /* rien à dire */

  /* ------------------------------------------------------------
     ET SI ÇA NE PASSE PAS, ON LE DIT.

     L'appel n'était ni attendu ni vérifié : un « catch » vide,
     et les heures que le moniteur venait de décider partaient
     dans le vide. Le bureau donnait ensuite une date d'examen
     sans elles, sans savoir qu'il lui en manquait.

     Le bilan prime toujours — on ne bloque pas l'enregistrement
     pour ça — mais un travail perdu doit au moins se voir.
     ------------------------------------------------------------ */
  try{
    if(typeof majSuivi === 'function'){
      /* ⚠️ LE NOMBRE PASSE PAR SA PORTE — v908. C'est ICI qu'un
         moniteur dit « il lui faut encore 4h avant l'examen » au
         milieu d'un cours ordinaire : le cas exact que David
         décrivait comme tombant aux oubliettes. La porte note qui
         l'a dit et quand, pour que l'alerte ⏱️ puisse le nommer. */
      /* ⚠️ DES HEURES DITES AUJOURD'HUI DATENT D'AUJOURD'HUI — v972.

         Prescrites À l'examen blanc, elles datent de lui, et le
         repère reste vide : c'est le cas normal, celui d'avant.
         Dites au cours d'une leçon ordinaire — la case ⏱️ du bloc
         « date à prévoir » — elles datent de CETTE leçon, et le
         repère est son rang.

         Et ce rang se lit dans LA NOTE QU'ON VIENT D'ÉCRIRE, avec
         la même règle que partout ailleurs : « 6ᵉ leçon après le
         dernier ajournement » y est déjà, en toutes lettres. Le
         calculer autrement — le dernier rang connu, plus un —
         serait une seconde arithmétique, fausse le jour où deux
         cours tombent dans la même journée. */
      const repere = (!estExamenBlanc && duJour)
        ? repereDuJour(eleve, note) : null;

      /* ⚠️ v1129 — LA LEÇON CHOISIE DANS « CES HEURES PARTENT DE
         QUAND ? ». Elle fixe le repère ; le nombre écrit est la
         décision, retrouvée depuis le reste que montrait le bouton
         (nombreDecidePourLeDepart, ec-questionnaire) — la même
         porte que pour une préparation. */
      const choisi = (!estExamenBlanc && typeof departChoisi === 'number' &&
                      !isNaN(departChoisi) &&
                      typeof nombreDecidePourLeDepart === 'function');
      let majs;
      if(choisi && typeof champsHeuresRestantes === 'function'){
        const rj = repereDuJour(eleve, note) ||
          ((typeof charniereDeLEleve === 'function') ? charniereDeLEleve(eleve) : null);
        const quoi = (rj && rj.quoi) || 'eb';
        majs = champsHeuresRestantes(eleve,
          nombreDecidePourLeDepart(eleve, valeur, departChoisi,
            /* le rang sur lequel le bouton a compté, s'il l'a dit */
            (typeof rangAffiche === 'number') ? rangAffiche : ((rj && rj.rang) || 0)),
          null, departChoisi, quoi);
      }else{
        majs = (typeof champsHeuresRestantes !== 'function')
          ? { heuresRestantes: valeur }
          : (repere
              ? champsHeuresRestantes(eleve, valeur, null,
                                      repere.rang, repere.quoi)
              : champsHeuresRestantes(eleve, valeur));
      }

      /* LA DATE N'APPARTIENT QU'À L'EXAMEN BLANC.

         « ebDate » veut dire « le jour où l'examen blanc a été
         fait ». La date d'une leçon ordinaire n'a rien à y faire :
         c'est elle qui a fait écrire « EXAMEN BLANC PASSÉ le
         samedi 29 août » sur une 2ème leçon. */
      if(estExamenBlanc){
        majs.ebNiveau = niveau === 'oui' ? 'oui'
                      : niveau === 'peut' ? 'peut'
                      : niveau === 'non' ? 'non' : '';
        majs.ebDate = ($('lessonDate') && $('lessonDate').value) || '';
      }
      /* Et rien d'autre depuis un cours ordinaire. « Pas le
         niveau » conclu hors examen blanc n'a pas besoin de
         passer par ici : la note le porte, et c'est elle que le
         bureau relit pour remplir la colonne (ec-permis-listes). */

      await majSuivi(eleve, majs);
    }
  }catch(e){
    if(typeof showToast === 'function'){
      showToast('⚠️ Les heures avant permis de ' + eleve + " n'ont pas " +
                'atteint le bureau. Note-les-lui.');
    }
    if(typeof signalerIncident === 'function'){
      signalerIncident('heures avant permis non remontées',
                       'Bilan manuel', String((e && e.message) || e));
    }
  }
}


/* ============================================================
   LE CEPC PARTI DE LA NOTE MAXIMALE

   L'élève a tous les points au départ : chaque erreur en retire.
   C'est ainsi que l'inspecteur raisonne, et cela évite au
   moniteur de tout cocher pour un examen réussi.
   ============================================================ */

function poserCepcAuMaximum(){
  if(typeof CEPC_BLOCS === 'undefined') return;

  CEPC_BLOCS.forEach(b => b.items.forEach(it => {
    const max = (it.valeurs || []).filter(v => v !== 'E')
      .map(Number).reduce((a, x) => Math.max(a, x), 0);

    const champ = document.querySelector('.cepcNiveau[data-comp="' +
                                         it.nom.replace(/"/g, '') + '"]');
    if(!champ || champ.value) return;      /* déjà noté : on n'y touche pas */

    champ.value = String(max);
    champ.dataset.parDefaut = 'oui';

    const l = champ.parentNode;
    if(l){
      l.querySelectorAll('button').forEach(x => {
        if(typeof x._peindre === 'function') x._peindre();
      });
    }
  }));

  if(typeof majTotalCepc === 'function') majTotalCepc();
}


/* La note maximale d'une ligne du CEPC */
function maxCepc(nom){
  if(typeof CEPC_BLOCS === 'undefined') return 0;
  let m = 0;
  CEPC_BLOCS.forEach(b => b.items.forEach(it => {
    if(it.nom !== nom) return;
    m = (it.valeurs || []).filter(v => v !== 'E')
      .map(Number).reduce((a, x) => Math.max(a, x), 0);
  }));
  return m;
}


/* Toutes les lignes du CEPC, pour le bouton ➖ */
function toutesCategoriesCepc(){
  const out = [];
  if(typeof CEPC_BLOCS === 'undefined') return out;
  CEPC_BLOCS.forEach(b => b.items.forEach(it => out.push(it.nom)));
  return out;
}


/* Retirer les points, catégorie par catégorie.

   Une catégorie touchée trois fois perd trois points — mais ne
   descend jamais sous zéro, et n'atteint jamais E : seule la
   tête de mort élimine. */
function retirerPointsCepc(){
  /* ➖ v1240 — les points « après la manœuvre » se rendent avant le
     recalcul, et se retirent après : un ⚠️ posé ailleurs ne les efface plus */
  if(typeof rendreMoinsCepc === 'function') rendreMoinsCepc();
  const perdus = {};

  lignesObservations().forEach(d => {
    const cat = d.dataset ? (d.dataset.moins || '') : '';
    if(!cat) return;
    perdus[cat] = (perdus[cat] || 0) + 1;
  });

  /* ⚠️ LE BOUTON ➖ 0,5 D'AUTONOMIE COMPTE ICI, PAS AILLEURS — v966.

     Il aurait été plus court de lui faire écrire la note dans la
     ligne « Conduite autonome ». Ç'aurait été faux : cette
     fonction RECALCULE chaque ligne à partir des marques, et elle
     tourne à chaque ⚠️ posé n'importe où sur la fiche. Le premier
     ⚠️ venu aurait effacé le demi-point, sans que rien ne le dise.

     Le bouton pose donc des CRANS, comme une marque, et c'est le
     même calcul qui les applique. Les deux chemins — ce bouton et
     un ⚠️ rangé sous « Conduite autonome » — s'additionnent, parce
     que ce sont bien deux choses différentes : une erreur précise
     qui a coûté, et l'autonomie du trajet dans son ensemble. */
  const zAuto = document.querySelector('.zoneAutonomie');
  if(zAuto && zAuto.dataset.ligne){
    const crans = Number(zAuto.dataset.moins || 0);
    if(crans > 0){
      perdus[zAuto.dataset.ligne] = (perdus[zAuto.dataset.ligne] || 0) + crans;
    }
  }

  toutesCategoriesCepc().forEach(nom => {
    const champ = document.querySelector('.cepcNiveau[data-comp="' +
                                         nom.replace(/"/g, '') + '"]');
    if(!champ) return;

    /* Un E posé par une éliminatoire prime sur tout */
    if(champ.value === 'E' && champ.dataset.parElim === 'oui') return;

    /* Jamais notée : la ligne part du maximum, comme le raisonne
       l'inspecteur. Sans cela le ➖ ne trouvait aucune ligne à
       amputer sur une grille vierge — et ne faisait rien du tout,
       en silence. Le CEPC n'était pré-rempli que sur l'examen
       blanc ; il apparaît maintenant ailleurs. */
    if(!champ.value && !champ.dataset.parDefaut && !champ.dataset.parMoins){
      champ.dataset.parDefaut = 'oui';
    }

    /* Une note saisie à la main par le moniteur lui appartient */
    if(champ.dataset.parDefaut !== 'oui' &&
       champ.dataset.parMoins !== 'oui') return;

    const max = maxCepc(nom);
    const n = perdus[nom] || 0;
    if(!n){
      /* Plus d'erreur : la note revient au maximum */
      if(champ.dataset.parMoins === 'oui'){
        champ.value = String(max);
        champ.dataset.parMoins = '';
        champ.dataset.parDefaut = 'oui';
        repeindreLigneCepc(champ);
      }
      return;
    }

    /* Les demi-points existent : on retire un cran, pas un point */
    const echelle = valeursCepc(nom);
    const i = echelle.indexOf(String(max));
    const cible = echelle[Math.max(0, i - n)];

    champ.value = cible;
    champ.dataset.parMoins = 'oui';
    champ.dataset.parDefaut = '';
    repeindreLigneCepc(champ);
  });

  if(typeof appliquerMoinsCepc === 'function') appliquerMoinsCepc();
  if(typeof majTotalCepc === 'function') majTotalCepc();
}


/* L'échelle d'une ligne, de la plus basse à la plus haute */
function valeursCepc(nom){
  let out = [];
  if(typeof CEPC_BLOCS === 'undefined') return out;
  CEPC_BLOCS.forEach(b => b.items.forEach(it => {
    if(it.nom !== nom) return;
    out = (it.valeurs || []).filter(v => v !== 'E');
  }));
  return out;
}


function repeindreLigneCepc(champ){
  const l = champ.parentNode;
  if(!l) return;
  l.querySelectorAll('button').forEach(b => {
    if(typeof b._peindre === 'function') b._peindre();
  });
  const al = l.querySelector('.cepcAlerte');
  if(al) al.style.display = (champ.value === 'E') ? 'block' : 'none';
}


/* ============================================================
   LES NOTES REPORTÉES SUR LE CEPC

   L'installation vaut 2 : passager et voyants comptent un point
   chacun. Les vérifications valent 3, notées directement.

   Le moniteur voit la note se poser pendant qu'il coche, et
   peut la corriger.
   ============================================================ */

function reporterNotesCepc(){
  const champ = c => champsManuels[prefixeExamenBlanc + c];

  /* L'installation : les TROIS cases comptent ensemble depuis la
     v966 — le nombre de ✅ moins un. La règle elle-même vit dans
     noteInstallationSurDeux (ec-modeles.js), avec le « Note : /2 »
     imprimé : deux calculs pour une même note finiraient par ne
     plus donner le même chiffre, et c'est la grille qu'on aurait
     crue.

     ⚠️ ET LES DEUX ÉCRANS N'APPELLENT PAS LEURS CASES PAREIL —
     v912. L'examen blanc les nomme « instInstallation » /
     « instPassager » / « instVoyants », l'examen officiel
     « installation » / « passager » / « voyants ». Une seule des
     deux familles existe à la fois, donc on lit celle qui est là.

     ⚠️ ET « examen.installation » N'EST PAS UNE CASE PARTOUT. Sur
     l'examen officiel c'est la case Installation ; sur l'examen
     blanc, c'est la REMARQUE — trois lignes de texte libre. Prendre
     l'une pour l'autre ferait apparaître une note sur une fiche où
     aucune case n'est cochée, simplement parce que le moniteur a
     écrit une phrase.

     On ne devine donc pas d'après le nom : une case ne vaut que ✅
     ou ❌, et ce qui n'est ni l'un ni l'autre n'est pas une case. */
  const uneCase = x => (x === '✅' || x === '❌') ? x : '';
  const lire = (a, b) => uneCase(champ(a)) || uneCase(champ(b));

  const i = lire('examen.instInstallation', 'examen.installation');
  const p = lire('examen.instPassager',     'examen.passager');
  const v = lire('examen.instVoyants',      'examen.voyants');

  /* ➖ v1238 — on rend d'abord ce que les cases « enlève des points »
     avaient retiré : la note se recalcule, puis on les retire à neuf */
  rendreMoinsCepc();
  const nInst = (typeof noteInstallationSurDeux === 'function')
    ? noteInstallationSurDeux(i, p, v) : '';
  if(nInst !== ''){
    poserNoteCepc("Savoir s'installer et assurer la sécurité à bord", nInst);
  }

  /* ⚠️ LES VÉRIFICATIONS SE COMPTENT TOUTES SEULES SUR L'EXAMEN
     OFFICIEL — v912.

     David : « le décompte des points sur les vérifications ne se
     fait pas tout seul en fonction des 3 boutons vérifications,
     sécurité routière et premiers secours ».

     L'examen blanc a une case « Note des vérifications » où le
     moniteur écrit directement son /3. L'examen officiel, lui, a
     TROIS ✅/❌ — un par question — et personne ne les additionnait :
     la ligne du CEPC restait à son maximum, et le total annonçait
     trois points que l'élève n'avait pas eus.

     Un ✅ vaut un point, comme au barème. On ne compte que si au
     moins une des trois est répondue : trois cases vierges ne
     veulent pas dire zéro, elles veulent dire « pas encore ». */
  const trois = ['examen.vi', 'examen.qser', 'examen.secours'].map(c => champ(c) || '');
  if(trois.some(x => x)){
    poserNoteCepc('Effectuer des vérifications du véhicule',
                  String(trois.filter(x => x === '✅').length));
  }

  /* Les vérifications de l'examen blanc : la note du moniteur,
     telle quelle. Elle passe après, et gagne : c'est un chiffre
     qu'il a écrit, pas un compte déduit. */
  const nv = champ('examen.verifNote');
  if(nv !== undefined && nv !== ''){
    poserNoteCepc('Effectuer des vérifications du véhicule', String(nv));
  }
  appliquerMoinsCepc();
}

/* ➖ v1238 — LES CASES QUI ENLÈVENT DES POINTS AU CEPC. David, le 22/10 :
   passager et voyants revus après la manœuvre, « ça doit enlever des
   points sur le CEPC même si c'était bon avant ». Chaque ❌ retire ses
   points sur sa ligne (sans descendre sous 0). Ce qui a été retiré se
   garde sur la case du CEPC, pour être rendu avant tout recalcul — et
   seulement si la note n'a pas été changée à la main entre-temps. */
function zonesMoinsCepc(){
  return ((typeof champsDessinesCourants !== 'undefined' && champsDessinesCourants) || [])
    .filter(c => c && c.cepcMoins && c.cepcMoins.ligne);
}
function caseCepcDe(ligne){
  return document.querySelector('.cepcNiveau[data-comp="' + String(ligne).replace(/"/g, '') + '"]');
}
function rendreMoinsCepc(){
  document.querySelectorAll('.cepcNiveau[data-moins]').forEach(c => {
    const moins = Number(c.dataset.moins || 0);
    if(moins && c.value === c.dataset.apresMoins){
      const v = Number(String(c.value).replace(',', '.')) + moins;
      c.value = String(v);
      if(c.parentNode) c.parentNode.querySelectorAll('button').forEach(b => { if(typeof b._peindre === 'function') b._peindre(); });
    }
    delete c.dataset.moins; delete c.dataset.apresMoins;
  });
}
function appliquerMoinsCepc(){
  const parLigne = {};
  zonesMoinsCepc().forEach(c => {
    if(champsManuels[c.cle] !== '❌') return;
    parLigne[c.cepcMoins.ligne] = (parLigne[c.cepcMoins.ligne] || 0) + (Number(c.cepcMoins.points) || 1);
  });
  Object.keys(parLigne).forEach(l => {
    const c = caseCepcDe(l);
    if(!c || c.value === '' || c.value === 'E') return;
    const avant = Number(String(c.value).replace(',', '.'));
    if(isNaN(avant)) return;
    const apres = Math.max(0, avant - parLigne[l]);
    if(apres === avant) return;
    poserNoteCepc(l, String(apres));
    c.dataset.moins = String(avant - apres);
    c.dataset.apresMoins = c.value;
  });
}


function poserNoteCepc(ligne, valeur){
  const champ = document.querySelector('.cepcNiveau[data-comp="' +
                                       ligne.replace(/"/g, '') + '"]');
  if(!champ) return;

  /* Un E posé par une éliminatoire ne se remplace pas par une
     note : c'est l'élimination qui prime. */
  if(champ.value === 'E' && champ.dataset.parElim === 'oui') return;

  champ.value = valeur;

  const l = champ.parentNode;
  if(!l) return;
  l.querySelectorAll('button').forEach(b => {
    if(typeof b._peindre === 'function') b._peindre();
  });

  if(typeof majTotalCepc === 'function') majTotalCepc();
}


/* ============================================================
   LES ÉLIMINATOIRES SUR LE CEPC

   Chaque erreur marquée ☠️ coche un E sur sa ligne. Trois erreurs
   dans la même catégorie ne cochent qu'une case — c'est bien la
   catégorie qui est éliminatoire, pas chaque faute.

   La case reste modifiable : une erreur de saisie se corrige.
   ============================================================ */

function cocherEliminatoiresCepc(champs){
  /* La fiche range les observations sous « examen.observations » */
  const obs = champs['examen.observations'] || champs.observations;
  if(!Array.isArray(obs) || !obs.length) return;

  /* Les catégories touchées, sans doublon */
  const touchees = {};
  obs.forEach(o => {
    const cat = String((o && o.categorie) || '').trim();
    if(cat) touchees[cat] = true;
  });

  const noms = Object.keys(touchees);
  if(!noms.length) return;

  /* Le CEPC vit dans champs.cepc, rangé par nom de ligne */
  if(!champs.cepc || typeof champs.cepc !== 'object') champs.cepc = {};
  noms.forEach(n => { champs.cepc[n] = 'E'; });

  /* Et sur l'écran, pour que le moniteur le voie et puisse
     corriger s'il s'est trompé de catégorie. La case reste
     modifiable : un appui la retire. */
  try{
    document.querySelectorAll('.cepcNiveau').forEach(champ => {
      const ligne = champ.getAttribute('data-comp');
      if(!touchees[ligne]) return;

      champ.value = 'E';

      /* Les boutons se repeignent : sans cela, le E est enregistré
         mais invisible. */
      const l = champ.parentNode;
      if(!l) return;
      l.querySelectorAll('button').forEach(b => {
        if(typeof b._peindre === 'function') b._peindre();
      });
      const al = l.querySelector('.cepcAlerte');
      if(al) al.style.display = 'block';
    });
    if(typeof majTotalCepc === 'function') majTotalCepc();
  }catch(e){ /* l'écran n'a pas de tableau CEPC : le bilan suffit */ }
}


/* Les erreurs éliminatoires, groupées par catégorie.

   Elles ouvrent le bilan des erreurs : c'est ce qui a coûté
   l'examen, avant tout le reste. */
function eliminatoiresGroupees(champs){
  const obs = champs['examen.observations'] || champs.observations;
  if(!Array.isArray(obs)) return [];

  const par = {};
  obs.forEach(o => {
    const cat = String((o && o.categorie) || '').trim();
    if(!cat) return;
    (par[cat] = par[cat] || []).push(o);
  });

  /* L'ordre du CEPC, pas celui de la saisie : c'est celui que
     l'inspecteur suit. */
  const ordre = (typeof categoriesEliminatoires === 'function')
    ? categoriesEliminatoires() : Object.keys(par);

  return ordre.filter(n => par[n]).map(n => ({ categorie: n, fautes: par[n] }));
}


/* ============================================================
   LA CATÉGORIE DU CEPC

   Sept lignes du CEPC acceptent un E. C'est celle que le moniteur
   choisit qui sera cochée, et qui nommera l'erreur dans le bilan.
   ============================================================ */

function categoriesEliminatoires(){
  const out = [];
  if(typeof CEPC_BLOCS === 'undefined') return out;

  CEPC_BLOCS.forEach(b => {
    b.items.forEach(it => {
      if((it.valeurs || []).indexOf('E') !== -1) out.push(it.nom);
    });
  });
  return out;
}


/* ============================================================
   ☠️ ET ⚠️ POSENT LEUR POINT SUR LA CARTE — v1004

   David : « sur les examens blancs et les examens officiels,
   est-ce que quand on met une tête de mort ça peut faire un point
   sur la carte, pareil quand on appuie sur le Attention, et que ce
   soit lié en bas — j'appuie sur l'erreur éliminatoire = point
   tant sur la carte ». Et, sur le geste : « en direct, en
   roulant ».

   ⚠️ QUATRE PASSERELLES, ET RIEN D'AUTRE ICI. Tout ce qui décide —
   la couleur, l'icône, le rang, ce qui arrive quand on retire une
   marque — vit dans ec-trajet.js, qui est le seul à savoir ce
   qu'est un point. Cet écran-ci ne fait que dire QUAND et POURQUOI.
   Recopier la moindre de ces règles ici, ce serait deux endroits
   qui décrivent le même point, et c'est toujours le périmé qui
   finit par s'afficher.

   ⚠️ ET UNE MARQUE SE POSE MÊME SANS GPS. Si le relevé ne tourne
   pas — pas de section d'essai, localisation refusée, simulateur —
   les quatre fonctions ne font rien et la fiche se remplit comme
   avant. La carte est un plus ; la fiche d'examen, elle, ne dépend
   de rien.
   ============================================================ */
function poserSonPoint(type){
  return (typeof poserLePointDUneMarque === 'function')
    ? poserLePointDUneMarque(type) : 0;
}

function oublierSonPoint(id){
  if(id && typeof annulerLePointDUneMarque === 'function'){
    annulerLePointDUneMarque(id);
  }
}

function poserLeLienDuPoint(d, id, type, nom){
  if(!id) return;
  if(typeof marquerLePoint === 'function') marquerLePoint(id, type, nom);
  d.dataset.point = String(id);
}

function rendreSonPoint(d){
  const id = Number(d.dataset.point || 0);
  if(id && typeof rendreLePointAuTravail === 'function'){
    rendreLePointAuTravail(id);
  }
  d.dataset.point = '';
}

/* ============================================================
   VERSER LES ERREURS DANS LEURS POINTS — v1006

   Chaque ligne d'observation qui porte une marque porte aussi
   l'identité de son point. On lit les deux textes tels qu'ils sont
   À CET INSTANT — le même que celui où le bilan se fige — et on
   les dépose sur le point. La page « voir en grand » les relira.

   ⚠️ LE THÈME EST CELUI DU CEPC, pas le nom tapé dans le tiroir.
   C'est sous ce titre que l'erreur est rangée dans le bilan des
   erreurs : la page doit présenter la même chose, sinon l'élève
   lit deux classements pour une seule faute.

   ⚠️ ET LES TROIS QUESTIONS SUIVENT LE MODÈLE. L'examen blanc les
   pose, l'examen officiel non — c'est déjà vrai dans le bilan
   (voir buildExamen). La page ne doit pas les inventer là où le
   bilan ne les met pas.
   ============================================================ */
function verserLesErreursDansLesPoints(modele){
  if(typeof decrireLePoint !== 'function') return 0;

  if(typeof poserLesQuestionsDuTrajet === 'function'){
    poserLesQuestionsDuTrajet(String(modele || '') === 'examen-blanc');
  }

  let n = 0;
  lignesObservations().forEach(d => {
    if(!d.dataset || !d.dataset.point) return;
    const i = d.querySelector('.obsInsp');
    const r = d.querySelector('.obsRep');
    const ok = decrireLePoint(d.dataset.point, {
      theme: d.dataset.categorie || d.dataset.grave || d.dataset.moins || '',
      insp: i ? i.value.trim() : '',
      mon:  r ? r.value.trim() : ''
    });
    if(ok) n++;
  });
  return n;
}


/* ⚠️ L'ÉTIQUETTE AFFICHE LE RANG, JAMAIS L'IDENTITÉ GARDÉE. Le rang
   se recalcule à chaque fois : un point retiré ailleurs renumérote
   tout, et la ligne doit suivre. Voir rangDuPoint. */
function surLaCarte(d){
  const id = Number(d.dataset.point || 0);
  if(!id || typeof rangDuPoint !== 'function') return '';
  /* ⚠️ LA PHRASE VIENT DE ec-trajet.js — v1006. Elle y était déjà,
     dans mentionDuPoint, et je l'avais réécrite ici : deux
     écritures du même texte, et c'est mon propre test qui l'a
     trouvée. Seule la CONDITION diffère — voir le ⚠️ de
     mentionDuPoint. */
  return (typeof phraseDuPoint === 'function')
    ? phraseDuPoint(rangDuPoint(id)) : '';
}


function choisirCategorieCepc(toutes, quoi){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(460px, 94vw);max-height:88vh;overflow-y:auto;';

    const titres = {
      /* Deux temps : la compétence ici, le point juste après —
         voir demanderPointCepc. On ne promet donc plus « aucun
         point n'est retiré » à cet écran-là : il ne le sait pas
         encore. */
      'grave': ['⚠️ Quelle compétence ?',
                "L'erreur sera rangée là dans le bilan. On te " +
                'demandera ensuite si elle coûte un point.'],
      /* ⚠️ L'ENTRÉE « moins » A ÉTÉ RETIRÉE — v909. Le bouton ➖
         n'existe plus, donc plus personne n'appelait cette
         variante ; son texte promettait « un point sera retiré »
         sur un écran qui ne s'ouvrait jamais. Un texte mort qui
         décrit un geste mort est ce qu'on relira un jour en croyant
         qu'il dit vrai. */
      '':      ['☠️ Quelle catégorie ?',
                'Le E sera coché sur cette ligne du CEPC, et ' +
                "l'erreur rangée là dans le bilan."]
    };
    const [t, aide] = titres[quoi || ''] || titres[''];

    boite.innerHTML = '<h3>' + t + '</h3>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
        'line-height:1.5;">' + aide + '</div>';

    (toutes ? toutesCategoriesCepc() : categoriesEliminatoires()).forEach(nom => {
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'padding:12px;font-size:13px;margin-bottom:7px;' +
        'text-align:left;line-height:1.4;';
      b.textContent = nom;
      b.addEventListener('click', () => {
        fermerFond(fond);
        resolve(nom);
      });
      boite.appendChild(b);
    });

    const bA = document.createElement('button');
    bA.className = 'btn btn-secondary';
    bA.style.cssText = 'padding:12px;font-size:13px;margin-top:6px;';
    bA.textContent = 'Annuler';
    bA.addEventListener('click', () => {
      fermerFond(fond);
      resolve('');
    });
    boite.appendChild(bA);

    fond.appendChild(boite);
    document.body.appendChild(fond);
  });
}


/* ------------------------------------------------------------
   « EST-CE QUE ÇA COÛTE UN POINT ? »

   Le second temps du ⚠️. Rend true, false, ou null si on ferme —
   et null ne pose RIEN : on ne marque pas une erreur à moitié
   parce que quelqu'un a hésité sur le point.

   ⚠️ LA COMPÉTENCE EST RAPPELÉE. C'est la même que celle du ⚠️, et
   c'est justement ce qu'il faut pouvoir vérifier avant de lui
   retirer un cran — sinon on choisit à l'aveugle, deux écrans après
   avoir cliqué.
   ------------------------------------------------------------ */
function demanderPointCepc(categorie){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.maxWidth = 'min(420px, 94vw)';

    boite.innerHTML = '<h3>Est-ce que ça coûte un point ?</h3>' +
      '<div style="font-size:13px;color:var(--accent-text);' +
        'font-weight:700;margin-bottom:4px;">' +
        String(categorie || '').replace(/</g, '&lt;') + '</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:14px;' +
        'line-height:1.5;">Un point sera retiré sur cette ligne du CEPC. ' +
        'Jamais E — seule la ☠️ élimine.</div>';

    const poser = (libelle, valeur, principal) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (principal ? 'btn-primary' : 'btn-secondary');
      b.style.cssText = 'padding:12px;font-size:13px;margin-bottom:7px;' +
        'text-align:left;line-height:1.4;';
      b.textContent = libelle;
      b.addEventListener('click', () => { fermerFond(fond); resolve(valeur); });
      boite.appendChild(b);
    };

    /* « Non » d'abord : c'est le cas le plus fréquent, et le pouce
       tombe dessus. Retirer un point est le geste qui se décide. */
    poser('Non, juste à reprendre', false, false);
    poser('➖ Oui, enlever un point', true, true);

    const bA = document.createElement('button');
    bA.type = 'button';
    bA.className = 'btn btn-secondary';
    bA.style.cssText = 'padding:12px;font-size:13px;margin-top:6px;';
    bA.textContent = 'Annuler';
    bA.addEventListener('click', () => { fermerFond(fond); resolve(null); });
    boite.appendChild(bA);

    fond.appendChild(boite);
    document.body.appendChild(fond);
  });
}


/* Relève tout ce que le moniteur a saisi dans le formulaire */
/* ============================================================
   LES INSPECTEURS

   Une liste partagée : un nom ajouté par un moniteur sert
   aussitôt à toute l'équipe. Elle vit dans les réglages.
   ============================================================ */

const INSPECTEURS_BASE = [
  'Mme Lehain', 'Mme Bazin', 'Mme Dillenschneider', 'Mme Lefeuvre',
  'Mme Correia', 'Mr Rondineau', 'Mr Marchand', 'Mr Fornassier',
  'Mr Sotteau', 'Mr Saillant', 'Mr Prigent', 'Autre département'
];

let inspecteursAjoutes = null;

function inspecteursConnus(){
  const sus = inspecteursAjoutes || [];
  /* « Autre département » reste en dernier : c'est le fourre-tout */
  const base = INSPECTEURS_BASE.filter(x => x !== 'Autre département');
  return base.concat(sus).concat(['Autre département']);
}

async function chargerInspecteurs(){
  if(inspecteursAjoutes !== null) return;
  try{
    const d = await appelPrep({ action: 'reglagesList' });
    const g = (d && d.reglages) || {};
    inspecteursAjoutes = g.inspecteurs
      ? String(g.inspecteurs).split('|').map(x => x.trim()).filter(Boolean)
      : [];
  }catch(e){ inspecteursAjoutes = []; }
}

async function ajouterInspecteur(nom){
  await chargerInspecteurs();
  if(inspecteursConnus().some(x => normaliserMot(x) === normaliserMot(nom))){
    return;
  }
  inspecteursAjoutes.push(nom);
  try{
    await appelPrep({ action: 'reglageSet', cle: 'inspecteurs',
                      valeur: inspecteursAjoutes.join('|'),
                      par: ACCES.moniteur || '' });
    showToast('Inspecteur ajouté pour tous ✅');
  }catch(e){ showToast('Ajouté ici, mais pas enregistré.'); }
}


/* ============================================================
   NOTRE CEPC — ÉCRIT DANS SA CASE, LU PAR UNE SEULE PORTE

   David : « un CEPC qui n'est visible que pour les moniteurs, et
   qui apparaît sur le rendez-vous post-permis aussi pour le
   comparer avec le CEPC officiel ».

   ⚠️ UNE GRILLE NE VOYAGE PAS EN TOUTES LETTRES. Tout ce qui est
   « 🔒 pour nous » sur un examen officiel passe aujourd'hui par la
   NOTE : l'inspecteur, les heures, le mot pour l'équipe. Ça tient
   pour une phrase. Quatorze notes écrites en texte puis relues pour
   être redessinées, c'est la faute qu'on répare partout — la note
   est un compte rendu, pas une source.

   Elle a donc sa colonne, et deux fonctions : une qui écrit, une
   qui lit. Personne ne fabrique du JSON de son côté.
   ============================================================ */
function enregistrerCepcInterne(eleve, cepc){
  if(!eleve || typeof majSuivi !== 'function') return;

  /* Une grille vide n'efface pas la précédente sans le dire : le
     moniteur qui n'a rien coché n'a pas demandé qu'on oublie
     l'examen d'avant. On écrit ce qu'il y a, ou rien du tout. */
  const propre = {};
  Object.keys(cepc || {}).forEach(k => {
    const v = String((cepc || {})[k] === undefined ? '' : (cepc || {})[k]).trim();
    if(v !== '') propre[k] = v;
  });
  if(!Object.keys(propre).length) return;

  let texte = '';
  try{ texte = JSON.stringify(propre); }catch(e){ return; }

  /* ⚠️ UN ÉCHEC S'ENTEND. Le bilan est composé, l'écran a changé :
     si la grille n'atteint pas le classeur, le rendez-vous
     post-permis n'aura rien à comparer et personne ne saura
     pourquoi. C'est la leçon du journal des rappels. */
  Promise.resolve()
    .then(() => majSuivi(eleve, { cepcInterne: texte }))
    .catch(e => {
      console.warn('CEPC interne non enregistré :', e);
      if(typeof showToast === 'function'){
        showToast('⚠️ Bilan composé, mais notre CEPC n\'a pas été ' +
                  'enregistré : ' + (e && e.message ? e.message : 'refusé'));
      }
    });
}

/* La grille telle qu'elle a été posée, ou rien.

   ⚠️ UNE CASE ILLISIBLE N'EST PAS UNE CASE VIDE — mais ici elle le
   devient, et c'est voulu : on préfère une grille absente à une
   grille inventée. Le cas se signale dans la console, pas à
   l'écran : personne ne peut rien en faire sur le moment. */
function cepcInterneDe(eleve){
  const s = (typeof suiviDe === 'function') ? (suiviDe(eleve) || {}) : {};
  const t = String(s.cepcInterne || '').trim();
  if(!t) return null;
  try{
    const o = JSON.parse(t);
    return (o && typeof o === 'object' && Object.keys(o).length) ? o : null;
  }catch(e){
    console.warn('CEPC interne illisible pour ' + eleve + ' :', e);
    return null;
  }
}


/* La mention gardée dans les notes après un examen officiel.

   Elle ne part jamais à l'élève : elle sert au moniteur qui fera
   le rendez-vous post-permis, qui n'est pas forcément celui qui
   a accompagné. */
function mentionExamen(champs, moniteur){
  const insp = String(champs.inspecteur || '').trim();
  const rep = String(champs.repassage || '').trim();
  const note = String(champs.noteEquipe || '').trim();
  if(!insp && !rep && !note) return '';

  const bouts = ['🔒 EXAMEN OFFICIEL'];
  if(insp) bouts.push('Inspecteur : ' + insp);
  /* ⚠️ « AUCUN » N'EST PAS UN NOMBRE D'HEURES — v912. Écrit comme
     tel, il donnerait « Demandé : aucun + 3 heures », et le
     rendez-vous post-permis y lirait un chiffre. Il se dit en
     toutes lettres, avec le mot exact de la conclusion post-permis. */
  if(rep === REPASSAGE_AUCUN){
    bouts.push('⛔ Pas de repassage pour le moment');
  }else if(rep){
    bouts.push('Demandé : ' + rep + ' + 3 heures avant repassage');
  }
  if(moniteur) bouts.push('Par : ' + moniteur);

  let t = bouts.join(' · ');

  /* La note libre garde ses retours à la ligne : elle se lit
     comme un paragraphe, pas comme une suite de mentions. */
  if(note){
    t += '\n🔒 ' + note.split('\n').map(x => x.trim())
                        .filter(Boolean).join('\n🔒 ');
  }

  return t;
}


/* ============================================================
   LE BILAN MANUEL, GARDÉ EN COURS DE ROUTE

   Le vocal se sauvegarde à chaque phrase ; le manuel ne l'était
   qu'une fois terminé. Une coupure au milieu d'un examen officiel
   faisait tout perdre.
   ============================================================ */

let minuteurManuel = null;

/* Le dossier de l'élève, gardé entre l'ouverture de la fiche et
   la génération du bilan : c'est lui qui porte la frise. */
let dossierManuel = null;

/* Un brouillon par élève : le moniteur en a plusieurs dans la
   voiture le jour d'un examen, et ils ne doivent pas s'écraser. */
const CLE_MANUELS = 'bilans_manuels';

function tousLesBrouillons(){
  try{
    const l = JSON.parse(localStorage.getItem(CLE_MANUELS) || '[]');
    if(!Array.isArray(l)) return [];
    /* Au-delà de deux jours, ce n'est plus la journée en cours */
    const limite = Date.now() - 48 * 3600 * 1000;
    return l.filter(x => x && (x.ts || 0) > limite);
  }catch(e){ return []; }
}

function rangerBrouillons(liste){
  try{
    localStorage.setItem(CLE_MANUELS, JSON.stringify(liste.slice(0, 12)));
  }catch(e){ /* stockage plein */ }
}

function effacerBrouillonDe(eleve){
  const reste = tousLesBrouillons()
    .filter(x => normaliserMot(x.eleve || '') !== normaliserMot(eleve));
  rangerBrouillons(reste);

  /* ⚠️ ET L'ANCIENNE CLÉ AVEC, QUAND ELLE EST À LUI — v1076.

     « bilan_manuel_en_cours » est le vestige d'avant les fiches
     multiples, et la bannière le lit ENCORE (voir brouillonManuel).
     On effaçait la liste et on laissait le vestige : le cours
     revenait donc en « interrompu » par la petite porte, pour un
     bilan enregistré.

     Seulement s'il porte le nom qu'on efface : un autre examen de
     la matinée peut être la fiche en cours, et la lui retirer
     reviendrait à lui faire perdre son filet. */
  try{
    const v = JSON.parse(localStorage.getItem('bilan_manuel_en_cours') || 'null');
    if(v && normaliserMot(v.eleve || '') === normaliserMot(eleve)){
      localStorage.removeItem('bilan_manuel_en_cours');
    }
  }catch(e){ /* clé illisible : elle ne servira à personne */ }
}

/* ============================================================
   LE BROUILLON DE LA FICHE, EN UN SEUL OBJET

   Il servait à une seule chose : la reprise sur l'appareil. Il en
   sert deux, maintenant — c'est LUI qu'on dépose sur le classeur,
   pour que « ↩️ Reprendre ici » rouvre une VRAIE fiche et pas un
   pavé de texte dans la case de dictée.

   « Quand je reprends un cours manuel, tout le texte apparaît
   dans la case de transcription vocale, je ne peux pas le
   continuer. » Le miroir lisible partait sur le serveur, et rien
   d'autre : à la reprise il n'y avait donc rien à reposer dans les
   cases. Le miroir reste — c'est ce que le bureau LIT — mais il
   voyage désormais avec les réponses elles-mêmes.

   Une seule construction pour les deux usages : deux objets
   auraient fini par ne pas porter la même chose, et c'est
   toujours celui qu'on n'a pas regardé qui manque.
   ============================================================ */
function brouillonManuelActuel(){
  const zone = $('manuelChamps');
  if(!zone) return null;

  /* ============================================================
     ⚠️ PAS DE FICHE OUVERTE, PAS DE FICHE — v1019

     David, le 17 septembre, capture à l'appui : « quand je fais
     reprendre ici ça m'ouvre un cours en manuel VIDE alors que
     c'était un cours en vocal ».

     Cette fonction rendait un objet même quand AUCUNE fiche
     manuelle n'était ouverte. Le refus écrit plus bas — « rien de
     saisi, inutile de proposer une reprise vide » — laisse passer
     dès que le QUESTIONNAIRE est rempli. Or un cours en dictée
     remplit son questionnaire comme les autres : « contexteDepart »
     est posé, le refus ne joue pas, et un objet part.

     La suite est mécanique, et elle a coûté un cours à David :

       · le dépôt colle cet objet dans « fiche » ;
       · 🩹 Cours non terminés voit une « fiche » et annonce
         « fiche remplie à la main » sur une dictée ;
       · « ↩️ Reprendre ici » voit une fiche, VIDE la case de
         dictée et ouvre un formulaire manuel sans une ligne.

     La dictée, elle, n'a jamais quitté le serveur — c'est l'écran
     qui s'est vidé. Mais devant un moniteur, un écran vide et un
     travail perdu, c'est la même chose.

     ⚠️ « modeManuel », ET NON « LA ZONE EXISTE ». #manuelChamps
     est écrit dans index.html : la zone existe TOUJOURS, même en
     pleine dictée. C'est le drapeau du mode qui dit la vérité — il
     est posé par ouvrirBilanManuel et retombe à la fermeture du
     cours.

     Le questionnaire d'une dictée n'est pas perdu pour autant : il
     voyage avec elle, par son propre chemin. Il n'a jamais eu à
     voyager dans une fiche manuelle.
     ============================================================ */
  if(typeof modeManuel !== 'undefined' && !modeManuel) return null;

  /* ⚠️ ON RELIT L'ÉCRAN AVANT DE GARDER.

     Les observations d'un examen officiel, les compétences, la
     grille CEPC ne vivent pas dans un champ : elles vivent dans
     « champsManuels », et c'est « lireChampsManuels » qui les y
     met en relisant la page. La sauvegarde sur l'appareil, elle,
     se contentait de recopier « champsManuels » TEL QU'IL ÉTAIT —
     donc dans l'état de la dernière génération ou du dernier
     dépôt, jamais celui de l'instant.

     Une minute de retard sur une fiche d'examen, c'est trois
     remarques d'inspecteur perdues. On relit d'abord. */
  try{
    if(typeof lireChampsManuels === 'function') lireChampsManuels();
  }catch(e){ /* un écran à moitié dessiné ne doit pas bloquer la garde */ }

  /* On garde l'état des champs eux-mêmes plutôt que leur
     interprétation : chaque type de rubrique se redessine
     différemment, mais tous ont une valeur ou une case cochée. */
  const saisies = [];
  champsDeSaisieManuelle(zone).forEach((el, i) => {
    saisies.push({
      i: i,
      cle: el.getAttribute('data-cle') || el.getAttribute('data-comp') || '',
      classe: el.className || '',
      valeur: (el.type === 'checkbox' || el.type === 'radio')
        ? (el.checked ? '1' : '')
        : String(el.value || '')
    });
  });

  /* ------------------------------------------------------------
     CE QUI NE VIT QUE DANS LA MÉMOIRE DE LA PAGE

     David : « dans les examens officiels, ça note la partie
     avant examen, j'envoie à l'élève, et quand je reviens sur la
     fiche il n'y a plus rien au niveau des cases cochées ».

     Elle a raison, et la cause est nette : les ✅ / ❌ ne sont pas
     des cases à cocher, ce sont des BOUTONS. Ils n'écrivent nulle
     part dans la page — ils posent leur réponse dans
     `champsManuels`, un objet de la mémoire. La sauvegarde, elle,
     ne parcourait que les `input`, `textarea` et `select` : elle
     ne les voyait pas. Et rouvrir la fiche repart de
     `champsManuels = {}`.

     C'est la même leçon que pour les réponses du questionnaire,
     perdues pour exactement la même raison : ce qui ne vit que
     dans la mémoire de la page doit voyager avec le brouillon.
     ------------------------------------------------------------ */
  const memoire = (typeof champsManuels !== 'undefined' && champsManuels)
    ? Object.assign({}, champsManuels) : null;
  const enMemoire = memoire && Object.keys(memoire)
    .some(k => memoire[k] !== '' && memoire[k] !== undefined);

  /* Rien de saisi : inutile de proposer une reprise vide.

     « Rien » compte aussi le questionnaire — un moniteur qui a
     renseigné la formation, la frise et les examens sans avoir
     encore coché une seule case de la fiche a bel et bien du
     travail à ne pas perdre — et les boutons, pour la même
     raison : trois ✅ sur la partie avant examen sont un travail
     fait. */
  const quest = (typeof contexteDepart !== 'undefined' && contexteDepart)
                  ? contexteDepart : null;
  if(!saisies.some(x => x.valeur) && !quest && !enMemoire) return null;

  const eleve = $('studentName').value.trim();
  return {
    ts: Date.now(),
    modele: $('modele').value,
    moniteur: $('monitorName').value,
    eleve: eleve,
    site: $('site').value,
    date: $('lessonDate').value,
    note: $('noteInterne') ? $('noteInterne').value : '',
    avantEnvoye: !!avantExamenEnvoye,
    /* Les boutons ✅ / ❌ / A-B-C et tout ce qui ne s'écrit pas
       dans un champ de la page. */
    champs: memoire,
    /* Ses réponses au questionnaire — même raison qu'en dictée :
       elles ne vivaient que dans la mémoire de la page, et une
       monitrice qui avait tout rempli n'en retrouvait rien. */
    quest: quest,
    saisies: saisies,
    /* ✍️ v1206 — la forme avec laquelle la fiche a commencé */
    forme: formeEnCours || null
  };
}

/* La sauvegarde sur l'appareil : immédiate, et c'est elle qui
   tient entre deux dépôts. */
function sauvegarderManuel(){
  /* ⚠️ UN BILAN ENREGISTRÉ NE SE REDÉPOSE PAS — v1076.

     David, le 8 octobre : « quand il finit un bilan rempli à la
     main, qu'il est envoyé par mail et qu'il revient à l'accueil,
     ça lui met cours interrompu retrouvé alors qu'il a bien été
     envoyé et enregistré ». Et il l'a confirmé : il appuie bien sur
     Copier-enregistrer, et le bilan EST dans l'historique.

     L'export efface tout ce qu'il faut — la sauvegarde de
     l'appareil, le brouillon du serveur. Mais la fiche manuelle
     reste à l'écran, remplie, et « modeManuel » reste vrai jusqu'à
     la fermeture. Les deux filets de sécurité de la fiche — le
     « pagehide » et la mise en veille — se déclenchent donc APRÈS
     l'enregistrement et REFABRIQUENT le brouillon qu'on venait
     d'effacer. Sur une tablette, basculer vers la messagerie pour
     envoyer le mail suffit à les réveiller.

     C'est mot pour mot le défaut déjà corrigé pour la DICTÉE —
     « le moindre mot corrigé, ou la simple mise en veille,
     redéposait un brouillon PAR-DESSUS un cours terminé » (voir
     deposerSiChange, ec-arriereplan.js). Le filet de la fiche
     manuelle n'avait jamais reçu la même garde.

     Le filet reste entier tant que le bilan n'est pas enregistré :
     c'est exactement là qu'il sert. */
  if(typeof bilanEnregistre !== 'undefined' && bilanEnregistre) return;
  /* ✍️ v1206 — l'essai du créateur de fiches ne laisse rien */
  if(window.essaiFicheEnCours || window.sansIAEnCours) return;

  const brouillon = brouillonManuelActuel();
  if(!brouillon) return;

  const eleve = brouillon.eleve;

  /* Le brouillon de cet élève remplace le sien, pas celui d'un
     autre : plusieurs examens se déroulent en parallèle. */
  const autres = tousLesBrouillons()
    .filter(x => normaliserMot(x.eleve || '') !== normaliserMot(eleve));
  autres.unshift(brouillon);
  rangerBrouillons(autres);

  /* L'ancienne clé sert encore à la bannière : on garde le plus
     récent pour ne pas la laisser vide. */
  try{
    localStorage.setItem('bilan_manuel_en_cours', JSON.stringify(brouillon));
  }catch(e){}
}

/* Vrai quand la partie avant examen a déjà été envoyée */
let avantExamenEnvoye = false;

/* ------------------------------------------------------------
   RALLUMER LES BOUTONS

   Une réponse posée par un bouton — ✅ / ❌, A-B-C, ✅🍊❌ — vit
   dans `champsManuels` et NULLE PART dans la page. Restaurer la
   valeur sans rallumer le bouton donnerait une fiche qui paraît
   vide et produit pourtant un bilan rempli : pire que de tout
   perdre, parce qu'on ne s'en apercevrait pas.

   On rejoue donc le clic, qui sait déjà repeindre — et qui reste
   le seul endroit où la couleur d'un bouton se décide.
   ------------------------------------------------------------ */
function repeindreBoutonsManuels(){
  const zone = $('manuelChamps');
  if(!zone) return 0;

  let n = 0;
  Array.prototype.forEach.call(zone.querySelectorAll('[data-champ]'), groupe => {
    const cle = groupe.getAttribute('data-champ');
    const voulu = champsManuels[cle];
    if(voulu === undefined) return;

    const b = Array.prototype.filter.call(groupe.children,
      x => x.getAttribute('data-val') === String(voulu))[0];
    if(!b) return;

    /* On efface avant de cliquer : les boutons A-B-C basculent au
       second appui, et cliquer sur celui qui est déjà pris
       l'aurait éteint. */
    champsManuels[cle] = ' ';
    b.click();
    n++;
  });
  /* 🅿️ v1211 — la manœuvre choisie revient dans sa liste, et sa
     mention sur les lignes */
  Array.prototype.forEach.call(zone.querySelectorAll('input.choixFaitCase'), cb => {
    const v = champsManuels[cb.getAttribute('data-cle')];
    if(v === 'oui' || v === 'non') cb.checked = v === 'oui';
  });
  Array.prototype.forEach.call(zone.querySelectorAll('details.choixManoeuvre'), d => {
    const voulu = valeursManoeuvresChoisies(champsManuels[d.dataset.cle]);
    Array.prototype.forEach.call(d.querySelectorAll('input.choixManoeuvreCase'), cb => {
      const v = voulu.indexOf(cb.value) !== -1;
      if(cb.checked !== v){ cb.checked = v; if(v) n++; }
    });
    resumerChoixManoeuvre(d);
    appliquerMentionManoeuvre(champsManuels[d.dataset.cle]);
  });
  /* 🔘 v1213 — les boutons se relisent sur leurs cases (une reprise
     coche les cases sans prévenir les boutons) */
  Array.prototype.forEach.call(zone.querySelectorAll('.zoneVueCases'), z => {
    if(typeof z._appliquerVue === 'function') z._appliquerVue();
  });
  return n;
}

/* ============================================================
   🅿️ LA MANŒUVRE DE L'EXAMEN, CHOISIE DANS LE TITRE — v1211

   David, le 20 octobre : « dans la partie manœuvre des examens blanc
   et des examens officiels, transforme le titre en liste déroulante
   pour choisir la manœuvre faite ; le titre devient Manœuvre : "la
   manœuvre" ».

   Trois effets, d'un seul choix :
     · les lignes de la zone portent « Manœuvre : Créneau · » au lieu
       de « Manœuvre · » — le bilan dit QUELLE manœuvre a posé
       problème ;
     · le bilan porte une ligne « 🅿️ Manœuvre : … », même sans
       erreur ;
     · et cette ligne compte sur la fiche véhicule de l'élève : elle
       est lue comme une marque (voir marquesManoeuvreExamen).
   ============================================================ */
const MENTION_MANOEUVRE = 'Manœuvre';
function mentionDeLaManoeuvre(choix){
  const v = valeursManoeuvresChoisies(choix).join(' + ');
  return v ? MENTION_MANOEUVRE + ' : ' + v : MENTION_MANOEUVRE;
}

function poserChoixManoeuvre(t, ch){
  t.textContent = '';
  t.style.display = 'flex';
  t.style.alignItems = 'center';
  t.style.gap = '8px';
  t.style.flexWrap = 'wrap';
  const n = document.createElement('span');
  n.style.cssText = 'flex-shrink:0;';
  n.textContent = String(ch.nom || '🅿️ Manœuvre').replace(/\s*:\s*$/, '') + ' :';
  t.appendChild(n);

  /* 🅿️ v1236 — PLUSIEURS MANŒUVRES. David, le 22/10 : « on doit
     pouvoir en choisir plusieurs, car c'est au minimum 2 manœuvres ».
     Des cases dans un menu qui se déplie ; la valeur garde une manœuvre
     par ligne. La liste est celle du créateur de fiches (une pour
     l'examen blanc, l'examen officiel et le RVP), sinon celle de l'école. */
  const d = document.createElement('details');
  d.className = 'choixManoeuvre';
  d.setAttribute('data-cle', ch.choixManoeuvre);
  d.style.cssText = 'flex:1 1 170px;min-width:0;border:1px solid var(--line);border-radius:10px;background:var(--navy);' +
    'font-size:14px;font-weight:700;color:var(--cream);letter-spacing:0;';
  const su = document.createElement('summary');
  su.style.cssText = 'cursor:pointer;padding:7px 9px;list-style:none;';
  d.appendChild(su);
  const corps = document.createElement('div');
  corps.style.cssText = 'padding:2px 10px 8px;max-height:320px;overflow-y:auto;font-weight:600;';
  d.appendChild(corps);
  const deja = valeursManoeuvresChoisies(champsManuels[ch.choixManoeuvre]);
  const liste = listeDuMenuManoeuvres().slice();
  deja.forEach(v => { if(liste.indexOf(v) === -1) liste.push(v); });
  liste.forEach(m => {
    const lab = document.createElement('label');
    lab.style.cssText = 'display:flex;align-items:flex-start;gap:9px;margin:6px 0;font-size:14px;line-height:1.35;' +
      'text-transform:none;color:var(--cream);cursor:pointer;font-weight:600;letter-spacing:0;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'choixManoeuvreCase';
    cb.setAttribute('data-hors-saisie', '1');
    cb.value = m;
    cb.checked = deja.indexOf(m) !== -1;
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin-top:1px;';
    cb.addEventListener('change', () => {
      const l = Array.prototype.filter.call(d.querySelectorAll('input.choixManoeuvreCase'), x => x.checked).map(x => x.value);
      if(l.length) champsManuels[ch.choixManoeuvre] = l.join('\n'); else delete champsManuels[ch.choixManoeuvre];
      resumerChoixManoeuvre(d);
      appliquerMentionManoeuvre(champsManuels[ch.choixManoeuvre]);
      if(typeof majBilanEliminatoires === 'function'){ try{ majBilanEliminatoires(); }catch(e){} }
      if(typeof planifierSauvegardeManuelle === 'function') planifierSauvegardeManuelle();
    });
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(m));
    corps.appendChild(lab);
  });
  resumerChoixManoeuvre(d);
  t.appendChild(d);
  /* La zone n'est pas encore dessinée : la mention se pose juste après */
  setTimeout(() => appliquerMentionManoeuvre(champsManuels[ch.choixManoeuvre]), 0);
}
function valeursManoeuvresChoisies(v){
  return String(v == null ? '' : v).split('\n').map(x => x.trim()).filter(Boolean);
}
function resumerChoixManoeuvre(d){
  const l = Array.prototype.filter.call(d.querySelectorAll('input.choixManoeuvreCase'), x => x.checked).map(x => x.value);
  const su = d.querySelector('summary');
  if(su) su.textContent = (l.length ? l.join(' · ') : '— choisis les manœuvres —') + '  ▾';
}

/* 🎯 v1238 — « ✅ faite » au bout d'un titre : cochée d'office */
function poserChoixFait(t, ch){
  if(champsManuels[ch.choixFait] === undefined) champsManuels[ch.choixFait] = 'oui';
  t.style.display = 'flex'; t.style.alignItems = 'center'; t.style.gap = '8px'; t.style.flexWrap = 'wrap';
  const n = document.createElement('span');
  n.style.cssText = 'flex:1 1 auto;min-width:0;';
  n.textContent = t.textContent;
  t.textContent = '';
  t.appendChild(n);
  const lab = document.createElement('label');
  lab.style.cssText = 'display:flex;align-items:center;gap:7px;margin:0;font-size:13.5px;font-weight:700;' +
    'text-transform:none;letter-spacing:0;color:var(--cream);cursor:pointer;flex-shrink:0;';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'choixFaitCase';
  cb.setAttribute('data-cle', ch.choixFait);
  cb.setAttribute('data-hors-saisie', '1');
  cb.style.cssText = 'width:18px;height:18px;margin:0;';
  cb.checked = champsManuels[ch.choixFait] === 'oui';
  cb.addEventListener('change', () => {
    champsManuels[ch.choixFait] = cb.checked ? 'oui' : 'non';
    if(typeof planifierSauvegardeManuelle === 'function') planifierSauvegardeManuelle();
  });
  lab.appendChild(cb);
  lab.appendChild(document.createTextNode('faite'));
  t.appendChild(lab);
}

/* La mention de la zone, et celle de chacune de ses lignes */
function appliquerMentionManoeuvre(choix){
  const z = document.getElementById('obsManoeuvre');
  if(!z) return;
  const m = mentionDeLaManoeuvre(choix);
  z.dataset.mention = m;
  Array.prototype.forEach.call(z.children, d => {
    if(!d.dataset) return;
    const avant = String(d.dataset.mention || '');
    if(!avant || avant.indexOf(MENTION_MANOEUVRE) === 0) d.dataset.mention = m;
  });
}

/* Repose ce qui avait été saisi, une fois la fiche dessinée */
function replacerSaisiesManuelles(saisies){
  const zone = $('manuelChamps');
  if(!zone || !saisies || !saisies.length) return 0;

  const champs = champsDeSaisieManuelle(zone);
  let remis = 0;

  saisies.forEach(s => {
    const el = champs[s.i];
    if(!el) return;

    /* La fiche a pu changer entre-temps : on vérifie que la case
       est bien la même avant d'y écrire. */
    const meme = (el.getAttribute('data-cle') || el.getAttribute('data-comp') || '')
                 === s.cle && (el.className || '') === s.classe;
    if(!meme) return;

    if(el.type === 'checkbox' || el.type === 'radio'){
      el.checked = !!s.valeur;
    }else{
      el.value = s.valeur;
    }
    if(s.valeur) remis++;
  });

  return remis;
}

/* On attend une seconde de calme : enregistrer à chaque frappe
   ralentirait la saisie. */
function planifierSauvegardeManuelle(){
  clearTimeout(minuteurManuel);
  minuteurManuel = setTimeout(() => {
    sauvegarderManuel();
    deposerFicheManuelle();
  }, 1000);
}


/* ============================================================
   LA FICHE MANUELLE PART AUSSI SUR LE SERVEUR

   « Je sais que j'ai 3 cours qui se déroulent et je ne vois rien,
   et on me demande de savoir où c'est enregistré. »

   La réponse était mauvaise : NULLE PART, sauf dans le navigateur
   du moniteur. La dictée, elle, se dépose sur le classeur au fil du
   cours depuis longtemps — précisément parce que « la sauvegarde
   sur l'appareil échoue en silence quand le stockage est plein, et
   disparaît avec le navigateur ». Une fiche d'examen remplie à la
   main court exactement le même risque, et personne ne l'avait vu :
   elle n'allume pas le micro, donc elle ne passait par aucun des
   deux chemins qui déposent.

   Elle passe par LE MÊME dépôt que la dictée — « brouillonSet »,
   la même feuille, le même écran 🩹 Cours non terminés. Ce qui
   change est ce qu'on met dans la colonne « Transcription » : pas
   des paroles, mais la fiche telle qu'elle est remplie à cet
   instant, en clair. Le bureau la lit, et le moniteur la retrouve
   depuis un autre téléphone.

   ⚠️ PAS À CHAQUE FRAPPE. Le dépôt est bridé à une fois par minute :
   une fiche d'examen se remplit case par case pendant une heure, et
   soixante écritures par minute rempliraient le classeur avant la
   fin de l'épreuve. Entre deux dépôts, la sauvegarde locale tient —
   elle, elle est immédiate.
   ============================================================ */
const SECONDES_ENTRE_DEUX_DEPOTS = 60;
let dernierDepotManuel = 0;
let depotManuelEnAttente = null;

/* ============================================================
   LA FICHE DÉPOSÉE DOIT RESSEMBLER À LA FICHE

   « Je ne vois toujours pas les catégories. »

   Le miroir parcourait la PAGE : il ne voyait donc que les cases
   qui portent une valeur, et les nommait avec leur clé technique
   quand aucune étiquette ne les entourait. Une fiche de conduite
   entièrement remplie ressortait en quatre lignes — « carteSD —
   oui » — c'est-à-dire les quatre cases cochées d'avance, et rien
   du travail du moniteur.

   Il parcourt maintenant LE SCHÉMA, le même que celui qui dessine
   la fiche et le même que celui qui la relit : les titres sont
   ceux de l'écran, l'ordre est celui de l'écran, et une rubrique
   vide sort avec son titre — c'est justement ce qu'on veut voir
   depuis le bureau. Un champ ajouté au schéma apparaît des trois
   côtés sans qu'on y pense.

   Les valeurs, elles, ne sont plus relues de la page : c'est
   « lireChampsManuels » qui sait le faire, pour tous les types de
   champs, et il le fait déjà. Deux lecteurs auraient fini par ne
   pas lire pareil.
   ============================================================ */

/* Ce qu'une réponse devient à l'écrit, quelle que soit sa forme :
   texte, liste de manœuvres, tableau de compétences. */
function valeurLisible(v){
  if(v === null || v === undefined || v === false || v === '') return '';

  if(Array.isArray(v)){
    return v.map(x => {
      if(x && typeof x === 'object'){
        if(x.nom) return String(x.nom);
        return [x.inspecteur, x.reponse].filter(Boolean).join(' → ');
      }
      return String(x);
    }).filter(Boolean).join(', ');
  }

  if(typeof v === 'object'){
    return Object.keys(v).map(k => {
      const x = v[k];
      if(x && typeof x === 'object'){
        const e = (x.erreurs || []).join(' / ');
        return k + ' : ' + (x.statut || '') + (e ? ' — ' + e : '');
      }
      return k + ' : ' + String(x);
    }).filter(Boolean).join(' · ');
  }

  return String(v).trim();
}

/* Les champs qui en contiennent d'autres : les neuf rubriques, les
   compétences, l'en-tête. Leurs titres viennent d'où l'écran les
   prend — une deuxième liste de noms finirait par dire autre
   chose que la fiche. */
function sousLignesDuChamp(ch, modele){
  if(ch.type === 'rubriques'){
    return (typeof RUBRIQUES !== 'undefined' ? RUBRIQUES : []).map(paire => ({
      titre: String(paire[1]).replace(/\s*:\s*$/, ''),
      valeur: valeurLisible(champsManuels[ch.cle + '.' + paire[0]])
    }));
  }

  if(ch.type === 'competences'){
    const dedans = champsManuels[ch.cle] || {};
    return ((modele && modele.comps) || []).map(c => {
      const x = dedans[c.cle] || null;
      const e = x ? (x.erreurs || []).join(' / ') : '';
      return {
        titre: c.titre || c.nom || c.cle,
        valeur: x ? ((x.statut || '') + (e ? ' — ' + e : '')).trim() : ''
      };
    });
  }

  if(ch.type === 'cepc'){
    const dedans = champsManuels[ch.cle] || {};
    return Object.keys(dedans).map(k => ({
      titre: k, valeur: valeurLisible(dedans[k])
    }));
  }

  if(ch.type === 'entete'){
    const zone = $('manuelChamps');
    if(!zone) return [];
    return Array.prototype.map.call(
      zone.querySelectorAll('.enteteCase, .enteteTexte'), el => {
        const rangee = el.parentNode;
        const fort = rangee ? rangee.querySelector('strong') : null;
        const cle = el.getAttribute('data-cle') || '';
        return {
          titre: (fort && fort.textContent) ? fort.textContent.trim() : cle,
          valeur: valeurLisible(champsManuels[cle]),
          parDefaut: true      /* cochées d'avance : ce n'est pas du travail */
        };
      });
  }

  return null;
}

/* La fiche en clair, dans l'ordre de l'écran. Les titres des
   catégories sortent même vides : c'est ce que le bureau regarde
   pour savoir où en est le moniteur. */
function ficheManuelleEnTexte(quelleZone){
  /* Une zone donnée, c'est un écran sans schéma — le rendez-vous
     post-permis. Lui se lit toujours à même la page. */
  if(quelleZone) return champsDeLaZoneEnTexte(quelleZone);

  const sel = (typeof $ === 'function') ? $('modele') : null;
  const modele = (sel && typeof MODELES === 'object') ? MODELES[sel.value] : null;
  /* ✍️ v1207 — la fiche telle que le moniteur la voit (ordre,
     titres, zones ajoutées), quand c'est elle qui est ouverte */
  const champs = modele
    ? (champsDeLaFicheOuverte(sel.value) ||
       ((modele.schema === 'handicap' && typeof schemaHandicap === 'function')
        ? schemaHandicap() : CHAMPS_MANUELS[modele.schema]))
    : null;

  /* Pas de schéma connu : on retombe sur la lecture de la page,
     qui vaut toujours mieux que rien. */
  if(!champs || !champs.length) return champsDeLaZoneEnTexte($('manuelChamps'));

  try{ lireChampsManuels(); }catch(e){ /* l'écran peut être à moitié dessiné */ }

  const lignes = [];
  let remplis = 0;

  champs.forEach(ch => {
    if(ch.cacheFiche) return;   /* ✍️ masquée par le créateur de fiches */
    if(ch.type === 'envoiAvant' || ch.type === 'rappelFrise' ||
       ch.type === 'photo' || ch.type === 'apercuEval') return;

    if(ch.type === 'titre'){
      lignes.push('');
      lignes.push('— ' + String(ch.nom || '').trim() + ' —');
      return;
    }

    /* Un sous-titre sépare aussi dans le miroir que lit le bureau :
       sans lui, « Vérification — ✅ » et « Premiers secours — ✅ »
       se suivraient sans qu'on sache à quoi se rapporte
       l'explication d'à côté. */
    if(ch.type === 'sousTitre'){
      lignes.push('');
      const choix = ch.choixManoeuvre ? valeursManoeuvresChoisies(champsManuels[ch.choixManoeuvre]).join(', ') : '';
      lignes.push('  · ' + String(ch.nom || '').trim() + (choix ? ' : ' + choix : ''));
      if(choix) remplis++;
      return;
    }

    const sous = sousLignesDuChamp(ch, modele);
    if(sous){
      lignes.push(String(ch.nom || ch.cle) + ' :');
      sous.forEach(s => {
        if(s.valeur && !s.parDefaut) remplis++;
        lignes.push('   ' + s.titre + ' — ' + (s.valeur || '—'));
      });
      return;
    }

    const v = valeurLisible(champsManuels[ch.cle]);
    const commentaire = (ch.type === 'eval3')
      ? valeurLisible(champsManuels[ch.cle + '.commentaire']) : '';

    /* Une réponse laissée à sa valeur d'usine n'est pas une
       réponse : sans cette nuance, une fiche à peine ouverte
       partirait comme une fiche remplie. */
    const parDefaut = (ch.type === 'ok') && (v === (ch.defaut || ''));
    if((v || commentaire) && !parDefaut) remplis++;

    lignes.push(String(ch.nom || ch.cle) + ' — ' + (v || '—') +
                (commentaire ? ' · ' + commentaire : ''));
  });

  /* Rien de saisi : rien à déposer. Le bureau n'a que faire d'un
     formulaire vierge, et la feuille se remplirait de blancs. */
  if(!remplis) return '';

  return lignes.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* La lecture à même la page — l'ancien chemin, gardé pour les
   écrans qui n'ont pas de schéma. */
function champsDeLaZoneEnTexte(quelleZone){
  const zone = quelleZone || $('manuelChamps');
  if(!zone) return '';

  const lignes = [];
  const vus = {};

  zone.querySelectorAll('input, textarea, select').forEach(el => {
    const rempli = (el.type === 'checkbox' || el.type === 'radio')
      ? el.checked : String(el.value || '').trim();
    if(!rempli) return;

    /* Le libellé le plus proche : l'étiquette du champ, sinon le
       thème, sinon la clé technique. Mieux vaut une clé qu'un blanc —
       et « data-theme » compte, c'est lui qui nomme les rubriques
       d'erreurs du jour. */
    const cle = el.getAttribute('data-cle') || el.getAttribute('data-comp') ||
                el.getAttribute('data-theme') || el.name || '';
    let titre = '';
    const lab = el.closest('label') ||
      (el.id ? zone.querySelector('label[for="' + el.id + '"]') : null);
    if(lab) titre = String(lab.textContent || '').trim().slice(0, 60);
    if(!titre) titre = cle;

    if(cle) vus[cle] = true;

    const valeur = (el.type === 'checkbox' || el.type === 'radio')
      ? 'oui' : String(el.value || '').trim();
    lignes.push((titre ? titre + ' — ' : '') + valeur);
  });

  /* Les réponses posées par des boutons — ✅ / ❌, A-B-C — ne vivent
     dans aucun champ : sans elles, une fiche d'examen entièrement
     remplie au doigt partirait vide.

     Sans le garde-fou « vus », une réponse portée À LA FOIS par une
     case et par la mémoire sortirait deux fois, et on lirait une
     fiche qui se répète. */
  if(typeof champsManuels === 'object' && champsManuels){
    Object.keys(champsManuels).forEach(k => {
      if(vus[k]) return;
      const v = valeurLisible(champsManuels[k]);
      if(!v) return;
      lignes.push(k + ' — ' + v);
    });
  }

  return lignes.join('\n');
}

/* ------------------------------------------------------------
   LE RENDEZ-VOUS POST-PERMIS SE DÉPOSE AUSSI

   Il a son écran à lui, donc il ne passe par aucune des deux
   surveillances de la fiche manuelle. Il n'a pas non plus de
   sauvegarde locale : ce qui est écrit dans ses trois grandes
   zones — le bilan de l'examen, celui que l'élève a rédigé, les
   remarques du moniteur — ne vit QUE dans la page ouverte. Un
   onglet fermé et tout est perdu.

   Une seule surveillance, posée une fois, et le même dépôt que
   partout ailleurs.
   ------------------------------------------------------------ */
function veillerDepotRdvPost(cours){
  const zone = $('rdvPostView');
  if(!zone || !cours) return;

  dernierDepotManuel = 0;
  if(typeof reinitialiserDepotBrouillon === 'function'){
    reinitialiserDepotBrouillon();
  }

  const infos = { eleve: cours.eleve || '', date: cours.date || '',
                  modele: 'rdv-post', site: cours.site || '' };

  /* Un rendez-vous qui s'ouvre est un cours qui commence : s'il en
     restait un interdit de dépôt pour cet élève — le précédent,
     terminé il y a une heure — il est levé ici. */
  if(typeof reprendreLesDepots === 'function') reprendreLesDepots(infos.eleve);

  /* Posée UNE fois : l'écran se redessine à chaque rendez-vous, et
     des écouteurs empilés déposeraient autant de fois. Les infos,
     elles, suivent l'élève du moment. */
  zone.dataset.eleveDepot = infos.eleve;
  if(zone.dataset.veille) return;
  zone.dataset.veille = 'oui';

  ['input', 'change'].forEach(ev => {
    zone.addEventListener(ev, () => {
      clearTimeout(zone._minuteurDepot);
      zone._minuteurDepot = setTimeout(() => {
        deposerFicheManuelle(false, zone,
          Object.assign({}, infos, { eleve: zone.dataset.eleveDepot || '' }));
      }, 1000);
    });
  });

  /* Et à l'instant où l'on perd tout : l'onglet qui se ferme, le
     téléphone qui s'endort. */
  window.addEventListener('pagehide', () => {
    if(zone.style.display === 'none') return;
    deposerFicheManuelle(true, zone,
      Object.assign({}, infos, { eleve: zone.dataset.eleveDepot || '' }));
  });
}

function deposerFicheManuelle(force, quelleZone, quiEtQuoi){
  /* Sans zone donnée, c'est la fiche manuelle ordinaire : elle
     n'existe que si « modeManuel » est vrai. Avec une zone, c'est
     un écran qui se garde lui-même — le rendez-vous post-permis. */
  if(!quelleZone && !modeManuel) return;
  if(window.essaiFicheEnCours || window.sansIAEnCours) return;

  /* ⚠️ MÊME GARDE QUE « sauvegarderManuel » — v1076, et pour la
     même raison : un cours enregistré n'a plus rien à déposer dans
     « 🩹 Cours non terminés ». Le rendez-vous post-permis, lui, se
     garde toujours : il n'a pas de bilan à enregistrer, et son
     « quelleZone » le distingue. */
  if(!quelleZone && typeof bilanEnregistre !== 'undefined' && bilanEnregistre) return;

  const maintenant = Date.now();
  const reste = SECONDES_ENTRE_DEUX_DEPOTS * 1000 - (maintenant - dernierDepotManuel);

  /* ⚠️ UN DÉPÔT BRIDÉ N'EST PAS UN DÉPÔT ANNULÉ.

     David, capture à l'appui : « ça ne garde pas tout, uniquement
     les boutons 😥 ». Elle avait raison, et le défaut était dans ce
     bridage-ci.

     Il ne gardait QUE le premier dépôt de chaque minute et jetait
     les suivants. Or une fiche se remplit ainsi : on coche quatre
     cases en dix secondes — premier dépôt, il ne contient que les
     cases — puis on écrit ses paragraphes. Le dépôt suivant était
     refusé, et si le moniteur s'arrêtait d'écrire là, PLUS AUCUN
     événement ne venait : le texte n'était jamais mis à l'abri.
     Sur le serveur il ne restait que les boutons.

     Un dépôt refusé est donc désormais REPORTÉ à la fin de la
     minute en cours, pas jeté. Ce qui est à l'écran finit toujours
     par partir — au pire soixante secondes plus tard. */
  if(!force && reste > 0){
    if(!depotManuelEnAttente){
      depotManuelEnAttente = setTimeout(() => {
        depotManuelEnAttente = null;
        deposerFicheManuelle(true, quelleZone, quiEtQuoi);
      }, reste + 50);
    }
    return;
  }

  /* Un dépôt immédiat rend le report inutile. */
  if(depotManuelEnAttente){
    clearTimeout(depotManuelEnAttente);
    depotManuelEnAttente = null;
  }

  const info = quiEtQuoi || {};
  const eleve = info.eleve ||
    ($('studentName') && $('studentName').value.trim()) || '';
  if(eleve.length < 2) return;

  /* ⚠️ UN COURS FINI NE SE REDÉPOSE PLUS — v920.

     Ce dépôt-ci part une seconde après la dernière frappe. Sur le
     rendez-vous post-permis, cette seconde tombait APRÈS
     « Terminer » : le brouillon venait d'être retiré, et le
     minuteur en retard le réinstallait dans 🩹 Cours non terminés
     pour un rendez-vous parfaitement enregistré.

     On ne cherche plus à gagner la course — on refuse le dépôt à
     l'entrée. Voir « depotInterdit » dans ec-arriereplan.js. */
  if(typeof depotInterdit === 'function' && depotInterdit(eleve)) return;

  const texte = ficheManuelleEnTexte(quelleZone);
  if(!texte) return;                 /* rien de rempli : rien à déposer */

  dernierDepotManuel = maintenant;

  /* En fond, et sans jamais se plaindre : le dépôt est un filet,
     pas une condition. La sauvegarde locale reste, et un examen ne
     s'arrête pas parce que le réseau tousse. */
  /* ⚠️ LE MIROIR SE LIT, IL NE SE CONTINUE PAS.

     « Quand je reprends un cours manuel, tout le texte apparaît
     dans la case de transcription vocale, je ne peux pas le
     continuer. »

     C'est exact : on n'envoyait QUE le miroir — du texte, fait
     pour être lu par le bureau. Reprendre ne pouvait donc que le
     recoller quelque part, et la seule case qui accepte du texte
     libre est celle de la dictée.

     Les réponses elles-mêmes voyagent maintenant à côté, dans le
     MÊME objet que la sauvegarde sur l'appareil — celui que
     « reprendreBrouillon » sait déjà reposer case par case. Un
     deuxième format aurait fini par ne pas porter la même chose.

     L'écran du rendez-vous post-permis n'a pas de fiche à
     reposer : il garde le miroir seul. */
  let fiche = '';
  if(!quelleZone){
    try{
      const objet = brouillonManuelActuel();
      if(objet){
        const j = JSON.stringify(objet);
        /* Trop gros pour la cellule : mieux vaut le miroir seul
           qu'un objet coupé, qui se reposerait de travers. */
        if(j.length <= 44000) fiche = j;
      }
    }catch(e){ /* la fiche voyage si elle peut ; le miroir part toujours */ }
  }

  /* ⚠️ CE DÉPÔT-CI EST CELUI QUI REVENAIT — v1097. Il part une
     seconde après la dernière frappe, donc parfois une seconde
     avant « Terminer » : la suppression doit l'attendre, sans quoi
     il se range après elle. Voir « suivreLeDepot ». */
  const envoiDuDepot = appelPrep({
    action: 'brouillonSet',
    eleve: eleve,
    dateCours: info.date || ($('lessonDate') && $('lessonDate').value) || '',
    modele: info.modele || ($('modele') && $('modele').value) || '',
    site: info.site || ($('site') && $('site').value) || '',
    transcript: texte,
    fiche: fiche,
    note: ($('noteInterne') && $('noteInterne').value) || ''
  });
  if(typeof suivreLeDepot === 'function') suivreLeDepot(envoiDuDepot);
  envoiDuDepot.catch(() => {});
}

/* Ce qui a été saisi et jamais terminé */
function brouillonManuel(){
  try{
    const b = JSON.parse(localStorage.getItem('bilan_manuel_en_cours') || 'null');
    if(!b || !b.saisies || !b.saisies.length) return null;
    /* Au-delà de deux jours, ce n'est plus le cours en cours */
    if(Date.now() - (b.ts || 0) > 48 * 3600 * 1000) return null;
    return b;
  }catch(e){ return null; }
}

function effacerBrouillonManuel(){
  try{ localStorage.removeItem('bilan_manuel_en_cours'); }catch(e){}
  try{ localStorage.removeItem(CLE_MANUELS); }catch(e){}
}

/* Suit toutes les saisies de la fiche */
function surveillerChampsManuels(){
  const zone = $('manuelChamps');
  if(!zone) return;

  /* LE CLIC AUSSI.

     Les ✅ / ❌ sont des boutons : ils ne déclenchent ni « input »
     ni « change ». Une fiche d'examen où l'on n'avait fait
     qu'appuyer sur des boutons ne s'enregistrait donc JAMAIS toute
     seule — elle n'était gardée qu'en fermant la fiche, et une
     page rechargée entre-temps emportait tout. */
  ['input', 'change', 'click'].forEach(ev => {
    zone.addEventListener(ev, planifierSauvegardeManuelle);
  });

  /* ⚠️ ET À L'INSTANT OÙ L'ON PERD TOUT.

     « Si ça saute, ça disparaît, on ne le retrouve pas. »

     La sauvegarde attend une seconde de calme, le dépôt au plus
     une minute. Entre les deux, l'onglet qui se ferme, le
     téléphone qui s'endort ou le navigateur qui manque de mémoire
     emportaient la dernière minute de travail — sur une fiche
     d'examen, ce sont les trois dernières remarques de
     l'inspecteur.

     Le rendez-vous post-permis avait ce filet depuis le début ; la
     fiche manuelle, non. Posé une seule fois, comme les
     écouteurs au-dessus. */
  if(!zone.dataset.filetSortie){
    zone.dataset.filetSortie = 'oui';
    window.addEventListener('pagehide', () => {
      if(!modeManuel) return;
      try{ sauvegarderManuel(); }catch(e){}
      try{ deposerFicheManuelle(true); }catch(e){}
    });

    /* Et on prévient avant de fermer : un onglet refermé par
       erreur au milieu d'un examen ne doit pas se refermer sans
       rien dire. Le navigateur choisit son texte — on ne fait que
       demander la question. */
    window.addEventListener('beforeunload', e => {
      if(!modeManuel) return;
      const b = brouillonManuelActuel();
      if(!b) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    });
  }
}


/* Relit ce que le moniteur a saisi. Une liste de champs peut être
   fournie : le module d'examen blanc sous la transcription ne relit
   que les siens, sans toucher au reste. */
function lireChampsManuels(champsVoulus){
  const modele = MODELES[$('modele').value];
  /* La fiche handicap se construit ligne par ligne depuis le
     document papier : elle est trop longue pour être écrite à
     la main dans le tableau des schémas. */
  let champs = champsVoulus || ((modele.schema === 'handicap')
    ? schemaHandicap()
    : CHAMPS_MANUELS[modele.schema]);
  if(!champs) return;
  /* ✍️ v1207 — et les zones ajoutées par le créateur de fiches */
  if(!champsVoulus){
    const ouverte = champsDeLaFicheOuverte($('modele').value);
    const ajouts = ouverte ? ouverte.filter(c => c && c.ajout) : [];
    if(ajouts.length) champs = champs.concat(ajouts);
  }

  champs.forEach(ch => {
    if(ch.type === 'cases'){
      /* ✍️ v1207 — des cases seules : les phrases cochées, dans
         l'ordre des cases */
      const cbs = document.querySelectorAll('.caseSeule[data-cle="' + String(ch.cle).replace(/"/g, '') + '"]');
      if(!cbs.length) return;
      const phrases = [];
      Array.prototype.forEach.call(cbs, cb => {
        const c = (ch.cases || [])[Number(cb.value)];
        if(cb.checked && c && c.phrase) phrases.push(String(c.phrase));
      });
      champsManuels[ch.cle] = phrases.join('\n');
    }else if(ch.type === 'liste'){
      /* ▾ v1236 — le ou les choix pris, un par ligne */
      const zl = document.querySelector('[data-zone="' + String(ch.cle).replace(/"/g, '') + '"]');
      if(!zl) return;
      const l = valeurDeLaListeDans(zl, ch.cle);
      if(l.length) champsManuels[ch.cle] = l.join('\n'); else delete champsManuels[ch.cle];
    }else if(ch.type === 'titre' || ch.type === 'sousTitre' ||
       ch.type === 'envoiAvant' || ch.type === 'rappelFrise'){
      /* Ni un intertitre, ni un sous-titre, ni un bouton ne
         portent de réponse */


    }else if(ch.type === 'abc' || ch.type === 'tableauHandicap'){
      /* Les valeurs vivent dans champsManuels : le tableau les y
         pose au fur et à mesure. */
      return;
    }else if(ch.type === 'note3'){
      const el = document.getElementById(idChamp(ch.cle));
      if(el && String(el.value).trim()){
        champsManuels[ch.cle] = String(el.value).trim();
      }
    }else if(ch.type === 'heures'){
      const el = document.getElementById(idChamp(ch.cle));
      if(el && String(el.value).trim()){
        champsManuels[ch.cle] = String(el.value).trim();
      }
    }else if(ch.type === 'inspecteur' || ch.type === 'repassage'){
      /* ⚠️ LA CASE PASSE AVANT LE NOMBRE — v912. Cochée, elle dit
         « aucun repassage », et le 4 resté dans le champ n'est plus
         qu'un reste d'affichage : le relever ferait écrire « Demandé :
         4 heures » sur un élève dont on vient de dire qu'il ne
         repasse pas. */
      const aucun = document.querySelector(
        '.repassageAucun[data-cle="' + String(ch.cle).replace(/"/g, '') + '"]');
      if(ch.type === 'repassage' && aucun && aucun.checked){
        champsManuels[ch.cle] = REPASSAGE_AUCUN;
        return;
      }
      const el = document.getElementById(idChamp(ch.cle));
      if(el && el.value && el.value !== '__autre__'){
        champsManuels[ch.cle] = el.value.trim();
      }
    }else if(ch.type === 'manoeuvres'){
      champsManuels[ch.cle] = Array.prototype.slice
        .call(document.querySelectorAll('.chManuel-' + ch.cle + ':checked'))
        .map(x => ({ nom: x.value, fait: true }));

    }else if(ch.type === 'competences'){
      /* Format attendu par le constructeur : { clé : { statut, erreurs } } */
      const comps = {};
      document.querySelectorAll('.compStatut').forEach(sel => {
        const cle = sel.getAttribute('data-comp');
        if(!cle || !sel.value) return;
        const zone = document.querySelector('.compErreurs[data-comp="' + cle + '"]');
        const erreurs = zone
          ? zone.value.split('\n').map(x => x.trim()).filter(Boolean)
          : [];
        comps[cle] = { statut: sel.value, erreurs: erreurs };
      });
      champsManuels[ch.cle] = comps;
    }else if(ch.type === 'themes'){
      const bouts = [];
      document.querySelectorAll('.themeErreur').forEach(t => {
        const v = t.value.trim();
        if(!v) return;
        const lignes = v.split('\n').map(x => x.trim()).filter(Boolean);
        bouts.push(t.getAttribute('data-theme') + '\n' +
                   lignes.map(x => (x.startsWith('•') ? x : '• ' + x)).join('\n'));
      });
      champsManuels[ch.cle] = bouts.join('\n\n');
    }else if(ch.type === 'cepc'){
      const cepc = {};
      document.querySelectorAll('.cepcNiveau').forEach(s => {
        if(s.value) cepc[s.getAttribute('data-comp')] = s.value;
      });
      champsManuels[ch.cle] = cepc;
    }else if(ch.type === 'entete'){
      /* Chaque case remplit sa propre clé du bilan */
      document.querySelectorAll('.enteteCase').forEach(cb => {
        champsManuels[cb.getAttribute('data-cle')] = cb.checked ? '✅' : '❌';
      });
      document.querySelectorAll('.enteteTexte').forEach(i => {
        champsManuels[i.getAttribute('data-cle')] = i.value.trim();
      });

    }else if(ch.type === 'autonomie'){
      /* Le texte et le nombre de crans voyagent ensemble : reposer
         l'un sans l'autre rendrait une fiche qui dit « son autonomie
         n'y était pas » avec la ligne du CEPC au maximum. */
      const za = document.querySelector('.zoneAutonomie');
      const ta = za ? za.querySelector('.autonomieTexte') : null;
      champsManuels[ch.cle] = {
        texte: ta ? ta.value.trim() : '',
        moins: za ? Number(za.dataset.moins || 0) : 0,
        ligne: za ? (za.dataset.ligne || '') : ''
      };

    }else if(ch.type === 'observations'){
      const obs = [];
      /* ⚠️ CHAQUE BLOC N'ENREGISTRE QUE SES LIGNES. Ici, et ici
         seulement, on ne veut PAS toutes les zones : les
         observations de l'inspecteur et les lignes de manœuvre ont
         chacune leur clé dans le bilan. Les compter ensemble ferait
         écrire les deux listes dans les deux clés. */
      const zObs = document.getElementById(ch.zone || 'obsManuel');
      Array.prototype.forEach.call((zObs && zObs.children) || [], d => {
        const i = d.querySelector('.obsInsp');
        const r = d.querySelector('.obsRep');
        const vi = i ? i.value.trim() : '';
        const vr = r ? r.value.trim() : '';
        /* La catégorie du CEPC accompagne l'observation : elle
           décide du E et du rangement dans le bilan. */
        const cat = d.dataset ? (d.dataset.categorie || '') : '';
        const grave = d.dataset ? (d.dataset.grave || '') : '';
        const moins = d.dataset ? (d.dataset.moins || '') : '';
        const ment = d.dataset ? (d.dataset.mention || '') : '';
        /* ⚠️ ET LE LIEN VERS SON POINT — v1004. Il voyage avec la
           marque, sinon le brouillon repris ne saurait plus quel
           point de la carte cette ligne désignait. */
        const pt = d.dataset ? (d.dataset.point || '') : '';
        if(vi || vr){
          obs.push({ inspecteur: vi, reponse: vr, categorie: cat,
                     grave: grave, moins: moins, mention: ment,
                     point: pt });
        }
      });
      champsManuels[ch.cle] = obs;

    }else if(ch.type === 'rubriques'){
      /* Chaque rubrique écrit sa propre clé : « rubriques.pad »
         devient ai.rubriques.pad, ce que blocRubriques() attend. */
      document.querySelectorAll('.rubriqueManuelle').forEach(t => {
        champsManuels[t.getAttribute('data-cle')] = t.value.trim();
      });

    }else if(ch.type === 'eval3'){
      /* L'état est posé au clic ; il ne reste que le détail.
         Son identifiant remplace TOUS les points : « rubriques.pad »
         en compte un, et replace('.','_') n'en remplace qu'un seul. */
      const t = document.getElementById('manEval_' + ch.cle.split('.').join('_'));
      if(t) champsManuels[ch.cle + '.commentaire'] = t.value.trim();

    /* ⚠️ « nonMene » EST DANS CETTE LISTE, ET IL DOIT Y ÊTRE. Sa
       valeur vit dans « champsManuels », posée au clic — comme les
       ✅/❌ et les boutons de niveau. La lecture générique
       ci-dessous prend « .value » de l'élément qui porte l'id : sur
       un <button>, c'est la chaîne vide, et elle effacerait la case
       à chaque relecture de la fiche. */
    }else if(ch.type !== 'ok' && ch.type !== 'photo' &&
             ch.type !== 'niveau' && ch.type !== 'ouinon' &&
             ch.type !== 'nonMene'){
      const t = document.getElementById(idChamp(ch.cle));
      if(t) champsManuels[ch.cle] = t.value.trim();
    }
  });
}

/* Assemble le bilan à partir de ce qui a été saisi */
async function genererBilanManuel(){
  /* On relève d'abord tout ce que le moniteur a saisi */
  lireChampsManuels();
  /* ✍️ v1207 — la fiche telle qu'il l'a remplie (zones ajoutées) */
  const ficheDuBilan = champsDeLaFicheOuverte($('modele').value);
  /* ▾ v1236 — une zone qu'une liste a laissée cachée ne parle pas */
  const cacheesParListes = ficheDuBilan ? clesCacheesParListes(ficheDuBilan, champsManuels) : [];

  /* ⚠️ LE TRAJET SE CLÔT ET SE SIGNALE ICI — v997. Avant tout le
     reste : le questionnaire de fin dure, et pendant ce temps le
     relevé continuerait de tourner et d'allonger la durée du
     cours. C'est la MÊME règle qu'en vocal — un trajet coupé se
     dit AVANT de générer — et c'est la fonction du module trajet
     qui la porte, pas une copie ici. Voir ec-trajet.js.

     Elle rend « false » si le moniteur préfère renoncer : on
     n'écrit rien, rien n'est perdu, il peut revenir. */
  if(typeof signalerLeTrajetAvantDeGenerer === 'function' &&
     !(await signalerLeTrajetAvantDeGenerer())){
    return;
  }

  /* ⚠️ CE QUE LES ERREURS DISENT ENTRE DANS LEURS POINTS — v1006.

     David : « sur la page voir en grand, que ça renote tout pour
     l'erreur : réflexion de l'inspecteur, remarque du moniteur ».

     C'est ICI que ça se fait, et pas ailleurs : le moniteur a
     appuyé sur ☠️ en roulant, il a écrit ses remarques après, et le
     texte du bilan se fige à cet instant même. Les deux sont donc
     pris ENSEMBLE et ne peuvent pas diverger — la page dira
     exactement ce que le bilan dit.

     ⚠️ ET AVANT LA CARTE, qui part juste en dessous : c'est avec
     ces textes-là que son lien se fabrique. */
  verserLesErreursDansLesPoints($('modele').value);

  /* ⚠️ ET LA CARTE PART SE DESSINER TOUT DE SUITE — v1003, comme
     en vocal. Le relevé vient d'être clos juste au-dessus : le
     tracé ne bougera plus, ses tuiles peuvent descendre pendant
     que le moniteur remplit son questionnaire de fin. On n'attend
     pas : si ce n'est pas prêt, l'envoi attendra pour nous. */
  if(typeof preparerLaCarteDuTrajet === 'function'){
    try{ preparerLaCarteDuTrajet(); }catch(e){}
  }

  /* Modifiables : l'examen officiel peut basculer d'une boîte à
     l'autre quand la question est posée au moniteur. */
  let modeleCle = $('modele').value;
  let modele = MODELES[modeleCle];

  /* Un examen blanc renseigne déjà sa conclusion : on ne la redemande pas */
  const repris = Object.assign({}, contexteDepart || {});
  if(modeleCle === 'examen-blanc'){
    if(champsManuels.niveau === 'non'){
      repris.ebPasse = 'pasleniveau';
    }else if(champsManuels.niveau === 'peut'){
      /* 🤔 v1117 — LE TROISIÈME BOUTON EXISTAIT ET NE FAISAIT RIEN.

         Le bilan manuel propose « ✅ Oui / 🤔 Pourrait / ⛔ Pas le
         niveau » depuis longtemps (voir la rangée de boutons, plus
         bas dans ce fichier). Mais ici, « peut » ne correspondait
         ni au « non » ni au « oui » : il traversait les deux
         branches sans rien écrire, et « ebPasse » gardait la
         valeur d'avant — le plus souvent vide. Le moniteur
         appuyait sur un bouton qui ne conclut rien.

         Pas d'heures avec : si on savait combien il en reste, on
         n'hésiterait pas. C'est le sens même de la réponse. */
      repris.ebPasse = 'peut';
    }else if(champsManuels.niveau === 'oui'){
      /* ⚠️ « VIDE » ET « ZÉRO » NE SONT PAS LA MÊME CHOSE — v1005.

         David, le 15 septembre : « de base il se met sur une valeur
         alors qu'on en sait rien ».

         Les deux étaient traités ensemble : « 0 » et « pas répondu »
         écrivaient l'un comme l'autre « plus que les 3h » dans le
         suivi. Or « 0 » est une DÉCISION du moniteur — il ne reste
         que les 3h avant l'examen — tandis que vide veut dire qu'il
         n'a rien dit. Le bureau lisait donc une conclusion que
         personne n'avait prise, et s'en servait pour donner une
         date d'examen.

         ⚠️ MAIS LE NIVEAU, LUI, DOIT RESTER. « ebPasse » porte DEUX
         choses à la fois : « a le niveau » et « combien d'heures ».
         Ne rien écrire du tout aurait fait perdre le « ✅ a le
         niveau » avec les heures — une information vraie effacée
         pour en éviter une fausse. D'où « niveauok » : a le niveau,
         heures non précisées. Les écrans qui lisent « ebSuite » le
         comprennent déjà sans changement — tout ce qui n'est pas
         « pasleniveau » vaut « a le niveau », et seuls « 3h » et
         « lecons » écrivent des heures. */
      const h = String(champsManuels.heuresAvant || '').trim();
      if(h === ''){
        repris.ebPasse = 'niveauok';
      }else if(h === '0'){
        repris.ebPasse = '3h';
      }else{
        repris.ebPasse = 'lecons';
        repris.ebLecons = h;
      }
    }
    if(champsManuels.aDate === 'oui' && !repris.examPermis) repris.examPermis = 'prevu';
    if(champsManuels.aDate === 'non' && !repris.examPermis) repris.examPermis = 'aprevoir';

    /* Les heures avant permis remontent au bureau : c'est ce
       qu'il regarde en donnant les dates, et le moniteur vient de
       les décider. */
    await remonterHeuresAuBureau($('studentName').value.trim(),
                                 champsManuels.heuresAvant,
                                 champsManuels.niveau,
                                 true);   /* c'est l'examen blanc */
  }

  /* Mise à jour des infos, comme à la fin d'un cours enregistré.

     Sauf pour l'examen officiel : rien à préparer pour la suite,
     elle se décide au rendez-vous post-permis. */
  const maj = ($('modele').value === 'examen-officiel')
    ? null
    : await ouvrirQuestionnaireDepart(repris, 'Après ce cours', 'Terminer');

  if(maj){
    contexteDepart = maj;

    /* Idem depuis le questionnaire de fin d'un cours ordinaire */
    if(maj.heuresRemontees !== undefined &&
       typeof remonterHeuresAuBureau === 'function' &&
       modeleCle !== 'examen-blanc'){
      /* ⚠️ LA NOTE PART AVEC — v972. C'est elle qui porte « 6ᵉ leçon
         après le dernier ajournement », le repère à partir duquel
         ces heures-là se décompteront. On l'assemble une fois, on
         la donne, puis on la pose : deux assemblages, ce serait
         deux notes qui peuvent différer. */
      const noteDuJour = noteDepuisQuestionnaire(maj);
      await remonterHeuresAuBureau($('studentName').value.trim(),
                                   maj.heuresRemontees,
                                   /* v1117 : la même porte que partout —
                                      voir niveauDepuisLaSuite. */
                                   niveauDepuisLaSuite(maj.ebPasse),
                                   false,           /* cours ordinaire */
                                   maj.heuresDuJour, noteDuJour,
                                   maj.heuresDepuisRang, maj.heuresRangJour);
    }
    appliquerNoteQuestionnaire(noteDepuisQuestionnaire(maj));
  }

  const eleve = $('studentName').value.trim();
  let manoeuvresAvant = [];
  let marquesAvant = null;
  try{
    const d = await chargerDossierEleve(eleve);
    manoeuvresAvant = d.manoeuvres || [];
    marquesAvant = d.marques || null;
  }catch(e){}

  /* Les manœuvres du jour sont au format attendu par le constructeur */
  const liste = (champsManuels.manoeuvres || []).map(x => x.nom || x);

  /* Les clés « avant.carteSD » deviennent des objets imbriqués */
  const donnees = { manoeuvres: liste };
  /* Le simulateur attend « competences », rangé par clé */
  if(champsManuels.competences) donnees.competences = champsManuels.competences;
  const valeursDuBilan = valeursSansLesCachees(champsManuels, cacheesParListes);
  /* 🎯 v1238 — les remarques des zones ajoutées rejoignent celles de la
     manœuvre : rangées sous le CEPC, avec leur mention */
  if(ficheDuBilan){
    const autres = [];
    ficheDuBilan.forEach(c => {
      if(!c || !c.ajout || c.type !== 'observations' || c.cacheFiche || cacheesParListes.indexOf(c.cle) !== -1) return;
      const l = valeursDuBilan[c.cle];
      if(Array.isArray(l)) l.forEach(o => { if(o) autres.push(o); });
      delete valeursDuBilan[c.cle];
    });
    if(autres.length) valeursDuBilan[(MODELES[$('modele').value] && MODELES[$('modele').value].schema === 'rvp' ? 'examenBlanc.' : '') + 'examen.autresRemarques'] = autres;
  }
  Object.keys(valeursDuBilan).forEach(k => {
    /* Les manœuvres sont déjà mises en forme au-dessus : les
       recopier telles quelles remettait des objets { nom, fait }
       là où le constructeur attend des noms, et la fiche
       véhicule ressortait vide. */
    if(k === 'manoeuvres') return;
    if(k.indexOf('.') === -1){ donnees[k] = valeursDuBilan[k]; return; }

    /* Autant de niveaux que la clé en compte. Une seule profondeur
       suffisait tant que les clés valaient « avant.carteSD » ; les
       rubriques d'évaluation en demandent deux
       (« rubriques.pad.statut »), et s'arrêter au premier point
       écrasait toute la rubrique à chaque champ. */
    const chemin = k.split('.');
    let cible = donnees;
    for(let i = 0; i < chemin.length - 1; i++){
      const pas = chemin[i];
      if(!cible[pas] || typeof cible[pas] !== 'object') cible[pas] = {};
      cible = cible[pas];
    }
    cible[chemin[chemin.length - 1]] = valeursDuBilan[k];
  });

  let bilan;
  try{
    const ctxBilan = {
      manoeuvresAvant: manoeuvresAvant,
      marquesAvant: marquesAvant,
      transcript: (typeof aererTexte === 'function'
                    ? aererTexte(champsManuels.texteDicte || '')
                    : (champsManuels.texteDicte || '')),
      note: $('noteInterne').value.trim()
    };
    /* ✍️ v1207 — des zones ajoutées sur la fiche : on garde de quoi
       refaire le bilan à l'identique pour trouver leur place. */
    const avecAjouts = !!(ficheDuBilan && ficheDuBilan.some(c => c && c.ajout));
    const donneesJson = avecAjouts ? JSON.stringify(donnees) : '';
    const ctxJson = avecAjouts ? JSON.stringify(ctxBilan) : '';
    bilan = modele.build(donnees, ctxBilan);
    if(avecAjouts){
      try{
        bilan = placerAjoutsDansLeBilan(bilan, ficheDuBilan, valeursDuBilan, donneesJson,
                                        d => modele.build(d, JSON.parse(ctxJson)));
      }catch(e){
        /* plutôt à la fin que perdues */
        console.warn('Zones ajoutées :', e);
        const l = lignesDesAjoutsFiche(ficheDuBilan.filter(c => c && c.ajout), valeursDuBilan);
        if(l.length) bilan += '\n\n' + l.join('\n');
      }
    }
    /* Un seul rappel des écoutes, quelle qu'en soit la provenance */
    if(typeof unSeulRappelEcoutes === 'function') bilan = unSeulRappelEcoutes(bilan);
    if(typeof blocProcedures === 'function'){
      /* 📍 v1219 — où il en est, sous le rappel de sa frise */
      if(typeof avecOuTuEnEsDuCours === 'function') bilan = avecOuTuEnEsDuCours(bilan);
      bilan += blocProcedures(champsManuels.texteDicte || '');
      if(typeof blocARevoir === 'function') bilan += blocARevoir();
    }

    /* ⚠️ ET LE TRAJET, EXACTEMENT COMME EN VOCAL — v986. David, le
       15 septembre : « là pour le moment on a que les bilans
       généré en vocal ».

       Un bilan rempli à la main n'a pas de dictée : la marque
       « 📍 » n'a nulle part où se poser, et les repères de ces
       cours-là n'allaient nulle part. Ce bloc est l'autre moitié
       du dispositif, et c'est la MÊME fonction qu'en vocal. */
    if(typeof blocTrajet === 'function'){
      bilan += blocTrajet();
    }
  }catch(e){
    console.error('Composition du bilan :', e);
    await informer('Le bilan n\'a pas pu être composé.\n\nDétail : ' + (e && e.message ? e.message : e));
    return;
  }

  /* Les erreurs éliminatoires cochent leur E sur le CEPC. Une
     catégorie touchée plusieurs fois n'est cochée qu'une fois.

     ⚠️ L'EXAMEN OFFICIEL AUSSI, DEPUIS LA v910. Les deux écrans
     posent les mêmes marques avec les mêmes boutons : les faire
     agir différemment, ce serait deux règles pour un même geste —
     et le moniteur qui coche une ☠️ ne sait pas laquelle s'applique.
     « cocherEliminatoiresCepc » lit déjà « champs.observations » en
     second recours : elle n'avait jamais été appelée d'ici, c'est
     tout. Les frises, elles, restent à l'examen blanc : un examen
     officiel n'en pose pas. */
  if(modeleCle === 'examen-blanc' || modeleCle === 'examen-officiel'){
    cocherEliminatoiresCepc(champsManuels);
  }
  if(modeleCle === 'examen-blanc'){
    remplirFrises(champsManuels);
  }

  /* L'examen officiel laisse une trace dans les notes : elle
     servira au rendez-vous post-permis. Un nouvel examen efface
     la précédente — seul le dernier permis compte. */
  if(modeleCle === 'examen-officiel'){
    const m = mentionExamen(champsManuels, $('monitorName').value.trim());
    const zn = $('noteInterne');
    if(zn){
      /* Toutes les lignes 🔒 s'en vont : l'en-tête comme la note
         libre qui la suit. Seul le dernier examen compte. */
      const sans = zn.value.split('\n')
        .filter(l => l.trim().indexOf('🔒') !== 0)
        .join('\n').trim();
      zn.value = m ? (m + (sans ? '\n' + sans : '')) : sans;
    }

    /* ⚠️ ET LE CEPC PART DANS SA CASE, PAS DANS LA NOTE.

       Une grille de quatorze notes écrite en toutes lettres puis
       relue pour être redessinée, c'est « la note est un compte
       rendu, pas une source ». Elle a sa colonne ; le rendez-vous
       post-permis la lit telle quelle. */
    enregistrerCepcInterne(eleve, champsManuels.cepc);
  }

  /* ✍️ v1208 — les zones « 🔒 Pour nous seulement » vont dans la note
     interne. ICI, APRÈS le bilan et après le ménage des lignes 🔒 de
     l'examen officiel : rien ne peut les faire passer dans le texte
     de l'élève, ni les effacer. */
  if(ficheDuBilan && ficheDuBilan.some(c => c && c.pourNous) && $('noteInterne')){
    $('noteInterne').value = poserPourNousDansLaNote($('noteInterne').value, ficheDuBilan, valeursDuBilan);
  }
  /* 🎨 v1236 — les lignes à colorer dans le mail et « 📖 Mes leçons » */
  couleursBilanCourant = null;
  if(ficheDuBilan && ficheDuBilan.some(c => c && c.couleurs && c.couleurs.b)){
    try{
      couleursBilanCourant = { eleve: eleve, jour: $('lessonDate').value,
        lignes: couleursDesLignesDuBilan(bilan, ficheDuBilan, valeursDuBilan, cacheesParListes) };
    }catch(e){ couleursBilanCourant = null; }
  }

  currentLessonMeta = {
    modeleLabel: modele.label,
    studentName: eleve,
    monitorName: $('monitorName').value.trim(),
    site: $('site').value,
    dateStr: $('lessonDate').value,
    noteInterne: $('noteInterne').value.trim(),
    ts: Date.now()
  };

  $('resultText').value = bilan;
  if(typeof remplirChoixProcedures === 'function') remplirChoixProcedures();
  afficherNote($('noteInterne').value.trim());
  marquerExport(false);
  $('manuelView').style.display = 'none';
  $('resultView').style.display = 'block';
  /* ⚠️ LE TIROIR DES REPÈRES, OUI. L'IA, NON — ET C'EST UNE
     DÉCISION, PAS UN OUBLI.

     David, le 15 septembre : « Non pas d'IA dans les bilans
     manuels ».

     La raison tient en une phrase : l'IA ne nomme pas un repère en
     devinant, elle lit ce qui a été DIT juste avant la marque
     « 📍n ». Un bilan rempli à la main n'a pas de dictée — il n'y
     a donc aucun texte autour des marques. Lui demander un titre
     quand même, c'est exactement la situation où elle invente, et
     le titre inventé partirait à l'élève, qui le lirait comme un
     vrai point de travail.

     Le moniteur a le tiroir avec les champs vides, et le repère
     avec son heure en face. Il tape, ou il laisse vide.

     ⚠️ NE PAS AJOUTER « proposerLesNomsDesReperes » ICI, même en
     paraissant rendre service : test-trajet-range.js le refuse. */
  if(typeof montrerLeTrajetDansLeBilan === 'function') montrerLeTrajetDansLeBilan();
  window.scrollTo(0, 0);
  sauvegarderLocal(true);

  /* Seul le brouillon de cet élève disparaît : ceux des autres
     examens de la matinée restent. */
  effacerBrouillonDe($('studentName').value.trim());
  try{ localStorage.removeItem('bilan_manuel_en_cours'); }catch(e){}

  /* Et celui du serveur avec lui : le bilan est composé, la fiche
     n'a plus à traîner dans 🩹 Cours non terminés. Exactement ce
     que fait la dictée après sa génération. */
  if(typeof retirerBrouillonServeur === 'function'){
    retirerBrouillonServeur($('studentName').value.trim());
  }

  avantExamenEnvoye = false;
}

/* Rouvre un bilan manuel interrompu */
/* ============================================================
   L'AVANT-EXAMEN, ENVOYÉ SANS ATTENDRE

   Le jour d'un examen, plusieurs élèves se relaient au volant.
   Chacun reçoit sa partie « avant examen » dès qu'il descend,
   sans attendre que l'inspecteur ait vu tout le monde.

   Le bilan complet part ensuite, avec les deux parties.
   ============================================================ */

async function envoyerAvantExamen(){
  const eleve = $('studentName').value.trim();
  if(!eleve){ showToast("Saisis le nom de l'élève."); return; }

  lireChampsManuels();

  /* Les réponses sont rangées à plat, sous « avantExamen.xxx » —
     pas dans un objet. Les chercher au mauvais endroit rendait un
     message vide. */
  const lire = nom => {
    if(champsManuels['avantExamen.' + nom] !== undefined){
      return champsManuels['avantExamen.' + nom];
    }
    const objet = champsManuels.avantExamen;
    return (objet && objet[nom] !== undefined) ? objet[nom] : '';
  };

  /* On ne construit que la première moitié : le reste n'est pas
     encore rempli, et l'annoncer vide n'aurait pas de sens. */
  const texte = [
    '👋 𝗔𝗩𝗔𝗡𝗧 𝗧𝗢𝗡 𝗘𝗫𝗔𝗠𝗘𝗡',
    '',
    '𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗮𝘁𝗶𝗼𝗻 ' + (lire('installation') || '✅️❌️'),
    '𝗣𝗮𝘀𝘀𝗮𝗴𝗲𝗿 ' + (lire('passager') || '✅️❌️'),
    '𝗩𝗼𝘆𝗮𝗻𝘁𝘀 ' + (lire('voyants') || '✅️❌️'),
    ''
  ];

  const err = String(lire('erreurs') || '').trim();
  if(err){
    texte.push('𝙀𝙧𝙧𝙚𝙪𝙧𝙨 𝙖̀ 𝙣𝙚 𝙥𝙖𝙨 𝙧𝙚𝙛𝙖𝙞𝙧𝙚 :');
    texte.push(err);
    texte.push('');
  }

  texte.push('Le bilan complet suivra après ton examen. Courage ! 🍀');

  const message = texte.join('\n');

  /* On garde d'abord : ce qui suit peut échouer, pas la
     sauvegarde. */
  avantExamenEnvoye = true;
  sauvegarderManuel();
  /* 🎓 v1160 — direct : la carte et la rangée « Mes examens » le
     disent tout de suite, sans recharger. */
  try{ dessinerMesExamens(); }catch(e){}
  if(typeof afficherPrepares === 'function'){ try{ afficherPrepares(false, true); }catch(e){} }
  /* Et on dépose sans attendre : la partie avant examen vient de
     partir à l'élève, c'est le moment le plus coûteux à refaire. */
  try{ deposerFicheManuelle(true); }catch(e){}

  ouvrirEnvoiAvant(eleve, message);
}


function ouvrirEnvoiAvant(eleve, message){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 94vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML = '<h3>📤 Avant examen — ' +
    String(eleve).replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;' +
      'line-height:1.5;">Sa fiche reste en haut de l\'écran : tu la ' +
      'rouvriras pour la partie examen.</div>';

  const z = document.createElement('textarea');
  z.rows = 11;
  z.value = message;
  z.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:13px;' +
    'line-height:1.6;font-family:inherit;resize:vertical;margin-bottom:10px;';
  boite.appendChild(z);

  const r1 = document.createElement('div');
  r1.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;';

  const bCop = document.createElement('button');
  bCop.className = 'btn btn-secondary';
  bCop.style.cssText = 'flex:1;padding:11px;font-size:13px;margin:0;';
  bCop.textContent = '📋 Copier';
  bCop.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(z.value);
      showToast('Copié ✅');
    }catch(e){ z.focus(); z.select(); showToast('Ctrl+C pour copier'); }
  });
  r1.appendChild(bCop);

  const bMail = document.createElement('button');
  bMail.className = 'btn btn-secondary';
  bMail.style.cssText = 'flex:1;padding:11px;font-size:13px;margin:0;';
  bMail.textContent = '✉️ Par mail';
  bMail.addEventListener('click', async () => {
    let adresse = '';
    try{
      const d = await appelPrep({ action: 'contactEleve', eleve: eleve });
      adresse = ((d && d.contact) || {}).email || '';
    }catch(e){}

    /* L'adresse se confirme avant de partir : elle peut avoir
       changé depuis sa saisie, et un mail perdu ne se signale
       jamais. Même sans adresse connue, on la demande — la fenêtre
       sert à ça. */
    adresse = await confirmerAdresseEleve(eleve, adresse);
    if(!adresse) return;

    bMail.disabled = true;
    bMail.textContent = 'Envoi…';
    try{
      await appelPrep({
        action: 'mailBilan', to: [adresse], genre: 'examen',
        eleve: ($('studentName') && $('studentName').value.trim()) || '',
        sujet: 'Avant ton examen — Évolution Conduites',
        texte: z.value
      });
      bMail.textContent = '✅ Envoyé';
      showToast('Envoyé à ' + adresse + ' ✅');
    }catch(e){
      bMail.disabled = false;
      bMail.textContent = '✉️ Par mail';
      showToast('Impossible : ' + e.message);
    }
  });
  r1.appendChild(bMail);

  boite.appendChild(r1);

  /* ── LES AUTRES EXAMENS DE LA MATINÉE ────────────────────────

     Un moniteur qui présente quatre élèves le même jour faisait
     quatre fois le même trajet : refermer, retourner dans 📅 Mes
     prochains cours, retrouver le suivant, appuyer sur ▶ Ouvrir.

     David : « il faudrait un choix avec les élèves du même
     moniteur qui sont dans mes prochains cours avec le type bilan
     examen officiel le même jour, et que ça ouvre la fiche suivante
     sans que le moniteur doive retourner dans mes prochains
     cours ».

     La liste est déjà en mémoire, et l'ouverture est déjà écrite :
     il n'y a rien à inventer, seulement à relier. */
  const suite = examensAEnchainer($('studentName').value);
  if(suite.length){
    const t = document.createElement('div');
    t.style.cssText = 'font-size:12px;font-weight:700;margin:14px 0 6px;' +
      'color:var(--accent-text);';
    t.textContent = '👤 Enchaîner — ' + suite.length + ' autre' +
      (suite.length > 1 ? 's' : '') + ' examen' +
      (suite.length > 1 ? 's' : '') + ' ce jour-là';
    boite.appendChild(t);

    suite.forEach(x => boite.appendChild(ligneEnchainement(x, fond)));
  }

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bRester = document.createElement('button');
  bRester.className = 'btn btn-secondary';
  bRester.textContent = 'Rester sur la fiche';
  bRester.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bRester);

  const bSuivant = document.createElement('button');
  bSuivant.className = 'btn btn-primary';
  /* Sans personne à enchaîner, le bouton garde son ancien rôle — et
     le dit, plutôt que de laisser croire à une liste vide. */
  bSuivant.textContent = suite.length ? '📋 Revenir à la liste'
                                      : '👤 Élève suivant';
  bSuivant.title = suite.length
    ? 'Fermer sans ouvrir personne'
    : "Aucun autre examen officiel ce jour-là pour toi";
  bSuivant.addEventListener('click', () => {
    fermerFond(fond);
    fermerBilanManuel();
    $('studentName').value = '';
    if(typeof proposerReprise === 'function') proposerReprise();
    showToast('Fiche gardée — reprends-la en haut après l\'examen');
  });
  r.appendChild(bSuivant);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* ------------------------------------------------------------
   LES EXAMENS OFFICIELS QUI RESTENT À CE MONITEUR, CE JOUR-LÀ

   Rien n'est demandé au réseau : « prepares » est chargé depuis
   l'ouverture de l'application, et l'ordre est celui que le
   moniteur a lui-même posé dans sa liste — c'est lui qui connaît
   l'enchaînement de sa matinée.
   ------------------------------------------------------------ */
function examensAEnchainer(eleveActuel){
  if(typeof prepares === 'undefined' || !prepares) return [];

  const jour = ($('lessonDate') && $('lessonDate').value) ||
               (typeof todayLocal === 'function' ? todayLocal() : '');
  if(!jour) return [];

  const moi = ($('monitorName') && $('monitorName').value.trim()) ||
              (typeof ACCES !== 'undefined' ? (ACCES.moniteur || '') : '');
  const sansMoi = normaliserMot(eleveActuel || '');

  /* Ce qui a déjà été envoyé, élève par élève : un ✅ vaut mieux
     qu'un nom de plus à reconnaître dans une liste. */
  const dejaEnvoye = {};
  (typeof tousLesBrouillons === 'function' ? tousLesBrouillons() : [])
    .forEach(b => {
      if(b && b.eleve && b.avantEnvoye) dejaEnvoye[normaliserMot(b.eleve)] = true;
    });

  /* 🎓 v1160 — LE MÊME BLOC, PAS LA MÊME JOURNÉE. Un moniteur peut
     présenter un bloc le matin à Saint-Brieuc et un autre l'après-midi
     à Loudéac : on n'enchaîne qu'avec les élèves de SA session. */
  const bloc = blocDExamenDe(eleveActuel, jour, moi);

  return prepares
    .filter(c => {
      if(String(c.date || '') !== jour) return false;
      if(String(c.modele || '') !== 'examen-officiel') return false;
      if(!c.eleve || normaliserMot(c.eleve) === sansMoi) return false;
      if(bloc && !bloc.noms[normaliserMot(c.eleve)]) return false;
      /* Le cours d'un autre ne s'ouvre pas d'ici : chargerPrepare
         le refuserait, autant ne pas le proposer. */
      if(c.moniteur && normaliserMot(c.moniteur) !== normaliserMot(moi)) return false;
      return true;
    })
    /* Le même ordre que dans 📅 Mes prochains cours : celui du
       moniteur d'abord, la création pour départager. */
    .sort((a, b) => {
      const oa = a.ordre || 0, ob = b.ordre || 0;
      if(oa && ob) return oa - ob;
      if(oa) return -1;
      if(ob) return 1;
      return String(a.id || '').localeCompare(String(b.id || ''));
    })
    .map(c => Object.assign({}, c, { fait: !!dejaEnvoye[normaliserMot(c.eleve)] }));
}

/* Une ligne de la liste d'enchaînement. */
function ligneEnchainement(cours, fond){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:100%;margin:0 0 6px;padding:10px 12px;' +
    'font-size:13px;text-align:left;display:flex;align-items:center;gap:9px;' +
    (cours.fait ? 'opacity:.6;' : '');

  /* L'heure se lit comme dans 📅 Mes prochains cours, par la même
     fonction : deux lectures de la même note finiraient par ne pas
     trouver la même heure. */
  const heure = (typeof heureDeLaPreparation === 'function')
    ? (heureDeLaPreparation(cours) || '') : '';

  b.innerHTML = '<span style="flex:0 0 auto;">' +
      (cours.fait ? '✅' : '▶') + '</span>' +
    '<span style="flex:1;min-width:0;">' +
      (heure ? '<span style="color:var(--muted);">' + echapper(heure) +
               '</span> ' : '') +
      '<strong>' + echapper(cours.eleve) + '</strong>' +
      (cours.fait ? '<br><span style="font-size:11px;color:var(--muted);">' +
                    'partie avant examen déjà envoyée</span>' : '') +
    '</span>';

  b.addEventListener('click', async () => {
    if(b.disabled) return;
    b.disabled = true;
    b.style.opacity = '.6';

    /* ⚠️ ON REFERME AVANT D'OUVRIR, ET DANS CET ORDRE.

       « fermerBilanManuel » commence par « sauvegarderManuel » : la
       fiche qu'on quitte est mise à l'abri avant que l'écran ne
       change. Ouvrir d'abord l'écraserait avec celle du suivant, et
       le travail de l'examen en cours serait perdu — bien pire que
       le trajet qu'on répare ici. */
    if(fond.parentNode) fermerFond(fond);
    fermerBilanManuel();

    /* Et l'ouverture est CELLE DU BOUTON ▶ Ouvrir, pas une
       deuxième : un second chemin pour ouvrir un cours préparé
       finirait par ne plus faire la même chose que le premier. */
    if(typeof chargerPrepare === 'function'){
      try{
        await chargerPrepare(cours);
        showToast('👤 ' + cours.eleve);
      }catch(e){
        showToast('Impossible : ' + (e.message || e));
      }
    }
  });

  return b;
}


/* ============================================================
   🎓 RETROUVER SES FICHES D'EXAMEN — v1160

   David, le 13 octobre : « avec la refonte, les moniteurs ne
   retrouvent pas les cours des bilans examen quand ils ont plusieurs
   élèves — ils remplissent d'abord la partie avant examen, ensuite
   c'est un autre élève, voire encore un autre, et ensuite ils ont
   leur examen ». Son choix sur le schéma : A + C.
     A · la carte de 📅 Mes prochains cours dit que la fiche attend,
         et son bouton la REPREND (voir ouvrirBilanManuel) ;
     C · en haut de la fiche ouverte, « 🎓 Mes examens » : les élèves
         du même bloc, un appui pour passer de l'un à l'autre.
   Et : « il faut que ce soit direct » (sans recharger), et « faire
   attention si un moniteur a plusieurs blocs d'examen par jour —
   bien comparer avec les groupes de suivi examen ».
   ============================================================ */
let ouvertureParReprise = false;

/* La fiche commencée de cet élève, pour ce type de bilan — ou null.
   Sans type, n'importe laquelle des siennes. */
function ficheCommenceeDe(eleve, modele){
  const qui = normaliserMot(eleve || '');
  if(!qui) return null;
  return tousLesBrouillons().find(b => b && normaliserMot(b.eleve || '') === qui &&
    (!modele || !b.modele || b.modele === modele)) || null;
}

function heureDeLaFiche(b){
  const d = new Date((b && b.ts) || Date.now());
  return String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0');
}

/* LE BLOC D'EXAMEN DE CET ÉLÈVE, CE JOUR-LÀ.

   ⚠️ C'EST LA SESSION DU 🎓 SUIVI PERMIS QUI LE DIT : un bloc, c'est
   un centre, une heure, les élèves qu'on y a placés. Deux blocs le
   même jour pour le même moniteur ne se mélangent donc pas. Sans
   session connue (suivi pas encore lu, élève hors session), on
   retombe sur les examens préparés du même jour, du même moniteur et
   du même centre. Rend { noms:{clé:true}, liste:[noms dans l'ordre],
   centre, heure } ou null. */
function blocDExamenDe(eleve, jour, moniteur){
  const qui = normaliserMot(eleve || '');
  if(!qui || !jour) return null;
  const sessions = (typeof sessionsPermis !== 'undefined' && Array.isArray(sessionsPermis)) ? sessionsPermis : [];
  const s = sessions.find(x => x && String(x.date || '') === jour &&
    (x.eleves || []).some(p => normaliserMot(p.eleve || '') === qui));
  if(s){
    const places = (s.eleves || []).filter(p => p && p.eleve)
      .slice().sort((a, b) => String(a.heure || '').localeCompare(String(b.heure || '')) || (a.rang || 0) - (b.rang || 0));
    const noms = {};
    places.forEach(p => { noms[normaliserMot(p.eleve)] = true; });
    return { noms: noms, liste: places.map(p => p.eleve), heures: places.map(p => p.heure || ''),
             centre: s.centre || '', heure: s.heureDebut || '', session: s.id || '' };
  }
  const liste = (typeof prepares !== 'undefined' && Array.isArray(prepares)) ? prepares : [];
  const moi = normaliserMot(moniteur || '');
  const sien = liste.find(c => String(c.date || '') === jour && normaliserMot(c.eleve || '') === qui &&
                               String(c.modele || '') === 'examen-officiel');
  const lot = liste.filter(c => String(c.date || '') === jour && String(c.modele || '') === 'examen-officiel' &&
    (!moi || !c.moniteur || normaliserMot(c.moniteur) === moi) &&
    (!sien || !sien.site || !c.site || normaliserMot(c.site) === normaliserMot(sien.site)));
  if(!lot.some(c => normaliserMot(c.eleve || '') === qui)) return null;
  const heure = c => (typeof heureDeLaPreparation === 'function') ? (heureDeLaPreparation(c) || '') : '';
  lot.sort((a, b) => heure(a).localeCompare(heure(b)));
  const noms = {};
  lot.forEach(c => { noms[normaliserMot(c.eleve)] = true; });
  return { noms: noms, liste: lot.map(c => c.eleve), heures: lot.map(heure),
           centre: (sien && sien.site) || '', heure: '', session: '' };
}

/* Où en est chaque élève du bloc : 📤 avant examen envoyé, 📝 fiche
   commencée, ⏳ à ouvrir (cours préparé), ✅ bilan enregistré
   aujourd'hui, ou rien d'ouvrable. */
function etatDansLeBloc(nom, jour){
  const b = ficheCommenceeDe(nom, 'examen-officiel');
  if(b) return { cle: b.avantEnvoye ? 'envoye' : 'commence', rond: b.avantEnvoye ? '📤' : '📝', fiche: b,
                 dit: b.avantEnvoye ? 'avant examen envoyé à ' + heureDeLaFiche(b) : 'fiche commencée à ' + heureDeLaFiche(b) };
  const cours = ((typeof prepares !== 'undefined' && prepares) || []).find(c =>
    String(c.date || '') === jour && String(c.modele || '') === 'examen-officiel' &&
    normaliserMot(c.eleve || '') === normaliserMot(nom));
  if(cours) return { cle: 'aouvrir', rond: '⏳', cours: cours, dit: 'pas encore commencée' };
  const e = (typeof eleveDuBureau === 'function') ? eleveDuBureau(nom) : null;
  const p = String(jour || '').split('-');
  const jourFr = p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
  if(e && String(e.date || '').slice(0, 10) === jourFr && /examen/i.test(String(e.type || ''))){
    return { cle: 'fait', rond: '✅', dit: 'bilan enregistré' };
  }
  return { cle: 'rien', rond: '·', dit: 'pas de cours préparé pour lui' };
}

/* ── C · la rangée « 🎓 Mes examens », en haut de la fiche ── */
function dessinerMesExamens(){
  const z = $('mesExamensBloc');
  if(!z) return;
  z.innerHTML = '';
  z.style.display = 'none';
  if($('modele').value !== 'examen-officiel') return;
  const eleve = $('studentName').value.trim();
  const jour = ($('lessonDate') && $('lessonDate').value) || (typeof todayLocal === 'function' ? todayLocal() : '');
  const moi = ($('monitorName') && $('monitorName').value.trim()) ||
              (typeof ACCES !== 'undefined' ? (ACCES.moniteur || '') : '');
  const bloc = blocDExamenDe(eleve, jour, moi);
  if(!bloc || bloc.liste.length < 2) return;

  z.style.display = 'flex';
  const t = document.createElement('span');
  t.className = 'mesExamensTitre';
  t.textContent = '🎓 Mes examens' + (bloc.centre ? ' · ' + bloc.centre : '') +
                  (bloc.heure ? ' ' + bloc.heure.replace(':', 'h') : '');
  z.appendChild(t);
  bloc.liste.forEach(nom => {
    const ici = normaliserMot(nom) === normaliserMot(eleve);
    const et = ici ? { cle: 'ici', rond: '✍️', dit: 'fiche ouverte' } : etatDansLeBloc(nom, jour);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mesExamensPuce' + (ici ? ' ici' : '') + ' ' + et.cle;
    b.dataset.eleve = nom;
    b.title = nom + ' — ' + et.dit;
    b.textContent = et.rond + ' ' + String(nom).split(/\s+/)[0];
    const ouvrable = !ici && (et.fiche || et.cours);
    if(!ici && !ouvrable) b.disabled = true;
    if(ouvrable) b.addEventListener('click', () => passerALExamenDe(nom, et));
    z.appendChild(b);
  });
}

/* Enregistrer la fiche ouverte, puis ouvrir celle de l'autre élève —
   sa fiche commencée si elle existe, sinon son cours préparé. */
async function passerALExamenDe(nom, et){
  /* ⚠️ ON REFERME AVANT D'OUVRIR — la même règle que l'enchaînement :
     fermerBilanManuel enregistre et dépose la fiche qu'on quitte. */
  fermerBilanManuel();
  if(et.fiche){
    reprendreBrouillon(et.fiche);
    return;
  }
  if(et.cours && typeof chargerPrepare === 'function'){
    try{
      await chargerPrepare(et.cours);
      if(typeof prepareEnCours !== 'undefined' && prepareEnCours === et.cours) await ouvrirBilanManuel();
      showToast('👤 ' + nom);
    }catch(e){ showToast('Impossible : ' + (e.message || e)); }
  }
}

/* ── A · ce que la carte de 📅 Mes prochains cours en dit ── */
function etatFicheSurLaCarte(cours){
  if(!cours || !cours.eleve) return null;
  const b = ficheCommenceeDe(cours.eleve, cours.modele || '');
  if(!b) return null;
  const examen = (b.modele || cours.modele) === 'examen-officiel';
  return {
    fiche: b,
    texte: (b.avantEnvoye ? '📤 Avant examen envoyé à ' : '📝 Fiche commencée à ') + heureDeLaFiche(b) +
           ' — sa fiche t’attend',
    court: (b.avantEnvoye ? '📤 avant examen envoyé ' : '📝 fiche commencée ') + heureDeLaFiche(b),
    bouton: examen ? '↩️ Reprendre sa fiche d’examen' : '↩️ Reprendre sa fiche'
  };
}

function reprendreBilanManuel(){
  reprendreBrouillon(brouillonManuel());
}

/* Rouvre un brouillon précis, choisi dans la liste du haut */
function reprendreBrouillon(b){
  if(!b) return;

  /* On repart de ce qui a déjà été envoyé pour cet élève */
  avantExamenEnvoye = !!b.avantEnvoye;

  if(b.modele){
    $('modele').value = b.modele;
    if(typeof adapterAuModele === 'function') adapterAuModele();
  }
  if(b.moniteur) $('monitorName').value = b.moniteur;
  if(b.eleve) $('studentName').value = b.eleve;
  if(b.site) $('site').value = b.site;
  if(b.date) $('lessonDate').value = b.date;

  if(b.note && $('noteInterne')) $('noteInterne').value = b.note;

  /* Ce qu'il avait répondu au questionnaire revient avec la fiche */
  if(b.quest && typeof contexteDepart !== 'undefined'){
    contexteDepart = b.quest;
  }

  const ban = $('repriseBanner');
  if(ban) ban.style.display = 'none';

  /* ⚠️ LA MÊME PORTE QUE LA REPRISE D'UNE DICTÉE — v1115.
     #manuelView n'a qu'un « data-onglet », donc « hors-vue » ne
     l'atteint pas aujourd'hui ; mais le jour où on lui donne une
     vue, il redeviendrait invisible exactement comme #recordView
     l'était. On passe par la porte commune maintenant, pas le jour
     où ça cassera. */
  if(typeof montrerLEcranDuCours === 'function') montrerLEcranDuCours();

  /* La fiche se dessine, puis on y repose les saisies */
  ouvertureParReprise = true;
  /* ✍️ v1206 — la fiche revient avec SA forme (absente = d'origine) */
  formeImposee = (b.forme && typeof b.forme === 'object') ? b.forme : null;
  const ouverture = ouvrirBilanManuel();
  ouvertureParReprise = false;
  ouverture.then(() => {
    /* ⚠️ LES OBSERVATIONS D'ABORD, ET C'EST UNE QUESTION D'ORDRE.

       « Si ça saute, ça disparaît, on ne le retrouve pas. »

       Les saisies se replacent PAR LEUR RANG parmi les champs de
       la page. Or la zone des observations rouvre avec vingt
       lignes : un examen qui en comptait vingt-cinq décalait donc
       tout ce qui vient après, et la vérification de sécurité —
       « est-ce bien la même case ? » — faisait sauter la suite en
       silence plutôt que d'écrire de travers.

       On rétablit donc le bon NOMBRE de lignes avant de compter
       les rangs. Ensuite seulement, les saisies retombent juste.

       Leurs marques ☠️ ⚠️ ➖ voyagent avec elles : elles vivent sur
       le bloc de la ligne, pas dans un champ, et rien ne les
       reposait jusqu'ici. */
    let n = 0;
    const obs = (b.champs && b.champs.observations) || null;
    if(Array.isArray(obs) && obs.length &&
       typeof replacerObservationsManuelles === 'function'){
      n += replacerObservationsManuelles(obs);
    }

    /* Les lignes de manœuvre reviennent de la même façon, dans leur
       zone à elles : leurs marques ☠️ ⚠️ vivent sur le bloc de la
       ligne, comme celles des observations, et se perdraient tout
       aussi silencieusement. */
    const man = (b.champs && (b.champs['examen.manoeuvre'] ||
                              b.champs.manoeuvre)) || null;
    if(Array.isArray(man) && man.length &&
       typeof replacerObservationsManuelles === 'function'){
      n += replacerObservationsManuelles(man, 'obsManoeuvre', 2);
    }

    /* 🎯 v1238 — l'arrêt de précision et les remarques des zones
       ajoutées : leurs lignes reviennent dans leur zone, de même */
    ((typeof champsDessinesCourants !== 'undefined' && champsDessinesCourants) || []).forEach(ch => {
      if(!ch || ch.type !== 'observations' || !ch.zone || ch.zone === 'obsManoeuvre' || ch.zone === 'obsManuel') return;
      const l = b.champs && b.champs[ch.cle];
      if(Array.isArray(l) && l.length && typeof replacerObservationsManuelles === 'function'){
        n += replacerObservationsManuelles(l, ch.zone, ch.lignes || 2);
      }
    });
    n += replacerSaisiesManuelles(b.saisies);
    /* ▾ v1236 — les choix repris refont apparaître leurs zones */
    if(typeof majZonesSelonListes === 'function') majZonesSelonListes();

    /* ⚠️ ET LE CEPC REPRIS SE REPEINT — v911.

       Ses cases vivent dans un champ caché : les valeurs revenaient
       bien, mais AUCUN bouton ne le montrait. Sur une grille vide
       ça se voyait à peine ; sur une grille qui part du maximum, le
       moniteur verrait tous les points alors que sa fiche en porte
       d'autres — il enverrait un bilan qu'il n'a pas relu.

       Et une note reprise appartient à celui qui l'a posée : les
       marques de provenance tombent, pour qu'aucun recalcul ne
       vienne écraser ce qu'il avait saisi hier. */
    try{
      document.querySelectorAll('.cepcNiveau').forEach(champ => {
        champ.dataset.parDefaut = '';
        champ.dataset.parMoins = '';
        champ.dataset.parElim = '';
        if(typeof repeindreLigneCepc === 'function') repeindreLigneCepc(champ);
      });
      if(typeof majTotalCepc === 'function') majTotalCepc();
    }catch(e){ console.warn('CEPC repris :', e); }

    /* ET CE QUI NE VIT QUE DANS LA MÉMOIRE.

       `ouvrirBilanManuel()` repart de `champsManuels = {}` : les
       réponses des boutons — les ✅ / ❌ de l'avant-examen, les
       A-B-C de la fiche handicap — sont donc à remettre, puis à
       rallumer à l'écran. Remettre l'une sans l'autre serait pire
       que rien : une fiche qui paraît vide et qui produit pourtant
       un bilan rempli. */
    if(b.champs && typeof champsManuels !== 'undefined'){
      Object.keys(b.champs).forEach(k => { champsManuels[k] = b.champs[k]; });

      /* Après les valeurs par défaut, qui se posent sur un
         minuteur : sinon elles repeindraient par-dessus.

         ⚠️ ET ON REPOSE LES VALEURS UNE SECONDE FOIS, ICI — v1160.
         Chaque rangée ✅ ❌ — « appuie » sur son « — » par défaut
         dans un minuteur posé AU DESSIN de la fiche, donc avant
         celui-ci : il passait juste après la ligne du dessus, et
         remettait « » partout. Le repeint lisait ensuite ce vide et
         rallumait « — ». Les ✅ de l'avant-examen ne revenaient donc
         jamais (trouvé en reproduisant le cas de David, le 13
         octobre). On les repose après les défauts, puis on repeint. */
      setTimeout(() => {
        Object.keys(b.champs).forEach(k => { champsManuels[k] = b.champs[k]; });
        try{ repeindreBoutonsManuels(); }catch(e){ console.warn('Boutons :', e); }
        /* L'aperçu d'une évaluation : retouché, il garde la version
           du moniteur et le redit ; sinon il se recalcule. */
        try{ majApercuEval(); }catch(e){ console.warn('Aperçu :', e); }
        try{ majCasesSurvitesse(); }catch(e){}
      }, 0);
      n += Object.keys(b.champs).filter(k => b.champs[k] !== '' &&
                                             b.champs[k] !== undefined).length;
    }

    /* Le récapitulatif du questionnaire se redessine APRÈS la
       fiche : il s'accroche à un cadre qui n'existe pas avant. */
    if(b.quest && typeof afficherSaisieDuJour === 'function'){
      afficherSaisieDuJour(b.quest, 'preparationManuel');
    }
    if(typeof majBoutonCompleter === 'function') majBoutonCompleter();
    showToast(n ? 'Bilan retrouvé — ' + n + ' réponse(s) ✅'
                : 'Bilan rouvert ✅');
  }).catch(() => {});
}


function fermerBilanManuel(){
  /* Enregistrée avant d'être refermée, et remontée en haut : c'est
     là qu'on la reprend après l'examen. La sauvegarde automatique
     attend une seconde de calme — on ne la laisse pas décider. */
  try{ sauvegarderManuel(); }catch(e){}

  /* Et déposée sur le serveur, sans attendre la minute du bridage :
     on referme, donc c'est le moment où la fiche doit être en
     sécurité ailleurs que dans ce téléphone. AVANT « modeManuel =
     false », qui coupe le dépôt. */
  try{ deposerFicheManuelle(true); }catch(e){}

  modeManuel = false;
  $('manuelView').style.display = 'none';
  $('recordView').style.display = 'block';
  /* 🎓 v1160 — LA FICHE RANGÉE REND LA JOURNÉE, TOUT DE SUITE.

     David : « la monitrice doit rafraîchir pour qu'elle puisse
     reprendre, c'est bizarre comme fonctionnement, il faut que ce
     soit direct ». Deux verrous gardaient « Mes prochains cours »
     caché après « Fermer », et le rechargement levait les deux :

       · « afficherVue('cours','cours') » posait « hors-vue » sur la
         liste. L'onglet Cours n'a pas de vues : seul afficherOnglet
         l'en libère — et personne ne l'appelait ;
       · le nom de l'élève restait dans le champ. coursEnRoute() y
         voyait toujours un cours, et « body.cours-ouvert » masquait
         la journée derrière un formulaire vide.

     La fiche est à l'abri — sauvegardée et déposée juste au-dessus.
     Le cours n'est donc plus en route : on vide le nom et on arrête
     le chrono, la porte de « Terminer », qui redessine d'un coup le
     bandeau, l'écran et les cartes. La carte de l'élève dit alors
     aussitôt « sa fiche t'attend », avec le bouton pour la reprendre. */
  if($('studentName')) $('studentName').value = '';
  if(typeof arreterChronoDuCours === 'function') arreterChronoDuCours();
  else if(typeof afficherPrepares === 'function'){
    try{ afficherPrepares(false, true); }catch(e){}
  }
  if(typeof afficherOnglet === 'function') afficherOnglet('cours');
  if(typeof proposerReprise === 'function') proposerReprise();
  window.scrollTo(0, 0);
}


/* Le modèle doit correspondre à la boîte de l'élève : un élève BEA
   ne doit pas recevoir une fiche boîte manuelle, et inversement. */
const MODELE_EQUIVALENT = {
  'conduite-manuelle':      { bea: 'conduite-auto' },
  'conduite-auto':          { bv:  'conduite-manuelle' },
  'aac-manuelle':           { bea: 'aac-auto' },
  'aac-auto':               { bv:  'aac-manuelle' },
  'rdv-prealable-manuelle': { bea: 'rdv-prealable-auto' },
  'rdv-prealable-auto':     { bv:  'rdv-prealable-manuelle' },
  'simu-manuelle':          { bea: 'simu-auto' },
  'simu-auto':              { bv:  'simu-manuelle' },
  'eval-manuelle':          { bea: 'eval-auto' },
  'eval-auto':              { bv:  'eval-manuelle' }
};

function verifierBoiteModele(boite){
  const zone = $('alerteBoite');
  if(!zone) return;
  zone.style.display = 'none';
  zone.innerHTML = '';
  if(!boite) return;

  const actuel = $('modele').value;
  const equiv = MODELE_EQUIVALENT[actuel];
  if(!equiv || !equiv[boite]) return;      /* déjà le bon modèle */

  const cible = equiv[boite];
  if(!MODELES[cible]) return;

  const libelle = (boite === 'bea') ? 'boîte automatique (BEA)' : 'boîte manuelle (BV)';
  zone.style.display = 'block';
  zone.style.cssText = 'display:block;background:var(--warn-bg);border:1px solid var(--red);' +
    'border-radius:10px;padding:11px 12px;margin:-6px 0 14px;font-size:14px;line-height:1.5;';

  const t = document.createElement('div');
  t.innerHTML = '⚠️ Cet élève est en <strong>' + libelle + '</strong>, ' +
    'mais le modèle choisi ne correspond pas.';
  zone.appendChild(t);

  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-top:8px;font-size:14px;padding:11px;';
  b.textContent = '↔️ Passer sur « ' + MODELES[cible].label + ' »';
  b.addEventListener('click', () => {
    $('modele').value = cible;
    zone.style.display = 'none';
    showToast('Modèle adapté ✅');
  });
  zone.appendChild(b);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-manuel.js'] = true;


/* ============================================================
   LE FORMULAIRE, CHAMP PAR CHAMP

   Extrait de ouvrirBilanManuel() pour servir deux fois : la
   fiche à remplir à la main, et le module d'examen blanc glissé
   sous la transcription d'un bilan vocal. Deux rendus séparés
   auraient fini par diverger — c'est toujours le second qu'on
   oublie de corriger.
   ============================================================ */
/* ⚠️ LA LISTE QUI EST À L'ÉCRAN, RETENUE — v968.

   L'aperçu du bloc « 4 - Niveau permis » doit relire la fiche à
   chaque bouton, et la relire EXACTEMENT comme la génération la
   relira : même fonction, même liste de champs. Sans cette
   mémoire, il lui faudrait aller chercher les valeurs lui-même,
   champ par champ — un deuxième lecteur, et l'aperçu finirait par
   montrer autre chose que ce qui part. */
let champsDessinesCourants = null;

/* ============================================================
   ⚠️ L'APERÇU SUIT LES RÉPONSES SANS QU'ON LE PRÉVIENNE — v968

   Huit réponses composent le bloc 4 : le niveau, les heures, la
   date, les deux frises et leurs heures en plus, les heures
   planifiées, les heures posées. Les prévenir une par une
   voudrait dire poser huit rappels — et le neuvième champ ajouté
   n'en aurait pas, sans que rien ne le dise. C'est la parade
   posée chez l'appelant, celle qu'on oublie de refaire.

   Une seule écoute, sur la fiche entière : ce qui change dedans
   refait l'aperçu. Le cadre lui-même est exclu — sinon il se
   réécrirait sous les doigts du moniteur à chaque lettre.
   ============================================================ */
function veillerSurLApercuNiveau(zone){
  if(!zone || !zone.dataset || zone.dataset.veilleApercu === 'oui') return;
  zone.dataset.veilleApercu = 'oui';

  const suivre = ev => {
    const c = ev.target && ev.target.closest ? ev.target.closest : null;
    if(c && (ev.target.closest('.apercuNiveau') ||
             ev.target.closest('.reprendreApercu'))) return;
    /* Au tour suivant : le bouton écrit sa réponse d'abord. */
    setTimeout(() => rafraichirApercuNiveau(), 0);
  };
  zone.addEventListener('click', suivre);
  zone.addEventListener('input', suivre);
}

/* Le bloc, refait à partir des réponses telles qu'elles sont à
   l'écran en ce moment.

   ⚠️ ET RELU PAR LE LECTEUR DE LA GÉNÉRATION. On pourrait aller
   chercher les huit valeurs à la main ; ce serait un deuxième
   lecteur, et l'aperçu finirait par montrer autre chose que ce qui
   part. C'est « lireChampsManuels » qui remplit la fiche pour le
   bilan : c'est lui qu'on rappelle. */
function rafraichirApercuNiveau(){
  const t = document.querySelector('.apercuNiveau');
  if(!t) return;
  if(typeof blocNiveauPermis !== 'function') return;

  /* Il a écrit dedans : son texte est le bon, on n'y revient pas. */
  if(t.dataset.intact === 'non') return;

  try{
    if(typeof lireChampsManuels === 'function'){
      lireChampsManuels(champsDessinesCourants);
    }
  }catch(e){ /* une lecture ratée ne doit pas vider le cadre */ }

  /* Les clés de l'examen blanc sont préfixées dans le rendez-vous
     pédagogique : le bloc les attend sans préfixe. */
  const ai = {};
  const p = prefixeExamenBlanc || '';
  Object.keys(champsManuels).forEach(k => {
    if(p && k.indexOf(p) === 0) ai[k.slice(p.length)] = champsManuels[k];
    else if(!p) ai[k] = champsManuels[k];
  });

  /* Sans quoi il se lirait lui-même : le bloc doit être REFAIT à
     partir des réponses, pas repris du cadre. */
  delete ai.niveauTexte;

  const propose = blocNiveauPermis(ai).join('\n');
  t.value = propose;
  t.dataset.propose = propose;
  t.dataset.intact = 'oui';
  champsManuels[(prefixeExamenBlanc || '') + 'niveauTexte'] = propose;
}

/* ============================================================
   L'ESTIMATION D'UNE ÉVALUATION — v1143

   David, le 12 octobre : « transformer ce que renseignent les
   moniteurs […] en heures à remplir, par contre il faut bien que
   ça garde la conversion en leçons dans le bilan », puis « côté
   moniteur on remet en nombre de leçons ». Et en dessous, « avant
   de générer le bilan, une prévisualisation modifiable ».

   Trois cases chiffrées, puis l'aperçu. L'aperçu se recalcule à
   chaque frappe TANT QUE le moniteur n'y a pas touché ; retouché,
   il garde sa version (« estimationMain ») et « ↺ Recalculer » le
   remet d'après les cases — la règle du bilan des éliminatoires
   de l'examen blanc. Le texte vient de basDuBilanEval
   (ec-modeles.js), la même fonction que le bilan : on relit ce
   qui partira.
   ============================================================ */
function evalAvecLigneBea(){
  /* La ligne « Si passage en BEA » n'existe que sur une évaluation BV */
  return !!($('modele') && $('modele').value === 'eval-manuelle');
}

function dessinerNombreEval(ch, bloc){
  bloc.style.cssText = 'margin-bottom:' + (ch.enHeures ? '4px' : '12px') + ';';

  if(ch.entete){
    const tete = document.createElement('label');
    tete.textContent = ch.entete;
    bloc.appendChild(tete);
  }

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;align-items:center;gap:10px;';
  const l = document.createElement('label');
  l.textContent = ch.nom;
  l.htmlFor = idChamp(ch.cle);
  l.style.cssText = 'flex:1;min-width:0;margin:0;font-size:14px;' +
    'text-transform:none;color:var(--cream);line-height:1.35;letter-spacing:0;';
  r.appendChild(l);

  const i = document.createElement('input');
  i.type = 'number';
  i.min = '0';
  i.step = '1';
  i.inputMode = 'decimal';
  i.id = idChamp(ch.cle);
  i.setAttribute('data-cle', ch.cle);
  i.style.cssText = 'width:74px;flex-shrink:0;background:var(--navy);' +
    'border:1px solid var(--line);color:var(--cream);padding:10px;' +
    'border-radius:10px;font-size:17px;text-align:center;margin:0;font-family:inherit;';
  r.appendChild(i);

  const u = document.createElement('span');
  u.textContent = ch.unite || '';
  u.style.cssText = 'font-size:14px;color:var(--muted);width:50px;flex-shrink:0;';
  r.appendChild(u);
  bloc.appendChild(r);

  const conv = document.createElement('div');
  conv.style.cssText = 'font-size:12px;color:var(--accent-text);text-align:right;' +
    'padding-right:60px;margin-top:6px;min-height:14px;';
  if(ch.enHeures) bloc.appendChild(conv);

  const maj = () => {
    champsManuels[ch.cle] = i.value;
    if(ch.enHeures){
      const n = nombreDeLEval(i.value);
      conv.textContent = (n === null) ? '' : '= ' + chiffreDeLEval(n * 2) + ' h';
    }
  };
  i.addEventListener('input', () => { maj(); majApercuEval(); });
  /* Une fiche reprise retrouve sa valeur sans événement : la
     conversion se relit au premier dessin de l'aperçu. */
  i._majConversion = maj;
}

function dessinerApercuEval(ch, bloc){
  const l = document.createElement('label');
  l.textContent = ch.nom;
  bloc.appendChild(l);
  if(ch.aide){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 6px;line-height:1.4;';
    a.textContent = ch.aide;
    bloc.appendChild(a);
  }

  const t = document.createElement('textarea');
  t.id = idChamp(ch.cle);
  t.className = 'apercuEval';
  t.setAttribute('data-cle', ch.cle);
  t.rows = 24;
  t.style.cssText = 'width:100%;box-sizing:border-box;background:var(--navy);' +
    'border:1px solid var(--line);color:var(--cream);padding:11px 12px;' +
    'border-radius:10px;font-size:14px;line-height:1.55;font-family:inherit;' +
    'resize:vertical;margin:0;';
  bloc.appendChild(t);

  const etat = document.createElement('div');
  etat.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;' +
    'margin-top:8px;font-size:12.5px;color:var(--muted);';
  const dit = document.createElement('span');
  dit.className = 'apercuEvalEtat';
  const re = document.createElement('button');
  re.type = 'button';
  re.className = 'btn btn-secondary apercuEvalRecalcul';
  re.style.cssText = 'width:auto;padding:7px 11px;font-size:13px;margin:0;';
  re.textContent = '↺ Recalculer';
  etat.appendChild(dit);
  etat.appendChild(re);
  bloc.appendChild(etat);

  t.addEventListener('input', () => {
    champsManuels.estimationMain = '1';
    champsManuels[ch.cle] = t.value;
    majApercuEval();
  });
  re.addEventListener('click', () => {
    champsManuels.estimationMain = '';
    majApercuEval();
    if(typeof planifierSauvegardeManuelle === 'function') planifierSauvegardeManuelle();
  });

  /* Après les valeurs par défaut et une éventuelle reprise */
  setTimeout(() => { try{ majApercuEval(); }catch(e){} }, 0);
}

function majApercuEval(){
  const t = document.getElementById(idChamp('estimationTexte'));
  if(!t) return;

  const lire = cle => {
    const el = document.getElementById(idChamp(cle));
    if(el && el._majConversion) el._majConversion();
    return el ? el.value : champsManuels[cle];
  };
  const ai = { simuHeures: lire('simuHeures'), leconsAvant: lire('leconsAvant'),
               leconsApres: lire('leconsApres') };

  const aLaMain = !!champsManuels.estimationMain;
  if(!aLaMain){
    t.value = basDuBilanEval(ai, evalAvecLigneBea());
    champsManuels.estimationTexte = t.value;
  }

  /* Tout le texte d'un coup d'œil : le cadre prend sa hauteur
     (écran caché au dessin : il garde ses 24 lignes). */
  if(t.scrollHeight){
    t.style.height = 'auto';
    t.style.height = (t.scrollHeight + 4) + 'px';
  }

  const bloc = t.parentNode;
  const dit = bloc && bloc.querySelector('.apercuEvalEtat');
  const re = bloc && bloc.querySelector('.apercuEvalRecalcul');
  if(dit) dit.textContent = aLaMain
    ? '✋ Retouché à la main — les cases ne le changent plus'
    : 'Calculé d’après les cases';
  if(re) re.style.display = aLaMain ? '' : 'none';
}

/* ============================================================
   ▾ LES LISTES DÉROULANTES DE LA FICHE — v1236

   David : « que je puisse ajouter des listes déroulantes où je veux,
   et que je puisse les lier avec certaines choses ». Un choix peut
   écrire sa phrase dans le bilan, faire apparaître des zones (cachées
   tant qu'on ne le prend pas), compter une manœuvre faite. « Plusieurs
   choix possibles » : des cases dans la liste.
   ============================================================ */
function dessinerListeFiche(bloc, ch, zone){
  const l = document.createElement('label');
  l.textContent = ch.nom;
  bloc.appendChild(l);
  if(ch.aide){
    const a = document.createElement('div');
    a.className = 'aideFiche';
    a.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 6px;line-height:1.4;';
    a.textContent = ch.aide;
    bloc.appendChild(a);
  }
  const items = choixDeLaListeFiche(ch);
  const pris = valeursDeLaListeFiche(champsManuels[ch.cle]);
  const apres = () => {
    majZonesSelonListes(zone);
    if(typeof planifierSauvegardeManuelle === 'function' && !window.essaiFicheEnCours) planifierSauvegardeManuelle();
  };
  if(!ch.multi){
    const sel = document.createElement('select');
    sel.className = 'listeFiche';
    sel.id = idChamp(ch.cle);
    sel.setAttribute('data-cle', ch.cle);
    sel.style.cssText = 'width:100%;margin:0;padding:9px 11px;font-size:15px;font-weight:700;font-family:inherit;';
    const vide = document.createElement('option');
    vide.value = ''; vide.textContent = '— choisis —';
    sel.appendChild(vide);
    items.forEach(it => {
      const o = document.createElement('option');
      o.value = it.libelle; o.textContent = it.libelle;
      if(Array.isArray(it.voitures) && it.voitures.length){ o.setAttribute('data-voitures', it.voitures.join('|')); planifierMajVoitures(zone); }
      sel.appendChild(o);
    });
    /* un choix d'une fiche reprise qui n'est plus dans la liste reste lisible */
    if(pris[0] && !items.some(it => it.libelle === pris[0])){
      const o = document.createElement('option');
      o.value = pris[0]; o.textContent = pris[0];
      sel.appendChild(o);
    }
    sel.value = pris[0] || '';
    sel.addEventListener('change', () => {
      if(sel.value) champsManuels[ch.cle] = sel.value; else delete champsManuels[ch.cle];
      apres();
    });
    bloc.appendChild(sel);
  }else{
    /* plusieurs choix : des cases, dans un menu qui se déplie */
    const d = document.createElement('details');
    d.className = 'listeFicheMulti';
    d.style.cssText = 'border:1px solid var(--line);border-radius:10px;background:var(--navy);';
    const su = document.createElement('summary');
    su.style.cssText = 'cursor:pointer;padding:9px 11px;font-size:15px;font-weight:700;list-style:none;';
    const resume = () => {
      const l2 = Array.prototype.filter.call(d.querySelectorAll('input.listeFicheCase'), x => x.checked).map(x => x.value);
      su.textContent = (l2.length ? l2.join(' · ') : '— choisis —') + '  ▾';
      return l2;
    };
    d.appendChild(su);
    const corps = document.createElement('div');
    corps.style.cssText = 'padding:2px 11px 8px;';
    const ligne = (lib, voitures) => {
      const lab = document.createElement('label');
      lab.className = 'caseSeuleL listeFicheL';
      lab.style.cssText = 'display:flex;align-items:flex-start;gap:9px;margin:6px 0;font-size:14px;line-height:1.4;' +
        'text-transform:none;color:var(--cream);cursor:pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'listeFicheCase';
      cb.setAttribute('data-cle', ch.cle);
      cb.value = lib;
      cb.checked = pris.indexOf(lib) !== -1;
      cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin-top:1px;';
      if(Array.isArray(voitures) && voitures.length){ lab.setAttribute('data-voitures', voitures.join('|')); lab.style.display = 'none'; planifierMajVoitures(zone); }
      cb.addEventListener('change', () => {
        const l2 = resume();
        if(l2.length) champsManuels[ch.cle] = l2.join('\n'); else delete champsManuels[ch.cle];
        apres();
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(lib));
      corps.appendChild(lab);
    };
    items.forEach(it => ligne(it.libelle, it.voitures));
    pris.forEach(p => { if(!items.some(it => it.libelle === p)) ligne(p, null); });
    if(!items.length){
      const v = document.createElement('div');
      v.style.cssText = 'font-size:12px;color:var(--muted);';
      v.textContent = '(aucun choix pour l’instant)';
      corps.appendChild(v);
    }
    d.appendChild(corps);
    resume();
    bloc.appendChild(d);
  }
}
/* Ce qui est choisi dans une liste, lu dans la page (ou en mémoire) */
function valeurDeLaListeDans(racine, cle){
  const k = String(cle || '').replace(/["\\]/g, '');
  const sel = racine && racine.querySelector('select.listeFiche[data-cle="' + k + '"]');
  if(sel) return sel.value ? [sel.value] : [];
  const cbs = racine ? racine.querySelectorAll('input.listeFicheCase[data-cle="' + k + '"]') : [];
  if(cbs.length) return Array.prototype.filter.call(cbs, x => x.checked).map(x => x.value);
  return valeursDeLaListeFiche(champsManuels[cle]);
}
let zoneListesCourante = null, minuteurListes = null;
function planifierMajListes(zone){
  if(zone) zoneListesCourante = zone;
  clearTimeout(minuteurListes);
  minuteurListes = setTimeout(() => majZonesSelonListes(zoneListesCourante), 0);
}
/* Les zones liées à un choix : là si le choix est pris (en réglage,
   toujours là, avec ce qui les fait apparaître) */
function majZonesSelonListes(racine){
  const zone = racine || zoneListesCourante || $('manuelChamps');
  if(!zone) return;
  const reglage = ficheEnReglage();
  Array.prototype.forEach.call(zone.querySelectorAll('details.listeFicheMulti'), d => {
    const su = d.querySelector('summary');
    const l2 = Array.prototype.filter.call(d.querySelectorAll('input.listeFicheCase'), x => x.checked).map(x => x.value);
    if(su) su.textContent = (l2.length ? l2.join(' · ') : '— choisis —') + '  ▾';
  });
  Array.prototype.forEach.call(zone.querySelectorAll('[data-si-liste]'), b => {
    let conds = [];
    try{ conds = JSON.parse(b.dataset.siListe) || []; }catch(e){ conds = []; }
    const ok = reglage || conds.some(c => valeurDeLaListeDans(zone, c.l).indexOf(c.v) !== -1);
    b.classList.toggle('horsListe', !ok);
    b.classList.toggle('selonListe', reglage);
    if(reglage) b.setAttribute('data-liste-txt', '👁️ apparaît avec ' + conds.map(c => '« ' + c.v + ' »').join(' ou '));
  });
}
/* Les zones cachées par leur liste : leur texte ne part pas dans le
   bilan (il revient si on reprend le choix — David, le 22/10) */
function clesCacheesParListes(champsFiche, valeurs){
  const out = [];
  (champsFiche || []).forEach(c => {
    if(!c || !Array.isArray(c.siListe) || !c.siListe.length) return;
    const ok = c.siListe.some(x => valeursDeLaListeFiche(valeurs[x.l]).indexOf(x.v) !== -1);
    if(!ok) out.push(c.cle);
  });
  return out;
}
function valeursSansLesCachees(valeurs, cachees){
  if(!cachees || !cachees.length) return Object.assign({}, valeurs);
  const o = {};
  Object.keys(valeurs || {}).forEach(k => {
    if(cachees.some(c => k === c || k.indexOf(c + '.') === 0)) return;
    o[k] = valeurs[k];
  });
  return o;
}

/* ============================================================
   🎨 LA COULEUR DES TEXTES D'UNE ZONE — v1236

   David : « changer la couleur des titres, des textes ». Le titre,
   la petite aide, ce que le moniteur écrit. En mode sombre, la couleur
   s'éclaircit pour rester lisible.
   ============================================================ */
function couleurLisibleFiche(c){
  if(!c) return '';
  return document.body.classList.contains('clair') ? c : melangerCouleurFiche(c, '#FFFFFF', 0.4);
}
function peindreTextesFiche(bloc, ch){
  const cc = ch.couleurs || {};
  const enfants = Array.prototype.slice.call(bloc.children);
  const titre = (ch.type === 'titre' || ch.type === 'sousTitre')
    ? enfants.find(e => e.tagName === 'DIV')
    : enfants.find(e => e.tagName === 'LABEL');
  if(cc.t && titre) titre.style.color = couleurLisibleFiche(cc.t);
  if(cc.a && ch.aide){
    const a = enfants.find(e => e !== titre && e.tagName === 'DIV' && String(e.textContent).trim() === String(ch.aide).trim());
    if(a) a.style.color = couleurLisibleFiche(cc.a);
  }
  if(cc.x){
    bloc.querySelectorAll('textarea, input[type="text"], input:not([type]), select, summary').forEach(e => { e.style.color = couleurLisibleFiche(cc.x); });
  }
}

/* 🎨 Dans le bilan (« Aussi dans le bilan ») : les lignes de ce que le
   moniteur a écrit, et le titre de la rubrique au-dessus — repérées par
   leur texte. Le bilan reste un texte simple : la couleur ne se voit
   que dans le mail et dans « 📖 Mes leçons » ; une ligne retouchée
   avant l'envoi la perd. */
let couleursBilanCourant = null;
const RE_RUBRIQUE_BILAN = /^[\u{1D7CE}-\u{1D7FF}]/u;
function couleursDesLignesDuBilan(bilan, champsFiche, valeurs, cachees){
  const lignes = String(bilan || '').split('\n');
  const net = x => String(x == null ? '' : x).trim();
  const out = [];
  const pose = (i, c) => { const t = net(lignes[i]); if(t && c && !out.some(x => x[0] === t)) out.push([t, c]); };
  const indices = t => { const r = []; lignes.forEach((l, i) => { if(net(l) === t) r.push(i); }); return r; };
  (champsFiche || []).forEach(c => {
    const cc = c && c.couleurs;
    if(!cc || !cc.b || !(cc.t || cc.x)) return;
    if(c.pourNous || c.cacheFiche || (cachees || []).indexOf(c.cle) !== -1) return;
    const v = valeurs ? valeurs[c.cle] : undefined;
    if(c.ajout){
      const l = lignesDUnAjoutFiche(c, v);
      if(!l.length) return;
      if(c.type === 'titre' || c.type === 'sousTitre'){ indices(net(l[0])).forEach(i => pose(i, cc.t)); return; }
      const nom = String(c.nom || '').trim();
      const avecTitre = nom && net(l[0]) === net(grasFiche(nom) + ' :');
      if(avecTitre) indices(net(l[0])).forEach(i => pose(i, cc.t || cc.x));
      l.slice(avecTitre ? 1 : 0).forEach(x => indices(net(x)).forEach(i => pose(i, cc.x || cc.t)));
      return;
    }
    if(typeof v !== 'string' || !v.trim()) return;
    let premier = -1;
    v.split('\n').map(net).filter(Boolean).forEach(x => {
      indices(x).forEach(i => { if(premier === -1 || i < premier) premier = i; if(cc.x) pose(i, cc.x); });
    });
    if(cc.t && premier > 0){
      for(let j = premier - 1; j >= Math.max(0, premier - 10); j--){
        if(RE_RUBRIQUE_BILAN.test(net(lignes[j]))){ pose(j, cc.t); break; }
      }
    }
  });
  return out;
}
function jourIsoFiche(d){
  const t = String(d || '').trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return m[1] + '-' + m[2] + '-' + m[3];
  m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
}
/* Les lignes colorées de CE bilan (même élève, même jour), encore
   présentes dans le texte tel qu'il part */
function couleursDuBilanPour(eleve, jour, texte){
  const c = couleursBilanCourant;
  if(!c || !Array.isArray(c.lignes) || !c.lignes.length) return [];
  const n = x => String(x || '').trim().toLowerCase();
  if(n(c.eleve) !== n(eleve) || jourIsoFiche(c.jour) !== jourIsoFiche(jour)) return [];
  const presentes = {};
  String(texte || '').split('\n').forEach(l => { presentes[l.trim()] = true; });
  return c.lignes.filter(x => presentes[x[0]]);
}
/* Gardées pour « 📖 Mes leçons » (D1, par élève et par jour) */
function poserCouleursDuBilan(eleve, jour, texte){
  const l = couleursDuBilanPour(eleve, jour, texte);
  const j = jourIsoFiche(jour);
  if(!l.length || !j || typeof appelPrep !== 'function') return Promise.resolve(null);
  return appelPrep({ action: 'bilanCouleursPoser', eleve: String(eleve || '').trim(), jour: j, lignes: l }).catch(() => null);
}

function dessinerChampsManuels(champs, zone, modele, dossier){
  champsDessinesCourants = champs;
  /* 📝 v1176 — la liste des remarques du CEPC part dès l'ouverture
     d'une fiche qui a des ☠️ : elle sera sur le téléphone avant la
     première, réseau ou pas. */
  if(champs.some(ch => ch && ch.type === 'observations') && typeof chargerRemarquesCepc === 'function'){
    chargerRemarquesCepc();
  }
  veillerSurLApercuNiveau(zone);
  champs.forEach(ch => {
    const bloc = document.createElement('div');
    bloc.style.cssText = 'margin-bottom:16px;';
    /* ✍️ v1206 — chaque zone porte sa clé (le créateur de fiches la
       retrouve), et une zone masquée reste dessinée mais invisible :
       les saisies se comptent par rang, elle doit garder le sien. */
    bloc.dataset.zone = ch.cle;
    if(ch.cacheFiche) bloc.classList.add('ficheCachee');
    /* 🚗 v1211 — une zone réservée à certaines voitures : cachée tant
       qu'on ne sait pas que c'est la bonne */
    if(Array.isArray(ch.voitures) && ch.voitures.length){
      bloc.dataset.voitures = ch.voitures.join('|');
      bloc.classList.add('horsVoiture');
      planifierMajVoitures(zone);
    }
    /* ✍️ v1208 — le moniteur voit que ça ne part pas à l'élève */
    if(ch.pourNous) bloc.classList.add('zonePourNous');

    /* Certains champs ne servent que si l élève a le niveau :
       les montrer ailleurs fait remplir pour rien. */
    if(ch.siNiveau) bloc.dataset.siNiveau = ch.siNiveau;
    /* Les champs de l'examen blanc du RVP : cachés tant que la
       question n'a pas reçu « oui ». */
    if(ch.siEb) bloc.dataset.siEb = ch.siEb;
    /* ▾ v1236 — une zone qu'un choix de liste fait apparaître */
    if(Array.isArray(ch.siListe) && ch.siListe.length){
      bloc.dataset.siListe = JSON.stringify(ch.siListe);
      if(!ficheEnReglage()) bloc.classList.add('horsListe');
      planifierMajListes(zone);
    }

    if(ch.type === 'rappelFrise'){
      /* Sa frise et ses leçons faites : de quoi juger sans
         remonter chercher l'information ailleurs. */
      const frise = (dossierManuel && dossierManuel.frise) ||
                    extraireFrise($('noteInterne').value);
      /* Le numéro écrit dans son dernier bilan fait autorité : un
         élève venu de l'ancien fonctionnement n'a qu'un bilan
         enregistré alors qu'il en est à sa huitième leçon. */
      const faites = leconsFaites();

      if(frise || faites !== null){
        bloc.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
          'padding:10px 12px;margin-bottom:12px;';
        bloc.innerHTML =
          '<div style="font-size:11px;color:var(--muted);margin-bottom:4px;">' +
            '📋 Pour mémoire</div>' +
          (frise
            ? '<div style="font-size:13px;line-height:1.5;">' +
              String(frise).replace(/</g, '&lt;') + '</div>'
            : '') +
          (faites !== null
            ? '<div style="font-size:13px;color:var(--accent-text);' +
              'margin-top:4px;">' + faites + ' leçon(s) déjà effectuée(s)</div>'
            : '');
      }else{
        bloc.style.display = 'none';
      }




    }else if(ch.type === 'tableauHandicap'){
      /* Le tableau du document papier : trois colonnes sur écran
         large, deux sur téléphone — l'observation descend alors
         sous la ligne pour garder de la place où écrire. */
      const t = document.createElement('div');
      t.className = 'ficheEval';

      const tete = document.createElement('div');
      tete.className = 'fe-tete';
      ['Contrôle', 'Niveau', 'Observations'].forEach(x => {
        const s = document.createElement('span');
        s.textContent = x;
        tete.appendChild(s);
      });
      t.appendChild(tete);

      const couleurs = { A:'var(--orange)', B:'#E8850C', C:'var(--red)' };

      (typeof HANDICAP_LIGNES !== 'undefined' ? HANDICAP_LIGNES : [])
        .forEach(l => {
          const cleN = 'handicap.' + l.cle + 'N';
          const cleO = 'handicap.' + l.cle + 'O';

          const li = document.createElement('div');
          li.className = 'fe-ligne ' + (l.titre ? 'fe-rubrique' : 'fe-sous');

          const nom = document.createElement('span');
          nom.className = 'fe-nom';
          nom.textContent = l.nom;
          li.appendChild(nom);

          const notes = document.createElement('div');
          notes.className = 'fe-notes';

          const peindre = () => {
            Array.prototype.forEach.call(notes.children, b => {
              const pris = (b.textContent === champsManuels[cleN]);
              b.style.background = pris ? (couleurs[b.textContent] || 'var(--muted)')
                                        : 'var(--navy)';
              b.style.borderColor = pris ? (couleurs[b.textContent] || 'var(--line)')
                                         : 'var(--line)';
              b.style.color = pris ? '#0B0B0B' : 'var(--cream)';
              b.style.fontWeight = pris ? '800' : '400';
            });
          };

          [['A', 'Bon'], ['B', 'Moyen'], ['C', 'Faible']].forEach(([v, quoi]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn btn-secondary';
            b.textContent = v;
            b.title = quoi;
            b.addEventListener('click', () => {
              /* Un second appui efface : le moniteur se ravise */
              champsManuels[cleN] = (champsManuels[cleN] === v) ? '' : v;
              peindre();
            });
            notes.appendChild(b);
          });

          peindre();
          li.appendChild(notes);

          const obs = document.createElement('div');
          obs.className = 'fe-obs';
          const i = document.createElement('input');
          i.type = 'text';
          i.placeholder = 'Observations';
          i.value = champsManuels[cleO] || '';
          i.addEventListener('input', () => {
            champsManuels[cleO] = i.value;
          });
          obs.appendChild(i);
          li.appendChild(obs);

          t.appendChild(li);
        });

      bloc.appendChild(t);

    }else if(ch.type === 'abc'){
      /* Les trois niveaux du document : A bon, B moyen, C faible.
         Une rubrique se note comme une sous-ligne — le document
         papier laisse les deux notables. */
      bloc.style.cssText = 'margin-bottom:4px;display:flex;gap:10px;' +
        'align-items:center;flex-wrap:wrap;';

      const l = document.createElement('span');
      l.textContent = ch.nom;
      l.style.cssText = 'flex:1;min-width:130px;font-size:14px;' +
        (ch.rubrique ? 'font-weight:700;color:var(--accent-text);'
                     : 'padding-left:14px;color:var(--cream);');
      bloc.appendChild(l);

      const r = document.createElement('div');
      r.id = 'abc_' + ch.cle.replace('.', '_');
      r.setAttribute('data-champ', ch.cle);
      r.style.cssText = 'display:flex;gap:5px;flex-shrink:0;';

      const couleurs = { A:'var(--orange)', B:'#E8850C', C:'var(--red)' };

      [['A', 'Bon'], ['B', 'Moyen'], ['C', 'Faible']].forEach(([v, quoi]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:9px 13px;font-size:14px;margin:0;';
        b.textContent = v;
        b.title = quoi;
        b.setAttribute('data-val', v);

        b.addEventListener('click', () => {
          /* Un second appui efface : le moniteur peut se raviser */
          const pris = (champsManuels[ch.cle] === v);
          champsManuels[ch.cle] = pris ? '' : v;

          Array.prototype.forEach.call(r.children, x => {
            const sien = (x.getAttribute('data-val') === champsManuels[ch.cle]);
            x.style.background = sien ? (couleurs[x.textContent] || 'var(--muted)')
                                      : 'var(--navy)';
            x.style.borderColor = sien ? (couleurs[x.textContent] || 'var(--line)')
                                       : 'var(--line)';
            x.style.color = sien ? '#0B0B0B' : 'var(--cream)';
            x.style.fontWeight = sien ? '800' : '400';
          });
        });

        r.appendChild(b);
      });

      bloc.appendChild(r);

    }else if(ch.type === 'note3'){
      /* La note se reporte sur le CEPC : quatre boutons valent
         mieux qu'un texte à relire. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const d = document.createElement('div');
      d.style.cssText = 'display:flex;gap:6px;';

      const champ = document.createElement('input');
      champ.type = 'hidden';
      champ.id = idChamp(ch.cle);
      champ.value = '';
      d.appendChild(champ);

      const peindre = () => {
        Array.prototype.forEach.call(d.children, b => {
          if(b.tagName !== 'BUTTON') return;
          const pris = (b.textContent === champ.value);
          b.style.background = pris ? 'var(--orange)' : 'var(--navy)';
          b.style.borderColor = pris ? 'var(--orange)' : 'var(--line)';
          b.style.color = pris ? '#0B0B0B' : 'var(--cream)';
          b.style.fontWeight = pris ? '800' : '400';
        });
      };

      ['0', '1', '2', '3'].forEach(v => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:10px 16px;font-size:15px;margin:0;';
        b.textContent = v;
        b.addEventListener('click', () => {
          /* Un second appui efface : le moniteur peut se raviser */
          champ.value = (champ.value === v) ? '' : v;
          champsManuels[ch.cle] = champ.value;
          peindre();
          if(typeof reporterNotesCepc === 'function') reporterNotesCepc();
        });
        d.appendChild(b);
      });

      const s = document.createElement('span');
      s.style.cssText = 'font-size:13px;color:var(--muted);align-self:center;';
      s.textContent = '/ 3';
      d.appendChild(s);

      bloc.appendChild(d);
      peindre();

    }else if(ch.type === 'heures'){
      /* Les heures avant permis : presque toujours un nombre pair
         de 2 à 10. Une liste évite de taper, tout en laissant la
         saisie libre. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const d = document.createElement('div');
      d.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;';

      const inp = document.createElement('input');
      inp.type = 'number';
      inp.id = idChamp(ch.cle);
      inp.min = '0';
      inp.step = '1';
      inp.placeholder = 'autre';
      inp.style.cssText = 'width:84px;font-size:17px;text-align:center;margin:0;';

      const peindre = () => {
        Array.prototype.forEach.call(d.children, b => {
          if(b.tagName !== 'BUTTON') return;
          const pris = (b.textContent === inp.value);
          b.style.borderColor = pris ? 'var(--orange)' : 'var(--line)';
          b.style.color = pris ? 'var(--accent-text)' : 'var(--cream)';
          b.style.fontWeight = pris ? '800' : '400';
        });
      };

      const changer = () => {
        champsManuels[ch.cle] = inp.value;
        peindre();
        if(typeof remplirFrises === 'function'){
          remplirFrises(champsManuels, true);
        }
      };

      ['2', '4', '6', '8', '10'].forEach(v => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:11px 14px;font-size:15px;margin:0;';
        b.textContent = v;
        b.addEventListener('click', () => { inp.value = v; changer(); });
        d.appendChild(b);
      });

      inp.addEventListener('input', changer);
      d.appendChild(inp);
      bloc.appendChild(d);

      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:5px;' +
        'line-height:1.5;';
      a.textContent = 'Les 3h avant examen viennent en plus : ' +
        '« 4 » signifie 4 + 3.';
      bloc.appendChild(a);

    }else if(ch.type === 'niveau' || ch.type === 'ouinon'){
      /* C'est ce champ-là qui commande les « siNiveau » qui suivent */
      if(ch.type === 'niveau') cleNiveauCourante = ch.cle;
      bloc.style.cssText = 'margin-bottom:8px;display:flex;gap:10px;' +
        'align-items:center;flex-wrap:wrap;';
      const l = document.createElement('label');
      l.textContent = ch.nom;
      l.style.cssText = 'flex:1;min-width:140px;margin:0;font-size:14px;' +
        'text-transform:none;color:var(--cream);';
      bloc.appendChild(l);
      const r = document.createElement('div');
      r.id = 'ouinon_' + ch.cle;
      r.style.cssText = 'display:flex;gap:5px;flex-shrink:0;';
      /* Trois issues au niveau : il l'a, il ne l'a pas, ou il
         pourrait l'avoir sans qu'on puisse chiffrer les heures. */
      const choix = (ch.type === 'niveau')
        ? [['✅ Oui', 'oui'], ['🤔 Pourrait', 'peut'],
           ['❌ Pas le niveau', 'non'], ['—', '']]
        : [['✅ Oui', 'oui'], ['❌ Non', 'non'], ['—', '']];
      choix.forEach(([lab, val]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'flex:1;padding:11px;font-size:14px;margin:0;';
        b.textContent = lab;
        b.setAttribute('data-val', val);


        b.addEventListener('click', () => {
          champsManuels[ch.cle] = val;

          /* Le choix doit sauter aux yeux : une bordure seule se
             remarque mal, surtout à bout de bras dans la voiture.

             La même peinture sert quand l'application répond à la
             place du moniteur : rien ne doit distinguer les deux. */
          peindreOuiNon(r, val);

          /* Le niveau décide de ce qui reste utile */
          if(ch.cle === 'examenBlancFait' &&
             typeof majChampsSelonExamenBlanc === 'function'){
            majChampsSelonExamenBlanc();
          }
          if(ch.type === 'niveau' && typeof majChampsSelonNiveau === 'function'){
            majChampsSelonNiveau();
          }
        });
        r.appendChild(b);
      });
      /* Une réponse déjà connue — la date de permis, une frise —
         se montre d'emblée, aussi nettement qu'un choix du
         moniteur. */
      if(champsManuels[ch.cle]) peindreOuiNon(r, champsManuels[ch.cle]);

      bloc.appendChild(r);

    }else if(ch.type === 'rubriques'){
      /* Les neuf rubriques d'erreurs, une zone de texte chacune.

         Le bloc de notes unique qui tenait lieu de formulaire
         n'était lu par aucun constructeur : ce que le moniteur y
         écrivait n'arrivait jamais dans le bilan. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const aide = document.createElement('div');
      aide.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.4;';
      aide.textContent = 'Une remarque par ligne. Une rubrique laissée vide ' +
        'sort avec son titre seul, comme sur la fiche.';
      bloc.appendChild(aide);

      (typeof RUBRIQUES !== 'undefined' ? RUBRIQUES : []).forEach(([cleR, titre]) => {
        const z = document.createElement('div');
        z.style.cssText = 'margin-bottom:10px;';

        const t2 = document.createElement('div');
        t2.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
          'margin-bottom:5px;';
        /* Le titre du bilan, sans sa ponctuation de fin : c'est le
           même repère que le moniteur retrouvera dans le texte. */
        t2.textContent = String(titre).replace(/\s*:\s*$/, '');
        z.appendChild(t2);

        const r = document.createElement('div');
        r.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';

        const t = document.createElement('textarea');
        t.className = 'rubriqueManuelle';
        t.setAttribute('data-cle', ch.cle + '.' + cleR);
        t.rows = 2;
        t.placeholder = 'Une remarque par ligne';
        t.style.cssText = 'flex:1;background:var(--navy);border:1px solid var(--line);' +
          'color:var(--cream);padding:9px 10px;border-radius:10px;font-size:16px;' +
          'line-height:1.5;font-family:inherit;resize:vertical;margin:0;';
        r.appendChild(t);

        if(dicteePossible()){
          const mic = document.createElement('button');
          mic.type = 'button';
          mic.className = 'btn btn-secondary';
          mic.style.cssText = 'width:auto;padding:10px 12px;font-size:17px;margin:0;flex-shrink:0;';
          mic.textContent = '🎙️';
          mic.title = 'Dicter dans ' + t2.textContent;
          mic.addEventListener('click', () => dicterDans(t, mic));
          r.appendChild(mic);
        }

        z.appendChild(r);
        bloc.appendChild(z);
      });
    }else if(ch.type === 'eval3'){
      /* Une rubrique d'évaluation : son état, puis ce qu'il y a à
         corriger. Le bilan attend les deux — un état sans le détail
         ne dit pas à l'élève quoi retravailler.

         Non touchée, la rubrique ressort « ✅ ❌ 🍊 » dans le bilan,
         comme sur la fiche papier : c'est st3o() qui le fait, et
         c'est voulu. */
      const ligne = document.createElement('div');
      ligne.style.cssText = 'display:flex;gap:10px;align-items:center;' +
        'margin-bottom:6px;';

      const l = document.createElement('label');
      l.textContent = ch.nom;
      l.style.cssText = 'flex:1;min-width:0;margin:0;font-size:14px;' +
        'text-transform:none;color:var(--cream);';
      ligne.appendChild(l);

      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:5px;flex-shrink:0;';

      const boutons = [];
      /* Le groupe dit quelle réponse il porte, et chaque bouton
         laquelle il pose : c'est ainsi qu'une reprise sait
         lesquels rallumer. Voir repeindreBoutonsManuels(). */
      r.setAttribute('data-champ', ch.cle + '.statut');
      [['✅', '✅'], ['🍊', '🍊'], ['❌', '❌'], ['—', '']].forEach(([lab, val]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:7px 10px;font-size:15px;margin:0;' +
          'transition:transform .1s, background .1s;';
        b.textContent = lab;
        b.setAttribute('data-val', val);
        boutons.push(b);
        b.addEventListener('click', () => {
          champsManuels[ch.cle + '.statut'] = val;
          boutons.forEach(x => {
            x.style.borderColor = 'var(--line)';
            x.style.background = 'var(--navy)';
            x.style.color = 'var(--cream)';
            x.style.fontWeight = '400';
            x.style.transform = 'none';
            x.style.boxShadow = 'none';
          });
          const couleurs = {
            '✅': ['var(--orange)', '#0B0B0B'],
            '🍊': ['var(--ambre)', 'var(--sur-ambre)'],
            '❌': ['var(--red)', '#FFFFFF'],
            '':   ['var(--muted)', '#0B0B0B']
          };
          const [fond, texte] = couleurs[val] || couleurs[''];
          b.style.background = fond;
          b.style.borderColor = fond;
          b.style.color = texte;
          b.style.fontWeight = '700';
          b.style.transform = 'scale(1.06)';
          b.style.boxShadow = '0 2px 10px rgba(0,0,0,.35)';
        });
        r.appendChild(b);
      });
      ligne.appendChild(r);
      bloc.appendChild(ligne);

      /* Le détail. Un point par ligne, comme dans les autres bilans. */
      const t = document.createElement('textarea');
      t.id = 'manEval_' + ch.cle.split('.').join('_');
      t.rows = 2;
      t.placeholder = 'Ce qu\'il y a à corriger — une ligne par point';
      t.style.cssText = 'flex:1;min-width:0;background:var(--navy);border:1px solid var(--line);' +
        'color:var(--cream);padding:9px 10px;border-radius:10px;font-size:15px;' +
        'line-height:1.5;font-family:inherit;resize:vertical;margin:0;';

      /* 🎙️ AU BOUT DE LA LIGNE — v1143. David : « mettre des micros
         sur toutes les cases en bout de ligne pour pouvoir faire des
         vocaux ». Le même bouton que les cadres de texte libre, et la
         même dictée — celle qui écrit là où est le curseur. */
      const rangee = document.createElement('div');
      rangee.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';
      rangee.appendChild(t);
      if(dicteePossible()){
        const mic = document.createElement('button');
        mic.type = 'button';
        mic.className = 'btn btn-secondary';
        mic.style.cssText = 'width:auto;padding:11px 13px;font-size:18px;margin:0;flex-shrink:0;';
        mic.textContent = '🎙️';
        mic.title = 'Dicter dans ' + ch.nom;
        mic.addEventListener('click', () => dicterDans(t, mic));
        rangee.appendChild(mic);
      }
      bloc.appendChild(rangee);

    }else if(ch.type === 'nombreEval'){
      dessinerNombreEval(ch, bloc);

    }else if(ch.type === 'apercuEval'){
      dessinerApercuEval(ch, bloc);

    }else if(ch.type === 'ok'){
      /* Passager et voyants décident de la note d'installation */
      /* La fin de la clé, pas son égalité : préfixée, elle devient
         « examenBlanc.examen.instPassager ». */
      /* ⚠️ LES CINQ CASES QUI NOURRISSENT LE CEPC — v912.

         Deux pour l'installation, trois pour les vérifications, et
         elles ne s'appellent pas pareil d'un écran à l'autre. Cette
         règle-ci ne connaissait que les deux de l'examen blanc :
         sur un examen officiel, cocher les trois questions ne
         reportait donc RIEN, et la ligne du CEPC gardait ses trois
         points. Voir reporterNotesCepc, qui fait le compte. */
      const surInstallation =
        /(^|\.)examen\.(inst(Passager|Voyants)|passager|voyants|vi|qser|secours)$/
          .test(ch.cle) || !!(ch.cepcMoins && ch.cepcMoins.ligne);
      /* Trois états : ✅ ❌ ou rien. Compact et sur une seule ligne
         avec son libellé : un bilan en compte une dizaine, et de
         gros boutons empilés faisaient défiler pour rien. */
      bloc.style.cssText = 'margin-bottom:8px;display:flex;gap:10px;' +
        'align-items:center;';
      const l = document.createElement('label');
      l.textContent = ch.nom;
      l.style.cssText = 'flex:1;min-width:0;margin:0;font-size:14px;' +
        'text-transform:none;color:var(--cream);';
      bloc.appendChild(l);
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:5px;flex-shrink:0;';
      r.setAttribute('data-champ', ch.cle);
      [['✅','✅'], ['❌','❌'], ['—','']].forEach(([lab, val]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:7px 11px;font-size:15px;margin:0;' +
          'transition:transform .1s, background .1s;';
        b.textContent = lab;
        b.setAttribute('data-val', val);
        b.addEventListener('click', () => {
          champsManuels[ch.cle] = val;

          /* La note d'installation se déduit des deux cases */
          if(surInstallation && typeof reporterNotesCepc === 'function'){
            reporterNotesCepc();
          }

          /* Le choix doit sauter aux yeux : une bordure seule se
             remarque mal, surtout à bout de bras dans la voiture. */
          Array.prototype.forEach.call(r.children, x => {
            x.style.borderColor = 'var(--line)';
            x.style.color = 'var(--cream)';
            x.style.background = 'var(--navy)';
            x.style.fontWeight = '400';
            x.style.transform = 'none';
            x.style.boxShadow = 'none';
          });

          const couleurs = {
            '✅': ['var(--orange)', '#0B0B0B'],
            '❌': ['var(--red)', '#FFFFFF'],
            '':   ['var(--muted)', '#0B0B0B']
          };
          const [fond, texte] = couleurs[val] || couleurs[''];
          b.style.background = fond;
          b.style.borderColor = fond;
          b.style.color = texte;
          b.style.fontWeight = '700';
          b.style.transform = 'scale(1.04)';
          b.style.boxShadow = '0 2px 10px rgba(0,0,0,.35)';
        });
        if((ch.defaut || '') === val) setTimeout(() => b.click(), 0);
        r.appendChild(b);
      });
      bloc.appendChild(r);

    }else if(ch.type === 'manoeuvres'){
      const liste = BLOC.ficheListeConduite;
      const dejaFaites = (dossier.manoeuvres || []).map(normaliserMot);
      /* La case 🚗 ne s'affiche que pour un élève venu d'ailleurs —
         même règle qu'à l'écran de cours, et lue par la MÊME
         fonction. Deux lectures de « vient-il d'ailleurs ? »
         auraient fini par ne pas être d'accord. */
      const nomIci = $('studentName') ? $('studentName').value.trim() : '';
      const venuDAilleurs = (typeof vientDuneAutreAE === 'function')
        ? vientDuneAutreAE(nomIci) : true;

      /* 🔘 v1213 — des boutons, ou les cases d'avant (voir « BOUTONS OU
         CASES », ec-vocal.js) : les cases restent la vérité, et gardent
         leur rang parmi les saisies de la fiche. Les émojis de ceux qui
         l'ont faite, comme à l'écran de cours. */
      const marquesFaites = (dossier && dossier.marques) || {};
      const lm = document.createElement('label');
      bloc.appendChild(lm);
      const majTitreM = () => {
        lm.textContent = ch.nom + ' — ' + ((typeof vueEnCases !== 'function' || vueEnCases()) ? 'coche' : 'touche') +
          ' celles travaillées aujourd\'hui';
      };
      if(typeof basculeVueCases === 'function') bloc.appendChild(basculeVueCases());
      const miroirsM = [];
      const grilleM = document.createElement('div');
      grilleM.className = 'grillePastilles';
      const zm = document.createElement('div');
      zm.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
        'padding:10px 12px;max-height:260px;overflow-y:auto;';
      liste.forEach(nom => {
        const dejaOk = dejaFaites.indexOf(normaliserMot(nom)) !== -1;
        const lab = document.createElement('label');
        lab.style.cssText = 'display:flex;align-items:center;gap:9px;padding:5px 0;' +
          'font-size:15px;text-transform:none;margin:0;color:' +
          (dejaOk ? 'var(--muted)' : 'var(--cream)') + ';';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = nom;
        cb.className = 'chManuel-' + ch.cle;
        cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;';
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(nom + (dejaOk ? '  (déjà validée)' : '')));

        /* 🚗 : déjà fait dans une autre auto-école. La même case que
           sur l'écran de cours — une manœuvre acquise ailleurs ne
           porte l'émoji d'aucun de nos moniteurs.

           Et la même condition : seulement pour un élève venu
           d'ailleurs. */
        if(!dejaOk && venuDAilleurs){
          const ail = document.createElement('label');
          ail.style.cssText = 'display:flex;align-items:center;gap:4px;margin:0 0 0 auto;' +
            'font-size:12px;text-transform:none;color:var(--muted);flex-shrink:0;';
          ail.title = 'Déjà fait dans une autre auto-école';
          const cbA = document.createElement('input');
          cbA.type = 'checkbox';
          cbA.className = 'mAilleurs';
          cbA.value = nom;
          cbA.style.cssText = 'width:15px;height:15px;flex-shrink:0;margin:0;';
          cbA.addEventListener('click', e => e.stopPropagation());
          ail.appendChild(cbA);
          ail.appendChild(document.createTextNode('🚗'));
          lab.appendChild(ail);
        }

        zm.appendChild(lab);
        if(typeof boutonDeManoeuvre === 'function'){
          const marque = marquesFaites[normaliserMot(nom)] || (dejaOk ? '✅' : '');
          miroirsM.push(boutonDeManoeuvre(cb, nom, marque, lab.querySelector('input.mAilleurs')));
        }
      });
      bloc.appendChild(zm);
      if(miroirsM.length){
        miroirsM.forEach(m => grilleM.appendChild(m));
        bloc.appendChild(grilleM);
        const zoneM = document.createElement('div');
        deuxHabits(zoneM, zm, grilleM, () => miroirsM.forEach(m => m._peindre()));
        zoneM._appliquerVueM = zoneM._appliquerVue;
        /* La zone qui bascule, c'est le bloc : on y accroche l'habit */
        bloc.classList.add('zoneVueCases');
        bloc._appliquerVue = () => { zoneM._appliquerVueM(); majTitreM(); };
        zoneM.classList.remove('zoneVueCases');
      }
      majTitreM();

    }else if(ch.type === 'competences'){
      /* Le modèle attend un statut ET des erreurs par compétence :
         une simple case à cocher ne suffisait pas. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const aide = document.createElement('div');
      aide.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.4;';
      aide.textContent = 'Laisse « non travaillé » pour les compétences non abordées ' +
        "aujourd'hui : elles n'apparaîtront pas dans le bilan.";
      bloc.appendChild(aide);

      (modele.comps || []).forEach(comp => {
        const cle = comp.cle || '';
        const titre = comp.titre || comp.nom || cle;

        const zc = document.createElement('div');
        zc.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
          'padding:9px 11px;margin-bottom:7px;';

        const h = document.createElement('div');
        h.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';

        const t = document.createElement('span');
        t.style.cssText = 'flex:1;min-width:0;font-size:14px;font-weight:600;';
        t.textContent = titre;
        h.appendChild(t);

        const sel = document.createElement('select');
        sel.className = 'compStatut';
        sel.setAttribute('data-comp', cle);
        sel.style.cssText = 'width:auto;margin:0;padding:7px 9px;font-size:14px;flex-shrink:0;';
        /* Les valeurs sont les émojis attendus par l'assembleur */
        sel.innerHTML = '<option value="">— non travaillé —</option>' +
          '<option value="✅">✅ Acquis</option>' +
          '<option value="🟠">🟠 En cours</option>' +
          '<option value="❌">❌ À revoir</option>';
        h.appendChild(sel);
        zc.appendChild(h);

        const err = document.createElement('textarea');
        err.className = 'compErreurs';
        err.setAttribute('data-comp', cle);
        err.rows = 2;
        err.placeholder = 'Erreurs à corriger, une par ligne';
        err.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
          'color:var(--cream);padding:8px 10px;border-radius:8px;font-size:14px;' +
          'line-height:1.5;font-family:inherit;resize:vertical;display:none;margin:0;';
        zc.appendChild(err);

        /* Les erreurs n'ont de sens que si la compétence a été travaillée */
        sel.addEventListener('change', () => {
          err.style.display = sel.value ? 'block' : 'none';
        });

        bloc.appendChild(zc);
      });

    }else if(ch.type === 'themes'){
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.4;';
      a.textContent = 'Remplis seulement les rubriques utiles : les autres ne sortiront pas.';
      bloc.appendChild(a);

      THEMES_ERREURS.forEach(th => {
        const b = document.createElement('div');
        b.style.cssText = 'margin-bottom:10px;';
        const t2 = document.createElement('div');
        t2.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
        t2.textContent = th.nom;
        b.appendChild(t2);

        const r = document.createElement('div');
        r.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';
        const t = document.createElement('textarea');
        t.rows = 2;
        t.className = 'themeErreur';
        t.setAttribute('data-theme', th.nom);
        t.placeholder = 'Une remarque par ligne';
        t.style.cssText = 'flex:1;background:var(--navy);border:1px solid var(--line);' +
          'color:var(--cream);padding:10px 11px;border-radius:10px;font-size:16px;' +
          'line-height:1.5;font-family:inherit;resize:vertical;margin:0;';
        r.appendChild(t);
        if(dicteePossible()){
          const mic = document.createElement('button');
          mic.type = 'button';
          mic.className = 'btn btn-secondary';
          mic.style.cssText = 'width:auto;padding:10px 12px;font-size:17px;margin:0;flex-shrink:0;';
          mic.textContent = '🎙️';
          mic.title = 'Dicter dans ' + th.nom;
          mic.addEventListener('click', () => dicterDans(t, mic));
          r.appendChild(mic);
        }
        b.appendChild(r);
        bloc.appendChild(b);
      });

    }else if(ch.type === 'cepc'){
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const aide = document.createElement('div');
      aide.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.5;';
      aide.textContent = "Appuie sur la note de chaque compétence, comme sur le CEPC " +
        "de l'inspecteur. Un second appui l'efface.";
      bloc.appendChild(aide);

      /* Le document officiel est sur fond blanc : on le reproduit
         tel quel, même en thème sombre. C'est sa ressemblance avec
         le vrai CEPC qui aide le moniteur à s'y retrouver. */
      const z = document.createElement('div');
      z.style.cssText = 'background:#FFFFFF;border:1px solid #D3DCE6;' +
        'border-radius:8px;padding:0;overflow:hidden;';

      const entete = document.createElement('div');
      entete.style.cssText = 'display:flex;justify-content:space-between;' +
        'align-items:baseline;padding:10px 12px 8px;border-bottom:1px solid #D3DCE6;';
      entete.innerHTML =
        '<span style="font-size:13px;font-weight:800;color:#0B2E4F;">' +
          'Bilan de compétences</span>' +
        '<span style="font-size:9px;color:#8A94A0;">Niveaux d\'appréciation</span>';
      z.appendChild(entete);

      /* Un compteur continu : sur le document, l'alternance ne se
         remet pas à zéro à chaque section. */
      let rangLigne = 0;
      CEPC_BLOCS.forEach(g => {
        const t = document.createElement('div');
        t.style.cssText = 'font-size:12px;font-weight:800;color:#0B2E4F;' +
          'padding:12px 12px 6px;background:#FFFFFF;';
        t.textContent = g.titre;
        z.appendChild(t);
        g.items.forEach(it => {
          z.appendChild(ligneCepc(it.nom, it.valeurs, rangLigne));
          rangLigne++;
        });
      });

      const tt = document.createElement('div');
      tt.style.cssText = 'font-size:12px;font-weight:800;color:#0B2E4F;' +
        'padding:12px 12px 4px;border-top:1px solid #D3DCE6;margin-top:8px;';
      tt.textContent = 'Résultat';
      z.appendChild(tt);

      const tot = document.createElement('div');
      tot.id = 'cepcTotal';
      tot.style.cssText = 'padding:6px 12px 14px;font-size:13px;font-weight:800;' +
        'color:#1568C8;display:flex;justify-content:space-between;align-items:center;';
      z.appendChild(tot);
      bloc.appendChild(z);
      setTimeout(majTotalCepc, 0);

    }else if(ch.type === 'nonMene'){
      /* ⚠️ C'EST CE CHAMP-LÀ QUE « examenNonMene » INTERROGE. Glissé
         dans un rendez-vous pédagogique, sa clé devient
         « examenBlanc.nonMene » : on retient celle qui a été
         dessinée, comme « cleNiveauCourante » le fait juste à
         côté. */
      cleNonMeneCourante = ch.cle;

      /* Le groupe porte « data-champ » : c'est ce que
         repeindreBoutonsManuels cherche pour rallumer la case
         quand un brouillon est repris. */
      const g = document.createElement('div');
      g.setAttribute('data-champ', ch.cle);
      g.style.cssText = 'margin-top:12px;';

      const b = document.createElement('button');
      b.type = 'button';
      b.id = idChamp(ch.cle);
      b.setAttribute('data-val', 'oui');
      b.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;' +
        'text-align:left;border:2px solid var(--line);border-radius:12px;' +
        'padding:14px;background:transparent;font-family:inherit;margin:0;' +
        'cursor:pointer;';

      const coche = document.createElement('span');
      coche.className = 'nonMeneCoche';
      coche.style.cssText = 'width:26px;height:26px;border-radius:6px;' +
        'border:2px solid var(--muted);display:flex;align-items:center;' +
        'justify-content:center;flex-shrink:0;font-size:17px;font-weight:800;' +
        'color:transparent;background:transparent;';
      coche.textContent = '✔';
      b.appendChild(coche);

      const d = document.createElement('span');
      d.style.cssText = 'flex:1;min-width:0;';
      const mot = document.createElement('span');
      mot.className = 'nonMeneMot';
      mot.style.cssText = 'display:block;font-size:16px;font-weight:700;' +
        'color:var(--soft);line-height:1.3;';
      mot.textContent = ch.nom;
      d.appendChild(mot);
      if(ch.aide){
        const a2 = document.createElement('span');
        a2.style.cssText = 'display:block;font-size:11.5px;color:var(--muted);' +
          'font-weight:400;margin-top:3px;line-height:1.45;';
        a2.textContent = ch.aide;
        d.appendChild(a2);
      }
      b.appendChild(d);

      b.addEventListener('click', () => basculerNonMene(b));
      g.appendChild(b);
      /* 🧹 v1236 — vider le CEPC et le griser : un bouton à part, dans
         le même cadre, là seulement quand l'examen s'est arrêté */
      const bv = document.createElement('button');
      bv.type = 'button';
      bv.className = 'btn btn-secondary cepcViderBouton';
      bv.style.cssText = 'display:none;align-items:center;justify-content:center;gap:8px;width:100%;margin:8px 0 0;' +
        'padding:11px;font-size:14px;border:2px solid var(--line);border-radius:12px;';
      peindreViderCepc(bv, false);
      bv.addEventListener('click', () => basculerViderCepc(bv));
      g.appendChild(bv);
      bloc.appendChild(g);

      /* Une fiche rouverte retrouve sa case allumée (et sa grille en
         retrait si on l'avait vidée). Après le dessin du CEPC, qui
         vient juste au-dessus. */
      if(examenNonMene()){
        setTimeout(() => {
          peindreNonMene(b, true);
          bv.style.display = 'flex';
          peindreViderCepc(bv, cepcVide());
          grisailleDuCepc(cepcVide());
          majTotalCepc();
        }, 0);
      }

    }else if(ch.type === 'photo'){
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.id = 'photo_' + ch.cle;
      inp.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
        'color:var(--cream);padding:11px;border-radius:10px;font-size:14px;';
      bloc.appendChild(inp);
      const apercu = document.createElement('div');
      apercu.id = 'apercu_' + ch.cle;
      apercu.style.cssText = 'margin-top:8px;';
      bloc.appendChild(apercu);
      const aide = document.createElement('div');
      aide.style.cssText = 'font-size:11px;color:var(--muted);margin-top:6px;line-height:1.4;';
      aide.textContent = "La photo reste sur ce téléphone : elle sert au moniteur pendant " +
        "le rendez-vous, elle n'est pas envoyée dans le bilan.";
      bloc.appendChild(aide);

      inp.addEventListener('change', () => {
        const f = inp.files && inp.files[0];
        apercu.innerHTML = '';
        if(!f) return;
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        img.style.cssText = 'max-width:100%;border-radius:10px;border:1px solid var(--line);';
        apercu.appendChild(img);
        champsManuels[ch.cle] = f.name;
      });

    }else if(ch.type === 'inspecteur'){
      /* La liste des inspecteurs, partagée par toute l'équipe :
         un nom ajouté ici sert à tout le monde. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const sel = document.createElement('select');
      sel.id = idChamp(ch.cle);
      sel.innerHTML = '<option value="">— à choisir —</option>' +
        inspecteursConnus().map(n =>
          '<option value="' + String(n).replace(/"/g, '&quot;') + '">' +
          String(n).replace(/</g, '&lt;') + '</option>').join('') +
        '<option value="__autre__">➕ En ajouter un…</option>';

      sel.addEventListener('change', async () => {
        if(sel.value !== '__autre__') return;

        const nom = await demander('Nom de l\'inspecteur', '',
                                   'Nouvel inspecteur');
        if(!nom || !nom.trim()){ sel.value = ''; return; }

        const propre = nom.trim();
        await ajouterInspecteur(propre);

        const o = document.createElement('option');
        o.value = propre;
        o.textContent = propre;
        sel.insertBefore(o, sel.lastElementChild);
        sel.value = propre;
      });
      bloc.appendChild(sel);

    }else if(ch.type === 'repassage'){
      /* « 4 + 3 » : deux leçons de 2h, puis les 3h avant examen.
         Le second nombre ne bouge pas. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const d = document.createElement('div');
      d.style.cssText = 'display:flex;gap:9px;align-items:center;';

      const iq = document.createElement('input');
      iq.type = 'number';
      iq.id = idChamp(ch.cle);
      iq.min = '0';
      iq.step = '1';
      iq.value = '4';
      iq.inputMode = 'numeric';
      iq.style.cssText = 'width:82px;font-size:17px;text-align:center;margin:0;';
      d.appendChild(iq);

      const t = document.createElement('span');
      t.style.cssText = 'font-size:16px;color:var(--muted);';
      t.textContent = '+ 3 heures';
      d.appendChild(t);

      bloc.appendChild(d);

      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:5px;' +
        'line-height:1.5;';
      a.textContent = 'Ce qu\'il faudra avant de le représenter. ' +
        "4 + 3 = deux leçons de 2h, puis la leçon de veille de l'examen.";
      bloc.appendChild(a);

      /* ⚠️ « PAS DE REPASSAGE POUR LE MOMENT » — v912.

         David : « sous heures avant repassage, rajoute une case pas
         de repassage pour le moment ».

         Un nombre d'heures répond à « combien ». Il ne sait pas dire
         « aucun » : mettre 0 voudrait dire qu'il peut repasser tout
         de suite, c'est-à-dire le contraire. Il fallait donc laisser
         le champ à sa valeur d'usine et l'écrire en toutes lettres
         dans la note pour l'équipe — et personne ne le faisait.

         C'est le mot EXACT de la conclusion du rendez-vous
         post-permis : un même état ne se dit pas de deux façons
         selon l'écran d'où on le regarde. */
      const zc = document.createElement('div');
      zc.style.cssText = 'margin-top:9px;';
      const lab = document.createElement('label');
      lab.style.cssText = 'display:flex;gap:9px;align-items:center;margin:0;' +
        'font-size:13.5px;text-transform:none;color:var(--cream);cursor:pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'repassageAucun';
      cb.setAttribute('data-cle', ch.cle);
      cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;';
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode('⛔ Pas de repassage pour le moment'));
      zc.appendChild(lab);
      bloc.appendChild(zc);

      /* Cochée, la question du nombre n'a plus d'objet : le champ
         s'éteint au lieu de rester là avec un « 4 » qui ne veut plus
         rien dire — et que quelqu'un lirait comme une demande. */
      const majAucun = () => {
        iq.disabled = cb.checked;
        d.style.opacity = cb.checked ? '.4' : '';
        a.style.opacity = cb.checked ? '.4' : '';
      };
      cb.addEventListener('change', majAucun);
      majAucun();

    }else if(ch.type === 'envoiAvant'){
      /* De quoi envoyer la première moitié sans attendre la fin
         de l'examen. */
      bloc.style.cssText = 'margin:2px 0 8px;';

      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'padding:12px;font-size:13px;' +
        'border-color:var(--ambre);color:var(--ambre);';
      b.textContent = '📤 Envoyer la partie avant examen';
      b.addEventListener('click', () => envoyerAvantExamen());
      bloc.appendChild(b);

      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:6px;' +
        'text-align:center;line-height:1.5;';
      a.textContent = "L'élève reçoit cette partie tout de suite. " +
        'Sa fiche reste en haut pour la suite.';
      bloc.appendChild(a);

    }else if(ch.type === 'cases'){
      /* ✍️ v1207 — des cases seules (zone ajoutée par le créateur) :
         chaque case cochée écrit sa phrase dans le bilan. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      if(ch.aide){
        const a = document.createElement('div');
        a.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 6px;line-height:1.4;';
        a.textContent = ch.aide;
        bloc.appendChild(a);
      }
      const liste = Array.isArray(ch.cases) ? ch.cases : [];
      liste.forEach((c, i) => {
        if(!c || !c.phrase) return;
        const lab = document.createElement('label');
        lab.className = 'caseSeuleL';
        lab.style.cssText = 'display:flex;align-items:flex-start;gap:9px;' +
          'margin:0 0 8px;font-size:13.5px;line-height:1.45;' +
          'text-transform:none;color:var(--cream);cursor:pointer;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'caseSeule';
        cb.setAttribute('data-cle', ch.cle);
        cb.value = String(i);
        cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin-top:1px;';
        /* 🚗 v1211 — réservée à certaines voitures (la case, ou toute
           la zone) : cachée tant qu'on ne sait pas, et « d'office »
           attend la voiture */
        const selonVoiture = (Array.isArray(c.voitures) && c.voitures.length) ||
                             (Array.isArray(ch.voitures) && ch.voitures.length);
        if(Array.isArray(c.voitures) && c.voitures.length){
          lab.setAttribute('data-voitures', c.voitures.join('|'));
          lab.style.display = 'none';
        }
        if(c.office && selonVoiture) lab.setAttribute('data-office-differe', '1');
        else if(c.office) cb.checked = true;
        if(selonVoiture) planifierMajVoitures(zone);
        cb.addEventListener('change', () => {
          champsManuels[ch.cle] = liste.filter((x, j) => {
            const autre = bloc.querySelector('.caseSeule[value="' + j + '"]');
            return autre && autre.checked && x && x.phrase;
          }).map(x => x.phrase).join('\n');
          if(typeof sauvegarderManuel === 'function') sauvegarderManuel();
        });
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(c.libelle || c.phrase));
        if(c.libelle) lab.title = c.phrase;
        bloc.appendChild(lab);
      });
      if(!liste.length){
        const v = document.createElement('div');
        v.style.cssText = 'font-size:12px;color:var(--muted);';
        v.textContent = '(aucune case pour l’instant)';
        bloc.appendChild(v);
      }

    }else if(ch.type === 'liste'){
      /* ▾ v1236 — une liste déroulante (zone ajoutée par le créateur) */
      dessinerListeFiche(bloc, ch, zone);

    }else if(ch.type === 'titre'){
      /* Un intertitre : il sépare deux moments de l'examen, et
         porte le bouton d'envoi de sa partie. */
      bloc.style.cssText = 'margin:22px 0 12px;padding-top:14px;' +
        'border-top:2px solid var(--line);';

      const t = document.createElement('div');
      t.style.cssText = 'font-size:17px;font-weight:800;color:var(--accent-text);';
      t.textContent = ch.nom;
      bloc.appendChild(t);

      if(ch.aide){
        const a = document.createElement('div');
        a.style.cssText = 'font-size:12px;color:var(--muted);margin-top:3px;' +
          'line-height:1.5;';
        a.textContent = ch.aide;
        bloc.appendChild(a);
      }

    }else if(ch.type === 'sousTitre'){
      /* ------------------------------------------------------------
         UN REPÈRE À L'INTÉRIEUR D'UNE PARTIE

         « Mettre plus visible vérif pour séparer. »

         Sous 🏁 Examen, quatre sujets se suivaient sans rien entre
         eux : l'installation, les vérifications, la question de
         sécurité routière, les premiers secours. Chacun a sa case
         ✅/❌ et son explication — et à bout de bras, dans une
         voiture, on ne voyait plus où finissait l'un et où
         commençait l'autre. Le moniteur cochait la mauvaise ligne.

         Un sous-titre, pas un titre : il sépare sans concurrencer
         le grand repère de la partie. Plus petit, à gauche, avec un
         filet fin — la hiérarchie doit se lire d'un coup d'œil,
         sinon elle ne sert à rien.
         ------------------------------------------------------------ */
      bloc.style.cssText = 'margin:20px 0 10px;padding:9px 11px;' +
        'border-left:3px solid var(--orange);border-radius:0 8px 8px 0;' +
        'background:rgba(232,163,61,.10);';

      const t = document.createElement('div');
      t.style.cssText = 'font-size:15.5px;font-weight:800;color:var(--orange);' +
        'letter-spacing:.01em;';
      t.textContent = ch.nom;
      bloc.appendChild(t);
      /* 🅿️ v1211 — « Manœuvre : … » : la liste dans le titre */
      if(ch.choixManoeuvre) poserChoixManoeuvre(t, ch);
      /* 🎯 v1238 — « faite » au bout du titre (l'arrêt de précision) */
      if(ch.choixFait) poserChoixFait(t, ch);

      if(ch.aide){
        const a = document.createElement('div');
        a.style.cssText = 'font-size:11.5px;color:var(--muted);margin-top:2px;' +
          'line-height:1.45;';
        a.textContent = ch.aide;
        bloc.appendChild(a);
      }

    }else if(ch.type === 'entete'){
      /* La première partie du bilan, telle que l'élève la lira :
         le moniteur coche dans le texte au lieu de répondre à une
         suite de questions détachées de leur contexte. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const z = document.createElement('div');
      z.style.cssText = 'background:var(--navy);border:1px solid var(--line);' +
        'border-radius:10px;padding:12px 13px;font-size:14px;line-height:1.55;';

      const ligneCase = (cle, texte, apres) => {
        const d = document.createElement('div');
        d.style.cssText = 'display:flex;gap:9px;align-items:flex-start;padding:5px 0;';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'enteteCase';
        cb.setAttribute('data-cle', cle);
        cb.checked = true;                 /* ✅ par défaut, comme avant */
        cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin-top:2px;';
        d.appendChild(cb);

        const t = document.createElement('div');
        t.style.cssText = 'flex:1;min-width:0;word-break:break-word;';
        t.innerHTML = '<strong>' + texte + '</strong>' +
          (apres ? '<div style="font-size:12px;color:var(--muted);' +
                   'line-height:1.5;margin-top:2px;">' + apres + '</div>' : '');
        d.appendChild(t);

        z.appendChild(d);
      };

      ligneCase('carteSD', '𝘾𝙖𝙧𝙩𝙚 𝙎𝘿',
        "N'oublie pas de la regarder et si soucis demande nous !! (rappel, tous " +
        'tes cours sont filmés, par une caméra avant et une arrière, avec le son ' +
        'et les conseils des moniteurs, pour revoir tout ton cours de conduite, ' +
        'avant de revenir à ton prochain cours).');
      ligneCase('installation', '𝙄𝙣𝙨𝙩𝙖𝙡𝙡𝙖𝙩𝙞𝙤𝙣',
        'https://www.facebook.com/groups/963972327360861/permalink/969918630099564/');
      ligneCase('passager', '𝙋𝙖𝙨𝙨𝙖𝙜𝙚𝙧', '');
      ligneCase('voyants', '𝙑𝙤𝙮𝙖𝙣𝙩𝙨', '/2 points jour du permis');

      /* Les vérifications : deux champs courts, pas des cases */
      const sep = document.createElement('div');
      sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0 8px;';
      z.appendChild(sep);

      const v = document.createElement('div');
      v.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:2px;';
      v.textContent = '𝙑𝙚́𝙧𝙞𝙛𝙞𝙘𝙖𝙩𝙞𝙤𝙣𝙨';
      z.appendChild(v);

      const lien = document.createElement('div');
      lien.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;' +
        'word-break:break-all;';
      lien.textContent = 'https://www.facebook.com/groups/864826058258637';
      z.appendChild(lien);

      const duo = document.createElement('div');
      duo.style.cssText = 'display:flex;gap:10px;';
      [['verifQuestion', 'Question n°', 'Ex : 12'],
       ['verifNote', 'Note sur 3', 'Ex : 3']].forEach(([cle, lab, ph]) => {
        const col = document.createElement('div');
        col.style.cssText = 'flex:1;min-width:0;';
        const e = document.createElement('label');
        e.textContent = lab;
        e.style.cssText = 'font-size:12px;margin-bottom:4px;text-transform:none;';
        col.appendChild(e);
        const i = document.createElement('input');
        i.type = 'text';
        i.className = 'enteteTexte';
        i.setAttribute('data-cle', cle);
        i.placeholder = ph;
        i.style.cssText = 'margin:0;padding:9px 10px;font-size:15px;';
        col.appendChild(i);
        duo.appendChild(col);
      });
      z.appendChild(duo);

      const pts = document.createElement('div');
      pts.style.cssText = 'font-size:12px;color:var(--muted);margin-top:6px;';
      pts.textContent = '/3 points jour du permis';
      z.appendChild(pts);

      bloc.appendChild(z);

    /* ⚠️ QUATRE BRANCHES MORTES ONT ÉTÉ RETIRÉES ICI — v912.

       « inspecteur », « repassage », « envoiAvant » et « titre »
       étaient écrits DEUX FOIS dans cette même chaîne de « else
       if ». La seconde copie ne pouvait donc jamais s'exécuter :
       la première l'attrapait toujours.

       Ce n'est pas qu'un doublon. C'est un PIÈGE : on corrige le
       morceau qu'on trouve, on recharge, et rien ne change — sans
       la moindre erreur pour dire pourquoi. La case « pas de
       repassage » a failli être posée dans la copie morte.

       Elles étaient identiques mot pour mot au moment du retrait :
       rien n'est perdu, seul le piège l'est.

       ⚠️ ET CE COMMENTAIRE-LÀ N'AVAIT PAS DE FIN — réparé en v925.

       Il lui manquait son « étoile-barre ». JavaScript a donc fermé
       au PREMIER qu'il a trouvé — celui du petit commentaire « vingt
       lignes prêtes », dix-huit lignes plus bas. Tout ce qu'il y
       avait entre les deux a cessé d'exister : la branche des
       observations entière, et avec elle le « z.id = 'obsManuel' »
       que six endroits relisent.

       Deux dégâts, dont un seul se voyait :

       1. La boucle des vingt lignes, elle, restait DEHORS du
          commentaire. Elle s'est donc mise à s'exécuter dans la
          branche d'AU-DESSUS — l'en-tête — sur un « z » qui n'était
          plus le sien : la zone Carte SD / Installation /
          Vérifications. C'est ce que David a vu, « les remarques de
          l'inspecteur et explication ou correction sur un bilan
          classique en manuel ».

       2. Et le vrai bloc des observations n'était plus dessiné nulle
          part : l'examen blanc et l'examen officiel tombaient dans
          le « else » final et n'avaient plus qu'un cadre de texte.
          « #obsManuel » n'existait plus, donc les ☠️ et les ⚠️, le
          rangement sous le CEPC et le bilan des erreurs ne lisaient
          plus rien.

       Un commentaire non fermé ne fait pas d'erreur : il DÉPLACE du
       code. C'est pour ça que ça a tenu treize versions. */

    }else if(ch.type === 'apercuNiveau'){
      /* ============================================================
         L'APERÇU DU BLOC 4 — v968

         David, trois captures à l'appui : « le moniteur veut voir
         avant de générer le bilan ce que va écrire chaque bouton de
         cette partie, et pouvoir le modifier avant de générer. »

         Ce n'est pas un résumé : c'est LE texte, celui que
         blocNiveauPermis écrit dans le bilan. Le cadre le montre, le
         moniteur peut y écrire, et c'est son texte qui part.

         ⚠️ ET DÈS QU'IL Y TOUCHE, ON N'Y REVIENT PLUS. C'est la
         règle du « 3 · Bilan des erreurs », et pour la même raison :
         réécrire par-dessus une correction, c'est la perdre sans
         prévenir. Le bouton ⟳ rend le texte proposé quand il veut
         repartir d'une réponse qu'il vient de changer — sans lui, un
         moniteur qui corrige une heure puis change la frise
         enverrait un bloc qui ne dit plus ce que la fiche dit.
         ============================================================ */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const aide = document.createElement('div');
      aide.style.cssText = 'font-size:11px;color:var(--muted);' +
        'margin:-8px 0 6px;line-height:1.4;';
      aide.textContent = 'Ce cadre est le texte qui partira dans le bilan. ' +
        'Il se remplit tout seul selon les boutons ci-dessus — et tu peux ' +
        'le corriger ou y ajouter ce que tu veux.';
      bloc.appendChild(aide);

      const t = document.createElement('textarea');
      t.className = 'apercuNiveau';
      t.id = idChamp(ch.cle);
      t.rows = ch.lignes || 12;
      /* Le même cadre que ses voisins — voir la note du bloc
         Autonomie sur cette déclaration recopiée. */
      t.style.cssText = 'width:100%;background:var(--navy);' +
        'border:1px solid var(--line);color:var(--cream);padding:11px 12px;' +
        'border-radius:10px;font-size:15px;line-height:1.6;' +
        'font-family:inherit;resize:vertical;margin:0 0 8px;';
      /* Ce que l'application a proposé ne compte pas comme une
         saisie : seul un texte différent en est une. */
      t.addEventListener('input', () => {
        if(t.value !== (t.dataset.propose || '')) t.dataset.intact = 'non';
        champsManuels[ch.cle] = t.value;
      });
      bloc.appendChild(t);

      const bReprendre = document.createElement('button');
      bReprendre.type = 'button';
      bReprendre.className = 'btn btn-secondary reprendreApercu';
      bReprendre.style.cssText = 'width:auto;margin:0;padding:8px 12px;' +
        'font-size:12.5px;';
      bReprendre.textContent = '⟳ Reprendre le texte proposé';
      bReprendre.title = 'Efface tes corrections et réécrit le bloc ' +
        'à partir des réponses du dessus';
      bReprendre.addEventListener('click', () => {
        t.dataset.intact = 'oui';
        rafraichirApercuNiveau();
      });
      bloc.appendChild(bReprendre);

      /* Les réponses ne sont pas encore posées quand ce champ se
         dessine : on remplit au tour suivant. */
      setTimeout(() => rafraichirApercuNiveau(), 0);

    }else if(ch.type === 'autonomie'){
      /* ============================================================
         AUTONOMIE — LE DEMI-POINT, À PORTÉE DE POUCE — v966

         David : « en dessous tu mets Autonomie, qui permet d'enlever
         des points à la ligne Conduite autonome du CEPC ; tu mets un
         bouton au bout avec -0.5 » — et « il faut qu'on puisse
         appuyer 2 fois sur le bouton -0.5 pour arriver à 0 », puis
         « reste bloqué à 0 ».

         Le ⚠️ sait déjà retirer ce demi-point : il suffit de choisir
         « Conduite autonome » et de répondre oui au point. Mais il
         faut d'abord écrire une remarque, l'accrocher à une
         compétence, et confirmer — trois gestes, et ce n'est pas ce
         dont on parle ici : l'autonomie du trajet n'est pas une
         erreur précise que l'inspecteur a relevée. D'où ce bouton,
         hors de la liste des remarques, « c'est une demande
         moniteur ».

         ⚠️ ET IL NE POSE PAS LA NOTE, il pose des crans — voir
         retirerPointsCepc. La ligne affiche donc ce qu'elle vaut
         VRAIMENT, d'où que vienne le cran : c'est ce qui empêche de
         retirer deux fois le même demi-point sans s'en apercevoir.
         ============================================================ */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const za = document.createElement('div');
      za.className = 'zoneAutonomie';
      za.dataset.ligne = ch.ligne || 'Conduite autonome';
      za.dataset.moins = '0';
      bloc.appendChild(za);

      const t = document.createElement('textarea');
      t.className = 'autonomieTexte';
      t.rows = ch.lignes || 3;
      t.placeholder = ch.aide || 'Ce qui a manqué en conduite autonome';
      /* ⚠️ LE MÊME CADRE QUE SES VOISINS, MOT POUR MOT. Un textarea
         nu sort en monospace, sans bord ni coins arrondis : il ne
         ressemblerait à aucun autre champ de la fiche.

         Cette déclaration est écrite à la main à QUATRE endroits
         dans ce fichier — c'en est une de trop, et c'est noté dans
         TODO-general.md. Je ne la range pas aujourd'hui : ce serait
         toucher trois écrans qu'aucun test ne regarde, au milieu
         d'une livraison. En attendant on recopie celle du voisin,
         plutôt que d'en inventer une cinquième. */
      t.style.cssText = 'width:100%;background:var(--navy);' +
        'border:1px solid var(--line);color:var(--cream);padding:11px 12px;' +
        'border-radius:10px;font-size:16px;line-height:1.6;' +
        'font-family:inherit;resize:vertical;margin:0 0 9px;';
      za.appendChild(t);

      const rang = document.createElement('div');
      rang.style.cssText = 'display:flex;gap:9px;align-items:center;' +
        'flex-wrap:wrap;';

      const etat = document.createElement('span');
      etat.className = 'autonomieEtat';
      etat.style.cssText = 'flex:1;min-width:0;font-size:12.5px;' +
        'color:var(--muted);line-height:1.4;';

      const bDemi = document.createElement('button');
      bDemi.type = 'button';
      bDemi.className = 'btn btn-secondary autonomieMoins';
      bDemi.style.cssText = 'width:auto;margin:0;padding:10px 14px;' +
        'font-size:14px;font-weight:700;flex-shrink:0;';
      bDemi.textContent = '➖ 0,5';
      bDemi.title = 'Retirer un demi-point sur « ' + za.dataset.ligne + ' »';

      /* Ce que la ligne vaut MAINTENANT, quelle que soit la main qui
         l'a fait descendre. Le bouton s'éteint quand elle est à
         zéro : il n'a plus rien à retirer, et David l'a tranché —
         « reste bloqué à 0 ». */
      const majAutonomie = () => {
        const champ = document.querySelector('.cepcNiveau[data-comp="' +
          za.dataset.ligne.replace(/"/g, '') + '"]');
        const max = (typeof maxCepc === 'function') ? maxCepc(za.dataset.ligne) : 1;
        const vu = champ && champ.value !== '' ? champ.value : String(max);
        const bas = String(vu) === '0';

        etat.textContent = za.dataset.ligne + ' : ' +
          String(vu).replace('.', ',') + ' / ' + String(max).replace('.', ',');
        bDemi.disabled = bas;
        bDemi.style.opacity = bas ? '.45' : '';
        bDemi.style.borderColor = (Number(za.dataset.moins) > 0)
          ? 'var(--warn-text)' : 'var(--line)';
        bDemi.style.color = (Number(za.dataset.moins) > 0)
          ? 'var(--warn-text)' : '';
      };

      bDemi.addEventListener('click', () => {
        za.dataset.moins = String(Number(za.dataset.moins || 0) + 1);
        if(typeof retirerPointsCepc === 'function') retirerPointsCepc();
        majAutonomie();
      });

      rang.appendChild(etat);
      rang.appendChild(bDemi);
      za.appendChild(rang);

      /* La ligne du CEPC est dessinée plus bas dans la fiche : on
         attend qu'elle soit là pour afficher ce qu'elle vaut. */
      setTimeout(majAutonomie, 0);
      za.dataset.pret = 'oui';

    }else if(ch.type === 'observations'){
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      const z = document.createElement('div');
      /* ⚠️ CHAQUE ZONE PORTE SON NOM ET SA CLASSE — v966. Le nom, pour
         que l'enregistrement sache quelles lignes sont les siennes ;
         la classe, pour que le CEPC et le bilan des erreurs les
         comptent toutes sans avoir à connaître aucun nom. */
      z.id = ch.zone || 'obsManuel';
      z.className = 'zoneObs';
      if(ch.mention) z.dataset.mention = ch.mention;
      bloc.appendChild(z);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.style.cssText = 'margin-top:8px;padding:10px;font-size:13px;';
      b.textContent = ch.mention
        ? '➕ Ajouter une ligne ' + ch.mention.toLowerCase()
        : '➕ Ajouter une observation';
      b.addEventListener('click', () => ajouterObservationManuelle(z));
      bloc.appendChild(b);

      /* Vingt lignes prêtes : un examen en compte facilement autant,
         et ajouter une ligne à chaque fois cassait le rythme. Le
         bloc Manœuvre en demande deux — David : « met en 2 ». */
      const combien = ch.lignes || 20;
      for(let i = 0; i < combien; i++) ajouterObservationManuelle(z);

    }else{
      /* Texte libre, avec dictée possible */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      if(ch.aide){
        const a = document.createElement('div');
        a.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 6px;line-height:1.4;';
        a.textContent = ch.aide;
        bloc.appendChild(a);
      }
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';
      const t = document.createElement('textarea');
      t.rows = (ch.type === 'court') ? 1 : (ch.lignes || 6);
      t.id = idChamp(ch.cle);
      if(ch.indication) t.placeholder = ch.indication;
      if(ch.marque) t.setAttribute('data-cle', ch.cle);

      /* ------------------------------------------------------
         UNE PHRASE TOUTE PRÊTE, POSÉE PAR UNE CASE

         La case n'a pas d'état à elle : elle est cochée quand la
         phrase est dans le cadre, décochée sinon. Un état séparé
         serait une deuxième vérité — celle qui se retrouve un
         jour cochée sur un cadre vide.
         ------------------------------------------------------ */
      const cochables = [];
      /* ✍️ v1206 — les cases réglées dans le créateur de fiches : un
         libellé court (ou la phrase elle-même), la phrase, sa place
         (en tête ou à la fin), cochée d'office ou non. */
      const versCochable = c => ({ phrase: String(c.phrase), libelle: String(c.libelle || ''), fin: c.ou === 'fin', office: !!c.office,
                                   voitures: (Array.isArray(c.voitures) && c.voitures.length) ? c.voitures : null });
      if(Array.isArray(ch.cases)){
        ch.cases.forEach(c => { if(c && c.phrase) cochables.push(versCochable(c)); });
      }else if(ch.phraseCoche) cochables.push({ phrase: String(ch.phraseCoche) });
      /* v1144 — les deux cases de l'alerte de survitesse, cachées
         tant qu'on ne sait pas que la voiture en a une. v1211 : des
         cases réservées à leurs voitures, comme celles du créateur
         (une fiche passée par « champsAvecForme » les a déjà). */
      if(ch.survitesse){
        casesSurvitesse().forEach(c => cochables.push(versCochable(c)));
      }
      /* Une zone réservée à certaines voitures : ses cases cochées
         d'office attendent la voiture, elles aussi. */
      const zoneSelonVoiture = Array.isArray(ch.voitures) && ch.voitures.length > 0;
      cochables.forEach(coche => {
        const phrase = coche.phrase;

        const lab = document.createElement('label');
        lab.style.cssText = 'display:flex;align-items:flex-start;gap:9px;' +
          'margin:0 0 8px;font-size:13.5px;line-height:1.45;' +
          'text-transform:none;color:var(--cream);cursor:pointer;';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin-top:1px;';
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(coche.libelle || phrase));
        if(coche.libelle) lab.title = phrase;

        /* Retirer, c'est retirer la phrase ET la ligne vide qu'elle
           a poussée devant elle — sinon le cadre garde un blanc en
           tête à chaque aller-retour sur la case. */
        const sansLaPhrase = v =>
          String(v || '').split(phrase).join('').replace(/^\s*\n+/, '').replace(/\n+\s*$/, '').trim();

        cb.addEventListener('change', () => {
          const reste = sansLaPhrase(t.value);
          t.value = cb.checked
            ? (reste ? (coche.fin ? reste + '\n' + phrase : phrase + '\n' + reste) : phrase)
            : reste;
          champsManuels[ch.cle] = t.value;
          /* ⚠️ LA VRAIE PORTE — v1103, voir plus haut : le nom
             appelé ici n'existait nulle part. */
          if(typeof sauvegarderManuel === 'function'){
            sauvegarderManuel();
          }
        });

        /* Le moniteur efface la phrase à la main : la case suit,
           au lieu de rester cochée sur un cadre qui ne la contient
           plus. */
        t.addEventListener('input', () => {
          cb.checked = (t.value.indexOf(phrase) !== -1);
        });

        /* Une fiche rouverte retrouve sa case dans le bon état */
        setTimeout(() => {
          cb.checked = (String(t.value).indexOf(phrase) !== -1);
        }, 0);

        /* 🚗 v1211 — réservée à certaines voitures : cachée tant
           qu'on ne sait pas, hors saisie (son état se relit dans le
           cadre), et son « d'office » attend la voiture. */
        if(coche.voitures){
          lab.setAttribute('data-voitures', coche.voitures.join('|'));
          if(coche.voitures.indexOf(VOITURES_SURVITESSE) !== -1) lab.setAttribute('data-survitesse', '1');
          cb.setAttribute('data-hors-saisie', '1');
          lab.style.display = 'none';
        }
        lab.setAttribute('data-phrase', phrase);
        if(coche.office && (coche.voitures || zoneSelonVoiture)){
          lab.setAttribute('data-office-differe', '1');
          if(coche.fin) lab.setAttribute('data-fin', '1');
        }
        bloc.appendChild(lab);
      });
      if(cochables.some(c => c.voitures || (c.office && zoneSelonVoiture))){
        /* Après la reprise éventuelle : la case cochée d'une fiche
           rouverte reste visible même sans réseau. */
        t.setAttribute('data-cle-champ', ch.cle);
        planifierMajVoitures(zone);
      }

      /* Le texte pré-rempli : le moniteur n'a plus qu'à effacer
         l'émoji qui ne convient pas et compléter les blancs. */
      if(ch.defaut) t.value = ch.defaut;
      /* ✍️ v1206 — une case « cochée d'office » pose sa phrase à
         l'ouverture ; une fiche reprise retrouve ensuite ce qui avait
         été écrit (la reprise passe après). */
      cochables.filter(c => c.office && !c.voitures && !zoneSelonVoiture).forEach(c => {
        if(String(t.value).indexOf(c.phrase) !== -1) return;
        t.value = t.value ? (c.fin ? t.value + '\n' + c.phrase : c.phrase + '\n' + t.value) : c.phrase;
        champsManuels[ch.cle] = t.value;
      });
      /* 🚗 v1211 — ce que le cadre porte à l'ouverture : une case
         d'office réservée à une voiture ne se pose que si rien n'a
         bougé depuis (ni le moniteur, ni une reprise). */
      t.dataset.valeurOuverture = t.value;
      t.style.cssText = 'flex:1;background:var(--navy);border:1px solid var(--line);' +
        'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:16px;' +
        'line-height:1.6;font-family:inherit;resize:vertical;margin:0;';
      /* Le bilan des éliminatoires se réécrit tant que le
         moniteur n'y a pas touché. */
      if(/(^|\.)bilanElim$/.test(ch.cle)){
        t.addEventListener('input', () => {
          if(typeof figerBilanEliminatoires === 'function'){
            figerBilanEliminatoires();
          }
        });
      }

      /* Les heures avant permis décident de la frise post : le
         calcul se fait à la saisie, pas à la génération. */
      if(ch.cle === 'heuresAvant'){
        t.addEventListener('input', () => {
          champsManuels[prefixeExamenBlanc + 'heuresAvant'] = t.value;
          if(typeof remplirFrises === 'function'){
            remplirFrises(champsManuels, true);
          }
        });
      }

      r.appendChild(t);
      if(dicteePossible()){
        const mic = document.createElement('button');
        mic.type = 'button';
        mic.className = 'btn btn-secondary';
        mic.style.cssText = 'width:auto;padding:11px 13px;font-size:18px;margin:0;flex-shrink:0;';
        mic.textContent = '🎙️';
        mic.title = 'Dicter dans ce champ';
        mic.addEventListener('click', () => dicterDans(t, mic));
        r.appendChild(mic);
      }

      /* Marquer une faute éliminatoire, là où c'est utile */
      if(ch.mort){
        const bm = document.createElement('button');
        bm.type = 'button';
        bm.className = 'btn btn-secondary';
        bm.style.cssText = 'width:auto;padding:11px 13px;font-size:18px;margin:0;flex-shrink:0;';
        bm.textContent = '☠️';
        bm.title = 'Insérer le marqueur de faute éliminatoire';
        bm.addEventListener('click', () => {
          /* Sur la ligne où se trouve le curseur, pas ailleurs */
          const v = t.value;
          const pos = t.selectionStart || 0;
          const debut = v.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
          let fin = v.indexOf('\n', pos);
          if(fin === -1) fin = v.length;
          const ligne = v.slice(debut, fin);

          const nouvelle = (ligne.indexOf('☠️') !== -1)
            ? ligne.split('☠️').join('').replace(/\s+/g, ' ').trim()
            : ('☠️ ' + ligne).trim();

          t.value = v.slice(0, debut) + nouvelle + v.slice(fin);
          t.focus();
          t.setSelectionRange(debut + nouvelle.length, debut + nouvelle.length);
        });
        r.appendChild(bm);
      }

      bloc.appendChild(r);
    }

    /* ⚠️ UN FOND POUR CE QUI VA ENSEMBLE — v1142. David : « met un
       fond différent sous la partie manœuvre et autonomie, car les
       moniteurs ne se repèrent pas bien ». Les champs marqués d'un
       même « fond » qui se suivent entrent dans UN cadre teinté, du
       titre MANŒUVRE à la ligne « Conduite autonome » : on voit où
       la partie commence et où reprend la suite. Teinte : ardoise,
       son choix sur le schéma. */
    /* ✍️ v1206 — sans micro, si le créateur l'a retiré */
    if(ch.sansMicro) masquerMicrosFiche(bloc);
    /* 🎨 v1236 — la couleur du titre, de l'aide, du texte */
    if(ch.couleurs) peindreTextesFiche(bloc, ch);

    /* ✍️ v1206 — la couleur ET sa force : deux zones qui se suivent
       avec le même fond et la même force partagent un seul cadre.
       En « très visible », les titres du cadre deviennent un bandeau
       de la couleur. */
    if(ch.fond){
      const intensite = ch.intensite || 'leger';
      /* ✍️ v1207 — un cadre « 📦 Encadrer » réunit SES zones, et
         seulement elles : sa marque est la sienne, pas sa couleur. */
      const marque = (ch.cadre ? 'cadre:' + ch.cadre + '|' : '') + ch.fond + '|' + intensite;
      const der = zone.lastElementChild;
      let cadre = (der && der.classList.contains('cadreFond') &&
                   der.dataset.fond === marque) ? der : null;
      if(!cadre){
        cadre = document.createElement('div');
        peindreCadreFond(cadre, ch.fond, intensite);
        cadre.dataset.fond = marque;
        if(ch.cadre) cadre.dataset.cadre = ch.cadre;
        zone.appendChild(cadre);
      }
      if(intensite === 'fort' && (ch.type === 'titre' || ch.type === 'sousTitre')){
        bloc.classList.add('titreFondFort');
      }
      cadre.appendChild(bloc);
      return;
    }
    zone.appendChild(bloc);
  });
}


/* ============================================================
   L'EXAMEN BLANC SOUS LA TRANSCRIPTION

   Le rendez-vous pédagogique se dicte, mais l'examen blanc qu'on
   y fait ne se dicte pas : il se note, case par case. Le module
   se pose donc sous la transcription, replié.

   Il utilise dessinerChampsManuels() et le MÊME schéma que le
   bilan manuel : deux formulaires écrits séparément auraient fini
   par ne plus poser les mêmes questions.
   ============================================================ */

/* La question et les champs du module, sans ce qui appartient au
   RVP lui-même. On part de la question : tout ce qui suit est le
   module. */
function champsExamenBlancRvp(){
  const tous = CHAMPS_MANUELS.rvp || [];
  const debut = tous.findIndex(c => c.cle === 'examenBlancFait');
  return (debut === -1) ? [] : tous.slice(debut);
}

/* Sommes-nous sur un rendez-vous pédagogique ? On interroge le
   SCHÉMA, pas la clé du modèle : « rvp » est le nom du schéma,
   la clé s'appelle « aac-rvp » — les comparer faisait rater le
   test à tous les coups. */
function surRendezVousPedago(){
  const cle = ($('modele') && $('modele').value) || '';
  const m = (typeof MODELES !== 'undefined') ? MODELES[cle] : null;
  return !!(m && m.schema === 'rvp');
}

function majBlocExamenBlancCours(){
  const zone = $('examenBlancCours');
  if(!zone) return;

  const surRvp = surRendezVousPedago();
  zone.style.display = surRvp ? 'block' : 'none';
  if(!surRvp){ zone.innerHTML = ''; return; }

  /* Déjà dessiné : on ne recommence pas, ce que le moniteur a
     saisi serait perdu à chaque redessin de l'écran. */
  if(zone.dataset.pret === 'oui') return;
  zone.dataset.pret = 'oui';
  zone.innerHTML = '';

  const det = document.createElement('details');
  det.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 12px;';
  det.open = true;
  det.innerHTML = '<summary style="cursor:pointer;font-size:15px;font-weight:700;' +
    'color:var(--accent-text);">📝 Examen blanc</summary>';

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin:8px 0 10px;line-height:1.4;';
  aide.textContent = "Réponds à la question. Sans réponse, le bilan garde " +
    'sa forme habituelle.';
  det.appendChild(aide);

  const dedans = document.createElement('div');
  det.appendChild(dedans);
  zone.appendChild(det);

  /* Les clés sont celles du module : les mêmes qu'en manuel */
  prefixeExamenBlanc = 'examenBlanc.';
  cleNiveauCourante = 'examenBlanc.niveau';
  dessinerChampsManuels(champsExamenBlancRvp(), dedans,
                        MODELES[$('modele').value] || {}, { manoeuvres: [] });
  majChampsSelonExamenBlanc();
}

/* Ce que le moniteur a noté sous la transcription, prêt pour le
   constructeur. Vide s'il n'a rien ouvert. */
function examenBlancDuCours(){
  const zone = $('examenBlancCours');
  if(!zone || zone.dataset.pret !== 'oui') return {};

  /* La même relecture que le bilan manuel, sur les mêmes champs */
  lireChampsManuels(champsExamenBlancRvp());

  const eb = {};
  Object.keys(champsManuels || {}).forEach(k => {
    if(k.indexOf('examenBlanc.') !== 0) return;
    const chemin = k.slice(12).split('.');
    let cible = eb;
    for(let i = 0; i < chemin.length - 1; i++){
      if(!cible[chemin[i]] || typeof cible[chemin[i]] !== 'object'){
        cible[chemin[i]] = {};
      }
      cible = cible[chemin[i]];
    }
    cible[chemin[chemin.length - 1]] = champsManuels[k];
  });

  const out = {};
  /* La réponse elle-même : c'est elle qui décide du ✅ ou du ❌
     dans le bilan, même sans un seul champ rempli. */
  if(champsManuels.examenBlancFait){
    out.examenBlancFait = champsManuels.examenBlancFait;
  }
  if(Object.keys(eb).length) out.examenBlanc = eb;
  return out;
}


/* ============================================================
   📝 LES REMARQUES DU CEPC — v1176

   David, le 14 octobre : « dans examen blanc et examen officiel,
   quand on appuie sur la tête de mort ça sort la liste du CEPC ; une
   fois qu'on a choisi la ligne du CEPC, il faut une liste de
   remarques qui s'insère directement dans la ligne remarque […] il
   faut qu'on puisse ajouter des remarques au besoin. Attention, il
   faut que ça reste simple : si le moniteur ne veut rien mettre
   depuis cette liste il doit pouvoir retourner vite. Il doit aussi
   pouvoir compléter sur la ligne directement, et modifier au besoin
   dans son bilan. » Ses arbitrages (schéma du même jour) :
   · la remarque s'écrit dans « Remarque de l'inspecteur » ;
   · un appui l'écrit ET ferme — pas de cases, pas de « Valider » ;
   · ☠️ et ⚠️ proposent tous les deux la liste de leur ligne ;
   · le bouton du haut est « ✍️ Écrire directement » (« il n'y a pas
     rien à écrire ») : la fenêtre se ferme, le curseur est dans la
     ligne ;
   · tout le monde ajoute, corrige, retire ;
   · les plus utilisées en haut.

   ⚠️ LA LISTE EST CELLE DE TOUTE L'ÉQUIPE, ET ELLE VIT AUSSI SUR LE
   TÉLÉPHONE. La fiche d'examen se remplit en voiture, souvent sans
   réseau : la liste s'ouvre depuis la copie du téléphone, et ce qui
   n'a pas pu partir (une remarque créée, un appui compté) attend
   dans « ec_remarques_cepc_attente » le prochain réseau.
   ============================================================ */
const CLE_REMARQUES_CEPC = 'ec_remarques_cepc';
const CLE_REMARQUES_CEPC_ATTENTE = 'ec_remarques_cepc_attente';
let remarquesCepc = null;
let remarquesCepcLues = 0;

function remarquesCepcEnMemoire(){
  if(remarquesCepc) return remarquesCepc;
  try{ remarquesCepc = JSON.parse(localStorage.getItem(CLE_REMARQUES_CEPC) || 'null'); }catch(e){ remarquesCepc = null; }
  if(!remarquesCepc || typeof remarquesCepc !== 'object') remarquesCepc = {};
  return remarquesCepc;
}

function garderRemarquesCepc(){
  try{ localStorage.setItem(CLE_REMARQUES_CEPC, JSON.stringify(remarquesCepc || {})); }catch(e){}
}

/* Ce qui n'a pas pu partir, dans l'ordre */
function attenteRemarquesCepc(){
  try{ return JSON.parse(localStorage.getItem(CLE_REMARQUES_CEPC_ATTENTE) || '[]') || []; }catch(e){ return []; }
}
function envoyerRemarqueCepc(corps){
  const l = attenteRemarquesCepc();
  l.push(corps);
  try{ localStorage.setItem(CLE_REMARQUES_CEPC_ATTENTE, JSON.stringify(l.slice(-200))); }catch(e){}
  return viderAttenteRemarquesCepc();
}
let attenteRemarquesEnCours = null;
function viderAttenteRemarquesCepc(){
  if(attenteRemarquesEnCours) return attenteRemarquesEnCours;
  attenteRemarquesEnCours = (async () => {
    /* ⚠️ UN TEMPS D'ABORD : sans lui, une file vide finissait la
       fonction AVANT que la promesse soit rangée ici — le « null » du
       finally passait en premier, et la promesse restait pour
       toujours : plus rien ne partait. */
    await null;
    try{
      let l = attenteRemarquesCepc();
      while(l.length){
        try{ await appelPrep(l[0]); }
        catch(e){
          /* Pas de réseau, ou un serveur qui ne répond pas : on garde
             tout, on réessaiera. Un REFUS (ligne inconnue, remarque
             déjà retirée par quelqu'un d'autre) ne passera jamais :
             on le laisse tomber pour ne pas bloquer la suite. */
          if(/Connexion impossible|Pas de réponse|HTTP 5|indisponible/i.test(String((e && e.message) || ''))) break;
          console.warn('Remarque du CEPC refusée :', e && e.message);
        }
        l = attenteRemarquesCepc().slice(1);
        try{ localStorage.setItem(CLE_REMARQUES_CEPC_ATTENTE, JSON.stringify(l)); }catch(e){}
      }
    }catch(e){ /* le stockage du téléphone : rien à faire */ }
    finally{ attenteRemarquesEnCours = null; }
  })();
  return attenteRemarquesEnCours;
}

/* La liste de l'équipe. D'abord ce qui attendait, pour que la liste
   relue le contienne déjà. */
async function chargerRemarquesCepc(){
  try{
    await viderAttenteRemarquesCepc();
    const d = await appelPrep({ action: 'cepcRemarques' });
    if(d && d.remarques && typeof d.remarques === 'object'){
      remarquesCepc = d.remarques;
      remarquesCepcLues = Date.now();
      garderRemarquesCepc();
    }
  }catch(e){ /* hors réseau : celle du téléphone */ }
  return remarquesCepcEnMemoire();
}

/* Une remarque : { texte, n } (n = combien de fois choisie) */
function remarquesDeLaLigne(categorie){
  return ((remarquesCepcEnMemoire()[categorie]) || [])
    .map(x => typeof x === 'string' ? { texte: x, n: 0 } : x)
    .filter(x => x && String(x.texte || '').trim())
    .sort((a, b) => ((b.n || 0) - (a.n || 0)) ||
      String(a.texte).localeCompare(String(b.texte), 'fr', { sensitivity: 'base' }));
}

function memeRemarque(a, b){
  return normaliserMot(String(a || '').trim()) === normaliserMot(String(b || '').trim());
}

/* Écrite dans la ligne bleue : à la suite de ce qui y est déjà, et
   comme si le moniteur l'avait tapée (le bilan et la sauvegarde
   écoutent la frappe). */
function ecrireLaRemarqueCepc(champ, texte){
  const avant = String(champ.value || '').trim();
  champ.value = avant ? avant + ' · ' + texte : texte;
  champ.dispatchEvent(new Event('input', { bubbles: true }));
  champ.dispatchEvent(new Event('change', { bubbles: true }));
}

/* ✍️ — le curseur au bout de la ligne, prêt à taper */
function curseurDansLaLigne(champ){
  try{
    champ.scrollIntoView({ block: 'center' });
    champ.focus();
    const n = String(champ.value || '').length;
    champ.setSelectionRange(n, n);
  }catch(e){}
}

/* Le geste commun du ☠️ et du ⚠️ */
async function remarqueDansLaLigne(champ, categorie, marque){
  const texte = await choisirRemarqueCepc(categorie, marque);
  if(texte === ECRIRE_DIRECTEMENT) curseurDansLaLigne(champ);
  else if(texte) ecrireLaRemarqueCepc(champ, texte);
}

const ECRIRE_DIRECTEMENT = '\u0000ecrire';

/* La fenêtre. Rend le texte choisi, ECRIRE_DIRECTEMENT, ou '' —
   et '' ne défait rien : la ligne du CEPC reste marquée. */
function choisirRemarqueCepc(categorie, marque){
  /* La copie du téléphone s'ouvre tout de suite ; une relecture part
     derrière si elle a plus de dix minutes. */
  if(Date.now() - remarquesCepcLues > 600000) chargerRemarquesCepc();
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal remCepc';
    fond.appendChild(boite);
    document.body.appendChild(fond);
    let fini = false;
    const fermer = v => { if(fini) return; fini = true; fermerFond(fond); resolve(v || ''); };
    fond.addEventListener('click', ev => { if(ev.target === fond) fermer(''); });
    let edition = false;

    const dessiner = () => {
      const liste = remarquesDeLaLigne(categorie);
      boite.innerHTML = '';
      const t = document.createElement('h3');
      t.className = 'remCepcTitre';
      t.textContent = (marque || '☠️') + ' ' + categorie;
      boite.appendChild(t);

      if(!edition){
        const direct = document.createElement('button');
        direct.type = 'button';
        direct.className = 'btn btn-secondary remCepcDirect';
        direct.textContent = '✍️ Écrire directement';
        direct.addEventListener('click', () => fermer(ECRIRE_DIRECTEMENT));
        boite.appendChild(direct);
        const aide = document.createElement('div');
        aide.className = 'remCepcAide';
        aide.textContent = 'Un appui sur une remarque l’écrit dans « Remarque de l’inspecteur ». ' +
          'Tu la complètes ou la changes ensuite sur la ligne.';
        boite.appendChild(aide);
      }

      const zone = document.createElement('div');
      zone.className = 'remCepcListe';
      if(!liste.length){
        const v = document.createElement('div');
        v.className = 'empty';
        v.style.cssText = 'padding:10px 2px;font-size:12.5px;';
        v.textContent = 'Aucune remarque pour cette ligne pour l’instant : écris la première ci-dessous.';
        zone.appendChild(v);
      }
      liste.forEach(x => {
        if(edition){
          const l = document.createElement('div');
          l.className = 'remCepcEd';
          const s = document.createElement('span');
          s.textContent = x.texte;
          const m = document.createElement('button');
          m.type = 'button'; m.className = 'rgPetit'; m.textContent = '✏️'; m.title = 'Corriger';
          m.addEventListener('click', async () => {
            const n = await demander('Corriger la remarque :', x.texte, '✏️ ' + categorie);
            const propre = String(n || '').replace(/\s+/g, ' ').trim();
            if(!propre || propre === x.texte) return;
            changerRemarqueCepc(categorie, x.texte, propre);
            dessiner();
          });
          const del = document.createElement('button');
          del.type = 'button'; del.className = 'rgPetit'; del.textContent = '🗑️'; del.title = 'Retirer de la liste';
          del.addEventListener('click', async () => {
            if(!await confirmer('Retirer « ' + x.texte + ' » de la liste de l’équipe ? Les bilans déjà écrits ne changent pas.',
                                'Retirer', true)) return;
            changerRemarqueCepc(categorie, x.texte, '');
            dessiner();
          });
          l.append(s, m, del);
          zone.appendChild(l);
          return;
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary remCepcBt';
        b.textContent = x.texte;
        b.addEventListener('click', () => { compterRemarqueCepc(categorie, x.texte); fermer(x.texte); });
        zone.appendChild(b);
      });
      boite.appendChild(zone);

      /* Une remarque de plus : écrite dans la ligne ET dans la liste de
         toute l'équipe. */
      const neuve = document.createElement('div');
      neuve.className = 'remCepcNeuve';
      const ch = document.createElement('input');
      ch.type = 'text';
      ch.maxLength = 200;
      ch.placeholder = 'Une nouvelle remarque…';
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'btn btn-primary';
      c.textContent = edition ? '➕ Ajouter' : '➕ Créer et écrire';
      const creer = () => {
        const texte = ch.value.replace(/\s+/g, ' ').trim();
        if(texte.length < 2){ ch.focus(); return; }
        ajouterRemarqueCepc(categorie, texte);
        if(edition){ dessiner(); return; }
        fermer(texte);
      };
      c.addEventListener('click', creer);
      ch.addEventListener('keydown', ev => { if(ev.key === 'Enter') creer(); });
      neuve.append(ch, c);
      boite.appendChild(neuve);

      const bas = document.createElement('div');
      bas.className = 'remCepcBas';
      const e = document.createElement('button');
      e.type = 'button';
      e.className = 'rrLien';
      e.textContent = edition ? '✓ Terminé' : '✏️ Modifier la liste';
      e.addEventListener('click', () => { edition = !edition; dessiner(); });
      bas.appendChild(e);
      if(!edition){
        const a = document.createElement('button');
        a.type = 'button';
        a.className = 'btn btn-secondary';
        a.textContent = 'Fermer';
        a.addEventListener('click', () => fermer(''));
        bas.appendChild(a);
      }
      boite.appendChild(bas);
    };
    dessiner();
  });
}

/* Chaque geste est fait ici tout de suite (la liste du téléphone),
   puis envoyé — ou mis de côté jusqu'au prochain réseau. */
function ajouterRemarqueCepc(categorie, texte){
  const r = remarquesCepcEnMemoire();
  const l = (r[categorie] || []).map(x => typeof x === 'string' ? { texte: x, n: 0 } : x);
  const deja = l.find(x => memeRemarque(x.texte, texte));
  if(deja) deja.n = (deja.n || 0) + 1;
  else l.push({ texte: texte, n: 1 });
  r[categorie] = l;
  garderRemarquesCepc();
  envoyerRemarqueCepc({ action: 'cepcRemarqueAjouter', categorie: categorie, texte: texte });
}

function compterRemarqueCepc(categorie, texte){
  const r = remarquesCepcEnMemoire();
  const x = (r[categorie] || []).find(y => y && typeof y === 'object' && memeRemarque(y.texte, texte));
  if(x) x.n = (x.n || 0) + 1;
  garderRemarquesCepc();
  envoyerRemarqueCepc({ action: 'cepcRemarqueUtilisee', categorie: categorie, texte: texte });
}

function changerRemarqueCepc(categorie, avant, apres){
  const r = remarquesCepcEnMemoire();
  const l = (r[categorie] || []).map(x => typeof x === 'string' ? { texte: x, n: 0 } : x);
  const vieille = l.find(x => memeRemarque(x.texte, avant));
  const reste = l.filter(x => x !== vieille);
  if(apres){
    const meme = reste.find(x => memeRemarque(x.texte, apres));
    if(meme) meme.n = (meme.n || 0) + ((vieille && vieille.n) || 0);
    else reste.push({ texte: apres, n: (vieille && vieille.n) || 0 });
  }
  r[categorie] = reste;
  garderRemarquesCepc();
  envoyerRemarqueCepc({ action: 'cepcRemarqueChanger', categorie: categorie, avant: avant, apres: apres || '' });
}
