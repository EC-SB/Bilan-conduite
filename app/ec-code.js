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

  zone.innerHTML = '<div class="empty">Lecture des séances…</div>';
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

  const ch = document.createElement('input');
  ch.type = 'search';
  ch.id = 'filtreEleveEtg';
  ch.placeholder = '🔍 Chercher un élève…';
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


/* Les élèves, avec ce qu'ils ont fait */
function elevesEtg(){
  const par = {};

  resultatsEtg.forEach(r => {
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


/* Quelle séance mettre en route */
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

  d.appendChild(z);
  return d;
}


function dessinerGrilleEtg(){
  const zone = $('grilleEtg');
  if(!zone) return;
  zone.innerHTML = '';

  const cherche = normaliserMot(String(filtreEleveEtg || '').trim());
  const eleves = elevesEtg()
    .filter(e => !cherche || normaliserMot(e.nom).indexOf(cherche) !== -1);

  if(!eleves.length){
    zone.innerHTML = '<div class="empty">Aucun élève ne correspond.</div>';
    return;
  }

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
          'border-left:1px solid var(--line);color:var(--muted);';
        td.textContent = '·';
        td.title = 'Séance ' + n + ' — pas encore faite';
      }else{
        faites++;
        const c = COULEURS_ETG[r.couleur] || {};
        td.style.cssText = 'padding:5px 3px;text-align:center;font-weight:800;' +
          'border-left:1px solid var(--line);cursor:default;' +
          'background:' + (c.fond || 'transparent') + ';' +
          'color:' + (c.texte || 'inherit') + ';' +
          'font-variant-numeric:tabular-nums;';
        /* Le nombre de fautes : c'est ce qui décide de la couleur */
        td.textContent = r.fautes;
        td.title = 'Séance ' + n + ' — ' + r.score + '/' + r.total +
          ' · ' + r.fautes + ' faute(s)' +
          (r.date ? ' · ' + r.date.split('-').reverse().join('/') : '');
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
    'Un appui long sur une case donne le détail. ' +
    'Une séance repassée garde son meilleur résultat.';
  zone.appendChild(aide);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-code.js'] = true;
