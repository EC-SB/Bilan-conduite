/* Déployé le 14/10/2026 à 11:21 — v1174 */
/* ============================================================
   ec-cockpit.js — 🧭 LA MESSAGERIE EN COCKPIT — v1141

   David, le 12 octobre, sur le schéma « Messagerie — Cockpit » :
   « Je te laisse faire la messagerie comme le schéma au dessus ».
   Il avait choisi la proposition 1 · Cockpit, avec deux gestes de
   la 2 — 📌 épingler, ⏰ « me la rappeler demain » — et les
   raccourcis de la 4 pour les retards (prévenir le moniteur) et les
   objets oubliés. Ses trois arbitrages :
   · 📌 et ⏰ sont À CHACUN : ce que j'épingle ne bouge que chez moi ;
   · les couleurs SUIVENT le thème de l'appli, sombre ou clair ;
   · un retard dont le cours est trouvé PRÉVIENT DÉJÀ le moniteur
     (depuis la v1071) : le bureau voit « vue » ou « pas encore vue »
     et peut le relancer ; « Prévenir un moniteur » ne sert que
     quand le cours n'a pas été trouvé.
   Et pour « 📅 Décaler » : l'accord de l'élève S'ÉCRIT dans le fil,
   c'est le bureau qui reporte le cours dans son planning.

   ⚠️ CE FICHIER NE REFAIT PAS LA MESSAGERIE, IL L'HABILLE.
   ec-messagerie.js garde tout ce qui marche — le battement, le
   direct, les vocaux, les photos, les réactions, la recherche, le
   choix pour supprimer, les participants. Ce fichier-ci apporte la
   mise en page (rail · liste · fil · fiche éclair), les rubriques,
   les bandeaux ⏰ et 🧤, les réponses rapides, la carte du créneau
   et la fiche de l'élève. Une seule fonction dessine chaque chose :
   ec-messagerie.js appelle celles d'ici, jamais l'inverse en double.

   ⚠️ TOUS LES NOMS COMMENCENT PAR « ck ». Les modules partagent une
   seule portée : un « prenomDe » de plus, et c'est la paie qui
   envoie un message à la mauvaise personne (v1135).
   ============================================================ */

/* Ce qu'on lit d'un coup d'œil sur une ligne : le mot du genre, et
   sa couleur. Les noms sont ceux du rail. */
const GENRES_CK = {
  bureau:   { rond: '🏢', mot: 'BUREAU',   coul: 'var(--knt)', nom: 'Bureau' },
  /* 👋 v1171 — un visiteur qui a écrit depuis le QR code de la vitrine */
  vitrine:  { rond: '👋', mot: 'VITRINE',  coul: 'var(--ko)',  nom: 'Vitrine' },
  retard:   { rond: '⏰', mot: 'RETARD',   coul: 'var(--kr)',  nom: 'Retards' },
  annul:    { rond: '🚫', mot: 'ANNUL.',   coul: 'var(--ko)',  nom: 'Annulations' },
  oubli:    { rond: '🧤', mot: 'OBJET',    coul: 'var(--ko)',  nom: 'Objets oubliés' },
  groupe:   { rond: '👥', mot: 'GROUPE',   coul: 'var(--kn2)', nom: 'Groupes' },
  interne:  { rond: '🏠', mot: 'ÉQUIPE',   coul: 'var(--kd)',  nom: 'Entre nous' },
  moniteur: { rond: '👤', mot: 'MONITEUR', coul: 'var(--kn2)', nom: 'Élève ↔ moniteur' }
};

/* Le rail, dans l'ordre du schéma. « moniteur » n'y paraît que s'il
   y a de quoi : c'est une famille que le bureau voit rarement. */
const RAIL_CK = [
  ['', '⌂', 'Tout'], ['bureau', '🏢', 'Bureau'], ['vitrine', '👋', 'Vitrine'], ['retard', '⏰', 'Retards'],
  ['annul', '🚫', 'Annulations'], ['oubli', '🧤', 'Objets oubliés'],
  ['groupe', '👥', 'Groupes'], ['interne', '🏠', 'Entre nous'],
  ['moniteur', '👤', 'Élève ↔ moniteur']
];

/* Les réponses rapides du schéma. « cren » ouvre le formulaire du
   créneau au lieu d'écrire. */
const VITES_CK = [
  { k: 'note',  t: '✅ C’est noté', msg: 'C’est noté, merci 👍' },
  { k: 'cren',  t: '📅 Proposer un créneau' },
  { k: 'regar', t: '⏳ Je regarde et je reviens vers toi',
    msg: 'Je regarde ça et je reviens vers toi dans la journée.' },
  { k: 'appel', t: '📞 Appelle le bureau',
    msg: 'Peux-tu appeler le bureau quand tu as un moment ? 📞' }
];

/* 👋 v1171 — à un visiteur de la vitrine, on dit « vous », et on ne
   propose pas de créneau de conduite : il n'est pas encore élève. */
const VITES_VITRINE_CK = [
  { k: 'rdv',   t: '📅 Prenez rendez-vous ici',
    msg: 'Le plus simple : prenez un rendez-vous de 30 minutes au bureau, directement depuis cette page (bouton « 📅 Prendre rendez-vous au bureau »). À bientôt !' },
  { k: 'regar', t: '⏳ Je regarde et je reviens vers vous',
    msg: 'Je regarde ça et je reviens vers vous dès que possible.' },
  { k: 'appel', t: '📞 Appelez le bureau',
    msg: 'Le plus simple est de nous appeler au bureau : 09 83 55 56 87 📞' },
  { k: 'tarif', t: '💶 Les tarifs',
    msg: 'Nos tarifs dépendent de la formation choisie : le plus simple est d’en parler ensemble au bureau, on vous fait un devis.' }
];

/* La largeur à partir de laquelle on dessine les quatre colonnes, et
   celle à partir de laquelle la fiche éclair tient à droite. En
   dessous de la seconde, elle s'ouvre par ⓘ comme sur le téléphone. */
const CK_LARGE = 900;
const CK_AVEC_FICHE = 1150;

let ckFicheOuverte = false;      /* ⓘ : la fiche en feuille (écran étroit) */
let ckChoixMoniteur = false;     /* « Prévenir un moniteur » déplié */
let ckCreneauOuvert = false;     /* le formulaire du créneau */
let ckCreneauBrouillon = null;   /* ce qu'on y a tapé, pour survivre au battement */
let ckEcranAPart = false;        /* participants ou nouvelle conversation dans la colonne du fil */
const ckNotesDe = {};            /* les notes internes d'un élève, le temps de la session */

/* ------------------------------------------------------------
   OÙ L'ON DESSINE
   ------------------------------------------------------------ */

function ckLarge(){
  if(typeof dansLeTiroir === 'function' && dansLeTiroir()) return false;
  const z = $('messagerieZone');
  if(!z) return false;
  return (z.clientWidth || 0) >= CK_LARGE;
}

function ckAvecFiche(){
  const z = $('messagerieZone');
  return ckLarge() && (z.clientWidth || 0) >= CK_AVEC_FICHE;
}

/* Les quatre colonnes, posées une fois et gardées : redessiner la
   liste ne doit pas effacer le fil qu'on est en train de lire. */
function ckSquelette(){
  const zone = $('messagerieZone');
  if(!zone) return null;
  zone.classList.remove('ckp', 'ckpEtroit', 'msgEtroit');
  let k = null;
  Array.prototype.forEach.call(zone.children, x => {
    if(x.classList && x.classList.contains('ckpLarge')) k = x;
  });
  if(!k){
    zone.innerHTML = '';
    k = document.createElement('div');
    k.className = 'ckp ckpLarge';
    k.innerHTML = '<div class="ckpRail" id="ckpRail"></div>' +
      '<div class="ckpListe" id="ckpListe"></div>' +
      '<div class="ckpFil" id="ckpFil"></div>' +
      '<div class="ckpCtx" id="ckpCtx"></div>';
    zone.appendChild(k);
  }
  k.classList.toggle('sansFiche', !ckAvecFiche());
  ckAjusterHauteur(k);
  return k;
}

/* ⚠️ LA HAUTEUR SE MESURE, ELLE NE SE DEVINE PAS. Le cockpit tient
   dans l'écran — c'est le fil qui défile, pas la page. Ce qu'il y a
   au-dessus (l'en-tête, la barre d'onglets en haut ou en bas selon
   la largeur) change d'un appareil à l'autre : on mesure. */
function ckAjusterHauteur(k){
  if(!k) return;
  const haut = Math.max(0, k.getBoundingClientRect().top + (window.scrollY || 0));
  let bas = 16;
  const barre = $('barreOnglets');
  if(barre){
    const r = barre.getBoundingClientRect();
    /* La barre d'onglets en bas de l'écran mange sa hauteur. */
    if(r.height && r.top > window.innerHeight / 2) bas += r.height;
  }
  const h = Math.max(540, Math.min(940, (window.innerHeight || 800) - Math.min(haut, 260) - bas));
  k.style.height = h + 'px';
}

/* L'étroit : la zone elle-même porte le cockpit, et les écrans se
   remplacent (liste, puis fil) comme sur un téléphone. */
function ckEtroit(zone){
  if(!zone) return zone;
  zone.classList.add('ckp', 'ckpEtroit');
  Array.prototype.slice.call(zone.children).forEach(x => {
    if(x.classList && x.classList.contains('ckpLarge')) x.remove();
  });
  return zone;
}

function zoneListeMsg(){
  if(ckLarge()){ ckSquelette(); return $('ckpListe'); }
  return ckEtroit(zoneDeLaMessagerie());
}

function zoneFilMsg(){
  if(ckLarge()){ ckSquelette(); return $('ckpFil'); }
  return ckEtroit(zoneDeLaMessagerie());
}

function ckFilVide(){
  if(!ckLarge()) return;
  ckSquelette();
  const f = $('ckpFil');
  if(f) f.innerHTML = '<div class="ckpVide">💬<br>Choisis une conversation</div>';
  const x = $('ckpCtx');
  if(x) x.innerHTML = '';
}

window.addEventListener('resize', () => {
  const z = $('messagerieZone');
  if(!z || z.offsetParent === null) return;
  const large = ckLarge();
  const deja = !!z.querySelector('.ckpLarge');
  /* On change de mise en page seulement quand on passe le seuil :
     un redessin à chaque pixel de redimensionnement ferait perdre
     ce qu'on est en train de taper. */
  if(large !== deja){ afficherMessagerie(true); return; }
  if(large){
    const k = z.querySelector('.ckpLarge');
    const avant = k.classList.contains('sansFiche');
    ckAjusterHauteur(k);
    if(avant !== !ckAvecFiche() && filOuvertEC) dessinerLeFil();
    else k.classList.toggle('sansFiche', !ckAvecFiche());
  }
});

/* ------------------------------------------------------------
   📌 ⏰ — À SOI SEUL
   ------------------------------------------------------------ */

function ckRappelActif(c){
  return Number((c && c.rappelLe) || 0) > Date.now() && !Number((c && c.nonLus) || 0);
}

/* Un rappel échu ramène le fil dans « À traiter » jusqu'à ce qu'on
   le rouvre (le serveur l'efface à la lecture). */
function ckRevenu(c){
  const r = Number((c && c.rappelLe) || 0);
  return r > 0 && r <= Date.now();
}

/* « demain 9 h », ou la date si ce n'est pas demain. */
function ckQuandRevient(ms){
  const d = new Date(Number(ms) || 0);
  if(isNaN(d)) return '';
  const demain = new Date(); demain.setDate(demain.getDate() + 1);
  const h = String(d.getHours()) + 'h' + (d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : '');
  if(d.toDateString() === demain.toDateString()) return 'demain ' + h;
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + h;
}

function ckRangees(liste){
  const r = { epinglees: [], traiter: [], suivies: [], rappels: [] };
  liste.forEach(c => {
    if(ckRappelActif(c)) r.rappels.push(c);
    else if(Number(c.epingle || 0)) r.epinglees.push(c);
    else if(Number(c.nonLus || 0) || ckRevenu(c)) r.traiter.push(c);
    else r.suivies.push(c);
  });
  return r;
}

/* Les non-lus d'une famille — le chiffre du rail et des pastilles.
   Ni ce qu'on supervise, ni ce qui dort jusqu'à demain. */
function ckCompteGenre(g){
  return (conversationsEC || []).filter(c => !c.enSupervision && !Number(c.fermee || 0) &&
      !ckRappelActif(c) && (!g || c.genre === g))
    .reduce((n, c) => n + Number(c.nonLus || 0), 0);
}

/* Le geste, partagé par la ligne (au survol), l'en-tête du fil et le
   téléphone. Le serveur répond, PUIS on redessine : une épingle qui
   s'affiche avant d'être enregistrée et disparaît au rechargement,
   c'est pire que pas d'épingle. */
async function ckMarquer(id, quoi){
  const c = (conversationsEC || []).find(x => x.id === id) || null;
  const f = (filOuvertEC && filOuvertEC.conv && filOuvertEC.conv.id === id) ? filOuvertEC.conv : null;
  const source = c || f || {};
  const corps = { action: 'convMarquer', id: id };
  if(quoi === 'epingle') corps.epingle = Number(source.epingle || 0) ? '0' : '1';
  else corps.rappel = ckRappelActif(Object.assign({}, source, { nonLus: 0 })) ? '0' : 'demain';
  let r;
  try{ r = await appelPrep(corps); }
  catch(e){ if(typeof showToast === 'function') showToast('Impossible : ' + (e.message || e)); return; }
  [c, f].forEach(x => {
    if(!x) return;
    if(r.epingle !== undefined) x.epingle = r.epingle;
    if(r.rappelLe !== undefined) x.rappelLe = r.rappelLe;
  });
  /* ⚠️ « ME LA RAPPELER DEMAIN », C'EST L'AVOIR VUE. Sans cette
     lecture, un fil non lu qu'on repousse resterait dans « À traiter »
     — le geste n'aurait rien fait. Et c'est aussi ce qui le fait
     revenir tout seul : un NOUVEAU message de l'élève le rallume
     avant demain, comme sur le schéma. */
  if(quoi === 'rappel' && Number(r.rappelLe || 0) > 0 && c && Number(c.nonLus || 0)){
    try{
      await appelPrep({ action: 'convLu', id: id });
      c.nonLus = 0;
      poserLesComptesMessagerie(compterLesNonLusEC());
    }catch(e){ /* la pastille se corrigera au prochain passage */ }
  }
  if(typeof showToast === 'function'){
    if(quoi === 'epingle') showToast(r.epingle ? '📌 Épinglée en haut de ta liste' : 'Désépinglée');
    else showToast(r.rappelLe ? '⏰ Elle sort de ta liste et revient ' + ckQuandRevient(r.rappelLe)
                              : 'Rappel retiré');
  }
  dessinerLaListeMessagerie();
  if(filOuvertEC && filOuvertEC.conv && filOuvertEC.conv.id === id) dessinerLeFil();
}

/* Ce qui, dans la liste, se VOIT : qui, combien de non-lus, le
   dernier message, les marques. Deux listes de même empreinte se
   dessinent pareil — inutile de repeindre. */
function ckEmpreinteListe(liste){
  return (liste || []).map(c => [c.id, c.nonLus, c.dernierLe, c.dernierApercu,
    c.epingle, c.rappelLe, c.fermee].join('~')).join('|');
}

/* ------------------------------------------------------------
   LE RAIL ET LES PASTILLES
   ------------------------------------------------------------ */

function ckChoisirFiltre(cle){
  const avant = quellesFermeesPour(filtreMessagerie);
  filtreMessagerie = (filtreMessagerie === cle && cle) ? '' : cle;
  /* ⚠️ ON RELIT QUAND LA DEMANDE AU SERVEUR CHANGE — la règle de la
     v1112, reprise telle quelle : quitter 🗄️ Fermées doit relire,
     sinon « Tout » montrerait trois conversations closes. */
  if(quellesFermeesPour(filtreMessagerie) !== avant) afficherMessagerie(true);
  else dessinerLaListeMessagerie();
}

function ckFamillesVisibles(){
  return RAIL_CK.filter(x => (x[0] !== 'moniteur' ||
    (conversationsEC || []).some(c => c.genre === 'moniteur' && !c.enSupervision)) &&
    /* 👋 la vitrine : pour ceux qui tiennent la boîte du bureau */
    (x[0] !== 'vitrine' || ckPeutGerer() ||
     (conversationsEC || []).some(c => c.genre === 'vitrine' && !c.enSupervision)));
}

function ckPeutSuperviser(){
  return typeof aDroit !== 'function' || aDroit('messagerie_admin');
}

/* Le mot sous chaque icône du rail : court, pour tenir dans la
   colonne. Le nom complet reste dans l'infobulle. */
const MOTS_DU_RAIL = {
  '': 'Tout', bureau: 'Bureau', vitrine: 'Vitrine', retard: 'Retards', annul: 'Annulations',
  oubli: 'Oublis', groupe: 'Groupes', interne: 'Équipe', moniteur: 'Moniteurs',
  clos: 'Fermées', supervision: 'Supervision'
};

function ckDessinerLeRail(){
  const r = $('ckpRail');
  if(!r) return;
  r.innerHTML = '';
  /* 🏷️ v1157 — David : « enlève le logo en haut, il ne sert à rien,
     et mets un mot en dessous de chaque logo pour savoir ce que
     c'est ». Le « EC » est parti ; chaque icône porte son mot. */

  const icone = (cle, sym, nom) => {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'ckpIc' + (filtreMessagerie === cle ? ' on' : '');
    x.title = nom;
    x.setAttribute('aria-label', nom);
    x.dataset.filtre = cle;
    const ic = document.createElement('span');
    ic.className = 'ckpIcSym';
    ic.textContent = sym;
    x.appendChild(ic);
    const mot = document.createElement('span');
    mot.className = 'ckpIcMot';
    mot.textContent = MOTS_DU_RAIL[cle] || nom;
    x.appendChild(mot);
    const n = (cle === 'clos' || cle === 'supervision') ? 0 : ckCompteGenre(cle);
    if(n){
      const b = document.createElement('b');
      b.textContent = n > 99 ? '99+' : String(n);
      x.appendChild(b);
    }
    x.addEventListener('click', () => ckChoisirFiltre(cle));
    return x;
  };
  /* 🖼️ v1163 — « Moi » en tête : sa propre photo, pour la changer */
  if(typeof rondPhoto === 'function'){
    const moi = document.createElement('button');
    moi.type = 'button';
    moi.className = 'ckpIc ckpMoi';
    moi.title = 'Ma photo';
    moi.setAttribute('aria-label', 'Ma photo');
    const nomMoi = (typeof ACCES !== 'undefined' && ACCES.moniteur) || '';
    moi.appendChild(rondPhoto(clePhotoProfil('user', nomMoi), nomMoi, 32, 'ckpMoiRond'));
    const mot = document.createElement('span');
    mot.className = 'ckpIcMot';
    mot.textContent = 'Moi';
    moi.appendChild(mot);
    moi.addEventListener('click', () => ouvrirFenetrePhotoProfil({ cible: 'moi' }));
    r.appendChild(moi);
  }
  ckFamillesVisibles().forEach(x => r.appendChild(icone(x[0], x[1], x[2])));

  const bas = document.createElement('div');
  bas.className = 'ckpRailBas';
  bas.appendChild(icone('clos', '🗄️', 'Fermées'));
  if(ckPeutSuperviser()) bas.appendChild(icone('supervision', '🔒', 'Supervision'));
  r.appendChild(bas);
}

/* Sur l'étroit, le rail devient une rangée de pastilles qui PASSE À
   LA LIGNE — jamais de défilement horizontal (règle du 12/09). */
function ckPastilles(){
  const b = document.createElement('div');
  b.className = 'ckpChips';
  const chip = (cle, texte) => {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = (filtreMessagerie === cle ? 'on' : '');
    x.dataset.filtre = cle;
    const n = (cle === 'clos' || cle === 'supervision') ? 0 : ckCompteGenre(cle);
    x.textContent = texte + (n ? ' ' + n : '');
    x.addEventListener('click', () => ckChoisirFiltre(cle));
    b.appendChild(x);
  };
  /* 🖼️ v1163 — « Moi » en tête de la rangée, sur le téléphone aussi */
  if(typeof rondPhoto === 'function'){
    const moi = document.createElement('button');
    moi.type = 'button';
    moi.className = 'ckpChipMoi';
    moi.title = 'Ma photo';
    const nomMoi = (typeof ACCES !== 'undefined' && ACCES.moniteur) || '';
    moi.appendChild(rondPhoto(clePhotoProfil('user', nomMoi), nomMoi, 26));
    moi.appendChild(document.createTextNode('Moi'));
    moi.addEventListener('click', () => ouvrirFenetrePhotoProfil({ cible: 'moi' }));
    b.appendChild(moi);
  }
  ckFamillesVisibles().forEach(x => chip(x[0], x[0] ? x[1] : x[1] + ' Tout'));
  chip('clos', '🗄️');
  /* ⚠️ LE TIROIR NE MONTRE JAMAIS LA SUPERVISION — v1082. */
  if(ckPeutSuperviser() && !dansLeTiroir()) chip('supervision', '🔒');
  return b;
}

/* ------------------------------------------------------------
   UNE LIGNE DE LA LISTE
   ------------------------------------------------------------ */

/* Le titre de la ligne : l'ÉLÈVE quand c'est un fil d'élève — le mot
   du genre dit déjà si c'est un retard ou un objet. */
function ckTitreListe(c){
  if(!c) return '';
  if(c.eleve && (c.genre === 'bureau' || c.genre === 'retard' ||
                 c.genre === 'annul' || c.genre === 'oubli')) return c.eleve;
  return titreDuFil(c);
}

function ckInitiales(c){
  const g = GENRES_CK[c && c.genre] || {};
  if(c && c.genre === 'groupe') return '👥';
  if(c && c.genre === 'vitrine') return '👋';
  const nom = (c && c.eleve) || ckTitreListe(c) || '';
  const mots = String(nom).replace(/[^\p{L}\s'-]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if(!mots.length) return g.rond || '💬';
  return (mots[0].charAt(0) + (mots.length > 1 ? mots[mots.length - 1].charAt(0) : ''))
    .toUpperCase();
}

/* Le temps écoulé sur les 48 heures promises à l'élève. */
function ckPartDes48h(c){
  const m = String((c && c.dernierLe) || '').match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if(!m) return 0;
  const t = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime();
  const p = (Date.now() - t) / (48 * 3600 * 1000) * 100;
  return Math.max(3, Math.min(100, p));
}

/* ------------------------------------------------------------
   L'EN-TÊTE DU FIL
   ------------------------------------------------------------ */

function ckPeutGerer(){
  return typeof aDroit !== 'function' || aDroit('messagerie_bureau') || aDroit('messagerie_admin');
}

function ckSousTitre(f){
  const c = (f && f.conv) || {};
  if(f && f.enSupervision) return '🔒 en supervision';
  /* 💾 v1150 — la carte SD dit qui est dans le groupe */
  if(c.genre === 'oubli' && f.objet && f.objet.sorte === 'sd'){
    return '💾 Carte SD · avec ' + (f.objet.moniteur ? f.objet.moniteur + ' et ' : '') + 'le bureau';
  }
  /* 👋 v1171 — d'où vient le visiteur */
  if(c.genre === 'vitrine'){
    const v = c.vitrine || {};
    if(v.etat === 'bloquee') return '👋 Vitrine' + (v.nomBureau ? ' de ' + v.nomBureau : '') + ' · 🚫 bloqué';
    return '👋 Vitrine' + (v.nomBureau ? ' de ' + v.nomBureau : '') + ' · au nom du bureau';
  }
  const g = GENRES_CK[c.genre] || { rond: '💬', nom: 'Conversation' };
  let plus = '';
  if(c.genre === 'bureau') plus = 'au nom du bureau';
  else if(c.genre === 'interne' || c.genre === 'groupe' || c.genre === 'moniteur'){
    plus = sousTitreDuFil(f);
    if(c.genre === 'interne') plus = plus.replace(/^Entre nous( · )?/, '');
  }
  return g.rond + ' ' + g.nom + (plus ? ' · ' + plus : '');
}

function ckBouton(texte, titre, faire, classe){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ckBt' + (classe ? ' ' + classe : '');
  b.textContent = texte;
  if(titre){ b.title = titre; b.setAttribute('aria-label', titre); }
  b.addEventListener('click', async ev => {
    ev.stopPropagation();
    if(b.disabled) return;
    b.disabled = true;
    try{ await faire(b); }
    catch(e){ if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e)); }
    b.disabled = false;
  });
  return b;
}

function ckEnteteDuFil(f, large){
  const c = f.conv || {};
  const tete = document.createElement('div');
  tete.className = 'ckFh' + (large ? '' : ' etroit');

  if(!large){
    const r = ckBouton('←', 'Revenir à la liste', () => fermerLeFil(), 'rond');
    tete.appendChild(r);
  }

  /* 🖼️ v1163 — la photo devant le nom, en haut du fil */
  if(typeof rondPhoto === 'function'){
    const cleP = clePhotoDuFil(c, f.membres || []);
    const sansNom = c.genre === 'groupe' || c.genre === 'vitrine';
    const av = rondPhoto(cleP, sansNom ? '' : ckTitreListe(Object.assign({}, c, { membres: f.membres || [] })), 38, 'ckFhAv');
    if(!av.querySelector('img') && !av.textContent) av.textContent = c.genre === 'groupe' ? '👥' : c.genre === 'vitrine' ? '👋' : '💬';
    tete.appendChild(av);
  }

  const tt = document.createElement('div');
  tt.className = 'tt';
  const t = document.createElement('div');
  t.className = 't';
  t.textContent = (Number(c.epingle || 0) ? '📌 ' : '') +
    ckTitreListe(Object.assign({}, c, { membres: f.membres || [] }));
  const s = document.createElement('div');
  s.className = 's';
  if((c.eleve || c.genre === 'vitrine') && !f.enSupervision && !Number(c.fermee || 0)){
    const d = document.createElement('span');
    d.className = 'ckDot ckPulse';
    s.appendChild(d);
  }
  s.appendChild(document.createTextNode(ckSousTitre(f)));
  tt.appendChild(t);
  tt.appendChild(s);
  tete.appendChild(tt);

  const b = document.createElement('div');
  b.className = 'b';
  const clos = Number(c.fermee || 0);
  const rond = large ? '' : 'rond';

  if(f.estMembre){
    b.appendChild(ckBouton('📌', Number(c.epingle || 0) ? 'Désépingler' : 'Épingler en haut de ma liste',
      () => ckMarquer(c.id, 'epingle'), rond + (Number(c.epingle || 0) ? ' on' : '')));
    const rap = ckRappelActif(Object.assign({}, c, { nonLus: 0 }));
    b.appendChild(ckBouton(large ? (rap ? '⏰ Demain 9h' : '⏰ Demain') : '⏰',
      rap ? 'Retirer le rappel' : 'Me la rappeler demain 9h',
      () => ckMarquer(c.id, 'rappel'), rond + (rap ? ' on' : '')));
  }
  if(large && c.eleve && f.peutEcrire && c.genre !== 'groupe'){
    b.appendChild(ckBouton('📅 Décaler', 'Proposer un autre créneau à l’élève', () => {
      ckCreneauOuvert = !ckCreneauOuvert;
      dessinerLeFil();
    }, ckCreneauOuvert ? 'on' : ''));
  }
  if(!clos && !f.enSupervision && f.estMembre && ckPeutGerer()){
    b.appendChild(ckBouton(large ? '✓ Réglé' : '✓', 'Réglé : la conversation se ferme et part dans 🗄️ Fermées',
      () => ckRegler(f), rond));
  }
  if(!large || !ckAvecFiche()){
    b.appendChild(ckBouton('ⓘ', 'La fiche de l’élève', () => {
      ckFicheOuverte = !ckFicheOuverte;
      dessinerLeFil();
    }, rond + (ckFicheOuverte ? ' on' : '')));
  }

  /* Le ⋯ : les actions de barreDesActionsDuFil, rangées dans le menu
     — une seule liste décide de ce qui existe (v1079). */
  const boite = document.createElement('div');
  boite.className = 'msgMenuBoite';
  const pts = document.createElement('button');
  pts.type = 'button';
  pts.className = 'ckBt ' + rond + ' msgPts';
  pts.textContent = '⋯';
  pts.title = 'Participants, exporter, supprimer';
  pts.addEventListener('click', ev => { ev.stopPropagation(); basculerLeMenuDuFil(boite, f); });
  boite.appendChild(pts);
  b.appendChild(boite);

  tete.appendChild(b);
  return tete;
}

async function ckRegler(f){
  const id = f.conv.id;
  await appelPrep({ action: 'convFermer', id: id, fermee: '1' });
  if(typeof showToast === 'function') showToast('✓ Réglé — rangée dans 🗄️ Fermées');
  await ouvrirLeFil(id);
  afficherMessagerie(true);
}

/* ------------------------------------------------------------
   ⏰ LE BANDEAU D'UN RETARD
   ------------------------------------------------------------ */

function ckHeure(envoyeLe){
  return String(envoyeLe || '').slice(11, 16);
}

function ckPrenom(nom){
  return String(nom || '').trim().split(/\s+/)[0] || '';
}

/* Qui a reçu l'alerte, et quand : la dernière personne PRÉVENUE à la
   main ; sinon le moniteur du cours trouvé, prévenu à l'ouverture du
   fil (depuis la v1071). */
function ckAlerteDuFil(f){
  const msgs = (f && f.messages) || [];
  for(let i = msgs.length - 1; i >= 0; i--){
    const m = msgs[i];
    if(m.motif === 'prevenir' && m.donnees && m.donnees.qui){
      return { qui: String(m.donnees.qui), a: ckHeure(m.envoyeLe), rang: Number(m.rang || 0) };
    }
  }
  const c = (f && f.conv) || {};
  const cours = c.cours || null;
  if(cours && cours.moniteur){
    const dedans = ((f && f.membres) || []).some(x => x.genre === 'user' &&
      normaliserMessagerie(x.qui) === normaliserMessagerie(cours.moniteur));
    if(dedans){
      const premier = msgs.length ? Number(msgs[0].rang || 0) : 0;
      return { qui: String(cours.moniteur), a: ckHeure(c.creeLe), rang: premier };
    }
  }
  return null;
}

/* « vue par Maryne · 08:02 » : sa PREMIÈRE lecture, si elle a lu
   jusqu'à l'alerte. */
function ckVuePar(f, alerte){
  if(!alerte) return '';
  const l = ((f && f.lectures) || []).find(x =>
    normaliserMessagerie(x.qui) === normaliserMessagerie(alerte.qui));
  if(!l || Number(l.luJusqua || 0) < alerte.rang) return '';
  return ckHeure(l.luLe) || 'oui';
}

/* Minutes avant le cours, s'il est aujourd'hui. */
function ckResteAvantCours(cours){
  if(!cours || !cours.heure) return null;
  const d = String(cours.date || '');
  let a, mo, j;
  let m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m){ a = +m[1]; mo = +m[2]; j = +m[3]; }
  else{
    m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if(!m) return null;
    j = +m[1]; mo = +m[2]; a = +m[3];
  }
  const h = String(cours.heure).match(/^(\d{1,2}):(\d{2})/);
  if(!h) return null;
  const quand = new Date(a, mo - 1, j, +h[1], +h[2]);
  const auj = new Date();
  if(quand.toDateString() !== auj.toDateString()) return null;
  return Math.round((quand.getTime() - auj.getTime()) / 60000);
}

function ckAnneau(reste){
  const p = Math.max(0, Math.min(1, reste / 60));
  const coul = reste > 15 ? 'var(--ko)' : 'var(--kr)';
  const texte = reste > 0 ? reste + '′' : 'go';
  const d = document.createElement('div');
  d.className = 'ckAnneau';
  d.title = reste > 0 ? 'Le cours commence dans ' + reste + ' min' : 'Le cours a commencé';
  d.innerHTML = '<svg width="42" height="42" viewBox="0 0 36 36">' +
    '<circle cx="18" cy="18" r="15" fill="none" stroke="var(--kl)" stroke-width="3"/>' +
    '<circle cx="18" cy="18" r="15" fill="none" stroke="' + coul + '" stroke-width="3" ' +
    'stroke-dasharray="94.2" stroke-dashoffset="' + (94.2 * (1 - p)).toFixed(1) + '" ' +
    'transform="rotate(-90 18 18)" stroke-linecap="round"/>' +
    '<text x="18" y="21.5" text-anchor="middle" font-size="9" fill="' + coul +
    '" font-weight="800">' + texte + '</text></svg>';
  return d;
}

/* Le numéro de l'élève, tel que sa fiche le connaît. */
function ckTelephoneDe(nom){
  try{
    const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
    const t = f && f.telephone;
    if(!t) return '';
    return (typeof telPourLien === 'function') ? telPourLien(t) : String(t).replace(/[^\d+]/g, '');
  }catch(e){ return ''; }
}

function ckLienAppel(nom, classe){
  const tel = ckTelephoneDe(nom);
  const a = document.createElement(tel ? 'a' : 'button');
  a.className = 'ckBt ' + (classe || '');
  a.textContent = '📞 Appeler ' + ckPrenom(nom);
  if(tel){ a.href = 'tel:' + tel; }
  else{
    a.type = 'button';
    a.title = 'Pas de numéro dans sa fiche';
    a.addEventListener('click', () => {
      if(typeof showToast === 'function') showToast('Pas de numéro dans la fiche de ' + nom + '.');
    });
  }
  return a;
}

async function ckEcrire(f, texte){
  await appelPrep({ action: 'convEcrire', id: f.conv.id, texte: texte });
  await rafraichirLeFil();
}

function ckPanneauRetard(f, petit){
  const c = f.conv || {};
  const p = document.createElement('div');
  p.className = 'ckPanneau';
  const acts = document.createElement('div');
  acts.className = 'acts';
  const gerer = ckPeutGerer() && f.estMembre && !Number(c.fermee || 0);
  const alerte = ckAlerteDuFil(f);

  if(!alerte){
    p.classList.add('chaud');
    const l1 = document.createElement('div');
    l1.className = 'l1';
    l1.innerHTML = '⏰ <b>Cours non trouvé</b> <span class="doux">— aucun moniteur n’a été prévenu</span>';
    p.appendChild(l1);
    if(gerer){
      acts.appendChild(ckBouton('🔔 Prévenir un moniteur', 'Le faire entrer dans la conversation et sonner son téléphone',
        () => { ckChoixMoniteur = !ckChoixMoniteur; dessinerLeFil(); }, 'p'));
    }
    if(c.eleve) acts.appendChild(ckLienAppel(c.eleve));
    p.appendChild(acts);
    if(gerer && ckChoixMoniteur){
      const ch = document.createElement('div');
      ch.className = 'ckChoixMon';
      (typeof lesComptesDeLEquipe === 'function' ? lesComptesDeLEquipe() : []).forEach(n => {
        ch.appendChild(ckBouton(n, 'Prévenir ' + n, async () => {
          await appelPrep({ action: 'convAlerter', id: c.id, qui: n });
          ckChoixMoniteur = false;
          if(typeof showToast === 'function') showToast('🔔 ' + n + ' est prévenu');
          await rafraichirLeFil();
          dessinerLeFil();
        }));
      });
      p.appendChild(ch);
    }
    return p;
  }

  const vu = ckVuePar(f, alerte);
  const reste = ckResteAvantCours(c.cours);
  if(reste !== null && reste > 0 && !vu) p.classList.add('chaud');

  const l1 = document.createElement('div');
  l1.className = 'l1';
  const cours = c.cours;
  const bouts = cours
    ? ['Cours ' + (cours.heure || ''), cours.moniteur || alerte.qui, cours.site || ''].filter(Boolean)
    : ['Cours avec ' + alerte.qui];
  l1.innerHTML = '⏰ <b></b>';
  l1.querySelector('b').textContent = bouts.join(' · ');
  if(reste !== null){
    if(petit){
      const r = document.createElement('span');
      r.className = 'ckReste';
      r.textContent = reste > 0 ? 'dans ' + reste + ' min' : 'commencé';
      l1.appendChild(r);
    }else l1.appendChild(ckAnneau(reste));
  }
  p.appendChild(l1);

  const pills = document.createElement('div');
  pills.className = 'pills';
  const pill = (texte, cls) => {
    const s = document.createElement('span');
    s.className = 'ckPill ' + (cls || '');
    s.textContent = texte;
    pills.appendChild(s);
  };
  pill('🔔 alerte à ' + alerte.qui + (alerte.a ? ' · ' + alerte.a : ''), 'ok');
  if(vu) pill('👁 vue par ' + alerte.qui + (vu !== 'oui' ? ' · ' + vu : ''), 'ok');
  else pill('pas encore vue', 'or');
  p.appendChild(pills);

  if(f.peutEcrire){
    acts.appendChild(ckBouton('↩ Répondre : ' + alerte.qui + ' est au courant',
      'Écrire à l’élève que son moniteur est prévenu',
      () => ckEcrire(f, 'C’est noté ' + ckPrenom(c.eleve) + ', ' + alerte.qui + ' est au courant 👍'), 'p'));
  }
  if(gerer && !vu){
    acts.appendChild(ckBouton('🔔 Relancer ' + alerte.qui, 'Une nouvelle alerte sur son téléphone',
      async () => {
        await appelPrep({ action: 'convAlerter', id: c.id });
        if(typeof showToast === 'function') showToast('🔔 Nouvelle alerte envoyée à ' + alerte.qui);
        await rafraichirLeFil();
      }));
  }
  if(f.peutEcrire){
    acts.appendChild(ckBouton('⏱ Cours raccourci', 'Prévenir l’élève que le cours finira à l’heure',
      () => ckEcrire(f, 'Le cours se terminera à l’heure prévue : il sera raccourci de ton retard.')));
  }
  if(!petit && c.eleve) acts.appendChild(ckLienAppel(c.eleve));
  if(acts.children.length) p.appendChild(acts);
  return p;
}

/* ------------------------------------------------------------
   🧤 LE BANDEAU D'UN OBJET OUBLIÉ
   ------------------------------------------------------------ */

function ckJourCourt(v){
  const t = String(v || '').trim();
  if(!t) return '';
  if(typeof jourBref === 'function'){
    const j = jourBref(t, true);
    if(j) return j;
  }
  return t;
}

function ckPanneauObjet(f, petit){
  const o = f.objet || ((typeof objetDuFil === 'function') ? objetDuFil(f) : null);
  if(!o) return null;
  const etat = String(o.etat || 'signale');
  /* 💾 v1150 — la carte SD a ses mots et ses suites */
  const sd = (typeof estCarteSD === 'function') && estCarteSD(o);
  const etats = (typeof etatsDeLObjet === 'function') ? etatsDeLObjet(o) : ETATS_OBJET_EC;
  const e = etats[etat] || etats.signale;
  const p = document.createElement('div');
  p.className = 'ckPanneau';

  const l1 = document.createElement('div');
  l1.className = 'l1';
  l1.innerHTML = (sd ? '💾' : '🧤') + ' <b></b><span class="doux"></span>';
  l1.querySelector('b').textContent = o.quoi || 'Un objet';
  l1.querySelector('.doux').textContent = [o.vehicule, o.jour ? 'cours du ' + ckJourCourt(o.jour) : '',
                                          o.moniteur ? 'avec ' + o.moniteur : '']
    .filter(Boolean).map(x => '· ' + x).join(' ');
  p.appendChild(l1);

  const pills = document.createElement('div');
  pills.className = 'pills';
  const a = document.createElement('span');
  a.className = 'ckPill ' + (etat === 'retrouve' ? 'ok' : etat === 'signale' ? 'or' :
                              etat === 'introuvable' ? 'ko' : '');
  a.textContent = e.emoji + ' ' + e.nom;
  pills.appendChild(a);
  const b = document.createElement('span');
  b.className = 'ckPill';
  b.textContent = (o.majPar && etat !== 'signale')
    ? e.nom.toLowerCase() + ' par ' + o.majPar + (o.majLe ? ' le ' + o.majLe : '') : e.sous;
  pills.appendChild(b);
  p.appendChild(pills);

  /* 💾 v1150 — le moniteur du groupe aussi, arbitrage de David : c'est
     lui qui regarde dans la voiture. Le serveur vérifie la même chose. */
  const moi = normaliserMessagerie((typeof ACCES !== 'undefined' && ACCES.moniteur) || '');
  const personneDuFil = (f.membres || []).some(m => m.genre === 'user' &&
    normaliserMessagerie(m.qui) === moi);
  if(f.estMembre && (ckPeutGerer() || personneDuFil)){
    const acts = document.createElement('div');
    acts.className = 'acts';
    const suites = (typeof suitesDeLObjet === 'function') ? suitesDeLObjet(o) : SUITES_OBJET;
    (suites[etat] || []).forEach(suite => {
      const fort = suite === 'retrouve' || (suite === 'rendu' && etat === 'retrouve');
      const libelle = (typeof boutonDeLEtat === 'function') ? boutonDeLEtat(o, suite)
        : (ETATS_OBJET_EC[suite].emoji + ' ' + ETATS_OBJET_EC[suite].nom);
      acts.appendChild(ckBouton(libelle, 'L’élève reçoit la réponse ici même', async () => {
        await appelPrep({ action: 'objetEtat', conversation: f.conv.id, etat: suite });
        if(typeof compterLesObjets === 'function') await compterLesObjets();
        await ouvrirLeFil(f.conv.id);
        if(suite === 'rendu') afficherMessagerie(true);
      }, fort ? 'p' : ''));
    });
    p.appendChild(acts);
    if(!petit){
      const n = document.createElement('div');
      n.className = 'ckNote';
      n.textContent = 'Chaque bouton écrit la réponse à ' + ckPrenom(f.conv.eleve || o.eleve) +
        ' dans ce fil' + (o.moniteur ? ' — ' + o.moniteur + ' la lit aussi' : '') +
        ' · le même suivi que l’écran 🧤 Objets';
      p.appendChild(n);
    }
  }
  return p;
}

function ckPanneauDuFil(f, petit){
  const c = (f && f.conv) || {};
  if(c.genre === 'retard' && !Number(c.fermee || 0)) return ckPanneauRetard(f, petit);
  if(c.genre === 'oubli') return ckPanneauObjet(f, petit);
  return null;
}

/* ------------------------------------------------------------
   📅 LE CRÉNEAU
   ------------------------------------------------------------ */

/* La réponse de l'élève à une carte : elle ne change pas la carte,
   elle la désigne (voir repondreAuCreneau côté Worker). */
function ckReponseAuCreneau(m){
  const msgs = (filOuvertEC && filOuvertEC.messages) || [];
  const r = msgs.find(x => (x.motif === 'creneauOui' || x.motif === 'creneauNon') &&
                           x.donnees && x.donnees.message === m.id);
  return r ? (r.motif === 'creneauOui' ? 'accepte' : 'autre') : 'propose';
}

function ckCarteCreneau(m){
  const d = m.donnees || {};
  const etat = ckReponseAuCreneau(m);
  const ligne = document.createElement('div');
  ligne.className = 'msgRang moi fin';
  ligne.setAttribute('data-rang', String(m.rang || 0));
  const c = document.createElement('div');
  c.className = 'ckCarteC';
  c.setAttribute('data-msg', m.id || '');
  const lab = document.createElement('div');
  lab.className = 'lab';
  lab.textContent = 'CRÉNEAU PROPOSÉ';
  const v = document.createElement('div');
  v.className = 'v';
  v.textContent = d.libelle || String(m.texte || '').replace(/^📅 Créneau proposé : /, '');
  const e = document.createElement('div');
  e.className = 'e';
  e.textContent = [d.avec, d.lieu].filter(Boolean).join(' · ') +
    ((d.avec || d.lieu) ? ' · ' : '') +
    (etat === 'propose' ? '⏳ en attente de la réponse' : etat === 'accepte' ? '✅ accepté' : '↺ refusé');
  c.appendChild(lab); c.appendChild(v); c.appendChild(e);
  ligne.appendChild(c);
  return ligne;
}

/* Le lendemain ouvré : demain, ou lundi si demain est dimanche. */
function ckDemainIso(){
  const d = new Date();
  d.setDate(d.getDate() + 1);
  if(d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

function ckFormCreneau(f){
  const c = f.conv || {};
  if(!ckCreneauBrouillon || ckCreneauBrouillon.conv !== c.id){
    let avec = (typeof ACCES !== 'undefined' && ACCES.moniteur) || '';
    let lieu = 'Saint-Brieuc';
    try{
      const prep = (typeof preparationDe === 'function') ? preparationDe(c.eleve) : null;
      if(prep && prep.moniteur) avec = prep.moniteur;
      if(prep && prep.site) lieu = prep.site;
    }catch(e){}
    ckCreneauBrouillon = { conv: c.id, jour: ckDemainIso(), heure: '09:00', avec: avec, lieu: lieu };
  }
  const br = ckCreneauBrouillon;
  const z = document.createElement('div');
  z.className = 'ckCren';
  z.innerHTML =
    '<div class="lab">📅 PROPOSER UN CRÉNEAU À ' + echapper(ckPrenom(c.eleve).toUpperCase()) + '</div>' +
    '<div class="ligne">' +
      '<label>Jour<input type="date" class="ckCrJour"></label>' +
      '<label>Heure<input type="time" step="900" class="ckCrHeure"></label>' +
      '<label>Avec<select class="ckCrAvec"></select></label>' +
      '<label>Où<input type="text" class="ckCrLieu"></label>' +
    '</div>' +
    '<div class="ckNote">L’élève reçoit une carte « ✓ Ça me va / Autre ». Son accord s’écrit ici : ' +
      'c’est toi qui reportes le cours dans le planning.</div>';
  const j = z.querySelector('.ckCrJour'); j.value = br.jour;
  const h = z.querySelector('.ckCrHeure'); h.value = br.heure;
  const a = z.querySelector('.ckCrAvec');
  const noms = (typeof lesComptesDeLEquipe === 'function') ? lesComptesDeLEquipe() : [];
  if(br.avec && noms.indexOf(br.avec) === -1) noms.unshift(br.avec);
  noms.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; a.appendChild(o); });
  a.value = br.avec;
  const l = z.querySelector('.ckCrLieu'); l.value = br.lieu;
  [[j, 'jour'], [h, 'heure'], [a, 'avec'], [l, 'lieu']].forEach(([el, cle]) => {
    ['input', 'change'].forEach(ev => el.addEventListener(ev, () => { br[cle] = el.value; }));
  });
  const acts = document.createElement('div');
  acts.className = 'acts';
  acts.appendChild(ckBouton('📨 Proposer à ' + ckPrenom(c.eleve), 'Envoyer la carte', async () => {
    await appelPrep({ action: 'convCreneau', id: c.id, jour: br.jour, heure: br.heure,
                      avec: br.avec, lieu: br.lieu });
    ckCreneauOuvert = false;
    ckCreneauBrouillon = null;
    if(typeof showToast === 'function') showToast('📅 Créneau proposé à ' + ckPrenom(c.eleve));
    await rafraichirLeFil();
    dessinerLeFil();
  }, 'p'));
  acts.appendChild(ckBouton('Annuler', '', () => { ckCreneauOuvert = false; dessinerLeFil(); }));
  z.appendChild(acts);
  return z;
}

/* ------------------------------------------------------------
   LES RÉPONSES RAPIDES
   ------------------------------------------------------------ */

function ckReponsesRapides(f, petit){
  const c = f.conv || {};
  const v = document.createElement('div');
  v.className = 'ckVites';
  if(!reponsesRapidesLues) chargerReponsesRapides().then(change => { if(change && filOuvertEC) dessinerLeFil(); });
  /* 📱 v1174 — David : « tous, ils passent à la ligne ». Plus de
     coupe à trois sur le téléphone. */
  const liste = reponsesRapidesDuFil(c);
  liste.forEach(x => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ckVite';
    b.textContent = x.bouton;
    b.addEventListener('click', async () => {
      if(x.sorte === 'creneau'){ ckCreneauOuvert = true; dessinerLeFil(); return; }
      b.disabled = true;
      try{ await ckEcrire(f, remplirLesMotsRapides(x.message, c)); }
      catch(e){ if(typeof showToast === 'function') showToast('Le message n’est pas parti : ' + (e.message || e)); }
      b.disabled = false;
    });
    v.appendChild(b);
  });
  /* 📄 Le carnet « Modèles messages », en cascade : catégorie, puis
     fiche ; son texte va dans la zone d'écriture, pas plus loin. */
  const bm = document.createElement('button');
  bm.type = 'button';
  bm.className = 'ckVite ckViteModeles' + (ckModelesOuvert ? ' on' : '');
  bm.textContent = '📄 Modèles messages';
  bm.title = 'Reprendre le texte d’une fiche de Modèles messages';
  bm.addEventListener('click', () => { ckModelesOuvert = !ckModelesOuvert; ckModelesCategorie = ''; dessinerLeFil(); });
  v.appendChild(bm);
  if(ckModelesOuvert){
    const p = panneauDesModeles(texte => {
      ckModelesOuvert = false;
      mettreDansLaZoneDEcriture(c.id, remplirLesMotsRapides(texte, c));
    }, () => { ckModelesOuvert = false; dessinerLeFil(); });
    const cadre = document.createElement('div');
    cadre.className = 'ckModelesCadre';
    cadre.appendChild(p);
    const tout = document.createElement('div');
    tout.appendChild(v);
    tout.appendChild(cadre);
    return tout;
  }
  return v;
}

/* ============================================================
   🔤 LES MOTS QUI SE REMPLACENT — v1174

   David : « oui il faut ajouter » — « Bonjour {prénom} » devient
   « Bonjour Camille » ou « Bonjour Léa ». Les mêmes que ceux des
   Modèles messages ({prenom}, {eleve}), écrits avec ou sans accent.
   Hors d'un fil d'élève ou de vitrine, {prénom} n'a personne à
   nommer : il disparaît, et la phrase reste lisible.
   ============================================================ */
const MOTS_RAPIDES = [
  { mot: '{prénom}',         dit: 'le prénom de l’élève ou du visiteur', exemple: 'Camille' },
  { mot: '{nom}',            dit: 'son prénom et son nom',               exemple: 'Camille Le Bihan' },
  { mot: '{moi}',            dit: 'ton prénom',                          exemple: 'David' },
  { mot: '{bureau}',         dit: 'le bureau de la vitrine (Loudéac, Saint-Brieuc)', exemple: 'Loudéac' },
  /* David : « tu peux ajouter moniteur, prochain cours, frise,
     résultat examen blanc, date d'examen » — lus dans son dossier,
     comme la fiche éclair les montre. */
  { mot: '{moniteur}',       dit: 'son moniteur (celui du prochain cours, sinon du dernier bilan)', exemple: 'Maryne' },
  { mot: '{prochain cours}', dit: 'son prochain cours préparé : le jour et l’heure', exemple: 'jeudi 16 octobre à 14h00' },
  { mot: '{frise}',          dit: 'sa frise de formation', exemple: '20 leçons : 12 avant l’examen blanc, 8 après' },
  { mot: '{examen blanc}',   dit: 'où en est son examen blanc', exemple: 'examen blanc réussi (12/09/2026)' },
  { mot: '{date d’examen}',  dit: 'sa date d’examen du permis', exemple: 'mercredi 28 octobre 2026' }
];

/* La clé d'un mot : sans accent, sans espace ni apostrophe —
   « {Date d'examen} », « {date d’examen} » et « {datedexamen} » sont
   le même mot. */
function cleDuMotRapide(m){
  return String(m || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}
function exemplesDesMotsRapides(){
  const o = {};
  MOTS_RAPIDES.forEach(w => { o[cleDuMotRapide(w.mot)] = w.exemple; });
  return o;
}

function dateDExamenLisible(v){
  const t = String(v || '').trim();
  if(!t) return '';
  const iso = /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10)
            : (typeof dateFrVersIso === 'function' ? dateFrVersIso(t) : '');
  return (iso && typeof dateEnToutesLettres === 'function') ? (dateEnToutesLettres(iso) || t) : t;
}

/* Les valeurs d'un fil. Chaque lecture du dossier est gardée : une
   donnée qui manque laisse le mot vide, jamais l'écran en erreur. */
function valeursDesMotsRapides(c){
  const v = (c && c.vitrine) || {};
  const nomEleve = String((c && c.eleve) || '').trim();
  const nom = nomEleve || String(v.prenom || (c && c.genre === 'vitrine' ? c.titre : '') || '').trim();
  const o = {
    prenom: nom.split(/\s+/)[0] || '',
    nom: nom, eleve: nom,
    moi: String((typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || '').trim().split(/\s+/)[0] || '',
    bureau: v.nomBureau || 'le bureau',
    moniteur: '', prochaincours: '', frise: '', examenblanc: '', datedexamen: ''
  };
  if(!nomEleve) return o;
  const essai = f => { try{ return f() || ''; }catch(e){ return ''; } };
  const e = essai(() => (typeof eleveDuBureau === 'function') ? eleveDuBureau(nomEleve) : null) || null;
  const p = essai(() => (typeof positionDeLEleve === 'function') ? positionDeLEleve(nomEleve, e) : null) || {};
  const prep = p.prep || null;
  o.moniteur = String((prep && prep.moniteur) || (e && e.moniteur) || '').trim();
  /* « vendredi 16 octobre à 14h00 » : en toutes lettres, c'est un
     message à un élève, pas une ligne de tableau. */
  const jourEnLettres = d => (typeof dateEnToutesLettres === 'function' && /^\d{4}-\d{2}-\d{2}/.test(String(d)))
    ? String(dateEnToutesLettres(String(d).slice(0, 10)) || d).replace(/\s\d{4}$/, '')
    : (typeof jourBref === 'function' ? jourBref(d, true) : d);
  o.prochaincours = prep ? essai(() => [jourEnLettres(prep.date),
                                        prep.heure ? 'à ' + String(prep.heure).replace(':', 'h') : '']
                                       .filter(Boolean).join(' ')) : '';
  const fi = essai(() => (typeof ficheDe === 'function') ? ficheDe(nomEleve) : null) || {};
  o.frise = essai(() => (typeof friseUtilisable === 'function') ? friseUtilisable(fi.frise) : fi.frise);
  o.examenblanc = essai(() => (typeof mentionExamenBlanc === 'function')
    ? mentionExamenBlanc({ eleve: nomEleve, etat: (typeof etatDe === 'function') ? etatDe(nomEleve) : {} }).replace(/^ · /, '') : '');
  const s = essai(() => (typeof suiviDe === 'function') ? suiviDe(nomEleve) : null) || {};
  o.datedexamen = dateDExamenLisible(s.datePermis);
  return o;
}
/* Les synonymes : {prenom}, {eleve} (Modèles messages), {date permis} */
const SYNONYMES_MOTS_RAPIDES = { eleve: 'nom', datepermis: 'datedexamen', dateexamen: 'datedexamen',
                                 datedepermis: 'datedexamen', examen: 'datedexamen', prochaincour: 'prochaincours' };

/* Un mot connu se remplace (par du vide s'il n'a pas de valeur) ;
   un mot inconnu reste tel quel, pour qu'on le voie avant d'envoyer. */
function remplirLesMotsRapides(texte, c, valeurs){
  let x = null;
  return String(texte || '').replace(/\{([^{}\n]{1,30})\}/g, (tout, mot) => {
    let k = cleDuMotRapide(mot);
    if(SYNONYMES_MOTS_RAPIDES[k]) k = SYNONYMES_MOTS_RAPIDES[k];
    if(!x) x = valeurs || valeursDesMotsRapides(c);
    return Object.prototype.hasOwnProperty.call(x, k) ? String(x[k] || '') : tout;
  }).replace(/[ \t]+([,.])/g, '$1').replace(/[ \t]{2,}/g, ' ');
}

/* Le texte va dans la zone d'écriture du fil : on le relit avant
   d'envoyer, rien ne part tout seul. */
function mettreDansLaZoneDEcriture(id, texte){
  if(typeof brouillonsMessagerie !== 'undefined') brouillonsMessagerie[id] = texte;
  dessinerLeFil();
  setTimeout(() => {
    const t = document.getElementById('msgElvTexte');
    if(!t) return;
    t.value = texte;
    t.dispatchEvent(new Event('input', { bubbles: true }));
    t.focus();
    try{ t.setSelectionRange(t.value.length, t.value.length); }catch(e){}
  }, 0);
}

/* ============================================================
   📄 LE CARNET « MODÈLES MESSAGES », EN CASCADE — v1174

   David : « un bouton en plus qui ouvre en cascade Modèles messages ›
   Catégorie › Titre de la note, qui permet de reprendre le texte
   directement de la note plutôt que d'aller chercher et de faire un
   copier-coller ». Les catégories et les fiches sont celles qu'on
   voit dans 📄 Modèles messages — privées et carnets fermés compris
   dans la même règle (fichesVisibles, jeVoisLaCategorie).
   ============================================================ */
let ckModelesOuvert = false;
let ckModelesCategorie = '';
const SANS_CATEGORIE_MODELES = '— Sans catégorie';

function categoriesDesModeles(){
  const fiches = (typeof fichesVisibles === 'function') ? fichesVisibles() : (modelesTexte || []);
  const cats = (typeof toutesLesEtiquettes === 'function') ? toutesLesEtiquettes() : [];
  const out = cats.filter(cat => (typeof jeVoisLaCategorie !== 'function' || jeVoisLaCategorie(cat)) &&
    fiches.some(m => categoriesDe(m).indexOf(cat) !== -1))
    .map(cat => ({ cat, n: fiches.filter(m => categoriesDe(m).indexOf(cat) !== -1).length }));
  const sans = fiches.filter(m => !categoriesDe(m).length).length;
  if(sans) out.push({ cat: SANS_CATEGORIE_MODELES, n: sans });
  return out;
}
function fichesDeLaCategorie(cat){
  const fiches = (typeof fichesVisibles === 'function') ? fichesVisibles() : (modelesTexte || []);
  return fiches.filter(m => cat === SANS_CATEGORIE_MODELES ? !categoriesDe(m).length : categoriesDe(m).indexOf(cat) !== -1)
    .sort((a, b) => String(a.titre || a.nom).localeCompare(String(b.titre || b.nom), 'fr'));
}

function panneauDesModeles(choisir, fermer){
  const p = document.createElement('div');
  p.className = 'ckModeles';
  const dessiner = () => {
    p.innerHTML = '';
    const h = document.createElement('div');
    h.className = 'ckModelesTete';
    const t = document.createElement('div');
    t.className = 'ckModelesChemin';
    t.textContent = '📄 Modèles messages' + (ckModelesCategorie ? ' › ' + ckModelesCategorie : '');
    if(ckModelesCategorie){
      h.appendChild(ckBouton('‹', 'Revenir aux catégories', () => { ckModelesCategorie = ''; dessiner(); }, 'rond'));
    }
    h.appendChild(t);
    h.appendChild(ckBouton('✕', 'Fermer', fermer, 'rond'));
    p.appendChild(h);
    const l = document.createElement('div');
    l.className = 'ckModelesListe';
    if(!modelesTexte || !modelesTexte.length){
      l.innerHTML = '<div class="empty" style="padding:10px;font-size:12.5px;">Lecture des modèles…</div>';
      p.appendChild(l);
      chargerModelesTexte().then(() => { if(typeof chargerAccesCategories === 'function') return chargerAccesCategories(); })
        .then(() => { if(modelesTexte && modelesTexte.length) dessiner();
                      else l.innerHTML = '<div class="empty" style="padding:10px;font-size:12.5px;">Aucune fiche dans 📄 Modèles messages.</div>'; });
      return;
    }
    if(!ckModelesCategorie){
      categoriesDesModeles().forEach(x => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ckModelesLigne';
        b.innerHTML = '<span class="n"></span><span class="c"></span><span class="f">›</span>';
        b.querySelector('.n').textContent = x.cat;
        b.querySelector('.c').textContent = x.n;
        b.addEventListener('click', () => { ckModelesCategorie = x.cat; dessiner(); });
        l.appendChild(b);
      });
    }else{
      fichesDeLaCategorie(ckModelesCategorie).forEach(m => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ckModelesLigne fiche';
        b.innerHTML = '<span class="n"></span><span class="a"></span>';
        b.querySelector('.n').textContent = m.titre || m.nom;
        b.querySelector('.a').textContent = String(m.contenu || '').replace(/\s+/g, ' ').slice(0, 110);
        b.addEventListener('click', () => choisir(String(m.contenu || ''), m));
        l.appendChild(b);
      });
    }
    p.appendChild(l);
  };
  dessiner();
  return p;
}

/* ============================================================
   ⚡ LE GESTIONNAIRE DES RÉPONSES RAPIDES — v1174

   David, le 14 octobre : « il me faut dans la messagerie un endroit
   où changer le texte de tous les boutons rapides … un vrai
   gestionnaire de boutons rapides, avec la possibilité d'en créer
   d'autres et de les attribuer à des types de conversation : bureau,
   vitrine, retard, etc. » Ses réponses : les administrateurs les
   changent, pour toute l'équipe ; dans le ⚙️ de la messagerie.

   Une réponse rapide : ce que dit le bouton, le message qu'il
   envoie, et les types de conversation où il apparaît, dans l'ordre
   de la liste. « 📅 Proposer un créneau » est à part : il n'envoie
   rien, il ouvre le formulaire — on change son texte et ses types,
   pas ce qu'il fait.

   ⚠️ TANT QUE PERSONNE N'A RIEN CHANGÉ, CE SONT LES BOUTONS D'AVANT,
   écrits ici (VITES_CK, VITES_VITRINE_CK). Le Worker ne garde que la
   liste qu'un administrateur a enregistrée.
   ============================================================ */
const GENRES_RAPIDES = ['bureau', 'vitrine', 'retard', 'annul', 'oubli', 'groupe', 'interne', 'moniteur'];
let reponsesRapidesEC = null;        /* null : celles d'origine */
let reponsesRapidesLues = false;

function reponsesRapidesDOrigine(){
  const sansVitrine = GENRES_RAPIDES.filter(g => g !== 'vitrine');
  return VITES_CK.map(x => ({
    id: x.k, bouton: x.t, message: x.msg || '', sorte: x.k === 'cren' ? 'creneau' : 'message',
    /* le créneau n'avait de sens que dans un fil d'élève */
    genres: x.k === 'cren' ? ['bureau', 'retard', 'annul', 'oubli', 'moniteur'] : sansVitrine.slice()
  })).concat(VITES_VITRINE_CK.map(x => ({ id: 'v' + x.k, bouton: x.t, message: x.msg, sorte: 'message', genres: ['vitrine'] })));
}
function reponsesRapides(){ return reponsesRapidesEC || reponsesRapidesDOrigine(); }

/* Celles d'un fil : cochées pour son type, dans l'ordre de la liste.
   Le créneau demande un élève (on ne le propose pas à un groupe). */
function reponsesRapidesDuFil(c){
  return reponsesRapides().filter(x => (x.genres || []).indexOf(c.genre) !== -1 &&
    (x.sorte !== 'creneau' || (c.eleve && c.genre !== 'groupe')));
}

async function chargerReponsesRapides(){
  reponsesRapidesLues = true;
  try{
    const d = await appelPrep({ action: 'msgRapides' });
    const avant = JSON.stringify(reponsesRapidesEC);
    reponsesRapidesEC = (d && Array.isArray(d.reponses)) ? d.reponses : null;
    return JSON.stringify(reponsesRapidesEC) !== avant;
  }catch(e){ return false; }
}

async function enregistrerReponsesRapides(liste){
  const rep = await appelPrep({ action: 'msgRapidesPoser', reponses: liste });
  if(rep && rep.status === 'error') throw new Error(rep.message || 'refusé');
  reponsesRapidesEC = (rep && Array.isArray(rep.reponses)) ? rep.reponses : null;
  return rep;
}

function rrEtiquettes(genres){
  const d = document.createElement('div');
  d.className = 'rrTypes';
  GENRES_RAPIDES.filter(g => (genres || []).indexOf(g) !== -1).forEach(g => {
    const t = document.createElement('span');
    t.className = 'rrType';
    t.textContent = (GENRES_CK[g] || {}).rond + ' ' + (MOTS_DU_RAIL[g] || (GENRES_CK[g] || {}).nom || g);
    d.appendChild(t);
  });
  if(!d.children.length){
    const t = document.createElement('span');
    t.className = 'rrType vide';
    t.textContent = 'aucune conversation : le bouton n’apparaît nulle part';
    d.appendChild(t);
  }
  return d;
}

/* La carte du ⚙️ — administrateurs seuls, comme tout l'écran */
let rrFiltre = '';
function carteReponsesRapides(){
  const carte = document.createElement('div');
  carte.id = 'regRapides';
  carte.className = 'rrCarte';
  const dessiner = () => {
    carte.innerHTML = '';
    const h = document.createElement('div');
    h.innerHTML = '<div style="font-weight:800;font-size:14px;">⚡ Réponses rapides</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5;">Les boutons au-dessus de la zone ' +
      'd’écriture. Un bouton n’apparaît que dans les conversations cochées, dans l’ordre de la liste : ' +
      'glisse ⠿ ou utilise ↑ ↓ pour le changer.' + (reponsesRapidesEC ? '' : ' Ce sont encore les réponses d’origine.') + '</div>';
    carte.appendChild(h);

    /* Voir la liste telle qu'un type de conversation la montre */
    const filtres = document.createElement('div');
    filtres.className = 'rrFiltres';
    [['', 'Toutes']].concat(GENRES_RAPIDES.map(g => [g, (GENRES_CK[g] || {}).rond + ' ' + (MOTS_DU_RAIL[g] || g)])).forEach(([g, t]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rrFiltre' + (rrFiltre === g ? ' on' : '');
      b.textContent = t;
      b.addEventListener('click', () => { rrFiltre = g; dessiner(); });
      filtres.appendChild(b);
    });
    carte.appendChild(filtres);

    const liste = reponsesRapides();
    const vues = liste.map((x, i) => ({ x, i })).filter(o => !rrFiltre || (o.x.genres || []).indexOf(rrFiltre) !== -1);
    if(!vues.length){
      const v = document.createElement('div');
      v.className = 'empty';
      v.style.cssText = 'padding:12px;font-size:12.5px;';
      v.textContent = 'Aucune réponse rapide pour ces conversations.';
      carte.appendChild(v);
    }
    vues.forEach(({ x, i }, k) => {
      const l = document.createElement('div');
      l.className = 'rrLigne';
      l.dataset.i = String(i);
      /* ⠿ David : « plus un cliqué-glissé pour l'ordre ». La poignée
         seule déclenche le glissement : un appui ailleurs sur la
         ligne garde ses gestes (✏️, ↑ ↓). */
      const poignee = document.createElement('span');
      poignee.className = 'rrPoignee';
      poignee.textContent = '⠿';
      poignee.title = 'Glisser pour changer l’ordre';
      poignee.addEventListener('pointerdown', ev => glisserLaReponse(ev, l, carte, liste, sauver));
      l.appendChild(poignee);
      const fl = document.createElement('div');
      fl.className = 'rrOrdre';
      const fleche = (sym, titre, vers, actif) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ckBt rond';
        b.textContent = sym;
        b.title = titre;
        b.disabled = !actif;
        b.addEventListener('click', async () => {
          const n = liste.slice();
          const j = vues[k + vers].i;
          [n[i], n[j]] = [n[j], n[i]];
          await sauver(n);
        });
        return b;
      };
      fl.appendChild(fleche('↑', 'Plus haut', -1, k > 0));
      fl.appendChild(fleche('↓', 'Plus bas', 1, k < vues.length - 1));
      l.appendChild(fl);
      const m = document.createElement('div');
      m.className = 'rrMilieu';
      const puce = document.createElement('span');
      puce.className = 'ckVite rrPuce';
      puce.textContent = x.bouton;
      m.appendChild(puce);
      const msg = document.createElement('div');
      msg.className = 'rrMessage';
      msg.textContent = x.sorte === 'creneau' ? '📅 ouvre le formulaire du créneau (n’envoie rien tout seul)' : '« ' + x.message + ' »';
      m.appendChild(msg);
      m.appendChild(rrEtiquettes(x.genres));
      l.appendChild(m);
      l.appendChild(ckBouton('✏️', 'Modifier cette réponse', () => fenetreReponseRapide(x, liste, sauver), 'rond'));
      carte.appendChild(l);
    });

    const bas = document.createElement('div');
    bas.className = 'rrBas';
    bas.appendChild(ckBouton('➕ Nouvelle réponse rapide', '', () => fenetreReponseRapide(null, liste, sauver), 'p'));
    if(reponsesRapidesEC){
      bas.appendChild(ckBouton('↩️ Remettre celles d’origine', 'Revenir aux boutons de départ', async () => {
        if(!await confirmer('Remettre les réponses rapides d’origine ?\n\nTes textes, tes nouvelles réponses et ' +
            'tes réglages de conversations seront perdus.', '↩️ Réponses d’origine', true)) return;
        await sauver(null);
      }));
    }
    carte.appendChild(bas);
  };
  /* Ouvert avant tout fil : on lit d'abord ce qui est enregistré */
  const aLire = !reponsesRapidesLues;
  if(aLire){
    carte.innerHTML = '<div class="empty" style="padding:12px;">Lecture des réponses rapides…</div>';
    chargerReponsesRapides().then(() => dessiner());
  }
  const sauver = async (liste) => {
    try{
      await enregistrerReponsesRapides(liste);
      if(typeof showToast === 'function') showToast('⚡ Réponses rapides enregistrées ✅');
    }catch(e){
      if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e));
    }
    dessiner();
  };
  if(!aLire) dessiner();
  return carte;
}

/* Le glisser-déposer : la ligne suit le doigt, les autres s'écartent,
   et l'ordre s'enregistre au lâcher. */
function glisserLaReponse(ev, ligne, carte, liste, sauver){
  ev.preventDefault();
  const lignes = [...carte.querySelectorAll('.rrLigne')];
  const depart = lignes.indexOf(ligne);
  const y0 = ev.clientY;
  let vers = depart;
  ligne.classList.add('rrGlisse');
  try{ ev.target.setPointerCapture(ev.pointerId); }catch(e){}
  const bouger = e => {
    const dy = e.clientY - y0;
    ligne.style.transform = 'translateY(' + dy + 'px)';
    /* La place se lit sous le doigt : passé le milieu d'une ligne, on
       prend sa place. */
    const milieu = e.clientY;
    /* Une longue liste défile toute seule près des bords */
    const zone = carte.closest('#msgReglagesCorps') || document.scrollingElement;
    const zr = zone === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : zone.getBoundingClientRect();
    if(e.clientY < zr.top + 50) zone.scrollTop -= 14;
    else if(e.clientY > zr.bottom - 50) zone.scrollTop += 14;
    vers = depart;
    lignes.forEach((x, k) => {
      if(x === ligne) return;
      const r = x.getBoundingClientRect();
      const c = r.top + r.height / 2;
      if(k < depart && milieu < c) vers = Math.min(vers, k);
      if(k > depart && milieu > c) vers = Math.max(vers, k);
    });
    lignes.forEach((x, k) => {
      x.classList.toggle('rrPlace', x !== ligne && k === vers);
    });
  };
  const lacher = async () => {
    document.removeEventListener('pointermove', bouger);
    document.removeEventListener('pointerup', lacher);
    ligne.classList.remove('rrGlisse');
    ligne.style.transform = '';
    lignes.forEach(x => x.classList.remove('rrPlace'));
    if(vers === depart) return;
    const ordre = lignes.map(x => Number(x.dataset.i));
    const [pris] = ordre.splice(depart, 1);
    ordre.splice(vers, 0, pris);
    /* Les lignes filtrées reprennent leurs places dans la liste entière */
    const n = liste.slice();
    const places = lignes.map(x => Number(x.dataset.i)).sort((a, b) => a - b);
    places.forEach((p, k) => { n[p] = liste[ordre[k]]; });
    await sauver(n);
  };
  document.addEventListener('pointermove', bouger);
  document.addEventListener('pointerup', lacher);
}

/* La fenêtre d'une réponse : son bouton, son message, ses conversations */
function fenetreReponseRapide(x, liste, sauver){
  const neuve = !x;
  const r = x ? JSON.parse(JSON.stringify(x)) : { id: '', bouton: '', message: '', sorte: 'message',
                                                  genres: rrFiltre ? [rrFiltre] : ['bureau'] };
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal rrFenetre';
  boite.style.maxWidth = 'min(520px, 94vw)';
  fond.appendChild(boite);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };

  boite.insertAdjacentHTML('beforeend', '<h3>' + (neuve ? '➕ Nouvelle réponse rapide' : '✏️ Réponse rapide') + '</h3>');
  const champ = (lib, el) => { const l = document.createElement('label'); l.textContent = lib; boite.append(l, el); return el; };
  const bouton = document.createElement('input');
  bouton.type = 'text'; bouton.maxLength = 60; bouton.value = r.bouton; bouton.id = 'rrBouton';
  bouton.placeholder = 'Ex : 💶 Les tarifs';
  champ('Le bouton — ce qu’on voit', bouton);
  const message = document.createElement('textarea');
  message.rows = 4; message.maxLength = 1000; message.value = r.message; message.id = 'rrTexte';
  if(r.sorte === 'creneau'){
    const n = document.createElement('div');
    n.className = 'rrNote';
    n.textContent = '📅 Ce bouton ouvre le formulaire « Proposer un créneau » : il n’envoie pas de texte tout seul. ' +
      'Tu changes son nom et les conversations où il apparaît (un fil d’élève seulement).';
    boite.appendChild(n);
  }else{
    const lm = document.createElement('div');
    lm.className = 'rrLabelLigne';
    const lab = document.createElement('label');
    lab.textContent = 'Le message envoyé';
    lm.appendChild(lab);
    const prendre = document.createElement('button');
    prendre.type = 'button';
    prendre.className = 'rrLien';
    prendre.textContent = '📄 Reprendre un modèle';
    prendre.addEventListener('click', () => {
      const cadre = boite.querySelector('.rrModeles');
      if(cadre){ cadre.remove(); return; }
      ckModelesCategorie = '';
      const c2 = document.createElement('div');
      c2.className = 'rrModeles';
      c2.appendChild(panneauDesModeles(t => { message.value = t; c2.remove(); apercu(); }, () => c2.remove()));
      lm.after(c2);
    });
    lm.appendChild(prendre);
    boite.appendChild(lm);
    boite.appendChild(message);
    /* 🔤 Les mots qui se remplacent : un appui les pose au curseur */
    const mots = document.createElement('div');
    mots.className = 'rrMots';
    mots.appendChild(document.createTextNode('Mots qui se remplacent :'));
    MOTS_RAPIDES.forEach(w => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rrMot';
      b.textContent = w.mot;
      b.title = w.dit;
      b.addEventListener('click', () => {
        const a = message.selectionStart || message.value.length, z = message.selectionEnd || a;
        message.value = message.value.slice(0, a) + w.mot + message.value.slice(z);
        message.focus();
        message.setSelectionRange(a + w.mot.length, a + w.mot.length);
        apercu();
      });
      mots.appendChild(b);
    });
    boite.appendChild(mots);
  }

  const lt = document.createElement('label');
  lt.textContent = 'Dans quelles conversations';
  boite.appendChild(lt);
  const types = document.createElement('div');
  types.className = 'rrChoix';
  GENRES_RAPIDES.forEach(g => {
    const b = document.createElement('button');
    b.type = 'button';
    const maj = () => { b.className = 'rrFiltre' + (r.genres.indexOf(g) !== -1 ? ' on' : ''); b.setAttribute('aria-pressed', r.genres.indexOf(g) !== -1 ? 'true' : 'false'); };
    b.textContent = (GENRES_CK[g] || {}).rond + ' ' + ((GENRES_CK[g] || {}).nom || g);
    b.dataset.genre = g;
    b.addEventListener('click', () => {
      const i = r.genres.indexOf(g);
      if(i === -1) r.genres.push(g); else r.genres.splice(i, 1);
      maj(); apercu();
    });
    maj();
    types.appendChild(b);
  });
  boite.appendChild(types);

  /* L'aperçu : le bouton, et la bulle qui part */
  const ap = document.createElement('div');
  ap.className = 'rrApercu';
  boite.appendChild(ap);
  const apercu = () => {
    ap.innerHTML = '<div class="rrApT">Aperçu</div>';
    const p = document.createElement('span');
    p.className = 'ckVite rrPuce';
    p.textContent = bouton.value.trim() || 'Le bouton';
    ap.appendChild(p);
    if(r.sorte !== 'creneau'){
      const bu = document.createElement('div');
      bu.className = 'rrBulle';
      const ex = exemplesDesMotsRapides();
      bu.textContent = remplirLesMotsRapides(message.value.trim(), null, Object.assign({ eleve: ex.nom }, ex)) || 'Le message envoyé';
      ap.appendChild(bu);
      if(/\{/.test(message.value)){
        const n = document.createElement('div');
        n.className = 'rrApT';
        n.style.marginTop = '6px';
        n.textContent = 'Exemple : Camille Le Bihan, élève de Maryne, à la vitrine de Loudéac, et toi (' + ex.moi + ')';
        ap.appendChild(n);
      }
    }
  };
  bouton.addEventListener('input', apercu);
  message.addEventListener('input', apercu);
  apercu();

  const err = document.createElement('div');
  err.className = 'rrErreur';
  boite.appendChild(err);

  const rang = document.createElement('div');
  rang.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', fermer);
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.id = 'rrEnregistrer';
  bOk.textContent = '💾 Enregistrer';
  bOk.addEventListener('click', async () => {
    r.bouton = bouton.value.trim();
    if(r.sorte !== 'creneau') r.message = message.value.trim();
    if(!r.bouton){ err.textContent = 'Écris ce que dit le bouton.'; return; }
    if(r.sorte !== 'creneau' && !r.message){ err.textContent = 'Écris le message qu’il envoie.'; return; }
    if(!r.genres.length){ err.textContent = 'Coche au moins une conversation : sinon le bouton n’apparaît nulle part.'; return; }
    bOk.disabled = true;
    const n = liste.slice();
    if(neuve){ r.id = 'r' + Date.now().toString(36); n.push(r); }
    else n[n.findIndex(y => y.id === x.id)] = r;
    fermer();
    await sauver(n);
  });
  rang.append(bAnn, bOk);
  boite.appendChild(rang);
  if(!neuve){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);margin-top:8px;';
    bSup.textContent = '🗑️ Supprimer cette réponse';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer « ' + x.bouton + ' » ?', '🗑️ Supprimer', true)) return;
      fermer();
      await sauver(liste.filter(y => y.id !== x.id));
    });
    boite.appendChild(bSup);
  }
  document.body.appendChild(fond);
  setTimeout(() => bouton.focus(), 60);
}

/* ------------------------------------------------------------
   LA FICHE ÉCLAIR
   ------------------------------------------------------------ */

function ckCadre(lab, v, v2){
  const d = document.createElement('div');
  d.className = 'ckCad';
  const l = document.createElement('div');
  l.className = 'lab';
  l.textContent = lab;
  d.appendChild(l);
  if(v !== undefined && v !== null){
    const x = document.createElement('div');
    x.className = 'v';
    x.textContent = v;
    d.appendChild(x);
  }
  if(v2){
    const y = document.createElement('div');
    y.className = 'v2';
    y.textContent = v2;
    d.appendChild(y);
  }
  return d;
}

/* Combien de leçons la frise prévoit en tout, quand elle le dit. */
function ckLeconsDeLaFrise(frise){
  try{
    const t = (typeof friseUtilisable === 'function') ? friseUtilisable(frise) : '';
    if(!t) return 0;
    if(typeof leconsPrevuesAacCs === 'function'){
      const a = leconsPrevuesAacCs(t);
      if(a !== null) return a;
    }
    const av = (typeof leconsAvantExamenBlanc === 'function') ? leconsAvantExamenBlanc(t) : null;
    const ap = (typeof leconsApresExamenBlanc === 'function') ? leconsApresExamenBlanc(t) : null;
    return (av || 0) + (ap || 0);
  }catch(e){ return 0; }
}

function ckBlocEleve(nom){
  const frag = document.createDocumentFragment();
  let s = {}, fi = {}, e = null, p = {};
  try{ s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {}; }catch(x){}
  try{ fi = (typeof ficheDe === 'function') ? (ficheDe(nom) || {}) : {}; }catch(x){}
  try{ e = (typeof eleveDuBureau === 'function') ? eleveDuBureau(nom) : null; }catch(x){}
  try{ p = (typeof positionDeLEleve === 'function') ? (positionDeLEleve(nom, e) || {}) : {}; }catch(x){}

  /* ÉLÈVE */
  const fait = (p.fait && p.fait.total) || 0;
  const boite = (typeof boiteVisible === 'function') ? String(boiteVisible(nom) || '').toUpperCase() : '';
  const centre = s.centre || fi.site || '';
  const un = ckCadre('ÉLÈVE', nom, [boite, fait ? (typeof rangCourt === 'function' ? rangCourt(fait) : fait) + ' leçon' : '', centre]
    .filter(Boolean).join(' · ') || ' ');
  const sur = ckLeconsDeLaFrise(fi.frise);
  if(sur && fait){
    const j = document.createElement('div');
    j.className = 'ckJauge';
    j.innerHTML = '<i></i>';
    j.firstChild.style.width = Math.min(100, Math.round(fait / sur * 100)) + '%';
    un.appendChild(j);
    const f2 = document.createElement('div');
    f2.className = 'v2 mono';
    f2.style.marginTop = '5px';
    f2.textContent = 'frise ' + fait + ' / ' + sur;
    un.appendChild(f2);
  }
  frag.appendChild(un);

  /* PROCHAIN COURS */
  const prep = p.prep || ((typeof preparationDe === 'function') ? preparationDe(nom) : null);
  frag.appendChild(prep
    ? ckCadre('PROCHAIN COURS',
        [ckJourCourt(prep.date), prep.heure].filter(Boolean).join(' · ') || 'prévu',
        [prep.moniteur, prep.site].filter(Boolean).join(' · '))
    : ckCadre('PROCHAIN COURS', '—', 'aucun cours préparé'));

  /* PERMIS */
  try{
    const t = (typeof etatDuPermis === 'function') ? etatDuPermis(nom) : null;
    if(t && t.gros){
      /* « toucher pour… » parle de la tuile du dossier, qui se touche :
         ici rien ne se touche, la phrase mentirait. */
      const l = (t.lignes || []).filter(x => x && x.txt && !/^toucher /i.test(x.txt))[0];
      frag.appendChild(ckCadre('PERMIS', t.gros, l ? l.txt : ''));
    }
  }catch(x){}

  /* NOTES INTERNES — lues une fois par élève, à la demande */
  const n = ckCadre('NOTES INTERNES');
  n.dataset.notesDe = nom;
  ckRemplirLesNotes(n, nom);
  frag.appendChild(n);
  return frag;
}

function ckRemplirLesNotes(cadre, nom){
  const lab = cadre.querySelector('.lab');
  Array.prototype.slice.call(cadre.querySelectorAll('.v2')).forEach(x => x.remove());
  const deja = ckNotesDe[nom];
  const ligne = t => {
    const d = document.createElement('div');
    d.className = 'v2 fort';
    d.textContent = t;
    cadre.appendChild(d);
  };
  if(!deja){
    ligne('lecture…');
    ckNotesDe[nom] = { attente: true };
    appelPrep({ action: 'notesDossierList', eleve: nom })
      .then(d => {
        const l = (d && d.notes) || [];
        ckNotesDe[nom] = { liste: l };
      })
      .catch(() => { ckNotesDe[nom] = { refus: true }; })
      .then(() => {
        document.querySelectorAll('[data-notes-de]').forEach(c => {
          if(c.dataset.notesDe === nom) ckRemplirLesNotes(c, nom);
        });
      });
    return;
  }
  if(deja.attente){ ligne('lecture…'); return; }
  if(deja.refus){ cadre.style.display = 'none'; return; }
  const l = deja.liste || [];
  lab.textContent = 'NOTES INTERNES · ' + l.length;
  if(!l.length){ ligne('aucune'); return; }
  l.slice(0, 3).forEach(x => {
    const t = String(x.texte || '').replace(/\s+/g, ' ').trim();
    ligne('• ' + (t.length > 90 ? t.slice(0, 89) + '…' : t));
  });
}

function ckFicheEclair(f){
  const c = (f && f.conv) || {};
  const frag = document.createElement('div');
  frag.className = 'ckFiche';
  const membres = (f && f.membres) || [];

  /* 🖼️ v1163 — la photo en grand, et qui peut la changer : un
     administrateur pour un élève ou un collègue, le bureau pour un
     groupe. */
  if(typeof rondPhoto === 'function'){
    const cleP = clePhotoDuFil(c, membres);
    if(cleP){
      const z = document.createElement('div');
      z.className = 'ckFichePhoto';
      const nomP = c.genre === 'groupe' ? '' : (c.eleve || ckTitreListe(Object.assign({}, c, { membres: membres })));
      const r = rondPhoto(cleP, nomP, 84);
      if(!r.querySelector('img') && !r.textContent) r.textContent = '👥';
      z.appendChild(r);
      frag.appendChild(z);
    }
  }
  const boutonPhoto = () => {
    if(typeof ouvrirFenetrePhotoProfil !== 'function') return null;
    if(c.genre === 'groupe'){
      return peutChangerPhotoGroupe()
        ? ckBouton('🖼️ Photo du groupe', 'Choisir l’image du groupe',
            () => ouvrirFenetrePhotoProfil({ cible: 'groupe', id: c.id, titre: 'La photo du groupe' }))
        : null;
    }
    if(!estAdminDesPhotosEC()) return null;
    if(c.eleve){
      return ckBouton('🖼️ Changer sa photo', 'La photo de ' + c.eleve,
        () => ouvrirFenetrePhotoProfil({ cible: 'eleve', nom: c.eleve }));
    }
    const moi = normaliserPourPhoto((typeof ACCES !== 'undefined' && ACCES.moniteur) || '');
    const autres = membres.filter(m => m.genre === 'user' && normaliserPourPhoto(m.qui) !== moi);
    if(autres.length === 1){
      return ckBouton('🖼️ Changer sa photo', 'La photo de ' + autres[0].qui,
        () => ouvrirFenetrePhotoProfil({ cible: 'user', nom: autres[0].qui }));
    }
    return null;
  };

  /* 👋 v1171 — un visiteur de la vitrine : qui, comment le joindre,
     et ce qu'on peut en faire. */
  if(c.genre === 'vitrine') return ckFicheVitrine(f, frag);

  if(f.enSupervision){
    frag.appendChild(ckCadre('SUPERVISION', '🔒 Tu n’es pas dedans',
      'Ton passage est noté au journal. Pour répondre, ajoute-toi par ⋯ → 👥 Participants.'));
  }
  if(c.eleve && c.genre !== 'groupe'){
    frag.appendChild(ckBlocEleve(c.eleve));
    const acts = document.createElement('div');
    acts.className = 'ckFicheActs';
    const tel = ckTelephoneDe(c.eleve);
    if(tel) acts.appendChild(ckLienAppel(c.eleve));
    if(typeof ouvrirPageEleve === 'function'){
      acts.appendChild(ckBouton('👤 Ouvrir son dossier', 'Le dossier complet de l’élève',
        () => ouvrirPageEleve(c.eleve)));
    }
    const bp = boutonPhoto();
    if(bp) acts.appendChild(bp);
    frag.appendChild(acts);
    return frag;
  }
  if(c.genre === 'groupe'){
    const g = ckCadre('GROUPE · ' + membres.length);
    membres.forEach(m => {
      const d = document.createElement('div');
      d.className = 'v2 fort';
      d.textContent = '• ' + (m.genre === 'boite' ? '🏢 la boîte du bureau' : m.qui) +
        (m.genre === 'eleve' ? '' : m.genre === 'user' ? ' · équipe' : '');
      g.appendChild(d);
    });
    frag.appendChild(g);
    const bp = boutonPhoto();
    if(bp){
      const acts = document.createElement('div');
      acts.className = 'ckFicheActs';
      acts.appendChild(bp);
      frag.appendChild(acts);
    }
    return frag;
  }
  if(!f.enSupervision){
    const moi = normaliserMessagerie((typeof ACCES !== 'undefined' && ACCES.moniteur) || '');
    const autres = membres.filter(m => m.genre === 'user' && normaliserMessagerie(m.qui) !== moi)
                          .map(m => m.qui);
    frag.appendChild(ckCadre('ÉQUIPE', autres.join(', ') || 'Toi seul',
      membres.some(m => m.genre === 'boite') ? 'avec la boîte du bureau' : 'conversation entre vous'));
    const bp = boutonPhoto();
    if(bp){
      const acts = document.createElement('div');
      acts.className = 'ckFicheActs';
      acts.appendChild(bp);
      frag.appendChild(acts);
    }
  }
  return frag;
}

/* ------------------------------------------------------------
   👋 LA FICHE D'UN VISITEUR DE LA VITRINE — v1171

   ⚠️ ON NE SAIT PAS QUI IL EST. Rien du dossier d'un élève ne
   s'affiche ici, même si le prénom correspond : c'est le bureau qui
   rattache, à la main, après avoir reconnu la personne.
   ------------------------------------------------------------ */
function ckJourHeureCourt(quand){
  const m = String(quand || '').match(/^(\d{2})\/(\d{2})\/\d{4}\s+(\d{2}):(\d{2})/);
  return m ? 'le ' + m[1] + '/' + m[2] + ' à ' + m[3] + ':' + m[4] : '';
}

function ckFicheVitrine(f, frag){
  const c = f.conv || {};
  const v = c.vitrine || {};
  const prenom = v.prenom || c.titre || 'Visiteur';
  const nb = v.nomBureau || '';
  if(f.enSupervision){
    frag.appendChild(ckCadre('SUPERVISION', '🔒 Tu n’es pas dedans',
      'Ton passage est noté au journal. Pour répondre, ajoute-toi par ⋯ → 👥 Participants.'));
  }
  frag.appendChild(ckCadre('VISITEUR · VITRINE' + (nb ? ' DE ' + nb.toUpperCase() : ''), prenom,
    ['par le QR code', ckJourHeureCourt(v.creeLe)].filter(Boolean).join(' ') +
    (v.etat === 'bloquee' ? ' · 🚫 bloqué' : ' · pas encore élève')));
  frag.appendChild(ckCadre('POUR LUI RÉPONDRE', v.tel || '—',
    v.mail ? v.mail + ' — la réponse lui part aussi par mail quand sa page est fermée' : ''));

  const acts = document.createElement('div');
  acts.className = 'ckFicheActs';
  const tel = String(v.tel || '').replace(/[^\d+]/g, '');
  if(tel){
    const a = document.createElement('a');
    a.className = 'ckBt';
    a.href = 'tel:' + tel;
    a.textContent = '📞 Appeler ' + ckPrenom(prenom);
    acts.appendChild(a);
  }
  if(ckPeutGerer() && v.etat !== 'bloquee'){
    acts.appendChild(ckBouton('➕ Créer sa fiche élève', 'Il vient s’inscrire : sa fiche est créée avec son téléphone et son mail, et la discussion rejoint son dossier',
      () => ckCreerFicheDuVisiteur(f)));
    acts.appendChild(ckBouton('🔗 C’est un élève : rattacher', 'La discussion rejoint son dossier et devient son fil « Le bureau »',
      () => ckRattacherLeVisiteur(f)));
  }
  if(!Number(c.fermee || 0) && !f.enSupervision && f.estMembre && ckPeutGerer()){
    acts.appendChild(ckBouton('🔒 Clore la discussion', 'La discussion part dans 🗄️ Fermées ; le visiteur peut en ouvrir une nouvelle',
      () => ckRegler(f)));
  }
  if(ckPeutGerer() && v.etat !== 'bloquee'){
    acts.appendChild(ckBouton('🚫 Bloquer', 'Ses messages n’arrivent plus, et il ne peut plus en ouvrir depuis la vitrine',
      () => ckBloquerLeVisiteur(f), 'rouge'));
  }
  if(acts.children.length) frag.appendChild(acts);
  return frag;
}

/* Après un rattachement, on rouvre le fil d'arrivée : celui de la
   vitrine a pu fondre dans le fil « Le bureau » de l'élève. */
async function ckApresLeVisiteur(rep, id){
  const cible = (rep && rep.conversation) || id;
  afficherMessagerie(true);
  await ouvrirLeFil(cible);
}

async function ckRattacherLeVisiteur(f){
  const c = f.conv || {};
  const v = c.vitrine || {};
  const nom = await choisirEleveConnu('🔗 Rattacher à un élève',
    'La discussion rejoint son dossier et devient son fil « Le bureau » de l’espace élève. ' +
    'Vérifie que c’est bien lui : quelqu’un peut écrire sous le nom d’un autre.', '');
  if(!nom) return;
  const connu = (elevesConnus || []).some(n => normaliserMessagerie(n) === normaliserMessagerie(nom));
  if(!connu){
    if(typeof showToast === 'function') showToast('« ' + nom + ' » n’est pas un élève connu : utilise ➕ Créer sa fiche élève.');
    return;
  }
  if(!await confirmer('La discussion de ' + (v.prenom || c.titre || 'ce visiteur') + ' rejoint le dossier de ' + nom +
      ' et devient son fil « Le bureau ».\n\nSes messages s’afficheront à son nom, dans son espace élève.',
      '🔗 Rattacher')) return;
  const rep = await appelPrep({ action: 'visiteurRattacher', id: c.id, eleve: nom });
  if(typeof showToast === 'function') showToast('🔗 Rattachée au dossier de ' + nom);
  await ckApresLeVisiteur(rep, c.id);
}

async function ckCreerFicheDuVisiteur(f){
  const c = f.conv || {};
  const v = c.vitrine || {};
  const nom = await choisirEleveConnu('➕ Créer sa fiche élève',
    'Son prénom et son nom. Son téléphone et son mail sont repris de la discussion, ' +
    'qui rejoint ensuite son dossier.', v.prenom || '');
  if(!nom) return;
  const connu = (elevesConnus || []).some(n => normaliserMessagerie(n) === normaliserMessagerie(nom));
  if(connu && !await confirmer('« ' + nom + ' » a déjà un dossier.\n\nY rattacher la discussion, sans toucher à sa fiche ?',
      '🔗 Rattacher')) return;
  const remarques = 'Premier contact : discussion de la vitrine' + (v.nomBureau ? ' de ' + v.nomBureau : '') +
    (v.creeLe ? ', le ' + String(v.creeLe).slice(0, 10) : '') + '.';
  const fiche = { telephone: typeof normaliserTel === 'function' ? normaliserTel(v.tel || '') : String(v.tel || ''),
                  email: v.mail || '', remarques: remarques };
  if(!connu){
    await appelPrep(Object.assign({ action: 'ficheSet', eleve: nom }, fiche));
    if(Array.isArray(elevesConnus) && elevesConnus.indexOf(nom) === -1) elevesConnus.push(nom);
  }
  const rep = await appelPrep({ action: 'visiteurRattacher', id: c.id, eleve: nom });
  if(typeof showToast === 'function') showToast(connu ? '🔗 Rattachée au dossier de ' + nom : '➕ Fiche créée pour ' + nom);
  await ckApresLeVisiteur(rep, c.id);
  if(!connu && typeof ouvrirFicheEleve === 'function'){
    const deja = (typeof ficheDe === 'function' && ficheDe(nom)) || {};
    ouvrirFicheEleve(nom, Object.assign({}, deja, fiche));
  }
}

async function ckBloquerLeVisiteur(f){
  const c = f.conv || {};
  const v = c.vitrine || {};
  if(!await confirmer('Bloquer ' + (v.prenom || c.titre || 'ce visiteur') + ' ?\n\n' +
      'La discussion se ferme, et ses nouveaux messages n’arrivent plus : ni depuis cette page, ' +
      'ni avec le même téléphone, le même mail ou le même appareil.', '🚫 Bloquer', true)) return;
  await appelPrep({ action: 'visiteurBloquer', id: c.id });
  if(typeof showToast === 'function') showToast('🚫 Visiteur bloqué');
  await ckApresLeVisiteur(null, c.id);
}

function ckDessinerLaFiche(f){
  const x = $('ckpCtx');
  if(!x) return;
  x.innerHTML = '';
  if(f) x.appendChild(ckFicheEclair(f));
}

/* Sur l'étroit, la fiche s'ouvre en feuille, par-dessus le fil.
   ⚠️ « fixed », et calée sur la zone : dans le tiroir de 400 px une
   feuille de toute la largeur de l'écran recouvrirait l'appli. */
function ckFeuilleFiche(f, zone){
  const c = (f && f.conv) || {};
  const box = document.createElement('div');
  const r = zone.getBoundingClientRect();
  const voile = document.createElement('div');
  voile.className = 'ckVoile';
  voile.addEventListener('click', () => { ckFicheOuverte = false; dessinerLeFil(); });
  const fe = document.createElement('div');
  fe.className = 'ckFeuille';
  if(r.width){
    fe.style.left = Math.max(0, r.left) + 'px';
    fe.style.width = Math.min(r.width, window.innerWidth) + 'px';
  }
  const t = document.createElement('div');
  t.className = 't';
  t.textContent = 'ⓘ ' + (c.eleve || ckTitreListe(Object.assign({}, c, { membres: f.membres || [] })));
  const x = ckBouton('✕', 'Fermer', () => { ckFicheOuverte = false; dessinerLeFil(); }, 'rond');
  t.appendChild(x);
  fe.appendChild(t);
  fe.appendChild(ckFicheEclair(f));
  /* Le créneau, qui n'a pas de place dans l'en-tête du téléphone. */
  if(c.eleve && f.peutEcrire && c.genre !== 'groupe'){
    fe.appendChild(ckBouton('📅 Proposer un créneau', '', () => {
      ckFicheOuverte = false; ckCreneauOuvert = true; dessinerLeFil();
    }));
  }
  box.appendChild(voile);
  box.appendChild(fe);
  return box;
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-cockpit.js'] = true;
