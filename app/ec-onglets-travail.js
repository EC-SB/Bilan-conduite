/* Déployé le 17/11/2026 à 16:51 — v1454 */
/* ============================================================
   ec-onglets-travail.js — v1454
   🗂️ LES ONGLETS DANS L'APPLI (livraison 1 : les onglets)

   David, le 17 novembre : « est-ce qu'on peut faire des onglets dans
   l'app ? Quand je suis à un endroit et que je veux ouvrir par exemple
   le dossier élève, en ayant à côté là où je suis déjà, je ne peux
   pas. En cliquant sur clic molette par exemple. […] Je ne voudrais
   pas un nouvel onglet ou une nouvelle fenêtre. »

   Ses réponses au schéma (17/11) : n'importe quel écran s'ouvre en
   onglet ; clic molette, Ctrl + clic, clic droit, appui long sur la
   tablette ; on retrouve les onglets en rouvrant l'appli (sur cet
   appareil) ; 8 au plus, le plus ancien se ferme tout seul.
   (Le côte à côte du grand écran = la livraison 2.)

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
   ============================================================ */

const OT_MAX = 8;
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
  try{
    if(otListe.length < 2) localStorage.removeItem(otCle());
    else localStorage.setItem(otCle(), JSON.stringify({
      liste: otListe.map(x => ({ id: x.id, p: x.p, ic: x.ic, t: x.t, vu: x.vu })), actif: otActif }));
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
  if(otCapture || otEnRoute || !otListe.length) return;
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
          if(ev.target.closest('.x')){ ev.stopPropagation(); otFermer(x.id); return; }
          otBasculer(x.id);
        });
        /* le clic molette sur un onglet le ferme, comme partout */
        b.addEventListener('auxclick', ev => { if(ev.button === 1){ ev.preventDefault(); otFermer(x.id); } });
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
    b.innerHTML = '<b>' + otEch(l.t) + '</b>' + (l.s ? '<small>' + otEch(l.s) + '</small>' : '');
    b.addEventListener('click', ev => { ev.stopPropagation(); otFermerMenu(); l.faire(); });
    if(l.x){
      const fx = document.createElement('span');
      fx.className = 'x';
      fx.textContent = '✕';
      fx.title = 'Fermer cet onglet';
      fx.addEventListener('click', ev => { ev.stopPropagation(); otFermerMenu(); l.x(); });
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
  otPoserMenu(x, y, [
    { tete: ti.ic + ' ' + ti.t },
    { t: '↗️ Ouvrir ici', s: 'à la place de l’écran actuel', faire: () => otAller(p) },
    { t: '🗂️ Ouvrir dans un onglet', s: 'clic molette · Ctrl + clic · appui long', on: true, faire: () => otAjouter(p, false) }
  ]);
}
function otMenuDuTelephone(bt){
  const r = bt.getBoundingClientRect();
  const lignes = [{ tete: '🗂️ Les onglets ouverts' }];
  if(!otListe.length) otPremierOnglet();
  otListe.forEach(x => lignes.push({
    t: x.ic + ' ' + x.t, on: x.id === otActif,
    faire: () => otBasculer(x.id), x: otListe.length > 1 ? () => otFermer(x.id) : null
  }));
  lignes.push({ t: '＋ Un autre onglet ici', faire: otDupliquer });
  otPoserMenu(r.left, r.bottom, lignes);
}

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

  /* Au démarrage de la session : on retrouve ses onglets */
  const init = window.initOnglets;
  if(typeof init === 'function' && !init.__ot){
    const g = function(){ const r = init.apply(this, arguments); try{ otDemarrer(); }catch(e){ console.warn(e); } return r; };
    g.__ot = true;
    window.initOnglets = g;
  }
}
function otDemarrer(){
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
  otAjouter(p, false);
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
  otAjouter(p, false);
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

otInstaller();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-onglets-travail.js'] = true;
