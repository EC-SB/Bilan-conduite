/* Déployé le 23/10/2026 à 16:12 — v1254 */
/* ============================================================
   ec-montage.js — 🎬 LE MONTAGE DES VIDÉOS DU PARCOURS (v1252)

   David, le 23 octobre : « récupère le début de la vidéo et la fin
   pour avoir un squelette, afin que je puisse mettre des vidéos dans
   les groupes sans avoir à passer par un logiciel de montage avant ;
   il faut qu'on puisse rajouter un titre, couper la vidéo si
   besoin ». Puis : le copyright (« en bas au milieu, pas que dans les
   coins »), les transitions, la musique, le son coupé sur un passage,
   plusieurs vidéos bout à bout, du texte positionnable, plusieurs
   polices, tailles et couleurs.

   ⚠️ LE MONTAGE SE JOUE, IL NE SE FABRIQUE PAS (option A, son choix).
   La vidéo brute est déposée telle quelle ; à côté, une RECETTE dit où
   couper et quoi poser par-dessus. Ce fichier la joue — chez l'élève
   (eleve.html) comme au bureau (l'éditeur, l'aperçu). Une seule
   mécanique pour les deux : deux copies auraient fini par montrer à
   l'élève autre chose que ce que le bureau a vérifié.

   ⚠️ UNE RECETTE SE SUFFIT À ELLE-MÊME. Les textes de l'avertissement,
   du copyright et du générique y sont RECOPIÉS au moment du montage :
   changer le squelette de l'école ne réécrit pas en silence les
   vidéos déjà publiées.

   ⚠️ CE FICHIER EST LU PAR DEUX PAGES (index.html et eleve.html) :
   rien d'ici ne suppose les outils de l'appli (pas de fenetre, pas de
   showToast, pas de flèches « => » qu'un vieil iPhone d'élève lirait
   mal).

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */
(function(G){
  'use strict';
  var V = '1254';
  var ICI = (document.currentScript && document.currentScript.src) || '';
  var DOSSIER = ICI ? ICI.replace(/[^\/]*$/, '') : 'app/';

  /* ---------- les styles de texte ---------- */
  /* [id, nom affiché, familles, graisse, nom de la police embarquée] */
  var POLICES = [
    ['classique',  'Classique (comme tes vidéos)', '"Segoe UI",Selawik,"Helvetica Neue",system-ui,sans-serif', 300, ''],
    ['ronde',      'Ronde',            '"EC Ronde","Nunito",system-ui,sans-serif',           800, 'ronde'],
    ['grasse',     'Grasse',           '"EC Grasse","Arial Black",Impact,sans-serif',        400, 'grasse'],
    ['manuscrite', 'Manuscrite',       '"EC Manuscrite","Segoe Print","Bradley Hand",cursive', 700, 'manuscrite'],
    ['machine',    'Machine à écrire', '"EC Machine","Courier New",Courier,monospace',       700, 'machine'],
    ['elegante',   'Élégante',         '"EC Elegante",Georgia,"Times New Roman",serif',      600, 'elegante']];
  var TAILLES = [['p', 'Petit', 0.8], ['m', 'Moyen', 1], ['g', 'Grand', 1.35], ['tg', 'Très grand', 1.8]];
  var COULEURS = [['#FFFFFF', 'Blanc'], ['#FFD400', 'Jaune'], ['#B6FF0E', 'Citron'], ['#FF3B30', 'Rouge'], ['#3DA5FF', 'Bleu'], ['#0B0B0B', 'Noir']];
  var FONDS = [['aucun', 'Aucun (ombre)', ''], ['noir', 'Bandeau noir', '#1C1C1C'], ['blanc', 'Bandeau blanc', '#F4F4F4'], ['citron', 'Bandeau citron', '#B6FF0E']];
  var TRANSITIONS = [['aucune', 'Aucune'], ['noir', 'Fondu au noir'], ['glisse', 'Glissement'], ['roue', 'Roue']];
  var PLACES = [['hg', '↖ En haut à gauche'], ['hm', '↑ En haut au milieu'], ['hd', '↗ En haut à droite'],
                ['bg', '↙ En bas à gauche'], ['bm', '↓ En bas au milieu'], ['bd', '↘ En bas à droite']];
  var DUREE_COPY = 6.9, DUREE_GEN = 6.5;

  function style(p, t, c, f){ return { police: p, taille: t, couleur: c, fond: f }; }

  /* Le squelette mesuré sur les 21 vidéos déjà montées (« Questions 1
     à 10 ») : il sert tant que l'école n'a rien réglé. */
  var DEFAUTS = {
    copy: { on: true, texte: 'Toute reproduction ou transmission est interdite :\nmerci de respecter notre travail\ncomme nous vous respectons\nen vous donnant le meilleur de nous-mêmes :)\nVous voulez aider vos amis :\nfaites-les s’inscrire chez nous ;)', style: style('classique', 'm', '#FFFFFF', 'aucun') },
    titre: { on: true, duree: 2.5, style: style('classique', 'm', '#FFFFFF', 'aucun') },
    fili: { on: true, texte: 'Évolution Conduites ®', pos: 'bd', style: style('classique', 'm', '#FFFFFF', 'aucun') },
    gen: { on: true, texte: 'Évolution Conduites\n4 rue St Benoît\n22000 Saint Brieuc\n09 83 55 56 87\nevolutionconduites.fr', style: style('classique', 'm', '#FFFFFF', 'aucun') },
    textes: { style: style('ronde', 'm', '#FFFFFF', 'noir') },
    tr: { titre: 'glisse', coupe: 'noir', fin: 'roue' }
  };

  function copie(o){ return JSON.parse(JSON.stringify(o)); }
  function entre(x, a, b){ x = Number(x); if(!isFinite(x)) x = a; return Math.max(a, Math.min(b, x)); }
  function un(liste, v, defaut){ for(var i = 0; i < liste.length; i++) if(liste[i][0] === v) return v; return defaut; }
  function texte(v, max){ return String(v == null ? '' : v).replace(/\r/g, '').slice(0, max); }

  /* ---------- un style propre : rien d'autre que ce qu'on sait dessiner ---------- */
  function stylePropre(s, defaut){
    s = (s && typeof s === 'object') ? s : {};
    var d = defaut || DEFAUTS.titre.style;
    var police = String(s.police || '');
    if(!/^p:[a-z0-9]{1,12}$/.test(police)) police = un(POLICES, police, d.police);
    var couleur = /^#[0-9A-Fa-f]{6}$/.test(String(s.couleur || '')) ? String(s.couleur).toUpperCase() : d.couleur;
    return { police: police, taille: un(TAILLES, s.taille, d.taille), couleur: couleur, fond: un(FONDS, s.fond, d.fond) };
  }

  /* ============================================================
     LA RECETTE — sa seule forme, nettoyée à l'entrée comme à la
     sortie. Une recette abîmée ne doit jamais casser la lecture :
     on garde ce qui se comprend, on jette le reste.
     ============================================================ */
  function recettePropre(r, nbClips){
    r = (r && typeof r === 'object') ? r : {};
    var n = Math.max(1, Math.min(4, Number(nbClips) || (r.clips && r.clips.length) || 1));
    var clips = (Array.isArray(r.clips) ? r.clips : []).slice(0, 4).map(function(c){
      c = c || {};
      var debut = entre(c.debut, 0, 36000), fin = entre(c.fin, 0, 36000);
      var coupes = (Array.isArray(c.coupes) ? c.coupes : []).slice(0, 40).map(function(x){ return Math.round(entre(x, 0, 36000) * 10) / 10; });
      var retires = {};
      Object.keys((c.retires && typeof c.retires === 'object') ? c.retires : {}).slice(0, 40).forEach(function(k){ if(/^\d{1,5}\.\d{2}$/.test(k)) retires[k] = 1; });
      return { i: Math.max(0, Math.min(n - 1, parseInt(c.i, 10) || 0)), debut: debut, fin: fin, duree: entre(c.duree, 0, 36000),
               coupes: coupes, retires: retires, l: Math.round(entre(c.l, 0, 8000)), h: Math.round(entre(c.h, 0, 8000)) };
    }).filter(function(c){ return c.fin > c.debut; });
    var parties = {};
    ['copy', 'titre', 'fili', 'gen'].forEach(function(k){
      var x = (r[k] && typeof r[k] === 'object') ? r[k] : {};
      var d = DEFAUTS[k];
      parties[k] = { on: x.on === undefined ? d.on : !!x.on, style: stylePropre(x.style, d.style) };
      if(k !== 'titre') parties[k].texte = texte(x.texte === undefined ? d.texte : x.texte, k === 'fili' ? 80 : 600);
    });
    parties.titre.texte = texte(r.titre && r.titre.texte, 100);
    parties.titre.sous = texte(r.titre && r.titre.sous, 100);
    parties.titre.duree = un([[2], [2.5], [4]].map(function(x){ return [x[0]]; }), Number(r.titre && r.titre.duree), 2.5);
    parties.fili.pos = un(PLACES, r.fili && r.fili.pos, 'bd');
    var textes = (Array.isArray(r.textes) ? r.textes : []).slice(0, 30).map(function(x){
      x = x || {};
      return { texte: texte(x.texte, 120), de: entre(x.de, 0, 36000), a: entre(x.a, 0, 36000),
               x: entre(x.x, 0, 96), y: entre(x.y, 0, 96), style: stylePropre(x.style, DEFAUTS.textes.style) };
    }).filter(function(x){ return x.a > x.de; });
    var muets = (Array.isArray(r.muets) ? r.muets : []).slice(0, 30).map(function(m){
      return { de: entre(m && m.de, 0, 36000), a: entre(m && m.a, 0, 36000) };
    }).filter(function(m){ return m.a > m.de; });
    /* 🙈 v1253 — le flou : une zone (rectangle ou rond) et ses points
       de passage (David : « des points de passage » pour un objet qui
       zigzague) ; entre deux points, elle glisse en ligne droite. */
    var flous = (Array.isArray(r.flous) ? r.flous : []).slice(0, 20).map(function(f){
      f = f || {};
      var pts = (Array.isArray(f.points) ? f.points : []).slice(0, 60).map(function(p){
        p = p || {};
        var w = entre(p.w, 4, 100), h = entre(p.h, 4, 100);
        return { t: Math.round(entre(p.t, 0, 36000) * 10) / 10, x: entre(p.x, 0, 100 - w), y: entre(p.y, 0, 100 - h), w: w, h: h };
      }).sort(function(a, b){ return a.t - b.t; });
      return { de: entre(f.de, 0, 36000), a: entre(f.a, 0, 36000), rond: !!f.rond, points: pts };
    }).filter(function(f){ return f.a > f.de && f.points.length; });
    var mu = (r.musique && typeof r.musique === 'object') ? r.musique : {};
    var tr = (r.tr && typeof r.tr === 'object') ? r.tr : {};
    var fichiers = (r.fichiers && typeof r.fichiers === 'object') ? r.fichiers : {};
    var polices = {};
    var fp = (fichiers.polices && typeof fichiers.polices === 'object') ? fichiers.polices : {};
    Object.keys(fp).slice(0, 10).forEach(function(k){ if(/^[a-z0-9]{1,12}$/.test(k) && cleValide(fp[k])) polices[k] = String(fp[k]); });
    var out = {
      v: 1, clips: clips, copy: parties.copy, titre: parties.titre, fili: parties.fili, gen: parties.gen,
      textes: textes, muets: muets, flous: flous,
      musique: { on: !!mu.on, ou: mu.ou === 'bords' ? 'bords' : 'tout', vol: entre(mu.vol === undefined ? 0.35 : mu.vol, 0, 1), volVid: entre(mu.volVid === undefined ? 1 : mu.volVid, 0, 1), nom: texte(mu.nom, 80) },
      tr: { titre: un(TRANSITIONS, tr.titre, 'glisse'), coupe: un(TRANSITIONS, tr.coupe, 'noir'), fin: un(TRANSITIONS, tr.fin, 'roue') },
      fichiers: {}
    };
    if(cleValide(fichiers.musique)) out.fichiers.musique = String(fichiers.musique);
    if(Object.keys(polices).length) out.fichiers.polices = polices;
    /* 💬 v1253 — les sous-titres : le texte vit dans un fichier .vtt
       déposé à côté (la cellule d'un guide ne tiendrait pas dix
       minutes de paroles) ; la recette dit s'il y en a, et leur style. */
    if(cleValide(fichiers.soustitres)) out.fichiers.soustitres = String(fichiers.soustitres);
    var st = (r.sousTitres && typeof r.sousTitres === 'object') ? r.sousTitres : {};
    out.sousTitres = { on: !!st.on, n: Math.max(0, Math.min(5000, parseInt(st.n, 10) || 0)) };
    /* 🎞️ v1253 — une vidéo FABRIQUÉE (le flou l'impose) : tout est
       dans l'image ; la recette ne dit plus que la fenêtre du contenu
       dans le fichier (pour « passer le début » et les 90 %). */
    if(r.fabrique && typeof r.fabrique === 'object'){
      var fa = r.fabrique;
      out.fabrique = { de: entre(fa.de, 0, 36000), a: entre(fa.a, 0, 36000), flou: !!fa.flou, le: texte(fa.le, 20), duree: entre(fa.duree, 0, 36000) };
      if(!(out.fabrique.a > out.fabrique.de)) delete out.fabrique;
    }
    out.duree = Math.round(dureeContenu(out) * 10) / 10;
    return out;
  }
  /* La place d'un flou à l'instant t : entre deux points de passage,
     en ligne droite ; avant le premier et après le dernier, immobile. */
  function placeFlou(f, t){
    var p = f.points;
    if(!p || !p.length) return null;
    if(t <= p[0].t || p.length === 1) return p[0];
    for(var i = 1; i < p.length; i++){
      if(t <= p[i].t){
        var a = p[i - 1], b = p[i], k = (b.t > a.t) ? (t - a.t) / (b.t - a.t) : 1;
        return { t: t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k };
      }
    }
    return p[p.length - 1];
  }
  /* ---------- les sous-titres, au format WebVTT ---------- */
  function hmsVtt(t){ t = Math.max(0, t); var h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t - h * 3600 - m * 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s.toFixed(3); }
  function versVTT(cues){
    return 'WEBVTT\n\n' + (cues || []).filter(function(c){ return c && c.a > c.de && String(c.texte || '').trim(); }).map(function(c, i){
      return (i + 1) + '\n' + hmsVtt(c.de) + ' --> ' + hmsVtt(c.a) + '\n' + String(c.texte).replace(/-->/g, '→').replace(/\n{2,}/g, '\n').trim();
    }).join('\n\n') + '\n';
  }
  /* 💬 v1254 — UNE PHRASE DE WHISPER PEUT FAIRE QUARANTE MOTS, et elle
     couvrait toute l'image sur un téléphone. À l'écran, elle se coupe en
     morceaux de deux lignes au plus (≈ 80 signes), de préférence après
     une ponctuation, et le temps se partage selon la longueur. Le texte
     relu au bureau, lui, ne change pas. */
  function decouperCues(cues, max){
    max = max || 80;
    var out = [];
    (cues || []).forEach(function(c){
      var t = String(c.texte || '').replace(/\s+/g, ' ').trim();
      if(t.length <= max){ out.push({ de: c.de, a: c.a, texte: t }); return; }
      var mots = t.split(' '), bouts = [], cour = '';
      mots.forEach(function(m){
        var essai = cour ? cour + ' ' + m : m;
        if(essai.length > max && cour){ bouts.push(cour); cour = m; }
        else {
          cour = essai;
          if(cour.length >= max * 0.55 && /[,.;:!?]$/.test(m)){ bouts.push(cour); cour = ''; }
        }
      });
      if(cour) bouts.push(cour);
      var total = bouts.reduce(function(s2, b){ return s2 + b.length; }, 0), t0 = c.de, d = c.a - c.de;
      bouts.forEach(function(b){ var l = d * b.length / total; out.push({ de: t0, a: t0 + l, texte: b }); t0 += l; });
    });
    return out;
  }
  function depuisVTT(texte){
    var out = [];
    String(texte || '').replace(/\r/g, '').split(/\n\n+/).forEach(function(b){
      var l = b.split('\n'), k = -1;
      for(var i = 0; i < l.length; i++) if(/-->/.test(l[i])){ k = i; break; }
      if(k < 0) return;
      var m = l[k].match(/([\d:.]+)\s*-->\s*([\d:.]+)/);
      if(!m) return;
      var sec = function(x){ var p = x.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
      var tx = l.slice(k + 1).join('\n').trim();
      if(tx) out.push({ de: sec(m[1]), a: sec(m[2]), texte: tx.slice(0, 300) });
    });
    return out.slice(0, 5000);
  }
  function cleValide(c){ return /^guides\/[A-Za-z0-9]{22}\.[a-z0-9]{1,5}$/.test(String(c || '')); }

  /* Une recette neuve, sur le squelette de l'école. */
  function recetteNeuve(reglages, titre, sous){
    var s = squelettePropre(reglages);
    return recettePropre({
      clips: [], copy: s.copy, fili: s.fili, gen: s.gen,
      titre: { on: s.titre.on, texte: titre || '', sous: sous || '', duree: s.titre.duree, style: s.titre.style },
      tr: s.tr, textes: [], muets: [], musique: { on: false }
    }, 1);
  }

  /* Le squelette de l'école (Outils › Ce qu'on écrit › 🎬 Squelette
     des vidéos), avec ce qui manque repris des vidéos d'origine. */
  function squelettePropre(s){
    s = (s && typeof s === 'object') ? s : {};
    var out = {};
    ['copy', 'titre', 'fili', 'gen'].forEach(function(k){
      var x = (s[k] && typeof s[k] === 'object') ? s[k] : {}, d = DEFAUTS[k];
      out[k] = { on: x.on === undefined ? d.on : !!x.on, style: stylePropre(x.style, d.style) };
      if(k !== 'titre') out[k].texte = texte(x.texte === undefined ? d.texte : x.texte, k === 'fili' ? 80 : 600);
    });
    out.titre.duree = un([[2], [2.5], [4]], Number(s.titre && s.titre.duree), 2.5);
    out.fili.pos = un(PLACES, s.fili && s.fili.pos, 'bd');
    out.textes = { style: stylePropre(s.textes && s.textes.style, DEFAUTS.textes.style) };
    var tr = (s.tr && typeof s.tr === 'object') ? s.tr : {};
    out.tr = { titre: un(TRANSITIONS, tr.titre, 'glisse'), coupe: un(TRANSITIONS, tr.coupe, 'noir'), fin: un(TRANSITIONS, tr.fin, 'roue') };
    out.polices = (Array.isArray(s.polices) ? s.polices : []).slice(0, 10).map(function(p){
      return { id: String((p && p.id) || '').replace(/[^a-z0-9]/g, '').slice(0, 12), nom: texte(p && p.nom, 40), cle: cleValide(p && p.cle) ? String(p.cle) : '', lien: String((p && p.lien) || '') };
    }).filter(function(p){ return p.id && p.nom; });
    return out;
  }

  /* ---------- le temps ---------- */
  function morceauxDe(c){
    var b = [c.debut].concat((c.coupes || []).filter(function(x){ return x > c.debut + 0.2 && x < c.fin - 0.2; }).sort(function(a, b){ return a - b; })).concat([c.fin]);
    var out = [];
    for(var i = 0; i < b.length - 1; i++) out.push({ de: b[i], a: b[i + 1], garde: !(c.retires || {})[b[i].toFixed(2)] });
    return out;
  }
  function segments(r){
    var out = [], off = 0;
    (r.clips || []).forEach(function(c, ci){
      morceauxDe(c).forEach(function(m){ if(!m.garde) return; out.push({ ci: ci, i: c.i, de: m.de, a: m.a, off: off }); off += m.a - m.de; });
    });
    return out;
  }
  function dureeContenu(r){ return segments(r).reduce(function(s, m){ return s + m.a - m.de; }, 0); }
  function dureeTotale(r){
    return (r.copy.on ? DUREE_COPY : 0) + (r.titre.on ? r.titre.duree + 0.5 : 0) + dureeContenu(r) + (r.gen.on ? DUREE_GEN + 1.2 : 0);
  }
  function ou(r, t){
    var s = segments(r);
    for(var i = 0; i < s.length; i++){ var l = s[i].a - s[i].de; if(t < s[i].off + l || i === s.length - 1) return { seg: s[i], k: i, temps: Math.min(s[i].a, s[i].de + Math.max(0, t - s[i].off)) }; }
    return null;
  }
  function hms(t){ t = Math.max(0, Number(t) || 0); var m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1).replace('.', ','); }
  function mmss(t){ t = Math.max(0, Math.floor(Number(t) || 0)); var m = Math.floor(t / 60), s = t % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function lu(t){ t = Math.round((Number(t) || 0) * 10) / 10; var m = Math.floor(t / 60), s = Math.round((t - m * 60) * 10) / 10; return (m ? m + ' minute' + (m > 1 ? 's ' : ' ') : '') + String(s).replace('.', ',') + ' seconde' + (s >= 2 ? 's' : ''); }

  /* Ce que le bureau lit sous la vignette du bloc. */
  function resume(r){
    var p = [];
    if(r.copy.on) p.push('avertissement');
    if(r.titre.on) p.push('titre « ' + (r.titre.texte || '…') + ' »');
    var segs = segments(r);
    p.push((r.clips.length > 1 ? r.clips.length + ' vidéos, ' : '') + segs.length + ' morceau' + (segs.length > 1 ? 'x' : '') + ' (' + mmss(dureeContenu(r)) + ')');
    if(r.textes.length) p.push(r.textes.length + ' texte' + (r.textes.length > 1 ? 's' : ''));
    if(r.muets.length) p.push('son coupé ×' + r.muets.length);
    if(r.musique.on) p.push('musique');
    if(r.flous && r.flous.length) p.push('flou ×' + r.flous.length);
    if(r.gen.on) p.push('générique');
    if(r.fabrique) return 'vidéo fabriquée' + (r.fabrique.flou ? ' (floutée)' : '');
    return p.join(' · ');
  }

  /* ---------- couleurs ---------- */
  function lum(h){ var r = [1, 3, 5].map(function(i){ var c = parseInt(h.substr(i, 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2]; }
  function contraste(a, b){ var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  /* Le contraste d'un style : contre son bandeau s'il en a un ; sans
     bandeau, c'est l'ombre qui porte le texte (noire, ou blanche pour
     un texte noir), donc toujours lisible. */
  function contrasteDuStyle(s){
    var f = FONDS.filter(function(x){ return x[0] === s.fond; })[0];
    return (f && f[2]) ? contraste(s.couleur, f[2]) : 99;
  }

  /* ---------- polices ---------- */
  function policeDe(id, persos){
    if(/^p:/.test(String(id))){
      var k = String(id).slice(2), p = (persos || {})[k];
      return ['"EC Perso ' + k + '",system-ui,sans-serif', 400, p ? p.nom : 'Police de l’école'];
    }
    var x = POLICES.filter(function(y){ return y[0] === id; })[0] || POLICES[0];
    return [x[2], x[3], x[1]];
  }
  function appliquerStyle(el, s, base, persos){
    var p = policeDe(s.police, persos);
    var t = TAILLES.filter(function(x){ return x[0] === s.taille; })[0] || TAILLES[1];
    var f = FONDS.filter(function(x){ return x[0] === s.fond; })[0] || FONDS[0];
    el.style.fontFamily = p[0]; el.style.fontWeight = p[1];
    el.style.fontSize = 'calc(' + base + ' * ' + t[2] + ')';
    el.style.color = s.couleur;
    if(f[2]){
      el.style.background = f[0] === 'noir' ? 'rgba(0,0,0,.72)' : (f[0] === 'blanc' ? 'rgba(255,255,255,.9)' : f[2]);
      el.style.textShadow = 'none'; el.style.padding = '.2em .5em'; el.style.borderRadius = '.3em';
    }else{
      el.style.background = 'transparent'; el.style.padding = '0';
      el.style.textShadow = lum(s.couleur) < 0.18 ? '0 0 3px #fff,0 0 6px #fff' : '0 1px 3px #000,0 0 6px rgba(0,0,0,.9)';
    }
  }

  /* ⚠️ LES POLICES SE CHARGENT QUAND ON EN A BESOIN. Les cinq polices
     embarquées pèsent ~130 Ko : un élève qui ouvre un guide sans
     vidéo montée ne doit pas les payer. */
  var chargees = {}, scriptPolices = null;
  function chargerLeFichierDesPolices(){
    if(G.EC_POLICES_MONTAGE) return Promise.resolve(G.EC_POLICES_MONTAGE);
    if(scriptPolices) return scriptPolices;
    scriptPolices = new Promise(function(ok){
      var s = document.createElement('script');
      s.src = DOSSIER + 'ec-montage-polices.js?v=' + V;
      s.onload = function(){ ok(G.EC_POLICES_MONTAGE || {}); };
      s.onerror = function(){ scriptPolices = null; ok({}); };
      document.head.appendChild(s);
    });
    return scriptPolices;
  }
  function stylesDe(r){
    var l = [r.copy.style, r.titre.style, r.fili.style, r.gen.style];
    (r.textes || []).forEach(function(x){ l.push(x.style); });
    return l;
  }
  /* persos : { id: { nom, lien } } — les polices de l'école, liens signés */
  function chargerLesPolices(styles, persos){
    if(!G.FontFace || !document.fonts) return Promise.resolve();
    var besoin = {};
    (styles || []).forEach(function(s){ if(s && s.police) besoin[s.police] = 1; });
    var attentes = [];
    var embarquees = Object.keys(besoin).filter(function(id){ var x = POLICES.filter(function(y){ return y[0] === id; })[0]; return x && x[4] && !chargees[id]; });
    if(embarquees.length){
      attentes.push(chargerLeFichierDesPolices().then(function(b64){
        return Promise.all(embarquees.map(function(id){
          var x = POLICES.filter(function(y){ return y[0] === id; })[0];
          if(!b64[x[4]] || chargees[id]) return null;
          chargees[id] = 1;
          var f = new FontFace(x[2].split(',')[0].replace(/"/g, ''), 'url(data:font/woff2;base64,' + b64[x[4]] + ')', { weight: String(x[3]) });
          document.fonts.add(f);
          return f.load().catch(function(){});
        }));
      }));
    }
    Object.keys(besoin).forEach(function(id){
      if(!/^p:/.test(id) || chargees[id]) return;
      var k = id.slice(2), p = (persos || {})[k];
      if(!p || !p.lien) return;
      chargees[id] = 1;
      var f = new FontFace('EC Perso ' + k, 'url(' + p.lien + ')');
      document.fonts.add(f);
      attentes.push(f.load().catch(function(){ chargees[id] = 0; }));
    });
    /* Jamais plus de 3 s d'attente : une police qui ne vient pas
       laisse la place à celle du téléphone, pas à un écran figé. */
    return Promise.race([Promise.all(attentes), new Promise(function(ok){ setTimeout(ok, 3000); })]);
  }

  /* ---------- la feuille de style, posée une fois ---------- */
  var CSS = [
    '.mvScene{position:relative;margin:0 auto;background:#0B0B0B;border-radius:12px;overflow:hidden;width:100%;max-width:300px;aspect-ratio:9/16;}',
    '.mvScene.paysage{max-width:100%;aspect-ratio:16/9;}',
    '.mvScene video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;}',
    '.mvCarte{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8%;background:#000;color:#fff;opacity:0;pointer-events:none;transition:opacity .9s;font-weight:300;z-index:4;}',
    '.mvCarte.on{opacity:1;}',
    '.mvCarte p{margin:0;}',
    '.mvCopy p{line-height:1.5;white-space:pre-line;}',
    '.mvTitreCarte .s{margin-top:6px !important;opacity:.85;}',
    '.mvFili{position:absolute;padding:8px 10px;pointer-events:none;opacity:0;transition:opacity .4s;z-index:3;line-height:1.3;}',
    '.mvFili.on{opacity:1;}',
    '.mvFili:not(.on){visibility:hidden;}',
    '.mvFili.hd{top:0;right:0;}.mvFili.hg{top:0;left:0;}.mvFili.bd{bottom:0;right:0;}.mvFili.bg{bottom:0;left:0;}',
    '.mvFili.hm{top:0;left:50%;transform:translateX(-50%);white-space:nowrap;}.mvFili.bm{bottom:0;left:50%;transform:translateX(-50%);white-space:nowrap;}',
    '.mvGen{position:absolute;inset:0;background:#000;color:#fff;overflow:hidden;opacity:0;pointer-events:none;z-index:5;}',
    '.mvGen.on{opacity:1;}',
    '.mvGen .roule{position:absolute;left:0;right:0;top:100%;text-align:center;line-height:2.4;white-space:pre-line;}',
    '.mvVoile{position:absolute;inset:0;pointer-events:none;background:#000;opacity:0;z-index:6;}',
    '.mvVoile.roue{opacity:1;-webkit-mask:repeating-conic-gradient(from 0deg,#000 0 calc(var(--p,0) * 90deg),transparent 0 90deg);mask:repeating-conic-gradient(from 0deg,#000 0 calc(var(--p,0) * 90deg),transparent 0 90deg);}',
    '.mvCalque{position:absolute;inset:0;overflow:hidden;z-index:3;pointer-events:none;}',
    '.mvTxt{position:absolute;line-height:1.25;overflow-wrap:anywhere;pointer-events:none;}',
    '.mvFlou{position:absolute;-webkit-backdrop-filter:blur(calc(var(--mvU,3px) * 3.5));backdrop-filter:blur(calc(var(--mvU,3px) * 3.5));background:rgba(128,128,128,.12);pointer-events:none;}',
    '.mvFlou.rond{border-radius:50%;}',
    /* 💬 v1254 — David : « sur téléphone, quand on met les sous-titres,
       ça prend tout l'écran ». La taille suit la vidéo, mais BORNÉE
       (13 à 22 px), et une vidéo en paysage, plus large, a son propre
       rapport : sinon le plein écran donnait des lettres de 60 px. */
    '.mvSt{position:absolute;left:50%;bottom:8%;transform:translateX(-50%);max-width:90%;width:max-content;text-align:center;z-index:3;pointer-events:none;color:#fff;background:rgba(0,0,0,.72);border-radius:.3em;padding:.15em .5em;line-height:1.3;white-space:pre-line;font-weight:500;font-family:"Segoe UI",Selawik,"Helvetica Neue",system-ui,sans-serif;font-size:clamp(13px, calc(var(--mvU,3px) * 4.6), 22px);}',
    '.mvScene.paysage .mvSt{font-size:clamp(13px, calc(var(--mvU,3px) * 2.6), 22px);bottom:6%;}',
    /* au-dessus du copyright quand il est en bas, jamais dessus */
    '.mvScene.filiBas .mvSt{bottom:max(8%, calc(var(--mvU,3px) * 10));}',
    '.mvScene.paysage.filiBas .mvSt{bottom:max(6%, calc(var(--mvU,3px) * 10));}',
    '.mvL-cc[aria-pressed=true]{background:#14161B !important;color:#fff !important;border-color:#14161B !important;}',
    '.mvGrand{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:72px;height:72px;border-radius:999px;border:0;background:rgba(255,255,255,.92);color:#0B0B0B;font-size:28px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.35);z-index:7;}',
    '.mvGrand:focus-visible{outline:3px solid #B6FF0E;outline-offset:3px;}',
    '.mvSr{position:absolute !important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}',
    /* le lecteur de l'élève */
    '.mvL{position:relative;margin:0 0 6px;}',
    '.mvL .mvScene{max-width:min(100%,360px);}',
    '.mvL .mvScene.paysage{max-width:100%;}',
    '.mvL-barre{display:flex;align-items:center;gap:6px;max-width:min(100%,360px);margin:6px auto 0;}',
    '.mvL .mvScene.paysage ~ .mvL-barre{max-width:100%;}',
    '.mvL-barre button,.mvL-passer{min-width:44px;min-height:44px;border-radius:12px;border:1px solid #9C9D95;background:#fff;color:#14161B;font:600 15px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer;padding:0 10px;}',
    '.mvL-barre button:focus-visible,.mvL-passer:focus-visible,.mvL-pos:focus-visible{outline:3px solid #14161B;outline-offset:2px;}',
    '.mvL-pos{flex:1;min-width:0;height:44px;margin:0;accent-color:#3B6900;}',
    '.mvL-temps{font:13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-variant-numeric:tabular-nums;color:inherit;white-space:nowrap;}',
    '.mvL-passer{position:absolute;right:calc(50% - min(50%,180px) + 10px);bottom:62px;z-index:8;background:rgba(255,255,255,.95);}',
    '.mvL .mvScene.paysage ~ .mvL-passer{right:10px;}',
    '.mvL.plein{position:fixed;inset:0;z-index:99999;background:#000;margin:0;display:flex;flex-direction:column;justify-content:center;padding:10px;}',
    /* 🖥️ v1254 — David : « quand on met en grand écran, la vidéo on ne
       l'a pas en entier ». La hauteur était imposée, la largeur suivait
       (9/16 ou 16/9) et débordait de l'écran du téléphone. Désormais la
       vidéo prend la plus grande taille qui TIENT, en largeur comme en
       hauteur. */
    '.mvL.plein .mvScene{max-width:none;max-height:none;height:auto;margin:0 auto;width:min(100%, calc((100vh - 84px) * 9 / 16));width:min(100%, calc((100dvh - 84px) * 9 / 16));}',
    '.mvL.plein .mvScene.paysage{width:min(100%, calc((100vh - 84px) * 16 / 9));width:min(100%, calc((100dvh - 84px) * 16 / 9));}',
    '.mvL.plein .mvL-barre{max-width:none;width:100%;color:#fff;}',
    '.mvL.plein .mvL-passer{right:20px;bottom:74px;}',
    '@media (prefers-reduced-motion: reduce){.mvCarte,.mvFili{transition:none;}}'
  ].join('\n');
  function poserLeStyle(){
    if(document.getElementById('mvStyles')) return;
    var s = document.createElement('style'); s.id = 'mvStyles'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ⚠️ LES TAILLES SUIVENT LA VIDÉO, PAS L'ÉCRAN — v1253. Une unité
     « --mvU » vaut le centième de la largeur de la scène : un texte
     posé occupe la même part de l'image en petit, en plein écran — et
     dans le fichier fabriqué, qui la dessine avec les mêmes nombres
     (ec-montage-fabrique.js). Les nombres ci-dessous redonnent, sur un
     téléphone, les tailles de la v1252. */
  var BASES = { copy: 4.7, titre: 7.8, sous: 4.7, fili: 3.9, gen: 5.7, texte: 5.2, st: 4.6 };
  function unite(n){ return 'calc(var(--mvU, 3px) * ' + n + ')'; }

  /* ---------- la scène : le même dessin pour l'élève et pour le bureau ---------- */
  function creerScene(){
    poserLeStyle();
    var sc = document.createElement('div');
    sc.className = 'mvScene';
    sc.innerHTML =
      '<video playsinline preload="metadata"></video>' +
      '<div class="mvCalque"></div>' +
      '<div class="mvSt" aria-hidden="true" hidden></div>' +
      '<div class="mvFili bd" aria-hidden="true"></div>' +
      '<div class="mvCarte mvCopy" aria-hidden="true"><p></p></div>' +
      '<div class="mvCarte mvTitreCarte" aria-hidden="true"><p class="t"></p><p class="s"></p></div>' +
      '<div class="mvGen" aria-hidden="true"><div class="roule"></div></div>' +
      '<div class="mvVoile"></div>' +
      '<button type="button" class="mvGrand" aria-label="Lire la vidéo">▶</button>';
    var q = function(s){ return sc.querySelector(s); };
    var mesurer = function(){ var w = sc.getBoundingClientRect().width; if(w) sc.style.setProperty('--mvU', (w / 100) + 'px'); };
    if(G.ResizeObserver){ try{ new ResizeObserver(mesurer).observe(sc); }catch(e){} }
    setTimeout(mesurer, 0);
    return { scene: sc, video: q('video'), calque: q('.mvCalque'), st: q('.mvSt'), fili: q('.mvFili'), copy: q('.mvCopy'), copyTxt: q('.mvCopy p'),
             titreCarte: q('.mvTitreCarte'), titreT: q('.mvTitreCarte .t'), titreS: q('.mvTitreCarte .s'),
             gen: q('.mvGen'), genTxt: q('.mvGen .roule'), voile: q('.mvVoile'), grand: q('.mvGrand') };
  }

  /* L'habillage posé dans la scène (textes et styles des cartes). */
  function habiller(S, r, persos){
    S.copyTxt.textContent = r.copy.texte; appliquerStyle(S.copyTxt, r.copy.style, unite(BASES.copy), persos);
    S.titreT.textContent = r.titre.texte || ' '; appliquerStyle(S.titreT, r.titre.style, unite(BASES.titre), persos);
    S.titreS.textContent = r.titre.sous || ''; S.titreS.hidden = !r.titre.sous;
    appliquerStyle(S.titreS, { police: r.titre.style.police, taille: 'm', couleur: r.titre.style.couleur, fond: 'aucun' }, unite(BASES.sous), persos);
    S.fili.textContent = r.fili.texte;
    var on = S.fili.classList.contains('on');
    S.fili.className = 'mvFili ' + r.fili.pos + (on ? ' on' : '');
    S.scene.classList.toggle('filiBas', !!(r.fili.on && r.fili.pos.charAt(0) === 'b'));
    appliquerStyle(S.fili, r.fili.style, unite(BASES.fili), persos);
    if(r.fili.style.fond === 'aucun') S.fili.style.padding = '.6em .8em';
    S.genTxt.textContent = r.gen.texte; appliquerStyle(S.genTxt, r.gen.style, unite(BASES.gen), persos);
    S.genTxt.style.background = 'transparent';
  }

  /* Les textes posés sur l'image, à l'instant t du contenu — et, dessous,
     les flous (v1253). Un flou ainsi posé n'est qu'un APERÇU : la vidéo
     brute garde ce qu'il cache, c'est pourquoi une vidéo floutée se
     fabrique (voir ec-montage-fabrique.js). */
  function dessinerTextes(S, r, t, persos, pour, pourFlou){
    var vus = [];
    S.calque.innerHTML = '';
    (r.flous || []).forEach(function(f, i){
      if(t < f.de - 0.05 || t > f.a + 0.05) return;
      var p = placeFlou(f, t); if(!p) return;
      var z = document.createElement('div');
      z.className = 'mvFlou' + (f.rond ? ' rond' : '');
      z.style.left = p.x + '%'; z.style.top = p.y + '%'; z.style.width = p.w + '%'; z.style.height = p.h + '%';
      if(pourFlou) pourFlou(z, i, p);
      S.calque.appendChild(z);
    });
    (r.textes || []).forEach(function(x, i){
      if(t < x.de - 0.05 || t > x.a + 0.05) return;
      var e = document.createElement('div');
      e.className = 'mvTxt';
      e.textContent = x.texte || ' ';
      e.style.left = x.x + '%'; e.style.top = x.y + '%'; e.style.maxWidth = (98 - x.x) + '%';
      appliquerStyle(e, x.style, unite(BASES.texte), persos);
      if(pour) pour(e, i);
      S.calque.appendChild(e);
      vus.push(i);
    });
    return vus;
  }

  /* ============================================================
     LE MOTEUR — il joue une recette dans une scène

     ⚠️ UNE HORLOGE QUI S'ARRÊTE AVEC LA PAUSE. L'avertissement, le
     titre, les transitions et le générique n'ont pas de vidéo pour
     dire l'heure : ils avancent sur une horloge à nous, qui ne tourne
     que pendant la lecture. Pendant un morceau, c'est la vidéo qui
     donne l'heure.

     ⚠️ ET UN MORCEAU NE DÉMARRE QUE PRÊT. Changer de vidéo, ou sauter
     dans la même, prend un instant sur une 4G : l'horloge attend que
     l'image soit là plutôt que de montrer un écran noir qui compte.
     ============================================================ */
  function moteur(S, o){
    var r = o.recette, clips = o.clips || [], persos = o.persos || {};
    var reduit = !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var video = S.video, musique = null;
    if(o.musique){ musique = new Audio(); musique.loop = true; musique.preload = 'auto'; musique.src = o.musique; }
    var segs = segments(r);
    /* 💬 v1253 — les sous-titres : affichés si l'élève a touché « CC ».
       « decalage » : dans un fichier fabriqué, le contenu ne commence
       qu'après l'avertissement et le titre, eux aussi dans l'image. */
    var cues = o.cues ? decouperCues(o.cues) : null, decal = Number(o.decalage) || 0;
    function poserSt(){
      if(!S.st) return;
      var c = null;
      if(cues && cues.length && et.enVideo && (!o.cc || o.cc())){
        var t = et.tContenu - decal;
        for(var i = 0; i < cues.length; i++) if(t >= cues[i].de && t <= cues[i].a){ c = cues[i]; break; }
      }
      S.st.hidden = !c;
      if(c && S.st.textContent !== c.texte) S.st.textContent = c.texte;
    }
    var et = { joue: false, i: -1, tLoc: 0, etapes: [], fini: false, attente: null, charge: -1, enVideo: false, tContenu: 0, dernier: null, introFaite: false };
    var ecouteurs = {};
    function emettre(n, a, b){ (ecouteurs[n] || []).forEach(function(f){ try{ f(a, b); }catch(e){} }); }

    habiller(S, r, persos);

    function srcDe(ci){
      var c = clips[r.clips[ci].i] || {};
      if(c.webm && !video.canPlayType('video/mp4; codecs="avc1.42E01E"')) return c.webm;
      return c.lien || c.src || '';
    }
    /* Mettre la vidéo ci à la seconde t : rend une promesse tenue
       quand l'image y est (ou au bout de 6 s, pour ne jamais rester
       bloqué). */
    function aller(ci, t){
      return new Promise(function(ok){
        var fait = false;
        var fin = function(){ if(fait) return; fait = true; ok(); };
        var chercher = function(){
          if(Math.abs((video.currentTime || 0) - t) < 0.05 && video.readyState >= 2){ fin(); return; }
          video.addEventListener('seeked', fin, { once: true });
          setTimeout(fin, 6000);
          try{ video.currentTime = t; }catch(e){ fin(); }
        };
        var voulu = srcDe(ci);
        var c = r.clips[ci];
        S.scene.classList.toggle('paysage', !!(c && c.l > c.h));
        /* La même vidéo déjà dans le lecteur (l'éditeur l'y a mise) : on
           ne la recharge pas, on y saute. */
        if(video.getAttribute('src') !== voulu){
          et.charge = ci;
          video.src = voulu;
          video.addEventListener('loadedmetadata', chercher, { once: true });
          setTimeout(fin, 8000);
        }else chercher();
      });
    }

    function construireEtapes(sauter){
      var l = [];
      if(!sauter && r.copy.on) l.push({ s: 'copy', d: DUREE_COPY });
      if(!sauter && r.titre.on){ l.push({ s: 'noir', d: 0.5 }); l.push({ s: 'titre', d: r.titre.duree }); }
      segs.forEach(function(sg, k){
        var tr = k === 0 ? ((!sauter && r.titre.on) ? r.tr.titre : 'aucune') : r.tr.coupe;
        if(k === 0 && !sauter && !r.titre.on && r.copy.on) tr = 'noir';
        l.push({ s: 'tr', type: tr, vers: k, d: dureeTr(tr) });
        l.push({ s: 'seg', k: k });
      });
      if(r.gen.on){ l.push({ s: 'tr', type: r.tr.fin, vers: 'gen', d: dureeTr(r.tr.fin) }); l.push({ s: 'gen', d: DUREE_GEN + 1.2 }); }
      return l;
    }
    function typeReel(t){ return (reduit && t !== 'aucune') ? 'noir' : t; }
    function dureeTr(t){ t = typeReel(t); return t === 'aucune' ? 0 : t === 'noir' ? 0.8 : t === 'glisse' ? 0.6 : 1.2; }

    function cartes(copyOn, titreOn, genOn){
      S.copy.classList.toggle('on', !!copyOn); S.titreCarte.classList.toggle('on', !!titreOn); S.gen.classList.toggle('on', !!genOn);
    }
    function poserFili(){ S.fili.classList.toggle('on', !!(r.fili.on && et.enVideo)); }
    function volumes(){
      var t = et.tContenu;
      var coupe = et.enVideo && (r.muets || []).some(function(m){ return t >= m.de && t <= m.a; });
      try{ video.volume = coupe ? 0 : r.musique.volVid; }catch(e){}
      video.muted = !!(coupe || o.muet);
      if(musique){
        var v = r.musique.vol;
        if(r.musique.ou === 'bords' && et.enVideo) v = 0;
        var e = et.etapes[et.i];
        if(e && e.s === 'gen' && et.tLoc > e.d * 0.7) v = v * Math.max(0, 1 - (et.tLoc - e.d * 0.7) / (e.d * 0.3));
        try{ musique.volume = Math.max(0, Math.min(1, v)); }catch(x){}
        musique.muted = !!o.muet;
      }
    }

    /* Entrer dans une étape */
    function entrer(){
      var e = et.etapes[et.i];
      et.tLoc = 0;
      if(!e){ finir(); return; }
      if(e.s === 'copy'){ video.style.opacity = 0; cartes(1, 0, 0); }
      else if(e.s === 'noir'){ cartes(0, 0, 0); video.style.opacity = 0; }
      else if(e.s === 'titre'){ cartes(0, 1, 0); }
      else if(e.s === 'tr'){
        e.bascule = false;
        e.pret = (e.vers === 'gen') ? Promise.resolve() : aller(segs[e.vers].ci, segs[e.vers].de);
        e.estPret = false;
        e.pret.then(function(){ e.estPret = true; });
        if(typeReel(e.type) === 'roue') S.voile.classList.add('roue');
      }
      else if(e.s === 'seg'){
        var sg = segs[e.k];
        et.enVideo = true; video.style.opacity = 1; cartes(0, 0, 0); poserFili();
        et.dernier = null;
        if(et.joue){ var p = video.play(); if(p && p.catch) p.catch(function(){}); }
        if(!et.introFaite){ et.introFaite = true; emettre('introFaite'); }
        emettre('etat');
        void sg;
      }
      else if(e.s === 'gen'){
        et.enVideo = false; poserFili(); S.calque.innerHTML = '';
        if(reduit) S.genTxt.style.top = '20%';
      }
    }
    function basculer(e){
      if(e.bascule) return;
      e.bascule = true;
      if(e.vers === 'gen'){ video.pause(); et.enVideo = false; poserFili(); poserSt(); S.calque.innerHTML = ''; cartes(0, 0, 1); S.genTxt.style.top = '100%'; }
      else { cartes(0, 0, 0); video.style.opacity = 1; et.enVideo = true; et.tContenu = segs[e.vers].off; poserFili(); dessinerTextes(S, r, et.tContenu, persos, o.surTexte); poserSt(); }
    }
    function rendreTr(e){
      var t = typeReel(e.type), p = e.d ? Math.min(1, et.tLoc / e.d) : 1;
      var cible = (e.vers === 'gen') ? S.gen : video;
      if(t === 'aucune'){ basculer(e); return true; }
      if(t === 'noir' || t === 'roue'){
        var moitie = p < 0.5;
        var q = moitie ? p * 2 : (1 - p) * 2;
        if(!moitie && !e.bascule){
          if(!e.estPret){ et.tLoc = e.d / 2 - 0.001; return false; }   /* on attend l'image */
          basculer(e);
        }
        if(t === 'noir') S.voile.style.opacity = q; else S.voile.style.setProperty('--p', q);
        return true;
      }
      /* glissement : l'arrivant glisse depuis le coin en bas à droite */
      if(!e.bascule){ if(!e.estPret){ et.tLoc = 0; return false; } basculer(e); }
      var k = 1 - Math.pow(1 - p, 3);
      cible.style.transform = p >= 1 ? '' : 'translate(' + ((1 - k) * 100) + '%,' + ((1 - k) * 100) + '%)';
      return true;
    }
    function quitterTr(e){
      basculer(e);
      S.voile.style.opacity = 0; S.voile.classList.remove('roue'); S.voile.style.removeProperty('--p');
      video.style.transform = ''; S.gen.style.transform = '';
    }

    var dernierPas = 0, boucle = null;
    function pas(){
      boucle = null;
      if(!et.joue) return;
      var maintenant = (G.performance && performance.now) ? performance.now() : Date.now();
      var dt = Math.min(0.25, (maintenant - dernierPas) / 1000);
      dernierPas = maintenant;
      var e = et.etapes[et.i];
      if(!e){ finir(); return; }
      if(e.s === 'seg'){
        var sg = segs[e.k];
        var t = Number(video.currentTime) || 0;
        if(!video.seeking && !video.paused){
          var tc = sg.off + Math.max(0, t - sg.de);
          /* Ce qui a vraiment été lu, dans le temps du MONTAGE : pas
             celui de la vidéo brute, dont une partie est coupée. */
          if(et.dernier !== null && tc > et.dernier && tc - et.dernier < 3) emettre('contenu', et.dernier, tc);
          et.dernier = tc;
          et.tContenu = tc;
        }else if(video.paused && et.joue && !video.ended && !video.seeking && maintenant - (et.relance || 0) > 700){
          /* un morceau qui attendait son image : on relance, sans
             mitrailler play() à chaque image */
          et.relance = maintenant;
          var p = video.play(); if(p && p.catch) p.catch(function(){});
        }
        dessinerTextes(S, r, et.tContenu, persos, o.surTexte);
        poserSt();
        volumes();
        emettre('temps', et.tContenu);
        if(t >= sg.a - 0.05 || video.ended){ video.pause(); suivant(); }
      }else{
        et.tLoc += dt;
        var avance = true;
        if(e.s === 'tr') avance = rendreTr(e);
        if(e.s === 'gen' && !reduit) S.genTxt.style.top = (100 - Math.min(1, et.tLoc / (DUREE_GEN)) * 160) + '%';
        if(avance && et.tLoc >= e.d){ if(e.s === 'tr') quitterTr(e); suivant(); }
        volumes();
        emettre('temps', et.tContenu);
      }
      planifier();
    }
    function planifier(){
      if(boucle) return;
      boucle = (G.requestAnimationFrame || function(f){ return setTimeout(f, 40); })(pas);
      /* Un onglet caché ne dessine plus : l'horloge passe alors par
         un minuteur, pour que la musique et le générique continuent. */
      if(document.hidden) { clearTimeout(et.secours); et.secours = setTimeout(function(){ if(boucle){ boucle = null; pas(); } }, 200); }
    }
    function suivant(){ et.i++; entrer(); }

    function finir(){
      et.joue = false; et.fini = true;
      video.pause(); if(musique) musique.pause();
      emettre('fin'); emettre('etat');
    }

    function lire(sauter){
      /* ⚠️ LA VIDÉO SE DÉVERROUILLE ICI, DANS LE GESTE DE L'ÉLÈVE. Un
         iPhone refuse « play() » s'il n'est pas appelé pendant un
         appui — et le premier morceau ne part qu'après les 10 s de
         l'avertissement et du titre, bien après l'appui. On lance
         donc la vidéo tout de suite, sans le son et cachée, puis on
         l'arrête : le téléphone la tient pour autorisée. */
      video.muted = true;
      var pv = video.play();
      if(pv && pv.then) pv.then(function(){ var e = et.etapes[et.i]; if(!e || e.s !== 'seg') video.pause(); }).catch(function(){});
      et.etapes = construireEtapes(!!sauter);
      et.i = 0; et.fini = false; et.tContenu = 0; et.enVideo = false; et.introFaite = !!sauter || !(r.copy.on || r.titre.on);
      S.grand.hidden = true;
      S.genTxt.style.top = '100%';
      if(musique){ try{ musique.currentTime = 0; }catch(e){} }
      reprendre(true);
      entrer();
    }
    function reprendre(sansEntrer){
      if(et.fini && !sansEntrer){ lire(false); return; }
      et.joue = true; S.grand.hidden = true;
      dernierPas = (G.performance && performance.now) ? performance.now() : Date.now();
      var e = et.etapes[et.i];
      if(e && e.s === 'seg'){ var p = video.play(); if(p && p.catch) p.catch(function(){}); }
      if(musique){ volumes(); var m = musique.play(); if(m && m.catch) m.catch(function(){}); }
      planifier(); emettre('etat');
    }
    function pause(){
      et.joue = false; video.pause(); if(musique) musique.pause();
      S.grand.hidden = false; S.grand.setAttribute('aria-label', 'Reprendre la vidéo');
      emettre('etat');
    }
    /* Sauter à l'instant t du CONTENU : l'avertissement et le titre
       sont passés, on va droit au morceau. */
    function allerA(t){
      if(!et.etapes.length || et.fini){ et.etapes = construireEtapes(true); et.fini = false; }
      var o2 = ou(r, t); if(!o2) return;
      var idx = -1;
      et.etapes.forEach(function(e, n){ if(e.s === 'seg' && e.k === o2.k) idx = n; });
      if(idx < 0) return;
      et.etapes.forEach(function(e){ if(e.s === 'tr') { e.bascule = true; } });
      S.voile.style.opacity = 0; S.voile.classList.remove('roue'); video.style.transform = ''; cartes(0, 0, 0); S.genTxt.style.top = '100%';
      et.i = idx; et.tContenu = t; et.dernier = null; et.enVideo = true; video.style.opacity = 1; poserFili();
      if(!et.introFaite){ et.introFaite = true; emettre('introFaite'); }
      var joue = et.joue;
      video.pause();
      aller(o2.seg.ci, o2.temps).then(function(){
        dessinerTextes(S, r, t, persos, o.surTexte); poserSt();
        if(joue){ et.joue = true; var p = video.play(); if(p && p.catch) p.catch(function(){}); planifier(); }
        emettre('temps', t); emettre('etat');
      });
    }
    function passerIntro(){
      var idx = -1;
      et.etapes.forEach(function(e, n){ if(idx < 0 && e.s === 'seg') idx = n; });
      if(idx < 0 || et.i >= idx) return;
      allerA(0);
    }
    /* L'image d'attente : la première image du contenu, sans rien
       par-dessus, et le grand ▶ au milieu. */
    function preparer(){
      cartes(0, 0, 0); S.voile.style.opacity = 0; video.style.opacity = 1; et.enVideo = false; poserFili();
      S.calque.innerHTML = ''; S.grand.hidden = false; S.grand.setAttribute('aria-label', 'Lire la vidéo');
      if(segs.length) return aller(segs[0].ci, segs[0].de + 0.05);
      return Promise.resolve();
    }
    function arreter(){
      et.joue = false; et.fini = false; et.etapes = []; et.i = -1;
      video.pause(); video.style.transform = ''; video.style.opacity = 1; video.muted = false;
      S.voile.style.opacity = 0; S.voile.classList.remove('roue'); S.gen.style.transform = '';
      cartes(0, 0, 0); S.genTxt.style.top = '100%'; et.enVideo = false; poserFili(); poserSt(); S.calque.innerHTML = '';
      if(musique) musique.pause();
      S.grand.hidden = false;
      emettre('etat');
    }
    function detruire(){ arreter(); if(musique){ musique.removeAttribute('src'); try{ musique.load(); }catch(e){} } ecouteurs = {}; }

    return {
      lire: lire, pause: pause, reprendre: function(){ reprendre(false); }, allerA: allerA, passerIntro: passerIntro,
      preparer: preparer, arreter: arreter, detruire: detruire, aller: aller,
      sur: function(n, f){ (ecouteurs[n] = ecouteurs[n] || []).push(f); },
      etat: function(){ var e = et.etapes[et.i]; return { joue: et.joue, fini: et.fini, phase: e ? e.s : '', tContenu: et.tContenu, introFaite: et.introFaite, enIntro: !!(e && (e.s === 'copy' || e.s === 'noir' || e.s === 'titre' || (e.s === 'tr' && e.vers === 0))) }; },
      duree: function(){ return dureeContenu(r); },
      couperLeSon: function(v){ o.muet = !!v; volumes(); },
      sousTitres: function(l){ if(l !== undefined) cues = decouperCues(l); poserSt(); }
    };
  }

  /* ============================================================
     LE LECTEUR — la scène, ses commandes, pour l'élève et l'aperçu

     o : { recette, clips:[{lien}], musique, persos, titre,
           peutPasser(): booléen, surContenu(de, a), surIntroFaite(),
           sousTitres: [ {de, a, texte} ] ou le lien du .vtt }

     🎞️ v1253 — UNE VIDÉO FABRIQUÉE (recette.fabrique) : tout est
     dans l'image ; le lecteur la joue d'un bout à l'autre, mais
     « passer le début » saute à la fenêtre du contenu, et seule cette
     fenêtre compte dans les 90 %.

     ⚠️ LA BARRE NE MONTRE QUE LE CONTENU. L'avertissement et le titre
     n'y ont pas de place : on ne « recule » pas dans un générique, et
     un curseur qui partirait de 0 sur l'avertissement mentirait sur
     la longueur de la vidéo.
     ============================================================ */
  function lecteur(conteneur, o){
    poserLeStyle();
    var r = recettePropre(o.recette, (o.clips || []).length);
    var S = creerScene();
    var w = document.createElement('div');
    w.className = 'mvL';
    w.setAttribute('role', 'group');
    w.setAttribute('aria-label', 'Vidéo' + (o.titre ? ' : ' + o.titre : ''));
    w.appendChild(S.scene);
    var titreLu = r.titre.on && r.titre.texte ? (r.titre.texte + (r.titre.sous ? ' — ' + r.titre.sous : '')) : '';
    var barre = document.createElement('div');
    barre.className = 'mvL-barre';
    barre.innerHTML =
      '<button type="button" class="mvL-lire" aria-label="Lire">▶</button>' +
      '<input type="range" class="mvL-pos" min="0" step="0.1" value="0" aria-label="Position dans la vidéo">' +
      '<span class="mvL-temps" aria-hidden="true">0:00</span>' +
      '<button type="button" class="mvL-cc" aria-pressed="false" aria-label="Sous-titres" hidden>CC</button>' +
      '<button type="button" class="mvL-son" aria-pressed="false" aria-label="Couper le son">🔊</button>' +
      '<button type="button" class="mvL-plein" aria-pressed="false" aria-label="Plein écran">⛶</button>';
    w.appendChild(barre);
    var passer = document.createElement('button');
    passer.type = 'button'; passer.className = 'mvL-passer'; passer.hidden = true; passer.textContent = '⏭ Passer le début';
    w.appendChild(passer);
    var annonce = document.createElement('div');
    annonce.className = 'mvSr'; annonce.setAttribute('aria-live', 'polite');
    w.appendChild(annonce);
    if(titreLu){ var h = document.createElement('p'); h.className = 'mvSr'; h.textContent = '🎬 ' + titreLu; w.insertBefore(h, S.scene); }
    conteneur.appendChild(w);

    var persos = o.persos || {};
    var dit = {};
    var fa = r.fabrique || null;
    var ccOn = false;
    try{ ccOn = localStorage.getItem('ec_mv_cc') === '1'; }catch(e){}
    var m = moteur(S, { recette: r, clips: o.clips, musique: o.musique, persos: persos, peutPasser: o.peutPasser,
      cues: Array.isArray(o.sousTitres) ? o.sousTitres : null, decalage: fa ? fa.de : 0, cc: function(){ return ccOn; },
      surTexte: function(e, i){ if(!dit[i]){ dit[i] = 1; annonce.textContent = r.textes[i].texte; } } });
    var q = function(s){ return barre.querySelector(s); };
    var bLire = q('.mvL-lire'), pos = q('.mvL-pos'), temps = q('.mvL-temps'), bSon = q('.mvL-son'), bPlein = q('.mvL-plein'), bCc = q('.mvL-cc');
    /* 💬 « CC » : les sous-titres, quand la vidéo en a. Le choix reste
       sur ce téléphone pour les vidéos suivantes. */
    var peindreCc = function(){ bCc.setAttribute('aria-pressed', ccOn ? 'true' : 'false'); bCc.setAttribute('aria-label', ccOn ? 'Masquer les sous-titres' : 'Afficher les sous-titres'); };
    if(Array.isArray(o.sousTitres) && o.sousTitres.length){ bCc.hidden = false; }
    else if(typeof o.sousTitres === 'string' && o.sousTitres && r.sousTitres.on){
      fetch(o.sousTitres).then(function(x){ return x.ok ? x.text() : ''; }).then(function(t){
        var l = depuisVTT(t);
        if(l.length){ m.sousTitres(l); bCc.hidden = false; }
      }).catch(function(){});
    }
    peindreCc();
    bCc.addEventListener('click', function(){ ccOn = !ccOn; try{ localStorage.setItem('ec_mv_cc', ccOn ? '1' : '0'); }catch(e){} peindreCc(); m.sousTitres(); });
    var d = m.duree();
    pos.max = d.toFixed(1);
    temps.textContent = '0:00 / ' + mmss(d);
    var glisse = false;
    function majBarre(){
      var e = m.etat();
      bLire.textContent = e.joue ? '⏸️' : '▶';
      bLire.setAttribute('aria-label', e.joue ? 'Pause' : (e.fini ? 'Revoir' : 'Lire'));
      if(!glisse){ pos.value = e.tContenu.toFixed(1); pos.setAttribute('aria-valuetext', lu(e.tContenu) + ' sur ' + lu(d)); }
      temps.textContent = mmss(e.tContenu) + ' / ' + mmss(d);
      var dansLeDebut = fa ? (e.tContenu < fa.de - 0.5 && (e.phase === 'seg' || e.phase === 'tr')) : e.enIntro;
      passer.hidden = !(e.joue && dansLeDebut && o.peutPasser && o.peutPasser());
      if(fa && !introFa && e.tContenu >= fa.de){ introFa = true; if(o.surIntroFaite) o.surIntroFaite(); }
    }
    var introFa = false;
    m.sur('temps', majBarre); m.sur('etat', majBarre);
    m.sur('contenu', function(a, b){
      if(!o.surContenu) return;
      if(!fa){ o.surContenu(a, b, d); return; }
      /* Dans un fichier fabriqué, seule la fenêtre du contenu compte. */
      var x = Math.max(a, fa.de), y = Math.min(b, fa.a);
      if(y > x) o.surContenu(x - fa.de, y - fa.de, fa.a - fa.de);
    });
    m.sur('introFaite', function(){ if(!fa && o.surIntroFaite) o.surIntroFaite(); });
    m.sur('fin', function(){ S.grand.hidden = false; S.grand.setAttribute('aria-label', 'Revoir la vidéo'); S.grand.textContent = '↻'; annonce.textContent = 'Fin de la vidéo.'; if(o.surFin) o.surFin(); });
    var partie = false;
    var demarrer = function(){
      S.grand.textContent = '▶';
      var e = m.etat();
      if(e.joue){ m.pause(); return; }
      /* ⚠️ RIEN D'ASYNCHRONE ENTRE L'APPUI ET « play() » : voir lire().
         Une police encore en route se posera en cours de lecture. */
      if(!partie || e.fini){ partie = true; dit = {}; m.lire(false); }
      else m.reprendre();
    };
    S.grand.addEventListener('click', demarrer);
    bLire.addEventListener('click', demarrer);
    passer.addEventListener('click', function(){ if(fa) m.allerA(fa.de); else m.passerIntro(); bLire.focus(); });
    pos.addEventListener('input', function(){ glisse = true; temps.textContent = mmss(+pos.value) + ' / ' + mmss(d); });
    pos.addEventListener('change', function(){ glisse = false; partie = true; m.allerA(+pos.value); });
    bSon.addEventListener('click', function(){
      var coupe = bSon.getAttribute('aria-pressed') !== 'true';
      bSon.setAttribute('aria-pressed', coupe ? 'true' : 'false');
      bSon.textContent = coupe ? '🔇' : '🔊';
      bSon.setAttribute('aria-label', coupe ? 'Remettre le son' : 'Couper le son');
      m.couperLeSon(coupe);
    });
    /* Le plein écran du navigateur quand il existe ; sinon (iPhone),
       la vidéo prend toute la page — sans perdre ce qui est posé
       dessus, ce que ferait le plein écran de la vidéo seule. */
    function plein(oui){
      w.classList.toggle('plein', oui);
      bPlein.setAttribute('aria-pressed', oui ? 'true' : 'false');
      bPlein.setAttribute('aria-label', oui ? 'Quitter le plein écran' : 'Plein écran');
    }
    bPlein.addEventListener('click', function(){
      var oui = !w.classList.contains('plein');
      if(oui && w.requestFullscreen){ w.requestFullscreen().then(function(){ plein(true); }).catch(function(){ plein(true); }); }
      else if(!oui && document.fullscreenElement){ document.exitFullscreen().catch(function(){}); plein(false); }
      else plein(oui);
    });
    document.addEventListener('fullscreenchange', function(){ if(!document.fullscreenElement && w.classList.contains('plein')) plein(false); });
    w.addEventListener('keydown', function(ev){
      if(ev.key === 'Escape' && w.classList.contains('plein') && !document.fullscreenElement){ plein(false); bPlein.focus(); ev.stopPropagation(); }
    });

    chargerLesPolices(stylesDe(r), persos).then(function(){ habiller(S, r, persos); });
    m.preparer();
    majBarre();
    return { element: w, moteur: m, recette: r, video: S.video, dureeCompte: fa ? fa.a - fa.de : d, detruire: function(){ m.detruire(); if(w.parentNode) w.parentNode.removeChild(w); } };
  }

  G.ECMontage = {
    V: V, POLICES: POLICES, TAILLES: TAILLES, COULEURS: COULEURS, FONDS: FONDS, TRANSITIONS: TRANSITIONS, PLACES: PLACES,
    DUREE_COPY: DUREE_COPY, DUREE_GEN: DUREE_GEN, DEFAUTS: DEFAUTS,
    style: style, stylePropre: stylePropre, recettePropre: recettePropre, recetteNeuve: recetteNeuve, squelettePropre: squelettePropre,
    morceauxDe: morceauxDe, segments: segments, dureeContenu: dureeContenu, dureeTotale: dureeTotale, ou: ou,
    hms: hms, mmss: mmss, lu: lu, resume: resume, contraste: contraste, contrasteDuStyle: contrasteDuStyle,
    policeDe: policeDe, appliquerStyle: appliquerStyle, chargerLesPolices: chargerLesPolices, stylesDe: stylesDe,
    creerScene: creerScene, habiller: habiller, dessinerTextes: dessinerTextes, moteur: moteur, lecteur: lecteur,
    poserLeStyle: poserLeStyle, cleValide: cleValide, copie: copie,
    placeFlou: placeFlou, versVTT: versVTT, depuisVTT: depuisVTT, decouperCues: decouperCues, BASES: BASES, unite: unite, lum: lum
  };
})(window);

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-montage.js'] = true;
