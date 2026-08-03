/* ============================================================
   ec-postpermis.js
   Après l'examen : résultat, repassage, rendez-vous post-permis.
   Calendrier de prise des dates et disponibilités des élèves.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   SUITE À DONNER APRÈS UN RENDEZ-VOUS POST-PERMIS
   ============================================================ */
const SUITES_POST = [
  { cle:'3h',         nom:'➕ 3h avant repassage' },
  { cle:'2h',         nom:'🚗 Une leçon de 2h pour refaire le point' },
  { cle:'impossible', nom:'⛔ Pas de repassage possible pour le moment' }
];

function libelleSuite(cle){
  const s = SUITES_POST.find(x => x.cle === cle);
  return s ? s.nom : '';
}

/* Mention du repassage, telle qu'elle apparaît dans les notes */
function mentionAjournements(n, date){
  const v = parseInt(n, 10);
  if(!v) return '';
  return '🔁 ' + v + (v === 1 ? 'er' : 'e') + ' repassage' +
         (date ? ' (ajourné le ' + dateEnToutesLettres(date) + ')' : '');
}


/* ============================================================
   1. EXAMENS PASSÉS — résultat à saisir
   Le lendemain de la date, l'élève attend son résultat.
   ============================================================ */
async function afficherPostExamen(tous){
  const zone = $('listePostExamen');
  if(!zone) return;
  const auj = todayLocal();

  const attente = tous.filter(e => {
    const s = suiviDe(e.eleve);
    if(s.resultat) return false;
    const iso = e._iso || dateFrVersIso(s.datePermis || '');
    return iso && iso < auj;
  });

  zone.innerHTML = '';
  if(!attente.length){
    zone.innerHTML = '<div class="empty">Aucun résultat en attente.</div>';
    return;
  }

  attente.forEach(e => {
    const s = suiviDe(e.eleve);
    const iso = e._iso || dateFrVersIso(s.datePermis || '');
    zone.appendChild(ligneBureau(e, {
      info: x => 'Examen passé le ' + (x._datePermis || s.datePermis || iso) +
                 (s.nbAjournements
                   ? ' · ' + mentionAjournements(s.nbAjournements, s.dateAjournement) : ''),
      resume: () => '',
      alerte: () => 'Résultat à saisir',
      actions: (x, boite) => {
        const r = document.createElement('div');
        r.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

        const bOk = document.createElement('button');
        bOk.className = 'btn btn-primary';
        bOk.style.cssText = 'width:auto;padding:10px 14px;font-size:14px;';
        bOk.textContent = '✅ Permis obtenu';
        bOk.addEventListener('click', async () => {
          if(!await confirmer(x.eleve + ' a obtenu son permis ?')) return;
          bOk.disabled = true;
          try{
            /* Il sort de toutes les listes de suivi */
            for(const cs of (x.enAttente || [])){
              try{ await appelPrep({ action:'consigneDone', id: cs.id }); }catch(err){}
            }
            await appelPrep({ action:'suiviDelete', eleve: x.eleve });

            $('permisNom').value = x.eleve;
            const tiroir = document.querySelector('[data-tiroir="permis"]');
            if(tiroir) tiroir.open = true;
            await preparerPermis();
            afficherBureau();
            showToast('Messages prêts dans le module permis ✅');
          }catch(err){ showToast('Erreur : ' + err.message); bOk.disabled = false; }
        });
        r.appendChild(bOk);

        const bNon = document.createElement('button');
        bNon.className = 'btn btn-secondary';
        bNon.style.cssText = 'width:auto;padding:10px 14px;font-size:14px;' +
          'color:var(--red);border-color:var(--red);';
        bNon.textContent = '❌ Ajourné';
        bNon.addEventListener('click', async () => {
          if(!await confirmer(x.eleve + " est ajourné ?\n\n" +
                              "Il passe en attente de son bilan d'examen,\n" +
                              'puis du rendez-vous post-permis.')) return;
          bNon.disabled = true;
          try{
            const n = (parseInt(s.nbAjournements, 10) || 0) + 1;
            const dateAjo = iso || todayLocal();
            await majSuivi(x.eleve, {
              resultat: 'ajourne',
              nbAjournements: String(n),
              dateAjournement: dateAjo,
              datePermis: '', aPlanifier: '', retireAPrevoir: '',
              toutOk: '', aRemplacer: '', dateADonner: '', fantome: '',
              rdvPostDate: '', rdvPostMoniteur: '', rdvPostFait: '',
              bilanExamen: '', suite: '', commentaireMoniteur: ''
            });
            for(const cs of (x.enAttente || [])){
              try{ await appelPrep({ action:'consigneDone', id: cs.id }); }catch(err){}
            }
            await envoyerConsigne(x.eleve, 'permis',
              'Ajourné le ' + dateEnToutesLettres(dateAjo) + ' — ' +
              mentionAjournements(n) +
              " · bilan d'examen et rendez-vous post-permis à prévoir (bureau)");
            showToast(x.eleve + ' est en attente de son bilan');
            afficherBureau();
          }catch(err){ showToast('Erreur : ' + err.message); bNon.disabled = false; }
        });
        r.appendChild(bNon);

        boite.appendChild(r);
      }
    }));
  });
}


/* ============================================================
   2. EN ATTENTE DU BILAN D'EXAMEN
   Ajournés dont le bilan ou le rendez-vous manque encore.
   ============================================================ */
function afficherAttenteBilan(tous){
  const zone = $('listeAttenteBilan');
  if(!zone) return;

  const liste = tous.filter(e => {
    const s = suiviDe(e.eleve);
    return s.resultat === 'ajourne' && s.rdvPostFait !== 'oui';
  });

  zone.innerHTML = '';
  if(!liste.length){
    zone.innerHTML = '<div class="empty">Aucun élève en attente.</div>';
    return;
  }

  /* Le bilan manquant passe devant */
  liste.sort((a, b) => {
    const sa = suiviDe(a.eleve), sb = suiviDe(b.eleve);
    return (sa.bilanExamen ? 1 : 0) - (sb.bilanExamen ? 1 : 0);
  });

  liste.forEach(e => {
    const s = suiviDe(e.eleve);
    const aBilan = !!s.bilanExamen;
    const aRdv = !!(s.rdvPostDate && s.rdvPostMoniteur);

    zone.appendChild(ligneBureau(e, {
      replier: true,
      info: () => mentionAjournements(s.nbAjournements, s.dateAjournement) +
                  (aBilan
                    ? (aRdv
                        ? ' · rendez-vous le ' + dateEnToutesLettres(s.rdvPostDate) +
                          ' avec ' + s.rdvPostMoniteur
                        : ' · bilan reçu, rendez-vous à fixer')
                    : " · bilan d'examen à récupérer"),
      resume: () => '',
      alerte: () => aBilan ? (aRdv ? null : 'Rendez-vous à fixer')
                           : "Bilan d'examen manquant",
      actions: (x, boite) => { boite.appendChild(blocRdvPost(x)); }
    }));
  });
}


/* Préparation d'un rendez-vous post-permis pour un ajourné */
function blocRdvPost(e){
  const s = suiviDe(e.eleve);
  const id = 'rp' + Math.random().toString(36).slice(2, 8);

  const det = document.createElement('details');
  det.style.cssText = 'margin-top:10px;';
  det.innerHTML = '<summary style="cursor:pointer;color:var(--accent-text);font-weight:600;' +
    'font-size:14px;">🔁 Rendez-vous post-permis' +
    (s.rdvPostDate ? ' — ' + dateEnToutesLettres(s.rdvPostDate) : ' — à prévoir') + '</summary>';

  const f = document.createElement('div');
  f.style.cssText = 'margin-top:10px;padding:12px;background:var(--navy);' +
    'border:1px solid var(--line);border-radius:10px;';
  f.innerHTML =
    '<label for="' + id + 'b">Bilan de l\'examen — à coller ici</label>' +
    '<textarea id="' + id + 'b" rows="6" placeholder="Colle ici le bilan transmis par l\'inspecteur. ' +
      'Le moniteur le corrigera pendant le rendez-vous." ' +
      'style="width:100%;background:var(--navy-deep);border:1px solid var(--line);color:var(--cream);' +
      'padding:10px;border-radius:10px;font-size:14px;line-height:1.5;font-family:inherit;' +
      'resize:vertical;margin-bottom:14px;"></textarea>' +
    '<label for="' + id + 'd">Date du rendez-vous</label>' +
    '<input type="date" id="' + id + 'd">' +
    '<label for="' + id + 'm">Moniteur qui le reçoit</label>' +
    '<select id="' + id + 'm"><option value="">— à définir —</option></select>';

  const bEnr = document.createElement('button');
  bEnr.className = 'btn btn-primary';
  bEnr.textContent = '💾 Enregistrer et préparer le cours';
  f.appendChild(bEnr);
  const msg = document.createElement('div');
  msg.style.cssText = 'margin-top:8px;font-size:13px;min-height:16px;';
  f.appendChild(msg);

  /* Retour du moniteur, une fois le rendez-vous fait */
  if(s.rdvPostFait === 'oui'){
    const ret = document.createElement('div');
    ret.style.cssText = 'margin-top:12px;padding:10px 12px;background:rgba(182,255,14,.08);' +
      'border:1px solid var(--orange);border-radius:10px;font-size:14px;line-height:1.6;';
    ret.innerHTML = '<div style="font-weight:700;color:var(--accent-text);margin-bottom:4px;">' +
      '✅ Rendez-vous fait</div>' +
      (s.suite ? '<div>' + libelleSuite(s.suite).replace(/</g, '&lt;') + '</div>' : '') +
      (s.commentaireMoniteur
        ? '<div style="white-space:pre-wrap;">' +
          s.commentaireMoniteur.replace(/</g, '&lt;') + '</div>' : '');
    f.appendChild(ret);
  }

  det.appendChild(f);

  setTimeout(() => {
    const g = k => document.getElementById(id + k);
    if(g('d')) g('d').value = s.rdvPostDate || '';
    const sm = g('m');
    if(sm){
      moniteursActifs.forEach(n => {
        const o = document.createElement('option');
        o.value = n; o.textContent = n;
        sm.appendChild(o);
      });
      sm.value = s.rdvPostMoniteur || '';
    }
    if(g('b')) g('b').value = s.bilanExamen || '';
  }, 0);

  bEnr.addEventListener('click', async () => {
    const g = k => document.getElementById(id + k);
    const date = g('d').value;
    const mon = g('m').value;
    const bilan = g('b').value.trim();

    if(!bilan){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = "Colle d'abord le bilan de l'examen.";
      return;
    }

    /* On peut enregistrer le bilan seul, le rendez-vous viendra après */
    if(!date || !mon){
      bEnr.disabled = true;
      try{
        await majSuivi(e.eleve, { bilanExamen: bilan });
        msg.style.color = 'var(--accent-text)';
        msg.textContent = '✅ Bilan enregistré. Ajoute la date et le moniteur pour préparer le cours.';
        afficherBureau();
      }catch(err){
        msg.style.color = 'var(--warn-text)';
        msg.textContent = 'Erreur : ' + err.message;
      }finally{ bEnr.disabled = false; }
      return;
    }

    bEnr.disabled = true;
    bEnr.textContent = 'Enregistrement…';
    try{
      await majSuivi(e.eleve, { rdvPostDate: date, rdvPostMoniteur: mon, bilanExamen: bilan });

      const n = parseInt(s.nbAjournements, 10) || 1;
      const note = '🔁 RENDEZ-VOUS POST-PERMIS · ' +
                   mentionAjournements(n, s.dateAjournement) +
                   "\n\nBILAN DE L'EXAMEN À CORRIGER :\n" + bilan;
      await appelPrep({
        action: 'prepAdd',
        date: date,
        eleve: e.eleve,
        modele: 'rdv-post',
        modeleLabel: '🔁 Rendez-vous post-permis',
        site: '',
        note: note,
        contexte: JSON.stringify({ rdvPost: true, eleve: e.eleve }),
        moniteur: mon
      });

      await envoyerConsigne(e.eleve, 'permis',
        'Rendez-vous post-permis le ' + dateEnToutesLettres(date) + ' avec ' + mon + ' (bureau)');

      msg.style.color = 'var(--accent-text)';
      msg.textContent = '✅ Cours préparé pour ' + mon + ' le ' + dateEnToutesLettres(date);
      afficherBureau();
    }catch(err){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Erreur : ' + err.message;
    }finally{
      bEnr.disabled = false;
      bEnr.textContent = '💾 Enregistrer et préparer le cours';
    }
  });

  return det;
}


/* ============================================================
   3. CALENDRIER DE PRISE DES DATES D'EXAMEN
   1er mardi du mois  → places de la 1ʳᵉ quinzaine du mois suivant
   2e mardi du mois   → places de la 2ᵉ quinzaine du mois suivant
   ============================================================ */
function mardisDuMois(an, mois){
  const out = [];
  const dernier = new Date(an, mois, 0).getDate();
  for(let j = 1; j <= dernier; j++){
    if(new Date(an, mois - 1, j).getDay() === 2) out.push(j);
  }
  return out;
}

function memeJour(a, b){
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function joursAvant(iso){
  const a = new Date(iso + 'T12:00:00');
  const b = new Date(); b.setHours(12, 0, 0, 0);
  return Math.round((a - b) / 86400000);
}

/* Les deux prochaines échéances de prise de dates */
function prochainesPrises(){
  const p2 = n => String(n).padStart(2, '0');
  const auj = new Date();
  auj.setHours(12, 0, 0, 0);
  const out = [];

  for(let d = 0; d < 3; d++){
    const ref = new Date(auj.getFullYear(), auj.getMonth() + d, 1);
    const an = ref.getFullYear(), mo = ref.getMonth() + 1;
    const mardis = mardisDuMois(an, mo);

    [0, 1].forEach(i => {
      if(mardis[i] === undefined) return;
      const jour = new Date(an, mo - 1, mardis[i], 12);
      if(jour < auj && !memeJour(jour, auj)) return;

      /* Le mois visé est le suivant */
      const cible = new Date(an, mo, 1);
      const anC = cible.getFullYear(), moC = cible.getMonth() + 1;
      const finMois = new Date(anC, moC, 0).getDate();

      out.push({
        date: an + '-' + p2(mo) + '-' + p2(mardis[i]),
        quinzaine: i + 1,
        moisCible: anC + '-' + p2(moC),
        du: (i === 0) ? anC + '-' + p2(moC) + '-01' : anC + '-' + p2(moC) + '-16',
        au: (i === 0) ? anC + '-' + p2(moC) + '-15'
                      : anC + '-' + p2(moC) + '-' + p2(finMois)
      });
    });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out.slice(0, 2);
}

/* Un élève peut-il passer sur cette période ? */
function disponibleSur(s, du, au){
  if(s.dispoDu && s.dispoDu > au) return false;                 /* pas encore possible */
  if(s.indispoDu && s.indispoAu){
    if(!(s.indispoAu < du || s.indispoDu > au)) return false;    /* absent sur la période */
  }
  return true;
}

function raisonIndispo(s, du, au){
  if(s.dispoDu && s.dispoDu > au){
    return 'possible seulement à partir du ' + dateEnToutesLettres(s.dispoDu);
  }
  if(s.indispoDu && s.indispoAu && !(s.indispoAu < du || s.indispoDu > au)){
    return 'absent du ' + dateEnToutesLettres(s.indispoDu) +
           ' au ' + dateEnToutesLettres(s.indispoAu);
  }
  return '';
}

/* Bandeau : la prochaine prise de dates et les élèves à présenter */
function afficherAlertePrise(candidats){
  const zone = $('alertePrise');
  if(!zone) return;
  zone.innerHTML = '';

  prochainesPrises().forEach(p => {
    const j = joursAvant(p.date);
    if(j < 0 || j > 10) return;   /* on ne montre que ce qui arrive bientôt */

    const eligibles = candidats.filter(e => disponibleSur(suiviDe(e.eleve), p.du, p.au));
    const ecartes = candidats.filter(e => !disponibleSur(suiviDe(e.eleve), p.du, p.au));
    const urgent = (j <= 1);

    const d = document.createElement('div');
    d.style.cssText = 'border-radius:10px;padding:12px;margin-bottom:8px;font-size:14px;' +
      'line-height:1.7;border:1px solid ' + (urgent ? 'var(--red)' : 'var(--orange)') + ';' +
      'background:' + (urgent ? 'var(--warn-bg)' : 'rgba(182,255,14,.08)') + ';';

    const quand = (j === 0) ? "aujourd'hui" : (j === 1) ? 'demain' : 'dans ' + j + ' jours';
    const libP = new Date(p.date + 'T12:00:00')
      .toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
    const libM = new Date(p.moisCible + '-15T12:00:00')
      .toLocaleDateString('fr-FR', { month:'long', year:'numeric' });

    d.innerHTML = '<div style="font-weight:700;margin-bottom:4px;">' +
      (urgent ? '🔔' : '📆') + ' Prise de dates ' + quand + ' — ' + libP + '</div>' +
      '<div>Places de la <strong>' + (p.quinzaine === 1 ? '1ʳᵉ' : '2ᵉ') +
      ' quinzaine de ' + libM + '</strong> (' +
      new Date(p.du + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric' }) + ' au ' +
      new Date(p.au + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'long' }) +
      ')</div>' +
      '<div style="margin-top:4px;"><strong>' + eligibles.length +
      '</strong> élève(s) présentable(s)' +
      (ecartes.length ? ' · <span style="color:var(--muted);">' + ecartes.length +
        ' écarté(s) pour indisponibilité</span>' : '') + '</div>';

    if(eligibles.length){
      const det = document.createElement('details');
      det.innerHTML = '<summary style="cursor:pointer;color:var(--accent-text);font-weight:600;' +
        'margin-top:6px;">Voir les ' + eligibles.length + ' élèves</summary>';
      const l = document.createElement('div');
      l.style.cssText = 'margin-top:6px;font-size:13px;line-height:1.9;';

      eligibles.forEach(e => {
        const s = suiviDe(e.eleve);
        const ligne = document.createElement('div');
        ligne.style.cssText = 'display:flex;align-items:center;gap:8px;';
        const nom = document.createElement('span');
        nom.style.cssText = 'flex:1;min-width:0;';
        nom.textContent = (s.nbAjournements ? '🔁 ' : '🆕 ') + e.eleve;
        const b = document.createElement('button');
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:5px 9px;font-size:12px;margin:0;flex-shrink:0;';
        b.textContent = '→ RDV PERMIS';
        b.addEventListener('click', async () => {
          b.disabled = true;
          try{
            await majSuivi(e.eleve, { aPlanifier: 'oui', retireAPrevoir: '' });
            afficherBureau();
          }catch(err){ showToast('Erreur : ' + err.message); b.disabled = false; }
        });
        ligne.appendChild(nom); ligne.appendChild(b);
        l.appendChild(ligne);
      });

      const bTous = document.createElement('button');
      bTous.className = 'btn btn-primary';
      bTous.style.cssText = 'margin-top:10px;font-size:13px;padding:10px;';
      bTous.textContent = '📋 Mettre les ' + eligibles.length + ' dans la liste RDV PERMIS';
      bTous.addEventListener('click', async () => {
        if(!await confirmer('Ajouter ces ' + eligibles.length +
                            ' élèves à la liste RDV PERMIS ?')) return;
        bTous.disabled = true;
        bTous.textContent = 'Enregistrement…';
        try{
          for(const e of eligibles){
            await majSuivi(e.eleve, { aPlanifier: 'oui', retireAPrevoir: '' });
          }
          showToast(eligibles.length + ' élèves ajoutés ✅');
          afficherBureau();
        }catch(err){ showToast('Erreur : ' + err.message); bTous.disabled = false; }
      });
      l.appendChild(bTous);
      det.appendChild(l);
      d.appendChild(det);
    }

    if(ecartes.length){
      const det2 = document.createElement('details');
      det2.innerHTML = '<summary style="cursor:pointer;color:var(--muted);font-size:13px;' +
        'margin-top:6px;">Écartés (' + ecartes.length + ')</summary>';
      const l2 = document.createElement('div');
      l2.style.cssText = 'margin-top:4px;font-size:12px;color:var(--muted);line-height:1.7;';
      l2.innerHTML = ecartes.map(e =>
        '• ' + e.eleve.replace(/</g, '&lt;') + ' — ' +
        raisonIndispo(suiviDe(e.eleve), p.du, p.au)).join('<br>');
      det2.appendChild(l2);
      d.appendChild(det2);
    }

    zone.appendChild(d);
  });
}


/* ============================================================
   4. DISPONIBILITÉS D'UN ÉLÈVE
   AAC pas encore éligible, vacances, absences.
   ============================================================ */
function blocDispo(e){
  const s = suiviDe(e.eleve);
  const id = 'dp' + Math.random().toString(36).slice(2, 8);
  const pose = (s.dispoDu || s.indispoDu);

  const det = document.createElement('details');
  det.style.cssText = 'margin-top:8px;';
  det.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:600;color:' +
    (pose ? 'var(--accent-text)' : 'var(--muted)') + ';">📅 Disponibilités' +
    (s.dispoDu ? ' — à partir du ' + dateEnToutesLettres(s.dispoDu) : '') +
    (s.indispoDu && s.indispoAu ? ' — absent du ' + dateEnToutesLettres(s.indispoDu) +
      ' au ' + dateEnToutesLettres(s.indispoAu) : '') + '</summary>';

  const f = document.createElement('div');
  f.style.cssText = 'margin-top:8px;padding:10px 12px;background:var(--navy);' +
    'border:1px solid var(--line);border-radius:10px;';
  f.innerHTML =
    '<label for="' + id + 'a">Peut passer à partir du</label>' +
    '<input type="date" id="' + id + 'a">' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;">' +
      'Pour un AAC pas encore éligible, par exemple.</div>' +
    '<label>Indisponible (vacances, absence)</label>' +
    '<div style="display:flex;gap:8px;">' +
      '<input type="date" id="' + id + 'du" style="flex:1;">' +
      '<input type="date" id="' + id + 'au" style="flex:1;">' +
    '</div>' +
    '<div style="display:flex;gap:8px;font-size:11px;color:var(--muted);margin:-8px 0 12px;">' +
      '<span style="flex:1;text-align:center;">du</span>' +
      '<span style="flex:1;text-align:center;">au</span>' +
    '</div>';

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'padding:9px;font-size:13px;';
  b.textContent = '💾 Enregistrer';
  f.appendChild(b);
  det.appendChild(f);

  setTimeout(() => {
    const g = k => document.getElementById(id + k);
    if(g('a')) g('a').value = s.dispoDu || '';
    if(g('du')) g('du').value = s.indispoDu || '';
    if(g('au')) g('au').value = s.indispoAu || '';
  }, 0);

  b.addEventListener('click', async () => {
    const g = k => document.getElementById(id + k);
    b.disabled = true;
    try{
      await majSuivi(e.eleve, {
        dispoDu: g('a').value,
        indispoDu: g('du').value,
        indispoAu: g('au').value
      });
      showToast('Disponibilités enregistrées ✅');
      afficherBureau();
    }catch(err){ showToast('Erreur : ' + err.message); b.disabled = false; }
  });

  return det;
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-postpermis.js'] = true;
