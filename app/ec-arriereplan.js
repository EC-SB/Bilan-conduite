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


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-arriereplan.js'] = true;
