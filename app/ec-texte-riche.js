/* Déployé le 21/11/2026 à 14:19 — v1533 */
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

/* ✍️ v1533 — le surligné : quatre fonds, chacun avec sa nuance claire
   (thème clair, mails, copier-coller) et sombre (le texte y reste clair) */
const TR_FONDS = [
  ['jaune', 'Jaune', '#FFF176', '#6B5A00'],
  ['vert', 'Vert', '#C8F7C5', '#1F5E2A'],
  ['bleu', 'Bleu', '#BBDEFB', '#173E66'],
  ['rose', 'Rose', '#F8BBD0', '#6E1F3E']
];
const TR_BALISES_RE = /\[\/?(g|i|s|t|p|c|f|lien)(=[A-Za-z0-9_:-]+)?\]/;
function trEstMisEnForme(t){ return TR_BALISES_RE.test(String(t || '')); }
function trSombre(){ return !(document.body && document.body.classList.contains('clair')); }
function trEch(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* ── Les balises → du HTML sûr (la même règle que eleve.html) ── */
const TR_CIBLE = /^(e:[A-Za-z0-9_-]+::[A-Za-z0-9_-]*|g:[A-Za-z0-9_-]+)$/;
/* ✍️ v1533 — Ce qu'on écrit passe aussi par ici : « [mot](https://…) »
   (le lien de la v1527) devient un vrai lien, et deux balises de plus :
   [p]plus petit[/p], [f=jaune]surligné[/f]. « enLigne » : le HTML d'un
   mail ou du copier-coller, sans nos classes (les styles dans la balise,
   les couleurs du thème clair). */
function trLigneHtml(l, opts){
  const enLigne = !!(opts && opts.enLigne);
  const RE = /\[(\/?)(g|i|s|t|p|c|f|lien)(?:=([A-Za-z0-9_:-]+))?\]|\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/g;
  const OUV = enLigne
    ? { g: '<b>', i: '<i>', s: '<u>', t: '<span style="font-size:1.25em;font-weight:800">', p: '<span style="font-size:.85em">' }
    : { g: '<b>', i: '<i>', s: '<u>', t: '<span class="trT">', p: '<span class="trP">' };
  const FER = { g: '</b>', i: '</i>', s: '</u>', t: '</span>', p: '</span>', c: '</span>', f: '</span>', lien: enLigne ? '</span>' : '</a>' };
  const pile = [];
  let h = '', k = 0, m;
  const ouvrir = x => {
    if(x.n === 'c'){ const c = TR_COULEURS.find(y => y[0] === x.v); return enLigne ? '<span style="color:' + c[2] + '">' : '<span class="trC trC-' + x.v + '">'; }
    if(x.n === 'f'){ const f = TR_FONDS.find(y => y[0] === x.v); return enLigne ? '<span style="background:' + f[2] + ';padding:0 2px;border-radius:3px">' : '<span class="trF trF-' + x.v + '">'; }
    if(x.n === 'lien') return enLigne ? '<span style="font-weight:700">' : '<a class="trLien" href="#" data-renvoi="' + trEch(x.v) + '">';
    return OUV[x.n];
  };
  while((m = RE.exec(l))){
    h += trEch(l.slice(k, m.index));
    k = RE.lastIndex;
    if(m[5]){
      const u = trEch(m[5]);
      h += '<a href="' + u + '" target="_blank" rel="noopener noreferrer"' +
        (enLigne ? ' style="color:#1a56db;text-decoration:underline">' : ' class="trUrl" data-url="' + u + '">') + trEch(m[4]) + '</a>';
      continue;
    }
    const n = m[2];
    if(!m[1]){
      if(n === 'c' && !TR_COULEURS.some(c => c[0] === m[3])) continue;
      if(n === 'f' && !TR_FONDS.some(c => c[0] === m[3])) continue;
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
function trVersHtml(texte, opts){
  const enLigne = !!(opts && opts.enLigne);
  const lignes = String(texte == null ? '' : texte).replace(/\r/g, '').split('\n');
  let h = '', liste = '';
  const fermer = () => { if(liste){ h += '</' + liste + '>'; liste = ''; } };
  lignes.forEach((l, i) => {
    const puce = l.match(/^\s*[•·▪-]\s+(.*)$/), num = l.match(/^\s*(\d{1,3})[.)]\s+(.*)$/);
    if(puce || num){
      const t = puce ? 'ul' : 'ol';
      /* ✍️ v1533 — une liste numérotée garde SON premier numéro (« 2. Kopilote » reste 2) */
      if(liste !== t){ fermer(); h += '<' + t + (num && Number(num[1]) !== 1 ? ' start="' + Number(num[1]) + '"' : '') + (enLigne ? ' style="margin:4px 0;padding-left:24px"' : '') + '>'; liste = t; }
      h += '<li>' + trLigneHtml(puce ? puce[1] : num[2], opts) + '</li>';
      return;
    }
    fermer();
    /* une ligne qui n'est qu'un renvoi : un bouton */
    const seul = /^\s*(\[(g|i|s|t|c=[a-z]+)\])*\[lien=[^\]]+\][^\n]*\[\/lien\](\[\/(g|i|s|t|c)\])*\s*$/.test(l) && (l.match(/\[lien=/g) || []).length === 1;
    h += '<div' + (seul && !enLigne ? ' class="trRenvoiL"' : '') + '>' + (l.trim() ? trLigneHtml(l, opts).replace(seul && !enLigne ? 'class="trLien"' : '\u0000', 'class="trLien trRenvoi"') : '<br>') + '</div>';
  });
  fermer();
  return h;
}
/* Le texte sans ses balises : aperçus, suivi */
function trTexteSeul(texte){
  return String(texte == null ? '' : texte).replace(/\[\/?(g|i|s|t|p|c|f|lien)(=[A-Za-z0-9_:-]+)?\]/g, '');
}
/* ✍️ v1533 — pour un SMS, Messenger, un aperçu : sans balises, et « mot (adresse) » */
function trTexteBrut(texte){
  return trTexteSeul(texte).replace(/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)');
}
/* … et pour chercher ou montrer un extrait : le mot du lien seul */
function trTexteLu(texte){
  return trTexteSeul(texte).replace(/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/g, '$1');
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
function trFondDe(css){
  if(!css) return '';
  const nom = String(css).trim().toLowerCase();
  if(nom === 'transparent' || /rgba\([^)]*,\s*0\s*\)/.test(nom)) return '';
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
  TR_FONDS.forEach(c => [c[2], c[3]].forEach(x => {
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
    if(el.classList && el.classList.contains('trP')) g.p = true;
    if(t === 'FONT' && Number(el.getAttribute('size')) >= 4){ g.t = true; g.p = false; }
    if(t === 'FONT' && el.getAttribute('size') && Number(el.getAttribute('size')) <= 3) g.t = false;
    if(t === 'FONT' && el.getAttribute('size')) g.p = Number(el.getAttribute('size')) <= 2;
    const fw = String(st.fontWeight || '');
    if(fw === 'bold' || Number(fw) >= 600) g.g = true;
    if(fw === 'normal' || (Number(fw) && Number(fw) < 600)) g.g = false;
    if(st.fontStyle === 'italic') g.i = true;
    if(/underline/.test(String(st.textDecoration || st.textDecorationLine || ''))) g.s = true;
    const fs = String(st.fontSize || '');
    if(fs){
      const px = /px$/.test(fs) ? parseFloat(fs) : /em$/.test(fs) ? parseFloat(fs) * 15 : /^(large|x-large|xx-large)$/.test(fs) ? 20 : /^(small|x-small|xx-small)$/.test(fs) ? 11 : 0;
      if(px){ g.t = px >= 17; g.p = px <= 13; }
    }
    let c = '';
    const cls = el.classList ? [...el.classList].find(x => /^trC-/.test(x)) : '';
    if(cls) c = cls.slice(4);
    else if(t === 'FONT' && el.getAttribute('color')) c = trCouleurDe(el.getAttribute('color'));
    else if(st.color) c = trCouleurDe(st.color);
    if(c && TR_COULEURS.some(x => x[0] === c)) g.c = c;
    else if(st.color || (t === 'FONT' && el.getAttribute('color'))) g.c = '';
    /* ✍️ v1533 — le surligné */
    let fond = '';
    const clsF = el.classList ? [...el.classList].find(x => /^trF-/.test(x)) : '';
    if(clsF) fond = clsF.slice(4);
    else if(st.backgroundColor) fond = trFondDe(st.backgroundColor);
    if(fond && TR_FONDS.some(x => x[0] === fond)) g.f = fond;
    else if(st.backgroundColor) g.f = '';
    /* ✍️ v1533 — un lien vers une adresse : [mot](adresse) */
    if(t === 'A' && !el.getAttribute('data-renvoi')){
      const u = String(el.getAttribute('data-url') || el.getAttribute('href') || '');
      if(/^https?:\/\/\S+$/i.test(u)) g.url = u.replace(/\)/g, '%29');
    }
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
      const debut = tag === 'OL' ? (parseInt(n.getAttribute('start'), 10) || 1) : 0;
      const avant = lignes.length;
      [...n.childNodes].forEach(c => parcourir(c, f, tag === 'UL' ? 'ul' : 'ol'));
      finir();
      if(tag === 'OL' && lignes[avant]) lignes[avant].debut = debut;
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
  const ORDRE = ['g', 'i', 's', 't', 'p'];
  let num = 0;
  /* une ligne ouverte par un bloc qui n'a rien reçu (un <div> qui
     n'enveloppait qu'une liste) n'est pas une ligne vide voulue */
  const out = lignes.filter(l => l.morceaux.length || l.br).map(l => {
    const fusion = [];
    l.morceaux.forEach(m => {
      const d = fusion[fusion.length - 1];
      const meme = d && ORDRE.every(k => !!d.f[k] === !!m.f[k]) && (d.f.c || '') === (m.f.c || '') && (d.f.f || '') === (m.f.f || '') &&
        (d.f.lien || '') === (m.f.lien || '') && (d.f.url || '') === (m.f.url || '');
      if(meme) d.t += m.t; else fusion.push({ t: m.t, f: m.f });
    });
    let s = '';
    fusion.forEach(m => {
      const o = ORDRE.filter(k => m.f[k] && !(k === 'p' && m.f.t));
      const c = m.f.c || '', li = m.f.lien || '', fo = m.f.f || '', url = m.f.url || '';
      if(!m.t.trim() && !li && !url){ s += m.t; return; }
      const coeur = url ? '[' + m.t.replace(/[\[\]]/g, '') + '](' + url + ')' : m.t;
      s += (li ? '[lien=' + li + ']' : '') + o.map(k => '[' + k + ']').join('') + (c ? '[c=' + c + ']' : '') + (fo ? '[f=' + fo + ']' : '') + coeur +
        (fo ? '[/f]' : '') + (c ? '[/c]' : '') + o.slice().reverse().map(k => '[/' + k + ']').join('') + (li ? '[/lien]' : '');
    });
    if(l.genre === 'ol') num = (l.debut ? l.debut : num + 1); else num = 0;
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
  if(o.id) ta.id = o.id;
  ta.dataset.champ = o.champ || 'texte';
  ta.hidden = true;
  ta.value = valeur || '';
  ta.tabIndex = -1;
  const vide = () => zone.classList.toggle('trVide', !zone.textContent.trim() && !zone.querySelector('li'));
  /* ✍️ v1533 — la case cachée prévient ceux qui l'écoutent (sans remonter : la zone le fait déjà) */
  const synchro = () => { ta.value = trDepuisHtml(zone); vide(); majEtats(); ta.dispatchEvent(new Event('input')); };
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
    try{ document.execCommand('styleWithCSS', false, cmd === 'foreColor' || cmd === 'hiliteColor'); }catch(e){}
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
  const taille = () => { try{ return Number(document.queryCommandValue('fontSize')) || 3; }catch(e){ return 3; } };
  const bT = bouton('T<small>T</small>', 'Titre : plus grand, en gras (re-cliquer pour revenir)', () => {
    restaurer();
    faire('fontSize', taille() >= 4 ? '3' : '5');
  });
  /* ✍️ v1533 — plus petit */
  const bP = bouton('A<small>−</small>', 'Plus petit (re-cliquer pour revenir)', () => {
    restaurer();
    faire('fontSize', taille() <= 2 ? '3' : '2');
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
    b.addEventListener('click', () => { pCoul.hidden = true; faire('foreColor', trSombre() ? TR_COULEURS.find(c => c[0] === k)[3] : clair); });
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
  const bC = bouton('🎨 Couleur', 'Couleur du texte', () => { memoriser(); pEmo.hidden = true; pFond.hidden = true; pCoul.hidden = !pCoul.hidden; }, 'trLarge');
  /* 🖍️ v1533 — le surligné : quatre fonds et « sans » */
  const pFond = panneau('trFonds');
  TR_FONDS.forEach(([k, nom, clair, sombre]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'trPastille'; b.title = nom; b.setAttribute('aria-label', 'Surligner en ' + nom.toLowerCase());
    b.innerHTML = '<span class="trRond trF-' + k + '" style="border:1px solid var(--line)"></span>' + nom;
    b.addEventListener('mousedown', e => e.preventDefault());
    b.addEventListener('click', () => { pFond.hidden = true; faire('hiliteColor', trSombre() ? sombre : clair); });
    pFond.appendChild(b);
  });
  const sansF = document.createElement('button');
  sansF.type = 'button'; sansF.className = 'trPastille'; sansF.textContent = '⨯ Sans surligné';
  sansF.addEventListener('mousedown', e => e.preventDefault());
  sansF.addEventListener('click', () => { pFond.hidden = true; faire('hiliteColor', 'transparent'); });
  pFond.appendChild(sansF);
  bouton('🖍️ Surligner', 'Surligner (un fond de couleur)', () => { memoriser(); pEmo.hidden = true; pCoul.hidden = true; pFond.hidden = !pFond.hidden; }, 'trLarge');
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
  const bE = bouton('😀 Emoji', 'Ajouter un emoji', () => { memoriser(); pCoul.hidden = true; pFond.hidden = true; pEmo.hidden = !pEmo.hidden; }, 'trLarge');

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
    const tl = taille();
    bT.classList.toggle('on', tl >= 4);
    bP.classList.toggle('on', tl <= 2);
  };
  zone.addEventListener('input', (e) => { if(e && e.detail && e.detail.recharge) return; synchro(); });
  zone.addEventListener('keyup', () => { memoriser(); majEtats(); });
  zone.addEventListener('mouseup', () => { memoriser(); majEtats(); });
  zone.addEventListener('blur', () => { memoriser(); ta.dispatchEvent(new Event('blur')); });
  zone.addEventListener('focus', () => { pCoul.hidden = true; pEmo.hidden = true; pFond.hidden = true; });
  /* ✍️ v1533 — un lien du texte, dans l'éditeur : il ne s'ouvre pas, on dit où il mène */
  zone.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-url]');
    if(a){ e.preventDefault(); if(typeof showToast === 'function') showToast('🔗 ' + a.getAttribute('data-url')); }
  });
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
  w.insertBefore(pCoul, zone); w.insertBefore(pFond, zone); w.insertBefore(pEmo, zone);
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
  /* ---------- ✍️ v1533 — ce dont « Ce qu'on écrit » a besoin ---------- */
  if(o.lectureSeule){ zone.contentEditable = 'false'; barre.hidden = true; }
  /* qui appelle .focus() sur la case cachée tombe dans la zone */
  ta.focus = () => { try{ zone.focus(); }catch(e){} };
  /* un texte posé de l'extérieur (un modèle de départ, une variable, une ligne) */
  w.recharger = (t) => { ta.value = String(t == null ? '' : t); zone.innerHTML = trVersHtml(ta.value); vide(); ta.dispatchEvent(new Event('input'));
    /* l'enregistrement automatique de la fiche écoute « input » sur la fiche entière */
    zone.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: { recharge: true } })); };
  /* le texte avant le curseur, tel qu'il s'enregistre (sa longueur = la place du curseur) */
  const avantCurseur = (debut) => {
    const r0 = garde || null;
    if(!r0 || !zone.contains(r0.startContainer)) return null;
    const r = document.createRange();
    r.selectNodeContents(zone);
    if(debut) r.setEnd(r0.startContainer, r0.startOffset); else r.setEnd(r0.endContainer, r0.endOffset);
    const d = document.createElement('div');
    d.appendChild(r.cloneContents());
    const s = trDepuisHtml(d);
    /* le curseur au début d'une ligne vide : la ligne compte */
    return s;
  };
  /* les lignes de la zone, dans l'ordre du texte enregistré */
  const lignesDeLaZone = () => [...zone.querySelectorAll(':scope > div, :scope > p, :scope > ul > li, :scope > ol > li')];
  const curseurEnFinDeLigne = (n) => {
    const l = lignesDeLaZone()[n] || zone.lastChild;
    zone.focus();
    if(!l) return;
    const r = document.createRange(); r.selectNodeContents(l); r.collapse(false);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    memoriser();
  };
  /* une case « comme un textarea » : insererLienPartoutDans, les variables… */
  w.adaptateur = () => {
    let sel = null;
    const a = {
      __trEd: w,
      get value(){ return ta.value; },
      set value(v){ w.recharger(v); },
      get selectionStart(){ if(sel) return sel[0]; const s = avantCurseur(true); return s === null ? ta.value.length : s.length; },
      get selectionEnd(){ if(sel) return sel[1]; const s = avantCurseur(false); return s === null ? ta.value.length : s.length; },
      setSelectionRange(p, q){ sel = [p, q]; curseurEnFinDeLigne((ta.value.slice(0, Math.max(0, p)).match(/\n/g) || []).length); },
      focus(){ try{ zone.focus(); }catch(e){} },
      dispatchEvent(ev){ return ta.dispatchEvent(ev); },
      get readOnly(){ return o.lectureSeule; }
    };
    return a;
  };
  /* le texte sélectionné (pour le mot d'un lien) */
  w.selection = () => { if(!garde || !zone.contains(garde.startContainer)) return ''; return garde.toString(); };
  /* 🔗 le mot sélectionné devient un lien ; sans sélection, « mot » est écrit puis lié */
  w.lienSurSelection = (adr, mot) => {
    restaurer();
    const s = window.getSelection();
    const r = s && s.rangeCount && zone.contains(s.anchorNode) ? s.getRangeAt(0) : null;
    const a = document.createElement('a');
    a.href = adr; a.setAttribute('data-url', adr); a.className = 'trUrl'; a.target = '_blank'; a.rel = 'noopener noreferrer';
    if(r && !r.collapsed){
      a.appendChild(r.extractContents());
      r.insertNode(a);
    }else{
      a.textContent = mot || adr;
      if(r) r.insertNode(a); else zone.appendChild(a);
    }
    const r2 = document.createRange(); r2.setStartAfter(a); r2.collapse(true);
    s.removeAllRanges(); s.addRange(r2);
    memoriser();
    synchro();
    zone.dispatchEvent(new Event('input', { bubbles: true }));
  };
  return w;
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-texte-riche.js'] = true;
