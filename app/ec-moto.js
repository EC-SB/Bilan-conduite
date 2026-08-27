/* ============================================================
   ec-moto.js
   Le parcours du permis moto.

   Quatre étapes, dans l'ordre où l'élève les franchit : la
   préparation, le plateau, son repassage s'il échoue, puis la
   circulation.

   Le dossier ANTS et le code sont propres à la moto : ce ne
   sont ni le même dossier ni le même examen que pour la voiture.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les formations qui font entrer dans cette liste */
const FORMATIONS_MOTO = ['Moto A', 'A1 permis', 'A1 passerelle', 'A2'];


/* Où en est l'élève. L'étape se déduit de ce qui est rempli :
   pas de champ à tenir à jour séparément. */
function etapeMoto(s){
  /* La circulation, en deux temps : ceux qui attendent une date
     et ceux qui l'ont. */
  if(String(s.motoDateExamen || '').trim()) return 'circuprevue';

  if(String(s.motoCircuLecons || '').trim() ||
     s.motoPlateau === 'reussi') return 'circulation';

  if(s.motoPlateau === 'echoue') return 'repassage';

  if(String(s.motoDatePlateau || '').trim()) return 'plateau';

  /* Prêt mais sans date : il attend d'être placé */
  if(String(s.motoLecons || '').trim() === '0' ||
     s.motoEtape === 'pret') return 'aplacer';

  return 'preparation';
}


/* Les fiches du répertoire, où vit la formation.

   Le suivi ne la porte pas : sans elles, un élève tout neuf
   n'apparaissait nulle part. */
let fichesConnues = null;

async function chargerFiches(force){
  if(fichesConnues && !force) return fichesConnues;
  try{
    const d = await appelPrep({ action: 'fichesList' });
    fichesConnues = (d && d.fiches) || [];
  }catch(e){ fichesConnues = fichesConnues || []; }
  return fichesConnues;
}


function formationDe(nom){
  const k = normaliserMot(nom || '');
  const f = (fichesConnues || []).find(x => normaliserMot(x.eleve || '') === k);
  return f ? String(f.formation || '') : '';
}


function elevesMoto(){
  if(typeof etatBureau === 'undefined') return [];

  const CHAMPS = ['motoAnts', 'motoCode', 'motoEval', 'motoPlateau',
                  'motoLecons', 'motoDatePlateau', 'motoDateExamen',
                  'motoCircuLecons', 'motoEtape'];

  const dedans = s => {
    const f = String((s && s.formation) || '').trim();
    if(FORMATIONS_MOTO.some(x => normaliserMot(x) === normaliserMot(f))){
      return true;
    }
    return CHAMPS.some(k => String((s && s[k]) || '').trim());
  };

  const vus = [];
  const out = [];

  const ajouter = (nom, source) => {
    const k = normaliserMot(nom || '');
    if(!k || vus.indexOf(k) !== -1) return;
    vus.push(k);
    out.push(Object.assign({ eleve: nom }, source || {}));
  };

  /* Les fiches du répertoire : c'est là qu'un élève tout neuf
     existe, avant tout bilan et toute consigne. */
  (fichesConnues || []).forEach(f => {
    if(dedans({ formation: f.formation })) ajouter(f.eleve, f);
  });

  /* Ceux qui ont une saisie moto dans leur suivi */
  (etatBureau.suivi || []).forEach(s => {
    if(dedans(Object.assign({}, s, { formation: formationDe(s.eleve) }))){
      ajouter(s.eleve, { formation: formationDe(s.eleve) });
    }
  });

  /* Puis ceux qui ont déjà des bilans */
  (etatBureau.eleves || []).forEach(e => {
    const s = Object.assign({}, suiviDe(e.eleve) || {},
                            { formation: formationDe(e.eleve) });
    if(dedans(s)) ajouter(e.eleve, e);
  });

  return out;
}


/* ============================================================
   L'AFFICHAGE
   ============================================================ */

async function afficherMoto(){
  const zone = $('motoZone');
  if(!zone) return;

  if(typeof etatBureau === 'undefined' || !etatBureau.eleves ||
     !etatBureau.eleves.length){
    if(typeof afficherBureau === 'function'){
      try{ await afficherBureau(); }catch(e){}
    }
  }

  await chargerFiches();
  const tous = elevesMoto();
  zone.innerHTML = '';

  zone.appendChild(boutonAjouterMoto());

  const cadres = [
    ['preparation', '📋 Préparation du plateau',
     "Dossier, code, évaluation. Quand il est prêt, indique dans " +
     'combien de leçons il passera.'],
    ['aplacer',     '📅 À prévoir pour le plateau',
     'Ils sont prêts et attendent une date de plateau.'],
    ['plateau',     '🏍️ Plateau prévu',
     'Une date est posée. Saisis le résultat après le passage.'],
    ['repassage',   '🔁 Repassage du plateau',
     'Le plateau a été échoué. Une nouvelle date, et le compteur ' +
     'de passages suit.'],
    ['circulation', '🛣️ Circulation en cours',
     'Le plateau est réussi. Leçons restantes, puis date ' +
     "d'examen."],
    ['circuprevue', '📆 Circulations prévues',
     "Une date d'examen est posée. Quand il l'obtient, tout s'efface."]
  ];

  cadres.forEach(([cle, titre, aide]) => {
    const liste = tous.filter(e => etapeMoto(suiviDe(e.eleve) || {}) === cle);
    zone.appendChild(cadreMoto(cle, titre, aide, liste));
  });
}


function cadreMoto(cle, titre, aide, liste){
  const d = document.createElement('details');
  d.className = 'volet-liste';
  d.open = (liste.length > 0);

  const s = document.createElement('summary');
  s.innerHTML = titre.replace(/</g, '&lt;') +
    ' <span class="compteur">' + liste.length + '</span>';
  d.appendChild(s);

  const a = document.createElement('div');
  a.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;' +
    'line-height:1.4;';
  a.textContent = aide;
  d.appendChild(a);

  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Personne pour le moment.';
    d.appendChild(v);
    return d;
  }

  liste.forEach(e => d.appendChild(ligneMoto(e, cle)));
  return d;
}


/* ============================================================
   UNE LIGNE
   ============================================================ */

function ligneMoto(e, etape){
  const s = suiviDe(e.eleve) || {};

  const l = document.createElement('div');
  l.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:11px 12px;margin-bottom:9px;';

  const n = document.createElement('div');
  n.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:6px;';
  n.textContent = e.eleve;
  l.appendChild(n);

  const info = document.createElement('div');
  info.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.6;' +
    'margin-bottom:9px;';
  info.textContent = resumeMoto(s, etape);
  l.appendChild(info);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap;';
  actionsMoto(e.eleve, s, etape).forEach(b => r.appendChild(b));
  l.appendChild(r);

  return l;
}


function resumeMoto(s, etape){
  const bouts = [];

  if(etape === 'preparation'){
    /* Chaque étape avec son état, pour voir d'un coup ce qui manque */
    const ants = s.motoAnts === 'fait' ? '✅ ANTS fait'
               : s.motoAnts === 'encours' ? '⏳ ANTS en cours'
               : '⬜ ANTS';
    const qui = s.motoAntsQui === 'nous' ? ' (par nous)'
              : s.motoAntsQui === 'eleve' ? " (par l'élève)" : '';

    bouts.push(ants + qui);
    bouts.push(s.motoCode === 'obtenu' ? '✅ Code moto obtenu'
             : s.motoCode === 'encours' ? '⏳ Code en cours' : '⬜ Code');
    bouts.push(s.motoEval === 'oui' ? '✅ Évaluation faite' : '⬜ Évaluation');
    bouts.push(s.motoPlateau === 'commence' ? '✅ Plateau commencé'
                                            : '⬜ Plateau');

    if(String(s.motoLecons || '').trim()){
      bouts.push('🏍️ Prêt dans ' + s.motoLecons + ' leçon(s)');
    }
  }

  else if(etape === 'plateau'){
    bouts.push('📅 Plateau le ' + (s.motoDatePlateau || '?'));
    if(Number(s.motoPassages) > 1) bouts.push(s.motoPassages + 'e passage');
  }

  else if(etape === 'repassage'){
    bouts.push('❌ Plateau échoué');
    bouts.push((Number(s.motoPassages) || 1) + ' passage(s)');
    if(String(s.motoDatePlateau || '').trim()){
      bouts.push('📅 Nouvelle date : ' + s.motoDatePlateau);
    }else{
      bouts.push('📅 date à poser');
    }
  }

  else if(etape === 'aplacer'){
    bouts.push('✅ Prêt pour le plateau');
    bouts.push('📅 date à poser');
  }

  else{
    bouts.push('✅ Plateau réussi');
    if(String(s.motoCircuLecons || '').trim()){
      bouts.push('🛣️ ' + s.motoCircuLecons + ' leçon(s) restantes');
    }
    if(String(s.motoDateExamen || '').trim()){
      bouts.push("📅 Examen le " + s.motoDateExamen);
    }else{
      bouts.push("📅 examen à prévoir");
    }
  }

  return bouts.join(' · ');
}


/* ============================================================
   LES GESTES, SELON L'ÉTAPE
   ============================================================ */

function actionsMoto(nom, s, etape){
  const out = [];

  const bouton = (libelle, action, couleur) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;padding:9px 12px;font-size:12px;margin:0;' +
      (couleur ? 'color:' + couleur + ';border-color:' + couleur + ';' : '');
    b.textContent = libelle;
    b.addEventListener('click', action);
    out.push(b);
  };

  if(etape === 'preparation'){
    bouton('📄 Dossier ANTS', () => saisirAntsMoto(nom));
    bouton('🎓 Code moto', () => saisirCodeMoto(nom));
    bouton('📝 Évaluation', () => basculerMoto(nom, 'motoEval', 'oui'));
    bouton('🏍️ Plateau commencé',
           () => basculerMoto(nom, 'motoPlateau', 'commence'));
    bouton('✅ Prêt pour le plateau', () => preparerPlateau(nom),
           'var(--accent-text)');
  }

  else if(etape === 'plateau' || etape === 'repassage'){
    bouton('📅 Changer la date', () => saisirDatePlateau(nom));
    bouton('✅ Plateau réussi', () => resultatPlateau(nom, true),
           'var(--accent-text)');
    bouton('❌ Plateau échoué', () => resultatPlateau(nom, false),
           'var(--red)');
  }

  else{
    bouton('🛣️ Leçons restantes', () => saisirLeconsCircu(nom));
    bouton("📅 Date d'examen", () => saisirDateExamenMoto(nom));
    bouton('🎓 Permis obtenu', () => permisMotoObtenu(nom),
           'var(--accent-text)');
  }

  return out;
}


/* ============================================================
   LES SAISIES
   ============================================================ */

async function majMoto(nom, champs){
  try{
    await majSuivi(nom, champs);
    afficherMoto();
  }catch(e){ showToast('Impossible : ' + e.message); }
}


/* Une case qui s'allume et s'éteint */
async function basculerMoto(nom, champ, valeur){
  const s = suiviDe(nom) || {};
  const majs = {};
  majs[champ] = (s[champ] === valeur) ? '' : valeur;
  await majMoto(nom, majs);
}


async function saisirAntsMoto(nom){
  const s = suiviDe(nom) || {};

  const ou = await fenetre('Où en est son dossier ANTS moto ?',
    [{ nom:'Annuler', valeur:'' },
     { nom:'⬜ Pas commencé', valeur:'rien' },
     { nom:'⏳ En cours', valeur:'encours' },
     { nom:'✅ Fait', valeur:'fait', principal:true }], nom);

  if(!ou) return;

  if(ou === 'rien'){
    await majMoto(nom, { motoAnts: '', motoAntsQui: '' });
    return;
  }

  /* Qui s'en occupe : l'école ou l'élève lui-même */
  const qui = await fenetre('Qui fait ce dossier ?',
    [{ nom:'Ne pas préciser', valeur:'x' },
     { nom:"👤 L'élève", valeur:'eleve' },
     { nom:'🏫 Nous', valeur:'nous', principal:true }], nom);

  await majMoto(nom, { motoAnts: ou,
                       motoAntsQui: (qui === 'x') ? '' : (qui || '') });
}


async function saisirCodeMoto(nom){
  const quoi = await fenetre('Où en est son code moto ?',
    [{ nom:'Annuler', valeur:'' },
     { nom:'⬜ Pas commencé', valeur:'rien' },
     { nom:'⏳ En cours', valeur:'encours' },
     { nom:'✅ Obtenu', valeur:'obtenu', principal:true }], nom);

  if(!quoi) return;
  await majMoto(nom, { motoCode: (quoi === 'rien') ? '' : quoi });
}


async function preparerPlateau(nom){
  const n = await demander(
    'Dans combien de leçons pourra-t-il passer le plateau ?\n' +
    "Laisse vide s'il peut y aller maintenant.", '', nom);

  if(n === null) return;

  const propre = String(n).trim();
  if(propre && isNaN(Number(propre))){
    showToast('Indique un nombre de leçons.');
    return;
  }

  /* Sans leçon restante, il attend une date : il rejoint le
     cadre « à prévoir pour le plateau ». */
  if(!propre){
    await majMoto(nom, { motoLecons: '', motoEtape: 'pret' });
    showToast(nom + ' → à prévoir pour le plateau');
    return;
  }

  await majMoto(nom, { motoLecons: propre, motoEtape: '' });
}


async function saisirDatePlateau(nom){
  const iso = await choisirDate('Date du plateau — ' + nom);
  if(!iso) return;
  await majMoto(nom, { motoDatePlateau: dateEnToutesLettres(iso),
                       motoLecons: '' });
}


async function resultatPlateau(nom, reussi){
  const s = suiviDe(nom) || {};

  if(reussi){
    if(!await confirmer(nom + ' a réussi son plateau ?\n\n' +
        'Il passe en circulation.', 'Plateau réussi')) return;

    await majMoto(nom, { motoPlateau: 'reussi', motoDatePlateau: '',
                         motoEtape: '' });
    showToast('🏍️ ' + nom + ' passe en circulation');
    return;
  }

  const n = (Number(s.motoPassages) || 1) + 1;

  if(!await confirmer(nom + ' a échoué son plateau ?\n\n' +
      'Ce sera son ' + n + 'e passage.', 'Plateau échoué')) return;

  await majMoto(nom, { motoPlateau: 'echoue', motoDatePlateau: '',
                       motoPassages: String(n) });
}


async function saisirLeconsCircu(nom){
  const s = suiviDe(nom) || {};

  const n = await demander(
    'Combien de leçons de circulation restent à faire ?',
    s.motoCircuLecons || '', nom);

  if(n === null) return;

  const propre = String(n).trim();
  if(propre && isNaN(Number(propre))){
    showToast('Indique un nombre de leçons.');
    return;
  }

  await majMoto(nom, { motoCircuLecons: propre });
}


async function saisirDateExamenMoto(nom){
  const iso = await choisirDate("Date de l'examen moto — " + nom);
  if(!iso) return;
  await majMoto(nom, { motoDateExamen: dateEnToutesLettres(iso) });
}


/* Le permis est obtenu : son parcours moto n'a plus d'objet */
async function permisMotoObtenu(nom){
  if(!await confirmer(nom + ' a obtenu son permis moto ?\n\n' +
      'Tout son suivi moto sera effacé. Ses bilans restent.',
      'Permis obtenu')) return;

  await majMoto(nom, {
    motoAnts: '', motoAntsQui: '', motoCode: '', motoEval: '',
    motoPlateau: '', motoLecons: '', motoDatePlateau: '',
    motoPassages: '', motoCircuLecons: '', motoDateExamen: '',
    motoEtape: ''
  });

  showToast('🎓 Bravo à ' + nom + ' !');
}


/* ============================================================
   AJOUTER UN ÉLÈVE

   À la main pour le moment. Sa fiche se crée dans le répertoire
   du même coup, avec sa formation.
   ============================================================ */

function boutonAjouterMoto(){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'padding:11px;font-size:13px;margin-bottom:12px;';
  b.textContent = '➕ Ajouter un élève moto';
  b.addEventListener('click', ajouterEleveMoto);
  return b;
}


async function ajouterEleveMoto(){
  const nom = await demander(
    "Nom de l'élève\n" +
    'Sa fiche sera créée dans le répertoire si elle n\'existe pas.',
    '', 'Nouvel élève moto');

  if(!nom || !String(nom).trim()) return;
  const propre = String(nom).trim();

  const formation = await fenetre('Quelle formation ?',
    [{ nom:'Annuler', valeur:'' }].concat(
      FORMATIONS_MOTO.map((f, i) => ({
        nom: f, valeur: f, principal: (i === 0)
      }))),
    propre);

  if(!formation) return;

  try{
    /* Sa fiche du répertoire porte la formation : elle le fera
       revenir dans cette liste tout seul. */
    await appelPrep({ action: 'ficheSet', eleve: propre,
                      formation: formation, par: ACCES.moniteur || '' });

    /* Et son suivi moto démarre */
    await majSuivi(propre, { motoEtape: 'preparation' });

    showToast(propre + ' ajouté ✅');
    /* Sa fiche vient d'être créée : on relit le répertoire */
    await chargerFiches(true);
    afficherMoto();
  }catch(e){ showToast('Impossible : ' + e.message); }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-moto.js'] = true;
