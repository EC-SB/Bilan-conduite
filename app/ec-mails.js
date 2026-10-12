/* Déployé le 12/10/2026 — v1146 */
/* ============================================================
   ec-mails.js
   ✉️ Les mails envoyés — Outils › Mesurer
   Application Bilan de conduite — Évolution Conduites

   David, le 12 octobre : « dans Outils, dans Mesurer, je voudrais
   un sous-onglet avec tous les mails qui sont envoyés ».
   Ses arbitrages : le texte se relit 3 mois, la ligne reste
   12 mois ; administrateurs seuls, comme le Journal.

   La trace est posée par le Worker, à l'endroit unique d'où
   partent les mails (envoyerMail) : cet écran ne fait que la
   relire. Les lignes arrivent SANS leur texte — il se lit un mail
   à la fois, quand on en touche un (mailLire).

   ⚠️ LA LIGNE EST CELLE DU JOURNAL. Même rangée, mêmes jours en
   titre, même rouge pour ce qui a raté : deux écrans de « Mesurer »
   qui ne se ressemblent pas, c'est deux façons de lire à apprendre.
   ============================================================ */

/* Les types, avec leur logo. L'ordre est celui du menu. */
const GENRES_MAIL = [
  ['bilan',      '📝', 'Bilans de cours',          'bilan',       'bilans'],
  ['examen',     '🎯', 'Examens',                  'examen',      'examens'],
  ['evaluation', '📋', 'Évaluations',              'évaluation',  'évaluations'],
  ['rappel',     '📅', 'Rappels de cours',         'rappel',      'rappels'],
  ['correction', '🚦', 'Corrections de procédure', 'correction',  'corrections'],
  ['recitation', '🎙️', 'Récitations reçues',       'récitation',  'récitations'],
  ['rvp',        '👨‍👩‍👧', 'Rendez-vous AAC / CS',     'rendez-vous', 'rendez-vous'],
  ['ecoute',     '🎧', 'Écoutes pédagogiques',     'écoute',      'écoutes'],
  ['acces',      '🔑', 'Coin révisions (accès)',   'accès',       'accès'],
  ['modele',     '📄', 'Messages (modèles)',       'message',     'messages'],
  ['paiement',   '💳', 'Paiement',                 'paiement',    'paiements'],
  ['placesbe',   '🚚', 'Places BE',                'places BE',   'places BE'],
  ['handicap',   '♿', 'Fiches d’évaluation',      'fiche',       'fiches'],
  ['autre',      '✉️', 'Autres',                   'autre',       'autres']
];
function genreDuMailEcran(cle){
  return GENRES_MAIL.find(g => g[0] === cle) || GENRES_MAIL[GENRES_MAIL.length - 1];
}

/* L'état de l'écran : ce qui est lu, et les filtres */
const etatMails = { lignes: null, jours: 7, texteJours: 92, statut: 'tous' };

async function afficherMails(recharger){
  const zone = $('mailsListe');
  if(!zone) return;
  if(typeof ACCES === 'undefined' || ACCES.role !== 'admin') return;

  const periode = $('mailsPeriode');
  const jours = parseInt((periode && periode.value) || '7', 10) || 7;

  if(recharger || etatMails.lignes === null || etatMails.jours !== jours){
    zone.innerHTML = '<div class="empty">Lecture des mails…</div>';
    try{
      const d = await appelPrep({ action: 'mailsList', jours: jours });
      etatMails.lignes = (d && d.lignes) || [];
      etatMails.jours = jours;
      etatMails.texteJours = (d && d.texteJours) || 92;
    }catch(e){
      zone.innerHTML = '<div class="empty">⚠️ ' +
        String((e && e.message) || e).replace(/</g, '&lt;') + '</div>';
      return;
    }
    remplirLesTypesDeMails();
  }
  dessinerLesMails();
}

/* Le menu des types ne propose que ceux qui ont servi : un type à
   zéro mail est une impasse. */
function remplirLesTypesDeMails(){
  const sel = $('mailsType');
  if(!sel) return;
  const avant = sel.value;
  const vus = {};
  (etatMails.lignes || []).forEach(l => { vus[l.genre || 'autre'] = true; });
  sel.innerHTML = '<option value="">Tous les types</option>' +
    GENRES_MAIL.filter(g => vus[g[0]])
      .map(g => '<option value="' + g[0] + '">' + g[1] + ' ' + g[2] + '</option>').join('');
  if([...sel.options].some(o => o.value === avant)) sel.value = avant;
}

function dessinerLesMails(){
  const zone = $('mailsListe');
  if(!zone) return;
  zone.innerHTML = '';

  const q = normaliserMot(($('mailsCherche') && $('mailsCherche').value) || '');
  const type = ($('mailsType') && $('mailsType').value) || '';

  /* Ce que la recherche et le type gardent ; le statut se compte
     dessus, pour que les pastilles disent ce qu'on verra. */
  const filtrees = (etatMails.lignes || []).filter(l => {
    if(type && (l.genre || 'autre') !== type) return false;
    if(q){
      const foin = normaliserMot([l.eleve, l.destinataire, l.sujet].join(' '));
      if(foin.indexOf(q) === -1) return false;
    }
    return true;
  });
  const partis = filtrees.filter(l => l.statut !== 'echec');
  const echecs = filtrees.filter(l => l.statut === 'echec');
  const lignes = etatMails.statut === 'ok' ? partis
               : etatMails.statut === 'echec' ? echecs : filtrees;

  /* Les filtres de statut — ceux de « Pas prêts », mot pour mot */
  const f = document.createElement('div');
  f.className = 'filtres-vue';
  f.style.cssText = 'margin:4px 0 12px;';
  [['tous', 'Tous', filtrees.length, false],
   ['ok', '✅ Partis', partis.length, false],
   ['echec', '❌ Échecs', echecs.length, echecs.length > 0]].forEach(([cle, t, n, rouge]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (etatMails.statut === cle ? 'btn-primary' : 'btn-secondary');
    b.appendChild(document.createTextNode(t));
    const s = document.createElement('span');
    s.className = 'n';
    s.textContent = String(n);
    if(rouge) s.style.color = 'var(--red)';
    b.appendChild(s);
    b.addEventListener('click', () => { etatMails.statut = cle; dessinerLesMails(); });
    f.appendChild(b);
  });
  zone.appendChild(f);

  /* Le récapitulatif : combien, et de quoi */
  const parGenre = {};
  filtrees.forEach(l => { const g = l.genre || 'autre'; parGenre[g] = (parGenre[g] || 0) + 1; });
  const tri = Object.keys(parGenre).sort((a, b) => parGenre[b] - parGenre[a]);
  const nommes = tri.slice(0, 4).map(g => {
    const x = genreDuMailEcran(g);
    return parGenre[g] + ' ' + (parGenre[g] > 1 ? x[4] : x[3]);
  });
  const reste = tri.slice(4).reduce((s, g) => s + parGenre[g], 0);
  if(reste) nommes.push(reste + ' autre' + (reste > 1 ? 's' : ''));

  const periode = etatMails.jours >= 366 ? 'sur 12 mois'
    : etatMails.jours <= 2 ? 'aujourd’hui et hier'
    : 'sur ' + etatMails.jours + ' jours';
  const tete = document.createElement('div');
  tete.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.7;' +
    'padding:8px 10px;background:var(--navy);border:1px solid var(--line);' +
    'border-radius:8px;margin-bottom:10px;';
  tete.innerHTML = '<strong style="color:var(--cream);">' + filtrees.length + ' mail' +
    (filtrees.length > 1 ? 's' : '') + '</strong> ' + periode +
    (nommes.length ? ' · ' + nommes.join(' · ') : '') +
    '<br><span style="opacity:.8;">Le texte des mails de plus de 3 mois est effacé ; la ligne reste.</span>';
  zone.appendChild(tete);

  if(!lignes.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = (etatMails.lignes || []).length
      ? 'Aucun mail ne correspond.' : 'Aucun mail sur cette période.';
    zone.appendChild(v);
    return;
  }

  /* Par jour, du plus récent au plus ancien */
  let jourCourant = null;
  lignes.forEach(l => {
    if(l.jour !== jourCourant){
      jourCourant = l.jour;
      const t = document.createElement('div');
      t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
        'margin:12px 0 4px;';
      t.textContent = l.jour ? dateEnToutesLettres(l.jour) : '';
      zone.appendChild(t);
    }
    zone.appendChild(ligneDeMail(l));
  });
}

function ligneDeMail(l){
  const rate = l.statut === 'echec';
  const g = genreDuMailEcran(l.genre || 'autre');
  const e = s => echapper(String(s == null ? '' : s));

  const d = document.createElement('div');
  d.className = 'ligneMail';
  d.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:7px 8px;' +
    'border-bottom:1px solid var(--line);font-size:13px;line-height:1.5;cursor:pointer;' +
    (rate ? 'background:rgba(228,87,46,.07);border-radius:6px;' : '');

  const ic = document.createElement('span');
  ic.style.cssText = 'flex-shrink:0;font-size:15px;';
  ic.textContent = g[1];
  d.appendChild(ic);

  const txt = document.createElement('div');
  txt.style.cssText = 'flex:1;min-width:0;overflow-wrap:anywhere;';
  const bas = ['à ' + e(l.destinataire || '—')];
  /* « envoi automatique » se dit tel quel : « par envoi automatique »
     sonne comme une personne. */
  if(l.par && !rate) bas.push(/automatique$/.test(l.par) ? e(l.par) : 'par ' + e(l.par));
  if(l.pj) bas.push(e(l.pj));
  txt.innerHTML =
    '<span style="color:var(--muted);">' + e(l.heure) + '</span> · ' +
    '<strong>' + e(l.sujet || '(sans objet)') + '</strong>' +
    (l.eleve ? ' · <strong>' + e(l.eleve) + '</strong>' : '') +
    '<br><span style="color:var(--muted);font-size:12px;">' + bas.join(' · ') +
    (rate ? ' — <span style="color:var(--warn-text);">❌ ' + e(l.motif || 'non parti') + '</span>' : '') +
    '</span>';
  d.appendChild(txt);

  const st = document.createElement('span');
  st.style.cssText = 'flex-shrink:0;font-size:12px;font-weight:700;color:' +
    (rate ? 'var(--red)' : 'var(--accent-text)') + ';';
  st.textContent = rate ? '❌ échec' : '✅ parti';
  d.appendChild(st);

  d.addEventListener('click', () => ouvrirUnMail(l));
  return d;
}

/* La fenêtre d'un mail : qui, quand, à qui, et le texte tel qu'il
   est parti — en lecture seule. */
async function ouvrirUnMail(l){
  const e = s => echapper(String(s == null ? '' : s));
  const g = genreDuMailEcran(l.genre || 'autre');
  const rate = l.statut === 'echec';

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(560px, 94vw)';

  const h = document.createElement('h3');
  h.textContent = g[1] + ' ' + (l.sujet || '(sans objet)');
  boite.appendChild(h);

  const gris = t => '<span style="color:var(--muted);">' + t + '</span>';
  const info = document.createElement('div');
  info.style.cssText = 'font-size:13px;line-height:1.8;margin-bottom:10px;overflow-wrap:anywhere;';
  info.innerHTML =
    gris('Envoyé le') + ' ' + e(l.jour ? dateEnToutesLettres(l.jour) : '') +
      (l.heure ? ' à ' + e(l.heure) : '') +
      (l.par ? ' · ' + gris('par') + ' ' + e(l.par) : '') + '<br>' +
    gris('À') + ' ' + e(l.destinataire || '—') +
      (l.eleve ? ' · ' + gris('Élève') + ' <strong>' + e(l.eleve) + '</strong>' : '') + '<br>' +
    (l.pj ? gris('Pièce jointe') + ' ' + e(l.pj) + '<br>' : '') +
    (rate
      ? '<span style="color:var(--red);font-weight:700;">❌ Pas parti</span>' +
        (l.motif ? ' — ' + e(l.motif) : '')
      : '<span style="color:var(--accent-text);font-weight:700;">✅ Parti</span>');
  boite.appendChild(info);

  const t = document.createElement('textarea');
  t.readOnly = true;
  t.style.cssText = 'width:100%;min-height:200px;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:14px;line-height:1.55;' +
    'font-family:inherit;margin:0 0 6px;';
  t.value = 'Lecture du texte…';
  boite.appendChild(t);

  const note = document.createElement('div');
  note.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:12px;';
  boite.appendChild(note);

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', () => fermerFond(fond));
  const bC = document.createElement('button');
  bC.className = 'btn btn-primary';
  bC.textContent = '📋 Copier le texte';
  bC.disabled = true;
  bC.addEventListener('click', async () => {
    const ok = (typeof copierDansLePressePapier === 'function')
      ? await copierDansLePressePapier(t.value) : false;
    showToast(ok ? 'Texte copié ✅' : 'Copie impossible');
  });
  rangee.appendChild(bF);
  rangee.appendChild(bC);
  boite.appendChild(rangee);
  fond.appendChild(boite);
  fond.addEventListener('click', ev => { if(ev.target === fond) fermerFond(fond); });
  document.body.appendChild(fond);

  if(l.source === 'ancien' || !l.aTexte){
    t.style.display = 'none';
    note.textContent = l.source === 'ancien'
      ? 'Le texte n’était pas gardé avant cette version.'
      : 'Texte effacé : il ne se garde que 3 mois. La ligne, elle, reste 12 mois.';
    return;
  }

  try{
    const d = await appelPrep({ action: 'mailLire', id: l.id });
    if(!d || d.texte === null || d.texte === undefined){
      t.style.display = 'none';
      note.textContent = 'Texte effacé : il ne se garde que 3 mois. La ligne, elle, reste 12 mois.';
      return;
    }
    t.value = d.texte;
    bC.disabled = false;
    note.textContent = 'Lecture seule — c’est le texte tel qu’il est parti.' +
      (l.jour ? ' Il s’effacera le ' + dateEnToutesLettres(jourPlusMail(l.jour, etatMails.texteJours)) + '.' : '');
  }catch(err){
    t.style.display = 'none';
    note.textContent = '⚠️ Texte illisible : ' + String((err && err.message) || err);
  }
}

/* « 2026-10-12 » + 92 jours → « 2027-01-12 » */
function jourPlusMail(iso, jours){
  const p = String(iso || '').split('-').map(Number);
  if(p.length !== 3 || p.some(isNaN)) return '';
  const d = new Date(p[0], p[1] - 1, p[2] + (jours || 0));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

/* Les filtres de l'écran : la recherche et le type filtrent ce
   qui est déjà lu ; la période relit. */
function brancherLesMails(){
  if($('mailsCherche')) $('mailsCherche').addEventListener('input', dessinerLesMails);
  if($('mailsType')) $('mailsType').addEventListener('change', dessinerLesMails);
  if($('mailsPeriode')) $('mailsPeriode').addEventListener('change', () => afficherMails(true));
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', brancherLesMails);
}else{
  brancherLesMails();
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-mails.js'] = true;
