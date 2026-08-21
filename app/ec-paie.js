/* ============================================================
   ec-paie.js
   Ce qu'on transmet au gestionnaire de paie.

   Ce module ne calcule pas une paie : il rassemble les heures et
   les absences d'un mois, en déduit la répartition entre heures
   normales et majorées, et compose le message. Les décisions —
   un chevauchement CP/arrêt, l'application d'une convention —
   restent celles du gestionnaire.

   Base : 35 h par semaine sur 4 jours, soit 8,75 h par jour.
   Une semaine à 4 × 10 h donne donc 5 h majorées à 25 %.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let salariesPaie = [];
let semainesPaie = [];
let absencesPaie = [];

const BASE_HEBDO = 35;
const HEURES_JOUR = 8.75;

const TYPES_ABSENCE = [
  { cle:'cp',     nom:'🏖️ Congés payés' },
  { cle:'arret',  nom:'🤒 Arrêt de travail' },
  { cle:'ferie',  nom:'📅 Jour férié' },
  { cle:'ss',     nom:'📄 Sans solde' },
  { cle:'autre',  nom:'📝 Autre absence' }
];


/* ============================================================
   LE CALCUL

   Les heures d'absence ne sont pas du temps de travail : elles
   réduisent d'autant ce qui est dû dans la semaine. Ce qui
   dépasse ce dû sans atteindre 35 h est payé sans majoration ;
   au-delà de 35 h, la majoration s'applique.
   ============================================================ */
function repartirHeures(faites, joursAbsents, base, heuresJour){
  const b = base || BASE_HEBDO;
  const hj = heuresJour || HEURES_JOUR;

  const dues = Math.max(0, b - (joursAbsents || 0) * hj);
  const ecart = (faites || 0) - dues;

  if(ecart <= 0) return { dues: dues, normales: 0, majorees: 0 };
  if(faites <= b) return { dues: dues, normales: arrondiQuart(ecart), majorees: 0 };

  return {
    dues: dues,
    normales: arrondiQuart(Math.max(0, b - dues)),
    majorees: arrondiQuart(faites - b)
  };
}

/* Les heures se comptent au quart : c'est l'usage en paie, et
   cela évite des décimales sans signification. */
function arrondiQuart(h){
  return Math.round((h || 0) * 4) / 4;
}

function enHeures(h){
  if(!h) return '0h';
  const n = arrondiQuart(h);
  return String(n).replace('.', ',') + 'h';
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */

let moisPaie = '';

async function afficherPaie(){
  const zone = $('paieZone');
  if(!zone) return;

  if(!moisPaie){
    const d = new Date();
    moisPaie = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  zone.innerHTML = '<div class="empty">Lecture…</div>';
  try{
    const d = await appelPrep({ action: 'paieList' });
    salariesPaie = (d && d.salaries) || [];
    semainesPaie = (d && d.semaines) || [];
    absencesPaie = (d && d.absences) || [];
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';

  /* Le mois traité */
  const barre = document.createElement('div');
  barre.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;';
  barre.innerHTML = '<label for="paieMois" style="margin:0;flex-shrink:0;' +
    'text-transform:none;font-size:13px;">Mois</label>';

  const chMois = document.createElement('input');
  chMois.type = 'month';
  chMois.id = 'paieMois';
  chMois.value = moisPaie;
  chMois.style.cssText = 'flex:1;min-width:0;margin:0;';
  chMois.addEventListener('change', () => {
    moisPaie = chMois.value;
    afficherPaie();
  });
  barre.appendChild(chMois);
  zone.appendChild(barre);

  if(!salariesPaie.length){
    const b = document.createElement('button');
    b.className = 'btn btn-primary';
    b.style.cssText = 'margin-bottom:12px;padding:13px;font-size:14px;';
    b.textContent = '➕ Ajouter un salarié';
    b.addEventListener('click', () => ouvrirSalarie(null));
    zone.appendChild(b);

    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucun salarié enregistré.<br>' +
      '<span style="font-size:12px;">Commence par les ajouter : ' +
      'les heures se saisissent ensuite semaine par semaine.</span>';
    zone.appendChild(v);
    return;
  }

  /* Le message à envoyer, en tête : c'est le but de l'écran */
  const bMsg = document.createElement('button');
  bMsg.className = 'btn btn-primary';
  bMsg.style.cssText = 'margin-bottom:12px;padding:13px;font-size:14px;';
  bMsg.textContent = '✉️ Composer le message pour la paie';
  bMsg.addEventListener('click', () => ouvrirMessagePaie());
  zone.appendChild(bMsg);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;';

  [['➕ Salarié', () => ouvrirSalarie(null)],
   ['🏖️ Absence', () => ouvrirAbsence(null)]].forEach(([nom, faire]) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'flex:1;padding:11px;font-size:13px;margin:0;';
    b.textContent = nom;
    b.addEventListener('click', faire);
    r.appendChild(b);
  });
  zone.appendChild(r);

  /* Chaque salarié, avec ses semaines du mois */
  salariesPaie.filter(s => s.actif).forEach(s => {
    zone.appendChild(carteSalarie(s));
  });

  const inactifs = salariesPaie.filter(s => !s.actif);
  if(inactifs.length){
    const d = document.createElement('details');
    d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
      'padding:10px 12px;margin-top:14px;';
    d.innerHTML = '<summary style="cursor:pointer;font-size:13px;color:var(--muted);">' +
      '🗂️ ' + inactifs.length + ' salarié(s) sorti(s)</summary>';
    const z = document.createElement('div');
    z.style.marginTop = '10px';
    inactifs.forEach(s => z.appendChild(carteSalarie(s)));
    d.appendChild(z);
    zone.appendChild(d);
  }
}


/* Les lundis d'un mois : une semaine de paie commence un lundi */
function lundisDuMois(mois){
  if(!mois) return [];
  const [an, m] = mois.split('-').map(Number);
  const out = [];

  /* On part du lundi qui précède ou ouvre le mois */
  const d = new Date(an, m - 1, 1, 12);
  const recul = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - recul);

  /* Toutes les semaines qui touchent le mois */
  while(d.getFullYear() < an || (d.getFullYear() === an && d.getMonth() < m)){
    const fin = new Date(d);
    fin.setDate(fin.getDate() + 6);
    if(fin.getMonth() === m - 1 || d.getMonth() === m - 1){
      out.push(d.getFullYear() + '-' +
               String(d.getMonth() + 1).padStart(2, '0') + '-' +
               String(d.getDate()).padStart(2, '0'));
    }
    d.setDate(d.getDate() + 7);
    if(out.length > 6) break;
  }
  return out;
}

function semaineDe(idSalarie, lundi){
  return semainesPaie.find(x => x.idSalarie === idSalarie && x.semaine === lundi) || null;
}

/* Le total du mois pour un salarié */
function totalMois(s){
  const lundis = lundisDuMois(moisPaie);
  let normales = 0, majorees = 0;

  lundis.forEach(l => {
    const w = semaineDe(s.id, l);
    if(!w) return;
    if(w.saisieDirecte){
      normales += w.hsNormales || 0;
      majorees += w.hs25 || 0;
    }else{
      const r = repartirHeures(w.heuresFaites, w.joursAbsents, s.baseHebdo, s.heuresJour);
      normales += r.normales;
      majorees += r.majorees;
    }
  });

  return { normales: arrondiQuart(normales), majorees: arrondiQuart(majorees) };
}

/* Les absences qui touchent le mois affiché */
function absencesDuMois(idSalarie){
  if(!moisPaie) return [];
  const debut = moisPaie + '-01';
  const [an, m] = moisPaie.split('-').map(Number);
  const fin = moisPaie + '-' + String(new Date(an, m, 0).getDate()).padStart(2, '0');

  return absencesPaie.filter(a => {
    if(a.idSalarie !== idSalarie) return false;
    if(!a.du) return false;
    /* Un arrêt sans fin court toujours */
    if(a.du > fin) return false;
    if(a.au && a.au < debut) return false;
    return true;
  });
}


function carteSalarie(s){
  const carte = document.createElement('details');
  carte.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 12px;margin-bottom:8px;' + (s.actif ? '' : 'opacity:.55;');

  const t = totalMois(s);
  const abs = absencesDuMois(s.id);

  carte.innerHTML = '<summary style="cursor:pointer;font-size:14px;">' +
    '<strong>' + s.nom.replace(/</g, '&lt;') + '</strong>' +
    '<span style="font-size:12px;color:var(--muted);"> — ' +
      (t.majorees ? enHeures(t.majorees) + ' à 25%' : '') +
      (t.majorees && t.normales ? ' · ' : '') +
      (t.normales ? enHeures(t.normales) + ' normales' : '') +
      (!t.majorees && !t.normales ? 'pas d\'heures supplémentaires' : '') +
      (abs.length ? ' · ' + abs.length + ' absence(s)' : '') +
    '</span></summary>';

  const z = document.createElement('div');
  z.style.marginTop = '10px';

  /* Une ligne par semaine du mois */
  lundisDuMois(moisPaie).forEach(l => z.appendChild(ligneSemaine(s, l)));

  /* Ses absences */
  if(abs.length){
    const ta = document.createElement('div');
    ta.style.cssText = 'font-size:12px;font-weight:700;color:var(--accent-text);' +
      'margin:12px 0 5px;';
    ta.textContent = 'Absences';
    z.appendChild(ta);

    abs.forEach(a => z.appendChild(ligneAbsence(a)));
  }

  /* Modifier le salarié */
  const bMod = document.createElement('button');
  bMod.className = 'btn btn-secondary';
  bMod.style.cssText = 'width:auto;padding:7px 11px;font-size:12px;margin:10px 0 0;';
  bMod.textContent = '⚙️ Sa fiche';
  bMod.addEventListener('click', () => ouvrirSalarie(s));
  z.appendChild(bMod);

  carte.appendChild(z);
  return carte;
}


function ligneSemaine(s, lundi){
  const w = semaineDe(s.id, lundi);
  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:8px;align-items:center;padding:6px 0;' +
    'border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;';

  const d = new Date(lundi + 'T12:00:00');
  const fin = new Date(d);
  fin.setDate(fin.getDate() + 6);

  const q = document.createElement('span');
  q.style.cssText = 'flex-shrink:0;width:96px;color:var(--muted);font-size:12px;';
  q.textContent = d.getDate() + '–' + fin.getDate() + '/' +
                  String(fin.getMonth() + 1).padStart(2, '0');
  l.appendChild(q);

  const t = document.createElement('span');
  t.style.cssText = 'flex:1;min-width:0;cursor:pointer;';

  if(!w){
    t.innerHTML = '<span style="color:var(--muted);">à saisir</span>';
  }else if(w.saisieDirecte){
    t.innerHTML = (w.hs25 ? '<strong>' + enHeures(w.hs25) + '</strong> à 25%' : '') +
      (w.hs25 && w.hsNormales ? ' · ' : '') +
      (w.hsNormales ? '<strong>' + enHeures(w.hsNormales) + '</strong> normales' : '') +
      (!w.hs25 && !w.hsNormales ? '<span style="color:var(--muted);">rien</span>' : '');
  }else{
    const r = repartirHeures(w.heuresFaites, w.joursAbsents, s.baseHebdo, s.heuresJour);
    t.innerHTML = enHeures(w.heuresFaites) + ' faites' +
      (w.joursAbsents ? ' · ' + w.joursAbsents + ' j absent' : '') +
      '<div style="font-size:11px;color:var(--accent-text);">' +
        (r.majorees ? enHeures(r.majorees) + ' à 25%' : '') +
        (r.majorees && r.normales ? ' · ' : '') +
        (r.normales ? enHeures(r.normales) + ' normales' : '') +
        (!r.majorees && !r.normales ? 'pas de supplémentaires' : '') +
      '</div>';
  }
  t.addEventListener('click', () => ouvrirSemaine(s, lundi, w));
  l.appendChild(t);

  return l;
}


function ligneAbsence(a){
  const ty = TYPES_ABSENCE.find(x => x.cle === a.type);
  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:8px;align-items:center;padding:5px 0;' +
    'font-size:13px;cursor:pointer;';
  l.innerHTML = '<span style="flex-shrink:0;">' +
    (ty ? ty.nom.split(' ')[0] : '📝') + '</span>' +
    '<span style="flex:1;min-width:0;">' +
      (a.du ? dateCourte(a.du) : '?') +
      (a.au ? ' → ' + dateCourte(a.au) : ' → sans fin connue') +
      (a.remarque ? '<div style="font-size:11px;color:var(--muted);">' +
        a.remarque.replace(/</g, '&lt;') + '</div>' : '') +
    '</span>';
  l.addEventListener('click', () => ouvrirAbsence(a));
  return l;
}

function dateCourte(iso){
  if(!iso) return '';
  const p = iso.split('-');
  return p[2] + '/' + p[1];
}


/* ============================================================
   LA FICHE D'UN SALARIÉ
   ============================================================ */

function ouvrirSalarie(s){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(460px, 94vw)';

  boite.innerHTML =
    '<h3>' + (s ? s.nom.replace(/</g, '&lt;') : 'Nouveau salarié') + '</h3>' +
    '<label for="slNom">Nom et prénom</label>' +
    '<input type="text" id="slNom" placeholder="Comme sur le bulletin de paie">' +
    '<div class="duo">' +
      '<div><label for="slBase">Base hebdomadaire</label>' +
        '<input type="number" id="slBase" step="0.25" value="35"></div>' +
      '<div><label for="slJours">Jours par semaine</label>' +
        '<input type="number" id="slJours" step="1" value="4"></div>' +
    '</div>' +
    '<div id="slDeduit" style="font-size:12px;color:var(--muted);margin:-6px 0 12px;' +
      'line-height:1.5;"></div>' +
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin:4px 0 10px;">' +
      '<input type="checkbox" id="slActif" checked style="width:19px;height:19px;">' +
      'Toujours dans l\'effectif</label>' +
    '<label for="slRem">Remarque</label>' +
    '<input type="text" id="slRem" placeholder="Facultatif">';

  if(s){
    boite.querySelector('#slNom').value = s.nom || '';
    boite.querySelector('#slBase').value = s.baseHebdo || 35;
    boite.querySelector('#slJours').value = s.joursSemaine || 4;
    boite.querySelector('#slActif').checked = s.actif;
    boite.querySelector('#slRem').value = s.remarque || '';
  }

  /* Les heures par jour se déduisent : les saisir en plus serait
     une occasion de se contredire. */
  const zd = boite.querySelector('#slDeduit');
  const majDeduit = () => {
    const b = parseFloat(boite.querySelector('#slBase').value) || 35;
    const j = parseInt(boite.querySelector('#slJours').value, 10) || 4;
    const hj = arrondiQuart(b / j);
    zd.textContent = 'Soit ' + enHeures(hj) + ' par jour — c\'est ce qui est ' +
      'retiré du dû pour chaque jour d\'absence.';
  };
  ['#slBase', '#slJours'].forEach(x =>
    boite.querySelector(x).addEventListener('input', majDeduit));
  majDeduit();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  if(s){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer ' + s.nom + ' ?\n\n' +
          'Ses heures saisies restent, mais ne seront plus rattachées à personne.\n' +
          'Pour un départ, décoche plutôt « Toujours dans l\'effectif ».')) return;
      try{
        await appelPrep({ action: 'paieSalarieDelete', id: s.id });
        document.body.removeChild(fond);
        showToast('Supprimé ✅');
        afficherPaie();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = s ? '💾 Enregistrer' : '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    const nom = boite.querySelector('#slNom').value.trim();
    if(!nom){ showToast('Indique son nom.'); return; }

    const base = parseFloat(boite.querySelector('#slBase').value) || 35;
    const jours = parseInt(boite.querySelector('#slJours').value, 10) || 4;

    bOk.disabled = true;
    try{
      await appelPrep({
        action: 'paieSalarieSet',
        id: s ? s.id : '',
        nom: nom,
        baseHebdo: base,
        joursSemaine: jours,
        heuresJour: arrondiQuart(base / jours),
        actif: boite.querySelector('#slActif').checked ? 'oui' : 'non',
        remarque: boite.querySelector('#slRem').value.trim(),
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      afficherPaie();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#slNom').focus(), 100);
}


/* ============================================================
   UNE SEMAINE
   ============================================================ */

function ouvrirSemaine(s, lundi, w){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(470px, 94vw)';

  const d = new Date(lundi + 'T12:00:00');
  const fin = new Date(d);
  fin.setDate(fin.getDate() + 6);

  boite.innerHTML =
    '<h3>' + s.nom.replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:13px;color:var(--muted);margin-bottom:12px;">' +
      'Semaine du ' + dateCourte(lundi) + ' au ' +
      String(fin.getDate()).padStart(2, '0') + '/' +
      String(fin.getMonth() + 1).padStart(2, '0') + '</div>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin:0 0 12px;">' +
      '<input type="checkbox" id="swDirect" style="width:19px;height:19px;">' +
      '✍️ Saisir directement les heures supplémentaires</label>' +

    '<div id="swCalcule">' +
      '<div class="duo">' +
        '<div><label for="swFaites">Heures faites</label>' +
          '<input type="number" id="swFaites" step="0.25" inputmode="decimal" ' +
            'placeholder="Ex : 40"></div>' +
        '<div><label for="swAbs">Jours d\'absence</label>' +
          '<input type="number" id="swAbs" step="1" min="0" value="0"></div>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--muted);margin:-6px 0 10px;line-height:1.5;">' +
        'CP, arrêt ou jour férié : chaque jour retire ' + enHeures(s.heuresJour) +
        ' de ce qui est dû.</div>' +
      '<div id="swResultat" style="font-size:13px;line-height:1.6;' +
        'border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
        'margin-bottom:12px;"></div>' +
    '</div>' +

    '<div id="swSaisi" style="display:none;">' +
      '<div class="duo">' +
        '<div><label for="swHs25">Heures à 25%</label>' +
          '<input type="number" id="swHs25" step="0.25" inputmode="decimal"></div>' +
        '<div><label for="swHsN">Heures normales</label>' +
          '<input type="number" id="swHsN" step="0.25" inputmode="decimal"></div>' +
      '</div>' +
    '</div>' +

    '<label for="swRem">Remarque</label>' +
    '<input type="text" id="swRem" placeholder="Facultatif">';

  if(w){
    boite.querySelector('#swDirect').checked = w.saisieDirecte;
    boite.querySelector('#swFaites').value = w.heuresFaites || '';
    boite.querySelector('#swAbs').value = w.joursAbsents || 0;
    boite.querySelector('#swHs25').value = w.hs25 || '';
    boite.querySelector('#swHsN').value = w.hsNormales || '';
    boite.querySelector('#swRem').value = w.remarque || '';
  }

  const zRes = boite.querySelector('#swResultat');
  const majCalcul = () => {
    const f = parseFloat(boite.querySelector('#swFaites').value) || 0;
    const a = parseInt(boite.querySelector('#swAbs').value, 10) || 0;
    const r = repartirHeures(f, a, s.baseHebdo, s.heuresJour);

    if(!f){
      zRes.innerHTML = '<span style="color:var(--muted);">Saisis les heures faites : ' +
        'la répartition se calcule seule.</span>';
      return;
    }

    zRes.innerHTML =
      '<div style="color:var(--muted);font-size:12px;">Dû cette semaine : ' +
        enHeures(r.dues) + '</div>' +
      '<div style="margin-top:4px;">' +
        (r.majorees ? '<strong style="color:var(--accent-text);">' +
          enHeures(r.majorees) + '</strong> à 25 %' : '') +
        (r.majorees && r.normales ? '<br>' : '') +
        (r.normales ? '<strong style="color:var(--accent-text);">' +
          enHeures(r.normales) + '</strong> normales' : '') +
        (!r.majorees && !r.normales
          ? '<span style="color:var(--muted);">Pas d\'heures supplémentaires.</span>' : '') +
      '</div>';
  };

  const basculer = () => {
    const direct = boite.querySelector('#swDirect').checked;
    boite.querySelector('#swCalcule').style.display = direct ? 'none' : 'block';
    boite.querySelector('#swSaisi').style.display = direct ? 'block' : 'none';
  };

  ['#swFaites', '#swAbs'].forEach(x =>
    boite.querySelector(x).addEventListener('input', majCalcul));
  boite.querySelector('#swDirect').addEventListener('change', basculer);
  majCalcul();
  basculer();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  if(w){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Effacer la saisie de cette semaine ?')) return;
      try{
        await appelPrep({ action: 'paieSemaineDelete', id: w.id });
        document.body.removeChild(fond);
        showToast('Effacée ✅');
        afficherPaie();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '💾 Enregistrer';
  bOk.addEventListener('click', async () => {
    const direct = boite.querySelector('#swDirect').checked;
    bOk.disabled = true;
    try{
      await appelPrep({
        action: 'paieSemaineSet',
        id: w ? w.id : '',
        idSalarie: s.id,
        semaine: lundi,
        heuresFaites: direct ? 0 : (boite.querySelector('#swFaites').value || 0),
        hsNormales: direct ? (boite.querySelector('#swHsN').value || 0) : 0,
        hs25: direct ? (boite.querySelector('#swHs25').value || 0) : 0,
        saisieDirecte: direct ? 'oui' : '',
        joursAbsents: direct ? 0 : (boite.querySelector('#swAbs').value || 0),
        remarque: boite.querySelector('#swRem').value.trim(),
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      afficherPaie();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#swFaites').focus(), 100);
}


/* ============================================================
   UNE ABSENCE
   ============================================================ */

function ouvrirAbsence(a){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(460px, 94vw)';

  boite.innerHTML =
    '<h3>' + (a ? 'Modifier l\'absence' : 'Nouvelle absence') + '</h3>' +
    '<label for="abSal">Salarié</label>' +
    '<select id="abSal">' +
      salariesPaie.map(s => '<option value="' + s.id + '">' +
        s.nom.replace(/</g, '&lt;') + '</option>').join('') +
    '</select>' +
    '<label for="abType">Type</label>' +
    '<select id="abType">' +
      TYPES_ABSENCE.map(t => '<option value="' + t.cle + '">' + t.nom +
                             '</option>').join('') +
    '</select>' +
    '<div class="duo">' +
      '<div><label for="abDu">Du</label><input type="date" id="abDu"></div>' +
      '<div><label for="abAu">Au</label><input type="date" id="abAu"></div>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin:-6px 0 12px;line-height:1.5;">' +
      'Laisse « Au » vide pour un arrêt dont on ne connaît pas encore la fin.</div>' +
    '<label for="abRem">Remarque pour le gestionnaire</label>' +
    '<input type="text" id="abRem" placeholder="Facultatif">' +
    '<div id="abAlerte" style="font-size:12px;margin:8px 0 0;line-height:1.5;"></div>';

  if(a){
    boite.querySelector('#abSal').value = a.idSalarie;
    boite.querySelector('#abType').value = a.type;
    boite.querySelector('#abDu').value = a.du || '';
    boite.querySelector('#abAu').value = a.au || '';
    boite.querySelector('#abRem').value = a.remarque || '';
  }

  /* Un chevauchement CP/arrêt se signale : c'est exactement le cas
     sur lequel le gestionnaire doit trancher. */
  const zAl = boite.querySelector('#abAlerte');
  const verifierChevauchement = () => {
    const idS = boite.querySelector('#abSal').value;
    const du = boite.querySelector('#abDu').value;
    const au = boite.querySelector('#abAu').value;
    if(!du){ zAl.innerHTML = ''; return; }

    const autres = absencesPaie.filter(x =>
      x.idSalarie === idS && (!a || x.id !== a.id) && x.du);

    const croise = autres.filter(x => {
      const finX = x.au || '9999-12-31';
      const finA = au || '9999-12-31';
      return du <= finX && x.du <= finA;
    });

    if(!croise.length){ zAl.innerHTML = ''; return; }

    zAl.innerHTML = '<span style="color:var(--warn-text);">⚠️ Chevauchement avec ' +
      croise.length + ' autre(s) absence(s).</span><br>' +
      '<span style="font-size:11px;color:var(--muted);">Ce cas sera signalé ' +
      'dans le message : c\'est au gestionnaire de paie de trancher.</span>';
  };
  ['#abSal', '#abDu', '#abAu'].forEach(x =>
    boite.querySelector(x).addEventListener('change', verifierChevauchement));
  verifierChevauchement();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  if(a){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer cette absence ?')) return;
      try{
        await appelPrep({ action: 'paieAbsenceDelete', id: a.id });
        document.body.removeChild(fond);
        showToast('Supprimée ✅');
        afficherPaie();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = a ? '💾 Enregistrer' : '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    const du = boite.querySelector('#abDu').value;
    if(!du){ showToast('Indique au moins la date de début.'); return; }

    bOk.disabled = true;
    try{
      await appelPrep({
        action: 'paieAbsenceSet',
        id: a ? a.id : '',
        idSalarie: boite.querySelector('#abSal').value,
        type: boite.querySelector('#abType').value,
        du: du,
        au: boite.querySelector('#abAu').value,
        remarque: boite.querySelector('#abRem').value.trim(),
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast('Enregistrée ✅');
      afficherPaie();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* ============================================================
   LE MESSAGE

   Il reprend la forme de celui que vous écrivez déjà : un salarié
   par ligne, ses heures puis ses absences.
   ============================================================ */

function composerMessagePaie(){
  const lignes = [];
  const moisTexte = moisEnToutesLettres(moisPaie);

  lignes.push('Bonjour,');
  lignes.push('');
  if(moisTexte) lignes.push('Éléments variables pour ' + moisTexte + ' :');
  lignes.push('');

  salariesPaie.filter(s => s.actif).forEach(s => {
    const t = totalMois(s);
    const abs = absencesDuMois(s.id);

    /* Un salarié sans rien à signaler n'encombre pas le message */
    if(!t.normales && !t.majorees && !abs.length) return;

    const bouts = [];
    if(t.majorees) bouts.push('Heures supplémentaires à 25% : ' + enHeures(t.majorees));
    if(t.normales) bouts.push('Heures supplémentaires normales : ' + enHeures(t.normales));

    abs.forEach(a => {
      const nom = { cp:'CP', arret:'Arrêt', ferie:'Férié',
                    ss:'Sans solde', autre:'Absence' }[a.type] || 'Absence';
      if(a.type === 'arret' && !a.au){
        bouts.push(nom + ' à compter du ' + dateCourte(a.du));
      }else if(a.au){
        bouts.push(nom + ' du ' + dateCourte(a.du) + ' au ' + dateCourte(a.au));
      }else{
        bouts.push(nom + ' à compter du ' + dateCourte(a.du));
      }
      if(a.remarque) bouts.push(a.remarque);
    });

    /* Les chevauchements : la question se pose, on la pose. */
    const croises = chevauchements(abs);
    if(croises) bouts.push(croises);

    lignes.push('Pour ' + s.nom + ' : ' + bouts.join('. ') + '.');
  });

  lignes.push('');
  lignes.push('En vous remerciant par avance,');
  lignes.push('Cordialement,');

  return lignes.join('\n');
}

/* La question à poser quand deux absences se croisent */
function chevauchements(abs){
  for(let i = 0; i < abs.length; i++){
    for(let j = i + 1; j < abs.length; j++){
      const a = abs[i], b = abs[j];
      const finA = a.au || '9999-12-31';
      const finB = b.au || '9999-12-31';
      if(a.du <= finB && b.du <= finA){
        return 'Attention, chevauchement entre ces absences : ' +
               'je vous laisse voir comment cela se traite';
      }
    }
  }
  return '';
}

function moisEnToutesLettres(mois){
  if(!mois) return '';
  const [an, m] = mois.split('-').map(Number);
  const noms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
                'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return (noms[m - 1] || '') + ' ' + an;
}


function ouvrirMessagePaie(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(600px, 95vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML = '<h3>✉️ Message pour la paie</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.5;">' +
      'Relis avant d\'envoyer : ce message rassemble ce qui a été saisi, ' +
      'il ne remplace pas ton contrôle.</div>';

  const z = document.createElement('textarea');
  z.rows = 16;
  z.value = composerMessagePaie();
  z.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:13px;' +
    'line-height:1.6;font-family:inherit;resize:vertical;margin-bottom:10px;';
  boite.appendChild(z);

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Fermer';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  const bCop = document.createElement('button');
  bCop.className = 'btn btn-primary';
  bCop.textContent = '📋 Copier';
  bCop.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(z.value);
      showToast('Message copié ✅');
    }catch(e){
      z.focus(); z.select();
      showToast('Sélectionné : copie-le avec Ctrl+C');
    }
  });
  r.appendChild(bCop);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-paie.js'] = true;
