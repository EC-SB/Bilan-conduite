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

async function appelPrep(corps){
  /* Le suivi bureau est plus lourd : on lui laisse plus de temps */
  const long = (corps && corps.action === 'bureauEtat');
  const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ code: ACCES.code }, corps))
  }, long ? 25000 : 12000, 2);
  if(!r.ok) throw new Error('HTTP ' + r.status);
  return await r.json().catch(() => ({}));
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
    return true;
  }catch(e){
    prepares = lireCachePrepares();
    return false;
  }
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

async function afficherPrepares(recharger){
  const zone = $('listePrepares');
  if(!zone) return;

  if(recharger !== false){
    zone.innerHTML = '<div class="empty">Chargement…</div>';
    const enLigne = await chargerPrepares();
    if(!enLigne && prepares.length){
      showToast('Hors ligne — liste en cache');
    }
  }
  /* Chacun ne voit que ses cours, sauf demande explicite */
  const tousMoniteurs = $('prepTous') && $('prepTous').checked;
  const moi = normaliserMot(ACCES.moniteur || '');
  let liste = prepares.slice();
  if(!tousMoniteurs && moi){
    liste = liste.filter(x => !x.moniteur || normaliserMot(x.moniteur) === moi);
  }

  majCompteur('cptPrepares', liste.length);

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

  liste.forEach(cours => {
    if(cours.date !== dateCourante){
      dateCourante = cours.date;
      const t = document.createElement('div');
      const estAuj = (cours.date === todayLocal());
      t.style.cssText = 'font-size:13px;font-weight:700;margin:14px 0 6px;text-transform:capitalize;' +
        'color:' + (estAuj ? 'var(--accent-text)' : 'var(--muted)') + ';';
      t.textContent = libelleDate(cours.date);
      zone.appendChild(t);
    }

    const row = document.createElement('div');
    row.className = 'history-item';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const nom = document.createElement('strong');
    nom.textContent = cours.eleve || '(sans nom)';
    const sous = document.createElement('span');
    sous.textContent = [cours.modeleLabel,
                        cours.moniteur ? '👤 ' + cours.moniteur : ''].filter(Boolean).join(' · ');
    meta.appendChild(nom);
    meta.appendChild(sous);
    if(cours.note){
      const n = document.createElement('span');
      n.style.cssText = 'color:var(--accent-text);white-space:pre-wrap;';
      n.textContent = '📌 ' + cours.note;
      meta.appendChild(n);
    }
    row.appendChild(meta);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;flex-shrink:0;align-items:center;';

    const bOuvrir = document.createElement('button');
    bOuvrir.className = 'btn btn-primary';
    bOuvrir.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;';
    bOuvrir.textContent = '▶ Ouvrir';
    bOuvrir.addEventListener('click', () => chargerPrepare(cours));
    actions.appendChild(bOuvrir);

    const bDonner = document.createElement('button');
    bDonner.className = 'btn btn-secondary';
    bDonner.style.cssText = 'width:auto;padding:9px 10px;font-size:13px;';
    bDonner.textContent = '👤';
    bDonner.title = 'Donner ce cours à un autre moniteur';
    bDonner.addEventListener('click', async () => {
      if(!moniteursActifs.length) await chargerMoniteurs();
      const cible = await choisirDansListe(
        'Donner le cours de ' + (cours.eleve || 'cet élève') + ' à :',
        moniteursActifs, cours.moniteur || '');
      if(!cible) return;
      bDonner.disabled = true;
      try{
        await appelPrep({ action: 'prepAssign', id: cours.id, moniteur: cible });
        showToast('Cours donné à ' + cible + ' ✅');
        afficherPrepares();
      }catch(e){
        showToast('Transfert impossible : ' + e.message);
        bDonner.disabled = false;
      }
    });
    actions.appendChild(bDonner);

    /* On ne supprime que ses propres préparations, sauf administrateur */
    const aMoi = !cours.moniteur ||
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
                    (aMoi ? '' : '\n\nIl a été préparé par ' + cours.moniteur + '.'))) return;
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
      info.textContent = 'préparé par ' + cours.moniteur;
      actions.appendChild(info);
    }

    row.appendChild(actions);
    zone.appendChild(row);
  });
}

/* Retire de la liste la préparation du cours qui vient d'être fait.
   Ciblée : les autres cours du même élève sont conservés. */
async function retirerPreparationFaite(){
  let cible = prepareEnCours;

  /* Cours non ouvert depuis la liste : on retrouve celui du jour */
  if(!cible && currentLessonMeta && currentLessonMeta.studentName){
    const nom = normaliserMot(currentLessonMeta.studentName);
    const jour = $('lessonDate').value;
    cible = prepares.find(x => normaliserMot(x.eleve || '') === nom && x.date === jour) || null;
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

function ouvrirRdvPost(cours){
  rdvPostEnCours = cours;

  $('rdvPostEleve').textContent = cours.eleve || '';
  $('rdvPostInfo').textContent = 'Prévu le ' + libelleDate(cours.date) +
    (cours.moniteur ? ' · ' + cours.moniteur : '');

  /* Le bilan est dans la note préparée par le bureau */
  const note = String(cours.note || '');
  const sep = "BILAN DE L'EXAMEN À CORRIGER :";
  const i = note.indexOf(sep);
  $('rdvPostBilan').value = (i !== -1) ? note.slice(i + sep.length).trim() : '';

  const sel = $('rdvPostSuite');
  sel.innerHTML = '<option value="">— à définir —</option>';
  SUITES_POST.forEach(s => {
    const o = document.createElement('option');
    o.value = s.cle; o.textContent = s.nom;
    sel.appendChild(o);
  });
  sel.value = '';
  $('rdvPostCom').value = '';
  $('rdvPostMsg').textContent = '';

  document.querySelectorAll('[data-tiroir]').forEach(d => { d.open = false; });
  $('recordView').style.display = 'none';
  $('resultView').style.display = 'none';
  $('rdvPostView').style.display = 'block';
  window.scrollTo(0, 0);
}

function fermerRdvPost(){
  rdvPostEnCours = null;
  $('rdvPostView').style.display = 'none';
  $('recordView').style.display = 'block';
  const t = document.querySelector('[data-tiroir="cours"]');
  if(t) t.open = true;
}

async function terminerRdvPost(){
  if(!rdvPostEnCours) return;
  const suite = $('rdvPostSuite').value;
  const msg = $('rdvPostMsg');

  if(!suite){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = 'Indique la suite à donner avant de terminer.';
    return;
  }

  const b = $('rdvPostEnr');
  b.disabled = true;
  b.textContent = 'Enregistrement…';
  try{
    /* On récupère la fiche pour ne pas écraser le reste */
    const d = await appelPrep({ action:'bureauEtat' });
    const liste = (d && d.suivi) || [];
    const s = liste.find(x => normaliserMot(x.eleve) === normaliserMot(rdvPostEnCours.eleve)) || {};

    await appelPrep(Object.assign({ action:'suiviSet' }, s, {
      eleve: rdvPostEnCours.eleve,
      bilanExamen: $('rdvPostBilan').value.trim(),
      suite: suite,
      commentaireMoniteur: $('rdvPostCom').value.trim(),
      rdvPostFait: 'oui',
      par: ACCES.moniteur || ''
    }));

    /* Le bureau est informé de la conclusion */
    await envoyerConsigne(rdvPostEnCours.eleve, 'permis',
      'Rendez-vous post-permis fait — ' + libelleSuite(suite) +
      ($('rdvPostCom').value.trim() ? ' · ' + $('rdvPostCom').value.trim() : ''));

    /* Le cours préparé n'a plus lieu d'être */
    if(rdvPostEnCours.id){
      try{ await appelPrep({ action:'prepDelete', id: rdvPostEnCours.id }); }catch(e){}
    }

    msg.style.color = 'var(--accent-text)';
    msg.textContent = '✅ Rendez-vous enregistré, le bureau est informé.';
    showToast('Rendez-vous terminé ✅');
    await afficherPrepares();
    setTimeout(fermerRdvPost, 1200);
  }catch(e){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = 'Erreur : ' + e.message;
  }finally{
    b.disabled = false;
    b.textContent = '✅ Terminer le rendez-vous';
  }
}

/* Charge un cours préparé dans le formulaire : plus qu'à démarrer.
   Si un cours a eu lieu depuis la préparation, les informations sont
   rafraîchies sans effacer ce que le moniteur avait saisi. */
async function chargerPrepare(cours){
  if(finalTranscript && !await confirmer('Un enregistrement est en cours. Le remplacer ?')) return;

  /* Un rendez-vous post-permis ne passe pas par l'enregistrement */
  if(cours.modele === 'rdv-post'){
    ouvrirRdvPost(cours);
    return;
  }

  prepareEnCours = cours;

  if(cours.modele) $('modele').value = cours.modele;
  $('studentName').value = cours.eleve || '';
  if(cours.site) $('site').value = cours.site;
  if(cours.date) $('lessonDate').value = cours.date;

  let contexte = cours.contexte || null;
  let note = cours.note || '';

  if(contexte){
    try{
      const d = await chargerDossierEleve(cours.eleve);
      const source = contexte.source || '';
      const plusRecent = d.dernierHorodatage && d.dernierHorodatage !== source;

      if(plusRecent){
        /* Un cours a eu lieu depuis : on repart de son état, en gardant
           tout ce que le moniteur avait renseigné à la préparation. */
        const frais = defautsDepuisNote(d.derniereNote);
        if(d.frise) frais.frise = d.frise;
        if(d.lecons !== null) frais.lecon = String(d.lecons + 1);
        frais.manoeuvresFaites = d.manoeuvres.length;
        frais.totalManoeuvres = BLOC.ficheListeConduite.length;

        contexte = fusionnerContexte(contexte, frais);
        contexte.source = d.dernierHorodatage;
        note = noteDepuisQuestionnaire(contexte);
        showToast('Infos mises à jour depuis le dernier cours ✅');
      }
    }catch(e){ /* hors ligne : on garde la préparation telle quelle */ }
  }

  $('noteInterne').value = note;

  /* Le questionnaire a déjà été rempli à la préparation : on ne le redemande pas */
  contexteDepart = contexte;
  noteQuestionnaire = note;

  finalTranscript = '';
  committedTranscript = '';
  $('transcriptBox').value = '';
  $('transcriptBox').style.display = 'none';
  $('transcriptAide').style.display = 'none';
  $('compteur').style.display = 'none';
  $('finishBtn').style.display = 'none';
  $('resultView').style.display = 'none';
  $('recordView').style.display = 'block';
  $('recBtn').textContent = '🎙️ Démarrer le cours';
  $('status').textContent = 'Cours préparé — tu peux démarrer directement.';

  verifierNomEleve('studentName', 'studentInfo', true);
  chargerHistoriqueEleve();
  window.scrollTo(0, 0);
  showToast('Cours de ' + (cours.eleve || 'l\'élève') + ' chargé ✅');
}

/* Prépare un nouveau cours : questionnaire complet, puis mise en réserve */
async function preparerNouveauCours(){
  const eleve = $('prepEleve').value.trim();
  const date = $('prepDate').value;
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
  $('lessonDate').value = date;

  const btnPrep = $('prepBtn');
  btnPrep.disabled = true;
  btnPrep.textContent = 'Ouverture…';

  let rep = null;
  try{
    rep = await ouvrirQuestionnaireDepart(null, 'Préparer le cours de ' + eleve, 'Enregistrer');
  }finally{
    btnPrep.disabled = false;
    btnPrep.textContent = '📝 Préparer les notes';
    $('studentName').value = sauve.eleve;
    $('modele').value = sauve.modele;
    $('lessonDate').value = sauve.date;
  }
  if(!rep) return;

  const btn = $('prepBtn');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';
  try{
    await appelPrep({
      action: 'prepAdd',
      date: date,
      eleve: eleve,
      modele: modeleCle,
      modeleLabel: MODELES[modeleCle] ? MODELES[modeleCle].label : '',
      site: $('site').value,
      note: noteDepuisQuestionnaire(rep),
      contexte: JSON.stringify(rep),
      moniteur: ACCES.moniteur || ''
    });
    $('prepEleve').value = '';
    await afficherPrepares();
    showToast('Cours préparé ✅');
  }catch(e){
    showToast('Enregistrement impossible : ' + e.message);
  }finally{
    btn.disabled = false;
    btn.textContent = '📝 Préparer les notes';
  }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-prepares.js'] = true;
