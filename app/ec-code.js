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
  const zone = $('codeZone');
  if(!zone) return;

  zone.innerHTML = htmlAttente('Lecture des séances de code…');
  try{
    const d = await appelPrep({ action: 'seancesEtg' });
    if(d && d.status === 'error') throw new Error(d.message || 'Lecture impossible');
    resultatsEtg = (d && d.resultats) || [];
    baremesEtg = (d && d.baremes) || {};
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' +
      String(e.message || e).replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';

  if(!resultatsEtg.length){
    zone.innerHTML = '<div class="empty">Aucune séance enregistrée.<br>' +
      '<span style="font-size:12px;">Les résultats arrivent depuis les ' +
      'formulaires scannés en salle.</span></div>';
    return;
  }

  /* Quelle séance lancer : celle que le moins d'élèves ont faite */
  zone.appendChild(blocSeanceALancer());

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
      if(r.date && r.date >= depuis) vus[normaliserMot(r.eleve || '')] = true;
    });
  }

  const par = {};

  resultatsEtg.forEach(r => {
    if(depuis && !vus[normaliserMot(r.eleve || '')]) return;
    const cle = normaliserMot(r.eleve || '');
    if(!cle) return;

    if(!par[cle]) par[cle] = { nom: r.eleve, seances: {} };

    /* Une séance repassée : on garde le meilleur résultat, c'est
       celui qui compte pour l'élève. */
    const avant = par[cle].seances[r.seance];
    if(!avant || r.fautes < avant.fautes) par[cle].seances[r.seance] = r;
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

      if(!r){
        td.style.cssText = 'padding:5px 3px;text-align:center;' +
          'border-left:1px solid var(--line);color:var(--muted);cursor:pointer;';
        td.textContent = '·';
        td.title = 'Séance ' + n + ' — pas encore faite. Appuie pour saisir.';
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
        td.textContent = r.fautes + (r.corrige ? '*' : '');
        td.title = 'Séance ' + n + ' — ' + r.score + '/' + r.total +
          ' · ' + r.fautes + ' faute(s)' +
          (r.date ? ' · ' + r.date.split('-').reverse().join('/') : '') +
          (r.corrige ? ' · saisi à la main' : '') +
          '. Appuie pour corriger.';
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
    'à la main.<br>Une séance repassée garde son meilleur résultat.';
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
  bA.addEventListener('click', () => document.body.removeChild(fond));
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
        document.body.removeChild(fond);
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
      document.body.removeChild(fond);
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


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-code.js'] = true;
