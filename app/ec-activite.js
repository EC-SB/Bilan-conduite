/* Déployé le 12/10/2026 — v1147 */
/* ============================================================
   ec-activite.js
   🎓 Ce que font les élèves dans leur espace — Outils › Mesurer,
   et le petit bloc de son dossier (onglet 🔑 Accès)
   Application Bilan de conduite — Évolution Conduites

   David, le 12 octobre : « il faut aussi un journal de ce que font
   les élèves sur leur espace ». Le geste, jamais le contenu ; gardé
   12 mois ; administrateurs seuls. La phrase qui le dit aux élèves
   est sous le formulaire de connexion de leur espace (eleve.html).

   Les gestes sont notés par le Worker, dans la route /eleve, après
   chaque porte réussie ; cet écran ne fait que les relire.
   ============================================================ */

/* Ce que dit chaque geste, son logo, et sa famille de pastille */
const GESTES_AFFICHES = {
  connexion:     ['🔑', 'connexions',    () => 's’est connecté(e)'],
  bilan:         ['📄', 'bilans',        d => 'a ouvert son bilan' + (d ? ' du ' + d : '')],
  recitation:    ['🎙️', 'recitations',   d => 'a envoyé une récitation' + (d ? ' — « ' + d + ' »' : '')],
  video:         ['🎬', 'revisions',     d => 'a vu ' + (d ? '« ' + d + ' »' : 'une étape') + ' dans le coin révisions'],
  presence:      ['✋', 'creneaux',      () => 'a confirmé sa présence'],
  message:       ['💬', 'messages',      () => 'a écrit un message'],
  actionrapide:  ['💬', 'messages',      () => 'a écrit au bureau'],
  photo:         ['📷', 'messages',      () => 'a envoyé une photo'],
  vocal:         ['🎤', 'messages',      () => 'a envoyé un vocal'],
  videomsg:      ['🎬', 'messages',      () => 'a envoyé une vidéo'],
  reaction:      ['👍', 'messages',      () => 'a réagi à un message'],
  lu:            ['👀', 'messages',      () => 'a lu ses messages'],
  creneau:       ['📅', 'creneaux',      () => 'a répondu à un créneau'],
  notifications: ['🔔', 'notifications', () => 'a activé les notifications'],
  bilanpost:     ['📝', 'bilans',        () => 'a envoyé son bilan post-permis'],
  boite:         ['⚙️', 'autres',        () => 'a choisi sa boîte de vitesses']
};
const FAMILLES_ACTIVITE = [
  ['connexions',    '🔑 Connexions'],
  ['bilans',        '📄 Bilans ouverts'],
  ['messages',      '💬 Messages'],
  ['creneaux',      '📅 Créneaux'],
  ['notifications', '🔔 Notifications'],
  ['recitations',   '🎙️ Récitations'],
  ['revisions',     '🎬 Coin révisions'],
  ['autres',        '• Autres']
];
function gesteAffiche(g){
  return GESTES_AFFICHES[g] || ['•', 'autres', () => g];
}

const etatActivite = { data: null, famille: 'tous', jours: 7 };

async function afficherActiviteEleves(recharger){
  const zone = $('activiteListe');
  if(!zone) return;
  if(typeof ACCES === 'undefined' || ACCES.role !== 'admin') return;
  const jours = parseInt(($('activitePeriode') && $('activitePeriode').value) || '7', 10) || 7;
  const eleve = ($('activiteEleve') && $('activiteEleve').value.trim()) || '';
  if(recharger || !etatActivite.data || etatActivite.jours !== jours || etatActivite.eleve !== eleve){
    zone.innerHTML = '<div class="empty">Lecture…</div>';
    try{
      etatActivite.data = await appelPrep({ action: 'activiteEleves', jours: jours, eleve: eleve });
      etatActivite.jours = jours;
      etatActivite.eleve = eleve;
    }catch(e){
      zone.innerHTML = '<div class="empty">⚠️ ' +
        String((e && e.message) || e).replace(/</g, '&lt;') + '</div>';
      return;
    }
  }
  dessinerActiviteEleves();
}

function dessinerActiviteEleves(){
  const zone = $('activiteListe');
  const data = etatActivite.data;
  if(!zone || !data) return;
  zone.innerHTML = '';

  const toutes = data.lignes || [];
  const parFam = {};
  toutes.forEach(l => { const f = gesteAffiche(l.geste)[1]; parFam[f] = (parFam[f] || 0) + 1; });
  if(etatActivite.famille !== 'tous' && !parFam[etatActivite.famille]) etatActivite.famille = 'tous';

  const f = document.createElement('div');
  f.className = 'filtres-vue';
  f.style.cssText = 'margin:4px 0 12px;';
  const pastille = (cle, titre, n) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (etatActivite.famille === cle ? 'btn-primary' : 'btn-secondary');
    b.appendChild(document.createTextNode(titre));
    const s = document.createElement('span');
    s.className = 'n';
    s.textContent = String(n);
    b.appendChild(s);
    b.addEventListener('click', () => { etatActivite.famille = cle; dessinerActiviteEleves(); });
    f.appendChild(b);
  };
  pastille('tous', 'Tout', toutes.length);
  FAMILLES_ACTIVITE.forEach(([cle, t]) => { if(parFam[cle]) pastille(cle, t, parFam[cle]); });
  zone.appendChild(f);

  const lignes = etatActivite.famille === 'tous' ? toutes
    : toutes.filter(l => gesteAffiche(l.geste)[1] === etatActivite.famille);

  /* Le résumé : combien, combien d'élèves, et qui ne vient pas */
  const venus = {};
  toutes.forEach(l => { venus[normaliserMot(l.eleve)] = true; });
  const nVenus = Object.keys(venus).length;
  const periode = etatActivite.jours >= 366 ? 'sur 12 mois'
    : etatActivite.jours <= 2 ? 'aujourd’hui et hier'
    : 'sur ' + etatActivite.jours + ' jours';
  let absents = '';
  if(Array.isArray(data.absents)){
    absents = data.absents.length
      ? 'Pas venus depuis 30 jours alors que leur accès est ouvert : <strong style="color:var(--cream);">' +
        data.absents.length + ' élève' + (data.absents.length > 1 ? 's' : '') + '</strong> — ' +
        echapper(data.absents.slice(0, 6).join(', ')) + (data.absents.length > 6 ? '…' : '')
      : 'Tous les élèves qui ont un accès ouvert sont venus ces 30 derniers jours.';
  }else if(data.comptesDesLe){
    absents = 'Le compte des élèves qui ne viennent pas commencera le ' +
      echapper(dateEnToutesLettres(data.comptesDesLe)) + ' : il faut 30 jours de recul.';
  }
  const tete = document.createElement('div');
  tete.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.7;' +
    'padding:8px 10px;background:var(--navy);border:1px solid var(--line);' +
    'border-radius:8px;margin-bottom:10px;';
  tete.innerHTML = '<strong style="color:var(--cream);">' + lignes.length + ' action' +
    (lignes.length > 1 ? 's' : '') + '</strong> · ' + nVenus + ' élève' + (nVenus > 1 ? 's' : '') +
    ' venu' + (nVenus > 1 ? 's' : '') + ' ' + periode +
    (absents ? '<br><span style="opacity:.8;">' + absents + '</span>' : '');
  zone.appendChild(tete);

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
      t.textContent = dateEnToutesLettres(l.jour);
      zone.appendChild(t);
    }
    zone.appendChild(ligneDActivite(l, true));
  });
}

/* Une ligne — la même rangée que le Journal */
function ligneDActivite(l, avecNom, avecJour){
  const g = gesteAffiche(l.geste);
  const d = document.createElement('div');
  d.className = 'ligneActivite';
  d.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:7px 8px;' +
    'border-bottom:1px solid var(--line);font-size:13px;line-height:1.5;';
  const ic = document.createElement('span');
  ic.style.cssText = 'flex-shrink:0;font-size:15px;';
  ic.textContent = g[0];
  d.appendChild(ic);
  const txt = document.createElement('div');
  txt.style.cssText = 'flex:1;min-width:0;overflow-wrap:anywhere;';
  const quand = avecJour
    ? String(l.jour || '').split('-').reverse().slice(0, 2).join('/') + ' ' + (l.heure || '')
    : (l.heure || '');
  const dansLeTexte = (l.geste === 'bilan' || l.geste === 'recitation' || l.geste === 'video');
  txt.innerHTML = '<span style="color:var(--muted);">' + echapper(quand) + '</span>' +
    (avecNom ? ' · <strong>' + echapper(l.eleve || '') + '</strong>' : '') +
    ' — ' + echapper(g[2](dansLeTexte ? l.detail : '')) +
    (!dansLeTexte && l.detail
      ? '<br><span style="color:var(--muted);font-size:12px;">' + echapper(l.detail) + '</span>' : '');
  d.appendChild(txt);
  return d;
}

/* ------------------------------------------------------------
   DANS SON DOSSIER, ONGLET 🔑 ACCÈS — sous « Son parcours »
   ------------------------------------------------------------ */
async function posterActiviteDuDossier(corps, nom){
  if(typeof ACCES === 'undefined' || ACCES.role !== 'admin') return;
  const cadre = document.createElement('div');
  cadre.className = 'blocActiviteDossier';
  cadre.style.cssText = 'margin-top:16px;padding-top:14px;border-top:1px solid var(--line);';
  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:8px;';
  t.textContent = '🕓 Son activité dans son espace';
  cadre.appendChild(t);
  const zone = document.createElement('div');
  zone.innerHTML = '<div class="empty">Lecture…</div>';
  cadre.appendChild(zone);
  corps.appendChild(cadre);

  try{
    const d = await appelPrep({ action: 'activiteEleve', eleve: nom });
    zone.innerHTML = '';
    const lignes = (d && d.lignes) || [];
    const derniere = lignes.find(l => l.geste === 'connexion') || lignes[0];
    const r = document.createElement('div');
    r.style.cssText = 'font-size:12.5px;line-height:1.6;margin-bottom:6px;';
    r.innerHTML = derniere
      ? 'Dernière venue : <strong>' + echapper(dateEnToutesLettres(derniere.jour)) + ' à ' +
        echapper(derniere.heure) + '</strong> · ' + (d.ceMois || 0) + ' visite' +
        ((d.ceMois || 0) > 1 ? 's' : '') + ' ce mois-ci'
      : 'Aucun passage noté dans son espace pour le moment.';
    zone.appendChild(r);
    lignes.slice(0, 3).forEach(l => zone.appendChild(ligneDActivite(l, false, true)));
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'padding:9px;font-size:13px;margin-top:10px;';
    b.textContent = '🎓 Tout son historique (Outils › Activité des élèves)';
    b.addEventListener('click', () => {
      if($('activiteEleve')) $('activiteEleve').value = nom;
      if($('activitePeriode')) $('activitePeriode').value = '366';
      if(typeof afficherVue === 'function') afficherVue('outils', 'activite');
    });
    zone.appendChild(b);
  }catch(e){
    zone.innerHTML = '';
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = '⚠️ Activité illisible : ' + String((e && e.message) || e);
    zone.appendChild(v);
  }
}

/* Les filtres de l'écran */
let minuteurActivite = null;
function brancherActiviteEleves(){
  if($('activiteEleve')) $('activiteEleve').addEventListener('input', () => {
    clearTimeout(minuteurActivite);
    minuteurActivite = setTimeout(() => afficherActiviteEleves(true), 400);
  });
  if($('activitePeriode')) $('activitePeriode').addEventListener('change', () => afficherActiviteEleves(true));
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', brancherActiviteEleves);
}else{
  brancherActiviteEleves();
}

/* ============================================================
   🟢 « JE SUIS LÀ » — le signe de présence, pour tout le monde

   Une fois par minute, appli au premier plan seulement : ce qu'on
   envoie, c'est l'écran ouvert, et rien d'autre. Page cachée,
   téléphone en veille : on se tait, et au bout de 2 minutes la
   personne quitte « En ligne maintenant ».
   ============================================================ */
function ecranDePresence(){
  try{
    const o = (typeof ongletActif !== 'undefined') ? ongletActif : '';
    const nomCours = ($('studentName') && $('studentName').value.trim()) || '';
    if(o === 'cours'){
      const manuel = $('manuelView');
      if(manuel && manuel.style.display !== 'none' && manuel.offsetParent !== null){
        return '✍️ Bilan à la main' + (nomCours ? ' — ' + nomCours : '');
      }
      const rec = $('recordView');
      if(nomCours && rec && rec.offsetParent !== null) return '🎙️ Cours — ' + nomCours;
      return '📅 Mes prochains cours';
    }
    const vue = (typeof vueActive !== 'undefined' && vueActive[o]) || '';
    if(vue === 'dossier' && typeof elevePageOuverte !== 'undefined' && elevePageOuverte){
      return '🔍 Dossier de ' + elevePageOuverte;
    }
    if(o === 'messagerie') return '💬 Messagerie';
    const on = (typeof ONGLETS_DROITS !== 'undefined') ? ONGLETS_DROITS.find(x => x.cle === o) : null;
    const v = (typeof VUES !== 'undefined' && VUES[o]) ? VUES[o].find(x => x[0] === vue) : null;
    return ((on && on.nom) || o || 'Accueil') + (v ? ' › ' + v[1] : '');
  }catch(e){ return ''; }
}

let dernierSignePresence = { quand: 0, ecran: '' };
function envoyerSignePresence(){
  if(typeof ACCES === 'undefined' || !ACCES || !ACCES.code) return;
  if(document.visibilityState !== 'visible') return;
  const ecran = ecranDePresence();
  /* Un signe par minute, ou tout de suite si l'écran a changé */
  if(ecran === dernierSignePresence.ecran && Date.now() - dernierSignePresence.quand < 55000) return;
  dernierSignePresence = { quand: Date.now(), ecran: ecran };
  appelPrep({ action: 'presence', ecran: ecran }).catch(() => {});
}
setInterval(envoyerSignePresence, 15000);
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'visible') envoyerSignePresence();
});

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-activite.js'] = true;
