/* Déployé le 28/11/2026 à 15:55 — v1606 */
/* ============================================================
   ec-barre.js — v1514 — LA BARRE DU HAUT REVUE

   David, le 20 novembre : « si tu mets le bouton [📞] en haut, mets la
   CB Gasoil dans les 3 points, car déjà que c'est serré en haut sur
   tablette et téléphone ». Puis, après le schéma : « c'est bon pour la
   barre, et sur téléphone et tablette mets À faire aussi dans les
   3 points ».

   Ce que fait ce module : il RECOPIE dans le menu ⋯ ce que les
   boutons du haut savent déjà. Les boutons restent là, avec leurs
   identifiants, et leurs modules continuent de les allumer et de les
   éteindre comme avant (ec-cbgasoil.js, ec-todo.js, la connexion) :
   on regarde ce qu'ils montrent, et le menu dit la même chose. Un
   deuxième endroit qui déciderait tout seul finirait par dire autre
   chose que le premier.

   · 💳 CB Gasoil : toujours dans le ⋯ (le bouton du haut est caché
     par la feuille de style), avec une pastille par carte — verte au
     bureau, dorée si c'est toi qui l'as, rouge chez quelqu'un d'autre.
     Un point rouge sur le ⋯ quand une carte est sortie depuis hier.
   · ☑️ À faire, 🔓 Se déconnecter et le nom de la personne : dans le
     ⋯ sur téléphone et tablette (900 px et moins), avec le compte des
     tâches recopié sur le ⋯. Sur grand écran, rien ne bouge.
   ============================================================ */

let barreMajPrevue = false;

function barreConnecte(){
  const o = $('logoutBtn');
  return !!(typeof ACCES !== 'undefined' && ACCES && ACCES.code) && !!o && o.style.display !== 'none';
}
function barreVisible(id){
  const b = $(id);
  return !!b && b.style.display !== 'none' && b.style.display !== '';
}
function barreNon(el, cache){ if(el) el.classList.toggle('non', !!cache); }

function barreMaj(){
  barreMajPrevue = false;
  const menu = $('plusMenu');
  if(!menu) return;
  const connecte = barreConnecte();

  /* qui est connecté (sur téléphone et tablette, #qui est caché) */
  const qui = $('plusQui');
  if(qui){
    const n = $('quiNom'), r = $('quiRole'), v = $('versionAffichee');
    const nom = (n && n.textContent.trim()) || '';
    $('plusQuiNom').textContent = nom;
    $('plusQuiRole').textContent = [(r && r.textContent.trim()) || '', (v && v.textContent.trim()) || ''].filter(Boolean).join(' · ');
    barreNon(qui, !connecte || !nom);
  }

  /* ☑️ À faire : seulement si le bouton du haut existe pour cette personne */
  const todo = connecte && barreVisible('todoBtn');
  barreNon($('plusTodo'), !todo);
  const tn = $('todoBtnN');
  const compte = (todo && tn && tn.style.display !== 'none') ? tn.textContent.trim() : '';
  const pn = $('plusTodoN');
  if(pn){ pn.textContent = compte; barreNon(pn, !compte); }
  const bn = $('plusBtnN');
  if(bn){ bn.textContent = compte; barreNon(bn, !compte); }

  /* 💳 la CB Gasoil */
  const cb = connecte && barreVisible('cbBtn');
  barreNon($('plusCb'), !cb);
  let traine = false;
  const et = $('plusCbEt');
  if(et){
    et.innerHTML = '';
    let etats = [];
    try{ etats = (cb && typeof etatsCb === 'function') ? etatsCb() : []; }catch(e){ etats = []; }
    const max = (typeof CB_LETTRES_MAX !== 'undefined') ? CB_LETTRES_MAX : 4;
    if(etats.length && etats.length <= max){
      etats.forEach(x => {
        const s = document.createElement('span');
        s.textContent = (typeof sigleCb === 'function') ? sigleCb(x.carte.cle) : '';
        s.className = x.ou === 'moi' ? 'or' : x.ou === 'autre' ? 'dehors' : '';
        s.title = ((typeof nomCb === 'function') ? nomCb(x.carte.cle) : '') + ' — ' +
          (x.ou === 'moi' ? 'tu l’as' : x.ou === 'autre' ? 'chez ' + (x.qui || 'quelqu’un') : 'au bureau');
        et.appendChild(s);
      });
    }else if(etats.length){
      const dehors = etats.filter(x => x.ou !== 'bureau').length;
      const s = document.createElement('span');
      s.textContent = dehors + ' sortie' + (dehors > 1 ? 's' : '');
      if(dehors) s.className = 'dehors';
      et.appendChild(s);
    }
    try{ traine = typeof cbTraine === 'function' && etats.some(x => cbTraine(x)); }catch(e){ traine = false; }
  }
  barreNon($('plusPoint'), !traine);
  const pb = $('plusBtn');
  if(pb) pb.title = traine ? 'Une CB Gasoil est sortie depuis hier — guide, thème, version' : 'CB Gasoil, guide, thème, version';

  /* les deux séparateurs : seulement s'il y a quelque chose de chaque côté */
  const s1 = $('plusSep1');
  if(s1){
    barreNon(s1, !cb && !todo);
    s1.classList.toggle('brPetit', !cb && todo);
  }
  barreNon($('plusSep2'), !connecte);
  barreNon($('plusOut'), !connecte);
  majThemeBas();
}

/* ============================================================
   📘 v1606 — LE GUIDE ET SES VIDÉOS DERRIÈRE UNE SEULE LIGNE

   David : « les vidéos mets-les dans Guide d'utilisation › le guide à
   lire et les vidéos, plusieurs boutons ». La ligne « Guide
   d'utilisation › » ouvre une fenêtre faite comme celle du Graphisme
   (grOv / grFen de ec-graphisme.js), avec un bouton par chose. Les deux
   lignes « 🎬 » restent dans la page, cachées (classe « non ») : leurs
   adresses et leur droit (ec-videos-privees.js) restent la seule source.

   Son retour sur le schéma : « on ne voit pas assez l'effet verre des
   cases ». Ici, pas de cadre dans le cadre : un panneau de verre plus
   fin, qui laisse voir le fond, et des boutons de verre bombé.
   ============================================================ */
const GUIDE_CSS = `
.guOv{ background:rgba(10,14,8,.12) !important; }
body:not(.clair) .guOv{ background:rgba(0,0,0,.28) !important; }
body.verre .guFen{ background:linear-gradient(140deg, rgba(255,255,255,.62) 0%, rgba(255,255,255,.34) 100%);
  -webkit-backdrop-filter:blur(26px) saturate(190%); backdrop-filter:blur(26px) saturate(190%);
  border:1px solid rgba(255,255,255,.75); }
body.verre:not(.clair) .guFen{ background:linear-gradient(140deg, rgba(34,40,28,.66) 0%, rgba(14,18,10,.46) 100%); border-color:rgba(255,255,255,.16); }
.guFen h4{ margin:4px 4px 10px; font-size:13px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; opacity:.8; display:flex; align-items:center; gap:8px; }
.guListe{ display:flex; flex-direction:column; gap:10px; margin-bottom:18px; }
.guBt{ display:flex; align-items:center; gap:12px; width:100%; min-height:0; margin:0; padding:12px 14px; border-radius:18px; text-align:left; text-decoration:none; color:inherit; cursor:pointer;
  font:inherit; font-size:15px; line-height:1.3;
  background:linear-gradient(180deg, rgba(255,255,255,.66) 0%, rgba(255,255,255,.30) 100%);
  border:1px solid rgba(255,255,255,.9);
  box-shadow:inset 0 1px 0 #fff, inset 0 -1px 0 rgba(30,45,20,.07), 0 10px 24px -12px rgba(30,60,0,.38);
  -webkit-backdrop-filter:blur(14px) saturate(170%); backdrop-filter:blur(14px) saturate(170%); transition:transform .12s, box-shadow .12s; }
.guBt:hover{ box-shadow:inset 0 1px 0 #fff, inset 0 -1px 0 rgba(30,45,20,.07), 0 14px 28px -12px rgba(30,60,0,.45); }
.guBt:active{ transform:scale(.985); }
.guBt:focus-visible{ outline:2px solid var(--accent-text, #315A00); outline-offset:2px; }
body:not(.clair) .guBt{ background:linear-gradient(180deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,.04) 100%); border-color:rgba(255,255,255,.18);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.22), inset 0 -1px 0 rgba(0,0,0,.25), 0 10px 24px -12px rgba(0,0,0,.7); }
body:not(.clair) .guBt:focus-visible{ outline-color:#B6FF0E; }
.guIc{ flex:0 0 auto; width:42px; height:42px; border-radius:13px; display:inline-flex; align-items:center; justify-content:center; font-size:21px;
  background:var(--lentille, linear-gradient(180deg,#D8FF78 0%,#B6FF0E 100%)); box-shadow:inset 0 1px 0 rgba(255,255,255,.95), inset 0 -2px 0 rgba(0,0,0,.08), 0 4px 10px -4px rgba(120,190,0,.55); }
.guTx{ flex:1; min-width:0; } .guTx b{ display:block; font-weight:700; } .guTx span{ display:block; font-size:13px; opacity:.72; margin-top:1px; }
.guFl{ opacity:.45; font-size:18px; }
body:not(.verre) .guBt{ background:transparent; border:1px solid var(--line); box-shadow:none; -webkit-backdrop-filter:none; backdrop-filter:none; }
`;
function ouvrirGuide(){
  if(!document.getElementById('guStyle')){
    const s = document.createElement('style'); s.id = 'guStyle'; s.textContent = GUIDE_CSS; document.head.appendChild(s);
  }
  const m = $('plusMenu'); if(m) m.style.display = 'none';
  const ov = document.createElement('div');
  ov.className = 'grOv guOv';
  const f = document.createElement('div');
  f.className = 'grFen guFen';
  f.setAttribute('role', 'dialog');
  f.setAttribute('aria-label', 'Guide d’utilisation');
  const lien = (id) => { const a = $(id); return a ? a.getAttribute('href') : 'guide.html'; };
  const bt = (balise, attrs, ic, t, s) => '<' + balise + ' class="guBt" ' + attrs + '><span class="guIc" aria-hidden="true">' + ic + '</span>' +
    '<span class="guTx"><b>' + t + '</b><span>' + s + '</span></span><span class="guFl" aria-hidden="true">›</span></' + balise + '>';
  const prives = typeof videosPriveesPourMoi === 'function' && videosPriveesPourMoi();
  f.innerHTML = '<div class="grTete"><h3>📘 Guide d’utilisation</h3><button type="button" class="grFerme" aria-label="Fermer">✕</button></div>' +
    '<h4>📖 À lire</h4><div class="guListe">' +
      bt('a', 'href="' + lien('guideBtn') + '" target="_blank" rel="noopener"', '📖', 'Le guide', 'Toutes les fonctions, écran par écran') + '</div>' +
    '<h4>🎬 Les vidéos</h4><div class="guListe" style="margin-bottom:4px">' +
      bt('a', 'href="' + lien('videoMoniteurBtn') + '" target="_blank" rel="noopener"', '🎬', 'Prise en main (moniteurs)', 'La vidéo pour démarrer') +
      (prives ? bt('button', 'type="button" data-gu="prives"', '🎬', 'Vidéos des comptes principaux', 'David, Chrystel et Maryne seulement') : '') +
    '</div>';
  ov.appendChild(f);
  document.body.appendChild(ov);
  const fermer = () => { ov.remove(); document.removeEventListener('keydown', echap); };
  const echap = (e) => { if(e.key === 'Escape') fermer(); };
  document.addEventListener('keydown', echap);
  ov.addEventListener('click', (e) => {
    if(e.target === ov || e.target.closest('.grFerme')) return fermer();
    if(e.target.closest('[data-gu="prives"]')){ fermer(); if(typeof ouvrirVideosPrivees === 'function') ouvrirVideosPrivees(); return; }
    /* un lien suivi : la fenêtre se referme derrière lui */
    if(e.target.closest('a.guBt')) setTimeout(fermer, 0);
  });
  const premier = f.querySelector('.guBt');
  if(premier) setTimeout(() => premier.focus(), 30);
}
function brancherGuide(){
  const g = $('guideBtn');
  if(!g || g.dataset.guide) return;
  g.dataset.guide = 'oui';
  g.addEventListener('click', (e) => { e.preventDefault(); setTimeout(ouvrirGuide, 0); });
}

/* ============================================================
   🎨 v1606 — LE THÈME AU BOUT DE LA LIGNE « GRAPHISME » (choix 2 de David)

   ☀️ / 🌙 en un geste ; le reste de la ligne ouvre toujours la fenêtre du
   Graphisme. Le clic sur ☀️ ou 🌙 ne remonte pas à la ligne : le menu
   reste ouvert, on voit le thème changer. « Changer de thème » reste dans
   la page, caché : appliquerTheme (ec-demarrage.js) est la seule à poser
   le thème.
   ============================================================ */
function majThemeBas(){
  const clair = document.body.classList.contains('clair');
  document.querySelectorAll('#verreBtn .thBas [data-th]').forEach(x => {
    const ici = (x.dataset.th === 'clair') === clair;
    x.classList.toggle('ici', ici);
    x.setAttribute('aria-checked', ici ? 'true' : 'false');
  });
}
function brancherThemeBas(){
  const v = $('verreBtn');
  if(!v || v.querySelector('.thBas')) return;
  if(!document.getElementById('thStyle')){
    const s = document.createElement('style'); s.id = 'thStyle';
    s.textContent = '#plusMenu .thBas{ margin-left:auto; display:inline-flex; gap:2px; padding:2px; border-radius:999px; background:var(--v2-fond, transparent); border:1px solid var(--v2-bord, var(--line)); }' +
      '#plusMenu .thBas [data-th]{ width:28px; height:22px; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; font-size:13px; cursor:pointer; }' +
      '#plusMenu .thBas [data-th].ici{ background:var(--lentille, linear-gradient(180deg,#D8FF78 0%,#B6FF0E 100%)); box-shadow:0 1px 2px rgba(0,0,0,.15); }' +
      '#plusMenu .thBas [data-th]:focus-visible{ outline:2px solid var(--accent-text, #315A00); outline-offset:1px; }' +
      '#plusMenu #verreBtn .thFl{ opacity:.6; margin-left:8px; }';
    document.head.appendChild(s);
  }
  /* la flèche « › » de la ligne passe après le choix du thème */
  const fl = [...v.children].find(x => x.textContent.trim() === '›');
  if(fl){ fl.style.marginLeft = ''; fl.classList.add('thFl'); }
  const t = document.createElement('span');
  t.className = 'thBas';
  t.setAttribute('role', 'radiogroup');
  t.setAttribute('aria-label', 'Thème');
  t.innerHTML = '<span data-th="clair" role="radio" tabindex="0" title="Thème clair" aria-label="Thème clair">☀️</span>' +
                '<span data-th="sombre" role="radio" tabindex="0" title="Thème sombre" aria-label="Thème sombre">🌙</span>';
  v.insertBefore(t, fl || null);
  const choisir = (e) => {
    const x = e.target.closest('[data-th]');
    if(!x) return;
    e.preventDefault();
    e.stopPropagation();
    const clair = x.dataset.th === 'clair';
    if(typeof appliquerTheme === 'function') appliquerTheme(clair);
    else if(document.body.classList.contains('clair') !== clair){ const b = $('themeBtn'); if(b) b.click(); }
    majThemeBas();
  };
  t.addEventListener('click', choisir);
  t.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') choisir(e); });
  majThemeBas();
}

function barrePrevoir(){
  if(barreMajPrevue) return;
  barreMajPrevue = true;
  setTimeout(barreMaj, 0);
}

function brancherBarre(){
  const menu = $('plusMenu');
  if(!menu || menu.dataset.barre) return;
  menu.dataset.barre = 'oui';

  const clic = (id, f) => { const b = $(id); if(b) b.addEventListener('click', () => setTimeout(f, 0)); };
  clic('plusCb', () => { if(typeof ouvrirCbGasoil === 'function') ouvrirCbGasoil(); });
  clic('plusTodo', () => { if(typeof basculerTD === 'function') basculerTD(); });
  clic('plusOut', () => { const o = $('logoutBtn'); if(o) o.click(); });

  /* Ce que les boutons du haut montrent, le menu le recopie */
  if(window.MutationObserver){
    const o = new MutationObserver(barrePrevoir);
    ['cbBtn', 'todoBtn', 'todoBtnN', 'logoutBtn', 'quiNom', 'quiRole', 'versionAffichee'].forEach(id => {
      const el = $(id);
      if(el) o.observe(el, { attributes: true, attributeFilter: ['style'], childList: true, subtree: true, characterData: true });
    });
  }
  brancherGuide();
  brancherThemeBas();
  const p = $('plusBtn');
  if(p) p.addEventListener('click', barreMaj, true);
  /* une carte qui « traîne » change avec le jour, pas avec un clic */
  setInterval(barrePrevoir, 60000);
  barreMaj();
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', brancherBarre);
else brancherBarre();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-barre.js'] = true;
