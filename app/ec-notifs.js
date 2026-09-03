/* Déployé le 03/09/2026 à 08:47 — v823 */
/* ============================================================
   ec-notifs.js
   Ce qui attend une décision du bureau.

   La pastille sur l'onglet Suivi dit combien. Cet écran dit quoi,
   et permet de masquer ce qui ne concerne plus personne : un élève
   parti, un cas réglé par téléphone.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les trois alertes suivies, avec le droit qui les gouverne.

   « champ » : ce que la NOTE du moniteur raconte.
   « foi »   : ce que le CLASSEUR sait — la fiche de suivi et les
               sessions d'examen. Quand les deux se contredisent,
               c'est le classeur qui a raison. Voir notifsEnAttente. */
const TYPES_NOTIF = [
  { cle:'examblanc', nom:'📝 Examen blanc à prévoir',
    droit:'notif_examblanc', champ:'examBlanc', foi:'examBlanc' },
  { cle:'simu',      nom:'🌙 Simulateur nuit et risques à prévoir',
    droit:'notif_simu',      champ:'simuNuit',  foi:'simuNuit' },
  { cle:'permis',    nom:"🚗 Date d'examen du permis à prévoir",
    droit:'notif_permis',    champ:'permis',    foi:'examPermis' }
];

let notifsMasquees = [];
let notifsLues = 0;

async function chargerNotifsMasquees(force){
  if(!force && Date.now() - notifsLues < 300000) return notifsMasquees;
  try{
    const d = await appelPrep({ action: 'notifList' });
    notifsMasquees = (d && d.masquees) || [];
    notifsLues = Date.now();
  }catch(e){ console.warn('Notifications masquées :', e); }
  return notifsMasquees;
}

/* Cette alerte a-t-elle été écartée ? */
function notifMasquee(eleve, type){
  return (notifsMasquees || []).some(x =>
    normaliserMot(x.eleve) === normaliserMot(eleve) && x.type === type);
}

/* Les alertes en attente, une fois retirées celles qu'on a masquées
   et celles que ce compte n'a pas à voir. */
function notifsEnAttente(eleves, ignorerDroits){
  const out = [];
  (eleves || []).forEach(e => {
    const a = analyserNote(e.note || '');

    /* ⚠️ LA NOTE N'EST PAS LA SOURCE, ELLE EST UN RÉCIT.

       « Lucile Xardel a une date d'examen » — et le bandeau
       réclamait quand même « Date d'examen du permis à prévoir ».
       La note du moniteur avait été écrite avant que le bureau ne
       lui donne sa place du 21 septembre ; elle disait donc encore
       « à prévoir », et personne ne relisait le classeur derrière
       elle. C'est la faute qu'on répare partout dans ce dossier :
       une même chose lue à deux endroits, et c'est le mauvais qui
       gagne.

       « etatQuiFaitFoi » existe justement pour ça — c'est lui qui a
       déjà réparé les cartes de « Mes prochains cours » en v817. Il
       lit la fiche de suivi et les sessions, qui sont plus récentes
       que tout ce qu'un moniteur a pu écrire. On le consulte
       D'ABORD, et la note ne parle que de ce qu'il ignore. */
    const foi = (typeof etatQuiFaitFoi === 'function')
      ? (etatQuiFaitFoi(e.eleve) || {}) : {};

    TYPES_NOTIF.forEach(t => {
      const etat = foi[t.foi] || a[t.champ];
      if(etat !== 'aprevoir') return;
      if(!ignorerDroits && typeof aDroit === 'function' && !aDroit(t.droit)) return;
      if(notifMasquee(e.eleve, t.cle)) return;
      out.push({ eleve: e.eleve, type: t.cle, nom: t.nom,
                 moniteur: e.moniteur || '', date: e.date || '' });
    });
  });
  return out;
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */

async function afficherNotifs(){
  const zone = $('notifsZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture des alertes…</div>';

  try{
    await chargerNotifsMasquees(true);
    await chargerBureau(false);
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  const eleves = (typeof etatBureau !== 'undefined' && etatBureau.eleves) || [];
  /* Ici on montre tout, quels que soient les droits du compte :
     c'est l'écran de réglage, pas la pastille. */
  const attente = notifsEnAttente(eleves, true);

  zone.innerHTML = '';

  /* ---- Qui voit quelles pastilles ---- */
  const r = document.createElement('div');
  r.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:12px 14px;margin-bottom:16px;';
  r.innerHTML =
    '<div style="font-size:14px;font-weight:700;color:var(--accent-text);margin-bottom:4px;">' +
      '👥 Qui voit quelles pastilles</div>' +
    '<div style="font-size:11px;color:var(--muted);line-height:1.55;">' +
      'Chaque type d\'alerte a son droit, à cocher compte par compte dans ' +
      '<strong>Outils → ⚙️ Accès</strong> :<br>' +
      TYPES_NOTIF.map(t => '· ' + t.nom + ' → <em>' + t.droit + '</em>').join('<br>') +
      '<br><br>Un compte sans ces droits ne voit aucune pastille.</div>';
  zone.appendChild(r);

  /* ---- Ce qui attend ---- */
  const t1 = document.createElement('div');
  t1.style.cssText = 'font-size:15px;font-weight:700;color:var(--accent-text);margin-bottom:8px;';
  t1.textContent = '🔔 En attente — ' + attente.length;
  zone.appendChild(t1);

  if(!attente.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.cssText = 'padding:12px;font-size:13px;margin-bottom:16px;';
    v.textContent = 'Rien à prévoir. Tout est programmé 🎉';
    zone.appendChild(v);
  }else{
    const l = document.createElement('div');
    l.style.marginBottom = '16px';
    /* Groupées par type : on traite les examens blancs ensemble */
    TYPES_NOTIF.forEach(t => {
      const lot = attente.filter(x => x.type === t.cle);
      if(!lot.length) return;

      const h = document.createElement('div');
      h.style.cssText = 'font-size:13px;font-weight:700;margin:10px 0 5px;';
      h.textContent = t.nom + ' — ' + lot.length;
      l.appendChild(h);

      lot.sort((a, b) => a.eleve.localeCompare(b.eleve, 'fr'))
         .forEach(x => l.appendChild(ligneNotif(x)));
    });
    zone.appendChild(l);
  }

  /* ---- Ce qu'on a masqué ---- */
  const t2 = document.createElement('div');
  t2.style.cssText = 'font-size:15px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
  t2.textContent = '🙈 Masquées — ' + notifsMasquees.length;
  zone.appendChild(t2);

  const a2 = document.createElement('div');
  a2.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5;';
  a2.textContent = "Elles ne comptent plus dans la pastille. Le dossier de l'élève " +
    "n'est pas modifié : remets-la si tu t'es trompé.";
  zone.appendChild(a2);

  if(!notifsMasquees.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.cssText = 'padding:10px;font-size:12px;';
    v.textContent = 'Aucune alerte masquée.';
    zone.appendChild(v);
  }else{
    const l2 = document.createElement('div');
    notifsMasquees.forEach(x => l2.appendChild(ligneMasquee(x)));
    zone.appendChild(l2);
  }

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-top:14px;padding:11px;font-size:13px;';
  b.textContent = '🔄 Actualiser';
  b.addEventListener('click', () => afficherNotifs());
  zone.appendChild(b);
}


/* Une alerte en attente, avec le bouton pour l'écarter */
function ligneNotif(x){
  const d = document.createElement('div');
  d.style.cssText = 'display:flex;gap:8px;align-items:center;border:1px solid var(--line);' +
    'border-radius:9px;padding:8px 11px;margin-bottom:4px;';

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:14px;line-height:1.5;';
  t.innerHTML = '<strong>' + x.eleve.replace(/</g, '&lt;') + '</strong>' +
    (x.moniteur ? '<div style="font-size:11px;color:var(--muted);">' +
      x.moniteur.replace(/</g, '&lt;') + (x.date ? ' · ' + x.date : '') + '</div>' : '');
  d.appendChild(t);

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:6px 10px;font-size:12px;margin:0;flex-shrink:0;';
  b.textContent = '🙈 Masquer';
  b.title = 'Retirer cette alerte de la pastille';
  b.addEventListener('click', async () => {
    if(!await confirmer('Masquer cette alerte ?\n\n' + x.eleve + ' — ' + x.nom +
        "\n\nLe dossier de l'élève n'est pas modifié : seule l'alerte " +
        'disparaît de la pastille.')) return;
    b.disabled = true;
    try{
      await appelPrep({ action: 'notifMasquer', eleve: x.eleve, type: x.type,
                        par: ACCES.moniteur || '' });
      showToast('Alerte masquée ✅');
      await rafraichirPastilleSuivi();
      afficherNotifs();
    }catch(e){ showToast('Impossible : ' + e.message); b.disabled = false; }
  });
  d.appendChild(b);

  return d;
}


/* Une alerte masquée, qu'on peut remettre */
function ligneMasquee(x){
  const t = TYPES_NOTIF.find(y => y.cle === x.type);

  const d = document.createElement('div');
  d.style.cssText = 'display:flex;gap:8px;align-items:center;border:1px solid var(--line);' +
    'border-radius:9px;padding:8px 11px;margin-bottom:4px;opacity:.65;';

  const z = document.createElement('div');
  z.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.5;';
  z.innerHTML = '<strong>' + x.eleve.replace(/</g, '&lt;') + '</strong> — ' +
    (t ? t.nom : x.type) +
    '<div style="font-size:11px;color:var(--muted);">masquée le ' + x.quand +
    (x.par ? ' par ' + x.par.replace(/</g, '&lt;') : '') + '</div>';
  d.appendChild(z);

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:6px 10px;font-size:12px;margin:0;flex-shrink:0;';
  b.textContent = '↩️ Remettre';
  b.addEventListener('click', async () => {
    b.disabled = true;
    try{
      await appelPrep({ action: 'notifReafficher', eleve: x.eleve, type: x.type });
      showToast('Alerte remise ✅');
      await rafraichirPastilleSuivi();
      afficherNotifs();
    }catch(e){ showToast('Impossible : ' + e.message); b.disabled = false; }
  });
  d.appendChild(b);

  return d;
}


/* Recalcule la pastille après un masquage ou une remise */
async function rafraichirPastilleSuivi(){
  try{
    await chargerNotifsMasquees(true);
    const eleves = (typeof etatBureau !== 'undefined' && etatBureau.eleves) || [];
    if(typeof poserAlerte === 'function'){
      poserAlerte('suivi', notifsEnAttente(eleves).length);
    }
  }catch(e){ /* la pastille se remettra au prochain chargement */ }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-notifs.js'] = true;
