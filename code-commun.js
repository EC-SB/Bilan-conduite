/* Déployé le 18/11/2026 à 11:54 — v1463 */
/* ============================================================
   code-commun.js — 🚦 « MON CODE », LE JEU DU CODE

   David, le 18 novembre : « sur le même principe que le jeu des
   vérifs, propose-moi un jeu pour le code pour les élèves qui font le
   code avec nous : un memory des panneaux avec l'explication des
   panneaux, un abécédaire des panneaux ; il faut qu'ils apprennent à
   bien regarder l'image et l'analyser, bien comprendre les questions,
   faire attention aux trucs à la con ». Ses réponses au schéma : tous
   les jeux ; un onglet « 🚦 Code » pour ceux qui font le code avec
   nous ; le memory : le panneau et ce qu'il veut dire ; une séance du
   jour de 5 minutes ; je pré-remplis, il corrige — « il faut que je
   puisse modifier si tu as fait des erreurs sur les photos, les
   schémas, les réponses ».

   LIVRAISON 1 (v1462) : l'accueil, la séance du jour, le memory,
   l'abécédaire, les fiches, « à revoir », et l'atelier de l'équipe
   (app/ec-code-jeu.js) qui corrige tout ce qui est écrit ici.

   LIVRAISON 2 (v1463) : 🪤 les pièges (vrai ou faux), 🔍 la question à
   la loupe (toucher les mots qui changent tout), 🔢 le bon chiffre, et
   📝 les conseils pour l'examen. Les pièges viennent du « MÉMO TESTS
   DE CODE » de l'école (groupe Code › Divers), que David m'a laissé
   lire le 18 novembre : ses 16 premiers points sont devenus des
   cartes, les 7 derniers la page des conseils. Les questions
   projetées dans ses vidéos viennent de séries du commerce : elles ne
   sont pas reprises, les exemples d'ici sont écrits pour le jeu. La
   séance du jour mélange maintenant les quatre sortes de cartes.

   Ce fichier est chargé par l'espace élève (eleve.html : le jeu) ET
   par l'appli (index.html : l'atelier, qui lit la liste de base et les
   dessins). Il porte :
     · LE CONTENU DE BASE : 64 panneaux dessinés, avec leur fiche ;
     · LE JEU : il se dessine dans la zone que la page lui donne, avec
       les cartes et les boutons du jeu des vérifs (classes « jv… » et
       « nv… » de eleve.html) ; ce qui lui est propre est en « cj… ».

   ⚠️ LES CORRECTIONS DE DAVID PASSENT PAR-DESSUS (contenu.mod, .ajouts,
   images) : un texte changé, un panneau caché ou ajouté, un dessin
   remplacé par une image. Rien ici n'est à retoucher pour corriger.

   ⚠️ ÉCRIT EN ES5 (var, function), comme eleve.html : les vieux
   téléphones des élèves lisent la page entière ou rien.

   ⚠️ UNE CARTE RATÉE REVIENT : le lendemain, puis 3 jours après, puis
   7, puis 21. Un panneau est « connu » après 3 bonnes réponses de
   suite. C'est la page qui tient ce compte ; le Worker le garde.
   ============================================================ */
(function () {
  'use strict';
  if (window.CodeEC) return;

  /* ============================================================
     LES DESSINS (viewBox 0 0 100 100)
     ============================================================ */
  var R = '#D52B1E', B = '#1E5BC6', N = '#111';
  function tri(x) { return '<polygon points="50,7 96,90 4,90" fill="#fff" stroke="' + R + '" stroke-width="8" stroke-linejoin="round"/>' + (x || ''); }
  function rond(x) { return '<circle cx="50" cy="50" r="44" fill="#fff" stroke="' + R + '" stroke-width="10"/>' + (x || ''); }
  function barre(x) { return rond(x) + '<line x1="21" y1="21" x2="79" y2="79" stroke="' + R + '" stroke-width="8"/>'; }
  function bleu(x) { return '<circle cx="50" cy="50" r="46" fill="' + B + '" stroke="#fff" stroke-width="3"/>' + (x || ''); }
  function carre(x) { return '<rect x="5" y="5" width="90" height="90" rx="10" fill="' + B + '" stroke="#fff" stroke-width="3"/>' + (x || ''); }
  function fin(x) { return '<circle cx="50" cy="50" r="45" fill="#fff" stroke="' + N + '" stroke-width="2.5"/>' + (x || '') + '<line x1="20" y1="80" x2="80" y2="20" stroke="' + N + '" stroke-width="7"/>'; }
  function txt(t, y, s, c) { return '<text x="50" y="' + y + '" font-size="' + s + '" font-weight="800" fill="' + (c || N) + '" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">' + t + '</text>'; }
  function miroir(x) { return '<g transform="translate(100 0) scale(-1 1)">' + x + '</g>'; }
  function pieton(x, y, s, c) {
    c = c || N;
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="none" stroke="' + c + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="1" cy="-19" r="4.6" fill="' + c + '" stroke="none"/><path d="M0 -12 L-1 3 M-1 3 L-9 17 M-1 3 L8 17 M0 -9 L-9 -1 M0 -9 L9 -3"/></g>';
  }
  function velo(x, y, s, c) {
    c = c || N;
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="none" stroke="' + c + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="-13" cy="6" r="8.5"/><circle cx="13" cy="6" r="8.5"/><path d="M-13 6 L-5 -9 L8 -9 L13 6 M-5 -9 L2 6 L-13 6 M2 6 L8 -9 M-9 -12 H-2 M8 -9 L6 -14 H11"/></g>';
  }
  function auto(x, y, c) {
    return '<g transform="translate(' + x + ' ' + y + ')" fill="' + c + '"><rect x="-12" y="-4" width="24" height="11" rx="3"/><path d="M-9 -4 L-6.5 -12 H6.5 L9 -4 Z"/><rect x="-11" y="6" width="5.5" height="5.5"/><rect x="5.5" y="6" width="5.5" height="5.5"/></g>';
  }
  function camion(x, y, c) {
    return '<g transform="translate(' + x + ' ' + y + ')" fill="' + c + '"><rect x="-19" y="-11" width="24" height="17"/><path d="M7 -6 H14 L19 1 V6 H7 Z"/><circle cx="-11" cy="9" r="4.5"/><circle cx="12" cy="9" r="4.5"/></g>';
  }
  var F_HAUT = '<rect x="44" y="36" width="12" height="44" fill="#fff"/><polygon points="50,14 70,40 30,40" fill="#fff"/>';
  var F_COUDE = '<path d="M34 78 V56 Q34 44 48 44 H62" fill="none" stroke="#fff" stroke-width="11"/><polygon points="60,28 84,44 60,60" fill="#fff"/>';
  var F_COTE = '<rect x="18" y="44" width="44" height="12" fill="#fff"/><polygon points="58,30 84,50 58,70" fill="#fff"/>';
  var COUDE_N = '<path d="M60 76 V56 Q60 46 50 46 H42" fill="none" stroke="' + N + '" stroke-width="8"/><polygon points="44,33 26,46 44,59" fill="' + N + '"/>';
  var DEMI_N = '<path d="M61 74 V46 Q61 33 50 33 Q39 33 39 46 V56" fill="none" stroke="' + N + '" stroke-width="8"/><polygon points="28,54 50,54 39,71" fill="' + N + '"/>';
  var ZEBRE = '<g fill="' + N + '"><rect x="31" y="78" width="6" height="5"/><rect x="41" y="78" width="6" height="5"/><rect x="51" y="78" width="6" height="5"/><rect x="61" y="78" width="6" height="5"/></g>';
  var ROUTE = '<path d="M38 84 L46 36 H54 L62 84 Z" fill="#fff"/><rect x="22" y="27" width="56" height="8" fill="#fff"/><rect x="49" y="44" width="2" height="40" fill="' + B + '"/>';
  var LOSANGE = '<polygon points="50,3 97,50 50,97 3,50" fill="#fff" stroke="#333" stroke-width="2"/><polygon points="50,20 80,50 50,80 20,50" fill="#F5C400"/>';

  var FAMILLES = [
    ['priorite', '◆', 'Priorité', 'Qui passe avant qui'],
    ['danger', '🔺', 'Danger', 'Triangle : je me prépare'],
    ['interdiction', '⭕', 'Interdiction', 'Rond rouge : je n’ai pas le droit'],
    ['fin', '⚪', 'Fin d’interdiction', 'Barre noire : c’est fini'],
    ['obligation', '🔵', 'Obligation', 'Rond bleu : je dois'],
    ['indication', '🟦', 'Indication', 'Carré bleu : on m’informe']
  ];

  /* k : la clé · n : le nom · f : la famille · s : le dessin ·
     m : ce qu'il dit · a : ce que je fais · p : le piège · j : son faux jumeau */
  var PANNEAUX = [
    /* ---------- ◆ PRIORITÉ ---------- */
    { k: 'stop', n: 'Stop', f: 'priorite', s: '<polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill="' + R + '" stroke="#fff" stroke-width="4"/>' + txt('STOP', 60, 26, '#fff'),
      m: 'Je m’arrête, même s’il n’y a personne', a: 'Je m’arrête complètement à la ligne, je regarde, puis je repars quand la voie est libre.', p: 'Au « cédez le passage », l’arrêt n’est pas obligatoire. Au stop, il l’est toujours.', j: 'cedez' },
    { k: 'cedez', n: 'Cédez le passage', f: 'priorite', s: '<polygon points="6,10 94,10 50,90" fill="#fff" stroke="' + R + '" stroke-width="10" stroke-linejoin="round"/>',
      m: 'Je laisse passer, à droite et à gauche', a: 'Je ralentis et je regarde des deux côtés. Je ne m’arrête que si quelqu’un arrive.', p: 'Au STOP, je m’arrête toujours, même si la route est vide. Ici, non.', j: 'stop' },
    { k: 'prio', n: 'Route prioritaire', f: 'priorite', s: LOSANGE,
      m: 'J’ai la priorité aux prochaines intersections', a: 'Je continue en restant attentif : avoir la priorité ne dispense pas de regarder.', p: 'Le triangle avec une flèche ne donne la priorité qu’à UNE intersection. Le losange, à toutes les suivantes.', j: 'priop' },
    { k: 'finprio', n: 'Fin de route prioritaire', f: 'priorite', s: LOSANGE + '<line x1="26" y1="74" x2="74" y2="26" stroke="' + N + '" stroke-width="8"/>',
      m: 'Je n’ai plus la priorité aux intersections suivantes', a: 'À la prochaine intersection, sans autre panneau, je cède le passage à droite.', p: 'Ce n’est pas un panneau d’interdiction : il annonce seulement que la priorité s’arrête.', j: 'prio' },
    { k: 'priod', n: 'Priorité à droite', f: 'priorite', s: tri('<line x1="37" y1="50" x2="63" y2="80" stroke="' + N + '" stroke-width="8"/><line x1="63" y1="50" x2="37" y2="80" stroke="' + N + '" stroke-width="8"/>'),
      m: 'À la prochaine intersection, je cède le passage à droite', a: 'Je ralentis et je regarde à droite : celui qui en vient passe avant moi.', p: 'La croix : je cède à droite. La flèche épaisse : c’est moi qui passe.', j: 'priop' },
    { k: 'priop', n: 'Intersection où j’ai la priorité', f: 'priorite', s: tri('<polygon points="50,34 62,50 55,50 55,82 45,82 45,50 38,50" fill="' + N + '"/><rect x="32" y="63" width="36" height="5" fill="' + N + '"/>'),
      m: 'À la prochaine intersection, c’est moi qui passe', a: 'Je passe en restant prudent : les autres doivent me céder le passage, pour cette intersection seulement.', p: 'Valable pour une seule intersection. Avec la croix, c’est l’inverse : je cède à droite.', j: 'priod' },
    { k: 'giratoire', n: 'Carrefour à sens giratoire', f: 'priorite', s: tri('<circle cx="50" cy="65" r="12" fill="none" stroke="' + N + '" stroke-width="5" stroke-dasharray="17 8.1"/><polygon points="50,47 58,53 50,59" fill="' + N + '"/><polygon points="62,74 61,84 53,78" fill="' + N + '"/><polygon points="38,74 36,64 45,68" fill="' + N + '"/>'),
      m: 'Un rond-point : je cède à ceux qui y sont déjà', a: 'Je ralentis, je regarde à gauche, et j’entre quand la voie est libre. Je mets mon clignotant pour sortir.', p: 'Ici, la priorité est à gauche : à ceux qui tournent déjà dans l’anneau.', j: 'priod' },
    { k: 'sensinv', n: 'Cédez le passage à ceux d’en face', f: 'priorite', s: rond('<rect x="34" y="27" width="8" height="30" fill="' + N + '"/><polygon points="27,55 49,55 38,74" fill="' + N + '"/><rect x="58" y="43" width="8" height="30" fill="' + R + '"/><polygon points="51,45 73,45 62,26" fill="' + R + '"/>'),
      m: 'Passage étroit : ceux d’en face passent avant moi', a: 'Je m’arrête avant le passage étroit si quelqu’un arrive en face, et je le laisse passer.', p: 'Ma flèche est la rouge : rouge, je cède. Sur le carré bleu, ma flèche est blanche : je passe.', j: 'priosens' },
    { k: 'priosens', n: 'Priorité sur ceux d’en face', f: 'priorite', s: carre('<rect x="34" y="27" width="8" height="30" fill="' + R + '"/><polygon points="27,55 49,55 38,74" fill="' + R + '"/><rect x="58" y="43" width="8" height="30" fill="#fff"/><polygon points="51,45 73,45 62,26" fill="#fff"/>'),
      m: 'Passage étroit : je passe avant ceux d’en face', a: 'Je passe, en vérifiant que celui d’en face s’arrête bien.', p: 'Rond à bord rouge : c’est moi qui cède. Carré bleu : c’est moi qui passe.', j: 'sensinv' },

    /* ---------- 🔺 DANGER ---------- */
    { k: 'vird', n: 'Virage à droite', f: 'danger', s: tri('<path d="M42 82 V66 Q42 52 60 47" fill="none" stroke="' + N + '" stroke-width="8"/>'),
      m: 'Un virage à droite arrive', a: 'Je ralentis avant le virage, je reste bien à droite, je regarde loin.', p: 'Les panneaux de danger sont posés environ 150 m avant hors agglomération, 50 m en ville.', j: 'tournerd' },
    { k: 'virg', n: 'Virage à gauche', f: 'danger', s: tri(miroir('<path d="M42 82 V66 Q42 52 60 47" fill="none" stroke="' + N + '" stroke-width="8"/>')),
      m: 'Un virage à gauche arrive', a: 'Je ralentis avant le virage, je serre à droite : on ne voit pas qui arrive en face.', p: 'Triangle : il prévient. Le rond bleu avec une flèche, lui, oblige à tourner.', j: 'tournerg' },
    { k: 'virages', n: 'Succession de virages', f: 'danger', s: tri('<path d="M42 83 V75 Q42 65 50 62 Q58 59 58 50 V44" fill="none" stroke="' + N + '" stroke-width="7"/>'),
      m: 'Plusieurs virages, le premier à droite', a: 'Je ralentis et je garde une allure réduite jusqu’au dernier virage.', p: 'Le dessin montre le sens du PREMIER virage.', j: 'vird' },
    { k: 'cassis', n: 'Cassis ou dos-d’âne', f: 'danger', s: tri('<path d="M27 80 Q37 58 48 80 Z M52 80 Q63 58 73 80 Z" fill="' + N + '"/><rect x="25" y="78" width="50" height="4" fill="' + N + '"/>'),
      m: 'La chaussée est déformée : creux ou bosse', a: 'Je ralentis franchement avant, pour garder le contrôle et ménager la voiture.', p: 'Deux bosses : une déformation de la route. Une seule bosse plate : un ralentisseur posé exprès.', j: 'ralent' },
    { k: 'ralent', n: 'Ralentisseur', f: 'danger', s: tri('<path d="M27 80 L39 65 H61 L73 80 Z" fill="' + N + '"/><rect x="25" y="78" width="50" height="4" fill="' + N + '"/>'),
      m: 'Un ralentisseur (dos-d’âne) arrive', a: 'Je le franchis à 30 km/h au plus.', p: 'Le triangle l’annonce ; le carré bleu avec le même dessin est posé à l’endroit même.', j: 'cassis' },
    { k: 'retrecie', n: 'Chaussée rétrécie', f: 'danger', s: tri('<path d="M37 83 V68 L44 57 V45 M63 83 V68 L56 57 V45" fill="none" stroke="' + N + '" stroke-width="6"/>'),
      m: 'La route devient plus étroite', a: 'Je ralentis et je serre à droite : se croiser va être plus difficile.', p: 'Il prévient seulement. Qui passe en premier ? C’est un autre panneau qui le dit.', j: 'sensinv' },
    { k: 'glissante', n: 'Chaussée glissante', f: 'danger', s: tri(auto(50, 55, N) + '<path d="M42 68 q-6 5 0 9 q5 4 -1 7 M58 68 q6 5 0 9 q-5 4 1 7" fill="none" stroke="' + N + '" stroke-width="3.5" stroke-linecap="round"/>'),
      m: 'La route peut être très glissante', a: 'Je ralentis, j’augmente mes distances, j’évite de freiner ou de tourner brusquement.', p: 'Glissante surtout par temps de pluie, de gel ou de feuilles mortes : je m’adapte à la météo.', j: '' },
    { k: 'pnbarr', n: 'Passage à niveau avec barrières', f: 'danger', s: tri('<path d="M31 80 V58 M43 80 V58 M55 80 V58 M67 80 V58 M28 63 H70 M28 74 H70" fill="none" stroke="' + N + '" stroke-width="4.5"/>'),
      m: 'Une voie ferrée avec barrières arrive', a: 'Je ralentis. Feu rouge clignotant ou barrières qui descendent : je m’arrête, je ne m’engage jamais.', p: 'Je ne m’engage que si je peux sortir de l’autre côté sans m’arrêter sur les rails.', j: '' },
    { k: 'enfants', n: 'Endroit fréquenté par les enfants', f: 'danger', s: tri(pieton(43, 66, 0.92) + pieton(61, 71, 0.68)),
      m: 'Des enfants peuvent surgir (école, aire de jeux)', a: 'Je ralentis et je suis prêt à freiner : un enfant peut traverser sans regarder.', p: 'Deux personnages : des enfants. Un seul sur des bandes : un passage pour piétons.', j: 'pietons' },
    { k: 'pietons', n: 'Passage pour piétons', f: 'danger', s: tri(pieton(50, 58, 0.82) + ZEBRE),
      m: 'Un passage pour piétons arrive', a: 'Je ralentis et je regarde les trottoirs : un piéton qui s’engage ou qui le montre passe avant moi.', p: 'Le triangle annonce le passage. Le carré bleu est posé à l’endroit où il se trouve.', j: 'passpietons' },
    { k: 'danger', n: 'Autres dangers', f: 'danger', s: tri('<rect x="46" y="38" width="8" height="28" fill="' + N + '"/><rect x="46" y="72" width="8" height="8" fill="' + N + '"/>'),
      m: 'Un danger que le panneau ne précise pas', a: 'Je ralentis et je lis le panonceau dessous : c’est lui qui dit quel danger.', p: 'Sans panonceau, je ne sais pas ce qui m’attend : raison de plus pour ralentir.', j: '' },
    { k: 'descente', n: 'Descente dangereuse', f: 'danger', s: tri(txt('10%', 60, 14) + '<polygon points="30,66 72,82 30,82" fill="' + N + '"/>'),
      m: 'Une forte descente arrive', a: 'Je rétrograde avant la descente pour utiliser le frein moteur, sans rester sur la pédale de frein.', p: 'Le pourcentage dit la pente : 10 %, c’est 10 m de dénivelé tous les 100 m.', j: '' },
    { k: 'feux', n: 'Feux tricolores', f: 'danger', s: tri('<circle cx="50" cy="47" r="6" fill="' + R + '"/><circle cx="50" cy="61" r="6" fill="#F2B705"/><circle cx="50" cy="75" r="6" fill="#2E9B3E"/>'),
      m: 'Des feux tricolores arrivent', a: 'Je ralentis et je me prépare à m’arrêter : le feu peut être rouge, ou cacher une file à l’arrêt.', p: 'L’orange veut dire arrêt, sauf si je suis trop près pour m’arrêter sans danger.', j: '' },
    { k: 'deuxsens', n: 'Circulation dans les deux sens', f: 'danger', s: tri('<rect x="55" y="54" width="7" height="27" fill="' + N + '"/><polygon points="49,56 68,56 58.5,42" fill="' + N + '"/><rect x="38" y="43" width="7" height="27" fill="' + N + '"/><polygon points="32,68 51,68 41.5,82" fill="' + N + '"/>'),
      m: 'Des véhicules vont arriver en face', a: 'Je reviens bien à droite : je quitte un sens unique, je ne suis plus seul sur la chaussée.', p: 'On le trouve à la fin d’un sens unique ou d’une route à chaussées séparées.', j: 'sensunique' },
    { k: 'pierres', n: 'Risque de chutes de pierres', f: 'danger', s: tri('<path d="M33 82 V46 L45 58 L41 68 L49 82 Z" fill="' + N + '"/><polygon points="55,58 62,60 60,67 53,65" fill="' + N + '"/><polygon points="62,72 69,75 66,82 59,80" fill="' + N + '"/><polygon points="52,74 57,76 55,82 50,80" fill="' + N + '"/>'),
      m: 'Des pierres peuvent tomber ou être sur la route', a: 'Je ralentis et je surveille la chaussée : une pierre peut déjà s’y trouver.', p: 'Le danger est aussi SUR la route, pas seulement au-dessus.', j: '' },
    { k: 'cyclistes', n: 'Débouché de cyclistes', f: 'danger', s: tri(velo(50, 68, 0.78)),
      m: 'Des cyclistes peuvent déboucher', a: 'Je ralentis et je regarde à droite et à gauche.', p: 'Triangle : attention aux vélos. Rond bleu avec un vélo : une piste qui leur est réservée.', j: 'pistevelo' },
    { k: 'vent', n: 'Vent latéral', f: 'danger', s: tri('<rect x="35" y="46" width="4" height="37" fill="' + N + '"/><polygon points="39,47 69,53 69,61 39,64" fill="' + R + '"/><polygon points="47,48.6 55,50.2 55,62.4 47,63.2" fill="#fff"/><polygon points="62,51.6 69,53 69,61 62,61.6" fill="#fff"/>'),
      m: 'Un fort vent de côté peut me déporter', a: 'Je ralentis et je tiens fermement le volant, surtout en doublant un camion ou en sortant d’un abri.', p: 'La manche à air sur la route montre la force et le sens du vent.', j: '' },

    /* ---------- ⭕ INTERDICTION ---------- */
    { k: 'interdit', n: 'Circulation interdite', f: 'interdiction', s: rond(''),
      m: 'Aucun véhicule, dans les deux sens', a: 'Je ne m’y engage pas, quel que soit mon sens d’arrivée.', p: 'Le rond blanc interdit la rue dans les deux sens. Le sens interdit ne l’interdit que dans le mien.', j: 'sens' },
    { k: 'sens', n: 'Sens interdit', f: 'interdiction', s: '<circle cx="50" cy="50" r="46" fill="' + R + '" stroke="#fff" stroke-width="3"/><rect x="18" y="42" width="64" height="16" fill="#fff"/>',
      m: 'Je n’ai pas le droit d’entrer par ici', a: 'Je ne m’engage pas : des véhicules arrivent en face, la rue est à sens unique.', p: 'Interdit dans mon sens seulement. Ceux d’en face, eux, ont le droit de sortir.', j: 'interdit' },
    { k: 'pasgauche', n: 'Interdiction de tourner à gauche', f: 'interdiction', s: barre(COUDE_N),
      m: 'À la prochaine intersection, pas à gauche', a: 'Je continue tout droit ou je tourne à droite.', p: 'Valable pour la prochaine intersection seulement. Le demi-tour, lui, n’est pas interdit par ce panneau.', j: 'pasdemi' },
    { k: 'pasdroite', n: 'Interdiction de tourner à droite', f: 'interdiction', s: barre(miroir(COUDE_N)),
      m: 'À la prochaine intersection, pas à droite', a: 'Je continue tout droit ou je tourne à gauche.', p: 'Rond rouge barré : interdit. Rond bleu avec une flèche : obligé.', j: 'tournerd' },
    { k: 'pasdemi', n: 'Demi-tour interdit', f: 'interdiction', s: barre(DEMI_N),
      m: 'Je n’ai pas le droit de faire demi-tour', a: 'Je continue, et je ferai demi-tour plus loin, là où c’est permis.', p: 'Valable jusqu’à la prochaine intersection comprise. Tourner à gauche reste permis.', j: 'pasgauche' },
    { k: 'pasdepasser', n: 'Interdiction de dépasser', f: 'interdiction', s: rond(auto(36, 50, R) + auto(64, 50, N)),
      m: 'Je n’ai pas le droit de dépasser une voiture', a: 'Je reste derrière les voitures et les camions.', p: 'Je peux encore dépasser un deux-roues : vélo, cyclo, moto sans side-car.', j: 'findepasser' },
    { k: 'stat', n: 'Stationnement interdit', f: 'interdiction', s: '<circle cx="50" cy="50" r="44" fill="' + B + '" stroke="' + R + '" stroke-width="10"/><line x1="20" y1="20" x2="80" y2="80" stroke="' + R + '" stroke-width="10"/>',
      m: 'Je ne me gare pas ici, mais je peux m’arrêter', a: 'Je peux m’arrêter le temps de faire monter ou descendre quelqu’un, en restant près du volant.', p: 'Une barre : le stationnement est interdit, l’arrêt reste permis. Deux barres : rien du tout.', j: 'arret' },
    { k: 'arret', n: 'Arrêt et stationnement interdits', f: 'interdiction', s: '<circle cx="50" cy="50" r="44" fill="' + B + '" stroke="' + R + '" stroke-width="10"/><line x1="20" y1="20" x2="80" y2="80" stroke="' + R + '" stroke-width="10"/><line x1="80" y1="20" x2="20" y2="80" stroke="' + R + '" stroke-width="10"/>',
      m: 'Ni m’arrêter, ni me garer', a: 'Je ne m’arrête pas, même une minute, même en restant au volant.', p: 'Deux barres : même l’arrêt est interdit. Une barre : seulement le stationnement.', j: 'stat' },
    { k: 'paspoids', n: 'Interdit aux poids lourds', f: 'interdiction', s: rond(camion(50, 49, N)),
      m: 'Interdit aux véhicules de transport de marchandises', a: 'En voiture, je passe : il ne me concerne pas.', p: 'Lire qui est concerné : ici, les camions seulement.', j: '' },
    { k: 'paspietons', n: 'Interdit aux piétons', f: 'interdiction', s: rond(pieton(50, 53, 1.05)),
      m: 'Les piétons n’ont pas le droit de passer', a: 'En voiture, je passe. À pied, je prends un autre chemin.', p: 'Rond rouge avec un piéton : interdit aux piétons. Rond bleu : chemin qui leur est réservé.', j: 'chempietons' },
    { k: 'pasvelos', n: 'Interdit aux vélos', f: 'interdiction', s: rond(velo(50, 49, 0.95)),
      m: 'Les cyclistes n’ont pas le droit de passer', a: 'En voiture, je passe : il ne me concerne pas.', p: 'Rond rouge avec un vélo : interdit aux vélos. Rond bleu : piste qui leur est réservée.', j: 'pistevelo' },
    { k: 'l30', n: 'Limité à 30', f: 'interdiction', s: rond(txt('30', 64, 40)),
      m: 'Je ne dépasse pas 30 km/h', a: 'Je roule à 30 km/h au plus, dès le panneau.', p: 'C’est un maximum, pas une vitesse à atteindre : je roule moins vite si la situation le demande.', j: 'vmin' },
    { k: 'l50', n: 'Limité à 50', f: 'interdiction', s: rond(txt('50', 64, 40)),
      m: 'Je ne dépasse pas 50 km/h', a: 'Je roule à 50 km/h au plus, dès le panneau.', p: 'Rond rouge : maximum. Rond bleu : minimum. Carré bleu : vitesse conseillée.', j: 'vconseil' },
    { k: 'l80', n: 'Limité à 80', f: 'interdiction', s: rond(txt('80', 64, 40)),
      m: 'Je ne dépasse pas 80 km/h', a: 'Je roule à 80 km/h au plus, moins s’il pleut ou si la visibilité est mauvaise.', p: 'Permis probatoire : mes propres limites (110 sur autoroute, 100, 80) comptent aussi.', j: 'fin50' },
    { k: 'hauteur', n: 'Hauteur limitée', f: 'interdiction', s: rond(txt('3,5 m', 57, 20) + '<polygon points="43,20 57,20 50,31" fill="' + N + '"/><polygon points="43,80 57,80 50,69" fill="' + N + '"/>'),
      m: 'Interdit aux véhicules plus hauts que 3,5 m', a: 'En voiture, je passe. Avec un coffre de toit ou des vélos sur le toit, je vérifie ma hauteur.', p: 'La hauteur compte le chargement : coffre de toit, galerie, vélos.', j: '' },

    /* ---------- ⚪ FIN D'INTERDICTION ---------- */
    { k: 'fintout', n: 'Fin de toutes les interdictions', f: 'fin', s: fin(''),
      m: 'Les interdictions d’avant ne valent plus', a: 'Je reviens aux règles générales : la vitesse de la route où je suis, le dépassement permis.', p: 'Il lève les interdictions pour les véhicules qui roulent, pas celles de stationner.', j: 'fin50' },
    { k: 'fin50', n: 'Fin de limitation à 50', f: 'fin', s: fin(txt('50', 64, 40, '#8A8A8A')),
      m: 'La limitation à 50 est terminée', a: 'Je reviens à la vitesse maximale de la route où je suis, si les conditions le permettent.', p: 'Il ne lève que la limitation de vitesse : les autres interdictions restent.', j: 'fintout' },
    { k: 'findepasser', n: 'Fin d’interdiction de dépasser', f: 'fin', s: fin(auto(36, 50, '#8A8A8A') + auto(64, 50, '#8A8A8A')),
      m: 'Je peux de nouveau dépasser', a: 'Je peux dépasser, si j’ai la visibilité et la place : ce n’est jamais une obligation.', p: 'Le droit de dépasser revient ; les conditions pour le faire (ligne, visibilité) restent.', j: 'pasdepasser' },
    { k: 'finvelo', n: 'Fin de piste cyclable', f: 'fin', s: bleu(velo(50, 50, 0.95, '#fff')) + '<line x1="20" y1="80" x2="80" y2="20" stroke="' + R + '" stroke-width="7"/>',
      m: 'La piste cyclable obligatoire se termine', a: 'Je m’attends à voir les cyclistes revenir sur la chaussée, devant moi.', p: 'Barre rouge sur fond bleu : la fin d’une obligation.', j: 'pistevelo' },

    /* ---------- 🔵 OBLIGATION ---------- */
    { k: 'droit', n: 'Tout droit obligatoire', f: 'obligation', s: bleu(F_HAUT),
      m: 'À la prochaine intersection, je vais tout droit', a: 'Je continue tout droit : ni à droite, ni à gauche.', p: 'Rond bleu : je dois aller tout droit. Carré bleu avec la même flèche : rue à sens unique.', j: 'sensunique' },
    { k: 'tournerd', n: 'Tourner à droite obligatoire', f: 'obligation', s: bleu(F_COUDE),
      m: 'À la prochaine intersection, je tourne à droite', a: 'Je mets mon clignotant et je tourne à droite à l’intersection.', p: 'Flèche coudée : je tourne à l’intersection, après le panneau. Flèche à plat : je tourne avant le panneau.', j: 'avantd' },
    { k: 'tournerg', n: 'Tourner à gauche obligatoire', f: 'obligation', s: bleu(miroir(F_COUDE)),
      m: 'À la prochaine intersection, je tourne à gauche', a: 'Je mets mon clignotant et je tourne à gauche à l’intersection.', p: 'Rond bleu : obligé. Triangle avec une courbe : simple annonce d’un virage.', j: 'virg' },
    { k: 'avantd', n: 'Tourner à droite avant le panneau', f: 'obligation', s: bleu(F_COTE),
      m: 'Je tourne à droite, juste avant le panneau', a: 'Je tourne à droite devant le panneau, sans aller plus loin.', p: 'Flèche à plat : avant le panneau. Flèche coudée : à la prochaine intersection.', j: 'tournerd' },
    { k: 'contd', n: 'Contournement par la droite', f: 'obligation', s: bleu('<g transform="rotate(135 50 50)">' + F_HAUT + '</g>'),
      m: 'Je passe à droite de l’obstacle', a: 'Je contourne l’îlot ou le terre-plein par la droite.', p: 'La flèche descend vers le côté où je dois passer.', j: 'contg' },
    { k: 'contg', n: 'Contournement par la gauche', f: 'obligation', s: bleu('<g transform="rotate(-135 50 50)">' + F_HAUT + '</g>'),
      m: 'Je passe à gauche de l’obstacle', a: 'Je contourne l’obstacle par la gauche, en vérifiant ceux qui arrivent en face.', p: 'La flèche descend vers le côté où je dois passer.', j: 'contd' },
    { k: 'pistevelo', n: 'Piste cyclable obligatoire', f: 'obligation', s: bleu(velo(50, 50, 0.95, '#fff')),
      m: 'Une piste réservée aux vélos, qu’ils doivent prendre', a: 'En voiture, je n’y roule pas et je ne m’y arrête pas.', p: 'Rond bleu : obligatoire pour les vélos, interdite aux autres. Carré bleu : conseillée seulement.', j: 'pasvelos' },
    { k: 'chempietons', n: 'Chemin obligatoire pour piétons', f: 'obligation', s: bleu(pieton(50, 53, 1.05, '#fff')),
      m: 'Un chemin réservé aux piétons', a: 'En voiture, je n’y roule pas.', p: 'Rond bleu : réservé aux piétons. Rond rouge avec un piéton : interdit aux piétons.', j: 'paspietons' },
    { k: 'vmin', n: 'Vitesse minimale obligatoire', f: 'obligation', s: bleu(txt('30', 65, 42, '#fff')),
      m: 'Je roule à 30 km/h au moins', a: 'Je roule à 30 km/h ou plus, sauf si la circulation ou la météo m’en empêche.', p: 'Rond bleu : minimum. Rond rouge : maximum. Carré bleu : conseillée.', j: 'l30' },

    /* ---------- 🟦 INDICATION ---------- */
    { k: 'parking', n: 'Parking', f: 'indication', s: carre(txt('P', 73, 62, '#fff')),
      m: 'Je peux me garer ici', a: 'Je regarde le panonceau : durée, payant, réservé…', p: 'Il indique un lieu aménagé pour stationner ; les conditions sont écrites dessous.', j: 'stat' },
    { k: 'sensunique', n: 'Circulation à sens unique', f: 'indication', s: carre(F_HAUT),
      m: 'Rue à sens unique : personne en face', a: 'Je peux utiliser toute la largeur de la chaussée, et me placer à gauche pour tourner à gauche.', p: 'Carré bleu : il m’informe. Rond bleu avec la même flèche : il m’oblige à aller tout droit.', j: 'droit' },
    { k: 'impasse', n: 'Voie sans issue', f: 'indication', s: carre('<rect x="43" y="36" width="14" height="48" fill="#fff"/><rect x="28" y="22" width="44" height="14" fill="' + R + '"/>'),
      m: 'La rue ne débouche nulle part', a: 'Je n’y entre que si j’y vais : il faudra faire demi-tour pour ressortir.', p: 'Ce n’est pas une interdiction : j’ai le droit d’y entrer.', j: 'sens' },
    { k: 'passpietons', n: 'Passage pour piétons (position)', f: 'indication', s: carre('<polygon points="50,16 88,84 12,84" fill="#fff"/>' + pieton(50, 57, 0.8) + ZEBRE),
      m: 'Le passage pour piétons est ici', a: 'Je cède le passage au piéton qui traverse ou qui s’apprête à le faire.', p: 'Carré bleu : le passage est là. Triangle rouge : il est plus loin, il l’annonce.', j: 'pietons' },
    { k: 'vconseil', n: 'Vitesse conseillée', f: 'indication', s: carre(txt('70', 66, 44, '#fff')),
      m: '70 km/h est la vitesse conseillée', a: 'Je m’en approche si les conditions sont bonnes : c’est un conseil.', p: 'Carré bleu : conseillée. Rond rouge : maximum. Rond bleu : minimum.', j: 'l50' },
    { k: 'autoroute', n: 'Autoroute', f: 'indication', s: carre(ROUTE),
      m: 'J’entre sur une autoroute', a: 'J’accélère sur la voie d’insertion pour m’insérer. 130 km/h au plus, 110 sous la pluie ou en permis probatoire.', p: 'Interdite aux piétons, vélos, cyclos et véhicules lents. Jamais de demi-tour ni de marche arrière.', j: 'finautoroute' },
    { k: 'finautoroute', n: 'Fin d’autoroute', f: 'indication', s: carre(ROUTE) + '<line x1="14" y1="86" x2="86" y2="14" stroke="' + R + '" stroke-width="7"/>',
      m: 'Je quitte l’autoroute', a: 'Je regarde mon compteur et je ralentis : après l’autoroute, on roule trop vite sans s’en rendre compte.', p: 'Les règles de l’autoroute s’arrêtent : nouvelles limitations, intersections, piétons possibles.', j: 'autoroute' },
    { k: 'agglo', n: 'Entrée d’agglomération', f: 'indication', s: '<rect x="4" y="27" width="92" height="46" rx="6" fill="#fff" stroke="' + R + '" stroke-width="6"/>' + txt('LOUDÉAC', 57, 15.5),
      m: 'J’entre en ville : 50 km/h au plus', a: 'Je descends à 50 km/h dès le panneau, sans attendre un panneau de limitation.', p: 'Aucun rond « 50 » n’est nécessaire : le nom de la ville suffit. Le klaxon y est interdit, sauf danger immédiat.', j: 'finagglo' },
    { k: 'finagglo', n: 'Sortie d’agglomération', f: 'indication', s: '<rect x="4" y="27" width="92" height="46" rx="6" fill="#fff" stroke="' + N + '" stroke-width="3"/>' + txt('LOUDÉAC', 57, 15.5) + '<line x1="8" y1="68" x2="92" y2="32" stroke="' + R + '" stroke-width="7"/>',
      m: 'Je sors de la ville : la limite à 50 s’arrête', a: 'Je peux reprendre la vitesse de la route (80 km/h en général), si les conditions le permettent.', p: 'Tant que je n’ai pas passé ce panneau barré, je suis en ville, même sans maisons.', j: 'agglo' },
    { k: 'zone30', n: 'Zone 30', f: 'indication', s: '<rect x="14" y="4" width="72" height="92" rx="8" fill="#fff" stroke="' + N + '" stroke-width="2.5"/><circle cx="50" cy="40" r="24" fill="#fff" stroke="' + R + '" stroke-width="7"/><text x="50" y="49" font-size="24" font-weight="800" fill="' + N + '" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">30</text>' + txt('ZONE', 88, 15),
      m: 'J’entre dans une zone limitée à 30', a: 'Je roule à 30 km/h au plus dans toutes les rues de la zone, jusqu’au panneau de fin de zone.', p: 'Le rond « 30 » seul vaut pour la rue. Le panneau « zone » vaut pour tout le quartier.', j: 'l30' }
  ];

  /* ============================================================
     🪤 v1463 — LES CARTES DES TROIS AUTRES JEUX

     k : la clé · e : l'explication (le piège, l'astuce).
     PIÈGES   — t : l'affirmation · v : vraie (1) ou fausse (0).
     LOUPE    — q : la question, les mots qui changent tout entre
                accolades : « Je {dois} allumer… ».
     CHIFFRES — q : la question · c : trois choix · b : le bon (0, 1, 2).
     Les numéros « mémo n° » renvoient au MÉMO TESTS DE CODE de l'école.
     ============================================================ */
  var PIEGES = [
    { k: 'toutcocher', v: 0, t: 'Dans une question à plusieurs réponses, toutes les réponses proposées peuvent être bonnes en même temps.', e: 'Il y a toujours au moins une réponse fausse : ne coche jamais tout. (mémo n° 1)' },
    { k: 'imagedabord', v: 1, t: 'Avant de lire la question, je regarde l’image en entier.', e: 'L’image d’abord : tableau de bord, rétros, panneaux, panonceaux, marquage au sol, feux, piétons. (mémo n° 2)' },
    { k: 'deuxquestions', v: 1, t: 'Quand il y a deux questions sur le même écran, il faut une réponse pour chacune.', e: 'Question 1 : A ou B. Question 2 : C ou D. Une réponse oubliée, et toute la question est fausse. (mémo n° 3)' },
    { k: 'brouillardavant', v: 0, t: 'Par temps de brouillard, je DOIS allumer mes feux de brouillard avant.', e: 'Je PEUX, je ne dois pas : les feux de brouillard avant ne sont jamais obligatoires. « Je peux » et « je dois », ce n’est pas la même question. (mémo n° 4)' },
    { k: 'pluiearriere', v: 0, t: 'Sous une forte pluie, j’allume mon feu de brouillard arrière.', e: 'Arrière = BN : Brouillard et Neige seulement. Sous la pluie, il éblouit ceux qui me suivent. (mémo n° 14)' },
    { k: 'pluieavant', v: 1, t: 'Sous une forte pluie, je peux allumer mes feux de brouillard avant.', e: 'Avant = BNP : Brouillard, Neige, forte Pluie. « Les parents vont à la banque BNP, les enfants mangent des BN. » (mémo n° 14)' },
    { k: 'constante', v: 0, t: 'Dans un tunnel où le panneau impose 150 m, je dois garder une distance CONSTANTE de 150 m avec le véhicule devant moi.', e: '150 m est un MINIMUM, pas une distance constante. Attention aux adjectifs : un seul mot rend la phrase fausse. (mémo n° 7)' },
    { k: 'mouille', v: 0, t: 'Sur une route mouillée, ma distance de freinage diminue.', e: 'Elle AUGMENTE. « Augmente » ou « diminue » : lis le verbe deux fois avant de répondre. (mémo n° 6)' },
    { k: 'champvision', v: 1, t: 'Plus je roule vite, plus mon champ de vision diminue.', e: 'À grande vitesse, je ne vois plus bien sur les côtés. Ici « diminue » est le bon mot. (mémo n° 6)' },
    { k: 'probatoire02', v: 1, t: 'En permis probatoire, conduire avec 0,20 g d’alcool par litre de sang me fait perdre 6 points.', e: '6 points, c’est tout le capital de la première année. Pour les sanctions, pense au plus lourd, sans tomber dans l’excès. (mémo n° 5)' },
    { k: 'stups', v: 0, t: 'Conduire après avoir pris des stupéfiants : je risque un retrait de 3 points.', e: 'C’est 6 points, et c’est un délit. La Sécurité routière veut toujours « le plus » : le plus de points, d’amende, de peine. (mémo n° 5)' },
    { k: 'verre', v: 0, t: 'Il faut environ une demi-heure pour éliminer un verre d’alcool.', e: 'Compte plutôt 1 h 30 à 2 h par verre. Rien ne l’accélère : ni le café, ni l’eau, ni le sport. Choisis toujours le plus long. (mémo n° 5)' },
    { k: 'bateau', v: 0, t: 'Un trottoir abaissé (un « bateau ») devant une sortie de garage est une intersection où s’applique la priorité à droite.', e: 'Non : celui qui sort d’un accès privé ou d’un trottoir abaissé cède le passage. En théorie, ce n’est jamais une intersection. (mémo n° 8)' },
    { k: 'questionfausse', v: 1, t: 'À l’examen, une seule erreur dans une question rend toute la question fausse.', e: '40 questions, 5 fausses admises : il faut 35 sur 40. (mémo n° 9)' },
    { k: 'retour', v: 0, t: 'À l’examen, si je doute, je peux revenir plus tard sur la question.', e: 'Pas de retour en arrière : je réponds, puis je passe à la suivante sans y repenser. On zappe. (mémo n° 9)' },
    { k: 'leplus', v: 0, t: 'Quand on me demande LE plus grand danger, je peux cocher deux réponses.', e: '« LE » : une seule réponse. « LES » : plusieurs. (mémo n° 10)' },
    { k: 'aac', v: 1, t: 'Après la conduite accompagnée (AAC), la période probatoire dure 2 ans.', e: 'AAC : 2 ans, 3 points de plus par an sans infraction (2 × 3). Permis B classique : 3 ans, 2 points par an (3 × 2). (mémo n° 11)' },
    { k: 'bclassique', v: 0, t: 'Avec un permis B classique, je gagne 3 points par an pendant la période probatoire.', e: 'Permis B classique : 3 ans, 2 points par an (3 × 2). C’est l’AAC qui donne 3 points par an, pendant 2 ans. (mémo n° 11)' },
    { k: 'nuit', v: 1, t: 'La nuit, il y a moins d’accidents que le jour, mais ils sont plus graves.', e: 'Moins de circulation, donc moins d’accidents, mais plus souvent mortels : la règle des 2/3 – 1/3. (mémo n° 12)' },
    { k: 'trois50', v: 1, t: 'Avec 50 m de visibilité, je ne dépasse pas 50 km/h, même sur autoroute.', e: 'La règle des trois 50 : 50 m de visibilité = 50 km/h au plus = 50 m de distance de sécurité, sur n’importe quelle route. (mémo n° 13)' },
    { k: 'sensinverse', v: 0, t: 'Une voiture est garée face à moi, de mon côté de la rue : je suis forcément dans un sens unique.', e: 'Une voiture garée en sens inverse indique une rue à double sens. Dans un sens unique, toutes sont garées dans mon sens. (mémo n° 15)' },
    { k: 'agent', v: 1, t: 'Le feu est rouge, mais un agent me fait signe de passer : je passe.', e: 'L’ordre de passage : 1. les forces de l’ordre, 2. les feux, 3. les panneaux, 4. la priorité à droite, 5. le marquage au sol. (mémo n° 16)' },
    { k: 'feupanneau', v: 0, t: 'Le feu est vert, avec un panneau STOP posé sous le feu : je dois marquer l’arrêt.', e: 'Le feu qui fonctionne passe avant le panneau. Le panneau ne compte que si le feu est éteint ou clignote à l’orange. (mémo n° 16)' }
  ];
  var LOUPE = [
    { k: 'doispeux', q: 'Pour tourner à gauche à cette intersection, je {dois} céder le passage aux véhicules d’en face. Je {peux} m’avancer dans l’intersection.', e: '« Je dois » : c’est obligatoire. « Je peux » : c’est autorisé, pas obligé. Et il y a 2 questions en une : une réponse par phrase.' },
    { k: 'brouillard', q: 'Par temps de brouillard, je {dois} allumer mes feux de brouillard avant.', e: '« Je dois » : est-ce obligatoire ? Non, ils ne le sont jamais. Avec « je peux », la réponse serait oui.' },
    { k: 'constante', q: 'Dans ce tunnel, je garde une distance {constante} de 150 m avec le véhicule qui me précède.', e: 'Un adjectif change tout : 150 m est une distance minimum, pas constante.' },
    { k: 'diminue', q: 'Sur une chaussée mouillée, la distance de freinage {diminue}.', e: 'Le verbe : augmente ou diminue ? Ici elle augmente, donc la phrase est fausse.' },
    { k: 'ledanger', q: 'Quel est {le} plus grand danger dans cette situation ?', e: '« Le » : une seule réponse attendue. Avec « les dangers », il en faudrait plusieurs.' },
    { k: 'nepas', q: 'Dans cette situation, je {ne} peux {pas} dépasser le cycliste.', e: 'Une négation retourne la réponse : relis la phrase en te demandant « est-ce interdit ? ».' },
    { k: 'stationner', q: 'Devant cette entrée de garage, je peux m’arrêter. Je peux {stationner}.', e: 'L’arrêt (je reste près du volant, le temps de déposer quelqu’un) et le stationnement ne sont pas la même chose.' },
    { k: 'aumoins', q: 'Sur cette route, je dois rouler {au moins} à 80 km/h.', e: '« Au moins » ou « au plus » : une limitation est un maximum, jamais un minimum.' },
    { k: 'uniquement', q: 'Je ralentis {uniquement} parce qu’il pleut.', e: '« Uniquement », « toujours », « jamais » : ces mots rendent souvent la phrase fausse. Y a-t-il une autre raison sur l’image ?' },
    { k: 'quidonc', q: 'Le conducteur de la voiture {blanche} doit céder le passage.', e: 'De qui parle la question : de moi, ou d’un autre véhicule ? Repère-le sur l’image avant de répondre.' },
    { k: 'apres', q: '{Après} ce panneau, la vitesse est limitée à 70 km/h.', e: '« Avant », « après », « à partir de » : la règle commence au panneau, pas avant.' },
    { k: 'obligatoirement', q: 'Pour dépasser ce tracteur, je dois {obligatoirement} klaxonner.', e: '« Obligatoirement » transforme un conseil en obligation : le klaxon est permis hors agglomération, pas obligatoire.' }
  ];
  var CHIFFRES = [
    { k: 'arret50', q: 'Route sèche, bons freins : à 50 km/h, il me faut environ combien de mètres pour m’arrêter ?', c: ['10 m', '25 m', '50 m'], b: 1, e: 'Je multiplie le chiffre des dizaines par lui-même : 5 × 5 = 25 m. Sur route mouillée, j’ajoute la moitié.' },
    { k: 'arret90', q: 'Route sèche : quelle est à peu près ma distance d’arrêt à 90 km/h ?', c: ['45 m', '81 m', '130 m'], b: 1, e: '9 × 9 = 81 m. À 130 km/h : 13 × 13 = 169 m.' },
    { k: 'reaction', q: 'Quel est le temps de réaction d’un conducteur en forme ?', c: ['1 dixième de seconde', '1 seconde', '3 secondes'], b: 1, e: 'Environ 1 seconde. Avec la fatigue, l’alcool ou le téléphone, il s’allonge.' },
    { k: 'reaction90', q: 'À 90 km/h, quelle distance je parcours pendant ma seconde de réaction ?', c: ['9 m', '27 m', '90 m'], b: 1, e: 'Je multiplie le chiffre des dizaines par 3 : 9 × 3 = 27 m.' },
    { k: 'securite130', q: 'À 130 km/h, quelle distance de sécurité dois-je garder avec le véhicule devant moi ?', c: ['39 m', '78 m', '130 m'], b: 1, e: '2 secondes : je multiplie le chiffre des dizaines par 6. 13 × 6 = 78 m, soit 2 traits de la bande d’arrêt d’urgence.' },
    { k: 'alcoolprob', q: 'En permis probatoire, à partir de quel taux d’alcool dans le sang suis-je en infraction ?', c: ['0,2 g/l', '0,5 g/l', '0,8 g/l'], b: 0, e: '0,2 g/l : autant dire zéro verre. Après la période probatoire : 0,5 g/l.' },
    { k: 'points', q: 'Combien de points sur mon permis le jour où je l’obtiens ?', c: ['6', '8', '12'], b: 0, e: '6 points au départ, 12 à la fin de la période probatoire si je n’ai commis aucune infraction.' },
    { k: 'probatoire', q: 'Combien de temps dure la période probatoire après un permis B classique ?', c: ['1 an', '2 ans', '3 ans'], b: 2, e: '3 ans, 2 points de plus par an (3 × 2). Après l’AAC : 2 ans, 3 points par an (2 × 3).' },
    { k: 'autoprob', q: 'En permis probatoire, quelle est ma vitesse maximale sur autoroute ?', c: ['100 km/h', '110 km/h', '130 km/h'], b: 1, e: 'Probatoire : 110 sur autoroute, 100 sur route à chaussées séparées, 80 sur route.' },
    { k: 'autopluie', q: 'Hors période probatoire, quelle est la vitesse maximale sur autoroute quand il pleut ?', c: ['90 km/h', '110 km/h', '130 km/h'], b: 1, e: 'Sous la pluie : 110 au lieu de 130, 100 au lieu de 110, 80 sur route.' },
    { k: 'visibilite', q: 'La visibilité est inférieure à 50 m : quelle vitesse maximale ?', c: ['30 km/h', '50 km/h', '70 km/h'], b: 1, e: 'La règle des trois 50 : 50 m de visibilité = 50 km/h au plus = 50 m de distance de sécurité, partout.' },
    { k: 'examen', q: 'À l’examen du code, combien de questions fausses sont admises sur 40 ?', c: ['3', '5', '8'], b: 1, e: '5 fausses admises : il faut 35 bonnes réponses sur 40.' },
    { k: 'triangle', q: 'À quelle distance au moins je pose le triangle de présignalisation ?', c: ['10 m', '30 m', '100 m'], b: 1, e: '30 m au moins, et visible à 100 m. Je mets d’abord mon gilet, avant de sortir.' },
    { k: 'danger150', q: 'Hors agglomération, à quelle distance avant le danger un panneau triangulaire est-il posé ?', c: ['50 m', '150 m', '500 m'], b: 1, e: 'Environ 150 m hors agglomération, 50 m en ville : le temps de ralentir.' },
    { k: 'ralentisseur', q: 'À quelle vitesse au plus je franchis un ralentisseur ?', c: ['30 km/h', '50 km/h', '70 km/h'], b: 0, e: '30 km/h au plus.' },
    { k: 'nuitaccidents', q: 'Quelle part des accidents a lieu la nuit ?', c: ['1/3', '1/2', '2/3'], b: 0, e: 'La règle des 2/3 – 1/3 du mémo : 1/3 des accidents la nuit, 2/3 le jour, mais ils sont bien plus graves la nuit.' }
  ];
  /* 📝 les conseils d'organisation et pour l'examen (mémo n° 17 à 23) */
  var CONSEILS = [
    'Fais des tests en ligne régulièrement, au calme et sans bruit, et note tes erreurs pour ne plus les refaire.',
    'Fais des examens blancs dans la salle des tablettes : réserve ton accès sur ton compte en ligne, c’est illimité.',
    'Si tu as du mal avec la tablette, tu as le droit d’utiliser un stylet, y compris le jour de l’examen. Ne pose pas ta paume sur l’écran.',
    'Note tes questions et tes difficultés pendant les cours en salle : elles préparent les cours « à la carte ».',
    'Tu peux refaire les séances de code en salle autant que tu veux, ou demander un cours sur mesure.',
    'Concentration : la plupart des erreurs sont des erreurs d’inattention.',
    'Pour l’examen : vérifie que ton dossier ANTS est enregistré et validé.',
    'Pour l’examen : ta carte d’identité est obligatoire.',
    'Pour l’examen : arrive un peu en avance. Toute absence est facturée par l’opérateur.',
    'Zen et détendu.'
  ];
  var TYPES = {
    pieges: { ic: '🪤', nom: 'Les pièges', sous: 'Vrai ou faux ?', pre: 'g:', base: PIEGES, n: 7 },
    loupe: { ic: '🔍', nom: 'La question à la loupe', sous: 'Le mot qui change tout', pre: 'l:', base: LOUPE, n: 4 },
    chiffres: { ic: '🔢', nom: 'Le bon chiffre', sous: 'Distances, vitesses, alcool', pre: 'n:', base: CHIFFRES, n: 6 }
  };
  var ORDRE_TYPES = ['pieges', 'loupe', 'chiffres'];

  /* ============================================================
     LE JEU
     ============================================================ */
  var O = null;                 /* ce que la page a donné : { zone, appeler, prenom } */
  var D = null;                 /* où en est l'élève */
  var LISTE = [], PAR = {};     /* les panneaux du moment (base + corrections) */
  var IMAGES = {};
  var minuteur = 0, charge = false;

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function vibrer(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {} }
  function sansAccent(t) { return String(t || '').normalize ? String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : String(t || '').toLowerCase(); }
  function melanger(l) { l = l.slice(); for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = l[i]; l[i] = l[j]; l[j] = t; } return l; }
  function jourN() { var d = new Date(); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000 + 0.5); }

  /* ---------- le contenu : la base, puis les corrections ---------- */
  function fusionner(contenu, images) {
    var mod = (contenu && contenu.mod) || {};
    var liste = [];
    PANNEAUX.forEach(function (p) {
      var c = mod[p.k] || {};
      liste.push({ k: p.k, n: c.nom || p.n, f: c.fam || p.f, s: p.s, m: c.dit || p.m, a: c.fais || p.a,
                   p: c.piege !== undefined ? c.piege : p.p, j: c.jumeau !== undefined ? c.jumeau : p.j,
                   image: c.image || '', cache: !!c.cache, modifie: Object.keys(c).length > 0, base: true });
    });
    ((contenu && contenu.ajouts) || []).forEach(function (x) {
      if (!x || !x.cle || PAR_BASE[x.cle]) return;
      liste.push({ k: x.cle, n: x.nom || '', f: x.fam || 'danger', s: '', m: x.dit || '', a: x.fais || '', p: x.piege || '', j: x.jumeau || '',
                   image: x.image || '', cache: !!x.cache, ajoute: true });
    });
    return { liste: liste, images: images || {} };
  }
  var PAR_BASE = {};
  PANNEAUX.forEach(function (p) { PAR_BASE[p.k] = p; });
  /* 🪤 v1463 — les cartes d'un jeu : la base, puis les corrections de David */
  function fusionnerCartes(type, contenu) {
    var T = TYPES[type], src = (contenu && contenu.cartes && contenu.cartes[type]) || {};
    var mod = src.mod || {}, liste = [], vus = {};
    T.base.forEach(function (x) {
      var c = mod[x.k] || {}, o = { k: x.k, base: true, modifie: Object.keys(c).length > 0, cache: !!c.cache, e: c.e !== undefined ? c.e : x.e };
      if (type === 'pieges') { o.t = c.t || x.t; o.v = c.v !== undefined ? (c.v ? 1 : 0) : x.v; }
      else o.q = c.q || x.q;
      if (type === 'chiffres') { o.c = (c.c && c.c.length === 3) ? c.c : x.c; o.b = c.b !== undefined ? c.b : x.b; }
      vus[x.k] = true;
      liste.push(o);
    });
    (src.ajouts || []).forEach(function (x) {
      if (!x || !x.cle || vus[x.cle]) return;
      vus[x.cle] = true;
      liste.push({ k: x.cle, ajoute: true, cache: !!x.cache, e: x.e || '', t: x.t || '', v: x.v ? 1 : 0, q: x.q || '', c: x.c || [], b: x.b || 0 });
    });
    return liste;
  }
  function conseilsDe(contenu) {
    var t = contenu && typeof contenu.conseils === 'string' ? contenu.conseils : '';
    return t.trim() ? t.split('\n').filter(function (l) { return l.trim(); }) : CONSEILS.slice();
  }
  var CARTES = { pieges: [], loupe: [], chiffres: [] }, PARC = { pieges: {}, loupe: {}, chiffres: {} }, LES_CONSEILS = [];
  function poserContenu(contenu, images) {
    var f = fusionner(contenu, images);
    IMAGES = f.images;
    LISTE = f.liste.filter(function (p) { return !p.cache && p.n && p.m; });
    PAR = {};
    LISTE.forEach(function (p) { PAR[p.k] = p; });
    ORDRE_TYPES.forEach(function (type) {
      CARTES[type] = fusionnerCartes(type, contenu).filter(function (x) {
        if (x.cache) return false;
        if (type === 'pieges') return !!x.t;
        if (type === 'loupe') return /\{[^{}]+\}/.test(x.q || '');
        return !!x.q && x.c && x.c.length === 3;
      });
      PARC[type] = {};
      CARTES[type].forEach(function (x) { PARC[type][x.k] = x; });
    });
    LES_CONSEILS = conseilsDe(contenu);
  }
  /* le dessin d'un panneau : son image si David en a mis une, sinon le dessin */
  function dessin(p, images) {
    var im = p && p.image && (images || IMAGES)[p.image];
    if (im) return '<img class="cjImg" alt="" src="' + esc(im) + '">';
    if (p && p.s) return '<svg viewBox="0 0 100 100" aria-hidden="true">' + p.s + '</svg>';
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="8" y="8" width="84" height="84" rx="12" fill="none" stroke="#9AA0A6" stroke-width="4" stroke-dasharray="8 6"/><text x="50" y="62" font-size="34" text-anchor="middle" fill="#9AA0A6" font-family="Arial">?</text></svg>';
  }
  function famille(f) { for (var i = 0; i < FAMILLES.length; i++) if (FAMILLES[i][0] === f) return FAMILLES[i]; return FAMILLES[1]; }

  /* ---------- où en est l'élève ---------- */
  var NIVEAUX = [[0, 'Débutant'], [100, 'Apprenti'], [250, 'Conducteur'], [500, 'Copilote'], [900, 'Pilote'], [1500, 'As du code']];
  var ECARTS = [1, 3, 7, 21];
  function vide() { return { v: 1, xp: 0, serie: 0, jour: 0, record: 0, c: {}, vus: {}, mem: {}, seances: 0 }; }
  function propre(d) {
    var o = vide();
    if (!d || typeof d !== 'object') return o;
    ['xp', 'serie', 'jour', 'record', 'seances'].forEach(function (k) { o[k] = Math.max(0, Math.floor(Number(d[k]) || 0)); });
    ['c', 'vus', 'mem'].forEach(function (k) { if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) o[k] = d[k]; });
    return o;
  }
  function carte(k) { var c = D.c[k]; return Array.isArray(c) ? c : [0, 0, 0, 0]; }   /* [boîte, jour dû, bonnes, ratées] */
  function connu(k) { return carte(k)[0] >= 3; }
  function due(k) { var c = carte(k); return c[1] > 0 && c[1] <= jourN(); }
  function nbConnus(f) { return LISTE.filter(function (p) { return (!f || p.f === f) && connu(p.k); }).length; }
  /* 🪤 v1463 — une carte d'un autre jeu se range sous « g: », « l: », « n: » + sa clé */
  function idDe(type, k) { return type === 'p' ? k : TYPES[type].pre + k; }
  function nbSus(type) { return CARTES[type].filter(function (x) { return connu(idDe(type, x.k)); }).length; }
  function niveau() {
    var n = 0;
    for (var i = 0; i < NIVEAUX.length; i++) if (D.xp >= NIVEAUX[i][0]) n = i;
    var suiv = NIVEAUX[n + 1];
    return { n: n + 1, nom: NIVEAUX[n][1], reste: suiv ? suiv[0] - D.xp : 0, pct: suiv ? Math.round(100 * (D.xp - NIVEAUX[n][0]) / (suiv[0] - NIVEAUX[n][0])) : 100 };
  }
  function jouerAujourdhui() {
    var j = jourN();
    if (D.jour === j) return;
    D.serie = (D.jour && j - D.jour === 1) ? D.serie + 1 : 1;
    D.jour = j;
    D.record = Math.max(D.record, D.serie);
  }
  function noter(k, ok) {
    var c = carte(k).slice(), j = jourN();
    if (ok) { c[0] = Math.min(c[0] + 1, ECARTS.length); c[2]++; c[1] = j + ECARTS[c[0] - 1]; D.xp += 10; }
    else { c[0] = 0; c[3]++; c[1] = j + 1; }
    D.c[k] = c;
    jouerAujourdhui();
    sauver();
  }
  function sauver() {
    clearTimeout(minuteur);
    minuteur = setTimeout(function () {
      try { O.appeler('poser', { donnees: D }).catch(function () {}); } catch (e) {}
    }, 1200);
  }

  /* ---------- le style (ce qui n'est pas déjà dans le jeu des vérifs) ---------- */
  var CSS =
    '.jv .cjModes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 12px}.jv .cjModes .jvMode{margin:0}' +
    '.jv .cjSous{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 2px 8px}' +
    '.jv .cjNote{font-size:12.5px;color:var(--muted);line-height:1.45;margin:2px 2px 12px}' +
    '.jv .cjImg{display:block;width:100%;height:100%;object-fit:contain}' +
    '.jv .cjMem{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}' +
    '.jv .cjMem button{min-width:0;aspect-ratio:3/4;border-radius:14px;border:2px solid var(--verre-bord,var(--line));background:var(--verre2,var(--navy-deep));display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;margin:0;text-align:center;font-family:inherit;font-weight:800;font-size:10.5px;line-height:1.2;color:var(--cream);cursor:pointer;width:auto;min-height:0;height:auto}' +
    '.jv .cjMem button svg,.jv .cjMem button .cjImg{width:78%;height:auto;max-height:78%}' +
    '.jv .cjMem button.dos{background:linear-gradient(160deg,#C6FF3D,#9BE200);border-color:transparent;color:#14161B;font-size:18px;font-weight:900;box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}' +
    '.jv .cjMem button.ok{border-color:#2E8B14;background:rgba(46,139,20,.12);cursor:default}' +
    '.jv .cjMem button.vue{border-color:#14161B;box-shadow:0 0 0 3px rgba(182,255,14,.55)}' +
    '.jv .cjMem button.non{border-color:#C33A12}' +
    '@media (min-width:560px){.jv .cjMem button{font-size:12.5px}}' +
    '.jv .cjFiche{text-align:center;padding:6px 0 2px}' +
    '.jv .cjFiche svg,.jv .cjFiche .cjImg{width:118px;height:118px;margin:0 auto;filter:drop-shadow(0 6px 10px rgba(0,0,0,.18))}' +
    '.jv .cjFiche h3{margin:8px 0 4px;font-size:21px;font-weight:900;letter-spacing:-.01em}' +
    '.jv .cjFam{display:inline-block;font-size:11px;font-weight:800;border-radius:999px;padding:3px 10px;background:#14161B;color:#fff}' +
    '.jv .cjJumeau{display:flex;gap:10px;align-items:center}.jv .cjJumeau svg,.jv .cjJumeau .cjImg{width:46px;height:46px;flex:none}' +
    '.jv .cjBtn{display:block;width:100%;border:0;border-radius:16px;padding:13px;margin:12px 0 0;font-family:inherit;font-weight:800;font-size:15.5px;line-height:1.2;background:linear-gradient(180deg,#C6FF3D,#A8F000);color:#14161B;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 8px 18px rgba(150,220,0,.3);cursor:pointer;min-height:0;height:auto}' +
    '.jv .cjBtn.sec{background:var(--verre2,var(--navy-deep));color:var(--cream);border:1px solid var(--verre-bord,var(--line));box-shadow:none}' +
    '.jv .cjRech{display:block;width:100%;box-sizing:border-box;border:1px solid var(--verre-bord,var(--line));background:var(--verre2,var(--navy-deep));border-radius:999px;padding:11px 16px;font-family:inherit;font-size:15px;color:var(--cream);font-weight:600;margin:0}' +
    '.jv .cjSeg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:14px;background:var(--verre2,var(--navy-deep));border:1px solid var(--verre-bord,var(--line));margin:10px 0}' +
    '.jv .cjSeg button{margin:0;width:auto;min-height:0;height:auto;border:0;background:transparent;text-align:center;padding:8px 4px;border-radius:11px;font-family:inherit;font-weight:800;font-size:13px;color:var(--muted);cursor:pointer}' +
    '.jv .cjSeg button.on{background:#14161B;color:#fff}' +
    '.jv .cjLogique{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:8px 0 2px}' +
    '.jv .cjLogique div{text-align:center;font-size:10.5px;font-weight:700;color:var(--muted);line-height:1.25}' +
    '.jv .cjLogique svg{width:30px;height:30px;display:block;margin:0 auto 3px}' +
    '.jv .cjAbc{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}' +
    '.jv .cjAbc button{position:relative;min-width:0;margin:0;width:auto;min-height:0;height:auto;text-align:center;font-family:inherit;font-size:10.5px;font-weight:700;line-height:1.2;color:var(--cream);border-radius:14px;padding:8px 4px 7px;border:1px solid var(--verre-bord,var(--line));background:var(--verre2,var(--navy-deep));cursor:pointer;overflow-wrap:anywhere}' +
    '.jv .cjAbc button svg,.jv .cjAbc button .cjImg{width:44px;height:44px;display:block;margin:0 auto 5px}' +
    '.jv .cjAbc button.su::after{content:"✓";position:absolute;right:5px;top:5px;width:17px;height:17px;border-radius:50%;background:#B6FF0E;color:#14161B;font-size:11px;font-weight:900;display:grid;place-items:center}' +
    '@media (min-width:560px){.jv .cjAbc{grid-template-columns:repeat(6,minmax(0,1fr))}.jv .cjAbc button{font-size:12px}}' +
    '.jv .cjQ{text-align:center;margin-top:10px}.jv .cjQ svg,.jv .cjQ .cjImg{width:132px;height:132px;margin:0 auto;filter:drop-shadow(0 6px 10px rgba(0,0,0,.16))}' +
    '.jv .cj4{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}' +
    '.jv .cj4 button{margin:0;width:auto;min-height:0;height:auto;border-radius:18px;border:2px solid var(--verre-bord,var(--line));background:var(--verre2,var(--navy-deep));padding:14px 10px;cursor:pointer}' +
    '.jv .cj4 button svg,.jv .cj4 button .cjImg{width:84px;height:84px;display:block;margin:0 auto}' +
    '.jv .cj4 button.bon{border-color:#2E8B14;background:rgba(46,139,20,.12)}.jv .cj4 button.faux{border-color:#C33A12;background:rgba(195,58,18,.10);opacity:.7}' +
    '.jv .cjBilan{text-align:center;padding:10px 0}.jv .cjBilan .g{font-size:46px}.jv .cjBilan h3{margin:4px 0 2px;font-size:22px;font-weight:900}' +
    '.jv .cjBilan p{margin:0;color:var(--muted);font-size:14px}' +
    '.jv .cjStats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}' +
    '.jv .cjStats div{border-radius:14px;padding:10px 4px;background:var(--verre2,var(--navy-deep));border:1px solid var(--verre-bord,var(--line));text-align:center;font-size:11.5px;font-weight:700;color:var(--muted)}' +
    '.jv .cjStats b{display:block;font-size:20px;color:var(--cream)}' +
    '.jv .cjSeries{display:flex;flex-direction:column;gap:8px;margin-top:10px}' +
    /* 🪤 v1463 — les pièges, la loupe, le bon chiffre, les conseils */
    '.jv .cjVF{border-radius:22px;padding:22px 18px;margin-top:12px;min-height:130px;display:flex;flex-direction:column;justify-content:center;background:linear-gradient(135deg,rgba(182,255,14,.2),var(--verre2,var(--navy-deep)));border:2px solid #B6E35A;font-size:18px;font-weight:800;line-height:1.4;text-align:center;color:var(--cream)}' +
    '.jv .cjVF small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:800;margin-bottom:8px}' +
    '.jv .cjDeux{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}' +
    '.jv .cjDeux button,.jv .cjTrois button{margin:0;width:auto;min-height:0;height:auto;border-radius:16px;font-family:inherit;font-weight:900;line-height:1.2;border:2px solid var(--verre-bord,var(--line));background:var(--verre2,var(--navy-deep));color:var(--cream);cursor:pointer}' +
    '.jv .cjDeux button{padding:14px 6px;font-size:16px}' +
    '.jv .cjTrois{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}' +
    '.jv .cjTrois button{padding:16px 4px;font-size:18px;overflow-wrap:anywhere}' +
    '.jv .cjDeux button.bon,.jv .cjTrois button.bon{border-color:#2E8B14;background:rgba(46,139,20,.14)}' +
    '.jv .cjDeux button.faux,.jv .cjTrois button.faux{border-color:#C33A12;background:rgba(195,58,18,.10);opacity:.7}' +
    '.jv .cjEnonce{border-radius:18px;padding:14px 12px;margin-top:10px;background:var(--verre2,var(--navy-deep));border:1px solid var(--verre-bord,var(--line));line-height:2.5}' +
    '.jv .cjEnonce .m{display:inline-block;margin:0;width:auto;min-height:0;height:auto;border-radius:9px;padding:4px 7px;border:1.5px dashed var(--verre-bord,#C9CCBF);background:transparent;color:var(--cream);font-family:inherit;font-size:16px;font-weight:700;line-height:1.3;cursor:pointer}' +
    '.jv .cjEnonce .p{font-size:16px;font-weight:700;color:var(--cream);margin-left:2px}' +
    '.jv .cjEnonce .m.cle{background:#B6FF0E;color:#14161B;border:1.5px solid #14161B;font-weight:900}' +
    '.jv .cjEnonce .m.non{border:1.5px solid #D0491F;color:#D0491F;text-decoration:line-through}' +
    '.jv .cjConseils{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:14.5px;line-height:1.45;color:var(--cream)}';
  function poserLeStyle() {
    if (document.getElementById('cjStyle')) return;
    var s = document.createElement('style');
    s.id = 'cjStyle';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- les morceaux d'écran ---------- */
  function zone() { return O.zone; }
  function ecran(html) {
    var z = zone();
    z.innerHTML = '<div class="jv" data-cj="1"></div>';
    var j = z.firstChild;
    if (html) j.innerHTML = html;
    try { window.scrollTo(0, 0); } catch (e) {}
    return j;
  }
  function haut(j, titre, fait, total, retour) {
    var h = el('div', 'jvHaut');
    var x = el('button', 'jvX', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Fermer');
    x.addEventListener('click', retour || accueil);
    h.appendChild(x);
    h.appendChild(el('span', 'q', esc(titre)));
    j.appendChild(h);
    if (total) {
      var e = el('div', 'jvEtapes');
      for (var i = 0; i < total; i++) e.appendChild(el('span', i < fait ? 'f' : (i === fait ? 'c' : '')));
      j.appendChild(e);
    }
  }
  function bulle(j, qui, texte) { var b = el('div', 'jvBulle', '<span class="qui">' + esc(qui) + '</span>' + texte); j.appendChild(b); return b; }
  function bouton(j, texte, faire, sec) {
    var b = el('button', 'cjBtn' + (sec ? ' sec' : ''), esc(texte));
    b.type = 'button';
    b.addEventListener('click', faire);
    j.appendChild(b);
    return b;
  }
  function mode(g, e, t, s, nb, faire) {
    var b = el('button', 'jvMode', '<span class="e">' + e + '</span><span><b>' + esc(t) + '</b><small>' + esc(s) + '</small></span>' + (nb ? '<span class="jvNb">' + nb + '</span>' : ''));
    b.type = 'button';
    b.setAttribute('data-cj-mode', t);
    b.addEventListener('click', faire);
    g.appendChild(b);
  }

  /* ============================================================
     ① L'ACCUEIL
     ============================================================ */
  function accueil() {
    var j = ecran('');
    var nv = niveau(), total = LISTE.length, su = nbConnus();
    j.appendChild(el('div', 'card jvHero',
      '<div class="jvLigneH"><span class="jvGros">🚦 Mon code</span><span class="jvFlamme">🔥 ' + D.serie + ' jour' + (D.serie > 1 ? 's' : '') + '</span></div>' +
      '<div class="jvDoux" style="margin-top:2px">Niveau ' + nv.n + ' · ' + esc(nv.nom) + ' · ' + D.xp + ' XP</div>' +
      '<div class="jvXp"><i style="width:' + nv.pct + '%"></i></div>' +
      '<div class="jvDoux"><b style="color:#B6FF0E">' + su + '</b> panneau' + (su > 1 ? 'x' : '') + ' connu' + (su > 1 ? 's' : '') + ' sur ' + total +
      ' · <b style="color:#B6FF0E">' + nbSus('pieges') + '</b> piège' + (nbSus('pieges') > 1 ? 's' : '') + ' déjoué' + (nbSus('pieges') > 1 ? 's' : '') + ' sur ' + CARTES.pieges.length + '</div>'));
    var go = el('button', 'nvGo', '<span class="e">▶️</span><span><b>Ma séance du jour</b><small>5 minutes : des panneaux, des pièges, une question à la loupe, un chiffre</small></span>');
    go.type = 'button';
    go.setAttribute('data-cj-mode', 'seance');
    go.addEventListener('click', function () { seance(false); });
    j.appendChild(go);
    j.appendChild(el('div', 'cjSous', 'Les jeux'));
    var g = el('div', 'cjModes');
    var r = toutesDues().length;
    mode(g, '🃏', 'Memory des panneaux', 'Le panneau et ce qu’il veut dire', 0, choisirMemory);
    mode(g, '🔤', 'L’abécédaire', 'Tous les panneaux, expliqués', 0, function () { abecedaire(); });
    ORDRE_TYPES.forEach(function (type) {
      var T = TYPES[type];
      if (CARTES[type].length) mode(g, T.ic, T.nom, T.sous, 0, function () { seance(false, type); });
    });
    mode(g, '🔁', 'À revoir', r ? r + ' carte' + (r > 1 ? 's reviennent' : ' revient') + ' aujourd’hui' : 'Rien à revoir 👏', r, function () { seance(true); });
    if (LES_CONSEILS.length) mode(g, '📝', 'Conseils pour l’examen', 'Le mémo de l’auto-école', 0, conseils);
    j.appendChild(g);
    j.appendChild(el('div', 'cjNote', 'Bientôt ici : 👀 L’œil du conducteur et 🚦 Qui passe ?'));
    var c = el('div', 'card', '<div class="section-title" style="margin-bottom:4px">📈 Où j’en suis</div>');
    FAMILLES.forEach(function (f) {
      var t = LISTE.filter(function (p) { return p.f === f[0]; }).length;
      if (!t) return;
      var n = nbConnus(f[0]);
      var b = el('button', 'nvTheme', '<span class="e">' + f[1] + '</span><span class="n">' + esc(f[2]) + '</span><span class="bar"><i style="width:' + Math.round(100 * n / t) + '%"></i></span><span class="c">' + n + '/' + t + '</span>');
      b.type = 'button';
      b.addEventListener('click', function () { abecedaire(f[0]); });
      c.appendChild(b);
    });
    ORDRE_TYPES.forEach(function (type) {
      var T = TYPES[type], t = CARTES[type].length;
      if (!t) return;
      var n = nbSus(type);
      var b = el('button', 'nvTheme', '<span class="e">' + T.ic + '</span><span class="n">' + esc(T.nom) + '</span><span class="bar"><i style="width:' + Math.round(100 * n / t) + '%"></i></span><span class="c">' + n + '/' + t + '</span>');
      b.type = 'button';
      b.addEventListener('click', function () { seance(false, type); });
      c.appendChild(b);
    });
    j.appendChild(c);
  }
  /* 📝 v1463 — les conseils du mémo (n° 17 à 23) : à lire, rien à gagner */
  function conseils() {
    var j = ecran('');
    haut(j, '📝 Conseils pour l’examen');
    var c = el('div', 'card', '<div class="section-title" style="margin-bottom:6px">Le mémo de l’auto-école</div>');
    var l = el('ul', 'cjConseils');
    LES_CONSEILS.forEach(function (t) { l.appendChild(el('li', '', esc(t))); });
    c.appendChild(l);
    j.appendChild(c);
    bouton(j, 'Retour', accueil, true);
  }

  /* ============================================================
     ② LA FICHE D'UN PANNEAU
     ============================================================ */
  function fiche(k, titre, fait, total, suite, libelle) {
    var p = PAR[k];
    if (!p) { suite(); return; }
    var j = ecran('');
    haut(j, titre, fait, total, suite);
    var f = famille(p.f);
    var c = el('div', 'card');
    c.appendChild(el('div', 'cjFiche', dessin(p) + '<h3>' + esc(p.n) + '</h3><span class="cjFam">' + f[1] + ' ' + esc(f[2]) + '</span>'));
    c.appendChild(el('div', 'nvBloc', '<b class="t">Ce qu’il dit</b>' + esc(p.m)));
    if (p.a) c.appendChild(el('div', 'nvBloc', '<b class="t">Ce que je fais</b>' + esc(p.a)));
    if (p.p) {
      var ju = p.j && PAR[p.j];
      c.appendChild(el('div', 'nvBloc dit', '<b class="t">🪤 À ne pas confondre</b>' + (ju ? '<div class="cjJumeau">' + dessin(ju) + '<span>' + esc(p.p) + '</span></div>' : esc(p.p))));
    }
    j.appendChild(c);
    var neuf = !D.vus[k];
    bouton(c, libelle || (neuf ? 'J’ai compris · +5 XP' : 'J’ai compris'), function () {
      if (neuf) { D.vus[k] = 1; D.xp += 5; jouerAujourdhui(); sauver(); }
      suite();
    });
  }

  /* ============================================================
     ③ LA SÉANCE DU JOUR (et « à revoir ») : reconnaître les panneaux
     ============================================================ */
  var S = null;
  /* Les cartes d'une sorte, dans l'ordre où elles doivent sortir :
     celles qui reviennent aujourd'hui, les jamais vues, puis les autres
     (les moins sues d'abord). « p » = les panneaux. */
  function pioche(type) {
    var l = type === 'p' ? LISTE : CARTES[type], j = jourN();
    var id = function (x) { return idDe(type, x.k); };
    var dues = melanger(l.filter(function (x) { return due(id(x)); }));
    var neufs = melanger(l.filter(function (x) { return carte(id(x))[1] === 0; }));
    var autres = melanger(l.filter(function (x) { return carte(id(x))[1] > j; })).sort(function (a, b) { return carte(id(a))[0] - carte(id(b))[0]; });
    return { dues: dues, suite: neufs.concat(autres) };
  }
  function toutesDues() {
    var out = [];
    ['p'].concat(ORDRE_TYPES).forEach(function (t) { pioche(t).dues.forEach(function (x) { out.push({ t: t, k: x.k }); }); });
    return out;
  }
  /* seance(false)        : la séance du jour, mélangée
     seance(true)         : « à revoir », tout ce qui revient aujourd'hui
     seance(false, type)  : un seul jeu (pieges, loupe, chiffres) */
  function seance(revoirSeul, type) {
    var l = [];
    var prendre = function (t, n) {
      var p = pioche(t);
      p.dues.concat(p.suite).slice(0, n).forEach(function (x) { l.push({ t: t, k: x.k }); });
    };
    if (revoirSeul) l = melanger(toutesDues()).slice(0, 12);
    else if (type) prendre(type, TYPES[type].n);
    else {
      /* 4 panneaux, 2 pièges, 1 loupe, 1 chiffre ; s'il manque une sorte, des panneaux à la place */
      prendre('pieges', 2); prendre('loupe', 1); prendre('chiffres', 1);
      prendre('p', 8 - l.length);
      l = melanger(l);
    }
    if (!l.length) {
      var j = ecran('');
      haut(j, revoirSeul ? '🔁 À revoir' : '▶️ Ma séance du jour');
      j.appendChild(el('div', 'card cjBilan', '<div class="g">👏</div><h3>Rien à revoir</h3><p>Les cartes ratées reviennent le lendemain. Lance ta séance du jour.</p>'));
      bouton(j, 'Retour', accueil, true);
      return;
    }
    S = { l: l, i: 0, bons: 0, rates: [], titre: revoirSeul ? '🔁 À revoir' : (type ? TYPES[type].ic + ' ' + TYPES[type].nom : '▶️ Ma séance du jour'), xp0: D.xp };
    question();
  }
  function leurres(p, n) {
    /* le faux jumeau d'abord, puis sa famille, puis les autres */
    var out = [];
    if (p.j && PAR[p.j]) out.push(PAR[p.j]);
    melanger(LISTE.filter(function (x) { return x.f === p.f; })).concat(melanger(LISTE)).forEach(function (x) {
      if (out.length >= n || x.k === p.k || x.m === p.m) return;
      if (out.some(function (y) { return y.k === x.k; })) return;
      out.push(x);
    });
    return out.slice(0, n);
  }
  /* Ce qui suit une réponse, pour toutes les sortes de cartes */
  function apresReponse(j, id, ok, html, fichePanneau) {
    vibrer(ok ? 12 : 60);
    noter(id, ok);
    if (ok) S.bons++; else S.rates.push(S.l[S.i]);
    j.appendChild(el('div', ok ? 'nvVerso' : 'nvFaux', html));
    if (!ok && fichePanneau) bouton(j, 'Voir la fiche', function () { fiche(fichePanneau, S.titre, S.i, S.l.length, function () { S.i++; question(); }, 'Continuer'); }, true);
    var suite = bouton(j, S.i + 1 >= S.l.length ? 'Voir mon résultat' : 'Suivant', function () { S.i++; question(); });
    try { suite.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }
  function question() {
    if (S.i >= S.l.length) { finSeance(); return; }
    var x = S.l[S.i];
    var j = ecran('');
    haut(j, S.titre, S.i, S.l.length);
    j.setAttribute('data-cj-type', x.t);
    if (x.t === 'pieges') { questionPiege(j, PARC.pieges[x.k]); return; }
    if (x.t === 'loupe') { questionLoupe(j, PARC.loupe[x.k]); return; }
    if (x.t === 'chiffres') { questionChiffre(j, PARC.chiffres[x.k]); return; }
    var p = PAR[x.k];
    if (!p) { S.i++; question(); return; }
    var sens = Math.random() < 0.5;      /* le panneau → son sens, ou le sens → son panneau */
    var repondu = false, suite = null;
    var repondre = function (b, k, tous) {
      if (repondu) return;
      repondu = true;
      var ok = k === p.k;
      tous.forEach(function (x) { x.b.disabled = true; if (x.k === p.k) x.b.className += ' bon'; });
      if (!ok) b.className += ' faux';
      apresReponse(j, p.k, ok, ok
        ? '<small>✅ Oui · +10 XP</small>' + esc(p.a || p.m)
        : '<b>❌ C’était « ' + esc(p.n) + ' »</b>' + esc(p.m) + '. Cette carte revient demain.', p.k);
    };
    var choix = melanger([p].concat(leurres(p, sens ? 2 : 3)));
    var tous = [];
    if (sens) {
      bulle(j, 'Question ' + (S.i + 1) + ' sur ' + S.l.length, 'Que dit ce panneau ?');
      j.appendChild(el('div', 'cjQ', dessin(p)));
      var z = el('div', 'jvChoix');
      choix.forEach(function (x, i) {
        var b = el('button', '', '<b>' + 'ABC'.charAt(i) + '</b>' + esc(x.m));
        b.type = 'button';
        tous.push({ b: b, k: x.k });
        b.addEventListener('click', function () { repondre(b, x.k, tous); });
        z.appendChild(b);
      });
      j.appendChild(z);
    } else {
      bulle(j, 'Question ' + (S.i + 1) + ' sur ' + S.l.length, 'Quel panneau dit : « ' + esc(p.m) + ' » ?');
      var g = el('div', 'cj4');
      choix.forEach(function (x) {
        var b = el('button', '', dessin(x));
        b.type = 'button';
        b.setAttribute('aria-label', x.n);
        tous.push({ b: b, k: x.k });
        b.addEventListener('click', function () { repondre(b, x.k, tous); });
        g.appendChild(b);
      });
      j.appendChild(g);
    }
    j.setAttribute('data-cj-bonne', p.k);
    j.setAttribute('data-cj-sens', sens ? 'sens' : 'panneau');
    tous.forEach(function (x) { x.b.setAttribute('data-cj-k', x.k); });
  }
  /* 🪤 un piège : vrai ou faux, puis le piège expliqué */
  function questionPiege(j, c) {
    if (!c) { S.i++; question(); return; }
    j.appendChild(el('div', 'cjVF', '<small>Vrai ou faux ?</small>' + esc(c.t)));
    var z = el('div', 'cjDeux'), fait = false, bts = [];
    [[0, '❌ Faux'], [1, '✅ Vrai']].forEach(function (x) {
      var b = el('button', '', x[1]);
      b.type = 'button';
      b.setAttribute('data-cj-k', x[0] ? 'vrai' : 'faux');
      bts.push(b);
      b.addEventListener('click', function () {
        if (fait) return;
        fait = true;
        var ok = (c.v ? 1 : 0) === x[0];
        bts.forEach(function (y, i) { y.disabled = true; if (i === (c.v ? 1 : 0)) y.className = 'bon'; });
        if (!ok) b.className = 'faux';
        apresReponse(j, idDe('pieges', c.k), ok, ok
          ? '<small>✅ ' + (c.v ? 'Vrai' : 'Faux') + ', bien vu · +10 XP</small>' + esc(c.e)
          : '<b>🪤 Piège : c’était ' + (c.v ? 'vrai' : 'faux') + '</b>' + esc(c.e) + ' Cette carte revient demain.');
      });
      z.appendChild(b);
    });
    j.appendChild(z);
    j.setAttribute('data-cj-bonne', c.v ? 'vrai' : 'faux');
  }
  /* 🔍 la loupe : toucher les mots qui changent tout (entre accolades dans « q ») */
  function motsDe(q) {
    /* colle : écrit sans espace après le morceau d'avant (« {stationner}. »,
       « l’{arrêt} ») · ponct : de la ponctuation seule, qui ne se touche pas */
    var out = [], s = String(q || ''), re = /\{([^{}]+)\}|[^\s{}]+/g, m, fin = 0;
    while ((m = re.exec(s))) {
      var colle = out.length > 0 && m.index === fin;
      if (m[1] !== undefined) out.push({ t: m[1].replace(/\s+/g, ' ').trim(), cle: true, colle: colle });
      else out.push({ t: m[0], cle: false, colle: colle, ponct: !/[0-9A-Za-zÀ-ÿ]/.test(m[0]) });
      fin = re.lastIndex;
    }
    return out;
  }
  function questionLoupe(j, c) {
    if (!c) { S.i++; question(); return; }
    var mots = motsDe(c.q), total = mots.filter(function (m) { return m.cle; }).length;
    var trouves = 0, erreurs = 0, fini = false;
    var b = bulle(j, 'Avant de répondre', 'Touche ' + (total > 1 ? 'les ' + total + ' mots qui changent' : 'le mot qui change') + ' tout.<span class="cjCompte" style="display:block;font-size:13px;font-weight:600;color:var(--muted)"></span>');
    var compte = b.querySelector('.cjCompte');
    if (total > 1) compte.textContent = '0 trouvé sur ' + total;
    var z = el('div', 'cjEnonce');
    var finir = function (ok) {
      if (fini) return;
      fini = true;
      [].forEach.call(z.querySelectorAll('button'), function (m) { m.disabled = true; if (m.getAttribute('data-cle') === '1') m.className = 'm cle'; });
      apresReponse(j, idDe('loupe', c.k), ok, ok
        ? '<small>✅ Bien lu · +10 XP</small>' + esc(c.e)
        : '<b>🔍 Les mots à repérer sont en vert</b>' + esc(c.e) + ' Cette carte revient demain.');
    };
    mots.forEach(function (m, i) {
      if (i && !m.colle) z.appendChild(document.createTextNode(' '));
      if (m.ponct) { z.appendChild(el('span', 'p', esc(m.t))); return; }
      var x = el('button', 'm', esc(m.t));
      x.type = 'button';
      x.setAttribute('data-cle', m.cle ? '1' : '0');
      x.addEventListener('click', function () {
        if (fini || x.className !== 'm') return;
        if (m.cle) {
          x.className = 'm cle';
          trouves++;
          vibrer(10);
          compte.textContent = trouves + ' trouvé' + (trouves > 1 ? 's' : '') + ' sur ' + total;
          if (trouves >= total) finir(true);
        } else {
          x.className = 'm non';
          erreurs++;
          vibrer(40);
          if (erreurs >= 2) finir(false);
        }
      });
      z.appendChild(x);
    });
    j.appendChild(z);
    j.appendChild(el('div', 'cjNote', 'Deux mots touchés à côté, et la carte est ratée.'));
    j.setAttribute('data-cj-bonne', 'loupe');
  }
  /* 🔢 le bon chiffre : trois choix, puis l'astuce pour le retenir */
  function questionChiffre(j, c) {
    if (!c) { S.i++; question(); return; }
    bulle(j, 'Le bon chiffre', esc(c.q));
    var z = el('div', 'cjTrois'), fait = false, bts = [];
    c.c.forEach(function (t, i) {
      var b = el('button', '', esc(t));
      b.type = 'button';
      b.setAttribute('data-cj-k', String(i));
      bts.push(b);
      b.addEventListener('click', function () {
        if (fait) return;
        fait = true;
        var ok = i === Number(c.b);
        bts.forEach(function (y, n) { y.disabled = true; if (n === Number(c.b)) y.className = 'bon'; });
        if (!ok) b.className = 'faux';
        apresReponse(j, idDe('chiffres', c.k), ok, ok
          ? '<small>✅ Oui · +10 XP · l’astuce à retenir</small>' + esc(c.e)
          : '<b>❌ C’était ' + esc(c.c[Number(c.b)]) + '</b>' + esc(c.e) + ' Cette carte revient demain.');
      });
      z.appendChild(b);
    });
    j.appendChild(z);
    j.setAttribute('data-cj-bonne', String(c.b));
  }
  function finSeance() {
    D.seances++;
    jouerAujourdhui();
    sauver();
    var j = ecran('');
    haut(j, S.titre, S.l.length, S.l.length);
    var tout = S.bons === S.l.length;
    j.appendChild(el('div', 'card cjBilan', '<div class="g">' + (tout ? '🏆' : (S.bons >= S.l.length / 2 ? '💪' : '🌱')) + '</div><h3>' + S.bons + ' sur ' + S.l.length + '</h3>' +
      '<p>' + (tout ? 'Sans faute !' : (S.rates.length + ' carte' + (S.rates.length > 1 ? 's reviennent' : ' revient') + ' demain.')) + '</p>' +
      '<div class="cjStats"><div><b>+' + (D.xp - S.xp0) + '</b>XP</div><div><b>🔥 ' + D.serie + '</b>jour' + (D.serie > 1 ? 's' : '') + ' de suite</div><div><b>' + (nbConnus() + nbSus('pieges') + nbSus('loupe') + nbSus('chiffres')) + '/' + (LISTE.length + CARTES.pieges.length + CARTES.loupe.length + CARTES.chiffres.length) + '</b>cartes sues</div></div>'));
    if (S.rates.length) {
      var c = el('div', 'card', '<div class="section-title" style="margin-bottom:8px">À revoir</div>');
      var g = el('div', 'cjAbc');
      var autres = el('ul', 'cjConseils');
      S.rates.forEach(function (x) {
        if (x.t !== 'p') {
          var k = PARC[x.t][x.k];
          if (k) autres.appendChild(el('li', '', TYPES[x.t].ic + ' ' + esc(x.t === 'pieges' ? k.t : String(k.q).replace(/[{}]/g, ''))));
          return;
        }
        var p = PAR[x.k];
        if (!p) return;
        var b = el('button', '', dessin(p) + esc(p.n));
        b.type = 'button';
        b.addEventListener('click', function () { fiche(x.k, 'À revoir', 0, 0, finSeanceRetour, 'Retour'); });
        g.appendChild(b);
      });
      if (g.firstChild) c.appendChild(g);
      if (autres.firstChild) c.appendChild(autres);
      j.appendChild(c);
    }
    bouton(j, 'Terminer', accueil);
  }
  function finSeanceRetour() { var b = S.bons, x = S.xp0; D.seances--; finSeance(); S.bons = b; S.xp0 = x; }

  /* ============================================================
     ④ LE MEMORY : le panneau et ce qu'il veut dire
     ============================================================ */
  function choisirMemory() {
    var j = ecran('');
    haut(j, '🃏 Memory des panneaux');
    bulle(j, 'Choisis une série', 'Une paire, c’est un panneau et <u>ce qu’il veut dire</u>.');
    var z = el('div', 'cjSeries');
    FAMILLES.forEach(function (f) {
      var t = LISTE.filter(function (p) { return p.f === f[0]; });
      if (t.length < 3) return;
      var rec = D.mem[f[0]];
      var b = el('button', 'jvMode', '<span class="e">' + f[1] + '</span><span><b>' + esc(f[2]) + '</b><small>' + esc(f[3]) + (rec ? ' · record : ' + rec + ' coups' : '') + '</small></span>');
      b.type = 'button';
      b.addEventListener('click', function () { memory(f[0]); });
      z.appendChild(b);
    });
    var rm = D.mem.melange;
    var m = el('button', 'jvMode vedette', '<span class="e">🎲</span><span><b>Le grand mélange</b><small>6 panneaux au hasard' + (rm ? ' · record : ' + rm + ' coups' : '') + '</small></span>');
    m.type = 'button';
    m.addEventListener('click', function () { memory('melange'); });
    z.appendChild(m);
    j.appendChild(z);
  }
  var M = null;
  function memory(serie) {
    var source = serie === 'melange' ? LISTE : LISTE.filter(function (p) { return p.f === serie; });
    /* les moins connus d'abord, et jamais deux panneaux qui disent la même chose */
    var pris = [], vus = {};
    melanger(source).sort(function (a, b) { return carte(a.k)[0] - carte(b.k)[0]; }).forEach(function (p) {
      if (pris.length >= 6 || vus[p.m]) return;
      vus[p.m] = true;
      pris.push(p);
    });
    var cartes = [];
    pris.forEach(function (p) { cartes.push({ k: p.k, t: 'p' }); cartes.push({ k: p.k, t: 'm' }); });
    M = { serie: serie, nom: serie === 'melange' ? 'Le grand mélange' : famille(serie)[2], c: melanger(cartes), ouv: [], faites: {}, coups: 0, n: pris.length, attente: false };
    dessinerMemory();
  }
  function dessinerMemory() {
    var j = ecran('');
    var faites = Object.keys(M.faites).length;
    haut(j, '🃏 Memory · ' + M.nom, faites, M.n, choisirMemory);
    bulle(j, 'Trouve les paires', 'Un panneau va avec <u>ce qu’il veut dire</u>. <span style="font-weight:600;color:var(--muted)">' + M.coups + ' coup' + (M.coups > 1 ? 's' : '') + '</span>');
    var g = el('div', 'cjMem');
    M.c.forEach(function (c, i) {
      var p = PAR[c.k];
      var fait = !!M.faites[c.k], ouverte = M.ouv.indexOf(i) !== -1;
      var b = el('button', fait ? 'ok' : (ouverte ? 'vue' : 'dos'), (fait || ouverte) ? (c.t === 'p' ? dessin(p) : esc(p.m)) : 'EC');
      b.type = 'button';
      b.setAttribute('data-cj-carte', c.k + ':' + c.t);
      b.setAttribute('aria-label', (fait || ouverte) ? (c.t === 'p' ? p.n : p.m) : 'Carte retournée');
      if (!fait && !ouverte) b.addEventListener('click', function () { retourner(i); });
      g.appendChild(b);
    });
    j.appendChild(g);
  }
  function retourner(i) {
    if (M.attente || M.ouv.indexOf(i) !== -1 || M.ouv.length >= 2) return;
    M.ouv.push(i);
    vibrer(8);
    if (M.ouv.length < 2) { dessinerMemory(); return; }
    M.coups++;
    var a = M.c[M.ouv[0]], b = M.c[M.ouv[1]];
    dessinerMemory();
    M.attente = true;
    if (a.k === b.k && a.t !== b.t) {
      setTimeout(function () {
        M.attente = false;
        M.faites[a.k] = true;
        M.ouv = [];
        var faites = Object.keys(M.faites).length;
        fiche(a.k, '🃏 Paire trouvée !', faites, M.n, function () { if (faites >= M.n) finMemory(); else dessinerMemory(); });
      }, 650);
    } else {
      setTimeout(function () { M.attente = false; M.ouv = []; if (zone().querySelector('.cjMem')) dessinerMemory(); }, 1100);
    }
  }
  function finMemory() {
    var avant = D.mem[M.serie];
    var record = !avant || M.coups < avant;
    if (record) D.mem[M.serie] = M.coups;
    D.xp += 20;
    jouerAujourdhui();
    sauver();
    var j = ecran('');
    haut(j, '🃏 Memory · ' + M.nom, M.n, M.n, choisirMemory);
    j.appendChild(el('div', 'card cjBilan', '<div class="g">' + (record ? '🏆' : '🎉') + '</div><h3>' + M.n + ' paires en ' + M.coups + ' coups</h3>' +
      '<p>' + (record ? (avant ? 'Nouveau record ! (avant : ' + avant + ' coups)' : 'Ton premier score pour cette série.') : 'Ton record : ' + avant + ' coups.') + ' +20 XP</p>'));
    var s = M.serie;
    bouton(j, 'Rejouer cette série', function () { memory(s); });
    bouton(j, 'Une autre série', choisirMemory, true);
    bouton(j, 'Retour à l’accueil', accueil, true);
  }

  /* ============================================================
     ⑤ L'ABÉCÉDAIRE
     ============================================================ */
  var abcOrdre = 'forme', abcCherche = '';
  function abecedaire(vers) {
    var j = ecran('');
    haut(j, '🔤 L’abécédaire des panneaux');
    var r = el('input', 'cjRech');
    r.type = 'search';
    r.id = 'cjRech';
    r.placeholder = '🔍 Chercher : stop, stationner, priorité…';
    r.value = abcCherche;
    r.setAttribute('aria-label', 'Chercher un panneau');
    j.appendChild(r);
    var seg = el('div', 'cjSeg');
    [['forme', 'Par forme'], ['az', 'De A à Z']].forEach(function (x) {
      var b = el('button', abcOrdre === x[0] ? 'on' : '', x[1]);
      b.type = 'button';
      b.addEventListener('click', function () { abcOrdre = x[0]; abecedaire(); });
      seg.appendChild(b);
    });
    j.appendChild(seg);
    var corps = el('div', '');
    j.appendChild(corps);
    var tuile = function (p) {
      var b = el('button', connu(p.k) ? 'su' : '', dessin(p) + esc(p.n));
      b.type = 'button';
      b.setAttribute('data-cj-p', p.k);
      b.addEventListener('click', function () { fiche(p.k, '🔤 L’abécédaire', 0, 0, function () { abecedaire(); }, D.vus[p.k] ? 'Retour' : ''); });
      return b;
    };
    var dessiner = function () {
      corps.innerHTML = '';
      var q = sansAccent(abcCherche).trim();
      var l = LISTE.filter(function (p) { return !q || sansAccent(p.n + ' ' + p.m + ' ' + famille(p.f)[2]).indexOf(q) !== -1; });
      if (!l.length) { corps.appendChild(el('div', 'cjNote', 'Aucun panneau ne correspond à « ' + esc(abcCherche) + ' ».')); return; }
      if (abcOrdre === 'az' || q) {
        var g = el('div', 'cjAbc');
        l.slice().sort(function (a, b) { return a.n.localeCompare(b.n, 'fr'); }).forEach(function (p) { g.appendChild(tuile(p)); });
        corps.appendChild(el('div', 'cjSous', l.length + ' panneau' + (l.length > 1 ? 'x' : '')));
        corps.appendChild(g);
        return;
      }
      corps.appendChild(el('div', 'card', '<div class="section-title" style="margin-bottom:2px">La forme parle avant le dessin</div><div class="cjLogique">' +
        '<div><svg viewBox="0 0 100 100"><polygon points="50,8 94,88 6,88" fill="#fff" stroke="' + R + '" stroke-width="11" stroke-linejoin="round"/></svg>Triangle : danger</div>' +
        '<div><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#fff" stroke="' + R + '" stroke-width="12"/></svg>Rond rouge : interdit</div>' +
        '<div><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="' + B + '"/></svg>Rond bleu : obligé</div>' +
        '<div><svg viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="10" fill="' + B + '"/></svg>Carré bleu : indication</div></div>'));
      FAMILLES.forEach(function (f) {
        var t = l.filter(function (p) { return p.f === f[0]; });
        if (!t.length) return;
        var n = t.filter(function (p) { return connu(p.k); }).length;
        var s = el('div', 'cjSous', f[1] + ' ' + esc(f[2]) + ' · ' + n + ' sur ' + t.length + ' connu' + (n > 1 ? 's' : ''));
        s.setAttribute('data-cj-fam', f[0]);
        corps.appendChild(s);
        var g = el('div', 'cjAbc');
        t.forEach(function (p) { g.appendChild(tuile(p)); });
        corps.appendChild(g);
      });
    };
    r.addEventListener('input', function () { abcCherche = r.value; dessiner(); });
    dessiner();
    if (vers) { var c = corps.querySelector('[data-cj-fam="' + vers + '"]'); if (c) try { c.scrollIntoView({ block: 'start' }); } catch (e) {} }
  }

  /* ============================================================
     LE BRANCHEMENT
     ============================================================ */
  window.CodeEC = {
    PANNEAUX: PANNEAUX,
    FAMILLES: FAMILLES,
    fusionner: fusionner,
    dessin: dessin,
    /* 🪤 v1463 — les cartes de base et leur fusion, pour l'atelier */
    TYPES: TYPES,
    fusionnerCartes: fusionnerCartes,
    conseilsDe: conseilsDe,
    /* la page ouvre l'onglet : { zone, appeler(quoi, données) → promesse } */
    ouvrir: function (o) {
      O = o;
      poserLeStyle();
      if (charge && D) { accueil(); return; }
      ecran('<div class="card"><div class="jvDoux">⏳ Chargement du jeu…</div></div>');
      o.appeler('lire', {}).then(function (r) {
        if (!r || r.ouvert === false) { ecran('<div class="card"><div class="jvDoux">' + esc((r && r.message) || 'Le jeu du code n’est pas ouvert sur ton espace.') + '</div></div>'); return; }
        poserContenu(r.contenu, r.images);
        D = propre(r.donnees);
        charge = true;
        accueil();
      }).catch(function (e) {
        var j = ecran('<div class="card"><div class="jvDoux">⚠️ ' + esc((e && e.message) || 'Le jeu ne répond pas.') + '</div></div>');
        bouton(j, 'Réessayer', function () { window.CodeEC.ouvrir(o); }, true);
      });
    },
    oublier: function () { charge = false; D = null; clearTimeout(minuteur); },
    _etat: function () { return { D: D, liste: LISTE, S: S, M: M, cartes: CARTES, conseils: LES_CONSEILS }; }
  };
})();
