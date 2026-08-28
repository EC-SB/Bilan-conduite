/* Déployé le 28/08/2026 à 16:13 — v667 */
/* ============================================================
   ec-segments.js
   Ce qu'un SMS coûte vraiment.

   Un opérateur ne facture pas au message mais au SEGMENT :
   160 caractères en alphabet standard (GSM-7), et seulement 70
   dès qu'un seul caractère en sort. Un emoji, une lettre en faux
   gras, un « À » majuscule suffisent à faire basculer tout le
   message — et à doubler la facture.

   L'application comptait des caractères et annonçait « 1 SMS »
   pour un message facturé huit fois. Ce module compte comme
   l'opérateur, et il est la SEULE source du calcul : le compteur
   de l'écran, le simulateur et le journal lisent tous ici.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* L'alphabet GSM-7, dans l'ordre de la norme. Tout ce qui n'y est
   pas fait basculer le message entier en Unicode. */
const GSM7 = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
             '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

/* Ceux-là passent, mais comptent double */
const GSM7_ETENDU = '^{}\\[~]|€';

/* Les pièges du français : présents partout, absents de GSM-7.
   On les nomme pour pouvoir les signaler un par un — dire
   « ton message est en Unicode » n'aide personne à le corriger. */
const REMPLACEMENTS = {
  'ç': 'c', 'Ç': 'Ç', 'ê': 'e', 'Ê': 'E', 'î': 'i', 'Î': 'I',
  'ô': 'o', 'Ô': 'O', 'û': 'u', 'Û': 'U', 'â': 'a', 'Â': 'A',
  'ë': 'e', 'ï': 'i', 'À': 'A', 'È': 'E', 'Ù': 'U', 'Œ': 'OE',
  'œ': 'oe', '«': '"', '»': '"', '’': "'", '‘': "'",
  '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', ' ': ' ',
  /* Les exposants : « 1ᵉʳ cours » fait basculer tout le message
     pour deux caractères que personne ne remarque. */
  'ᵉ': 'e', 'ʳ': 'r', 'ᵈ': 'd', 'ᵗ': 't', 'ˢ': 's', 'ⁿ': 'n',
  'ᵃ': 'a', 'ᵒ': 'o', 'º': 'o', 'ª': 'a',
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '½': '1/2', '¼': '1/4', '¾': '3/4', '°': ' degres', '•': '-'
};

/* Prix chez Allo, en dollars par segment (France).
   Réglable : la grille de l'opérateur peut changer. */
const PRIX_SEGMENT_USD = 0.06;
const TAUX_USD_EUR = 1 / 1.1647;

function prixSegmentEuro(){
  const r = (typeof reglagesRapides === 'function' && reglagesRapides()) || {};
  const p = parseFloat(String(r.prixSegmentUsd || '').replace(',', '.'));
  return (isFinite(p) && p > 0 ? p : PRIX_SEGMENT_USD) * TAUX_USD_EUR;
}

/* ------------------------------------------------------------
   L'ANALYSE

   Rend : alphabet, unités facturées, segments, et la liste des
   caractères fautifs avec leur position — c'est elle qui permet
   de dire « c'est le À de la ligne 3 ».
   ------------------------------------------------------------ */
function analyserSms(texte){
  const t = String(texte === undefined || texte === null ? '' : texte);

  let unites = 0;
  const fautifs = [];

  /* On parcourt par point de code : un emoji est un seul
     caractère pour l'œil, deux unités pour l'opérateur. */
  let position = 0;
  for(const ch of t){
    if(GSM7.indexOf(ch) !== -1) unites += 1;
    else if(GSM7_ETENDU.indexOf(ch) !== -1) unites += 2;
    else fautifs.push({ car: ch, position: position,
                        remplacement: REMPLACEMENTS[ch] || '' });
    position += ch.length;
  }

  const gsm = !fautifs.length;
  if(!gsm) unites = t.length;      /* en Unicode on compte en unités UTF-16 */

  const seul  = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  const segments = !unites ? 0
                 : (unites <= seul ? 1 : Math.ceil(unites / multi));

  return {
    alphabet: gsm ? 'GSM-7' : 'Unicode',
    gsm: gsm,
    caracteres: [...t].length,     /* ce que la personne voit */
    unites: unites,                /* ce que l'opérateur compte */
    segments: segments,
    fautifs: fautifs,
    /* Ce qu'il resterait avant de payer un segment de plus */
    marge: (segments <= 1 ? seul : segments * multi) - unites,
    prix: segments * prixSegmentEuro()
  };
}

/* Les caractères fautifs, regroupés et comptés : un « À » présent
   douze fois se signale une fois. */
function fautifsResumes(analyse){
  const vus = {};
  ((analyse && analyse.fautifs) || []).forEach(f => {
    if(!vus[f.car]) vus[f.car] = { car: f.car, combien: 0,
                                   remplacement: f.remplacement };
    vus[f.car].combien++;
  });
  return Object.keys(vus).map(k => vus[k])
    .sort((a, b) => b.combien - a.combien);
}

/* ------------------------------------------------------------
   NETTOYER

   Remplace ce qui coûte cher par son équivalent sans surcoût.
   Les accents qui passent en GSM-7 — é è à ù É Ç — ne sont PAS
   touchés : on ne dégrade le français que là où c'est facturé.
   ------------------------------------------------------------ */

/* Les lettres « mathématiques » (faux gras, faux italique) sont des
   copies décoratives de l'alphabet, rangées par blocs de 26. Plutôt
   que de tenir une table de 400 lignes, on retrouve la lettre
   d'origine par calcul. */
const BLOCS_MATH = [
  [0x1D400, 'A'], [0x1D41A, 'a'], [0x1D434, 'A'], [0x1D44E, 'a'],
  [0x1D468, 'A'], [0x1D482, 'a'], [0x1D49C, 'A'], [0x1D4B6, 'a'],
  [0x1D4D0, 'A'], [0x1D4EA, 'a'], [0x1D504, 'A'], [0x1D51E, 'a'],
  [0x1D538, 'A'], [0x1D552, 'a'], [0x1D56C, 'A'], [0x1D586, 'a'],
  [0x1D5A0, 'A'], [0x1D5BA, 'a'], [0x1D5D4, 'A'], [0x1D5EE, 'a'],
  [0x1D608, 'A'], [0x1D622, 'a'], [0x1D63C, 'A'], [0x1D656, 'a'],
  [0x1D670, 'A'], [0x1D68A, 'a']
];

function lettreOrdinaire(ch){
  const c = ch.codePointAt(0);
  for(let i = 0; i < BLOCS_MATH.length; i++){
    const [debut, base] = BLOCS_MATH[i];
    if(c >= debut && c < debut + 26){
      return String.fromCharCode(base.charCodeAt(0) + (c - debut));
    }
  }
  /* Les chiffres décoratifs, sur le même principe */
  if(c >= 0x1D7CE && c <= 0x1D7FF) return String((c - 0x1D7CE) % 10);
  return '';
}

function nettoyerSms(texte){
  let t = String(texte || '');

  /* Le faux gras redevient de vraies lettres */
  t = [...t].map(ch => lettreOrdinaire(ch) || ch).join('');

  /* Les accents combinants laissés par le faux gras : « e » + ́
     s'écrit « é », qui lui passe en GSM-7. */
  t = t.normalize('NFC');

  /* Emoji et symboles : ils partent, avec l'espace qui les
     précédait pour ne pas laisser de trou. */
  t = t.replace(/\s?[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2069}\u{2066}-\u{2068}]/gu, '');

  /* Les caractères français absents de GSM-7 */
  Object.keys(REMPLACEMENTS).forEach(k => {
    if(GSM7.indexOf(k) === -1) t = t.split(k).join(REMPLACEMENTS[k]);
  });

  /* Le ménage a pu laisser des espaces doubles */
  return t.replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').trim();
}

/* ------------------------------------------------------------
   LE COÛT, SUR UN MOIS ET SUR UN AN
   ------------------------------------------------------------ */
function coutPeriode(segmentsParEnvoi, envoisParJour, joursParSemaine){
  const parSemaine = (envoisParJour || 0) * (joursParSemaine || 0);
  const parMois = parSemaine * 52 / 12;
  const seg = parMois * (segmentsParEnvoi || 0);
  const prix = prixSegmentEuro();
  return {
    envoisMois: Math.round(parMois),
    segmentsMois: Math.round(seg),
    euroMois: seg * prix,
    euroAn: seg * prix * 12
  };
}

function euro(n){
  return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' €';
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-segments.js'] = true;
