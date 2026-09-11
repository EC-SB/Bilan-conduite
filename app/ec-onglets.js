/* Déployé le 11/09/2026 à 13:30 — v953 */
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
  /* ⚠️ « carrosserie » A QUITTÉ L'ONGLET COURS LE 9 SEPTEMBRE.

     Elle y était pour une raison qui tenait : David, le 8
     septembre, « tout le monde » déclare un dommage — et un
     moniteur n'a que cet onglet-là. Le prix en était une carte hors
     sujet au milieu du geste quotidien, et David l'a dit le
     lendemain : « normalement c'est dans flotte qu'il doit être, il
     n'a rien à faire dans cours ».

     Ce qui rend le déplacement possible sans rien lui retirer :
     « carrosserie » est maintenant dans la liste de GESTION plus
     bas. C'est donc ce droit-là qui ouvre l'onglet au moniteur, et
     il n'y trouve que cette carte. La règle n'a pas changé d'un
     mot : un droit qui ne mène nulle part est pire qu'un droit
     refusé. */
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
  /* « carrosserie » a rejoint la flotte le 9 septembre — David :
     « normalement c'est dans flotte qu'il doit être ». C'est elle
     qui ouvre l'onglet Gestion à un moniteur, et elle seule : il y
     trouvera cette carte et rien d'autre. */
  gestion: ['ecran', 'notifs', 'taches', 'flotte', 'carrosserie', 'paie',
            'caisse', 'coutsia',
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

  /* ⚠️ UNE BARRE VIDE N'EST PAS UNE BARRE — v927.

     David, capture d'un écran de 1900 px : « j'ai encore un
     décalage de bloc, un retrait qui ne sert à rien sur un grand
     écran ».

     L'onglet Cours n'a pas de vues : « VUES » ne le contient pas,
     et sa barre reste donc vide à jamais. Mais cette ligne
     l'affichait quand même — elle ne regardait que le nom de
     l'onglet. Tant que la barre était une rangée horizontale, une
     rangée vide de zéro pixel de haut ne se voyait pas. Depuis la
     v922 elle est devenue une COLONNE de 212 px à partir de
     1280 px : la barre vide s'est mise à pousser toute la carte
     des cours de 228 px vers la droite, et il n'y avait rien à
     voir dedans pour le comprendre.

     Un contenant qu'on montre sans regarder s'il contient quelque
     chose finit toujours par occuper la place de ce qu'il n'a
     pas. */
  document.querySelectorAll('.barre-vues').forEach(b => {
    const aQuelqueChose = b.children.length > 0;
    b.style.display = (b.getAttribute('data-pour') === cle && !b.hidden &&
                       aQuelqueChose) ? 'flex' : 'none';
  });
  if(VUES[cle]) afficherVue(cle, vueActive[cle] || (VUES[cle][0] || [])[0]);
  else libererOngletsSansVues();

  /* La barre vient de s'afficher : c'est maintenant qu'on peut
     mesurer si ses rangées débordent. Masquée, elle mesurait zéro. */
  marquerRangsQuiDebordent();

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
  permis: [['pasprets',  '⛔ Pas prêts',        'bureau_permis', 'Le parcours B'],
           ['envisager', '🤔 À envisager',      'bureau_permis', 'Le parcours B'],
           ['preppermis','📣 Préparation',      'bureau_permis', 'Le parcours B'],
           ['sessions',  '🎓 Suivi permis',     'bureau_permis', 'Le parcours B'],
           ['resultats', '🏁 Résultats',        'bureau_permis', 'Le parcours B'],
           ['moto',      '🏍️ Moto',            'bureau_permis', 'Les autres permis'],
           ['remorque',  '🚚 Remorque',         'bureau_permis', 'Les autres permis']],
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
  /* ⚠️ L'ORDRE EST CELUI DE DAVID, ET LES TITRES AUSSI — v945.

     « Administratif » tout court : le DOSSIER, c'est l'écran d'à
     côté, et répéter le mot ferait croire à un deuxième. Dedans,
     l'ordre du parcours d'inscription — on évalue, on finance, on
     aménage, on inscrit au code.

     Et les PROCÉDURES reviennent « Au quotidien » : c'est un
     travail de tous les jours, pas une pièce de dossier. */
  eleves: [['dossier',    '👤 Dossier élève',         'eleves',      'Au quotidien'],
           ['recherche',  '📚 Historique des leçons', 'recherche',   'Au quotidien'],
           ['rappels',    '🔔 Rappels de cours',      'rappels',     'Au quotidien'],
           ['proccorriger','📥 Procédures',           'proccorriger','Au quotidien'],

           ['evaluation', '📊 Évaluation',            'evaluation',  'Administratif'],
           ['financements','💶 Financements',         'financements','Administratif'],
           ['handicap',   '♿ Handicap',               'handicap',    'Administratif'],
           ['code',       '🎓 Code',                   'code',        'Administratif'],

           /* Le répertoire est devenu ce qu'il restait de lui une
              fois que tout le per-élève est parti dans le dossier :
              l'import, la création, et la liste pour vérifier
              qu'un import a bien atterri. */
           ['eleves',     '➕ Ajouter des élèves',     'eleves',      'Entrées et sorties'],
           ['permis',     '🎓 Permis obtenu',         'permis',      'Entrées et sorties'],
           ['depart',     '🚪 Départ',                'depart',      'Entrées et sorties']],
  /* Ce qui sert au quotidien pédagogique */
  /* Trois familles : ce qu'on MESURE, ce qu'on ÉCRIT une fois pour
     toutes, et ce qu'on DEMANDE au-dehors. */
  outils: [['stats',      '📈 Réussite',               ['stats', 'stats_perso'], 'Mesurer'],
           ['journal',    '📊 Journal',                'journal',     'Mesurer'],

           ['textes',     '📄 Textes types',           'textes',      'Ce qu’on écrit'],
           ['bilans',     '📋 Modèles de bilan',       'bilans',      'Ce qu’on écrit'],
           ['procedures', '🚦 Procédures',             'procedures',  'Ce qu’on écrit'],
           ['memoire',    "🧠 Mémoire de l'IA",         'memoire',     'Ce qu’on écrit'],

           ['placesbe',   '🚚 Places BE',              'placesbe',    'Demandes'],
           ['paiement',   '💳 Paiement en plusieurs fois', 'paiement', 'Demandes'],
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
           /* ⚠️ DEUX DROITS OUVRENT LE BOUTON « RÉUSSITE », plus haut,
              comme pour la Flotte : « stats » montre l'équipe,
              « stats_perso » ne montre que son propre taux. Le
              bouton s'affiche à qui a l'un des deux ; c'est l'écran
              qui décide ensuite de ce qu'il contient. */],

  /* Ce qui relève de la gestion de l'entreprise */
  /* Quatorze boutons, quatre métiers. L'argent, le parc, l'équipe,
     l'outil : on ne cherche pas « quel écran », on sait de quoi on
     s'occupe en ouvrant l'onglet. */
  gestion: [['caisse',    '🏦 Caisse',                  'caisse',      'Argent'],
           ['coutsia',    '💸 Coûts IA',                'coutsia',     'Argent'],
           ['paie',       '💶 Paie',                    'paie',        'Argent'],
           ['tarifs',     '💰 Tarifs',                 'tarifs',       'Argent'],

           /* ⚠️ DEUX DROITS OUVRENT CE BOUTON. La flotte pour ceux
              qui suivent le parc, la carrosserie pour ceux qui n'y
              déclarent qu'une rayure. Chacun n'y voit que sa carte —
              c'est « appliquerDroits » qui éteint l'autre. Sans ça,
              un moniteur aurait l'onglet Gestion sans aucun bouton
              pour y entrer : un droit qui ne mène nulle part est
              pire qu'un droit refusé. */
           ['flotte',     '🚗 Flotte',                  ['flotte', 'carrosserie'], 'Le parc'],
           ['incidents',  '🚨 Signalements',            'incidents',   'Le parc'],

           ['messages',   '📨 Messages internes',      'bureau_messages', 'L’équipe'],
           ['sms',        '💬 SMS',                     'sms',         'L’équipe'],
           ['taches',     '✅ Tâches',                  'taches',      'L’équipe'],
           ['notifs',     '🔔 Alertes',                 'notifs',      'L’équipe'],

           ['ecran',      '📺 Affichage',               'ecran',       'L’outil'],
           ['encours',    '🩹 Cours non terminés',      'encours',     'L’outil'],
           ['menage',     '🧹 Ménage',                  'menage',      'L’outil'],
           ['admin',      '⚙️ Accès',                  'admin',        'L’outil']]
};

/* ============================================================
   « EN UN COUP D'ŒIL » — LA PORTE D'ENTRÉE D'UN ONGLET (v946)

   Étape 4 de la refonte. David : « les tuiles sont pour tout le
   monde », chacun ne voyant que celles des écrans auxquels il a
   droit.

   Une tuile n'est pas une décoration : C'EST UN BOUTON. Elle
   ouvre l'écran qu'elle compte. Deux règles, et elles tiennent
   tout :

   · UNE TUILE À ZÉRO NE S'AFFICHE PAS. Un tableau de bord qui
     montre huit zéros apprend en trois jours qu'il ne sert à rien,
     et on cesse de le lire — comme la ligne qui disait que tout
     allait bien sur chaque carte.
   · UNE TUILE QUI MÈNE À UN ÉCRAN REFUSÉ N'EXISTE PAS. Elle
     promettrait une porte qui ne s'ouvre pas.

   ⚠️ ET ELLE NE COMPTE RIEN ELLE-MÊME.

   Chaque liste pose déjà son compteur en se dessinant. Recompter
   ici serait une seconde vérité, et c'est toujours la mauvaise qui
   finit par gagner : la tuile dirait « 3 » au-dessus d'une liste
   vide. On lit ce que les listes ont publié. Si un compte est
   faux, c'est la liste qu'il faut réparer.

   C'est aussi ce qui rend cette étape bon marché : rien de neuf à
   calculer, seulement à rassembler.
   ============================================================ */
const TUILES = {
  /* ⚠️ L'ORDRE EST CELUI DE DAVID, DONNÉ LE 11 SEPTEMBRE 2026 —
     et il ne se devine pas : il suit sa matinée, de « combien je
     prends de places » jusqu'à « qu'est-ce qui bloque ». */
  permis: [
    { cle:'places',       lib:'Places à prendre',          vue:'sessions',   ton:'urgent',
      valeur:() => (typeof tuilePlacesAPrendre === 'function')
        ? tuilePlacesAPrendre() : null },
    { cpt:'cptAPlacer',   lib:'Dans la liste RDV permis',  vue:'sessions',   ton:'urgent',
      sous:'élèves en attente d’une date' },
    { cpt:'cptEBPrevus',  lib:'Examens blancs prévus',     vue:'envisager',  ton:'' },
    { cpt:'cptAPrevoir',  lib:'Prêts, sans date',          vue:'envisager',  ton:'urgent' },
    { cle:'atraiter',     lib:'Examens à traiter',         vue:'sessions',   ton:'att',
      valeur:() => (typeof tuileExamensATraiter === 'function')
        ? tuileExamensATraiter() : null },
    /* Une tuile par mois ouvert : elles naissent de la
       configuration des places, pas de cette table. */
    { listes:() => (typeof tuilesDesMoisDePlaces === 'function')
        ? tuilesDesMoisDePlaces() : null },
    { cle:'reussite',     lib:'Réussite du mois',          vue:'stats',      ton:'',
      onglet:'outils',
      valeur:() => (typeof tuileReussiteDuMois === 'function')
        ? tuileReussiteDuMois() : null },
    { cpt:'cptPasses',    lib:'Résultats à saisir',        vue:'resultats',  ton:'att' },
    { cpt:'cptAttente',   lib:'Bilans post-permis à faire',vue:'pasprets',   ton:'att' },
    { cpt:'cptPasNiveau', lib:'Examens blancs pas le niveau', vue:'pasprets', ton:'' },
    { cpt:'cptNonPlanif', lib:'Examens non planifiables',  vue:'pasprets',   ton:'urgent',
      sous:'ANTS, avis médical, pièce manquante' }
  ],
  suivi: [
    { cpt:'cptEB',   lib:'Examens blancs à prévoir', vue:'simu',     ton:'urgent' },
    { cpt:'cptSimu', lib:'Simulateurs à prévoir',    vue:'simu',     ton:'att' },
    { cpt:'cptCs',   lib:'Conduite supervisée',      vue:'suivics',  ton:'' },
    { cpt:'cptAac',  lib:'Suivi AAC',                vue:'suiviaac', ton:'' }
  ]
};

/* ⚠️ LES DROITS DE LA PORTE SE DÉDUISENT DE CEUX DES ÉCRANS.

   Les recopier ici aurait fait une seconde liste : le jour où une
   tuile change d'écran, la porte se serait ouverte — ou fermée —
   au mauvais moment. On prend l'union des droits des écrans
   qu'elle résume, et la question « qui voit la porte » répond
   exactement à « qui voit au moins une tuile ». */
Object.keys(TUILES).forEach(onglet => {
  const droits = [];
  TUILES[onglet].forEach(t => {
    /* ⚠️ UNE TUILE PEUT VISER UN ÉCRAN D'UN AUTRE ONGLET — v953.
       « Réussite du mois » vit dans Outils : son droit se lit
       là-bas, pas ici. Mais il n'entre PAS dans le droit d'entrée
       de la porte : ce n'est pas parce qu'on voit la réussite
       qu'on a affaire à l'onglet Permis. */
    if(t.onglet && t.onglet !== onglet) return;
    const v = (VUES[onglet] || []).filter(x => x[0] === t.vue)[0];
    if(!v) return;
    (Array.isArray(v[2]) ? v[2] : [v[2]]).forEach(d => {
      if(d && droits.indexOf(d) === -1) droits.push(d);
    });
  });
  if(droits.length) VUES[onglet].unshift(['coup', '📍 En un coup d’œil', droits, '']);
});

const vueActive = {};

/* ============================================================
   LES FILTRES D'UNE VUE — ÉTAPE 5 (v948)

   L'étape 2 a transformé « Pas prêts » : quatre volets à ouvrir un
   par un sont devenus UNE liste de travail, avec des filtres qui
   portent leur compte. La forme est éprouvée ; il s'agit maintenant
   de la donner aux autres.

   ⚠️ MAIS PAS EN LA RECOPIANT.

   La barre de « Pas prêts » était écrite pour « Pas prêts » : son
   nom, son conteneur, sa variable. La donner à « À envisager » et à
   « Simulateurs » aurait fait trois barres presque identiques —
   trois endroits à corriger le jour où l'on change une règle, et
   deux qu'on oublie. C'est exactement la faute que ce projet passe
   ses semaines à réparer.

   Elle est donc devenue UNE seule barre, qui se branche sur
   n'importe quelle vue :

   · un conteneur « <div class="filtres-vue" data-vue="…"> » dans la
     page marque où elle va ;
   · les volets de cette vue portent « data-famille » ;
   · le reste se lit sur la page — le titre du volet, son compteur.

   Une cinquième liste ajoutée demain à l'une de ces vues apparaîtra
   toute seule dans sa barre. Et une vue à qui l'on veut donner la
   forme n'a besoin que d'un conteneur et de ses « data-famille ».

   ⚠️ ET ELLE NE COMPTE TOUJOURS RIEN. Chaque liste pose son
   compteur en se dessinant ; la barre le relit. Recompter les
   lignes à l'écran serait une seconde vérité, et c'est toujours la
   mauvaise qui gagne.
   ============================================================ */
const filtreDeLaVue = {};        /* vue → famille choisie, ou 'tous' */

function voletsDeLaVue(vue){
  return Array.prototype.slice.call(
    document.querySelectorAll('details[data-vue="' + vue + '"][data-famille]'));
}

/* Le titre d'un volet, sans son compteur : « ⏳ Attente bilan
   post-permis ». */
function titreDuVolet(v){
  const s = v.querySelector('summary');
  if(!s) return v.getAttribute('data-famille') || '';
  const c = s.querySelector('.compteur');
  const n = (c && c.textContent) || '';
  let t = s.textContent || '';
  if(n) t = t.replace(n, '');
  return t.replace(/\s+/g, ' ').trim();
}

function familleDuVolet(v){
  const c = v.querySelector('.compteur');
  return {
    cle: v.getAttribute('data-famille'),
    titre: titreDuVolet(v),
    n: parseInt((c && c.textContent) || '0', 10) || 0,
    el: v
  };
}

function appliquerFiltreDeVue(vue){
  const choisi = filtreDeLaVue[vue] || 'tous';
  voletsDeLaVue(vue).forEach(v => {
    const sien = (choisi === 'tous' || v.getAttribute('data-famille') === choisi);
    v.classList.toggle('filtre-off', !sien);
    /* Choisir un filtre OUVRE la liste : sinon on aurait remplacé
       quatre clics par un clic et un clic. */
    if(sien && choisi !== 'tous') v.open = true;
  });
}

function majFiltresDeVue(vue){
  const barre = document.querySelector('.filtres-vue[data-vue="' + vue + '"]');
  if(!barre) return;

  const fams = voletsDeLaVue(vue).map(familleDuVolet);
  if(fams.length < 2){ barre.innerHTML = ''; return; }

  const total = fams.reduce((t, f) => t + f.n, 0);

  /* Un filtre dont la liste s'est vidée ne doit pas laisser l'écran
     vide sans raison : on retombe sur « Tous ». */
  const choisi = filtreDeLaVue[vue] || 'tous';
  if(choisi !== 'tous' && !fams.some(f => f.cle === choisi && f.n)){
    filtreDeLaVue[vue] = 'tous';
  }

  barre.innerHTML = '';

  const bouton = (cle, titre, n, alerte) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' +
      ((filtreDeLaVue[vue] || 'tous') === cle ? 'btn-primary' : 'btn-secondary');
    b.appendChild(document.createTextNode(titre));
    const s = document.createElement('span');
    s.className = 'n';
    s.textContent = String(n);
    if(alerte) s.style.color = 'var(--red)';
    b.appendChild(s);
    b.addEventListener('click', () => {
      filtreDeLaVue[vue] = cle;
      majFiltresDeVue(vue);
    });
    return b;
  };

  barre.appendChild(bouton('tous', 'Tous', total, false));
  /* UN FILTRE À ZÉRO NE S'AFFICHE PAS. Une rangée de boutons qui ne
     mènent nulle part apprend à ne plus la lire — comme la ligne
     qui disait que tout allait bien sur chaque carte. */
  fams.filter(f => f.n > 0)
      .forEach(f => barre.appendChild(bouton(f.cle, f.titre, f.n, true)));

  /* Rien du tout : on le dit, plutôt que de laisser un « Tous 0 »
     tout seul au milieu de l'écran. */
  if(!total){
    barre.innerHTML = '';
    const v = document.createElement('div');
    v.style.cssText = 'font-size:12.5px;color:var(--accent-text);font-weight:700;' +
      'padding:4px 2px;';
    v.textContent = '✅ Rien qui attende dans ces ' + fams.length + ' listes.';
    barre.appendChild(v);
  }

  appliquerFiltreDeVue(vue);
}

/* Toutes les barres de la page, d'un coup. Appelée par le bureau à
   la fin de son dessin — jamais avant, sinon elle lirait des
   compteurs vides. */
function rafraichirLesFiltres(){
  document.querySelectorAll('.filtres-vue[data-vue]').forEach(b => {
    majFiltresDeVue(b.getAttribute('data-vue'));
  });
}


/* ------------------------------------------------------------
   LE DESSIN DES TUILES
   ------------------------------------------------------------ */

/* Le nombre qu'une liste a publié — ou null si elle ne l'a pas
   encore publié.

   ⚠️ LA DIFFÉRENCE EST TOUT L'ENJEU. Un compteur vide veut dire
   zéro quand la liste s'est dessinée, et « je n'en sais rien »
   avant. Les suivis CS et AAC, par exemple, ne se dessinent qu'en
   ouvrant leur écran : les lire comme des zéros ferait annoncer
   « rien qui attende » sur des listes jamais lues.

   C'est « majVolet » qui pose la marque, à sa première écriture. */
function compteDuVolet(id){
  const el = $(id);
  if(!el) return null;                       /* l'écran n'est pas dans la page */
  if(el.dataset.pose !== '1') return null;   /* sa liste ne s'est pas dessinée */
  return parseInt(el.textContent || '0', 10) || 0;
}

function tuileVisible(onglet, t){
  /* ⚠️ LE DROIT SE DEMANDE À L'ONGLET QUI PORTE L'ÉCRAN — v953.
     « Réussite du mois » vise Outils depuis la porte de Permis :
     chercher sa vue dans VUES.permis la ferait disparaître pour
     tout le monde. */
  const ou = t.onglet || onglet;
  const v = (VUES[ou] || []).filter(x => x[0] === t.vue)[0];
  if(!v) return false;
  const s = v[2];
  if(typeof aDroit !== 'function') return true;
  return Array.isArray(s) ? s.some(aDroit) : aDroit(s);
}

/* Ouvrir l'écran d'une tuile — le sien, ou celui d'un autre onglet. */
function ouvrirLaTuile(onglet, t){
  const ou = t.onglet || onglet;
  if(ou !== onglet && typeof afficherOnglet === 'function') afficherOnglet(ou);
  if(typeof afficherVue === 'function') afficherVue(ou, t.vue);
}

/* ⚠️ CE QU'UNE TUILE VAUT — TROIS RÉPONSES, PAS DEUX — v953.

   Jusqu'ici une tuile lisait un compteur posé par une liste, et
   « null » voulait dire « cette liste ne s'est pas encore
   dessinée ». Les tuiles neuves — les places à prendre, les
   examens du mois, la réussite — ne lisent pas de compteur : elles
   empruntent un nombre déjà calculé ailleurs. Il leur faut donc la
   même nuance, et une de plus :

     · null  — on ne sait pas encore ;
     · false — on sait, et il n'y a rien à dire : la tuile ne
               s'affiche pas, et elle n'entre pas non plus dans la
               liste des « pas encore dessinées » ;
     · { n, texte, sous, ton } — la valeur.

   Un compteur de liste reste lu comme avant : c'est le même
   vocabulaire, juste écrit une fois pour les deux sortes. */
function valeurDeLaTuile(t){
  if(typeof t.valeur === 'function'){
    const v = t.valeur();
    if(v === null || v === undefined) return null;
    if(v === false) return false;
    return v;
  }
  const n = compteDuVolet(t.cpt);
  return (n === null) ? null : { n: n };
}

/* Les tuiles d'un onglet, celles de la table et celles qui naissent
   des données — une par mois ouvert, par exemple. */
function tuilesDeLOnglet(onglet){
  const out = [];
  let inconnue = false;

  (TUILES[onglet] || []).forEach(t => {
    if(typeof t.listes !== 'function'){ out.push(t); return; }
    const l = t.listes();
    /* null : la source n'a pas encore parlé. On ne peut pas nommer
       des tuiles qu'on ne connaît pas ; on retient seulement qu'il
       manque quelque chose. */
    if(l === null || l === undefined){ inconnue = true; return; }
    if(Array.isArray(l)) l.forEach(x => out.push(x));
  });

  return { liste: out.filter(t => tuileVisible(onglet, t)), inconnue: inconnue };
}

function dessinerTuiles(onglet){
  const zone = document.querySelector('[data-vue="coup"][data-onglet="' + onglet + '"] .tuiles');
  if(!zone) return;

  const t0 = tuilesDeLOnglet(onglet);
  zone.innerHTML = '';

  /* ⚠️ « PAS ENCORE LU » N'EST PAS « RIEN À FAIRE ».

     Les compteurs se remplissent quand le bureau a répondu. Avant,
     ils sont vides — et une porte d'entrée qui annonce « rien à
     signaler » sur des listes qu'elle n'a pas encore lues ment
     exactement au moment où on lui fait confiance. */
  const charge = (typeof bureauDejaCharge === 'undefined') || bureauDejaCharge;
  if(!charge){
    zone.innerHTML = '<div class="empty">Lecture des listes…</div>';
    return;
  }

  const lues = t0.liste.map(t => ({ t: t, v: valeurDeLaTuile(t) }));
  /* Une tuile à zéro ne s'affiche pas — sauf celles qui le
     demandent : « 0 / 30 » dit qu'il reste trente places. */
  const aVoir = lues.filter(x => x.v && (x.v.n > 0 || x.t.toujours));
  const inconnues = lues.filter(x => x.v === null);

  if(!aVoir.length){
    const v = document.createElement('div');
    v.className = 'rienASignaler';
    /* ⚠️ ON NE DIT « RIEN » QUE SI L'ON A TOUT LU. Avec une seule
       liste non dessinée, « rien qui attende » serait une promesse
       qu'on ne peut pas tenir. */
    const plusieurs = inconnues.length > 1;
    v.textContent = (inconnues.length || t0.inconnue)
      ? (inconnues.length
          ? '⏳ ' + (plusieurs ? 'Ces listes ne se sont pas encore dessinées'
                              : 'Cette liste ne s’est pas encore dessinée') +
            ' : ' + inconnues.map(x => x.t.lib).join(', ') + '. ' +
            (plusieurs ? 'Ouvre-les' : 'Ouvre-la') +
            ' une fois pour qu’' + (plusieurs ? 'elles se comptent' : 'elle se compte') +
            ' ici.'
          : '⏳ Les listes ne se sont pas encore dessinées.')
      : '✅ Rien qui attende. Les écrans restent accessibles par les ' +
        'boutons au-dessus.';
    zone.appendChild(v);
    return;
  }

  aVoir.forEach(({ t, v }) => {
    const b = document.createElement('button');
    b.type = 'button';
    const ton = v.ton || t.ton;
    b.className = 'tuile' + (ton ? ' ' + ton : '');
    b.setAttribute('data-vue-tuile', t.vue);
    if(t.cle) b.setAttribute('data-tuile', t.cle);

    const fl = document.createElement('span');
    fl.className = 'fl';
    fl.textContent = '›';
    b.appendChild(fl);

    const lib = document.createElement('span');
    lib.className = 'lib';
    lib.textContent = t.lib;
    b.appendChild(lib);

    const val = document.createElement('span');
    val.className = 'v';
    /* Le texte quand la tuile en propose un — « 15 / 30 », « 72,4 % » :
       ces nombres-là ne sont pas des comptes, et les afficher comme
       tels leur ferait dire autre chose. */
    val.textContent = v.texte || String(v.n);
    b.appendChild(val);

    const sous = v.sous || t.sous;
    if(sous){
      const s = document.createElement('span');
      s.className = 'sous';
      s.textContent = sous;
      b.appendChild(s);
    }

    b.addEventListener('click', () => ouvrirLaTuile(onglet, t));
    zone.appendChild(b);
  });
}

/* Les compteurs viennent d'être posés par les listes : les portes
   d'entrée des onglets concernés se refont. Appelée par le bureau
   à la fin de son dessin — jamais avant, sinon elle lirait des
   compteurs vides. */
function rafraichirLesTuiles(){
  Object.keys(TUILES).forEach(dessinerTuiles);
}


/* ⚠️ « CETTE RANGÉE DÉFILE » NE SE DEVINE PAS.

   Sans repère au bord droit, le dernier bouton visible a l'air
   d'être le dernier de la famille : on ne fait pas glisser ce
   qu'on croit entier. Le dégradé ne se pose que sur les rangées
   qui débordent réellement — mesurées, pas supposées : une rangée
   entière ne doit pas se faire manger son bord pour rien.

   Une barre masquée mesure zéro, donc on repasse à chaque fois
   qu'elle s'affiche et à chaque changement de largeur. */
function marquerRangsQuiDebordent(){
  document.querySelectorAll('.barre-vues .rang').forEach(r => {
    r.classList.toggle('deborde', r.scrollWidth > r.clientWidth + 1);
  });
}

window.addEventListener('resize', marquerRangsQuiDebordent);

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
      /* Un bouton peut être ouvert par PLUSIEURS droits : on le
         montre à qui en a au moins un. Voir « Flotte ». */
      if(typeof aDroit !== 'function') return true;
      return Array.isArray(section)
        ? section.some(x => aDroit(x))
        : aDroit(section);
    });

    if(dispo.length < 2){
      /* Un seul module : le bouton n'apporte rien */
      barre.hidden = true;
      vueActive[onglet] = dispo.length ? dispo[0][0] : '';
      return;
    }
    barre.hidden = false;

    /* ============================================================
       LE RANGEMENT EN FAMILLES — v945

       David : « le regroupement des sous-onglets — oui parfait ».

       Quatorze boutons dans Gestion, onze dans Élèves : on ne
       cherchait pas un écran, on le balayait. Les familles ne
       retirent rien et n'ajoutent aucun clic — elles disent
       seulement de quoi on s'occupe.

       ⚠️ LA FAMILLE EST ÉCRITE SUR CHAQUE VUE, PAS DANS UNE SECONDE
       TABLE. Une liste « famille → boutons » posée à côté de VUES
       aurait été un deuxième endroit à tenir à jour : déplacer un
       bouton l'aurait laissé dans son ancienne famille, ou dans les
       deux à la fois. Ici la famille voyage AVEC la vue, et l'ordre
       du tableau est l'ordre affiché.

       Une famille vidée par les droits ne laisse pas son titre
       derrière elle : un intitulé sans bouton est pire qu'un bouton
       absent. C'est ce que fait le « nom !== familleEnCours »
       appliqué après le filtrage — les familles se forment sur ce
       qui reste, pas sur ce qui était prévu.
       ============================================================ */
    const aDesFamilles = dispo.some(x => x[3]);
    barre.classList.toggle('groupee', aDesFamilles);

    const bouton = (cle, libelle) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = libelle;
      b.setAttribute('data-vue-cible', cle);
      b.addEventListener('click', () => afficherVue(onglet, cle));
      return b;
    };

    if(!aDesFamilles){
      dispo.forEach(([cle, libelle]) => barre.appendChild(bouton(cle, libelle)));
    }else{
      let familleEnCours = null;
      let rang = null;
      dispo.forEach(([cle, libelle, , famille]) => {
        const nom = famille || '';
        if(nom !== familleEnCours){
          familleEnCours = nom;
          const grp = document.createElement('div');
          grp.className = 'grp';
          if(nom){
            const t = document.createElement('div');
            t.className = 'fam';
            t.textContent = nom;
            grp.appendChild(t);
          }
          rang = document.createElement('div');
          rang.className = 'rang';
          grp.appendChild(rang);
          barre.appendChild(grp);
        }
        rang.appendChild(bouton(cle, libelle));
      });
    }

    if(!vueActive[onglet] || !dispo.some(x => x[0] === vueActive[onglet])){
      vueActive[onglet] = dispo[0][0];
    }
  });

  /* Le dégradé de débordement se pose sur les rangées qui débordent
     VRAIMENT, mesurées après le dessin. Une barre encore masquée
     mesure zéro : on repasse quand elle s'affiche (afficherOnglet
     rappelle « marquerRangsQuiDebordent »). */
  marquerRangsQuiDebordent();

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
    /* La porte d'entrée se redessine en arrivant dessus : les
       compteurs ont pu changer pendant qu'on était ailleurs. Elle
       ne demande rien au classeur — elle relit ce que les listes
       ont publié. */
    coup:       () => dessinerTuiles(ongletActif),
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
    /* ⚠️ DEUX ÉCRANS SOUS UN SEUL BOUTON, ET CHACUN DEMANDE SON
       DROIT AVANT DE PARTIR.

       Depuis que la carrosserie a rejoint la flotte, ce bouton en
       ouvre deux. Appeler « afficherFlotte » chez un moniteur qui
       n'a que la carrosserie, ce serait un appel refusé par le
       Worker — et un refus met les rafraîchissements en sommeil
       pour deux minutes. Une carte éteinte ne doit pas quand même
       aller frapper à la porte. */
    flotte:     () => {
      const peut = c => typeof aDroit !== 'function' || aDroit(c);
      if(peut('flotte') && typeof afficherFlotte === 'function') afficherFlotte();
      if(peut('carrosserie') && typeof afficherCarrosserie === 'function'){
        afficherCarrosserie();
      }
    },
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
