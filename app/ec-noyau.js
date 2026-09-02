/* Déployé le 02/09/2026 à 13:15 — v807 */
/* ============================================================
   ec-noyau.js
   Configuration, session, droits, utilitaires communs
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   APPLICATION
   ============================================================ */
const CONFIG = {
  WORKER_URL: 'https://bilan-proxy.evolutionconduites.workers.dev'
};
CONFIG.AUTH_URL = CONFIG.WORKER_URL + '/auth';
CONFIG.SMS_URL = CONFIG.WORKER_URL + '/sms';
CONFIG.IA_URL = CONFIG.WORKER_URL + '/ia';
CONFIG.SHEETS_PROXY_URL = CONFIG.WORKER_URL + '/sheets';
CONFIG.ADMIN_URL = CONFIG.WORKER_URL + '/admin';
CONFIG.MONITEURS_URL = CONFIG.WORKER_URL + '/moniteurs';
CONFIG.VERSION_SCRIPT_ATTENDUE = 189;   /* voir apps-script.js */

/* L'adresse de la page publique d'un cours, déduite de celle de
   l'application : elle vit dans le même dossier. Écrire l'adresse
   en dur ici casserait les liens le jour d'un déménagement. */
CONFIG.LIEN_COURS = location.origin +
  location.pathname.replace(/[^/]*$/, '') + 'cours.html';

/* Code d'accès de la session. Mémorisé dans ce téléphone pour ne pas
   le redemander à chaque rafraîchissement, avec une durée de validité. */
const CLE_SESSION = 'session_acces';
/* 48 heures sans se servir de l'application. L'horodatage se
   rafraîchit à chaque usage : c'est bien une inactivité, pas une
   durée de vie fixe. */
const DUREE_SESSION = 48 * 3600 * 1000;

/* ACCES : déclaré dans ec-etat.js */

/* Sections de l'application soumises à autorisation */
const SECTIONS = [
  { cle:'prepares',         nom:'📅 Mes prochains cours' },
  { cle:'cours',            nom:'🎙️ Cours, enregistrement et bilan' },
  { cle:'recherche',        nom:'🔍 Recherche d\'élève' },
  { cle:'bureau_simu',      nom:'🌙 Simulateurs nuit et risques' },
  { cle:'bureau_examblanc', nom:'📝 Examens blancs à prévoir' },
  /* SON PROPRE DROIT, ET PAS CELUI DES EXAMENS BLANCS.

     Les deux suivis y étaient accrochés : un droit nommé « Examens
     blancs à prévoir » ouvrait trois écrans, et on ne pouvait ni
     donner les suivis sans les examens blancs, ni l'inverse. Un
     droit qui n'ouvre pas ce que son nom annonce, on ne peut plus
     s'en servir pour décider. */
  { cle:'suivi_aac_cs',     nom:'🤝 Suivi AAC et conduite supervisée' },
  { cle:'ecoutes',          nom:'👂 Écoutes pédagogiques' },
  { cle:'bureau_places',    nom:'📊 Réglage des places d\'examen' },
  { cle:'bureau_permis',    nom:'🚗 Suivi permis (listes et message Messenger)' },
  { cle:'bureau_messages',  nom:'📨 Messages aux moniteurs' },
  { cle:'permis',           nom:'🎓 Élève ayant obtenu son permis' },
  { cle:'textes',           nom:'📄 Mes modèles de message' },
  { cle:'stats',            nom:'📈 Taux de réussite' },
  { cle:'eleves',           nom:'👥 Répertoire des élèves' },
  { cle:'proccorriger',     nom:'📥 Procédures à corriger' },
  { cle:'code',             nom:'🎓 Code (salle et aménagé)' },
  { cle:'handicap',         nom:'♿ Suivi handicap' },
  { cle:'paiement',         nom:'💳 Paiement en plusieurs fois' },
  { cle:'placesbe',         nom:'🚚 Demande de places BE' },
  { cle:'evaluation',       nom:'📊 Évaluation de départ' },
  { cle:'tarifs',           nom:'💰 Prestations et tarifs' },
  { cle:'financements',     nom:'💶 Financements extérieurs' },
  { cle:'rappels',          nom:'🔔 Rappels de cours par mail' },
  /* L'envoi de SMS est facturé au segment : il se donne à part,
     et sciemment, plutôt que de suivre le droit aux rappels. */
  { cle:'sms',              nom:'💬 Envoi de SMS (facturé)' },
  { cle:'paie',             nom:'💶 Éléments de paie' },
  { cle:'flotte',           nom:'🚗 Suivi de la flotte' },
  { cle:'ecran',            nom:'📺 Affichage dynamique' },
  { cle:'notifs',           nom:'🔔 Alertes du bureau' },
  { cle:'notif_examblanc',  nom:'🔔 Pastille examens blancs' },
  { cle:'notif_simu',       nom:'🔔 Pastille simulateurs' },
  { cle:'notif_permis',     nom:'🔔 Pastille dates de permis' },
  { cle:'taches',           nom:'✅ Tâches du bureau' },
  { cle:'memoire',          nom:"🧠 Mémoire de l'IA" },
  { cle:'bilans',           nom:'📋 Modèles de bilan' },
  { cle:'procedures',       nom:'🚦 Procédures de conduite' },
  { cle:'depart',           nom:'🚪 Départ de l\'auto-école' },
  /* CES QUATRE-LÀ N'ÉTAIENT PAS DONNABLES.

     Ils existaient comme écrans sans exister comme droits : on les
     réservait aux administratrices, faute de pouvoir les cocher.
     C'était un contournement du piège de la v744 — un écran neuf
     est absent des droits déjà enregistrés, et absent veut dire
     refusé. Le piège est traité à la racine côté Worker
     (VERSION_SECTIONS) : ils redeviennent des sections ordinaires,
     et le contournement n'a plus lieu d'être. */
  { cle:'caisse',           nom:'🏦 Caisse et remises en banque' },
  { cle:'coutsia',          nom:"💸 Ce que coûte l'IA" },
  { cle:'encours',          nom:'🩹 Cours non terminés (tous moniteurs)' },
  { cle:'incidents',        nom:'🚨 Signalements' },
  { cle:'menage',           nom:'🧹 Ménage des dossiers' },
  { cle:'admin',            nom:'⚙️ Administration des accès' }
];

/* ------------------------------------------------------------
   NIVEAU D'ACCÈS : 'm' modifier, 'v' voir, '' rien

   IL Y AVAIT ICI UN PIÈGE, ET IL SE REFERMAIT SUR CELUI QUI
   VOULAIT BIEN FAIRE.

   « Aucun droit coché » rendait 'm' — c'est-à-dire TOUT. Le geste
   le plus naturel pour restreindre un compte produisait donc
   exactement l'inverse, pendant que la fenêtre d'administration
   affirmait « elle ne verra que l'écran d'accueil ».

   Le serveur, lui, savait déjà distinguer « jamais réglé » de
   « réglé à vide » : il garde `droitsRegles`. Il ne l'envoyait
   simplement pas jusqu'ici. Maintenant si.

   Et le repli disparaît complètement : un jeu de droits vide veut
   dire vide. Si les droits n'arrivaient pas, l'écran se
   viderait — c'est une panne visible, alors que l'ancien défaut
   ouvrait tout en silence. Entre les deux, il n'y a pas à
   hésiter.
   ------------------------------------------------------------ */
function niveauDroit(section){
  const d = ACCES.droits;
  if(!d) return '';
  return d[section] || '';
}
function aDroit(section){ return niveauDroit(section) !== ''; }
function peutModifier(section){ return niveauDroit(section) === 'm'; }

/* ------------------------------------------------------------
   UNE CARTE A-T-ELLE LE DROIT DE S'AFFICHER

   Écrite ici, et pas deux fois : « appliquerDroits » masquait
   selon le droit, puis « afficherVue » rallumait la carte de la
   vue choisie SANS le redemander. Les deux ne pouvaient que finir
   par se contredire — c'est déjà arrivé cinq fois cette semaine
   sur d'autres sujets.

   « bureau » n'est pas une section : c'est une carte qui vit tant
   qu'une de ses parties vit. */
function sectionVisible(s){
  if(!s) return true;
  if(s === 'bureau') return ['bureau_simu', 'bureau_examblanc'].some(aDroit);
  return aDroit(s);
}

/* Masque ou passe en lecture seule selon le niveau accordé */
function appliquerDroits(){
  document.querySelectorAll('[data-section]').forEach(el => {
    const s = el.getAttribute('data-section');
    const visible = sectionVisible(s);
    /* Une vue non sélectionnée reste masquée : les onglets décident */
    if(visible && el.classList.contains('hors-vue')) el.style.display = 'none';
    else el.style.display = visible ? '' : 'none';
    el.classList.toggle('lecture-seule', visible && s !== 'bureau' && !peutModifier(s));
  });

  /* Le départ d'un élève ne concerne que le bureau */
  const bd = document.querySelector('[data-vue="depart"]');
  if(bd){
    bd.style.display = (aDroit('depart') && (ACCES.role === 'bureau' || ACCES.role === 'admin'))
      ? '' : 'none';
  }

  /* Le journal d'activité n'est visible que des administrateurs */
  const jc = $('journalCard');
  if(jc) jc.style.display = (ACCES.role === 'admin') ? '' : 'none';

  if($('resultView') && !aDroit('cours')) $('resultView').style.display = 'none';
  $('adminCard').style.display = (aDroit('admin') && ACCES.role === 'admin') ? 'block' : 'none';
}

function memoriserSession(code, moniteur, role, droits, emoji, genre, regles){
  try{
    localStorage.setItem(CLE_SESSION, JSON.stringify({
      code: code, moniteur: moniteur, role: role,
      emoji: emoji || '', genre: genre || '', droits: droits || {},
      droitsRegles: !!regles, ts: Date.now()
    }));
  }catch(e){}
}

function lireSession(){
  try{
    const brut = localStorage.getItem(CLE_SESSION);
    if(!brut) return null;
    const s = JSON.parse(brut);
    if(!s || !s.code) return null;

    if(Date.now() - (s.ts || 0) > DUREE_SESSION){
      oublierSession();
      raisonDeconnexion = 'inactivite';
      return null;
    }

    /* La coupure du samedi soir : chacun repart de zéro la semaine
       suivante, et un appareil oublié quelque part ne reste pas
       ouvert indéfiniment. */
    if(coupureHebdoDepassee(s.ts)){
      oublierSession();
      raisonDeconnexion = 'hebdo';
      return null;
    }

    /* UNE SESSION D'AVANT LA CORRECTION DES DROITS NE SE REPREND
       PAS.

       Elle a été rangée quand « aucun droit » voulait dire « tous
       les droits », et ses droits mémorisés peuvent être un
       tableau vide — l'ancienne forme. Repris tels quels, ils
       donneraient un écran vide au premier moniteur hors ligne, et
       il croirait à une panne. Une reconnexion, une fois, et tout
       repart du serveur. */
    if(s.droitsRegles === undefined ||
       !s.droits || typeof s.droits !== 'object' || Array.isArray(s.droits)){
      oublierSession();
      raisonDeconnexion = 'droits';
      return null;
    }

    return s;
  }catch(e){ return null; }
}

/* Pourquoi la session a été fermée : le dire évite de croire à un
   défaut. */
let raisonDeconnexion = '';

/* Le samedi 21 h est-il passé depuis cette connexion ? */
function coupureHebdoDepassee(ts){
  if(!ts) return false;

  const depuis = new Date(ts);
  const maintenant = new Date();

  /* La dernière coupure : le samedi 21 h le plus récent */
  const coupure = new Date(maintenant);
  coupure.setHours(21, 0, 0, 0);
  /* 6 = samedi */
  const recul = (coupure.getDay() - 6 + 7) % 7;
  coupure.setDate(coupure.getDate() - recul);
  if(coupure > maintenant) coupure.setDate(coupure.getDate() - 7);

  return depuis < coupure;
}

/* L'horodatage se rafraîchit tant qu'on se sert de l'application */
function rafraichirSession(){
  try{
    const brut = localStorage.getItem(CLE_SESSION);
    if(!brut) return;
    const s = JSON.parse(brut);
    if(!s || !s.code) return;
    s.ts = Date.now();
    localStorage.setItem(CLE_SESSION, JSON.stringify(s));
  }catch(e){}
}

/* ------------------------------------------------------------
   SE DÉCONNECTER, C'EST AUSSI VIDER L'APPAREIL

   Ceci n'effaçait qu'une clé : celle de la session. Restaient
   derrière, indéfiniment et sans aucun code pour les lire : la
   liste complète des noms de TOUS les élèves, la transcription
   intégrale du dernier cours, les fiches manuelles en attente, le
   cache des cours préparés. Un téléphone rendu, perdu ou porté en
   réparation les livrait tels quels.

   DEUX FAMILLES, ET ON NE LES TRAITE PAS PAREIL.

   Les LISTES sont des copies de ce que le serveur sait déjà : les
   effacer ne coûte rien à personne, et c'est la plus grosse
   exposition. Elles partent à chaque fermeture de session, y
   compris automatique.

   Le TRAVAIL — un bilan dicté, une fiche d'examen remplie — n'a
   parfois pas d'autre exemplaire. L'effacer sur une coupure de 48 h
   ou du samedi soir, c'est-à-dire sans que personne l'ait demandé,
   détruirait le travail de quelqu'un. Il ne part donc QUE sur une
   déconnexion voulue, et seulement après l'avoir dit.

   Ce qui reste dans tous les cas : le thème, l'onglet ouvert, les
   lieux, les formations, le taux de change. Aucune donnée d'élève,
   et les effacer ne ferait que tout reconfigurer à chaque reprise.
   ------------------------------------------------------------ */
const CLES_LISTES = [
  'session_acces',            /* la session elle-même */
  'eleves_connus',            /* tous les noms d'élèves */
  'cache_prepares'            /* les cours préparés : élèves, horaires */
];

const CLES_TRAVAIL = [
  'bilan_en_cours',           /* nom, note interne, transcription */
  'bilan_manuel_en_cours',
  'bilans_manuels',           /* les douze fiches gardées */
  'ec_groupes_simu',          /* une séance à plusieurs en cours */
  'ec_postes_simu'
];

/* ------------------------------------------------------------
   ÉCHAPPER, UNE FOIS POUR TOUTES

   Le fichier comptait environ deux cents « .replace(/</g,'&lt;') »
   recopiés à la main. Un taux d'oubli d'un sur deux cents est
   normal ; le défaut, c'est de l'avoir recopié deux cents fois.

   L'oubli trouvé était le pire possible : le champ « version »
   d'un signalement, seul non échappé au milieu de cinq voisins qui
   l'étaient — et il s'affiche dans la session ADMINISTRATRICE,
   celle qui porte le code d'accès.

   Les guillemets aussi : « &lt; » seul suffit dans le corps d'une
   balise, pas dans un attribut.
   ------------------------------------------------------------ */
function echapper(v){
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function retirerCles(liste){
  liste.forEach(cle => {
    try{ localStorage.removeItem(cle); }catch(e){}
  });
}

function oublierSession(){ retirerCles(CLES_LISTES); }

/* Le travail non terminé. Appelé par le bouton « Se déconnecter »,
   et par lui seul. */
function oublierLeTravail(){ retirerCles(CLES_TRAVAIL); }

/* Y a-t-il quelque chose à perdre ? On le demande avant d'effacer :
   un moniteur qui rend son téléphone doit pouvoir finir d'abord. */
function travailNonTermine(){
  let n = 0;
  CLES_TRAVAIL.forEach(cle => {
    try{
      const v = localStorage.getItem(cle);
      if(v && v !== '[]' && v !== '{}' && v !== 'null') n++;
    }catch(e){}
  });
  return n;
}

function verrouiller(message, garderSession){
  clearInterval(minuteurBureau);
  bureauDejaCharge = false;
  if(!garderSession) oublierSession();
  ACCES = { code: null, moniteur: '', role: '', droits: [] };
  $('appView').style.display = 'none';
  $('adminCard').style.display = 'none';
  if($('logoutBtn')) $('logoutBtn').style.display = 'none';
  if($('versionBtn')) $('versionBtn').style.display = 'none';
  if($('guideBtn')) $('guideBtn').style.display = 'none';
  if($('qui')) $('qui').style.display = 'none';
  /* Le raccourci des procédures compte le travail de quelqu'un :
     il ne reste pas affiché sur l'écran de connexion. */
  if($('procRaccourci')) $('procRaccourci').style.display = 'none';
  /* La loupe cherche parmi les élèves : elle n'a rien à faire sur
     l'écran de connexion. Le ⋯ reste, lui : il porte le thème. */
  if($('loupeBtn')) $('loupeBtn').style.display = 'none';
  if($('plusMenu')) $('plusMenu').style.display = 'none';

  /* Rien d'autre que le code d'accès sur l'écran de connexion */
  if($('barreOnglets')) $('barreOnglets').style.display = 'none';
  document.querySelectorAll('.barre-vues').forEach(b => { b.style.display = 'none'; });
  document.body.classList.remove('avec-onglets');
  $('lockView').style.display = 'block';
  $('codeInput').value = '';
  if($('identInput')) $('identInput').value = '';
  $('codeMsg').textContent = message || '';
  $('codeMsg').style.color = message ? 'var(--warn-text)' : 'var(--muted)';
}

/* $ est déclaré dans ec-etat.js, chargé en premier. */

function todayLocal(){
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

/* recognition : déclaré dans ec-etat.js */
/* isRecording : déclaré dans ec-etat.js */
/* finalTranscript : déclaré dans ec-etat.js */
/* currentLessonMeta : déclaré dans ec-etat.js */

/* Texte des sessions déjà terminées (le micro redémarre régulièrement) */
/* committedTranscript : déclaré dans ec-etat.js */

/* Contrôles préalables — sans toucher au micro :
   sur Android, ouvrir puis fermer le micro juste avant la dictée
   empêche la reconnaissance de capter le son. */
/* Contexte requis pour ENREGISTRER un cours (micro nécessaire) */
function verifierContexte(){
  if(!window.isSecureContext){
    return 'La page doit être ouverte en https:// pour accéder au micro.';
  }
  if(!SR){
    return 'Reconnaissance vocale indisponible. Utilise Chrome sur Android.';
  }
  return verifierEleve();
}

/* Sans élève identifié, le bilan ne peut être rattaché à personne */
function verifierEleve(){
  const nom = $('studentName').value.trim();
  if(nom.length < 2) return "Saisis le nom et le prénom de l'élève avant de démarrer.";
  if(nom.split(/\s+/).length < 2) return "Il faut le nom ET le prénom de l'élève.";
  if(!$('modele').value) return 'Choisis un type de bilan.';
  if(!$('lessonDate').value) return 'Choisis la date du cours.';
  return null;
}

/* Contexte requis pour un bilan à remplir à la main : aucun micro,
   donc rien n'empêche de s'en servir sur n'importe quel navigateur. */
function verifierContexteManuel(){
  return verifierEleve();
}

/* Démarre la reconnaissance. sessionActive n'est JAMAIS forcé ici :
   seul l'événement onstart fait foi, sinon l'indicateur ment. */
function demarrerReconnaissance(){
  /* On repart systématiquement d'un objet neuf : évite d'hériter
     d'une session figée par un cours précédent. */
  try{
    recreerEtDemarrer();
    return { ok: true };
  }catch(e){
    return { ok: false, message: (e && e.name ? e.name + ' — ' : '') + (e && e.message ? e.message : String(e)) };
  }
}

/* Maintien de l'écran allumé : Chrome coupe le micro dès que
   l'écran s'éteint ou que la page passe en arrière-plan. */
/* wakeLock : déclaré dans ec-etat.js */
/* interruptions : déclaré dans ec-etat.js */

/* Vrai uniquement quand une session de reconnaissance tourne réellement.
   Chrome peut la tuer sans prévenir : on ne se fie pas à isRecording seul. */
/* sessionActive : déclaré dans ec-etat.js */
/* demarrageEnCours : déclaré dans ec-etat.js */
/* dernierMot : déclaré dans ec-etat.js */
/* dernierEvenement : déclaré dans ec-etat.js */

function marquerActif(nomEvenement){
  sessionActive = true;
  demarrageEnCours = false;
  dernierEvenement = nomEvenement;
}

function relancerMicro(){
  if(!isRecording || sessionActive || demarrageEnCours) return;
  demarrageEnCours = true;
  dernierEvenement = 'start()';

  if(!recognition){
    recreerEtDemarrer();
    setTimeout(() => { demarrageEnCours = false; }, 1500);
    return;
  }

  try{
    recognition.start();
  }catch(e){
    const nom = String(e && e.name || '');
    if(nom === 'InvalidStateError'){
      /* Session fantôme : elle se croit démarrée mais n'émet plus rien.
         On ne la réanime pas, on la remplace. */
      dernierEvenement = 'session figée → recréation';
      recreerEtDemarrer();
    }else{
      dernierEvenement = 'start refusé: ' + (nom || e);
    }
  }
  /* Laisse à Chrome le temps d'ouvrir la session avant tout nouvel essai */
  setTimeout(() => { demarrageEnCours = false; }, 1500);
}

/* Surveillance : relance le micro s'il est mort, et signale
   franchement quand rien n'est capté depuis longtemps. */
setInterval(() => {
  if(!isRecording) return;
  sauvegarderLocal();
  const etat = $('etatMicro');
  const diag = $('diagMicro');

  if(diag){
    const depuis = dernierMot ? Math.round((Date.now() - dernierMot) / 1000) : null;
    const capteRecemment = depuis !== null && depuis <= 12;

    if(capteRecemment){
      diag.textContent = '🗣️ paroles captées il y a ' + depuis + ' s';
      diag.style.color = 'var(--orange)';
    }else if(depuis !== null && sessionActive){
      diag.textContent = '🤫 rien capté depuis ' + depuis + ' s';
      diag.style.color = 'var(--warn-text)';
    }else{
      diag.textContent = 'état : ' + dernierEvenement;
      diag.style.color = 'var(--muted)';
    }
  }

  if(!sessionActive){
    etat.textContent = demarrageEnCours ? '⏳ démarrage…' : '⏸️ micro coupé — reprise…';
    etat.style.color = 'var(--warn-text)';
    relancerMicro();
    return;
  }

  const silence = Math.round((Date.now() - dernierMot) / 1000);
  if(silence >= 30){
    etat.textContent = '⚠️ aucun son capté depuis ' + silence + ' s';
    etat.style.color = 'var(--warn-text)';
  } else {
    etat.textContent = '🔴 en écoute';
    etat.style.color = 'var(--orange)';
  }
}, 2500);

async function garderEcranAllume(){
  try{
    if('wakeLock' in navigator){
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
      return true;
    }
  }catch(e){
    console.warn('Maintien de l\'écran refusé :', e);
  }
  return false;
}

function libererEcran(){
  if(wakeLock){
    try{ wakeLock.release(); }catch(e){}
    wakeLock = null;
  }
}

/* Prévient le moniteur si l'enregistrement a été coupé */
document.addEventListener('visibilitychange', () => {
  if(!isRecording) return;
  if(document.hidden){
    interruptions++;
  } else {
    garderEcranAllume();
    relancerMicro();
    if(interruptions > 0){
      const w = $('pauseWarn');
      w.style.display = 'block';
      w.textContent = '⚠️ L\'enregistrement a été interrompu ' + interruptions +
        (interruptions > 1 ? ' fois' : ' fois') +
        ' (écran éteint ou autre application). Ce qui a été dit pendant ces coupures n\'a pas été capté.';
    }
  }
});

/* Fusionne les versions successives d'une même phrase.
   Chrome sur Android empile les résultats provisoires
   ("oui" / "oui ta" / "oui ta priorité"...) au lieu de les remplacer :
   on ne garde donc que la version la plus complète. */
function fusionner(chunks){
  const out = [];
  (chunks || []).forEach(raw => {
    const c = String(raw).replace(/\s+/g, ' ').trim();
    if(!c) return;
    const last = out.length ? out[out.length - 1] : null;
    if(last){
      /* Comparaison sans la ponctuation finale, sinon un point
         empêcherait de reconnaître une version étendue. */
      const lastNu = sansPonctuationFinale(last);
      const cNu = sansPonctuationFinale(c);
      if(cNu.startsWith(lastNu)){ out[out.length - 1] = c; return; }
      if(lastNu.startsWith(cNu)) return;
    }
    out.push(c);
  });
  return out.join(' ');
}

/* ---------- Menu des modèles ---------- */
function remplirModeles(){
  remplirUnMenuModeles($('modele'));
  remplirUnMenuModeles($('prepModele'));
}

function remplirUnMenuModeles(sel){
  if(!sel) return;

  /* On repart de zéro : la fonction est appelée plusieurs fois
     (démarrage, puis chargement des modèles ajoutés), et sans
     ce nettoyage la liste se dédoublait. */
  const choisi = sel.value;
  sel.innerHTML = '';

  const groupes = {};
  Object.keys(MODELES).forEach(cle => {
    const g = MODELES[cle].groupe;
    if(!groupes[g]) groupes[g] = [];
    groupes[g].push(cle);
  });
  Object.keys(groupes).forEach(g => {
    const og = document.createElement('optgroup');
    og.label = g;
    groupes[g].forEach(cle => {
      const opt = document.createElement('option');
      opt.value = cle;
      opt.textContent = MODELES[cle].label;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });

  /* Le type choisi ne doit pas être perdu au rafraîchissement */
  if(choisi && sel.querySelector('option[value="' + choisi + '"]')) sel.value = choisi;
}

let minuteurToast = null;

function showToast(msg){
  const t = $('toast');
  if(!t) return;

  t.textContent = msg;

  /* Un souci reste plus longtemps qu'un simple « enregistré » :
     2,2 secondes ne suffisaient pas à lire un message d'erreur,
     surtout au volant. */
  const souci = /impossible|erreur|échec|echec|⚠️|pas |aucun|manquant|invalide/i
    .test(msg);
  t.classList.toggle('souci', souci);

  t.classList.add('show');
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => t.classList.remove('show'),
                             souci ? 6000 : 3500);
}

/* ---------- Reconnaissance vocale ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const estAndroid = /Android/i.test(navigator.userAgent || '');

if(!SR){
  $('unsupportedBox').innerHTML = '<div class="unsupported">⚠️ La reconnaissance vocale demande ' +
    '<strong>Chrome sur Android</strong>.<br>Le <strong>bilan à remplir à la main</strong> ' +
    'reste utilisable normalement sur ce navigateur.</div>';
  $('recBtn').disabled = true;
  $('recBtn').style.opacity = '.45';
  /* Le mode manuel est mis en avant puisque c'est le seul disponible */
  const bm = $('manuelBtn');
  if(bm){
    bm.className = 'btn btn-primary';
    bm.style.marginTop = '12px';
  }
}

/* Qui est connecté, en haut de l'écran.
   Utile quand plusieurs moniteurs se partagent un téléphone. */
const LIBELLE_ROLE = { admin: 'Administrateur', bureau: 'Bureau', moniteur: 'Moniteur' };

function afficherIdentite(){
  const z = $('qui');
  const n = $('quiNom');
  const r = $('quiRole');
  if(!z || !n) return;

  if(!ACCES.code){
    z.style.display = 'none';
    return;
  }
  z.style.display = 'block';
  n.textContent = ACCES.moniteur || '';
  if(r) r.textContent = LIBELLE_ROLE[ACCES.role] || ACCES.role || '';
}

/* ============================================================
   FILET DE SÉCURITÉ POUR LA CONNEXION
   Le bouton Déverrouiller est branché ici, dans un module chargé
   tôt. Si un module plus loin échoue, on peut toujours entrer.
   ============================================================ */
(function brancherConnexion(){
  const btn = $('codeBtn');
  const champ = $('codeInput');
  const ident = $('identInput');
  if(!btn || !champ) return;

  const lancer = () => {
    if(typeof deverrouiller === 'function'){ deverrouiller(); return; }
    const msg = $('codeMsg');
    if(msg){
      msg.style.color = 'var(--warn-text)';
      msg.innerHTML = "⚠️ L'application est incomplète : un fichier n'a pas été mis en ligne." +
        '<br><span style="font-size:12px;">Vérifie le dossier <strong>app/</strong> sur GitHub, ' +
        'puis recharge la page.</span>';
    }
  };

  btn.addEventListener('click', lancer);
  champ.addEventListener('keydown', e => { if(e.key === 'Enter') lancer(); });
  /* Entrée sur le prénom passe au code plutôt que d'envoyer un
     formulaire à moitié rempli. */
  if(ident) ident.addEventListener('keydown', e => {
    if(e.key === 'Enter'){ e.preventDefault(); champ.focus(); }
  });
})();

/* ============================================================
   ATTENDRE

   Un écran vide n'apprend rien : on montre que quelque chose se
   passe, et quoi.
   ============================================================ */

function blocAttente(quoi){
  const d = document.createElement('div');
  d.style.cssText = 'display:flex;flex-direction:column;align-items:center;' +
    'gap:11px;padding:26px 12px;';

  const s = document.createElement('div');
  s.className = 'spinner';
  d.appendChild(s);

  if(quoi){
    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;color:var(--muted);text-align:center;';
    t.textContent = quoi;
    d.appendChild(t);
  }
  return d;
}

/* Le même, en une ligne de HTML pour les innerHTML */
function htmlAttente(quoi){
  return '<div style="display:flex;flex-direction:column;align-items:center;' +
    'gap:11px;padding:26px 12px;">' +
    '<div class="spinner"></div>' +
    (quoi ? '<div style="font-size:13px;color:var(--muted);' +
            'text-align:center;">' + quoi + '</div>' : '') +
    '</div>';
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-noyau.js'] = true;

/* ============================================================
   CONTRÔLE DES MODULES
   Un fichier absent du serveur ne provoque aucune erreur visible :
   des boutons cessent simplement de répondre. On le signale.
   ============================================================ */
/* ------------------------------------------------------------
   CE QUE L'EFFACEMENT A RÉELLEMENT FAIT

   Écrit une fois, lu par les trois écrans qui suppriment un
   dossier. Chacun rédigeait son propre résumé, et les trois
   n'énuméraient pas les mêmes choses : on ne savait pas si la
   différence venait du dossier ou de l'écran.

   On répète ce que le classeur DIT avoir fait, jamais ce qu'on
   espérait qu'il fasse.
   ------------------------------------------------------------ */
function resumeEffacement(d){
  const a = (d && d.ailleurs) || {};
  const bouts = [];
  if(d && d.supprimees) bouts.push(d.supprimees + ' bilan(s)');
  if(a.repertoire)   bouts.push('sa fiche du répertoire');
  if(a.acces)        bouts.push('son accès au coin révisions');
  if(a.recitations)  bouts.push(a.recitations + ' récitation(s)');
  if(a.demandes)     bouts.push(a.demandes + ' procédure(s) demandée(s)');
  if(a.preparations) bouts.push(a.preparations + ' cours préparé(s)');
  if(a.captures)     bouts.push(a.captures + ' capture(s) du CEPC');
  if(a.consignes)    bouts.push(a.consignes + ' message(s) au bureau');
  if(a.suivi)        bouts.push('sa fiche de suivi');
  if(a.ailleurs)     bouts.push(a.ailleurs + ' ligne(s) ailleurs');
  if(a.resultats)    bouts.push(a.resultats + ' résultat(s) anonymisé(s)');
  return bouts;
}

/* ============================================================
   ENVOYER UN BILAN PAR MAIL — UNE SEULE FOIS, POUR TOUT LE MONDE

   « Il a corrigé le bilan et quand il a terminé il n'avait pas le
   bouton pour envoyer par mail. »

   Le bouton n'existait que si l'élève avait déjà une adresse sur
   sa fiche. Sinon, une phrase : « l'envoi par mail n'est pas
   possible ». Un cul-de-sac, à la fin du cours, quand l'élève est
   déjà reparti.

   Or SEPT autres écrans savaient déjà quoi faire — la fiche
   d'évaluation, les écoutes, les procédures, le paiement… : ils
   demandent l'adresse, l'enregistrent sur la fiche, et envoient.
   Le seul écran qui ne le faisait pas est celui qui compte le
   plus. Il le fait maintenant, par la même porte que les autres.
   ============================================================ */
function adressesDuBilan(nom){
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  const out = [];
  if(f && f.email) out.push(String(f.email).trim());
  if(f && f.mailPrescripteur) out.push(String(f.mailPrescripteur).trim());
  return out.filter(Boolean);
}

/* Rend le nombre d'adresses servies, ou 0. Lève si l'envoi rate :
   c'est à l'appelant de le dire à sa façon, près de son bouton. */
async function envoyerBilanParMail(eleve, dateCours, texte){
  const nom = String(eleve || '').trim();
  if(!String(texte || '').trim()){
    throw new Error('Ce bilan est vide : il n\'y a rien à envoyer.');
  }

  let mails = adressesDuBilan(nom);

  /* AUCUNE ADRESSE N'EST PLUS UN CUL-DE-SAC. On la demande, et
     elle redescend sur la fiche — sinon on la redemanderait au
     prochain cours. */
  if(!mails.length){
    if(typeof confirmerAdresseEleve !== 'function'){
      throw new Error('Aucune adresse mail sur sa fiche.');
    }
    const saisie = await confirmerAdresseEleve(nom, '');
    if(!saisie) return 0;             /* annulé : ce n'est pas un échec */
    mails = [saisie];
  }

  const jour = (typeof dateEnToutesLettres === 'function')
    ? (dateEnToutesLettres(dateCours) || dateCours) : dateCours;

  await appelPrep({ action: 'mailBilan', to: mails,
                    sujet: 'Ton bilan de conduite du ' + (jour || ''),
                    texte: texte });
  return mails.length;
}

const EC_ATTENDUS = ["ec-etat.js", "ec-modeles.js", "ec-consignes.js", "ec-noyau.js", "ec-vocal.js", "ec-reseau.js", "ec-manuel.js", "ec-fenetres.js", "ec-questionnaire.js", "ec-permis.js", "ec-prepares.js", "ec-bureau.js", "ec-places.js", "ec-listes.js", "ec-permis-listes.js", "ec-postpermis.js", "ec-textes.js", "ec-correction.js", "ec-bilans.js", "ec-version.js", "ec-paie.js", "ec-flotte.js", "ec-solo.js", "ec-handicap-pdf.js", "ec-moto.js", "ec-remorque.js", "ec-arriereplan.js", "ec-placesbe.js", "ec-codeamenage.js", "ec-financements.js", "ec-eval-aac.js", "ec-postes.js", "ec-tarifs.js", "ec-caisse.js", "ec-menage.js", "ec-page-eleve.js", "ec-loupe.js", "ec-coutsia.js", "ec-evaluation.js", "ec-paiement.js", "ec-handicap.js", "ec-code.js", "ec-proccorriger.js", "ec-ecran.js", "ec-sessions.js", "ec-notifs.js", "ec-ecoutes.js", "ec-taches.js", "ec-memoire.js", "ec-historique.js", "ec-rappels.js", "ec-stats.js", "ec-messenger.js", "ec-journal.js", "ec-onglets.js", "ec-depart.js", "ec-demarrage.js"];

function verifierModules(){
  const charges = window.EC_MODULES || {};
  const manquants = EC_ATTENDUS.filter(function(m){ return !charges[m]; });
  if(!manquants.length) return;

  const z = document.createElement('div');
  z.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;' +
    'background:#B3261E;color:#fff;padding:14px 16px;font-size:14px;line-height:1.5;' +
    'font-family:inherit;box-shadow:0 2px 12px rgba(0,0,0,.4);';
  z.innerHTML = '<strong>⚠️ Application incomplète</strong><br>' +
    manquants.length + ' fichier(s) manquant(s) dans le dossier <code>app/</code> :<br>' +
    manquants.join(', ') + '<br>' +
    '<span style="font-size:12px;opacity:.9;">Certaines fonctions ne répondront pas ' +
    'tant que ces fichiers ne sont pas en ligne.</span>';
  document.body.insertBefore(z, document.body.firstChild);
  console.error('Modules manquants :', manquants);
}

/* On laisse le temps aux derniers scripts d'arriver */
setTimeout(verifierModules, 2500);
