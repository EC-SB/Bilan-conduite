/* Déployé le 12/09/2026 à 13:38 — v975 */
/* ============================================================
   ec-nouveautes.js
   Ce que l'outil vient de changer, dit à ceux qui s'en servent.

   David, le 12 septembre 2026 : il voulait annoncer cinq
   nouveautés — le bouton CB, la refonte de l'onglet Cours, le trait
   de couleur, le rail, les examens — dans un message épinglé. Le
   message est plafonné à quatre cents caractères, et lever le
   plafond ne réglait rien : le cadre d'un message important écrit
   en 20 px gras sur fond rouge, et mille caractères là-dedans font
   un pavé que personne ne lit jusqu'au bout.

   ⚠️ UN MESSAGE ET UNE NOTE DE VERSION NE SONT PAS LA MÊME CHOSE.

   Un message, c'est David qui parle à l'équipe — « pensez à rendre
   les clés du 208 ». Il dit UNE chose, il attend parfois une
   réponse, et il vit dans le classeur parce qu'il est écrit à la
   main. Une note de version, c'est l'OUTIL qui dit ce qu'il vient
   de changer : elle en dit cinq, elle n'attend rien de personne, et
   elle décrit une version précise.

   Deux objets, deux endroits. Le message épinglé ne bouge pas, son
   plafond non plus — il est juste, pour ce qu'un message doit être.

   ⚠️ ET LES NOTES VIVENT DANS LE CODE, PAS DANS LE CLASSEUR.

   Une note décrit ce qu'une version fait : elle voyage donc AVEC
   elle. Rien à écrire à la main, rien à administrer, aucune feuille
   ni colonne de plus — et surtout aucun écart possible entre ce qui
   est annoncé et ce qui a changé. Mettre l'outil à jour, c'est
   publier la note.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   LES NOTES — LA PLUS RÉCENTE EN PREMIER

   Une entrée par version QUI A QUELQUE CHOSE À DIRE AUX MONITEURS.
   On livre parfois trois fois dans la journée : une note par
   livraison ferait du bandeau un décor, et c'est exactement ce
   qu'on veut éviter.

   · version — le numéro, et il ne sert qu'à savoir si elle a été
     lue. Il n'est jamais montré : « v974 » ne dit rien à personne.
   · date    — en toutes lettres, c'est le sous-titre de l'écran.
   · resume  — une ligne, c'est le sous-titre de la ligne du bandeau.
   · quoi    — les changements, un par un : un emoji, ce que c'est,
     et comment ça se comporte.
   ============================================================ */
const NOUVEAUTES = [
  {
    version: 974,
    date: 'Vendredi 12 septembre 2026',
    resume: 'Le bouton CB, l’onglet Cours, les examens',
    quoi: [
      { emoji: '💳',
        titre: 'Le bouton CB, à côté de la loupe',
        texte: 'Il dit qui a la carte gasoil : gris au bureau, doré quand ' +
               'c’est toi, rouge dès qu’elle est dehors — avec l’initiale ' +
               'de chaque carte. On la prend, on la passe à quelqu’un, on ' +
               'la repose en indiquant le véhicule du plein. Dès le ' +
               'lendemain, elle est en retard et te le dit.' },
      { emoji: '🎨',
        titre: 'Le trait de couleur à côté de l’heure',
        texte: 'Il dit la boîte du cours : vert pour une manuelle, magenta ' +
               'pour une automatique. Le simulateur et l’examen blanc ont ' +
               'les leurs.' },
      { emoji: '📱',
        titre: 'L’onglet Cours refait',
        texte: 'Sur téléphone, le cours du moment est seul en haut — ' +
               '« dans 10 min », « en cours » — et tout le reste de la ' +
               'journée tient dans un tiroir qu’on déplie. Sur tablette, ' +
               'les vues passent dans un rail à gauche, qui se replie en ' +
               'icônes pour rendre la place à la carte.' },
      { emoji: '🏁',
        titre: 'Examen blanc et examen officiel',
        texte: 'MANŒUVRE et AUTONOMIE s’ajoutent sous les vérifications, ' +
               'avec les boutons 💀 et ⚠️ ; l’autonomie retire des points ' +
               'par demi-crans. Installation, passager et voyants donnent ' +
               'la note sur 2. Et avant de générer, le texte de la partie 4 ' +
               's’affiche : tu peux le corriger.' }
    ]
  }
];

/* ⚠️ LA MARQUE DE LECTURE VIT DANS LE NAVIGATEUR — comme les
   réglages du bandeau, qui sont déjà là. Chacun lit pour lui, sans
   toucher à celui des autres, et il n'y a rien à administrer.

   Le revers est assumé, et c'est le même qu'aujourd'hui : un
   téléphone neuf, ou un navigateur nettoyé, reverra la dernière
   note une fois. C'est le prix de ne rien avoir à gérer — et relire
   une note n'a jamais fait de mal à personne. */
const CLE_NOUVEAUTES_LUES = 'nouveautes_lues';

function derniereNouveaute(){
  return NOUVEAUTES.length ? NOUVEAUTES[0] : null;
}

function versionNouveauteLue(){
  try{
    return parseInt(localStorage.getItem(CLE_NOUVEAUTES_LUES), 10) || 0;
  }catch(e){ return 0; }
}

function marquerNouveautesLues(){
  const d = derniereNouveaute();
  if(!d) return;
  try{ localStorage.setItem(CLE_NOUVEAUTES_LUES, String(d.version)); }
  catch(e){ /* navigation privée : elle se remontrera, tant pis */ }
}

/* Y a-t-il quelque chose à annoncer ? Rien en mémoire vaut « jamais
   lu » : un appareil neuf ne doit pas rater la note en cours. */
function aDesNouveautesNonLues(){
  const d = derniereNouveaute();
  return !!d && versionNouveauteLue() < d.version;
}


/* ============================================================
   LA LIGNE DU BANDEAU

   Elle se range dans la table des familles comme les autres — voir
   FAMILLES_BANDEAU dans ec-bandeau.js — et disparaît dès qu'elle
   est lue. Le bandeau existe pour qu'on voie SANS CHERCHER : une
   ligne qui reste après lecture devient un décor, et c'est tout le
   bandeau qu'on cesse de lire.
   ============================================================ */
function lignesNouveautes(){
  if(!aDesNouveautesNonLues()) return [];

  const d = derniereNouveaute();
  const n = (d.quoi || []).length;

  return [{
    id: 'nouveautes:' + d.version,
    famille: 'nouveautes',
    emoji: '🆕',
    texte: 'Du nouveau dans l’outil — ' + n + ' changement' +
           (n > 1 ? 's' : ''),
    sous: d.resume || '',
    urgente: false,
    action: ouvrirNouveautes,
    actionTexte: 'Lire'
  }];
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */
function ouvrirNouveautes(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';

  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 96vw);max-height:92vh;' +
    'overflow-y:auto;';

  const d = derniereNouveaute();
  if(!d){
    boite.innerHTML = '<div class="empty">Rien à raconter pour le moment.</div>';
  }else{
    boite.appendChild(blocNouveaute(d));
    const avant = NOUVEAUTES.slice(1);
    if(avant.length) boite.appendChild(voletNouveautesPrecedentes(avant));
  }

  const pied = document.createElement('div');
  pied.className = 'nvPied';

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.textContent = '✅ J’ai lu';
  b.addEventListener('click', () => {
    /* ⚠️ ON MARQUE, PUIS ON FERME, PUIS ON REDESSINE. Fermer d'abord
       et marquer ensuite, c'est laisser la ligne revenir au premier
       redessin — et donner l'impression que le bouton n'a rien
       fait. */
    marquerNouveautesLues();
    fermerFond(fond);
    if(typeof dessinerBandeau === 'function') dessinerBandeau();
  });
  pied.appendChild(b);
  boite.appendChild(pied);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  /* Fermer sans lire ne marque rien : on n'a pas dit qu'on avait lu. */
  fond.addEventListener('click', e => { if(e.target === fond) fermerFond(fond); });
  fond.addEventListener('keydown', e => {
    if(e.key === 'Escape') fermerFond(fond);
  });
}

function blocNouveaute(n){
  const z = document.createElement('div');

  const t = document.createElement('div');
  t.className = 'nvTitre';
  t.textContent = '🆕 Du nouveau dans l’outil';
  z.appendChild(t);

  const dt = document.createElement('div');
  dt.className = 'nvDate';
  dt.textContent = n.date || '';
  z.appendChild(dt);

  (n.quoi || []).forEach(c => {
    const l = document.createElement('div');
    l.className = 'nvItem';

    const e = document.createElement('div');
    e.className = 'em';
    e.textContent = c.emoji || '•';
    l.appendChild(e);

    const corps = document.createElement('div');
    corps.className = 'corps';

    const q = document.createElement('div');
    q.className = 'quoi';
    q.textContent = c.titre || '';
    corps.appendChild(q);

    const p = document.createElement('div');
    p.className = 'comment';
    p.textContent = c.texte || '';
    corps.appendChild(p);

    l.appendChild(corps);
    z.appendChild(l);
  });

  return z;
}

/* Les précédentes, repliées : une note lue n'est pas perdue —
   quelqu'un revient de congés, ou veut relire comment marche le
   bouton CB. */
function voletNouveautesPrecedentes(liste){
  const d = document.createElement('details');
  d.className = 'volet-liste';
  d.style.marginTop = '12px';

  const s = document.createElement('summary');
  s.textContent = '📜 Les versions précédentes';
  d.appendChild(s);

  liste.forEach(n => d.appendChild(blocNouveaute(n)));
  return d;
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-nouveautes.js'] = true;
