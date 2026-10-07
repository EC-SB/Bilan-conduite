/* Déployé le 08/10/2026 à 15:20 — v1078 */
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
    const d = await appelPrep({ action: 'convList', fermees: filtreMessagerie === 'clos' });
    conversationsEC = (d && d.conversations) || [];
    if(typeof poserCompteVue === 'function'){
      poserCompteVue('messagerie', (d && d.nonLusTotal) || 0);
    }
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

  /* Dans le tiroir : la liste, et rien d'autre. Chercher et créer
     sont des gestes qu'on fait assis, pas entre deux cours. */
  if(!dansLeTiroir()){
    zone.appendChild(barreDeRechercheMessagerie());
    zone.appendChild(barreDesGenresMessagerie());
    if(chercheMessagerie){ return; }   /* la recherche a pris la place */
  }

  const liste = conversationsEC.filter(c =>
    !filtreMessagerie || filtreMessagerie === 'clos' || c.genre === filtreMessagerie);

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

  if(!dansLeTiroir() && typeof aDroit === 'function' &&
     (aDroit('messagerie_bureau') || aDroit('messagerie_admin'))){
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
function titreDuFil(c){
  if(c.titre) return c.titre;
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

  const comptes = {};
  conversationsEC.forEach(c => { comptes[c.genre] = (comptes[c.genre] || 0) + 1; });

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
      if(filtreMessagerie === 'clos' || on) afficherMessagerie(true);
      else dessinerLaListeMessagerie();
    });
    b.appendChild(x);
  };

  bouton('', 'Tout', conversationsEC.length);
  Object.keys(GENRES_MESSAGERIE).forEach(cle => {
    if(comptes[cle]) bouton(cle, GENRES_MESSAGERIE[cle].rond, comptes[cle]);
  });
  bouton('clos', '🗄️ Fermées', null);

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
}

function fermerLeFil(){
  filOuvertEC = null;
  arreterLaVeilleDuFil();
  afficherMessagerie(true);
}

function dessinerLeFil(){
  const zone = zoneDeLaMessagerie();
  if(!zone || !filOuvertEC) return;
  const f = filOuvertEC;
  const c = f.conv || {};

  zone.innerHTML = '';

  /* --- l'en-tête --- */
  const tete = document.createElement('div');
  tete.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;' +
    'padding-bottom:10px;border-bottom:1px solid var(--line);margin-bottom:12px;';

  const retour = document.createElement('button');
  retour.className = 'btn btn-secondary';
  retour.style.cssText = 'width:auto;margin:0;padding:8px 12px;font-size:14px;';
  retour.textContent = '←';
  retour.title = 'Revenir à la liste';
  retour.addEventListener('click', fermerLeFil);
  tete.appendChild(retour);

  const titres = document.createElement('div');
  titres.style.cssText = 'flex:1;min-width:0;';
  titres.innerHTML =
    '<div style="font-size:15px;font-weight:800;">' +
      echapper(titreDuFil(Object.assign({}, c, { membres: f.membres }))) + '</div>' +
    '<div style="font-size:11.5px;color:var(--muted);">' +
      echapper(phraseDesMembres(f)) + '</div>';
  tete.appendChild(titres);
  zone.appendChild(tete);

  if(f.enSupervision){
    const s = document.createElement('div');
    s.className = 'hint';
    s.style.cssText = 'font-size:12px;color:var(--warn-text);line-height:1.5;margin:0 0 12px;';
    s.textContent = '🔒 Tu lis en supervision : tu n’es pas dans cette ' +
      'conversation, et cette lecture est inscrite au journal. Pour y répondre, ' +
      'ajoute-toi — ton arrivée s’écrira dans le fil.';
    zone.appendChild(s);
  }

  /* --- le fil --- */
  const fil = document.createElement('div');
  fil.id = 'msgElvFil';
  fil.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'background:var(--navy);padding:12px;margin-bottom:12px;' +
    'max-height:52vh;overflow-y:auto;';

  if(f.encore){
    const plus = document.createElement('button');
    plus.className = 'btn btn-secondary';
    plus.style.cssText = 'width:auto;margin:0 auto 10px;display:block;padding:6px 12px;' +
      'font-size:12px;border-radius:999px;';
    plus.textContent = '↑ Messages plus anciens';
    plus.addEventListener('click', () => chargerPlusDuFil(plus));
    fil.appendChild(plus);
  }

  let jourPose = '';
  (f.messages || []).forEach(m => {
    const jour = String(m.envoyeLe || '').slice(0, 10);
    if(jour && jour !== jourPose){
      jourPose = jour;
      const j = document.createElement('div');
      j.style.cssText = 'text-align:center;font-size:10.5px;letter-spacing:.07em;' +
        'text-transform:uppercase;color:var(--muted);font-weight:700;margin:6px 0 10px;';
      j.textContent = jourLisibleMessagerie(jour);
      fil.appendChild(j);
    }
    fil.appendChild(bulleDuMessage(m));
    if(Number(m.rang || 0) > rangLuEC) rangLuEC = Number(m.rang || 0);
  });

  if(!(f.messages || []).length){
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
    l.style.cssText = 'font-size:11.5px;color:var(--muted);margin:-6px 0 12px;';
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

/* ------------------------------------------------------------
   UNE BULLE
   ------------------------------------------------------------ */

function bulleDuMessage(m){
  const moi = normaliserMessagerie(ACCES.moniteur || '');
  const sienne = (m.auteurGenre !== 'systeme') &&
                 normaliserMessagerie(m.auteur) === moi;

  const b = document.createElement('div');
  b.setAttribute('data-rang', String(m.rang || 0));

  /* ⚠️ UNE LIGNE DE SYSTÈME N'EST PAS UNE BULLE. Arrivée de
     quelqu'un, départ, changement d'état d'un objet oublié : la
     conversation raconte ce qui s'est passé, et personne ne le
     saisit deux fois. Elle se distingue par son pointillé — qu'elle
     ressemble à un message rendrait les deux douteux. */
  if(m.auteurGenre === 'systeme'){
    b.style.cssText = 'max-width:100%;border:1px dashed var(--line);border-radius:14px;' +
      'padding:7px 12px;margin-bottom:9px;font-size:12.5px;color:var(--muted);' +
      'text-align:center;';
    b.textContent = m.texte + (m.auteur ? ' — ' + m.auteur : '');
    return b;
  }

  b.style.cssText = 'max-width:82%;border-radius:14px;padding:9px 12px;' +
    'margin-bottom:9px;font-size:14px;line-height:1.55;white-space:pre-wrap;' +
    'word-break:break-word;' +
    (sienne
      ? 'background:var(--orange-soft);border:1px solid var(--orange);margin-left:auto;'
      : 'background:var(--navy-deep);border:1px solid var(--line);margin-right:auto;');

  let h = '';
  /* La signature n'est pas sur ses propres bulles : il sait qui il
     est, et la répéter vole une ligne sur un téléphone. */
  if(!sienne){
    h += '<span style="display:block;font-size:10.5px;color:var(--muted);' +
         'margin-bottom:3px;font-weight:700;">' + echapper(m.auteur || '') +
         (m.auteurGenre === 'eleve' ? ' · élève' : '') + '</span>';
  }
  if(m.motif && GENRES_MESSAGERIE[m.motif]){
    h += '<span style="display:block;font-size:10.5px;color:var(--warn-text);' +
         'margin-bottom:3px;font-weight:800;">' +
         GENRES_MESSAGERIE[m.motif].rond + ' ' +
         echapper(GENRES_MESSAGERIE[m.motif].quoi) + '</span>';
  }
  h += echapper(m.texte || '');
  h += '<span style="display:block;font-size:10.5px;color:var(--muted);' +
       'margin-top:4px;text-align:right;">' +
       echapper(String(m.envoyeLe || '').slice(11) || m.envoyeLe || '') + '</span>';

  b.innerHTML = h;
  return b;
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
  l.style.cssText = 'display:flex;gap:8px;align-items:flex-end;';

  const t = document.createElement('textarea');
  t.id = 'msgElvTexte';
  t.rows = 2;
  t.placeholder = 'Écris ton message…';
  t.value = brouillonsMessagerie[id] || '';
  t.style.cssText = 'flex:1;min-width:0;margin:0;resize:vertical;';
  /* Ce qu'on a tapé sans envoyer survit au redessin du battement :
     perdre trois lignes parce qu'un message est arrivé pendant
     qu'on écrivait serait la première chose qu'on reprocherait à
     cette messagerie. */
  t.addEventListener('input', () => { brouillonsMessagerie[id] = t.value; });
  t.addEventListener('keydown', ev => {
    if(ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)){
      ev.preventDefault();
      ecrireDansLeFil();
    }
  });
  l.appendChild(t);

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.id = 'msgElvEnvoyer';
  b.style.cssText = 'width:auto;flex:0 0 auto;margin:0;padding:12px 16px;';
  b.textContent = '📨';
  b.title = 'Envoyer (Ctrl + Entrée)';
  b.addEventListener('click', ecrireDansLeFil);
  l.appendChild(b);

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
  battementMessagerie = setInterval(() => {
    if(!filOuvertEC) return arreterLaVeilleDuFil();
    /* Personne devant l'écran : relire ne servirait qu'à consommer
       des appels. C'est la règle de tous les battements de l'outil. */
    if(document.hidden) return;
    if(typeof reseauEnPause === 'function' && reseauEnPause()) return;
    rafraichirLeFil(true);
  }, PAS_MESSAGERIE);
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
  if(combien !== avant || dernier !== rangLuEC || viser){
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
  try{
    await appelPrep({ action: 'convLu', id: filOuvertEC.conv.id });
  }catch(e){ /* la pastille se corrigera au prochain passage */ }
}

/* ------------------------------------------------------------
   LES ACTIONS D'UN FIL
   ------------------------------------------------------------ */

function barreDesActionsDuFil(f){
  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;' +
    'padding-top:10px;border-top:1px solid var(--line);';

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
      '<label for="msgElvGenre">Quelle sorte</label>' +
      '<select id="msgElvGenre">' +
        '<option value="groupe">👥 Un groupe — élèves et collègues mélangés</option>' +
        '<option value="interne">🏠 Entre nous — entre utilisateurs de l’outil</option>' +
        '<option value="bureau">🏢 Avec un élève, au nom du bureau</option>' +
      '</select>' +
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

  if(opt.avecSorte){
    $('msgElvGenre').addEventListener('change', () => {
      poserLesModes();
      majAvisDeLaConversation();
    });
  }

  dessinerLesPastilles();
  majAvisDeLaConversation();
}

/* Deux boutons plutôt que deux ronds à cocher : c'est la forme de
   tous les autres choix de l'outil, et elle se vise au doigt. */
let modeChoisi = 'discussion';

function poserLesModes(){
  const z = $('msgElvModes');
  const zt = $('msgElvZoneTitre');
  const zm = $('msgElvZoneMode');
  const genre = $('msgElvGenre') ? $('msgElvGenre').value : 'groupe';

  if(zt) zt.style.display = (genre === 'groupe') ? '' : 'none';
  if(zm) zm.style.display = (genre === 'interne') ? 'none' : '';
  if(!z) return;

  /* Entre nous, « annonce » n'a pas de sens : personne à qui
     interdire la parole. */
  if(genre === 'interne') modeChoisi = 'discussion';

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

  const genre = $('msgElvGenre') ? $('msgElvGenre').value
              : ((filEnModification && filEnModification.conv.genre) || 'groupe');
  const mode = filEnModification ? (filEnModification.conv.mode || 'discussion')
                                 : modeChoisi;

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
  const genre = $('msgElvGenre').value;
  const titre = (($('msgElvTitre') || {}).value || '').trim();

  if(genre === 'groupe' && titre.length < 2){
    if(typeof showToast === 'function') showToast('Donne un nom au groupe.');
    return;
  }
  if(genre === 'bureau' && choixEleves.length !== 1){
    if(typeof showToast === 'function'){
      showToast('Une conversation au nom du bureau porte sur UN élève.');
    }
    return;
  }
  if(genre === 'interne' && choixUsers.length < 2){
    if(typeof showToast === 'function'){
      showToast('Ajoute au moins une deuxième personne de l’équipe.');
    }
    return;
  }
  if(genre !== 'interne' && !choixEleves.length){
    if(typeof showToast === 'function') showToast('Ajoute au moins un élève.');
    return;
  }

  if(bouton){ bouton.disabled = true; bouton.textContent = 'Ouverture…'; }
  try{
    const d = await appelPrep({
      action: 'convCreer', genre: genre, mode: modeChoisi, titre: titre,
      users: JSON.stringify(choixUsers), eleves: JSON.stringify(choixEleves),
      avecBureau: (genre !== 'interne') ? '1' : ''
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
  if(typeof aDroit === 'function' && !aDroit('messagerie')){
    poserPastilleMessagerie(0);
    return;
  }
  if(typeof ACCES === 'undefined' || !ACCES.code) return;

  /* Les objets voyagent sur le même battement : voir la note en
     tête de compterLesObjets. */
  compterLesObjets();

  try{
    const d = await appelPrep({ action: 'convList' });
    conversationsEC = (d && d.conversations) || [];
    const n = (d && d.nonLusTotal) || 0;
    if(typeof poserCompteVue === 'function') poserCompteVue('messagerie', n);
    poserPastilleMessagerie(n);
  }catch(e){ /* la pastille attendra le prochain passage */ }
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
  if(!b) return;
  const ouvert = (typeof aDroit !== 'function') || aDroit('messagerie');
  b.style.display = ouvert ? 'inline-flex' : 'none';
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
