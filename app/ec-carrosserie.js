/* Déployé le 05/09/2026 à 11:57 — v885 */
/* ============================================================
   ec-carrosserie.js
   L'état de la carrosserie, véhicule par véhicule.

   Chrystel, le 8 septembre 2026 : « est-ce qu'il serait possible
   d'avoir un modèle 3D de chaque véhicule dans la flotte pour que
   je puisse noter les rayures, les chocs avec les dates et les
   réparations ? »

   ⚠️ POURQUOI CE N'EST PAS DE LA 3D, ET POURQUOI C'EST MIEUX.

   Un point posé sur un modèle 3D est attaché À CE MODÈLE. Le jour
   où le modèle change — nouvelle voiture, autre fichier, autre
   bibliothèque — toutes les rayures enregistrées ne veulent plus
   rien dire. C'est la faute que cet outil passe ses semaines à
   réparer : une information qui dépend de son décor.

   Ici, un dommage est une VUE et DEUX POURCENTAGES : « côté
   conducteur, à 62 % de la longueur, 40 % de la hauteur ». Ça se
   relit dans un tableur, ça survit à un changement de dessin, et ça
   s'imprime. Les loueurs et les experts auto font ainsi depuis
   toujours, et ce n'est pas un hasard.

   Chrystel, le 8 septembre : « à plat, mais je veux les vues à plat
   d'AUDI A3 pour les A3 et d'AUDI Q3 pour les Q3 ». Les silhouettes
   sont donc dessinées par gabarit, reconnu au modèle du véhicule —
   et comme un dommage ne dépend pas du dessin, changer une
   silhouette ne perd jamais rien.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let dommagesFlotte = [];
let vehiculesCarrosserie = [];
let carrosserieLue = 0;

/* Ce qu'on peut constater sur une carrosserie. L'ordre est celui de
   la fréquence : une rayure est ce qu'on note dix fois pour un choc. */
const TYPES_DOMMAGE = [
  { cle:'rayure',     nom:'Rayure',              emoji:'〰️', couleur:'#E8A33D' },
  { cle:'choc',       nom:'Choc, enfoncement',   emoji:'💥', couleur:'#FF5C33' },
  { cle:'eclat',      nom:'Éclat de peinture',   emoji:'🔸', couleur:'#E8A33D' },
  { cle:'parebrise',  nom:'Pare-brise, vitre',   emoji:'🪟', couleur:'#5AA9E6' },
  { cle:'jante',      nom:'Jante, enjoliveur',   emoji:'🛞', couleur:'#5AA9E6' },
  { cle:'pneu',       nom:'Pneu',                emoji:'🛞', couleur:'#5AA9E6' },
  { cle:'retro',      nom:'Rétroviseur',         emoji:'🪞', couleur:'#FF5C33' },
  { cle:'optique',    nom:'Feu, optique',        emoji:'💡', couleur:'#FF5C33' },
  { cle:'interieur',  nom:'Intérieur, sellerie', emoji:'🪑', couleur:'#E8A33D' },
  { cle:'autre',      nom:'Autre',               emoji:'📝', couleur:'#E8A33D' }
];

const GRAVITES = [
  { cle:'legere',  nom:'Légère — ça se voit de près' },
  { cle:'moyenne', nom:'Moyenne — ça se voit' },
  { cle:'urgente', nom:'À réparer vite' }
];

/* ⚠️ « laisse » N'EST PAS « réparé ».

   Une rayure qu'on décide de garder reste une rayure : elle doit
   continuer de se voir sur le dessin, sinon on la redécouvre à la
   revente et personne ne sait de quand elle date. Elle est
   simplement grise au lieu d'orange. */
const ETATS_DOMMAGE = [
  { cle:'areparer', nom:'À réparer',        couleur:'var(--warn-text)' },
  { cle:'devis',    nom:'Devis demandé',    couleur:'var(--cream)' },
  { cle:'repare',   nom:'Réparé',           couleur:'var(--vert, #57D97E)' },
  { cle:'laisse',   nom:'Laissé tel quel',  couleur:'var(--muted)' }
];

function typeDommage(cle){
  return TYPES_DOMMAGE.find(t => t.cle === cle) || TYPES_DOMMAGE[0];
}
function etatDommage(cle){
  return ETATS_DOMMAGE.find(t => t.cle === cle) || ETATS_DOMMAGE[0];
}

/* La couleur d'un point sur le dessin : son ÉTAT d'abord — c'est ce
   qu'on vient chercher des yeux — son type ensuite. */
function couleurDuDommage(d){
  if(d.etat === 'repare') return '#57D97E';
  if(d.etat === 'laisse') return '#7B8CA0';
  if(d.gravite === 'urgente') return '#FF5C33';
  return typeDommage(d.type).couleur;
}


/* ============================================================
   LES SILHOUETTES

   Chaque vue est dessinée dans un repère de 0 à 100 en largeur ET
   en hauteur. C'est ce qui permet d'enregistrer un dommage en
   pourcentages : le même point tombe au même endroit quel que soit
   l'écran, et quel que soit le dessin qu'on mettra derrière.

   Le trait est volontairement sobre : on ne fait pas un catalogue,
   on fait un repère. Ce qui compte, c'est de reconnaître d'un coup
   d'œil de quel côté on est.
   ============================================================ */

/* Les couleurs du dessin, écrites une fois. */
const D_TRAIT = '#6E8AA6';
const D_CORPS = '#1B2836';
const D_VITRE = '#2B3F57';
const D_SOMBRE = '#0D141C';

function svgVue(contenu){
  return '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" ' +
    'style="width:100%;height:auto;display:block;touch-action:manipulation;">' +
    contenu + '</svg>';
}

/* ---------- AUDI A3 — la compacte, ligne basse ---------- */
const A3 = {
  nom: 'Audi A3',
  vues: [
    { cle:'gauche', nom:'Côté conducteur', dessin:
      '<path d="M5 74 L5 58 Q6 50 17 47 L33 34 Q41 28 55 27 L72 27 ' +
      'Q84 28 91 35 L95 47 Q97 52 97 58 L97 74 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M36 44 L46 34 Q50 31 58 31 L61 31 L61 44 Z" fill="' + D_VITRE + '"/>' +
      '<path d="M64 31 L72 31 Q82 32 87 38 L91 44 L64 44 Z" fill="' + D_VITRE + '"/>' +
      '<line x1="62.5" y1="31" x2="62.5" y2="73" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<line x1="35" y1="46" x2="35" y2="73" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<rect x="50" y="49" width="7" height="1.8" rx="0.9" fill="' + D_TRAIT + '"/>' +
      '<rect x="74" y="49" width="7" height="1.8" rx="0.9" fill="' + D_TRAIT + '"/>' +
      '<circle cx="30" cy="74" r="11" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<circle cx="30" cy="74" r="4.5" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<circle cx="82" cy="74" r="11" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<circle cx="82" cy="74" r="4.5" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<text x="50" y="93" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">avant à droite</text>' },

    { cle:'droite', nom:'Côté passager', dessin:
      '<path d="M95 74 L95 58 Q94 50 83 47 L67 34 Q59 28 45 27 L28 27 ' +
      'Q16 28 9 35 L5 47 Q3 52 3 58 L3 74 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M64 44 L54 34 Q50 31 42 31 L39 31 L39 44 Z" fill="' + D_VITRE + '"/>' +
      '<path d="M36 31 L28 31 Q18 32 13 38 L9 44 L36 44 Z" fill="' + D_VITRE + '"/>' +
      '<line x1="37.5" y1="31" x2="37.5" y2="73" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<line x1="65" y1="46" x2="65" y2="73" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<rect x="43" y="49" width="7" height="1.8" rx="0.9" fill="' + D_TRAIT + '"/>' +
      '<rect x="19" y="49" width="7" height="1.8" rx="0.9" fill="' + D_TRAIT + '"/>' +
      '<circle cx="70" cy="74" r="11" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<circle cx="70" cy="74" r="4.5" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<circle cx="18" cy="74" r="11" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<circle cx="18" cy="74" r="4.5" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<text x="50" y="93" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">avant à gauche</text>' },

    { cle:'avant', nom:'Avant', dessin:
      '<path d="M18 82 L18 44 Q19 34 30 29 L35 20 Q37 16 44 16 L56 16 ' +
      'Q63 16 65 20 L70 29 Q81 34 82 44 L82 82 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M36 29 L40 21 L60 21 L64 29 Z" fill="' + D_VITRE + '"/>' +
      '<path d="M22 46 L34 44 L34 51 L22 53 Z" fill="' + D_VITRE + '" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<path d="M78 46 L66 44 L66 51 L78 53 Z" fill="' + D_VITRE + '" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<path d="M38 60 L62 60 L59 72 L41 72 Z" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="0.9"/>' +
      '<rect x="24" y="74" width="52" height="5" rx="2" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<text x="50" y="93" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">calandre et pare-chocs</text>' },

    { cle:'arriere', nom:'Arrière', dessin:
      '<path d="M18 82 L18 46 Q19 36 29 31 L34 20 Q36 16 43 16 L57 16 ' +
      'Q64 16 66 20 L71 31 Q81 36 82 46 L82 82 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M35 31 L39 21 L61 21 L65 31 Z" fill="' + D_VITRE + '"/>' +
      '<rect x="21" y="44" width="15" height="9" rx="2" fill="#3B1F1C" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<rect x="64" y="44" width="15" height="9" rx="2" fill="#3B1F1C" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<rect x="40" y="60" width="20" height="6" rx="1.5" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<rect x="24" y="72" width="52" height="6" rx="2" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<text x="50" y="93" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">hayon et pare-chocs</text>' },

    { cle:'dessus', nom:'Dessus', dessin:
      '<path d="M32 8 Q50 4 68 8 L74 26 Q78 50 74 74 L68 92 ' +
      'Q50 96 32 92 L26 74 Q22 50 26 26 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M30 24 Q50 20 70 24 L72 34 L28 34 Z" fill="' + D_VITRE + '"/>' +
      '<rect x="29" y="37" width="42" height="26" rx="3" fill="#22303F" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<path d="M28 68 Q50 64 72 68 L70 78 Q50 74 30 78 Z" fill="' + D_VITRE + '"/>' +
      '<text x="50" y="99" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">avant en haut</text>' }
  ]
};

/* ---------- AUDI Q3 — le SUV : plus haut, plus droit ---------- */
const Q3 = {
  nom: 'Audi Q3',
  vues: [
    { cle:'gauche', nom:'Côté conducteur', dessin:
      '<path d="M5 70 L5 48 Q6 40 16 37 L30 26 Q38 20 52 20 L74 20 ' +
      'Q86 21 92 29 L96 40 Q97 44 97 50 L97 70 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M33 36 L43 26 Q47 24 55 24 L58 24 L58 36 Z" fill="' + D_VITRE + '"/>' +
      '<path d="M61 24 L74 24 Q84 25 89 31 L92 36 L61 36 Z" fill="' + D_VITRE + '"/>' +
      '<rect x="34" y="17" width="52" height="2" rx="1" fill="' + D_TRAIT + '"/>' +
      '<line x1="59.5" y1="24" x2="59.5" y2="69" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<line x1="32" y1="38" x2="32" y2="69" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<rect x="47" y="42" width="7" height="1.8" rx="0.9" fill="' + D_TRAIT + '"/>' +
      '<rect x="72" y="42" width="7" height="1.8" rx="0.9" fill="' + D_TRAIT + '"/>' +
      '<rect x="5" y="62" width="92" height="4" fill="#141E29"/>' +
      '<circle cx="28" cy="70" r="13" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<circle cx="28" cy="70" r="5.5" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<circle cx="80" cy="70" r="13" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<circle cx="80" cy="70" r="5.5" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<text x="50" y="93" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">avant à droite</text>' },

    { cle:'droite', nom:'Côté passager', dessin:
      '<path d="M95 70 L95 48 Q94 40 84 37 L70 26 Q62 20 48 20 L26 20 ' +
      'Q14 21 8 29 L4 40 Q3 44 3 50 L3 70 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M67 36 L57 26 Q53 24 45 24 L42 24 L42 36 Z" fill="' + D_VITRE + '"/>' +
      '<path d="M39 24 L26 24 Q16 25 11 31 L8 36 L39 36 Z" fill="' + D_VITRE + '"/>' +
      '<rect x="14" y="17" width="52" height="2" rx="1" fill="' + D_TRAIT + '"/>' +
      '<line x1="40.5" y1="24" x2="40.5" y2="69" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<line x1="68" y1="38" x2="68" y2="69" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<rect x="46" y="42" width="7" height="1.8" rx="0.9" fill="' + D_TRAIT + '"/>' +
      '<rect x="21" y="42" width="7" height="1.8" rx="0.9" fill="' + D_TRAIT + '"/>' +
      '<rect x="3" y="62" width="92" height="4" fill="#141E29"/>' +
      '<circle cx="72" cy="70" r="13" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<circle cx="72" cy="70" r="5.5" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<circle cx="20" cy="70" r="13" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<circle cx="20" cy="70" r="5.5" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<text x="50" y="93" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">avant à gauche</text>' },

    { cle:'avant', nom:'Avant', dessin:
      '<path d="M14 84 L14 38 Q15 28 26 23 L31 15 Q33 11 41 11 L59 11 ' +
      'Q67 11 69 15 L74 23 Q85 28 86 38 L86 84 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M32 23 L36 16 L64 16 L68 23 Z" fill="' + D_VITRE + '"/>' +
      '<path d="M18 40 L32 38 L32 46 L18 48 Z" fill="' + D_VITRE + '" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<path d="M82 40 L68 38 L68 46 L82 48 Z" fill="' + D_VITRE + '" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<path d="M33 54 L67 54 L64 70 L36 70 Z" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="0.9"/>' +
      '<rect x="20" y="73" width="60" height="7" rx="2.5" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<text x="50" y="93" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">calandre et pare-chocs</text>' },

    { cle:'arriere', nom:'Arrière', dessin:
      '<path d="M14 84 L14 40 Q15 30 25 25 L30 15 Q32 11 40 11 L60 11 ' +
      'Q68 11 70 15 L75 25 Q85 30 86 40 L86 84 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M31 25 L35 16 L65 16 L69 25 Z" fill="' + D_VITRE + '"/>' +
      '<rect x="17" y="38" width="18" height="10" rx="2" fill="#3B1F1C" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<rect x="65" y="38" width="18" height="10" rx="2" fill="#3B1F1C" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<rect x="38" y="56" width="24" height="7" rx="1.5" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<rect x="20" y="72" width="60" height="7" rx="2.5" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<text x="50" y="93" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">hayon et pare-chocs</text>' },

    { cle:'dessus', nom:'Dessus', dessin:
      '<path d="M30 6 Q50 2 70 6 L76 24 Q80 50 76 76 L70 94 ' +
      'Q50 98 30 94 L24 76 Q20 50 24 24 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M28 22 Q50 18 72 22 L74 32 L26 32 Z" fill="' + D_VITRE + '"/>' +
      '<rect x="27" y="35" width="46" height="30" rx="3" fill="#22303F" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<rect x="31" y="35" width="3" height="30" fill="' + D_TRAIT + '" opacity="0.5"/>' +
      '<rect x="66" y="35" width="3" height="30" fill="' + D_TRAIT + '" opacity="0.5"/>' +
      '<path d="M26 70 Q50 66 74 70 L72 80 Q50 76 28 80 Z" fill="' + D_VITRE + '"/>' +
      '<text x="50" y="99" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">avant en haut · barres de toit</text>' }
  ]
};

/* ---------- Deux-roues ---------- */
const DEUX_ROUES = {
  nom: 'Deux-roues',
  vues: [
    { cle:'gauche', nom:'Côté gauche', dessin:
      '<path d="M22 56 L34 42 L58 40 L72 48 L80 58 L72 62 L36 62 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M30 42 L38 30 L52 30 L56 40 Z" fill="' + D_VITRE + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<circle cx="26" cy="72" r="15" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.6"/>' +
      '<circle cx="26" cy="72" r="5" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '"/>' +
      '<circle cx="76" cy="72" r="15" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.6"/>' +
      '<circle cx="76" cy="72" r="5" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '"/>' +
      '<text x="50" y="95" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">avant à gauche</text>' },
    { cle:'droite', nom:'Côté droit', dessin:
      '<path d="M78 56 L66 42 L42 40 L28 48 L20 58 L28 62 L64 62 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M70 42 L62 30 L48 30 L44 40 Z" fill="' + D_VITRE + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<circle cx="74" cy="72" r="15" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.6"/>' +
      '<circle cx="74" cy="72" r="5" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '"/>' +
      '<circle cx="24" cy="72" r="15" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.6"/>' +
      '<circle cx="24" cy="72" r="5" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '"/>' +
      '<text x="50" y="95" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">avant à droite</text>' },
    { cle:'avant', nom:'Avant et carénage', dessin:
      '<path d="M38 22 L62 22 L70 46 L66 74 L34 74 L30 46 Z" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<ellipse cx="50" cy="34" rx="11" ry="7" fill="' + D_VITRE + '" stroke="' + D_TRAIT + '" stroke-width="0.8"/>' +
      '<rect x="22" y="46" width="12" height="4" rx="2" fill="' + D_TRAIT + '"/>' +
      '<rect x="66" y="46" width="12" height="4" rx="2" fill="' + D_TRAIT + '"/>' +
      '<text x="50" y="92" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">guidon et optique</text>' }
  ]
};

/* ---------- Remorque ---------- */
const REMORQUE = {
  nom: 'Remorque',
  vues: [
    { cle:'gauche', nom:'Côté gauche', dessin:
      '<rect x="16" y="34" width="70" height="30" rx="2" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M16 50 L4 58 L16 60 Z" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.2"/>' +
      '<circle cx="56" cy="68" r="11" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<text x="50" y="92" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">timon à gauche</text>' },
    { cle:'droite', nom:'Côté droit', dessin:
      '<rect x="14" y="34" width="70" height="30" rx="2" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<path d="M84 50 L96 58 L84 60 Z" fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.2"/>' +
      '<circle cx="44" cy="68" r="11" fill="' + D_SOMBRE + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<text x="50" y="92" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">timon à droite</text>' },
    { cle:'arriere', nom:'Arrière (hayon)', dessin:
      '<rect x="22" y="26" width="56" height="48" rx="2" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<rect x="26" y="62" width="10" height="7" rx="1.5" fill="#3B1F1C" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<rect x="64" y="62" width="10" height="7" rx="1.5" fill="#3B1F1C" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<text x="50" y="90" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">hayon et feux</text>' },
    { cle:'dessus', nom:'Plateau', dessin:
      '<rect x="26" y="14" width="48" height="72" rx="2" ' +
      'fill="' + D_CORPS + '" stroke="' + D_TRAIT + '" stroke-width="1.4"/>' +
      '<line x1="26" y1="38" x2="74" y2="38" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<line x1="26" y1="62" x2="74" y2="62" stroke="' + D_TRAIT + '" stroke-width="0.7"/>' +
      '<text x="50" y="96" font-size="5" fill="' + D_TRAIT + '" text-anchor="middle">timon en haut</text>' }
  ]
};

const GABARITS = { a3: A3, q3: Q3, deuxroues: DEUX_ROUES, remorque: REMORQUE };

/* ⚠️ LE GABARIT SE DÉDUIT, IL NE S'ENREGISTRE PAS.

   Chrystel : « je veux les vues à plat d'AUDI A3 pour les A3 et
   d'AUDI Q3 pour les Q3 ». Le modèle est déjà écrit sur la fiche du
   véhicule — « Audi A3 Sportback », « Audi Q3 » — et c'est lui qu'on
   lit. Une colonne de plus serait une seconde vérité à tenir à jour.

   Et si la lecture se trompe, RIEN N'EST PERDU : un dommage est
   enregistré en pourcentages, pas sur un dessin. Changer de
   silhouette déplace le décor, jamais les points. */
function gabaritDuVehicule(v){
  const t = ((v && v.modele) || '') + ' ' + ((v && v.nom) || '');
  const m = t.toLowerCase();

  const cat = String((v && v.categorie) || '').toLowerCase();
  if(cat === 'remorque') return GABARITS.remorque;
  if(cat === 'moto' || cat === 'scooter' || cat === '125') return GABARITS.deuxroues;

  /* Les SUV d'abord : « Q3 » contient un chiffre qu'aucune règle
     plus loin ne doit attraper. */
  if(/\bq[2-8]\b|suv|tiguan|3008|2008|captur|duster/.test(m)) return GABARITS.q3;

  /* Tout le reste des voitures prend la silhouette de la compacte :
     c'est la forme la plus proche d'une A3, d'une Clio ou d'une 208. */
  return GABARITS.a3;
}


/* ============================================================
   CE QUE LE CLASSEUR NOUS DIT
   ============================================================ */
async function chargerCarrosserie(force){
  if(!force && carrosserieLue && (Date.now() - carrosserieLue < 60000)) return;
  const r = await appelPrep({ action: 'carrosserieList' });
  vehiculesCarrosserie = (r && r.vehicules) || [];
  dommagesFlotte = (r && r.dommages) || [];
  carrosserieLue = Date.now();
}

function dommagesDe(idVehicule){
  return dommagesFlotte.filter(d => String(d.idVehicule) === String(idVehicule));
}

/* Ce qui reste à réparer sur un véhicule : le chiffre de la carte. */
function aReparerSur(idVehicule){
  return dommagesDe(idVehicule)
    .filter(d => d.etat === 'areparer' || d.etat === 'devis').length;
}


/* ============================================================
   L'ÉCRAN — la liste des véhicules
   ============================================================ */
async function afficherCarrosserie(){
  const zone = $('carrosserieZone');
  if(!zone) return;

  zone.innerHTML = '<div style="color:var(--muted);font-size:13px;">Chargement…</div>';
  try{
    await chargerCarrosserie(true);
  }catch(e){
    zone.innerHTML = '<div style="color:var(--warn-text);font-size:13px;">' +
      'Impossible de lire la flotte : ' + String(e.message).replace(/</g, '&lt;') +
      '</div>';
    return;
  }

  zone.innerHTML = '';

  const actifs = vehiculesCarrosserie.filter(v => v.etat !== 'vendu');
  if(!actifs.length){
    zone.innerHTML = '<div style="color:var(--muted);font-size:13px;line-height:1.6;">' +
      'Aucun véhicule dans la flotte. Ils s\'ajoutent dans 🚗 Suivi de la flotte, ' +
      'et leur carrosserie apparaît ici aussitôt.</div>';
    return;
  }

  actifs.forEach(v => zone.appendChild(carteVehiculeCarrosserie(v)));
}

function carteVehiculeCarrosserie(v){
  const c = document.createElement('div');
  c.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:12px 14px;' +
    'margin-bottom:10px;cursor:pointer;display:flex;gap:12px;align-items:center;';

  const g = gabaritDuVehicule(v);
  const n = aReparerSur(v.id);

  const vignette = document.createElement('div');
  vignette.style.cssText = 'width:66px;flex-shrink:0;opacity:.85;';
  vignette.innerHTML = svgVue(g.vues[0].dessin);
  c.appendChild(vignette);

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;line-height:1.5;';
  t.innerHTML =
    '<div style="font-weight:700;font-size:15px;">' +
      String(v.nom || '').replace(/</g, '&lt;') + '</div>' +
    '<div style="font-size:12px;color:var(--muted);">' +
      String(v.modele || g.nom).replace(/</g, '&lt;') +
      (v.immat ? ' · ' + String(v.immat).replace(/</g, '&lt;') : '') + '</div>' +
    '<div style="font-size:12.5px;margin-top:3px;color:' +
      (n ? 'var(--warn-text)' : 'var(--muted)') + ';">' +
      (n ? '🩹 ' + n + ' à réparer' : '✅ rien à réparer') + '</div>';
  c.appendChild(t);

  c.addEventListener('click', () => ouvrirCarrosserie(v));
  return c;
}


/* ============================================================
   LE DESSIN D'UN VÉHICULE, ET SES POINTS
   ============================================================ */
function ouvrirCarrosserie(v){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(620px, 96vw);max-height:92vh;overflow-y:auto;';

  const dessiner = () => {
    boite.innerHTML = '';
    boite.appendChild(corpsCarrosserie(v, fond, dessiner));
  };
  dessiner();

  fond.appendChild(boite);
  document.body.appendChild(fond);
}

function corpsCarrosserie(v, fond, redessiner){
  const z = document.createElement('div');
  const g = gabaritDuVehicule(v);

  const h = document.createElement('h3');
  h.innerHTML = '🩹 ' + String(v.nom || '').replace(/</g, '&lt;') +
    ' <span style="font-weight:400;font-size:13px;color:var(--muted);">— ' +
    String(v.modele || g.nom).replace(/</g, '&lt;') + '</span>';
  z.appendChild(h);

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;' +
    'margin-bottom:12px;';
  aide.textContent = 'Touche l\'endroit du dommage sur la vue qui convient. ' +
    'Touche un point existant pour le relire ou noter sa réparation.';
  z.appendChild(aide);

  /* Les vues, en grille */
  const grille = document.createElement('div');
  grille.style.cssText = 'display:grid;gap:10px;' +
    'grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px;';

  const liste = dommagesDe(v.id);

  g.vues.forEach(vue => {
    const bloc = document.createElement('div');
    bloc.style.cssText = 'background:var(--fond-2, rgba(0,0,0,.25));' +
      'border:1px solid var(--line);border-radius:10px;padding:8px;';

    const titre = document.createElement('div');
    titre.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:4px;' +
      'text-transform:uppercase;letter-spacing:.3px;';
    titre.textContent = vue.nom;
    bloc.appendChild(titre);

    const dessus = liste.filter(d => d.vue === vue.cle);

    const enveloppe = document.createElement('div');
    enveloppe.style.cssText = 'position:relative;cursor:crosshair;';
    enveloppe.innerHTML = svgVue(
      vue.dessin +
      dessus.map((d, i) =>
        '<circle cx="' + Number(d.x) + '" cy="' + Number(d.y) + '" r="4.6" ' +
          'fill="' + couleurDuDommage(d) + '" stroke="#0D141C" stroke-width="1.4" ' +
          'data-dommage="' + String(d.id).replace(/"/g, '') + '" ' +
          'style="cursor:pointer;"/>' +
        '<text x="' + Number(d.x) + '" y="' + (Number(d.y) + 1.9) + '" ' +
          'font-size="5" font-weight="700" fill="#0D141C" text-anchor="middle" ' +
          'pointer-events="none">' + (i + 1) + '</text>').join(''));

    const svg = enveloppe.querySelector('svg');
    svg.addEventListener('click', ev => {
      /* Un point existant : on l'ouvre. Sinon on en pose un. */
      const cible = ev.target && ev.target.getAttribute
        ? ev.target.getAttribute('data-dommage') : '';
      if(cible){
        const d = liste.find(x => String(x.id) === String(cible));
        if(d){ ouvrirDommage(v, d, fond, redessiner); return; }
      }
      const r = svg.getBoundingClientRect();
      if(!r.width || !r.height) return;
      const x = Math.round(((ev.clientX - r.left) / r.width) * 1000) / 10;
      const y = Math.round(((ev.clientY - r.top) / r.height) * 1000) / 10;
      ouvrirDommage(v, { vue: vue.cle, x: x, y: y }, fond, redessiner);
    });

    bloc.appendChild(enveloppe);
    grille.appendChild(bloc);
  });
  z.appendChild(grille);

  /* La liste, sous le dessin */
  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
    'border-top:1px solid var(--line);padding-top:12px;margin-bottom:8px;';
  t.textContent = liste.length
    ? '📋 ' + liste.length + ' dommage(s) relevé(s)'
    : '📋 Rien de relevé sur ce véhicule';
  z.appendChild(t);

  /* Du plus récent au plus ancien : c'est le dernier choc qui
     intéresse, pas celui d'il y a deux ans. */
  const parDate = liste.slice().sort((a, b) =>
    String(b.constateLe || '').localeCompare(String(a.constateLe || '')));

  parDate.forEach(d => {
    const ty = typeDommage(d.type);
    const et = etatDommage(d.etat);
    const vue = (g.vues.find(x => x.cle === d.vue) || {}).nom || d.vue;

    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:8px 0;' +
      'border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;cursor:pointer;';
    l.innerHTML =
      '<span style="flex-shrink:0;">' + ty.emoji + '</span>' +
      '<span style="flex:1;min-width:0;line-height:1.45;">' +
        '<strong>' + ty.nom + '</strong> — ' + String(vue).replace(/</g, '&lt;') +
        (d.detail ? '<div style="color:var(--cream);font-size:12.5px;">' +
          String(d.detail).replace(/</g, '&lt;') + '</div>' : '') +
        '<div style="font-size:11px;color:var(--muted);">' +
          (d.constateLe
            ? ((typeof dateEnToutesLettres === 'function')
                ? dateEnToutesLettres(d.constateLe) : d.constateLe)
            : '') +
          (d.par ? ' · ' + String(d.par).replace(/</g, '&lt;') : '') +
          (d.cout ? ' · ' + String(d.cout).replace(/</g, '&lt;') + ' €' : '') +
        '</div>' +
      '</span>' +
      '<span style="flex-shrink:0;font-size:11px;color:' + et.couleur + ';">' +
        et.nom + '</span>';
    l.addEventListener('click', () => ouvrirDommage(v, d, fond, redessiner));
    z.appendChild(l);
  });

  /* Les boutons du bas */
  const r = document.createElement('div');
  r.className = 'btn-row';
  r.style.marginTop = '16px';

  const bImp = document.createElement('button');
  bImp.className = 'btn btn-secondary';
  bImp.textContent = '🖨️ État des lieux';
  bImp.addEventListener('click', () => imprimerEtatDesLieux(v));
  r.appendChild(bImp);

  const bF = document.createElement('button');
  bF.className = 'btn btn-primary';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bF);

  z.appendChild(r);
  return z;
}


/* ============================================================
   LA FICHE D'UN DOMMAGE
   ============================================================ */
function ouvrirDommage(v, d, fondParent, redessiner){
  const nouveau = !d.id;
  const g = gabaritDuVehicule(v);
  const vue = (g.vues.find(x => x.cle === d.vue) || {}).nom || d.vue;

  /* Le coût et le garage n'appartiennent pas au moniteur qui
     constate : c'est le bureau qui fait réparer. On ne les cache pas
     par méfiance — on les cache parce qu'un moniteur qui ne les
     connaît pas les laisserait vides, et un blanc se lit « pas de
     coût », ce qui est faux. */
  const bureau = (typeof aDroit === 'function') ? aDroit('flotte') : true;

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  fond.style.zIndex = '10000';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(460px, 94vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML =
    '<h3>' + (nouveau ? '🩹 Nouveau dommage' : '🩹 Dommage') +
      ' <span style="font-weight:400;font-size:13px;color:var(--muted);">— ' +
      String(vue).replace(/</g, '&lt;') + '</span></h3>' +

    '<label for="dType">Ce que c\'est</label>' +
    '<select id="dType">' +
      TYPES_DOMMAGE.map(t => '<option value="' + t.cle + '">' + t.emoji + ' ' +
        t.nom + '</option>').join('') +
    '</select>' +

    '<label for="dGrav">Gravité</label>' +
    '<select id="dGrav">' +
      GRAVITES.map(x => '<option value="' + x.cle + '">' + x.nom +
        '</option>').join('') +
    '</select>' +

    '<div class="duo">' +
      '<div><label for="dDate">Constaté le</label>' +
        '<input type="date" id="dDate"></div>' +
      '<div><label for="dPar">Par</label>' +
        '<input type="text" id="dPar" placeholder="Qui l\'a vu"></div>' +
    '</div>' +

    '<label for="dDetail">Détail</label>' +
    '<input type="text" id="dDetail" ' +
      'placeholder="Ex : portière arrière, sur toute la longueur">' +

    '<label for="dEtat">Où en est-on</label>' +
    '<select id="dEtat">' +
      ETATS_DOMMAGE.map(x => '<option value="' + x.cle + '">' + x.nom +
        '</option>').join('') +
    '</select>' +

    (bureau
      ? '<div id="dRepBloc" style="display:none;">' +
          '<div class="duo">' +
            '<div><label for="dRepLe">Réparé le</label>' +
              '<input type="date" id="dRepLe"></div>' +
            '<div><label for="dCout">Coût</label>' +
              '<input type="text" id="dCout" inputmode="decimal" placeholder="€">' +
            '</div>' +
          '</div>' +
          '<label for="dGarage">Garage</label>' +
          '<input type="text" id="dGarage" placeholder="Facultatif">' +
        '</div>'
      : '') +

    '<label style="margin-top:4px;">Photo <span style="text-transform:none;' +
      'color:var(--muted);font-weight:400;">— facultative, très réduite</span></label>' +
    '<input type="file" id="dPhoto" accept="image/*" style="font-size:13px;">' +
    '<div id="dApercu" style="margin:8px 0;"></div>' +
    '<div id="dPoids" style="font-size:11px;color:var(--muted);line-height:1.5;' +
      'margin-bottom:8px;"></div>';

  const q = s => boite.querySelector(s);

  q('#dType').value = d.type || 'rayure';
  q('#dGrav').value = d.gravite || 'legere';
  q('#dDate').value = d.constateLe ||
    ((typeof todayLocal === 'function') ? todayLocal() : '');
  q('#dPar').value = d.par || ((typeof ACCES !== 'undefined' && ACCES.moniteur)
    ? ACCES.moniteur : '');
  q('#dDetail').value = d.detail || '';
  q('#dEtat').value = d.etat || 'areparer';

  if(bureau){
    q('#dRepLe').value = d.repareLe || '';
    q('#dCout').value = d.cout || '';
    q('#dGarage').value = d.garage || '';
    const majRep = () => {
      q('#dRepBloc').style.display = (q('#dEtat').value === 'repare') ? 'block' : 'none';
    };
    q('#dEtat').addEventListener('change', majRep);
    majRep();
  }

  /* La photo, réduite jusqu'à tenir dans une case du classeur. */
  let photo = '';
  const apercu = q('#dApercu');
  const poids = q('#dPoids');

  const montrer = () => {
    apercu.innerHTML = '';
    if(!photo){ poids.textContent = ''; return; }
    const img = document.createElement('img');
    img.src = photo;
    img.style.cssText = 'max-width:100%;border-radius:8px;border:1px solid var(--line);';
    apercu.appendChild(img);
    poids.textContent = 'Photo réduite à ' +
      Math.round(photo.length / 1024) + ' Ko — assez pour reconnaître le dommage.';
  };

  q('#dPhoto').addEventListener('change', ev => {
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    poids.textContent = 'Réduction…';
    photoReduite(f).then(data => {
      if(!data){
        poids.textContent = '⚠️ Cette photo n\'a pas pu être réduite assez. ' +
          'Le dessin et le texte suffiront.';
        return;
      }
      photo = data;
      montrer();
    });
  });

  /* Une photo déjà enregistrée ne voyage pas avec la liste : elle
     pèse trop, et on ne la regarde qu'en ouvrant la fiche. */
  if(d.id && d.aPhoto){
    poids.textContent = 'Photo enregistrée — chargement…';
    appelPrep({ action: 'dommagePhoto', id: d.id })
      .then(r => { photo = (r && r.photo) || ''; montrer(); })
      .catch(() => { poids.textContent = 'La photo n\'a pas pu être relue.'; });
  }

  const r = document.createElement('div');
  r.className = 'btn-row';
  r.style.marginTop = '14px';

  if(!nouveau){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.color = 'var(--red)';
    bSup.textContent = '🗑️';
    bSup.title = 'Supprimer ce dommage';
    bSup.addEventListener('click', async () => {
      if(bSup.disabled) return;
      const ok = (typeof confirmer === 'function')
        ? await confirmer('Il disparaîtra du dessin et de la liste. ' +
            'Un dommage réparé se marque « réparé » — il ne se supprime pas.',
            'Supprimer ce dommage ?', true)
        : true;
      if(!ok) return;
      bSup.disabled = true;
      try{
        await appelPrep({ action: 'dommageDelete', id: d.id });
        dommagesFlotte = dommagesFlotte.filter(x => String(x.id) !== String(d.id));
        fermerFond(fond);
        if(typeof redessiner === 'function') redessiner();
        showToast('Supprimé ✅');
      }catch(e){
        showToast('Impossible : ' + e.message);
        bSup.disabled = false;
      }
    });
    r.appendChild(bSup);
  }

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bAnn);

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = nouveau ? '➕ Enregistrer' : '💾 Enregistrer';
  bOk.addEventListener('click', async () => {
    /* ⚠️ Le verrou AVANT l'attente réseau, comme partout ailleurs :
       un second appui pendant l'enregistrement créerait un second
       dommage au même endroit. */
    if(bOk.disabled) return;
    bOk.disabled = true;
    bAnn.disabled = true;
    const libelle = bOk.textContent;
    bOk.textContent = 'Enregistrement…';

    const envoi = {
      action: 'dommageSet',
      id: d.id || '',
      idVehicule: v.id,
      vue: d.vue,
      x: d.x, y: d.y,
      type: q('#dType').value,
      gravite: q('#dGrav').value,
      constateLe: q('#dDate').value,
      par: q('#dPar').value.trim(),
      detail: q('#dDetail').value.trim(),
      etat: q('#dEtat').value,
      photo: photo
    };
    if(bureau){
      envoi.repareLe = q('#dRepLe').value;
      envoi.cout = q('#dCout').value.trim();
      envoi.garage = q('#dGarage').value.trim();
    }

    try{
      const rep = await appelPrep(envoi);
      const id = (rep && rep.id) || d.id;
      const enregistre = Object.assign({}, d, envoi, {
        id: id, aPhoto: !!photo });
      delete enregistre.action;
      delete enregistre.photo;

      const i = dommagesFlotte.findIndex(x => String(x.id) === String(id));
      if(i >= 0) dommagesFlotte[i] = enregistre;
      else dommagesFlotte.push(enregistre);

      fermerFond(fond);
      if(typeof redessiner === 'function') redessiner();
      showToast('Enregistré ✅');
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
      bAnn.disabled = false;
      bOk.textContent = libelle;
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* ============================================================
   LA PHOTO, RÉDUITE JUSQU'À TENIR

   ⚠️ UNE CASE DE GOOGLE SHEETS S'ARRÊTE À 50 000 CARACTÈRES.

   Une photo de téléphone en fait plusieurs millions, et même
   réduite à 1200 pixels elle en fait encore quatre fois trop. Une
   photo trop grande ne fait pas une erreur : elle fait une case
   tronquée, donc une image illisible, et personne ne s'en aperçoit
   avant d'en avoir besoin.

   On réduit donc TANT QU'IL LE FAUT, et on renonce plutôt que
   d'enregistrer une image coupée. Le dessin, lui, dit déjà où est
   le dommage : la photo n'est qu'un souvenir de son allure.
   ============================================================ */
const PLAFOND_PHOTO = 45000;   /* marge sous les 50 000 de Sheets */

function photoReduite(fichier){
  return new Promise(resolve => {
    if(!fichier || !/^image\//.test(fichier.type)){ resolve(''); return; }

    const lect = new FileReader();
    lect.onerror = () => resolve('');
    lect.onload = () => {
      const img = new Image();
      img.onerror = () => resolve('');
      img.onload = () => {
        /* On descend par paliers : la taille d'abord, la qualité
           ensuite. Une image un peu floue reste reconnaissable ;
           une image tronquée, non. */
        const paliers = [
          [640, 0.62], [520, 0.55], [440, 0.5],
          [360, 0.45], [280, 0.4], [220, 0.35]
        ];
        for(const [max, qualite] of paliers){
          const ech = Math.min(1, max / Math.max(img.width, img.height));
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(img.width * ech));
          cv.height = Math.max(1, Math.round(img.height * ech));
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          const data = cv.toDataURL('image/jpeg', qualite);
          if(data.length <= PLAFOND_PHOTO){ resolve(data); return; }
        }
        resolve('');   /* on renonce plutôt que d'enregistrer un morceau */
      };
      img.src = lect.result;
    };
    lect.readAsDataURL(fichier);
  });
}


/* ============================================================
   L'ÉTAT DES LIEUX, À IMPRIMER

   La photo du véhicule à une date donnée : le dessin, les points, et
   la liste. C'est ce qu'on joint à une reprise, à une revente, ou à
   un désaccord avec un élève.
   ============================================================ */
function imprimerEtatDesLieux(v){
  const g = gabaritDuVehicule(v);
  const liste = dommagesDe(v.id);
  const jour = (typeof todayLocal === 'function') ? todayLocal() : '';
  const jourLettres = (typeof dateEnToutesLettres === 'function')
    ? (dateEnToutesLettres(jour) || jour) : jour;

  const echap = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const vues = g.vues.map(vue => {
    const dessus = liste.filter(d => d.vue === vue.cle);
    return '<div class="vue"><h4>' + echap(vue.nom) + '</h4>' +
      '<svg viewBox="0 0 100 100">' + vue.dessin +
      dessus.map((d, i) =>
        '<circle cx="' + Number(d.x) + '" cy="' + Number(d.y) + '" r="4.6" ' +
          'fill="' + couleurDuDommage(d) + '" stroke="#111" stroke-width="1.2"/>' +
        '<text x="' + Number(d.x) + '" y="' + (Number(d.y) + 1.9) + '" ' +
          'font-size="5" font-weight="700" fill="#111" text-anchor="middle">' +
          (i + 1) + '</text>').join('') +
      '</svg></div>';
  }).join('');

  const lignes = liste.length
    ? liste.map(d => {
        const ty = typeDommage(d.type);
        const et = etatDommage(d.etat);
        const nomVue = (g.vues.find(x => x.cle === d.vue) || {}).nom || d.vue;
        return '<tr><td>' + echap(ty.nom) + '</td><td>' + echap(nomVue) + '</td>' +
          '<td>' + echap(d.detail) + '</td>' +
          '<td>' + echap(d.constateLe
            ? ((typeof dateEnToutesLettres === 'function')
                ? dateEnToutesLettres(d.constateLe) : d.constateLe) : '') + '</td>' +
          '<td>' + echap(et.nom) +
            (d.repareLe ? ' le ' + echap(d.repareLe) : '') + '</td></tr>';
      }).join('')
    : '<tr><td colspan="5">Aucun dommage relevé.</td></tr>';

  const html =
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
    '<title>État des lieux — ' + echap(v.nom) + '</title><style>' +
    'body{font:14px/1.6 system-ui,-apple-system,sans-serif;margin:24px;color:#111}' +
    'h1{font-size:20px;margin:0 0 4px}' +
    '.sous{color:#666;font-size:13px;margin:0 0 18px}' +
    '.vues{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:18px}' +
    '.vue{width:170px;border:1px solid #ccc;border-radius:8px;padding:8px}' +
    '.vue h4{margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase}' +
    'svg{width:100%;height:auto;display:block;background:#f7f7f7;border-radius:4px}' +
    'table{width:100%;border-collapse:collapse;font-size:13px}' +
    'th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd}' +
    'th{background:#f2f2f2;font-size:11px;text-transform:uppercase;color:#555}' +
    '@media print{button{display:none}}' +
    '</style></head><body>' +
    '<h1>État des lieux — ' + echap(v.nom) + '</h1>' +
    '<p class="sous">' + echap(v.modele || g.nom) +
      (v.immat ? ' · ' + echap(v.immat) : '') +
      ' · au ' + echap(jourLettres) + ' · Évolution Conduites</p>' +
    '<p><button onclick="window.print()">🖨️ Imprimer / enregistrer en PDF</button></p>' +
    '<div class="vues">' + vues + '</div>' +
    '<table><tr><th>Type</th><th>Où</th><th>Détail</th><th>Constaté</th>' +
    '<th>État</th></tr>' + lignes + '</table>' +
    '</body></html>';

  const f = window.open('', '_blank');
  if(!f){ showToast('Autorise les fenêtres pour imprimer.'); return; }
  f.document.write(html);
  f.document.close();
}


window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-carrosserie.js'] = true;
