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
   L'ÉCRAN
   ============================================================ */

async function afficherMemoireIA(){
  const zone = $('memoireZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture de la mémoire…</div>';

  let corrections = [], regles = [];
  try{
    const [a, b] = await Promise.all([
      appelPrep({ action: 'corrList', toutes: true }).catch(() => ({})),
      appelPrep({ action: 'regleIaList', toutes: true }).catch(() => ({}))
    ]);
    corrections = (a && a.corrections) || [];
    regles = (b && b.regles) || [];
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

  /* ---- Les règles dictées pendant les cours ---- */
  const t2 = document.createElement('div');
  t2.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
  t2.textContent = '🎙️ Règles dictées pendant les cours — ' + regles.length;
  zone.appendChild(t2);

  const a2 = document.createElement('div');
  a2.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5;';
  a2.textContent = "Ce qu'un moniteur a dit en s'adressant à l'IA pendant un cours. " +
    "Une règle n'est appliquée aux bilans suivants que si tu l'actives : une consigne " +
    'valable pour un cours ne doit pas devenir permanente.';
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


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-memoire.js'] = true;
