/* Déployé le 03/11/2026 à 17:56 — v1344 */
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
   🤖 v1338 (livraison 2, « je te laisse faire ») : Claude — un
   interrupteur pour toute l'école, le résumé et les étiquettes à
   l'arrivée, l'élève proposé, la réponse proposée à l'ouverture,
   « ☑️ En faire une tâche », « ➕ Créer la fiche », 🤖 ▾ dans l'éditeur.
   Rien ne part sans quelqu'un de l'équipe.

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
/* 📩 v1340 — chaque geste lu / non lu / étiquette d'ici avance ce compteur :
   une liste demandée AVANT le geste et rendue APRÈS est périmée (elle
   repeignait « lu » un mail qu'on venait de remettre en non lu) */
let mlGestes = 0;

/* ============================================================
   🚩 👤 🏷️ LE DRAPEAU, QUI S'EN OCCUPE, LES FILTRES — v1342

   David, le 3 novembre : « des filtres avec les étiquettes dans les
   mails », « un drapeau pour que ce soit en rouge et qu'on le repère
   bien quand c'est à traiter », « plusieurs points de couleur pour voir
   si on attribue une couleur à une personne pour qu'elle s'en occupe ».
   Ses réponses au schéma :
     · le 🚩 remplace « ⚠️ Urgent » (même case : Claude le pose là où
       il posait « urgent ») ;
     · une couleur par personne, donnée par l'appli ; un administrateur
       la change et choisit qui est dans la liste (⚙️ Réglages) ;
     · pas de notification ;
     · « ✓ Réglé » enlève le drapeau, les ronds restent ;
     · les filtres en une rangée : Tous · 🚩 · 🔵 Pour moi · 👤 Qui ▾ ·
       🏷️ Étiquette ▾ (pas toutes les étiquettes en puces).
   ============================================================ */
const ML_POUR_COULEURS = {
  bleu:   { hex: '#2F6FEB', emo: '🔵' }, violet: { hex: '#8B5CF6', emo: '🟣' }, orange: { hex: '#F08A24', emo: '🟠' },
  vert:   { hex: '#16A34A', emo: '🟢' }, jaune:  { hex: '#D4A106', emo: '🟡' }, brun:   { hex: '#8B5A2B', emo: '🟤' },
  noir:   { hex: '#3F3F46', emo: '⚫' }
};
const mlFiltre = { drap: false, moi: false, qui: '', etiq: '' };
function mlNormNom(n){ return String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function mlPersonnes(){ return (mlEtat && Array.isArray(mlEtat.personnes)) ? mlEtat.personnes : []; }
function mlPersonne(nom){
  const k = mlNormNom(nom);
  const p = mlPersonnes().find(x => mlNormNom(x.nom) === k);
  return { nom: p ? p.nom : String(nom || ''), couleur: (p && ML_POUR_COULEURS[p.couleur]) ? p.couleur : 'noir', connu: !!p };
}
function mlMoi(){ return (typeof ACCES !== 'undefined' && ACCES && (ACCES.moniteur || ACCES.nom)) || ''; }
function mlEstPour(f, nom){ const k = mlNormNom(nom); return !!k && (f.pour || []).some(x => mlNormNom(x) === k); }
/* Le rond : la couleur ET l'initiale (la couleur ne parle jamais seule) */
function mlRond(nom){
  const p = mlPersonne(nom);
  const r = document.createElement('span');
  r.className = 'mlRond';
  r.style.background = ML_POUR_COULEURS[p.couleur].hex;
  r.textContent = (p.nom.trim().charAt(0) || '?').toUpperCase();
  r.title = 'Pour ' + p.nom;
  r.setAttribute('aria-label', 'Pour ' + p.nom);
  return r;
}
function mlFiltrer(l){
  return l.filter(f => (!mlFiltre.drap || f.urgent) &&
                       (!mlFiltre.moi || mlEstPour(f, mlMoi())) &&
                       (!mlFiltre.qui || (mlFiltre.qui === '∅' ? !(f.pour || []).length : mlEstPour(f, mlFiltre.qui))) &&
                       (!mlFiltre.etiq || (mlFiltre.etiq === '∅' ? !(f.etiquettes || []).length : (f.etiquettes || []).indexOf(mlFiltre.etiq) !== -1)));
}
function mlFiltreActif(){ return !!(mlFiltre.drap || mlFiltre.moi || mlFiltre.qui || mlFiltre.etiq); }
function mlRangeeDesFiltres(){
  const r = document.createElement('div');
  r.className = 'mlFiltres';
  const tous = mlFils;
  const puce = (texte, n, on, titre, faire, cle) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ckpOnglet mlFiltreB' + (on ? ' on' : '');
    b.dataset.filtre = cle;
    b.title = titre || '';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.appendChild(document.createTextNode(texte));
    if(n !== null && n !== undefined){ const c = document.createElement('span'); c.className = 'n'; c.textContent = String(n); b.appendChild(c); }
    b.addEventListener('click', ev => { ev.stopPropagation(); faire(b); });
    r.appendChild(b);
    return b;
  };
  const redessiner = () => dessinerLaListeMessagerie();
  puce('Tous', tous.length, !mlFiltreActif(), 'Tous les mails', () => { mlFiltre.drap = false; mlFiltre.moi = false; mlFiltre.qui = ''; mlFiltre.etiq = ''; redessiner(); }, 'tous');
  puce('🚩', tous.filter(f => f.urgent).length, mlFiltre.drap, 'Seulement les drapeaux rouges', () => { mlFiltre.drap = !mlFiltre.drap; redessiner(); }, 'drap');
  const moi = mlMoi();
  if(moi && mlPersonne(moi).connu){
    puce(ML_POUR_COULEURS[mlPersonne(moi).couleur].emo + ' Pour moi', tous.filter(f => mlEstPour(f, moi)).length, mlFiltre.moi, 'Ceux dont je m’occupe',
      () => { mlFiltre.moi = !mlFiltre.moi; if(mlFiltre.moi) mlFiltre.qui = ''; redessiner(); }, 'moi');
  }
  const pq = mlFiltre.qui ? (mlFiltre.qui === '∅' ? '∅ Personne dessus ✕' : ML_POUR_COULEURS[mlPersonne(mlFiltre.qui).couleur].emo + ' ' + mlPersonne(mlFiltre.qui).nom + ' ✕') : '👤 Qui ▾';
  puce(pq, null, !!mlFiltre.qui, 'Voir les mails d’une personne', b => {
    if(mlFiltre.qui){ mlFiltre.qui = ''; redessiner(); return; }
    const items = mlPersonnes().map(p => ({ emoji: ML_POUR_COULEURS[p.couleur] ? ML_POUR_COULEURS[p.couleur].emo : '⚫', texte: p.nom + (mlNormNom(p.nom) === mlNormNom(moi) ? ' (moi)' : '') + ' · ' + tous.filter(f => mlEstPour(f, p.nom)).length,
      faire: () => { mlFiltre.qui = p.nom; mlFiltre.moi = false; redessiner(); } }));
    items.push({ sep: true }, { emoji: '∅', texte: 'Personne dessus · ' + tous.filter(f => !(f.pour || []).length).length, faire: () => { mlFiltre.qui = '∅'; mlFiltre.moi = false; redessiner(); } });
    menuGestesEC(b, '👤 Voir seulement…', items);
  }, 'qui');
  const pe = mlFiltre.etiq ? (mlFiltre.etiq === '∅' ? '∅ Sans étiquette ✕' : '🏷️ ' + mlFiltre.etiq + ' ✕') : '🏷️ Étiquette ▾';
  puce(pe, null, !!mlFiltre.etiq, 'Voir les mails d’une étiquette', b => {
    if(mlFiltre.etiq){ mlFiltre.etiq = ''; redessiner(); return; }
    const items = ((mlEtat && mlEtat.etiquettes) || []).map(e => ({ emoji: '🏷️', texte: e + ' · ' + tous.filter(f => (f.etiquettes || []).indexOf(e) !== -1).length,
      faire: () => { mlFiltre.etiq = e; redessiner(); } }));
    items.push({ sep: true }, { emoji: '∅', texte: 'Sans étiquette · ' + tous.filter(f => !(f.etiquettes || []).length).length, faire: () => { mlFiltre.etiq = '∅'; redessiner(); } });
    menuGestesEC(b, '🏷️ Voir seulement…', items);
  }, 'etiq');
  return r;
}
function mlBarreDuFiltre(){
  const d = document.createElement('div');
  d.className = 'ckpFiltre mlFiltreBarre';
  const bouts = [];
  if(mlFiltre.drap) bouts.push('🚩');
  if(mlFiltre.moi) bouts.push(ML_POUR_COULEURS[mlPersonne(mlMoi()).couleur].emo + ' Pour moi');
  if(mlFiltre.qui) bouts.push(mlFiltre.qui === '∅' ? 'Personne dessus' : ML_POUR_COULEURS[mlPersonne(mlFiltre.qui).couleur].emo + ' ' + mlPersonne(mlFiltre.qui).nom);
  if(mlFiltre.etiq) bouts.push(mlFiltre.etiq === '∅' ? 'Sans étiquette' : '🏷️ ' + mlFiltre.etiq);
  const t = document.createElement('span');
  t.textContent = 'Filtré : ' + bouts.join(' + ');
  const x = document.createElement('button');
  x.type = 'button';
  x.textContent = '✕ Retirer';
  x.addEventListener('click', () => { mlFiltre.drap = false; mlFiltre.moi = false; mlFiltre.qui = ''; mlFiltre.etiq = ''; dessinerLaListeMessagerie(); });
  d.append(t, x);
  return d;
}
/* 👤 Qui s'en occupe : on coche une ou plusieurs personnes ; le menu se
   rouvre après chaque coche, pour en mettre une deuxième */
function mlMenuPourQui(f, ancre, apres){
  const items = [{ titre: 'POUR QUI ? (UN OU PLUSIEURS)' }];
  const moi = mlMoi();
  mlPersonnes().forEach(p => {
    const pris = mlEstPour(f, p.nom);
    items.push({ emoji: ML_POUR_COULEURS[p.couleur] ? ML_POUR_COULEURS[p.couleur].emo : '⚫', texte: p.nom + (mlNormNom(p.nom) === mlNormNom(moi) ? ' (moi)' : '') + (pris ? '  ✓' : ''), on: pris, cle: 'pour',
      faire: async () => {
        const l = (f.pour || []).filter(x => mlNormNom(x) !== mlNormNom(p.nom));
        if(!pris) l.push(p.nom);
        await mlPoserPour(f, l);
        if(apres) apres();
        /* la liste s'est redessinée : on rouvre le menu sur le bouton qui l'a remplacé */
        const a = (ancre && ancre.isConnected) ? ancre
          : (document.querySelector('.mlIt[data-mail="' + f.id + '"] .mlSurvolB[data-geste="pour"]') ||
             document.querySelector('#ckpFil .mlPourLigne u') || document.querySelector('#ckpFil .msgPts'));
        const neuf = mlFils.find(x => x.id === f.id) || (mlFilOuvert && mlFilOuvert.fil && mlFilOuvert.fil.id === f.id ? mlFilOuvert.fil : f);
        if(a) mlMenuPourQui(neuf, a, apres);
      } });
  });
  if(!mlPersonnes().length) items.push({ titre: 'LA LISTE EST VIDE : ⋯ › ⚙️ RÉGLAGES DES MAILS' });
  if((f.pour || []).length) items.push({ sep: true }, { emoji: '✕', texte: 'Personne', faire: async () => { await mlPoserPour(f, []); if(apres) apres(); } });
  menuGestesEC(ancre, '👤 Qui s’en occupe ?', items);
}
async function mlPoserPour(f, liste){
  mlGestes++;
  const r = await appelPrep({ action: 'mailMarquer', id: f.id, pour: liste });
  mlGestes++;
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
  if(r.fil){
    const i = mlFils.findIndex(x => x.id === f.id);
    if(i !== -1) mlFils[i] = r.fil;
    if(mlFilOuvert && mlFilOuvert.fil && mlFilOuvert.fil.id === f.id) mlFilOuvert.fil = r.fil;
  }
  dessinerLaListeMessagerie();
  if(mlFilOuvert && mlFilOuvert.fil && mlFilOuvert.fil.id === f.id) mlDessinerLeFil();
}
async function mlDrapeau(f){
  mlGestes++;
  const r = await appelPrep({ action: 'mailMarquer', id: f.id, urgent: f.urgent ? 0 : 1 });
  mlGestes++;
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
  if(r.fil){
    const i = mlFils.findIndex(x => x.id === f.id);
    if(i !== -1) mlFils[i] = r.fil;
    if(mlFilOuvert && mlFilOuvert.fil && mlFilOuvert.fil.id === f.id) mlFilOuvert.fil = r.fil;
  }
  mlToast(f.urgent ? 'Drapeau retiré' : '🚩 Drapeau rouge');
  dessinerLaListeMessagerie();
  if(mlFilOuvert && mlFilOuvert.fil && mlFilOuvert.fil.id === f.id) mlDessinerLeFil();
}
let mlFilOuvert = null;          /* { fil, messages } */
let mlChoixEleveOuvert = false;  /* « 🔗 Rattacher » déplié en tête du fil */
let mlCompteNonLus = null;       /* le chiffre de l'onglet (convList) */
let mlSignaturesLues = null;
/* ☑️ v1339 — cocher plusieurs mails (lus / non lus en lot) */
let mlModeChoix = false;
const mlChoix = new Set();
function mlRecompter(){ if(mlVue === 'boite') mlCompteNonLus = mlFils.filter(f => !f.regle && f.nonLus > 0).length; }

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
      let d, avant;
      for(let essai = 0; essai < 3; essai++){
        avant = mlGestes;
        d = await appelPrep({ action: 'mailList', vue: mlVue, mots: mlCherche });
        if(avant === mlGestes) break;
      }
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
  }else{
    zone.appendChild(mlEnteteDeLaListe());
    /* 🏷️ v1342 — les filtres (sous « Claude ») */
    if(!mlModeChoix) zone.appendChild(mlRangeeDesFiltres());
    if(mlFiltreActif()) zone.appendChild(mlBarreDuFiltre());
  }

  if(mlModeChoix) zone.appendChild(mlBarreDuChoix());
  const sc = document.createElement('div');
  sc.className = 'ckpScroll';
  sc.id = 'mlListe';
  zone.appendChild(sc);

  mlLancerLaReleveAuto();
  setTimeout(mlReleveAuto, 0);
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
  const vus = mlFiltrer(mlFils);
  if(!vus.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Aucun mail pour ce filtre.';
    sc.appendChild(v);
    return;
  }
  /* 🚩 v1342 — le drapeau rouge remplace « ⚠️ Urgent » */
  bloc('🚩 DRAPEAU ROUGE', vus.filter(f => f.urgent && !rappel(f)));
  bloc('NON LUS', vus.filter(f => !f.urgent && f.nonLus > 0));
  bloc('À TRAITER', vus.filter(f => !f.urgent && !f.nonLus && !rappel(f)));
  bloc('⏰ À ME RAPPELER', vus.filter(f => !f.urgent && rappel(f)));
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
  items.push({ emoji: mlModeChoix ? '✕' : '☑', texte: mlModeChoix ? 'Annuler le choix' : 'Cocher des mails (lus / non lus)', cle: 'choix',
    faire: () => { mlModeChoix = !mlModeChoix; mlChoix.clear(); dessinerLaListeMessagerie(); } });
  items.push({ emoji: '🗑️', texte: 'Corbeille (mails supprimés, pubs)', cle: 'corbeille', faire: () => mlFenetreCorbeille() });
  items.push({ sep: true });
  items.push({ emoji: '✍️', texte: 'Ma signature', cle: 'signature', faire: () => mlFenetreSignature() });
  items.push({ emoji: '📒', texte: 'Carnet d’adresses', cle: 'carnet', faire: () => mlFenetreCarnet({}) });
  if(mlEstAdmin()){
    items.push({ emoji: '⚙️', texte: 'Réglages des mails', cle: 'reglages', faire: () => mlFenetreReglages() });
    items.push({ emoji: '⚡', texte: 'Régler les réponses rapides', cle: 'rapides', faire: () => { if(typeof rrFiltre !== 'undefined') rrFiltre = 'mail'; ecranReglagesMessagerie(); } });
  }
  if(typeof menuGestesEC === 'function') menuGestesEC(ancre, '✉️ Mails', items);
}

/* ============================================================
   ⏱️ LA RELÈVE, PLUS SOUVENT QUAND ON REGARDE — v1343

   David, le 3 novembre : « je suis bloqué depuis 14h23 […] je reçois
   des mails que j'ai besoin de voir tout de suite, du genre les
   tickets de paiement ». Le Worker relève toutes les 5 minutes ; tant
   que l'onglet ✉️ Mails est ouvert (et la page visible), l'appli
   demande en plus une relève chaque minute. Elle est silencieuse : un
   nouveau mail apparaît, c'est tout. S'il en reste à relever, la
   suivante part plus tôt.
   ============================================================ */
let mlAutoReleveLe = 0, mlAutoEnCours = false, mlAutoMinuterie = null;
function mlReleveAuto(){
  if(mlAutoEnCours || typeof appelPrep !== 'function') return;
  if(!mlOngletActif() || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
  /* seulement si la liste des mails est à l'écran */
  const zl = document.getElementById('mlListe');
  if(!zl || !zl.offsetParent) return;
  const e = mlEtat || {};
  if(!mlEtat || e.configuree === false) return;
  const maintenant = Date.now();
  if(maintenant - mlAutoReleveLe < 60000) return;
  if(e.releveLe && maintenant - Number(e.releveLe) < 60000) return;
  mlAutoReleveLe = maintenant;
  mlAutoEnCours = true;
  appelPrep({ action: 'mailReleve' }).then(r => {
    if(r && r.stats && Number(r.stats.reste) > 0) mlAutoReleveLe = Date.now() - 50000;   /* la suite dans ~10 s */
    if(r && (r.stats || r.deja)){ mlLueLe = 0; return mlCharger(true); }
  }).catch(() => {}).finally(() => { mlAutoEnCours = false; });
}
function mlLancerLaReleveAuto(){
  if(mlAutoMinuterie) return;
  mlAutoMinuterie = setInterval(mlReleveAuto, 15000);
  if(typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') mlReleveAuto(); });
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
  /* 🤖 v1338 — l'interrupteur de Claude, pour toute l'école
     (administrateurs) ; les autres voient s'il est allumé */
  if(e.configuree !== false && mlEtat){
    const lab = document.createElement('label');
    lab.className = 'mlInter' + (e.claude ? ' on' : '') + (mlEstAdmin() && e.claudeDisponible ? '' : ' fige');
    lab.id = 'mlClaudeInter';
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = e.claudeDisponible ? '🤖 Claude lit et prépare les réponses' : '🤖 Claude : la clé Anthropic manque au Worker';
    const sw = document.createElement('span');
    sw.className = 'sw';
    sw.innerHTML = '<i></i>';
    lab.append(t, sw);
    lab.title = !e.claudeDisponible ? 'ANTHROPIC_API_KEY absente du Worker' :
      mlEstAdmin() ? (e.claude ? 'Éteindre Claude pour toute l’école' : 'Allumer Claude pour toute l’école') : 'Réglé par un administrateur';
    lab.addEventListener('click', async ev => {
      ev.preventDefault();
      if(!mlEstAdmin() || !e.claudeDisponible) return;
      try{
        const r = await appelPrep({ action: 'mailReglagesPoser', claude: !e.claude });
        if(r && r.etat) mlEtat = r.etat;
        mlToast(mlEtat.claude ? '🤖 Claude lit les mails qui arrivent' : '🤖 Claude est éteint');
        dessinerLaListeMessagerie();
        if(mlFilOuvert){ mlFilOuvert.claude = !!mlEtat.claude; mlDessinerLeFil(); }
      }catch(er){ mlToast('⚠️ ' + (er.message || er)); }
    });
    d.appendChild(lab);
  }
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
    /* 📥 v1344 — ce que la relève a fait, et ce qui attend : une relève
       qui tourne à vide ne doit plus avoir l'air de marcher */
    const st = e.stats || {};
    const vieille = Date.now() - Number(e.releveLe) > 15 * 60000;
    const r = document.createElement('span');
    r.className = 'mlReleveInfo' + (vieille ? ' vieille' : '');
    r.textContent = ' · ' + (vieille ? '⚠️ ' : '') + 'relevée à ' + mlHeure(e.releveLe) +
      (Number(st.nouveaux) ? ' · ' + st.nouveaux + ' nouveau' + (st.nouveaux > 1 ? 'x' : '') : '') +
      (Number(st.reste) ? ' · ⏳ ' + st.reste + ' encore à relever' : '') +
      (Number(st.sautes) || Number(st.secours) ? ' · ⚠️ ' + (Number(st.sautes) + Number(st.secours)) + ' à ouvrir dans le webmail' : '');
    r.title = 'Dernière relève : ' + (Number(st.nouveaux) || 0) + ' nouveau(x), ' + (Number(st.connus) || 0) + ' déjà là, ' +
      (Number(st.filet) || 0) + ' rattrapé(s), ' + (Number(st.reste) || 0) + ' en attente' + (vieille ? '\nPlus de 15 minutes : ⋯ › 🔄 Relever la boîte maintenant' : '');
    l.appendChild(r);
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
  d.className = 'ckIt mlIt' + (ouvert ? ' on' : '') + (f.nonLus ? ' nlu' : ' lu') + (f.urgent ? ' drap' : '');
  d.dataset.mail = String(f.id);
  d.title = f.nonLus ? 'Non lu — ouvrir le mail' : 'Lu — ouvrir le mail';
  if(mlModeChoix){
    const ca = document.createElement('div');
    const pris = mlChoix.has(f.id);
    ca.className = 'ckCase mlCoche' + (pris ? ' pris' : '');
    ca.textContent = '✓';
    d.appendChild(ca);
    if(pris) d.classList.add('coche');
    d.title = pris ? 'Retirer de la sélection' : 'Ajouter à la sélection';
  }
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
  h.appendChild(q);
  /* 🚩 👤 v1342 — le drapeau et les ronds, juste avant l'heure */
  if(f.urgent || (f.pour || []).length){
    const marques = document.createElement('span');
    marques.className = 'mlMarques';
    if(f.urgent){ const fl = document.createElement('span'); fl.className = 'mlDrap'; fl.textContent = '🚩'; fl.title = 'Drapeau rouge'; marques.appendChild(fl); }
    (f.pour || []).forEach(n => marques.appendChild(mlRond(n)));
    h.appendChild(marques);
  }
  h.appendChild(t);
  m.appendChild(h);
  const s = document.createElement('div');
  s.className = 'ap mlSujet';
  s.textContent = (f.pj ? '📎 ' : '') + (f.sujet || '(sans objet)');
  m.appendChild(s);
  if(f.resume && f.dernierSens === 'recu'){
    /* 🤖 v1338 — la ligne de Claude à la place du début du mail */
    const a = document.createElement('div');
    a.className = 'ap mlApercu mlResume';
    a.appendChild(document.createTextNode('🤖 '));
    mlPoserLeGras(a, f.resume);
    m.appendChild(a);
  }else if(f.apercu){
    const a = document.createElement('div');
    a.className = 'ap mlApercu';
    a.textContent = (f.dernierSens === 'envoye' ? (f.webmail ? '↩️ (webmail) ' : '↩️ ') : '') + f.apercu;
    m.appendChild(a);
  }
  const puces = document.createElement('div');
  puces.className = 'mlPuces';
  if(f.eleve) puces.appendChild(mlPuce('🔗 ' + f.eleve + (f.lien === 'parent' ? ' · 👪 parent' : /^autre:/.test(f.lien || '') ? ' · 🧑‍💼 ' + (f.lien.slice(6) || 'autre') : ''), 'eleve'));
  else if(f.rattache !== 'non' && f.dernierSens === 'recu') puces.appendChild(mlPuce('❓ À rattacher', 'orange',
    f.propose ? '🤖 Claude propose : ' + f.propose : (f.candidats || []).length ? (f.candidats || []).join(' ou ') + ' ?' : ''));
  (f.etiquettes || []).forEach(e => puces.appendChild(mlPuce('🏷️ ' + e)));
  if(f.rappelLe > Date.now()) puces.appendChild(mlPuce('⏰ ' + (typeof ckQuandRevient === 'function' ? ckQuandRevient(f.rappelLe) : mlDateHeure(f.rappelLe))));
  if(puces.children.length) m.appendChild(puces);
  d.appendChild(m);
  if(f.nonLus){
    const c = document.createElement('b');
    c.className = 'ckCpt';
    c.textContent = String(f.nonLus);
    d.appendChild(c);
  }
  if(!mlModeChoix) d.appendChild(mlGestesAuSurvol(f));
  d.addEventListener('click', () => {
    if(!mlModeChoix){ mlOuvrir(f.id); return; }
    if(mlChoix.has(f.id)) mlChoix.delete(f.id); else mlChoix.add(f.id);
    dessinerLaListeMessagerie();
  });
  return d;
}

/* 🖱️ v1340 — David : « des boutons rapides au survol dans la liste des
   mails, avec non lu, les étiquettes ». Sur un écran à souris, la ligne
   survolée montre 📩 / ✉️ (non lu ↔ lu) et 🏷️ (les étiquettes) ; ouvrir
   le mail n'est pas nécessaire. Sur le téléphone (pas de survol), rien
   ne change : ⋯ dans le mail. */
function mlGestesAuSurvol(f){
  const b = document.createElement('div');
  b.className = 'mlSurvol';
  const bouton = (texte, titre, faire, cle) => {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'mlSurvolB';
    x.dataset.geste = cle;
    x.textContent = texte;
    x.title = titre;
    x.setAttribute('aria-label', titre);
    x.addEventListener('click', async ev => {
      ev.stopPropagation();
      if(x.disabled) return;
      x.disabled = true;
      try{ await faire(x); }catch(e){ mlToast('⚠️ ' + (e.message || e)); }
      x.disabled = false;
    });
    b.appendChild(x);
  };
  if(f.nonLus) bouton('✉️', 'Marquer comme lu', () => mlLuDepuisLaListe(f, true), 'lu');
  else bouton('📩', 'Marquer comme non lu', () => mlLuDepuisLaListe(f, false), 'nonlu');
  if(mlPeutEcrire()){
    /* 🚩 👤 v1342 */
    bouton('🚩', f.urgent ? 'Retirer le drapeau rouge' : 'Drapeau rouge', () => mlDrapeau(f), 'drap');
    bouton('🏷️', 'Étiquettes', x => mlEtiquettesDepuisLaListe(f, x), 'etiq');
    bouton('👤', 'Qui s’en occupe ?', x => mlMenuPourQui(f, x), 'pour');
  }
  return b;
}
/* Le geste part au serveur ; la ligne change tout de suite */
async function mlLuDepuisLaListe(f, lu){
  mlGestes++;
  const avant = f.nonLus;
  f.nonLus = lu ? 0 : Math.max(1, f.nonLus || 0);
  mlRecompter();
  dessinerLaListeMessagerie();
  try{
    const r = await appelPrep({ action: 'mailMarquerLot', ids: [f.id], lu: lu });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
  }catch(e){
    f.nonLus = avant; mlRecompter(); dessinerLaListeMessagerie();
    throw e;
  }
  mlGestes++;
  if(mlFilOuvert && mlFilOuvert.fil && mlFilOuvert.fil.id === f.id) mlFilOuvert.fil.nonLus = f.nonLus;
  mlToast(lu ? '✉️ Marqué comme lu' : '📩 Marqué comme non lu');
}
function mlEtiquettesDepuisLaListe(f, ancre){
  const poser = async liste => {
    mlGestes++;
    const r = await appelPrep({ action: 'mailMarquer', id: f.id, etiquettes: liste });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    mlGestes++;
    if(r.fil){
      const i = mlFils.findIndex(x => x.id === f.id);
      if(i !== -1) mlFils[i] = r.fil;
      if(mlFilOuvert && mlFilOuvert.fil && mlFilOuvert.fil.id === f.id){ mlFilOuvert.fil = r.fil; mlDessinerLeFil(); }
    }
    dessinerLaListeMessagerie();
  };
  const items = [];
  const toutes = (mlEtat && mlEtat.etiquettes) || [];
  if(!toutes.length) items.push({ titre: 'AUCUNE ÉTIQUETTE ENCORE' });
  toutes.forEach(e => {
    const pris = (f.etiquettes || []).indexOf(e) !== -1;
    items.push({ emoji: pris ? '☑️' : '🏷️', texte: e, on: pris, cle: 'etiq', faire: () => {
      const l = (f.etiquettes || []).slice();
      const i = l.indexOf(e);
      if(i === -1) l.push(e); else l.splice(i, 1);
      return poser(l);
    } });
  });
  if(mlEstAdmin()) items.push({ emoji: '➕', texte: 'Nouvelle étiquette…', faire: async () => {
    const n = await demander('Le nom de l’étiquette :', '', '🏷️ Nouvelle étiquette');
    if(!n || !n.trim()) return;
    const r = await appelPrep({ action: 'mailReglagesPoser', etiquettes: toutes.concat([n.trim()]) });
    if(r && r.etat) mlEtat = r.etat;
    await poser((f.etiquettes || []).concat([n.trim()]));
  } });
  menuGestesEC(ancre, '🏷️ ' + (f.sujet || mlNomDuFil(f)), items);
}

/* La barre du choix : combien, tout cocher, ✉️ lus, 📩 non lus */
function mlBarreDuChoix(){
  const b = document.createElement('div');
  b.className = 'mlChoixBarre';
  const visibles = mlFils.map(f => f.id);
  Array.from(mlChoix).forEach(id => { if(visibles.indexOf(id) === -1) mlChoix.delete(id); });
  const n = mlChoix.size;
  const t = document.createElement('span');
  t.className = 'n';
  t.textContent = n ? n + ' mail' + (n > 1 ? 's' : '') + ' coché' + (n > 1 ? 's' : '') : 'Coche les mails';
  b.appendChild(t);
  const petit = (texte, faire, principal) => {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'btn ' + (principal ? 'btn-primary' : 'btn-secondary');
    x.textContent = texte;
    x.addEventListener('click', async () => { if(x.disabled) return; x.disabled = true; try{ await faire(); }catch(e){ mlToast('⚠️ ' + (e.message || e)); x.disabled = false; } });
    b.appendChild(x);
    return x;
  };
  const tous = visibles.length && visibles.every(id => mlChoix.has(id));
  petit(tous ? 'Tout décocher' : 'Tout cocher (' + visibles.length + ')', () => {
    if(tous) mlChoix.clear(); else visibles.forEach(id => mlChoix.add(id));
    dessinerLaListeMessagerie();
  });
  if(n){
    const lot = async lu => {
      const ids = Array.from(mlChoix);
      mlGestes++;
      const r = await appelPrep({ action: 'mailMarquerLot', ids: ids, lu: lu });
      mlGestes++;
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
      mlFils.forEach(f => { if(ids.indexOf(f.id) !== -1) f.nonLus = lu ? 0 : Math.max(1, f.nonLus); });
      mlRecompter();
      mlToast((lu ? '✉️ ' : '📩 ') + ids.length + ' mail' + (ids.length > 1 ? 's' : '') + ' marqué' + (ids.length > 1 ? 's' : '') + (lu ? ' comme lu' : ' comme non lu') + (ids.length > 1 ? 's' : ''));
      mlModeChoix = false; mlChoix.clear();
      dessinerLaListeMessagerie();
      mlLueLe = 0; mlCharger(true);
    };
    petit('✉️ Marquer comme lu' + (n > 1 ? 's' : ''), () => lot(true), true).dataset.lot = 'lu';
    petit('📩 Marquer comme non lu' + (n > 1 ? 's' : ''), () => lot(false)).dataset.lot = 'nonlu';
  }
  const x = petit('✕', () => { mlModeChoix = false; mlChoix.clear(); dessinerLaListeMessagerie(); });
  x.title = 'Annuler le choix';
  return b;
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
  if(autre){ mlChoixEleveOuvert = false; if(mlReponseClaude && mlReponseClaude.fil !== id) mlReponseClaude = null; }
  const zone = zoneFilMsg();
  if(!zone) return;
  if(autre || !mlFilOuvert){
    zone.innerHTML = (typeof htmlAttente === 'function') ? htmlAttente('Ouverture du mail…') : '<div class="empty">Ouverture du mail…</div>';
  }
  let d;
  mlGestes++;   /* 📩 v1340 — ouvrir, c'est lire : une liste en route est périmée */
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
  mlGestes++;
  const r = await appelPrep(Object.assign({ action: 'mailMarquer', id: f.id }, changement));
  mlGestes++;
  if(r && r.fil){
    mlFilOuvert.fil = r.fil;
    const i = mlFils.findIndex(x => x.id === f.id);
    if(i !== -1) mlFils[i] = r.fil;
    mlRecompter();
  }
  if(toast) mlToast(toast);
  /* rattaché (ou détaché) : le choix de l'élève se referme */
  if(changement.eleve !== undefined || changement.lien !== undefined){ mlChoixEleveOuvert = false; mlNomPropose = ''; }
  if(changement.regle !== undefined && changement.regle){
    mlFils = mlFils.filter(x => x.id !== f.id || mlVue !== 'boite');
    mlFermerLeFil();
    return;
  }
  mlDessinerLeFil();
  if(ckLarge()) dessinerLaListeMessagerie();
}

function mlLignePour(f){
  const x = document.createElement('div');
  x.className = 'mlPourLigne';
  const l = document.createElement('span');
  l.className = 'mlPourL';
  l.textContent = 'Pour :';
  x.appendChild(l);
  if((f.pour || []).length){
    (f.pour || []).forEach(n => { const w = document.createElement('span'); w.className = 'mlPourNom'; w.append(mlRond(n), document.createTextNode(mlPersonne(n).nom)); x.appendChild(w); });
  }else x.appendChild(Object.assign(document.createElement('span'), { className: 'mlPourL', textContent: 'personne' }));
  if(mlPeutEcrire()){
    const u = document.createElement('u');
    u.textContent = (f.pour || []).length ? 'changer' : 'choisir';
    u.tabIndex = 0;
    u.addEventListener('click', ev => { ev.stopPropagation(); mlMenuPourQui(f, u); });
    u.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); mlMenuPourQui(f, u); } });
    x.appendChild(u);
  }
  return x;
}

function mlSousTitre(f){
  const s = document.createElement('div');
  s.className = 's mlS';
  s.appendChild(document.createTextNode('✉️ ' + (f.correspondant || '') + ' · '));
  const span = document.createElement('span');
  if(f.eleve){
    span.className = 'mlLienEleve';
    span.textContent = '🔗 ' + f.eleve + (f.rattache === 'adresse' ? ' (adresse de sa fiche)' : '') +
      (mlLienLisible(f.lien) ? ' · écrit : ' + mlLienLisible(f.lien) : '') + ' · ';
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
  /* 👤 v1342 — « Pour : Ⓜ Maryne · changer » */
  if((f.pour || []).length || mlPeutEcrire()) tt.appendChild(mlLignePour(f));
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
    /* 🚩 v1342 — le drapeau, à côté de « Réglé » */
    if(mlPeutEcrire()) b.appendChild(ckBouton('🚩', f.urgent ? 'Retirer le drapeau rouge' : 'Drapeau rouge', () => mlDrapeau(f).catch(er => mlToast('⚠️ ' + (er.message || er))), 'rond mlDrapB' + (f.urgent ? ' on' : '')));
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
    extras.push({ emoji: '🚩', texte: f.urgent ? 'Retirer le drapeau rouge' : 'Drapeau rouge', cle: 'drap', faire: () => mlDrapeau(f) });
    extras.push({ emoji: '👤', texte: 'Qui s’en occupe…', cle: 'pour', faire: () => mlMenuPourQui(f, document.querySelector('#ckpFil .msgPts') || pts) });
    extras.push({ emoji: '🔗', texte: f.eleve ? 'Changer d’élève, ou qui écrit' : 'Rattacher à un élève', faire: () => { mlChoixEleveOuvert = true; mlDessinerLeFil(); } });
    if(f.eleve) extras.push({ emoji: '✂️', texte: 'Détacher de ' + f.eleve, faire: () => mlMarquer({ eleve: '' }, 'Détaché') });
    else if(f.rattache !== 'non') extras.push({ emoji: '🚫', texte: 'Pas un élève (ne plus proposer)', faire: () => mlMarquer({ eleve: '' }) });
  }
  extras.push({ emoji: '✉️', texte: 'Marquer comme non lu', faire: async () => { await mlMarquer({ nonLu: 1 }); mlFermerLeFil(); } });
  if(mlPeutEcrire()) extras.push({ emoji: '🗑️', texte: 'Supprimer cette conversation', danger: true, cle: 'supprimer', faire: () => mlSupprimer(0) });
  if(mlPeutEcrire() && f.correspondant && !f.eleve){
    extras.push({ emoji: '📒', texte: 'Garder cette adresse dans le carnet', faire: async () => {
      const r = await appelPrep({ action: 'mailCarnetPoser', nom: f.nom || '', adresse: f.correspondant });
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
      mlCarnetDonnees = { carnet: r.carnet || [], eleves: r.eleves || [], recents: r.recents || [] }; mlCarnetLuLe = Date.now();
      mlToast('📒 ' + (f.nom || f.correspondant) + ' gardé dans le carnet');
    } });
  }

  const boite = document.createElement('div');
  boite.className = 'msgMenuBoite';
  const pts = document.createElement('button');
  pts.type = 'button';
  pts.className = 'ckBt rond msgPts';
  pts.textContent = '⋯';
  pts.title = 'Drapeau, qui s’en occupe, étiquettes, élève, non lu…';
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
/* 👪 v1339 — qui écrit : l'élève, un parent, une autre personne */
function mlLienLisible(lien){
  if(lien === 'eleve') return '👤 l’élève';
  if(lien === 'parent') return '👪 un parent';
  if(/^autre:/.test(lien || '')) return '🧑‍💼 ' + (lien.slice(6) || 'une autre personne');
  return '';
}
let mlNomPropose = '';            /* le nom posé d'avance dans « 🔗 Rattacher » (Claude) */

function mlChoixDeLEleve(){
  const f = mlFilOuvert.fil;
  const c = document.createElement('div');
  c.className = 'ckPanneau mlRattacher';
  c.innerHTML = '<div class="l1"><b>🔗 Rattacher ce mail à un élève</b><span class="doux">— il apparaîtra dans son dossier, onglet 💬 Messages</span></div>';
  const pills = document.createElement('div');
  pills.className = 'acts';
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.placeholder = 'Chercher un élève…';
  inp.className = 'mlChampEleve';
  inp.setAttribute('list', 'mlElevesListe');
  inp.value = mlNomPropose || f.eleve || '';
  const dl = document.createElement('datalist');
  dl.id = 'mlElevesListe';
  ((typeof tousLesElevesConnus === 'function') ? tousLesElevesConnus() : []).forEach(n => { const o = document.createElement('option'); o.value = n; dl.appendChild(o); });
  /* les élèves proposés (même adresse, ou reconnus par Claude) remplissent le champ */
  const proposes = (f.candidats || []).concat(f.propose && (f.candidats || []).indexOf(f.propose) === -1 ? [f.propose] : []);
  proposes.forEach(n => pills.appendChild(ckBouton('👤 ' + n, f.propose === n ? 'Claude le reconnaît dans le mail' : 'Même adresse que sa fiche',
    () => { inp.value = n; inp.focus(); })));
  pills.append(inp, dl);
  c.appendChild(pills);

  /* Qui écrit ? */
  let lien = /^autre:/.test(f.lien || '') ? 'autre' : (f.lien || 'eleve');
  const qui = document.createElement('div');
  qui.className = 'acts mlQui';
  const lab = document.createElement('span');
  lab.className = 'doux';
  lab.textContent = 'Qui écrit ?';
  qui.appendChild(lab);
  const autre = document.createElement('input');
  autre.type = 'text';
  autre.className = 'mlChampEleve mlQuiAutre';
  autre.placeholder = 'Ex : sa conseillère France Travail, son grand-père…';
  autre.value = /^autre:/.test(f.lien || '') ? f.lien.slice(6) : '';
  const choix = [['eleve', '👤 L’élève'], ['parent', '👪 Un parent'], ['autre', '🧑‍💼 Autre…']].map(([k, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ckBt mlQuiB';
    b.dataset.lien = k;
    b.textContent = t;
    b.addEventListener('click', () => { lien = k; maj(); if(k === 'autre') autre.focus(); });
    qui.appendChild(b);
    return b;
  });
  qui.appendChild(autre);
  const maj = () => { choix.forEach(b => b.classList.toggle('on', b.dataset.lien === lien)); autre.hidden = lien !== 'autre'; };
  maj();
  c.appendChild(qui);

  const bas = document.createElement('div');
  bas.className = 'acts';
  const ok = ckBouton('🔗 Rattacher', '', () => {
    const n = inp.value.trim();
    const l = (typeof tousLesElevesConnus === 'function') ? tousLesElevesConnus() : [];
    const vrai = l.find(x => x.toLowerCase() === n.toLowerCase()) || n;
    if(!vrai) return;
    const valeur = lien === 'autre' ? 'autre:' + autre.value.trim() : lien;
    mlNomPropose = '';
    return mlMarquer({ eleve: vrai, lien: valeur }, '🔗 Rattaché à ' + vrai + (mlLienLisible(valeur) ? ' — ' + mlLienLisible(valeur) : ''));
  }, 'p');
  ok.id = 'mlRattacherOk';
  inp.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); ok.click(); } });
  autre.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); ok.click(); } });
  bas.appendChild(ok);
  if(!f.eleve) bas.appendChild(ckBouton('🚫 Pas un élève', 'Ne plus proposer de rattacher ce fil', () => mlMarquer({ eleve: '' })));
  bas.appendChild(ckBouton('✕', 'Fermer', () => { mlChoixEleveOuvert = false; mlNomPropose = ''; mlDessinerLeFil(); }, 'rond'));
  c.appendChild(bas);
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
  /* 🗑️ v1338 — un message seul, dans une conversation qui en a plusieurs */
  if(mlPeutEcrire() && f && Number(f.nb || 0) > 1){
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'mlSuppr';
    x.textContent = '🗑️';
    x.title = 'Supprimer ce mail';
    x.addEventListener('click', ev => { ev.stopPropagation(); mlSupprimer(m.id); });
    h.appendChild(x);
  }
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
  /* 🤖 v1338 — ce que Claude a lu, et sa réponse proposée */
  const boiteClaude = mlBoiteClaude();
  if(boiteClaude) fil.appendChild(boiteClaude);
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
  /* 📒 v1338 — en tapant : les élèves (adresse de leur fiche), le carnet,
     les adresses déjà écrites ; ↑ ↓ et Entrée, ou un clic */
  const sg = document.createElement('div');
  sg.className = 'mlSugg';
  sg.hidden = true;
  let props = [], choix = 0;
  const ajouter = o => {
    if(!o || !o.adresse || liste.some(y => y.adresse === o.adresse)) return;
    liste.push({ nom: o.nom || '', adresse: o.adresse });
    inp.value = ''; sg.hidden = true; dessiner(); if(surChange) surChange();
  };
  const montrer = () => {
    props = mlSuggestions(inp.value);
    sg.innerHTML = '';
    choix = props.findIndex(o => o.adresse);
    props.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mlSuggIt' + (i === choix ? ' on' : '');
      b.disabled = !o.adresse;
      b.innerHTML = '<span class="i"></span><span class="n"></span><span class="a"></span>';
      b.querySelector('.i').textContent = ({ eleve: '👤', carnet: '📒', recent: '✉️' })[o.sorte] || '✉️';
      b.querySelector('.n').textContent = o.nom || o.adresse;
      b.querySelector('.a').textContent = o.adresse ? (o.nom ? o.adresse : '') + (o.note ? ' · ' + o.note : '') : 'pas d’adresse sur sa fiche';
      b.addEventListener('mousedown', ev => ev.preventDefault());
      b.addEventListener('click', () => { ajouter(o); inp.focus(); });
      sg.appendChild(b);
    });
    sg.hidden = !props.length;
  };
  inp.addEventListener('input', () => { if(inp.value.trim()) montrer(); else sg.hidden = true; });
  inp.addEventListener('focus', () => { mlChargerLeCarnet(); });
  inp.addEventListener('keydown', ev => {
    if(!sg.hidden && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')){
      ev.preventDefault();
      const pas = ev.key === 'ArrowDown' ? 1 : -1;
      for(let k = 0; k < props.length; k++){ choix = (choix + pas + props.length) % props.length; if(props[choix].adresse) break; }
      Array.from(sg.children).forEach((b, i) => b.classList.toggle('on', i === choix));
      return;
    }
    if(ev.key === 'Escape' && !sg.hidden){ ev.stopPropagation(); sg.hidden = true; return; }
    if(ev.key === 'Enter' && !sg.hidden && props[choix] && props[choix].adresse && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inp.value.trim())){
      ev.preventDefault(); ajouter(props[choix]); return;
    }
    if(ev.key === 'Enter' || ev.key === ',' || ev.key === ';'){ ev.preventDefault(); prendre(); sg.hidden = true; }
    if(ev.key === 'Backspace' && !inp.value && liste.length){ liste.pop(); dessiner(); if(surChange) surChange(); }
  });
  inp.addEventListener('blur', () => { prendre(); setTimeout(() => { sg.hidden = true; }, 150); });
  z.addEventListener('click', ev => { if(ev.target === z) inp.focus(); });
  z.appendChild(inp);
  z.appendChild(sg);
  dessiner();
  z.prendre = prendre;
  z.ajouter = ajouter;
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
  /* 📒 v1338 — le carnet : un élève, France Travail, la DDTM… */
  const carnetLien = document.createElement('button');
  carnetLien.type = 'button';
  carnetLien.className = 'mlCcLien mlCarnetLien';
  carnetLien.textContent = '📒';
  carnetLien.title = 'Le carnet d’adresses : les élèves, les adresses gardées';
  carnetLien.addEventListener('click', () => mlFenetreCarnet({ ajouter: o => champA.ajouter(o) }));
  const plus = document.createElement('span');
  plus.className = 'mlChampPlus';
  plus.append(carnetLien, ccLien);
  ligne('À', champA, plus);
  const champCc = mlChampAdresses(etat.cc, surChange), champCci = mlChampAdresses(etat.cci, surChange);
  const lCc = ligne('Cc', champCc), lCci = ligne('Cci', champCci);
  lCc.hidden = !etat.cc.length; lCci.hidden = !etat.cci.length;
  ccLien.addEventListener('click', () => { lCc.hidden = false; lCci.hidden = false; ccLien.hidden = true; champCc.querySelector('input').focus(); });
  mlChargerLeCarnet();
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
  /* 🤖 ▾ v1338 — reprendre la réponse proposée, reformuler, corriger */
  if(mlClaudeAllume()) ed.outil('🤖 ▾', 'Claude : reprendre la réponse proposée, reformuler, corriger les fautes', b => mlMenuClaudeEditeur(b, ed, surChange));
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
  boite.innerHTML = '<h3>🗑️ La corbeille</h3><div class="mlAide">Les mails supprimés, et les pubs : celles qui se déclarent comme telles (un lien « se désabonner », une liste de diffusion) ' +
    'et, Claude allumé, celles qu’il reconnaît comme des pubs (jamais un élève, un parent, un organisme). ' +
    'Ils sont dans la corbeille de la boîte OVH : « ↩️ Remettre » en ramène un dans la boîte (et l’expéditeur d’une pub n’y partira plus). 30 derniers jours.</div>' +
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
      (p.raison === 'ancienne' ? ' · restée dans la boîte (d’avant l’App)' : '') + (p.raison === 'claude' ? ' · 🤖 jugée pub par Claude' : '') +
      (p.raison === 'supprime' ? ' · 🗑️ supprimé' + (p.par ? ' par ' + p.par : '') : '') +
      (p.remis ? ' · ↩️ remise' : '');
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
  /* 👤 v1342 — qui est dans « Qui s'en occupe », et sa couleur */
  let personnes = (e.personnes || []).map(p => ({ nom: p.nom, couleur: p.couleur }));
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
    const tp = document.createElement('label');
    tp.textContent = '👤 Qui s’en occupe — la liste et les couleurs';
    boite.appendChild(tp);
    const zp = document.createElement('div');
    zp.className = 'mlPersonnesReg';
    personnes.forEach((p, i) => {
      const ligne = document.createElement('div');
      ligne.className = 'mlPersReg';
      ligne.dataset.nom = p.nom;
      const r = mlRond(p.nom);
      r.style.background = (ML_POUR_COULEURS[p.couleur] || ML_POUR_COULEURS.noir).hex;
      const n = document.createElement('span');
      n.className = 'mlPersNom';
      n.textContent = p.nom;
      ligne.append(r, n);
      const pal = document.createElement('span');
      pal.className = 'mlPalette';
      Object.keys(ML_POUR_COULEURS).forEach(k => {
        const c = document.createElement('button');
        c.type = 'button';
        c.className = 'mlCouleurB' + (p.couleur === k ? ' on' : '');
        c.dataset.couleur = k;
        c.style.background = ML_POUR_COULEURS[k].hex;
        c.title = k;
        c.setAttribute('aria-label', 'Couleur ' + k + ' pour ' + p.nom);
        c.setAttribute('aria-pressed', p.couleur === k ? 'true' : 'false');
        c.addEventListener('click', () => { p.couleur = k; dessiner(); });
        pal.appendChild(c);
      });
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'mlPersRetirer';
      x.textContent = '✕';
      x.title = 'Retirer ' + p.nom + ' de la liste';
      x.addEventListener('click', () => { personnes.splice(i, 1); dessiner(); });
      ligne.append(pal, x);
      zp.appendChild(ligne);
    });
    /* ajouter quelqu'un de l'équipe (ou un prénom tapé) */
    const equipe = [];
    ((typeof comptesActifs !== 'undefined' && comptesActifs) || []).forEach(c => { const n = c && (c.nom || c); if(n && equipe.indexOf(n) === -1) equipe.push(String(n)); });
    ((typeof moniteursActifs !== 'undefined' && moniteursActifs) || []).forEach(n => { if(n && equipe.indexOf(n) === -1) equipe.push(String(n)); });
    const libres = equipe.filter(n => !personnes.some(p => mlNormNom(p.nom) === mlNormNom(n))).sort((a, b) => a.localeCompare(b, 'fr'));
    const ajP = document.createElement('div');
    ajP.className = 'mlPersAjout';
    const sel = document.createElement('select');
    sel.id = 'mlPersAjout';
    sel.appendChild(new Option('➕ Ajouter quelqu’un…', ''));
    libres.forEach(n => sel.appendChild(new Option(n, n)));
    sel.appendChild(new Option('Autre prénom…', '__autre__'));
    sel.addEventListener('change', async () => {
      let n = sel.value;
      if(n === '__autre__') n = (typeof demander === 'function') ? (await demander('Le prénom :', '', '👤 Ajouter quelqu’un') || '') : '';
      n = String(n || '').trim();
      if(!n || personnes.some(p => mlNormNom(p.nom) === mlNormNom(n))){ dessiner(); return; }
      const prises = personnes.map(p => p.couleur);
      const libre = Object.keys(ML_POUR_COULEURS).find(k => prises.indexOf(k) === -1) || Object.keys(ML_POUR_COULEURS)[personnes.length % 7];
      personnes.push({ nom: n, couleur: libre });
      dessiner();
    });
    ajP.appendChild(sel);
    zp.appendChild(ajP);
    boite.appendChild(zp);
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
        const r = await appelPrep({ action: 'mailReglagesPoser', pubs: pubs, etiquettes: etiquettes, jamais: jamais, personnes: personnes });
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
    f.rattache === 'adresse' ? 'rattaché par l’adresse de sa fiche' : '',
    mlLienLisible(f.lien) ? 'écrit : ' + mlLienLisible(f.lien) : ''].filter(Boolean).join(' · ');
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

/* ------------------------------------------------------------
   🤖 CLAUDE — v1338 (livraison 2)

   ⚠️ RIEN NE PART SANS NOUS. La réponse proposée s'ouvre dans
   l'éditeur ; la tâche et la fiche se créent sur un appui ; l'élève
   proposé se rattache sur un appui. Claude ne voit que ce que cet
   écran lui envoie de l'appli (« contexte ») : le dossier de l'élève
   du fil, les créneaux libres lus dans Drivup, les tarifs.
   ------------------------------------------------------------ */
let mlReponseClaude = null;      /* { fil, style, texte, enCours, erreur, sources } */

/* « **2 leçons** » → du gras, sans HTML venu d'ailleurs */
function mlPoserLeGras(el, texte){
  String(texte || '').split(/(\*\*[^*]+\*\*)/).forEach(x => {
    if(/^\*\*[^*]+\*\*$/.test(x)){ const b = document.createElement('b'); b.textContent = x.slice(2, -2); el.appendChild(b); }
    else if(x) el.appendChild(document.createTextNode(x));
  });
}

function mlClaudeAllume(){
  return !!((mlFilOuvert && mlFilOuvert.claude) || (mlEtat && mlEtat.claude));
}

/* Ce que l'appli sait, pour la réponse : seulement ce qui sert. */
async function mlContexte(f){
  const l = [], sources = [];
  const dernier = ((mlFilOuvert && mlFilOuvert.messages) || []).filter(m => m.sens === 'recu').pop() || {};
  const tout = ((f.sujet || '') + ' ' + (dernier.texte || '')).toLowerCase();
  const etiq = (f.etiquettes || []).join(' ').toLowerCase();
  const essai = fn => { try{ return fn(); }catch(e){ return null; } };
  if(f.eleve){
    const v = mlValeursDesMots(f) || {};
    const fi = essai(() => (typeof ficheDe === 'function') ? ficheDe(f.eleve) : null) || {};
    l.push('Le fil est rattaché à l’élève ' + f.eleve + (fi.formation ? ' (formation : ' + fi.formation + ')' : '') + '.');
    if(v.moniteur) l.push('Son moniteur : ' + v.moniteur + '.');
    l.push(v.prochaincours ? 'Son prochain cours préparé : ' + v.prochaincours + '.' : 'Aucun prochain cours préparé dans l’appli.');
    if(v.frise) l.push('Sa frise de formation : ' + v.frise + '.');
    if(v.examenblanc) l.push('Son examen blanc : ' + v.examenblanc + '.');
    l.push(v.datedexamen ? 'Sa date d’examen du permis : ' + v.datedexamen + '.' : 'Pas de date d’examen du permis dans l’appli.');
    sources.push('son dossier');
  }
  /* les créneaux libres, quand le mail parle d'un cours ou d'une heure */
  if(/planning/.test(etiq) || /(cours|le[cç]on|cr[ée]neau|heure|horaire|dispo|planning|rendez-vous|rdv|semaine|vacances|lundi|mardi|mercredi|jeudi|vendredi|samedi)/.test(tout)){
    try{
      if(typeof chargerCreneaux === 'function' && typeof creneauxCalcules === 'function'){
        const e = await chargerCreneaux();
        const cr = creneauxCalcules(e.lecture, e.horaires).filter(c => ['ouvert', 'dispo', 'rien'].indexOf(c.genre) !== -1).slice(0, 30);
        if(cr.length){
          l.push('Créneaux de conduite libres (lus dans Drivup) :');
          cr.forEach(c => l.push('- ' + ((typeof jourLongCreneau === 'function') ? jourLongCreneau(c.jour) : c.jour) + ' de ' +
            String(c.debut).replace(':', 'h') + ' à ' + String(c.fin).replace(':', 'h') + (c.moniteur ? ' avec ' + c.moniteur : '')));
          sources.push('créneaux libres lus dans Drivup');
        }
      }
    }catch(e){ /* sans les créneaux */ }
  }
  /* les tarifs, quand il est question d'inscription ou de prix */
  if(/inscription|financement/.test(etiq) || /(tarif|prix|co[uû]t|combien|devis|forfait|inscri|€|euros?)/.test(tout)){
    try{
      if(typeof tarifsDuCatalogue === 'function'){
        const d = await tarifsDuCatalogue();
        if(d){
          const eu = n => (Math.round(Number(n) * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';
          l.push('Les tarifs de l’école (Outils › Tarifs) :');
          (d.taux || []).forEach(t => l.push('- ' + t.nom + ' : ' + eu(t.pu) + (t.bea && t.bea.pu && t.bea.pu !== t.pu ? ' (boîte automatique : ' + eu(t.bea.pu) + ')' : '')));
          (d.fiches || []).filter(x => x.type !== 'grille').slice(0, 40).forEach(x => {
            const tot = (typeof tfTotalDeLaFiche === 'function') ? essai(() => tfTotalDeLaFiche(d, x)) : null;
            l.push('- Forfait « ' + (x.titre || x.id) + ' »' + (x.dossier ? ' (' + x.dossier + ')' : '') + (tot ? ' : ' + eu(tot) : ''));
          });
          sources.push('vos tarifs');
        }
      }
    }catch(e){ /* sans les tarifs */ }
  }
  l.push('Le bureau de l’école : Saint-Brieuc et Loudéac ; on peut appeler le bureau au 09 83 55 56 87.');
  return { texte: l.join('\n'), sources: sources };
}

async function mlChargerLaReponse(style, refaire){
  const f = mlFilOuvert && mlFilOuvert.fil;
  if(!f) return;
  mlReponseClaude = { fil: f.id, style: style || 'normal', texte: '', enCours: true, erreur: '', sources: (mlReponseClaude && mlReponseClaude.fil === f.id) ? mlReponseClaude.sources : [] };
  mlRedessinerLaBoiteClaude();
  try{
    const c = await mlContexte(f);
    if(!mlFilOuvert || mlFilOuvert.fil.id !== f.id) return;
    mlReponseClaude.sources = c.sources;
    const r = await appelPrep({ action: 'mailClaudeReponse', id: f.id, style: style || 'normal', refaire: !!refaire, contexte: c.texte });
    if(!mlReponseClaude || mlReponseClaude.fil !== f.id) return;
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    mlReponseClaude.enCours = false;
    mlReponseClaude.texte = r.texte || '';
    mlReponseClaude.sans = !!r.sansReponse;
  }catch(e){
    if(mlReponseClaude && mlReponseClaude.fil === f.id){ mlReponseClaude.enCours = false; mlReponseClaude.erreur = String(e.message || e); }
  }
  mlRedessinerLaBoiteClaude();
}

function mlRedessinerLaBoiteClaude(){
  const vieille = document.querySelector('#mlFilMsgs .mlClaude');
  if(!vieille) return;
  const fil = $('mlFilMsgs');
  const enBas = fil.scrollHeight - fil.scrollTop - fil.clientHeight < 120;
  const neuve = mlBoiteClaude();
  if(neuve) vieille.replaceWith(neuve); else vieille.remove();
  /* la réponse qui arrive se voit, si on lisait le bas du fil */
  if(enBas) fil.scrollTop = fil.scrollHeight;
}

function mlBoutonClaude(texte, titre, faire, principal){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn ' + (principal ? 'btn-primary' : 'btn-secondary') + ' mlBtC';
  b.textContent = texte;
  if(titre) b.title = titre;
  b.addEventListener('click', async () => {
    if(b.disabled) return;
    b.disabled = true;
    try{ await faire(b); }catch(e){ mlToast('⚠️ ' + (e.message || e)); }
    b.disabled = false;
  });
  return b;
}

function mlBoiteClaude(){
  const F = mlFilOuvert;
  if(!F || !F.fil || !F.claude) return null;
  const f = F.fil;
  const msgs = F.messages || [];
  const dernier = msgs.filter(m => m.sens === 'recu').pop();
  if(!dernier) return null;
  const a = dernier.analyse;
  const d = document.createElement('div');
  d.className = 'mlClaude';
  const t = document.createElement('div');
  t.className = 'mlClT';
  t.textContent = '🤖 Claude a lu ce mail';
  d.appendChild(t);
  if(!a){
    const p = document.createElement('div');
    p.className = 'mlClR';
    p.textContent = 'Ce mail est arrivé avant que Claude soit allumé, ou il n’a pas encore eu le temps de le lire.';
    d.appendChild(p);
    const acts = document.createElement('div');
    acts.className = 'mlClActs';
    acts.appendChild(mlBoutonClaude('🤖 Le lire maintenant', '', async () => {
      const r = await appelPrep({ action: 'mailClaudeLire', id: f.id });
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
      dernier.analyse = r.analyse;
      await mlOuvrir(f.id);
    }));
    d.appendChild(acts);
    return d;
  }
  const r = document.createElement('div');
  r.className = 'mlClR';
  mlPoserLeGras(r, a.resume || '');
  d.appendChild(r);

  const acts = document.createElement('div');
  acts.className = 'mlClActs';
  if(mlPeutEcrire() && !f.eleve && f.propose){
    acts.appendChild(mlBoutonClaude('🔗 C’est ' + f.propose + ' : rattacher', 'Claude reconnaît cet élève dans le mail — à toi de confirmer, et de dire qui écrit',
      () => { mlNomPropose = f.propose; mlChoixEleveOuvert = true; mlDessinerLeFil(); }));
  }
  if(mlPeutEcrire() && !f.eleve && a.nouvelEleve){
    const n = ((a.nouvelEleve.prenom || '') + ' ' + (a.nouvelEleve.nom || '')).trim();
    acts.appendChild(mlBoutonClaude('➕ Créer la fiche de ' + n, 'Une nouvelle fiche élève, et ce mail rejoint son dossier', () => mlCreerLaFiche(n)));
  }
  if(a.tache && (typeof aDroit !== 'function' || aDroit('todo'))){
    acts.appendChild(mlBoutonClaude('☑️ En faire une tâche : « ' + a.tache + ' »', 'Ajoutée à ta journée (☑️ À faire)', async b => {
      const texte = ('✉️ ' + a.tache + (f.eleve ? ' — ' + f.eleve : f.nom ? ' — ' + f.nom : '')).slice(0, 200);
      const x = await appelPrep({ action: 'todoJourneeEcrire', quoi: 'ajouter', texte: texte });
      if(x && x.status === 'error') throw new Error(x.message || 'refusé');
      b.textContent = '☑️ Ajoutée à ta journée';
      mlToast('☑️ Ajoutée à ta journée');
      setTimeout(() => { b.disabled = true; }, 0);
    }));
  }
  if(acts.children.length) d.appendChild(acts);

  /* La réponse proposée */
  const nous = msgs.length && msgs[msgs.length - 1].sens === 'envoye';
  if(!mlPeutEcrire()) return d;
  if(a.repondre === false || nous){
    const n = document.createElement('div');
    n.className = 'mlClLab';
    n.textContent = nous ? '↩️ La dernière réponse est partie : rien à proposer.' : 'Pas de réponse à proposer (notification, ou adresse « ne pas répondre »).';
    d.appendChild(n);
    return d;
  }
  if(!mlReponseClaude || mlReponseClaude.fil !== f.id){
    if(a.reponse && (a.reponseStyle || 'normal') === 'normal'){
      mlReponseClaude = { fil: f.id, style: 'normal', texte: a.reponse, enCours: false, erreur: '', sources: [] };
    }else setTimeout(() => mlChargerLaReponse('normal'), 0);
  }
  const R = (mlReponseClaude && mlReponseClaude.fil === f.id) ? mlReponseClaude : { enCours: true, sources: [] };
  if(R.sans){
    const n = document.createElement('div');
    n.className = 'mlClLab';
    n.textContent = 'Pas de réponse à proposer (adresse « ne pas répondre »).';
    d.appendChild(n);
    return d;
  }
  const lab = document.createElement('div');
  lab.className = 'mlClLab';
  lab.textContent = 'Réponse proposée' + ((R.sources || []).length ? ' (' + R.sources.join(', ') + ')' : '') + ' — rien ne part sans toi';
  d.appendChild(lab);
  const prop = document.createElement('div');
  prop.className = 'mlClProp' + (R.enCours ? ' attente' : '');
  prop.textContent = R.enCours ? '⏳ Claude prépare une réponse…' : R.erreur ? '⚠️ ' + R.erreur : R.texte;
  d.appendChild(prop);
  const b2 = document.createElement('div');
  b2.className = 'mlClActs';
  const pret = !R.enCours && !R.erreur && !!R.texte;
  const ouvrir = mlBoutonClaude('✏️ L’ouvrir dans l’éditeur', 'Tu relis, tu corriges, tu envoies', () =>
    mlOuvrirLEditeur({ mode: 'repondre', texteHtml: mlTexteEnHtml(R.texte) }), true);
  ouvrir.disabled = !pret;
  b2.appendChild(ouvrir);
  [['🔄 Une autre', 'autre'], ['✂️ Plus courte', 'courte'], ['🙂 Plus chaleureuse', 'chaleureuse']].forEach(([t, st]) => {
    const b = mlBoutonClaude(t, '', () => mlChargerLaReponse(st, true));
    b.disabled = !!R.enCours;
    b2.appendChild(b);
  });
  d.appendChild(b2);
  return d;
}

/* ➕ La fiche d'un nouvel élève (une demande d'inscription) */
async function mlCreerLaFiche(propose){
  const f = mlFilOuvert && mlFilOuvert.fil;
  if(!f || typeof choisirEleveConnu !== 'function') return;
  const nom = await choisirEleveConnu('➕ Créer sa fiche élève',
    'Son prénom et son nom. L’adresse de la personne qui a écrit est reprise sur la fiche, et ce mail rejoint son dossier.', propose || '');
  if(!nom) return;
  const norm = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const connu = ((typeof elevesConnus !== 'undefined' && elevesConnus) || []).some(n => norm(n) === norm(nom));
  if(connu && !await confirmer('« ' + nom + ' » a déjà un dossier.\n\nY rattacher ce mail, sans toucher à sa fiche ?', '🔗 Rattacher')) return;
  const fiche = { email: f.correspondant || '', remarques: 'Premier contact : mail de ' + (f.nom || f.correspondant) + ' le ' + mlJourDe(f.premierLe || Date.now()) + '.' };
  if(!connu){
    const r = await appelPrep(Object.assign({ action: 'ficheSet', eleve: nom }, fiche));
    if(r && r.status === 'error') throw new Error(r.message || 'refusé');
    if(typeof elevesConnus !== 'undefined' && Array.isArray(elevesConnus) && elevesConnus.indexOf(nom) === -1) elevesConnus.push(nom);
  }
  await mlMarquer({ eleve: nom }, connu ? '🔗 Rattaché au dossier de ' + nom : '➕ Fiche créée pour ' + nom);
  if(!connu && typeof ouvrirFicheEleve === 'function'){
    const deja = (typeof ficheDe === 'function' && ficheDe(nom)) || {};
    ouvrirFicheEleve(nom, Object.assign({}, deja, fiche));
  }
}

/* 🤖 ▾ dans l'éditeur : la partie écrite (au-dessus de la signature et
   de la citation) part chez Claude, et revient retouchée. */
function mlPartieEcrite(zone){
  const l = [];
  for(const n of Array.from(zone.childNodes)){
    if(n.nodeType === 1 && (n.classList.contains('mlSignature') || n.classList.contains('mlCitation'))) break;
    l.push(n);
  }
  while(l.length && l[l.length - 1].nodeType === 1 && !String(l[l.length - 1].textContent || '').trim() && !l[l.length - 1].querySelector('img')) l.pop();
  return l;
}
function mlMenuClaudeEditeur(ancre, ed, surChange){
  const items = [];
  const R = mlReponseClaude && mlFilOuvert && mlFilOuvert.fil && mlReponseClaude.fil === mlFilOuvert.fil.id && mlReponseClaude.texte ? mlReponseClaude : null;
  if(R) items.push({ emoji: '📥', texte: 'Reprendre la réponse proposée', faire: () => {
    const parts = mlPartieEcrite(ed.zone);
    const h = mlTexteEnHtml(R.texte);
    if(parts.length){ const t = document.createElement('template'); t.innerHTML = h; parts[0].before(t.content); parts.forEach(n => n.remove()); }
    else ed.zone.insertAdjacentHTML('afterbegin', h);
    surChange();
  } });
  const retouche = (emoji, texte, consigne) => items.push({ emoji, texte, faire: async () => {
    const parts = mlPartieEcrite(ed.zone);
    const html = parts.map(n => n.nodeType === 1 ? n.outerHTML : mlEch(n.textContent)).join('');
    if(!html.replace(/<[^>]+>/g, '').trim()){ mlToast('Écris d’abord quelque chose au-dessus de la signature.'); return; }
    mlToast('🤖 Claude retouche ton texte…');
    const r = await appelPrep({ action: 'mailClaudeEditer', html: html, consigne: consigne });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    const t = document.createElement('template');
    t.innerHTML = r.html;
    parts[0].before(t.content);
    parts.forEach(n => n.remove());
    surChange();
    mlToast('🤖 Retouché — ↶ pour revenir');
  } });
  retouche('✍️', 'Reformuler (plus clair)', 'reformuler');
  retouche('✂️', 'Plus court', 'courte');
  retouche('🙂', 'Plus chaleureux', 'chaleureuse');
  retouche('🔤', 'Corriger les fautes', 'fautes');
  menuGestesEC(ancre, '🤖 Claude', items);
}

/* ------------------------------------------------------------
   📒 LE CARNET D'ADRESSES — v1338

   David : « dans À il faut que l'on puisse choisir un élève, écrire
   directement une adresse mail et avoir un carnet d'adresses avec la
   possibilité de garder des adresses mails sans que ce soit un élève,
   je pense à France Travail, les différents mails de la DDTM ».
   ------------------------------------------------------------ */
let mlCarnetDonnees = null, mlCarnetLuLe = 0, mlCarnetEnLecture = null;
async function mlChargerLeCarnet(forcer){
  if(!forcer && mlCarnetDonnees && Date.now() - mlCarnetLuLe < 120000) return mlCarnetDonnees;
  if(mlCarnetEnLecture) return mlCarnetEnLecture;
  mlCarnetEnLecture = (async () => {
    try{
      const r = await appelPrep({ action: 'mailCarnet' });
      mlCarnetDonnees = { carnet: (r && r.carnet) || [], eleves: (r && r.eleves) || [], recents: (r && r.recents) || [] };
      mlCarnetLuLe = Date.now();
    }catch(e){ mlCarnetDonnees = mlCarnetDonnees || { carnet: [], eleves: [], recents: [] }; }
    mlCarnetEnLecture = null;
    return mlCarnetDonnees;
  })();
  return mlCarnetEnLecture;
}
function mlNormC(t){ return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
/* Ce qui ressemble à ce qu'on tape : le carnet et les élèves d'abord,
   puis les adresses déjà écrites ; un nom qui COMMENCE par le mot passe devant */
function mlSuggestions(q){
  const d = mlCarnetDonnees;
  const k = mlNormC(q);
  if(!d || !k) return [];
  const out = [], vues = {};
  const tester = (o, sorte) => {
    if(o.adresse && vues[o.adresse]) return;
    const texte = mlNormC(o.nom + ' ' + (o.adresse || '') + ' ' + (o.note || ''));
    if(texte.indexOf(k) === -1) return;
    if(o.adresse) vues[o.adresse] = true;
    const debut = mlNormC(o.nom).indexOf(k) === 0 || mlNormC(o.nom).indexOf(' ' + k) !== -1 || mlNormC(o.adresse).indexOf(k) === 0;
    out.push(Object.assign({ sorte: sorte, rang: (debut ? 0 : 1) + (o.adresse ? 0 : 2) }, o));
  };
  d.carnet.forEach(o => tester(o, 'carnet'));
  d.eleves.forEach(o => tester(o, 'eleve'));
  d.recents.forEach(o => tester(o, 'recent'));
  return out.sort((a, b) => a.rang - b.rang).slice(0, 8);
}

async function mlFenetreCarnet(opts){
  const o = opts || {};
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal mlFenetre mlCarnet';
  boite.style.maxWidth = 'min(640px, 96vw)';
  fond.appendChild(boite);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  let filtre = '', cherche = '', edition = null;
  const ajoutes = [];
  const dessiner = () => {
    const d = mlCarnetDonnees || { carnet: [], eleves: [], recents: [] };
    boite.innerHTML = '<h3>📒 Carnet d’adresses</h3><div class="mlAide">Les élèves (l’adresse de leur fiche), les adresses gardées pour toute l’école ' +
      '(France Travail, la DDTM, la préfecture…), et celles à qui la boîte a déjà écrit.' + (o.ajouter ? ' Un appui sur ➕ l’ajoute au mail.' : '') + '</div>';
    const f = document.createElement('div');
    f.className = 'mlPuces mlCarnetFiltres';
    [['', 'Tout'], ['carnet', '📒 Carnet · ' + d.carnet.length], ['eleve', '👤 Élèves'], ['recent', '✉️ Déjà écrites']].forEach(([k, t]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rrFiltre' + (filtre === k ? ' on' : '');
      b.textContent = t;
      b.addEventListener('click', () => { filtre = k; dessiner(); });
      f.appendChild(b);
    });
    boite.appendChild(f);
    const ch = document.createElement('input');
    ch.type = 'text';
    ch.className = 'mlCarnetCherche';
    ch.placeholder = '🔍 Un nom, une adresse…';
    ch.value = cherche;
    ch.addEventListener('input', () => { cherche = ch.value; dessinerListe(); });
    boite.appendChild(ch);
    const zl = document.createElement('div');
    zl.className = 'mlCorbeille mlCarnetListe';
    boite.appendChild(zl);
    function dessinerListe(){
      zl.innerHTML = '';
      const k = mlNormC(cherche);
      const vues = {};
      const lignes = [];
      const garder = (x, sorte) => {
        if(filtre && filtre !== sorte) return;
        if(x.adresse && vues[x.adresse] && sorte === 'recent') return;
        if(k && mlNormC(x.nom + ' ' + (x.adresse || '') + ' ' + (x.note || '')).indexOf(k) === -1) return;
        if(x.adresse) vues[x.adresse] = true;
        lignes.push(Object.assign({ sorte: sorte }, x));
      };
      d.carnet.forEach(x => garder(x, 'carnet'));
      d.eleves.forEach(x => garder(x, 'eleve'));
      d.recents.forEach(x => garder(x, 'recent'));
      if(!lignes.length){ zl.innerHTML = '<div class="empty">' + (mlCarnetDonnees ? 'Rien ici.' : 'Lecture du carnet…') + '</div>'; return; }
      lignes.slice(0, 200).forEach(x => {
        const l = document.createElement('div');
        l.className = 'mlPub mlCarnetLigne';
        l.dataset.sorte = x.sorte;
        l.innerHTML = '<div class="g"><b></b><div class="s"></div></div>';
        l.querySelector('b').textContent = ({ eleve: '👤 ', carnet: '📒 ', recent: '✉️ ' })[x.sorte] + (x.nom || x.adresse);
        l.querySelector('.s').textContent = (x.adresse || 'pas d’adresse sur sa fiche') + (x.note ? ' · ' + x.note : '');
        if(o.ajouter && x.adresse){
          const pris = ajoutes.indexOf(x.adresse) !== -1;
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn ' + (pris ? 'btn-secondary' : 'btn-primary');
          b.textContent = pris ? '✓ Ajouté' : '➕';
          b.title = 'L’ajouter aux destinataires';
          b.disabled = pris;
          b.addEventListener('click', () => { o.ajouter({ nom: x.nom, adresse: x.adresse }); ajoutes.push(x.adresse); dessinerListe(); });
          l.appendChild(b);
        }
        if(mlPeutEcrire() && x.sorte === 'carnet'){
          const e = document.createElement('button');
          e.type = 'button'; e.className = 'btn btn-secondary'; e.textContent = '✏️'; e.title = 'Modifier';
          e.addEventListener('click', () => { edition = Object.assign({}, x); dessiner(); });
          const s2 = document.createElement('button');
          s2.type = 'button'; s2.className = 'btn btn-secondary'; s2.textContent = '🗑️'; s2.title = 'Retirer du carnet';
          s2.addEventListener('click', async () => {
            if(!await confirmer('Retirer « ' + (x.nom || x.adresse) + ' » du carnet ?', '🗑️ Retirer', true)) return;
            const r = await appelPrep({ action: 'mailCarnetRetirer', id: x.id });
            if(r && r.carnet){ mlCarnetDonnees = { carnet: r.carnet, eleves: r.eleves || [], recents: r.recents || [] }; mlCarnetLuLe = Date.now(); }
            dessiner();
          });
          l.append(e, s2);
        }else if(mlPeutEcrire() && x.sorte === 'recent'){
          const g = document.createElement('button');
          g.type = 'button'; g.className = 'btn btn-secondary'; g.textContent = '📒'; g.title = 'La garder dans le carnet';
          g.addEventListener('click', () => { edition = { nom: x.nom, adresse: x.adresse, note: '' }; dessiner(); });
          l.appendChild(g);
        }
        zl.appendChild(l);
      });
    }
    dessinerListe();
    /* ➕ une adresse à garder (ou ✏️ celle qu'on modifie) */
    if(mlPeutEcrire()){
      if(edition){
        const fo = document.createElement('div');
        fo.className = 'mlCarnetForm';
        fo.innerHTML = '<label>Nom (ce qu’on tape pour la retrouver)</label><input type="text" id="mlCarNom" placeholder="Ex : France Travail Saint-Brieuc">' +
          '<label>Adresse mail</label><input type="email" id="mlCarAdr" placeholder="prenom.nom@exemple.fr">' +
          '<label>Note (facultatif)</label><input type="text" id="mlCarNote" placeholder="Ex : conseillère de Lucas, dossiers CPF">';
        fo.querySelector('#mlCarNom').value = edition.nom || '';
        fo.querySelector('#mlCarAdr').value = edition.adresse || '';
        fo.querySelector('#mlCarNote').value = edition.note || '';
        const r = document.createElement('div');
        r.className = 'btn-row';
        const a = document.createElement('button'); a.className = 'btn btn-secondary'; a.textContent = 'Annuler';
        a.addEventListener('click', () => { edition = null; dessiner(); });
        const ok = document.createElement('button'); ok.className = 'btn btn-primary'; ok.id = 'mlCarGarder'; ok.textContent = '💾 Garder dans le carnet';
        ok.addEventListener('click', async () => {
          ok.disabled = true;
          try{
            const x = await appelPrep({ action: 'mailCarnetPoser', id: edition.id || 0, nom: fo.querySelector('#mlCarNom').value,
              adresse: fo.querySelector('#mlCarAdr').value, note: fo.querySelector('#mlCarNote').value });
            if(!x || x.status !== 'ok') throw new Error((x && x.message) || 'refusé');
            mlCarnetDonnees = { carnet: x.carnet || [], eleves: x.eleves || [], recents: x.recents || [] }; mlCarnetLuLe = Date.now();
            mlToast('📒 Gardée dans le carnet');
            edition = null; filtre = 'carnet'; dessiner();
          }catch(e){ ok.disabled = false; mlToast('⚠️ ' + (e.message || e)); }
        });
        r.append(a, ok);
        fo.appendChild(r);
        boite.appendChild(fo);
        setTimeout(() => fo.querySelector(edition.nom ? '#mlCarNote' : '#mlCarNom').focus(), 50);
      }else{
        const n = document.createElement('button');
        n.type = 'button';
        n.className = 'btn btn-secondary mlCarNouv';
        n.textContent = '➕ Nouvelle adresse dans le carnet';
        n.addEventListener('click', () => { edition = { nom: '', adresse: '', note: '' }; dessiner(); });
        boite.appendChild(n);
      }
    }
    const rang = document.createElement('div');
    rang.className = 'btn-row';
    const bF = document.createElement('button');
    bF.className = 'btn btn-primary';
    bF.textContent = o.ajouter ? '✓ Fini' : 'Fermer';
    bF.addEventListener('click', fermer);
    rang.appendChild(bF);
    boite.appendChild(rang);
  };
  dessiner();
  document.body.appendChild(fond);
  await mlChargerLeCarnet(true);
  dessiner();
}

/* 🗑️ SUPPRIMER — v1338. David : « il me manque pour supprimer un mail ».
   0 : la conversation entière ; sinon un message. */
async function mlSupprimer(idMessage){
  const F = mlFilOuvert;
  if(!F || !F.fil) return;
  const f = F.fil;
  const m = idMessage ? (F.messages || []).find(x => x.id === idMessage) : null;
  const envoye = m ? m.sens === 'envoye' : (F.messages || []).some(x => x.sens === 'envoye');
  const quoi = m ? 'ce mail' : 'cette conversation (' + (F.messages || []).length + ' mail' + ((F.messages || []).length > 1 ? 's' : '') + ')';
  if(!await confirmer('Supprimer ' + quoi + ' ?\n\nLes mails reçus partent à la corbeille de la boîte OVH : ⋯ › 🗑️ Corbeille les remet.' +
      (envoye ? '\nCe que l’école a envoyé reste dans les « Envoyés » du webmail.' : ''), '🗑️ Supprimer', true)) return;
  const r = await appelPrep({ action: 'mailSupprimer', id: f.id, message: idMessage || 0 });
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
  mlToast(r.filSupprime ? '🗑️ Conversation supprimée' : '🗑️ Mail supprimé');
  if(r.filSupprime){
    mlFils = mlFils.filter(x => x.id !== f.id);
    mlFermerLeFil();
  }else await mlOuvrir(f.id);
  mlLueLe = 0;
  mlCharger(true);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-boite-mail.js'] = true;
