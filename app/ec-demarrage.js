/* Déployé le 07/08/2026 à 11:00 — v287 */
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
      noteResult: $('noteResult') ? $('noteResult').value : ''
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
  if(!s || (!s.transcript && !s.bilan)){ banniere.style.display = 'none'; return; }

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

function reprendreCours(){
  const s = lireSauvegarde();
  if(!s) return;
  if(s.modele) $('modele').value = s.modele;
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
if($('journalBtn')) $('journalBtn').addEventListener('click', afficherJournal);
if($('correctionBtn')) $('correctionBtn').addEventListener('click', ouvrirCorrectionMoniteur);
if($('corrigerBtn')) $('corrigerBtn').addEventListener('click', enregistrerCorrection);
if($('statsBtn')) $('statsBtn').addEventListener('click', afficherStats);
if($('importBtn')) $('importBtn').addEventListener('click', importerListeEleves);
if($('rappelLire')) $('rappelLire').addEventListener('click', lirePlanning);
if($('rappelModeManuel')) $('rappelModeManuel').addEventListener('click', () => modeRappel('manuel'));
if($('rappelModePlanning')) $('rappelModePlanning').addEventListener('click', () => modeRappel('planning'));
if($('rappelModeHistorique')) $('rappelModeHistorique').addEventListener('click', () => modeRappel('historique'));
if($('studentName')) $('studentName').addEventListener('change', chargerMessengerEleve);

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
if($('smsRecharger')) $('smsRecharger').addEventListener('click', rechargerCadreSms);
if($('smsOublier')) $('smsOublier').addEventListener('click', async () => {
  if(!await confirmer('Oublier le code SMS mémorisé ?')) return;
  oublierCodeSms(); rechargerCadreSms();
});
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

/* ---------- Init ---------- */
reprendreSession();
$('prepDate').value = todayLocal();
$('addDate').value = todayLocal();
creerRaccourcis('raccourcisNoteResult', 'noteResult');
remplirModeles();
$('modele').addEventListener('change', () => verifierBoiteModele(derniereBoiteEleve));
$('lessonDate').value = todayLocal();
refreshHistory();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-demarrage.js'] = true;
