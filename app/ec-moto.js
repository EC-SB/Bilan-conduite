/* Déployé le 01/09/2026 à 15:10 — v776 */
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
/* Une date passée : l'examen a eu lieu, le résultat se saisit.

   Le lendemain, pas le jour même : l'élève passe souvent dans
   l'après-midi. */
function datePassee(d){
  if(!d) return false;
  const iso = (typeof dateFrVersIso === 'function') ? dateFrVersIso(d) : '';
  if(!iso) return false;
  return iso < todayLocal();
}


function etapeMoto(s){
  /* La circulation, quand le plateau est acquis */
  if(s.motoPlateau === 'reussi'){
    const d = String(s.motoDateExamen || '').trim();
    if(d) return datePassee(d) ? 'circupassee' : 'circuprevue';
    return 'circuaprevoir';
  }

  /* Le plateau, tant qu'il n'est pas obtenu */
  const dp = String(s.motoDatePlateau || '').trim();
  if(dp) return datePassee(dp) ? 'plateaupasse' : 'plateau';

  /* Prêt mais sans date : il attend d'être placé */
  if(s.motoEtape === 'pret' || s.motoPlateau === 'echoue') return 'aplacer';

  return 'preparation';
}


/* Les fiches du répertoire, où vit la formation.

   Le suivi ne la porte pas : sans elles, un élève tout neuf
   n'apparaissait nulle part. */
let fichesConnues = null;

/* Nommée à part : « chargerFiches » existe déjà dans
   ec-fenetres.js et remplit fichesEleves, d'où viennent les
   numéros de téléphone. Le doublon l'écrasait. */
async function chargerFichesMoto(force){
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
                  'motoCircuLecons', 'motoEtape', 'motoRemarque'];

  const dedans = s => {
    /* Retiré par le bureau : il ne revient pas, même si sa fiche
       porte encore une formation moto. */
    if(s && s.motoEtape === 'retire') return false;

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
    const s = Object.assign({}, suiviDe(f.eleve) || {},
                            { formation: f.formation });
    if(dedans(s)) ajouter(f.eleve, f);
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

  /* Le bureau ne se charge qu'une fois : ensuite la mémoire est
     déjà à jour après chaque saisie. */
  if(typeof etatBureau === 'undefined' || !etatBureau.suivi ||
     (!etatBureau.suivi.length && !(etatBureau.eleves || []).length)){
    if(typeof afficherBureau === 'function'){
      try{ await afficherBureau(); }catch(e){}
    }
  }

  await chargerFichesMoto();
  const tous = elevesMoto();
  zone.innerHTML = '';

  zone.appendChild(boutonAjouterMoto());

  const cadres = [
    ['preparation',   '📋 Préparation du plateau',
     "Dossier, code, évaluation. Quand il est prêt, indique dans " +
     'combien de leçons il passera.'],
    ['aplacer',       '📅 Plateau à prévoir',
     'Ils sont prêts et attendent une date de plateau.'],
    ['plateau',       '🏍️ Plateau prévu',
     'La date approche. Le lendemain, il passera en « résultat à ' +
     'saisir ».'],
    ['plateaupasse',  '🏁 Plateau passé — résultat à saisir',
     'La date est dépassée. Obtenu, il part en circulation ; sinon ' +
     'il revient à « plateau à prévoir ».'],
    ['circuaprevoir', '🛣️ Circulation à prévoir',
     'Le plateau est obtenu. Leçons restantes, puis date ' +
     "d'examen."],
    ['circuprevue',   '📆 Circulation prévue',
     "La date est posée. Le lendemain, le résultat se saisira."],
    ['circupassee',   '🏁 Circulation passée — résultat à saisir',
     "Obtenue, tout s'efface ; sinon il revient à « circulation à " +
     'prévoir ».']
  ];

  cadres.forEach(([cle, titre, aide]) => {
    const liste = tous.filter(e => etapeMoto(suiviDe(e.eleve) || {}) === cle);
    zone.appendChild(cadreMoto(cle, titre, aide, liste));
  });

  zone.appendChild(blocStats2R('moto', '📊 Statistiques moto'));
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

  /* Une note libre qui suit l'élève d'un cadre à l'autre : ce que
     le bureau veut garder sous les yeux sans chercher où le
     ranger. */
  l.appendChild(champRemarqueMoto(e.eleve, s));

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap;';
  actionsMoto(e.eleve, s, etape).forEach(b => r.appendChild(b));
  l.appendChild(r);

  return l;
}


/* La remarque libre, sous le nom.

   Elle reste attachée à l'élève quelle que soit son étape : le
   bureau la retrouve du premier cadre au dernier. */
function champRemarqueMoto(nom, s){
  const i = document.createElement('input');
  i.type = 'text';
  i.placeholder = '✏️ Remarque…';
  i.value = String(s.motoRemarque || '');
  i.style.cssText = 'width:100%;margin:0 0 9px;font-size:13px;' +
    'padding:8px 10px;background:var(--navy);' +
    'border:1px solid var(--line);border-radius:9px;color:var(--cream);';

  /* ------------------------------------------------------------
     UN SEUL ENREGISTREMENT, POUR LES DEUX CHEMINS.

     Il y en avait deux, et ils ne se comportaient pas pareil :
     celui de la frappe parlait quand ça ratait, celui du départ
     du champ avalait tout — « .catch(() => {}) ». Or c'est
     justement celui-là qui compte : on quitte le champ, on passe
     à autre chose, et la remarque n'est jamais partie.

     Et aucun des deux ne mettait à jour la valeur connue : après
     un enregistrement réussi, quitter le champ le refaisait.
     ------------------------------------------------------------ */
  async function garder(){
    if(i.value === String(s.motoRemarque || '')) return;   /* rien de neuf */
    const valeur = i.value;
    try{
      await majSuivi(nom, { motoRemarque: valeur });
      s.motoRemarque = valeur;          /* ce qu'on sait, à jour */
      i.style.borderColor = 'var(--orange)';
      setTimeout(() => { i.style.borderColor = 'var(--line)'; }, 900);
    }catch(e){
      i.style.borderColor = 'var(--red)';
      showToast('⚠️ Remarque de ' + nom + ' non enregistrée : ' +
                (e && e.message ? e.message : 'réseau'));
    }
  }

  /* On enregistre quand le moniteur a fini d'écrire, pas à chaque
     lettre : sinon c'est un appel réseau par frappe. */
  let minuteur = null;

  i.addEventListener('input', () => {
    clearTimeout(minuteur);
    minuteur = setTimeout(garder, 900);
  });

  /* Quitter le champ enregistre tout de suite */
  i.addEventListener('blur', () => {
    clearTimeout(minuteur);
    garder();
  });

  return i;
}


function resumeMoto(s, etape){
  const bouts = [];
  const nb = Number(s.motoPassages) || 0;

  if(etape === 'preparation'){
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
    if(nb) bouts.push('🔢 ' + nb + ' plateau(x) déjà passé(s)');
  }

  else if(etape === 'aplacer'){
    bouts.push(nb ? '❌ Plateau échoué' : '✅ Prêt pour le plateau');
    if(nb) bouts.push(nb + ' passage(s)');
    bouts.push('📅 date à poser');
  }

  else if(etape === 'plateau'){
    bouts.push('📅 Plateau le ' + (s.motoDatePlateau || '?'));
    if(nb) bouts.push((nb + 1) + 'e passage');
  }

  else if(etape === 'plateaupasse'){
    bouts.push('🏁 Plateau passé le ' + (s.motoDatePlateau || '?'));
    bouts.push('résultat à saisir');
  }

  else if(etape === 'circuaprevoir'){
    bouts.push('✅ Plateau obtenu');
    if(String(s.motoCircuLecons || '').trim()){
      bouts.push('🛣️ ' + s.motoCircuLecons + ' leçon(s) restantes');
    }
    const nc = Number(s.motoCircuPassages) || 0;
    if(nc) bouts.push('❌ circulation échouée · ' + nc + ' passage(s)');
    bouts.push("📅 date à poser");
  }

  else if(etape === 'circuprevue'){
    bouts.push('✅ Plateau obtenu');
    bouts.push('📅 Circulation le ' + (s.motoDateExamen || '?'));
  }

  else{
    bouts.push('🏁 Circulation passée le ' + (s.motoDateExamen || '?'));
    bouts.push('résultat à saisir');
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
    bouton('🔢 Passages déjà faits', () => saisirPassagesMoto(nom, 'plateau'));
    bouton('🎓 Code moto', () => saisirCodeMoto(nom));
    bouton('📝 Évaluation', () => basculerMoto(nom, 'motoEval', 'oui'));
    bouton('🏍️ Plateau commencé',
           () => basculerMoto(nom, 'motoPlateau', 'commence'));
    bouton('✅ Prêt pour le plateau', () => preparerPlateau(nom),
           'var(--accent-text)');
  }

  else if(etape === 'aplacer'){
    bouton('📆 Poser la date du plateau', () => saisirDatePlateau(nom),
           'var(--accent-text)');
    bouton('🔢 Passages déjà faits', () => saisirPassagesMoto(nom, 'plateau'));
    bouton('↩️ Retour préparation',
           () => majMoto(nom, { motoLecons: '', motoEtape: '' }));
  }

  else if(etape === 'plateau'){
    bouton('📆 Changer la date', () => saisirDatePlateau(nom));
    bouton('🗑️ Annuler la date', () => effacerDatePlateau(nom));
    /* Le résultat reste possible avant l'heure : un examen du
       matin se saisit l'après-midi. */
    bouton('🏁 Saisir le résultat', () => resultatPlateau(nom));
  }

  else if(etape === 'plateaupasse'){
    bouton('✅ Plateau obtenu', () => resultatPlateau(nom, true),
           'var(--accent-text)');
    bouton('❌ Plateau échoué', () => resultatPlateau(nom, false),
           'var(--red)');
    bouton('📆 Changer la date', () => saisirDatePlateau(nom));
  }

  else if(etape === 'circuaprevoir'){
    bouton('🛣️ Leçons restantes', () => saisirLeconsCircu(nom));
    bouton('📆 Poser la date', () => saisirDateExamenMoto(nom),
           'var(--accent-text)');
    bouton('🔢 Passages déjà faits',
           () => saisirPassagesMoto(nom, 'circulation'));
  }

  else if(etape === 'circuprevue'){
    bouton('📆 Changer la date', () => saisirDateExamenMoto(nom));
    bouton('🗑️ Annuler la date', () => effacerDateCircu(nom));
    bouton('🏁 Saisir le résultat', () => resultatCirculation(nom));
  }

  else{
    bouton('🎓 Permis obtenu', () => resultatCirculation(nom, true),
           'var(--accent-text)');
    bouton('❌ Circulation échouée', () => resultatCirculation(nom, false),
           'var(--red)');
    bouton('📆 Changer la date', () => saisirDateExamenMoto(nom));
  }

  /* Il part ailleurs : son suivi moto n'a plus d'objet */
  bouton('🚪 Retirer', () => retirerEleveMoto(nom), 'var(--muted)');

  return out;
}


/* ============================================================
   LA TRACE DES RÉSULTATS

   Le suivi s'efface quand le permis est obtenu : sans cette
   trace, rien ne pourrait être compté ensuite.
   ============================================================ */

async function noterResultat2R(permis, eleve, epreuve, resultat, passage, date){
  try{
    await appelPrep({ action: 'res2rAdd', permis: permis, eleve: eleve,
                      epreuve: epreuve, resultat: resultat,
                      passage: String(passage || ''),
                      dateExamen: String(date || '') });
  }catch(e){ /* le suivi prime : on ne bloque pas pour la statistique */ }
}


/* ============================================================
   LES STATISTIQUES

   Elles se lisent d'un coup d'œil : combien de passages, combien
   d'obtentions, et du premier coup ou non.
   ============================================================ */

let resultats2R = null;

async function chargerResultats2R(force){
  if(resultats2R && !force) return resultats2R;
  try{
    const d = await appelPrep({ action: 'res2rList' });
    resultats2R = (d && d.resultats) || [];
  }catch(e){ resultats2R = resultats2R || []; }
  return resultats2R;
}


function blocStats2R(permis, titre){
  const d = document.createElement('details');
  d.className = 'volet-liste';
  d.style.marginTop = '14px';

  const s = document.createElement('summary');
  s.textContent = titre;
  d.appendChild(s);

  const dedans = document.createElement('div');
  dedans.innerHTML = '<div class="empty">Chargement…</div>';
  d.appendChild(dedans);

  chargerResultats2R().then(() => {
    dedans.innerHTML = '';
    dedans.appendChild(tableauStats2R(permis));
  });

  return d;
}


function tableauStats2R(permis){
  const tous = (resultats2R || []).filter(r =>
    normaliserMot(r.permis || '') === normaliserMot(permis));

  const z = document.createElement('div');

  if(!tous.length){
    z.innerHTML = '<div style="font-size:13px;color:var(--muted);' +
      'line-height:1.6;">Aucun résultat enregistré pour le moment.<br>' +
      "Ils se comptent à partir d'aujourd'hui, au fur et à mesure " +
      'des examens.</div>';
    return z;
  }

  /* Chaque épreuve compte à part : le plateau et la circulation
     n'ont pas les mêmes taux. */
  const epreuves = [];
  tous.forEach(r => {
    if(epreuves.indexOf(r.epreuve) === -1) epreuves.push(r.epreuve);
  });

  epreuves.forEach(e => {
    const dessus = tous.filter(r => r.epreuve === e);
    const reussis = dessus.filter(r => r.resultat === 'obtenu');
    const taux = Math.round(reussis.length / dessus.length * 100);

    /* Du premier coup : c'est ce qui dit la qualité de la
       préparation. */
    const premiers = reussis.filter(r => String(r.passage || '1') === '1');

    const l = document.createElement('div');
    l.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
      'padding:11px 12px;margin-bottom:9px;';

    l.innerHTML =
      '<div style="font-size:14px;font-weight:700;margin-bottom:6px;">' +
        String(e).replace(/</g, '&lt;') + '</div>' +
      '<div style="font-size:13px;line-height:1.7;">' +
        '<span style="color:var(--accent-text);font-weight:700;">' +
          taux + '% de réussite</span>' +
        ' · ' + reussis.length + ' obtenu(s) sur ' + dessus.length +
        ' passage(s)' +
        (reussis.length
          ? '<br><span style="color:var(--muted);">' +
            premiers.length + ' du premier coup</span>' : '') +
      '</div>';

    z.appendChild(l);
  });

  /* Les douze derniers mois, pour voir l'évolution */
  const parMois = {};
  tous.forEach(r => {
    const m = String(r.horodatage || '').match(/(\d{2})\/(\d{4})/);
    if(!m) return;
    const cle = m[2] + '-' + m[1];
    parMois[cle] = parMois[cle] || { total: 0, reussis: 0 };
    parMois[cle].total++;
    if(r.resultat === 'obtenu') parMois[cle].reussis++;
  });

  const mois = Object.keys(parMois).sort().slice(-12);

  if(mois.length > 1){
    const t = document.createElement('div');
    t.style.cssText = 'font-size:12px;color:var(--muted);margin:12px 0 6px;';
    t.textContent = 'Par mois';
    z.appendChild(t);

    mois.forEach(m => {
      const x = parMois[m];
      const [an, mo] = m.split('-');
      const nomMois = ['janvier','février','mars','avril','mai','juin',
                       'juillet','août','septembre','octobre','novembre',
                       'décembre'][Number(mo) - 1] || mo;

      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:9px;align-items:center;' +
        'font-size:12px;padding:3px 0;';
      l.innerHTML =
        '<span style="flex:1;">' + nomMois + ' ' + an + '</span>' +
        '<span style="color:var(--accent-text);">' + x.reussis + '</span>' +
        '<span style="color:var(--muted);">/ ' + x.total + '</span>';
      z.appendChild(l);
    });
  }

  return z;
}


/* ============================================================
   LE NOMBRE DE PASSAGES DÉJÀ FAITS

   Un élève repris d'une autre auto-école a déjà passé son
   plateau une ou deux fois : sans cette saisie, le compteur
   repartait de zéro et les statistiques s'en trouvaient
   faussées.
   ============================================================ */

async function saisirPassagesMoto(nom, epreuve){
  const s = suiviDe(nom) || {};
  const cle = (epreuve === 'circulation') ? 'motoCircuPassages' : 'motoPassages';
  const quoi = (epreuve === 'circulation') ? 'circulation' : 'plateau';

  const actuel = String(s[cle] || '0');

  const choix = await choisirDansListeMoto(
    'Combien de ' + quoi + '(s) a-t-il déjà passé(s) ?',
    "Sans compter celui qui vient. Utile pour un élève repris " +
    "d'une autre auto-école.",
    ['0', '1', '2', '3', '4', '5'].map(v => ({
      nom: (v === '0') ? 'Aucun — c\'est son premier'
         : v + ' déjà passé' + (Number(v) > 1 ? 's' : ''),
      valeur: v
    })),
    actuel);

  if(choix === null) return;

  const majs = {};
  majs[cle] = (choix === '0') ? '' : choix;
  await majMoto(nom, majs);
}


/* Une liste déroulante : les boutons empilés tiennent mal sur un
   téléphone. */
function choisirDansListeMoto(titre, aide, options, valeurActuelle){
  /* La remorque en a déjà une : autant s'en servir */
  if(typeof choisirDansListe2R === 'function'){
    return choisirDansListe2R(titre, aide, options, valeurActuelle);
  }

  return Promise.resolve(null);
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

  /* Sans réponse donnée, on la demande */
  if(reussi === undefined){
    const r = await fenetre('Le plateau de ' + nom + ' ?',
      [{ nom:'Annuler', valeur:'' },
       { nom:'❌ Échoué', valeur:'non' },
       { nom:'✅ Obtenu', valeur:'oui', principal:true }],
      'Résultat du plateau');
    if(!r) return;
    reussi = (r === 'oui');
  }

  const n = (Number(s.motoPassages) || 0) + 1;

  if(reussi){
    if(!await confirmer(nom + ' a obtenu son plateau ?\n\n' +
        "Il passe en circulation à prévoir. Il n'a pas encore son " +
        'permis.', 'Plateau obtenu')) return;

    await noterResultat2R('moto', nom, 'Plateau', 'obtenu', n,
                          s.motoDatePlateau);
    await majMoto(nom, { motoPlateau: 'reussi', motoDatePlateau: '',
                         motoPassages: String(n), motoEtape: '' });
    showToast('🏍️ ' + nom + ' → circulation à prévoir');
    return;
  }

  if(!await confirmer(nom + ' a échoué son plateau ?\n\n' +
      'Ce sera son ' + (n + 1) + 'e passage. Il retourne dans ' +
      '« plateau à prévoir ».', 'Plateau échoué')) return;

  await noterResultat2R('moto', nom, 'Plateau', 'echoue', n,
                        s.motoDatePlateau);

  /* Sans plateau, pas de circulation : il repart au début */
  await majMoto(nom, { motoPlateau: 'echoue', motoDatePlateau: '',
                       motoPassages: String(n), motoEtape: 'pret' });
  showToast(nom + ' → plateau à prévoir');
}


/* ============================================================
   LE RÉSULTAT DE LA CIRCULATION
   ============================================================ */

async function resultatCirculation(nom, reussi){
  const s = suiviDe(nom) || {};

  if(reussi === undefined){
    const r = await fenetre('La circulation de ' + nom + ' ?',
      [{ nom:'Annuler', valeur:'' },
       { nom:'❌ Échouée', valeur:'non' },
       { nom:'🎓 Permis obtenu', valeur:'oui', principal:true }],
      'Résultat de la circulation');
    if(!r) return;
    reussi = (r === 'oui');
  }

  if(reussi) return permisMotoObtenu(nom);

  const n = (Number(s.motoCircuPassages) || 0) + 1;

  if(!await confirmer(nom + ' a échoué sa circulation ?\n\n' +
      'Son plateau reste acquis : il retourne dans « circulation à ' +
      'prévoir ».', 'Circulation échouée')) return;

  await noterResultat2R('moto', nom, 'Circulation', 'echoue', n,
                        s.motoDateExamen);
  await majMoto(nom, { motoDateExamen: '',
                       motoCircuPassages: String(n) });
  showToast(nom + ' → circulation à prévoir');
}


/* ============================================================
   ANNULER UNE DATE

   Elle a été posée par erreur, ou la préfecture l'a retirée :
   l'élève revient dans la liste d'attente correspondante.
   ============================================================ */

async function effacerDatePlateau(nom){
  const s = suiviDe(nom) || {};

  if(!await confirmer('Annuler la date de plateau de ' + nom + ' ?\n\n' +
      '(elle était le ' + (s.motoDatePlateau || '?') + ')\n' +
      'Il revient dans « plateau à prévoir ».', 'Annuler la date')) return;

  await majMoto(nom, { motoDatePlateau: '', motoEtape: 'pret' });
  showToast('Date annulée');
}


async function effacerDateCircu(nom){
  const s = suiviDe(nom) || {};

  if(!await confirmer('Annuler la date de circulation de ' + nom + ' ?\n\n' +
      '(elle était le ' + (s.motoDateExamen || '?') + ')\n' +
      'Il revient dans « circulation à prévoir ».',
      'Annuler la date')) return;

  await majMoto(nom, { motoDateExamen: '' });
  showToast('Date annulée');
}


/* ============================================================
   RETIRER UN ÉLÈVE

   Il change d'auto-école : son suivi moto n'a plus d'objet. Ses
   bilans et sa fiche restent.
   ============================================================ */

async function retirerEleveMoto(nom){
  if(!await confirmer('Retirer ' + nom + ' du suivi moto ?\n\n' +
      "Sa fiche et ses bilans ne sont pas touchés : seul son " +
      'parcours moto disparaît.', 'Retirer du suivi')) return;

  await majMoto(nom, {
    motoAnts: '', motoAntsQui: '', motoCode: '', motoEval: '',
    motoPlateau: '', motoLecons: '', motoDatePlateau: '',
    motoPassages: '', motoCircuLecons: '', motoDateExamen: '',
    motoCircuPassages: '', motoRemarque: '', motoEtape: 'retire'
  });

  showToast(nom + ' retiré du suivi moto');
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
  const s = suiviDe(nom) || {};

  if(!await confirmer(nom + ' a obtenu son permis moto ?\n\n' +
      'Tout son suivi moto sera effacé. Ses bilans restent.',
      'Permis obtenu')) return;

  /* La trace part avant l'effacement : sans elle, rien ne
     pourrait être compté ensuite. */
  await noterResultat2R('moto', nom, 'Circulation', 'obtenu',
                        (Number(s.motoCircuPassages) || 0) + 1,
                        s.motoDateExamen);

  await majMoto(nom, {
    motoAnts: '', motoAntsQui: '', motoCode: '', motoEval: '',
    motoPlateau: '', motoLecons: '', motoDatePlateau: '',
    motoPassages: '', motoCircuLecons: '', motoDateExamen: '',
    motoCircuPassages: '', motoRemarque: '', motoEtape: ''
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
    await chargerFichesMoto(true);
    afficherMoto();
  }catch(e){ showToast('Impossible : ' + e.message); }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-moto.js'] = true;
