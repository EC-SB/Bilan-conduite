/* Déployé le 28/08/2026 à 13:14 — v651 */
/* ============================================================
   ec-demarrage.js
   Sauvegarde locale, tiroirs et démarrage de l'application
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   SAUVEGARDE LOCALE — récupération après plantage
   Tout est conservé dans le téléphone, rien n'est envoyé.
   ============================================================ */
const CLE_SAUVEGARDE = 'bilan_en_cours';
/* derniereSauvegarde : déclaré dans ec-etat.js */

function sauvegarderLocal(force){
  const maintenant = Date.now();
  if(!force && maintenant - derniereSauvegarde < 4000) return;   /* au plus toutes les 4 s */
  derniereSauvegarde = maintenant;
  try{
    const champ = $('transcriptBox');
    const texte = (champ && champ.value) ? champ.value : finalTranscript;
    const resultat = $('resultText');
    localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify({
      ts: maintenant,
      modele: $('modele').value,
      moniteur: $('monitorName').value,
      eleve: $('studentName').value,
      site: $('site').value,
      date: $('lessonDate').value,
      note: $('noteInterne').value,
      transcript: texte || '',
      bilan: resultat ? resultat.value : '',
      noteResult: $('noteResult') ? $('noteResult').value : '',
      /* Ce que le moniteur a coché pendant le cours : sans ça, un
         plantage lui faisait tout recocher de mémoire. */
      entete: (typeof enteteDuCours === 'function') ? enteteDuCours() : null,
      fiche: [...document.querySelectorAll('.mCours')]
               .filter(x => x.checked)
               .map(x => x.value)
    }));
  }catch(e){
    /* Le stockage est plein, ou le navigateur le refuse. Sans
       cette alerte, le moniteur croyait son cours à l'abri. */
    if(!sauvegardeEnPanne){
      sauvegardeEnPanne = true;
      if(typeof showToast === 'function'){
        showToast('⚠️ Sauvegarde impossible sur cet appareil');
      }
    }
  }
}

/* Signalé une seule fois : le répéter toutes les 4 secondes
   rendrait l'application inutilisable. */
let sauvegardeEnPanne = false;

function lireSauvegarde(){
  try{
    const brut = localStorage.getItem(CLE_SAUVEGARDE);
    return brut ? JSON.parse(brut) : null;
  }catch(e){ return null; }
}

function effacerSauvegarde(){
  try{ localStorage.removeItem(CLE_SAUVEGARDE); }catch(e){}
  derniereSauvegarde = 0;
}

/* Propose de reprendre un cours interrompu */
function proposerReprise(){
  const s = lireSauvegarde();
  const banniere = $('repriseBanner');
  if(!banniere) return;

  /* Ce que le serveur garde : un cours déposé mais jamais abouti.
     Il survit au rechargement, au changement d'appareil, à un
     stockage local défaillant. */
  if(typeof chercherBrouillonsServeur === 'function'){
    setTimeout(() => chercherBrouillonsServeur(), 1500);
  }

  /* Une séance à plusieurs interrompue : elle prime, c'est
     plusieurs bilans qui attendent. */
  const sp = (typeof postesEnCours === 'function') ? postesEnCours() : null;
  if(sp && (!postes || !postes.length)){
    proposerRepriseSeance(sp, banniere);
    return;
  }

  /* Un bilan manuel commencé compte autant qu'une dictée : c'est
     du travail perdu de la même façon. */
  const brouillons = (typeof tousLesBrouillons === 'function')
    ? tousLesBrouillons() : [];

  const b1 = $('repriseOui');
  if(b1) b1.style.display = '';

  if(!s || (!s.transcript && !s.bilan)){
    /* Plusieurs élèves en cours : on les liste plutôt que de n'en
       proposer qu'un. */
    if(brouillons.length > 1){
      proposerListeBrouillons(brouillons, banniere);
      return;
    }
    if(brouillons.length === 1){
      proposerRepriseManuelle(brouillons[0], banniere);
      return;
    }
    banniere.style.display = 'none';
    return;
  }

  const bOui = $('repriseOui');
  if(bOui) delete bOui.dataset.manuel;

  const mots = String(s.transcript || '').trim().split(/\s+/).filter(Boolean).length;
  const quand = new Date(s.ts || Date.now());
  const p2 = n => String(n).padStart(2, '0');
  const quandTexte = p2(quand.getDate()) + '/' + p2(quand.getMonth() + 1) +
                     ' à ' + p2(quand.getHours()) + ':' + p2(quand.getMinutes());

  $('repriseInfo').textContent =
    (s.eleve ? s.eleve + ' — ' : '') + mots + ' mots' +
    (s.bilan ? ' + bilan généré' : '') + ' · interrompu le ' + quandTexte;
  banniere.style.display = 'block';
}

/* Plusieurs bilans en cours : le jour d'un examen, le moniteur
   en a un par élève dans la voiture. */
function proposerListeBrouillons(liste, banniere){
  const zone = $('repriseInfo');
  zone.innerHTML = '';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;';
  t.textContent = liste.length + ' bilan(s) commencé(s) — appuie pour reprendre';
  zone.appendChild(t);

  liste.forEach(b => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:9px;align-items:center;padding:8px 0;' +
      'border-top:1px solid rgba(255,255,255,.06);cursor:pointer;';

    const quand = new Date(b.ts || Date.now());
    const p2 = n => String(n).padStart(2, '0');
    const remplis = (b.saisies || []).filter(x => x.valeur).length;

    l.innerHTML = '<span style="flex:1;min-width:0;font-size:14px;' +
      'line-height:1.4;color:var(--cream);">' +
      '<strong>' + String(b.eleve || '?').replace(/</g, '&lt;') + '</strong>' +
      '<div style="font-size:11px;color:var(--muted);">' +
        (b.avantEnvoye ? '📤 avant examen envoyé · ' : '') +
        remplis + ' réponse(s) · ' +
        p2(quand.getHours()) + ':' + p2(quand.getMinutes()) +
      '</div></span>' +
      '<span style="flex-shrink:0;color:var(--accent-text);">▸</span>';

    l.addEventListener('click', () => {
      if(typeof reprendreBrouillon === 'function') reprendreBrouillon(b);
    });
    zone.appendChild(l);
  });

  /* Le bouton Reprendre n'a plus de sens : on choisit dans la
     liste. Seule la suppression reste. */
  const b1 = $('repriseOui');
  if(b1) b1.style.display = 'none';

  banniere.style.display = 'block';
}


/* La bannière pour un bilan manuel interrompu */
/* La bannière pour une séance à plusieurs interrompue */
function proposerRepriseSeance(d, banniere){
  const noms = (d.postes || []).map(p => p.eleve.split(' ')[0]).join(', ');
  const finis = (d.postes || []).filter(p => p.fait).length;

  $('repriseInfo').textContent =
    '🎮 Séance à ' + (d.postes || []).length + ' postes — ' + noms +
    ' · ' + finis + ' bilan(s) terminé(s)';

  const b = $('repriseOui');
  if(b){
    b.style.display = '';
    delete b.dataset.manuel;
    b.dataset.seance = 'oui';
  }
  banniere.style.display = 'block';
}


function proposerRepriseManuelle(man, banniere){
  const quand = new Date(man.ts || Date.now());
  const p2 = n => String(n).padStart(2, '0');
  const quandTexte = p2(quand.getDate()) + '/' + p2(quand.getMonth() + 1) +
                     ' à ' + p2(quand.getHours()) + ':' + p2(quand.getMinutes());

  /* Ce qui a été rempli : c'est ce qui rassure le moniteur */
  const remplis = (man.saisies || []).filter(x => x.valeur).length;

  const nom = (typeof MODELES !== 'undefined' && MODELES[man.modele])
    ? MODELES[man.modele].label : 'Bilan';

  $('repriseInfo').textContent =
    (man.eleve ? man.eleve + ' — ' : '') + nom + ' à la main · ' +
    (man.avantEnvoye ? '📤 avant examen envoyé · ' : '') +
    remplis + ' rubrique(s) remplie(s) · ' + quandTexte;

  /* Le bouton reprend le bilan manuel, pas la dictée */
  const b = $('repriseOui');
  if(b) b.dataset.manuel = 'oui';
  banniere.style.display = 'block';
}


function reprendreCours(){
  /* Un bilan manuel interrompu se rouvre à sa fiche, pas à la
     page de dictée. */
  const b0 = $('repriseOui');
  if(b0 && b0.dataset.seance === 'oui'){
    delete b0.dataset.seance;
    const sp = (typeof postesEnCours === 'function') ? postesEnCours() : null;
    if(sp) reprendrePostes(sp);
    const ban = $('repriseBanner');
    if(ban) ban.style.display = 'none';
    return;
  }

  const b = $('repriseOui');
  if(b && b.dataset.manuel === 'oui'){
    delete b.dataset.manuel;
    reprendreBilanManuel();
    return;
  }

  const s = lireSauvegarde();
  if(!s) return;
  if(s.modele){ $('modele').value = s.modele; adapterAuModele(); }
  $('monitorName').value = s.moniteur || $('monitorName').value;
  $('studentName').value = s.eleve || '';
  if(s.site) $('site').value = s.site;
  if(s.date) $('lessonDate').value = s.date;
  $('noteInterne').value = s.note || '';
  if(typeof majAffichageNoteInterne === 'function') majAffichageNoteInterne();

  finalTranscript = s.transcript || '';
  committedTranscript = finalTranscript;
  if(finalTranscript){
    $('transcriptBox').value = finalTranscript;
    $('transcriptBox').style.display = 'block';
    $('transcriptAide').style.display = 'block';
    $('compteur').style.display = 'block';
    $('compteur').textContent = finalTranscript.trim().split(/\s+/).filter(Boolean).length + ' mots';
    $('finishBtn').style.display = 'block';
    $('recBtn').textContent = "🎙️ Reprendre l'enregistrement";
  }

  if(s.bilan){
    $('resultText').value = s.bilan;
    afficherNote(s.noteResult || s.note || '');
    marquerExport(false);
    $('recordView').style.display = 'none';
    $('resultView').style.display = 'block';
    /* Les procédures à cocher, prêtes dès l'affichage du bilan */
    if(typeof remplirListeRecitations === 'function') remplirListeRecitations();
  }

  /* Les métadonnées du cours se reconstruisent : sans elles, un
     bilan repris après un rechargement partait dans Sheets avec la
     date, le site et l'élève vides. */
  const mod = MODELES[s.modele] || {};
  currentLessonMeta = {
    modeleLabel: mod.label || '',
    studentName: s.eleve || '',
    monitorName: s.moniteur || ACCES.moniteur || '',
    site: s.site || '',
    dateStr: s.date || '',
    dateCourte: (typeof dateCourteDuJour === 'function')
      ? dateCourteDuJour(s.date || '') : '',
    noteInterne: s.note || '',
    ts: s.ts || Date.now()
  };

  /* Les cases cochées avant le plantage : on les remet dès que les
     panneaux sont dessinés, sinon il n'y a rien à cocher. */
  if(s.entete || (s.fiche && s.fiche.length)){
    (async () => {
      if(typeof afficherEnteteDuCours === 'function') afficherEnteteDuCours();

      /* On ATTEND que la fiche soit dessinée : elle lit les bilans
         antérieurs sur le serveur, et un délai fixe de 400 ms ne
         suffisait pas sur un réseau lent — les coches étaient
         remises sur des cases qui n'existaient pas encore. */
      if(typeof afficherFicheDuCours === 'function'){
        try{ await afficherFicheDuCours(); }catch(e){ /* on remet quand même */ }
      }

      if(s.entete){
        document.querySelectorAll('.entCase').forEach(cb => {
          const v = s.entete[cb.getAttribute('data-cle')];
          if(v !== undefined) cb.checked = (v === '✅');
        });
        document.querySelectorAll('.entTexte').forEach(i => {
          const v = s.entete[i.getAttribute('data-cle')];
          if(v) i.value = v;
        });
      }

      const remettreFiche = () => {
        if(!s.fiche || !s.fiche.length) return 0;
        let n = 0;
        document.querySelectorAll('.mCours').forEach(cb => {
          if(s.fiche.indexOf(cb.value) !== -1){ cb.checked = true; n++; }
        });
        return n;
      };

      /* Un second passage si les cases manquaient encore : la fiche
         peut se redessiner après un chargement différé. */
      if(remettreFiche() < (s.fiche || []).length){
        setTimeout(remettreFiche, 800);
        setTimeout(remettreFiche, 2500);
      }
    })();
  }

  $('repriseBanner').style.display = 'none';
  showToast('Cours récupéré ✅');
}

/* ---------- Thème clair / sombre ---------- */
function appliquerTheme(clair){
  document.body.classList.toggle('clair', clair);
  $('themeBtn').textContent = clair ? '☀️' : '🌙';
  try{ localStorage.setItem('theme', clair ? 'clair' : 'sombre'); }catch(e){}
}

(function initTheme(){
  let clair = false;
  try{
    const enregistre = localStorage.getItem('theme');
    if(enregistre === 'clair') clair = true;
    else if(enregistre === 'sombre') clair = false;
    else if(window.matchMedia) clair = window.matchMedia('(prefers-color-scheme: light)').matches;
  }catch(e){
    /* stockage indisponible : on garde le thème sombre */
  }
  appliquerTheme(clair);
})();

$('repriseOui').addEventListener('click', reprendreCours);
$('repriseNon').addEventListener('click', async () => {
  if(!await confirmer('Supprimer définitivement ce cours interrompu ?')) return;

  /* Les deux brouillons : le vocal et le manuel. N'en effacer
     qu'un laissait la bannière revenir au rechargement. */
  effacerSauvegarde();
  if(typeof effacerBrouillonManuel === 'function') effacerBrouillonManuel();
  try{ localStorage.removeItem('ec_postes_simu'); }catch(e){}

  const b = $('repriseOui');
  if(b) delete b.dataset.manuel;

  $('repriseBanner').style.display = 'none';
  showToast('Supprimé ✅');
});

/* Sauvegarde aussi les corrections manuelles et les champs du formulaire */
['transcriptBox','studentName','monitorName','noteInterne','resultText','noteResult']
  .forEach(id => {
    const el = $(id);
    if(el) el.addEventListener('input', () => sauvegarderLocal());
  });

$('themeBtn').addEventListener('click', () => {
  appliquerTheme(!document.body.classList.contains('clair'));
});

/* Avertit si on ferme l'onglet avec un bilan non enregistré */
window.addEventListener('beforeunload', e => {
  if($('resultText') && $('resultText').value.trim() && !bilanEnregistre){
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});


/* ============================================================
   LE RETOUR ARRIÈRE

   La flèche du navigateur, ou celle du téléphone, faisait perdre
   la page en plein cours. On pose une entrée d'historique de
   trop : le retour la consomme au lieu de sortir.

   Quand un travail est en cours, on demande confirmation.
   ============================================================ */

let sortieDemandee = false;

function poserPiegeHistorique(){
  try{
    history.pushState({ ec: 1 }, '', location.href);
  }catch(e){ /* certains navigateurs le refusent : tant pis */ }
}


window.addEventListener('popstate', () => {
  /* Le moniteur a confirmé : on le laisse partir */
  if(sortieDemandee) return;

  /* On remet aussitôt l'entrée : sans elle, le prochain retour
     quitterait vraiment. */
  poserPiegeHistorique();

  /* Une fenêtre ouverte ? Le retour la ferme, c'est ce qu'on
     attend d'un bouton retour. */
  const fond = document.querySelector('.overlay.show');
  if(fond){
    const annuler = Array.prototype.find.call(
      fond.querySelectorAll('button'),
      b => /annuler|fermer/i.test(b.textContent));
    if(annuler){ annuler.click(); return; }
    try{ document.body.removeChild(fond); }catch(e){}
    return;
  }

  /* Un travail en cours : on prévient avant de perdre l'écran */
  if(travailEnCoursMoniteur()){
    confirmer('Ton travail est en cours.\n\n' +
      'Il est sauvegardé, mais tu vas quitter cet écran. ' +
      'Continuer ?', 'Revenir en arrière', true).then(ok => {
      if(!ok) return;
      sortieDemandee = true;
      history.back();
    });
    return;
  }

  /* Rien en cours : on revient à l'accueil plutôt que de sortir */
  if(typeof allerAuCours === 'function'){
    allerAuCours();
    showToast('Tu es sur l\'écran des cours');
  }
});


/* Ce qu'on ne veut pas perdre d'un retour arrière malheureux */
function travailEnCoursMoniteur(){
  if(typeof isRecording !== 'undefined' && isRecording) return true;

  const t = $('transcriptBox');
  if(t && t.value.trim()) return true;

  const r = $('resultText');
  if(r && r.value.trim() &&
     (typeof bilanEnregistre === 'undefined' || !bilanEnregistre)) return true;

  /* Une fiche manuelle en cours de saisie */
  if($('manuelView') && $('manuelView').style.display === 'block'){
    if(typeof champsManuels !== 'undefined' &&
       Object.keys(champsManuels || {}).length > 2) return true;
  }

  return false;
}


/* Le piège se pose une fois la session ouverte : avant, il n'y a
   rien à protéger. */
poserPiegeHistorique();

$('prepBtn').addEventListener('click', preparerNouveauCours);
$('manuelBtn').addEventListener('click', ouvrirBilanManuel);

if($('postesBtn')){
  $('postesBtn').addEventListener('click', () => ouvrirSeancePostes());
}
if($('ajoutProcedureBtn')){
  $('ajoutProcedureBtn').addEventListener('click', ajouterProcedureAuBilan);
}
if($('journalBtn')) $('journalBtn').addEventListener('click', afficherJournal);
if($('correctionBtn')) $('correctionBtn').addEventListener('click', ouvrirCorrectionMoniteur);
if($('corrigerBtn')) $('corrigerBtn').addEventListener('click', enregistrerCorrection);
if($('corrLeconBtn')) $('corrLeconBtn').addEventListener('click', corrigerLeconDuBilan);
if($('autreCoursBtn')) $('autreCoursBtn').addEventListener('click', commencerAutreCours);
if($('rattrapageBtn')) $('rattrapageBtn').addEventListener('click', rattraperExamensBlancs);
if($('remorqueActualiser')) $('remorqueActualiser').addEventListener('click', () => {
  if(typeof afficherBureau === 'function') afficherBureau(true);
  if(typeof afficherRemorque === 'function') afficherRemorque();
});
if($('motoActualiser')) $('motoActualiser').addEventListener('click', () => {
  if(typeof afficherBureau === 'function') afficherBureau(true);
  if(typeof afficherMoto === 'function') afficherMoto();
});
if($('statsBtn')) $('statsBtn').addEventListener('click', afficherStats);
if($('importBtn')) $('importBtn').addEventListener('click', importerListeEleves);
if($('rappelLire')) $('rappelLire').addEventListener('click', lirePlanning);
if($('rappelModeManuel')) $('rappelModeManuel').addEventListener('click', () => modeRappel('manuel'));
if($('rappelModePlanning')) $('rappelModePlanning').addEventListener('click', () => modeRappel('planning'));
if($('rappelModeHistorique')) $('rappelModeHistorique').addEventListener('click', () => modeRappel('historique'));
/* Le nom de l'élève commande trois choses : la validation, le
   dossier du cours précédent, et son Messenger. Le branchement du
   dossier avait disparu — plus rien ne s'affichait sous le champ. */
if($('studentName')){
  $('studentName').addEventListener('input', () => {
    verifierNomEleve('studentName', 'studentInfo', true);
    if(typeof planifierHistorique === 'function') planifierHistorique();
  });
  $('studentName').addEventListener('change', () => {
    chargerMessengerEleve();
    if(typeof planifierHistorique === 'function') planifierHistorique();
  });
}

/* Préparation d'un cours : même validation que pour un cours réel,
   et le dossier de l'élève s'affiche sous le champ. */
if($('prepEleve')){
  const majPrep = () => {
    verifierNomEleve('prepEleve', 'prepInfo', true);
    if(typeof chargerHistoriquePrep === 'function') chargerHistoriquePrep();
  };
  $('prepEleve').addEventListener('input', () => verifierNomEleve('prepEleve', 'prepInfo', true));
  $('prepEleve').addEventListener('change', majPrep);
}
if($('eleveMessenger')){
  $('eleveMessenger').addEventListener('input', majLienMessenger);
  $('eleveMessenger').addEventListener('blur', enregistrerMessengerEleve);
}
brancherFichierCsv();
if($('statsPeriode')) $('statsPeriode').addEventListener('change', afficherStats);
if($('statsRang')) $('statsRang').addEventListener('change', afficherStats);
/* Le menu et le bouton sont désormais construits par ec-messenger.js,
   et l'ouverture de l'onglet Permis déclenche l'affichage. */
if($('permisBureauBtn')) $('permisBureauBtn').addEventListener('click', () => afficherBureau());

$('manuelGen').addEventListener('click', async () => {
  const b = $('manuelGen');
  b.disabled = true;
  b.textContent = 'Composition…';
  try{
    await genererBilanManuel();
  }catch(e){
    console.error('Composer le bilan :', e);
    await informer('La composition a échoué.\n\nDétail : ' +
      (e && e.message ? e.message : e) +
      (e && e.stack ? '\n\n' + String(e.stack).split('\n')[1] : ''), 'Erreur');
  }finally{
    b.disabled = false;
    b.textContent = '📄 Composer le bilan';
  }
});
$('manuelAnnul').addEventListener('click', fermerBilanManuel);
$('rdvPostEnr').addEventListener('click', terminerRdvPost);
$('rdvPostAnnul').addEventListener('click', fermerRdvPost);
$('prepTous').addEventListener('change', () => afficherPrepares(false));
if($('prepQui')) $('prepQui').addEventListener('change', () => afficherPrepares(false));
if($('prepPour')) remplirPourQui();

/* ============================================================
   CE QUI SE DICTE, ET CE QUI SE REMPLIT

   Un examen se remplit à la main : le moniteur recopie ce que
   l'inspecteur a dit, il ne dicte pas son cours. Proposer le micro
   sur ces bilans-là n'a pas de sens.
   ============================================================ */
/* Ces bilans se remplissent à la main : dicter un tableau de
   notes n a pas de sens. */
const MODELES_SANS_VOCAL = ['examen-blanc', 'examen-officiel', 'rdv-post',
                            'handicap'];

function adapterAuModele(){
  const cle = $('modele') ? $('modele').value : '';
  const aLaMain = MODELES_SANS_VOCAL.indexOf(cle) !== -1;

  /* Le module d'examen blanc du rendez-vous pédagogique, sous la
     transcription : il n'apparaît que sur ce modèle-là. */
  if(typeof majBlocExamenBlancCours === 'function') majBlocExamenBlancCours();

  const bRec = $('recBtn');
  const zManuel = $('zoneManuel');
  const statut = $('status');
  const bManuel = $('manuelBtn');

  /* Le simulateur est le seul cours où un moniteur suit plusieurs
     élèves à la fois. */
  const bPostes = $('postesBtn');
  if(bPostes){
    const surSimu = /^simu/.test($('modele').value || '');
    const dejaOuvert = (typeof postes !== 'undefined' && postes.length);
    bPostes.style.display = (surSimu && !dejaOuvert) ? 'block' : 'none';
  }

  /* Une classe, pas un style en ligne : celui-ci se faisait
     écraser par les passages qui remettent en forme le bouton. */
  if(bRec){
    bRec.classList.toggle('sans-vocal', aLaMain);
    bRec.style.display = '';
  }

  if(aLaMain){
    /* Le bouton manuel prend la place du micro et devient
       l'action principale. */
    if(zManuel) zManuel.style.display = 'block';
    if(bManuel){
      /* Orange aussi quand il devient l'action principale */
      bManuel.className = 'btn';
      bManuel.style.background = 'var(--ambre)';
      bManuel.style.color = 'var(--sur-ambre)';
      bManuel.style.marginTop = '0';
      bManuel.textContent = '✍️ Remplir le bilan';
    }
    if(statut){
      statut.textContent = 'Ce bilan se remplit à la main : ' +
        "tu recopies ce que l'inspecteur a noté.";
    }
  }else{
    if(bManuel){
      /* Orange dans les deux cas : c'est une vraie action, pas
         un repli discret. */
      bManuel.className = 'btn';
      bManuel.style.background = 'var(--ambre)';
      bManuel.style.color = 'var(--sur-ambre)';
      bManuel.style.marginTop = '12px';
      bManuel.textContent = '✍️ Bilan à remplir à la main';
    }
    if(statut){
      statut.textContent = "Appuie pour lancer l'enregistrement en début de cours.";
    }
  }
}


/* ---------- Init ---------- */
reprendreSession();
$('prepDate').value = todayLocal();
$('addDate').value = todayLocal();
creerRaccourcis('raccourcisNoteResult', 'noteResult');
remplirModeles();
adapterAuModele();
$('modele').addEventListener('change', () => {
  verifierBoiteModele(derniereBoiteEleve);
  adapterAuModele();
});
$('lessonDate').value = todayLocal();
refreshHistory();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-demarrage.js'] = true;
