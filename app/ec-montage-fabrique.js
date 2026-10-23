/* Déployé le 23/10/2026 à 16:12 — v1254 */
/* ============================================================
   ec-montage-fabrique.js — 🎞️ FABRIQUER LA VIDÉO (option B, v1253)

   David, le 23 octobre : « A puis B » — le montage se joue à la
   lecture (A, v1252), et l'ordinateur du bureau sait aussi en
   FABRIQUER un vrai fichier MP4 (B) : tout incrusté dans l'image, en
   H.264 que tous les téléphones lisent. Puis : « je te laisse faire
   le flou ».

   ⚠️ UNE VIDÉO FLOUTÉE SE FABRIQUE, TOUJOURS (son choix du 23/10) :
   un flou posé par-dessus une vidéo brute n'est qu'un cache — la
   plaque reste lisible par le lien du fichier. Ici, la zone floutée
   est REDESSINÉE dans l'image (pixels réduits puis flous) : elle
   n'existe plus nulle part, et la vidéo d'origine est effacée.

   ⚠️ LE MÊME DESSIN QUE LE LECTEUR. Les tailles suivent la largeur
   de la vidéo (ECMontage.BASES, l'unité « --mvU ») : un texte occupe
   la même part de l'image dans le fichier et dans l'appli.

   ⚠️ CHROME OU EDGE, SUR UN ORDINATEUR. Le navigateur encode lui-même
   (WebCodecs) ; l'image avance au rythme de la vidéo (≈ sa durée),
   l'onglet doit rester ouvert et visible. Un téléphone, un Safari, un
   Firefox : on le dit, on ne tente rien.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */
(function(G){
  'use strict';
  var M = G.ECMontage;
  var ICI = (document.currentScript && document.currentScript.src) || '';
  var DOSSIER = ICI ? ICI.replace(/[^\/]*$/, '') : 'app/';
  var FPS = 30, TAUX = 48000;

  function chargerLeMuxer(){
    if(G.Mp4Muxer) return Promise.resolve();
    return new Promise(function(ok, ko){
      var s = document.createElement('script');
      s.src = DOSSIER + 'ec-mp4-muxer.js?v=' + M.V;
      s.onload = function(){ G.Mp4Muxer ? ok() : ko(new Error('La fabrique des fichiers MP4 n’a pas pu se charger.')); };
      s.onerror = function(){ ko(new Error('La fabrique des fichiers MP4 n’a pas pu se charger.')); };
      document.head.appendChild(s);
    });
  }

  /* ---------- l'ordinateur sait-il faire ? ---------- */
  function tailleDeSortie(l, h){
    l = l || 1080; h = h || 1920;
    var long = Math.max(l, h), court = Math.min(l, h);
    var k = Math.min(1, 1920 / long, 1080 / court);
    var pair = function(x){ return Math.max(2, Math.round(x * k / 2) * 2); };
    return { l: pair(l), h: pair(h) };
  }
  function possible(o){
    o = o || {};
    var raison = function(t){ return { ok: false, raison: t }; };
    if(!G.VideoEncoder || !G.AudioEncoder || !G.VideoFrame || !G.AudioData || !G.OfflineAudioContext)
      return Promise.resolve(raison('Ce navigateur ne sait pas fabriquer de vidéo. Ouvre l’appli dans Chrome ou Edge, sur l’ordinateur du bureau.'));
    if(!('requestVideoFrameCallback' in HTMLVideoElement.prototype))
      return Promise.resolve(raison('Ce navigateur ne sait pas lire la vidéo image par image. Ouvre l’appli dans Chrome ou Edge, sur l’ordinateur du bureau.'));
    if(/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || ''))
      return Promise.resolve(raison('Une vidéo se fabrique sur l’ordinateur du bureau (Chrome ou Edge) : sur un téléphone, ce serait très long et souvent impossible.'));
    var t = tailleDeSortie(o.l, o.h);
    /* « essai » : VP9 et Opus, que sait encoder le Chromium des bancs
       (sans H.264) — jamais utilisé par l'appli elle-même. */
    var essais = (o.essai || G.EC_FABRIQUE_ESSAI)
      ? [{ v: 'vp09.00.10.08', mv: 'vp9', a: 'opus', ma: 'opus' }]
      : [{ v: 'avc1.640028', mv: 'avc', a: 'mp4a.40.2', ma: 'aac' }, { v: 'avc1.4d0028', mv: 'avc', a: 'mp4a.40.2', ma: 'aac' }, { v: 'avc1.42e028', mv: 'avc', a: 'mp4a.40.2', ma: 'aac' }];
    var debit = Math.round(Math.min(6e6, Math.max(2e6, t.l * t.h * 2.2)));
    var suivant = function(i){
      if(i >= essais.length) return Promise.resolve(raison('Cet ordinateur ne sait pas encoder le H.264 que lisent tous les téléphones. Essaie avec Chrome ou Edge à jour.'));
      var e = essais[i];
      var cv = { codec: e.v, width: t.l, height: t.h, bitrate: debit, framerate: FPS };
      if(e.mv === 'avc') cv.avc = { format: 'avc' };
      var ca = { codec: e.a, sampleRate: TAUX, numberOfChannels: 2, bitrate: 128000 };
      return Promise.all([VideoEncoder.isConfigSupported(cv), AudioEncoder.isConfigSupported(ca)]).then(function(x){
        if(x[0].supported && x[1].supported) return { ok: true, video: cv, audio: ca, muxV: e.mv, muxA: e.ma, l: t.l, h: t.h };
        return suivant(i + 1);
      }).catch(function(){ return suivant(i + 1); });
    };
    return suivant(0);
  }

  /* ============================================================
     LE DESSIN D'UNE IMAGE — ce que le lecteur montre, à la main
     ============================================================ */
  function fondDuStyle(s){
    return s.fond === 'noir' ? 'rgba(0,0,0,.72)' : s.fond === 'blanc' ? 'rgba(255,255,255,.9)' : s.fond === 'citron' ? '#B6FF0E' : '';
  }
  function couper(ctx, texte, largeur){
    var out = [];
    String(texte || '').split('\n').forEach(function(ligne){
      var mots = ligne.split(/(\s+)/), cour = '';
      mots.forEach(function(m){
        var essai = cour + m;
        if(cour.trim() && ctx.measureText(essai.trim()).width > largeur){ out.push(cour.trim()); cour = m.trim() ? m : ''; }
        else cour = essai;
      });
      out.push(cour.trim());
    });
    return out;
  }
  function rond(ctx, x, y, w, h, r){
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  /* Un bloc de texte stylé. o : { x, y, l (largeur max), centre, interligne, plein (le fond prend toute la largeur), alpha } */
  function bloc(ctx, texte, s, base, persos, o){
    var p = M.policeDe(s.police, persos);
    var t = M.TAILLES.filter(function(x){ return x[0] === s.taille; })[0] || M.TAILLES[1];
    var taille = base * t[2];
    ctx.save();
    ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    ctx.font = p[1] + ' ' + taille + 'px ' + p[0];
    ctx.textBaseline = 'top';
    var fond = fondDuStyle(s);
    var padX = fond ? taille * 0.5 : 0, padY = fond ? taille * 0.2 : 0;
    var lignes = couper(ctx, texte, o.l - padX * 2);
    var ih = taille * (o.interligne || 1.25);
    var larg = 0;
    lignes.forEach(function(l){ larg = Math.max(larg, ctx.measureText(l).width); });
    var bw = o.plein ? o.l : larg + padX * 2, bh = lignes.length * ih + padY * 2;
    var bx = o.centre ? o.x - bw / 2 : o.x, by = o.y;
    if(o.basEn !== undefined) by = o.basEn - bh;
    if(fond){ ctx.fillStyle = fond; rond(ctx, bx, by, bw, bh, taille * 0.3); ctx.fill(); }
    ctx.fillStyle = s.couleur;
    lignes.forEach(function(l, i){
      var lx = o.centre ? o.x - ctx.measureText(l).width / 2 : bx + padX;
      var ly = by + padY + i * ih + (ih - taille) / 2;
      if(!fond){
        var sombre = M.lum(s.couleur) < 0.18;
        ctx.shadowColor = sombre ? '#fff' : 'rgba(0,0,0,.9)'; ctx.shadowBlur = taille * 0.35; ctx.shadowOffsetY = sombre ? 0 : taille * 0.06;
        ctx.fillText(l, lx, ly);
        ctx.shadowBlur = taille * 0.18;
      }
      ctx.fillText(l, lx, ly);
      ctx.shadowColor = 'transparent';
    });
    ctx.restore();
    return { x: bx, y: by, l: bw, h: bh };
  }

  /* ============================================================
     FABRIQUER

     o : { recette, clips: [{ lien }], musique (lien), persos,
           sousTitres: [{de, a, texte}], incruster (booléen),
           essai (VP9/Opus, pour les bancs), avance(fraction, texte),
           jeton: { annule } }
     Rend : { blob, l, h, duree, de, a }
     ============================================================ */
  function fabriquer(o){
    var r = M.recettePropre(o.recette, (o.clips || []).length);
    var segs = M.segments(r);
    var jeton = o.jeton || {};
    var avance = o.avance || function(){};
    var persos = o.persos || {};
    var c0 = r.clips[0] || {};
    var cfg, W, H, U, can, ctx, tmp, tctx, snap, sctx, video, muxer, venc, aenc, erreur = null;
    var cues = o.incruster ? M.decouperCues(o.sousTitres || []) : [];
    var arreter = function(){ if(jeton.annule) throw new Error('Fabrication annulée.'); if(erreur) throw erreur; };

    /* ---------- le déroulé, comme le lecteur ---------- */
    var etapes = [], t = 0;
    var pousser = function(e){ e.t0 = t; t += e.d; etapes.push(e); };
    var dTr = function(x){ return x === 'aucune' ? 0 : x === 'noir' ? 0.8 : x === 'glisse' ? 0.6 : 1.2; };
    if(r.copy.on) pousser({ s: 'copy', d: M.DUREE_COPY });
    if(r.titre.on){ pousser({ s: 'noir', d: 0.5 }); pousser({ s: 'titre', d: r.titre.duree }); }
    segs.forEach(function(sg, k){
      var tr = k === 0 ? (r.titre.on ? r.tr.titre : (r.copy.on ? 'noir' : 'aucune')) : r.tr.coupe;
      pousser({ s: 'tr', type: tr, vers: k, d: dTr(tr) });
      pousser({ s: 'seg', k: k, d: sg.a - sg.de });
    });
    if(r.gen.on){ pousser({ s: 'tr', type: r.tr.fin, vers: 'gen', d: dTr(r.tr.fin) }); pousser({ s: 'gen', d: M.DUREE_GEN + 1.2 }); }
    var total = t;
    var segE = etapes.filter(function(e){ return e.s === 'seg'; });
    var fenetre = { de: segE.length ? segE[0].t0 : 0, a: segE.length ? segE[segE.length - 1].t0 + segE[segE.length - 1].d : total };

    /* ---------- les cartes : leur fondu, comme en CSS (0,9 s) ---------- */
    var cartes = { copy: { on: false, depuis: 0, a: 0 }, titre: { on: false, depuis: 0, a: 0 } };
    var alpha = function(c, tt){ return c.on ? Math.min(1, c.a + (tt - c.depuis) / 0.9) : Math.max(0, c.a - (tt - c.depuis) / 0.9); };
    var poser = function(n, on, tt){ var c = cartes[n]; if(c.on === on) return; c.a = alpha(c, tt); c.on = on; c.depuis = tt; };
    var gen = { on: false, haut: 100, dx: 0, dy: 0 };
    var enVideo = false, tContenu = 0, video0 = { dx: 0, dy: 0, visible: false };
    var precedent = null;      /* l'image d'avant une transition (canvas) */

    /* ---------- les sources ---------- */
    function charger(ci, temps){
      return new Promise(function(ok, ko){
        var c = r.clips[ci], src = (o.clips[c.i] || {}).lien;
        var fini = false;
        var fin = function(){ if(!fini){ fini = true; ok(); } };
        var chercher = function(){
          if(Math.abs(video.currentTime - temps) < 0.02 && video.readyState >= 2){ fin(); return; }
          video.addEventListener('seeked', fin, { once: true });
          video.currentTime = temps;
          setTimeout(fin, 8000);
        };
        if(video.getAttribute('data-src') !== src){
          video.setAttribute('data-src', src);
          if(!/^blob:|^data:/.test(src)) video.crossOrigin = 'anonymous'; else video.removeAttribute('crossorigin');
          video.src = src;
          video.addEventListener('loadeddata', chercher, { once: true });
          video.addEventListener('error', function(){ ko(new Error('Une vidéo ne se lit pas : ' + ((video.error && video.error.message) || 'format inconnu'))); }, { once: true });
        }else chercher();
      });
    }

    /* ---------- dessiner une image du résultat ---------- */
    function placeVideo(sl, sh){
      var k = Math.min(W / sl, H / sh), w = sl * k, h = sh * k;
      return { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h };
    }
    function dessinerImage(tt, source, sl, sh){
      ctx.fillStyle = '#0B0B0B'; ctx.fillRect(0, 0, W, H);
      if(source && sl && sh){
        var pl = placeVideo(sl, sh), bouge = (source === video);
        ctx.drawImage(source, pl.x + (bouge ? video0.dx * W : 0), pl.y + (bouge ? video0.dy * H : 0), pl.w, pl.h);
      }
      if(enVideo){
        /* 🙈 les flous, redessinés dans l'image : réduits en gros pixels,
           agrandis, puis flous — rien de la plaque ne survit */
        (r.flous || []).forEach(function(f){
          if(tContenu < f.de - 0.02 || tContenu > f.a + 0.02) return;
          var p = M.placeFlou(f, tContenu); if(!p) return;
          var x = p.x / 100 * W, y = p.y / 100 * H, w = p.w / 100 * W, h = p.h / 100 * H;
          var pw = Math.max(2, Math.round(w / 14)), ph = Math.max(2, Math.round(h / 14));
          tmp.width = pw; tmp.height = ph;
          tctx.imageSmoothingEnabled = true;
          tctx.drawImage(can, x, y, w, h, 0, 0, pw, ph);
          ctx.save();
          ctx.beginPath();
          if(f.rond) ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); else ctx.rect(x, y, w, h);
          ctx.clip();
          ctx.filter = 'blur(' + Math.max(4, Math.round(U * 2.5)) + 'px)';
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(tmp, 0, 0, pw, ph, x - U * 3, y - U * 3, w + U * 6, h + U * 6);
          ctx.restore();
        });
        (r.textes || []).forEach(function(x){
          if(tContenu < x.de - 0.05 || tContenu > x.a + 0.05) return;
          bloc(ctx, x.texte, x.style, M.BASES.texte * U, persos, { x: x.x / 100 * W, y: x.y / 100 * H, l: (98 - x.x) / 100 * W });
        });
        if(cues.length){
          var c = null; for(var i = 0; i < cues.length; i++) if(tContenu >= cues[i].de && tContenu <= cues[i].a){ c = cues[i]; break; }
          if(c) bloc(ctx, c.texte, { police: 'classique', taille: 'm', couleur: '#FFFFFF', fond: 'noir' }, (W > H ? 2.6 : M.BASES.st) * U, persos, { x: W / 2, basEn: (r.fili.on && r.fili.pos.charAt(0) === 'b') ? Math.min(H * 0.92, H - 10 * U) : H * 0.92, l: W * 0.9, centre: true, interligne: 1.3 });
        }
        if(r.fili.on) dessinerFili();
      }
      var ac = alpha(cartes.copy, tt), at = alpha(cartes.titre, tt);
      if(ac > 0.001) carte(ac, function(){ return [{ texte: r.copy.texte, s: r.copy.style, b: M.BASES.copy, il: 1.5 }]; });
      if(at > 0.001) carte(at, function(){ var l = [{ texte: r.titre.texte || ' ', s: r.titre.style, b: M.BASES.titre, il: 1.25 }]; if(r.titre.sous) l.push({ texte: r.titre.sous, s: { police: r.titre.style.police, taille: 'm', couleur: r.titre.style.couleur, fond: 'aucun' }, b: M.BASES.sous, il: 1.25, marge: 2 * U, alpha: 0.85 }); return l; });
      if(gen.on){
        ctx.save(); ctx.translate(gen.dx * W, gen.dy * H);
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        bloc(ctx, r.gen.texte, Object.assign({}, r.gen.style, { fond: 'aucun' }), M.BASES.gen * U, persos, { x: W / 2, y: gen.haut / 100 * H, l: W, centre: true, interligne: 2.4 });
        ctx.restore();
      }
    }
    function dessinerFili(){
      var s = r.fili.style, p = r.fili.pos;
      var t0 = M.TAILLES.filter(function(x){ return x[0] === s.taille; })[0] || M.TAILLES[1];
      var taille = M.BASES.fili * U * t0[2];
      ctx.save();
      var pol = M.policeDe(s.police, persos);
      ctx.font = pol[1] + ' ' + taille + 'px ' + pol[0];
      var lw = ctx.measureText(r.fili.texte).width;
      ctx.restore();
      var fond = fondDuStyle(s), mx = taille * 0.8, my = taille * 0.6;
      var bw = lw + (fond ? taille : 0), bh = taille * 1.3 + (fond ? taille * 0.4 : 0);
      var x = p[1] === 'g' ? mx : p[1] === 'd' ? W - mx - bw : (W - bw) / 2;
      var y = p[0] === 'h' ? my : H - my - bh;
      if(!fond){ x = p[1] === 'g' ? mx : p[1] === 'd' ? W - mx - lw : (W - lw) / 2; }
      bloc(ctx, r.fili.texte, s, M.BASES.fili * U, persos, { x: x, y: y, l: W });
    }
    function carte(a, contenu){
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      var pad = 0.08 * W, l = W - pad * 2;
      /* mesurer la hauteur, puis centrer */
      var morceaux = contenu();
      var mesure = document.createElement('canvas').getContext('2d');
      var hauteurs = morceaux.map(function(m){
        var p = M.policeDe(m.s.police, persos), tl = M.TAILLES.filter(function(x){ return x[0] === m.s.taille; })[0] || M.TAILLES[1];
        var taille = m.b * U * tl[2];
        mesure.font = p[1] + ' ' + taille + 'px ' + p[0];
        var pad2 = fondDuStyle(m.s) ? taille * 0.5 : 0;
        return couper(mesure, m.texte, l - pad2 * 2).length * taille * m.il + (fondDuStyle(m.s) ? taille * 0.4 : 0) + (m.marge || 0);
      });
      var y = (H - hauteurs.reduce(function(s, x){ return s + x; }, 0)) / 2;
      morceaux.forEach(function(m, i){
        y += (m.marge || 0);
        bloc(ctx, m.texte, m.s, m.b * U, persos, { x: W / 2, y: y, l: l, centre: true, interligne: m.il, plein: !!fondDuStyle(m.s), alpha: a * (m.alpha || 1) });
        y += hauteurs[i] - (m.marge || 0);
      });
    }
    function voile(type, q){
      if(q <= 0) return;
      ctx.save(); ctx.fillStyle = '#000';
      if(type === 'noir'){ ctx.globalAlpha = Math.min(1, q); ctx.fillRect(0, 0, W, H); }
      else {
        /* la roue : quatre pales qui grandissent depuis le centre */
        var cx = W / 2, cy = H / 2, rr = Math.hypot(W, H);
        for(var k = 0; k < 4; k++){
          var a0 = -Math.PI / 2 + k * Math.PI / 2;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, rr, a0, a0 + q * Math.PI / 2); ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore();
    }

    /* ---------- encoder une image ---------- */
    var nImages = 0, dernierTs = -1;
    function encoderImage(tt){
      var ts = Math.round(tt * 1e6);
      if(ts <= dernierTs) return Promise.resolve();
      dernierTs = ts;
      var f = new VideoFrame(can, { timestamp: ts, duration: Math.round(1e6 / FPS) });
      venc.encode(f, { keyFrame: nImages % (FPS * 2) === 0 });
      f.close();
      nImages++;
      if(venc.encodeQueueSize > 12){
        return new Promise(function(ok){
          var fin = function(){ if(venc.encodeQueueSize <= 4){ ok(); } else setTimeout(fin, 15); };
          setTimeout(fin, 15);
        });
      }
      return Promise.resolve();
    }

    /* Les étapes sans vidéo qui joue : une image tous les 1/30 s. */
    async function etapeDessinee(e){
      var n = Math.round(e.d * FPS);
      for(var i = 0; i < n; i++){
        arreter();
        var tl = i / FPS, tt = e.t0 + tl;
        var source = null, sl = 0, sh = 0;
        if(e.s === 'copy'){ poser('copy', true, e.t0); }
        if(e.s === 'noir'){ poser('copy', false, e.t0); }
        if(e.s === 'titre'){ poser('titre', true, e.t0); }
        var q = 0;
        if(e.s === 'tr'){
          var typ = e.type, moitie = tl < e.d / 2;
          var basculer = function(){
            if(e.bascule) return; e.bascule = true;
            poser('copy', false, tt); poser('titre', false, tt);
            if(e.vers === 'gen'){ enVideo = false; gen.on = true; gen.haut = 100; }
            else { enVideo = true; video0.visible = true; tContenu = segs[e.vers].off; }
          };
          if(typ === 'glisse'){ basculer(); var k = 1 - Math.pow(1 - Math.min(1, tl / e.d), 3); var cible = (e.vers === 'gen') ? gen : video0; cible.dx = 1 - k; cible.dy = 1 - k; }
          else if(typ === 'aucune'){ basculer(); }
          else { if(!moitie) basculer(); q = moitie ? tl / (e.d / 2) : (e.d - tl) / (e.d / 2); }
        }
        if(e.s === 'gen'){ gen.on = true; gen.haut = 100 - Math.min(1, tl / M.DUREE_GEN) * 160; }
        /* ce qu'on voit derrière : la vidéo en attente, ou l'image d'avant */
        if(e.s === 'tr'){
          if(e.vers === 'gen' || !e.bascule) source = precedent;
          else source = video;
        }
        if(source === video){ sl = video.videoWidth; sh = video.videoHeight; }
        else if(source){ sl = source.width; sh = source.height; }
        dessinerImage(tt, source, sl, sh);
        if(q > 0) voile(typ === 'roue' ? 'roue' : 'noir', q);
        await encoderImage(tt);
        avance(tt / total, 'images');
      }
      if(e.s === 'tr'){ video0.dx = video0.dy = 0; gen.dx = gen.dy = 0; }
    }

    /* Un morceau : la vidéo joue, et chaque image qu'elle présente est
       redessinée avec ce qui se pose dessus. */
    function etapeVideo(e){
      var sg = segs[e.k];
      return new Promise(function(ok, ko){
        var fini = false;
        var finir = function(){
          if(fini) return; fini = true; video.pause();
          /* l'image de fin, gardée pour la transition qui suit */
          precedent = document.createElement('canvas');
          precedent.width = video.videoWidth || W; precedent.height = video.videoHeight || H;
          try{ precedent.getContext('2d').drawImage(video, 0, 0, precedent.width, precedent.height); }catch(x){}
          ok();
        };
        var image = function(maintenant, meta){
          if(fini) return;
          try{ arreter(); }catch(x){ fini = true; video.pause(); ko(x); return; }
          var mt = meta.mediaTime;
          if(mt >= sg.a - 0.5 / FPS || video.ended){ finir(); return; }
          if(mt >= sg.de - 0.01){
            tContenu = sg.off + Math.max(0, mt - sg.de);
            var tt = e.t0 + Math.max(0, mt - sg.de);
            dessinerImage(tt, video, video.videoWidth, video.videoHeight);
            var p = encoderImage(tt);
            avance(tt / total, 'images');
            if(venc.encodeQueueSize > 12){ video.pause(); p.then(function(){ if(!fini){ video.play().catch(function(){}); } }); }
          }
          video.requestVideoFrameCallback(image);
        };
        enVideo = true; video0.visible = true;
        charger(sg.ci, sg.de).then(function(){
          video.requestVideoFrameCallback(image);
          video.addEventListener('ended', finir, { once: true });
          var garde = setInterval(function(){ if(fini){ clearInterval(garde); return; } if(video.currentTime >= sg.a - 0.02) { clearInterval(garde); finir(); } }, 200);
          video.play().catch(function(x){ ko(new Error('La vidéo ne démarre pas : ' + x.message)); });
        }, ko);
      });
    }

    /* ---------- le son : tout le mélange, d'un coup ---------- */
    function decoder(lien){
      return fetch(lien).then(function(x){ if(!x.ok) throw new Error('HTTP ' + x.status); return x.arrayBuffer(); })
        .then(function(b){ return new OfflineAudioContext(2, TAUX, TAUX).decodeAudioData(b); })
        .catch(function(){ return null; });   /* une vidéo sans son */
    }
    async function leSon(){
      var oac = new OfflineAudioContext(2, Math.max(1, Math.ceil(total * TAUX)), TAUX);
      var tampons = {};
      for(var k = 0; k < segE.length; k++){
        var sg = segs[segE[k].k], i = r.clips[sg.ci].i;
        if(tampons[i] === undefined){ avance(0, 'son'); tampons[i] = await decoder(o.clips[i].lien); arreter(); }
        var b = tampons[i]; if(!b) continue;
        var src = oac.createBufferSource(); src.buffer = b;
        var g = oac.createGain(); g.gain.setValueAtTime(r.musique.volVid, 0);
        var T = segE[k].t0, len = sg.a - sg.de;
        (r.muets || []).forEach(function(m){
          var de = Math.max(m.de, sg.off), a = Math.min(m.a, sg.off + len);
          if(a <= de) return;
          g.gain.setValueAtTime(0, T + de - sg.off); g.gain.setValueAtTime(r.musique.volVid, T + a - sg.off);
        });
        src.connect(g); g.connect(oac.destination);
        src.start(T, sg.de, len);
      }
      if(o.musique && r.musique.on){
        var mb = await decoder(o.musique); arreter();
        if(mb){
          var ms = oac.createBufferSource(); ms.buffer = mb; ms.loop = true;
          var mg = oac.createGain(), v = r.musique.vol;
          mg.gain.setValueAtTime(v, 0);
          if(r.musique.ou === 'bords'){ mg.gain.setValueAtTime(0, fenetre.de); mg.gain.setValueAtTime(v, fenetre.a); }
          var eg = etapes.filter(function(e){ return e.s === 'gen'; })[0];
          if(eg){ mg.gain.setValueAtTime(v, eg.t0 + eg.d * 0.7); mg.gain.linearRampToValueAtTime(0, eg.t0 + eg.d); }
          ms.connect(mg); mg.connect(oac.destination);
          ms.start(0); ms.stop(total);
        }
      }
      var rendu = await oac.startRendering();
      arreter();
      var g0 = rendu.getChannelData(0), g1 = rendu.getChannelData(1);
      var BLOC = 1024;
      for(var j = 0; j < rendu.length; j += BLOC){
        var n = Math.min(BLOC, rendu.length - j);
        var d = new Float32Array(n * 2);
        d.set(g0.subarray(j, j + n), 0); d.set(g1.subarray(j, j + n), n);
        var ad = new AudioData({ format: 'f32-planar', sampleRate: TAUX, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(j / TAUX * 1e6), data: d });
        aenc.encode(ad); ad.close();
        if(aenc.encodeQueueSize > 50) await new Promise(function(ok){ setTimeout(ok, 5); });
      }
      await aenc.flush();
    }

    return (async function(){
      var cap = await possible({ l: c0.l, h: c0.h, essai: o.essai });
      if(!cap.ok) throw new Error(cap.raison);
      cfg = cap;
      await chargerLeMuxer();
      await M.chargerLesPolices(M.stylesDe(r), persos);
      W = cfg.l; H = cfg.h; U = W / 100;
      can = document.createElement('canvas'); can.width = W; can.height = H;
      ctx = can.getContext('2d');
      tmp = document.createElement('canvas'); tctx = tmp.getContext('2d');
      video = document.createElement('video'); video.muted = true; video.playsInline = true; video.preload = 'auto';
      /* hors de l'écran, mais dans la page : un lecteur détaché ne
         présente pas toujours ses images */
      video.style.cssText = 'position:fixed;left:-10000px;top:0;width:160px;height:90px;opacity:0;pointer-events:none;';
      document.body.appendChild(video);
      var Mx = G.Mp4Muxer;
      muxer = new Mx.Muxer({
        target: new Mx.ArrayBufferTarget(),
        video: { codec: cfg.muxV, width: W, height: H, frameRate: FPS },
        audio: { codec: cfg.muxA, numberOfChannels: 2, sampleRate: TAUX },
        fastStart: 'in-memory', firstTimestampBehavior: 'offset'
      });
      venc = new VideoEncoder({ output: function(c, m){ muxer.addVideoChunk(c, m); }, error: function(e){ erreur = e; } });
      venc.configure(Object.assign({ latencyMode: 'quality' }, cfg.video));
      aenc = new AudioEncoder({ output: function(c, m){ muxer.addAudioChunk(c, m); }, error: function(e){ erreur = e; } });
      aenc.configure(cfg.audio);
      try{
        avance(0, 'son');
        await leSon();
        for(var i = 0; i < etapes.length; i++){
          var e = etapes[i];
          arreter();
          if(e.s === 'seg'){ await etapeVideo(e); }
          else {
            /* la vidéo du morceau suivant, prête avant sa transition */
            if(e.s === 'tr' && e.vers !== 'gen'){ await charger(segs[e.vers].ci, segs[e.vers].de); }
            if(e.s === 'tr' && e.vers === 'gen'){ video0.visible = false; }
            await etapeDessinee(e);
          }
        }
        arreter();
        await venc.flush();
        muxer.finalize();
        avance(1, 'fini');
        return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), l: W, h: H, duree: Math.round(total * 100) / 100, de: Math.round(fenetre.de * 100) / 100, a: Math.round(fenetre.a * 100) / 100 };
      } finally {
        try{ video.pause(); video.removeAttribute('src'); video.load(); video.remove(); }catch(x){}
        try{ if(venc.state !== 'closed') venc.close(); }catch(x){}
        try{ if(aenc.state !== 'closed') aenc.close(); }catch(x){}
      }
    })();
  }

  /* ============================================================
     LA FENÊTRE DE FABRICATION — une barre, un temps, « Annuler »
     ============================================================ */
  function fenetreDeFabrication(o){
    M.poserLeStyle();
    return new Promise(function(rendre, echouer){
      var fond = document.createElement('div');
      fond.className = 'mvFond'; fond.style.zIndex = '1600';
      var b = document.createElement('section');
      b.className = 'mv'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-modal', 'true'); b.setAttribute('aria-labelledby', 'mvFabT');
      b.style.marginTop = '12vh';
      b.innerHTML = '<div class="mvTete"><h2 id="mvFabT" tabindex="-1">🎞️ ' + (o.titre || 'Fabrication de la vidéo') + '</h2></div>' +
        '<p class="mvAide" id="mvFabAide"></p>' +
        '<div class="mvChamp"><label for="mvFabBarre" class="lab">Avancement <span class="val" id="mvFabPct">0 %</span></label>' +
        '<progress id="mvFabBarre" max="100" value="0" style="width:100%;height:18px;accent-color:#3B6900"></progress></div>' +
        '<p class="mvAide" id="mvFabEtat" role="status" aria-live="polite">Préparation…</p>' +
        '<div class="mvActions"><button type="button" class="mvBtn" id="mvFabStop">Annuler</button></div>';
      fond.appendChild(b); document.body.appendChild(fond);
      b.querySelector('#mvFabAide').textContent = o.aide || 'Garde cet onglet ouvert et visible : l’image avance au rythme de la vidéo. Environ ' + M.mmss(o.dureeEstimee || 0) + '.';
      b.querySelector('#mvFabT').focus();
      var jeton = { annule: false };
      var t0 = Date.now();
      b.querySelector('#mvFabStop').addEventListener('click', function(){ jeton.annule = true; b.querySelector('#mvFabEtat').textContent = 'Arrêt…'; });
      var clavier = function(ev){ if(ev.key === 'Tab'){ ev.preventDefault(); b.querySelector('#mvFabStop').focus(); } };
      document.addEventListener('keydown', clavier, true);
      var dernier = -1;
      var maj = function(f, quoi){
        var p = Math.max(0, Math.min(100, Math.floor(f * 100)));
        if(p === dernier && quoi !== 'son') return;
        dernier = p;
        b.querySelector('#mvFabBarre').value = p;
        b.querySelector('#mvFabPct').textContent = p + ' %';
        var ecoule = (Date.now() - t0) / 1000;
        var reste = f > 0.03 ? ecoule / f - ecoule : 0;
        b.querySelector('#mvFabEtat').textContent = quoi === 'son' ? 'Le son : mélange en cours…' :
          quoi === 'fini' ? 'Terminé.' : 'Les images : ' + p + ' %' + (reste ? ' · encore ≈ ' + M.mmss(reste) : '');
      };
      var fermer = function(){ document.removeEventListener('keydown', clavier, true); if(fond.parentNode) fond.parentNode.removeChild(fond); };
      fabriquer(Object.assign({}, o, { jeton: jeton, avance: maj })).then(function(x){ fermer(); rendre(x); }, function(e){ fermer(); echouer(e); });
    });
  }

  /* Donner le fichier à enregistrer sur l'ordinateur. */
  function telecharger(blob, nom){
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = String(nom || 'video').replace(/[\\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) + '.mp4';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 60000);
  }

  G.ECFabrique = { possible: possible, fabriquer: fabriquer, fenetre: fenetreDeFabrication, telecharger: telecharger, tailleDeSortie: tailleDeSortie };
})(window);

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-montage-fabrique.js'] = true;
