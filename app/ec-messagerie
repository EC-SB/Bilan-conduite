/* Déployé le 07/10/2026 à 18:10 — v1070 */
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
  const zone = $('messagerieZone');
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
  const zone = $('messagerieZone');
  if(!zone) return;
  zone.innerHTML = '';

  zone.appendChild(barreDeRechercheMessagerie());
  zone.appendChild(barreDesGenresMessagerie());

  if(chercheMessagerie){ return; }   /* la recherche a pris la place */

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

  if(typeof aDroit === 'function' &&
     (aDroit('messagerie_bureau') || aDroit('messagerie_admin'))){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'margin-top:12px;padding:10px;font-size:13px;';
    b.textContent = '👥 Nouvelle conversation';
    b.addEventListener('click', ecranNouvelleConversation);
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
  const zone = $('messagerieZone');
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
  const zone = $('messagerieZone');
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
  const zone = $('messagerieZone');
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

  if(peutGerer){
    petit('➕ Ajouter quelqu’un',
          'Son arrivée s’écrira dans le fil', () => ajouterAuFil(f));
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

async function ajouterAuFil(f){
  const qui = await demander('Qui veux-tu ajouter ?\n\n' +
    'Écris son nom exactement comme il figure dans l’outil.\n' +
    'Son arrivée sera inscrite dans le fil.');
  if(qui === null) return;
  const nom = String(qui).trim();
  if(nom.length < 2) return;

  /* Un nom qui n'est ni un utilisateur ni un élève connu partirait
     dans la base sans jamais pouvoir se connecter : on le dit
     avant, pas après. */
  const estUser = (typeof moniteursActifs !== 'undefined' &&
                   Array.isArray(moniteursActifs))
    ? moniteursActifs.some(m => normaliserMessagerie(m.nom || m) ===
                                normaliserMessagerie(nom))
    : true;

  await appelPrep(Object.assign({ action: 'convMembres', id: f.conv.id },
    estUser ? { users: JSON.stringify([nom]) } : { eleves: JSON.stringify([nom]) }));
  await ouvrirLeFil(f.conv.id);
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

/* ------------------------------------------------------------
   OUVRIR UNE CONVERSATION
   ------------------------------------------------------------ */

function ecranNouvelleConversation(){
  const zone = $('messagerieZone');
  if(!zone) return;
  zone.innerHTML = '';

  const tete = document.createElement('div');
  tete.style.cssText = 'display:flex;gap:10px;align-items:center;' +
    'padding-bottom:10px;border-bottom:1px solid var(--line);margin-bottom:14px;';
  const retour = document.createElement('button');
  retour.className = 'btn btn-secondary';
  retour.style.cssText = 'width:auto;margin:0;padding:8px 12px;font-size:14px;';
  retour.textContent = '←';
  retour.addEventListener('click', () => afficherMessagerie(true));
  tete.appendChild(retour);
  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:15px;font-weight:800;';
  t.textContent = '👥 Nouvelle conversation';
  tete.appendChild(t);
  zone.appendChild(tete);

  const form = document.createElement('div');
  form.innerHTML =
    '<label for="msgElvGenre">Quelle sorte</label>' +
    '<select id="msgElvGenre">' +
      '<option value="interne">🏠 Entre nous — entre utilisateurs de l’outil</option>' +
      '<option value="groupe">👥 Groupe — élèves et utilisateurs mélangés</option>' +
      '<option value="bureau">🏢 Avec un élève, au nom du bureau</option>' +
    '</select>' +
    '<div id="msgElvZoneTitre">' +
      '<label for="msgElvTitre">Nom du groupe</label>' +
      '<input type="text" id="msgElvTitre" placeholder="Ex : Permis du 14 octobre">' +
    '</div>' +
    '<div id="msgElvZoneMode">' +
      '<label>Comment ça marche</label>' +
      '<label style="display:flex;align-items:center;gap:9px;font-size:13.5px;' +
        'text-transform:none;letter-spacing:normal;color:var(--cream);' +
        'margin-bottom:7px;cursor:pointer;">' +
        '<input type="radio" name="msgElvMode" value="discussion" checked ' +
          'style="width:19px;height:19px;flex-shrink:0;margin:0;">' +
        '<span>💬 Discussion — tout le monde écrit et se voit</span></label>' +
      '<label style="display:flex;align-items:center;gap:9px;font-size:13.5px;' +
        'text-transform:none;letter-spacing:normal;color:var(--cream);' +
        'margin-bottom:12px;cursor:pointer;">' +
        '<input type="radio" name="msgElvMode" value="annonce" ' +
          'style="width:19px;height:19px;flex-shrink:0;margin:0;">' +
        '<span>📣 Annonce — seule l’école écrit ; les élèves ne se voient ' +
          'pas entre eux</span></label>' +
    '</div>' +
    '<label for="msgElvUsers">Nous — un nom par ligne</label>' +
    '<textarea id="msgElvUsers" rows="3" placeholder="Maryne&#10;Erika"></textarea>' +
    '<label for="msgElvEleves">Les élèves — un nom par ligne</label>' +
    '<textarea id="msgElvEleves" rows="4" ' +
      'placeholder="Henedi Ahmed&#10;Lucie Morvan"></textarea>' +
    '<div class="hint">Écris les noms exactement comme ils figurent dans l’outil : ' +
      'le nom est la clé du dossier, et un nom approximatif ouvre une conversation ' +
      'que personne ne retrouvera.</div>';
  zone.appendChild(form);

  const avis = document.createElement('div');
  avis.id = 'msgElvAvis';
  avis.style.cssText = 'font-size:12.5px;line-height:1.55;padding:11px 13px;' +
    'border-radius:10px;margin-bottom:14px;background:rgba(0,0,0,.04);' +
    'color:var(--muted);';
  zone.appendChild(avis);

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.textContent = '👥 Ouvrir la conversation';
  b.addEventListener('click', () => creerUnGroupe(b));
  zone.appendChild(b);

  const majAvis = () => {
    const genre = $('msgElvGenre').value;
    const mode = (document.querySelector('input[name="msgElvMode"]:checked') || {}).value;
    const combien = lignesDuChamp('msgElvEleves').length;
    $('msgElvZoneTitre').style.display = (genre === 'groupe') ? '' : 'none';
    $('msgElvZoneMode').style.display = (genre === 'interne') ? 'none' : '';
    /* ⚠️ CE QUE LES ÉLÈVES VERRONT LES UNS DES AUTRES SE DIT AU
       MOMENT OÙ ON DÉCIDE, pas dans une documentation. Dans un
       groupe en discussion, chaque élève apprend le nom et la
       présence des autres. Ça se fait très bien — mais ça se
       choisit. */
    avis.textContent = (genre !== 'interne' && mode === 'discussion' && combien > 1)
      ? 'En mode discussion, ces ' + combien + ' élèves verront les noms et les ' +
        'messages des autres élèves du groupe. En mode annonce, non.'
      : (genre === 'interne'
          ? 'Entre nous : aucun élève n’y a accès.'
          : 'Le bureau fait partie de la conversation : elle ne disparaît pas ' +
            'avec la personne qui l’ouvre.');
  };
  $('msgElvGenre').addEventListener('change', majAvis);
  document.querySelectorAll('input[name="msgElvMode"]').forEach(
    r => r.addEventListener('change', majAvis));
  $('msgElvEleves').addEventListener('input', majAvis);
  majAvis();
}

function lignesDuChamp(id){
  const z = $(id);
  if(!z) return [];
  return z.value.split('\n').map(x => x.trim()).filter(Boolean);
}

async function creerUnGroupe(bouton){
  const genre = $('msgElvGenre').value;
  const titre = (($('msgElvTitre') || {}).value || '').trim();
  const mode = (document.querySelector('input[name="msgElvMode"]:checked') || {}).value;
  const users = lignesDuChamp('msgElvUsers');
  const eleves = lignesDuChamp('msgElvEleves');

  if(genre === 'groupe' && titre.length < 2){
    if(typeof showToast === 'function') showToast('Donne un nom au groupe.');
    return;
  }
  if(genre === 'bureau' && eleves.length !== 1){
    if(typeof showToast === 'function'){
      showToast('Une conversation au nom du bureau porte sur UN élève.');
    }
    return;
  }
  if(!eleves.length && users.length < 1){
    if(typeof showToast === 'function') showToast('Il faut au moins un participant.');
    return;
  }

  if(bouton){ bouton.disabled = true; bouton.textContent = 'Ouverture…'; }
  try{
    const d = await appelPrep({
      action: 'convCreer', genre: genre, mode: mode, titre: titre,
      users: JSON.stringify(users), eleves: JSON.stringify(eleves),
      avecBureau: (genre !== 'interne') ? '1' : ''
    });
    conversationsEC = [];
    await ouvrirLeFil(d.id);
  }catch(e){
    if(typeof showToast === 'function') showToast('Impossible : ' + (e.message || e));
    if(bouton){ bouton.disabled = false; bouton.textContent = '👥 Ouvrir la conversation'; }
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
        if(typeof afficherVue === 'function') afficherVue('eleves', 'messagerie');
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
  if(typeof aDroit === 'function' && !aDroit('messagerie')) return;
  if(typeof ACCES === 'undefined' || !ACCES.code) return;
  try{
    const d = await appelPrep({ action: 'convList' });
    conversationsEC = (d && d.conversations) || [];
    if(typeof poserCompteVue === 'function'){
      poserCompteVue('messagerie', (d && d.nonLusTotal) || 0);
    }
  }catch(e){ /* la pastille attendra le prochain passage */ }
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-messagerie.js'] = true;
