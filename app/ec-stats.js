/* ============================================================
   ec-stats.js
   Taux de réussite : global, par moniteur, par type de permis.
   Les résultats viennent de l'onglet Resultats du classeur,
   alimenté à chaque saisie dans « Examens passés ».
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let resultatsExamens = [];

async function chargerResultats(depuis){
  const d = await appelPrep({ action: 'resultatList', depuis: depuis || '' });
  resultatsExamens = (d && d.resultats) || [];
  return resultatsExamens;
}

/* Un taux n'a de sens qu'au-delà d'un certain nombre de passages */
const SEUIL_FIABLE = 5;

function calculerTaux(liste){
  const total = liste.length;
  const reussis = liste.filter(r => r.resultat === 'obtenu').length;
  return {
    total: total,
    reussis: reussis,
    echecs: total - reussis,
    taux: total ? Math.round((reussis / total) * 1000) / 10 : null,
    fiable: total >= SEUIL_FIABLE
  };
}

/* Premier passage seulement : le taux le plus parlant */
function premiersPassages(liste){
  return liste.filter(r => String(r.rang || '1') === '1');
}

function couleurTaux(t){
  if(t === null) return 'var(--muted)';
  if(t >= 70) return 'var(--accent-text)';
  if(t >= 55) return '#E8A33D';
  return 'var(--red)';
}

/* Une ligne de statistique, avec sa barre */
function ligneTaux(libelle, st, total){
  const d = document.createElement('div');
  d.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--line);';

  const h = document.createElement('div');
  h.style.cssText = 'display:flex;align-items:baseline;gap:8px;font-size:14px;';
  const n = document.createElement('span');
  n.style.cssText = 'flex:1;min-width:0;';
  n.textContent = libelle;
  h.appendChild(n);

  const v = document.createElement('span');
  v.style.cssText = 'font-weight:700;font-size:15px;flex-shrink:0;color:' + couleurTaux(st.taux) + ';';
  v.textContent = (st.taux === null) ? '—' : st.taux + ' %';
  h.appendChild(v);

  const c = document.createElement('span');
  c.style.cssText = 'font-size:12px;color:var(--muted);flex-shrink:0;';
  c.textContent = st.reussis + '/' + st.total;
  h.appendChild(c);
  d.appendChild(h);

  /* Barre proportionnelle, avec l'épaisseur du volume traité */
  const barre = document.createElement('div');
  barre.style.cssText = 'height:6px;background:var(--navy);border-radius:3px;' +
    'margin-top:5px;overflow:hidden;';
  const part = document.createElement('div');
  part.style.cssText = 'height:100%;width:' + (st.taux || 0) + '%;' +
    'background:' + couleurTaux(st.taux) + ';border-radius:3px;';
  barre.appendChild(part);
  d.appendChild(barre);

  if(!st.fiable){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:3px;';
    a.textContent = 'Trop peu de passages pour être significatif';
    d.appendChild(a);
  }

  return d;
}

function blocStats(titre, groupes){
  const d = document.createElement('div');
  d.style.cssText = 'margin-bottom:18px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
    'margin-bottom:4px;';
  t.textContent = titre;
  d.appendChild(t);

  const cles = Object.keys(groupes).sort((a, b) => {
    const ta = calculerTaux(groupes[a]).taux, tb = calculerTaux(groupes[b]).taux;
    return (tb === null ? -1 : tb) - (ta === null ? -1 : ta);
  });

  if(!cles.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.cssText = 'padding:10px;font-size:12px;';
    v.textContent = 'Aucun résultat.';
    d.appendChild(v);
    return d;
  }

  cles.forEach(k => d.appendChild(ligneTaux(k, calculerTaux(groupes[k]))));
  return d;
}

function grouper(liste, cle){
  const g = {};
  liste.forEach(r => {
    const k = cle(r) || '—';
    if(!g[k]) g[k] = [];
    g[k].push(r);
  });
  return g;
}


async function afficherStats(){
  const zone = $('statsZone');
  if(!zone) return;

  const periode = ($('statsPeriode') && $('statsPeriode').value) || '365';
  const rang = ($('statsRang') && $('statsRang').value) || 'tous';

  let depuis = '';
  if(periode !== 'tout'){
    const d = new Date();
    d.setDate(d.getDate() - parseInt(periode, 10));
    depuis = d.toISOString().slice(0, 10);
  }

  zone.innerHTML = '<div class="empty">Lecture des résultats…</div>';
  try{
    await chargerResultats(depuis);
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  let liste = resultatsExamens.slice();
  if(rang === 'premier') liste = premiersPassages(liste);
  if(rang === 'repassage') liste = liste.filter(r => String(r.rang || '1') !== '1');

  zone.innerHTML = '';

  if(!liste.length){
    zone.innerHTML = '<div class="empty">Aucun résultat sur cette période.<br>' +
      "<span style='font-size:12px;'>Les taux se construisent au fil des saisies " +
      'dans « Examens passés — résultat à saisir ».</span></div>';
    return;
  }

  /* ---- Global ---- */
  const global = calculerTaux(liste);
  const g = document.createElement('div');
  g.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:12px;' +
    'padding:14px;margin-bottom:18px;text-align:center;';
  g.innerHTML =
    '<div style="font-size:13px;color:var(--muted);">Taux de réussite global</div>' +
    '<div style="font-size:38px;font-weight:800;line-height:1.2;color:' +
      couleurTaux(global.taux) + ';">' + (global.taux === null ? '—' : global.taux + ' %') + '</div>' +
    '<div style="font-size:13px;color:var(--muted);">' +
      global.reussis + ' réussite(s) sur ' + global.total + ' passage(s)' +
      ' · ' + global.echecs + ' échec(s)</div>';
  zone.appendChild(g);

  /* Premier passage à part : c'est l'indicateur de référence */
  if(rang === 'tous'){
    const p = calculerTaux(premiersPassages(liste));
    if(p.total){
      const d = document.createElement('div');
      d.style.cssText = 'font-size:13px;color:var(--muted);text-align:center;' +
        'margin:-10px 0 18px;';
      d.innerHTML = 'Au <strong style="color:' + couleurTaux(p.taux) + ';">premier passage : ' +
        p.taux + ' %</strong> (' + p.reussis + '/' + p.total + ')';
      zone.appendChild(d);
    }
  }

  /* ---- Par moniteur ---- */
  zone.appendChild(blocStats('👤 Par moniteur',
    grouper(liste, r => r.moniteur || '— non renseigné —')));

  /* ---- Par boîte ---- */
  zone.appendChild(blocStats('🚗 Par boîte',
    grouper(liste, r => r.boite || '—')));

  /* ---- Par parcours ---- */
  zone.appendChild(blocStats('🎓 Par parcours',
    grouper(liste, r => r.parcours || '—')));

  /* ---- Par combinaison ---- */
  zone.appendChild(blocStats('🔀 Par type de formation',
    grouper(liste, r => (r.parcours || '?') + ' ' + (r.boite || '?'))));

  /* ---- Par centre ---- */
  const parCentre = grouper(liste, r => r.centre || '— non renseigné —');
  if(Object.keys(parCentre).length > 1){
    zone.appendChild(blocStats("📍 Par centre d'examen", parCentre));
  }

  const pied = document.createElement('div');
  pied.style.cssText = 'font-size:11px;color:var(--muted);line-height:1.6;margin-top:10px;';
  pied.textContent = 'Un taux calculé sur moins de ' + SEUIL_FIABLE +
    ' passages est signalé comme non significatif. ' +
    'Les résultats sont enregistrés au moment de la saisie dans « Examens passés ».';
  zone.appendChild(pied);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-stats.js'] = true;
