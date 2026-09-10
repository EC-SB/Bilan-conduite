/* Déployé le 10/09/2026 à 10:33 — v908 */
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
    droit:'notif_permis',    champ:'permis',    foi:'examPermis' },

  /* ⚠️ CELLE-CI NE SE DÉCLENCHE PAS SUR UN ÉTAT — v908.

     David, le 10 septembre 2026 : « quand un moniteur indique un
     nombre d'heures pour un passage d'examen — soit à la suite d'un
     examen blanc, soit à la suite d'un post-permis, soit pendant un
     cours — que l'on ait une notification, car là on doit aller
     chercher l'information et si on n'y pense pas ça tombe aux
     oubliettes ».

     Les trois autres alertes disent « il manque quelque chose ».
     Celle-ci dit l'inverse : QUELQU'UN A DIT QUELQUE CHOSE, et
     personne n'en a encore rien fait. Elle a donc son calcul à
     elle — alerteHeures — et pas de champ de note.

     « droit » vide : tout le monde la voit. David : « tout le
     monde ». Un nombre d'heures qui traîne coûte une place
     d'examen ; ce n'est pas une information de spécialiste. */
  { cle:'heures',    nom:'⏱️ Heures avant examen à poser',
    droit:'',                champ:'',          foi:'' }
];

/* Combien d'heures il reste, dit par qui et quand — ou rien.

   ⚠️ ELLE S'ÉTEINT DÈS QU'IL A SA SESSION. David : « non c'est bon
   dès qu'il a une session ». Le nombre a servi : il n'y a plus rien
   à aller chercher. « examPermis » vaut 'prevu' aussi bien pour une
   date posée dans sa fiche que pour une place tenue sur une session
   — c'est etatQuiFaitFoi qui les réunit, et pas nous. */
function alerteHeures(nom, foi){
  if(!nom) return null;
  if((foi && foi.examPermis) === 'prevu') return null;

  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  const h = String(s.heuresRestantes || '').trim();

  /* ⚠️ ZÉRO EST UNE RÉPONSE, PAS UN SILENCE. « plus que les 3h »
     veut dire qu'il est prêt : c'est même l'alerte la plus utile
     des deux, parce qu'elle appelle une date tout de suite. Un
     « if(!h) » l'aurait mangée sans bruit. */
  if(h === '') return null;

  /* La suite d'un rendez-vous post-permis compte aussi, mais
     SEULEMENT « ➕ 3h avant repassage » — David : « oui c'est ça, tu
     les inclus quand la suite est +3h ». « Une leçon de 2h pour
     refaire le point » ne demande pas de date : elle demande une
     leçon, et l'écran post-permis la porte déjà. */
  const post = (s.rdvPostFait === 'oui' && String(s.suite || '') === '3h');

  return {
    heures: h,
    post: post,
    par: String(s.heuresPar || '').trim(),
    le: String(s.heuresLe || '').trim()
  };
}

/* Ce que l'alerte ⏱️ raconte, en une ligne.

   ⚠️ « 0 » NE S'AFFICHE PAS « 0h ». Zéro veut dire « plus que les
   3h avant examen » : écrit « 0h », on lit « il n'a plus rien à
   faire », ce qui est le contraire. C'est la même règle que dans la
   fiche de route et dans le questionnaire. */
function texteAlerteHeures(x){
  const h = String((x && x.heures) || '');
  const combien = (h === '0') ? 'plus que les 3h'
                : h + 'h + les 3h avant examen';
  return combien + (x && x.post ? ' — après son post-permis' : '');
}

/* Ce qui est masqué : le nombre autant que l'élève.

   ⚠️ C'EST TOUTE LA RÉPONSE À « ÇA TOMBE AUX OUBLIETTES ». Écarter
   « Nolwenn » l'écarterait pour toujours ; écarter « Nolwenn, 4h »
   ne vaut que pour ces 4h-là. Le jour où quelqu'un dit « encore 2h »,
   c'est une autre alerte, et elle revient d'elle-même.

   La feuille NotifsMasquees garde le type en texte libre : rien à
   changer côté classeur ni côté Worker pour ça. */
function cleNotifHeures(x){
  return 'heures:' + String((x && x.heures) || '');
}

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
      /* ⚠️ UN DROIT VIDE VEUT DIRE « TOUT LE MONDE », PAS « PERSONNE ».
         « aDroit('') » rend faux : sans cette garde, l'alerte ⏱️ que
         David voulait visible de tous n'aurait été visible d'aucun
         compte — et elle serait restée à zéro sans que rien ne le
         dise. */
      if(t.droit && !ignorerDroits &&
         typeof aDroit === 'function' && !aDroit(t.droit)) return;

      /* Les heures ont leur calcul : c'est une chose DITE qui attend,
         pas une chose qui manque. Voir alerteHeures. */
      if(t.cle === 'heures'){
        const h = alerteHeures(e.eleve, foi);
        if(!h) return;
        const cle = cleNotifHeures(h);
        if(notifMasquee(e.eleve, cle)) return;
        out.push({ eleve: e.eleve, type: cle, nom: t.nom, famille: 'heures',
                   detail: texteAlerteHeures(h),
                   /* Qui l'a dit prime sur le moniteur du dernier bilan :
                      c'est exactement pour ça que les deux colonnes
                      existent (v215). */
                   moniteur: h.par || e.moniteur || '',
                   date: h.le || e.date || '' });
        return;
      }

      const etat = foi[t.foi] || a[t.champ];
      if(etat !== 'aprevoir') return;
      if(notifMasquee(e.eleve, t.cle)) return;
      out.push({ eleve: e.eleve, type: t.cle, nom: t.nom, famille: t.cle,
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
      TYPES_NOTIF.map(t => '· ' + t.nom + ' → <em>' +
        (t.droit || 'tout le monde') + '</em>').join('<br>') +
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
      /* ⚠️ ON REGROUPE PAR FAMILLE, PLUS PAR TYPE. Le type d'une
         alerte ⏱️ porte son nombre (« heures:4 ») pour que le
         masquage ne vaille que pour CE nombre-là ; le comparer au
         nom de la famille ne rendrait plus jamais rien, et la
         section entière aurait disparu de l'écran sans un mot. */
      const lot = attente.filter(x => (x.famille || x.type) === t.cle);
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
    /* Le nombre se lit SUR la ligne. C'était toute la demande :
       « on doit aller chercher l'information ». */
    (x.detail ? ' — ' + String(x.detail).replace(/</g, '&lt;') : '') +
    (x.moniteur ? '<div style="font-size:11px;color:var(--muted);">' +
      (x.detail ? 'dit par ' : '') +
      x.moniteur.replace(/</g, '&lt;') + (x.date ? ' · ' + x.date : '') + '</div>'
      : (x.detail ? '<div style="font-size:11px;color:var(--muted);">' +
          '👤 on ne sait pas qui l\'a dit</div>' : ''));
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
  /* ⚠️ « heures:4 » EST DE LA FAMILLE « heures ». Sans cette
     coupure, la ligne masquée s'afficherait « Nolwenn — heures:4 »
     au lieu de son nom, et on ne saurait pas ce qu'on remet. */
  const famille = String(x.type || '').split(':')[0];
  const t = TYPES_NOTIF.find(y => y.cle === famille);
  const combien = String(x.type || '').indexOf(':') !== -1
    ? String(x.type).slice(String(x.type).indexOf(':') + 1) : '';

  const d = document.createElement('div');
  d.style.cssText = 'display:flex;gap:8px;align-items:center;border:1px solid var(--line);' +
    'border-radius:9px;padding:8px 11px;margin-bottom:4px;opacity:.65;';

  const z = document.createElement('div');
  z.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.5;';
  z.innerHTML = '<strong>' + x.eleve.replace(/</g, '&lt;') + '</strong> — ' +
    (t ? t.nom : x.type) +
    (combien !== '' ? ' (' + (combien === '0' ? 'plus que les 3h'
                                              : combien + 'h') + ')' : '') +
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


/* ⚠️ LA PASTILLE POINTAIT LE MAUVAIS ONGLET — réparé en v908.

   Elle se posait sur SUIVI (« poserAlerte('suivi', …) ») alors que
   l'écran des alertes vit dans GESTION depuis son déménagement. Le
   compteur disait donc « il y a 4 choses à faire » en désignant
   l'onglet où elles ne sont pas — et l'onglet qui les contient
   n'affichait rien du tout.

   Elle passait aussi À CÔTÉ du registre commun. COMPTES_VUE existe
   justement pour qu'une pastille d'onglet et son sous-onglet ne
   puissent pas dire deux choses différentes ; c'est lui qui a déjà
   réparé les tâches et la flotte après leur passage dans Gestion.
   On ne nomme donc plus l'onglet ici : « poserCompteVue » le déduit
   de VUES, et un futur déménagement n'aura rien à corriger. */
function poserPastilleNotifs(nombre){
  if(typeof poserCompteVue === 'function'){ poserCompteVue('notifs', nombre); return; }
  /* Filet, si le module des onglets n'est pas là */
  if(typeof poserAlerte === 'function') poserAlerte('gestion', nombre);
}

/* Recalcule la pastille après un masquage ou une remise */
async function rafraichirPastilleSuivi(){
  try{
    await chargerNotifsMasquees(true);
    const eleves = (typeof etatBureau !== 'undefined' && etatBureau.eleves) || [];
    poserPastilleNotifs(notifsEnAttente(eleves).length);
  }catch(e){ /* la pastille se remettra au prochain chargement */ }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-notifs.js'] = true;
