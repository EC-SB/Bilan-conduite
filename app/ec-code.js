/* Déployé le 13/11/2026 à 14:03 — v1426 */
/* ============================================================
   ec-code.js
   Le suivi des séances de code en salle.

   Les élèves répondent aux formulaires en scannant le QR code de
   la salle — cela ne change pas. Ce module se contente de lire
   les résultats et de les montrer d'un coup d'œil.

   Le barème varie d'une séance à l'autre. Ce qui compte est le
   nombre de FAUTES : 0 à 3 vert, 4 à 6 orange, au-delà rouge.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let resultatsEtg = [];
let baremesEtg = {};
/* 🎥 v1356 — les liens des Google Forms (lus dans le classeur par
   Apps Script) et les présences en visio (D1), pour la grille */
let formulairesEtg = {};
let presencesVisioEtg = {};
let presencesVisioListe = [];
let filtreEleveEtg = '';

/* Ce qu'on montre au chargement : ceux venus dans le dernier
   mois. La liste complète tiendrait sur plusieurs écrans. */
let periodeEtg = 'mois';

const NB_SEANCES = 12;

/* Les couleurs, les mêmes que sur le logiciel de l'auto-école */
const COULEURS_ETG = {
  vert:   { fond:'rgba(122,154,62,.20)',  texte:'#8FBF3F' },
  orange: { fond:'rgba(201,162,39,.20)',  texte:'var(--accent-text)' },
  rouge:  { fond:'rgba(255,92,51,.18)',   texte:'var(--red)' }
};


async function afficherCodeSalle(){
  const zone = $('codeSousZone') || $('codeZone');
  if(!zone) return;

  zone.innerHTML = htmlAttente('Lecture des séances de code…');
  try{
    const [d, pv, ra] = await Promise.all([
      appelPrep({ action: 'seancesEtg' }),
      appelPrep({ action: 'visioPresences' }).catch(() => null),
      /* 📝 v1426 — les séances faites dans l'appli (salle et visio) */
      appelPrep({ action: 'codeResultats' }).catch(() => null)
    ]);
    if(d && d.status === 'error') throw new Error(d.message || 'Lecture impossible');
    resultatsEtg = ((d && d.resultats) || []).concat(lignesAppEtg((ra && ra.resultats) || []));
    baremesEtg = (d && d.baremes) || {};
    formulairesEtg = (d && d.formulaires) || {};
    presencesVisioEtg = {};
    presencesVisioListe = (pv && pv.presences) || [];
    presencesVisioListe.forEach(p => {
      const k = motsEleveEtg(p.eleve) + '#' + p.numero;
      if(!presencesVisioEtg[k] || p.jour > presencesVisioEtg[k]) presencesVisioEtg[k] = p.jour || '?';
    });
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' +
      String(e.message || e).replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';

  /* 🎥 v1356 — le cours en visio : sa carte sous « 🎯 Quelle séance
     lancer ? » (en tête quand il n'y a encore aucun résultat) */
  const visio = (typeof carteVisioCode === 'function' && aDroit('visio_code')) ? carteVisioCode() : null;

  if(!resultatsEtg.length && !presencesVisioListe.length){
    if(visio) zone.appendChild(visio);
    zone.appendChild(barreCorrigesEtg());
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucune séance enregistrée.<br>' +
      '<span style="font-size:12px;">Les résultats arrivent depuis les ' +
      'formulaires scannés en salle.</span>';
    zone.appendChild(v);
    return;
  }

  /* Quelle séance lancer : celle que le moins d'élèves ont faite */
  zone.appendChild(blocSeanceALancer());
  if(visio) zone.appendChild(visio);

  /* 📝 v1426 — les corrigés des séances faites dans l'appli */
  zone.appendChild(barreCorrigesEtg());

  /* La période : le dernier mois d'abord, tout si on le demande */
  const bp = document.createElement('div');
  bp.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;';

  [['mois', 'Dernier mois'], ['trimestre', '3 mois'], ['tout', 'Tous']]
    .forEach(([cle, nom]) => {
      const b = document.createElement('button');
      b.className = (periodeEtg === cle) ? 'btn btn-primary' : 'btn btn-secondary';
      b.style.cssText = 'flex:1;padding:9px;font-size:12px;margin:0;';
      b.textContent = nom;
      b.addEventListener('click', () => {
        periodeEtg = cle;
        afficherCodeSalle();
      });
      bp.appendChild(b);
    });
  zone.appendChild(bp);

  const ch = document.createElement('input');
  ch.type = 'search';
  ch.id = 'filtreEleveEtg';
  ch.placeholder = '🔍 Nom ou prénom…';
  ch.value = filtreEleveEtg;
  ch.style.cssText = 'margin-bottom:12px;font-size:14px;';
  ch.addEventListener('input', () => {
    filtreEleveEtg = ch.value;
    dessinerGrilleEtg();
    const n = $('filtreEleveEtg');
    if(n && n !== ch) n.focus();
  });
  zone.appendChild(ch);

  const zg = document.createElement('div');
  zg.id = 'grilleEtg';
  zone.appendChild(zg);

  dessinerGrilleEtg();
}


/* 🎥 Un élève, quel que soit l'ordre de ses mots (« Léa Martin » et
   « MARTIN Léa » : le formulaire et la fiche) */
function motsEleveEtg(n){
  return normaliserMot(String(n || '')).split(/\s+/).filter(Boolean).sort().join(' ');
}
function presenceVisioEtg(nom, n){
  return presencesVisioEtg[motsEleveEtg(nom) + '#' + n] || '';
}

/* La date à partir de laquelle on regarde */
function debutPeriodeEtg(){
  if(periodeEtg === 'tout') return '';
  const d = new Date();
  d.setMonth(d.getMonth() - (periodeEtg === 'trimestre' ? 3 : 1));
  return d.getFullYear() + '-' +
         String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

/* Les élèves, avec ce qu'ils ont fait.

   La période porte sur l'élève, pas sur la séance : quelqu'un venu
   la semaine dernière montre tout son parcours, sinon la grille
   n'aurait plus de sens. */
function elevesEtg(){
  const depuis = debutPeriodeEtg();

  /* Qui est venu dans la période */
  const vus = {};
  if(depuis){
    resultatsEtg.forEach(r => {
      if(r.date && r.date >= depuis) vus[motsEleveEtg(r.eleve || '')] = true;
    });
  }

  const par = {};

  resultatsEtg.forEach(r => {
    /* 📝 v1426 — l'élève par ses mots : « Léa Martin » (le formulaire)
       et « MARTIN Léa » (la fiche, l'appli) sont la même ligne */
    const cle = motsEleveEtg(r.eleve || '');
    if(!cle) return;
    if(depuis && !vus[cle]) return;

    /* Le nom de la fiche (celui de l'appli) l'emporte sur celui tapé */
    if(!par[cle]) par[cle] = { nom: r.eleve, seances: {} };
    else if(r.app) par[cle].nom = r.eleve;

    /* 📝 v1426 — une séance repassée : c'est la PLUS RÉCENTE qui compte
       (David : « on remet à 0 »). Avant : le meilleur résultat. Le même
       jour : la saisie du bureau, puis l'appli, puis le formulaire. */
    const avant = par[cle].seances[r.seance];
    const rang = x => x.corrige ? 2 : x.app ? 1 : 0;
    if(!avant || String(r.date || '') > String(avant.date || '') ||
       (String(r.date || '') === String(avant.date || '') && rang(r) >= rang(avant))) par[cle].seances[r.seance] = r;
  });

  /* 🎥 v1356 — venu en visio sans avoir encore rendu de questionnaire :
     il a sa ligne quand même (sinon sa présence ne se verrait nulle part) */
  const mots = {};
  Object.keys(par).forEach(k => { mots[k] = true; });
  presencesVisioListe.forEach(p => {
    if(depuis && p.jour && p.jour < depuis) return;
    const m = motsEleveEtg(p.eleve);
    if(!m || mots[m]) return;
    mots[m] = true;
    par['visio:' + m] = { nom: p.eleve, seances: {} };
  });

  return Object.keys(par)
    .map(k => par[k])
    .sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
}


/* Quelle séance mettre en route.

   Deux questions différentes : celles que personne n'a faites du
   tout, et celles qu'un groupe précis n'a pas faites. */
function blocSeanceALancer(){
  const eleves = elevesEtg();
  const comptes = [];

  for(let n = 1; n <= NB_SEANCES; n++){
    const faite = eleves.filter(e => e.seances[n]).length;
    comptes.push({ seance: n, faite: faite, reste: eleves.length - faite });
  }

  /* Celles que personne n'a faites d'abord, puis les moins vues */
  const jamais = comptes.filter(x => x.faite === 0).map(x => x.seance);
  const triees = comptes.slice().sort((a, b) => a.faite - b.faite);

  const d = document.createElement('details');
  d.open = true;
  d.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:10px 12px;margin-bottom:12px;';
  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;' +
    'color:var(--accent-text);">🎯 Quelle séance lancer ?</summary>';

  const z = document.createElement('div');
  z.style.cssText = 'margin-top:10px;font-size:13px;line-height:1.6;';

  if(jamais.length){
    z.innerHTML = '<strong>Personne n\'a encore fait :</strong><br>' +
      jamais.map(n => 'séance ' + n).join(' · ');
  }else{
    const t = triees.slice(0, 3);
    z.innerHTML = '<strong>Les moins vues :</strong><br>' +
      t.map(x => 'séance ' + x.seance + ' — ' + x.reste +
                 ' élève(s) ne l\'ont pas faite').join('<br>');
  }

  z.appendChild(document.createElement('br'));

  /* Chercher pour un groupe précis : on tape plusieurs noms, on
     obtient les séances qu'aucun d'eux n'a faites. */
  const zg = document.createElement('div');
  zg.style.cssText = 'border-top:1px solid var(--line);margin-top:12px;' +
    'padding-top:11px;';
  zg.innerHTML = '<div style="font-size:12px;color:var(--muted);' +
    'margin-bottom:8px;line-height:1.5;">Pour un groupe précis : ' +
    'tape leurs noms séparés par des virgules.</div>';

  const chG = document.createElement('input');
  chG.type = 'text';
  chG.placeholder = 'Ex : Claustre, Guillebon, Martin';
  chG.style.cssText = 'margin-bottom:8px;font-size:13px;';
  zg.appendChild(chG);

  const zRep = document.createElement('div');
  zRep.style.cssText = 'font-size:13px;line-height:1.6;';
  zg.appendChild(zRep);

  const chercherGroupe = () => {
    const noms = chG.value.split(',')
      .map(x => normaliserMot(x.trim()))
      .filter(Boolean);

    if(!noms.length){ zRep.innerHTML = ''; return; }

    /* Chaque nom saisi désigne un ou plusieurs élèves */
    const groupe = [];
    const introuvables = [];

    noms.forEach(n => {
      const trouves = eleves.filter(e => normaliserMot(e.nom).indexOf(n) !== -1);
      if(!trouves.length){ introuvables.push(n); return; }
      trouves.forEach(t => {
        if(groupe.indexOf(t) === -1) groupe.push(t);
      });
    });

    if(!groupe.length){
      zRep.innerHTML = '<span style="color:var(--warn-text);">' +
        'Personne trouvé. Élargis la période si besoin.</span>';
      return;
    }

    /* Les séances qu'aucun d'eux n'a faites */
    const libres = [];
    for(let n = 1; n <= NB_SEANCES; n++){
      if(!groupe.some(e => e.seances[n])) libres.push(n);
    }

    zRep.innerHTML =
      '<div style="font-size:11px;color:var(--muted);margin-bottom:5px;">' +
        groupe.length + ' élève(s) : ' +
        groupe.map(e => e.nom.replace(/</g, '&lt;')).join(' · ') +
        (introuvables.length
          ? '<br>⚠️ pas trouvé : ' + introuvables.join(', ')
          : '') +
      '</div>' +
      (libres.length
        ? '<strong style="color:var(--accent-text);">Aucun n\'a fait :</strong> ' +
          libres.map(n => 'séance ' + n).join(' · ')
        : '<span style="color:var(--muted);">Ils ont tous fait au moins ' +
          'une fois chacune des douze séances.</span>');
  };

  chG.addEventListener('input', chercherGroupe);
  z.appendChild(zg);

  d.appendChild(z);
  return d;
}


function dessinerGrilleEtg(){
  const zone = $('grilleEtg');
  if(!zone) return;
  zone.innerHTML = '';

  /* Chaque mot doit se retrouver : « martin lea » trouve Léa
     Martin quel que soit l'ordre, et distingue les homonymes. */
  const mots = normaliserMot(String(filtreEleveEtg || '').trim())
    .split(/\s+/).filter(Boolean);

  const eleves = elevesEtg().filter(e => {
    if(!mots.length) return true;
    const n = normaliserMot(e.nom);
    return mots.every(m => n.indexOf(m) !== -1);
  });

  if(!eleves.length){
    zone.innerHTML = '<div class="empty">Aucun élève ne correspond.' +
      (periodeEtg !== 'tout'
        ? '<br><span style="font-size:12px;">Essaie « Tous » pour ' +
          'chercher au-delà de la période.</span>'
        : '') + '</div>';
    return;
  }

  const compte = document.createElement('div');
  compte.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;';
  compte.textContent = eleves.length + ' élève(s)' +
    (periodeEtg === 'mois' ? ' venus dans le dernier mois'
     : periodeEtg === 'trimestre' ? ' venus dans les trois derniers mois' : '');
  zone.appendChild(compte);

  const enveloppe = document.createElement('div');
  enveloppe.style.cssText = 'overflow-x:auto;';

  const t = document.createElement('table');
  t.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;' +
    'min-width:' + (150 + NB_SEANCES * 42 + 60) + 'px;';

  /* Les en-têtes : le numéro de séance et son barème */
  const th = document.createElement('thead');
  const l1 = document.createElement('tr');
  l1.innerHTML = '<th style="text-align:left;padding:6px 8px;font-size:11px;' +
    'color:var(--muted);">Élève</th>';

  for(let n = 1; n <= NB_SEANCES; n++){
    l1.innerHTML += '<th style="padding:5px 3px;font-size:11px;' +
      'color:var(--muted);border-left:1px solid var(--line);white-space:nowrap;">' +
      n + '<div style="font-size:9px;opacity:.7;">/' +
      (baremesEtg[n] || 10) + '</div></th>';
  }
  l1.innerHTML += '<th style="padding:5px 6px;font-size:11px;' +
    'color:var(--accent-text);border-left:2px solid var(--line);">Faites</th>';
  th.appendChild(l1);
  t.appendChild(th);

  const tb = document.createElement('tbody');

  eleves.forEach(e => {
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-top:1px solid rgba(255,255,255,.06);';

    const td0 = document.createElement('td');
    td0.style.cssText = 'padding:7px 8px;font-weight:700;white-space:nowrap;';
    td0.textContent = e.nom;
    tr.appendChild(td0);

    let faites = 0;

    for(let n = 1; n <= NB_SEANCES; n++){
      const r = e.seances[n];
      const td = document.createElement('td');
      const enVisio = presenceVisioEtg(e.nom, n);
      const jourVisio = enVisio && enVisio !== '?' ? ' le ' + enVisio.split('-').reverse().join('/') : '';

      if(!r){
        td.style.cssText = 'padding:5px 3px;text-align:center;' +
          'border-left:1px solid var(--line);color:var(--muted);cursor:pointer;';
        td.textContent = enVisio ? '🎥' : '·';
        td.title = 'Séance ' + n + (enVisio ? ' — suivie en visio' + jourVisio + ', questionnaire pas encore reçu.'
                                            : ' — pas encore faite.') + ' Appuie pour saisir.';
        td.addEventListener('click', () => ouvrirSaisieEtg(e.nom, n, null));
      }else{
        faites++;
        const c = COULEURS_ETG[r.couleur] || {};
        td.style.cssText = 'padding:5px 3px;text-align:center;font-weight:800;' +
          'border-left:1px solid var(--line);cursor:pointer;' +
          'background:' + (c.fond || 'transparent') + ';' +
          'color:' + (c.texte || 'inherit') + ';' +
          'font-variant-numeric:tabular-nums;';
        /* Le nombre de fautes : c'est ce qui décide de la couleur */
        td.textContent = r.fautes + (r.corrige ? '*' : '') + (r.app && !r.fini ? '…' : '');
        td.title = 'Séance ' + n + ' — ' + r.score + '/' + r.total +
          ' · ' + r.fautes + ' faute(s)' +
          (r.date ? ' · ' + r.date.split('-').reverse().join('/') : '') +
          (r.corrige ? ' · saisi à la main' : '') +
          (r.app ? ' · ' + (r.ou === 'visio' ? '🎥 répondu en visio' : '📱 répondu sur son espace') +
                   (r.fini ? '' : ' (pas fini)') + '\n' +
                   (r.series || []).map(x => x.nom + ' : ' + (x.fini ? x.fautes + ' faute(s) sur ' + x.nb : 'pas finie')).join('\n')
                 : (enVisio ? ' · 🎥 suivie en visio' + jourVisio : '')) +
          '. Appuie pour corriger.';
        if(r.app){
          const sa = document.createElement('sup');
          sa.textContent = r.ou === 'visio' ? '🎥' : '📱';
          sa.style.cssText = 'font-size:8px;margin-left:1px;';
          td.appendChild(sa);
        }else if(enVisio){
          const sv = document.createElement('sup');
          sv.textContent = '🎥';
          sv.style.cssText = 'font-size:8px;margin-left:1px;';
          td.appendChild(sv);
        }
        td.addEventListener('click', () => ouvrirSaisieEtg(e.nom, n, r));
      }
      tr.appendChild(td);
    }

    const tdF = document.createElement('td');
    tdF.style.cssText = 'padding:5px 6px;text-align:center;font-weight:800;' +
      'border-left:2px solid var(--line);color:' +
      (faites >= NB_SEANCES ? 'var(--accent-text)' : 'var(--muted)') + ';';
    tdF.textContent = faites + '/' + NB_SEANCES;
    tr.appendChild(tdF);

    tb.appendChild(tr);
  });

  t.appendChild(tb);
  enveloppe.appendChild(t);
  zone.appendChild(enveloppe);

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin-top:10px;' +
    'line-height:1.6;';
  aide.innerHTML = 'Le chiffre est le <strong>nombre de fautes</strong>. ' +
    '<span style="color:#8FBF3F;">0 à 3</span> · ' +
    '<span style="color:var(--accent-text);">4 à 6</span> · ' +
    '<span style="color:var(--red);">plus de 6</span>.<br>' +
    'Appuie sur une case pour corriger un score, ou en saisir un ' +
    'qui ne s\'est pas enregistré. Une étoile signale une saisie ' +
    'à la main.<br>Une séance repassée : c\'est la plus récente qui compte.' +
    '<br>📱 répondu sur son espace, en salle · 🎥 répondu en visio (ou, sans chiffre, présent en visio) · … pas encore fini · ' +
    'sans signe : Google Form.';
  zone.appendChild(aide);
}



/* ============================================================
   CORRIGER UNE SÉANCE À LA MAIN

   Une réponse qui ne s'est pas enregistrée, un score à rectifier.
   Ce qui est saisi ici prime sur le formulaire.
   ============================================================ */

function ouvrirSaisieEtg(eleve, seance, actuel){
  const total = baremesEtg[seance] || 10;

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(400px, 94vw)';

  boite.innerHTML =
    '<h3>Séance ' + seance + ' — ' + String(eleve).replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;">Barème de cette séance : sur ' + total + '.' +
      (actuel && !actuel.corrige
        ? '<br>Le formulaire dit <strong>' + actuel.score + '/' + actuel.total +
          '</strong> — ce que tu saisis le remplacera.'
        : '') + '</div>' +

    '<div class="duo">' +
      '<div><label for="seScore">Score</label>' +
        '<input type="number" id="seScore" min="0" max="' + total + '" ' +
        'step="0.5" inputmode="decimal"></div>' +
      '<div><label for="seDate">Date</label>' +
        '<input type="date" id="seDate"></div>' +
    '</div>' +
    '<div id="seApercu" style="font-size:13px;line-height:1.5;' +
      'margin:-6px 0 12px;min-height:18px;"></div>';

  const chS = boite.querySelector('#seScore');
  const chD = boite.querySelector('#seDate');
  if(actuel){
    chS.value = actuel.score;
    chD.value = actuel.date || '';
  }else{
    chD.value = todayLocal();
  }

  /* On montre les fautes et la couleur pendant la saisie */
  const apercu = () => {
    const z = boite.querySelector('#seApercu');
    const v = chS.value;
    if(v === ''){ z.innerHTML = ''; return; }

    const f = Math.max(0, total - Number(v));
    const coul = f <= 3 ? 'vert' : f <= 6 ? 'orange' : 'rouge';
    const cc = COULEURS_ETG[coul] || {};
    z.innerHTML = '<span style="color:' + (cc.texte || 'inherit') + ';">' +
      '<strong>' + f + ' faute(s)</strong> — ' + coul + '</span>';
  };
  chS.addEventListener('input', apercu);
  apercu();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bA);

  /* Retirer une saisie : le formulaire reprend la main */
  if(actuel && actuel.corrige){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.title = 'Retirer ma saisie';
    bSup.addEventListener('click', async () => {
      try{
        await appelPrep({ action: 'etgCorriger', eleve: eleve,
                          seance: seance, score: '' });
        fermerFond(fond);
        showToast('Saisie retirée ✅');
        afficherCodeSalle();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '💾 Enregistrer';
  bO.addEventListener('click', async () => {
    const v = chS.value;
    if(v === ''){ showToast('Saisis le score.'); return; }
    if(Number(v) > total){
      showToast('Le score dépasse le barème (' + total + ').');
      return;
    }

    bO.disabled = true;
    try{
      await appelPrep({
        action: 'etgCorriger',
        eleve: eleve, seance: seance,
        score: Number(v), total: total,
        date: chD.value,
        par: ACCES.moniteur || ''
      });
      fermerFond(fond);
      showToast('Enregistré ✅');
      afficherCodeSalle();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bO.disabled = false;
    }
  });
  r.appendChild(bO);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => chS.focus(), 100);
}


/* ============================================================
   L'ONGLET CODE

   Deux sujets voisins : les résultats des séances en salle, et
   les inscriptions au code aménagé. On passe de l'un à l'autre.
   ============================================================ */

let vueCode = 'salle';


async function afficherCode(){
  const zone = $('codeZone');
  if(!zone) return;

  zone.innerHTML = '';

  const barre = document.createElement('div');
  barre.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;';

  [['salle', '🎓 Code en salle'],
   ['amenage', '♿ Code aménagé']].forEach(([cle, nom]) => {
    const b = document.createElement('button');
    b.type = 'button';
    const actif = (vueCode === cle);
    b.style.cssText = 'flex:1;padding:10px 8px;font-size:13px;border-radius:9px;' +
      'cursor:pointer;margin:0;line-height:1.3;' +
      'border:1px solid ' + (actif ? 'var(--orange)' : 'var(--line)') + ';' +
      'background:' + (actif ? 'var(--orange)' : 'transparent') + ';' +
      'color:' + (actif ? 'var(--navy-deep)' : 'var(--cream)') + ';' +
      (actif ? 'font-weight:800;' : '');
    b.textContent = nom;
    b.addEventListener('click', () => {
      vueCode = cle;
      afficherCode();
    });
    barre.appendChild(b);
  });
  zone.appendChild(barre);

  const z = document.createElement('div');
  z.id = 'codeSousZone';
  zone.appendChild(z);

  if(vueCode === 'salle') afficherCodeSalle();
  else afficherCodeAmenage();
}


/* ============================================================
   📝 v1426 — LES SÉANCES DE CODE DANS L'APPLI

   David, le 13 novembre : les élèves répondent sur leur espace
   (en salle, ou sous l'image du cours en visio), série par série ;
   le Worker compte les fautes. Ici :
   · leurs résultats rejoignent la grille (📱 en salle, 🎥 en visio,
     … pas fini) ;
   · 🔑 Les corrigés : pour chaque séance, ses séries (renommées comme
     à la télé), et pour chaque question les lettres visibles et les
     bonnes. « Reprends-les des Google Forms et je corrige au besoin ».
   ============================================================ */
const LETTRES_ETG = 'ABCDEF';

/* Un résultat de l'appli, à la façon d'une ligne de formulaire */
function lignesAppEtg(liste){
  return (liste || []).filter(x => (x.series || []).some(s => s.fini)).map(x => {
    const fautes = Number(x.fautes || 0), total = Number(x.total || 0);
    return { seance: Number(x.seance), eleve: x.eleve, score: Math.max(0, total - fautes), total: total, fautes: fautes,
             couleur: fautes <= 3 ? 'vert' : fautes <= 6 ? 'orange' : 'rouge', date: x.jour || '', app: true,
             ou: x.ou, fini: !!x.fini, series: x.series || [] };
  });
}

function barreCorrigesEtg(){
  const b = document.createElement('div');
  b.style.cssText = 'display:flex;gap:8px;margin:0 0 12px;';
  const bt = document.createElement('button');
  bt.type = 'button';
  bt.className = 'btn btn-secondary';
  bt.style.cssText = 'margin:0;flex:1;padding:11px;font-size:13.5px;';
  bt.textContent = '🔑 Les corrigés des séances';
  bt.addEventListener('click', () => ouvrirCorrigesEtg());
  b.appendChild(bt);
  return b;
}

let corrigesEtg = {};          /* seance → { donnees:{series}, source, majLe, majPar } (enregistrés) */
let brouillonsEtg = {};        /* seance → { series } (pas encore enregistrés) */
function corrigeCompletEtg(d){
  return !!(d && d.series && d.series.length && d.series.every(s => s.q.length && s.q.every(y => y.b)));
}
function copieCorrigeEtg(d){ return JSON.parse(JSON.stringify(d || { series: [] })); }

async function ouvrirCorrigesEtg(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal cgEtg';
  boite.style.cssText = 'max-width:min(560px,96vw);max-height:90vh;overflow-y:auto;';
  boite.innerHTML = '<h3>🔑 Les corrigés des séances</h3>' + htmlAttente('Lecture des corrigés…');
  fond.appendChild(boite);
  document.body.appendChild(fond);
  try{
    const r = await appelPrep({ action: 'codeCorriges' });
    corrigesEtg = {};
    ((r && r.corriges) || []).forEach(c => { corrigesEtg[c.seance] = c; });
  }catch(e){
    boite.innerHTML = '<h3>🔑 Les corrigés des séances</h3><div class="empty">⚠️ ' + echapEtg(e.message || String(e)) + '</div>';
    return;
  }
  const E = { seance: 1, serie: 0, fond: fond, boite: boite, import: null };
  dessinerCorrigesEtg(E);
}
function echapEtg(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

/* Le corrigé qu'on regarde : le brouillon s'il y en a un */
function corrigeVuEtg(n){
  if(brouillonsEtg[n]) return brouillonsEtg[n];
  return corrigesEtg[n] ? corrigesEtg[n].donnees : { series: [] };
}
function brouillonEtg(n){
  if(!brouillonsEtg[n]) brouillonsEtg[n] = copieCorrigeEtg(corrigesEtg[n] ? corrigesEtg[n].donnees : { series: [] });
  return brouillonsEtg[n];
}

function dessinerCorrigesEtg(E){
  const b = E.boite;
  const modif = peutModifier('code');
  if(E.import){ dessinerImportEtg(E); return; }
  const n = E.seance;
  const d = corrigeVuEtg(n);
  if(E.serie >= d.series.length) E.serie = Math.max(0, d.series.length - 1);
  const s = d.series[E.serie];
  const enr = corrigesEtg[n];
  let h = '<h3>🔑 Le corrigé — séance ' + n + '</h3>' +
    '<div class="cgPuces">' + Array.from({ length: 12 }, (_, i) => {
      const k = i + 1;
      const v = corrigeVuEtg(k);
      const m = brouillonsEtg[k] ? '●' : corrigeCompletEtg(v) ? '✓' : v.series.length ? '⚠' : '';
      return '<button type="button" data-cg="seance" data-n="' + k + '" class="' + (k === n ? 'on' : '') + '">' + k + (m ? '<small>' + m + '</small>' : '') + '</button>';
    }).join('') + '</div>' +
    '<div class="cgEtat">' + (brouillonsEtg[n] ? '● Modifié, pas encore enregistré.'
      : enr ? (corrigeCompletEtg(enr.donnees) ? '✓ Prêt : les élèves peuvent répondre dans l’appli.' : '⚠ Incomplet : une question sans bonne réponse.') +
        ' <span>' + (enr.source === 'forms' ? 'Repris du Google Form' : 'Saisi à la main') + (enr.majLe ? ' · ' + echapEtg(enr.majLe) : '') + (enr.majPar ? ' · ' + echapEtg(enr.majPar) : '') + '</span>'
      : 'Pas encore de corrigé : la séance n’est pas proposée dans l’appli.') + '</div>';
  h += '<div class="cgSeries">' + d.series.map((x, i) =>
      '<button type="button" data-cg="serie" data-i="' + i + '" class="' + (i === E.serie ? 'on' : '') + '">' + echapEtg(x.nom) + ' · ' + x.q.length + ' q.</button>').join('') +
    (modif ? '<button type="button" data-cg="ajSerie" class="aj">＋ Une série</button>' : '') + '</div>';
  if(s){
    h += '<label class="cgNom">✏️ Nom à l’écran (celui de la télé)<input type="text" id="cgNom" maxlength="60" value="' + echapEtg(s.nom) + '"' + (modif ? '' : ' disabled') + '></label>' +
      '<div class="cgAide">Pour chaque question : les lettres visibles à l’écran (＋ / − pour en ajouter ou en retirer) et les bonnes en vert. ' +
      '<b>Juste seulement si l’élève coche toutes les bonnes et aucune autre.</b></div>' +
      s.q.map((y, qi) => '<div class="cgQ"><span class="q">Q' + (qi + 1) + '</span><span class="l">' +
        LETTRES_ETG.slice(0, y.n).split('').map(L => '<button type="button" data-cg="lettre" data-q="' + qi + '" data-l="' + L + '" class="' + (y.b.indexOf(L) !== -1 ? 'on' : '') + '">' + L + '</button>').join('') +
        '</span>' + (modif ? '<button type="button" class="pm" data-cg="plus" data-q="' + qi + '"' + (y.n >= 6 ? ' disabled' : '') + ' title="Une lettre de plus">＋</button>' +
          '<button type="button" class="pm" data-cg="moins" data-q="' + qi + '"' + (y.n <= 2 ? ' disabled' : '') + ' title="Une lettre de moins">−</button>' +
          '<button type="button" class="pm sup" data-cg="supQ" data-q="' + qi + '" title="Retirer la question">✕</button>' : '') +
        (y.b ? '' : '<span class="manque">pas de bonne</span>') + '</div>').join('') +
      (modif ? '<div class="cgActions"><button type="button" data-cg="ajQ">＋ Une question</button>' +
        '<button type="button" data-cg="supSerie" class="rouge">🗑️ Retirer cette série</button></div>' : '');
  }else{
    h += '<div class="empty" style="margin:10px 0">Aucune série pour la séance ' + n + '.' + (modif ? ' Ajoute-en une, ou reprends le Google Form.' : '') + '</div>';
  }
  h += '<div class="cgBas">' +
    (modif ? '<button type="button" class="btn btn-secondary" data-cg="importer">📥 Reprendre des Google Forms</button>' : '') +
    '<div class="duo"><button type="button" class="btn btn-secondary" data-cg="fermer">Fermer</button>' +
    (modif ? '<button type="button" class="btn btn-primary" data-cg="enregistrer"' + (brouillonsEtg[n] ? '' : ' disabled') + '>💾 Enregistrer la séance ' + n + '</button>' : '') + '</div></div>';
  b.innerHTML = h;
  const nom = b.querySelector('#cgNom');
  if(nom) nom.addEventListener('input', () => {
    brouillonEtg(n).series[E.serie].nom = nom.value;
    const t = b.querySelector('.cgSeries button.on');
    if(t) t.textContent = nom.value + ' · ' + brouillonEtg(n).series[E.serie].q.length + ' q.';
    const e = b.querySelector('[data-cg="enregistrer"]'); if(e) e.disabled = false;
    const m = b.querySelector('.cgPuces button.on small'); if(m) m.textContent = '●'; else { const x = b.querySelector('.cgPuces button.on'); if(x) x.insertAdjacentHTML('beforeend', '<small>●</small>'); }
  });
  b.querySelectorAll('[data-cg]').forEach(x => x.addEventListener('click', () => gesteCorrigeEtg(E, x)));
}

async function gesteCorrigeEtg(E, x){
  const a = x.getAttribute('data-cg');
  const n = E.seance;
  if(a === 'fermer'){
    if(Object.keys(brouillonsEtg).length && !x.dataset.sur){
      x.dataset.sur = '1';
      x.textContent = 'Fermer sans enregistrer ?';
      return;
    }
    brouillonsEtg = {};
    fermerFond(E.fond);
    if($('codeSousZone')) afficherCodeSalle();
    return;
  }
  if(a === 'seance'){ E.seance = Number(x.dataset.n); E.serie = 0; dessinerCorrigesEtg(E); return; }
  if(a === 'serie'){ E.serie = Number(x.dataset.i); dessinerCorrigesEtg(E); return; }
  if(!peutModifier('code')) return;
  const d = (a === 'importer' || a === 'enregistrer') ? null : brouillonEtg(n);
  const s = d ? d.series[E.serie] : null;
  if(a === 'ajSerie'){ d.series.push({ nom: 'Série ' + (d.series.length + 1), q: [{ n: 4, b: '' }] }); E.serie = d.series.length - 1; }
  else if(a === 'supSerie' && s){
    if(!x.dataset.sur){ x.dataset.sur = '1'; x.textContent = 'Sûr ? Retirer « ' + s.nom + ' »'; return; }
    d.series.splice(E.serie, 1); E.serie = Math.max(0, E.serie - 1);
  }
  else if(a === 'ajQ' && s){ const der = s.q[s.q.length - 1]; s.q.push({ n: der ? der.n : 4, b: '' }); }
  else if(a === 'supQ' && s){ s.q.splice(Number(x.dataset.q), 1); }
  else if(a === 'plus' && s){ const y = s.q[Number(x.dataset.q)]; if(y.n < 6) y.n++; }
  else if(a === 'moins' && s){ const y = s.q[Number(x.dataset.q)]; if(y.n > 2){ y.n--; y.b = y.b.split('').filter(L => LETTRES_ETG.indexOf(L) < y.n).join(''); } }
  else if(a === 'lettre' && s){
    const y = s.q[Number(x.dataset.q)], L = x.dataset.l;
    y.b = y.b.indexOf(L) !== -1 ? y.b.replace(L, '') : y.b + L;
    y.b = LETTRES_ETG.split('').filter(l => y.b.indexOf(l) !== -1).join('');
  }
  else if(a === 'enregistrer'){
    const br = brouillonsEtg[n];
    if(!br) return;
    x.disabled = true;
    try{
      const r = await appelPrep({ action: 'codeCorrigePoser', seance: n, donnees: br, source: 'main' });
      if(r && r.efface) delete corrigesEtg[n];
      else corrigesEtg[n] = { seance: n, donnees: r.donnees, source: 'main', majLe: 'à l’instant', majPar: ACCES.moniteur || '' };
      delete brouillonsEtg[n];
      showToast(r && r.efface ? 'Corrigé retiré ✅' : r && r.complet ? 'Séance ' + n + ' prête ✅' : 'Enregistré — il manque encore des bonnes réponses');
    }catch(e){ showToast('Impossible : ' + e.message); }
  }
  else if(a === 'importer'){
    x.disabled = true;
    x.textContent = '⏳ Lecture des 12 Google Forms…';
    try{
      const r = await appelPrep({ action: 'etgCorrigesForms' });
      if(r && r.status === 'error') throw new Error(r.message || 'Lecture impossible');
      E.import = { seances: (r && r.seances) || [], coches: {} };
      E.import.seances.forEach(z => { if(z.series && z.series.length && !corrigesEtg[z.seance]) E.import.coches[z.seance] = true; });
    }catch(e){ showToast('Impossible : ' + e.message); x.disabled = false; x.textContent = '📥 Reprendre des Google Forms'; return; }
  }
  dessinerCorrigesEtg(E);
}

/* Ce que les Google Forms ont donné : on choisit ce qu'on garde */
function dessinerImportEtg(E){
  const b = E.boite;
  const I = E.import;
  const nb = Object.keys(I.coches).filter(k => I.coches[k]).length;
  b.innerHTML = '<h3>📥 Repris des Google Forms</h3>' +
    '<div class="cgAide">Coche les séances à garder. Une séance qui a déjà un corrigé n’est pas cochée : la cocher le remplace. Tu pourras tout corriger ensuite.</div>' +
    I.seances.map(z => {
      const q = (z.series || []).reduce((t, s) => t + s.q.length, 0);
      const ok = z.series && z.series.length;
      const avert = !ok ? (z.erreur || 'aucune question trouvée')
        : [!z.quiz ? 'ce n’est pas un quiz' : '', z.sansBonne ? z.sansBonne + ' question(s) sans bonne réponse' : '', z.tropDeChoix ? z.tropDeChoix + ' question(s) à plus de 6 choix' : '',
           corrigesEtg[z.seance] ? 'a déjà un corrigé' : ''].filter(Boolean).join(' · ');
      return '<label class="cgImp' + (ok ? '' : ' off') + '"><input type="checkbox" data-n="' + z.seance + '"' + (I.coches[z.seance] ? ' checked' : '') + (ok ? '' : ' disabled') + '>' +
        '<span><b>Séance ' + z.seance + '</b>' + (ok ? ' · ' + z.series.length + ' série' + (z.series.length > 1 ? 's' : '') + ' · ' + q + ' questions' : '') +
        (ok ? '<small>' + z.series.map(s => echapEtg(s.nom) + ' (' + s.q.length + ')').join(' · ') + '</small>' : '') +
        (avert ? '<small class="av">' + echapEtg(avert) + '</small>' : '') + '</span></label>';
    }).join('') +
    '<div class="duo" style="margin-top:12px"><button type="button" class="btn btn-secondary" data-ci="retour">Retour</button>' +
    '<button type="button" class="btn btn-primary" data-ci="garder"' + (nb ? '' : ' disabled') + '>💾 Garder ' + nb + ' corrigé' + (nb > 1 ? 's' : '') + '</button></div>';
  b.querySelectorAll('input[type=checkbox]').forEach(c => c.addEventListener('change', () => { I.coches[c.dataset.n] = c.checked; dessinerImportEtg(E); }));
  b.querySelector('[data-ci="retour"]').addEventListener('click', () => { E.import = null; dessinerCorrigesEtg(E); });
  b.querySelector('[data-ci="garder"]').addEventListener('click', async ev => {
    ev.target.disabled = true;
    let faits = 0;
    for(const z of I.seances){
      if(!I.coches[z.seance] || !z.series || !z.series.length) continue;
      try{
        const r = await appelPrep({ action: 'codeCorrigePoser', seance: z.seance, donnees: { series: z.series }, source: 'forms' });
        corrigesEtg[z.seance] = { seance: z.seance, donnees: r.donnees, source: 'forms', majLe: 'à l’instant', majPar: ACCES.moniteur || '' };
        delete brouillonsEtg[z.seance];
        faits++;
      }catch(e){ showToast('Séance ' + z.seance + ' : ' + e.message); }
    }
    showToast(faits + ' corrigé' + (faits > 1 ? 's' : '') + ' gardé' + (faits > 1 ? 's' : '') + ' ✅');
    E.import = null;
    dessinerCorrigesEtg(E);
  });
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-code.js'] = true;
