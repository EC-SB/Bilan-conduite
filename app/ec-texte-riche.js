/* Déployé le 04/11/2026 à 15:07 — v1355 */
/* ============================================================
   ec-texte-riche.js — 📝 LE TEXTE MIS EN FORME (v1355)

   David, le 4 novembre : « dans groupes et guides, ajoute-moi quand
   on met un texte un vrai éditeur de texte avec des puces, du gras,
   des couleurs de texte, des emojis ».

   ⚠️ LE TEXTE RESTE UN TEXTE. Un bloc 📝 garde son champ « texte »,
   lu par le classeur, la recherche de l'élève, le suivi, le compte
   du temps de lecture. La mise en forme s'y écrit en balises
   courtes, que personne ne tape (l'éditeur les pose) :
     [g]gras[/g]  [i]italique[/i]  [s]souligné[/s]  [t]plus grand[/t]
     [c=rouge]couleur[/c]   « • » en début de ligne = une puce,
     « 1. » en début de ligne = une liste numérotée,
     [lien=e:GUIDE::ÉTAPE]texte[/lien] = un renvoi vers une étape,
     [lien=g:GROUPE]texte[/lien] = un renvoi vers un groupe (David :
     « faire des renvois à d'autres groupes ou étapes directement dans
     le texte, et un bouton en dessous pour en ajouter »). Une ligne
     qui n'est qu'un renvoi s'affiche en bouton.
   Un ancien texte, sans balises, se lit exactement comme avant.

   ⚠️ PAS DE HTML ENREGISTRÉ. Le HTML d'un collage ou d'un éditeur
   peut porter n'importe quoi ; les balises, elles, sont relues une à
   une, et tout le reste est échappé. Même fonction chez l'élève
   (eleve.html, « trVersHtml ») : les deux doivent rester pareilles.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Six couleurs lisibles sur le fond clair ET sur le fond sombre :
   chaque thème a sa nuance (variables --trRouge… dans index.html et
   eleve.html). Le vert citron de la charte est illisible en texte. */
const TR_COULEURS = [
  ['rouge', 'Rouge', '#C62828', '#FF6B57'],
  ['orange', 'Orange', '#D35400', '#FFB347'],
  ['vert', 'Vert', '#2E7D32', '#9BE15D'],
  ['bleu', 'Bleu', '#1565C0', '#6CB4FF'],
  ['violet', 'Violet', '#7B1FA2', '#C792EA'],
  ['gris', 'Gris', '#6B7280', '#A3A3A3']
];
const TR_EMOJIS = ['✅', '❌', '⚠️', '❗', '❓', '💡', '📌', '👉', '👆', '👇', '➡️', '⬅️', '⬆️', '⬇️', '🔁', '↩️',
  '🚗', '🚙', '🏍️', '🛵', '🚦', '🛑', '⛔', '🚸', '🅿️', '🛣️', '🔄', '🧭', '📍', '🗺️',
  '👀', '🪞', '🖐️', '🦶', '🧠', '💪', '👍', '👏', '🙂', '😊', '😉', '😅', '🤔', '🎉',
  '⭐', '🎯', '🔥', '🏁', '📅', '⏰', '⏱️', '📝', '📄', '🎬', '🔴', '🟠', '🟡', '🟢', '🔵', '⚫'];

function trEch(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* ── Les balises → du HTML sûr (la même règle que eleve.html) ── */
const TR_CIBLE = /^(e:[A-Za-z0-9_-]+::[A-Za-z0-9_-]*|g:[A-Za-z0-9_-]+)$/;
function trLigneHtml(l){
  const RE = /\[(\/?)(g|i|s|t|c|lien)(?:=([A-Za-z0-9_:-]+))?\]/g;
  const OUV = { g: '<b>', i: '<i>', s: '<u>', t: '<span class="trT">' };
  const FER = { g: '</b>', i: '</i>', s: '</u>', t: '</span>', c: '</span>', lien: '</a>' };
  const pile = [];
  let h = '', k = 0, m;
  const ouvrir = x => x.n === 'c' ? '<span class="trC trC-' + x.v + '">'
    : x.n === 'lien' ? '<a class="trLien" href="#" data-renvoi="' + trEch(x.v) + '">' : OUV[x.n];
  while((m = RE.exec(l))){
    h += trEch(l.slice(k, m.index));
    k = RE.lastIndex;
    const n = m[2];
    if(!m[1]){
      if(n === 'c' && !TR_COULEURS.some(c => c[0] === m[3])) continue;
      if(n === 'lien' && !TR_CIBLE.test(m[3] || '')) continue;
      if(n === 'lien' && pile.some(x => x.n === 'lien')) continue;
      const x = { n: n, v: m[3] || '' };
      pile.push(x); h += ouvrir(x);
    }else{
      const j = pile.map(x => x.n).lastIndexOf(n);
      if(j < 0) continue;
      const dessus = pile.splice(j);
      for(let q = dessus.length - 1; q >= 0; q--) h += FER[dessus[q].n];
      dessus.slice(1).forEach(x => { pile.push(x); h += ouvrir(x); });
    }
  }
  h += trEch(l.slice(k));
  for(let q = pile.length - 1; q >= 0; q--) h += FER[pile[q].n];
  return h;
}
function trVersHtml(texte){
  const lignes = String(texte == null ? '' : texte).replace(/\r/g, '').split('\n');
  let h = '', liste = '';
  const fermer = () => { if(liste){ h += '</' + liste + '>'; liste = ''; } };
  lignes.forEach((l, i) => {
    const puce = l.match(/^\s*[•·▪-]\s+(.*)$/), num = l.match(/^\s*\d{1,3}[.)]\s+(.*)$/);
    if(puce || num){
      const t = puce ? 'ul' : 'ol';
      if(liste !== t){ fermer(); h += '<' + t + '>'; liste = t; }
      h += '<li>' + trLigneHtml((puce || num)[1]) + '</li>';
      return;
    }
    fermer();
    /* une ligne qui n'est qu'un renvoi : un bouton */
    const seul = /^\s*(\[(g|i|s|t|c=[a-z]+)\])*\[lien=[^\]]+\][^\n]*\[\/lien\](\[\/(g|i|s|t|c)\])*\s*$/.test(l) && (l.match(/\[lien=/g) || []).length === 1;
    h += '<div' + (seul ? ' class="trRenvoiL"' : '') + '>' + (l.trim() ? trLigneHtml(l).replace(seul ? 'class="trLien"' : '\u0000', 'class="trLien trRenvoi"') : '<br>') + '</div>';
  });
  fermer();
  return h;
}
/* Le texte sans ses balises : aperçus, suivi */
function trTexteSeul(texte){
  return String(texte == null ? '' : texte).replace(/\[\/?(g|i|s|t|c|lien)(=[A-Za-z0-9_:-]+)?\]/g, '');
}

/* ── Le HTML de l'éditeur → les balises ── */
function trCouleurDe(css){
  if(!css) return '';
  const nom = String(css).trim().toLowerCase();
  const direct = TR_COULEURS.find(c => c[2].toLowerCase() === nom || c[3].toLowerCase() === nom);
  if(direct) return direct[0];
  const rvb = s => {
    let m = String(s).match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/);
    if(m) return [+m[1], +m[2], +m[3]];
    m = String(s).match(/^#?([0-9a-f]{6})$/i);
    if(m) return [0, 2, 4].map(k => parseInt(m[1].slice(k, k + 2), 16));
    return null;
  };
  const a = rvb(nom);
  if(!a) return '';
  let mieux = '', d0 = 1e9;
  TR_COULEURS.forEach(c => [c[2], c[3]].forEach(x => {
    const b = rvb(x); const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    if(d < d0){ d0 = d; mieux = c[0]; }
  }));
  return d0 < 9000 ? mieux : '';
}
function trDepuisHtml(racine){
  const lignes = [];
  let cur = null;
  const nouvelle = (genre) => { cur = { genre: genre || 'p', morceaux: [] }; lignes.push(cur); return cur; };
  const finir = () => { cur = null; };
  const ici = () => cur || nouvelle('p');
  const BLOCS = /^(DIV|P|H[1-6]|LI|UL|OL|BLOCKQUOTE|PRE|SECTION|ARTICLE)$/;
  const fmtDe = (el, f) => {
    const g = Object.assign({}, f);
    const t = el.tagName, st = el.style || {};
    if(t === 'B' || t === 'STRONG') g.g = true;
    if(t === 'I' || t === 'EM') g.i = true;
    if(t === 'U') g.s = true;
    if(/^H[1-4]$/.test(t)) g.t = true;
    if(el.classList && el.classList.contains('trT')) g.t = true;
    if(t === 'FONT' && Number(el.getAttribute('size')) >= 4) g.t = true;
    if(t === 'FONT' && el.getAttribute('size') && Number(el.getAttribute('size')) <= 3) g.t = false;
    const fw = String(st.fontWeight || '');
    if(fw === 'bold' || Number(fw) >= 600) g.g = true;
    if(fw === 'normal' || (Number(fw) && Number(fw) < 600)) g.g = false;
    if(st.fontStyle === 'italic') g.i = true;
    if(/underline/.test(String(st.textDecoration || st.textDecorationLine || ''))) g.s = true;
    const fs = String(st.fontSize || '');
    if(fs){
      const px = /px$/.test(fs) ? parseFloat(fs) : /em$/.test(fs) ? parseFloat(fs) * 15 : /^(large|x-large|xx-large)$/.test(fs) ? 20 : 0;
      if(px) g.t = px >= 17;
    }
    let c = '';
    const cls = el.classList ? [...el.classList].find(x => /^trC-/.test(x)) : '';
    if(cls) c = cls.slice(4);
    else if(t === 'FONT' && el.getAttribute('color')) c = trCouleurDe(el.getAttribute('color'));
    else if(st.color) c = trCouleurDe(st.color);
    if(c && TR_COULEURS.some(x => x[0] === c)) g.c = c;
    else if(st.color || (t === 'FONT' && el.getAttribute('color'))) g.c = '';
    /* 🔗 un renvoi : <a data-renvoi> */
    const cible = el.getAttribute && el.getAttribute('data-renvoi');
    if(cible && TR_CIBLE.test(cible)) g.lien = cible;
    return g;
  };
  const parcourir = (n, f, genreListe) => {
    if(n.nodeType === 3){
      const t = n.nodeValue.replace(/ /g, ' ').replace(/[\r\n]+/g, ' ');
      if(t) ici().morceaux.push({ t: t, f: f });
      return;
    }
    if(n.nodeType !== 1) return;
    const tag = n.tagName;
    if(tag === 'BR'){
      /* la ligne en cours se termine ; un BR seul fait une ligne vide */
      if(!cur) nouvelle('p');
      cur.br = true;
      finir();
      return;
    }
    if(tag === 'UL' || tag === 'OL'){
      finir();
      [...n.childNodes].forEach(c => parcourir(c, f, tag === 'UL' ? 'ul' : 'ol'));
      finir();
      return;
    }
    const f2 = fmtDe(n, f);
    if(BLOCS.test(tag)){
      if(cur && cur.morceaux.length) finir();
      nouvelle(tag === 'LI' ? (genreListe || 'ul') : 'p');
      [...n.childNodes].forEach(c => parcourir(c, f2, genreListe));
      /* un <div><br></div> vide = une ligne vide, gardée */
      finir();
      return;
    }
    [...n.childNodes].forEach(c => parcourir(c, f2, genreListe));
  };
  [...racine.childNodes].forEach(c => parcourir(c, {}, ''));
  const ORDRE = ['g', 'i', 's', 't'];
  let num = 0;
  /* une ligne ouverte par un bloc qui n'a rien reçu (un <div> qui
     n'enveloppait qu'une liste) n'est pas une ligne vide voulue */
  const out = lignes.filter(l => l.morceaux.length || l.br).map(l => {
    const fusion = [];
    l.morceaux.forEach(m => {
      const d = fusion[fusion.length - 1];
      const meme = d && ORDRE.every(k => !!d.f[k] === !!m.f[k]) && (d.f.c || '') === (m.f.c || '') && (d.f.lien || '') === (m.f.lien || '');
      if(meme) d.t += m.t; else fusion.push({ t: m.t, f: m.f });
    });
    let s = '';
    fusion.forEach(m => {
      const o = ORDRE.filter(k => m.f[k]);
      const c = m.f.c || '', li = m.f.lien || '';
      if(!m.t.trim() && !li){ s += m.t; return; }
      s += (li ? '[lien=' + li + ']' : '') + o.map(k => '[' + k + ']').join('') + (c ? '[c=' + c + ']' : '') + m.t + (c ? '[/c]' : '') +
        o.slice().reverse().map(k => '[/' + k + ']').join('') + (li ? '[/lien]' : '');
    });
    if(l.genre === 'ol') num++; else num = 0;
    const corps = s.replace(/^\s+/, '');
    return l.genre === 'ul' ? '• ' + corps : l.genre === 'ol' ? num + '. ' + corps : s.replace(/\s+$/, '');
  });
  while(out.length && !out[out.length - 1].trim()) out.pop();
  while(out.length && !out[0].trim()) out.shift();
  return out.join('\n');
}

/* ============================================================
   L'ÉDITEUR — une barre, une zone qu'on écrit comme dans Word, et
   une case cachée « texte » (data-champ) que le guide relit.
   ============================================================ */
function trEditeur(valeur, opts){
  const o = opts || {};
  const w = document.createElement('div');
  w.className = 'trEd';
  const barre = document.createElement('div');
  barre.className = 'trBarre';
  barre.setAttribute('role', 'toolbar');
  barre.setAttribute('aria-label', 'Mise en forme du texte');
  const zone = document.createElement('div');
  zone.className = 'trZone';
  zone.contentEditable = 'true';
  zone.setAttribute('role', 'textbox');
  zone.setAttribute('aria-multiline', 'true');
  zone.dataset.placeholder = o.placeholder || 'Ce que l’élève doit lire ici.';
  zone.innerHTML = trVersHtml(valeur || '');
  const ta = document.createElement('textarea');
  ta.dataset.champ = o.champ || 'texte';
  ta.hidden = true;
  ta.value = valeur || '';
  ta.tabIndex = -1;
  const vide = () => zone.classList.toggle('trVide', !zone.textContent.trim() && !zone.querySelector('li'));
  const synchro = () => { ta.value = trDepuisHtml(zone); vide(); majEtats(); };
  let garde = null;
  const memoriser = () => {
    const s = window.getSelection();
    if(s && s.rangeCount && zone.contains(s.anchorNode)) garde = s.getRangeAt(0).cloneRange();
  };
  const restaurer = () => {
    zone.focus();
    if(garde){ const s = window.getSelection(); s.removeAllRanges(); s.addRange(garde); }
  };
  const faire = (cmd, val) => {
    restaurer();
    try{ document.execCommand('styleWithCSS', false, cmd === 'foreColor'); }catch(e){}
    document.execCommand(cmd, false, val);
    memoriser();
    synchro();
    zone.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const bouton = (txt, titre, f, cls) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'trB' + (cls ? ' ' + cls : '');
    b.innerHTML = txt;
    b.title = titre;
    b.setAttribute('aria-label', titre);
    b.addEventListener('mousedown', e => e.preventDefault());
    b.addEventListener('click', e => { e.preventDefault(); f(b); });
    barre.appendChild(b);
    return b;
  };
  const bG = bouton('<b>G</b>', 'Gras (Ctrl+B)', () => faire('bold'));
  const bI = bouton('<i>I</i>', 'Italique (Ctrl+I)', () => faire('italic'));
  const bS = bouton('<u>S</u>', 'Souligné (Ctrl+U)', () => faire('underline'));
  const bT = bouton('T<small>T</small>', 'Plus grand (un petit titre)', () => {
    restaurer();
    const grand = Number(document.queryCommandValue('fontSize')) >= 4;
    faire('fontSize', grand ? '3' : '5');
  });
  const sep = () => { const s = document.createElement('span'); s.className = 'trSep'; barre.appendChild(s); };
  sep();
  const bUl = bouton('• Liste', 'Liste à puces', () => faire('insertUnorderedList'), 'trLarge');
  const bOl = bouton('1. Liste', 'Liste numérotée', () => faire('insertOrderedList'), 'trLarge');
  sep();
  /* 🎨 la couleur : six pastilles et « sans couleur » */
  const panneau = (cls) => { const p = document.createElement('div'); p.className = 'trPanneau ' + cls; p.hidden = true; w.appendChild(p); return p; };
  const pCoul = panneau('trCouleurs');
  TR_COULEURS.forEach(([k, nom, clair]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'trPastille trC-' + k; b.title = nom; b.setAttribute('aria-label', nom);
    b.innerHTML = '<span class="trRond" style="background:' + clair + '"></span>' + nom;
    b.addEventListener('mousedown', e => e.preventDefault());
    b.addEventListener('click', () => { pCoul.hidden = true; faire('foreColor', clair); });
    pCoul.appendChild(b);
  });
  const sans = document.createElement('button');
  sans.type = 'button'; sans.className = 'trPastille'; sans.textContent = '⨯ Sans couleur';
  sans.addEventListener('mousedown', e => e.preventDefault());
  sans.addEventListener('click', () => {
    pCoul.hidden = true;
    restaurer();
    /* la couleur du texte courant, quelle qu'elle soit */
    faire('foreColor', getComputedStyle(zone).color);
  });
  pCoul.appendChild(sans);
  const bC = bouton('🎨 Couleur', 'Couleur du texte', () => { memoriser(); pEmo.hidden = true; pCoul.hidden = !pCoul.hidden; }, 'trLarge');
  /* 😀 les emojis */
  const pEmo = panneau('trEmojis');
  TR_EMOJIS.forEach(e => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'trEmo'; b.textContent = e; b.setAttribute('aria-label', e);
    b.addEventListener('mousedown', ev => ev.preventDefault());
    b.addEventListener('click', () => faire('insertText', e));
    pEmo.appendChild(b);
  });
  const astuce = document.createElement('div');
  astuce.className = 'trAstuce';
  astuce.textContent = 'Sur ordinateur, tous les emojis : touche Windows + point (.)';
  pEmo.appendChild(astuce);
  const bE = bouton('😀 Emoji', 'Ajouter un emoji', () => { memoriser(); pCoul.hidden = true; pEmo.hidden = !pEmo.hidden; }, 'trLarge');

  /* 🔗 LES RENVOIS — vers une étape d'un guide, ou un groupe.
     o.choisirRenvoi() ouvre la liste (ec-parcours.js) et rend
     { cible, nom } ; sans lui, pas de bouton. */
  const poserRenvoi = (cible, nom, enBas) => {
    const a = document.createElement('a');
    a.className = 'trLien' + (enBas ? ' trRenvoi' : '');
    a.href = '#';
    a.setAttribute('data-renvoi', cible);
    a.title = 'Renvoi : ' + nom;
    if(enBas){
      a.textContent = '👉 ' + nom;
      const d = document.createElement('div');
      d.className = 'trRenvoiL';
      d.appendChild(a);
      zone.appendChild(d);
    }else{
      restaurer();
      const sel = window.getSelection();
      const r = sel && sel.rangeCount && zone.contains(sel.anchorNode) ? sel.getRangeAt(0) : null;
      const texte = r ? r.toString() : '';
      a.textContent = texte.trim() ? texte : nom;
      if(r){ r.deleteContents(); r.insertNode(a); r.setStartAfter(a); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
      else zone.appendChild(a);
    }
    synchro();
    zone.dispatchEvent(new Event('input', { bubbles: true }));
  };
  if(typeof o.choisirRenvoi === 'function'){
    sep();
    bouton('🔗 Renvoi', 'Faire de ce texte un renvoi vers une étape ou un groupe', async () => {
      memoriser();
      const r = await o.choisirRenvoi();
      if(r && r.cible) poserRenvoi(r.cible, r.nom, false);
    }, 'trLarge');
  }
  /* Un clic sur un renvoi, dans l'éditeur : on dit où il mène, sans y aller */
  zone.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-renvoi]');
    if(a){ e.preventDefault(); if(typeof showToast === 'function') showToast('🔗 ' + (a.title || 'Renvoi')); }
  });

  const majEtats = () => {
    if(document.activeElement !== zone) return;
    const q = c => { try{ return document.queryCommandState(c); }catch(e){ return false; } };
    bG.classList.toggle('on', q('bold')); bI.classList.toggle('on', q('italic')); bS.classList.toggle('on', q('underline'));
    bUl.classList.toggle('on', q('insertUnorderedList')); bOl.classList.toggle('on', q('insertOrderedList'));
    let grand = false; try{ grand = Number(document.queryCommandValue('fontSize')) >= 4; }catch(e){}
    bT.classList.toggle('on', grand);
  };
  zone.addEventListener('input', synchro);
  zone.addEventListener('keyup', () => { memoriser(); majEtats(); });
  zone.addEventListener('mouseup', () => { memoriser(); majEtats(); });
  zone.addEventListener('blur', memoriser);
  zone.addEventListener('focus', () => { pCoul.hidden = true; pEmo.hidden = true; });
  /* Un collage arrive en texte seul : pas de HTML d'ailleurs */
  zone.addEventListener('paste', e => {
    const t = (e.clipboardData || window.clipboardData);
    if(!t) return;
    e.preventDefault();
    document.execCommand('insertText', false, t.getData('text/plain'));
  });
  zone.addEventListener('keydown', e => {
    if((e.ctrlKey || e.metaKey) && !e.shiftKey && /^[bius]$/i.test(e.key)){
      e.preventDefault();
      faire({ b: 'bold', i: 'italic', u: 'underline', s: 'underline' }[e.key.toLowerCase()]);
    }
  });
  w.append(barre, zone, ta);
  w.insertBefore(pCoul, zone); w.insertBefore(pEmo, zone);
  if(typeof o.choisirRenvoi === 'function'){
    const bas = document.createElement('button');
    bas.type = 'button';
    bas.className = 'trAjoutRenvoi';
    bas.textContent = '➕ Ajouter un renvoi vers une autre étape';
    bas.addEventListener('click', async () => {
      const r = await o.choisirRenvoi();
      if(r && r.cible) poserRenvoi(r.cible, r.nom, true);
    });
    w.appendChild(bas);
  }
  vide();
  w.zone = zone;
  w.texte = () => ta.value;
  return w;
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-texte-riche.js'] = true;
