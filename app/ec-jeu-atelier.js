/* Déployé le 23/10/2026 à 17:14 — v1255 */
/* ============================================================
   ec-jeu-atelier.js — 📸 L'ATELIER DU JEU DES VÉRIFICATIONS (v1249)

   Outils › Ce qu'on écrit › 🧰 Vérifications › « 📸 Nos voitures ».
   Administrateurs seuls (le Worker le vérifie dans chaque porte).

   Ce que David a demandé, et où c'est :
     · « des photos des moteurs, des intérieurs, des voyants » — une
       photo par ENDROIT (au volant, porte ouverte, devant, capot
       ouvert, voyants allumés, coffre, arrière, côté, roue) ;
     · « des intérieurs et des moteurs identiques pour plusieurs
       voitures : il faut que je puisse dire cette photo concerne telle
       et telle voiture » — « Cette photo sert à : » sous la photo. Une
       voiture n'a qu'une photo par endroit : la cocher sur une photo
       la décoche de l'autre ;
     · des ZONES dessinées au doigt sur la photo : 🎯 la réponse à des
       questions, ou ➡️ un passage (la porte, la manette, le capot) ;
     · « pour ouvrir le capot chez nous, il faut d'abord ouvrir la
       porte pour accéder à la poignée qui ouvre le capot : je dois
       pouvoir choisir l'ordre par voiture, et l'appliquer à plusieurs
       voitures en un clic » — 🧭 LE CHEMIN vers un endroit : les
       passages à toucher, dans l'ordre (↑ ↓), et « Appliquer aussi
       à : » ;
     · « montrer la hauteur des feux : chez nous il n'y a pas de
       commande, l'élève doit dire que c'est automatique » et
       « certains voyants n'existent pas : c'est l'ordinateur de bord »
       — 🔧 LES RÈGLES par question et par voiture (🗣️ / 🖥️), elles
       aussi « Même chose pour : ».
   ============================================================ */
const AT_ENDROITS = [['volant', '🪑 Au volant'], ['porte', '🚪 Porte ouverte'], ['devant', '🚶 Devant'], ['capot', '🔧 Capot ouvert'],
  ['voyants', '🚨 Voyants allumés'], ['coffre', '🧳 Coffre'], ['arriere', '🔙 Arrière'], ['cote', '↔️ Côté'], ['roue', '🛞 Roue']];
/* 💡 v1255 — LES FEUX À ALLUMER. David, le 23 octobre : « sur certaines
   vérifs il faut que l'élève allume les feux pour les contrôler : il va
   falloir qu'il appuie sur le bon bouton un certain nombre de fois, ou
   sur un bouton puis une commande, et avoir vraiment la photo avec les
   bons feux allumés ». Ses choix : toucher la commande N fois ; ensuite
   faire le tour et toucher les feux allumés sur la vraie photo ; il
   prend lui-même ces photos (partagées entre voitures identiques).
   [id, nom, les questions qu'il sert d'habitude] */
const AT_ALLUMAGES = [['croisement', '💡 Feux de croisement', [26, 82]], ['route', '🔦 Feux de route', [20, 78, 51, 95]],
  ['position', '🅿️ Feux de position', [30, 40]], ['detresse', '⚠️ Feux de détresse', [18, 76, 31, 85]],
  ['clignotant', '➡️ Clignotant droit', [14, 74]], ['brouillard', '🌫️ Feu de brouillard arrière', [16, 43, 91]],
  ['stop', '🛑 Feux stop (frein)', [46, 90]], ['recul', '↩️ Feux de recul', [44]], ['diurnes', '☀️ Feux diurnes', [52, 92]]];
/* les endroits où une photo peut montrer des feux allumés */
const AT_ENDROITS_ALLUMES = ['volant', 'voyants', 'devant', 'arriere', 'cote'];
const AT = { d: null, voiture: '', endroit: 'volant', etat: '', zone: '', regleN: 0, cheminAussi: {}, regleAussi: {}, allumage: 'croisement', allumageAussi: {}, occupe: false };
function atNomAllumage(a){ const x = AT_ALLUMAGES.find(y => y[0] === a); return x ? x[1] : a; }
function atAllumageDeQuestion(n){ const x = AT_ALLUMAGES.find(y => y[2].indexOf(n) !== -1); return x ? x[0] : ''; }

function atNomEndroit(e){ const x = AT_ENDROITS.find(y => y[0] === e); return x ? x[1] : e; }
function atReglages(){ const r = (AT.d && AT.d.reglages) || { voitures: [], chemins: {}, regles: {} }; if(!r.allumages) r.allumages = {}; return r; }
function atPhotos(){ return (AT.d && AT.d.photos) || []; }
function atPhotoDe(v, e, etat){ return atPhotos().find(p => p.endroit === e && (p.etat || '') === (etat || '') && p.voitures.indexOf(v) !== -1) || null; }
/* 💡 Les zones à toucher pour CONTRÔLER la question n, sur les photos où
   les feux « a » sont allumés (pour la voiture v) */
function atZonesControle(v, n, a){
  const l = [];
  atPhotos().forEach(p => {
    if(p.etat !== a || p.voitures.indexOf(v) === -1 || atPhotoDe(v, p.endroit, a) !== p) return;
    p.zones.forEach(z => { if(z.sorte === 'reponse' && (z.questions || []).indexOf(n) !== -1) l.push({ photo: p, zone: z }); });
  });
  return l;
}
function atVoitureNom(id){ const v = atReglages().voitures.find(x => x.id === id); return v ? v.nom : id; }
function atLien(p){ const l = p && p.lien; if(!l) return ''; return l.charAt(0) === '/' ? String((typeof CONFIG !== 'undefined' && CONFIG.WORKER_URL) || '').replace(/\/$/, '') + l : l; }
function atIdVoiture(nom){
  const base = String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'voiture';
  let id = base, i = 2;
  while(atReglages().voitures.some(v => v.id === id)) id = base + '-' + (i++);
  return id;
}
function atNouvelId(p){ let i = 1; while(p.zones.some(z => z.id === 'z' + i)) i++; return 'z' + i; }
/* La zone qui répond à n sur la voiture v (sur LA photo de son endroit) */
function atZoneReponse(v, n){
  for(const p of atPhotos()){
    if(p.voitures.indexOf(v) === -1 || atPhotoDe(v, p.endroit) !== p) continue;
    const z = p.zones.find(z => z.sorte === 'reponse' && (z.questions || []).indexOf(n) !== -1);
    if(z) return { photo: p, zone: z };
  }
  return null;
}
function atRegle(v, n){ const r = atReglages().regles[v]; return (r && r[String(n)]) || null; }

/* ---------- Lire, écrire ---------- */
async function atAppel(c, bouton){
  if(AT.occupe) return null;
  AT.occupe = true;
  if(bouton) bouton.disabled = true;
  try{
    const r = await appelPrep(c);
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    AT.d = { reglages: r.reglages, photos: r.photos };
    return r;
  }catch(e){
    showToastVerifs('⚠️ ' + ((e && e.message) || e));
    return null;
  }finally{
    AT.occupe = false;
    if(bouton) bouton.disabled = false;
  }
}
async function afficherAtelierJeu(z){
  AT.racine = z;
  if(!AT.d){
    z.innerHTML = '<div class="empty">Lecture de l’atelier…</div>';
    const r = await atAppel({ action: 'jeuAtelierLire' });
    if(!r){ z.innerHTML = '<div class="empty">⚠️ L’atelier ne répond pas.</div>'; return; }
  }
  if(!AT.voiture || !atReglages().voitures.some(v => v.id === AT.voiture)) AT.voiture = (atReglages().voitures[0] || {}).id || '';
  atDessiner();
}
function atRedessiner(){ if(AT.racine && document.body.contains(AT.racine)) atDessiner(); }
function atReglagesPoser(reg, bouton, dit){
  return atAppel({ action: 'jeuReglagesPoser', reglages: reg }, bouton).then(r => { if(r){ if(dit) showToastVerifs(dit); atRedessiner(); } return r; });
}
function atCopieReglages(){ return JSON.parse(JSON.stringify(atReglages())); }

/* ---------- La page ---------- */
function atDessiner(){
  const z = AT.racine;
  z.innerHTML = '';
  z.appendChild(vqEl('div', 'vbIntro', 'Pour chaque voiture : une photo par endroit, et sur chaque photo des zones dessinées au doigt. 🎯 Une zone « réponse » répond à des questions ; ➡️ une zone « passage » mène à un autre endroit (porte, manette, capot). Le 🧭 chemin dit dans quel ordre l’élève les touche. Une question sans rien se joue quand même, en questions-réponses.'));
  const g = vqEl('div', 'atGrille');
  g.appendChild(atColVoitures());
  g.appendChild(atColPhoto());
  g.appendChild(atColReglages());
  z.appendChild(g);
}

/* ---------- 1 · Les voitures ---------- */
function atColVoitures(){
  const c = vqEl('div', 'atCol');
  c.appendChild(vqEl('div', 'vbLab', '🚗 Les voitures du jeu'));
  const reg = atReglages();
  reg.voitures.forEach(v => {
    let n = 0;
    for(let q = 1; q <= 100; q++) if(atZoneReponse(v.id, q) || atRegle(v.id, q)) n++;
    const b = vqEl('button', 'atVoit' + (v.id === AT.voiture ? ' on' : ''));
    b.type = 'button';
    b.setAttribute('data-voiture', v.id);
    b.appendChild(vqEl('b', '', '🚗 ' + v.nom));
    b.appendChild(vqEl('small', '', (v.boite ? v.boite + ' · ' : '') + n + ' question(s) placée(s) · ' + AT_ENDROITS.filter(e => atPhotoDe(v.id, e[0])).length + ' photo(s)'));
    const bar = vqEl('div', 'atBar'); const i = vqEl('i', ''); i.style.width = n + '%'; bar.appendChild(i); b.appendChild(bar);
    b.addEventListener('click', () => { AT.voiture = v.id; AT.zone = ''; atDessiner(); });
    c.appendChild(b);
  });
  if(!reg.voitures.length) c.appendChild(vqEl('div', 'vbAide', 'Aucune voiture pour l’instant : ajoute la première.'));
  /* ajouter */
  const f = vqEl('div', 'atAjout');
  const nom = vqEl('input', 'vbIn'); nom.type = 'text'; nom.placeholder = 'Ex : A3 n°2'; nom.setAttribute('data-hors-saisie', '1');
  const boite = vqEl('select', 'vbIn'); [['', 'Boîte ?'], ['BV', 'BV (manuelle)'], ['BEA', 'BEA (automatique)']].forEach(([v, t]) => boite.appendChild(new Option(t, v)));
  const ok = vqEl('button', 'btn btn-secondary', '➕ Ajouter une voiture'); ok.type = 'button';
  ok.addEventListener('click', () => {
    const t = nom.value.trim();
    if(!t){ showToastVerifs('Écris le nom de la voiture.'); return; }
    const r = atCopieReglages();
    const id = atIdVoiture(t);
    r.voitures.push({ id: id, nom: t, boite: boite.value });
    AT.voiture = id;
    atReglagesPoser(r, ok, '🚗 ' + t + ' ajoutée');
  });
  f.appendChild(nom); f.appendChild(boite); f.appendChild(ok);
  c.appendChild(f);
  const v = reg.voitures.find(x => x.id === AT.voiture);
  if(v){
    const ret = vqEl('button', 'atLien', '🗑️ Retirer « ' + v.nom + ' » du jeu'); ret.type = 'button';
    ret.addEventListener('click', async () => {
      if(!await confirmer('Retirer « ' + v.nom + ' » du jeu ? Ses chemins et ses règles partent avec elle ; les photos restent pour les autres voitures.', 'Retirer une voiture', true)) return;
      const r = atCopieReglages();
      r.voitures = r.voitures.filter(x => x.id !== v.id);
      delete r.chemins[v.id]; delete r.regles[v.id];
      AT.voiture = '';
      atReglagesPoser(r, ret, 'Voiture retirée').then(() => { AT.voiture = (atReglages().voitures[0] || {}).id || ''; atRedessiner(); });
    });
    c.appendChild(ret);
  }
  return c;
}

/* ---------- 2 · La photo d'un endroit, et ses zones ---------- */
function atColPhoto(){
  const c = vqEl('div', 'atCol atColLarge');
  const v = AT.voiture;
  if(!v){ c.appendChild(vqEl('div', 'empty', 'Ajoute une voiture pour commencer.')); return c; }
  const ch = vqEl('div', 'atEndroits');
  AT_ENDROITS.forEach(([e, t]) => {
    const b = vqEl('button', 'vbPuce' + (e === AT.endroit ? ' on' : '') + (atPhotoDe(v, e) ? ' plein' : ''), t + (atPhotoDe(v, e) ? ' ✓' : ''));
    b.type = 'button';
    b.setAttribute('data-endroit', e);
    b.addEventListener('click', () => { AT.endroit = e; AT.zone = ''; if(AT_ENDROITS_ALLUMES.indexOf(e) === -1) AT.etat = ''; atDessiner(); });
    ch.appendChild(b);
  });
  c.appendChild(ch);
  /* 💡 v1255 — la même vue, feux éteints ou avec tel feu allumé */
  if(AT_ENDROITS_ALLUMES.indexOf(AT.endroit) !== -1){
    c.appendChild(vqEl('div', 'vbLab', '💡 Les feux sur cette photo'));
    const ce = vqEl('div', 'atEndroits atEtats');
    [['', '🌑 Éteints (photo normale)']].concat(AT_ALLUMAGES).forEach(([a, t]) => {
      const a2 = atPhotoDe(v, AT.endroit, a);
      const b = vqEl('button', 'vbPuce' + (a === AT.etat ? ' on' : '') + (a2 ? ' plein' : ''), t + (a2 ? ' ✓' : ''));
      b.type = 'button';
      b.setAttribute('data-etat', a);
      b.addEventListener('click', () => { AT.etat = a; AT.zone = ''; atDessiner(); });
      ce.appendChild(b);
    });
    c.appendChild(ce);
  }else AT.etat = '';
  const nomVue = atNomEndroit(AT.endroit) + (AT.etat ? ' — ' + atNomAllumage(AT.etat) + ' allumés' : '');
  const p = atPhotoDe(v, AT.endroit, AT.etat);
  if(!p){
    const vide = vqEl('div', 'atVide');
    vide.appendChild(vqEl('div', '', '📷 Pas encore de photo « ' + nomVue + ' » pour ' + atVoitureNom(v) + '.'));
    if(AT.etat) vide.appendChild(vqEl('div', 'vbAide', 'Prends la voiture sous le même angle que la photo normale, feux allumés. Puis dessine 🎯 sur chaque feu allumé, avec le numéro des questions qui le contrôlent.'));
    const f = vqEl('input', ''); f.type = 'file'; f.accept = 'image/*'; f.style.display = 'none'; f.className = 'atFichier';
    const b = vqEl('button', 'btn btn-primary', '📷 Déposer la photo'); b.type = 'button';
    b.addEventListener('click', () => f.click());
    f.addEventListener('change', () => { if(f.files && f.files[0]) atDeposer(f.files[0], null, b); });
    vide.appendChild(b); vide.appendChild(f);
    /* la même photo qu'une autre voiture (même intérieur, même moteur) */
    const autres = atPhotos().filter(x => x.endroit === AT.endroit && (x.etat || '') === AT.etat);
    if(autres.length){
      vide.appendChild(vqEl('div', 'vbLab', 'Ou la même que :'));
      const l = vqEl('div', 'atEndroits');
      autres.forEach(x => {
        const bb = vqEl('button', 'vbPuce', '📷 ' + (x.voitures.map(atVoitureNom).join(', ') || 'sans voiture'));
        bb.type = 'button';
        bb.addEventListener('click', () => atBasculerVoiture(x, v, true, bb));
        l.appendChild(bb);
      });
      vide.appendChild(l);
    }
    c.appendChild(vide);
    return c;
  }
  /* la photo sert à… */
  const sert = vqEl('div', 'atSert');
  sert.appendChild(vqEl('b', '', '📷 Cette photo sert à :'));
  atReglages().voitures.forEach(x => {
    const on = p.voitures.indexOf(x.id) !== -1;
    const b = vqEl('button', 'vbPuce' + (on ? ' on' : ''), (on ? '✓ ' : '') + x.nom);
    b.type = 'button';
    b.setAttribute('data-sert', x.id);
    b.addEventListener('click', () => atBasculerVoiture(p, x.id, !on, b));
    sert.appendChild(b);
  });
  sert.appendChild(vqEl('div', 'vbAide', 'Même photo pour plusieurs voitures : les zones ne se dessinent qu’une fois. Une voiture n’a qu’une photo par endroit' + (AT_ENDROITS_ALLUMES.indexOf(AT.endroit) !== -1 ? ' et par feux allumés.' : '.')));
  c.appendChild(sert);
  /* l'éditeur : glisser pour dessiner une zone, toucher une zone pour la régler */
  const ed = vqEl('div', 'atEd');
  ed.style.aspectRatio = (p.l || 4) + ' / ' + (p.h || 3);
  const img = document.createElement('img'); img.src = atLien(p); img.alt = ''; img.draggable = false;
  ed.appendChild(img);
  p.zones.forEach(zz => {
    const d = vqEl('div', 'atZ' + (zz.sorte === 'passage' ? ' passage' : zz.sorte === 'commande' ? ' commande' : '') + (zz.id === AT.zone ? ' sel' : ''));
    d.setAttribute('data-z', zz.id);
    d.style.cssText = 'left:' + zz.x + '%;top:' + zz.y + '%;width:' + zz.w + '%;height:' + zz.h + '%';
    d.appendChild(vqEl('b', '', (zz.sorte === 'passage' ? '➡️ ' : zz.sorte === 'commande' ? '🔘 ' : '🎯 ') + (zz.nom || 'sans nom') + (zz.sorte === 'reponse' && zz.questions && zz.questions.length ? ' · ' + zz.questions.join(' · ') : '')));
    ed.appendChild(d);
  });
  let debut = null, cadre = null;
  const pos = ev => { const r = ed.getBoundingClientRect(); return { x: Math.max(0, Math.min(100, (ev.clientX - r.left) * 100 / r.width)), y: Math.max(0, Math.min(100, (ev.clientY - r.top) * 100 / r.height)) }; };
  ed.addEventListener('pointerdown', ev => {
    const zz = ev.target.closest('.atZ');
    if(zz){ AT.zone = zz.getAttribute('data-z'); atDessiner(); return; }
    debut = pos(ev);
    cadre = vqEl('div', 'atZ nouv');
    ed.appendChild(cadre);
    try{ ed.setPointerCapture(ev.pointerId); }catch(e){}
    ev.preventDefault();
  });
  ed.addEventListener('pointermove', ev => {
    if(!debut) return;
    const q = pos(ev);
    cadre.style.cssText = 'left:' + Math.min(debut.x, q.x) + '%;top:' + Math.min(debut.y, q.y) + '%;width:' + Math.abs(q.x - debut.x) + '%;height:' + Math.abs(q.y - debut.y) + '%';
  });
  ed.addEventListener('pointerup', ev => {
    if(!debut) return;
    const q = pos(ev), d0 = debut;
    debut = null;
    if(cadre) cadre.remove();
    const w = Math.abs(q.x - d0.x), h = Math.abs(q.y - d0.y);
    if(w < 2 || h < 2) return;
    const id = atNouvelId(p);
    p.zones.push({ id: id, nom: '', sorte: 'reponse', questions: [], x: Math.round(Math.min(d0.x, q.x) * 10) / 10, y: Math.round(Math.min(d0.y, q.y) * 10) / 10,
                   w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 });
    AT.zone = id;
    atDessiner();
    const n = AT.racine.querySelector('.atZoneNom'); if(n) n.focus();
  });
  c.appendChild(ed);
  c.appendChild(vqEl('div', 'vbAide', 'Glisse sur la photo pour dessiner une zone ; touche une zone pour la régler (à droite). Les élèves ne voient jamais les cadres.'));
  const bas = vqEl('div', 'atBtns');
  const f = vqEl('input', ''); f.type = 'file'; f.accept = 'image/*'; f.style.display = 'none';
  const bc = vqEl('button', 'btn btn-secondary', '🔄 Changer la photo'); bc.type = 'button';
  bc.addEventListener('click', () => f.click());
  f.addEventListener('change', () => { if(f.files && f.files[0]) atDeposer(f.files[0], p, bc); });
  const br = vqEl('button', 'btn btn-secondary', '🗑️ Retirer la photo'); br.type = 'button';
  br.addEventListener('click', async () => {
    if(!await confirmer('Retirer cette photo « ' + atNomEndroit(p.endroit) + ' » ? Elle sert à : ' + (p.voitures.map(atVoitureNom).join(', ') || 'aucune voiture') + '. Ses zones partent avec elle.', 'Retirer une photo', true)) return;
    atAppel({ action: 'jeuPhotoRetirer', id: p.id }, br).then(r => { if(r){ AT.zone = ''; atRedessiner(); } });
  });
  bas.appendChild(bc); bas.appendChild(br); bas.appendChild(f);
  c.appendChild(bas);
  return c;
}
/* Une photo déposée : réduite (1600 px au plus), en JPEG */
function atReduire(fichier){
  return new Promise((ok, ko) => {
    const u = URL.createObjectURL(fichier);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      ok({ donnees: c.toDataURL('image/jpeg', 0.85), l: c.width, h: c.height });
    };
    im.onerror = () => { URL.revokeObjectURL(u); ko(new Error('Ce fichier n’est pas une image.')); };
    im.src = u;
  });
}
async function atDeposer(fichier, photo, bouton){
  let r;
  try{ r = await atReduire(fichier); }catch(e){ showToastVerifs('⚠️ ' + e.message); return; }
  const c = photo ? { action: 'jeuPhotoPoser', id: photo.id, endroit: photo.endroit, etat: photo.etat || '', nom: photo.nom, voitures: photo.voitures, zones: photo.zones, image: r.donnees, l: r.l, h: r.h }
                  : { action: 'jeuPhotoPoser', endroit: AT.endroit, etat: AT.etat, nom: '', voitures: [AT.voiture], zones: [], image: r.donnees, l: r.l, h: r.h };
  /* une voiture n'a qu'une photo par endroit */
  if(!photo){
    for(const x of atPhotos().filter(x => x.endroit === AT.endroit && (x.etat || '') === AT.etat && x.voitures.indexOf(AT.voiture) !== -1)){
      await atAppel({ action: 'jeuPhotoPoser', id: x.id, endroit: x.endroit, etat: x.etat || '', nom: x.nom, voitures: x.voitures.filter(v => v !== AT.voiture), zones: x.zones });
    }
  }
  const ok = await atAppel(c, bouton);
  if(ok){ showToastVerifs('📷 Photo enregistrée'); atRedessiner(); }
}
async function atBasculerVoiture(p, v, oui, bouton){
  if(oui){
    for(const x of atPhotos().filter(x => x !== p && x.endroit === p.endroit && (x.etat || '') === (p.etat || '') && x.voitures.indexOf(v) !== -1)){
      await atAppel({ action: 'jeuPhotoPoser', id: x.id, endroit: x.endroit, etat: x.etat || '', nom: x.nom, voitures: x.voitures.filter(y => y !== v), zones: x.zones });
    }
  }
  const voitures = oui ? p.voitures.concat([v]) : p.voitures.filter(y => y !== v);
  const r = await atAppel({ action: 'jeuPhotoPoser', id: p.id, endroit: p.endroit, etat: p.etat || '', nom: p.nom, voitures: voitures, zones: p.zones }, bouton);
  if(r) atRedessiner();
}

/* ---------- 3 · La zone, le chemin, les règles ---------- */
function atColReglages(){
  const c = vqEl('div', 'atCol');
  const v = AT.voiture;
  if(!v) return c;
  const p = atPhotoDe(v, AT.endroit, AT.etat);
  const zz = p && p.zones.find(x => x.id === AT.zone);
  if(zz) c.appendChild(atPanneauZone(p, zz));
  c.appendChild(atPanneauChemin(v));
  c.appendChild(atPanneauAllumer(v));
  c.appendChild(atPanneauRegles(v));
  return c;
}
function atPanneauZone(p, zz){
  const b = vqEl('div', 'atP');
  b.appendChild(vqEl('h4', '', '🎯 La zone'));
  b.appendChild(vqEl('div', 'vbLab', 'Son nom (dit à l’élève quand il la touche par erreur)'));
  const nom = vqEl('input', 'vbIn atZoneNom'); nom.type = 'text'; nom.value = zz.nom || ''; nom.placeholder = 'Ex : le bouchon du lave-glace, la porte, la bague des feux, la pédale de frein';
  b.appendChild(nom);
  b.appendChild(vqEl('div', 'vbLab', 'C’est'));
  let sorte = zz.sorte;
  const qs = vqEl('div', '');
  const ch = vqEl('div', 'vbChx');
  [['reponse', '🎯 La réponse à des questions'], ['passage', '➡️ Un passage (porte, manette, capot…)'], ['commande', '🔘 Une commande à actionner (bague, bouton, pédale…)']].forEach(([k, t]) => {
    const x = vqEl('button', 'vbPuce' + (sorte === k ? ' on' : ''), t); x.type = 'button';
    x.setAttribute('data-sorte', k);
    x.addEventListener('click', () => { sorte = k; ch.querySelectorAll('.vbPuce').forEach(y => y.classList.toggle('on', y === x)); qs.style.display = k === 'reponse' ? '' : 'none'; });
    ch.appendChild(x);
  });
  b.appendChild(ch);
  qs.appendChild(vqEl('div', 'vbLab', 'Les numéros des questions'));
  const num = vqEl('input', 'vbIn atZoneQ'); num.type = 'text'; num.placeholder = 'Ex : 2, 50'; num.value = (zz.questions || []).join(', ');
  qs.appendChild(num);
  const apercu = vqEl('div', 'vbAide', '');
  const lire = () => Array.from(new Set((num.value.match(/\d{1,3}/g) || []).map(Number).filter(n => n >= 1 && n <= 100)));
  const voir = () => { apercu.textContent = lire().map(n => { const q = verifsQuestion(n); return n + ' · ' + (q ? q.verif : '?'); }).join('\n'); apercu.style.whiteSpace = 'pre-line'; };
  num.addEventListener('input', voir); voir();
  qs.appendChild(apercu);
  qs.style.display = sorte === 'reponse' ? '' : 'none';
  b.appendChild(qs);
  const bt = vqEl('div', 'atBtns');
  const ok = vqEl('button', 'btn btn-primary', '💾 Enregistrer la zone'); ok.type = 'button';
  ok.addEventListener('click', () => {
    const zones = p.zones.map(x => x.id !== zz.id ? x : Object.assign({}, x, { nom: nom.value.trim(), sorte: sorte, questions: sorte === 'reponse' ? lire() : [] }));
    atAppel({ action: 'jeuPhotoPoser', id: p.id, endroit: p.endroit, etat: p.etat || '', nom: p.nom, voitures: p.voitures, zones: zones }, ok).then(r => { if(r){ showToastVerifs('🎯 Zone enregistrée'); atRedessiner(); } });
  });
  const ret = vqEl('button', 'btn btn-secondary', '🗑️ Retirer la zone'); ret.type = 'button';
  ret.addEventListener('click', () => {
    atAppel({ action: 'jeuPhotoPoser', id: p.id, endroit: p.endroit, etat: p.etat || '', nom: p.nom, voitures: p.voitures, zones: p.zones.filter(x => x.id !== zz.id) }, ret).then(r => { if(r){ AT.zone = ''; atRedessiner(); } });
  });
  bt.appendChild(ok); bt.appendChild(ret);
  b.appendChild(bt);
  if(!zz.nom && !(zz.questions || []).length) b.appendChild(vqEl('div', 'vbAide', 'Zone neuve : donne-lui un nom et dis ce qu’elle est, puis 💾. Tant qu’elle n’est pas enregistrée, elle n’existe pas.'));
  return b;
}
/* 🧭 Le chemin vers l'endroit affiché, pour cette voiture */
function atPanneauChemin(v){
  const b = vqEl('div', 'atP atChemin');
  const e = AT.endroit;
  b.appendChild(vqEl('h4', '', '🧭 Le chemin vers « ' + atNomEndroit(e) + ' » — ' + atVoitureNom(v)));
  if(e === 'volant'){
    b.appendChild(vqEl('div', 'vbAide', 'L’élève commence toujours au volant, comme à l’examen : pas de chemin pour y arriver. Choisis un autre endroit (Capot ouvert, Coffre…) pour régler son chemin.'));
    return b;
  }
  /* les passages possibles : ceux des photos de CETTE voiture */
  const passages = [];
  AT_ENDROITS.forEach(([en]) => {
    const p = atPhotoDe(v, en);
    if(p) p.zones.filter(z => z.sorte === 'passage').forEach(z => passages.push({ cle: p.id + ':' + z.id, t: atNomEndroit(en) + ' › ' + (z.nom || 'sans nom'), photo: p.id, zone: z.id }));
  });
  if(!passages.length){
    b.appendChild(vqEl('div', 'vbAide', 'Dessine d’abord les zones ➡️ « passage » sur les photos de cette voiture (la porte, la manette du capot, le capot…), puis mets-les ici dans l’ordre.'));
    return b;
  }
  if(!AT.cheminEdit || AT.cheminEdit.v !== v || AT.cheminEdit.e !== e){
    const c = (atReglages().chemins[v] || {})[e] || [];
    AT.cheminEdit = { v: v, e: e, l: c.map(s => s.photo + ':' + s.zone) };
    AT.cheminAussi = {};
  }
  const ed = AT.cheminEdit;
  b.appendChild(vqEl('div', 'vbAide', 'L’élève part du volant et touche ces endroits dans l’ordre ; ensuite il est sur la photo « ' + atNomEndroit(e) + ' », où il montre la réponse.'));
  const liste = vqEl('ol', 'atEtapes');
  ed.l.forEach((cle, i) => {
    const li = vqEl('li', '');
    const sel = vqEl('select', 'vbIn');
    passages.forEach(x => sel.appendChild(new Option(x.t, x.cle)));
    if(!passages.some(x => x.cle === cle)) sel.appendChild(new Option('⚠️ un passage qui n’existe plus', cle));
    sel.value = cle;
    sel.addEventListener('change', () => { ed.l[i] = sel.value; });
    li.appendChild(sel);
    const mini = (t, quoi, titre) => { const x = vqEl('button', 'atMini', t); x.type = 'button'; x.title = titre; x.setAttribute('aria-label', titre); x.addEventListener('click', quoi); li.appendChild(x); };
    mini('↑', () => { if(i){ const t = ed.l[i - 1]; ed.l[i - 1] = ed.l[i]; ed.l[i] = t; atDessiner(); } }, 'Monter');
    mini('↓', () => { if(i < ed.l.length - 1){ const t = ed.l[i + 1]; ed.l[i + 1] = ed.l[i]; ed.l[i] = t; atDessiner(); } }, 'Descendre');
    mini('✕', () => { ed.l.splice(i, 1); atDessiner(); }, 'Retirer l’étape');
    liste.appendChild(li);
  });
  b.appendChild(liste);
  const plus = vqEl('button', 'btn btn-secondary atPlus', '➕ Ajouter une étape'); plus.type = 'button';
  plus.addEventListener('click', () => { ed.l.push(passages[0].cle); atDessiner(); });
  b.appendChild(plus);
  b.appendChild(atAussi(v, AT.cheminAussi, 'Appliquer aussi à :'));
  const ok = vqEl('button', 'btn btn-primary', '💾 Enregistrer le chemin'); ok.type = 'button';
  ok.addEventListener('click', () => {
    const r = atCopieReglages();
    const etapes = ed.l.map(c => { const [ph, zo] = c.split(':'); return { photo: Number(ph), zone: zo }; });
    const cibles = [v].concat(Object.keys(AT.cheminAussi).filter(k => AT.cheminAussi[k]));
    const manque = [];
    cibles.forEach(x => {
      r.chemins[x] = r.chemins[x] || {};
      if(etapes.length) r.chemins[x][e] = etapes; else delete r.chemins[x][e];
      /* une étape sur une photo qui ne sert pas à cette voiture */
      etapes.forEach(s => { const p = atPhotos().find(y => y.id === s.photo); if(p && p.voitures.indexOf(x) === -1 && manque.indexOf(x) === -1) manque.push(x); });
    });
    atReglagesPoser(r, ok, '🧭 Chemin enregistré' + (cibles.length > 1 ? ' pour ' + cibles.length + ' voitures' : '')).then(res => {
      if(res && manque.length) showToastVerifs('⚠️ Attention : ' + manque.map(atVoitureNom).join(', ') + ' n’a pas ces photos — coche-la sous les photos, ou refais son chemin.');
      AT.cheminEdit = null;
      atRedessiner();
    });
  });
  b.appendChild(ok);
  return b;
}
/* 💡 v1255 — ALLUMER LES FEUX, POUR CETTE VOITURE : les commandes à
   toucher dans l'ordre, et combien de fois chacune (« la bague : 2
   crans », « le bouton, puis tirer le comodo »). */
function atPanneauAllumer(v){
  const b = vqEl('div', 'atP atAllumer');
  b.appendChild(vqEl('h4', '', '💡 Allumer les feux — ' + atVoitureNom(v)));
  const ch = vqEl('div', 'vbChx');
  AT_ALLUMAGES.forEach(([a, t]) => {
    const fait = ((atReglages().allumages[v] || {})[a] || []).length;
    const x = vqEl('button', 'vbPuce' + (a === AT.allumage ? ' on' : ''), t + (fait ? ' ✓' : ''));
    x.type = 'button'; x.setAttribute('data-allumage', a);
    x.addEventListener('click', () => { AT.allumage = a; AT.allumageEdit = null; AT.allumageAussi = {}; atDessiner(); });
    ch.appendChild(x);
  });
  b.appendChild(ch);
  const a = AT.allumage;
  /* les commandes possibles : les zones 🔘 des photos de cette voiture */
  const commandes = [];
  atPhotos().forEach(p => {
    if(p.voitures.indexOf(v) === -1 || atPhotoDe(v, p.endroit, p.etat || '') !== p) return;
    p.zones.filter(z => z.sorte === 'commande').forEach(z => commandes.push({ cle: p.id + ':' + z.id, t: atNomEndroit(p.endroit) + (p.etat ? ' (' + atNomAllumage(p.etat) + ')' : '') + ' › ' + (z.nom || 'sans nom') }));
  });
  if(!commandes.length){
    b.appendChild(vqEl('div', 'vbAide', 'Dessine d’abord, sur la photo « Au volant » de cette voiture, les zones 🔘 « commande » : la bague des feux, le bouton des feux de détresse, le comodo, la pédale de frein, le levier de vitesse…'));
    return b;
  }
  if(!AT.allumageEdit || AT.allumageEdit.v !== v || AT.allumageEdit.a !== a){
    const c = (atReglages().allumages[v] || {})[a] || [];
    AT.allumageEdit = { v: v, a: a, l: c.map(s2 => ({ cle: s2.photo + ':' + s2.zone, fois: s2.fois || 1 })) };
  }
  const ed = AT.allumageEdit;
  b.appendChild(vqEl('div', 'vbAide', 'L’élève, au volant, touche ces commandes dans l’ordre, le bon nombre de fois, puis dit « C’est allumé ». Un appui de trop, une commande de plus ou en moins : c’est une erreur, et la question part dans « À revoir ».'));
  const liste = vqEl('ol', 'atEtapes');
  ed.l.forEach((x, i) => {
    const li = vqEl('li', '');
    const sel = vqEl('select', 'vbIn');
    sel.setAttribute('aria-label', 'Commande de l’étape ' + (i + 1));
    commandes.forEach(y => sel.appendChild(new Option(y.t, y.cle)));
    if(!commandes.some(y => y.cle === x.cle)) sel.appendChild(new Option('⚠️ une commande qui n’existe plus', x.cle));
    sel.value = x.cle;
    sel.addEventListener('change', () => { x.cle = sel.value; });
    li.appendChild(sel);
    const fois = vqEl('select', 'vbIn atFois');
    fois.setAttribute('aria-label', 'Nombre d’appuis à l’étape ' + (i + 1));
    for(let k = 1; k <= 6; k++) fois.appendChild(new Option('× ' + k + (k === 1 ? ' appui' : ' appuis'), String(k)));
    fois.value = String(x.fois || 1);
    fois.addEventListener('change', () => { x.fois = Number(fois.value) || 1; });
    li.appendChild(fois);
    const mini = (t, quoi, titre) => { const y = vqEl('button', 'atMini', t); y.type = 'button'; y.title = titre; y.setAttribute('aria-label', titre); y.addEventListener('click', quoi); li.appendChild(y); };
    mini('↑', () => { if(i){ const t = ed.l[i - 1]; ed.l[i - 1] = ed.l[i]; ed.l[i] = t; atDessiner(); } }, 'Monter');
    mini('↓', () => { if(i < ed.l.length - 1){ const t = ed.l[i + 1]; ed.l[i + 1] = ed.l[i]; ed.l[i] = t; atDessiner(); } }, 'Descendre');
    mini('✕', () => { ed.l.splice(i, 1); atDessiner(); }, 'Retirer l’étape');
    liste.appendChild(li);
  });
  b.appendChild(liste);
  const plus = vqEl('button', 'btn btn-secondary atPlus', '➕ Ajouter une commande'); plus.type = 'button';
  plus.addEventListener('click', () => { ed.l.push({ cle: commandes[0].cle, fois: 1 }); atDessiner(); });
  b.appendChild(plus);
  /* les photos « allumées » de cette voiture */
  const vues = AT_ENDROITS_ALLUMES.filter(e => atPhotoDe(v, e, a)).map(atNomEndroit);
  b.appendChild(vqEl('div', 'vbAide', vues.length ? '📷 Photos avec ' + atNomAllumage(a).replace(/^\S+\s/, '').toLowerCase() + ' allumés : ' + vues.join(', ') + '.'
                                                   : '📷 Pas encore de photo avec ces feux allumés : dépose-la à gauche (endroit, puis « 💡 Les feux sur cette photo »).'));
  b.appendChild(atAussi(v, AT.allumageAussi, 'Appliquer aussi à :'));
  const ok = vqEl('button', 'btn btn-primary', '💾 Enregistrer'); ok.type = 'button';
  ok.addEventListener('click', () => {
    const rr = atCopieReglages();
    rr.allumages = rr.allumages || {};
    const etapes = ed.l.map(x => { const [ph, zo] = x.cle.split(':'); return { photo: Number(ph), zone: zo, fois: x.fois || 1 }; });
    const cibles = [v].concat(Object.keys(AT.allumageAussi).filter(k => AT.allumageAussi[k]));
    cibles.forEach(x => {
      rr.allumages[x] = rr.allumages[x] || {};
      if(etapes.length) rr.allumages[x][a] = etapes; else delete rr.allumages[x][a];
    });
    atReglagesPoser(rr, ok, atNomAllumage(a) + ' : réglé' + (cibles.length > 1 ? ' pour ' + cibles.length + ' voitures' : '')).then(() => { AT.allumageEdit = null; atRedessiner(); });
  });
  b.appendChild(ok);
  return b;
}

/* « Appliquer aussi à » / « Même chose pour » : les autres voitures, en un clic */
function atAussi(v, etat, titre){
  const d = vqEl('div', 'atAussi');
  d.appendChild(vqEl('div', 'vbLab', titre));
  const l = vqEl('div', 'vbChx');
  const autres = atReglages().voitures.filter(x => x.id !== v);
  if(!autres.length){ l.appendChild(vqEl('span', 'vbAide', 'pas d’autre voiture')); }
  autres.forEach(x => {
    const b = vqEl('button', 'vbPuce' + (etat[x.id] ? ' on' : ''), (etat[x.id] ? '✓ ' : '') + x.nom); b.type = 'button';
    b.setAttribute('data-aussi', x.id);
    b.addEventListener('click', () => { etat[x.id] = !etat[x.id]; b.classList.toggle('on', !!etat[x.id]); b.textContent = (etat[x.id] ? '✓ ' : '') + x.nom; });
    l.appendChild(b);
  });
  if(autres.length > 1){
    const t = vqEl('button', 'vbPuce', 'Toutes'); t.type = 'button';
    t.addEventListener('click', () => { autres.forEach(x => { etat[x.id] = true; }); atDessiner(); });
    l.appendChild(t);
  }
  d.appendChild(l);
  return d;
}
/* 🔧 Les règles : ce que l'élève doit faire, question par question */
function atPanneauRegles(v){
  const b = vqEl('div', 'atP atRegles');
  b.appendChild(vqEl('h4', '', '🔧 Question par question — ' + atVoitureNom(v)));
  /* la grille : 📍 placée sur une photo · 🗣️ à dire · 🖥️ ordinateur de bord */
  const g = vqEl('div', 'vqJeuGrille atGrilleQ');
  for(let n = 1; n <= 100; n++){
    const r = atRegle(v, n), z = atZoneReponse(v, n);
    const x = vqEl('button', r ? (r.mode === 'ordi' ? 'o' : r.mode === 'allumer' ? 'a' : 'd') : (z ? 'm' : ''), String(n)); x.type = 'button';
    x.title = n + ' · ' + (r ? (r.mode === 'ordi' ? '🖥️ ordinateur de bord' : r.mode === 'allumer' ? '💡 ' + atNomAllumage(r.allumage) + ', puis contrôler' : '🗣️ à dire') : (z ? '📍 ' + atNomEndroit(z.photo.endroit) + ' › ' + (z.zone.nom || '') : 'en questions-réponses'));
    if(n === AT.regleN) x.classList.add('sel');
    x.addEventListener('click', () => { AT.regleN = n; AT.regleAussi = {}; atDessiner(); });
    g.appendChild(x);
  }
  b.appendChild(g);
  b.appendChild(vqEl('div', 'vbAide', 'Vert : sur une photo · jaune : 💡 allumer puis contrôler · bleu : à dire · violet : ordinateur de bord · gris : en questions-réponses. Touche un numéro pour le régler.'));
  const n = AT.regleN;
  if(!n) return b;
  const q = verifsQuestion(n);
  b.appendChild(vqEl('div', 'atQ', n + ' · ' + (q ? q.verif : '')));
  const r = atRegle(v, n) || {};
  const z = atZoneReponse(v, n);
  let mode = r.mode || 'zone';
  let allumage = r.allumage || atAllumageDeQuestion(n) || 'croisement';
  const ch = vqEl('div', 'vbChx');
  const txt = vqEl('div', '');
  const feux = vqEl('div', '');
  const montrer = () => { txt.style.display = (mode === 'dire' || mode === 'ordi') ? '' : 'none'; info.style.display = mode === 'zone' ? '' : 'none'; feux.style.display = mode === 'allumer' ? '' : 'none'; };
  [['zone', '📍 La montrer sur la photo'], ['allumer', '💡 L’allumer, puis contrôler'], ['dire', '🗣️ Il n’y en a pas : à dire'], ['ordi', '🖥️ C’est l’ordinateur de bord']].forEach(([k, t]) => {
    const x = vqEl('button', 'vbPuce' + (mode === k ? ' on' : ''), t); x.type = 'button';
    x.setAttribute('data-mode', k);
    x.addEventListener('click', () => { mode = k; ch.querySelectorAll('.vbPuce').forEach(y => y.classList.toggle('on', y === x)); montrer(); });
    ch.appendChild(x);
  });
  b.appendChild(ch);
  /* 💡 quels feux, et où en est cette voiture */
  feux.appendChild(vqEl('div', 'vbLab', 'Les feux à allumer'));
  const cf = vqEl('div', 'vbChx');
  const etatFeux = vqEl('div', 'vbAide', '');
  const direEtat = () => {
    const et = ((atReglages().allumages[v] || {})[allumage] || []);
    const cz = atZonesControle(v, n, allumage);
    etatFeux.style.whiteSpace = 'pre-line';
    etatFeux.textContent = (et.length ? '✅ Pour les allumer : ' + et.length + ' commande' + (et.length > 1 ? 's' : '') + ' (' + et.map(s2 => '×' + s2.fois).join(', ') + ').' : '⚠️ Pas encore réglé : 💡 « Allumer les feux », plus haut.') + '\n' +
      (cz.length ? '✅ Pour contrôler : ' + cz.map(x => atNomEndroit(x.photo.endroit) + ' › ' + (x.zone.nom || 'zone')).join(' · ') + '.' : '⚠️ Pas encore de feu à toucher : sur la photo avec ces feux allumés, dessine 🎯 sur le feu, avec le n° ' + n + '.');
  };
  AT_ALLUMAGES.forEach(([a, t]) => {
    const x = vqEl('button', 'vbPuce' + (allumage === a ? ' on' : ''), t); x.type = 'button';
    x.setAttribute('data-feux', a);
    x.addEventListener('click', () => { allumage = a; cf.querySelectorAll('.vbPuce').forEach(y => y.classList.toggle('on', y === x)); direEtat(); });
    cf.appendChild(x);
  });
  feux.appendChild(cf); feux.appendChild(etatFeux); direEtat();
  b.appendChild(feux);
  const info = vqEl('div', 'vbAide', z ? '📍 Placée : ' + atNomEndroit(z.photo.endroit) + ' › ' + (z.zone.nom || 'zone sans nom') + '.' : 'Pas encore de zone pour elle : dessine-la sur la bonne photo (🎯, avec son numéro). Sans zone, elle se joue en questions-réponses.');
  b.appendChild(info);
  txt.appendChild(vqEl('div', 'vbLab', 'Ce qu’il doit dire (montré quand il a trouvé)'));
  const dire = vqEl('textarea', 'vbIn atDire'); dire.rows = 2; dire.value = r.dire || ''; dire.placeholder = 'Ex : Il n’y a pas de commande : c’est automatique.';
  txt.appendChild(dire);
  txt.appendChild(vqEl('div', 'vbLab', 'Ailleurs, en général'));
  const gen = vqEl('textarea', 'vbIn atGeneral'); gen.rows = 2; gen.value = r.general != null ? r.general : ((q && q.verifRep) || '');
  txt.appendChild(gen);
  b.appendChild(txt);
  montrer();
  b.appendChild(atAussi(v, AT.regleAussi, 'Même chose pour :'));
  const ok = vqEl('button', 'btn btn-primary', '💾 Enregistrer'); ok.type = 'button';
  ok.addEventListener('click', () => {
    const rr = atCopieReglages();
    const cibles = [v].concat(Object.keys(AT.regleAussi).filter(k => AT.regleAussi[k]));
    cibles.forEach(x => {
      rr.regles[x] = rr.regles[x] || {};
      if(mode === 'zone') delete rr.regles[x][String(n)];
      else if(mode === 'allumer') rr.regles[x][String(n)] = { mode: 'allumer', allumage: allumage };
      else rr.regles[x][String(n)] = { mode: mode, dire: dire.value.trim(), general: gen.value.trim() };
    });
    atReglagesPoser(rr, ok, '🔧 Question ' + n + ' réglée' + (cibles.length > 1 ? ' pour ' + cibles.length + ' voitures' : ''));
  });
  b.appendChild(ok);
  return b;
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-jeu-atelier.js'] = true;
