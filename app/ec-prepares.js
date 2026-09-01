/* Déployé le 01/09/2026 à 13:48 — v770 */
/* ============================================================
   ec-prepares.js
   Cours préparés à l'avance
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   COURS PRÉPARÉS À L'AVANCE
   Le moniteur prépare ses notes la veille ; au moment du cours
   il choisit l'élève et démarre directement.
   Stockage dans le téléphone : accessible même sans réseau.
   ============================================================ */
const CLE_CACHE_PREP = 'cache_prepares';
/* prepares : déclaré dans ec-etat.js */
/* prepareEnCours : déclaré dans ec-etat.js */

/* Cache local : la liste reste consultable même sans réseau dans la voiture */
function lireCachePrepares(){
  try{
    const brut = localStorage.getItem(CLE_CACHE_PREP);
    const l = brut ? JSON.parse(brut) : [];
    return Array.isArray(l) ? l : [];
  }catch(e){ return []; }
}
function ecrireCachePrepares(liste){
  try{ localStorage.setItem(CLE_CACHE_PREP, JSON.stringify(liste)); }catch(e){}
}

/* Les actions qui écrivent en masse : plus de temps, et JAMAIS de
   nouvelle tentative. Relancer un import qui a peut-être abouti
   créerait des doublons. */
const ACTIONS_LOURDES = { bureauEtat: 25000, elevesImport: 90000,
                          smsList: 25000, resultatList: 25000 };
const SANS_REPRISE = ['elevesImport', 'ficheSet', 'bilanMaj', 'bilanModifier',
                      'smsLog', 'eleveRetirer', 'consigneEffacerEleve'];

async function appelPrep(corps){
  /* Se servir de l'application repousse le délai d'inactivité :
     sans cela, la session mourrait 48 h après la connexion même
     en travaillant dessus. */
  if(typeof rafraichirSession === 'function') rafraichirSession();

  const action = (corps && corps.action) || '';
  const delai = ACTIONS_LOURDES[action] || 12000;
  const essais = (SANS_REPRISE.indexOf(action) !== -1) ? 0 : 2;

  const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ code: ACCES.code }, corps))
  }, delai, essais);
  /* Le message du serveur vaut mieux qu'un code seul : « HTTP 502 »
     ne dit rien, « SMTP 535 : authentification refusée » dit tout. */
  const rep = await r.json().catch(() => ({}));

  if(!r.ok){
    /* Un refus du serveur — trop d'essais, trop d'appels — veut
       dire « pas maintenant ». On met les rafraîchissements en
       sommeil : insister ne ferait que prolonger le blocage. */
    if((r.status === 403 || r.status === 429) &&
       typeof noterRefusReseau === 'function'){
      noterRefusReseau(r.status === 429 ? 300 : 120);
    }
    throw new Error(rep && rep.error ? rep.error : 'HTTP ' + r.status);
  }

  return rep;
}

/* ------------------------------------------------------------
   ÉCRIRE LE RANG D'UN COURS DEPUIS SA CARTE

   Une seule fonction pour une seule écriture : le contexte du
   cours, sa note refaite avec le bon rang, et la marque qui dit
   que ce rang vient d'une main humaine — c'est elle qui empêche le
   recomptage de repasser derrière.

   La note est REFAITE, pas raturée : « 3ème leçon » devient « 8ème
   leçon », mais aussi « plus que 2 leçons avant l'examen blanc »
   devient ce qu'il faut, parce que ces deux phrases-là disent la
   même chose et doivent bouger ensemble.
   ------------------------------------------------------------ */
async function ecrireRangDuCours(cours, rang){
  const ctx = Object.assign({}, contexteEnObjet(cours.contexte));
  ctx.lecon = String(rang);
  ctx.leconMain = 'oui';
  if(!ctx.modele && cours.modele) ctx.modele = cours.modele;
  /* Le rang saisi vaut aussi réponse : on sait désormais où il en
     est, la note n'a plus à réclamer le questionnaire. */
  ctx.sansBilan = false;

  let note = cours.note;
  if(typeof noteJusteDuCours === 'function'){
    try{ note = noteJusteDuCours(Object.assign({}, cours, { contexte: ctx }), rang, null); }
    catch(e){ note = cours.note; }
  }

  await appelPrep({
    action: 'prepAdd', id: cours.id, date: cours.date,
    eleve: cours.eleve, modele: cours.modele,
    modeleLabel: cours.modeleLabel || '',
    site: cours.site || '',
    note: note,
    contexte: JSON.stringify(ctx),
    moniteur: cours.moniteur || ''
  });

  /* La liste en mémoire suit : l'écran ne doit pas attendre une
     relecture complète pour montrer le bon rang. */
  cours.note = note;
  cours.contexte = ctx;
  return note;
}

/* Le rang depuis la charnière, tel que la note l'annonce déjà.

   Tant que personne n'a répondu à la deuxième case, c'est la
   seule chose qu'on sache — et laisser la case vide sous une
   ligne qui dit « 4ème leçon après l'examen blanc » n'aiderait
   personne. */
function rangApresDansLaNote(note){
  const m = String(note || '')
    .match(/(\d+)\s*(?:ère|ere|ème|eme|e)\s+le[çc]ons?\s+apr[èe]s\s/i);
  if(!m) return null;
  const v = parseInt(m[1], 10);
  return (v > 0) ? v : null;
}

/* CE QU'IL Y AVAIT AVANT LA CHARNIÈRE, ÉCRIT SUR LE COURS.

   Le même chemin que le rang : on refait la note plutôt que de la
   raturer, et la liste en mémoire suit tout de suite. Ce nombre-là
   ne vieillira pas — c'est ce qui dispense de le retaper. */
async function ecrireAvantCharniere(cours, cle, valeur){
  const ctx = Object.assign({}, contexteEnObjet(cours.contexte));
  ctx[cle] = String(valeur);
  if(!ctx.modele && cours.modele) ctx.modele = cours.modele;

  const rang = (typeof numeroLeconDuCours === 'function')
    ? numeroLeconDuCours(cours) : parseInt(ctx.lecon, 10);

  let note = cours.note;
  if(typeof noteJusteDuCours === 'function'){
    try{ note = noteJusteDuCours(Object.assign({}, cours, { contexte: ctx }),
                                 rang, null); }
    catch(e){ note = cours.note; }
  }

  await appelPrep({
    action: 'prepAdd', id: cours.id, date: cours.date,
    eleve: cours.eleve, modele: cours.modele,
    modeleLabel: cours.modeleLabel || '',
    site: cours.site || '',
    note: note,
    contexte: JSON.stringify(ctx),
    moniteur: cours.moniteur || ''
  });

  cours.note = note;
  cours.contexte = ctx;
  return note;
}

/* Charge depuis Sheets, avec repli sur le cache si le réseau manque */
async function chargerPrepares(){
  try{
    const data = await appelPrep({ action: 'prepList' });
    const liste = (data && data.preparations) || [];
    /* Les cours passés de plus de 7 jours ne sont plus affichés */
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);
    const cle = limite.toISOString().slice(0, 10);
    prepares = liste.filter(x => !x.date || x.date >= cle).map(x => {
      let ctx = null;
      try{ ctx = x.contexte ? JSON.parse(x.contexte) : null; }catch(e){}
      return Object.assign({}, x, { contexte: ctx });
    });
    ecrireCachePrepares(prepares);
    derniereErreurPrep = '';
    return true;
  }catch(e){
    /* Sans la raison, « hors ligne » couvrait tout : un vrai
       problème de réseau comme un refus du serveur. */
    derniereErreurPrep = (e && e.message) ? String(e.message) : '';
    prepares = lireCachePrepares();
    return false;
  }
}

/* Ce qui a fait échouer le dernier chargement */
let derniereErreurPrep = '';


/* ============================================================
   LE COURS D'AVANT, QUAND IL N'A PAS ENCORE DE BILAN

   Chrystel : « j'ai tout rempli aujourd'hui pour un élève dont
   c'est la première leçon — on est d'accord qu'il n'avait pas de
   frise ni son numéro. Je fais un rappel pour demain de sa
   deuxième leçon et je dois remplir 2 dans la case. »

   Le dossier d'un élève est lu dans les BILANS du classeur. Or le
   cours d'aujourd'hui n'a pas encore de bilan : il n'a qu'une
   préparation, avec ce qu'elle vient d'y écrire. Le rappel du
   lendemain ne voyait donc rien, et repartait de zéro — sur un
   élève dont tout venait d'être renseigné.

   Cette fonction rend la dernière préparation ANTÉRIEURE à une
   date. Antérieure au sens strict : deux cours le même jour ne se
   succèdent pas dans la frise, et compter le second comme la suite
   du premier ferait avancer le rang d'un cran de trop.
   ============================================================ */
function preparationPrecedenteDe(eleve, avantIso){
  if(!eleve || typeof normaliserMot !== 'function') return null;
  const qui = normaliserMot(eleve);
  const borne = String(avantIso || '');

  const siennes = (prepares || []).filter(x =>
    x && x.eleve && normaliserMot(x.eleve) === qui &&
    x.date && (!borne || x.date < borne));

  if(!siennes.length) return null;
  siennes.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return siennes[0];
}

/* Le rang qu'annonce une préparation : son contexte d'abord — une
   main l'y a écrit — puis sa note. */
function rangDeLaPreparation(prep){
  if(!prep) return null;
  const ctx = prep.contexte || {};
  const dit = parseInt(ctx.lecon, 10);
  if(!isNaN(dit) && dit > 0) return dit;
  if(typeof numeroLeconDuCours === 'function'){
    const n = numeroLeconDuCours(prep);
    if(n > 0) return n;
  }
  return null;
}


/* ============================================================
   UNE CARTE NE DOIT PAS CONTREDIRE LE CLASSEUR

   Chrystel, épuisée : « j'en ai marre de devoir vérifier chaque
   leçon dans mes prochains cours pour être sûre que tout soit
   bon ». Elle avait raison de vérifier : la note d'un cours
   préparé est écrite UNE FOIS, le jour de la préparation. Tout ce
   qui arrive ensuite — une date d'examen posée dans une session,
   un examen blanc passé, un post-permis fait — ne s'y écrit
   jamais. La carte affiche donc une photo, et la photo vieillit.

   `noteJusteDuCours()` sait déjà refaire une note à partir des
   sources qui font foi. Elle ne servait qu'à réparer un rang tapé
   à la main. On s'en sert maintenant pour l'AFFICHAGE, à chaque
   chargement.

   UNE NOTE NE S'APPAUVRIT JAMAIS TOUTE SEULE.

   C'est le garde-fou, et il n'est pas théorique : si les sources
   n'ont pas fini de charger, la note refaite dirait « pas de date
   d'examen » sur un élève qui en a une — et on aurait remplacé une
   information vieille par une information fausse, ce qui est pire.
   On compare donc l'avant et l'après sur les faits qui comptent :
   dès que le neuf en dit MOINS, on garde l'ancien.

   Rien n'est enregistré : c'est l'écran qu'on met à jour, pas le
   classeur. La note écrite se remettra d'elle-même quand quelqu'un
   touchera le cours.
   ============================================================ */

/* Les faits qu'une note ne doit jamais perdre en se refaisant. */
const FAITS_DE_LA_NOTE = ['examDate', 'examPermis', 'examBlanc', 'ebPasse',
                          'rdvPostFait', 'frise', 'formation', 'avantEB',
                          'avantRdvPost', 'avantExamRate'];

function noteAppauvrie(avant, apres){
  if(typeof defautsDepuisNote !== 'function') return true;
  const a = defautsDepuisNote(avant || '');
  const b = defautsDepuisNote(apres || '');
  return FAITS_DE_LA_NOTE.some(k => {
    const av = String(a[k] == null ? '' : a[k]).trim();
    const ap = String(b[k] == null ? '' : b[k]).trim();
    return av && !ap;
  });
}

function rafraichirNotesPreparees(){
  if(typeof noteJusteDuCours !== 'function') return 0;

  let refaites = 0;
  (prepares || []).forEach(cours => {
    if(!cours || !cours.eleve) return;
    try{
      /* Le rang que la note annonce déjà : on ne le recalcule pas
         ici, on ne fait que rafraîchir ce qui l'entoure. */
      const ctx = cours.contexte || {};
      const rang = (ctx.lecon !== undefined && ctx.lecon !== '')
        ? ctx.lecon
        : (typeof numeroLeconDuCours === 'function'
            ? (numeroLeconDuCours(cours) || '') : '');

      const neuve = noteJusteDuCours(cours, rang, null);
      if(!neuve || neuve === cours.note) return;
      if(noteAppauvrie(cours.note, neuve)) return;

      cours.note = neuve;
      refaites++;
    }catch(e){ /* une carte qui résiste ne bloque pas les autres */ }
  });
  return refaites;
}

function libelleDate(iso){
  if(!iso) return 'Sans date';
  const auj = todayLocal();
  if(iso === auj) return "Aujourd'hui";
  const d = new Date(iso + 'T12:00:00');
  const dem = new Date();
  dem.setDate(dem.getDate() + 1);
  if(iso === dem.toISOString().slice(0, 10)) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* LES TIROIRS : AUJOURD'HUI OUVERT, LE RESTE FERMÉ.

   Ils étaient gardés d'une fois sur l'autre dans l'appareil, et
   ils s'accumulaient : on ouvrait un jeudi pour vérifier quelque
   chose, et l'écran rouvrait ce jeudi-là des semaines durant. La
   journée qu'on vient consulter, c'est celle d'aujourd'hui.

   Ce qu'on ouvre à la main reste ouvert — mais pour cette
   session seulement, le temps qu'on s'en serve. Au rechargement,
   l'écran reprend sa forme simple. C'est aussi ce qui empêche un
   redessin de refermer ce que le moniteur vient d'ouvrir. */
let tiroirsPrepares = {};
/* La liste telle qu'affichée, pour que les flèches déplacent ce que
   le moniteur voit et non l'ensemble des cours. */
let listeAffichee = [];


/* Les moniteurs qui ont des cours, avec leur nombre. On ne propose
   que ceux qui en ont : une liste de noms vides n'aide personne. */
function remplirFiltreMoniteurs(sel){
  const compte = {};
  prepares.forEach(x => {
    const n = (x.moniteur || '').trim() || '(non attribué)';
    compte[n] = (compte[n] || 0) + 1;
  });

  const noms = Object.keys(compte).sort((a, b) => a.localeCompare(b, 'fr'));
  const signature = noms.map(n => n + compte[n]).join('|');
  if(sel._signature === signature) return;      /* rien de neuf */
  sel._signature = signature;

  const choix = sel.value;
  sel.innerHTML = '<option value="">Tous les moniteurs — ' +
    prepares.length + ' cours</option>' +
    noms.map(n => '<option value="' + n.replace(/"/g, '&quot;') + '">' +
                  n + ' — ' + compte[n] + '</option>').join('');
  if(choix && noms.indexOf(choix) !== -1) sel.value = choix;
}


/* Remplit le choix du moniteur destinataire */
async function remplirPourQui(){
  const sel = $('prepPour');
  if(!sel) return;

  if(typeof chargerMoniteurs === 'function' &&
     (typeof moniteursActifs === 'undefined' || !moniteursActifs.length)){
    try{ await chargerMoniteurs(); }catch(e){ /* on garde le moniteur courant */ }
  }

  poserMoniteursDansPourQui();
}


/* Le remplissage seul, sans aller chercher la liste : c'est lui
   qu'appelle « chargerMoniteurs » une fois la liste connue, sans
   risquer de la redemander en boucle. */
function poserMoniteursDansPourQui(){
  const sel = $('prepPour');
  if(!sel) return;

  let liste = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];
  const moi = (typeof ACCES !== 'undefined' && ACCES.moniteur) || '';

  /* Liste illisible — appelée avant l'ouverture de session, ou
     serveur muet : on garde au moins le moniteur connecté. Une
     liste vidée laissait un menu vide, et plus moyen de préparer
     un cours du tout. */
  if(!liste.length){
    if(!moi) return;            /* rien à proposer : on ne touche à rien */
    liste = [moi];
  }

  const choix = sel.value || moi || '';

  sel.innerHTML = liste.map(m =>
    '<option value="' + String(m).replace(/"/g, '&quot;') + '">' +
    (normaliserMot(m) === normaliserMot(moi) ? m + ' (moi)' : m) +
    '</option>').join('');

  /* Moi par défaut : c'est le cas le plus fréquent */
  if(liste.some(m => normaliserMot(m) === normaliserMot(choix))) sel.value = choix;
  else if(liste.length) sel.value = liste[0];
}


/* ------------------------------------------------------------
   LA PRÉSENCE ANNONCÉE PAR L'ÉLÈVE

   Le rappel part avec un bouton « Je serai présent ». Ce qu'il en
   fait se lit ici, sur la carte du cours : c'est là qu'on regarde
   le matin, pas dans le journal des envois.

   Une seule lecture pour toute la liste — un appel par cours
   aurait rendu l'écran lent pour une information d'appoint.
   ------------------------------------------------------------ */
let confirmationsPresence = null;

async function chargerConfirmations(){
  try{
    const d = await appelPrep({ action: 'confirmationsList' });
    confirmationsPresence = (d && d.confirmations) || {};
  }catch(e){
    /* Sans elles, les cartes s'affichent comme avant : cette
       information ne doit jamais empêcher la liste de paraître. */
    confirmationsPresence = {};
  }
  return confirmationsPresence;
}

/* Le jeton d'un cours, rangé dans son contexte à la création */
function jetonDuCours(cours){
  /* Le contexte arrive tantôt en objet — relu du classeur — tantôt
     en texte, quand un rappel vient de le poser dans la liste sans
     attendre le rechargement. Les deux doivent répondre. */
  let ctx = (cours && cours.contexte) || null;
  if(typeof ctx === 'string'){
    try{ ctx = JSON.parse(ctx); }catch(e){ ctx = null; }
  }
  return (ctx && ctx.jeton) ? String(ctx.jeton) : '';
}

/* Ce qu'on écrit sous l'heure. Rien du tout si le cours n'est pas
   né d'un rappel : il n'y a alors aucune réponse à attendre. */
function etatPresence(cours){
  const j = jetonDuCours(cours);
  if(!j) return null;

  const quand = confirmationsPresence && confirmationsPresence[j];
  return quand
    ? { texte: '✋ présence confirmée', titre: 'Confirmée le ' + quand,
        couleur: 'var(--bleu)' }
    : { texte: '✉️ rappel envoyé', titre: "L'élève n'a pas encore répondu",
        couleur: 'var(--muted)' };
}

/* ------------------------------------------------------------
   VOIR LA RÉPONSE ARRIVER

   Recharger toute la liste pour une ligne de douze pixels serait
   disproportionné : on relit les seules confirmations, et on
   repeint les lignes qui ont changé, sans toucher au reste de
   l'écran — ni au défilement, ni à une carte ouverte.

   Et quand plus personne n'est attendu, la veille s'arrête d'elle
   même : il n'y a plus rien à guetter.
   ------------------------------------------------------------ */
let minuteurPresences = null;

/* Les jetons affichés qui attendent encore une réponse */
function presencesEnAttente(){
  return [...document.querySelectorAll('.presence[data-jeton]')]
    .filter(el => !confirmationsPresence ||
                  !confirmationsPresence[el.getAttribute('data-jeton')])
    .map(el => el.getAttribute('data-jeton'))
    .filter(Boolean);
}

async function rafraichirPresences(){
  if(!presencesEnAttente().length) return 0;

  const avant = confirmationsPresence || {};
  await chargerConfirmations();

  let nouvelles = 0;
  document.querySelectorAll('.presence[data-jeton]').forEach(el => {
    const j = el.getAttribute('data-jeton');
    const quand = confirmationsPresence[j];
    if(!quand || avant[j]) return;

    el.textContent = '✋ présence confirmée';
    el.style.color = 'var(--bleu)';
    el.title = 'Confirmée le ' + quand;
    nouvelles++;

    /* Un clignotement bref : la ligne a changé pendant qu'on
       regardait ailleurs, il faut que l'œil y revienne. */
    el.style.transition = 'opacity .25s';
    el.style.opacity = '0.15';
    setTimeout(() => { el.style.opacity = '1'; }, 260);
  });

  if(nouvelles && typeof showToast === 'function'){
    showToast(nouvelles === 1
      ? '✋ Un élève vient de confirmer sa présence'
      : '✋ ' + nouvelles + ' élèves viennent de confirmer leur présence');
  }
  return nouvelles;
}

function veillerPresences(){
  clearInterval(minuteurPresences);
  minuteurPresences = setInterval(() => {
    if(typeof ACCES === 'undefined' || !ACCES.code) return;
    /* Personne devant l'écran : relire ne servirait qu'à consommer
       des appels. */
    if(document.hidden) return;
    if(typeof reseauEnPause === 'function' && reseauEnPause()) return;
    rafraichirPresences();
  }, 45000);
}

/* Revenir sur l'application, c'est le moment où l'on veut voir ce
   qui s'est passé pendant qu'on avait le nez ailleurs. */
document.addEventListener('visibilitychange', () => {
  if(document.hidden) return;
  if(typeof ACCES === 'undefined' || !ACCES.code) return;
  rafraichirPresences();
});

async function afficherPrepares(recharger, silencieux){
  const zone = $('listePrepares');
  if(!zone) return;

  if(recharger !== false){
    if(!silencieux) zone.innerHTML = '<div class="empty">Chargement…</div>';
    /* En parallèle : les suivantes ne doivent pas retarder la
       première, dont dépend tout l'écran.

       Les fiches en font partie depuis que la carte les lit — la
       formation, la boîte et le poste de conduite viennent toutes
       du répertoire. Cet écran ne les chargeait jamais : il se
       contentait de celles qu'un AUTRE écran avait pu charger
       avant lui. D'où des cartes sans 🎓, et des cases de coussin
       éteintes sur des élèves qui en ont besoin.

       On ne les redemande que si on ne les a pas : c'est un appel
       de plus, il n'a pas à se répéter à chaque ouverture. */
    const [enLigne] = await Promise.all([
      chargerPrepares(),
      chargerConfirmations(),
      (typeof chargerFiches === 'function' &&
       typeof fichesEleves !== 'undefined' && !fichesEleves.length)
        ? chargerFiches().catch(() => []) : Promise.resolve(),

      /* LE SUIVI ET LES SESSIONS, QUE CET ÉCRAN N'ALLAIT JAMAIS
         CHERCHER.

         Chrystel : « pourtant il y a bien une date d'examen de
         prévu », sur une carte qui affichait « PAS DE DATE
         D'EXAMEN OFFICIEL ». La note d'un cours préparé est écrite
         une fois, au moment de la préparation. Une date d'examen
         posée après — une session, une fiche de suivi — ne s'y
         inscrit jamais toute seule.

         Le questionnaire, lui, va la chercher depuis longtemps :
         c'est `etatQuiFaitFoi()`. Mais il lui faut le suivi et les
         sessions en mémoire, et CET écran ne les chargeait pas. Il
         se contentait de ce qu'un autre écran avait pu charger
         avant lui — d'où des cartes justes le lundi et fausses le
         mardi, sans qu'on puisse s'y fier.

         Comme pour les fiches : on ne les redemande que si on ne
         les a pas, et en parallèle du reste. */
      (typeof chargerBureau === 'function' &&
       typeof etatBureau !== 'undefined' &&
       !(etatBureau.suivi && etatBureau.suivi.length))
        ? chargerBureau().catch(() => null) : Promise.resolve(),
      (typeof chargerSessionsPermis === 'function' &&
       typeof sessionsPermis !== 'undefined' && !sessionsPermis.length)
        ? chargerSessionsPermis().catch(() => null) : Promise.resolve()
    ]);

    /* Les sources sont là : les notes peuvent se remettre à jour. */
    rafraichirNotesPreparees();

    /* La veille des réponses part avec la liste, et se relance à
       chaque affichage : un minuteur laissé derrière un écran fermé
       continuerait d'appeler pour rien. */
    veillerPresences();
    if(!enLigne && prepares.length){
      /* Dire pourquoi : un moniteur qui voit « hors ligne » alors
         que son téléphone marche ne sait pas quoi faire. */
      const raison = derniereErreurPrep;

      if(/503|indisponible|momentan/i.test(raison)){
        showToast('⚠️ Service momentanément indisponible — réessaie');
      }else if(/403|essai|bloqu/i.test(raison)){
        showToast('⚠️ Accès refusé — reconnecte-toi');
      }else if(/429|trop/i.test(raison)){
        showToast('⚠️ Trop de demandes — patiente une minute');
      }else if(/HTTP 5|502|503/i.test(raison)){
        showToast('⚠️ Le serveur ne répond pas — liste en cache');
      }else if(!navigator.onLine){
        showToast('Hors ligne — liste en cache');
      }else{
        showToast('Liste en cache' + (raison ? ' — ' + raison.slice(0, 40) : ''));
      }
    }
  }
  /* Chacun ne voit que ses cours, sauf demande explicite */
  const tousMoniteurs = $('prepTous') && $('prepTous').checked;
  const moi = normaliserMot(ACCES.moniteur || '');
  let liste = prepares.slice();

  /* Le filtre par moniteur ne sert que si l'on voit tout le monde */
  const selQui = $('prepQui');
  if(selQui){
    selQui.style.display = tousMoniteurs ? 'block' : 'none';
    if(tousMoniteurs) remplirFiltreMoniteurs(selQui);
  }

  if(!tousMoniteurs && moi){
    liste = liste.filter(x => !x.moniteur || normaliserMot(x.moniteur) === moi);
  }else if(selQui && selQui.value){
    liste = liste.filter(x => normaliserMot(x.moniteur || '') ===
                              normaliserMot(selQui.value));
  }

  majCompteur('cptPrepares', liste.length);

  /* Au premier chargement, on ouvre le tiroir le plus utile */
  if(!premierAffichagePrepares){
    premierAffichagePrepares = true;
    if(typeof ouvrirLeBonTiroirDuJour === 'function') ouvrirLeBonTiroirDuJour();
  }

  if(!liste.length){
    const autres = prepares.length;
    zone.innerHTML = '<div class="empty">' +
      (autres && !tousMoniteurs
        ? 'Aucun cours préparé à ton nom.<br>' + autres +
          ' cours préparé(s) par d\'autres moniteurs — coche la case ci-dessus pour les voir.'
        : 'Aucun cours préparé.<br>Prépare tes cours à l\'avance : le jour J, ' +
          'tu choisis l\'élève et tu démarres.') +
      '</div>';
    return;
  }

  liste.sort((a, b) => (a.date || '').localeCompare(b.date || '') ||
                       String(a.id || '').localeCompare(String(b.id || '')));
  zone.innerHTML = '';
  let dateCourante = null;
  let tiroir = null;

  /* Un tiroir par jour : aujourd'hui et demain ouverts, le reste
     replié. Sans ça, un moniteur qui prépare deux semaines à
     l'avance fait défiler sa journée pour la trouver. */
  const auj = todayLocal();

  /* Dans une journée, l'ordre choisi par le moniteur prime : c'est
     lui qui connaît l'enchaînement de ses cours. */
  /* Sans ordre posé, on départage par l'heure de création : deux
     cours à 999 se seraient rangés au hasard, et la flèche semblait
     ne rien faire. */
  liste.sort((a, b) => {
    const d = String(a.date || '').localeCompare(String(b.date || ''));
    if(d !== 0) return d;
    const oa = a.ordre || 0;
    const ob = b.ordre || 0;
    if(oa && ob) return oa - ob;
    if(oa) return -1;
    if(ob) return 1;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  /* Ce qui est réellement à l'écran : les flèches déplacent dans
     CETTE liste, pas dans l'ensemble des cours du jour. */
  listeAffichee = liste;

  liste.forEach(cours => {
    if(cours.date !== dateCourante){
      dateCourante = cours.date;
      const estAuj = (cours.date === auj);
      const passe = cours.date && cours.date < auj;

      /* Combien de cours ce jour-là : utile quand c'est replié */
      const combien = liste.filter(x => x.date === cours.date).length;

      tiroir = document.createElement('details');
      /* Ce que le moniteur a ouvert ou fermé lui-même prime : sans
         ça, chaque redessin rouvrait les tiroirs qu'il venait de
         replier. */
      /* Aujourd'hui, et rien d'autre. Demain et les jours passés
         s'ouvraient aussi : trois tiroirs déroulés dès l'arrivée,
         là où on ne vient chercher que la journée en cours. */
      tiroir.open = (tiroirsPrepares[cours.date] !== undefined)
        ? tiroirsPrepares[cours.date]
        : estAuj;

      tiroir.addEventListener('toggle', () => {
        tiroirsPrepares[cours.date] = tiroir.open;
      });
      tiroir.style.cssText = 'border:1px solid ' +
        (estAuj ? 'var(--orange)' : 'var(--line)') +
        ';border-radius:12px;padding:8px 12px;margin-bottom:8px;';

      const titre = document.createElement('summary');
      titre.style.cssText = 'cursor:pointer;font-size:14px;font-weight:700;' +
        'text-transform:capitalize;padding:4px 0;color:' +
        (passe ? 'var(--warn-text)' : estAuj ? 'var(--accent-text)' : 'var(--cream)') + ';';
      titre.textContent = libelleDate(cours.date) + '  ·  ' + combien +
        ' cours' + (passe ? '  ⚠️' : '');
      tiroir.appendChild(titre);

      /* Les simulateurs à la même heure : une seule séance. On le
         propose en tête du jour, avant les cours eux-mêmes. */
      if(typeof groupesDeSimulateur === 'function' && !passe){
        const duJour = liste.filter(x => x.date === cours.date);
        groupesDeSimulateur(duJour).forEach(g => {
          tiroir.appendChild(bandeauGroupe(g));
        });
      }

      zone.appendChild(tiroir);
    }

    const row = document.createElement('div');
    row.className = 'history-item';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const nom = document.createElement('strong');
    /* L'heure à la suite du nom : c'est ce qu'on cherche en
       ouvrant la liste, avant même le type de bilan. */
    const h = heureDeLaPreparation(cours);
    /* Ce que l'élève apporte : à côté de l'heure, pour le voir sans
       ouvrir le cours. */
    const aApporter = repereDeNote(cours);

    /* L'heure au-dessus du nom, en grand : c'est elle qu'on
       cherche en ouvrant la liste, avant même de savoir qui. */
    /* Sous l'heure : ce que l'élève a répondu au rappel */
    const presence = etatPresence(cours);

    nom.innerHTML =
      (h ? '<div style="font-size:19px;font-weight:800;' +
           'color:var(--accent-text);line-height:1.2;">' +
           h.replace(':', 'h') + '</div>' : '') +
      (presence ? '<div class="presence" data-jeton="' + jetonDuCours(cours) +
           '" style="font-size:12px;font-weight:600;color:' +
           presence.couleur + ';line-height:1.5;" title="' +
           presence.titre + '">' + presence.texte + '</div>' : '') +
      '<div>' + (cours.eleve || '(sans nom)').replace(/</g, '&lt;') +
      (aApporter ? ' <span style="font-size:15px;" title="' +
        aApporter.titre + '">' + aApporter.emojis +
        (aApporter.texte
          ? '<span style="font-size:13px;font-weight:800;color:var(--warn-text);">' +
            ' ' + aApporter.texte + '</span>' : '') +
        '</span>' : '') +
      '</div>';
    const sous = document.createElement('span');
    /* Un cours dont la date est passée n'a pas été enregistré :
       sa préparation serait partie. On le signale. */
    const passe = cours.date && cours.date < todayLocal();

    /* On distingue qui fait le cours de qui l'a préparé : après un
       transfert, les deux ne sont plus la même personne. */
    const donne = cours.preparePar && cours.moniteur &&
      normaliserMot(cours.preparePar) !== normaliserMot(cours.moniteur);

    /* La formation de l'élève, à côté du type de cours : c'est elle
       qui décide de la boîte, de la frise et du bilan. La lire sur la
       carte évite d'ouvrir la fiche pour savoir à quoi s'attendre. */
    let formation = '', boite = '';
    try{
      /* Les fiches ne sont pas chargées sur tous les écrans : un
         moniteur peut n'en avoir aucune. La carte doit s'afficher
         quand même — c'est son cours qu'elle porte, pas la fiche. */
      const fi = (typeof ficheDe === 'function') ? ficheDe(cours.eleve) : null;
      formation = (fi && String(fi.formation || '').trim()) || '';
      if(formation && typeof boiteDeLaFormation === 'function'){
        boite = boiteDeLaFormation(formation);
      }
    }catch(e){ /* sans fiche, la carte se lit très bien */ }

    sous.textContent = [cours.modeleLabel,
                        formation ? '🎓 ' + formation : '',
                        /* La boîte n'est répétée que si la formation
                           ne la dit pas déjà — « AAC BV » la porte. */
                        (boite && formation.indexOf(boite) === -1) ? '⚙️ ' + boite : '',
                        cours.moniteur ? '👤 ' + cours.moniteur : '',
                        donne ? '↩️ préparé par ' + cours.preparePar : '',
                        passe ? '⚠️ pas encore enregistré' : ''].filter(Boolean).join(' · ');
    if(passe) sous.style.color = 'var(--warn-text)';
    meta.appendChild(nom);
    /* La note, telle qu'elle est écrite — et rien de plus.

       La carte ajoutait son propre « 📌 » devant, alors que la note
       en porte déjà un pour la consigne du moniteur : on lisait deux
       blocs 📌 pour un seul cours. Et elle réaffichait l'en-tête
       (l'heure, 🆔, 💾) que la carte montre déjà en grand juste
       au-dessus. */
    const partsNote = (typeof morceauxDeNotePreparee === 'function')
      ? morceauxDeNotePreparee(cours.note)
      : { entete: '', corps: String(cours.note || ''), consigne: '' };

    /* La formation prime, même sur une note écrite avant qu'elle ne
       change : un élève passé en passerelle ne doit plus voir la
       frise ni la date d'examen de son parcours d'avant, sans
       attendre que la réparation passe. */
    if(typeof noteSelonLaFormation === 'function'){
      partsNote.corps = noteSelonLaFormation(partsNote.corps, formation,
                                             cours.modele);
    }

    /* À quelle leçon on en est : en gros, en vert, juste sous le
       nom. C'est la première question qu'on se pose en ouvrant sa
       journée, et elle se perdait au milieu du reste. */
    const pos = (typeof lignePosition === 'function')
      ? lignePosition(partsNote.corps) : '';

    const ligneRang = document.createElement('div');
    ligneRang.style.cssText = 'display:flex;gap:7px;align-items:center;' +
      'margin:3px 0 2px;flex-wrap:wrap;';

    if(pos){
      const p = document.createElement('div');
      /* Toute la largeur pour elle : partagée avec les deux cases,
         elle se retrouvait comprimée à un mot par ligne. */
      p.style.cssText = 'font-size:15px;font-weight:800;line-height:1.35;' +
        'color:var(--accent-text);flex:1 1 100%;min-width:0;';
      p.textContent = pos;
      ligneRang.appendChild(p);
    }

    /* LA CASE DU NUMÉRO DE LEÇON

       Le rang du cours que le moniteur va faire en appuyant sur
       Ouvrir — pas les leçons déjà faites. C'est celui qu'on lit
       sur Drivup, et c'est pour ça qu'il se tape ici : plus vite
       qu'en ouvrant le questionnaire, et au moment où on le voit.

       Ce qu'un humain tape est un fait : le recomptage du classeur
       ne repasse pas derrière, et les cours suivants repartent de
       ce rang-là. Corrigé une fois, l'élève est calé.

       Seulement sur une séance qui a un rang : un examen ou un
       simulateur n'en ont pas, et leur en donner un décalerait
       toute la frise. */
    if(typeof leconCompteDansLaFrise === 'function' &&
       leconCompteDansLaFrise(cours.modele)){
      const boite = document.createElement('input');
      boite.type = 'text';
      boite.inputMode = 'numeric';
      boite.placeholder = 'n°';
      boite.title = 'Numéro de la leçon qui va être faite';
      const rangEcrit = (typeof numeroLeconDuCours === 'function')
        ? numeroLeconDuCours(cours) : null;
      boite.value = (rangEcrit !== null && rangEcrit !== undefined)
        ? String(rangEcrit) : '';
      boite.style.cssText = 'width:46px;margin:0;padding:3px 4px;font-size:13px;' +
        'text-align:center;flex-shrink:0;font-variant-numeric:tabular-nums;' +
        'background:var(--navy);border:1px solid var(--line);';

      boite.addEventListener('change', async () => {
        const n = parseInt(String(boite.value).replace(/\D/g, ''), 10);
        if(isNaN(n) || n <= 0 || n === rangEcrit){
          boite.value = (rangEcrit !== null) ? String(rangEcrit) : '';
          return;
        }
        boite.disabled = true;
        boite.style.borderColor = 'var(--orange)';
        try{
          await ecrireRangDuCours(cours, n);
          boite.style.borderColor = 'var(--line)';
          afficherPrepares(false);
        }catch(e){
          boite.style.borderColor = 'var(--red)';
          showToast('Impossible : ' + e.message);
        }finally{
          boite.disabled = false;
        }
      });
      /* Les cases sur leur propre ligne, sous la phrase : sur un
         téléphone, quatre éléments côte à côte ne tiennent pas. */
      const ligneCases = document.createElement('div');
      ligneCases.style.cssText = 'display:flex;gap:5px;align-items:center;' +
        'flex-wrap:wrap;flex-basis:100%;';
      ligneCases.appendChild(boite);
      /* « 1ère », pas « 1ème » : la terminaison suit le nombre, et
         elle le suit aussi quand on le change. */
      const dit1 = document.createElement('span');
      dit1.style.cssText = 'font-size:11px;color:var(--muted);flex-shrink:0;';
      const majDit1 = () => {
        dit1.textContent = suffixeRang(boite.value) + ' leçon';
      };
      majDit1();
      boite.addEventListener('input', majDit1);
      ligneCases.appendChild(dit1);
      ligneRang.appendChild(ligneCases);

      /* LA DEUXIÈME CASE : DEPUIS LA CHARNIÈRE.

         Elle n'apparaît que derrière une charnière — avant, le
         rang d'après n'a pas de sens. Ce qu'elle enregistre n'est
         pas le rang d'après, qui vieillirait d'un cours à l'autre,
         mais le nombre de leçons faites AVANT la charnière : écrit
         une fois, l'élève est calé pour toute la suite. */
      /* La charnière la plus récente, et elle se demande aux
         sources qui font foi : un post-permis vit dans le suivi,
         pas dans le contexte du cours. Sans elle, la case disait
         « après exam blanc » à un élève qui a passé son
         post-permis — la charnière d'avant, donc la mauvaise. */
      const ctxCours = Object.assign(
        {}, contexteEnObjet(cours.contexte),
        (typeof etatQuiFaitFoi === 'function') ? etatQuiFaitFoi(cours.eleve) : {});

      /* LA MÊME FONCTION QUE LE QUESTIONNAIRE.

         Cette carte avait sa propre table de charnières. Elle
         ignorait donc l'ajournement, ajouté ailleurs : la carte
         d'Amadou annonçait « REPRISE APRÈS LE DERNIER AJOURNEMENT »
         et proposait, juste en dessous, « et la 1ère après exam
         blanc ». Deux endroits pour une même règle, deux réponses. */
      const charn = (typeof charniereDuCours === 'function')
        ? charniereDuCours(ctxCours, cours.note) : null;

      if(charn && typeof rangDepuisLaCharniere === 'function'){
        /* « ème leçon », puis « et la … ème après » : ce sont deux
           rangs, pas une part d'un tout. « Dont », qu'on lisait
           avant, sous-entendait le contraire. */
        const apres = document.createElement('span');
        apres.style.cssText = 'font-size:11px;color:var(--muted);flex-shrink:0;';
        apres.textContent = '· et la';
        ligneCases.appendChild(apres);

        const bDep = document.createElement('input');
        bDep.type = 'text';
        bDep.inputMode = 'numeric';
        bDep.placeholder = 'n°';
        bDep.title = 'La combientième leçon depuis ' + charn.court;
        /* Ce que la carte annonce déjà, à défaut de réponse
           enregistrée : la case ne doit pas rester vide sous une
           ligne qui dit « 4ème leçon après l'examen blanc ». */
        const dejaDit = rangDepuisLaCharniere(ctxCours, rangEcrit, charn.cle);
        const depEcrit = (dejaDit !== null && dejaDit !== undefined)
          ? dejaDit : rangApresDansLaNote(cours.note);
        bDep.value = (depEcrit !== null) ? String(depEcrit) : '';
        bDep.style.cssText = boite.style.cssText;

        bDep.addEventListener('change', async () => {
          const n = parseInt(String(bDep.value).replace(/\D/g, ''), 10);
          const avant = (typeof avantLaCharniere === 'function')
            ? avantLaCharniere(rangEcrit, n) : '';
          /* Rien de neuf, ou un chiffre qui ne peut pas être vrai —
             plus de leçons depuis la charnière qu'en tout : on
             remet ce qui était là plutôt que d'enregistrer une
             contradiction. */
          if(avant === '' || n === depEcrit){
            bDep.value = (depEcrit !== null) ? String(depEcrit) : '';
            if(avant === '' && !isNaN(n)){
              showToast('Impossible : ' + n + ' depuis ' + charn.court +
                        ', pour ' + rangEcrit + ' leçons en tout.');
            }
            return;
          }
          bDep.disabled = true;
          bDep.style.borderColor = 'var(--orange)';
          try{
            await ecrireAvantCharniere(cours, charn.cle, avant);
            bDep.style.borderColor = 'var(--line)';
            afficherPrepares(false);
          }catch(e){
            bDep.style.borderColor = 'var(--red)';
            showToast('Impossible : ' + e.message);
          }finally{
            bDep.disabled = false;
          }
        });
        ligneCases.appendChild(bDep);

        const fin = document.createElement('span');
        fin.style.cssText = 'font-size:11px;color:var(--muted);flex-shrink:0;';
        const majFin = () => {
          fin.textContent = suffixeRang(bDep.value) + ' après ' + charn.court;
        };
        majFin();
        bDep.addEventListener('input', majFin);
        ligneCases.appendChild(fin);
      }
    }

    if(ligneRang.childNodes.length) meta.appendChild(ligneRang);

    /* CE QUI MANQUE SE DIT, ET S'OUVRE.

       Le questionnaire ne s'ouvre plus au départ : ce qui manque
       doit donc se lire ici, nommément — « il manque la formation »
       est utile, un point rouge ne l'est pas. Et la phrase ouvre
       l'écran qui le règle, pour ne pas avoir à le chercher.

       Rien ne s'affiche quand tout est là : une ligne qui dit que
       tout va bien sur chaque carte ne se lit plus au bout de
       trois jours. */
    const manqueIci = (typeof cequiManqueAuCours === 'function')
      ? cequiManqueAuCours(contexteEnObjet(cours.contexte), cours.eleve, cours.modele)
      : [];

    if(manqueIci.length){
      const av = document.createElement('div');
      /* La même taille et la même graisse que la ligne de position :
         ce qui manque se lit d'aussi loin que le rang de la leçon,
         parce que c'est ce qui empêche la note d'être juste. */
      av.style.cssText = 'font-size:15px;font-weight:800;line-height:1.35;' +
        'color:var(--warn-text);margin:2px 0 2px;cursor:pointer;';
      av.textContent = '⚠️ Il manque ' + manqueIci.join(' et ') +
                       ' — ✏️ pour compléter';
      av.title = 'Ouvrir le questionnaire de ' + cours.eleve;
      av.addEventListener('click', () => completerLesInfosDuCours(cours));
      meta.appendChild(av);
    }

    /* Le type de bilan et la formation VIENNENT APRÈS : la leçon du
       jour passe en premier, juste sous le nom. */
    meta.appendChild(sous);

    /* Le poste de conduite, sur sa ligne à lui : c'est ce que le
       moniteur doit savoir AVANT que l'élève arrive, pour régler la
       voiture. Il vient de la fiche — un élève qui a besoin du
       coussin en a besoin à toutes ses leçons — et il se corrige
       ici d'un clic, sans rien ouvrir.

       Ces deux cases n'ouvrent RIEN et ne bloquent RIEN : elles
       s'affichent, elles se cochent, c'est tout. */
    if(typeof posteDeConduite === 'function'){
      const poste = document.createElement('div');
      poste.style.cssText = 'display:flex;gap:6px;align-items:center;' +
        'flex-wrap:wrap;margin:2px 0 1px;';
      [['amenagee', '♿', 'Conduite aménagée'],
       ['coussin', '🟩', 'Coussin vert']].forEach(([champ, emoji, titre]) => {
        const b = document.createElement('button');
        b.className = 'btn btn-secondary';
        b.title = titre + ' — cliquer pour changer';
        const peindre = () => {
          const actif = posteDeConduite(cours.eleve)[champ];
          b.style.cssText = 'width:auto;margin:0;padding:4px 9px;font-size:12px;' +
            'line-height:1.4;opacity:' + (actif ? '1' : '.35') + ';' +
            (actif ? 'border-color:var(--accent-text);color:var(--accent-text);' : '');
          /* Quels aménagements, et pas seulement qu'il y en a :
             c'est ce que le moniteur doit lire avant de préparer
             la voiture. */
          const detail = (champ === 'amenagee' && actif &&
                          typeof amenagementsDe === 'function')
            ? amenagementsDe(cours.eleve)
                .map(c => (typeof libelleAmenagement === 'function')
                  ? libelleAmenagement(c) : c).join(' · ')
            : '';
          b.textContent = emoji + (actif ? ' ' + (detail || titre) : '');
        };
        peindre();
        b.addEventListener('click', async () => {
          const avant = posteDeConduite(cours.eleve)[champ];
          /* La conduite aménagée ne se coche pas à l'aveugle : on
             demande QUOI monter dans la voiture, et sans réponse la
             case ne se coche pas. La décocher, elle, ne demande
             rien. */
          if(champ === 'amenagee' && !avant){
            await choisirLesAmenagements(cours.eleve);
            peindre();
            return;
          }
          b.disabled = true;
          await ecrirePosteDeConduite(cours.eleve, champ, !avant);
          b.disabled = false;
          peindre();
        });
        poste.appendChild(b);
      });
      meta.appendChild(poste);
    }

    let reste = (typeof sansLignePosition === 'function')
      ? sansLignePosition(partsNote.corps) : partsNote.corps;

    /* Le poste de conduite est déjà sur ses deux pastilles, juste
       au-dessus : le relire en texte dans la note ferait deux fois
       la même information sur la même carte. On le retire de
       l'AFFICHAGE seulement — la note continue de le porter, parce
       que le bilan et l'historique le lisent là.

       EXACTEMENT ces deux libellés, et rien d'autre : « ♿ Conduite
       aménagée — commandes au volant » dit quelque chose que la
       pastille ne sait pas dire, et doit rester lisible. */
    /* L'HEURE EST DÉJÀ EN GROS, TOUT EN HAUT.

       Elle appartient à l'en-tête de la note. Les cours préparés
       avant qu'on cesse de la recopier la portent encore dans leur
       texte — parfois deux fois, une par reprise. Elle se retire
       de l'AFFICHAGE, comme le poste de conduite : la note
       continue de la porter, c'est l'écran qui cesse de la redire.

       Seulement quand le segment ne dit QUE ça : « 🕐 15h00
       rendez-vous devant la mairie » est un mot du moniteur, et il
       reste. */
    const RIEN_QUE_ENTETE = /^(?:🕐\s*\d{1,2}\s*[h:]\s*\d{0,2}|🆔|💾|\s)+$/;

    const DEJA_SUR_LA_CARTE = ['♿ Conduite aménagée', '🟩 Coussin vert'];
    const sansRedites = t => String(t || '').split('\n').map(l =>
      l.split(' · ')
       .filter(s => DEJA_SUR_LA_CARTE.indexOf(s.trim()) === -1)
       .filter(s => !RIEN_QUE_ENTETE.test(s.trim()))
       /* Une frise à trous n'apprend rien et fait croire à une
          frise : la carte dit déjà qu'elle manque, juste au-dessus. */
       .filter(s => !(/le[çc]ons? de 2h/i.test(s) &&
                      typeof friseUtilisable === 'function' &&
                      !friseUtilisable(s)))
       .join(' · ')
    ).filter(Boolean).join('\n');

    reste = sansRedites(reste);
    /* Le 📌 aussi : c'est là que les heures recopiées s'étaient
       accumulées. */
    const consigne = sansRedites(partsNote.consigne);

    const texteNote = [reste, consigne ? '📌 ' + consigne : '']
      .filter(Boolean).join('\n');

    if(texteNote){
      const n = document.createElement('span');
      n.style.cssText = 'color:var(--accent-text);white-space:pre-wrap;';
      /* La ligne d'examen ressort en couleur : c'est ce qu'on
         cherche en premier dans une note. */
      if(typeof colorerNote === 'function'){
        colorerNote(n, texteNote);
      }else{
        n.textContent = texteNote;
      }
      meta.appendChild(n);
    }
    row.appendChild(meta);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;flex-shrink:0;align-items:center;';

    /* Un cours donné à quelqu'un d'autre ne s'ouvre plus : le
       moniteur le voit, mais doit se le réattribuer pour le faire. */
    const aMoiOuvrir = !cours.moniteur ||
      normaliserMot(cours.moniteur) === normaliserMot(ACCES.moniteur || '');

    if(aMoiOuvrir || ACCES.role === 'admin'){
      const bOuvrir = document.createElement('button');
      bOuvrir.className = 'btn btn-primary';
      bOuvrir.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;';
      bOuvrir.textContent = '▶ Ouvrir';
      bOuvrir.title = aMoiOuvrir ? 'Démarrer ce cours'
                                 : 'Ouvrir (administrateur)';
      bOuvrir.addEventListener('click', async () => {
        /* Retour immédiat : l'ouverture demande plusieurs allers-retours
           avec Google, et un bouton muet se fait marteler. */
        if(bOuvrir.disabled) return;
        bOuvrir.disabled = true;
        const avant = bOuvrir.textContent;
        bOuvrir.textContent = '⏳ Ouverture…';
        try{
          await chargerPrepare(cours);
        }finally{
          bOuvrir.disabled = false;
          bOuvrir.textContent = avant;
        }
      });
      actions.appendChild(bOuvrir);
    }else{
      const bReprendre = document.createElement('button');
      bReprendre.className = 'btn btn-secondary';
      bReprendre.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;';
      bReprendre.textContent = '↩️ Reprendre';
      bReprendre.title = 'Ce cours est à ' + cours.moniteur +
                         '. Le reprendre pour pouvoir l\'ouvrir.';
      bReprendre.addEventListener('click', async () => {
        if(!await confirmer('Ce cours est attribué à ' + cours.moniteur + '.\n\n' +
            'Le reprendre à ton nom ?')) return;
        bReprendre.disabled = true;
        bReprendre.textContent = '⏳ Reprise…';
        try{
          await appelPrep({ action: 'prepAssign', id: cours.id,
                            moniteur: ACCES.moniteur });
          const dans = prepares.find(x => String(x.id) === String(cours.id));
          if(dans) dans.moniteur = ACCES.moniteur;
          showToast('Cours repris ✅');
          await afficherPrepares(false);
        }catch(e){
          showToast('Reprise impossible : ' + e.message);
          bReprendre.disabled = false;
          bReprendre.textContent = '↩️ Reprendre';
        }
      });
      actions.appendChild(bReprendre);
    }

    /* Monter ou descendre dans la journée : le moniteur range ses
       cours dans l'ordre où il les fera. */
    [['▲', -1, 'Monter'], ['▼', 1, 'Descendre']].forEach(([signe, sens, quoi]) => {
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;padding:9px 8px;font-size:12px;';
      b.textContent = signe;
      b.title = quoi + ' dans la journée';
      b.addEventListener('click', async () => {
        /* Les cours du jour tels qu'ils sont affichés, filtres
           compris : déplacer par rapport à une liste invisible
           donnait l'impression que rien ne bougeait. */
        const duJour = listeAffichee.filter(x => x.date === cours.date);
        const i = duJour.findIndex(x => String(x.id) === String(cours.id));
        const j = i + sens;
        if(i === -1 || j < 0 || j >= duJour.length){
          showToast(sens < 0 ? 'Déjà en premier' : 'Déjà en dernier');
          return;
        }

        /* On permute, puis on renumérote la journée entière */
        const tmp = duJour[i];
        duJour[i] = duJour[j];
        duJour[j] = tmp;
        duJour.forEach((x, n) => { x.ordre = n + 1; });

        await afficherPrepares(false);
        try{
          await appelPrep({ action: 'prepOrdre',
                            ids: JSON.stringify(duJour.map(x => x.id)) });
        }catch(e){
          showToast('Ordre non enregistré : ' + e.message);
        }
      });
      actions.appendChild(b);
    });

    /* Changer la date : une erreur de saisie ne doit pas obliger à
       tout refaire. Le cours se déplace dans le bon tiroir. */
    const bDate = document.createElement('button');
    bDate.className = 'btn btn-secondary';
    bDate.style.cssText = 'width:auto;padding:9px 10px;font-size:13px;';
    bDate.textContent = '📅';
    bDate.title = 'Changer la date et l\'heure de ce cours';

    /* Les mentions oubliées au rappel : elles vivent en tête de
       note, au même endroit que l'heure. */
    const bMent = document.createElement('button');
    bMent.className = 'btn btn-secondary';
    bMent.style.cssText = 'width:auto;padding:8px 10px;font-size:14px;margin:0;' +
      'flex-shrink:0;';
    bMent.textContent = '🆔';
    bMent.title = 'Carte d\'identité, carte SD';
    bMent.addEventListener('click', () => ouvrirMentions(cours));
    bDate.addEventListener('click', async () => {
      const hAvant = heureDeLaPreparation(cours);
      const rep = await demanderDate('Cours de ' +
                                     (cours.eleve || 'cet élève'),
                                     cours.date, hAvant);
      if(!rep) return;

      const neuve = rep.date;
      const heure = rep.heure || '';
      if(neuve === cours.date && heure === hAvant) return;

      /* L'heure vit en tête de note, comme celle des rappels */
      let note = String(cours.note || '');
      note = note.replace(/^🕐[^\n]*\n?/, '');
      if(heure){
        note = '🕐 ' + heure.replace(':', 'h') + '\n' + note;
      }

      bDate.disabled = true;
      bDate.textContent = '⏳';
      try{
        await appelPrep({ action: 'prepAdd', id: cours.id, date: neuve,
                          eleve: cours.eleve, modele: cours.modele,
                          modeleLabel: cours.modeleLabel || '',
                          site: cours.site || '',
                          note: note,
                          contexte: JSON.stringify(cours.contexte || {}),
                          moniteur: cours.moniteur || ACCES.moniteur || '' });
        const dans = prepares.find(x => String(x.id) === String(cours.id));
        if(dans){ dans.date = neuve; dans.note = note; }
        showToast(heure !== hAvant ? 'Date et heure modifiées ✅'
                                   : 'Date modifiée ✅');
        await afficherPrepares(false);
      }catch(e){
        showToast('Modification impossible : ' + e.message);
        bDate.disabled = false;
        bDate.textContent = '📅';
      }
    });
    actions.appendChild(bDate);
    actions.appendChild(bMent);

    /* Un cours passé qui traîne encore : le moniteur le retire
       lui-même, sans attendre le recoupement automatique. */
    if(passe){
      const bFait = document.createElement('button');
      bFait.className = 'btn btn-secondary';
      bFait.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;' +
        'color:var(--accent-text);border-color:var(--orange);';
      bFait.textContent = '✓ Fait';
      bFait.title = 'Ce cours a eu lieu — le retirer de la liste';
      bFait.addEventListener('click', async () => {
        if(!await confirmer('Retirer ce cours de la liste ?\n\n' +
            cours.eleve + ' — ' + (dateEnToutesLettres(cours.date) || cours.date) +
            "\n\nSon bilan reste enregistré : on retire seulement la " +
            'préparation, qui n\'a plus lieu d\'être.')) return;
        bFait.disabled = true;
        bFait.textContent = '…';
        try{
          await appelPrep({ action: 'prepDelete', id: cours.id });
          showToast('Retiré ✅');
          afficherPrepares();
        }catch(e){
          showToast('Impossible : ' + e.message);
          bFait.disabled = false;
          bFait.textContent = '✓ Fait';
        }
      });
      actions.appendChild(bFait);
    }

    /* Modifier la préparation : rouvrir le questionnaire et le
       réenregistrer. Sans ça, une erreur de saisie obligeait à
       supprimer la préparation et à tout refaire. */
    const bMod = document.createElement('button');
    bMod.className = 'btn btn-secondary';
    /* Plus gros et en couleur SEULEMENT quand il manque quelque
       chose : grossir les huit boutons de toutes les lignes ne
       ferait ressortir aucune. Ce sont les cartes qui réclament
       quelque chose qui doivent sauter aux yeux. */
    bMod.style.cssText = manqueIci.length
      ? 'width:auto;padding:11px 15px;font-size:20px;line-height:1;' +
        'border-color:var(--orange);color:var(--orange);'
      : 'width:auto;padding:9px 12px;font-size:13px;';
    bMod.textContent = '✏️';
    bMod.title = manqueIci.length
      ? 'Il manque ' + manqueIci.join(' et ') + ' — modifier la préparation'
      : 'Modifier la préparation de ' + cours.eleve;
    bMod.addEventListener('click', async () => {
      if(bMod.disabled) return;
      bMod.disabled = true;
      try{
        await modifierPreparation(cours);
      }finally{ bMod.disabled = false; }
    });
    actions.appendChild(bMod);

    const bDonner = document.createElement('button');
    bDonner.className = 'btn btn-secondary';
    bDonner.style.cssText = 'width:auto;padding:9px 10px;font-size:13px;';
    bDonner.textContent = '👤';
    bDonner.title = 'Donner ce cours à un autre moniteur';
    bDonner.addEventListener('click', async () => {
      /* La liste des moniteurs peut manquer : on le dit, sinon le
         bouton semble bloqué pendant la lecture. */
      if(!moniteursActifs.length){
        bDonner.disabled = true;
        bDonner.textContent = '⏳';
        try{ await chargerMoniteurs(); }
        finally{ bDonner.disabled = false; bDonner.textContent = '👤'; }
      }
      const cible = await choisirDansListe(
        'Donner le cours de ' + (cours.eleve || 'cet élève') + ' à :',
        moniteursActifs, cours.moniteur || '');
      if(!cible) return;
      bDonner.disabled = true;
      bDonner.textContent = '⏳';
      try{
        await appelPrep({ action: 'prepAssign', id: cours.id, moniteur: cible });
        /* La ligne en mémoire suit : relire toute la liste pour un
           champ que le serveur vient de confirmer faisait attendre
           le moniteur une seconde de plus pour rien. */
        const dans = prepares.find(x => String(x.id) === String(cours.id));
        if(dans) dans.moniteur = cible;
        showToast('Cours donné à ' + cible + ' ✅');
        await afficherPrepares(false);
      }catch(e){
        showToast('Transfert impossible : ' + e.message);
        bDonner.disabled = false;
        bDonner.textContent = '👤';
      }
    });
    actions.appendChild(bDonner);

    /* On ne supprime que ses propres préparations, sauf administrateur */
    /* Seul le moniteur à qui le cours est attribué peut le supprimer.
       Une préparation sans moniteur ne l'est que par un administrateur. */
    const aMoi = !!cours.moniteur &&
                 normaliserMot(cours.moniteur) === normaliserMot(ACCES.moniteur || '');
    if(aMoi || ACCES.role === 'admin'){
      const bSupp = document.createElement('button');
      bSupp.className = 'btn btn-secondary';
      bSupp.style.cssText = 'width:auto;padding:9px 10px;font-size:13px;color:var(--red);border-color:var(--red);';
      bSupp.textContent = '✕';
      bSupp.title = aMoi ? 'Supprimer ce cours préparé'
                         : 'Supprimer (administrateur)';
      bSupp.addEventListener('click', async () => {
        if(!await confirmer('Supprimer ce cours préparé ?' +
                    (aMoi ? '' : '\n\nIl est attribué à ' + cours.moniteur +
                      (cours.preparePar && cours.preparePar !== cours.moniteur
                        ? ' et a été préparé par ' + cours.preparePar : '') + '.'))) return;
        bSupp.disabled = true;
        try{
          const r = await appelPrep({ action: 'prepDelete', id: cours.id });
          if(r && r.status === 'error'){ showToast(r.message); bSupp.disabled = false; return; }
          afficherPrepares();
        }catch(e){
          showToast('Suppression impossible : ' + e.message);
          bSupp.disabled = false;
        }
      });
      actions.appendChild(bSupp);
    }else{
      const info = document.createElement('span');
      info.style.cssText = 'font-size:11px;color:var(--muted);flex-shrink:0;max-width:70px;line-height:1.3;';
      /* C'est l'attributaire qui compte ici : le cours est à lui. */
      info.textContent = 'à ' + cours.moniteur;
      actions.appendChild(info);
    }

    row.appendChild(actions);
    /* Dans le tiroir du jour, pas dans la liste générale */
    (tiroir || zone).appendChild(row);
  });
}

/* Retire de la liste la préparation du cours qui vient d'être fait.
   Ciblée : les autres cours du même élève sont conservés. */
async function retirerPreparationFaite(){
  let cible = prepareEnCours;

  /* Cours démarré sans passer par la liste : on retrouve sa
     préparation. La liste locale peut être vide ou périmée si le
     moniteur n'a jamais ouvert l'onglet — on relit alors le serveur. */
  if(!cible && currentLessonMeta && currentLessonMeta.studentName){
    const nom = normaliserMot(currentLessonMeta.studentName);
    const jour = $('lessonDate') ? $('lessonDate').value : '';

    let liste = prepares || [];
    if(!liste.length){
      try{
        const d = await appelPrep({ action: 'prepList' });
        liste = (d && d.preparations) || [];
      }catch(e){ liste = []; }
    }

    const siennes = liste.filter(x => normaliserMot(x.eleve || '') === nom);

    /* Celle du jour en priorité ; sinon la plus ancienne encore
       en attente, qui est forcément celle qu'on vient de faire. */
    cible = siennes.find(x => x.date === jour) ||
            siennes.filter(x => !jour || x.date <= jour)
                   .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0] ||
            null;
  }
  if(!cible) return;

  try{
    await appelPrep({ action: 'prepDelete', id: cible.id });
    prepareEnCours = null;
    afficherPrepares();
  }catch(e){
    console.warn('Préparation non retirée :', e);
  }
}


/* ---------- Côté moniteur : le rendez-vous post-permis ---------- */
/* rdvPostEnCours : déclaré dans ec-etat.js */

/* Charge un cours préparé dans le formulaire : les informations sont
   rafraîchies sans effacer ce que le moniteur avait saisi. */
let ouvertureEnCours = false;

async function chargerPrepare(cours){
  /* Deux appuis rapprochés ne doivent pas lancer deux ouvertures */
  if(ouvertureEnCours) return;
  ouvertureEnCours = true;
  try{
    return await chargerPrepareInterne(cours);
  }finally{
    ouvertureEnCours = false;
  }
}

async function chargerPrepareInterne(cours){
  /* Garde-fou : masquer un bouton ne suffit pas. Un cours attribué
     à quelqu'un d'autre ne se démarre pas sans se le réattribuer. */
  if(cours && cours.moniteur && ACCES.role !== 'admin' &&
     normaliserMot(cours.moniteur) !== normaliserMot(ACCES.moniteur || '')){
    await informer('Ce cours est attribué à ' + cours.moniteur + '.\n\n' +
      'Reprends-le à ton nom avant de le démarrer.');
    return;
  }

  /* UN SEUL COURS OUVERT À LA FOIS.

     On ne regardait que la dictée : un bilan généré et pas encore
     enregistré, une fiche manuelle à moitié remplie, un micro qui
     tourne — rien de tout cela n'arrêtait l'ouverture, et le cours
     précédent restait affiché sous le nouveau.

     Fermer ne veut pas dire perdre : la dictée part sur le serveur
     avant qu'on écrase l'écran, et le cours se retrouve dans
     « Cours non terminés ». */
  if(typeof travailEnCoursMoniteur === 'function' && travailEnCoursMoniteur()){
    const ouvert = ($('studentName') && $('studentName').value.trim()) || 'Un autre';
    if(!await confirmer(
        'Le cours de ' + ouvert + ' est encore ouvert.\n\n' +
        ouOnRetrouveLeCoursOuvert() + ' Ouvrir celui de ' +
        (cours.eleve || 'cet élève') + ' à la place ?', 'Ouvrir quand même')) return;

    /* Le dernier instant où la dictée de l'autre est encore
       lisible à l'écran : après, elle est écrasée. */
    if(typeof deposerBrouillonServeur === 'function'){
      try{ await deposerBrouillonServeur(); }catch(e){}
    }
    if(typeof fermerLeCoursOuvert === 'function') fermerLeCoursOuvert();
  }

  /* Un rendez-vous post-permis ne passe pas par l'enregistrement */
  if(cours.modele === 'rdv-post'){
    ouvrirRdvPost(cours);
    return;
  }

  prepareEnCours = cours;

  if(cours.modele) $('modele').value = cours.modele;
  /* Le modèle décide de ce qui s'affiche : micro ou saisie */
  if(typeof adapterAuModele === 'function') adapterAuModele();
  $('studentName').value = cours.eleve || '';
  if(cours.site) $('site').value = cours.site;
  if(cours.date) $('lessonDate').value = cours.date;

  let contexte = cours.contexte || null;
  let note = cours.note || '';

  /* La vérification « un cours a-t-il eu lieu depuis ? » demande une
     lecture complète du classeur : plusieurs secondes de démarrage
     à froid. On n'attend pas — l'écran s'ouvre tout de suite avec la
     préparation, et se met à jour si nécessaire. */
  if(contexte){
    chargerDossierEleve(cours.eleve).then(d => {
      const source = contexte.source || '';
      if(!d.dernierHorodatage || d.dernierHorodatage === source) return;

      /* Un cours a eu lieu depuis : on repart de son état, en gardant
         tout ce que le moniteur avait renseigné à la préparation. */
      const frais = defautsDepuisNote(d.derniereNote);
      if(d.frise) frais.frise = d.frise;
      /* Un rang qu'on n'a pas le droit d'affirmer ne s'écrit pas :
         zéro bilan au classeur n'est pas une « 1ère leçon ». */
      const debut = cestLePremierCours(contexte.premierCours) ||
                    cestLePremierCours(cours.note);
      const rang = rangConnu(d.lecons, cours.modele, debut);
      if(rang !== null) frais.lecon = String(rang);
      frais.sansBilan = (rang === null);
      frais.manoeuvresFaites = d.manoeuvres.length;
      frais.totalManoeuvres = BLOC.ficheListeConduite.length;
      frais.leconsDepuisEB = d.leconsDepuisEB;
      frais.leconsDepuisRdvPost = d.leconsDepuisRdvPost;
      frais.leconsParBoite = d.leconsParBoite;

      contexte = fusionnerContexte(contexte, frais);
      contexte.source = d.dernierHorodatage;
      contexteDepart = contexte;

      const majNote = noteDepuisQuestionnaire(contexte);
      /* On n'écrase pas ce que le moniteur aurait déjà modifié */
      if($('noteInterne').value === note){
        $('noteInterne').value = majNote;
        if(typeof majAffichageNoteInterne === 'function') majAffichageNoteInterne();
      }
      showToast('Infos mises à jour depuis le dernier cours ✅');
    }).catch(() => { /* hors ligne : la préparation suffit */ });
  }

  $('noteInterne').value = note;

  /* Le questionnaire a déjà été rempli à la préparation : on ne le redemande pas */
  contexteDepart = contexte;
  /* Le bouton doit dire tout de suite ce qui manque sur CET élève :
     il ne se recalcule pas tout seul en changeant de cours. */
  if(typeof majBoutonCompleter === 'function') majBoutonCompleter();
  noteQuestionnaire = note;

  finalTranscript = '';
  committedTranscript = '';
  $('transcriptBox').value = '';
  $('transcriptBox').style.display = 'none';
  $('transcriptAide').style.display = 'none';
  $('compteur').style.display = 'none';
  $('finishBtn').style.display = 'none';
  $('resultView').style.display = 'none';
  /* On bascule sur l'onglet Cours : depuis la liste des préparés,
     l'écran d'enregistrement restait masqué par sa classe d'onglet. */
  if(typeof afficherOnglet === 'function') afficherOnglet('cours');
  $('recordView').classList.remove('hors-onglet', 'hors-vue');

  $('recordView').style.display = 'block';
  $('recBtn').textContent = '🎙️ Démarrer le cours';
  $('status').textContent = 'Cours préparé — tu peux démarrer directement.';

  /* Après ces réécritures, pas avant : le bouton et le statut
     étaient remis en mode vocal alors que le bilan se remplit à
     la main. Un examen blanc préparé rouvrait avec le micro. */
  if(typeof adapterAuModele === 'function') adapterAuModele();

  verifierNomEleve('studentName', 'studentInfo', true);

  /* Le résumé du cours précédent, comme lors d'une saisie normale :
     le moniteur doit voir ce qui a été travaillé avant de démarrer. */
  if(typeof chargerHistoriqueEleve === 'function') chargerHistoriqueEleve();
  afficherPreparationEleve();
  chargerHistoriqueEleve();

  /* Les deux panneaux dès l'ouverture : la fiche véhicule montre
     ce qui est déjà acquis, avec la marque du moniteur qui l'a
     validé. Elle n'apparaissait qu'au lancement du micro, donc
     seules les cases cochées à la préparation se voyaient. */
  if(typeof afficherEnteteDuCours === 'function') afficherEnteteDuCours();
  if(typeof afficherFicheDuCours === 'function') afficherFicheDuCours();

  /* Le module de cours est en bas de l'onglet : sans ce défilement,
     le moniteur croit qu'il ne s'est rien passé et descend à la
     main. On attend l'affichage, sinon la position est fausse. */
  amenerAuCours();
  showToast('Cours de ' + (cours.eleve || 'l\'élève') + ' chargé ✅');
}

/* Prépare un nouveau cours : questionnaire complet, puis mise en réserve */
async function preparerNouveauCours(){
  const eleve = $('prepEleve').value.trim();
  const date = $('prepDate').value;
  const heurePrep = $('prepHeure') ? $('prepHeure').value : '';
  const modeleCle = $('prepModele').value;

  if(eleve.length < 2){
    showToast("Saisis le nom de l'élève.");
    return;
  }

  /* Le questionnaire lit le formulaire principal : on l'alimente le temps de la préparation */
  const sauve = {
    eleve: $('studentName').value,
    modele: $('modele').value,
    date: $('lessonDate').value
  };
  $('studentName').value = eleve;
  $('modele').value = modeleCle;
  if(typeof adapterAuModele === 'function') adapterAuModele();
  $('lessonDate').value = date;

  const btnPrep = $('prepBtn');
  btnPrep.disabled = true;
  btnPrep.textContent = 'Ouverture…';

  let rep = null;
  try{
    /* Réduit : on ne demande que ce qui manque, et rien du tout
       quand rien ne manque. Le questionnaire complet reste à un
       clic, sous « Tout revoir » — ou par le crayon de la carte
       une fois le cours préparé. */
    rep = await ouvrirQuestionnaireDepart(null, 'Préparer le cours de ' + eleve,
                                          'Enregistrer', true);
  }finally{
    btnPrep.disabled = false;
    btnPrep.textContent = '📝 Préparer les notes';
    $('studentName').value = sauve.eleve;
    $('modele').value = sauve.modele;
    if(typeof adapterAuModele === 'function') adapterAuModele();
    $('lessonDate').value = sauve.date;
  }
  if(!rep) return;

  const btn = $('prepBtn');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';
  try{
    const cle = rep.modele || modeleCle;
    const nouveau = {
      date: date,
      eleve: eleve,
      modele: cle,
      modeleLabel: (MODELES[cle] || {}).label || '',
      site: $('site').value,
      /* L'heure en tête de note : même endroit que les rappels,
         donc lue partout de la même façon. */
      note: (heurePrep ? '🕐 ' + heurePrep.replace(':', 'h') + '\n' : '') +
            noteDepuisQuestionnaire(rep),
      contexte: JSON.stringify(rep),
      /* À qui revient le cours, et qui l'a préparé : deux choses
         différentes dès qu'on prépare pour un collègue. */
      moniteur: ($('prepPour') && $('prepPour').value) || ACCES.moniteur || '',
      preparePar: ACCES.moniteur || ''
    };

    const r = await appelPrep(Object.assign({ action: 'prepAdd' }, nouveau));

    $('prepEleve').value = '';
    if($('prepInfo')) $('prepInfo').textContent = '';
    if($('prepHistorique')){ $('prepHistorique').style.display = 'none'; }

    /* On ajoute le cours à la liste en mémoire plutôt que de tout
       relire : le serveur vient de le confirmer, il n'y a rien à
       aller rechercher. L'affichage est immédiat. */
    prepares.push(Object.assign({}, nouveau, {
      id: (r && r.id) || String(Date.now()),
      contexte: rep
    }));
    await afficherPrepares(false);
    showToast('Cours préparé ✅');
  }catch(e){
    showToast('Enregistrement impossible : ' + e.message);
  }finally{
    btn.disabled = false;
    btn.textContent = '📝 Préparer les notes';
  }
}

/* Ce que le moniteur de l'examen officiel a laissé dans les
   notes : l'inspecteur et les heures qu'il jugeait nécessaires.

   Il n'est pas forcément celui qui fait le rendez-vous, d'où ce
   rappel en tête d'écran. */
function mentionDeLExamen(cours, suivi){
  const sources = [
    String((cours && cours.note) || ''),
    String((suivi && suivi.note) || ''),
    (typeof ficheDe === 'function' && cours
      ? String((ficheDe(cours.eleve) || {}).remarques || '') : '')
  ];

  for(const t of sources){
    const lignes = t.split('\n');
    const i = lignes.findIndex(x => x.indexOf('🔒 EXAMEN OFFICIEL') !== -1);
    if(i === -1) continue;

    /* « Demandé : 4 + 3 heures » — on ne retient que le premier */
    const m = lignes[i].match(/Demandé\s*:\s*(\d+)/i);

    /* Les lignes 🔒 qui suivent : ce que le moniteur a écrit
       pour l'équipe. */
    const notes = [];
    for(let k = i + 1; k < lignes.length; k++){
      if(lignes[k].trim().indexOf('🔒') !== 0) break;
      notes.push(lignes[k].replace(/^\s*🔒\s*/, ''));
    }

    return {
      texte: lignes[i].replace('🔒 EXAMEN OFFICIEL · ', ''),
      note: notes.join('\n'),
      heures: m ? m[1] : ''
    };
  }
  return null;
}


function ouvrirRdvPost(cours){
  rdvPostEnCours = cours;
  const s = suiviDe(cours.eleve) || {};

  $('rdvPostEleve').textContent = cours.eleve || '';
  $('rdvPostInfo').textContent = 'Prévu le ' + libelleDate(cours.date) +
    (cours.moniteur ? ' · ' + cours.moniteur : '') +
    (s.nbAjournements ? ' · ' + mentionAjournements(s.nbAjournements, s.dateAjournement) : '');

  /* Ce que le moniteur de l'examen a demandé. Il n'est pas
     forcément celui qui corrige : sans ce rappel, l'information
     se perdait entre les deux. */
  const memo = mentionDeLExamen(cours, s);
  const zm = $('rdvPostExamen');
  if(zm){
    if(memo){
      zm.style.display = 'block';
      zm.innerHTML = '<div style="font-size:11px;color:var(--muted);' +
        'margin-bottom:3px;">🏁 À la sortie de l\'examen</div>' +
        '<div style="font-size:14px;line-height:1.6;">' +
        memo.texte.replace(/</g, '&lt;') + '</div>' +
        (memo.note
          ? '<div style="font-size:14px;line-height:1.6;margin-top:7px;' +
            'padding-top:7px;border-top:1px solid rgba(255,255,255,.08);' +
            'white-space:pre-wrap;">' +
            memo.note.replace(/</g, '&lt;') + '</div>'
          : '');
    }else{
      zm.style.display = 'none';
    }
  }

  /* Les captures du CEPC, déposées par le bureau ou ajoutées ici */
  const zc = $('rdvPostCepc');
  zc.innerHTML = '';
  zc.appendChild(blocCaptures(cours.eleve, ''));

  /* Le bilan d'examen officiel : dans la note préparée, ou dans la fiche */
  const note = String(cours.note || '');
  const sep = "BILAN DE L'EXAMEN À CORRIGER :";
  const i = note.indexOf(sep);
  $('rdvPostBilan').value = (i !== -1) ? note.slice(i + sep.length).trim()
                                       : (s.bilanExamen || '');

  /* Ce que l'élève a écrit, et ce que le moniteur ajoute */
  $('rdvPostEleveBilan').value = s.bilanEleve || '';
  $('rdvPostTexte').value = s.texteMoniteur || '';

  /* Ce qui avait été tapé et jamais enregistré revient par-dessus :
     c'est plus récent que ce que le classeur porte. */
  const garde = rdvPostGarde(cours.eleve);
  if(garde){
    CHAMPS_RDV_POST.forEach(id => {
      if($(id) && String(garde[id] || '').trim()) $(id).value = garde[id];
    });
    if(typeof showToast === 'function'){
      setTimeout(() => showToast('Ce que tu avais tapé est revenu ✅'), 400);
    }
  }

  /* Et tout ce qu'on tape est gardé au fil de l'eau. */
  CHAMPS_RDV_POST.forEach(id => {
    const el = $(id);
    if(!el || el.dataset.garde) return;
    el.dataset.garde = '1';
    ['input', 'change'].forEach(ev => el.addEventListener(ev, garderRdvPost));
  });

  const sel = $('rdvPostSuite');
  sel.innerHTML = '<option value="">— à définir —</option>';
  SUITES_POST.forEach(x => {
    const o = document.createElement('option');
    o.value = x.cle; o.textContent = x.nom;
    sel.appendChild(o);
  });
  sel.value = s.suite || '';

  /* Le nombre d'heures ne se demande que si un repassage est envisagé.
     On part de ce qu'avait demandé le moniteur de l'examen : le
     moniteur du rendez-vous garde le dernier mot. */
  const hh = $('rdvPostHeures');
  hh.value = s.heuresRepassage || (memo ? memo.heures : '') || '';
  const majH = () => {
    /* « Une leçon de 2h » porte déjà sa durée : demander des
       heures en plus n'a pas de sens. */
    hh.style.display = (sel.value && sel.value !== 'impossible' &&
                        sel.value !== '2h') ? 'block' : 'none';
  };
  sel.onchange = majH;
  majH();

  $('rdvPostCom').value = s.commentaireMoniteur || '';
  $('rdvPostMsg').textContent = '';

  $('recordView').style.display = 'none';
  $('resultView').style.display = 'none';
  $('rdvPostView').style.display = 'block';
  window.scrollTo(0, 0);
}

/* ------------------------------------------------------------
   LE BILAN D'EXAMEN NE VIT QUE DANS LA PAGE

   Quatre champs de texte libre — souvent quinze à vingt lignes
   recopiées à la main depuis la feuille de l'inspecteur — et rien
   ne les mettait à l'abri. Un rechargement, un appel entrant, un
   appui sur « Annuler » : tout partait, sans un mot.

   C'est la même famille que les boutons ✅ / ❌ perdus en v762 et
   que le questionnaire partagé entre postes : ce qui ne vit que
   dans la mémoire de la page doit être gardé quelque part.
   ------------------------------------------------------------ */
const CLE_RDV_POST = 'rdv_post_en_cours';
const CHAMPS_RDV_POST = ['rdvPostBilan', 'rdvPostEleveBilan',
                         'rdvPostTexte', 'rdvPostHeures', 'rdvPostSuite'];

function garderRdvPost(){
  if(!rdvPostEnCours) return;
  const d = { eleve: rdvPostEnCours.eleve, ts: Date.now() };
  CHAMPS_RDV_POST.forEach(id => { if($(id)) d[id] = $(id).value; });
  try{ localStorage.setItem(CLE_RDV_POST, JSON.stringify(d)); }catch(e){}
}

function oublierRdvPost(){
  try{ localStorage.removeItem(CLE_RDV_POST); }catch(e){}
}

/* Ce qui avait été tapé pour CET élève-là, et pas plus vieux
   qu'une journée : au-delà, ce n'est plus le même rendez-vous. */
function rdvPostGarde(eleve){
  try{
    const d = JSON.parse(localStorage.getItem(CLE_RDV_POST) || 'null');
    if(!d || !d.eleve) return null;
    if(normaliserMot(d.eleve) !== normaliserMot(eleve || '')) return null;
    if(Date.now() - (d.ts || 0) > 24 * 3600 * 1000) return null;
    const ecrit = CHAMPS_RDV_POST.some(id => String(d[id] || '').trim());
    return ecrit ? d : null;
  }catch(e){ return null; }
}

async function fermerRdvPost(){
  /* On ne referme pas sur du travail sans le dire. */
  const ecrit = CHAMPS_RDV_POST.some(id => $(id) && String($(id).value || '').trim());
  if(ecrit && typeof confirmer === 'function'){
    if(!await confirmer('Fermer sans enregistrer ?\n\n' +
        "Ce que tu as tapé est gardé sur cet appareil : tu le " +
        'retrouveras en rouvrant ce rendez-vous.', 'Fermer')) return;
  }
  garderRdvPost();
  rdvPostEnCours = null;
  $('rdvPostView').style.display = 'none';
  $('recordView').style.display = 'block';
  if(typeof afficherVue === 'function') afficherVue('cours', 'cours');
}

async function terminerRdvPost(){
  if(!rdvPostEnCours) return;
  const suite = $('rdvPostSuite').value;
  const heures = $('rdvPostHeures').value.trim();
  const msg = $('rdvPostMsg');

  if(!suite){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = 'Indique la suite à donner avant de terminer.';
    return;
  }
  if(suite !== 'impossible' && suite !== '2h' && !heures){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = "Indique le nombre d'heures avant le repassage.";
    return;
  }

  const b = $('rdvPostEnr');
  b.disabled = true;
  b.textContent = 'Enregistrement…';
  try{
    const eleve = rdvPostEnCours.eleve;

    const majs = {
      bilanExamen: $('rdvPostBilan').value.trim(),
      bilanEleve: $('rdvPostEleveBilan').value.trim(),
      texteMoniteur: $('rdvPostTexte').value.trim(),
      suite: suite,
      heuresRepassage: (suite === 'impossible' || suite === '2h') ? '' : heures,
      /* Le point à refaire lors d'une leçon : le bureau le voit
         sous le nom de l'élève. */
      fairePoint: (suite === '2h') ? 'oui' : '',
      fairePointLe: (suite === '2h')
        ? (dateEnToutesLettres(todayLocal()) || todayLocal()) : '',
      commentaireMoniteur: $('rdvPostCom').value.trim(),
      rdvPostFait: 'oui',
      /* L'élève rejoint la liste qui correspond à la conclusion */
      retireAPrevoir: (suite === 'impossible') ? 'oui' : '',
      par: ACCES.moniteur || ''
    };
    await majSuivi(eleve, majs);

    /* Le bureau est informé, et la note oriente les listes */
    const conclusion = libelleSuite(suite) +
      (suite !== 'impossible' && heures ? ' — ' + heures + 'h à faire' : '');

    if(suite === 'impossible'){
      await envoyerConsigne(eleve, 'permis',
        'Rendez-vous post-permis fait — ⛔ pas de repassage pour le moment. ' +
        'Reprise des leçons avant de se décider.' +
        ($('rdvPostCom').value.trim() ? ' · ' + $('rdvPostCom').value.trim() : ''));
    }else{
      await envoyerConsigne(eleve, 'permis',
        'Rendez-vous post-permis fait — ' + conclusion +
        " · Date d'examen à prévoir" +
        ($('rdvPostCom').value.trim() ? ' · ' + $('rdvPostCom').value.trim() : ''));
    }

    /* Le cours préparé n'a plus lieu d'être */
    if(rdvPostEnCours.id){
      try{ await appelPrep({ action: 'prepDelete', id: rdvPostEnCours.id }); }catch(e){}
    }

    msg.style.color = 'var(--accent-text)';
    msg.textContent = '✅ ' + conclusion + ' — le bureau est informé.';
    showToast('Rendez-vous terminé ✅');

    /* Enregistré : la copie de secours n'a plus lieu d'être, et
       elle ne doit pas revenir hanter le prochain rendez-vous. */
    oublierRdvPost();

    await afficherPrepares();
    setTimeout(() => {
      rdvPostEnCours = null;
      $('rdvPostView').style.display = 'none';
      $('recordView').style.display = 'block';
      if(typeof afficherVue === 'function') afficherVue('cours', 'cours');
    }, 1400);
  }catch(e){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = 'Erreur : ' + e.message;
  }finally{
    b.disabled = false;
    b.textContent = '✅ Terminer le rendez-vous';
  }
}

/* ============================================================
   CE QUI A ÉTÉ PRÉPARÉ POUR CE COURS
   Le moniteur doit voir, avant de démarrer, ce que le collègue
   a noté en préparant — au même titre que le dernier cours.
   ============================================================ */
async function afficherPreparationEleve(){
  const zone = $('preparationEleve');
  if(!zone) return;

  const nom = $('studentName') ? $('studentName').value.trim() : '';
  if(nom.length < 3){ zone.style.display = 'none'; zone.innerHTML = ''; return; }

  let liste = prepares || [];
  if(!liste.length){
    try{
      const d = await appelPrep({ action: 'prepList' });
      liste = (d && d.preparations) || [];
    }catch(e){ liste = []; }
  }

  const jour = $('lessonDate') ? $('lessonDate').value : '';
  const siennes = liste.filter(x => normaliserMot(x.eleve || '') === normaliserMot(nom));
  const prep = siennes.find(x => x.date === jour) ||
               siennes.sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];

  if(!prep){
    zone.style.display = 'none';
    zone.innerHTML = '';
    return;
  }

  zone.innerHTML = '';
  const carte = document.createElement('div');
  carte.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:12px 14px;background:rgba(182,255,14,.08);';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
  t.textContent = '📝 Préparé le ' +
    (dateEnToutesLettres(prep.date) || prep.date || '?') +
    (prep.preparePar ? ' par ' + prep.preparePar : '') +
    (prep.modeleLabel ? ' · ' + prep.modeleLabel : '');
  carte.appendChild(t);

  const note = String(prep.note || '').trim();

  /* Une consigne du type « pas d'écoute pédagogique » se noie dans
     la note : on la sort en évidence. */
  if(/pas d'écoutes? pédagogiques?/i.test(note)){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:14px;font-weight:700;color:var(--warn-text);' +
      'margin-bottom:6px;';
    a.textContent = "🚫 Pas d'écoutes pédagogiques";
    carte.appendChild(a);
  }

  const n = document.createElement('div');
  if(note){
    n.style.cssText = 'font-size:15px;font-weight:600;color:var(--accent-text);' +
      'line-height:1.45;white-space:pre-wrap;';
    n.textContent = note;
  }else{
    n.style.cssText = 'font-size:13px;color:var(--muted);';
    n.textContent = 'Cours préparé, sans note particulière.';
  }
  carte.appendChild(n);

  /* Les procédures demandées : le moniteur doit savoir d'un coup
     d'œil si l'élève a fait ce qu'on lui a demandé. */
  const zRecit = document.createElement('div');
  carte.appendChild(zRecit);
  afficherEtatRecitations(nom, zRecit);

  /* Les manœuvres cochées à la préparation : le moniteur qui prend
     le cours doit savoir ce que son collègue comptait valider.
     La section s'affiche toujours — une absence silencieuse laisse
     croire à un défaut d'affichage. */
  /* Le contexte arrive parfois en texte : il vient du classeur,
     où tout est stocké tel quel. */
  let ctx = prep.contexte;
  if(typeof ctx === 'string' && ctx.trim()){
    try{ ctx = JSON.parse(ctx); }catch(e){ ctx = null; }
  }
  const ajoutees = (ctx && ctx.manoeuvresAjoutees) || [];
  /* Ce que l'élève avait déjà fait dans une autre auto-école : ce
     n'est pas au programme du jour, c'est de l'acquis. */
  const ailleurs = (ctx && ctx.manoeuvresAilleurs) || [];

  const sep = document.createElement('div');
  sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
  carte.appendChild(sep);

  /* Les marques déjà posées par les moniteurs précédents, pour
     signer chaque manœuvre de qui l'a fait travailler. */
  let marquesConnues = {};
  try{
    const d = await chargerDossierEleve(nom);
    marquesConnues = (d && d.marques) || {};
  }catch(e){ /* hors ligne : on affiche sans les émojis */ }

  /* Ce qui est acquis, quel qu'en soit le cours : les manœuvres
     déjà validées par un moniteur comptent autant que celles
     cochées à la préparation. */
  const acquises = BLOC.ficheListeConduite.filter(x =>
    (marquesConnues[normaliserMot(x)] || ailleurs.indexOf(x) !== -1) &&
    ajoutees.indexOf(x) === -1);

  const faites = ajoutees.concat(acquises);

  const t2 = document.createElement('div');
  t2.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
  t2.textContent = '🦉 Fiche véhicule — ' + faites.length + ' sur ' +
                   BLOC.ficheListeConduite.length;
  carte.appendChild(t2);

  const ligneManoeuvre = (x, prevue) => {
    const li = document.createElement('div');
    /* Tant que le bilan n'est pas parti, la 🚗 n'existe que dans le
       contexte de préparation : sans ce repli, une manœuvre faite
       ailleurs s'affichait nue et paraissait non acquise. */
    const marque = marquesConnues[normaliserMot(x)] ||
      (ailleurs.indexOf(x) !== -1 ? MARQUE_AILLEURS : '');
    li.innerHTML = '· ' + x.replace(/</g, '&lt;') +
      (marque ? ' <span style="letter-spacing:1px;">' + marque + '</span>' : '') +
      (prevue ? ' <span style="font-size:11px;color:var(--muted);">' +
                'prévue aujourd\'hui</span>' : '');
    return li;
  };

  if(faites.length){
    const l = document.createElement('div');
    l.style.cssText = 'font-size:13px;line-height:1.7;';
    /* Celles du jour d'abord, les acquises ensuite */
    ajoutees.forEach(x => l.appendChild(ligneManoeuvre(x, true)));
    acquises.forEach(x => l.appendChild(ligneManoeuvre(x, false)));
    carte.appendChild(l);

    /* Sans rien de coché à la préparation, on le dit quand même :
       la liste ne montre alors que ce qui vient d'avant. */
    if(!ajoutees.length){
      const n = document.createElement('div');
      n.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;margin-top:5px;';
      n.textContent = ctx
        ? 'Aucune manœuvre cochée lors de la préparation — ci-dessus, ' +
          'ce qui est déjà acquis.'
        : 'Préparation antérieure à la fiche véhicule — ci-dessus, ' +
          'ce qui est déjà acquis.';
      carte.appendChild(n);
    }
  }else{
    const v = document.createElement('div');
    v.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;';
    v.textContent = ctx
      ? 'Aucune manœuvre cochée lors de la préparation, et rien d\'acquis ' +
        'pour l\'instant.'
      : 'Préparation antérieure à la fiche véhicule : rien à afficher.';
    carte.appendChild(v);
  }

  /* Ce qui reste : c'est ce que le moniteur doit travailler aujourd'hui */
  const restantes = BLOC.ficheListeConduite.filter(
    x => faites.indexOf(x) === -1);

  if(restantes.length){
    const t3 = document.createElement('div');
    t3.style.cssText = 'font-size:13px;font-weight:700;color:var(--warn-text);' +
      'margin:10px 0 4px;';
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

/* Rouvre le questionnaire d'une préparation et l'enregistre à la
   place de l'ancienne. Le contexte est repris tel quel : on ne
   repart pas de zéro. */
/* Compléter les infos depuis la carte : le même écran et la même
   écriture que le crayon, sous un autre titre. Deux chemins vers
   un seul enregistrement — c'est la règle de toute l'application,
   et elle vaut ici comme ailleurs. */
async function completerLesInfosDuCours(cours){
  return modifierPreparation(cours, 'Compléter les infos', 'Valider');
}

async function modifierPreparation(cours, titre, valider){
  if(!cours || !cours.id) return;

  /* Le questionnaire lit l'élève et le modèle dans l'écran de cours */
  const nomAvant = $('studentName') ? $('studentName').value : '';
  const modAvant = $('modele') ? $('modele').value : '';
  const dateAvant = $('lessonDate') ? $('lessonDate').value : '';

  if($('studentName')) $('studentName').value = cours.eleve || '';
  if($('modele') && cours.modele) $('modele').value = cours.modele;
  if($('lessonDate') && cours.date) $('lessonDate').value = cours.date;

  let rep = null;
  try{
    rep = await ouvrirQuestionnaireDepart(cours.contexte || {},
                                          titre || 'Modifier la préparation',
                                          valider || 'Enregistrer');
  }finally{
    /* On remet l'écran comme on l'a trouvé */
    if($('studentName')) $('studentName').value = nomAvant;
    if($('modele')) $('modele').value = modAvant;
    if($('lessonDate')) $('lessonDate').value = dateAvant;
  }

  if(!rep) return;

  try{
    /* Le moniteur a pu changer le type de bilan dans le questionnaire */
    const cleModele = rep.modele || cours.modele;

    /* L'heure déjà posée sur ce cours : elle ne doit pas se perdre
       quand on retouche les notes. */
    const hDejaLa = heureDeLaPreparation(cours);

    /* LES MOTS DU MONITEUR SURVIVENT AU CRAYON.

       On remplaçait la note par celle que le questionnaire écrit —
       et le 📌 du moniteur précédent partait avec. Ouvrir le
       crayon pour corriger une date d'examen effaçait donc « a du
       mal avec les créneaux ».

       Les deux se fondent : une ligne par sujet, celle du
       questionnaire, et le 📌 ne garde que ce qu'aucun champ ne
       sait redire. C'est déjà ce que fait le rappel. */
    const neuf = noteDepuisQuestionnaire(rep);
    let corps = neuf, consigne = '';
    if(typeof fondreNotePreparee === 'function'){
      const f = fondreNotePreparee(neuf, cours.note || '');
      corps = f.corps; consigne = f.consigne;
    }
    const noteRefaite = (typeof assemblerNotePreparee === 'function')
      ? assemblerNotePreparee(hDejaLa ? '🕐 ' + hDejaLa.replace(':', 'h') : '',
                              corps, consigne)
      : (hDejaLa ? '🕐 ' + hDejaLa.replace(':', 'h') + '\n' : '') + neuf;

    await appelPrep({
      action: 'prepAdd',
      id: cours.id,                    /* même identifiant : on remplace */
      date: cours.date,
      eleve: cours.eleve,
      modele: cleModele,
      modeleLabel: (MODELES[cleModele] && MODELES[cleModele].label) ||
                   cours.modeleLabel || '',
      site: cours.site || '',
      /* On modifie une préparation existante : son heure vient du
         cours lui-même, pas du formulaire de création. */
      note: noteRefaite,
      contexte: JSON.stringify(rep),
      moniteur: cours.moniteur || ACCES.moniteur || ''
    });
    /* La ligne en mémoire suit : elle vient d'être confirmée par le
       serveur, la relire n'apprendrait rien de plus. */
    const dans = prepares.find(x => String(x.id) === String(cours.id));
    if(dans){
      dans.modele = cleModele;
      dans.modeleLabel = (MODELES[cleModele] && MODELES[cleModele].label) ||
                         cours.modeleLabel || '';
      /* La même note que celle envoyée au serveur, heure comprise :
         sans elle, l'heure disparaissait de l'écran jusqu'au
         prochain rafraîchissement. */
      dans.note = noteRefaite;
      dans.contexte = rep;
    }
    showToast((titre === 'Compléter les infos')
      ? 'Infos complétées ✅' : 'Préparation modifiée ✅');
    await afficherPrepares(false);
  }catch(e){
    showToast('Modification impossible : ' + e.message);
  }
}

/* Amène l'écran sur le module de cours, prêt à démarrer. */
/* L'heure d'un cours, écrite dans sa note par le rappel ou par le
   bureau. Elle vient toujours de la même mention 🕐. */
/* Les repères posés par le rappel de cours : carte d'identité,
   carte SD. Ils vivent en tête de la note. */
/* L'état des récitations demandées à cet élève */
async function afficherEtatRecitations(nom, zone){
  if(!zone || !nom) return;

  let demandes = [], recits = [];
  try{
    const [a, b] = await Promise.all([
      appelPrep({ action: 'demandesList', eleve: nom }),
      appelPrep({ action: 'recitationsList' })
    ]);
    demandes = (a && a.demandes) || [];
    recits = ((b && b.recitations) || [])
      .filter(x => normaliserMot(x.eleve || '') === normaliserMot(nom));
  }catch(e){ return; }

  if(!demandes.length && !recits.length) return;

  const sep = document.createElement('div');
  sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
  zone.appendChild(sep);

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
    'margin-bottom:5px;';
  t.textContent = '📌 Procédures à réciter';
  zone.appendChild(t);

  /* Chaque demande, avec ce qu'elle est devenue */
  const vues = {};
  demandes.forEach(d => {
    const dit = recits.filter(r =>
      normaliserMot(r.procedure || '') === normaliserMot(d.procedure));
    /* La plus récente fait foi */
    const dernier = dit.length ? dit[0] : null;
    vues[normaliserMot(d.procedure)] = true;

    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:8px;align-items:flex-start;' +
      'font-size:13px;line-height:1.5;padding:3px 0;';

    let etat, couleur;
    if(!dernier){
      etat = 'pas encore récitée';
      couleur = 'var(--warn-text)';
    }else if(dernier.etat === 'valide'){
      etat = 'récitée et corrigée';
      couleur = 'var(--accent-text)';
    }else{
      etat = 'récitée — correction à valider';
      couleur = 'var(--warn-text)';
    }

    l.innerHTML = '<span style="flex-shrink:0;">' +
      (!dernier ? '⏳' : (dernier.etat === 'valide' ? '✅' : '👀')) + '</span>' +
      '<span style="flex:1;min-width:0;">' +
        d.procedure.replace(/</g, '&lt;') +
        '<span style="color:' + couleur + ';font-size:11px;"> — ' + etat + '</span>' +
        '<div style="font-size:11px;color:var(--muted);">demandée le ' +
          (d.demandeLe || '').replace(/</g, '&lt;') +
          (d.par ? ' par ' + d.par.replace(/</g, '&lt;') : '') + '</div>' +
      '</span>';
    zone.appendChild(l);
  });

  /* Ce qu'il a récité de lui-même, sans qu'on le lui demande */
  recits.filter(r => !vues[normaliserMot(r.procedure || '')])
    .slice(0, 5)
    .forEach(r => {
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:8px;align-items:flex-start;' +
        'font-size:13px;line-height:1.5;padding:3px 0;';
      l.innerHTML = '<span style="flex-shrink:0;">' +
        (r.etat === 'valide' ? '✅' : '👀') + '</span>' +
        '<span style="flex:1;min-width:0;">' +
          (r.procedure || '').replace(/</g, '&lt;') +
          '<span style="color:var(--muted);font-size:11px;"> — de lui-même' +
          (r.etat === 'valide' ? '' : ', à valider') + '</span></span>';
      zone.appendChild(l);
    });
}


/* Les mentions à prévoir : carte d'identité, carte SD.

   Elles se cochent au rappel ; quand on les oublie, on les
   rattrape ici. Elles vivent en tête de note, à côté de l'heure. */
function ouvrirMentions(cours){
  const t = String(cours.note || '');
  const debut = t.split('\n')[0];

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(400px, 94vw)';

  boite.innerHTML = '<h3>À prévoir pour ' +
    String(cours.eleve || '').replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;">Ce que le moniteur doit avoir en tête au ' +
      'moment du cours.</div>';

  const faire = (emoji, texte, present) => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:11px;' +
      'text-transform:none;font-size:15px;color:var(--cream);margin:0 0 10px;' +
      'font-weight:400;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = present;
    cb.dataset.emoji = emoji;
    cb.style.cssText = 'width:19px;height:19px;flex-shrink:0;margin:0;';
    l.appendChild(cb);
    const s = document.createElement('span');
    s.style.cssText = 'flex:1;min-width:0;';
    s.textContent = emoji + '  ' + texte;
    l.appendChild(s);
    boite.appendChild(l);
    return cb;
  };

  const cbCI = faire('🆔', "Carte d'identité à déposer", debut.indexOf('🆔') !== -1);
  const cbSD = faire('💾', 'Carte SD à récupérer', debut.indexOf('💾') !== -1);

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bA);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '💾 Enregistrer';
  bO.addEventListener('click', async () => {
    /* On refait la première ligne : l'heure d'abord, puis les
       mentions, dans un ordre stable. */
    const h = heureDeLaPreparation(cours);
    const marques = [];
    if(cbCI.checked) marques.push('🆔');
    if(cbSD.checked) marques.push('💾');

    const reste = t.replace(/^[^\n]*\n?/, '');
    const tete = (h ? '🕐 ' + h.replace(':', 'h') + ' ' : '') + marques.join(' ');

    /* Si la première ligne ne portait que ces repères, on ne la
       garde que si elle a encore quelque chose à dire. */
    const avaitTete = /^(🕐|🆔|💾)/.test(debut);
    const nouvelle = tete.trim()
      ? tete.trim() + '\n' + (avaitTete ? reste : t)
      : (avaitTete ? reste : t);

    bO.disabled = true;
    try{
      await appelPrep({
        action: 'prepAdd', id: cours.id, date: cours.date,
        eleve: cours.eleve, modele: cours.modele,
        modeleLabel: cours.modeleLabel || '',
        site: cours.site || '',
        note: nouvelle,
        contexte: JSON.stringify(cours.contexte || {}),
        moniteur: cours.moniteur || ACCES.moniteur || ''
      });
      const dans = prepares.find(x => String(x.id) === String(cours.id));
      if(dans) dans.note = nouvelle;
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      afficherPrepares();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bO.disabled = false;
    }
  });
  r.appendChild(bO);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


function repereDeNote(cours){
  const t = String((cours && cours.note) || '');
  const debut = t.split('\n')[0];

  const emojis = [];
  const quoi = [];
  if(debut.indexOf('🆔') !== -1){ emojis.push('🆔'); quoi.push("carte d'identité"); }
  if(debut.indexOf('💾') !== -1){ emojis.push('💾'); quoi.push('carte SD'); }

  if(!emojis.length) return null;
  /* L'émoji seul ne se lit pas : il faut savoir ce qu'il veut dire,
     et l'info-bulle demande de survoler — ce qu'on ne fait pas sur
     un téléphone. La carte d'identité se prend AVANT le cours ou
     pas du tout : elle s'écrit en toutes lettres. */
  return { emojis: emojis.join(''), titre: 'À prévoir : ' + quoi.join(' · '),
           texte: debut.indexOf('🆔') !== -1 ? 'Prendre CI !' : '' };
}


function heureDeLaPreparation(cours){
  const t = String((cours && cours.note) || '');

  /* « 9h30 », « 09:30 », mais aussi « 9h » tout court : une heure
     ronde s'écrit sans ses minutes, et elle se perdait. */
  const m = t.match(/🕐\s*(\d{1,2})\s*[h:]\s*(\d{2})?/);
  if(!m) return '';
  return String(m[1]).padStart(2, '0') + ':' + (m[2] || '00');
}


function amenerAuCours(){
  setTimeout(() => {
    /* Le bouton lui-même, centré : viser le haut de la carte
       laissait le moniteur devant les champs, avec le bouton hors
       de l'écran et un défilement de plus à faire. */
    const b = $('recBtn') || $('recordView');
    if(!b) return;
    try{
      b.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }catch(e){
      /* Navigateur ancien : au moins on y va */
      window.scrollTo(0, Math.max(0, b.offsetTop - 160));
    }
  }, 150);
}

/* Demande une date, avec celle du cours pré-remplie */
function demanderDate(titre, dateActuelle, heureActuelle){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.maxWidth = '340px';

    const h = document.createElement('h3');
    h.textContent = titre;
    boite.appendChild(h);

    const lD = document.createElement('label');
    lD.textContent = 'Date';
    boite.appendChild(lD);

    const champ = document.createElement('input');
    champ.type = 'date';
    champ.value = dateActuelle || todayLocal();
    boite.appendChild(champ);

    /* L'heure se change au même endroit : un changement de
       planning déplace souvent les deux. */
    const lH = document.createElement('label');
    lH.textContent = 'Heure';
    boite.appendChild(lH);

    const champH = document.createElement('input');
    champH.type = 'time';
    champH.value = heureActuelle || '';
    boite.appendChild(champH);

    const r = document.createElement('div');
    r.className = 'btn-row';

    const bAnn = document.createElement('button');
    bAnn.className = 'btn btn-secondary';
    bAnn.textContent = 'Annuler';
    bAnn.addEventListener('click', () => {
      document.body.removeChild(fond);
      resolve(null);
    });

    const bOk = document.createElement('button');
    bOk.className = 'btn btn-primary';
    bOk.textContent = 'Valider';
    bOk.addEventListener('click', () => {
      const v = champ.value;
      const hv = champH.value;
      document.body.removeChild(fond);
      /* On rend les deux : l'appelant prend ce qui l'intéresse */
      resolve(v ? { date: v, heure: hv } : null);
    });

    r.appendChild(bAnn); r.appendChild(bOk);
    boite.appendChild(r);
    fond.appendChild(boite);
    document.body.appendChild(fond);
    setTimeout(() => champ.focus(), 100);
  });
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-prepares.js'] = true;
