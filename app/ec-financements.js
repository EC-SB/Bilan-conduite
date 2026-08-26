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
    const a = await appelPrep({ action: 'peList' });
    if(a && a.status === 'error') throw new Error(a.message);
    dossiersPE = (a && a.dossiers) || [];
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' +
      String(e.message || e).replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';
  dessinerPoleEmploi(zone);
}


/* ============================================================
   PÔLE EMPLOI ET RÉGION

   Chaque dossier a une échéance : celle des 30 heures pour Pôle
   emploi, celle du permis pour la Région. Passée, le
   remboursement est perdu.
   ============================================================ */

/* « Région » porte un accent : le chercher tel quel échoue.
   On normalise avant de comparer. */
function estRegion(v){
  return normaliserMot(String(v || '')).indexOf('region') !== -1;
}


/* Les versements attendus, selon le financeur.

   France Travail en verse trois, la Région deux. Chacun suit son
   chemin : l'échéance, le courrier qu'on envoie, puis ce qu'il
   devient. */
function versementsDe(d){
  const region = estRegion(d.financeur);

  if(region){
    return [
      { nom:'Inscription', echeance:'regInscription',
        courrier:'courrierInscription', etat:'etatInscription' },
      { nom:'Permis', echeance:'regPermis',
        courrier:'courrierPermis', etat:'etatPermis' }
    ];
  }

  return [
    { nom:'Inscription', echeance:'inscription',
      courrier:'courrierInscription', etat:'etatInscription' },
    { nom:'Code', echeance:'code',
      courrier:'courrierCode', etat:'etatCode' },
    { nom:'30 heures', echeance:'trente',
      courrier:'courrier30', etat:'etat30' }
  ];
}


/* Ce que devient un versement */
const ETATS_VERSEMENT = [
  { cle:'', nom:'— en cours', couleur:'var(--muted)' },
  { cle:'paye', nom:'✅ Payé', couleur:'var(--accent-text)' },
  { cle:'abandon', nom:'⛔ Abandon', couleur:'var(--red)' }
];

function libelleEtat(v){
  const e = ETATS_VERSEMENT.find(x => x.cle === String(v || ''));
  return e || ETATS_VERSEMENT[0];
}


function echeanceDe(d){
  /* La Région et Pôle emploi ne regardent pas la même date */
  const region = estRegion(d.financeur);
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
    t.textContent = (estRegion(f) ? '🏛️ ' : '💶 ') + f +
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

  /* Chaque versement : son échéance, son courrier, son sort */
  const ze = document.createElement('div');
  ze.style.cssText = 'margin-top:8px;padding-top:8px;' +
    'border-top:1px solid rgba(255,255,255,.06);font-size:12px;';

  versementsDe(d).forEach(v => {
    const et = libelleEtat(d[v.etat]);

    const li = document.createElement('div');
    li.style.cssText = 'display:flex;gap:8px;align-items:center;' +
      'padding:3px 0;line-height:1.5;';
    li.innerHTML =
      '<span style="flex:1;min-width:0;color:var(--muted);">' + v.nom +
        ' <span style="color:' + (d[v.echeance] ? 'var(--cream)' : 'var(--muted)') +
        ';">' + (d[v.echeance] || '—') + '</span>' +
        (d[v.courrier]
          ? ' <span style="color:var(--muted);">· 📨 ' + d[v.courrier] + '</span>'
          : '') +
      '</span>' +
      '<span style="flex-shrink:0;color:' + et.couleur + ';">' +
        et.nom + '</span>';
    ze.appendChild(li);
  });

  /* Le remboursement à la Région, quand il y en a eu un */
  if(e.region && d.rembourse){
    const rb = document.createElement('div');
    rb.style.cssText = 'padding:5px 0 0;color:var(--warn-text);' +
      'line-height:1.5;';
    rb.textContent = '↩️ Remboursé à la Région' +
      (d.montantRembourse ? ' : ' + d.montantRembourse + ' €' : '') +
      ' le ' + d.rembourse;
    ze.appendChild(rb);
  }

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
  boite.style.cssText = 'max-width:min(520px, 95vw);max-height:92vh;overflow-y:auto;';

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
      '<option value="Ouest">💶 France Travail Ouest</option>' +
      '<option value="Sud">💶 France Travail Sud</option>' +
    '</select>' +

    '<label for="peTotal">Montant accordé (€)</label>' +
    '<input type="number" id="peTotal" step="1" placeholder="Ex : 800">';

  const selF = boite.querySelector('#peFin');
  if(d) selF.value = d.financeur || '';
  if(d) boite.querySelector('#peTotal').value = d.total || '';

  /* Les versements : chacun a son échéance, son courrier, son
     sort. La liste dépend du financeur. */
  const zv = document.createElement('div');
  boite.appendChild(zv);

  const champs = {};

  const dessinerVersements = () => {
    zv.innerHTML = '';
    for(const k in champs) delete champs[k];

    const t = document.createElement('div');
    t.style.cssText = 'font-size:12px;color:var(--muted);margin:14px 0 8px;';
    t.textContent = 'Les versements attendus';
    zv.appendChild(t);

    versementsDe({ financeur: selF.value }).forEach(v => {
      const bloc = document.createElement('div');
      bloc.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
        'padding:10px 12px;margin-bottom:9px;';

      const n = document.createElement('div');
      n.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:8px;';
      n.textContent = v.nom;
      bloc.appendChild(n);

      const duo = document.createElement('div');
      duo.className = 'duo';

      const champ = (cle, libelle, valeur) => {
        const w = document.createElement('div');
        const l = document.createElement('label');
        l.textContent = libelle;
        w.appendChild(l);
        const i = document.createElement('input');
        i.type = 'text';
        i.value = valeur || '';
        i.placeholder = 'jj/mm/aaaa';
        i.style.margin = '0';
        w.appendChild(i);
        duo.appendChild(w);
        champs[cle] = i;
      };

      champ(v.echeance, 'Échéance', d ? d[v.echeance] : '');
      champ(v.courrier, '📨 Courrier envoyé', d ? d[v.courrier] : '');
      bloc.appendChild(duo);

      /* Ce qu'il est devenu : chaque part suit son chemin */
      const le = document.createElement('label');
      le.textContent = 'Où en est ce versement';
      bloc.appendChild(le);

      const sel = document.createElement('select');
      sel.style.margin = '0';
      sel.innerHTML = ETATS_VERSEMENT.map(e =>
        '<option value="' + e.cle + '"' +
        ((d && String(d[v.etat] || '') === e.cle) ? ' selected' : '') + '>' +
        e.nom + '</option>').join('');
      bloc.appendChild(sel);
      champs[v.etat] = sel;

      zv.appendChild(bloc);
    });

    /* Le remboursement : la Région seule le réclame */
    if(estRegion(selF.value)){
      const bloc = document.createElement('div');
      bloc.style.cssText = 'border:1px solid var(--warn-bg);border-radius:10px;' +
        'padding:10px 12px;margin-bottom:9px;background:var(--warn-bg);';

      const n = document.createElement('div');
      n.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:3px;' +
        'color:var(--warn-text);';
      n.textContent = '↩️ Remboursement à la Région';
      bloc.appendChild(n);

      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;' +
        'line-height:1.5;';
      a.textContent = "Quand l'élève abandonne, la Région réclame ce " +
        'qu\'elle a versé.';
      bloc.appendChild(a);

      const duo = document.createElement('div');
      duo.className = 'duo';

      const w1 = document.createElement('div');
      w1.innerHTML = '<label>Date du remboursement</label>';
      const i1 = document.createElement('input');
      i1.type = 'text';
      i1.value = (d && d.rembourse) || '';
      i1.placeholder = 'jj/mm/aaaa';
      i1.style.margin = '0';
      w1.appendChild(i1);
      duo.appendChild(w1);
      champs.rembourse = i1;

      const w2 = document.createElement('div');
      w2.innerHTML = '<label>Montant (€)</label>';
      const i2 = document.createElement('input');
      i2.type = 'number';
      i2.step = '0.01';
      i2.value = (d && d.montantRembourse) || '';
      i2.style.margin = '0';
      w2.appendChild(i2);
      duo.appendChild(w2);
      champs.montantRembourse = i2;

      bloc.appendChild(duo);
      zv.appendChild(bloc);
    }
  };

  selF.addEventListener('change', dessinerVersements);
  dessinerVersements();

  const lr = document.createElement('label');
  lr.textContent = 'Remarque';
  boite.appendChild(lr);

  const zr = document.createElement('textarea');
  zr.rows = 3;
  zr.value = (d && d.remarque) || '';
  zr.placeholder = 'Où en est la demande, ce qui reste à faire…';
  boite.appendChild(zr);

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
    envoi.remarque = zr.value;

    Object.keys(champs).forEach(k => {
      envoi[k] = String(champs[k].value || '').trim();
    });

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


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-financements.js'] = true;
