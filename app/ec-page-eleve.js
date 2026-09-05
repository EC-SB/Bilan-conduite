/* Déployé le 05/09/2026 à 07:44 — v879 */
/* ============================================================
   ec-page-eleve.js
   Un endroit par élève, où l'on voit tout.

   L'outil était rangé par OUTIL — répertoire, historique,
   évaluation, handicap, financements, procédures : dix vues rien
   que sous « Élèves ». Mais on ne pense pas « quel écran », on
   pense « Léa ». Ranger un même sujet à dix endroits, c'est la
   faute qu'on répare partout ailleurs dans le code, un étage plus
   haut cette fois.

   ─ LA RÈGLE QUI TIENT TOUT LE MODULE ─

   CETTE PAGE AFFICHE ET DÉLÈGUE. Elle n'écrit rien elle-même :
   chaque geste appelle la fonction qui sait déjà faire —
   ouvrirFicheEleve, majSuivi, envoyerVersListe, choisirGroupePermis,
   fixerDateSimu, noterExamenBlanc. Il n'y a PAS une seule action
   serveur d'écriture écrite ici, et il ne doit jamais y en avoir :
   ce serait un onzième endroit qui écrit les mêmes données.

   Déléguer ne veut pas dire « ouvrir une fenêtre ». Ça veut dire
   appeler la fonction qui sait déjà.

   ─ CE QUE ÇA COÛTE ─

   Le résumé, la fiche et le permis sont DÉJÀ en mémoire : le
   répertoire et l'état du bureau sont chargés pour d'autres écrans.
   Ces trois-là coûtent zéro appel réseau — et ce sont justement
   ceux où se fait le travail. Les autres onglets ne se chargent
   qu'à leur ouverture, jamais avant.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* UNE DATE SE LIT EN FRANÇAIS : 02/09/2026, jamais 2026-09-02.

   Les dates de la fiche de suivi arrivent telles que la feuille les
   stocke — en ISO. Affichées brutes, elles se lisaient à l'anglaise
   au milieu de phrases françaises, et sur « 05/08 » contre
   « 2026-08-05 » on ne sait plus lequel est le jour.

   La règle de conversion n'est PAS réécrite ici : dateCourte, dans
   ec-permis-listes, la tient depuis toujours. Ce nom-ci ne fait que
   la rendre appelable sans supposer que son module est chargé — une
   deuxième règle de date serait exactement la faute qu'on répare
   partout ailleurs. */
function jourFr(v){
  const t = String(v || '').trim();
  if(!t) return '';
  return (typeof dateCourte === 'function') ? dateCourte(t) : t;
}

/* Les onglets, dans l'ordre où ils s'affichent. Chacun porte sa
   section : un compte sans le droit ne voit pas l'onglet — il ne le
   voit pas grisé, il ne le voit pas. C'est sectionVisible() qui
   décide, comme sur les cinquante autres écrans.

   ⚠️ UN ONGLET MANQUE À CETTE LISTE, ET C'EST VOULU.

   🎓 AAC. RVP 1, RVP 2 et le rendez-vous théorique ne sont stockés
   nulle part : ils sont relus au lasso dans le texte libre du
   dernier bilan. Un onglet qui montrerait ça donnerait une
   apparence de suivi à une devinette. C'est écrit dans
   TODO-general.md ; ne pas l'ajouter avant que la donnée existe.

   📋 QUESTIONNAIRE, lui, EST là depuis la v809 — mais EN LECTURE
   SEULE, et c'est la condition pour qu'il y soit. Le questionnaire
   n'est pas un écran qui enregistre : lui ouvrir un second chemin
   d'écriture depuis ici serait exactement la faute que cette page
   répare. Il montre ce qui a été répondu et dit où le changer. */
const ONGLETS_ELEVE = [
  { cle:'fiche',    emoji:'📇', titre:'Fiche',       section:'eleves' },
  { cle:'cours',    emoji:'📚', titre:'Cours',       section:'recherche' },
  { cle:'permis',   emoji:'🎓', titre:'Permis',      section:'permis' },
  /* ⚠️ « acces_eleves », PAS « proccorriger ».

     Le serveur exige « acces_eleves » sur les quatre actions des
     codes élèves depuis la v818 ; cet onglet, lui, était resté sur
     le droit d'avant. Un compte ayant « proccorriger » sans
     « acces_eleves » voyait donc l'onglet, l'ouvrait — et se prenait
     un refus. L'écran promettait ce que le serveur refusait, et
     c'est le pire des deux mondes : la porte a l'air ouverte.

     Corriger une procédure et redonner son code à une famille sont
     deux métiers différents : c'est pour cela qu'ils ont été
     séparés en v818. */
  { cle:'acces',    emoji:'🔑', titre:'Accès',       section:'acces_eleves' },
  { cle:'proc',     emoji:'📄', titre:'Procédures',  section:'proccorriger' },
  /* En lecture seule — voir la note ci-dessus. Il suit le droit du
     cours : qui peut lire un bilan peut lire ce qui l'a produit. */
  { cle:'quest',    emoji:'📋', titre:'Questionnaire', section:'recherche' },
  { cle:'financement', emoji:'💶', titre:'Financement', section:'financements' },
  { cle:'handicap', emoji:'♿', titre:'Handicap',    section:'handicap' },
  /* 🔒 RGPD : ADMINISTRATEURS SEULEMENT.

     Ses deux actions sont les plus lourdes de l'outil. L'export du
     droit d'accès sort TOUT sur une personne — ses bilans en
     entier, ses notes, son suivi : c'est la plus large sortie de
     données que l'application sache produire. La suppression est
     irréversible.

     Avant la v788, l'export était accessible à tout compte ayant
     le droit « eleves », depuis le répertoire. C'est un
     resserrement délibéré, décidé le 2 septembre. */
  { cle:'rgpd',     emoji:'🔒', titre:'RGPD',        admin:true }
];

const CLE_ONGLET_ELEVE = 'onglet_page_eleve';

let elevePageOuverte = '';
let ongletPageEleve  = '';


/* ============================================================
   Y ARRIVER
   ============================================================ */

/* Le seul chemin d'entrée. Le répertoire et la loupe passent par
   là, et rien d'autre n'a besoin de savoir comment la page se
   dessine. */
function ouvrirPageEleve(nom){
  const propre = String(nom || '').trim();
  if(!propre) return;

  elevePageOuverte = propre;

  if(typeof afficherOnglet === 'function') afficherOnglet('eleves');
  if(typeof afficherVue === 'function') afficherVue('eleves', 'dossier');

  dessinerPageEleve();

  /* La recherche se range : on vient d'ouvrir quelqu'un, la liste
     des résultats n'a plus rien à dire. Fait ICI et pas dans le
     bouton, parce qu'on entre aussi par le répertoire et par la
     loupe — trois portes, un seul rangement. */
  const champ = $('pageEleveChamp');
  if(champ) champ.value = '';
  const trouves = $('pageEleveTrouves');
  if(trouves) trouves.innerHTML = '';
  const dossier = $('pageEleveDossier');
  if(dossier) dossier.style.display = '';

  const carte = document.querySelector('[data-vue="dossier"]');
  if(carte && carte.scrollIntoView){
    carte.scrollIntoView({ behavior:'smooth', block:'start' });
  }
}

/* Les onglets que CE compte peut voir. Un onglet marqué « admin »
   ne se donne pas par une section : il tient au rôle, comme le
   🗑️ du répertoire l'a toujours fait. */
function ongletsEleveVisibles(){
  const estAdmin = (typeof ACCES !== 'undefined') && ACCES.role === 'admin';
  return ONGLETS_ELEVE.filter(o => {
    if(o.admin) return estAdmin;
    return typeof sectionVisible !== 'function' || sectionVisible(o.section);
  });
}

/* L'onglet à ouvrir : le dernier choisi s'il est encore permis,
   sinon le premier. Un droit retiré ne doit pas laisser la page
   sur un onglet vide. */
function ongletEleveDeDepart(){
  const permis = ongletsEleveVisibles();
  if(!permis.length) return '';

  const voulu = ongletPageEleve ||
    (() => { try{ return localStorage.getItem(CLE_ONGLET_ELEVE) || ''; }
             catch(e){ return ''; } })();

  return permis.some(o => o.cle === voulu) ? voulu : permis[0].cle;
}


/* ============================================================
   LE RÉSUMÉ — LE MÊME QUE DANS L'HISTORIQUE DES LEÇONS

   « La même chose que ce qu'on voit quand on va dans historique
   des leçons. » C'est etapesEleve(), et elle n'est pas réécrite
   ici : elle est appelée.

   Une seule chose s'y ajoute : QUAND LA FICHE DE SUIVI ET LA NOTE
   NE DISENT PAS LA MÊME CHOSE, ON LE DIT. La note est relue au
   lasso dans du texte libre ; la fiche de suivi porte les vraies
   dates. Quand une date existe et que la note continue de dire
   « à prévoir », choisir en silence serait le pire des deux.
   ============================================================ */
/* eleveDuBureau : déclarée UNE fois, dans ec-noyau.js.

   Elle vivait ici ET dans ec-sessions.js, avec deux corps
   différents : celui qui gagnait dépendait de l'ordre des balises
   <script>. Et aucune des deux n'était indexée. */

/* ============================================================
   LA DERNIÈRE CHOSE DITE N'EST PAS LE DERNIER BILAN

   Le résumé se trompait, et de beaucoup : « 2ème leçon sur 4 »
   pour une élève que l'écran des prochains cours annonçait à sa
   « 8ème leçon — frise dépassée », avec son examen blanc réservé
   et son simulateur fait.

   La cause : « où en est un élève » était lu dans la note de son
   dernier bilan ENREGISTRÉ. Or ce n'est pas la dernière chose
   qu'on ait dite de lui — le cours qu'on lui a PRÉPARÉ l'est, et
   c'est celui que le bureau lit chaque matin. Deux écrans, deux
   sources, deux vérités.

   Les trois sources, de la plus ancienne à la plus récente :
   le dernier bilan, le cours préparé, les consignes du bureau
   (qui priment, c'est la règle depuis toujours). analyserNote
   sait déjà que c'est la DERNIÈRE annonce qui fait foi : il
   suffit de les lui donner dans l'ordre.
   ============================================================ */
function preparationDe(nom){
  const liste = (typeof prepares !== 'undefined' && Array.isArray(prepares))
    ? prepares : [];
  const siennes = liste.filter(x =>
    normaliserMot(x.eleve || '') === normaliserMot(nom) &&
    String(x.note || '').trim());
  if(!siennes.length) return null;

  /* La plus récente : un élève peut avoir deux cours préparés. */
  return siennes.sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || '')))[0];
}

/* Les cours préparés ne sont chargés que si l'onglet Cours a été
   ouvert. On prend d'abord le cache du téléphone — gratuit — puis
   on va les chercher UNE fois, et on redessine. L'écran ne reste
   jamais faux en attendant : il dit d'où vient ce qu'il montre. */
let prepDemandeesPourDossier = false;
function assurerPreparations(){
  if(typeof prepares === 'undefined') return;

  if(!prepares.length){
    if(typeof lireCachePrepares === 'function'){
      const cache = lireCachePrepares();
      if(cache && cache.length) prepares = cache;
    }
  }

  if(!prepares.length){
    if(prepDemandeesPourDossier || typeof chargerPrepares !== 'function') return;
    prepDemandeesPourDossier = true;
    chargerPrepares()
      .then(() => { refaireLesNotesPreparees(); rafraichirPageEleve(); })
      .catch(() => {});
    return;
  }

  refaireLesNotesPreparees();
}

/* ⚠️ LA NOTE STOCKÉE D'UN COURS PRÉPARÉ EST PÉRIMÉE PAR
   CONSTRUCTION — ET C'EST POUR ÇA QUE CETTE FONCTION EXISTE.

   Elle est écrite AU MOMENT DE LA PRÉPARATION. À la fin de la
   leçon, le moniteur répond au questionnaire : ce sont les
   réponses (« contexte ») qui changent, pas le texte. L'écran des
   prochains cours ne montre donc jamais la note stockée — il
   appelle rafraichirNotesPreparees(), qui la REFAIT à partir du
   contexte.

   Sans cet appel, le dossier lisait la photo d'AVANT la leçon :
   « 4ème leçon sur 4 · examen blanc à prévoir » pour une élève
   que le bureau voyait à sa 8ème avec son examen blanc réservé.

   AUCUN ÉCRAN NE DOIT LIRE « prep.note » SANS L'AVOIR REFAITE. */
function refaireLesNotesPreparees(){
  if(typeof rafraichirNotesPreparees !== 'function') return;
  try{ rafraichirNotesPreparees(); }catch(e){ /* une note qui résiste */ }
}

/* ============================================================
   CE QU'ON SAIT DE CHAQUE ÉTAPE — LES DEUX SOURCES, CROISÉES

   Le résumé ne montrait QUE ce que la note raconte. Pour un élève
   dont la note est pauvre, il affichait « 4ème leçon » et rien
   d'autre : ni simulateur, ni examen blanc, ni date d'examen. Pas
   parce qu'on ne sait rien — parce qu'on ne regardait qu'un seul
   endroit.

   LA FICHE DE SUIVI SAIT. Elle porte les vraies dates, en clair :
   date d'examen, date d'examen blanc, date de simulateur, résultat.
   Je m'en servais pour SIGNALER LES CONTRADICTIONS, jamais pour
   COMBLER LES SILENCES. C'est la même faute que d'habitude, dans
   l'autre sens : une information disponible, lue à un seul endroit.

   ─ ET LES TROIS LIGNES SONT TOUJOURS LÀ ─

   Simulateur, examen blanc, date d'examen s'affichent MÊME QUAND
   ON NE SAIT RIEN. Une ligne absente se lit « rien à signaler » ;
   or « personne ne sait » n'est pas « rien à signaler ».

   ─ UNE SEULE FOIS, POUR DEUX ÉCRANS ─

   Le résumé ET l'onglet 🎓 Permis lisent d'ici. J'avais écrit ce
   croisement dans l'onglet Permis et pas dans le résumé : deux
   endroits, deux vérités — encore.
   ============================================================ */

/* Une date française déjà passée ? Sert à dire « fait le » plutôt
   que « prévu le ». Une date illisible ne se devine pas : on la
   rend telle quelle, sans conclure. */
function jourDejaPasse(valeur){
  if(typeof dateFrVersIso !== 'function') return null;
  const iso = dateFrVersIso(String(valeur || ''));
  if(!iso) return null;
  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  return iso <= auj;
}

/* ============================================================
   LE NUMÉRO DE LEÇON — CELUI DES PROCHAINS COURS, PAS UN AUTRE

   Je prenais le plus grand de trois comptes : ce que dit la note,
   le plus grand numéro jamais écrit, et le nombre de bilans
   enregistrés. Une règle de plus, et elle se trompait sur le cas
   que le bureau voit le plus souvent : UNE NOTE QUI COMPTE DEPUIS
   UNE CHARNIÈRE.

   « 4ème leçon après l'examen blanc » ne veut pas dire quatrième
   leçon — c'est la quatrième DEPUIS l'examen blanc. La lire comme
   un total ramène un élève de sa neuvième à sa quatrième.

   numeroLeconDuCours() sait déjà tout ça : le total annoncé en
   toutes lettres (« 9ème au total »), la charnière qu'il ne faut
   surtout pas prendre pour un rang, et le contexte du
   questionnaire en dernier recours. C'est elle qui fait le numéro
   des prochains cours. On l'APPELLE ; on n'en réécrit pas une
   version.

   Trois sources, dans cet ordre :
   1. le cours préparé — exactement ce que le bureau lit ;
   2. la note du dernier bilan, avec la même règle ;
   3. à défaut, le nombre de bilans enregistrés — mais DIT comme
      tel, parce que ce n'est qu'une approximation.
   ============================================================ */
function numeroLeconEleve(nom, e){
  if(typeof numeroLeconDuCours !== 'function') return { valeur: 0 };

  /* 1. Le cours préparé : la même valeur, au chiffre près, que
     celle de « Prochains cours ». */
  const prep = preparationDe(nom);
  if(prep){
    const n = numeroLeconDuCours(prep);
    if(n) return { valeur: n };
  }

  /* 2. Son dernier bilan, lu avec la même règle. */
  if(e && e.note){
    const n = numeroLeconDuCours({ note: e.note, contexte: null });
    if(n) return { valeur: n };
  }

  /* 3. Le compte des bilans enregistrés. Il se trompe pour les
     élèves venus de l'ancien fonctionnement, qui ont moins de
     bilans que de leçons faites — alors on le dit au lieu de le
     faire passer pour la vérité. */
  const combien = Number(e && e.lecons) || 0;
  if(combien) return { valeur: combien, approx: true };

  return { valeur: 0 };
}

/* ------------------------------------------------------------
   LA PHRASE DE LA LEÇON, TELLE QUE LA CARTE L'AFFICHE

   « Je veux dans le dossier élève la même chose que dans mes
   prochains cours. »

   La carte ne calcule rien : elle prend la ligne 🎯 de la note et
   l'écrit en gros. C'est lignePosition qui la trouve. Le dossier
   appelle la MÊME fonction sur la MÊME note — deux façons de dire
   où en est un élève, c'est une de trop, et c'est toujours la
   mauvaise qui s'affiche là où on regarde.

   Le 🎯 saute : la ligne du dossier porte déjà son propre repère,
   et deux marqueurs côte à côte ne disent pas deux choses.
   ------------------------------------------------------------ */
function phraseLeconDeLEleve(nom, e){
  if(typeof lignePosition !== 'function' ||
     typeof morceauxDeNotePreparee !== 'function') return '';

  const lire = (note) => {
    if(!String(note || '').trim()) return '';
    let corps = note;
    try{ corps = morceauxDeNotePreparee(note).corps || note; }
    catch(err){ corps = note; }
    return String(lignePosition(corps) || '').replace(/^\s*🎯\s*/, '').trim();
  };

  /* Le cours préparé d'abord : c'est exactement ce que le bureau a
     sous les yeux dans « Mes prochains cours ». */
  const prep = preparationDe(nom);
  const p = prep ? lire(prep.note) : '';
  if(p) return p;

  /* À défaut, son dernier bilan : la phrase y est écrite pareil. */
  return lire(e && e.note);
}


/* Les étapes, dans l'ordre du parcours. Chacune dit ce qu'elle
   sait, d'où elle le tient, et si c'est fait ou à faire. */
function etapesCroiseesEleve(nom){
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  const e = eleveDuBureau(nom);
  const a = (e && e.etat) || {};
  const out = [];

  /* ── Repassages ── */
  if(a.repassages || s.nbAjournements){
    const n = Math.max(Number(a.repassages) || 0, Number(s.nbAjournements) || 0);
    const quand = s.dateAjournement || a.dateAjournement || '';
    out.push({ ok:false, emoji:'🔁',
      txt: n + (n === 1 ? 'er' : 'e') + ' repassage' +
           (quand ? ' — ajourné le ' + quand : '') });
  }

  /* ── LA LEÇON : LA MÊME PHRASE QUE « PROCHAINS COURS » ──

     ⚠️ LA MÊME PHRASE, PAS LE MÊME CHIFFRE.

     J'avais compris « le même numéro », et corrigé le numéro. Ce
     n'était pas la demande : « à la place de 6ème leçon dans le
     dossier, je veux 1ère leçon après l'examen blanc (2 prévues,
     6ème au total) ». La carte n'affiche pas un rang reconstruit —
     elle affiche LA LIGNE 🎯 DE LA NOTE, celle que le
     questionnaire a écrite. Rebâtir « 6ème leçon » à côté, c'est
     redire la même chose en moins bien : on perd la charnière, ce
     qui reste avant l'examen blanc, et la frise dépassée.

     Le dossier lit donc la même ligne, par la même fonction —
     lignePosition — et ne reconstruit plus rien quand elle existe.
     La reconstruction reste le filet, pour les élèves sans cours
     préparé et sans note. */
  const phrase = phraseLeconDeLEleve(nom, e);
  if(phrase){
    out.push({ ok:true, emoji:'✅', txt: phrase });
  }else{
    const n = numeroLeconEleve(nom, e);
    if(n.valeur){
      out.push({ ok:true, emoji:'✅',
        txt: n.valeur + (n.valeur === 1 ? 'ère' : 'ème') + ' leçon' +
             (a.leconTotal ? ' sur ' + a.leconTotal : '') +
             (a.friseDepassee ? ' — frise dépassée' : '') +
             (n.approx ? " (d'après ses bilans enregistrés)" : '') });
    }else{
      out.push({ ok:null, emoji:'❔', txt:'Numéro de leçon inconnu', flou:true });
    }
  }

  /* ── Le simulateur — TOUJOURS AFFICHÉ ── */
  if(s.simuDate){
    const passe = jourDejaPasse(s.simuDate);
    out.push({ ok:true, emoji: passe === false ? '📌' : '✅',
      txt: 'Simulateur nuit et risques — ' +
           (passe === false ? 'prévu le ' : 'fait le ') + jourFr(s.simuDate) });
  }else if(a.simuNuit === 'fait'){
    out.push({ ok:true, emoji:'✅', txt:'Simulateur nuit et risques fait' });
  }else if(a.simuDate){
    out.push({ ok:null, emoji:'📌',
      txt:'Simulateur nuit et risques prévu le ' + jourFr(a.simuDate) });
  }else if(a.simuNuit === 'prevu'){
    out.push({ ok:null, emoji:'📌', txt:'Simulateur nuit et risques prévu' });
  }else if(a.simuNuit === 'aprevoir'){
    out.push({ ok:false, emoji:'⏳', txt:'Simulateur nuit et risques à prévoir' });
  }else{
    out.push({ ok:null, emoji:'❔', txt:'Simulateur nuit et risques — rien de noté',
               flou:true });
  }

  /* ── L'examen blanc — TOUJOURS AFFICHÉ ──

     ⚠️ SON RÉSULTAT SE DIT AVEC LES MÊMES MOTS QU'AILLEURS.
     « — pas le niveau » était écrit ici, et nulle part la suite :
     ni « plus que les 3h », ni « encore 2 leçons ». Le bloc d'avant
     le cours (ec-avant-cours.js) sait les trois, par
     « resultatExamenBlanc » : on l'appelle plutôt que d'en écrire
     une seconde version, forcément plus pauvre. */
  const resEB = (typeof resultatExamenBlanc === 'function')
    ? resultatExamenBlanc(nom, a) : null;
  const suiteEB = resEB ? ' — ' + resEB.texte : '';

  /* ⚠️ v879 : « s.ebDate » ne se lit plus seule — la colonne a reçu
     la date de n'importe quel cours pendant des mois. Voir
     dateExamenBlancDuSuivi() dans ec-questionnaire.js. */
  const ebDuSuivi = (typeof dateExamenBlancDuSuivi === 'function')
    ? dateExamenBlancDuSuivi(nom, a) : '';
  if(ebDuSuivi){
    out.push({ ok:true, emoji:'✅',
      txt: 'Examen blanc ' + (jourDejaPasse(ebDuSuivi) === false ? 'prévu' : 'passé') +
           ' le ' + jourFr(ebDuSuivi) +
           (jourDejaPasse(ebDuSuivi) === false ? '' : suiteEB) });
  }else if(a.examBlanc === 'passe'){
    out.push({ ok:true, emoji:'✅',
      txt:'Examen blanc passé' + (a.ebDate ? ' le ' + jourFr(a.ebDate) : '') +
          suiteEB });
  }else if(a.examBlanc === 'reserve'){
    out.push({ ok:null, emoji:'📌',
      txt:'Examen blanc réservé' +
          (a.examBlancDate ? ' le ' + jourFr(a.examBlancDate)
            : (a.examBlancN !== null && a.examBlancN !== undefined
                ? ' dans ' + a.examBlancN + ' leçon(s)' : '')) });
  }else if(a.examBlanc === 'impossible'){
    out.push({ ok:false, emoji:'⏳', txt:'Examen blanc non planifiable' });
  }else if(a.examBlanc === 'aprevoir'){
    out.push({ ok:false, emoji:'⏳',
      txt:'Examen blanc à prévoir' +
          (a.examBlancN !== null && a.examBlancN !== undefined
            ? ' dans ' + a.examBlancN + ' leçon(s)' : '') });
  }else{
    out.push({ ok:null, emoji:'❔', txt:'Examen blanc — rien de noté', flou:true });
  }

  /* ── La date d'examen — TOUJOURS AFFICHÉE ── */
  if(s.datePermis){
    out.push({ ok:true, emoji:'🎓',
      txt:"Examen du permis le " + jourFr(s.datePermis) +
          (s.centre ? ' · ' + s.centre : '') });
  }else if(a.permis === 'prevu' && a.permisDate){
    out.push({ ok:true, emoji:'🎓',
      txt:"Examen du permis le " + jourFr(a.permisDate) +
          ' (annoncé au moniteur)' });
  }else if(a.permis === 'annule'){
    out.push({ ok:false, emoji:'⏳', txt:'Examen du permis annulé' });
  }else if(a.permis === 'aprevoir' || s.aPlanifier === 'oui'){
    out.push({ ok:false, emoji:'⏳', txt:"Date d'examen à prévoir" +
      (s.semaine ? ' — il a demandé ' + s.semaine : '') });
  }else{
    out.push({ ok:null, emoji:'❔', txt:"Date d'examen — rien de noté", flou:true });
  }

  /* ── PRÊTE-NOM, OU PLACE À REMPLACER ──

     « Idem dans les notes du dossier » — Chrystel, le 4 septembre,
     juste après l'avoir demandé sur la carte de 📅 Mes prochains
     cours. La ligne vient donc TOUT DE SUITE après la date
     d'examen : c'est elle qu'elle corrige. « Examen du permis le
     12 septembre » ne veut pas dire la même chose selon que la
     place est tenue pour de vrai ou pour occuper le créneau.

     La phrase n'est pas réécrite ici : c'est « marquePlaceExamen »
     (ec-bureau.js), celle qui sert aussi à la carte et à 🎓 Suivi
     permis. */
  const marquePlace = (typeof marquePlaceExamen === 'function')
    ? marquePlaceExamen(nom) : null;
  if(marquePlace){
    out.push({ ok:false, emoji: marquePlace.emoji, txt: marquePlace.long });
  }

  /* ── L'ACCOMPAGNEMENT, EN UNE LIGNE ──

     « Oui, avec une vue directe d'où ils en sont. » Une ligne, pas
     un bloc : le résumé sert à savoir en un coup d'œil, le détail
     est dans l'onglet 🎓 Permis juste à côté.

     Elle change la lecture de tout ce qui précède : un examen « à
     prévoir » sur un élève de 15 ans en conduite accompagnée n'est
     pas un retard, c'est le calendrier normal. */
  const accomp = (typeof ligneAccompagnementResume === 'function')
    ? ligneAccompagnementResume(nom) : null;
  if(accomp) out.push(accomp);

  /* ── Le résultat, s'il y en a un ── */
  if(s.resultat){
    out.push({ ok:true, emoji:'🏁', txt:'Résultat : ' + s.resultat });
  }

  if(a.pasEcoute) out.push({ ok:true, emoji:'✅', txt:"Pas d'écoutes pédagogiques" });

  return out;
}


/* La ligne d'accompagnement du mini-résumé, ou null.

   Elle se lit d'un coup d'œil, donc elle ne dit que ce qui appelle
   un geste : le retard s'il y en a un, sinon la prochaine échéance,
   sinon l'état. Tout énumérer ici reviendrait à recopier l'onglet
   Permis dans le résumé, et à ne plus rien voir. */
function ligneAccompagnementResume(nom){
  if(typeof typeAccompagnement !== 'function') return null;
  const type = typeAccompagnement(nom);
  if(!type) return null;

  if(type === 'CS'){
    const s = suiviDe(nom);
    const duree = dureeDepuis(s.rvpDate);
    const etat = etatQuestionEb(s, duree);
    if(!duree){
      return { ok:null, emoji:'🤝', flou:true,
        txt:'Conduite supervisée — pas de date de rendez-vous préalable' };
    }
    return { ok: etat.urgent ? false : (etat.cle === 'pret' ? true : null),
      emoji:'🤝',
      txt:'Conduite supervisée depuis ' + duree.txt + ' — ' +
          etat.txt.replace(/^[^\wÀ-ÿ]+\s*/, '') };
  }

  const x = dossierAac(nom);
  const bouts = [x.parcours.long];

  /* Le retard d'abord : c'est la seule chose qui demande un geste. */
  const enRetard = [['RVP 1', x.rdv.rvp1], ['RVP 2', x.rdv.rvp2]]
    .filter(([, e]) => e.retard).map(([t]) => t);
  if(enRetard.length) bouts.push('⚠️ ' + enRetard.join(' et ') + ' en retard');
  else if(x.rvtManquant) bouts.push('🗣️ théorique jamais fait');
  else if(x.ech.exam.iso) bouts.push('examen possible le ' + jourFr(x.ech.exam.iso));

  if(!x.naissance) bouts.push('date de naissance manquante');

  return { ok: (enRetard.length || x.rvtManquant) ? false : null,
           emoji:'🎓', txt: bouts.join(' — ') };
}


/* Les contradictions entre la fiche de suivi et la note. Une par
   ligne, dites telles quelles. */
function desaccordsSuivi(s, etat, ebDateSure){
  const dits = [];
  if(!s || !etat) return dits;

  /* ⚠️ v879 : la date d'examen blanc arrive DÉJÀ FILTRÉE (voir
     dateExamenBlancDuSuivi, ec-questionnaire.js). Sans le filtre,
     cet écran criait « la fiche de suivi porte un examen blanc le
     29 août » sur chaque élève dont la remontée des heures avait
     sali la colonne — une contradiction inventée de toutes
     pièces. Quand l'appelant ne dit rien, on prend ce qu'il y a :
     les tests appellent cette fonction directement. */
  const ebDate = (ebDateSure === undefined) ? s.ebDate : ebDateSure;

  if(s.datePermis && etat.permis === 'aprevoir'){
    dits.push('La fiche de suivi porte un examen le ' + jourFr(s.datePermis) +
              ", alors que le dernier bilan dit « date à prévoir ».");
  }
  if(ebDate && etat.examBlanc === 'aprevoir'){
    dits.push("La fiche de suivi porte un examen blanc le " + jourFr(ebDate) +
              ", alors que le dernier bilan dit « à prévoir ».");
  }
  if(s.simuDate && etat.simuNuit === 'aprevoir'){
    dits.push('La fiche de suivi porte un simulateur le ' + jourFr(s.simuDate) +
              ", alors que le dernier bilan dit « à prévoir ».");
  }
  return dits;
}

function blocResumeEleve(nom){
  const e = eleveDuBureau(nom);
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};

  const d = document.createElement('div');
  d.style.cssText = 'background:var(--navy);border:1px solid var(--line);' +
    'border-radius:10px;padding:12px;margin-bottom:12px;font-size:14px;' +
    'line-height:1.8;';

  const t = document.createElement('div');
  t.style.cssText = 'font-weight:700;margin-bottom:6px;';
  t.textContent = '📍 Où en est ' + nom;
  d.appendChild(t);

  /* Le cours préparé, s'il y en a un : c'est la dernière chose
     qu'on ait dite de cet élève. */
  assurerPreparations();
  const prep = preparationDe(nom);

  /* Bilan, puis cours préparé, puis consignes du bureau : de la
     plus ancienne annonce à la plus récente. La consigne reste en
     dernier — elle prime, c'est la règle depuis toujours.

     Ce texte-là ne sert plus qu'à NOURRIR l'analyse : le résumé se
     construit ensuite en croisant ce qu'il en tire avec la fiche
     de suivi. */
  const dit = [(e && e.note) || '', (prep && prep.note) || '']
    .filter(x => String(x).trim()).join(' · ');

  /* L'état lu dans le texte, remis dans l'élève : etapesCroiseesEleve
     s'en sert, et il doit tenir compte du cours préparé. */
  if(e && typeof analyserNote === 'function'){
    const aJour = analyserNote(dit + ' · ' +
      ((e.enAttente || []).map(x => x.texte).join(' · ')));
    Object.keys(aJour).forEach(k => {
      if(aJour[k] !== null && aJour[k] !== false) e.etat[k] = aJour[k];
    });
  }

  if(!e){
    const v = document.createElement('div');
    v.style.cssText = 'color:var(--muted);font-size:13px;line-height:1.5;';
    /* « Rien à dire » et « pas encore chargé » ne se ressemblent
       pas : l'un est une réponse, l'autre une absence. */
    v.textContent = "Son parcours n'est pas encore chargé sur cet appareil.";
    d.appendChild(v);
  }else{
    /* Les deux sources croisées, et les trois étapes clés toujours
       affichées — même quand personne ne sait. */
    etapesCroiseesEleve(nom).forEach(x => {
      const l = document.createElement('div');
      l.style.color = x.flou ? 'var(--muted)'
                    : ((x.ok === true) ? 'var(--accent-text)'
                      : (x.ok === false ? 'var(--warn-text)' : 'var(--cream)'));
      if(x.flou) l.style.fontSize = '13px';
      l.textContent = (x.emoji || '📌') + ' ' + x.txt;
      d.appendChild(l);
    });
  }

  /* D'OÙ VIENT CE QU'ON MONTRE.

     Sans cette ligne, on ne peut pas savoir si le résumé parle du
     cours de la semaine prochaine ou du bilan d'il y a deux mois —
     et c'est exactement ce qui a rendu l'erreur invisible. */
  if(prep){
    const src = document.createElement('div');
    src.style.cssText = 'font-size:11.5px;color:var(--muted);margin-top:7px;';
    /* En français, comme partout ailleurs : « 2026-09-02 » est une
       date de machine. Et les DEUX dates de la ligne s'écrivent
       pareil — l'une en toutes lettres et l'autre en ISO, on
       comparait deux choses qui ne se lisaient pas de la même
       façon. */
    src.textContent = '🗓️ Son cours préparé' +
      (prep.date ? ' du ' + jourFr(prep.date) : '') +
      ((e && e.date) ? ' · son bilan du ' + jourFr(e.date) : '') +
      ' · sa fiche de suivi';
    d.appendChild(src);
  }else if(e && e.date){
    const src = document.createElement('div');
    src.style.cssText = 'font-size:11.5px;color:var(--muted);margin-top:7px;';
    /* On nomme les DEUX sources lues, toujours. Dire « d'après son
       bilan » quand la moitié des lignes vient de la fiche de suivi
       serait faux — et c'est ce qui m'a fait chercher au mauvais
       endroit deux fois de suite. */
    src.textContent = '🗓️ Son bilan du ' + jourFr(e.date) +
      ' · sa fiche de suivi — aucun cours préparé.';
    d.appendChild(src);
  }

  desaccordsSuivi(s, e && e.etat,
                  (typeof dateExamenBlancDuSuivi === 'function')
                    ? dateExamenBlancDuSuivi(nom, e && e.etat) : '')
    .forEach(phrase => {
    const l = document.createElement('div');
    l.style.cssText = 'color:var(--warn-text);font-size:12.5px;line-height:1.5;' +
      'margin-top:7px;padding-top:7px;border-top:1px solid var(--line);';
    l.textContent = '⚠️ ' + phrase;
    d.appendChild(l);
  });

  return d;
}


/* ============================================================
   LA RECHERCHE, EN HAUT DE LA PAGE

   Elle disait : « choisis un élève dans le répertoire, ou cherche-le
   avec la loupe ». Autrement dit : va ailleurs. Un écran qui envoie
   quelque part n'est pas un écran, c'est un panneau — et c'est
   exactement le défaut que ce dossier était censé réparer.

   Le champ est donc ICI, en haut, et il ne se redessine jamais :
   recréer un champ à chaque frappe fait perdre le curseur au bout
   d'une lettre. Seuls les résultats et le dossier en dessous
   changent.

   Elle cherche avec chercherEleves() — la règle du répertoire, pas
   une deuxième.
   ============================================================ */
function poserRechercheEleve(zone){
  if($('pageEleveRecherche')) return;

  const bloc = document.createElement('div');
  bloc.id = 'pageEleveRecherche';
  bloc.style.marginBottom = '14px';

  const champ = document.createElement('input');
  champ.type = 'text';
  champ.id = 'pageEleveChamp';
  champ.autocomplete = 'off';
  champ.placeholder = '🔍 Un nom, un numéro, un mail, une formation';
  champ.style.marginBottom = '8px';
  bloc.appendChild(champ);

  const trouves = document.createElement('div');
  trouves.id = 'pageEleveTrouves';
  bloc.appendChild(trouves);

  champ.addEventListener('input', () => dessinerTrouvesEleve());
  /* Entrée sur un seul résultat : on ne fait pas cliquer pour rien.
     Sur plusieurs, on ne devine pas. */
  champ.addEventListener('keydown', e => {
    if(e.key !== 'Enter') return;
    const b = trouves.querySelectorAll('button');
    if(b.length === 1) b[0].click();
  });

  zone.appendChild(bloc);
}

/* Les noms qui correspondent, sous le champ. */
function dessinerTrouvesEleve(){
  const champ = $('pageEleveChamp');
  const zone = $('pageEleveTrouves');
  const dossier = $('pageEleveDossier');
  if(!champ || !zone) return;

  const q = champ.value.trim();
  zone.innerHTML = '';

  /* Champ vide : on rend la place au dossier ouvert. */
  if(!q){
    if(dossier) dossier.style.display = '';
    return;
  }

  const trouves = (typeof chercherEleves === 'function')
    ? chercherEleves(q, 40) : [];

  if(dossier) dossier.style.display = trouves.length ? 'none' : '';

  if(!trouves.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.cssText = 'padding:12px;font-size:13px;line-height:1.5;';
    /* « Rien trouvé » ne veut pas dire « il n'existe pas » : cette
       liste est celle de CET appareil. */
    v.innerHTML = 'Aucun élève ne correspond <strong>dans la mémoire de ' +
      'cet appareil</strong>.<br><span style="font-size:12px;">Il existe ' +
      "peut-être quand même — ouvre une fois le répertoire, ou " +
      "cherche-le dans l'historique des leçons.</span>";
    zone.appendChild(v);

    /* CRÉER, ICI, MAINTENANT.

       C'est le moment exact où l'on découvre qu'il n'existe pas.
       Envoyer chercher un bouton « ➕ Créer un élève » sur un autre
       écran, puis retaper le nom, serait deux corvées et une
       occasion de l'écrire autrement. Le nom part avec. */
    if(typeof creerEleveALaMain === 'function' &&
       (typeof sectionVisible !== 'function' || sectionVisible('eleves'))){
      const b = document.createElement('button');
      b.className = 'btn btn-primary';
      b.style.cssText = 'margin-top:10px;padding:12px;font-size:14px;';
      b.textContent = '➕ Créer « ' + q + ' »';
      b.addEventListener('click', () => creerEleveALaMain(q));
      zone.appendChild(b);
    }
    return;
  }

  trouves.forEach(n => {
    const f = (typeof ficheDe === 'function') ? (ficheDe(n) || {}) : {};
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:100%;text-align:left;margin:0 0 6px;' +
      'padding:10px 12px;font-size:13.5px;line-height:1.45;';
    b.innerHTML = '<strong>' + n.replace(/</g, '&lt;') + '</strong>' +
      (f.formation ? ' <span style="font-size:11px;color:var(--accent-text);">' +
        String(f.formation).replace(/</g, '&lt;') + '</span>' : '') +
      (f.telephone ? '<br><span style="font-size:11.5px;color:var(--muted);">📱 ' +
        String(f.telephone).replace(/</g, '&lt;') + '</span>' : '');
    b.addEventListener('click', () => {
      champ.value = '';
      champ.blur();
      ouvrirPageEleve(n);
    });
    zone.appendChild(b);
  });

  if(trouves.length === 40){
    const a = document.createElement('div');
    a.className = 'empty';
    a.style.cssText = 'padding:10px;font-size:12px;';
    a.textContent = '40 premiers résultats — affine la recherche.';
    zone.appendChild(a);
  }
}


/* ============================================================
   LA PAGE
   ============================================================ */
function dessinerPageEleve(){
  const racine = $('pageEleve');
  if(!racine) return;

  /* Le champ de recherche est posé une fois pour toutes ; seul le
     dossier en dessous se redessine. */
  poserRechercheEleve(racine);

  let zone = $('pageEleveDossier');
  if(!zone){
    zone = document.createElement('div');
    zone.id = 'pageEleveDossier';
    racine.appendChild(zone);
  }

  const nom = elevePageOuverte;
  if(!nom){
    zone.innerHTML = '<div class="empty" style="padding:14px;line-height:1.5;">' +
      "👆 Tape le nom d'un élève pour ouvrir son dossier." +
      '<br><span style="font-size:12px;">Sa fiche, ses cours, son permis, ' +
      'ses procédures — tout au même endroit.</span></div>';
    return;
  }

  zone.innerHTML = '';
  zone.appendChild(enteteEleve(nom));
  zone.appendChild(blocResumeEleve(nom));

  const onglets = ongletsEleveVisibles();
  if(!onglets.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = "Ton compte n'ouvre aucune partie du dossier.";
    zone.appendChild(v);
    return;
  }

  ongletPageEleve = ongletEleveDeDepart();
  zone.appendChild(barreOngletsEleve(onglets));

  const corps = document.createElement('div');
  corps.id = 'pageEleveCorps';
  corps.style.marginTop = '12px';
  zone.appendChild(corps);

  remplirOngletEleve(corps, nom, ongletPageEleve);
}

/* Prénom Nom, et la formation à côté : les deux choses qu'on
   vérifie avant de parler de quelqu'un.

   L'ÂGE Y EST AUSSI, ET IL NE SE TAIT JAMAIS. « Je veux voir l'âge
   à côté du nom prénom ; quand la date de naissance n'est pas
   enregistrée tu mets ❓ ans. » Un âge absent qui ne s'affiche pas
   se confond avec un âge qu'on n'a pas regardé — et l'âge est une
   des deux conditions de l'examen. La pastille se clique dans les
   deux cas : pour poser la date, ou pour corriger une saisie. */
function enteteEleve(nom){
  const f = (typeof ficheDe === 'function') ? (ficheDe(nom) || {}) : {};

  const d = document.createElement('div');
  d.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;' +
    'margin-bottom:12px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:19px;font-weight:800;flex:1;min-width:0;' +
    'line-height:1.25;';
  t.textContent = (f.genre === 'F' ? '♀ ' : (f.genre === 'M' ? '♂ ' : '')) + nom;
  d.appendChild(t);

  d.appendChild(pastilleAgeEleve(nom, f));

  /* Corriger une faute de frappe dans le nom. Réservé au bureau et
     aux administratrices : renommer touche toutes les feuilles du
     classeur, ce n'est pas un geste de bord de route. */
  if(typeof peutModifier !== 'function' || peutModifier('eleves')){
    d.appendChild(boutonRenommerEleve(nom));
  }

  if(f.formation){
    const p = document.createElement('span');
    p.style.cssText = 'flex-shrink:0;font-size:12px;font-weight:700;' +
      'padding:5px 11px;border-radius:999px;background:var(--orange);' +
      'color:var(--navy-deep);';
    p.textContent = f.formation;
    d.appendChild(p);
  }

  if(f.autreAE){
    const p = document.createElement('span');
    p.style.cssText = 'flex-shrink:0;font-size:12px;padding:5px 10px;' +
      'border-radius:999px;border:1px solid var(--line);color:#E8A33D;';
    p.textContent = '🏫 ' + (f.autreAENom || 'autre auto-école');
    d.appendChild(p);
  }

  return d;
}


/* ── L'ÂGE, TOUJOURS AFFICHÉ ────────────────────────────────────

   Le calcul n'est pas refait ici : c'est « ageDe », dans
   ec-fenetres.js, la même règle que pour les listes AAC et CS.
   Deux écrans qui compteraient chacun leur âge finiraient par ne
   pas être d'accord un 29 février. */
function pastilleAgeEleve(nom, f){
  const iso = (f && f.naissance) || '';
  const a = (typeof ageDe === 'function') ? ageDe(iso) : null;
  const connu = (a !== null && a !== undefined);

  const p = document.createElement('button');
  p.className = 'btn btn-secondary';
  p.style.cssText = 'width:auto;flex:0 0 auto;margin:0;padding:5px 11px;' +
    'font-size:12px;font-weight:700;border-radius:999px;white-space:nowrap;' +
    (connu ? '' : 'border-color:var(--orange);color:var(--orange);');
  p.textContent = '🎂 ' + (connu ? a : '❓') + ' ans';
  p.title = connu
    ? 'Né(e) le ' + ((typeof dateEnToutesLettres === 'function')
        ? dateEnToutesLettres(iso) : iso) + ' — clique pour corriger'
    : 'Date de naissance inconnue — clique pour la poser';

  p.addEventListener('click', async () => {
    if(typeof choisirDate !== 'function' ||
       typeof fixerDateNaissance !== 'function') return;
    const choisie = await choisirDate('Date de naissance', iso);
    if(!choisie) return;
    /* On délègue : la fiche appartient à ec-fenetres, et c'est lui
       qui l'écrit — pour la fiche, pour les listes AAC et pour ici. */
    if(!await fixerDateNaissance(nom, choisie)) return;
    showToast('Enregistré ✅');
    dessinerPageEleve();
  });

  return p;
}


/* ── CORRIGER UNE FAUTE DE FRAPPE DANS LE NOM ───────────────────

   « Il faut que je puisse changer le nom prénom si j'ai fait une
   erreur de frappe. »

   Ce n'est pas une modification de fiche : LE NOM EST LA CLÉ. Il
   est écrit dans une vingtaine de feuilles — les bilans, le suivi,
   les places d'examen, les cours préparés, les consignes, l'accès à
   l'espace élève… Le corriger d'un seul côté couperait le dossier
   en deux, et l'ancienne moitié serait introuvable.

   Le renommage vit donc dans le classeur, en un seul passage. Et
   côté écran il vit dans ec-fenetres, avec le reste de la fiche :
   CETTE PAGE N'ÉCRIT RIEN ELLE-MÊME, c'est la règle qui tient tout
   le module — voir l'en-tête. Elle appelle, comme pour la date de
   naissance juste au-dessus. */
function boutonRenommerEleve(nom){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;flex:0 0 auto;margin:0;padding:5px 10px;' +
    'font-size:12px;border-radius:999px;white-space:nowrap;';
  b.textContent = '✏️ Nom';
  b.title = 'Corriger une faute de frappe dans le nom ou le prénom';
  b.addEventListener('click', async () => {
    if(typeof corrigerNomEleve !== 'function') return;
    const apres = await corrigerNomEleve(nom);
    if(!apres) return;
    elevePageOuverte = apres;
    dessinerPageEleve();
  });
  return b;
}

function barreOngletsEleve(onglets){
  const b = document.createElement('div');
  b.style.cssText = 'display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;';

  onglets.forEach(o => {
    const actif = (o.cle === ongletPageEleve);
    const x = document.createElement('button');
    x.className = 'btn btn-secondary';
    x.dataset.ongletEleve = o.cle;
    x.style.cssText = 'width:auto;flex:0 0 auto;margin:0;padding:8px 12px;' +
      'font-size:13px;border-radius:999px;white-space:nowrap;' +
      (actif ? 'background:var(--orange);color:var(--navy-deep);' +
               'border-color:var(--orange);font-weight:700;' : '');
    x.textContent = o.emoji + ' ' + o.titre;
    x.addEventListener('click', () => choisirOngletEleve(o.cle));
    b.appendChild(x);
  });

  return b;
}

function choisirOngletEleve(cle){
  ongletPageEleve = cle;
  try{ localStorage.setItem(CLE_ONGLET_ELEVE, cle); }catch(e){}
  dessinerPageEleve();
}

function remplirOngletEleve(corps, nom, cle){
  if(cle === 'fiche')       return ongletFiche(corps, nom);
  if(cle === 'cours')       return ongletCours(corps, nom);
  if(cle === 'permis')      return ongletPermis(corps, nom);
  if(cle === 'acces')       return ongletAcces(corps, nom);
  if(cle === 'proc')        return ongletProcedures(corps, nom);
  if(cle === 'quest')       return ongletQuestionnaire(corps, nom);
  if(cle === 'financement') return ongletFinancement(corps, nom);
  if(cle === 'handicap')    return ongletHandicap(corps, nom);
  if(cle === 'rgpd')        return ongletRgpd(corps, nom);
}


/* ============================================================
   📋 QUESTIONNAIRE — EN LECTURE, ET SEULEMENT EN LECTURE

   « Tu peux mettre la visibilité du questionnaire dans le dossier
   élève. » Et, plus tôt : « le questionnaire dans le dossier — mon
   avis : oui, mais EN LECTURE. »

   ⚠️ CET ONGLET N'ENREGISTRE RIEN, ET C'EST LA CONDITION POUR
   QU'IL EXISTE.

   Le questionnaire n'est pas un écran qui enregistre : c'est un
   formulaire dont les réponses sont consommées par le cours. Lui
   ouvrir un SECOND chemin d'écriture depuis ici, ce serait deux
   endroits qui écrivent la même chose — la faute que cette page
   répare partout ailleurs. On montre donc ce qui a été répondu, et
   on dit où aller pour le changer.

   Deux sources, dans cet ordre :
   1. le cours préparé — les réponses gardées, telles quelles ;
   2. à défaut, ce que la note du dernier bilan laisse relire.
   La seconde est une relecture au lasso dans du texte libre : elle
   est annoncée comme telle, jamais présentée comme une réponse.
   ============================================================ */

/* Le nom lisible d'une réponse gardée. Les clés inconnues sont
   montrées telles quelles plutôt que masquées : une réponse qu'on
   ne sait pas nommer reste une réponse, et la cacher ferait croire
   que le moniteur n'avait rien dit. */
const NOMS_REPONSES_QUEST = {
  lecon: 'Numéro de leçon', leconMain: 'Numéro tapé à la main',
  frise: 'Frise', formation: 'Formation',
  manoeuvresFaites: 'Manœuvres faites', totalManoeuvres: 'Manœuvres au total',
  leconsDepuisEB: "Leçons depuis l'examen blanc",
  leconsDepuisRdvPost: 'Leçons depuis le RDV post-permis',
  leconsParBoite: 'Leçons par boîte',
  examBlanc: 'Examen blanc', examBlancN: 'Examen blanc dans (leçons)',
  examBlancDate: "Date de l'examen blanc",
  ebPasse: 'Examen blanc passé', ebSuite: "Suite de l'examen blanc",
  avantEB: "Leçons avant l'examen blanc",
  examDate: "Date d'examen", examPermis: 'Examen du permis',
  examPermisN: 'Examen dans (leçons)', examPassage: 'Passage',
  nouvelleDate: 'Nouvelle date', dateAjournement: "Date d'ajournement",
  repassages: 'Repassages', heuresRepassage: 'Heures de repassage',
  heuresRestantes: 'Heures restantes',
  simuNuit: 'Simulateur nuit et risques',
  rvPrealable: 'Rendez-vous préalable', formAccomp: 'Formation accompagnateur',
  rdvPostFait: 'RDV post-permis fait', rdvPostDate: 'Date du RDV post-permis',
  rdvPostMoniteur: 'Moniteur du RDV post-permis',
  rdvPostAPrevoir: 'RDV post-permis à prévoir',
  avantRdvPost: 'Avant le RDV post-permis',
  avantExamRate: 'Avant examen manqué',
  handicap: 'Handicap', amenagements: 'Aménagements',
  coussin: 'Coussin vert', sansBilan: 'Aucun bilan au classeur',
  modele: 'Modèle de bilan', premierCours: 'Premier cours'
};

function ongletQuestionnaire(corps, nom){
  corps.innerHTML = '';

  const prep = preparationDe(nom);
  const e = eleveDuBureau(nom);

  if(!prep && !(e && e.note)){
    corps.appendChild(vidDossier(
      'Rien à montrer : aucun cours préparé, aucun bilan enregistré.'));
    return;
  }

  /* ── D'OÙ VIENT CE QU'ON MONTRE, DIT EN PREMIER ── */
  const src = document.createElement('div');
  src.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.6;' +
    'border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
    'margin-bottom:12px;';
  src.innerHTML = prep
    ? '📋 Les réponses du <strong>cours préparé' +
      (prep.date ? ' du ' + jourFr(prep.date) : '') + '</strong>' +
      (prep.moniteur ? ', par ' + String(prep.moniteur).replace(/</g, '&lt;')
                     : '') + '.'
    : '📋 Aucun cours préparé : ce qui suit est <strong>relu dans la note ' +
      'du dernier bilan</strong>, ce ne sont pas des réponses gardées.';
  corps.appendChild(src);

  /* ── CE QUI A ÉTÉ RÉPONDU ── */
  const ctx = prep
    ? ((typeof contexteEnObjet === 'function')
        ? (contexteEnObjet(prep.contexte) || {}) : (prep.contexte || {}))
    : ((typeof defautsDepuisNote === 'function')
        ? defautsDepuisNote((e && e.note) || '') : {});

  const cles = Object.keys(ctx || {})
    .filter(k => {
      const v = ctx[k];
      if(v === '' || v === null || v === undefined) return false;
      if(Array.isArray(v) && !v.length) return false;
      return true;
    })
    .sort((a, b) => String(NOMS_REPONSES_QUEST[a] || a)
      .localeCompare(String(NOMS_REPONSES_QUEST[b] || b), 'fr'));

  if(cles.length){
    corps.appendChild(sousTitreDossier(prep ? 'Réponses gardées'
                                            : 'Relu dans la note'));
    cles.forEach(k => {
      const v = ctx[k];
      corps.appendChild(ligneDossier(
        NOMS_REPONSES_QUEST[k] || k,
        Array.isArray(v) ? v.join(' · ') : String(v)));
    });
  }else{
    corps.appendChild(vidDossier('Aucune réponse gardée sur ce cours.'));
  }

  /* ── ET LA NOTE ENTIÈRE, PARCE QUE C'EST ELLE QUI VOYAGE ──

     C'est la note que le moniteur lira au volant, et celle que le
     bureau relit dans ses listes. La montrer entière évite d'avoir
     à croire sur parole le découpage du dessus. */
  const note = (prep && prep.note) || (e && e.note) || '';
  if(String(note).trim()){
    corps.appendChild(sousTitreDossier('La note, telle qu\'elle est écrite'));
    const z = document.createElement('div');
    z.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
      'padding:11px 12px;font-size:13px;line-height:1.7;white-space:pre-wrap;' +
      'word-break:break-word;';
    z.textContent = (typeof noteEnClair === 'function')
      ? noteEnClair(note) : String(note);
    corps.appendChild(z);
  }

  /* ── OÙ ALLER POUR LA CHANGER ── */
  const pied = document.createElement('div');
  pied.style.cssText = 'font-size:11.5px;color:var(--muted);line-height:1.6;' +
    'margin-top:14px;';
  pied.textContent = 'Cet onglet ne modifie rien. Les réponses se changent ' +
    'là où elles sont posées : dans le questionnaire du cours, depuis ' +
    '📅 Mes prochains cours.';
  corps.appendChild(pied);
}


/* ── Petites briques d'affichage, communes aux onglets ─────── */

function ligneDossier(titre, detail, couleur){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
    'padding:9px 11px;margin-bottom:7px;display:flex;gap:9px;' +
    'align-items:center;';

  const g = document.createElement('div');
  g.style.cssText = 'flex:1;min-width:0;';

  const h = document.createElement('div');
  h.style.cssText = 'font-size:13.5px;font-weight:700;' +
    (couleur ? 'color:' + couleur + ';' : '');
  h.textContent = titre;
  g.appendChild(h);

  if(detail){
    const s = document.createElement('div');
    s.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;' +
      'margin-top:2px;';
    s.textContent = detail;
    g.appendChild(s);
  }

  d.appendChild(g);
  return d;
}

/* Un bouton d'action posé sur une ligne. Il ne fait jamais le
   travail : il appelle celui qui sait. */
function actionDossier(ligne, libelle, faire){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;flex:0 0 auto;margin:0;padding:7px 11px;' +
    'font-size:12px;white-space:nowrap;';
  b.textContent = libelle;
  b.addEventListener('click', async () => {
    b.disabled = true;
    try{ await faire(); }
    catch(e){ showToast('Impossible : ' + (e.message || e)); }
    b.disabled = false;
  });
  ligne.appendChild(b);
  return b;
}

function sousTitreDossier(texte){
  const d = document.createElement('div');
  d.style.cssText = 'font-size:11px;letter-spacing:.08em;text-transform:uppercase;' +
    'color:var(--muted);margin:14px 0 7px;';
  d.textContent = texte;
  return d;
}

function vidDossier(texte){
  const d = document.createElement('div');
  d.className = 'empty';
  d.textContent = texte;
  return d;
}

/* Le renvoi vers l'écran complet. La page montre ce qui concerne
   cet élève ; le travail de fond se fait là où il s'est toujours
   fait. */
function boutonEcranComplet(corps, libelle, vue){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-top:10px;padding:10px;font-size:13px;';
  b.textContent = libelle;
  b.addEventListener('click', () => {
    if(typeof afficherVue === 'function') afficherVue('eleves', vue);
  });
  corps.appendChild(b);
}

/* Un onglet qui attend le réseau doit le dire, sinon un écran vide
   ressemble à « il n'y a rien ». */
function attenteDossier(corps, texte){
  corps.innerHTML = (typeof htmlAttente === 'function')
    ? htmlAttente(texte)
    : '<div class="empty">' + texte + '</div>';
}

function echecDossier(corps, e){
  corps.innerHTML = '';
  corps.appendChild(vidDossier('⚠️ ' + (e.message || e)));
}


/* ============================================================
   📇 FICHE — zéro appel réseau
   ============================================================ */
function ongletFiche(corps, nom){
  const f = (typeof ficheDe === 'function') ? (ficheDe(nom) || {}) : null;

  if(!f){
    corps.appendChild(vidDossier(
      "Aucune fiche au répertoire pour cet élève."));
  }else{
    const champs = [
      ['📱 Téléphone', f.telephone
        ? ((typeof telLisible === 'function') ? telLisible(f.telephone) : f.telephone)
        : ''],
      ['✉️ Mail', f.email],
      ['✉️ Prescripteur', f.mailPrescripteur],
      ['💬 Messenger', f.messenger],
      ['📇 Dossier ANTS', f.ants === 'nous' ? 'Fait par nous'
        : (f.ants === 'eleve' ? "Fait par l'élève" : '')],
      ['🧭 Frise', f.frise],
      ['📝 Remarques', f.remarques]
    ].filter(x => String(x[1] || '').trim());

    if(!champs.length){
      corps.appendChild(vidDossier(
        'Sa fiche est vide : ni numéro, ni mail, ni formation.'));
    }else{
      const t = document.createElement('div');
      t.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
        'padding:4px 12px;';
      champs.forEach(([k, v], i) => {
        const l = document.createElement('div');
        l.style.cssText = 'display:flex;gap:12px;justify-content:space-between;' +
          'padding:9px 0;font-size:13.5px;line-height:1.5;' +
          (i ? 'border-top:1px solid var(--line);' : '');
        const a = document.createElement('span');
        a.style.cssText = 'color:var(--muted);flex-shrink:0;';
        a.textContent = k;
        const b = document.createElement('span');
        b.style.cssText = 'text-align:right;min-width:0;word-break:break-word;';
        b.textContent = v;
        l.appendChild(a); l.appendChild(b);
        t.appendChild(l);
      });
      corps.appendChild(t);
    }
  }

  /* LE POSTE DE CONDUITE, QUI SE COCHE SANS OUVRIR LA FICHE.

     C'est l'information qu'on corrige le plus vite, souvent en
     revenant d'un cours. Les deux pastilles viennent du répertoire
     telles quelles — pastillesPosteDeConduite() les écrit une
     seule fois, ici comme ailleurs. */
  if(typeof pastillesPosteDeConduite === 'function'){
    const p = document.createElement('div');
    p.style.cssText = 'display:flex;align-items:center;gap:10px;' +
      'margin-top:12px;padding:10px 12px;border:1px solid var(--line);' +
      'border-radius:10px;';

    const l = document.createElement('div');
    l.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.45;';
    l.innerHTML = '🪑 <strong>Poste de conduite</strong>' +
      '<div style="font-size:11.5px;color:var(--muted);">' +
      'Conduite aménagée, coussin — ce qu\'il faut monter dans la ' +
      'voiture.</div>';
    p.appendChild(l);
    p.appendChild(pastillesPosteDeConduite(nom, () => dessinerPageEleve()));
    corps.appendChild(p);
  }

  const rangee = document.createElement('div');
  rangee.style.cssText = 'display:flex;gap:8px;margin-top:12px;';

  /* La modification passe par la fenêtre du répertoire, telle
     quelle : c'est elle qui sait enregistrer, et elle le sait
     depuis longtemps. */
  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'flex:1;margin:0;padding:12px;font-size:14px;';
  b.textContent = '✏️ Modifier la fiche';
  b.addEventListener('click', () => {
    if(typeof ouvrirFicheEleve !== 'function'){
      showToast("Le répertoire n'est pas disponible sur cet écran.");
      return;
    }
    ouvrirFicheEleve(nom, (typeof ficheDe === 'function') ? ficheDe(nom) : null);
  });
  rangee.appendChild(b);

  /* Lui écrire, s'il a un numéro. */
  if(f && f.telephone && typeof telPourLien === 'function'){
    const s = document.createElement('a');
    s.href = 'sms:' + telPourLien(f.telephone);
    s.className = 'btn btn-secondary';
    s.style.cssText = 'width:auto;flex:0 0 auto;margin:0;padding:12px 14px;' +
      'font-size:15px;text-decoration:none;display:inline-flex;' +
      'align-items:center;';
    s.textContent = '💬';
    s.title = 'Envoyer un SMS à ' + nom;
    rangee.appendChild(s);
  }

  corps.appendChild(rangee);
}


/* ============================================================
   🔑 ACCÈS — SON COIN RÉVISIONS

   afficherEspaceEleve() sait déjà tout faire : lire son code, le
   lui créer, choisir ce qu'il trouve dans son espace, et le lui
   envoyer. Elle vivait au fond de la fenêtre de modification, où
   il fallait savoir qu'elle était.
   ============================================================ */
function ongletAcces(corps, nom){
  if(typeof afficherEspaceEleve !== 'function'){
    corps.appendChild(vidDossier(
      "Le coin révisions n'est pas disponible sur cet écran."));
    return;
  }
  afficherEspaceEleve(nom, corps);
}


/* ============================================================
   🔒 RGPD — LES DEUX DEMANDES QU'UN ÉLÈVE PEUT FAIRE

   « Donnez-moi tout ce que vous avez sur moi » et « effacez tout ».
   Elles portent sur exactement le même périmètre, et c'est pour ça
   qu'elles sont côte à côte : voir ce qu'on détient avant de
   l'effacer est la seule façon de savoir ce qu'on efface.

   Onglet réservé aux administrateurs.
   ============================================================ */
function ongletRgpd(corps, nom){
  const t = document.createElement('div');
  t.style.cssText = 'font-size:12.5px;color:var(--muted);line-height:1.55;' +
    'margin-bottom:12px;';
  t.innerHTML = 'Les deux demandes qu\'un élève peut faire au titre du ' +
    'RGPD. Elles portent sur le <strong>même périmètre</strong> : tout ' +
    'ce que l\'outil détient à son nom.';
  corps.appendChild(t);

  /* La zone d'avancement : l'effacement prend une dizaine de
     secondes, et un écran muet pendant dix secondes ressemble à une
     panne. */
  const etat = document.createElement('div');
  etat.style.cssText = 'font-size:12.5px;line-height:1.5;margin:12px 0;' +
    'color:var(--muted);';
  const dire = (texte, couleur) => {
    etat.style.color = couleur || 'var(--muted)';
    etat.textContent = texte;
  };

  /* Le droit d'accès. */
  const lExp = ligneDossier('📄 Éditer son dossier complet',
    "Tout ce qu'on détient à son nom, en un document — bilans, " +
    'suivi, résultats, procédures.');
  actionDossier(lExp, '📄 Éditer', async () => {
    if(typeof editerDossierEleve !== 'function'){
      showToast("L'export n'est pas disponible sur cet écran.");
      return;
    }
    await editerDossierEleve(nom, null);
  });
  corps.appendChild(lExp);

  /* L'effacement. */
  const lSup = ligneDossier('🗑️ Tout supprimer',
    "Bilans, fiche de suivi, examens, cours à venir, captures, " +
    'messages, répertoire. Irréversible.', 'var(--warn-text)');
  actionDossier(lSup, '🗑️ Supprimer', async () => {
    if(typeof supprimerDepuisRepertoire !== 'function'){
      showToast("La suppression n'est pas disponible sur cet écran.");
      return;
    }
    const bilan = await supprimerDepuisRepertoire(nom, null, dire);
    /* On NE REFERME PAS la page tout de suite, et c'est voulu : le
       compte rendu dit ce qui a été effacé — et, le cas échéant, ce
       qui a raté. L'escamoter au bout d'une seconde reviendrait à
       annoncer « supprimé » sans laisser vérifier. La recherche,
       elle, ne le trouvera plus. */
    if(bilan) lSup.style.opacity = '.5';
  });
  corps.appendChild(lSup);

  corps.appendChild(etat);
}


/* ============================================================
   📚 COURS — un appel, filtré par nom côté serveur
   ============================================================ */
async function ongletCours(corps, nom){
  if(typeof ligneBilan !== 'function'){
    corps.appendChild(vidDossier(
      "L'historique des leçons n'est pas disponible sur cet écran."));
    return;
  }

  attenteDossier(corps, 'Lecture de ses leçons…');

  let res = [];
  try{
    /* La recherche filtre par nom CÔTÉ SERVEUR : un seul appel, et
       seulement ses lignes à lui. */
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code,
                             eleve: nom, moniteur: '', site: '' })
    });
    if(r.status === 403){ verrouiller('Session expirée, saisis ton code à nouveau.'); return; }
    const data = await r.json();
    res = (data && data.resultats) || [];
  }catch(e){ return echecDossier(corps, e); }

  if(ongletPageEleve !== 'cours') return;
  corps.innerHTML = '';

  if(!res.length){
    corps.appendChild(vidDossier(
      "Aucun bilan enregistré pour cet élève. Vérifie que son nom " +
      'est écrit comme lors des cours.'));
    return;
  }

  const t = document.createElement('div');
  t.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:9px;';
  t.textContent = res.length + ' leçon(s) — la plus récente en premier. ' +
    '✉️ renvoie le bilan par mail.';
  corps.appendChild(t);

  /* LA MÊME LIGNE QUE L'HISTORIQUE DES LEÇONS, PAS UNE COPIE.

     Elle vivait enfermée dans « rechercherEleve » ; elle en est
     sortie pour que les deux écrans la partagent. Le jour où le
     renvoi par mail changera, il changera pour les deux. */
  res.forEach(item => corps.appendChild(
    ligneBilan(item, nom, () => dessinerPageEleve())));
}


/* ============================================================
   🎓 PERMIS — zéro appel réseau, zéro écriture nouvelle

   Tout est déjà en mémoire : la fiche de suivi est chargée pour le
   bureau. Et chaque bouton appelle une fonction qui existait avant
   cette page.
   ============================================================ */

/* ------------------------------------------------------------
   L'ACCOMPAGNEMENT — AAC OU CS

   « Faut-il voir les élèves AAC et CS dans le dossier élève aussi ?
   — Oui, avec une vue directe d'où ils en sont. »

   Le même contenu que les listes de Suivi, dans le dossier. Pas une
   deuxième lecture : ce sont LES MÊMES fonctions — dossierAac,
   etatQuestionEb, dureeDepuis — et LES MÊMES boutons. Le dossier
   affiche et délègue, c'est la règle du module.

   Rien ne s'affiche pour un élève qui n'est ni AAC ni CS : un cadre
   vide sur les trois quarts des dossiers, c'est du bruit.
   ------------------------------------------------------------ */
function blocAccompagnement(corps, nom){
  if(typeof typeAccompagnement !== 'function') return;
  const type = typeAccompagnement(nom);
  if(!type) return;

  corps.appendChild(sousTitreDossier(
    type === 'AAC' ? 'Sa conduite accompagnée' : 'Sa conduite supervisée'));

  const zone = document.createElement('div');
  zone.style.cssText = 'display:flex;flex-direction:column;gap:2px;';

  (type === 'AAC' ? lignesAacDossier(nom) : lignesCsDossier(nom))
    .forEach(l => {
      const d = document.createElement('div');
      d.style.cssText = 'font-size:12.5px;line-height:1.6;' +
        (l.couleur ? 'color:' + l.couleur + ';' : '') +
        (l.fort ? 'font-weight:700;' : '') +
        (l.faible ? 'opacity:.65;' : '');
      d.textContent = l.txt;
      zone.appendChild(d);
    });
  corps.appendChild(zone);

  /* LES MÊMES BOUTONS QUE LA LISTE. Ils redessinent les deux écrans
     par redessinerAacCs : le dossier ouvert et la liste derrière. */
  const act = document.createElement('div');
  act.style.cssText = 'display:flex;flex-wrap:wrap;gap:7px;margin:9px 0 4px;';
  try{
    if(type === 'AAC' && typeof boutonsAac === 'function'){
      boutonsAac(dossierAac(nom), act);
    }else if(type === 'CS' && typeof boutonsCs === 'function'){
      const s = suiviDe(nom);
      const duree = dureeDepuis(s.rvpDate);
      boutonsCs({ eleve: nom, suivi: s, duree: duree,
                  etat: etatQuestionEb(s, duree),
                  eb: examenBlancDe(nom) }, act);
    }
  }catch(e){ /* sans les boutons, la lecture reste juste */ }
  if(act.children.length) corps.appendChild(act);
}


/* Ce qu'on lit d'un AAC dans son dossier — les mêmes phrases que la
   liste, dans le même ordre. */
function lignesAacDossier(nom){
  const x = dossierAac(nom);
  const out = [{ txt: x.parcours.long, fort: true }];

  out.push(x.ech.exam.iso
    ? { txt: '🎓 Examen possible le ' + jourFr(x.ech.exam.iso) +
             ' (' + x.ech.exam.pourquoi + ')', fort: true }
    : { txt: "🎓 Date d'examen possible inconnue — il manque " +
             (x.ech.exam.manque === 'naissance' ? 'sa date de naissance'
                                                : 'son rendez-vous préalable'),
        couleur: 'var(--warn-text)' });

  out.push({ txt: '① Préalable — ' + x.rdv.prealable.txt });
  [['② RVP 1', x.rdv.rvp1], ['③ RVP 2', x.rdv.rvp2],
   ['🗣️ Théorique', x.rdv.rvt]].forEach(([t, e]) => {
    out.push({ txt: t + ' — ' + e.txt,
      couleur: e.retard ? 'var(--warn-text)'
             : (e.cle === 'fait' || e.cle === 'ailleurs' || e.cle === 'prevu')
               ? 'var(--accent-text)' : '',
      faible: e.cle === 'sansobjet' });
  });

  lignesExamenDossier(x.exam).forEach(l => out.push(l));
  return out;
}


/* L'EXAMEN OFFICIEL : ajourné quand, et une nouvelle date ou pas.

   Les mêmes deux phrases que les listes de Suivi — c'est
   examenOfficielDe qui les compose, ici comme là-bas. Le dossier ne
   relit rien de son côté. */
function lignesExamenDossier(exam){
  if(!exam) return [];
  const out = [];
  if(exam.ajourne){
    out.push({ txt: exam.ajourne.txt, couleur: 'var(--warn-text)' });
  }
  if(exam.devant.txt){
    out.push({ txt: exam.devant.txt,
      couleur: exam.aReprogrammer ? 'var(--warn-text)'
             : (exam.devant.cle === 'prevu' || exam.devant.cle === 'obtenu'
                ? 'var(--accent-text)' : '') });
  }
  return out;
}


function lignesCsDossier(nom){
  const s = suiviDe(nom);
  const duree = dureeDepuis(s.rvpDate);
  const etat = etatQuestionEb(s, duree);

  const out = [];
  out.push(duree
    ? { txt: 'CS depuis ' + duree.txt + ' — préalable le ' + jourFr(s.rvpDate),
        fort: true }
    : { txt: '🎂 Pas de date de rendez-vous préalable — rien à compter ' +
             "tant qu'elle manque", couleur: 'var(--warn-text)' });

  out.push({ txt: etat.txt,
    couleur: etat.urgent ? 'var(--warn-text)'
           : (etat.cle === 'pret' ? 'var(--accent-text)' : '') });

  lignesExamenDossier(examenOfficielDe(nom)).forEach(l => out.push(l));
  return out;
}


function ongletPermis(corps, nom){
  if(typeof suiviDe !== 'function' || typeof majSuivi !== 'function'){
    corps.appendChild(vidDossier(
      "Le suivi permis n'est pas disponible sur cet écran."));
    return;
  }

  const s = suiviDe(nom);
  const e = eleveDuBureau(nom);
  const a = (e && e.etat) || {};

  if(!e && !s.eleve){
    corps.appendChild(vidDossier(
      "Son suivi n'est pas encore chargé. Ouvre une fois le bureau, " +
      'puis reviens ici.'));
    return;
  }

  const refaire = () => dessinerPageEleve();

  /* ── L'ACCOMPAGNEMENT, QUAND IL Y EN A UN ──

     En tête, parce que c'est le cadre : tout le reste de cet onglet
     se lit différemment selon qu'il est en AAC ou pas. Un examen
     « à prévoir » sur un élève de 15 ans en conduite accompagnée
     n'est pas un retard, c'est le calendrier normal.

     ⚠️ CE BLOC AFFICHE ET DÉLÈGUE, comme tout le reste du dossier :
     il appelle les fonctions de ec-aac-cs, celles-là mêmes que la
     liste de Suivi utilise. Une donnée, deux écrans, une seule
     écriture. */
  blocAccompagnement(corps, nom);

  /* ── Avant l'examen ── */
  corps.appendChild(sousTitreDossier("Avant l'examen"));

  /* LE SIMULATEUR. La colonne fait foi ; à défaut, ce que dit la
     note — et on précise lequel des deux on lit, parce qu'une date
     devinée dans une phrase n'est pas une date. */
  /* Trois sources, dans cet ordre, et on dit toujours laquelle on
     lit : la COLONNE (v785, la vraie), puis la date devinée dans la
     note, puis le simple état. Une devinette qui se présente comme
     un fait est pire qu'un blanc. */
  const simuFait = (a.simuNuit === 'fait');
  const lSimu = ligneDossier(
    '🌙 Simulateur nuit et risques',
    s.simuDate ? 'Prévu le ' + jourFr(s.simuDate)
      : (a.simuDate ? 'Prévu le ' + jourFr(a.simuDate) +
                      ' — annoncé dans un bilan, pas encore enregistré'
        : (simuFait ? "Fait — date non enregistrée, d'après le dernier bilan"
          : (a.simuNuit === 'prevu' ? 'Prévu — date non enregistrée'
            : 'À prévoir'))),
    (s.simuDate || a.simuDate || simuFait) ? 'var(--accent-text)'
      : 'var(--warn-text)');

  actionDossier(lSimu, s.simuDate ? '📅 Changer' : '📅 Fixer la date',
    async () => {
      const iso = await choisirDate('Date du simulateur nuit et risques');
      if(!iso) return;
      await fixerDateSimu(nom, iso);
      showToast('Date enregistrée ✅');
      refaire();
    });
  corps.appendChild(lSimu);

  /* La case « prévenu », celle du bureau, telle quelle. */
  if(typeof casePrevenu === 'function'){
    const c = casePrevenu({ eleve: nom }, 'simuPrevenu',
      '📣 Message envoyé pour réserver le simulateur');
    c.style.marginLeft = '2px';
    corps.appendChild(c);
  }

  /* L'EXAMEN BLANC.

     ⚠️ v879 : la date du suivi passe par le filtre — sans lui, la
     date de la dernière leçon s'affichait ici comme celle d'un
     examen blanc qui n'avait pas eu lieu. */
  const ebDate = (typeof dateExamenBlancDuSuivi === 'function')
    ? dateExamenBlancDuSuivi(nom, a) : '';
  const lEb = ligneDossier(
    '📝 Examen blanc',
    ebDate ? 'Passé le ' + jourFr(ebDate) +
        /* La consigne suit le résultat ici aussi : c'est l'écran où
           le bureau replace un examen blanc, et il doit savoir ce
           qu'on a demandé au moniteur entre-temps. */
        (s.ebNiveau === 'non'
          ? ' — pas le niveau — ' +
            ((typeof CONSIGNE_PAS_LE_NIVEAU !== 'undefined')
              ? CONSIGNE_PAS_LE_NIVEAU : 'FAIRE LE POINT À CHAQUE LEÇON')
          : '') +
        (s.ebMoniteur ? ' · ' + s.ebMoniteur : '')
      : (a.examBlanc === 'passe' ? 'Passé — date non enregistrée'
        : (a.examBlanc === 'reserve' ? 'Réservé' +
             (a.examBlancDate ? ' le ' + jourFr(a.examBlancDate) : '')
          : (a.examBlanc === 'impossible' ? 'Non planifiable'
            : 'À prévoir' + (a.examBlancN !== null && a.examBlancN !== undefined
                ? ' dans ' + a.examBlancN + ' leçon(s)' : '')))),
    (ebDate || a.examBlanc === 'passe') ? 'var(--accent-text)'
      : (a.examBlanc === 'reserve' ? 'var(--cream)' : 'var(--warn-text)'));

  actionDossier(lEb, '📅 Planifier', async () => {
    const iso = await choisirDate("Date de l'examen blanc");
    if(!iso) return;
    const jour = dateEnToutesLettres(iso) || iso;
    await envoyerConsigne(nom, 'examblanc',
      'Examen blanc prévu le ' + jour + ' (bureau)');
    if(typeof noterExamenBlanc === 'function'){
      await noterExamenBlanc(nom, '', jour);
    }
    showToast('Examen blanc planifié ✅');
    refaire();
  });
  corps.appendChild(lEb);

  if(typeof casePrevenu === 'function'){
    const c = casePrevenu({ eleve: nom }, 'ebPrevenu',
      "📣 Message envoyé pour l'examen blanc");
    c.style.marginLeft = '2px';
    corps.appendChild(c);
  }

  /* ── L'examen ── */
  corps.appendChild(sousTitreDossier("L'examen du permis"));

  const lDate = ligneDossier(
    '📅 Date d\'examen',
    s.datePermis ? jourFr(s.datePermis) + (s.centre ? ' · ' + s.centre : '')
      : (a.permis === 'prevu' && a.permisDate
          ? jourFr(a.permisDate) + ' (annoncé au moniteur)'
        : (a.permis === 'annule' ? 'Annulé' : 'À prévoir')),
    s.datePermis ? 'var(--accent-text)' : 'var(--warn-text)');

  /* ON CHOISIT UNE PLACE, PAS UNE DATE.

     Le calendrier libre a disparu : il laissait prendre n'importe
     quel jour, et le serveur fabriquait la session derrière. On
     prend une place réellement ouverte — et le vœu de l'élève part
     avec, parce que c'est une demande à respecter, pas une
     préférence à oublier au moment de placer. */
  actionDossier(lDate, s.datePermis ? '📅 Changer de place' : '📅 Prendre une place',
    async () => {
      if(typeof choisirPlaceExamen !== 'function'){
        showToast("Les sessions d'examen ne sont pas disponibles ici.");
        return;
      }
      const place = await choisirPlaceExamen(nom, s.semaine);
      if(!place) return;
      await placerEleveSurPlace(nom, place);
      showToast('Place prise ✅');
      refaire();
    });
  corps.appendChild(lDate);

  /* ── UNE DATE QUE PLUS RIEN NE PORTE ──

     Chrystel, le 4 septembre : « je l'ai enlevée et supprimé la
     session, et sa fiche dit toujours que son permis est prévu le
     04/09. Je veux la remettre dans les élèves prêts au permis, je
     ne peux pas. »

     Sa FICHE n'a plus de date, mais la NOTE de son dernier cours
     l'annonce encore — et le bureau ne peut pas réécrire une note.
     « dejaPlace » lit cette annonce, la croit, et l'écarte de la
     liste des élèves prêts au permis. Elle n'est plus nulle part.

     La v857 empêche que ça se reproduise. Ce bouton-ci répare
     celles à qui c'est déjà arrivé — et il ne s'affiche QUE dans ce
     cas précis : une annonce, pas de date sur la fiche, pas de
     place sur une session. */
  const annonceSeule = !s.datePermis && a.permis === 'prevu' && a.permisDate &&
    !(typeof placeEnSessionDe === 'function' && placeEnSessionDe(nom));
  if(annonceSeule && typeof rendreALaListeRdvPermis === 'function'){
    const lBloc = ligneDossier('⚠️ Une date que plus rien ne porte',
      'Le dernier cours annonce un examen le ' + jourFr(a.permisDate) +
      ', mais sa fiche n’a pas de date et il ne tient aucune place. ' +
      'Tant que cette annonce est là, il reste écarté des élèves prêts ' +
      'au permis.', 'var(--warn-text)');
    actionDossier(lBloc, '↩️ Le remettre', async () => {
      if(!await confirmer('Remettre ' + nom + ' dans les élèves prêts ' +
          'au permis ?\n\nL’annonce « examen prévu le ' +
          jourFr(a.permisDate) + ' » est défaite : le moniteur lira ' +
          '« date à reprendre ».')) return;
      await rendreALaListeRdvPermis(nom, a.permisDate || '');
      if(typeof viderCaches === 'function') viderCaches(nom);
      if(typeof afficherBureau === 'function') await afficherBureau(true);
      showToast(nom + ' → élèves prêts au permis ✅');
      refaire();
    });
    corps.appendChild(lBloc);
  }

  /* Ce que l'élève a demandé. Il ne se règle pas ici — c'est le
     bureau qui le note dans la liste RDV Permis — mais il se
     RAPPELLE ici, sinon on place quelqu'un contre son vœu sans
     jamais le voir. */
  if(s.semaine){
    corps.appendChild(ligneDossier('🗓️ Il a demandé',
      s.semaine + (s.datePermis ? '' : ' — pas encore placé'),
      s.datePermis ? '' : 'var(--warn-text)'));
  }

  /* LA LISTE. envoyerVersListe fait déjà tout : les champs de la
     fiche, la consigne qui va avec, le vidage des caches. */
  const lListe = ligneDossier('🗂️ Liste', libelleListePermis(s),
    'var(--cream)');
  if(typeof envoyerVersListe === 'function'){
    actionDossier(lListe, '🔀 Changer', async () => {
      await envoyerVersListe(nom);
      refaire();
    });
  }
  corps.appendChild(lListe);

  /* ═══ SA SESSION, À LA PLACE DU « GROUPE D'EXAMEN ».

     Le groupe était une étiquette de texte, sans aucun lien avec
     les sessions : elle ne servait qu'à cibler les messages
     Messenger quand une même date compte deux inspecteurs. Dans un
     dossier, elle ne répondait à aucune question.

     Ce qu'on veut savoir, c'est AVEC QUI il passe et À QUELLE
     HEURE. Ça vit sur la place, pas sur la fiche de suivi — d'où
     l'appel réseau de cet onglet. */
  zoneSessionEleve(corps, nom);

  /* ── Ce qui est passé ── */
  const passe = [];
  if(s.resultat){
    passe.push(['🏁 Résultat', s.resultat +
      (s.nbAjournements ? ' · ' + s.nbAjournements + ' ajournement(s)' : '') +
      (s.dateAjournement ? ' · dernier le ' + s.dateAjournement : '')]);
  }
  if(s.rdvPostDate || s.rdvPostFait){
    passe.push(['🗣️ Bilan post-permis',
      (s.rdvPostFait === 'oui' ? 'Fait' : 'Prévu') +
      (s.rdvPostDate ? ' le ' + s.rdvPostDate : '') +
      (s.rdvPostMoniteur ? ' · ' + s.rdvPostMoniteur : '')]);
  }
  if(s.heuresRepassage) passe.push(['⏱️ Heures de repassage', s.heuresRepassage]);
  if(s.heuresRestantes) passe.push(['⏱️ Heures restantes', s.heuresRestantes]);

  if(passe.length){
    corps.appendChild(sousTitreDossier('Ce qui est déjà passé'));
    passe.forEach(([t, d]) => corps.appendChild(ligneDossier(t, d)));
  }

  /* La passerelle, quand la question ne s'est pas ouverte au bon
     moment. Asynchrone : voir juste en dessous. */
  zonePasserelleEleve(corps, nom, refaire);

  boutonEcranComplet(corps, '🎓 Ouvrir le suivi permis complet', 'permis');
}

/* ============================================================
   🔀 LA PASSERELLE BEA → BV, QUAND ELLE N'A PAS ÉTÉ PROPOSÉE

   Chrystel, le 4 septembre : « il est où le bouton, quand un élève
   en BEA a eu son permis, pour dupliquer sa fiche en passerelle ? »

   Il n'y en avait pas : la question s'ouvre toute seule après
   « ✅ Permis obtenu », et une fois passée elle ne revient jamais.
   Or elle ne s'ouvrait pas du tout pour les élèves dont la boîte
   n'est écrite que dans leur formation (corrigé en v864) — et pour
   ceux-là, le geste n'existait plus nulle part.

   D'où ce bouton, dans son dossier, à l'endroit qu'elle a choisi.
   Il fait EXACTEMENT la même chose : « proposerPasserelle », avec
   sa fenêtre, son archive d'abord et son effacement en dernier.
   Deux chemins, un seul geste.

   ⚠️ « PERMIS OBTENU » EFFACE LA FICHE DE SUIVI. On ne peut donc
   pas lire le résultat là où on le lit d'habitude : il faut la
   feuille des Résultats, la seule trace qui survit — celle qui
   nourrit les taux de réussite, déjà lue et gardée cinq minutes
   par « chargerResultatsConnus ».

   Et la boîte se lit par « boiteDe », PAS par ce que cette feuille
   dit : jusqu'à la v864 elle y était consignée par la fonction
   appauvrie, donc « BV » pour les élèves qu'on veut justement
   rattraper. Croire la trace ici, ce serait croire l'erreur.
   ============================================================ */
async function zonePasserelleEleve(corps, nom, refaire){
  if(typeof proposerPasserelle !== 'function') return;
  /* Proposer un effacement définitif à qui ne peut que regarder,
     c'est promettre ce que le serveur refusera. */
  if(typeof peutModifier === 'function' && !peutModifier('eleves')) return;

  const boite = (typeof boiteDe === 'function')
    ? String(boiteDe(nom) || '').toLowerCase() : '';
  if(boite !== 'bea') return;

  /* La place est prise tout de suite, remplie après : l'ordre des
     blocs de l'onglet ne doit pas dépendre du réseau. */
  const zone = document.createElement('div');
  corps.appendChild(zone);

  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  let obtenu = /obtenu/i.test(String(s.resultat || ''));

  if(!obtenu && typeof chargerResultatsConnus === 'function'){
    try{
      const connus = await chargerResultatsConnus();
      const r = connus[normaliserMot(nom)];
      obtenu = !!(r && /obtenu/i.test(String(r.resultat || '')));
    }catch(e){
      /* Résultats illisibles : on n'affiche rien plutôt que de
         proposer un effacement sur une supposition. */
    }
  }
  if(!obtenu) return;

  zone.appendChild(sousTitreDossier('Passerelle BEA → BV'));

  /* Déjà faite : on le DIT, au lieu de reproposer un geste qui
     créerait une seconde fiche du même nom. */
  const nomPass = nomFichePasserelle(nom);
  if(typeof ficheDe === 'function' && ficheDe(nomPass)){
    zone.appendChild(ligneDossier('✅ Sa fiche passerelle existe déjà',
      nomPass + ' — ses prochains cours se préparent sur celle-là.',
      'var(--accent-text)'));
    return;
  }

  const l = ligneDossier('🔀 Permis obtenu en boîte automatique',
    'Sa fiche peut être dupliquée en passerelle BEA → BV. Son dossier BEA ' +
    'sera archivé sur le Drive, puis effacé — la fenêtre redit tout avant ' +
    'de commencer, et rien n’est effacé si l’archive échoue.',
    'var(--warn-text)');
  actionDossier(l, '🔀 Passerelle BEA → BV', async () => {
    await proposerPasserelle({ eleve: nom }, 'BEA');
    if(typeof viderCaches === 'function') viderCaches(nom);
    refaire();
  });
  zone.appendChild(l);
}

/* ============================================================
   SA SESSION D'EXAMEN — AVEC QUI, ET À QUELLE HEURE

   Le seul appel réseau de l'onglet 🎓 Permis, et il est assumé :
   l'heure de passage n'existe nulle part ailleurs. Elle n'est PAS
   sur la fiche de suivi — « heurePermis » y est écrit mais jamais
   relu — elle vit sur la place de la session.
   ============================================================ */
async function zoneSessionEleve(corps, nom){
  const zone = document.createElement('div');
  zone.appendChild(sousTitreDossier('Sa session d\'examen'));
  const dedans = document.createElement('div');
  dedans.innerHTML = '<div class="empty" style="padding:10px;font-size:12px;">' +
    'Lecture des sessions…</div>';
  zone.appendChild(dedans);
  corps.appendChild(zone);

  if(typeof chargerSessionsPermis !== 'function'){
    dedans.innerHTML = '';
    dedans.appendChild(vidDossier("Les sessions ne sont pas disponibles ici."));
    return;
  }

  try{ await chargerSessionsPermis(); }
  catch(e){
    dedans.innerHTML = '';
    dedans.appendChild(vidDossier('⚠️ ' + (e.message || e)));
    return;
  }

  /* L'onglet a pu changer pendant l'appel. */
  if(ongletPageEleve !== 'permis') return;
  dedans.innerHTML = '';

  const t = sessionDeLEleve(nom);
  if(!t){
    dedans.appendChild(vidDossier(
      "Il n'est sur aucune session d'examen."));
    return;
  }

  const s = t.session, p = t.place;
  dedans.appendChild(ligneDossier(
    '🎓 ' + ((typeof dateEnToutesLettres === 'function')
              ? dateEnToutesLettres(s.date) : s.date) +
      (s.centre ? ' — ' + s.centre : ''),
    ['🕐 Son passage : ' + (p.heure || s.heureDebut || 'heure non fixée'),
     s.moniteur ? '🚗 ' + s.moniteur : '',
     s.inspecteur ? '👤 ' + s.inspecteur : '',
     p.dossierOk ? '✅ dossier OK' : '',
     p.prevenu ? '📣 prévenu' : ''].filter(Boolean).join(' · '),
    'var(--accent-text)'));

  /* Les autres du même créneau : c'est la question qu'on se pose
     vraiment — avec qui il passe, et dans quel ordre. */
  const autres = (s.eleves || []).slice()
    .sort((a, b) => (a.rang || 0) - (b.rang || 0));
  if(autres.length > 1 || autres.some(x => !x.eleve)){
    const bloc = document.createElement('div');
    bloc.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
      'padding:9px 11px;margin-bottom:7px;font-size:12.5px;line-height:1.7;';
    bloc.innerHTML = '<div style="font-weight:700;font-size:12.5px;' +
      'margin-bottom:4px;">Les autres du même jour</div>' +
      autres.map(x => {
        const heure = x.heure || '—';
        if(!x.eleve){
          return '<div style="color:var(--muted);">' + heure +
                 ' — 👻 place libre</div>';
        }
        const moi = normaliserMot(x.eleve) === normaliserMot(nom);
        return '<div' + (moi ? ' style="color:var(--accent-text);font-weight:700;"' : '') +
               '>' + heure + ' — ' + x.eleve.replace(/</g, '&lt;') + '</div>';
      }).join('');
    dedans.appendChild(bloc);
  }
}


/* Dans quelle liste il tombe, d'après sa fiche de suivi. C'est
   LISTES_PERMIS qui décide, pas une deuxième règle écrite ici :
   on cherche la première liste dont tous les champs collent. */
function libelleListePermis(s){
  if(typeof LISTES_PERMIS === 'undefined') return 'Listes non chargées';

  const colle = LISTES_PERMIS.find(l =>
    Object.keys(l.champs).every(k =>
      String(s[k] || '') === String(l.champs[k] || '')));

  if(colle) return colle.nom;
  if(s.datePermis) return '🎓 Date fixée le ' + jourFr(s.datePermis);
  return 'Dans aucune liste';
}


/* ============================================================
   📄 PROCÉDURES — un appel, filtré par nom côté serveur
   ============================================================ */
async function ongletProcedures(corps, nom){
  attenteDossier(corps, 'Lecture de ses procédures…');

  let demandes = [], recits = [];
  try{
    const [a, b] = await Promise.all([
      appelPrep({ action:'demandesList', eleve: nom }).catch(() => null),
      appelPrep({ action:'recitationsList', eleve: nom }).catch(() => null)
    ]);
    demandes = (a && a.demandes) || [];
    recits = ((b && b.recitations) || [])
      .filter(x => normaliserMot(x.eleve || '') === normaliserMot(nom));
  }catch(e){ return echecDossier(corps, e); }

  /* L'onglet a pu changer pendant l'appel : on n'écrit pas
     par-dessus ce que le moniteur regarde maintenant. */
  if(ongletPageEleve !== 'proc') return;
  corps.innerHTML = '';

  const enCours = demandes.filter(x => x.etat !== 'fait');
  const faites = demandes.filter(x => x.etat === 'fait');

  if(enCours.length){
    corps.appendChild(sousTitreDossier('Demandé, pas encore fait'));
    enCours.forEach(x => corps.appendChild(ligneDossier(
      '📥 ' + (x.procedure || x.texte || 'Procédure'),
      ['demandé le ' + (x.creeLe || '?'), x.par ? 'par ' + x.par : '',
       x.etat && x.etat !== 'fait' ? x.etat : ''].filter(Boolean).join(' · '),
      'var(--warn-text)')));
  }

  if(recits.length){
    corps.appendChild(sousTitreDossier(
      recits.length + ' procédure(s) récitée(s)'));
    /* La plus récente en premier : c'est celle qui dit où il en est. */
    recits.slice()
      .sort((a, b) => String(b.quand || b.creeLe || '')
                        .localeCompare(String(a.quand || a.creeLe || '')))
      .slice(0, 30)
      .forEach(x => corps.appendChild(ligneDossier(
        (x.valide === 'oui' ? '✅ ' : '🗣️ ') + (x.procedure || 'Procédure'),
        [x.quand || x.creeLe, x.note, x.par ? 'corrigé par ' + x.par : '']
          .filter(Boolean).join(' · '),
        x.valide === 'oui' ? 'var(--accent-text)' : '')));
  }

  if(faites.length){
    corps.appendChild(sousTitreDossier(faites.length + ' demande(s) traitée(s)'));
  }

  if(!enCours.length && !recits.length){
    corps.appendChild(vidDossier('Aucune procédure demandée ni récitée.'));
  }

  boutonEcranComplet(corps, '📥 Ouvrir les procédures à corriger', 'proccorriger');
}


/* ============================================================
   💶 FINANCEMENT — la feuille entière, donc seulement à l'ouverture
   ============================================================ */
async function ongletFinancement(corps, nom){
  attenteDossier(corps, 'Lecture des dossiers…');

  let dossiers = [];
  try{
    const a = await appelPrep({ action:'peList' });
    if(a && a.status === 'error') throw new Error(a.message);
    dossiers = ((a && a.dossiers) || [])
      .filter(x => normaliserMot(x.eleve || '') === normaliserMot(nom));
  }catch(e){ return echecDossier(corps, e); }

  if(ongletPageEleve !== 'financement') return;
  corps.innerHTML = '';

  if(!dossiers.length){
    corps.appendChild(vidDossier('Aucun dossier de financement à son nom.'));
  }else{
    dossiers.forEach(x => corps.appendChild(ligneDossier(
      '💶 ' + (x.type || 'Dossier'),
      [x.statut, x.montant, x.dateDemande || x.creeLe].filter(Boolean).join(' · '))));
  }

  /* Ce que le bureau suit lui-même sur la fiche de suivi. */
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
  if(s.resteAPayer || s.paiementPrevu || s.relanceLe){
    corps.appendChild(sousTitreDossier('Sur sa fiche de suivi'));
    if(s.resteAPayer) corps.appendChild(ligneDossier('Reste à payer', s.resteAPayer));
    if(s.paiementPrevu) corps.appendChild(ligneDossier('Paiement prévu le', s.paiementPrevu));
    if(s.relanceLe) corps.appendChild(ligneDossier('Relancé le', s.relanceLe));
  }

  boutonEcranComplet(corps, '💶 Ouvrir les financements', 'financements');
}


/* ============================================================
   ♿ HANDICAP
   ============================================================ */
async function ongletHandicap(corps, nom){
  attenteDossier(corps, 'Lecture du suivi handicap…');

  /* ⚠️ « AUCUN SUIVI HANDICAP À SON NOM » — ALORS QU'IL Y EN AVAIT UN.

     Le dossier de Pascal Gortais ne trouvait rien : son suivi est
     rangé sous « Gortais Pascal ». La feuille du suivi handicap est
     tenue en « Nom Prénom », tout le reste de l'outil en « Prénom
     Nom ». Deux conventions, et deux écrans qui ne se reconnaissent
     plus.

     La lecture passe désormais par « resumeHandicap » — le MÊME
     lecteur que la carte du cours, qui essaie le nom exact d'abord
     et l'ordre des mots ensuite. Deux lecteurs auraient fini par ne
     pas trouver les mêmes gens. */
  let r = null;
  try{
    if(typeof chargerHandicapSiBesoin !== 'function'){
      throw new Error("Le suivi handicap n'est pas disponible ici.");
    }
    await chargerHandicapSiBesoin();
    r = resumeHandicap(nom);
  }catch(e){ return echecDossier(corps, e); }

  if(ongletPageEleve !== 'handicap') return;
  corps.innerHTML = '';

  /* Le poste de conduite vient du répertoire, pas de cette feuille :
     deux choses différentes, qu'on montre côte à côte.

     ⚠️ EN LECTURE SEULE ICI, ET C'EST DÉLIBÉRÉ. Il se coche dans
     l'onglet 📇 Fiche. Le rendre modifiable des deux endroits
     ferait deux chemins d'écriture pour une même donnée — la faute
     que ce dossier tout entier répare. */
  const p = (typeof posteDeConduite === 'function') ? posteDeConduite(nom) : {};
  if(p && (p.amenagee || p.coussin)){
    corps.appendChild(ligneDossier('🪑 Poste de conduite',
      [p.amenagee ? 'Conduite aménagée' : '',
       p.coussin ? 'Coussin vert' : ''].filter(Boolean).join(' · ') +
      ' — se règle dans 📇 Fiche',
      'var(--accent-text)'));
  }

  if(!r){
    corps.appendChild(vidDossier('Aucun suivi handicap à son nom.'));
    boutonEcranComplet(corps, '♿ Ouvrir le suivi handicap', 'handicap');
    return;
  }

  /* ⚠️ ON MONTRAIT LES CLÉS TECHNIQUES.

     « dossierDdtm : oui », « dateEval : 28/08 » — l'ancien code
     parcourait l'objet et affichait ce qu'il trouvait, nom de
     colonne compris. On montre maintenant ce que Chrystel a
     demandé : le résumé, les étapes cochées, et la date du
     rendez-vous DDTM — ou « à prendre » quand elle manque. */
  const tete = [r.parcours, r.faites + '/' + r.total + ' étapes'].filter(Boolean);
  corps.appendChild(ligneDossier(r.fini ? '✅ Dossier complet' : '♿ Où en est le dossier',
    tete.join(' · '), r.fini ? 'var(--accent-text)' : 'var(--cream)'));

  /* Le nom sous lequel il est rangé, quand il diffère : sans cette
     ligne, on chercherait longtemps dans l'écran ♿. */
  if(r.nomRange){
    corps.appendChild(ligneDossier('🔤 Rangé sous', r.nomRange, 'var(--muted)'));
  }

  /* LE RENDEZ-VOUS DDTM, EN HAUT ET EN COULEUR.

     C'est la seule information de cet écran qui appelle une action
     du bureau. Un blanc ne dit rien ; « à prendre » dit quoi
     faire. */
  corps.appendChild(ligneDossier('📋 Rendez-vous DDTM',
    r.ddtm.aPrendre ? 'Rendez-vous à prendre'
                    : ('le ' + r.ddtm.date),
    r.ddtm.aPrendre ? 'var(--orange)' : 'var(--accent-text)'));

  if(r.pathologie) corps.appendChild(ligneDossier('🩺 Pathologie', r.pathologie));
  if(r.equipement) corps.appendChild(ligneDossier('🔧 Équipement', r.equipement));

  /* Les étapes, dans l'ordre où elles se déroulent, cochées ou non.
     Les montrer TOUTES : ce qui reste à faire vaut ce qui est
     fait, et une liste tronquée se lit comme un dossier fini. */
  const zEt = document.createElement('div');
  zEt.style.cssText = 'margin:10px 0 4px;';
  r.etapes.forEach(et => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:9px;align-items:center;padding:4px 0;' +
      'font-size:14px;line-height:1.5;';
    l.innerHTML = '<span style="flex-shrink:0;">' + (et.fait ? '✅' : '⬜') + '</span>' +
      '<span style="flex:1;min-width:0;color:' +
        (et.fait ? 'var(--cream)' : 'var(--muted)') + ';">' +
        et.nom.replace(/</g, '&lt;') + '</span>' +
      (et.date ? '<span style="flex-shrink:0;font-size:12px;' +
                 'color:var(--accent-text);">' +
                 et.date.replace(/</g, '&lt;') + '</span>' : '');
    zEt.appendChild(l);
  });
  corps.appendChild(zEt);

  if(r.commentaire) corps.appendChild(ligneDossier('📝 Commentaire', r.commentaire));

  boutonEcranComplet(corps, '♿ Ouvrir le suivi handicap', 'handicap');
}


/* ============================================================
   REDESSINER QUAND UNE ÉCRITURE EST PASSÉE AILLEURS

   Les fonctions du bureau finissent par redessiner le bureau. Quand
   c'est la page élève qui les a appelées, c'est elle qu'il faut
   remettre à jour. Un rafraîchissement, pas une deuxième écriture :
   la règle du module tient.
   ============================================================ */
function rafraichirPageEleve(){
  if(!elevePageOuverte) return;
  const carte = document.querySelector('[data-vue="dossier"]');
  if(!carte || carte.classList.contains('hors-vue')) return;
  dessinerPageEleve();
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-page-eleve.js'] = true;
