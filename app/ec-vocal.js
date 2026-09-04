/* Déployé le 04/09/2026 à 08:38 — v853 */
/* ============================================================
   ec-vocal.js
   Reconnaissance vocale, vocabulaire métier, ponctuation, correction
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   AIDE À LA RECONNAISSANCE — vocabulaire auto-école
   Chrome propose plusieurs transcriptions possibles ; on retient
   celle qui contient le plus de termes du métier.
   ============================================================ */
const LEXIQUE = [
  'giratoire','giratoires','créneau','créneaux','bataille','épi','manœuvre','manœuvres',
  'embrayage','embrayer','débrayer','débraye','débrayes','embraye','point d\'attaque',
  'angle mort','angles morts','rétroviseur','rétroviseurs','rétro','clignotant','clignotants',
  'cédez le passage','priorité','priorité à droite','stop','feu rouge','carrefour','rond-point',
  'trajectoire','allure','allures','contrôle','contrôles','vérification','vérifications',
  'marche arrière','demi-tour','arrêt de précision','voie','voies','chaussée','trottoir',
  'accélération','décélération','régulateur','frein','freiner','frein à main','accélérateur',
  'seconde','première','troisième','quatrième','cinquième','vitesse','vitesses','rapport',
  'volant','pédale','pédales','ceinture','installation','voyant','voyants','tableau de bord',
  'intersection','dépassement','doubler','insertion','rabattre','serrer','déporte',
  'piéton','piétons','cycliste','bande cyclable','examen','permis','boîte','automatique',
  'manuelle','simulateur','tours minute','kilomètre','kilomètres','calé','caler','démarrage',
  'bosse','bosses','verrouille','verrouiller','roues droites','braquer','rebraquer',
  'chicane','bordure','borne','feu vert','feu rouge','bonhomme','passage piéton',
  'insérer','insertion','décélération','se rabattre','rabats-toi'
];

/* \u26a0\ufe0f M\u00c9MORIS\u00c9E, PARCE QU'ELLE EST APPEL\u00c9E PAR CENTAINES DE MILLIERS.

   C'est la fonction la plus appel\u00e9e de toute l'application : chaque
   comparaison de nom passe par elle, et normalize('NFD') suivi d'une
   expression r\u00e9guli\u00e8re n'est pas gratuit. Les noms d'\u00e9l\u00e8ves sont
   quelques centaines de cha\u00eenes qui reviennent sans arr\u00eat : on garde
   le r\u00e9sultat.

   Les longs textes (un bilan dict\u00e9, une note) ne sont PAS mis en
   cache \u2014 ils ne reviennent jamais deux fois, et les garder ferait
   grossir la m\u00e9moire pour rien.

   \u26a0\ufe0f LE CACHE VIT DANS LA FONCTION, pas \u00e0 c\u00f4t\u00e9 d'elle. Les fichiers
   de test extraient des fonctions une par une pour les faire
   tourner \u00e0 part : une variable d\u00e9clar\u00e9e au-dessus resterait
   derri\u00e8re, et la fonction extraite planterait. */
function normaliserMot(s){
  const t = String(s || '');
  const nu = () => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if(t.length > 80) return nu();

  const cache = normaliserMot._cache ||
                (normaliserMot._cache = new Map());
  let v = cache.get(t);
  if(v === undefined){
    v = nu();
    /* Un garde-fou : au-del\u00e0, on calcule sans garder. Une session qui
       durerait des heures ne doit pas accumuler ind\u00e9finiment. */
    if(cache.size < 8000) cache.set(t, v);
  }
  return v;
}
const LEXIQUE_NORM = LEXIQUE.map(normaliserMot);

/* ============================================================
   « PASCAL GORTAIS » ET « GORTAIS PASCAL » SONT LA MÊME PERSONNE

   Le dossier de Pascal Gortais annonçait « aucun suivi handicap à
   son nom » — alors que son dossier existait, sous « Gortais
   Pascal ». Ce n'est pas une faute de frappe : la feuille du suivi
   handicap est tenue en « Nom Prénom », tout le reste de l'outil
   en « Prénom Nom ». Deux conventions, et deux écrans qui ne se
   reconnaissent plus.

   Le rapprochement se fait en deux temps, et l'ordre compte :

     ① le nom exact, normalisé — c'est la règle, elle décide seule
       tant qu'elle trouve quelqu'un ;
     ② à défaut SEULEMENT, les mêmes mots dans un autre ordre.

   Le second n'est pas une devinette : il exige exactement les
   mêmes mots, tous présents, aucun en trop. « Pascal Gortais » et
   « Gortais Pascal » se retrouvent ; « Pascal Gortais » et
   « Pascal Gortais-Legrand », non.

   Il reste un cas où il se tromperait : deux personnes portant les
   mêmes deux mots inversés — un Jean Marc et un Marc Jean. C'est
   pour cela que l'exact passe d'abord, sur TOUTE la liste, avant
   qu'on essaie l'ordre des mots.
   ============================================================ */
function motsDuNom(nom){
  return normaliserMot(nom)
    .replace(/[-'’.]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort();
}

function memePersonne(a, b){
  const na = normaliserMot(String(a || '')).trim();
  const nb = normaliserMot(String(b || '')).trim();
  if(!na || !nb) return false;
  if(na === nb) return true;

  const ma = motsDuNom(a), mb = motsDuNom(b);
  /* Un seul mot de chaque côté : c'est déjà l'égalité ci-dessus, ou
     ce sont deux personnes différentes. On ne rapproche pas deux
     prénoms seuls. */
  if(ma.length < 2 || ma.length !== mb.length) return false;
  return ma.every((m, i) => m === mb[i]);
}

/* Retrouver quelqu'un dans une liste. L'exact d'abord, sur toute la
   liste, AVANT d'essayer l'ordre des mots : chercher les deux en un
   seul passage laisserait le premier venu gagner. */
function trouverPersonne(liste, nom, champ){
  const cle = champ || 'eleve';
  const arr = liste || [];
  const n = normaliserMot(String(nom || '')).trim();
  if(!n) return null;

  const exact = arr.find(x => normaliserMot(String(x[cle] || '')).trim() === n);
  if(exact) return exact;

  return arr.find(x => memePersonne(x[cle], nom)) || null;
}

function scoreMetier(texte){
  const t = normaliserMot(texte);
  let score = 0;
  for(let i = 0; i < LEXIQUE_NORM.length; i++){
    if(t.indexOf(LEXIQUE_NORM[i]) !== -1) score++;
  }
  return score;
}

/* Retient la proposition la plus « métier » parmi celles de Chrome */
function meilleureProposition(resultat){
  if(!resultat || !resultat.length) return '';
  let meilleur = resultat[0].transcript;
  let meilleurScore = scoreMetier(meilleur);
  for(let i = 1; i < resultat.length; i++){
    const t = resultat[i].transcript;
    const s = scoreMetier(t);
    if(s > meilleurScore){ meilleur = t; meilleurScore = s; }
  }
  return meilleur;
}

/* Corrections sûres : uniquement des confusions récurrentes et sans ambiguïté */
const CORRECTIONS = [
  [/\bgyratoire[s]?\b/gi, 'giratoire'],
  [/\bgyrophare\b/gi, 'giratoire'],
  [/\bcr[ée]do\b/gi, 'créneau'],
  [/\bcr[ée]dneau\b/gi, 'créneau'],
  [/\bcr[ée]neau?x?\b/gi, 'créneau'],
  /* « angle mort » est très souvent mal entendu : ongle, oncle.
     Le pluriel est conservé : « les angles morts » reste correct. */
  [/\bongles\s+m[oô]rts?\b/gi, 'angles morts'],
  [/\boncles\s+m[oô]rts?\b/gi, 'angles morts'],
  [/\bongle\s+m[oô]rt?\b/gi, 'angle mort'],
  [/\boncle\s+m[oô]rt?\b/gi, 'angle mort'],
  [/\bangle m[oô]r\b/gi, 'angle mort'],
  /* « cédez » mal entendu : CD, c d, sédez, céder. On exige la
     suite « le passage » — « CD » seul désigne le créneau droit. */
  [/\b(?:c\s*[.-]?\s*d|s[ée]dez|c[ée]d[ée]?[rz]?|cet[ée]|ced[ée])\s+le\s+passage\b/gi,
   'cédez le passage'],
  [/\bs[ée]dez le passage\b/gi, 'cédez le passage'],

  /* « feux de détresse » mal entendu : faute, faut, fautes… */
  /* Le sujet est conservé : « elle » ne doit pas devenir « il ». */
  [/\b(il|elle|on)\s+(?:en\s+)?(?:faut?e?s?|fote?s?)\s+de\s+d[ée]tresse\b/gi,
   '$1 est en feux de détresse'],
  [/\b(?:en\s+)?(?:faut?e?s?|fote?s?)\s+de\s+d[ée]tresse\b/gi,
   'en feux de détresse'],
  [/\bfeu\s+de\s+d[ée]tresse\b/gi, 'feux de détresse'],

  /* « mets la procédure » entendu « mais la procédure » : on
     rétablit le verbe, pour que le texte du cours reste juste. */
  [/\b(?:mais|mes|m[ée])\s+la\s+proc[ée]dure\b/gi, 'mets la procédure'],

  /* Deux confusions relevées sur de vrais cours */
  [/\bla\s+pluie\s+t[êe]te\b/gi, "l'appui-tête"],
  [/\bl[ae]\s+puits?\s+t[êe]te\b/gi, "l'appui-tête"],
  [/\bappui\s+t[êe]te\b/gi, 'appui-tête'],
  /* « Fresnes » est aussi un nom de commune : on n'attrape que
     les tournures de conduite, jamais un lieu. */
  [/\b(tu|on|il|elle|je)\s+fresnes?\b/gi, '$1 freine'],
  [/\bfresnes?\s+(doucement|fort|maintenant|un peu|à fond|progressivement|tout de suite|là|ici)\b/gi,
   'freine $1'],
  [/\bne\s+fresnes?\s+pas\b/gi, 'ne freine pas'],
  [/\bpriorit[ée] a droite\b/gi, 'priorité à droite'],
  [/\bd[ée]brailles?\b/gi, 'débrayes'],
  [/\bemb?railles?\b/gi, 'embrayes'],
  [/\bmarche arri[eè]re?\b/gi, 'marche arrière'],
  [/\bdemi tour\b/gi, 'demi-tour'],
  [/\brond point\b/gi, 'rond-point'],
  [/\bva v[ée]\b/gi, 'VA VD'],
  [/\broues? droit(?:e|es)?\b/gi, 'roues droites'],
  [/\bd[ée]verrouille\s+(ton|le)\s+volant\b/gi, 'verrouille $1 volant'],
  [/\bles\s+bus\b(?=[^.]*coller|[^.]*droite)/gi, 'les bosses'],
  [/\bp\.?a\.?d\.?\b/gi, 'PAD']
];

function corrigerVocabulaire(texte){
  let t = String(texte || '');
  CORRECTIONS.forEach(([motif, remplacement]) => { t = t.replace(motif, remplacement); });
  return t;
}


/* ============================================================
   PONCTUATION AUTOMATIQUE
   Chrome ne ponctue pas le français : on pose les points sur les
   pauses réelles du moniteur, plus les virgules évidentes.
   ============================================================ */
function sansPonctuationFinale(s){
  return String(s || '').replace(/[.!?…,;:]+$/, '').trim();
}

/* Clôt une phrase : appelé quand une pause met fin à une session */
function terminerPhrase(texte){
  const t = String(texte || '').trim();
  if(!t) return '';
  if(/[.!?…]$/.test(t)) return t;
  return t.replace(/[,;:]$/, '') + '.';
}

/* Connecteurs qui prennent presque toujours une virgule devant eux */
const CONNECTEURS = ['mais','donc','car','parce que','alors que','tandis que','sauf que','pourtant','cependant'];

function poserVirgules(texte){
  let t = String(texte || '');
  CONNECTEURS.forEach(mot => {
    /* On ne franchit pas un saut de ligne : sinon la virgule
       recollerait deux paragraphes en une seule phrase. */
    const re = new RegExp('([a-zà-ÿ0-9])[ \\t]+(' + mot + ')\\b', 'gi');
    t = t.replace(re, '$1, $2');
  });
  return t;
}

function majusculer(texte){
  /* Une majuscule après un point, mais aussi après un saut de
     ligne : chaque paragraphe commence une nouvelle phrase. */
  return String(texte || '').replace(
    /(^|[.!?…][ \t]*|\n[ \t]*)([a-zà-ÿ])/g,
    (m, avant, lettre) => avant + lettre.toUpperCase()
  );
}

function mettreEnForme(texte){
  /* On resserre les espaces SANS écraser les sauts de ligne : ce
     sont eux qui aèrent le texte. Un « \\s+ » global collait tout
     le cours en un seul pavé, illisible pour l'élève. */
  const propre = String(texte || '')
    .replace(/[ \t]+/g, ' ')                /* espaces multiples */
    .replace(/[ \t]*\n[ \t]*/g, '\n')       /* pas d'espace autour des retours */
    .replace(/\n{3,}/g, '\n\n')             /* deux lignes vides au maximum */
    .trim();
  return majusculer(poserVirgules(propre));
}

/* Fabrique un objet de reconnaissance NEUF, entièrement câblé.
   Sur Android, une session peut se figer sans rien émettre : le seul
   remède fiable est de jeter l'objet et d'en construire un autre. */
function creerReconnaissance(){
  const r = new SR();
  r.lang = 'fr-FR';
  /* Android ignore le mode continu et se comporte mal avec :
     on relance nous-mêmes à chaque fin de session. */
  r.continuous = !estAndroid;
  /* Provisoires désactivés : sur Android ils sont empilés et non
     remplacés, ce qui provoquait la duplication du texte. */
  r.interimResults = false;
  /* Chrome propose plusieurs transcriptions : on les compare
     au vocabulaire du métier au lieu de prendre la première. */
  r.maxAlternatives = 4;

  r.onstart = () => {
    marquerActif('onstart');
    if(!dernierMot) dernierMot = Date.now();
  };
  r.onaudiostart = () => marquerActif('audio');
  r.onsoundstart = () => marquerActif('son détecté');
  r.onspeechstart = () => marquerActif('parole détectée');

  r.onresult = event => {
    /* On reconstruit TOUT depuis l'index 0 à chaque fois, au lieu
       d'ajouter à la suite : impossible d'accumuler des doublons. */
    const chunks = [];
    for(let i = 0; i < event.results.length; i++){
      chunks.push(meilleureProposition(event.results[i]));
    }
    /* Les reprises du moniteur sont appliquées tout de suite :
       il voit son texte se corriger pendant qu'il parle. */
    /* Les corrections de l'auto-école passent après celles du code :
       elles peuvent ainsi rattraper ce qu'il aurait manqué. */
    let brut = corrigerVocabulaire(fusionner(chunks));
    if(typeof appliquerCorrectionsIA === 'function') brut = appliquerCorrectionsIA(brut);
    const sessionText = appliquerReprises(brut);
    finalTranscript = mettreEnForme(fusionner([committedTranscript, sessionText]));
    if(sessionText) dernierMot = Date.now();
    marquerActif('résultat reçu');

    const box = $('transcriptBox');

    /* La boîte fait autorité : ce que le moniteur y a fait — collé,
       corrigé, SUPPRIMÉ — devient la nouvelle base, et la dictée qui
       suit s'y ajoute. Comparer les textes pour deviner ce qui a
       changé ramenait les passages effacés. */
    if(box && box.value !== avantDerniereEcriture){
      committedTranscript = box.value.trim();
      finalTranscript = mettreEnForme(fusionner([committedTranscript, sessionText]));
    }

    box.value = finalTranscript;
    avantDerniereEcriture = finalTranscript;
    box.scrollTop = box.scrollHeight;
    $('compteur').textContent = finalTranscript.trim().split(/\s+/).filter(Boolean).length +
      ' mots' + (dernieresReprises ? ' · ' + dernieresReprises + ' reprise(s) appliquée(s)' : '');
    sauvegarderLocal();
    /* Une séance à plusieurs : ce qui vient d'être dit appartient
       au poste actif, et doit y être rangé tout de suite. */
    if(typeof rangerPosteActif === 'function' &&
       typeof postes !== 'undefined' && postes.length){
      rangerPosteActif();
      rangerPostes();
      if(typeof afficherBarrePostes === 'function') afficherBarrePostes();
    }
  };

  r.onerror = event => {
    sessionActive = false;
    demarrageEnCours = false;
    const err = String(event && event.error || '');
    dernierEvenement = 'erreur: ' + err;

    if(err === 'no-speech' || err === 'network' || err === 'aborted') return;

    if(err === 'not-allowed' || err === 'service-not-allowed'){
      $('status').textContent = "Micro refusé. Appuie sur le 🔒 à gauche de l'adresse > Autorisations > Micro > Autoriser, puis recharge la page.";
      libererEcran(); arreterUI(); return;
    }
    if(err === 'audio-capture'){
      $('status').textContent = 'Aucun micro accessible. Vérifie qu\'aucune autre application ne l\'utilise.';
      libererEcran(); arreterUI(); return;
    }
    if(err === 'language-not-supported'){
      $('status').textContent = 'Le français n\'est pas disponible pour la dictée sur cet appareil.';
      libererEcran(); arreterUI(); return;
    }
    $('status').textContent = 'Erreur micro : ' + err;
  };

  r.onend = () => {
    /* Le micro se coupe régulièrement de lui-même : on fige le texte
       acquis avant de relancer, sinon la session suivante repart de zéro. */
    sessionActive = false;
    demarrageEnCours = false;
    dernierEvenement = 'session terminée';
    /* Une pause = une fin de phrase */
    committedTranscript = terminerPhrase(finalTranscript);
    finalTranscript = committedTranscript;
    const zone = $('transcriptBox');
    if(zone){
      /* Idem à la pause : la boîte fait autorité */
      if(zone.value !== avantDerniereEcriture){
        committedTranscript = zone.value.trim();
        finalTranscript = committedTranscript;
      }
      zone.value = finalTranscript;
      avantDerniereEcriture = finalTranscript;
    }
    relancerMicro();
  };

  return r;
}

/* Le dernier texte écrit par l'application dans la boîte. Toute
   différence signifie que le moniteur y a touché. */
let avantDerniereEcriture = '';

/* Détruit la session figée et repart sur un objet neuf */
function recreerEtDemarrer(){
  try{
    if(recognition){
      recognition.onend = null;      /* évite de déclencher une relance */
      recognition.onerror = null;
      recognition.abort();
    }
  }catch(e){}

  recognition = creerReconnaissance();
  sessionActive = false;
  try{
    recognition.start();
    dernierEvenement = 'nouvelle session';
  }catch(e){
    dernierEvenement = 'échec après recréation: ' + (e && e.name ? e.name : e);
  }
}

function arreterUI(){
  isRecording = false;
  sessionActive = false;
  demarrageEnCours = false;
  $('etatMicro').textContent = '';
  if($('diagMicro')) $('diagMicro').textContent = '';
  const b = $('recBtn');
  b.classList.remove('recording');
  b.classList.add('idle');
  b.textContent = "🎙️ Reprendre l'enregistrement";
}

$('recBtn').addEventListener('click', async () => {
  if(isRecording){
    isRecording = false;                 /* avant stop() : bloque la relance */
    try{ recognition.stop(); }catch(e){}
    libererEcran();
    arreterUI();
    $('status').textContent = 'En pause. Appuie sur "Terminer" pour générer le bilan.';
    return;
  }

  const btn = $('recBtn');
  const probleme = verifierContexte();
  if(probleme){
    $('status').textContent = probleme;
    return;
  }

  /* ⚠️ UN NOUVEAU COURS N'EST PAS UN BILAN DÉJÀ ENREGISTRÉ.

     Chrystel, un matin d'examens : « j'ai l'impression qu'il ne se
     génère plus de brouillon pour les bilans en vocal non plus ».
     Elle avait raison, et voici pourquoi.

     « bilanEnregistre » passe à vrai quand un bilan part dans le
     classeur, et le dépôt de la dictée s'arrête alors — c'est
     voulu : sans ça, la dictée restée à l'écran se redéposait
     par-dessus un cours terminé, et « Cours non terminés »
     l'accusait indéfiniment.

     Mais c'est une variable de PAGE, pas de cours. Elle ne
     redescendait que par « fermerLeCoursOuvert » — donc uniquement
     en ouvrant un cours PRÉPARÉ.

     Un moniteur qui enregistre un bilan, puis tape le nom suivant
     à la main et appuie sur Démarrer, gardait donc
     « bilanEnregistre » à vrai. Sa dictée ne partait plus JAMAIS
     sur le serveur, pour le reste de sa journée, sans un mot pour
     le dire : le bureau ne voyait rien, et une batterie vide
     emportait une heure de parole.

     Démarrer un cours, c'est repartir de zéro. Ici, et pas
     ailleurs. */
  if(typeof marquerExport === 'function') marquerExport(false);
  if(typeof reinitialiserDepotBrouillon === 'function'){
    reinitialiserDepotBrouillon();
  }

  /* LE QUESTIONNAIRE NE S'OUVRE PLUS AU DÉPART.

     Il demandait au moniteur de valider une quinzaine de champs
     avant de conduire, dont la plupart sont des FAITS que
     l'application connaît mieux que lui — la formation vient du
     répertoire, la frise de la fiche, le rang du classeur. Lui
     faire confirmer ça, c'était lui faire perdre du temps sur ce
     qu'il ne peut pas savoir mieux ; et un moniteur qui valide
     sans lire est pire qu'un moniteur qui n'ouvre rien : sa
     validation estampille « vérifié » une donnée que personne n'a
     vérifiée.

     Ce qui manque est désormais écrit là où on le lit sans le
     chercher : sur la carte, et en rouge sur le bouton
     « 📋 Compléter les infos », qui rouvre le questionnaire entier
     quand le moniteur en a besoin. */
  if(typeof majBoutonCompleter === 'function') majBoutonCompleter();

  if(!finalTranscript){
    $('transcriptBox').value = '';
    $('transcriptBox').style.display = 'block';
    $('transcriptAide').style.display = 'block';
    $('compteur').style.display = 'block';
  }else{
    /* Reprise après pause : on repart du texte affiché,
       corrections manuelles comprises. */
    finalTranscript = $('transcriptBox').value.trim();
    committedTranscript = finalTranscript;
  }

  const res = demarrerReconnaissance();
  if(!res.ok){
    $('status').textContent = 'Le micro n\'a pas démarré : ' + res.message;
    return;
  }

  isRecording = true;
  dernierMot = Date.now();
  btn.classList.remove('idle');
  btn.classList.add('recording');
  btn.textContent = '⏺️ Enregistrement — appuie pour mettre en pause';
  $('finishBtn').style.display = 'block';

  /* Le début du bilan et la fiche véhicule s'ouvrent avec le cours */
  /* Le bilan manuel n'a plus lieu d'être une fois le micro lancé */
  if($('zoneManuel')) $('zoneManuel').style.display = 'none';

  afficherEnteteDuCours();
  afficherFicheDuCours();

  /* Le bureau voit qui est en cours, sans avoir à appeler */
  if(typeof marquerCoursSignale === 'function') marquerCoursSignale();
  if(typeof signalerCoursDemarre === 'function'){
    signalerCoursDemarre($('studentName').value.trim(),
                         $('modele').selectedOptions[0]
                           ? $('modele').selectedOptions[0].textContent : '',
                         $('site') ? $('site').value : '');
  }

  /* Maintien de l'écran — hors du chemin critique :
     un échec ici ne doit pas passer pour une panne de micro. */
  const ecranTenu = await garderEcranAllume();
  $('status').textContent = ecranTenu
    ? 'Écran maintenu allumé. Laisse cette page affichée.'
    : '⚠️ Empêche l\'écran de s\'éteindre et laisse cette page affichée.';
});

/* ---------- Génération ---------- */
/* Le bouton n'enclenche plus rien directement : il demande confirmation */
$('finishBtn').addEventListener('click', async () => {
  const bFin = $('finishBtn');
  if(bFin.disabled) return;
  bFin.disabled = true;
  const libelleFin = bFin.textContent;
  bFin.textContent = 'Préparation…';
  try{

  if(isRecording){
    isRecording = false;
    try{ recognition.stop(); }catch(e){}
    arreterUI();
  }
  libererEcran();

  finalTranscript = $('transcriptBox').value.trim();   /* corrections manuelles prises en compte */
  committedTranscript = finalTranscript;
  const mots = finalTranscript.trim().split(/\s+/).filter(Boolean).length;
  const modele = MODELES[$('modele').value];

  $('confirmRecap').innerHTML =
    'Type : <b>' + (modele ? modele.label : '—') + '</b><br>' +
    'Élève : <b>' + ($('studentName').value.trim() || '(non renseigné)') + '</b><br>' +
    'Moniteur : <b>' + ($('monitorName').value.trim() || '(non renseigné)') + '</b><br>' +
    'Mots captés : <b>' + mots + '</b>';

  const alerte = $('confirmAlerte');
  const soucis = [];
  if(!$('studentName').value.trim()) soucis.push("le nom de l'élève n'est pas renseigné");
  if(mots < 60) soucis.push('la transcription est très courte (' + mots + ' mots)');
  if(interruptions > 0) soucis.push("l'enregistrement a été interrompu " + interruptions + ' fois');

  if(soucis.length){
    alerte.style.display = 'block';
    alerte.innerHTML = '⚠️ Attention : ' + soucis.join(', ') + '.';
  }else{
    alerte.style.display = 'none';
  }

  /* Le questionnaire revient, pré-rempli : tout reste modifiable
     après le cours, notamment les leçons avant l'examen blanc. */
  const maj = await ouvrirQuestionnaireDepart(contexteDepart, 'Après ce cours', 'Terminer');
  if(maj){
    contexteDepart = maj;

    /* Les heures avant permis remontent au bureau : il les
       regarde en donnant les dates. */
    if(maj.heuresRemontees !== undefined &&
       typeof remonterHeuresAuBureau === 'function'){
      await remonterHeuresAuBureau($('studentName').value.trim(),
                                   maj.heuresRemontees,
                                   maj.ebPasse === 'pasleniveau' ? 'non' : 'oui');
    }
    appliquerNoteQuestionnaire(noteDepuisQuestionnaire(maj));
  }

  $('confirmOverlay').classList.add('show');

  }finally{
    bFin.disabled = false;
    bFin.textContent = libelleFin;
  }
});

$('cancelGen').addEventListener('click', () => {
  $('confirmOverlay').classList.remove('show');
});

$('confirmOverlay').addEventListener('click', e => {
  if(e.target === $('confirmOverlay')) $('confirmOverlay').classList.remove('show');
});

$('confirmGen').addEventListener('click', async () => {
  $('confirmOverlay').classList.remove('show');

  const modeleCle = $('modele').value;
  const modele = MODELES[modeleCle];
  const studentName = $('studentName').value.trim() || "l'élève";
  const monitorName = $('monitorName').value.trim();
  const site = $('site').value;
  const rawDate = $('lessonDate').value;
  const dateObj = rawDate ? new Date(rawDate + 'T12:00:00') : new Date();
  const dateStr = dateObj.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });

  if(finalTranscript.trim().length < 30){
    showToast("Transcription trop courte pour générer un bilan.");
    return;
  }

  const p2 = n => String(n).padStart(2, '0');
  const dateCourte = p2(dateObj.getDate()) + '/' + p2(dateObj.getMonth() + 1) + '/' + dateObj.getFullYear();

  currentLessonMeta = {
    modeleLabel: modele.label, studentName, monitorName, site, dateStr, dateCourte,
    noteInterne: $('noteInterne').value.trim(),
    ts: Date.now()
  };
  $('recordView').style.display = 'none';
  $('generatingView').style.display = 'block';
  $('progressionGen').textContent = 'Préparation…';

  /* Un élève attend peut-être déjà : on proposera d'enchaîner si
     la génération s'éternise. */
  const eleveDuBilan = studentName;
  if(typeof surDebutGeneration === 'function') surDebutGeneration();

  /* La transcription part sur le serveur avant toute génération :
     un plantage, un rechargement, une batterie vide ne doivent
     jamais coûter deux heures de cours. */
  if(typeof deposerBrouillonServeur === 'function'){
    $('progressionGen').textContent = 'Mise à l\'abri du cours…';
    /* « en-generation » : le bureau voit que ce cours-là est en
       train de se faire, et non qu'il a été abandonné. Et si la
       génération n'aboutit jamais, l'état reste — il dit alors
       exactement où ça s'est arrêté. */
    await deposerBrouillonServeur({ etat: 'en-generation' });
  }
  const oldDetail = $('genErrorDetail');
  if(oldDetail) oldDetail.remove();

  try{
    /* Modèle Conduite : on reprend les manœuvres validées les cours précédents */
    let manoeuvresAvant = [];
    let marquesAvant = null;
    let coursCorrige = finalTranscript;

    if(modele.schema === 'conduiteResume'){
      /* Les bilans précédents se lisent pendant la correction,
         pas avant : les deux n'ont rien à s'attendre. */
      const promesseHistorique = bilansAnterieurs(studentName);

      /* Remise au propre du cours, par tranches */
      coursCorrige = await corrigerCours(finalTranscript, (n, total, essai) => {
        let msg = total > 1
          ? 'Correction du cours — ' + n + ' partie(s) sur ' + total + '…'
          : 'Correction du cours…';
        if(essai && essai > 1) msg += ' (nouvelle tentative)';
        $('progressionGen').textContent = msg;
      });
      $('progressionGen').textContent = 'Rédaction du résumé…';

      const historique = await promesseHistorique;
      historique.forEach(item => {
        manoeuvresDejaFaites(item.bilan).forEach(m => {
          if(manoeuvresAvant.indexOf(m) === -1) manoeuvresAvant.push(m);
        });
      });
      marquesAvant = {};
      historique.slice().reverse().forEach(item => {
        const mk = marquesDejaPosees(item.bilan);
        Object.keys(mk).forEach(k => { marquesAvant[k] = mk[k]; });
      });
    }

    const donnees = await appelIA(modeleCle, coursCorrige, studentName, monitorName, site, dateStr);

    /* La réponse est arrivée tronquée : le bilan existe, mais sa
       fin manque. On le dit clairement plutôt que de le laisser
       passer pour complet — et surtout on ne bloque pas : le
       moniteur préfère un bilan à finir à la main qu'un écran qui
       refuse de générer. */
    const bilanCoupe = !!donnees.__coupe;
    delete donnees.__coupe;

    /* Le moniteur a le dernier mot sur ce qu'il a coché lui-même */
    Object.assign(donnees, enteteDuCours());

    /* L'examen blanc noté sous la transcription, s'il y en a eu un.
       Il ne se dicte pas : il se coche, et il arrive ici tel quel. */
    if(typeof examenBlancDuCours === 'function'){
      Object.assign(donnees, examenBlancDuCours());
    }

    let bilan = modele.build(donnees, {
      manoeuvresAvant: manoeuvresAvant,
      marquesAvant: marquesAvant,
      /* Aéré au dernier moment : le texte envoyé à l'IA reste entier */
      transcript: aererTexte(coursCorrige),
      note: $('noteInterne').value.trim()
    });
    /* Le rappel sur les écoutes pédagogiques, en fin de bilan */
    if(typeof sansEcoutes === 'function' &&
       sansEcoutes({ note: $('noteInterne').value })){
      bilan += '\n\n' + rappelEcoutes();
    }

    if(bilanCoupe){
      bilan = '⚠️ RÉPONSE COUPÉE — la fin du bilan manque, relis et complète.\n\n' + bilan;
      showToast('⚠️ Bilan incomplet : la réponse a été coupée, vérifie la fin');
    }

    /* Un seul rappel des écoutes, quelle qu'en soit la provenance */
    if(typeof unSeulRappelEcoutes === 'function') bilan = unSeulRappelEcoutes(bilan);
    /* Les procédures réclamées à la voix, recopiées en fin de bilan */
    bilan += blocProcedures(coursCorrige);

    /* Ce que le moniteur a dit, en clair. Seul le modèle Conduite
       le reprenait : sur un RVP ou un examen blanc, son travail
       disparaissait au profit du seul résumé de l'IA. */
    bilan += blocTranscription(bilan, aererTexte(coursCorrige));

    if(monitorName) bilan += '\n\n' + monitorName + ' 🚗💨';

    $('resultText').value = bilan;
    if(typeof remplirChoixProcedures === 'function') remplirChoixProcedures();
    afficherNote(currentLessonMeta.noteInterne);   /* reprend celle saisie avant le cours */
    if(dernierEchecCorrection){
      const detail = dernierEchecCorrection
        .map(e => 'partie ' + e.n + ' (' + e.motif + ')').join(', ');
      await informer('⚠️ Correction incomplète\n\n' + detail + '\n\n' +
            'Le texte brut a été conservé pour ces passages : rien n\'est perdu, ' +
            'mais ils ne sont pas corrigés. Relis-les avant d\'envoyer.');
    }
    sauvegarderLocal(true);
    /* La préparation sort de la liste à l'ENREGISTREMENT, pas ici :
       un bilan généré puis abandonné doit rester à faire. */
    /* Ce que chaque source a apporté : le moniteur vérifie d'un
       coup d'œil que rien n'a été oublié ni inventé. */
    direOrigineManoeuvres(donnees.manoeuvres || []);

    if(typeof surFinGeneration === 'function') surFinGeneration();

    /* Le moniteur est passé au cours suivant : on range le bilan
       et on le lui signale, sans lui reprendre son écran. */
    if(typeof bilanEnFondPret === 'function' &&
       bilanEnFondPret(eleveDuBilan, bilan, currentLessonMeta)){
      await saveLesson(currentLessonMeta, bilan);
      await refreshHistory();
      /* Le cours est en sécurité : son brouillon peut partir */
      if(typeof retirerBrouillonServeur === 'function'){
        retirerBrouillonServeur(eleveDuBilan);
      }
      return;
    }

    $('generatingView').style.display = 'none';
    $('resultView').style.display = 'block';
    /* Les procédures à cocher, prêtes dès l'affichage du bilan */
    if(typeof remplirListeRecitations === 'function') remplirListeRecitations();
  if(typeof majBoutonCorrection === 'function') majBoutonCorrection();

  /* La fiche d'évaluation a ses propres sorties : le PDF pour le
     dossier ou Driv'up, et l'envoi par mail. */
  if(typeof majBoutonsHandicap === 'function') majBoutonsHandicap();
    window.scrollTo(0, 0);
    marquerExport(false);
    await saveLesson(currentLessonMeta, bilan);
    await refreshHistory();

    /* Le cours est en sécurité dans les bilans : son brouillon
       n'a plus lieu d'être. */
    if(typeof retirerBrouillonServeur === 'function'){
      retirerBrouillonServeur(eleveDuBilan);
    }
  }catch(err){
    console.error('Erreur génération bilan:', err);
    if(typeof surFinGeneration === 'function') surFinGeneration();

    /* Un bilan ne se perd jamais en silence : si le moniteur est
       passé à autre chose, la bannière le lui dira. */
    if(typeof bilanEnFondRate === 'function' &&
       bilanEnFondRate(eleveDuBilan, err && err.message ? err.message : err)){
      return;
    }

    $('generatingView').style.display = 'none';
    $('recordView').style.display = 'block';
    showToast("Erreur de génération — détail sous le bouton.");
    const d = document.createElement('div');
    d.id = 'genErrorDetail';
    d.style.cssText = 'margin-top:10px;font-size:12px;color:var(--warn-text);background:var(--warn-bg);border:1px solid var(--red);padding:10px;border-radius:8px;';
    d.textContent = 'Détail : ' + (err && err.message ? err.message : String(err));
    $('finishBtn').insertAdjacentElement('afterend', d);
  }
});


/* Va chercher dans Sheets les manœuvres déjà validées pour cet élève,
   afin de les reporter sur le nouveau bilan. */

/* ============================================================
   CORRECTION DU COURS PAR TRANCHES
   Corriger un cours entier en un seul appel dépasse la taille
   maximale de réponse : on découpe, on corrige, on recolle.
   ============================================================ */
const TAILLE_TRANCHE = 3500;   /* caractères par appel à l'IA */

/* ============================================================
   REPRISES À LA VOIX, APPLIQUÉES EN DIRECT
   Le moniteur se relit et se corrige : « tourne à gauche, non
   pardon, à droite ». La correction s'applique tout de suite
   dans la zone de texte, pas seulement à la génération.

   On reste prudent : seules les formules sans ambiguïté sont
   traitées, et jamais un « non » adressé à l'élève.
   ============================================================ */

/* Ce qui annonce une reprise, et ce qui la suit remplace ce qui précède */
/* Les accords du bilan : sans ça, tout est écrit au masculin.
   Une monitrice qui dicte se retrouvait « je suis satisfait ». */
function consigneAccords(){
  const gm = (typeof ACCES !== 'undefined' && ACCES.genre) || '';
  const nom = $('studentName') ? $('studentName').value.trim() : '';
  const f = (nom && typeof ficheDe === 'function') ? ficheDe(nom) : null;
  const ge = (f && f.genre) || '';

  if(!gm && !ge) return '';

  const bouts = ['\n\nACCORDS — À RESPECTER DANS TOUT LE TEXTE :'];

  if(gm === 'F'){
    bouts.push("- La personne qui parle est une MONITRICE. Tous les accords qui la " +
      "concernent sont au FÉMININ : « je suis contente », « je t'ai accompagnée », " +
      '« ta monitrice ». Ne la désigne jamais au masculin.');
  }else if(gm === 'M'){
    bouts.push('- La personne qui parle est un MONITEUR : accords au masculin le concernant.');
  }

  if(ge === 'F'){
    bouts.push("- L'élève est une FILLE. Tous les accords qui la concernent sont au " +
      "FÉMININ : « tu es prête », « tu t'es bien installée », « tu as été attentive ».");
  }else if(ge === 'M'){
    bouts.push("- L'élève est un GARÇON : accords au masculin le concernant.");
  }

  bouts.push('- Tu corriges UNIQUEMENT les accords. Tu ne changes aucun mot, ' +
    'aucune consigne, aucune tournure pour autre chose.');

  return bouts.join('\n');
}

/* ============================================================
   CONSIGNES ADRESSÉES À L'IA PENDANT LE COURS

   Le moniteur peut parler à l'IA au milieu de son cours :
   « Claude, corrige la phrase précédente », « Claude, ça doit
   apparaître en gras dans le résumé ». Ces phrases ne sont pas
   du contenu de cours : ce sont des ordres, et ils doivent être
   exécutés, pas recopiés.
   ============================================================ */

/* Les prénoms qui déclenchent une consigne à l'IA. Trois sont
   acceptés : Naia et Neo, choisis par l'auto-école, et Claude,
   gardé le temps que l'habitude se prenne.

   Chacun est écrit avec ses graphies probables : la reconnaissance
   vocale ne les orthographie pas toujours de la même façon. */
const MOTIF_CONSIGNE_IA = new RegExp(
  '\\b(?:' + [
    'naia', 'na[iï]a', 'naya', 'na[iï]ah', 'nahia',
    'n[ée]o', 'neo', 'n[ée]au', 'n[ée]hau',
    'claude', 'cl[oa]de', 'clode', 'claud'
  ].join('|') + ')\\s*[,:.]?\\s*([^.!?\\n]{4,300}[.!?]?)', 'gi');

/* Extrait les consignes et rend le texte sans elles */
function extraireConsignesIA(texte){
  const t = String(texte || '');
  const consignes = [];
  let m;

  const g = new RegExp(MOTIF_CONSIGNE_IA.source, 'gi');
  while((m = g.exec(t)) !== null){
    const ordre = String(m[1] || '').trim();
    if(ordre.length >= 4) consignes.push(ordre);
  }

  return { consignes: consignes, texte: t };
}

/* Le bloc à donner à l'IA, en tête de ses instructions */
function consigneMoniteurIA(texte){
  const r = extraireConsignesIA(texte);
  if(!r.consignes.length) return '';

  return '\n\nORDRES DU MONITEUR — PRIORITÉ ABSOLUE :\n' +
    "Pendant le cours, le moniteur s'est adressé directement à toi en disant " +
    '« Naia, … », « Néo, … » ou « Claude, … ». Ce sont des ORDRES, pas du ' +
    'contenu de cours.\n' +
    r.consignes.map((x, i) => '  ' + (i + 1) + '. ' + x).join('\n') + '\n' +
    'RÈGLES :\n' +
    "- Tu exécutes chacun de ces ordres, même s'ils contredisent tes autres consignes.\n" +
    "- Tu SUPPRIMES du texte final la phrase qui contient l'ordre lui-même : " +
    "« Claude, corrige la phrase précédente » ne doit pas apparaître dans le bilan.\n" +
    "- Si l'ordre corrige une phrase (« ce n'est pas ça que j'ai voulu dire, mais ça »), " +
    'tu remplaces la phrase visée par la version corrigée.\n' +
    "- Si l'ordre demande une mise en avant, tu la respectes dans le résumé.\n" +
    "- Si l'ordre porte sur du vocabulaire ou une règle métier, tu l'appliques partout " +
    'dans ce bilan.\n' +
    "- En cas de doute sur ce que vise un ordre, tu appliques ce qui te semble le plus " +
    "proche et tu ne supprimes rien d'autre.\n";
}

/* Les règles retenues des cours précédents, relues à chaque bilan.
   L'IA n'apprend pas : c'est cette liste qui fait office de mémoire. */
let reglesIA = [];
let reglesIALues = 0;

async function chargerReglesIA(){
  if(Date.now() - reglesIALues < 600000) return reglesIA;   /* 10 min */
  try{
    const d = await appelPrep({ action: 'regleIaList' });
    reglesIA = ((d && d.regles) || []).map(x => x.regle).filter(Boolean);
    reglesIALues = Date.now();
  }catch(e){ /* hors ligne : on se passe des règles */ }
  return reglesIA;
}

/* Le bloc de règles à joindre aux consignes */
function consigneReglesIA(){
  if(!reglesIA.length) return '';
  return '\n\nRÈGLES DICTÉES PAR LES MONITEURS — à respecter dans tous les bilans :\n' +
    reglesIA.map((x, i) => '  ' + (i + 1) + '. ' + x).join('\n') + '\n' +
    'Ces règles viennent de cours précédents. Elles priment sur tes habitudes, ' +
    "mais jamais sur un ordre donné pendant CE cours.\n";
}

/* Ce que le moniteur a dicté aujourd'hui rejoint la mémoire.
   Une règle reste inactive tant qu'un administrateur ne l'a pas
   validée : une consigne ponctuelle ne doit pas devenir permanente. */
async function retenirConsignesIA(texte, eleve){
  const r = extraireConsignesIA(texte);
  if(!r.consignes.length) return;
  for(const ordre of r.consignes){
    try{
      await appelPrep({ action: 'regleIaAdd', regle: ordre,
                        eleve: eleve || '', par: ACCES.moniteur || '' });
    }catch(e){ /* sans réseau, la règle vaut pour ce bilan seulement */ }
  }
}

/* ============================================================
   AÉRATION DU TEXTE DU COURS

   L'IA reçoit la consigne de sauter des lignes, mais ne la suit
   pas toujours. On ne peut pas s'en remettre à elle : un pavé de
   quarante lignes est illisible pour l'élève, qui relit son cours
   plusieurs jours après.
   ============================================================ */
function aererTexte(texte, phrasesParBloc){
  const t = String(texte || '').trim();
  if(!t) return '';

  /* Déjà aéré par l'IA : on n'y touche pas */
  if(/\n\s*\n/.test(t)) return t;

  const parBloc = phrasesParBloc || 4;

  /* Découpe en phrases, ponctuation conservée */
  const phrases = t.split(/(?<=[.!?…])\s+/).map(x => x.trim()).filter(Boolean);
  if(phrases.length <= parBloc) return t;

  const blocs = [];
  for(let i = 0; i < phrases.length; i += parBloc){
    blocs.push(phrases.slice(i, i + parBloc).join(' '));
  }
  return blocs.join('\n\n');
}

/* ============================================================
   PROCÉDURES DEMANDÉES À LA VOIX

   « Naia, mets la procédure du créneau » : le moniteur réclame
   une fiche qu'il a rédigée une fois pour toutes. Elle est
   recopiée en fin de bilan, pour que l'élève l'ait sous les yeux.
   ============================================================ */

/* Reconnaît la demande et rend le nom réclamé */
function proceduresDemandees(texte){
  const t = String(texte || '');
  const demandes = [];

  /* « mets la procédure du créneau », « ajoute la procédure
     demi-tour », « procédure de l'arrêt de précision » */
  /* « mets » est très souvent transcrit « mais », « met » ou « mes » :
     ce sont les mêmes sons. On les accepte tous, la suite « la
     procédure » lève toute ambiguïté. */
  /* Les articles sont dans un groupe à part : « de l'arrêt » perdait
     sa première lettre, le « l' » et le « d' » se chevauchant. */
  const motif = new RegExp(
    '(?:mets?|mais|mes|m[ée]|ajoutes?|colles?|rajoutes?|donnes?|balances?|envoies?)' +
    "\\s+(?:lui\\s+)?(?:moi\\s+)?la\\s+proc[ée]dure" +
    /* L'article doit être suivi d'un blanc, ou coller à l'apostrophe :
       sans cette contrainte, le « de » de « demi-tour » était pris
       pour un article et le nom perdait ses deux premières lettres. */
    "(?:\\s+(?:du|des|de\\s+la|de|le|la)\\s+|\\s+(?:de\\s+l'|d'|l')|\\s+)" +
    '([^.!?\\n,]{2,60})', 'gi');
  let m;
  while((m = motif.exec(t)) !== null){
    /* On s'arrête au premier enchaînement : « la procédure du
       créneau ET ajoute la procédure demi-tour » fait deux
       demandes, pas un nom de soixante caractères. */
    const nom = String(m[1] || '')
      .split(/\s+(?:et|puis|ensuite|aussi|aprè?s)\s+/i)[0]
      .replace(/\s+s'il te (?:plait|plaît).*$/i, '')
      .trim();
    if(nom.length >= 2) demandes.push(nom);

    /* La recherche reprend juste après le nom retenu : sinon la
       capture avalait la phrase entière et la seconde demande,
       située dedans, n'était jamais revue. */
    const finNom = m.index + m[0].indexOf(m[1]) + nom.length;
    if(finNom > motif.lastIndex - 1) motif.lastIndex = finNom;
    else motif.lastIndex = Math.max(finNom, m.index + 1);
  }
  return demandes;
}

/* La boîte du cours en train de se faire */
function boiteDuCours(){
  const cle = $('modele') ? $('modele').value : '';
  if(/manuelle/i.test(cle)) return 'bv';
  if(/auto/i.test(cle)) return 'bea';
  return '';
}

/* Les procédures utilisables pour cette boîte. Une procédure sans
   boîte vaut pour les deux : le point de patinage n'a pas de sens
   en automatique, mais le créneau se fait dans les deux. */
function proceduresDeLaBoite(){
  const b = boiteDuCours();
  return ((typeof modelesTexte !== 'undefined' ? modelesTexte : []) || [])
    .filter(m => m.usage === 'procedure')
    .filter(m => {
      const mb = String(m.boite || '').trim().toLowerCase();
      if(!mb) return true;                 /* les deux boîtes */
      if(!b) return true;                  /* boîte inconnue : on garde tout */
      return mb === b;
    });
}

/* Retrouve la procédure la plus proche du nom prononcé */
function trouverProcedure(nomDit){
  const liste = proceduresDeLaBoite();
  if(!liste.length) return null;

  const q = normaliserMot(nomDit);
  if(!q) return null;

  /* Le nom exact d'abord, puis celui qui contient les mots dits */
  let trouve = liste.find(m => normaliserMot(m.nom) === q);
  if(trouve) return trouve;

  trouve = liste.find(m => normaliserMot(m.nom).indexOf(q) !== -1 ||
                           q.indexOf(normaliserMot(m.nom)) !== -1);
  if(trouve) return trouve;

  /* Sinon, celle qui partage le plus de mots avec la demande */
  const mots = q.split(/\s+/).filter(x => x.length > 2);
  let meilleur = null, score = 0;
  liste.forEach(m => {
    const n = normaliserMot(m.nom);
    const s = mots.filter(x => n.indexOf(x) !== -1).length;
    if(s > score){ score = s; meilleur = m; }
  });
  return score ? meilleur : null;
}

/* Les procédures de l'auto-école, transmises à l'IA pour que son
   résumé dise la même chose que ce qu'on enseigne. Sans ça, elle
   invente une méthode plausible mais qui n'est pas la vôtre. */
function consigneProceduresIA(){
  const liste = proceduresDeLaBoite();
  if(!liste.length) return '';

  const b = boiteDuCours();
  const nom = b === 'bea' ? 'boîte automatique'
            : b === 'bv' ? 'boîte manuelle' : '';

  return '\n\nNOS PROCÉDURES' + (nom ? ' — cours en ' + nom : '') + ' :\n' +
    liste.map(p => '### ' + (p.nom || '') + '\n' + (p.contenu || '')).join('\n\n') +
    '\n\nCe sont LES méthodes enseignées ici. Quand tu décris une manœuvre ou une ' +
    "situation couverte par l'une d'elles, tu emploies ses termes et son " +
    "déroulé, jamais une méthode générale que tu connaîtrais par ailleurs. " +
    "Tu ne recopies pas ces procédures dans le bilan : elles te servent à " +
    'écrire juste.\n';
}

/* Les procédures à joindre au bilan, d'après la transcription */
function proceduresAJoindre(texte){
  const noms = proceduresDemandees(texte);
  if(!noms.length) return [];

  const vues = {};
  const out = [];
  noms.forEach(n => {
    const p = trouverProcedure(n);
    if(!p || vues[p.id || p.nom]) return;
    vues[p.id || p.nom] = true;
    out.push(p);
  });
  return out;
}

/* Le bloc ajouté en fin de bilan */
/* Ajoute la transcription si le modèle ne l'a pas déjà reprise.
   Elle vaut mieux que le résumé quand l'élève veut se souvenir du
   ton, d'un exemple, d'une phrase précise. */
function blocTranscription(bilan, texte){
  const t = String(texte || '').trim();
  if(!t) return '';

  /* Le modèle Conduite la place lui-même : on ne la met pas deux fois */
  if(/🎙️\s*𝕋𝕆ℕ ℂ𝕆𝕌ℝ𝕊/.test(bilan)) return '';

  /* Ni si une bonne part du texte est déjà dans le bilan */
  const debut = t.slice(0, 60);
  if(debut && bilan.indexOf(debut) !== -1) return '';

  return '\n\n🎙️ 𝗖𝗲 𝗾𝘂𝗲 𝗷𝗲 𝘁\'𝗮𝗶 𝗱𝗶𝘁 𝗽𝗲𝗻𝗱𝗮𝗻𝘁 𝗹𝗲 𝗰𝗼𝘂𝗿𝘀 :\n' + t;
}


function blocProcedures(texte){
  const liste = proceduresAJoindre(texte);
  if(!liste.length) return '';

  return '\n\n' + liste.map(p =>
    '📋 ' + (p.nom || 'Procédure') + '\n' + (p.contenu || '')).join('\n\n');
}

/* ============================================================
   AJOUTER UNE PROCÉDURE À LA MAIN

   La voix sert pendant le cours ; ici, c'est pour le bilan manuel
   ou pour compléter après coup. Le filtre par boîte s'applique de
   la même façon.
   ============================================================ */
function remplirChoixProcedures(){
  const sel = $('ajoutProcedure');
  if(!sel) return;

  const liste = proceduresDeLaBoite()
    .slice()
    .sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));

  /* Rien à proposer : le sélecteur disparaît plutôt que d'occuper
     la place avec une liste vide. */
  const zone = sel.parentElement;
  if(zone) zone.style.display = liste.length ? 'flex' : 'none';
  if(!liste.length) return;

  sel.innerHTML = '<option value="">📋 Ajouter une procédure…</option>' +
    liste.map(p => '<option value="' + String(p.id || p.nom).replace(/"/g, '&quot;') +
                   '">' + (p.nom || 'Sans nom') + '</option>').join('');
}

function ajouterProcedureAuBilan(){
  const sel = $('ajoutProcedure');
  const zone = $('resultText');
  if(!sel || !zone || !sel.value) return;

  const p = proceduresDeLaBoite()
    .find(x => String(x.id || x.nom) === sel.value);
  if(!p){ showToast('Procédure introuvable.'); return; }

  const bloc = '📋 ' + (p.nom || 'Procédure') + '\n' + (p.contenu || '');

  /* Déjà dedans : on ne la met pas deux fois */
  if(zone.value.indexOf(bloc.trim()) !== -1){
    showToast('Cette procédure est déjà dans le bilan.');
    sel.value = '';
    return;
  }

  /* Avant la signature du moniteur, s'il y en a une : la procédure
     fait partie du bilan, pas de ce qui suit. */
  const signature = zone.value.match(/\n\n[^\n]+ 🚗💨\s*$/);
  if(signature){
    const i = zone.value.length - signature[0].length;
    zone.value = zone.value.slice(0, i) + '\n\n' + bloc + zone.value.slice(i);
  }else{
    zone.value = zone.value.replace(/\s*$/, '') + '\n\n' + bloc;
  }

  sel.value = '';
  if(typeof marquerExport === 'function') marquerExport(false);
  if(typeof sauvegarderLocal === 'function') sauvegarderLocal(true);
  showToast('Procédure ajoutée ✅');
}

/* ============================================================
   FICHE VÉHICULE PENDANT LE COURS

   Le moniteur coche ce qu'il fait travailler, sans attendre la fin.
   Ces cases ne remplacent pas la reconnaissance vocale : les deux
   sources s'additionnent, et rien n'est perdu si l'une manque
   quelque chose.
   ============================================================ */

/* Ce que le moniteur a coché pendant ce cours */
function manoeuvresCocheesEnCours(){
  const out = [];
  document.querySelectorAll('.mCours:checked').forEach(cb => out.push(cb.value));
  return out;
}

async function afficherFicheDuCours(){
  const zone = $('ficheCours');
  if(!zone) return;

  const nom = $('studentName') ? $('studentName').value.trim() : '';
  if(nom.length < 3){ zone.style.display = 'none'; zone.innerHTML = ''; return; }

  /* Ce qui est déjà validé : coché et grisé, on n'y touche pas */
  let marques = {};
  try{
    const d = await chargerDossierEleve(nom);
    marques = (d && d.marques) || {};
  }catch(e){ /* hors ligne : on affiche tout à cocher */ }

  /* On garde les cases déjà cochées si l'écran se redessine */
  const dejaCoche = manoeuvresCocheesEnCours();

  /* Lu UNE fois pour toute la liste : dix-neuf appels rendraient la
     même réponse, et l'un d'eux finirait par différer. */
  const venuDAilleurs = (typeof vientDuneAutreAE === 'function')
    ? vientDuneAutreAE(nom) : true;

  zone.innerHTML = '';
  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:10px 12px;';
  d.open = false;

  const acquises = (BLOC.ficheListeConduite || [])
    .filter(x => marques[normaliserMot(x)]).length;

  d.innerHTML = '<summary style="cursor:pointer;font-size:14px;font-weight:700;' +
    'color:var(--accent-text);">🦉 Fiche véhicule — ' + acquises + ' sur ' +
    (BLOC.ficheListeConduite || []).length + ' · coche ce que tu fais aujourd\'hui</summary>';

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin:8px 0;line-height:1.5;';
  aide.textContent = "Facultatif : ce que tu dictes est déjà repris tout seul. " +
    "Ces cases servent à compléter ce que l'enregistrement aurait manqué.";
  d.appendChild(aide);

  /* Tout cocher d'un coup : quand la fiche est bouclée, cocher
     dix-neuf cases une par une n'a pas de sens. */
  const tout = document.createElement('label');
  tout.style.cssText = 'display:flex;align-items:center;gap:9px;padding:4px 0 8px;' +
    'font-size:14px;text-transform:none;margin:0 0 6px;font-weight:700;' +
    'color:var(--accent-text);border-bottom:1px solid var(--line);';
  const cbTout = document.createElement('input');
  cbTout.type = 'checkbox';
  cbTout.style.cssText = 'width:17px;height:17px;flex-shrink:0;';
  cbTout.addEventListener('change', () => {
    /* Toutes, y compris les acquises : le moniteur qui a tout
       retravaillé dans son cours le dit d'un seul geste. */
    d.querySelectorAll('.mCours').forEach(x => {
      x.checked = cbTout.checked;
    });
  });
  tout.appendChild(cbTout);
  const tt = document.createElement('span');
  tt.textContent = 'Tout cocher';
  tout.appendChild(tt);
  d.appendChild(tout);

  (BLOC.ficheListeConduite || []).forEach(libelle => {
    const cle = normaliserMot(libelle);
    const deja = marques[cle] || '';

    const l = document.createElement('label');
    /* Acquise : le libellé reste lisible mais discret, la marque
       des moniteurs disant le reste. */
    l.style.cssText = 'display:flex;align-items:center;gap:9px;padding:4px 0;' +
      'font-size:14px;text-transform:none;margin:0;font-weight:400;cursor:pointer;' +
      'color:' + (deja ? 'var(--muted)' : 'var(--cream)') + ';';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'mCours';
    cb.value = libelle;
    cb.checked = dejaCoche.indexOf(libelle) !== -1;
    /* Une manœuvre acquise reste cochable : on la retravaille
       souvent, et le moniteur du jour doit pouvoir dire qu'il l'a
       refaite. Sa marque s'ajoute à celles des précédents. */
    cb.style.cssText = 'width:17px;height:17px;flex-shrink:0;';
    l.appendChild(cb);

    /* Le libellé et la marque dans le même bloc : le libellé
       occupait toute la ligne et rejetait les émojis à l'autre
       bout, si loin qu'on ne savait plus à quoi ils se rapportaient. */
    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = libelle;

    if(deja){
      const m = document.createElement('span');
      m.style.cssText = 'margin-left:7px;letter-spacing:1px;white-space:nowrap;';
      m.textContent = deja;
      m.title = 'Déjà validée par : ' + deja + '. Coche si tu la refais aujourd\'hui.';
      t.appendChild(m);
    }

    l.appendChild(t);

    /* LA CASE 🚗 : DÉJÀ FAIT AILLEURS.

       Elle n'existait que dans le questionnaire de départ, qui ne
       s'ouvre plus tout seul. Or c'est ici qu'on s'en aperçoit :
       en plein cours, quand l'élève sort un créneau impeccable
       alors que sa fiche est vide. Une manœuvre faite ailleurs
       compte comme acquise, mais ne prend l'émoji d'aucun de nos
       moniteurs — ils ne l'ont pas vu conduire.

       Elle reste décochable une fois posée : cochée par erreur,
       elle se retire, et la fiche repart comme avant.

       ⚠️ ELLE NE S'AFFICHE QUE POUR UN ÉLÈVE VENU D'AILLEURS
       (Chrystel, 4 septembre). Sur les nôtres, elle se répétait sur
       les dix-neuf lignes pour une réponse qui est toujours non — et
       une case qui ne sert jamais finit par être cochée par erreur.

       Sauf si elle est DÉJÀ COCHÉE : une marque 🚗 posée avant que
       la formation soit corrigée doit rester retirable, sinon elle
       serait là pour toujours. On ne cache jamais ce qui existe. */
    if(venuDAilleurs || deja.indexOf(MARQUE_AILLEURS) !== -1){
      const ail = document.createElement('label');
      ail.style.cssText = 'display:flex;align-items:center;gap:4px;margin:0;' +
        'font-size:12px;text-transform:none;font-weight:400;flex-shrink:0;' +
        'color:var(--muted);cursor:pointer;';
      ail.title = "Déjà fait dans une autre auto-école";

      const cbA = document.createElement('input');
      cbA.type = 'checkbox';
      cbA.className = 'mAilleurs';
      cbA.value = libelle;
      cbA.checked = (deja.indexOf(MARQUE_AILLEURS) !== -1) ||
                    manoeuvresAilleursEnCours().indexOf(libelle) !== -1;
      cbA.style.cssText = 'width:15px;height:15px;flex-shrink:0;margin:0;';
      /* Ce qui était déjà marqué 🚗 dans un bilan : le décocher est
         un retrait, et il doit s'enregistrer comme tel. */
      cbA.dataset.dejaMarque = (deja.indexOf(MARQUE_AILLEURS) !== -1) ? '1' : '';
      cbA.addEventListener('click', e => e.stopPropagation());
      ail.appendChild(cbA);
      ail.appendChild(document.createTextNode('🚗'));
      l.appendChild(ail);
    }

    d.appendChild(l);
  });

  zone.appendChild(d);
  zone.style.display = 'block';
}

/* Ce qui vient d'une autre auto-école, coché dans ce tiroir. */
function manoeuvresAilleursEnCours(){
  return [...document.querySelectorAll('.mAilleurs')]
    .filter(x => x.checked && !x.dataset.dejaMarque)
    .map(x => x.value);
}

/* Et ce qu'on RETIRE : une 🚗 déjà inscrite dans un bilan, que le
   moniteur décoche. Sans cette liste, une erreur de coche restait
   pour toujours — la fiche se reconstruit à chaque bilan à partir
   des marques du précédent. */
function manoeuvresRetireesEnCours(){
  return [...document.querySelectorAll('.mAilleurs')]
    .filter(x => !x.checked && x.dataset.dejaMarque)
    .map(x => x.value);
}

/* ============================================================
   DÉBUT DU BILAN, COCHÉ PENDANT LE COURS

   L'IA devine ces quatre points d'après ce qui a été dit. Quand le
   moniteur les coche lui-même, sa réponse l'emporte : il sait, elle
   suppose.
   ============================================================ */
const LIGNES_ENTETE = [
  ['carteSD', '𝘾𝙖𝙧𝙩𝙚 𝙎𝘿',
   "N'oublie pas de la regarder et si soucis demande nous !! (rappel, tous tes " +
   'cours sont filmés, par une caméra avant et une arrière, avec le son et les ' +
   'conseils des moniteurs, pour revoir tout ton cours de conduite, avant de ' +
   'revenir à ton prochain cours).'],
  ['installation', '𝙄𝙣𝙨𝙩𝙖𝙡𝙡𝙖𝙩𝙞𝙤𝙣',
   'https://www.facebook.com/groups/963972327360861/permalink/969918630099564/'],
  ['passager', '𝙋𝙖𝙨𝙨𝙖𝙜𝙚𝙧', ''],
  ['voyants', '𝙑𝙤𝙮𝙖𝙣𝙩𝙨', '/2 points jour du permis']
];

/* Ce que le moniteur a coché : ✅, ❌, ou rien s'il n'y a pas touché */
function enteteDuCours(){
  const zone = $('enteteCours');
  if(!zone || zone.style.display === 'none') return {};

  const out = {};
  zone.querySelectorAll('.entCase').forEach(cb => {
    out[cb.getAttribute('data-cle')] = cb.checked ? '✅' : '❌';
  });
  zone.querySelectorAll('.entTexte').forEach(i => {
    const v = i.value.trim();
    if(v) out[i.getAttribute('data-cle')] = v;
  });
  return out;
}

function afficherEnteteDuCours(){
  const zone = $('enteteCours');
  if(!zone) return;

  /* On ne redessine pas : le moniteur perdrait ses coches */
  if(zone.querySelector('.entCase')){ zone.style.display = 'block'; return; }

  zone.innerHTML = '';
  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:10px 12px;';

  d.innerHTML = '<summary style="cursor:pointer;font-size:14px;font-weight:700;' +
    'color:var(--accent-text);">📋 Carte SD — Installation — ' +
    'Vérifications</summary>';

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin:8px 0;line-height:1.5;';
  aide.textContent = "Tout est coché d'avance. Ce que tu corriges ici l'emporte sur " +
    "ce que l'IA aura compris du cours.";
  d.appendChild(aide);

  LIGNES_ENTETE.forEach(([cle, titre, apres]) => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:9px;align-items:flex-start;padding:5px 0;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'entCase';
    cb.setAttribute('data-cle', cle);
    cb.checked = true;
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin-top:2px;';
    l.appendChild(cb);

    const t = document.createElement('div');
    t.style.cssText = 'flex:1;min-width:0;font-size:14px;line-height:1.5;word-break:break-word;';
    t.innerHTML = '<strong>' + titre + '</strong>' +
      (apres ? '<div style="font-size:12px;color:var(--muted);line-height:1.5;">' +
               apres + '</div>' : '');
    l.appendChild(t);

    d.appendChild(l);
  });

  const sep = document.createElement('div');
  sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0 8px;';
  d.appendChild(sep);

  const v = document.createElement('div');
  v.style.cssText = 'font-size:14px;font-weight:700;';
  v.textContent = '𝙑𝙚́𝙧𝙞𝙛𝙞𝙘𝙖𝙩𝙞𝙤𝙣𝙨';
  d.appendChild(v);

  const lien = document.createElement('div');
  lien.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;word-break:break-all;';
  lien.textContent = 'https://www.facebook.com/groups/864826058258637';
  d.appendChild(lien);

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
    i.className = 'entTexte';
    i.setAttribute('data-cle', cle);
    i.placeholder = ph;
    i.style.cssText = 'margin:0;padding:9px 10px;font-size:15px;';
    col.appendChild(i);
    duo.appendChild(col);
  });
  d.appendChild(duo);

  const pts = document.createElement('div');
  pts.style.cssText = 'font-size:12px;color:var(--muted);margin-top:6px;';
  pts.textContent = '/3 points jour du permis';
  d.appendChild(pts);

  zone.appendChild(d);
  zone.style.display = 'block';
}

const MARQUEURS_REPRISE = [
  'non pardon', 'ah non pardon', 'euh pardon', 'pardon je voulais dire',
  'je voulais dire', 'je reprends', 'je me reprends', 'rectification',
  'je corrige', 'plutôt non', 'non plutôt', 'enfin non', 'non je disais',
  'non en fait', 'oublie ça', 'oublie cette phrase'
];

let dernieresReprises = 0;

/* Applique les reprises trouvées dans le texte */
function appliquerReprises(texte){
  let t = String(texte || '');
  let n = 0;

  MARQUEURS_REPRISE.forEach(marqueur => {
    /* Le marqueur, précédé de ce qu'il annule et suivi de la bonne version */
    const motif = new RegExp(
      '([^.!?…\\n]*?)' +
      '(?:,\\s*|\\s+)' + marqueur.replace(/ /g, '\\s+') +
      '(?:,\\s*|\\s+)' +
      '([^.!?…\\n]*)', 'gi');

    t = t.replace(motif, (tout, avant, apres) => {
      const bon = String(apres || '').trim();
      if(!bon) return tout;          /* rien derrière : on ne touche à rien */

      /* On ne retire que ce que la reprise remplace, pas toute la phrase.
         « tourne à gauche » corrigé en « à droite » doit donner
         « tourne à droite », et non « à droite » tout court. */
      const debut = String(avant || '');
      let garde;

      const virgule = debut.lastIndexOf(',');
      if(virgule > 0){
        /* Une virgule marque déjà la limite du morceau annulé */
        garde = debut.slice(0, virgule + 1) + ' ';
      }else{
        /* Sinon on retire autant de mots que la correction en apporte */
        const mots = debut.trim().split(/\s+/).filter(Boolean);
        const combien = bon.trim().split(/\s+/).filter(Boolean).length;
        const restants = mots.slice(0, Math.max(0, mots.length - combien));
        garde = restants.length ? restants.join(' ') + ' ' : '';
      }

      n++;
      return garde + bon;
    });
  });

  dernieresReprises = n;
  return t;
}

const CONSIGNE_CORRECTION =
'Tu remets au propre la transcription automatique d\'un cours de conduite enregistré en voiture.\n' +
'\n' +
'RÈGLES ABSOLUES :\n' +
'- Tu CONSERVES TOUT ce qui a été dit, sans exception : les consignes de conduite, mais aussi les discussions, ' +
'les digressions, les anecdotes et les échanges personnels. Tu ne censures rien, tu ne résumes rien, tu ne coupes rien.\n' +
'- Tu corriges UNIQUEMENT la forme : fautes d\'orthographe, de grammaire, de conjugaison, mots mal transcrits ' +
'par la reconnaissance vocale, ponctuation, majuscules.\n' +
'- Tu supprimes les répétitions parasites de la transcription (mots répétés deux fois de suite par erreur, ' +
'bégaiements de la machine) mais PAS les répétitions volontaires du moniteur.\n' +
'- Tu corriges le vocabulaire auto-école mal transcrit : giratoire, créneau, bataille, épi, angle mort, ' +
'PAD (priorité à droite), VA/VD, MALD, embrayage, débrayer, rétroviseur, clignotant.\n' +
'- Tu découpes en paragraphes cohérents et tu sautes une ligne entre les sujets.\n' +
'- Tu NE reformules PAS les idées et tu n\'ajoutes AUCUN commentaire de ta part.\n' +
'- RÈGLE CAPITALE : si un mot ou une phrase est ambigu, tu le laisses TEL QUEL. Tu ne devines jamais. ' +
'Mieux vaut un mot bizarre conservé qu\'un mot inventé qui change le sens : ce texte est relu par un élève ' +
'qui appliquera ce qu\'il lit.\n' +
'- Tu n\'inverses JAMAIS une consigne technique. « verrouille » ne devient pas « déverrouille », ' +
'« ne cherche pas les problèmes sur un feu vert » ne devient pas « attends le feu vert », ' +
'« roues droites » ne devient pas « tourne les roues ». En cas de doute sur une consigne, recopie-la mot pour mot.\n' +
'- Attention aux mots proches en français : bosse/bus, mois/mouettes, roue/route, voie/voix, ' +
'peur/pire. Choisis toujours celui qui a un sens dans le contexte de la conduite ; si aucun ne convient, garde l\'original.\n' +
'- Tu n\'introduis JAMAIS un nom de manœuvre (MALD, MAR, créneau, bataille, épi, demi-tour, arrêt de précision) ' +
'qui ne figure pas explicitement dans la transcription. Un mot incompréhensible ne doit jamais devenir un nom de manœuvre : ' +
'l\'application coche les manœuvres réalisées à partir de ce texte, une invention ici fausse le suivi de l\'élève. ' +
'Devant un mot incompréhensible, recopie-le tel quel.\n' +
'- Le texte reste à la première personne du moniteur, tel qu\'il a parlé.\n' +
'- AÉRATION : tu sautes une ligne vide entre les paragraphes. Un paragraphe correspond à un ' +
'moment ou à un sujet : une manœuvre, un carrefour, une explication, un changement de lieu. ' +
"Un bloc de vingt lignes serrées est illisible pour l'élève, qui doit pouvoir s'y retrouver " +
'plusieurs jours après son cours.\n' +
'\n' +
'REPRISES À LA VOIX — SEULE EXCEPTION À LA RÈGLE « ON CONSERVE TOUT » :\n' +
'Le moniteur se relit pendant l\'enregistrement et se corrige à voix haute quand la machine ' +
'a mal entendu. Ces reprises doivent être APPLIQUÉES, pas recopiées.\n' +
'- Tu reconnais une reprise à des formules comme : « non », « pardon », « je reprends », ' +
'« je voulais dire », « enfin », « plutôt », « correction », « non pas X mais Y », ' +
'« c\'est pas ça », « rectification », « efface », « oublie ».\n' +
'- Tu remplaces alors le passage visé par la version corrigée, et tu SUPPRIMES la formule ' +
'de reprise elle-même : elle ne doit pas apparaître dans le texte final.\n' +
'  Exemple : « tourne à gauche, non pardon, à droite » devient « tourne à droite ».\n' +
'  Exemple : « tu étais à 50, je reprends, tu étais à 70 » devient « tu étais à 70 ».\n' +
'- Si la reprise porte sur une phrase entière prononcée juste avant, tu remplaces cette ' +
'phrase et tu ne gardes que la bonne version.\n' +
'- ATTENTION : « non » suivi d\'une consigne n\'est pas toujours une reprise. ' +
'« Non, tu ne freines pas là » est une consigne adressée à l\'élève, tu la conserves. ' +
'Une reprise corrige les MOTS du moniteur ; une consigne corrige la CONDUITE de l\'élève. ' +
'Dans le doute, conserve les deux versions plutôt que d\'en supprimer une.\n' +
'\n' +
'Réponds UNIQUEMENT avec le texte corrigé. Pas de préambule, pas de titre, pas de balises.';

/* Une réponse complète se termine par une ponctuation forte */
function finDePhrase(texte){
  const t = String(texte || '').trim();
  if(!t) return false;
  return /[.!?…»"]$/.test(t);
}

/* Découpe en respectant les fins de phrase */
function decouperEnTranches(texte, taille){
  const t = String(texte || '').trim();
  if(t.length <= taille) return t ? [t] : [];
  const tranches = [];
  let reste = t;
  while(reste.length > taille){
    let coupe = reste.lastIndexOf('. ', taille);
    if(coupe < taille * 0.5) coupe = reste.lastIndexOf(' ', taille);
    if(coupe < taille * 0.5) coupe = taille;
    tranches.push(reste.slice(0, coupe + 1).trim());
    reste = reste.slice(coupe + 1).trim();
  }
  if(reste) tranches.push(reste);
  return tranches;
}

/* Corrige le cours entier, tranche par tranche */
/* Corrige une tranche, avec ses tentatives. */
/* Vrai dès qu'un appel a été refusé pour cadence trop élevée */
let cadenceDepassee = false;

async function corrigerUneTranche(tranche, i, total, surEssai, avant){
  let contexte = total > 1
    ? '\n\n(Partie ' + (i + 1) + ' sur ' + total +
      ' d\'un même cours : ne réintroduis aucune introduction ni conclusion.)'
    : '';

  /* La fin de la tranche précédente, pour rattraper une reprise à voix
     haute qui porterait sur les derniers mots d'avant la coupure. */
  if(avant){
    contexte += '\n\nCE QUI PRÉCÈDE, POUR CONTEXTE SEULEMENT — NE LE RECOPIE PAS ' +
      'DANS TA RÉPONSE :\n« …' + avant + ' »\n' +
      'Si le début de la partie à corriger reprend ou rectifie ces derniers mots, ' +
      'applique la correction sur ta seule partie.';
  }

  let derniereErreur = null;

  /* Jusqu'à 3 tentatives : un échec ponctuel ne doit pas laisser
     une partie du cours en texte brut. */
  for(let essai = 1; essai <= 3; essai++){
    try{
      if(essai > 1){
        if(surEssai) surEssai(essai);
        /* Attente croissante : une limitation de cadence ne se lève
           pas en une seconde et demie. */
        const attente = cadenceDepassee ? 6000 * essai : 1500 * essai;
        await new Promise(r => setTimeout(r, attente));
      }
      const txt = await appelBrutIA(CONSIGNE_CORRECTION + consigneAccords() +
                                    consigneReglesIA() +
                                    (typeof consigneCorrectionsIA === 'function'
                                      ? consigneCorrectionsIA() : '') +
                                    (typeof consigneLieuxIA === 'function'
                                      ? consigneLieuxIA() : '') +
                                    consigneMoniteurIA(tranche) + contexte,
                                    tranche, 8000,
                                    'Correction de la transcription');
      const propre = (txt || '').trim();

      /* Une correction fait forcément une longueur comparable à
         l'original : trop court = réponse tronquée. */
      if(!propre){
        derniereErreur = new Error('réponse vide');
      }else if(propre.length < tranche.length * 0.75){
        derniereErreur = new Error('réponse tronquée (' +
          Math.round(propre.length / tranche.length * 100) + '% de l\'original)');
      }else if(!finDePhrase(propre)){
        derniereErreur = new Error('réponse coupée en pleine phrase');
      }else{
        return { texte: propre };
      }
    }catch(e){
      derniereErreur = e;
      /* Trop d'appels d'un coup : les suivants attendent davantage */
      if(/429|rate|cadence|overload/i.test(e.message || '')) cadenceDepassee = true;
      console.warn('Tranche ' + (i + 1) + ', essai ' + essai + ' :', e);
    }
  }

  /* Échec après trois tentatives : on garde le texte brut plutôt que
     de perdre le passage, mais on lui applique au moins les
     corrections de vocabulaire. Sans ça « ongle mort » restait. */
  return { texte: corrigerVocabulaire(tranche),
           echec: { n: i + 1, motif: derniereErreur ? derniereErreur.message : 'inconnu' } };
}

/* Combien de tranches traitées en même temps.
   Au-delà, l'IA rejette pour cadence trop élevée. */
const TRANCHES_SIMULTANEES = 3;

async function corrigerCours(transcript, surProgres){
  const tranches = decouperEnTranches(transcript, TAILLE_TRANCHE);
  if(!tranches.length) return '';

  cadenceDepassee = false;
  await chargerReglesIA();
  if(typeof chargerCorrectionsIA === 'function') await chargerCorrectionsIA();
  if(typeof chargerLieuxIA === 'function') await chargerLieuxIA();
  const corrigees = new Array(tranches.length);
  const echecs = [];
  let terminees = 0;
  let suivante = 0;

  const avancer = () => {
    terminees++;
    if(surProgres) surProgres(terminees, tranches.length);
  };

  /* Les tranches partent par groupes plutôt qu'une par une :
     un cours d'une heure passait de longues minutes à attendre. */
  async function ouvrier(){
    while(true){
      const i = suivante++;
      if(i >= tranches.length) return;
      /* Les 300 derniers caractères de la tranche d'avant */
      const avant = (i > 0) ? tranches[i - 1].slice(-300) : '';
      const r = await corrigerUneTranche(tranches[i], i, tranches.length,
        essai => { if(surProgres) surProgres(terminees, tranches.length, essai); },
        avant);
      corrigees[i] = r.texte;
      if(r.echec) echecs.push(r.echec);
      avancer();
    }
  }

  const combien = Math.min(TRANCHES_SIMULTANEES, tranches.length);
  await Promise.all(Array.from({ length: combien }, ouvrier));

  if(echecs.length){
    /* On ne masque pas l'échec : le moniteur doit savoir que
       certaines parties sont restées non corrigées. */
    echecs.sort((a, b) => a.n - b.n);
    dernierEchecCorrection = echecs;
  }else{
    dernierEchecCorrection = null;
  }

  return corrigees.join('\n\n');
}

/* dernierEchecCorrection : déclaré dans ec-etat.js */


/* Répare les JSON contenant des retours à la ligne bruts dans les
   chaînes : c'est le défaut le plus fréquent des réponses longues. */
/* ------------------------------------------------------------
   UNE RÉPONSE COUPÉE N'EST PAS UNE RÉPONSE PERDUE

   Quand le modèle atteint sa limite, il s'arrête au milieu d'une
   phrase : le JSON n'a plus d'accolade fermante et devient
   illisible. Tout était jeté — le bilan entier, pour une dernière
   phrase manquante — et le moniteur relançait indéfiniment, avec
   le même résultat. C'est exactement ce qui a bloqué une monitrice
   toute une soirée.

   On referme donc ce qui est resté ouvert : la chaîne en cours,
   puis les tableaux et objets, dans l'ordre inverse de leur
   ouverture. Ce qui est arrivé est conservé ; ce qui manque est
   signalé au moniteur, à lui de compléter la fin.
   ------------------------------------------------------------ */
function refermerJsonCoupe(brut){
  let dansChaine = false;
  let echappe = false;
  const pile = [];

  for(let i = 0; i < brut.length; i++){
    const ch = brut[i];
    if(echappe){ echappe = false; continue; }
    if(ch === '\\'){ echappe = true; continue; }
    if(ch === '"'){ dansChaine = !dansChaine; continue; }
    if(dansChaine) continue;
    if(ch === '{' || ch === '[') pile.push(ch);
    else if(ch === '}' || ch === ']') pile.pop();
  }

  let sortie = brut;

  /* Une chaîne laissée ouverte : on la ferme, après avoir retiré
     une éventuelle échappement en suspens qui invaliderait tout. */
  if(dansChaine){
    if(echappe) sortie = sortie.slice(0, -1);
    sortie += '"';
  }

  /* Une virgule ou un deux-points en attente d'une valeur qui n'est
     jamais venue : la clé orpheline part avec. */
  sortie = sortie.replace(/,\s*$/, '').replace(/:\s*$/, ': ""');
  sortie = sortie.replace(/,\s*"[^"]*"\s*$/, '');

  for(let i = pile.length - 1; i >= 0; i--){
    sortie += (pile[i] === '{') ? '}' : ']';
  }
  return sortie;
}

function reparerJson(brut){
  let sortie = '';
  let dansChaine = false;
  let echappe = false;

  for(let i = 0; i < brut.length; i++){
    const ch = brut[i];

    if(echappe){ sortie += ch; echappe = false; continue; }
    if(ch === '\\'){ sortie += ch; echappe = true; continue; }
    if(ch === '"'){ dansChaine = !dansChaine; sortie += ch; continue; }

    if(dansChaine){
      /* Caractères de contrôle interdits dans une chaîne JSON */
      if(ch === '\n'){ sortie += '\\n'; continue; }
      if(ch === '\r'){ sortie += '\\r'; continue; }
      if(ch === '\t'){ sortie += '\\t'; continue; }
      if(ch.charCodeAt(0) < 32){ continue; }
    }
    sortie += ch;
  }
  return sortie;
}

/* Appel simple au modèle, renvoie du texte brut (pas de JSON) */
async function appelBrutIA(systemPrompt, message, maxTokens, quoi){
  const r = await fetch(CONFIG.IA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: ACCES.code,
      /* CE QUE COÛTE CETTE GÉNÉRATION, ET POURQUOI.

         Le Worker note chaque appel facturé : sans un mot sur ce
         qu'on lui demande, la facture ne dirait que « des appels ».
         Le nom voyage avec la demande, il ne se devine pas. */
      quoi: quoi || 'Génération IA',
      payload: {
        model: 'claude-sonnet-5',
        max_tokens: maxTokens || 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      }
    })
  });
  if(r.status === 403){
    verrouiller('Session expirée, saisis ton code à nouveau.');
    throw new Error('Accès refusé');
  }
  if(!r.ok) throw new Error('HTTP ' + r.status);
  const data = await r.json();
  if(data.error) throw new Error(data.error.message || 'erreur API');
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

/* Les bilans précédents d'un élève, lus une seule fois.
   Le texte complet est nécessaire : c'est là que sont les marques. */
async function bilansAnterieurs(nomEleve){
  if(!nomEleve || nomEleve.length < 2) return [];
  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nomEleve })
    });
    if(!r.ok) return [];
    const data = await r.json();
    return (data && data.resultats) || [];
  }catch(e){
    console.warn('Bilans antérieurs indisponibles :', e);
    return [];   /* on continue sans, plutôt que de bloquer le bilan */
  }
}

async function appelIA(modeleCle, transcript, studentName, monitorName, site, dateStr){
  /* Les ordres du moniteur passent aussi au résumé : « ça doit
     apparaître en gras » n'a de sens qu'à cette étape. */
  const systemPrompt = construireConsignes(modeleCle) + consigneReglesIA() +
                       (typeof consigneCorrectionsIA === 'function'
                         ? consigneCorrectionsIA() : '') +
                       (typeof consigneLieuxIA === 'function' ? consigneLieuxIA() : '') +
                       consigneProceduresIA() +
                       consigneMoniteurIA(transcript);
  /* ------------------------------------------------------------
     LE NOM DE FAMILLE NE SORT PAS

     Ce message part chez Anthropic, hors Union européenne. Il
     portait le nom COMPLET de l'élève, celui du moniteur, le lieu,
     la date et la transcription intégrale de la leçon : un dossier
     nominatif, sur un traitement dont l'élève n'a jamais été
     informé.

     Le prénom, lui, reste — et il faut dire pourquoi plutôt que de
     faire semblant. La transcription est de la parole : le moniteur
     y appelle son élève par son prénom d'un bout à l'autre, et
     aucun filtre ne le retirerait de façon fiable. Le retirer de
     l'en-tête seul donnerait l'illusion d'avoir anonymisé, ce qui
     est pire que de ne rien faire. Ce qu'on retire vraiment, c'est
     le nom de famille — celui qui transforme un prénom en dossier
     identifiable.

     Le nom complet reste côté application : c'est elle qui classe
     le bilan, pas le modèle.
     ------------------------------------------------------------ */
  const prenomSeul = n => String(n || '').trim().split(/\s+/)[0] || '';

  const userMsg = 'Type de bilan : ' + MODELES[modeleCle].label + '\n' +
    'Moniteur : ' + (prenomSeul(monitorName) || 'non renseigné') + '\n' +
    'Élève : ' + (prenomSeul(studentName) || "l'élève") + '\n' +
    'Site : ' + site + '\n' +
    'Date : ' + dateStr + '\n\n' +
    'Transcription brute du cours :\n"""\n' + transcript + '\n"""';

  const response = await fetch(CONFIG.IA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: ACCES.code,
      quoi: 'Bilan — ' + MODELES[modeleCle].label,
      payload: {
        model: 'claude-sonnet-5',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }]
      }
    })
  });

  if(response.status === 403){
    verrouiller('Session expirée, saisis ton code à nouveau.');
    throw new Error('Accès refusé — code invalide.');
  }

  if(!response.ok){
    let body = '';
    try{ body = await response.text(); }catch(e){}
    throw new Error('HTTP ' + response.status + ' — ' + body.slice(0, 300));
  }

  const data = await response.json();
  if(data.type === 'error' || data.error){
    throw new Error((data.error && data.error.message) || JSON.stringify(data).slice(0, 300));
  }

  let brut = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();

  if(!brut){
    const raison = data.stop_reason ? ' (arrêt : ' + data.stop_reason + ')' : '';
    const mots = transcript.trim().split(/\s+/).filter(Boolean).length;
    if(data.stop_reason === 'max_tokens'){
      throw new Error('Réponse trop longue pour le modèle' + raison +
        '. Cours de ' + mots + ' mots — découpe-le en deux bilans.');
    }
    throw new Error('Réponse vide du modèle' + raison +
      '. Cours de ' + mots + ' mots. Blocs reçus : ' +
      JSON.stringify((data.content || []).map(b => b.type)));
  }

  brut = brut.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const debut = brut.indexOf('{');
  if(debut === -1){
    throw new Error('Réponse non exploitable : ' + brut.slice(0, 200));
  }

  const fin = brut.lastIndexOf('}');

  /* Pas d'accolade fermante : la réponse s'est arrêtée en route.
     On referme et on garde ce qui est arrivé, plutôt que de tout
     perdre pour une phrase manquante. */
  let coupe = false;
  let corps;
  if(fin === -1 || fin < debut){
    corps = refermerJsonCoupe(brut.slice(debut));
    coupe = true;
  }else{
    corps = brut.slice(debut, fin + 1);
  }

  /* Certaines réponses contiennent la suite « \n » sous forme de texte
     au lieu d'un vrai retour à la ligne : on rétablit. */
  function nettoyerRetours(obj){
    if(typeof obj === 'string'){
      return obj.replace(/\\n/g, '\n').replace(/\\t/g, ' ');
    }
    if(Array.isArray(obj)) return obj.map(nettoyerRetours);
    if(obj && typeof obj === 'object'){
      const o = {};
      for(const k in obj) o[k] = nettoyerRetours(obj[k]);
      return o;
    }
    return obj;
  }

  /* Marquer le résultat plutôt que de le renvoyer nu : celui qui
     l'affiche doit pouvoir prévenir que la fin manque. */
  const marquer = o => {
    if(o && typeof o === 'object' && (coupe || data.stop_reason === 'max_tokens')){
      o.__coupe = true;
    }
    return o;
  };

  try{
    return marquer(nettoyerRetours(JSON.parse(corps)));
  }catch(e){
    /* Deuxième chance : on échappe les retours à la ligne bruts */
    try{
      return marquer(nettoyerRetours(JSON.parse(reparerJson(corps))));
    }catch(e2){
      /* Troisième : refermer ce qui est resté ouvert, même quand une
         accolade fermante existait — elle peut appartenir à un objet
         intérieur, l'objet du dessus restant béant. */
      try{
        const rattrape = nettoyerRetours(
          JSON.parse(reparerJson(refermerJsonCoupe(brut.slice(debut)))));
        coupe = true;
        return marquer(rattrape);
      }catch(e3){
        if(data.stop_reason === 'max_tokens'){
          throw new Error('Réponse coupée en cours de route et irrécupérable : ' +
            'le cours est trop long. Découpe-le en deux bilans.');
        }
        throw new Error('JSON illisible : ' + e.message +
                        ' — début reçu : ' + brut.slice(0, 120));
      }
    }
  }
}

function horodatageLisible(ts){
  const d = ts ? new Date(ts) : new Date();
  const p = n => String(n).padStart(2, '0');
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() +
         ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function afficherNote(note){
  const champ = $('noteResult');
  if(champ) champ.value = (note || '').trim();
}

/* ---------- Actions ---------- */
/* ============================================================
   DEMANDER DES RÉCITATIONS EN FIN DE COURS

   Le moniteur vient de relire son bilan : c'est là qu'il sait ce
   qui a manqué. Cocher une procédure la demande à l'élève, crée
   son accès si besoin, et joint le message au bilan.
   ============================================================ */

/* L'interrupteur, lu une fois par session */
let recitationsOuvertes = null;

async function recitationsAutorisees(){
  if(recitationsOuvertes !== null) return recitationsOuvertes;
  try{
    const d = await appelPrep({ action: 'reglagesList' });
    recitationsOuvertes = ((d && d.reglages) || {}).recitationsMoniteurs === 'oui';
  }catch(e){ recitationsOuvertes = false; }
  return recitationsOuvertes;
}

async function remplirListeRecitations(){
  const z = $('listeRecitations');
  const tiroir = $('tiroirRecitations');
  if(!z) return;

  /* Fermé : le tiroir n'apparaît pas du tout. Le montrer grisé
     inviterait à essayer pour rien. */
  if(!await recitationsAutorisees()){
    if(tiroir) tiroir.style.display = 'none';
    return;
  }
  if(tiroir) tiroir.style.display = '';

  const procs = (typeof modelesTexte !== 'undefined' ? modelesTexte : [])
    .filter(m => m.usage === 'procedure')
    .sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));

  if(!procs.length){
    z.innerHTML = '<div style="font-size:12px;color:var(--muted);">' +
      'Aucune procédure dans Outils → Procédures.</div>';
    return;
  }

  z.innerHTML = '';
  procs.forEach(p => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:10px;' +
      'text-transform:none;font-size:14px;color:var(--cream);margin:0 0 8px;' +
      'font-weight:400;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'recitDemande';
    cb.value = p.id;
    cb.dataset.nom = p.nom;
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin:0;';
    l.appendChild(cb);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = p.nom;
    l.appendChild(t);

    z.appendChild(l);
  });
}

/* Pose les demandes et rend le message à joindre au bilan */
async function poserRecitationsDemandees(eleve){
  const cochees = [...document.querySelectorAll('.recitDemande:checked')];
  if(!cochees.length) return '';

  const rep = await appelPrep({
    action: 'demanderProcedures',
    eleve: eleve,
    procedures: cochees.map(x => x.value),
    /* Le serveur refuse si l'interrupteur est fermé */
    source: 'cours',
    par: ACCES.moniteur || ''
  });

  /* Le serveur refuse tant que l'interrupteur est fermé : on le
     dit plutôt que de joindre un message qui n'a pas de suite. */
  if(rep && rep.status === 'error'){
    throw new Error(rep.message || 'Demande refusée.');
  }

  const noms = (rep && rep.procedures && rep.procedures.length)
    ? rep.procedures : cochees.map(x => x.dataset.nom);

  const bouts = ['',
    '📌 𝗔̀ 𝗥𝗘́𝗖𝗜𝗧𝗘𝗥 𝗔𝗩𝗔𝗡𝗧 𝗟𝗘 𝗣𝗥𝗢𝗖𝗛𝗔𝗜𝗡 𝗖𝗢𝗨𝗥𝗦'];
  noms.forEach(n => bouts.push('• ' + n));
  bouts.push('');
  bouts.push('Enregistre-toi dans ton coin révisions :');
  bouts.push('https://ec-sb.github.io/Bilan-conduite/eleve.html');
  bouts.push('Ton nom : ' + eleve);
  bouts.push('Ton code : ' + ((rep && rep.code) || ''));

  return bouts.join('\n');
}


$('copyBtn').addEventListener('click', async () => {
  direEtatFin('');
  const ta = $('resultText');

  /* Les récitations demandées rejoignent le bilan avant la copie :
     l'élève doit les lire dans le message qu'il reçoit. */
  try{
    const nom = $('studentName') ? $('studentName').value.trim() : '';
    if(nom){
      const ajout = await poserRecitationsDemandees(nom);
      if(ajout && ta.value.indexOf('𝗔̀ 𝗥𝗘́𝗖𝗜𝗧𝗘𝗥') === -1){
        ta.value = ta.value.replace(/\s*$/, '') + '\n' + ajout;
      }
    }
  }catch(e){
    direEtatFin('Récitations non enregistrées : ' + e.message, true);
  }

  ta.select();

  /* 1. La copie d'abord : c'est ce que le moniteur attend immédiatement */
  try{
    await navigator.clipboard.writeText(ta.value);
  }catch(e){
    try{ document.execCommand('copy'); }catch(_){}
  }

  /* 2. Puis l'enregistrement de la version relue et corrigée.
     Une note ajoutée après coup doit partir, elle aussi : le
     moniteur ne comprendrait pas qu'elle reste dans le vide. */
  const b = $('copyBtn');
  b.disabled = true;
  const libelle = b.textContent;
  /* Bleu pendant l'écriture : le moniteur voit que ça travaille,
     et ne réappuie pas en croyant que rien ne se passe. */
  const styleInitial = b.getAttribute('style') || '';
  b.setAttribute('style', styleInitial +
    ';background:#2F6FB3;border-color:#2F6FB3;color:#FFFFFF;');

  let enregistre;
  if(bilanEnregistre && !bilanModifieDepuisEnregistrement()){
    enregistre = true;                       /* rien n'a bougé */
    showToast('Bilan copié ✅');
  }else if(bilanEnregistre){
    b.textContent = 'Mise à jour…';
    enregistre = await mettreAJourBilan();
    showToast(enregistre ? 'Bilan et note mis à jour ✅'
                         : '⚠️ Copié, mais la mise à jour a échoué');
  }else{
    b.textContent = 'Enregistrement…';
    enregistre = await exporterVersSheets(true);
    showToast(enregistre ? 'Bilan copié et enregistré ✅'
                         : '⚠️ Copié, mais NON enregistré dans Sheets');
  }

  b.disabled = false;
  b.textContent = libelle;
  b.setAttribute('style', styleInitial);

  /* On ne termine QUE si l'enregistrement a réussi : sinon le
     moniteur perdrait son bilan en croyant l'avoir sauvegardé. */
  if(!enregistre){
    if(typeof direEtatFin === 'function'){
      direEtatFin("Le bilan n'est PAS enregistré. Vérifie ta connexion " +
                  'et réessaie avant de quitter cet écran.', true);
    }
    return;
  }

  /* On ne remet pas l'écran à zéro sans prévenir : le moniteur
     doit encore coller le bilan sur Messenger. */
  confirmerFinDeCours();
});

/* Une date au format des colonnes : jj/mm/aaaa, jamais l'ISO brut */
function dateCourteDuJour(iso){
  const t = String(iso || '').trim();
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return m[3] + '/' + m[2] + '/' + m[1];
  if(/^\d{2}\/\d{2}\/\d{4}/.test(t)) return t;

  const d = new Date();
  const p2 = n => String(n).padStart(2, '0');
  return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear();
}

async function exporterVersSheets(silencieux){
  const btn = $('exportSheetsBtn');
  btn.disabled = true;
  btn.textContent = 'Export en cours…';
  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'append',
        code: ACCES.code,
        /* Les champs de l'écran servent de secours : si les
           métadonnées du cours manquent — bilan repris, écran
           rechargé — la ligne partait avec des colonnes vides. */
        data: {
          date: (currentLessonMeta &&
                 (currentLessonMeta.dateCourte || currentLessonMeta.dateStr)) ||
                dateCourteDuJour($('lessonDate') ? $('lessonDate').value : ''),
          site: (currentLessonMeta && currentLessonMeta.site) ||
                ($('site') ? $('site').value : ''),
          monitorName: (currentLessonMeta && currentLessonMeta.monitorName) ||
                       ACCES.moniteur || '',
          studentName: (currentLessonMeta && currentLessonMeta.studentName) ||
                       ($('studentName') ? $('studentName').value.trim() : ''),
          typeBilan: (currentLessonMeta && currentLessonMeta.modeleLabel) ||
                     ((MODELES[$('modele') ? $('modele').value : ''] || {}).label || ''),
          noteInterne: $('noteResult').value.trim(),
          boite: contexteDepart ? (contexteDepart.boite || '') : '',
          ants: contexteDepart ? (contexteDepart.ants || '') : '',
          manoeuvres: manoeuvresDejaFaites($('resultText').value).join(' | '),
          horodatage: horodatageLisible(currentLessonMeta ? currentLessonMeta.ts : null),
          bilan: $('resultText').value
        }
      })
    });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const rep = await r.json().catch(() => ({}));
    /* Le await manquait : la fonction est asynchrone, et une promesse
       est toujours vraie. Le garde-fou ne s'est jamais déclenché — un
       bilan enregistré sans sa note passait pour enregistré. */
    if(!await verifierVersionScript(rep)){ marquerExport(false); return false; }
    const avecNote = $('noteResult').value.trim();
    showToast(avecNote ? 'Enregistré avec la note 🔒 ✅' : 'Enregistré dans Sheets ✅');
    marquerExport(true);
    retenirEtatEnregistre(rep && rep.ligne);
    /* Le cours est fait : sa préparation sort de la liste */
    retirerPreparationFaite();
    /* Les ordres dictés rejoignent la mémoire, en attente de validation */
    retenirConsignesIA($('transcriptBox').value,
                       currentLessonMeta && currentLessonMeta.studentName);
    if(typeof signalerCoursFini === 'function') signalerCoursFini();

    /* ------------------------------------------------------------
       LE BROUILLON MEURT ICI, ET PAS AILLEURS

       Il était retiré à la fin de la GÉNÉRATION — un instant plus
       tôt, et ce n'est pas le même instant. Entre les deux, le
       dépôt automatique continuait de tourner : dès que la dictée
       bougeait, ou à la première mise en veille du téléphone, un
       brouillon repartait sur le serveur APRÈS que le bilan y était
       déjà. Personne ne le reprenait jamais, et « Cours non
       terminés » accusait un cours parfaitement enregistré — « le
       bilan n'est pas généré » alors qu'on le voit dans Sheets.

       Le seul instant qui vaut est celui-ci : la ligne est écrite
       dans le classeur. C'est là que le brouillon n'a plus de
       raison d'être.
       ------------------------------------------------------------ */
    if(typeof retirerBrouillonServeur === 'function'){
      retirerBrouillonServeur((currentLessonMeta &&
                               currentLessonMeta.studentName) ||
                              ($('studentName') ? $('studentName').value.trim() : ''));
    }

    /* ET LE BROUILLON LOCAL AVEC. J'avais corrigé celui du serveur
       en v773 et laissé celui-ci : même défaut, une couche plus
       bas. Le cours restait dans le stockage du téléphone après
       son enregistrement, alors au rechargement la bannière le
       proposait comme « interrompu » et la transcription revenait
       dans son bloc — pour un bilan pourtant bien enregistré.

       L'écran, lui, ne bouge pas : on retire une mémoire, pas un
       contenu. Le moniteur garde son bilan sous les yeux pour le
       coller sur Messenger. */
    if(typeof effacerSauvegarde === 'function') effacerSauvegarde();

    viderCaches(currentLessonMeta && currentLessonMeta.studentName);
    chargerEleves();          /* un nouvel élève peut venir d'apparaître */


    return true;
  }catch(e){
    console.error('Erreur export Sheets:', e);
    marquerExport(false);
    if(!silencieux) showToast("Erreur lors de l'enregistrement : " + e.message);
    return false;
  }finally{
    btn.disabled = false;
  }
}

$('exportSheetsBtn').addEventListener('click', () => exporterVersSheets(false));


/* ---------- Suivi de l'enregistrement dans Sheets ---------- */
/* bilanEnregistre : déclaré dans ec-etat.js */


/* ============================================================
   MISE À JOUR D'UN BILAN DÉJÀ ENREGISTRÉ
   Corriger le texte ou la note doit remplacer la ligne existante,
   pas en écrire une seconde.
   ============================================================ */
let etatEnregistre = { bilan: '', note: '', ligne: null };

function retenirEtatEnregistre(ligne){
  etatEnregistre = {
    bilan: $('resultText') ? $('resultText').value : '',
    note: $('noteResult') ? $('noteResult').value : '',
    ligne: ligne || etatEnregistre.ligne
  };
}

function bilanModifieDepuisEnregistrement(){
  const b = $('resultText') ? $('resultText').value : '';
  const n = $('noteResult') ? $('noteResult').value : '';
  return b !== etatEnregistre.bilan || n !== etatEnregistre.note;
}

async function mettreAJourBilan(){
  if(!etatEnregistre.ligne){
    /* Ligne inconnue : on enregistre normalement plutôt que de perdre la note */
    return await exporterVersSheets(true);
  }
  try{
    const r = await appelPrep({
      action: 'bilanMaj',
      ligne: etatEnregistre.ligne,
      eleve: currentLessonMeta ? currentLessonMeta.studentName : '',
      bilan: $('resultText').value,
      noteInterne: $('noteResult').value.trim(),
      manoeuvres: manoeuvresDejaFaites($('resultText').value).join(' | ')
    });
    if(r && r.status === 'error') throw new Error(r.message);
    retenirEtatEnregistre(etatEnregistre.ligne);
    viderCaches(currentLessonMeta && currentLessonMeta.studentName);
    return true;
  }catch(e){
    console.error('Mise à jour du bilan :', e);
    return false;
  }
}


/* Message de fin de cours, qui reste affiché */
/* Dit d'où viennent les manœuvres du jour : entendues, ou cochées.
   Sans cette vérification, on ne sait pas si l'enregistrement a
   bien capté ce que le moniteur a dicté. */
function direOrigineManoeuvres(entendues){
  const zone = $('finEtat');
  if(!zone) return;

  const cochees = (typeof manoeuvresCocheesEnCours === 'function')
    ? manoeuvresCocheesEnCours() : [];
  const quest = (typeof contexteDepart !== 'undefined' && contexteDepart &&
                 contexteDepart.manoeuvresAjoutees) || [];

  const dites = (entendues || []).slice();
  const enPlus = cochees.filter(x => dites.indexOf(x) === -1);
  const questEnPlus = quest.filter(x => dites.indexOf(x) === -1 &&
                                        cochees.indexOf(x) === -1);

  if(!dites.length && !enPlus.length && !questEnPlus.length){
    zone.innerHTML = '';
    return;
  }

  const bouts = [];
  if(dites.length) bouts.push('🎙️ entendues : ' + dites.join(', '));
  if(enPlus.length) bouts.push('☑️ cochées en plus : ' + enPlus.join(', '));
  if(questEnPlus.length) bouts.push('📋 du questionnaire : ' + questEnPlus.join(', '));

  zone.style.color = 'var(--muted)';
  zone.innerHTML = '<div style="font-size:11px;line-height:1.6;">🦉 Fiche véhicule — ' +
    bouts.join('<br>') + '</div>';
}

function direEtatFin(texte, erreur){
  const z = $('finEtat');
  if(!z) return;
  if(!texte){ z.innerHTML = ''; return; }
  z.style.color = erreur ? 'var(--warn-text)' : 'var(--accent-text)';
  z.textContent = (erreur ? '⚠️ ' : '✅ ') + texte;
}


/* ============================================================
   CONFIRMATION DE FIN DE COURS
   Le bilan est parti : on le dit clairement, on rappelle où le
   coller, et on laisse le choix entre corriger et passer au
   cours suivant. Fermer sans choisir ne fait rien perdre.
   ============================================================ */
function confirmerFinDeCours(){
  const eleve = (currentLessonMeta && currentLessonMeta.studentName) || '';
  const f = (eleve && typeof ficheDe === 'function') ? ficheDe(eleve) : null;
  const mess = (f && f.messenger) || '';

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(480px, 94vw);';

  let lienMess = '';
  if(mess){
    let url = mess;
    if(!/^https?:\/\//i.test(mess)){
      url = 'https://m.me/' + mess.replace(/^@/, '').replace(/\s+/g, '');
    }
    lienMess =
      '<a href="' + url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener" ' +
      'class="btn btn-secondary" style="margin-top:10px;padding:13px;font-size:14px;' +
      'text-decoration:none;display:block;text-align:center;">' +
      '💬 Ouvrir le Messenger de ' + eleve.split(' ')[0] + '</a>';
  }

  boite.insertAdjacentHTML('beforeend',
    '<h3>✅ Bilan enregistré</h3>' +
    '<div style="font-size:15px;line-height:1.6;margin-bottom:6px;">' +
      'Le bilan de <strong>' + (eleve || 'cet élève').replace(/</g, '&lt;') +
      '</strong> est enregistré et <strong>copié</strong>.<br>' +
      'Tu peux le coller directement sur son Messenger.' +
    '</div>' +
    (mess
      ? '<div style="font-size:12px;color:var(--muted);line-height:1.5;">' +
        '💬 Son Messenger : <strong>' + mess.replace(/</g, '&lt;') + '</strong></div>' + lienMess
      : '<div style="font-size:12px;color:var(--warn-text);line-height:1.5;margin-top:6px;">' +
        "⚠️ Aucun Messenger enregistré pour cet élève. Pense à le saisir au " +
        'démarrage du prochain cours.</div>'));

  /* ------------------------------------------------------------
     LE BOUTON D'ENVOI EST TOUJOURS LÀ.

     Il n'apparaissait QUE si l'élève avait déjà une adresse sur sa
     fiche. Sinon : « l'envoi par mail n'est pas possible » — un
     cul-de-sac, en fin de cours, l'élève déjà reparti. Sept autres
     écrans savaient pourtant demander l'adresse et la ranger sur
     la fiche ; celui-ci, non.
     ------------------------------------------------------------ */
  const mails = (typeof adressesDuBilan === 'function')
    ? adressesDuBilan(eleve) : [];

  const bMail = document.createElement('button');
  bMail.className = 'btn btn-secondary';
  bMail.style.cssText = 'margin-top:10px;padding:13px;font-size:14px;';
  bMail.textContent = mails.length
    ? '✉️ Envoyer par mail (' + mails.length + ')'
    : '✉️ Envoyer par mail…';
  bMail.title = mails.length ? mails.join(' · ')
                             : "On te demandera son adresse";
  bMail.addEventListener('click', async () => {
    const libelle = bMail.textContent;
    bMail.disabled = true;
    bMail.textContent = 'Envoi…';
    try{
      const combien = await envoyerBilanParMail(eleve, $('lessonDate').value,
                                                $('resultText').value);
      if(!combien){
        /* Annulé à la fenêtre d'adresse : ce n'est pas un échec, et
           ça ne doit pas ressembler à un envoi. */
        bMail.disabled = false;
        bMail.textContent = libelle;
        return;
      }
      bMail.textContent = '✅ Envoyé à ' + combien + ' adresse(s)';
    }catch(e){
      bMail.textContent = '⚠️ Échec';
      bMail.disabled = false;
      /* Le détail sous le bouton : « HTTP 400 » seul n'aide personne */
      const d3 = document.createElement('div');
      d3.style.cssText = 'font-size:11px;color:var(--warn-text);margin-top:4px;' +
        'line-height:1.4;word-break:break-word;';
      d3.textContent = e.message;
      bMail.after(d3);
    }
  });
  boite.appendChild(bMail);

  const d2 = document.createElement('div');
  d2.style.cssText = 'font-size:11px;color:var(--muted);margin-top:4px;line-height:1.4;';
  d2.textContent = mails.length
    ? mails.join(' · ')
    : "Aucune adresse sur sa fiche : on te la demandera, et elle y sera " +
      'rangée pour la prochaine fois.';
  boite.appendChild(d2);

  const r = document.createElement('div');
  r.className = 'btn-row';
  r.style.marginTop = '16px';

  const bMod = document.createElement('button');
  bMod.className = 'btn btn-secondary';
  bMod.textContent = '✏️ Modifier ce bilan';
  bMod.addEventListener('click', () => {
    document.body.removeChild(fond);
    /* On reste sur le bilan : le corriger le mettra à jour en place */
    if($('resultText')) $('resultText').focus();
  });

  const bFin = document.createElement('button');
  bFin.className = 'btn btn-primary';
  bFin.textContent = '🏠 Accueil';
  bFin.addEventListener('click', () => {
    document.body.removeChild(fond);
    if(typeof terminerCours === 'function') terminerCours();
  });

  r.appendChild(bMod);
  r.appendChild(bFin);
  boite.appendChild(r);

  fond.appendChild(boite);
  document.body.appendChild(fond);
}

function marquerExport(ok){
  bilanEnregistre = !!ok;
  const b = $('exportEtat');
  const btn = $('exportSheetsBtn');
  if(!b) return;
  if(ok){
    b.style.display = 'block';
    b.style.background = 'rgba(182,255,14,.12)';
    b.style.borderColor = 'var(--orange)';
    b.style.color = 'var(--accent-text)';
    b.textContent = '✅ Bilan enregistré dans Sheets — le prochain moniteur y aura accès.';
    if(btn) btn.textContent = '📊 Réenregistrer (après modification)';
  }else{
    b.style.display = 'block';
    b.style.background = 'var(--warn-bg)';
    b.style.borderColor = 'var(--red)';
    b.style.color = 'var(--warn-text)';
    b.textContent = "📋 Relis et complète le bilan, puis appuie sur « Copier et enregistrer » : il sera copié pour Messenger et enregistré dans Sheets.";
    if(btn) btn.textContent = '📊 Enregistrer sans copier';
  }
}


/* Liste des moniteurs actifs — noms seuls, sans les codes */
/* moniteursActifs : déclaré dans ec-etat.js */

async function chargerMoniteurs(){
  try{
    const r = await fetchFiable(CONFIG.MONITEURS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: ACCES.code })
    });
    if(!r.ok) return;
    const data = await r.json().catch(() => ({}));
    moniteursActifs = (data && data.moniteurs) || [];
    const sel = $('searchMoniteur');
    if(sel){
      const choix = sel.value;
      sel.innerHTML = '<option value="">Tous les moniteurs</option>';
      moniteursActifs.forEach(n => {
        const o = document.createElement('option');
        o.value = n; o.textContent = n;
        sel.appendChild(o);
      });
      sel.value = choix;
    }

    /* Tout ce qui affiche la liste des moniteurs se remet à jour ici,
       au moment où elle arrive. « Pour quel moniteur » n'était rempli
       qu'une fois, au chargement de la page — donc avant l'ouverture
       de session, quand la liste était encore vide. Le menu restait
       vide pour le reste de la journée. */
    if(typeof poserMoniteursDansPourQui === 'function'){
      poserMoniteursDansPourQui();
    }
  }catch(e){
    console.warn('Liste des moniteurs indisponible :', e);
  }
}

/* Petite fenêtre de choix dans une liste */
function choisirDansListe(titre, options, valeurActuelle){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.maxWidth = '340px';

    const h = document.createElement('h3');
    h.textContent = titre;
    boite.appendChild(h);

    const sel = document.createElement('select');
    sel.style.fontSize = '16px';
    if(!options.length){
      const o = document.createElement('option');
      o.value = ''; o.textContent = '(aucun moniteur trouvé)';
      sel.appendChild(o);
    }
    options.forEach(nom => {
      const o = document.createElement('option');
      o.value = nom; o.textContent = nom;
      sel.appendChild(o);
    });
    if(valeurActuelle && options.indexOf(valeurActuelle) !== -1) sel.value = valeurActuelle;
    boite.appendChild(sel);

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

    const fermer = v => { document.body.removeChild(fond); resolve(v); };
    annuler.addEventListener('click', () => fermer(null));
    valider.addEventListener('click', () => fermer(sel.value || null));
    fond.addEventListener('click', e => { if(e.target === fond) fermer(null); });
  });
}


/* Compteur affiché dans l'en-tête d'un tiroir */
function majCompteur(id, valeur){
  const el = $(id);
  if(el) el.textContent = valeur ? String(valeur) : '';
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-vocal.js'] = true;
