/* Déployé le 01/09/2026 à 16:00 — v780 */
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
  zone.appendChild(tableauDurees(d));

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

/* ============================================================
   LE TABLEAU DES DURÉES

   Elles étaient écrites dans le code. Une durée de conservation,
   ça se discute avec un conseil et ça bouge : elle n'a rien à
   faire là-bas.

   ⚠️ ZÉRO VEUT DIRE « NE JAMAIS EFFACER ». C'est écrit sur
   l'écran, et c'est la seule convention qui rende un champ vidé
   inoffensif : avec l'autre, une case effacée par mégarde viderait
   la feuille entière à 4 h du matin.
   ============================================================ */
const DUREES_AUTO = [
  ['LiensCours',     'Liens de cours envoyés aux élèves'],
  ['MailsEchoues',   'Journal des mails qui ne sont pas partis'],
  ['CoutsIA',        "Comptabilité de l'IA"],
  ['NotifsMasquees', 'Alertes masquées par le bureau'],
  ['EnCours',        'Cours restés marqués « en route »'],
  ['sms',            'Journal des SMS — nom, numéro et texte retirés']
];

const DUREES_REVUE = [
  ['sansCours',   'Proposer un dossier après X mois sans cours'],
  ['jamaisVu',    'Proposer un inscrit jamais venu après X mois'],
  ['aSurveiller', 'Le montrer (sans le proposer) dès X mois'],
  ['recitations', 'Proposer les récitations après X mois sans connexion']
];

function tableauDurees(d){
  const det = document.createElement('details');
  det.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
    'padding:10px 12px;margin-bottom:16px;';
  det.innerHTML = '<summary style="cursor:pointer;font-size:13px;' +
    'font-weight:700;color:var(--accent-text);">⏳ Les durées de ' +
    'conservation</summary>';

  const z = document.createElement('div');
  z.style.marginTop = '10px';

  const intro = document.createElement('div');
  intro.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.6;' +
    'margin-bottom:12px;';
  intro.innerHTML =
    'En <strong>mois</strong>. <strong>0 = ne jamais effacer.</strong><br>' +
    (d.dernierPassage
      ? '🧹 Dernier ménage automatique : ' + echapper(d.dernierPassage) + '.'
      : "🧹 Le ménage automatique n'a jamais tourné — lance " +
        '« installerMenage » une fois depuis l\'éditeur Apps Script.');
  z.appendChild(intro);

  const champs = {};

  const bloc = (titre, note, liste, valeurs) => {
    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;font-weight:700;margin:14px 0 2px;';
    t.textContent = titre;
    z.appendChild(t);

    const nz = document.createElement('div');
    nz.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;' +
      'margin-bottom:8px;';
    nz.innerHTML = note;
    z.appendChild(nz);

    liste.forEach(([cle, libelle]) => {
      const l = document.createElement('label');
      l.style.cssText = 'display:flex;gap:10px;align-items:center;' +
        'padding:6px 0;border-bottom:1px solid var(--line);' +
        'text-transform:none;margin:0;font-size:13px;';

      const txt = document.createElement('div');
      txt.style.cssText = 'flex:1;min-width:0;line-height:1.4;';
      const defaut = (d.defauts || {})[cle];
      txt.innerHTML = echapper(libelle) +
        (defaut !== undefined
          ? '<div style="font-size:11px;color:var(--muted);">par défaut : ' +
            defaut + ' mois</div>'
          : '');

      const i = document.createElement('input');
      i.type = 'number';
      i.min = '0';
      i.max = '120';
      i.step = '1';
      i.value = String(valeurs[cle] === undefined ? '' : valeurs[cle]);
      i.style.cssText = 'width:78px;flex-shrink:0;margin:0;padding:7px 8px;' +
        'font-size:13px;text-align:center;';
      champs[cle] = i;

      l.appendChild(txt);
      l.appendChild(i);
      z.appendChild(l);
    });
  };

  bloc('Ce qui part tout seul, chaque nuit',
       'Uniquement des feuilles techniques. <strong>Aucun dossier ' +
       "d'élève n'est concerné.</strong>",
       DUREES_AUTO, d.durees || {});

  bloc('Ce qui vous est proposé ici',
       'Ces durées ne suppriment rien : elles décident de ce qui ' +
       'apparaît dans les listes ci-dessous.',
       DUREES_REVUE, d.dureesRevue || {});

  const etat = document.createElement('div');
  etat.style.cssText = 'font-size:12px;line-height:1.5;margin:10px 0 0;' +
    'color:var(--muted);';

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:10px 14px;font-size:13px;margin:12px 0 0;';
  b.textContent = '💾 Enregistrer les durées';
  b.addEventListener('click', async () => {
    /* Une case vide n'est pas un zéro : c'est une case vide. On
       refuse plutôt que de deviner — deviner, ici, ce serait
       effacer. */
    const valeurs = {};
    const fautes = [];
    Object.keys(champs).forEach(cle => {
      const brut = String(champs[cle].value).trim();
      if(brut === ''){ fautes.push(cle); return; }
      const v = Number(brut);
      if(!isFinite(v) || v < 0 || v > 120 || Math.floor(v) !== v){
        fautes.push(cle);
        return;
      }
      valeurs[cle] = v;
    });

    if(fautes.length){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = '⚠️ ' + fautes.length + ' case(s) vide(s) ou ' +
        'illisible(s). Un nombre entier de mois, entre 0 et 120. ' +
        'Rien n\'a été enregistré.';
      return;
    }

    const zeros = Object.keys(valeurs).filter(k => valeurs[k] === 0);
    if(zeros.length && typeof confirmer === 'function'){
      const ok = await confirmer('Enregistrer ces durées ?\n\n' +
        zeros.length + ' réglage(s) à 0 : ces données ne seront ' +
        'PLUS JAMAIS effacées ni proposées.\n\n' +
        'C\'est un choix valable — mais il doit être un choix.');
      if(!ok) return;
    }

    b.disabled = true;
    b.textContent = 'Enregistrement…';
    try{
      await appelPrep({ action: 'reglageSet', cle: 'dureesConservation',
                        valeur: JSON.stringify(valeurs) });
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '✅ Durées enregistrées. Elles s\'appliquent au ' +
        'prochain passage de nuit, et tout de suite aux listes ci-dessous.';
      afficherMenage(true);
    }catch(e){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = '⚠️ Non enregistré : ' + e.message;
      b.disabled = false;
      b.textContent = '💾 Enregistrer les durées';
    }
  });

  z.appendChild(b);
  z.appendChild(etat);
  det.appendChild(z);
  return det;
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
        /* CE QUI A ÉTÉ FAIT, PAS CE QU'ON ESPÉRAIT — et la même
           phrase que les deux autres écrans qui suppriment un
           dossier : trois résumés écrits séparément n'énuméraient
           pas les mêmes choses, et on ne savait pas si la
           différence venait du dossier ou de l'écran. */
        const bouts = (typeof resumeEffacement === 'function')
          ? resumeEffacement(r) : [];
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
  quoi.push('sa fiche du répertoire (nom, téléphone, adresse)');
  quoi.push('son accès au coin révisions');
  quoi.push('ses cours préparés et ses captures du CEPC');
  quoi.push('sa fiche de suivi');
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
