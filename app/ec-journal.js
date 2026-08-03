/* ============================================================
   ec-journal.js
   Journal d'activité — réservé aux administrateurs.
   Qui a fait quoi, et quand.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Couleur et icône selon le type d'action */
const ICONES_JOURNAL = {
  'Bilan enregistré':          '📝',
  'Dossier élève supprimé':    '🗑️',
  'Cours préparé':             '📅',
  'Cours préparé supprimé':    '✕',
  'Cours réattribué':          '👤',
  'Message au moniteur':       '📨',
  'Message traité':            '✅',
  'Fiche de suivi modifiée':   '🚗',
  'Fiche de suivi supprimée':  '🗑️',
  'Réglage des places':        '⚙️'
};

/* Les actions de suppression méritent d'être repérables */
function actionSensible(action){
  return /supprim/i.test(action || '');
}

async function afficherJournal(){
  const zone = $('journalListe');
  if(!zone) return;

  const qui = ($('journalQui') && $('journalQui').value.trim()) || '';
  const eleve = ($('journalEleve') && $('journalEleve').value.trim()) || '';
  const periode = ($('journalPeriode') && $('journalPeriode').value) || '7';

  let depuis = '';
  if(periode !== 'tout'){
    const d = new Date();
    d.setDate(d.getDate() - parseInt(periode, 10));
    depuis = d.toISOString().slice(0, 10);
  }

  const btn = $('journalBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Lecture…'; }
  zone.innerHTML = '<div class="empty">Lecture du journal…</div>';

  let data;
  try{
    data = await appelPrep({ action: 'journalList', qui: qui, eleve: eleve,
                             depuis: depuis, max: 300 });
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    if(btn){ btn.disabled = false; btn.textContent = '🔄 Actualiser le journal'; }
    return;
  }
  if(btn){ btn.disabled = false; btn.textContent = '🔄 Actualiser le journal'; }

  const lignes = (data && data.lignes) || [];
  zone.innerHTML = '';

  /* Récapitulatif : qui a fait combien de choses */
  const parPersonne = {};
  lignes.forEach(l => { parPersonne[l.qui] = (parPersonne[l.qui] || 0) + 1; });

  const tete = document.createElement('div');
  tete.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.7;' +
    'padding:8px 10px;background:var(--navy);border:1px solid var(--line);' +
    'border-radius:8px;margin-bottom:10px;';
  tete.innerHTML =
    '<strong style="color:var(--cream);">' + lignes.length + ' action(s)</strong>' +
    (lignes.length === 300 ? ' (limite atteinte, affine les filtres)' : '') +
    '<br>' +
    (Object.keys(parPersonne).length
      ? Object.keys(parPersonne).sort()
          .map(n => n.replace(/</g, '&lt;') + ' (' + parPersonne[n] + ')').join(' · ')
      : '') +
    '<br><span style="opacity:.8;">Journal conservé ' +
    ((data && data.conservation) || 90) + ' jours · ' +
    ((data && data.total) || 0) + ' ligne(s) au total</span>';
  zone.appendChild(tete);

  if(!lignes.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Aucune activité sur cette période.';
    zone.appendChild(v);
    return;
  }

  /* Regroupement par jour, du plus récent au plus ancien */
  let jourCourant = '';
  lignes.forEach(l => {
    if(l.jour !== jourCourant){
      jourCourant = l.jour;
      const t = document.createElement('div');
      t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
        'margin:12px 0 4px;';
      t.textContent = l.jour ? dateEnToutesLettres(l.jour) : '';
      zone.appendChild(t);
    }

    const d = document.createElement('div');
    const sensible = actionSensible(l.action);
    d.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:7px 8px;' +
      'border-bottom:1px solid var(--line);font-size:13px;line-height:1.5;' +
      (sensible ? 'background:rgba(228,87,46,.07);border-radius:6px;' : '');

    const ic = document.createElement('span');
    ic.style.cssText = 'flex-shrink:0;font-size:15px;';
    ic.textContent = ICONES_JOURNAL[l.action] || '•';
    d.appendChild(ic);

    const txt = document.createElement('div');
    txt.style.cssText = 'flex:1;min-width:0;';
    txt.innerHTML =
      '<span style="color:var(--muted);">' + l.quand.slice(-5) + '</span> · ' +
      '<strong>' + l.qui.replace(/</g, '&lt;') + '</strong>' +
      (l.role && l.role !== 'moniteur'
        ? ' <span style="color:var(--muted);">(' + l.role + ')</span>' : '') +
      ' — ' + l.action.replace(/</g, '&lt;') +
      (l.eleve ? ' · <strong>' + l.eleve.replace(/</g, '&lt;') + '</strong>' : '') +
      (l.detail
        ? '<br><span style="color:var(--muted);font-size:12px;">' +
          l.detail.replace(/</g, '&lt;') + '</span>'
        : '');
    d.appendChild(txt);

    zone.appendChild(d);
  });
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-journal.js'] = true;
