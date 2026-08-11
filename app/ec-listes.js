/* Déployé le 11/08/2026 à 14:33 — v368 */
/* ============================================================
   ec-listes.js
   Simulateurs nuit et risques, examens blancs, pas le niveau.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

function afficherExamensBlancs(tous){
  const zEB = $('listeExamBlanc');
  if(!zEB) return;

  /* Réservé = date posée : il sort de la liste des choses à faire. */
  const eb = tous.filter(e => e.etat.examBlanc === 'aprevoir' &&
                              e.etat.ebSuite !== 'pasleniveau');
  eb.sort((a, b) => (a.etat.examBlancN === null ? 99 : a.etat.examBlancN) -
                    (b.etat.examBlancN === null ? 99 : b.etat.examBlancN));
  zEB.innerHTML = '';
  if(!eb.length){
    zEB.innerHTML = '<div class="empty">Aucun examen blanc à prévoir.<br>' +
      '<span style="font-size:12px;">Ceux qui sont réservés n\'apparaissent plus ici.</span></div>';
  }else{
    if(typeof signalerAjout === 'function') signalerAjout(zEB);
    majVolet('cptEB', eb.length);
  eb.forEach(e => {
      zEB.appendChild(ligneBureau(e, {
        replier: true,
        info: x => {
          const n = x.etat.examBlancN;
          const etat = (x.etat.examBlanc === 'reserve') ? 'Réservé' : 'À prévoir';
          if(n === null) return etat + ' — nombre de leçons non précisé';
          if(n === 0) return etat + ' — dès la prochaine leçon';
          return etat + ' — dans ' + n + ' leçon' + (n > 1 ? 's' : '');
        },
        alerte: x => {
          const s = suiviDe(x.eleve);
          if(s.ebDatePrevue && !s.ebMoniteur) return 'Moniteur à désigner';
          if(!s.ebMessage) return 'Message Messenger à envoyer';
          return (x.etat.examBlancN !== null && x.etat.examBlancN <= 1)
                 ? "Plus qu'une leçon avant l'examen blanc" : null;
        },
        actions: (x, zone) => {
          const s = suiviDe(x.eleve);

          /* Suivi de l'envoi du message à l'élève */
          const lab = document.createElement('label');
          lab.style.cssText = 'display:flex;align-items:center;gap:10px;text-transform:none;' +
            'font-size:15px;color:var(--cream);margin:0 0 10px;';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = (s.ebMessage === 'oui');
          cb.style.cssText = 'width:19px;height:19px;flex-shrink:0;';
          cb.addEventListener('change', async () => {
            cb.disabled = true;
            try{
              await majSuivi(x.eleve, { ebMessage: cb.checked ? 'oui' : '' });
              showToast(cb.checked ? 'Message noté comme envoyé ✅' : 'Message à renvoyer');
              afficherBureau(true);
            }catch(err){ showToast('Erreur : ' + err.message); cb.checked = !cb.checked; }
            cb.disabled = false;
          });
          lab.appendChild(cb);
          lab.appendChild(document.createTextNode('💬 Message Messenger envoyé à l\'élève'));
          zone.appendChild(lab);

          /* Date de l'examen blanc */
          if(!s.ebDatePrevue){
            zone.appendChild(boutonDate('📅 Fixer la date', async iso => {
              await majSuivi(x.eleve, { ebDatePrevue: iso });
              await envoyerConsigne(x.eleve, 'examblanc',
                'Examen blanc fixé au ' + dateEnToutesLettres(iso) + ' (bureau)');
              showToast('Date transmise ✅');
              afficherBureau();
            }));
          }else{
            zone.appendChild(blocExamenBlancMoniteur(x, s));
          }
        }
      }));
    });
  }
}


/* Simulateurs nuit et risques */
function afficherSimulateurs(tous){
  const zSim = $('listeSimu');
  if(!zSim) return;

  /* Une date fixée, c'est une affaire réglée : la liste ne sert
     qu'à ce qui reste à programmer. */
  const sim = tous.filter(e => e.etat.simuNuit === 'aprevoir');
  zSim.innerHTML = '';
  if(!sim.length){
    zSim.innerHTML = '<div class="empty">Aucun simulateur nuit et risques à prévoir.<br>' +
      '<span style="font-size:12px;">Ceux dont la date est fixée n\'apparaissent plus ici.</span></div>';
  }else{
    if(typeof signalerAjout === 'function') signalerAjout(zSim);
    majVolet('cptSimu', sim.length);
  sim.forEach(e => {
      zSim.appendChild(ligneBureau(e, {
        info: x => (x.etat.simuNuit === 'prevu' ? 'Déjà prévu' : 'À prévoir') +
                   (x.etat.examBlanc === 'reserve'
                     ? ' — examen blanc réservé' +
                       (x.etat.examBlancN !== null ? ' dans ' + x.etat.examBlancN + ' leçon(s)' : '')
                     : ''),
        /* Le simulateur doit être fait avant l'examen blanc */
        alerte: x => (x.etat.simuNuit === 'aprevoir' && x.etat.examBlanc === 'reserve' &&
                      x.etat.examBlancN !== null && x.etat.examBlancN <= 1)
                     ? 'Examen blanc imminent et simulateur non fait' : null,
        actions: (x, zone) => {
          zone.appendChild(boutonDate('📅 Fixer la date', async iso => {
            await envoyerConsigne(x.eleve, 'simu',
              'Simulateur nuit et risques fixé au ' + dateEnToutesLettres(iso) + ' (bureau)');
            showToast('Date transmise ✅');
            afficherBureau();
          }));
        }
      }));
    });
  }
}


/* Liste RDV PERMIS : élèves à placer sur une date */
function afficherPasNiveau(tous){
  const zone = $('listePasNiveau');
  if(!zone) return;

  const liste = tous.filter(e => e.etat.ebSuite === 'pasleniveau');
  zone.innerHTML = '';
  if(!liste.length){
    zone.innerHTML = '<div class="empty">Personne dans ce cas.</div>';
    return;
  }

  majVolet('cptPasNiveau', liste.length, liste.length > 0);
  liste.forEach(e => {
    zone.appendChild(ligneBureau(e, {
      info: x => 'Examen blanc du ' + (x.etat.ebDate || '?') + ' — pas le niveau',
      resume: x => resumeSuivi(x.eleve),
      alerte: () => 'À replacer ou heures à fixer',
      actions: (x, zone2) => {
        const r = document.createElement('div');
        r.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

        const bEB = document.createElement('button');
        bEB.className = 'btn btn-primary';
        bEB.style.cssText = 'width:auto;padding:10px 13px;font-size:13px;';
        bEB.textContent = '📝 Replacer un examen blanc';
        bEB.addEventListener('click', async () => {
          const n = await demander('Nouvel examen blanc dans combien de leçons ?\n' +
                           '(laisse vide si non déterminé)');
          if(n === null) return;
          const v = String(n).trim();
          bEB.disabled = true;
          try{
            await envoyerConsigne(x.eleve, 'examblanc',
              'Nouvel examen blanc à prévoir' +
              (v ? ' dans ' + v + ' leçon' + (parseInt(v, 10) > 1 ? 's' : '') : '') + ' (bureau)');
            showToast('Transmis au moniteur ✅');
            afficherBureau();
          }catch(err){ showToast('Erreur : ' + err.message); bEB.disabled = false; }
        });
        r.appendChild(bEB);

        const bH = document.createElement('button');
        bH.className = 'btn btn-secondary';
        bH.style.cssText = 'width:auto;padding:10px 13px;font-size:13px;';
        bH.textContent = '⏱️ Fixer un nombre d\'heures';
        bH.addEventListener('click', async () => {
          const n = await demander('Combien d\'heures de conduite avant de reparler d\'examen ?');
          if(n === null) return;
          const v = String(n).trim();
          if(!v) return;
          bH.disabled = true;
          try{
            await envoyerConsigne(x.eleve, 'examblanc',
              v + 'h de conduite à prévoir avant de reparler d\'examen (bureau)');
            showToast('Transmis au moniteur ✅');
            afficherBureau();
          }catch(err){ showToast('Erreur : ' + err.message); bH.disabled = false; }
        });
        r.appendChild(bH);

        zone2.appendChild(r);
      }
    }));
  });
}

/* Construit une ligne d'élève avec ses actions */
function blocExamenBlancMoniteur(x, s){
  const d = document.createElement('div');
  d.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
    'padding:10px 12px;margin-top:4px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:8px;';
  t.textContent = '📅 Examen blanc le ' + dateEnToutesLettres(s.ebDatePrevue) +
                  (s.ebMoniteur ? ' · ' + s.ebMoniteur : '');
  d.appendChild(t);

  if(s.ebMoniteur){
    const ok = document.createElement('div');
    ok.style.cssText = 'font-size:13px;color:var(--accent-text);line-height:1.6;';
    ok.innerHTML = '✅ Fiche préparée pour ' + s.ebMoniteur.replace(/</g,'&lt;') + '<br>' +
      (s.datePermis
        ? '📅 Examen du permis le ' + s.datePermis
        : '⏳ Examen du permis à prévoir — il est dans la liste');
    d.appendChild(ok);
  }else{
    const sel = document.createElement('select');
    sel.style.marginBottom = '8px';
    sel.innerHTML = '<option value="">— moniteur qui le fait passer —</option>';
    moniteursActifs.forEach(n => {
      const o = document.createElement('option');
      o.value = n; o.textContent = n;
      sel.appendChild(o);
    });
    d.appendChild(sel);

    /* L'examen du permis : déjà daté, ou à prévoir ? Le moniteur
       doit le savoir, sa fiche d'examen blanc en dépend. */
    const lp = document.createElement('label');
    lp.textContent = "Examen du permis de l'élève";
    d.appendChild(lp);

    const selP = document.createElement('select');
    selP.style.marginBottom = '8px';
    selP.innerHTML =
      '<option value="">— à renseigner —</option>' +
      '<option value="aprevoir">⏳ Pas encore de date — à prévoir</option>' +
      '<option value="prevu">📅 Il a déjà sa date</option>';
    if(x.etat.permis === 'prevu') selP.value = 'prevu';
    else if(x.etat.permis === 'aprevoir') selP.value = 'aprevoir';
    d.appendChild(selP);

    const dateP = document.createElement('input');
    dateP.type = 'date';
    dateP.style.cssText = 'display:none;margin-bottom:8px;';
    if(s.datePermis) dateP.value = dateFrVersIso(s.datePermis) || '';
    d.appendChild(dateP);

    const majP = () => { dateP.style.display = (selP.value === 'prevu') ? 'block' : 'none'; };
    selP.addEventListener('change', majP);
    setTimeout(majP, 0);

    const b = document.createElement('button');
    b.className = 'btn btn-primary';
    b.style.cssText = 'padding:10px;font-size:13px;';
    b.textContent = '📝 Attribuer et préparer la fiche';
    b.addEventListener('click', async () => {
      if(!sel.value){ showToast('Choisis un moniteur.'); return; }
      if(!selP.value){ showToast("Indique où en est l'examen du permis."); return; }
      if(selP.value === 'prevu' && !dateP.value){ showToast("Saisis la date d'examen."); return; }

      b.disabled = true;
      b.textContent = 'Préparation…';
      try{
        const maj = { ebMoniteur: sel.value };
        let ligneExamen;

        if(selP.value === 'prevu'){
          const jour = dateEnToutesLettres(dateP.value);
          maj.datePermis = jour;
          maj.aPlanifier = '';
          maj.retireAPrevoir = '';
          ligneExamen = '📅 Examen du permis prévu le ' + jour;
          await envoyerConsigne(x.eleve, 'permis',
            'Examen du permis fixé au ' + jour + ' (bureau)');
        }else{
          /* Il rejoint la liste des examens à prévoir */
          maj.datePermis = '';
          maj.retireAPrevoir = '';
          ligneExamen = "⏳ Examen du permis : date à prévoir";
          await envoyerConsigne(x.eleve, 'permis',
            "Date d'examen à prévoir (bureau)");
        }

        await majSuivi(x.eleve, maj);

        await appelPrep({
          action: 'prepAdd',
          date: s.ebDatePrevue,
          eleve: x.eleve,
          modele: 'examen-blanc',
          modeleLabel: 'Examen blanc',
          site: '',
          note: "📝 EXAMEN BLANC · fiche à remplir pendant l'épreuve\n" + ligneExamen,
          contexte: JSON.stringify({
            examenBlanc: true,
            eleve: x.eleve,
            /* Pré-remplit le questionnaire du moniteur */
            examPermis: (selP.value === 'prevu') ? 'prevu' : 'aprevoir',
            examPermisDate: (selP.value === 'prevu') ? dateEnToutesLettres(dateP.value) : '',
            examBlanc: 'reserve',
            examBlancDate: dateEnToutesLettres(s.ebDatePrevue)
          }),
          moniteur: sel.value
        });
        await envoyerConsigne(x.eleve, 'examblanc',
          'Examen blanc le ' + dateEnToutesLettres(s.ebDatePrevue) +
          ' avec ' + sel.value + ' (bureau)');

        showToast('Fiche préparée pour ' + sel.value + ' ✅');
        afficherBureau();
      }catch(err){
        showToast('Erreur : ' + err.message);
        b.disabled = false;
        b.textContent = '📝 Attribuer et préparer la fiche';
      }
    });
    d.appendChild(b);
  }

  /* Annuler la date */
  const a = document.createElement('button');
  a.className = 'btn btn-secondary';
  a.style.cssText = 'margin-top:8px;padding:8px;font-size:12px;color:var(--red);border-color:var(--red);';
  a.textContent = '✕ Annuler cette date';
  a.addEventListener('click', async () => {
    if(!await confirmer("Annuler la date d'examen blanc de " + x.eleve + ' ?')) return;
    a.disabled = true;
    try{
      await majSuivi(x.eleve, { ebDatePrevue: '', ebMoniteur: '' });
      afficherBureau();
    }catch(err){ showToast('Erreur : ' + err.message); a.disabled = false; }
  });
  d.appendChild(a);

  return d;
}

/* Repères d'un dossier, en un coup d'œil */

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-listes.js'] = true;
