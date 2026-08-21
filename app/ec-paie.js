/* ============================================================
   ec-paie.js
   Ce qu'on transmet au gestionnaire de paie.

   Le modèle reprend celui du tableau : pour chaque semaine, deux
   soldes — normal et majoré à 25 %. Un solde peut être négatif
   quand le moniteur a fait moins que son horaire.

   En fin de mois, un solde majoré négatif se compense d'abord sur
   les heures normales. Ce qui manque encore devient un report,
   repris le mois suivant — le « manque toujours 9,75 de juin ».

   Cet outil rassemble et met en forme. Les décisions — traitement
   d'un chevauchement CP/arrêt, application d'une convention —
   restent celles du gestionnaire de paie.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let salariesPaie = [];
let semainesPaie = [];
let absencesPaie = [];
let moisPaie = '';

const TYPES_ABSENCE = [
  { cle:'cp',     nom:'🏖️ Congés payés',      court:'CP' },
  { cle:'arret',  nom:'🤒 Arrêt de travail',   court:'Arrêt' },
  { cle:'ferie',  nom:'📅 Jour férié',         court:'Férié' },
  { cle:'ss',     nom:'📄 Sans solde',         court:'Sans solde' },
  { cle:'autre',  nom:'📝 Autre absence',      court:'Absence' }
];

/* Les heures se comptent au quart */
function arrondiQuart(h){ return Math.round((h || 0) * 4) / 4; }

function enHeures(h){
  const n = arrondiQuart(h);
  return String(n).replace('.', ',') + 'h';
}


/* ============================================================
   LE CALCUL

   Un solde majoré négatif se rattrape d'abord sur les heures
   normales du mois, puis sur celles du mois suivant.
   ============================================================ */
function aTransmettre(normal, majore, report){
  /* Le report d'un mois précédent creuse le solde d'autant */
  const maj = (majore || 0) - (report || 0);
  const nor = normal || 0;

  if(maj >= 0) return { normales: arrondiQuart(nor), majorees: arrondiQuart(maj), report: 0 };

  const reste = nor + maj;
  if(reste >= 0) return { normales: arrondiQuart(reste), majorees: 0, report: 0 };

  /* Rien à payer ce mois-ci : la dette passe au suivant */
  return { normales: 0, majorees: 0, report: arrondiQuart(-reste) };
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */

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

  const barre = document.createElement('div');
  barre.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;';
  barre.innerHTML = '<label for="paieMois" style="margin:0;flex-shrink:0;' +
    'text-transform:none;font-size:13px;">Mois</label>';

  const chMois = document.createElement('input');
  chMois.type = 'month';
  chMois.id = 'paieMois';
  chMois.value = moisPaie;
  chMois.style.cssText = 'flex:1;min-width:0;margin:0;';
  chMois.addEventListener('change', () => { moisPaie = chMois.value; afficherPaie(); });
  barre.appendChild(chMois);
  zone.appendChild(barre);

  if(!salariesPaie.length){
    const b = document.createElement('button');
    b.className = 'btn btn-primary';
    b.style.cssText = 'margin-bottom:12px;padding:13px;font-size:14px;';
    b.textContent = '➕ Ajouter un salarié';
    b.addEventListener('click', () => ouvrirSalarie(null));
    zone.appendChild(b);

    zone.innerHTML += '<div class="empty">Aucun salarié enregistré.<br>' +
      '<span style="font-size:12px;">Commence par les ajouter : les heures ' +
      'se saisissent ensuite semaine par semaine.</span></div>';
    return;
  }

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

  /* Le tableau, comme dans le classeur : une ligne par salarié,
     deux colonnes par semaine. */
  zone.appendChild(tableauPaie());

  const inactifs = salariesPaie.filter(s => !s.actif);
  if(inactifs.length){
    const d = document.createElement('div');
    d.style.cssText = 'font-size:11px;color:var(--muted);margin-top:10px;';
    d.textContent = inactifs.length + ' salarié(s) sorti(s) de l\'effectif, non affiché(s).';
    zone.appendChild(d);
  }
}


/* Les lundis qui composent le mois affiché */
function lundisDuMois(mois){
  if(!mois) return [];
  const [an, m] = mois.split('-').map(Number);
  const out = [];

  const d = new Date(an, m - 1, 1, 12);
  const recul = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - recul);

  for(let i = 0; i < 6; i++){
    const fin = new Date(d);
    fin.setDate(fin.getDate() + 6);
    /* Une semaine compte si elle touche le mois */
    if(d.getMonth() === m - 1 || fin.getMonth() === m - 1){
      out.push(d.getFullYear() + '-' +
               String(d.getMonth() + 1).padStart(2, '0') + '-' +
               String(d.getDate()).padStart(2, '0'));
    }
    d.setDate(d.getDate() + 7);
    if(d.getMonth() > m - 1 && d.getFullYear() >= an) break;
  }
  return out;
}

function semaineDe(idSalarie, lundi){
  return semainesPaie.find(x => x.idSalarie === idSalarie && x.semaine === lundi) || null;
}

/* Les totaux du mois pour un salarié */
function totalMois(s){
  let normal = 0, majore = 0;
  lundisDuMois(moisPaie).forEach(l => {
    const w = semaineDe(s.id, l);
    if(!w) return;
    normal += w.normal || 0;
    majore += w.majore || 0;
  });

  /* Le report ne s'applique que sur le mois qu'il vise */
  const report = (s.reportMois && s.reportMois !== moisPaie) ? 0 : (s.report || 0);

  return Object.assign(
    { normal: arrondiQuart(normal), majore: arrondiQuart(majore) },
    aTransmettre(normal, majore, report)
  );
}

function absencesDuMois(idSalarie){
  if(!moisPaie) return [];
  const [an, m] = moisPaie.split('-').map(Number);
  const debut = moisPaie + '-01';
  const fin = moisPaie + '-' + String(new Date(an, m, 0).getDate()).padStart(2, '0');

  return absencesPaie.filter(a => {
    if(a.idSalarie !== idSalarie || !a.du) return false;
    if(a.du > fin) return false;
    if(a.au && a.au < debut) return false;
    return true;
  });
}


/* Le tableau du mois */
function tableauPaie(){
  const lundis = lundisDuMois(moisPaie);
  const zone = document.createElement('div');
  zone.style.cssText = 'overflow-x:auto;';

  const t = document.createElement('table');
  t.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;' +
    'min-width:' + (150 + lundis.length * 96 + 110) + 'px;';

  /* Les en-têtes : une semaine, deux colonnes */
  const th = document.createElement('thead');
  const l1 = document.createElement('tr');
  l1.innerHTML = '<th style="text-align:left;padding:6px 8px;"></th>' +
    lundis.map(l => '<th colspan="2" style="padding:6px 4px;font-size:11px;' +
      'color:var(--muted);border-left:1px solid var(--line);">' +
      dateCourte(l) + '</th>').join('') +
    '<th colspan="2" style="padding:6px 4px;font-size:11px;color:var(--accent-text);' +
      'border-left:2px solid var(--line);">TOTAL</th>';
  th.appendChild(l1);

  const l2 = document.createElement('tr');
  l2.innerHTML = '<th style="text-align:left;padding:4px 8px;font-size:11px;' +
    'color:var(--muted);">Salarié</th>' +
    lundis.map(() => '<th style="padding:4px;font-size:10px;color:var(--muted);' +
      'border-left:1px solid var(--line);">N</th>' +
      '<th style="padding:4px;font-size:10px;color:var(--muted);">25%</th>').join('') +
    '<th style="padding:4px;font-size:10px;color:var(--accent-text);' +
      'border-left:2px solid var(--line);">N</th>' +
    '<th style="padding:4px;font-size:10px;color:var(--accent-text);">25%</th>';
  th.appendChild(l2);
  t.appendChild(th);

  const tb = document.createElement('tbody');
  salariesPaie.filter(s => s.actif).forEach(s => {
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-top:1px solid rgba(255,255,255,.06);';

    const td0 = document.createElement('td');
    td0.style.cssText = 'padding:7px 8px;font-weight:700;white-space:nowrap;' +
      'cursor:pointer;';
    td0.textContent = s.nom;
    td0.title = 'Sa fiche';
    td0.addEventListener('click', () => ouvrirSalarie(s));
    tr.appendChild(td0);

    lundis.forEach(l => {
      const w = semaineDe(s.id, l);
      [['normal', w ? w.normal : null], ['majore', w ? w.majore : null]]
        .forEach(([quoi, v], i) => {
          const td = document.createElement('td');
          td.style.cssText = 'padding:5px 4px;text-align:center;cursor:pointer;' +
            'font-variant-numeric:tabular-nums;' +
            (i === 0 ? 'border-left:1px solid var(--line);' : '') +
            (v < 0 ? 'color:var(--red);' : '');
          td.textContent = (v === null || v === 0) ? '·' : String(v).replace('.', ',');
          td.addEventListener('click', () => ouvrirSemaine(s, l, w));
          tr.appendChild(td);
        });
    });

    const tot = totalMois(s);
    [[tot.normal, true], [tot.majore, false]].forEach(([v, premier]) => {
      const td = document.createElement('td');
      td.style.cssText = 'padding:5px 4px;text-align:center;font-weight:800;' +
        'font-variant-numeric:tabular-nums;' +
        (premier ? 'border-left:2px solid var(--line);' : '') +
        (v < 0 ? 'color:var(--red);' : 'color:var(--accent-text);');
      td.textContent = v ? String(v).replace('.', ',') : '·';
      tr.appendChild(td);
    });

    tb.appendChild(tr);

    /* Ce qui sera transmis, et les absences, sous chaque ligne */
    const abs = absencesDuMois(s.id);
    const dit = [];
    if(tot.majorees) dit.push(enHeures(tot.majorees) + ' à 25%');
    if(tot.normales) dit.push(enHeures(tot.normales) + ' normales');
    if(tot.report) dit.push('⚠️ manque ' + enHeures(tot.report));
    abs.forEach(a => {
      const ty = TYPES_ABSENCE.find(x => x.cle === a.type);
      dit.push((ty ? ty.court : 'Absence') + ' ' + periodeTexte(a));
    });

    if(dit.length){
      const tr2 = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 1 + lundis.length * 2 + 2;
      td.style.cssText = 'padding:0 8px 8px 8px;font-size:11px;' +
        'color:var(--muted);line-height:1.5;';
      td.innerHTML = '→ ' + dit.join(' · ').replace(/</g, '&lt;');
      tr2.appendChild(td);
      tb.appendChild(tr2);
    }
  });

  t.appendChild(tb);
  zone.appendChild(t);

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin-top:8px;line-height:1.5;';
  aide.innerHTML = 'Appuie sur une case pour saisir la semaine. ' +
    'Un solde négatif se rattrape sur les heures normales, ' +
    'puis se reporte au mois suivant.';
  zone.appendChild(aide);

  return zone;
}

function dateCourte(iso){
  if(!iso) return '';
  const p = String(iso).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] : iso;
}

function periodeTexte(a){
  if(a.au) return 'du ' + dateCourte(a.du) + ' au ' + dateCourte(a.au);
  return 'à compter du ' + dateCourte(a.du);
}


/* ============================================================
   UNE SEMAINE
   ============================================================ */

function ouvrirSemaine(s, lundi, w){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(430px, 94vw)';

  const d = new Date(lundi + 'T12:00:00');
  const fin = new Date(d);
  fin.setDate(fin.getDate() + 6);

  boite.innerHTML =
    '<h3>' + s.nom.replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:13px;color:var(--muted);margin-bottom:14px;">' +
      'Semaine du ' + dateCourte(lundi) + ' au ' +
      String(fin.getDate()).padStart(2, '0') + '/' +
      String(fin.getMonth() + 1).padStart(2, '0') + '</div>' +

    '<div class="duo">' +
      '<div><label for="swNormal">Normal</label>' +
        '<input type="number" id="swNormal" step="0.25" inputmode="decimal" ' +
          'placeholder="0"></div>' +
      '<div><label for="swMajore">Majoré 25%</label>' +
        '<input type="number" id="swMajore" step="0.25" inputmode="decimal" ' +
          'placeholder="0"></div>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin:-6px 0 12px;line-height:1.5;">' +
      'Les valeurs négatives sont acceptées : une semaine à ' +
      enHeures(s.baseHebdo - s.heuresJour) + ' donne un solde négatif.</div>' +

    '<label for="swRem">Remarque</label>' +
    '<input type="text" id="swRem" placeholder="Facultatif">';

  if(w){
    boite.querySelector('#swNormal').value = w.normal || '';
    boite.querySelector('#swMajore').value = w.majore || '';
    boite.querySelector('#swRem').value = w.remarque || '';
  }

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
      if(!await confirmer('Effacer cette semaine ?')) return;
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
    bOk.disabled = true;
    try{
      await appelPrep({
        action: 'paieSemaineSet',
        id: w ? w.id : '',
        idSalarie: s.id,
        semaine: lundi,
        normal: boite.querySelector('#swNormal').value || 0,
        majore: boite.querySelector('#swMajore').value || 0,
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
  setTimeout(() => boite.querySelector('#swMajore').focus(), 100);
}


/* ============================================================
   UN SALARIÉ
   ============================================================ */

function ouvrirSalarie(s){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(460px, 94vw)';

  boite.innerHTML =
    '<h3>' + (s ? s.nom.replace(/</g, '&lt;') : 'Nouveau salarié') + '</h3>' +
    '<label for="slNom">Nom</label>' +
    '<input type="text" id="slNom" placeholder="Comme sur le bulletin de paie">' +
    '<div class="duo">' +
      '<div><label for="slBase">Base hebdomadaire</label>' +
        '<input type="number" id="slBase" step="0.25" value="35"></div>' +
      '<div><label for="slJours">Jours par semaine</label>' +
        '<input type="number" id="slJours" step="1" value="4"></div>' +
    '</div>' +
    '<div id="slDeduit" style="font-size:12px;color:var(--muted);margin:-6px 0 12px;' +
      'line-height:1.5;"></div>' +

    '<div class="duo">' +
      '<div><label for="slReport">Report en heures</label>' +
        '<input type="number" id="slReport" step="0.25" inputmode="decimal" ' +
          'placeholder="0"></div>' +
      '<div><label for="slReportMois">À déduire sur</label>' +
        '<input type="month" id="slReportMois"></div>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin:-6px 0 12px;line-height:1.5;">' +
      'Ce qui manque d\'un mois précédent, à rattraper. Il se déduit du ' +
      'mois indiqué, puis se remet à jour.</div>' +

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
    boite.querySelector('#slReport').value = s.report || '';
    boite.querySelector('#slReportMois').value = s.reportMois || '';
    boite.querySelector('#slActif').checked = s.actif;
    boite.querySelector('#slRem').value = s.remarque || '';
  }

  const zd = boite.querySelector('#slDeduit');
  const majDeduit = () => {
    const b = parseFloat(boite.querySelector('#slBase').value) || 35;
    const j = parseInt(boite.querySelector('#slJours').value, 10) || 4;
    zd.textContent = 'Soit ' + enHeures(b / j) + ' par jour travaillé.';
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
        report: boite.querySelector('#slReport').value || 0,
        reportMois: boite.querySelector('#slReportMois').value,
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
      'Laisse « Au » vide pour un arrêt dont on ne connaît pas la fin.</div>' +
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

  /* Le chevauchement CP/arrêt : exactement le cas sur lequel le
     gestionnaire doit trancher. */
  const zAl = boite.querySelector('#abAlerte');
  const verifier = () => {
    const idS = boite.querySelector('#abSal').value;
    const du = boite.querySelector('#abDu').value;
    const au = boite.querySelector('#abAu').value;
    if(!du){ zAl.innerHTML = ''; return; }

    const croise = absencesPaie.filter(x => {
      if(x.idSalarie !== idS || (a && x.id === a.id) || !x.du) return false;
      return du <= (x.au || '9999-12-31') && x.du <= (au || '9999-12-31');
    });

    zAl.innerHTML = croise.length
      ? '<span style="color:var(--warn-text);">⚠️ Chevauchement avec ' +
        croise.length + ' autre(s) absence(s).</span><br>' +
        '<span style="font-size:11px;color:var(--muted);">Ce sera signalé dans ' +
        'le message : c\'est au gestionnaire de trancher.</span>'
      : '';
  };
  ['#abSal', '#abDu', '#abAu'].forEach(x =>
    boite.querySelector(x).addEventListener('change', verifier));
  verifier();

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
   ============================================================ */

function composerMessagePaie(){
  const lignes = ['Bonjour,', ''];
  const moisTexte = moisEnToutesLettres(moisPaie);
  if(moisTexte) lignes.push('Éléments variables pour ' + moisTexte + ' :', '');

  salariesPaie.filter(s => s.actif).forEach(s => {
    const t = totalMois(s);
    const abs = absencesDuMois(s.id);

    /* Un salarié sans rien à signaler n'encombre pas le message */
    if(!t.normales && !t.majorees && !t.report && !abs.length) return;

    const bouts = [];
    if(t.majorees) bouts.push('Heures supplémentaires à 25% : ' + enHeures(t.majorees));
    if(t.normales) bouts.push('Heures supplémentaires normales : ' + enHeures(t.normales));

    abs.forEach(a => {
      const ty = TYPES_ABSENCE.find(x => x.cle === a.type);
      bouts.push((ty ? ty.court : 'Absence') + ' ' + periodeTexte(a));
      if(a.remarque) bouts.push(a.remarque);
    });

    if(t.report){
      bouts.push('il reste ' + enHeures(t.report) + ' à rattraper');
    }

    const croises = chevauchements(abs);
    if(croises) bouts.push(croises);

    lignes.push('Pour ' + s.nom + ' : ' + bouts.join('. ') + '.');
  });

  lignes.push('', 'En vous remerciant par avance,', 'Cordialement,');
  return lignes.join('\n');
}

function chevauchements(abs){
  for(let i = 0; i < abs.length; i++){
    for(let j = i + 1; j < abs.length; j++){
      const a = abs[i], b = abs[j];
      if(a.du <= (b.au || '9999-12-31') && b.du <= (a.au || '9999-12-31')){
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
