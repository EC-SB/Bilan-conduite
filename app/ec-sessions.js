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
  if(!su.reservations) manque.push('pas de réservation posée');

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
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

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

  const auj = todayLocal();
  const compte = document.createElement('div');
  compte.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;';
  const total = sessionsPermis.reduce((n, s) => n + s.eleves.filter(x => x.eleve).length, 0);
  const vides = sessionsPermis.reduce((n, s) => n + s.eleves.filter(x => !x.eleve).length, 0);
  compte.textContent = sessionsPermis.length + ' session(s) · ' + total + ' élève(s)' +
    (vides ? ' · ' + vides + ' place(s) fantôme(s)' : '');
  zone.appendChild(compte);

  sessionsPermis.forEach(s => zone.appendChild(blocSession(s, auj)));
}


/* Une session : son en-tête et ses places */
function blocSession(sess, auj){
  const passe = sess.date && sess.date < auj;
  const cejour = sess.date === auj;

  const prets = sess.eleves.filter(x => {
    return etatPlace(x, eleveDuBureau(x.eleve)).cle === 'ok';
  }).length;

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
      (passe ? ' <span style="font-size:11px;">passée</span>' : '') +
    '</div>' +
    '<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5;">' +
      (sess.centre ? '🏁 ' + sess.centre.replace(/</g, '&lt;') : '🏁 centre à définir') +
      (sess.moniteur ? ' · 👤 ' + sess.moniteur.replace(/</g, '&lt;') : '') +
      (sess.boite ? ' · ' + sess.boite.toUpperCase() : '') +
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
      await appelPrep({ action: 'sessionSet', id: sess.id, date: sess.date,
                        centre: sess.centre, heureDebut: sess.heureDebut,
                        places: sess.eleves.length + 1, moniteur: sess.moniteur,
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
                    su.aRemplacer !== 'oui';

  nom.innerHTML = vide
    ? '<span style="color:var(--muted);font-style:italic;">👻 Place libre — ' +
      'appuie pour y mettre un élève</span>'
    : '<strong style="color:' + etat.couleur + ';">' +
      p.eleve.replace(/</g, '&lt;') + '</strong>' +
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
        await appelPrep({ action: 'sessionPlace', idSession: sess.id, rang: p.rang,
                          prevenu: p.prevenu ? '' : 'oui' });
        p.prevenu = !p.prevenu;
        afficherSessionsPermis();
      }catch(e){ showToast('Impossible : ' + e.message); bPrev.disabled = false; }
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

  try{
    await appelPrep({ action: 'sessionPlace',
                      idSession: depuis.idSession, rang: depuis.rang,
                      echangeAvec: JSON.stringify({ idSession: sess.id, rang: p.rang }) });
    showToast('Échangés ✅');
  }catch(e){
    showToast('Échange impossible : ' + e.message);
  }
  afficherSessionsPermis();
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
  t.textContent = p.eleve || 'Place libre';
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
      '<input type="checkbox" id="plRem" style="width:19px;height:19px;">' +
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
      '<div><label for="plRel">Relancer le</label>' +
        '<input type="date" id="plRel"></div>' +
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
  boite.querySelector('#plRem').checked = (su.aRemplacer === 'oui');
  boite.querySelector('#plPoint').checked = (su.fairePoint === 'oui');
  boite.querySelector('#plPay').value = su.resteAPayer || '';
  boite.querySelector('#plQd').value = su.paiementPrevu || '';
  boite.querySelector('#plL2').value = su.lecons2h || '';
  boite.querySelector('#plL1').value = su.lecons1h || '';
  boite.querySelector('#plAut').value = su.autre || '';
  boite.querySelector('#plRel').value = su.relanceLe || '';
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
        await appelPrep({ action: 'sessionPlace', idSession: sess.id, rang: p.rang,
                          eleve: '', prevenu: '', dossierOk: '', remarque: '' });
        document.body.removeChild(fond);
        showToast('Place libérée 👻');
        afficherSessionsPermis();
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
      await appelPrep({ action: 'sessionPlace', idSession: sess.id, rang: p.rang,
                        eleve: boite.querySelector('#plEleve').value.trim(),
                        heure: boite.querySelector('#plHeure').value,
                        remarque: boite.querySelector('#plRem').value.trim(),
                        prevenu: boite.querySelector('#plPrevenu').checked ? 'oui' : '',
                        dossierOk: boite.querySelector('#plDossier').checked ? 'oui' : '' });

      /* La préparation rejoint le suivi, pas la session : c'est une
         donnée de l'élève, elle le suit s'il change de date. */
      const nom = boite.querySelector('#plEleve').value.trim();
      if(nom && typeof majSuivi === 'function'){
        await majSuivi(nom, {
          datePermis: sess.date || '',
          centre: sess.centre || '',
          toutOk: boite.querySelector('#plOk').checked ? 'oui' : '',
          aRemplacer: boite.querySelector('#plRem').checked ? 'oui' : '',
          fairePoint: boite.querySelector('#plPoint').checked ? 'oui' : '',
          resteAPayer: boite.querySelector('#plPay').value.trim(),
          paiementPrevu: boite.querySelector('#plQd').value,
          lecons2h: boite.querySelector('#plL2').value.trim(),
          lecons1h: boite.querySelector('#plL1').value.trim(),
          autre: boite.querySelector('#plAut').value.trim(),
          relanceLe: boite.querySelector('#plRel').value,
          nature: boite.querySelector('#plNat').value,
          accompagnement: boite.querySelector('#plAcc').checked ? 'oui' : '',
          reservations: boite.querySelector('#plRes').value.trim(),
          autoEcole: boite.querySelector('#plAE').value.trim()
        });
      }

      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      afficherSessionsPermis();
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
        '<input type="time" id="seHeure"></div>' +
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
    '<input type="text" id="seInsp" placeholder="Son nom, si tu le connais">');

  if(sess){
    boite.querySelector('#seDate').value = sess.date || '';
    boite.querySelector('#seHeure').value = sess.heureDebut || '';
    boite.querySelector('#sePlaces').value = sess.eleves.length || 4;
    boite.querySelector('#seCentre').value = sess.centre || '';
    boite.querySelector('#seMon').value = sess.moniteur || '';
    boite.querySelector('#seBoite').value = sess.boite || '';
    boite.querySelector('#seInsp').value = sess.inspecteur || '';
  }

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin:8px 0 12px;line-height:1.5;';
  aide.textContent = "Les créneaux se calculent seuls à partir de l'heure de début " +
    "et de la durée. Chaque place reste vide tant qu'on n'y met personne.";
  boite.appendChild(aide);

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
      await appelPrep({
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
