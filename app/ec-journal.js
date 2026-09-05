/* Déployé le 05/09/2026 à 07:32 — v878 */
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
      if($('journalPeriode')) $('journalPeriode').value = 'tout';
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

  const rangs = lignes.map(l => {
    const quand = String(l.quand || '');
    return [
      quand.slice(0, 10),
      quand.slice(-5),
      l.qui, l.role, l.action, l.eleve, l.detail
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
    document.body.removeChild(a);
  }, 500);

  showToast(lignes.length + ' ligne(s) exportée(s) ✅');
}

async function afficherJournal(jourPrecis){
  const zone = $('journalListe');
  if(!zone) return;

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
