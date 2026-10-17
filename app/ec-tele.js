/* Déployé le 17/10/2026 à 13:44 — v1203 */
/* ============================================================
   ec-tele.js
   🖥️ La mise en page des télés et 🎨 les thèmes — v1201

   David, le 17 octobre 2026 (étape ③ du studio, « vas-y pour
   l'étape 3 »). Ses demandes : « pouvoir replacer la météo, avoir
   plusieurs modèles, modifier si je veux les cours à venir — la
   forme et le placement —, la diapositive vos cours commencent
   pareil, le QR code pareil : pouvoir modifier le fond, la forme,
   le texte bien sûr, en gardant le QR code lui-même ». Ses réponses
   au schéma : le bandeau du haut éclaté en blocs libres (le nom, la
   date, l'heure) ; plusieurs mises en page ; des thèmes pour les
   saisons et les fêtes — « des petits PNG, des trucs qui tombent ou
   qui montent pour rendre vivant » —, au choix sur la vitrine.

   ⚠️ CE FICHIER EST LU PAR LA TÉLÉ ET PAR L'APPLI. ecran.html s'en
   sert pour appliquer la mise en page et le thème du jour ; l'appli
   pour les vignettes animées des thèmes et pour savoir lequel est
   « en ce moment ». Une seule règle de calendrier, un seul moteur
   d'animation : la télé et l'appli ne peuvent pas se contredire.

   ⚠️ LES RÉGLAGES VIENNENT DE D1 : ON N'Y CROIT PAS SUR PAROLE.
   Couleurs, nombres, positions sont revérifiés ici avant de devenir
   du CSS — jamais une chaîne recopiée telle quelle dans une règle.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */
(function(){
  'use strict';
  const R = Math.random;
  const entre = (a, b) => a + R() * (b - a);
  const choisir = t => t[Math.floor(R() * t.length)];

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
  function texte(v, max){ return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').slice(0, max || 80); }
  function cleDePhoto(v){
    const s = String(v || '');
    return /^ecran\/[A-Za-z0-9]{22}\.[a-z0-9]{1,5}$/.test(s) ? s : '';
  }
  /* « #rrggbb » + transparence → rgba(), pour les voiles */
  function avecAlpha(c, a){
    const m = /^#([0-9a-f]{6})$/i.exec(String(c || ''));
    if(!m) return couleur(c, 'rgba(11,14,20,' + a + ')');
    const n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ============================================================
     LES PETITES IMAGES — dessinées une fois, comme des PNG
     ============================================================ */
  function lutin(w, h, dessin){
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    dessin(c.getContext('2d'), w, h);
    return c;
  }
  const IM = {
    feuille: coul => lutin(64, 64, g => {
      g.translate(32, 32); g.fillStyle = coul;
      g.beginPath(); g.moveTo(0, -27); g.bezierCurveTo(16, -18, 18, 6, 0, 22); g.bezierCurveTo(-18, 6, -16, -18, 0, -27); g.fill();
      g.strokeStyle = 'rgba(70,30,8,.6)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 29); g.lineTo(0, -22);
      for(let i = 0; i < 3; i++){ const y = 8 - i * 9; g.moveTo(0, y); g.lineTo(8, y - 7); g.moveTo(0, y); g.lineTo(-8, y - 7); }
      g.stroke();
    }),
    flocon: () => lutin(48, 48, g => {
      g.translate(24, 24); g.strokeStyle = '#fff'; g.lineWidth = 2.4; g.lineCap = 'round';
      for(let i = 0; i < 6; i++){
        g.rotate(Math.PI / 3);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -20);
        g.moveTo(0, -12); g.lineTo(-5, -17); g.moveTo(0, -12); g.lineTo(5, -17); g.stroke();
      }
    }),
    neige: () => lutin(16, 16, g => {
      const d = g.createRadialGradient(8, 8, 0, 8, 8, 8);
      d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = d; g.fillRect(0, 0, 16, 16);
    }),
    citrouille: () => lutin(80, 72, g => {
      g.fillStyle = '#4a7a1a'; g.fillRect(36, 2, 8, 14);
      [[22, 40], [58, 40], [40, 40]].forEach(([x], i) => {
        g.fillStyle = i === 2 ? '#ff8a1f' : '#e86f0c';
        g.beginPath(); g.ellipse(x, 42, i === 2 ? 20 : 22, 27, 0, 0, Math.PI * 2); g.fill();
      });
      g.fillStyle = '#2a1206';
      g.beginPath(); g.moveTo(26, 34); g.lineTo(34, 34); g.lineTo(30, 26); g.fill();
      g.beginPath(); g.moveTo(46, 34); g.lineTo(54, 34); g.lineTo(50, 26); g.fill();
      g.beginPath(); g.moveTo(24, 48); g.lineTo(56, 48); g.lineTo(52, 56); g.lineTo(46, 52); g.lineTo(40, 58); g.lineTo(34, 52); g.lineTo(28, 56); g.closePath(); g.fill();
    }),
    chauvesouris: ouverte => lutin(90, 44, g => {
      g.shadowColor = 'rgba(255,138,31,.9)'; g.shadowBlur = 6; g.fillStyle = '#120818';
      const y = ouverte ? 4 : 30;
      g.beginPath(); g.moveTo(45, 16);
      g.quadraticCurveTo(30, y, 4, ouverte ? 8 : 34);
      g.quadraticCurveTo(14, 22, 20, 30); g.quadraticCurveTo(28, 22, 34, 32); g.quadraticCurveTo(40, 26, 45, 36);
      g.quadraticCurveTo(50, 26, 56, 32); g.quadraticCurveTo(62, 22, 70, 30); g.quadraticCurveTo(76, 22, 86, ouverte ? 8 : 34);
      g.quadraticCurveTo(60, y, 45, 16); g.fill();
      g.beginPath(); g.ellipse(45, 22, 7, 10, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(40, 14); g.lineTo(42, 6); g.lineTo(45, 13); g.lineTo(48, 6); g.lineTo(50, 14); g.fill();
    }),
    sorciere: () => lutin(220, 140, g => {
      g.shadowColor = 'rgba(255,138,31,.9)'; g.shadowBlur = 6;
      g.fillStyle = '#120818'; g.strokeStyle = '#120818';
      g.lineWidth = 5; g.beginPath(); g.moveTo(20, 104); g.lineTo(190, 86); g.stroke();
      g.fillStyle = '#6b4a1e'; g.beginPath(); g.moveTo(190, 86); g.lineTo(218, 70); g.lineTo(216, 108); g.closePath(); g.fill();
      g.fillStyle = '#120818';
      g.beginPath(); g.moveTo(80, 98); g.quadraticCurveTo(70, 60, 96, 48); g.quadraticCurveTo(122, 52, 128, 94); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(96, 54); g.quadraticCurveTo(140, 50, 168, 72); g.quadraticCurveTo(140, 70, 120, 78); g.fill();
      g.beginPath(); g.arc(100, 42, 11, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(80, 34); g.lineTo(124, 34); g.lineTo(112, 28); g.lineTo(90, 0); g.lineTo(96, 28); g.closePath(); g.fill();
      g.lineWidth = 3; g.beginPath(); g.moveTo(108, 40); g.quadraticCurveTo(130, 44, 140, 36); g.moveTo(108, 46); g.quadraticCurveTo(128, 54, 142, 48); g.stroke();
    }),
    fantome: () => lutin(60, 72, g => {
      g.fillStyle = 'rgba(255,255,255,.92)';
      g.beginPath(); g.moveTo(6, 68); g.lineTo(6, 30); g.arc(30, 30, 24, Math.PI, 0); g.lineTo(54, 68);
      for(let i = 0; i < 4; i++) g.quadraticCurveTo(48 - i * 12, 60, 42 - i * 12, 68);
      g.fill();
      g.fillStyle = '#1b1b2a'; g.beginPath(); g.ellipse(22, 32, 4, 6, 0, 0, 7); g.ellipse(38, 32, 4, 6, 0, 0, 7); g.fill();
    }),
    oeuf: (a, b, motif) => lutin(48, 62, g => {
      g.save(); g.beginPath(); g.ellipse(24, 33, 20, 27, 0, 0, Math.PI * 2); g.clip();
      g.fillStyle = a; g.fillRect(0, 0, 48, 62);
      g.fillStyle = b; g.strokeStyle = b; g.lineWidth = 4;
      if(motif === 0){ g.beginPath(); for(let x = 0; x <= 48; x += 8) g.lineTo(x, 30 + ((x / 8) % 2 ? -5 : 5)); g.stroke(); g.fillRect(0, 44, 48, 5); }
      else if(motif === 1){ for(let i = 0; i < 9; i++){ g.beginPath(); g.arc(6 + (i % 3) * 18, 14 + Math.floor(i / 3) * 18, 3.5, 0, 7); g.fill(); } }
      else { g.fillRect(0, 18, 48, 6); g.fillRect(0, 38, 48, 6); }
      g.restore();
    }),
    cloche: () => lutin(70, 80, g => {
      g.fillStyle = '#E8C46A';
      g.beginPath(); g.moveTo(14, 58); g.quadraticCurveTo(14, 18, 35, 14); g.quadraticCurveTo(56, 18, 56, 58); g.lineTo(62, 64); g.lineTo(8, 64); g.closePath(); g.fill();
      g.fillStyle = '#b8902e'; g.beginPath(); g.arc(35, 68, 6, 0, 7); g.fill();
      g.fillStyle = '#e8506a'; g.beginPath(); g.moveTo(35, 14); g.lineTo(18, 4); g.lineTo(20, 16); g.closePath(); g.moveTo(35, 14); g.lineTo(52, 4); g.lineTo(50, 16); g.closePath(); g.fill();
    }),
    petale: coul => lutin(30, 30, g => {
      g.translate(15, 15); g.fillStyle = coul;
      g.beginPath(); g.moveTo(0, -12); g.quadraticCurveTo(12, -4, 0, 12); g.quadraticCurveTo(-12, -4, 0, -12); g.fill();
    }),
    coeur: coul => lutin(40, 36, g => {
      g.fillStyle = coul; g.beginPath(); g.moveTo(20, 34);
      g.bezierCurveTo(-6, 16, 4, -4, 20, 9); g.bezierCurveTo(36, -4, 46, 16, 20, 34); g.fill();
    }),
    confetti: coul => lutin(14, 8, g => { g.fillStyle = coul; g.fillRect(0, 0, 14, 8); }),
    bulle: () => lutin(40, 40, g => {
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(20, 20, 17, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(13, 13, 4, 0, 7); g.fill();
    })
  };

  /* Le catalogue : ce que chaque petite image fait d'elle-même, sur un
     écran de 1600 de large (on met à l'échelle de la vraie télé) */
  const LUTINS = {
    feuille:      { nom: 'Feuille', sens: 'tombe', n: 28, taille: [34, 58], vitesse: [30, 60], rot: 1, balance: 50, images: () => ['#d9622b', '#e8a33c', '#b8452a', '#c9a227', '#8a5a2b'].map(IM.feuille) },
    neige:        { nom: 'Neige', sens: 'tombe', n: 70, taille: [5, 12], vitesse: [30, 70], balance: 25, alpha: 0.9, images: () => [IM.neige()] },
    flocon:       { nom: 'Flocon', sens: 'tombe', n: 18, taille: [16, 30], vitesse: [24, 46], rot: 1, balance: 30, alpha: 0.85, images: () => [IM.flocon()] },
    citrouille:   { nom: 'Citrouille', sens: 'tombe', n: 8, taille: [40, 70], vitesse: [18, 32], rot: 1, balance: 30, images: () => [IM.citrouille()] },
    chauvesouris: { nom: 'Chauve-souris', sens: 'vole', n: 5, taille: [50, 80], vitesse: [80, 140], battre: 1, images: () => [IM.chauvesouris(true), IM.chauvesouris(false)] },
    fantome:      { nom: 'Fantôme', sens: 'monte', n: 4, taille: [44, 64], vitesse: [16, 26], balance: 40, alpha: 0.75, images: () => [IM.fantome()] },
    sorciere:     { nom: 'Sorcière', sens: 'passe', toutes: 14, taille: [220, 260], vitesse: [260, 320], images: () => [IM.sorciere()] },
    oeuf:         { nom: 'Œuf', sens: 'tombe', n: 14, taille: [30, 48], vitesse: [26, 44], rot: 1, balance: 30,
                    images: () => [['#ffd166', '#ef476f'], ['#8ecae6', '#ffffff'], ['#b8f2a0', '#6a4c93'], ['#ffafcc', '#ffd166'], ['#cdb4db', '#06d6a0']].map((c, i) => IM.oeuf(c[0], c[1], i % 3)) },
    cloche:       { nom: 'Cloche', sens: 'vole', n: 2, taille: [56, 70], vitesse: [60, 90], ondule: 1, images: () => [IM.cloche()] },
    petale:       { nom: 'Pétale', sens: 'tombe', n: 34, taille: [22, 36], vitesse: [24, 46], rot: 1, balance: 70, alpha: 0.95, images: () => ['#ffc2d6', '#ffe0ea', '#ff9fc8', '#ffffff'].map(IM.petale) },
    coeur:        { nom: 'Cœur', sens: 'monte', n: 22, taille: [18, 36], vitesse: [26, 50], balance: 30, alpha: 0.9, images: () => ['#ff5c8a', '#ff8fab', '#e63946', '#ffc2d1'].map(IM.coeur) },
    confetti:     { nom: 'Confetti', sens: 'tombe', n: 60, taille: [8, 14], vitesse: [50, 90], rot: 1, balance: 40, images: () => ['#E8C46A', '#ffffff', '#ff5c8a', '#6FB4FF', '#B6FF0E'].map(IM.confetti) },
    bulle:        { nom: 'Bulle', sens: 'monte', n: 16, taille: [16, 40], vitesse: [20, 40], balance: 30, images: () => [IM.bulle()] }
  };
  const DECORS = { lune: '🌕 La lune', toile: '🕸️ La toile d’araignée', guirlande: '💡 La guirlande', congere: '⛄ Le tapis de neige',
                   soleil: '☀️ Le soleil', feu: '🎆 Les feux d’artifice' };

  /* Une vignette d'une petite image (pour l'appli) */
  function vignetteLutin(k){
    const l = LUTINS[k];
    return l ? l.images()[0] : null;
  }

  /* ============================================================
     LE MOTEUR : une seule toile, des couches
     ============================================================ */
  const f50 = v => Math.pow(2, (nombre(v, 0, 100, 50) - 50) / 25);   /* 0 → ×¼, 50 → ×1, 100 → ×4 */

  function couchesDuTheme(a, images){
    const sens = ['tombe', 'monte', 'traverse'].indexOf(a.sens) !== -1 ? a.sens : '';
    const out = [];
    const ajouter = (base, liste) => {
      let type = base.sens;
      if(sens && (type === 'tombe' || type === 'monte')) type = sens === 'traverse' ? 'vole' : sens;
      if(sens === 'traverse' && type === 'monte') type = 'vole';
      out.push(Object.assign({}, base, { type: type, lutins: liste }));
    };
    a.lutins.forEach(k => { if(LUTINS[k]) ajouter(LUTINS[k], LUTINS[k].images()); });
    if(images && images.length) ajouter({ sens: 'tombe', n: 10, taille: [50, 80], vitesse: [24, 44], rot: 1, balance: 30 }, images);
    a.decors.forEach(k => { if(DECORS[k]) out.push({ type: k, couleurs: a.feu }); });
    return out;
  }

  function lancer(toile, animation, opts){
    opts = opts || {};
    const a = nettoyerAnimation(animation);
    const g = toile.getContext('2d');
    const W = () => toile.width, H = () => toile.height;
    const e = () => W() / 1600;
    const qte = f50(a.quantite), vit = f50(a.vitesse), tai = f50(a.taille);
    let fini = false, dernier = null, temps = 0;
    let couches = [];
    const preparer = images => {
      couches = couchesDuTheme(a, images).map(c => {
        const l = c.lutins || [];
        const parts = [];
        const neuf = debut => {
          const t = entre(c.taille[0], c.taille[1]) * tai * e();
          const im = choisir(l);
          const h = t * (im.height || 1) / (im.width || 1);
          const p = { im: im, l: t, h: h, v: entre(c.vitesse[0], c.vitesse[1]) * vit * e(), a: R() * 6.28, va: entre(-1.2, 1.2), ph: R() * 6.28, alpha: c.alpha || 1 };
          if(c.type === 'tombe'){ p.x = R() * W(); p.y = debut ? R() * H() : -h - R() * 60; }
          if(c.type === 'monte'){ p.x = R() * W(); p.y = debut ? R() * H() : H() + h + R() * 60; }
          if(c.type === 'vole'){ p.dir = R() < .5 ? 1 : -1; p.x = debut ? R() * W() : (p.dir > 0 ? -t - R() * 300 * e() : W() + R() * 300 * e()); p.y = entre(.08, .6) * H(); }
          return p;
        };
        if(c.n && l.length) for(let i = 0; i < Math.round(c.n * qte); i++) parts.push(neuf(true));
        return { c: c, l: l, parts: parts, neuf: neuf, t0: 0, passe: null, feux: [] };
      });
    };
    /* Les photos de David (« ➕ Ta photo ») se chargent d'abord */
    const urls = (opts.photos || []).filter(Boolean).slice(0, 6);
    if(urls.length){
      let restant = urls.length;
      const imgs = [];
      urls.forEach(u => {
        const im = new Image();
        im.onload = () => { imgs.push(im); if(--restant === 0) preparer(imgs); };
        im.onerror = () => { if(--restant === 0) preparer(imgs); };
        im.src = u;
      });
      preparer([]);
    }else preparer([]);

    function pas(dt){
      temps += dt;
      g.clearRect(0, 0, W(), H());
      couches.forEach(k => {
        const c = k.c;
        if(c.type === 'tombe' || c.type === 'monte'){
          k.parts.forEach((p, i) => {
            p.y += (c.type === 'tombe' ? 1 : -1) * p.v * dt;
            p.ph += dt * 1.4;
            const x = p.x + Math.sin(p.ph) * (c.balance || 0) * e();
            if(c.rot) p.a += p.va * dt;
            g.save(); g.globalAlpha = p.alpha; g.translate(x, p.y);
            g.rotate(c.rot ? p.a : Math.sin(p.ph) * .15);
            g.drawImage(p.im, -p.l / 2, -p.h / 2, p.l, p.h); g.restore();
            if((c.type === 'tombe' && p.y > H() + p.h) || (c.type === 'monte' && p.y < -p.h)) k.parts[i] = k.neuf(false);
          });
        }else if(c.type === 'vole'){
          k.parts.forEach((p, i) => {
            p.x += p.dir * p.v * dt; p.ph += dt * (c.battre ? 9 : 2);
            const y = p.y + Math.sin(p.ph * (c.battre ? .2 : 1)) * (c.ondule ? 30 : 18) * e();
            const im = c.battre && k.l.length > 1 ? k.l[Math.sin(p.ph) > 0 ? 0 : 1] : p.im;
            g.save(); g.globalAlpha = p.alpha; g.translate(p.x, y); if(p.dir < 0) g.scale(-1, 1); if(c.ondule) g.rotate(Math.sin(p.ph) * .25);
            g.drawImage(im, -p.l / 2, -p.h / 2, p.l, p.h); g.restore();
            if(p.x < -p.l - 400 * e() || p.x > W() + p.l + 400 * e()) k.parts[i] = k.neuf(false);
          });
        }else if(c.type === 'passe'){
          const premiere = opts.premierePasse != null ? opts.premierePasse : c.toutes;
          if(!k.passe && k.l.length && (temps - k.t0) > (k.dejaPasse ? c.toutes : premiere)){
            const im = k.l[0], l = entre(c.taille[0], c.taille[1]) * tai * e();
            k.passe = { im: im, l: l, h: l * im.height / im.width, x: W() + l, y: entre(.1, .18) * H(), v: entre(c.vitesse[0], c.vitesse[1]) * vit * e(), ph: 0 };
            k.t0 = temps; k.dejaPasse = true;
          }
          const p = k.passe;
          if(p){
            p.x -= p.v * dt; p.ph += dt * 2;
            g.save(); g.translate(p.x, p.y + Math.sin(p.ph) * 20 * e()); g.drawImage(p.im, -p.l / 2, -p.h / 2, p.l, p.h); g.restore();
            if(p.x < -p.l){ k.passe = null; k.t0 = temps; }
          }
        }else if(c.type === 'toile'){
          g.save(); g.translate(W(), 0); g.scale(-1, 1); g.strokeStyle = 'rgba(230,230,240,.55)'; g.lineWidth = 1.5;
          const r = Math.min(W(), H()) * .22;
          for(let i = 0; i <= 6; i++){ const an = i / 6 * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an) * r, Math.sin(an) * r); g.stroke(); }
          for(let j = 1; j <= 5; j++){
            g.beginPath();
            for(let i = 0; i <= 6; i++){
              const an = i / 6 * Math.PI / 2, rr = r * j / 5.4;
              const px = Math.cos(an) * rr, py = Math.sin(an) * rr;
              if(i === 0) g.moveTo(px, py); else g.quadraticCurveTo(Math.cos(an - .13) * rr * .9, Math.sin(an - .13) * rr * .9, px, py);
            }
            g.stroke();
          }
          g.restore();
        }else if(c.type === 'congere'){
          g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.moveTo(0, H());
          for(let x = 0; x <= W(); x += W() / 16) g.lineTo(x, H() - (14 + 10 * Math.sin(x / W() * 9) + 6 * Math.sin(x / W() * 23)) * e());
          g.lineTo(W(), H()); g.fill();
        }else if(c.type === 'guirlande'){
          g.strokeStyle = 'rgba(20,60,30,.9)'; g.lineWidth = 3; g.beginPath();
          const n = 22, s = e();
          for(let i = 0; i <= n; i++){ const x = i / n * W(); const y = (10 + (i % 2 ? 22 : 6)) * s; if(i === 0) g.moveTo(x, y); else g.quadraticCurveTo(x - W() / n / 2, y + 14 * s, x, y); }
          g.stroke();
          const cl = ['#ff4d4d', '#ffd23f', '#4dd2ff', '#7dff6a', '#ff8af0'];
          for(let i = 0; i < n; i++){
            const x = (i + .5) / n * W(), y = 32 * s;
            const on = Math.sin(temps * 3 + i * 1.7) > -.2;
            g.fillStyle = cl[i % cl.length]; g.globalAlpha = on ? 1 : .25;
            g.beginPath(); g.ellipse(x, y, 6 * s, 9 * s, 0, 0, 7); g.fill();
            if(on){ g.globalAlpha = .35; g.beginPath(); g.arc(x, y, 16 * s, 0, 7); g.fill(); }
            g.globalAlpha = 1;
          }
        }else if(c.type === 'lune'){
          const x = W() * .56, y = H() * .15, r = Math.min(W(), H()) * .08;
          const d = g.createRadialGradient(x, y, r * .2, x, y, r * 1.6);
          d.addColorStop(0, 'rgba(255,214,150,.95)'); d.addColorStop(.6, 'rgba(255,170,80,.35)'); d.addColorStop(1, 'rgba(255,170,80,0)');
          g.fillStyle = d; g.beginPath(); g.arc(x, y, r * 1.6, 0, 7); g.fill();
          g.fillStyle = '#ffd99a'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        }else if(c.type === 'soleil'){
          const x = W() * .92, y = H() * .1, r = Math.min(W(), H()) * .09;
          g.save(); g.translate(x, y); g.rotate(temps * .15); g.fillStyle = 'rgba(255,210,63,.35)';
          for(let i = 0; i < 12; i++){ g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(-r * .25, r * 1.1); g.lineTo(0, r * 2.2); g.lineTo(r * .25, r * 1.1); g.fill(); }
          g.restore();
          const d = g.createRadialGradient(x, y, 0, x, y, r); d.addColorStop(0, '#fff3b0'); d.addColorStop(1, '#ffd23f');
          g.fillStyle = d; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        }else if(c.type === 'feu'){
          const cl = (c.couleurs && c.couleurs.length) ? c.couleurs : ['#E8C46A', '#ffffff', '#ff5c8a'];
          if(R() < dt * 1.8) k.feux.push({ x: entre(.15, .85) * W(), y: entre(.15, .5) * H(), t: 0, c: choisir(cl), n: 36 });
          k.feux = k.feux.filter(f => f.t < 1.6);
          k.feux.forEach(f => {
            f.t += dt;
            const r = Math.min(W(), H()) * .16 * Math.min(1, f.t * 1.6), al = Math.max(0, 1 - f.t / 1.6);
            g.fillStyle = f.c;
            for(let i = 0; i < f.n; i++){
              const an = i / f.n * 6.283, chute = f.t * f.t * 30 * e();
              g.globalAlpha = al; g.beginPath(); g.arc(f.x + Math.cos(an) * r, f.y + Math.sin(an) * r + chute, 5 * e(), 0, 7); g.fill();
              g.globalAlpha = al * .5; g.beginPath(); g.arc(f.x + Math.cos(an) * r * .7, f.y + Math.sin(an) * r * .7 + chute, 3 * e(), 0, 7); g.fill();
            }
            g.globalAlpha = 1;
          });
        }
      });
    }
    let vuDansLaPage = false;
    function boucle(t){
      if(fini) return;
      /* Une vignette de l'appli retirée de la page s'arrête d'elle-même */
      if(opts.arretSiRetire){ if(toile.isConnected) vuDansLaPage = true; else if(vuDansLaPage){ fini = true; return; } }
      const dt = dernier === null ? 0 : Math.min(.05, (t - dernier) / 1000);
      dernier = t;
      if(!opts.pause) pas(dt);
      requestAnimationFrame(boucle);
    }
    if(opts.figer){ for(let i = 0; i < opts.figer; i++) pas(1 / 30); }
    else requestAnimationFrame(boucle);
    return { arreter(){ fini = true; g.clearRect(0, 0, W(), H()); }, pas: pas, pause(v){ opts.pause = !!v; } };
  }

  /* ============================================================
     LES THÈMES
     ============================================================ */
  function nettoyerAnimation(a){
    a = (a && typeof a === 'object') ? a : {};
    return {
      lutins: (Array.isArray(a.lutins) ? a.lutins : []).filter(k => LUTINS[k]).slice(0, 13),
      photos: (Array.isArray(a.photos) ? a.photos : []).map(cleDePhoto).filter(Boolean).slice(0, 6),
      sens: ['tombe', 'monte', 'traverse'].indexOf(a.sens) !== -1 ? a.sens : '',
      quantite: nombre(a.quantite, 0, 100, 50), vitesse: nombre(a.vitesse, 0, 100, 50), taille: nombre(a.taille, 0, 100, 50),
      decors: (Array.isArray(a.decors) ? a.decors : []).filter(k => DECORS[k]),
      feu: (Array.isArray(a.feu) ? a.feu : []).map(c => couleur(c, '')).filter(Boolean).slice(0, 5)
    };
  }
  function moisJour(v, defaut){ const s = String(v || ''); return /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s) ? s : defaut; }
  function nettoyerTheme(t, id){
    t = (t && typeof t === 'object') ? t : {};
    const base = THEMES_BASE[id] || {};
    const pick = (k, d) => (t[k] !== undefined ? t[k] : (base[k] !== undefined ? base[k] : d));
    return {
      nom: texte(pick('nom', 'Thème'), 40) || 'Thème',
      paques: !!pick('paques', false),
      du: moisJour(pick('du', '01-01'), '01-01'),
      au: moisJour(pick('au', '01-07'), '01-07'),
      fete: !!pick('fete', false),
      accent: couleur(pick('accent', ''), ''),
      fond1: couleur(pick('fond1', ''), ''),
      fond2: couleur(pick('fond2', ''), ''),
      entete: couleur(pick('entete', ''), ''),
      carte: couleur(pick('carte', ''), ''),
      contour: couleur(pick('contour', ''), ''),
      animation: nettoyerAnimation(pick('animation', {}))
    };
  }

  const THEMES_BASE = {
    automne:    { nom: '🍂 Automne', du: '09-22', au: '12-20', accent: '#F2A03D', fond1: '#2a160a', fond2: '#0B0E14', entete: 'rgba(40,20,8,0.72)', carte: 'rgba(34,18,8,0.82)', contour: 'rgba(242,160,61,0.45)',
                  animation: { lutins: ['feuille'] } },
    halloween:  { nom: '🎃 Halloween', du: '10-24', au: '11-01', fete: true, accent: '#FF8A1F', fond1: '#2a0f3a', fond2: '#0B0E14', entete: 'rgba(30,10,40,0.78)', carte: 'rgba(28,10,38,0.84)', contour: 'rgba(255,138,31,0.5)',
                  animation: { lutins: ['citrouille', 'chauvesouris', 'fantome', 'sorciere'], decors: ['lune', 'toile'] } },
    noel:       { nom: '🎄 Noël', du: '12-01', au: '12-26', fete: true, accent: '#E8C46A', fond1: '#123b24', fond2: '#0B0E14', entete: 'rgba(90,10,18,0.82)', carte: 'rgba(10,40,25,0.85)', contour: 'rgba(232,196,106,0.6)',
                  animation: { lutins: ['neige', 'flocon'], quantite: 40, decors: ['guirlande'] } },
    hiver:      { nom: '❄️ Hiver', du: '12-21', au: '03-20', accent: '#9fd3ff', fond1: '#1b3358', fond2: '#0B0E14', entete: 'rgba(20,40,80,0.75)', carte: 'rgba(16,32,64,0.82)', contour: 'rgba(159,211,255,0.5)',
                  animation: { lutins: ['neige', 'flocon'], decors: ['congere'] } },
    nouvelan:   { nom: '🎆 Nouvel an', du: '12-27', au: '01-05', fete: true, accent: '#E8C46A', fond1: '#1a1630', fond2: '#0B0E14', contour: 'rgba(232,196,106,0.6)',
                  animation: { lutins: ['confetti'], decors: ['feu'], feu: ['#E8C46A', '#ffffff', '#ff5c8a'] } },
    stvalentin: { nom: '❤️ Saint-Valentin', du: '02-10', au: '02-14', fete: true, accent: '#FF5C8A', fond1: '#3a0f1f', fond2: '#0B0E14', carte: 'rgba(50,10,24,0.82)', contour: 'rgba(255,92,138,0.5)',
                  animation: { lutins: ['coeur'] } },
    printemps:  { nom: '🌸 Printemps', du: '03-21', au: '06-20', accent: '#FF9FC8', fond1: '#24361c', fond2: '#0B0E14', carte: 'rgba(30,40,24,0.82)', contour: 'rgba(255,159,200,0.5)',
                  animation: { lutins: ['petale'] } },
    paques:     { nom: '🥚 Pâques', paques: true, fete: true, accent: '#FFD166', fond1: '#33284d', fond2: '#0B0E14', carte: 'rgba(40,30,60,0.82)', contour: 'rgba(255,209,102,0.5)',
                  animation: { lutins: ['oeuf', 'cloche'] } },
    ete:        { nom: '☀️ Été', du: '06-21', au: '09-21', accent: '#FFD23F', fond1: '#0f3d5c', fond2: '#0B0E14', carte: 'rgba(10,40,60,0.82)', contour: 'rgba(255,210,63,0.5)',
                  animation: { lutins: ['bulle'], decors: ['soleil'] } },
    quatorze:   { nom: '🇫🇷 14 juillet', du: '07-13', au: '07-14', fete: true, accent: '#6FB4FF',
                  animation: { lutins: [], decors: ['feu'], feu: ['#2b5cff', '#ffffff', '#ff2b2b'] } }
  };
  const ORDRE_THEMES = ['automne', 'halloween', 'noel', 'hiver', 'nouvelan', 'stvalentin', 'printemps', 'paques', 'ete', 'quatorze'];

  /* Les thèmes : ceux de base, puis ce que D1 en a fait (lignes
     { id, config, actif, vitrine }), puis les thèmes ajoutés */
  function themesComplets(lignes){
    const parId = {};
    (lignes || []).forEach(l => { if(l && /^[a-z0-9_-]{2,30}$/.test(String(l.id || ''))) parId[l.id] = l; });
    const ids = ORDRE_THEMES.concat(Object.keys(parId).filter(k => ORDRE_THEMES.indexOf(k) === -1).sort());
    return ids.map(id => {
      const l = parId[id];
      let cfg = {};
      if(l){ try{ cfg = typeof l.config === 'string' ? JSON.parse(l.config || '{}') : (l.config || {}); }catch(e){ cfg = {}; } }
      return {
        id: id, base: !!THEMES_BASE[id], modifie: !!l,
        actif: l ? Number(l.actif) !== 0 : true,
        vitrine: l ? Number(l.vitrine) !== 0 : true,
        config: nettoyerTheme(cfg, id)
      };
    });
  }

  /* ---------- Le calendrier ---------- */
  function paques(an){
    const a = an % 19, b = Math.floor(an / 100), c = an % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(an, mois - 1, jour));
  }
  const JOUR = 86400000;
  const isoVersDate = iso => { const p = String(iso).split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
  /* La période d'un thème qui contient (ou suit) un jour donné : [début, fin] */
  function periodes(cfg, an){
    if(cfg.paques){
      const p = paques(an);
      return [[new Date(p.getTime() - 7 * JOUR), new Date(p.getTime() + JOUR)]];
    }
    const d = (y, md) => new Date(Date.UTC(y, Number(md.slice(0, 2)) - 1, Number(md.slice(3, 5))));
    if(cfg.du <= cfg.au) return [[d(an, cfg.du), d(an, cfg.au)]];
    return [[d(an - 1, cfg.du), d(an, cfg.au)], [d(an, cfg.du), d(an + 1, cfg.au)]];
  }
  function dansLaPeriode(cfg, iso){
    const j = isoVersDate(iso), an = j.getUTCFullYear();
    return periodes(cfg, an).some(([a, b]) => j >= a && j <= b);
  }
  function dureeDe(cfg, iso){
    const an = isoVersDate(iso).getUTCFullYear();
    const p = periodes(cfg, an)[0];
    return Math.round((p[1] - p[0]) / JOUR) + 1;
  }
  /* Dans combien de jours il commence (0 = en ce moment, -1 = pas dans l'année) */
  function joursAvant(cfg, iso){
    if(dansLaPeriode(cfg, iso)) return 0;
    const j = isoVersDate(iso), an = j.getUTCFullYear();
    let mieux = -1;
    [an, an + 1].forEach(y => periodes(cfg, y).forEach(([a]) => {
      const n = Math.round((a - j) / JOUR);
      if(n > 0 && (mieux < 0 || n < mieux)) mieux = n;
    }));
    return mieux;
  }
  /* Le thème du jour pour un écran : les fêtes passent avant les
     saisons, et à égalité le plus court (le plus précis) gagne */
  function themeDuJour(themes, iso, ou){
    const ok = (themes || []).filter(t => t.actif && (ou !== 'vitrine' || t.vitrine) && dansLaPeriode(t.config, iso));
    ok.sort((a, b) => (Number(b.config.fete) - Number(a.config.fete)) || (dureeDe(a.config, iso) - dureeDe(b.config, iso)));
    return ok[0] || null;
  }

  /* Le CSS d'un thème : des variables et quelques fonds */
  function cssTheme(cfg){
    if(!cfg) return '';
    const t = nettoyerTheme(cfg);
    let s = '';
    if(t.accent) s += ':root{--accent:' + t.accent + ';}';
    if(t.fond1) s += 'body{background:radial-gradient(circle at 60% 50%,' + t.fond1 + ',' + (t.fond2 || '#0B0E14') + ' 75%);}';
    if(t.entete) s += 'header{background:' + t.entete + ';}';
    if(t.carte) s += '#planning,#meteoVitrine{background:' + t.carte + ';}';
    if(t.contour) s += '#planning{border-color:' + t.contour + ';}';
    if(t.accent) s += '#bandeau{border-top-color:' + t.accent + ';}';
    return s;
  }

  /* ============================================================
     LA MISE EN PAGE
     Les places sont celles d'un écran de 1600 × 900 (la page des
     télés telle qu'elle est aujourd'hui, mesurée) ; la télé les
     ramène à sa taille.
     ============================================================ */
  const BLOCS = {
    accueil: {
      nom:      { titre: '🏷️ Le nom de l’école', sel: 'header .marque', x: 34, y: 20, w: 300, h: 40, z: 9, accent: 1 },
      date:     { titre: '📆 La date', sel: '#jour', x: 327, y: 26, w: 340, h: 30, z: 9 },
      meteo:    { titre: '🌤️ La météo', sel: '#meteo', x: 1100, y: 10, w: 340, h: 60, z: 9 },
      heure:    { titre: '🕐 L’heure', sel: '#heure', x: 1440, y: 14, w: 130, h: 52, z: 9 },
      planning: { titre: '📅 Les cours à venir', sel: '#planning', x: 24, y: 103, w: 389, h: 600, z: 3, accent: 1, auto: 1 },
      qr:       { titre: '🔳 Le QR code', sel: '#qrEncart', x: 1346, y: 463, w: 230, h: 314, z: 4, auto: 1 },
      bandeau:  { titre: '📢 Le texte défilant', sel: '#bandeau', x: 0, y: 801, w: 1600, h: 69, z: 9, accent: 1 },
      scene:    { titre: '🖼️ Les diapositives', sel: 'main', x: 0, y: 79, w: 1600, h: 722, z: 1 }
    },
    vitrine: {
      panneau:  { titre: '📝 Le texte fixe', sel: '#panneau', x: 0, y: 0, w: 832, h: 824, z: 4 },
      meteo:    { titre: '🌤️ La météo, la date et l’heure', sel: '#meteoVitrine', x: 901, y: 26, w: 661, h: 112, z: 6 },
      qr:       { titre: '🔳 Le QR code', sel: '#qrEncart', x: 1346, y: 486, w: 230, h: 314, z: 4, auto: 1 },
      bandeau:  { titre: '📢 Le texte défilant', sel: '#bandeau', x: 0, y: 824, w: 1600, h: 76, z: 9, accent: 1 },
      scene:    { titre: '🖼️ Les diapositives', sel: 'main', x: 576, y: 0, w: 1024, h: 824, z: 1 }
    }
  };
  const IMMINENT_DEFAUT = { titre1: 'Votre cours commence', titre2: 'Vos cours commencent', derriere: 'voile', couleur: '#0B0E14',
                            cle: '', assombrir: 0.7, carte: '', carteTexte: '', rayon: 26, heure: 'texte', moniteur: 1, vehicule: 1 };

  function nettoyerBloc(b, d){
    b = (b && typeof b === 'object') ? b : {};
    return {
      x: Math.round(nombre(b.x, -400, 2000, d.x)), y: Math.round(nombre(b.y, -400, 1300, d.y)),
      w: Math.round(nombre(b.w, 30, 2000, d.w)), h: Math.round(nombre(b.h, 20, 1300, d.h)),
      cache: b.cache ? 1 : 0,
      fond: couleur(b.fond, ''), contour: couleur(b.contour, ''), texte: couleur(b.texte, ''), accent: couleur(b.accent, ''),
      rayon: Math.round(nombre(b.rayon, -1, 400, -1)), taille: Math.round(nombre(b.taille, 50, 250, 100)),
      titre: texte(b.titre, 60),
      moniteur: b.moniteur === 0 ? 0 : 1, vehicule: b.vehicule === 0 ? 0 : 1, lieu: b.lieu === 0 ? 0 : 1
    };
  }
  function nettoyerMep(m){
    m = (m && typeof m === 'object') ? m : {};
    const out = { v: 1 };
    ['accueil', 'vitrine'].forEach(ou => {
      const src = (m[ou] && m[ou].blocs) || {};
      out[ou] = { blocs: {} };
      Object.keys(BLOCS[ou]).forEach(k => { out[ou].blocs[k] = nettoyerBloc(src[k], BLOCS[ou][k]); });
    });
    const i = (m.imminent && typeof m.imminent === 'object') ? m.imminent : {};
    out.imminent = {
      titre1: texte(i.titre1, 60) || IMMINENT_DEFAUT.titre1,
      titre2: texte(i.titre2, 60) || IMMINENT_DEFAUT.titre2,
      derriere: ['voile', 'couleur', 'photo'].indexOf(i.derriere) !== -1 ? i.derriere : 'voile',
      couleur: couleur(i.couleur, IMMINENT_DEFAUT.couleur),
      cle: cleDePhoto(i.cle),
      assombrir: nombre(i.assombrir, 0, 0.95, IMMINENT_DEFAUT.assombrir),
      carte: couleur(i.carte, ''), carteTexte: couleur(i.carteTexte, ''),
      rayon: Math.round(nombre(i.rayon, 0, 200, 26)),
      heure: i.heure === 'pastille' ? 'pastille' : 'texte',
      moniteur: i.moniteur === 0 ? 0 : 1, vehicule: i.vehicule === 0 ? 0 : 1
    };
    return out;
  }
  function photosDeLaMep(m){ const n = nettoyerMep(m); return n.imminent.derriere === 'photo' && n.imminent.cle ? [n.imminent.cle] : []; }

  /* Le CSS d'une mise en page pour un écran. ⚠️ Chaque valeur sort de
     nettoyerMep : des nombres et des couleurs vérifiées, rien d'autre. */
  function cssMep(m, ou){
    const n = nettoyerMep(m);
    const b = n[ou === 'vitrine' ? 'vitrine' : 'accueil'].blocs;
    const defs = BLOCS[ou === 'vitrine' ? 'vitrine' : 'accueil'];
    const r = v => Math.round(v * 100) / 100;
    let s = ':root{--ex:calc(100vw / 1600);--ey:calc(100vh / 900);}' +
      'body.mep header{position:static;display:block;height:0;min-height:0;padding:0;margin:0;border:0;background:none;' +
        '-webkit-backdrop-filter:none;backdrop-filter:none;}' +
      'body.mep main{flex:none;}' +
      'body.mep .scene{left:0 !important;right:0 !important;width:auto !important;}' +
      'body.mep footer{position:fixed;left:0;bottom:0;background:none;border:0;-webkit-backdrop-filter:none;backdrop-filter:none;padding:2px 12px;z-index:9;}' +
      'body.mep #imminent{position:fixed;inset:0;}' +
      'body.mep #decor{position:fixed;inset:0;width:100vw;height:100vh;}' +
      /* ⚠️ v1203 — la vitrine n'a pas ces quatre-là (sa date, son heure
         et sa météo sont dans « La météo, la date et l'heure ») : la ligne
         au-dessus remettait l'en-tête de l'accueil à l'écran, en haut à
         gauche, sans bloc pour le masquer. */
      (ou === 'vitrine' ? 'body.mep header{display:none !important;}' : '');
    Object.keys(defs).forEach(k => {
      const d = defs[k], x = b[k], z = k === 'scene' ? 1 : x.taille / 100, sel = 'body.mep ' + d.sel;
      if(x.cache){ s += sel + '{display:none !important;}'; return; }
      s += sel + '{position:fixed !important;margin:0 !important;right:auto !important;bottom:auto !important;' +
        'left:calc(var(--ex) * ' + r(x.x / z) + ') !important;top:calc(var(--ey) * ' + r(x.y / z) + ') !important;' +
        'width:calc(var(--ex) * ' + r(x.w / z) + ') !important;' +
        (d.auto ? 'height:auto !important;max-height:calc(var(--ey) * ' + r(x.h / z) + ') !important;'
                : 'height:calc(var(--ey) * ' + r(x.h / z) + ') !important;') +
        'zoom:' + r(z) + ';z-index:' + d.z + ';box-sizing:border-box;}';
      if(k === 'nom' || k === 'date' || k === 'heure' || k === 'meteo' && ou !== 'vitrine'){
        s += sel + '{display:flex;align-items:center;overflow:hidden;' + (k === 'heure' || k === 'meteo' ? 'justify-content:flex-end;' : '') + '}';
      }
      if(x.fond) s += sel + '{background:' + x.fond + ' !important;-webkit-backdrop-filter:none !important;backdrop-filter:none !important;}';
      if(x.fond && (k === 'nom' || k === 'date' || k === 'heure' || (k === 'meteo' && ou !== 'vitrine'))) s += sel + '{padding:4px 14px;}';
      if(x.contour) s += sel + '{border:2px solid ' + x.contour + ' !important;}';
      if(x.rayon >= 0) s += sel + '{border-radius:' + x.rayon + 'px !important;overflow:hidden;}';
      if(x.texte) s += sel + ',' + sel + ' *{color:' + x.texte + ' !important;}';
      if(x.accent){
        if(k === 'planning') s += sel + ' h2,' + sel + ' .cours .h,' + sel + ' .cours .v{color:' + x.accent + ' !important;}';
        else if(k === 'bandeau') s += sel + '{border-top-color:' + x.accent + ' !important;}' + sel + ' .sep{color:' + x.accent + ' !important;}';
        else if(k === 'nom') s += sel + '{color:' + x.accent + ' !important;}';
      }
      if(k === 'planning'){
        if(!x.moniteur) s += sel + ' .cours .mn{display:none !important;}';
        if(!x.vehicule) s += sel + ' .cours .v{display:none !important;}';
        if(!x.lieu) s += sel + ' .cours .v .ou{display:none !important;}';
        if(x.fond) s += sel + '::after{display:none;}';
      }
    });
    return s;
  }

  /* « Vos cours commencent » */
  function cssImminent(m, lienPhoto){
    const i = nettoyerMep(m).imminent;
    let s = '';
    if(i.derriere === 'voile') s += '#imminent{background:' + avecAlpha(i.couleur, i.assombrir) + ' !important;}';
    else if(i.derriere === 'couleur') s += '#imminent{background:' + i.couleur + ' !important;-webkit-backdrop-filter:none;backdrop-filter:none;}';
    else if(i.derriere === 'photo'){
      const u = i.cle && lienPhoto ? String(lienPhoto(i.cle) || '') : '';
      const voile = 'linear-gradient(rgba(11,14,20,' + i.assombrir + '),rgba(11,14,20,' + i.assombrir + '))';
      s += '#imminent{background:' + voile + (u ? ',url("' + u.replace(/["\\\n\r]/g, encodeURIComponent) + '") center/cover' : '') + ' !important;}';
    }
    if(i.carte) s += '#imminent .bloc{background:' + i.carte + ' !important;border:0 !important;box-shadow:0 20px 50px rgba(0,0,0,.4);}';
    s += '#imminent .bloc{border-radius:' + i.rayon + 'px !important;}';
    if(i.carteTexte) s += '#imminent .bloc .be,#imminent .bloc .bm,#imminent .bloc .bv .ou{color:' + i.carteTexte + ' !important;}';
    if(i.heure === 'pastille') s += '#imminent .bh{background:var(--accent);color:#0B0E14 !important;border-radius:999px;padding:2px 26px;align-self:center;}';
    if(!i.moniteur) s += '#imminent .bm{display:none !important;}';
    if(!i.vehicule) s += '#imminent .bv{display:none !important;}';
    return s;
  }

  window.Tele = {
    LUTINS: LUTINS, DECORS: DECORS, THEMES_BASE: THEMES_BASE, ORDRE_THEMES: ORDRE_THEMES, BLOCS: BLOCS, IMMINENT_DEFAUT: IMMINENT_DEFAUT,
    lancer: lancer, vignetteLutin: vignetteLutin,
    nettoyerTheme: nettoyerTheme, nettoyerAnimation: nettoyerAnimation, themesComplets: themesComplets,
    paques: paques, dansLaPeriode: dansLaPeriode, joursAvant: joursAvant, themeDuJour: themeDuJour, cssTheme: cssTheme,
    nettoyerMep: nettoyerMep, cssMep: cssMep, cssImminent: cssImminent, photosDeLaMep: photosDeLaMep,
    couleur: couleur, avecAlpha: avecAlpha
  };
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-tele.js'] = true;
