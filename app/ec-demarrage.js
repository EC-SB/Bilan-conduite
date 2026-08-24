/* Déployé le 24/08/2026 à 07:56 — v516 */
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
    /* stockage plein ou indisponible : on continue sans sauvegarde */
  }
}

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

  /* Un bilan manuel commencé compte autant qu'une dictée : c'est
     du travail perdu de la même façon. */
  const man = (typeof brouillonManuel === 'function') ? brouillonManuel() : null;

  if(!s || (!s.transcript && !s.bilan)){
    if(man){ proposerRepriseManuelle(man, banniere); return; }
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

/* La bannière pour un bilan manuel interrompu */
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
    remplis + ' rubrique(s) remplie(s) · interrompu le ' + quandTexte;

  /* Le bouton reprend le bilan manuel, pas la dictée */
  const b = $('repriseOui');
  if(b) b.dataset.manuel = 'oui';
  banniere.style.display = 'block';
}


function reprendreCours(){
  /* Un bilan manuel interrompu se rouvre à sa fiche, pas à la
     page de dictée. */
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
  if(await confirmer('Supprimer définitivement ce cours interrompu ?')){
    effacerSauvegarde();
    $('repriseBanner').style.display = 'none';
  }
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

$('prepBtn').addEventListener('click', preparerNouveauCours);
$('manuelBtn').addEventListener('click', ouvrirBilanManuel);
if($('ajoutProcedureBtn')){
  $('ajoutProcedureBtn').addEventListener('click', ajouterProcedureAuBilan);
}
if($('journalBtn')) $('journalBtn').addEventListener('click', afficherJournal);
if($('correctionBtn')) $('correctionBtn').addEventListener('click', ouvrirCorrectionMoniteur);
if($('corrigerBtn')) $('corrigerBtn').addEventListener('click', enregistrerCorrection);
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
const MODELES_SANS_VOCAL = ['examen-blanc', 'examen-officiel', 'rdv-post'];

function adapterAuModele(){
  const cle = $('modele') ? $('modele').value : '';
  const aLaMain = MODELES_SANS_VOCAL.indexOf(cle) !== -1;

  const bRec = $('recBtn');
  const zManuel = $('zoneManuel');
  const statut = $('status');
  const bManuel = $('manuelBtn');

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
      bManuel.className = 'btn btn-primary';
      bManuel.style.background = '';
      bManuel.style.color = '';
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
      bManuel.style.background = 'var(--orange)';
      bManuel.style.color = 'var(--on-accent)';
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
