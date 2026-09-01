/* Déployé le 01/09/2026 à 14:49 — v775 */
/* ============================================================
   ec-menage.js
   Ce qu'on garde, et ce qu'on pourrait ne plus garder.

   Le second régime de la conservation. Le premier tourne seul la
   nuit, et ne touche qu'à des feuilles techniques où rien ne se
   perd. Celui-ci touche à des élèves, alors IL NE FAIT RIEN TOUT
   SEUL : il propose, il dit pourquoi, et c'est le bureau qui
   appuie.

   Une année creuse, une élève qui revient au bout de deux ans, et
   un effacement automatique aurait jeté un travail que personne
   n'avait demandé de jeter. Ce n'est pas un écran de ménage :
   c'est un écran de décision.

   Quatre listes, dans l'ordre décidé le 1er septembre :
     · permis obtenu — la règle de la maison, on supprime tout ;
     · plus d'un an depuis le DERNIER COURS ;
     · dossier jamais commencé — montré à 3 mois, proposé à 12 ;
     · récitations du coin révisions, 3 mois sans connexion.

   Se donne dans ⚙️ Accès (droit « menage »).
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let menageDonnees = null;

async function afficherMenage(recharger){
  const zone = $('menageZone');
  if(!zone) return;

  if(recharger) menageDonnees = null;

  if(menageDonnees === null){
    zone.innerHTML = (typeof htmlAttente === 'function')
      ? htmlAttente('Lecture des dossiers…')
      : '<div class="empty">Lecture…</div>';
    try{
      const d = await appelPrep({ action: 'menageList' });
      menageDonnees = d || {};
    }catch(e){
      zone.innerHTML = '<div class="empty">⚠️ ' +
        echapper(e.message) + '</div>';
      menageDonnees = null;
      return;
    }
  }

  const d = menageDonnees;
  const r = d.reglages || {};

  zone.innerHTML = '';
  zone.appendChild(enTeteMenage(d));

  const rien =
    !(d.permisObtenu || []).length && !(d.sansCours || []).length &&
    !(d.jamaisCommence || []).length && !(d.aSurveiller || []).length &&
    !(d.recitations || []).length;

  if(rien){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = '✅ <strong>Rien à décider.</strong><br>' +
      '<span style="font-size:12px;">Aucun dossier ne dépasse les durées ' +
      'que tu as fixées.</span>';
    zone.appendChild(v);
    return;
  }

  blocMenage(zone, '🎓 Permis obtenu — dossier à solder',
    d.permisObtenu,
    "La règle de la maison : quand l'élève a son permis, on supprime tout. " +
    '<strong>Ton taux de réussite ne bouge pas</strong> — sa ligne de ' +
    "résultat est conservée, seul son nom en est retiré.", 'eleve');

  blocMenage(zone, '📅 Plus de ' + (r.moisSansCours || 12) + ' mois sans cours',
    d.sansCours,
    'Aucun permis obtenu, et plus aucun cours depuis un an. Ce sont ceux ' +
    'qui ne reviendront probablement pas — mais c\'est toi qui le sais, ' +
    'pas moi.', 'eleve');

  blocMenage(zone, '📭 Inscrits, jamais venus',
    d.jamaisCommence,
    'Un dossier créé il y a plus de ' + (r.moisJamaisVu || 12) + ' mois, ' +
    'sans un seul cours enregistré.', 'eleve');

  blocMenage(zone, '👀 À surveiller — inscrits depuis ' +
    (r.moisASurveiller || 3) + ' mois sans cours',
    d.aSurveiller,
    'Trop tôt pour proposer quoi que ce soit : ils sont là pour que tu les ' +
    'voies, pas pour que tu les effaces. Certains commencent tard, ' +
    "d'autres ne viendront jamais.", 'surveille');

  blocMenage(zone, '🎙️ Récitations du coin révisions',
    d.recitations,
    'Plus de ' + (r.moisRecitations || 3) + ' mois sans connexion à son ' +
    'espace, <strong>et</strong> aucun cours sur la même période — un élève ' +
    "qui n'a pas ouvert ses révisions de l'été est en vacances, pas en " +
    'fin de formation. Seules les récitations partent : le dossier reste ' +
    'entier.', 'recitations');
}

function enTeteMenage(d){
  const r = document.createElement('div');
  r.style.cssText = 'margin-bottom:14px;';

  const barre = document.createElement('div');
  barre.style.cssText = 'display:flex;gap:8px;align-items:center;';

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:10px 14px;font-size:13px;margin:0;';
  b.textContent = '🔄 Actualiser';
  b.addEventListener('click', () => afficherMenage(true));
  barre.appendChild(b);

  const total = ((d.permisObtenu || []).length + (d.sansCours || []).length +
                 (d.jamaisCommence || []).length + (d.recitations || []).length);
  const i = document.createElement('div');
  i.style.cssText = 'flex:1;font-size:12px;color:var(--muted);line-height:1.5;';
  i.innerHTML = total
    ? '<strong>' + total + '</strong> dossier' + (total > 1 ? 's' : '') +
      ' proposé' + (total > 1 ? 's' : '') + '. Rien ne part sans toi.'
    : 'Rien de proposé aujourd\'hui.';
  barre.appendChild(i);
  r.appendChild(barre);

  /* Ce que l'écran ne fait PAS : le dire une fois, en haut, plutôt
     que de le répéter dans chaque confirmation. */
  const note = document.createElement('div');
  note.style.cssText = 'margin-top:10px;padding:9px 11px;border-radius:8px;' +
    'background:var(--navy);font-size:12px;color:var(--muted);line-height:1.6;';
  note.innerHTML =
    '🧹 Le ménage de nuit ne touche qu\'aux feuilles techniques — liens de ' +
    'cours, mails manqués, coûts, journal des SMS. <strong>Aucun dossier ' +
    'd\'élève ne part tout seul</strong> : cette liste est une proposition, ' +
    'et le seul geste qui efface, c\'est le tien.';
  r.appendChild(note);
  return r;
}

function blocMenage(zone, titre, liste, explication, quoi){
  const l = liste || [];
  if(!l.length) return;

  const t = document.createElement('div');
  t.style.cssText = 'margin:18px 0 8px;';
  t.innerHTML = '<h3 style="margin:0;font-size:14px;">' + titre +
    ' <span style="color:var(--muted);font-weight:400;">(' + l.length +
    ')</span></h3>' +
    '<div style="font-size:12px;color:var(--muted);line-height:1.5;' +
    'margin-top:3px;">' + explication + '</div>';
  zone.appendChild(t);

  l.forEach(x => zone.appendChild(ligneMenage(x, quoi)));
}

function ligneMenage(x, quoi){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
    'padding:10px 12px;margin-bottom:7px;';

  /* CE QU'IL Y A DANS LE DOSSIER, avant de proposer de le jeter.
     « 14 bilans » et « aucun bilan » ne se décident pas pareil. */
  const contenu = [];
  if(x.bilans) contenu.push(x.bilans + ' bilan' + (x.bilans > 1 ? 's' : ''));
  if(x.recitations){
    contenu.push(x.recitations + ' récitation' + (x.recitations > 1 ? 's' : ''));
  }

  d.innerHTML =
    '<div style="font-size:14px;font-weight:700;">' +
      echapper(x.eleve || '(sans nom)') + '</div>' +
    '<div style="font-size:12px;color:var(--muted);line-height:1.6;">' +
      echapper(x.pourquoi || '') +
      (contenu.length ? '<br>📁 ' + contenu.join(' · ') : '') +
    '</div>';

  /* « À surveiller » n'a pas de bouton, et c'est le point : ils
     sont montrés pour être vus, pas pour être effacés. Mettre un
     bouton ici reviendrait à proposer ce qu'on a dit ne pas
     proposer. */
  if(quoi === 'surveille') return d;

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:9px 13px;font-size:13px;' +
    'margin:9px 0 0;color:var(--red);border-color:var(--red);';
  b.textContent = (quoi === 'recitations')
    ? '🗑️ Effacer ses récitations' : '🗑️ Supprimer le dossier';

  b.addEventListener('click', async () => {
    const ok = (quoi === 'recitations')
      ? await confirmerRecitations(x)
      : await confirmerDossier(x);
    if(!ok) return;

    b.disabled = true;
    b.textContent = '…';
    try{
      if(quoi === 'recitations'){
        const r = await appelPrep({ action: 'menageRecitations', eleve: x.eleve });
        showToast((r && r.effacees)
          ? (r.effacees + ' récitation(s) effacée(s) ✅')
          : 'Aucune récitation trouvée.');
      }else{
        const r = await appelPrep({ action: 'supprimerEleve', eleve: x.eleve });
        /* CE QUI A ÉTÉ FAIT, PAS CE QU'ON ESPÉRAIT. Le classeur
           rend le compte exact : on le répète, plutôt que
           d'annoncer un succès qu'on n'a pas vérifié. */
        const a = (r && r.ailleurs) || {};
        const bouts = [];
        if(r && r.supprimees) bouts.push(r.supprimees + ' bilan(s)');
        if(a.acces) bouts.push('son accès');
        if(a.recitations) bouts.push(a.recitations + ' récitation(s)');
        if(a.demandes) bouts.push(a.demandes + ' demande(s)');
        if(a.ailleurs) bouts.push(a.ailleurs + ' ligne(s) ailleurs');
        if(a.resultats) bouts.push(a.resultats + ' résultat(s) anonymisé(s)');
        showToast(bouts.length
          ? 'Supprimé : ' + bouts.join(', ') + ' ✅'
          : 'Rien trouvé à supprimer pour ce dossier.');
      }
      afficherMenage(true);
    }catch(e){
      showToast('Impossible : ' + e.message);
      b.disabled = false;
      b.textContent = (quoi === 'recitations')
        ? '🗑️ Effacer ses récitations' : '🗑️ Supprimer le dossier';
    }
  });
  d.appendChild(b);

  return d;
}

/* La confirmation dit ce qui part ET ce qui reste. Une
   confirmation qui ne nomme que le danger se lit de travers : on
   finit par appuyer sans lire, ou par ne jamais appuyer. */
function confirmerDossier(x){
  const quoi = [];
  if(x.bilans) quoi.push(x.bilans + ' bilan' + (x.bilans > 1 ? 's' : ''));
  if(x.recitations){
    quoi.push(x.recitations + ' récitation' + (x.recitations > 1 ? 's' : ''));
  }
  quoi.push('son accès au coin révisions');
  quoi.push('ses lignes dans le journal des envois');

  const message =
    '🗑️ Supprimer définitivement le dossier de ' + (x.eleve || '?') + ' ?\n\n' +
    'Ce qui part : ' + quoi.join(', ') + '.\n\n' +
    'Ce qui reste : sa ligne de résultat d\'examen, sans son nom — ton ' +
    'taux de réussite ne bougera pas.\n\n' +
    'C\'est définitif : il n\'y a pas de corbeille.';

  return (typeof confirmer === 'function')
    ? confirmer(message, 'Supprimer le dossier', true)
    : Promise.resolve(window.confirm(message));
}

function confirmerRecitations(x){
  const message =
    '🗑️ Effacer les ' + (x.recitations || '') + ' récitation(s) de ' +
    (x.eleve || '?') + ' ?\n\n' +
    'Son dossier, ses bilans et son accès ne sont PAS touchés : seul le ' +
    'contenu de son coin révisions part.';

  return (typeof confirmer === 'function')
    ? confirmer(message, 'Effacer les récitations', true)
    : Promise.resolve(window.confirm(message));
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-menage.js'] = true;
