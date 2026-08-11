/* ============================================================
   ec-memoire.js
   Ce que l'IA doit retenir : corrections de vocabulaire et
   règles dictées pendant les cours.

   L'IA n'apprend pas d'elle-même. Chaque bilan repart de zéro.
   Cette feuille fait office de mémoire : elle est relue avant
   chaque correction et jointe aux consignes.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let correctionsIA = [];
let correctionsLues = 0;

/* Les corrections actives, gardées dix minutes */
async function chargerCorrectionsIA(force){
  if(!force && Date.now() - correctionsLues < 600000) return correctionsIA;
  try{
    const d = await appelPrep({ action: 'corrList' });
    correctionsIA = (d && d.corrections) || [];
    correctionsLues = Date.now();
  }catch(e){ console.warn('Corrections indisponibles :', e); }
  return correctionsIA;
}

/* Applique les corrections de l'auto-école à un texte.
   Les mots entiers seulement : « frein » ne doit pas transformer
   « freinage » en plein milieu. */
function appliquerCorrectionsIA(texte){
  let t = String(texte || '');
  (correctionsIA || []).forEach(c => {
    const mauvais = String(c.mauvais || '').trim();
    const bon = String(c.bon || '').trim();
    if(mauvais.length < 2 || !bon) return;
    try{
      /* Le mot est protégé : un point ou une parenthèse dans la
         saisie ne doit pas être pris pour un motif. */
      const echappe = mauvais.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const motif = new RegExp('\\b' + echappe + '\\b', 'gi');
      t = t.replace(motif, bon);
    }catch(e){ /* motif impossible : on saute */ }
  });
  return t;
}

/* Le bloc joint aux consignes de l'IA */
function consigneCorrectionsIA(){
  const actives = (correctionsIA || []).filter(c => c.mauvais && c.bon);
  if(!actives.length) return '';
  return '\n\nCORRECTIONS DE VOCABULAIRE — propres à cette auto-école :\n' +
    actives.map(c => '  « ' + c.mauvais +' » → « ' + c.bon + ' »').join('\n') + '\n' +
    'Applique-les partout où le sens le permet.\n';
}


/* ============================================================
   LIEUX ET POINTS D'INTÉRÊT

   La reconnaissance vocale ne connaît pas Yffiniac ni le rond-point
   des Longs Champs. On donne la liste à l'IA : elle reconnaît alors
   les noms propres au lieu d'écrire n'importe quoi.
   ============================================================ */
let lieuxIA = [];
let lieuxLus = 0;

async function chargerLieuxIA(force){
  if(!force && Date.now() - lieuxLus < 600000) return lieuxIA;
  try{
    const d = await appelPrep({ action: 'lieuxList' });
    lieuxIA = (d && d.lieux) || [];
    lieuxLus = Date.now();
  }catch(e){ console.warn('Lieux indisponibles :', e); }
  return lieuxIA;
}

/* Le bloc joint aux consignes de l'IA */
function consigneLieuxIA(){
  const noms = (lieuxIA || []).map(x => x.nom).filter(Boolean);
  if(!noms.length) return '';

  /* Regroupés par genre : une commune ne se traite pas comme un
     rond-point, et l'IA doit pouvoir accorder correctement. */
  const parGenre = {};
  (lieuxIA || []).forEach(x => {
    const g = (x.genre || 'lieu').trim() || 'lieu';
    if(!parGenre[g]) parGenre[g] = [];
    parGenre[g].push(x.nom);
  });

  return '\n\nLIEUX DE NOTRE SECTEUR — noms propres à respecter :\n' +
    Object.keys(parGenre).sort().map(g =>
      '  ' + g + ' : ' + parGenre[g].join(', ')).join('\n') + '\n' +
    "Quand la transcription contient un mot qui ressemble à l'un de ces noms, " +
    "c'est lui : écris-le avec son orthographe exacte, accents et traits d'union " +
    'compris. Ne remplace jamais un nom de cette liste par un autre mot.\n';
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */

async function afficherMemoireIA(){
  const zone = $('memoireZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture de la mémoire…</div>';

  let corrections = [], regles = [], lieux = [];
  try{
    const [a, b, l] = await Promise.all([
      appelPrep({ action: 'corrList', toutes: true }).catch(() => ({})),
      appelPrep({ action: 'regleIaList', toutes: true }).catch(() => ({})),
      appelPrep({ action: 'lieuxList', toutes: true }).catch(() => ({}))
    ]);
    corrections = (a && a.corrections) || [];
    regles = (b && b.regles) || [];
    lieux = (l && l.lieux) || [];
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';

  /* ---- Ajouter une correction ---- */
  const form = document.createElement('div');
  form.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:12px 14px;margin-bottom:16px;';

  form.innerHTML =
    '<div style="font-size:14px;font-weight:700;color:var(--accent-text);margin-bottom:8px;">' +
      '➕ Nouvelle correction</div>' +
    '<div class="duo">' +
      '<div><label for="corrMauvais">Ce que la machine écrit</label>' +
        '<input type="text" id="corrMauvais" placeholder="Ex : ongle mort"></div>' +
      '<div><label for="corrBon">Ce qu\'il faut écrire</label>' +
        '<input type="text" id="corrBon" placeholder="Ex : angle mort"></div>' +
    '</div>';

  const bAdd = document.createElement('button');
  bAdd.className = 'btn btn-primary';
  bAdd.style.cssText = 'padding:12px;font-size:14px;';
  bAdd.textContent = '💾 Ajouter cette correction';
  bAdd.addEventListener('click', async () => {
    const m = $('corrMauvais').value.trim();
    const b = $('corrBon').value.trim();
    if(m.length < 2 || !b){
      showToast('Remplis les deux champs.');
      return;
    }
    bAdd.disabled = true;
    bAdd.textContent = 'Enregistrement…';
    try{
      await appelPrep({ action: 'corrAdd', mauvais: m, bon: b,
                        par: ACCES.moniteur || '' });
      showToast('Correction ajoutée ✅');
      await chargerCorrectionsIA(true);
      afficherMemoireIA();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bAdd.disabled = false;
      bAdd.textContent = '💾 Ajouter cette correction';
    }
  });
  form.appendChild(bAdd);

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin-top:8px;line-height:1.5;';
  aide.textContent = "La correction s'applique pendant l'enregistrement du cours, " +
    "et elle est transmise à l'IA. Elle vaut pour le mot entier : « frein » " +
    'ne touchera pas à « freinage ».';
  form.appendChild(aide);

  zone.appendChild(form);

  /* ---- Les corrections enregistrées ---- */
  const t1 = document.createElement('div');
  t1.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent-text);margin-bottom:8px;';
  t1.textContent = '📝 Corrections de vocabulaire — ' + corrections.length;
  zone.appendChild(t1);

  if(!corrections.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.cssText = 'padding:10px;font-size:12px;margin-bottom:16px;';
    v.textContent = 'Aucune correction enregistrée.';
    zone.appendChild(v);
  }else{
    const l1 = document.createElement('div');
    l1.style.cssText = 'max-height:340px;overflow-y:auto;margin-bottom:16px;';
    corrections.forEach(x => l1.appendChild(ligneCorrection(x)));
    zone.appendChild(l1);
  }

  /* ---- Les lieux du secteur ---- */
  const fL = document.createElement('div');
  fL.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:12px 14px;margin-bottom:16px;';
  fL.innerHTML =
    '<div style="font-size:14px;font-weight:700;color:var(--accent-text);margin-bottom:4px;">' +
      '📍 Lieux et points d\'intérêt — ' + lieux.length + '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5;">' +
      'Communes, quartiers, ronds-points, centres d\'examen. L\'IA les reconnaît ' +
      'et les orthographie correctement au lieu d\'écrire n\'importe quoi.</div>' +
    '<div class="duo">' +
      '<div><label for="lieuNom">Nom du lieu</label>' +
        '<input type="text" id="lieuNom" placeholder="Ex : Yffiniac"></div>' +
      '<div><label for="lieuGenre">Quoi</label><select id="lieuGenre">' +
        '<option value="commune">Commune</option>' +
        '<option value="quartier">Quartier ou lieu-dit</option>' +
        '<option value="rond-point">Rond-point ou carrefour</option>' +
        '<option value="route">Route ou voie</option>' +
        "<option value=\"centre d'examen\">Centre d'examen</option>" +
        '<option value="commerce">Commerce ou repère</option>' +
      '</select></div>' +
    '</div>';

  const bLieu = document.createElement('button');
  bLieu.className = 'btn btn-primary';
  bLieu.style.cssText = 'padding:12px;font-size:14px;';
  bLieu.textContent = '📍 Ajouter ce lieu';
  bLieu.addEventListener('click', async () => {
    const nom = $('lieuNom').value.trim();
    if(nom.length < 2){ showToast('Saisis un nom.'); return; }
    bLieu.disabled = true;
    bLieu.textContent = 'Enregistrement…';
    try{
      await appelPrep({ action: 'lieuAdd', nom: nom,
                        genre: $('lieuGenre').value, par: ACCES.moniteur || '' });
      showToast('Lieu ajouté ✅');
      await chargerLieuxIA(true);
      afficherMemoireIA();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bLieu.disabled = false;
      bLieu.textContent = '📍 Ajouter ce lieu';
    }
  });
  fL.appendChild(bLieu);

  if(lieux.length){
    const l3 = document.createElement('div');
    l3.style.cssText = 'max-height:280px;overflow-y:auto;margin-top:10px;';
    lieux.forEach(x => l3.appendChild(ligneLieu(x)));
    fL.appendChild(l3);
  }
  zone.appendChild(fL);

  /* ---- Ajouter une règle à l'écrit ---- */
  const fR = document.createElement('div');
  fR.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:12px 14px;margin-bottom:16px;';
  fR.innerHTML =
    '<div style="font-size:14px;font-weight:700;color:var(--accent-text);margin-bottom:4px;">' +
      '✍️ Nouvelle règle</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5;">' +
      "Une consigne que l'IA doit suivre dans tous les bilans. Écris-la comme tu " +
      'la dirais à un moniteur qui débute.</div>' +
    '<textarea id="regleTexte" rows="3" maxlength="600" ' +
      'placeholder="Ex : Ne jamais écrire « rond-point », toujours « giratoire »." ' +
      'style="width:100%;background:var(--navy);border:1px solid var(--line);' +
      'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:15px;' +
      'line-height:1.6;font-family:inherit;resize:vertical;margin-bottom:8px;"></textarea>';

  const bRegle = document.createElement('button');
  bRegle.className = 'btn btn-primary';
  bRegle.style.cssText = 'padding:12px;font-size:14px;';
  bRegle.textContent = '💾 Ajouter cette règle';
  bRegle.addEventListener('click', async () => {
    const t = $('regleTexte').value.trim();
    if(t.length < 5){
      showToast('Écris la règle en une phrase.');
      return;
    }
    bRegle.disabled = true;
    bRegle.textContent = 'Enregistrement…';
    try{
      await appelPrep({ action: 'regleIaAdd', regle: t, par: ACCES.moniteur || '',
                        eleve: '' });
      /* Écrite ici, elle est voulue : on l'active tout de suite,
         contrairement à une phrase dictée en plein cours. */
      const d2 = await appelPrep({ action: 'regleIaList', toutes: true });
      const posee = ((d2 && d2.regles) || [])
        .find(x => normaliserMot(x.regle) === normaliserMot(t));
      if(posee && !posee.active){
        await appelPrep({ action: 'regleIaSet', ligne: posee.ligne, active: 'oui' });
      }
      showToast('Règle ajoutée et active ✅');
      afficherMemoireIA();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bRegle.disabled = false;
      bRegle.textContent = '💾 Ajouter cette règle';
    }
  });
  fR.appendChild(bRegle);
  zone.appendChild(fR);

  /* ---- Les règles dictées pendant les cours ---- */
  const t2 = document.createElement('div');
  t2.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
  t2.textContent = '📜 Règles enregistrées — ' + regles.length;
  zone.appendChild(t2);

  const a2 = document.createElement('div');
  a2.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5;';
  a2.textContent = "Celles que tu écris ici sont actives tout de suite. Celles qu'un " +
    "moniteur a dictées pendant un cours arrivent inactives : une consigne valable " +
    "pour un cours ne doit pas devenir permanente sans que tu l'aies voulu.";
  zone.appendChild(a2);

  if(!regles.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.cssText = 'padding:10px;font-size:12px;';
    v.textContent = 'Aucune règle dictée pour le moment.';
    zone.appendChild(v);
  }else{
    const l2 = document.createElement('div');
    l2.style.cssText = 'max-height:340px;overflow-y:auto;';
    regles.forEach(x => l2.appendChild(ligneRegleIA(x)));
    zone.appendChild(l2);
  }

  const bMaj = document.createElement('button');
  bMaj.className = 'btn btn-secondary';
  bMaj.style.cssText = 'margin-top:14px;padding:11px;font-size:13px;';
  bMaj.textContent = '🔄 Actualiser';
  bMaj.addEventListener('click', () => afficherMemoireIA());
  zone.appendChild(bMaj);
}


/* Une correction : ses deux mots, son état, ses boutons */
function ligneCorrection(x){
  const d = document.createElement('div');
  d.style.cssText = 'display:flex;gap:8px;align-items:center;border:1px solid var(--line);' +
    'border-radius:9px;padding:8px 11px;margin-bottom:5px;' +
    (x.actif ? '' : 'opacity:.55;');

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.5;';
  t.innerHTML = '<span style="color:var(--muted);">' +
    x.mauvais.replace(/</g, '&lt;') + '</span> → <strong>' +
    x.bon.replace(/</g, '&lt;') + '</strong>' +
    (x.par ? '<div style="font-size:11px;color:var(--muted);">par ' +
      x.par.replace(/</g, '&lt;') + (x.quand ? ' · ' + x.quand : '') + '</div>' : '');
  d.appendChild(t);

  const bAct = document.createElement('button');
  bAct.className = 'btn btn-secondary';
  bAct.style.cssText = 'width:auto;padding:5px 9px;font-size:12px;margin:0;flex-shrink:0;';
  bAct.textContent = x.actif ? '✅' : '⏸️';
  bAct.title = x.actif ? 'Active — appuie pour suspendre'
                       : 'Suspendue — appuie pour activer';
  bAct.addEventListener('click', async () => {
    bAct.disabled = true;
    try{
      await appelPrep({ action: 'corrSet', ligne: x.ligne,
                        actif: x.actif ? '' : 'oui' });
      await chargerCorrectionsIA(true);
      afficherMemoireIA();
    }catch(e){ showToast('Impossible : ' + e.message); bAct.disabled = false; }
  });
  d.appendChild(bAct);

  const bSup = document.createElement('button');
  bSup.className = 'btn btn-secondary';
  bSup.style.cssText = 'width:auto;padding:5px 9px;font-size:12px;margin:0;flex-shrink:0;' +
    'color:var(--red);border-color:var(--red);';
  bSup.textContent = '🗑️';
  bSup.title = 'Supprimer cette correction';
  bSup.addEventListener('click', async () => {
    if(!await confirmer('Supprimer la correction « ' + x.mauvais +
                        ' » → « ' + x.bon + ' » ?')) return;
    bSup.disabled = true;
    try{
      await appelPrep({ action: 'corrSet', ligne: x.ligne, supprimer: 'oui' });
      showToast('Supprimée ✅');
      await chargerCorrectionsIA(true);
      afficherMemoireIA();
    }catch(e){ showToast('Impossible : ' + e.message); bSup.disabled = false; }
  });
  d.appendChild(bSup);

  return d;
}


/* Une règle dictée pendant un cours */
function ligneRegleIA(x){
  const d = document.createElement('div');
  d.style.cssText = 'display:flex;gap:8px;align-items:flex-start;border:1px solid var(--line);' +
    'border-radius:9px;padding:8px 11px;margin-bottom:5px;' +
    (x.active ? '' : 'opacity:.55;');

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.5;';
  t.innerHTML = x.regle.replace(/</g, '&lt;') +
    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
    (x.par ? x.par.replace(/</g, '&lt;') : '?') +
    (x.eleve ? ' · ' + x.eleve.replace(/</g, '&lt;') : '') +
    (x.quand ? ' · ' + x.quand : '') + '</div>';
  d.appendChild(t);

  const bAct = document.createElement('button');
  bAct.className = 'btn btn-secondary';
  bAct.style.cssText = 'width:auto;padding:5px 9px;font-size:12px;margin:0;flex-shrink:0;';
  bAct.textContent = x.active ? '✅' : '⏸️';
  bAct.title = x.active ? 'Appliquée aux bilans — appuie pour suspendre'
                        : 'Non appliquée — appuie pour activer';
  bAct.addEventListener('click', async () => {
    bAct.disabled = true;
    try{
      await appelPrep({ action: 'regleIaSet', ligne: x.ligne,
                        active: x.active ? '' : 'oui' });
      afficherMemoireIA();
    }catch(e){ showToast('Impossible : ' + e.message); bAct.disabled = false; }
  });
  d.appendChild(bAct);

  const bSup = document.createElement('button');
  bSup.className = 'btn btn-secondary';
  bSup.style.cssText = 'width:auto;padding:5px 9px;font-size:12px;margin:0;flex-shrink:0;' +
    'color:var(--red);border-color:var(--red);';
  bSup.textContent = '🗑️';
  bSup.addEventListener('click', async () => {
    if(!await confirmer('Supprimer cette règle ?\n\n« ' + x.regle + ' »')) return;
    bSup.disabled = true;
    try{
      await appelPrep({ action: 'regleIaSet', ligne: x.ligne, supprimer: 'oui' });
      showToast('Supprimée ✅');
      afficherMemoireIA();
    }catch(e){ showToast('Impossible : ' + e.message); bSup.disabled = false; }
  });
  d.appendChild(bSup);

  return d;
}


/* Un lieu : son nom, son genre, ses boutons */
function ligneLieu(x){
  const d = document.createElement('div');
  d.style.cssText = 'display:flex;gap:8px;align-items:center;border:1px solid var(--line);' +
    'border-radius:9px;padding:6px 10px;margin-bottom:4px;' +
    (x.actif ? '' : 'opacity:.55;');

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.5;';
  t.innerHTML = '<strong>' + x.nom.replace(/</g, '&lt;') + '</strong>' +
    (x.genre ? ' <span style="font-size:11px;color:var(--muted);">' +
      x.genre.replace(/</g, '&lt;') + '</span>' : '');
  d.appendChild(t);

  const bAct = document.createElement('button');
  bAct.className = 'btn btn-secondary';
  bAct.style.cssText = 'width:auto;padding:4px 8px;font-size:12px;margin:0;flex-shrink:0;';
  bAct.textContent = x.actif ? '✅' : '⏸️';
  bAct.title = x.actif ? 'Connu de l\'IA — appuie pour suspendre'
                       : 'Ignoré — appuie pour activer';
  bAct.addEventListener('click', async () => {
    bAct.disabled = true;
    try{
      await appelPrep({ action: 'lieuSet', ligne: x.ligne, actif: x.actif ? '' : 'oui' });
      await chargerLieuxIA(true);
      afficherMemoireIA();
    }catch(e){ showToast('Impossible : ' + e.message); bAct.disabled = false; }
  });
  d.appendChild(bAct);

  const bSup = document.createElement('button');
  bSup.className = 'btn btn-secondary';
  bSup.style.cssText = 'width:auto;padding:4px 8px;font-size:12px;margin:0;flex-shrink:0;' +
    'color:var(--red);border-color:var(--red);';
  bSup.textContent = '🗑️';
  bSup.addEventListener('click', async () => {
    if(!await confirmer('Supprimer « ' + x.nom + ' » de la liste des lieux ?')) return;
    bSup.disabled = true;
    try{
      await appelPrep({ action: 'lieuSet', ligne: x.ligne, supprimer: 'oui' });
      showToast('Supprimé ✅');
      await chargerLieuxIA(true);
      afficherMemoireIA();
    }catch(e){ showToast('Impossible : ' + e.message); bSup.disabled = false; }
  });
  d.appendChild(bSup);

  return d;
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-memoire.js'] = true;
