/* Déployé le 29/08/2026 à 08:15 — v687 */
/* ============================================================
   ec-questionnaire.js
   Questionnaire de début et de fin de cours
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   RACCOURCIS DE NOTE INTERNE
   `demandes` : questions posées au moniteur, dans l'ordre.
   Chaque réponse remplace le ❓ correspondant dans le modèle.
   ============================================================ */
const RACCOURCIS_NOTE = [
  { libelle: '📋 Compléter les infos', special: 'questionnaire' }
];


/* Combien de cours le serveur renvoie au plus. Le premier appel le
   demande explicitement ; le second, celui qui relit le texte, s'en
   remet à la limite du serveur pour une recherche par élève. */
const MAXI_DOSSIER = 40;
const MAXI_SERVEUR_ELEVE = 30;

/* Une seule requête pour tout ce dont le questionnaire a besoin */
async function chargerDossierEleve(nomEleve){
  const vide = { frise: '', lecons: null, manoeuvres: [], marques: {}, derniereNote: '',
                 dernierHorodatage: '', boite: '' };
  if(!nomEleve || nomEleve.trim().length < 2) return vide;

  const enCache = lireCacheDossier(nomEleve);
  if(enCache) return enCache;

  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      /* Texte complet : la fiche véhicule s'y trouve, et c'est elle
         qui pré-coche le questionnaire. En mode allégé, les marques
         étaient toujours vides et rien n'était coché. */
      /* Quarante cours couvrent largement une formation complète :
         la fiche véhicule et la frise s'y trouvent en entier. La
         limite ne joue que sur les dossiers très anciens, où relire
         tout le texte coûtait plusieurs secondes. */
      /* Le nom exact, pas un morceau : c'est le dossier de CET élève
         qui compte ses leçons. Un nom contenu dans un autre — « Marie
         Martin » dans « Marie Martinez » — ferait compter les deux. */
      body: JSON.stringify({ action: 'search', code: ACCES.code,
                             eleve: nomEleve.trim(), maxi: MAXI_DOSSIER,
                             exact: true })
    });
    if(!r.ok) return vide;
    const data = await r.json().catch(() => ({}));
    let res = (data && data.resultats) || [];
    /* Le serveur ne renvoie que les derniers cours, mais il dit
       combien il y en a en tout : le numéro de leçon reste juste. */
    const totalConnu = (data && data.total) || 0;
    let plafond = MAXI_DOSSIER;

    /* Anciennes lignes sans colonne Manœuvres : on relit avec le texte.
       Le mode léger était redemandé, ce qui coûtait un appel pour rien. */
    const besoinTexte = res.length && res.every(x => !x.manoeuvres);
    if(besoinTexte){
      const r2 = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', code: ACCES.code,
                               eleve: nomEleve.trim(), exact: true })
      });
      if(r2.ok){
        const d2 = await r2.json().catch(() => ({}));
        if(d2 && d2.resultats){
          res = d2.resultats;
          plafond = MAXI_SERVEUR_ELEVE;   /* cet appel-là ne fixe pas de limite */
        }
      }
    }

    let frise = '';
    /* Les cours relus donnent le détail ; le total, lui, vient du
       serveur quand l'historique a été tronqué. */
    let lecons = 0;
    let vus = 0;
    const manoeuvres = [];
    /* Le premier résultat est le plus récent */
    const dernier = res[0] || {};

    res.forEach(item => {
      if(!frise) frise = extraireFrise(item.note) || extraireFriseTexte(item.bilan);
      const type = String(item.type || '');
      if(/^Conduite/i.test(type) || /^AAC/i.test(type)) lecons++;
      vus++;
      const liste = item.manoeuvres
        ? String(item.manoeuvres).split('|').map(x => x.trim()).filter(Boolean)
        : manoeuvresDejaFaites(item.bilan);
      liste.forEach(m => {
        if(manoeuvres.indexOf(m) === -1) manoeuvres.push(m);
      });
    });

    /* La boîte de l'élève : colonne du questionnaire, sinon type du bilan */
    let boite = '';
    res.forEach(it => {
      if(!boite && it.boite) boite = String(it.boite).toLowerCase();
      if(!boite && /automatique/i.test(it.type || '')) boite = 'bea';
      if(!boite && /manuelle/i.test(it.type || '')) boite = 'bv';
    });

    /* Les marques de la fiche véhicule, cumulées du plus ancien
       au plus récent : elles servent à pré-cocher le questionnaire. */
    const marques = {};
    res.slice().reverse().forEach(item => {
      const m = marquesDejaPosees(item.bilan);
      Object.keys(m).forEach(k => { marques[k] = m[k]; });
    });

    /* Les cours plus anciens que ceux relus comptent aussi : ce sont
       presque toujours des leçons de conduite.

       Mais on ne s'en sert QUE si la liste a été tronquée : avoir reçu
       moins que la limite demandée veut dire qu'on les a tous, et que
       le compte est déjà complet. Sans ce garde-fou, un total erroné
       passait tel quel — c'est ainsi qu'on a vu « 160ème leçon », le
       relais renvoyant la taille du classeur entier. */
    if(vus >= plafond && totalConnu > vus) lecons += (totalConnu - vus);

    const resultat = { frise: frise, lecons: lecons, manoeuvres: manoeuvres,
                       marques: marques,
                       derniereNote: dernier.note || '',
                       dernierHorodatage: dernier.horodatage || dernier.date || '',
                       boite: boite };
    ecrireCacheDossier(nomEleve, resultat);
    return resultat;
  }catch(e){
    console.warn('Dossier élève indisponible :', e);
    return vide;
  }
}

/* Voyant d'attente pendant le chargement */
function ouvrirAttente(message){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  fond.innerHTML =
    '<div class="modal" style="max-width:280px;text-align:center;">' +
      '<div class="spinner" style="margin:6px auto 14px;"></div>' +
      '<div style="font-size:15px;color:var(--soft);">' + (message || 'Chargement…') + '</div>' +
    '</div>';
  document.body.appendChild(fond);
  return () => { if(fond.parentNode) document.body.removeChild(fond); };
}

/* Convertit « mardi 4 août 2026 » en « 2026-08-04 » pour le calendrier */
const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet',
                 'août','septembre','octobre','novembre','décembre'];

function dateFrVersIso(texte){
  const t = normaliserMot(texte || '');
  const p2 = n => String(n).padStart(2, '0');

  /* Format chiffré : 02/09/2026, 2-9-2026, 02.09.2026 */
  const chiffre = t.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/);
  if(chiffre){
    return chiffre[3] + '-' + p2(chiffre[2]) + '-' + p2(chiffre[1]);
  }

  /* Déjà au format ISO */
  const iso = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if(iso) return iso[0];

  const m = t.match(/(\d{1,2})\s+([a-z\u00e0-\u00ff]+)\s+(\d{4})/);
  if(!m) return '';
  const jour = parseInt(m[1], 10);
  const mois = MOIS_FR.findIndex(x => normaliserMot(x) === m[2]);
  if(mois === -1) return '';
  return m[3] + '-' + p2(mois + 1) + '-' + p2(jour);
}

/* Reprend l'état décrit dans la note du dernier cours pour
   pré-remplir le questionnaire. */
/* Le rang du passage, relu dans la note : « 2e passage » */
function passageDepuisNote(note){
  const m = String(note || '').match(/(\d)\s*(?:er|e)\s+passage/i);
  return m ? m[1] : '';
}

function defautsDepuisNote(note){
  const a = analyserNote(note);
  const d = {};
  if(a.examBlanc){
    d.examBlanc = a.examBlanc;
    if(a.examBlancN !== null) d.examBlancN = String(a.examBlancN);
  }
  if(a.simuNuit) d.simuNuit = a.simuNuit;
  const rgP = passageDepuisNote(note);
  if(rgP) d.examPassage = rgP;
  if(a.permis === 'aprevoir'){
    d.examPermis = 'aprevoir';
  }else if(a.permis === 'prevu'){
    d.examPermis = 'prevu';
    const iso = dateFrVersIso(a.permisDate);
    if(iso) d.examDate = iso;
    if(a.permisN !== null) d.examPermisN = String(a.permisN);
  }else if(a.permis === 'annule'){
    d.examPermis = 'annule';
    const m = (note || '').match(/Examen du permis du ([^—·]+?) annulé/i);
    if(m){ const iso = dateFrVersIso(m[1]); if(iso) d.examDate = iso; }
    const n = (note || '').match(/reprogrammé le ([^—·]+)/i);
    if(n){ const iso = dateFrVersIso(n[1]); if(iso) d.nouvelleDate = iso; }
  }
  const n = String(note || '');
  const aj = analyserNote(n);
  if(aj.repassages){
    d.repassages = aj.repassages;
    d.dateAjournement = aj.dateAjournement || '';
  }
  if(/♿ Conduite aménagée/i.test(n)){
    d.handicap = 'oui';
    d.amenagements = AMENAGEMENTS.filter(a => n.indexOf(a.nom) !== -1).map(a => a.cle);
  }
  /* Un élève qui a besoin du coussin en a besoin au cours suivant :
     la case se recoche seule. */
  if(/coussin vert/i.test(n)) d.coussin = 'oui';
  if(/Formation accompagnateur faite/i.test(note || '')) d.formAccomp = 'faite';
  else if(/Formation accompagnateur déjà prévue/i.test(note || '')) d.formAccomp = 'prevue';
  else if(/Formation accompagnateur à prévoir/i.test(note || '')) d.formAccomp = 'aprevoir';
  if(/Rendez-vous préalable fait/i.test(note || '')) d.rvPrealable = 'fait';
  else if(/Rendez-vous préalable déjà prévu/i.test(note || '')) d.rvPrealable = 'prevu';
  else if(/Rendez-vous préalable à prévoir/i.test(note || '')) d.rvPrealable = 'aprevoir';
  return d;
}

/* Champs factuels : toujours recalculés, jamais figés par la préparation */
/* Cette séance compte-t-elle dans la frise ?

   Les leçons de conduite oui ; l'examen blanc, les simulateurs
   et l'examen officiel non — ils ne consomment pas de leçon. */
/* Combien d'examens blancs l'élève a déjà passés.

   Le rang du jour s'en déduit : le troisième vient après deux
   autres. */
function examensBlancsPasses(){
  const nom = ($('studentName') && $('studentName').value.trim()) || '';
  if(!nom) return 0;

  try{
    const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
    const n = parseInt(s.nbExamensBlancs, 10);
    if(!isNaN(n)) return n;
  }catch(e){}

  /* À défaut, ce que disent ses notes */
  try{
    const t = ($('noteInterne') && $('noteInterne').value) || '';
    const m = t.match(/(\d+)\s*(?:e|er|ème|eme)?\s*examens?\s+blancs?/i);
    if(m) return parseInt(m[1], 10);
  }catch(e){}

  return 0;
}


/* La date d'examen lue dans les sessions ouvertes.

   Un élève placé par le bureau a sa date là-bas, pas forcément
   dans ses notes. */
function dateDepuisSession(){
  const nom = ($('studentName') && $('studentName').value.trim()) || '';
  if(!nom) return '';

  try{
    if(typeof sessionsPermis === 'undefined' || !sessionsPermis.length) return '';

    for(const s of sessionsPermis){
      const dedans = (s.eleves || []).some(p =>
        p.eleve && normaliserMot(p.eleve) === normaliserMot(nom));
      if(!dedans) continue;

      /* La session porte sa date, en ISO ou en toutes lettres */
      const d = s.dateIso || s.iso || s.date || '';
      if(!d) continue;
      return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : (dateFrVersIso(d) || '');
    }
  }catch(e){}

  return '';
}


/* Ce que ses notes disent de sa problématique.

   Écrite une fois, elle se retrouve d'une évaluation à l'autre :
   la retaper à chaque fois n'a pas de sens. */
function problematiqueConnue(){
  const t = ($('noteInterne') && $('noteInterne').value) || '';

  const m = t.match(/❓\s*Problématique\s*:?\s*([^\n]+)/i);
  if(m) return m[1].trim();

  /* Le format des anciennes notes */
  const m2 = t.match(/Problématique\s*:\s*([^\n]+)/i);
  return m2 ? m2[1].trim() : '';
}


function seanceDeLaFrise(){
  const m = ($('modele') && $('modele').value) || '';
  if(/^simu/.test(m)) return false;
  if(m === 'examen-blanc') return false;
  if(m === 'examen-officiel') return false;
  if(m === 'rdv-post') return false;
  return true;
}


const CHAMPS_FACTUELS = ['lecon', 'frise', 'manoeuvresFaites', 'totalManoeuvres'];

/* Fusionne : le jugement du moniteur l'emporte, les faits sont rafraîchis */
function fusionnerContexte(saisi, defauts){
  const out = Object.assign({}, defauts || {});
  Object.keys(saisi || {}).forEach(k => {
    if(CHAMPS_FACTUELS.indexOf(k) !== -1 &&
       defauts && defauts[k] !== undefined && defauts[k] !== '') return;
    const v = saisi[k];
    const vide = (v === '' || v === null || v === undefined ||
                  (Array.isArray(v) && !v.length));
    if(!vide) out[k] = v;
  });
  return out;
}

/* Le numéro de leçon dans un texte : « 5ème leçon », « 5e leçon »,
   « 5 leçon ». Écrit une seule fois — la note du cours préparé, le
   bilan et la réparation s'en servent tous les trois. Le suffixe,
   lui, appartient à chaque document : la note écrit « 5ème », le
   bilan « 5e ». */
const RE_NUM_LECON = /\d+\s*(?:ère|ere|ème|eme|e)?(\s*le[çc]on)/i;

/* Le cours du jour compte-t-il comme une leçon de la frise ? Un
   simulateur, un examen blanc ou un rendez-vous post-permis occupent
   un créneau sans faire avancer le compteur. */
function leconCompteDansLaFrise(modeleCle){
  return ['conduite-auto', 'conduite-manuelle',
          'aac-auto', 'aac-manuelle'].indexOf(modeleCle) !== -1;
}


/* Le questionnaire a-t-il été rempli par quelqu'un ?

   Porter un contexte ne suffit pas : un cours créé tout seul — par
   un rappel, par une attribution d'examen blanc — en porte un,
   déduit du dossier, auquel personne n'a répondu. Seule la marque
   posée à la validation fait foi. Écrit ici une fois pour les deux
   modes, vocal et manuel : la même question, la même réponse. */
function questionnaireDejaRepondu(ctx){
  return !!(ctx && ctx.repondu);
}

/* ============================================================
   QUESTIONNAIRE DE DÉPART
   Un seul écran, tout pré-rempli : le moniteur ne corrige que
   ce qui a changé, puis démarre.
   ============================================================ */

/* Frises fixes, connues d'après le type de bilan */
const FRISES_FIXES = {
  'aacbea': 'AAC BEA👼⚠️que 4 leçons voiture pour faire fiche véhicule ⚠️3 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable',
  'aacbv': 'AAC BV👼⚠️que 6 leçons voiture pour faire fiche véhicule ⚠️5 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable',
  'csbea': 'CS BEA⚠️que 4 leçons voiture pour faire fiche véhicule ⚠️3 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable',
  'csbv': 'CS BV👼⚠️que 6 leçons voiture pour faire fiche véhicule ⚠️5 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable'
};

/* Parcours proposé par défaut selon le type de bilan */
const PARCOURS_PAR_TYPE = { 'aac-auto': 'aacbea', 'aac-manuelle': 'aacbv' };

/* Aménagements possibles d'un véhicule adapté */
const AMENAGEMENTS = [
  { cle:'boule_g',  court:'🔘⬅️', nom:'Boule avec commande à gauche' },
  { cle:'boule_d',  court:'🔘➡️', nom:'Boule avec commande à droite' },
  { cle:'boule',    court:'🔘',   nom:'Boule simple' },
  { cle:'accel_g',  court:'🦶⬅️', nom:'Accélérateur à gauche' },
  { cle:'retros',   court:'🪞',   nom:'Rétroviseurs additionnels' }
];

function libelleAmenagement(cle){
  const a = AMENAGEMENTS.find(x => x.cle === cle);
  return a ? a.court + ' ' + a.nom : cle;
}

/* Ce que le questionnaire doit afficher selon le type de bilan.
   Sur simulateur, tout le reste se passe en voiture : seule la frise compte. */
const PROFILS_QUESTIONNAIRE = {
  'simu-manuelle': 'simulateur',
  'simu-auto': 'simulateur',
  'eval-manuelle': 'evaluation',
  'eval-auto': 'evaluation',
  'examen-officiel': 'examen',
  /* La fiche d'évaluation ne demande qu'une chose : combien de
     leçons avant de présenter l'élève à la préfecture. */
  'handicap': 'handicap'
};

function profilQuestionnaire(modeleCle){
  return PROFILS_QUESTIONNAIRE[modeleCle] || 'complet';
}

/* contexteDepart : déclaré dans ec-etat.js */
/* noteQuestionnaire : déclaré dans ec-etat.js */
/* questionnaireOuvert : déclaré dans ec-etat.js */

/* Remplace la note du questionnaire sans écraser ce que le moniteur
   a écrit à la main à côté. */

/* Le bloc « Historique » ne s'affiche plus sur l'écran de cours :
   la note du moniteur précédent est déjà résumée sous le nom de
   l'élève. Le champ reste alimenté, il part avec le bilan. */
function majAffichageNoteInterne(){
  const bloc = $('blocNoteInterne');
  if(bloc) bloc.style.display = 'none';
}


/* ============================================================
   CE QUE LE QUESTIONNAIRE RÉÉCRIT À CHAQUE FOIS

   Une note héritée du cours précédent porte déjà l'examen, le
   simulateur, la frise… Le questionnaire vient de les redemander :
   garder les anciennes lignes faisait s'empiler deux dates
   d'examen et deux simulateurs dans la même note.

   Une famille par sujet, avec le motif qui la reconnaît. C'est la
   même liste qui sert à écrire et à nettoyer : ajouter un sujet
   sans le déclarer ici, et il s'empilerait à son tour — le test
   « test-note-questionnaire.js » le refuse.

   Le texte libre du moniteur et les messages du bureau n'y sont
   pas : eux, on ne les efface jamais. */
/* Les deux formes de la ligne d'examen officiel, en gras Unicode :
   la note voyage dans un tableur et dans un SMS, où aucune mise en
   forme ne survit. Écrites ici une fois, reconnues à l'affichage
   pour la couleur — rouge quand la date existe, bleu sinon.

   Déclarées AVANT la table des familles, qui s'en sert : la purge
   ne reconnaissait pas la forme grasse de « PAS DE DATE » — seule
   celle d'« EXAMEN » figurait dans le motif — et cette ligne-là
   s'empilait à chaque bilan. */
const EXAMEN_PREVU = '𝗘𝗫𝗔𝗠𝗘𝗡 𝗢𝗙𝗙𝗜𝗖𝗜𝗘𝗟 𝗣𝗥𝗘́𝗩𝗨 𝗟𝗘';
const EXAMEN_SANS_DATE = '𝗣𝗔𝗦 𝗗𝗘 𝗗𝗔𝗧𝗘 𝗗\'𝗘𝗫𝗔𝗠𝗘𝗡 𝗢𝗙𝗙𝗜𝗖𝗜𝗘𝗟';

/* Le motif des lignes d'examen, construit à partir des libellés
   eux-mêmes : impossible qu'il en oublie un. */
const RE_FAMILLE_EXAMEN = new RegExp(
  '^(?:🚗\\s*)?(?:' +
  EXAMEN_PREVU.slice(0, 12) + '|' + EXAMEN_SANS_DATE.slice(0, 12) + '|' +
  "EXAMEN|PAS DE DATE|Examen (?:prévu|du permis)|Date d'examen" +
  ')', 'i');

const FAMILLES_NOTE = [
  { cle:'repassage',   motif:/^🔁\s*\d+\S*\s+repassage/i },
  { cle:'handicap',    motif:/^♿\s*Conduite aménagée/i },
  { cle:'coussin',     motif:/^🟩\s*Coussin vert/i },
  { cle:'frise',       motif:/le[çc]ons? de 2h.*exam(?:en)? blanc/i },
  { cle:'friseAacCs',  motif:/^(?:AAC|CS)\b/i },
  { cle:'problematique', motif:/^❓\s*Problématique/i },
  { cle:'prefecture',  motif:/^♿\s*(?:Encore .*préfecture|Prêt à être présenté)/i },
  { cle:'lecon',       motif:/^\d+(?:ère|ere|ème|eme|e)\s+le[çc]on\b/i },
  { cle:'leconVide',   motif:/^❓\s*le[çc]ons/i },
  { cle:'friseEtat',   motif:/frise (?:dépassée|depassee|terminée|terminee)/i },
  { cle:'avantEB',     motif:/encore \d+\s+le[çc]ons?\s+avant/i },
  { cle:'examenBlanc', motif:/examen blanc/i },
  { cle:'examenPermis', motif: RE_FAMILLE_EXAMEN },
  { cle:'trois_h',     motif:/plus que les 3h avant examen/i },
  { cle:'ecoutes',     motif:/^Pas d'écoutes pédagogiques/i },
  { cle:'simuNuit',    motif:/^Simulateur nuit et risques/i },
  { cle:'formAccomp',  motif:/^Formation accompagnateur/i },
  { cle:'rvPrealable', motif:/^Rendez-vous préalable/i }
];

const SEGMENTS_REGENERES = FAMILLES_NOTE.map(f => f.motif);

/* Les segments d'une note. Le séparateur est « · », mais des
   retours à la ligne s'y glissent — collés, deux segments n'en
   font plus qu'un et échappent aux motifs, qui sont ancrés. */
function segmentsDeNote(note){
  return String(note || '')
    .split(/[·\n\r]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

function retirerSegmentsRegeneres(note){
  return segmentsDeNote(note)
    .filter(x => !SEGMENTS_REGENERES.some(r => r.test(x)))
    .join(' · ');
}

function appliquerNoteQuestionnaire(nouvelle){
  const champ = $('noteInterne');
  let actuel = champ.value.trim();

  if(noteQuestionnaire && actuel.indexOf(noteQuestionnaire) !== -1){
    actuel = actuel.replace(noteQuestionnaire, '').replace(/^\s*·\s*|\s*·\s*$/g, '').trim();
  }

  /* Et tout ce qui vient d'une ouverture antérieure : une note
     héritée du cours précédent porte déjà sa frise, qui n'a plus
     lieu d'être puisqu'on vient d'en recalculer une. */
  actuel = retirerSegmentsRegeneres(actuel);

  champ.value = nouvelle
    ? (actuel ? nouvelle + ' · ' + actuel : nouvelle)
    : actuel;
  majAffichageNoteInterne();

  noteQuestionnaire = nouvelle;
  if($('noteResult')) $('noteResult').value = champ.value;
  sauvegarderLocal(true);
}

/* Ferme le questionnaire à l'écran, quel qu'il soit. La promesse
   en attente se résout à « annulé » : le cours abandonné ne doit
   pas rester suspendu en mémoire. */
function fermerQuestionnaireOuvert(){
  document.querySelectorAll('.overlay.show').forEach(f => {
    if(!f.querySelector('#qLecon')) return;      /* pas un questionnaire */
    if(typeof f.__annuler === 'function'){
      try{ f.__annuler(); }catch(e){}
    }
    if(f.parentNode) f.parentNode.removeChild(f);
  });
  questionnaireOuvert = false;
}


async function ouvrirQuestionnaireDepart(prec, titre, libelleValider){
  /* Un questionnaire déjà ouvert appartient au cours précédent : on
     le ferme au lieu d'ignorer la demande. Ignorer laissait le
     moniteur devant l'ancien élève en croyant avoir ouvert le
     nouveau. */
  if(questionnaireOuvert) fermerQuestionnaireOuvert();
  questionnaireOuvert = true;
  /* Filet : le verrou ne doit jamais rester bloqué */
  const secours = setTimeout(() => { questionnaireOuvert = false; }, 30000);
  try{
    return await construireQuestionnaire(prec, titre, libelleValider);
  }catch(e){
    questionnaireOuvert = false;
    console.error('Questionnaire :', e);
    await informer('Le questionnaire n\'a pas pu s\'ouvrir.\n\nDétail : ' + (e && e.message ? e.message : e));
    return null;
  }finally{
    clearTimeout(secours);
  }
}

async function construireQuestionnaire(prec, titre, libelleValider){
  prec = prec || {};
  const eleve = $('studentName').value.trim();
  const modeleCle = $('modele').value;

  const profil = profilQuestionnaire(modeleCle);

  /* Les trois lectures partent ENSEMBLE. En série, le moniteur
     attendait la somme des trois délais ; en parallèle, il n'attend
     que la plus lente. */
  const fermerAttente = ouvrirAttente('Récupération du dossier…');
  let dossier = { frise:'', lecons:null, manoeuvres:[], marques:{},
                  derniereNote:'', dernierHorodatage:'' };
  let consignesBureau = [];
  try{
    const besoinFiches = (typeof chargerFiches === 'function') &&
      (typeof fichesEleves === 'undefined' || !fichesEleves.length);

    const [d, cd] = await Promise.all([
      chargerDossierEleve(eleve),
      consignesDe(eleve).catch(() => []),
      besoinFiches ? chargerFiches().catch(() => []) : Promise.resolve()
    ]);
    dossier = d || dossier;
    consignesBureau = (cd || [])
      .filter(x => x.traite !== 'oui' && x.type !== 'urgence');
  }catch(e){
    console.warn('Dossier partiellement indisponible :', e);
  }finally{
    fermerAttente();
  }

  /* Le moniteur a-t-il déjà répondu pendant ce cours ? Si oui, ses
     réponses priment sur tout : c'est lui qui vient de les saisir. */
  const dejaRepondu = Object.keys(prec).length > 0;

  if(!dejaRepondu){
    /* Premier passage : on repart de l'état du dernier cours… */
    if(dossier.derniereNote) prec = defautsDepuisNote(dossier.derniereNote);

    /* …complété par les messages du bureau, plus récents que le
       dernier bilan. Une date qu'il vient de fixer doit apparaître
       dans le champ, pas seulement dans l'encadré vert. */
    if(consignesBureau.length){
      const duBureau = defautsDepuisNote(consignesBureau.map(x => x.texte).join(' · '));
      Object.keys(duBureau).forEach(k => {
        if(duBureau[k] !== undefined && duBureau[k] !== '') prec[k] = duBureau[k];
      });
    }
  }

  /* La frise saisie sur la fiche de l'élève fait autorité : elle a été
     posée une fois pour toutes, inutile de la redemander à chaque cours. */
  if(!prec.frise){
    const qui = ($('studentName') && $('studentName').value.trim()) ||
                ($('prepEleve') && $('prepEleve').value.trim()) || '';
    const fiche = (qui && typeof ficheDe === 'function') ? ficheDe(qui) : null;
    if(fiche && fiche.frise) prec.frise = fiche.frise;
  }

  /* Frise entièrement déduite du type de bilan (cas AAC) */
  const friseDeduite = FRISES_FIXES[PARCOURS_PAR_TYPE[modeleCle] || ''] || '';
  /* Clé de conduite supervisée correspondant à la boîte du bilan */
  const cleCS = /auto/i.test(modeleCle) ? 'csbea' : 'csbv';
  /* Trois sources, de la plus sûre à la plus générale : le type de
     bilan, le dernier cours, la fiche de l'élève. Sans ce dernier
     recours, un dossier momentanément indisponible faisait perdre
     une frise pourtant enregistrée. */
  const ficheEleve = (typeof ficheDe === 'function') ? ficheDe(eleve) : null;

  /* L'ANTS vient de la fiche s'il n'a pas déjà été saisi dans ce cours :
     il est renseigné à l'inscription, pas à chaque leçon. */
  if(!prec.ants && ficheEleve && ficheEleve.ants) prec.ants = ficheEleve.ants;
  const frisePrecedente = friseDeduite || dossier.frise ||
                          (ficheEleve && ficheEleve.frise) || '';
  const compteDansLaFrise = leconCompteDansLaFrise(modeleCle);
  const faites = dossier.lecons;
  const rangDuJour = (faites === null) ? null
                                       : (compteDansLaFrise ? faites + 1 : faites);
  const manoeuvresAvant = dossier.manoeuvres || [];
  const totalManoeuvres = BLOC.ficheListeConduite.length;

  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';

    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(560px, 94vw);max-height:88vh;overflow-y:auto;';

    const restantes = totalManoeuvres - manoeuvresAvant.length;
    boite.innerHTML =
      '<h3>' + (titre || 'Avant de démarrer') + '</h3>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.5;">' +
        (eleve ? '<strong style="color:var(--cream);font-size:15px;">' + eleve + '</strong><br>' : '') +
        (profil === 'complet'
          ? '🦉 Manœuvres de la fiche véhicule : ' + manoeuvresAvant.length + ' sur ' + totalManoeuvres +
            ' validées' + (restantes ? ' — il en reste ' + restantes : ' — fiche terminée ✅') +
            (restantes
              ? '<details style="margin-top:8px;">' +
                  '<summary style="cursor:pointer;color:var(--accent-text);font-weight:600;">' +
                  'Voir les ' + restantes + ' manœuvres restantes</summary>' +
                  '<div id="qListeRestantes" style="margin-top:8px;padding:10px 12px;' +
                  'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
                  'font-size:14px;line-height:1.9;color:var(--cream);"></div>' +
                '</details>'
              : '')
          : (profil === 'simulateur' ? 'Séance sur simulateur — seule la frise est demandée ici.'
            : profil === 'evaluation' ? 'Évaluation de départ — la frise se définit en fin de séance.'
            : 'Examen officiel — note interne uniquement.')) +
        (consignesBureau.length
          ? '<div style="margin-top:10px;padding:10px 12px;background:rgba(182,255,14,.10);' +
            'border:1px solid var(--orange);border-radius:10px;color:var(--accent-text);' +
            'font-size:14px;font-weight:600;line-height:1.5;">📨 Message du bureau<br>' +
            consignesBureau.map(x => x.texte.replace(/&/g,'&amp;').replace(/</g,'&lt;')).join('<br>') +
            '</div>'
          : '') +
      '</div>' +

      '<label for="qBoite">Boîte</label>' +
      '<select id="qBoite">' +
        '<option value="bea">BEA — boîte automatique</option>' +
        '<option value="bv">BV — boîte manuelle</option>' +
      '</select>' +

      '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;' +
        'color:var(--cream);margin-bottom:10px;">' +
        '<input type="checkbox" id="qHandicap" style="width:19px;height:19px;">' +
        '♿ Conduite aménagée</label>' +
      /* Le coussin : une contrainte de poste de conduite comme une
         autre, à connaître avant de monter dans la voiture. */
      '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;' +
        'color:var(--cream);margin-bottom:10px;">' +
        '<input type="checkbox" id="qCoussin" style="width:19px;height:19px;">' +
        '🟩 Coussin vert</label>' +

      '<div id="qZoneHandicap" style="display:none;padding:10px 12px;margin-bottom:14px;' +
        'background:var(--navy);border:1px solid var(--orange);border-radius:10px;">' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Aménagements du véhicule</div>' +
        AMENAGEMENTS.map(a =>
          '<label style="display:flex;align-items:center;gap:9px;text-transform:none;' +
          'font-size:15px;color:var(--cream);margin:0 0 7px;">' +
          '<input type="checkbox" class="qAmg" value="' + a.cle + '" style="width:18px;height:18px;">' +
          a.court + ' ' + a.nom + '</label>').join('') +
      '</div>' +

      /* Les coordonnées manquantes : demandées une seule fois, à
         celui qui a l'élève en face de lui. */
      '<div id="qBlocModele" style="display:none;">' +
        '<label for="qModele">📋 Type de bilan</label>' +
        '<select id="qModele"></select>' +
        '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;">' +
          'Ce que sera le cours. Modifiable tant que le cours n\'a pas eu lieu.</div>' +
      '</div>' +

      '<div id="qBlocCoord" style="display:none;">' +
        '<div style="font-size:12px;color:var(--warn-text);margin-bottom:8px;' +
          'line-height:1.4;font-weight:700;">' +
          '📇 Coordonnées manquantes — demande-les à l\'élève</div>' +

        '<div id="qBlocMessenger" style="display:none;">' +
          '<label for="qMessenger">💬 Messenger de l\'élève</label>' +
          '<input type="text" id="qMessenger" autocomplete="off" ' +
            'placeholder="Lien de sa conversation, ou pseudo">' +
        '</div>' +

        '<div id="qBlocMail" style="display:none;">' +
          '<label for="qMail">✉️ Adresse mail de l\'élève</label>' +
          '<input type="email" id="qMail" inputmode="email" autocomplete="off" ' +
            'placeholder="prenom.nom@exemple.fr">' +
        '</div>' +

        '<div id="qBlocAnts" style="display:none;">' +
          '<label for="qAnts">📇 Dossier ANTS</label>' +
          '<select id="qAnts">' +
            '<option value="">— non renseigné —</option>' +
            '<option value="eleve">Fait par l\'élève</option>' +
            '<option value="nous">Fait par nous</option>' +
          '</select>' +
        '</div>' +

        '<div style="font-size:12px;color:var(--muted);margin:-4px 0 14px;line-height:1.4;">' +
        'Saisies ici, elles rejoignent sa fiche : tous les moniteurs les ' +
        'retrouveront, et son bilan pourra lui être envoyé.</div>' +
      '</div>' +

      '<div style="font-size:12px;color:var(--muted);margin:-8px 0 14px;line-height:1.4;">' +
      'Information interne, jamais reprise dans les notes ni dans le bilan.</div>' +

      /* Tout ce que la fiche d'évaluation ne demande pas tient
         dans ce bloc : un seul masquage suffit. */
      '<div id="qBlocSauf">' +
      '<label>Frise de formation</label>' +
      (friseDeduite
        ? ''
        : '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
          'font-size:15px;color:var(--cream);margin-bottom:10px;">' +
            '<input type="checkbox" id="qCS" style="width:20px;height:20px;">' +
            'Conduite supervisée' +
          '</label>') +

      '<div id="qFriseClassique" style="background:var(--navy);border:1px solid var(--line);' +
      'border-radius:10px;padding:12px;margin-bottom:6px;font-size:15px;line-height:2;">' +
        '<input type="text" id="qFriseAvant" inputmode="numeric" maxlength="2" ' +
        'style="width:52px;display:inline-block;margin:0 4px 0 0;padding:7px;text-align:center;font-size:16px;">' +
        ' leçons de 2h + exam blanc +' +
        '<input type="text" id="qFriseApres" inputmode="numeric" maxlength="2" ' +
        'style="width:52px;display:inline-block;margin:0 4px;padding:7px;text-align:center;font-size:16px;">' +
        ' leçons de 2h <span id="qFriseHeures" style="color:var(--accent-text);font-weight:700;"></span>' +
        ' + 3h avant examen' +
      '</div>' +
      '<div id="qFriseFixe" style="display:none;background:var(--navy);border:1px solid var(--line);' +
      'border-radius:10px;padding:11px 12px;font-size:14px;line-height:1.5;margin-bottom:6px;"></div>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.4;">' +
      'Laisse vide si la frise n\'est pas encore déterminée.</div>' +

      '<div id="qBlocLecon">' +
        '<label for="qLecon">Leçon n°</label>' +
        '<input type="text" id="qLecon" inputmode="numeric" placeholder="—">' +
      '</div>' +

      '<label>Examen blanc</label>' +
      '<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
        'margin-bottom:10px;">' +
        ['', 'aprevoir', 'reserve', 'passe', 'impossible'].map(function(v, i){
          const nom = ['— non évoqué —', 'À prévoir', 'Réservé', 'Déjà passé',
                       'Non planifiable pour le moment'][i];
          return '<label style="display:flex;align-items:center;gap:9px;padding:4px 0;' +
            'text-transform:none;font-size:15px;color:var(--cream);margin:0;font-weight:400;">' +
            '<input type="radio" name="qExamBlancChoix" value="' + v + '"' +
            (v === '' ? ' checked' : '') +
            ' style="width:18px;height:18px;flex-shrink:0;">' + nom + '</label>';
        }).join('') +
      '</div>' +

      '<div id="qBlocEbRang" style="display:none;">' +
        '<label for="qExamBlancRang">Quel examen blanc ?</label>' +
        '<select id="qExamBlancRang">' +
          '<option value="">— non précisé —</option>' +
          '<option value="1">1er</option>' +
          '<option value="2">2e</option>' +
          '<option value="3">3e</option>' +
          '<option value="4">4e</option>' +
          '<option value="5">5e</option>' +
        '</select>' +
      '</div>' +

      '<div id="qBlocEbDate" style="display:none;">' +
        '<label for="qExamBlancDate">Date de l\'examen blanc</label>' +
        '<input type="date" id="qExamBlancDate">' +
      '</div>' +

      '<input type="text" id="qExamBlancN" inputmode="numeric" placeholder="Dans combien de leçons ?" style="display:none;">' +

      /* La conclusion se donne à la FIN de l'examen blanc, pas au
         départ : elle n'a rien à faire dans le questionnaire
         d'ouverture. */
      (modeleCle === 'examen-blanc' && !/^Avant/i.test(String(titre || ''))
        ? '<label for="qEBPasse">Conclusion de l\'examen blanc</label>' +
          '<select id="qEBPasse">' +
            '<option value="">— à renseigner —</option>' +
            '<option value="3h">✅ Plus que les 3h avant examen</option>' +
            '<option value="lecons">⏳ Encore des leçons avant examen</option>' +
            '<option value="pasleniveau">⛔ Pas le niveau</option>' +
          '</select>' +
          '<input type="text" id="qEBLecons" inputmode="numeric" ' +
          'placeholder="Combien de leçons avant l\'examen ?" style="display:none;">'
        : '') +

      '<label for="qExamPermis">Examen du permis</label>' +
      '<select id="qExamPermis">' +
        '<option value="">— pas de date —</option>' +
        '<option value="aprevoir">Date à prévoir</option>' +
        '<option value="prevu">Prévu le…</option>' +
        '<option value="annule">Annulé</option>' +
        '<option value="nonplanifiable">Non planifiable</option>' +
      '</select>' +
      '<input type="text" id="qExamMotif" style="display:none;" ' +
      'placeholder="Pourquoi ? (facultatif — ANTS, dossier, médical…)">' +
      '<div id="qLibExamDate" style="display:none;font-size:12px;color:var(--muted);margin:-8px 0 4px;"></div>' +
      '<input type="date" id="qExamDate" style="display:none;">' +
      '<div id="qBlocPassage" style="display:none;">' +
        '<label for="qExamPassage">Quel passage ?</label>' +
        '<select id="qExamPassage">' +
          '<option value="">— non précisé —</option>' +
          '<option value="1">1er passage</option>' +
          '<option value="2">2e passage</option>' +
          '<option value="3">3e passage</option>' +
          '<option value="4">4e passage</option>' +
          '<option value="5">5e passage ou plus</option>' +
        '</select>' +
      '</div>' +
      '<input type="text" id="qExamPermisN" inputmode="numeric" ' +
      'placeholder="Leçons restantes avant l\'examen" style="display:none;">' +
      '<div id="qLibNouvelleDate" style="display:none;font-size:12px;color:var(--muted);margin:-8px 0 4px;">' +
      'Nouvelle date (laisse vide si en attente)</div>' +
      '<input type="date" id="qNouvelleDate" style="display:none;">' +

      '<label id="qBlocEcoutes" style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:14px;">' +
        '<input type="checkbox" id="qPasEcoute" style="width:20px;height:20px;">' +
        "Pas d'écoutes pédagogiques" +
      '</label>' +

      '<label for="qSimuNuit">Simulateur nuit et risques</label>' +
      '<select id="qSimuNuit">' +
        '<option value="">— non évoqué —</option>' +
        '<option value="aprevoir">À prévoir</option>' +
        '<option value="prevu">Déjà prévu</option>' +
        '<option value="fait">Fait ✅</option>' +
      '</select>' +

      
      '<div id="qBlocAacCs" style="display:none;">' +
        '<label for="qFormAccomp">Formation accompagnateur</label>' +
        '<select id="qFormAccomp">' +
          '<option value="">— non évoquée —</option>' +
          '<option value="aprevoir">À prévoir</option>' +
          '<option value="prevue">Déjà prévue</option>' +
          '<option value="faite">Déjà faite</option>' +
        '</select>' +
        '<label for="qRvPrealable">Rendez-vous préalable</label>' +
        '<select id="qRvPrealable">' +
          '<option value="">— non évoqué —</option>' +
          '<option value="aprevoir">À prévoir</option>' +
          '<option value="prevu">Déjà prévu</option>' +
          '<option value="fait">Déjà fait</option>' +
        '</select>' +
      '</div>' +

      '</div>' +

      /* La fiche véhicule : présente au DÉPART, pour préparer et
         cocher ce qui est acquis. Masquée en fin de cours, où le
         moniteur a déjà coché sur l'écran d'enregistrement.

         HORS du bloc masquable : une évaluation de départ n'a pas
         de frise ni d'examen à renseigner, mais elle a tout à
         apprendre des manœuvres déjà faites ailleurs. Laissée
         dedans, elle disparaissait avec le reste. */
      '<div id="qBlocFiche" style="display:none;">' +
        '<label>🦉 Fiche véhicule — coche ce qui est acquis</label>' +
        '<div style="font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.4;">' +
          'Les manœuvres déjà validées sont cochées. Celles que tu ajoutes seront ' +
          'signées de ton émoji.<br>' +
          'La colonne 🚗 est pour un élève repris d\'une autre auto-école : ' +
          'ce qu\'il y a déjà fait porte 🚗, pas ton émoji.</div>' +
        '<div id="qFiche" style="background:var(--navy);border:1px solid var(--line);' +
          'border-radius:10px;padding:10px 12px;max-height:240px;overflow-y:auto;' +
          'margin-bottom:14px;"></div>' +
      '</div>' +

      /* Hors du bloc masqué : les deux questions que la fiche
         d'évaluation conserve. */
      '<div id="qBlocPrefecture" style="display:none;">' +
        '<label for="qProblematique">Problématique</label>' +
        '<textarea id="qProblematique" rows="3" maxlength="400" ' +
          'placeholder="Ce qui amène cette évaluation"></textarea>' +
        '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;' +
          'line-height:1.5;">Reprise de ses notes : à compléter ou ' +
          'corriger.</div>' +

        '<label for="qPrefecture">Leçons avant présentation à la préfecture</label>' +
        '<input type="number" id="qPrefecture" min="0" inputmode="numeric" ' +
          'placeholder="—">' +
        '<div style="font-size:11px;color:var(--muted);margin:-8px 0 10px;' +
          'line-height:1.5;">Combien de leçons lui faut-il encore ?</div>' +
      '</div>' +

      '<label for="qLibre">Vos autres notes</label>' +
      '<textarea id="qLibre" rows="3" maxlength="400" ' +
      'placeholder="Ex : autre notes importante" ' +
      'style="width:100%;background:var(--navy);border:1px solid var(--line);color:var(--cream);' +
      'padding:11px 12px;border-radius:10px;font-size:15px;line-height:1.5;font-family:inherit;' +
      'resize:vertical;margin-bottom:6px;"></textarea>';

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';
    const passer = document.createElement('button');
    passer.className = 'btn btn-secondary';
    /* « Annuler » plutôt que « Passer » : le bouton ferme sans rien
       enregistrer, il ne saute pas une étape. */
    passer.textContent = 'Annuler';
    const valider = document.createElement('button');
    valider.className = 'btn btn-primary';
    valider.textContent = libelleValider || 'Démarrer';
    rangee.appendChild(passer);
    rangee.appendChild(valider);
    boite.appendChild(rangee);
    fond.appendChild(boite);
    document.body.appendChild(fond);

    /* Pré-remplissage */
    const chAvant = boite.querySelector('#qFriseAvant');
    const chApres = boite.querySelector('#qFriseApres');
    const chHeures = boite.querySelector('#qFriseHeures');

    const caseCS = boite.querySelector('#qCS');
    /* La fiche d'évaluation n'a pas de frise : la chercher la
       ferait réapparaître après son masquage. */
    const surFiche = (profil === 'handicap');
    const zoneClassique = surFiche ? null : boite.querySelector('#qFriseClassique');
    const zoneFixe = surFiche ? null : boite.querySelector('#qFriseFixe');

    const blocAacCs = boite.querySelector('#qBlocAacCs');

    /* Adaptation au profil : on retire ce qui ne concerne pas ce type de cours */
    if(profil !== 'complet'){
      const aMasquer = (profil === 'handicap')
        /* La fiche d'évaluation : tout part, sauf les leçons
           avant la préfecture. */
        ? ['#qLecon', '#qExamBlanc', '#qExamBlancN', '#qExamPermis',
           '#qExamDate', '#qExamPermisN', '#qNouvelleDate', '#qLibExamDate',
           '#qLibNouvelleDate', '#qFinirFiche', '#qSimuNuit', '#qBlocAacCs',
           '#qFriseClassique', '#qFriseFixe', '#qCS', '#qBlocEcoutes',
           '#qBlocEbDate', '#qBlocEbRang', '#qExamBlancDate', '#qEBPasse',
           '#qEBLecons', '#qFormAccomp', '#qRvPrealable', '#qExamPassage']
        : (profil === 'examen')
        ? ['#qLecon', '#qExamBlanc', '#qExamBlancN', '#qFinirFiche',
           '#qSimuNuit', '#qBlocAacCs', '#qFriseClassique', '#qFriseFixe', '#qCS']
        : ['#qLecon', '#qExamBlanc', '#qExamBlancN', '#qExamPermis', '#qExamDate',
           '#qExamPermisN', '#qNouvelleDate', '#qLibExamDate', '#qLibNouvelleDate',
           '#qFinirFiche', '#qSimuNuit', '#qBlocAacCs'];

      aMasquer.forEach(sel => {
        const el = boite.querySelector(sel);
        if(!el) return;
        /* On masque aussi l'étiquette qui précède le champ */
        const lab = boite.querySelector('label[for="' + sel.slice(1) + '"]');
        if(lab) lab.style.display = 'none';
        const parent = el.closest('label');
        if(parent) parent.style.display = 'none';
        else el.style.display = 'none';
      });
    }

    function majParcours(){
      /* La fiche d évaluation n a pas de frise : sans ce garde-fou,
         l appel plantait et laissait le reste affiché. */
      if(!zoneClassique || !zoneFixe) return;

      const fixe = friseDeduite || ((caseCS && caseCS.checked) ? FRISES_FIXES[cleCS] : '');
      if(fixe){
        zoneClassique.style.display = 'none';
        zoneFixe.style.display = 'block';
        zoneFixe.textContent = fixe;
      }else{
        zoneClassique.style.display = 'block';
        zoneFixe.style.display = 'none';
      }
      /* Formation accompagnateur et RDV préalable ne concernent que AAC et CS */
      if(blocAacCs && profil === 'complet'){
        blocAacCs.style.display = fixe ? 'block' : 'none';
      }
      if(profil === 'examen'){
        zoneClassique.style.display = 'none';
        zoneFixe.style.display = 'none';
      }
    }
    /* Reprise de la conduite supervisée notée les cours précédents */
    if(caseCS && /^CS /.test(prec.frise || frisePrecedente || '')) caseCS.checked = true;
    if(caseCS) caseCS.addEventListener('change', majParcours);
    majParcours();

    if(chAvant){
      const base = prec.frise || frisePrecedente;
      const av = leconsAvantExamenBlanc(base);
      const ap = leconsApresExamenBlanc(base);
      chAvant.value = av !== null ? av : '';
      /* Presque toujours 2 leçons après l'examen blanc */
      chApres.value = ap !== null ? ap : '2';

      const majHeures = () => {
        const b = chApres.value.trim();
        chHeures.textContent = b ? '(' + (parseInt(b, 10) * 2) + 'h)' : '';
      };
      chApres.addEventListener('input', majHeures);
      majHeures();
    }

    /* Examen blanc, simulateur, examen officiel : ces séances ne
       comptent pas dans la frise. Leur donner un numéro de leçon
       décalait tout le reste. */
    const zLecon = boite.querySelector('#qBlocLecon');
    if(zLecon && !seanceDeLaFrise()){
      zLecon.style.display = 'none';
      boite.querySelector('#qLecon').value = '';
    }else{
      boite.querySelector('#qLecon').value =
        prec.lecon || ((rangDuJour !== null) ? rangDuJour : '');
    }

    boite.querySelector('#qPasEcoute').checked = !!prec.pasEcoute;
    boite.querySelector('#qSimuNuit').value = prec.simuNuit || '';
    boite.querySelector('#qFormAccomp').value = prec.formAccomp || '';
    boite.querySelector('#qRvPrealable').value = prec.rvPrealable || '';
    boite.querySelector('#qLibre').value = prec.libre || '';

    /* Le point demandé par le bureau, en tête du questionnaire :
       c'est ce que le moniteur doit faire pendant ce cours. */
    if(typeof mentionFairePoint === 'function'){
      const pt = mentionFairePoint(($('studentName') &&
                                    $('studentName').value.trim()) || '');
      if(pt){
        const l = document.createElement('div');
        l.style.cssText = 'border:1px solid var(--orange);border-radius:10px;' +
          'padding:10px 12px;margin-bottom:14px;font-size:13px;' +
          'color:var(--warn-text);line-height:1.5;';
        l.textContent = pt + ' — le bureau attend ton retour.';
        boite.insertBefore(l, boite.children[1] || null);
      }
    }

    /* En fin de cours, le moniteur a déjà coché pendant qu'il
       conduisait : lui remontrer la liste n'apporte rien. */
    const enFinDeCours = /après ce cours|terminer|fin/i.test(String(titre || ''));

    /* La fiche d'évaluation ne garde que sa question et les notes
       libres. Ce masquage vient en dernier : posé plus haut, il
       se faisait défaire par les réglages qui suivent. */
    {
      const surEval = (profil === 'handicap');

      /* L'évaluation, AU DÉPART : on ne demande ni frise, ni leçon,
         ni examen, ni écoutes, ni simulateur — tout cela se décide
         en fin de séance, une fois l'élève vu au volant. Restent
         les coordonnées, les manœuvres et les notes libres.

         En FIN de séance, le questionnaire reprend tout : c'est
         justement là que la frise se fixe. */
      const evalAuDepart = (profil === 'evaluation') && !enFinDeCours;

      const sauf = boite.querySelector('#qBlocSauf');
      if(sauf) sauf.style.display = (surEval || evalAuDepart) ? 'none' : '';

      if(surEval){
        const bf = boite.querySelector('#qBlocFiche');
        if(bf) bf.style.display = 'none';
      }

      const zp = boite.querySelector('#qBlocPrefecture');
      if(zp) zp.style.display = surEval ? 'block' : 'none';
    }

    /* La fiche véhicule, pré-cochée d'après les bilans précédents */
    const marquesConnues = dossier.marques || {};
    const blocFiche = boite.querySelector('#qBlocFiche');
    if(blocFiche){
      /* La fiche d'évaluation ne concerne pas le véhicule */
      const surFiche = (profil === 'handicap');
      blocFiche.style.display = (enFinDeCours || surFiche) ? 'none' : 'block';
    }

    remplirFicheQuestionnaire(marquesConnues, prec.manoeuvresAjoutees || [],
                              prec.manoeuvresAilleurs || []);
    boite._marquesConnues = marquesConnues;

    /* Après le cours : on n'affiche que ce qui peut avoir changé */
    if(/après ce cours/i.test(titre || '')) allegerQuestionnaireFin(boite, prec);

    /* Boîte déduite du type de bilan, ANTS repris s'il est connu.
       Chaque champ est vérifié : certains profils de questionnaire
       n'en affichent qu'une partie, et un accès à un champ absent
       interrompait toute la suite de la construction. */
    const chBoite = boite.querySelector('#qBoite');
    if(chBoite) chBoite.value = prec.boite || (/auto/i.test(modeleCle) ? 'bea' : 'bv');
    const chAnts = boite.querySelector('#qAnts');
    if(chAnts) chAnts.value = prec.ants || '';

    /* Chaque coordonnée n'est demandée QUE si elle manque : les
       redemander alors qu'elles sont connues ne sert qu'à les
       effacer par inadvertance. */
    /* Le type de bilan : affiché seulement quand on prépare un cours */
    const selMod = boite.querySelector('#qModele');
    const blocMod = boite.querySelector('#qBlocModele');
    const enPreparation = /préparation/i.test(String(titre || ''));
    if(blocMod) blocMod.style.display = enPreparation ? 'block' : 'none';
    if(selMod && enPreparation){
      selMod.innerHTML = Object.keys(MODELES)
        .map(k => '<option value="' + k + '">' +
                  (MODELES[k].label || k) + '</option>').join('');
      selMod.value = modeleCle;
    }

    const champMess = boite.querySelector('#qMessenger');
    const champMail = boite.querySelector('#qMail');

    const manque = {
      messenger: !((ficheEleve && ficheEleve.messenger) || ''),
      mail:      !((ficheEleve && ficheEleve.email) || ''),
      ants:      !((ficheEleve && ficheEleve.ants) || '') && !prec.ants
    };

    const montrer = (id, oui) => {
      const b = boite.querySelector(id);
      if(b) b.style.display = oui ? 'block' : 'none';
    };
    montrer('#qBlocMessenger', manque.messenger);
    montrer('#qBlocMail', manque.mail);
    montrer('#qBlocAnts', manque.ants);
    /* L'encadré entier disparaît si tout est déjà renseigné */
    /* Le mail du prescripteur se saisit au répertoire uniquement :
       c'est une donnée de dossier, pas quelque chose qu'on demande
       à l'élève au bord de la route. */
    montrer('#qBlocCoord', manque.messenger || manque.mail || manque.ants);

    if(champMess) champMess.value = prec.messenger || '';
    if(champMail) champMail.value = prec.email || '';

    /* Conduite aménagée */
    const cbH = boite.querySelector('#qHandicap');
    const znH = boite.querySelector('#qZoneHandicap');
    const dejaAmg = prec.amenagements || [];
    cbH.checked = (prec.handicap === 'oui') || dejaAmg.length > 0;
    boite.querySelectorAll('.qAmg').forEach(x => {
      x.checked = dejaAmg.indexOf(x.value) !== -1;
    });
    const majH = () => { znH.style.display = cbH.checked ? 'block' : 'none'; };
    cbH.addEventListener('change', majH);
    majH();

    /* Le coussin, repris du cours précédent */
    const cbC = boite.querySelector('#qCoussin');
    if(cbC) cbC.checked = (prec.coussin === 'oui');

    /* Manœuvres qui restent à faire — affichage seul */
    const zoneRestantes = boite.querySelector('#qListeRestantes');
    if(zoneRestantes){
      const dejaFaites = manoeuvresAvant.map(normaliserMot);
      const restantesListe = BLOC.ficheListeConduite
        .filter(m => dejaFaites.indexOf(normaliserMot(m)) === -1);
      zoneRestantes.textContent = restantesListe.join(' · ');
    }

    /* Champs conditionnels — l'examen blanc se choisit par cases */
    const casesEB = boite.querySelectorAll('input[name="qExamBlancChoix"]');
    const nEB = boite.querySelector('#qExamBlancN');
    const rangEB = boite.querySelector('#qExamBlancRang');
    const blocRang = boite.querySelector('#qBlocEbRang');
    const dateEB = boite.querySelector('#qExamBlancDate');
    const blocDate = boite.querySelector('#qBlocEbDate');
    nEB.value = prec.examBlancN || '';
    if(rangEB) rangEB.value = prec.examBlancRang || '';
    if(dateEB) dateEB.value = prec.examBlancDate || '';

    const valeurEB = () => {
      const coche = boite.querySelector('input[name="qExamBlancChoix"]:checked');
      return coche ? coche.value : '';
    };

    casesEB.forEach(x => {
      if(x.value === (prec.examBlanc || '')) x.checked = true;
      x.addEventListener('change', majEB);
    });

    /* La fiche d'évaluation montre sa question, et elle seule.

       Les blocs englobants se masquent ici : le mécanisme par
       profil ne touche que les champs et leurs étiquettes. */
    const zPref = boite.querySelector('#qBlocPrefecture');
    if(zPref){
      const surFicheEval = (profil === 'handicap');
      zPref.style.display = surFicheEval ? 'block' : 'none';

      if(surFicheEval){
        boite.querySelector('#qPrefecture').value = prec.prefecture || '';

        /* La problématique reprend ce que ses notes en disent :
           le moniteur complète plutôt que de tout retaper. */
        const zp2 = boite.querySelector('#qProblematique');
        if(zp2){
          zp2.value = prec.problematique || problematiqueConnue();
        }


      }
    }

    /* Un examen blanc se passe aujourd'hui, par définition : le
       demander n'apprend rien. Et « dans combien de leçons » ne
       veut rien dire pour la séance en cours. */
    if(($('modele') && $('modele').value) === 'examen-blanc'){
      casesEB.forEach(x => { x.checked = (x.value === 'passe'); });

      if(dateEB && !dateEB.value){
        dateEB.value = ($('lessonDate') && $('lessonDate').value) || todayLocal();
      }

      /* Le rang se déduit de ceux déjà passés : aucun avant, donc
         c'est le premier. */
      if(rangEB && !rangEB.value){
        const n = examensBlancsPasses();
        rangEB.value = String(Math.min(n + 1, 5));
      }
    }

    function majEB(){
      const v = valeurEB();
      /* Sur un examen blanc du jour, la question n'a pas d'objet :
         c'est la leçon en cours. */
      const cejour = (($('modele') && $('modele').value) === 'examen-blanc');
      nEB.style.display = (!cejour &&
        (v === 'reserve' || v === 'aprevoir' || v === 'passe')) ? 'block' : 'none';
      nEB.placeholder = (v === 'passe')
        ? 'Leçons prévues avant le permis'
        : 'Dans combien de leçons ?';
      /* Le rang n'a de sens que si un examen blanc est en jeu */
      if(blocRang) blocRang.style.display = v ? 'block' : 'none';
      /* La date : seulement s'il est réservé ou déjà passé */
      if(blocDate) blocDate.style.display = (v === 'reserve' || v === 'passe') ? 'block' : 'none';
    }

    /* Un objet qui se comporte comme l'ancien menu, pour le reste du code */
    const selEB = { get value(){ return valeurEB(); },
                    dispatchEvent: majEB };

    /* Affiche d'emblée les champs conditionnels déjà renseignés.
       Placé ICI et non plus haut : un await sépare les deux, et le
       minuteur se déclenchait avant que majEB n'existe, ce qui
       interrompait toute la construction de la fenêtre. */
    setTimeout(() => {
      try{
        majEB();
        if(selEP) selEP.dispatchEvent(new Event('change'));
      }catch(e){ console.warn('Champs conditionnels :', e); }
    }, 0);

    const selEP = boite.querySelector('#qExamPermis');
    const passEP = boite.querySelector('#qExamPassage');
    /* Renseigné ici, où le champ existe : plus haut, il n'était pas
       encore déclaré et l'accès interrompait toute la construction. */
    if(passEP) passEP.value = prec.examPassage || '';
    const dEP = boite.querySelector('#qExamDate');
    selEP.value = prec.examPermis || '';
    dEP.value = prec.examDate || '';

    /* Sa place dans une session vaut date d'examen : sans cela,
       le moniteur devait aller la chercher ailleurs. */
    if(!dEP.value){
      const place = dateDepuisSession();
      if(place){
        dEP.value = place;
        if(!selEP.value) selEP.value = 'prevu';
      }
    }
    /* Le nombre de leçons ne se demande que si l'examen blanc en appelle */
    const selEB2 = boite.querySelector('#qEBPasse');
    const nEB2 = boite.querySelector('#qEBLecons');
    if(selEB2 && nEB2){
      selEB2.value = prec.ebPasse || '';
      nEB2.value = prec.ebLecons || '';
      const majEB2 = () => {
        nEB2.style.display = (selEB2.value === 'lecons') ? 'block' : 'none';
      };
      selEB2.addEventListener('change', majEB2);
      setTimeout(majEB2, 0);
    }

    const nEP = boite.querySelector('#qExamPermisN');
    const nvDate = boite.querySelector('#qNouvelleDate');
    const libDate = boite.querySelector('#qLibExamDate');
    const libNv = boite.querySelector('#qLibNouvelleDate');
    nEP.value = prec.examPermisN || '';
    nvDate.value = prec.nouvelleDate || '';

    selEP.addEventListener('change', () => {
      const v = selEP.value;
      const avecDate = (v === 'prevu' || v === 'annule');

      dEP.style.display = avecDate ? 'block' : 'none';
      libDate.style.display = avecDate ? 'block' : 'none';
      libDate.textContent = (v === 'annule')
        ? "Date à laquelle l'examen était prévu"
        : "Date de l'examen";
      /* Pas de date du jour pour un examen annulé : elle est passée */
      if(v === 'prevu' && !dEP.value) dEP.value = todayLocal();

      nEP.style.display = (v === 'prevu') ? 'block' : 'none';
      /* Le rang du passage n'a de sens que pour un examen à venir */
      const bp = boite.querySelector('#qBlocPassage');
      if(bp) bp.style.display = (v === 'prevu' || v === 'aprevoir') ? 'block' : 'none';
      nvDate.style.display = (v === 'annule') ? 'block' : 'none';
      libNv.style.display = (v === 'annule') ? 'block' : 'none';

      /* Non planifiable : ni date, ni décompte de leçons — c'est le
         dossier qui bloque, pas le niveau. On demande seulement
         pourquoi, pour que le bureau sache quoi débloquer. */
      const motif = boite.querySelector('#qExamMotif');
      if(motif) motif.style.display = (v === 'nonplanifiable') ? 'block' : 'none';
    });

    /* Pour qu'une ouverture concurrente puisse fermer celui-ci
       proprement, au lieu de le retirer du document en laissant la
       promesse suspendue. */
    fond.__annuler = () => {
      questionnaireOuvert = false;
      resolve(null);
    };

    function fermer(reponses){
      questionnaireOuvert = false;
      if(fond.parentNode) document.body.removeChild(fond);

      /* La marque de « quelqu'un y a répondu », posée ici et nulle
         part ailleurs : c'est le seul endroit par où passe une
         réponse humaine. Un cours préparé tout seul — par un rappel,
         par une attribution d'examen blanc — porte bien un contexte,
         mais personne ne l'a rempli : son questionnaire reste à
         poser au moniteur, pré-rempli de ce qu'on savait déjà. */
      if(reponses) reponses.repondu = 1;
      /* L'ANTS et la frise redescendent sur la fiche de l'élève : ce que
         le moniteur corrige ici doit valoir pour les prochains cours,
         sans qu'on ait à ressaisir la même chose au bureau. */
      if(reponses) majFicheDepuisQuestionnaire(eleve, reponses, ficheEleve);

      resolve(reponses);
    }

    passer.addEventListener('click', () => fermer(null));
    valider.addEventListener('click', () => {
      /* Les consignes du bureau rejoignent la note et sont marquées traitées */
      consignesBureau.forEach(x => {
        appelPrep({ action: 'consigneDone', id: x.id }).catch(() => {});
      });
      fermer({
        source: dossier.dernierHorodatage || '',
        consignes: consignesBureau.map(x => x.texte),
        frise: friseDeduite ||
               ((caseCS && caseCS.checked) ? FRISES_FIXES[cleCS] : '') ||
               composerFrise(
          chAvant ? chAvant.value : '',
          chApres ? chApres.value : ''
        ),
        lecon: boite.querySelector('#qLecon').value.trim(),
        examBlanc: selEB.value,
        examBlancN: nEB.value.trim(),
        examBlancRang: rangEB ? rangEB.value : '',
        examBlancDate: dateEB ? dateEB.value : '',
        examPermis: selEP.value,
        examMotif: ((boite.querySelector('#qExamMotif') || {}).value || '').trim(),
        examDate: dEP.value,
        pasEcoute: boite.querySelector('#qPasEcoute').checked,
        simuNuit: boite.querySelector('#qSimuNuit').value,
        prefecture: (boite.querySelector('#qPrefecture') || {}).value || '',
        problematique: ((boite.querySelector('#qProblematique') || {}).value || '').trim(),
        ebPasse: selEB2 ? selEB2.value : '',
        ebLecons: nEB2 ? nEB2.value.trim() : '',
        /* Les heures avant permis remontent au bureau, qui en a
           besoin pour placer les dates. */
        heuresRemontees: (function(){
          const suite = selEB2 ? selEB2.value : '';
          if(suite === '3h') return '0';
          if(suite === 'lecons' && nEB2) return nEB2.value.trim();
          return '';
        })(),
        examPermisN: nEP.value.trim(),
        examPassage: passEP ? passEP.value : '',
        nouvelleDate: nvDate.value,
        formAccomp: boite.querySelector('#qFormAccomp').value,
        rvPrealable: boite.querySelector('#qRvPrealable').value,
        boite: boite.querySelector('#qBoite').value,
        handicap: boite.querySelector('#qHandicap').checked ? 'oui' : '',
        coussin: boite.querySelector('#qCoussin').checked ? 'oui' : '',
        amenagements: Array.prototype.slice
          .call(boite.querySelectorAll('.qAmg:checked')).map(x => x.value),
        ants: chAnts ? chAnts.value : '',
        /* Le type de bilan choisi, quand on prépare un cours */
        modele: (selMod && enPreparation) ? selMod.value : '',
        messenger: champMess ? champMess.value.trim() : '',
        email: champMail ? champMail.value.trim() : '',
        libre: boite.querySelector('#qLibre').value.trim(),
        /* Les manœuvres cochées en plus, à signer de l'émoji du moniteur */
        manoeuvresAjoutees: manoeuvresAjouteesQuestionnaire(boite._marquesConnues || {}),
        /* Celles faites avant d'arriver chez nous, à signer 🚗 */
        manoeuvresAilleurs: manoeuvresAilleursQuestionnaire(boite._marquesConnues || {}),
        leconsFaites: faites,
        manoeuvresFaites: manoeuvresAvant.length,
        totalManoeuvres: totalManoeuvres
      });
    });
  });
}

/* Transforme les réponses en texte de note interne */
function noteDepuisQuestionnaire(q){
  if(!q) return '';
  const bouts = [];

  /* Un repassage se signale avant tout le reste */
  if(q.repassages){
    bouts.push('🔁 ' + q.repassages + (q.repassages === 1 ? 'er' : 'e') + ' repassage' +
      (q.dateAjournement ? ' — ajourné le ' + q.dateAjournement : ''));
  }

  /* Les aménagements passent en premier : le moniteur doit les voir d'emblée */
  if(q.handicap === 'oui'){
    const amg = (q.amenagements || []).map(libelleAmenagement);
    bouts.push('♿ Conduite aménagée' + (amg.length ? ' — ' + amg.join(' · ') : ''));
  }

  /* Le coussin se prépare avant que l'élève monte : il a sa place
     dans la note, au même titre que les aménagements. */
  if(q.coussin === 'oui') bouts.push('🟩 Coussin vert');

  if(q.frise) bouts.push(q.frise);

  /* La fiche d'évaluation : sa problématique et ses leçons */
  if(String(q.problematique || '').trim()){
    bouts.push('❓ Problématique : ' + String(q.problematique).trim());
  }

  if(String(q.prefecture || '').trim()){
    const n = Number(q.prefecture);
    bouts.push(n > 0
      ? '♿ Encore ' + n + ' leçon' + (n > 1 ? 's' : '') +
        ' avant présentation à la préfecture'
      : '♿ Prêt à être présenté à la préfecture');
  }

  if(q.lecon){
    const n = parseInt(q.lecon, 10);
    const rang = (n === 1) ? '1ère' : n + 'ème';

    /* Parcours AAC ou CS : le total figure dans la frise */
    const totalAacCs = leconsPrevuesAacCs(q.frise);
    if(totalAacCs){
      if(n < totalAacCs){
        bouts.push(rang + ' leçon sur ' + totalAacCs + ' — encore ' + (totalAacCs - n) +
                   ' leçon' + ((totalAacCs - n) > 1 ? 's' : '') + ' avant la fin de la fiche véhicule');
      }else if(n === totalAacCs){
        bouts.push(rang + ' leçon sur ' + totalAacCs + ' — dernière prévue');
      }else{
        bouts.push(rang + ' leçon — frise dépassée (' + totalAacCs + ' prévues)');
      }
      ajouterSuite(bouts, q);
      return bouts.join(' · ');
    }

    const prevues = leconsAvantExamenBlanc(q.frise);
    if(prevues && n < prevues){
      bouts.push(rang + ' leçon sur ' + prevues + ' — encore ' + (prevues - n) +
                 ' leçon' + ((prevues - n) > 1 ? 's' : '') + " avant l'examen blanc");
    }else if(prevues && n === prevues){
      bouts.push(rang + ' leçon sur ' + prevues + " — dernière avant l'examen blanc");
    }else if(prevues && n > prevues){
      bouts.push(rang + ' leçon — frise dépassée (' + prevues + ' prévues)');
    }else{
      bouts.push(rang + ' leçon');
    }
  }

  ajouterSuite(bouts, q);
  return bouts.join(' · ');
}

/* Partie commune : examens, fiche véhicule, cases à cocher, note libre */

/* « lundi 31 août 2026 » devient « LUNDI 31 AOÛT 2026 » : les
   accents montent aussi, ce que toUpperCase fait déjà en français. */
function majusculeNote(t){
  return String(t || '').toUpperCase();
}

/* La ligne d'examen dans une note déjà écrite. Reconnue à partir
   des deux libellés ci-dessus, jusqu'au séparateur suivant. */
const RE_EXAMEN_NOTE = new RegExp(
  '(' + EXAMEN_PREVU + '|' + EXAMEN_SANS_DATE + ')([^·]*)', 'g');

/* Écrit une note dans un élément, la ligne d'examen en couleur :
   rouge quand la date est posée, bleu quand elle manque. On
   fabrique des nœuds plutôt que du HTML — une note contient du
   texte saisi par un moniteur, il n'a pas à être interprété. */
function colorerNote(el, note){
  if(!el) return;
  el.textContent = '';
  const t = String(note || '');
  let i = 0, m;

  RE_EXAMEN_NOTE.lastIndex = 0;
  while((m = RE_EXAMEN_NOTE.exec(t)) !== null){
    if(m.index > i) el.appendChild(document.createTextNode(t.slice(i, m.index)));
    const s = document.createElement('span');
    s.style.fontWeight = '800';
    s.style.color = (m[1] === EXAMEN_PREVU) ? 'var(--red)' : 'var(--bleu)';
    s.textContent = m[0];
    el.appendChild(s);
    i = m.index + m[0].length;
  }
  if(i < t.length) el.appendChild(document.createTextNode(t.slice(i)));
}

/* Un examen que rien ne permet de planifier — dossier ANTS en
   attente, avis médical, pièce manquante. Ce n'est pas « pas le
   niveau » : le bureau a quelque chose à débloquer.

   Écrite ici une fois, cette reconnaissance sert au questionnaire
   comme à la liste du bureau : les deux ne peuvent pas se mettre
   à chercher des choses différentes. */
const RE_NON_PLANIFIABLE = /non\s*planifiable/i;

function examenNonPlanifiable(note){
  return (typeof segmentsDeNote === 'function' ? segmentsDeNote(note) : [])
    .some(x => RE_NON_PLANIFIABLE.test(x));
}

/* Le motif écrit entre parenthèses, s'il y en a un */
function motifNonPlanifiable(note){
  const seg = (typeof segmentsDeNote === 'function' ? segmentsDeNote(note) : [])
    .find(x => RE_NON_PLANIFIABLE.test(x)) || '';
  const m = seg.match(/non\s*planifiable\s*\(([^)]+)\)/i);
  return m ? m[1].trim() : '';
}

/* ------------------------------------------------------------
   REMETTRE À LA FORME ACTUELLE UNE LIGNE D'EXAMEN ANCIENNE

   Les notes écrites avant que cette forme existe portent d'autres
   libellés : « Examen prévu le… », « Date d'examen : … », ou la
   même phrase en majuscules ordinaires. Elles ne sont ni mises en
   gras ni colorées, puisque colorerNote cherche exactement les
   deux libellés ci-dessus.

   Plutôt qu'une seconde table de correspondances, la règle est
   écrite ici, à côté des libellés qu'elle produit : les deux ne
   peuvent pas diverger.
   ------------------------------------------------------------ */
/* Le libellé, PUIS le mot de liaison qui le suit parfois. Sans
   cette seconde partie, « Examen du permis fixé au lundi… » du
   bureau devenait « EXAMEN OFFICIEL PRÉVU LE FIXÉ AU LUNDI… » :
   le libellé était remplacé, mais « fixé au » restait et passait
   pour la date. */
const RE_EXAMEN_ANCIEN = new RegExp(
  '^(?:🚗\\s*)?(?:' + EXAMEN_PREVU + '|' +
  "EXAMEN OFFICIEL PR[EÉ]VU LE|Examen officiel pr[eé]vu le|" +
  "Examen pr[eé]vu|Examen du permis|Date d'examen|Permis pr[eé]vu" +
  ')\\s*:?\\s*(?:fix[ée]{1,2}\\s+(?:au|le)|pr[eé]vu\\s+le|au|le)?\\s*:?\\s*', 'i');

const RE_SANS_DATE_ANCIEN = new RegExp(
  '^(?:🚗\\s*)?(?:' + EXAMEN_SANS_DATE + '|' +
  "PAS DE DATE D'EXAMEN(?: OFFICIEL)?|Pas de date d'examen(?: officiel)?|" +
  "Aucune date d'examen|Examen non pr[eé]vu" +
  ')\\s*:?\\s*', 'i');

/* Un segment de note, remis à la forme actuelle. Rend le segment
   inchangé si ce n'est pas une ligne d'examen, ou si elle est
   déjà à la bonne forme — c'est ce qui permet de compter
   honnêtement ce qui reste à corriger. */
function normaliserLigneExamen(segment){
  const seg = String(segment || '').trim();
  if(!seg) return seg;

  /* « Pas de date » d'abord : « PAS DE DATE D'EXAMEN OFFICIEL »
     contient le mot EXAMEN et serait sinon pris pour l'autre. */
  let m = RE_SANS_DATE_ANCIEN.exec(seg);
  if(m) return (EXAMEN_SANS_DATE + ' ' + seg.slice(m[0].length)).trim();

  m = RE_EXAMEN_ANCIEN.exec(seg);
  if(!m) return seg;

  /* Ce qui suit le libellé : la date, puis éventuellement un
     complément après un tiret. Seule la date monte en majuscules,
     comme le fait le générateur. */
  /* « (bureau) » dit qui a saisi, pas ce qui est prévu : il n'a
     rien à faire dans la note, et surtout pas en majuscules. */
  const reste = seg.slice(m[0].length).replace(/\s*\(\s*bureau\s*\)\s*$/i, '');
  const coupe = reste.indexOf(' — ');
  const date  = (coupe === -1 ? reste : reste.slice(0, coupe)).trim();
  const suite = (coupe === -1 ? '' : reste.slice(coupe));

  /* Un libellé « prévu » sans date derrière ne l'est pas vraiment */
  if(!date) return (EXAMEN_SANS_DATE + suite).trim();

  return (EXAMEN_PREVU + ' ' + majusculeNote(date) + suite).trim();
}

/* La note entière. On ne touche qu'à la ligne d'examen, tout le
   reste est recopié tel quel — une note contient le travail d'un
   moniteur. */
function normaliserNoteExamen(note){
  return segmentsDeNote(note)
    .map(x => normaliserLigneExamen(x))
    .filter(Boolean)
    .join(' · ');
}

/* ------------------------------------------------------------
   NETTOYER UNE NOTE QUI S'EST EMPILÉE

   Une note reprise de cours en cours finit par porter trois fois
   la même date d'examen, deux fois le même examen blanc. Chaque
   ajout était juste ; c'est leur accumulation qui ne l'est pas.

   La règle est celle que Chrystel a posée : la dernière
   information est la bonne. Pour chaque famille de segments
   régénérables, on ne garde donc que la DERNIÈRE, à sa place. Ce
   qui n'appartient à aucune famille — les remarques du moniteur —
   n'est jamais jeté, seulement dédoublonné à l'identique.
   ------------------------------------------------------------ */
/* Parmi plusieurs lignes d'une même famille, laquelle garder ?

   La dernière écrite fait foi — c'est la règle posée par Chrystel.
   Sauf quand cette dernière n'est que le DÉBUT d'une autre : une
   « PAS DE DATE D'EXAMEN OFFICIEL » toute nue ne doit pas effacer
   « PAS DE DATE D'EXAMEN OFFICIEL — non planifiable (Pas le
   niveau) », qui dit la même chose ET pourquoi. Sans cette
   nuance, le ménage faisait disparaître un élève de la liste
   Permis → Pas prêts. */
function meilleurDeLaFamille(segs){
  const dernier = segs[segs.length - 1];
  const plusRiche = segs
    .filter(x => x !== dernier && x.indexOf(dernier) === 0)
    .sort((a, b) => b.length - a.length)[0];
  return plusRiche || dernier;
}

function nettoyerNote(note){
  const segs = segmentsDeNote(note).map(x => normaliserLigneExamen(x));

  /* Ce que chaque famille a écrit, dans l'ordre */
  const parFamille = {};
  segs.forEach(seg => {
    const f = FAMILLES_NOTE.find(x => x.motif.test(seg));
    if(!f) return;
    (parFamille[f.cle] = parFamille[f.cle] || []).push(seg);
  });

  const retenu = {};
  Object.keys(parFamille).forEach(cle => {
    retenu[cle] = meilleurDeLaFamille(parFamille[cle]);
  });

  /* À l'envers : le premier rencontré est le dernier écrit, et
     c'est sa place qu'on garde. */
  const famillesVues = {};
  const identiquesVus = {};
  const gardes = [];

  for(let i = segs.length - 1; i >= 0; i--){
    const seg = segs[i];
    const f = FAMILLES_NOTE.find(x => x.motif.test(seg));

    if(f){
      if(famillesVues[f.cle]) continue;
      famillesVues[f.cle] = true;
      gardes.push(retenu[f.cle]);
      continue;
    }

    /* Hors famille — les remarques des moniteurs : on ne jette
       que les doublons à l'identique. */
    if(identiquesVus[seg]) continue;
    identiquesVus[seg] = true;
    gardes.push(seg);
  }

  return gardes.reverse().join(' · ');
}


/* ------------------------------------------------------------
   LA LIGNE D'EXAMEN QUAND IL N'Y A RIEN À DIRE

   Un moniteur a demandé à voir « PAS DE DATE D'EXAMEN OFFICIEL »
   en permanence, pour repérer d'un coup d'œil ceux dont la date
   reste à prendre. Sur un élève qui débute, cette ligne n'apprend
   rien à personne — d'où l'interrupteur.

   Il ne concerne QUE le cas où le moniteur n'a rien répondu : une
   réponse explicite — à prévoir, prévu le, annulé, non planifiable
   — s'écrit toujours.
   ------------------------------------------------------------ */
let ligneExamenToujours = true;

async function chargerReglageLigneExamen(){
  try{
    const d = await appelPrep({ action: 'reglagesList' });
    const r = (d && d.reglages) || {};
    /* Activé tant qu'on n'a pas dit le contraire : c'est un
       moniteur qui l'a demandé, on ne le lui retire pas en
       silence. */
    ligneExamenToujours = String(r.ligneExamenToujours || 'oui') !== 'non';
  }catch(e){ /* injoignable : on garde le comportement demandé */ }
}

function ajouterSuite(bouts, q){
  const n = q.examBlancN;
  const pl = v => (parseInt(v, 10) > 1 ? 's' : '');

  /* Le rang de l'examen blanc : « 2e examen blanc » plutôt que
     « examen blanc », pour savoir combien l'élève en a déjà passé. */
  const rang = String(q.examBlancRang || '').trim();
  const eb = rang
    ? (rang === '1' ? '1er examen blanc' : rang + 'e examen blanc')
    : 'Examen blanc';

  /* Le rang du passage au permis : « 2e passage » plutôt que rien.
     C'est ce qui dit s'il s'agit d'un repassage. */
  const rp = String(q.examPassage || '').trim();
  const passage = rp
    ? (rp === '1' ? ' — 1er passage'
       : rp === '5' ? ' — 5e passage ou plus'
       : ' — ' + rp + 'e passage')
    : '';
  const ebMin = rang
    ? (rang === '1' ? '1er examen blanc' : rang + 'e examen blanc')
    : 'examen blanc';

  /* La date saisie, en toutes lettres : « le mardi 15 septembre 2026 » */
  const jourEB = q.examBlancDate
    ? ' le ' + (dateEnToutesLettres(q.examBlancDate) || q.examBlancDate)
    : '';

  /* L'examen blanc vient d'avoir lieu : sa conclusion prime */
  if(q.ebPasse){
    const jour = dateEnToutesLettres($('lessonDate').value || todayLocal());
    if(q.ebPasse === '3h'){
      bouts.push(eb + ' passé le ' + jour + ' — plus que les 3h avant examen');
    }else if(q.ebPasse === 'lecons'){
      const n = q.ebLecons;
      bouts.push(eb + ' passé le ' + jour + ' — encore ' + (n || '❓') +
                 ' leçon' + (parseInt(n, 10) > 1 ? 's' : '') + ' avant examen');
    }else{
      bouts.push(eb + ' passé le ' + jour + ' — pas le niveau');
    }
  }else if(q.examBlanc === 'passe'){
    bouts.push(n ? eb + ' passé' + jourEB + ' — ' + n + ' leçon' + pl(n) + ' prévue' + pl(n) +
                   ' avant le permis (+ 3h avant examen)'
                 : eb + ' passé' + (jourEB || ' — déjà fait'));
  }else if(q.examBlanc === 'reserve'){
    bouts.push(eb + ' réservé' + jourEB +
               (n ? ' — dans ' + n + ' leçon' + pl(n) : ''));
  }else if(q.examBlanc === 'aprevoir'){
    bouts.push(n ? eb + ' à prévoir dans ' + n + ' leçon' + pl(n)
                 : eb + ' à prévoir');
  }else if(q.examBlanc === 'impossible'){
    bouts.push("Ne pas prévoir d'" + ebMin + ' pour le moment');
  }

  /* L'EXAMEN OFFICIEL — une seule ligne, toujours présente.

     C'est l'information qu'on cherche en premier dans une note :
     elle ne doit ni se chercher au milieu du reste, ni manquer.
     Il y a une date, ou il n'y en a pas — deux formes, jamais deux
     lignes. Le gras est écrit en caractères Unicode : la note vit
     dans un tableur, elle ne peut pas porter de mise en forme. La
     couleur, elle, est posée à l'affichage (voir colorerNote). */
  if(q.examPermis === 'prevu' && q.examDate){
    let phrase = EXAMEN_PREVU + ' ' +
                 majusculeNote(dateEnToutesLettres(q.examDate)) + passage;
    const np = q.examPermisN;
    if(np){
      phrase += (parseInt(np, 10) === 0)
        ? ' — plus que les 3h avant examen'
        : ' — encore ' + np + ' leçon' + pl(np) + ' + 3h avant examen';
    }
    bouts.push(phrase);
  }else if(q.examPermis === 'annule'){
    let phrase = EXAMEN_SANS_DATE + (q.examDate
      ? ' — celui du ' + dateEnToutesLettres(q.examDate) + ' est annulé'
      : ' — annulé');
    phrase += q.nouvelleDate
      ? ' — reprogrammé le ' + dateEnToutesLettres(q.nouvelleDate)
      : ' — nouvelle date en attente';
    bouts.push(phrase);
  }else if(q.examPermis === 'nonplanifiable'){
    /* Le bureau le retrouve dans Permis → Pas prêts grâce à cette
       mention : elle est le seul repère, elle doit rester stable. */
    bouts.push(EXAMEN_SANS_DATE + ' — non planifiable' +
               (q.examMotif ? ' (' + q.examMotif + ')' : ''));
  }else if(q.examPermis === 'aprevoir'){
    bouts.push(EXAMEN_SANS_DATE + ' — à prévoir' + passage);
  }else if(ligneExamenToujours){
    /* Rien de répondu : la ligne n'apparaît que si le bureau veut
       la voir en permanence. */
    bouts.push(EXAMEN_SANS_DATE);
  }

  /* L'écoute pédagogique : le bureau doit le savoir pour ne pas
     la planifier inutilement le jour du permis. */
  if(q.pasEcoute) bouts.push("Pas d'écoutes pédagogiques");
  if(q.simuNuit === 'aprevoir') bouts.push('Simulateur nuit et risques à prévoir');
  else if(q.simuNuit === 'prevu') bouts.push('Simulateur nuit et risques déjà prévu');
  else if(q.simuNuit === 'fait') bouts.push('Simulateur nuit et risques fait ✅');


  if(q.formAccomp === 'aprevoir') bouts.push('Formation accompagnateur à prévoir');
  else if(q.formAccomp === 'prevue') bouts.push('Formation accompagnateur déjà prévue');
  else if(q.formAccomp === 'faite') bouts.push('Formation accompagnateur faite');

  if(q.rvPrealable === 'aprevoir') bouts.push('Rendez-vous préalable à prévoir');
  else if(q.rvPrealable === 'prevu') bouts.push('Rendez-vous préalable déjà prévu');
  else if(q.rvPrealable === 'fait') bouts.push('Rendez-vous préalable fait');
  if(q.libre) bouts.push(q.libre);
  (q.consignes || []).forEach(t => bouts.push(t));
}

/* Choix d'une date au calendrier plutôt qu'à la saisie manuelle */
function choisirDate(titre){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';

    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.maxWidth = '360px';

    const h = document.createElement('h3');
    h.textContent = titre || 'Choisis une date';
    boite.appendChild(h);

    const champ = document.createElement('input');
    champ.type = 'date';
    champ.style.cssText = 'width:100%;font-size:18px;padding:14px;text-align:center;';
    /* Pré-rempli à aujourd'hui : le calendrier s'ouvre au bon mois */
    champ.value = todayLocal();
    boite.appendChild(champ);

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';

    const annuler = document.createElement('button');
    annuler.className = 'btn btn-secondary';
    annuler.textContent = 'Annuler';

    const valider = document.createElement('button');
    valider.className = 'btn btn-primary';
    valider.textContent = 'Valider';

    rangee.appendChild(annuler);
    rangee.appendChild(valider);
    boite.appendChild(rangee);
    fond.appendChild(boite);
    document.body.appendChild(fond);

    function fermer(valeur){
      document.body.removeChild(fond);
      resolve(valeur);
    }
    annuler.addEventListener('click', () => fermer(null));
    valider.addEventListener('click', () => fermer(champ.value || null));
    fond.addEventListener('click', e => { if(e.target === fond) fermer(null); });

    /* Ouvre directement le calendrier sur mobile */
    setTimeout(() => {
      champ.focus();
      if(champ.showPicker){ try{ champ.showPicker(); }catch(e){} }
    }, 80);
  });
}


/* Date ISO -> texte lisible en français */
function dateEnToutesLettres(valeur){
  const t = String(valeur || '').trim();
  if(!t) return '';

  /* Le format français est accepté aussi : les dates relues d'une
     feuille Sheets ressortent en « 11/08/2026 », et y ajouter
     « T12:00:00 » donnait une date invalide. */
  let iso = t;
  const fr = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if(fr){
    iso = fr[3] + '-' + ('0' + fr[2]).slice(-2) + '-' + ('0' + fr[1]).slice(-2);
  }else if(!/^\d{4}-\d{2}-\d{2}/.test(iso)){
    return t;                       /* forme inconnue : on rend tel quel */
  }

  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  if(isNaN(d.getTime())) return t;

  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}


/* Retrouve la frise inscrite dans le corps d'un bilan précédent */
function extraireFriseTexte(bilan){
  const t = String(bilan || '');
  const m = t.match(/(\d+\s*le[çc]ons? de 2h[^\n]*exam[^\n]*)/i);
  return m ? m[1].trim() : '';
}


/* Ajoute le texte à la note, sans jamais écraser ce qui est déjà écrit */
function ajouterANote(champ, texte){
  if(!champ || !texte) return;
  const actuel = champ.value.trim();
  champ.value = actuel ? actuel + ' · ' + texte : texte;
  champ.focus();
  try{ champ.setSelectionRange(champ.value.length, champ.value.length); }catch(e){}
  sauvegarderLocal();
}

/* Construit la rangée de boutons sous un champ de note */
function creerRaccourcis(idConteneur, idChamp){
  const zone = $(idConteneur);
  if(!zone) return;
  zone.innerHTML = '';
  RACCOURCIS_NOTE.forEach(r => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'raccourci';
    b.textContent = r.libelle;
    b.addEventListener('click', async () => {
      let texte;
      if(r.special === 'questionnaire'){
        b.disabled = true;
        b.textContent = '…';
        try{
          const rep = await ouvrirQuestionnaireDepart(contexteDepart, 'Compléter les infos', 'Valider');
          if(rep){
            contexteDepart = rep;
            afficherSaisieDuJour(rep);
            appliquerNoteQuestionnaire(noteDepuisQuestionnaire(rep));
          }
        }finally{
          b.disabled = false;
          b.textContent = r.libelle;
        }
      }
      if(texte) ajouterANote($(idChamp), texte);   /* inutilisé : le questionnaire écrit lui-même */
    });
    zone.appendChild(b);
  });
}


/* ---------- Historique affiché dès la saisie de l'élève ---------- */
/* minuteurHistorique : déclaré dans ec-etat.js */
/* derniereBoiteEleve : déclaré dans ec-etat.js */
/* dernierEleveCharge : déclaré dans ec-etat.js */

function planifierHistorique(){
  clearTimeout(minuteurHistorique);
  /* On attend que le moniteur ait fini de taper : une recherche
     par lettre saturerait Sheets pour rien. */
  minuteurHistorique = setTimeout(() => {
    chargerHistoriqueEleve();
    /* Et ce qui a été préparé pour ce cours, s'il y a une préparation */
    if(typeof afficherPreparationEleve === 'function') afficherPreparationEleve();
  }, 700);
}

async function chargerHistoriqueEleve(){
  const zone = $('historiqueEleve');
  if(!zone) return;
  const nom = $('studentName').value.trim();

  if(nom.length < 3){
    zone.style.display = 'none';
    zone.innerHTML = '';
    dernierEleveCharge = '';
    derniereBoiteEleve = '';
    if($('alerteBoite')) $('alerteBoite').style.display = 'none';
    return;
  }
  if(normaliserMot(nom) === dernierEleveCharge) return;   /* déjà affiché */
  dernierEleveCharge = normaliserMot(nom);

  zone.style.display = 'block';
  zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">Recherche des cours précédents…</div>';

  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      /* Texte complet : la fiche véhicule s'y trouve */
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nom })
    });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json().catch(() => ({}));
    const res = (data && data.resultats) || [];

    if(!res.length){
      zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">Aucun cours précédent pour cet élève.</div>';
      return;
    }

    /* Boîte de l'élève, pour vérifier que le modèle correspond */
    let boiteEleve = '';
    res.forEach(it => {
      if(!boiteEleve && it.boite) boiteEleve = String(it.boite).toLowerCase();
      if(!boiteEleve && /automatique/i.test(it.type || '')) boiteEleve = 'bea';
      if(!boiteEleve && /manuelle/i.test(it.type || '')) boiteEleve = 'bv';
    });
    verifierBoiteModele(boiteEleve);
    derniereBoiteEleve = boiteEleve;

    const dernier = res[0];
    const note = (dernier.note || '').trim();

    zone.innerHTML = '';
    const carte = document.createElement('div');
    carte.style.cssText = 'border:1px solid ' + (note ? 'var(--orange)' : 'var(--line)') +
      ';border-radius:12px;padding:12px 14px;background:' +
      (note ? 'rgba(182,255,14,.08)' : 'transparent') + ';';

    const titre = document.createElement('div');
    titre.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
    titre.textContent = res.length + ' cours précédent' + (res.length > 1 ? 's' : '') +
      ' · dernier le ' + (dateEnToutesLettres(dateFrVersIso(dernier.date)) || dernier.date || '?') +
      (dernier.moniteur ? ' avec ' + dernier.moniteur : '');
    carte.appendChild(titre);

    /* La note du moniteur précédent : frise, examen blanc, date
       d'examen. C'est ce que le moniteur doit voir en premier. */
    if(note){
      const n = document.createElement('div');
      n.style.cssText = 'font-size:15px;font-weight:600;color:var(--accent-text);' +
        'line-height:1.45;white-space:pre-wrap;margin-bottom:10px;';
      n.textContent = '📌 ' + note;
      carte.appendChild(n);
    }else{
      const n = document.createElement('div');
      n.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;';
      n.textContent = 'Pas de note laissée par le moniteur précédent.';
      carte.appendChild(n);
    }

    /* Puis la fiche véhicule, avec les émojis des moniteurs */
    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
    carte.appendChild(sep);
    carte.appendChild(blocFicheVehiculeEleve(res));

    const lien = document.createElement('button');
    lien.type = 'button';
    lien.className = 'btn btn-secondary';
    lien.style.cssText = 'margin-top:10px;font-size:13px;padding:9px 12px;';
    lien.textContent = '👁️ Voir le dernier bilan';
    lien.addEventListener('click', () => {
      currentLessonMeta = {
        modeleLabel: dernier.type, studentName: dernier.eleve, monitorName: dernier.moniteur,
        site: dernier.site, dateStr: dernier.date, noteInterne: dernier.note || '', ts: Date.now()
      };
      $('resultText').value = dernier.bilan;
      afficherNote(dernier.note);
      marquerExport(true);
      $('recordView').style.display = 'none';
      $('resultView').style.display = 'block';
      window.scrollTo(0, 0);
    });
    carte.appendChild(lien);

    zone.appendChild(carte);
  }catch(e){
    zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">Historique indisponible.</div>';
  }
}

/* ============================================================
   FICHE VÉHICULE DE L'ÉLÈVE
   Ce que le moniteur a besoin de savoir avant de partir : quelles
   manœuvres sont validées, par qui, et lesquelles restent à faire.
   ============================================================ */
function blocFicheVehiculeEleve(bilans, toutAfficher){
  const d = document.createElement('div');

  /* On part du plus récent : ses marques sont les plus complètes */
  let marques = {};
  (bilans || []).slice().reverse().forEach(item => {
    const m = (typeof marquesDejaPosees === 'function')
      ? marquesDejaPosees(item.bilan) : {};
    Object.keys(m).forEach(k => { marques[k] = m[k]; });
  });

  const liste = (typeof BLOC !== 'undefined' && BLOC.ficheListeConduite)
    ? BLOC.ficheListeConduite : [];

  const faites = [];
  const restantes = [];
  liste.forEach(libelle => {
    const cle = normaliserMot(libelle);
    if(marques[cle]) faites.push({ nom: libelle, marque: marques[cle] });
    else restantes.push(libelle);
  });

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:6px;';
  t.textContent = '🦉 Fiche véhicule — ' + faites.length + ' sur ' + liste.length;
  d.appendChild(t);

  if(!faites.length){
    const v = document.createElement('div');
    v.style.cssText = 'font-size:13px;color:var(--muted);';
    v.textContent = 'Aucune manœuvre validée pour le moment.';
    d.appendChild(v);
    return d;
  }

  const z = document.createElement('div');
  z.style.cssText = 'font-size:13px;line-height:1.7;';
  faites.forEach(x => {
    const l = document.createElement('div');
    l.innerHTML = '<span style="color:var(--cream);">' +
      x.nom.replace(/</g, '&lt;') + '</span> ' +
      '<span style="letter-spacing:1px;">' + x.marque + '</span>';
    z.appendChild(l);
  });
  d.appendChild(z);

  /* Ce qui reste : déplié quand on prépare un cours, replié sinon */
  if(restantes.length){
    if(toutAfficher){
      const t2 = document.createElement('div');
      t2.style.cssText = 'font-size:12px;color:var(--muted);margin:8px 0 3px;font-weight:700;';
      t2.textContent = '❓ Reste à travailler — ' + restantes.length;
      d.appendChild(t2);

      const r = document.createElement('div');
      r.style.cssText = 'font-size:13px;color:var(--muted);line-height:1.7;';
      restantes.forEach(x => {
        const l = document.createElement('div');
        l.textContent = '· ' + x;
        r.appendChild(l);
      });
      d.appendChild(r);
    }else{
      const det = document.createElement('details');
      det.style.marginTop = '8px';
      det.innerHTML = '<summary style="cursor:pointer;font-size:12px;color:var(--muted);">' +
        '❓ ' + restantes.length + ' manœuvre(s) restante(s)</summary>';
      const r = document.createElement('div');
      r.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.7;margin-top:4px;';
      r.textContent = restantes.join(' · ');
      det.appendChild(r);
      d.appendChild(det);
    }
  }

  return d;
}

/* ============================================================
   FICHE VÉHICULE DANS LE QUESTIONNAIRE
   Le moniteur complète ce qui a été acquis pendant son cours.
   Ce qu'il ajoute porte son émoji, comme dans le bilan.
   ============================================================ */
function remplirFicheQuestionnaire(marquesAvant, dejaCochees, dejaAilleurs){
  const zone = $('qFiche');
  if(!zone) return;

  const marques = marquesAvant || {};
  zone.innerHTML = '';

  /* La colonne 🚗 a sa largeur fixe, la même sur toutes les lignes :
     sans elle les cases se décalaient au gré de la longueur des
     libellés, et on ne savait plus quelle case allait avec quoi. */
  const LARGEUR_AILLEURS = '42px';

  /* L'en-tête : deux « tout cocher », un par colonne. Cocher
     dix-neuf cases une par une est absurde, et ça l'est deux fois
     plus pour un élève repris qui arrive avec la fiche à moitié
     faite. */
  const tout = document.createElement('div');
  tout.style.cssText = 'display:flex;align-items:center;gap:9px;padding:4px 0 8px;' +
    'margin:0 0 6px;border-bottom:1px solid var(--line);';

  const gauche = document.createElement('label');
  gauche.style.cssText = 'display:flex;align-items:center;gap:9px;flex:1;min-width:0;' +
    'font-size:14px;text-transform:none;margin:0;font-weight:700;' +
    'color:var(--accent-text);cursor:pointer;';
  const cbTout = document.createElement('input');
  cbTout.type = 'checkbox';
  cbTout.style.cssText = 'width:17px;height:17px;flex-shrink:0;';
  cbTout.addEventListener('change', () => {
    zone.querySelectorAll('.qManoeuvre').forEach(x => { x.checked = cbTout.checked; });
  });
  gauche.appendChild(cbTout);
  const tt = document.createElement('span');
  tt.textContent = 'Tout cocher';
  gauche.appendChild(tt);
  tout.appendChild(gauche);

  const droite = document.createElement('label');
  droite.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;' +
    'width:' + LARGEUR_AILLEURS + ';flex-shrink:0;font-size:14px;text-transform:none;' +
    'margin:0;font-weight:700;color:var(--accent-text);cursor:pointer;';
  droite.title = "Tout cocher — déjà fait dans une autre auto-école";
  const cbToutAilleurs = document.createElement('input');
  cbToutAilleurs.type = 'checkbox';
  cbToutAilleurs.style.cssText = 'width:17px;height:17px;flex-shrink:0;';
  cbToutAilleurs.addEventListener('change', () => {
    zone.querySelectorAll('.qAilleurs').forEach(x => {
      /* Une manœuvre qui porte déjà la 🚗 d'un bilan précédent n'est
         pas décochable : sa marque est écrite, on ne la reprend pas. */
      if(x.disabled) return;
      x.checked = cbToutAilleurs.checked;
    });
  });
  droite.appendChild(cbToutAilleurs);
  const dt = document.createElement('span');
  dt.style.cssText = 'font-size:13px;line-height:1;';
  dt.textContent = '🚗';
  droite.appendChild(dt);
  tout.appendChild(droite);

  zone.appendChild(tout);

  /* Ce qu'est la colonne 🚗, écrit une fois en toutes lettres :
     l'émoji seul en tête de colonne ne dit rien à qui ouvre
     l'écran pour la première fois. */
  const legende = document.createElement('div');
  legende.style.cssText = 'font-size:11px;color:var(--muted);line-height:1.4;' +
    'margin:0 0 8px;';
  legende.textContent = '🚗 = autre auto-école';
  zone.appendChild(legende);

  /* Ce que le moniteur avait coché à la préparation, ou plus tôt
     dans ce cours : sans ça, rouvrir le questionnaire effaçait tout
     et le travail du collègue était perdu. */
  const cochees = (dejaCochees || []).map(x => normaliserMot(x));
  const ailleurs = (dejaAilleurs || []).map(x => normaliserMot(x));

  (BLOC.ficheListeConduite || []).forEach(libelle => {
    const cle = normaliserMot(libelle);
    const deja = marques[cle] || '';
    const cochee = cochees.indexOf(cle) !== -1;
    /* La 🚗 déjà inscrite dans un bilan précédent : la case la
       montre, mais on n'y retouche pas. */
    const ailleursAcquis = deja.indexOf(MARQUE_AILLEURS) !== -1;
    const ailleursCochee = ailleurs.indexOf(cle) !== -1;

    /* La ligne n'est plus un seul <label> : deux cases dans un même
       label, et cliquer sur la 🚗 basculait aussi la première. */
    const ligne = document.createElement('div');
    ligne.style.cssText = 'display:flex;align-items:center;gap:9px;padding:4px 0;';

    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:9px;flex:1;min-width:0;' +
      'font-size:14px;text-transform:none;margin:0;font-weight:400;cursor:pointer;' +
      'color:' + (deja ? 'var(--muted)' : 'var(--cream)') + ';';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'qManoeuvre';
    cb.value = libelle;
    cb.checked = !!deja || cochee;
    cb.style.cssText = 'width:17px;height:17px;flex-shrink:0;';
    l.appendChild(cb);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = libelle;
    l.appendChild(t);

    if(deja){
      const m = document.createElement('span');
      m.style.cssText = 'flex-shrink:0;letter-spacing:1px;';
      m.textContent = deja;
      l.appendChild(m);
    }

    ligne.appendChild(l);

    const la = document.createElement('label');
    la.style.cssText = 'display:flex;align-items:center;justify-content:center;' +
      'width:' + LARGEUR_AILLEURS + ';flex-shrink:0;margin:0;padding:0;cursor:pointer;';
    la.title = libelle + " — déjà fait dans une autre auto-école";
    const cba = document.createElement('input');
    cba.type = 'checkbox';
    cba.className = 'qAilleurs';
    cba.value = libelle;
    cba.checked = ailleursAcquis || ailleursCochee;
    cba.disabled = ailleursAcquis;
    cba.style.cssText = 'width:17px;height:17px;flex-shrink:0;' +
      (ailleursAcquis ? 'opacity:.55;' : '');
    la.appendChild(cba);
    ligne.appendChild(la);

    zone.appendChild(ligne);
  });
}

/* Ce que le moniteur vient de cocher en plus */
function manoeuvresAjouteesQuestionnaire(marquesAvant){
  const marques = marquesAvant || {};
  const ajoutees = [];
  document.querySelectorAll('.qManoeuvre').forEach(cb => {
    if(!cb.checked) return;
    if(marques[normaliserMot(cb.value)]) return;   /* déjà validée */
    ajoutees.push(cb.value);
  });
  return ajoutees;
}

/* Ce qui a été fait dans une autre auto-école. Séparé des ajouts du
   jour : ces manœuvres reçoivent la 🚗, pas l'émoji du moniteur. */
function manoeuvresAilleursQuestionnaire(marquesAvant){
  const marques = marquesAvant || {};
  const liste = [];
  document.querySelectorAll('.qAilleurs').forEach(cb => {
    if(!cb.checked) return;
    /* Déjà marquée 🚗 dans un bilan précédent : rien à réécrire */
    const deja = marques[normaliserMot(cb.value)] || '';
    if(deja.indexOf(MARQUE_AILLEURS) !== -1) return;
    liste.push(cb.value);
  });
  return liste;
}

/* Le dossier de l'élève sous le champ de préparation : même bloc
   que pour un cours, pour préparer en connaissance de cause. */
async function chargerHistoriquePrep(){
  const zone = $('prepHistorique');
  const nom = $('prepEleve') ? $('prepEleve').value.trim() : '';
  if(!zone) return;

  if(nom.length < 3){ zone.style.display = 'none'; zone.innerHTML = ''; return; }

  zone.style.display = 'block';
  zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">Lecture du dossier…</div>';

  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nom })
    });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json().catch(() => ({}));
    const res = (data && data.resultats) || [];

    zone.innerHTML = '';
    if(!res.length){
      zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">' +
        'Aucun cours précédent pour cet élève.</div>';
      return;
    }

    const dernier = res[0];
    const carte = document.createElement('div');
    carte.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:12px 14px;';

    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
    t.textContent = res.length + ' cours précédent' + (res.length > 1 ? 's' : '') +
      ' · dernier le ' + (dateEnToutesLettres(dateFrVersIso(dernier.date)) || dernier.date || '?') +
      (dernier.moniteur ? ' avec ' + dernier.moniteur : '');
    carte.appendChild(t);

    const note = (dernier.note || '').trim();
    const n = document.createElement('div');
    if(note){
      n.style.cssText = 'font-size:15px;font-weight:600;color:var(--accent-text);' +
        'line-height:1.45;white-space:pre-wrap;margin-bottom:10px;';
      n.textContent = '📌 ' + note;
    }else{
      n.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;';
      n.textContent = 'Pas de note laissée par le moniteur précédent.';
    }
    carte.appendChild(n);

    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
    carte.appendChild(sep);
    /* Déplié : on prépare un cours, on veut voir ce qui reste */
    carte.appendChild(blocFicheVehiculeEleve(res, true));

    zone.appendChild(carte);
  }catch(e){
    zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">' +
      'Dossier indisponible : ' + e.message.replace(/</g, '&lt;') + '</div>';
  }
}

/* ============================================================
   ALLÈGEMENT DU QUESTIONNAIRE DE FIN DE COURS
   En début de cours on renseigne le dossier ; en fin de cours on
   ne fait que corriger ce qui a bougé. Les champs administratifs
   n'ont plus rien à y faire : le moniteur est pressé, l'élève
   attend, et chaque champ inutile est une chance d'erreur.
   ============================================================ */
function allegerQuestionnaireFin(boite, prec){
  if(!boite) return;

  /* Masque un champ et l'étiquette qui le précède */
  const cacher = sel => {
    const e = boite.querySelector(sel);
    if(!e) return;
    /* Une case à cocher vit dans son étiquette : on masque celle-ci */
    const cible = (e.type === 'checkbox' && e.closest('label')) ? e.closest('label') : e;
    const avant = cible.previousElementSibling;
    if(avant && avant.tagName === 'LABEL' && avant.getAttribute('for')) avant.style.display = 'none';
    cible.style.display = 'none';
  };

  /* Conduite aménagée : se décide à l'inscription, jamais après un cours */
  cacher('#qHandicap');
  cacher('#qCoussin');
  const zh = boite.querySelector('#qZoneHandicap');
  if(zh) zh.style.display = 'none';

  /* L'ANTS est traité avec les autres coordonnées manquantes :
     l'ancienne règle isolée masquait le champ sans son bloc. */

  /* Frise et numéro de leçon : renseignés au départ */
  ['#qFriseClassique', '#qFriseFixe', '#qBlocAacCs'].forEach(s => {
    const e = boite.querySelector(s);
    if(!e) return;
    const avant = e.previousElementSibling;
    if(avant && avant.tagName === 'LABEL') avant.style.display = 'none';
    e.style.display = 'none';
    const apres = e.nextElementSibling;
    if(apres && apres.style && apres.style.fontSize === '12px') apres.style.display = 'none';
  });
  cacher('#qLecon');

  /* L'écoute pédagogique se décide en préparant la journée de permis */
  cacher('#qPasEcoute');
}

/* Ce que le moniteur corrige dans le questionnaire redescend sur la
   fiche de l'élève. Sans ça, le bureau et les moniteurs entretiennent
   deux vérités différentes sur le même élève. */
async function majFicheDepuisQuestionnaire(eleve, reponses, ficheAvant){
  if(!eleve || typeof appelPrep !== 'function') return;

  const avant = ficheAvant || {};
  const maj = {};

  /* Le suivi des écoutes se tient tout seul, d'après la case du
     questionnaire : personne n'aurait tenu la liste à la main. */
  if(typeof majEcouteDepuisQuestionnaire === 'function'){
    majEcouteDepuisQuestionnaire(eleve, !!reponses.pasEcoute);
  }

  if(reponses.ants && reponses.ants !== (avant.ants || '')) maj.ants = reponses.ants;
  if(reponses.messenger && reponses.messenger !== (avant.messenger || '')){
    maj.messenger = reponses.messenger;
  }
  if(reponses.email && reponses.email !== (avant.email || '')){
    maj.email = reponses.email;
  }
  if(reponses.frise && reponses.frise !== (avant.frise || '')) maj.frise = reponses.frise;

  if(!Object.keys(maj).length) return;

  try{
    await appelPrep(Object.assign({ action: 'ficheSet', eleve: eleve }, maj));
    /* La fiche en mémoire suit, sinon l'écran afficherait l'ancienne */
    const f = (typeof ficheDe === 'function') ? ficheDe(eleve) : null;
    if(f) Object.assign(f, maj);
  }catch(e){
    console.warn('Fiche non mise à jour :', e);
  }
}

/* ============================================================
   CE QUE LE MONITEUR VIENT DE RENSEIGNER

   Un cours non préparé n'a pas de cadre sous le nom de l'élève.
   Après le questionnaire, on y affiche ses réponses et la fiche
   véhicule détaillée : il voit ce qui reste à faire avant de
   démarrer, sans rouvrir quoi que ce soit.
   ============================================================ */
async function afficherSaisieDuJour(rep, cible){
  /* Le bilan manuel s'ouvre dans un autre écran : il a son propre
     emplacement, sinon le cadre resterait sur l'écran masqué. */
  const zone = $(cible || 'saisieDuJour');
  if(!zone || !rep) return;

  const eleve = $('studentName') ? $('studentName').value.trim() : '';
  if(!eleve) return;

  zone.innerHTML = '';
  const carte = document.createElement('div');
  carte.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:12px 14px;background:rgba(182,255,14,.08);';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
  t.textContent = '📝 Ce que tu viens de renseigner';
  carte.appendChild(t);

  /* La consigne d'écoute, mise en avant comme dans la préparation */
  if(rep.pasEcoute){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:14px;font-weight:700;color:var(--warn-text);margin-bottom:6px;';
    a.textContent = "🚫 Pas d'écoutes pédagogiques";
    carte.appendChild(a);
  }

  const note = noteDepuisQuestionnaire(rep);
  const n = document.createElement('div');
  if(note){
    n.style.cssText = 'font-size:15px;font-weight:600;color:var(--accent-text);' +
      'line-height:1.45;white-space:pre-wrap;';
    n.textContent = note;
  }else{
    n.style.cssText = 'font-size:13px;color:var(--muted);';
    n.textContent = 'Aucune information particulière.';
  }
  carte.appendChild(n);

  /* La fiche véhicule : ce qui est acquis, ce qui reste */
  const cochees = rep.manoeuvresAjoutees || [];
  /* Fait ailleurs = fait : le compteur dit ce qui reste à
     travailler, pas ce qui a été travaillé chez nous. */
  const cocheesAilleurs = rep.manoeuvresAilleurs || [];
  let marques = {};
  try{
    const d = await chargerDossierEleve(eleve);
    marques = (d && d.marques) || {};
  }catch(e){ /* hors ligne : sans les émojis */ }

  const faites = (BLOC.ficheListeConduite || []).filter(
    x => cochees.indexOf(x) !== -1 || cocheesAilleurs.indexOf(x) !== -1 ||
         marques[normaliserMot(x)]);
  const restantes = (BLOC.ficheListeConduite || []).filter(
    x => faites.indexOf(x) === -1);

  const sep = document.createElement('div');
  sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
  carte.appendChild(sep);

  const t2 = document.createElement('div');
  t2.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
  t2.textContent = '🦉 Fiche véhicule — ' + faites.length + ' sur ' +
                   (BLOC.ficheListeConduite || []).length;
  carte.appendChild(t2);

  if(faites.length){
    const l = document.createElement('div');
    l.style.cssText = 'font-size:13px;line-height:1.7;';
    faites.forEach(x => {
      /* La marque écrite si elle existe ; sinon celle que ce
         questionnaire vient de poser — 🚗 pour ce qui vient d'une
         autre auto-école, la coche pour le reste. */
      const m = marques[normaliserMot(x)] ||
        (cocheesAilleurs.indexOf(x) !== -1 ? MARQUE_AILLEURS : '✅');
      const li = document.createElement('div');
      li.innerHTML = '· ' + x.replace(/</g, '&lt;') +
        ' <span style="letter-spacing:1px;">' + m + '</span>';
      l.appendChild(li);
    });
    carte.appendChild(l);
  }

  if(restantes.length){
    const t3 = document.createElement('div');
    t3.style.cssText = 'font-size:13px;font-weight:700;color:var(--warn-text);margin:10px 0 4px;';
    t3.textContent = '❓ Reste à travailler — ' + restantes.length;
    carte.appendChild(t3);

    const r = document.createElement('div');
    r.style.cssText = 'font-size:13px;color:var(--muted);line-height:1.7;';
    restantes.forEach(x => {
      const li = document.createElement('div');
      li.textContent = '· ' + x;
      r.appendChild(li);
    });
    carte.appendChild(r);
  }

  zone.appendChild(carte);
  zone.style.display = 'block';
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-questionnaire.js'] = true;
