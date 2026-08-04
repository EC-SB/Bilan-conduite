/* ============================================================
   ec-questionnaire.js
   Questionnaire de début et de fin de cours
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   RACCOURCIS DE NOTE INTERNE
   `demandes` : questions posées au moniteur, dans l'ordre.
   Chaque réponse remplace le ❓ correspondant dans le modèle.
   ============================================================ */
const RACCOURCIS_NOTE = [
  { libelle: '📋 Compléter les infos', special: 'questionnaire' }
];








/* Une seule requête pour tout ce dont le questionnaire a besoin */
async function chargerDossierEleve(nomEleve){
  const vide = { frise: '', lecons: null, manoeuvres: [], derniereNote: '',
                 dernierHorodatage: '', boite: '' };
  if(!nomEleve || nomEleve.trim().length < 2) return vide;

  const enCache = lireCacheDossier(nomEleve);
  if(enCache) return enCache;

  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code,
                             eleve: nomEleve.trim(), leger: true })
    });
    if(!r.ok) return vide;
    const data = await r.json().catch(() => ({}));
    let res = (data && data.resultats) || [];

    /* Anciennes lignes sans colonne Manœuvres : on relit avec le texte.
       Le mode léger était redemandé, ce qui coûtait un appel pour rien. */
    const besoinTexte = res.length && res.every(x => !x.manoeuvres);
    if(besoinTexte){
      const r2 = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nomEleve.trim() })
      });
      if(r2.ok){
        const d2 = await r2.json().catch(() => ({}));
        res = (d2 && d2.resultats) || res;
      }
    }

    let frise = '';
    let lecons = 0;
    const manoeuvres = [];
    /* Le premier résultat est le plus récent */
    const dernier = res[0] || {};

    res.forEach(item => {
      if(!frise) frise = extraireFrise(item.note) || extraireFriseTexte(item.bilan);
      const type = String(item.type || '');
      if(/^Conduite/i.test(type) || /^AAC/i.test(type)) lecons++;
      const liste = item.manoeuvres
        ? String(item.manoeuvres).split('|').map(x => x.trim()).filter(Boolean)
        : manoeuvresDejaFaites(item.bilan);
      liste.forEach(m => {
        if(manoeuvres.indexOf(m) === -1) manoeuvres.push(m);
      });
    });

    /* La boîte de l'élève : colonne du questionnaire, sinon type du bilan */
    let boite = '';
    res.forEach(it => {
      if(!boite && it.boite) boite = String(it.boite).toLowerCase();
      if(!boite && /automatique/i.test(it.type || '')) boite = 'bea';
      if(!boite && /manuelle/i.test(it.type || '')) boite = 'bv';
    });

    const resultat = { frise: frise, lecons: lecons, manoeuvres: manoeuvres,
                       derniereNote: dernier.note || '',
                       dernierHorodatage: dernier.horodatage || dernier.date || '',
                       boite: boite };
    ecrireCacheDossier(nomEleve, resultat);
    return resultat;
  }catch(e){
    console.warn('Dossier élève indisponible :', e);
    return vide;
  }
}

/* Voyant d'attente pendant le chargement */
function ouvrirAttente(message){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  fond.innerHTML =
    '<div class="modal" style="max-width:280px;text-align:center;">' +
      '<div class="spinner" style="margin:6px auto 14px;"></div>' +
      '<div style="font-size:15px;color:var(--soft);">' + (message || 'Chargement…') + '</div>' +
    '</div>';
  document.body.appendChild(fond);
  return () => { if(fond.parentNode) document.body.removeChild(fond); };
}

/* Convertit « mardi 4 août 2026 » en « 2026-08-04 » pour le calendrier */
const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet',
                 'août','septembre','octobre','novembre','décembre'];

function dateFrVersIso(texte){
  const t = normaliserMot(texte || '');
  const m = t.match(/(\d{1,2})\s+([a-z\u00e0-\u00ff]+)\s+(\d{4})/);
  if(!m) return '';
  const jour = parseInt(m[1], 10);
  const mois = MOIS_FR.findIndex(x => normaliserMot(x) === m[2]);
  if(mois === -1) return '';
  const p2 = n => String(n).padStart(2, '0');
  return m[3] + '-' + p2(mois + 1) + '-' + p2(jour);
}

/* Reprend l'état décrit dans la note du dernier cours pour
   pré-remplir le questionnaire. */
function defautsDepuisNote(note){
  const a = analyserNote(note);
  const d = {};
  if(a.examBlanc){
    d.examBlanc = a.examBlanc;
    if(a.examBlancN !== null) d.examBlancN = String(a.examBlancN);
  }
  if(a.simuNuit) d.simuNuit = a.simuNuit;
  if(a.permis === 'aprevoir'){
    d.examPermis = 'aprevoir';
  }else if(a.permis === 'prevu'){
    d.examPermis = 'prevu';
    const iso = dateFrVersIso(a.permisDate);
    if(iso) d.examDate = iso;
    if(a.permisN !== null) d.examPermisN = String(a.permisN);
  }else if(a.permis === 'annule'){
    d.examPermis = 'annule';
    const m = (note || '').match(/Examen du permis du ([^—·]+?) annulé/i);
    if(m){ const iso = dateFrVersIso(m[1]); if(iso) d.examDate = iso; }
    const n = (note || '').match(/reprogrammé le ([^—·]+)/i);
    if(n){ const iso = dateFrVersIso(n[1]); if(iso) d.nouvelleDate = iso; }
  }
  const n = String(note || '');
  const aj = analyserNote(n);
  if(aj.repassages){
    d.repassages = aj.repassages;
    d.dateAjournement = aj.dateAjournement || '';
  }
  if(/♿ Conduite aménagée/i.test(n)){
    d.handicap = 'oui';
    d.amenagements = AMENAGEMENTS.filter(a => n.indexOf(a.nom) !== -1).map(a => a.cle);
  }
  if(/Formation accompagnateur faite/i.test(note || '')) d.formAccomp = 'faite';
  else if(/Formation accompagnateur déjà prévue/i.test(note || '')) d.formAccomp = 'prevue';
  else if(/Formation accompagnateur à prévoir/i.test(note || '')) d.formAccomp = 'aprevoir';
  if(/Rendez-vous préalable fait/i.test(note || '')) d.rvPrealable = 'fait';
  else if(/Rendez-vous préalable déjà prévu/i.test(note || '')) d.rvPrealable = 'prevu';
  else if(/Rendez-vous préalable à prévoir/i.test(note || '')) d.rvPrealable = 'aprevoir';
  return d;
}

/* Champs factuels : toujours recalculés, jamais figés par la préparation */
const CHAMPS_FACTUELS = ['lecon', 'frise', 'manoeuvresFaites', 'totalManoeuvres'];

/* Fusionne : le jugement du moniteur l'emporte, les faits sont rafraîchis */
function fusionnerContexte(saisi, defauts){
  const out = Object.assign({}, defauts || {});
  Object.keys(saisi || {}).forEach(k => {
    if(CHAMPS_FACTUELS.indexOf(k) !== -1 &&
       defauts && defauts[k] !== undefined && defauts[k] !== '') return;
    const v = saisi[k];
    const vide = (v === '' || v === null || v === undefined ||
                  (Array.isArray(v) && !v.length));
    if(!vide) out[k] = v;
  });
  return out;
}

/* ============================================================
   QUESTIONNAIRE DE DÉPART
   Un seul écran, tout pré-rempli : le moniteur ne corrige que
   ce qui a changé, puis démarre.
   ============================================================ */

/* Frises fixes, connues d'après le type de bilan */
const FRISES_FIXES = {
  'aacbea': 'AAC BEA👼⚠️que 4 leçons voiture pour faire fiche véhicule ⚠️3 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable',
  'aacbv': 'AAC BV👼⚠️que 6 leçons voiture pour faire fiche véhicule ⚠️5 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable',
  'csbea': 'CS BEA⚠️que 4 leçons voiture pour faire fiche véhicule ⚠️3 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable',
  'csbv': 'CS BV👼⚠️que 6 leçons voiture pour faire fiche véhicule ⚠️5 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable'
};

/* Parcours proposé par défaut selon le type de bilan */
const PARCOURS_PAR_TYPE = { 'aac-auto': 'aacbea', 'aac-manuelle': 'aacbv' };

/* Aménagements possibles d'un véhicule adapté */
const AMENAGEMENTS = [
  { cle:'boule_g',  court:'🔘⬅️', nom:'Boule avec commande à gauche' },
  { cle:'boule_d',  court:'🔘➡️', nom:'Boule avec commande à droite' },
  { cle:'boule',    court:'🔘',   nom:'Boule simple' },
  { cle:'accel_g',  court:'🦶⬅️', nom:'Accélérateur à gauche' },
  { cle:'retros',   court:'🪞',   nom:'Rétroviseurs additionnels' }
];

function libelleAmenagement(cle){
  const a = AMENAGEMENTS.find(x => x.cle === cle);
  return a ? a.court + ' ' + a.nom : cle;
}

/* Ce que le questionnaire doit afficher selon le type de bilan.
   Sur simulateur, tout le reste se passe en voiture : seule la frise compte. */
const PROFILS_QUESTIONNAIRE = {
  'simu-manuelle': 'simulateur',
  'simu-auto': 'simulateur',
  'eval-manuelle': 'evaluation',
  'eval-auto': 'evaluation',
  'examen-officiel': 'examen'
};

function profilQuestionnaire(modeleCle){
  return PROFILS_QUESTIONNAIRE[modeleCle] || 'complet';
}

/* contexteDepart : déclaré dans ec-etat.js */
/* noteQuestionnaire : déclaré dans ec-etat.js */
/* questionnaireOuvert : déclaré dans ec-etat.js */

/* Remplace la note du questionnaire sans écraser ce que le moniteur
   a écrit à la main à côté. */
function appliquerNoteQuestionnaire(nouvelle){
  const champ = $('noteInterne');
  let actuel = champ.value.trim();

  if(noteQuestionnaire && actuel.indexOf(noteQuestionnaire) !== -1){
    actuel = actuel.replace(noteQuestionnaire, '').replace(/^\s*·\s*|\s*·\s*$/g, '').trim();
  }

  champ.value = nouvelle
    ? (actuel ? nouvelle + ' · ' + actuel : nouvelle)
    : actuel;

  noteQuestionnaire = nouvelle;
  if($('noteResult')) $('noteResult').value = champ.value;
  sauvegarderLocal(true);
}

async function ouvrirQuestionnaireDepart(prec, titre, libelleValider){
  if(questionnaireOuvert) return null;   /* double appui ignoré */
  questionnaireOuvert = true;
  /* Filet : le verrou ne doit jamais rester bloqué */
  const secours = setTimeout(() => { questionnaireOuvert = false; }, 30000);
  try{
    return await construireQuestionnaire(prec, titre, libelleValider);
  }catch(e){
    questionnaireOuvert = false;
    console.error('Questionnaire :', e);
    await informer('Le questionnaire n\'a pas pu s\'ouvrir.\n\nDétail : ' + (e && e.message ? e.message : e));
    return null;
  }finally{
    clearTimeout(secours);
  }
}

async function construireQuestionnaire(prec, titre, libelleValider){
  prec = prec || {};
  const eleve = $('studentName').value.trim();
  const modeleCle = $('modele').value;

  const profil = profilQuestionnaire(modeleCle);

  /* Dossier de l'élève et consignes du bureau : chargés ensemble */
  const fermerAttente = ouvrirAttente('Récupération du dossier…');
  let dossier = { frise:'', lecons:null, manoeuvres:[], derniereNote:'', dernierHorodatage:'' };
  let consignesBureau = [];
  try{
    const taches = [chargerDossierEleve(eleve)];
    taches.push(consignesDe(eleve).catch(() => []));
    const [d, cd] = await Promise.all(taches);
    dossier = d || dossier;
    consignesBureau = (cd || [])
      .filter(x => x.traite !== 'oui' && x.type !== 'urgence');
  }catch(e){
    console.warn('Dossier partiellement indisponible :', e);
  }finally{
    fermerAttente();
  }

  /* Sans réponses antérieures, on repart de l'état du dernier cours */
  if(!Object.keys(prec).length && dossier.derniereNote){
    prec = defautsDepuisNote(dossier.derniereNote);
  }

  /* Frise entièrement déduite du type de bilan (cas AAC) */
  const friseDeduite = FRISES_FIXES[PARCOURS_PAR_TYPE[modeleCle] || ''] || '';
  /* Clé de conduite supervisée correspondant à la boîte du bilan */
  const cleCS = /auto/i.test(modeleCle) ? 'csbea' : 'csbv';
  const frisePrecedente = friseDeduite || dossier.frise;
  const faites = dossier.lecons;
  const manoeuvresAvant = dossier.manoeuvres || [];
  const totalManoeuvres = BLOC.ficheListeConduite.length;

  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';

    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(560px, 94vw);max-height:88vh;overflow-y:auto;';

    const restantes = totalManoeuvres - manoeuvresAvant.length;
    boite.innerHTML =
      '<h3>' + (titre || 'Avant de démarrer') + '</h3>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.5;">' +
        (eleve ? '<strong style="color:var(--cream);font-size:15px;">' + eleve + '</strong><br>' : '') +
        (profil === 'complet'
          ? '🦉 Manœuvres de la fiche véhicule : ' + manoeuvresAvant.length + ' sur ' + totalManoeuvres +
            ' validées' + (restantes ? ' — il en reste ' + restantes : ' — fiche terminée ✅') +
            (restantes
              ? '<details style="margin-top:8px;">' +
                  '<summary style="cursor:pointer;color:var(--accent-text);font-weight:600;">' +
                  'Voir les ' + restantes + ' manœuvres restantes</summary>' +
                  '<div id="qListeRestantes" style="margin-top:8px;padding:10px 12px;' +
                  'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
                  'font-size:14px;line-height:1.9;color:var(--cream);"></div>' +
                '</details>'
              : '')
          : (profil === 'simulateur' ? 'Séance sur simulateur — seule la frise est demandée ici.'
            : profil === 'evaluation' ? 'Évaluation de départ — la frise se définit en fin de séance.'
            : 'Examen officiel — note interne uniquement.')) +
        (consignesBureau.length
          ? '<div style="margin-top:10px;padding:10px 12px;background:rgba(182,255,14,.10);' +
            'border:1px solid var(--orange);border-radius:10px;color:var(--accent-text);' +
            'font-size:14px;font-weight:600;line-height:1.5;">📨 Message du bureau<br>' +
            consignesBureau.map(x => x.texte.replace(/&/g,'&amp;').replace(/</g,'&lt;')).join('<br>') +
            '</div>'
          : '') +
      '</div>' +

      '<label for="qBoite">Boîte</label>' +
      '<select id="qBoite">' +
        '<option value="bv">BV — boîte manuelle</option>' +
        '<option value="bea">BEA — boîte automatique</option>' +
      '</select>' +

      '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;' +
        'color:var(--cream);margin-bottom:10px;">' +
        '<input type="checkbox" id="qHandicap" style="width:19px;height:19px;">' +
        '♿ Conduite aménagée</label>' +
      '<div id="qZoneHandicap" style="display:none;padding:10px 12px;margin-bottom:14px;' +
        'background:var(--navy);border:1px solid var(--orange);border-radius:10px;">' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Aménagements du véhicule</div>' +
        AMENAGEMENTS.map(a =>
          '<label style="display:flex;align-items:center;gap:9px;text-transform:none;' +
          'font-size:15px;color:var(--cream);margin:0 0 7px;">' +
          '<input type="checkbox" class="qAmg" value="' + a.cle + '" style="width:18px;height:18px;">' +
          a.court + ' ' + a.nom + '</label>').join('') +
      '</div>' +

      '<label for="qAnts">Dossier ANTS</label>' +
      '<select id="qAnts">' +
        '<option value="">— non renseigné —</option>' +
        '<option value="eleve">Fait par l\'élève</option>' +
        '<option value="nous">Fait par nous</option>' +
      '</select>' +
      '<div style="font-size:12px;color:var(--muted);margin:-8px 0 14px;line-height:1.4;">' +
      'Information interne, jamais reprise dans les notes ni dans le bilan.</div>' +

      '<label>Frise de formation</label>' +
      (friseDeduite
        ? ''
        : '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
          'font-size:15px;color:var(--cream);margin-bottom:10px;">' +
            '<input type="checkbox" id="qCS" style="width:20px;height:20px;">' +
            'Conduite supervisée' +
          '</label>') +

      '<div id="qFriseClassique" style="background:var(--navy);border:1px solid var(--line);' +
      'border-radius:10px;padding:12px;margin-bottom:6px;font-size:15px;line-height:2;">' +
        '<input type="text" id="qFriseAvant" inputmode="numeric" maxlength="2" ' +
        'style="width:52px;display:inline-block;margin:0 4px 0 0;padding:7px;text-align:center;font-size:16px;">' +
        ' leçons de 2h + exam blanc +' +
        '<input type="text" id="qFriseApres" inputmode="numeric" maxlength="2" ' +
        'style="width:52px;display:inline-block;margin:0 4px;padding:7px;text-align:center;font-size:16px;">' +
        ' leçons de 2h <span id="qFriseHeures" style="color:var(--accent-text);font-weight:700;"></span>' +
        ' + 3h avant examen' +
      '</div>' +
      '<div id="qFriseFixe" style="display:none;background:var(--navy);border:1px solid var(--line);' +
      'border-radius:10px;padding:11px 12px;font-size:14px;line-height:1.5;margin-bottom:6px;"></div>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.4;">' +
      'Laisse vide si la frise n\'est pas encore déterminée.</div>' +

      '<label for="qLecon">Leçon n°</label>' +
      '<input type="text" id="qLecon" inputmode="numeric" placeholder="—">' +

      '<label for="qExamBlanc">Examen blanc</label>' +
      '<select id="qExamBlanc">' +
        '<option value="">— non évoqué —</option>' +
        '<option value="aprevoir">À prévoir</option>' +
        '<option value="reserve">Réservé</option>' +
        '<option value="passe">Déjà passé</option>' +
        '<option value="impossible">Non planifiable pour le moment</option>' +
      '</select>' +
      '<input type="text" id="qExamBlancN" inputmode="numeric" placeholder="Dans combien de leçons ?" style="display:none;">' +

      (modeleCle === 'examen-blanc'
        ? '<label for="qEBPasse">Conclusion de l\'examen blanc</label>' +
          '<select id="qEBPasse">' +
            '<option value="">— à renseigner —</option>' +
            '<option value="3h">✅ Plus que les 3h avant examen</option>' +
            '<option value="lecons">⏳ Encore des leçons avant examen</option>' +
            '<option value="pasleniveau">⛔ Pas le niveau</option>' +
          '</select>' +
          '<input type="text" id="qEBLecons" inputmode="numeric" ' +
          'placeholder="Combien de leçons avant l\'examen ?" style="display:none;">'
        : '') +

      '<label for="qExamPermis">Examen du permis</label>' +
      '<select id="qExamPermis">' +
        '<option value="">— pas de date —</option>' +
        '<option value="aprevoir">Date à prévoir</option>' +
        '<option value="prevu">Prévu le…</option>' +
        '<option value="annule">Annulé</option>' +
      '</select>' +
      '<div id="qLibExamDate" style="display:none;font-size:12px;color:var(--muted);margin:-8px 0 4px;"></div>' +
      '<input type="date" id="qExamDate" style="display:none;">' +
      '<input type="text" id="qExamPermisN" inputmode="numeric" ' +
      'placeholder="Leçons restantes avant l\'examen" style="display:none;">' +
      '<div id="qLibNouvelleDate" style="display:none;font-size:12px;color:var(--muted);margin:-8px 0 4px;">' +
      'Nouvelle date (laisse vide si en attente)</div>' +
      '<input type="date" id="qNouvelleDate" style="display:none;">' +

      '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:14px;">' +
        '<input type="checkbox" id="qFinirFiche" style="width:20px;height:20px;">' +
        'Manœuvres à finir en priorité' +
      '</label>' +

      '<label for="qSimuNuit">Simulateur nuit et risques</label>' +
      '<select id="qSimuNuit">' +
        '<option value="">— non évoqué —</option>' +
        '<option value="aprevoir">À prévoir</option>' +
        '<option value="prevu">Déjà prévu</option>' +
        '<option value="fait">Fait ✅</option>' +
      '</select>' +

      '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:14px;">' +
        '<input type="checkbox" id="qFinFormation" style="width:20px;height:20px;">' +
        'Fin de formation à prévoir' +
      '</label>' +

      '<div id="qBlocAacCs" style="display:none;">' +
        '<label for="qFormAccomp">Formation accompagnateur</label>' +
        '<select id="qFormAccomp">' +
          '<option value="">— non évoquée —</option>' +
          '<option value="aprevoir">À prévoir</option>' +
          '<option value="prevue">Déjà prévue</option>' +
          '<option value="faite">Déjà faite</option>' +
        '</select>' +
        '<label for="qRvPrealable">Rendez-vous préalable</label>' +
        '<select id="qRvPrealable">' +
          '<option value="">— non évoqué —</option>' +
          '<option value="aprevoir">À prévoir</option>' +
          '<option value="prevu">Déjà prévu</option>' +
          '<option value="fait">Déjà fait</option>' +
        '</select>' +
      '</div>' +

      '<label for="qLibre">Autre note pour le prochain moniteur</label>' +
      '<textarea id="qLibre" rows="3" maxlength="400" ' +
      'placeholder="Ex : élève très stressé, ne pas mettre sur 4 voies" ' +
      'style="width:100%;background:var(--navy);border:1px solid var(--line);color:var(--cream);' +
      'padding:11px 12px;border-radius:10px;font-size:15px;line-height:1.5;font-family:inherit;' +
      'resize:vertical;margin-bottom:6px;"></textarea>';

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';
    const passer = document.createElement('button');
    passer.className = 'btn btn-secondary';
    passer.textContent = 'Passer';
    const valider = document.createElement('button');
    valider.className = 'btn btn-primary';
    valider.textContent = libelleValider || 'Démarrer';
    rangee.appendChild(passer);
    rangee.appendChild(valider);
    boite.appendChild(rangee);
    fond.appendChild(boite);
    document.body.appendChild(fond);

    /* Pré-remplissage */
    const chAvant = boite.querySelector('#qFriseAvant');
    const chApres = boite.querySelector('#qFriseApres');
    const chHeures = boite.querySelector('#qFriseHeures');

    const caseCS = boite.querySelector('#qCS');
    const zoneClassique = boite.querySelector('#qFriseClassique');
    const zoneFixe = boite.querySelector('#qFriseFixe');

    const blocAacCs = boite.querySelector('#qBlocAacCs');

    /* Adaptation au profil : on retire ce qui ne concerne pas ce type de cours */
    if(profil !== 'complet'){
      const aMasquer = (profil === 'examen')
        ? ['#qLecon', '#qExamBlanc', '#qExamBlancN', '#qFinirFiche',
           '#qSimuNuit', '#qFinFormation', '#qBlocAacCs', '#qFriseClassique', '#qFriseFixe', '#qCS']
        : ['#qLecon', '#qExamBlanc', '#qExamBlancN', '#qExamPermis', '#qExamDate',
           '#qExamPermisN', '#qNouvelleDate', '#qLibExamDate', '#qLibNouvelleDate',
           '#qFinirFiche', '#qSimuNuit', '#qFinFormation', '#qBlocAacCs'];

      aMasquer.forEach(sel => {
        const el = boite.querySelector(sel);
        if(!el) return;
        /* On masque aussi l'étiquette qui précède le champ */
        const lab = boite.querySelector('label[for="' + sel.slice(1) + '"]');
        if(lab) lab.style.display = 'none';
        const parent = el.closest('label');
        if(parent) parent.style.display = 'none';
        else el.style.display = 'none';
      });
    }

    function majParcours(){
      const fixe = friseDeduite || ((caseCS && caseCS.checked) ? FRISES_FIXES[cleCS] : '');
      if(fixe){
        zoneClassique.style.display = 'none';
        zoneFixe.style.display = 'block';
        zoneFixe.textContent = fixe;
      }else{
        zoneClassique.style.display = 'block';
        zoneFixe.style.display = 'none';
      }
      /* Formation accompagnateur et RDV préalable ne concernent que AAC et CS */
      if(blocAacCs && profil === 'complet'){
        blocAacCs.style.display = fixe ? 'block' : 'none';
      }
      if(profil === 'examen'){
        zoneClassique.style.display = 'none';
        zoneFixe.style.display = 'none';
      }
    }
    /* Reprise de la conduite supervisée notée les cours précédents */
    if(caseCS && /^CS /.test(prec.frise || frisePrecedente || '')) caseCS.checked = true;
    if(caseCS) caseCS.addEventListener('change', majParcours);
    majParcours();
    /* Affiche d'emblée les champs conditionnels déjà renseignés */
    setTimeout(() => {
      selEB.dispatchEvent(new Event('change'));
      selEP.dispatchEvent(new Event('change'));
    }, 0);

    if(chAvant){
      const base = prec.frise || frisePrecedente;
      const av = leconsAvantExamenBlanc(base);
      const ap = leconsApresExamenBlanc(base);
      chAvant.value = av !== null ? av : '';
      /* Presque toujours 2 leçons après l'examen blanc */
      chApres.value = ap !== null ? ap : '2';

      const majHeures = () => {
        const b = chApres.value.trim();
        chHeures.textContent = b ? '(' + (parseInt(b, 10) * 2) + 'h)' : '';
      };
      chApres.addEventListener('input', majHeures);
      majHeures();
    }

    boite.querySelector('#qLecon').value = prec.lecon || ((faites !== null) ? (faites + 1) : '');
    boite.querySelector('#qFinirFiche').checked =
      (prec.finirFiche !== undefined) ? prec.finirFiche : (restantes > 0 && restantes <= 4);
    boite.querySelector('#qSimuNuit').value = prec.simuNuit || '';
    boite.querySelector('#qFinFormation').checked = !!prec.finFormation;
    boite.querySelector('#qFormAccomp').value = prec.formAccomp || '';
    boite.querySelector('#qRvPrealable').value = prec.rvPrealable || '';
    boite.querySelector('#qLibre').value = prec.libre || '';

    /* Boîte déduite du type de bilan, ANTS repris s'il est connu */
    boite.querySelector('#qBoite').value = prec.boite || (/auto/i.test(modeleCle) ? 'bea' : 'bv');
    boite.querySelector('#qAnts').value = prec.ants || '';

    /* Conduite aménagée */
    const cbH = boite.querySelector('#qHandicap');
    const znH = boite.querySelector('#qZoneHandicap');
    const dejaAmg = prec.amenagements || [];
    cbH.checked = (prec.handicap === 'oui') || dejaAmg.length > 0;
    boite.querySelectorAll('.qAmg').forEach(x => {
      x.checked = dejaAmg.indexOf(x.value) !== -1;
    });
    const majH = () => { znH.style.display = cbH.checked ? 'block' : 'none'; };
    cbH.addEventListener('change', majH);
    majH();

    /* Manœuvres qui restent à faire — affichage seul */
    const zoneRestantes = boite.querySelector('#qListeRestantes');
    if(zoneRestantes){
      const dejaFaites = manoeuvresAvant.map(normaliserMot);
      const restantesListe = BLOC.ficheListeConduite
        .filter(m => dejaFaites.indexOf(normaliserMot(m)) === -1);
      zoneRestantes.textContent = restantesListe.join(' · ');
    }

    /* Champs conditionnels */
    const selEB = boite.querySelector('#qExamBlanc');
    const nEB = boite.querySelector('#qExamBlancN');
    selEB.value = prec.examBlanc || '';
    nEB.value = prec.examBlancN || '';
    selEB.addEventListener('change', () => {
      const v = selEB.value;
      nEB.style.display = (v === 'reserve' || v === 'aprevoir' || v === 'passe') ? 'block' : 'none';
      nEB.placeholder = (v === 'passe')
        ? 'Leçons prévues avant le permis'
        : 'Dans combien de leçons ?';
    });

    const selEP = boite.querySelector('#qExamPermis');
    const dEP = boite.querySelector('#qExamDate');
    selEP.value = prec.examPermis || '';
    dEP.value = prec.examDate || '';
    /* Le nombre de leçons ne se demande que si l'examen blanc en appelle */
    const selEB2 = boite.querySelector('#qEBPasse');
    const nEB2 = boite.querySelector('#qEBLecons');
    if(selEB2 && nEB2){
      selEB2.value = prec.ebPasse || '';
      nEB2.value = prec.ebLecons || '';
      const majEB2 = () => {
        nEB2.style.display = (selEB2.value === 'lecons') ? 'block' : 'none';
      };
      selEB2.addEventListener('change', majEB2);
      setTimeout(majEB2, 0);
    }

    const nEP = boite.querySelector('#qExamPermisN');
    const nvDate = boite.querySelector('#qNouvelleDate');
    const libDate = boite.querySelector('#qLibExamDate');
    const libNv = boite.querySelector('#qLibNouvelleDate');
    nEP.value = prec.examPermisN || '';
    nvDate.value = prec.nouvelleDate || '';

    selEP.addEventListener('change', () => {
      const v = selEP.value;
      const avecDate = (v === 'prevu' || v === 'annule');

      dEP.style.display = avecDate ? 'block' : 'none';
      libDate.style.display = avecDate ? 'block' : 'none';
      libDate.textContent = (v === 'annule')
        ? "Date à laquelle l'examen était prévu"
        : "Date de l'examen";
      /* Pas de date du jour pour un examen annulé : elle est passée */
      if(v === 'prevu' && !dEP.value) dEP.value = todayLocal();

      nEP.style.display = (v === 'prevu') ? 'block' : 'none';
      nvDate.style.display = (v === 'annule') ? 'block' : 'none';
      libNv.style.display = (v === 'annule') ? 'block' : 'none';
    });

    function fermer(reponses){
      questionnaireOuvert = false;
      document.body.removeChild(fond);
      resolve(reponses);
    }

    passer.addEventListener('click', () => fermer(null));
    valider.addEventListener('click', () => {
      /* Les consignes du bureau rejoignent la note et sont marquées traitées */
      consignesBureau.forEach(x => {
        appelPrep({ action: 'consigneDone', id: x.id }).catch(() => {});
      });
      fermer({
        source: dossier.dernierHorodatage || '',
        consignes: consignesBureau.map(x => x.texte),
        frise: friseDeduite ||
               ((caseCS && caseCS.checked) ? FRISES_FIXES[cleCS] : '') ||
               composerFrise(
          chAvant ? chAvant.value : '',
          chApres ? chApres.value : ''
        ),
        lecon: boite.querySelector('#qLecon').value.trim(),
        examBlanc: selEB.value,
        examBlancN: nEB.value.trim(),
        examPermis: selEP.value,
        examDate: dEP.value,
        finirFiche: boite.querySelector('#qFinirFiche').checked,
        simuNuit: boite.querySelector('#qSimuNuit').value,
        finFormation: boite.querySelector('#qFinFormation').checked,
        ebPasse: selEB2 ? selEB2.value : '',
        ebLecons: nEB2 ? nEB2.value.trim() : '',
        examPermisN: nEP.value.trim(),
        nouvelleDate: nvDate.value,
        formAccomp: boite.querySelector('#qFormAccomp').value,
        rvPrealable: boite.querySelector('#qRvPrealable').value,
        boite: boite.querySelector('#qBoite').value,
        handicap: boite.querySelector('#qHandicap').checked ? 'oui' : '',
        amenagements: Array.prototype.slice
          .call(boite.querySelectorAll('.qAmg:checked')).map(x => x.value),
        ants: boite.querySelector('#qAnts').value,
        libre: boite.querySelector('#qLibre').value.trim(),
        leconsFaites: faites,
        manoeuvresFaites: manoeuvresAvant.length,
        totalManoeuvres: totalManoeuvres
      });
    });
  });
}

/* Transforme les réponses en texte de note interne */
function noteDepuisQuestionnaire(q){
  if(!q) return '';
  const bouts = [];

  /* Un repassage se signale avant tout le reste */
  if(q.repassages){
    bouts.push('🔁 ' + q.repassages + (q.repassages === 1 ? 'er' : 'e') + ' repassage' +
      (q.dateAjournement ? ' — ajourné le ' + q.dateAjournement : ''));
  }

  /* Les aménagements passent en premier : le moniteur doit les voir d'emblée */
  if(q.handicap === 'oui'){
    const amg = (q.amenagements || []).map(libelleAmenagement);
    bouts.push('♿ Conduite aménagée' + (amg.length ? ' — ' + amg.join(' · ') : ''));
  }

  if(q.frise) bouts.push(q.frise);

  if(q.lecon){
    const n = parseInt(q.lecon, 10);
    const rang = (n === 1) ? '1ère' : n + 'ème';

    /* Parcours AAC ou CS : le total figure dans la frise */
    const totalAacCs = leconsPrevuesAacCs(q.frise);
    if(totalAacCs){
      if(n < totalAacCs){
        bouts.push(rang + ' leçon sur ' + totalAacCs + ' — encore ' + (totalAacCs - n) +
                   ' leçon' + ((totalAacCs - n) > 1 ? 's' : '') + ' avant la fin de la fiche véhicule');
      }else if(n === totalAacCs){
        bouts.push(rang + ' leçon sur ' + totalAacCs + ' — dernière prévue');
      }else{
        bouts.push(rang + ' leçon — frise dépassée (' + totalAacCs + ' prévues)');
      }
      ajouterSuite(bouts, q);
      return bouts.join(' · ');
    }

    const prevues = leconsAvantExamenBlanc(q.frise);
    if(prevues && n < prevues){
      bouts.push(rang + ' leçon sur ' + prevues + ' — encore ' + (prevues - n) +
                 ' leçon' + ((prevues - n) > 1 ? 's' : '') + " avant l'examen blanc");
    }else if(prevues && n === prevues){
      bouts.push(rang + ' leçon sur ' + prevues + " — dernière avant l'examen blanc");
    }else if(prevues && n > prevues){
      bouts.push(rang + ' leçon — frise dépassée (' + prevues + ' prévues)');
    }else{
      bouts.push(rang + ' leçon');
    }
  }

  ajouterSuite(bouts, q);
  return bouts.join(' · ');
}

/* Partie commune : examens, fiche véhicule, cases à cocher, note libre */
function ajouterSuite(bouts, q){
  const n = q.examBlancN;
  const pl = v => (parseInt(v, 10) > 1 ? 's' : '');

  /* L'examen blanc vient d'avoir lieu : sa conclusion prime */
  if(q.ebPasse){
    const jour = dateEnToutesLettres($('lessonDate').value || todayLocal());
    if(q.ebPasse === '3h'){
      bouts.push('Examen blanc passé le ' + jour + ' — plus que les 3h avant examen');
    }else if(q.ebPasse === 'lecons'){
      const n = q.ebLecons;
      bouts.push('Examen blanc passé le ' + jour + ' — encore ' + (n || '❓') +
                 ' leçon' + (parseInt(n, 10) > 1 ? 's' : '') + ' avant examen');
    }else{
      bouts.push('Examen blanc passé le ' + jour + ' — pas le niveau');
    }
  }else if(q.examBlanc === 'passe'){
    bouts.push(n ? 'Examen blanc passé — ' + n + ' leçon' + pl(n) + ' prévue' + pl(n) +
                   ' avant le permis (+ 3h avant examen)'
                 : 'Examen blanc déjà passé');
  }else if(q.examBlanc === 'reserve'){
    bouts.push(n ? 'Examen blanc réservé dans ' + n + ' leçon' + pl(n) : 'Examen blanc réservé');
  }else if(q.examBlanc === 'aprevoir'){
    bouts.push(n ? 'Examen blanc à prévoir dans ' + n + ' leçon' + pl(n)
                 : 'Examen blanc à prévoir');
  }else if(q.examBlanc === 'impossible'){
    bouts.push("Ne pas prévoir d'examen blanc pour le moment");
  }

  if(q.examPermis === 'aprevoir'){
    bouts.push("Date d'examen à prévoir");
  }else if(q.examPermis === 'prevu' && q.examDate){
    const np = q.examPermisN;
    let phrase = 'Examen prévu le ' + dateEnToutesLettres(q.examDate);
    if(np){
      phrase += (parseInt(np, 10) === 0)
        ? ' — plus que les 3h avant examen'
        : ' — encore ' + np + ' leçon' + pl(np) + ' + 3h avant examen';
    }
    bouts.push(phrase);
  }else if(q.examPermis === 'annule'){
    let phrase = q.examDate
      ? 'Examen du permis du ' + dateEnToutesLettres(q.examDate) + ' annulé'
      : 'Examen du permis annulé';
    phrase += q.nouvelleDate
      ? ' — reprogrammé le ' + dateEnToutesLettres(q.nouvelleDate)
      : ' — nouvelle date en attente';
    bouts.push(phrase);
  }

  if(q.finirFiche){
    const reste = q.totalManoeuvres - q.manoeuvresFaites;
    bouts.push('Finir Fiche' + (reste ? ' — ' + reste + ' manœuvre' + (reste > 1 ? 's' : '') +
               ' restante' + (reste > 1 ? 's' : '') : ''));
  }
  if(q.simuNuit === 'aprevoir') bouts.push('Simulateur nuit et risques à prévoir');
  else if(q.simuNuit === 'prevu') bouts.push('Simulateur nuit et risques déjà prévu');
  else if(q.simuNuit === 'fait') bouts.push('Simulateur nuit et risques fait ✅');


  if(q.formAccomp === 'aprevoir') bouts.push('Formation accompagnateur à prévoir');
  else if(q.formAccomp === 'prevue') bouts.push('Formation accompagnateur déjà prévue');
  else if(q.formAccomp === 'faite') bouts.push('Formation accompagnateur faite');

  if(q.rvPrealable === 'aprevoir') bouts.push('Rendez-vous préalable à prévoir');
  else if(q.rvPrealable === 'prevu') bouts.push('Rendez-vous préalable déjà prévu');
  else if(q.rvPrealable === 'fait') bouts.push('Rendez-vous préalable fait');
  if(q.finFormation) bouts.push('Fin de formation à prévoir');
  if(q.libre) bouts.push(q.libre);
  (q.consignes || []).forEach(t => bouts.push(t));
}

/* Choix d'une date au calendrier plutôt qu'à la saisie manuelle */
function choisirDate(titre){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';

    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.maxWidth = '360px';

    const h = document.createElement('h3');
    h.textContent = titre || 'Choisis une date';
    boite.appendChild(h);

    const champ = document.createElement('input');
    champ.type = 'date';
    champ.style.cssText = 'width:100%;font-size:18px;padding:14px;text-align:center;';
    /* Pré-rempli à aujourd'hui : le calendrier s'ouvre au bon mois */
    champ.value = todayLocal();
    boite.appendChild(champ);

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';

    const annuler = document.createElement('button');
    annuler.className = 'btn btn-secondary';
    annuler.textContent = 'Annuler';

    const valider = document.createElement('button');
    valider.className = 'btn btn-primary';
    valider.textContent = 'Valider';

    rangee.appendChild(annuler);
    rangee.appendChild(valider);
    boite.appendChild(rangee);
    fond.appendChild(boite);
    document.body.appendChild(fond);

    function fermer(valeur){
      document.body.removeChild(fond);
      resolve(valeur);
    }
    annuler.addEventListener('click', () => fermer(null));
    valider.addEventListener('click', () => fermer(champ.value || null));
    fond.addEventListener('click', e => { if(e.target === fond) fermer(null); });

    /* Ouvre directement le calendrier sur mobile */
    setTimeout(() => {
      champ.focus();
      if(champ.showPicker){ try{ champ.showPicker(); }catch(e){} }
    }, 80);
  });
}



/* Date ISO -> texte lisible en français */
function dateEnToutesLettres(iso){
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}



/* Compte les leçons de conduite déjà enregistrées pour un élève.
   Seuls les bilans de type « Conduite » comptent : simulateur,
   évaluation, RDV préalable et examen ne sont pas des leçons. */
async function leconsDejaFaites(nomEleve){
  if(!nomEleve || nomEleve.trim().length < 2) return null;
  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nomEleve.trim(), leger: true })
    });
    if(!r.ok) return null;
    const data = await r.json().catch(() => ({}));
    const res = (data && data.resultats) || [];
    let n = 0;
    res.forEach(item => {
      const type = String(item.type || '');
      if(/^Conduite/i.test(type) || /^AAC/i.test(type)) n++;
    });
    return n;
  }catch(e){
    console.warn('Comptage des leçons indisponible :', e);
    return null;
  }
}


/* Retrouve la frise du dernier bilan de l'élève : elle est fixée à
   l'évaluation et ne change quasiment jamais. */
async function friseAnterieure(nomEleve){
  if(!nomEleve || nomEleve.trim().length < 2) return '';
  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nomEleve.trim(), leger: true })
    });
    if(!r.ok) return '';
    const data = await r.json().catch(() => ({}));
    const res = (data && data.resultats) || [];
    /* Du plus récent au plus ancien : on garde la première trouvée */
    for(let i = 0; i < res.length; i++){
      const f = extraireFrise(res[i].note) || extraireFriseTexte(res[i].bilan);
      if(f) return f;
    }
    return '';
  }catch(e){
    return '';
  }
}

/* Retrouve la frise inscrite dans le corps d'un bilan précédent */
function extraireFriseTexte(bilan){
  const t = String(bilan || '');
  const m = t.match(/(\d+\s*le[çc]ons? de 2h[^\n]*exam[^\n]*)/i);
  return m ? m[1].trim() : '';
}



/* Ajoute le texte à la note, sans jamais écraser ce qui est déjà écrit */
function ajouterANote(champ, texte){
  if(!champ || !texte) return;
  const actuel = champ.value.trim();
  champ.value = actuel ? actuel + ' · ' + texte : texte;
  champ.focus();
  try{ champ.setSelectionRange(champ.value.length, champ.value.length); }catch(e){}
  sauvegarderLocal();
}

/* Construit la rangée de boutons sous un champ de note */
function creerRaccourcis(idConteneur, idChamp){
  const zone = $(idConteneur);
  if(!zone) return;
  zone.innerHTML = '';
  RACCOURCIS_NOTE.forEach(r => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'raccourci';
    b.textContent = r.libelle;
    b.addEventListener('click', async () => {
      let texte;
      if(r.special === 'questionnaire'){
        b.disabled = true;
        b.textContent = '…';
        try{
          const rep = await ouvrirQuestionnaireDepart(contexteDepart, 'Compléter les infos', 'Valider');
          if(rep){
            contexteDepart = rep;
            appliquerNoteQuestionnaire(noteDepuisQuestionnaire(rep));
          }
        }finally{
          b.disabled = false;
          b.textContent = r.libelle;
        }
      }
      if(texte) ajouterANote($(idChamp), texte);   /* inutilisé : le questionnaire écrit lui-même */
    });
    zone.appendChild(b);
  });
}


/* ---------- Historique affiché dès la saisie de l'élève ---------- */
/* minuteurHistorique : déclaré dans ec-etat.js */
/* derniereBoiteEleve : déclaré dans ec-etat.js */
/* dernierEleveCharge : déclaré dans ec-etat.js */

function planifierHistorique(){
  clearTimeout(minuteurHistorique);
  /* On attend que le moniteur ait fini de taper : une recherche
     par lettre saturerait Sheets pour rien. */
  minuteurHistorique = setTimeout(chargerHistoriqueEleve, 700);
}

async function chargerHistoriqueEleve(){
  const zone = $('historiqueEleve');
  if(!zone) return;
  const nom = $('studentName').value.trim();

  if(nom.length < 3){
    zone.style.display = 'none';
    zone.innerHTML = '';
    dernierEleveCharge = '';
    derniereBoiteEleve = '';
    if($('alerteBoite')) $('alerteBoite').style.display = 'none';
    return;
  }
  if(normaliserMot(nom) === dernierEleveCharge) return;   /* déjà affiché */
  dernierEleveCharge = normaliserMot(nom);

  zone.style.display = 'block';
  zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">Recherche des cours précédents…</div>';

  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nom, leger: true })
    });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json().catch(() => ({}));
    const res = (data && data.resultats) || [];

    if(!res.length){
      zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">Aucun cours précédent pour cet élève.</div>';
      return;
    }

    /* Boîte de l'élève, pour vérifier que le modèle correspond */
    let boiteEleve = '';
    res.forEach(it => {
      if(!boiteEleve && it.boite) boiteEleve = String(it.boite).toLowerCase();
      if(!boiteEleve && /automatique/i.test(it.type || '')) boiteEleve = 'bea';
      if(!boiteEleve && /manuelle/i.test(it.type || '')) boiteEleve = 'bv';
    });
    verifierBoiteModele(boiteEleve);
    derniereBoiteEleve = boiteEleve;

    const dernier = res[0];
    const note = (dernier.note || '').trim();

    zone.innerHTML = '';
    const carte = document.createElement('div');
    carte.style.cssText = 'border:1px solid ' + (note ? 'var(--orange)' : 'var(--line)') +
      ';border-radius:12px;padding:12px 14px;background:' +
      (note ? 'rgba(182,255,14,.08)' : 'transparent') + ';';

    const titre = document.createElement('div');
    titre.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
    titre.textContent = res.length + ' cours précédent' + (res.length > 1 ? 's' : '') +
      ' · dernier le ' + (dernier.date || '?') +
      (dernier.moniteur ? ' avec ' + dernier.moniteur : '');
    carte.appendChild(titre);

    if(note){
      const n = document.createElement('div');
      n.style.cssText = 'font-size:15px;font-weight:600;color:var(--accent-text);line-height:1.45;white-space:pre-wrap;';
      n.textContent = '📌 ' + note;
      carte.appendChild(n);
    }else{
      const n = document.createElement('div');
      n.style.cssText = 'font-size:13px;color:var(--muted);';
      n.textContent = 'Pas de note laissée par le moniteur précédent.';
      carte.appendChild(n);
    }

    const lien = document.createElement('button');
    lien.type = 'button';
    lien.className = 'btn btn-secondary';
    lien.style.cssText = 'margin-top:10px;font-size:13px;padding:9px 12px;';
    lien.textContent = '👁️ Voir le dernier bilan';
    lien.addEventListener('click', () => {
      currentLessonMeta = {
        modeleLabel: dernier.type, studentName: dernier.eleve, monitorName: dernier.moniteur,
        site: dernier.site, dateStr: dernier.date, noteInterne: dernier.note || '', ts: Date.now()
      };
      $('resultText').value = dernier.bilan;
      afficherNote(dernier.note);
      marquerExport(true);
      $('recordView').style.display = 'none';
      $('resultView').style.display = 'block';
      window.scrollTo(0, 0);
    });
    carte.appendChild(lien);

    zone.appendChild(carte);
  }catch(e){
    zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">Historique indisponible.</div>';
  }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-questionnaire.js'] = true;
