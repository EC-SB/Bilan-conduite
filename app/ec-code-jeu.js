/* Déployé le 18/11/2026 à 11:17 — v1462 */
/* ============================================================
   ec-code-jeu.js — v1462
   🚦 L'ATELIER DU JEU DU CODE (« Mon code », dans l'espace élève)

   David, le 18 novembre : « je pré-remplis, tu corriges » — puis :
   « garde dans l'optique qu'il faut aussi que je puisse modifier si tu
   as fait des erreurs sur les photos, les schémas, les réponses ».

   Le jeu et son contenu de base (64 panneaux dessinés, leurs fiches)
   sont dans code-commun.js, le même fichier que l'espace élève. Ici,
   David corrige PAR-DESSUS, sans livraison :
     · le nom, la famille, « ce qu'il dit », « ce que je fais », le
       piège et le faux jumeau d'un panneau ;
     · son dessin, remplacé par une image (réduite ici, gardée par le
       Worker) — et « revenir au dessin » ;
     · un panneau caché (il ne sort plus dans le jeu), ou ajouté ;
     · « tout remettre comme au départ », panneau par panneau.
   « ▶️ Essayer le jeu » ouvre le vrai jeu de l'élève dans un cadre,
   avec les corrections du moment : rien n'y est gardé.

   Élèves › 🎓 Code › « 🚦 Le jeu du code ». Voir : droit « code »,
   modifier : droit « code » en écriture (comme les corrigés).

   ⚠️ ON N'ENVOIE QUE LES ÉCARTS. Une fiche non touchée n'est pas
   recopiée chez le Worker : le jour où le texte de base est amélioré
   dans une livraison, elle en profite. Seul ce que David a changé est
   figé.
   ============================================================ */
const CJ = { contenu: { mod: {}, ajouts: [] }, images: {}, neuves: {}, charge: false, onglet: 'panneaux', cherche: '', majLe: '', par: '' };

function cjEch(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function cjEl(tag, cls, html){ const e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; }
function cjPeutModifier(){ return typeof peutModifier === 'function' ? peutModifier('code') : true; }
function cjStyle(){
  if(document.getElementById('cjAtelierStyle')) return;
  const s = document.createElement('style');
  s.id = 'cjAtelierStyle';
  s.textContent =
    '.cjaNote{font-size:13px;color:var(--muted);line-height:1.45;margin:0 0 12px}' +
    '.cjaSeg{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}' +
    '.cjaSeg button{width:auto;margin:0;min-height:0;height:auto;padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:var(--navy-deep);color:var(--cream);font:inherit;font-weight:700;font-size:13.5px;cursor:pointer}' +
    '.cjaSeg button.on{background:linear-gradient(180deg,#D8FF6A,#B6FF0E);color:#111;border-color:transparent}' +
    '.cjaBarre{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}' +
    '.cjaBarre input{flex:1 1 200px;min-width:0;margin:0}' +
    '.cjaBarre .btn{width:auto;margin:0;flex:0 0 auto}' +
    '.cjaFam{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px}' +
    '.cjaLigne{display:flex;gap:11px;align-items:center;width:100%;margin:0 0 6px;padding:8px 10px;border:1px solid var(--line);border-radius:13px;background:var(--navy-deep);color:var(--cream);font:inherit;text-align:left;cursor:pointer;min-height:0;height:auto}' +
    '.cjaLigne:hover{border-color:#B6FF0E}' +
    '.cjaLigne .d{flex:0 0 44px;width:44px;height:44px}.cjaLigne .d svg,.cjaLigne .d img{width:100%;height:100%;object-fit:contain;display:block}' +
    '.cjaLigne .t{flex:1;min-width:0;font-weight:700;font-size:14px}.cjaLigne .t small{display:block;font-weight:500;font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.cjaLigne.cache{opacity:.55}' +
    '.cjaPuce{flex:0 0 auto;font-size:11px;font-weight:800;border-radius:999px;padding:3px 8px;background:rgba(182,255,14,.25);color:var(--cream);white-space:nowrap}' +
    '.cjaPuce.g{background:var(--line)}' +
    '.cjaTete{display:flex;gap:14px;align-items:center;margin-bottom:12px;flex-wrap:wrap}' +
    '.cjaTete .d{flex:0 0 96px;width:96px;height:96px;border-radius:14px;background:#fff;border:1px solid var(--line);padding:6px;box-sizing:border-box}' +
    '.cjaTete .d svg,.cjaTete .d img{width:100%;height:100%;object-fit:contain;display:block}' +
    '.cjaTete .b{display:flex;flex-direction:column;gap:6px;flex:1;min-width:180px}.cjaTete .b .btn{width:auto;margin:0;align-self:flex-start}' +
    '.cjaForm label{display:block;font-size:12px;font-weight:800;color:var(--muted);margin:10px 0 4px;text-transform:none}' +
    '.cjaForm textarea,.cjaForm input[type=text],.cjaForm select{display:block;width:100%;box-sizing:border-box;margin:0;font:inherit;font-size:14.5px}' +
    '.cjaForm textarea{min-height:62px;padding:9px 12px;border:1px solid var(--line);border-radius:12px;background:var(--navy-deep);color:var(--cream);line-height:1.4;resize:vertical}' +
    '.cjaCoche{display:flex !important;align-items:center;gap:9px;font-size:14px !important;color:var(--cream) !important;cursor:pointer}' +
    '.cjaCoche input{width:19px;height:19px;flex:none;margin:0}' +
    '.cjaEtat{font-size:13px;min-height:18px;margin-top:8px}' +
    '.cjaTel{display:flex;justify-content:center}' +
    '.cjaCadre{width:390px;max-width:100%;height:min(720px,70vh);border:1px solid var(--line);border-radius:22px;background:#fff}';
  document.head.appendChild(s);
}

/* La liste du moment : la base de code-commun.js, plus les corrections */
function cjListe(){
  if(!window.CodeEC) return [];
  return window.CodeEC.fusionner(CJ.contenu, CJ.images).liste;
}
function cjDessin(p){ return window.CodeEC.dessin(p, CJ.images); }
function cjFamilles(){ return (window.CodeEC && window.CodeEC.FAMILLES) || []; }

async function cjCharger(){
  const d = await appelPrep({ action: 'codeJeuContenu' });
  if(!d || d.status === 'error') throw new Error((d && d.message) || 'le jeu ne répond pas');
  CJ.contenu = d.contenu || { mod: {}, ajouts: [] };
  CJ.contenu.mod = CJ.contenu.mod || {};
  CJ.contenu.ajouts = CJ.contenu.ajouts || [];
  CJ.images = d.images || {};
  CJ.neuves = {};
  CJ.majLe = d.majLe || '';
  CJ.par = d.par || '';
  CJ.charge = true;
}
async function cjEnregistrer(){
  const d = await appelPrep({ action: 'codeJeuContenuPoser', contenu: CJ.contenu, images: CJ.neuves });
  if(!d || d.status === 'error') throw new Error((d && d.message) || 'refusé');
  CJ.contenu = d.contenu || { mod: {}, ajouts: [] };
  CJ.images = d.images || {};
  CJ.neuves = {};
  CJ.majLe = d.majLe || '';
  CJ.par = d.par || '';
}

/* ---------- la fenêtre ---------- */
async function ouvrirAtelierCodeJeu(){
  cjStyle();
  const fond = cjEl('div', 'overlay show');
  fond.setAttribute('data-cja', '1');
  const boite = cjEl('div', 'modal');
  boite.style.cssText = 'max-width:min(680px, 96vw);max-height:92vh;overflow-y:auto;';
  boite.innerHTML = '<h3>🚦 Le jeu du code — l’atelier</h3>';
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  const corps = cjEl('div', '');
  boite.appendChild(corps);
  const bas = cjEl('div', 'btn-row');
  bas.style.marginTop = '12px';
  const bf = cjEl('button', 'btn btn-secondary', 'Fermer');
  bf.type = 'button';
  bf.addEventListener('click', fermer);
  bas.appendChild(bf);
  boite.appendChild(bas);
  if(!window.CodeEC){ corps.innerHTML = '<div class="empty">⚠️ Le jeu n’est pas chargé : recharge l’appli.</div>'; return; }
  corps.innerHTML = '<div class="empty">Lecture du jeu…</div>';
  try{ await cjCharger(); }
  catch(e){ corps.innerHTML = '<div class="empty">⚠️ ' + cjEch(e.message || e) + '</div>'; return; }
  cjDessiner(corps);
}
function cjDessiner(corps){
  corps.innerHTML = '';
  corps.appendChild(cjEl('p', 'cjaNote', 'Le jeu « 🚦 Mon code » s’ouvre dans l’App des élèves qui font le code avec nous. Il est pré-rempli : ici, tu corriges ce qui ne va pas (un texte, un dessin, un panneau en trop ou qui manque). Les élèves voient la correction à leur prochaine ouverture.' +
    (CJ.majLe ? ' <b>Dernière correction : ' + cjEch(CJ.majLe) + (CJ.par ? ', par ' + cjEch(CJ.par) : '') + '.</b>' : '')));
  const seg = cjEl('div', 'cjaSeg');
  [['panneaux', '🚸 Les panneaux'], ['essai', '▶️ Essayer le jeu']].forEach(([k, t]) => {
    const b = cjEl('button', CJ.onglet === k ? 'on' : '', t);
    b.type = 'button';
    b.setAttribute('data-cja-onglet', k);
    b.addEventListener('click', () => { CJ.onglet = k; cjDessiner(corps); });
    seg.appendChild(b);
  });
  corps.appendChild(seg);
  const z = cjEl('div', '');
  corps.appendChild(z);
  if(CJ.onglet === 'essai') cjDessinerEssai(z); else cjDessinerPanneaux(z, corps);
}

/* ---------- 🚸 les panneaux ---------- */
function cjDessinerPanneaux(z, corps){
  const barre = cjEl('div', 'cjaBarre');
  const r = cjEl('input', '');
  r.type = 'search';
  r.id = 'cjaCherche';
  r.placeholder = '🔍 Chercher un panneau…';
  r.value = CJ.cherche;
  barre.appendChild(r);
  if(cjPeutModifier()){
    const ba = cjEl('button', 'btn btn-secondary', '＋ Ajouter un panneau');
    ba.type = 'button';
    ba.addEventListener('click', () => cjEditer(null, () => cjDessiner(corps)));
    barre.appendChild(ba);
  }
  z.appendChild(barre);
  const liste = cjEl('div', '');
  z.appendChild(liste);
  const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const dessiner = () => {
    liste.innerHTML = '';
    const q = norm(CJ.cherche).trim();
    const tous = cjListe().filter(p => !q || norm(p.n + ' ' + p.m).indexOf(q) !== -1);
    const nbMod = cjListe().filter(p => p.modifie || p.ajoute).length;
    liste.appendChild(cjEl('div', 'cjaNote', tous.length + ' panneau' + (tous.length > 1 ? 'x' : '') + (nbMod ? ' · ' + nbMod + ' corrigé' + (nbMod > 1 ? 's' : '') + ' ou ajouté' + (nbMod > 1 ? 's' : '') : '') + '. Touche un panneau pour le corriger.'));
    cjFamilles().forEach(f => {
      const l = tous.filter(p => p.f === f[0]);
      if(!l.length) return;
      liste.appendChild(cjEl('div', 'cjaFam', f[1] + ' ' + cjEch(f[2]) + ' · ' + l.length));
      l.forEach(p => {
        const b = cjEl('button', 'cjaLigne' + (p.cache ? ' cache' : ''),
          '<span class="d">' + cjDessin(p) + '</span><span class="t">' + cjEch(p.n) + '<small>' + cjEch(p.m) + '</small></span>' +
          (p.cache ? '<span class="cjaPuce g">🙈 caché</span>' : '') +
          (p.ajoute ? '<span class="cjaPuce">＋ ajouté</span>' : (p.modifie ? '<span class="cjaPuce">✏️ corrigé</span>' : '')));
        b.type = 'button';
        b.setAttribute('data-cja-p', p.k);
        b.addEventListener('click', () => cjEditer(p.k, () => cjDessiner(corps)));
        liste.appendChild(b);
      });
    });
  };
  r.addEventListener('input', () => { CJ.cherche = r.value; dessiner(); });
  dessiner();
}

/* Une image choisie : réduite ici (320 px), pour rester légère */
function cjReduireImage(fichier){
  return new Promise((ok, ko) => {
    if(!fichier || !/^image\//.test(fichier.type)){ ko(new Error('Ce fichier n’est pas une image.')); return; }
    const lecteur = new FileReader();
    lecteur.onerror = () => ko(new Error('Image illisible.'));
    lecteur.onload = () => {
      const im = new Image();
      im.onerror = () => ko(new Error('Image illisible.'));
      im.onload = () => {
        const max = 320, k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.width * k));
        c.height = Math.max(1, Math.round(im.height * k));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        let d = '';
        try{ d = c.toDataURL('image/webp', 0.9); }catch(e){ d = ''; }
        if(d.indexOf('data:image/webp') !== 0) d = c.toDataURL('image/png');
        if(d.length > 380000){ ko(new Error('Cette image est trop lourde, même réduite.')); return; }
        ok(d);
      };
      im.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

/* La fiche d'un panneau à corriger (cle = null : un panneau à ajouter) */
function cjEditer(cle, apres){
  const peut = cjPeutModifier();
  const tous = cjListe();
  const p = cle ? tous.find(x => x.k === cle) : { k: '', n: '', f: 'danger', s: '', m: '', a: '', p: '', j: '', image: '', cache: false, ajoute: true, neuf: true };
  if(!p) return;
  const base = (window.CodeEC.PANNEAUX || []).find(x => x.k === cle) || null;
  let image = p.image || '';
  const fond = cjEl('div', 'overlay show');
  fond.setAttribute('data-cja-fiche', '1');
  const boite = cjEl('div', 'modal');
  boite.style.cssText = 'max-width:min(560px, 96vw);max-height:92vh;overflow-y:auto;';
  boite.innerHTML = '<h3>' + (p.neuf ? '＋ Ajouter un panneau' : '✏️ ' + cjEch(p.n)) + '</h3>';
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };

  const tete = cjEl('div', 'cjaTete');
  const d = cjEl('div', 'd');
  const montrer = () => { d.innerHTML = window.CodeEC.dessin({ s: p.s, image: image }, Object.assign({}, CJ.images, CJ.neuves)); };
  montrer();
  tete.appendChild(d);
  const bts = cjEl('div', 'b');
  const fi = cjEl('input', '');
  fi.type = 'file';
  fi.accept = 'image/*';
  fi.style.display = 'none';
  fi.id = 'cjaFichier';
  const etat = cjEl('div', 'cjaEtat');
  const dire = (t, rouge) => { etat.style.color = rouge ? 'var(--red)' : 'var(--muted)'; etat.textContent = t; };
  const bi = cjEl('button', 'btn btn-secondary', p.s ? '🖼️ Remplacer le dessin par une image' : '🖼️ Choisir son image');
  bi.type = 'button';
  bi.addEventListener('click', () => fi.click());
  const br = cjEl('button', 'btn btn-secondary', '↩︎ Revenir au dessin');
  br.type = 'button';
  const majBr = () => { br.style.display = (image && p.s) ? '' : 'none'; };
  br.addEventListener('click', () => { image = ''; montrer(); majBr(); });
  fi.addEventListener('change', async () => {
    try{
      dire('⏳ Préparation de l’image…');
      const donnee = await cjReduireImage(fi.files && fi.files[0]);
      const id = 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      CJ.neuves[id] = donnee;
      image = id;
      montrer(); majBr(); dire('');
    }catch(e){ dire('❌ ' + (e.message || e), true); }
    fi.value = '';
  });
  if(peut){ bts.appendChild(bi); bts.appendChild(br); bts.appendChild(fi); }
  bts.appendChild(cjEl('div', 'cjaNote', p.s ? 'Le dessin est fait par l’appli. S’il est faux, mets une photo ou une image du vrai panneau.' : 'Une photo ou une image du panneau, carrée de préférence.'));
  tete.appendChild(bts);
  boite.appendChild(tete);
  majBr();

  const f = cjEl('div', 'cjaForm');
  const champ = (id, lib, val, long) => {
    const l = cjEl('label', '', cjEch(lib));
    l.setAttribute('for', id);
    f.appendChild(l);
    const c = cjEl(long ? 'textarea' : 'input', '');
    if(!long) c.type = 'text';
    c.id = id;
    c.value = val || '';
    c.disabled = !peut;
    f.appendChild(c);
    return c;
  };
  const cNom = champ('cjaNom', 'Son nom', p.n);
  const lf = cjEl('label', '', 'Sa famille'); lf.setAttribute('for', 'cjaFamille'); f.appendChild(lf);
  const cFam = cjEl('select', ''); cFam.id = 'cjaFamille'; cFam.disabled = !peut;
  cjFamilles().forEach(x => { const o = cjEl('option', '', x[1] + ' ' + cjEch(x[2])); o.value = x[0]; if(x[0] === p.f) o.selected = true; cFam.appendChild(o); });
  f.appendChild(cFam);
  const cDit = champ('cjaDit', 'Ce qu’il dit (la phrase du memory et des questions)', p.m, true);
  const cFais = champ('cjaFais', 'Ce que je fais', p.a, true);
  const cPiege = champ('cjaPiege', '🪤 À ne pas confondre (le piège)', p.p, true);
  const lj = cjEl('label', '', 'Son faux jumeau (le panneau montré à côté du piège)'); lj.setAttribute('for', 'cjaJumeau'); f.appendChild(lj);
  const cJum = cjEl('select', ''); cJum.id = 'cjaJumeau'; cJum.disabled = !peut;
  const o0 = cjEl('option', '', '— aucun —'); o0.value = ''; cJum.appendChild(o0);
  tous.filter(x => x.k !== p.k).slice().sort((a, b) => a.n.localeCompare(b.n, 'fr')).forEach(x => { const o = cjEl('option', '', cjEch(x.n)); o.value = x.k; if(x.k === p.j) o.selected = true; cJum.appendChild(o); });
  f.appendChild(cJum);
  const lc = cjEl('label', 'cjaCoche', '<input type="checkbox" id="cjaCache"' + (p.cache ? ' checked' : '') + (peut ? '' : ' disabled') + '> 🙈 Le cacher : il ne sort plus dans le jeu');
  lc.style.marginTop = '14px';
  f.appendChild(lc);
  boite.appendChild(f);
  boite.appendChild(etat);

  const rang = cjEl('div', 'btn-row');
  rang.style.marginTop = '12px';
  const bt = (t, cls, faire) => { const b = cjEl('button', 'btn ' + cls, t); b.type = 'button'; b.addEventListener('click', faire); rang.appendChild(b); return b; };
  bt(peut ? 'Annuler' : 'Fermer', 'btn-secondary', fermer);
  const poser = async (changer) => {
    const avant = JSON.stringify(CJ.contenu);
    try{
      changer();
      dire('⏳ Enregistrement…');
      await cjEnregistrer();
      fermer();
      if(typeof showToast === 'function') showToast('Jeu du code corrigé ✅');
      if(apres) apres();
    }catch(e){
      CJ.contenu = JSON.parse(avant);
      dire('❌ ' + (e.message || e), true);
    }
  };
  if(peut && base && p.modifie){
    bt('↩︎ Tout remettre comme au départ', 'btn-secondary', () => poser(() => { delete CJ.contenu.mod[p.k]; }));
  }
  if(peut && p.ajoute && !p.neuf){
    bt('🗑️ Supprimer', 'btn-secondary', async () => {
      const oui = (typeof confirmer === 'function') ? await confirmer('Supprimer « ' + p.n + ' » du jeu ?', 'Supprimer', true) : true;
      if(oui) poser(() => { CJ.contenu.ajouts = CJ.contenu.ajouts.filter(x => x.cle !== p.k); });
    });
  }
  if(peut){
    const bo = bt('💾 Enregistrer', 'btn-primary', () => {
      const v = { nom: cNom.value.trim(), fam: cFam.value, dit: cDit.value.trim(), fais: cFais.value.trim(), piege: cPiege.value.trim(), jumeau: cJum.value,
                  cache: boite.querySelector('#cjaCache').checked };
      if(!v.nom){ dire('Il lui faut un nom.', true); return; }
      if(!v.dit){ dire('Écris ce qu’il dit : c’est la phrase du memory.', true); return; }
      if(!base && !image){ dire('Choisis son image.', true); return; }
      poser(() => {
        if(base){
          /* seulement ce qui diffère de la base */
          const m = {};
          if(v.nom !== base.n) m.nom = v.nom;
          if(v.fam !== base.f) m.fam = v.fam;
          if(v.dit !== base.m) m.dit = v.dit;
          if(v.fais !== base.a) m.fais = v.fais;
          if(v.piege !== base.p) m.piege = v.piege;
          if(v.jumeau !== (base.j || '')) m.jumeau = v.jumeau;
          if(v.cache) m.cache = 1;
          if(image) m.image = image;
          if(Object.keys(m).length) CJ.contenu.mod[base.k] = m; else delete CJ.contenu.mod[base.k];
        } else {
          const cleN = p.neuf ? ('x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)) : p.k;
          const a = { cle: cleN, nom: v.nom, fam: v.fam, dit: v.dit, fais: v.fais, piege: v.piege, jumeau: v.jumeau, image: image };
          if(v.cache) a.cache = 1;
          const i = CJ.contenu.ajouts.findIndex(x => x.cle === cleN);
          if(i === -1) CJ.contenu.ajouts.push(a); else CJ.contenu.ajouts[i] = a;
        }
      });
    });
    bo.setAttribute('data-cja-enregistrer', '1');
  }
  boite.appendChild(rang);
}

/* ---------- ▶️ essayer le jeu : le vrai, dans un cadre, sans rien garder ---------- */
function cjDessinerEssai(z){
  z.appendChild(cjEl('p', 'cjaNote', 'C’est le jeu tel que l’élève le voit, avec tes corrections. Partie d’essai : rien n’est gardé.'));
  const tel = cjEl('div', 'cjaTel');
  const f = document.createElement('iframe');
  f.className = 'cjaCadre';
  f.title = 'Le jeu du code — partie d’essai';
  f.src = 'eleve.html?essai=code';
  tel.appendChild(f);
  z.appendChild(tel);
  const ecoute = ev => {
    if(!f.isConnected){ window.removeEventListener('message', ecoute); return; }
    if(ev.source !== f.contentWindow || ev.origin !== location.origin) return;
    if(ev.data && ev.data.jvEssaiPret){
      f.contentWindow.postMessage({ cjEssai: { contenu: CJ.contenu, images: CJ.images },
        nom: (typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || 'Équipe',
        clair: document.body.classList.contains('clair') }, location.origin);
    }
  };
  window.addEventListener('message', ecoute);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-code-jeu.js'] = true;
