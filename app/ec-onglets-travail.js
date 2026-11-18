/* Déployé le 17/11/2026 à 17:12 — v1455 */
/* ============================================================
   ec-onglets-travail.js — v1455
   🗂️ LES ONGLETS DANS L'APPLI
   (livraison 1 : les onglets — livraison 2, v1455 : le côte à côte
   du grand écran, et les onglets qu'on déplace en les faisant glisser)

   David, le 17 novembre : « est-ce qu'on peut faire des onglets dans
   l'app ? Quand je suis à un endroit et que je veux ouvrir par exemple
   le dossier élève, en ayant à côté là où je suis déjà, je ne peux
   pas. En cliquant sur clic molette par exemple. […] Je ne voudrais
   pas un nouvel onglet ou une nouvelle fenêtre. »

   Ses réponses au schéma (17/11) : n'importe quel écran s'ouvre en
   onglet ; clic molette, Ctrl + clic, clic droit, appui long sur la
   tablette ; on retrouve les onglets en rouvrant l'appli (sur cet
   appareil) ; 8 au plus, le plus ancien se ferme tout seul.
   Puis (17/11) : « Prévois qu'on puisse déplacer les onglets comme on
   veut » → on les fait glisser dans la rangée (et dans la liste du
   téléphone) ; glissé vers la droite de l'écran, un onglet passe à côté.

   ⚠️ UN ONGLET EST UN ENDROIT, PAS UNE DEUXIÈME APPLI. Les écrans de
   l'appli vivent chacun dans UN cadre de la page (le dossier dans
   #pageEleveDossier, la messagerie dans sa zone…). Un onglet retient
   donc OÙ l'on était — l'onglet du haut, la vue du rail, l'élève et
   l'onglet de son dossier, la conversation ou le mail ouvert, le
   défilement — et y retourne avec les portes de l'appli
   (afficherOnglet, afficherVue, ouvrirPageEleve, ouvrirLeFilPartout,
   mlOuvrirPartout). Les brouillons qui existent déjà (messagerie,
   mails) restent ; un formulaire pas encore enregistré peut se perdre.

   ⚠️ « OUVRIR DANS UN ONGLET » NE CLIQUE PAS POUR DE VRAI. Pour savoir
   où mène un bouton sans y aller, on le « sonde » : le clic part, mais
   les portes de navigation ne font que NOTER où elles iraient, et tout
   ce qui agit est bouché le temps de la sonde — le réseau (appelPrep,
   fetch), les fenêtres (fenetre, confirmer, demander, informer, les
   menus), window.open. Un bouton « Supprimer » qui demande confirmation
   reste donc en attente pour toujours, et rien ne part au classeur.
   En plus, les boutons dont le nom dit une action (Envoyer,
   Enregistrer, Supprimer, Valider, 🗑️, 💾…) ne sont jamais sondés.

   ◫ LE CÔTE À CÔTE (v1455). Sur le grand écran du bureau, un endroit
   s'ouvre dans un panneau à droite, l'écran en cours restant à gauche
   (la messagerie range alors sa colonne « Infos » d'elle-même : elle se
   règle sur sa largeur). Le panneau est l'appli elle-même, chargée dans
   un cadre (index.html?cote=1) : sa propre copie de chaque écran, donc
   n'importe quel endroit marche à côté sans rien casser à gauche. Dans
   ce cadre, la session est celle de l'appli (reprendreSession, sans
   revérifier le code), rien n'est retenu (onglet, vue, onglets), et
   « Ouvrir dans un onglet » ouvre l'onglet dans l'appli de gauche.
   ⤢ le met en grand (il devient l'onglet actif, l'écran d'avant reste
   un onglet), 🗂️ en fait un onglet, ✕ le ferme ; la poignée règle sa
   largeur. Sur la tablette et le téléphone, ou si la fenêtre devient
   trop étroite, « à côté » devient un onglet.
   ⚠️ Ce qui change dans le panneau ne se voit à gauche qu'au prochain
   chargement de cet écran (ce sont deux copies), comme sur deux appareils.
   ============================================================ */

const OT_MAX = 8;
const OT_COTE_MIN_ECRAN = 1200;   /* en dessous, « à côté » devient un onglet */
const OT_COTE_MIN = 420;          /* largeur du panneau */
const OT_COTE_GAUCHE = 560;       /* ce qui reste au moins à gauche */
/* Les lignes qui ont déjà leur menu (appui long, clic droit) : « 🗂️ Ouvrir
   dans un onglet » est dans ce menu-là (menuDeLaLigneEC), le nôtre ne
   s'y ajoute pas. Le clic molette et Ctrl + clic y marchent. */
const OT_A_SON_MENU = '.ckIt';
/* Les mots (et les signes) d'un bouton qui AGIT : on ne le sonde pas */
const OT_NON = /supprim|effac|envoy|enregistr|valid|retir|ferm|copi|imprim|t[ée]l[ée]charg|annul|d[ée]coch|coch|d[ée]connect|vider|jeter|rejet|refus|accept|pay|export|partag|publi|termin|d[ée]marr|lanc|ajout|cr[ée]e|modifi|renvoy|relanc|r[ée]pond|transf[ée]r|dict|appeler|sauv|joindre|bloqu|archiv|restaur|marquer|🗑|💾|📋|✕|×|✓|✅|❌|📤|➤|🎙|📞|📷|🎤/i;

let otListe = [];           /* [{ id, p, ic, t, vu, neuf }] */
let otActif = '';
let otCapture = null;       /* pendant une sonde : ce que les portes ont noté */
let otSondeEnCours = false;
let otEnRoute = false;
let otMinSuivi = null;
let otIgnorerClicJusqua = 0;
let otMenuOuvertJusqua = 0;
let otApresGlisse = 0;      /* le clic qui suit un glisser ne compte pas */
let otCote = null;          /* le panneau d'à côté : { el, poignee, cadre, fen, p, voulu } */

function otPossible(){
  if(typeof seuleMessagerieEC === 'function' && seuleMessagerieEC()) return false;
  return !!(typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur);
}
function otCle(){ return 'ec_onglets_travail:' + String((typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || ''); }
function otId(){ return 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function otEch(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* ------------------------------------------------------------
   OÙ L'ON EST, ET COMMENT ÇA S'APPELLE
   ------------------------------------------------------------ */
function otPlaceIci(){
  const o = (typeof ongletActif !== 'undefined') ? ongletActif : '';
  const v = (typeof vueActive !== 'undefined' && vueActive[o]) || '';
  const p = { onglet: o, vue: v, y: Math.round(window.scrollY || 0) };
  if(o === 'eleves' && v === 'dossier' && typeof elevePageOuverte !== 'undefined' && elevePageOuverte){
    p.eleve = elevePageOuverte;
    if(typeof ongletPageEleve !== 'undefined' && ongletPageEleve) p.dossier = ongletPageEleve;
  }
  if(o === 'messagerie'){
    if(typeof mlFilOuvert !== 'undefined' && mlFilOuvert && mlFilOuvert.fil) p.mail = mlFilOuvert.fil.id;
    else if(typeof filOuvertEC !== 'undefined' && filOuvertEC && filOuvertEC.conv) p.conv = filOuvertEC.conv.id;
  }
  return p;
}
function otOngletDuHaut(o){
  const b = document.querySelector('#barreOnglets .onglet[data-cible="' + o + '"]');
  if(!b) return { ic: '🗂️', nom: o || 'Écran' };
  const s = b.querySelector('span');
  const ic = s ? s.textContent.trim() : '🗂️';
  const nom = b.textContent.replace(s ? s.textContent : '', '').replace(/\s+/g, ' ').trim();
  return { ic: ic, nom: nom };
}
function otNomDeLaVue(o, v){
  const l = ((typeof VUES !== 'undefined' && VUES[o]) || []).find(x => x[0] === v);
  return l ? String(l[1]).replace(/^\S+\s+/, '') : '';
}
function otTitre(p){
  if(p.eleve) return { ic: '👤', t: p.eleve };
  if(p.conv){
    const c = ((typeof conversationsEC !== 'undefined' && conversationsEC) || []).find(x => x.id === p.conv) ||
      ((typeof filOuvertEC !== 'undefined' && filOuvertEC && filOuvertEC.conv && filOuvertEC.conv.id === p.conv) ? filOuvertEC.conv : null);
    const nom = c ? (c.eleve || c.titre || '') : '';
    return { ic: '💬', t: 'Messagerie' + (nom ? ' · ' + nom : '') };
  }
  if(p.mail){
    const f = ((typeof mlFils !== 'undefined' && mlFils) || []).find(x => x.id === p.mail) ||
      ((typeof mlFilOuvert !== 'undefined' && mlFilOuvert && mlFilOuvert.fil && mlFilOuvert.fil.id === p.mail) ? mlFilOuvert.fil : null);
    const nom = f ? (f.eleve || f.nom || f.sujet || '') : '';
    return { ic: '✉️', t: 'Mail' + (nom ? ' · ' + nom : '') };
  }
  const h = otOngletDuHaut(p.onglet);
  const v = otNomDeLaVue(p.onglet, p.vue);
  return { ic: h.ic, t: h.nom + (v && v !== h.nom ? ' · ' + v : '') + (p.viser ? ' · ' + p.viser : '') };
}
function otMemeEndroit(a, b){
  if(!a || !b) return false;
  if(a.eleve || b.eleve) return a.eleve === b.eleve;
  if(a.conv || b.conv) return a.conv === b.conv;
  if(a.mail || b.mail) return a.mail === b.mail;
  if(a.viser || b.viser) return a.viser === b.viser && a.onglet === b.onglet;
  return a.onglet === b.onglet && (a.vue || '') === (b.vue || '');
}

/* ------------------------------------------------------------
   GARDER SUR CET APPAREIL (ses réponses : on les retrouve)
   ------------------------------------------------------------ */
function otGarder(){
  if(window.EC_COTE) return;              /* le panneau d'à côté ne retient rien */
  try{
    const cote = otCote ? (otCote.p || otCote.voulu) : null;
    if(otListe.length < 2 && !cote) localStorage.removeItem(otCle());
    else localStorage.setItem(otCle(), JSON.stringify({
      liste: otListe.length < 2 ? [] : otListe.map(x => ({ id: x.id, p: x.p, ic: x.ic, t: x.t, vu: x.vu })),
      actif: otActif, cote: cote || null }));
  }catch(e){}
}
function otLire(){
  try{
    const d = JSON.parse(localStorage.getItem(otCle()) || 'null');
    if(d && Array.isArray(d.liste)) return d;
  }catch(e){}
  return null;
}

/* ------------------------------------------------------------
   ALLER QUELQUE PART, avec les portes de l'appli
   ------------------------------------------------------------ */
let otTour = 0;
function otAller(p){
  const tour = ++otTour;
  otEnRoute = true;
  try{
    if(p.eleve && typeof ouvrirPageEleve === 'function'){
      ouvrirPageEleve(p.eleve);
      if(p.dossier && typeof choisirOngletEleve === 'function' &&
         typeof ongletPageEleve !== 'undefined' && ongletPageEleve !== p.dossier) choisirOngletEleve(p.dossier);
    }else if(p.conv && typeof ouvrirLeFilPartout === 'function'){
      ouvrirLeFilPartout(p.conv);
    }else if(p.mail && typeof mlOuvrirPartout === 'function'){
      mlOuvrirPartout(p.mail);
    }else if(p.onglet && typeof afficherOnglet === 'function'){
      afficherOnglet(p.onglet);
      if(p.vue && typeof VUES !== 'undefined' && VUES[p.onglet] && typeof afficherVue === 'function') afficherVue(p.onglet, p.vue);
      if(p.viser && typeof viserLaPersonne === 'function') viserLaPersonne(p.viser);
    }
  }catch(e){ console.warn('Onglet :', e); }
  /* Le défilement d'où l'on était — après que l'écran s'est dessiné
     (afficherOnglet remonte en haut en douceur) */
  const y = Number(p.y || 0);
  if(y > 0 && !p.viser){
    [380, 950].forEach(t => setTimeout(() => { if(tour === otTour) window.scrollTo(0, y); }, t));
  }
  setTimeout(() => { if(tour === otTour){ otEnRoute = false; otSuivre(); } }, 1100);
}

/* ------------------------------------------------------------
   LES GESTES SUR LA RANGÉE
   ------------------------------------------------------------ */
function otBasculer(id){
  if(id === otActif) return;
  const b = otListe.find(x => x.id === id);
  if(!b) return;
  const a = otListe.find(x => x.id === otActif);
  if(a){ a.p = otPlaceIci(); Object.assign(a, otTitre(a.p)); }
  otActif = id;
  b.vu = Date.now();
  b.neuf = false;
  otGarder();
  otDessiner();
  otAller(b.p);
}
function otFermer(id){
  const i = otListe.findIndex(x => x.id === id);
  if(i < 0) return;
  const etaitActif = (id === otActif);
  otListe.splice(i, 1);
  if(etaitActif && otListe.length){
    const n = otListe[Math.min(i, otListe.length - 1)];
    otActif = n.id;
    n.vu = Date.now();
    otAller(n.p);
  }
  /* Un seul onglet restant : la rangée s'en va, on revient à l'appli
     d'avant (elle retient déjà son onglet et sa vue) */
  if(otListe.length < 2){ otListe = []; otActif = ''; }
  otGarder();
  otDessiner();
}
/* ＋ : un autre onglet au même endroit, et on y passe */
function otDupliquer(){
  otAjouter(otPlaceIci(), true, true);
}
function otPremierOnglet(){
  if(otListe.length) return;
  const ici = otPlaceIci();
  const t0 = Object.assign({ id: otId(), p: ici, vu: Date.now() }, otTitre(ici));
  otListe.push(t0);
  otActif = t0.id;
}
function otAjouter(p, activer, memeSiDeja){
  if(!p || !otPossible()) return;
  /* ◫ dans le panneau d'à côté : l'onglet s'ouvre dans l'appli de gauche */
  if(window.EC_COTE){
    try{ return window.parent.otAjouter(JSON.parse(JSON.stringify(p)), false); }catch(e){ return; }
  }
  if(!memeSiDeja){
    const deja = otListe.find(x => otMemeEndroit(x.p, p));
    if(deja){
      if(deja.id === otActif){ if(typeof showToast === 'function') showToast('C’est déjà l’onglet ouvert.'); return; }
      deja.neuf = true; otDessiner();
      setTimeout(() => { deja.neuf = false; otDessiner(); }, 1600);
      if(typeof showToast === 'function') showToast('🗂️ « ' + deja.t + ' » est déjà ouvert, en haut');
      return;
    }
  }
  otPremierOnglet();
  const ici = otListe.find(x => x.id === otActif);
  if(ici){ ici.p = otPlaceIci(); Object.assign(ici, otTitre(ici.p)); }
  const t = Object.assign({ id: otId(), p: p, vu: Date.now(), neuf: !activer }, otTitre(p));
  otListe.push(t);
  /* 8 au plus : le plus ancien (le moins regardé) se ferme tout seul */
  let parti = null;
  while(otListe.length > OT_MAX){
    const vieux = otListe.filter(x => x.id !== otActif && x.id !== t.id).sort((a, b) => (a.vu || 0) - (b.vu || 0))[0];
    if(!vieux) break;
    parti = vieux;
    otListe.splice(otListe.indexOf(vieux), 1);
  }
  if(activer){
    otActif = t.id;
    otGarder(); otDessiner();
    otAller(t.p);
  }else{
    otGarder(); otDessiner();
    if(typeof showToast === 'function'){
      showToast('🗂️ « ' + t.t + ' » ouvert dans un onglet, en haut' + (parti ? ' (« ' + parti.t + ' » s’est fermé : 8 au plus)' : ''));
    }
    setTimeout(() => { t.neuf = false; otDessiner(); }, 1600);
  }
}

/* Après une navigation ordinaire, l'onglet actif suit */
function otSuivre(){
  if(otCapture || otEnRoute) return;
  if(window.EC_COTE){ otCoteSignaler(); return; }
  if(!otListe.length) return;
  clearTimeout(otMinSuivi);
  otMinSuivi = setTimeout(() => {
    const a = otListe.find(x => x.id === otActif);
    if(!a) return;
    a.p = otPlaceIci();
    Object.assign(a, otTitre(a.p));
    a.vu = Date.now();
    otGarder();
    otDessiner();
  }, 400);
}

/* ------------------------------------------------------------
   LA RANGÉE « OUVERTS », et sur le téléphone le bouton 🗂️
   ------------------------------------------------------------ */
function otDessiner(){
  if(window.EC_COTE) return;
  const nav = document.getElementById('barreOnglets');
  let z = document.getElementById('ongTravail');
  if(!z && nav && nav.parentNode){
    z = document.createElement('div');
    z.id = 'ongTravail';
    z.className = 'ongT';
    z.setAttribute('role', 'tablist');
    z.setAttribute('aria-label', 'Onglets ouverts');
    nav.parentNode.insertBefore(z, nav.nextSibling);
  }
  const montrer = otListe.length >= 2;
  document.body.classList.toggle('avecOngletsTravail', montrer);
  if(z){
    z.style.display = montrer ? '' : 'none';
    z.innerHTML = '';
    if(montrer){
      const lab = document.createElement('span');
      lab.className = 'lab';
      lab.textContent = 'Ouverts';
      z.appendChild(lab);
      otListe.forEach(x => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = (x.id === otActif ? 'on' : '') + (x.neuf ? ' neuf' : '');
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', x.id === otActif ? 'true' : 'false');
        b.dataset.ot = x.id;
        b.title = x.t;
        b.innerHTML = '<span class="ic">' + otEch(x.ic) + '</span><span class="t">' + otEch(x.t) + '</span>' +
          '<span class="x" role="button" aria-label="Fermer l’onglet" title="Fermer">✕</span>';
        b.addEventListener('click', ev => {
          if(Date.now() < otApresGlisse){ ev.preventDefault(); return; }
          if(ev.target.closest('.x')){ ev.stopPropagation(); otFermer(x.id); return; }
          otBasculer(x.id);
        });
        /* le clic molette sur un onglet le ferme, comme partout */
        b.addEventListener('auxclick', ev => { if(ev.button === 1){ ev.preventDefault(); otFermer(x.id); } });
        /* clic droit sur un onglet : à côté, fermer, fermer les autres */
        b.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); otMenuDeLOnglet(x.id, ev.clientX, ev.clientY); });
        /* ✋ v1455 — on le déplace en le faisant glisser */
        otRendreGlissable(b, z, 'rangee');
        z.appendChild(b);
      });
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'plus';
      plus.title = 'Un autre onglet au même endroit';
      plus.setAttribute('aria-label', 'Un autre onglet au même endroit');
      plus.textContent = '＋';
      plus.addEventListener('click', otDupliquer);
      z.appendChild(plus);
    }
  }
  /* 📱 le bouton du téléphone, à côté de la loupe */
  let bt = document.getElementById('ongTBtn');
  const loupe = document.getElementById('loupeBtn');
  if(!bt && loupe && loupe.parentNode){
    bt = document.createElement('button');
    bt.id = 'ongTBtn';
    bt.type = 'button';
    bt.title = 'Les onglets ouverts';
    bt.setAttribute('aria-label', 'Les onglets ouverts');
    bt.addEventListener('click', () => otMenuDuTelephone(bt));
    loupe.parentNode.insertBefore(bt, loupe);
  }
  if(bt){
    bt.textContent = '🗂️ ' + otListe.length;
    bt.classList.toggle('vu', montrer);
  }
  if(otCote) otCoteHaut();   /* la rangée vient ou s'en va : le panneau suit */
}

/* ------------------------------------------------------------
   LE PETIT MENU (clic droit, appui long, et le 🗂️ du téléphone)
   ------------------------------------------------------------ */
function otFermerMenu(){
  const m = document.getElementById('ongMenu');
  if(m) m.remove();
  document.removeEventListener('keydown', otEchapMenu, true);
}
function otEchapMenu(ev){ if(ev.key === 'Escape'){ ev.stopPropagation(); otFermerMenu(); } }
function otPoserMenu(x, y, lignes){
  otFermerMenu();
  const m = document.createElement('div');
  m.id = 'ongMenu';
  m.className = 'ongMenu';
  m.setAttribute('role', 'menu');
  lignes.forEach(l => {
    if(l.tete){
      const h = document.createElement('div');
      h.className = 'tete';
      h.textContent = l.tete;
      m.appendChild(h);
      return;
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.className = (l.on ? 'on' : '');
    b.innerHTML = '<b>' + (l.ot ? '<span class="poig" aria-hidden="true">⠿</span>' : '') + otEch(l.t) + '</b>' + (l.s ? '<small>' + otEch(l.s) + '</small>' : '');
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      if(Date.now() < otApresGlisse) return;
      otFermerMenu(); l.faire();
    });
    if(l.ot){ b.dataset.ot = l.ot; otRendreGlissable(b, m, 'liste'); }
    if(l.x){
      const fx = document.createElement('span');
      fx.className = 'x';
      fx.textContent = '✕';
      fx.title = 'Fermer cet onglet';
      fx.addEventListener('click', ev => { ev.stopPropagation(); if(Date.now() < otApresGlisse) return; otFermerMenu(); l.x(); });
      b.appendChild(fx);
    }
    m.appendChild(b);
  });
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  const L = Math.max(8, Math.min(x, window.innerWidth - r.width - 8));
  const T = (y + r.height + 8 > window.innerHeight) ? Math.max(8, y - r.height - 6) : y + 6;
  m.style.left = L + 'px';
  m.style.top = T + 'px';
  document.addEventListener('keydown', otEchapMenu, true);
  setTimeout(() => {
    const dehors = ev => { if(!m.contains(ev.target)){ otFermerMenu(); document.removeEventListener('pointerdown', dehors, true); } };
    document.addEventListener('pointerdown', dehors, true);
  }, 0);
  const premier = m.querySelector('button');
  if(premier) setTimeout(() => premier.focus(), 0);
}
function otMenuOuvrir(p, x, y){
  const ti = otTitre(p);
  otMenuOuvertJusqua = Date.now() + 900;
  const lignes = [
    { tete: ti.ic + ' ' + ti.t },
    { t: '↗️ Ouvrir ici', s: window.EC_COTE ? 'dans ce panneau' : 'à la place de l’écran actuel', faire: () => otAller(p) },
    { t: '🗂️ Ouvrir dans un onglet', s: window.EC_COTE ? 'dans l’appli, à gauche' : 'clic molette · Ctrl + clic · appui long', on: true, faire: () => otAjouter(p, false) }
  ];
  if(otCotePossible()) lignes.push({ t: '◫ Ouvrir à côté', s: 'à droite · Maj + clic molette · Ctrl + Maj + clic', faire: () => otOuvrirACote(p) });
  otPoserMenu(x, y, lignes);
}
/* Clic droit sur un onglet de la rangée */
function otMenuDeLOnglet(id, x, y){
  const o = otListe.find(t => t.id === id);
  if(!o) return;
  const lignes = [{ tete: o.ic + ' ' + o.t }];
  if(otCotePossible()) lignes.push({ t: '◫ Mettre à côté', s: 'à droite de l’écran (ou glisse-le vers la droite)', faire: () => otMettreACote(id) });
  lignes.push({ t: '✕ Fermer l’onglet', faire: () => otFermer(id) });
  if(otListe.length > 2) lignes.push({ t: '✕ Fermer les autres', faire: () => {
    /* il ne reste que lui : la rangée s'en va, on est à son endroit */
    if(id !== otActif) otAller(o.p);
    otListe = []; otActif = '';
    otGarder(); otDessiner();
  } });
  otPoserMenu(x, y, lignes);
}
function otMenuDuTelephone(bt){
  const r = bt.getBoundingClientRect();
  const lignes = [{ tete: '🗂️ Les onglets ouverts' }];
  if(!otListe.length) otPremierOnglet();
  otListe.forEach(x => lignes.push({
    ot: x.id, t: x.ic + ' ' + x.t, on: x.id === otActif,
    faire: () => otBasculer(x.id), x: otListe.length > 1 ? () => otFermer(x.id) : null
  }));
  lignes.push({ t: '＋ Un autre onglet ici', faire: otDupliquer });
  otPoserMenu(r.left, r.bottom, lignes);
}

/* ------------------------------------------------------------
   ✋ DÉPLACER LES ONGLETS (v1455) — David : « prévois qu'on puisse
   déplacer les onglets comme on veut ». On attrape un onglet et on le
   pose où on veut dans la rangée (ou dans la liste du téléphone).
   Glissé vers la droite de l'écran, sous la rangée, il passe à côté.
   Un clic sans bouger reste un clic.
   ------------------------------------------------------------ */
function otRendreGlissable(btn, conteneur, genre){
  btn.addEventListener('pointerdown', ev => {
    if(ev.button !== 0 || (ev.target.closest && ev.target.closest('.x'))) return;
    const id = btn.dataset.ot;
    const x0 = ev.clientX, y0 = ev.clientY, pid = ev.pointerId;
    let parti = false, cible = null, surCote = false;
    const bas = () => { const r = conteneur.getBoundingClientRect(); return r.bottom; };
    const bouge = e => {
      if(e.pointerId !== pid) return;
      if(!parti){
        if(Math.hypot(e.clientX - x0, e.clientY - y0) < 6) return;
        parti = true;
        btn.classList.add('glisse');
        document.body.classList.add('otGlisse');
        try{ btn.setPointerCapture(pid); }catch(_){}
        if(genre === 'rangee' && otCotePossible()){
          cible = document.createElement('div');
          cible.className = 'coteCible';
          cible.innerHTML = '<span>◫ Lâche ici pour l’ouvrir à côté</span>';
          otCoteHaut();
          document.body.appendChild(cible);
        }
      }
      e.preventDefault();
      /* à côté ? (sous la rangée, dans la moitié droite) */
      surCote = !!cible && e.clientY > bas() + 50 && e.clientX > window.innerWidth * 0.5;
      if(cible) cible.classList.toggle('sur', surCote);
      if(surCote) return;
      /* la place dans la rangée (qui va à la ligne) ou dans la liste */
      const autres = [...conteneur.querySelectorAll('[data-ot]')].filter(o => o !== btn);
      for(const o of autres){
        const r = o.getBoundingClientRect();
        if(genre === 'rangee'){
          if(e.clientY < r.top - 4 || e.clientY > r.bottom + 4 || e.clientX < r.left || e.clientX > r.right) continue;
          if(e.clientX < r.left + r.width / 2){ conteneur.insertBefore(btn, o); }
          else conteneur.insertBefore(btn, o.nextSibling);
        }else{
          if(e.clientY < r.top || e.clientY > r.bottom) continue;
          if(e.clientY < r.top + r.height / 2) conteneur.insertBefore(btn, o);
          else conteneur.insertBefore(btn, o.nextSibling);
        }
        break;
      }
    };
    const fin = e => {
      if(e.pointerId !== pid) return;
      btn.removeEventListener('pointermove', bouge);
      btn.removeEventListener('pointerup', fin);
      btn.removeEventListener('pointercancel', fin);
      document.removeEventListener('pointermove', bouge, true);
      document.removeEventListener('pointerup', fin, true);
      document.removeEventListener('pointercancel', fin, true);
      if(cible) cible.remove();
      if(!parti) return;
      btn.classList.remove('glisse');
      document.body.classList.remove('otGlisse');
      otApresGlisse = Date.now() + 350;
      if(e.type === 'pointerup' && surCote){ otMettreACote(id); return; }
      /* le nouvel ordre est celui de l'écran */
      const ordre = [...conteneur.querySelectorAll('[data-ot]')].map(o => o.dataset.ot);
      otListe.sort((a, b) => ordre.indexOf(a.id) - ordre.indexOf(b.id));
      otGarder();
      otDessiner();   /* la rangée suit aussi l'ordre de la liste du téléphone */
    };
    btn.addEventListener('pointermove', bouge);
    btn.addEventListener('pointerup', fin);
    btn.addEventListener('pointercancel', fin);
    /* si la capture ne prend pas (vieux navigateur) */
    document.addEventListener('pointermove', bouge, true);
    document.addEventListener('pointerup', fin, true);
    document.addEventListener('pointercancel', fin, true);
  });
}

/* ------------------------------------------------------------
   ◫ LE CÔTE À CÔTE DU GRAND ÉCRAN (v1455)
   ------------------------------------------------------------ */
function otCotePossible(){
  if(window.EC_COTE || !otPossible()) return false;
  if(window.innerWidth < OT_COTE_MIN_ECRAN) return false;
  /* la tablette (doigt seulement) : « à côté » devient un onglet */
  try{ if(window.matchMedia && !window.matchMedia('(any-pointer: fine)').matches) return false; }catch(e){}
  return true;
}
function otCoteCleLargeur(){ return 'ec_cote_largeur:' + String((typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || ''); }
function otCoteLargeurBornee(l){
  const max = Math.max(OT_COTE_MIN, window.innerWidth - OT_COTE_GAUCHE - 44);
  return Math.round(Math.max(OT_COTE_MIN, Math.min(max, l)));
}
function otCoteLargeur(){
  let l = 0;
  try{ l = Number(localStorage.getItem(otCoteCleLargeur()) || 0); }catch(e){}
  if(!l) l = window.innerWidth * 0.42;
  return otCoteLargeurBornee(l);
}
/* Le haut du panneau : sous la barre du haut (qui reste en haut quand
   on descend), au niveau de l'écran */
function otCoteHaut(){
  const nav = document.getElementById('barreOnglets');
  const app = document.getElementById('appView');
  const rangee = document.getElementById('ongTravail');
  let h = 12;
  if(nav && nav.offsetParent !== null) h = Math.max(h, nav.getBoundingClientRect().bottom + 12);
  /* sous la rangée « Ouverts » quand on la voit ; le bandeau du jour et
     l'écran se poussent à gauche (CSS « avecCote ») */
  if(rangee && rangee.offsetParent !== null) h = Math.max(h, rangee.getBoundingClientRect().bottom + 4);
  else if(app && !nav) h = Math.max(h, app.getBoundingClientRect().top);
  h = Math.min(h, window.innerHeight - 200);
  document.documentElement.style.setProperty('--cote-top', Math.round(h) + 'px');
}
let otCoteHautPrevu = false;
window.addEventListener('scroll', () => {
  if(!otCote || otCoteHautPrevu) return;
  otCoteHautPrevu = true;
  requestAnimationFrame(() => { otCoteHautPrevu = false; otCoteHaut(); });
}, { passive: true });

function otCoteTitre(ti){
  if(!otCote) return;
  const sp = otCote.el.querySelector('.tete span');
  if(sp && ti) sp.textContent = (ti.ic || '') + ' ' + (ti.t || '');
}
function otOuvrirACote(p){
  if(!p) return;
  if(!otCotePossible()){ otAjouter(p, false); return; }
  p = JSON.parse(JSON.stringify(p));
  delete p.y;
  if(otCote){
    /* déjà ouvert : on y va, sans recharger */
    otCote.voulu = p;
    otCote.p = p;
    otCoteTitre(otTitre(p));
    if(otCote.fen){ try{ otCote.fen.otAller(p); }catch(e){ console.warn(e); } }
    otGarder();
    return;
  }
  const el = document.createElement('div');
  el.id = 'ongCote';
  el.className = 'cotePanneau';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', 'À côté');
  el.innerHTML = '<div class="tete"><span></span>' +
    '<button type="button" data-cote="grand" title="Le mettre en grand" aria-label="Le mettre en grand">⤢</button>' +
    '<button type="button" data-cote="onglet" title="En faire un onglet" aria-label="En faire un onglet">🗂️</button>' +
    '<button type="button" data-cote="fermer" title="Fermer" aria-label="Fermer le panneau">✕</button></div>' +
    '<div class="charge">Ouverture…</div>';
  const cadre = document.createElement('iframe');
  cadre.title = 'À côté';
  el.appendChild(cadre);
  const poignee = document.createElement('div');
  poignee.className = 'cotePoignee';
  poignee.title = 'Glisser pour régler la largeur';
  poignee.innerHTML = '<i></i>';
  document.body.appendChild(poignee);
  document.body.appendChild(el);
  otCote = { el: el, poignee: poignee, cadre: cadre, fen: null, p: p, voulu: p };
  otCoteTitre(otTitre(p));
  el.querySelector('[data-cote="grand"]').addEventListener('click', otCoteEnGrand);
  el.querySelector('[data-cote="onglet"]').addEventListener('click', otCoteEnOnglet);
  el.querySelector('[data-cote="fermer"]').addEventListener('click', () => otFermerCote());
  otCotePoignee(poignee);
  document.documentElement.style.setProperty('--cote-l', otCoteLargeur() + 'px');
  otCoteHaut();
  document.body.classList.add('avecCote');
  cadre.src = location.pathname.replace(/[^/]*$/, '') + 'index.html?cote=1';
  otGarder();
  /* la messagerie (et le reste) se règle sur la place qui lui reste */
  window.dispatchEvent(new Event('resize'));
}
/* Appelé par l'appli du panneau une fois sa session ouverte */
function otCoteDemarre(fen){
  if(!otCote) return null;
  otCote.fen = fen;
  const ch = otCote.el.querySelector('.charge');
  if(ch) setTimeout(() => ch.remove(), 500);
  return otCote.voulu;
}
/* Appelé par l'appli du panneau quand elle change d'endroit */
function otCoteAMaj(p, ti){
  if(!otCote) return;
  otCote.p = p;
  otCoteTitre(ti);
  otGarder();
}
/* Côté panneau : prévenir l'appli de gauche d'où l'on est */
let otCoteSignalPrevu = null;
function otCoteIci(){ return otEnRoute ? null : otPlaceIci(); }
function otCoteSignaler(){
  clearTimeout(otCoteSignalPrevu);
  otCoteSignalPrevu = setTimeout(() => {
    if(otEnRoute) return;   /* il est en chemin : il préviendra en arrivant */
    try{
      const p = otPlaceIci();
      window.parent.otCoteAMaj(JSON.parse(JSON.stringify(p)), JSON.parse(JSON.stringify(otTitre(p))));
    }catch(e){}
  }, 400);
}
function otCotePlace(){
  if(!otCote) return null;
  let p = null;
  /* là où est le panneau — sauf s'il est encore en chemin : alors là où il va */
  try{ if(otCote.fen && typeof otCote.fen.otCoteIci === 'function'){ const q = otCote.fen.otCoteIci(); if(q) p = JSON.parse(JSON.stringify(q)); } }catch(e){}
  p = p || otCote.p || otCote.voulu;
  if(p){ p = Object.assign({}, p); delete p.y; }   /* le défilement du panneau ne vaut pas pour la gauche */
  return p;
}
function otFermerCote(sansGarder){
  if(!otCote) return;
  try{ otCote.cadre.src = 'about:blank'; }catch(e){}
  otCote.el.remove();
  otCote.poignee.remove();
  otCote = null;
  document.body.classList.remove('avecCote', 'coteTire');
  if(!sansGarder) otGarder();
  window.dispatchEvent(new Event('resize'));
}
/* ⤢ : il devient l'onglet actif ; l'écran d'avant reste un onglet */
function otCoteEnGrand(){
  const p = otCotePlace();
  otFermerCote();
  if(!p) return;
  const deja = otListe.find(x => otMemeEndroit(x.p, p));
  if(deja){ if(deja.id === otActif) otAller(p); else otBasculer(deja.id); }
  else otAjouter(p, true);
}
/* 🗂️ : il devient un onglet, on reste où on est */
function otCoteEnOnglet(){
  const p = otCotePlace();
  otFermerCote();
  if(p) otAjouter(p, false);
}
/* Un onglet de la rangée passe à côté */
function otMettreACote(id){
  const o = otListe.find(x => x.id === id);
  if(!o) return;
  const p = (id === otActif) ? otPlaceIci() : o.p;
  if(id === otActif && otListe.length < 2) return;
  otFermer(id);
  otOuvrirACote(p);
}
/* La poignée : glisser pour régler la largeur */
function otCotePoignee(pg){
  pg.addEventListener('pointerdown', ev => {
    if(ev.button !== 0) return;
    ev.preventDefault();
    const pid = ev.pointerId;
    try{ pg.setPointerCapture(pid); }catch(_){}
    document.body.classList.add('coteTire');
    const bouge = e => {
      if(e.pointerId !== pid) return;
      const l = otCoteLargeurBornee(window.innerWidth - e.clientX - 22 - 7);
      document.documentElement.style.setProperty('--cote-l', l + 'px');
    };
    const fin = e => {
      if(e.pointerId !== pid) return;
      pg.removeEventListener('pointermove', bouge);
      pg.removeEventListener('pointerup', fin);
      pg.removeEventListener('pointercancel', fin);
      document.body.classList.remove('coteTire');
      const l = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cote-l'), 10);
      try{ if(l) localStorage.setItem(otCoteCleLargeur(), String(l)); }catch(_){}
      window.dispatchEvent(new Event('resize'));
    };
    pg.addEventListener('pointermove', bouge);
    pg.addEventListener('pointerup', fin);
    pg.addEventListener('pointercancel', fin);
  });
  /* double-clic : la largeur de départ */
  pg.addEventListener('dblclick', () => {
    try{ localStorage.removeItem(otCoteCleLargeur()); }catch(_){}
    document.documentElement.style.setProperty('--cote-l', otCoteLargeur() + 'px');
    window.dispatchEvent(new Event('resize'));
  });
}
/* La fenêtre rétrécit : le panneau garde sa place s'il peut, sinon il
   devient un onglet */
window.addEventListener('resize', () => {
  if(!otCote) return;
  if(!otCotePossible()){
    const p = otCotePlace();
    otFermerCote();
    if(p){
      otAjouter(p, false);
    }
    return;
  }
  const l = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cote-l'), 10) || otCoteLargeur();
  const b = otCoteLargeurBornee(l);
  if(b !== l) document.documentElement.style.setProperty('--cote-l', b + 'px');
  otCoteHaut();
});

/* ------------------------------------------------------------
   LA SONDE : où mène ce bouton, sans y aller ni rien faire
   ------------------------------------------------------------ */
function otBoucher(){
  const jamais = () => new Promise(() => {});
  const garde = {};
  const remplacer = (nom, f) => { if(typeof window[nom] === 'function'){ garde[nom] = window[nom]; window[nom] = f; } };
  remplacer('appelPrep', jamais);
  remplacer('fetch', jamais);
  remplacer('fenetre', jamais);
  remplacer('confirmer', jamais);
  remplacer('demander', jamais);
  remplacer('informer', jamais);
  remplacer('menuGestesEC', () => () => {});
  remplacer('showToast', () => {});
  remplacer('open', () => null);
  return () => { Object.keys(garde).forEach(n => { window[n] = garde[n]; }); };
}
function otPlaceDeLaCapture(c){
  if(!c) return null;
  if(c.eleve) return { onglet: 'eleves', vue: 'dossier', eleve: c.eleve,
                       dossier: c.dossier || ((typeof ongletPageEleve !== 'undefined' && ongletPageEleve) || '') };
  if(c.conv) return { onglet: 'messagerie', vue: 'messagerie', conv: c.conv };
  if(c.mail) return { onglet: 'messagerie', vue: c.vue || 'messagerie', mail: c.mail };
  if(c.onglet){
    const p = { onglet: c.onglet, vue: c.vue || ((typeof vueActive !== 'undefined' && vueActive[c.onglet]) || '') };
    if(c.viser) p.viser = c.viser;
    return p;
  }
  return null;
}
function otSonder(el){
  if(!el || !el.closest || !otPossible()) return null;
  if(el.closest('#ongTravail, #ongMenu, #ongTBtn')) return null;
  if(el.closest('input, textarea, select, option, label, summary, video, audio, canvas, iframe, [contenteditable=""], [contenteditable="true"], .bulle, .msgB, .zoneEcrire')) return null;
  const lien = el.closest('a[href]');
  if(lien && !/^(#|javascript:)/i.test(lien.getAttribute('href') || '')) return null;
  const btn = el.closest('button, [role="button"], a');
  if(btn){
    const lib = (btn.textContent || '') + ' ' + (btn.title || '') + ' ' + (btn.getAttribute('aria-label') || '');
    if(OT_NON.test(lib)) return null;
    if(btn.disabled) return null;
  }else if(el.tagName === 'IMG') return null;

  /* Les portes connues, lues sans rien cliquer */
  const og = el.closest('#barreOnglets .onglet[data-cible]');
  if(og){ const o = og.getAttribute('data-cible'); return { onglet: o, vue: (typeof vueActive !== 'undefined' && vueActive[o]) || '' }; }
  const vb = el.closest('.barre-vues button[data-vue-cible]');
  if(vb){ const bar = vb.closest('.barre-vues'); return { onglet: bar.getAttribute('data-pour'), vue: vb.getAttribute('data-vue-cible') }; }
  const ck = el.closest('.ckIt[data-conv]');
  if(ck){
    if(typeof modeChoixMessagerie !== 'undefined' && modeChoixMessagerie) return null;
    return { onglet: 'messagerie', vue: 'messagerie', conv: ck.dataset.conv };
  }

  /* Les autres : on sonde */
  otCapture = {};
  otSondeEnCours = true;
  const deboucher = otBoucher();
  try{ el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); }
  catch(e){ /* un bouton qui casse en sonde n'ouvre rien */ }
  finally{ deboucher(); otSondeEnCours = false; }
  const c = otCapture;
  otCapture = null;
  return otPlaceDeLaCapture(c);
}

/* Les portes de navigation : en sonde, elles notent ; sinon, elles
   ouvrent, puis l'onglet actif suit. */
function otEnvelopper(nom, noter, promesse){
  const f = window[nom];
  if(typeof f !== 'function' || f.__ot) return;
  const g = function(){
    if(otCapture){ noter(otCapture, arguments); return promesse ? Promise.resolve() : undefined; }
    const r = f.apply(this, arguments);
    otSuivre();
    return r;
  };
  g.__ot = true;
  g.__origine = f;
  window[nom] = g;
}
function otInstaller(){
  otEnvelopper('afficherOnglet', (c, a) => { c.onglet = a[0]; if(!c.vue) c.vue = (typeof vueActive !== 'undefined' && vueActive[a[0]]) || ''; });
  otEnvelopper('afficherVue', (c, a) => { c.onglet = a[0]; c.vue = a[1]; });
  otEnvelopper('allerALaMessagerie', (c, a) => { c.onglet = 'messagerie'; c.vue = a[0] || 'messagerie'; });
  otEnvelopper('ouvrirPageEleve', (c, a) => { c.eleve = String(a[0] || '').trim(); });
  otEnvelopper('choisirOngletEleve', (c, a) => { c.dossier = a[0]; });
  otEnvelopper('ouvrirLeFil', (c, a) => { c.conv = a[0]; }, true);
  otEnvelopper('ouvrirLeFilPartout', (c, a) => { c.conv = a[0]; }, true);
  otEnvelopper('mlOuvrir', (c, a) => { c.mail = a[0]; }, true);
  otEnvelopper('mlOuvrirPartout', (c, a) => { c.mail = a[0]; });
  otEnvelopper('viserLaPersonne', (c, a) => { if(a[1] === undefined) c.viser = a[0]; });

  /* En se déconnectant : le panneau d'à côté se ferme (il revient à la
     reconnexion, comme les onglets) */
  const verr = window.verrouiller;
  if(typeof verr === 'function' && !verr.__ot && !window.EC_COTE){
    const g = function(){ try{ otFermerCote(true); }catch(e){} return verr.apply(this, arguments); };
    g.__ot = true;
    window.verrouiller = g;
  }

  /* Au démarrage de la session : on retrouve ses onglets */
  const init = window.initOnglets;
  if(typeof init === 'function' && !init.__ot){
    const g = function(){ const r = init.apply(this, arguments); try{ otDemarrer(); }catch(e){ console.warn(e); } return r; };
    g.__ot = true;
    window.initOnglets = g;
  }
}
function otDemarrer(){
  /* ◫ dans le panneau d'à côté : on va là où l'appli de gauche l'a demandé */
  if(window.EC_COTE){
    let p = null;
    try{ p = window.parent.otCoteDemarre(window); }catch(e){}
    if(p){
      otEnRoute = true;   /* l'écran de départ ne compte pas : on va là où on l'a demandé */
      setTimeout(() => otAller(JSON.parse(JSON.stringify(p))), 450);
    }
    return;
  }
  otFermerCote(true);
  otListe = []; otActif = '';
  if(!otPossible()){ otDessiner(); return; }
  const d = otLire();
  if(d && d.liste.length >= 2){
    otListe = d.liste.slice(0, OT_MAX).map(x => Object.assign({}, x, { neuf: false }));
    otActif = otListe.some(x => x.id === d.actif) ? d.actif : otListe[0].id;
    const a = otListe.find(x => x.id === otActif);
    otDessiner();
    setTimeout(() => otAller(a.p), 450);
  }else otDessiner();
  /* le panneau d'à côté revient aussi, s'il était ouvert */
  if(d && d.cote && otCotePossible()) setTimeout(() => otOuvrirACote(d.cote), 900);
}

/* ------------------------------------------------------------
   LES QUATRE GESTES
   ------------------------------------------------------------ */
let otMolette = null;
let otAppui = null;
document.addEventListener('mousedown', ev => {
  if(ev.button !== 1 || !otPossible()) return;
  otMolette = otSonder(ev.target);
  if(otMolette) ev.preventDefault();   /* pas de défilement automatique */
}, true);
document.addEventListener('auxclick', ev => {
  if(ev.button !== 1 || !otMolette) return;
  ev.preventDefault();
  ev.stopPropagation();
  const p = otMolette;
  otMolette = null;
  /* ◫ Maj + clic molette : à côté */
  if(ev.shiftKey && otCotePossible()) otOuvrirACote(p);
  else otAjouter(p, false);
}, true);
document.addEventListener('click', ev => {
  if(otSondeEnCours) return;
  if(ev.target && ev.target.closest && ev.target.closest('#ongMenu, #ongTravail, #ongTBtn')) return;
  if(Date.now() < otIgnorerClicJusqua){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); return; }
  if(!(ev.ctrlKey || ev.metaKey) || ev.button !== 0 || !otPossible()) return;
  const p = otSonder(ev.target);
  if(!p) return;
  ev.preventDefault();
  ev.stopPropagation();
  ev.stopImmediatePropagation();
  /* ◫ Ctrl + Maj + clic : à côté */
  if(ev.shiftKey && otCotePossible()) otOuvrirACote(p);
  else otAjouter(p, false);
}, true);
/* ⚠️ EN REMONTANT, PAS EN DESCENDANT : un élément qui a son propre menu
   (une bulle de la messagerie, une ligne de conversation) le montre et
   « preventDefault » ; on le voit ici et on ne pose pas le nôtre. */
document.addEventListener('contextmenu', ev => {
  if(!otPossible() || ev.defaultPrevented) return;
  if(Date.now() < otMenuOuvertJusqua){ ev.preventDefault(); return; }
  const sel = window.getSelection ? String(window.getSelection() || '') : '';
  if(sel.trim()) return;                       /* copier un texte : le menu du navigateur */
  if(ev.target && ev.target.closest && ev.target.closest(OT_A_SON_MENU)) return;
  const p = otSonder(ev.target);
  if(!p) return;
  ev.preventDefault();
  if(otAppui){ clearTimeout(otAppui.t); otIgnorerClicJusqua = Date.now() + 900; otAppui = null; }
  otMenuOuvrir(p, ev.clientX, ev.clientY);
});
/* l'appui long, sur la tablette */
document.addEventListener('pointerdown', ev => {
  if(ev.pointerType !== 'touch' || !otPossible()) return;
  if(ev.target && ev.target.closest && ev.target.closest(OT_A_SON_MENU)) return;
  if(otAppui) clearTimeout(otAppui.t);
  const cible = ev.target, x0 = ev.clientX, y0 = ev.clientY;
  otAppui = { x0: x0, y0: y0, t: setTimeout(() => {
    otAppui = null;
    if(Date.now() < otMenuOuvertJusqua) return;
    const p = otSonder(cible);
    if(!p) return;
    otIgnorerClicJusqua = Date.now() + 900;
    try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){}
    otMenuOuvrir(p, x0, y0);
  }, 550) };
}, true);
['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, () => {
  if(otAppui){ clearTimeout(otAppui.t); otAppui = null; }
}, true));
document.addEventListener('pointermove', ev => {
  if(otAppui && Math.hypot(ev.clientX - otAppui.x0, ev.clientY - otAppui.y0) > 10){ clearTimeout(otAppui.t); otAppui = null; }
}, true);
/* le défilement de l'onglet actif, gardé en partant */
window.addEventListener('pagehide', () => {
  const a = otListe.find(x => x.id === otActif);
  if(a){ a.p.y = Math.round(window.scrollY || 0); otGarder(); }
});

/* Le menu se ferme quand on clique dans le panneau d'à côté (l'appli
   de gauche perd alors la main) */
window.addEventListener('blur', () => { if(document.getElementById('ongMenu')) otFermerMenu(); });

otInstaller();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-onglets-travail.js'] = true;
