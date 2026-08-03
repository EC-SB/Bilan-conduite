/* ============================================================
   ec-depart.js
   Départ de l'auto-école et administration des accès
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   DÉPART DE L'AUTO-ÉCOLE
   Même principe que « permis obtenu » : liste de tâches,
   message prêt à envoyer, puis retrait des listes de suivi.
   ============================================================ */
const MOTIFS_DEPART = {
  'autre-ae':      'transfert vers une autre auto-école',
  'demenagement':  'déménagement',
  'arret':         'arrêt de la formation',
  'financier':     'motif financier',
  'sansnouvelles': "sans nouvelles de l'élève",
  'autre':         'autre motif'
};

const TACHES_DEPART = [
  ['Retirer des groupes Facebook (sauf le général)',
   'Facebook > Ouvrir tous les groupes avec la molette > Membres > 🔍 Nom de l\'élève > ... > Supprimer'],
  ['Clôturer le dossier sur Drivup', 'Profil > Formule & Permis'],
  ['Vérifier le solde du compte élève', 'Régularisation ou remboursement selon le cas'],
  ['Annuler les réservations à venir sur le planning', ''],
  ['Retirer des listes de suivi permis', 'Fait automatiquement ci-dessous'],
  ['Enpc-center : désactiver les accès', ''],
  ['Archiver le dossier papier', '']
];

const TACHES_TRANSFERT = [
  ['Éditer le certificat de fin de formation / attestation de suivi', ''],
  ['Transmettre le dossier ANTS à la nouvelle auto-école', ''],
  ['Restituer les pièces du dossier à l\'élève', ''],
  ['Établir le solde de tout compte', '']
];

const MSG_DEPART = "Bonjour,\n\n" +
  "Nous prenons acte de la fin de ta formation chez Évolution Conduites.\n\n" +
  "Ton dossier est clôturé. Si tu as besoin d'une attestation de suivi de formation " +
  "ou du transfert de ton dossier ANTS, dis-le nous, nous préparons cela rapidement.\n\n" +
  "Nous te souhaitons une bonne continuation, et la route reste ouverte si tu " +
  "souhaites revenir un jour 🤝\n\n" +
  "Évolution Conduites";

async function preparerDepart(){
  const nom = $('departNom').value.trim();
  const motif = $('departMotif').value;
  const date = $('departDate').value;
  const zone = $('departResultat');

  if(nom.length < 2){
    zone.innerHTML = '<div class="empty">Saisis le nom de l\'élève.</div>';
    return;
  }

  const btn = $('departBtn');
  btn.disabled = true;
  btn.textContent = 'Recherche…';
  zone.innerHTML = '<div class="empty">Récupération du dossier…</div>';

  let nb = 0;
  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nom, leger: true })
    }, 15000, 2);
    if(r.ok){
      const d = await r.json().catch(() => ({}));
      nb = ((d && d.resultats) || []).length;
    }
  }catch(e){ /* on continue sans le compte */ }

  btn.disabled = false;
  btn.textContent = '🚪 Préparer le départ';

  zone.innerHTML = '';
  const tete = document.createElement('div');
  tete.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.6;';
  tete.innerHTML = '<strong style="color:var(--cream);font-size:15px;">' +
    nom.replace(/</g,'&lt;') + '</strong><br>' +
    'Départ pour ' + MOTIFS_DEPART[motif] +
    (date ? ' · le ' + dateEnToutesLettres(date) : '') + '<br>' +
    nb + ' bilan(s) enregistré(s)';
  zone.appendChild(tete);

  /* Message à envoyer */
  zone.appendChild(blocCopiable('Message à l\'élève', MSG_DEPART));

  /* Liste de tâches, enrichie pour un transfert */
  const taches = TACHES_DEPART.slice();
  if(motif === 'autre-ae'){
    TACHES_TRANSFERT.forEach(t => taches.unshift(t));
  }

  const bloc = document.createElement('div');
  bloc.style.cssText = 'margin-top:20px;padding-top:16px;border-top:1px solid var(--line);';
  bloc.innerHTML = '<div style="font-size:13px;font-weight:700;color:var(--accent-text);' +
    'margin-bottom:10px;">✅ À faire au bureau</div>';
  taches.forEach(t => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 0;' +
      'border-bottom:1px solid var(--line);text-transform:none;margin:0;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.style.cssText = 'width:19px;height:19px;flex-shrink:0;margin-top:2px;';
    const txt = document.createElement('div');
    txt.innerHTML = '<div style="font-size:15px;color:var(--cream);line-height:1.4;">' +
      t[0].replace(/</g,'&lt;') + '</div>' +
      (t[1] ? '<div style="font-size:12px;color:var(--muted);line-height:1.4;margin-top:2px;">' +
        t[1].replace(/</g,'&lt;') + '</div>' : '');
    l.appendChild(cb); l.appendChild(txt);
    bloc.appendChild(l);
  });
  zone.appendChild(bloc);

  /* Retrait des listes de suivi */
  const actions = document.createElement('div');
  actions.style.cssText = 'margin-top:18px;padding-top:16px;border-top:1px solid var(--line);';

  const bSuivi = document.createElement('button');
  bSuivi.className = 'btn btn-secondary';
  bSuivi.textContent = '🧹 Retirer de toutes les listes de suivi';
  bSuivi.addEventListener('click', async () => {
    if(!await confirmer('Retirer ' + nom + ' de toutes les listes de suivi ?\n\n' +
                'Ses bilans sont conservés.')) return;
    bSuivi.disabled = true;
    try{
      const d = await appelPrep({ action:'consigneList', eleve: nom });
      for(const cs of ((d && d.consignes) || [])){
        if(cs.traite !== 'oui'){
          try{ await appelPrep({ action:'consigneDone', id: cs.id }); }catch(e){}
        }
      }
      await appelPrep({ action:'suiviDelete', eleve: nom });
      showToast(nom + ' retiré des listes ✅');
      bSuivi.textContent = '✅ Retiré des listes';
    }catch(e){
      showToast('Erreur : ' + e.message);
      bSuivi.disabled = false;
    }
  });
  actions.appendChild(bSuivi);

  /* Suppression complète, administrateurs seulement */
  if(ACCES.role === 'admin' && nb > 0){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'margin-top:8px;color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️ Supprimer les ' + nb + ' bilan(s) de ' + nom;
    bSup.addEventListener('click', () => {
      eleveAffiche = nom;
      nbBilansAffiches = nb;
      supprimerDossierEleve();
    });
    actions.appendChild(bSup);
  }

  zone.appendChild(actions);
}

/* ---------- Suppression du dossier d'un élève ---------- */
/* eleveAffiche : déclaré dans ec-etat.js */
/* nbBilansAffiches : déclaré dans ec-etat.js */

function majZoneSuppression(){
  const zone = $('zoneSuppression');
  if(!zone) return;
  /* Réservée aux administrateurs, et seulement si des bilans sont affichés */
  zone.style.display = (ACCES.role === 'admin' && eleveAffiche && nbBilansAffiches > 0)
    ? 'block' : 'none';
  const msg = $('suppressionMsg');
  if(msg) msg.textContent = '';
  const btn = $('supprimerEleveBtn');
  if(btn && eleveAffiche){
    btn.textContent = '🗑️ Supprimer les ' + nbBilansAffiches + ' bilan(s) de ' + eleveAffiche;
  }
}

async function supprimerDossierEleve(){
  if(!eleveAffiche) return;

  /* Première confirmation */
  if(!await confirmer('⚠️ SUPPRESSION DÉFINITIVE\n\n' +
              'Tous les bilans de ' + eleveAffiche + ' (' + nbBilansAffiches + ') vont être effacés.\n\n' +
              'Cette action est IRRÉVERSIBLE : ni toi ni personne ne pourra les récupérer.\n\n' +
              'Continuer ?')) return;

  /* Seconde confirmation : le nom doit être retapé */
  const saisi = await demander('Pour confirmer, recopie exactement le nom de l\'élève :\n\n' + eleveAffiche);
  if(saisi === null) return;
  if(normaliserMot(saisi) !== normaliserMot(eleveAffiche)){
    await informer('Le nom saisi ne correspond pas. Suppression annulée.');
    return;
  }

  const btn = $('supprimerEleveBtn');
  const msg = $('suppressionMsg');
  btn.disabled = true;
  btn.textContent = 'Suppression…';

  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'supprimerEleve', code: ACCES.code, eleve: eleveAffiche })
    });
    const data = await r.json().catch(() => ({}));
    if(!r.ok || data.error) throw new Error(data.error || ('HTTP ' + r.status));

    msg.style.color = 'var(--accent-text)';
    msg.textContent = '✅ ' + (data.supprimees || 0) + ' bilan(s) supprimé(s) définitivement.';
    showToast('Dossier supprimé ✅');

    $('searchResults').innerHTML = '<div class="empty">Dossier supprimé.</div>';
    eleveAffiche = '';
    nbBilansAffiches = 0;
    $('zoneSuppression').style.display = 'none';
    chargerEleves();
  }catch(e){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = 'Erreur : ' + e.message;
  }finally{
    btn.disabled = false;
  }
}

$('supprimerEleveBtn').addEventListener('click', supprimerDossierEleve);
$('bureauBtn').addEventListener('click', () => afficherBureau());
$('filtrePP').addEventListener('change', () => afficherBureau());
$('filtrePermis').addEventListener('change', () => afficherBureau());
$('filtreDate').addEventListener('change', () => afficherBureau());
$('msgBtn').addEventListener('click', envoyerMessageBureau);
$('addBtn').addEventListener('click', ajouterDateBureau);
$('addEtat').addEventListener('change', () => {
  const avecDate = ($('addEtat').value === 'date');
  $('addZoneDate').style.display = avecDate ? 'block' : 'none';
  $('addBtn').textContent = avecDate ? '📅 Enregistrer la date' : '📌 Enregistrer';
});
$('permisBtn').addEventListener('click', preparerPermis);
$('departBtn').addEventListener('click', preparerDepart);
$('departDate').value = todayLocal();
$('permisNom').addEventListener('change', preparerPermis);

/* Vérifie que le script Google déployé est bien à jour */
async function verifierVersionScript(reponse){
  const v = reponse && reponse.versionScript ? Number(reponse.versionScript) : 0;
  if(v >= CONFIG.VERSION_SCRIPT_ATTENDUE) return true;
  await informer(
    "⚠️ Le script Google Sheets n'est pas à jour.\n\n" +
    'Version déployée : ' + (v ? 'v' + v : 'antérieure à v21') + '\n' +
    'Version attendue : v' + CONFIG.VERSION_SCRIPT_ATTENDUE + '\n\n' +
    "La note interne et l'heure ne peuvent pas être enregistrées.\n\n" +
    'Dans la feuille : Extensions > Apps Script, colle le nouveau code, ' +
    'puis Déployer > Gérer les déploiements > crayon ✏️ > Nouvelle version > Déployer.'
  );
  return false;
}


/* Où en est l'élève dans son parcours, d'après son dernier bilan
   et les consignes du bureau encore en attente. */
function etapesEleve(note, consignes){
  const t = String(note || '') + ' · ' + (consignes || []).map(x => x.texte).join(' · ');
  const a = analyserNote(t);
  const etapes = [];

  if(a.repassages){
    etapes.push({ ok:false, txt: '🔁 ' + a.repassages +
      (a.repassages === 1 ? 'er' : 'e') + ' repassage' +
      (a.dateAjournement ? ' — ajourné le ' + a.dateAjournement : '') });
  }

  if(a.lecon){
    etapes.push({ ok:true, txt: a.lecon + (a.lecon === 1 ? 'ère' : 'ème') + ' leçon' +
      (a.leconTotal ? ' sur ' + a.leconTotal : '') + (a.friseDepassee ? ' — frise dépassée' : '') });
  }

  if(a.simuNuit === 'fait') etapes.push({ ok:true, txt:'Simulateur nuit et risques fait' });
  else if(a.simuNuit === 'prevu') etapes.push({ ok:null, txt:'Simulateur nuit et risques prévu' });
  else if(a.simuNuit === 'aprevoir') etapes.push({ ok:false, txt:'Simulateur nuit et risques à prévoir' });

  if(a.examBlanc === 'passe') etapes.push({ ok:true, txt:'Examen blanc passé' });
  else if(a.examBlanc === 'reserve'){
    etapes.push({ ok:null, txt:'Examen blanc réservé' +
      (a.examBlancDate ? ' le ' + a.examBlancDate
        : (a.examBlancN !== null ? ' dans ' + a.examBlancN + ' leçon(s)' : '')) });
  }
  else if(a.examBlanc === 'aprevoir'){
    etapes.push({ ok:false, txt:'Examen blanc à prévoir' +
      (a.examBlancN !== null ? ' dans ' + a.examBlancN + ' leçon(s)' : '') });
  }
  else if(a.examBlanc === 'impossible') etapes.push({ ok:false, txt:'Examen blanc non planifiable' });

  if(a.permis === 'prevu'){
    etapes.push({ ok:true, txt:'Examen du permis prévu' + (a.permisDate ? ' le ' + a.permisDate : '') +
      (a.permisN !== null ? ' — encore ' + a.permisN + ' leçon(s)' : '') });
  }
  else if(a.permis === 'annule') etapes.push({ ok:false, txt:'Examen du permis annulé' });
  else if(a.permis === 'aprevoir') etapes.push({ ok:false, txt:'Date d\'examen à prévoir' });

  if(a.finirFiche) etapes.push({ ok:false, txt:'Fiche véhicule à terminer' });
  return etapes;
}

/* Encadré « où en est cet élève » */
function blocParcours(eleve, note, consignes){
  const etapes = etapesEleve(note, consignes);
  if(!etapes.length) return null;

  const d = document.createElement('div');
  d.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
    'padding:12px;margin-bottom:12px;font-size:14px;line-height:1.8;';
  d.innerHTML = '<div style="font-weight:700;margin-bottom:6px;">📍 Où en est ' +
    eleve.replace(/</g,'&lt;') + '</div>' +
    etapes.map(e => {
      const icone = (e.ok === true) ? '✅' : (e.ok === false ? '⏳' : '📌');
      const couleur = (e.ok === true) ? 'var(--accent-text)'
                    : (e.ok === false ? 'var(--warn-text)' : 'var(--cream)');
      return '<div style="color:' + couleur + ';">' + icone + ' ' +
             e.txt.replace(/</g,'&lt;') + '</div>';
    }).join('');
  return d;
}

/* ---------- Recherche des anciens bilans d'un élève ---------- */
async function rechercherEleve(){
  const nom = $('searchName').value.trim();
  const moniteur = $('searchMoniteur') ? $('searchMoniteur').value : '';
  const site = $('searchSite') ? $('searchSite').value : '';
  const zone = $('searchResults');

  if(nom.length < 2 && !moniteur){
    zone.innerHTML = '<div class="empty">Saisis un nom d\'élève ou choisis un moniteur.</div>';
    return;
  }
  const btn = $('searchBtn');
  btn.disabled = true;
  btn.textContent = 'Recherche…';
  zone.innerHTML = '<div class="empty">Recherche en cours…</div>';
  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code,
                             eleve: nom, moniteur: moniteur, site: site })
    });
    if(r.status === 403){
      verrouiller('Session expirée, saisis ton code à nouveau.');
      return;
    }
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    if(!verifierVersionScript(data)){
      zone.innerHTML = '<div class="empty">Script Google à mettre à jour (voir le message).</div>';
      return;
    }
    const res = (data && data.resultats) || [];
    if(!res.length){
      zone.innerHTML = '<div class="empty">' +
        (nom.length >= 2
          ? 'Aucun bilan trouvé pour cet élève' + (moniteur ? ' avec ce moniteur' : '') +
            '.<br>Vérifie que le nom et le prénom sont écrits comme lors des cours précédents.'
          : 'Aucun bilan trouvé pour ce moniteur.') + '</div>';
      eleveAffiche = '';
      nbBilansAffiches = 0;
      majZoneSuppression();
      return;
    }

    /* On repart d'une zone vide avant d'empiler les blocs */
    zone.innerHTML = '';

    /* La suppression de dossier ne concerne qu'une recherche par élève */
    eleveAffiche = (nom.length >= 2 && res[0]) ? res[0].eleve : '';
    nbBilansAffiches = (nom.length >= 2) ? res.length : 0;
    majZoneSuppression();

    /* Recherche par élève : on résume son parcours */
    if(nom.length >= 2 && res[0]){
      let enAttente = [];
      try{
        const cd = await appelPrep({ action:'consigneList', eleve: res[0].eleve });
        enAttente = ((cd && cd.consignes) || [])
          .filter(y => y.traite !== 'oui' && y.type !== 'urgence');
      }catch(e){}
      const p = blocParcours(res[0].eleve, res[0].note, enAttente);
      if(p) zone.appendChild(p);
    }

    /* Recherche par moniteur : on annonce le nombre d'élèves distincts */
    if(nom.length < 2){
      const eleves = [];
      res.forEach(x => {
        const k = normaliserMot(x.eleve || '');
        if(k && eleves.indexOf(k) === -1) eleves.push(k);
      });
      const entete = document.createElement('div');
      entete.style.cssText = 'padding:10px 12px;margin-bottom:10px;background:var(--navy);' +
        'border:1px solid var(--line);border-radius:10px;font-size:14px;';
      entete.innerHTML = '<strong>' + moniteur + '</strong> — ' + res.length +
        ' bilan(s) pour ' + eleves.length + ' élève(s)' +
        (res.length >= 200 ? ' <span style="color:var(--warn-text);">(200 plus récents)</span>' : '');
      zone.appendChild(entete);
    }

    res.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';
      const meta = document.createElement('div');
      meta.className = 'meta';
      const note = (item.note || '').trim();
      const t = document.createElement('strong');
      if(!nom || nom.length < 2){
        /* Recherche par moniteur : on met l'élève en avant */
        t.textContent = item.eleve || '(sans nom)';
      }else if(note){
        /* La note interne prend la place du titre : c'est ce que le
           moniteur suivant doit voir en premier, en entier. */
        t.textContent = '📌 ' + note;
        t.style.color = 'var(--accent-text)';
        t.style.whiteSpace = 'pre-wrap';
        t.style.lineHeight = '1.45';
        t.style.overflow = 'visible';
        t.style.textOverflow = 'clip';
      }else{
        t.textContent = item.type || 'Bilan';
      }
      const s = document.createElement('span');
      s.textContent = 'Cours du ' + (item.date || '?') +
                      [' ', item.site, item.moniteur, note ? item.type : '']
                        .filter(Boolean).join(' · ');

      const h = document.createElement('span');
      h.style.opacity = '.75';
      h.textContent = item.horodatage ? 'Bilan généré le ' + item.horodatage : '';

      meta.appendChild(t);
      meta.appendChild(s);
      if(item.horodatage) meta.appendChild(h);
      const arrow = document.createElement('div');
      arrow.className = 'arrow';
      arrow.textContent = '›';
      row.appendChild(meta);
      row.appendChild(arrow);
      row.addEventListener('click', () => {
        currentLessonMeta = {
          modeleLabel: item.type, studentName: item.eleve, monitorName: item.moniteur,
          site: item.site, dateStr: item.date, noteInterne: item.note || '', ts: Date.now()
        };
        $('resultText').value = item.bilan;
        afficherNote(item.note);
        marquerExport(true);
        $('recordView').style.display = 'none';
        $('generatingView').style.display = 'none';
        $('resultView').style.display = 'block';
        window.scrollTo(0, 0);
      });
      zone.appendChild(row);
    });
  }catch(e){
    console.error('Erreur recherche:', e);
    zone.innerHTML = '<div class="empty">Erreur de recherche : ' + e.message + '</div>';
  }finally{
    btn.disabled = false;
    btn.textContent = '🔍 Rechercher';
  }
}

$('searchBtn').addEventListener('click', rechercherEleve);
$('searchMoniteur').addEventListener('change', rechercherEleve);
$('searchSite').addEventListener('change', rechercherEleve);
$('searchName').addEventListener('input', () => verifierNomEleve('searchName', 'eleveInfo', false));
$('searchName').addEventListener('change', () => { verifierNomEleve('searchName', 'eleveInfo', false); rechercherEleve(); });
$('studentName').addEventListener('input', () => {
  verifierNomEleve('studentName', 'studentInfo', true);
  planifierHistorique();
});
$('studentName').addEventListener('change', () => {
  verifierNomEleve('studentName', 'studentInfo', true);
  chargerHistoriqueEleve();       /* choix dans la liste : immédiat */
});
$('searchName').addEventListener('keydown', e => { if(e.key === 'Enter') rechercherEleve(); });

$('newLessonBtn').addEventListener('click', () => {
  finalTranscript = '';
  committedTranscript = '';
  interruptions = 0;
  contexteDepart = null;
  prepareEnCours = null;
  noteQuestionnaire = '';
  dernierMot = 0;
  dernierEvenement = '—';
  libererEcran();
  $('etatMicro').textContent = '';
  $('pauseWarn').style.display = 'none';
  $('transcriptBox').value = '';
  $('transcriptBox').style.display = 'none';
  $('transcriptAide').style.display = 'none';
  $('compteur').style.display = 'none';
  effacerSauvegarde();
  $('studentName').value = '';
  verifierNomEleve('studentName', 'studentInfo', true);
  $('noteInterne').value = '';
  afficherNote('');
  ['modele','monitorName','studentName','site','lessonDate'].forEach(id => { $(id).disabled = false; });
  $('lessonDate').value = todayLocal();
  $('recBtn').textContent = '🎙️ Démarrer le cours';
  $('status').textContent = "Appuie pour lancer l'enregistrement en début de cours.";
  $('finishBtn').style.display = 'none';
  $('resultView').style.display = 'none';
  $('recordView').style.display = 'block';
  const d = $('genErrorDetail');
  if(d) d.remove();
});

/* ---------- Historique ---------- */
async function saveLesson(meta, bilanText){
  try{
    await window.storage.set('bilan:' + meta.ts, JSON.stringify(Object.assign({}, meta, { text: bilanText })), false);
  }catch(e){ console.error('save failed', e); }
}

async function refreshHistory(){
  /* Carte retirée de l'interface : ce stockage ne fonctionne pas
     sur un site hébergé, la recherche par élève le remplace. */
  if(!document.getElementById('historyList')) return;
  try{
    const res = await window.storage.list('bilan:', false);
    const keys = (res && res.keys) ? res.keys : [];
    if(!keys.length){
      $('historyList').innerHTML = '<div class="empty">Aucun bilan enregistré pour l\'instant.</div>';
      return;
    }
    const items = [];
    for(const k of keys){
      try{
        const r = await window.storage.get(k, false);
        if(r && r.value) items.push(JSON.parse(r.value));
      }catch(e){}
    }
    items.sort((a, b) => b.ts - a.ts);
    const list = $('historyList');
    list.innerHTML = '';
    items.slice(0, 20).forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';
      const meta = document.createElement('div');
      meta.className = 'meta';
      const nom = document.createElement('strong');
      nom.textContent = item.studentName;
      const sous = document.createElement('span');
      sous.textContent = [item.dateStr, item.site, item.monitorName, item.modeleLabel].filter(Boolean).join(' · ');
      meta.appendChild(nom);
      meta.appendChild(sous);
      const arrow = document.createElement('div');
      arrow.className = 'arrow';
      arrow.textContent = '›';
      row.appendChild(meta);
      row.appendChild(arrow);
      row.addEventListener('click', () => {
        currentLessonMeta = item;
        $('resultText').value = item.text;
        $('recordView').style.display = 'none';
        $('generatingView').style.display = 'none';
        $('resultView').style.display = 'block';
      });
      list.appendChild(row);
    });
  }catch(e){ console.error('history load failed', e); }
}

/* ---------- Administration des accès ---------- */
function messageAdmin(texte, erreur){
  const m = $('adminMsg');
  m.textContent = texte || '';
  m.style.color = erreur ? 'var(--warn-text)' : 'var(--orange)';
}

async function appelAdmin(corps){
  const r = await fetchFiable(CONFIG.ADMIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ code: ACCES.code }, corps))
  });
  if(r.status === 403 && !ACCES.code){
    verrouiller('Session expirée, saisis ton code à nouveau.');
    throw new Error('Session expirée');
  }
  const data = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
  return data;
}

async function chargerUtilisateurs(){
  const zone = $('adminList');
  zone.innerHTML = '<div class="empty">Chargement…</div>';
  try{
    const data = await appelAdmin({ action: 'list' });
    if(data.kv === false){
      zone.innerHTML = '<div class="unsupported">⚠️ Le stockage KV n\'est pas configuré sur le Worker : impossible d\'enregistrer de nouveaux accès. Vérifie le binding <strong>UTILISATEURS</strong>.</div>';
      return;
    }
    const liste = data.utilisateurs || [];
    zone.innerHTML = '';
    liste.forEach(u => {
      const row = document.createElement('div');
      row.className = 'history-item';

      const meta = document.createElement('div');
      meta.className = 'meta';
      const nom = document.createElement('strong');
      nom.textContent = u.nom + (u.role === 'admin' ? ' — admin' : '');
      const sous = document.createElement('span');
      sous.textContent = 'Code ' + u.code + (u.principal ? ' · compte principal' : (u.cree ? ' · créé le ' + u.cree : ''));
      meta.appendChild(nom);
      meta.appendChild(sous);
      row.appendChild(meta);

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';

      if(!u.principal && u.code !== ACCES.code){
        const selRole = document.createElement('select');
        selRole.style.cssText = 'width:auto;margin:0;padding:7px 8px;font-size:12px;';
        [['moniteur','Moniteur'],['bureau','Bureau'],['admin','Admin']].forEach(([v, l]) => {
          const o = document.createElement('option');
          o.value = v; o.textContent = l;
          selRole.appendChild(o);
        });
        selRole.value = u.role;
        selRole.addEventListener('change', async () => {
          selRole.disabled = true;
          try{
            await appelAdmin({ action:'role', cible:u.code, role: selRole.value });
            messageAdmin('Rôle de ' + u.nom + ' modifié — accès repris du rôle.');
            chargerUtilisateurs();
          }catch(e){ messageAdmin(e.message, true); selRole.disabled = false; }
        });
        actions.appendChild(selRole);

        const bDel = document.createElement('button');
        bDel.className = 'btn btn-secondary';
        bDel.style.cssText = 'width:auto;padding:7px 10px;font-size:12px;color:var(--red);border-color:var(--red);';
        bDel.textContent = '✕';
        bDel.addEventListener('click', async () => {
          if(!await confirmer('Supprimer l\'accès de ' + u.nom + ' (code ' + u.code + ') ?')) return;
          try{
            await appelAdmin({ action:'delete', cible:u.code });
            messageAdmin('Accès de ' + u.nom + ' supprimé.');
            chargerUtilisateurs();
          }catch(e){ messageAdmin(e.message, true); }
        });
        actions.appendChild(bDel);
      } else {
        const verrou = document.createElement('div');
        verrou.style.cssText = 'font-size:11px;color:var(--muted);';
        verrou.textContent = u.principal ? '🔒' : '(toi)';
        actions.appendChild(verrou);
      }

      row.appendChild(actions);
      zone.appendChild(row);

      /* Réglage fin de ce que cette personne voit */
      if(!u.principal){
        const det = document.createElement('details');
        det.style.cssText = 'margin:-6px 0 10px 4px;';
        det.innerHTML = '<summary style="cursor:pointer;font-size:12px;color:var(--muted);">' +
          'Ce que ' + u.nom + ' voit (' + Object.keys(u.droits || {}).length +
          ' section' + (Object.keys(u.droits || {}).length > 1 ? 's' : '') + ')</summary>';
        const z = document.createElement('div');
        z.style.cssText = 'padding:8px 0 8px 6px;';
        const dr = u.droits || {};
        SECTIONS.forEach(sec => {
          const l = document.createElement('div');
          l.style.cssText = 'display:flex;align-items:center;gap:8px;margin:0 0 6px;';
          const t = document.createElement('span');
          t.style.cssText = 'flex:1;font-size:14px;color:var(--cream);line-height:1.3;';
          t.textContent = sec.nom;
          const s = document.createElement('select');
          s.className = 'drt-' + u.code;
          s.setAttribute('data-cle', sec.cle);
          s.style.cssText = 'width:auto;margin:0;padding:6px 8px;font-size:12px;flex-shrink:0;';
          [['', 'Rien'], ['v', '👁️ Voir'], ['m', '✏️ Modifier']].forEach(([v, lab]) => {
            const o = document.createElement('option');
            o.value = v; o.textContent = lab;
            s.appendChild(o);
          });
          s.value = dr[sec.cle] || '';
          l.appendChild(t); l.appendChild(s);
          z.appendChild(l);
        });
        const b = document.createElement('button');
        b.className = 'btn btn-secondary';
        b.style.cssText = 'padding:8px;font-size:12px;margin-top:6px;';
        b.textContent = '💾 Enregistrer les accès';
        b.addEventListener('click', async () => {
          const choisis = {};
          document.querySelectorAll('.drt-' + u.code).forEach(x => {
            if(x.value) choisis[x.getAttribute('data-cle')] = x.value;
          });
          b.disabled = true;
          try{
            await appelAdmin({ action:'droits', cible:u.code, droits: choisis });
            messageAdmin('Accès de ' + u.nom + ' enregistrés.');
            chargerUtilisateurs();
          }catch(e){ messageAdmin(e.message, true); b.disabled = false; }
        });
        z.appendChild(b);
        det.appendChild(z);
        zone.appendChild(det);
      }
    });
  }catch(e){
    zone.innerHTML = '<div class="empty">Erreur : ' + e.message + '</div>';
  }
}

$('createBtn').addEventListener('click', async () => {
  const btn = $('createBtn');
  btn.disabled = true;
  try{
    await appelAdmin({
      action: 'create',
      nouveauCode: $('newCode').value.trim(),
      nom: $('newName').value.trim(),
      role: $('newRole').value
    });
    messageAdmin('Accès créé pour ' + $('newName').value.trim() + '.');
    $('newCode').value = '';
    $('newName').value = '';
    $('newRole').value = 'moniteur';
    chargerUtilisateurs();
  }catch(e){
    messageAdmin(e.message, true);
  }finally{
    btn.disabled = false;
  }
});


/* Ouvre la session et met en place l'interface */
function ouvrirSession(code, moniteur, role, saluer, droits){
  ACCES = { code: code, moniteur: moniteur || '', role: role || 'moniteur',
            droits: droits || [] };
  memoriserSession(ACCES.code, ACCES.moniteur, ACCES.role, ACCES.droits);

  $('lockView').style.display = 'none';
  $('appView').style.display = 'block';
  $('logoutBtn').style.display = 'block';
  if(ACCES.moniteur) $('monitorName').value = ACCES.moniteur;

  appliquerDroits();
  if(aDroit('admin') && ACCES.role === 'admin') chargerUtilisateurs();

  proposerReprise();
  chargerEleves();
  chargerMoniteurs();
  initTiroirs();
  ecouterReseau();
  if(aDroit('cours')) afficherPrepares();
  lancerActualisationAuto();
  if(saluer) showToast('Bonjour ' + (ACCES.moniteur || '') + ' 👋');
}

/* Reprend la session mémorisée, après vérification du code */
async function reprendreSession(){
  const s = lireSession();
  if(!s) return false;
  try{
    const r = await fetchFiable(CONFIG.AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: s.code })
    });
    const data = await r.json().catch(() => ({}));
    if(!r.ok || !data.ok){ oublierSession(); return false; }
    ouvrirSession(s.code, data.moniteur, data.role, false, data.droits);
    return true;
  }catch(e){
    /* Hors ligne : on fait confiance à la session mémorisée */
    ouvrirSession(s.code, s.moniteur, s.role, false, s.droits);
    return true;
  }
}

/* ---------- Déverrouillage ---------- */
async function deverrouiller(){
  const code = $('codeInput').value.trim();
  const msg = $('codeMsg');
  if(code.length < 6){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = 'Le code compte au moins 6 chiffres.';
    return;
  }
  const btn = $('codeBtn');
  btn.disabled = true;
  btn.textContent = 'Vérification…';
  msg.style.color = 'var(--muted)';
  msg.textContent = '';
  try{
    const r = await fetchFiable(CONFIG.AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    });
    const data = await r.json().catch(() => ({}));
    if(!r.ok || !data.ok){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Code incorrect.';
      $('codeInput').value = '';
      return;
    }
    ouvrirSession(code, data.moniteur, data.role, true, data.droits);
  }catch(e){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = 'Connexion impossible : ' + e.message;
  }finally{
    btn.disabled = false;
    btn.textContent = 'Déverrouiller';
  }
}

$('logoutBtn').addEventListener('click', async () => {
  if(!await confirmer('Se déconnecter ?')) return;
  verrouiller('');
  showToast('Déconnecté');
});

$('codeBtn').addEventListener('click', deverrouiller);
$('codeInput').addEventListener('keydown', e => { if(e.key === 'Enter') deverrouiller(); });

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-depart.js'] = true;
