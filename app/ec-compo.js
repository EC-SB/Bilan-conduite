/* Déployé le 17/10/2026 à 10:51 — v1199 */
/* ============================================================
   ec-compo.js
   🎨 Le dessin d'une diapositive faite dans le studio — v1199

   David, le 17 octobre 2026 : « est-ce que c'est possible
   d'ajouter un créateur de diapositive directement dedans, un
   genre de Canva ». Une diapositive du studio n'est pas une image :
   c'est une description (des textes, des photos, des pastilles, à
   leur place), que ce fichier dessine.

   ⚠️ LE MÊME FICHIER DESSINE DANS L'APPLI ET SUR LES TÉLÉS. Le
   studio, les vignettes de 🖼️ Diapositives et ecran.html chargent
   tous les trois ce fichier : ce qu'on arrange dans le studio est
   exactement ce que la télé affiche — un seul dessin, pas deux qui
   finiraient par se contredire.

   ⚠️ LA DESCRIPTION VIENT DU CLASSEUR : ON N'Y CROIT PAS SUR PAROLE.
   Tout est revérifié ici avant d'être dessiné : les couleurs, les
   nombres, les clés des photos. Le texte est posé en textContent,
   jamais en HTML ; le QR code ne voyage pas dans la description, il
   est fourni par la page (QR_BUREAUX dans l'appli, l'encart déjà
   présent dans ecran.html).

   Deux formes d'écran, deux places pour chaque élément : l'accueil
   est très large (1600 × 722, sous le bandeau du haut), la vitrine
   plus haute que large (1024 × 824, la partie droite à côté du
   texte fixe). Le contenu d'un élément est le même sur les deux.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */
(function(){
  'use strict';

  const BASES = { accueil: [1600, 722], vitrine: [1024, 824] };
  const POLICE = "'Segoe UI', system-ui, -apple-system, sans-serif";
  const TYPES = ['texte', 'pastille', 'photo', 'picto', 'qr', 'logo', 'forme'];
  const TRANSITIONS = ['fondu', 'glisser', 'monter', 'zoom', 'volet'];
  const FONDS = ['couleur', 'degrade', 'photo', 'aucun'];

  /* ---------- Ce qu'on accepte ---------- */
  function couleur(v, defaut){
    const s = String(v == null ? '' : v).trim();
    if(/^#[0-9a-f]{3,8}$/i.test(s)) return s;
    if(/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i.test(s)) return s;
    if(s === 'transparent') return s;
    return defaut;
  }
  function nombre(v, min, max, defaut){
    const n = Number(v);
    return (v === '' || v == null || !isFinite(n)) ? defaut : Math.min(max, Math.max(min, n));
  }
  function texte(v, max){ return String(v == null ? '' : v).replace(/\r/g, '').slice(0, max || 600); }
  function cleDePhoto(v){
    const s = String(v || '');
    return /^ecran\/[A-Za-z0-9]{22}\.[a-z0-9]{1,5}$/.test(s) ? s : '';
  }
  function identifiant(v){
    const s = String(v || '');
    return /^[A-Za-z0-9_-]{1,16}$/.test(s) ? s : '';
  }

  function nettoyerFond(f){
    f = (f && typeof f === 'object') ? f : {};
    return {
      type: FONDS.indexOf(f.type) !== -1 ? f.type : 'couleur',
      c1: couleur(f.c1, '#0B0E14'),
      c2: couleur(f.c2, '#16210a'),
      angle: nombre(f.angle, 0, 360, 120),
      cle: cleDePhoto(f.cle),
      assombrir: nombre(f.assombrir, 0, 0.9, 0.45)
    };
  }

  function nettoyerEl(e){
    if(!e || typeof e !== 'object') return null;
    const id = identifiant(e.id);
    const type = TYPES.indexOf(e.type) !== -1 ? e.type : '';
    if(!id || !type) return null;
    const o = { id: id, type: type };
    if(type === 'texte'){
      o.txt = texte(e.txt, 600);
      o.taille = nombre(e.taille, 10, 320, 48);
      o.couleur = couleur(e.couleur, '#F4F1E8');
      o.gras = !!e.gras;
      o.align = ['left', 'center', 'right'].indexOf(e.align) !== -1 ? e.align : 'left';
      o.maj = !!e.maj;
      o.ombre = !!e.ombre;
      o.interligne = nombre(e.interligne, 0.8, 2.2, 1.2);
      o.espace = nombre(e.espace, 0, 30, 0);
    }else if(type === 'pastille'){
      o.txt = texte(e.txt, 120);
      o.taille = nombre(e.taille, 10, 320, 40);
      o.grand = Math.round(nombre(e.grand, -1, 5, -1));
      o.fond = couleur(e.fond, '#B6FF0E');
      o.couleur = couleur(e.couleur, '#0B0E14');
      o.rayon = nombre(e.rayon, 0, 1000, 26);
      o.rot = nombre(e.rot, -45, 45, 0);
    }else if(type === 'photo'){
      o.cle = cleDePhoto(e.cle);
      o.rayon = nombre(e.rayon, 0, 2000, 24);
      o.cadre = e.cadre ? couleur(e.cadre, '') : '';
    }else if(type === 'picto'){
      o.txt = texte(e.txt, 16) || '⭐';
      o.rot = nombre(e.rot, -45, 45, 0);
    }else if(type === 'qr'){
      o.bureau = 'saint-brieuc';
    }else if(type === 'logo'){
      o.couleur = couleur(e.couleur, '#B6FF0E');
    }else if(type === 'forme'){
      o.fond = couleur(e.fond, '#B6FF0E');
      o.fond2 = e.fond2 ? couleur(e.fond2, '') : '';
      o.angle = nombre(e.angle, 0, 360, 180);
      o.rayon = nombre(e.rayon, 0, 2000, 0);
      o.rot = nombre(e.rot, -180, 180, 0);
      o.opacite = nombre(e.opacite, 0, 1, 1);
    }
    return o;
  }

  function nettoyerPos(p){
    return {
      x: Math.round(nombre(p.x, -3000, 5000, 0)),
      y: Math.round(nombre(p.y, -3000, 5000, 0)),
      w: Math.round(nombre(p.w, 8, 5000, 200)),
      h: Math.round(nombre(p.h, 0, 5000, 0))
    };
  }

  /* La description propre : tout ce qui n'est pas reconnu disparaît */
  function nettoyer(c){
    c = (c && typeof c === 'object') ? c : {};
    const out = {
      v: 1,
      nom: texte(c.nom, 80).replace(/\n/g, ' '),
      fond: nettoyerFond(c.fond),
      el: [],
      pos: { accueil: {}, vitrine: {} },
      transition: TRANSITIONS.indexOf(c.transition) !== -1 ? c.transition : '',
      arrivee: c.arrivee === 'unparun' ? 'unparun' : 'ensemble'
    };
    const vus = {};
    (Array.isArray(c.el) ? c.el : []).slice(0, 40).forEach(e => {
      const x = nettoyerEl(e);
      if(x && !vus[x.id]){ vus[x.id] = 1; out.el.push(x); }
    });
    ['accueil', 'vitrine'].forEach(f => {
      const p = (c.pos && c.pos[f]) || {};
      out.el.forEach(e => { if(p[e.id] && typeof p[e.id] === 'object') out.pos[f][e.id] = nettoyerPos(p[e.id]); });
    });
    return out;
  }

  /* Les photos dont la description a besoin (pour les liens signés) */
  function photos(c){
    const n = nettoyer(c), out = [];
    n.el.forEach(e => { if(e.type === 'photo' && e.cle && out.indexOf(e.cle) === -1) out.push(e.cle); });
    if(n.fond.type === 'photo' && n.fond.cle && out.indexOf(n.fond.cle) === -1) out.push(n.fond.cle);
    return out;
  }

  /* ---------- Le dessin ---------- */
  function url(u){ return 'url("' + String(u).replace(/["\\\n\r]/g, encodeURIComponent) + '")'; }

  function appliquerFond(z, f, o){
    z.style.background = '';
    if(f.type === 'aucun'){ z.style.background = 'transparent'; return; }
    if(f.type === 'degrade'){
      z.style.background = 'linear-gradient(' + f.angle + 'deg, ' + f.c1 + ', ' + f.c2 + ')';
      return;
    }
    if(f.type === 'photo'){
      const u = f.cle && o.photo ? o.photo(f.cle) : '';
      if(u){
        const a = f.assombrir;
        z.style.backgroundColor = f.c1;
        z.style.backgroundImage = 'linear-gradient(rgba(11,14,20,' + a + '), rgba(11,14,20,' + a + ')), ' + url(u);
        z.style.backgroundSize = 'cover';
        z.style.backgroundPosition = 'center';
        return;
      }
    }
    z.style.background = f.c1;
  }

  function dessinerEl(e, p, o){
    const d = document.createElement('div');
    d.className = 'cmpEl cmp-' + e.type;
    d.style.left = p.x + 'px';
    d.style.top = p.y + 'px';
    d.style.width = p.w + 'px';
    if(e.type !== 'texte') d.style.height = (p.h || p.w) + 'px';
    const dedans = document.createElement('div');
    dedans.className = 'cmpDedans';
    d.appendChild(dedans);

    if(e.type === 'texte'){
      dedans.textContent = e.txt;
      dedans.style.fontSize = e.taille + 'px';
      dedans.style.fontWeight = e.gras ? '800' : '400';
      dedans.style.color = e.couleur;
      dedans.style.textAlign = e.align;
      dedans.style.lineHeight = String(e.interligne);
      dedans.style.letterSpacing = e.espace ? e.espace + 'px' : '';
      if(e.maj) dedans.style.textTransform = 'uppercase';
      if(e.ombre) dedans.style.textShadow = '0 4px 18px rgba(0,0,0,.55)';
    }else if(e.type === 'pastille'){
      dedans.style.background = e.fond;
      dedans.style.color = e.couleur;
      dedans.style.borderRadius = e.rayon + 'px';
      if(e.rot) dedans.style.transform = 'rotate(' + e.rot + 'deg)';
      String(e.txt).split('\n').forEach((l, i) => {
        const ligne = document.createElement('div');
        ligne.textContent = l;
        ligne.style.fontSize = (i === e.grand ? e.taille * 2.6 : e.taille) + 'px';
        dedans.appendChild(ligne);
      });
    }else if(e.type === 'photo'){
      const u = e.cle && o.photo ? o.photo(e.cle) : '';
      dedans.style.borderRadius = e.rayon + 'px';
      if(e.cadre) dedans.style.boxShadow = '0 0 0 6px ' + e.cadre;
      if(u){
        dedans.style.backgroundImage = url(u);
      }else if(o.edition){
        dedans.classList.add('cmpVide');
        dedans.textContent = e.cle ? '📷 …' : '📷 Touche « Changer la photo »';
      }else{
        return null;
      }
    }else if(e.type === 'picto'){
      dedans.textContent = e.txt;
      dedans.style.fontSize = Math.round(p.w * 0.86) + 'px';
      if(e.rot) dedans.style.transform = 'rotate(' + e.rot + 'deg)';
    }else if(e.type === 'qr'){
      const svg = o.qr ? String(o.qr(e.bureau) || '') : '';
      if(!svg && !o.edition) return null;
      dedans.innerHTML = svg;
      const s = dedans.querySelector('svg');
      if(s){ s.removeAttribute('width'); s.removeAttribute('height'); }
    }else if(e.type === 'logo'){
      const h = p.h || 56;
      const b = document.createElement('div');
      b.className = 'cmpBadge';
      b.textContent = 'EC';
      b.style.width = b.style.height = h + 'px';
      b.style.borderRadius = Math.round(h * 0.26) + 'px';
      b.style.fontSize = Math.round(h * 0.42) + 'px';
      const n = document.createElement('div');
      n.className = 'cmpNom';
      n.textContent = 'Évolution Conduites';
      n.style.fontSize = Math.round(h * 0.4) + 'px';
      n.style.color = e.couleur;
      dedans.style.gap = Math.round(h * 0.3) + 'px';
      dedans.appendChild(b);
      dedans.appendChild(n);
    }else if(e.type === 'forme'){
      dedans.style.background = e.fond2 ? 'linear-gradient(' + e.angle + 'deg, ' + e.fond + ', ' + e.fond2 + ')' : e.fond;
      dedans.style.borderRadius = e.rayon + 'px';
      dedans.style.opacity = String(e.opacite);
      if(e.rot) dedans.style.transform = 'rotate(' + e.rot + 'deg)';
    }
    return d;
  }

  /* Dessine la diapositive dans « boite ».
     o.largeur : une largeur fixe (studio, vignettes) — sinon la
     boîte entière, en gardant les proportions (la télé). */
  function rendre(boite, compo, format, o){
    o = o || {};
    const c = nettoyer(compo);
    const f = BASES[format] ? format : 'accueil';
    const W = BASES[f][0], H = BASES[f][1];
    boite.innerHTML = '';
    boite.classList.add('cmpBoite');
    /* Une scène de la télé est déjà placée (absolue) : on n'y touche pas */
    const pos = boite.isConnected ? getComputedStyle(boite).position : '';
    if(!pos || pos === 'static') boite.style.position = 'relative';
    const fond = document.createElement('div');
    fond.className = 'cmpFond';
    appliquerFond(fond, c.fond, o);
    const toile = document.createElement('div');
    toile.className = 'cmpToile';
    toile.style.width = W + 'px';
    toile.style.height = H + 'px';
    toile.style.fontFamily = POLICE;
    boite.appendChild(fond);
    boite.appendChild(toile);

    const els = {};
    let rang = 0;
    c.el.forEach(e => {
      const p = c.pos[f][e.id];
      if(!p) return;
      const d = dessinerEl(e, p, o);
      if(!d) return;
      d.dataset.id = e.id;
      if(o.arrivee && c.arrivee === 'unparun'){
        d.classList.add('cmpArrive');
        d.style.animationDelay = ((o.delai || 0) + rang * 0.35).toFixed(2) + 's';
      }
      rang++;
      toile.appendChild(d);
      els[e.id] = d;
    });

    if(o.largeur){
      boite.style.width = o.largeur + 'px';
      boite.style.height = Math.round(o.largeur * H / W) + 'px';
    }
    const recaler = () => {
      const lw = o.largeur || boite.clientWidth || W;
      const lh = o.largeur ? o.largeur * H / W : (boite.clientHeight || H);
      const s = Math.min(lw / W, lh / H) || 1;
      toile.style.transform = 'scale(' + s + ')';
      toile.style.left = ((lw - W * s) / 2) + 'px';
      toile.style.top = ((lh - H * s) / 2) + 'px';
      return s;
    };
    const echelle = recaler();
    return { compo: c, toile: toile, fond: fond, els: els, echelle: echelle, recaler: recaler, W: W, H: H, format: f };
  }

  /* Les styles, posés une fois — les mêmes pour l'appli et la télé */
  (function(){
    if(document.getElementById('cmpStyles')) return;
    const s = document.createElement('style');
    s.id = 'cmpStyles';
    s.textContent =
      '.cmpBoite{overflow:hidden;}' +
      '.cmpFond{position:absolute;inset:0;}' +
      '.cmpToile{position:absolute;left:0;top:0;transform-origin:0 0;}' +
      '.cmpEl{position:absolute;box-sizing:border-box;}' +
      '.cmpDedans{width:100%;height:100%;box-sizing:border-box;}' +
      '.cmp-texte .cmpDedans{height:auto;white-space:pre-wrap;overflow-wrap:break-word;}' +
      '.cmp-pastille .cmpDedans{display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'text-align:center;font-weight:800;line-height:1.05;}' +
      '.cmp-photo .cmpDedans{overflow:hidden;background:#222 center/cover no-repeat;}' +
      '.cmp-photo .cmpDedans.cmpVide{background:rgba(255,255,255,.08);border:3px dashed rgba(255,255,255,.45);' +
        'color:rgba(255,255,255,.75);display:flex;align-items:center;justify-content:center;text-align:center;' +
        'font-size:26px;font-weight:700;padding:12px;}' +
      '.cmp-picto .cmpDedans{line-height:1;text-align:center;}' +
      '.cmp-qr .cmpDedans{background:#fff;border-radius:18px;padding:7%;}' +
      '.cmp-qr svg{width:100%;height:100%;display:block;}' +
      '.cmp-qr .qrline{stroke-width:1;}' +
      '.cmp-logo .cmpDedans{display:flex;align-items:center;}' +
      '.cmpBadge{background:#B6FF0E;color:#0B0B0B;font-weight:900;display:flex;align-items:center;' +
        'justify-content:center;flex-shrink:0;}' +
      '.cmpNom{font-weight:800;white-space:nowrap;}' +
      '.cmpArrive{animation:cmpArrive .8s cubic-bezier(.2,.7,.2,1) both;}' +
      '@keyframes cmpArrive{from{opacity:0;transform:translateY(46px) scale(.96);}to{opacity:1;transform:none;}}';
    (document.head || document.documentElement).appendChild(s);
  })();

  window.Compo = {
    BASES: BASES, POLICE: POLICE, TYPES: TYPES, TRANSITIONS: TRANSITIONS,
    nettoyer: nettoyer, rendre: rendre, photos: photos, couleur: couleur, cleDePhoto: cleDePhoto
  };
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-compo.js'] = true;
