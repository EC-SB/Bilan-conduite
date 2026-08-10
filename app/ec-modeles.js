/* Déployé le 08/08/2026 à 13:58 — v321 */
/* ============================================================
   ec-modeles.js
   Modèles de bilan, blocs fixes, CEPC et définition des 14 modèles
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   MODÈLES DE BILAN — Évolution Conduites
   Les textes fixes sont recopiés au caractère près.
   L'IA ne remplit que les emplacements variables.
   ============================================================ */

/* ---------- Utilitaires ---------- */
function st(v){                       // statut ✅ / ❌ / choix laissé au moniteur
  if(v === '✅' || v === true) return '✅';
  if(v === '❌' || v === false) return '❌';
  return '✅❌';
}
function st3(v){                      // statut ✅ / ❌ / 🟠
  if(v === '✅') return '✅';
  if(v === '❌') return '❌';
  if(v === '🟠' || v === 'orange') return '🟠';
  return '✅❌🟠';
}
function st3o(v){                     // idem, variante 🍊 (évaluations)
  if(v === '✅') return '✅';
  if(v === '❌') return '❌';
  if(v === '🍊' || v === '🟠' || v === 'orange') return '🍊';
  return '✅ ❌ 🍊';
}
function txt(v){ return (v && String(v).trim()) ? String(v).trim() : ''; }
function lignesErreurs(arr, mini){
  const out = [];
  (arr || []).forEach(e => { const t = txt(e); if(t) out.push('❌ ' + t); });
  const n = mini || 4;
  while(out.length < n) out.push('❌ ');
  return out.join('\n');
}

/* ---------- Blocs communs ---------- */
const BLOC = {
  entete: '👋𝔹𝕀𝕃𝔸ℕ 𝔻𝔼 𝕋𝔸 ℂ𝕆ℕ𝔻𝕌𝕀𝕋𝔼 👀\nRappel : dsl pour les fautes, écriture orale automatique 😅',

  carteSD: v => '𝘾𝙖𝙧𝙩𝙚 𝙎𝘿  ' + st(v) + '\nN\'oublie pas de la regarder et si soucis demande nous !! (rappel, tous tes cours sont filmés, par une caméra avant et une arrière, avec le son et les conseils des moniteurs, pour revoir tout ton cours de conduite, avant de revenir à ton prochain cours). ',

  installPassVoyants: (i, p, v) =>
    '𝙄𝙣𝙨𝙩𝙖𝙡𝙡𝙖𝙩𝙞𝙤𝙣  ' + st(i) + 'https://www.facebook.com/groups/963972327360861/permalink/969918630099564/\n' +
    '𝙋𝙖𝙨𝙨𝙖𝙜𝙚𝙧 ' + st(p) + '\n' +
    '𝙑𝙤𝙮𝙖𝙣𝙩𝙨 ' + st(v) + '\n' +
    '/2 points jour du permis ',

  verifications: '𝙑𝙚́𝙧𝙞𝙛𝙞𝙘𝙖𝙩𝙞𝙤𝙣𝙨 https://www.facebook.com/groups/864826058258637 \n/3 points jour du permis ',

  ficheListe: [
    'MALD', '1/2 tour', 'MAR (angle de rue)', 'Arrêt de précision',
    'CD', 'CG', 'BD', 'BG',
    'BAD bataille avant droit', 'BAG bataille avant gauche', 'Epi',
    'Utilisation Radio', 'Utilisation téléphone', 'Faire peur',
    'Parking avec ticket', 'GPS', 'Régulateur',
    'va où tu veux fais ce que tu veux', 'Ouverture du capot'
  ],

  /* Libellés développés — modèle Conduite */
  ficheListeConduite: [
    'MALD Marche arrière en ligne droite',
    '1/2 tour',
    'MAR (marche arrière en angle de rue)',
    'Arrêt de précision',
    'CD Créneau droit',
    'CG Créneau gauche',
    'BD Bataille droit',
    'BG Bataille Gauche',
    'BAD bataille avant droit',
    'BAG bataille avant gauche',
    'Epi',
    'Utilisation Radio',
    'Utilisation téléphone',
    'Faire peur',
    'Parking avec ticket',
    'GPS',
    'Régulateur',
    'va où tu veux fais ce que tu veux',
    'Ouverture du capot'
  ],

  ficheListeAacAuto: [
    'MALD', '1/2 tour en bouche', 'MAR (angle de rue)', 'Arrêt de précision',
    'CD', 'CG', 'BD', 'BG',
    'BAD bataille avant droit', 'BAG bataille avant gauche', 'Epi',
    'Utilisation Radio', 'Utilisation téléphone', 'Faire peur',
    'Parking avec ticket', 'GPS', 'Régulateur',
    'va où tu veux fais ce que tu veux', 'Ouverture du capot'
  ]
};

/* Les 9 rubriques d'erreurs, en texte libre */
const RUBRIQUES = [
  ['manipulation', '🚙 𝙈𝘼𝙉𝙄𝙋𝙐𝙇𝘼𝙏𝙄𝙊𝙉 𝘿𝙀𝙎 𝘾𝙊𝙈𝙈𝘼𝙉𝘿𝙀𝙎 : '],
  ['trajectoire',  '👀 𝙏𝙍𝘼𝙅𝙀𝘾𝙏𝙊𝙄𝙍𝙀 :  '],
  ['giratoires',   '🍩 𝙂𝙄𝙍𝘼𝙏𝙊𝙄𝙍𝙀𝙎  : '],
  ['vavd',         '🛣️ 𝙑𝘼 𝙑𝘿 : '],
  ['pad',          '❌ 𝙋𝘼𝘿 : '],
  ['allures',      '🏎️💨 𝘼𝙇𝙇𝙐𝙍𝙀𝙎  : '],
  ['controles',    '👀 𝘾𝙊𝙉𝙏𝙍𝙊𝙇𝙀𝙎 : '],
  ['divers',       '🧠 𝘿𝙄𝙑𝙀𝙍𝙎 :'],
  ['manoeuvres',   '🚙🚗🚙 𝙈𝘼𝙉𝙊𝙀𝙐𝙑𝙍𝙀𝙎 :']
];

function blocRubriques(r){
  r = r || {};
  const lignes = ['🧠 🚘👀🅴🆁🆁🅴🆄🆁🆂  🅲🅴  🅹🅾🆄🆁 : ', ''];
  RUBRIQUES.forEach(([cle, titre]) => {
    const c = txt(r[cle]);
    lignes.push(titre + (c ? '\n' + c : ''));
    lignes.push('');
    lignes.push('');
  });
  return lignes.join('\n').replace(/\n{4,}$/, '\n\n');
}

function blocFiche(items, liste){
  const map = {};
  (items || []).forEach(it => {
    if(it && it.nom) map[String(it.nom).toLowerCase().trim()] = txt(it.retour);
  });
  const lignes = ['🦉𝔽𝕀ℂℍ𝔼 𝕍𝔼ℍ𝕀ℂ𝕌𝕃𝔼 : '];
  (liste || BLOC.ficheListe).forEach(nom => {
    const k = nom.toLowerCase().trim();
    let retour = map[k];
    if(!retour){                      // tolérance sur les abréviations
      for(const mk in map){
        if(k.indexOf(mk) === 0 || mk.indexOf(k) === 0){ retour = map[mk]; break; }
      }
    }
    lignes.push(retour ? nom + ' — ' + retour : nom);
  });
  return lignes.join('\n');
}

/* Rappels de fin — versions standard et AAC */
const RAPPEL_GROUPES_1 =
'➡️ 4 Groupes de travail : tu es bien dessus et tu les bosses ?✅❌\n' +
'➡️ Réserves-tu plus d\'écoutes pédagogiques que de conduite ? ✅❌ https://www.facebook.com/groups/174715876519873/permalink/1143782686279849/\n' +
'💡Tu n\'as pas possibilité de partir en Conduite supervisée ??\n' +
' https://www.facebook.com/groups/963972327360861/permalink/1122235844867841/\n' +
'➡️  Rappel de ta FRISE DE FORMATION EN VOITURE : \n' +
'❓ leçons de 2 heures + exam blanc + ❓ leçons de 2 heures (❓h) + 3h avant examen ';

function rappelAac(frise){
  return '➡️ 4 Groupes de travail : tu es bien dessus et tu les bosses ?✅❌\n' +
  '➡️ Réserves-tu plus d\'écoutes pédagogiques que de conduite ? ✅❌\n' +
  'https://www.facebook.com/groups/174715876519873/permalink/1143782686279849/ \n' +
  '➡️  Rappel du reste de ta FRISE DE FORMATION DÉPART AAC : \n' +
  frise + '  \n' +
  '➡️ Rappel : formation accompagnateur c\'est sans toi / rendez-vous préalable toi en leçon et ton ou tes accompagnateurs sont derrière.  \n' +
  '➡️  Retrouve tout sur la conduite accompagnée dans le groupe Évolution Conduites  Guide 7 AAC Conduite accompagnée et CS Conduite supervisée 👨‍👦👩‍👦\n' +
  'https://www.facebook.com/groups/174715876519873/learning_content/?filter=944490172398475&ref=edit_unit';
}

const TAIL_RDV_PREALABLE =
'🚙Tout ce qui a été dit pour la 𝙘𝙤𝙣𝙙𝙪𝙞𝙩𝙚 𝙖𝙘𝙘𝙤𝙢𝙥𝙖𝙜𝙣𝙚́𝙚 𝙚𝙩 𝙡𝙖 𝙘𝙤𝙣𝙙𝙪𝙞𝙩𝙚 𝙨𝙪𝙥𝙚𝙧𝙫𝙞𝙨𝙚́𝙚 \n' +
'https://www.facebook.com/groups/174715876519873/permalink/390459678278824/\n' +
'🚙 𝙀𝙣𝙩𝙧𝙖𝙞̂𝙣𝙚𝙢𝙚𝙣𝙩 𝙢𝙖𝙧𝙘𝙝𝙚 𝙖𝙧𝙧𝙞𝙚̀𝙧𝙚\n' +
' https://www.facebook.com/groups/174715876519873/permalink/657680161556773/\n' +
'🚙 𝘼𝙥𝙥𝙡𝙞𝙘𝙖𝙩𝙞𝙤𝙣 𝙨𝙪𝙞𝙫𝙞 𝙠𝙞𝙡𝙤𝙢𝙚́𝙩𝙧𝙞𝙦𝙪𝙚 𝘿𝙧𝙞𝙫𝙪𝙥    \n' +
'https://www.facebook.com/groups/174715876519873/permalink/1674047996586646/\n' +
'🚙  𝙂𝙪𝙞𝙙𝙚 𝙙𝙚 𝙡\'𝙖𝙘𝙘𝙤𝙢𝙥𝙖𝙜𝙣𝙖𝙩𝙚𝙪𝙧\n' +
' https://www.facebook.com/groups/174715876519873/permalink/390459938278798/  \n' +
'🚙 Les 𝙧𝙚𝙣𝙙𝙚𝙯-𝙫𝙤𝙪𝙨 𝙥𝙚́𝙙𝙖𝙜𝙤𝙜𝙞𝙦𝙪𝙚𝙨 seulement pour la conduite accompagnée https://www.facebook.com/groups/174715876519873/permalink/502944593696998/\n' +
'💡 Tu peux continuer pendant ta conduite accompagnée ou ta conduite supervisée à réserver des 𝙚́𝙘𝙤𝙪𝙩𝙚s 𝙥𝙚́𝙙𝙖𝙜𝙤𝙜𝙞𝙦𝙪𝙚s 💡.';

/* ============================================================
   BLOCS FIXES — SIMULATEUR
   ============================================================ */
const SIMU_TXT = {
  installLink: 'https://www.facebook.com/groups/963972327360861/permalink/969918630099564/ ',

  demarrerManuelle:
'𝘿𝙀𝙈𝘼𝙍𝙍𝙀𝙍 🚙👣 Démarrer sur le plat et en pente : \n' +
'Lâche le frein, Embraye jusqu\'au point d\'attaque, tiens ton embrayage tant que tu n\'es pas à 10km/h,  accélère en même temps à 1500 tours/min minimum pour ne pas caler au démarrage. Ensuite, soit tu veux aller vite et tu accélères plus, soit tu veux rester à 10 km/h et tu ne touches à rien, ta voiture roule toute seule.\n' +
'🚙👣Démarrage en côte :\n' +
'https://www.facebook.com/groups/963972327360861/permalink/970408180050609/ \n' +
'🚙👣 Démarrage rapide :\n' +
'https://www.facebook.com/groups/963972327360861/permalink/970401240051303/  \n' +
' 🚙👣 Démarrage avec frein à main électrique https://www.facebook.com/groups/963972327360861/permalink/970408626717231/ \n' +
'𝙎\'𝘼𝙍𝙍𝙀𝙏𝙀𝙍 \n' +
'🚙👣 C\'est l\'inverse du démarrage , on freine pour s\'arrêter mais on oublie pas de débrayer pour ne pas caler : \n' +
' - si tu es en 1ère il faut débrayer en dessous de 10 km/h (donc si tu es au dessus de 10 km/h tu freines avant de débrayer, si tu es presque à 10 km/h, tu débrayes avant de freiner).\n' +
' - si tu es en 2nde il faut débrayer en dessous de 15 km/h  (donc si tu es au dessus de 15 km/h tu freines avant de débrayer, si tu es presque à 15 km/h, tu débrayes avant de freiner). \n' +
'𝟮𝙉𝘿𝙀 𝙀𝙏 𝙋𝙍𝙀𝙈𝙄𝙀𝙍𝙀 𝙍𝙊𝙐𝙇𝘼𝙉𝙏𝙀 👀Stop 🛑, feu rouge 🚦, quand on est obligé de s\'arrêter = on s\'arrête en 2nde (sauf si on est déjà en 1ère) et on oublie pas de repasser en 1ère avant de partir ! 😁\n' +
'👀🧠Si on n\'est pas obligé de s\'arrêter (cédez le passage, pas de marquage au sol),  on se pose la question 2nde ou 1ère ? 🤔🤔\n' +
'⚠️1ère roulante : \n' +
'➡️ si peu de visibilité\n' +
'➡️ si la rue est serrée \n' +
'➡️ si un véhicule, un piéton nous gêne \n' +
'➡️ 🅿️  parking \n' +
'https://www.facebook.com/share/v/16TrupekTZ/\n\n' +
'😁 On fait tout pour éviter de s\'arrêter, on essaie de passer derrière ! 🏎️💨\n' +
'👀🧠Ne pas dépasser la ligne du cédez le passage au sens giratoire ou ailleurs ️⚠️ Si obligé de s\'arrêter, on s\'arrête un peu avant le cédez le passage, pour se laisser une marge de sécurité ⚠️⚠️ https://www.facebook.com/groups/963972327360861/permalink/1489118334846255/ https://m.facebook.com/groups/963972327360861/permalink/1505640129860742/\n' +
'👀🛑 Repère : le haut de la ligne de stop doit arriver sous le rétro qui arrive en PREMIER sur la ligne de stop 😎🚗💨 Si vous ne voyez pas la ligne de stop : limite de la chaussée sous le rétro qui arrive en premier sur la ligne de stop 😁. \n' +
'https://m.facebook.com/groups/963972327360861/permalink/970399350051492/ ',

  rapportsVitesses:
'✋Position de la main sur le levier de vitesse  https://www.facebook.com/groups/963972327360861/permalink/970394686718625/ +  6e https://www.facebook.com/groups/963972327360861/permalink/970398426718251/ + Marche arrière https://www.facebook.com/groups/963972327360861/permalink/970391620052265/\n' +
'🙌👣 Synchroniser ses pieds et ses mains \n' +
'https://www.facebook.com/share/v/1CFKDFBJy6/ \n' +
'👣Pied trop haut sur l\'embrayage https://www.facebook.com/groups/963972327360861/permalink/970400283384732/\n' +
'🚙⁉️En quelle vitesse on est ? https://www.facebook.com/groups/963972327360861/permalink/970395426718551/',

  volantManuelle:
'𝙑𝙊𝙇𝘼𝙉𝙏 👐 Mains à 10h10 🧠 plus tes mains sont hautes, plus tu as de l\'amplitude pour tourner ton volant\n' +
'🏇 On tourne sans bouger les mains du volant (sinon on va te les scratcher sur le volant !)\n' +
'🏇 On chevauche si besoin : par au dessus. (Qd tu montes à cheval on monte par dessous le cheval ou par dessus ? )\n' +
'🏇 On laisse glisser plus ou moins  (en général au milieu du virage dans la ligne droite). Rappel : plus on va vite, plus il glisse vite pour se remettre droit 😁\n' +
'🧠 Cours théorie https://www.facebook.com/groups/963972327360861/permalink/1489146314843457/\n\n' +
'𝙏𝙍𝘼𝙅𝙀𝘾𝙏𝙊𝙄𝙍𝙀 ➡️ Repère scotch ou araignée bas du pare-brise voir  https://m.facebook.com/groups/963972327360861/permalink/1340937842997639/\n' +
'➡️ Exercice maison : https://m.facebook.com/groups/963972327360861/permalink/1488562401568515/\n' +
'➡️ Écart de trajectoire  : \n' +
'🧠👀🚨tout écart de trajectoire en dehors de ta voie que cela soit à gauche comme à droite c\'est un écart =\n' +
'on contrôle rétros intérieur et extérieur et angle mort si gros écart\n' +
'On change jamais de voie sans contrôles et clignotants ! Liens groupes : https://m.facebook.com/groups/963972327360861/permalink/1034515243639902/ ',

  vavdManuelle:
'➡️Voie d\'accélération VA : \n' +
'🌟J\'arrive à 60/70 Km/h en 3e sur la VA\n' +
'🌟Je reste sur ma voie (je colle le bord droit)\n' +
'🌟Clignotant soit de suite si voie d\'entrecroisement, soit seulement si on peut y aller sur voie d\'accélération normale\n' +
'🌟Prise de décision rapide (rétro intérieur, moitié supérieur ok, moitié inférieur pas ok sauf si bouges pas )\n' +
'🌟Oui = j\'accélère fort (sauf si bouchon devant) SUR MA VOIE D\'ACCELERATION (elle porte bien son nom !) angle mort, changement de voie (sans coup de volant)\n' +
'⚠️Non = appels de feux stops, freine et rétrograde si besoin\n' +
'🌟4e et 5e seulement sur la 4 voies (à la bonne allure)\n' +
'🌟Ne pas hésiter à mettre le régulateur ensuite \n' +
'➡️Voie de décélération VD :\n' +
'🌟On ne ralentit pas sur la 4 voies (sauf si on vous fait ralentir avant)\n' +
'🌟On dose son frein tout le long et entre temps on passe ses vitesses (à la bonne allure). Attention au dosage du frein, attention si VD à 70 ne pas freiner en dessous...\n' +
'❤️On apprend la procédure par coeur et en plus de la vidéo https://www.facebook.com/groups/147379309864142/permalink/327693331832738/ \n' +
'❤️on met en pratique ici :  \n' +
'https://www.facebook.com/groups/147379309864142/permalink/287866629148742/\n' +
'Et ici : \n' +
'https://m.facebook.com/groups/963972327360861/permalink/970474220044005/\n' +
'❤️ on regarde le guide 14 du groupe Mise en pratique théorie de la conduite lien direct au guide sur pc : https://www.facebook.com/groups/963972327360861/learning_content/?filter=864853607256126 ',

  allureLenteManuelle:
'C\'est la même chose que la vidéo du dém en côte lent, sauf que comme pas de côte, pas besoin du frein, le pied droit peut directement accélérer à 1500 tours / minutes.\n' +
'https://www.facebook.com/groups/963972327360861/permalink/970408180050609/ \n' +
'Et, en même temps, il faut tourner à fond son volant !',

  giratoiresManuelle:
'🥇1. On adapte allure🏎️🏁 https://www.facebook.com/groups/147379309864142/learning_content?filter=1016402715526819&post=726420907962300\n' +
'🥈2. On cherche sa direction ⁉️ (si besoin, giratoire à gauche : où je sors ? où je me rabats ?)\n' +
'🥉3. On se place correctement 😁\n' +
'Rappel : ⬆️🧠TOUT DROIT (en face, tend ton bras, regarde où il va) : \n' +
'PAS de clignotant de suite, clignotant juste avant de sortir\n' +
'On reste sur sa voie de droite (on suit le trottoir, sauf s\'il y a une seule voie = on coupe)\n' +
'Angle mort à l\'entrée et en sortie si voie réservée (bus/ bande cyclable) \n' +
'➡️🧠 1ère à droite : \n' +
'🚨Clignotant de suite\n' +
'On reste sur sa voie de droite (on suit le trottoir, sauf s\'il y a une seule voie = on coupe)\n' +
'Angle mort à l\'entrée et en sortie si voie réservée (bus/ bande cyclable) \n' +
'⬅️🧠 À gauche (= dernière à gauche) / Avant dernière à gauche (avant la dernière à gauche) / 3e à gauche (3e sortie du carrefour à sens giratoire, cette sortie est sur la gauche) :\n' +
'🚨Clignotant de suite à gauche \n' +
'🧠Si deux voies, on change le plus tôt possible de voie, pas trop tôt non plus hein 👻 (contrôles , clignotants, angle mort). Si on ne peut pas changer de voie OU si on arrive à l\'entrée du carrefour = tant pis, on reste sur sa voie de droite !!!!\n' +
'👀Angle mort à l\'entrée et en sortie si voie réservée (bus/ bande cyclable)\n' +
'🧠👀Où je sors, où je me rabats ?  Exemple : je sors à la 3e, je me rabats à la 2ne avec contrôle et clignotant\n' +
'➡️🧠On apprend par coeur la procédure et on regarde le guide 10 du groupe Mise en pratique théorie de la conduite. https://www.facebook.com/groups/963972327360861/learning_content/?filter=3256398961105430',

  padManuelle:
'1👀- on CHERCHE la route, l’intersection\n' +
'2👀- on REGARDE si marquage au sol ou panneau. ⚠️Si pas de panneau = marquage au sol pas valable 👨‍⚖️. \n' +
'3 🧠🚙- on agit :\n' +
'➡️Contrôle intérieur extérieur clignotant SI ON TOURNE \n' +
'➡️🚨 Appel de feux stops si besoin\n' +
'➡️ Adapter allure\n' +
'Adapter vitesse (2nde et 1ère si besoin) https://www.facebook.com/100026792825541/videos/663719737864448/\n' +
'➡️ Régime de priorité ? (voir vraie règle de la PAD https://www.facebook.com/evolution.conduites.1/videos/602798227289933 )\n' +
'➡️Angle mort (du côté où on est tourne)\n' +
'➡️Placement (sans couper son carrefour)\n' +
'On apprend par coeur la procédure et on s\'entraîne à la réciter à pied, à vélo, en bus, en passager voiture etc...\n' +
'💭Comment la détecter ? Vraie règle de la PAD ? 👀\n' +
'https://www.facebook.com/groups/147379309864142/learning_content/?filter=1016402715526819&post=391767538630659 ',

  /* ----- Variantes boîte automatique ----- */
  demarrerAuto:
'https://www.facebook.com/share/v/19Df7qy4rv/\nhttps://www.facebook.com/share/v/19MZYLySxo/',

  vavdAuto:
'𝙑𝙤𝙞𝙚 𝙙\'𝙖𝙘𝙘𝙚́𝙡𝙚́𝙧𝙖𝙩𝙞𝙤𝙣 𝙑𝘼 : \n' +
'🌟J\'arrive à 60/70 Km/h sur la VA\n' +
'🌟Je reste sur ma voie (je colle le bord droit)\n' +
'🌟Clignotant soit de suite si voie d\'entrecroisement, soit seulement si on peut y aller sur voie d\'accélération normale\n' +
'🌟Prise de décision rapide (rétro intérieur, moitié supérieur ok, moitié inférieur pas ok sauf si bouges pas )\n' +
'🌟Oui = j\'accélère fort (sauf si bouchon devant) SUR MA VOIE D\'ACCELERATION (elle porte bien son nom !) angle mort (sans te déporter) , changement de voie (sans coup de volant)\n' +
'⚠️Non = appels de feux stops, freine si besoin\n' +
'🌟Ne pas hésiter à mettre le régulateur ensuite quand on est à la bonne allure sur la 4 voies\n' +
'𝙑𝙤𝙞𝙚 𝙙𝙚 𝙙𝙚́𝙘𝙚́𝙡𝙚́𝙧𝙖𝙩𝙞𝙤𝙣 𝙑𝘿 :\n' +
'🌟On ne ralentit pas sur la 4 voies (sauf si on vous fait ralentir avant)\n' +
'🌟On dose son frein tout le long. Attention au dosage du frein, attention si VD à 70 ne pas freiner en dessous...\n' +
'❤️On apprend la procédure par coeur et en plus de la vidéo https://www.facebook.com/groups/147379309864142/permalink/327693331832738/ \n' +
'❤️on met en pratique ici :  \n' +
'https://www.facebook.com/groups/147379309864142/permalink/287866629148742/\n' +
'Et ici : \n' +
'https://m.facebook.com/groups/963972327360861/permalink/970474220044005/\n' +
'❤️ on regarde le guide 14 du groupe Mise en pratique théorie de la conduite lien direct au guide sur pc : https://www.facebook.com/groups/963972327360861/learning_content/?filter=864853607256126 ',

  giratoiresAuto:
'1. On adapte allure🏎️🏁 https://www.facebook.com/groups/147379309864142/learning_content?filter=1016402715526819&post=726420907962300\n' +
'2. On cherche sa direction ⁉️ (si besoin, giratoire à gauche : où je sors où je me rabats ?)\n' +
'3. On se place correctement 😁\n' +
'Rappel : ⬆️🧠TOUT DROIT (en face, tend ton bras regarde où il va ) : \n' +
'PAS de clignotant de suite, clignotant juste avant de sortir\n' +
'On reste sur sa voie de droite (on suit le trottoir, sauf s\'il y a une seule voie = on coupe)\n' +
'Angle mort à l\'entrée et en sortie si voie réservée (bus/ bande cyclable) \n' +
'➡️🧠1ère à droite : \n' +
'🚨Clignotant de suite\n' +
'On reste sur sa voie de droite (on suit le trottoir, sauf s\'il y a une seule voie = on coupe)\n' +
'Angle mort à l\'entrée et en sortie si voie réservée (bus/ bande cyclable) \n' +
'⬅️🧠À gauche (= dernière à gauche) / Avant dernière à gauche (avant la dernière à gauche) / 3e à gauche (3e sortie du carrefour à sens giratoire, cette sortie est sur la gauche) :\n' +
'🚨Clignotant de suite à gauche \n' +
'🧠Si deux voies, on change le plus tôt possible de voie, pas trop tôt non plus hein 👻 (contrôles , clignotants, angle mort). Si on ne peut pas changer de voie OU si on arrive à l\'entrée du carrefour = tant pis, on reste sur sa voie de droite !!!!\n' +
'👀Angle mort à l\'entrée et en sortie si voie réservée (bus/ bande cyclable)\n' +
'🧠👀Où je sors, où je me rabats ?  Exemple : je sors à la 3e, je me rabats à la 2ne avec contrôle et clignotant\n\n' +
'➡️🧠On apprend par coeur la procédure et on regarde le guide 10 du groupe Mise en pratique théorie de la conduite https://www.facebook.com/groups/963972327360861/learning_content/?filter=3256398961105430',

  padAuto:
'1👀- on CHERCHE la route 💭Comment la détecter ?  https://www.facebook.com/groups/963972327360861/permalink/970461930045234/\n' +
'2👀- on REGARDE si marquage au sol ou panneau. ⚠️Si pas de panneau = marquage au sol pas valable 👨‍⚖️. \n' +
'3 🧠🚙- on agit : \n' +
'➡️ Contrôle rétro intérieur \n' +
'➡️🚨 Appel de feux stops si besoin\n' +
'➡️ Adapter allure Max 15km/h si peu de visibilité. \n' +
'➡️ On s\'arrête si qq\'un dans la PAD ou on essaye de passer derrière lui sans s\'arrêter (ne pas hésiter à lui faire signe de passer avec des appels de feux de route ou avec la main. Attention de ne pas lui faire signe s\'il doit lui même s\'arrêter pour qq un d\'autre😅) \n' +
'➡️ Contrôle derrière (personne ne m double) \n' +
'➡️ J\'accélère pour dégager à l\'allure autorisée\n' +
' Si on tourne voir \n' +
'➡️ Régime de priorité ? (voir vraie règle de la PAD  https://www.facebook.com/evolution.conduites.1/videos/602798227289933 )\n\n' +
'On apprend par coeur la procédure en entier visible en cliquant sur le lien ici https://www.facebook.com/groups/147379309864142/permalink/287728199162585/  et on s\'entraîne à la réciter à pied, à vélo, en bus, en passager voiture etc... ',

  /* ----- Pied de page simulateur ----- */
  planning:
'📝 𝙍𝙀𝙎𝙀𝙍𝙑𝙀 𝘿𝙀𝙎 𝙈𝘼𝙄𝙉𝙏𝙀𝙉𝘼𝙉𝙏 𝙏𝙊𝙉 𝙋𝙇𝘼𝙉𝙉𝙄𝙉𝙂 :\n' +
'➡️ Des 𝙚𝙘𝙤𝙪𝙩𝙚𝙨 𝙥𝙚𝙙𝙖𝙜𝙤𝙜𝙞𝙦𝙪𝙚𝙨 : je rappelle que si c\'est illimité, c\'est pas pour faire joli, c\'est pour en faire plus que la conduite et tout au long de ta formation \n' +
'➡️ Des heures accès en salle des 𝙩𝙖𝙗𝙡𝙚𝙩𝙩𝙚𝙨 "𝙖𝙫𝙖𝙣𝙩 𝙙𝙚 𝙢𝙤𝙣𝙩𝙚𝙧 𝙚𝙣 𝙫𝙤𝙞𝙩𝙪𝙧𝙚"\n' +
'➡️ Les 𝙝𝙚𝙪𝙧𝙚𝙨 𝙙𝙚 𝙘𝙤𝙣𝙙𝙪𝙞𝙩𝙚 🏎️ 𝘼𝙪𝙙𝙞 par 2h\n\n' +
'🗨️⚠️𝙀𝙣𝙫𝙤𝙞𝙚 𝙣𝙤𝙪𝙨 𝙪𝙣 𝙢𝙚𝙨𝙨𝙖𝙜𝙚 𝙥𝙤𝙪𝙧 𝙣𝙤𝙪𝙨 𝙥𝙧𝙚𝙫𝙚𝙣𝙞𝙧 𝙦𝙪𝙚 𝙩𝙪 𝙖𝙨 𝙧𝙚𝙨𝙚𝙧𝙫𝙚 𝙩𝙖 𝙥𝙧𝙚𝙢𝙞𝙚𝙧𝙚 𝙡𝙚𝙘𝙤𝙣 𝙚𝙣 𝙘𝙤𝙣𝙙𝙪𝙞𝙩𝙚 𝙖𝙛𝙞𝙣 𝙦𝙪𝙚 𝙣𝙤𝙪𝙨 𝙚𝙣𝙡𝙚𝙫𝙞𝙤𝙣𝙨 𝙡𝙚𝙨 𝙚𝙘𝙤𝙪𝙩𝙚𝙨 𝙥𝙚𝙙𝙖𝙜𝙤𝙜𝙞𝙦𝙪𝙚𝙨 ⚠️',

  groupesManuelle:
'𝘼𝙨-𝙩𝙪 𝙗𝙞𝙚𝙣 𝙖𝙘𝙘𝙚𝙨 𝙖 𝙘𝙚𝙨 𝙜𝙧𝙤𝙪𝙥𝙚𝙨 𝙁𝙖𝙘𝙚𝙗𝙤𝙤𝙠𝙨 : \n' +
'𝟭. "𝗚𝗥𝗢𝗨𝗣𝗘 𝗘𝘃𝗼𝗹𝘂𝘁𝗶𝗼𝗻 𝗖𝗼𝗻𝗱𝘂𝗶𝘁𝗲𝘀"  \n' +
'https://www.facebook.com/groups/174715876519873/learning_content/?filter=402522386935051 \n' +
'𝟮. "𝗖𝗢𝗨𝗥𝗦 𝗧𝗛𝗘́𝗢𝗥𝗜𝗘 𝗗𝗘 𝗟𝗔 𝗖𝗢𝗡𝗗𝗨𝗜𝗧𝗘 𝗘́𝘃𝗼𝗹𝘂𝘁𝗶𝗼𝗻 𝗖𝗼𝗻𝗱𝘂𝗶𝘁𝗲𝘀" \n' +
' https://www.facebook.com/groups/147379309864142/learning_content/?filter=1016402715526819\n' +
'𝟯. "𝗠𝗜𝗦𝗘 𝗘𝗡 𝗣𝗥𝗔𝗧𝗜𝗤𝗨𝗘 𝗧𝗛𝗘́𝗢𝗥𝗜𝗘 𝗗𝗘 𝗟𝗔 𝗖𝗢𝗡𝗗𝗨𝗜𝗧𝗘 𝗘́𝘃𝗼𝗹𝘂𝘁𝗶𝗼𝗻 𝗖𝗼𝗻𝗱𝘂𝗶𝘁𝗲𝘀"\n' +
' https://www.facebook.com/groups/963972327360861/learning_content\n' +
'𝟰. "𝗩𝗘́𝗥𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡𝗦 𝗘́𝗫𝗔𝗠𝗘𝗡 𝗘́𝘃𝗼𝗹𝘂𝘁𝗶𝗼𝗻 𝗖𝗼𝗻𝗱𝘂𝗶𝘁𝗲𝘀" \n' +
'https://www.facebook.com/groups/864826058258637?locale=fr_FR ',

  groupesAuto:
'𝘼𝙨-𝙩𝙪 𝙗𝙞𝙚𝙣 𝙖𝙘𝙘𝙚𝙨 𝙖 𝙘𝙚𝙨 𝙜𝙧𝙤𝙪𝙥𝙚𝙨 𝙁𝙖𝙘𝙚𝙗𝙤𝙤𝙠𝙨 : \n' +
'➡️ Groupe Évolution Conduites  https://www.facebook.com/groups/174715876519873/learning_content/?filter=402522386935051 \n' +
'➡️ Théorie de la conduite https://www.facebook.com/groups/147379309864142/learning_content/?filter=1016402715526819\n' +
'https://www.facebook.com/groups/147379309864142/learning_content\n' +
'➡️ Module 6/8 complémentaire https://www.facebook.com/groups/963972327360861/learning_content',

  cloture:
'🤓 Si tu as un doute ou que les liens ne fonctionnent pas, demande au bureau de t\'aider à y accéder ! \n' +
'➡️ Tes procédures sont à apprendre par cœur !   \n' +
'➡️ As-tu envoyé tes procédures / vidéos d\'entraînements sur Messenger Évolution Conduites ? \n' +
'📢 Rappelles toi, plus tu vas travailler tes groupes, t\'entraîner avant chaque leçon, plus cela sera facile et rapide ! 🏎️\n' +
'🗨️ Sur Messenger il y a toujours du monde ! Si tu as la moindre question, ou envie de vérifier que tu sais bien tes procédures, ne reste pas seul dans ton coin, demande nous !'
};

/* Compétences simulateur — boîte manuelle (10) */
const SIMU_COMP_MANUELLE = [
  { cle:'installation', titre:'➡️ 𝙋𝙍𝙊𝘾𝙀𝘿𝙐𝙍𝙀 𝙄𝙉𝙎𝙏𝘼𝙇𝙇𝘼𝙏𝙄𝙊𝙉', texte: SIMU_TXT.installLink, nb:4 },
  { cle:'moteur', titre:'➡️ 𝙇𝘼𝙉𝘾𝙀𝙍, 𝘼𝙍𝙍𝙀𝙏𝙀𝙍 𝙇𝙀 𝙈𝙊𝙏𝙀𝙐𝙍, 𝙋𝙍𝙀𝙏 𝘼 𝙋𝘼𝙍𝙏𝙄𝙍', texte:'', nb:4,
    preErreurs:['🌈 N\'oublies pas mon arc de cercle pour démarrer sans rien oublier'] },
  { cle:'roulante', titre:'➡️ 𝟮𝙉𝘿𝙀 𝙀𝙏 𝙋𝙍𝙀𝙈𝙄𝙀𝙍𝙀 𝙍𝙊𝙐𝙇𝘼𝙉𝙏𝙀', texte: SIMU_TXT.demarrerManuelle, nb:4 },
  { cle:'vitesses', titre:'➡️ 𝙈𝘼𝙄𝙏𝙍𝙄𝙎𝙀𝙍 𝙇𝙀𝙎 𝙍𝘼𝙋𝙋𝙊𝙍𝙏𝙎 𝘿𝙀 𝙑𝙄𝙏𝙀𝙎𝙎𝙀𝙎', texte: SIMU_TXT.rapportsVitesses, nb:4 },
  { cle:'accelerer', titre:'➡️ 𝘼𝘾𝘾𝙀𝙇𝙀𝙍𝙀𝙍, 𝙁𝙍𝙀𝙄𝙉𝙀𝙍, 𝙎\'𝘼𝙍𝙍𝙀𝙏𝙀𝙍', texte:'https://www.facebook.com/share/v/19cLgA4nLY/', nb:4,
    preErreurs:['Dissocie bien tes deux pieds :\n- le frein jusqu\'à 20 pas en dessous (fort au début, puis on relâche dès qu\'on est à 20 km/h en gardant le pied devant)\n-  le pied gauche embraye, tiens, pivote. \n- ensuite on débraye avant de freiner car on est proche du 15km/h en 2nde !'] },
  { cle:'volant', titre:'➡️ 𝙈𝘼𝙉𝙄𝙋𝙐𝙇𝘼𝙏𝙄𝙊𝙉 𝘿𝙐 𝙑𝙊𝙇𝘼𝙉𝙏 𝙀𝙏 𝙏𝙍𝘼𝙅𝙀𝘾𝙏𝙊𝙄𝙍𝙀', texte: SIMU_TXT.volantManuelle, nb:4,
    preErreurs:['📱 Envoie moi la vidéo de ton entraînement sur la manipulation du volant par Messenger 🚙 Exemple entraînement à domicile sans volant 🚘\nhttps://www.facebook.com/groups/963972327360861/permalink/970393543385406/'] },
  { cle:'vavd', titre:'➡️ 𝙋𝙍𝙊𝘾𝙀𝘿𝙐𝙍𝙀 𝙑𝘼/𝙑𝘿', texte: SIMU_TXT.vavdManuelle, nb:4 },
  { cle:'allureLente', titre:'➡️ 𝙈𝘼𝙉𝙊𝙀𝙐𝙑𝙍𝙀𝙍 𝘼 𝘼𝙇𝙇𝙐𝙍𝙀 𝙇𝙀𝙉𝙏𝙀 (𝙅𝙀𝙐𝙓 𝘿𝙀 𝙋𝙀𝘿𝘼𝙇𝙀𝙎)', texte: SIMU_TXT.allureLenteManuelle, nb:4,
    preErreurs:['Dissocie bien tes deux pieds : pied gauche point d\'équilibre, point d\'attaque, pied droit, accélérateur 1500 tours/min minimum pour ne pas caler'] },
  { cle:'giratoires', titre:'➡️ 𝙋𝙍𝙊𝘾𝙀𝘿𝙐𝙍𝙀𝙎 𝙂𝙄𝙍𝘼𝙏𝙊𝙄𝙍𝙀𝙎 ', texte: SIMU_TXT.giratoiresManuelle, nb:4 },
  { cle:'pad', titre:'➡️ 𝙋𝙍𝙊𝘾𝙀𝘿𝙐𝙍𝙀 𝙋𝘼𝘿', texte: SIMU_TXT.padManuelle, nb:4, texteAvantErreurs:true }
];

/* Compétences simulateur — boîte automatique (8) */
const SIMU_COMP_AUTO = [
  { cle:'installation', titre:'➡️ 𝙋𝙍𝙊𝘾𝙀𝘿𝙐𝙍𝙀 𝙄𝙉𝙎𝙏𝘼𝙇𝙇𝘼𝙏𝙄𝙊𝙉', texte: SIMU_TXT.installLink, nb:4 },
  { cle:'demarrer', titre:'➡️ 𝘿𝙀𝙈𝘼𝙍𝙍𝙀𝙍, 𝙎\'𝘼𝙍𝙍𝙀𝙏𝙀𝙍', texte: SIMU_TXT.demarrerAuto, nb:4,
    postErreurs:' 🌈 N\'oublie pas mon arc de cercle pour démarrer sans rien oublier' },
  { cle:'accelerer', titre:'➡️ 𝘼𝘾𝘾𝙀𝙇𝙀𝙍𝙀𝙍, 𝙁𝙍𝙀𝙄𝙉𝙀𝙍, 𝙎\'𝘼𝙍𝙍𝙀𝙏𝙀𝙍', texte:'', nb:4 },
  { cle:'vavd', titre:'➡️ 𝙋𝙍𝙊𝘾𝙀𝘿𝙐𝙍𝙀 𝙑𝘼/𝙑𝘿', texte: SIMU_TXT.vavdAuto, nb:4 },
  { cle:'volant', titre:'➡️ 𝙈𝘼𝙉𝙄𝙋𝙐𝙇𝘼𝙏𝙄𝙊𝙉 𝘿𝙐 𝙑𝙊𝙇𝘼𝙉𝙏', texte: SIMU_TXT.volantManuelle, nb:5,
    preErreurs:['Envoie moi la vidéo de ton entraînement sur la manipulation du volant par Messenger 🚙 Exemple entraînement à domicile sans volant 🚘\nhttps://www.facebook.com/groups/963972327360861/permalink/970393543385406/'] },
  { cle:'allureLente', titre:'➡️ 𝙈𝘼𝙉𝙊𝙀𝙐𝙑𝙍𝙀𝙍 𝘼 𝘼𝙇𝙇𝙐𝙍𝙀 𝙇𝙀𝙉𝙏𝙀 (𝙅𝙀𝙐𝙓 𝘿𝙀 𝙋𝙀𝘿𝘼𝙇𝙀𝙎)', texte:'', nb:2 },
  { cle:'giratoires', titre:'➡️ 𝙋𝙍𝙊𝘾𝙀𝘿𝙐𝙍𝙀𝙎 𝙂𝙄𝙍𝘼𝙏𝙊𝙄𝙍𝙀𝙎 ', texte: SIMU_TXT.giratoiresAuto, nb:4 },
  { cle:'pad', titre:'➡️ 𝙋𝙍𝙊𝘾𝙀𝘿𝙐𝙍𝙀 𝙋𝘼𝘿', texte: SIMU_TXT.padAuto, nb:4 }
];

function buildSimu(ai, comps, groupes){
  const c = (ai && ai.competences) || {};
  const parts = ['👋𝔹𝕀𝕃𝔸ℕ 𝔻𝔼 𝕋𝔸 ℂ𝕆ℕ𝔻𝕌𝕀𝕋𝔼  𝙨𝙪𝙧 𝙨𝙞𝙢𝙪𝙡𝙖𝙩𝙚𝙪𝙧 𝙖𝙫𝙚𝙘 𝙢𝙤𝙣𝙞𝙩𝙚𝙪𝙧 👀', ''];

  comps.forEach(comp => {
    const d = c[comp.cle] || {};
    parts.push(comp.titre + ' ' + st3(d.statut));
    if(comp.texte) parts.push(comp.texte);
    const err = (comp.preErreurs || []).concat((d.erreurs || []).map(txt).filter(Boolean));
    parts.push('Erreur(s) à corriger : ');
    parts.push(lignesErreurs(err, comp.nb));
    if(comp.postErreurs) parts.push(comp.postErreurs);
    parts.push('');
  });

  const prochain = ((ai && ai.prochainCours) || []).map(txt).filter(Boolean);
  parts.push('🫱 𝙋𝙤𝙪𝙧 𝙣𝙤𝙩𝙧𝙚 𝙥𝙧𝙤𝙘𝙝𝙖𝙞𝙣 𝙘𝙤𝙪𝙧𝙨 𝙨𝙪𝙧 𝙨𝙞𝙢𝙪𝙡𝙖𝙩𝙚𝙪𝙧 𝙤𝙪 𝙚𝙣 𝙫𝙤𝙞𝙩𝙪𝙧𝙚 :');
  parts.push('➡️ Nous ferons :  ');
  const pc = prochain.length ? prochain : ['', '', ''];
  while(pc.length < 3) pc.push('');
  pc.forEach(p => parts.push('- ' + p));
  parts.push('');
  parts.push(SIMU_TXT.planning);
  parts.push('');
  parts.push(groupes);
  parts.push('');
  parts.push(SIMU_TXT.cloture);
  return parts.join('\n');
}

/* ============================================================
   BLOC FIXE — ÉVALUATION (texte contractuel : ne jamais reformuler)
   ============================================================ */
const EVAL_HEURES =
'𝙀𝙎𝙏𝙄𝙈𝘼𝙏𝙄𝙊𝙉 𝘿𝙐 𝙉𝙊𝙈𝘽𝙍𝙀 𝘿\'𝙃𝙀𝙐𝙍𝙀𝙎 :\n' +
'🕙 𝗖𝗢𝗨𝗥𝗦 𝗗𝗘 𝗧𝗛𝗘́𝗢𝗥𝗜𝗘 𝗗𝗘 𝗟𝗔 𝗖𝗢𝗡𝗗𝗨𝗜𝗧𝗘 : 3 heures\n' +
'🕙 𝗔𝗖𝗖𝗘̀𝗦 𝗔̀ 𝗡𝗢𝗦 𝗥𝗘𝗦𝗦𝗢𝗨𝗥𝗖𝗘𝗦 𝗦𝗨𝗥 𝗙𝗔𝗖𝗘𝗕𝗢𝗢𝗞 : en illimité\n' +
'🕙 𝗘́𝗖𝗢𝗨𝗧𝗘𝗦 𝗣𝗘́𝗗𝗔𝗚𝗢𝗚𝗜𝗤𝗨𝗘𝗦 𝗘𝗡 𝗩𝗢𝗜𝗧𝗨𝗥𝗘 : en illimité\n' +
'🕙 𝗦𝗜𝗠𝗨𝗟𝗔𝗧𝗘𝗨𝗥 𝗔𝗩𝗘𝗖 𝗠𝗢𝗡𝗜𝗧𝗘𝗨𝗥 : ❓ heures modulables selon ton niveau\n' +
'🕙 𝗟𝗘𝗖̧𝗢𝗡𝗦 𝗗𝗘 𝗖𝗢𝗡𝗗𝗨𝗜𝗧𝗘 𝗘𝗡 𝗩𝗢𝗜𝗧𝗨𝗥𝗘 𝗔𝗩𝗔𝗡𝗧 𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖 : ❓ séances de 2 heures modulables selon ton niveau\n' +
'🕙 𝗦𝗜𝗠𝗨𝗟𝗔𝗧𝗘𝗨𝗥 𝗡𝗨𝗜𝗧 (sauf annulation)  : 1 heure 𝗘𝗧 𝗥𝗜𝗦𝗤𝗨𝗘 : 1 heure \n' +
'🕙 𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖  : 1 heure 30\n' +
'🕙 𝗟𝗘𝗖̧𝗢𝗡𝗦 𝗗𝗘 𝗖𝗢𝗡𝗗𝗨𝗜𝗧𝗘 𝗘𝗡 𝗩𝗢𝗜𝗧𝗨𝗥𝗘 𝗔𝗣𝗥𝗘́𝗦 𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖  : ❓ heures modulables selon ton niveau (ré-évaluation lors de ton examen blanc)\n' +
'🕙 𝗛𝗘𝗨𝗥𝗘𝗦 𝗣𝗥𝗘́𝗣𝗔𝗥𝗔𝗧𝗢𝗜𝗥𝗘𝗦 𝗔𝗩𝗔𝗡𝗧 𝗘𝗫𝗔𝗠𝗘𝗡 : 3 heures (2h le jour d\'avant + 1h jour même)\n' +
'🕙 𝗧𝗢𝗧𝗔𝗟 :  ❓';

const EVAL_CONTRAT =
'𝙄𝙉𝘿𝙄𝘾𝘼𝙏𝙄𝙊𝙉𝙎 :\n' +
'🧠 Une évaluation ne donne pas un nombre exact de cours à suivre, mais une indication à un temps T\n' +
'👀 Il faudra revoir tout au long de la formation ton évolution\n' +
'💡 Il existe la conduite supervisée (voir explicatif sur les groupes de travail) qui peut permettre de diminuer le nombre d\'heures\n' +
'💰 Financement personnel / Paiement en plusieurs fois avec notre prestataire ALMA / Financement extérieur (CPF, Pôle Emplois, Région Bretagne...)\n' +
'📝 Tu vas recevoir un contrat numérique par mail à signer basé sur cette évaluation \n' +
'𝙑𝙊𝙄𝘾𝙄 𝘾𝙀 𝙌𝙐𝙀 𝙏𝙐 𝘼𝘾𝘾𝙀𝙋𝙏𝙀𝙎 𝙎𝙄 𝙏𝙐 𝙎𝙄𝙂𝙉𝙀𝙎 𝙇𝙀 𝘾𝙊𝙉𝙏𝙍𝘼𝙏 𝘼𝙑𝙀𝘾 𝙉𝙊𝙐𝙎 :\n' +
'"𝙇\'𝙚́𝙡𝙚̀𝙫𝙚 𝙖𝙘𝙘𝙚𝙥𝙩𝙚 𝙡𝙖 𝙢𝙖𝙣𝙞𝙚̀𝙧𝙚 𝙚𝙩 𝙡𝙚 𝙛𝙤𝙣𝙘𝙩𝙞𝙤𝙣𝙣𝙚𝙢𝙚𝙣𝙩 𝙙𝙚 𝙩𝙧𝙖𝙫𝙖𝙞𝙡𝙡𝙚𝙧 𝙙𝙪 𝙘𝙚𝙣𝙩𝙧𝙚 𝙙𝙚 𝙛𝙤𝙧𝙢𝙖𝙩𝙞𝙤𝙣. 𝙄𝙡 𝙡𝙪𝙞 𝙖 𝙗𝙞𝙚𝙣 𝙚́𝙩𝙚́ 𝙞𝙣𝙙𝙞𝙦𝙪𝙚́ 𝙦𝙪𝙚 𝙨𝙞 𝙘𝙚𝙡𝙖 𝙣𝙚 𝙡𝙪𝙞 𝙘𝙤𝙣𝙫𝙚𝙣𝙖𝙞𝙩 𝙥𝙖𝙨, 𝙞𝙡 𝙚𝙭𝙞𝙨𝙩𝙚 𝙙\'𝙖𝙪𝙩𝙧𝙚𝙨 𝙢𝙚́𝙩𝙝𝙤𝙙𝙤𝙡𝙤𝙜𝙞𝙚𝙨 𝙙𝙖𝙣𝙨 𝙙\'𝙖𝙪𝙩𝙧𝙚𝙨 𝙚́𝙩𝙖𝙗𝙡𝙞𝙨𝙨𝙚𝙢𝙚𝙣𝙩𝙨.\n\n' +
'📚 M\'engage à accepter la manière de travailler du centre de formation Évolution Conduites expliquée dans la vidéo de présentation que vous avez regardé à l\'accueil.\n\n' +
'🤝 Comprend que l\'accès aux écoutes pédagogiques et aux groupes de travail, sont un réel complément aux heures de conduites, qu\'ils seront ouverts et accessibles UNIQUEMENT pendant ma présence en formation, avec un réel investissement de ma part.\n' +
'M\'engage à me donner à fond dans ma formation (travail à domicile, réservations des cours en autonomie, pas d\'absence ni de retard etc...)\n' +
'Comprends qu\'Évolution Conduites me présentera à l\'épreuve pratique du permis de conduire, SEULEMENT si le centre de formation m\'estime apte à obtenir mon examen pratique du permis de conduire, selon le nombre d\'heures données à effectuer d\'après le résultat de mon examen blanc (selon progression).\n\n' +
'📆 Est bien conscient(e) que les dates d\'examens pratiques sont données par la DDTM et qu\'en cas d\'annulation ou de report, le centre de formation n\'est absolument pas responsable.\n\n' +
'❌ Est bien conscient(e) qu\'en cas d\'échec à l\'épreuve pratique, le centre de formation ne peut être tenu responsable des délais de repassage, dans la mesure où les premières présentations sont toujours privilégiées, est bien conscient(e) aussi qu\'il sera nécessaire de continuer la formation (y compris nombre de leçons de conduites estimées lors de l\'examen), afin d\'obtenir le niveau nécessaire pour l\'obtention de l\'examen.\n\n' +
'🌟 Est bien conscient(e) d\'être dans un centre de formation à la conduite et à la sécurité routière et de ce fait, accepter avec notre aide, de devenir un(e) conducteur(trice) sûr(e) et responsable."';

const EVAL_RUBRIQUES = [
  ['manipulation', '𝗠𝗮𝗻𝗶𝗽𝘂𝗹𝗮𝘁𝗶𝗼𝗻 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝗲𝘀 : '],
  ['trajectoire',  '𝗧𝗿𝗮𝗷𝗲𝗰𝘁𝗼𝗶𝗿𝗲 :'],
  ['giratoires',   '𝗚𝗶𝗿𝗮𝘁𝗼𝗶𝗿𝗲𝘀 :  '],
  ['vavd',         '𝗩𝗔/𝗩𝗗 :  '],
  ['manoeuvres',   '𝗠𝗮𝗻𝗼𝗲𝘂𝘃𝗿𝗲𝘀 :   '],
  ['pad',          '𝗣𝗔𝗗 :  '],
  ['allures',      '𝗔𝗹𝗹𝘂𝗿𝗲𝘀 :  '],
  ['controles',    '𝗖𝗼𝗻𝘁𝗿𝗼̂𝗹𝗲𝘀 :  ']
];

function buildEval(ai, avecBea){
  const r = (ai && ai.rubriques) || {};
  const parts = [
    '𝘽𝙄𝙇𝘼𝙉 𝘿𝙀 𝙏𝙊𝙉 𝙀́𝙑𝘼𝙇𝙐𝘼𝙏𝙄𝙊𝙉 ',
    '(Désolé pour les fautes, écriture orale automatique)',
    '',
    '🔍 𝗣𝗮𝘀𝘀𝗶𝗳 :',
    txt(ai && ai.passif),
    '',
    '🚨𝗥𝗲́𝘀𝘂𝗺𝗲́ 𝗱𝗲𝘀 𝗱𝗲́𝗳𝗮𝘂𝘁𝘀 𝘃𝘂 𝗰𝗲 𝗷𝗼𝘂𝗿 𝗮̀ 𝗰𝗼𝗿𝗿𝗶𝗴𝗲𝗿 :',
    '𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗮𝘁𝗶𝗼𝗻 :',
    txt(ai && ai.installation),
    ''
  ];
  EVAL_RUBRIQUES.forEach(([cle, titre]) => {
    const d = r[cle] || {};
    parts.push(titre + st3o(d.statut));
    const c = txt(d.commentaire);
    if(c) parts.push(c);
    parts.push('');
  });
  parts.push(EVAL_HEURES);
  parts.push('');
  if(avecBea){
    parts.push('Si passage en BEA :  ❓leçons sur simulateur avec moniteur ❓  leçons de 2 heures + simu nuit et risques + exam blanc + ❓ leçons de 2 heures (❓h) + 3h avant examen ');
    parts.push('');
  }
  parts.push('Envoyé par Messenger ? ✅❌ ');
  parts.push('Envoyé par Drivup ? ✅❌  ');
  parts.push('');
  parts.push(EVAL_CONTRAT);
  return parts.join('\n');
}

/* ============================================================
   EXAMEN OFFICIEL
   ============================================================ */

/* ============================================================
   CEPC — certificat d'examen du permis de conduire
   Trois barèmes différents selon le bloc, total sur 31.
   ============================================================ */
const CEPC_BLOCS = [
  { titre:'Connaître et maîtriser son véhicule', items:[
    /* Pas d'éliminatoire ici, et l'installation est notée sur 2 */
    { nom:"Savoir s'installer et assurer la sécurité à bord", valeurs:['0','1','2'] },
    { nom:'Effectuer des vérifications du véhicule',          valeurs:['0','1','2','3'] },
    { nom:'Connaître et utiliser les commandes',              valeurs:['E','0','1','2','3'] } ]},
  { titre:'Appréhender la route', items:[
    { nom:"Prendre l'information",                 valeurs:['E','0','1','2','3'] },
    { nom:'Adapter son allure aux circonstances',  valeurs:['E','0','1','2','3'] },
    { nom:'Appliquer la réglementation',           valeurs:['E','0','1','2','3'] } ]},
  { titre:'Partager la route avec les autres usagers', items:[
    { nom:'Communiquer avec les autres usagers',   valeurs:['E','0','1','2','3'] },
    { nom:'Partager la chaussée',                  valeurs:['E','0','1','2','3'] },
    { nom:'Maintenir les espaces de sécurité',     valeurs:['E','0','1','2','3'] } ]},
  { titre:'Autonomie, conscience du risque', items:[
    { nom:'Analyse des situations',    valeurs:['0','0.5','1'] },
    { nom:'Adaptation aux situations', valeurs:['0','0.5','1'] },
    { nom:'Conduite autonome',         valeurs:['0','0.5','1'] } ]},
  { titre:'Conduite respectueuse', items:[
    { nom:"Conduite économique et respectueuse de l'environnement", valeurs:['0','1'] },
    { nom:'Courtoisie',                                             valeurs:['0','1'] } ]}
];

/* Note maximale possible, pour vérification */
function totalMaxCepc(){
  let m = 0;
  CEPC_BLOCS.forEach(b => b.items.forEach(it => {
    m += Math.max.apply(null, it.valeurs.filter(v => v !== 'E').map(Number));
  }));
  return m;
}

/* Total et éliminatoire : un seul E suffit à éliminer */
function calculerCepc(c){
  c = c || {};
  let total = 0;
  let eliminatoires = [];
  CEPC_BLOCS.forEach(b => b.items.forEach(it => {
    const v = c[it.nom];
    if(v === undefined || v === '') return;
    if(v === 'E'){ eliminatoires.push(it.nom); return; }
    const n = parseFloat(String(v).replace(',', '.'));
    if(!isNaN(n)) total += n;
  }));
  const max = totalMaxCepc();
  return { total: total, max: max, eliminatoires: eliminatoires,
           elimine: eliminatoires.length > 0,
           favorable: (total >= 20 && !eliminatoires.length) };
}

function buildExamenBlanc(ai, ctx){
  ai = ai || {};
  const cep = calculerCepc(ai.cepc);
  const av = ai.avant || {};
  const ex = ai.examen || {};
  const P = [];
  const L = s => P.push(s);

  L('👋𝔹𝕀𝕃𝔸ℕ 𝔻𝔼 𝕋𝕆ℕ 𝔼𝕏𝔸𝕄𝔼ℕ 𝔹𝕃𝔸ℕℂ 👀');
  L('');
  L('𝟭-𝗔𝗩𝗔𝗡𝗧 𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖 : ');
  L('');
  L('𝟭-𝟭. 𝗖𝗮𝗿𝘁𝗲 𝗦𝗗 ' + st(av.carteSD));
  L("N'oublie pas de la regarder et si tu as un souci, contacte-nous !");
  L('💡Rappel, tous tes cours sont filmés, par une caméra avant et arrière, avec le son et les conseils des moniteurs, pour revoir tout ton cours de conduite, avant de revenir à ton prochain cours !');
  L('');
  L('𝟭-𝟮. 𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗮𝘁𝗶𝗼𝗻 ' + st(av.installation) + ' ');
  L('https://www.facebook.com/groups/963972327360861/permalink/969918630099564/');
  L('𝗣𝗮𝘀𝘀𝗮𝗴𝗲𝗿 ' + st(av.passager));
  L('𝗩𝗼𝘆𝗮𝗻𝘁𝘀 ' + st(av.voyants));
  L('𝙉𝙤𝙩𝙚 :  /2 ');
  L('');
  L("𝟭-𝟯. 𝙀𝙧𝙧𝙚𝙪𝙧𝙨 𝙦𝙪𝙚 𝙩𝙪 𝙖𝙨 𝙛𝙖𝙞𝙩𝙚𝙨 𝙚𝙣 𝙖𝙡𝙡𝙖𝙣𝙩 𝙖𝙪 𝙘𝙚𝙣𝙩𝙧𝙚 𝙙'𝙚𝙭𝙖𝙢𝙚𝙣 :");
  L('');
  const routeErr = ligneParLigne(av.erreursRoute);
  for(let i = 0; i < Math.max(routeErr.length, 5); i++){
    L('');
    L('👉' + (routeErr[i] ? ' ' + routeErr[i] : ''));
    L('');
  }
  L('');
  L('𝟮-𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖 : ');
  L("💡 𝙍𝙖𝙥𝙥𝙚𝙡 : l'examen blanc consiste à se mettre en conditions réelles d'examen ! L'enseignant N'EST PLUS enseignant MAIS inspecteur du permis de conduire 👮");
  L('');
  L('𝟮-𝟭. 𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗮𝘁𝗶𝗼𝗻 ' + st(ex.installation));
  if(txt(ex.remarqueInstallation)) L('❌ ' + txt(ex.remarqueInstallation));
  L('𝙋𝙖𝙨𝙨𝙖𝙜𝙚𝙧' + st(ex.passager));
  L('𝙑𝙤𝙮𝙖𝙣𝙩𝙨 ' + st(ex.voyants));
  L('𝙉𝙤𝙩𝙚 :  /2 ');
  L('');
  L('𝟮-𝟮. 𝗩𝗲́𝗿𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻𝘀 : 𝗾𝘂𝗲𝘀𝘁𝗶𝗼𝗻 𝗻° ' + txt(ex.verifQuestion));
  L('𝙉𝙤𝙩𝙚 :  /3');
  L('https://www.facebook.com/groups/864826058258637');
  L(' ');
  L('𝟮-𝟯. 𝙍𝙚́𝙛𝙡𝙚𝙭𝙞𝙤𝙣𝙨 𝙞𝙣𝙨𝙥𝙚𝙘𝙩𝙚𝙪𝙧 𝙚𝙩 𝙚𝙭𝙥𝙡𝙞𝙘𝙖𝙩𝙞𝙛 𝙢𝙤𝙣𝙞𝙩𝙚𝙪𝙧(𝙩𝙧𝙞𝙘𝙚) :');
  const refl = ligneParLigne(ex.reflexions);
  for(let i = 0; i < Math.max(refl.length, 22); i++){
    L('👨‍✈️' + (refl[i] ? ' ' + refl[i] : ''));
  }
  L('');

  /* ---- Le CEPC ---- */
  L('🧾𝙍𝙚́𝙨𝙪𝙡𝙩𝙖𝙩 :');
  CEPC_BLOCS.forEach(b => {
    const lignes = b.items
      .filter(it => (ai.cepc || {})[it.nom] !== undefined && (ai.cepc || {})[it.nom] !== '')
      .map(it => '   ' + it.nom + ' : ' + (ai.cepc[it.nom] === 'E' ? '𝗘 ❌' : ai.cepc[it.nom]));
    if(!lignes.length) return;
    L('▸ ' + b.titre);
    lignes.forEach(L);
  });
  L('');
  L('𝗧𝗢𝗧𝗔𝗟 : ' + cep.total + ' / ' + cep.max);
  if(cep.elimine){
    L('❌ 𝗘́𝗟𝗜𝗠𝗜𝗡𝗔𝗧𝗢𝗜𝗥𝗘 — ' + cep.eliminatoires.length + ' compétence(s) en E :');
    cep.eliminatoires.forEach(e => L('   • ' + e));
  }else{
    L(cep.favorable ? '✅ 𝗙𝗔𝗩𝗢𝗥𝗔𝗕𝗟𝗘' : '❌ 𝗜𝗡𝗦𝗨𝗙𝗙𝗜𝗦𝗔𝗡𝗧 — il faut 20 points minimum');
  }
  if(txt(ai.observations)){
    L('');
    L('👉 Observations :');
    ligneParLigne(ai.observations).forEach(o => L('   ' + o));
  }
  L('💡 𝙍𝙖𝙥𝙥𝙚𝙡 : il faut avoir minimum 20/' + cep.max + ' et aucune faute éliminatoire.');
  L('');

  L('𝟯-𝘽𝙄𝙇𝘼𝙉 𝙀𝙍𝙍𝙀𝙐𝙍𝙎 :');
  const bil = ligneParLigne(ai.bilanErreurs);
  for(let i = 0; i < Math.max(bil.length, 5); i++){
    L('👉 ' + (bil[i] || ''));
    L("- qu'en penses-tu ?");
    L('- quelles sont TES solutions ?');
    L('- ce que je te PROPOSE : ');
    L('');
    L('');
  }

  L('𝟰- 𝗡𝗜𝗩𝗘𝗔𝗨 𝗣𝗘𝗥𝗠𝗜𝗦 ? : ');
  L('');
  const niveau = ai.niveau || '';
  if(niveau === 'non'){
    L('𝟰-𝟭👉𝙉𝙊𝙉❌ 𝙋𝘼𝙎 𝙇𝙀 𝙉𝙄𝙑𝙀𝘼𝙐 : 𝙩𝙪 𝙙𝙤𝙞𝙨 𝙘𝙤𝙣𝙩𝙞𝙣𝙪𝙚𝙧 𝙙𝙚 𝙩𝙧𝙖𝙫𝙖𝙞𝙡𝙡𝙚𝙧 !');
    L("Continue de travailler, écoutes pédagogiques, groupes de travail et continue tes leçons de conduites. Revoit avec tes moniteurs si ton niveau s'est amélioré pour permettre de re-prévoir un planning de fin de formation. ");
    L('');
    L('💡𝙍𝙖𝙥𝙥𝙚𝙡𝙨 : ');
    L('- tu peux partir en conduite supervisée pour réduire ton nombre d\'heures et améliorer ton niveau, lien explicatif ici : https://m.facebook.com/groups/963972327360861/permalink/1122235844867841/ ');
    L('- tu peux passer en boite auto si tu es en boite de vitesse et que tu as de gros soucis mécaniques, lien ici : https://m.facebook.com/groups/963972327360861/permalink/1121120328312726/');
  }else if(niveau === 'oui'){
    L('𝟰-𝟭👉 𝙊𝙐𝙄 ✅');
    L('');
    L("❓ 𝘾𝙤𝙢𝙗𝙞𝙚𝙣 𝙙'𝙝𝙚𝙪𝙧𝙚𝙨 𝙖𝙫𝙖𝙣𝙩 𝙥𝙚𝙧𝙢𝙞𝙨 : " + (txt(ai.heuresAvant) || ' ?') +
      ' + 3h avant permis (sous réserve de progression). ');
    L('');
    L('❓Cela correspond à ta frise chronologique de formation selon ton évaluation ?  : ');
    L('- avant examen blanc  : ' + (ai.friseAvant === 'oui' ? '✅OUI' : '❌ NON + ' + (txt(ai.friseAvantH) || ' ') + 'h'));
    L('- post permis : ' + (ai.frisePost === 'oui' ? '✅OUI' : '❌ NON + ' + (txt(ai.frisePostH) || ' ') + 'h'));
    L('');
    if(ai.aDate === 'oui'){
      L('❓𝙏𝙐 𝘼𝙎 𝘿𝙀́𝙅𝘼̀ 𝙏𝘼 𝘿𝘼𝙏𝙀 𝘿𝙐 𝙋𝙀𝙍𝙈𝙄𝙎 𝘿𝙀 𝘾𝙊𝙉𝘿𝙐𝙄𝙍𝙀 👮 :');
      L('- as-tu planifié tes heures avant permis ? : ' + st(ai.heuresPlanifiees));
      L('- si tu ne trouves pas de place sur le planning, contacte nous EN URGENCE. ');
      L("💡𝙍𝙖𝙥𝙥𝙚𝙡 : 𝙨𝙞 𝙩𝙚𝙨 𝙝𝙚𝙪𝙧𝙚𝙨 𝙚𝙩 𝙩𝙤𝙣 𝙥𝙖𝙨𝙨𝙖𝙜𝙚 𝙖̀ 𝙡'𝙚𝙭𝙖𝙢𝙚𝙣 𝙣'𝙤𝙣𝙩 𝙥𝙖𝙨 𝙚́𝙩𝙚́ 𝙖𝙘𝙝𝙚𝙩𝙚́𝙨,  𝘁𝗼𝗻 𝗲𝘅𝗮𝗺𝗲𝗻 𝗱𝘂 𝗽𝗲𝗿𝗺𝗶𝘀 𝗱𝗲 𝗰𝗼𝗻𝗱𝘂𝗶𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗲́𝗰𝗮𝗹𝗲́.");
    }else{
      L('❓𝙏𝙐 𝙉\'𝘼𝙎 𝙋𝘼𝙎 𝙀𝙉𝘾𝙊𝙍𝙀 𝙏𝘼 𝘿𝘼𝙏𝙀 𝘿𝙐 𝙋𝙀𝙍𝙈𝙄𝙎 𝘿𝙀 𝘾𝙊𝙉𝘿𝙐𝙄𝙍𝙀⏳  : ');
      L('- as-tu posé tes heures, en gardant 2 leçons de 2h + 1 leçon de 1h (2+3) pour les planifier au plus proche de ta prochaine date de permis ?  : ' + st(ai.heuresPosees));
      L('- ton passage à l\'examen a bien été acheté ?');
    }
  }
  L('');

  L('𝟱- 𝙍𝙀𝙁𝘼𝙄𝙎 𝗧𝗢𝗡 𝗕𝗜𝗟𝗔𝗡 𝗔𝗣𝗥𝗘̀𝗦 𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖 𝘼𝙑𝙀𝘾 𝘾𝙊𝙍𝙍𝙀𝘾𝙏𝙄𝙊𝙉 𝘿𝙀 𝙇𝘼 𝙍𝙀𝙎𝙋𝙊𝙉𝙎𝘼𝘽𝙇𝙀 𝙋𝙀́𝘿𝘼𝙂𝙊𝙂𝙄𝙌𝙐𝙀 (𝙜𝙧𝙖𝙩𝙪𝙞𝙩 𝙨𝙪𝙧 𝙢𝙚𝙨𝙨𝙚𝙣𝙜𝙚𝙧) :');
  L('Pour être sûr(e) que tu as compris, ton bilan avec ton moniteur (trice). ');
  L("Il faut que tu sois capable de t'auto-évaluer pour éviter de te planter !");
  L('Toutes les consignes sont sur le lien  https://www.facebook.com/share/p/18sc7wKjbg/');
  L("💡 𝙍𝙖𝙥𝙥𝙚𝙡 : 𝙚𝙣 𝙘𝙖𝙨 𝙙'𝙚́𝙘𝙝𝙚𝙘, 𝙩𝙪 𝙖𝙪𝙧𝙖𝙨 𝙈𝙄𝙉𝙄𝙈𝙐𝙈 𝟰𝙝 (𝟮 𝙡𝙚𝙘̧𝙤𝙣𝙨 𝙙𝙚 𝟮𝙝) + 𝟯𝙝 (𝟮𝙝 𝙡𝙖 𝙫𝙚𝙞𝙡𝙡𝙚 𝙙𝙪 𝙥𝙚𝙧𝙢𝙞𝙨 𝙚𝙩 𝟭𝙝 𝙡𝙚 𝙟𝙤𝙪𝙧 𝙢𝙚̂𝙢𝙚) 𝙖̀ 𝙚𝙛𝙛𝙚𝙘𝙩𝙪𝙚𝙧 𝘼𝙑𝘼𝙉𝙏 𝙙𝙚 𝙧𝙚𝙥𝙖𝙨𝙨𝙚𝙧.");
  L('');
  L('𝟲- 𝙅𝙊𝙐𝙍 𝘿𝙐 𝙋𝙀𝙍𝙈𝙄𝙎 🔎');
  L("Tu vas être ajouté(e) dans un groupe Messenger qui t'indiquera le programme de ta journée et toutes les procédures à apprendre pour l'examen : PATIENCE ÇA VA ARRIVER 🙂");
  L('');
  L('𝟳- 𝘾𝙊𝙉𝙏𝙄𝙉𝙐𝙀 𝘿𝙀 𝙏𝙍𝘼𝙑𝘼𝙄𝙇𝙇𝙀𝙍  🧠');
  L('Réserves en plus des écoutes pédagogiques et bosse bien tes groupes ! ');
  L('');
  L('𝟴- 𝙇𝘼 𝙑𝙀𝙄𝙇𝙇𝙀 𝘿𝙀 𝙏𝙊𝙉 𝙀𝙓𝘼𝙈𝙀𝙉 🆔');
  L("N'oublie pas de nous donner ta carte d'identité et en attendant envoie-moi la photo de ta carte d'identité recto verso ici (pour s'assurer qu'elle est bien en ta possession, car pas de carte d'identité, pas de permis !)");

  return P.join('\n');
}

/* Découpe un texte en lignes utiles */
function ligneParLigne(s){
  return String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
}


function buildExamen(ai){
  const a = (ai && ai.avantExamen) || {};
  const e = (ai && ai.examen) || {};
  const obs = (ai && ai.observations) || [];
  const parts = [
    '👋𝔹𝕀𝕃𝔸ℕ 𝔻𝔼 𝕋𝕆ℕ 𝔼𝕏𝔸𝕄𝔼ℕ 𝕆𝔽𝔽𝕀ℂ𝕀𝔼𝕃 👀',
    '',
    '𝟭-𝗔𝗩𝗔𝗡𝗧 𝗘𝗫𝗔𝗠𝗘𝗡  : ',
    '𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗮𝘁𝗶𝗼𝗻 ' + st(a.installation),
    'https://www.facebook.com/groups/963972327360861/permalink/969918630099564/',
    '𝗣𝗮𝘀𝘀𝗮𝗴𝗲𝗿 ' + st(a.passager),
    '𝗩𝗼𝘆𝗮𝗻𝘁𝘀 ' + st(a.voyants),
    '𝙉𝙤𝙩𝙚 :  /2 ',
    '',
    '𝙀𝙧𝙧𝙚𝙪𝙧𝙨 𝙖̀ 𝙣𝙚 𝙥𝙖𝙨 𝙧𝙚𝙛𝙖𝙞𝙧𝙚 :',
    txt(a.erreurs),
    '',
    '',
    '𝟮-𝗘𝗫𝗔𝗠𝗘𝗡  : 45',
    '𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗮𝘁𝗶𝗼𝗻 ' + st(e.installation) + ' (⚠️si tu t\'es mal installé, on ne le verra pas de derrière)',
    '𝙋𝙖𝙨𝙨𝙖𝙜𝙚𝙧 ' + st(e.passager),
    '𝗩𝗼𝘆𝗮𝗻𝘁𝘀 ' + st(e.voyants),
    '𝙉𝙤𝙩𝙚 :  /2 ',
    '',
    '𝗩𝗲́𝗿𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻𝘀 : 𝗾𝘂𝗲𝘀𝘁𝗶𝗼𝗻 𝗻° ' + txt(e.verifQuestion),
    'Vérification ' + (e.vi ? st(e.vi) : '✅️❌️'),
    'QSER ' + (e.qser ? st(e.qser) : '✅️❌️'),
    '1er secour ' + (e.secours ? st(e.secours) : '✅️❌️'),
    '',
    '𝙉𝙤𝙩𝙚 :  /3',
    'https://www.facebook.com/groups/864826058258637',
    ' ',
    ''
  ];
  const n = Math.max(obs.length, 24);
  for(let i = 0; i < n; i++){
    const o = obs[i] || {};
    parts.push('👨‍✈️' + (txt(o.inspecteur) ? ' ' + txt(o.inspecteur) : ''));
    parts.push('🦁' + (txt(o.reponse) ? ' ' + txt(o.reponse) : ''));
    parts.push('');
  }
  parts.push('𝟯-  𝙍𝙀𝙎𝙐𝙇𝙏𝘼𝙏 :');
  parts.push('- respire, c\'est fini, passe à autre chose le temps d\'avoir les résultats');
  parts.push('- on ne demande pas au moniteur (trice) ce qu\'il ou elle en pense et encore moins sur le parking d\'examen ⚠️');
  parts.push('💡 𝙍𝙖𝙥𝙥𝙚𝙡𝙨 :');
  parts.push('- il faut avoir minimum 20/31 et aucune fautes éliminatoires');
  parts.push('- ce n\'est pas la peine de nous contacter pour avoir ton résultat, on te contactera dès qu\'on l\'aura par Messenger.');
  parts.push('- crée ton compte sur 𝙍𝘿𝙑 𝙋𝙀𝙍𝙈𝙄𝙎 pour télécharger la version PDF de ton résultat :  https://www.service-public.fr/particuliers/vosdroits/R39502.');
  return parts.join('\n');
}

/* ============================================================
   AAC — RENDEZ-VOUS PÉDAGOGIQUE (RVP)
   ============================================================ */
function buildRvp(ai){
  const r = (ai && ai.rubriques) || {};
  const refl = ((ai && ai.reflexions) || []).map(txt).filter(Boolean);
  const errs = (ai && ai.bilanErreurs) || [];
  const parts = [
    '𝔹𝕀𝕃𝔸ℕ 𝔻𝔼 𝕋𝕆ℕ ℝ𝔼ℕ𝔻𝔼ℤ-𝕍𝕆𝕌𝕊 ℙ𝔼́𝔻𝔸𝔾𝕆𝔾𝕀ℚ𝕌𝔼 👀',
    'Rappel : dsl pour les fautes, écriture orale automatique 😅',
    '',
    BLOC.carteSD(ai && ai.carteSD),
    '',
    BLOC.installPassVoyants(ai && ai.installation, ai && ai.passager, ai && ai.voyants),
    '',
    blocRubriques(r),
    '🆁🅰🅿🅿🅴🅻 :',
    '➡️ 4 Groupes de travail : tu es bien dessus et tu les bosses ?✅❌',
    '➡️ Réserves-tu plus d\'écoutes pédagogiques que de conduite ? ✅❌',
    'https://www.facebook.com/groups/174715876519873/permalink/1143782686279849/ ',
    '🚙 Les 𝙧𝙚𝙣𝙙𝙚𝙯-𝙫𝙤𝙪𝙨 𝙥𝙚𝙙𝙖𝙜𝙤𝙜𝙞𝙦𝙪𝙚𝙨 https://www.facebook.com/groups/174715876519873/permalink/502944593696998/ ',
    '➡️  Rappel du reste de ta 𝙁𝙍𝙄𝙎𝙀 𝘿𝙀 𝙁𝙊𝙍𝙈𝘼𝙏𝙄𝙊𝙉 𝘼𝘼𝘾 𝙋𝘼𝙎𝙎𝘼𝙂𝙀 𝙀𝙓𝘼𝙈𝙀𝙉 /',
    '2 RDVs pratiques de 2h, 1 RDV théorique de 2h, ❓ leçons, + 3h avant examen',
    '➡️  Retrouve tout sur la conduite accompagnée dans le groupe Évolution Conduites  Guide 7 AAC Conduite accompagnée et CS Conduite supervisée 👨‍👦👩‍👦',
    'https://www.facebook.com/groups/174715876519873/learning_content/?filter=944490172398475&ref=edit_unit',
    '💡 Tu peux continuer pendant ta conduite accompagnée à réserver de l\'𝙚́𝙘𝙤𝙪𝙩𝙚 𝙥𝙚́𝙙𝙖𝙜𝙤𝙜𝙞𝙦𝙪𝙚 💡.',
    '',
    '➡️𝙀𝙓𝘼𝙈𝙀𝙉 𝘽𝙇𝘼𝙉𝘾, es-tu prêt à en faire un ?  ✅❌ ',
    '👉𝙉𝙊𝙉❌ 𝙋𝘼𝙎 𝙇𝙀 𝙉𝙄𝙑𝙀𝘼𝙐 : 𝙩𝙪 𝙙𝙤𝙞𝙨 𝙘𝙤𝙣𝙩𝙞𝙣𝙪𝙚𝙧 𝙙𝙚 𝙩𝙧𝙖𝙫𝙖𝙞𝙡𝙡𝙚𝙧 !',
    'Continue de travailler, écoutes pédagogiques, groupes de travail et continue ta conduite accompagnée pour t\'améliorer en relisant bien ce bilan. ',
    '💡𝙍𝙖𝙥𝙥𝙚𝙡𝙨 : ',
    'Tu peux passer ton permis en boite auto si tu as de gros soucis mécaniques, lien ici : https://m.facebook.com/groups/963972327360861/permalink/1121120328312726/ ',
    '',
    '👉 𝙊𝙐𝙄 ✅  go 🏎️ 💨 : ',
    '',
    '𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗮𝘁𝗶𝗼𝗻  ✅❌',
    '❌ Tu as oublié de dire : "c\'est moi qui aie emmené le véhicule, j\'ai déjà fait mes réglages"',
    '𝙋𝙖𝙨𝙨𝙖𝙜𝙚𝙧✅❌',
    '𝙑𝙤𝙮𝙖𝙣𝙩𝙨 ✅❌',
    '𝙉𝙤𝙩𝙚 :  /2 ',
    '',
    '𝟮-𝟮. 𝗩𝗲́𝗿𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻𝘀 : 𝗾𝘂𝗲𝘀𝘁𝗶𝗼𝗻 𝗻° ',
    '𝙉𝙤𝙩𝙚 :  /3',
    'https://www.facebook.com/groups/864826058258637',
    ' ',
    '𝟮-𝟯. 𝙍𝙚́𝙛𝙡𝙚𝙭𝙞𝙤𝙣𝙨 𝙞𝙣𝙨𝙥𝙚𝙘𝙩𝙚𝙪𝙧 𝙚𝙩 𝙚𝙭𝙥𝙡𝙞𝙘𝙖𝙩𝙞𝙛 𝙢𝙤𝙣𝙞𝙩𝙚𝙪𝙧(𝙩𝙧𝙞𝙘𝙚) :'
  ];
  const nRefl = Math.max(refl.length, 22);
  for(let i = 0; i < nRefl; i++){
    parts.push('👨‍✈️' + (refl[i] ? ' ' + refl[i] : ''));
  }
  parts.push('');
  parts.push('🧾𝙍𝙚́𝙨𝙪𝙡𝙩𝙖𝙩 : voir CEPC (en photo).');
  parts.push('💡 𝙍𝙖𝙥𝙥𝙚𝙡 : il faut avoir minimum 20/31 et aucune fautes éliminatoires.');
  parts.push('');
  parts.push('𝟯-𝘽𝙄𝙇𝘼𝙉 𝙀𝙍𝙍𝙊𝙍𝙎 :'.replace('𝙀𝙍𝙍𝙊𝙍𝙎', '𝙀𝙍𝙍𝙀𝙐𝙍𝙎'));
  const nErr = Math.max(errs.length, 5);
  for(let i = 0; i < nErr; i++){
    const e = errs[i] || {};
    parts.push('👉 ' + txt(e.erreur));
    parts.push('- qu\'en penses-tu ?' + (txt(e.penses) ? ' ' + txt(e.penses) : ''));
    parts.push('- quelles sont TES solutions ?' + (txt(e.solutions) ? ' ' + txt(e.solutions) : ''));
    parts.push('- ce que je te PROPOSE : ' + txt(e.propose));
    parts.push('');
  }
  parts.push('𝟰- 𝗡𝗜𝗩𝗘𝗔𝗨 𝗣𝗘𝗥𝗠𝗜𝗦 ? : ');
  parts.push('');
  parts.push('𝟰-𝟭👉 𝙊𝙐𝙄 ✅');
  parts.push('❓ 𝘾𝙤𝙢𝙗𝙞𝙚𝙣 𝙙\'𝙝𝙚𝙪𝙧𝙚𝙨 𝙖𝙫𝙖𝙣𝙩 𝙥𝙚𝙧𝙢𝙞𝙨 :  ? + 3h avant permis (sous réserve de progression). ');
  parts.push('');
  parts.push('❓Cela correspond à ta 𝙁𝙍𝙄𝙎𝙀 𝘿𝙀 𝙁𝙊𝙍𝙈𝘼𝙏𝙄𝙊𝙉 𝙑𝙊𝙄𝙏𝙐𝙍𝙀 selon ton évaluation APRÈS examen blanc ? : ✅OUI     ❌ NON +   h');
  parts.push('𝙁𝙍𝙄𝙎𝙀 𝘿𝙀 𝙁𝙊𝙍𝙈𝘼𝙏𝙄𝙊𝙉 𝙑𝙊𝙄𝙏𝙐𝙍𝙀   : ❓ leçons de 2 heures + exam blanc + ❓ leçons de 2 heures (❓h) + 3h avant examen ');
  parts.push('');
  parts.push('❓𝙏𝙐 𝘼𝙎 𝘿𝙀́𝙅𝘼̀ 𝙏𝘼 𝘿𝘼𝙏𝙀 𝘿𝙐 𝙋𝙀𝙍𝙈𝙄𝙎 𝘿𝙀 𝘾𝙊𝙉𝘿𝙐𝙄𝙍𝙀 👮 :');
  parts.push('🚗  as-tu planifié tes heures avant permis ? : ');
  parts.push('✅ OUI, ton planning permis est validé selon le résultat de ton examen blanc');
  parts.push('❌ NON, planifie les en URGENCE, si tu ne trouves pas de place sur le planning, contacte nous IMMÉDIATEMENT. ');
  parts.push('💡𝙍𝙖𝙥𝙥𝙚𝙡 : 𝙨𝙞 𝙩𝙚𝙨 𝙝𝙚𝙪𝙧𝙚𝙨 𝙚𝙩 𝙩𝙤𝙣 𝙥𝙖𝙨𝙨𝙖𝙜𝙚 𝙖̀ 𝙡\'𝙚𝙭𝙖𝙢𝙚𝙣 𝙣\'𝙤𝙣𝙩 𝙥𝙖𝙨 𝙚́𝙩𝙚́ 𝙖𝙘𝙝𝙚𝙩𝙚́𝙨,  𝘁𝗼𝗻 𝗲𝘅𝗮𝗺𝗲𝗻 𝗱𝘂 𝗽𝗲𝗿𝗺𝗶𝘀 𝗱𝗲 𝗰𝗼𝗻𝗱𝘂𝗶𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗲́𝗰𝗮𝗹𝗲́.');
  parts.push('');
  parts.push('❓𝙏𝙐 𝙉\'𝘼𝙎 𝙋𝘼𝙎 𝙀𝙉𝘾𝙊𝙍𝙀 𝙏𝘼 𝘿𝘼𝙏𝙀 𝘿𝙐 𝙋𝙀𝙍𝙈𝙄𝙎 𝘿𝙀 𝘾𝙊𝙉𝘿𝙐𝙄𝙍𝙀⏳  : ');
  parts.push('- as-tu posé tes heures, en gardant 1 leçon de 2h (2h) + 3h avant examen pour les planifier au plus proche de ta prochaine date de permis ?  : ✅❌');
  parts.push('- ton passage à l\'examen a bien été acheté ?');
  parts.push('');
  parts.push('𝟱- 𝙍𝙀𝙁𝘼𝙄𝙎 𝗧𝗢𝗡 𝗕𝗜𝗟𝗔𝗡 𝗔𝗣𝗥𝗘̀𝗦 𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖 𝘼𝙑𝙀𝘾 𝘾𝙊𝙍𝙍𝙀𝘾𝙏𝙄𝙊𝙉 𝘿𝙀 𝙇𝘼 𝙍𝙀𝙎𝙋𝙊𝙉𝙎𝘼𝘽𝙇𝙀 𝙋𝙀́𝘿𝘼𝙂𝙊𝙂𝙄𝙌𝙐𝙀 (𝙜𝙧𝙖𝙩𝙪𝙞𝙩 𝙨𝙪𝙧 𝙢𝙚𝙨𝙨𝙚𝙣𝙜𝙚𝙧) :');
  parts.push('Pour être sûr(e) que tu as compris, ton bilan avec ton moniteur (trice). ');
  parts.push('Il faut que tu sois capable de t\'auto-évaluer pour éviter de te planter !');
  parts.push('Toutes les consignes sont sur le lien  https://www.facebook.com/share/p/18sc7wKjbg/');
  parts.push('💡 𝙍𝙖𝙥𝙥𝙚𝙡 : 𝙚𝙣 𝙘𝙖𝙨 𝙙\'𝙚́𝙘𝙝𝙚𝙘, 𝙩𝙪 𝙖𝙪𝙧𝙖𝙨 𝙈𝙄𝙉𝙄𝙈𝙐𝙈 𝟰𝙝 (𝟮 𝙡𝙚𝙘̧𝙤𝙣𝙨 𝙙𝙚 𝟮𝙝) + 𝟯𝙝 (𝟮𝙝 𝙡𝙖 𝙫𝙚𝙞𝙡𝙡𝙚 𝙙𝙪 𝙥𝙚𝙧𝙢𝙞𝙨 𝙚𝙩 𝟭𝙝 𝙡𝙚 𝙟𝙤𝙪𝙧 𝙢𝙚̂𝙢𝙚) 𝙖̀ 𝙚𝙛𝙛𝙚𝙘𝙩𝙪𝙚𝙧 𝘼𝙑𝘼𝙉𝙏 𝙙𝙚 𝙧𝙚𝙥𝙖𝙨𝙨𝙚𝙧.');
  parts.push('');
  parts.push('𝟲- 𝙅𝙊𝙐𝙍 𝘿𝙐 𝙋𝙀𝙍𝙈𝙄𝙎 🔎');
  parts.push('Tu vas être ajouté(e) dans un groupe Messenger qui t\'indiquera le programme de ta journée et toutes les procédures à apprendre pour l\'examen : PATIENCE ÇA ARRIVERA quand on aura ta date🙂');
  parts.push('');
  parts.push('𝟳- 𝘾𝙊𝙉𝙏𝙄𝙉𝙐𝙀 𝘿𝙀 𝙏𝙍𝘼𝙑𝘼𝙄𝙇𝙇𝙀𝙍  🧠');
  parts.push('Réserves en plus des écoutes pédagogiques et bosse bien tes groupes ! ');
  parts.push('');
  parts.push('𝟴- 𝙇𝘼 𝙑𝙀𝙄𝙇𝙇𝙀 𝘿𝙀 𝙏𝙊𝙉 𝙀𝙓𝘼𝙈𝙀𝙉 🆔');
  parts.push('N\'oublie pas de nous donner ta carte d\'identité et en attendant envoie-moi la photo de ta carte d\'identité recto verso ici (pour s\'assurer qu\'elle est bien en ta possession, car pas de carte d\'identité, pas de permis !)');
  return parts.join('\n');
}



/* ============================================================
   FRISE DE FORMATION
   Elle est saisie dans la note interne ; le bilan la reprend
   telle quelle. Sans note, on laisse les ❓ à compléter.
   ============================================================ */
const FRISE_VIDE = '❓ leçons de 2h + exam blanc + ❓ leçons de 2h (❓h) + 3h avant examen';

/* Retrouve une frise dans un texte de note interne */
function extraireFrise(note){
  const t = String(note || '');
  /* Une frise contient toujours « exam blanc » et « leçons de 2h » */
  const morceaux = t.split('·');
  for(let i = 0; i < morceaux.length; i++){
    const m = morceaux[i].trim();
    if(/le[çc]ons? de 2h/i.test(m) && /exam(en)? blanc/i.test(m)) return m;
  }
  return '';
}

/* Nombre de leçons prévues AVANT l'examen blanc, d'après la frise */
function leconsAvantExamenBlanc(frise){
  const m = String(frise || '').match(/(\d+)\s*le[çc]ons?\s+de\s+2h[^]*?exam/i);
  return m ? parseInt(m[1], 10) : null;
}

/* Nombre de leçons prévues APRÈS l'examen blanc */
function leconsApresExamenBlanc(frise){
  const m = String(frise || '').match(/exam(?:en)?\s+blanc\s*\+\s*(\d+)\s*le[çc]ons?/i);
  return m ? parseInt(m[1], 10) : null;
}

/* Nombre total de leçons voiture prévues dans une frise AAC ou CS */
function leconsPrevuesAacCs(frise){
  const m = String(frise || '').match(/que\s*(\d+)\s*le[çc]ons?\s+voiture/i);
  return m ? parseInt(m[1], 10) : null;
}

/* Construit la phrase de frise à partir des deux nombres */
function composerFrise(avant, apres){
  const a = String(avant || '').trim();
  const b = String(apres || '').trim();
  if(!a && !b) return '';
  const heures = b ? (parseInt(b, 10) * 2) + 'h' : '❓h';
  return (a || '❓') + ' leçons de 2h + exam blanc + ' + (b || '❓') +
         ' leçons de 2h (' + heures + ') + 3h avant examen';
}

/* ============================================================
   MODÈLE CONDUITE (remplace boîte manuelle et boîte automatique)
   Structure : texte dicté intégral + résumé, sans les 9 rubriques.
   ============================================================ */
const MARQUE_FAITE = '✅';

/* Fiche véhicule : coche les manœuvres faites, en reprenant
   celles déjà validées lors des cours précédents. */
/* Le rappel joint au bilan quand le moniteur signale que l'élève
   ne réserve pas d'écoutes pédagogiques. Texte de l'auto-école,
   modifiable dans « Textes types » sous l'usage « ecoutes ». */
const RAPPEL_ECOUTES =
"Tu ne réserves pas d'écoutes pédagogiques 😱\n" +
"Peut-être n'as-tu pas compris l'intérêt d'économiser de l'argent ? 💰\n" +
"On t'a expliqué quand tu t'es inscrit notre méthodologie et tu as accepté de la suivre 🤝\n" +
"Ne me dis pas que tu n'as pas le temps d'en réserver, tu as bien le temps de réserver de la conduite !\n" +
"La différence, c'est que l'écoute pédagogique, c'est illimité et tu ne payes pas à chaque prestation à contrario de la conduite 😎\n" +
"Tu profites du cours de l'autre élève pour travailler tes procédures, connaître les parcours d'examen, observer autour de toi, anticiper etc\n" +
"Bref tout travailler sans dépenser d'argent et sans le stress d'être au volant 🎉\n" +
"En tant que moniteur, cela se voit tout de suite que tu n'as pas fait D'ÉCOUTES, et au bureau, c'est un boulot monstrueux de vous ouvrir ces écoutes pédagogiques 🤯\n" +
"Donc RÉSERVE IMMÉDIATEMENT de ton compte en ligne ⚠️\n" +
"https://www.facebook.com/groups/174715876519873/permalink/96295402436271";

/* Le texte à joindre : celui de l'auto-école s'il a été enregistré */
function rappelEcoutes(){
  const perso = (typeof modelePour === 'function') ? modelePour('ecoutes') : null;
  return (perso && perso.contenu) ? perso.contenu : RAPPEL_ECOUTES;
}

/* Faut-il le joindre ? Le questionnaire l'a dit, ou la note le porte. */
function sansEcoutes(options){
  const ctx = (typeof contexteDepart !== 'undefined' && contexteDepart) || {};
  if(ctx.pasEcoute) return true;
  return /pas d'écoutes? pédagogiques?/i.test((options && options.note) || '');
}


/* Le rappel affiché quand le moniteur signale que l'élève ne réserve
   pas d'écoutes pédagogiques. Texte fixe, fourni par l'auto-école. */
const TEXTE_PAS_ECOUTES =
'Tu ne réserves pas d\'écoutes pédagogiques 😱\n' +
'\n' +
"Peut-être n'as-tu pas compris l'intérêt d'économiser de l'argent ? 💰\n" +
'\n' +
"On t'a expliqué quand tu t'es inscrit notre méthodologie et tu as accepté de la suivre 🤝\n" +
"Ne me dis pas que tu n'as pas le temps d'en réserver, tu as bien le temps de réserver de la conduite ! \n" +
"La différence, c'est que l'écoute pédagogique, c'est illimité et tu ne payes pas à chaque prestation à contrario de la conduite 😎\n" +
'\n' +
"Tu profites du cours de l'autre élève pour travailler tes procédures, connaître les parcours d'examen, observer autour de toi, anticiper etc \n" +
"Bref tout travailler sans dépenser d'argent et sans le stress d'être au volant 🎉\n" +
'\n' +
"En tant que moniteur, cela se voit tout de suite que tu n'as pas fait D'ÉCOUTES, et au bureau, c'est un boulot monstrueux de vous ouvrir ces écoutes pédagogiques 🤯\n" +
'\n' +
'Donc RÉSERVE IMMÉDIATEMENT de ton compte en ligne ⚠️\n' +
'https://www.facebook.com/groups/174715876519873/permalink/96295402436271';

/* Le moniteur a-t-il coché « Pas d'écoutes pédagogiques » ? */
function pasEcoutesPedagogiques(){
  const q = (typeof contexteDepart !== 'undefined' && contexteDepart) ? contexteDepart : null;
  if(q && q.pasEcoute) return true;
  /* Repli sur la note, si le questionnaire n'est plus en mémoire */
  const n = (typeof $ === 'function' && $('noteInterne')) ? $('noteInterne').value : '';
  return /pas d'écoutes? pédagogiques?/i.test(n);
}

/* Le rappel des écoutes ne doit figurer qu'une fois, juste sous la
   ligne qui le motive. S'il réapparaît plus bas — repris par l'IA
   dans son résumé, ou hérité d'un modèle de texte — on ne garde que
   la première occurrence. */
function unSeulRappelEcoutes(bilan){
  const t = String(bilan || '');
  const debut = "Tu ne réserves pas d'écoutes pédagogiques";
  const premier = t.indexOf(debut);
  if(premier === -1) return t;

  const suivant = t.indexOf(debut, premier + debut.length);
  if(suivant === -1) return t;

  /* On coupe du second début jusqu'à la fin de son lien, ou à
     défaut jusqu'à la ligne vide qui le suit. */
  const lien = 'permalink/96295402436271';
  let fin = t.indexOf(lien, suivant);
  fin = (fin === -1) ? t.indexOf('\n\n', suivant) : fin + lien.length;
  if(fin === -1) fin = t.length;

  return (t.slice(0, suivant) + t.slice(fin))
    .replace(/\n{3,}/g, '\n\n');
}

function blocFicheConduite(faitesAujourdhui, faitesAvant, marquesAvant){
  /* Ce qui a déjà été validé lors des cours précédents, avec les
     marques accumulées : ✅ la première fois, puis l'émoji de chaque
     moniteur qui l'a retravaillée. */
  const avant = {};
  (faitesAvant || []).forEach(n => { avant[normaliserMot(n)] = true; });

  const aujourdhui = {};
  (faitesAujourdhui || []).forEach(n => { aujourdhui[normaliserMot(n)] = true; });

  const marques = marquesAvant || {};
  const emoji = (typeof ACCES !== 'undefined' && ACCES.emoji) ? ACCES.emoji : '';

  const lignes = ['🦉𝔽𝕀ℂℍ𝔼 𝕍𝔼ℍ𝕀ℂ𝕌𝕃𝔼 : '];
  BLOC.ficheListeConduite.forEach(libelle => {
    const cle = normaliserMot(libelle);

    const proche = (table) => {
      if(table[cle]) return true;
      /* Tolérance : "CD" doit reconnaître "CD Créneau droit" */
      for(const v in table){
        if(v && (cle.indexOf(v) === 0 || v.indexOf(cle) === 0)) return true;
      }
      return false;
    };

    const dejaAvant = proche(avant);
    const faiteCeJour = proche(aujourdhui);

    /* On reprend les marques déjà présentes dans le bilan précédent */
    let suite = marques[cle] || (dejaAvant ? MARQUE_FAITE : '');

    if(faiteCeJour){
      if(!suite){
        /* Première validation : une simple coche */
        suite = MARQUE_FAITE;
      }else if(emoji && suite.indexOf(emoji) === -1){
        /* Déjà validée : le moniteur du jour ajoute sa signature */
        suite += ' ' + emoji;
      }
    }

    lignes.push(libelle + (suite ? ' ' + suite : ''));
  });
  return lignes.join('\n');
}

/* Retrouve les manœuvres déjà cochées dans un bilan précédent */

/* ============================================================
   LECTURE DE LA FICHE VÉHICULE

   La fiche réelle ne suit aucun format strict : tout peut tenir
   sur une ligne, les marques sont des émojis variés, parfois du
   texte (« = Fait »). On repère donc chaque manœuvre par son nom
   et on lit ce qui la suit jusqu'à la manœuvre suivante.
   ============================================================ */

/* Le libellé court d'une manœuvre : « CD » pour « CD Créneau droit ».
   C'est souvent la seule forme écrite dans les fiches. */
function codeManoeuvre(libelle){
  const m = String(libelle || '').match(/^([A-Z0-9\/]{2,5})\s/);
  return m ? m[1] : '';
}

/* Extrait le bloc « fiche véhicule » d'un bilan */
function blocFicheDuBilan(texte){
  const t = String(texte || '');
  const d = t.search(/𝔽𝕀ℂℍ𝔼\s*𝕍𝔼ℍ𝕀ℂ𝕌𝕃𝔼|FICHE\s*V[EÉ]HICULE/i);
  if(d === -1) return '';
  /* Jusqu'à la section suivante, repérée par une ligne vide suivie
     d'un titre, ou la fin du texte */
  const suite = t.slice(d);
  const f = suite.search(/\n\s*\n\s*[➡️🧠🎙️👋📌🔒]/);
  return f === -1 ? suite : suite.slice(0, f);
}

/* Ce qui suit un nom de manœuvre et vaut validation */
function estUneMarque(bout){
  const s = String(bout || '').trim();
  if(!s) return false;
  /* Une mention explicite */
  if(/\bfait\b|\bok\b|\bvalid[ée]/i.test(s)) return true;
  /* Un émoji, un symbole : tout ce qui n'est ni lettre ni ponctuation */
  return /[\u2190-\u2BFF\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF\u2705\u274C\uFE0F]/.test(s);
}

/* Nettoie une marque : on garde les symboles, pas le bavardage */
function marquePropre(bout){
  const s = String(bout || '').trim();
  const symboles = s.match(/[\u2190-\u2BFF\u2600-\u27BF\uD83C\uDDE6-\uDFFF\uD83D\uDC00-\uDFFF\uD83E\uDD00-\uDFFF\u2705\u274C]+/g);
  if(symboles && symboles.length) return symboles.join(' ').replace(/\s+/g, ' ').trim();
  if(/\bfait\b|\bok\b|\bvalid[ée]/i.test(s)) return MARQUE_FAITE;
  return '';
}

/* Les manœuvres validées et leurs marques, d'après un bilan */
function marquesDejaPosees(texteBilanPrecedent){
  const marques = {};
  const bloc = blocFicheDuBilan(texteBilanPrecedent);
  if(!bloc) return marques;

  const norme = normaliserMot(bloc);

  /* Où commence chaque manœuvre dans le texte */
  const reperes = [];
  BLOC.ficheListeConduite.forEach(libelle => {
    const formes = [libelle];
    const code = codeManoeuvre(libelle);
    if(code) formes.push(code);

    let pos = -1, longueur = 0;
    formes.forEach(x => {
      const n = normaliserMot(x);
      if(!n) return;
      const i = norme.indexOf(n);
      /* On préfère la forme la plus longue trouvée */
      if(i !== -1 && (pos === -1 || n.length > longueur)){
        pos = i; longueur = n.length;
      }
    });
    if(pos !== -1) reperes.push({ libelle: libelle, pos: pos, fin: pos + longueur });
  });

  reperes.sort((a, b) => a.pos - b.pos);

  reperes.forEach((r, i) => {
    const suivant = reperes[i + 1] ? reperes[i + 1].pos : bloc.length;
    const bout = bloc.slice(r.fin, suivant);
    if(estUneMarque(bout)){
      const m = marquePropre(bout);
      if(m) marques[normaliserMot(r.libelle)] = m;
    }
  });

  return marques;
}

/* Les manœuvres validées, d'après les marques trouvées */
function manoeuvresDejaFaites(texteBilanPrecedent){
  const marques = marquesDejaPosees(texteBilanPrecedent);
  return BLOC.ficheListeConduite.filter(x => marques[normaliserMot(x)]);
}


function buildConduite(ai, faitesAvant, texteCours, noteInterne, marquesAvant){
  ai = ai || {};
  const parts = [];

  parts.push('👋𝔹𝕀𝕃𝔸ℕ 𝔻𝔼 𝕋𝔸 ℂ𝕆ℕ𝔻𝕌𝕀𝕋𝔼 👀');
  parts.push('Rappel : dsl pour les fautes, écriture orale automatique 😅');
  parts.push('');
  parts.push('𝘾𝙖𝙧𝙩𝙚 𝙎𝘿  ' + (ai.carteSD === '❌' ? '❌' : '✅'));
  parts.push("N'oublie pas de la regarder et si soucis demande nous !! (rappel, tous tes cours sont filmés, par une caméra avant et une arrière, avec le son et les conseils des moniteurs, pour revoir tout ton cours de conduite, avant de revenir à ton prochain cours). ");
  parts.push('');
  parts.push('𝙄𝙣𝙨𝙩𝙖𝙡𝙡𝙖𝙩𝙞𝙤𝙣  ' + (ai.installation === '❌' ? '❌' : '✅') + ' https://www.facebook.com/groups/963972327360861/permalink/969918630099564/');
  parts.push('𝙋𝙖𝙨𝙨𝙖𝙜𝙚𝙧 ' + (ai.passager === '❌' ? '❌' : '✅'));
  parts.push('𝙑𝙤𝙮𝙖𝙣𝙩𝙨 ' + (ai.voyants === '❌' ? '❌' : '✅'));
  parts.push('/2 points jour du permis ');
  parts.push('');
  parts.push('𝙑𝙚́𝙧𝙞𝙛𝙞𝙘𝙖𝙩𝙞𝙤𝙣𝙨 https://www.facebook.com/groups/864826058258637 ');
  parts.push('/3 points jour du permis ');
  parts.push('');
  parts.push('🎙️ 𝕋𝕆ℕ ℂ𝕆𝕌ℝ𝕊 :');
  parts.push(txt(texteCours || ai.texteDicte));
  parts.push('');
  parts.push('🧠 🚘👀🅴🆁🆁🅴🆄🆁🆂  🅲🅴  🅹🅾🆄🆁 : ');
  parts.push(txt(ai.resume));
  parts.push('');
  /* Les manœuvres cochées au questionnaire comptent comme faites
     aujourd'hui : elles reçoivent l'émoji du moniteur, comme les
     autres. Sans ça, cocher une case n'aurait aucun effet. */
  const duJour = (ai.manoeuvres || []).slice();

  /* Trois sources, réunies : ce que l'IA a entendu, ce que le moniteur
     a coché en fin de cours, et ce qu'il avait coché à la préparation.
     Une seule source suffisait à tout perdre si le questionnaire était
     rouvert entre-temps. */
  const sources = [];
  if(typeof contexteDepart !== 'undefined' && contexteDepart){
    sources.push(contexteDepart.manoeuvresAjoutees);
  }
  if(typeof prepareEnCours !== 'undefined' && prepareEnCours &&
     prepareEnCours.contexte){
    sources.push(prepareEnCours.contexte.manoeuvresAjoutees);
  }

  sources.forEach(liste => {
    (liste || []).forEach(m => {
      if(duJour.indexOf(m) === -1) duJour.push(m);
    });
  });

  parts.push(blocFicheConduite(duJour, faitesAvant, marquesAvant));
  parts.push('');
  parts.push('➡️ 4 Groupes de travail : tu es bien dessus et tu les bosses ?' + st(ai.groupesTravail));
  /* La croix rouge et le rappel remplacent la réponse habituelle
     quand le moniteur a coché la case. */
  const sansEcoutes = pasEcoutesPedagogiques();
  parts.push("➡️ Réserves-tu plus d'écoutes pédagogiques que de conduite ? " +
    (sansEcoutes ? '❌' : st(ai.ecoutes)) +
    ' https://www.facebook.com/groups/174715876519873/permalink/1143782686279849/');
  if(sansEcoutes){
    parts.push('');
    parts.push(TEXTE_PAS_ECOUTES);
    parts.push('');
  }
  parts.push("💡Tu n'as pas possibilité de partir en Conduite supervisée ??");
  parts.push(' https://www.facebook.com/groups/963972327360861/permalink/1122235844867841/');
  parts.push('➡️  Rappel de ta FRISE DE FORMATION EN VOITURE : ');
  parts.push(extraireFrise(noteInterne) || FRISE_VIDE);

  return parts.join('\n');
}

/* ============================================================
   DÉFINITION DES 13 MODÈLES
   ============================================================ */
const MODELES = {
  /* --- Conduite --- */
  'conduite-auto': {
    label: 'Conduite — Boîte automatique', groupe: 'Conduite', schema: 'conduiteResumeAuto',
    build: (ai, ctx) => buildConduite(ai, ctx && ctx.manoeuvresAvant, ctx && ctx.transcript,
                                      ctx && ctx.note, ctx && ctx.marquesAvant)
  },
  'conduite-manuelle': {
    label: 'Conduite — Boîte manuelle', groupe: 'Conduite', schema: 'conduiteResume',
    build: (ai, ctx) => buildConduite(ai, ctx && ctx.manoeuvresAvant, ctx && ctx.transcript,
                                      ctx && ctx.note, ctx && ctx.marquesAvant)
  },
  'aac-manuelle': {
    label: 'AAC — Boîte manuelle', groupe: 'Conduite accompagnée', schema: 'conduite',
    opts: { verifs:false, fiche:true },
    build: ai => [
      BLOC.entete, '',
      BLOC.carteSD(ai.carteSD), '',
      BLOC.installPassVoyants(ai.installation, ai.passager, ai.voyants), '',
      blocRubriques(ai.rubriques),
      blocFiche(ai.ficheVehicule, BLOC.ficheListe), '',
      rappelAac('4 leçons de 2 heures + simu nuit et risques + 2 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable.')
    ].join('\n')
  },
  'aac-auto': {
    label: 'AAC — Boîte automatique', groupe: 'Conduite accompagnée', schema: 'conduite',
    opts: { verifs:false, fiche:true },
    build: ai => [
      BLOC.entete, '',
      '𝘾𝙖𝙧𝙩𝙚 𝙎𝘿 ✅  donnée ce jour \nN\'oublie pas de la regarder et si soucis demande nous !! (rappel, tous tes cours sont filmés, par une caméra avant et une arrière, avec le son et les conseils des moniteurs, pour revoir tout ton cours de conduite, avant de revenir à ton prochain cours). ', '',
      BLOC.installPassVoyants(ai.installation, ai.passager, ai.voyants), '',
      blocRubriques(ai.rubriques),
      blocFiche(ai.ficheVehicule, BLOC.ficheListeAacAuto), '',
      rappelAac('3 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable.')
    ].join('\n')
  },
  'aac-rvp': {
    label: 'AAC — Rendez-vous pédagogique (RVP 1 et 2)', groupe: 'Conduite accompagnée', schema: 'rvp',
    build: buildRvp
  },
  'rdv-prealable-manuelle': {
    label: 'Rendez-vous préalable — Boîte manuelle', groupe: 'Rendez-vous préalable', schema: 'conduite',
    opts: { verifs:false, fiche:false },
    build: ai => [
      '👋𝔹𝕀𝕃𝔸ℕ 𝔻𝔼 𝕋𝕆ℕ ℝ𝔼ℕ𝔻𝔼ℤ-𝕍𝕆𝕌𝕊 ℙℝ𝔼́𝔸𝕃𝔸𝔹𝕃𝔼 👀',
      'Rappel : dsl pour les fautes, écriture orale automatique 😅', '',
      BLOC.carteSD(ai.carteSD), '',
      BLOC.installPassVoyants(ai.installation, ai.passager, ai.voyants), '',
      blocRubriques(ai.rubriques),
      TAIL_RDV_PREALABLE
    ].join('\n')
  },
  'rdv-prealable-auto': {
    label: 'Rendez-vous préalable — Boîte automatique', groupe: 'Rendez-vous préalable', schema: 'conduite',
    opts: { verifs:false, fiche:false },
    build: ai => [
      '👋𝔹𝕀𝕃𝔸ℕ 𝔻𝔼 𝕋𝕆ℕ ℝ𝔼ℕ𝔻𝔼ℤ-𝕍𝕆𝕌𝕊 ℙℝ𝔼́𝔸𝕃𝔸𝔹𝕃𝔼 👀',
      'Rappel : dsl pour les fautes, écriture orale automatique 😅', '',
      BLOC.carteSD(ai.carteSD), '',
      BLOC.installPassVoyants(ai.installation, ai.passager, ai.voyants), '',
      blocRubriques(ai.rubriques),
      TAIL_RDV_PREALABLE
    ].join('\n')
  },
  'formation-accompagnateur': {
    label: 'Formation accompagnateur (vouvoiement)', groupe: 'Rendez-vous préalable', schema: 'accompagnateur',
    build: ai => [
      '👋𝔹𝕀𝕃𝔸ℕ 𝔻𝔼 𝕍𝕆𝕋ℝ𝔼 ℂ𝕆ℕ𝔻𝕌𝕀𝕋𝔼 👀',
      'Rappel : dsl pour les fautes, écriture orale automatique 😅', '',
      'Carte SD ' + st(ai.carteSD),
      'Installation ' + st(ai.installation), '',
      blocRubriques(ai.rubriques),
      '⚠️On doit avoir conscience de ces erreurs, pour éviter de les transmettre à l\'apprenti conducteur AAC ou CS ⚠️'
    ].join('\n')
  },

  /* --- Simulateur --- */
  'simu-manuelle': {
    label: 'Simulateur — Boîte manuelle', groupe: 'Simulateur', schema: 'simu',
    comps: SIMU_COMP_MANUELLE,
    build: ai => buildSimu(ai, SIMU_COMP_MANUELLE, SIMU_TXT.groupesManuelle)
  },
  'simu-auto': {
    label: 'Simulateur — Boîte automatique', groupe: 'Simulateur', schema: 'simu',
    comps: SIMU_COMP_AUTO,
    build: ai => buildSimu(ai, SIMU_COMP_AUTO, SIMU_TXT.groupesAuto)
  },

  /* --- Évaluation --- */
  'eval-manuelle': {
    label: 'Évaluation — Boîte manuelle', groupe: 'Évaluation', schema: 'eval',
    build: ai => buildEval(ai, true)
  },
  'eval-auto': {
    label: 'Évaluation — Boîte automatique', groupe: 'Évaluation', schema: 'eval',
    build: ai => buildEval(ai, false)
  },

  /* --- Examen --- */
  'rdv-post': {
    label: 'RDV post-permis', groupe: 'Examen', schema: 'rdvpost',
    /* Cet écran est particulier : il ne passe pas par l'assembleur */
    build: (ai, ctx) => String((ctx && ctx.note) || '')
  },
  'examen-blanc': {
    label: 'Examen blanc', groupe: 'Examen', schema: 'examenblanc',
    build: buildExamenBlanc
  },
  'examen-officiel': {
    label: 'Examen officiel', groupe: 'Examen', schema: 'examen',
    build: buildExamen
  }
};

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-modeles.js'] = true;
