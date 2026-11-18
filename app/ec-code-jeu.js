/* Déployé le 18/11/2026 à 12:18 — v1464 */
/* ============================================================
   ec-code-jeu.js — v1464
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

   🪤 v1463 — LES TROIS AUTRES JEUX ET LES CONSEILS. Mêmes règles, un
   onglet chacun : 🪤 les pièges (l'affirmation, vrai ou faux,
   l'explication), 🔍 la loupe (la question, avec les mots qui changent
   tout entre accolades : « Je {dois} allumer… »), 🔢 les chiffres (la
   question, trois choix, le bon, l'astuce), 📝 les conseils pour
   l'examen (un par ligne). Chaque carte se corrige, se cache, s'ajoute,
   se supprime, se remet comme au départ. Les cartes de base viennent du
   « MÉMO TESTS DE CODE » de l'école : si j'en ai mal recopié une,
   David la corrige ici.

   👀 🚦 v1464 — LES IMAGES À TOUCHER. « L'œil du conducteur » et « Qui
   passe ? » sont des dessins faits par l'appli (David : « je te laisse
   chercher ou faire des schémas »). Deux onglets de plus, où chaque
   image se corrige : la remplacer par une photo (réduite ici à 900 px),
   poser et déplacer les ronds que l'élève doit toucher (on choisit un
   rond dans la liste, puis on touche l'image), les agrandir, les
   renommer, changer leur ordre — pour « Qui passe ? », l'ordre de la
   liste EST l'ordre de passage —, corriger les explications, cacher,
   ajouter une image, tout remettre comme au départ. Les ronds se
   mesurent en pour cent de l'image : ils tiennent sur un dessin comme
   sur une photo, à toutes les tailles d'écran.

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
    '.cjaForm textarea{min-height:76px;padding:9px 12px;border:1px solid var(--line);border-radius:12px;background:var(--navy-deep);color:var(--cream);line-height:1.4;resize:vertical}' +
    '.cjaCoche{display:flex !important;align-items:center;gap:9px;font-size:14px !important;color:var(--cream) !important;cursor:pointer}' +
    '.cjaCoche input{width:19px;height:19px;flex:none;margin:0}' +
    '.cjaEtat{font-size:13px;min-height:18px;margin-top:8px}' +
    '.cjaTel{display:flex;justify-content:center}' +
    /* 🪤 v1463 — les cartes des trois autres jeux */
    '.cjaLigne .ic{flex:0 0 30px;width:30px;text-align:center;font-size:20px;line-height:1}' +
    '.cjaLigne.carte{align-items:flex-start}.cjaLigne.carte .t{font-weight:600;line-height:1.35}.cjaLigne.carte .t small{white-space:normal;margin-top:3px;line-height:1.35}' +
    '.cjaMot{background:#B6FF0E;color:#14161B;border-radius:5px;padding:0 4px;font-weight:800}' +
    '.cjaApercu{margin-top:6px;padding:9px 12px;border-radius:12px;border:1px dashed var(--line);font-size:14.5px;line-height:1.7;color:var(--cream)}' +
    '.cjaChoix{display:flex;gap:9px;align-items:center;margin:0 0 6px}' +
    '.cjaChoix input[type=radio]{width:19px;height:19px;flex:none;margin:0}' +
    '.cjaChoix input[type=text]{flex:1;min-width:0}' +
    '.cjaForm textarea.haut{min-height:300px}' +
    /* 👀 🚦 v1464 — les images à toucher */
    '.cjaLigne .d.sc{flex:0 0 92px;width:92px;height:auto;border-radius:8px;overflow:hidden;line-height:0}.cjaLigne .d.sc svg,.cjaLigne .d.sc img{width:100%;height:auto}' +
    '.cjaScene{position:relative;border-radius:14px;overflow:hidden;border:1px solid var(--line);line-height:0;cursor:crosshair;background:#DCEBF5;-webkit-user-select:none;user-select:none;touch-action:manipulation}' +
    '.cjaScene svg,.cjaScene img{display:block;width:100%;height:auto;pointer-events:none}' +
    '.cjaScene .cjRond{position:absolute;height:0;border-radius:50%;box-sizing:content-box;pointer-events:none;box-shadow:0 0 0 2.5px #B6FF0E,0 0 0 4.5px rgba(0,0,0,.45)}' +
    '.cjaScene .cjRond.actif{box-shadow:0 0 0 3.5px #FF8A00,0 0 0 6px rgba(0,0,0,.55)}' +
    '.cjaScene .cjRond i{position:absolute;right:-7px;top:-7px;width:21px;height:21px;border-radius:50%;background:#B6FF0E;color:#14161B;font-style:normal;font-size:12px;font-weight:900;line-height:21px;text-align:center;box-shadow:0 0 0 1.5px #14161B}' +
    '.cjaScene .cjRond.actif i{background:#FF8A00}' +
    '.cjaSceneVide{padding:34px 12px;text-align:center;font-size:13.5px;line-height:1.45;color:var(--muted);border:1px dashed var(--line);border-radius:14px}' +
    '.cjaImgBtns{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 2px}.cjaImgBtns .btn{width:auto;margin:0}' +
    '.cjaRondL{border:1px solid var(--line);border-radius:12px;padding:8px;margin:0 0 6px}' +
    '.cjaRondL.actif{border-color:#FF8A00;box-shadow:0 0 0 1px #FF8A00}' +
    '.cjaRondL .h{display:flex;gap:6px;align-items:center;flex-wrap:wrap}' +
    '.cjaRondL .h input[type=text]{flex:1 1 calc(100% - 44px);min-width:0;margin:0}' +
    '.cjaRondL .h button{flex:none;width:34px;height:34px;min-height:0;margin:0;padding:0;border-radius:10px;border:1px solid var(--line);background:var(--navy-deep);color:var(--cream);font:inherit;font-weight:800;font-size:14px;cursor:pointer}' +
    '.cjaRondL .h button.num{border-radius:50%;background:#B6FF0E;color:#14161B;border-color:#14161B}' +
    '.cjaRondL.actif .h button.num{background:#FF8A00}' +
    '.cjaRondL .h button:disabled{opacity:.35;cursor:default}' +
    '.cjaRondL textarea{min-height:46px !important;margin-top:6px !important}' +
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
  corps.appendChild(cjEl('p', 'cjaNote', 'Le jeu « 🚦 Mon code » s’ouvre tout seul dans l’App des élèves qui font le code avec nous (dans le dossier d’un élève, le bloc « 🚦 Le jeu du code » l’ouvre ou le ferme). Il est pré-rempli : ici, tu corriges ce qui ne va pas (un texte, un dessin, un panneau, un piège, une question, un chiffre, une image, un conseil — en trop, faux, ou qui manque). Les élèves voient la correction à leur prochaine ouverture.' +
    (CJ.majLe ? ' <b>Dernière correction : ' + cjEch(CJ.majLe) + (CJ.par ? ', par ' + cjEch(CJ.par) : '') + '.</b>' : '')));
  const seg = cjEl('div', 'cjaSeg');
  [['panneaux', '🚸 Les panneaux'], ['pieges', CJ_CARTES.pieges.onglet], ['loupe', CJ_CARTES.loupe.onglet], ['chiffres', CJ_CARTES.chiffres.onglet],
   ['oeil', CJ_CARTES.oeil.onglet], ['passe', CJ_CARTES.passe.onglet],
   ['conseils', '📝 Les conseils'], ['essai', '▶️ Essayer le jeu']].forEach(([k, t]) => {
    const b = cjEl('button', CJ.onglet === k ? 'on' : '', t);
    b.type = 'button';
    b.setAttribute('data-cja-onglet', k);
    b.addEventListener('click', () => { CJ.onglet = k; CJ.cherche = ''; cjDessiner(corps); });
    seg.appendChild(b);
  });
  corps.appendChild(seg);
  const z = cjEl('div', '');
  corps.appendChild(z);
  if(CJ.onglet === 'essai') cjDessinerEssai(z);
  else if(CJ_CARTES[CJ.onglet] && CJ_CARTES[CJ.onglet].scene) cjDessinerScenes(z, corps, CJ.onglet);
  else if(CJ_CARTES[CJ.onglet]) cjDessinerCartes(z, corps, CJ.onglet);
  else if(CJ.onglet === 'conseils') cjDessinerConseils(z, corps);
  else cjDessinerPanneaux(z, corps);
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

/* Une image choisie : réduite ici, pour rester légère — 320 px pour un
   panneau, 900 px pour la photo d'une scène (👀 v1464), en JPEG si le
   navigateur ne sait pas faire de WebP (une photo en PNG pèserait trop). */
function cjReduireImage(fichier, grand){
  return new Promise((ok, ko) => {
    if(!fichier || !/^image\//.test(fichier.type)){ ko(new Error('Ce fichier n’est pas une image.')); return; }
    const lecteur = new FileReader();
    lecteur.onerror = () => ko(new Error('Image illisible.'));
    lecteur.onload = () => {
      const im = new Image();
      im.onerror = () => ko(new Error('Image illisible.'));
      im.onload = () => {
        const essais = grand ? [[900, 0.82], [720, 0.72], [560, 0.62]] : [[320, 0.9]];
        for(const [max, q] of essais){
          const k = Math.min(1, max / Math.max(im.width, im.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width * k));
          c.height = Math.max(1, Math.round(im.height * k));
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          let d = '';
          try{ d = c.toDataURL('image/webp', q); }catch(e){ d = ''; }
          if(d.indexOf('data:image/webp') !== 0) d = grand ? c.toDataURL('image/jpeg', q) : c.toDataURL('image/png');
          if(d.length <= 380000){ ok(d); return; }
        }
        ko(new Error('Cette image est trop lourde, même réduite.'));
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

/* ============================================================
   🪤 🔍 🔢 v1463 — LES CARTES DES TROIS AUTRES JEUX
   La base est dans code-commun.js (CodeEC.TYPES[type].base) ; ici,
   CJ.contenu.cartes[type] = { mod: { clé: écarts }, ajouts: [cartes] }.
   ============================================================ */
const CJ_CARTES = {
  pieges: { onglet: '🪤 Les pièges', ajouter: '＋ Ajouter un piège', cherche: '🔍 Chercher un piège…', une: 'piège',
            aide: 'Une affirmation, l’élève répond vrai ou faux, puis lit l’explication.' },
  loupe: { onglet: '🔍 La loupe', ajouter: '＋ Ajouter une question', cherche: '🔍 Chercher une question…', une: 'question',
           aide: 'L’élève touche les mots qui changent tout (en vert ici) avant de lire l’explication.' },
  chiffres: { onglet: '🔢 Les chiffres', ajouter: '＋ Ajouter un chiffre', cherche: '🔍 Chercher un chiffre…', une: 'question',
              aide: 'Une question, trois choix, puis l’astuce pour retenir le bon.' },
  /* 👀 🚦 v1464 — les images à toucher (scene) : min = le nombre de ronds qu'il faut */
  oeil: { onglet: '👀 L’œil', scene: true, min: 1, ajouter: '＋ Ajouter une image', cherche: '🔍 Chercher une image…',
          ronds: 'Les indices à toucher', unRond: 'indice', plusRond: '＋ Ajouter un indice', fin: 'La conclusion, montrée à la fin (« Donc : … »)',
          aide: 'Une image : l’élève touche tout ce qu’un conducteur doit voir. Chaque rond est un indice.' },
  passe: { onglet: '🚦 Qui passe ?', scene: true, min: 2, ajouter: '＋ Ajouter un carrefour', cherche: '🔍 Chercher un carrefour…',
           ronds: 'Les véhicules, dans l’ordre où ils passent', unRond: 'véhicule', plusRond: '＋ Ajouter un véhicule', fin: 'Pourquoi, montré à la fin',
           aide: 'Un carrefour vu d’en haut : l’élève touche les véhicules dans l’ordre où ils passent. L’ordre de la liste est l’ordre de passage.' }
};
function cjCartes(type){ return window.CodeEC.fusionnerCartes(type, CJ.contenu); }
function cjBloc(type){
  CJ.contenu.cartes = CJ.contenu.cartes || {};
  const b = CJ.contenu.cartes[type] = CJ.contenu.cartes[type] || { mod: {}, ajouts: [] };
  b.mod = b.mod || {};
  b.ajouts = b.ajouts || [];
  return b;
}
function cjSurligner(q){ return cjEch(q).replace(/\{([^{}]+)\}/g, '<b class="cjaMot">$1</b>'); }

function cjDessinerCartes(z, corps, type){
  const K = CJ_CARTES[type];
  const barre = cjEl('div', 'cjaBarre');
  const r = cjEl('input', '');
  r.type = 'search';
  r.id = 'cjaCherche';
  r.placeholder = K.cherche;
  r.value = CJ.cherche;
  barre.appendChild(r);
  if(cjPeutModifier()){
    const ba = cjEl('button', 'btn btn-secondary', K.ajouter);
    ba.type = 'button';
    ba.setAttribute('data-cja-ajouter', type);
    ba.addEventListener('click', () => cjEditerCarte(type, null, () => cjDessiner(corps)));
    barre.appendChild(ba);
  }
  z.appendChild(barre);
  const liste = cjEl('div', '');
  z.appendChild(liste);
  const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const dessiner = () => {
    liste.innerHTML = '';
    const q = norm(CJ.cherche).trim();
    const toutes = cjCartes(type);
    const vues = toutes.filter(x => !q || norm((x.t || x.q) + ' ' + x.e).indexOf(q) !== -1);
    const nbMod = toutes.filter(x => x.modifie || x.ajoute).length;
    liste.appendChild(cjEl('div', 'cjaNote', K.aide + ' ' + vues.length + ' carte' + (vues.length > 1 ? 's' : '') +
      (nbMod ? ' · ' + nbMod + ' corrigée' + (nbMod > 1 ? 's' : '') + ' ou ajoutée' + (nbMod > 1 ? 's' : '') : '') + '. Touche une carte pour la corriger.'));
    vues.forEach(x => {
      const ic = type === 'pieges' ? (x.v ? '✅' : '❌') : (type === 'loupe' ? '🔍' : '🔢');
      const sous = (type === 'pieges' ? (x.v ? 'Vrai · ' : 'Faux · ') : (type === 'chiffres' ? 'Réponse : ' + cjEch((x.c || [])[x.b] || '?') + ' · ' : '')) + cjEch(x.e);
      const b = cjEl('button', 'cjaLigne carte' + (x.cache ? ' cache' : ''),
        '<span class="ic">' + ic + '</span><span class="t">' + (type === 'pieges' ? cjEch(x.t) : cjSurligner(x.q)) + '<small>' + sous + '</small></span>' +
        (x.cache ? '<span class="cjaPuce g">🙈 cachée</span>' : '') +
        (x.ajoute ? '<span class="cjaPuce">＋ ajoutée</span>' : (x.modifie ? '<span class="cjaPuce">✏️ corrigée</span>' : '')));
      b.type = 'button';
      b.setAttribute('data-cja-c', x.k);
      b.addEventListener('click', () => cjEditerCarte(type, x.k, () => cjDessiner(corps)));
      liste.appendChild(b);
    });
    if(!vues.length) liste.appendChild(cjEl('div', 'empty', 'Aucune carte.'));
  };
  r.addEventListener('input', () => { CJ.cherche = r.value; dessiner(); });
  dessiner();
}

/* Une carte à corriger (cle = null : une carte à ajouter) */
function cjEditerCarte(type, cle, apres){
  const peut = cjPeutModifier(), K = CJ_CARTES[type];
  const x = cle ? cjCartes(type).find(y => y.k === cle) : { k: '', t: '', v: 0, q: '', c: ['', '', ''], b: 0, e: '', cache: false, ajoute: true, neuf: true };
  if(!x) return;
  const base = cle ? ((window.CodeEC.TYPES[type].base || []).find(y => y.k === cle) || null) : null;
  const fond = cjEl('div', 'overlay show');
  fond.setAttribute('data-cja-fiche', '1');
  const boite = cjEl('div', 'modal');
  boite.style.cssText = 'max-width:min(560px, 96vw);max-height:92vh;overflow-y:auto;';
  boite.innerHTML = '<h3>' + (x.neuf ? K.ajouter : '✏️ ' + K.onglet) + '</h3>';
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  const etat = cjEl('div', 'cjaEtat');
  const dire = (t, rouge) => { etat.style.color = rouge ? 'var(--red)' : 'var(--muted)'; etat.textContent = t; };

  const f = cjEl('div', 'cjaForm');
  const champ = (id, lib, val) => {
    const l = cjEl('label', '', cjEch(lib));
    l.setAttribute('for', id);
    f.appendChild(l);
    const c = cjEl('textarea', '');
    c.id = id;
    c.value = val || '';
    c.disabled = !peut;
    f.appendChild(c);
    return c;
  };
  let cTexte, cVrai = null, radios = [], choix = [];
  if(type === 'pieges'){
    cTexte = champ('cjaTexte', 'L’affirmation que l’élève lit', x.t);
    const lv = cjEl('label', '', 'La bonne réponse'); lv.setAttribute('for', 'cjaVrai'); f.appendChild(lv);
    cVrai = cjEl('select', ''); cVrai.id = 'cjaVrai'; cVrai.disabled = !peut;
    [['0', '❌ Faux'], ['1', '✅ Vrai']].forEach(o => { const e = cjEl('option', '', o[1]); e.value = o[0]; if(String(x.v ? 1 : 0) === o[0]) e.selected = true; cVrai.appendChild(e); });
    f.appendChild(cVrai);
  } else if(type === 'loupe'){
    cTexte = champ('cjaTexte', 'La question. Mets entre accolades les mots qui changent tout : Je {dois} allumer…', x.q);
    const ap = cjEl('div', 'cjaApercu');
    ap.id = 'cjaApercu';
    const voir = () => { ap.innerHTML = cTexte.value.trim() ? cjSurligner(cTexte.value) : '<span style="color:var(--muted)">Ce que l’élève verra, les mots à toucher en vert.</span>'; };
    cTexte.addEventListener('input', voir);
    voir();
    f.appendChild(ap);
  } else {
    cTexte = champ('cjaTexte', 'La question', x.q);
    f.appendChild(cjEl('label', '', 'Les trois choix — coche le bon'));
    [0, 1, 2].forEach(i => {
      const l = cjEl('div', 'cjaChoix');
      const ra = cjEl('input', ''); ra.type = 'radio'; ra.name = 'cjaBon'; ra.value = String(i); ra.checked = Number(x.b) === i; ra.disabled = !peut;
      ra.setAttribute('aria-label', 'Le choix ' + (i + 1) + ' est le bon');
      const tx = cjEl('input', ''); tx.type = 'text'; tx.id = 'cjaChoix' + i; tx.value = (x.c || [])[i] || ''; tx.disabled = !peut; tx.maxLength = 40;
      tx.setAttribute('aria-label', 'Choix ' + (i + 1));
      l.appendChild(ra); l.appendChild(tx);
      radios.push(ra); choix.push(tx);
      f.appendChild(l);
    });
  }
  const cExpl = champ('cjaExpl', type === 'chiffres' ? 'L’astuce pour le retenir, montrée après la réponse' : 'L’explication, montrée après la réponse', x.e);
  const lc = cjEl('label', 'cjaCoche', '<input type="checkbox" id="cjaCache"' + (x.cache ? ' checked' : '') + (peut ? '' : ' disabled') + '> 🙈 La cacher : elle ne sort plus dans le jeu');
  lc.style.marginTop = '14px';
  f.appendChild(lc);
  boite.appendChild(f);
  boite.appendChild(etat);
  /* une remarque (« il manque… ») s'efface dès qu'on retouche la carte */
  f.addEventListener('input', () => dire(''));

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
  if(peut && base && x.modifie){
    bt('↩︎ Tout remettre comme au départ', 'btn-secondary', () => poser(() => { delete cjBloc(type).mod[x.k]; }));
  }
  if(peut && x.ajoute && !x.neuf){
    bt('🗑️ Supprimer', 'btn-secondary', async () => {
      const oui = (typeof confirmer === 'function') ? await confirmer('Supprimer cette carte du jeu ?', 'Supprimer', true) : true;
      if(oui) poser(() => { const b = cjBloc(type); b.ajouts = b.ajouts.filter(y => y.cle !== x.k); });
    });
  }
  if(peut){
    const bo = bt('💾 Enregistrer', 'btn-primary', () => {
      const propre = t => String(t || '').replace(/\s+/g, ' ').trim();
      const v = { texte: propre(cTexte.value), e: propre(cExpl.value), cache: boite.querySelector('#cjaCache').checked };
      if(!v.texte){ dire(type === 'pieges' ? 'Écris l’affirmation.' : 'Écris la question.', true); return; }
      if(type === 'loupe'){
        if(!/\{[^{}]+\}/.test(v.texte)){ dire('Mets au moins un mot entre accolades : Je {dois} allumer…', true); return; }
        if(/[{}]/.test(v.texte.replace(/\{[^{}]+\}/g, ''))){ dire('Une accolade est restée seule : chaque { doit avoir son }.', true); return; }
      }
      if(type === 'chiffres'){
        v.c = choix.map(c => propre(c.value));
        v.b = radios.findIndex(r => r.checked);
        if(v.c.some(c => !c)){ dire('Il faut les trois choix.', true); return; }
        if(v.c[0] === v.c[1] || v.c[0] === v.c[2] || v.c[1] === v.c[2]){ dire('Deux choix sont pareils.', true); return; }
        if(v.b < 0){ dire('Coche le bon choix.', true); return; }
      }
      if(type === 'pieges') v.v = cVrai.value === '1' ? 1 : 0;
      if(!v.e){ dire('Écris l’explication : c’est elle qui apprend quelque chose à l’élève.', true); return; }
      poser(() => {
        const bloc = cjBloc(type);
        if(base){
          /* seulement ce qui diffère de la base */
          const m = {};
          if(type === 'pieges'){
            if(v.texte !== base.t) m.t = v.texte;
            if(v.v !== (base.v ? 1 : 0)) m.v = v.v;
          } else if(v.texte !== base.q) m.q = v.texte;
          if(type === 'chiffres'){
            if(v.c.join('\n') !== base.c.join('\n')) m.c = v.c;
            if(v.b !== base.b) m.b = v.b;
          }
          if(v.e !== base.e) m.e = v.e;
          if(v.cache) m.cache = 1;
          if(Object.keys(m).length) bloc.mod[base.k] = m; else delete bloc.mod[base.k];
        } else {
          const cleN = x.neuf ? ('y' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)) : x.k;
          const a = { cle: cleN, e: v.e };
          if(type === 'pieges'){ a.t = v.texte; a.v = v.v; } else a.q = v.texte;
          if(type === 'chiffres'){ a.c = v.c; a.b = v.b; }
          if(v.cache) a.cache = 1;
          const i = bloc.ajouts.findIndex(y => y.cle === cleN);
          if(i === -1) bloc.ajouts.push(a); else bloc.ajouts[i] = a;
        }
      });
    });
    bo.setAttribute('data-cja-enregistrer', '1');
  }
  boite.appendChild(rang);
}

/* ============================================================
   👀 🚦 v1464 — LES IMAGES À TOUCHER
   ============================================================ */
function cjImagesDuMoment(){ return Object.assign({}, CJ.images, CJ.neuves); }
function cjDessinerScenes(z, corps, type){
  const K = CJ_CARTES[type];
  const barre = cjEl('div', 'cjaBarre');
  const r = cjEl('input', '');
  r.type = 'search';
  r.id = 'cjaCherche';
  r.placeholder = K.cherche;
  r.value = CJ.cherche;
  barre.appendChild(r);
  if(cjPeutModifier()){
    const ba = cjEl('button', 'btn btn-secondary', K.ajouter);
    ba.type = 'button';
    ba.setAttribute('data-cja-ajouter', type);
    ba.addEventListener('click', () => cjEditerScene(type, null, () => cjDessiner(corps)));
    barre.appendChild(ba);
  }
  z.appendChild(barre);
  const liste = cjEl('div', '');
  z.appendChild(liste);
  const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const dessiner = () => {
    liste.innerHTML = '';
    const q = norm(CJ.cherche).trim();
    const toutes = cjCartes(type);
    const vues = toutes.filter(x => !q || norm(x.n + ' ' + x.q + ' ' + x.e + ' ' + x.z.map(y => y.t + ' ' + y.e).join(' ')).indexOf(q) !== -1);
    const nbMod = toutes.filter(x => x.modifie || x.ajoute).length;
    liste.appendChild(cjEl('div', 'cjaNote', K.aide + ' ' + vues.length + ' image' + (vues.length > 1 ? 's' : '') +
      (nbMod ? ' · ' + nbMod + ' corrigée' + (nbMod > 1 ? 's' : '') + ' ou ajoutée' + (nbMod > 1 ? 's' : '') : '') + '. Touche une image pour la corriger.'));
    vues.forEach(x => {
      const b = cjEl('button', 'cjaLigne carte' + (x.cache ? ' cache' : ''),
        '<span class="d sc">' + window.CodeEC.imageScene(x, CJ.images) + '</span><span class="t">' + cjEch(x.n) +
        '<small>' + x.z.length + ' ' + K.unRond + (x.z.length > 1 ? 's' : '') + ' : ' + cjEch(x.z.map(y => y.t).join(' · ')) + '</small></span>' +
        (x.cache ? '<span class="cjaPuce g">🙈 cachée</span>' : '') +
        (x.ajoute ? '<span class="cjaPuce">＋ ajoutée</span>' : (x.modifie ? '<span class="cjaPuce">✏️ corrigée</span>' : '')));
      b.type = 'button';
      b.setAttribute('data-cja-c', x.k);
      b.addEventListener('click', () => cjEditerScene(type, x.k, () => cjDessiner(corps)));
      liste.appendChild(b);
    });
    if(!vues.length) liste.appendChild(cjEl('div', 'empty', 'Aucune image.'));
  };
  r.addEventListener('input', () => { CJ.cherche = r.value; dessiner(); });
  dessiner();
}

/* Une image à corriger (cle = null : une image à ajouter) */
function cjEditerScene(type, cle, apres){
  const peut = cjPeutModifier(), K = CJ_CARTES[type], oeil = type === 'oeil';
  const x = cle ? cjCartes(type).find(y => y.k === cle) : { k: '', n: '', q: '', e: '', s: '', vb: '', image: '', z: [], cache: false, ajoute: true, neuf: true };
  if(!x) return;
  const base = cle ? ((window.CodeEC.TYPES[type].base || []).find(y => y.k === cle) || null) : null;
  let image = x.image || '';
  let ronds = x.z.map(r => ({ x: r.x, y: r.y, r: r.r, t: r.t, e: r.e || '' }));
  let actif = ronds.length ? 0 : -1;
  const fond = cjEl('div', 'overlay show');
  fond.setAttribute('data-cja-fiche', '1');
  const boite = cjEl('div', 'modal');
  boite.style.cssText = 'max-width:min(620px, 96vw);max-height:92vh;overflow-y:auto;';
  boite.innerHTML = '<h3>' + (x.neuf ? K.ajouter : '✏️ ' + cjEch(x.n)) + '</h3>';
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  const etat = cjEl('div', 'cjaEtat');
  const dire = (t, rouge) => { etat.style.color = rouge ? 'var(--red)' : 'var(--muted)'; etat.textContent = t; };

  /* ── l'image et ses ronds ── */
  const scene = cjEl('div', '');
  boite.appendChild(scene);
  const aide = cjEl('p', 'cjaNote', '');
  aide.style.margin = '6px 0 0';
  boite.appendChild(aide);
  const dessinerScene = () => {
    const html = window.CodeEC.imageScene({ s: x.s, vb: x.vb, image: image }, cjImagesDuMoment());
    if(!html){
      scene.className = 'cjaSceneVide';
      scene.textContent = 'Choisis d’abord une photo : tu poseras les ronds dessus.';
      aide.textContent = '';
      return;
    }
    scene.className = 'cjaScene';
    scene.id = 'cjaScene';
    scene.innerHTML = html + ronds.map((r, i) => window.CodeEC.rond(r, i + 1, i === actif ? 'actif' : '')).join('');
    aide.textContent = !peut ? '' : (actif === -1 ? 'Ajoute un ' + K.unRond + ' : son rond se pose au milieu, puis touche l’image là où il doit aller.'
      : 'Touche l’image pour poser le rond n° ' + (actif + 1) + ' (en orange). Pour en déplacer un autre, touche d’abord son numéro dans la liste.');
  };
  scene.addEventListener('click', ev => {
    if(!peut || actif === -1 || scene.className !== 'cjaScene') return;
    const b = scene.getBoundingClientRect();
    ronds[actif].x = Math.round(Math.min(100, Math.max(0, (ev.clientX - b.left) / b.width * 100)) * 10) / 10;
    ronds[actif].y = Math.round(Math.min(100, Math.max(0, (ev.clientY - b.top) / b.height * 100)) * 10) / 10;
    dire('');
    dessinerScene();
  });

  /* ── la photo à la place du dessin ── */
  const fi = cjEl('input', '');
  fi.type = 'file';
  fi.accept = 'image/*';
  fi.style.display = 'none';
  fi.id = 'cjaFichier';
  const bts = cjEl('div', 'cjaImgBtns');
  const bi = cjEl('button', 'btn btn-secondary', x.s ? '🖼️ Remplacer le dessin par une photo' : '🖼️ Choisir la photo');
  bi.type = 'button';
  bi.addEventListener('click', () => fi.click());
  const br = cjEl('button', 'btn btn-secondary', '↩︎ Revenir au dessin');
  br.type = 'button';
  const majBr = () => { br.style.display = (image && x.s) ? '' : 'none'; };
  br.addEventListener('click', () => { image = ''; majBr(); dessinerScene(); });
  fi.addEventListener('change', async () => {
    try{
      dire('⏳ Préparation de la photo…');
      const donnee = await cjReduireImage(fi.files && fi.files[0], true);
      const id = 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      CJ.neuves[id] = donnee;
      image = id;
      majBr(); dessinerScene();
      dire(ronds.length ? 'Photo posée : replace maintenant les ronds dessus.' : '');
    }catch(e){ dire('❌ ' + (e.message || e), true); }
    fi.value = '';
  });
  if(peut){ bts.appendChild(bi); bts.appendChild(br); bts.appendChild(fi); boite.appendChild(bts); }
  majBr();

  /* ── les textes ── */
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
  const cTitre = champ('cjaTitre', oeil ? 'Le titre de l’image' : 'Le titre (la situation : « Je suis au stop »)', x.n);
  const cConsigne = oeil ? null : champ('cjaConsigne', 'La consigne (qui va où)', x.q || 'Chacun va tout droit. Touche les véhicules dans l’ordre où ils passent.', true);
  f.appendChild(cjEl('label', '', cjEch(K.ronds)));
  const zR = cjEl('div', '');
  zR.id = 'cjaRonds';
  f.appendChild(zR);
  /* ce qui est écrit dans la liste revient dans « ronds » avant de la redessiner */
  const lire = () => {
    zR.querySelectorAll('.cjaRondL').forEach(l => {
      const r = ronds[Number(l.dataset.i)];
      if(!r) return;
      r.t = l.querySelector('input').value;
      const e = l.querySelector('textarea');
      if(e) r.e = e.value;
    });
  };
  const dessinerRonds = () => {
    zR.innerHTML = '';
    ronds.forEach((r, i) => {
      const l = cjEl('div', 'cjaRondL' + (i === actif ? ' actif' : ''));
      l.dataset.i = i;
      const h = cjEl('div', 'h');
      const bouton = (t, titre, cls, faire, eteint) => {
        const b = cjEl('button', cls || '', t);
        b.type = 'button';
        b.title = titre;
        b.setAttribute('aria-label', titre);
        b.disabled = !peut || !!eteint;
        b.addEventListener('click', () => { lire(); faire(); dessinerRonds(); dessinerScene(); });
        h.appendChild(b);
        return b;
      };
      bouton(String(i + 1), 'Choisir le rond n° ' + (i + 1) + ' pour le poser sur l’image', 'num', () => { actif = i; });
      const nom = cjEl('input', '');
      nom.type = 'text';
      nom.value = r.t;
      nom.disabled = !peut;
      nom.maxLength = 120;
      nom.placeholder = oeil ? 'Au loin : le panneau 50' : 'La voiture rouge';
      nom.setAttribute('aria-label', 'Le nom du rond n° ' + (i + 1));
      nom.addEventListener('focus', () => { if(actif !== i){ lire(); actif = i; zR.querySelectorAll('.cjaRondL').forEach(y => y.classList.toggle('actif', Number(y.dataset.i) === i)); dessinerScene(); } });
      h.appendChild(nom);
      bouton('↑', 'Le monter dans la liste', '', () => { ronds.splice(i - 1, 0, ronds.splice(i, 1)[0]); actif = i - 1; }, i === 0);
      bouton('↓', 'Le descendre dans la liste', '', () => { ronds.splice(i + 1, 0, ronds.splice(i, 1)[0]); actif = i + 1; }, i === ronds.length - 1);
      bouton('−', 'Rond plus petit', '', () => { r.r = Math.max(2, Math.round((r.r - 1) * 10) / 10); actif = i; }, r.r <= 2);
      bouton('＋', 'Rond plus grand', '', () => { r.r = Math.min(40, Math.round((r.r + 1) * 10) / 10); actif = i; }, r.r >= 40);
      bouton('🗑', 'Enlever ce rond', '', () => { ronds.splice(i, 1); actif = ronds.length ? Math.min(i, ronds.length - 1) : -1; });
      l.appendChild(h);
      if(oeil){
        const e = cjEl('textarea', '');
        e.value = r.e;
        e.disabled = !peut;
        e.placeholder = 'Ce que cet indice m’apprend';
        e.setAttribute('aria-label', 'L’explication du rond n° ' + (i + 1));
        l.appendChild(e);
      }
      zR.appendChild(l);
    });
    if(peut && ronds.length < 8){
      const ba = cjEl('button', 'btn btn-secondary', K.plusRond);
      ba.type = 'button';
      ba.style.cssText = 'width:auto;margin:2px 0 0;';
      ba.setAttribute('data-cja-plus-rond', '1');
      ba.addEventListener('click', () => { lire(); ronds.push({ x: 50, y: 50, r: oeil ? 6 : 9, t: '', e: '' }); actif = ronds.length - 1; dessinerRonds(); dessinerScene(); });
      zR.appendChild(ba);
    }
  };
  const cExpl = champ('cjaExpl', K.fin, x.e, true);
  const lc = cjEl('label', 'cjaCoche', '<input type="checkbox" id="cjaCache"' + (x.cache ? ' checked' : '') + (peut ? '' : ' disabled') + '> 🙈 La cacher : elle ne sort plus dans le jeu');
  lc.style.marginTop = '14px';
  f.appendChild(lc);
  boite.appendChild(f);
  boite.appendChild(etat);
  f.addEventListener('input', () => dire(''));
  dessinerRonds();
  dessinerScene();

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
  if(peut && base && x.modifie){
    bt('↩︎ Tout remettre comme au départ', 'btn-secondary', () => poser(() => { delete cjBloc(type).mod[x.k]; }));
  }
  if(peut && x.ajoute && !x.neuf){
    bt('🗑️ Supprimer', 'btn-secondary', async () => {
      const oui = (typeof confirmer === 'function') ? await confirmer('Supprimer « ' + x.n + ' » du jeu ?', 'Supprimer', true) : true;
      if(oui) poser(() => { const b = cjBloc(type); b.ajouts = b.ajouts.filter(y => y.cle !== x.k); });
    });
  }
  if(peut){
    const bo = bt('💾 Enregistrer', 'btn-primary', () => {
      lire();
      const propre = t => String(t || '').replace(/\s+/g, ' ').trim();
      const v = { n: propre(cTitre.value), q: cConsigne ? propre(cConsigne.value) : '', e: propre(cExpl.value), cache: boite.querySelector('#cjaCache').checked };
      const z = ronds.map(r => oeil ? { x: r.x, y: r.y, r: r.r, t: propre(r.t), e: propre(r.e) } : { x: r.x, y: r.y, r: r.r, t: propre(r.t) });
      if(!v.n){ dire('Il lui faut un titre.', true); return; }
      if(!base && !image){ dire('Choisis sa photo.', true); return; }
      if(z.length < K.min){ dire(oeil ? 'Il faut au moins un indice.' : 'Il faut au moins deux véhicules.', true); return; }
      const sansNom = z.findIndex(r => !r.t);
      if(sansNom !== -1){ dire('Le rond n° ' + (sansNom + 1) + ' n’a pas de nom.', true); return; }
      if(oeil){
        const sansExpl = z.findIndex(r => !r.e);
        if(sansExpl !== -1){ dire('Écris l’explication du rond n° ' + (sansExpl + 1) + '.', true); return; }
      }
      if(!v.e){ dire(oeil ? 'Écris la conclusion : ce que le conducteur fait.' : 'Écris pourquoi ils passent dans cet ordre.', true); return; }
      poser(() => {
        const bloc = cjBloc(type);
        if(base){
          /* seulement ce qui diffère de la base */
          const pareil = r => oeil ? { x: r.x, y: r.y, r: r.r, t: r.t, e: r.e || '' } : { x: r.x, y: r.y, r: r.r, t: r.t };
          const m = {};
          if(v.n !== base.n) m.n = v.n;
          if(!oeil && v.q !== (base.q || '')) m.q = v.q;
          if(v.e !== base.e) m.e = v.e;
          if(JSON.stringify(z) !== JSON.stringify(base.z.map(pareil))) m.z = z;
          if(image) m.image = image;
          if(v.cache) m.cache = 1;
          if(Object.keys(m).length) bloc.mod[base.k] = m; else delete bloc.mod[base.k];
        } else {
          const cleN = x.neuf ? ('s' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)) : x.k;
          const a = { cle: cleN, n: v.n, e: v.e, image: image, z: z };
          if(!oeil) a.q = v.q;
          if(v.cache) a.cache = 1;
          const i = bloc.ajouts.findIndex(y => y.cle === cleN);
          if(i === -1) bloc.ajouts.push(a); else bloc.ajouts[i] = a;
        }
      });
    });
    bo.setAttribute('data-cja-enregistrer', '1');
  }
  boite.appendChild(rang);
}

/* ---------- 📝 les conseils pour l'examen : un par ligne ---------- */
function cjDessinerConseils(z, corps){
  const peut = cjPeutModifier();
  const base = window.CodeEC.conseilsDe(null).join('\n');
  const corriges = typeof CJ.contenu.conseils === 'string' && CJ.contenu.conseils.trim() !== '';
  z.appendChild(cjEl('p', 'cjaNote', 'La page « 📝 Conseils pour l’examen » du jeu. Un conseil par ligne, 30 au plus. ' +
    (corriges ? '<b>✏️ Tu les as corrigés.</b>' : 'Ce sont ceux du mémo de l’école (les n° 17 à 23).')));
  const f = cjEl('div', 'cjaForm');
  const c = cjEl('textarea', 'haut');
  c.id = 'cjaConseils';
  c.value = window.CodeEC.conseilsDe(CJ.contenu).join('\n');
  c.disabled = !peut;
  c.setAttribute('aria-label', 'Les conseils pour l’examen, un par ligne');
  f.appendChild(c);
  z.appendChild(f);
  const etat = cjEl('div', 'cjaEtat');
  const dire = (t, rouge) => { etat.style.color = rouge ? 'var(--red)' : 'var(--muted)'; etat.textContent = t; };
  z.appendChild(etat);
  if(!peut) return;
  const rang = cjEl('div', 'btn-row');
  rang.style.marginTop = '8px';
  const poser = async (changer) => {
    const avant = JSON.stringify(CJ.contenu);
    try{
      changer();
      dire('⏳ Enregistrement…');
      await cjEnregistrer();
      if(typeof showToast === 'function') showToast('Jeu du code corrigé ✅');
      cjDessiner(corps);
    }catch(e){
      CJ.contenu = JSON.parse(avant);
      dire('❌ ' + (e.message || e), true);
    }
  };
  if(corriges){
    const br = cjEl('button', 'btn btn-secondary', '↩︎ Revenir au mémo de départ');
    br.type = 'button';
    br.addEventListener('click', () => poser(() => { delete CJ.contenu.conseils; }));
    rang.appendChild(br);
  }
  const bo = cjEl('button', 'btn btn-primary', '💾 Enregistrer');
  bo.type = 'button';
  bo.setAttribute('data-cja-enregistrer', '1');
  bo.addEventListener('click', () => {
    const lignes = c.value.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if(lignes.length > 30){ dire('30 conseils au plus (il y en a ' + lignes.length + ').', true); return; }
    const longue = lignes.findIndex(l => l.length > 300);
    if(longue !== -1){ dire('Le conseil n° ' + (longue + 1) + ' est trop long (300 caractères au plus).', true); return; }
    const texte = lignes.join('\n');
    /* vide, ou pareil que le mémo : on ne fige rien */
    poser(() => { if(!texte || texte === base) delete CJ.contenu.conseils; else CJ.contenu.conseils = texte; });
  });
  rang.appendChild(bo);
  z.appendChild(rang);
  z.appendChild(cjEl('p', 'cjaNote', 'Si tu effaces tout, les conseils du mémo reviennent.'));
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
