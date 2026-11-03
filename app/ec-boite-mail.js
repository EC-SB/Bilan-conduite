/* Déployé le 03/11/2026 à 13:55 — v1337 */
/* ============================================================
   ec-boite-mail.js — ✉️ LA BOÎTE MAIL DE L'ÉCOLE — v1337

   David, le 3 novembre 2026 : « réfléchis comment je peux accéder à
   mes mails directement sur l'app et y répondre avec le suivi qui se
   lie aux élèves ». Puis, sur les schémas du même jour (« Les mails
   dans l'App », proposés à ses collègues) :
   · l'adresse OVH de l'école seulement, vue par le bureau et les
     administrateurs (droit « ✉️ Mails ») ;
   · « l'idée de conversation comme ça à suivre comme la messagerie
     on garde » : un onglet ✉️ Mails dans la messagerie, des fils ;
   · « un vrai éditeur de texte pour mail comme une vraie boîte
     mail » : De, À, Cc, Cci, Objet, mise en forme, pièces jointes,
     le mail d'origine cité dessous, brouillon, plein écran ;
   · ses signatures toutes prêtes (texte du webmail OVH + logo PNG),
     collées une fois dans « ✍️ Ma signature » ;
   · des réponses rapides avec leur constructeur — les quatre de
     départ, et on en ajoute ; un appui ouvre l'éditeur ;
   · les pubs et newsletters supprimées (à la corbeille) ;
   · ses mails dans le dossier de l'élève, onglet 💬 Messages.
   Claude (résumés, étiquettes, réponses proposées) : livraison 2.

   ⚠️ CE FICHIER NE TOUCHE PAS À LA MESSAGERIE, IL S'Y POSE. La
   liste, l'onglet et les colonnes sont ceux du cockpit
   (ec-cockpit.js) ; quand l'onglet ✉️ Mails est choisi, c'est ici
   qu'on dessine la liste et le fil. Les conversations de la
   messagerie et les mails ne se mélangent jamais dans un même fil.

   ⚠️ TOUS LES NOMS COMMENCENT PAR « ml ». Les modules partagent une
   seule portée (voir la v1135 : un « prenomDe » de trop).
   ============================================================ */

let mlFils = [];                 /* la liste (un fil = une conversation par mail) */
let mlEtat = null;               /* la boîte : relève, réglages, étiquettes */
let mlVue = 'boite';             /* 'boite' | 'regles' | 'chercher' */
let mlCherche = '';
let mlLueLe = 0;
let mlEnLecture = null;
let mlFilOuvert = null;          /* { fil, messages } */
let mlChoixEleveOuvert = false;  /* « 🔗 Rattacher » déplié en tête du fil */
let mlCompteNonLus = null;       /* le chiffre de l'onglet (convList) */
let mlSignaturesLues = null;

/* ------------------------------------------------------------
   CE QUE LE COCKPIT DEMANDE
   ------------------------------------------------------------ */
function mlOngletVisible(){
  return typeof aDroit !== 'function' || aDroit('mails');
}
function mlPeutEcrire(){
  return typeof peutModifier !== 'function' || peutModifier('mails') ||
         (typeof ACCES !== 'undefined' && ACCES && ACCES.role === 'admin');
}
function mlEstAdmin(){ return typeof ACCES !== 'undefined' && ACCES && ACCES.role === 'admin'; }
function mlFilEstOuvert(){ return !!mlFilOuvert; }
/* Un autre fil (de la messagerie) prend la place : on oublie le mail */
function mlOublierLeFil(){ mlFilOuvert = null; mlChoixEleveOuvert = false; }
function mlCompte(){
  if(mlCompteNonLus !== null) return mlCompteNonLus;
  return mlFils.filter(f => !f.regle && f.nonLus > 0).length;
}
/* Le chiffre arrive avec la liste des conversations. S'il bouge, un
   mail est arrivé : la liste se relit (sans toucher au fil ouvert). */
function mlPoserLeCompte(n){
  if(n === undefined || n === null) return;
  const avant = mlCompteNonLus;
  mlCompteNonLus = Number(n) || 0;
  if(avant !== null && avant !== mlCompteNonLus && mlOngletActif()) mlCharger(true);
}
function mlOngletActif(){
  return typeof ongletMsgEC !== 'undefined' && ongletMsgEC === 'mails' &&
         (typeof filtreMessagerie === 'undefined' || !filtreMessagerie);
}

function mlEch(t){ return (typeof echapper === 'function') ? echapper(t) : String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function mlToast(t){ if(typeof showToast === 'function') showToast(t); }
function mlLien(l){
  if(!l) return '';
  if(/^https?:/.test(l)) return l;
  return ((typeof CONFIG !== 'undefined' && CONFIG.WORKER_URL) || '') + l;
}
function mlInitiales(nom, adresse){
  const t = String(nom || '').replace(/[^\p{L}\s'-]/gu, ' ').trim();
  const mots = t.split(/\s+/).filter(Boolean);
  if(mots.length) return (mots[0].charAt(0) + (mots.length > 1 ? mots[mots.length - 1].charAt(0) : '')).toUpperCase();
  return String(adresse || '?').charAt(0).toUpperCase();
}
function mlNomDuFil(f){ return f.nom || f.correspondant || '(sans adresse)'; }
function mlHeure(ms){
  const d = new Date(Number(ms) || 0);
  if(isNaN(d) || !ms) return '';
  const auj = new Date();
  if(d.toDateString() === auj.toDateString()) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const hier = new Date(); hier.setDate(hier.getDate() - 1);
  if(d.toDateString() === hier.toDateString()) return 'hier';
  if((auj - d) / 86400000 < 7) return ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][d.getDay()];
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}
function mlDateHeure(ms){
  const d = new Date(Number(ms) || 0);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() +
         ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function mlJourDe(ms){
  const d = new Date(Number(ms) || 0);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}
function mlPoids(n){
  n = Number(n) || 0;
  if(n < 1024) return n + ' o';
  if(n < 1048576) return Math.round(n / 1024) + ' Ko';
  return (Math.round(n / 104857.6) / 10).toString().replace('.', ',') + ' Mo';
}

/* ------------------------------------------------------------
   LA LISTE
   ------------------------------------------------------------ */
async function mlCharger(silencieux){
  if(mlEnLecture) return mlEnLecture;
  mlEnLecture = (async () => {
    try{
      const d = await appelPrep({ action: 'mailList', vue: mlVue, mots: mlCherche });
      mlFils = (d && d.fils) || [];
      if(d && d.etat) mlEtat = d.etat;
      mlLueLe = Date.now();
      if(mlVue === 'boite') mlCompteNonLus = mlFils.filter(f => !f.regle && f.nonLus > 0).length;
    }catch(e){
      if(!silencieux) mlToast('⚠️ Mails : ' + (e.message || e));
      mlLueLe = Date.now();
    }finally{ mlEnLecture = null; }
    if(mlOngletActif() && typeof dessinerLaListeMessagerie === 'function') dessinerLaListeMessagerie();
  })();
  return mlEnLecture;
}

/* Appelée par dessinerLaListeMessagerie quand l'onglet ✉️ Mails est
   choisi : la zone est vide, on la remplit. */
function mlDessinerLaListe(zone){
  zone.innerHTML = '';
  if(!(typeof dansLeTiroir === 'function' && dansLeTiroir())) zone.appendChild(mlBarreDuHaut());
  if(typeof ckOnglets === 'function') zone.appendChild(ckOnglets());

  if(mlVue !== 'boite'){
    const d = document.createElement('div');
    d.className = 'ckpFiltre';
    const t = document.createElement('span');
    t.textContent = mlVue === 'regles' ? 'Filtré : 🗄️ Mails réglés' : 'Trouvé pour « ' + mlCherche + ' »';
    const x = document.createElement('button');
    x.type = 'button';
    x.textContent = '✕ Retirer';
    x.addEventListener('click', () => { mlVue = 'boite'; mlCherche = ''; mlFils = []; mlLueLe = 0; dessinerLaListeMessagerie(); });
    d.append(t, x);
    zone.appendChild(d);
  }else zone.appendChild(mlEnteteDeLaListe());

  const sc = document.createElement('div');
  sc.className = 'ckpScroll';
  sc.id = 'mlListe';
  zone.appendChild(sc);

  if(!mlLueLe || Date.now() - mlLueLe > 45000){
    if(!mlFils.length) sc.innerHTML = (typeof htmlAttente === 'function') ? htmlAttente('Lecture des mails…') : '<div class="empty">Lecture des mails…</div>';
    mlCharger(true);
    if(!mlFils.length) return;
  }
  if(mlEtat && !mlEtat.configuree){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = '✉️ La boîte de l’école n’est pas encore branchée.<br><span style="font-size:12px;">Il manque les identifiants de la boîte OVH dans le Worker (SMTP_USER, SMTP_PASS).</span>';
    sc.appendChild(v);
    return;
  }
  if(!mlFils.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = mlVue === 'chercher' ? 'Rien trouvé.' : mlVue === 'regles' ? 'Aucun mail réglé.'
      : (mlEtat && !mlEtat.releveLe) ? '🔄 La première relève de la boîte arrive dans quelques minutes.<br><span style="font-size:12px;">Elle reprend les 30 derniers jours.</span>'
      : '🎉 Aucun mail à traiter.';
    sc.appendChild(v);
    return;
  }
  const bloc = (titre, l) => {
    if(!l.length) return;
    if(typeof sousTitreMessagerie === 'function') sc.appendChild(sousTitreMessagerie(titre + ' · ' + l.length));
    l.forEach(f => sc.appendChild(mlLigne(f)));
  };
  if(mlVue !== 'boite'){ bloc(mlVue === 'regles' ? '🗄️ RÉGLÉS' : 'TROUVÉS', mlFils); return; }
  const maintenant = Date.now();
  const rappel = f => f.rappelLe > maintenant && !f.nonLus;
  bloc('⚠️ URGENTS', mlFils.filter(f => f.urgent && !rappel(f)));
  bloc('NON LUS', mlFils.filter(f => !f.urgent && f.nonLus > 0));
  bloc('À TRAITER', mlFils.filter(f => !f.urgent && !f.nonLus && !rappel(f)));
  bloc('⏰ À ME RAPPELER', mlFils.filter(f => !f.urgent && rappel(f)));
}

function mlBarreDuHaut(){
  const l = document.createElement('div');
  l.className = 'ckpLh';
  const boite = document.createElement('label');
  boite.className = 'ckpCherche';
  boite.innerHTML = '<span aria-hidden="true">🔍</span>';
  const ch = document.createElement('input');
  ch.type = 'text';
  ch.id = 'mlCherche';
  ch.placeholder = 'Un nom, une adresse, un mot…';
  ch.value = mlCherche;
  ch.addEventListener('keydown', ev => {
    if(ev.key !== 'Enter') return;
    ev.preventDefault();
    const m = ch.value.trim();
    if(m.length < 2){ mlVue = 'boite'; mlCherche = ''; }
    else { mlVue = 'chercher'; mlCherche = m; }
    mlFils = []; mlLueLe = 0;
    dessinerLaListeMessagerie();
  });
  boite.appendChild(ch);
  l.appendChild(boite);
  if(mlPeutEcrire()){
    const n = document.createElement('button');
    n.type = 'button';
    n.className = 'ckBt p';
    n.textContent = '✏️';
    n.title = 'Nouveau mail';
    n.setAttribute('aria-label', 'Nouveau mail');
    n.addEventListener('click', () => mlOuvrirLEditeur({ mode: 'nouveau' }));
    l.appendChild(n);
  }
  const pts = document.createElement('button');
  pts.type = 'button';
  pts.className = 'ckBt msgListeMenu';
  pts.id = 'mlMenuListe';
  pts.textContent = '⋯';
  pts.title = 'Mails réglés, corbeille, ma signature, réglages…';
  pts.addEventListener('click', ev => { ev.stopPropagation(); mlMenuDeLaListe(pts); });
  l.appendChild(pts);
  return l;
}

function mlMenuDeLaListe(ancre){
  const items = [];
  items.push({ emoji: '🔄', texte: 'Relever la boîte maintenant', cle: 'releve', faire: () => mlRelever() });
  items.push({ emoji: '🗄️', texte: 'Mails réglés', on: mlVue === 'regles', cle: 'regles', faire: () => { mlVue = 'regles'; mlFils = []; mlLueLe = 0; dessinerLaListeMessagerie(); } });
  items.push({ emoji: '🗑️', texte: 'Pubs et newsletters à la corbeille', cle: 'corbeille', faire: () => mlFenetreCorbeille() });
  items.push({ sep: true });
  items.push({ emoji: '✍️', texte: 'Ma signature', cle: 'signature', faire: () => mlFenetreSignature() });
  if(mlEstAdmin()){
    items.push({ emoji: '⚙️', texte: 'Réglages des mails', cle: 'reglages', faire: () => mlFenetreReglages() });
    items.push({ emoji: '⚡', texte: 'Régler les réponses rapides', cle: 'rapides', faire: () => { if(typeof rrFiltre !== 'undefined') rrFiltre = 'mail'; ecranReglagesMessagerie(); } });
  }
  if(typeof menuGestesEC === 'function') menuGestesEC(ancre, '✉️ Mails', items);
}

async function mlRelever(){
  mlToast('🔄 Relève de la boîte…');
  try{
    const r = await appelPrep({ action: 'mailReleve' });
    if(r && r.deja) mlToast('🔄 Une relève est déjà en cours');
    else if(r && r.stats) mlToast('✅ Boîte relevée' + (r.stats.nouveaux ? ' — ' + r.stats.nouveaux + ' nouveau(x)' : ' — rien de neuf'));
  }catch(e){ mlToast('⚠️ ' + (e.message || e)); }
  mlLueLe = 0;
  await mlCharger(true);
}

/* « 🗑️ 14 pubs et newsletters supprimées cette semaine · voir la corbeille »,
   et l'état de la relève — une erreur se DIT, elle ne se tait pas. */
function mlEnteteDeLaListe(){
  const d = document.createElement('div');
  d.className = 'mlEntete';
  const e = mlEtat || {};
  if(e.erreur){
    const x = document.createElement('div');
    x.className = 'mlAlerte';
    x.textContent = '⚠️ La dernière relève n’a pas pu lire la boîte : ' + e.erreur;
    d.appendChild(x);
  }
  const l = document.createElement('div');
  l.className = 'mlPubs';
  const n = Number(e.pubsSemaine || 0);
  l.appendChild(document.createTextNode('🗑️ ' + (e.pubs === false ? 'Pubs gardées dans la boîte (réglage)' :
    n + ' pub' + (n > 1 ? 's' : '') + ' et newsletter' + (n > 1 ? 's' : '') + ' supprimée' + (n > 1 ? 's' : '') + ' cette semaine') + ' · '));
  const v = document.createElement('u');
  v.textContent = 'voir la corbeille';
  v.style.cursor = 'pointer';
  v.addEventListener('click', () => mlFenetreCorbeille());
  l.appendChild(v);
  if(e.releveLe){
    l.appendChild(document.createTextNode(' · relevée à ' + mlHeure(e.releveLe)));
  }
  d.appendChild(l);
  return d;
}

function mlPuce(texte, classe, titre){
  const s = document.createElement('span');
  s.className = 'mlPuce' + (classe ? ' ' + classe : '');
  s.textContent = texte;
  if(titre) s.title = titre;
  return s;
}

function mlLigne(f){
  const d = document.createElement('div');
  const ouvert = !!(mlFilOuvert && mlFilOuvert.fil && mlFilOuvert.fil.id === f.id);
  d.className = 'ckIt mlIt' + (ouvert ? ' on' : '') + (f.nonLus ? ' nlu' : '');
  d.dataset.mail = String(f.id);
  d.title = 'Ouvrir le mail';
  const av = document.createElement('div');
  av.className = 'ckAv' + (f.nonLus ? ' nl' : '');
  av.textContent = mlInitiales(f.nom, f.correspondant);
  const mini = document.createElement('span');
  mini.className = 'ckAvMini';
  mini.textContent = '✉️';
  av.appendChild(mini);
  d.appendChild(av);

  const m = document.createElement('div');
  m.className = 'm';
  const h = document.createElement('div');
  h.className = 'h';
  const q = document.createElement('strong');
  q.textContent = mlNomDuFil(f);
  const t = document.createElement('span');
  t.className = 'mono';
  t.textContent = mlHeure(f.dernierLe);
  h.append(q, t);
  m.appendChild(h);
  const s = document.createElement('div');
  s.className = 'ap mlSujet';
  s.textContent = (f.pj ? '📎 ' : '') + (f.sujet || '(sans objet)');
  m.appendChild(s);
  if(f.apercu){
    const a = document.createElement('div');
    a.className = 'ap mlApercu';
    a.textContent = (f.dernierSens === 'envoye' ? (f.webmail ? '↩️ (webmail) ' : '↩️ ') : '') + f.apercu;
    m.appendChild(a);
  }
  const puces = document.createElement('div');
  puces.className = 'mlPuces';
  if(f.eleve) puces.appendChild(mlPuce('🔗 ' + f.eleve, 'eleve'));
  else if(f.rattache !== 'non' && f.dernierSens === 'recu') puces.appendChild(mlPuce('❓ À rattacher', 'orange', (f.candidats || []).length ? (f.candidats || []).join(' ou ') + ' ?' : ''));
  (f.etiquettes || []).forEach(e => puces.appendChild(mlPuce('🏷️ ' + e)));
  if(f.urgent) puces.appendChild(mlPuce('⚠️ Urgent', 'rouge'));
  if(f.rappelLe > Date.now()) puces.appendChild(mlPuce('⏰ ' + (typeof ckQuandRevient === 'function' ? ckQuandRevient(f.rappelLe) : mlDateHeure(f.rappelLe))));
  if(puces.children.length) m.appendChild(puces);
  d.appendChild(m);
  if(f.nonLus){
    const c = document.createElement('b');
    c.className = 'ckCpt';
    c.textContent = String(f.nonLus);
    d.appendChild(c);
  }
  d.addEventListener('click', () => mlOuvrir(f.id));
  return d;
}

/* ------------------------------------------------------------
   UN FIL
   ------------------------------------------------------------ */
async function mlOuvrir(id){
  /* Le fil de la messagerie qui était ouvert se referme proprement :
     ses veilleurs et son direct s'arrêtent. */
  if(typeof filOuvertEC !== 'undefined' && filOuvertEC){
    try{ if(typeof arreterLaVeilleDuFil === 'function') arreterLaVeilleDuFil(); }catch(e){}
    try{ if(typeof couperLeDirect === 'function') couperLeDirect(); }catch(e){}
    filOuvertEC = null;
  }
  if(typeof ckEcranAPart !== 'undefined') ckEcranAPart = true;
  const autre = !(mlFilOuvert && mlFilOuvert.fil && mlFilOuvert.fil.id === id);
  if(autre) mlChoixEleveOuvert = false;
  const zone = zoneFilMsg();
  if(!zone) return;
  if(autre || !mlFilOuvert){
    zone.innerHTML = (typeof htmlAttente === 'function') ? htmlAttente('Ouverture du mail…') : '<div class="empty">Ouverture du mail…</div>';
  }
  let d;
  try{ d = await appelPrep({ action: 'mailFil', id: id }); }
  catch(e){ zone.innerHTML = '<div class="empty">⚠️ ' + mlEch(e.message || e) + '</div>'; return; }
  mlFilOuvert = d;
  const i = mlFils.findIndex(f => f.id === id);
  if(i !== -1 && d && d.fil){
    if(mlFils[i].nonLus && mlCompteNonLus) mlCompteNonLus = Math.max(0, mlCompteNonLus - 1);
    mlFils[i] = d.fil;
  }
  mlDessinerLeFil();
  if(ckLarge()) dessinerLaListeMessagerie();
}

function mlFermerLeFil(){
  mlFilOuvert = null;
  mlChoixEleveOuvert = false;
  if(typeof ckEcranAPart !== 'undefined') ckEcranAPart = false;
  if(ckLarge()){ if(typeof ckFilVide === 'function') ckFilVide(); dessinerLaListeMessagerie(); }
  else dessinerLaListeMessagerie();
}

async function mlRecharger(){
  if(!mlFilOuvert || !mlFilOuvert.fil) return;
  await mlOuvrir(mlFilOuvert.fil.id);
}

async function mlMarquer(changement, toast){
  const f = mlFilOuvert && mlFilOuvert.fil;
  if(!f) return;
  const r = await appelPrep(Object.assign({ action: 'mailMarquer', id: f.id }, changement));
  if(r && r.fil){
    mlFilOuvert.fil = r.fil;
    const i = mlFils.findIndex(x => x.id === f.id);
    if(i !== -1) mlFils[i] = r.fil;
  }
  if(toast) mlToast(toast);
  if(changement.regle !== undefined && changement.regle){
    mlFils = mlFils.filter(x => x.id !== f.id || mlVue !== 'boite');
    mlFermerLeFil();
    return;
  }
  mlDessinerLeFil();
  if(ckLarge()) dessinerLaListeMessagerie();
}

function mlSousTitre(f){
  const s = document.createElement('div');
  s.className = 's mlS';
  s.appendChild(document.createTextNode('✉️ ' + (f.correspondant || '') + ' · '));
  const span = document.createElement('span');
  if(f.eleve){
    span.className = 'mlLienEleve';
    span.textContent = '🔗 ' + f.eleve + (f.rattache === 'adresse' ? ' (adresse de sa fiche)' : '') + ' · ';
    if(mlPeutEcrire()){
      const u = document.createElement('u');
      u.textContent = 'changer';
      u.style.cursor = 'pointer';
      u.addEventListener('click', () => { mlChoixEleveOuvert = !mlChoixEleveOuvert; mlDessinerLeFil(); });
      span.appendChild(u);
    }
  }else if(f.rattache === 'non'){
    span.textContent = '🚫 Pas un élève';
  }else{
    span.className = 'mlOrange';
    span.textContent = (f.candidats || []).length ? '❓ ' + f.candidats.length + ' élèves à cette adresse' : '❓ Aucun élève à cette adresse';
  }
  s.appendChild(span);
  return s;
}

function mlEnteteDuFil(large){
  const f = mlFilOuvert.fil;
  const tete = document.createElement('div');
  tete.className = 'ckFh' + (large ? '' : ' etroit');
  if(!large) tete.appendChild(ckBouton('←', 'Revenir à la liste', () => mlFermerLeFil(), 'rond'));
  const av = document.createElement('span');
  av.className = 'phRond ckFhAv';
  av.style.cssText = 'width:38px;height:38px;';
  av.textContent = mlInitiales(f.nom, f.correspondant);
  tete.appendChild(av);
  const tt = document.createElement('div');
  tt.className = 'tt';
  const t = document.createElement('div');
  t.className = 't';
  t.textContent = mlNomDuFil(f);
  tt.append(t, mlSousTitre(f));
  tete.appendChild(tt);

  const b = document.createElement('div');
  b.className = 'b';
  if(f.eleve && typeof ouvrirPageEleve === 'function'){
    b.appendChild(ckBouton('📇 Son dossier', 'Ouvrir son dossier', () => ouvrirPageEleve(f.eleve)));
  }else if(mlPeutEcrire() && f.rattache !== 'non'){
    b.appendChild(ckBouton('🔗 Rattacher', 'Rattacher à un élève', () => { mlChoixEleveOuvert = !mlChoixEleveOuvert; mlDessinerLeFil(); }));
  }
  const rap = f.rappelLe > Date.now();
  const extras = [];
  if(large){
    if(mlPeutEcrire()) b.appendChild(ckBouton(f.regle ? '↺ Rouvrir' : '✓ Réglé', f.regle ? 'Le remettre dans les mails à traiter' : 'Réglé : il part dans 🗄️ Mails réglés (un nouveau mail le ramène)',
      () => mlMarquer({ regle: f.regle ? 0 : 1 }, f.regle ? '↺ Remis dans les mails à traiter' : '✓ Réglé — rangé dans 🗄️ Mails réglés'), 'regle'));
    b.appendChild(ckBouton('⏰', rap ? 'Retirer le rappel' : 'Me le rappeler demain 9h', () => mlMarquer({ rappel: rap ? 0 : mlDemain9h() }), 'rond' + (rap ? ' on' : '')));
    if(f.eleve && typeof ckAvecFiche === 'function'){
      const vue = ckAvecFiche() ? !(typeof ckFicheCachee === 'function' && ckFicheCachee()) : false;
      b.appendChild(ckBouton('ⓘ', vue ? 'Cacher la fiche' : 'Sa fiche', () => {
        if(ckAvecFiche()) ckBasculerLaColonneFiche(); else if(typeof ouvrirPageEleve === 'function') ouvrirPageEleve(f.eleve);
        mlDessinerLeFil();
      }, 'rond' + (vue ? ' on' : '')));
    }
  }else{
    if(mlPeutEcrire()) extras.push({ emoji: '✓', texte: f.regle ? 'Le rouvrir' : 'Réglé (il part dans 🗄️ Mails réglés)', faire: () => mlMarquer({ regle: f.regle ? 0 : 1 }) });
    extras.push({ emoji: '⏰', texte: rap ? 'Retirer le rappel' : 'Me le rappeler demain 9h', faire: () => mlMarquer({ rappel: rap ? 0 : mlDemain9h() }) });
  }
  if(mlPeutEcrire()){
    extras.push({ titre: 'ÉTIQUETTES' });
    ((mlEtat && mlEtat.etiquettes) || []).forEach(e => {
      const pris = (f.etiquettes || []).indexOf(e) !== -1;
      extras.push({ emoji: pris ? '☑️' : '🏷️', texte: e, on: pris, cle: 'etiq', faire: () => {
        const l = (f.etiquettes || []).slice();
        const i = l.indexOf(e);
        if(i === -1) l.push(e); else l.splice(i, 1);
        return mlMarquer({ etiquettes: l });
      } });
    });
    if(mlEstAdmin()) extras.push({ emoji: '➕', texte: 'Nouvelle étiquette…', faire: async () => {
      const n = await demander('Le nom de l’étiquette :', '', '🏷️ Nouvelle étiquette');
      if(!n || !n.trim()) return;
      const liste = ((mlEtat && mlEtat.etiquettes) || []).concat([n.trim()]);
      const r = await appelPrep({ action: 'mailReglagesPoser', etiquettes: liste });
      if(r && r.etat) mlEtat = r.etat;
      await mlMarquer({ etiquettes: (f.etiquettes || []).concat([n.trim()]) });
    } });
    extras.push({ sep: true });
    extras.push({ emoji: '⚠️', texte: f.urgent ? 'Plus urgent' : 'Marquer urgent', faire: () => mlMarquer({ urgent: f.urgent ? 0 : 1 }) });
    extras.push({ emoji: '🔗', texte: f.eleve ? 'Changer d’élève' : 'Rattacher à un élève', faire: () => { mlChoixEleveOuvert = true; mlDessinerLeFil(); } });
    if(f.eleve) extras.push({ emoji: '✂️', texte: 'Détacher de ' + f.eleve, faire: () => mlMarquer({ eleve: '' }, 'Détaché') });
    else if(f.rattache !== 'non') extras.push({ emoji: '🚫', texte: 'Pas un élève (ne plus proposer)', faire: () => mlMarquer({ eleve: '' }) });
  }
  extras.push({ emoji: '✉️', texte: 'Marquer comme non lu', faire: async () => { await mlMarquer({ nonLu: 1 }); mlFermerLeFil(); } });

  const boite = document.createElement('div');
  boite.className = 'msgMenuBoite';
  const pts = document.createElement('button');
  pts.type = 'button';
  pts.className = 'ckBt rond msgPts';
  pts.textContent = '⋯';
  pts.title = 'Étiquettes, urgent, élève, non lu…';
  pts.addEventListener('click', ev => { ev.stopPropagation(); menuGestesEC(pts, '✉️ Ce mail', extras); });
  boite.appendChild(pts);
  b.appendChild(boite);
  tete.appendChild(b);
  return tete;
}

function mlDemain9h(){
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
  return d.getTime();
}

/* 🔗 Rattacher : les élèves proposés (même adresse), puis la recherche */
function mlChoixDeLEleve(){
  const f = mlFilOuvert.fil;
  const c = document.createElement('div');
  c.className = 'ckPanneau mlRattacher';
  c.innerHTML = '<div class="l1"><b>🔗 Rattacher ce mail à un élève</b><span class="doux">— il apparaîtra dans son dossier, onglet 💬 Messages</span></div>';
  const pills = document.createElement('div');
  pills.className = 'acts';
  (f.candidats || []).forEach(n => pills.appendChild(ckBouton('👤 ' + n, 'Même adresse que sa fiche', () => mlMarquer({ eleve: n }, '🔗 Rattaché à ' + n))));
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.placeholder = 'Chercher un élève…';
  inp.className = 'mlChampEleve';
  inp.setAttribute('list', 'mlElevesListe');
  const dl = document.createElement('datalist');
  dl.id = 'mlElevesListe';
  ((typeof tousLesElevesConnus === 'function') ? tousLesElevesConnus() : []).forEach(n => { const o = document.createElement('option'); o.value = n; dl.appendChild(o); });
  const ok = ckBouton('🔗 Rattacher', '', () => {
    const n = inp.value.trim();
    const l = (typeof tousLesElevesConnus === 'function') ? tousLesElevesConnus() : [];
    const vrai = l.find(x => x.toLowerCase() === n.toLowerCase()) || n;
    if(!vrai) return;
    return mlMarquer({ eleve: vrai }, '🔗 Rattaché à ' + vrai);
  }, 'p');
  inp.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); ok.click(); } });
  pills.append(inp, dl, ok);
  if(!f.eleve) pills.appendChild(ckBouton('🚫 Pas un élève', 'Ne plus proposer de rattacher ce fil', () => mlMarquer({ eleve: '' })));
  pills.appendChild(ckBouton('✕', 'Fermer', () => { mlChoixEleveOuvert = false; mlDessinerLeFil(); }, 'rond'));
  c.appendChild(pills);
  setTimeout(() => inp.focus(), 50);
  return c;
}

/* Le texte d'un mail : ce qui est neuf, et la citation de l'ancien
   (repliée sous « ··· »). */
function mlCouperLaCitation(texte){
  const l = String(texte || '').replace(/\r/g, '').split('\n');
  for(let i = 0; i < l.length; i++){
    const x = l[i], deux = x + ' ' + (l[i + 1] || '');
    if(/^\s*>/.test(x) && i > 0 ||
       /^\s*(le |on ).{4,200}(a écrit|wrote)\s*:\s*$/i.test(x) ||
       /^\s*(le |on ).{4,200}(a\s+écrit|wrote)\s*:\s*$/i.test(deux) && /écrit|wrote/i.test(l[i + 1] || '') ||
       /^\s*-{2,}\s*(message d.origine|original message|message transféré|forwarded message)/i.test(x) ||
       /^_{10,}\s*$/.test(x) ||
       /^\s*(de|from)\s*:\s*.+/i.test(x) && /^\s*(envoyé|date|sent)\s*:/i.test(l[i + 1] || '') && i > 0){
      return { neuf: l.slice(0, i).join('\n').replace(/\s+$/, ''), cite: l.slice(i).join('\n') };
    }
  }
  return { neuf: String(texte || '').replace(/\s+$/, ''), cite: '' };
}

/* Les liens d'un texte deviennent cliquables (sans HTML venu d'ailleurs) */
function mlTexteAvecLiens(el, texte){
  const re = /(https?:\/\/[^\s<>"')]+)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  let i = 0, m;
  while((m = re.exec(texte))){
    if(m.index > i) el.appendChild(document.createTextNode(texte.slice(i, m.index)));
    const a = document.createElement('a');
    a.href = m[1] ? m[1] : 'mailto:' + m[2];
    a.textContent = m[0];
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    el.appendChild(a);
    i = m.index + m[0].length;
  }
  if(i < texte.length) el.appendChild(document.createTextNode(texte.slice(i)));
}

/* Le HTML d'origine, dans un cadre fermé : aucun script n'y tourne,
   les liens s'ouvrent dans un nouvel onglet. */
function mlCadreHtml(html){
  const fr = document.createElement('iframe');
  fr.className = 'mlCadre';
  fr.setAttribute('sandbox', 'allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  fr.setAttribute('referrerpolicy', 'no-referrer');
  const propre = String(html || '').replace(/(src|href)=(["'])\/parcours\//g, '$1=$2' + mlLien('/parcours/'));
  fr.srcdoc = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src https: data: cid:; style-src \'unsafe-inline\'; font-src https: data:">' +
    '<base target="_blank"><style>body{margin:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#16180F;background:#fff;word-wrap:break-word;}img{max-width:100%;height:auto;}</style></head><body>' +
    propre + '</body></html>';
  fr.addEventListener('load', () => {
    try{ fr.style.height = Math.min(1600, fr.contentDocument.documentElement.scrollHeight + 4) + 'px'; }catch(e){ fr.style.height = '420px'; }
  });
  return fr;
}

function mlBulle(m, f){
  const moi = m.sens === 'envoye';
  const rang = document.createElement('div');
  rang.className = 'msgRang fin' + (moi ? ' moi' : '');
  if(!moi){
    const slot = document.createElement('span');
    slot.className = 'msgAvSlot';
    const r = document.createElement('span');
    r.className = 'phRond msgAv';
    r.textContent = mlInitiales(m.deNom, m.de);
    slot.appendChild(r);
    rang.appendChild(slot);
  }
  const b = document.createElement('div');
  b.className = 'msgB pointe mlBulle ' + (moi ? 'moi' : 'lui');
  b.dataset.mailMsg = String(m.id);
  const sig = document.createElement('span');
  sig.className = 'sig';
  const qui = moi ? (m.source === 'webmail' ? '✉️ réponse envoyée depuis le webmail' : (m.par || 'Le bureau'))
                  : (m.deNom || m.de);
  const a = moi ? (m.a || []).concat(m.cc || []).map(x => x.nom || x.adresse) : [];
  sig.textContent = qui + ' · ✉️ ' + (m.sujet || '(sans objet)') + (moi && a.length ? ' → ' + a.slice(0, 3).join(', ') + (a.length > 3 ? '…' : '') : '');
  b.appendChild(sig);

  const corps = mlCouperLaCitation(m.texte);
  const t = document.createElement('div');
  t.className = 'mlTexte';
  mlTexteAvecLiens(t, corps.neuf || (corps.cite ? '' : '(mail sans texte)'));
  b.appendChild(t);
  if(corps.cite){
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'mlPlus';
    plus.textContent = '··· le message cité';
    const c = document.createElement('div');
    c.className = 'mlTexte mlCite';
    c.hidden = true;
    mlTexteAvecLiens(c, corps.cite);
    plus.addEventListener('click', () => { c.hidden = !c.hidden; plus.textContent = c.hidden ? '··· le message cité' : '▴ replier le message cité'; });
    b.append(plus, c);
  }
  if(m.html){
    const bh = document.createElement('button');
    bh.type = 'button';
    bh.className = 'mlPlus';
    bh.textContent = '🖼️ Voir le mail tel qu’il a été mis en forme';
    let cadre = null;
    bh.addEventListener('click', () => {
      if(cadre){ cadre.remove(); cadre = null; bh.textContent = '🖼️ Voir le mail tel qu’il a été mis en forme'; return; }
      cadre = mlCadreHtml(m.html);
      bh.after(cadre);
      bh.textContent = '▴ Revenir au texte seul';
    });
    b.appendChild(bh);
  }
  if((m.pieces || []).length){
    const pj = document.createElement('div');
    pj.className = 'mlPieces';
    m.pieces.forEach(p => {
      const l = document.createElement('a');
      l.className = 'mlPiece';
      l.href = mlLien(p.lien);
      l.target = '_blank';
      l.rel = 'noopener';
      l.textContent = '📎 ' + p.nom + ' · ' + mlPoids(p.taille);
      pj.appendChild(l);
    });
    b.appendChild(pj);
  }
  const h = document.createElement('span');
  h.className = 'h';
  h.textContent = mlHeure(m.quand);
  h.title = mlDateHeure(m.quand);
  b.appendChild(h);
  rang.appendChild(b);
  return rang;
}

/* ⚡ Les réponses rapides des mails : un appui ouvre l'éditeur */
function mlReponsesRapides(){
  if(typeof reponsesRapides !== 'function') return [];
  return reponsesRapides().filter(x => (x.genres || []).indexOf('mail') !== -1 && x.sorte !== 'creneau');
}
function mlVites(){
  const f = mlFilOuvert.fil;
  const v = document.createElement('div');
  v.className = 'ckVites mlVites';
  const eclair = document.createElement('button');
  eclair.type = 'button';
  eclair.className = 'ckVite ckViteEclair';
  eclair.textContent = '⚡';
  eclair.title = 'Toutes les réponses rapides des mails';
  eclair.addEventListener('click', ev => {
    ev.stopPropagation();
    const items = [{ titre: 'RÉPONSES RAPIDES DES MAILS' }];
    mlReponsesRapides().forEach(x => items.push({ emoji: '⚡', texte: x.bouton, faire: () => mlRepondreAvec(x) }));
    items.push({ sep: true });
    items.push({ emoji: '📄', texte: 'Ce qu’on écrit et envoie', faire: () => mlCarnet() });
    if(mlEstAdmin()) items.push({ emoji: '⚙️', texte: 'Régler les réponses rapides', faire: () => { if(typeof rrFiltre !== 'undefined') rrFiltre = 'mail'; ecranReglagesMessagerie(); } });
    menuGestesEC(eclair, '⚡ Réponses rapides', items);
  });
  v.appendChild(eclair);
  if(typeof reponsesRapidesLues !== 'undefined' && !reponsesRapidesLues && typeof chargerReponsesRapides === 'function'){
    chargerReponsesRapides().then(change => { if(change && mlFilOuvert) mlDessinerLeFil(); });
  }
  if(mlPeutEcrire()){
    mlReponsesRapides().forEach(x => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ckVite';
      b.textContent = x.bouton;
      b.addEventListener('click', () => mlRepondreAvec(x));
      v.appendChild(b);
    });
    const bm = document.createElement('button');
    bm.type = 'button';
    bm.className = 'ckVite ckViteModeles';
    bm.textContent = '📄 Ce qu’on écrit et envoie';
    bm.addEventListener('click', () => mlCarnet());
    v.appendChild(bm);
  }
  return v;
}

/* « 📄 Ce qu'on écrit et envoie » : la fiche choisie part dans l'éditeur */
function mlCarnet(){
  if(typeof panneauDesModeles !== 'function') return;
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(520px, 94vw)';
  boite.innerHTML = '<h3>📄 Ce qu’on écrit et envoie</h3>';
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  if(typeof ckModelesCategorie !== 'undefined') ckModelesCategorie = '';
  boite.appendChild(panneauDesModeles(texte => { fermer(); mlRepondreAvec({ message: texte }); }, fermer));
  fond.appendChild(boite);
  document.body.appendChild(fond);
}

/* Les mots qui se remplacent, pour un mail : l'élève s'il y en a un,
   sinon le prénom du correspondant. Échappés : ils vont dans du HTML. */
function mlValeursDesMots(f){
  const prenom = String((f && f.nom) || '').trim().split(/\s+/)[0] || '';
  const c = (f && f.eleve) ? { eleve: f.eleve, genre: 'mail' } : { eleve: '', genre: 'vitrine', vitrine: { prenom: prenom }, titre: (f && f.nom) || '' };
  const v = (typeof valeursDesMotsRapides === 'function') ? valeursDesMotsRapides(c) : { prenom: prenom, nom: (f && f.nom) || '' };
  if(!(f && f.eleve)) v.bureau = 'le bureau';
  return v;
}
function mlRemplirLesMots(texte, f, html){
  const v = mlValeursDesMots(f);
  const e = {};
  Object.keys(v).forEach(k => { e[k] = html ? mlEch(v[k]) : v[k]; });
  return (typeof remplirLesMotsRapides === 'function') ? remplirLesMotsRapides(texte, null, e) : texte;
}
/* Les liens signés rendus par le Worker sont des chemins : sur la page
   (servie ailleurs), ils pointent vers lui. */
function mlLiensAbsolus(h){
  return String(h || '').replace(/(src|href)=(["'])\/parcours\//g, '$1=$2' + mlLien('/parcours/'));
}
function mlTexteEnHtml(t){
  return String(t || '').split('\n').map(l => '<div>' + (l.trim() ? mlEch(l) : '<br>') + '</div>').join('');
}
function mlRepondreAvec(x){
  const f = mlFilOuvert && mlFilOuvert.fil;
  const html = x.html ? mlLiensAbsolus(mlRemplirLesMots(x.html, f, true)) : mlTexteEnHtml(mlRemplirLesMots(x.message || '', f, false));
  mlOuvrirLEditeur({ mode: f ? 'repondre' : 'nouveau', texteHtml: html, pieces: (x.pj || []).slice() });
}

function mlDessinerLeFil(){
  if(!mlFilOuvert || !mlFilOuvert.fil) return;
  const large = ckLarge();
  const zone = zoneFilMsg();
  if(!zone) return;
  if(typeof ckEcranAPart !== 'undefined') ckEcranAPart = true;
  zone.setAttribute('data-fil', 'mail-' + mlFilOuvert.fil.id);
  zone.innerHTML = '';
  if(!large) zone.scrollTop = 0;
  zone.classList.toggle('msgEtroit', !large);
  zone.appendChild(mlEnteteDuFil(large));
  if(mlChoixEleveOuvert && mlPeutEcrire()) zone.appendChild(mlChoixDeLEleve());

  const fil = document.createElement('div');
  fil.className = 'msgFil mlFil';
  fil.id = 'mlFilMsgs';
  let jourPose = '';
  (mlFilOuvert.messages || []).forEach(m => {
    const jour = mlJourDe(m.quand);
    if(jour !== jourPose){
      jourPose = jour;
      const j = document.createElement('div');
      j.className = 'msgJour';
      j.innerHTML = '<span></span>';
      j.firstChild.textContent = (typeof jourLisibleMessagerie === 'function') ? jourLisibleMessagerie(jour) : jour;
      fil.appendChild(j);
    }
    fil.appendChild(mlBulle(m, mlFilOuvert.fil));
  });
  zone.appendChild(fil);
  if(mlPeutEcrire()){
    zone.appendChild(mlVites());
    const barre = document.createElement('div');
    barre.className = 'mlBarre';
    const rep = (t, mode, p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (p ? 'btn-primary' : 'btn-secondary');
      b.dataset.mode = mode;
      b.textContent = t;
      b.addEventListener('click', () => mlOuvrirLEditeur({ mode: mode }));
      return b;
    };
    barre.append(rep('↩️ Répondre', 'repondre', true), rep('↩️ Répondre à tous', 'tous'), rep('↪️ Transférer', 'transfert'));
    zone.appendChild(barre);
  }
  /* ⓘ la fiche de l'élève à droite, comme pour un fil de la messagerie */
  const ctx = $('ckpCtx');
  if(ctx){
    ctx.innerHTML = '';
    const f = mlFilOuvert.fil;
    if(large && f.eleve && typeof ckBlocEleve === 'function'){
      const h = document.createElement('div');
      h.className = 'ckpSect';
      h.textContent = 'SA FICHE';
      ctx.appendChild(h);
      try{ ctx.appendChild(ckBlocEleve(f.eleve)); }catch(e){}
      if(typeof ouvrirPageEleve === 'function'){
        const acts = document.createElement('div');
        acts.className = 'ckFicheActs';
        acts.appendChild(ckBouton('👤 Ouvrir son dossier', 'Le dossier complet de l’élève', () => ouvrirPageEleve(f.eleve)));
        ctx.appendChild(acts);
      }
    }
  }
  setTimeout(() => { fil.scrollTop = fil.scrollHeight; }, 0);
}

/* ------------------------------------------------------------
   ✏️ L'ÉDITEUR — « comme une vraie boîte mail »
   ------------------------------------------------------------ */
const ML_COULEURS = ['#16180F', '#C33A12', '#E8590C', '#A86A00', '#3B6900', '#0E7C86', '#1F4E9C', '#6B3FA0', '#64655F'];
const ML_SURLIGNE = ['#FFF3A3', '#D7F7A8', '#C6F0F2', '#FFD9C7', '#E8D9FF', 'transparent'];
const ML_EMOJIS = ['🙂', '😊', '👍', '🙏', '👋', '✅', '📅', '📞', '🚗', '🎉', '⚠️', '📄', '💶', '⏰', '📍', '❤️'];

/* La barre de mise en forme et la zone d'écriture, pour l'éditeur, la
   signature et les réponses rapides. options : { outils, surChange, surFichier } */
function mlZoneDEcriture(options){
  const o = options || {};
  const cadre = document.createElement('div');
  cadre.className = 'mlEdCadre';
  const barre = document.createElement('div');
  barre.className = 'mlOutils';
  const zone = document.createElement('div');
  zone.className = 'mlZone';
  zone.contentEditable = 'true';
  zone.spellcheck = true;
  zone.setAttribute('role', 'textbox');
  zone.setAttribute('aria-multiline', 'true');
  let selection = null;
  const garder = () => { const s = window.getSelection(); if(s && s.rangeCount && zone.contains(s.anchorNode)) selection = s.getRangeAt(0).cloneRange(); };
  const remettre = () => { zone.focus(); if(selection){ const s = window.getSelection(); s.removeAllRanges(); s.addRange(selection); } };
  zone.addEventListener('keyup', garder);
  zone.addEventListener('mouseup', garder);
  zone.addEventListener('input', () => { garder(); if(o.surChange) o.surChange(); });
  const faire = (cmd, val) => {
    remettre();
    try{ document.execCommand('styleWithCSS', false, cmd === 'foreColor' || cmd === 'hiliteColor'); }catch(e){}
    document.execCommand(cmd, false, val === undefined ? null : val);
    garder();
    if(o.surChange) o.surChange();
  };
  const bt = (html, titre, f) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mlOutil';
    b.innerHTML = html;
    b.title = titre;
    b.setAttribute('aria-label', titre);
    b.addEventListener('mousedown', ev => ev.preventDefault());
    b.addEventListener('click', ev => { ev.preventDefault(); f(b); });
    barre.appendChild(b);
    return b;
  };
  const sep = () => { const s = document.createElement('span'); s.className = 'mlSep'; barre.appendChild(s); };
  const choix = (ancre, titre, items) => menuGestesEC(ancre, titre, items);
  const outils = o.outils || 'tout';
  bt('<b>G</b>', 'Gras', () => faire('bold'));
  bt('<i>I</i>', 'Italique', () => faire('italic'));
  bt('<u>S</u>', 'Souligné', () => faire('underline'));
  if(outils === 'tout') bt('<s>B</s>', 'Barré', () => faire('strikeThrough'));
  sep();
  bt('Aa ▾', 'Taille', b => choix(b, 'Taille', [['Petit', 2], ['Normal', 3], ['Grand', 5], ['Très grand', 6]].map(([t, v]) => ({ emoji: 'Aa', texte: t, faire: () => faire('fontSize', v) }))));
  bt('<span style="border-bottom:3px solid #E8590C;">A</span> ▾', 'Couleur du texte', b => choix(b, 'Couleur du texte', ML_COULEURS.map(c => ({ emoji: '●', texte: c, faire: () => faire('foreColor', c) }))));
  bt('🖍️ ▾', 'Surligner', b => choix(b, 'Surligner', ML_SURLIGNE.map(c => ({ emoji: c === 'transparent' ? '✕' : '▮', texte: c === 'transparent' ? 'Sans surlignage' : c, faire: () => faire('hiliteColor', c) }))));
  sep();
  bt('• ≡', 'Liste à puces', () => faire('insertUnorderedList'));
  bt('1. ≡', 'Liste numérotée', () => faire('insertOrderedList'));
  if(outils === 'tout') bt('⇤ ≡', 'Aligner', b => choix(b, 'Aligner', [['À gauche', 'justifyLeft'], ['Au centre', 'justifyCenter'], ['À droite', 'justifyRight']].map(([t, c]) => ({ emoji: '≡', texte: t, faire: () => faire(c) }))));
  sep();
  bt('🔗', 'Lien', async () => {
    garder();
    const u = await demander('L’adresse du lien (https://…) :', 'https://', '🔗 Lien');
    if(!u || !/^(https?:\/\/|mailto:)/i.test(u.trim())) return;
    faire('createLink', u.trim());
  });
  if(o.surFichier){
    bt('🖼️', 'Image', () => o.surFichier('image', (piece) => {
      remettre();
      document.execCommand('insertHTML', false, '<img src="' + mlEch(mlLien(piece.lien)) + '" data-ec-cle="' + mlEch(piece.cle) + '" alt="" style="max-width:100%;">');
      if(o.surChange) o.surChange();
    }));
    bt('📎', 'Pièce jointe', () => o.surFichier('piece'));
  }
  bt('😊', 'Émoticône', b => choix(b, 'Émoticône', ML_EMOJIS.map(e => ({ emoji: e, texte: '', faire: () => faire('insertText', e) }))));
  if(outils === 'tout'){
    sep();
    bt('↶', 'Annuler', () => faire('undo'));
    bt('↷', 'Rétablir', () => faire('redo'));
    bt('🧹', 'Effacer la mise en forme', () => faire('removeFormat'));
  }
  cadre.append(barre, zone);
  /* Une image collée (capture d'écran) part en pièce, pas en données
     dans le texte : un mail de 5 Mo de texte, c'est un mail refusé. */
  zone.addEventListener('paste', ev => {
    const f = ev.clipboardData && Array.from(ev.clipboardData.files || []).find(x => /^image\//.test(x.type));
    if(f && o.surFichier){
      ev.preventDefault();
      o.surFichier('image', (piece) => {
        remettre();
        document.execCommand('insertHTML', false, '<img src="' + mlEch(mlLien(piece.lien)) + '" data-ec-cle="' + mlEch(piece.cle) + '" alt="" style="max-width:100%;">');
        if(o.surChange) o.surChange();
      }, f);
    }
  });
  return { cadre, barre, zone, outil: bt, sep, faire, remettre };
}

/* Un fichier choisi → déposé (mailPiece) → { cle, nom, type, taille, lien } */
async function mlDeposerUnFichier(fichier){
  if(fichier.size > 10 * 1048576) throw new Error('« ' + fichier.name + ' » pèse plus de 10 Mo.');
  const data = await blobEnBase64EC(fichier);
  const r = await appelPrep({ action: 'mailPiece', nom: fichier.name || 'fichier', type: fichier.type || 'application/octet-stream',
                              contenu: String(data).replace(/^data:[^,]*,/, '') });
  if(!r || !r.piece) throw new Error((r && r.message) || 'dépôt refusé');
  return r.piece;
}
function mlChoisirUnFichier(image){
  return new Promise(res => {
    const i = document.createElement('input');
    i.type = 'file';
    if(image) i.accept = 'image/*';
    else i.multiple = true;
    i.addEventListener('change', () => res(Array.from(i.files || [])));
    i.click();
  });
}

async function mlLireLesSignatures(){
  if(mlSignaturesLues) return mlSignaturesLues;
  try{
    const r = await appelPrep({ action: 'mailSignatures' });
    mlSignaturesLues = (r && r.signatures) || [];
  }catch(e){ mlSignaturesLues = []; }
  return mlSignaturesLues;
}
function mlMaCle(){
  const n = String((typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || '');
  return n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function mlHtmlDeLaSignature(s){
  if(!s) return '';
  return '<div class="mlSignature" data-sig="' + mlEch(s.qui) + '">' + (s.html || '') +
    (s.image ? '<div><img src="' + mlEch(mlLien(s.lien)) + '" data-ec-cle="' + mlEch(s.image) + '" alt="" style="max-width:260px;height:auto;"></div>' : '') + '</div>';
}

/* La citation du mail auquel on répond, comme le fait une boîte mail */
function mlCitationDe(m){
  if(!m) return '';
  const d = new Date(m.quand);
  const jour = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const h = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const qui = m.sens === 'envoye' ? 'Évolution Conduites' : (m.deNom || m.de);
  return '<div class="mlCitation"><div style="color:#64655F;font-size:13px;">Le ' + mlEch(jour) + ' à ' + h + ', ' + mlEch(qui) +
    (m.de ? ' &lt;' + mlEch(m.de) + '&gt;' : '') + ' a écrit :</div>' +
    '<blockquote style="margin:4px 0 0;padding:0 0 0 10px;border-left:3px solid #DCDCD3;color:#64655F;">' +
    mlTexteEnHtml(String(m.texte || '').slice(0, 20000)) + '</blockquote></div>';
}
function mlTransfertDe(m){
  if(!m) return '';
  const a = (m.a || []).map(x => x.nom ? x.nom + ' <' + x.adresse + '>' : x.adresse).join(', ');
  return '<div class="mlCitation"><div style="color:#64655F;font-size:13px;">---------- Message transféré ----------<br>De : ' +
    mlEch((m.deNom ? m.deNom + ' ' : '') + '<' + m.de + '>') + '<br>Date : ' + mlEch(mlDateHeure(m.quand)) +
    '<br>Objet : ' + mlEch(m.sujet || '') + (a ? '<br>À : ' + mlEch(a) : '') + '</div><br>' +
    mlTexteEnHtml(String(m.texte || '').slice(0, 20000)) + '</div>';
}

function mlSujetDe(sujet, mode){
  const s = String(sujet || '').trim();
  if(mode === 'transfert') return /^(tr|fwd?)\s*:/i.test(s) ? s : 'TR: ' + s;
  return /^re\s*:/i.test(s) ? s : 'Re: ' + s;
}

/* Les champs À / Cc / Cci : des pastilles, et un champ pour en taper d'autres */
function mlChampAdresses(liste, surChange){
  const z = document.createElement('div');
  z.className = 'mlAdresses';
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'mlAdresseSaisie';
  inp.placeholder = liste.length ? '' : 'adresse@exemple.fr';
  const dessiner = () => {
    Array.from(z.querySelectorAll('.mlAdr')).forEach(x => x.remove());
    liste.forEach((x, i) => {
      const p = document.createElement('span');
      p.className = 'mlAdr';
      const tx = document.createElement('span');
      tx.className = 'mlAdrT';
      tx.textContent = x.nom ? x.nom + ' <' + x.adresse + '>' : x.adresse;
      tx.title = x.adresse;
      p.appendChild(tx);
      const b = document.createElement('b');
      b.textContent = '×';
      b.title = 'Retirer';
      b.addEventListener('click', () => { liste.splice(i, 1); dessiner(); if(surChange) surChange(); });
      p.appendChild(b);
      z.insertBefore(p, inp);
    });
    inp.placeholder = liste.length ? '' : 'adresse@exemple.fr';
  };
  const prendre = () => {
    const brut = inp.value.trim();
    if(!brut) return true;
    let pris = false;
    brut.split(/[,;\s]+/).forEach(a => {
      const m = a.replace(/^<|>$/g, '').toLowerCase();
      if(/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(m) && !liste.some(y => y.adresse === m)){ liste.push({ nom: '', adresse: m }); pris = true; }
    });
    if(pris){ inp.value = ''; dessiner(); if(surChange) surChange(); }
    return pris;
  };
  inp.addEventListener('keydown', ev => {
    if(ev.key === 'Enter' || ev.key === ',' || ev.key === ';'){ ev.preventDefault(); prendre(); }
    if(ev.key === 'Backspace' && !inp.value && liste.length){ liste.pop(); dessiner(); if(surChange) surChange(); }
  });
  inp.addEventListener('blur', prendre);
  z.addEventListener('click', ev => { if(ev.target === z) inp.focus(); });
  z.appendChild(inp);
  dessiner();
  z.prendre = prendre;
  return z;
}

let mlEditeurOuvert = null;

/* opts : { mode: 'nouveau' | 'repondre' | 'tous' | 'transfert', texteHtml, pieces } */
async function mlOuvrirLEditeur(opts){
  const o = opts || {};
  if(mlEditeurOuvert){ mlEditeurOuvert.devant(); return; }
  const f = (o.mode !== 'nouveau' && mlFilOuvert) ? mlFilOuvert.fil : null;
  const msgs = (f && mlFilOuvert.messages) || [];
  const recus = msgs.filter(m => m.sens === 'recu');
  const base = o.mode === 'transfert' ? msgs[msgs.length - 1] : (recus[recus.length - 1] || msgs[msgs.length - 1] || null);
  const ecole = String((mlEtat && mlEtat.adresse) || (mlFilOuvert && mlFilOuvert.adresseEcole) || '').toLowerCase();
  const cle = o.mode === 'nouveau' ? 'nouveau' : o.mode === 'transfert' ? 'transfert:' + (base ? base.id : 0) : 'fil:' + (f ? f.id : 0);

  const etat = { a: [], cc: [], cci: [], sujet: '', pieces: (o.pieces || []).slice(), signature: mlMaCle(), mode: o.mode || 'nouveau' };
  if(f && base && o.mode !== 'transfert'){
    if(base.sens === 'recu') etat.a.push({ nom: base.deNom || '', adresse: base.de });
    else (base.a || []).forEach(x => etat.a.push(x));
    if(!etat.a.length && f.correspondant) etat.a.push({ nom: f.nom || '', adresse: f.correspondant });
    if(o.mode === 'tous'){
      (base.a || []).concat(base.cc || []).forEach(x => {
        if(x.adresse !== ecole && !etat.a.some(y => y.adresse === x.adresse) && !etat.cc.some(y => y.adresse === x.adresse)) etat.cc.push(x);
      });
    }
    etat.sujet = mlSujetDe(base.sujet || f.sujet, 'repondre');
  }else if(f && base && o.mode === 'transfert'){
    etat.sujet = mlSujetDe(base.sujet || f.sujet, 'transfert');
    (base.pieces || []).forEach(p => etat.pieces.push({ cle: p.cle, nom: p.nom, type: p.type, taille: p.taille }));
  }

  const signatures = await mlLireLesSignatures();
  let brouillon = null;
  try{ const r = await appelPrep({ action: 'mailBrouillon', cle: cle }); brouillon = r && r.contenu; }catch(e){}

  const fond = document.createElement('div');
  fond.className = 'overlay show mlEdFond';
  const boite = document.createElement('div');
  boite.className = 'modal mlEditeur';
  fond.appendChild(boite);
  const tete = document.createElement('div');
  tete.className = 'mlEdTete';
  const titre = document.createElement('b');
  titre.textContent = ({ nouveau: '✉️ Nouveau mail', repondre: '✉️ Répondre', tous: '✉️ Répondre à tous', transfert: '↪️ Transférer' })[etat.mode];
  tete.appendChild(titre);
  const bPlein = document.createElement('button');
  bPlein.type = 'button'; bPlein.className = 'mlOutil'; bPlein.textContent = '⤢'; bPlein.title = 'Plein écran';
  bPlein.addEventListener('click', () => boite.classList.toggle('plein'));
  const bFermer = document.createElement('button');
  bFermer.type = 'button'; bFermer.className = 'mlOutil'; bFermer.textContent = '✕'; bFermer.title = 'Fermer — le brouillon est gardé';
  tete.append(bPlein, bFermer);
  boite.appendChild(tete);

  const champs = document.createElement('div');
  champs.className = 'mlChamps';
  const ligne = (lab, el, plus) => {
    const l = document.createElement('div');
    l.className = 'mlChamp';
    const s = document.createElement('span');
    s.className = 'mlLab';
    s.textContent = lab;
    const v = document.createElement('div');
    v.className = 'mlVal';
    v.appendChild(el);
    l.append(s, v);
    if(plus) l.appendChild(plus);
    champs.appendChild(l);
    return l;
  };
  const de = document.createElement('span');
  de.textContent = ecole ? 'L’adresse de l’école (' + ecole + ')' : 'L’adresse de l’école (OVH)';
  ligne('De', de);
  let changeAPoser = () => {};
  const surChange = () => changeAPoser();
  if(brouillon){
    ['a', 'cc', 'cci'].forEach(k => { if(Array.isArray(brouillon[k])) etat[k] = brouillon[k]; });
    if(brouillon.sujet !== undefined) etat.sujet = brouillon.sujet;
    if(Array.isArray(brouillon.pieces)) etat.pieces = brouillon.pieces;
    if(brouillon.signature !== undefined) etat.signature = brouillon.signature;
  }
  const champA = mlChampAdresses(etat.a, surChange);
  const ccLien = document.createElement('button');
  ccLien.type = 'button';
  ccLien.className = 'mlCcLien';
  ccLien.textContent = 'Cc · Cci';
  ligne('À', champA, ccLien);
  const champCc = mlChampAdresses(etat.cc, surChange), champCci = mlChampAdresses(etat.cci, surChange);
  const lCc = ligne('Cc', champCc), lCci = ligne('Cci', champCci);
  lCc.hidden = !etat.cc.length; lCci.hidden = !etat.cci.length;
  ccLien.addEventListener('click', () => { lCc.hidden = false; lCci.hidden = false; ccLien.hidden = true; champCc.querySelector('input').focus(); });
  if(etat.cc.length || etat.cci.length) ccLien.hidden = true;
  const sujet = document.createElement('input');
  sujet.type = 'text';
  sujet.className = 'mlSujetChamp';
  sujet.value = etat.sujet;
  sujet.placeholder = 'L’objet du mail';
  sujet.addEventListener('input', surChange);
  ligne('Objet', sujet);
  boite.appendChild(champs);

  /* Les pièces jointes */
  const pjZone = document.createElement('div');
  pjZone.className = 'mlPjZone';
  const dessinerPj = () => {
    pjZone.innerHTML = '';
    etat.pieces.forEach((p, i) => {
      const s = document.createElement('span');
      s.className = 'mlAdr mlPj';
      s.textContent = '📎 ' + p.nom + ' · ' + mlPoids(p.taille);
      const b = document.createElement('b');
      b.textContent = '×';
      b.title = 'Retirer';
      b.addEventListener('click', () => { etat.pieces.splice(i, 1); dessinerPj(); surChange(); });
      s.appendChild(b);
      pjZone.appendChild(s);
    });
    pjZone.hidden = !etat.pieces.length;
  };
  const deposer = async (sorte, poser, fichierDonne) => {
    const fichiers = fichierDonne ? [fichierDonne] : await mlChoisirUnFichier(sorte === 'image');
    for(const fi of fichiers){
      try{
        mlToast('📤 « ' + fi.name + ' »…');
        const p = await mlDeposerUnFichier(fi);
        if(sorte === 'image' && poser) poser(p);
        else { etat.pieces.push({ cle: p.cle, nom: p.nom, type: p.type, taille: p.taille }); dessinerPj(); surChange(); }
      }catch(e){ mlToast('⚠️ ' + (e.message || e)); }
    }
  };
  const ed = mlZoneDEcriture({ surChange: surChange, surFichier: deposer });
  /* ⚡ ▾ : une réponse rapide se pose là où est le curseur */
  ed.sep();
  ed.outil('⚡ ▾', 'Réponses rapides', b => {
    const items = mlReponsesRapides().map(x => ({ emoji: '⚡', texte: x.bouton, faire: () => {
      ed.remettre();
      const h = x.html ? mlLiensAbsolus(mlRemplirLesMots(x.html, f, true)) : mlTexteEnHtml(mlRemplirLesMots(x.message || '', f, false));
      document.execCommand('insertHTML', false, h);
      (x.pj || []).forEach(p => { if(!etat.pieces.some(y => y.cle === p.cle)) etat.pieces.push(Object.assign({}, p)); });
      dessinerPj(); surChange();
    } }));
    if(!items.length) items.push({ emoji: '⚙️', texte: 'Aucune réponse rapide pour les mails', faire: () => {} });
    menuGestesEC(b, '⚡ Réponses rapides', items);
  });
  boite.appendChild(ed.cadre);
  boite.appendChild(pjZone);

  /* Le corps : le brouillon, ou le texte de départ + la signature + la citation */
  const sigDe = q => signatures.find(s => s.qui === q) || null;
  if(brouillon && brouillon.html !== undefined) ed.zone.innerHTML = brouillon.html;
  else{
    const cit = (base && f) ? (etat.mode === 'transfert' ? mlTransfertDe(base) : mlCitationDe(base)) : '';
    ed.zone.innerHTML = (o.texteHtml || '<div><br></div>') + '<div><br></div>' + mlHtmlDeLaSignature(sigDe(etat.signature)) + (cit ? '<div><br></div>' + cit : '');
  }
  dessinerPj();

  /* Le pied : signature, brouillon, 🗑️, 📤 */
  const pied = document.createElement('div');
  pied.className = 'mlEdPied';
  const ls = document.createElement('label');
  ls.className = 'mlSigChoix';
  ls.textContent = '✍️ Signature ';
  const sel = document.createElement('select');
  const ajouterOption = (v, t) => { const op = document.createElement('option'); op.value = v; op.textContent = t; sel.appendChild(op); };
  signatures.forEach(s => ajouterOption(s.qui, s.nom || s.qui));
  if(!signatures.some(s => s.qui === mlMaCle())) ajouterOption('__regler', '✍️ Régler la mienne…');
  ajouterOption('', 'Aucune');
  sel.value = signatures.some(s => s.qui === etat.signature) ? etat.signature : '';
  sel.addEventListener('change', () => {
    if(sel.value === '__regler'){ sel.value = etat.signature || ''; mlFenetreSignature(); return; }
    etat.signature = sel.value;
    const ancienne = ed.zone.querySelector('.mlSignature');
    const neuve = mlHtmlDeLaSignature(sigDe(etat.signature));
    if(ancienne){
      if(neuve) ancienne.outerHTML = neuve; else ancienne.remove();
    }else if(neuve){
      const cit = ed.zone.querySelector('.mlCitation');
      if(cit) cit.insertAdjacentHTML('beforebegin', neuve + '<div><br></div>');
      else ed.zone.insertAdjacentHTML('beforeend', neuve);
    }
    surChange();
  });
  ls.appendChild(sel);
  const garde = document.createElement('span');
  garde.className = 'mlGarde';
  if(brouillon) garde.textContent = '📝 Brouillon repris';
  const bJeter = document.createElement('button');
  bJeter.type = 'button';
  bJeter.className = 'btn btn-secondary mlJeter';
  bJeter.textContent = '🗑️';
  bJeter.title = 'Jeter ce brouillon';
  const bEnvoyer = document.createElement('button');
  bEnvoyer.type = 'button';
  bEnvoyer.className = 'btn btn-primary mlEnvoyer';
  bEnvoyer.textContent = '📤 Envoyer';
  pied.append(ls, garde, bJeter, bEnvoyer);
  boite.appendChild(pied);

  /* 💾 le brouillon, une seconde et demie après la dernière frappe */
  let minuterie = null, sale = false;
  const contenu = () => ({ a: etat.a, cc: etat.cc, cci: etat.cci, sujet: sujet.value, html: ed.zone.innerHTML,
                           pieces: etat.pieces, signature: etat.signature, mode: etat.mode });
  const sauver = async () => {
    minuterie = null;
    if(!sale) return;
    sale = false;
    try{
      await appelPrep({ action: 'mailBrouillon', cle: cle, contenu: contenu() });
      const d = new Date();
      garde.textContent = '💾 Brouillon gardé à ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }catch(e){ garde.textContent = '⚠️ Brouillon non gardé'; }
  };
  changeAPoser = () => { sale = true; if(minuterie) clearTimeout(minuterie); minuterie = setTimeout(sauver, 1500); };

  const fermer = async (garder) => {
    if(minuterie){ clearTimeout(minuterie); minuterie = null; }
    if(garder) await sauver();
    mlEditeurOuvert = null;
    if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove();
  };
  bFermer.addEventListener('click', () => fermer(true));
  bJeter.addEventListener('click', async () => {
    if(!await confirmer('Jeter ce brouillon ? Ce que tu as écrit sera perdu.', '🗑️ Jeter le brouillon', true)) return;
    try{ await appelPrep({ action: 'mailBrouillon', cle: cle, contenu: null }); }catch(e){}
    sale = false;
    fermer(false);
  });
  bEnvoyer.addEventListener('click', async () => {
    champA.prendre(); champCc.prendre(); champCci.prendre();
    if(!etat.a.length && !etat.cc.length && !etat.cci.length){ mlToast('À qui ? Il manque l’adresse du destinataire.'); champA.querySelector('input').focus(); return; }
    if(!sujet.value.trim() && !await confirmer('Envoyer sans objet ?', 'Objet vide')) return;
    /* Les images du texte et de la signature partent DANS le mail */
    const copie = ed.zone.cloneNode(true);
    copie.querySelectorAll('img[data-ec-cle]').forEach(im => { im.setAttribute('src', 'ec-cle:' + im.getAttribute('data-ec-cle')); im.removeAttribute('data-ec-cle'); });
    copie.querySelectorAll('.mlSignature').forEach(x => { x.removeAttribute('class'); x.removeAttribute('data-sig'); });
    copie.querySelectorAll('.mlCitation').forEach(x => x.removeAttribute('class'));
    bEnvoyer.disabled = true;
    bEnvoyer.textContent = '📤 Envoi…';
    try{
      if(minuterie){ clearTimeout(minuterie); minuterie = null; }
      const r = await appelPrep({ action: 'mailEnvoyer', a: etat.a, cc: etat.cc, cci: etat.cci, sujet: sujet.value.trim(),
        html: copie.innerHTML, pieces: etat.pieces, fil: (f && etat.mode !== 'transfert') ? f.id : 0,
        repondA: base ? base.id : 0, mode: etat.mode, brouillon: cle, eleve: (f && f.eleve) || '' });
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
      sale = false;
      await fermer(false);
      mlToast('📤 Mail envoyé');
      mlLueLe = 0;
      if(r.fil && (etat.mode !== 'transfert')) await mlOuvrir(r.fil);
      else { mlCharger(true); if(r.fil) await mlOuvrir(r.fil); }
    }catch(e){
      bEnvoyer.disabled = false;
      bEnvoyer.textContent = '📤 Envoyer';
      mlToast('⚠️ Le mail n’est pas parti : ' + (e.message || e));
    }
  });
  fond.addEventListener('keydown', ev => { if(ev.key === 'Escape'){ ev.stopPropagation(); fermer(true); } });
  document.body.appendChild(fond);
  mlEditeurOuvert = { devant: () => ed.zone.focus(), fermer: fermer };
  setTimeout(() => {
    if(!etat.a.length) champA.querySelector('input').focus();
    else{
      ed.zone.focus();
      const s = window.getSelection(), r = document.createRange();
      r.setStart(ed.zone.firstChild || ed.zone, 0); r.collapse(true);
      s.removeAllRanges(); s.addRange(r);
    }
  }, 60);
}

/* ------------------------------------------------------------
   ✍️ MA SIGNATURE · 🗑️ LA CORBEILLE · ⚙️ LES RÉGLAGES
   ------------------------------------------------------------ */
async function mlFenetreSignature(){
  const signatures = await mlLireLesSignatures();
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal mlFenetre';
  boite.style.maxWidth = 'min(620px, 96vw)';
  fond.appendChild(boite);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  boite.insertAdjacentHTML('beforeend', '<h3>✍️ Ma signature</h3><div class="mlAide">Colle ici ta signature toute prête — ' +
    'copie-la depuis le webmail OVH (Paramètres › Signature) : la mise en forme et les liens suivent. Ajoute ton logo en PNG. ' +
    'Elle s’ajoute toute seule sous chaque mail ; le menu ✍️ Signature de l’éditeur en choisit une autre, ou aucune.</div>');
  let qui = mlMaCle();
  if(mlEstAdmin()){
    const l = document.createElement('label');
    l.textContent = 'La signature de';
    const s = document.createElement('select');
    s.id = 'mlSigQui';
    const op = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); };
    op(qui, 'Moi (' + ((typeof ACCES !== 'undefined' && ACCES.moniteur) || '') + ')');
    op('equipe', 'L’équipe (signature commune)');
    signatures.filter(x => x.qui !== qui && x.qui !== 'equipe').forEach(x => op(x.qui, x.nom || x.qui));
    s.addEventListener('change', () => { qui = s.value; remplir(); });
    boite.append(l, s);
  }
  const ed = mlZoneDEcriture({ outils: 'court' });
  ed.zone.classList.add('mlZoneSig');
  boite.appendChild(ed.cadre);
  const logo = document.createElement('div');
  logo.className = 'mlLogo';
  boite.appendChild(logo);
  let image = '', imageNeuve = null, lienImage = '';
  const dessinerLogo = () => {
    logo.innerHTML = '';
    if(lienImage){
      const im = document.createElement('img');
      im.src = lienImage;
      im.alt = 'Logo';
      logo.appendChild(im);
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-secondary';
    b.textContent = lienImage ? '🖼️ Changer le logo' : '🖼️ Ajouter le logo (PNG)';
    b.addEventListener('click', async () => {
      const [fi] = await mlChoisirUnFichier(true);
      if(!fi) return;
      if(fi.size > 1500000){ mlToast('⚠️ Le logo pèse plus de 1,5 Mo.'); return; }
      imageNeuve = { type: fi.type, contenu: String(await blobEnBase64EC(fi)).replace(/^data:[^,]*,/, '') };
      lienImage = URL.createObjectURL(fi);
      dessinerLogo();
    });
    logo.appendChild(b);
    if(lienImage){
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'btn btn-secondary';
      x.textContent = '✕ Retirer le logo';
      x.addEventListener('click', () => { image = ''; imageNeuve = null; lienImage = ''; dessinerLogo(); });
      logo.appendChild(x);
    }
  };
  const remplir = () => {
    const s = signatures.find(x => x.qui === qui);
    ed.zone.innerHTML = s ? (s.html || '') : '';
    image = s ? s.image : ''; imageNeuve = null; lienImage = s && s.lien ? mlLien(s.lien) : '';
    dessinerLogo();
  };
  remplir();
  const rang = document.createElement('div');
  rang.className = 'btn-row';
  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', fermer);
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.id = 'mlSigEnregistrer';
  bOk.textContent = '💾 Enregistrer';
  bOk.addEventListener('click', async () => {
    bOk.disabled = true;
    try{
      const r = await appelPrep({ action: 'mailSignaturePoser', qui: qui, html: ed.zone.innerHTML, image: image, imageNeuve: imageNeuve });
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
      mlSignaturesLues = r.signatures || null;
      mlToast('✍️ Signature enregistrée');
      fermer();
    }catch(e){ bOk.disabled = false; mlToast('⚠️ ' + (e.message || e)); }
  });
  rang.append(bA, bOk);
  boite.appendChild(rang);
  document.body.appendChild(fond);
}

async function mlFenetreCorbeille(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal mlFenetre';
  boite.style.maxWidth = 'min(640px, 96vw)';
  fond.appendChild(boite);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  boite.innerHTML = '<h3>🗑️ Pubs et newsletters</h3><div class="mlAide">Celles qui se déclarent comme telles (un lien « se désabonner », une liste de diffusion). ' +
    'Elles sont dans la corbeille de la boîte OVH : « ↩️ Remettre » la ramène dans la boîte, et cet expéditeur n’y partira plus jamais. 30 derniers jours.</div>' +
    '<div class="mlCorbeille">' + ((typeof htmlAttente === 'function') ? htmlAttente('Lecture…') : 'Lecture…') + '</div>';
  const rang = document.createElement('div');
  rang.className = 'btn-row';
  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', fermer);
  rang.appendChild(bF);
  boite.appendChild(rang);
  document.body.appendChild(fond);
  const z = boite.querySelector('.mlCorbeille');
  let r;
  try{ r = await appelPrep({ action: 'mailCorbeille' }); }
  catch(e){ z.innerHTML = '<div class="empty">⚠️ ' + mlEch(e.message || e) + '</div>'; return; }
  const l = (r && r.pubs) || [];
  z.innerHTML = l.length ? '' : '<div class="empty">Rien à la corbeille ces 30 derniers jours.</div>';
  l.forEach(p => {
    const d = document.createElement('div');
    d.className = 'mlPub';
    d.innerHTML = '<div class="g"><b></b><div class="s"></div></div>';
    d.querySelector('b').textContent = p.sujet || '(sans objet)';
    d.querySelector('.s').textContent = (p.deNom ? p.deNom + ' · ' : '') + p.de + ' · ' + mlDateHeure(p.quand) +
      (p.raison === 'ancienne' ? ' · restée dans la boîte (d’avant l’App)' : '') + (p.remis ? ' · ↩️ remise' : '');
    if(!p.remis && mlPeutEcrire()){
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.textContent = '↩️ Remettre';
      b.addEventListener('click', async () => {
        b.disabled = true;
        try{
          const x = await appelPrep({ action: 'mailRemettre', id: p.id });
          if(!x || x.status !== 'ok') throw new Error((x && x.message) || 'refusé');
          b.textContent = '✓ Remise';
          mlLueLe = 0; mlCharger(true);
        }catch(e){ b.disabled = false; mlToast('⚠️ ' + (e.message || e)); }
      });
      d.appendChild(b);
    }
    z.appendChild(d);
  });
}

async function mlFenetreReglages(){
  if(!mlEtat){ try{ const d = await appelPrep({ action: 'mailList', vue: 'boite' }); mlEtat = d && d.etat; }catch(e){} }
  const e = mlEtat || {};
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal mlFenetre';
  boite.style.maxWidth = 'min(620px, 96vw)';
  fond.appendChild(boite);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  let etiquettes = (e.etiquettes || []).slice(), jamais = (e.jamais || []).slice(), pubs = e.pubs !== false;
  const dessiner = () => {
    boite.innerHTML = '<h3>⚙️ Réglages des mails</h3>';
    const info = document.createElement('div');
    info.className = 'mlAide';
    const d = e.dossiers || {};
    info.textContent = '📬 ' + (e.adresse || 'boîte non branchée') + ' · relevée toutes les 5 minutes' +
      (e.releveLe ? ' (dernière : ' + mlDateHeure(e.releveLe) + ')' : '') +
      ' · Envoyés : ' + (d.envoyes || '—') + ' · Corbeille : ' + (d.corbeille || '—') + (e.erreur ? ' · ⚠️ ' + e.erreur : '');
    boite.appendChild(info);
    const lp = document.createElement('label');
    lp.className = 'mlCase';
    const cp = document.createElement('input');
    cp.type = 'checkbox'; cp.checked = pubs; cp.id = 'mlPubsOn';
    cp.addEventListener('change', () => { pubs = cp.checked; });
    lp.append(cp, document.createTextNode(' 🗑️ Les pubs et newsletters partent à la corbeille'));
    boite.appendChild(lp);
    const t1 = document.createElement('label');
    t1.textContent = 'Les étiquettes';
    boite.appendChild(t1);
    const ze = document.createElement('div');
    ze.className = 'mlPuces';
    etiquettes.forEach((x, i) => {
      const p = mlPuce('🏷️ ' + x + ' ×');
      p.style.cursor = 'pointer';
      p.title = 'Retirer';
      p.addEventListener('click', () => { etiquettes.splice(i, 1); dessiner(); });
      ze.appendChild(p);
    });
    const ajout = document.createElement('input');
    ajout.type = 'text';
    ajout.placeholder = '➕ Nouvelle étiquette (Entrée)';
    ajout.className = 'mlChampEleve';
    ajout.addEventListener('keydown', ev => { if(ev.key === 'Enter' && ajout.value.trim()){ ev.preventDefault(); etiquettes.push(ajout.value.trim()); dessiner(); } });
    ze.appendChild(ajout);
    boite.appendChild(ze);
    const t2 = document.createElement('label');
    t2.textContent = 'Jamais à la corbeille (adresses ou @domaines)';
    boite.appendChild(t2);
    const zj = document.createElement('div');
    zj.className = 'mlPuces';
    jamais.forEach((x, i) => {
      const p = mlPuce(x + ' ×');
      p.style.cursor = 'pointer';
      p.addEventListener('click', () => { jamais.splice(i, 1); dessiner(); });
      zj.appendChild(p);
    });
    const aj = document.createElement('input');
    aj.type = 'text';
    aj.placeholder = '➕ adresse@exemple.fr ou @exemple.fr (Entrée)';
    aj.className = 'mlChampEleve';
    aj.addEventListener('keydown', ev => { if(ev.key === 'Enter' && aj.value.trim()){ ev.preventDefault(); jamais.push(aj.value.trim().toLowerCase()); dessiner(); } });
    zj.appendChild(aj);
    boite.appendChild(zj);
    const rang = document.createElement('div');
    rang.className = 'btn-row';
    const bR = document.createElement('button');
    bR.className = 'btn btn-secondary';
    bR.textContent = '🔄 Relever maintenant';
    bR.addEventListener('click', () => { fermer(); mlRelever(); });
    const bA = document.createElement('button');
    bA.className = 'btn btn-secondary';
    bA.textContent = 'Annuler';
    bA.addEventListener('click', fermer);
    const bOk = document.createElement('button');
    bOk.className = 'btn btn-primary';
    bOk.textContent = '💾 Enregistrer';
    bOk.addEventListener('click', async () => {
      bOk.disabled = true;
      try{
        const r = await appelPrep({ action: 'mailReglagesPoser', pubs: pubs, etiquettes: etiquettes, jamais: jamais });
        if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
        mlEtat = r.etat || mlEtat;
        mlToast('⚙️ Réglages des mails enregistrés');
        fermer();
        if(mlOngletActif()) dessinerLaListeMessagerie();
      }catch(er){ bOk.disabled = false; mlToast('⚠️ ' + (er.message || er)); }
    });
    rang.append(bR, bA, bOk);
    boite.appendChild(rang);
  };
  dessiner();
  document.body.appendChild(fond);
}

/* ------------------------------------------------------------
   📇 DANS LE DOSSIER DE L'ÉLÈVE — 💬 Messages
   ------------------------------------------------------------ */
async function mlDuDossier(nom){
  if(!mlOngletVisible()) return [];
  try{
    const d = await appelPrep({ action: 'mailDuDossier', eleve: nom });
    return (d && d.fils) || [];
  }catch(e){ return []; }
}
function mlLigneDuDossier(f){
  const l = document.createElement('div');
  l.className = 'mlLigneDossier';
  l.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:9px 11px;margin-bottom:7px;display:flex;gap:9px;align-items:center;';
  const g = document.createElement('div');
  g.style.cssText = 'flex:1;min-width:0;';
  const plus = [f.nb > 1 ? 'mail · ' + f.nb + ' messages' : 'mail · 1 message',
    f.nb > 1 ? (f.premierLe && mlJourDe(f.premierLe) !== mlJourDe(f.dernierLe) && f.dernierSens !== 'envoye' ? 'du ' + mlJourDe(f.premierLe) + ' au ' + mlJourDe(f.dernierLe) : 'dernier le ' + mlDateHeure(f.dernierLe)) : 'le ' + mlDateHeure(f.dernierLe),
    f.webmail ? '✉️ réponse envoyée depuis le webmail' : '',
    f.rattache === 'adresse' ? 'rattaché par l’adresse de sa fiche' : ''].filter(Boolean).join(' · ');
  g.innerHTML = '<div style="font-size:13.5px;font-weight:700;' + (f.nonLus ? 'color:var(--warn-text);' : '') + '"></div>' +
    '<div style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:2px;"></div>';
  g.firstChild.textContent = '✉️ ' + (f.sujet || '(sans objet)') + (f.nonLus ? ' · ' + f.nonLus + ' non lu' + (f.nonLus > 1 ? 's' : '') : '');
  g.lastChild.textContent = plus;
  l.appendChild(g);
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;flex:0 0 auto;margin:0;padding:7px 11px;font-size:12px;white-space:nowrap;';
  b.textContent = 'Ouvrir';
  b.addEventListener('click', () => mlOuvrirPartout(f.id));
  l.appendChild(b);
  return l;
}
/* Ouvrir un fil de mail d'où que l'on soit : la messagerie, l'onglet ✉️ */
function mlOuvrirPartout(id){
  if(typeof allerALaMessagerie === 'function') allerALaMessagerie('messagerie');
  if(typeof ongletMsgEC !== 'undefined'){
    ongletMsgEC = 'mails';
    try{ localStorage.setItem('ec_msg_onglet', 'mails'); }catch(e){}
  }
  if(typeof filtreMessagerie !== 'undefined') filtreMessagerie = '';
  setTimeout(() => { mlOuvrir(id); }, 250);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-boite-mail.js'] = true;
