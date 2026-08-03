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

function normaliserMot(s){
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
const LEXIQUE_NORM = LEXIQUE.map(normaliserMot);

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
  [/\bangle m[oô]r\b/gi, 'angle mort'],
  [/\bs[ée]dez le passage\b/gi, 'cédez le passage'],
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
    const re = new RegExp('([a-zà-ÿ0-9])\\s+(' + mot + ')\\b', 'gi');
    t = t.replace(re, '$1, $2');
  });
  return t;
}

function majusculer(texte){
  return String(texte || '').replace(
    /(^|[.!?…]\s+)([a-zà-ÿ])/g,
    (m, avant, lettre) => avant + lettre.toUpperCase()
  );
}

function mettreEnForme(texte){
  return majusculer(poserVirgules(String(texte || '').replace(/\s+/g, ' ').trim()));
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
    const sessionText = corrigerVocabulaire(fusionner(chunks));
    finalTranscript = mettreEnForme(fusionner([committedTranscript, sessionText]));
    if(sessionText) dernierMot = Date.now();
    marquerActif('résultat reçu');

    const box = $('transcriptBox');
    box.value = finalTranscript;
    box.scrollTop = box.scrollHeight;
    $('compteur').textContent = finalTranscript.trim().split(/\s+/).filter(Boolean).length + ' mots';
    sauvegarderLocal();
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
    if(zone) zone.value = finalTranscript;
    relancerMicro();
  };

  return r;
}

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

  /* Questionnaire au tout début du cours seulement.
     Évaluation et examen : rien à demander avant, tout se décide après. */
  const profilDepart = profilQuestionnaire($('modele').value);
  if(!finalTranscript && !contexteDepart && profilDepart !== 'evaluation' && profilDepart !== 'examen'){
    btn.disabled = true;
    btn.textContent = 'Préparation…';
    try{
      const rep = await ouvrirQuestionnaireDepart(null, 'Avant de démarrer');
      if(rep){
        contexteDepart = rep;
        appliquerNoteQuestionnaire(noteDepuisQuestionnaire(rep));
      }
    }finally{
      btn.disabled = false;
      btn.textContent = '🎙️ Démarrer le cours';
    }
  }

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
  const oldDetail = $('genErrorDetail');
  if(oldDetail) oldDetail.remove();

  try{
    /* Modèle Conduite : on reprend les manœuvres validées les cours précédents */
    let manoeuvresAvant = [];
    let coursCorrige = finalTranscript;

    if(modele.schema === 'conduiteResume'){
      manoeuvresAvant = await manoeuvresAnterieures(studentName);

      /* Remise au propre du cours, par tranches */
      coursCorrige = await corrigerCours(finalTranscript, (n, total, essai) => {
        let msg = total > 1
          ? 'Correction du cours — partie ' + n + ' sur ' + total + '…'
          : 'Correction du cours…';
        if(essai && essai > 1) msg += ' (nouvelle tentative ' + essai + ')';
        $('progressionGen').textContent = msg;
      });
      $('progressionGen').textContent = 'Rédaction du résumé…';
    }

    const donnees = await appelIA(modeleCle, coursCorrige, studentName, monitorName, site, dateStr);
    let bilan = modele.build(donnees, {
      manoeuvresAvant: manoeuvresAvant,
      transcript: coursCorrige,
      note: $('noteInterne').value.trim()
    });
    if(monitorName) bilan += '\n\n' + monitorName + ' 🚗💨';
    $('resultText').value = bilan;
    afficherNote(currentLessonMeta.noteInterne);   /* reprend celle saisie avant le cours */
    if(dernierEchecCorrection){
      const detail = dernierEchecCorrection
        .map(e => 'partie ' + e.n + ' (' + e.motif + ')').join(', ');
      await informer('⚠️ Correction incomplète\n\n' + detail + '\n\n' +
            'Le texte brut a été conservé pour ces passages : rien n\'est perdu, ' +
            'mais ils ne sont pas corrigés. Relis-les avant d\'envoyer.');
    }
    sauvegarderLocal(true);
    /* Le cours est fait : sa préparation sort de la liste */
    retirerPreparationFaite();
    $('generatingView').style.display = 'none';
    $('resultView').style.display = 'block';
    window.scrollTo(0, 0);
    marquerExport(false);
    await saveLesson(currentLessonMeta, bilan);
    await refreshHistory();
  }catch(err){
    console.error('Erreur génération bilan:', err);
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
const TAILLE_TRANCHE = 2500;   /* caractères — tranches courtes = corrections fiables */

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
async function corrigerCours(transcript, surProgres){
  const tranches = decouperEnTranches(transcript, TAILLE_TRANCHE);
  if(!tranches.length) return '';
  const corrigees = [];

  const echecs = [];

  for(let i = 0; i < tranches.length; i++){
    if(surProgres) surProgres(i + 1, tranches.length);
    const contexte = tranches.length > 1
      ? '\n\n(Partie ' + (i + 1) + ' sur ' + tranches.length +
        ' d\'un même cours : ne réintroduis aucune introduction ni conclusion.)'
      : '';

    let obtenu = '';
    let derniereErreur = null;

    /* Jusqu'à 3 tentatives : un échec ponctuel ne doit pas laisser
       une partie du cours en texte brut. */
    for(let essai = 1; essai <= 3 && !obtenu; essai++){
      try{
        if(essai > 1){
          if(surProgres) surProgres(i + 1, tranches.length, essai);
          await new Promise(r => setTimeout(r, 1500 * essai));
        }
        const txt = await appelBrutIA(CONSIGNE_CORRECTION + contexte, tranches[i], 8000);
        const propre = (txt || '').trim();

        /* Une correction fait forcément une longueur comparable à
           l'original : trop court = réponse tronquée. */
        if(!propre){
          derniereErreur = new Error('réponse vide');
        }else if(propre.length < tranches[i].length * 0.75){
          derniereErreur = new Error('réponse tronquée (' +
            Math.round(propre.length / tranches[i].length * 100) + '% de l\'original)');
        }else if(!finDePhrase(propre)){
          /* Une correction complète se termine proprement */
          derniereErreur = new Error('réponse coupée en pleine phrase');
        }else{
          obtenu = propre;
        }
      }catch(e){
        derniereErreur = e;
        console.warn('Tranche ' + (i + 1) + ', essai ' + essai + ' :', e);
      }
    }

    /* Petite pause entre les tranches : évite les rejets pour cadence */
    if(i < tranches.length - 1) await new Promise(r => setTimeout(r, 400));

    if(obtenu){
      corrigees.push(obtenu);
    }else{
      echecs.push({ n: i + 1, motif: derniereErreur ? derniereErreur.message : 'inconnu' });
      corrigees.push(tranches[i]);      /* on garde le brut plutôt que de perdre le passage */
    }
  }

  if(echecs.length){
    /* On ne masque plus l'échec : le moniteur doit savoir que
       certaines parties sont restées non corrigées. */
    dernierEchecCorrection = echecs;
  }else{
    dernierEchecCorrection = null;
  }

  return corrigees.join('\n\n');
}

/* dernierEchecCorrection : déclaré dans ec-etat.js */


/* Répare les JSON contenant des retours à la ligne bruts dans les
   chaînes : c'est le défaut le plus fréquent des réponses longues. */
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
async function appelBrutIA(systemPrompt, message, maxTokens){
  const r = await fetch(CONFIG.IA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: ACCES.code,
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

async function manoeuvresAnterieures(nomEleve){
  if(!nomEleve || nomEleve.length < 2) return [];
  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nomEleve, leger: true })
    });
    if(!r.ok) return [];
    const data = await r.json();
    if(!verifierVersionScript(data)){
      zone.innerHTML = '<div class="empty">Script Google à mettre à jour (voir le message).</div>';
      return;
    }
    const res = (data && data.resultats) || [];
    const cumul = [];
    res.forEach(item => {
      manoeuvresDejaFaites(item.bilan).forEach(m => {
        if(cumul.indexOf(m) === -1) cumul.push(m);
      });
    });
    return cumul;
  }catch(e){
    console.warn('Manœuvres antérieures indisponibles :', e);
    return [];   /* on continue sans, plutôt que de bloquer le bilan */
  }
}

async function appelIA(modeleCle, transcript, studentName, monitorName, site, dateStr){
  const systemPrompt = construireConsignes(modeleCle);
  const userMsg = 'Type de bilan : ' + MODELES[modeleCle].label + '\n' +
    'Moniteur : ' + (monitorName || 'non renseigné') + '\n' +
    'Élève : ' + studentName + '\n' +
    'Site : ' + site + '\n' +
    'Date : ' + dateStr + '\n\n' +
    'Transcription brute du cours :\n"""\n' + transcript + '\n"""';

  const response = await fetch(CONFIG.IA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: ACCES.code,
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
  const fin = brut.lastIndexOf('}');
  if(debut === -1 || fin === -1) throw new Error('Réponse non exploitable : ' + brut.slice(0, 200));

  const corps = brut.slice(debut, fin + 1);

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

  try{
    return nettoyerRetours(JSON.parse(corps));
  }catch(e){
    /* Deuxième chance : on échappe les retours à la ligne bruts */
    try{
      return nettoyerRetours(JSON.parse(reparerJson(corps)));
    }catch(e2){
      if(data.stop_reason === 'max_tokens'){
        throw new Error('Réponse coupée en cours de route : le cours est trop long. Découpe-le en deux bilans.');
      }
      throw new Error('JSON illisible : ' + e.message + ' — début reçu : ' + brut.slice(0, 120));
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
$('copyBtn').addEventListener('click', async () => {
  const ta = $('resultText');
  ta.select();

  /* 1. La copie d'abord : c'est ce que le moniteur attend immédiatement */
  try{
    await navigator.clipboard.writeText(ta.value);
  }catch(e){
    try{ document.execCommand('copy'); }catch(_){}
  }

  /* 2. Puis l'enregistrement de la version relue et corrigée */
  if(bilanEnregistre){
    showToast('Bilan copié ✅');
    return;
  }
  showToast('Bilan copié ✅ — enregistrement…');
  const ok = await exporterVersSheets(true);
  if(!ok){
    showToast("⚠️ Copié, mais NON enregistré dans Sheets");
  }
});

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
        data: {
          date: currentLessonMeta ? (currentLessonMeta.dateCourte || currentLessonMeta.dateStr) : '',
          site: currentLessonMeta ? currentLessonMeta.site : '',
          monitorName: currentLessonMeta ? currentLessonMeta.monitorName : '',
          studentName: currentLessonMeta ? currentLessonMeta.studentName : '',
          typeBilan: currentLessonMeta ? currentLessonMeta.modeleLabel : '',
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
    if(!verifierVersionScript(rep)){ marquerExport(false); return false; }
    const avecNote = $('noteResult').value.trim();
    showToast(avecNote ? 'Enregistré avec la note 📌 ✅' : 'Enregistré dans Sheets ✅');
    marquerExport(true);
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


/* ---------- Tiroirs : mémorisation de ce qui est ouvert ---------- */
const CLE_TIROIRS = 'tiroirs_ouverts';

function lireTiroirs(){
  try{
    const b = localStorage.getItem(CLE_TIROIRS);
    const l = b ? JSON.parse(b) : null;
    return Array.isArray(l) ? l : null;
  }catch(e){ return null; }
}

function ecrireTiroirs(){
  try{
    const ouverts = [];
    document.querySelectorAll('[data-tiroir]').forEach(d => {
      if(d.open) ouverts.push(d.getAttribute('data-tiroir'));
    });
    localStorage.setItem(CLE_TIROIRS, JSON.stringify(ouverts));
  }catch(e){}
}

function initTiroirs(){
  const memo = lireTiroirs();
  document.querySelectorAll('[data-tiroir]').forEach(d => {
    const cle = d.getAttribute('data-tiroir');
    if(memo){
      d.open = (memo.indexOf(cle) !== -1);
    }else{
      /* Premier lancement : seuls les cours préparés sont ouverts */
      d.open = (cle === 'prepares');
    }
    d.addEventListener('toggle', () => {
      ecrireTiroirs();
      /* On ne charge le suivi bureau qu'à sa première ouverture */
      if((cle === 'bureau' || cle === 'permisbureau') && d.open && !bureauDejaCharge){
        afficherBureau();
      }
      if(cle === 'messages' && d.open) afficherConsignesEnAttente();
      /* Les cours préparés changent souvent : on relit à chaque ouverture */
      if(cle === 'prepares' && d.open && aDroit('cours')) afficherPrepares(true, true);
      if(cle === 'journal' && d.open && ACCES.role === 'admin') afficherJournal();
      if(cle === 'permisbureau' && d.open) afficherMessengerPermis();
      if(cle === 'textes' && d.open) afficherModelesTexte();
      if(cle === 'procedures' && d.open) afficherProcedures();
      if(cle === 'bilans' && d.open) afficherTextesBilan();
    });
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
