/* ============================================================
   ec-sessions.js
   Les sessions d'examen, place par place.

   Une session = une demi-journée avec un inspecteur. On la crée
   en disant combien de places et à quelle heure elle commence ;
   les créneaux se calculent seuls. Chaque place accueille un
   élève, ou reste une place fantôme.

   Tout se voit d'un coup d'œil : qui est prévenu, qui a son
   dossier prêt, qui n'est pas encore prêt à passer.
   ============================================================ */

let sessionsPermis = [];
let sessionsOuvertes = {};
/* La place retenue pour un échange, en attente de la seconde */
let echangeEnCours = null;


/* La boîte d'un élève : sa fiche de suivi d'abord, son type de
   bilan ensuite. Sans elle on ne sait pas quel véhicule prévoir. */
function boiteDe(nom){
  if(!nom) return '';

  const su = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
  if(su.typeExamen) return String(su.typeExamen).toLowerCase();

  const e = eleveDuBureau(nom);
  if(e){
    if(e.boite) return String(e.boite).toLowerCase();
    if(/automatique|bea/i.test(e.type || '')) return 'bea';
    if(/manuelle|\bbv\b/i.test(e.type || '')) return 'bv';
  }

  /* Sa fiche du répertoire, quand elle porte la formation */
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  if(f && /auto|bea/i.test(f.formation || '')) return 'bea';
  if(f && f.formation) return 'bv';

  return '';
}

/* L'étiquette colorée, lisible d'un coup d'œil */
function etiquetteBoite(boite){
  if(!boite) return '';
  const bea = (boite === 'bea');
  return '<span style="display:inline-block;margin-left:6px;padding:1px 6px;' +
    'border-radius:5px;font-size:10px;font-weight:800;' +
    'background:' + (bea ? 'rgba(93,173,226,.22)' : 'rgba(182,255,14,.18)') + ';' +
    'color:' + (bea ? '#5DADE2' : 'var(--accent-text)') + ';">' +
    (bea ? 'BEA' : 'BV') + '</span>';
}


/* Un élève est « au vert » quand tout est fait : prévenu, dossier
   vérifié, et rien qui traîne côté préparation. */
function etatPlace(place, eleveBureau){
  if(!place.eleve){
    return { cle:'vide', emoji:'👻', texte:'Place fantôme',
             couleur:'var(--muted)' };
  }

  const su = (typeof suiviDe === 'function') ? suiviDe(place.eleve) : {};

  /* Une place à remplacer passe avant tout le reste : c'est elle
     qu'il faut traiter en premier. */
  if(su.aRemplacer === 'oui'){
    return { cle:'remplacer', emoji:'🔄', texte:'À REMPLACER — place à donner',
             couleur:'var(--red)' };
  }

  /* « Tout est OK » tranche : c'est le bureau qui le dit, après
     vérification. Aucun signalement automatique ne le contredit. */
  if(su.toutOk === 'oui'){
    return { cle:'ok', emoji:'✅', texte:'Tout est prêt',
             couleur:'var(--accent-text)' };
  }

  const manque = [];
  if(!place.prevenu) manque.push('pas prévenu');
  if(!place.dossierOk) manque.push('dossier à vérifier');
  if(su.fairePoint === 'oui') manque.push('faire le point');
  if(su.resteAPayer && parseFloat(su.resteAPayer) > 0){
    manque.push('reste ' + su.resteAPayer + ' € à payer');
  }
  /* Une relance dépassée : c'est le genre de chose qui se perd */
  if(su.relanceLe && su.relanceLe <= todayLocal()){
    manque.push('à relancer');
  }

  /* Ce que sa note de suivi signale encore */
  if(eleveBureau && typeof analyserNote === 'function'){
    const a = analyserNote(eleveBureau.note || '');
    if(a.examBlanc === 'aprevoir') manque.push('examen blanc à prévoir');
    if(a.simuNuit === 'aprevoir') manque.push('simulateur à prévoir');
  }

  if(!manque.length){
    return { cle:'ok', emoji:'✅', texte:'Tout est prêt',
             couleur:'var(--accent-text)' };
  }
  return { cle:'attente', emoji: place.prevenu ? '🟠' : '🔴',
           texte: manque.join(' · '), couleur:'var(--warn-text)' };
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */

/* Redessine SANS relire le serveur : les données en mémoire sont
   déjà à jour, une action vient de les modifier. Douze appels à
   afficherSessionsPermis() rechargeaient tout pour rien. */
function redessinerSessions(){
  const zone = $('sessionsPermis');
  if(!zone) return;
  dessinerSessions(zone);
}


async function afficherSessionsPermis(){
  const zone = $('sessionsPermis');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture des sessions…</div>';
  try{
    /* Le suivi en même temps : c'est lui qui porte « à remplacer »,
       « tout est OK » et le reste à payer. */
    const [d] = await Promise.all([
      appelPrep({ action: 'sessionList' }),
      /* Le suivi porte les fiches de préparation. On le recharge
         à chaque affichage : une fiche modifiée ailleurs doit se
         voir ici, et le cache de 30 s évite les appels inutiles. */
      (typeof chargerBureau === 'function')
        ? chargerBureau(false).catch(() => null) : Promise.resolve()
    ]);
    sessionsPermis = (d && d.sessions) || [];
  /* Par date, puis par heure : deux sessions du même jour se suivent
     dans l'ordre où elles ont lieu. */
  sessionsPermis.sort((a, b) => {
    const j = String(a.date || '').localeCompare(String(b.date || ''));
    if(j !== 0) return j;
    return String(a.heureDebut || '').localeCompare(String(b.heureDebut || ''));
  });
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  dessinerSessions(zone);
}


/* Le dessin seul, à partir de ce qu'on a en mémoire */
function dessinerSessions(zone){
zone.innerHTML = '';

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-bottom:14px;padding:13px;font-size:14px;';
  b.textContent = "➕ Nouvelle session d'examen";
  b.addEventListener('click', () => ouvrirEditeurSession(null));
  zone.appendChild(b);

  /* L'échange en cours, rappelé en haut pour qu'on n'oublie pas */
  if(echangeEnCours){
    const a = document.createElement('div');
    a.style.cssText = 'border:1px solid var(--orange);border-radius:10px;' +
      'padding:10px 12px;margin-bottom:12px;font-size:13px;line-height:1.5;' +
      'background:rgba(182,255,14,.08);';
    a.innerHTML = '🔄 <strong>' + echangeEnCours.eleve.replace(/</g, '&lt;') +
      '</strong> attend un échange.<br>' +
      '<span style="color:var(--muted);font-size:12px;">Appuie sur 🔄 d\'une ' +
      'autre place pour les permuter.</span>';

    const ann = document.createElement('button');
    ann.className = 'btn btn-secondary';
    ann.style.cssText = 'width:auto;padding:6px 11px;font-size:12px;margin-top:8px;';
    ann.textContent = "✕ Annuler l'échange";
    ann.addEventListener('click', () => { echangeEnCours = null; afficherSessionsPermis(); });
    a.appendChild(ann);
    zone.appendChild(a);
  }

  /* Reprendre les dates déjà saisies : une seule fois, au départ.
     Le bouton reste ensuite disponible si de nouvelles dates ont
     été posées ailleurs. */
  const bRep = document.createElement('button');
  bRep.className = 'btn btn-secondary';
  bRep.style.cssText = 'margin-bottom:14px;padding:11px;font-size:13px;';
  bRep.textContent = '📥 Reprendre les dates déjà enregistrées';
  bRep.title = 'Crée les sessions à partir des dates du suivi';
  bRep.addEventListener('click', async () => {
    if(!await confirmer('Créer les sessions à partir des dates déjà ' +
        'enregistrées ?\n\nLes élèves y sont placés automatiquement. ' +
        'Aucune session existante n\'est écrasée.')) return;
    bRep.disabled = true;
    bRep.textContent = 'Reprise en cours…';
    try{
      const r = await reprendreDatesExistantes();
      showToast(r.creees + ' session(s) · ' + r.places + ' élève(s) placé(s) ✅');
      afficherSessionsPermis();
    }catch(e){
      showToast('Reprise impossible : ' + e.message);
      bRep.disabled = false;
      bRep.textContent = '📥 Reprendre les dates déjà enregistrées';
    }
  });
  zone.appendChild(bRep);

  if(!sessionsPermis.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucune session pour le moment.<br>' +
      '<span style="font-size:12px;">Crée une session, ou reprends les dates ' +
      'déjà enregistrées avec le bouton ci-dessus.</span>';
    zone.appendChild(v);
    return;
  }

  /* Ce qui demande une action, tous jours confondus : les listes
     que le bloc « Permis prévus » donnait avant. */
  const aRemplacer = [];
  const fantomes = [];
  sessionsPermis.forEach(s => {
    s.eleves.forEach(p => {
      const su = (p.eleve && typeof suiviDe === 'function') ? suiviDe(p.eleve) : {};
      if(!p.eleve) fantomes.push({ s: s, p: p });
      else if(su.aRemplacer === 'oui') aRemplacer.push({ s: s, p: p, su: su });
    });
  });

  if(aRemplacer.length || fantomes.length){
    zone.appendChild(blocAIntervenir(aRemplacer, fantomes));
  }

  const auj = todayLocal();
  const compte = document.createElement('div');
  compte.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;';
  const total = sessionsPermis.reduce((n, s) => n + s.eleves.filter(x => x.eleve).length, 0);
  const vides = sessionsPermis.reduce((n, s) => n + s.eleves.filter(x => !x.eleve).length, 0);
  compte.textContent = sessionsPermis.length + ' session(s) · ' + total + ' élève(s)' +
    (vides ? ' · ' + vides + ' place(s) fantôme(s)' : '');
  zone.appendChild(compte);

  /* Deux sessions le même jour : on les numérote, sinon rien ne les
     distingue dans la liste et on ne sait pas laquelle on ouvre. */
  const parJour = {};
  sessionsPermis.forEach(s => {
    parJour[s.date] = (parJour[s.date] || 0) + 1;
  });
  const vus = {};
  sessionsPermis.forEach(s => {
    if(parJour[s.date] > 1){
      vus[s.date] = (vus[s.date] || 0) + 1;
      s._rangJour = vus[s.date];
      s._totalJour = parJour[s.date];
    }else{
      s._rangJour = 0;
    }
  });

  sessionsPermis.forEach(s => zone.appendChild(blocSession(s, auj)));
}


/* Les places à donner et les places libres, réunies en tête :
   c'est ce qu'on cherche en premier le matin. */
function blocAIntervenir(aRemplacer, fantomes){
  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:10px 12px;margin-bottom:14px;';

  d.innerHTML = '<summary style="cursor:pointer;font-size:14px;font-weight:700;' +
    'color:var(--accent-text);">⚠️ À traiter — ' +
    (aRemplacer.length ? aRemplacer.length + ' à remplacer' : '') +
    (aRemplacer.length && fantomes.length ? ' · ' : '') +
    (fantomes.length ? fantomes.length + ' place(s) libre(s)' : '') +
    '</summary>';

  const ajouter = (titre, lot, couleur) => {
    if(!lot.length) return;
    const t = document.createElement('div');
    t.style.cssText = 'font-size:12px;font-weight:700;color:' + couleur +
      ';margin:10px 0 4px;';
    t.textContent = titre;
    d.appendChild(t);

    lot.forEach(x => {
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:8px;align-items:center;padding:6px 0;' +
        'font-size:13px;cursor:pointer;';
      l.innerHTML = '<span style="flex:1;min-width:0;">' +
        (x.p.eleve ? '<strong>' + x.p.eleve.replace(/</g, '&lt;') + '</strong>' +
                     etiquetteBoite(boiteDe(x.p.eleve)) :
                     '<em style="color:var(--muted);">place libre</em>') +
        '<span style="color:var(--muted);"> — ' +
        (x.s.date ? libelleDate(x.s.date) : 'date à définir') +
        (x.p.heure ? ' à ' + x.p.heure : '') + '</span></span>';
      l.addEventListener('click', () => ouvrirPlace(x.p, x.s));
      d.appendChild(l);
    });
  };

  ajouter('🔄 Places à remplacer', aRemplacer, 'var(--red)');
  ajouter('👻 Places libres', fantomes, 'var(--muted)');

  return d;
}


/* Une session : son en-tête et ses places */
function blocSession(sess, auj){
  const passe = sess.date && sess.date < auj;
  const cejour = sess.date === auj;

  const prets = sess.eleves.filter(x => {
    return etatPlace(x, eleveDuBureau(x.eleve)).cle === 'ok';
  }).length;

  /* Combien de chaque boîte : c'est ce qui décide du véhicule à
     sortir, et une session mixte se repère tout de suite. */
  let nBea = 0, nBv = 0;
  sess.eleves.forEach(x => {
    if(!x.eleve) return;
    const b = boiteDe(x.eleve);
    if(b === 'bea') nBea++;
    else if(b === 'bv') nBv++;
  });
  const detailBoite = [nBea ? nBea + ' BEA' : '', nBv ? nBv + ' BV' : '']
    .filter(Boolean).join(' · ');

  const bloc = document.createElement('div');
  bloc.style.cssText = 'border:1px solid ' +
    (cejour ? 'var(--orange)' : 'var(--line)') +
    ';border-radius:12px;margin-bottom:10px;overflow:hidden;';

  const tete = document.createElement('div');
  tete.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 14px;' +
    'cursor:pointer;background:' + (cejour ? 'rgba(182,255,14,.08)' : 'transparent') + ';';

  const g = document.createElement('div');
  g.style.cssText = 'flex:1;min-width:0;';
  g.innerHTML =
    '<div style="font-size:15px;font-weight:700;text-transform:capitalize;color:' +
      (cejour ? 'var(--accent-text)' : passe ? 'var(--muted)' : 'var(--cream)') + ';">' +
      (sess.date ? libelleDate(sess.date) : 'Date à définir') +
      (sess.heureDebut ? ' · ' + sess.heureDebut : '') +
      (sess._rangJour ? ' <span style="font-size:11px;color:var(--orange);">' +
        'session ' + sess._rangJour + '/' + sess._totalJour + '</span>' : '') +
      (passe ? ' <span style="font-size:11px;">passée</span>' : '') +
    '</div>' +
    '<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5;">' +
      (sess.centre ? '🏁 ' + sess.centre.replace(/</g, '&lt;') : '🏁 centre à définir') +
      (sess.moniteur ? ' · 👤 ' + sess.moniteur.replace(/</g, '&lt;') : '') +
      (detailBoite ? ' · 🚗 ' + detailBoite : '') +
    '</div>';
  tete.appendChild(g);

  /* Le compte qui dit tout : combien de prêts sur combien de places */
  const n = document.createElement('div');
  const complet = (prets === sess.eleves.length && sess.eleves.length > 0);
  n.style.cssText = 'flex-shrink:0;border-radius:9px;padding:6px 11px;' +
    'font-size:14px;font-weight:800;background:' +
    (complet ? 'var(--orange)' : 'var(--navy)') + ';color:' +
    (complet ? '#0B0B0B' : 'var(--accent-text)') + ';';
  n.textContent = prets + '/' + sess.eleves.length;
  n.title = prets + ' prêt(s) sur ' + sess.eleves.length + ' place(s)';
  tete.appendChild(n);

  const fl = document.createElement('div');
  fl.style.cssText = 'flex-shrink:0;font-size:13px;color:var(--muted);transition:transform .2s;';
  fl.textContent = '▼';
  tete.appendChild(fl);

  bloc.appendChild(tete);

  const detail = document.createElement('div');
  detail.style.cssText = 'display:none;border-top:1px solid var(--line);';
  bloc.appendChild(detail);

  const ouvrir = oui => {
    detail.style.display = oui ? 'block' : 'none';
    fl.style.transform = oui ? 'rotate(180deg)' : 'none';
    sessionsOuvertes[sess.id] = oui;
    if(oui) remplirPlaces(detail, sess);
  };

  tete.addEventListener('click', () => ouvrir(detail.style.display === 'none'));
  if(sessionsOuvertes[sess.id]) ouvrir(true);

  return bloc;
}


/* L'écart entre deux passages, lu sur les places existantes */
function dureeSession(sess){
  const h = (sess.eleves || []).map(p => p.heure).filter(Boolean);
  if(h.length < 2) return 30;

  const m = t => {
    const x = String(t).match(/^(\d{1,2})[:h](\d{2})/);
    return x ? (+x[1] * 60 + +x[2]) : null;
  };
  const a = m(h[0]), b = m(h[1]);
  if(a === null || b === null || b <= a) return 30;
  return b - a;
}


function remplirPlaces(zone, sess){
  zone.innerHTML = '';
  sess.eleves.forEach(p => zone.appendChild(lignePlace(p, sess)));

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;' +
    'border-top:1px solid var(--line);';

  const bPlus = document.createElement('button');
  bPlus.className = 'btn btn-secondary';
  bPlus.style.cssText = 'width:auto;padding:7px 11px;font-size:12px;margin:0;';
  bPlus.textContent = '➕ Une place';
  bPlus.addEventListener('click', async () => {
    bPlus.disabled = true;
    try{
      /* La durée déduite des places existantes : la nouvelle prend
         l'heure qui suit, sans qu'on ait à la saisir. */
      await appelPrep({ action: 'sessionSet', id: sess.id, date: sess.date,
                        centre: sess.centre, heureDebut: sess.heureDebut,
                        places: sess.eleves.length + 1, duree: dureeSession(sess),
                        moniteur: sess.moniteur,
                        boite: sess.boite, inspecteur: sess.inspecteur,
                        par: ACCES.moniteur || '' });
      afficherSessionsPermis();
    }catch(e){ showToast('Impossible : ' + e.message); bPlus.disabled = false; }
  });
  r.appendChild(bPlus);

  const bMod = document.createElement('button');
  bMod.className = 'btn btn-secondary';
  bMod.style.cssText = 'width:auto;padding:7px 11px;font-size:12px;margin:0;';
  bMod.textContent = '✏️ La session';
  bMod.addEventListener('click', () => ouvrirEditeurSession(sess));
  r.appendChild(bMod);

  const bSup = document.createElement('button');
  bSup.className = 'btn btn-secondary';
  bSup.style.cssText = 'width:auto;padding:7px 11px;font-size:12px;margin:0;' +
    'color:var(--red);border-color:var(--red);';
  bSup.textContent = '🗑️ Supprimer';
  bSup.addEventListener('click', async () => {
    const n = sess.eleves.filter(x => x.eleve).length;
    if(!await confirmer('Supprimer cette session ?' +
        (n ? '\n\n' + n + ' élève(s) y sont inscrits.' : ''))) return;
    try{
      await appelPrep({ action: 'sessionDelete', id: sess.id });
      showToast('Session supprimée ✅');
      afficherSessionsPermis();
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
  r.appendChild(bSup);

  zone.appendChild(r);
}


/* Une place : l'élève, son heure, son état, ses boutons */
function lignePlace(p, sess){
  const etat = etatPlace(p, eleveDuBureau(p.eleve));
  const vide = !p.eleve;

  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:8px;align-items:center;padding:9px 14px;' +
    'border-bottom:1px solid rgba(255,255,255,.04);' +
    (vide ? 'background:rgba(255,255,255,.02);' : '');

  const h = document.createElement('div');
  h.style.cssText = 'width:52px;flex-shrink:0;font-size:13px;color:var(--muted);';
  h.textContent = p.heure || '—';
  l.appendChild(h);

  const nom = document.createElement('div');
  nom.style.cssText = 'flex:1;min-width:0;font-size:14px;line-height:1.4;cursor:pointer;';
  /* Sa fiche est-elle renseignée ? Un élève repris d'une ancienne
     date peut n'avoir aucune préparation : autant le dire. */
  const su = (typeof suiviDe === 'function' && p.eleve) ? suiviDe(p.eleve) : {};
  const ficheVide = !vide && !su.resteAPayer && !su.reservations &&
                    !su.relanceLe && !su.lecons2h && su.toutOk !== 'oui' &&
                    su.aRemplacer !== 'oui' && su.fairePoint !== 'oui';

  nom.innerHTML = vide
    ? '<span style="color:var(--muted);font-style:italic;">👻 Place libre — ' +
      'appuie pour y mettre un élève</span>'
    : '<strong style="color:' + etat.couleur + ';">' +
      p.eleve.replace(/</g, '&lt;') + '</strong>' +
      etiquetteBoite(boiteDe(p.eleve)) +
      (ficheVide ? ' <span style="font-size:11px;color:var(--warn-text);">' +
        '📝 fiche à remplir</span>' : '') +
      '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      etat.emoji + ' ' + etat.texte + '</div>';
  nom.addEventListener('click', () => ouvrirPlace(p, sess));
  l.appendChild(nom);

  if(!vide){
    /* Prévenu : le geste le plus fréquent, accessible directement */
    const bPrev = document.createElement('button');
    bPrev.className = 'btn btn-secondary';
    bPrev.style.cssText = 'width:auto;padding:5px 8px;font-size:14px;margin:0;flex-shrink:0;';
    bPrev.textContent = p.prevenu ? '📣' : '🔕';
    bPrev.title = p.prevenu ? 'Prévenu — appuie pour annuler' : 'Marquer comme prévenu';
    bPrev.addEventListener('click', async ev => {
      ev.stopPropagation();
      bPrev.disabled = true;
      try{
        /* On bascule d'abord, on enregistre ensuite : l'écran
           répond tout de suite, l'appel se fait derrière. */
        p.prevenu = !p.prevenu;
        redessinerSessions();
        await appelPrep({ action: 'sessionPlace', idSession: sess.id, rang: p.rang,
                          prevenu: p.prevenu ? 'oui' : '' });
      }catch(e){
        /* L'enregistrement a échoué : on remet comme avant */
        p.prevenu = !p.prevenu;
        redessinerSessions();
        showToast('Impossible : ' + e.message);
      }
    });
    l.appendChild(bPrev);

    const bEch = document.createElement('button');
    bEch.className = 'btn btn-secondary';
    bEch.style.cssText = 'width:auto;padding:5px 8px;font-size:14px;margin:0;flex-shrink:0;' +
      ((echangeEnCours && echangeEnCours.idSession === sess.id &&
        echangeEnCours.rang === p.rang) ? 'border-color:var(--orange);' : '');
    bEch.textContent = '🔄';
    bEch.title = 'Échanger de place';
    bEch.addEventListener('click', async ev => {
      ev.stopPropagation();
      await gererEchange(p, sess);
    });
    l.appendChild(bEch);
  }

  return l;
}


/* Retient une place, puis permute avec la suivante désignée */
async function gererEchange(p, sess){
  if(!echangeEnCours){
    echangeEnCours = { idSession: sess.id, rang: p.rang, eleve: p.eleve };
    showToast('Choisis la place avec qui échanger 🔄');
    afficherSessionsPermis();
    return;
  }

  if(echangeEnCours.idSession === sess.id && echangeEnCours.rang === p.rang){
    echangeEnCours = null;
    afficherSessionsPermis();
    return;
  }

  const depuis = echangeEnCours;
  echangeEnCours = null;

  /* La permutation se voit tout de suite : l'heure appartient à la
     place, seuls les élèves et leur état changent de côté. */
  const src = (sessionsPermis.find(s => s.id === depuis.idSession) || {}).eleves || [];
  const a = src.find(x => x.rang === depuis.rang);
  const b = p;

  if(a && b){
    ['eleve', 'prevenu', 'dossierOk', 'remarque'].forEach(cle => {
      const t = a[cle]; a[cle] = b[cle]; b[cle] = t;
    });
    redessinerSessions();
  }

  try{
    await appelPrep({ action: 'sessionPlace',
                      idSession: depuis.idSession, rang: depuis.rang,
                      echangeAvec: JSON.stringify({ idSession: sess.id, rang: p.rang }) });
    showToast('Échangés ✅');
  }catch(e){
    showToast('Échange impossible : ' + e.message);
    afficherSessionsPermis();          /* on relit, l'état est incertain */
  }
}


/* ============================================================
   LA FICHE D'UNE PLACE
   ============================================================ */

function ouvrirPlace(p, sess){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 94vw);max-height:88vh;overflow-y:auto;';

  const t = document.createElement('h3');
  t.innerHTML = (p.eleve ? p.eleve.replace(/</g, '&lt;') : 'Place libre') +
                etiquetteBoite(boiteDe(p.eleve));
  boite.appendChild(t);

  const st = document.createElement('div');
  st.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.5;';
  st.textContent = (sess.date ? libelleDate(sess.date) : '') +
    (p.heure ? ' à ' + p.heure : '') +
    (sess.centre ? ' · ' + sess.centre : '');
  boite.appendChild(st);

  boite.insertAdjacentHTML('beforeend',
    '<label for="plEleve">Élève sur cette place</label>' +
    '<input type="text" id="plEleve" list="listeEleves" autocomplete="off" ' +
      'placeholder="Laisse vide pour une place fantôme">' +
    '<div class="duo">' +
      '<div><label for="plHeure">Heure</label>' +
        '<input type="time" id="plHeure"></div>' +
      '<div><label for="plRem">Remarque</label>' +
        '<input type="text" id="plRem" placeholder="Ex : arrive en retard"></div>' +
    '</div>' +
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin:8px 0;font-weight:400;">' +
      '<input type="checkbox" id="plPrevenu" style="width:19px;height:19px;">' +
      '📣 Élève prévenu</label>' +
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:12px;font-weight:400;">' +
      '<input type="checkbox" id="plDossier" style="width:19px;height:19px;">' +
      '📁 Dossier vérifié</label>' +

    /* La préparation administrative : ce qui décide si l'élève
       passe ou si sa place doit être donnée à quelqu'un d'autre. */
    '<div style="border-top:1px solid var(--line);margin:6px 0 12px;' +
      'padding-top:12px;font-size:13px;font-weight:700;color:var(--accent-text);">' +
      '📋 Sa préparation</div>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:8px;font-weight:400;">' +
      '<input type="checkbox" id="plOk" style="width:19px;height:19px;">' +
      '✅ Tout est OK — il peut passer</label>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--warn-text);margin-bottom:8px;font-weight:400;">' +
      '<input type="checkbox" id="plRemplacer" style="width:19px;height:19px;">' +
      '🔄 À remplacer — sa place est à donner</label>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:8px;font-weight:400;">' +
      '<input type="checkbox" id="plPoint" style="width:19px;height:19px;">' +
      '❓ Faire le point avec lui</label>' +

    '<div class="duo">' +
      '<div><label for="plPay">Reste à payer</label>' +
        '<input type="text" id="plPay" inputmode="decimal" placeholder="Ex : 180"></div>' +
      '<div><label for="plQd">Paiement prévu le</label>' +
        '<input type="date" id="plQd"></div>' +
    '</div>' +
    '<div class="duo">' +
      '<div><label for="plL2">Leçons de 2h à poser</label>' +
        '<input type="text" id="plL2" inputmode="numeric" placeholder="Ex : 2"></div>' +
      '<div><label for="plL1">Leçons de 1h</label>' +
        '<input type="text" id="plL1" inputmode="numeric" placeholder="Ex : 1"></div>' +
    '</div>' +
    '<div class="duo">' +
      '<div><label for="plBoite">Boîte</label>' +
        '<select id="plBoite">' +
          '<option value="">— d\'après sa formation —</option>' +
          '<option value="bea">BEA — automatique</option>' +
          '<option value="bv">BV — manuelle</option>' +
        '</select></div>' +
      '<div><label for="plRel">Relancer le</label>' +
        '<input type="date" id="plRel"></div>' +
    '</div>' +
    '<div class="duo">' +
      '<div><label for="plNat">Nature du paiement</label>' +
        '<select id="plNat">' +
          '<option value="">— non précisé —</option>' +
          '<option value="solde">Solde du permis</option>' +
          '<option value="heures">Heures en plus</option>' +
          '<option value="accompagnement">Accompagnement</option>' +
          '<option value="presentation">Frais de présentation</option>' +
        '</select></div>' +
    '</div>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:8px;font-weight:400;">' +
      '<input type="checkbox" id="plAcc" style="width:19px;height:19px;">' +
      '🚗 Accompagnement à payer</label>' +

    '<label for="plRes">Réservations posées sur le planning</label>' +
    '<input type="text" id="plRes" ' +
      'placeholder="Ex : 2h le 12/09 + 2h le 18/09 + 1h le 20/09">' +

    '<label for="plAE">Auto-école à qui donner la date</label>' +
    '<input type="text" id="plAE" placeholder="Si la place part ailleurs">' +

    '<label for="plAut">Autre à prévoir</label>' +
    '<input type="text" id="plAut" placeholder="Ce qui reste à faire avant l\'examen">');

  boite.querySelector('#plEleve').value = p.eleve || '';
  boite.querySelector('#plHeure').value = p.heure || '';
  boite.querySelector('#plRem').value = p.remarque || '';
  boite.querySelector('#plPrevenu').checked = !!p.prevenu;
  boite.querySelector('#plDossier').checked = !!p.dossierOk;

  /* La préparation vient du suivi, partagée avec l'autre sous-onglet :
     ce qu'on coche ici se retrouve dans « Permis et places ». */
  const su = (typeof suiviDe === 'function' && p.eleve) ? suiviDe(p.eleve) : {};
  boite.querySelector('#plOk').checked = (su.toutOk === 'oui');
  boite.querySelector('#plRemplacer').checked = (su.aRemplacer === 'oui');
  boite.querySelector('#plPoint').checked = (su.fairePoint === 'oui');
  boite.querySelector('#plPay').value = su.resteAPayer || '';
  boite.querySelector('#plQd').value = su.paiementPrevu || '';
  boite.querySelector('#plL2').value = su.lecons2h || '';
  boite.querySelector('#plL1').value = su.lecons1h || '';
  boite.querySelector('#plAut').value = su.autre || '';
  boite.querySelector('#plRel').value = su.relanceLe || '';
  boite.querySelector('#plBoite').value = su.typeExamen || '';
  boite.querySelector('#plNat').value = su.nature || '';
  boite.querySelector('#plAcc').checked = (su.accompagnement === 'oui');
  boite.querySelector('#plRes').value = su.reservations || '';
  boite.querySelector('#plAE').value = su.autoEcole || '';

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  /* Retirer l'élève : la place redevient fantôme, elle ne disparaît pas */
  if(p.eleve){
    const bVider = document.createElement('button');
    bVider.className = 'btn btn-secondary';
    bVider.style.cssText = 'color:var(--warn-text);border-color:var(--orange);';
    bVider.textContent = '👻 Retirer';
    bVider.title = 'La place reste, elle redevient libre';
    bVider.addEventListener('click', async () => {
      if(!await confirmer('Retirer ' + p.eleve + ' de cette place ?\n\n' +
          'La place reste ouverte : elle redevient une place fantôme.')) return;
      try{
        Object.assign(p, { eleve: '', prevenu: false, dossierOk: false, remarque: '' });
        document.body.removeChild(fond);
        showToast('Place libérée 👻');
        redessinerSessions();
        await appelPrep({ action: 'sessionPlace', idSession: sess.id, rang: p.rang,
                          eleve: '', prevenu: '', dossierOk: '', remarque: '' });
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bVider);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '💾 Enregistrer';
  bOk.addEventListener('click', async () => {
    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      const nomSaisi = boite.querySelector('#plEleve').value.trim();
      const champsPlace = {
        eleve: nomSaisi,
        heure: boite.querySelector('#plHeure').value,
        remarque: boite.querySelector('#plRem').value.trim(),
        prevenu: boite.querySelector('#plPrevenu').checked ? 'oui' : '',
        dossierOk: boite.querySelector('#plDossier').checked ? 'oui' : ''
      };

      const champsSuivi = nomSaisi ? {
        datePermis: sess.date || '',
        centre: sess.centre || '',
        toutOk: boite.querySelector('#plOk').checked ? 'oui' : '',
        aRemplacer: boite.querySelector('#plRemplacer').checked ? 'oui' : '',
        fairePoint: boite.querySelector('#plPoint').checked ? 'oui' : '',
        resteAPayer: boite.querySelector('#plPay').value.trim(),
        paiementPrevu: boite.querySelector('#plQd').value,
        lecons2h: boite.querySelector('#plL2').value.trim(),
        lecons1h: boite.querySelector('#plL1').value.trim(),
        autre: boite.querySelector('#plAut').value.trim(),
        relanceLe: boite.querySelector('#plRel').value,
        typeExamen: boite.querySelector('#plBoite').value,
        nature: boite.querySelector('#plNat').value,
        accompagnement: boite.querySelector('#plAcc').checked ? 'oui' : '',
        reservations: boite.querySelector('#plRes').value.trim(),
        autoEcole: boite.querySelector('#plAE').value.trim()
      } : null;

      /* La place en mémoire suit tout de suite */
      Object.assign(p, {
        eleve: champsPlace.eleve,
        heure: champsPlace.heure,
        remarque: champsPlace.remarque,
        prevenu: champsPlace.prevenu === 'oui',
        dossierOk: champsPlace.dossierOk === 'oui'
      });

      /* Les deux enregistrements partent ENSEMBLE : en série, le
         moniteur attendait deux fois le réseau. */
      await Promise.all([
        appelPrep(Object.assign({ action: 'sessionPlace',
                                  idSession: sess.id, rang: p.rang }, champsPlace)),
        (champsSuivi && typeof majSuivi === 'function')
          ? majSuivi(nomSaisi, champsSuivi) : Promise.resolve()
      ]);

      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      redessinerSessions();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
      bOk.textContent = '💾 Enregistrer';
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#plEleve').focus(), 100);
}


/* ============================================================
   CRÉER OU MODIFIER UNE SESSION
   ============================================================ */

/* Les créneaux d'examen habituels, matin et après-midi. Nom propre
   au module : ec-messenger.js déclare déjà HEURES_EXAMEN, au format
   « 08h00 », et deux constantes du même nom se percutent. */
const CRENEAUX_SESSION = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00',
  '13:15', '13:45', '14:15', '14:45', '15:15', '15:45'
];


/* L'heure d'un créneau, côté écran : même calcul que le serveur,
   pour montrer les horaires avant même d'enregistrer. */
function heureDuCreneau(debut, duree, n){
  const m = String(debut || '').match(/^(\d{1,2})[:h](\d{2})/);
  if(!m) return '';
  const mins = (+m[1]) * 60 + (+m[2]) + (duree * n);
  const h = Math.floor(mins / 60) % 24;
  return String(h).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
}


function ouvrirEditeurSession(sess){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 94vw);max-height:88vh;overflow-y:auto;';

  const gens = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];

  boite.insertAdjacentHTML('beforeend',
    '<h3>' + (sess ? 'Modifier la session' : "Nouvelle session d'examen") + '</h3>' +
    '<div class="duo">' +
      '<div><label for="seDate">Date</label><input type="date" id="seDate"></div>' +
      '<div><label for="seHeure">Heure du 1er passage</label>' +
        /* Une liste plutôt qu'un datalist : les champs « time »
           ignorent les suggestions sur plusieurs navigateurs.
           Le dernier choix ouvre un champ libre. */
        '<select id="seHeureChoix">' +
          CRENEAUX_SESSION.map(h => '<option value="' + h + '">' +
                                 h.replace(':', 'h') + '</option>').join('') +
          '<option value="autre">⌨️ Autre heure…</option>' +
        '</select>' +
        '<input type="time" id="seHeure" style="display:none;margin-top:6px;">' +
      '</div>' +
    '</div>' +
    '<div class="duo">' +
      '<div><label for="sePlaces">Nombre de places</label>' +
        '<input type="number" id="sePlaces" min="1" max="20" value="4"></div>' +
      '<div><label for="seDuree">Minutes par passage</label>' +
        '<input type="number" id="seDuree" min="15" max="60" step="5" value="30"></div>' +
    '</div>' +
    '<label for="seCentre">Centre d\'examen</label>' +
    '<input type="text" id="seCentre" list="listeCentres" placeholder="Ex : Saint-Brieuc">' +
    '<datalist id="listeCentres">' +
      '<option value="Saint-Brieuc"></option><option value="Loudéac"></option>' +
    '</datalist>' +
    '<div class="duo">' +
      '<div><label for="seMon">Moniteur</label><select id="seMon">' +
        '<option value="">— à définir —</option>' +
        gens.map(g => '<option value="' + String(g).replace(/"/g, '&quot;') + '">' +
                      g + '</option>').join('') +
      '</select></div>' +
      '<div><label for="seBoite">Boîte</label><select id="seBoite">' +
        '<option value="">— les deux —</option>' +
        '<option value="bea">BEA — automatique</option>' +
        '<option value="bv">BV — manuelle</option>' +
      '</select></div>' +
    '</div>' +
    '<label for="seInsp">Inspecteur (facultatif)</label>' +
    '<input type="text" id="seInsp" placeholder="Son nom, si tu le connais">' +

    /* Les élèves dès la création : les poser un par un ensuite
       obligeait à rouvrir chaque place. */
    '<div style="border-top:1px solid var(--line);margin:14px 0 10px;' +
      'padding-top:12px;font-size:13px;font-weight:700;color:var(--accent-text);">' +
      '👥 Les élèves de cette session</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-bottom:8px;' +
      'line-height:1.5;">Juste les noms pour l\'instant. Leur fiche de ' +
      'préparation se remplit ensuite, place par place. Laisse vide pour ' +
      'garder une place fantôme.</div>' +
    '<div id="seEleves"></div>');

  /* Saint-Brieuc par défaut : c'est le centre de la plupart des
     sessions, et il reste modifiable. */
  if(!sess) boite.querySelector('#seCentre').value = 'Saint-Brieuc';

  /* La liste pilote le champ caché : le reste du formulaire lit
     toujours #seHeure, rien d'autre à changer. */
  const listeH = boite.querySelector('#seHeureChoix');
  const champH = boite.querySelector('#seHeure');

  const majDepuisListe = () => {
    if(listeH.value === 'autre'){
      champH.style.display = 'block';
      setTimeout(() => champH.focus(), 60);
    }else{
      champH.style.display = 'none';
      champH.value = listeH.value;
    }
    champH.dispatchEvent(new Event('input'));
  };

  listeH.addEventListener('change', majDepuisListe);
  /* 14h15 d'avance : le créneau le plus courant */
  listeH.value = '14:15';
  champH.value = '14:15';

  if(sess){
    boite.querySelector('#seDate').value = sess.date || '';
    boite.querySelector('#seHeure').value = sess.heureDebut || '';
    /* Une heure hors liste bascule sur le champ libre */
    if(sess.heureDebut && CRENEAUX_SESSION.indexOf(sess.heureDebut) === -1){
      boite.querySelector('#seHeureChoix').value = 'autre';
      boite.querySelector('#seHeure').style.display = 'block';
    }else if(sess.heureDebut){
      boite.querySelector('#seHeureChoix').value = sess.heureDebut;
    }
    boite.querySelector('#sePlaces').value = sess.eleves.length || 4;
    boite.querySelector('#seCentre').value = sess.centre || '';
    boite.querySelector('#seMon').value = sess.moniteur || '';
    boite.querySelector('#seBoite').value = sess.boite || '';
    boite.querySelector('#seInsp').value = sess.inspecteur || '';
  }

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin:8px 0 12px;line-height:1.5;';
  aide.textContent = "Les créneaux se calculent seuls à partir de l'heure de début " +
    'et de la durée.';
  boite.appendChild(aide);

  /* Un champ par place, redessiné quand le nombre change */
  const zEleves = boite.querySelector('#seEleves');
  const champNombre = boite.querySelector('#sePlaces');
  const champHeure = boite.querySelector('#seHeure');
  const champDuree = boite.querySelector('#seDuree');

  const refaireChamps = () => {
    const n = Math.max(1, Math.min(20, parseInt(champNombre.value, 10) || 1));
    const avant = [...zEleves.querySelectorAll('.seEleve')].map(x => x.value);

    zEleves.innerHTML = '';
    for(let i = 0; i < n; i++){
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';

      const h = document.createElement('span');
      h.className = 'seHeurePlace';
      h.style.cssText = 'width:52px;flex-shrink:0;font-size:13px;color:var(--muted);';
      h.textContent = heureDuCreneau(champHeure.value, +champDuree.value || 30, i) || '—';
      l.appendChild(h);

      const e = document.createElement('input');
      e.type = 'text';
      e.className = 'seEleve';
      e.setAttribute('list', 'listeEleves');
      e.setAttribute('autocomplete', 'off');
      e.placeholder = 'Place ' + (i + 1) + ' — laisse vide si libre';
      e.style.cssText = 'flex:1;min-width:0;margin:0;padding:9px 10px;font-size:15px;';
      /* Ce qui était déjà saisi ne se perd pas */
      if(avant[i] !== undefined) e.value = avant[i];
      else if(sess && sess.eleves[i]) e.value = sess.eleves[i].eleve || '';
      l.appendChild(e);

      zEleves.appendChild(l);
    }
  };

  /* Les heures suivent l'heure de début et la durée */
  const majHeures = () => {
    [...zEleves.querySelectorAll('.seHeurePlace')].forEach((h, i) => {
      h.textContent = heureDuCreneau(champHeure.value, +champDuree.value || 30, i) || '—';
    });
  };

  champNombre.addEventListener('input', refaireChamps);
  champHeure.addEventListener('input', majHeures);
  champDuree.addEventListener('input', majHeures);
  refaireChamps();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = sess ? '💾 Enregistrer' : '➕ Créer la session';
  bOk.addEventListener('click', async () => {
    const date = boite.querySelector('#seDate').value;
    if(!date){ showToast('Indique la date de la session.'); return; }

    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      /* La réponse porte l'identifiant de la session : sans lui, on
         ne sait pas où poser les élèves. */
      const r = await appelPrep({
        action: 'sessionSet',
        id: sess ? sess.id : '',
        date: date,
        heureDebut: boite.querySelector('#seHeure').value,
        places: boite.querySelector('#sePlaces').value,
        duree: boite.querySelector('#seDuree').value,
        centre: boite.querySelector('#seCentre').value.trim(),
        moniteur: boite.querySelector('#seMon').value,
        boite: boite.querySelector('#seBoite').value,
        inspecteur: boite.querySelector('#seInsp').value.trim(),
        par: ACCES.moniteur || ''
      });
      /* Les élèves saisis, posés place par place. Le serveur vient
         de créer les places : on les remplit dans la foulée. */
      const noms = [...zEleves.querySelectorAll('.seEleve')].map(x => x.value.trim());
      const idS = (r && r.id) || (sess && sess.id);

      if(idS && noms.some(Boolean)){
        bOk.textContent = 'Inscription des élèves…';
        await Promise.all(noms.map((nom, i) => {
          if(!nom) return Promise.resolve();
          return appelPrep({ action: 'sessionPlace', idSession: idS, rang: i + 1,
                             eleve: nom }).catch(() => null);
        }));

        /* Leur date d'examen suit : c'est elle que lisent le bureau
           et le message Messenger. */
        if(typeof majSuivi === 'function'){
          await Promise.all(noms.filter(Boolean).map(nom =>
            majSuivi(nom, { datePermis: date,
                            centre: boite.querySelector('#seCentre').value.trim() })
              .catch(() => null)));
        }
      }

      document.body.removeChild(fond);
      showToast(sess ? 'Session modifiée ✅' : 'Session créée ✅');
      afficherSessionsPermis();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
      bOk.textContent = sess ? '💾 Enregistrer' : '➕ Créer la session';
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#seDate').focus(), 100);
}


/* L'élève dans les données du bureau, pour lire sa préparation */
function eleveDuBureau(nom){
  if(!nom || typeof etatBureau === 'undefined') return null;
  return (etatBureau.eleves || [])
    .find(x => normaliserMot(x.eleve) === normaliserMot(nom)) || null;
}


/* ============================================================
   REPRISE DES DATES DÉJÀ POSÉES

   Les dates d'examen vivent à deux endroits : la fiche de suivi,
   et la note du moniteur — « Examen du permis fixé au… ». Le
   serveur ne sait lire que la première ; la reprise se fait donc
   ici, où les deux sources sont déjà en mémoire.
   ============================================================ */
async function reprendreDatesExistantes(){
  /* Les élèves du bureau, s'ils ne sont pas encore chargés */
  if(typeof chargerBureau === 'function' &&
     (!etatBureau.eleves || !etatBureau.eleves.length)){
    await chargerBureau(false);
  }

  const parJour = {};

  const ajouter = (nom, iso, s) => {
    if(!nom || !iso) return;

    /* On regroupe sur la DATE seule : un élève sans centre renseigné
       passe le même jour que les autres, il n'a pas à former une
       session à part. Le centre du premier qui l'indique vaut pour
       toute la journée. */
    const cle = iso;
    if(!parJour[cle]){
      parJour[cle] = { date: iso, centre: (s && s.centre) || '',
                       boite: (s && s.typeExamen) || '', eleves: [] };
    }
    if(!parJour[cle].centre && s && s.centre) parJour[cle].centre = s.centre;
    if(!parJour[cle].boite && s && s.typeExamen) parJour[cle].boite = s.typeExamen;
    if(parJour[cle].eleves.some(x => normaliserMot(x.eleve) === normaliserMot(nom))) return;
    parJour[cle].eleves.push({
      eleve: nom,
      heure: (s && s.heurePermis) || '',
      dossierOk: !!(s && s.toutOk === 'oui')
    });
  };

  /* Source 1 : la fiche de suivi */
  (etatBureau.suivi || []).forEach(s => {
    if(!s.datePermis) return;
    ajouter(s.eleve, dateFrVersIso(s.datePermis) || s.datePermis, s);
  });

  /* Source 2 : la note du moniteur, que le serveur ne lit pas */
  (etatBureau.eleves || []).forEach(e => {
    const a = analyserNote(e.note || '');
    if(a.permis !== 'prevu' || !a.permisDate) return;
    const s = (etatBureau.suivi || []).find(
      y => normaliserMot(y.eleve) === normaliserMot(e.eleve));
    ajouter(e.eleve, dateFrVersIso(a.permisDate) || a.permisDate, s);
  });

  const jours = Object.keys(parJour);
  if(!jours.length) return { creees: 0, places: 0 };

  /* Ce qui existe déjà, pour ne rien dupliquer */
  const dejaPlaces = {};
  (sessionsPermis || []).forEach(s => {
    s.eleves.forEach(p => { if(p.eleve) dejaPlaces[normaliserMot(p.eleve)] = true; });
  });

  let creees = 0, places = 0;

  for(const k of jours){
    const g = parJour[k];
    const aPlacer = g.eleves.filter(x => !dejaPlaces[normaliserMot(x.eleve)]);
    if(!aPlacer.length) continue;

    aPlacer.sort((a, b) => String(a.heure).localeCompare(String(b.heure)));

    /* Une session par date et centre : le serveur la crée si elle
       manque, et complète la sienne sinon. */
    /* Une session existante ce jour-là accueille les nouveaux */
    const existe = (sessionsPermis || []).find(s => s.date === g.date);

    let idS = existe ? existe.id : '';
    if(!existe){
      const r = await appelPrep({
        action: 'sessionSet', date: g.date, centre: g.centre,
        heureDebut: aPlacer[0].heure || '', places: aPlacer.length,
        duree: 30, boite: g.boite, par: ACCES.moniteur || ''
      });
      idS = r && r.id;
      creees++;
    }
    if(!idS) continue;

    /* Les places, une par élève */
    const depart = existe ? existe.eleves.length : 0;
    for(let i = 0; i < aPlacer.length; i++){
      const rang = existe ? (depart + i + 1) : (i + 1);
      if(existe){
        /* La session grandit d'une place */
        await appelPrep({ action: 'sessionSet', id: idS, date: g.date,
                          centre: g.centre, heureDebut: existe.heureDebut,
                          places: depart + i + 1, moniteur: existe.moniteur,
                          boite: existe.boite, par: ACCES.moniteur || '' });
      }
      await appelPrep({ action: 'sessionPlace', idSession: idS, rang: rang,
                        eleve: aPlacer[i].eleve, heure: aPlacer[i].heure,
                        dossierOk: aPlacer[i].dossierOk ? 'oui' : '' });
      places++;
    }
  }

  return { creees: creees, places: places };
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-sessions.js'] = true;
