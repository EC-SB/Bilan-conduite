/* ============================================================
   ec-flotte.js
   Le suivi de la flotte.

   Un principe : on saisit ce qui est fait, l'application en déduit
   ce qui vient. Un contrôle technique enregistré pose le suivant,
   une révision faite pose la prochaine au kilométrage voulu, un
   relevé de compteur met le véhicule à jour.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let flotte = [];
let evenementsFlotte = [];

const CATEGORIES_FLOTTE = [
  { cle:'voiture',  nom:'🚗 Voiture',  ct:'tous les 2 ans' },
  { cle:'moto',     nom:'🏍️ Moto',     ct:'tous les 3 ans' },
  { cle:'scooter',  nom:'🛵 Scooter',  ct:'tous les 3 ans' },
  { cle:'125',      nom:'🏍️ 125 cm³',  ct:'tous les 3 ans' },
  { cle:'remorque', nom:'🚚 Remorque', ct:'pas de contrôle' }
];

const TYPES_EVENEMENT = [
  { cle:'km',         nom:'🔢 Relevé de compteur' },
  { cle:'revision',   nom:'🔧 Révision / entretien' },
  { cle:'ct',         nom:'📋 Contrôle technique' },
  { cle:'garage',     nom:'🏭 Passage au garage' },
  { cle:'pneus',      nom:'🛞 Pneumatiques' },
  { cle:'panne',      nom:'⚠️ Problème signalé' },
  { cle:'accessoire', nom:'📦 Accessoire' },
  { cle:'autre',      nom:'📝 Autre' }
];

/* Combien de jours nous séparent d'une date */
function joursAvant(iso){
  if(!iso) return null;
  const d = new Date(iso + 'T12:00:00');
  if(isNaN(d.getTime())) return null;
  const auj = new Date();
  auj.setHours(12, 0, 0, 0);
  return Math.round((d - auj) / 86400000);
}

/* Ce qui réclame une décision sur un véhicule */
function alertesVehicule(v){
  const out = [];

  const jCT = joursAvant(v.prochainCT);
  if(jCT !== null){
    if(jCT < 0) out.push({ niveau:'rouge', texte:'🔴 CT dépassé de ' + (-jCT) + ' j' });
    else if(jCT <= 30) out.push({ niveau:'orange', texte:'🟠 CT dans ' + jCT + ' j' });
    else if(jCT <= 60) out.push({ niveau:'info', texte:'📋 CT dans ' + jCT + ' j' });
  }

  const jAss = joursAvant(v.assuranceJusquau);
  if(jAss !== null){
    if(jAss < 0) out.push({ niveau:'rouge', texte:'🔴 Assurance expirée' });
    else if(jAss <= 30) out.push({ niveau:'orange', texte:'🟠 Assurance dans ' + jAss + ' j' });
  }

  /* La révision se juge au compteur, pas au calendrier */
  if(v.prochaineRevisionKm && v.km){
    const reste = v.prochaineRevisionKm - v.km;
    if(reste <= 0) out.push({ niveau:'rouge', texte:'🔴 Révision dépassée de ' +
      Math.abs(reste).toLocaleString('fr-FR') + ' km' });
    else if(reste <= 2000) out.push({ niveau:'orange', texte:'🟠 Révision dans ' +
      reste.toLocaleString('fr-FR') + ' km' });
  }

  /* Un problème signalé et non traité */
  const pannes = evenementsFlotte.filter(e =>
    e.idVehicule === v.id && e.type === 'panne' && e.etat !== 'fait');
  if(pannes.length){
    out.push({ niveau:'rouge', texte:'⚠️ ' + pannes.length + ' problème(s) signalé(s)' });
  }

  /* Un rendez-vous pris */
  const rdv = evenementsFlotte.filter(e =>
    e.idVehicule === v.id && e.etat === 'prevu' && e.type !== 'panne');
  if(rdv.length){
    out.push({ niveau:'info', texte:'📅 ' + rdv.length + ' rendez-vous prévu(s)' });
  }

  return out;
}

/* Ce qui demande une action, toutes catégories confondues */
function nbAlertesFlotte(){
  return flotte.filter(v => v.etat !== 'vendu' &&
    alertesVehicule(v).some(a => a.niveau === 'rouge' || a.niveau === 'orange')).length;
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */

async function afficherFlotte(){
  const zone = $('flotteZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture de la flotte…</div>';
  try{
    const d = await appelPrep({ action: 'flotteList' });
    flotte = (d && d.vehicules) || [];
    evenementsFlotte = (d && d.evenements) || [];
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';
  majPastilleFlotte();

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-bottom:12px;padding:13px;font-size:14px;';
  b.textContent = '➕ Ajouter un véhicule';
  b.addEventListener('click', () => ouvrirFicheVehicule(null));
  zone.appendChild(b);

  if(!flotte.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucun véhicule enregistré.<br>' +
      '<span style="font-size:12px;">Commence par en ajouter un : ' +
      'les échéances se calculeront seules.</span>';
    zone.appendChild(v);
    return;
  }

  /* Ce qui réclame une décision, en tête */
  zone.appendChild(blocAurgent());

  /* Puis la flotte, groupée par catégorie */
  const actifs = flotte.filter(v => v.etat !== 'vendu');
  const sortis = flotte.filter(v => v.etat === 'vendu');

  CATEGORIES_FLOTTE.forEach(cat => {
    const lot = actifs.filter(v => v.categorie === cat.cle);
    if(!lot.length) return;

    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
      'margin:16px 0 8px;';
    t.textContent = cat.nom + ' · ' + lot.length;
    zone.appendChild(t);

    lot.forEach(v => zone.appendChild(ligneVehicule(v)));
  });

  if(sortis.length){
    const d = document.createElement('details');
    d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
      'padding:10px 12px;margin-top:16px;';
    d.innerHTML = '<summary style="cursor:pointer;font-size:13px;color:var(--muted);">' +
      '🗂️ ' + sortis.length + ' véhicule(s) sorti(s) du parc</summary>';
    const z = document.createElement('div');
    z.style.marginTop = '10px';
    sortis.forEach(v => z.appendChild(ligneVehicule(v)));
    d.appendChild(z);
    zone.appendChild(d);
  }
}


/* Ce qui ne peut pas attendre */
function blocAurgent(){
  const d = document.createElement('details');
  const urgents = [];

  flotte.filter(v => v.etat !== 'vendu').forEach(v => {
    alertesVehicule(v)
      .filter(a => a.niveau === 'rouge' || a.niveau === 'orange')
      .forEach(a => urgents.push({ v: v, a: a }));
  });

  if(!urgents.length){
    d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
      'padding:10px 12px;margin-bottom:6px;';
    d.innerHTML = '<summary style="cursor:pointer;font-size:13px;' +
      'color:var(--accent-text);">✅ Rien à traiter · flotte à jour</summary>';
    return d;
  }

  d.open = true;
  d.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:10px 12px;margin-bottom:6px;';
  d.innerHTML = '<summary style="cursor:pointer;font-size:14px;font-weight:700;' +
    'color:var(--accent-text);">⚠️ À traiter — ' + urgents.length + '</summary>';

  /* Les dépassements avant les échéances proches */
  urgents.sort((x, y) => (x.a.niveau === 'rouge' ? 0 : 1) -
                         (y.a.niveau === 'rouge' ? 0 : 1));

  urgents.forEach(u => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:9px;align-items:center;padding:7px 0;' +
      'font-size:13px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05);';
    l.innerHTML = '<strong style="min-width:80px;">' +
      u.v.nom.replace(/</g, '&lt;') + '</strong>' +
      '<span style="flex:1;min-width:0;color:' +
      (u.a.niveau === 'rouge' ? 'var(--red)' : 'var(--warn-text)') + ';">' +
      u.a.texte + '</span>';
    l.addEventListener('click', () => ouvrirFicheVehicule(u.v));
    d.appendChild(l);
  });

  return d;
}


/* Un véhicule dans la liste */
function ligneVehicule(v){
  const l = document.createElement('div');
  const alertes = alertesVehicule(v);
  const rouge = alertes.some(a => a.niveau === 'rouge');
  const orange = alertes.some(a => a.niveau === 'orange');

  l.style.cssText = 'display:flex;gap:11px;align-items:center;' +
    'border:1px solid ' + (rouge ? 'var(--red)' : orange ? 'var(--orange)' : 'var(--line)') +
    ';border-radius:10px;padding:10px 12px;margin-bottom:6px;cursor:pointer;' +
    (v.etat === 'vendu' ? 'opacity:.5;' : '');

  const cat = CATEGORIES_FLOTTE.find(c => c.cle === v.categorie);
  const ic = document.createElement('div');
  ic.style.cssText = 'font-size:24px;flex-shrink:0;width:34px;text-align:center;';
  ic.textContent = (cat ? cat.nom.split(' ')[0] : '🚗');
  l.appendChild(ic);

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:14px;line-height:1.4;';
  t.innerHTML =
    '<strong>' + v.nom.replace(/</g, '&lt;') + '</strong>' +
    (v.immat ? ' <span style="font-size:11px;color:var(--muted);">' +
      v.immat.replace(/</g, '&lt;') + '</span>' : '') +
    (v.etat === 'immobilise' ? ' <span style="font-size:11px;color:var(--red);">' +
      '⛔ immobilisé</span>' : '') +
    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      (v.km ? v.km.toLocaleString('fr-FR') + ' km' : 'km à relever') +
      (v.site ? ' · ' + v.site.replace(/</g, '&lt;') : '') +
      (v.boite ? ' · ' + v.boite.toUpperCase() : '') +
    '</div>' +
    (alertes.length
      ? '<div style="font-size:11px;margin-top:3px;color:' +
        (rouge ? 'var(--red)' : orange ? 'var(--warn-text)' : 'var(--muted)') + ';">' +
        alertes.map(a => a.texte).join(' · ') + '</div>'
      : '');
  l.appendChild(t);

  /* Relever le compteur : le geste le plus fréquent */
  const bKm = document.createElement('button');
  bKm.className = 'btn btn-secondary';
  bKm.style.cssText = 'width:auto;padding:8px 11px;font-size:14px;margin:0;flex-shrink:0;';
  bKm.textContent = '🔢';
  bKm.title = 'Relever le compteur';
  bKm.addEventListener('click', ev => {
    ev.stopPropagation();
    ouvrirEvenement(v, { type: 'km' });
  });
  l.appendChild(bKm);

  l.addEventListener('click', () => ouvrirFicheVehicule(v));
  return l;
}


/* ============================================================
   LA FICHE D'UN VÉHICULE
   ============================================================ */

function ouvrirFicheVehicule(v){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 95vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML =
    '<h3>' + (v ? v.nom.replace(/</g, '&lt;') : 'Nouveau véhicule') + '</h3>' +

    '<div class="duo">' +
      '<div><label for="vNom">Nom court</label>' +
        '<input type="text" id="vNom" placeholder="Ex : A3 4"></div>' +
      '<div><label for="vCat">Catégorie</label><select id="vCat">' +
        CATEGORIES_FLOTTE.map(c => '<option value="' + c.cle + '">' + c.nom +
                                   '</option>').join('') +
      '</select></div>' +
    '</div>' +

    '<div class="duo">' +
      '<div><label for="vModele">Marque et modèle</label>' +
        '<input type="text" id="vModele" placeholder="Ex : Audi A3 Sportback"></div>' +
      '<div><label for="vImmat">Immatriculation</label>' +
        '<input type="text" id="vImmat" placeholder="AA-123-BB"></div>' +
    '</div>' +

    '<div class="duo">' +
      '<div><label for="vMec">1re mise en circulation</label>' +
        '<input type="date" id="vMec"></div>' +
      '<div><label for="vBoite">Boîte</label><select id="vBoite">' +
        '<option value="">—</option>' +
        '<option value="bva">Automatique</option>' +
        '<option value="bvm">Manuelle</option>' +
      '</select></div>' +
    '</div>' +

    '<div class="duo">' +
      '<div><label for="vSite">Site</label><select id="vSite">' +
        '<option value="">—</option>' +
        '<option value="Saint-Brieuc">Saint-Brieuc</option>' +
        '<option value="Loudéac">Loudéac</option>' +
      '</select></div>' +
      '<div><label for="vEtat">État</label><select id="vEtat">' +
        '<option value="actif">En service</option>' +
        '<option value="immobilise">⛔ Immobilisé</option>' +
        '<option value="vendu">Sorti du parc</option>' +
      '</select></div>' +
    '</div>' +

    '<div style="border-top:1px solid var(--line);margin:14px 0 10px;padding-top:12px;' +
      'font-size:13px;font-weight:700;color:var(--accent-text);">📋 Échéances</div>' +

    '<div class="duo">' +
      '<div><label for="vCT">Dernier contrôle technique</label>' +
        '<input type="date" id="vCT"></div>' +
      '<div><label for="vAss">Assurance jusqu\'au</label>' +
        '<input type="date" id="vAss"></div>' +
    '</div>' +
    '<div id="vProchainCT" style="font-size:12px;color:var(--muted);' +
      'margin:-6px 0 12px;line-height:1.5;"></div>' +

    '<div class="duo">' +
      '<div><label for="vPeriod">Révision tous les … km</label>' +
        '<input type="number" id="vPeriod" inputmode="numeric" placeholder="Ex : 20000"></div>' +
      '<div><label for="vRevKm">Dernière révision à … km</label>' +
        '<input type="number" id="vRevKm" inputmode="numeric"></div>' +
    '</div>' +

    '<div style="border-top:1px solid var(--line);margin:14px 0 10px;padding-top:12px;' +
      'font-size:13px;font-weight:700;color:var(--accent-text);">📦 À bord</div>' +

    '<label for="vAcc">Accessoires</label>' +
    '<textarea id="vAcc" rows="3" placeholder="Ex : triangle, gilet, constat, ' +
      'carte carburant, disque bleu, chargeur"></textarea>' +

    '<label for="vRem">Remarque</label>' +
    '<textarea id="vRem" rows="2"></textarea>';

  if(v){
    boite.querySelector('#vNom').value = v.nom || '';
    boite.querySelector('#vCat').value = v.categorie || 'voiture';
    boite.querySelector('#vModele').value = v.modele || '';
    boite.querySelector('#vImmat').value = v.immat || '';
    boite.querySelector('#vMec').value = v.miseEnCirculation || '';
    boite.querySelector('#vBoite').value = v.boite || '';
    boite.querySelector('#vSite').value = v.site || '';
    boite.querySelector('#vEtat').value = v.etat || 'actif';
    boite.querySelector('#vCT').value = v.dernierCT || '';
    boite.querySelector('#vAss').value = v.assuranceJusquau || '';
    boite.querySelector('#vPeriod').value = v.periodiciteKm || '';
    boite.querySelector('#vRevKm').value = v.revisionKm || '';
    boite.querySelector('#vAcc').value = v.accessoires || '';
    boite.querySelector('#vRem').value = v.remarque || '';
  }

  /* Ce que l'application déduit, montré au fur et à mesure */
  const zCT = boite.querySelector('#vProchainCT');
  const majDeduit = () => {
    const cat = boite.querySelector('#vCat').value;
    const regle = { voiture:[48, 24], moto:[60, 36], scooter:[60, 36],
                    '125':[60, 36] }[cat];

    if(!regle){
      zCT.innerHTML = 'Cette catégorie n\'est pas soumise au contrôle technique.';
      return;
    }

    const dernier = boite.querySelector('#vCT').value;
    const mec = boite.querySelector('#vMec').value;
    const base = dernier || mec;
    if(!base){
      zCT.innerHTML = '⏳ Renseigne la mise en circulation ou le dernier contrôle : ' +
        'le prochain se calculera seul.';
      return;
    }

    const d = new Date(base + 'T12:00:00');
    d.setMonth(d.getMonth() + (dernier ? regle[1] : regle[0]));
    const iso = d.toISOString().slice(0, 10);
    const j = joursAvant(iso);

    zCT.innerHTML = '📋 Prochain contrôle : <strong>' +
      (typeof dateEnToutesLettres === 'function' ? dateEnToutesLettres(iso) : iso) +
      '</strong>' + (j !== null
        ? ' <span style="color:' + (j < 0 ? 'var(--red)' : j <= 60 ? 'var(--warn-text)' : 'var(--muted)') +
          ';">— ' + (j < 0 ? 'dépassé de ' + (-j) + ' jours' : 'dans ' + j + ' jours') + '</span>'
        : '') +
      (dernier ? '' : '<br><span style="font-size:11px;">Premier contrôle, ' +
        'calculé depuis la mise en circulation.</span>');
  };

  ['#vCat', '#vCT', '#vMec'].forEach(s =>
    boite.querySelector(s).addEventListener('change', majDeduit));
  majDeduit();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Fermer';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  if(v){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.title = 'Supprimer ce véhicule et son historique';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer ' + v.nom + ' ?\n\n' +
          'Tout son historique part avec — entretiens, contrôles, incidents.\n' +
          'Pour un véhicule revendu, préfère « Sorti du parc ».')) return;
      try{
        await appelPrep({ action: 'flotteDelete', id: v.id });
        document.body.removeChild(fond);
        showToast('Supprimé ✅');
        afficherFlotte();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = v ? '💾 Enregistrer' : '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    const nom = boite.querySelector('#vNom').value.trim();
    if(!nom){ showToast('Donne un nom court au véhicule.'); return; }

    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      await appelPrep({
        action: 'flotteSet',
        id: v ? v.id : '',
        nom: nom,
        categorie: boite.querySelector('#vCat').value,
        modele: boite.querySelector('#vModele').value.trim(),
        immat: boite.querySelector('#vImmat').value.trim().toUpperCase(),
        miseEnCirculation: boite.querySelector('#vMec').value,
        boite: boite.querySelector('#vBoite').value,
        site: boite.querySelector('#vSite').value,
        km: v ? v.km : 0,
        kmLeveLe: v ? v.kmLeveLe : '',
        dernierCT: boite.querySelector('#vCT').value,
        revisionKm: boite.querySelector('#vRevKm').value,
        revisionLe: v ? v.revisionLe : '',
        periodiciteKm: boite.querySelector('#vPeriod').value,
        assuranceJusquau: boite.querySelector('#vAss').value,
        accessoires: boite.querySelector('#vAcc').value.trim(),
        remarque: boite.querySelector('#vRem').value.trim(),
        etat: boite.querySelector('#vEtat').value,
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast(v ? 'Enregistré ✅' : 'Véhicule ajouté ✅');
      afficherFlotte();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
      bOk.textContent = v ? '💾 Enregistrer' : '➕ Ajouter';
    }
  });
  r.appendChild(bOk);
  boite.appendChild(r);

  /* L'historique, sous la fiche */
  if(v){
    boite.appendChild(blocHistoriqueVehicule(v, fond));
  }

  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#vNom').focus(), 100);
}


/* Ce qui est arrivé à ce véhicule */
function blocHistoriqueVehicule(v, fond){
  const z = document.createElement('div');
  z.style.cssText = 'border-top:1px solid var(--line);margin-top:16px;padding-top:14px;';

  const t = document.createElement('div');
  t.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:10px;';
  t.innerHTML = '<strong style="flex:1;min-width:0;font-size:13px;' +
    'color:var(--accent-text);">📚 Historique</strong>';

  const bPlus = document.createElement('button');
  bPlus.className = 'btn btn-secondary';
  bPlus.style.cssText = 'width:auto;padding:8px 12px;font-size:12px;margin:0;';
  bPlus.textContent = '➕ Ajouter';
  bPlus.addEventListener('click', () => {
    document.body.removeChild(fond);
    ouvrirEvenement(v, null);
  });
  t.appendChild(bPlus);
  z.appendChild(t);

  const liste = evenementsFlotte.filter(e => e.idVehicule === v.id);

  if(!liste.length){
    const vide = document.createElement('div');
    vide.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;';
    vide.textContent = 'Rien d\'enregistré pour ce véhicule.';
    z.appendChild(vide);
    return z;
  }

  liste.slice(0, 25).forEach(e => {
    const ty = TYPES_EVENEMENT.find(x => x.cle === e.type);
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:9px;align-items:flex-start;padding:8px 0;' +
      'border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;cursor:pointer;';
    l.innerHTML =
      '<span style="flex-shrink:0;">' + (ty ? ty.nom.split(' ')[0] : '📝') + '</span>' +
      '<span style="flex:1;min-width:0;line-height:1.45;">' +
        (e.libelle || (ty ? ty.nom.slice(2) : '')).replace(/</g, '&lt;') +
        (e.etat === 'prevu' ? ' <span style="color:var(--warn-text);font-size:11px;">' +
          '📅 prévu</span>' : '') +
        '<div style="font-size:11px;color:var(--muted);">' +
          (e.date ? (typeof dateEnToutesLettres === 'function'
                      ? dateEnToutesLettres(e.date) : e.date) : '') +
          (e.km ? ' · ' + e.km.toLocaleString('fr-FR') + ' km' : '') +
          (e.garage ? ' · ' + e.garage.replace(/</g, '&lt;') : '') +
          (e.cout ? ' · ' + e.cout.replace(/</g, '&lt;') + ' €' : '') +
        '</div>' +
      '</span>';
    l.addEventListener('click', () => {
      document.body.removeChild(fond);
      ouvrirEvenement(v, e);
    });
    z.appendChild(l);
  });

  if(liste.length > 25){
    const p = document.createElement('div');
    p.style.cssText = 'font-size:11px;color:var(--muted);padding-top:8px;';
    p.textContent = '+ ' + (liste.length - 25) + ' plus anciens';
    z.appendChild(p);
  }

  return z;
}


/* ============================================================
   UN ÉVÉNEMENT
   ============================================================ */

function ouvrirEvenement(v, e){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(480px, 94vw);max-height:88vh;overflow-y:auto;';

  const nouveau = !e || !e.id;

  boite.innerHTML =
    '<h3>' + v.nom.replace(/</g, '&lt;') + '</h3>' +

    '<label for="eType">Ce qui s\'est passé</label>' +
    '<select id="eType">' +
      TYPES_EVENEMENT.map(t => '<option value="' + t.cle + '">' + t.nom +
                               '</option>').join('') +
    '</select>' +

    '<div class="duo">' +
      '<div><label for="eDate">Date</label><input type="date" id="eDate"></div>' +
      '<div><label for="eKm">Compteur</label>' +
        '<input type="number" id="eKm" inputmode="numeric" placeholder="km"></div>' +
    '</div>' +

    '<label for="eLib">Détail</label>' +
    '<input type="text" id="eLib" placeholder="Ex : vidange + filtres">' +

    '<div class="duo">' +
      '<div><label for="eGarage">Garage</label>' +
        '<input type="text" id="eGarage" placeholder="Facultatif"></div>' +
      '<div><label for="eCout">Coût</label>' +
        '<input type="text" id="eCout" inputmode="decimal" placeholder="€"></div>' +
    '</div>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin:4px 0 10px;">' +
      '<input type="checkbox" id="ePrevu" style="width:19px;height:19px;">' +
      '📅 C\'est prévu, pas encore fait</label>' +
    '<div id="eAide" style="font-size:11px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;"></div>';

  boite.querySelector('#eDate').value = todayLocal();
  boite.querySelector('#eKm').value = v.km || '';

  if(e){
    if(e.type) boite.querySelector('#eType').value = e.type;
    if(e.date) boite.querySelector('#eDate').value = e.date;
    if(e.km) boite.querySelector('#eKm').value = e.km;
    boite.querySelector('#eLib').value = e.libelle || '';
    boite.querySelector('#eGarage').value = e.garage || '';
    boite.querySelector('#eCout').value = e.cout || '';
    boite.querySelector('#ePrevu').checked = (e.etat === 'prevu');
  }

  /* Ce que l'enregistrement va déclencher, dit à l'avance */
  const aide = boite.querySelector('#eAide');
  const majAide = () => {
    const t = boite.querySelector('#eType').value;
    const prevu = boite.querySelector('#ePrevu').checked;

    if(prevu){
      aide.textContent = 'Il apparaîtra comme rendez-vous à venir, sans rien ' +
        'mettre à jour tant qu\'il n\'est pas fait.';
      return;
    }
    const quoi = {
      km: 'Le compteur du véhicule sera mis à jour.',
      revision: 'La prochaine révision sera calculée depuis ce kilométrage.',
      ct: 'Le prochain contrôle technique sera posé automatiquement.',
      panne: 'Il restera signalé tant qu\'il n\'est pas marqué comme réglé.'
    }[t];
    aide.textContent = quoi || 'Enregistré dans l\'historique du véhicule.';
  };
  boite.querySelector('#eType').addEventListener('change', majAide);
  boite.querySelector('#ePrevu').addEventListener('change', majAide);
  majAide();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => {
    document.body.removeChild(fond);
    ouvrirFicheVehicule(v);
  });
  r.appendChild(bAnn);

  if(!nouveau){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer cette ligne de l\'historique ?')) return;
      try{
        await appelPrep({ action: 'flotteEventDelete', id: e.id });
        document.body.removeChild(fond);
        showToast('Supprimée ✅');
        afficherFlotte();
      }catch(err){ showToast('Impossible : ' + err.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = nouveau ? '➕ Enregistrer' : '💾 Enregistrer';
  bOk.addEventListener('click', async () => {
    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      await appelPrep({
        action: 'flotteEventSet',
        id: nouveau ? '' : e.id,
        idVehicule: v.id,
        type: boite.querySelector('#eType').value,
        date: boite.querySelector('#eDate').value,
        km: boite.querySelector('#eKm').value,
        libelle: boite.querySelector('#eLib').value.trim(),
        garage: boite.querySelector('#eGarage').value.trim(),
        cout: boite.querySelector('#eCout').value.trim(),
        etat: boite.querySelector('#ePrevu').checked ? 'prevu' : 'fait',
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      afficherFlotte();
    }catch(err){
      showToast('Impossible : ' + err.message);
      bOk.disabled = false;
      bOk.textContent = '💾 Enregistrer';
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#eLib').focus(), 100);
}


/* ============================================================
   LA PASTILLE
   ============================================================ */
function majPastilleFlotte(){
  if(typeof poserCompteVue === 'function'){
    poserCompteVue('outils', 'flotte', nbAlertesFlotte());
  }
}

/* Le compte, chargé en fond après la connexion */
async function chargerFlotteEnFond(){
  if(!ACCES || !ACCES.droits || !ACCES.droits.flotte) return;
  try{
    const d = await appelPrep({ action: 'flotteList' });
    flotte = (d && d.vehicules) || [];
    evenementsFlotte = (d && d.evenements) || [];
    majPastilleFlotte();
  }catch(e){ /* la pastille attendra le prochain passage */ }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-flotte.js'] = true;
