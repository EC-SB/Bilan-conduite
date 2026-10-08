/* Déployé le 08/10/2026 à 11:20 — v1098 */
/* ============================================================
   💬 LA MESSAGERIE — étape 1a, côté école

   David, le 7 octobre 2026 : « je veux un vrai systeme de
   messagerie instantané comme messenger on s'écrit […] avec un fil
   de discussion dans lequel on peut rechercher et doit pouvoir
   s'écrire entre utilisateur de l'app et aussi créer des groupes de
   conversation avec certains élèves et certains utilisateur de
   l'app ».

   ⚠️ CETTE ÉTAPE NE PARLE PAS AUX ÉLÈVES, ET C'EST VOULU. Une
   messagerie qu'on n'a pas éprouvée entre soi ne se livre pas à
   deux cents élèves : vous vous écrivez entre vous, on corrige ce
   qui gêne, et l'espace élève vient à l'étape 1b. L'onglet 💬 de
   la fiche élève est donc déjà là, et montre les fils du dossier —
   il n'y en a simplement aucun tant que l'élève ne peut pas écrire.

   ⚠️ LES DONNÉES NE SONT PAS DANS LE CLASSEUR. Elles sont dans une
   base D1 tenue par le Worker — la seule exception de tout l'outil,
   et elle a sa raison écrite en tête de la messagerie côté Worker :
   soixante lectures Sheets par minute ne portent pas un fil qu'on
   relit toutes les quatre secondes. Conséquence pratique : une
   action de messagerie qui échoue ne « repart pas au classeur »,
   elle dit son erreur.

   ⚠️ LE SONDAGE NE TOURNE QUE SUR UN FIL OUVERT. L'étape 2 le
   remplacera par un WebSocket ; d'ici là, quatre secondes sur le
   fil qu'on regarde, et rien du tout quand la vue est fermée. Le
   compteur de la pastille, lui, voyage sur le battement de 90
   secondes qui existe déjà.
   ============================================================ */

/* Quatre secondes : assez pour qu'une réponse paraisse immédiate,
   assez peu pour ne pas peser. Le battement s'arrête dès que
   l'onglet passe en arrière-plan ou que le fil se referme. */
const PAS_MESSAGERIE = 4000;

/* Le même plafond que côté Worker : mieux vaut le dire avant
   l'envoi qu'après le refus. */
const MAX_TEXTE_MESSAGERIE = 4000;

/* Ce qu'on montre en tête d'un fil, par genre. Le titre d'un fil
   d'élève n'est pas enregistré : il se compose du nom et du genre,
   pour qu'un élève renommé ne traîne pas son ancien nom. */
const GENRES_MESSAGERIE = {
  bureau:   { rond: '🏢', quoi: 'Le bureau' },
  moniteur: { rond: '👤', quoi: 'Son moniteur' },
  groupe:   { rond: '👥', quoi: 'Groupe' },
  interne:  { rond: '🏠', quoi: 'Entre nous' },
  retard:   { rond: '⏰', quoi: 'Retard annoncé' },
  annul:    { rond: '🚫', quoi: 'Annulation demandée' },
  oubli:    { rond: '🧤', quoi: 'Objet oublié' }
};

/* ⚠️ DEUX ENDROITS POUR LE MÊME ÉCRAN, ET UNE SEULE FONCTION QUI
   DESSINE — v1074.

   La messagerie s'affiche à deux endroits : dans son onglet, en
   grand, et dans le tiroir vertical qu'ouvre le bouton 💬 de
   l'en-tête. Deux fonctions de dessin, c'était deux mises en page à
   tenir d'accord — et la deuxième aurait pris du retard dès la
   première correction. Une seule dessine donc, et demande d'abord
   OÙ : voir zoneDeLaMessagerie.

   Ce qui diffère entre les deux n'est pas le dessin, c'est ce qu'on
   y met. David : « le bandeau pour répondre vite, l'onglet pour
   travailler ». Le tiroir n'a donc ni recherche, ni filtres, ni
   bouton de création — ils sont à un clic, derrière ↗️. */
let tiroirOuvertEC = false;

function zoneDeLaMessagerie(){
  return tiroirOuvertEC ? $('msgElvTiroirCorps') : $('messagerieZone');
}

function dansLeTiroir(){ return tiroirOuvertEC; }

let conversationsEC = [];
let filOuvertEC = null;          /* { conv, messages, membres, … } */
let battementMessagerie = null;
let rangLuEC = 0;                /* le plus haut rang déjà affiché */
let empreinteReacEC = '';        /* l'état des réactions déjà dessinées */
let filtreMessagerie = '';       /* '' | un genre */
let chercheMessagerie = '';
let brouillonsMessagerie = {};   /* ce qu'on a tapé sans envoyer, par fil */

/* ------------------------------------------------------------
   L'ÉCRAN
   ------------------------------------------------------------ */

async function afficherMessagerie(silencieux){
  const zone = zoneDeLaMessagerie();
  if(!zone) return;

  if(!silencieux && !conversationsEC.length){
    zone.innerHTML = (typeof htmlAttente === 'function')
      ? htmlAttente('Lecture des conversations…')
      : '<div class="empty">Lecture des conversations…</div>';
  }

  try{
    /* La supervision montre tout, ouvert comme fermé : on y va pour
       chercher quelque chose, pas pour suivre le courant du jour. */
    const d = await appelPrep({ action: 'convList',
      fermees: (filtreMessagerie === 'clos' || filtreMessagerie === 'supervision') });
    conversationsEC = (d && d.conversations) || [];
    /* ⚠️ LES DEUX, PAS UN SEUL — v1085. Celui-ci ne posait que le
       compte de l'onglet. En refermant un fil qu'on vient de lire, on
       passe par ici : le rond de l'en-tête gardait donc son chiffre
       d'avant la lecture. */
    poserLesComptesMessagerie((d && d.nonLusTotal) || 0);
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + echapper(e.message || e) + '</div>';
    return;
  }

  /* Un fil ouvert reste ouvert : la liste se redessine derrière. */
  if(filOuvertEC){ dessinerLeFil(); return; }

  dessinerLaListeMessagerie();
}

function dessinerLaListeMessagerie(){
  const zone = zoneDeLaMessagerie();
  if(!zone) return;
  zone.innerHTML = '';

  /* ⚠️ LE TIROIR NE MONTRE JAMAIS LA SUPERVISION — v1082. David :
     « qu'ils soient invisibles quand on clique en haut sur la
     bulle ». Le tiroir s'ouvre pour répondre vite à ce qui nous est
     adressé ; y mêler les conversations des autres, c'est le rendre
     inutilisable le jour où il y en a quarante. Le filtre y est
     donc forcé, et la barre des genres n'y est de toute façon pas
     dessinée. */
  if(dansLeTiroir() && filtreMessagerie === 'supervision') filtreMessagerie = '';

  /* Dans le tiroir : la liste, et rien d'autre. Chercher et créer
     sont des gestes qu'on fait assis, pas entre deux cours. */
  if(!dansLeTiroir()){
    zone.appendChild(barreDeRechercheMessagerie());
    zone.appendChild(barreDesGenresMessagerie());
    if(chercheMessagerie){ return; }   /* la recherche a pris la place */

    /* 🔔 Le réglage des notifications de CET appareil — étape 3. La
       zone est posée vide : elle se remplit toute seule quand on
       sait si le serveur a des clés, et reste invisible sinon. */
    const zp = document.createElement('div');
    zp.id = 'msgPoussee';
    zone.appendChild(zp);
    dessinerLaPoussee();
    preparerLaPoussee();
  }

  /* ⚠️ LA SUPERVISION N'EST DANS AUCUNE AUTRE VUE — v1082.

     David : « uniquement visible dans le sous onglet messagerie
     après celui fermées ». Ce n'est pas un filtre de plus à côté des
     autres : c'est une liste À PART. Un fil qu'on supervise
     n'apparaît ni dans « Tout », ni dans « 🏢 », ni dans
     « Fermées » — seulement là, et seulement quand on va le
     chercher. */
  const liste = (filtreMessagerie === 'supervision')
    ? conversationsEC.filter(c => c.enSupervision)
    : conversationsEC.filter(c => !c.enSupervision &&
        (!filtreMessagerie || filtreMessagerie === 'clos' ||
         c.genre === filtreMessagerie));

  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = conversationsEC.length
      ? 'Rien dans cette famille.'
      : "Aucune conversation pour l'instant.<br>" +
        "Ouvre-en une avec « 👥 Nouvelle conversation ».";
    zone.appendChild(v);
  }else{
    /* Ce qui attend une réponse d'abord : une liste triée par date
       seule enterre une question de mardi sous trois accusés de
       lecture de vendredi. */
    const chauds = liste.filter(c => c.nonLus > 0);
    const froids = liste.filter(c => !c.nonLus);

    /* Dans la supervision, « pas encore lu » n'a pas de sens : ce ne
       sont pas des messages qui t'attendent. Un seul titre, qui dit
       ce qu'on regarde et ce que ça engage. */
    if(filtreMessagerie === 'supervision'){
      zone.appendChild(sousTitreMessagerie(
        '🔒 Supervision · ' + liste.length, 'var(--muted)'));
      liste.forEach(c => zone.appendChild(ligneConversation(c)));
      const d = document.createElement('div');
      d.style.cssText = 'font-size:11.5px;color:var(--muted);line-height:1.5;' +
        'margin-top:10px;';
      d.textContent = 'Les conversations auxquelles tu n’appartiens pas. ' +
        'Chaque ouverture est inscrite au journal — c’est ce qui distingue ' +
        'un droit de supervision d’un droit d’espionnage.';
      zone.appendChild(d);
      return;
    }

    if(chauds.length){
      zone.appendChild(sousTitreMessagerie('Pas encore lu · ' + chauds.length,
                                           'var(--warn-text)'));
      chauds.forEach(c => zone.appendChild(ligneConversation(c)));
    }
    if(froids.length){
      zone.appendChild(sousTitreMessagerie(chauds.length
        ? 'Suivies · ' + froids.length : froids.length + ' conversation(s)'));
      froids.forEach(c => zone.appendChild(ligneConversation(c)));
    }
  }

  if(!dansLeTiroir() && peutOuvrirUneConversation()){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'margin-top:12px;padding:10px;font-size:13px;';
    b.textContent = '👥 Nouvelle conversation';
    b.addEventListener('click', () => ecranNouvelleConversation());
    zone.appendChild(b);
  }
}

function sousTitreMessagerie(texte, couleur){
  const d = document.createElement('div');
  d.style.cssText = 'font-size:11px;letter-spacing:.08em;text-transform:uppercase;' +
    'color:' + (couleur || 'var(--muted)') + ';margin:14px 0 7px;';
  d.textContent = texte;
  return d;
}

/* ------------------------------------------------------------
   UNE LIGNE DE LA LISTE
   ------------------------------------------------------------ */

function ligneConversation(c){
  const d = document.createElement('div');
  d.style.cssText = 'display:flex;gap:11px;align-items:flex-start;padding:11px 4px;' +
    'border-bottom:1px solid var(--line);cursor:pointer;';
  d.title = 'Ouvrir la conversation';

  const rond = document.createElement('div');
  const g = GENRES_MESSAGERIE[c.genre] || { rond: '💬' };
  rond.style.cssText = 'flex-shrink:0;width:38px;height:38px;border-radius:50%;' +
    'display:flex;align-items:center;justify-content:center;font-size:17px;' +
    (c.nonLus
      ? 'background:var(--orange);color:var(--on-accent);'
      : 'background:var(--line);color:var(--muted);');
  rond.textContent = g.rond;
  d.appendChild(rond);

  const mi = document.createElement('div');
  mi.style.cssText = 'flex:1;min-width:0;';

  const tete = document.createElement('div');
  tete.style.cssText = 'display:flex;gap:8px;align-items:baseline;font-size:14px;' +
    'font-weight:700;';
  const q = document.createElement('span');
  q.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;' +
    'white-space:nowrap;';
  q.textContent = titreDuFil(c);
  const h = document.createElement('span');
  h.style.cssText = 'font-size:11px;color:var(--muted);font-weight:400;flex-shrink:0;';
  h.textContent = heureCourteMessagerie(c.dernierLe);
  tete.appendChild(q); tete.appendChild(h);
  mi.appendChild(tete);

  const ap = document.createElement('div');
  ap.style.cssText = 'font-size:12.5px;line-height:1.45;margin-top:2px;' +
    'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
    (c.nonLus ? 'color:var(--cream);font-weight:700;' : 'color:var(--muted);');
  ap.textContent = c.dernierApercu
    ? (c.dernierPar ? c.dernierPar + ' : ' : '') + c.dernierApercu
    : 'Pas encore de message.';
  mi.appendChild(ap);

  /* ⚠️ LE SUPERVISEUR EST AVERTI AVANT D'OUVRIR, PAS APRÈS. Une
     trace qu'on découvre dans le journal après coup est une trace
     qui se vit comme un piège ; annoncée, c'est une règle. */
  if(c.enSupervision){
    const s = document.createElement('div');
    s.style.cssText = 'font-size:11.5px;color:var(--muted);font-style:italic;' +
      'margin-top:3px;';
    s.textContent = '🔒 Tu n’es pas dedans — l’ouvrir laissera une trace';
    mi.appendChild(s);
  }

  d.appendChild(mi);

  if(c.nonLus){
    const cpt = document.createElement('span');
    cpt.style.cssText = 'flex-shrink:0;min-width:20px;padding:0 6px;border-radius:10px;' +
      'background:var(--red);color:#fff;font-size:11px;line-height:20px;' +
      'text-align:center;font-weight:700;';
    cpt.textContent = c.nonLus > 99 ? '99+' : String(c.nonLus);
    d.appendChild(cpt);
  }

  d.addEventListener('click', () => ouvrirLeFil(c.id));
  return d;
}

/* Le titre se compose, il ne se lit pas : un élève renommé doit
   voir son nouveau nom sur l'ancien fil. */
/* ⚠️ LE TITRE EST CELUI DE L'AUTRE, JAMAIS LE MIEN — v1079.

   David, capture à l'appui : « David ↔ Hery », et juste dessous
   « David, Hery ». Son propre nom, deux fois, dans sa propre
   conversation. Sa réponse du 8 octobre : « oui l'autre personne ».

   Le défaut venait de la dernière ligne, qui joignait TOUS les
   membres sans savoir qui lisait. */
function titreDuFil(c){
  if(c.titre) return c.titre;
  if(c.genre === 'interne'){
    const moi = normaliserMessagerie((typeof ACCES !== 'undefined' && ACCES.moniteur) || '');
    const autres = (c.membres || []).filter(x => x.genre === 'user' &&
      normaliserMessagerie(x.qui) !== moi).map(x => x.qui);
    /* Seul dans un fil « entre nous » — tous les autres en sont
       sortis : on ne rend pas une chaîne vide, on le dit. */
    return autres.length ? autres.join(', ') : 'Conversation (seul)';
  }
  if(c.genre === 'bureau')   return (c.eleve || '?') + ' ↔ le bureau';
  if(c.genre === 'moniteur'){
    const m = (c.membres || []).filter(x => x.genre === 'user')
                               .map(x => x.qui).join(', ');
    return (c.eleve || '?') + (m ? ' ↔ ' + m : '');
  }
  if(c.genre === 'retard') return '⏰ Retard — ' + (c.eleve || '?');
  if(c.genre === 'annul')  return '🚫 Annulation — ' + (c.eleve || '?');
  if(c.genre === 'oubli')  return '🧤 Objet oublié — ' + (c.eleve || '?');
  const noms = (c.membres || []).map(x => x.qui).filter(Boolean);
  return noms.length ? noms.join(' ↔ ') : 'Conversation';
}

/* « 10:14 » aujourd'hui, « hier », « lun. », puis la date. Un
   horodatage complet sur chaque ligne noierait la liste. */
function heureCourteMessagerie(quand){
  const t = String(quand || '').trim();
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if(!m) return t;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  const jour = new Date();
  const hier = new Date(); hier.setDate(hier.getDate() - 1);
  const memeJourQue = (a, b) => a.getFullYear() === b.getFullYear() &&
                                a.getMonth() === b.getMonth() &&
                                a.getDate() === b.getDate();
  if(memeJourQue(d, jour)) return m[4] ? m[4] + ':' + m[5] : "aujourd'hui";
  if(memeJourQue(d, hier)) return 'hier';
  const ecart = (jour - d) / 86400000;
  if(ecart > 0 && ecart < 7){
    return ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][d.getDay()];
  }
  return m[1] + '/' + m[2];
}

/* ------------------------------------------------------------
   LA BARRE DE RECHERCHE
   ------------------------------------------------------------ */

function barreDeRechercheMessagerie(){
  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:7px;align-items:center;margin-bottom:12px;';

  const ch = document.createElement('input');
  ch.type = 'text';
  ch.id = 'msgElvCherche';
  ch.placeholder = '🔍 Chercher dans toutes les conversations…';
  ch.value = chercheMessagerie;
  ch.style.cssText = 'flex:1;min-width:0;margin:0;';
  ch.addEventListener('keydown', ev => {
    if(ev.key === 'Enter'){ ev.preventDefault(); lancerLaRecherche(ch.value); }
  });
  l.appendChild(ch);

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;flex:0 0 auto;margin:0;padding:11px 14px;font-size:13px;';
  b.textContent = chercheMessagerie ? '✕' : '🔍';
  b.title = chercheMessagerie ? 'Effacer la recherche' : 'Chercher';
  b.addEventListener('click', () => {
    if(chercheMessagerie){ chercheMessagerie = ''; dessinerLaListeMessagerie(); }
    else lancerLaRecherche(ch.value);
  });
  l.appendChild(b);

  return l;
}

async function lancerLaRecherche(mots){
  const propre = String(mots || '').trim();
  if(propre.length < 2){
    if(typeof showToast === 'function') showToast('Deux lettres au moins.');
    return;
  }
  chercheMessagerie = propre;
  const zone = zoneDeLaMessagerie();
  if(!zone) return;

  zone.innerHTML = '';
  zone.appendChild(barreDeRechercheMessagerie());
  const att = document.createElement('div');
  att.className = 'empty';
  att.textContent = 'Recherche…';
  zone.appendChild(att);

  let trouves = [];
  try{
    const d = await appelPrep({ action: 'convChercher', mots: propre });
    trouves = (d && d.trouves) || [];
  }catch(e){
    att.innerHTML = '⚠️ ' + echapper(e.message || e);
    return;
  }

  zone.innerHTML = '';
  zone.appendChild(barreDeRechercheMessagerie());
  zone.appendChild(sousTitreMessagerie(
    trouves.length
      ? 'Trouvé pour « ' + propre + ' » · ' + trouves.length + ' message(s)'
      : 'Rien trouvé pour « ' + propre + ' »'));

  trouves.forEach(x => zone.appendChild(ligneTrouveeMessagerie(x, propre)));
}

function ligneTrouveeMessagerie(x, mots){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:9px 11px;' +
    'margin-bottom:7px;display:flex;gap:9px;align-items:center;cursor:pointer;';

  const g = document.createElement('div');
  g.style.cssText = 'flex:1;min-width:0;';

  const h = document.createElement('div');
  h.style.cssText = 'font-size:13.5px;font-weight:700;';
  const fam = GENRES_MESSAGERIE[x.genre] || { rond: '💬' };
  h.textContent = fam.rond + ' ' + (x.titre || x.eleve || 'Conversation') +
                  ' — ' + (x.envoyeLe || '');
  g.appendChild(h);

  const s = document.createElement('div');
  s.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;margin-top:2px;';
  s.innerHTML = (x.auteur ? echapper(x.auteur) + ' : ' : '') +
                souligner(x.texte, mots);
  g.appendChild(s);

  d.appendChild(g);
  d.addEventListener('click', () => ouvrirLeFil(x.conversation, x.rang));
  return d;
}

/* ⚠️ LE SURLIGNAGE IGNORE LES ACCENTS, COMME LA RECHERCHE — v1070.

   Côté serveur, FTS5 cherche avec « remove_diacritics » : taper
   « echarpe » trouve bel et bien « écharpe ». Le surlignage, lui,
   comparait les lettres telles quelles — le résultat remontait donc
   sans que rien ne soit souligné dedans, et on avait l'air de ne
   pas savoir pourquoi on l'avait trouvé. Les deux doivent lire le
   mot de la même façon, sinon le résultat se contredit lui-même. */
const LETTRES_ACCENTUEES = {
  a: 'aàâä', c: 'cç', e: 'eéèêë', i: 'iîï',
  o: 'oôö', u: 'uùûü', y: 'yÿ'
};

function lettreSansAccent(ch){
  return String(ch).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* Chaque lettre devient la classe de ses variantes : « echarpe »
   s'écrit « [eéèêë]ch[aàâä]rp[eéèêë] ». Les autres caractères sont
   échappés pour ne pas devenir du langage d'expression. */
function motAccentInsensible(mot){
  return String(mot || '').split('').map(ch => {
    const bas = lettreSansAccent(ch).toLowerCase();
    const classe = LETTRES_ACCENTUEES[bas];
    if(classe) return '[' + classe + classe.toUpperCase() + ']';
    return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
}

/* ⚠️ ON SOULIGNE SUR DU TEXTE DÉJÀ ÉCHAPPÉ. L'inverse — chercher
   puis échapper — avalerait les balises qu'on vient de poser. */
function souligner(texte, mots){
  let h = echapper(String(texte || '').replace(/\s+/g, ' ').slice(0, 220));
  String(mots || '').split(/\s+/).filter(m => m.length > 1).forEach(m => {
    /* Le serveur cherche en préfixe : on souligne donc le mot ET sa
       suite de lettres, sinon « echar » ne surlignerait que cinq
       lettres au milieu de « écharpe ». */
    const motif = motAccentInsensible(m) + '[\\p{L}\\p{N}]*';
    try{
      h = h.replace(new RegExp('(' + motif + ')', 'giu'),
                    '<b style="color:var(--cream);">$1</b>');
    }catch(e){ /* un mot impossible à transformer n'empêche pas d'afficher */ }
  });
  return h;
}

/* ------------------------------------------------------------
   LA BARRE DES FAMILLES
   ------------------------------------------------------------ */

function barreDesGenresMessagerie(){
  const b = document.createElement('div');
  b.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;';

  /* ⚠️ « TOUT 14 » NE DOIT PAS COMPTER CE QU'ON SUPERVISE : le
     chiffre du bouton et le nombre de lignes en dessous doivent
     dire la même chose, sinon on cherche les quatre qui manquent. */
  const aMoi = conversationsEC.filter(c => !c.enSupervision);
  const comptes = {};
  aMoi.forEach(c => { comptes[c.genre] = (comptes[c.genre] || 0) + 1; });

  const bouton = (cle, libelle, combien) => {
    const x = document.createElement('button');
    const on = (filtreMessagerie === cle);
    x.className = 'btn btn-secondary';
    x.style.cssText = 'width:auto;margin:0;padding:4px 10px;font-size:12px;' +
      'border-radius:999px;' +
      (on ? 'background:var(--orange);border-color:var(--orange);' +
            'color:#0B0B0B;font-weight:700;' : '');
    x.textContent = libelle + (combien === null ? '' : ' ' + combien);
    x.addEventListener('click', () => {
      filtreMessagerie = on ? '' : cle;
      /* Ces deux-là changent ce que le SERVEUR doit rendre : il faut
         relire. Les autres ne font que trier ce qu'on a déjà. */
      if(filtreMessagerie === 'clos' || filtreMessagerie === 'supervision' || on){
        afficherMessagerie(true);
      }else dessinerLaListeMessagerie();
    });
    b.appendChild(x);
  };

  bouton('', 'Tout', aMoi.length);
  Object.keys(GENRES_MESSAGERIE).forEach(cle => {
    if(comptes[cle]) bouton(cle, GENRES_MESSAGERIE[cle].rond, comptes[cle]);
  });
  bouton('clos', '🗄️ Fermées', null);

  /* ⚠️ APRÈS « FERMÉES », ET SEULEMENT POUR QUI SUPERVISE — v1082.
     C'est la place que David a demandée, et elle est juste : les
     trois premiers boutons trient ce qui est à moi, les deux
     derniers ouvrent autre chose. */
  if(typeof aDroit !== 'function' || aDroit('messagerie_admin')){
    bouton('supervision', '🔒 Supervision', null);
  }

  return b;
}

/* ------------------------------------------------------------
   UN FIL
   ------------------------------------------------------------ */

async function ouvrirLeFil(id, viser){
  const zone = zoneDeLaMessagerie();
  if(!zone) return;

  zone.innerHTML = (typeof htmlAttente === 'function')
    ? htmlAttente('Ouverture du fil…')
    : '<div class="empty">Ouverture du fil…</div>';

  try{
    const d = await appelPrep({ action: 'convFil', id: id });
    filOuvertEC = d || null;
    filOuvertEC.viser = viser || 0;
  }catch(e){
    filOuvertEC = null;
    zone.innerHTML = '<div class="empty">⚠️ ' + echapper(e.message || e) + '</div>';
    return;
  }

  rangLuEC = 0;
  dessinerLeFil();
  marquerLuLeFil();
  veillerLeFil();
  /* Le direct se branche APRÈS le premier dessin : il accélère ce
     qui vient ensuite, il ne retarde pas l'ouverture. */
  if(typeof brancherLeDirect === 'function') brancherLeDirect(id);
}

function fermerLeFil(){
  fermerLeSelecteurDeReaction();
  fermerLePanneauEmoji();
  /* ⚠️ ET LA PHOTO EN GRAND, qui vit dans le <body> et non dans la
     zone : « innerHTML = '' » ne l'emporte pas. Sans ça, revenir à la
     liste laisse une image plein écran par-dessus tout. */
  fermerLaPhotoEnGrand();
  empreinteReacEC = '';
  filOuvertEC = null;
  arreterLaVeilleDuFil();
  if(typeof couperLeDirect === 'function') couperLeDirect();
  afficherMessagerie(true);
}

function dessinerLeFil(){
  const zone = zoneDeLaMessagerie();
  if(!zone || !filOuvertEC) return;
  const f = filOuvertEC;
  const c = f.conv || {};

  /* ⚠️ CE QUI FLOTTE MEURT AVEC LE DESSIN — v1086. Le sélecteur de
     réaction et le panneau des émoticônes vivent DANS cette zone :
     après « innerHTML = '' » leurs variables pointeraient sur des
     éléments détachés, et le prochain clic sur 🙂 croirait le panneau
     ouvert alors qu'il n'est plus nulle part. */
  fermerLeSelecteurDeReaction();
  fermerLePanneauEmoji();

  zone.innerHTML = '';
  /* ⚠️ C'EST LE CODE QUI DIT « ÉTROIT », PAS LA FEUILLE DE STYLE.
     Le tiroir fait 400 px sur un écran de 1 400 : une requête de
     média sur la fenêtre y afficherait la rangée d'actions qui n'y
     tient pas. */
  zone.classList.toggle('msgEtroit', dansLeTiroir());

  /* --- l'en-tête --- */
  const tete = document.createElement('div');
  tete.className = 'msgTete';

  const retour = document.createElement('button');
  retour.className = 'btn btn-secondary';
  retour.style.cssText = 'width:auto;margin:0;padding:8px 12px;font-size:14px;';
  retour.textContent = '←';
  retour.title = 'Revenir à la liste';
  retour.addEventListener('click', fermerLeFil);
  tete.appendChild(retour);

  const rond = rondDuFil(f);
  const r = document.createElement('div');
  r.className = 'msgRond' + (rond.gris ? ' gris' : '');
  r.textContent = rond.texte;
  tete.appendChild(r);

  const noms = document.createElement('div');
  noms.className = 'msgNoms';
  const na = document.createElement('div');
  na.className = 'a';
  na.textContent = titreDuFilCourt(f);
  const nb = document.createElement('div');
  nb.className = 'b';
  nb.textContent = sousTitreDuFil(f);
  noms.appendChild(na);
  noms.appendChild(nb);
  tete.appendChild(noms);

  /* Le ⋯ et son menu : les mêmes actions que la rangée, construites
     une seule fois par barreDesActionsDuFil. */
  const boite = document.createElement('div');
  boite.className = 'msgMenuBoite';
  const pts = document.createElement('button');
  pts.className = 'msgPts';
  pts.type = 'button';
  pts.textContent = '⋯';
  pts.title = 'Participants, exporter, fermer';
  pts.addEventListener('click', ev => { ev.stopPropagation(); basculerLeMenuDuFil(boite, f); });
  boite.appendChild(pts);
  tete.appendChild(boite);

  zone.appendChild(tete);

  if(f.enSupervision){
    const s = document.createElement('div');
    s.className = 'hint';
    s.style.cssText = 'font-size:12px;color:var(--warn-text);line-height:1.5;margin:10px 0 0;';
    s.textContent = '🔒 Tu lis en supervision : tu n’es pas dans cette ' +
      'conversation, et cette lecture est inscrite au journal. Pour y répondre, ' +
      'ajoute-toi — ton arrivée s’écrira dans le fil.';
    zone.appendChild(s);
  }

  /* --- le fil --- */
  const fil = document.createElement('div');
  fil.id = 'msgElvFil';
  fil.className = 'msgFil';

  if(f.encore){
    const plus = document.createElement('button');
    plus.className = 'btn btn-secondary';
    plus.style.cssText = 'width:auto;margin:0 auto 10px;display:block;padding:6px 12px;' +
      'font-size:12px;border-radius:999px;';
    plus.textContent = '↑ Messages plus anciens';
    plus.addEventListener('click', () => chargerPlusDuFil(plus));
    fil.appendChild(plus);
  }

  /* ⚠️ LE GROUPEMENT SE DÉCIDE SUR TROIS MESSAGES À LA FOIS : le
     précédent dit s'il faut répéter la signature, le suivant dit
     s'il faut poser la pointe et l'heure. Trois messages d'affilée
     ne font plus trois pavés identiques. */
  const msgs = (f.messages || []);
  let jourPose = '';
  msgs.forEach((m, i) => {
    const jour = String(m.envoyeLe || '').slice(0, 10);
    const neuf = jour && jour !== jourPose;
    if(neuf){
      jourPose = jour;
      const j = document.createElement('div');
      j.className = 'msgJour';
      j.innerHTML = '<span></span>';
      j.firstChild.textContent = jourLisibleMessagerie(jour);
      fil.appendChild(j);
    }
    const avant = neuf ? null : (msgs[i - 1] || null);
    const apres = msgs[i + 1] || null;
    fil.appendChild(bulleDuMessage(m, avant,
      (apres && String(apres.envoyeLe || '').slice(0, 10) === jour) ? apres : null));
    if(Number(m.rang || 0) > rangLuEC) rangLuEC = Number(m.rang || 0);
  });

  /* ⚠️ L'EMPREINTE SE NOTE OÙ L'ON DESSINE, comme « rangLuEC » juste
     au-dessus — v1086. Notée seulement dans le battement, elle
     restait vide après l'ouverture du fil : le premier battement
     redessinait donc TOUJOURS, quatre secondes après l'ouverture,
     en pleine frappe. Et quand on pose soi-même une réaction, le
     dessin anticipé note ce qu'il a peint : si le serveur confirme
     exactement ça, on ne redessine pas une deuxième fois. */
  empreinteReacEC = empreinteDesReactions(f);

  if(!msgs.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Rien d’écrit encore. Le premier message est pour toi.';
    fil.appendChild(v);
  }

  zone.appendChild(fil);

  /* --- qui a lu --- */
  const lus = (f.lectures || []).filter(x =>
    Number(x.luJusqua || 0) >= rangLuEC && x.qui &&
    normaliserMessagerie(x.qui) !== normaliserMessagerie(ACCES.moniteur || ''));
  if(lus.length){
    const l = document.createElement('div');
    l.className = 'msgLu';
    l.textContent = '✅ Lu par ' + lus.map(x => x.qui).join(', ');
    zone.appendChild(l);
  }

  /* --- écrire --- */
  if(f.peutEcrire) zone.appendChild(zoneDEcritureDuFil(c.id));
  else{
    const g = document.createElement('div');
    g.className = 'empty';
    g.style.cssText = 'font-size:12.5px;padding:10px 0;';
    g.textContent = Number(c.fermee || 0)
      ? 'Conversation fermée : elle reste lisible, on n’y écrit plus.'
      : 'Tu ne peux pas écrire dans cette conversation.';
    zone.appendChild(g);
  }

  zone.appendChild(barreDesActionsDuFil(f));

  /* Le fil s'ouvre en bas, là où est le dernier message — et sur le
     message visé quand on arrive par la recherche. */
  setTimeout(() => {
    const vise = f.viser && fil.querySelector('[data-rang="' + f.viser + '"]');
    if(vise) vise.scrollIntoView({ block: 'center' });
    else fil.scrollTop = fil.scrollHeight;
  }, 0);
}

/* ⚠️ LE ROND N'EST PAS UNE DÉCORATION : c'est ce qui permet de
   reconnaître un fil sans lire son titre, et de distinguer d'un
   coup d'œil un élève d'un collègue dans la liste. Une initiale
   pour une personne, l'emoji du genre pour tout le reste. */
function rondDuFil(f){
  const c = (f && f.conv) || {};
  if(c.genre === 'groupe')   return { texte: '👥', gris: true };
  if(c.genre === 'bureau')   return { texte: '🏢', gris: true };
  if(c.genre === 'retard')   return { texte: '⏰', gris: true };
  if(c.genre === 'annul')    return { texte: '🚫', gris: true };
  if(c.genre === 'oubli')    return { texte: '🧤', gris: true };

  const lettre = String(titreDuFilCourt(f) || '?').trim().charAt(0).toUpperCase() || '?';
  /* Le citron pour quelqu'un de l'équipe, le gris pour un élève :
     la couleur de la maison reste celle de la maison. */
  return { texte: lettre, gris: c.genre === 'moniteur' };
}

/* ⚠️ LE NOM COURT EST POUR L'EN-TÊTE, PAS POUR LA LISTE. Dans la
   liste, « Henedi Ahmed ↔ le bureau » distingue d'un coup d'œil le
   fil du bureau de celui de son moniteur. Dans l'en-tête, la nature
   est écrite juste en dessous : la répéter dans le titre, c'est la
   faute qu'on vient de corriger, dans l'autre sens. */
function titreDuFilCourt(f){
  const c = (f && f.conv) || {};
  if(c.titre) return c.titre;
  if((c.genre === 'bureau' || c.genre === 'moniteur') && c.eleve) return c.eleve;
  return titreDuFil(Object.assign({}, c, { membres: (f && f.membres) || [] }));
}

/* La nature du fil, sous son nom. Elle remplace la liste des
   membres qui répétait le titre mot pour mot — et dans une
   conversation à deux, répétait AUSSI le nom de celui qui lit. */
function sousTitreDuFil(f){
  const c = (f && f.conv) || {};
  const m = (f && f.membres) || [];
  const moi = normaliserMessagerie((typeof ACCES !== 'undefined' && ACCES.moniteur) || '');
  const autres = m.filter(x => x.genre === 'user' &&
                               normaliserMessagerie(x.qui) !== moi).map(x => x.qui);
  const el = m.filter(x => x.genre === 'eleve').map(x => x.qui);
  const boite = m.some(x => x.genre === 'boite');
  const annonce = (c.mode === 'annonce') ? 'mode annonce' : '';

  if(c.genre === 'interne'){
    return ['Entre nous', autres.length > 1 ? autres.join(', ') : ''].filter(Boolean)
      .join(' · ');
  }
  if(c.genre === 'bureau'){
    return ['Au nom du bureau', autres.length ? autres.join(', ') : '', annonce]
      .filter(Boolean).join(' · ');
  }
  if(c.genre === 'moniteur'){
    return ['Avec ' + (autres.join(', ') || 'toi'), boite ? 'et le bureau' : '']
      .filter(Boolean).join(' · ');
  }
  if(c.genre === 'groupe'){
    return [el.length ? (el.length > 3 ? el.length + ' élèves' : el.join(', ')) : '',
            autres.join(', '), boite ? 'le bureau' : '', annonce]
      .filter(Boolean).join(' · ');
  }
  /* Les fils d'action rapide : leur titre porte déjà le cours, le
     sous-titre porte l'élève et qui est prévenu. */
  return [c.eleve || '', autres.join(', '), boite ? 'le bureau' : '']
    .filter(Boolean).join(' · ');
}

/* ------------------------------------------------------------
   LE MENU ⋯

   ⚠️ IL NE REFAIT PAS LES ACTIONS, IL LES DÉPLACE. barreDesActionsDuFil
   reste la seule à décider ce qui existe et qui y a droit ; le menu
   reprend ses boutons tels quels. Deux listes d'actions, c'en est
   une qui prendrait du retard sur l'autre dès la correction
   suivante — et dans une messagerie, « Fermer » qui existe ici et
   pas là est le genre d'écart qu'on découvre un jour de litige.
   ------------------------------------------------------------ */
let fermerMenuDuFil = null;

function basculerLeMenuDuFil(boite, f){
  if(fermerMenuDuFil){
    const etait = boite.querySelector('.msgMenu');
    fermerMenuDuFil();
    if(etait) return;
  }

  const menu = document.createElement('div');
  menu.className = 'msgMenu';
  /* Les boutons de la rangée, repris un par un : même libellé,
     même titre, même action. */
  Array.prototype.slice.call(barreDesActionsDuFil(f).children).forEach(b => {
    b.className = '';
    b.removeAttribute('style');
    menu.appendChild(b);
  });
  if(!menu.children.length) return;
  menu.addEventListener('click', () => fermerMenuDuFil && fermerMenuDuFil());
  boite.appendChild(menu);

  const dehors = () => fermerMenuDuFil && fermerMenuDuFil();
  const echap = ev => { if(ev.key === 'Escape') dehors(); };
  fermerMenuDuFil = () => {
    document.removeEventListener('click', dehors);
    document.removeEventListener('keydown', echap);
    if(menu.parentNode) menu.parentNode.removeChild(menu);
    fermerMenuDuFil = null;
  };
  setTimeout(() => {
    document.addEventListener('click', dehors);
    document.addEventListener('keydown', echap);
  }, 0);
}


function phraseDesMembres(f){
  const m = f.membres || [];
  const el = m.filter(x => x.genre === 'eleve').map(x => x.qui);
  const us = m.filter(x => x.genre === 'user').map(x => x.qui);
  const bo = m.filter(x => x.genre === 'boite').length;
  const bouts = [];
  if(bo) bouts.push('la boîte du bureau');
  if(us.length) bouts.push(us.join(', '));
  if(el.length) bouts.push(el.length > 3
    ? el.length + ' élèves' : el.join(', '));
  if(f.conv && f.conv.mode === 'annonce') bouts.push('mode annonce');
  return bouts.join(' · ');
}

function jourLisibleMessagerie(jour){
  const m = String(jour || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m) return jour;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
                'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const auj = new Date();
  if(d.toDateString() === auj.toDateString()) return "Aujourd'hui";
  const hier = new Date(); hier.setDate(hier.getDate() - 1);
  if(d.toDateString() === hier.toDateString()) return 'Hier';
  return jours[d.getDay()] + ' ' + (+m[1]) + ' ' + mois[+m[2] - 1];
}

/* ⚠️ L'EMPREINTE PORTE L'EMOJI *ET* LA PERSONNE. Compter les
   pastilles ne suffirait pas : si David retire son pouce à la
   seconde où Hery en pose un, le compte est le même et l'écran ne
   bougerait pas. */
function empreinteDesReactions(d){
  let e = '';
  ((d && d.messages) || []).forEach(m => {
    const r = m.reacs || [];
    if(!r.length) return;
    e += m.id + ':' + r.map(x =>
      (x.emoji || '') + '~' + (x.cle || x.qui || (x.mien ? 'moi' : ''))).join(',') + ';';
  });
  return e;
}

/* ------------------------------------------------------------
   UNE BULLE
   ------------------------------------------------------------ */

function bulleDuMessage(m, avant, apres){
  const moi = normaliserMessagerie(ACCES.moniteur || '');
  const sienne = (m.auteurGenre !== 'systeme') &&
                 normaliserMessagerie(m.auteur) === moi;

  /* ⚠️ UNE LIGNE DE SYSTÈME N'EST PAS UNE BULLE. Arrivée de
     quelqu'un, départ, changement d'état d'un objet oublié : la
     conversation raconte ce qui s'est passé, et personne ne le
     saisit deux fois. Qu'elle ressemble à un message rendrait les
     deux douteux. */
  if(m.auteurGenre === 'systeme'){
    const s = document.createElement('div');
    s.className = 'msgSys';
    s.setAttribute('data-rang', String(m.rang || 0));
    const d = document.createElement('span');
    d.textContent = m.texte +
      (m.auteur ? ' — ' + m.auteur : '') +
      (m.envoyeLe ? ' · ' + String(m.envoyeLe).slice(11) : '');
    s.appendChild(d);
    return s;
  }

  /* Deux messages se suivent quand ils sont du même auteur, du même
     côté, et qu'aucune ligne de système ne s'est glissée entre eux :
     une arrivée au milieu coupe la suite, et c'est juste — ce qui
     est dit avant et après n'a pas le même public. */
  const memeQue = (x) => !!x && x.auteurGenre !== 'systeme' &&
    normaliserMessagerie(x.auteur) === normaliserMessagerie(m.auteur) &&
    x.auteurGenre === m.auteurGenre;
  const suite = memeQue(avant);
  const encore = memeQue(apres);

  const ligne = document.createElement('div');
  ligne.className = 'msgRang' + (sienne ? ' moi' : '') + (encore ? '' : ' fin');
  ligne.setAttribute('data-rang', String(m.rang || 0));

  const b = document.createElement('div');
  b.className = 'msgB' + (sienne ? ' moi' : ' lui') +
                (suite ? ' suite' : '') + (encore ? '' : ' pointe');

  /* La signature ne se répète pas dans une suite, et jamais sur ses
     propres bulles : il sait qui il est, et la répéter vole une
     ligne sur un téléphone. */
  if(!sienne && !suite){
    const sig = document.createElement('span');
    sig.className = 'sig';
    sig.textContent = (m.auteur || '') + (m.auteurGenre === 'eleve' ? ' · élève' : '');
    b.appendChild(sig);
  }
  if(m.motif && GENRES_MESSAGERIE[m.motif]){
    const mo = document.createElement('span');
    mo.className = 'motif';
    mo.textContent = GENRES_MESSAGERIE[m.motif].rond + ' ' +
                     GENRES_MESSAGERIE[m.motif].quoi;
    b.appendChild(mo);
  }

  /* 📷 La photo vient AVANT le texte — v1088. Le mot joint commente
     l'image : le lire après, c'est l'ordre dans lequel on les a
     écrits. */
  const image = imageDuMessage(m);
  if(image){
    b.classList.add('photo');
    b.appendChild(image);
  }

  /* 🎤 Le vocal vient avant le texte, pour la même raison que la
     photo — v1098. Sauf qu'ici le texte N'EST PAS un commentaire :
     c'est ce qui a été dit. Il se lit donc comme la suite naturelle
     du lecteur, et c'est lui qu'on parcourt des yeux quand on n'a
     pas le temps d'écouter. */
  const vocal = (typeof vocalDuMessage === 'function') ? vocalDuMessage(m) : null;
  if(vocal){
    b.classList.add('vocal');
    b.appendChild(vocal);
  }

  /* ⚠️ LE TEXTE D'UN VOCAL EST DANS SA PROPRE ZONE — v1098. Posé
     comme un nœud de texte nu, il se collait au lecteur et se lisait
     comme une légende d'image. Il DOUBLE la parole : un cran plus
     petit, et un peu de place au-dessus. */
  if(m.texte && vocal){
    const dit = document.createElement('div');
    dit.className = 'msgLectMots';
    dit.textContent = m.texte;
    b.appendChild(dit);
  }else if(m.texte){
    b.appendChild(document.createTextNode(m.texte));
  }

  /* ⚠️ L'HEURE EST POSÉE APRÈS LE TEXTE, et c'est ce qui la met au
     bout de la DERNIÈRE ligne. Un flottant rencontré après trois
     lignes de texte se range sur la troisième s'il y tient, et sur
     une quatrième sinon — jamais sur la première. Posée avant, elle
     se collait en haut à droite de la bulle, à côté du début de la
     phrase, ce qui se lit comme une étiquette et pas comme une
     heure d'envoi.

     Seule la dernière d'une suite la porte : trois heures à la
     minute près sur trois lignes consécutives ne disent rien de
     plus qu'une seule. */
  if(!encore){
    const h = document.createElement('span');
    h.className = 'h';
    h.textContent = String(m.envoyeLe || '').slice(11) || m.envoyeLe || '';
    b.appendChild(h);
  }

  /* 😊 Les réactions — v1086.

     ⚠️ LA BULLE PORTE SON IDENTIFIANT. Pour réagir à un message il
     faut savoir LEQUEL : c'est la ligne qui rend tout le reste
     possible, et elle ne coûte rien. */
  b.setAttribute('data-msg', m.id || '');
  const pastilles = zoneDesReactions(m);
  if(pastilles){
    /* « aReac » pose le position:relative dont les pastilles ont
       besoin, et le peu de place sous la bulle pour qu'elles ne
       chevauchent pas la suivante. */
    b.classList.add('aReac');
    b.appendChild(pastilles);
  }
  brancherLAppuiLong(b, m);

  ligne.appendChild(b);
  return ligne;
}

function normaliserMessagerie(v){
  return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/* ------------------------------------------------------------
   ÉCRIRE
   ------------------------------------------------------------ */

function zoneDEcritureDuFil(id){
  const l = document.createElement('div');
  /* ⚠️ « aOutils » REPREND LES 15 px DE RETRAIT À GAUCHE. Avec un
     bouton devant le champ, ce retrait décollait l'icône du bord et
     la barre semblait mal centrée. */
  l.className = 'msgBarre aOutils';

  /* 🎤 Enregistrer un vocal — v1098. DEVANT les deux autres, réponse
     de David du 8 octobre : c'est le geste qu'on cherche quand on
     n'a pas les mains libres, et celui-là ne se tâtonne pas.

     ⚠️ IL NE PARAÎT PAS S'IL NE PEUT PAS MARCHER. Un bouton micro
     sur un navigateur sans MediaRecorder est un bouton qui répond
     « impossible » après le clic — autant le dire avant, en ne le
     mettant pas. */
  if(typeof vocalPossibleEC === 'function' && vocalPossibleEC()){
    const voc = document.createElement('button');
    voc.type = 'button';
    voc.id = 'msgElvVocal';
    voc.className = 'msgOutil';
    voc.textContent = '🎤';
    voc.title = 'Enregistrer un vocal';
    voc.addEventListener('click', ev => {
      ev.stopPropagation();
      demarrerLeVocalEC(l);
    });
    l.appendChild(voc);
  }

  /* 📷 Envoyer une photo — v1088. Devant 🙂 : c'est le geste le moins
     fréquent des deux, mais le plus visible — on le cherche des yeux
     quand on a quelque chose à montrer. */
  const pho = document.createElement('button');
  pho.type = 'button';
  pho.id = 'msgElvPhoto';
  pho.className = 'msgOutil';
  pho.textContent = '📷';
  pho.title = 'Envoyer une photo';
  pho.addEventListener('click', ev => {
    ev.stopPropagation();
    choisirUnePhoto();
  });
  l.appendChild(pho);

  /* 🙂 Le panneau des émoticônes — v1086. */
  const emo = document.createElement('button');
  emo.type = 'button';
  emo.id = 'msgElvEmo';
  emo.className = 'msgOutil';
  emo.textContent = '🙂';
  emo.title = 'Émoticônes';
  emo.addEventListener('click', ev => {
    /* Sans ça, le clic remonte jusqu'au document et referme le
       panneau dans la foulée de son ouverture. */
    ev.stopPropagation();
    basculerLePanneauEmoji(l);
  });
  l.appendChild(emo);

  const t = document.createElement('textarea');
  t.id = 'msgElvTexte';
  t.rows = 1;
  t.placeholder = 'Écris ton message…';
  t.value = brouillonsMessagerie[id] || '';
  l.appendChild(t);

  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'msgElvEnvoyer';
  b.className = 'msgEnv';
  b.textContent = '➤';
  b.title = 'Envoyer (Ctrl + Entrée)';
  /* 👍 LE POUCE — v1086. David : « une action rapide type pouce comme
     messenger ». Ce n'est pas un bouton de plus : c'est celui-ci qui
     change de visage tant qu'il n'y a rien à envoyer. */
  b.addEventListener('click', () => {
    if(($('msgElvTexte') || {}).value && $('msgElvTexte').value.trim()){
      ecrireDansLeFil();
    }else{
      envoyerLePouce();
    }
  });
  l.appendChild(b);

  /* ⚠️ LE CHAMP GRANDIT, IL NE DÉFILE PAS. Deux lignes figées
     obligeaient à faire défiler un message de cinq lignes dans une
     fenêtre de deux — on ne relit pas ce qu'on vient d'écrire, et
     c'est comme ça qu'on envoie une phrase coupée. Au-delà de six
     lignes (140 px, posés dans la feuille de style), c'est le champ
     qui défile : plus haut, le fil disparaîtrait de l'écran. */
  const ajuster = () => {
    t.style.height = 'auto';
    /* ⚠️ UN PLANCHER, PARCE QUE « scrollHeight » PEUT VALOIR ZÉRO.
       Sur un élément qui n'a pas encore sa mise en page — le tiroir
       qui s'ouvre, l'onglet caché, un redessin déclenché avant
       l'affichage — il rend 0, et le champ se refermait sur
       lui-même : une barre vide où l'on ne pouvait plus écrire.
       Une ligne au minimum, six au maximum. */
    t.style.height = Math.max(36, Math.min(t.scrollHeight, 140)) + 'px';

    /* ⚠️ « ÉTEINT » A DISPARU — v1086, et c'est voulu. Le bouton
       était gris tant qu'il n'y avait rien à envoyer ; maintenant il
       y a toujours quelque chose à envoyer, un pouce au minimum. Un
       bouton éteint qui marche quand même serait le pire des deux. */
    const vide = !t.value.trim();
    b.classList.remove('eteint');
    b.classList.toggle('pouce', vide);
    b.textContent = vide ? '👍' : '➤';
    b.title = vide ? 'Envoyer un pouce' : 'Envoyer (Ctrl + Entrée)';
  };

  t.addEventListener('input', () => {
    brouillonsMessagerie[id] = t.value;
    ajuster();
  });
  t.addEventListener('keydown', ev => {
    if(ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)){
      ev.preventDefault();
      ecrireDansLeFil();
    }
  });

  /* La hauteur se calcule sur un élément posé dans la page :
     « scrollHeight » vaut zéro tant qu'il n'y est pas. */
  setTimeout(ajuster, 0);
  return l;
}

async function ecrireDansLeFil(){
  if(!filOuvertEC || !filOuvertEC.conv) return;
  const id = filOuvertEC.conv.id;
  const champ = $('msgElvTexte');
  const bouton = $('msgElvEnvoyer');
  const texte = champ ? champ.value.trim() : '';

  if(!texte) return;
  if(texte.length > MAX_TEXTE_MESSAGERIE){
    if(typeof showToast === 'function'){
      showToast('Message trop long (' + MAX_TEXTE_MESSAGERIE + ' caractères au plus).');
    }
    return;
  }

  if(bouton) bouton.disabled = true;
  try{
    await appelPrep({ action: 'convEcrire', id: id, texte: texte });
    if(champ) champ.value = '';
    delete brouillonsMessagerie[id];
    await rafraichirLeFil();
  }catch(e){
    if(typeof showToast === 'function'){
      showToast('Le message n’est pas parti : ' + (e.message || e));
    }
  }
  if(bouton) bouton.disabled = false;
}

/* ------------------------------------------------------------
   LE BATTEMENT — étape 1 : on demande. Étape 2 : on recevra.
   ------------------------------------------------------------ */

function veillerLeFil(){
  arreterLaVeilleDuFil();
  /* ⚠️ QUATRE SECONDES, OU TRENTE SI LE DIRECT RÉPOND — étape 2.
     Le sondage ne disparaît jamais : il devient le FILET. Une
     connexion peut mourir sans le dire, un Worker peut être déployé
     sans sa liaison Durable Object — et une messagerie qui ne
     marche que si le temps réel marche serait plus fragile que
     celle d'hier. */
  const pas = (typeof leDirectEstBranche === 'function' && leDirectEstBranche())
    ? PAS_SONDAGE_LENT : PAS_MESSAGERIE;
  battementMessagerie = setInterval(() => {
    if(!filOuvertEC) return arreterLaVeilleDuFil();
    /* Personne devant l'écran : relire ne servirait qu'à consommer
       des appels. C'est la règle de tous les battements de l'outil. */
    if(document.hidden) return;
    if(typeof reseauEnPause === 'function' && reseauEnPause()) return;
    rafraichirLeFil(true);
  }, pas);
}

function arreterLaVeilleDuFil(){
  if(battementMessagerie){ clearInterval(battementMessagerie); battementMessagerie = null; }
}

/* ⚠️ UN ACCESSEUR, ET PAS LA VARIABLE — v1070.

   ec-bureau.js a besoin de savoir si un fil est ouvert, pour ne pas
   compter deux fois. Mais « filOuvertEC » est un « let » de niveau
   racine : c'est une liaison lexicale globale, pas une propriété de
   window, et un « typeof » posé dessus LÈVE si le module n'est pas
   encore évalué — au lieu de rendre « undefined » comme on
   l'attendrait. Un « typeof » sur une DÉCLARATION DE FONCTION, lui,
   est sûr en toutes circonstances. C'est la règle à suivre pour tout
   ce qu'un module demande à un autre. */
function unFilEstOuvert(){
  return !!filOuvertEC;
}

/* Le battement tourne-t-il ? « unFilEstOuvert » ne répond pas à
   cette question-là : un fil reste en mémoire quand on referme le
   tiroir, exprès, pour le retrouver en le rouvrant. */
function veilleDuFilEnCours(){
  return battementMessagerie !== null;
}

async function rafraichirLeFil(silencieux){
  if(!filOuvertEC || !filOuvertEC.conv) return;
  const id = filOuvertEC.conv.id;
  const avant = (filOuvertEC.messages || []).length;

  let d;
  try{
    d = await appelPrep({ action: 'convFil', id: id });
  }catch(e){
    if(!silencieux && typeof showToast === 'function'){
      showToast('Lecture impossible : ' + (e.message || e));
    }
    return;
  }
  if(!filOuvertEC || !filOuvertEC.conv || filOuvertEC.conv.id !== id) return;

  const viser = filOuvertEC.viser;
  filOuvertEC = d;
  filOuvertEC.viser = 0;

  const combien = (d.messages || []).length;
  /* ⚠️ ON NE REDESSINE QUE SI QUELQUE CHOSE A CHANGÉ. Redessiner
     toutes les quatre secondes ferait sauter le défilement et
     reprendrait le focus du champ à chaque fois : la messagerie
     deviendrait impossible à utiliser à deux. */
  const dernier = combien ? d.messages[combien - 1].rang : 0;

  /* ⚠️ ET UNE RÉACTION NE CHANGE NI LE NOMBRE DE MESSAGES NI LE
     DERNIER RANG — v1086. Les deux repères ci-dessus l'auraient donc
     laissée invisible jusqu'au prochain message : on aurait livré
     des réactions qui n'apparaissent qu'au suivant. Il faut un
     troisième repère, et il doit tenir compte de QUI a réagi : deux
     personnes qui échangent leurs emoji ne changent pas le nombre de
     pastilles. */
  const bouge = (empreinteDesReactions(d) !== empreinteReacEC);

  if(combien !== avant || dernier !== rangLuEC || bouge || viser){
    filOuvertEC.viser = viser || 0;
    dessinerLeFil();
    marquerLuLeFil();
  }
}

async function chargerPlusDuFil(bouton){
  if(!filOuvertEC || !filOuvertEC.conv) return;
  const plusVieux = (filOuvertEC.messages || [])[0];
  if(!plusVieux) return;
  if(bouton){ bouton.disabled = true; bouton.textContent = 'Lecture…'; }
  try{
    const d = await appelPrep({ action: 'convFil', id: filOuvertEC.conv.id,
                                avant: plusVieux.rang });
    filOuvertEC.messages = (d.messages || []).concat(filOuvertEC.messages || []);
    filOuvertEC.encore = !!d.encore;
    dessinerLeFil();
  }catch(e){
    if(bouton){ bouton.disabled = false; bouton.textContent = '↑ Messages plus anciens'; }
    if(typeof showToast === 'function') showToast('Lecture impossible : ' + (e.message || e));
  }
}

async function marquerLuLeFil(){
  if(!filOuvertEC || !filOuvertEC.conv || !filOuvertEC.estMembre) return;
  const id = filOuvertEC.conv.id;
  try{
    await appelPrep({ action: 'convLu', id: id });
  }catch(e){
    return;                      /* la pastille se corrigera au prochain passage */
  }

  /* ⚠️ LA PASTILLE TOMBE ICI — v1085. C'est le seul endroit où l'on
     SAIT qu'un fil vient d'être lu, et c'est l'instant où l'autre
     voit apparaître « Lu par ». Attendre un battement pour le dire
     de son côté, c'est afficher pendant vingt-cinq secondes un
     message non lu que l'expéditeur voit déjà comme lu.

     ⚠️ ET ON NE DEVINE PAS LE NOUVEAU TOTAL : on retire CE fil-là de
     l'addition. Poser zéro serait effacer les autres conversations
     qui attendent vraiment. */
  const c = conversationsEC.find(x => x && x.id === id);
  /* Un fil ouvert depuis le bandeau ou une notification, sans que la
     liste ait jamais été lue : on ne touche à rien plutôt que de
     compter à partir d'une liste vide. */
  if(!c || !Number(c.nonLus || 0)) return;
  c.nonLus = 0;
  poserLesComptesMessagerie(compterLesNonLusEC());
}

/* ------------------------------------------------------------
   LES ACTIONS D'UN FIL
   ------------------------------------------------------------ */

function barreDesActionsDuFil(f){
  /* ⚠️ LA CLASSE, PAS UN STYLE EN LIGNE — v1079. C'est elle qui
     décide « rangée sur écran large, cachée ailleurs », et c'est
     aussi elle que le banc lit pour vérifier que le menu ⋯ porte
     exactement les mêmes actions. Un style en ligne aurait gagné
     contre la requête de média et la rangée serait restée visible
     dans le tiroir de 400 px. */
  const l = document.createElement('div');
  l.className = 'msgActions';

  const petit = (libelle, titre, faire) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;margin:0;padding:7px 11px;font-size:12px;';
    b.textContent = libelle;
    b.title = titre || '';
    b.addEventListener('click', async () => {
      b.disabled = true;
      try{ await faire(); }
      catch(e){ if(typeof showToast === 'function') showToast('Impossible : ' + (e.message || e)); }
      b.disabled = false;
    });
    l.appendChild(b);
    return b;
  };

  const peutGerer = typeof aDroit !== 'function' ||
                    aDroit('messagerie_bureau') || aDroit('messagerie_admin');

  /* ⚠️ L'ÉTAT DE L'OBJET SE CHANGE OÙ ON LIT LA DEMANDE. Le bureau
     ouvre le fil 🧤 pour savoir de quoi il s'agit : l'envoyer dans
     un autre écran pour cliquer « Retrouvé » est un aller-retour
     qu'on ne fait pas, et donc un objet qui reste « signalé »
     pendant trois semaines. La liste 🧤 reste la vue d'ensemble ;
     ici, c'est le geste. */
  if(peutGerer && (f.conv || {}).genre === 'oubli'){
    const o = (typeof objetDuFil === 'function') ? objetDuFil(f) : null;
    const etat = (o && o.etat) || 'signale';
    ((typeof SUITES_OBJET !== 'undefined' && SUITES_OBJET[etat]) || [])
      .forEach(suite => {
        const se = ETATS_OBJET_EC[suite];
        petit(se.emoji + ' ' + se.nom, 'L’élève reçoit la réponse ici même',
          async () => {
            await appelPrep({ action: 'objetEtat', conversation: f.conv.id,
                              etat: suite });
            if(typeof compterLesObjets === 'function') await compterLesObjets();
            await ouvrirLeFil(f.conv.id);
          });
      });
  }

  /* ⚠️ « PARTICIPANTS », PAS « AJOUTER ». David, le 8 octobre :
     « il faut que l'on puisse le rajouter et enlever à la main dans
     des groupes ». Le bouton d'avant ne savait qu'ajouter, et il
     demandait le nom au clavier — il ouvre maintenant le sélecteur,
     où l'on voit qui est dedans et où l'on retire d'une croix. */
  if(peutGerer){
    petit('👥 Participants',
          'Voir qui est dedans, ajouter, retirer',
          () => ecranMembresDuFil(f));
  }

  petit('📤 Exporter', 'Le fil entier en texte, à copier', () => exporterLeFil(f));

  if(peutGerer){
    const clos = Number((f.conv || {}).fermee || 0);
    petit(clos ? '↩️ Rouvrir' : '🗄️ Fermer',
          clos ? 'La conversation redevient active'
               : 'Elle reste lisible, on n’y écrit plus',
          async () => {
            await appelPrep({ action: 'convFermer', id: f.conv.id,
                              fermee: clos ? '0' : '1' });
            await ouvrirLeFil(f.conv.id);
          });
  }

  return l;
}

async function exporterLeFil(f){
  const d = await appelPrep({ action: 'convExport', id: f.conv.id });
  const texte = (d && d.texte) || '';
  if(!texte){
    if(typeof showToast === 'function') showToast('Rien à exporter.');
    return;
  }
  try{
    await navigator.clipboard.writeText(texte);
    if(typeof showToast === 'function') showToast('Conversation copiée ✅');
  }catch(e){
    /* Le presse-papiers est refusé sur certains navigateurs de
       tablette : on montre alors le texte, à sélectionner à la
       main. Mieux qu'un échec muet. */
    if(typeof informer === 'function') await informer(texte.slice(0, 4000));
  }
}

/* ============================================================
   👥 LE SÉLECTEUR DE PARTICIPANTS

   David, le 8 octobre : « met moi des listes deroulantes pour
   choisir avec qui on discute plutôt que des cases dans lesquel il
   faut rentrer les noms au hasard ». Et : « il faut que l'on puisse
   le rajouter et enlever à la main dans des groupes ».

   ⚠️ CE N'ÉTAIT PAS UNE QUESTION DE LAIDEUR. L'écran d'avant
   demandait un nom qui devait correspondre AU CARACTÈRE PRÈS, et ma
   propre phrase d'aide l'avouait : « un nom approximatif ouvre une
   conversation que personne ne retrouvera ». J'avais écrit un
   avertissement là où il fallait un empêchement. Ici on ne peut
   choisir qu'un nom qui existe — la faute devient impossible, et la
   phrase d'aide disparaît avec elle.

   ⚠️ UN SEUL SÉLECTEUR POUR LES DEUX ÉCRANS. Il sert à ouvrir une
   conversation ET à modifier les participants d'un groupe déjà
   ouvert. Deux copies, c'était deux listes à tenir d'accord, et la
   deuxième aurait pris du retard dès la première correction.

   ⚠️ UN GROUPE AJOUTÉ EST FIGÉ, et David l'a tranché : « il n'entre
   pas tout seul il faut que l'on puisse le rajouter et enlever à la
   main ». Le raccourci « examen du 14/10 » pose les six noms AU
   MOMENT DU CLIC, et on les voit en pastilles. Un septième inscrit
   la semaine suivante n'entre pas dans la conversation — c'est la
   règle des accès élèves, dans l'autre sens : rien ne s'ouvre sans
   qu'une main l'ait fait.
   ============================================================ */

/* Ce que le sélecteur tient pendant qu'on le remplit : deux listes
   de NOMS, sans doublon, dans l'ordre d'ajout. */
let choixUsers = [];
let choixEleves = [];

/* Les raccourcis de groupe, calculés une fois à l'ouverture de
   l'écran : une session d'examen, une formation. Chacun porte ses
   noms — c'est ce qui permet de poser six élèves d'un clic et de
   les voir ensuite un par un. */
let raccourcisEleves = [];

function ajouterAuChoix(liste, nom){
  const propre = String(nom || '').trim();
  if(!propre) return false;
  const cle = normaliserMessagerie(propre);
  if(liste.some(x => normaliserMessagerie(x) === cle)) return false;
  liste.push(propre);
  return true;
}

function retirerDuChoix(liste, nom){
  const cle = normaliserMessagerie(nom);
  const i = liste.findIndex(x => normaliserMessagerie(x) === cle);
  if(i >= 0) liste.splice(i, 1);
}

/* ------------------------------------------------------------
   D'OÙ VIENNENT LES LISTES

   ⚠️ COMPTES ET ÉLÈVES SONT DÉJÀ EN MÉMOIRE AU DÉMARRAGE. Les
   proposer ne coûte rien. Les sessions d'examen, elles, ne sont
   lues qu'en ouvrant 🎓 Suivi permis : on va les chercher une fois,
   et seulement si on ne les a pas. Et si un chargement manque, on
   ne bloque pas l'écran — on perd un raccourci, pas l'écran.

   ⚠️ DEUX LISTES CÔTÉ SERVEUR, DEUX FORMES. « moniteursActifs »
   est une liste de noms — ceux qui donnent des cours. « comptesActifs »
   est une liste d'objets { nom, role, cours } — TOUT LE MONDE. On
   veut tout le monde : le bureau n'enseigne pas et doit pouvoir
   être mis dans un groupe.
   ------------------------------------------------------------ */
function lesComptesDeLEquipe(){
  const vus = {};
  const out = [];
  const poser = n => {
    const propre = String((n && n.nom) || n || '').trim();
    if(!propre) return;
    const cle = normaliserMessagerie(propre);
    if(!cle || vus[cle]) return;
    vus[cle] = true;
    out.push(propre);
  };
  if(typeof comptesActifs !== 'undefined') (comptesActifs || []).forEach(poser);
  if(typeof moniteursActifs !== 'undefined') (moniteursActifs || []).forEach(poser);
  return out.sort((a, b) => a.localeCompare(b, 'fr'));
}

function tousLesElevesConnus(){
  return (typeof elevesConnus !== 'undefined' ? (elevesConnus || []) : [])
    .slice().sort((a, b) => String(a).localeCompare(String(b), 'fr'));
}

async function preparerLesListesDuSelecteur(){
  /* Les comptes : sans eux la liste déroulante « Nous » serait vide
     et on ne pourrait mettre personne. */
  try{
    if(!lesComptesDeLEquipe().length && typeof chargerMoniteurs === 'function'){
      await chargerMoniteurs();
    }
  }catch(e){ /* on dessinera avec ce qu'on a */ }

  /* Les élèves : c'est la liste qui VALIDE le nom tapé. Vide, elle
     refuserait tous les noms — c'est le seul chargement dont on ne
     peut pas se passer. */
  try{
    if(!tousLesElevesConnus().length && typeof chargerEleves === 'function'){
      await chargerEleves();
    }
  }catch(e){ /* le champ dira « pas dans la liste » : c'est honnête */ }

  raccourcisEleves = [];

  /* Les sessions d'examen : chacune porte ses places, et chaque
     place porte son élève — ou rien, si la place est vide. */
  try{
    if(typeof sessionsPermis === 'undefined' || !sessionsPermis.length){
      if(typeof chargerSessionsPermis === 'function') await chargerSessionsPermis();
    }
    (typeof sessionsPermis !== 'undefined' ? (sessionsPermis || []) : []).forEach(s => {
      const noms = (s.eleves || []).map(p => String((p && p.eleve) || '').trim())
                                   .filter(Boolean);
      if(!noms.length) return;
      raccourcisEleves.push({
        cle: 'session:' + s.id,
        nom: '🎓 Examen du ' + jourCourtMessagerie(s.date) +
             (s.centre ? ' — ' + s.centre : '') + ' (' + noms.length + ')',
        noms: noms
      });
    });
  }catch(e){ /* sessions injoignables : les formations suffiront */ }

  /* Les formations : elles viennent des fiches du répertoire. */
  try{
    if(typeof fichesEleves !== 'undefined' && !fichesEleves.length &&
       typeof chargerFiches === 'function'){
      await chargerFiches();
    }
    const parFormation = {};
    (typeof fichesEleves !== 'undefined' ? (fichesEleves || []) : []).forEach(f => {
      const nom = String((f && f.eleve) || '').trim();
      const fo = String((f && f.formation) || '').trim();
      if(!nom || !fo) return;
      (parFormation[fo] = parFormation[fo] || []).push(nom);
    });
    Object.keys(parFormation).sort((a, b) => a.localeCompare(b, 'fr')).forEach(fo => {
      raccourcisEleves.push({
        cle: 'formation:' + fo,
        nom: '📚 ' + fo + ' (' + parFormation[fo].length + ')',
        noms: parFormation[fo]
      });
    });
  }catch(e){ /* répertoire non chargé : les sessions suffiront */ }

  return raccourcisEleves;
}

function jourCourtMessagerie(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || '');
}

/* ------------------------------------------------------------
   LE DESSIN

   Deux blocs — « Nous » et « Les élèves » — qui ne diffèrent que
   par ce qu'ils proposent. Le premier est une liste déroulante :
   vous êtes cinq. Le second est un champ qui FILTRE : vous avez
   deux cents élèves, et une liste déroulante de deux cents lignes
   sur une tablette, c'est un ascenseur qu'on fait défiler au pouce
   pendant dix secondes. David, le 8 octobre : « Oui le champ qui
   filtre ».
   ------------------------------------------------------------ */

function blocChoixEquipe(surChangement){
  const z = document.createElement('div');

  const lab = document.createElement('label');
  lab.setAttribute('for', 'msgElvQui');
  lab.textContent = 'Nous';
  z.appendChild(lab);

  const sel = document.createElement('select');
  sel.id = 'msgElvQui';
  sel.style.cssText = 'margin-bottom:10px;';

  const refaire = () => {
    const restants = lesComptesDeLEquipe().filter(n =>
      !choixUsers.some(x => normaliserMessagerie(x) === normaliserMessagerie(n)));
    sel.innerHTML = '<option value="">＋ Ajouter quelqu’un de l’équipe…</option>' +
      (restants.length > 1
        ? '<option value="*">— Toute l’équipe (' + restants.length + ')</option>'
        : '') +
      restants.map(n => '<option value="' + echapper(n) + '">' +
                        echapper(n) + '</option>').join('');
    sel.disabled = !restants.length;
  };
  refaire();

  sel.addEventListener('change', () => {
    const v = sel.value;
    sel.value = '';
    if(!v) return;
    /* ⚠️ « TOUTE L'ÉQUIPE » POSE LES NOMS, ELLE N'EST PAS UN GROUPE.
       David l'a demandée — « Oui » — et elle suit la même règle que
       les raccourcis d'élèves : les comptes entrent un par un,
       visibles en pastilles, et se retirent un par un. Un « tout le
       monde » qui resterait vivant ferait entrer le prochain
       embauché dans des conversations d'il y a six mois. */
    if(v === '*') lesComptesDeLEquipe().forEach(n => ajouterAuChoix(choixUsers, n));
    else ajouterAuChoix(choixUsers, v);
    refaire();
    surChangement();
  });
  z.appendChild(sel);

  const past = document.createElement('div');
  past.id = 'msgElvPastillesQui';
  z.appendChild(past);

  z._refaire = refaire;
  return z;
}

function blocChoixEleves(surChangement){
  const z = document.createElement('div');

  const lab = document.createElement('label');
  lab.setAttribute('for', 'msgElvCherchEleve');
  lab.textContent = 'Les élèves';
  z.appendChild(lab);

  /* ⚠️ LA MÊME LISTE QUE LE CHAMP « ÉLÈVE » DE L'ÉCRAN DE COURS.
     « listeEleves » est le <datalist> que remplit chargerEleves :
     tous les noms, déjà en mémoire du navigateur. On tape trois
     lettres, la liste se réduit ; on ne peut donc pas inventer un
     nom, et ça ne coûte aucun appel. */
  const ch = document.createElement('input');
  ch.type = 'text';
  ch.id = 'msgElvCherchEleve';
  ch.setAttribute('list', 'listeEleves');
  ch.setAttribute('autocomplete', 'off');
  ch.placeholder = '🔍 Tape trois lettres de son nom…';
  ch.style.cssText = 'margin-bottom:10px;';

  const poser = () => {
    const nom = ch.value.trim();
    if(!nom) return;
    const exact = tousLesElevesConnus().find(x =>
      normaliserMessagerie(x) === normaliserMessagerie(nom));
    if(!exact){
      /* On ne refuse pas sèchement : on dit ce qui ne va pas, et on
         laisse ce qui est tapé pour qu'il puisse corriger. */
      if(typeof showToast === 'function'){
        showToast('« ' + nom + ' » n’est pas dans la liste des élèves.');
      }
      return;
    }
    ajouterAuChoix(choixEleves, exact);
    ch.value = '';
    surChangement();
  };
  ch.addEventListener('change', poser);
  ch.addEventListener('keydown', ev => {
    if(ev.key === 'Enter'){ ev.preventDefault(); poser(); }
  });
  z.appendChild(ch);

  if(raccourcisEleves.length){
    const sel = document.createElement('select');
    sel.id = 'msgElvGroupes';
    sel.style.cssText = 'margin-bottom:10px;';
    sel.innerHTML = '<option value="">＋ Ajouter un groupe entier…</option>' +
      raccourcisEleves.map(r => '<option value="' + echapper(r.cle) + '">' +
                                echapper(r.nom) + '</option>').join('');
    sel.addEventListener('change', () => {
      const r = raccourcisEleves.find(x => x.cle === sel.value);
      sel.value = '';
      if(!r) return;
      /* Les noms entrent UN PAR UN, et se voient. Le raccourci est
         un geste, pas un lien : voir le ⚠️ en tête de ce bloc. */
      r.noms.forEach(n => ajouterAuChoix(choixEleves, n));
      surChangement();
    });
    z.appendChild(sel);
  }

  const past = document.createElement('div');
  past.id = 'msgElvPastillesEleves';
  z.appendChild(past);

  return z;
}

/* Une pastille par personne choisie, avec sa croix. C'est le seul
   endroit où l'on voit QUI sera dans la conversation — un compte
   sans les noms ne se vérifie pas. */
function dessinerLesPastilles(){
  [[$('msgElvPastillesQui'), choixUsers, false],
   [$('msgElvPastillesEleves'), choixEleves, true]
  ].forEach(([zone, liste, estEleve]) => {
    if(!zone) return;
    zone.innerHTML = '';
    zone.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px;';

    if(!liste.length){
      const v = document.createElement('div');
      v.style.cssText = 'font-size:12.5px;color:var(--muted);font-style:italic;';
      v.textContent = estEleve ? 'Aucun élève pour l’instant.'
                               : 'Personne de l’équipe pour l’instant.';
      zone.appendChild(v);
      return;
    }

    liste.forEach(nom => {
      const p = document.createElement('span');
      /* ⚠️ --on-accent SUR UN FOND D'ACCENT, ET RIEN D'AUTRE.
         La leçon est écrite en toutes lettres dans index.html depuis
         la v915 — « Démarrer le cours » en blanc sur citron, 1,21:1
         de contraste — et je l'ai refaite ici : les pastilles de
         l'équipe héritaient du texte clair de la page sur un fond
         --orange-soft, qui est un citron pâle dans LES DEUX thèmes.
         --on-accent vaut #0B0B0B partout et ne veut dire qu'une
         chose : le texte qu'on pose sur l'accent. */
      p.style.cssText = 'display:inline-flex;align-items:center;gap:7px;' +
        'padding:7px 11px;border-radius:999px;font-size:13px;font-family:inherit;' +
        (estEleve
          ? 'border:1px solid var(--line);background:transparent;color:var(--cream);'
          : 'border:1px solid var(--orange);background:var(--orange-soft);' +
            'color:var(--on-accent);font-weight:700;');
      p.appendChild(document.createTextNode(nom));

      const x = document.createElement('span');
      x.textContent = '✕';
      x.title = 'Retirer';
      x.style.cssText = 'font-weight:700;cursor:pointer;font-size:14px;line-height:1;' +
        'opacity:.6;' + (estEleve ? 'color:var(--cream);' : 'color:var(--on-accent);');
      x.addEventListener('click', () => {
        retirerDuChoix(liste, nom);
        dessinerLesPastilles();
        majAvisDeLaConversation();
        const zq = $('msgElvQui');
        if(zq && zq.parentNode && zq.parentNode._refaire) zq.parentNode._refaire();
      });
      p.appendChild(x);
      zone.appendChild(p);
    });
  });

  const c = $('msgElvCompte');
  if(c){
    const bouts = [];
    if(choixEleves.length) bouts.push(choixEleves.length + ' élève' +
                                      (choixEleves.length > 1 ? 's' : ''));
    if(choixUsers.length) bouts.push(choixUsers.length + ' de l’équipe');
    c.textContent = bouts.join(' · ');
  }
}

/* ============================================================
   CE QUE TU VEUX ÉCRIRE — v1080

   David, le 8 octobre : « je ne comprends pas l'utilité de la case
   quelle sorte juste soit un groupe ou là on met les utilisateurs
   et les élèves et le titre du groupe, soit à quelqu'un directement
   en mon nom, soit à quelqu'un au nom du bureau ».

   ⚠️ IL AVAIT RAISON, ET LA FAUTE A UN NOM : le mot « sorte »
   venait de la base de données. Un fil porte un « genre » — utile
   au serveur — et je l'avais recopié tel quel dans l'écran. On
   demandait donc de choisir un mot technique (« interne ») au lieu
   de choisir ce qu'on veut faire. Ses trois phrases sont les
   bonnes, et le genre se déduit tout seul : « à quelqu'un » devient
   « interne » si c'est un collègue, « moniteur » si c'est un élève.

   ⚠️ ET « À QUELQU'UN, EN MON NOM » EST NOUVEAU POUR LES MONITEURS.
   Jusqu'ici, ouvrir une conversation demandait « Boîte du bureau » :
   un moniteur pouvait répondre partout où on l'avait mis, et
   n'ouvrir nulle part. Sa deuxième demande du 8 octobre : « il faut
   aussi qu'un moniteur puisse envoyer en direct à l'élève et pas au
   nom du bureau ». La boîte du bureau n'est donc PAS membre de ce
   fil — c'est tout le sens de « en mon nom » — et la supervision le
   voit quand même, avec sa ligne de journal. Sa réponse : « tu as
   raison le bureau non la supervision oui ».
   ============================================================ */

const SORTES_CONVERSATION = [
  { cle: 'direct', emoji: '👤', nom: 'À quelqu’un, en mon nom',
    sous: 'Un collègue ou un élève. C’est signé de toi, et c’est entre vous.',
    droit: 'messagerie' },
  { cle: 'bureau', emoji: '🏢', nom: 'À un élève, au nom du bureau',
    sous: 'La boîte du bureau est dedans : tous ceux qui en sont le voient ' +
          'et peuvent répondre.',
    droit: 'bureau' },
  { cle: 'groupe', emoji: '👥', nom: 'Un groupe',
    sous: 'Un nom, des collègues, des élèves. Discussion ou annonce.',
    droit: 'bureau' }
];

let sorteChoisie = 'direct';

/* ⚠️ OUVRIR UNE CONVERSATION DEMANDE « 💬 Messagerie : Modifier »,
   ET RIEN DE PLUS — v1087.

   David, le 9 octobre : « je dois mettre l'accès sur superviser pour
   qu'un moniteur puisse créer une conversation, sauf que là il voit
   les conversations des autres alors qu'il ne doit pas ». Il a cru
   qu'il manquait un droit. Il manquait une correction.

   Depuis la v1080 — sa demande : « il faut aussi qu'un moniteur
   puisse envoyer en direct à l'élève et pas au nom du bureau » — le
   SERVEUR dit : ouvrir une conversation en son nom demande
   « messagerie » en modification ; un GROUPE ou une conversation AU
   NOM DU BUREAU demandent en plus la boîte du bureau. L'écran, lui,
   était resté sur la règle d'avant et cachait le bouton à tous ceux
   qui n'étaient pas du bureau. Pour le leur rendre il fallait donc
   leur donner la supervision — c'est-à-dire les conversations de
   toute l'école en échange d'un bouton. Un contrôle d'écran plus
   strict que celui du serveur ne protège rien : il pousse à ouvrir
   bien plus grand que nécessaire.

   ⚠️ ET CE CONTRÔLE-CI NE DÉCIDE QUE D'UNE CHOSE : peut-on en ouvrir
   une, du tout. Le réglage fin est juste en dessous, dans
   « sortesPermises » — c'est lui qui ne propose « au nom du bureau »
   et « un groupe » qu'à qui y a droit. Deux questions, deux
   endroits ; les mêler est exactement ce qui a produit ce bug. */
function peutOuvrirUneConversation(){
  if(typeof peutModifier !== 'function') return true;
  return peutModifier('messagerie');
}

/* ⚠️ L'ÉCRAN NE PROPOSE QUE CE QU'ON A LE DROIT DE FAIRE. Un
   moniteur ne voit qu'un bouton, et c'est mieux qu'un refus après
   coup : un écran qui laisse choisir puis dit non est un écran qui
   ment. */
function sortesPermises(){
  const bureau = (typeof aDroit !== 'function') ||
                 aDroit('messagerie_bureau') || aDroit('messagerie_admin');
  return SORTES_CONVERSATION.filter(s => s.droit !== 'bureau' || bureau);
}

/* Le genre, côté serveur, se DÉDUIT de la sorte et de qui on a
   choisi. Plus personne ne le tape. */
function genreDeLaSorte(){
  if(sorteChoisie === 'groupe') return 'groupe';
  if(sorteChoisie === 'bureau') return 'bureau';
  return choixEleves.length ? 'moniteur' : 'interne';
}

function poserLesSortes(){
  const z = $('msgElvSortes');
  const zt = $('msgElvZoneTitre');
  const zm = $('msgElvZoneMode');

  if(zt) zt.style.display = (sorteChoisie === 'groupe') ? '' : 'none';
  if(zm) zm.style.display = (sorteChoisie === 'groupe') ? '' : 'none';

  /* ⚠️ « AJOUTER UN GROUPE ENTIER » N'A PAS DE SENS À UNE PERSONNE.
     Poser six élèves d'un clic dans une conversation qui n'en
     accepte qu'un, c'est proposer un geste qu'on refusera juste
     après. Le raccourci ne sert qu'au groupe. */
  const zg = $('msgElvGroupes');
  if(zg) zg.style.display = (sorteChoisie === 'groupe') ? '' : 'none';

  if(!z) return;

  z.innerHTML = '';
  sortesPermises().forEach(s => {
    const on = (sorteChoisie === s.cle);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = on ? '' : 'btn btn-secondary';
    b.style.cssText = 'display:flex;gap:12px;align-items:flex-start;width:100%;' +
      'margin:0 0 9px;padding:13px 14px;border-radius:13px;text-align:left;' +
      'font-family:inherit;cursor:pointer;' +
      (on ? 'background:var(--orange-soft);border:1px solid var(--orange);' +
            'color:var(--on-accent);' : '');

    const e = document.createElement('span');
    e.style.cssText = 'font-size:20px;flex:0 0 auto;line-height:1.2;';
    e.textContent = s.emoji;
    b.appendChild(e);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    const t1 = document.createElement('span');
    t1.style.cssText = 'display:block;font-size:14.5px;font-weight:800;line-height:1.3;';
    t1.textContent = s.nom;
    const t2 = document.createElement('span');
    /* ⚠️ « font-weight:400 » EXPLICITE. La classe .btn pose 700 sur
       le bouton entier : sans ça, la phrase d'explication sortait en
       gras et aussi noire que le titre — deux titres, aucune
       explication. */
    t2.style.cssText = 'display:block;font-size:12px;margin-top:3px;line-height:1.45;' +
      'font-weight:400;' +
      (on ? 'color:var(--on-accent);opacity:.75;' : 'color:var(--muted);');
    t2.textContent = s.sous;
    t.appendChild(t1);
    t.appendChild(t2);
    b.appendChild(t);

    b.addEventListener('click', () => {
      if(sorteChoisie === s.cle) return;
      sorteChoisie = s.cle;
      poserLesSortes();
      poserLesModes();
      majAvisDeLaConversation();
    });
    z.appendChild(b);
  });
}


/* ------------------------------------------------------------
   OUVRIR UNE CONVERSATION
   ------------------------------------------------------------ */

/* Le fil dont on modifie les participants. Null quand on en ouvre
   un neuf — c'est ce qui distingue les deux usages du même écran. */
let filEnModification = null;

/* ⚠️ UN JETON, PAS UNE COMPARAISON D'ÉTAT. L'écran attend les
   listes avant de se dessiner ; pendant cette attente, un clic
   ailleurs peut avoir peint autre chose dans la même zone. On
   compte les tours : si le nôtre n'est plus le dernier, on ne
   repeint pas par-dessus ce qui est arrivé après nous. */
let tourDesParticipants = 0;

async function ecranNouvelleConversation(){
  filEnModification = null;
  choixUsers = [];
  choixEleves = [];
  /* La première sorte permise : pour un moniteur c'est la seule, et
     pour le bureau c'est celle qu'on fait le plus souvent. */
  sorteChoisie = (sortesPermises()[0] || {}).cle || 'direct';
  modeChoisi = 'discussion';

  /* Celui qui ouvre est dedans : un groupe créé et pas rejoint est
     un groupe qu'on ne verra jamais se remplir. */
  ajouterAuChoix(choixUsers, (typeof ACCES !== 'undefined' && ACCES.moniteur) || '');

  await dessinerEcranParticipants({
    titre: '👥 Nouvelle conversation',
    avecSorte: true,
    bouton: '👥 Ouvrir la conversation',
    faire: creerUnGroupe
  });
}

/* ------------------------------------------------------------
   MODIFIER LES PARTICIPANTS D'UN FIL EXISTANT

   David, le 8 octobre : « il faut que l'on puisse le rajouter et
   enlever à la main dans des groupes ».

   ⚠️ C'EST LE MÊME ÉCRAN, ET C'EST VOULU. Il y avait ici une
   fenêtre qui demandait d'écrire un nom au clavier — la même faute
   que l'écran de création, au même endroit du geste. Deux écrans
   pour choisir des gens, c'était deux occasions de se tromper de
   nom ; il n'y en a plus qu'un.
   ------------------------------------------------------------ */
async function ecranMembresDuFil(f){
  if(!f || !f.conv) return;
  filEnModification = f;

  /* On part de l'existant : on ajoute, on retire, et on enregistre
     la liste telle qu'on la voit. */
  choixUsers = (f.membres || []).filter(m => m.genre === 'user').map(m => m.qui);
  choixEleves = (f.membres || []).filter(m => m.genre === 'eleve').map(m => m.qui);

  await dessinerEcranParticipants({
    titre: '👥 Participants — ' +
           titreDuFil(Object.assign({}, f.conv, { membres: f.membres })),
    avecSorte: false,
    avecBoite: (f.membres || []).some(m => m.genre === 'boite'),
    bouton: '💾 Enregistrer les participants',
    faire: enregistrerLesParticipants
  });
}

async function dessinerEcranParticipants(opt){
  const zone = zoneDeLaMessagerie();
  if(!zone) return;

  /* Le fil au moment du dessin : le bouton ← doit revenir là d'où
     l'on vient, même si la variable change entre-temps. */
  const depuis = filEnModification;
  const tour = ++tourDesParticipants;

  /* ⚠️ ON ÉTEINT LE BATTEMENT DU FIL, ET ON LÂCHE LE FIL OUVERT.

     Sans ça, l'écran des participants vivait quatre secondes : le
     sondage de « veillerLeFil » rappelait « dessinerLeFil », qui
     repeint la MÊME zone, et la liste déroulante disparaissait sous
     le fil au milieu d'un choix. Lâcher « filOuvertEC » est l'autre
     moitié de la même précaution : « afficherMessagerie » et
     « rafraichirLeFil » le relisent tous les deux pour décider s'ils
     ont le droit de repeindre. On le rouvre proprement au retour. */
  arreterLaVeilleDuFil();
  if(typeof couperLeDirect === 'function') couperLeDirect();
  filOuvertEC = null;

  zone.innerHTML = (typeof htmlAttente === 'function')
    ? htmlAttente('Lecture des listes…')
    : '<div class="empty">Lecture des listes…</div>';

  /* Les comptes, les élèves, les sessions et les formations — une
     fois, AVANT de dessiner : une liste déroulante qui se remplit
     après coup fait choisir dans le vide. */
  try{ await preparerLesListesDuSelecteur(); }
  catch(e){ raccourcisEleves = []; }

  /* L'écran a pu changer pendant l'attente (il a refermé le tiroir,
     ouvert un fil) : on ne repeint pas par-dessus. */
  if(tour !== tourDesParticipants || zoneDeLaMessagerie() !== zone) return;

  zone.innerHTML = '';

  /* --- l'en-tête --- */
  const tete = document.createElement('div');
  tete.style.cssText = 'display:flex;gap:10px;align-items:center;' +
    'padding-bottom:10px;border-bottom:1px solid var(--line);margin-bottom:14px;';
  const retour = document.createElement('button');
  retour.className = 'btn btn-secondary';
  retour.style.cssText = 'width:auto;margin:0;padding:8px 12px;font-size:14px;';
  retour.textContent = '←';
  retour.addEventListener('click', () => {
    if(depuis && depuis.conv){ ouvrirLeFil(depuis.conv.id); return; }
    /* ⚠️ ON REVIENT À LA LISTE, PAS À UNE RECHERCHE À MOITIÉ
       EFFACÉE. « dessinerLaListeMessagerie » s'arrête net quand un
       mot cherché traîne encore — c'est ce qui protège les
       trouvailles du battement de 90 secondes. Vu d'ici, ça laissait
       l'écran des participants en place : le ← ne faisait rien.
       Revenir en arrière, c'est sortir de la recherche aussi. */
    chercheMessagerie = '';
    afficherMessagerie(true);
  });
  tete.appendChild(retour);
  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:15px;font-weight:800;';
  t.textContent = opt.titre;
  tete.appendChild(t);
  zone.appendChild(tete);

  /* --- la sorte, le nom du groupe, le mode --- */
  if(opt.avecSorte){
    const h = document.createElement('div');
    h.innerHTML =
      '<label>Tu veux écrire…</label>' +
      '<div id="msgElvSortes" style="margin-bottom:14px;"></div>' +
      '<div id="msgElvZoneTitre">' +
        '<label for="msgElvTitre">Nom du groupe</label>' +
        '<input type="text" id="msgElvTitre" placeholder="Ex : Permis du 14 octobre">' +
      '</div>' +
      '<div id="msgElvZoneMode">' +
        '<label>Comment ça marche</label>' +
        '<div id="msgElvModes" style="display:flex;gap:7px;margin-bottom:14px;' +
             'flex-wrap:wrap;"></div>' +
      '</div>';
    zone.appendChild(h);
    poserLesSortes();
    poserLesModes();
  }

  /* --- les deux sélecteurs --- */
  const bouger = () => { dessinerLesPastilles(); majAvisDeLaConversation(); };
  zone.appendChild(blocChoixEquipe(bouger));
  zone.appendChild(blocChoixEleves(bouger));

  const cpt = document.createElement('div');
  cpt.id = 'msgElvCompte';
  cpt.style.cssText = 'font-size:11.5px;color:var(--muted);margin:-6px 0 12px;';
  zone.appendChild(cpt);

  /* ⚠️ LA BOÎTE DU BUREAU NE SE RETIRE PAS D'ICI. Elle n'est pas
     une personne : c'est un droit. La retirer à la main ferait
     croire qu'on a fermé une porte que le droit « Boîte du bureau »
     réouvre aussitôt. */
  if(opt.avecBoite){
    const b = document.createElement('div');
    b.style.cssText = 'font-size:12px;color:var(--muted);margin:0 0 12px;' +
      'line-height:1.5;';
    b.textContent = '🏢 La boîte du bureau fait partie de cette conversation. ' +
      'Elle ne se retire pas d’ici : c’est le droit « Boîte du bureau » qui ' +
      'décide qui en est.';
    zone.appendChild(b);
  }

  /* --- l'avertissement --- */
  const avis = document.createElement('div');
  avis.id = 'msgElvAvis';
  avis.style.cssText = 'font-size:12.5px;line-height:1.55;padding:11px 13px;' +
    'border-radius:10px;margin-bottom:14px;background:rgba(0,0,0,.04);' +
    'color:var(--muted);';
  zone.appendChild(avis);

  /* --- le bouton --- */
  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.id = 'msgElvValider';
  b.textContent = opt.bouton;
  b.addEventListener('click', () => opt.faire(b));
  zone.appendChild(b);

  /* ⚠️ UNE DEUXIÈME FOIS, ET C'EST VOULU. « poserLesSortes » cache
     aussi le raccourci « ajouter un groupe entier », qui n'existe
     pas encore au moment du premier appel : les deux sélecteurs
     sont posés après l'en-tête. Appeler une fois de plus coûte
     trois boutons redessinés ; l'autre solution était de couper la
     fonction en deux pour une ligne. */
  if(opt.avecSorte) poserLesSortes();

  dessinerLesPastilles();
  majAvisDeLaConversation();
}

/* Deux boutons plutôt que deux ronds à cocher : c'est la forme de
   tous les autres choix de l'outil, et elle se vise au doigt. */
let modeChoisi = 'discussion';

/* ⚠️ LE MODE N'EXISTE QUE POUR UN GROUPE — v1080. « Annonce » veut
   dire « seule l'école écrit, et les élèves ne se voient pas entre
   eux » : dans une conversation à deux, les deux phrases sont
   vides de sens. L'écran ne pose donc plus la question là où elle
   n'en est pas une. */
function poserLesModes(){
  const z = $('msgElvModes');
  if(sorteChoisie !== 'groupe') modeChoisi = 'discussion';
  if(!z) return;

  z.innerHTML = '';
  [['discussion', '💬 Discussion', 'tout le monde écrit et se voit'],
   ['annonce', '📣 Annonce', 'seule l’école écrit ; les élèves ne se voient pas']
  ].forEach(([cle, nom, fin]) => {
    const b = document.createElement('button');
    b.type = 'button';
    const on = (modeChoisi === cle);
    /* ⚠️ LE BOUTON NON CHOISI PORTE LA CLASSE DE LA MAISON, pas un
       fond posé à la main. « btn-secondary » dit déjà transparent +
       liseré + --cream, dans les deux thèmes, et c'est la forme de
       tous les autres choix de l'outil. Le bouton choisi, lui, prend
       l'accent — et sur l'accent on écrit en --on-accent, jamais en
       --cream : c'est la leçon de la v915, écrite dans index.html,
       que je venais de refaire ici. */
    b.className = on ? '' : 'btn btn-secondary';
    /* « display:block », parce que .btn est un flex centré : sans
       lui, le bouton non choisi posait sa phrase d'explication À
       CÔTÉ du titre, et les deux boutons n'avaient plus la même
       forme. */
    b.style.cssText = 'display:block;flex:1 1 180px;width:auto;margin:0;' +
      'padding:11px 13px;font-size:13px;border-radius:10px;font-family:inherit;' +
      'font-weight:700;cursor:pointer;text-align:left;' +
      (on ? 'background:var(--orange-soft);border:1px solid var(--orange);' +
            'color:var(--on-accent);'
          : '');
    b.innerHTML = echapper(nom) +
      '<span style="display:block;font-size:11px;font-weight:400;margin-top:2px;' +
      'line-height:1.4;' +
      (on ? 'color:var(--on-accent);opacity:.72;' : 'color:var(--muted);') +
      '">' + echapper(fin) + '</span>';
    b.addEventListener('click', () => {
      modeChoisi = cle;
      poserLesModes();
      majAvisDeLaConversation();
    });
    z.appendChild(b);
  });
}

/* ⚠️ CE QUE LES ÉLÈVES VERRONT LES UNS DES AUTRES SE DIT AU MOMENT
   OÙ ON DÉCIDE, pas dans une documentation. Dans un groupe en
   discussion, chaque élève apprend le nom et la présence des
   autres. Ça se fait très bien — mais ça se choisit. */
function majAvisDeLaConversation(){
  const z = $('msgElvAvis');
  if(!z) return;

  const genre = filEnModification
    ? (filEnModification.conv.genre || 'groupe')
    : (($('msgElvSortes') ? genreDeLaSorte() : 'groupe'));
  const mode = filEnModification ? (filEnModification.conv.mode || 'discussion')
                                 : modeChoisi;

  /* ⚠️ CE QUE « EN MON NOM » VEUT DIRE SE DIT ICI, pas dans une
     documentation. C'est la seule phrase qui apprend au moniteur
     que le bureau ne lira pas — et à David que lui, si. */
  if(!filEnModification && sorteChoisie === 'direct'){
    const qui = choixEleves[0] || choixUsers.filter(n =>
      normaliserMessagerie(n) !==
      normaliserMessagerie((typeof ACCES !== 'undefined' && ACCES.moniteur) || ''))[0];
    z.textContent = choixEleves.length
      ? 'Ce fil est entre ' + (qui || 'l’élève') + ' et toi. La boîte du bureau ' +
        'ne le voit pas ; la supervision le voit, et sa lecture est inscrite au journal.'
      : 'Entre vous deux. Aucun élève n’y a accès.';
    return;
  }
  if(genre === 'interne'){
    z.textContent = 'Entre nous : aucun élève n’y a accès.';
    return;
  }
  if(choixEleves.length > 1 && mode === 'discussion'){
    z.textContent = 'En mode discussion, ces ' + choixEleves.length +
      ' élèves verront les noms et les messages des autres élèves du groupe. ' +
      'En mode annonce, non.';
    return;
  }
  if(choixEleves.length > 1 && mode === 'annonce'){
    z.textContent = 'En mode annonce, ces ' + choixEleves.length +
      ' élèves ne se voient pas entre eux et ne peuvent pas répondre.';
    return;
  }
  z.textContent = filEnModification
    ? 'Les arrivées et les départs s’inscrivent dans le fil : personne n’entre ' +
      'en silence dans une conversation déjà commencée.'
    : 'Le bureau fait partie de la conversation : elle ne disparaît pas avec ' +
      'la personne qui l’ouvre.';
}

async function creerUnGroupe(bouton){
  const genre = genreDeLaSorte();
  const titre = (($('msgElvTitre') || {}).value || '').trim();
  const moi = normaliserMessagerie((typeof ACCES !== 'undefined' && ACCES.moniteur) || '');
  const autres = choixUsers.filter(n => normaliserMessagerie(n) !== moi);

  /* ⚠️ LES RÈGLES SUIVENT CE QU'IL A CHOISI DE FAIRE, pas le genre
     que le serveur enregistrera. « À quelqu'un » veut dire UNE
     personne : deux noms dans une conversation à deux, c'est un
     groupe sans nom — et un groupe sans nom est introuvable six
     mois plus tard. */
  if(sorteChoisie === 'direct'){
    const combien = autres.length + choixEleves.length;
    if(combien === 0){
      if(typeof showToast === 'function') showToast('Choisis à qui tu écris.');
      return;
    }
    if(combien > 1){
      if(typeof showToast === 'function'){
        showToast('« À quelqu’un » porte sur UNE personne. ' +
                  'Pour écrire à plusieurs, ouvre un groupe.');
      }
      return;
    }
  }

  if(sorteChoisie === 'bureau' && choixEleves.length !== 1){
    if(typeof showToast === 'function'){
      showToast('Une conversation au nom du bureau porte sur UN élève.');
    }
    return;
  }

  if(sorteChoisie === 'groupe'){
    if(titre.length < 2){
      if(typeof showToast === 'function') showToast('Donne un nom au groupe.');
      return;
    }
    if(autres.length + choixEleves.length < 2){
      if(typeof showToast === 'function'){
        showToast('Un groupe, c’est au moins deux personnes avec toi.');
      }
      return;
    }
  }

  if(bouton){ bouton.disabled = true; bouton.textContent = 'Ouverture…'; }
  try{
    const d = await appelPrep({
      action: 'convCreer', genre: genre, mode: modeChoisi,
      titre: (sorteChoisie === 'groupe') ? titre : '',
      users: JSON.stringify(choixUsers), eleves: JSON.stringify(choixEleves),
      /* ⚠️ LA BOÎTE DU BUREAU N'ENTRE QUE SI ON L'A DEMANDÉ. C'est
         toute la différence entre « en mon nom » et « au nom du
         bureau », et David l'a tranché : « le bureau non, la
         supervision oui ». */
      avecBureau: (sorteChoisie === 'direct') ? '' : '1'
    });
    conversationsEC = [];
    filEnModification = null;
    await ouvrirLeFil(d.id);
  }catch(e){
    if(typeof showToast === 'function') showToast('Impossible : ' + (e.message || e));
    if(bouton){
      bouton.disabled = false;
      bouton.textContent = '👥 Ouvrir la conversation';
    }
  }
}

/* ⚠️ ON ENVOIE LA DIFFÉRENCE, PAS LA LISTE. Le serveur sait ajouter
   et retirer ; lui envoyer la liste entière l'obligerait à deviner
   qui est parti, et une ligne de système « untel rejoint la
   conversation » apparaîtrait à chaque enregistrement pour des gens
   déjà là depuis trois mois. */
async function enregistrerLesParticipants(bouton){
  const f = filEnModification;
  if(!f || !f.conv) return;

  const avantUsers = (f.membres || []).filter(m => m.genre === 'user').map(m => m.qui);
  const avantEleves = (f.membres || []).filter(m => m.genre === 'eleve').map(m => m.qui);
  const dans = (liste, nom) =>
    liste.some(x => normaliserMessagerie(x) === normaliserMessagerie(nom));

  const usersAjoutes = choixUsers.filter(n => !dans(avantUsers, n));
  const elevesAjoutes = choixEleves.filter(n => !dans(avantEleves, n));
  const retires = avantUsers.filter(n => !dans(choixUsers, n))
    .concat(avantEleves.filter(n => !dans(choixEleves, n)));

  if(!usersAjoutes.length && !elevesAjoutes.length && !retires.length){
    if(typeof showToast === 'function') showToast('Rien n’a changé.');
    await ouvrirLeFil(f.conv.id);
    return;
  }

  /* ⚠️ UNE CONVERSATION SANS PERSONNE N'EST PLUS LISIBLE PAR
     PERSONNE. La boîte du bureau et la supervision la rouvriraient,
     mais le moniteur qui se retire lui-même en dernier perdrait
     l'accès sans l'avoir demandé : on le dit avant. */
  if(!choixUsers.length && !choixEleves.length){
    if(typeof showToast === 'function'){
      showToast('Il faut laisser au moins une personne dans la conversation.');
    }
    return;
  }

  if(bouton){ bouton.disabled = true; bouton.textContent = 'Enregistrement…'; }
  try{
    await appelPrep({
      action: 'convMembres', id: f.conv.id,
      users: JSON.stringify(usersAjoutes),
      eleves: JSON.stringify(elevesAjoutes),
      retirer: JSON.stringify(retires)
    });
    conversationsEC = [];
    filEnModification = null;
    await ouvrirLeFil(f.conv.id);
  }catch(e){
    if(typeof showToast === 'function') showToast('Impossible : ' + (e.message || e));
    if(bouton){
      bouton.disabled = false;
      bouton.textContent = '💾 Enregistrer les participants';
    }
  }
}

/* ------------------------------------------------------------
   LE FIL DANS LE DOSSIER DE L'ÉLÈVE

   C'est la demande centrale : « je ne retrouve plus ce qu'un élève
   m'a dit il y'a 3 mois ». Ses conversations sont rangées dans son
   dossier, à côté de ses bilans, et cherchables.
   ------------------------------------------------------------ */

async function ongletMessagesEleve(corps, nom){
  corps.innerHTML = (typeof htmlAttente === 'function')
    ? htmlAttente('Lecture de ses conversations…')
    : '<div class="empty">Lecture de ses conversations…</div>';

  let liste = [];
  try{
    const d = await appelPrep({ action: 'convList', eleve: nom, fermees: true });
    liste = (d && d.conversations) || [];
  }catch(e){
    corps.innerHTML = '';
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = '⚠️ ' + (e.message || e);
    corps.appendChild(v);
    return;
  }

  /* L'onglet a pu changer pendant l'appel : on n'écrit pas
     par-dessus ce que le moniteur regarde maintenant. */
  if(typeof ongletPageEleve !== 'undefined' && ongletPageEleve !== 'messages') return;
  corps.innerHTML = '';

  const ch = document.createElement('input');
  ch.type = 'text';
  ch.placeholder = '🔍 Chercher dans ses conversations…';
  ch.addEventListener('keydown', async ev => {
    if(ev.key !== 'Enter') return;
    ev.preventDefault();
    const mots = ch.value.trim();
    if(mots.length < 2) return;
    const z = $('msgElvTrouves');
    if(!z) return;
    z.innerHTML = '<div class="empty">Recherche…</div>';
    try{
      const d = await appelPrep({ action: 'convChercher', mots: mots, eleve: nom });
      const t = (d && d.trouves) || [];
      z.innerHTML = '';
      z.appendChild(sousTitreMessagerie(t.length
        ? 'Trouvé pour « ' + mots + ' » · ' + t.length + ' message(s)'
        : 'Rien trouvé pour « ' + mots + ' »'));
      t.forEach(x => z.appendChild(ligneTrouveeMessagerie(x, mots)));
    }catch(e){
      z.innerHTML = '<div class="empty">⚠️ ' + echapper(e.message || e) + '</div>';
    }
  });
  corps.appendChild(ch);

  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucune conversation avec ' + echapper(nom) + '.<br>' +
      'Son espace élève ne sait pas encore écrire ici — c’est l’étape 1b.';
    corps.appendChild(v);
  }else{
    corps.appendChild(sousTitreMessagerie('Ses conversations · ' + liste.length));
    liste.forEach(c => {
      const l = document.createElement('div');
      l.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
        'padding:9px 11px;margin-bottom:7px;display:flex;gap:9px;align-items:center;';
      const g = document.createElement('div');
      g.style.cssText = 'flex:1;min-width:0;';
      const fam = GENRES_MESSAGERIE[c.genre] || { rond: '💬' };
      g.innerHTML =
        '<div style="font-size:13.5px;font-weight:700;' +
          (c.nonLus ? 'color:var(--warn-text);' : '') + '">' +
          fam.rond + ' ' + echapper(titreDuFil(c)) +
          (c.nonLus ? ' · ' + c.nonLus + ' non lu(s)' : '') + '</div>' +
        '<div style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:2px;">' +
          echapper([c.creeLe ? 'depuis le ' + c.creeLe : '',
                    c.dernierLe ? 'dernier le ' + c.dernierLe : '',
                    Number(c.fermee || 0) ? 'fermée' : ''
                   ].filter(Boolean).join(' · ')) + '</div>';
      l.appendChild(g);

      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;flex:0 0 auto;margin:0;padding:7px 11px;' +
        'font-size:12px;white-space:nowrap;';
      b.textContent = 'Ouvrir';
      b.addEventListener('click', () => {
        /* Le fil s'ouvre dans l'écran complet : un fil de discussion
           dans un onglet de dossier, c'est deux écrans qui se
           disputent la même place. */
        if(typeof afficherVue === 'function') afficherVue('messagerie', 'messagerie');
        ouvrirLeFil(c.id);
      });
      l.appendChild(b);
      corps.appendChild(l);
    });
  }

  const z = document.createElement('div');
  z.id = 'msgElvTrouves';
  corps.appendChild(z);
}

/* ------------------------------------------------------------
   LA PASTILLE — elle voyage sur le battement qui existe déjà
   ------------------------------------------------------------ */

/* Appelée par le battement de 90 secondes du bureau. Elle ne
   dessine rien : elle pose un chiffre, et se tait si la messagerie
   n'est pas ouverte à cette personne. */
async function compterLaMessagerie(){
  /* ⚠️ LE BOUTON SE DÉCIDE AVANT LE DÉPART ANTICIPÉ — v1074.

     Il était décidé APRÈS : chez quelqu'un qui n'a pas le droit, la
     fonction repartait sans jamais passer par là, et le bouton
     gardait l'état d'avant. Sur une tablette partagée — un moniteur
     qui se déconnecte, un autre qui se connecte — le second
     héritait du bouton du premier. Cacher est une décision autant
     que montrer : elle se prend dans tous les cas. */
  montrerLeBoutonMessagerie();

  /* 🔔 Une fois connecté, et une seule fois : on réenregistre
     l'abonnement de cet appareil s'il en a déjà un — étape 3. C'est
     muet, ça ne demande rien à personne, et ça répare la seule panne
     qu'on ne verrait jamais autrement : un point d'arrivée que le
     navigateur a remplacé dans son coin. */
  if(!pousseeRepriseFaite && typeof aDroit === 'function' && aDroit('messagerie') &&
     typeof ACCES !== 'undefined' && ACCES.code){
    pousseeRepriseFaite = true;
    reprendreLaPoussee();
    const filDemande = filDemandeParLAdresse();
    if(filDemande){
      /* La page s'ouvre POUR une notification : on va droit au fil,
         sans passer par la liste. */
      if(typeof afficherVue === 'function') afficherVue('messagerie', 'messagerie');
      ouvrirLeFil(filDemande);
    }
  }

  if(typeof aDroit === 'function' && !aDroit('messagerie')){
    poserPastilleMessagerie(0);
    return;
  }
  if(typeof ACCES === 'undefined' || !ACCES.code) return;

  try{
    const d = await appelPrep({ action: 'convList' });
    conversationsEC = (d && d.conversations) || [];
    const n = (d && d.nonLusTotal) || 0;
    poserLesComptesMessagerie(n);
  }catch(e){ /* la pastille attendra le prochain passage */ }
}

/* ============================================================
   ⏱️ « J'AI 2 MINUTES AVANT D'AVOIR LA NOTIFICATION » — v1079

   David, le 8 octobre. Il a raison et le chiffre est exact : le
   compteur voyageait sur le SEUL battement de 90 secondes du
   bureau, qui porte aussi des lectures du classeur. Deux messages
   reçus coup sur coup pouvaient donc attendre une minute et demie,
   et davantage si l'onglet venait d'être masqué.

   ⚠️ UN BATTEMENT À LUI, PARCE QU'IL NE COÛTE PAS LA MÊME CHOSE.
   Celui de 90 secondes interroge le classeur, dont les soixante
   lectures par minute sont partagées par toute l'école. Celui-ci ne
   touche que D1 : une requête qui lit une poignée de lignes, sur un
   quota de cinq millions par jour. Vingt-cinq secondes y tiennent
   sans discussion — et les objets oubliés, eux, restent sur les
   90 secondes : une écharpe ne se retrouve pas trois fois par
   minute.

   ⚠️ ET SURTOUT : ON RECOMPTE EN REVENANT DEVANT L'ÉCRAN. C'est le
   vrai moment où il regarde. Une tablette posée sur son support
   pendant un cours ne compte rien du tout — « document.hidden » —
   et retrouve son chiffre à la seconde où on la reprend. C'est ce
   qui fait passer « deux minutes » à « tout de suite », bien plus
   que le raccourcissement du battement.

   L'étape 2 (le Durable Object) supprimera les deux : le fil ouvert
   recevra au lieu de demander. D'ici là, voilà ce qu'on peut faire
   sans rien dépenser.
   ============================================================ */
const PAS_COMPTE_MESSAGERIE = 25000;
let battementCompteMessagerie = null;
let dernierCompteMessagerie = 0;

async function compterSiBesoin(force){
  const t = Date.now();
  /* Un retour d'écran suit souvent un clic : sans ce garde-fou,
     reprendre la tablette lancerait trois appels d'affilée. */
  if(!force && t - dernierCompteMessagerie < 5000) return;
  dernierCompteMessagerie = t;
  await compterLaMessagerie();
}

function veillerLeCompteMessagerie(){
  if(battementCompteMessagerie) return;
  battementCompteMessagerie = setInterval(() => {
    if(document.hidden) return;
    if(typeof reseauEnPause === 'function' && reseauEnPause()) return;
    /* ⚠️ ON NE SAUTE PLUS QUAND UN FIL EST OUVERT — v1085.

       Le commentaire d'avant disait « un fil ouvert a déjà son
       battement de quatre secondes, le doubler serait payer deux
       fois la même information ». C'était faux : ce battement-là
       demande « convFil », qui rend UN fil et rien d'autre. Il ne
       rapporte aucun compte global. Pendant qu'on lisait une
       conversation, un message arrivé dans une AUTRE ne faisait donc
       bouger aucune pastille — et la lecture en cours n'en effaçait
       aucune non plus.

       C'est une requête de plus toutes les vingt-cinq secondes, sur
       D1, qui n'a pas le quota de soixante lectures par minute des
       classeurs. C'est ce qu'elle coûte, et ça les vaut. */
    compterSiBesoin(true);
  }, PAS_COMPTE_MESSAGERIE);

  const revenu = () => { if(!document.hidden) compterSiBesoin(false); };
  document.addEventListener('visibilitychange', revenu);
  window.addEventListener('focus', revenu);
}

/* ⚠️ LE BOUTON RESTE, LA PASTILLE PART — v1074.

   La CB et les procédures, ses deux voisins dans l'en-tête, se
   cachent quand il n'y a rien à prendre. Celui-ci non, et David l'a
   tranché : ces deux-là ne servent qu'à PRENDRE ce qui est arrivé,
   la messagerie sert aussi à ÉCRIRE. Un bouton qui disparaît quand
   la boîte est vide, c'est un bouton introuvable le jour où l'on
   veut s'en servir en premier. */
function montrerLeBoutonMessagerie(){
  const b = $('msgElvBtn');
  if(b){
    const ouvert = (typeof aDroit !== 'function') || aDroit('messagerie');
    b.style.display = ouvert ? 'inline-flex' : 'none';
  }

  /* ✏️ LE CRAYON DU TIROIR SE DÉCIDE ICI AUSSI — v1087, ET IL NE
     L'AVAIT JAMAIS FAIT.

     Il était posé dans l'en-tête du tiroir sans aucun contrôle :
     quelqu'un en LECTURE SEULE le voyait, cliquait, remplissait
     l'écran des participants, et se faisait refuser par le serveur au
     moment d'ouvrir. Le bouton de la liste, lui, était trop strict.
     Deux boutons qui font la même chose et qui répondaient
     différemment à la même question — c'est toujours comme ça que ça
     commence.

     Et c'est bien ici qu'il faut le décider, avec son voisin : sur
     une tablette partagée, un moniteur se déconnecte et un autre se
     connecte. Décidé une seule fois au chargement de la page, le
     second héritait des boutons du premier. */
  const n = $('msgElvNeuf');
  if(n) n.style.display = peutOuvrirUneConversation() ? '' : 'none';
}

/* ============================================================
   🔴 LES DEUX PASTILLES, ET UNE SEULE VÉRITÉ — v1085

   David, le 9 octobre : « il ouvre le message et le 1 sur messagerie
   reste alors que j'ai la notification de lecture ».

   ⚠️ IL Y A DEUX PASTILLES, ET ELLES NE SE METTAIENT PAS À JOUR AU
   MÊME MOMENT. Le rond rouge de l'en-tête (le bouton 💬) ne se
   recalculait QUE dans « compterLaMessagerie », au battement de
   vingt-cinq secondes. Le compte de l'onglet, lui, se recalculait
   aussi à chaque lecture de la liste. Deux chemins pour un seul
   chiffre : il suffisait que l'un soit emprunté et pas l'autre pour
   qu'ils se contredisent.

   ⚠️ ET LE BATTEMENT ÉTAIT SAUTÉ QUAND UN FIL ÉTAIT OUVERT —
   c'est-à-dire exactement au moment où l'on vient de lire. « Un fil
   ouvert a déjà son battement de quatre secondes », disait le
   commentaire : c'est vrai, mais ce battement-là ne demande QUE le
   fil, jamais la liste. Il ne rapporte donc aucun compte global.
   Pendant qu'on lisait, plus rien ne corrigeait le rond ; en le
   refermant, « afficherMessagerie » corrigeait l'onglet et pas le
   rond. Le 1 restait jusqu'à ce que le hasard d'un battement passe.

   Trois corrections, et une seule idée : un seul chiffre, posé au
   même endroit, recalculé partout où il peut changer.
   ============================================================ */
function poserLesComptesMessagerie(total){
  const n = Number(total || 0);
  if(typeof poserCompteVue === 'function') poserCompteVue('messagerie', n);
  poserPastilleMessagerie(n);
}

/* ⚠️ LA SUPERVISION NE COMPTE PAS, ICI NON PLUS. C'est la règle de
   la v1082 : un fil qu'on surveille n'est pas un message qui nous
   attend. Le serveur l'exclut déjà de « nonLusTotal » ; quand on
   recompte à la main il faut l'exclure pareil, sinon le chiffre
   change selon le chemin qui l'a produit. */
function compterLesNonLusEC(){
  return conversationsEC
    .filter(c => c && !c.enSupervision)
    .reduce((somme, c) => somme + Number(c.nonLus || 0), 0);
}

function poserPastilleMessagerie(combien){
  const p = $('msgElvBtnN');
  if(!p) return;
  const n = Number(combien || 0);
  p.style.display = n ? 'block' : 'none';
  p.textContent = n > 99 ? '99+' : String(n);
}

/* ============================================================
   🧤 LES OBJETS OUBLIÉS — l'écran du bureau, étape 1c

   David, le 7 octobre : « les objets oubliés se perdent ».

   ⚠️ UNE LISTE QUI SE VIDE, PAS UNE CONVERSATION DE PLUS. C'est
   tout le mécanisme, et il tient en une phrase : l'objet ne
   disparaît de l'écran que parce que quelqu'un a cliqué pour dire
   ce qu'il est devenu. Une liste qui se vide toute seule au bout de
   quinze jours, c'est une écharpe perdue sans que personne ne
   l'ait décidé.

   ⚠️ ET CHAQUE CLIC RÉPOND À L'ÉLÈVE. La phrase part du serveur et
   s'écrit dans SON fil : il voit où ça en est sans redemander, et
   le bureau n'a pas de deuxième chose à écrire. C'est la seule
   raison pour laquelle cet écran n'est pas un tableau de plus à
   tenir à jour.
   ============================================================ */

/* Les quatre états, vus de l'écran. Les PHRASES envoyées à l'élève,
   elles, sont côté Worker et nulle part ailleurs : recopiées ici,
   elles auraient fini par dire autre chose que ce qu'il reçoit. */
const ETATS_OBJET_EC = {
  signale:     { emoji: '🧤', nom: 'Signalé',
                 sous: 'personne n’a encore regardé', couleur: 'var(--warn-text)' },
  retrouve:    { emoji: '✅', nom: 'Retrouvé',
                 sous: 'à récupérer au bureau', couleur: 'var(--accent-text)' },
  rendu:       { emoji: '🤝', nom: 'Rendu',
                 sous: 'c’est réglé', couleur: 'var(--muted)' },
  introuvable: { emoji: '🙈', nom: 'Introuvable',
                 sous: 'cherché, pas retrouvé', couleur: 'var(--muted)' }
};

/* Ce que chaque état propose comme suite. On ne montre jamais le
   bouton de l'état courant : un bouton qui ne fait rien use la
   confiance dans tous les autres. */
const SUITES_OBJET = {
  signale:     ['retrouve', 'introuvable'],
  retrouve:    ['rendu', 'introuvable'],
  rendu:       ['retrouve'],
  introuvable: ['retrouve', 'rendu']
};

let objetsEC = [];
let objetsToutEC = false;        /* false : seulement ce qui n'est pas fini */

function zoneDesObjets(){ return $('objetsZone'); }

async function afficherObjetsOublies(silencieux){
  const zone = zoneDesObjets();
  if(!zone) return;

  if(!silencieux && !objetsEC.length){
    zone.innerHTML = (typeof htmlAttente === 'function')
      ? htmlAttente('Lecture des objets signalés…')
      : '<div class="empty">Lecture des objets signalés…</div>';
  }

  try{
    const d = await appelPrep({ action: 'objetList', tout: objetsToutEC ? '1' : '' });
    objetsEC = (d && d.objets) || [];
    if(typeof poserCompteVue === 'function'){
      poserCompteVue('oublis', (d && d.aTraiter) || 0);
    }
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + echapper(e.message || e) + '</div>';
    return;
  }

  dessinerLaListeObjets();
}

function dessinerLaListeObjets(){
  const zone = zoneDesObjets();
  if(!zone) return;
  zone.innerHTML = '';

  /* Deux boutons, pas une liste déroulante : il n'y a que deux
     façons de regarder cette liste. */
  const barre = document.createElement('div');
  barre.style.cssText = 'display:flex;gap:7px;margin-bottom:12px;flex-wrap:wrap;';
  [[false, '🧤 À traiter'], [true, '🗄️ Tout l’historique']].forEach(([val, nom]) => {
    const b = document.createElement('button');
    const on = (objetsToutEC === val);
    b.className = on ? '' : 'btn btn-secondary';
    b.style.cssText = 'width:auto;margin:0;padding:7px 13px;font-size:12.5px;' +
      'border-radius:999px;font-family:inherit;font-weight:700;cursor:pointer;' +
      (on ? 'background:var(--orange-soft);border:1px solid var(--orange);' +
            'color:var(--on-accent);' : '');
    b.textContent = nom;
    b.addEventListener('click', () => {
      if(objetsToutEC === val) return;
      objetsToutEC = val;
      objetsEC = [];
      afficherObjetsOublies();
    });
    barre.appendChild(b);
  });
  zone.appendChild(barre);

  if(!objetsEC.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = objetsToutEC
      ? 'Aucun objet n’a jamais été signalé.'
      : 'Rien en attente — tout est rendu.<br>' +
        'Les objets arrivent ici quand un élève les signale depuis son espace.';
    zone.appendChild(v);
    return;
  }

  /* Ce qui attend un geste d'abord. Un objet rendu en mars n'a rien
     à faire au-dessus d'une écharpe signalée hier. */
  const vifs = objetsEC.filter(o => o.etat === 'signale' || o.etat === 'retrouve');
  const finis = objetsEC.filter(o => o.etat === 'rendu' || o.etat === 'introuvable');

  if(vifs.length){
    zone.appendChild(sousTitreMessagerie(
      'Pas encore rendus · ' + vifs.length, 'var(--warn-text)'));
    vifs.forEach(o => zone.appendChild(carteObjet(o)));
  }
  if(finis.length){
    zone.appendChild(sousTitreMessagerie('Réglés · ' + finis.length));
    finis.forEach(o => zone.appendChild(carteObjet(o)));
  }
}

function carteObjet(o){
  const e = ETATS_OBJET_EC[o.etat] || ETATS_OBJET_EC.signale;

  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:11px 13px;margin-bottom:9px;';

  const h = document.createElement('div');
  h.style.cssText = 'display:flex;gap:9px;align-items:baseline;flex-wrap:wrap;';

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:15px;font-weight:800;' +
    'line-height:1.3;word-break:break-word;';
  t.textContent = (o.quoi || 'Un objet') + (o.vehicule ? ' — ' + o.vehicule : '');
  h.appendChild(t);

  const p = document.createElement('span');
  p.style.cssText = 'flex:0 0 auto;font-size:11.5px;font-weight:700;' +
    'padding:3px 9px;border-radius:999px;border:1px solid var(--line);' +
    'color:' + e.couleur + ';';
  p.textContent = e.emoji + ' ' + e.nom;
  h.appendChild(p);
  d.appendChild(h);

  /* ⚠️ LE NOM DE L'ÉLÈVE, LE JOUR DU COURS, ET QUI A TOUCHÉ À
     L'ÉTAT. Sans la dernière, deux personnes du bureau cherchent la
     même écharpe dans la même voiture. */
  const s = document.createElement('div');
  s.style.cssText = 'font-size:12.5px;color:var(--muted);margin-top:4px;line-height:1.5;';
  s.textContent = [
    o.eleve || '',
    o.jour ? 'cours du ' + jourCourtMessagerie(o.jour) : '',
    o.signaleLe ? 'signalé le ' + o.signaleLe : '',
    (o.etat !== 'signale' && o.majPar)
      ? e.nom.toLowerCase() + ' par ' + o.majPar + (o.majLe ? ' le ' + o.majLe : '')
      : e.sous
  ].filter(Boolean).join(' · ');
  d.appendChild(s);

  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;';

  (SUITES_OBJET[o.etat] || []).forEach(suite => {
    const se = ETATS_OBJET_EC[suite];
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;margin:0;padding:7px 12px;font-size:12.5px;';
    b.textContent = se.emoji + ' ' + se.nom;
    b.title = 'L’élève reçoit la réponse dans son fil';
    b.addEventListener('click', () => changerEtatObjet(o, suite, b));
    l.appendChild(b);
  });

  /* Le fil d'origine : c'est là qu'est le texte exact de sa
     demande, et c'est là qu'on lui écrit si on a une question. */
  if(o.conversation){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;margin:0;padding:7px 12px;font-size:12.5px;';
    b.textContent = '💬 Son message';
    b.addEventListener('click', () => {
      if(typeof afficherVue === 'function') afficherVue('messagerie', 'messagerie');
      if(typeof ouvrirLeFil === 'function') ouvrirLeFil(o.conversation);
    });
    l.appendChild(b);
  }

  d.appendChild(l);
  return d;
}

async function changerEtatObjet(o, etat, bouton){
  const se = ETATS_OBJET_EC[etat];
  if(bouton){ bouton.disabled = true; bouton.textContent = '…'; }
  try{
    await appelPrep({ action: 'objetEtat', id: o.id, etat: etat });
    o.etat = etat;
    if(typeof showToast === 'function'){
      showToast(se.emoji + ' ' + se.nom + ' — ' + (o.eleve || 'l’élève') +
                ' reçoit la réponse.');
    }
    /* ⚠️ ON RELIT, ON NE DEVINE PAS. Le serveur a aussi touché au
       fil et au compteur : redessiner de mémoire laisserait la
       pastille du bandeau sur l'ancien chiffre. */
    objetsEC = [];
    await afficherObjetsOublies(true);
    if(typeof compterLaMessagerie === 'function') compterLaMessagerie();
  }catch(e){
    if(typeof showToast === 'function') showToast('Impossible : ' + (e.message || e));
    if(bouton){ bouton.disabled = false; bouton.textContent = se.emoji + ' ' + se.nom; }
  }
}

/* ⚠️ LE COMPTEUR VOYAGE SUR LE BATTEMENT QUI EXISTE DÉJÀ. Les
   objets changent trois fois par semaine : leur donner un battement
   à eux serait un appel toutes les quatre secondes pour une liste
   qui ne bouge pas. Il suit celui de 90 secondes de la messagerie,
   et seulement chez qui a le droit d'en faire quelque chose. */
async function compterLesObjets(){
  if(typeof aDroit === 'function' &&
     !aDroit('messagerie_bureau') && !aDroit('messagerie_admin')){
    objetsEC = [];
    if(typeof poserCompteVue === 'function') poserCompteVue('oublis', 0);
    return;
  }
  if(typeof ACCES === 'undefined' || !ACCES.code) return;
  try{
    const d = await appelPrep({ action: 'objetList', tout: objetsToutEC ? '1' : '' });
    objetsEC = (d && d.objets) || [];
    if(typeof poserCompteVue === 'function'){
      poserCompteVue('oublis', (d && d.aTraiter) || 0);
    }
  }catch(e){ /* la liste attendra le prochain passage */ }
}

/* L'objet d'un fil 🧤, pour poser ses boutons dans la conversation
   elle-même : le bureau lit la demande et répond au même endroit. */
function objetDuFil(f){
  if(!f || !f.conv || f.conv.genre !== 'oubli') return null;
  return objetsEC.find(o => o.conversation === f.conv.id) || null;
}


/* ============================================================
   📷 ENVOYER UNE PHOTO — v1088

   David, le 9 octobre : « la possibilité d'envoyer des images », et
   « tout le monde » peut en envoyer, élèves compris.

   ⚠️ LA PHOTO EST REDESSINÉE AVANT DE PARTIR, ET C'EST LE CŒUR DE
   CETTE BRIQUE. Une photo de téléphone fait huit mégaoctets ;
   redessinée à 1 600 pixels en JPEG, elle en fait trois cents
   kilo-octets. Sans ça, l'envoi depuis la 4G d'une voiture-école ne
   finit pas — et une messagerie qui n'envoie pas est une messagerie
   qu'on quitte.

   ⚠️ ET LE REDESSIN EFFACE LES EXIF. Une photo prise au téléphone
   porte les COORDONNÉES GPS du lieu de la prise de vue, parfois le
   modèle de l'appareil et l'heure exacte. Passer par un canvas ne
   recopie que les PIXELS : tout le reste disparaît, et c'est la
   seule façon propre de s'en débarrasser côté navigateur. Un élève
   qui photographie son écharpe depuis chez lui nous enverrait son
   adresse, et nous la garderions — à ranger à côté de la règle
   « aucune vitesse, aucun horodatage par point » du GPS.
   ============================================================ */

const PHOTO_COTE_MAX = 1600;        /* le plus grand côté, après réduction */
const PHOTO_QUALITE = 0.82;
const PHOTO_SOURCE_MAX = 25 * 1024 * 1024;   /* refusé avant même de lire */

let envoiPhotoEC = false;

/* ⚠️ « createImageBitmap » SAIT REDRESSER UNE PHOTO DE TÉLÉPHONE,
   PAS « new Image() ». Un portrait pris à l'horizontale est stocké
   couché, avec une étiquette EXIF qui dit de le tourner ; le canvas
   ignore l'étiquette. Sans « imageOrientation: 'from-image' », une
   photo sur deux arriverait de travers — et comme on efface les EXIF
   au passage, personne ne pourrait plus la redresser ensuite. */
async function lireLImage(fichier){
  if(typeof createImageBitmap === 'function'){
    try{
      return await createImageBitmap(fichier, { imageOrientation: 'from-image' });
    }catch(e){ /* vieux navigateur : on retombe plus bas */ }
  }
  return await new Promise((bon, mauvais) => {
    const u = URL.createObjectURL(fichier);
    const i = new Image();
    i.onload = () => { URL.revokeObjectURL(u); bon(i); };
    i.onerror = () => { URL.revokeObjectURL(u); mauvais(new Error('Image illisible.')); };
    i.src = u;
  });
}

/* Rend { data, l, h } — ou lève. */
async function reduireLaPhoto(fichier){
  if(!fichier) throw new Error('Aucune photo.');
  if(!/^image\//.test(fichier.type || '')){
    throw new Error('Ce fichier n’est pas une image.');
  }
  if(fichier.size > PHOTO_SOURCE_MAX){
    throw new Error('Cette image est trop lourde (25 Mo au plus).');
  }

  const img = await lireLImage(fichier);
  const l0 = img.width || img.naturalWidth;
  const h0 = img.height || img.naturalHeight;
  if(!l0 || !h0) throw new Error('Image illisible.');

  const f = Math.min(1, PHOTO_COTE_MAX / Math.max(l0, h0));
  const l = Math.max(1, Math.round(l0 * f));
  const h = Math.max(1, Math.round(h0 * f));

  const toile = document.createElement('canvas');
  toile.width = l;
  toile.height = h;
  const c = toile.getContext('2d');
  /* Un fond blanc : un PNG transparent devient noir sur noir sans
     lui, et c'est exactement ce qu'on reçoit d'une capture d'écran. */
  c.fillStyle = '#FFFFFF';
  c.fillRect(0, 0, l, h);
  c.drawImage(img, 0, 0, l, h);
  if(img.close) try{ img.close(); }catch(e){}

  const data = toile.toDataURL('image/jpeg', PHOTO_QUALITE);
  if(!data || data.length < 100) throw new Error('Réduction impossible.');
  return { data: data, l: l, h: h };
}

/* ------------------------------------------------------------
   LE BOUTON
   ------------------------------------------------------------ */
function choisirUnePhoto(){
  if(envoiPhotoEC) return;
  const z = document.createElement('input');
  z.type = 'file';
  /* ⚠️ PAS DE « capture » : sur un téléphone, l'attribut force
     l'appareil photo et retire l'accès à la galerie. Le bureau
     envoie surtout des photos déjà prises. */
  z.accept = 'image/*';
  z.style.display = 'none';
  document.body.appendChild(z);
  z.addEventListener('change', () => {
    const f = z.files && z.files[0];
    document.body.removeChild(z);
    if(f) envoyerUnePhotoDansLeFil(f);
  });
  z.click();
}

async function envoyerUnePhotoDansLeFil(fichier){
  if(!filOuvertEC || !filOuvertEC.conv || !filOuvertEC.peutEcrire) return;
  if(envoiPhotoEC) return;
  envoiPhotoEC = true;

  const id = filOuvertEC.conv.id;
  const bouton = $('msgElvPhoto');
  if(bouton){ bouton.disabled = true; bouton.textContent = '⏳'; }

  try{
    const p = await reduireLaPhoto(fichier);
    /* Le mot tapé part avec la photo : c'est un seul message, et
       c'est ce qu'on attend quand on écrit avant de joindre. */
    const champ = $('msgElvTexte');
    const texte = champ ? champ.value.trim() : '';

    await appelPrep({ action: 'convPhoto', id: id, photo: p.data,
                      l: p.l, h: p.h, texte: texte });

    if(champ){ champ.value = ''; delete brouillonsMessagerie[id]; }
    await rafraichirLeFil();
  }catch(e){
    if(typeof showToast === 'function'){
      showToast('La photo n’est pas partie : ' + (e.message || e));
    }
  }
  envoiPhotoEC = false;
  if(bouton){ bouton.disabled = false; bouton.textContent = '📷'; }
}

/* ------------------------------------------------------------
   LA PHOTO DANS LA BULLE
   ------------------------------------------------------------ */

function adresseDeLaPiece(piece){
  if(!piece || !piece.lien) return '';
  /* Le Worker rend un chemin : l'application est servie par GitHub
     Pages, un chemin seul y pointerait sur la mauvaise machine. */
  const base = (typeof CONFIG !== 'undefined' && CONFIG.WORKER_URL) || '';
  return base + piece.lien;
}

function imageDuMessage(m){
  const p = m && m.piece;
  if(!p) return null;
  if(!p.lien){
    const d = document.createElement('div');
    d.className = 'msgImgAbs';
    d.textContent = '📷 Photo indisponible';
    return d;
  }
  const i = document.createElement('img');
  i.className = 'msgImg';
  i.alt = 'Photo';
  i.loading = 'lazy';
  /* ⚠️ LES DIMENSIONS SONT POSÉES AVANT LE CHARGEMENT. Sans elles la
     bulle fait zéro pixel de haut, puis saute à sa taille quand
     l'image arrive : le fil se déplace sous les doigts au moment
     précis où l'on allait appuyer. */
  if(p.l && p.h){
    i.width = p.l;
    i.height = p.h;
    i.style.aspectRatio = p.l + ' / ' + p.h;
  }
  i.src = adresseDeLaPiece(p);
  i.addEventListener('click', ev => {
    ev.stopPropagation();
    ouvrirLaPhotoEnGrand(i.src);
  });
  return i;
}

/* ============================================================
   🎤 LES VOCAUX — ENREGISTRER, RECONNAÎTRE, ÉCOUTER — v1098

   David, le 8 octobre : « voir pour envoyer des vocaux dans la
   messagerie ». Ses quatre arbitrages, puis les trois du schéma :
   tout le monde · 2 minutes pour l'équipe, 1 pour un élève, avec le
   compteur · 5 par jour pour un élève · le texte reconnu PENDANT
   qu'on parle · le micro DEVANT 📷 et 🙂 · la vitesse ×2 sur le
   lecteur · et le texte corrigeable avant l'envoi côté équipe, pas
   côté élève.

   ⚠️ DEUX MACHINES QUI TOURNENT EN MÊME TEMPS, ET ELLES NE SE
   CONNAISSENT PAS. « MediaRecorder » enregistre le son ;
   « SpeechRecognition » écoute le micro de son côté et rend du
   texte. Aucune des deux ne dépend de l'autre : la reconnaissance
   peut refuser de démarrer — c'est le cas sur iPhone — sans que
   l'enregistrement en souffre. C'est voulu, et c'est ce qui permet
   au vocal de partir sans texte là où le texte n'existe pas.

   ⚠️ ET LE SON N'EST JAMAIS GARDÉ AILLEURS QUE DANS LA PAGE tant
   qu'on n'a pas appuyé sur ➤. Annuler, changer de fil, recharger :
   il n'en reste rien, nulle part. Un enregistrement qu'on croit
   annulé et qui traîne sur un serveur, c'est la pire des surprises.
   ============================================================ */

const VOCAL_SEC_MAX_EC = 120;
/* Les dix dernières secondes se voient : le chiffre passe en rouge,
   et on sait qu'il faut conclure sans avoir à lire. */
const VOCAL_SEC_ALERTE = 10;
const VOCAL_BARRES_ONDE = 12;

let vocalEC = null;          /* l'enregistrement en cours, ou rien */

/* La vitesse d'écoute, gardée d'un vocal à l'autre : celui qui
   écoute vite écoute vite tout le temps. Elle vit en mémoire — un
   réglage de confort n'a pas à survivre à la fermeture de l'onglet. */
let vitesseDesVocauxEC = 1;

function vocalPossibleEC(){
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
            typeof window.MediaRecorder === 'function');
}

/* ⚠️ LE FORMAT N'EST PAS LE MÊME PARTOUT, ET ON NE CHOISIT PAS.
   Chrome et Android rendent du webm/opus, Safari et l'iPhone du
   mp4/aac. On demande ce qu'on préfère et on accepte ce qu'on nous
   donne : le Worker reconnaît les trois conteneurs aux premiers
   octets, pas au type annoncé. */
function formatDuVocalEC(){
  const essais = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for(const t of essais){
    try{ if(MediaRecorder.isTypeSupported(t)) return t; }catch(e){}
  }
  return '';
}

function minutesEtSecondes(n){
  const s = Math.max(0, Math.round(Number(n) || 0));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

/* ------------------------------------------------------------
   L'ENREGISTREUR, À LA PLACE DE LA BARRE D'ÉCRITURE

   ⚠️ À LA PLACE, PAS À CÔTÉ. On n'écrit pas et on ne parle pas en
   même temps : deux zones de saisie côte à côte, c'est se demander
   dans laquelle on est en train de taper.
   ------------------------------------------------------------ */
async function demarrerLeVocalEC(barre){
  if(vocalEC) return;
  if(!vocalPossibleEC()){
    showToast('Cet appareil ne sait pas enregistrer depuis le navigateur.');
    return;
  }

  let flux = null;
  try{
    flux = await navigator.mediaDevices.getUserMedia({ audio: true });
  }catch(e){
    /* Refus du micro, ou pas de micro : on le dit une fois, sans
       insister. Le reste de la messagerie continue de marcher. */
    showToast('Le micro n’est pas disponible : ' +
              ((e && e.name === 'NotAllowedError')
                ? 'tu l’as refusé pour ce site.' : 'aucun micro trouvé.'));
    return;
  }

  const type = formatDuVocalEC();
  let enr = null;
  try{
    enr = type ? new MediaRecorder(flux, { mimeType: type })
               : new MediaRecorder(flux);
  }catch(e){
    flux.getTracks().forEach(p => p.stop());
    showToast('Enregistrement impossible sur cet appareil.');
    return;
  }

  const morceaux = [];
  enr.addEventListener('dataavailable', ev => {
    if(ev.data && ev.data.size) morceaux.push(ev.data);
  });

  vocalEC = { enr: enr, flux: flux, morceaux: morceaux, debut: Date.now(),
              barre: barre, mots: '', reco: null, minuteur: null,
              fil: (filOuvertEC && filOuvertEC.conv && filOuvertEC.conv.id) || '',
              fini: null };

  const vue = ecranDeLEnregistrementEC();
  barre.style.display = 'none';
  barre.parentNode.insertBefore(vue, barre);
  vocalEC.vue = vue;

  /* ⚠️ LA PROMESSE DE FIN SE POSE AVANT « start », pas après : un
     enregistrement de zéro seconde — un doigt qui ripe — rend
     « stop » immédiat, et on attendrait un événement déjà passé. */
  vocalEC.fini = new Promise(resolve => enr.addEventListener('stop', resolve));
  enr.start();

  demarrerLaReconnaissanceEC();
  vocalEC.minuteur = setInterval(() => battreLeVocalEC(), 200);
  battreLeVocalEC();
}

/* La reconnaissance, quand elle existe. Sur iPhone elle n'existe
   pas : on le dit à l'écran plutôt que de laisser croire qu'elle a
   échoué. */
function demarrerLaReconnaissanceEC(){
  const SRv = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SRv || !vocalEC) return;

  let r = null;
  try{ r = new SRv(); }catch(e){ return; }
  r.lang = 'fr-FR';
  r.continuous = true;
  r.interimResults = true;

  /* ⚠️ « final » ET « provisoire » SE RANGENT À PART. La
     reconnaissance corrige ce qu'elle vient de dire tant qu'elle
     n'a pas tranché : tout empiler donnerait trois fois la même
     phrase à moitié écrite. */
  let acquis = '';
  r.addEventListener('result', ev => {
    let encours = '';
    for(let i = ev.resultIndex; i < ev.results.length; i++){
      const t = ev.results[i][0].transcript;
      if(ev.results[i].isFinal) acquis += t;
      else encours += t;
    }
    if(!vocalEC) return;
    vocalEC.mots = (acquis + encours).replace(/\s+/g, ' ').trim();
    posterLesMotsDuVocalEC();
  });
  /* Un silence coupe la reconnaissance ; l'enregistrement, lui,
     continue. On la relance tant qu'on parle. */
  r.addEventListener('end', () => {
    if(!vocalEC || vocalEC.arrete) return;
    try{ r.start(); }catch(e){}
  });
  r.addEventListener('error', () => { /* elle se taira, le son part */ });

  try{ r.start(); vocalEC.reco = r; }catch(e){ vocalEC.reco = null; }
}

function posterLesMotsDuVocalEC(){
  if(!vocalEC || !vocalEC.vue) return;
  const z = vocalEC.vue.querySelector('.msgVocMots');
  if(!z) return;
  /* ⚠️ CE QUI A ÉTÉ CORRIGÉ À LA MAIN NE SE FAIT PAS ÉCRASER. Le
     champ est modifiable côté équipe — décision de David — et la
     reconnaissance continue d'écrire par-dessus tant qu'on n'y a
     pas touché. Dès qu'on y touche, elle lâche la main. */
  if(z.dataset.touche === '1') return;
  z.value = vocalEC.mots;
}

function ecranDeLEnregistrementEC(){
  const z = document.createElement('div');
  z.className = 'msgVoc';

  const haut = document.createElement('div');
  haut.className = 'msgVocHaut';

  const rond = document.createElement('span');
  rond.className = 'msgVocRond';
  haut.appendChild(rond);

  const t = document.createElement('span');
  t.className = 'msgVocTemps';
  t.innerHTML = '<b>0:00</b> <i>/ ' + minutesEtSecondes(VOCAL_SEC_MAX_EC) + '</i>';
  haut.appendChild(t);

  const onde = document.createElement('span');
  onde.className = 'msgVocOnde';
  for(let i = 0; i < VOCAL_BARRES_ONDE; i++){
    const b = document.createElement('b');
    b.style.height = '6px';
    onde.appendChild(b);
  }
  haut.appendChild(onde);

  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'msgVocX';
  x.textContent = '✕';
  x.title = 'Annuler';
  x.addEventListener('click', () => arreterLeVocalEC(false));
  haut.appendChild(x);

  const env = document.createElement('button');
  env.type = 'button';
  env.className = 'msgEnv';
  env.textContent = '➤';
  env.title = 'Envoyer le vocal';
  env.addEventListener('click', () => arreterLeVocalEC(true));
  haut.appendChild(env);

  z.appendChild(haut);

  /* Le texte reconnu, modifiable : « Hery » revient en « Erri » une
     fois sur trois, et le corriger après coup demanderait de
     rouvrir le message. Décision de David du 8 octobre : oui pour
     l'équipe, non pour l'élève. */
  const mots = document.createElement('textarea');
  mots.className = 'msgVocMots';
  mots.rows = 1;
  mots.placeholder = (window.SpeechRecognition || window.webkitSpeechRecognition)
    ? 'Ce que tu dis s’écrira ici…'
    : 'Cet appareil n’écrit pas ce que tu dis. Le vocal partira, sans texte.';
  if(!(window.SpeechRecognition || window.webkitSpeechRecognition)){
    mots.classList.add('pas');
    mots.readOnly = true;
  }
  mots.addEventListener('input', () => {
    mots.dataset.touche = '1';
    mots.style.height = 'auto';
    mots.style.height = Math.max(19, Math.min(mots.scrollHeight, 90)) + 'px';
  });
  z.appendChild(mots);

  return z;
}

/* Le battement : le compteur, l'onde, et l'arrêt automatique. */
function battreLeVocalEC(){
  if(!vocalEC || !vocalEC.vue) return;
  const sec = Math.floor((Date.now() - vocalEC.debut) / 1000);

  const t = vocalEC.vue.querySelector('.msgVocTemps');
  if(t){
    const b = t.querySelector('b');
    if(b) b.textContent = minutesEtSecondes(sec);
    t.classList.toggle('fin', sec >= VOCAL_SEC_MAX_EC - VOCAL_SEC_ALERTE);
  }

  /* ⚠️ L'ONDE NE MESURE RIEN, ET ELLE NE PRÉTEND PAS LE FAIRE. Lire
     le niveau du micro demanderait un AudioContext de plus, qui
     tourne pendant tout l'enregistrement sur une tablette posée au
     soleil. Elle dit « ça tourne », comme le point rouge — et c'est
     la seule chose qu'on lui demande. */
  const barres = vocalEC.vue.querySelectorAll('.msgVocOnde b');
  for(let i = 0; i < barres.length; i++){
    const v = 6 + Math.round(20 * Math.abs(Math.sin((Date.now() / 220) + i * 0.7)));
    barres[i].style.height = v + 'px';
  }

  /* ⚠️ À LA LIMITE, ON ARRÊTE SANS ENVOYER. Le vocal reste à
     l'écran, prêt à partir : couper ET envoyer, ce serait décider à
     la place de celui qui parlait encore. */
  if(sec >= VOCAL_SEC_MAX_EC) arreterLeVocalEC(true, true);
}

/* ------------------------------------------------------------
   ARRÊTER : ANNULER, OU ENVOYER
   ------------------------------------------------------------ */
async function arreterLeVocalEC(envoyer, parLeTemps){
  const v = vocalEC;
  if(!v || v.arrete) return;
  v.arrete = true;
  clearInterval(v.minuteur);

  const sec = Math.max(1, Math.round((Date.now() - v.debut) / 1000));
  const zoneMots = v.vue && v.vue.querySelector('.msgVocMots');
  const mots = zoneMots ? String(zoneMots.value || '').trim() : '';

  if(v.reco){ try{ v.reco.stop(); }catch(e){} }
  try{ v.enr.stop(); }catch(e){}
  try{ await v.fini; }catch(e){}
  v.flux.getTracks().forEach(p => p.stop());

  const rendreLaBarre = () => {
    if(v.vue && v.vue.parentNode) v.vue.parentNode.removeChild(v.vue);
    if(v.barre) v.barre.style.display = '';
    vocalEC = null;
  };

  if(!envoyer){ rendreLaBarre(); return; }

  /* ⚠️ MOINS D'UNE SECONDE, C'EST UN DOIGT QUI A RIPÉ. On ne poste
     pas un vocal vide : on le dit, et on rend la barre. */
  const blob = new Blob(v.morceaux, { type: (v.enr.mimeType || 'audio/webm') });
  if(sec < 1 || blob.size < 1200){
    rendreLaBarre();
    showToast('Enregistrement trop court — rien n’a été envoyé.');
    return;
  }

  if(v.vue){
    const e = v.vue.querySelector('.msgEnv');
    if(e){ e.disabled = true; e.textContent = '…'; }
  }

  try{
    const son = await blobEnBase64EC(blob);
    await appelPrep({ action: 'convVocal', id: v.fil, son: son,
                      duree: sec, texte: mots });
    rendreLaBarre();
    if(parLeTemps) showToast('Deux minutes : le vocal est parti.');
    await rafraichirLeFil();
  }catch(e){
    /* ⚠️ ON NE REND PAS LA BARRE SUR UN ÉCHEC. Le son n'existe que
       dans cette page : la rendre, c'est le perdre. L'écran reste,
       avec son bouton, et on réessaie. */
    v.arrete = false;
    if(v.vue){
      const e2 = v.vue.querySelector('.msgEnv');
      if(e2){ e2.disabled = false; e2.textContent = '➤'; }
    }
    showToast('Le vocal n’est pas parti : ' + ((e && e.message) || e));
  }
}

function blobEnBase64EC(blob){
  return new Promise((resolve, reject) => {
    const l = new FileReader();
    l.onload = () => resolve(String(l.result || ''));
    l.onerror = () => reject(new Error('lecture impossible'));
    l.readAsDataURL(blob);
  });
}

/* ------------------------------------------------------------
   LE LECTEUR, DANS LA BULLE

   ⚠️ PAS LE LECTEUR DU NAVIGATEUR. « <audio controls> » mesure 300
   pixels de large, impose ses couleurs et son menu « télécharger » —
   sur un lien signé qui expire, ce menu promet ce qu'il ne tient
   pas. Trois éléments à nous, et le son derrière.
   ------------------------------------------------------------ */
function vocalDuMessage(m){
  const p = m && m.piece;
  if(!p || String(p.type || '').indexOf('audio/') !== 0) return null;

  if(!p.lien){
    const d = document.createElement('div');
    d.className = 'msgImgAbs';
    d.textContent = '🎤 Vocal indisponible';
    return d;
  }

  const z = document.createElement('div');
  z.className = 'msgLect';

  const son = document.createElement('audio');
  son.preload = 'none';
  son.src = adresseDeLaPiece(p);

  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'msgLectBtn';
  b.textContent = '▶';
  b.title = 'Écouter';

  const barre = document.createElement('span');
  barre.className = 'msgLectBarre';
  const plein = document.createElement('i');
  plein.style.width = '0%';
  barre.appendChild(plein);

  const duree = document.createElement('span');
  duree.className = 'msgLectDuree';
  duree.textContent = minutesEtSecondes(p.duree || 0);

  /* ×2 — demandé par David le 8 octobre. Elle se garde d'un vocal à
     l'autre : celui qui écoute vite écoute vite tout le temps. */
  const vit = document.createElement('button');
  vit.type = 'button';
  vit.className = 'msgLectVit';
  vit.textContent = '×' + vitesseDesVocauxEC;
  vit.title = 'Vitesse de lecture';
  vit.addEventListener('click', ev => {
    ev.stopPropagation();
    vitesseDesVocauxEC = (vitesseDesVocauxEC === 1) ? 1.5
                       : (vitesseDesVocauxEC === 1.5 ? 2 : 1);
    vit.textContent = '×' + vitesseDesVocauxEC;
    son.playbackRate = vitesseDesVocauxEC;
    /* Les autres bulles suivront à leur prochaine lecture ; celles
       qui sont à l'écran changent d'étiquette tout de suite. */
    document.querySelectorAll('.msgLectVit').forEach(x => {
      x.textContent = '×' + vitesseDesVocauxEC;
    });
  });

  b.addEventListener('click', ev => {
    ev.stopPropagation();
    if(son.paused){
      /* ⚠️ UN SEUL VOCAL À LA FOIS. Deux voix en même temps dans une
         voiture, c'est deux voix qu'on ne comprend pas. */
      document.querySelectorAll('audio').forEach(a => {
        if(a !== son && !a.paused) a.pause();
      });
      son.playbackRate = vitesseDesVocauxEC;
      son.play().catch(() => showToast('Le vocal n’a pas pu être lu.'));
    }else{
      son.pause();
    }
  });

  son.addEventListener('play', () => { b.textContent = '⏸'; b.title = 'Pause'; });
  son.addEventListener('pause', () => { b.textContent = '▶'; b.title = 'Écouter'; });
  son.addEventListener('ended', () => {
    b.textContent = '▶';
    plein.style.width = '0%';
    duree.textContent = minutesEtSecondes(p.duree || son.duration || 0);
  });
  son.addEventListener('timeupdate', () => {
    const tot = son.duration || p.duree || 0;
    if(tot > 0) plein.style.width = Math.min(100, (son.currentTime / tot) * 100) + '%';
    duree.textContent = minutesEtSecondes(son.currentTime) + ' / ' +
                        minutesEtSecondes(tot);
  });

  /* On peut se déplacer dans le vocal : réécouter la phrase du
     milieu sans tout reprendre. */
  barre.addEventListener('click', ev => {
    ev.stopPropagation();
    const tot = son.duration || p.duree || 0;
    if(!tot) return;
    const r = barre.getBoundingClientRect();
    son.currentTime = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * tot;
  });

  z.appendChild(b);
  z.appendChild(barre);
  z.appendChild(duree);
  z.appendChild(vit);
  z.appendChild(son);
  return z;
}


/* ⚠️ EN GRAND, PAS DANS UN ONGLET. Un lien signé ouvert dans un
   onglet reste dans l'historique du navigateur et dans la barre
   d'adresse d'une tablette partagée. Une couche par-dessus se ferme
   et ne laisse rien. */
let photoEnGrandEC = null;

function fermerLaPhotoEnGrand(){
  if(photoEnGrandEC && photoEnGrandEC.parentNode){
    photoEnGrandEC.parentNode.removeChild(photoEnGrandEC);
  }
  photoEnGrandEC = null;
}

function ouvrirLaPhotoEnGrand(src){
  fermerLaPhotoEnGrand();
  const v = document.createElement('div');
  v.className = 'msgVoilePhoto';
  const i = document.createElement('img');
  i.src = src;
  i.alt = 'Photo';
  v.appendChild(i);
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'msgVoileX';
  x.textContent = '✕';
  v.appendChild(x);
  v.addEventListener('click', fermerLaPhotoEnGrand);
  document.body.appendChild(v);
  photoEnGrandEC = v;

  const echap = (ev) => {
    if(ev.key !== 'Escape') return;
    document.removeEventListener('keydown', echap);
    fermerLaPhotoEnGrand();
  };
  document.addEventListener('keydown', echap);
}


/* ============================================================
   😊 LES RÉACTIONS, LES ÉMOTICÔNES, LE POUCE — v1086

   David, le 9 octobre : « ajouter des émoticones dans les
   conversations, avoir une action rapide type pouce comme messenger,
   la réaction sur un message directement comme imessage ou
   messenger ».

   ⚠️ TROIS AJOUTS, UN SEUL ÉCRAN, ET AUCUN BOUTON DE PLUS QUE
   NÉCESSAIRE. La barre d'écriture fait 400 px dans le tiroir : c'est
   la contrainte qui décide. Le pouce n'est donc pas un quatrième
   bouton, c'est le bouton d'envoi qui change de visage tant qu'il
   n'y a rien à envoyer — exactement ce que fait Messenger.
   ============================================================ */

/* Les six, décidés par David le 9 octobre : « laisse ceux-là ».
   ⚠️ CETTE LISTE EST RECOPIÉE DU WORKER, et c'est la seule copie
   qu'on s'autorise : le serveur REFUSE tout ce qui n'y est pas, donc
   une divergence ne produit pas une faille, seulement un bouton qui
   ne marche pas — et le banc compare les deux listes. */
const REACTIONS_EC = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/* ------------------------------------------------------------
   LES PASTILLES SOUS UNE BULLE
   ------------------------------------------------------------ */

/* ⚠️ ON GROUPE PAR EMOJI, ON NE LISTE PAS LES GENS. Six personnes
   qui posent un pouce, c'est « 👍 6 » et pas six pastilles. La
   sienne se reconnaît à la bordure : c'est la seule chose qu'on
   cherche en regardant une pastille. */
function groupeDesReactions(liste){
  const moi = normaliserMessagerie(ACCES.moniteur || '');
  const ordre = [];
  const par = {};
  (liste || []).forEach(x => {
    const e = x && x.emoji;
    if(!e) return;
    if(!par[e]){ par[e] = { emoji: e, combien: 0, mien: false, qui: [] }; ordre.push(e); }
    par[e].combien++;
    if(x.qui) par[e].qui.push(x.qui);
    /* Le serveur de l'élève rend « mien » tout cuit ; celui du bureau
       rend les clés, et on compare. Les deux chemins mènent ici. */
    if(x.mien || (x.cle && x.cle === moi)) par[e].mien = true;
  });
  return ordre.map(e => par[e]);
}

function zoneDesReactions(m){
  const groupes = groupeDesReactions(m && m.reacs);
  if(!groupes.length) return null;
  const d = document.createElement('div');
  d.className = 'msgReacs';
  groupes.forEach(g => {
    const p = document.createElement('span');
    p.className = 'msgReac' + (g.mien ? ' mien' : '');
    p.textContent = g.emoji;
    if(g.combien > 1){
      const n = document.createElement('b');
      n.textContent = String(g.combien);
      p.appendChild(n);
    }
    /* Au survol, qui a réagi — sur une tablette personne ne survole,
       mais au bureau c'est la question qu'on se pose. */
    if(g.qui.length) p.title = g.qui.join(', ');
    d.appendChild(p);
  });
  return d;
}

/* ------------------------------------------------------------
   LE SÉLECTEUR

   ⚠️ APPUI LONG SUR UNE TABLETTE, CLIC DROIT AU BUREAU. Les
   moniteurs travaillent sur une tablette posée sur un support : il
   n'y a pas de survol, et un bouton « réagir » visible sur chaque
   bulle rendrait le fil illisible. L'appui long est le geste que
   tout le monde connaît de Messenger.
   ------------------------------------------------------------ */

let reacOuverteEC = null;        /* la fonction qui referme le sélecteur ouvert */

function fermerLeSelecteurDeReaction(){
  if(reacOuverteEC){ reacOuverteEC(); reacOuverteEC = null; }
}

function ouvrirLeSelecteurDeReaction(bulle, m){
  fermerLeSelecteurDeReaction();
  if(!filOuvertEC || !filOuvertEC.peutEcrire) return;

  const ligne = bulle.parentNode;
  if(!ligne || !ligne.parentNode) return;

  const mien = groupeDesReactions(m.reacs).filter(g => g.mien)[0];
  const rang = document.createElement('div');
  rang.className = 'msgRang' + (ligne.classList.contains('moi') ? ' moi' : '');

  const boite = document.createElement('div');
  boite.className = 'msgReacChoix';
  REACTIONS_EC.forEach(e => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = e;
    if(mien && mien.emoji === e) b.className = 'on';
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      fermerLeSelecteurDeReaction();
      reagirDansLeFil(m.id, e);
    });
    boite.appendChild(b);
  });
  rang.appendChild(boite);
  ligne.parentNode.insertBefore(rang, ligne);
  bulle.classList.add('vise');

  /* Un clic ailleurs referme — et il ne doit pas aussi rouvrir le
     sélecteur de la bulle sur laquelle on vient de cliquer. */
  const dehors = () => fermerLeSelecteurDeReaction();
  setTimeout(() => document.addEventListener('click', dehors), 0);

  reacOuverteEC = () => {
    document.removeEventListener('click', dehors);
    bulle.classList.remove('vise');
    if(rang.parentNode) rang.parentNode.removeChild(rang);
  };
}

/* ⚠️ L'APPUI LONG NE DOIT PAS SE DÉCLENCHER PENDANT UN DÉFILEMENT.
   Un doigt posé sur une bulle pour faire défiler le fil reste
   immobile une demi-seconde avant de bouger : sans le garde-fou sur
   le mouvement, le sélecteur s'ouvrirait à chaque fois qu'on remonte
   la conversation. */
function brancherLAppuiLong(bulle, m){
  let minuteur = null;
  let depart = null;

  const annuler = () => { if(minuteur){ clearTimeout(minuteur); minuteur = null; } };

  bulle.addEventListener('pointerdown', ev => {
    if(ev.button === 2) return;             /* le clic droit a son propre chemin */
    depart = { x: ev.clientX, y: ev.clientY };
    annuler();
    minuteur = setTimeout(() => {
      minuteur = null;
      ouvrirLeSelecteurDeReaction(bulle, m);
    }, 480);
  });
  bulle.addEventListener('pointermove', ev => {
    if(!minuteur || !depart) return;
    if(Math.abs(ev.clientX - depart.x) > 9 || Math.abs(ev.clientY - depart.y) > 9){
      annuler();
    }
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(q =>
    bulle.addEventListener(q, annuler));

  bulle.addEventListener('contextmenu', ev => {
    ev.preventDefault();
    annuler();
    ouvrirLeSelecteurDeReaction(bulle, m);
  });
}

/* ------------------------------------------------------------
   POSER LA RÉACTION
   ------------------------------------------------------------ */

async function reagirDansLeFil(idMsg, emoji){
  if(!filOuvertEC) return;

  /* ⚠️ ON POSE LA PASTILLE AVANT LA RÉPONSE DU SERVEUR. Un aller-
     retour prend deux cents millisecondes sur une bonne ligne et
     trois secondes sur la 4G d'une voiture-école : laisser la bulle
     inerte pendant ce temps-là, c'est un geste qu'on refait deux
     fois. On remet l'écran d'équerre si ça échoue. */
  const m = (filOuvertEC.messages || []).filter(x => x.id === idMsg)[0];
  const avant = m ? (m.reacs || []).slice() : null;
  if(m){
    const moi = normaliserMessagerie(ACCES.moniteur || '');
    const sans = (m.reacs || []).filter(x => !(x.mien || (x.cle && x.cle === moi)));
    const mien = (m.reacs || []).filter(x => x.mien || (x.cle && x.cle === moi))[0];
    m.reacs = (mien && mien.emoji === emoji)
      ? sans                                   /* le même : on retire */
      : sans.concat([{ emoji: emoji, qui: ACCES.moniteur || '', cle: moi }]);
    dessinerLeFil();
  }

  try{
    await appelPrep({ action: 'convReagir', message: idMsg, emoji: emoji });
  }catch(e){
    if(m) m.reacs = avant;
    dessinerLeFil();
    if(typeof showToast === 'function'){
      showToast('La réaction n’est pas passée : ' + (e.message || e));
    }
    return;
  }
  /* Et on relit : c'est le serveur qui a raison sur ce que les autres
     ont posé entre-temps. */
  rafraichirLeFil(true);
}

/* ------------------------------------------------------------
   LE PANNEAU DES ÉMOTICÔNES

   ⚠️ UNE LISTE ÉCRITE À LA MAIN, PAS UNE BIBLIOTHÈQUE. Les
   sélecteurs d'emoji du commerce pèsent plusieurs centaines de
   kilo-octets et vont chercher des images sur un serveur tiers.
   Cent cinquante émoji rangés en quatre familles tiennent en
   quelques lignes, se chargent avec la page, et couvrent tout ce
   qu'on écrit dans une auto-école.
   ------------------------------------------------------------ */

const FAMILLES_EMOJI = [
  { rond: '🙂', nom: 'Visages', liste:
    ('😀 😃 😄 😁 😆 😅 😂 🤣 😊 🙂 😉 😍 🥰 😘 😋 😎 🤗 🤔 🤨 😐 😶 🙄 😏 😣 ' +
     '😥 😮 😯 😪 😴 😌 😛 😜 🤐 🥴 😔 😕 🙁 😖 😞 😟 😤 😢 😭 😦 😨 😰 😱 😳 ' +
     '🥺 😠 😡 🤯 😬 🥳 🤩 😇 🤫 🤭 🫡 🙃').split(' ') },
  { rond: '👍', nom: 'Gestes', liste:
    ('👍 👎 👌 ✌️ 🤞 🤝 👏 🙌 🙏 💪 👋 🤚 ✋ 👉 👈 👆 👇 ☝️ 🤙 ✊ 👊 🤟 ❤️ 🧡 ' +
     '💛 💚 💙 💜 🖤 🤍 💔 ❣️ 💯 🔥 ✨ ⭐ 🎉 🎊 🎁 🏆 🥇 👀 🫶').split(' ') },
  { rond: '🚗', nom: 'La route', liste:
    ('🚗 🚙 🚕 🏍️ 🛵 🚲 🚚 🚛 🚐 🅿️ ⛽ 🛣️ 🛤️ 🚦 🚥 🚧 ⚠️ 🛑 ↩️ ↪️ ⬅️ ➡️ ⬆️ ⬇️ ' +
     '🔄 🧭 🗺️ 📍 🚸 🚹 🏁 🔑 🪪 📋 📝 🚓 🚑 🚒 ⏱️ 🧊 🌧️ ☀️ 🌫️ ❄️').split(' ') },
  { rond: '✅', nom: 'Le travail', liste:
    ('✅ ❌ ⭕ ❓ ❗ ‼️ 📅 📆 🕐 ⏰ ⏳ 📞 📱 ✉️ 📧 📨 📤 📥 📎 🔗 📌 📊 📈 📉 ' +
     '💰 💶 💳 🧾 🏢 🏫 👨‍🏫 👩‍🏫 🎓 📚 📖 ✏️ 🖊️ 🔍 🔔 🔕 💬 💡 🚩 🧤').split(' ') }
];

let familleEmojiEC = 0;
let panneauEmojiEC = null;

function fermerLePanneauEmoji(){
  if(panneauEmojiEC && panneauEmojiEC.parentNode){
    panneauEmojiEC.parentNode.removeChild(panneauEmojiEC);
  }
  panneauEmojiEC = null;
  const b = $('msgElvEmo');
  if(b) b.classList.remove('on');
}

function basculerLePanneauEmoji(barre){
  if(panneauEmojiEC){ fermerLePanneauEmoji(); return; }
  const b = $('msgElvEmo');
  if(b) b.classList.add('on');

  const z = document.createElement('div');
  z.className = 'msgEmo';

  const fams = document.createElement('div');
  fams.className = 'msgEmoFam';
  const grille = document.createElement('div');
  grille.className = 'msgEmoGrille';

  const peindre = () => {
    Array.prototype.forEach.call(fams.children, (x, i) => {
      x.className = (i === familleEmojiEC) ? 'on' : '';
    });
    grille.innerHTML = '';
    FAMILLES_EMOJI[familleEmojiEC].liste.forEach(e => {
      const t = document.createElement('button');
      t.type = 'button';
      t.textContent = e;
      t.addEventListener('click', () => glisserLEmoji(e));
      grille.appendChild(t);
    });
  };

  FAMILLES_EMOJI.forEach((f, i) => {
    const t = document.createElement('button');
    t.type = 'button';
    t.textContent = f.rond;
    t.title = f.nom;
    t.addEventListener('click', () => { familleEmojiEC = i; peindre(); });
    fams.appendChild(t);
  });

  z.appendChild(fams);
  z.appendChild(grille);
  peindre();
  barre.parentNode.insertBefore(z, barre);
  panneauEmojiEC = z;
}

/* ⚠️ L'EMOJI SE POSE LÀ OÙ EST LE CURSEUR, pas à la fin. On tape une
   phrase, on revient au milieu, on pose un emoji : l'envoyer au bout
   serait le poser ailleurs que là où on regarde. Et le panneau reste
   ouvert — on en met souvent deux. */
function glisserLEmoji(e){
  const t = $('msgElvTexte');
  if(!t) return;
  const a = (typeof t.selectionStart === 'number') ? t.selectionStart : t.value.length;
  const b = (typeof t.selectionEnd === 'number') ? t.selectionEnd : a;
  t.value = t.value.slice(0, a) + e + t.value.slice(b);
  const apres = a + e.length;
  try{ t.setSelectionRange(apres, apres); }catch(err){}
  t.focus();
  /* « input » fait son travail habituel : le brouillon, la hauteur du
     champ, et le pouce qui redevient un avion. */
  t.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ------------------------------------------------------------
   LE POUCE

   ⚠️ CE N'EST PAS UN BOUTON DE PLUS. Le bouton d'envoi devient un
   pouce tant que le champ est vide, et redevient un avion dès qu'on
   tape. Sur la barre de 400 px du tiroir, un bouton de plus c'est
   une icône de moins pour écrire.
   ------------------------------------------------------------ */
async function envoyerLePouce(){
  if(!filOuvertEC || !filOuvertEC.conv || !filOuvertEC.peutEcrire) return;
  const b = $('msgElvEnvoyer');
  if(b) b.disabled = true;
  try{
    await appelPrep({ action: 'convEcrire', id: filOuvertEC.conv.id, texte: '👍' });
    await rafraichirLeFil();
  }catch(e){
    if(typeof showToast === 'function'){
      showToast('Le pouce n’est pas parti : ' + (e.message || e));
    }
  }
  if(b) b.disabled = false;
}


/* ============================================================
   🔔 ÊTRE PRÉVENU SUR SON TÉLÉPHONE — étape 3

   David, le 7 octobre : « je veux un vrai systeme de messagerie
   instantané comme messenger ». Le sondage et le direct ne servent
   qu'à celui qui regarde l'écran. Ceci sert à celui qui ne le
   regarde pas — et c'est la seule raison pour laquelle on peut
   demander à un élève de quitter Messenger.

   ⚠️ TOUT CE BLOC EST FACULTATIF, DE BOUT EN BOUT. Pas de clés VAPID
   sur le Worker, pas de service worker dans le navigateur, un
   iPhone qui n'a pas ajouté la page à l'écran d'accueil, une
   autorisation refusée : dans tous les cas rien ne s'affiche, rien
   ne casse, et la messagerie marche exactement comme avant. Une
   fonctionnalité qui empêcherait de lire ses messages le jour où
   elle tombe en panne ne vaudrait pas d'être écrite.

   ⚠️ ET ON NE DEMANDE JAMAIS L'AUTORISATION TOUT SEUL. Un navigateur
   qui voit une demande de notification arriver sans qu'on ait rien
   cliqué la refuse définitivement, et il n'y a ensuite plus aucun
   moyen de revenir en arrière depuis la page. La demande part donc
   d'un clic sur un bouton qui dit ce qu'il fait, et jamais d'un
   démarrage.
   ============================================================ */

let clePousseeEC = '';            /* la clé publique VAPID du Worker */
let pousseeEtatEC = '';           /* '' | 'absent' | 'off' | 'on' | 'refuse' */
let pousseeEnCoursEC = false;

function pousseePossible(){
  return typeof navigator !== 'undefined' &&
         'serviceWorker' in navigator &&
         typeof window !== 'undefined' &&
         'PushManager' in window &&
         typeof Notification !== 'undefined';
}

/* La clé publique du Worker, une seule fois par session. Pas de
   clé : l'étape 3 n'est pas réglée, et l'écran n'en parle pas. */
async function clePoussee(){
  if(clePousseeEC) return clePousseeEC;
  try{
    const d = await appelPrep({ action: 'poussCle' });
    clePousseeEC = (d && d.branche && d.cle) ? d.cle : '';
  }catch(e){ clePousseeEC = ''; }
  return clePousseeEC;
}

/* ⚠️ LA CLÉ VOYAGE EN BASE 64 D'URL, ET LE NAVIGATEUR VEUT DES
   OCTETS. C'est la conversion que tout le monde rate une fois : les
   « - » et les « _ » remplacent les « + » et les « / », et le
   bourrage final a disparu. */
function clePousseeEnOctets(t){
  const propre = String(t || '').replace(/-/g, '+').replace(/_/g, '/');
  const bourre = propre + '='.repeat((4 - (propre.length % 4)) % 4);
  const brut = atob(bourre);
  const out = new Uint8Array(brut.length);
  for(let i = 0; i < brut.length; i++) out[i] = brut.charCodeAt(i);
  return out;
}

function abonnementEnClair(ab){
  const j = ab.toJSON ? ab.toJSON() : {};
  const c = j.keys || {};
  return { endpoint: ab.endpoint, p256dh: c.p256dh || '', auth: c.auth || '' };
}

async function serviceWorkerPret(){
  try{
    /* ⚠️ LE CHEMIN EST RELATIF, ET IL DOIT L'ÊTRE. L'application vit
       dans un sous-dossier sur GitHub Pages : « /sw.js » chercherait
       à la racine du domaine, où il n'y a rien, et la portée du
       service worker déborderait sur les autres pages du compte. */
    return await navigator.serviceWorker.register('sw.js');
  }catch(e){
    return null;
  }
}

/* ------------------------------------------------------------
   AU DÉMARRAGE : ON NE DEMANDE RIEN, ON RÉPARE

   ⚠️ UN ABONNEMENT SE PÉRIME TOUT SEUL. Le navigateur le remplace
   quand il veut, et le nôtre, dans la base, pointe alors vers un
   point d'arrivée mort. On le réenregistre donc à chaque démarrage
   quand l'autorisation est DÉJÀ donnée — c'est muet, ça ne demande
   rien à personne, et ça répare la seule panne qu'on ne verrait
   jamais autrement : des notifications qui s'arrêtent sans rien
   dire.
   ------------------------------------------------------------ */
async function reprendreLaPoussee(){
  if(!pousseePossible()) return;
  if(Notification.permission !== 'granted') return;
  if(!await clePoussee()) return;

  const reg = await serviceWorkerPret();
  if(!reg) return;
  try{
    const dejà = await reg.pushManager.getSubscription();
    const ab = dejà || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: clePousseeEnOctets(clePousseeEC)
    });
    await appelPrep(Object.assign({ action: 'poussAbonner' }, abonnementEnClair(ab)));
    pousseeEtatEC = 'on';
  }catch(e){ /* muet : on réessaiera au prochain démarrage */ }
}

/* ------------------------------------------------------------
   LE CLIC

   Deux temps, et c'est volontaire : le navigateur demande
   l'autorisation, puis on s'abonne. Si l'autorisation est refusée,
   on s'arrête là et on le dit — insister ne sert à rien, la décision
   est dans les réglages du téléphone à partir de ce moment.
   ------------------------------------------------------------ */
async function demanderLaPoussee(bouton){
  if(pousseeEnCoursEC) return;
  pousseeEnCoursEC = true;
  if(bouton) bouton.disabled = true;

  try{
    const cle = await clePoussee();
    if(!cle) throw new Error('Les notifications ne sont pas réglées sur le serveur.');

    const rep = await Notification.requestPermission();
    if(rep !== 'granted'){
      pousseeEtatEC = 'refuse';
      dessinerLaPoussee();
      return;
    }

    const reg = await serviceWorkerPret();
    if(!reg) throw new Error('Le navigateur a refusé le service de notification.');
    /* ⚠️ ON ATTEND QU'IL SOIT PRÊT. Juste après « register », le
       service worker est en train de s'installer : s'abonner tout de
       suite échoue une fois sur deux, et l'erreur n'a aucun sens
       pour celui qui la lit. */
    await navigator.serviceWorker.ready;

    const ab = await reg.pushManager.getSubscription() ||
      await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: clePousseeEnOctets(cle)
      });

    await appelPrep(Object.assign({ action: 'poussAbonner' }, abonnementEnClair(ab)));
    pousseeEtatEC = 'on';
    if(typeof showToast === 'function'){
      showToast('🔔 Tu seras prévenu sur cet appareil.');
    }
  }catch(e){
    if(typeof showToast === 'function'){
      showToast('Notifications impossibles : ' + (e.message || e));
    }
  }
  pousseeEnCoursEC = false;
  if(bouton) bouton.disabled = false;
  dessinerLaPoussee();
}

async function arreterLaPoussee(bouton){
  if(pousseeEnCoursEC) return;
  pousseeEnCoursEC = true;
  if(bouton) bouton.disabled = true;
  try{
    const reg = await navigator.serviceWorker.getRegistration();
    const ab = reg && await reg.pushManager.getSubscription();
    if(ab){
      /* ⚠️ ON PRÉVIENT LE SERVEUR AVANT DE SE DÉSABONNER. Dans
         l'autre ordre, un échec réseau laisse une ligne morte dans la
         base qu'on relancera à chaque message jusqu'au cinquième
         échec. */
      await appelPrep({ action: 'poussOublier', endpoint: ab.endpoint });
      await ab.unsubscribe();
    }
    pousseeEtatEC = 'off';
    if(typeof showToast === 'function') showToast('Notifications arrêtées sur cet appareil.');
  }catch(e){
    if(typeof showToast === 'function'){
      showToast('Impossible d’arrêter : ' + (e.message || e));
    }
  }
  pousseeEnCoursEC = false;
  if(bouton) bouton.disabled = false;
  dessinerLaPoussee();
}

/* ------------------------------------------------------------
   LA LIGNE DANS L'ÉCRAN

   ⚠️ ELLE N'EST PAS DANS LE TIROIR. Le tiroir sert à répondre vite à
   un message qu'on vient de recevoir ; un réglage d'appareil se fait
   une fois, assis, dans l'onglet.
   ------------------------------------------------------------ */
async function preparerLaPoussee(){
  /* Une seule fois par session : l'état ne change qu'au clic, et la
     liste des conversations se redessine toutes les quatre
     secondes. */
  if(pousseeEtatEC) return;
  if(!pousseePossible()){ pousseeEtatEC = 'absent'; return; }
  if(!await clePoussee()){ pousseeEtatEC = 'absent'; return; }

  if(Notification.permission === 'denied'){ pousseeEtatEC = 'refuse'; }
  else if(Notification.permission === 'granted'){
    try{
      const reg = await navigator.serviceWorker.getRegistration();
      const ab = reg && await reg.pushManager.getSubscription();
      pousseeEtatEC = ab ? 'on' : 'off';
    }catch(e){ pousseeEtatEC = 'off'; }
  }else pousseeEtatEC = 'off';

  dessinerLaPoussee();
}

function dessinerLaPoussee(){
  const zone = (typeof $ === 'function') ? $('msgPoussee') : null;
  if(!zone) return;
  zone.innerHTML = '';
  if(pousseeEtatEC === 'absent' || !pousseeEtatEC) return;

  const ligne = document.createElement('div');
  ligne.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;' +
    'padding:9px 12px;border-radius:12px;margin-bottom:10px;' +
    'background:var(--navy-deep);border:1px solid var(--line);';

  const texte = document.createElement('div');
  texte.style.cssText = 'flex:1;min-width:170px;font-size:12.5px;line-height:1.45;' +
    'color:var(--soft);';

  if(pousseeEtatEC === 'refuse'){
    texte.innerHTML = '🔕 Les notifications sont bloquées pour ce site.<br>' +
      '<span style="color:var(--muted);font-size:11.5px;">' +
      'Ça se débloque dans les réglages du navigateur, pas ici.</span>';
    ligne.appendChild(texte);
  }else if(pousseeEtatEC === 'on'){
    texte.innerHTML = '🔔 Tu es prévenu sur cet appareil.<br>' +
      '<span style="color:var(--muted);font-size:11.5px;">' +
      'La notification dit qui écrit, jamais ce qui est écrit.</span>';
    ligne.appendChild(texte);
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;margin:0;padding:6px 12px;font-size:12px;';
    b.textContent = 'Arrêter';
    b.addEventListener('click', () => arreterLaPoussee(b));
    ligne.appendChild(b);
  }else{
    texte.innerHTML = '🔔 Être prévenu des nouveaux messages sur cet appareil.<br>' +
      '<span style="color:var(--muted);font-size:11.5px;">' +
      'À faire une fois par téléphone ou par tablette.</span>';
    ligne.appendChild(texte);
    const b = document.createElement('button');
    b.className = 'btn';
    b.style.cssText = 'width:auto;margin:0;padding:6px 14px;font-size:12px;' +
      'background:var(--orange);color:var(--on-accent);font-weight:700;';
    b.textContent = 'Activer';
    b.addEventListener('click', () => demanderLaPoussee(b));
    ligne.appendChild(b);
  }

  zone.appendChild(ligne);
}

/* ------------------------------------------------------------
   ON CLIQUE SUR LA NOTIFICATION

   Le service worker nous dit quel fil ouvrir plutôt que de recharger
   la page : l'application est peut-être déjà ouverte sur tout autre
   chose, et la recharger ferait perdre ce qui est en train d'être
   tapé ailleurs.
   ------------------------------------------------------------ */
function ecouterLeServiceWorker(){
  if(!pousseePossible() || !navigator.serviceWorker) return;
  navigator.serviceWorker.addEventListener('message', function(ev){
    const d = ev && ev.data;
    if(!d || d.quoi !== 'ouvrirFil' || !d.fil) return;
    try{
      if(typeof afficherVue === 'function') afficherVue('messagerie', 'messagerie');
      ouvrirLeFil(d.fil);
    }catch(e){}
  });
}

/* Et le cas de la page qui s'ouvre POUR la notification : le fil
   demandé est dans l'adresse. On la nettoie derrière nous — un
   rechargement ne doit pas rouvrir le même fil trois jours plus
   tard. */
function filDemandeParLAdresse(){
  try{
    const u = new URL(window.location.href);
    const fil = u.searchParams.get('fil');
    if(!fil) return '';
    u.searchParams.delete('fil');
    window.history.replaceState(null, '', u.pathname + u.search + u.hash);
    return fil;
  }catch(e){ return ''; }
}


/* ============================================================
   📡 LE FIL EN DIRECT — étape 2

   David, le 7 octobre : « je veux un vrai systeme de messagerie
   instantané ». L'étape 1 tenait la promesse par un sondage de
   quatre secondes ; celle-ci la tient vraiment — le fil ouvert ne
   demande plus, il reçoit.

   ⚠️ LE DIRECT EST UN ACCÉLÉRATEUR, PAS UN MÉCANISME. Tout ce qui
   suit peut échouer — liaison Durable Object absente du Worker,
   WebSocket bloqué par le réseau d'un hôtel, connexion coupée en
   silence par un routeur — et la messagerie doit continuer de
   marcher exactement comme avant. Le sondage ne disparaît donc
   jamais : il PASSE DE QUATRE À TRENTE SECONDES quand le direct
   répond, et revient à quatre dès qu'il se tait. Une messagerie qui
   ne marche que si le temps réel marche est une messagerie plus
   fragile que celle d'hier.

   ⚠️ ET LE CODE D'ACCÈS NE PASSE PAS DANS L'ADRESSE. Un navigateur
   ne peut pas poser d'en-têtes sur une connexion WebSocket : on
   échange donc le code, par un appel normal, contre un billet à
   usage unique valable soixante secondes et pour UNE conversation.
   Voir « poserUnBillet » côté Worker.
   ============================================================ */

const PAS_DIRECT_PING = 45000;     /* un mot pour tenir la ligne ouverte */
const PAS_DIRECT_MUET = 20000;     /* sans réponse après ça, elle est morte */
const PAS_SONDAGE_LENT = 30000;    /* le filet, quand le direct répond */

let pousseeRepriseFaite = false;

let socketDuFil = null;
let pingDuFil = null;
let muetDuFil = null;
let repriseDuDirect = null;
let essaisDuDirect = 0;
let filDuDirect = '';              /* la conversation branchée */

function leDirectEstBranche(){
  return !!(socketDuFil && socketDuFil.readyState === 1);
}

function adresseDuDirect(billet){
  const base = (typeof CONFIG !== 'undefined' && CONFIG.WORKER_URL) || '';
  return base.replace(/^http/, 'ws') + '/ws?b=' + encodeURIComponent(billet);
}

async function brancherLeDirect(id){
  couperLeDirect();
  if(!id || typeof WebSocket === 'undefined') return;
  filDuDirect = id;

  let billet = '';
  try{
    const d = await appelPrep({ action: 'convDirect', id: id });
    billet = (d && d.billet) || '';
  }catch(e){
    /* Pas de Durable Object branché sur le Worker, ou appel refusé :
       on ne réessaie pas en boucle. Le sondage de quatre secondes
       fait son travail, et personne ne voit la différence. */
    return;
  }
  if(!billet || filDuDirect !== id) return;

  let ws;
  try{ ws = new WebSocket(adresseDuDirect(billet)); }
  catch(e){ return; }
  socketDuFil = ws;

  ws.onopen = () => {
    if(socketDuFil !== ws) return;
    essaisDuDirect = 0;
    /* Le sondage passe au ralenti : il reste le filet, il n'est
       plus le mécanisme. */
    veillerLeFil();
    battreLeDirect();
  };

  ws.onmessage = (ev) => {
    if(socketDuFil !== ws) return;
    /* ⚠️ TOUT MESSAGE PROUVE QUE LA LIGNE EST VIVANTE, « pong »
       compris : on repart donc du silence à chaque fois. */
    armerLeSilence();
    if(String(ev.data) === 'pong') return;
    /* Le haut-parleur ne porte jamais le contenu — il dit qu'il y a
       du nouveau. On relit D1 par le chemin habituel : une seule
       vérité, et pas deux à tenir d'accord. */
    rafraichirLeFil(true);
  };

  ws.onclose = () => { if(socketDuFil === ws) perdreLeDirect(); };
  ws.onerror = () => { if(socketDuFil === ws) perdreLeDirect(); };
}

/* ⚠️ UNE CONNEXION PEUT MOURIR SANS LE DIRE. Un réseau mobile qui
   bascule, un routeur qui coupe une ligne silencieuse : la prise
   reste « ouverte » côté navigateur et plus rien n'arrive. Le mot
   toutes les quarante-cinq secondes sert à ça, et l'absence de
   réponse en vingt secondes est la seule preuve qu'on puisse avoir. */
function battreLeDirect(){
  if(pingDuFil) clearInterval(pingDuFil);
  pingDuFil = setInterval(() => {
    if(!leDirectEstBranche()) return perdreLeDirect();
    try{ socketDuFil.send('ping'); }catch(e){ return perdreLeDirect(); }
    armerLeSilence();
  }, PAS_DIRECT_PING);
}

function armerLeSilence(){
  if(muetDuFil) clearTimeout(muetDuFil);
  muetDuFil = setTimeout(() => perdreLeDirect(), PAS_DIRECT_MUET);
}

/* On perd la ligne : le sondage rapide reprend immédiatement, et on
   retente plus tard — en espaçant, pour ne pas marteler un Worker
   qui n'a tout simplement pas de Durable Object. */
function perdreLeDirect(){
  const id = filDuDirect;
  couperLeDirect(true);
  if(!id || !unFilEstOuvert() || !filOuvertEC || filOuvertEC.conv.id !== id) return;

  veillerLeFil();            /* retour aux quatre secondes */
  essaisDuDirect++;
  if(essaisDuDirect > 4) return;
  const attente = Math.min(60000, 3000 * Math.pow(2, essaisDuDirect - 1));
  repriseDuDirect = setTimeout(() => {
    if(unFilEstOuvert() && filOuvertEC && filOuvertEC.conv.id === id){
      brancherLeDirect(id);
    }
  }, attente);
}

function couperLeDirect(garderLeCompte){
  if(pingDuFil){ clearInterval(pingDuFil); pingDuFil = null; }
  if(muetDuFil){ clearTimeout(muetDuFil); muetDuFil = null; }
  if(repriseDuDirect){ clearTimeout(repriseDuDirect); repriseDuDirect = null; }
  if(socketDuFil){
    const s = socketDuFil;
    socketDuFil = null;
    try{ s.onopen = s.onmessage = s.onclose = s.onerror = null; }catch(e){}
    try{ s.close(); }catch(e){}
  }
  if(!garderLeCompte){ essaisDuDirect = 0; filDuDirect = ''; }
}


/* ============================================================
   💬 LE TIROIR — un bandeau vertical, par-dessus l'écran

   David, le 8 octobre : « un logo en haut avant l'emplacement de la
   CB qui ouvre la messagerie sous forme de bandeau vertical », et
   « par dessus ».

   Il garde le fil ouvert d'un passage à l'autre : on le referme
   pour regarder un cours, on le rouvre, et la conversation est
   toujours là. C'est tout ce qu'on lui demande — répondre vite,
   sans perdre sa place.
   ============================================================ */
function ouvrirTiroirMessagerie(){
  const t = $('msgElvTiroir');
  const v = $('msgElvVoile');
  if(!t || !v) return;

  tiroirOuvertEC = true;
  v.style.display = 'block';
  t.style.transform = 'translateX(0)';

  /* Un fil déjà ouvert se redessine dans le tiroir ; sinon, la
     liste. Dans les deux cas on relit : le tiroir s'ouvre pour voir
     ce qui vient d'arriver. */
  if(filOuvertEC && filOuvertEC.conv){ dessinerLeFil(); veillerLeFil(); }
  else dessinerLaListeMessagerie();
  afficherMessagerie(true);
}

function fermerTiroirMessagerie(){
  const t = $('msgElvTiroir');
  const v = $('msgElvVoile');
  if(!t || !v) return;

  /* ⚠️ LE BATTEMENT S'ARRÊTE AVEC LE TIROIR. Un tiroir refermé qui
     continue d'interroger le serveur toutes les quatre secondes,
     c'est la batterie d'une tablette posée sur son support toute la
     journée. */
  arreterLaVeilleDuFil();
  /* Et la connexion en direct avec lui : une prise ouverte sur un
     tiroir fermé, c'est la même batterie dépensée pour rien. */
  if(typeof couperLeDirect === 'function') couperLeDirect();

  tiroirOuvertEC = false;
  t.style.transform = 'translateX(100%)';
  v.style.display = 'none';

  /* L'onglet, s'il est ouvert derrière, reprend la main sur le
     dessin : sans ça il garderait l'écran d'avant l'ouverture. */
  const z = $('messagerieZone');
  if(z && z.offsetParent !== null) afficherMessagerie(true);
}

function basculerTiroirMessagerie(){
  if(tiroirOuvertEC) fermerTiroirMessagerie();
  else ouvrirTiroirMessagerie();
}

/* Le tiroir pour répondre, l'onglet pour travailler : ↗️ emmène de
   l'un à l'autre en gardant le fil ouvert. */
function ouvrirLaMessagerieEnGrand(){
  const garde = filOuvertEC;
  fermerTiroirMessagerie();
  if(typeof afficherVue === 'function') afficherVue('messagerie', 'messagerie');
  if(garde && garde.conv) ouvrirLeFil(garde.conv.id);
  else afficherMessagerie(true);
}

function brancherLeTiroirMessagerie(){
  const b = $('msgElvBtn');
  if(b) b.addEventListener('click', basculerTiroirMessagerie);
  const f = $('msgElvFermer');
  if(f) f.addEventListener('click', fermerTiroirMessagerie);
  const v = $('msgElvVoile');
  if(v) v.addEventListener('click', fermerTiroirMessagerie);
  const g = $('msgElvGrand');
  if(g) g.addEventListener('click', ouvrirLaMessagerieEnGrand);

  /* ⚠️ ÉCRIRE SE FAIT DEPUIS LE TIROIR — v1079.

     David : « dans la barre latérale quand on appuie en haut il faut
     que l'on puisse ouvrir une nouvelle discussion rapidement ».

     J'avais écrit en v1074 que « chercher et créer sont des gestes
     qu'on fait assis » et retiré le bouton du tiroir. C'était une
     décision de trop : on ouvre le tiroir justement parce qu'on veut
     écrire à quelqu'un. Le bouton remonte donc dans l'en-tête, où il
     ne coûte aucune place à la liste, et il est le seul des trois à
     porter l'accent — les deux autres referment ou déplacent ce
     qu'on regarde, celui-ci fait quelque chose de neuf. */
  const n = $('msgElvNeuf');
  if(n) n.addEventListener('click', () => ecranNouvelleConversation());

  /* Posé tout de suite dans son état d'avant connexion — il
     réapparaîtra au premier comptage, une fois les droits connus. */
  montrerLeBoutonMessagerie();

  /* 🔔 Le service worker nous dira quel fil ouvrir quand on cliquera
     sur une notification — étape 3. Aucun appel réseau ici : on
     branche une oreille, c'est tout. */
  ecouterLeServiceWorker();

  veillerLeCompteMessagerie();

  /* Échap referme : c'est le geste qu'on fait sans y penser devant
     un panneau qui s'est ouvert par-dessus. */
  document.addEventListener('keydown', ev => {
    if(ev.key === 'Escape' && tiroirOuvertEC) fermerTiroirMessagerie();
  });
}

/* Branché au chargement : le bouton vit dans l'en-tête, il n'attend
   l'ouverture d'aucun onglet. */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', brancherLeTiroirMessagerie);
}else{
  brancherLeTiroirMessagerie();
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-messagerie.js'] = true;
