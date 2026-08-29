/* Déployé le 29/08/2026 à 15:14 — v732 */
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

async function deposerSiChange(){
  try{
    if(typeof ACCES === 'undefined' || !ACCES.code) return;
    const texte = String(texteDicteEnCours());
    if(texte.length < MINI_DEPOT) return;
    if(texte === dernierDepot) return;

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
    const l = (d && d.brouillons) || [];

    /* Un bilan à corriger passe devant : c'est celui qui attend
       une action, et le bureau vient de le renvoyer. */
    l.sort((a, b) => (b.etat === 'a-corriger') - (a.etat === 'a-corriger'));

    /* Annoncé une fois, à voix haute : le moniteur doit savoir
       tout de suite que son cours l'attend. */
    if(l.length && l[0].etat === 'a-corriger' && typeof showToast === 'function'){
      try{
        if(localStorage.getItem('ec_bilan_annonce') !== l[0].id){
          localStorage.setItem('ec_bilan_annonce', l[0].id);
          showToast('📝 Un bilan généré au bureau t\'attend — à corriger');
        }
      }catch(e){}
    }

    if(l.length) proposerBrouillonServeur(l[0], l.length);
  }catch(e){ /* hors ligne : la sauvegarde locale prend le relais */ }
}


function proposerBrouillonServeur(b, combien){
  const zone = $('bilanPretBanner');
  if(!zone || !b) return;

  /* Déjà repris sur cet appareil : ne pas le proposer deux fois */
  try{
    if(localStorage.getItem('ec_brouillon_vu') === b.id) return;
  }catch(e){}

  const d = document.createElement('div');
  d.style.cssText = 'display:flex;gap:9px;align-items:center;';

  const aCorriger = (b.etat === 'a-corriger') && String(b.bilan || '').trim();

  const t = document.createElement('span');
  t.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.5;';
  t.innerHTML = (aCorriger
      ? '<strong style="color:var(--bleu);">📝 Un bilan t\'attend</strong>' +
        '<span style="color:var(--muted);font-size:11px;"> — généré au bureau</span>'
      : '<strong style="color:var(--accent-text);">💾 Un cours n\'a ' +
        'pas abouti</strong>') +
    '<div style="font-size:11px;color:var(--muted);">' +
      (b.eleve || 'sans nom').replace(/</g, '&lt;') +
      (b.dateCours ? ' · ' + b.dateCours : '') +
      (b.deposeLe ? ' · déposé le ' + b.deposeLe : '') +
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
    try{ localStorage.setItem('ec_brouillon_vu', b.id); }catch(e){}
    d.remove();
    if(!zone.children.length) zone.style.display = 'none';
  });
  d.appendChild(bX);

  zone.appendChild(d);
  zone.style.display = 'block';
}


async function reprendreBrouillonServeur(b){
  const enCours = ($('transcriptBox') && $('transcriptBox').value.trim());
  if(enCours && !await confirmer(
      'Un cours est déjà en cours de saisie.\n\n' +
      'Reprendre celui de ' + b.eleve + ' à la place ?')) return;

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
