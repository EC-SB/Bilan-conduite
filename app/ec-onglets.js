/* Déployé le 27/08/2026 à 11:20 — v600 */
/* ============================================================
   ec-onglets.js
   Navigation par onglets.
   Un moniteur en voiture ne voit que ce qui le concerne ;
   le bureau retrouve ses listes en un geste.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const CLE_ONGLET = 'onglet_actif';

/* Quelles sections rendent un onglet utile.
   Un onglet dont aucune section n'est autorisée disparaît. */
const SECTIONS_ONGLET = {
  cours:  ['prepares', 'cours'],
  eleves: ['recherche', 'rappels', 'eleves', 'proccorriger', 'code', 'handicap', 'evaluation', 'financements', 'permis', 'depart'],
  suivi:  ['bureau_simu', 'bureau_examblanc', 'ecoutes'],
  permis: ['bureau_permis', 'bureau_places'],
  outils:  ['placesbe', 'paiement', 'procedures', 'textes', 'memoire', 'bilans', 'historique',
            'stats', 'journal'],
  gestion: ['ecran', 'notifs', 'taches', 'flotte', 'paie',
            'bureau_messages', 'admin']
};

let ongletActif = '';

/* Les onglets réellement accessibles à cette personne */
function ongletsDisponibles(){
  return Object.keys(SECTIONS_ONGLET).filter(o => {
    /* Un administrateur voit toujours Gestion : c'est là que vivent
       les accès et le journal, qui ne dépendent d'aucun droit. */
    if(o === 'gestion' && ACCES.role === 'admin') return true;
    if(o === 'outils' && ACCES.role === 'admin') return true;
    return SECTIONS_ONGLET[o].some(s => typeof aDroit === 'function' && aDroit(s));
  });
}

function afficherOnglet(cle, memoriser){
  const dispo = ongletsDisponibles();
  if(dispo.indexOf(cle) === -1) cle = dispo[0];
  if(!cle) return;

  ongletActif = cle;

  /* Les blocs des autres onglets se retirent de l'affichage */
  document.querySelectorAll('[data-onglet]').forEach(el => {
    el.classList.toggle('hors-onglet', el.getAttribute('data-onglet') !== cle);
  });

  document.querySelectorAll('.barre-vues').forEach(b => {
    b.style.display = (b.getAttribute('data-pour') === cle && !b.hidden) ? 'flex' : 'none';
  });
  if(VUES[cle]) afficherVue(cle, vueActive[cle] || (VUES[cle][0] || [])[0]);
  else libererOngletsSansVues();

  document.querySelectorAll('#barreOnglets .onglet').forEach(b => {
    const estActif = (b.getAttribute('data-cible') === cle);
    b.classList.toggle('actif', estActif);
    /* La goutte suit l'onglet retenu. Après l'affichage : un onglet
       masqué n'a pas encore de largeur mesurable. */
    if(estActif) setTimeout(() => deplacerGoutte(b), 0);
    b.setAttribute('aria-selected', b.getAttribute('data-cible') === cle ? 'true' : 'false');
  });

  if(memoriser !== false){
    try{ localStorage.setItem(CLE_ONGLET, cle); }catch(e){}
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  /* Chaque onglet charge ce dont il a besoin, à son ouverture */
  reveillerOnglet(cle);
}

/* Ce qu'il faut mettre à jour en arrivant sur un onglet */
function reveillerOnglet(cle){
  if((cle === 'suivi' || cle === 'permis') && typeof afficherBureau === 'function'){
    afficherBureau(bureauDejaCharge);
  }
  if(cle === 'permis' && typeof afficherMessengerPermis === 'function'){
    afficherMessengerPermis();
  }
}

/* Masque les onglets sans contenu et branche les boutons */
function initOnglets(){
  const barre = $('barreOnglets');
  if(!barre) return;

  document.body.classList.add('avec-onglets');

  /* Les boutons de chaque onglet, selon les droits */
  Object.keys(VUES).forEach(o => {
    try{ vueActive[o] = localStorage.getItem('vue_' + o) || ''; }catch(e){}
  });
  construireBarresVues();
  libererOngletsSansVues();

  const dispo = ongletsDisponibles();

  barre.querySelectorAll('.onglet').forEach(b => {
    const cle = b.getAttribute('data-cible');
    b.hidden = (dispo.indexOf(cle) === -1);
    if(!b.dataset.branche){
      b.dataset.branche = 'oui';
      b.addEventListener('click', () => afficherOnglet(cle));
    }
  });

  /* Un seul onglet accessible : la barre n'apporte rien */
  barre.style.display = (dispo.length > 1) ? 'flex' : 'none';

  let depart = '';
  try{ depart = localStorage.getItem(CLE_ONGLET) || ''; }catch(e){}
  if(dispo.indexOf(depart) === -1) depart = dispo[0];
  afficherOnglet(depart, false);
}


/* ============================================================
   NAVIGATION PAR BOUTONS À L'INTÉRIEUR D'UN ONGLET
   Un onglet qui contient plusieurs modules les présente en
   boutons : on voit d'emblée ce qui existe, sans dérouler.
   ============================================================ */
/* L'onglet Cours n'a plus de vues : ses trois blocs — démarrer,
   prochains cours, préparer — tiennent sur une seule page, dans
   cet ordre. Un sélecteur n'en montrerait qu'un à la fois. */
const VUES = {
  /* Deux vues : les sessions qu'on prépare, et tout le reste —
     permis prévus, places à ouvrir, élèves à qui prendre une date. */
  /* Le parcours d'un élève, dans l'ordre où il le suit : pas
     prêt, à envisager, préparé, suivi, résultat. */
  permis: [['pasprets',  '⛔ Pas prêts',        'bureau_permis'],
           ['envisager', '🤔 À envisager',      'bureau_permis'],
           ['preppermis','📣 Préparation',      'bureau_permis'],
           ['sessions',  '🎓 Suivi permis',     'bureau_permis'],
           ['resultats', '🏁 Résultats',        'bureau_permis']],
  suivi:  [['simu',    '🌙 Simulateurs et examens blancs', 'bureau_simu'],
           ['ecoutes', '👂 Écoutes pédagogiques',          'ecoutes']],
  eleves: [['recherche',  '📚 Historique des leçons', 'recherche'],
           ['rappels',    '🔔 Rappels de cours',      'rappels'],
           ['eleves',     '👥 Répertoire',            'eleves'],
           ['proccorriger','📥 Procédures',            'proccorriger'],
           ['code',       '🎓 Code',                   'code'],
           ['handicap',   '♿ Handicap',               'handicap'],
           ['evaluation', '📊 Évaluation',            'evaluation'],
           ['financements','💶 Financements',          'financements'],
           ['permis',     '🎓 Permis obtenu',         'permis'],
           ['depart',     '🚪 Départ',                'depart']],
  /* Ce qui sert au quotidien pédagogique */
  outils: [['placesbe',   '🚚 Places BE',              'placesbe'],
           ['paiement',   '💳 Paiement en plusieurs fois', 'paiement'],
           ['procedures', '🚦 Procédures',             'procedures'],
           ['textes',     '📄 Textes types',           'textes'],
           ['memoire',    "🧠 Mémoire de l'IA",         'memoire'],
           ['bilans',     '📋 Modèles de bilan',       'bilans'],
           ['historique', '📚 Historique des cours',    'historique'],
           ['stats',      '📈 Réussite',               'stats'],
           ['journal',    '📊 Journal',                'journal']],

  /* Ce qui relève de la gestion de l'entreprise */
  gestion: [['ecran',     '📺 Affichage',               'ecran'],
           ['notifs',     '🔔 Alertes',                 'notifs'],
           ['taches',     '✅ Tâches',                  'taches'],
           ['flotte',     '🚗 Flotte',                  'flotte'],
           ['paie',       '💶 Paie',                    'paie'],
           ['messages',   '📨 Messages aux moniteurs', 'bureau_messages'],
           ['tarifs',     '💰 Tarifs',                 'tarifs'],
           ['admin',      '⚙️ Accès',                  'admin']]
};

const vueActive = {};

function construireBarresVues(){
  Object.keys(VUES).forEach(onglet => {
    const barre = document.querySelector('.barre-vues[data-pour="' + onglet + '"]');
    if(!barre) return;

    barre.innerHTML = '';
    const dispo = VUES[onglet].filter(([cle, , section]) => {
      if(cle === 'journal') return ACCES.role === 'admin';
      if(cle === 'admin')   return ACCES.role === 'admin';

      return typeof aDroit !== 'function' || aDroit(section);
    });

    if(dispo.length < 2){
      /* Un seul module : le bouton n'apporte rien */
      barre.hidden = true;
      vueActive[onglet] = dispo.length ? dispo[0][0] : '';
      return;
    }
    barre.hidden = false;

    dispo.forEach(([cle, libelle]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = libelle;
      b.setAttribute('data-vue-cible', cle);
      b.addEventListener('click', () => afficherVue(onglet, cle));
      barre.appendChild(b);
    });

    if(!vueActive[onglet] || !dispo.some(x => x[0] === vueActive[onglet])){
      vueActive[onglet] = dispo[0][0];
    }
  });
}

/* Un onglet sans vues affiche tous ses blocs. Sans ce ménage, la
   classe « hors-vue » posée par une version précédente restait et
   masquait des cartes que plus personne ne réaffichait. */
function libererOngletsSansVues(){
  document.querySelectorAll('[data-vue][data-onglet]').forEach(el => {
    const onglet = el.getAttribute('data-onglet');
    if(VUES[onglet]) return;              /* cet onglet a ses vues */
    el.classList.remove('hors-vue');
    if(el.style.display === 'none') el.style.display = '';
  });
}

function afficherVue(onglet, cle){
  vueActive[onglet] = cle;

  /* Une carte peut servir plusieurs vues — « data-vues » au
     pluriel — quand ce sont ses tiroirs qui les distinguent. */
  const sel = '[data-onglet="' + onglet + '"][data-vue], ' +
              '[data-onglet="' + onglet + '"][data-vues]';

  document.querySelectorAll(sel).forEach(el => {
    const une = el.getAttribute('data-vue');
    const plusieurs = el.getAttribute('data-vues');

    const cache = plusieurs
      ? plusieurs.split(/\s+/).indexOf(cle) === -1
      : une !== cle;

    el.classList.toggle('hors-vue', cache);
    /* Les droits touchent aussi au style : on ne laisse pas de doute */
    if(cache) el.style.display = 'none';
    else if(el.style.display === 'none') el.style.display = '';
  });

  /* Les tiroirs de cette carte : chacun a sa vue */
  document.querySelectorAll('[data-onglet="' + onglet + '"] details[data-vue]')
    .forEach(d => {
      const sien = (d.getAttribute('data-vue') === cle);
      d.style.display = sien ? '' : 'none';
    });

  const barre = document.querySelector('.barre-vues[data-pour="' + onglet + '"]');
  if(barre){
    barre.querySelectorAll('button').forEach(b => {
      b.classList.toggle('actif', b.getAttribute('data-vue-cible') === cle);
    });
  }

  try{ localStorage.setItem('vue_' + onglet, cle); }catch(e){}
  reveillerVue(cle);
}

/* Chaque module charge ce dont il a besoin en s'affichant */
function reveillerVue(cle){
  const actions = {
    prepares:   () => aDroit('cours') && afficherPrepares(true, true),
    messages:   () => afficherConsignesEnAttente(),
    textes:     () => afficherModelesTexte(),
    procedures: () => afficherProcedures(),
    bilans:     () => afficherTextesBilan(),
    stats:      () => afficherStats(),
    journal:    () => ACCES.role === 'admin' && afficherJournal(),
    admin:      () => chargerUtilisateurs(),
    eleves:     () => afficherRepertoire(),
    rappels:    () => modeRappel('manuel'),
    sessions:   () => afficherSessionsPermis(),
    /* Les cinq vues du permis partagent le même chargement */
    pasprets:   () => afficherBureau(),
    envisager:  () => afficherBureau(),
    preppermis: () => { afficherBureau();
                        if(typeof afficherSolo === 'function') afficherSolo(); },
    resultats:  () => afficherBureau(),
    paie:       () => afficherPaie(),
    flotte:     () => afficherFlotte(),
    ecran:      () => afficherEcran(),
    proccorriger: () => afficherProcCorriger(),
    code:       () => afficherCode(),
    handicap:   () => afficherHandicap(),
    evaluation: () => afficherEvaluation(),
    financements: () => afficherFinancements(),
    tarifs:     () => afficherTarifs(),
    paiement:   () => afficherPaiement(),
    placesbe:   () => afficherPlacesBE(),
    notifs:     () => afficherNotifs(),
    taches:     () => afficherTaches(),
    ecoutes:    () => afficherEcoutes(),
    memoire:    () => afficherMemoireIA()
  };
  const f = actions[cle];
  if(typeof f === 'function'){
    try{ f(); }catch(e){ console.warn('Vue ' + cle + ' :', e); }
  }
}

/* ============================================================
   PREMIER GESTE DU MONITEUR
   S'il a un cours préparé pour aujourd'hui, c'est ce qu'il ouvre.
   Sinon, il démarre un cours directement.
   ============================================================ */
/* L'onglet Cours affiche désormais ses trois blocs ensemble : il
   n'y a plus de tiroir à choisir. La fonction reste, vide, car
   d'autres modules l'appellent encore. */
function ouvrirLeBonTiroirDuJour(){
  libererOngletsSansVues();
}


/* ============================================================
   LA PASTILLE DE NAVIGATION

   Un fond arrondi qui glisse d'un onglet à l'autre. Rien ne
   déborde de la barre, rien ne se découpe : c'est le glissement
   seul qui fait l'effet, et il fonctionne aussi bien en haut
   qu'en bas.
   ============================================================ */
let minuteurPastille = null;

function deplacerGoutte(bouton){
  const barre = $('barreOnglets');
  if(!barre || !bouton) return;

  let pastille = barre.querySelector('.pastille');
  if(!pastille){
    pastille = document.createElement('div');
    pastille.className = 'pastille';
    barre.insertBefore(pastille, barre.firstChild);
  }

  /* Les positions se mesurent après affichage : un onglet caché
     n'a pas de largeur, et la pastille se poserait à côté. */
  const b = bouton.getBoundingClientRect();
  const p = barre.getBoundingClientRect();
  if(!b.width) return;

  const gauche = b.left - p.left + 3;
  const bouge = Math.abs(parseFloat(pastille.style.left || '-999') - gauche) > 1;

  pastille.style.left = gauche + 'px';
  pastille.style.width = (b.width - 6) + 'px';
  pastille.style.opacity = '1';

  /* L'étirement, seulement quand elle se déplace vraiment */
  if(bouge){
    pastille.classList.add('file');
    clearTimeout(minuteurPastille);
    minuteurPastille = setTimeout(() => pastille.classList.remove('file'), 260);
  }
}

/* La barre change de forme au pivotement ou au redimensionnement */
function suivreGoutte(){
  const actif = document.querySelector('#barreOnglets .onglet.actif');
  if(actif) deplacerGoutte(actif);
}
window.addEventListener('resize', () => setTimeout(suivreGoutte, 60));
window.addEventListener('orientationchange', () => setTimeout(suivreGoutte, 220));

/* ============================================================
   PASTILLE D'ALERTE SUR UN ONGLET

   Ce qui attend une action du bureau doit se voir sans ouvrir
   l'onglet : un examen blanc à prévoir peut attendre des semaines
   si personne ne pense à aller regarder.
   ============================================================ */
function poserAlerte(onglet, nombre){
  const b = document.querySelector('#barreOnglets .onglet[data-cible="' + onglet + '"]');
  if(!b) return;

  let p = b.querySelector('.alerte');
  if(!nombre){
    if(p) p.remove();
    return;
  }
  if(!p){
    p = document.createElement('span');
    p.className = 'alerte';
    b.appendChild(p);
  }
  p.textContent = (nombre > 99) ? '99+' : String(nombre);
  p.title = nombre + ' à prévoir';
}

/* Un compte affiché sur un bouton de sous-onglet : le nombre de
   tâches se voit sans ouvrir la vue. */
function poserCompteVue(onglet, cle, nombre){
  const b = document.querySelector('.barre-vues[data-pour="' + onglet + '"] ' +
                                   'button[data-vue-cible="' + cle + '"]');
  if(!b) return;

  let p = b.querySelector('.compte-vue');
  if(!nombre){
    if(p) p.remove();
    return;
  }
  if(!p){
    p = document.createElement('span');
    p.className = 'compte-vue';
    p.style.cssText = 'display:inline-block;margin-left:6px;min-width:18px;' +
      'padding:0 5px;border-radius:9px;background:var(--orange);color:#0B0B0B;' +
      'font-size:11px;font-weight:800;line-height:18px;text-align:center;';
    b.appendChild(p);
  }
  p.textContent = (nombre > 99) ? '99+' : String(nombre);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-onglets.js'] = true;
