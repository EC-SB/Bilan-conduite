/* ============================================================
   ec-sessions.js
   Les examens du permis, vus comme des sessions.

   Une ligne par demi-journée d'examen : la date, le centre, le
   moniteur, les horaires, le nombre d'élèves. On la déplie pour
   voir qui passe et à quelle heure, et on appuie sur un élève
   pour savoir où il en est.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les sessions ouvertes, pour se souvenir de ce qui était déplié */
let sessionsOuvertes = {};

/* Regroupe les élèves en sessions : une date, un centre, un groupe */
function construireSessions(prevus){
  const par = {};

  (prevus || []).forEach(e => {
    const s = e._suivi || {};
    const cle = (e._iso || e._datePermis || 'sans-date') + '|' +
                (s.centre || '') + '|' + (e._groupe || '');

    if(!par[cle]){
      par[cle] = {
        cle: cle,
        iso: e._iso || '',
        libelle: e._datePermis || 'Date à définir',
        centre: s.centre || '',
        groupe: e._groupe || '',
        moniteur: s.moniteurPermis || s.moniteur || '',
        boite: e._boite || '',
        eleves: []
      };
    }
    par[cle].eleves.push(e);
  });

  /* Les plus proches d'abord : c'est ce qui occupe le bureau */
  return Object.keys(par).map(k => par[k]).sort((a, b) => {
    if(!a.iso) return 1;
    if(!b.iso) return -1;
    return a.iso.localeCompare(b.iso);
  });
}


/* Une session : la ligne qu'on déplie */
function ligneSession(sess){
  const bloc = document.createElement('div');
  bloc.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'margin-bottom:8px;overflow:hidden;';

  const auj = todayLocal();
  const passe = sess.iso && sess.iso < auj;
  const cejour = sess.iso === auj;

  /* ---- L'en-tête, cliquable ---- */
  const tete = document.createElement('button');
  tete.type = 'button';
  tete.style.cssText = 'width:100%;display:flex;align-items:center;gap:10px;' +
    'padding:12px 14px;background:' +
    (cejour ? 'rgba(182,255,14,.10)' : 'transparent') +
    ';border:none;border-left:4px solid ' +
    (cejour ? 'var(--orange)' : passe ? 'var(--muted)' : 'var(--line)') +
    ';cursor:pointer;text-align:left;font-family:inherit;color:var(--cream);';

  const g = document.createElement('div');
  g.style.cssText = 'flex:1;min-width:0;';
  g.innerHTML =
    '<div style="font-size:15px;font-weight:700;text-transform:capitalize;' +
      'color:' + (cejour ? 'var(--accent-text)' : 'var(--cream)') + ';">' +
      (sess.iso ? libelleDate(sess.iso) : sess.libelle) +
      (passe ? ' <span style="font-size:11px;color:var(--muted);">passé</span>' : '') +
    '</div>' +
    '<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5;">' +
      (sess.centre ? '🏁 ' + sess.centre.replace(/</g, '&lt;') : '🏁 centre à définir') +
      (sess.moniteur ? ' · 👤 ' + sess.moniteur.replace(/</g, '&lt;') : '') +
      (sess.groupe ? ' · 👥 ' + sess.groupe.replace(/</g, '&lt;') : '') +
      (sess.boite ? ' · ' + (sess.boite === 'bea' ? 'BEA' : 'BV') : '') +
    '</div>';
  tete.appendChild(g);

  /* Le nombre d'élèves, bien visible */
  const n = document.createElement('div');
  n.style.cssText = 'flex-shrink:0;background:var(--navy);border-radius:9px;' +
    'padding:6px 11px;font-size:15px;font-weight:800;color:var(--accent-text);';
  n.textContent = sess.eleves.length;
  tete.appendChild(n);

  const fleche = document.createElement('div');
  fleche.style.cssText = 'flex-shrink:0;font-size:13px;color:var(--muted);' +
    'transition:transform .2s;';
  fleche.textContent = '▼';
  tete.appendChild(fleche);

  bloc.appendChild(tete);

  /* ---- Le détail, replié par défaut ---- */
  const detail = document.createElement('div');
  detail.style.cssText = 'display:none;border-top:1px solid var(--line);';
  bloc.appendChild(detail);

  const ouvrir = (oui) => {
    detail.style.display = oui ? 'block' : 'none';
    fleche.style.transform = oui ? 'rotate(180deg)' : 'none';
    sessionsOuvertes[sess.cle] = oui;
    if(oui && !detail.dataset.rempli){
      detail.dataset.rempli = 'oui';
      remplirDetailSession(detail, sess);
    }
  };

  tete.addEventListener('click', () => ouvrir(detail.style.display === 'none'));
  if(sessionsOuvertes[sess.cle]) ouvrir(true);

  return bloc;
}


/* Le tableau des élèves d'une session */
function remplirDetailSession(zone, sess){
  /* Les horaires : soit ceux du planning, soit calculés */
  const eleves = sess.eleves.slice().sort((a, b) => {
    const ha = (a._suivi && a._suivi.heurePermis) || '';
    const hb = (b._suivi && b._suivi.heurePermis) || '';
    if(ha && hb) return ha.localeCompare(hb);
    if(ha) return -1;
    if(hb) return 1;
    return normaliserMot(a.eleve).localeCompare(normaliserMot(b.eleve));
  });

  const t = document.createElement('div');
  t.style.cssText = 'display:flex;gap:8px;padding:8px 14px;font-size:11px;' +
    'color:var(--muted);text-transform:uppercase;letter-spacing:.4px;' +
    'border-bottom:1px solid var(--line);';
  t.innerHTML = '<span style="flex:1;">Élève</span>' +
    '<span style="width:64px;flex-shrink:0;">Heure</span>' +
    '<span style="width:74px;flex-shrink:0;text-align:right;">Où il en est</span>';
  zone.appendChild(t);

  eleves.forEach((e, i) => zone.appendChild(ligneEleveSession(e, sess, i)));
}


/* Un élève de la session : son heure, son état, et le questionnaire */
function ligneEleveSession(e, sess, rang){
  const s = e._suivi || {};

  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:8px;align-items:center;padding:10px 14px;' +
    'cursor:pointer;background:' + (rang % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent') + ';';

  /* Ce que la note dit de sa préparation */
  const a = (typeof analyserNote === 'function') ? analyserNote(e.note || '') : {};
  const pret = etatDePreparation(a, s);

  const nom = document.createElement('div');
  nom.style.cssText = 'flex:1;min-width:0;font-size:14px;line-height:1.4;';
  nom.innerHTML = '<strong>' + (e.eleve || '').replace(/</g, '&lt;') + '</strong>' +
    (e._boite ? ' <span style="font-size:11px;color:var(--muted);">' +
      (e._boite === 'bea' ? 'BEA' : 'BV') + '</span>' : '') +
    (pret.detail ? '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      pret.detail + '</div>' : '');
  l.appendChild(nom);

  const h = document.createElement('div');
  h.style.cssText = 'width:64px;flex-shrink:0;font-size:13px;color:var(--accent-text);';
  h.textContent = s.heurePermis || '—';
  l.appendChild(h);

  const etat = document.createElement('div');
  etat.style.cssText = 'width:74px;flex-shrink:0;text-align:right;font-size:16px;';
  etat.textContent = pret.emoji;
  etat.title = pret.titre;
  l.appendChild(etat);

  /* Appuyer ouvre le questionnaire de cet élève */
  l.addEventListener('click', () => ouvrirFicheSession(e, sess));

  return l;
}


/* Résume la préparation d'un élève en un signe */
function etatDePreparation(a, s){
  if(a.examBlanc === 'aprevoir'){
    return { emoji: '🔴', titre: 'Examen blanc à prévoir',
             detail: 'examen blanc à prévoir' };
  }
  if(a.simuNuit === 'aprevoir'){
    return { emoji: '🟠', titre: 'Simulateur nuit et risques à prévoir',
             detail: 'simulateur à prévoir' };
  }
  if(s && s.fairePoint === 'oui'){
    return { emoji: '❓', titre: 'Faire le point avec lui',
             detail: 'faire le point' };
  }
  if(a.examBlanc === 'reserve'){
    return { emoji: '🟡', titre: 'Examen blanc réservé, pas encore passé',
             detail: 'examen blanc réservé' };
  }
  if(a.examBlanc === 'passe' || a.ebSuite === '3h'){
    return { emoji: '🟢', titre: 'Examen blanc passé — prêt',
             detail: 'examen blanc passé' };
  }
  return { emoji: '⚪', titre: 'Rien de signalé', detail: '' };
}


/* La fiche complète d'un élève, depuis la session */
async function ouvrirFicheSession(e, sess){
  const s = e._suivi || {};

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 94vw);max-height:88vh;overflow-y:auto;';

  const t = document.createElement('h3');
  t.textContent = e.eleve || 'Élève';
  boite.appendChild(t);

  const st = document.createElement('div');
  st.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:12px;line-height:1.6;';
  st.innerHTML =
    '🎓 Examen ' + (sess.iso ? libelleDate(sess.iso) : sess.libelle) +
    (s.heurePermis ? ' à ' + s.heurePermis : '') +
    (sess.centre ? '<br>🏁 ' + sess.centre.replace(/</g, '&lt;') : '') +
    (e._boite ? '<br>🚗 ' + (e._boite === 'bea' ? 'Boîte automatique' : 'Boîte manuelle') : '');
  boite.appendChild(st);

  /* Sa note de suivi, telle quelle */
  if(e.note){
    const n = document.createElement('div');
    n.style.cssText = 'background:var(--navy);border:1px solid var(--line);' +
      'border-radius:10px;padding:11px 12px;font-size:14px;line-height:1.55;' +
      'white-space:pre-wrap;margin-bottom:12px;';
    n.textContent = e.note;
    boite.appendChild(n);
  }

  const r = document.createElement('div');
  r.className = 'btn-row';

  /* Son dossier complet : les derniers cours, la fiche véhicule,
     ce qui reste à travailler. C'est ce qu'on veut savoir avant
     de le présenter à l'examen. */
  const bQ = document.createElement('button');
  bQ.className = 'btn btn-primary';
  bQ.textContent = '📋 Son dossier';
  bQ.addEventListener('click', async () => {
    bQ.disabled = true;
    bQ.textContent = 'Lecture…';
    try{
      await afficherDossierDansFiche(boite, e.eleve);
      bQ.remove();
    }catch(err){
      showToast('Dossier indisponible : ' + err.message);
      bQ.disabled = false;
      bQ.textContent = '📋 Son dossier';
    }
  });
  r.appendChild(bQ);

  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bF);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */

function afficherSessionsPermis(){
  const zone = $('sessionsPermis');
  if(!zone) return;

  const tous = (typeof etatBureau !== 'undefined' && etatBureau.eleves) || [];
  if(!tous.length){
    zone.innerHTML = '<div class="empty">Ouvre l\'onglet Permis pour charger les élèves.</div>';
    return;
  }

  /* On réutilise le travail déjà fait par les listes permis :
     dates, centres, groupes et boîtes y sont déjà rattachés. */
  const prevus = tous.filter(e => {
    const a = analyserNote(e.note || '');
    return a.permis === 'prevu';
  });

  etatBureau.suivi.forEach(s => {
    if(!s.datePermis) return;
    if(prevus.some(x => normaliserMot(x.eleve) === normaliserMot(s.eleve))) return;
    const base = tous.find(x => normaliserMot(x.eleve) === normaliserMot(s.eleve));
    if(base) prevus.push(base);
  });

  prevus.forEach(e => {
    const s = etatBureau.suivi.find(y => normaliserMot(y.eleve) === normaliserMot(e.eleve));
    const a = analyserNote(e.note || '');
    e._suivi = s || {};
    e._datePermis = a.permisDate || (s && s.datePermis) || '';
    e._iso = dateFrVersIso(e._datePermis) || '';
    e._groupe = (s && s.groupePermis) || '';
    e._boite = ((s && s.typeExamen) || e.boite ||
                (/automatique/i.test(e.type || '') ? 'bea' : 'bv')).toLowerCase();
  });

  const sessions = construireSessions(prevus);

  zone.innerHTML = '';

  if(!sessions.length){
    zone.innerHTML = '<div class="empty">Aucun examen prévu pour le moment.</div>';
    return;
  }

  const compte = document.createElement('div');
  compte.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;';
  compte.textContent = sessions.length + ' session(s) · ' + prevus.length + ' élève(s)';
  zone.appendChild(compte);

  sessions.forEach(s => zone.appendChild(ligneSession(s)));
}


/* Le dossier de l'élève, ajouté dans la fiche ouverte */
async function afficherDossierDansFiche(boite, eleve){
  const d = await chargerDossierEleve(eleve);

  const z = document.createElement('div');
  z.style.cssText = 'border-top:1px solid var(--line);margin-top:12px;padding-top:12px;';

  const faites = (BLOC.ficheListeConduite || [])
    .filter(x => (d.marques || {})[normaliserMot(x)]);
  const restent = (BLOC.ficheListeConduite || [])
    .filter(x => faites.indexOf(x) === -1);

  z.innerHTML =
    '<div style="font-size:13px;color:var(--muted);margin-bottom:6px;">' +
      (d.lecons ? d.lecons + ' leçon(s) de conduite' : 'Aucun cours enregistré') +
      (d.frise ? '<br>🧭 ' + d.frise.replace(/</g, '&lt;') : '') +
    '</div>' +
    '<div style="font-size:13px;font-weight:700;color:var(--accent-text);' +
      'margin:10px 0 4px;">🦉 Fiche véhicule — ' + faites.length + ' sur ' +
      (BLOC.ficheListeConduite || []).length + '</div>';

  if(restent.length){
    const r = document.createElement('div');
    r.style.cssText = 'font-size:13px;color:var(--warn-text);line-height:1.7;';
    r.innerHTML = '<strong>❓ Reste à travailler</strong><br>' +
      restent.map(x => '· ' + x.replace(/</g, '&lt;')).join('<br>');
    z.appendChild(r);
  }else{
    const r = document.createElement('div');
    r.style.cssText = 'font-size:13px;color:var(--accent-text);';
    r.textContent = '✅ Fiche véhicule complète';
    z.appendChild(r);
  }

  if(d.derniereNote){
    const n = document.createElement('div');
    n.style.cssText = 'font-size:13px;color:var(--muted);margin-top:10px;' +
      'line-height:1.5;white-space:pre-wrap;';
    n.textContent = '📌 ' + d.derniereNote;
    z.appendChild(n);
  }

  /* Avant les boutons, pour rester lisible */
  const r2 = boite.querySelector('.btn-row');
  boite.insertBefore(z, r2 || null);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-sessions.js'] = true;
