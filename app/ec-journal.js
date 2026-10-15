/* Déployé le 15/10/2026 à 15:23 — v1183 */
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

/* ============================================================
   ALERTES
   Une activité inhabituelle mérite un coup d'œil, sans accuser
   personne : ce sont des repères, pas des verdicts.
   ============================================================ */
const COULEUR_GRAVITE = {
  haute:   { bord:'var(--red)',    fond:'var(--warn-bg)',        icone:'🔴' },
  moyenne: { bord:'#E8A33D',       fond:'rgba(232,163,61,.10)',  icone:'🟠' },
  basse:   { bord:'var(--line)',   fond:'var(--navy)',           icone:'🔵' }
};

function blocAlertes(alertes){
  const d = document.createElement('div');
  if(!alertes || !alertes.length){
    d.style.cssText = 'font-size:12px;color:var(--muted);padding:8px 10px;' +
      'background:var(--navy);border:1px solid var(--line);border-radius:8px;' +
      'margin-bottom:10px;';
    d.textContent = '✅ Rien d\'inhabituel sur cette période.';
    return d;
  }

  const det = document.createElement('details');
  det.open = alertes.some(a => a.gravite === 'haute');
  det.style.cssText = 'margin-bottom:10px;';
  det.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;' +
    'color:var(--warn-text);">⚠️ ' + alertes.length + ' point(s) à regarder</summary>';

  const liste = document.createElement('div');
  liste.style.cssText = 'margin-top:8px;';

  alertes.forEach(a => {
    const g = COULEUR_GRAVITE[a.gravite] || COULEUR_GRAVITE.basse;
    const l = document.createElement('div');
    l.style.cssText = 'border:1px solid ' + g.bord + ';background:' + g.fond + ';' +
      'border-radius:8px;padding:9px 11px;margin-bottom:6px;font-size:13px;line-height:1.5;';
    l.innerHTML = g.icone + ' <strong>' + a.qui.replace(/</g, '&lt;') + '</strong> — ' +
      a.titre.replace(/</g, '&lt;') +
      '<div style="font-size:12px;color:var(--muted);margin-top:2px;">' +
      dateEnToutesLettres(a.jour) + ' · ' + a.detail.replace(/</g, '&lt;') + '</div>';

    /* Voir le détail de cette journée, pour cette personne */
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'margin-top:6px;width:auto;padding:5px 10px;font-size:12px;';
    b.textContent = '🔍 Voir ce jour-là';
    b.addEventListener('click', () => {
      if($('journalQui')) $('journalQui').value = a.qui;
      if($('journalPeriode')) $('journalPeriode').value = '183';
      afficherJournal(a.jour);
    });
    l.appendChild(b);

    liste.appendChild(l);
  });

  det.appendChild(liste);
  d.appendChild(det);
  return d;
}


/* ============================================================
   EXPORT
   Le journal en tableur, pour le conserver ou l'examiner ailleurs.
   ============================================================ */
function exporterJournal(lignes){
  if(!lignes || !lignes.length){ showToast('Rien à exporter.'); return; }

  const enTete = ['Date', 'Heure', 'Utilisateur', 'Rôle', 'Action', 'Élève', 'Détail'];
  const cellule = v => {
    const t = String(v === undefined || v === null ? '' : v);
    /* Le point-virgule sépare les colonnes en France : on protège */
    return /[";\n]/.test(t) ? '"' + t.split('"').join('""') + '"' : t;
  };

  /* Deux formes de ligne : celle du journal en direct (v1147 —
     « jour », « heure », « libelle ») et celle de l'ancien journal
     du classeur (« quand », « action »). */
  const rangs = lignes.map(l => {
    const quand = String(l.quand || '');
    const jour = l.heure !== undefined && l.jour
      ? String(l.jour).split('-').reverse().join('/') : quand.slice(0, 10);
    const heure = l.heure !== undefined ? String(l.heure) : quand.slice(-5);
    return [
      jour, heure,
      l.qui, l.role, l.libelle || l.action, l.eleve, l.detail
    ].map(cellule).join(';');
  });

  /* Le BOM évite les accents cassés à l'ouverture dans Excel */
  const contenu = '\uFEFF' + enTete.join(';') + '\n' + rangs.join('\n');
  const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8;' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'journal-activite-' + todayLocal() + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    /* Même porte que les fenêtres : retirer ce qui n'est plus là
       n'est pas une erreur. Voir fermerFond (ec-fenetres.js). */
    if(typeof fermerFond === 'function') fermerFond(a);
    else if(a.parentNode) a.parentNode.removeChild(a);
  }, 500);

  showToast(lignes.length + ' ligne(s) exportée(s) ✅');
}

/* ============================================================
   📊 LE JOURNAL, EN DIRECT — v1147

   David : « dans notre journal j'aimerais avoir un vrai tracker avec
   ce que fait chaque utilisateur en direct ». Ses arbitrages : les
   actions, et qui est en ligne sur quel écran — rien de plus fin.

   Le même écran, la même ligne qu'avant. Ce qui change : 🟢 En ligne
   maintenant en tête, des pastilles par type, l'heure à la seconde,
   et plus de bouton « Actualiser » — la liste se relit toute seule
   toutes les 15 secondes, tant que l'écran est sous les yeux.

   Le registre est dans la base de Cloudflare (journal_direct), noté
   par l'enveloppe du Worker après chaque action réussie. L'ancien
   journal du classeur reste lisible : un lien en bas du résumé.
   ============================================================ */
const FAMILLES_JOURNAL = [
  ['bilans',       '📝 Bilans'],
  ['dossiers',     '🔍 Dossiers'],
  ['cours',        '📅 Cours'],
  ['mails',        '✉️ Mails'],
  ['sms',          '📱 SMS'],
  ['appels',       '📞 Appels'],
  ['autres',       '• Autres'],
  ['suppressions', '✕ Suppressions']
];
const etatJournal = { data: null, famille: 'tous', lu: 0, minuteur: null,
                      horloge: null, signature: '', classeur: false, jour: '' };

function journalSousLesYeux(){
  const c = $('journalCard');
  return !!(c && c.offsetParent !== null && document.visibilityState === 'visible' &&
            typeof ongletActif !== 'undefined' && ongletActif === 'outils' &&
            typeof vueActive !== 'undefined' && vueActive.outils === 'journal');
}

async function afficherJournal(jourPrecis){
  const zone = $('journalListe');
  if(!zone) return;
  if(typeof ACCES === 'undefined' || ACCES.role !== 'admin') return;

  etatJournal.classeur = false;
  etatJournal.jour = jourPrecis || '';
  if(!etatJournal.data) zone.innerHTML = '<div class="empty">Lecture du journal…</div>';
  await relireLeJournal(true);

  /* La relecture tient tant que l'écran est sous les yeux */
  clearInterval(etatJournal.minuteur);
  etatJournal.minuteur = setInterval(() => {
    if(etatJournal.classeur) return;
    if(!journalSousLesYeux()) return;
    relireLeJournal(false);
  }, 15000);
  clearInterval(etatJournal.horloge);
  etatJournal.horloge = setInterval(majHorlogeDuJournal, 1000);
}

async function relireLeJournal(forcer){
  const qui = ($('journalQui') && $('journalQui').value.trim()) || '';
  const eleve = ($('journalEleve') && $('journalEleve').value.trim()) || '';
  const jours = parseInt(($('journalPeriode') && $('journalPeriode').value) || '2', 10) || 2;
  let data;
  try{
    data = await appelPrep({ action: 'journalDirect', qui: qui, eleve: eleve, jours: jours });
  }catch(e){
    if(forcer){
      const zone = $('journalListe');
      if(zone) zone.innerHTML = '<div class="empty">⚠️ ' +
        String((e && e.message) || e).replace(/</g, '&lt;') + '</div>';
    }
    return;
  }
  etatJournal.lu = Date.now();
  const sig = JSON.stringify([(data.lignes || []).length, (data.lignes || [])[0] && data.lignes[0].id,
                              data.enLigne, data.appels, qui, eleve, jours, etatJournal.famille, etatJournal.jour]);
  if(!forcer && sig === etatJournal.signature) return;
  etatJournal.signature = sig;
  etatJournal.data = data;
  dessinerLeJournal();
}

function majHorlogeDuJournal(){
  const h = document.querySelector('#journalListe .horlogeJournal');
  if(!h || !etatJournal.lu) return;
  const s = Math.max(0, Math.round((Date.now() - etatJournal.lu) / 1000));
  h.textContent = 'mis à jour il y a ' + (s < 60 ? s + ' s' : Math.floor(s / 60) + ' min');
}

/* 📞 v1183 — LE CRÉDIT CLOUDFLARE DES APPELS

   David, le 15 octobre : « Oui et le crédit restant de cloudflare »,
   puis « Solution 1 » : l'appli compte elle-même. Chaque appareil dit
   en raccrochant combien il a reçu ; c'est une estimation proche de
   la facture de Cloudflare (1 000 Go offerts par mois, puis 0,05 $
   le Go). S'il voit trop d'écart, on passera par leur API. */
const GO_PAR_HEURE_APPEL = 2.5;   /* à trois en vidéo, estimation */
function dessinerCreditDesAppels(cr){
  const z = $('journalEnLigne');
  if(!z || !z.parentNode) return;
  let b = document.getElementById('journalCredit');
  if(!cr){ if(b) b.remove(); return; }
  if(!b){
    b = document.createElement('div');
    b.id = 'journalCredit';
    b.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;';
    z.parentNode.insertBefore(b, z);
  }
  const offerts = Number(cr.offertsGo || 1000);
  const go = Number(cr.octets || 0) / 1e9;
  const reste = Math.max(0, offerts - go);
  const pc = Math.min(100, Math.max(go > 0 ? 1 : 0, go / offerts * 100));
  const fr = n => n.toLocaleString('fr-FR', { maximumFractionDigits: n < 10 ? 1 : 0 });
  let mois = '';
  try{
    const [a, m] = String(cr.mois || '').split('-').map(Number);
    mois = new Date(a, m - 1, 15).toLocaleDateString('fr-FR', { month: 'long' });
  }catch(e){ mois = ''; }
  const sec = Number(cr.secondes || 0);
  const duree = sec >= 3600 ? Math.floor(sec / 3600) + ' h ' + String(Math.round((sec % 3600) / 60)).padStart(2, '0')
                            : Math.round(sec / 60) + ' min';
  const n = Number(cr.appels || 0);
  const icone = (typeof AppelEC !== 'undefined') ? AppelEC.ic('tel', 16) : '📞';
  b.innerHTML =
    '<div style="font-size:13px;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:7px;">' +
      '<i style="display:inline-flex;color:var(--accent-text);font-style:normal;">' + icone + '</i>' +
      'Appels' + (mois ? ' · ' + echapper(mois) : '') + ' — crédit Cloudflare</div>' +
    '<div style="height:10px;border-radius:999px;background:var(--line);overflow:hidden;">' +
      '<div style="width:' + pc.toFixed(1) + '%;height:100%;background:' + (pc > 85 ? 'var(--red)' : 'var(--orange)') + ';"></div></div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:13px;line-height:1.9;margin-top:4px;">' +
      '<span><b>' + fr(go) + ' Go</b> utilisés</span><span>·</span>' +
      '<span><b>' + fr(reste) + ' Go</b> restants sur ' + offerts.toLocaleString('fr-FR') + ' offerts</span>' +
      '<span style="color:var(--muted);margin-left:auto;">≈ ' + Math.floor(reste / GO_PAR_HEURE_APPEL).toLocaleString('fr-FR') +
        ' h d’appel à 3 en vidéo · ' + n + ' appel' + (n > 1 ? 's' : '') + ' ce mois' + (sec ? ', ' + duree : '') + '</span></div>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      (Number(cr.branche || 0)
        ? 'Au-delà des ' + offerts.toLocaleString('fr-FR') + ' Go : 0,05 $ le Go. Le compteur repart à zéro le 1ᵉʳ du mois. Compté par l’appli (estimation).'
        : '⚠️ Les appels ne sont pas encore branchés : il manque REALTIME_SFU_APP_ID et REALTIME_SFU_BEARER_TOKEN dans les variables du Worker.') +
    '</div>';
}

/* 🟢 Qui est là, et sur quel écran */
function dessinerEnLigne(liste){
  const z = $('journalEnLigne');
  if(!z) return;
  z.innerHTML = '';
  const b = document.createElement('div');
  b.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;';
  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;margin-bottom:6px;';
  t.textContent = '🟢 En ligne maintenant · ' + (liste || []).length;
  b.appendChild(t);
  if(!(liste || []).length){
    const v = document.createElement('div');
    v.style.cssText = 'font-size:13px;color:var(--muted);';
    v.textContent = 'Personne d’autre que toi pour le moment.';
    b.appendChild(v);
  }
  (liste || []).forEach(p => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:8px;align-items:center;font-size:13px;line-height:1.9;flex-wrap:wrap;';
    l.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:var(--orange);flex-shrink:0;"></span>' +
      '<strong>' + echapper(p.qui) + '</strong>' +
      '<span style="min-width:0;overflow-wrap:anywhere;">' + echapper(p.ecran || '') + '</span>' +
      '<span style="color:var(--muted);margin-left:auto;">depuis ' + echapper(p.depuis || '') + '</span>';
    b.appendChild(l);
  });
  const n = document.createElement('div');
  n.style.cssText = 'font-size:11px;color:var(--muted);margin-top:4px;';
  n.textContent = 'Absent depuis plus de 2 minutes : la personne quitte la liste.';
  b.appendChild(n);
  z.appendChild(b);
}

function dessinerLeJournal(){
  const zone = $('journalListe');
  const data = etatJournal.data;
  if(!zone || !data) return;
  dessinerCreditDesAppels(data.appels);
  dessinerEnLigne(data.enLigne);
  zone.innerHTML = '';

  let toutes = data.lignes || [];
  if(etatJournal.jour) toutes = toutes.filter(l => l.jour === etatJournal.jour);

  /* Les pastilles : chacune porte son compte, et une pastille à
     zéro ne s'affiche pas — la règle de « Pas prêts ». */
  const parFam = {};
  toutes.forEach(l => { parFam[l.famille || 'autres'] = (parFam[l.famille || 'autres'] || 0) + 1; });
  if(etatJournal.famille !== 'tous' && !parFam[etatJournal.famille]) etatJournal.famille = 'tous';
  const f = document.createElement('div');
  f.className = 'filtres-vue';
  f.style.cssText = 'margin:4px 0 12px;';
  const pastille = (cle, titre, n, rouge) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (etatJournal.famille === cle ? 'btn-primary' : 'btn-secondary');
    b.appendChild(document.createTextNode(titre));
    const s = document.createElement('span');
    s.className = 'n';
    s.textContent = String(n);
    if(rouge) s.style.color = 'var(--red)';
    b.appendChild(s);
    b.addEventListener('click', () => { etatJournal.famille = cle; dessinerLeJournal(); });
    f.appendChild(b);
  };
  pastille('tous', 'Tout', toutes.length, false);
  FAMILLES_JOURNAL.forEach(([cle, titre]) => {
    if(parFam[cle]) pastille(cle, titre, parFam[cle], cle === 'suppressions');
  });
  zone.appendChild(f);

  const lignes = etatJournal.famille === 'tous' ? toutes
    : toutes.filter(l => (l.famille || 'autres') === etatJournal.famille);

  zone.appendChild(blocAlertes(data.alertes || []));

  const parPersonne = {};
  lignes.forEach(l => { parPersonne[l.qui] = (parPersonne[l.qui] || 0) + 1; });
  const tete = document.createElement('div');
  tete.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.7;' +
    'padding:8px 10px;background:var(--navy);border:1px solid var(--line);' +
    'border-radius:8px;margin-bottom:10px;';
  tete.innerHTML =
    '<strong style="color:var(--cream);">' + lignes.length + ' action(s)</strong>' +
    (data.complet === false ? ' (les 600 plus récentes — affine les filtres)' : '') +
    '<br>' + Object.keys(parPersonne).sort((a, b) => parPersonne[b] - parPersonne[a])
      .map(n => echapper(n) + ' (' + parPersonne[n] + ')').join(' · ') +
    '<br><span style="opacity:.8;">Journal : ' + (data.total || 0) + ' ligne(s), conservées 6 mois' +
    (data.depuisLe ? ' — depuis le ' + jourDuJournal(data.depuisLe) : '') + '.</span>';
  if(data.depuisLe){
    const a = document.createElement('div');
    a.style.cssText = 'margin-top:4px;';
    const lien = document.createElement('button');
    lien.type = 'button';
    lien.className = 'btn btn-secondary';
    lien.style.cssText = 'width:auto;margin:0;padding:5px 10px;font-size:12px;';
    lien.textContent = '📜 Avant le ' + jourDuJournal(data.depuisLe) + ' : l’ancien journal';
    lien.addEventListener('click', () => afficherJournalDuClasseur());
    a.appendChild(lien);
    tete.appendChild(a);
  }
  zone.appendChild(tete);

  if(lignes.length){
    const bExp = document.createElement('button');
    bExp.className = 'btn btn-secondary';
    bExp.style.cssText = 'padding:9px;font-size:13px;margin-bottom:10px;';
    bExp.textContent = '📥 Exporter en tableur (' + lignes.length + ' lignes)';
    bExp.addEventListener('click', () => exporterJournal(lignes));
    zone.appendChild(bExp);
  }

  const vif = document.createElement('div');
  vif.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);margin:0 0 6px;';
  vif.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:var(--red);"></span>' +
    '<strong style="color:var(--cream);">En direct</strong> · <span class="horlogeJournal">mis à jour à l’instant</span>';
  zone.appendChild(vif);

  if(!lignes.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Aucune activité sur cette période.';
    zone.appendChild(v);
    return;
  }

  let jourCourant = '';
  lignes.forEach(l => {
    if(l.jour !== jourCourant){
      jourCourant = l.jour;
      const t = document.createElement('div');
      t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin:12px 0 4px;';
      t.textContent = l.jour ? dateEnToutesLettres(l.jour) : '';
      zone.appendChild(t);
    }
    zone.appendChild(ligneDuJournalDirect(l));
  });
}

function ligneDuJournalDirect(l){
  const d = document.createElement('div');
  d.className = 'ligneJournal';
  const sensible = (l.famille === 'suppressions');
  d.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:7px 8px;' +
    'border-bottom:1px solid var(--line);font-size:13px;line-height:1.5;' +
    (sensible ? 'background:rgba(228,87,46,.07);border-radius:6px;' : '');

  const ic = document.createElement('span');
  ic.style.cssText = 'flex-shrink:0;font-size:15px;';
  ic.textContent = l.icone || '•';
  d.appendChild(ic);

  const txt = document.createElement('div');
  txt.style.cssText = 'flex:1;min-width:0;';
  txt.innerHTML =
    '<span style="color:var(--muted);">' + echapper(l.heure || '') + '</span> · ' +
    '<strong>' + echapper(l.qui || '') + '</strong>' +
    (l.role && l.role !== 'moniteur' ? ' <span style="color:var(--muted);">(' + echapper(l.role) + ')</span>' : '') +
    ' — ' + echapper(l.libelle || '') +
    (l.eleve ? ' · <strong>' + echapper(l.eleve) + '</strong>' : '') +
    (l.detail ? '<br><span style="color:var(--muted);font-size:12px;">' + echapper(l.detail) + '</span>' : '');
  d.appendChild(txt);

  /* Un résultat noté par erreur se défait d'ici, comme avant */
  const bAnnul = boutonAnnulerResultat({ action: l.libelle || '', eleve: l.eleve || '', detail: l.detail || '' });
  if(bAnnul) d.appendChild(bAnnul);
  return d;
}

/* Les filtres relisent : on tape, on attend un souffle, on relit */
let minuteurFiltresJournal = null;
function brancherLesFiltresDuJournal(){
  const relire = () => {
    clearTimeout(minuteurFiltresJournal);
    minuteurFiltresJournal = setTimeout(() => { etatJournal.jour = ''; relireLeJournal(true); }, 400);
  };
  if($('journalQui')) $('journalQui').addEventListener('input', relire);
  if($('journalEleve')) $('journalEleve').addEventListener('input', relire);
  if($('journalPeriode')) $('journalPeriode').addEventListener('change', relire);
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', brancherLesFiltresDuJournal);
}else{
  brancherLesFiltresDuJournal();
}

/* 📜 L'ANCIEN JOURNAL, celui du classeur (90 jours) — lisible tel
   qu'il était, le temps que le journal en direct ait son histoire. */
async function afficherJournalDuClasseur(jourPrecis){
  const zone = $('journalListe');
  if(!zone) return;
  etatJournal.classeur = true;      /* le direct se tait pendant ce temps */

  const qui = ($('journalQui') && $('journalQui').value.trim()) || '';
  const eleve = ($('journalEleve') && $('journalEleve').value.trim()) || '';
  const periode = ($('journalPeriode') && $('journalPeriode').value) || '7';

  let depuis = '';
  if(jourPrecis) depuis = jourPrecis;
  else if(periode !== 'tout'){
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

  let lignes = (data && data.lignes) || [];
  /* Venu d'une alerte : on ne garde que la journée concernée */
  if(jourPrecis) lignes = lignes.filter(l => l.jour === jourPrecis);
  zone.innerHTML = '';

  /* v1147 — on revient au direct d'un geste */
  etatJournal.classeur = true;
  const retour = document.createElement('button');
  retour.className = 'btn btn-secondary';
  retour.style.cssText = 'padding:9px;font-size:13px;margin-bottom:10px;';
  retour.textContent = '← Revenir au journal en direct';
  retour.addEventListener('click', () => { etatJournal.signature = ''; afficherJournal(); });
  zone.appendChild(retour);

  /* Les points à regarder, avant le détail */
  zone.appendChild(blocAlertes((data && data.alertes) || []));

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
    '<br><span style="opacity:.8;">' + phraseConservation(data) + '</span>' +
    /* UNE RECHERCHE QUI S'ARRÊTE DOIT LE DIRE. Sinon « rien
       trouvé » veut dire à la fois « ça n'existe pas » et « je
       n'ai pas cherché jusqu'au bout ». */
    ((data && data.complet === false)
      ? '<br><span style="color:var(--warn-text);">⚠️ Recherche ' +
        'interrompue après ' + (data.lues || 0) + ' lignes remontées ' +
        "jusqu'au " + jourDuJournal(data.plusAncienLu) + '. Ajoute une date ' +
        'de début pour chercher plus loin.</span>'
      : '');
  zone.appendChild(tete);

  if(lignes.length){
    const bExp = document.createElement('button');
    bExp.className = 'btn btn-secondary';
    bExp.style.cssText = 'padding:9px;font-size:13px;margin-bottom:10px;';
    bExp.textContent = '📥 Exporter en tableur (' + lignes.length + ' lignes)';
    bExp.addEventListener('click', () => exporterJournal(lignes));
    zone.appendChild(bExp);
  }

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

    /* Un permis noté par erreur : le bouton défait tout, résultat
       et suppression du suivi comprise. */
    const bAnnul = boutonAnnulerResultat(l);
    if(bAnnul) d.appendChild(bAnnul);

    zone.appendChild(d);
  });
}


/* ============================================================
   DÉFAIRE UN RÉSULTAT NOTÉ PAR ERREUR

   « Permis obtenu » supprime la ligne de suivi de l'élève : le
   retrouver à la main est laborieux. Ce bouton remet tout en
   place.
   ============================================================ */

function boutonAnnulerResultat(l){
  /* Seul un résultat d'examen se défait ici, et par un
     administrateur : c'est une correction, pas une manœuvre
     ordinaire.

     « Fiche de suivi supprimée » compte aussi : c'est ce que
     laisse un permis noté obtenu, et souvent la seule trace
     visible de l'erreur. */
  if(ACCES.role !== 'admin') return null;
  if(!l.eleve) return null;

  const estResultat = /résultat|resultat/i.test(l.action || '');
  const estSuppression = /suivi supprim/i.test(l.action || '');
  if(!estResultat && !estSuppression) return null;

  const obtenu = estSuppression ||
    /obtenu/i.test((l.detail || '') + ' ' + (l.action || ''));

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:5px 8px;font-size:11px;margin:0;' +
    'flex-shrink:0;color:var(--muted);';
  b.textContent = '↩️';
  b.title = estSuppression ? 'Rétablir cet élève' : 'Annuler ce résultat';

  b.addEventListener('click', async () => {
    const quoi = await fenetre(
      (estSuppression ? 'Rétablir ' : 'Annuler le résultat de ') +
      l.eleve + ' ?\n\n' +
      (obtenu
        ? 'Son permis avait été noté obtenu, et sa ligne de suivi ' +
          'supprimée. Que faut-il en faire ?'
        : 'Le résultat sera effacé et son suivi remis en place.'),
      [{ nom: 'Annuler', valeur: '' },
       { nom: 'Le remettre ajourné', valeur: 'ajourne' },
       { nom: 'En attente de résultat', valeur: 'attente', principal: true }],
      'Corriger un résultat');

    if(!quoi) return;

    b.disabled = true;
    b.textContent = '…';
    try{
      const d = await appelPrep({
        action: 'resultatAnnuler',
        eleve: l.eleve,
        remettre: quoi === 'ajourne' ? 'ajourne' : ''
      });

      if(d && d.status === 'error') throw new Error(d.message);

      const ef = (d && d.efface) || {};
      await informer(
        l.eleve + ' est rétabli.\n\n' +
        (ef.resultat
          ? 'Était noté : ' + ef.resultat +
            (ef.dateExamen ? ' le ' + ef.dateExamen : '') + '\n'
          : 'Aucun résultat n\'était enregistré.\n') +
        (d && d.suiviRecree
          ? (quoi === 'ajourne'
              ? 'Il est remis en attente de son bilan d\'examen : tu le ' +
                'retrouveras dans Permis passés.'
              : 'Son suivi est rétabli, en attente de résultat.')
          : '⚠️ Le résultat est effacé, mais son suivi n\'a pas pu être ' +
            'recréé. Refais-lui un bilan pour le remettre dans les listes.'),
        'Corriger un résultat');

      afficherJournal();
      if(typeof afficherBureau === 'function') afficherBureau();
    }catch(e){
      showToast('Impossible : ' + e.message);
      b.disabled = false;
      b.textContent = '↩️';
    }
  });

  return b;
}


/* « 2026-08-24 » → « 24/08/2026 ». */
/* ⚠️ NOM PROPRE À CE MODULE — v878. Elle s'appelait « jourFr »,
   comme celle de ec-page-eleve.js. Deux fonctions de même nom au niveau
   global, et c'est la dernière chargée qui répond aux deux : celle-ci gagnait, et les vingt-six dates du
   dossier élève perdaient leur mise en forme.
   Le nom dit maintenant de quelle date il s'agit. Voir
   test-heures-decalees.js, qui refuse désormais tout doublon. */
function jourDuJournal(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (m[3] + '/' + m[2] + '/' + m[1]) : (iso || '?');
}

/* ------------------------------------------------------------
   CE QUE LE JOURNAL GARDE VRAIMENT

   L'écran annonçait « conservé 90 jours » et c'était la règle,
   pas le fait : un plafond de 20 000 lignes s'applique en plus, et
   depuis que TOUTES les actions sont journalisées (v765) c'est lui
   qui mord en premier. Annoncer 90 jours quand la plus ancienne
   ligne date de trois semaines, c'est promettre une trace qui
   n'existe pas — et on ne s'en aperçoit que le jour où on la
   cherche.
   ------------------------------------------------------------ */
function phraseConservation(data){
  const total = (data && data.total) || 0;
  const jours = (data && data.conservation) || 90;
  const plafond = 20000;

  let p = 'Journal : ' + total + ' ligne(s), conservées ' + jours + ' jours';
  if(total >= plafond * 0.95){
    p += ' — <strong>plafond de ' + plafond + ' lignes quasi atteint</strong>' +
         (data && data.plusAncienLu
            ? ', la trace ne remonte plus qu\'au ' + jourDuJournal(data.plusAncienLu)
            : ', la trace ne remonte plus aussi loin qu\'annoncé');
  }
  return p;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-journal.js'] = true;
