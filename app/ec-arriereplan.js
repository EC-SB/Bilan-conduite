/* Déployé le 09/09/2026 à 09:26 — v892 */
/* ============================================================
   ec-arriereplan.js
   Le bilan qui se fabrique pendant qu'on enchaîne.

   Un élève attend déjà quand le bilan du précédent se génère.
   Plutôt que de patienter devant l'écran, le moniteur démarre le
   cours suivant : le bilan poursuit sa route et se signale
   quand il est prêt.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les bilans laissés en chantier. Un seul à la fois en pratique,
   mais rien n'empêche d'en avoir deux si le moniteur enchaîne
   vite. */
let bilansEnFond = [];

/* Le délai avant de proposer d'enchaîner : quand tout va vite,
   la proposition serait une distraction. */
const DELAI_AUTRE_COURS = 15000;

let minuteurAutreCours = null;


/* Appelé au début de la génération */
function surDebutGeneration(){
  const b = $('autreCoursBtn');
  if(!b) return;

  b.style.display = 'none';
  b.disabled = false;

  clearTimeout(minuteurAutreCours);
  minuteurAutreCours = setTimeout(() => {
    /* Toujours en train de générer : on propose d'enchaîner */
    if($('generatingView') && $('generatingView').style.display !== 'none'){
      b.style.display = 'block';
    }
  }, DELAI_AUTRE_COURS);
}


/* Appelé quand la génération se termine, réussie ou non */
function surFinGeneration(){
  clearTimeout(minuteurAutreCours);
  const b = $('autreCoursBtn');
  if(b) b.style.display = 'none';
}


/* ============================================================
   PASSER AU COURS SUIVANT

   Le bilan continue de se fabriquer : on ne l'interrompt pas, on
   se contente de libérer l'écran.
   ============================================================ */

async function commencerAutreCours(){
  const eleve = ($('studentName') && $('studentName').value.trim()) || 'cet élève';

  if(!await confirmer(
      'Commencer un autre cours ?\n\n' +
      'Le bilan de ' + eleve + ' continue de se fabriquer. ' +
      'Tu seras prévenu dès qu\'il est prêt.', 'Enchaîner')){
    return;
  }

  /* Ce bilan-là est désormais en chantier : on retient de quoi
     le retrouver. */
  bilansEnFond.push({
    eleve: eleve,
    depuis: Date.now(),
    /* Le brouillon reste sur l'appareil : une coupure ne perd
       rien. */
    transcript: (typeof finalTranscript !== 'undefined') ? finalTranscript : '',
    note: ($('noteInterne') && $('noteInterne').value) || ''
  });

  surFinGeneration();

  /* L'écran du cours revient, vide et prêt */
  if($('generatingView')) $('generatingView').style.display = 'none';
  if(typeof repartirDeZero === 'function'){
    repartirDeZero();
  }else{
    /* Le minimum : vider ce qui appartient au cours précédent */
    if($('studentName')) $('studentName').value = '';
    if($('transcriptBox')) $('transcriptBox').value = '';
    if($('noteInterne')) $('noteInterne').value = '';
    if(typeof finalTranscript !== 'undefined') finalTranscript = '';
    if(typeof committedTranscript !== 'undefined') committedTranscript = '';
  }

  if($('recordView')) $('recordView').style.display = 'block';
  window.scrollTo(0, 0);

  afficherBilansEnFond();
  showToast('Le bilan de ' + eleve + ' se termine en arrière-plan');
}


/* ============================================================
   LA BANNIÈRE

   Ce qui est en cours, ce qui est prêt, ce qui a échoué. Un
   bilan ne doit jamais se perdre en silence.
   ============================================================ */

function afficherBilansEnFond(){
  const zone = $('bilanPretBanner');
  if(!zone) return;

  if(!bilansEnFond.length){
    zone.style.display = 'none';
    zone.innerHTML = '';
    return;
  }

  zone.innerHTML = '';
  zone.style.display = 'block';

  bilansEnFond.forEach((b, i) => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:9px;align-items:center;' +
      (i ? 'margin-top:9px;padding-top:9px;' +
           'border-top:1px solid rgba(255,255,255,.08);' : '');

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.5;';

    if(b.erreur){
      t.innerHTML = '<strong style="color:var(--warn-text);">⚠️ ' +
        b.eleve.replace(/</g, '&lt;') + '</strong>' +
        '<div style="font-size:11px;color:var(--muted);">' +
        String(b.erreur).slice(0, 90).replace(/</g, '&lt;') + '</div>';
    }else if(b.bilan){
      t.innerHTML = '<strong style="color:var(--accent-text);">✅ Le bilan de ' +
        b.eleve.replace(/</g, '&lt;') + ' est prêt</strong>';
    }else{
      t.innerHTML = '<span style="color:var(--muted);">⏳ Bilan de ' +
        b.eleve.replace(/</g, '&lt;') + ' en cours…</span>';
    }
    l.appendChild(t);

    if(b.bilan || b.erreur){
      const bV = document.createElement('button');
      bV.className = 'btn btn-secondary';
      bV.style.cssText = 'width:auto;padding:8px 12px;font-size:12px;margin:0;' +
        'flex-shrink:0;';
      bV.textContent = b.bilan ? '👀 Le voir' : '↩️ Reprendre';
      bV.addEventListener('click', () => reprendreBilanEnFond(i));
      l.appendChild(bV);
    }

    zone.appendChild(l);
  });
}


/* Le bilan est prêt : on le range et on prévient */
function bilanEnFondPret(eleve, bilan, meta){
  const b = bilansEnFond.find(x =>
    normaliserMot(x.eleve) === normaliserMot(eleve) && !x.bilan && !x.erreur);
  if(!b) return false;

  b.bilan = bilan;
  b.meta = meta || null;
  afficherBilansEnFond();
  showToast('✅ Le bilan de ' + eleve + ' est prêt');
  return true;
}


/* La génération a échoué : le moniteur doit pouvoir reprendre */
function bilanEnFondRate(eleve, message){
  const b = bilansEnFond.find(x =>
    normaliserMot(x.eleve) === normaliserMot(eleve) && !x.bilan && !x.erreur);
  if(!b) return false;

  b.erreur = message || 'La génération a échoué.';
  afficherBilansEnFond();
  showToast('⚠️ Le bilan de ' + eleve + ' a échoué');
  return true;
}


/* ============================================================
   REVENIR À UN BILAN LAISSÉ EN CHANTIER
   ============================================================ */

async function reprendreBilanEnFond(i){
  const b = bilansEnFond[i];
  if(!b) return;

  /* Le cours en cours ne doit pas se perdre */
  const enCours = ($('transcriptBox') && $('transcriptBox').value.trim()) ||
                  (typeof finalTranscript !== 'undefined' && finalTranscript);

  if(enCours && !await confirmer(
      'Un cours est en cours de dictée.\n\n' +
      'Il est sauvegardé sur cet appareil : tu le retrouveras. ' +
      'Aller voir le bilan de ' + b.eleve + ' ?', 'Changer de bilan')){
    return;
  }

  if(typeof sauvegarderLocal === 'function') sauvegarderLocal(true);

  if(b.erreur){
    /* Rien à montrer : on remet le cours en place pour relancer */
    if($('studentName')) $('studentName').value = b.eleve;
    if($('transcriptBox')) $('transcriptBox').value = b.transcript || '';
    if($('noteInterne')) $('noteInterne').value = b.note || '';
    if(typeof finalTranscript !== 'undefined') finalTranscript = b.transcript || '';
    if(typeof committedTranscript !== 'undefined'){
      committedTranscript = b.transcript || '';
    }

    if($('generatingView')) $('generatingView').style.display = 'none';
    if($('resultView')) $('resultView').style.display = 'none';
    if($('recordView')) $('recordView').style.display = 'block';

    showToast('Reprends ce bilan : appuie sur Terminer');
  }else{
    /* Le bilan est là : on l'affiche */
    if($('resultText')) $('resultText').value = b.bilan;
    if(b.meta && typeof currentLessonMeta !== 'undefined'){
      currentLessonMeta = b.meta;
    }
    if($('noteInterne')) $('noteInterne').value = b.note || '';

    if($('generatingView')) $('generatingView').style.display = 'none';
    if($('recordView')) $('recordView').style.display = 'none';
    if($('resultView')) $('resultView').style.display = 'block';

    if(typeof remplirChoixProcedures === 'function') remplirChoixProcedures();
    if(typeof afficherNote === 'function') afficherNote(b.note || '');
    if(typeof marquerExport === 'function') marquerExport(false);
  }

  bilansEnFond.splice(i, 1);
  afficherBilansEnFond();
  window.scrollTo(0, 0);
}



/* ============================================================
   LE BROUILLON DÉPOSÉ SUR LE SERVEUR

   La sauvegarde sur l'appareil suffit d'ordinaire, mais elle
   échoue en silence quand le stockage est plein, et disparaît
   avec le navigateur.

   Avant toute génération, la transcription part sur Sheets : le
   moniteur la retrouve même depuis un autre téléphone.
   ============================================================ */

function texteDicteEnCours(){
  return (typeof finalTranscript !== 'undefined' && finalTranscript) ||
         ($('transcriptBox') && $('transcriptBox').value) || '';
}

async function deposerBrouillonServeur(extra){
  const texte = texteDicteEnCours();
  if(!String(texte).trim()) return;

  try{
    await appelPrep(Object.assign({
      action: 'brouillonSet',
      eleve: ($('studentName') && $('studentName').value.trim()) || '',
      dateCours: ($('lessonDate') && $('lessonDate').value) || '',
      modele: ($('modele') && $('modele').value) || '',
      site: ($('site') && $('site').value) || '',
      transcript: texte,
      note: ($('noteInterne') && $('noteInterne').value) || ''
    }, extra || {}));
  }catch(e){
    /* Le dépôt n'est pas indispensable : la sauvegarde locale
       reste. On ne bloque pas la génération pour autant. */
  }
}


/* ============================================================
   LA MISE À L'ABRI PENDANT LE COURS

   La dictée n'était déposée qu'au moment de générer : une heure
   de parole ne vivait donc que dans le téléphone du moniteur —
   précisément là où le bureau ne peut pas aller. Une batterie
   vide et tout était perdu, pour lui comme pour nous.

   On dépose maintenant en cours de route. Mesurément :
     • toutes les deux minutes, et SEULEMENT si la dictée a
       changé — un moniteur qui roule sans parler n'envoie rien ;
     • pas avant deux cents caractères : un cours qui vient de
       commencer n'a rien à sauver ;
     • et surtout au moment où l'application passe en arrière-plan,
       qui est l'instant où l'on perd tout.

   Silencieux, jamais bloquant : un échec est ignoré, la
   sauvegarde locale reste derrière.
   ============================================================ */
const PAS_DEPOT = 2 * 60 * 1000;
const MINI_DEPOT = 200;

let minuteurDepot = null;
let dernierDepot = '';

/* ------------------------------------------------------------
   UN NOUVEAU COURS COMMENCE : LE GARDE-FOU REPART À ZÉRO

   Deux verrous protègent le dépôt d'écrire pour rien, et tous
   deux survivaient d'un cours à l'autre :

     · « dernierDepot » retient le dernier texte envoyé, pour ne
       pas réécrire la même chose deux fois ;
     · « bilanEnregistre » arrête le dépôt une fois le bilan dans
       le classeur — et ne redescendait qu'en ouvrant un cours
       préparé.

   Le second a coûté cher : un moniteur qui enchaînait deux cours
   sans passer par sa liste ne déposait plus rien du tout, en
   silence. Les deux se relâchent maintenant au démarrage, vocal
   comme manuel.
   ------------------------------------------------------------ */
function reinitialiserDepotBrouillon(){
  dernierDepot = '';
  coursSignaleServeur = false;
  if(typeof bilanEnregistre !== 'undefined') bilanEnregistre = false;
}

/* ------------------------------------------------------------
   LA PREMIÈRE TRACE D'UN COURS LE SIGNALE

   Trois chemins signalent déjà le démarrage : ouvrir un cours
   préparé, ouvrir une fiche à remplir à la main, lancer le micro.
   Il en restait un quatrième, et David a eu raison d'insister :
   « il faut que ça fonctionne pour les autres types de bilan si le
   moniteur décide de le faire en manuel ».

   Un moniteur peut taper le nom de l'élève à la main, ne jamais
   toucher au micro, et ÉCRIRE sa dictée au clavier dans la zone de
   transcription. Aucun des trois chemins ne passe par là — et le
   bureau ne voyait rien, comme ce matin.

   La règle qui les couvre tous : dès qu'un cours produit quelque
   chose à mettre à l'abri, c'est qu'il a commencé. Une seule fois
   par cours — « demarrerCours » remplace la ligne du moniteur, mais
   la réécrire toutes les deux minutes serait un appel pour rien.
   ------------------------------------------------------------ */
let coursSignaleServeur = false;

function marquerCoursSignale(){ coursSignaleServeur = true; }

function signalerCoursSiBesoin(){
  try{
    if(coursSignaleServeur) return;
    if(typeof signalerCoursDemarre !== 'function') return;
    coursSignaleServeur = true;
    signalerCoursDemarre(
      ($('studentName') && $('studentName').value.trim()) || '',
      ($('modele') && $('modele').selectedOptions[0]
        ? $('modele').selectedOptions[0].textContent
        : ($('modele') && $('modele').value) || ''),
      ($('site') && $('site').value) || '');
  }catch(e){ /* un signalement raté n'arrête ni le cours ni le dépôt */ }
}

async function deposerSiChange(){
  try{
    if(typeof ACCES === 'undefined' || !ACCES.code) return;

    /* UN BILAN DÉJÀ ENREGISTRÉ NE REDÉPOSE PAS SA DICTÉE.

       Le dépôt tourne toutes les quelques secondes, et se déclenche
       aussi quand le téléphone s'endort. Après l'enregistrement la
       dictée est toujours à l'écran : le moindre mot corrigé, ou la
       simple mise en veille, redéposait un brouillon PAR-DESSUS un
       cours terminé. Il n'en repartait plus jamais, et « Cours non
       terminés » le montrait comme une dictée sans bilan — pendant
       que le bilan, lui, était bien dans Sheets.

       Le filet reste entier : tant que le bilan n'est pas
       enregistré, tout se dépose comme avant. */
    if(typeof bilanEnregistre !== 'undefined' && bilanEnregistre) return;

    const texte = String(texteDicteEnCours());
    if(texte.length < MINI_DEPOT) return;
    if(texte === dernierDepot) return;

    /* Le cours existe : il produit du texte. On le dit au bureau
       avant de déposer — c'est l'ordre naturel, et si le dépôt
       échoue ensuite le cours reste visible quand même.

       ⚠️ DANS SA PROPRE FONCTION, ET SON PROPRE FILET. Écrit ici en
       ligne, la moindre erreur — un champ absent, une variable pas
       encore déclarée — remontait au « catch » du dessous et
       ANNULAIT LE DÉPÔT. Le signalement est un confort ; le dépôt
       est le filet. Le confort ne doit jamais casser le filet. */
    signalerCoursSiBesoin();

    dernierDepot = texte;
    await deposerBrouillonServeur();
  }catch(e){ /* rien ne doit remonter d'ici */ }
}

function veillerDepotBrouillon(){
  clearInterval(minuteurDepot);
  minuteurDepot = setInterval(() => {
    if(document.hidden) return;      /* le passage en arrière-plan a déjà déposé */
    deposerSiChange();
  }, PAS_DEPOT);

  /* L'instant où le téléphone s'endort, où l'onglet se ferme, où
     l'appel arrive : c'est là qu'on perd tout, et c'est là que le
     dépôt vaut le plus cher. */
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) deposerSiChange();
  });
  window.addEventListener('pagehide', () => { deposerSiChange(); });
}


/* Le bilan est enregistré : le brouillon n'a plus lieu d'être */
async function retirerBrouillonServeur(eleve){
  if(!eleve) return;
  try{
    await appelPrep({ action: 'brouillonDelete', eleve: eleve });
  }catch(e){}
}


/* ============================================================
   LES COURS RETROUVÉS

   Au démarrage : ce qui a été déposé mais jamais abouti.
   ============================================================ */

/* Le bureau peut renvoyer un bilan pendant que l'application est
   ouverte : sans cette veille, le moniteur ne le verrait qu'au
   prochain démarrage — parfois le lendemain. */
let minuteurBrouillons = null;

function veillerBrouillonsServeur(){
  clearInterval(minuteurBrouillons);
  minuteurBrouillons = setInterval(() => {
    if(document.hidden) return;
    if(typeof ACCES === 'undefined' || !ACCES.code) return;
    /* Pas pendant un cours en cours de dictée : le bandeau
       viendrait par-dessus le travail en train de se faire. */
    if(String(texteDicteEnCours()).trim()) return;
    chercherBrouillonsServeur(true);
  }, 3 * 60 * 1000);

  document.addEventListener('visibilitychange', () => {
    if(!document.hidden && !String(texteDicteEnCours()).trim()){
      chercherBrouillonsServeur(true);
    }
  });
}

async function chercherBrouillonsServeur(silencieux){
  try{
    const d = await appelPrep({ action: 'brouillonList' });

    /* ⚠️ CE QUE LE MONITEUR A ÉCARTÉ NE REVIENT PAS.

       Il a supprimé sa copie et rangé la ligne : la redonner au
       passage suivant serait exactement le bandeau qui revient
       tout seul, celui qui a fait paniquer Chrystel. La dictée,
       elle, n'a pas bougé — elle attend au bureau, dans
       « Cours non terminés ». */
    const l = ((d && d.brouillons) || []).filter(b => b && b.etat !== 'ecarte');

    /* Un bilan à corriger passe devant : c'est celui qui attend
       une action, et le bureau vient de le renvoyer. */
    l.sort((a, b) => (b.etat === 'a-corriger') - (a.etat === 'a-corriger'));

    /* Annoncé une fois, à voix haute : le moniteur doit savoir
       tout de suite que son cours l'attend. Une fois par COURS,
       pas une fois par dépôt — l'identifiant, lui, change à
       chaque fois que le classeur repose la ligne. */
    if(l.length && l[0].etat === 'a-corriger' && typeof showToast === 'function'){
      try{
        const cle = cleDuBrouillon(l[0]);
        if(localStorage.getItem('ec_bilan_annonce') !== cle){
          localStorage.setItem('ec_bilan_annonce', cle);
          showToast('📝 Un bilan généré au bureau t\'attend — à corriger');
        }
      }catch(e){}
    }

    if(l.length){
      proposerBrouillonServeur(l[0], l.length);
    }else{
      /* Plus rien en attente : la ligne s'en va d'elle-même. Sans
         ça, un bilan enregistré ailleurs laissait sa bannière
         jusqu'au prochain rechargement de la page. */
      const zone = $('bilanPretBanner');
      if(zone){
        Array.prototype.slice.call(zone.querySelectorAll('.ligneBrouillonServeur'))
          .forEach(x => x.remove());
        if(!zone.children.length) zone.style.display = 'none';
      }
    }
  }catch(e){ /* hors ligne : la sauvegarde locale prend le relais */ }
}


/* ============================================================
   CE QUI DÉSIGNE LE COURS, ET PAS LE DÉPÔT

   L'identifiant du brouillon change à CHAQUE dépôt : le classeur
   remplace la ligne et refabrique un « br + heure ». Il ne
   pouvait donc désigner ni « celui que j'ai déjà masqué » ni
   « celui que j'affiche déjà » — c'est le cours qu'il faut
   nommer, pas le dépôt.

   L'état en fait partie : masquer « un cours n'a pas abouti » ne
   doit pas masquer le bilan que le bureau renvoie ensuite pour
   le même cours.
   ============================================================ */
function cleDuBrouillon(b){
  return [String((b && b.eleve) || ''),
          String((b && b.dateCours) || ''),
          String((b && b.etat) || '')].join('|');
}


/* ============================================================
   UN COURS = UNE LIGNE

   David : « avant même que tu supprimes, le même cours s'affiche
   deux fois : en haut ta copie, en bas le serveur ».

   Les deux bandeaux ne parlent pas de la même mémoire — celui du
   haut dit ce qui est SUR CET APPAREIL, celui du bas ce qui est
   SUR LE SERVEUR — mais pour le moniteur c'est un seul cours, et
   deux lignes pour un cours donnent l'impression que deux cours
   se sont perdus.

   Celui du haut gagne : c'est lui qui rouvre la fiche avec
   chaque réponse à sa place. Celui du bas s'efface.
   ============================================================ */
function coursDeCetAppareil(){
  const noms = [];

  try{
    const s = (typeof lireSauvegarde === 'function') ? lireSauvegarde() : null;
    if(s && s.eleve && (s.transcript || s.bilan)) noms.push(s.eleve);
  }catch(e){}

  try{
    const l = (typeof tousLesBrouillons === 'function') ? tousLesBrouillons() : [];
    l.forEach(x => { if(x && x.eleve) noms.push(x.eleve); });
  }catch(e){}

  return noms;
}


function dejaSurCetAppareil(b){
  const qui = (typeof normaliserMot === 'function')
    ? normaliserMot(String((b && b.eleve) || '')) : '';
  if(!qui) return false;
  return coursDeCetAppareil().some(n => normaliserMot(n) === qui);
}


/* Le moniteur a supprimé sa copie : la ligne se range, la dictée
   reste. C'est le seul geste du moniteur sur le serveur, et il ne
   détruit rien — seul le bureau supprime, devant sa liste. */
async function ecarterBrouillonServeur(eleve, id){
  if(!eleve && !id) return false;
  try{
    const r = await appelPrep({ action: 'brouillonEtat', etat: 'ecarte',
                                id: id || '', eleve: eleve || '' });
    return !!(r && r.touche);
  }catch(e){ return false; }
}


/* ============================================================
   DIRE POURQUOI, ET DIRE QUOI

   David : « ce qui serait bien quand c'est en bas pour les cours
   n'a pas abouti, c'est que ça écrive clairement pourquoi il est
   là et le type de cours que c'était ».

   Trois raisons possibles, et elles n'appellent pas le même
   geste. Les confondre sous « un cours n'a pas abouti », c'est
   demander au moniteur de rouvrir la dictée pour comprendre ce
   qu'on attend de lui.
   ============================================================ */
function raisonBrouillon(b){
  const etat = String((b && b.etat) || '');

  if(etat === 'a-corriger'){
    return 'Le bureau l\'a généré à ta place : relis-le, corrige, ' +
           'puis enregistre.';
  }

  if(etat === 'en-generation'){
    /* Passé une demi-heure ce n'est plus une génération en cours,
       c'est une génération qui n'est jamais revenue. Même seuil
       qu'au bureau, dans ec-encours.js. */
    const vieux = (function(){
      const m = String((b && b.deposeLe) || '')
        .match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
      if(!m) return false;
      const t = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime();
      return (Date.now() - t) > 30 * 60 * 1000;
    })();

    return vieux
      ? 'La génération a été lancée et n\'est jamais revenue. ' +
        'Reprends-le pour la relancer.'
      : 'Le bilan est en train de se fabriquer…';
  }

  return 'Ta dictée est sur le serveur, mais le bilan n\'a jamais ' +
         'été enregistré.';
}


/* Le modèle de bilan, sous son nom lisible. « examen-blanc » ne
   dit rien au moniteur ; « Examen blanc », si. */
function nomDuModeleBrouillon(b){
  const cle = String((b && b.modele) || '').trim();
  if(!cle) return '';
  try{
    const m = (typeof MODELES !== 'undefined') ? MODELES[cle] : null;
    if(m && m.label) return m.label;
  }catch(e){}
  return cle;
}


/* Ce qu'il y a dedans : une dictée de trois mots et une de mille
   ne se reprennent pas de la même façon. */
function motsDuBrouillon(b){
  const n = String((b && b.transcript) || '').trim()
    .split(/\s+/).filter(Boolean).length;

  /* Une fiche remplie n'a pas de mots dictés : c'est le miroir de
     ses cases qu'on compterait, et ça ne voudrait rien dire. */
  if(String((b && b.fiche) || '').trim()) return 'Fiche remplie à la main';

  return n ? n + ' mots dictés' : 'Rien de dicté';
}


/* Ce que le serveur garde pour cet élève, s'il garde quelque
   chose.

   ⚠️ SANS RÉSEAU, ON REND « RIEN ». C'est volontaire : la
   question posée au moniteur sera alors la ferme — « rien n'a été
   déposé, ce cours est perdu pour de bon ». Mieux vaut retenir sa
   main pour rien que lui promettre une sécurité qu'on n'a pas pu
   vérifier. */
async function brouillonServeurDe(eleve){
  const qui = (typeof normaliserMot === 'function')
    ? normaliserMot(String(eleve || '')) : '';
  if(!qui) return null;
  try{
    const d = await appelPrep({ action: 'brouillonList' });
    const l = (d && d.brouillons) || [];
    return l.find(b => b && b.etat !== 'ecarte' &&
                       normaliserMot(String(b.eleve || '')) === qui) || null;
  }catch(e){ return null; }
}


function proposerBrouillonServeur(b, combien){
  const zone = $('bilanPretBanner');
  if(!zone || !b) return;

  const cle = cleDuBrouillon(b);

  /* ------------------------------------------------------------
     UNE SEULE LIGNE PAR COURS

     « Pourquoi est-ce que j'ai autant de lignes ? »

     Cette bannière est relue toutes les trois minutes et à chaque
     retour sur l'application — et elle AJOUTAIT à chaque fois.
     Un seul cours en attente donnait sept lignes en une matinée,
     toutes les mêmes, et ça ressemblait à sept cours perdus.

     On efface les lignes de brouillon avant de reposer celle du
     moment. Les lignes de « afficherBilansEnFond » vivent dans la
     même zone et ne bougent pas : c'est à ça que sert la classe.
     ------------------------------------------------------------ */
  Array.prototype.slice.call(zone.querySelectorAll('.ligneBrouillonServeur'))
    .forEach(x => x.remove());

  const aCorriger = (b.etat === 'a-corriger') && String(b.bilan || '').trim();

  /* ⚠️ UN COURS = UNE LIGNE. Ce cours est déjà en haut de l'écran,
     avec sa fiche complète : on ne le redit pas ici.

     Sauf un bilan que le bureau vient de renvoyer — celui-là est
     une nouvelle, pas un doublon, et il doit se voir même si le
     moniteur a encore sa copie. */
  if(!aCorriger && dejaSurCetAppareil(b)){
    if(!zone.children.length) zone.style.display = 'none';
    return;
  }

  /* Déjà masqué sur cet appareil : ne pas le reproposer */
  try{
    if(localStorage.getItem('ec_brouillon_vu') === cle){
      if(!zone.children.length) zone.style.display = 'none';
      return;
    }
  }catch(e){}

  const d = document.createElement('div');
  d.className = 'ligneBrouillonServeur';
  d.style.cssText = 'display:flex;gap:9px;align-items:center;';

  const echap = s => String(s || '').replace(/</g, '&lt;');

  const t = document.createElement('span');
  t.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.5;';
  t.innerHTML = (aCorriger
      ? '<strong style="color:var(--bleu);">📝 Un bilan t\'attend</strong>' +
        '<span style="color:var(--muted);font-size:11px;"> — généré au bureau</span>'
      : '<strong style="color:var(--accent-text);">💾 Un cours n\'a ' +
        'pas abouti</strong>') +
    /* ⚠️ POURQUOI CETTE LIGNE EST LÀ, ÉCRIT NOIR SUR BLANC.

       David : « ce qui serait bien, c'est que ça écrive clairement
       pourquoi il est là et le type de cours que c'était ».

       « Un cours n'a pas abouti » dit qu'il y a un problème, pas
       lequel — et devant sept lignes identiques on ne peut ni les
       distinguer ni décider laquelle reprendre. La raison et le
       modèle changent tout : un examen blanc de ce matin ne se
       traite pas comme une leçon d'il y a trois jours. */
    '<div style="font-size:11.5px;color:var(--cream);margin-top:3px;">' +
      raisonBrouillon(b) + '</div>' +
    '<div style="font-size:11px;color:var(--muted);">' +
      echap(b.eleve || 'sans nom') +
      (nomDuModeleBrouillon(b) ? ' · ' + echap(nomDuModeleBrouillon(b)) : '') +
      (b.dateCours ? ' · cours du ' + echap(b.dateCours) : '') +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);">' +
      motsDuBrouillon(b) +
      (b.deposeLe ? ' · déposé le ' + echap(b.deposeLe) : '') +
      (combien > 1 ? ' · ' + combien + ' au total' : '') +
    '</div>';
  d.appendChild(t);

  const bR = document.createElement('button');
  bR.className = 'btn btn-primary';
  bR.style.cssText = 'width:auto;padding:9px 13px;font-size:12px;margin:0;' +
    'flex-shrink:0;';
  bR.textContent = aCorriger ? '↩️ Le corriger' : '↩️ Reprendre';
  bR.addEventListener('click', () => reprendreBrouillonServeur(b));
  d.appendChild(bR);

  const bX = document.createElement('button');
  bX.className = 'btn btn-secondary';
  bX.style.cssText = 'width:auto;padding:9px 11px;font-size:12px;margin:0;' +
    'flex-shrink:0;color:var(--muted);';
  bX.textContent = '✕';
  bX.title = 'Masquer';
  bX.addEventListener('click', () => {
    /* On masque sans supprimer : le cours reste récupérable
       depuis un autre appareil. */
    try{ localStorage.setItem('ec_brouillon_vu', cle); }catch(e){}
    d.remove();
    if(!zone.children.length) zone.style.display = 'none';
  });
  d.appendChild(bX);

  zone.appendChild(d);
  zone.style.display = 'block';
}


async function reprendreBrouillonServeur(b){
  /* UN SEUL COURS OUVERT À LA FOIS — l'autre porte d'entrée de
     l'écran de cours, même règle que « Mes prochains cours ». On
     ne regardait que la dictée : un bilan généré et pas encore
     enregistré ou une fiche manuelle en cours restaient dessous. */
  if(typeof travailEnCoursMoniteur === 'function' && travailEnCoursMoniteur()){
    const ouvert = ($('studentName') && $('studentName').value.trim()) || 'Un autre';
    if(!await confirmer(
        'Le cours de ' + ouvert + ' est encore ouvert.\n\n' +
        ouOnRetrouveLeCoursOuvert() + ' Reprendre celui de ' + b.eleve +
        ' à la place ?', 'Reprendre quand même')) return;

    if(typeof deposerBrouillonServeur === 'function'){
      try{ await deposerBrouillonServeur(); }catch(e){}
    }
    if(typeof fermerLeCoursOuvert === 'function') fermerLeCoursOuvert();
  }

  /* ============================================================
     UNE FICHE SE ROUVRE, ELLE NE SE RECOLLE PAS

     « Quand je reprends un cours manuel, tout le texte apparaît
     dans la case de transcription vocale, je ne peux pas le
     continuer. »

     Le brouillon d'un bilan manuel porte deux choses : le MIROIR
     lisible — c'est ce que le bureau lit dans la liste — et les
     RÉPONSES elles-mêmes. Sans les secondes, reprendre ne pouvait
     que recoller le premier, et la seule case qui accepte du texte
     libre est celle de la dictée.

     Quand les réponses sont là, on passe par « reprendreBrouillon »
     — LA MÊME fonction que la reprise sur l'appareil, celle qui
     repose chaque valeur dans sa case et rallume les boutons. Un
     deuxième chemin de réouverture finirait par ne pas faire la
     même chose que le premier.
     ============================================================ */
  const fiche = (function(){
    try{
      const o = JSON.parse(b.fiche || 'null');
      return (o && (o.saisies || o.champs)) ? o : null;
    }catch(e){ return null; }
  })();

  if(fiche && typeof reprendreBrouillon === 'function'){
    /* Le bureau doit pouvoir le renvoyer au moniteur : c'est cette
       marque-là qui fait apparaître le bouton. */
    brouillonRepris = b;

    /* Rien dans la case de dictée : ce cours n'en a pas, et un
       reste de texte y partirait dans le bilan. */
    if($('transcriptBox')) $('transcriptBox').value = '';
    if(typeof finalTranscript !== 'undefined') finalTranscript = '';
    if(typeof committedTranscript !== 'undefined') committedTranscript = '';

    if(typeof afficherOnglet === 'function') afficherOnglet('cours', true);
    if(typeof afficherVue === 'function') afficherVue('cours', 'cours');

    /* Le moniteur du brouillon, pas celui qui appuie : le bilan
       doit rester au nom de qui a fait le cours. */
    if(!fiche.moniteur && b.moniteur) fiche.moniteur = b.moniteur;
    if(!fiche.eleve && b.eleve) fiche.eleve = b.eleve;

    reprendreBrouillon(fiche);
    return;
  }

  if($('modele') && b.modele){
    $('modele').value = b.modele;
    if(typeof adapterAuModele === 'function') adapterAuModele();
  }
  /* Le nom du moniteur voyage avec le brouillon : sans lui, un
     bilan repris au bureau serait enregistré au nom de qui l'a
     généré — faux dans l'historique de l'élève, faux pour la paie. */
  if($('monitorName') && b.moniteur) $('monitorName').value = b.moniteur;
  if($('studentName')) $('studentName').value = b.eleve || '';
  if($('lessonDate') && b.dateCours) $('lessonDate').value = b.dateCours;
  if($('site') && b.site) $('site').value = b.site;
  if($('noteInterne')) $('noteInterne').value = b.note || '';

  if($('transcriptBox')){
    $('transcriptBox').value = b.transcript || '';
    $('transcriptBox').style.display = 'block';
  }
  if(typeof finalTranscript !== 'undefined') finalTranscript = b.transcript || '';
  if(typeof committedTranscript !== 'undefined'){
    committedTranscript = b.transcript || '';
  }

  /* Ce brouillon est-il repris depuis le bureau ? On le retient :
     le bouton « renvoyer au moniteur » n'a de sens que là. */
  brouillonRepris = b;

  /* ET ON Y EST DÉJÀ.

     Montrer la carte du cours ne suffit pas : elle appartient à
     l'onglet « Cours », et tant qu'on reste sur « Cours non
     terminés » c'est cet onglet-là qui décide de ce qui s'affiche.
     Reprendre un cours obligeait donc à aller ensuite le chercher
     à la main. */
  if(typeof afficherOnglet === 'function') afficherOnglet('cours', true);
  if(typeof afficherVue === 'function') afficherVue('cours', 'cours');

  const aCorriger = (b.etat === 'a-corriger') && String(b.bilan || '').trim();

  if(aCorriger){
    /* Le bureau a déjà généré : on atterrit sur le bilan, pas sur
       l'écran de dictée. Le moniteur ne doit pas une seconde
       croire qu'il faut tout recommencer. */
    if($('resultText')) $('resultText').value = b.bilan;
    if($('noteResult')) $('noteResult').value = b.note || '';
    if($('recordView')) $('recordView').style.display = 'none';
    if($('generatingView')) $('generatingView').style.display = 'none';
    if($('resultView')) $('resultView').style.display = 'block';
  }else{
    if($('resultView')) $('resultView').style.display = 'none';
    if($('generatingView')) $('generatingView').style.display = 'none';
    if($('recordView')) $('recordView').style.display = 'block';

    /* LE COURS REPRIS EST PRÊT À ÊTRE TERMINÉ.

       La dictée était bien chargée, mais l'écran restait celui
       d'un cours qui n'a pas commencé : ni compteur, ni bouton
       « Terminer et générer ». Il fallait relancer le micro pour
       le faire apparaître — sur un cours pourtant déjà fini. */
    const t = $('transcriptBox');
    if(t && t.value.trim()){
      if($('transcriptAide')) $('transcriptAide').style.display = 'block';
      if($('compteur')){
        $('compteur').style.display = 'block';
        $('compteur').textContent =
          t.value.trim().split(/\s+/).filter(Boolean).length + ' mots';
      }
      if($('finishBtn')) $('finishBtn').style.display = 'block';
      if($('recBtn')) $('recBtn').textContent = "🎙️ Reprendre l'enregistrement";
    }
  }

  const zone = $('bilanPretBanner');
  if(zone){ zone.innerHTML = ''; zone.style.display = 'none'; }

  majBoutonRenvoi();

  if(typeof sauvegarderLocal === 'function') sauvegarderLocal(true);
  window.scrollTo(0, 0);
  showToast(aCorriger
    ? 'Bilan généré au bureau — relis, corrige, puis enregistre'
    : 'Cours retrouvé — appuie sur Terminer pour générer');
}


/* ============================================================
   RENVOYER LE BILAN AU MONITEUR

   Le bureau génère vite, avec une bonne connexion. Mais il n'était
   pas dans la voiture : il ne peut pas dire si la correction de
   l'IA est juste. Ce qu'il produit est une PROPOSITION, pas un
   bilan — seul le moniteur qui a fait le cours peut la valider,
   et c'est lui qui l'enregistrera, sous son nom.
   ============================================================ */
let brouillonRepris = null;

/* Le bouton n'apparaît que sur le cours d'un autre moniteur */
function majBoutonRenvoi(){
  const b = $('renvoyerMoniteur');
  if(!b) return;

  const bp = brouillonRepris;
  const moi = (typeof ACCES !== 'undefined' && ACCES.moniteur) || '';
  const autre = bp && bp.moniteur &&
                normaliserMot(bp.moniteur) !== normaliserMot(moi);

  b.style.display = autre ? 'block' : 'none';
  if(autre) b.textContent = '📤 Renvoyer à ' + bp.moniteur + ' pour correction';
}

async function renvoyerAuMoniteur(){
  const bp = brouillonRepris;
  if(!bp || !bp.moniteur) return;

  const bilan = ($('resultText') && $('resultText').value.trim()) || '';
  if(!bilan){
    showToast("Génère le bilan avant de le renvoyer.");
    return;
  }

  if(!await confirmer('Renvoyer ce bilan à ' + bp.moniteur + ' ?\n\n' +
      "Rien n'est enregistré : il le relira, le corrigera et " +
      "l'enregistrera lui-même — c'est lui qui était dans la voiture.")) return;

  const b = $('renvoyerMoniteur');
  if(b){ b.disabled = true; b.textContent = 'Envoi…'; }

  try{
    await deposerBrouillonServeur({
      pour: bp.moniteur,
      eleve: bp.eleve,
      dateCours: bp.dateCours || '',
      modele: bp.modele || '',
      site: bp.site || '',
      transcript: bp.transcript || '',
      note: ($('noteResult') && $('noteResult').value) || bp.note || '',
      bilan: bilan,
      etat: 'a-corriger'
    });

    /* Prévenir tout de suite : sans message, il rouvrirait
       l'application le lendemain sans savoir que son cours l'attend. */
    if(typeof envoyerConsigne === 'function'){
      try{
        await envoyerConsigne(bp.eleve, 'bilan',
          'Bilan généré au bureau — à relire, corriger et enregistrer (' +
          (bp.dateCours || '') + ')');
      }catch(e){}
    }

    showToast('Renvoyé à ' + bp.moniteur + ' ✅');
    if(b){ b.disabled = false; b.textContent = '✅ Renvoyé à ' + bp.moniteur; }

    /* On ne garde pas le cours d'un autre à l'écran : ce serait
       l'occasion de l'enregistrer par mégarde à sa place. */
    setTimeout(() => {
      brouillonRepris = null;
      if($('resultView')) $('resultView').style.display = 'none';
      if($('recordView')) $('recordView').style.display = 'block';
      if($('resultText')) $('resultText').value = '';
      if($('studentName')) $('studentName').value = '';
      if($('transcriptBox')) $('transcriptBox').value = '';
      if(typeof finalTranscript !== 'undefined') finalTranscript = '';
      majBoutonRenvoi();
      if(typeof afficherEnCours === 'function') afficherEnCours(true);
    }, 1200);

  }catch(e){
    showToast('Envoi impossible : ' + e.message);
    if(b){ b.disabled = false; majBoutonRenvoi(); }
  }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-arriereplan.js'] = true;
