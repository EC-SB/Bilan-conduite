/* Déployé le 23/10/2026 à 15:15 — v1253 */
/* ============================================================
   ec-montage-editeur.js — ✂️ L'ÉDITEUR DE MONTAGE (v1252)

   Le schéma validé par David le 23 octobre (schema-editeur-video
   v2, « tu peux coder ») : quand on choisit une vidéo dans un bloc
   « 🎬 Vidéo » d'un guide, l'éditeur s'ouvre AVANT le dépôt. On
   coupe, on titre, on pose des textes, on règle le son et
   l'habillage, puis « 💾 Enregistrer le montage » — ou « Déposer
   sans montage ».

   ⚠️ LE FLOU N'EST PAS ICI. David a choisi qu'une vidéo floutée soit
   FABRIQUÉE sur l'ordinateur du bureau, et la vidéo brute effacée
   ensuite (« la plaque ne doit plus exister nulle part »). Un flou
   posé par-dessus une vidéo brute qui reste lisible par son lien
   serait un faux flou : il arrivera avec la fabrication (option B).

   ⚠️ LES LEÇONS DE L'AUDIT, APPLIQUÉES DÈS LE DÉPART (schéma § 7) :
   de vrais boutons radio dont le choix se voit (noir plein + ✓), des
   interrupteurs qui disent « Activé / Désactivé », chaque champ avec
   son étiquette, de vrais onglets aux flèches, tout au clavier (un
   texte se déplace aussi aux flèches), 44 px partout, les messages
   lus à voix haute, une vraie fenêtre qui garde le curseur, Échap
   qui demande avant de fermer.

   Et l'écran « 🎬 Squelette des vidéos » (Outils › Ce qu'on écrit) :
   ce que chaque montage reprend par défaut, réglé une fois pour
   l'école par un administrateur.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */
(function(){
  'use strict';
  var M = window.ECMontage;

  /* ---------- la feuille de style de l'éditeur ---------- */
  var CSS = [
    '.mvFond{position:fixed;inset:0;z-index:1500;background:rgba(20,22,27,.6);overflow-y:auto;padding:12px;-webkit-overflow-scrolling:touch;}',
    '.mv{--fond:#F2F2EC;--carte:#FFFFFF;--texte:#14161B;--doux:#5A5B55;--ligne:#DCDCD3;--citron:#B6FF0E;--vert:#3B6900;--rouge:#B5300D;color:var(--texte);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:var(--carte);border:1px solid var(--ligne);border-radius:16px;padding:14px;max-width:560px;margin:0 auto;text-align:left;}',
    '.mv *{box-sizing:border-box;}',
    '.mv :focus-visible{outline:3px solid var(--texte);outline-offset:2px;}',
    '.mvTete{display:flex;align-items:center;gap:10px;margin-bottom:10px;}',
    '.mvTete h2{margin:0;font-size:18px;flex:1;min-width:0;color:var(--texte);}',
    '.mvTete .mvFic{display:block;font-size:12.5px;color:var(--doux);font-weight:400;overflow-wrap:anywhere;}',
    '.mvRond{width:44px;height:44px;border-radius:999px;border:1px solid var(--ligne);background:var(--carte);color:var(--texte);font-size:18px;cursor:pointer;flex-shrink:0;}',
    '.mvLecture{display:flex;gap:8px;align-items:center;margin:10px 0 4px;flex-wrap:wrap;}',
    '.mvLecture .temps{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--doux);font-size:13.5px;}',
    '.mv .mvBtn{min-height:44px;border-radius:12px;border:1px solid var(--ligne);background:var(--carte);color:var(--texte);font:600 14.5px/1.2 inherit;padding:10px 14px;cursor:pointer;width:auto;margin:0;}',
    '.mv .mvBtn.prim{background:var(--citron);border-color:#8FCC00;color:#0B0B0B;}',
    '.mv .mvBtn:disabled{opacity:.55;cursor:not-allowed;}',
    '.mv .mvBtn.sel{background:#14161B;color:#fff;border-color:#14161B;}',
    '.mv .mvBtn.sel::before{content:"✓ ";}',
    '.mvOnglets{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:12px 0 0;background:var(--fond);border-radius:12px;padding:4px;}',
    '@media (min-width:640px){.mvOnglets{grid-template-columns:repeat(4,1fr);}}',
    '.mvOnglets [role=tab]{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:48px;border:0;border-radius:9px;background:transparent;color:var(--texte);font:600 13px/1.15 inherit;cursor:pointer;padding:4px 2px;width:auto;margin:0;}',
    '.mvOnglets [role=tab][aria-selected=true]{background:var(--carte);box-shadow:0 1px 4px rgba(0,0,0,.12);text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:2px;}',
    '.mvPanneau{padding:12px 2px 2px;}',
    '.mvPanneau h3{margin:0 0 4px;font-size:15px;color:var(--texte);}',
    '.mvAide{font-size:13px;color:var(--doux);margin:0 0 10px;}',
    '.mvChamp{margin:0 0 12px;}',
    '.mvChamp label,.mvChamp .lab{display:block;font-weight:600;font-size:14px;margin-bottom:4px;color:var(--texte);text-transform:none;letter-spacing:0;}',
    '.mv .mvChamp input[type=text],.mv .mvChamp textarea{width:100%;min-height:44px;border:1px solid #9C9D95;border-radius:10px;padding:10px 12px;font:inherit;color:var(--texte);background:#fff;margin:0;}',
    '.mv .mvChamp textarea{min-height:96px;resize:vertical;font-family:inherit;}',
    '.mvChamp .val{font-variant-numeric:tabular-nums;color:var(--doux);font-weight:400;}',
    '.mvBande{margin-bottom:8px;position:relative;display:flex;height:64px;border-radius:10px;overflow:hidden;border:1px solid var(--ligne);background:#2a2a2a;}',
    '.mvBande img{flex:1;min-width:0;height:100%;object-fit:cover;}',
    '.mvBande .hors{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(135deg,rgba(0,0,0,.72) 0 6px,rgba(0,0,0,.5) 6px 12px);}',
    '.mvBande .coupe{position:absolute;top:0;bottom:0;width:3px;background:#fff;box-shadow:0 0 0 1px #000;}',
    '.mvBande .tete{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--citron);box-shadow:0 0 0 1px #000;}',
    '.mvBande .retire{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(45deg,rgba(181,48,13,.75) 0 6px,rgba(0,0,0,.6) 6px 12px);}',
    '.mvBande .retire span{position:absolute;left:4px;bottom:3px;color:#fff;font-size:11px;font-weight:700;text-shadow:0 1px 2px #000;}',
    '.mv .mvCurseur{width:100%;height:44px;margin:2px 0 0;accent-color:#3B6900;padding:0;border:0;background:transparent;}',
    '.mvMorceaux{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-direction:column;gap:6px;}',
    '.mvMorceaux li{display:flex;gap:8px;align-items:center;border:1px solid var(--ligne);border-radius:10px;padding:6px 6px 6px 10px;}',
    '.mvMorceaux li .q{flex:1;min-width:0;font-size:14px;}',
    '.mvMorceaux li.off .q{text-decoration:line-through;color:var(--doux);}',
    '.mvClip.sel{border-color:#14161B;box-shadow:inset 3px 0 0 #3B6900;}',
    '.mvClip .bs{display:flex;gap:4px;flex-shrink:0;}',
    '.mvClip .bs .mvBtn{min-width:44px;padding:8px 10px;}',
    '.mvClip .bs .mvBtn[aria-pressed=true]{background:#14161B;color:#fff;border-color:#14161B;}',
    '.mvPleine{width:100% !important;margin-top:8px !important;}',
    '.mvChoix{display:flex;flex-wrap:wrap;gap:6px;border:0;padding:0;margin:0 0 12px;min-width:0;}',
    '.mvChoix legend{font-weight:600;font-size:14px;margin-bottom:6px;padding:0;color:var(--texte);}',
    '.mvChoix label{position:relative;display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:8px 12px;border:1px solid #9C9D95;border-radius:999px;cursor:pointer;font-size:14px;background:#fff;color:var(--texte);margin:0;text-transform:none;letter-spacing:0;font-weight:400;}',
    '.mvChoix input{position:absolute;opacity:0;width:1px;height:1px;margin:0;}',
    '.mvChoix input[type=color]{width:100%;height:100%;inset:0;cursor:pointer;}',
    '.mvChoix label:has(input:checked){background:#14161B;color:#fff;border-color:#14161B;font-weight:700;}',
    '.mvChoix label:has(input:checked)::before{content:"✓";}',
    '.mvChoix label:has(input:focus-visible){outline:3px solid var(--texte);outline-offset:2px;}',
    '.mvChoix label.perso.on{background:#14161B;color:#fff;border-color:#14161B;font-weight:700;}',
    '.mvChoix label.perso.on::before{content:"✓";}',
    '.mvInter{display:flex;align-items:center;gap:10px;min-height:44px;width:100%;border:0;background:none;padding:0;font:600 14.5px/1.3 inherit;color:var(--texte);cursor:pointer;text-align:left;margin:0 0 6px;}',
    '.mvInter .pis{width:46px;height:28px;border-radius:999px;background:#8A8B85;position:relative;flex-shrink:0;transition:background .2s;}',
    '.mvInter .pis::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:999px;background:#fff;transition:left .2s;}',
    '.mvInter[aria-checked=true] .pis{background:#3B6900;}',
    '.mvInter[aria-checked=true] .pis::after{left:21px;}',
    '.mvInter .etat{margin-left:auto;font-weight:400;color:var(--doux);font-size:13px;}',
    '.mvResume{margin-top:12px;padding:10px 12px;border-radius:12px;background:var(--fond);font-size:14px;}',
    '.mvActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}',
    '.mvActions .mvBtn{flex:1 1 200px;}',
    '.mvTxt.edit{pointer-events:auto;cursor:move;touch-action:none;outline:2px dashed rgba(255,255,255,.95);outline-offset:2px;box-shadow:0 0 0 4px rgba(0,0,0,.55);min-width:44px;}',
    '.mvTxt.edit:focus-visible{outline:3px solid #B6FF0E;}',
    '.mvScene.edition .mvGrand{display:none;}',
    '.mvFlou.edit{pointer-events:auto;cursor:move;touch-action:none;outline:2px dashed rgba(255,255,255,.95);outline-offset:1px;box-shadow:0 0 0 3px rgba(0,0,0,.55);}',
    '.mvFlou.edit:focus-visible{outline:3px solid #B6FF0E;}',
    '.mvStListe li{flex-wrap:wrap;}',
    '.mvStListe li .mvBtn{min-width:44px;}',
    '.mvStListe li .q{flex:1 1 100%;font-size:12.5px;color:var(--doux);font-variant-numeric:tabular-nums;}',
    '.mv .mvStListe li input[type=text]{flex:1 1 180px;min-width:0;min-height:44px;border:1px solid #9C9D95;border-radius:10px;padding:8px 10px;font:inherit;color:var(--texte);background:#fff;margin:0;}',
    '.mvObjet .lab{font-weight:600;font-size:14px;margin:4px 0 0;}',
    '.mvPts{list-style:none;padding:0;margin:6px 0 10px;display:flex;flex-direction:column;gap:6px;}',
    '.mvPts li{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}',
    '.mvPts li .q{flex:1;min-width:0;font-size:13.5px;font-variant-numeric:tabular-nums;}',
    '.mvLigne2{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px;}',
    '.mvLigne2 .q{flex:1 1 100%;font-size:13.5px;color:var(--doux);font-variant-numeric:tabular-nums;}',
    '.mvLigne2 .mvBtn{flex:1 1 150px;}',
    '.mvObjet{border:1px solid var(--ligne);border-radius:12px;padding:10px 12px 12px;margin:10px 0 0;min-width:0;}',
    '.mvObjet > legend{font-weight:700;padding:0 6px;color:var(--texte);}',
    '.mvStyle{margin:0 0 12px;border:1px solid var(--ligne);border-radius:10px;background:#FAFAF6;}',
    '.mvStyle > summary{min-height:44px;display:flex;align-items:center;padding:0 12px;cursor:pointer;font-weight:600;font-size:14px;list-style:none;color:var(--texte);}',
    '.mvStyle > summary::-webkit-details-marker{display:none;}',
    '.mvStyle > summary::after{content:"▾";margin-left:auto;}',
    '.mvStyle[open] > summary::after{content:"▴";}',
    '.mvStyle[open]{padding:0 10px 4px;}',
    '.mvStyle[open] > summary{padding:0 2px;}',
    '.mvPastille{display:inline-block;width:16px;height:16px;border-radius:999px;border:1px solid #5A5B55;vertical-align:-3px;margin-right:2px;}',
    '.mvChoix label:has(input:checked) .mvPastille,.mvChoix label.perso.on .mvPastille{box-shadow:0 0 0 2px #fff;}',
    '.mvAvert{margin:0 0 8px;font-size:13.5px;color:var(--rouge);font-weight:600;}',
    '.mvAvert:empty{display:none;}',
    '.mvPos{margin:6px 0 0;}',
    '.mvBandeau{border:1px solid #C9A400;background:#FFF6CC;color:#3D3200;border-radius:12px;padding:10px 12px;margin:10px 0 0;font-size:14px;}',
    '.mvBandeau .mvBtn{margin-top:8px;}',
    '.mvQuitter{border:2px solid #14161B;border-radius:12px;padding:12px;margin:12px 0 0;background:#fff;}',
    '.mvQuitter p{margin:0 0 8px;font-weight:600;}',
    '.mvAttente{display:flex;align-items:center;justify-content:center;min-height:200px;color:var(--doux);}',
    '.mvSq .mvChamp, .mvSq .mvChoix{max-width:560px;}',
    '@media (prefers-reduced-motion: reduce){.mvInter .pis,.mvInter .pis::after{transition:none;}}'
  ].join('\n');
  function poserLeStyle(){
    M.poserLeStyle();
    if(document.getElementById('mvStylesEd')) return;
    var s = document.createElement('style'); s.id = 'mvStylesEd'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, cls, txt){ var e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
  function bouton(texte, aria, quoi, cls){ var b = el('button', 'mvBtn' + (cls ? ' ' + cls : ''), texte); b.type = 'button'; if(aria) b.setAttribute('aria-label', aria); b.addEventListener('click', quoi); return b; }
  function appel(corps){ return (typeof appelPrep === 'function') ? appelPrep(corps) : Promise.reject(new Error('hors appli')); }
  function lienEntier(l){ return !l ? '' : (/^https?:|^blob:|^data:/.test(l) ? l : ((window.CONFIG && CONFIG.WORKER_URL) || '') + l); }

  /* ---------- le squelette de l'école, lu une fois par séance ---------- */
  var reglagesEnCache = null;
  function reglagesVideo(forcer){
    if(reglagesEnCache && !forcer) return Promise.resolve(reglagesEnCache);
    return appel({ action: 'videoReglagesLire' }).then(function(d){
      reglagesEnCache = d && d.status === 'ok' ? d : { reglages: {}, admin: false };
      return reglagesEnCache;
    }).catch(function(){ return { reglages: {}, admin: false, horsLigne: true }; });
  }
  function persosDe(reg, liensPolices){
    var p = {};
    ((reg && reg.polices) || []).forEach(function(x){ p[x.id] = { nom: x.nom, lien: lienEntier(x.lien), cle: x.cle }; });
    Object.keys(liensPolices || {}).forEach(function(k){ if(!p[k]) p[k] = { nom: 'Police de l’école', lien: lienEntier(liensPolices[k]) }; else if(!p[k].lien) p[k].lien = lienEntier(liensPolices[k]); });
    return p;
  }

  /* ---------- ce qu'on sait d'une vidéo, sans la télécharger ---------- */
  function lireMeta(url){
    return new Promise(function(ok){
      var v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.playsInline = true;
      var fini = false;
      var fin = function(x){ if(fini) return; fini = true; ok(x); v.removeAttribute('src'); try{ v.load(); }catch(e){} };
      v.addEventListener('loadedmetadata', function(){ fin({ duree: Number(v.duration) || 0, l: v.videoWidth || 0, h: v.videoHeight || 0 }); });
      v.addEventListener('error', function(){ fin({ duree: 0, l: 0, h: 0, erreur: true }); });
      setTimeout(function(){ fin({ duree: 0, l: 0, h: 0, erreur: true }); }, 20000);
      /* Pas de « crossOrigin » ici : la durée et la taille se lisent
         sans, et une vidéo doit s'ouvrir même si l'en-tête manque. */
      v.src = url;
    });
  }
  /* Huit images pour la bande, et la question « déjà montée ? » :
     ses premières secondes sont-elles un fond noir ? (l'avertissement
     des 21 vidéos déjà montées). Une vidéo d'un autre site, sans
     l'en-tête qui autorise à la lire, ne donne rien : on s'en passe. */
  function regarder(url, duree, n){
    return new Promise(function(ok){
      var v = document.createElement('video'); v.preload = 'auto'; v.muted = true; v.playsInline = true;
      if(!/^blob:|^data:/.test(url)) v.crossOrigin = 'anonymous';
      var c = document.createElement('canvas'); c.width = 96; c.height = 160;
      var g = c.getContext('2d');
      var temps = [];
      for(var i = 0; i < n; i++) temps.push(Math.min(duree - 0.1, (i + 0.5) * duree / n));
      var sombres = [1.0, 2.5, 4.0].filter(function(t){ return t < duree - 0.5; });
      var file = temps.map(function(t){ return ['v', t]; }).concat(sombres.map(function(t){ return ['s', t]; }));
      var out = { vignettes: [], sombre: sombres.length >= 2 }, fini = false;
      var fin = function(){ if(fini) return; fini = true; v.removeAttribute('src'); try{ v.load(); }catch(e){} ok(out); };
      var suivant = function(){
        if(!file.length){ fin(); return; }
        var x = file.shift();
        var garde = setTimeout(function(){ suivant(); }, 4000);
        v.addEventListener('seeked', function(){
          clearTimeout(garde);
          try{
            c.width = v.videoWidth > v.videoHeight ? 160 : 96; c.height = v.videoWidth > v.videoHeight ? 90 : 160;
            g.drawImage(v, 0, 0, c.width, c.height);
            if(x[0] === 'v') out.vignettes.push(c.toDataURL('image/jpeg', 0.6));
            else{
              var d = g.getImageData(0, 0, c.width, c.height).data, s = 0;
              for(var k = 0; k < d.length; k += 16) s += (d[k] + d[k + 1] + d[k + 2]) / 3;
              if(s / (d.length / 16) > 30) out.sombre = false;
            }
          }catch(e){ out.sombre = false; }
          suivant();
        }, { once: true });
        try{ v.currentTime = x[1]; }catch(e){ clearTimeout(garde); suivant(); }
      };
      v.addEventListener('loadeddata', suivant, { once: true });
      v.addEventListener('error', fin, { once: true });
      setTimeout(fin, 45000);
      v.src = url;
    });
  }

  /* ============================================================
     ✂️ OUVRIR L'ÉDITEUR

     o.clips   : [{ fichier: File } ou { cle, lien, duree, l, h, nom }]
     o.recette : la recette d'avant (ou rien)
     o.musique : { cle, lien, nom } ou rien
     o.liensPolices : les liens signés des polices de la recette
     o.titre   : le nom du bloc (titre proposé)
     o.nouveau : une vidéo choisie à l'instant (« Déposer sans
                 montage » est alors proposé)

     Rend : null (fermé), { sans: true } ou
            { recette, clips: [...même forme qu'à l'entrée], musique }
     ============================================================ */
  window.ouvrirEditeurMontage = function(o){
    poserLeStyle();
    return new Promise(function(rendre){
      var E = { cl: [], r: null, sel: 0, tete: 0, mus: o.musique || null, muetDe: null, modifie: false, m: null, joue: false, persos: {}, reg: {}, rendu: false,
                st: Array.isArray(o.sousTitres) ? o.sousTitres.slice() : [], stChange: false, mode: o.mode === 'soustitres' ? 'soustitres' : 'montage', fabrique: false };
      var retour = document.activeElement;
      var fond = el('div', 'mvFond');
      var boite = el('section', 'mv');
      boite.setAttribute('role', 'dialog'); boite.setAttribute('aria-modal', 'true'); boite.setAttribute('aria-labelledby', 'mvH');
      boite.innerHTML = '<div class="mvTete"><h2 id="mvH" tabindex="-1">' + (o.mode === 'soustitres' ? '💬 Les sous-titres de la vidéo' : '🎬 Monter la vidéo') + ' <span class="mvFic" id="mvFic"></span></h2>' +
        '<button type="button" class="mvRond" id="mvFermer" aria-label="Fermer l’éditeur">✕</button></div>' +
        '<div class="mvAttente" role="status">⏳ Lecture de la vidéo…</div>';
      fond.appendChild(boite);
      document.body.appendChild(fond);
      document.body.style.overflow = 'hidden';
      boite.querySelector('#mvH').focus();

      function fermer(valeur){
        if(E.rendu) return;
        E.rendu = true;
        if(E.m) E.m.detruire();
        try{ if(E.S) { E.S.video.pause(); E.S.video.removeAttribute('src'); E.S.video.load(); } }catch(e){}
        E.cl.forEach(function(c){ if(c.fichier && c.lien && valeur === null) { try{ URL.revokeObjectURL(c.lien); }catch(e){} } });
        document.removeEventListener('keydown', clavier, true);
        if(fond.parentNode) fond.parentNode.removeChild(fond);
        document.body.style.overflow = '';
        if(retour && retour.focus) try{ retour.focus(); }catch(e){}
        rendre(valeur);
      }
      /* ⚠️ LA FENÊTRE GARDE LE CURSEUR (défaut E4 de l'audit) : Tab
         tourne dedans, et Échap demande avant de fermer. */
      function clavier(ev){
        if(!fond.parentNode) return;
        if(ev.key === 'Escape'){ ev.preventDefault(); ev.stopPropagation(); demanderFermer(); return; }
        if(ev.key !== 'Tab') return;
        var f = [].slice.call(boite.querySelectorAll('button:not([disabled]), input:not([type=hidden]):not([tabindex="-1"]), textarea, summary, [tabindex="0"]')).filter(function(x){ return x.offsetParent !== null; });
        if(!f.length) return;
        var i = f.indexOf(document.activeElement);
        if(ev.shiftKey && (i <= 0)){ ev.preventDefault(); f[f.length - 1].focus(); }
        else if(!ev.shiftKey && (i === f.length - 1 || i === -1)){ ev.preventDefault(); f[0].focus(); }
      }
      document.addEventListener('keydown', clavier, true);
      boite.querySelector('#mvFermer').addEventListener('click', function(){ demanderFermer(); });

      function demanderFermer(){
        if(!E.modifie || !E.r){ fermer(null); return; }
        var x = boite.querySelector('.mvQuitter');
        if(x){ x.querySelector('button').focus(); return; }
        x = el('div', 'mvQuitter'); x.setAttribute('role', 'alertdialog'); x.setAttribute('aria-labelledby', 'mvQuitterT');
        var p = el('p', '', E.mode === 'soustitres' ? 'Garder les changements des sous-titres ?' : 'Garder les changements du montage ?'); p.id = 'mvQuitterT'; x.appendChild(p);
        var r = el('div', 'mvActions');
        r.appendChild(bouton(E.mode === 'soustitres' ? '💾 Enregistrer les sous-titres' : (E.r && E.r.flous.length ? '🎞️ Fabriquer la vidéo floutée' : '💾 Enregistrer le montage'), null, function(){ x.remove(); enregistrer(); }, 'prim'));
        r.appendChild(bouton('Abandonner les changements', null, function(){ fermer(null); }));
        r.appendChild(bouton('Continuer le montage', null, function(){ x.remove(); boite.querySelector('#mvFermer').focus(); }));
        x.appendChild(r);
        boite.querySelector('.mvTete').after(x);
        x.querySelector('button').focus();
      }

      /* ---------- chargement : le squelette, les vidéos ---------- */
      reglagesVideo().then(function(d){
        E.reg = M.squelettePropre(d.reglages || {});
        E.persos = persosDe(E.reg, o.liensPolices);
        /* 💬 les sous-titres déjà relus, lus dans leur fichier */
        var st = (typeof o.sousTitres === 'string' && o.sousTitres)
          ? fetch(lienEntier(o.sousTitres)).then(function(x){ return x.ok ? x.text() : ''; }).then(function(t){ E.st = M.depuisVTT(t); }).catch(function(){})
          : Promise.resolve();
        return st.then(function(){ return Promise.all((o.clips || []).map(preparerClip)); });
      }).then(function(l){
        E.cl = l;
        var mal = l.filter(function(c){ return c.erreur; });
        if(mal.length){
          boite.querySelector('.mvAttente').textContent = '❌ Cette vidéo ne se lit pas dans ce navigateur (format ou lien). Dépose-la sans montage, ou essaie depuis un autre ordinateur.';
          var a = el('div', 'mvActions');
          if(o.nouveau) a.appendChild(bouton('Déposer sans montage', null, function(){ fermer({ sans: true }); }));
          a.appendChild(bouton('Fermer', null, function(){ fermer(null); }));
          boite.appendChild(a);
          return;
        }
        if(o.recette && o.recette.clips && o.recette.clips.length){
          E.r = M.recettePropre(o.recette, l.length);
          E.r.clips.forEach(function(c){ var s = E.cl[c.i]; if(s){ c.duree = s.duree; c.l = s.l; c.h = s.h; c.fin = Math.min(c.fin, s.duree || c.fin); } });
        }else{
          E.r = M.recetteNeuve(E.reg, o.titre || '', '');
          E.r.clips = l.map(function(c, i){ return nouveauClip(i); });
        }
        dessinerTout();
        if(o.nouveau && l[0] && l[0].sombre) avertirDejaMontee();
      });

      function preparerClip(c){
        var lien = c.fichier ? URL.createObjectURL(c.fichier) : lienEntier(c.lien);
        var x = { fichier: c.fichier || null, cle: c.cle || '', lien: lien, nom: c.fichier ? c.fichier.name : (c.nom || 'Vidéo'), poids: c.fichier ? c.fichier.size : (c.poids || 0) };
        return lireMeta(lien).then(function(m){
          x.duree = m.duree || Number(c.duree) || 0; x.l = m.l || c.l || 0; x.h = m.h || c.h || 0; x.erreur = !!m.erreur && !x.duree;
          if(x.erreur) return x;
          x.court = String(x.nom).replace(/\.[^.]+$/, '').slice(0, 40);
          return regarder(lien, x.duree, 8).then(function(v){ x.vignettes = v.vignettes; x.sombre = v.sombre; return x; });
        });
      }
      function nouveauClip(i){ var c = E.cl[i]; return { i: i, debut: 0, fin: Math.round(c.duree * 10) / 10, duree: c.duree, coupes: [], retires: {}, l: c.l, h: c.h }; }

      function avertirDejaMontee(){
        var b = el('div', 'mvBandeau'); b.setAttribute('role', 'status');
        b.appendChild(el('div', '', '⚠️ Cette vidéo commence sur un fond noir : elle a peut-être déjà son avertissement et son titre. Pour ne pas les mettre deux fois, tu peux la déposer telle quelle.'));
        b.appendChild(bouton('Déposer sans montage', null, function(){ fermer({ sans: true }); }));
        b.appendChild(bouton('Monter quand même', null, function(){ b.remove(); }));
        boite.querySelector('.mvTete').after(b);
      }

      /* ============================================================
         LE DESSIN DE L'ÉDITEUR
         ============================================================ */
      var $ = function(id){ return boite.querySelector('#' + id); };
      function annoncer(t){ var a = $('mvAnnonce'); if(!a) return; a.textContent = ''; setTimeout(function(){ a.textContent = t; }, 30); }
      function touche(){ E.modifie = true; }

      function dessinerTout(){
        var att = boite.querySelector('.mvAttente'); if(att) att.remove();
        E.S = M.creerScene();
        E.S.scene.id = 'mvScene';
        E.S.grand.setAttribute('aria-label', 'Lire le montage');
        var corps = el('div');
        corps.innerHTML =
          '<div class="mvLecture">' +
            '<button type="button" class="mvBtn prim" id="mvLire" aria-pressed="false">▶ Lire le montage</button>' +
            '<button type="button" class="mvBtn" id="mvPasser">⏭ Passer au contenu</button>' +
            '<span class="temps" id="mvTemps" aria-hidden="true"></span>' +
          '</div>' +
          '<div class="mvChamp mvPos"><label for="mvTeteR">Position dans la vidéo montée <span class="val" id="mvTeteVal"></span></label><input type="range" class="mvCurseur" id="mvTeteR" min="0" step="0.1"></div>' +
          '<div class="mvOnglets" role="tablist" aria-label="Réglages du montage">' +
            '<button type="button" role="tab" id="mvOgC" aria-controls="mvPnC" aria-selected="true"><span aria-hidden="true">✂️</span>Couper</button>' +
            '<button type="button" role="tab" id="mvOgT" aria-controls="mvPnT" aria-selected="false" tabindex="-1"><span aria-hidden="true">🏷️</span>Textes</button>' +
            '<button type="button" role="tab" id="mvOgS" aria-controls="mvPnS" aria-selected="false" tabindex="-1"><span aria-hidden="true">🔊</span>Son</button>' +
            '<button type="button" role="tab" id="mvOgF" aria-controls="mvPnF" aria-selected="false" tabindex="-1"><span aria-hidden="true">🙈</span>Flou</button>' +
            '<button type="button" role="tab" id="mvOgH" aria-controls="mvPnH" aria-selected="false" tabindex="-1"><span aria-hidden="true">©️</span>Habillage</button>' +
            '<button type="button" role="tab" id="mvOgX" aria-controls="mvPnX" aria-selected="false" tabindex="-1"><span aria-hidden="true">✨</span>Transitions</button>' +
            '<button type="button" role="tab" id="mvOgST" aria-controls="mvPnST" aria-selected="false" tabindex="-1"><span aria-hidden="true">💬</span>Sous-titres</button>' +
          '</div>' +
          '<div class="mvPanneau" role="tabpanel" id="mvPnC" aria-labelledby="mvOgC">' +
            '<h3>Les vidéos, dans l’ordre</h3>' +
            '<ol class="mvMorceaux" id="mvClips" aria-label="Les vidéos du montage"></ol>' +
            '<button type="button" class="mvBtn mvPleine" id="mvAjoutClip">➕ Ajouter une vidéo à la suite</button>' +
            '<input type="file" id="mvAjoutFichier" accept="video/mp4" class="mvSr" tabindex="-1" aria-hidden="true">' +
            '<h3 style="margin-top:14px" id="mvCoupeTitre">Couper la vidéo 1</h3>' +
            '<p class="mvAide">Glisse <b>Début</b> et <b>Fin</b> pour garder le bon passage. Pour enlever un passage au milieu : place la position, touche « Couper ici » avant et après, puis retire le morceau du milieu.</p>' +
            '<div class="mvBande" id="mvBande" aria-hidden="true"></div>' +
            '<div class="mvChamp"><label for="mvDebut">Début de cette vidéo <span class="val" id="mvDebutVal"></span></label><input type="range" class="mvCurseur" id="mvDebut" min="0" step="0.1"></div>' +
            '<div class="mvChamp"><label for="mvFin">Fin de cette vidéo <span class="val" id="mvFinVal"></span></label><input type="range" class="mvCurseur" id="mvFin" min="0" step="0.1"></div>' +
            '<button type="button" class="mvBtn" id="mvCouper">✂️ Couper ici</button>' +
            '<ul class="mvMorceaux" id="mvMorceaux" aria-label="Les morceaux de cette vidéo"></ul>' +
          '</div>' +
          '<div class="mvPanneau" role="tabpanel" id="mvPnT" aria-labelledby="mvOgT" hidden>' +
            '<h3>Le carton titre</h3>' +
            '<button type="button" role="switch" class="mvInter" id="mvSwCarton"><span class="pis" aria-hidden="true"></span><span class="nom">Carton titre (fond noir, avant la vidéo)</span><span class="etat"></span></button>' +
            '<div class="mvChamp"><label for="mvChTitre">Titre</label><input type="text" id="mvChTitre" maxlength="80"></div>' +
            '<div class="mvChamp"><label for="mvChSous">Sous-titre <span class="val">(facultatif)</span></label><input type="text" id="mvChSous" maxlength="80"></div>' +
            '<fieldset class="mvChoix" id="mvDurTitreF"><legend>Durée du carton</legend>' +
              '<label><input type="radio" name="mvDurTitre" value="2"><span>2 s</span></label>' +
              '<label><input type="radio" name="mvDurTitre" value="2.5"><span>2,5 s (comme tes vidéos)</span></label>' +
              '<label><input type="radio" name="mvDurTitre" value="4"><span>4 s</span></label>' +
            '</fieldset>' +
            '<h3 style="margin-top:14px">Les textes pendant la vidéo</h3>' +
            '<p class="mvAide">Place la position, touche « Ajouter un texte ici », écris-le, puis fais-le glisser sur l’image (ou flèches du clavier quand il est sélectionné).</p>' +
            '<button type="button" class="mvBtn" id="mvAjoutTexte">➕ Ajouter un texte ici</button>' +
            '<div id="mvTextes"></div>' +
          '</div>' +
          '<div class="mvPanneau" role="tabpanel" id="mvPnS" aria-labelledby="mvOgS" hidden>' +
            '<h3>Couper le son d’un passage</h3>' +
            '<p class="mvAide">Place la position au début du passage, touche « Le silence commence ici », puis à la fin, « Le silence s’arrête ici ».</p>' +
            '<div class="mvLigne2"><button type="button" class="mvBtn" id="mvMuetDe">🔇 Le silence commence ici</button><button type="button" class="mvBtn" id="mvMuetA" disabled>🔈 Le silence s’arrête ici</button></div>' +
            '<ul class="mvMorceaux" id="mvMuets" aria-label="Les passages sans le son"></ul>' +
            '<h3 style="margin-top:14px">La musique</h3>' +
            '<fieldset class="mvChoix"><legend>Musique de fond</legend>' +
              '<label><input type="radio" name="mvMus" value=""><span>Aucune</span></label>' +
              '<label id="mvMusGardeL" hidden><input type="radio" name="mvMus" value="garde"><span id="mvMusGardeT">La musique choisie</span></label>' +
              '<label><input type="radio" name="mvMus" value="fichier"><span>Choisir une musique (MP3)…</span></label>' +
            '</fieldset>' +
            '<input type="file" id="mvMusFichier" accept="audio/mpeg,audio/mp4,.mp3,.m4a" class="mvSr" tabindex="-1" aria-hidden="true">' +
            '<fieldset class="mvChoix"><legend>Elle joue</legend>' +
              '<label><input type="radio" name="mvMusOu" value="tout"><span>Pendant tout le montage</span></label>' +
              '<label><input type="radio" name="mvMusOu" value="bords"><span>Seulement au début et à la fin</span></label>' +
            '</fieldset>' +
            '<div class="mvChamp"><label for="mvVolMus">Volume de la musique <span class="val" id="mvVolMusVal"></span></label><input type="range" class="mvCurseur" id="mvVolMus" min="0" max="100" step="5"></div>' +
            '<div class="mvChamp"><label for="mvVolVid">Volume du son de la vidéo <span class="val" id="mvVolVidVal"></span></label><input type="range" class="mvCurseur" id="mvVolVid" min="0" max="100" step="5"></div>' +
            '<p class="mvAide">⚠️ Seulement des musiques libres de droits (ou achetées pour cet usage) : une chanson du commerce est interdite dans une vidéo diffusée. Garde la preuve de la licence.</p>' +
          '</div>' +
          '<div class="mvPanneau" role="tabpanel" id="mvPnF" aria-labelledby="mvOgF" hidden>' +
            '<p class="mvAide">Une plaque, un visage : place la position, touche « ➕ Ajouter un flou ici », puis fais glisser la zone dessus (flèches : déplacer ; Maj + flèches : agrandir). Si ce qu’on floute bouge : avance la position et redéplace la zone à chaque changement de direction. Chaque place devient un <b>point de passage</b> ; entre deux points, la zone glisse toute seule.</p>' +
            '<p class="mvBandeau">🎞️ Une vidéo floutée se <b>fabrique</b> sur l’ordinateur du bureau (Chrome ou Edge) : le flou est alors dans l’image, et la vidéo d’origine est effacée — la plaque n’existe plus nulle part.</p>' +
            '<button type="button" class="mvBtn mvPleine" id="mvAjoutFlou">➕ Ajouter un flou ici</button>' +
            '<div id="mvFlous"></div>' +
          '</div>' +
          '<div class="mvPanneau" role="tabpanel" id="mvPnH" aria-labelledby="mvOgH" hidden>' +
            '<p class="mvAide">Repris du squelette de l’école (Outils › Ce qu’on écrit › 🎬 Squelette des vidéos). Ici, tu les changes pour cette vidéo seulement.</p>' +
            '<button type="button" role="switch" class="mvInter" id="mvSwCopy"><span class="pis" aria-hidden="true"></span><span class="nom">Avertissement au début (≈ 7 s)</span><span class="etat"></span></button>' +
            '<div class="mvChamp"><label for="mvChCopy">Texte de l’avertissement</label><textarea id="mvChCopy" rows="6"></textarea></div>' +
            '<button type="button" role="switch" class="mvInter" id="mvSwFili"><span class="pis" aria-hidden="true"></span><span class="nom">Copyright incrusté pendant la vidéo</span><span class="etat"></span></button>' +
            '<div class="mvChamp"><label for="mvChFili">Texte du copyright</label><input type="text" id="mvChFili" maxlength="60"></div>' +
            '<fieldset class="mvChoix" id="mvPosF"><legend>Place du copyright</legend>' + M.PLACES.map(function(p){ return '<label><input type="radio" name="mvPos" value="' + p[0] + '"><span>' + p[1] + '</span></label>'; }).join('') + '</fieldset>' +
            '<button type="button" role="switch" class="mvInter" id="mvSwGen"><span class="pis" aria-hidden="true"></span><span class="nom">Générique de fin (≈ 8 s)</span><span class="etat"></span></button>' +
            '<div class="mvChamp"><label for="mvChGen">Lignes du générique</label><textarea id="mvChGen" rows="5"></textarea></div>' +
          '</div>' +
          '<div class="mvPanneau" role="tabpanel" id="mvPnX" aria-labelledby="mvOgX" hidden>' +
            '<p class="mvAide">« Moins d’animations » réglé sur le téléphone de l’élève : toutes deviennent un fondu au noir.</p>' +
            [['titre', 'Entre le titre et la vidéo'], ['coupe', 'Entre deux morceaux, ou deux vidéos'], ['fin', 'Avant le générique']].map(function(x){
              return '<fieldset class="mvChoix"><legend>' + x[1] + '</legend>' + M.TRANSITIONS.map(function(t){ return '<label><input type="radio" name="mvTr' + x[0] + '" value="' + t[0] + '"><span>' + t[1] + '</span></label>'; }).join('') + '</fieldset>';
            }).join('') +
          '</div>' +
          '<div class="mvPanneau" role="tabpanel" id="mvPnST" aria-labelledby="mvOgST" hidden>' +
            '<p class="mvAide">La reconnaissance vocale écrit ce qui est dit dans la vidéo, avec les temps. <b>Relis</b> : dans la voiture, le vent et le moteur la trompent parfois. Chez l’élève, le bouton « CC » les affiche.</p>' +
            '<button type="button" role="switch" class="mvInter" id="mvSwSt"><span class="pis" aria-hidden="true"></span><span class="nom">Sous-titres proposés à l’élève (bouton CC)</span><span class="etat"></span></button>' +
            '<button type="button" class="mvBtn mvPleine" id="mvCreerSt">💬 Créer les sous-titres</button>' +
            '<p class="mvAide" id="mvStEtat" role="status" aria-live="polite"></p>' +
            '<ol class="mvMorceaux mvStListe" id="mvStListe" aria-label="Les phrases des sous-titres"></ol>' +
            '<button type="button" class="mvBtn mvPleine" id="mvAjoutSt">➕ Ajouter une phrase à la position</button>' +
          '</div>' +
          '<div class="mvResume" id="mvResume"></div>' +
          '<div class="mvActions">' +
            '<button type="button" class="mvBtn prim" id="mvEnregistrer">💾 Enregistrer le montage</button>' +
            (o.nouveau ? '<button type="button" class="mvBtn" id="mvSans">Déposer sans montage</button>' : '') +
          '</div>' +
          '<div class="mvSr" id="mvAnnonce" role="status" aria-live="polite"></div>';
        boite.appendChild(E.S.scene);
        boite.appendChild(corps);
        brancher();
        tout();
        dessinerTextesPanneau();
        voirTete();
        M.chargerLesPolices(M.stylesDe(E.r), E.persos).then(function(){ dessinerHabillage(); dessinerCalque(); });
      }

      /* ---------- les morceaux ---------- */
      function dureeVideo(){ return M.dureeContenu(E.r); }
      function dessinerHabillage(){ M.habiller(E.S, E.r, E.persos); }
      function dessinerClips(){
        var l = $('mvClips'); l.innerHTML = '';
        E.r.clips.forEach(function(c, i){
          var src = E.cl[c.i];
          var li = el('li', 'mvClip' + (i === E.sel ? ' sel' : ''));
          var garde = M.morceauxDe(c).reduce(function(s, m){ return s + (m.garde ? m.a - m.de : 0); }, 0);
          var q = el('span', 'q'); q.innerHTML = '<b>Vidéo ' + (i + 1) + '</b> · ';
          q.appendChild(document.createTextNode(src.court));
          q.appendChild(el('br'));
          q.appendChild(el('span', 'val', 'gardé ' + M.hms(garde) + ' sur ' + M.hms(src.duree)));
          li.appendChild(q);
          var bs = el('span', 'bs');
          var bc = bouton('✂️', 'Couper la vidéo ' + (i + 1), function(){ E.sel = i; tout(); var o2 = M.ou(E.r, E.tete); if(!o2 || o2.seg.ci !== i){ var s = M.segments(E.r).filter(function(x){ return x.ci === i; })[0]; if(s){ E.tete = s.off; voirTete(); } } annoncer('Vidéo ' + (i + 1) + ' sélectionnée pour couper.'); });
          bc.setAttribute('aria-pressed', i === E.sel ? 'true' : 'false'); bs.appendChild(bc);
          if(E.r.clips.length > 1){
            if(i > 0) bs.appendChild(bouton('▲', 'Monter la vidéo ' + (i + 1), function(){ var x = E.r.clips.splice(i, 1)[0]; E.r.clips.splice(i - 1, 0, x); E.sel = i - 1; touche(); tout(); voirTete(); annoncer('Vidéo déplacée en position ' + i + '.'); }));
            if(i < E.r.clips.length - 1) bs.appendChild(bouton('▼', 'Descendre la vidéo ' + (i + 1), function(){ var x = E.r.clips.splice(i, 1)[0]; E.r.clips.splice(i + 1, 0, x); E.sel = i + 1; touche(); tout(); voirTete(); annoncer('Vidéo déplacée en position ' + (i + 2) + '.'); }));
            bs.appendChild(bouton('🗑️', 'Retirer la vidéo ' + (i + 1) + ' du montage', function(){ E.r.clips.splice(i, 1); E.sel = 0; touche(); tout(); voirTete(); annoncer('Vidéo retirée du montage.'); }));
          }
          li.appendChild(bs); l.appendChild(li);
        });
        $('mvAjoutClip').disabled = E.r.clips.length >= 4;
        $('mvFic').textContent = E.r.clips.map(function(c){ return E.cl[c.i].nom; }).join(' + ');
      }
      function dessinerBande(){
        var c = E.r.clips[E.sel], src = E.cl[c.i], d = src.duree || 1, b = $('mvBande');
        b.innerHTML = '';
        (src.vignettes || []).forEach(function(v){ var i = el('img'); i.src = v; i.alt = ''; b.appendChild(i); });
        var pc = function(t){ return (t / d * 100) + '%'; };
        var h1 = el('div', 'hors'); h1.style.left = '0'; h1.style.width = pc(c.debut); b.appendChild(h1);
        var h2 = el('div', 'hors'); h2.style.left = pc(c.fin); h2.style.right = '0'; b.appendChild(h2);
        M.morceauxDe(c).forEach(function(m){ if(m.garde) return; var r = el('div', 'retire'); r.style.left = pc(m.de); r.style.width = pc(m.a - m.de); r.innerHTML = '<span>retiré</span>'; b.appendChild(r); });
        c.coupes.forEach(function(x){ var e = el('div', 'coupe'); e.style.left = pc(x); b.appendChild(e); });
        var o2 = M.ou(E.r, E.tete);
        if(o2 && o2.seg.ci === E.sel){ var t = el('div', 'tete'); t.style.left = pc(o2.temps); b.appendChild(t); }
      }
      function dessinerMorceaux(){
        var c = E.r.clips[E.sel], src = E.cl[c.i], l = $('mvMorceaux'); l.innerHTML = '';
        $('mvCoupeTitre').textContent = 'Couper la vidéo ' + (E.sel + 1) + ' (' + src.court + ')';
        var ms = M.morceauxDe(c);
        ms.forEach(function(m, k){
          var li = el('li', m.garde ? '' : 'off');
          li.appendChild(el('span', 'q', 'Morceau ' + (k + 1) + ' · ' + M.hms(m.de) + ' → ' + M.hms(m.a) + (m.garde ? '' : ' · retiré')));
          if(ms.length > 1) li.appendChild(bouton(m.garde ? '🗑️ Retirer' : '↩️ Remettre', (m.garde ? 'Retirer' : 'Remettre') + ' le morceau ' + (k + 1) + ', de ' + M.lu(m.de) + ' à ' + M.lu(m.a), function(){
            var cle = m.de.toFixed(2);
            if(m.garde && M.segments(E.r).length === 1){ annoncer('Il faut garder au moins un morceau.'); return; }
            if(m.garde) c.retires[cle] = 1; else delete c.retires[cle];
            touche(); tout(); annoncer('Morceau ' + (k + 1) + (m.garde ? ' retiré' : ' remis') + '. Vidéo montée : ' + M.lu(dureeVideo()) + '.');
          }));
          l.appendChild(li);
        });
        var d = src.duree;
        [['mvDebut', c.debut], ['mvFin', c.fin]].forEach(function(x){ var i = $(x[0]); i.max = d.toFixed(1); i.value = x[1].toFixed(1); i.setAttribute('aria-valuetext', M.lu(x[1])); $(x[0] + 'Val').textContent = M.hms(x[1]); });
        var o2 = M.ou(E.r, E.tete), dans = o2 && o2.seg.ci === E.sel;
        var b = $('mvCouper');
        b.textContent = dans ? '✂️ Couper ici (à ' + M.hms(o2.temps) + ' de la vidéo ' + (E.sel + 1) + ')' : '✂️ Couper ici — place d’abord la position dans la vidéo ' + (E.sel + 1);
        b.disabled = !dans || !(o2.temps > c.debut + 0.3 && o2.temps < c.fin - 0.3) || c.coupes.some(function(x){ return Math.abs(x - o2.temps) < 0.3; });
      }

      /* ---------- un bloc « police, taille, couleur, fond » ---------- */
      function blocStyle(s, nom, apres){
        var d = el('details', 'mvStyle');
        d.appendChild(el('summary', '', '🎨 Police, taille, couleur'));
        var groupe = function(leg, liste, cle, rendu){
          var fs = el('fieldset', 'mvChoix');
          fs.appendChild(el('legend', '', leg));
          liste.forEach(function(x){
            var l = el('label'), r = el('input'); r.type = 'radio'; r.name = nom + cle; r.value = x[0]; r.checked = s[cle] === x[0];
            r.addEventListener('change', function(){ if(r.checked){ s[cle] = x[0]; if(cle === 'couleur') peindrePerso(); avertir(); touche(); apres(); } });
            l.appendChild(r); var sp = el('span'); rendu(sp, x); l.appendChild(sp); fs.appendChild(l);
          });
          d.appendChild(fs);
          return fs;
        };
        var polices = M.POLICES.map(function(x){ return [x[0], x[1], x[2], x[3]]; });
        Object.keys(E.persos).forEach(function(k){ if(E.persos[k].lien) polices.push(['p:' + k, E.persos[k].nom, '"EC Perso ' + k + '",system-ui,sans-serif', 400]); });
        groupe('Police', polices, 'police', function(sp, x){ sp.textContent = x[1]; sp.style.fontFamily = x[2]; sp.style.fontWeight = Math.min(x[3], 700); });
        groupe('Taille', M.TAILLES, 'taille', function(sp, x){ sp.textContent = x[1]; });
        var fc = groupe('Couleur du texte', M.COULEURS, 'couleur', function(sp, x){ sp.innerHTML = '<i class="mvPastille" style="background:' + x[0] + '"></i>' + x[1]; });
        /* 🎨 David : « ajoute des couleurs personnalisées pour le texte,
           pas uniquement celles que tu proposes ». Le nuancier du
           téléphone ou de l'ordinateur, dans une pastille de plus. */
        var lp = el('label', 'perso');
        var ic = el('input'); ic.type = 'color'; ic.setAttribute('aria-label', 'Autre couleur du texte');
        var sp = el('span'); lp.appendChild(ic); lp.appendChild(sp); fc.appendChild(lp);
        function peindrePerso(){
          var pre = M.COULEURS.some(function(x){ return x[0] === s.couleur; });
          lp.classList.toggle('on', !pre);
          sp.innerHTML = '<i class="mvPastille" style="background:' + (pre ? 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' : s.couleur) + '"></i>' + (pre ? '🎨 Autre couleur…' : 'Ma couleur ' + s.couleur);
          ic.value = /^#[0-9A-F]{6}$/i.test(s.couleur) ? s.couleur.toLowerCase() : '#ffffff';
        }
        ic.addEventListener('input', function(){
          s.couleur = ic.value.toUpperCase();
          fc.querySelectorAll('input[type=radio]').forEach(function(r){ r.checked = false; });
          peindrePerso(); avertir(); touche(); apres();
        });
        peindrePerso();
        groupe('Fond derrière le texte', M.FONDS, 'fond', function(sp, x){ sp.textContent = x[1]; });
        var av = el('p', 'mvAvert'); av.setAttribute('aria-live', 'polite'); d.appendChild(av);
        function avertir(){
          var r = M.contrasteDuStyle(s);
          av.textContent = r < 4.5 ? '⚠️ Peu lisible (' + r.toFixed(1).replace('.', ',') + ' : 1) : change la couleur ou le fond.' : '';
          M.chargerLesPolices([s], E.persos).then(apres);
        }
        avertir();
        return d;
      }

      /* ---------- le calque : les textes, déplaçables ---------- */
      function dessinerCalque(){
        if(E.joue) return;
        M.dessinerTextes(E.S, E.r, E.tete, E.persos, function(e, i){
          e.classList.add('edit');
          rendreMobile(e, i, 'Texte « ' + E.r.textes[i].texte + ' ». Flèches pour le déplacer.');
        }, function(z, i){
          z.classList.add('edit');
          rendreFlouMobile(z, i);
        });
      }
      /* 🙈 Déplacer un flou, c'est poser un POINT DE PASSAGE à la
         position (ou corriger celui qui y est déjà). */
      function pointIci(f){
        var p = M.placeFlou(f, E.tete), t = Math.round(E.tete * 10) / 10;
        var k = -1;
        f.points.forEach(function(x, j){ if(Math.abs(x.t - t) < 0.15) k = j; });
        if(k < 0){ f.points.push({ t: t, x: p.x, y: p.y, w: p.w, h: p.h }); f.points.sort(function(a, b){ return a.t - b.t; }); f.points.forEach(function(x, j){ if(x.t === t) k = j; }); }
        return f.points[k];
      }
      function rendreFlouMobile(z, i){
        var f = E.r.flous[i];
        z.tabIndex = 0; z.setAttribute('role', 'button'); z.setAttribute('aria-roledescription', 'zone déplaçable');
        z.setAttribute('aria-label', 'Flou ' + (i + 1) + '. Flèches pour le déplacer, Maj et flèches pour l’agrandir. Déplacé ici, il pose un point de passage à ' + M.lu(E.tete) + '.');
        z.setAttribute('data-f', i);
        z.addEventListener('keydown', function(ev){
          var d = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[ev.key];
          if(!d) return; ev.preventDefault();
          var p = pointIci(f);
          if(ev.shiftKey){ p.w = Math.max(6, Math.min(100 - p.x, p.w + d[0])); p.h = Math.max(6, Math.min(100 - p.y, p.h + d[1])); }
          else { p.x = Math.max(0, Math.min(100 - p.w, p.x + d[0])); p.y = Math.max(0, Math.min(100 - p.h, p.y + d[1])); }
          touche(); dessinerCalque(); dessinerFlous();
          var n = E.S.calque.querySelector('[data-f="' + i + '"]'); if(n) n.focus();
        });
        z.addEventListener('pointerdown', function(ev){
          ev.preventDefault(); z.focus(); try{ z.setPointerCapture(ev.pointerId); }catch(e){}
          var p = pointIci(f), rc = E.S.calque.getBoundingClientRect(), x0 = ev.clientX, y0 = ev.clientY, px = p.x, py = p.y;
          var bouger = function(m){ p.x = Math.max(0, Math.min(100 - p.w, px + (m.clientX - x0) / rc.width * 100)); p.y = Math.max(0, Math.min(100 - p.h, py + (m.clientY - y0) / rc.height * 100)); z.style.left = p.x + '%'; z.style.top = p.y + '%'; };
          var lacher = function(){ z.removeEventListener('pointermove', bouger); touche(); dessinerFlous(); annoncer('Point de passage posé à ' + M.lu(p.t) + '.'); };
          z.addEventListener('pointermove', bouger); z.addEventListener('pointerup', lacher, { once: true });
        });
      }
      function rendreMobile(e, i, nom){
        e.tabIndex = 0; e.setAttribute('role', 'button'); e.setAttribute('aria-roledescription', 'élément déplaçable'); e.setAttribute('aria-label', nom);
        e.setAttribute('data-i', i);
        var x = E.r.textes[i];
        e.addEventListener('keydown', function(ev){
          var d = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[ev.key];
          if(!d) return; ev.preventDefault();
          x.x = Math.max(0, Math.min(96, x.x + d[0])); x.y = Math.max(0, Math.min(96, x.y + d[1]));
          touche(); dessinerCalque();
          var n = E.S.calque.querySelector('[data-i="' + i + '"]'); if(n) n.focus();
        });
        e.addEventListener('pointerdown', function(ev){
          ev.preventDefault(); e.focus(); try{ e.setPointerCapture(ev.pointerId); }catch(z){}
          var r = E.S.calque.getBoundingClientRect(), x0 = ev.clientX, y0 = ev.clientY, px = x.x, py = x.y;
          var bouger = function(m){ x.x = Math.max(0, Math.min(96, px + (m.clientX - x0) / r.width * 100)); x.y = Math.max(0, Math.min(96, py + (m.clientY - y0) / r.height * 100)); e.style.left = x.x + '%'; e.style.top = x.y + '%'; e.style.maxWidth = (98 - x.x) + '%'; };
          var lacher = function(){ e.removeEventListener('pointermove', bouger); touche(); annoncer('Texte déplacé.'); };
          e.addEventListener('pointermove', bouger); e.addEventListener('pointerup', lacher, { once: true });
        });
      }

      /* ---------- les panneaux ---------- */
      function ligneDeTemps(x, quoi, nom){
        var r = el('div', 'mvLigne2');
        r.appendChild(el('span', 'q', 'Visible de ' + M.hms(x.de) + ' à ' + M.hms(x.a)));
        r.appendChild(bouton('⏮ Début ici', 'Faire commencer ' + nom + ' à la position', function(){ x.de = Math.min(E.tete, x.a - 0.5); touche(); quoi(); annoncer(nom + ' commence à ' + M.lu(x.de) + '.'); }));
        r.appendChild(bouton('⏭ Fin ici', 'Faire finir ' + nom + ' à la position', function(){ x.a = Math.max(E.tete, x.de + 0.5); touche(); quoi(); annoncer(nom + ' finit à ' + M.lu(x.a) + '.'); }));
        return r;
      }
      var prochainId = 1;
      function dessinerTextesPanneau(){
        var z = $('mvTextes'); z.innerHTML = '';
        E.r.textes.forEach(function(x, i){
          var id = 'mvTx' + (prochainId++);
          var fs = el('fieldset', 'mvObjet');
          fs.appendChild(el('legend', '', 'Texte ' + (i + 1)));
          var ch = el('div', 'mvChamp');
          var lb = el('label', '', 'Ce qui s’affiche'); lb.htmlFor = id; ch.appendChild(lb);
          var inp = el('input'); inp.type = 'text'; inp.id = id; inp.maxLength = 120; inp.value = x.texte; ch.appendChild(inp);
          inp.addEventListener('input', function(){ x.texte = inp.value; touche(); dessinerCalque(); });
          fs.appendChild(ch);
          fs.appendChild(ligneDeTemps(x, function(){ dessinerTextesPanneau(); dessinerCalque(); }, 'le texte ' + (i + 1)));
          fs.appendChild(blocStyle(x.style, id + 'S', function(){ dessinerCalque(); }));
          fs.appendChild(bouton('🗑️ Retirer ce texte', 'Retirer le texte ' + (i + 1), function(){ E.r.textes.splice(i, 1); touche(); dessinerTextesPanneau(); dessinerCalque(); dessinerResume(); annoncer('Texte retiré.'); }));
          z.appendChild(fs);
        });
      }
      function dessinerFlous(){
        var z = $('mvFlous'); if(!z) return; z.innerHTML = '';
        E.r.flous.forEach(function(f, i){
          var fs = el('fieldset', 'mvObjet');
          fs.appendChild(el('legend', '', 'Flou ' + (i + 1)));
          fs.appendChild(ligneDeTemps(f, function(){ dessinerFlous(); dessinerCalque(); }, 'le flou ' + (i + 1)));
          var fo = el('fieldset', 'mvChoix'); fo.appendChild(el('legend', '', 'Forme'));
          [['', '▭ Rectangle (une plaque)'], ['1', '◯ Rond (un visage)']].forEach(function(x){
            var l = el('label'), rr = el('input'); rr.type = 'radio'; rr.name = 'mvFo' + i + '_' + prochainId; rr.value = x[0]; rr.checked = (f.rond ? '1' : '') === x[0];
            rr.addEventListener('change', function(){ if(rr.checked){ f.rond = !!x[0]; touche(); dessinerCalque(); } });
            l.appendChild(rr); l.appendChild(el('span', '', x[1])); fo.appendChild(l);
          });
          fs.appendChild(fo);
          fs.appendChild(el('div', 'lab', 'Points de passage'));
          var ul = el('ul', 'mvPts'); ul.setAttribute('aria-label', 'Les points de passage du flou ' + (i + 1));
          f.points.forEach(function(p, j){
            var li = el('li');
            li.appendChild(el('span', 'q', '📍 à ' + M.hms(p.t)));
            li.appendChild(bouton('Aller', 'Aller au point de passage de ' + M.lu(p.t), function(){ if(E.joue) arreter(); E.tete = p.t; voirTete(); annoncer('Position : ' + M.lu(p.t) + '.'); }));
            if(f.points.length > 1) li.appendChild(bouton('🗑️', 'Retirer le point de passage de ' + M.lu(p.t), function(){ f.points.splice(j, 1); touche(); dessinerFlous(); dessinerCalque(); annoncer('Point de passage retiré.'); }));
            ul.appendChild(li);
          });
          fs.appendChild(ul);
          fs.appendChild(bouton('📍 Poser un point de passage ici', 'Poser un point de passage à la position', function(){ pointIci(f); touche(); dessinerFlous(); dessinerCalque(); annoncer('Point de passage posé à ' + M.lu(E.tete) + '. Déplace la zone sur l’image.'); }));
          fs.appendChild(bouton('🗑️ Retirer ce flou', 'Retirer le flou ' + (i + 1), function(){ E.r.flous.splice(i, 1); touche(); dessinerFlous(); dessinerCalque(); dessinerResume(); peindreEnregistrer(); annoncer('Flou retiré.'); }));
          z.appendChild(fs);
        });
      }

      /* ---------- 💬 les sous-titres ---------- */
      function dessinerSt(){
        var l = $('mvStListe'); if(!l) return; l.innerHTML = '';
        E.st.forEach(function(c, i){
          var li = el('li');
          var id = 'mvStT' + (prochainId++);
          var lb = el('label', 'q', M.hms(c.de) + ' → ' + M.hms(c.a)); lb.htmlFor = id;
          li.appendChild(lb);
          var inp = el('input'); inp.type = 'text'; inp.id = id; inp.value = c.texte; inp.maxLength = 300;
          inp.setAttribute('aria-label', 'Phrase ' + (i + 1) + ', de ' + M.lu(c.de) + ' à ' + M.lu(c.a));
          inp.addEventListener('input', function(){ c.texte = inp.value; E.stChange = true; touche(); });
          li.appendChild(inp);
          li.appendChild(bouton('▶', 'Réécouter la phrase ' + (i + 1), function(){ reecouter(c); }));
          li.appendChild(bouton('🗑️', 'Retirer la phrase ' + (i + 1), function(){ E.st.splice(i, 1); E.stChange = true; touche(); dessinerSt(); dessinerResume(); annoncer('Phrase retirée.'); }));
          l.appendChild(li);
        });
        var b = $('mvCreerSt'); if(b && !E.stEnCours) b.textContent = E.st.length ? '🔄 Refaire les sous-titres' : '💬 Créer les sous-titres';
        var sw = $('mvSwSt');
        if(sw){ sw.setAttribute('aria-checked', E.r.sousTitres.on ? 'true' : 'false'); sw.querySelector('.etat').textContent = E.r.sousTitres.on ? 'Activé' : 'Désactivé'; }
      }
      /* Réentendre une phrase : la vidéo joue de son début à sa fin. */
      function reecouter(c){
        if(E.joue) arreter();
        E.tete = c.de; voirTete();
        var v = E.S.video, o2 = M.ou(E.r, c.a);
        var fin = o2 ? o2.temps : 0, deb = M.ou(E.r, c.de);
        setTimeout(function(){
          v.muted = false;
          var stop = function(){ if(v.currentTime >= fin - 0.05 || (deb && o2 && deb.seg !== o2.seg && v.currentTime >= deb.seg.a - 0.05)){ v.pause(); v.removeEventListener('timeupdate', stop); } };
          v.addEventListener('timeupdate', stop);
          v.play().catch(function(){});
        }, 250);
      }
      /* Le son du CONTENU (sans la musique, sans les passages coupés),
         en 16 kHz mono : ce qu'attend la reconnaissance vocale. */
      function sonDuContenu(){
        var D = dureeVideo(), TX = 16000;
        var oac = new OfflineAudioContext(1, Math.max(1, Math.ceil(D * TX)), TX);
        var tampons = {};
        var segs = M.segments(E.r);
        var decoder = function(lien){ return fetch(lien).then(function(x){ return x.arrayBuffer(); }).then(function(b){ return new OfflineAudioContext(1, TX, TX).decodeAudioData(b); }).catch(function(){ return null; }); };
        return segs.reduce(function(p, sg){
          return p.then(function(){
            var i = E.r.clips[sg.ci].i;
            if(tampons[i] !== undefined) return;
            return decoder(E.cl[i].lien).then(function(b){ tampons[i] = b; });
          });
        }, Promise.resolve()).then(function(){
          segs.forEach(function(sg){
            var b = tampons[E.r.clips[sg.ci].i]; if(!b) return;
            var src = oac.createBufferSource(); src.buffer = b;
            var g = oac.createGain(), len = sg.a - sg.de;
            g.gain.setValueAtTime(1, 0);
            E.r.muets.forEach(function(m){ var de = Math.max(m.de, sg.off), a = Math.min(m.a, sg.off + len); if(a > de){ g.gain.setValueAtTime(0, de); g.gain.setValueAtTime(1, a); } });
            src.connect(g); g.connect(oac.destination); src.start(sg.off, sg.de, len);
          });
          return oac.startRendering();
        }).then(function(b){ return b.getChannelData(0); });
      }
      /* Couper sur un silence, entre 20 et 30 s ; un morceau en WAV. */
      function morceauxDeSon(d, TX){
        var out = [], i = 0, fen = Math.round(TX * 0.25);
        while(i < d.length){
          if(d.length - i <= TX * 30){ out.push([i, d.length]); break; }
          var mieux = i + TX * 28, min = Infinity;
          for(var j = i + TX * 20; j + fen < i + TX * 30; j += fen / 2){
            var e = 0; for(var k = j; k < j + fen; k += 8) e += d[k] * d[k];
            if(e < min){ min = e; mieux = j + fen / 2; }
          }
          out.push([i, Math.round(mieux)]); i = Math.round(mieux);
        }
        return out;
      }
      function enWavBase64(d, de, a, TX){
        var n = a - de, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
        var ec = function(o2, t){ for(var i = 0; i < t.length; i++) v.setUint8(o2 + i, t.charCodeAt(i)); };
        ec(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ec(8, 'WAVE'); ec(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, TX, true); v.setUint32(28, TX * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); ec(36, 'data'); v.setUint32(40, n * 2, true);
        for(var i = 0; i < n; i++){ var x = Math.max(-1, Math.min(1, d[de + i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
        var octets = new Uint8Array(buf), bin = '';
        for(var k = 0; k < octets.length; k += 0x8000) bin += String.fromCharCode.apply(null, octets.subarray(k, k + 0x8000));
        return btoa(bin);
      }
      function creerSt(){
        if(E.stEnCours){ E.stEnCours.annule = true; return; }
        var b = $('mvCreerSt'), etat = $('mvStEtat');
        var jeton = E.stEnCours = { annule: false };
        b.textContent = '⏹ Arrêter';
        etat.textContent = '⏳ Le son de la vidéo se prépare…';
        var TX = 16000, phrases = [];
        sonDuContenu().then(function(d){
          var m = morceauxDeSon(d, TX);
          return m.reduce(function(p, x, n){
            return p.then(function(){
              if(jeton.annule) throw new Error('Arrêté.');
              etat.textContent = '⏳ Écoute de la vidéo : ' + Math.round(n / m.length * 100) + ' % (' + M.mmss(x[0] / TX) + ' sur ' + M.mmss(d.length / TX) + ')…';
              return appel({ action: 'videoSousTitres', audio: enWavBase64(d, x[0], x[1], TX), debut: x[0] / TX, titre: E.r.titre.texte || o.titre || '' }).then(function(r2){
                if(!r2 || r2.status !== 'ok') throw new Error((r2 && r2.message) || 'Reconnaissance vocale indisponible.');
                phrases = phrases.concat(r2.phrases || []);
              });
            });
          }, Promise.resolve());
        }).then(function(){
          E.st = phrases.map(function(p){ return { de: p.de, a: Math.max(p.a, p.de + 0.5), texte: p.texte }; });
          E.stChange = true; E.r.sousTitres.on = !!E.st.length; touche();
          etat.textContent = E.st.length ? '✅ ' + E.st.length + ' phrase' + (E.st.length > 1 ? 's' : '') + ' : relis-les, puis enregistre.' : 'Aucune parole reconnue dans cette vidéo.';
        }).catch(function(e){
          etat.textContent = '❌ ' + (e.message || 'Impossible pour le moment.');
        }).then(function(){ E.stEnCours = null; dessinerSt(); dessinerResume(); });
      }

      function dessinerMuets(){
        var l = $('mvMuets'); l.innerHTML = '';
        E.r.muets.forEach(function(m, i){
          var li = el('li'); li.appendChild(el('span', 'q', '🔇 Sans le son de ' + M.hms(m.de) + ' à ' + M.hms(m.a)));
          li.appendChild(bouton('🗑️ Retirer', 'Remettre le son de ' + M.lu(m.de) + ' à ' + M.lu(m.a), function(){ E.r.muets.splice(i, 1); touche(); dessinerMuets(); dessinerResume(); annoncer('Son remis.'); }));
          l.appendChild(li);
        });
        $('mvMuetDe').disabled = E.muetDe !== null; $('mvMuetA').disabled = E.muetDe === null;
        $('mvMuetA').textContent = E.muetDe === null ? '🔈 Le silence s’arrête ici' : '🔈 Le silence s’arrête ici (commencé à ' + M.hms(E.muetDe) + ')';
      }
      function dessinerTete(){
        var i = $('mvTeteR'), d = dureeVideo(); i.max = d.toFixed(1); if(E.tete > d) E.tete = d; i.value = E.tete.toFixed(1);
        i.setAttribute('aria-valuetext', M.lu(E.tete)); $('mvTeteVal').textContent = M.hms(E.tete) + ' / ' + M.hms(d);
      }
      function dessinerResume(){
        var r = E.r, p = [];
        if(r.copy.on) p.push('avertissement 7 s'); if(r.titre.on) p.push('titre ' + String(r.titre.duree).replace('.', ',') + ' s');
        p.push(r.clips.length + ' vidéo' + (r.clips.length > 1 ? 's' : '') + ' ' + M.hms(dureeVideo()));
        if(r.gen.on) p.push('générique 8 s');
        var plus = [];
        if(r.textes.length) plus.push(r.textes.length + ' texte' + (r.textes.length > 1 ? 's' : ''));
        if(r.muets.length) plus.push(r.muets.length + ' passage' + (r.muets.length > 1 ? 's' : '') + ' sans le son');
        if(r.musique.on) plus.push('musique');
        if(r.flous.length) plus.push(r.flous.length + ' flou' + (r.flous.length > 1 ? 's' : '') + ' (vidéo à fabriquer)');
        if(E.st.length) plus.push(E.st.length + ' sous-titre' + (E.st.length > 1 ? 's' : ''));
        var z = $('mvResume'); z.innerHTML = '';
        z.appendChild(el('b', '', 'Durée finale : ' + M.hms(M.dureeTotale(r))));
        z.appendChild(el('br')); z.appendChild(document.createTextNode(p.join(' · ')));
        if(plus.length){ z.appendChild(el('br')); z.appendChild(document.createTextNode(plus.join(' · '))); }
        if(!E.joue) $('mvTemps').textContent = '0:00,0 / ' + M.hms(M.dureeTotale(r));
      }
      function tout(){ dessinerHabillage(); dessinerClips(); dessinerBande(); dessinerMorceaux(); dessinerTete(); dessinerMuets(); dessinerFlous(); dessinerSt(); dessinerResume(); }
      function peindreEnregistrer(){
        var b = $('mvEnregistrer'); if(!b) return;
        b.textContent = E.mode === 'soustitres' ? '💾 Enregistrer les sous-titres' : (E.r.flous.length ? '🎞️ Fabriquer la vidéo floutée' : '💾 Enregistrer le montage');
      }

      /* La vidéo, à la position : l'image qu'on règle. */
      var enVue = { ci: -1, src: '' };
      function voirTete(){
        dessinerTete(); var o2 = M.ou(E.r, E.tete); if(!o2) return;
        var c = E.r.clips[o2.seg.ci], src = E.cl[c.i], v = E.S.video;
        E.S.scene.classList.toggle('paysage', src.l > src.h);
        var poser = function(){ try{ v.currentTime = o2.temps; }catch(e){} };
        if(enVue.src !== src.lien){ enVue.src = src.lien; v.src = src.lien; v.addEventListener('loadedmetadata', poser, { once: true }); }
        else poser();
        dessinerCalque(); dessinerBande(); dessinerMorceaux();
      }

      /* ---------- la lecture ---------- */
      function lire(sauter){
        if(E.joue) arreter();
        E.joue = true;
        E.S.calque.innerHTML = '';
        E.S.scene.classList.remove('edition');
        var clips = E.cl.map(function(c){ return { lien: c.lien }; });
        E.m = M.moteur(E.S, { recette: E.r, clips: clips, musique: E.r.musique.on && E.mus ? lienEntier(E.mus.lien) : null, persos: E.persos,
                              cues: E.st, cc: function(){ return E.r.sousTitres.on; } });
        enVue.src = '';
        var debut = Date.now();
        E.m.sur('temps', function(){ $('mvTemps').textContent = M.hms((Date.now() - debut) / 1000) + ' / ' + M.hms(M.dureeTotale(E.r)); });
        E.m.sur('fin', function(){ arreter(); annoncer('Fin du montage.'); });
        $('mvLire').textContent = '⏹ Arrêter'; $('mvLire').setAttribute('aria-pressed', 'true');
        annoncer('Lecture du montage.');
        E.m.lire(!!sauter);
      }
      function arreter(){
        if(E.m){ var m = E.m; E.m = null; m.detruire(); }
        E.joue = false;
        $('mvLire').textContent = '▶ Lire le montage'; $('mvLire').setAttribute('aria-pressed', 'false');
        E.S.grand.hidden = false; E.S.grand.textContent = '▶'; E.S.grand.setAttribute('aria-label', 'Lire le montage');
        enVue.src = ''; ongletEdition();
        dessinerHabillage(); dessinerResume(); voirTete();
      }
      function ongletEdition(){ var t = boite.querySelector('[role=tab][aria-selected=true]'); E.S.scene.classList.toggle('edition', !!t && (t.id === 'mvOgT' || t.id === 'mvOgF')); }

      /* ---------- les branchements ---------- */
      function interrupteur(id, partie, apres){
        var b = $(id);
        var peindre = function(){ b.setAttribute('aria-checked', E.r[partie].on ? 'true' : 'false'); b.querySelector('.etat').textContent = E.r[partie].on ? 'Activé' : 'Désactivé'; if(apres) apres(); };
        b.addEventListener('click', function(){ E.r[partie].on = !E.r[partie].on; touche(); peindre(); dessinerResume(); annoncer(b.querySelector('.nom').textContent + ' : ' + (E.r[partie].on ? 'activé' : 'désactivé') + '.'); });
        peindre();
      }
      function radios(nom, valeur, f){ boite.querySelectorAll('input[name="' + nom + '"]').forEach(function(r){ r.checked = String(r.value) === String(valeur); r.addEventListener('change', function(){ if(r.checked){ touche(); f(r.value); } }); }); }
      var montrerFili = null;
      function apresFili(){
        dessinerHabillage();
        if(E.joue) return;
        E.S.fili.classList.add('on');
        clearTimeout(montrerFili); montrerFili = setTimeout(function(){ if(!E.joue) E.S.fili.classList.remove('on'); }, 1500);
      }
      function brancher(){
        var tabs = [].slice.call(boite.querySelectorAll('[role=tab]'));
        var choisir = function(t, focus){ tabs.forEach(function(x){ var on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $(x.getAttribute('aria-controls')).hidden = !on; }); ongletEdition(); if(focus) t.focus(); };
        tabs.forEach(function(t, i){
          t.addEventListener('click', function(){ choisir(t); });
          t.addEventListener('keydown', function(e){ var n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key]; if(n === undefined) return; e.preventDefault(); choisir(tabs[(n + tabs.length) % tabs.length], true); });
        });
        $('mvLire').addEventListener('click', function(){ if(E.joue) arreter(); else lire(false); });
        E.S.grand.addEventListener('click', function(){ lire(false); });
        $('mvPasser').addEventListener('click', function(){ lire(true); });
        $('mvTeteR').addEventListener('input', function(e){ if(E.joue) arreter(); E.tete = +e.target.value; voirTete(); });
        $('mvDebut').addEventListener('input', function(e){ var c = E.r.clips[E.sel]; c.debut = Math.min(+e.target.value, c.fin - 1); touche(); var s = M.segments(E.r).filter(function(x){ return x.ci === E.sel; })[0]; if(s) E.tete = s.off; dessinerClips(); dessinerResume(); voirTete(); });
        $('mvFin').addEventListener('input', function(e){ var c = E.r.clips[E.sel]; c.fin = Math.max(+e.target.value, c.debut + 1); touche(); var s = M.segments(E.r).filter(function(x){ return x.ci === E.sel; }); if(s.length){ var l = s[s.length - 1]; E.tete = Math.max(l.off, l.off + l.a - l.de - 0.1); } dessinerClips(); dessinerResume(); voirTete(); });
        ['mvDebut', 'mvFin'].forEach(function(id){ $(id).addEventListener('change', function(){ var c = E.r.clips[E.sel]; annoncer((id === 'mvDebut' ? 'Début' : 'Fin') + ' à ' + M.lu(id === 'mvDebut' ? c.debut : c.fin) + '. Vidéo montée : ' + M.lu(dureeVideo()) + '.'); }); });
        $('mvCouper').addEventListener('click', function(){ var o2 = M.ou(E.r, E.tete), c = E.r.clips[E.sel]; c.coupes.push(Math.round(o2.temps * 10) / 10); c.coupes.sort(function(a, b){ return a - b; }); touche(); tout(); annoncer('Coupé à ' + M.lu(o2.temps) + '. ' + M.morceauxDe(c).length + ' morceaux.'); });
        $('mvAjoutClip').addEventListener('click', function(){ $('mvAjoutFichier').click(); });
        $('mvAjoutFichier').addEventListener('change', function(e){
          var f = e.target.files && e.target.files[0]; e.target.value = '';
          if(!f) return;
          if(!/\.mp4$/i.test(f.name)){ annoncer('Seules les vidéos .mp4 se déposent.'); return; }
          $('mvAjoutClip').disabled = true; $('mvAjoutClip').textContent = '⏳ Lecture de ' + f.name + '…';
          preparerClip({ fichier: f }).then(function(x){
            $('mvAjoutClip').textContent = '➕ Ajouter une vidéo à la suite';
            if(x.erreur){ annoncer('Cette vidéo ne se lit pas dans ce navigateur.'); dessinerClips(); return; }
            E.cl.push(x); E.r.clips.push(nouveauClip(E.cl.length - 1)); E.sel = E.r.clips.length - 1; touche(); tout(); voirTete();
            annoncer('« ' + x.court + ' » ajoutée à la suite. Vidéo montée : ' + M.lu(dureeVideo()) + '.');
          });
        });
        $('mvChTitre').value = E.r.titre.texte; $('mvChTitre').addEventListener('input', function(e){ E.r.titre.texte = e.target.value; touche(); dessinerHabillage(); });
        $('mvChSous').value = E.r.titre.sous; $('mvChSous').addEventListener('input', function(e){ E.r.titre.sous = e.target.value; touche(); dessinerHabillage(); });
        $('mvChCopy').value = E.r.copy.texte; $('mvChCopy').addEventListener('input', function(e){ E.r.copy.texte = e.target.value; touche(); dessinerHabillage(); });
        $('mvChFili').value = E.r.fili.texte; $('mvChFili').addEventListener('input', function(e){ E.r.fili.texte = e.target.value; touche(); apresFili(); });
        $('mvChGen').value = E.r.gen.texte; $('mvChGen').addEventListener('input', function(e){ E.r.gen.texte = e.target.value; touche(); dessinerHabillage(); });
        $('mvChSous').closest('.mvChamp').after(blocStyle(E.r.titre.style, 'mvStTitre', dessinerHabillage));
        $('mvChCopy').closest('.mvChamp').after(blocStyle(E.r.copy.style, 'mvStCopy', dessinerHabillage));
        $('mvChFili').closest('.mvChamp').after(blocStyle(E.r.fili.style, 'mvStFili', apresFili));
        $('mvChGen').closest('.mvChamp').after(blocStyle(E.r.gen.style, 'mvStGen', dessinerHabillage));
        interrupteur('mvSwCarton', 'titre'); interrupteur('mvSwCopy', 'copy'); interrupteur('mvSwFili', 'fili', apresFili); interrupteur('mvSwGen', 'gen');
        radios('mvDurTitre', E.r.titre.duree, function(v){ E.r.titre.duree = +v; dessinerResume(); });
        radios('mvPos', E.r.fili.pos, function(v){ E.r.fili.pos = v; apresFili(); annoncer('Copyright : ' + M.PLACES.filter(function(p){ return p[0] === v; })[0][1].slice(2) + '.'); });
        ['titre', 'coupe', 'fin'].forEach(function(k){ radios('mvTr' + k, E.r.tr[k], function(v){ E.r.tr[k] = v; }); });
        $('mvAjoutTexte').addEventListener('click', function(){
          if(E.joue) arreter();
          var d = dureeVideo();
          E.r.textes.push({ texte: 'Regarde ici', de: Math.min(E.tete, Math.max(0, d - 1)), a: Math.min(d, E.tete + 3), x: 22, y: 18, style: M.copie(E.reg.textes.style) });
          touche(); dessinerTextesPanneau(); dessinerCalque(); dessinerResume();
          var ins = $('mvTextes').querySelectorAll('input[type=text]'); var i = ins[ins.length - 1]; if(i){ i.focus(); i.select(); }
          annoncer('Texte ajouté, visible 3 secondes à partir de ' + M.lu(E.tete) + '.');
        });
        $('mvMuetDe').addEventListener('click', function(){ E.muetDe = E.tete; dessinerMuets(); $('mvMuetA').focus(); annoncer('Le silence commence à ' + M.lu(E.tete) + '. Place la fin, puis touche « Le silence s’arrête ici ».'); });
        $('mvMuetA').addEventListener('click', function(){ var de = Math.min(E.muetDe, E.tete), a = Math.max(E.muetDe, E.tete); if(a - de < 0.3) a = de + 1; E.r.muets.push({ de: de, a: a }); E.muetDe = null; touche(); dessinerMuets(); dessinerResume(); $('mvMuetDe').focus(); annoncer('Sans le son de ' + M.lu(de) + ' à ' + M.lu(a) + '.'); });
        var peindreMusique = function(){
          var l = $('mvMusGardeL'); l.hidden = !E.mus;
          if(E.mus) $('mvMusGardeT').textContent = '🎵 ' + (E.mus.nom || 'La musique choisie');
          boite.querySelectorAll('input[name=mvMus]').forEach(function(r){ r.checked = (r.value === 'garde') ? (E.r.musique.on && !!E.mus) : (r.value === '' ? !(E.r.musique.on && E.mus) : false); });
        };
        boite.querySelectorAll('input[name=mvMus]').forEach(function(r){ r.addEventListener('change', function(){
          if(!r.checked) return;
          if(r.value === 'fichier'){ peindreMusique(); $('mvMusFichier').click(); return; }
          E.r.musique.on = r.value === 'garde'; touche(); dessinerResume(); annoncer(E.r.musique.on ? 'Musique choisie.' : 'Pas de musique.');
        }); });
        $('mvMusFichier').addEventListener('change', function(e){
          var f = e.target.files && e.target.files[0]; e.target.value = '';
          if(!f) return;
          if(!/\.(mp3|m4a)$/i.test(f.name)){ annoncer('Seules les musiques .mp3 ou .m4a se déposent.'); return; }
          E.mus = { fichier: f, lien: URL.createObjectURL(f), nom: f.name.replace(/\.[^.]+$/, '') };
          E.r.musique.on = true; E.r.musique.nom = E.mus.nom; touche(); peindreMusique(); dessinerResume();
          annoncer('Musique « ' + E.mus.nom + ' » choisie.');
        });
        peindreMusique();
        radios('mvMusOu', E.r.musique.ou, function(v){ E.r.musique.ou = v; });
        [['mvVolMus', 'vol'], ['mvVolVid', 'volVid']].forEach(function(x){
          var i = $(x[0]); i.value = Math.round(E.r.musique[x[1]] * 100);
          var maj = function(){ E.r.musique[x[1]] = +i.value / 100; $(x[0] + 'Val').textContent = i.value + ' %'; i.setAttribute('aria-valuetext', i.value + ' pour cent'); };
          i.addEventListener('input', function(){ touche(); maj(); }); maj();
        });
        $('mvAjoutFlou').addEventListener('click', function(){
          if(E.joue) arreter();
          var d = dureeVideo(), de = Math.min(E.tete, Math.max(0, d - 1));
          E.r.flous.push({ de: de, a: Math.min(d, E.tete + 3), rond: false, points: [{ t: Math.round(de * 10) / 10, x: 35, y: 55, w: 30, h: 10 }] });
          touche(); dessinerFlous(); dessinerCalque(); dessinerResume(); peindreEnregistrer();
          var z = E.S.calque.querySelector('.mvFlou'); if(z) z.focus();
          annoncer('Flou ajouté, de ' + M.lu(de) + ' à ' + M.lu(Math.min(d, E.tete + 3)) + '. Fais-le glisser sur ce qu’il faut cacher.');
        });
        $('mvSwSt').addEventListener('click', function(){ E.r.sousTitres.on = !E.r.sousTitres.on; E.stChange = true; touche(); dessinerSt(); annoncer('Sous-titres ' + (E.r.sousTitres.on ? 'proposés' : 'cachés') + ' à l’élève.'); });
        $('mvCreerSt').addEventListener('click', function(){
          if(E.st.length && !E.stEnCours && !E.stConfirme){
            E.stConfirme = true;
            $('mvStEtat').textContent = '⚠️ Refaire remplace les ' + E.st.length + ' phrases (et tes corrections). Touche encore « Refaire » pour confirmer.';
            return;
          }
          E.stConfirme = false; creerSt();
        });
        $('mvAjoutSt').addEventListener('click', function(){
          var d = dureeVideo(), de = Math.min(E.tete, Math.max(0, d - 1));
          E.st.push({ de: de, a: Math.min(d, de + 2.5), texte: '' }); E.st.sort(function(a, b){ return a.de - b.de; });
          E.stChange = true; E.r.sousTitres.on = true; touche(); dessinerSt(); dessinerResume();
          var ins = [].slice.call($('mvStListe').querySelectorAll('input')); var n = ins.filter(function(x){ return !x.value; })[0]; if(n) n.focus();
          annoncer('Phrase ajoutée à ' + M.lu(de) + ' : écris-la.');
        });
        $('mvEnregistrer').addEventListener('click', enregistrer);
        var bs = $('mvSans'); if(bs) bs.addEventListener('click', function(){ fermer({ sans: true }); });
        peindreEnregistrer();
        /* 💬 Une vidéo déjà fabriquée : seuls ses sous-titres se reprennent
           (la vidéo d'origine n'existe plus). */
        if(E.mode === 'soustitres'){
          tabs.forEach(function(t){ if(t.id !== 'mvOgST') t.hidden = true; });
          boite.querySelector('.mvOnglets').style.gridTemplateColumns = '1fr';
          choisir($('mvOgST'));
          $('mvPasser').hidden = true;
        }
      }

      /* ---------- enregistrer : la recette, et ce qu'il reste à déposer ---------- */
      function enregistrer(){
        if(E.joue) arreter();
        /* Seules les vidéos encore dans le montage partent, dans
           l'ordre de leur première place. */
        var pris = [], ordre = {};
        E.r.clips.forEach(function(c){ if(ordre[c.i] === undefined){ ordre[c.i] = pris.length; pris.push(E.cl[c.i]); } });
        var r = M.copie(E.r);
        r.clips.forEach(function(c){ c.i = ordre[c.i]; });
        /* Les polices de l'école que la recette emploie : leurs clés
           partent avec elle (le relais les signe pour l'élève). */
        var fp = {};
        M.stylesDe(r).forEach(function(s){ if(/^p:/.test(s.police)){ var k = s.police.slice(2); var p = E.persos[k]; var cle = (p && p.cle) || ((o.recette && o.recette.fichiers && o.recette.fichiers.polices) || {})[k]; if(cle) fp[k] = cle; } });
        r.fichiers = {};
        if(Object.keys(fp).length) r.fichiers.polices = fp;
        if(!(r.musique.on && E.mus)) r.musique.on = false;
        else if(E.mus.cle) r.fichiers.musique = E.mus.cle;
        r.sousTitres = { on: !!(E.r.sousTitres.on && E.st.length), n: E.st.length };
        var propre = M.recettePropre(r, pris.length);
        var st = { cues: E.st.filter(function(c){ return String(c.texte || '').trim(); }), change: E.stChange };
        if(E.mode === 'soustitres'){ fermer({ sousTitres: st, on: propre.sousTitres.on }); return; }
        var res = {
          recette: propre,
          clips: pris.map(function(c){ return c.fichier ? { fichier: c.fichier, duree: c.duree, l: c.l, h: c.h, vignette: (c.vignettes || [])[0] || '' } : { cle: c.cle, lien: c.lien, duree: c.duree, l: c.l, h: c.h, vignette: (c.vignettes || [])[0] || '' }; }),
          musique: propre.musique.on ? (E.mus.fichier ? { fichier: E.mus.fichier, nom: E.mus.nom } : { cle: E.mus.cle, lien: E.mus.lien, nom: E.mus.nom }) : null,
          sousTitres: st
        };
        if(!propre.flous.length){ fermer(res); return; }
        fabriquerEtFermer(res, pris);
      }

      /* ============================================================
         🎞️ UNE VIDÉO FLOUTÉE SE FABRIQUE — le choix de David (23/10)

         Le flou n'est pas posé par-dessus : la vidéo est redessinée
         ici, avec tout son montage dans l'image, puis déposée à la
         place de l'originale — qui sera effacée à l'enregistrement du
         guide.
         ============================================================ */
      function fabriquerEtFermer(res, pris){
        var zone = boite.querySelector('.mvFabrique');
        if(zone) zone.remove();
        zone = el('div', 'mvBandeau mvFabrique'); zone.setAttribute('role', 'alertdialog'); zone.setAttribute('aria-labelledby', 'mvFabQ');
        boite.querySelector('.mvActions').before(zone);
        var dire = function(t){ var p = el('p', '', t); p.id = 'mvFabQ'; p.style.margin = '0 0 8px'; zone.appendChild(p); };
        if(typeof ECFabrique === 'undefined'){ dire('La fabrique des vidéos n’est pas chargée : recharge la page.'); return; }
        var c0 = pris[0] || {};
        ECFabrique.possible({ l: c0.l, h: c0.h, essai: !!o.essai }).then(function(cap){
          zone.innerHTML = '';
          if(!cap.ok){
            dire('⚠️ ' + cap.raison);
            zone.appendChild(el('p', '', 'Le montage n’est pas perdu tant que tu ne fermes pas : ouvre ce guide sur l’ordinateur du bureau pour fabriquer la vidéo, ou retire le flou.'));
            zone.querySelector('p').focus && zone.setAttribute('tabindex', '-1');
            zone.focus();
            return;
          }
          var duree = M.dureeTotale(res.recette);
          dire('🎞️ La vidéo va être fabriquée (' + cap.l + ' × ' + cap.h + ', ≈ ' + M.mmss(M.dureeContenu(res.recette)) + ' d’attente). Le flou sera dans l’image ; la vidéo d’origine sera effacée à l’enregistrement du guide.');
          var a = el('div', 'mvActions');
          a.appendChild(bouton('🎞️ Fabriquer maintenant', null, function(){
            zone.remove();
            ECFabrique.fenetre({
              titre: 'Fabrication de la vidéo floutée', dureeEstimee: M.dureeContenu(res.recette),
              recette: res.recette, clips: pris.map(function(c){ return { lien: c.lien }; }),
              musique: res.recette.musique.on && E.mus ? lienEntier(E.mus.lien) : null,
              persos: E.persos, essai: !!o.essai
            }).then(function(x){
              x.duree = x.duree || duree;
              res.fabrique = x;
              fermer(res);
            }, function(e){
              annoncer('Fabrication arrêtée : ' + e.message);
              var b = el('div', 'mvBandeau mvFabrique'); b.setAttribute('role', 'alert'); b.textContent = '❌ ' + e.message;
              boite.querySelector('.mvActions').before(b);
            });
          }, 'prim'));
          a.appendChild(bouton('Pas maintenant', null, function(){ zone.remove(); $('mvEnregistrer').focus(); }));
          zone.appendChild(a);
          a.querySelector('button').focus();
        });
      }
    });
  };

  /* ============================================================
     🎬 OUTILS › CE QU'ON ÉCRIT › SQUELETTE DES VIDÉOS

     Ce que chaque nouveau montage reprend : l'avertissement, le
     copyright (texte, place), le générique, la durée du titre, les
     transitions, le « style maison » des textes posés sur l'image
     (« oui », le 23 octobre), et les polices de l'école.
     Administrateurs seuls pour changer ; les autres voient.
     ============================================================ */
  var SQ = { d: null, brouillon: null };
  window.afficherSqueletteVideo = function(){
    poserLeStyle();
    var z = document.getElementById('squeletteZone');
    if(!z) return;
    z.innerHTML = '<div class="empty">Chargement…</div>';
    reglagesVideo(true).then(function(d){
      SQ.d = d;
      SQ.brouillon = M.squelettePropre(d.reglages || {});
      dessinerSquelette(z);
    });
  };
  function dessinerSquelette(z){
    var d = SQ.d, s = SQ.brouillon, admin = !!d.admin;
    z.innerHTML = '';
    var w = el('div', 'mv mvSq'); w.style.maxWidth = '760px'; w.style.margin = '0';
    var intro = el('p', 'mvAide', 'Ce que chaque nouveau montage reprend tout seul (le bloc « 🎬 Vidéo » d’un guide, Suivi › Groupes et guides). Chaque vidéo peut ensuite le changer pour elle seule. Les vidéos déjà montées gardent ce qu’elles avaient.' + (admin ? '' : ' Seul un administrateur le modifie.'));
    w.appendChild(intro);
    if(d.horsLigne) w.appendChild(el('p', 'mvAvert', '⚠️ Réglages lus hors ligne : ce sont ceux des vidéos d’origine.'));
    var annonce = el('div', 'mvSr'); annonce.setAttribute('role', 'status'); annonce.setAttribute('aria-live', 'polite');
    var dire = function(t){ annonce.textContent = ''; setTimeout(function(){ annonce.textContent = t; }, 30); };
    var persos = {};
    s.polices.forEach(function(p){ persos[p.id] = { nom: p.nom, lien: lienEntier(p.lien), cle: p.cle }; });
    M.chargerLesPolices([s.copy.style, s.fili.style, s.gen.style, s.titre.style, s.textes.style], persos);

    var section = function(t){ var h = el('h3', '', t); h.style.cssText = 'margin:18px 0 6px;font-size:15px;color:var(--texte);'; w.appendChild(h); };
    var inter = function(partie, nom){
      var b = el('button', 'mvInter'); b.type = 'button'; b.setAttribute('role', 'switch');
      b.innerHTML = '<span class="pis" aria-hidden="true"></span><span class="nom"></span><span class="etat"></span>';
      b.querySelector('.nom').textContent = nom;
      var p = function(){ b.setAttribute('aria-checked', s[partie].on ? 'true' : 'false'); b.querySelector('.etat').textContent = s[partie].on ? 'Activé' : 'Désactivé'; };
      b.disabled = !admin;
      b.addEventListener('click', function(){ s[partie].on = !s[partie].on; p(); dire(nom + ' : ' + (s[partie].on ? 'activé' : 'désactivé') + '.'); });
      p(); w.appendChild(b);
    };
    var champ = function(id, nom, val, long, max, quoi){
      var c = el('div', 'mvChamp'); var l = el('label', '', nom); l.htmlFor = id; c.appendChild(l);
      var i = el(long ? 'textarea' : 'input'); if(!long) i.type = 'text'; i.id = id; i.value = val; i.maxLength = max; if(long) i.rows = 5;
      i.disabled = !admin; i.addEventListener('input', function(){ quoi(i.value); });
      c.appendChild(i); w.appendChild(c);
    };
    var choix = function(nom, liste, val, quoi){
      var fs = el('fieldset', 'mvChoix'); fs.appendChild(el('legend', '', nom));
      var n = 'sq' + Math.random().toString(36).slice(2, 7);
      liste.forEach(function(x){ var l = el('label'); var r = el('input'); r.type = 'radio'; r.name = n; r.value = x[0]; r.checked = String(x[0]) === String(val); r.disabled = !admin; r.addEventListener('change', function(){ if(r.checked) quoi(x[0]); }); l.appendChild(r); l.appendChild(el('span', '', x[1])); fs.appendChild(l); });
      w.appendChild(fs);
    };
    var style = function(st){
      var dd = el('details', 'mvStyle'); dd.appendChild(el('summary', '', '🎨 Police, taille, couleur'));
      var n = 'sq' + Math.random().toString(36).slice(2, 7);
      var polices = M.POLICES.map(function(x){ return [x[0], x[1], x[2], x[3]]; });
      s.polices.forEach(function(p){ if(p.lien) polices.push(['p:' + p.id, p.nom, '"EC Perso ' + p.id + '",system-ui,sans-serif', 400]); });
      var av = el('p', 'mvAvert'); av.setAttribute('aria-live', 'polite');
      var avertir = function(){ var r = M.contrasteDuStyle(st); av.textContent = r < 4.5 ? '⚠️ Peu lisible (' + r.toFixed(1).replace('.', ',') + ' : 1) : change la couleur ou le fond.' : ''; };
      [['Police', polices, 'police'], ['Taille', M.TAILLES, 'taille'], ['Couleur du texte', M.COULEURS, 'couleur'], ['Fond derrière le texte', M.FONDS, 'fond']].forEach(function(g){
        var fs = el('fieldset', 'mvChoix'); fs.appendChild(el('legend', '', g[0]));
        g[1].forEach(function(x){
          var l = el('label'); var r = el('input'); r.type = 'radio'; r.name = n + g[2]; r.value = x[0]; r.checked = st[g[2]] === x[0]; r.disabled = !admin;
          r.addEventListener('change', function(){ if(r.checked){ st[g[2]] = x[0]; avertir(); M.chargerLesPolices([st], persos); } });
          var sp = el('span');
          if(g[2] === 'couleur') sp.innerHTML = '<i class="mvPastille" style="background:' + x[0] + '"></i>' + x[1];
          else { sp.textContent = x[1]; if(g[2] === 'police'){ sp.style.fontFamily = x[2]; sp.style.fontWeight = Math.min(x[3], 700); } }
          l.appendChild(r); l.appendChild(sp); fs.appendChild(l);
        });
        if(g[2] === 'couleur'){
          var lp = el('label', 'perso'); var ic = el('input'); ic.type = 'color'; ic.setAttribute('aria-label', 'Autre couleur du texte'); ic.disabled = !admin;
          var sp2 = el('span'); lp.appendChild(ic); lp.appendChild(sp2); fs.appendChild(lp);
          var pp = function(){ var pre = M.COULEURS.some(function(x){ return x[0] === st.couleur; }); lp.classList.toggle('on', !pre); sp2.innerHTML = '<i class="mvPastille" style="background:' + (pre ? 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' : st.couleur) + '"></i>' + (pre ? '🎨 Autre couleur…' : 'Ma couleur ' + st.couleur); ic.value = st.couleur.toLowerCase(); };
          ic.addEventListener('input', function(){ st.couleur = ic.value.toUpperCase(); fs.querySelectorAll('input[type=radio]').forEach(function(r){ r.checked = false; }); pp(); avertir(); });
          fs.querySelectorAll('input[type=radio]').forEach(function(r){ r.addEventListener('change', pp); });
          pp();
        }
        dd.appendChild(fs);
      });
      dd.appendChild(av); avertir();
      w.appendChild(dd);
    };

    section('L’avertissement, au début');
    inter('copy', 'Avertissement au début (≈ 7 s)');
    champ('sqCopy', 'Texte de l’avertissement', s.copy.texte, true, 600, function(v){ s.copy.texte = v; });
    style(s.copy.style);
    section('Le carton titre');
    inter('titre', 'Carton titre (fond noir, avant la vidéo)');
    choix('Durée du carton', [[2, '2 s'], [2.5, '2,5 s (comme tes vidéos)'], [4, '4 s']], s.titre.duree, function(v){ s.titre.duree = v; });
    style(s.titre.style);
    section('Le copyright, pendant la vidéo');
    inter('fili', 'Copyright incrusté pendant la vidéo');
    champ('sqFili', 'Texte du copyright', s.fili.texte, false, 60, function(v){ s.fili.texte = v; });
    choix('Place du copyright', M.PLACES, s.fili.pos, function(v){ s.fili.pos = v; });
    style(s.fili.style);
    section('Le générique, à la fin');
    inter('gen', 'Générique de fin (≈ 8 s)');
    champ('sqGen', 'Lignes du générique', s.gen.texte, true, 600, function(v){ s.gen.texte = v; });
    style(s.gen.style);
    section('Le style maison des textes posés sur l’image');
    w.appendChild(el('p', 'mvAide', 'Un texte ajouté pendant la vidéo (« Regarde le rétro ici ») part avec ce style ; on peut le changer pour un texte seul.'));
    style(s.textes.style);
    section('Les transitions');
    choix('Entre le titre et la vidéo', M.TRANSITIONS, s.tr.titre, function(v){ s.tr.titre = v; });
    choix('Entre deux morceaux, ou deux vidéos', M.TRANSITIONS, s.tr.coupe, function(v){ s.tr.coupe = v; });
    choix('Avant le générique', M.TRANSITIONS, s.tr.fin, function(v){ s.tr.fin = v; });

    section('Les polices de l’école');
    w.appendChild(el('p', 'mvAide', 'En plus des 6 polices de l’éditeur. Un fichier .woff2, .woff, .ttf ou .otf ; prends seulement une police dont la licence permet l’usage sur le web (celles de Google Fonts, par exemple).'));
    var lp = el('ul', 'mvMorceaux'); lp.setAttribute('aria-label', 'Les polices de l’école');
    if(!s.polices.length) lp.appendChild(el('li', '', 'Aucune pour l’instant.'));
    s.polices.forEach(function(p, i){
      var li = el('li'); var q = el('span', 'q', p.nom + ' — Abc éàç 123'); q.style.fontFamily = '"EC Perso ' + p.id + '",system-ui,sans-serif'; q.style.fontSize = '17px'; li.appendChild(q);
      if(admin) li.appendChild(bouton('🗑️ Retirer', 'Retirer la police ' + p.nom, function(){ s.polices.splice(i, 1); dessinerSquelette(z); dire('Police retirée. Les vidéos qui l’emploient la gardent.'); }));
      lp.appendChild(li);
    });
    w.appendChild(lp);
    if(admin){
      var fi = el('input'); fi.type = 'file'; fi.accept = '.woff2,.woff,.ttf,.otf'; fi.className = 'mvSr'; fi.tabIndex = -1; fi.setAttribute('aria-hidden', 'true');
      var bp = bouton('➕ Ajouter une police', null, function(){ fi.click(); }, 'mvPleine');
      fi.addEventListener('change', function(){
        var f = fi.files && fi.files[0]; fi.value = '';
        if(!f) return;
        if(!/\.(woff2?|ttf|otf)$/i.test(f.name)){ dire('Ce fichier n’est pas une police.'); return; }
        if(s.polices.length >= 10){ dire('Dix polices au plus.'); return; }
        bp.disabled = true; bp.textContent = '📤 Dépôt de ' + f.name + '…';
        Promise.resolve(typeof deposerUnFichier === 'function' ? deposerUnFichier('police', f) : Promise.reject(new Error('dépôt indisponible')))
          .then(function(cle){
            var id = 'p' + Date.now().toString(36).slice(-6);
            s.polices.push({ id: id, nom: f.name.replace(/\.[^.]+$/, '').slice(0, 40), cle: cle, lien: '' });
            return enregistrerSquelette(z, '✅ Police ajoutée.');
          })
          .catch(function(e){ bp.disabled = false; bp.textContent = '➕ Ajouter une police'; dire('❌ ' + (e.message || 'Dépôt impossible')); if(typeof showToast === 'function') showToast('Dépôt impossible : ' + e.message); });
      });
      w.appendChild(fi); w.appendChild(bp);

      var act = el('div', 'mvActions');
      act.appendChild(bouton('💾 Enregistrer le squelette', null, function(){ enregistrerSquelette(z, '✅ Squelette enregistré.'); }, 'prim'));
      act.appendChild(bouton('↩️ Revenir aux vidéos d’origine', null, function(){ var p = s.polices; SQ.brouillon = M.squelettePropre({}); SQ.brouillon.polices = p; dessinerSquelette(z); dire('Réglages des vidéos d’origine remis : enregistre pour les garder.'); }));
      w.appendChild(act);
    }
    if(d.majLe) w.appendChild(el('p', 'mvAide', 'Réglé le ' + d.majLe + (d.par ? ' par ' + d.par : '') + '.'));
    w.appendChild(annonce);
    z.appendChild(w);
  }
  function enregistrerSquelette(z, message){
    var s = M.copie(SQ.brouillon);
    s.polices = s.polices.map(function(p){ return { id: p.id, nom: p.nom, cle: p.cle }; });
    return appel({ action: 'videoReglagesPoser', reglages: s }).then(function(d){
      if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'Refusé');
      reglagesEnCache = d; SQ.d = d; SQ.brouillon = M.squelettePropre(d.reglages || {});
      dessinerSquelette(z);
      if(typeof showToast === 'function') showToast(message);
    }).catch(function(e){ if(typeof showToast === 'function') showToast('❌ ' + (e.message || 'Enregistrement impossible')); });
  }

  window.ECMontageEditeur = { reglagesVideo: reglagesVideo, persosDe: persosDe, lienEntier: lienEntier };
})();

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-montage-editeur.js'] = true;
