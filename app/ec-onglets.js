/* Déployé le 03/09/2026 à 08:29 — v821 */
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
  suivi:  ['bureau_simu', 'bureau_examblanc', 'suivi_aac_cs', 'ecoutes'],
  permis: ['bureau_permis', 'bureau_places'],
  /* « historique » a été retiré le 1er septembre : voir la barre
     de vues plus bas. */
  outils:  ['placesbe', 'paiement', 'procedures', 'textes', 'memoire', 'bilans',
            'stats', 'journal'],
  /* « tarifs » manquait ici, et il est pourtant accordable dans
     ⚙️ Accès : un compte à qui l'on n'accordait QUE les tarifs
     n'obtenait pas l'onglet Gestion, et n'atteignait donc jamais
     l'écran qu'on venait de lui ouvrir. Un droit qui ne mène nulle
     part est pire qu'un droit refusé — on croit l'avoir donné. */
  gestion: ['ecran', 'notifs', 'taches', 'flotte', 'paie', 'caisse', 'coutsia',
            'bureau_messages', 'sms', 'encours', 'incidents', 'tarifs',
            'menage', 'admin']
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
           ['resultats', '🏁 Résultats',        'bureau_permis'],
           ['moto',      '🏍️ Moto',            'bureau_permis'],
           ['remorque',  '🚚 Remorque',         'bureau_permis']],
  /* LE SUIVI CS ET LE SUIVI AAC SONT DANS SUIVI, ET SÉPARÉS.

     Dans SUIVI, parce que ces élèves-là n'ont pas de date d'examen :
     ils ne sont candidats à rien encore. On les SUIT, on ne prépare
     pas leur passage — et les deux listes débouchent sur l'examen
     blanc, qui est dans la même vue.

     SÉPARÉS, parce qu'ils ne se ressemblent pas. La CS, c'est un
     compteur et une question. L'AAC, c'est trois rendez-vous, des
     échéances calculées et trois parcours possibles. Dans un seul
     écran, il fallait replier l'un pour lire l'autre.

     Après « Simulateurs et examens blancs », pas avant : c'est
     l'écran de tous les jours, et on ne déplace pas ce sur quoi le
     bureau atterrit sans qu'il l'ait demandé. */
  suivi:  [['simu',     '🌙 Simulateurs et examens blancs', 'bureau_simu'],
           ['suivics',  '🤝 Suivi CS',                      'suivi_aac_cs'],
           ['suiviaac', '🎓 Suivi AAC',                     'suivi_aac_cs'],
           ['ecoutes',  '👂 Écoutes pédagogiques',          'ecoutes']],
  /* LE DOSSIER EN PREMIER, ET C'EST TOUT LE POINT.

     On ne pense pas « quel écran », on pense « Léa ». Les neuf vues
     qui suivent restent : elles font le travail de fond, liste par
     liste. Celle-ci fait le travail par personne. */
  eleves: [['dossier',    '👤 Dossier élève',         'eleves'],
           ['recherche',  '📚 Historique des leçons', 'recherche'],
           ['rappels',    '🔔 Rappels de cours',      'rappels'],
           /* Le répertoire est devenu ce qu'il restait de lui une
              fois que tout le per-élève est parti dans le dossier :
              l'import, la création, et la liste pour vérifier
              qu'un import a bien atterri. */
           ['eleves',     '➕ Ajouter des élèves',     'eleves'],
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
           /* « 📚 Historique des cours » a été retiré.

              Ce bouton ne chargeait RIEN : sa vue n'était branchée
              nulle part dans « reveillerVue », et l'écran restait
              sur « Chargement… » pour toujours. Personne n'a donc
              jamais pu s'en servir.

              Ses deux moitiés vivent ailleurs, et en mieux :
              · les cours en cours → 🩹 Cours non terminés
                (Gestion), qui montre en plus les dictées déposées
                et va vérifier si le bilan existe déjà ;
              · les cours enregistrés → 📚 Historique des leçons
                (onglet Élèves).

              Le FICHIER reste : « signalerCoursDemarre » et
              « signalerCoursFini » y vivent, et tout cours
              enregistré passe par elles. */
           ['stats',      '📈 Réussite',               'stats'],
           ['journal',    '📊 Journal',                'journal']],

  /* Ce qui relève de la gestion de l'entreprise */
  gestion: [['ecran',     '📺 Affichage',               'ecran'],
           ['notifs',     '🔔 Alertes',                 'notifs'],
           ['taches',     '✅ Tâches',                  'taches'],
           ['flotte',     '🚗 Flotte',                  'flotte'],
           ['paie',       '💶 Paie',                    'paie'],
           ['caisse',     '🏦 Caisse',                  'caisse'],
           ['coutsia',    '💸 Coûts IA',                'coutsia'],
           ['messages',   '📨 Messages aux moniteurs', 'bureau_messages'],
           ['sms',        '💬 SMS',                     'sms'],
           ['encours',    '🩹 Cours non terminés',      'encours'],
           ['incidents',  '🚨 Signalements',            'incidents'],
           ['menage',     '🧹 Ménage',                  'menage'],
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

      /* CAISSE · COÛTS IA · COURS NON TERMINÉS · SIGNALEMENTS

         Ces quatre-là étaient écrits ici en dur, « réservé aux
         administratrices ». Ce n'était pas un choix de fond : la
         caisse avait d'abord été posée comme une section ordinaire
         et ne s'affichait pas chez celle qui l'avait demandée —
         ses droits étaient réglés d'avant la naissance de la
         section, et absent veut dire refusé. On avait fermé la
         porte plutôt que de réparer le loquet.

         Le loquet est réparé côté Worker (VERSION_SECTIONS) : une
         section née après un réglage n'a jamais été soumise, donc
         jamais refusée. Ils redeviennent des droits qu'on donne. */
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

  /* Les boutons viennent d'être refaits : les pastilles déjà
     comptées doivent revenir, sinon un simple changement de droits
     effacerait des comptes que plus personne ne recalcule. */
  Object.keys(COMPTES_VUE).forEach(c => poserCompteVue(c, COMPTES_VUE[c]));
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
    /* Les droits touchent aussi au style : on ne laisse pas de doute.
       ET ON REDEMANDE LE DROIT AVANT DE RALLUMER : cette ligne
       rallumait une carte que « appliquerDroits » venait d'éteindre,
       sans jamais vérifier qu'elle avait le droit de revenir. Deux
       mécanismes pour une même question finissent toujours par se
       contredire — ici, en faveur de l'ouverture. */
    if(cache) el.style.display = 'none';
    else if(el.style.display === 'none' &&
            (typeof sectionVisible !== 'function' ||
             sectionVisible(el.getAttribute('data-section')))) el.style.display = '';
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
    /* Deux façons de parler à quelqu'un vivent sur cet écran : le
       message attaché à un ÉLÈVE, et celui épinglé à une PERSONNE.
       Les deux se réveillent ensemble. */
    messages:   () => { afficherConsignesEnAttente();
                        if(typeof afficherMessagesPerso === 'function'){
                          afficherMessagesPerso(true);
                        } },
    textes:     () => afficherModelesTexte(),
    procedures: () => afficherProcedures(),
    bilans:     () => afficherTextesBilan(),
    stats:      () => afficherStats(),
    journal:    () => ACCES.role === 'admin' && afficherJournal(),
    admin:      () => chargerUtilisateurs(),
    eleves:     () => afficherRepertoire(),
    /* Le dossier se redessine seul quand on y revient : le nom
       ouvert est en mémoire, et tout ce qu'il montre aussi. Une vue
       branchée nulle part reste sur « Chargement… » pour toujours —
       c'est ce qui est arrivé à « Historique des cours ». */
    dossier:    () => (typeof dessinerPageEleve === 'function') && dessinerPageEleve(),
    rappels:    () => modeRappel('manuel'),
    sessions:   () => afficherSessionsPermis(),
    /* Une vue branchée nulle part reste sur « Chargement… » pour
       toujours — c'est ce qui était arrivé à « Historique des
       cours », et ça ne se voit qu'en ouvrant la vue. */
    /* LES DEUX VUES APPELLENT LA MÊME FONCTION. Elles lisent la même
       fiche de suivi et le même répertoire ; deux chargements
       séparés, c'était deux occasions de ne pas être d'accord. */
    suivics:    () => (typeof afficherAacCs === 'function') && afficherAacCs(),
    suiviaac:   () => (typeof afficherAacCs === 'function') && afficherAacCs(),
    /* Les cinq vues du permis partagent le même chargement */
    pasprets:   () => afficherBureau(),
    envisager:  () => afficherBureau(),
    preppermis: () => { afficherBureau();
                        if(typeof afficherSolo === 'function') afficherSolo(); },
    resultats:  () => afficherBureau(),
    moto:       () => afficherMoto(),
    remorque:   () => afficherRemorque(),
    paie:       () => afficherPaie(),
    flotte:     () => afficherFlotte(),
    ecran:      () => afficherEcran(),
    proccorriger: () => afficherProcCorriger(),
    code:       () => afficherCode(),
    handicap:   () => afficherHandicap(),
    evaluation: () => afficherEvaluation(),
    financements: () => afficherFinancements(),
    tarifs:     () => afficherTarifs(),
    caisse:     () => afficherCaisse(),
    menage:     () => afficherMenage(),
    coutsia:    () => afficherCoutsIa(),
    paiement:   () => afficherPaiement(),
    placesbe:   () => afficherPlacesBE(),
    notifs:     () => afficherNotifs(),
    taches:     () => afficherTaches(),
    sms:        () => afficherSms(),
    encours:    () => afficherEnCours(),
    incidents:  () => afficherIncidents(),
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

/* Ce que chaque vue signale comme travail en attente.
   Une seule source : la pastille du sous-onglet et celle de
   l'onglet lisent le même registre, elles ne peuvent pas diverger. */
const COMPTES_VUE = {};

/* Dans quel onglet vit une vue. Déduit de VUES : déplacer une vue
   d'un onglet à l'autre ne laisse plus de pastille orpheline —
   c'est exactement ce qui avait rendu invisibles les comptes des
   tâches et de la flotte après leur passage dans Gestion. */
function ongletDeVue(cle){
  return Object.keys(VUES).find(o => VUES[o].some(v => v[0] === cle)) || '';
}

/* La pastille d'un onglet : la somme de ce que ses vues signalent.
   Elle reste visible même quand la barre de vues est masquée
   (un onglet à une seule vue n'affiche pas ses boutons). */
function majAlerteOnglet(onglet){
  if(!onglet || !VUES[onglet]) return;
  const total = VUES[onglet].reduce((s, v) => s + (COMPTES_VUE[v[0]] || 0), 0);
  poserAlerte(onglet, total);
}

/* Un compte affiché sur un bouton de sous-onglet : le nombre de
   tâches se voit sans ouvrir la vue. L'onglet n'est plus donné par
   l'appelant, il se déduit de VUES. */
function poserCompteVue(cle, nombre){
  /* Ancienne forme (onglet, cle, nombre) : l'onglet passé est ignoré */
  if(arguments.length >= 3){ cle = arguments[1]; nombre = arguments[2]; }

  nombre = Number(nombre) || 0;
  COMPTES_VUE[cle] = nombre;

  const onglet = ongletDeVue(cle);
  const b = document.querySelector('.barre-vues[data-pour="' + onglet + '"] ' +
                                   'button[data-vue-cible="' + cle + '"]');
  if(b){
    let p = b.querySelector('.compte-vue');
    if(!nombre){
      if(p) p.remove();
    }else{
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
  }

  majAlerteOnglet(onglet);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-onglets.js'] = true;
