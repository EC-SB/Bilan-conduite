/* Déployé le 28/11/2026 à 12:25 — v1600 */
/* ============================================================
   ec-graphisme.js — 🎨 v1600
   LE GRAPHISME : LA VERSION, LE FOND ET LA BARRE DE CHACUN

   David, le 27 et le 28/11 (proposition « Verre 2 », montrée à ses
   collègues : « tu peux coder directement, c'est bon pour mes
   collègues ») :
     · Menu ⋯ › « 🎨 Graphisme » : la NOUVELLE version (au départ) ou
       la CLASSIQUE, sans verre ;
     · dans la nouvelle : le verre plus marqué à deux niveaux, un seul
       écart (16 / 20 / 24 px), l'en-tête dans un panneau, un fond
       derrière l'App, la barre du bas A (au départ) ou B ;
     · chacun choisit son fond, en ajoute (ses photos), en supprime :
       6 au plus par mode ; les unis, la photo 8 (sombre) et la photo 14
       (clair) ne se suppriment pas ;
     · le choix SUIT LA PERSONNE : il est gardé dans son compte (Worker,
       graphismeLire / graphismePoser), et sur l'appareil pour se poser
       tout de suite à l'ouverture ;
     · sur les comptes de David, Chrystel et Maryne : les FONDS DES
       ÉLÈVES — ajouter, renommer, mettre par défaut, supprimer (mêmes
       règles). Le défaut vaut pour l'élève qui n'a rien choisi ; celui
       qui a choisi garde le sien (eleve.html).

   La barre du bas porte son verre elle-même (feuille ci-dessous) : un
   flou mesuré avec des rayures qui défilent dessous.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */
(function(){
  'use strict';

  /* ---------- les fonds de départ (fichiers du site, app/fonds/) ---------- */
  const DOSSIER_FONDS = 'app/fonds/';
  const FONDS = {
    p08:      { nom: 'Photo 8',       mode: 'sombre', img: 'p08.jpg' },
    p06:      { nom: 'Photo 6',       mode: 'sombre', img: 'p06.jpg' },
    nuit:     { nom: 'Route de nuit', mode: 'sombre', paysage: 'nuit-paysage.jpg', portrait: 'nuit-portrait.jpg', voile: 0 },
    p12:      { nom: 'Photo 12',      mode: 'sombre', img: 'p12.jpg' },
    uninoir:  { nom: 'Uni noir',      mode: 'sombre', couleur: '#0B0D0C' },
    p14:      { nom: 'Photo 14',      mode: 'clair',  img: 'p14.jpg', voile: .06 },
    p03:      { nom: 'Photo 3',       mode: 'clair',  img: 'p03.jpg' },
    p13:      { nom: 'Photo 13',      mode: 'clair',  img: 'p13.jpg', voile: .06 },
    matin:    { nom: 'Matin clair',   mode: 'clair',  paysage: 'matin-paysage.jpg', portrait: 'matin-portrait.jpg', voile: 0 },
    brume:    { nom: 'Brume',         mode: 'clair',  paysage: 'brume-paysage.jpg', portrait: 'brume-portrait.jpg', voile: 0 },
    uniclair: { nom: 'Uni clair',     mode: 'clair',  couleur: '#E9EDE3' }
  };
  /* La photo en tête, l'uni en dernier : ni l'un ni l'autre ne s'enlève (le Worker tient la même règle) */
  const FIXES = { sombre: ['p08', 'uninoir'], clair: ['p14', 'uniclair'] };
  const DEPART = { sombre: ['p08', 'p06', 'nuit', 'p12', 'uninoir'], clair: ['p14', 'p03', 'p13', 'matin', 'brume', 'uniclair'] };
  const DEPART_ELEVES = { sombre: ['p08', 'p06', 'nuit', 'p12', 'uninoir'], clair: ['p14', 'p03', 'p13', 'matin', 'uniclair'] };
  const MAXI = 6;
  const MODES = { sombre: '🌙 Sombre', clair: '☀️ Clair' };
  /* Un voile sur une photo : sans lui, sur les plus lumineuses, de petits textes gris passaient sous le
     seuil de lisibilité (mesuré texte par texte sur la proposition) */
  const VOILE = { sombre: .52, clair: .24 };
  const CLE_CACHE = 'ec_graphisme';

  /* ---------- l'état ---------- */
  let G = null;            /* les réglages de la personne */
  let E = null;            /* les fonds des élèves (David, Chrystel, Maryne) */
  let gereEleves = false;
  let quiCharge = '';

  function ech(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function moi(){ return (typeof ACCES === 'object' && ACCES && ACCES.moniteur) ? String(ACCES.moniteur).trim() : ''; }
  function cleQui(){ return moi().toLowerCase(); }

  /* Même nettoyage que le Worker (fondsNettoyer) : l'écran montre tout de suite ce qui sera gardé */
  function nettoyer(x, depart){
    x = (x && typeof x === 'object') ? x : {};
    const perso = {};
    const pIn = (x.perso && typeof x.perso === 'object') ? x.perso : {};
    Object.keys(pIn).forEach(id => {
      const p = pIn[id] || {};
      if(!/^u[a-z0-9]{8,20}$/.test(id)) return;
      perso[id] = { nom: String(p.nom || 'Ma photo').slice(0, 40), mode: p.mode === 'clair' ? 'clair' : 'sombre', cle: p.cle || '' };
    });
    const liste = {}, choix = {};
    ['sombre', 'clair'].forEach(mode => {
      const l0 = (x.liste && Array.isArray(x.liste[mode])) ? x.liste[mode] : depart[mode];
      const l = [];
      l0.forEach(b => {
        const id = String(b || '');
        const m = (FONDS[id] && FONDS[id].mode) || (perso[id] && perso[id].mode);
        if(m === mode && l.indexOf(id) === -1) l.push(id);
      });
      if(l.indexOf(FIXES[mode][0]) === -1) l.unshift(FIXES[mode][0]);
      if(l.indexOf(FIXES[mode][1]) === -1) l.push(FIXES[mode][1]);
      for(let i = l.length - 1; l.length > MAXI && i >= 0; i--) if(FIXES[mode].indexOf(l[i]) === -1) l.splice(i, 1);
      liste[mode] = l;
      const c = String((x.choix && x.choix[mode]) || '');
      choix[mode] = l.indexOf(c) !== -1 ? c : FIXES[mode][0];
    });
    return { liste: liste, choix: choix, perso: perso, liens: Object.assign({}, x.liens || {}), noms: Object.assign({}, x.noms || {}) };
  }
  function nettoyerG(x){
    x = (x && typeof x === 'object') ? x : {};
    return Object.assign({ version: x.version === 'classique' ? 'classique' : 'nouvelle', barre: x.barre === 'B' ? 'B' : 'A' }, nettoyer(x, DEPART));
  }

  /* ---------- un fond : son nom, ses images ---------- */
  function lienComplet(l){ return l ? ((typeof CONFIG !== 'undefined' && CONFIG.WORKER_URL) ? CONFIG.WORKER_URL : '') + l : ''; }
  function decrire(id, etat){
    const f = FONDS[id];
    if(f){
      const nom = (etat && etat.noms && etat.noms[id]) || f.nom;
      if(f.couleur) return { id: id, nom: nom, mode: f.mode, couleur: f.couleur, vignette: '' };
      const p = DOSSIER_FONDS + (f.img || f.paysage), t = DOSSIER_FONDS + (f.img || f.portrait);
      return { id: id, nom: nom, mode: f.mode, paysage: p, portrait: t, vignette: p, voile: f.voile !== undefined ? f.voile : VOILE[f.mode] };
    }
    const p = etat && etat.perso && etat.perso[id];
    if(!p) return null;
    const u = lienComplet(etat.liens && etat.liens[id]);
    return { id: id, nom: p.nom, mode: p.mode, paysage: u, portrait: u, vignette: u, voile: VOILE[p.mode], perso: true };
  }

  /* ---------- poser le graphisme sur la page ---------- */
  function appliquer(){
    if(!G) G = nettoyerG(null);
    const nouvelle = G.version !== 'classique';
    if(typeof window.poserVerreEC === 'function') window.poserVerreEC(nouvelle);
    else document.body.classList.toggle('verre', nouvelle);
    document.body.classList.toggle('v2', nouvelle);
    document.body.classList.toggle('barreB', nouvelle && G.barre === 'B');
    const st = document.body.style;
    ['sombre', 'clair'].forEach(mode => {
      const d = decrire(G.choix[mode], G) || decrire(FIXES[mode][0], G);
      const uni = d.couleur ? d.couleur : (mode === 'clair' ? '#E9EDE3' : '#0B0D0C');
      const v = d.voile || 0;
      const voile = mode === 'clair' ? 'rgba(255,255,255,' + v + ')' : 'rgba(4,6,5,' + v + ')';
      st.setProperty('--fd-' + mode + '-c', uni);
      st.setProperty('--fd-' + mode + '-v', voile);
      st.setProperty('--fd-' + mode + '-p', d.paysage ? 'url("' + d.paysage + '")' : 'none');
      st.setProperty('--fd-' + mode + '-t', d.portrait ? 'url("' + d.portrait + '")' : 'none');
    });
    setTimeout(() => { try{ window.dispatchEvent(new Event('resize')); }catch(e){} }, 60);
  }

  /* ---------- garder, relire ---------- */
  function garderSurLAppareil(){
    try{ localStorage.setItem(CLE_CACHE, JSON.stringify({ qui: cleQui(), g: G })); }catch(e){}
  }
  function relireDeLAppareil(){
    try{
      const c = JSON.parse(localStorage.getItem(CLE_CACHE) || 'null');
      if(c && c.g) return nettoyerG(c.g);
    }catch(e){}
    return null;
  }
  function recevoir(r){
    if(!r || r.status !== 'ok') return;
    G = nettoyerG(r.graphisme);
    gereEleves = !!r.gereEleves;
    E = gereEleves ? nettoyer(r.eleves, DEPART_ELEVES) : null;
    garderSurLAppareil();
    appliquer();
    if(fen && fen.isConnected) dessiner();
  }
  async function charger(){
    try{ recevoir(await appelPrep({ action: 'graphismeLire' })); }catch(e){ /* hors ligne : l'appareil a son dernier choix */ }
  }
  let envoiPrevu = null;
  function enregistrer(){
    garderSurLAppareil();
    clearTimeout(envoiPrevu);
    envoiPrevu = setTimeout(async () => {
      try{
        const r = await appelPrep({ action: 'graphismePoser', graphisme: { version: G.version, barre: G.barre, liste: G.liste, choix: G.choix, perso: G.perso } });
        /* la réponse ne remplace que ce qui vient du serveur (les liens) : un clic fait entre-temps n'est pas défait */
        if(r && r.status === 'ok' && r.graphisme) G.liens = Object.assign({}, G.liens, r.graphisme.liens || {});
      }catch(e){
        if(typeof showToast === 'function') showToast('⚠️ Graphisme non enregistré : ' + (e.message || 'réseau'));
      }
    }, 500);
  }
  async function enregistrerEleves(){
    const r = await appelPrep({ action: 'fondsElevesPoser', eleves: { liste: E.liste, choix: E.choix, perso: E.perso, noms: E.noms } });
    if(r && r.status === 'ok' && r.eleves) E = nettoyer(r.eleves, DEPART_ELEVES);
  }

  /* ============================================================
     LA FENÊTRE
     ============================================================ */
  let fen = null, vueMode = { mien: '', eleves: '' }, popOuvert = null;
  function modeDuTheme(){ return document.body.classList.contains('clair') ? 'clair' : 'sombre'; }

  function ouvrir(){
    fermer();
    vueMode = { mien: modeDuTheme(), eleves: modeDuTheme() };
    fen = document.createElement('div');
    fen.className = 'grOv';
    fen.addEventListener('click', ev => { if(ev.target === fen) fermer(); });
    document.addEventListener('keydown', echap);
    document.body.appendChild(fen);
    dessiner();
    if(moi()) charger();
  }
  function fermer(){
    document.removeEventListener('keydown', echap);
    if(fen) fen.remove();
    fen = null; popOuvert = null;
  }
  function echap(ev){ if(ev.key === 'Escape'){ if(popOuvert){ popOuvert = null; dessiner(); } else fermer(); } }

  function seg(id, a, b, premier){
    return '<div class="grSeg" data-seg="' + id + '"><button type="button" data-v="0"' + (premier ? ' class="ici"' : '') + '>' + a + '</button>' +
      '<button type="button" data-v="1"' + (premier ? '' : ' class="ici"') + '>' + b + '</button></div>';
  }
  function tuile(d, o){
    const fixe = FIXES[d.mode].indexOf(d.id) !== -1;
    const fond = d.couleur ? 'background-color:' + d.couleur : 'background-image:url(&quot;' + ech(d.vignette) + '&quot;)';
    return '<div class="grTuile" style="position:relative">' +
      '<button type="button" class="grF' + (o.ici ? ' ici' : '') + (o.vise ? ' vise' : '') + '" data-f="' + ech(d.id) + '" data-o="' + o.ou + '" aria-pressed="' + (o.ici ? 'true' : 'false') + '">' +
      '<i style="' + fond + '">' + (fixe ? '<em class="grL" title="Ne se supprime pas">🔒</em>' : '') + '</i>' + ech(d.nom) +
      (o.def ? '<br><span class="grDef">Par défaut</span>' : '') + '</button>' +
      (!fixe && o.croix ? '<button type="button" class="grX" data-x="' + ech(d.id) + '" data-o="' + o.ou + '" aria-label="Supprimer ' + ech(d.nom) + '">✕</button>' : '') +
      '</div>';
  }
  function grille(etat, mode, ou){
    const l = etat.liste[mode];
    let h = '<div class="grGr">';
    l.forEach(id => {
      const d = decrire(id, etat);
      if(!d) return;
      h += tuile(d, { ou: ou, ici: ou === 'mien' && etat.choix[mode] === id, def: ou === 'eleves' && etat.choix[mode] === id,
                      croix: ou === 'mien', vise: popOuvert && popOuvert.ou === ou && popOuvert.id === id });
    });
    if(l.length < MAXI) h += '<div class="grTuile"><button type="button" class="grF grAj" data-aj="' + ou + '"><i>＋</i>Ajouter</button></div>';
    h += '</div>';
    return h;
  }
  function popHtml(){
    if(!popOuvert) return '';
    const p = popOuvert;
    if(p.type === 'ajout'){
      const etat = p.ou === 'mien' ? G : E, mode = vueMode[p.ou];
      /* un fond de départ enlevé peut revenir */
      const manquants = Object.keys(FONDS).filter(id => FONDS[id].mode === mode && etat.liste[mode].indexOf(id) === -1);
      let h = '<div class="grPop" data-pop="1"><button type="button" data-act="photo">📷 Une photo</button>';
      manquants.forEach(id => { h += '<button type="button" data-act="remettre" data-id="' + id + '">↩️ Remettre « ' + ech((etat.noms && etat.noms[id]) || FONDS[id].nom) + ' »</button>'; });
      return h + '</div>';
    }
    const fixe = FIXES[vueMode.eleves].indexOf(p.id) !== -1;
    return '<div class="grPop" data-pop="1"><button type="button" data-act="renommer">✏️ Renommer</button>' +
      '<button type="button" data-act="defaut">⭐ Mettre par défaut</button>' +
      (fixe ? '' : '<button type="button" data-act="supprimer" class="rouge">🗑️ Supprimer</button>') + '</div>';
  }

  function dessiner(){
    if(!fen) return;
    if(!G) G = nettoyerG(null);
    const nouvelle = G.version !== 'classique';
    const m = vueMode.mien;
    let gauche = '<div class="grSec"><h4>🫧 Version</h4>' + seg('version', 'Classique', 'Nouvelle', !nouvelle) +
      '<p class="grNote" style="margin:0">' + (nouvelle ? 'Elle suit ton compte, sur tous tes appareils.' : 'Le graphisme d’avant, sans verre. Il suit ton compte, sur tous tes appareils.') + '</p></div>';
    if(nouvelle){
      gauche += '<div class="grSec"><h4>🖼️ Mon fond <small>' + G.liste[m].length + ' / ' + MAXI + '</small></h4>' + seg('mien', MODES.clair, MODES.sombre, m === 'clair') +
        grille(G, m, 'mien') + (popOuvert && popOuvert.ou === 'mien' ? popHtml() : '') +
        '<p class="grNote">' + (G.liste[m].length >= MAXI ? MAXI + ' fonds au plus par mode : supprime-en un pour en ajouter un autre. ' : '') +
        '🔒 L’uni et la photo ' + (m === 'clair' ? '14' : '8') + ' restent toujours.' + (m !== modeDuTheme() ? ' Ce fond s’affiche quand l’App est en mode ' + (m === 'clair' ? 'clair' : 'sombre') + '.' : '') + '</p></div>';
      gauche += '<div class="grSec"><h4>📱 Barre du bas <small>sur téléphone</small></h4><div class="grBarres">' +
        '<button type="button" class="grBarre' + (G.barre === 'A' ? ' ici' : '') + '" data-barre="A"><span class="grMini"><span class="l"></span><span></span><span></span><span></span><span></span></span><span><b>A</b> · l’onglet ouvert porte son nom (au départ)</span></button>' +
        '<button type="button" class="grBarre' + (G.barre === 'B' ? ' ici' : '') + '" data-barre="B"><span class="grMini b"><span class="l"></span><span></span><span></span><span></span><span></span></span><span><b>B</b> · les huit noms, en plus petit</span></button></div></div>';
    }
    let droite = '';
    if(gereEleves && E){
      const me = vueMode.eleves;
      droite = '<div class="grSec"><h4>🎓 Fonds des élèves <small>' + E.liste[me].length + ' / ' + MAXI + '</small></h4>' + seg('eleves', MODES.clair, MODES.sombre, me === 'clair') +
        grille(E, me, 'eleves') + (popOuvert && popOuvert.ou === 'eleves' ? popHtml() : '') +
        '<p class="grNote">Touche un fond pour le renommer, le mettre par défaut ou le supprimer. ⭐ Le fond par défaut vaut pour les élèves qui n’ont rien choisi : ceux qui ont choisi gardent le leur. Si un fond choisi par un élève est supprimé, il repasse au fond par défaut. Les élèves ne peuvent ni ajouter ni supprimer.</p></div>';
    }
    const large = !!droite;
    /* on redessine sans remonter en haut de la fenêtre */
    const avant = fen.querySelector('.grFen');
    const haut = avant ? avant.scrollTop : 0;
    fen.innerHTML = '<div class="grFen' + (large ? ' large' : '') + '" role="dialog" aria-label="Graphisme"><div class="grTete"><h3>🎨 Graphisme</h3><button type="button" class="grFerme" aria-label="Fermer">✕</button></div>' +
      (large ? '<div class="grCols"><div class="grCol">' + gauche + '</div><div class="grCol">' + droite + '</div></div>' : gauche) + '</div>';
    fen.querySelector('.grFen').scrollTop = haut;
    brancher();
    placerLePop();
  }

  function placerLePop(){
    if(!popOuvert || !fen) return;
    const pop = fen.querySelector('.grPop');
    if(!pop) return;
    const sec = pop.parentElement, gr = sec.querySelector('.grGr');
    let cible = null;
    if(popOuvert.type === 'ajout') cible = sec.querySelector('[data-aj]');
    else cible = sec.querySelector('.grF[data-f="' + popOuvert.id + '"]');
    if(!cible || !gr) return;
    sec.style.position = 'relative';
    const rs = sec.getBoundingClientRect(), rc = cible.getBoundingClientRect();
    const larg = 210;
    let x = rc.left - rs.left - 10;
    x = Math.max(8, Math.min(x, rs.width - larg - 8));
    pop.style.left = x + 'px';
    pop.style.top = (rc.bottom - rs.top + 6) + 'px';
  }

  function brancher(){
    const f = fen.querySelector('.grFen');
    f.querySelector('.grFerme').addEventListener('click', fermer);
    f.addEventListener('click', ev => {
      if(popOuvert && !ev.target.closest('.grPop') && !ev.target.closest('.grF')){ popOuvert = null; dessiner(); }
    });
    f.querySelectorAll('.grSeg').forEach(s => s.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const deux = b.getAttribute('data-v') === '1', quoi = s.getAttribute('data-seg');
      popOuvert = null;
      if(quoi === 'version'){ G.version = deux ? 'nouvelle' : 'classique'; appliquer(); enregistrer(); }
      else vueMode[quoi] = deux ? 'sombre' : 'clair';
      dessiner();
    })));
    f.querySelectorAll('[data-barre]').forEach(b => b.addEventListener('click', () => {
      G.barre = b.getAttribute('data-barre') === 'B' ? 'B' : 'A'; appliquer(); enregistrer(); dessiner();
    }));
    f.querySelectorAll('.grF[data-f]').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      const id = b.getAttribute('data-f'), ou = b.getAttribute('data-o');
      if(ou === 'mien'){
        G.choix[vueMode.mien] = id; popOuvert = null; appliquer(); enregistrer(); dessiner();
      }else{
        popOuvert = (popOuvert && popOuvert.ou === 'eleves' && popOuvert.id === id) ? null : { ou: 'eleves', id: id };
        dessiner();
      }
    }));
    f.querySelectorAll('.grX').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); retirerMien(b.getAttribute('data-x')); }));
    f.querySelectorAll('[data-aj]').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      const ou = b.getAttribute('data-aj');
      popOuvert = (popOuvert && popOuvert.type === 'ajout' && popOuvert.ou === ou) ? null : { type: 'ajout', ou: ou };
      dessiner();
    }));
    const pop = f.querySelector('.grPop');
    if(pop) pop.querySelectorAll('button[data-act]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); agirDuPop(b.getAttribute('data-act'), b.getAttribute('data-id')); }));
  }

  /* ---------- les gestes ---------- */
  async function retirerMien(id){
    const m = vueMode.mien;
    if(FIXES[m].indexOf(id) !== -1) return;
    const d = decrire(id, G);
    if(d && d.perso){
      const ok = (typeof confirmer === 'function') ? await confirmer('La photo « ' + d.nom + ' » sera effacée. Tu pourras en ajouter une autre.', 'Supprimer ce fond', true) : true;
      if(!ok) return;
    }
    G.liste[m] = G.liste[m].filter(x => x !== id);
    if(G.perso[id]) delete G.perso[id];
    if(G.choix[m] === id) G.choix[m] = FIXES[m][0];
    popOuvert = null; appliquer(); enregistrer(); dessiner();
  }

  async function agirDuPop(act, idRemettre){
    const p = popOuvert;
    if(!p) return;
    if(p.type === 'ajout'){
      const etat = p.ou === 'mien' ? G : E, mode = vueMode[p.ou];
      popOuvert = null;
      if(act === 'remettre'){
        if(etat.liste[mode].length >= MAXI) return dessiner();
        const l = etat.liste[mode];
        l.splice(l.length - 1, 0, idRemettre);
        if(p.ou === 'mien'){ enregistrer(); dessiner(); }
        else await geste(async () => { await enregistrerEleves(); });
        return;
      }
      dessiner();
      return choisirUnePhoto(p.ou);
    }
    /* un fond des élèves */
    const id = p.id, mode = vueMode.eleves, d = decrire(id, E);
    popOuvert = null;
    if(act === 'renommer'){
      dessiner();
      const n = (typeof demander === 'function') ? await demander('Le nom que verront les élèves :', d ? d.nom : '', 'Renommer le fond') : null;
      if(n === null || n === undefined) return;
      const nom = String(n).replace(/\s+/g, ' ').trim().slice(0, 40);
      if(!nom) return;
      if(E.perso[id]) E.perso[id].nom = nom;
      else{ E.noms = E.noms || {}; E.noms[id] = nom; }
      return geste(enregistrerEleves);
    }
    if(act === 'defaut'){ E.choix[mode] = id; return geste(enregistrerEleves); }
    if(act === 'supprimer'){
      dessiner();
      if(FIXES[mode].indexOf(id) !== -1) return;
      const ok = (typeof confirmer === 'function') ? await confirmer('« ' + (d ? d.nom : id) + ' » ne sera plus proposé aux élèves. Ceux qui l’avaient choisi repasseront au fond par défaut.' + (d && d.perso ? ' La photo sera effacée.' : ''), 'Supprimer ce fond des élèves', true) : true;
      if(!ok) return;
      E.liste[mode] = E.liste[mode].filter(x => x !== id);
      if(E.perso[id]) delete E.perso[id];
      if(E.choix[mode] === id) E.choix[mode] = FIXES[mode][0];
      return geste(enregistrerEleves);
    }
  }
  async function geste(faire){
    const f = fen && fen.querySelector('.grFen');
    if(f) f.classList.add('grAttente');
    try{ await faire(); }
    catch(e){ if(typeof showToast === 'function') showToast('⚠️ ' + (e.message || 'Non enregistré')); }
    if(f) f.classList.remove('grAttente');
    dessiner();
  }

  /* ---------- ajouter une photo : réduite ici, avant l'envoi ---------- */
  function choisirUnePhoto(ou){
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', async () => {
      const fichier = inp.files && inp.files[0];
      inp.remove();
      if(!fichier) return;
      try{
        const img = await chargerImage(fichier);
        const preparee = reduire(img);
        fenetreNouveauFond(ou, preparee, String(fichier.name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 40) || 'Ma photo');
      }catch(e){
        if(typeof showToast === 'function') showToast('⚠️ Cette image ne s’ouvre pas : ' + (e.message || ''));
      }
    });
    inp.click();
  }
  function chargerImage(fichier){
    return new Promise((ok, ko) => {
      const u = URL.createObjectURL(fichier);
      const img = new Image();
      img.onload = () => { ok(img); setTimeout(() => URL.revokeObjectURL(u), 1000); };
      img.onerror = () => { URL.revokeObjectURL(u); ko(new Error('format non reconnu')); };
      img.src = u;
    });
  }
  /* 1920 px au plus du grand côté, en JPEG : assez pour un écran, léger à charger */
  function reduire(img){
    const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    const k = Math.min(1, 1920 / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    x.drawImage(img, 0, 0, w, h);
    let q = .86, data = c.toDataURL('image/jpeg', q);
    while(data.length > 2.6e6 && q > .5){ q -= .12; data = c.toDataURL('image/jpeg', q); }
    /* plutôt claire ou plutôt sombre : la moyenne de la lumière sur une image réduite */
    const p = document.createElement('canvas'); p.width = 24; p.height = 24;
    const px = p.getContext('2d'); px.drawImage(c, 0, 0, 24, 24);
    const o = px.getImageData(0, 0, 24, 24).data;
    let s = 0;
    for(let i = 0; i < o.length; i += 4) s += .2126 * o[i] + .7152 * o[i + 1] + .0722 * o[i + 2];
    const lum = s / (o.length / 4) / 255;
    return { data: data, mode: lum < .5 ? 'sombre' : 'clair' };
  }
  function fenetreNouveauFond(ou, prep, nomDepart){
    let mode = prep.mode;
    const ov = document.createElement('div');
    ov.className = 'grOv';
    ov.style.zIndex = '2300';
    const dess = () => {
      const etat = ou === 'mien' ? G : E;
      const plein = !!(etat && etat.liste[mode].length >= MAXI);
      ov.innerHTML = '<div class="grFen" role="dialog" aria-label="Nouveau fond"><div class="grTete"><h3>＋ Nouveau fond' + (ou === 'eleves' ? ' des élèves' : '') + '</h3><button type="button" class="grFerme" aria-label="Fermer">✕</button></div>' +
        '<div class="grApercu" style="background-image:url(&quot;' + prep.data + '&quot;)"></div>' +
        '<label class="grChamp">Nom<input type="text" maxlength="40" value="' + ech(nomDepart) + '"></label>' +
        '<label class="grChamp" style="margin-bottom:6px">Mode</label>' + seg('mode', MODES.clair, MODES.sombre, mode === 'clair') +
        '<p class="grProp">Proposé : la photo est plutôt ' + (prep.mode === 'clair' ? 'claire' : 'sombre') + '.' +
        (plein ? ' ⚠️ Le mode ' + (mode === 'clair' ? 'clair' : 'sombre') + ' a déjà ' + MAXI + ' fonds : supprimes-en un d’abord, ou choisis l’autre mode.' : '') + '</p>' +
        '<p class="grNote" style="margin:0 0 16px">La photo est réduite et reçoit un voile léger, pour que les textes de l’App restent lisibles dessus.</p>' +
        '<div class="btn-row"><button type="button" class="btn btn-secondary" data-a="non">Annuler</button><button type="button" class="btn btn-primary" data-a="oui"' + (plein ? ' disabled style="opacity:.5"' : '') + '>Ajouter</button></div></div>';
      const inp = ov.querySelector('input');
      inp.addEventListener('input', () => { nomDepart = inp.value; });
      ov.querySelector('.grFerme').addEventListener('click', () => ov.remove());
      ov.querySelector('[data-a="non"]').addEventListener('click', () => ov.remove());
      ov.querySelectorAll('.grSeg button').forEach(b => b.addEventListener('click', () => { mode = b.getAttribute('data-v') === '1' ? 'sombre' : 'clair'; dess(); }));
      ov.querySelector('[data-a="oui"]').addEventListener('click', () => ajouter(ov, ou, prep, nomDepart, mode));
    };
    ov.addEventListener('click', ev => { if(ev.target === ov) ov.remove(); });
    dess();
    document.body.appendChild(ov);
  }
  async function ajouter(ov, ou, prep, nom, mode){
    const etat = ou === 'mien' ? G : E;
    if(!etat) return;
    if(etat.liste[mode].length >= MAXI){
      if(typeof showToast === 'function') showToast('⚠️ ' + MAXI + ' fonds au plus en mode ' + (mode === 'clair' ? 'clair' : 'sombre') + ' : supprimes-en un d’abord.');
      return;
    }
    const f = ov.querySelector('.grFen');
    f.classList.add('grAttente');
    try{
      const r = await appelPrep({ action: 'fondDeposer', image: prep.data });
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Dépôt refusé');
      const id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      etat.perso[id] = { nom: String(nom || '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Ma photo', mode: mode, cle: r.cle };
      etat.liens = etat.liens || {};
      etat.liens[id] = r.lien;
      const l = etat.liste[mode];
      l.splice(l.length - 1, 0, id);
      ov.remove();
      if(ou === 'mien'){
        G.choix[mode] = id; vueMode.mien = mode;
        appliquer();
        clearTimeout(envoiPrevu);
        garderSurLAppareil();
        await appelPrep({ action: 'graphismePoser', graphisme: { version: G.version, barre: G.barre, liste: G.liste, choix: G.choix, perso: G.perso } });
      }else{
        vueMode.eleves = mode;
        await enregistrerEleves();
      }
      if(typeof showToast === 'function') showToast('🖼️ Fond ajouté');
      dessiner();
    }catch(e){
      f.classList.remove('grAttente');
      if(typeof showToast === 'function') showToast('⚠️ ' + (e.message || 'Photo non envoyée'));
    }
  }

  /* ============================================================
     LE DÉMARRAGE
     ============================================================ */
  function poserLaFeuille(){
    if(document.getElementById('ecVerre2')) return;
    const s = document.createElement('style');
    s.id = 'ecVerre2';
    s.textContent = FEUILLE;
    document.head.appendChild(s);
  }
  function demarrer(){
    poserLaFeuille();
    G = relireDeLAppareil() || nettoyerG(null);
    appliquer();
    const b = document.getElementById('verreBtn');
    if(b) b.addEventListener('click', () => {
      const m = document.getElementById('plusMenu');
      if(m) m.style.display = 'none';
      ouvrir();
    });
    /* la personne : ses réglages dès qu'elle est connue, et à chaque changement de compte */
    setInterval(() => {
      const q = cleQui();
      if(q && q !== quiCharge){ quiCharge = q; charger(); }
      if(!q) quiCharge = '';
    }, 1500);
  }

  const FEUILLE = `
body.verre.v2{
  --e:16px;                 /* L'ÉCART : entre deux blocs, au bord de l'écran, dans un bloc */
  --r1:26px; --r2:16px;     /* les rayons : un panneau, un bloc dans un panneau (le reste : capsules) */
  background:#EEF2E8;
}
@media (min-width:700px){ body.verre.v2{ --e:20px; } }
@media (min-width:1280px){ body.verre.v2{ --e:24px; --r1:28px; --r2:18px; } }

/* ── 1. LE FOND : celui que la personne a choisi, un pour chaque mode (posé par ce module en variables) ── */
body.verre.v2{ background:var(--fd-clair-c, #E9EDE3); }
body.verre.v2:not(.clair){ background:var(--fd-sombre-c, #0B0D0C); }
body.verre.v2::before{ content:""; position:fixed; inset:0; z-index:-1; pointer-events:none;
  background:linear-gradient(var(--fd-clair-v, transparent), var(--fd-clair-v, transparent)), var(--fd-clair-p, none) center / cover no-repeat, var(--fd-clair-c, #E9EDE3); }
body.verre.v2:not(.clair)::before{
  background:linear-gradient(var(--fd-sombre-v, transparent), var(--fd-sombre-v, transparent)), var(--fd-sombre-p, none) center / cover no-repeat, var(--fd-sombre-c, #0B0D0C); }
@media (max-aspect-ratio: 1/1){
  body.verre.v2::before{ background:linear-gradient(var(--fd-clair-v, transparent), var(--fd-clair-v, transparent)), var(--fd-clair-t, none) center / cover no-repeat, var(--fd-clair-c, #E9EDE3); }
  body.verre.v2:not(.clair)::before{ background:linear-gradient(var(--fd-sombre-v, transparent), var(--fd-sombre-v, transparent)), var(--fd-sombre-t, none) center / cover no-repeat, var(--fd-sombre-c, #0B0D0C); }
}

/* ── 2. LA MATIÈRE ──────────────────────────────────────── */
body.verre.v2{
  /* clair : un verre dépoli blanc */
  --v-fond:linear-gradient(135deg,rgba(255,255,255,.84) 0%,rgba(255,255,255,.72) 42%,rgba(255,255,255,.68) 100%);
  --v-filtre:blur(20px) saturate(175%) brightness(1.10);
  --v-ombre:inset 0 1px 0 rgba(255,255,255,1), inset 1px 0 0 rgba(255,255,255,.55), inset 0 -1px 0 rgba(30,45,20,.07),
            0 28px 60px -22px rgba(25,40,15,.45), 0 3px 8px rgba(25,40,15,.10);
  --v-lisere:linear-gradient(135deg,rgba(255,255,255,1) 0%,rgba(255,255,255,.55) 30%,rgba(255,255,255,.20) 62%,rgba(255,255,255,.85) 100%);
  --v-reflet:linear-gradient(118deg,rgba(255,255,255,.55) 0%,rgba(255,255,255,.10) 22%,rgba(255,255,255,0) 40%);
  --v2-fond:rgba(255,255,255,.46); --v2-bord:rgba(255,255,255,.80); --v2-ombre:inset 0 1px 0 rgba(255,255,255,.95), 0 1px 2px rgba(25,40,15,.06);
  --v-sep:rgba(20,30,15,.10);
  --muted:#3C433A;
  /* les anciens jetons suivent, pour tout ce qui s'en sert déjà */
  --verre:var(--v2-fond); --verre2:var(--v2-fond); --verre3:rgba(255,255,255,.72);
  --verre-bord:var(--v2-bord); --verre-reflet:rgba(255,255,255,.95); --verre-sep:var(--v-sep);
  --verre-ombre:rgba(25,40,15,.12); --verre-ombre2:rgba(25,40,15,.30);
  --lentille:linear-gradient(180deg,#D8FF78 0%,#B6FF0E 100%);
  --lentille-ombre:0 8px 20px -4px rgba(120,190,0,.55);
}
body.verre.v2:not(.clair){
  /* sombre : un verre fumé */
  --v-fond:linear-gradient(135deg,rgba(255,255,255,.13) 0%,rgba(255,255,255,.045) 40%,rgba(255,255,255,.02) 100%), rgba(10,13,11,.60);
  --v-filtre:blur(20px) saturate(170%) brightness(.62);
  --v-ombre:inset 0 1px 0 rgba(255,255,255,.34), inset 1px 0 0 rgba(255,255,255,.10), inset 0 -1px 0 rgba(255,255,255,.05),
            0 30px 70px -20px rgba(0,0,0,.85), 0 3px 10px rgba(0,0,0,.40);
  --v-lisere:linear-gradient(135deg,rgba(255,255,255,.70) 0%,rgba(255,255,255,.16) 28%,rgba(255,255,255,.05) 60%,rgba(214,255,110,.45) 100%);
  --v-reflet:linear-gradient(118deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,.03) 22%,rgba(255,255,255,0) 40%);
  --v2-fond:rgba(255,255,255,.07); --v2-bord:rgba(255,255,255,.14); --v2-ombre:inset 0 1px 0 rgba(255,255,255,.14), 0 1px 2px rgba(0,0,0,.25);
  --v-sep:rgba(255,255,255,.11);
  --muted:#C8CDC1;
  --verre3:rgba(14,17,15,.62);
  --verre-reflet:rgba(255,255,255,.30); --verre-ombre:rgba(0,0,0,.45); --verre-ombre2:rgba(0,0,0,.65);
  --lentille-ombre:0 8px 22px -4px rgba(182,255,14,.50);
}

/* LE PANNEAU DE VERRE : la carte, le bandeau du jour, le rail, la barre des onglets */
body.verre.v2 .card,
body.verre.v2 #bandeauJour{
  position:relative; isolation:isolate;
  background:var(--v-fond) !important;
  -webkit-backdrop-filter:var(--v-filtre); backdrop-filter:var(--v-filtre);
  border:0 !important; border-radius:var(--r1) !important;
  box-shadow:var(--v-ombre) !important;
}
/* le reflet : une lumière qui glisse du coin haut gauche */
body.verre.v2 .card::before,
body.verre.v2 #bandeauJour::before{
  content:""; position:absolute; inset:0; left:0; right:0; top:0; height:auto; z-index:-1; border-radius:inherit;
  background:var(--v-reflet); pointer-events:none;
}
/* le liseré : un fil de lumière sur l'arête, plus vif en haut à gauche et en bas à droite */
body.verre.v2 .card::after,
body.verre.v2 #bandeauJour::after,
body.verre.v2 #barreOnglets::after{
  content:""; position:absolute; inset:0; border-radius:inherit; padding:1.2px; pointer-events:none;
  background:var(--v-lisere);
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
}

/* ── 3. LA MESURE ───────────────────────────────────────── */
body.verre.v2 .wrap{ padding:var(--e) var(--e) 60px; }
body.verre.v2.avec-onglets .wrap{ padding-bottom:calc(var(--e) * 2 + 64px); }
body.verre.v2 header{ padding:0; margin:0 0 var(--e); min-height:48px; align-items:center; gap:12px; }
body.verre.v2 .card{ padding:var(--e); margin-bottom:var(--e); }
body.verre.v2 #bandeauJour{ margin:0 0 var(--e); padding:0; overflow:hidden; }
body.verre.v2 #bandeauJour > div{ background:transparent !important; margin:0 !important; border-radius:0 !important; padding:calc(var(--e) - 6px) var(--e) !important; border-left:0 !important; }
body.verre.v2 #bandeauJour > button{ margin:0 !important; width:100%; background:transparent !important; border:0 !important; box-shadow:none !important; padding:13px var(--e) !important; justify-content:flex-start; }
body.verre.v2 #zoneTravail{ gap:var(--e); }
body.verre.v2 #zoneTravail > .barre-vues{ margin-bottom:var(--e); }

/* l'en-tête : six ronds de verre identiques, au même pas */
body.verre.v2 .logo{ width:48px; height:48px; border-radius:var(--r2);
  background:linear-gradient(160deg,#E2FF8F 0%,#B6FF0E 70%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.95), inset 0 -2px 0 rgba(0,0,0,.10), 0 10px 24px -6px rgba(120,190,0,.65); }
body.verre.v2 header button, body.verre.v2 header a#guideBtn{
  width:48px; height:48px; min-width:48px; margin:0 !important;
  background:var(--v-fond) !important; -webkit-backdrop-filter:var(--v-filtre); backdrop-filter:var(--v-filtre);
  border:0 !important; box-shadow:var(--v-ombre) !important;
}
body.verre.v2 #plusZone{ width:48px; }
body.verre.v2:not(.clair) header h1, body.verre.v2:not(.clair) #quiNom{ text-shadow:0 1px 12px rgba(0,0,0,.6); }
body.verre.v2 #plusMenu button{ width:auto; height:auto; min-width:0; }

/* LA BARRE DES ONGLETS : huit cases égales dans une capsule de verre */
body.verre.v2 #barreOnglets{ left:var(--e); right:var(--e); bottom:var(--e); padding:6px; gap:0; }
body.verre.v2 #barreOnglets::after{ border-radius:999px; }
body.verre.v2 #barreOnglets .onglet{ flex:1 1 0; min-width:0; border-radius:999px; }
body.verre.v2 #barreOnglets .pastille{ box-shadow:inset 0 1px 0 rgba(255,255,255,.95), inset 0 -2px 0 rgba(0,0,0,.08), var(--lentille-ombre); }
/* téléphone : l'onglet ouvert s'allonge et porte son nom, les autres ne gardent que l'icône */
@media (max-width:699px){
  body.verre.v2 #barreOnglets .pastille{ display:none; }
  body.verre.v2 #barreOnglets .onglet{ flex:0 0 auto; width:38px; height:46px; padding:0; font-size:0; justify-content:center; }
  body.verre.v2 #barreOnglets .onglet.actif{ flex:1 1 0; width:auto; font-size:13.5px; flex-direction:row; gap:8px; color:#0B0B0B;
    background:var(--lentille); box-shadow:inset 0 1px 0 rgba(255,255,255,.95), inset 0 -2px 0 rgba(0,0,0,.08), var(--lentille-ombre); }
  body.verre.v2 #barreOnglets .onglet .vgl{ width:23px; height:23px; }
  body.verre.v2 #barreOnglets .alerte{ left:auto; right:1px; margin:0; }
}
@media (min-width:700px) and (max-width:1399px){
  body.verre.v2 #barreOnglets{ left:var(--e); right:var(--e); transform:none; width:auto; }
}
@media (min-width:1400px){
  body.verre.v2 #barreOnglets{ left:auto; right:auto; top:var(--e); bottom:auto; width:min(1000px, 100%); max-width:1000px; margin:0 auto var(--e); padding:6px; }
  body.verre.v2 #barreOnglets .onglet{ padding:11px 6px; font-size:13.5px; gap:8px; }
}

/* LES SOUS-MENUS en rangée (téléphone, tablette) : des capsules de même hauteur, sur une grille */
body.verre.v2 .barre-vues button{
  background:var(--v-fond); -webkit-backdrop-filter:var(--v-filtre); backdrop-filter:var(--v-filtre);
  border:0; box-shadow:var(--v-ombre); min-height:46px;
}
body.verre.v2 .barre-vues button.actif{ background:var(--lentille); box-shadow:inset 0 1px 0 rgba(255,255,255,.95), inset 0 -2px 0 rgba(0,0,0,.08), var(--lentille-ombre); }
@media (min-width:700px) and (max-width:1279px){
  body.verre.v2 #zoneTravail > .barre-vues[style*="flex"]{ display:grid !important; grid-template-columns:repeat(auto-fill,minmax(176px,1fr)); gap:12px; overflow:visible; }
  body.verre.v2 #zoneTravail > .barre-vues button{ width:100%; justify-content:flex-start; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:0; }
}
/* le rail (ordinateur) : dans le panneau, les lignes sont des blocs de second niveau, sans flou */
@media (min-width:1280px){
  body.verre.v2.cours-neuf #zoneTravail > .barre-vues{ background:var(--v-fond) !important; -webkit-backdrop-filter:var(--v-filtre); backdrop-filter:var(--v-filtre);
    border:0 !important; border-radius:var(--r1) !important; box-shadow:var(--v-ombre) !important; padding:12px !important; margin-bottom:0; }
  body.verre.v2.cours-neuf #zoneTravail > .barre-vues button{ background:var(--v2-fond); -webkit-backdrop-filter:none; backdrop-filter:none; border:1px solid var(--v2-bord); box-shadow:var(--v2-ombre); border-radius:var(--r2); min-height:48px; }
  body.verre.v2.cours-neuf #zoneTravail > .barre-vues button.actif{ background:var(--lentille); border-color:transparent; box-shadow:inset 0 1px 0 rgba(255,255,255,.95), var(--lentille-ombre); }
}

/* LE SECOND NIVEAU : ce qui est posé DANS un panneau (champs, blocs repliables, lignes) */
body.verre.v2 input[type=text], body.verre.v2 input[type=date], body.verre.v2 input[type=tel], body.verre.v2 input[type=email],
body.verre.v2 input[type=number], body.verre.v2 input[type=time], body.verre.v2 input[type=month], body.verre.v2 input[type=search],
body.verre.v2 input[type=password], body.verre.v2 select, body.verre.v2 textarea{
  background:var(--v2-fond); border:1px solid var(--v2-bord); border-radius:var(--r2); box-shadow:var(--v2-ombre);
}
body.verre.v2 .card details, body.verre.v2 .card .card{ border-radius:var(--r2) !important; }
body.verre.v2 .card .card{ background:var(--v2-fond) !important; -webkit-backdrop-filter:none; backdrop-filter:none; box-shadow:var(--v2-ombre) !important; border:1px solid var(--v2-bord) !important; }
body.verre.v2 .card .card::before, body.verre.v2 .card .card::after{ display:none; }
body.verre.v2 .btn-secondary{ background:var(--v2-fond); border:1px solid var(--v2-bord); box-shadow:var(--v2-ombre); }
body.verre.v2 .btn-primary, body.verre.v2 .rec-btn.idle, body.verre.v2 .history-item .depart .btnDemarrer{
  box-shadow:inset 0 1px 0 rgba(255,255,255,.95), inset 0 -2px 0 rgba(0,0,0,.08), var(--lentille-ombre); }

/* le bandeau du jour garde son repère vert, à gauche */
body.verre.v2 #bandeauJour{ background:linear-gradient(#B6FF0E,#B6FF0E) 12px 50% / 4px calc(100% - 28px) no-repeat, var(--v-fond) !important; }
body.verre.v2 #bandeauJour > div, body.verre.v2 #bandeauJour > button{ padding-left:calc(var(--e) + 12px) !important; }
/* l'en-tête, sur téléphone : quatre ronds au même pas */
body.verre.v2 #plusZone{ width:48px; flex:none; display:flex; justify-content:flex-end; }
body.verre.v2 #plusZone > button{ margin:0 !important; }
/* le cours de maintenant : un verre teinté de vert, plus un aplat */
body.verre.v2.cours-neuf .rubanTete{ background:linear-gradient(135deg,rgba(226,255,150,.62),rgba(200,255,90,.34)) !important; border:1.5px solid rgba(110,170,0,.75); border-radius:var(--r2); padding:var(--e); box-shadow:inset 0 1px 0 rgba(255,255,255,.9), 0 10px 24px -12px rgba(90,150,0,.45); }
body.verre.v2:not(.clair).cours-neuf .rubanTete{ background:linear-gradient(135deg,rgba(182,255,14,.16),rgba(182,255,14,.06)) !important; border-color:rgba(182,255,14,.55); box-shadow:inset 0 1px 0 rgba(255,255,255,.14), 0 10px 24px -12px rgba(0,0,0,.6); }
body.verre.v2.cours-neuf details.resteDuJour{ background:var(--v2-fond) !important; border:1px solid var(--v2-bord); border-radius:var(--r2); box-shadow:var(--v2-ombre); }

/* l'écran Cours en deux volets (ordinateur) : la journée et le cours sont deux blocs de second niveau, au même écart */
body.verre.v2 .listeDeuxVolets{ gap:var(--e); background:transparent !important; border:0 !important; }
body.verre.v2 .listeDeuxVolets > .journee, body.verre.v2 .listeDeuxVolets > .cours{ background:var(--v2-fond) !important; border:1px solid var(--v2-bord) !important; border-radius:var(--r2) !important; box-shadow:var(--v2-ombre); padding:var(--e) !important; }
body.verre.v2 .listeDeuxVolets .plierJournee{ border-radius:999px; background:var(--v2-fond); border:1px solid var(--v2-bord); }
body.verre.v2 .listeDeuxVolets details{ background:var(--v2-fond) !important; border-radius:var(--r2) !important; }

/* la barre des onglets est un verre ÉPAIS : ce qui défile dessous ne doit jamais gêner la lecture des noms */
body.verre.v2{ --v-epais:linear-gradient(135deg,rgba(255,255,255,.92) 0%,rgba(255,255,255,.80) 100%); --v-filtre-epais:blur(20px) saturate(180%) brightness(1.08); }
body.verre.v2:not(.clair){ --v-epais:linear-gradient(135deg,rgba(255,255,255,.12) 0%,rgba(255,255,255,.03) 100%), rgba(10,13,11,.74); --v-filtre-epais:blur(20px) saturate(170%) brightness(.7); }

/* la barre porte son verre ELLE-MÊME (fond épais + flou) : mesuré dans Chromium avec des rayures noires et
   blanches qui défilent dessous, elles deviennent un gris uni. Son ancienne couche du dessous (::before) n'est
   plus utile. */
body.verre.v2 #barreOnglets::before{ display:none !important; }
body.verre.v2 #barreOnglets{ background:var(--v-epais) !important; -webkit-backdrop-filter:var(--v-filtre-epais); backdrop-filter:var(--v-filtre-epais);
  border-radius:999px !important; box-shadow:var(--v-ombre) !important; }
/* téléphone : la place de chaque onglet */
@media (max-width:699px){
  body.verre.v2 #barreOnglets{ padding:5px; }
  body.verre.v2 #barreOnglets .onglet{ width:33px; }
  body.verre.v2 #barreOnglets .onglet.actif{ padding:0 10px; gap:6px; font-size:12.5px; white-space:nowrap; letter-spacing:-.01em; }
  body.verre.v2 #barreOnglets .onglet.actif .vgl{ width:22px; height:22px; flex:none; }
  body.verre.v2 #bandeauJour{ background-position:10px 50%; }
  body.verre.v2 #bandeauJour > button{ padding:13px 12px 13px 24px !important; text-align:left; }
}

/* L'EN-TÊTE EST UN PANNEAU DE VERRE : le nom de l'école et les boutons ne sont plus posés à nu sur le fond
   (sur une photo, un texte gris fin n'est pas toujours lisible : mesuré 2,7 pour 4,5 demandés) */
body.verre.v2 header{ position:relative; isolation:isolate; padding:10px 12px 10px 10px; border-radius:var(--r1);
  background:var(--v-fond); -webkit-backdrop-filter:var(--v-filtre); backdrop-filter:var(--v-filtre); box-shadow:var(--v-ombre); }
body.verre.v2 header::after{ content:""; position:absolute; inset:0; border-radius:inherit; padding:1.2px; pointer-events:none; background:var(--v-lisere);
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask:linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); }
body.verre.v2 header button, body.verre.v2 header a#guideBtn{ width:44px; height:44px; min-width:44px; background:var(--v2-fond) !important; -webkit-backdrop-filter:none; backdrop-filter:none; border:1px solid var(--v2-bord) !important; box-shadow:var(--v2-ombre) !important; }
body.verre.v2 .logo{ width:44px; height:44px; border-radius:var(--r2); }
body.verre.v2 #plusZone{ width:44px; }
body.verre.v2:not(.clair) header h1, body.verre.v2:not(.clair) #quiNom{ text-shadow:none; }

body.verre.v2.clair{ --accent-text:#315A00; }

/* le menu ⋯ s'ouvre DEVANT les panneaux qui suivent l'en-tête (sans ça, le panneau suivant le recouvre) */
body.verre.v2 header{ z-index:90; }

/* LA BARRE B (téléphone) : huit cases égales, les huit noms en plus petit */
@media (max-width:699px){
  body.verre.v2.barreB #barreOnglets .pastille{ display:block; }
  body.verre.v2.barreB #barreOnglets .onglet, body.verre.v2.barreB #barreOnglets .onglet.actif{ flex:1 1 0; width:auto; min-width:0; height:50px; padding:6px 0 4px; font-size:9px; font-weight:700; letter-spacing:-.02em; flex-direction:column; gap:2px; background:none; box-shadow:none; white-space:nowrap; overflow:visible; }
  body.verre.v2.barreB #barreOnglets .onglet .vgl, body.verre.v2.barreB #barreOnglets .onglet.actif .vgl{ width:22px; height:22px; }
}

/* LA FENÊTRE « GRAPHISME » (menu ⋯) : un panneau de verre — et, en graphisme classique, la fenêtre habituelle */
.grOv{ position:fixed; inset:0; z-index:2200; display:flex; align-items:flex-start; justify-content:center; padding:var(--e, 16px); background:rgba(10,14,8,.30); overflow:auto; }
body:not(.clair) .grOv{ background:rgba(0,0,0,.50); }
body:not(.verre) .grOv{ background:rgba(0,0,0,.82); }
.grFen{ position:relative; isolation:isolate; width:100%; max-width:460px; max-height:calc(100vh - var(--e, 16px) * 2); max-height:calc(100dvh - var(--e, 16px) * 2); overflow:auto;
  padding:var(--e, 16px); border-radius:var(--r1, 18px); color:var(--cream); scrollbar-width:thin;
  background:var(--v-epais, var(--navy-deep)); -webkit-backdrop-filter:blur(20px) saturate(170%); backdrop-filter:blur(20px) saturate(170%); box-shadow:var(--v-ombre, 0 20px 60px rgba(0,0,0,.35)); }
body:not(.verre) .grFen{ border:1px solid var(--line); -webkit-backdrop-filter:none; backdrop-filter:none; }
.grFen.large{ max-width:960px; }
@media (min-width:900px){ .grFen.large .grCols{ display:grid; grid-template-columns:1fr 1fr; gap:var(--e, 16px); align-items:start; } .grFen.large .grCols .grSec{ margin-bottom:0; } .grFen.large .grCol{ display:flex; flex-direction:column; gap:var(--e, 16px); } }
.grTete{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:var(--e, 16px); }
.grTete h3{ margin:0; font-size:20px; font-weight:800; }
.grFen button{ font-family:inherit; cursor:pointer; }
.grFerme{ width:40px; height:40px; min-width:40px; border-radius:50%; border:1px solid var(--v2-bord, var(--line)); background:var(--v2-fond, transparent); box-shadow:var(--v2-ombre, none); color:inherit; font-size:16px; padding:0; }
.grSec{ padding:var(--e, 16px); border-radius:var(--r2, 14px); background:var(--v2-fond, transparent); border:1px solid var(--v2-bord, var(--line)); box-shadow:var(--v2-ombre, none); margin-bottom:var(--e, 16px); }
.grSec h4{ margin:0 0 12px; font-size:13.5px; font-weight:800; letter-spacing:.03em; text-transform:uppercase; display:flex; align-items:center; gap:8px; }
.grSec h4 small{ margin-left:auto; font-size:12.5px; font-weight:600; letter-spacing:0; text-transform:none; color:var(--muted); }
.grSeg{ display:flex; gap:4px; padding:4px; border-radius:999px; background:var(--v2-fond, transparent); border:1px solid var(--v2-bord, var(--line)); margin-bottom:14px; }
.grSeg button{ flex:1; border:0; border-radius:999px; padding:9px 0; margin:0; width:auto; min-height:0; font-size:14.5px; font-weight:700; line-height:1; background:transparent; color:inherit; box-shadow:none; }
.grSeg button.ici{ background:var(--lentille, linear-gradient(180deg,#D8FF78 0%,#B6FF0E 100%)); color:#111; box-shadow:inset 0 1px 0 rgba(255,255,255,.95), inset 0 -2px 0 rgba(0,0,0,.08), var(--lentille-ombre, 0 6px 16px -4px rgba(120,190,0,.5)); }
.grGr{ position:relative; display:grid; grid-template-columns:repeat(3, 1fr); gap:12px 10px; }
.grTuile{ position:relative; min-width:0; }
.grTuile .grF{ display:block; width:100%; }
.grF{ position:relative; border:0; padding:0; margin:0; width:auto; min-height:0; background:none; color:inherit; font-size:12.5px; font-weight:600; line-height:1.25; text-align:center; box-shadow:none; }
.grF i{ position:relative; display:block; aspect-ratio:4/3; border-radius:12px; background-size:cover; background-position:center; margin-bottom:6px; box-shadow:0 0 0 1px var(--v2-bord, var(--line)), 0 2px 6px rgba(0,0,0,.18); }
.grF.ici i{ box-shadow:0 0 0 2.5px var(--accent-text, #315A00), 0 0 0 5px rgba(182,255,14,.55), 0 2px 6px rgba(0,0,0,.18); }
body:not(.clair) .grF.ici i{ box-shadow:0 0 0 2.5px #B6FF0E, 0 0 0 5px rgba(182,255,14,.25), 0 2px 6px rgba(0,0,0,.3); }
.grF.ici i::before{ content:"✓"; position:absolute; left:5px; top:5px; width:20px; height:20px; border-radius:50%; background:#B6FF0E; color:#111; font:900 12px/20px system-ui, sans-serif; text-align:center; }
.grF.vise i{ box-shadow:0 0 0 2.5px var(--accent-text, #315A00), 0 2px 6px rgba(0,0,0,.18); }
body:not(.clair) .grF.vise i{ box-shadow:0 0 0 2.5px #B6FF0E, 0 2px 6px rgba(0,0,0,.3); }
.grX{ position:absolute; right:-6px; top:-6px; width:26px; height:26px; border-radius:50%; border:0; padding:0; margin:0; min-height:0; background:rgba(20,22,18,.80); color:#fff; font-size:13px; font-weight:700; line-height:26px; text-align:center; box-shadow:0 0 0 2px rgba(255,255,255,.85); z-index:2; }
.grL{ position:absolute; right:5px; bottom:5px; font-size:12px; line-height:1; padding:3px 4px; border-radius:7px; background:rgba(255,255,255,.82); font-style:normal; }
.grDef{ display:inline-block; margin-top:3px; padding:2px 7px; border-radius:999px; background:#B6FF0E; color:#111; font-size:10.5px; font-weight:800; }
.grAj i{ display:flex; align-items:center; justify-content:center; font-size:26px; font-style:normal; font-weight:400; background:transparent; box-shadow:none; border:2px dashed var(--muted); color:var(--muted); }
.grNote{ margin:12px 0 0; font-size:12.5px; line-height:1.45; color:var(--muted); }
.grBarres{ display:flex; flex-direction:column; gap:10px; }
.grBarre{ display:flex; align-items:center; gap:10px; padding:10px 12px; margin:0; width:100%; min-height:0; border-radius:14px; border:1px solid var(--v2-bord, var(--line)); background:transparent; color:inherit; font-size:13.5px; font-weight:600; line-height:1.3; text-align:left; box-shadow:none; }
.grBarre .grMini{ flex:none; display:flex; align-items:center; gap:3px; padding:4px; border-radius:999px; background:var(--v-epais, rgba(127,127,127,.15)); box-shadow:inset 0 0 0 1px var(--v2-bord, var(--line)); }
.grBarre .grMini span{ width:9px; height:9px; border-radius:50%; background:var(--muted); opacity:.55; }
.grBarre .grMini span.l{ width:34px; border-radius:999px; background:#B6FF0E; opacity:1; }
.grBarre .grMini.b span{ width:9px; height:13px; border-radius:3px; }
.grBarre .grMini.b span.l{ width:9px; background:#B6FF0E; }
.grBarre.ici{ box-shadow:0 0 0 2.5px var(--accent-text, #315A00); }
body:not(.clair) .grBarre.ici{ box-shadow:0 0 0 2.5px #B6FF0E; }
.grBarre b{ font-weight:800; }
.grPop{ position:absolute; z-index:5; width:210px; padding:6px; border-radius:16px; background:var(--v-epais, var(--navy-deep)); -webkit-backdrop-filter:blur(20px); backdrop-filter:blur(20px);
  box-shadow:var(--v-ombre, none), 0 12px 30px rgba(0,0,0,.28); border:1px solid var(--v2-bord, var(--line)); }
.grPop button{ display:flex; gap:10px; align-items:center; width:100%; margin:0; min-height:0; border:0; background:none; color:inherit; padding:11px 10px; border-radius:10px; font-size:14px; font-weight:600; line-height:1.2; text-align:left; box-shadow:none; }
.grPop button + button{ border-top:1px solid var(--v2-bord, var(--line)); border-radius:0; }
.grPop .rouge{ color:#B42318; }
body:not(.clair) .grPop .rouge{ color:#FF8A7A; }
.grApercu{ width:100%; aspect-ratio:16/9; border-radius:var(--r2, 14px); background-size:cover; background-position:center; margin-bottom:var(--e, 16px); box-shadow:0 0 0 1px var(--v2-bord, var(--line)); }
.grChamp{ display:block; margin-bottom:14px; font-size:13px; font-weight:700; }
.grChamp input{ display:block; width:100%; margin-top:6px; }
.grProp{ font-size:12px; font-weight:600; color:var(--muted); margin:-6px 0 14px; }
.grAttente{ opacity:.55; pointer-events:none; }
`;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();

  window.ouvrirGraphisme = ouvrir;
  window.graphismeEC = function(){ return G ? JSON.parse(JSON.stringify(G)) : null; };
})();

/* Le garde-fou de ec-noyau.js (verifierModules) attend que chaque module se déclare */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-graphisme.js'] = true;
