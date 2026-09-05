/* Déployé le 05/09/2026 à 10:30 — v883 */
/* ============================================================
   ec-handicap.js
   Le suivi des élèves en situation de handicap.

   Un dossier de codification passe par une suite d'étapes, et
   chacune attend quelque chose de quelqu'un : le médecin agréé,
   la DDTM, l'élève, ou nous. Ce qui coince se voit en tête.

   Les données vivent dans le classeur « Suivi élèves », onglet
   HANDICAP. Rien n'est recopié.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let handicapEleves = [];
let handicapEquipements = [];
let filtreHandicap = '';

/* Le parcours, dans l'ordre où il se déroule */
const ETAPES_HANDICAP = [
  { cle:'certificat',   nom:'Certificat médical',       court:'Médical' },
  { cle:'evalPlacee',   nom:'Évaluation placée',        court:'Éval. placée' },
  { cle:'docRempli',    nom:'Document évaluation rempli', court:'Doc rempli' },
  { cle:'dossierDdtm',  nom:'Dossier envoyé à la DDTM', court:'DDTM envoyé' },
  { cle:'codification', nom:'Codification faite',       court:'Codification' },
  { cle:'demandeTitre', nom:'Demande de titre à faire', court:'Titre' }
];

/* ============================================================
   LE SUIVI HANDICAP, LU À UN SEUL ENDROIT

   Trois écrans le demandent maintenant : l'écran ♿ lui-même, le
   dossier de l'élève, et la carte de « Mes prochains cours ». Un
   résumé recalculé dans chacun finirait par ne pas dire la même
   chose — c'est la faute que ce dossier passe ses journées à
   réparer.

   Le chargement se garde cinq minutes : trois écrans ouverts à la
   suite ne doivent pas faire trois appels, et un suivi handicap ne
   bouge pas dans la minute.
   ============================================================ */
let handicapCharge = 0;
let handicapEnCours = null;

async function chargerHandicapSiBesoin(forcer){
  if(!forcer && handicapEleves.length && Date.now() - handicapCharge < 300000){
    return handicapEleves;
  }
  /* Deux écrans qui s'ouvrent ensemble ne lancent qu'un seul appel :
     le second attend le premier. */
  if(handicapEnCours) return handicapEnCours;

  handicapEnCours = (async () => {
    try{
      const d = await appelPrep({ action: 'handicapList' });
      if(d && d.status === 'error') throw new Error(d.message || 'Lecture impossible');
      handicapEleves = (d && d.eleves) || [];
      handicapEquipements = (d && d.equipements) || [];
      handicapCharge = Date.now();
    }finally{
      handicapEnCours = null;
    }
    return handicapEleves;
  })();

  return handicapEnCours;
}

/* Le suivi d'un élève, quel que soit l'ordre de son nom.

   ⚠️ La feuille du suivi handicap est tenue en « Nom Prénom », le
   reste de l'outil en « Prénom Nom ». « trouverPersonne » essaie
   l'exact sur toute la liste avant d'essayer l'ordre des mots. */
function suiviHandicapDe(nom){
  if(typeof trouverPersonne === 'function'){
    return trouverPersonne(handicapEleves, nom);
  }
  return handicapEleves.find(x =>
    normaliserMot(x.eleve || '') === normaliserMot(nom || '')) || null;
}

/* Tout ce qu'un écran peut vouloir en dire, calculé une seule fois.
   Rend null quand cet élève n'a pas de suivi. */
function resumeHandicap(nom){
  const e = suiviHandicapDe(nom);
  if(!e) return null;

  /* « Demande de titre » clôt le dossier : elle ne compte pas dans
     l'avancement, exactement comme sur l'écran ♿. */
  const suivies = ETAPES_HANDICAP.filter(x => x.cle !== 'demandeTitre');
  const faites = suivies.filter(x => e[x.cle]).length;

  return {
    ligne: e,
    eleve: e.eleve,
    /* Le nom tel qu'il est rangé dans la feuille, quand il diffère
       de celui qu'on a demandé : le bureau doit pouvoir s'y
       retrouver sans le chercher. */
    nomRange: (normaliserMot(e.eleve || '') !== normaliserMot(nom || ''))
      ? e.eleve : '',
    parcours: e.dejaPermis ? 'Régularisation'
            : (e.pasEncore ? 'Codification' : ''),
    faites: faites,
    total: suivies.length,
    fini: faites >= suivies.length,
    pathologie: String(e.pathologie || '').trim(),
    equipement: String(e.equipement || '').trim(),
    commentaire: String(e.commentaire || '').trim(),
    etapes: ETAPES_HANDICAP.map(x => ({
      cle: x.cle, nom: x.nom, court: x.court, fait: !!e[x.cle],
      date: (x.cle === 'evalPlacee') ? String(e.dateEval || '').trim()
          : (x.cle === 'dossierDdtm') ? String(e.dateDdtm || '').trim() : ''
    })),
    /* LE RENDEZ-VOUS DDTM, ET SON ABSENCE.

       « S'il n'est pas fixé, mettre rendez-vous à prendre. » Un
       champ vide ne dit rien ; « à prendre » dit qu'il manque
       quelque chose à faire, et c'est toute la différence entre
       une information et un blanc. */
    ddtm: {
      envoye: !!e.dossierDdtm,
      date: String(e.dateDdtm || '').trim(),
      aPrendre: !String(e.dateDdtm || '').trim()
    }
  };
}

/* La même chose en une ligne, pour une carte de cours. */
function ligneHandicapCourte(r){
  if(!r) return '';
  const bouts = [];
  if(r.parcours) bouts.push(r.parcours);
  bouts.push(r.faites + '/' + r.total + ' étapes');
  bouts.push(r.ddtm.aPrendre ? '📋 RDV DDTM à prendre'
                             : '📋 DDTM le ' + r.ddtm.date);
  if(r.equipement) bouts.push(r.equipement.split('\n')[0]);
  return bouts.join(' · ');
}


async function afficherHandicap(){
  const zone = $('handicapZone');
  if(!zone) return;

  zone.innerHTML = htmlAttente('Lecture du suivi handicap…');
  try{
    const d = await appelPrep({ action: 'handicapList' });
    if(d && d.status === 'error') throw new Error(d.message || 'Lecture impossible');
    handicapEleves = (d && d.eleves) || [];
    handicapEquipements = (d && d.equipements) || [];
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' +
      String(e.message || e).replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';

  /* Ce qui attend une action : c'est ce qu'on vient voir */
  const alerte = blocAttenteHandicap();
  if(alerte) zone.appendChild(alerte);

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-bottom:10px;padding:12px;font-size:13px;';
  b.textContent = '➕ Ajouter un élève';
  b.addEventListener('click', () => ouvrirFicheHandicap(null));
  zone.appendChild(b);

  if(handicapEleves.length > 4){
    const ch = document.createElement('input');
    ch.type = 'search';
    ch.placeholder = '🔍 Nom, pathologie, équipement…';
    ch.value = filtreHandicap;
    ch.style.cssText = 'margin-bottom:10px;font-size:14px;';
    ch.addEventListener('input', () => {
      filtreHandicap = ch.value;
      dessinerHandicap();
    });
    zone.appendChild(ch);
  }

  const zl = document.createElement('div');
  zl.id = 'listeHandicap';
  zone.appendChild(zl);

  dessinerHandicap();
}


/* Ce qui bloque, par élève */
function cequiManque(e){
  const manques = [];

  if(!e.certificat) manques.push('visite médicale');
  else if(!e.evalPlacee) manques.push('évaluation à placer');
  else if(!e.docRempli) manques.push('document d\'évaluation');
  else if(!e.dossierDdtm) manques.push('dossier DDTM à envoyer');
  else if(!e.codification) manques.push('codification');
  else if(e.demandeTitre) manques.push('demande de titre');

  return manques;
}


function blocAttenteHandicap(){
  const enAttente = handicapEleves
    .map(e => ({ e: e, manques: cequiManque(e) }))
    .filter(x => x.manques.length);

  if(!enAttente.length) return null;

  const d = document.createElement('details');
  d.open = true;
  d.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:10px 12px;margin-bottom:12px;';
  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;' +
    'color:var(--accent-text);">⏳ ' + enAttente.length +
    ' dossier(s) en attente</summary>';

  const z = document.createElement('div');
  z.style.marginTop = '10px';

  enAttente.forEach(x => {
    const l = document.createElement('div');
    l.style.cssText = 'font-size:13px;line-height:1.5;padding:5px 0;' +
      'cursor:pointer;';
    l.innerHTML = '<strong>' + x.e.eleve.replace(/</g, '&lt;') + '</strong>' +
      ' — <span style="color:var(--muted);">' + x.manques.join(' · ') + '</span>';
    l.addEventListener('click', () => ouvrirFicheHandicap(x.e));
    z.appendChild(l);
  });

  d.appendChild(z);
  return d;
}


function dessinerHandicap(){
  const zone = $('listeHandicap');
  if(!zone) return;
  zone.innerHTML = '';

  const mots = normaliserMot(String(filtreHandicap || '').trim())
    .split(/\s+/).filter(Boolean);

  const liste = handicapEleves.filter(e => {
    if(!mots.length) return true;
    const tout = normaliserMot(
      [e.eleve, e.pathologie, e.equipement, e.commentaire].join(' '));
    return mots.every(m => tout.indexOf(m) !== -1);
  });

  if(!liste.length){
    zone.innerHTML = '<div class="empty">' +
      (handicapEleves.length ? 'Aucun élève ne correspond.'
                             : 'Aucun élève dans ce suivi.') + '</div>';
    return;
  }

  /* Les compteurs du haut du tableau, comme dans le classeur */
  const reg = handicapEleves.filter(x => x.dejaPermis).length;
  const cod = handicapEleves.filter(x => x.pasEncore).length;

  const cpt = document.createElement('div');
  cpt.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;';
  cpt.textContent = reg + ' régularisation(s) · ' + cod + ' codification(s)' +
    (liste.length !== handicapEleves.length
      ? ' · ' + liste.length + ' affiché(s)' : '');
  zone.appendChild(cpt);

  liste.forEach(e => zone.appendChild(ligneHandicap(e)));
}


function ligneHandicap(e){
  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--line);border-radius:11px;' +
    'padding:10px 12px;margin-bottom:8px;';

  /* Où en est le dossier, en un coup d'œil */
  const faites = ETAPES_HANDICAP.filter(x => x.cle !== 'demandeTitre' && e[x.cle]).length;
  const total = ETAPES_HANDICAP.length - 1;
  const fini = (faites >= total);

  const som = document.createElement('summary');
  som.style.cssText = 'cursor:pointer;font-size:15px;font-weight:700;' +
    'color:var(--cream);list-style:none;';
  som.innerHTML = (fini ? '✅ ' : '♿ ') + e.eleve.replace(/</g, '&lt;') +
    '<div style="font-size:11px;font-weight:400;color:var(--muted);' +
      'margin-top:3px;">' +
      (e.dejaPermis ? 'Régularisation' : (e.pasEncore ? 'Codification' : '—')) +
      ' · ' + faites + '/' + total + ' étape(s)' +
      (e.pathologie ? ' · ' + e.pathologie.split('\n')[0].replace(/</g, '&lt;') : '') +
    '</div>';
  d.appendChild(som);

  const corps = document.createElement('div');
  corps.style.marginTop = '10px';

  /* La pathologie et l'équipement : ce que le moniteur doit savoir
     avant de monter dans la voiture. */
  if(e.pathologie){
    corps.appendChild(blocTexteHandicap('🩺 Pathologie', e.pathologie));
  }
  if(e.equipement){
    corps.appendChild(blocTexteHandicap('🔧 Équipement', e.equipement));
  }

  /* Les étapes, cochables sur place */
  const ze = document.createElement('div');
  ze.style.cssText = 'margin:10px 0;padding:9px 0;' +
    'border-top:1px solid rgba(255,255,255,.06);' +
    'border-bottom:1px solid rgba(255,255,255,.06);';

  ETAPES_HANDICAP.forEach(et => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:10px;' +
      'text-transform:none;font-size:14px;color:var(--cream);margin:0 0 7px;' +
      'font-weight:400;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!e[et.cle];
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin:0;';
    cb.addEventListener('change', async () => {
      cb.disabled = true;
      try{
        await appelPrep({ action: 'handicapSet', ligne: e.ligne,
                          eleve: e.eleve, champ: et.cle,
                          valeur: cb.checked });
        e[et.cle] = cb.checked;
        showToast('Enregistré ✅');
        afficherHandicap();
      }catch(err){
        cb.checked = !cb.checked;
        showToast('Impossible : ' + err.message);
      }
      cb.disabled = false;
    });
    l.appendChild(cb);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = et.nom;
    l.appendChild(t);

    /* Les dates qui accompagnent certaines étapes */
    if(et.cle === 'evalPlacee' && e.dateEval){
      const dt = document.createElement('span');
      dt.style.cssText = 'font-size:11px;color:var(--accent-text);flex-shrink:0;';
      dt.textContent = e.dateEval;
      l.appendChild(dt);
    }
    if(et.cle === 'dossierDdtm' && e.dateDdtm){
      const dt = document.createElement('span');
      dt.style.cssText = 'font-size:11px;color:var(--accent-text);flex-shrink:0;';
      dt.textContent = 'RDV ' + e.dateDdtm;
      l.appendChild(dt);
    }

    ze.appendChild(l);
  });
  corps.appendChild(ze);

  if(e.commentaire){
    corps.appendChild(blocTexteHandicap('📝 Commentaire', e.commentaire));
  }

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;margin-top:10px;';

  const bMod = document.createElement('button');
  bMod.className = 'btn btn-secondary';
  bMod.style.cssText = 'flex:1;padding:10px;font-size:13px;margin:0;';
  bMod.textContent = '✏️ Modifier';
  bMod.addEventListener('click', () => ouvrirFicheHandicap(e));
  r.appendChild(bMod);

  const bSup = document.createElement('button');
  bSup.className = 'btn btn-secondary';
  bSup.style.cssText = 'width:auto;padding:10px 12px;font-size:13px;margin:0;' +
    'flex-shrink:0;color:var(--red);border-color:var(--red);';
  bSup.textContent = '🗑️';
  bSup.addEventListener('click', async () => {
    if(!await confirmer('Retirer ' + e.eleve + ' du suivi handicap ?\n\n' +
        'La ligne sera supprimée du classeur.')) return;
    try{
      await appelPrep({ action: 'handicapDelete', ligne: e.ligne });
      showToast('Retiré ✅');
      afficherHandicap();
    }catch(err){ showToast('Impossible : ' + err.message); }
  });
  r.appendChild(bSup);

  corps.appendChild(r);
  d.appendChild(corps);
  return d;
}


function blocTexteHandicap(titre, texte){
  const d = document.createElement('div');
  d.style.cssText = 'margin-bottom:9px;';
  d.innerHTML = '<div style="font-size:11px;color:var(--muted);' +
    'margin-bottom:3px;">' + titre + '</div>' +
    '<div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">' +
    String(texte).replace(/</g, '&lt;') + '</div>';
  return d;
}


/* ============================================================
   LA FICHE

   Un élève, son dossier, son équipement. L'équipement se coche
   plutôt que de s'écrire : la liste vient du classeur.
   ============================================================ */

function ouvrirFicheHandicap(e){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 95vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML =
    '<h3>' + (e ? '✏️ ' + e.eleve.replace(/</g, '&lt;')
                : '➕ Nouvel élève') + '</h3>' +

    (e ? '' :
      '<label for="hdNom">Nom et prénom</label>' +
      '<input type="text" id="hdNom" list="listeEleves" autocomplete="off" ' +
        'placeholder="NOM Prénom">') +

    '<label>Sa situation</label>' +
    '<div style="display:flex;gap:8px;margin-bottom:14px;">' +
      '<label style="flex:1;display:flex;align-items:center;gap:8px;' +
        'text-transform:none;font-size:14px;color:var(--cream);margin:0;' +
        'font-weight:400;">' +
        '<input type="radio" name="hdSit" value="deja" ' +
          'style="width:18px;height:18px;margin:0;">Déjà le permis</label>' +
      '<label style="flex:1;display:flex;align-items:center;gap:8px;' +
        'text-transform:none;font-size:14px;color:var(--cream);margin:0;' +
        'font-weight:400;">' +
        '<input type="radio" name="hdSit" value="pas" ' +
          'style="width:18px;height:18px;margin:0;">Pas encore</label>' +
    '</div>' +

    '<label for="hdPatho">🩺 Pathologie</label>' +
    '<textarea id="hdPatho" rows="3" ' +
      'placeholder="Ce que le moniteur doit savoir"></textarea>' +

    '<label>🔧 Équipement à prévoir</label>' +
    '<div id="hdEquip" style="margin-bottom:14px;"></div>' +

    '<div class="duo">' +
      '<div><label for="hdDateEval">Date évaluation</label>' +
        '<input type="text" id="hdDateEval" placeholder="Ex : 28/08"></div>' +
      '<div><label for="hdDateDdtm">Date RDV DDTM</label>' +
        '<input type="text" id="hdDateDdtm" placeholder="Ex : 16/06 14h"></div>' +
    '</div>' +

    '<label for="hdComm">📝 Commentaire</label>' +
    '<textarea id="hdComm" rows="5" ' +
      'placeholder="Ce qui reste à faire, qui prévenir, les codes…"></textarea>';

  /* L'équipement : des cases, pas du texte libre */
  const zq = boite.querySelector('#hdEquip');
  const deja = String((e && e.equipement) || '')
    .split(',').map(x => x.trim()).filter(Boolean);

  const cases = [];
  handicapEquipements.forEach(nom => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:9px;' +
      'text-transform:none;font-size:14px;color:var(--cream);margin:0 0 6px;' +
      'font-weight:400;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = nom;
    cb.checked = deja.some(x => normaliserMot(x) === normaliserMot(nom));
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin:0;';
    l.appendChild(cb);
    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = nom;
    l.appendChild(t);
    zq.appendChild(l);
    cases.push(cb);
  });

  /* Ce qui a été saisi autrefois et n'est pas dans la liste */
  const hors = deja.filter(x =>
    !handicapEquipements.some(n => normaliserMot(n) === normaliserMot(x)));
  if(hors.length){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:4px;' +
      'line-height:1.5;';
    a.textContent = 'Aussi noté : ' + hors.join(', ');
    zq.appendChild(a);
  }

  if(e){
    boite.querySelector('#hdPatho').value = e.pathologie || '';
    boite.querySelector('#hdComm').value = e.commentaire || '';
    boite.querySelector('#hdDateEval').value = e.dateEval || '';
    boite.querySelector('#hdDateDdtm').value = e.dateDdtm || '';

    const sit = e.dejaPermis ? 'deja' : (e.pasEncore ? 'pas' : '');
    if(sit){
      const r = boite.querySelector('input[name="hdSit"][value="' + sit + '"]');
      if(r) r.checked = true;
    }
  }

  const rw = document.createElement('div');
  rw.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => fermerFond(fond));
  rw.appendChild(bA);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '💾 Enregistrer';
  bO.addEventListener('click', async () => {
    const nom = e ? e.eleve
                  : String(boite.querySelector('#hdNom').value || '').trim();
    if(!nom){ showToast('Indique le nom.'); return; }

    const sit = boite.querySelector('input[name="hdSit"]:checked');
    const equip = cases.filter(x => x.checked).map(x => x.value)
                       .concat(hors).join(', ');

    bO.disabled = true;
    bO.textContent = 'Enregistrement…';

    /* Un champ à la fois : le classeur reste maître du reste, et
       une écriture ratée n'en emporte pas d'autres. */
    const aEcrire = [
      ['pathologie', boite.querySelector('#hdPatho').value],
      ['equipement', equip],
      ['dateEval', boite.querySelector('#hdDateEval').value],
      ['dateDdtm', boite.querySelector('#hdDateDdtm').value],
      ['commentaire', boite.querySelector('#hdComm').value]
    ];

    if(sit){
      aEcrire.unshift(['dejaPermis', sit.value === 'deja']);
      aEcrire.unshift(['pasEncore', sit.value === 'pas']);
    }

    try{
      let ligne = e ? e.ligne : 0;
      for(const [champ, valeur] of aEcrire){
        const r = await appelPrep({ action: 'handicapSet', ligne: ligne,
                                    eleve: nom, champ: champ, valeur: valeur });
        /* La première écriture crée la ligne : on la retient */
        if(!ligne && r && r.ligne) ligne = r.ligne;
      }

      fermerFond(fond);
      showToast('Enregistré ✅');
      afficherHandicap();
    }catch(err){
      showToast('Impossible : ' + err.message);
      bO.disabled = false;
      bO.textContent = '💾 Enregistrer';
    }
  });
  rw.appendChild(bO);

  boite.appendChild(rw);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  if(!e) setTimeout(() => boite.querySelector('#hdNom').focus(), 100);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-handicap.js'] = true;
