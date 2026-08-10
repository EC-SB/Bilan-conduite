/* Déployé le 10/08/2026 à 09:03 — v332 */
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
  const vide = { frise: '', lecons: null, manoeuvres: [], marques: {}, derniereNote: '',
                 dernierHorodatage: '', boite: '' };
  if(!nomEleve || nomEleve.trim().length < 2) return vide;

  const enCache = lireCacheDossier(nomEleve);
  if(enCache) return enCache;

  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      /* Texte complet : la fiche véhicule s'y trouve, et c'est elle
         qui pré-coche le questionnaire. En mode allégé, les marques
         étaient toujours vides et rien n'était coché. */
      body: JSON.stringify({ action: 'search', code: ACCES.code,
                             eleve: nomEleve.trim() })
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

    /* Les marques de la fiche véhicule, cumulées du plus ancien
       au plus récent : elles servent à pré-cocher le questionnaire. */
    const marques = {};
    res.slice().reverse().forEach(item => {
      const m = marquesDejaPosees(item.bilan);
      Object.keys(m).forEach(k => { marques[k] = m[k]; });
    });

    const resultat = { frise: frise, lecons: lecons, manoeuvres: manoeuvres,
                       marques: marques,
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
  const p2 = n => String(n).padStart(2, '0');

  /* Format chiffré : 02/09/2026, 2-9-2026, 02.09.2026 */
  const chiffre = t.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/);
  if(chiffre){
    return chiffre[3] + '-' + p2(chiffre[2]) + '-' + p2(chiffre[1]);
  }

  /* Déjà au format ISO */
  const iso = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if(iso) return iso[0];

  const m = t.match(/(\d{1,2})\s+([a-z\u00e0-\u00ff]+)\s+(\d{4})/);
  if(!m) return '';
  const jour = parseInt(m[1], 10);
  const mois = MOIS_FR.findIndex(x => normaliserMot(x) === m[2]);
  if(mois === -1) return '';
  return m[3] + '-' + p2(mois + 1) + '-' + p2(jour);
}

/* Reprend l'état décrit dans la note du dernier cours pour
   pré-remplir le questionnaire. */
/* Le rang du passage, relu dans la note : « 2e passage » */
function passageDepuisNote(note){
  const m = String(note || '').match(/(\d)\s*(?:er|e)\s+passage/i);
  return m ? m[1] : '';
}

function defautsDepuisNote(note){
  const a = analyserNote(note);
  const d = {};
  if(a.examBlanc){
    d.examBlanc = a.examBlanc;
    if(a.examBlancN !== null) d.examBlancN = String(a.examBlancN);
  }
  if(a.simuNuit) d.simuNuit = a.simuNuit;
  const rgP = passageDepuisNote(note);
  if(rgP) d.examPassage = rgP;
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

/* Le bloc « Historique » ne s'affiche plus sur l'écran de cours :
   la note du moniteur précédent est déjà résumée sous le nom de
   l'élève. Le champ reste alimenté, il part avec le bilan. */
function majAffichageNoteInterne(){
  const bloc = $('blocNoteInterne');
  if(bloc) bloc.style.display = 'none';
}


/* Les segments que le questionnaire régénère à chaque ouverture :
   frise, rang de la leçon, avancement. Les garder ferait s'empiler
   trois frises différentes dans la même note. */
const SEGMENTS_REGENERES = [
  /le[çc]ons? de 2h.*exam(?:en)? blanc/i,
  /^❓\s*le[çc]ons/i,
  /^\d+(?:ère|ere|ème|eme|e)\s+le[çc]on\b/i,
  /^1(?:ère|ere)\s+le[çc]on\b/i,
  /frise (?:dépassée|depassee|terminée|terminee)/i,
  /encore \d+\s+le[çc]ons?\s+avant/i,
  /plus que les 3h avant examen/i
];

function retirerSegmentsRegeneres(note){
  return String(note || '')
    .split('·')
    .map(x => x.trim())
    .filter(x => x && !SEGMENTS_REGENERES.some(r => r.test(x)))
    .join(' · ');
}

function appliquerNoteQuestionnaire(nouvelle){
  const champ = $('noteInterne');
  let actuel = champ.value.trim();

  if(noteQuestionnaire && actuel.indexOf(noteQuestionnaire) !== -1){
    actuel = actuel.replace(noteQuestionnaire, '').replace(/^\s*·\s*|\s*·\s*$/g, '').trim();
  }

  /* Et tout ce qui vient d'une ouverture antérieure : une note
     héritée du cours précédent porte déjà sa frise, qui n'a plus
     lieu d'être puisqu'on vient d'en recalculer une. */
  actuel = retirerSegmentsRegeneres(actuel);

  champ.value = nouvelle
    ? (actuel ? nouvelle + ' · ' + actuel : nouvelle)
    : actuel;
  majAffichageNoteInterne();

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

  /* Le répertoire doit être en mémoire : sans lui, ficheDe() ne
     trouve rien et le questionnaire redemande des coordonnées
     pourtant déjà enregistrées. */
  if(typeof chargerFiches === 'function' &&
     (typeof fichesEleves === 'undefined' || !fichesEleves.length)){
    try{ await chargerFiches(); }catch(e){ /* on continue sans */ }
  }

  /* Dossier de l'élève et consignes du bureau : chargés ensemble */
  const fermerAttente = ouvrirAttente('Récupération du dossier…');
  let dossier = { frise:'', lecons:null, manoeuvres:[], marques:{},
                  derniereNote:'', dernierHorodatage:'' };
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

  /* Le moniteur a-t-il déjà répondu pendant ce cours ? Si oui, ses
     réponses priment sur tout : c'est lui qui vient de les saisir. */
  const dejaRepondu = Object.keys(prec).length > 0;

  if(!dejaRepondu){
    /* Premier passage : on repart de l'état du dernier cours… */
    if(dossier.derniereNote) prec = defautsDepuisNote(dossier.derniereNote);

    /* …complété par les messages du bureau, plus récents que le
       dernier bilan. Une date qu'il vient de fixer doit apparaître
       dans le champ, pas seulement dans l'encadré vert. */
    if(consignesBureau.length){
      const duBureau = defautsDepuisNote(consignesBureau.map(x => x.texte).join(' · '));
      Object.keys(duBureau).forEach(k => {
        if(duBureau[k] !== undefined && duBureau[k] !== '') prec[k] = duBureau[k];
      });
    }
  }

  /* La frise saisie sur la fiche de l'élève fait autorité : elle a été
     posée une fois pour toutes, inutile de la redemander à chaque cours. */
  if(!prec.frise){
    const qui = ($('studentName') && $('studentName').value.trim()) ||
                ($('prepEleve') && $('prepEleve').value.trim()) || '';
    const fiche = (qui && typeof ficheDe === 'function') ? ficheDe(qui) : null;
    if(fiche && fiche.frise) prec.frise = fiche.frise;
  }

  /* Frise entièrement déduite du type de bilan (cas AAC) */
  const friseDeduite = FRISES_FIXES[PARCOURS_PAR_TYPE[modeleCle] || ''] || '';
  /* Clé de conduite supervisée correspondant à la boîte du bilan */
  const cleCS = /auto/i.test(modeleCle) ? 'csbea' : 'csbv';
  /* Trois sources, de la plus sûre à la plus générale : le type de
     bilan, le dernier cours, la fiche de l'élève. Sans ce dernier
     recours, un dossier momentanément indisponible faisait perdre
     une frise pourtant enregistrée. */
  const ficheEleve = (typeof ficheDe === 'function') ? ficheDe(eleve) : null;

  /* L'ANTS vient de la fiche s'il n'a pas déjà été saisi dans ce cours :
     il est renseigné à l'inscription, pas à chaque leçon. */
  if(!prec.ants && ficheEleve && ficheEleve.ants) prec.ants = ficheEleve.ants;
  const frisePrecedente = friseDeduite || dossier.frise ||
                          (ficheEleve && ficheEleve.frise) || '';
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
        '<option value="bea">BEA — boîte automatique</option>' +
        '<option value="bv">BV — boîte manuelle</option>' +
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

      /* Les coordonnées manquantes : demandées une seule fois, à
         celui qui a l'élève en face de lui. */
      '<div id="qBlocModele" style="display:none;">' +
        '<label for="qModele">📋 Type de bilan</label>' +
        '<select id="qModele"></select>' +
        '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;">' +
          'Ce que sera le cours. Modifiable tant que le cours n\'a pas eu lieu.</div>' +
      '</div>' +

      '<div id="qBlocCoord" style="display:none;">' +
        '<div style="font-size:12px;color:var(--warn-text);margin-bottom:8px;' +
          'line-height:1.4;font-weight:700;">' +
          '📇 Coordonnées manquantes — demande-les à l\'élève</div>' +

        '<div id="qBlocMessenger" style="display:none;">' +
          '<label for="qMessenger">💬 Messenger de l\'élève</label>' +
          '<input type="text" id="qMessenger" autocomplete="off" ' +
            'placeholder="Lien de sa conversation, ou pseudo">' +
        '</div>' +

        '<div id="qBlocMail" style="display:none;">' +
          '<label for="qMail">✉️ Adresse mail de l\'élève</label>' +
          '<input type="email" id="qMail" inputmode="email" autocomplete="off" ' +
            'placeholder="prenom.nom@exemple.fr">' +
        '</div>' +

        '<div id="qBlocMailPresc" style="display:none;">' +
          '<label for="qMailPresc">👤 Mail du prescripteur</label>' +
          '<input type="email" id="qMailPresc" inputmode="email" autocomplete="off" ' +
            'placeholder="Représentant légal, ou celui qui paie">' +
        '</div>' +

        '<div id="qBlocAnts" style="display:none;">' +
          '<label for="qAnts">📇 Dossier ANTS</label>' +
          '<select id="qAnts">' +
            '<option value="">— non renseigné —</option>' +
            '<option value="eleve">Fait par l\'élève</option>' +
            '<option value="nous">Fait par nous</option>' +
          '</select>' +
        '</div>' +

        '<div style="font-size:12px;color:var(--muted);margin:-4px 0 14px;line-height:1.4;">' +
        'Saisies ici, elles rejoignent sa fiche : tous les moniteurs les ' +
        'retrouveront, et son bilan pourra lui être envoyé.</div>' +
      '</div>' +

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

      '<label>Examen blanc</label>' +
      '<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
        'margin-bottom:10px;">' +
        ['', 'aprevoir', 'reserve', 'passe', 'impossible'].map(function(v, i){
          const nom = ['— non évoqué —', 'À prévoir', 'Réservé', 'Déjà passé',
                       'Non planifiable pour le moment'][i];
          return '<label style="display:flex;align-items:center;gap:9px;padding:4px 0;' +
            'text-transform:none;font-size:15px;color:var(--cream);margin:0;font-weight:400;">' +
            '<input type="radio" name="qExamBlancChoix" value="' + v + '"' +
            (v === '' ? ' checked' : '') +
            ' style="width:18px;height:18px;flex-shrink:0;">' + nom + '</label>';
        }).join('') +
      '</div>' +

      '<div id="qBlocEbRang" style="display:none;">' +
        '<label for="qExamBlancRang">Quel examen blanc ?</label>' +
        '<select id="qExamBlancRang">' +
          '<option value="">— non précisé —</option>' +
          '<option value="1">1er</option>' +
          '<option value="2">2e</option>' +
          '<option value="3">3e</option>' +
          '<option value="4">4e</option>' +
          '<option value="5">5e</option>' +
        '</select>' +
      '</div>' +

      '<div id="qBlocEbDate" style="display:none;">' +
        '<label for="qExamBlancDate">Date de l\'examen blanc</label>' +
        '<input type="date" id="qExamBlancDate">' +
      '</div>' +

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
      '<div id="qBlocPassage" style="display:none;">' +
        '<label for="qExamPassage">Quel passage ?</label>' +
        '<select id="qExamPassage">' +
          '<option value="">— non précisé —</option>' +
          '<option value="1">1er passage</option>' +
          '<option value="2">2e passage</option>' +
          '<option value="3">3e passage</option>' +
          '<option value="4">4e passage</option>' +
          '<option value="5">5e passage ou plus</option>' +
        '</select>' +
      '</div>' +
      '<input type="text" id="qExamPermisN" inputmode="numeric" ' +
      'placeholder="Leçons restantes avant l\'examen" style="display:none;">' +
      '<div id="qLibNouvelleDate" style="display:none;font-size:12px;color:var(--muted);margin:-8px 0 4px;">' +
      'Nouvelle date (laisse vide si en attente)</div>' +
      '<input type="date" id="qNouvelleDate" style="display:none;">' +

      '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:14px;">' +
        '<input type="checkbox" id="qPasEcoute" style="width:20px;height:20px;">' +
        "Pas d'écoutes pédagogiques" +
      '</label>' +

      '<label for="qSimuNuit">Simulateur nuit et risques</label>' +
      '<select id="qSimuNuit">' +
        '<option value="">— non évoqué —</option>' +
        '<option value="aprevoir">À prévoir</option>' +
        '<option value="prevu">Déjà prévu</option>' +
        '<option value="fait">Fait ✅</option>' +
      '</select>' +

      
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

      '<label>🦉 Fiche véhicule — coche ce qui est acquis</label>' +
      '<div style="font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.4;">' +
        'Les manœuvres déjà validées sont cochées. Celles que tu ajoutes seront ' +
        'signées de ton émoji.</div>' +
      '<div id="qFiche" style="background:var(--navy);border:1px solid var(--line);' +
        'border-radius:10px;padding:10px 12px;max-height:240px;overflow-y:auto;' +
        'margin-bottom:14px;"></div>' +

      '<label for="qLibre">Vos autres notes</label>' +
      '<textarea id="qLibre" rows="3" maxlength="400" ' +
      'placeholder="Ex : autre notes importante" ' +
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
           '#qSimuNuit', '#qBlocAacCs', '#qFriseClassique', '#qFriseFixe', '#qCS']
        : ['#qLecon', '#qExamBlanc', '#qExamBlancN', '#qExamPermis', '#qExamDate',
           '#qExamPermisN', '#qNouvelleDate', '#qLibExamDate', '#qLibNouvelleDate',
           '#qFinirFiche', '#qSimuNuit', '#qBlocAacCs'];

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
    boite.querySelector('#qPasEcoute').checked = !!prec.pasEcoute;
    boite.querySelector('#qSimuNuit').value = prec.simuNuit || '';
    boite.querySelector('#qFormAccomp').value = prec.formAccomp || '';
    boite.querySelector('#qRvPrealable').value = prec.rvPrealable || '';
    boite.querySelector('#qLibre').value = prec.libre || '';

    /* La fiche véhicule, pré-cochée d'après les bilans précédents */
    const marquesConnues = dossier.marques || {};
    remplirFicheQuestionnaire(marquesConnues, prec.manoeuvresAjoutees || []);
    boite._marquesConnues = marquesConnues;

    /* Après le cours : on n'affiche que ce qui peut avoir changé */
    if(/après ce cours/i.test(titre || '')) allegerQuestionnaireFin(boite, prec);

    /* Boîte déduite du type de bilan, ANTS repris s'il est connu.
       Chaque champ est vérifié : certains profils de questionnaire
       n'en affichent qu'une partie, et un accès à un champ absent
       interrompait toute la suite de la construction. */
    const chBoite = boite.querySelector('#qBoite');
    if(chBoite) chBoite.value = prec.boite || (/auto/i.test(modeleCle) ? 'bea' : 'bv');
    const chAnts = boite.querySelector('#qAnts');
    if(chAnts) chAnts.value = prec.ants || '';

    /* Chaque coordonnée n'est demandée QUE si elle manque : les
       redemander alors qu'elles sont connues ne sert qu'à les
       effacer par inadvertance. */
    /* Le type de bilan : affiché seulement quand on prépare un cours */
    const selMod = boite.querySelector('#qModele');
    const blocMod = boite.querySelector('#qBlocModele');
    const enPreparation = /préparation/i.test(String(titre || ''));
    if(blocMod) blocMod.style.display = enPreparation ? 'block' : 'none';
    if(selMod && enPreparation){
      selMod.innerHTML = Object.keys(MODELES)
        .map(k => '<option value="' + k + '">' +
                  (MODELES[k].label || k) + '</option>').join('');
      selMod.value = modeleCle;
    }

    const champMess = boite.querySelector('#qMessenger');
    const champMail = boite.querySelector('#qMail');
    const champPresc = boite.querySelector('#qMailPresc');

    const manque = {
      messenger: !((ficheEleve && ficheEleve.messenger) || ''),
      mail:      !((ficheEleve && ficheEleve.email) || ''),
      presc:     !((ficheEleve && ficheEleve.mailPrescripteur) || ''),
      ants:      !((ficheEleve && ficheEleve.ants) || '') && !prec.ants
    };

    const montrer = (id, oui) => {
      const b = boite.querySelector(id);
      if(b) b.style.display = oui ? 'block' : 'none';
    };
    montrer('#qBlocMessenger', manque.messenger);
    montrer('#qBlocMail', manque.mail);
    montrer('#qBlocMailPresc', manque.presc);
    montrer('#qBlocAnts', manque.ants);
    /* L'encadré entier disparaît si tout est déjà renseigné */
    montrer('#qBlocCoord',
            manque.messenger || manque.mail || manque.presc || manque.ants);

    if(champMess) champMess.value = prec.messenger || '';
    if(champMail) champMail.value = prec.email || '';
    if(champPresc) champPresc.value = prec.mailPrescripteur || '';

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

    /* Champs conditionnels — l'examen blanc se choisit par cases */
    const casesEB = boite.querySelectorAll('input[name="qExamBlancChoix"]');
    const nEB = boite.querySelector('#qExamBlancN');
    const rangEB = boite.querySelector('#qExamBlancRang');
    const blocRang = boite.querySelector('#qBlocEbRang');
    const dateEB = boite.querySelector('#qExamBlancDate');
    const blocDate = boite.querySelector('#qBlocEbDate');
    nEB.value = prec.examBlancN || '';
    if(rangEB) rangEB.value = prec.examBlancRang || '';
    if(dateEB) dateEB.value = prec.examBlancDate || '';

    const valeurEB = () => {
      const coche = boite.querySelector('input[name="qExamBlancChoix"]:checked');
      return coche ? coche.value : '';
    };

    casesEB.forEach(x => {
      if(x.value === (prec.examBlanc || '')) x.checked = true;
      x.addEventListener('change', majEB);
    });

    function majEB(){
      const v = valeurEB();
      nEB.style.display = (v === 'reserve' || v === 'aprevoir' || v === 'passe') ? 'block' : 'none';
      nEB.placeholder = (v === 'passe')
        ? 'Leçons prévues avant le permis'
        : 'Dans combien de leçons ?';
      /* Le rang n'a de sens que si un examen blanc est en jeu */
      if(blocRang) blocRang.style.display = v ? 'block' : 'none';
      /* La date : seulement s'il est réservé ou déjà passé */
      if(blocDate) blocDate.style.display = (v === 'reserve' || v === 'passe') ? 'block' : 'none';
    }

    /* Un objet qui se comporte comme l'ancien menu, pour le reste du code */
    const selEB = { get value(){ return valeurEB(); },
                    dispatchEvent: majEB };

    /* Affiche d'emblée les champs conditionnels déjà renseignés.
       Placé ICI et non plus haut : un await sépare les deux, et le
       minuteur se déclenchait avant que majEB n'existe, ce qui
       interrompait toute la construction de la fenêtre. */
    setTimeout(() => {
      try{
        majEB();
        if(selEP) selEP.dispatchEvent(new Event('change'));
      }catch(e){ console.warn('Champs conditionnels :', e); }
    }, 0);

    const selEP = boite.querySelector('#qExamPermis');
    const passEP = boite.querySelector('#qExamPassage');
    /* Renseigné ici, où le champ existe : plus haut, il n'était pas
       encore déclaré et l'accès interrompait toute la construction. */
    if(passEP) passEP.value = prec.examPassage || '';
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
      /* Le rang du passage n'a de sens que pour un examen à venir */
      const bp = boite.querySelector('#qBlocPassage');
      if(bp) bp.style.display = (v === 'prevu' || v === 'aprevoir') ? 'block' : 'none';
      nvDate.style.display = (v === 'annule') ? 'block' : 'none';
      libNv.style.display = (v === 'annule') ? 'block' : 'none';
    });

    function fermer(reponses){
      questionnaireOuvert = false;
      document.body.removeChild(fond);
      /* L'ANTS et la frise redescendent sur la fiche de l'élève : ce que
         le moniteur corrige ici doit valoir pour les prochains cours,
         sans qu'on ait à ressaisir la même chose au bureau. */
      if(reponses) majFicheDepuisQuestionnaire(eleve, reponses, ficheEleve);

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
        examBlancRang: rangEB ? rangEB.value : '',
        examBlancDate: dateEB ? dateEB.value : '',
        examPermis: selEP.value,
        examDate: dEP.value,
        pasEcoute: boite.querySelector('#qPasEcoute').checked,
        simuNuit: boite.querySelector('#qSimuNuit').value,
        ebPasse: selEB2 ? selEB2.value : '',
        ebLecons: nEB2 ? nEB2.value.trim() : '',
        examPermisN: nEP.value.trim(),
        examPassage: passEP ? passEP.value : '',
        nouvelleDate: nvDate.value,
        formAccomp: boite.querySelector('#qFormAccomp').value,
        rvPrealable: boite.querySelector('#qRvPrealable').value,
        boite: boite.querySelector('#qBoite').value,
        handicap: boite.querySelector('#qHandicap').checked ? 'oui' : '',
        amenagements: Array.prototype.slice
          .call(boite.querySelectorAll('.qAmg:checked')).map(x => x.value),
        ants: chAnts ? chAnts.value : '',
        /* Le type de bilan choisi, quand on prépare un cours */
        modele: (selMod && enPreparation) ? selMod.value : '',
        messenger: champMess ? champMess.value.trim() : '',
        email: champMail ? champMail.value.trim() : '',
        mailPrescripteur: champPresc ? champPresc.value.trim() : '',
        libre: boite.querySelector('#qLibre').value.trim(),
        /* Les manœuvres cochées en plus, à signer de l'émoji du moniteur */
        manoeuvresAjoutees: manoeuvresAjouteesQuestionnaire(boite._marquesConnues || {}),
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

  /* Le rang de l'examen blanc : « 2e examen blanc » plutôt que
     « examen blanc », pour savoir combien l'élève en a déjà passé. */
  const rang = String(q.examBlancRang || '').trim();
  const eb = rang
    ? (rang === '1' ? '1er examen blanc' : rang + 'e examen blanc')
    : 'Examen blanc';

  /* Le rang du passage au permis : « 2e passage » plutôt que rien.
     C'est ce qui dit s'il s'agit d'un repassage. */
  const rp = String(q.examPassage || '').trim();
  const passage = rp
    ? (rp === '1' ? ' — 1er passage'
       : rp === '5' ? ' — 5e passage ou plus'
       : ' — ' + rp + 'e passage')
    : '';
  const ebMin = rang
    ? (rang === '1' ? '1er examen blanc' : rang + 'e examen blanc')
    : 'examen blanc';

  /* La date saisie, en toutes lettres : « le mardi 15 septembre 2026 » */
  const jourEB = q.examBlancDate
    ? ' le ' + (dateEnToutesLettres(q.examBlancDate) || q.examBlancDate)
    : '';

  /* L'examen blanc vient d'avoir lieu : sa conclusion prime */
  if(q.ebPasse){
    const jour = dateEnToutesLettres($('lessonDate').value || todayLocal());
    if(q.ebPasse === '3h'){
      bouts.push(eb + ' passé le ' + jour + ' — plus que les 3h avant examen');
    }else if(q.ebPasse === 'lecons'){
      const n = q.ebLecons;
      bouts.push(eb + ' passé le ' + jour + ' — encore ' + (n || '❓') +
                 ' leçon' + (parseInt(n, 10) > 1 ? 's' : '') + ' avant examen');
    }else{
      bouts.push(eb + ' passé le ' + jour + ' — pas le niveau');
    }
  }else if(q.examBlanc === 'passe'){
    bouts.push(n ? eb + ' passé' + jourEB + ' — ' + n + ' leçon' + pl(n) + ' prévue' + pl(n) +
                   ' avant le permis (+ 3h avant examen)'
                 : eb + ' passé' + (jourEB || ' — déjà fait'));
  }else if(q.examBlanc === 'reserve'){
    bouts.push(eb + ' réservé' + jourEB +
               (n ? ' — dans ' + n + ' leçon' + pl(n) : ''));
  }else if(q.examBlanc === 'aprevoir'){
    bouts.push(n ? eb + ' à prévoir dans ' + n + ' leçon' + pl(n)
                 : eb + ' à prévoir');
  }else if(q.examBlanc === 'impossible'){
    bouts.push("Ne pas prévoir d'" + ebMin + ' pour le moment');
  }

  if(q.examPermis === 'aprevoir'){
    bouts.push("Date d'examen à prévoir" + passage);
  }else if(q.examPermis === 'prevu' && q.examDate){
    const np = q.examPermisN;
    let phrase = 'Examen prévu le ' + dateEnToutesLettres(q.examDate) + passage;
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

  /* L'écoute pédagogique : le bureau doit le savoir pour ne pas
     la planifier inutilement le jour du permis. */
  if(q.pasEcoute) bouts.push("Pas d'écoutes pédagogiques");
  if(q.simuNuit === 'aprevoir') bouts.push('Simulateur nuit et risques à prévoir');
  else if(q.simuNuit === 'prevu') bouts.push('Simulateur nuit et risques déjà prévu');
  else if(q.simuNuit === 'fait') bouts.push('Simulateur nuit et risques fait ✅');


  if(q.formAccomp === 'aprevoir') bouts.push('Formation accompagnateur à prévoir');
  else if(q.formAccomp === 'prevue') bouts.push('Formation accompagnateur déjà prévue');
  else if(q.formAccomp === 'faite') bouts.push('Formation accompagnateur faite');

  if(q.rvPrealable === 'aprevoir') bouts.push('Rendez-vous préalable à prévoir');
  else if(q.rvPrealable === 'prevu') bouts.push('Rendez-vous préalable déjà prévu');
  else if(q.rvPrealable === 'fait') bouts.push('Rendez-vous préalable fait');
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
            afficherSaisieDuJour(rep);
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
  minuteurHistorique = setTimeout(() => {
    chargerHistoriqueEleve();
    /* Et ce qui a été préparé pour ce cours, s'il y a une préparation */
    if(typeof afficherPreparationEleve === 'function') afficherPreparationEleve();
  }, 700);
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
      /* Texte complet : la fiche véhicule s'y trouve */
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nom })
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
      ' · dernier le ' + (dateEnToutesLettres(dateFrVersIso(dernier.date)) || dernier.date || '?') +
      (dernier.moniteur ? ' avec ' + dernier.moniteur : '');
    carte.appendChild(titre);

    /* La note du moniteur précédent : frise, examen blanc, date
       d'examen. C'est ce que le moniteur doit voir en premier. */
    if(note){
      const n = document.createElement('div');
      n.style.cssText = 'font-size:15px;font-weight:600;color:var(--accent-text);' +
        'line-height:1.45;white-space:pre-wrap;margin-bottom:10px;';
      n.textContent = '📌 ' + note;
      carte.appendChild(n);
    }else{
      const n = document.createElement('div');
      n.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;';
      n.textContent = 'Pas de note laissée par le moniteur précédent.';
      carte.appendChild(n);
    }

    /* Puis la fiche véhicule, avec les émojis des moniteurs */
    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
    carte.appendChild(sep);
    carte.appendChild(blocFicheVehiculeEleve(res));

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

/* ============================================================
   FICHE VÉHICULE DE L'ÉLÈVE
   Ce que le moniteur a besoin de savoir avant de partir : quelles
   manœuvres sont validées, par qui, et lesquelles restent à faire.
   ============================================================ */
function blocFicheVehiculeEleve(bilans, toutAfficher){
  const d = document.createElement('div');

  /* On part du plus récent : ses marques sont les plus complètes */
  let marques = {};
  (bilans || []).slice().reverse().forEach(item => {
    const m = (typeof marquesDejaPosees === 'function')
      ? marquesDejaPosees(item.bilan) : {};
    Object.keys(m).forEach(k => { marques[k] = m[k]; });
  });

  const liste = (typeof BLOC !== 'undefined' && BLOC.ficheListeConduite)
    ? BLOC.ficheListeConduite : [];

  const faites = [];
  const restantes = [];
  liste.forEach(libelle => {
    const cle = normaliserMot(libelle);
    if(marques[cle]) faites.push({ nom: libelle, marque: marques[cle] });
    else restantes.push(libelle);
  });

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:6px;';
  t.textContent = '🦉 Fiche véhicule — ' + faites.length + ' sur ' + liste.length;
  d.appendChild(t);

  if(!faites.length){
    const v = document.createElement('div');
    v.style.cssText = 'font-size:13px;color:var(--muted);';
    v.textContent = 'Aucune manœuvre validée pour le moment.';
    d.appendChild(v);
    return d;
  }

  const z = document.createElement('div');
  z.style.cssText = 'font-size:13px;line-height:1.7;';
  faites.forEach(x => {
    const l = document.createElement('div');
    l.innerHTML = '<span style="color:var(--cream);">' +
      x.nom.replace(/</g, '&lt;') + '</span> ' +
      '<span style="letter-spacing:1px;">' + x.marque + '</span>';
    z.appendChild(l);
  });
  d.appendChild(z);

  /* Ce qui reste : déplié quand on prépare un cours, replié sinon */
  if(restantes.length){
    if(toutAfficher){
      const t2 = document.createElement('div');
      t2.style.cssText = 'font-size:12px;color:var(--muted);margin:8px 0 3px;font-weight:700;';
      t2.textContent = '❓ Reste à travailler — ' + restantes.length;
      d.appendChild(t2);

      const r = document.createElement('div');
      r.style.cssText = 'font-size:13px;color:var(--muted);line-height:1.7;';
      restantes.forEach(x => {
        const l = document.createElement('div');
        l.textContent = '· ' + x;
        r.appendChild(l);
      });
      d.appendChild(r);
    }else{
      const det = document.createElement('details');
      det.style.marginTop = '8px';
      det.innerHTML = '<summary style="cursor:pointer;font-size:12px;color:var(--muted);">' +
        '❓ ' + restantes.length + ' manœuvre(s) restante(s)</summary>';
      const r = document.createElement('div');
      r.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.7;margin-top:4px;';
      r.textContent = restantes.join(' · ');
      det.appendChild(r);
      d.appendChild(det);
    }
  }

  return d;
}

/* ============================================================
   FICHE VÉHICULE DANS LE QUESTIONNAIRE
   Le moniteur complète ce qui a été acquis pendant son cours.
   Ce qu'il ajoute porte son émoji, comme dans le bilan.
   ============================================================ */
function remplirFicheQuestionnaire(marquesAvant, dejaCochees){
  const zone = $('qFiche');
  if(!zone) return;

  const marques = marquesAvant || {};
  zone.innerHTML = '';

  /* Tout cocher d'un coup : quand un moniteur annonce que la fiche
     est terminée, cocher dix-neuf cases une par une est absurde. */
  const tout = document.createElement('label');
  tout.style.cssText = 'display:flex;align-items:center;gap:9px;padding:4px 0 8px;' +
    'font-size:14px;text-transform:none;margin:0 0 6px;font-weight:700;' +
    'color:var(--accent-text);border-bottom:1px solid var(--line);';
  const cbTout = document.createElement('input');
  cbTout.type = 'checkbox';
  cbTout.style.cssText = 'width:17px;height:17px;flex-shrink:0;';
  cbTout.addEventListener('change', () => {
    zone.querySelectorAll('.qManoeuvre').forEach(x => { x.checked = cbTout.checked; });
  });
  tout.appendChild(cbTout);
  const tt = document.createElement('span');
  tt.textContent = 'Tout cocher';
  tout.appendChild(tt);
  zone.appendChild(tout);

  /* Ce que le moniteur avait coché à la préparation, ou plus tôt
     dans ce cours : sans ça, rouvrir le questionnaire effaçait tout
     et le travail du collègue était perdu. */
  const cochees = (dejaCochees || []).map(x => normaliserMot(x));

  (BLOC.ficheListeConduite || []).forEach(libelle => {
    const cle = normaliserMot(libelle);
    const deja = marques[cle] || '';
    const cochee = cochees.indexOf(cle) !== -1;

    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:9px;padding:4px 0;' +
      'font-size:14px;text-transform:none;margin:0;font-weight:400;' +
      'color:' + (deja ? 'var(--muted)' : 'var(--cream)') + ';';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'qManoeuvre';
    cb.value = libelle;
    cb.checked = !!deja || cochee;
    cb.style.cssText = 'width:17px;height:17px;flex-shrink:0;';
    l.appendChild(cb);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = libelle;
    l.appendChild(t);

    if(deja){
      const m = document.createElement('span');
      m.style.cssText = 'flex-shrink:0;letter-spacing:1px;';
      m.textContent = deja;
      l.appendChild(m);
    }

    zone.appendChild(l);
  });
}

/* Ce que le moniteur vient de cocher en plus */
function manoeuvresAjouteesQuestionnaire(marquesAvant){
  const marques = marquesAvant || {};
  const ajoutees = [];
  document.querySelectorAll('.qManoeuvre').forEach(cb => {
    if(!cb.checked) return;
    if(marques[normaliserMot(cb.value)]) return;   /* déjà validée */
    ajoutees.push(cb.value);
  });
  return ajoutees;
}

/* Le dossier de l'élève sous le champ de préparation : même bloc
   que pour un cours, pour préparer en connaissance de cause. */
async function chargerHistoriquePrep(){
  const zone = $('prepHistorique');
  const nom = $('prepEleve') ? $('prepEleve').value.trim() : '';
  if(!zone) return;

  if(nom.length < 3){ zone.style.display = 'none'; zone.innerHTML = ''; return; }

  zone.style.display = 'block';
  zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">Lecture du dossier…</div>';

  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nom })
    });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json().catch(() => ({}));
    const res = (data && data.resultats) || [];

    zone.innerHTML = '';
    if(!res.length){
      zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">' +
        'Aucun cours précédent pour cet élève.</div>';
      return;
    }

    const dernier = res[0];
    const carte = document.createElement('div');
    carte.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:12px 14px;';

    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
    t.textContent = res.length + ' cours précédent' + (res.length > 1 ? 's' : '') +
      ' · dernier le ' + (dateEnToutesLettres(dateFrVersIso(dernier.date)) || dernier.date || '?') +
      (dernier.moniteur ? ' avec ' + dernier.moniteur : '');
    carte.appendChild(t);

    const note = (dernier.note || '').trim();
    const n = document.createElement('div');
    if(note){
      n.style.cssText = 'font-size:15px;font-weight:600;color:var(--accent-text);' +
        'line-height:1.45;white-space:pre-wrap;margin-bottom:10px;';
      n.textContent = '📌 ' + note;
    }else{
      n.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;';
      n.textContent = 'Pas de note laissée par le moniteur précédent.';
    }
    carte.appendChild(n);

    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
    carte.appendChild(sep);
    /* Déplié : on prépare un cours, on veut voir ce qui reste */
    carte.appendChild(blocFicheVehiculeEleve(res, true));

    zone.appendChild(carte);
  }catch(e){
    zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">' +
      'Dossier indisponible : ' + e.message.replace(/</g, '&lt;') + '</div>';
  }
}

/* ============================================================
   ALLÈGEMENT DU QUESTIONNAIRE DE FIN DE COURS
   En début de cours on renseigne le dossier ; en fin de cours on
   ne fait que corriger ce qui a bougé. Les champs administratifs
   n'ont plus rien à y faire : le moniteur est pressé, l'élève
   attend, et chaque champ inutile est une chance d'erreur.
   ============================================================ */
function allegerQuestionnaireFin(boite, prec){
  if(!boite) return;

  /* Masque un champ et l'étiquette qui le précède */
  const cacher = sel => {
    const e = boite.querySelector(sel);
    if(!e) return;
    /* Une case à cocher vit dans son étiquette : on masque celle-ci */
    const cible = (e.type === 'checkbox' && e.closest('label')) ? e.closest('label') : e;
    const avant = cible.previousElementSibling;
    if(avant && avant.tagName === 'LABEL' && avant.getAttribute('for')) avant.style.display = 'none';
    cible.style.display = 'none';
  };

  /* Conduite aménagée : se décide à l'inscription, jamais après un cours */
  cacher('#qHandicap');
  const zh = boite.querySelector('#qZoneHandicap');
  if(zh) zh.style.display = 'none';

  /* L'ANTS est traité avec les autres coordonnées manquantes :
     l'ancienne règle isolée masquait le champ sans son bloc. */

  /* Frise et numéro de leçon : renseignés au départ */
  ['#qFriseClassique', '#qFriseFixe', '#qBlocAacCs'].forEach(s => {
    const e = boite.querySelector(s);
    if(!e) return;
    const avant = e.previousElementSibling;
    if(avant && avant.tagName === 'LABEL') avant.style.display = 'none';
    e.style.display = 'none';
    const apres = e.nextElementSibling;
    if(apres && apres.style && apres.style.fontSize === '12px') apres.style.display = 'none';
  });
  cacher('#qLecon');

  /* L'écoute pédagogique se décide en préparant la journée de permis */
  cacher('#qPasEcoute');
}

/* Ce que le moniteur corrige dans le questionnaire redescend sur la
   fiche de l'élève. Sans ça, le bureau et les moniteurs entretiennent
   deux vérités différentes sur le même élève. */
async function majFicheDepuisQuestionnaire(eleve, reponses, ficheAvant){
  if(!eleve || typeof appelPrep !== 'function') return;

  const avant = ficheAvant || {};
  const maj = {};

  if(reponses.ants && reponses.ants !== (avant.ants || '')) maj.ants = reponses.ants;
  if(reponses.messenger && reponses.messenger !== (avant.messenger || '')){
    maj.messenger = reponses.messenger;
  }
  if(reponses.email && reponses.email !== (avant.email || '')){
    maj.email = reponses.email;
  }
  if(reponses.mailPrescripteur &&
     reponses.mailPrescripteur !== (avant.mailPrescripteur || '')){
    maj.mailPrescripteur = reponses.mailPrescripteur;
  }
  if(reponses.frise && reponses.frise !== (avant.frise || '')) maj.frise = reponses.frise;

  if(!Object.keys(maj).length) return;

  try{
    await appelPrep(Object.assign({ action: 'ficheSet', eleve: eleve }, maj));
    /* La fiche en mémoire suit, sinon l'écran afficherait l'ancienne */
    const f = (typeof ficheDe === 'function') ? ficheDe(eleve) : null;
    if(f) Object.assign(f, maj);
  }catch(e){
    console.warn('Fiche non mise à jour :', e);
  }
}

/* ============================================================
   CE QUE LE MONITEUR VIENT DE RENSEIGNER

   Un cours non préparé n'a pas de cadre sous le nom de l'élève.
   Après le questionnaire, on y affiche ses réponses et la fiche
   véhicule détaillée : il voit ce qui reste à faire avant de
   démarrer, sans rouvrir quoi que ce soit.
   ============================================================ */
async function afficherSaisieDuJour(rep, cible){
  /* Le bilan manuel s'ouvre dans un autre écran : il a son propre
     emplacement, sinon le cadre resterait sur l'écran masqué. */
  const zone = $(cible || 'preparationEleve');
  if(!zone || !rep) return;

  const eleve = $('studentName') ? $('studentName').value.trim() : '';
  if(!eleve) return;

  zone.innerHTML = '';
  const carte = document.createElement('div');
  carte.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:12px 14px;background:rgba(182,255,14,.08);';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
  t.textContent = '📝 Ce que tu viens de renseigner';
  carte.appendChild(t);

  /* La consigne d'écoute, mise en avant comme dans la préparation */
  if(rep.pasEcoute){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:14px;font-weight:700;color:var(--warn-text);margin-bottom:6px;';
    a.textContent = "🚫 Pas d'écoutes pédagogiques";
    carte.appendChild(a);
  }

  const note = noteDepuisQuestionnaire(rep);
  const n = document.createElement('div');
  if(note){
    n.style.cssText = 'font-size:15px;font-weight:600;color:var(--accent-text);' +
      'line-height:1.45;white-space:pre-wrap;';
    n.textContent = note;
  }else{
    n.style.cssText = 'font-size:13px;color:var(--muted);';
    n.textContent = 'Aucune information particulière.';
  }
  carte.appendChild(n);

  /* La fiche véhicule : ce qui est acquis, ce qui reste */
  const cochees = rep.manoeuvresAjoutees || [];
  let marques = {};
  try{
    const d = await chargerDossierEleve(eleve);
    marques = (d && d.marques) || {};
  }catch(e){ /* hors ligne : sans les émojis */ }

  const faites = (BLOC.ficheListeConduite || []).filter(
    x => cochees.indexOf(x) !== -1 || marques[normaliserMot(x)]);
  const restantes = (BLOC.ficheListeConduite || []).filter(
    x => faites.indexOf(x) === -1);

  const sep = document.createElement('div');
  sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
  carte.appendChild(sep);

  const t2 = document.createElement('div');
  t2.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
  t2.textContent = '🦉 Fiche véhicule — ' + faites.length + ' sur ' +
                   (BLOC.ficheListeConduite || []).length;
  carte.appendChild(t2);

  if(faites.length){
    const l = document.createElement('div');
    l.style.cssText = 'font-size:13px;line-height:1.7;';
    faites.forEach(x => {
      const m = marques[normaliserMot(x)] || '';
      const li = document.createElement('div');
      li.innerHTML = '· ' + x.replace(/</g, '&lt;') +
        (m ? ' <span style="letter-spacing:1px;">' + m + '</span>' : ' ✅');
      l.appendChild(li);
    });
    carte.appendChild(l);
  }

  if(restantes.length){
    const t3 = document.createElement('div');
    t3.style.cssText = 'font-size:13px;font-weight:700;color:var(--warn-text);margin:10px 0 4px;';
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

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-questionnaire.js'] = true;
