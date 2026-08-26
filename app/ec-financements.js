/* ============================================================
   ec-financements.js
   Les financements extérieurs.

   Deux suivis qui vivent au même endroit : les dossiers Pôle
   emploi et Région, et les sessions de code aménagé.

   Ce qui compte dans le premier, ce sont les échéances : un
   dossier dont la date passe est un remboursement perdu.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let dossiersPE = [];
let elevesCodeam = [];
let sessionCodeam = '';
let vueFinancement = 'pe';


/* Une date française vers l'ISO, pour comparer et trier */
function isoFinancement(v){
  const t = String(v || '').trim();
  if(!t) return '';
  const m = t.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if(!m) return '';
  const an = m[3].length === 2 ? '20' + m[3] : m[3];
  return an + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
}


/* Combien de jours nous séparent d'une échéance */
function joursAvantEcheance(v){
  const iso = isoFinancement(v);
  if(!iso) return null;
  const d = new Date(iso + 'T12:00:00');
  const auj = new Date(todayLocal() + 'T12:00:00');
  return Math.round((d - auj) / 86400000);
}


async function afficherFinancements(){
  const zone = $('financementsZone');
  if(!zone) return;

  zone.innerHTML = htmlAttente('Lecture des dossiers…');

  try{
    const [a, b] = await Promise.all([
      appelPrep({ action: 'peList' }),
      appelPrep({ action: 'codeamList' })
    ]);

    if(a && a.status === 'error') throw new Error(a.message);
    dossiersPE = (a && a.dossiers) || [];

    if(b && b.status !== 'error'){
      elevesCodeam = (b && b.eleves) || [];
      sessionCodeam = (b && b.session) || '';
    }
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' +
      String(e.message || e).replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';

  /* Deux suivis, deux boutons */
  const barre = document.createElement('div');
  barre.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;';

  [['pe', '💶 Pôle emploi et Région', dossiersPE.filter(x => !x.fini).length],
   ['codeam', '🎓 Code aménagé', elevesCodeam.length]].forEach(([cle, nom, n]) => {
    const b = document.createElement('button');
    b.type = 'button';
    const actif = (vueFinancement === cle);
    b.style.cssText = 'flex:1;padding:10px 8px;font-size:13px;border-radius:9px;' +
      'cursor:pointer;margin:0;line-height:1.3;' +
      'border:1px solid ' + (actif ? 'var(--orange)' : 'var(--line)') + ';' +
      'background:' + (actif ? 'var(--orange)' : 'transparent') + ';' +
      'color:' + (actif ? 'var(--navy-deep)' : 'var(--cream)') + ';' +
      (actif ? 'font-weight:800;' : '');
    b.innerHTML = nom + (n ? ' <span style="opacity:.7;">' + n + '</span>' : '');
    b.addEventListener('click', () => {
      vueFinancement = cle;
      afficherFinancements();
    });
    barre.appendChild(b);
  });
  zone.appendChild(barre);

  const z = document.createElement('div');
  zone.appendChild(z);

  if(vueFinancement === 'pe') dessinerPoleEmploi(z);
  else dessinerCodeAmenage(z);
}


/* ============================================================
   PÔLE EMPLOI ET RÉGION

   Chaque dossier a une échéance : celle des 30 heures pour Pôle
   emploi, celle du permis pour la Région. Passée, le
   remboursement est perdu.
   ============================================================ */

function echeanceDe(d){
  /* La Région et Pôle emploi ne regardent pas la même date */
  const region = /region/i.test(d.financeur || '');
  const v = region ? d.regPermis : d.trente;
  return { date: v, jours: joursAvantEcheance(v), region: region };
}


function dessinerPoleEmploi(zone){
  const actifs = dossiersPE.filter(x => !x.fini);

  /* Ce qui presse : dépassé, ou dans moins de deux mois */
  const presse = actifs
    .map(d => ({ d: d, e: echeanceDe(d) }))
    .filter(x => x.e.jours !== null && x.e.jours < 60)
    .sort((a, b) => a.e.jours - b.e.jours);

  if(presse.length){
    const al = document.createElement('details');
    al.open = true;
    al.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
      'padding:10px 12px;margin-bottom:12px;';
    al.innerHTML = '<summary style="cursor:pointer;font-size:13px;' +
      'font-weight:700;color:var(--accent-text);">⏳ ' + presse.length +
      ' échéance(s) proche(s)</summary>';

    const zl = document.createElement('div');
    zl.style.marginTop = '9px';

    presse.forEach(x => {
      const l = document.createElement('div');
      l.style.cssText = 'font-size:13px;line-height:1.5;padding:5px 0;' +
        'cursor:pointer;';

      const j = x.e.jours;
      const quoi = (j < 0)
        ? '<span style="color:var(--warn-text);">⚠️ dépassée depuis ' +
          Math.abs(j) + ' j</span>'
        : '<span style="color:var(--accent-text);">dans ' + j + ' j</span>';

      l.innerHTML = '<strong>' + x.d.eleve.replace(/</g, '&lt;') + '</strong>' +
        ' — ' + quoi + ' <span style="color:var(--muted);">· ' +
        (x.e.region ? 'permis' : '30h') + ' le ' + x.e.date + '</span>';
      l.addEventListener('click', () => ouvrirDossierPE(x.d));
      zl.appendChild(l);
    });

    al.appendChild(zl);
    zone.appendChild(al);
  }

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-bottom:10px;padding:12px;font-size:13px;';
  b.textContent = '➕ Ajouter un dossier';
  b.addEventListener('click', () => ouvrirDossierPE(null));
  zone.appendChild(b);

  if(!actifs.length){
    zone.innerHTML += '<div class="empty">Aucun dossier en cours.</div>';
    return;
  }

  /* Rangés par financeur : ce ne sont pas les mêmes démarches */
  const parFinanceur = {};
  actifs.forEach(d => {
    const f = d.financeur || '—';
    (parFinanceur[f] = parFinanceur[f] || []).push(d);
  });

  Object.keys(parFinanceur).sort().forEach(f => {
    const t = document.createElement('div');
    t.style.cssText = 'font-size:12px;color:var(--muted);margin:12px 0 6px;';
    t.textContent = (/region/i.test(f) ? '🏛️ ' : '💶 ') + f +
      ' · ' + parFinanceur[f].length + ' dossier(s)';
    zone.appendChild(t);

    parFinanceur[f]
      .sort((a, b) => {
        const ja = echeanceDe(a).jours, jb = echeanceDe(b).jours;
        if(ja === null) return 1;
        if(jb === null) return -1;
        return ja - jb;
      })
      .forEach(d => zone.appendChild(lignePE(d)));
  });

  /* Les dossiers terminés, rangés à part */
  const finis = dossiersPE.filter(x => x.fini);
  if(finis.length){
    const det = document.createElement('details');
    det.style.cssText = 'border:1px solid var(--line);border-radius:11px;' +
      'padding:9px 12px;margin-top:12px;';
    det.innerHTML = '<summary style="cursor:pointer;font-size:13px;' +
      'color:var(--muted);">✅ ' + finis.length + ' dossier(s) terminé(s)' +
      '</summary>';
    const zf = document.createElement('div');
    zf.style.marginTop = '9px';
    finis.forEach(d => zf.appendChild(lignePE(d)));
    det.appendChild(zf);
    zone.appendChild(det);
  }
}


function lignePE(d){
  const e = echeanceDe(d);
  const urgent = (e.jours !== null && e.jours < 60);

  const l = document.createElement('div');
  l.style.cssText = 'border:1px solid ' +
    (d.fini ? 'var(--line)' : urgent ? 'var(--orange)' : 'var(--line)') +
    ';border-radius:11px;padding:10px 12px;margin-bottom:8px;' +
    (d.fini ? 'opacity:.65;' : '');

  const h = document.createElement('div');
  h.style.cssText = 'display:flex;gap:9px;align-items:flex-start;';
  h.innerHTML = '<span style="flex:1;min-width:0;font-size:15px;' +
    'line-height:1.4;"><strong>' + d.eleve.replace(/</g, '&lt;') +
    '</strong>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      (d.total ? d.total + ' € · ' : '') +
      (e.date
        ? (e.region ? 'permis' : '30h') + ' le ' + e.date +
          (e.jours !== null
            ? ' · ' + (e.jours < 0
                ? '⚠️ dépassée'
                : e.jours + ' j')
            : '')
        : 'sans échéance') +
    '</div></span>';
  l.appendChild(h);

  /* Les dates du parcours, sur une ligne */
  const etapes = e.region
    ? [['Inscription', d.regInscription], ['Permis', d.regPermis]]
    : [['Inscription', d.inscription], ['Code', d.code], ['30h', d.trente]];

  const ze = document.createElement('div');
  ze.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;' +
    'padding-top:8px;border-top:1px solid rgba(255,255,255,.06);' +
    'font-size:12px;';
  ze.innerHTML = etapes.map(([n, v]) =>
    '<span style="color:var(--muted);">' + n + ' : ' +
    '<span style="color:' + (v ? 'var(--cream)' : 'var(--muted)') + ';">' +
    (v || '—') + '</span></span>').join('');
  l.appendChild(ze);

  if(d.remarque){
    const r = document.createElement('div');
    r.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;' +
      'margin-top:7px;white-space:pre-wrap;';
    r.textContent = d.remarque;
    l.appendChild(r);
  }

  const r2 = document.createElement('div');
  r2.style.cssText = 'display:flex;gap:8px;margin-top:9px;';

  const bM = document.createElement('button');
  bM.className = 'btn btn-secondary';
  bM.style.cssText = 'flex:1;padding:9px;font-size:12px;margin:0;';
  bM.textContent = '✏️ Modifier';
  bM.addEventListener('click', () => ouvrirDossierPE(d));
  r2.appendChild(bM);

  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.style.cssText = 'width:auto;padding:9px 11px;font-size:12px;margin:0;' +
    'flex-shrink:0;';
  bF.textContent = d.fini ? '↩️' : '✅';
  bF.title = d.fini ? 'Remettre en cours' : 'Marquer terminé';
  bF.addEventListener('click', async () => {
    try{
      await appelPrep({ action: 'peSet', ligne: d.ligne, fini: !d.fini });
      showToast(d.fini ? 'Remis en cours ✅' : 'Terminé ✅');
      afficherFinancements();
    }catch(err){ showToast('Impossible : ' + err.message); }
  });
  r2.appendChild(bF);

  l.appendChild(r2);
  return l;
}


function ouvrirDossierPE(d){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(500px, 95vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML = '<h3>' + (d ? '✏️ ' + d.eleve.replace(/</g, '&lt;')
                                : '➕ Nouveau dossier') + '</h3>' +

    (d ? '' :
      '<div class="duo">' +
        '<div><label for="peP">Prénom</label>' +
          '<input type="text" id="peP"></div>' +
        '<div><label for="peN">Nom</label>' +
          '<input type="text" id="peN"></div>' +
      '</div>') +

    '<label for="peFin">Financeur</label>' +
    '<select id="peFin">' +
      '<option value="">— à préciser —</option>' +
      '<option value="Région">🏛️ Région Bretagne</option>' +
      '<option value="Ouest">💶 Pôle emploi Ouest</option>' +
      '<option value="Sud">💶 Pôle emploi Sud</option>' +
    '</select>' +

    '<div id="peBlocPE">' +
      '<label for="peTotal">Montant accordé (€)</label>' +
      '<input type="number" id="peTotal" step="1" placeholder="Ex : 800">' +
      '<div class="duo">' +
        '<div><label for="peInsc">Inscription</label>' +
          '<input type="text" id="peInsc" placeholder="jj/mm/aaaa"></div>' +
        '<div><label for="peCode">Code</label>' +
          '<input type="text" id="peCode" placeholder="jj/mm/aaaa"></div>' +
      '</div>' +
      '<label for="pe30">Échéance des 30 heures</label>' +
      '<input type="text" id="pe30" placeholder="jj/mm/aaaa">' +
    '</div>' +

    '<div id="peBlocReg" style="display:none;">' +
      '<div class="duo">' +
        '<div><label for="peRegI">Inscription</label>' +
          '<input type="text" id="peRegI" placeholder="jj/mm/aaaa"></div>' +
        '<div><label for="peRegP">Échéance permis</label>' +
          '<input type="text" id="peRegP" placeholder="jj/mm/aaaa"></div>' +
      '</div>' +
    '</div>' +

    '<label for="peRem">Remarque</label>' +
    '<textarea id="peRem" rows="3" ' +
      'placeholder="Où en est la demande, ce qui reste à faire…"></textarea>';

  const selF = boite.querySelector('#peFin');

  /* La Région et Pôle emploi n'ont pas les mêmes étapes */
  const majBlocs = () => {
    const region = /region/i.test(selF.value);
    boite.querySelector('#peBlocPE').style.display = region ? 'none' : 'block';
    boite.querySelector('#peBlocReg').style.display = region ? 'block' : 'none';
  };
  selF.addEventListener('change', majBlocs);

  if(d){
    selF.value = d.financeur || '';
    boite.querySelector('#peTotal').value = d.total || '';
    boite.querySelector('#peInsc').value = d.inscription || '';
    boite.querySelector('#peCode').value = d.code || '';
    boite.querySelector('#pe30').value = d.trente || '';
    boite.querySelector('#peRegI').value = d.regInscription || '';
    boite.querySelector('#peRegP').value = d.regPermis || '';
    boite.querySelector('#peRem').value = d.remarque || '';
  }
  majBlocs();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bA);

  if(d){
    const bS = document.createElement('button');
    bS.className = 'btn btn-secondary';
    bS.style.cssText = 'width:auto;padding:12px 13px;font-size:12px;' +
      'color:var(--red);border-color:var(--red);';
    bS.textContent = '🗑️';
    bS.addEventListener('click', async () => {
      if(!await confirmer('Retirer ' + d.eleve + ' du suivi ?\n\n' +
          'La ligne sera supprimée du classeur.')) return;
      try{
        await appelPrep({ action: 'peDelete', ligne: d.ligne });
        document.body.removeChild(fond);
        showToast('Retiré ✅');
        afficherFinancements();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bS);
  }

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '💾 Enregistrer';
  bO.addEventListener('click', async () => {
    const envoi = { action: 'peSet', ligne: d ? d.ligne : 0 };

    if(!d){
      envoi.prenom = boite.querySelector('#peP').value.trim();
      envoi.nom = boite.querySelector('#peN').value.trim();
      if(!envoi.prenom && !envoi.nom){
        showToast('Indique au moins le nom.');
        return;
      }
    }

    envoi.financeur = selF.value;
    envoi.total = boite.querySelector('#peTotal').value;
    envoi.inscription = boite.querySelector('#peInsc').value.trim();
    envoi.code = boite.querySelector('#peCode').value.trim();
    envoi.trente = boite.querySelector('#pe30').value.trim();
    envoi.regInscription = boite.querySelector('#peRegI').value.trim();
    envoi.regPermis = boite.querySelector('#peRegP').value.trim();
    envoi.remarque = boite.querySelector('#peRem').value;

    bO.disabled = true;
    bO.textContent = 'Enregistrement…';
    try{
      await appelPrep(envoi);
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      afficherFinancements();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bO.disabled = false;
      bO.textContent = '💾 Enregistrer';
    }
  });
  r.appendChild(bO);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  if(!d) setTimeout(() => boite.querySelector('#peP').focus(), 100);
}


/* ============================================================
   LE CODE AMÉNAGÉ

   Une session, des élèves, cinq étapes chacun jusqu'à
   l'inscription validée.
   ============================================================ */

const ETAPES_CODEAM = [
  { cle:'demande',     nom:'Demande envoyée' },
  { cle:'inscritDdtm', nom:'Inscription envoyée à la DDTM' },
  { cle:'redevance',   nom:'Redevance payée' },
  { cle:'valide',      nom:'Inscription validée' }
];


function dessinerCodeAmenage(zone){
  /* La session en cours, modifiable */
  const s = document.createElement('div');
  s.style.cssText = 'display:flex;gap:9px;align-items:center;' +
    'margin-bottom:12px;padding:10px 12px;border:1px solid var(--orange);' +
    'border-radius:11px;';
  s.innerHTML = '<span style="flex:1;min-width:0;font-size:14px;">' +
    '<strong>' + (sessionCodeam || 'Session non précisée').replace(/</g, '&lt;') +
    '</strong></span>';

  const bS = document.createElement('button');
  bS.className = 'btn btn-secondary';
  bS.style.cssText = 'width:auto;padding:8px 11px;font-size:12px;margin:0;';
  bS.textContent = '✏️';
  bS.title = 'Changer la session';
  bS.addEventListener('click', async () => {
    const v = await demander('Quelle session ?', sessionCodeam,
                             'Code aménagé');
    if(v === null) return;
    try{
      await appelPrep({ action: 'codeamSet', session: v });
      showToast('Session mise à jour ✅');
      afficherFinancements();
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
  s.appendChild(bS);
  zone.appendChild(s);

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-bottom:10px;padding:12px;font-size:13px;';
  b.textContent = '➕ Ajouter un élève';
  b.addEventListener('click', () => ouvrirEleveCodeam(null));
  zone.appendChild(b);

  if(!elevesCodeam.length){
    zone.innerHTML += '<div class="empty">Aucun élève sur cette session.</div>';
    return;
  }

  /* Ce qui attend encore quelque chose */
  const enCours = elevesCodeam.filter(x => !x.valide).length;
  if(enCours){
    const t = document.createElement('div');
    t.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;';
    t.textContent = enCours + ' inscription(s) non validée(s) sur ' +
                    elevesCodeam.length;
    zone.appendChild(t);
  }

  elevesCodeam.forEach(e => zone.appendChild(ligneCodeam(e)));
}


function ligneCodeam(e){
  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid ' +
    (e.valide ? 'var(--line)' : 'var(--orange)') +
    ';border-radius:11px;padding:10px 12px;margin-bottom:8px;';

  const faites = ETAPES_CODEAM.filter(x => e[x.cle]).length;

  const som = document.createElement('summary');
  som.style.cssText = 'cursor:pointer;font-size:15px;font-weight:700;' +
    'color:var(--cream);list-style:none;';
  som.innerHTML = (e.valide ? '✅ ' : '🎓 ') + e.eleve.replace(/</g, '&lt;') +
    '<div style="font-size:11px;font-weight:400;color:var(--muted);' +
      'margin-top:2px;">' + faites + '/' + ETAPES_CODEAM.length +
      ' étape(s)' +
      (e.souhaite ? ' · ' + e.souhaite.replace(/</g, '&lt;') : '') +
      (e.resultat ? ' · ' + e.resultat.replace(/</g, '&lt;') : '') +
    '</div>';
  d.appendChild(som);

  const corps = document.createElement('div');
  corps.style.marginTop = '10px';

  /* Souhaite-t-il faire la session ? */
  const lb = document.createElement('label');
  lb.textContent = 'Souhaite faire la session';
  corps.appendChild(lb);

  const sel = document.createElement('select');
  sel.innerHTML = ['', 'En attente de réponse', 'Oui', 'Non']
    .map(v => '<option value="' + v + '"' +
      (v === e.souhaite ? ' selected' : '') + '>' +
      (v || '—') + '</option>').join('');
  sel.addEventListener('change', async () => {
    try{
      await appelPrep({ action: 'codeamSet', ligne: e.ligne,
                        souhaite: sel.value });
      e.souhaite = sel.value;
      showToast('Enregistré ✅');
      afficherFinancements();
    }catch(err){ showToast('Impossible : ' + err.message); }
  });
  corps.appendChild(sel);

  /* Les quatre étapes */
  const ze = document.createElement('div');
  ze.style.cssText = 'margin:10px 0;padding:9px 0;' +
    'border-top:1px solid rgba(255,255,255,.06);' +
    'border-bottom:1px solid rgba(255,255,255,.06);';

  ETAPES_CODEAM.forEach(et => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:10px;' +
      'text-transform:none;font-size:14px;color:var(--cream);margin:0 0 7px;' +
      'font-weight:400;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!e[et.cle];
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin:0;';
    cb.addEventListener('change', async () => {
      cb.disabled = true;
      try{
        const envoi = { action: 'codeamSet', ligne: e.ligne };
        envoi[et.cle] = cb.checked;
        await appelPrep(envoi);
        e[et.cle] = cb.checked;
        showToast('Enregistré ✅');
        afficherFinancements();
      }catch(err){
        cb.checked = !cb.checked;
        showToast('Impossible : ' + err.message);
      }
      cb.disabled = false;
    });
    l.appendChild(cb);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = et.nom;
    l.appendChild(t);
    ze.appendChild(l);
  });
  corps.appendChild(ze);

  if(e.remarque){
    const r = document.createElement('div');
    r.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;' +
      'margin-bottom:9px;white-space:pre-wrap;';
    r.textContent = e.remarque;
    corps.appendChild(r);
  }

  const r2 = document.createElement('div');
  r2.style.cssText = 'display:flex;gap:8px;';

  const bM = document.createElement('button');
  bM.className = 'btn btn-secondary';
  bM.style.cssText = 'flex:1;padding:9px;font-size:12px;margin:0;';
  bM.textContent = '✏️ Résultat et remarque';
  bM.addEventListener('click', () => ouvrirEleveCodeam(e));
  r2.appendChild(bM);

  const bS = document.createElement('button');
  bS.className = 'btn btn-secondary';
  bS.style.cssText = 'width:auto;padding:9px 11px;font-size:12px;margin:0;' +
    'flex-shrink:0;color:var(--red);border-color:var(--red);';
  bS.textContent = '🗑️';
  bS.addEventListener('click', async () => {
    if(!await confirmer('Retirer ' + e.eleve + ' de la session ?')) return;
    try{
      await appelPrep({ action: 'codeamDelete', ligne: e.ligne });
      showToast('Retiré ✅');
      afficherFinancements();
    }catch(err){ showToast('Impossible : ' + err.message); }
  });
  r2.appendChild(bS);

  corps.appendChild(r2);
  d.appendChild(corps);
  return d;
}


function ouvrirEleveCodeam(e){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(440px, 94vw)';

  boite.innerHTML = '<h3>' + (e ? '✏️ ' + e.eleve.replace(/</g, '&lt;')
                                : '➕ Ajouter un élève') + '</h3>' +
    (e ? '' :
      '<label for="caNom">Nom et prénom</label>' +
      '<input type="text" id="caNom" list="listeEleves" autocomplete="off">') +
    '<label for="caRes">Résultat</label>' +
    '<input type="text" id="caRes" placeholder="Ex : Réussi, Ajourné…">' +
    '<label for="caRem">Remarque</label>' +
    '<textarea id="caRem" rows="3" ' +
      'placeholder="Ce qui reste à faire, ce qui manque…"></textarea>';

  if(e){
    boite.querySelector('#caRes').value = e.resultat || '';
    boite.querySelector('#caRem').value = e.remarque || '';
  }

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bA);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '💾 Enregistrer';
  bO.addEventListener('click', async () => {
    const envoi = { action: 'codeamSet', ligne: e ? e.ligne : 0 };

    if(!e){
      envoi.eleve = boite.querySelector('#caNom').value.trim();
      if(!envoi.eleve){ showToast('Indique le nom.'); return; }
    }
    envoi.resultat = boite.querySelector('#caRes').value.trim();
    envoi.remarque = boite.querySelector('#caRem').value;

    bO.disabled = true;
    try{
      await appelPrep(envoi);
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      afficherFinancements();
    }catch(err){
      showToast('Impossible : ' + err.message);
      bO.disabled = false;
    }
  });
  r.appendChild(bO);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  if(!e) setTimeout(() => boite.querySelector('#caNom').focus(), 100);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-financements.js'] = true;
