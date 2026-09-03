/* Déployé le 03/09/2026 à 15:58 — v844 */
/* ============================================================
   ec-permis-listes.js
   RDV PERMIS, permis prévus, examens à prévoir, vue d'ensemble.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

function ficheSuiviPermis(e){
  const s = etatBureau.suivi.find(x => normaliserMot(x.eleve) === normaliserMot(e.eleve)) || {};

  const d = document.createElement('details');
  d.style.cssText = 'margin-top:8px;';
  d.innerHTML = '<summary style="cursor:pointer;color:var(--accent-text);font-weight:600;font-size:14px;">' +
    '📋 Fiche de préparation' + (s.majLe ? ' — mise à jour le ' + s.majLe : '') + '</summary>';

  const f = document.createElement('div');
  f.className = 'fiche-permis';
  f.style.cssText = 'margin-top:12px;padding:12px;background:var(--navy);' +
    'border:1px solid var(--line);border-radius:10px;';

  const id = 'sv' + Math.random().toString(36).slice(2, 8);
  f.innerHTML =
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;' +
      'color:var(--accent-text);font-weight:700;margin-bottom:14px;">' +
      '<input type="checkbox" id="' + id + 'ok" style="width:19px;height:19px;">' +
      '✅ Tout est OK — dossier prêt</label>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;' +
      'color:var(--warn-text);font-weight:700;margin-bottom:14px;">' +
      '<input type="checkbox" id="' + id + 'point" style="width:19px;height:19px;">' +
      '❓ Faire le point à la prochaine leçon</label>' +

    '<label for="' + id + 'typ">Type d\'examen</label>' +
    '<select id="' + id + 'typ">' +
      '<option value="bea">🅰 BEA — boîte automatique</option>' +
      '<option value="bv">🅑 BV — boîte manuelle</option>' +
      '<option value="handicap">♿ Handicap</option>' +
    '</select>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:10px;">' +
      '<input type="checkbox" id="' + id + 'fan" style="width:19px;height:19px;">' +
      '👻 Place fantôme — nom posé, repreneur encore inconnu</label>' +
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:10px;">' +
      '<input type="checkbox" id="' + id + 'rem" style="width:19px;height:19px;">' +
      'Place à remplacer — à donner à un autre élève</label>' +
    '<div id="' + id + 'zone" style="display:none;padding:10px;margin-bottom:14px;' +
      'background:var(--navy-deep);border:1px solid var(--orange);border-radius:10px;">' +
      '<label for="' + id + 'nouv">Nouveau candidat</label>' +
      '<input type="text" id="' + id + 'nouv" list="listeEleves" autocomplete="off" ' +
      'placeholder="Prénom et nom du repreneur">' +
      '<button class="btn btn-primary" id="' + id + 'trf" style="font-size:14px;padding:11px;">' +
      '➡️ Transférer la date à ce candidat</button>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.4;">' +
      'La date passe au nouveau candidat et sera transmise à son moniteur au prochain cours.</div>' +
    '</div>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:10px;">' +
      '<input type="checkbox" id="' + id + 'don" style="width:19px;height:19px;">' +
      'Date à donner à une autre auto-école</label>' +
    '<div id="' + id + 'zae" style="display:none;margin-bottom:14px;">' +
      '<label for="' + id + 'ae">Auto-école destinataire</label>' +
      '<input type="text" id="' + id + 'ae" placeholder="Nom de l\'auto-école">' +
    '</div>' +

    '<label for="' + id + 'pay">Reste à payer</label>' +
    '<input type="text" id="' + id + 'pay" placeholder="Ex : 240 €">' +
    '<label for="' + id + 'qd">Paiement prévu le</label>' +
    '<input type="date" id="' + id + 'qd">' +
    '<label for="' + id + 'rel">Relancé le</label>' +
    '<input type="date" id="' + id + 'rel">' +

    '<label for="' + id + 'nat">À faire par l\'élève</label>' +
    '<select id="' + id + 'nat">' +
      '<option value="">— rien —</option>' +
      '<option value="acheter">À acheter</option>' +
      '<option value="reserver">À réserver</option>' +
      '<option value="both">À acheter et réserver</option>' +
    '</select>' +
    '<label for="' + id + 'l2">Leçons de 2h</label>' +
    '<input type="text" id="' + id + 'l2" inputmode="numeric" placeholder="Ex : 3">' +
    '<label for="' + id + 'l1">Leçons d\'1h</label>' +
    '<input type="text" id="' + id + 'l1" inputmode="numeric" placeholder="Ex : 1">' +
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:14px;">' +
      '<input type="checkbox" id="' + id + 'acc" style="width:19px;height:19px;">Accompagnement à l\'examen</label>' +
    '<label for="' + id + 'aut">Autre à prévoir</label>' +
    '<textarea id="' + id + 'aut" rows="2" style="width:100%;background:var(--navy-deep);' +
      'border:1px solid var(--line);color:var(--cream);padding:10px;border-radius:10px;' +
      'font-size:15px;font-family:inherit;resize:vertical;margin-bottom:14px;"></textarea>' +

    '<div class="pleine-largeur">' +
    '<label for="' + id + 'res">Réservations faites sur le planning</label>' +
    '<textarea id="' + id + 'res" rows="2" placeholder="Ex : 10/09 14h-16h et 11/09 9h-12h" ' +
      'style="width:100%;background:var(--navy-deep);border:1px solid var(--line);color:var(--cream);' +
      'padding:10px;border-radius:10px;font-size:15px;font-family:inherit;resize:vertical;margin-bottom:14px;"></textarea>' +
    '</div>';

  const bEnr = document.createElement('button');
  bEnr.className = 'btn btn-primary pleine-largeur';
  bEnr.textContent = '💾 Enregistrer la fiche';
  f.appendChild(bEnr);
  const etat = document.createElement('div');
  etat.className = 'pleine-largeur';
  etat.style.cssText = 'margin-top:8px;font-size:13px;min-height:16px;';
  f.appendChild(etat);

  d.appendChild(f);

  /* Valeurs déjà enregistrées */
  setTimeout(() => {
    const g = k => document.getElementById(id + k);
    if(g('rem')) g('rem').checked = (s.aRemplacer === 'oui');
    if(g('don')) g('don').checked = (s.dateADonner === 'oui');
    if(g('pay')) g('pay').value = s.resteAPayer || '';
    if(g('qd')) g('qd').value = s.paiementPrevu || '';
    if(g('rel')) g('rel').value = s.relanceLe || '';
    if(g('nat')) g('nat').value = s.nature || '';
    if(g('l2')) g('l2').value = s.lecons2h || '';
    if(g('l1')) g('l1').value = s.lecons1h || '';
    if(g('acc')) g('acc').checked = (s.accompagnement === 'oui');
    if(g('aut')) g('aut').value = s.autre || '';
    if(g('res')) g('res').value = s.reservations || '';
    if(g('typ')) g('typ').value = s.typeExamen ||
      ((e.boite || (/automatique/i.test(e.type || '') ? 'bea' : 'bv')).toLowerCase());
    if(g('ae')) g('ae').value = s.autoEcole || '';
    if(g('fan')) g('fan').checked = (s.fantome === 'oui');
    if(g('ok')) g('ok').checked = (s.toutOk === 'oui');
    if(g('point')) g('point').checked = (s.fairePoint === 'oui');
  }, 0);

  /* Affichages conditionnels */
  setTimeout(() => {
    const cbRem = document.getElementById(id + 'rem');
    const zn = document.getElementById(id + 'zone');
    if(cbRem && zn){
      const maj = () => { zn.style.display = cbRem.checked ? 'block' : 'none'; };
      cbRem.addEventListener('change', maj);
      maj();
    }
    const cbDon = document.getElementById(id + 'don');
    const zae = document.getElementById(id + 'zae');
    if(cbDon && zae){
      const majAE = () => { zae.style.display = cbDon.checked ? 'block' : 'none'; };
      cbDon.addEventListener('change', majAE);
      majAE();
    }

    const bTrf = document.getElementById(id + 'trf');
    if(bTrf) bTrf.addEventListener('click', async () => {
      const nouveau = document.getElementById(id + 'nouv').value.trim();
      if(nouveau.length < 2){ showToast('Saisis le nom du repreneur.'); return; }
      const dateP = (e.etat && e.etat.permisDate) || s.datePermis || '';
      if(!dateP){ showToast('Aucune date de permis à transférer.'); return; }
      if(!await confirmer('Transférer l\'examen du ' + dateP + '\n\nde ' + e.eleve +
                  '\nvers ' + nouveau + ' ?')) return;

      bTrf.disabled = true;
      bTrf.textContent = 'Transfert…';
      try{
        /* Le repreneur hérite de la date */
        await envoyerConsigne(nouveau, 'permis',
          'Examen du permis fixé au ' + dateP + ' (repris de ' + e.eleve + ')');
        await appelPrep({ action:'suiviSet', eleve: nouveau, datePermis: dateP,
                          par: ACCES.moniteur || '' });

        /* L'élève précédent perd la date */
        await envoyerConsigne(e.eleve, 'permis',
          'Examen du ' + dateP + ' redonné à un autre candidat — nouvelle date à prévoir');
        /* L'ancien candidat perd sa date, pas sa fiche : ses
           heures, son examen blanc et ses paiements restent. Il
           retourne chez les élèves à replacer. */
        await majSuivi(e.eleve, { datePermis: '', centre: '',
                                  statut: '', toutOk: '',
                                  aRemplacer: '', aPlanifier: 'oui' });

        showToast('Date transférée à ' + nouveau + ' ✅');
        redessinerBureau();
      }catch(err){
        showToast('Transfert impossible : ' + err.message);
        bTrf.disabled = false;
        bTrf.textContent = '➡️ Transférer la date à ce candidat';
      }
    });
  }, 0);

  bEnr.addEventListener('click', async () => {
    const g = k => document.getElementById(id + k);
    bEnr.disabled = true;
    bEnr.textContent = 'Enregistrement…';
    try{
      await appelPrep({
        action: 'suiviSet',
        eleve: e.eleve,
        datePermis: (e.etat && e.etat.permisDate) || s.datePermis || '',
        aRemplacer: g('rem').checked ? 'oui' : '',
        dateADonner: g('don').checked ? 'oui' : '',
        resteAPayer: g('pay').value.trim(),
        paiementPrevu: g('qd').value,
        relanceLe: g('rel').value,
        nature: g('nat').value,
        lecons2h: g('l2').value.trim(),
        lecons1h: g('l1').value.trim(),
        accompagnement: g('acc').checked ? 'oui' : '',
        autre: g('aut').value.trim(),
        reservations: g('res').value.trim(),
        typeExamen: g('typ').value,
        autoEcole: g('ae').value.trim(),
        fantome: g('fan').checked ? 'oui' : '',
        toutOk: g('ok').checked ? 'oui' : '',
        fairePoint: g('point') && g('point').checked ? 'oui' : '',
        statut: s.statut || '',
        aPlanifier: s.aPlanifier || '',
        semaine: s.semaine || '',
        moniteurDate: s.moniteurDate || '',
        par: ACCES.moniteur || ''
      });
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '✅ Fiche enregistrée.';
      await chargerBureau();
      /* Signal pour la fenêtre, qui se referme d'elle-même */
      f.dataset.enregistre = 'oui';
    }catch(err){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Erreur : ' + err.message;
    }finally{
      bEnr.disabled = false;
      bEnr.textContent = '💾 Enregistrer la fiche';
    }
  });

  return d;
}

/* Résumé court de la fiche, affiché sous le nom */
function resumeSuivi(eleve){
  const s = etatBureau.suivi.find(x => normaliserMot(x.eleve) === normaliserMot(eleve));
  if(!s) return '';
  const bouts = [];
  /* En premier : c'est une consigne pour le prochain moniteur */
  if(s.fairePoint === 'oui'){
    bouts.push('❓ Faire le point à la leçon' +
               (String(s.fairePointLe || '').trim()
                 ? ' du ' + s.fairePointLe : ''));
  }
  if(s.toutOk === 'oui') bouts.push('✅ tout est OK');
  if(s.statut === 'annule') bouts.push('❌ examen annulé');
  if(s.fantome === 'oui') bouts.push('👻 place fantôme');
  if(s.aRemplacer === 'oui') bouts.push('🔄 place à remplacer');
  if(s.dateADonner === 'oui'){
    bouts.push('🏫 date à donner à une autre auto-école' +
               (s.autoEcole ? ' : ' + s.autoEcole : ''));
  }
  /* Le centre d'examen : information de première importance quand
     on répartit les places entre Saint-Brieuc et Loudéac. */
  if(s.centre) bouts.push('🏁 ' + s.centre);
  if(s.resteAPayer) bouts.push('💰 reste ' + s.resteAPayer);
  if(s.paiementPrevu) bouts.push('paiement ' + dateCourte(s.paiementPrevu));
  if(s.relanceLe) bouts.push('relancé le ' + dateCourte(s.relanceLe));
  const nat = { acheter:'à acheter', reserver:'à réserver', both:'à acheter et réserver' }[s.nature];
  if(nat){
    const det = [];
    if(s.lecons2h) det.push(s.lecons2h + '×2h');
    if(s.lecons1h) det.push(s.lecons1h + '×1h');
    if(s.accompagnement === 'oui') det.push('accompagnement');
    if(s.autre) det.push(s.autre);
    bouts.push(nat + (det.length ? ' : ' + det.join(', ') : ''));
  }
  if(s.reservations) bouts.push('📅 ' + s.reservations);
  return bouts.join(' · ');
}


/* ============================================================
   RÉPARTITION DES PLACES D'EXAMEN
   ============================================================ */
/* Une entrée par mois : on planifie en général sur le mois en cours, M+1 et M+2 */
/* placesConfig : déclaré dans ec-etat.js */

/* ============================================================
   LA RÉPARTITION, RANGÉE COMME ON PREND LES PLACES

   « Il y a trop d'info ici, les dates se répètent. Quand on prend
   les places sur le site des rendez-vous, chaque personne a sa
   liste. »

   Deux défauts, un seul geste pour les deux :

   ① LE RANGEMENT NE SUIVAIT PAS LE TRAVAIL. L'écran groupait par
      semaine ; le site des rendez-vous, lui, demande une liste par
      personne. On recomposait donc de tête, à chaque fois.

   ② LA MÊME DATE, QUATRE FOIS. La semaine et le centre étaient
      écrits en tête du groupe, puis redits sur CHAQUE ligne
      d'élève. Trois élèves d'une même semaine, et l'œil devait
      vérifier trois fois que c'était bien la même.

   La ligne d'un élève ne porte donc plus que son nom. La vue par
   semaine reste, derrière un bouton : c'est elle qui montre qu'une
   semaine est surchargée.
   ============================================================ */
let vuePlaces = 'personne';

function tableauAPlacer(liste){
  const bloc = document.createElement('div');
  if(!liste.length) return bloc;

  const nb = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  const CENTRES = ['Saint-Brieuc', 'Loudéac'];

  /* Les places de chaque semaine, par centre : c'est ce qu'on
     ajoute au bout de chaque titre. */
  const joursDe = {};
  toutesSemaines().forEach(w => {
    const lib = libelleSemaine(w) +
      ((w.sb || w.lo) ? ' (' + (w.sb || 0) + ' SB / ' + (w.lo || 0) + ' LO)' : '');
    joursDe[lib] = { 'Saint-Brieuc': nb(w.sb), 'Loudéac': nb(w.lo) };
  });

  const det = document.createElement('details');
  det.open = true;
  const som = document.createElement('summary');
  som.style.cssText = 'cursor:pointer;color:var(--accent-text);font-weight:700;' +
    'font-size:14px;margin-bottom:8px;';
  som.textContent = '📊 Répartition des places — ' + liste.length + ' élève(s)';
  det.appendChild(som);

  const corps = document.createElement('div');
  corps.style.cssText = 'margin-bottom:12px;';

  /* Le bouton de bascule : la vue par personne pour prendre les
     dates, la vue par semaine pour vérifier qu'aucune ne déborde. */
  const barre = document.createElement('div');
  barre.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;';
  [['personne', '👤 Par personne'], ['semaine', '📅 Par semaine']].forEach(([v, lib]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.cssText = 'width:auto;margin:0;padding:7px 12px;font-size:12.5px;' +
      'border-radius:8px;' + (vuePlaces === v
        ? 'background:var(--accent);color:var(--navy-deep);border:1px solid var(--accent);font-weight:700;'
        : 'background:var(--navy);color:var(--cream);border:1px solid var(--line);');
    b.textContent = lib;
    b.addEventListener('click', () => { vuePlaces = v; redessinerBureau(); });
    barre.appendChild(b);
  });
  corps.appendChild(barre);

  /* ---- Le titre d'un groupe semaine + centre, avec ses places ----

     « Au bout de la ligne, ajoute le nombre de places ouvertes pour
     le centre et la semaine en question. » C'est le chiffre qui
     décide si l'on peut encore poser quelqu'un là : il se lit au
     bout du titre, pas sur une ligne à part. */
  const titreGroupe = (semaine, centre, combien) => {
    const t = document.createElement('div');
    t.style.cssText = 'display:flex;gap:8px;align-items:baseline;margin:8px 0 3px;' +
      'font-size:13px;font-weight:700;color:var(--accent-text);flex-wrap:wrap;';

    const g = document.createElement('span');
    g.style.cssText = 'flex:1;min-width:0;';
    g.textContent = '📍 ' + centre + ' · ' + semaine;
    t.appendChild(g);

    /* ⚠️ CE SONT DES JOURS OUVERTS, PAS DES PLACES.

       Chrystel : « c'est pas des places qui sont ouvertes sur les
       semaines, ce sont des jours ». Les PLACES se comptent au
       mois — le total, la 1ʳᵉ et la 2ᵉ quinzaine. Les JOURS
       d'examen se comptent à la semaine, par centre.

       La nuance décide d'une alerte : un jour d'examen accueille
       PLUSIEURS candidats. Comparer le nombre d'élèves au nombre
       de jours n'a donc aucun sens, et l'avertissement « plus que
       de places » aurait crié à tort toutes les semaines. Seul
       zéro jour ouvert est une vraie alerte : là, personne ne peut
       passer. */
    const dispo = joursDe[semaine] ? joursDe[semaine][centre] : undefined;
    const p = document.createElement('span');
    p.style.cssText = 'font-size:11.5px;font-weight:700;flex-shrink:0;' +
      'white-space:nowrap;color:' +
      (dispo === 0 ? 'var(--red)' : 'var(--muted)');
    p.textContent = (dispo === undefined)
      ? combien + ' élève(s)'
      : combien + ' élève(s) · ' + nbFr(dispo) + ' jour(s) ouvert(s)' +
        (dispo === 0 ? ' ⚠️ aucun jour ici' : '');
    t.appendChild(p);

    return t;
  };

  /* ---- Une ligne d'élève : son nom, et rien qu'on ait déjà dit ---- */
  const ligneEleve = (e, sansMoniteur) => {
    const s = suiviDe(e.eleve);
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0 4px 16px;';

    const nom = document.createElement('span');
    nom.style.cssText = 'flex:1;color:var(--cream);font-size:14px;min-width:0;';
    nom.textContent = (s.nbAjournements ? '🔁 ' : '') + e.eleve +
      (sansMoniteur ? ' · moniteur à définir' : '');
    l.appendChild(nom);

    /* La mention post-permis reste : elle dit qu'il n'est pas encore
       plaçable, et c'est justement au moment de placer qu'on la lit. */
    if(s.rdvPostDate && s.rdvPostFait !== 'oui'){
      const att = document.createElement('span');
      att.style.cssText = 'flex-shrink:0;font-size:11px;font-weight:700;' +
        'color:var(--orange);border:1px solid var(--orange);' +
        'border-radius:999px;padding:2px 8px;white-space:nowrap;';
      att.textContent = '⏳ attente post-permis';
      att.title = 'Rendez-vous post-permis prévu le ' +
        ((typeof dateEnToutesLettres === 'function')
          ? dateEnToutesLettres(s.rdvPostDate) : s.rdvPostDate) +
        ". Sa place d'examen se prend après.";
      l.appendChild(att);
    }

    const bCal = document.createElement('button');
    bCal.className = 'btn btn-secondary';
    bCal.style.cssText = 'width:auto;padding:6px 9px;font-size:15px;margin:0;flex-shrink:0;';
    bCal.textContent = '📅';
    bCal.title = 'Lui donner une place d\'examen';
    bCal.addEventListener('click', async () => {
      if(typeof choisirPlaceExamen !== 'function'){
        showToast("Les sessions d'examen ne sont pas disponibles ici.");
        return;
      }
      const place = await choisirPlaceExamen(e.eleve, s.semaine);
      if(!place) return;
      bCal.disabled = true;
      try{
        await placerEleveSurPlace(e.eleve, place);
        showToast('Place prise ✅');
        redessinerBureau();
      }catch(err){ showToast('Erreur : ' + err.message); bCal.disabled = false; }
    });
    l.appendChild(bCal);

    const bDel = document.createElement('button');
    bDel.className = 'btn btn-secondary';
    bDel.style.cssText = 'width:auto;padding:6px 9px;font-size:13px;margin:0;flex-shrink:0;' +
      'color:var(--red);border-color:var(--red);';
    bDel.textContent = '✕';
    bDel.title = 'Retirer de la liste RDV PERMIS';
    bDel.addEventListener('click', async () => {
      if(!await confirmer('Retirer ' + e.eleve + ' de la liste RDV PERMIS ?\n\n' +
          'Son suivi n\'est pas supprimé : il y reviendra si un moniteur ' +
          'le redemande.')) return;
      bDel.disabled = true;
      try{
        await majSuivi(e.eleve, { aPlanifier: '', retireAPrevoir: 'oui' });
        showToast('Retiré ✅');
        redessinerBureau();
      }catch(err){ showToast('Erreur : ' + err.message); bDel.disabled = false; }
    });
    l.appendChild(bDel);

    return l;
  };

  /* ---- Le rangement : deux niveaux, dans l'ordre qu'on a choisi ---- */
  const cle1 = e => (vuePlaces === 'personne')
    ? (suiviDe(e.eleve).moniteurDate || '⚠️ À attribuer')
    : (suiviDe(e.eleve).semaine || '— semaine à définir —');

  const groupes = {};
  liste.forEach(e => {
    const s = suiviDe(e.eleve);
    const g1 = cle1(e);
    const g2 = (vuePlaces === 'personne')
      ? (s.semaine || '— semaine à définir —')
      : (s.centre || '— centre à définir —');
    const g3 = (vuePlaces === 'personne')
      ? (s.centre || '— centre à définir —')
      : '';
    if(!groupes[g1]) groupes[g1] = {};
    const k = (vuePlaces === 'personne') ? (g3 + ' ⟨⟩ ' + g2) : (g2 + ' ⟨⟩ ' + g1);
    if(!groupes[g1][k]) groupes[g1][k] = [];
    groupes[g1][k].push(e);
  });

  /* « À attribuer » en dernier : c'est ce qui reste à faire, pas ce
     qu'on est en train de faire. */
  Object.keys(groupes).sort((a, b) => {
    const ia = a.startsWith('⚠️') || a.startsWith('—') ? 1 : 0;
    const ib = b.startsWith('⚠️') || b.startsWith('—') ? 1 : 0;
    return ia !== ib ? ia - ib : a.localeCompare(b);
  }).forEach(g1 => {
    const bs = document.createElement('div');
    bs.style.cssText = 'background:var(--navy);border:1px solid var(--line);' +
      'border-radius:10px;padding:10px 12px;margin-bottom:8px;';

    let total = 0;
    Object.keys(groupes[g1]).forEach(k => { total += groupes[g1][k].length; });

    const tete = document.createElement('div');
    tete.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:4px;';

    const t1 = document.createElement('div');
    t1.style.cssText = 'flex:1;min-width:0;font-size:14px;font-weight:700;' +
      'color:var(--cream);';
    t1.textContent = (vuePlaces === 'personne' ? '👤 ' : '📅 ') + g1 +
      ' — ' + total + ' élève(s)';
    tete.appendChild(t1);

    /* ---- COPIER SA LISTE, AU FORMAT DU SITE DES RENDEZ-VOUS ----

       C'est le geste que Chrystel décrit : « chaque personne a sa
       liste ». Le bouton met dans le presse-papier exactement ce
       qu'elle tape là-bas — un appui, un collage, et plus aucun nom
       recopié à la main, donc plus aucun nom oublié. */
    if(vuePlaces === 'personne'){
      const bCop = document.createElement('button');
      bCop.type = 'button';
      bCop.style.cssText = 'width:auto;margin:0;padding:6px 10px;font-size:11.5px;' +
        'border-radius:8px;background:var(--navy);color:var(--cream);' +
        'border:1px solid var(--line);flex-shrink:0;';
      bCop.textContent = '📋 Copier';
      bCop.title = 'Copier la liste de ' + g1 + ' pour le site des rendez-vous';
      bCop.addEventListener('click', () => {
        const lignes = [g1, ''];
        Object.keys(groupes[g1]).sort().forEach(k => {
          const [centre, semaine] = k.split(' ⟨⟩ ');
          lignes.push('Semaine ' + semaine + ' — ' + centre + ' :');
          groupes[g1][k].forEach(e => lignes.push(e.eleve));
          lignes.push('');
        });
        copierTexte(lignes.join('\n').trim(), bCop);
      });
      tete.appendChild(bCop);
    }

    bs.appendChild(tete);

    Object.keys(groupes[g1]).sort().forEach(k => {
      const [a, b] = k.split(' ⟨⟩ ');
      const centre = (vuePlaces === 'personne') ? a : b;
      const semaine = (vuePlaces === 'personne') ? b : a;
      bs.appendChild(titreGroupe(semaine, centre, groupes[g1][k].length));
      groupes[g1][k].forEach(e =>
        bs.appendChild(ligneEleve(e, !suiviDe(e.eleve).moniteurDate)));
    });

    corps.appendChild(bs);
  });

  det.appendChild(corps);
  bloc.appendChild(det);
  return bloc;
}

/* Copier un texte, avec un repli pour les vieux navigateurs. */
function copierTexte(t, bouton){
  const fini = ok => {
    const avant = bouton ? bouton.textContent : '';
    if(bouton) bouton.textContent = ok ? '✅ Copié' : '⚠️ Impossible';
    setTimeout(() => { if(bouton) bouton.textContent = avant; }, 2000);
    if(!ok) showToast('Copie impossible sur cet appareil.');
  };
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(() => fini(true), () => fini(false));
      return;
    }
  }catch(e){}
  try{
    const z = document.createElement('textarea');
    z.value = t;
    z.style.cssText = 'position:fixed;left:-9999px;';
    document.body.appendChild(z);
    z.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(z);
    fini(ok);
  }catch(e){ fini(false); }
}

/* Élèves dont l'examen blanc a montré qu'ils n'avaient pas le niveau */
function afficherRdvPermis(tous){
  const zAP = $('listeAPlacer');
  const aPlacer = tous.filter(e => suiviDe(e.eleve).aPlanifier === 'oui' &&
                                   suiviDe(e.eleve).statut !== 'annule');

  /* Les favoris de « qui prend la date » arrivent des réglages
     partagés. On les demande une fois par session, sans attendre :
     les trois noms d'usage s'affichent en attendant. */
  if(typeof assurerFavorisPrise === 'function') assurerFavorisPrise();
  zAP.innerHTML = '';
  if(!aPlacer.length){
    zAP.innerHTML = '<div class="empty">Aucun élève dans la liste RDV PERMIS.</div>';
  }else{
    majVolet('cptAPlacer', aPlacer.length);
    zAP.appendChild(tableauAPlacer(aPlacer));

    /* Seuls les dossiers incomplets méritent une fiche détaillée :
       les autres se gèrent depuis la synthèse ci-dessus. */
    const incomplets = aPlacer.filter(e => {
      const s = suiviDe(e.eleve);
      return !s.centre || !s.moniteurDate || !s.semaine;
    });

    if(!incomplets.length){
      const ok = document.createElement('div');
      ok.className = 'empty';
      ok.innerHTML = '✅ Tous les dossiers sont complets.<br>' +
        '<span style="font-size:12px;">Utilise la synthèse ci-dessus pour saisir les dates obtenues.</span>';
      zAP.appendChild(ok);
    }else{
      const t = document.createElement('div');
      t.style.cssText = 'font-size:13px;font-weight:700;color:var(--warn-text);margin:12px 0 6px;';
      t.textContent = '⏳ À compléter (' + incomplets.length + ')';
      zAP.appendChild(t);
    }

    incomplets.forEach(e => {
      zAP.appendChild(ligneBureau(e, {
        info: x => {
          const s = suiviDe(x.eleve);
          const t = (s.typeExamen === 'bea' ? '🅰 BEA'
                     : s.typeExamen === 'handicap' ? '♿ Handicap' : '🅑 BV');
          return t + ' · ' + (s.centre || 'centre à définir') +
                 (s.moniteurDate ? ' · ' + s.moniteurDate : ' · moniteur à définir') +
                 /* L'absence se dit : cette fiche ne s'ouvre QUE sur
                    un dossier incomplet, et c'est justement ce qui
                    manque qu'on vient y lire. */
                 (s.semaine ? ' · ' + s.semaine : ' · aucune semaine demandée') +
                 mentionHeuresRestantes(x.eleve) +
                 mentionExamenBlanc(x);
        },
        resume: x => resumeSuivi(x.eleve),
        alerte: x => {
          const s = suiviDe(x.eleve);
          if(!s.centre) return 'Centre d\'examen non défini';
          if(!s.moniteurDate) return 'Moniteur non défini';
          return null;
        },
        actions: (x, zone) => {
          zone.appendChild(boutonHeuresRestantes(x.eleve));
          zone.appendChild(boutonExamenBlanc(x.eleve));
          zone.appendChild(boutonEnvoyerVers(x.eleve));
          const s = suiviDe(x.eleve);

          /* ============================================================
             TROIS RANGÉES DE BOUTONS, PLUS TROIS MENUS

             « Est-ce qu'on ne peut pas mettre des boutons plutôt que
             des listes déroulantes ? »

             Un menu déroulant demande deux gestes — ouvrir, choisir —
             pour deux réponses possibles dans le cas du centre. Et le
             calendrier des semaines est déjà ouvert à côté : le
             redemander dans un menu, c'est le fermer pour le rouvrir.

             Les trois réglages s'écrivent aux mêmes endroits qu'avant,
             sous les mêmes noms : c'est l'écran qui change, pas la
             donnée. Aucun élève déjà renseigné n'est à reprendre.
             ============================================================ */
          zone.appendChild(rangeeBoutons('Centre d\'examen',
            ['Saint-Brieuc', 'Loudéac'].map(c => ({ val: c, lib: c })),
            s.centre || '',
            async val => {
              await majSuivi(x.eleve, { centre: val });
              await chargerBureau();
              redessinerBureau();
            }));

          /* QUI PREND LA DATE — DES FAVORIS, PAS UNE LISTE EN DUR.

             « Le dur me pose problème, je peux pas mettre des
             favoris ? » Si, et c'est mieux que les deux options que
             je proposais : une liste en dur vieillit au premier
             départ, un classement calculé change d'ordre sous les
             doigts. Un favori se choisit une fois et ne bouge plus
             tant que personne ne le change.

             Ils sont RANGÉS AVEC LES RÉGLAGES DU BUREAU, donc partagés :
             les gens qui prennent les dates sont les mêmes pour tout
             le monde, et chacun ne doit pas refaire son propre
             classement. */
          zone.appendChild(rangeeBoutons('Qui prend la date',
            favorisPrise().map(n => ({ val: n, lib: n })),
            s.moniteurDate || '',
            async val => {
              await majSuivi(x.eleve, { moniteurDate: val });
              await chargerBureau();
              redessinerBureau();
            },
            {
              /* Le fourre-tout : tous les autres, et de quoi épingler */
              autre: 'Autre…',
              surAutre: async () => {
                const n = await choisirQuiPrendLaDate(s.moniteurDate || '');
                if(n === null) return;
                await majSuivi(x.eleve, { moniteurDate: n });
                await chargerBureau();
                redessinerBureau();
              }
            }));

          /* LES SEMAINES, AVEC LES PLACES DU CENTRE CHOISI.

             « 2 SB / 2.5 LO » sur un élève dont on vient de dire
             qu'il passe à Saint-Brieuc, c'est un chiffre à écarter du
             regard à chaque lecture. Le centre est choisi juste
             au-dessus : le bouton n'annonce que ce qui le concerne.

             Trois ou quatre semaines sont ouvertes en même temps,
             rarement plus — au-delà de cinq, le reste passe derrière
             « Autres… » pour que la fiche ne devienne pas un mur de
             boutons. */
          const libDe = w => libelleSemaine(w) +
            ((w.sb || w.lo) ? ' (' + (w.sb || 0) + ' SB / ' + (w.lo || 0) + ' LO)' : '');

          /* Une valeur enregistrée avant l'ajout du numéro doit
             retrouver sa semaine, pas créer une entrée en double. */
          const semaines = toutesSemaines();
          const correspond = semaines.find(w => memeSemaine(libDe(w), s.semaine));
          if(s.semaine && correspond) s.semaine = libDe(correspond);

          /* ⚠️ UNE SEMAINE DONT LES PLACES SONT DÉJÀ PRISES N'EST
             PLUS UNE SEMAINE À VISER.

             « Là on va prendre les places pour octobre ; une fois
             les journées d'attribution passées, ça ne sert plus à
             rien de les voir ici. »

             Exact, et c'est même trompeur : proposer une semaine de
             septembre le 3 septembre, c'est proposer une date qu'on
             ne peut plus obtenir. Le moniteur la choisit, le bureau
             la lit, et personne ne voit qu'elle est morte.

             Les semaines dont la prise est passée ne disparaissent
             pas pour autant : elles passent DERRIÈRE « Autres… ».
             Une place se libère parfois, un dossier se reprend — on
             ne rend jamais quelque chose inatteignable, on cesse
             seulement de le proposer en premier. */
          const encoreVisable = w => {
            if(typeof dateDePrise !== 'function') return true;
            const iso = String(w.du || w.au || '');
            const m = iso.match(/^(\d{4}-\d{2})-(\d{2})$/);
            if(!m) return true;              /* sans date, on ne juge pas */
            const d = dateDePrise(m[1], Number(m[2]) <= 15 ? 1 : 2);
            if(!d) return true;              /* prise inconnue : on montre */
            return d >= todayLocal();
          };

          const enTete = semaines.filter(encoreVisable);
          const passees = semaines.filter(w => !encoreVisable(w));

          const versChoix = w => ({
            val: libDe(w),
            lib: semaineCourte(w),
            sous: joursDuCentre(w, s.centre)
          });
          const choixSem = enTete.map(versChoix).concat(passees.map(versChoix));
          /* Une semaine choisie autrefois et depuis refermée reste
             proposée : sinon elle disparaîtrait de l'écran sans que
             personne ne l'ait retirée. */
          if(s.semaine && !choixSem.some(c => c.val === s.semaine)){
            choixSem.push({ val: s.semaine, lib: s.semaine, sous: '' });
          }

          /* Le maximum suit ce qui est encore visable : les semaines
             dont la prise est passée sont derrière « Autres… », pas
             comptées dans les cinq premières. */
          zone.appendChild(rangeeBoutons('Semaine à viser', choixSem,
            s.semaine || '',
            async val => {
              await majSuivi(x.eleve, { semaine: val });
              await chargerBureau();
              redessinerBureau();
            },
            { max: Math.max(1, Math.min(5, enTete.length)), autre: 'Autres…' }));

          zone.appendChild(boutonDate('📅 Date obtenue', async iso => {
            await envoyerConsigne(x.eleve, 'permis',
              'Examen du permis fixé au ' + dateEnToutesLettres(iso) + ' (bureau)');
            await majSuivi(x.eleve, { datePermis: dateEnToutesLettres(iso),
                                      aPlanifier: '', statut: '' });
            showToast('Date transmise ✅');
            redessinerBureau();
          }));
        }
      }));
    });
  }
}



/* ============================================================
   UNE RANGÉE DE BOUTONS À LA PLACE D'UN MENU

   Écrite une fois, servie trois fois : le centre, qui prend la
   date, la semaine. Trois rangées écrites séparément auraient fini
   par ne pas se comporter pareil — l'une se dédisant au second
   appui, l'autre non.

   Règles communes :
     • le choix courant est plein, les autres sont creux ;
     • RAPPUYER SUR LE CHOIX COURANT LE RETIRE. Sans cela, une
       erreur de doigt ne se rattrape qu'en cherchant un « — aucun — »
       dans une liste, et il n'y en a plus ;
     • au-delà de « max », le reste passe derrière « Autres… » ;
     • pendant l'écriture, toute la rangée se fige : deux appuis
       rapides écriraient deux fois.
   ============================================================ */
function rangeeBoutons(titre, choix, courant, surChoix, opts){
  const o = opts || {};
  const bloc = document.createElement('div');
  bloc.style.cssText = 'margin-bottom:10px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:10.5px;color:var(--muted);text-transform:uppercase;' +
    'letter-spacing:.08em;margin-bottom:5px;';
  t.textContent = titre;
  bloc.appendChild(t);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap;';
  bloc.appendChild(r);

  /* Ce qui est choisi reste visible même s'il dépasse le maximum :
     cacher le choix courant derrière « Autres… » ferait croire
     qu'il n'y a rien de choisi. */
  let visibles = choix;
  let caches = [];
  if(o.max && choix.length > o.max){
    visibles = choix.slice(0, o.max);
    caches = choix.slice(o.max);
    const dedans = caches.find(c => c.val === courant);
    if(dedans){
      caches = caches.filter(c => c !== dedans);
      visibles = visibles.slice(0, o.max - 1).concat([dedans]);
      caches = choix.filter(c => visibles.indexOf(c) === -1);
    }
  }

  const figer = etat => Array.prototype.forEach.call(
    r.querySelectorAll('button'), b => { b.disabled = etat; });

  const faire = (c) => {
    const b = document.createElement('button');
    b.type = 'button';
    const pris = (c.val === courant);
    b.style.cssText = 'width:auto;margin:0;padding:7px 11px;font-size:12.5px;' +
      'border-radius:8px;line-height:1.25;text-align:center;' +
      (pris
        ? 'background:var(--accent);color:var(--navy-deep);border:1px solid var(--accent);font-weight:700;'
        : 'background:var(--navy);color:var(--cream);border:1px solid var(--line);');
    b.innerHTML = String(c.lib).replace(/</g, '&lt;') +
      (c.sous ? '<div style="font-size:9.5px;font-weight:400;opacity:.75;">' +
                String(c.sous).replace(/</g, '&lt;') + '</div>' : '');
    b.title = c.titre || c.lib;
    b.addEventListener('click', async () => {
      figer(true);
      try{
        /* Rappuyer sur le choix courant le retire */
        await surChoix(pris ? '' : c.val);
      }catch(e){ showToast('Erreur : ' + e.message); figer(false); }
    });
    return b;
  };

  visibles.forEach(c => r.appendChild(faire(c)));

  /* « Autre… » : le fourre-tout, en pointillés pour qu'il ne se
     confonde pas avec un vrai choix. */
  if(o.autre){
    const b = document.createElement('button');
    b.type = 'button';
    b.style.cssText = 'width:auto;margin:0;padding:7px 11px;font-size:12.5px;' +
      'border-radius:8px;background:transparent;color:var(--muted);' +
      'border:1px dashed var(--line);';
    b.textContent = o.autre;
    b.addEventListener('click', async () => {
      figer(true);
      try{
        if(o.surAutre){ await o.surAutre(); return; }
        const c = await choisirDansUneListe(titre, caches.length ? caches : choix, courant);
        if(c === null){ figer(false); return; }
        await surChoix(c);
      }catch(e){ showToast('Erreur : ' + e.message); figer(false); }
    });
    r.appendChild(b);
  }

  return bloc;
}

/* Le choix long, quand il ne tient pas en boutons */
function choisirDansUneListe(titre, choix, courant){
  const boutons = choix.map(c => ({ nom: c.lib || c.val, valeur: c.val }));
  boutons.push({ nom: '— aucun —', valeur: '' });
  boutons.push({ nom: 'Annuler', valeur: null });
  return fenetre('', boutons, titre);
}

/* ============================================================
   LES FAVORIS DE « QUI PREND LA DATE »

   Rangés avec les réglages du bureau, donc PARTAGÉS : les gens qui
   prennent les dates sont les mêmes pour tout le monde, et chacun
   n'a pas à refaire son classement.

   Vides au départ, on propose les trois noms d'usage — mais ce
   sont des favoris, pas une liste en dur : ils s'épinglent et se
   dépinglent depuis « Autre… », et l'ordre est celui du choix.
   ============================================================ */
const FAVORIS_PRISE_DEPART = ['Chrystel', 'David', 'Maryne'];
let favorisPriseListe = FAVORIS_PRISE_DEPART.slice();
let favorisPriseCharges = false;

/* Ils arrivent des réglages partagés, une seule fois par session.
   En attendant, les trois noms d'usage s'affichent : un écran qui
   attendrait le réseau pour montrer trois boutons serait pire que
   trois boutons parfois à revoir. */
async function assurerFavorisPrise(){
  if(favorisPriseCharges) return;
  favorisPriseCharges = true;
  try{
    const d = await appelPrep({ action: 'reglagesList' });
    const g = (d && d.reglages) || {};
    const brut = String(g.favorisDate || '').trim();
    if(!brut) return;
    const lu = brut.split('|').map(x => x.trim()).filter(Boolean);
    if(lu.join('|') === favorisPriseListe.join('|')) return;
    favorisPriseListe = lu;
    /* Ils ont changé depuis l'affichage : on redessine une fois. */
    if(typeof redessinerBureau === 'function') redessinerBureau();
  }catch(e){ /* les trois noms d'usage feront l'affaire */ }
}

function favorisPrise(){
  /* Un favori qui n'est plus dans l'équipe ne s'affiche plus, mais
     on ne le retire pas du réglage : un congé n'est pas un départ. */
  const gens = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];
  if(!gens.length) return favorisPriseListe.slice(0, 4);
  return favorisPriseListe.filter(n =>
    gens.some(g => normaliserMot(g) === normaliserMot(n))).slice(0, 4);
}

async function basculerFavoriPrise(nom){
  favorisPrise();
  const i = favorisPriseListe.findIndex(x => normaliserMot(x) === normaliserMot(nom));
  if(i === -1) favorisPriseListe.push(nom);
  else favorisPriseListe.splice(i, 1);

  try{
    await appelPrep({ action: 'reglageSet', cle: 'favorisDate',
                      valeur: favorisPriseListe.join('|'),
                      par: ACCES.moniteur || '' });
  }catch(e){ showToast('Épinglé ici, mais pas enregistré.'); }
}

/* La fenêtre « Autre… » : tout le monde, avec une étoile pour
   épingler. Rend le nom choisi, ou null si on ferme. */
function choisirQuiPrendLaDate(courant){
  return new Promise(resolve => {
    const gens = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];

    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(420px,94vw);';

    boite.innerHTML = '<h3>Qui prend la date</h3>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
        'line-height:1.5;">L\'étoile épingle quelqu\'un dans les boutons, ' +
        'pour tout le monde.</div>';

    const liste = document.createElement('div');
    liste.style.cssText = 'max-height:min(52vh,420px);overflow-y:auto;' +
      'margin-bottom:12px;';

    const fermer = v => {
      if(fond.parentNode) document.body.removeChild(fond);
      resolve(v);
    };

    gens.forEach(n => {
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:8px;align-items:center;padding:3px 0;';

      const et = document.createElement('button');
      et.type = 'button';
      const estFav = () => favorisPrise().some(x => normaliserMot(x) === normaliserMot(n));
      et.style.cssText = 'width:auto;margin:0;padding:8px 10px;font-size:16px;' +
        'background:transparent;border:1px solid var(--line);border-radius:8px;' +
        'flex-shrink:0;';
      const majEt = () => { et.textContent = estFav() ? '⭐' : '☆'; };
      majEt();
      et.addEventListener('click', async e => {
        e.stopPropagation();
        et.disabled = true;
        await basculerFavoriPrise(n);
        majEt();
        et.disabled = false;
      });
      l.appendChild(et);

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.style.cssText = 'flex:1;margin:0;padding:10px 12px;font-size:14px;' +
        'text-align:left;' +
        (normaliserMot(n) === normaliserMot(courant || '')
          ? 'border-color:var(--accent);color:var(--accent-text);' : '');
      b.textContent = n;
      b.addEventListener('click', () => fermer(n));
      l.appendChild(b);

      liste.appendChild(l);
    });
    boite.appendChild(liste);

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';
    const bAucun = document.createElement('button');
    bAucun.className = 'btn btn-secondary';
    bAucun.textContent = '— aucun —';
    bAucun.addEventListener('click', () => fermer(''));
    const bAnn = document.createElement('button');
    bAnn.className = 'btn btn-secondary';
    bAnn.textContent = 'Fermer';
    bAnn.addEventListener('click', () => fermer(null));
    rangee.appendChild(bAucun);
    rangee.appendChild(bAnn);
    boite.appendChild(rangee);

    fond.appendChild(boite);
    fond.addEventListener('click', e => { if(e.target === fond) fermer(null); });
    document.body.appendChild(fond);
  });
}

/* « 12→16 oct · S42 » — la semaine en trois mots, pour un bouton */
function semaineCourte(w){
  const lib = libelleSemaine(w);
  const n = numeroSemaine(w.du);
  const j = iso => {
    if(!iso) return '?';
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? '?' : d.getDate();
  };
  const mois = iso => {
    if(!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { month:'short' });
  };
  if(!w.du && !w.au) return lib;
  return j(w.du) + '→' + j(w.au) + ' ' + mois(w.au) + (n ? ' · S' + n : '');
}

/* Un nombre à la française : 2,5 et non 2.5 */
function nbFr(n){
  return String(n).replace('.', ',');
}

/* Les JOURS D'EXAMEN ouverts une semaine donnée, dans le centre
   choisi. Sans centre, on donne les deux — mais dès qu'il est
   choisi, le chiffre qui ne concerne pas cet élève disparaît.

   ⚠️ Des jours, pas des places : les places se comptent au mois,
   les jours à la semaine, et un jour reçoit plusieurs candidats. */
function joursDuCentre(w, centre){
  const sb = Number(w.sb) || 0;
  const lo = Number(w.lo) || 0;
  if(!sb && !lo) return '';
  if(/brieuc/i.test(centre || '')) return nbFr(sb) + ' jour' + (sb > 1 ? 's' : '');
  if(/loud/i.test(centre || '')) return nbFr(lo) + ' jour' + (lo > 1 ? 's' : '');
  return nbFr(sb) + ' SB / ' + nbFr(lo) + ' LO';
}


/* Permis prévus : préparation administrative.
   Renvoie la liste, réutilisée par les examens passés. */
/* Les semaines ouvertes par la préfecture.

   C'est ce qu'on vient chercher en ouvrant « Permis et places » :
   combien de dates sont disponibles, et combien sont prises. */
function dessinerTableauPlaces(prevus){
  if(typeof afficherPlaces !== 'function') return;
  if(typeof placesConfig === 'undefined') return;

  const actifs = (prevus || []).filter(e =>
    suiviDe(e.eleve).statut !== 'annule');

  /* Combien d'examens par mois configuré */
  const moisConnus = placesConfig.mois.map(m => m.mois).filter(Boolean);
  const parMois = {};
  let horsMois = 0;

  actifs.forEach(e => {
    const k = e._iso ? e._iso.slice(0, 7) : '';
    if(!k || moisConnus.indexOf(k) === -1){ horsMois++; return; }
    if(!parMois[k]){
      parMois[k] = { prevus:0, remplacements:0, fantomes:0, aDonner:0 };
    }
    parMois[k].prevus++;

    const s = suiviDe(e.eleve);
    if(s.aRemplacer === 'oui') parMois[k].remplacements++;
    if(s.fantome === 'oui') parMois[k].fantomes++;
    if(s.dateADonner === 'oui') parMois[k].aDonner++;
  });

  /* Combien tombent dans chaque semaine ouverte */
  const parSemaine = {};
  placesConfig.mois.forEach(m => (m.semaines || []).forEach(w => {
    if(!w.du || !w.au) return;
    parSemaine[w.du + '>' + w.au] = actifs.filter(e =>
      e._iso && e._iso >= w.du && e._iso <= w.au).length;
  }));

  afficherPlaces({ parMois: parMois, horsMois: horsMois,
                   parSemaine: parSemaine });
}


function afficherPermisPrevus(tous){
  const zPP = $('listePermisPrevu');
  const prevus = tous.filter(e => e.etat.permis === 'prevu');
  /* Élèves dont seule la fiche de suivi porte une date */
  etatBureau.suivi.forEach(s => {
    if(!s.datePermis) return;
    if(prevus.some(x => normaliserMot(x.eleve) === normaliserMot(s.eleve))) return;
    const base = tous.find(x => normaliserMot(x.eleve) === normaliserMot(s.eleve));
    if(base) prevus.push(base);
  });

  /* Date et boîte de chaque élève, pour le récapitulatif et les filtres */
  majVolet('cptPrevus', prevus.length);
  prevus.forEach(e => {
    const s = etatBureau.suivi.find(y => normaliserMot(y.eleve) === normaliserMot(e.eleve));
    e._suivi = s || {};
    e._datePermis = (e.etat.permisDate) || (s && s.datePermis) || '';
    e._iso = dateFrVersIso(e._datePermis) || '';
    /* Une même date peut compter plusieurs groupes : deux inspecteurs,
       matin et après-midi. Le groupe fait partie de la clé. */
    e._groupe = (s && s.groupePermis) || '';
    e._cleJour = (e._iso || e._datePermis || 'Date inconnue') +
                 (e._groupe ? ' · ' + e._groupe : '');
    e._boite = ((s && s.typeExamen) || e.boite ||
                (/automatique/i.test(e.type || '') ? 'bea' : 'bv')).toLowerCase();
  });

  /* Le bloc « Permis prévus » a laissé la place aux sessions. La
     fonction reste, car sa liste sert aux examens passés.

     Le tableau des semaines ouvertes, lui, doit s'afficher : il
     était resté derrière ce retour et ne se dessinait plus. */
  if(!zPP){
    dessinerTableauPlaces(prevus);
    return prevus;
  }

  /* Récapitulatif : nombre d'examens par date */
  const parDate = {};
  prevus.forEach(e => {
    /* On regroupe sur la DATE, pas sur son libellé : « 3 septembre »
       et « 3 septembre avant » sont le même jour et doivent tenir
       dans le même bloc. */
    const k = e._cleJour;
    if(!parDate[k]) parDate[k] = { iso: e._iso, libelle: e._datePermis,
                                   groupe: e._groupe,
                                   bv: 0, bea: 0, handicap: 0, total: 0 };
    parDate[k].total++;
    if(e._boite === 'bea') parDate[k].bea++;
    else if(e._boite === 'handicap') parDate[k].handicap++;
    else parDate[k].bv++;
  });

  const dates = Object.keys(parDate).sort((a, b) =>
    (parDate[a].iso || '9999').localeCompare(parDate[b].iso || '9999'));


  /* Menu des dates disponibles */
  const selD = $('filtreDate');
  const choixD = selD.value;
  selD.innerHTML = '<option value="">Toutes les dates</option>';
  dates.forEach(k => {
    const o = document.createElement('option');
    o.value = k;
    /* La clé est la date ISO : on affiche le jour en toutes lettres */
    o.textContent = (parDate[k].iso ? dateEnToutesLettres(parDate[k].iso)
                                    : (parDate[k].libelle || k)) +
                    (parDate[k].groupe ? ' · ' + parDate[k].groupe : '') +
                    ' (' + parDate[k].total + ')';
    selD.appendChild(o);
  });
  selD.value = choixD;

  /* Application des filtres */
  const fEtat = $('filtrePP').value;
  const fDate = selD.value;
  let visibles = prevus.slice();
  if(fEtat === 'donner')    visibles = visibles.filter(e => e._suivi.dateADonner === 'oui');
  if(fEtat === 'remplacer') visibles = visibles.filter(e => e._suivi.aRemplacer === 'oui');
  if(fEtat === 'fantome')   visibles = visibles.filter(e => e._suivi.fantome === 'oui');
  if(fEtat === 'ok')        visibles = visibles.filter(e => e._suivi.toutOk === 'oui');
  if(fEtat === 'pasok')     visibles = visibles.filter(e => e._suivi.toutOk !== 'oui');
  /* Le filtre porte sur la même clé que le regroupement */
  if(fDate) visibles = visibles.filter(e => e._cleJour === fDate);
  visibles.sort((a, b) => (a._iso || '9999').localeCompare(b._iso || '9999'));

  /* Statistiques ventilées par mois d'examen */
  const actifs = prevus.filter(e => suiviDe(e.eleve).statut !== 'annule');
  const parMois = {};
  let horsMois = 0;
  const moisConnus = placesConfig.mois.map(m => m.mois).filter(Boolean);

  actifs.forEach(e => {
    const k = (e._iso || '').slice(0, 7);
    if(!k || moisConnus.indexOf(k) === -1){ horsMois++; return; }
    if(!parMois[k]) parMois[k] = { prevus:0, remplacements:0, fantomes:0,
                                   aDonner:0, centres:{} };
    const s = suiviDe(e.eleve);
    parMois[k].prevus++;
    if(s.aRemplacer === 'oui') parMois[k].remplacements++;
    if(s.fantome === 'oui') parMois[k].fantomes++;
    if(s.dateADonner === 'oui') parMois[k].aDonner++;
    /* La répartition par centre : c'est elle qui dit où placer les suivants */
    const ce = (s.centre || '').trim() || 'centre à définir';
    parMois[k].centres[ce] = (parMois[k].centres[ce] || 0) + 1;
  });

  /* Nombre d'examens tombant dans chaque semaine ouverte */
  const parSemaine = {};
  placesConfig.mois.forEach(m => (m.semaines || []).forEach(w => {
    if(!w.du || !w.au) return;
    const cle = w.du + '>' + w.au;
    parSemaine[cle] = actifs.filter(e => e._iso && e._iso >= w.du && e._iso <= w.au).length;
  }));

  afficherPlaces({ parMois: parMois, horsMois: horsMois, parSemaine: parSemaine });

  /* La vue d'ensemble reste au-dessus des filtres, quel que soit le filtre */
  const zApercu = $('apercuPermis');
  if(zApercu){
    zApercu.innerHTML = '';
    if(prevus.length) zApercu.appendChild(apercuPermisPrevus(prevus));
    else zApercu.innerHTML = '<div class="empty">Aucun permis prévu.</div>';
  }

  zPP.innerHTML = '';
  /* Idem ici : une date connue du bureau seul doit pouvoir entrer */
  boutonAjoutManuel(zPP, 'prevu');

  /* Un filtre actif se voit et se retire facilement */
  if(prevus.length && (fEtat || fDate)){
    const b = document.createElement('div');
    b.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 10px;' +
      'background:var(--navy);border:1px solid var(--orange);border-radius:8px;' +
      'margin-bottom:10px;font-size:13px;';
    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;color:var(--accent-text);';
    t.textContent = '🔎 Filtre actif' +
      (fDate ? ' · ' + (dateEnToutesLettres(fDate) || fDate) : '');
    b.appendChild(t);
    const x = document.createElement('button');
    x.className = 'btn btn-secondary';
    x.style.cssText = 'width:auto;padding:5px 10px;font-size:12px;margin:0;flex-shrink:0;';
    x.textContent = '✕ Tout afficher';
    x.addEventListener('click', () => {
      if($('filtrePP')) $('filtrePP').value = '';
      if($('filtreDate')) $('filtreDate').value = '';
      afficherBureau(true);
    });
    b.appendChild(x);
    zPP.appendChild(b);
  }

  const vide = t => {
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = t;
    zPP.appendChild(v);
  };

  if(!prevus.length){
    vide('Aucun permis prévu.');
  }else if(!fEtat && !fDate){
    vide("Choisis un filtre ou une date, ou appuie sur un nom dans la vue d'ensemble.");
  }else if(!visibles.length){
    vide('Aucun élève ne correspond à ce filtre.');
  }else{
    visibles.forEach(e => {
      const l = ligneBureau(e, {
        replier: true,
        info: x => {
          const sx = suiviDe(x.eleve);
          /* Ce que le bureau a noté dans « Autre à prévoir » doit se
             lire sans déplier la fiche : c'est souvent l'essentiel. */
          const autre = String(sx.autre || '').trim();
          return emojisPermis(sx) +
                 (sx.toutOk === 'oui' ? ' ✅ ' : ' ⚠️ ') +
                 (x._boite === 'bea' ? '🅰 BEA'
                  : x._boite === 'handicap' ? '♿ Handicap' : '🅑 BV') +
                 ' · Permis le ' + (x._datePermis || 'date inconnue') +
                 (x.etat.permisN !== null ? ' · encore ' + x.etat.permisN + ' leçon(s)' : '') +
                 mentionHeuresRestantes(x.eleve) +
                 mentionExamenBlanc(x) +
                 (autre ? '\n📝 ' + autre : '');
        },
        resume: x => resumeSuivi(x.eleve),
        alerte: x => {
          const s = etatBureau.suivi.find(y => normaliserMot(y.eleve) === normaliserMot(x.eleve));
          if(s && s.aRemplacer === 'oui') return 'Place à remplacer';
          if(s && s.dateADonner === 'oui') return 'Date à donner à une autre auto-école';
          return null;
        },
        actions: (x, zone) => {
          zone.appendChild(boutonHeuresRestantes(x.eleve));
          zone.appendChild(boutonExamenBlanc(x.eleve));
          zone.appendChild(boutonEnvoyerVers(x.eleve));
          zone.appendChild(boutonDate('📅 Modifier la date', async iso => {
            await envoyerConsigne(x.eleve, 'permis',
              'Examen du permis fixé au ' + dateEnToutesLettres(iso) + ' (bureau)');
            await appelPrep({ action:'suiviSet', eleve:x.eleve,
                              datePermis: dateEnToutesLettres(iso), par: ACCES.moniteur || '' });
            showToast('Date transmise ✅');
            redessinerBureau();
          }));
          const rangee = document.createElement('div');
          rangee.style.cssText = 'display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;';

          const s = suiviDe(x.eleve);
          const bAnn = document.createElement('button');
          bAnn.className = 'btn btn-secondary';
          bAnn.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;';
          bAnn.textContent = '❌ Annuler l\'examen';
          bAnn.addEventListener('click', async () => {
            const annuler = (s.statut !== 'annule');
            if(annuler && !await confirmer('Annuler l\'examen de ' + x.eleve + ' ?')) return;
            bAnn.disabled = true;
            try{
              if(annuler){
                /* Les anciennes consignes de date n'ont plus lieu d'être */
                const obsoletes = (x.enAttente || []).filter(cs =>
                  /permis|examen/i.test(cs.type + ' ' + cs.texte));
                for(const cs of obsoletes){
                  try{ await appelPrep({ action:'consigneDone', id: cs.id }); }catch(e){}
                }
                /* L'examen n'existe plus : l'élève retourne dans « à prévoir » */
                await envoyerConsigne(x.eleve, 'permis',
                  "Examen du permis annulé — date d'examen à prévoir (bureau)");
                /* Sa date part, sa fiche reste : heures, examen
                   blanc et paiements sont encore utiles. */
                await majSuivi(x.eleve, { datePermis: '', centre: '',
                                          statut: '', toutOk: '',
                                          aRemplacer: '' });
                showToast(x.eleve + ' est repassé en « à prévoir »');
              }else{
                await majSuivi(x.eleve, { statut: '' });
              }
              redessinerBureau();
            }catch(e){ showToast('Erreur : ' + e.message); bAnn.disabled = false; }
          });
          rangee.appendChild(bAnn);

          const bSup = document.createElement('button');
          bSup.className = 'btn btn-secondary';
          bSup.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;' +
            'color:var(--red);border-color:var(--red);';
          bSup.textContent = '🗑️ Retirer de la liste';
          bSup.addEventListener('click', async () => {
            if(!await confirmer('Retirer ' + x.eleve + ' de cette liste ?\n\n' +
                        'Sa fiche est conservée : heures, examen blanc, ' +
                        'paiements. Tu pourras le remettre.')) return;
            bSup.disabled = true;
            try{
              /* On le sort de la liste sans détruire sa fiche */
              await majSuivi(x.eleve, { retireAPrevoir: 'oui', aPlanifier: '' });
              showToast('Retiré de la liste ✅');
              redessinerBureau();
            }catch(e){ showToast('Erreur : ' + e.message); bSup.disabled = false; }
          });
          rangee.appendChild(bSup);
          zone.appendChild(rangee);

          zone.appendChild(ficheSuiviPermis(x));
        }
      });
      zPP.appendChild(l);
    });
  }
  return prevus;
}


/* Examens passés : résultat à saisir */
async function afficherPostExamenDepuisPrevus(tous, prevus){
  await afficherPostExamen(prevus.concat(
    tous.filter(e => suiviDe(e.eleve).datePermis &&
                     !prevus.some(p => normaliserMot(p.eleve) === normaliserMot(e.eleve)))
        .map(e => Object.assign({}, e, { _iso: dateFrVersIso(suiviDe(e.eleve).datePermis) }))
  ));
}


/* Élèves prêts au permis */
function afficherExamensPermis(tous){
  const zPer = $('listePermis');
  if(!zPer) return;

  /* Un rendez-vous post-permis fixé garde l'élève visible ici : on
     attend ce rendez-vous pour savoir s'il repasse, et sans ça il
     disparaissait de toutes les listes entre-temps. */
  const candidats = tous.filter(e => {
    /* Une date déjà posée, ou une place dans une session : il
       n'est plus « à placer », quoi que dise sa note. Celle-ci
       vient souvent d'un cours antérieur à la date. */
    if(dejaPlace(e)) return false;

    if(e.etat.permis === 'aprevoir' || e.etat.permis === 'annule') return true;
    const s = suiviDe(e.eleve);
    return !!(s.rdvPostDate && s.rdvPostFait !== 'oui');
  });
  const masques = candidats.filter(e => suiviDe(e.eleve).aPlanifier === 'oui' ||
                                        suiviDe(e.eleve).retireAPrevoir === 'oui');
  let per = candidats.filter(e => suiviDe(e.eleve).aPlanifier !== 'oui' &&
                                  suiviDe(e.eleve).retireAPrevoir !== 'oui');

  /* Filtre par état */
  const fPer = $('filtrePermis') ? $('filtrePermis').value : '';
  if(fPer === 'annule') per = per.filter(e => e.etat.permis === 'annule');
  else if(fPer === 'aprevoir') per = per.filter(e => e.etat.permis === 'aprevoir');
  else if(fPer === 'urgent') per = per.filter(e => String(e.urgence || '') >= '4');
  else if(fPer === 'sansprio') per = per.filter(e => !e.urgence);
  else if(fPer === 'repassage') per = per.filter(e => suiviDe(e.eleve).nbAjournements);
  else if(fPer === 'premier') per = per.filter(e => !suiviDe(e.eleve).nbAjournements);

  /* Priorité décroissante, puis demande la plus ancienne */
  per.sort((a, b) => {
    const ua = parseInt(a.urgence || '0', 10);
    const ub = parseInt(b.urgence || '0', 10);
    if(ub !== ua) return ub - ua;
    return String(a.date || '').localeCompare(String(b.date || ''));
  });
  afficherPasNiveau(tous);
  afficherAttenteBilan(tous);
  afficherPasDeRepassage(tous);
  afficherExamenNonPlanifiable(tous);
  afficherAlertePrise(per);

  zPer.innerHTML = '';
  /* Le bureau peut inscrire quelqu'un sans attendre un moniteur */
  boutonAjoutManuel(zPer, 'aprevoir');

  /* Un élève écarté par un drapeau doit rester repérable */
  if(masques.length){
    const m = document.createElement('div');
    m.style.cssText = 'font-size:12px;color:var(--muted);padding:8px 10px;margin-bottom:8px;' +
      'background:var(--navy);border:1px solid var(--line);border-radius:8px;line-height:1.5;';
    m.innerHTML = 'ℹ️ ' + masques.length + ' élève(s) masqué(s) : ' +
      masques.map(x => {
        const s = suiviDe(x.eleve);
        return x.eleve.replace(/</g,'&lt;') +
          (s.aPlanifier === 'oui' ? ' (dans RDV PERMIS)' : ' (retiré de la liste)');
      }).join(' · ');
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'margin-top:8px;padding:8px;font-size:12px;';
    b.textContent = '↩️ Les remettre dans la liste';
    b.addEventListener('click', async () => {
      if(!await confirmer('Remettre ces ' + masques.length +
                          ' élève(s) dans les examens à prévoir ?')) return;
      b.disabled = true;
      try{
        for(const x of masques){
          await majSuivi(x.eleve, { aPlanifier: '', retireAPrevoir: '' });
        }
        redessinerBureau();
      }catch(err){ showToast('Erreur : ' + err.message); b.disabled = false; }
    });
    m.appendChild(b);
    zPer.appendChild(m);
  }

  if(!per.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = fPer ? 'Aucun élève ne correspond à ce filtre.'
                         : 'Aucun élève prêt au permis.';
    zPer.appendChild(v);
  }else{
    const cpt = document.createElement('div');
    cpt.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
      'padding:4px 2px 8px;';
    const nRep = per.filter(x => suiviDe(x.eleve).nbAjournements).length;
    cpt.textContent = per.length + ' élève(s)' +
      (nRep ? ' · dont ' + nRep + ' repassage(s)' : '');
    zPer.appendChild(cpt);
    signalerAjout(zPer);
    majVolet('cptAPrevoir', per.length);
  per.forEach(e => {
      zPer.appendChild(ligneBureau(e, {
        replier: true,
        info: x => {
          const sv = suiviDe(x.eleve);
          const rep = sv.nbAjournements ? '🔁 ' + mentionAjournements(sv.nbAjournements).replace('🔁 ','') + ' · ' : '🆕 ';
          const att = (sv.resultat === 'ajourne' && !sv.rdvPostFait)
            ? (sv.rdvPostDate ? ' · RDV post-permis le ' + dateEnToutesLettres(sv.rdvPostDate)
                              : ' · en attente du RDV post-permis')
            : '';
          const suite = sv.rdvPostFait === 'oui' && sv.suite ? ' · ' + libelleSuite(sv.suite) : '';
          const dispo = sv.dispoDu ? ' · 📅 à partir du ' + dateEnToutesLettres(sv.dispoDu) : '';
          const base = rep + ((x.etat.permis === 'annule') ? 'Examen annulé — à reprogrammer'
                                                          : 'Date à prévoir') + att + suite + dispo;
          const dem = x.date ? ' · demandé le ' + x.date : '';
          const lec = (x.etat.permisN !== null) ? ' · ' + x.etat.permisN + ' leçon(s) à prévoir' : '';
          const u = libelleUrgence(x.urgence);
          return base + dem + lec + mentionHeuresRestantes(x.eleve) +
                 mentionExamenBlanc(x) +
                 (x.urgence ? ' · ' + u.l : '');
        },
        alerte: x => (String(x.urgence) >= '4') ? 'Priorité élevée' : null,
        actions: (x, zone) => {
          zone.appendChild(boutonHeuresRestantes(x.eleve));
          zone.appendChild(boutonExamenBlanc(x.eleve));
          zone.appendChild(boutonEnvoyerVers(x.eleve));

          const sPost = suiviDe(x.eleve);

          /* En attente de son rendez-vous post-permis : le moniteur
             peut le sortir de la liste s'il a oublié de le faire au
             moment du rendez-vous. */
          if(sPost.rdvPostDate && sPost.rdvPostFait !== 'oui'){
            const bSans = document.createElement('button');
            bSans.className = 'btn btn-secondary';
            bSans.style.cssText = 'width:auto;padding:8px 12px;font-size:12px;margin:0 0 10px;';
            bSans.textContent = '⏸️ Pas de repassage pour le moment';
            bSans.title = 'Le retire de cette liste sans supprimer son rendez-vous';
            bSans.addEventListener('click', async () => {
              if(!await confirmer('Retirer ' + x.eleve + ' des élèves prêts au permis ?\n\n' +
                  'Son rendez-vous post-permis est conservé.')) return;
              bSans.disabled = true;
              try{
                await majSuivi(x.eleve, { retireAPrevoir: 'oui' });
                showToast('Retiré de la liste ✅');
                afficherBureau(true);
              }catch(e){ showToast('Erreur : ' + e.message); bSans.disabled = false; }
            });
            zone.appendChild(bSans);
          }

          const lab = document.createElement('label');
          lab.style.cssText = 'display:flex;align-items:center;gap:10px;text-transform:none;' +
            'font-size:15px;color:var(--cream);margin-bottom:10px;';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.style.cssText = 'width:19px;height:19px;';
          cb.checked = (suiviDe(x.eleve).aPlanifier === 'oui');
          cb.addEventListener('change', async () => {
            cb.disabled = true;
            try{
              await majSuivi(x.eleve, { aPlanifier: cb.checked ? 'oui' : '',
                                        retireAPrevoir: '' });
              redessinerBureau();
            }catch(e){ showToast('Erreur : ' + e.message); cb.disabled = false; }
          });
          lab.appendChild(cb);
          lab.appendChild(document.createTextNode('Mettre dans la liste RDV PERMIS'));
          zone.appendChild(lab);

          const bRet = document.createElement('button');
          bRet.className = 'btn btn-secondary';
          bRet.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;margin-right:6px;' +
            'color:var(--red);border-color:var(--red);';
          bRet.textContent = '🗑️ Retirer de la liste';
          bRet.addEventListener('click', async () => {
            if(!await confirmer('Retirer ' + x.eleve + ' des examens à prévoir ?\n\n' +
                        'Il y reviendra si un moniteur le signale à nouveau.')) return;
            bRet.disabled = true;
            try{
              /* Les consignes en attente ne doivent plus le faire réapparaître */
              for(const cs of (x.enAttente || [])){
                try{ await appelPrep({ action:'consigneDone', id: cs.id }); }catch(e){}
              }
              await majSuivi(x.eleve, { retireAPrevoir: 'oui' });
              redessinerBureau();
            }catch(e){ showToast('Erreur : ' + e.message); bRet.disabled = false; }
          });
          zone.appendChild(bRet);

          zone.appendChild(blocDispo(x));

          zone.appendChild(boutonDate('📅 Date de permis', async iso => {
            await envoyerConsigne(x.eleve, 'permis',
              'Examen du permis fixé au ' + dateEnToutesLettres(iso) + ' (bureau)');
            showToast('Date transmise ✅');
            redessinerBureau();
          }));

          const sel = document.createElement('select');
          sel.style.cssText = 'margin-top:8px;margin-bottom:0;';
          URGENCES.forEach(u => {
            const o = document.createElement('option');
            o.value = u.v; o.textContent = u.l;
            sel.appendChild(o);
          });
          sel.value = x.urgence || '';
          sel.addEventListener('change', async () => {
            sel.disabled = true;
            try{
              await envoyerConsigne(x.eleve, 'urgence', '', sel.value);
              showToast('Priorité enregistrée ✅');
              await chargerBureau();
            }catch(e){ showToast('Erreur : ' + e.message); }
            sel.disabled = false;
          });
          zone.appendChild(sel);
        }
      }));
    });
  }
}

async function ajouterDateBureau(){
  const eleve = $('addEleve').value.trim();
  const type = $('addType').value;
  const situation = $('addEtat').value;
  const iso = $('addDate').value;
  const nLecons = $('addLecons').value.trim();
  const etat = $('addEtatMsg');

  if(eleve.length < 2){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = "Saisis le nom de l'élève.";
    return;
  }
  if(situation === 'date' && !iso){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = 'Choisis une date ou passe en « à prévoir ».';
    return;
  }

  const suite = nLecons
    ? ' — encore ' + nLecons + ' leçon' + (parseInt(nLecons, 10) > 1 ? 's' : '')
    : '';

  let texte;
  if(situation === 'date'){
    const quand = dateEnToutesLettres(iso);
    if(type === 'permis') texte = 'Examen du permis fixé au ' + quand + suite + ' avant (bureau)';
    else if(type === 'examblanc') texte = 'Examen blanc fixé au ' + quand + suite + ' avant (bureau)';
    else texte = 'Simulateur nuit et risques fixé au ' + quand + ' (bureau)';
  }else{
    if(type === 'permis'){
      texte = "Date d'examen à prévoir" + (suite ? ' (' + suite.replace(' — ', '') + ')' : '') + ' (bureau)';
    }else if(type === 'examblanc'){
      texte = 'Examen blanc à prévoir' +
              (nLecons ? ' dans ' + nLecons + ' leçon' + (parseInt(nLecons,10) > 1 ? 's' : '') : '') +
              ' (bureau)';
    }else{
      texte = 'Simulateur nuit et risques à prévoir (bureau)';
    }
  }

  const btn = $('addBtn');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';
  try{
    await envoyerConsigne(eleve, type, texte);
    etat.style.color = 'var(--accent-text)';
    etat.textContent = '✅ ' + texte;

    /* Le formulaire repart à vide : on enchaîne souvent plusieurs
       élèves, et un nom resté en place fait enregistrer deux fois
       la même personne sans s'en apercevoir. */
    $('addLecons').value = '';
    $('addEleve').value = '';
    if($('addDate')) $('addDate').value = '';
    if($('addNote')) $('addNote').value = '';
    $('addEleve').focus();

    /* Rafraîchissement discret : les listes ne se vident pas.
       Les messages ne sont relus que si leur tiroir est ouvert. */
    eleveAjouteRecemment = eleve;
    const travaux = [afficherBureau(true)];
    if(tiroirOuvert('messages')) travaux.push(afficherConsignesEnAttente());
    await Promise.all(travaux);
  }catch(e){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = 'Erreur : ' + e.message;
  }finally{
    btn.disabled = false;
    btn.textContent = '📅 Enregistrer la date';
  }
}

/* ============================================================
   ACTUALISATION AUTOMATIQUE
   Le suivi bureau et les cours préparés changent sans qu'on le
   sache : d'autres personnes les modifient. On rafraîchit seul.
   ============================================================ */

/* On ne rafraîchit jamais pendant une saisie : ce serait perdre le travail */
function emojisPermis(s){
  const e = [];
  if(s.fairePoint === 'oui')  e.push('❓');   /* point à faire au prochain cours */
  if(doitDeLArgent(s))        e.push('💰');   /* reste à payer */
  if(aPlanifier(s))           e.push('📆');   /* leçons à poser sur le planning */
  if(s.aRemplacer === 'oui')  e.push('🔄');   /* place à remplacer */
  if(s.fantome === 'oui')     e.push('👻');   /* place fantôme */
  if(s.dateADonner === 'oui') e.push('🏫');   /* à donner à une autre auto-école */
  if(s.nbAjournements)        e.push('🔁');   /* repassage */
  return e.join('');
}

/* Un solde saisi et non nul signifie qu'il reste à payer */
function doitDeLArgent(s){
  const v = String(s.resteAPayer || '').trim();
  if(!v) return false;
  const n = parseFloat(v.replace(',', '.').replace(/[^\d.\-]/g, ''));
  if(!isNaN(n)) return n > 0;
  return !/^(0|non|rien|soldé|solde|ok|à jour|a jour)$/i.test(v);
}

/* Les réservations ne sont pas encore posées sur le planning */
function aPlanifier(s){
  const v = String(s.reservations || '').trim();
  if(!v) return true;
  return /à faire|a faire|non|pas encore|à poser|a poser|manque/i.test(v);
}

function legendePermis(){
  const d = document.createElement('div');
  d.style.cssText = 'font-size:11px;color:var(--muted);line-height:1.7;' +
    'padding:6px 2px 10px;';
  d.innerHTML = '✅ dossier prêt · ⚠️ il manque quelque chose<br>' +
    '❓ faire le point · 💰 reste à payer · 📆 leçons à planifier · ' +
    '🔄 place à remplacer · 👻 fantôme · 🏫 à donner · 🔁 repassage<br>' +
    'Nom <span style="color:var(--muted);font-weight:700;">gris</span> = fantôme · ' +
    '<span style="color:#E8A33D;font-weight:700;">orange</span> = à remplacer · ' +
    '<span style="color:var(--red);font-weight:700;">rouge</span> = à donner';
  return d;
}

/* Vue d'ensemble des permis prévus : par date, noms et état */
function apercuPermisPrevus(prevus){
  const bloc = document.createElement('div');

  const nOk = prevus.filter(e => suiviDe(e.eleve).toutOk === 'oui').length;
  const nBV = prevus.filter(e => e._boite !== 'bea' && e._boite !== 'handicap').length;
  const nBEA = prevus.filter(e => e._boite === 'bea').length;
  const nHand = prevus.filter(e => e._boite === 'handicap').length;

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);padding:2px 2px 6px;';
  const nPoint = prevus.filter(e => suiviDe(e.eleve).fairePoint === 'oui').length;
  const nRempl = prevus.filter(e => suiviDe(e.eleve).aRemplacer === 'oui').length;
  const nFant  = prevus.filter(e => suiviDe(e.eleve).fantome === 'oui').length;
  const nDonner = prevus.filter(e => suiviDe(e.eleve).dateADonner === 'oui').length;
  t.innerHTML = prevus.length + ' permis prévu(s) — ' +
    '<span style="color:var(--accent-text);">' + nBV + ' BV</span> · ' +
    '<span style="color:#E8A33D;">' + nBEA + ' BEA</span>' +
    (nHand ? ' · <span style="color:#7FB3FF;">' + nHand + ' ♿</span>' : '') +
    '<br><span style="font-weight:600;color:var(--muted);">' +
    nOk + ' prêt(s), ' + (prevus.length - nOk) + ' à compléter</span>' +
    (nPoint ? '<br><span style="font-weight:700;color:var(--warn-text);">❓ ' +
      nPoint + ' point(s) à faire à la prochaine leçon</span>' : '') +
    /* L'état des places : ce qui reste à caser ou à rendre */
    ((nRempl || nFant || nDonner)
      ? '<br><span style="font-weight:600;">' +
        [nRempl  ? '<span style="color:#E8A33D;">🔄 ' + nRempl + ' à remplacer</span>' : '',
         nFant   ? '<span style="color:var(--muted);">👻 ' + nFant + ' fantôme(s)</span>' : '',
         nDonner ? '<span style="color:var(--red);">🏫 ' + nDonner + ' à donner</span>' : '']
          .filter(Boolean).join(' · ') + '</span>'
      : '');
  bloc.appendChild(t);
  bloc.appendChild(legendePermis());

  /* Regroupement par date réelle, pas par libellé : « 3 septembre »
     et « 3 septembre avant » désignent le même jour. */
  const parDate = {};
  prevus.forEach(e => {
    const k = e._cleJour;
    if(!parDate[k]) parDate[k] = [];
    parDate[k].push(e);
  });

  Object.keys(parDate).sort((a, b) => {
    const ia = parDate[a][0]._iso || '9999', ib = parDate[b][0]._iso || '9999';
    return ia.localeCompare(ib);
  }).forEach(date => {
    const groupe = parDate[date];

    const d = document.createElement('div');
    d.style.cssText = 'background:var(--navy);border:1px solid var(--line);' +
      'border-radius:10px;padding:9px 11px;margin-bottom:7px;font-size:13px;line-height:1.6;';

    const bv = groupe.filter(e => e._boite !== 'bea' && e._boite !== 'handicap').length;
    const bea = groupe.filter(e => e._boite === 'bea').length;
    const hand = groupe.filter(e => e._boite === 'handicap').length;
    /* Plusieurs types le même jour : à surveiller pour les véhicules */
    const mixte = [bv, bea, hand].filter(x => x > 0).length > 1;

    if(mixte){
      d.style.background = 'var(--warn-bg)';
      d.style.borderColor = 'var(--red)';
    }

    const h = document.createElement('div');
    h.style.cssText = 'font-weight:700;margin-bottom:3px;';
    /* La clé est une date ISO : on l'affiche en toutes lettres */
    const gNom = groupe[0]._groupe || '';
    const libelle = (dateEnToutesLettres(groupe[0]._iso) || groupe[0]._datePermis || date) +
                    (gNom ? '  ·  ' + gNom : '');
    h.innerHTML = '📅 ' + String(libelle).replace(/</g, '&lt;') + ' — ' + groupe.length + ' élève(s) · ' +
      [bv ? bv + ' BV' : '', bea ? bea + ' BEA' : '', hand ? hand + ' ♿' : '']
        .filter(Boolean).join(' · ') +
      (mixte ? ' ⚠️' : '');
    if(mixte) h.title = "Plusieurs types d'examen le même jour";
    d.appendChild(h);

    groupe.forEach(e => {
      const s = suiviDe(e.eleve);
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;align-items:center;gap:6px;padding:2px 0 2px 8px;';

      const nom = document.createElement('button');
      nom.type = 'button';

      /* La couleur du nom dit l'état de la place, sans avoir à lire
         les émojis. Du plus grave au moins grave : une date donnée
         à une autre auto-école est définitive, une place à remplacer
         se rattrape, une place fantôme n'est qu'en attente. */
      let couleur = 'var(--cream)';
      let pourquoi = 'Ouvrir la fiche de ' + e.eleve;
      if(s.dateADonner === 'oui'){
        couleur = 'var(--red)';
        pourquoi = 'Date à donner à une autre auto-école' +
                   (s.autoEcole ? ' : ' + s.autoEcole : '');
      }else if(s.aRemplacer === 'oui'){
        couleur = '#E8A33D';
        pourquoi = 'Place à remplacer';
      }else if(s.fantome === 'oui'){
        couleur = 'var(--muted)';
        pourquoi = 'Place fantôme';
      }

      nom.style.cssText = 'flex:1;min-width:0;text-align:left;background:none;border:none;' +
        'color:' + couleur + ';font-size:13px;font-family:inherit;padding:2px 0;cursor:pointer;' +
        'text-decoration:underline;text-decoration-color:var(--line);' +
        'text-underline-offset:3px;' +
        (couleur === 'var(--cream)' ? '' : 'font-weight:700;');
      nom.textContent = (e._boite === 'bea' ? '🅰 ' :
                         e._boite === 'handicap' ? '♿ ' : '🅑 ') + e.eleve;
      nom.title = pourquoi + ' — appuie pour ouvrir sa fiche';
      nom.addEventListener('click', () => ouvrirFichePermis(e));
      l.appendChild(nom);

      /* La date de relance, là où on la cherche : à côté du nom */
      if(s.relanceLe){
        const rl = document.createElement('span');
        rl.style.cssText = 'flex-shrink:0;font-size:11px;color:var(--muted);';
        rl.textContent = 'Date de relance : ' + dateCourte(s.relanceLe);
        rl.title = 'Dernière relance de ' + e.eleve;
        l.appendChild(rl);
      }

      /* La note « Autre à prévoir », juste avant les repères */
      const autreTxt = String(s.autre || '').trim();
      if(autreTxt){
        const a = document.createElement('span');
        a.style.cssText = 'flex-shrink:0;font-size:11px;color:var(--accent-text);' +
          'max-width:38%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        a.textContent = '📝 ' + autreTxt;
        a.title = autreTxt;
        l.appendChild(a);
      }

      const rep = document.createElement('span');
      rep.style.cssText = 'flex-shrink:0;font-size:14px;letter-spacing:1px;';
      rep.textContent = emojisPermis(s);
      l.appendChild(rep);

      const etat = document.createElement('span');
      etat.style.cssText = 'flex-shrink:0;font-size:15px;';
      etat.textContent = (s.toutOk === 'oui') ? '✅' : '⚠️';
      etat.title = (s.toutOk === 'oui') ? 'Dossier prêt' : 'Il manque quelque chose';
      l.appendChild(etat);

      /* Le centre d'examen, réglable sans ouvrir la fiche */
      const bC = document.createElement('button');
      bC.className = 'btn btn-secondary';
      bC.style.cssText = 'width:auto;padding:3px 8px;font-size:11px;margin:0;flex-shrink:0;' +
        (s.centre ? '' : 'color:var(--warn-text);border-color:var(--warn-text);');
      bC.textContent = s.centre ? '🏁 ' + s.centre : '🏁';
      bC.title = s.centre ? "Centre d'examen : " + s.centre + ' — appuie pour changer'
                          : "Choisir le centre d'examen de " + e.eleve;
      bC.addEventListener('click', ev => {
        ev.stopPropagation();
        choisirCentreExamen(e.eleve, s.centre);
      });
      l.appendChild(bC);

      /* Affecter l'élève à un groupe : deux inspecteurs le même jour */
      const bG = document.createElement('button');
      bG.className = 'btn btn-secondary';
      bG.style.cssText = 'width:auto;padding:3px 8px;font-size:11px;margin:0;flex-shrink:0;';
      bG.textContent = e._groupe || '👥';
      bG.title = e._groupe ? 'Groupe : ' + e._groupe + ' — appuie pour changer'
                           : 'Mettre ' + e.eleve + ' dans un groupe';
      bG.addEventListener('click', ev => {
        ev.stopPropagation();
        choisirGroupePermis(e.eleve, e._iso, e._groupe);
      });
      l.appendChild(bG);

      d.appendChild(l);
    });

    bloc.appendChild(d);
  });

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);padding:6px 2px 0;line-height:1.5;';
  aide.textContent = "Appuie sur un nom pour ouvrir sa fiche. 🏁 règle le centre d'examen, " +
    "👥 range l'élève dans un groupe : deux inspecteurs le même jour, ou matin et " +
    'après-midi. Les groupes se retrouvent tels quels dans le message Messenger.';
  bloc.appendChild(aide);

  return bloc;
}

/* Ouvre directement la fiche d'un élève depuis le résumé :
   on filtre sur sa date, puis on déplie son volet. */
/* Ouvre la fiche d'un élève dans une fenêtre, sans toucher aux filtres */
function ouvrirFichePermis(e){
  const fond = document.createElement('div');
  fond.className = 'overlay show';

  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 94vw);max-height:90vh;overflow-y:auto;';

  const s = suiviDe(e.eleve);

  const tete = document.createElement('div');
  tete.style.cssText = 'display:flex;align-items:flex-start;gap:10px;margin-bottom:4px;';

  const titre = document.createElement('div');
  titre.style.cssText = 'flex:1;min-width:0;';
  titre.innerHTML = '<h3 style="margin:0;">' +
    (e._boite === 'bea' ? '🅰 ' : e._boite === 'handicap' ? '♿ ' : '🅑 ') +
    e.eleve.replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:13px;color:var(--muted);line-height:1.5;margin-top:2px;">' +
    '📅 ' + (e._datePermis || 'date inconnue') +
    (s.centre ? ' · ' + s.centre.replace(/</g, '&lt;') : '') +
    (s.moniteurDate ? ' · ' + s.moniteurDate.replace(/</g, '&lt;') : '') + '</div>' +
    (emojisPermis(s)
      ? '<div style="font-size:16px;margin-top:4px;letter-spacing:2px;">' +
        emojisPermis(s) + (s.toutOk === 'oui' ? ' ✅' : ' ⚠️') + '</div>'
      : '<div style="font-size:16px;margin-top:4px;">' +
        (s.toutOk === 'oui' ? '✅' : '⚠️') + '</div>');
  tete.appendChild(titre);

  const bX = document.createElement('button');
  bX.className = 'btn btn-secondary';
  bX.style.cssText = 'width:auto;padding:8px 12px;font-size:16px;margin:0;flex-shrink:0;';
  bX.textContent = '✕';
  bX.title = 'Fermer';
  bX.addEventListener('click', () => fermer());
  tete.appendChild(bX);

  boite.appendChild(tete);

  /* La fiche complète, telle qu'elle apparaît dans la liste */
  const fiche = ficheSuiviPermis(e);
  fiche.style.marginTop = '10px';
  boite.appendChild(fiche);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  /* Un appui hors de la fenêtre la referme */
  fond.addEventListener('click', ev => { if(ev.target === fond) fermer(); });

  let ferme = false;
  function fermer(){
    if(ferme) return;
    ferme = true;
    if(fond.parentNode) document.body.removeChild(fond);
    afficherBureau(true);
  }

  /* On referme dès que la fiche est enregistrée */
  const observateur = setInterval(() => {
    if(!fond.parentNode){ clearInterval(observateur); return; }
    const etat = fiche.querySelector('div');
    if(fiche.dataset && fiche.dataset.enregistre === 'oui'){
      clearInterval(observateur);
      setTimeout(fermer, 700);
    }
  }, 400);
}

/* ------------------------------------------------------------
   EXAMEN NON PLANIFIABLE

   Le moniteur l'a signalé depuis le questionnaire : ce n'est pas
   une question de niveau, c'est un dossier qui bloque. L'élève
   n'a donc rien à faire dans « pas le niveau », et il ne doit pas
   non plus disparaître — quelqu'un doit débloquer la situation.
   ------------------------------------------------------------ */
function afficherExamenNonPlanifiable(tous){
  const zone = $('listeNonPlanifiable');
  if(!zone) return;

  const liste = (tous || []).filter(e =>
    typeof examenNonPlanifiable === 'function' && examenNonPlanifiable(e.note));

  zone.innerHTML = '';
  majVolet('cptNonPlanif', liste.length);

  if(!liste.length){
    zone.innerHTML = '<div class="empty">Personne dans ce cas.</div>';
    return;
  }

  liste.forEach(e => {
    const motif = (typeof motifNonPlanifiable === 'function')
      ? motifNonPlanifiable(e.note) : '';

    zone.appendChild(ligneBureau(e, {
      replier: true,
      info: () => '🚫 examen non planifiable' + (motif ? ' — ' + motif : ''),
      resume: () => e.note || '',
      alerte: () => motif || 'Motif non précisé — à voir avec le moniteur',
      actions: (x, boite) => {
        const b = document.createElement('button');
        b.className = 'btn btn-primary';
        b.style.cssText = 'padding:10px;font-size:13px;';
        b.textContent = "✅ C'est débloqué — date d'examen à prévoir";
        b.addEventListener('click', async () => {
          if(!await confirmer("Remettre " + x.eleve +
                              " dans les élèves dont l'examen est à prévoir ?")) return;
          b.disabled = true;
          try{
            /* Une consigne, pas une écriture directe dans la note :
               c'est le chemin que suit déjà tout ce que le bureau
               annonce au moniteur, et elle sera reprise au prochain
               bilan comme les autres. */
            await envoyerConsigne(x.eleve, 'permis',
              "Examen de nouveau planifiable — date à prévoir (bureau)");
            showToast(x.eleve + " : c'est noté");
            redessinerBureau();
          }catch(err){ showToast('Erreur : ' + err.message); b.disabled = false; }
        });
        boite.appendChild(b);
      }
    }));
  });
}

/* Élèves pour qui le repassage n'est pas envisageable pour le moment */
function afficherPasDeRepassage(tous){
  const zone = $('listePasRepassage');
  if(!zone) return;

  const liste = tous.filter(e => {
    const s = suiviDe(e.eleve);
    return s.rdvPostFait === 'oui' && s.suite === 'impossible';
  });

  zone.innerHTML = '';
  if(!liste.length){
    zone.innerHTML = '<div class="empty">Personne dans ce cas.</div>';
    return;
  }

  majVolet('cptPasRep', liste.length);
  liste.forEach(e => {
    const s = suiviDe(e.eleve);
    zone.appendChild(ligneBureau(e, {
      replier: true,
      info: () => mentionAjournements(s.nbAjournements, s.dateAjournement) +
                  ' · ⛔ pas de repassage pour le moment',
      resume: () => s.commentaireMoniteur || '',
      alerte: () => 'Reprise des leçons à suivre',
      actions: (x, boite) => {
        /* Revoir ou compléter le rendez-vous déjà fait */
        const bRev = document.createElement('button');
        bRev.className = 'btn btn-secondary';
        bRev.style.cssText = 'padding:9px;font-size:13px;margin-bottom:8px;';
        bRev.textContent = '↗️ Revoir le rendez-vous post-permis';
        bRev.addEventListener('click', () => {
          const s2 = suiviDe(x.eleve);
          ouvrirRdvPost({ eleve: x.eleve, date: s2.rdvPostDate,
                          moniteur: s2.rdvPostMoniteur, note: '', modele: 'rdv-post' });
        });
        boite.appendChild(bRev);

        const b = document.createElement('button');
        b.className = 'btn btn-primary';
        b.style.cssText = 'padding:10px;font-size:13px;';
        b.textContent = '✅ Le niveau est revenu — remettre en examen à prévoir';
        b.addEventListener('click', async () => {
          if(!await confirmer('Remettre ' + x.eleve +
                              ' dans les élèves prêts au permis ?')) return;
          b.disabled = true;
          try{
            await majSuivi(x.eleve, { suite: '', retireAPrevoir: '' });
            await envoyerConsigne(x.eleve, 'permis',
              "Niveau revenu — date d'examen à prévoir (bureau)");
            showToast(x.eleve + ' est de retour en « à prévoir »');
            redessinerBureau();
          }catch(err){ showToast('Erreur : ' + err.message); b.disabled = false; }
        });
        boite.appendChild(b);
      }
    }));
  });
}

/* Le dernier élève ajouté à la main, pour le retrouver dans la liste */
let eleveAjouteRecemment = '';

/* Amène l'élève qui vient d'être ajouté sous les yeux */
function signalerAjout(zone){
  if(!eleveAjouteRecemment || !zone) return;
  const cible = normaliserMot(eleveAjouteRecemment);
  eleveAjouteRecemment = '';

  setTimeout(() => {
    const lignes = zone.querySelectorAll('.history-item');
    for(let i = 0; i < lignes.length; i++){
      const nom = lignes[i].querySelector('.meta strong');
      if(nom && normaliserMot(nom.textContent) === cible){
        lignes[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
        lignes[i].style.outline = '2px solid var(--orange)';
        lignes[i].style.outlineOffset = '3px';
        setTimeout(() => { lignes[i].style.outline = ''; }, 2500);
        return;
      }
    }
  }, 100);
}



/* ============================================================
   GROUPES D'EXAMEN
   Une même date peut compter deux inspecteurs, ou une session le
   matin et une l'après-midi. Le groupe est enregistré sur la fiche
   de suivi : les listes ET le message Messenger le retrouvent.
   ============================================================ */
function groupesConnus(iso){
  const vus = [];
  (etatBureau.suivi || []).forEach(s => {
    const g = (s.groupePermis || '').trim();
    if(!g || vus.indexOf(g) !== -1) return;
    /* Seulement ceux de la même date, pour ne pas tout mélanger */
    if(iso && dateFrVersIso(s.datePermis || '') !== iso) return;
    vus.push(g);
  });
  return vus.sort((a, b) => a.localeCompare(b, 'fr'));
}

async function choisirGroupePermis(eleve, iso, actuel){
  const connus = groupesConnus(iso);
  const choix = connus.slice();
  if(actuel && choix.indexOf(actuel) === -1) choix.push(actuel);
  choix.push('➕ Nouveau groupe…');
  choix.push('— aucun groupe —');

  const v = await choisirDansListe(
    'Groupe d\'examen de ' + eleve + ' :', choix, actuel || '— aucun groupe —');
  if(!v) return;

  let nom = v;
  if(v === '➕ Nouveau groupe…'){
    const saisi = await demander(
      'Nom du groupe\n\nEx : « Inspecteur A », « Matin », « Chrystel ».\n' +
      'Les élèves du même nom seront regroupés.', '', 'Groupe');
    if(saisi === null) return;
    nom = String(saisi).trim();
  }else if(v === '— aucun groupe —'){
    nom = '';
  }

  try{
    await majSuivi(eleve, { groupePermis: nom });
    showToast(nom ? eleve + ' → ' + nom : eleve + ' retiré de son groupe');
    afficherBureau(true);
  }catch(e){
    showToast('Enregistrement impossible : ' + e.message);
  }
}

/* Une date lisible : 2026-08-05 devient 05/08/2026.
   Les champs « date » du navigateur renvoient l'ISO, illisible ici. */
function dateCourte(v){
  const t = String(v || '').trim();
  if(!t) return '';
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso) return iso[3] + '/' + iso[2] + '/' + iso[1];
  return t;
}

/* ============================================================
   AJOUT MANUEL DANS LES LISTES PERMIS
   Un élève peut être prêt sans qu'aucun moniteur l'ait signalé :
   le bureau doit pouvoir l'ajouter lui-même. L'information part
   en message, donc elle remonte au questionnaire du moniteur.
   ============================================================ */
/* Cet élève a-t-il déjà sa date d'examen ?

   Trois traces possibles : la date dans son suivi, celle lue
   dans ses notes, ou une place dans une session ouverte. */
function dejaPlace(e){
  const s = (typeof suiviDe === 'function') ? suiviDe(e.eleve) : {};

  /* Un permis annulé se replace : la date passée ne compte plus */
  if(e.etat && e.etat.permis === 'annule') return false;

  /* Un rendez-vous post-permis en attente : on attend de savoir
     s'il repasse avant de le considérer placé. */
  if(s.rdvPostDate && s.rdvPostFait !== 'oui') return false;

  if(String(s.datePermis || '').trim()) return true;
  if(e.etat && String(e.etat.permisDate || '').trim()) return true;

  /* Une place dans une session : c'est une date, elle aussi */
  try{
    if(typeof sessionsPermis !== 'undefined' && sessionsPermis.length){
      const dedans = sessionsPermis.some(se =>
        (se.eleves || []).some(p =>
          p.eleve && normaliserMot(p.eleve) === normaliserMot(e.eleve)));
      if(dedans) return true;
    }
  }catch(err){ /* sans les sessions, les dates suffisent */ }

  return false;
}


/* Cet élève a-t-il déjà son permis ?

   Un résultat « obtenu » supprime son suivi : il ne reste que la
   trace dans ses notes et dans les résultats. */
function dejaSonPermis(nom){
  /* Ce que disent ses notes */
  try{
    const liste = (typeof etatBureau !== 'undefined' && etatBureau.eleves)
      ? etatBureau.eleves : [];
    const e = liste.find(x => normaliserMot(x.eleve || '') === normaliserMot(nom));
    if(e && e.etat && e.etat.permis === 'obtenu'){
      return { quand: e.etat.permisDate || '' };
    }
  }catch(err){}

  /* Ce que dit son suivi */
  try{
    const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
    if(String(s.resultat || '').toLowerCase() === 'obtenu'){
      return { quand: s.datePermis || '' };
    }
  }catch(err){}

  return null;
}


/* Les heures qu'il reste à faire avant l'examen.

   Le bureau les note ici ; le moniteur les voit dans les trois
   listes. Sans ce repère, on place un élève qui n'est pas prêt. */
/* Où en est son rendez-vous post-permis.

   Pour un repassage, c'est cette conclusion qui compte : elle
   date d'après l'examen blanc. */
function mentionPostPermis(nom){
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};

  const date = String(s.rdvPostDate || '').trim();
  const fait = (s.rdvPostFait === 'oui');
  const h = String(s.heuresRepassage || '').trim();

  /* Aucun repassage en vue : rien à dire */
  if(!date && !fait && !h) return '';

  if(!fait){
    return date ? '🔁 Post-permis prévu le ' + date
                : '🔁 Post-permis à fixer';
  }

  const suite = (typeof libelleSuite === 'function' && s.suite)
    ? libelleSuite(s.suite) : '';

  return '🔁 Post-permis fait' + (date ? ' le ' + date : '') +
         (h ? ' — ' + h + ' + 3h' : '') +
         (!h && suite ? ' — ' + suite : '');
}


/* Les heures qui font foi.

   Après un repassage, celles du post-permis priment : elles sont
   plus récentes que celles de l'examen blanc. */
function heuresQuiComptent(nom){
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};

  if(s.rdvPostFait === 'oui'){
    const h = String(s.heuresRepassage || '').trim();
    if(h) return { valeur: h, source: 'post-permis' };
  }

  const h2 = String(s.heuresRestantes || '').trim();
  if(h2) return { valeur: h2, source: 'examen blanc' };

  return { valeur: '', source: '' };
}


function mentionHeuresRestantes(nom){
  const r = heuresQuiComptent(nom);

  /* Sans cette information, le bureau ne peut pas placer une
     date : on la réclame plutôt que de laisser un blanc. */
  if(r.valeur === '') return ' · ⏱️ heures à préciser';
  if(r.valeur === '0') return ' · ⏱️ plus que les 3h';

  /* Les 3h avant examen s'ajoutent toujours : « 4 + 3 » */
  return ' · ⏱️ ' + r.valeur + ' + 3h';
}


/* La fenêtre pour les saisir */
/* ============================================================
   REPRENDRE CE QUE DISENT LES NOTES

   L'examen blanc, sa date et les heures sont déjà écrits dans
   les notes des bilans. Les ressaisir un par un dans le suivi
   prend des heures : autant les y verser d'un coup.
   ============================================================ */

async function rattraperExamensBlancs(){
  if(typeof etatBureau === 'undefined' || !etatBureau.eleves){
    showToast('Actualise les listes d\'abord.');
    return;
  }

  /* Ce qu'on peut reprendre, et pour qui */
  const aFaire = [];

  etatBureau.eleves.forEach(e => {
    const s = suiviDe(e.eleve) || {};
    const t = e.etat || {};

    const majs = {};

    /* Le niveau, quand le suivi ne le porte pas encore. Un
       « à venir » se laisse tranquille : l examen n a pas eu lieu. */
    if(!String(s.ebNiveau || '').trim() && t.ebSuite){
      majs.ebNiveau = (t.ebSuite === 'pasleniveau') ? 'non' : 'oui';
    }

    if(!String(s.ebDate || '').trim() && t.ebDate){
      majs.ebDate = t.ebDate;
    }

    /* Les heures : « plus que les 3h » vaut 0, et chaque leçon
       annoncée vaut deux heures. */
    if(!String(s.heuresRestantes || '').trim()){
      if(t.ebSuite === '3h') majs.heuresRestantes = '0';
      else if(t.ebSuite === 'lecons' && t.ebLecons){
        majs.heuresRestantes = String(Number(t.ebLecons) * 2);
      }
    }

    if(Object.keys(majs).length) aFaire.push({ eleve: e.eleve, majs: majs });
  });

  if(!aFaire.length){
    showToast('Rien à reprendre : tout est déjà à jour.');
    return;
  }

  if(!await confirmer(
      'Reprendre ' + aFaire.length + ' élève(s) depuis leurs notes ?\n\n' +
      'Seuls les champs vides seront remplis : ce que le bureau a ' +
      'saisi à la main ne bouge pas.', 'Mettre à jour')) return;

  const z = $('rattrapageEtat');
  if(z){ z.style.display = 'block'; }

  let n = 0;
  for(const x of aFaire){
    try{
      await majSuivi(x.eleve, x.majs);
      n++;
    }catch(e){ /* on continue : un échec ne doit pas tout arrêter */ }

    if(z) z.textContent = n + ' / ' + aFaire.length + '…';
  }

  if(z){
    z.textContent = '✅ ' + n + ' élève(s) mis à jour';
    setTimeout(() => { z.style.display = 'none'; }, 4000);
  }

  showToast('✅ ' + n + ' élève(s) repris');
  redessinerBureau();
  if(typeof afficherSessionsPermis === 'function'){
    try{ afficherSessionsPermis(); }catch(e){}
  }
}


async function saisirHeuresRestantes(nom){
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};

  /* Des cases plutôt qu'une saisie : c'est presque toujours un
     nombre pair de 0 à 10. */
  const choix = await fenetre(
    "Combien d'heures avant l'examen ?\n" +
    'Les 3h avant examen viennent en plus : « 4 » signifie 4 + 3.',
    [{ nom:'Annuler', valeur:'' },
     { nom:'0 — plus que les 3h', valeur:'0' },
     { nom:'2 + 3h', valeur:'2' },
     { nom:'4 + 3h', valeur:'4', principal:true },
     { nom:'6 + 3h', valeur:'6' },
     { nom:'8 + 3h', valeur:'8' },
     { nom:'✏️ Autre', valeur:'autre' }],
    nom);

  if(!choix) return;

  let propre = choix;

  if(choix === 'autre'){
    const v = await demander(
      "Combien d'heures avant l'examen ?\n" +
      'Les 3h avant examen viennent en plus.',
      String(s.heuresRestantes || ''), nom);

    if(v === null) return;
    propre = String(v).trim().replace(',', '.');
  }

  if(propre && isNaN(Number(propre))){
    showToast('Indique un nombre d\'heures.');
    return;
  }

  try{
    await majSuivi(nom, { heuresRestantes: propre });
    showToast(propre === '' ? 'Effacé'
            : propre === '0' ? 'Plus que les 3h ✅'
            : propre + ' + 3h ✅');
    redessinerBureau();
  }catch(e){ showToast('Impossible : ' + e.message); }
}


/* Le bouton qui ouvre la saisie des heures restantes */
/* Où en est son examen blanc.

   Le bureau donne les dates : savoir si l'élève a le niveau, et
   depuis quand, change tout. */
function mentionExamenBlanc(x){
  const s = (typeof suiviDe === 'function') ? suiviDe(x.eleve) : {};

  /* Un repassage : le post-permis remplace l'examen blanc, qui
     date d'avant et n'apprend plus rien. */
  const post = mentionPostPermis(x.eleve);
  if(post) return ' · ' + post;

  /* Ce que le bureau a noté à la main prime sur les notes des
     bilans : il sait ce qu'il a saisi. */
  if(String(s.ebNiveau || '').trim()){
    const nom = { oui:'✅ A le niveau', non:'⛔ Pas le niveau',
                  peut:'🤔 Pourrait avoir le niveau',
                  avenir:'📅 Examen blanc à venir' }[s.ebNiveau] || s.ebNiveau;

    /* « À venir » se lit « le 12 septembre », pas « (12 septembre) » */
    if(s.ebNiveau === 'avenir'){
      return ' · ' + nom + (s.ebDate ? ' le ' + s.ebDate : '');
    }

    return ' · ' + nom + (s.ebDate ? ' (' + s.ebDate + ')' : '');
  }

  const e = x.etat || {};

  /* Les lignes d'info sont posées en texte, pas en HTML : une
     balise y ressortirait telle quelle. */
  if(e.examBlanc !== 'passe'){
    return " · 📝 pas encore d'examen blanc";
  }

  const suite = {
    'pasleniveau': '⛔ Pas le niveau',
    '3h': '✅ A le niveau',
    'lecons': '⏳ Encore ' + (e.ebLecons || '?') + ' leçon(s)'
  }[e.ebSuite] || '📝 Examen blanc passé';

  return ' · ' + suite + (e.ebDate ? ' (' + e.ebDate + ')' : '');
}


/* La saisie du bureau, quand il sait mieux que les notes */
async function saisirExamenBlanc(nom){
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};

  const quoi = await fenetre(
    "Où en est l'examen blanc de " + nom + ' ?',
    [{ nom: 'Annuler', valeur: '' },
     /* Un examen blanc posé mais pas encore passé : le bureau
        voit la date sans avoir à inventer un résultat. */
     { nom: '📅 À venir', valeur: 'avenir' },
     { nom: '⛔ Pas le niveau', valeur: 'non' },
     { nom: '🤔 Pourrait', valeur: 'peut' },
     { nom: '✅ A le niveau', valeur: 'oui', principal: true }],
    'Examen blanc');

  if(!quoi) return;

  const iso = await choisirDate(
    (quoi === 'avenir' ? "Date de l'examen blanc — " : 'Date du passage — ') + nom);

  /* La date n'est pas obligatoire, sauf pour un examen à venir :
     sans elle, « à venir » n'apprendrait rien. */
  if(quoi === 'avenir' && !iso){
    showToast('Indique la date de son examen blanc.');
    return;
  }

  const date = iso ? dateEnToutesLettres(iso) : (s.ebDate || '');

  try{
    await majSuivi(nom, { ebNiveau: quoi, ebDate: (date || '').trim() });
    showToast('Enregistré ✅');

    /* Les sessions affichent la même information : sans ce
       rafraîchissement, la ligne gardait l'ancienne mention. */
    redessinerBureau();
    if(typeof afficherSessionsPermis === 'function'){
      try{ afficherSessionsPermis(); }catch(e){}
    }
  }catch(e){ showToast('Impossible : ' + e.message); }
}


/* Le menu qui demande ce qu'on renseigne.

   Un repassage a deux sources : l'examen blanc, ancien, et le
   post-permis, plus récent. Le bureau doit savoir laquelle il
   touche. */
async function saisirNiveauEleve(nom){
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
  const repassage = !!(s.rdvPostDate || s.rdvPostFait === 'oui' ||
                       s.heuresRepassage);

  const quoi = await fenetre(
    'Que veux-tu renseigner pour ' + nom + ' ?' +
    (repassage ? '\n\nC\'est un repassage : le post-permis fait foi.' : ''),
    [{ nom: 'Annuler', valeur: '' },
     { nom: '📝 Examen blanc', valeur: 'eb', principal: !repassage },
     { nom: '🔁 Post-permis', valeur: 'post', principal: repassage }],
    'Que renseigner ?');

  if(!quoi) return;
  if(quoi === 'eb') return saisirExamenBlanc(nom);
  return saisirPostPermis(nom);
}


/* Ce que le bureau sait du rendez-vous post-permis */
async function saisirPostPermis(nom){
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};

  const date = await demander(
    'Date du rendez-vous post-permis\n' +
    'Laisse vide s\'il n\'est pas encore fixé.',
    s.rdvPostDate || '', nom);
  if(date === null) return;

  const fait = await fenetre(
    'Le rendez-vous a-t-il eu lieu ?',
    [{ nom: 'Pas encore', valeur: 'non' },
     { nom: '✅ Oui, il est fait', valeur: 'oui', principal: true }],
    nom);
  if(!fait) return;

  const majs = {
    rdvPostDate: String(date || '').trim(),
    rdvPostFait: (fait === 'oui') ? 'oui' : ''
  };

  /* Les heures ne se décident qu'une fois le rendez-vous fait */
  if(fait === 'oui'){
    const h = await demander(
      "Combien d'heures avant le repassage ?\n" +
      'Les 3h avant examen viennent en plus : « 4 » signifie 4 + 3.\n' +
      'Mets 0 s\'il ne reste que les 3h.',
      s.heuresRepassage || '', nom);

    if(h !== null){
      const propre = String(h).trim().replace(',', '.');
      if(propre && isNaN(Number(propre))){
        showToast('Indique un nombre d\'heures.');
        return;
      }
      majs.heuresRepassage = propre;
    }
  }

  try{
    await majSuivi(nom, majs);
    showToast('Enregistré ✅');
    redessinerBureau();
    if(typeof afficherSessionsPermis === 'function'){
      try{ afficherSessionsPermis(); }catch(e){}
    }
  }catch(e){ showToast('Impossible : ' + e.message); }
}


function boutonExamenBlanc(nom){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;';
  b.textContent = '📝 Niveau';
  b.title = "Examen blanc ou rendez-vous post-permis";
  b.addEventListener('click', () => saisirNiveauEleve(nom));
  return b;
}


/* ============================================================
   ENVOYER UN ÉLÈVE VERS UNE AUTRE LISTE

   Retirer de tout détruisait sa ligne de suivi — date, heures,
   examen blanc, paiements. Le déplacer conserve tout : on ne
   change que sa place dans le parcours.
   ============================================================ */

/* ------------------------------------------------------------
   OÙ ENVOYER UN ÉLÈVE

   UNE LISTE-CIBLE DOIT EFFACER CE QUI LE RETENAIT AILLEURS.

   Chrystel : « dans "examen passé, résultat à saisir", j'ai des
   élèves qui n'ont pas passé leur permis. J'ai bien le bouton pour
   les envoyer dans une autre liste, mais ça ne change rien : elle
   reste ici alors qu'elle ne devrait pas. »

   Elle a raison. Cette liste-là ne regarde ni `aPlanifier` ni
   `retireAPrevoir` — les seuls champs que les cibles touchaient.
   Elle se reconnaît à DEUX choses : une date d'examen passée, et
   pas de résultat. Tant que la date reste, l'élève reste, quelle
   que soit la liste qu'on lui a choisie.

   Or aucune de ces cinq destinations ne décrit un élève convoqué :
   toutes effacent donc la date. C'est déjà ce que fait
   l'ajournement, et c'est la convention du module — `datePermis`
   dit « convoqué à cette date », pas « y est allé ce jour-là ».

   Et la date vit à deux endroits : la fiche de suivi ET la note du
   dernier cours, que le bureau ne peut pas réécrire. D'où
   `neutralise` : une consigne qui annonce que l'examen est de
   nouveau à prévoir, et qui prime sur l'annonce précédente
   puisque c'est la DERNIÈRE qui fait foi. Sans elle, l'élève
   quittait la fiche de suivi sans quitter la liste.
   ------------------------------------------------------------ */
const LISTES_PERMIS = [
  { cle:'envisager', nom:'🤔 Élèves prêts au permis',
     champs:{ aPlanifier:'', retireAPrevoir:'', statut:'', datePermis:'' },
     neutralise:true,
     note:'Examen blanc passé le {jour} — plus que les 3h avant examen (bureau)' },

  { cle:'rdv',       nom:'🗓️ Liste RDV Permis',
     champs:{ aPlanifier:'oui', retireAPrevoir:'', statut:'', datePermis:'' },
     neutralise:true },

  { cle:'pasret',    nom:'⛔ Pas le niveau',
     champs:{ ebNiveau:'non', aPlanifier:'', retireAPrevoir:'', datePermis:'' },
     neutralise:true,
     note:'Examen blanc passé le {jour} — pas le niveau (bureau)' },

  /* Cette liste-là ne se reconnaît PAS aux mêmes champs que les
     autres : elle demande « resultat === ajourne ». Sans lui,
     l'élève quittait sa liste sans arriver dans celle-ci — la
     panne corrigée en v764 sur la case d'à côté, restée entière
     ici parce que je n'avais regardé que celle dont Chrystel se
     plaignait. */
  { cle:'attente',   nom:'⏳ Attente bilan post-permis',
     champs:{ resultat:'ajourne', rdvPostFait:'', aPlanifier:'',
              retireAPrevoir:'', datePermis:'' },
     neutralise:true },

  { cle:'pause',     nom:'⛔ Ne plus suivre pour le moment',
     champs:{ retireAPrevoir:'oui', aPlanifier:'', datePermis:'' },
     neutralise:true }
];

/* La phrase qui défait une convocation. C'est la dernière annonce
   de la note qui fait foi (voir analyserNote) : celle-ci remplace
   donc « Examen du permis fixé au … » sans avoir à la retrouver. */
const CONSIGNE_EXAMEN_A_REPRENDRE = "Date d'examen à prévoir (bureau)";


async function envoyerVersListe(nom){
  const quoi = await fenetre(
    'Où envoyer ' + nom + ' ?\n\n' +
    'Sa fiche est conservée : date, heures, examen blanc, paiements.',
    [{ nom:'Annuler', valeur:'' }].concat(
      LISTES_PERMIS.map((l, i) => ({
        nom: l.nom, valeur: l.cle, principal: (i === 0)
      }))),
    'Changer de liste');

  if(!quoi) return;

  const cible = LISTES_PERMIS.find(l => l.cle === quoi);
  if(!cible) return;

  try{
    await majSuivi(nom, cible.champs);

    /* Certaines listes se reconnaissent aux notes, pas au suivi :
       sans la phrase attendue, l'élève quittait sa liste sans
       arriver dans la nouvelle. */
    if(cible.note && typeof envoyerConsigne === 'function'){
      const jour = dateEnToutesLettres(todayLocal()) || todayLocal();
      await envoyerConsigne(nom, 'examblanc',
                            cible.note.replace('{jour}', jour));
    }

    /* Et la convocation elle-même : effacée du suivi ci-dessus,
       elle vit encore dans la note du dernier cours. */
    if(cible.neutralise && typeof envoyerConsigne === 'function'){
      try{
        await envoyerConsigne(nom, 'permis', CONSIGNE_EXAMEN_A_REPRENDRE);
      }catch(err){ /* la liste change quand même */ }
    }

    viderCaches(nom);

    showToast(nom + ' → ' + cible.nom.replace(/^[^ ]+ /, '') + ' ✅');
    redessinerBureau();
  }catch(e){ showToast('Impossible : ' + e.message); }
}


/* Le point à refaire lors d'une leçon.

   Il vient du rendez-vous post-permis conclu par « une leçon de
   2h », ou de la main du bureau. */
function mentionFairePoint(nom){
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
  if(s.fairePoint !== 'oui') return '';

  const d = String(s.fairePointLe || '').trim();
  return '❓ Faire le point à la leçon' + (d ? ' du ' + d : '');
}


async function saisirFairePoint(nom){
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};

  if(s.fairePoint === 'oui'){
    if(!await confirmer('Le point a-t-il été fait pour ' + nom + ' ?\n\n' +
        "La mention disparaîtra de sa ligne.", 'Point fait')) return;

    await majSuivi(nom, { fairePoint: '', fairePointLe: '' });

    /* La consigne n'a plus d'objet */
    try{
      const e = (typeof etatBureau !== 'undefined' && etatBureau.eleves)
        ? etatBureau.eleves.find(x => normaliserMot(x.eleve) === normaliserMot(nom))
        : null;

      for(const cs of ((e && e.enAttente) || [])){
        if(!/faire le point/i.test(cs.texte || '')) continue;
        try{ await appelPrep({ action:'consigneDone', id: cs.id }); }catch(err){}
      }
    }catch(err){}

    showToast('Point fait ✅');
    redessinerBureau();
    if(typeof afficherSessionsPermis === 'function'){
      try{ afficherSessionsPermis(); }catch(e){}
    }
    return;
  }

  const iso = await choisirDate('Leçon où faire le point — ' + nom);
  if(!iso) return;

  try{
    const quand = dateEnToutesLettres(iso);

    await majSuivi(nom, { fairePoint: 'oui', fairePointLe: quand });

    /* Le moniteur ne voit pas le suivi : la consigne, si. Sans
       elle, il découvrait la demande après son cours. */
    if(typeof envoyerConsigne === 'function'){
      try{
        await envoyerConsigne(nom, 'point',
          '❓ Faire le point à la leçon du ' + quand + ' (bureau)');
      }catch(e){}
    }

    showToast('Noté ✅');
    redessinerBureau();
    if(typeof afficherSessionsPermis === 'function'){
      try{ afficherSessionsPermis(); }catch(e){}
    }
  }catch(e){ showToast('Impossible : ' + e.message); }
}


function boutonEnvoyerVers(nom){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;';
  b.textContent = '➡️ Envoyer vers…';
  b.title = 'Changer de liste sans rien perdre';
  b.addEventListener('click', () => envoyerVersListe(nom));
  return b;
}


function boutonHeuresRestantes(nom){
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
  const h = String(s.heuresRestantes || '').trim();

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;' +
    (h === ''
      /* Manquant : on le signale, c'est ce qui bloque le bureau */
      ? 'color:var(--warn-text);border-color:var(--warn-text);'
      : 'color:var(--accent-text);border-color:var(--accent-text);');

  b.textContent = (h === '') ? '⏱️ Heures à préciser'
                : (h === '0') ? '⏱️ Plus que les 3h'
                : '⏱️ ' + h + ' + 3h';

  b.addEventListener('click', () => saisirHeuresRestantes(nom));
  return b;
}


function boutonAjoutManuel(zone, mode){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-bottom:10px;padding:11px;font-size:13px;';
  b.textContent = (mode === 'prevu')
    ? '➕ Ajouter un élève avec sa date de permis'
    : '➕ Ajouter un élève prêt au permis';
  b.addEventListener('click', () => ajouterManuellementAuPermis(mode));
  zone.appendChild(b);
  return b;
}

async function ajouterManuellementAuPermis(mode){
  /* Le sélecteur dit si l'élève existe ou s'il va être créé */
  const eleve = await choisirEleveConnu(
    mode === 'prevu' ? 'Ajouter un élève avec sa date de permis'
                     : 'Ajouter un élève prêt au permis',
    'Commence à taper : les élèves connus sont proposés.');
  if(!eleve) return;

  /* Un élève qui a déjà son permis n'a rien à faire dans ces
     listes : l'y remettre fausse le suivi et lui prendrait une
     place d'examen. */
  const obstacle = dejaSonPermis(eleve);
  if(obstacle){
    await informer(eleve + ' a déjà obtenu son permis' +
      (obstacle.quand ? ' le ' + obstacle.quand : '') + '.\n\n' +
      "Il ne peut pas rejoindre cette liste. S'il s'agit d'une " +
      'erreur, annule son résultat depuis le journal.',
      'Permis déjà obtenu');
    return;
  }

  /* Une date d'examen se prend sur une place ouverte, plus dans un
     calendrier : c'est la même porte que le dossier et la liste
     RDV Permis. */
  let place = null;
  if(mode === 'prevu'){
    if(typeof choisirPlaceExamen !== 'function'){
      showToast("Les sessions d'examen ne sont pas disponibles ici.");
      return;
    }
    place = await choisirPlaceExamen(eleve, (suiviDe(eleve) || {}).semaine);
    if(!place) return;
  }

  try{
    if(mode === 'prevu'){
      await placerEleveSurPlace(eleve, place);
      /* On garde ce que cette liste faisait en propre. */
      await majSuivi(eleve, { retireAPrevoir: '' });
      showToast(eleve + ' → permis le ' + dateCourte(place.date) + ' ✅');
    }else{
      await envoyerConsigne(eleve, 'permis', "Date d'examen à prévoir (bureau)");
      await majSuivi(eleve, { retireAPrevoir: '', aPlanifier: '' });
      showToast(eleve + ' → prêt au permis ✅');
    }
    viderCaches(eleve);
    await afficherBureau(true);
  }catch(e){
    await informer('Enregistrement impossible : ' + e.message);
  }
}

/* ============================================================
   CENTRE D'EXAMEN, RÉGLABLE DEPUIS LA LISTE
   Ouvrir la fiche pour un seul champ est fastidieux quand on
   répartit vingt candidats entre deux centres.
   ============================================================ */
const CENTRES_EXAMEN = ['Saint-Brieuc', 'Loudéac'];

async function choisirCentreExamen(eleve, actuel){
  /* Les centres déjà utilisés, en plus des deux habituels */
  const vus = [];
  (etatBureau.suivi || []).forEach(s => {
    const x = (s.centre || '').trim();
    if(x && CENTRES_EXAMEN.indexOf(x) === -1 && vus.indexOf(x) === -1) vus.push(x);
  });

  const choix = CENTRES_EXAMEN.concat(vus);
  choix.push('➕ Autre centre…');
  choix.push('— non défini —');

  const v = await choisirDansListe('Centre d\'examen de ' + eleve + ' :',
                                   choix, actuel || '— non défini —');
  if(!v) return;

  let nom = v;
  if(v === '➕ Autre centre…'){
    const saisi = await demander('Nom du centre d\'examen :', '', 'Centre');
    if(saisi === null) return;
    nom = String(saisi).trim();
  }else if(v === '— non défini —'){
    nom = '';
  }

  try{
    await majSuivi(eleve, { centre: nom });
    showToast(nom ? eleve + ' → ' + nom : eleve + ' : centre effacé');
    afficherBureau(true);
  }catch(e){
    showToast('Enregistrement impossible : ' + e.message);
  }
}

/* Le libellé d'une semaine a gagné son numéro (« · S36 ») en v270.
   Les valeurs enregistrées avant ne le portent pas : on compare
   sans lui, pour ne pas se retrouver avec deux entrées. */
function memeSemaine(a, b){
  const sansNum = x => String(x || '').replace(/\s*·\s*S\d+(–S\d+)?/g, '').trim();
  return sansNum(a) === sansNum(b);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-permis-listes.js'] = true;
