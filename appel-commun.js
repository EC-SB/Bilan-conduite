/* Déployé le 15/10/2026 à 17:23 — v1186 */
/* ============================================================
   appel-commun.js — 📞 LES APPELS, MÊME ÉCRAN DES DEUX CÔTÉS

   David, le 15 octobre : des appels vocaux et vidéo « pour faire les
   corrections post-permis ou autre ». Option 3 du schéma : à
   plusieurs (6 au plus), dans la messagerie, équipe et élèves ; les
   icônes dessinées comme celles de la barre d'écriture, à la
   Messenger.

   Ce fichier est chargé par l'application (index.html) ET par
   l'espace élève (eleve.html) : l'écran d'appel, la sonnerie et la
   mécanique WebRTC sont les mêmes. Chaque page lui donne sa porte
   (l'adresse « /appel » du Worker) et le billet que le Worker lui a
   remis après avoir vérifié qui elle est.

   ⚠️ ÉCRIT EN ES5 (var, function), comme eleve.html : les vieux
   téléphones des élèves lisent la page entière ou rien.

   La mécanique, celle de Cloudflare Realtime : chaque personne a
   DEUX connexions vers le SFU — l'une publie son micro et sa caméra,
   l'autre reçoit les pistes des autres. Le Worker ouvre les sessions
   avec la clé du SFU ; le navigateur ne la voit jamais.

   ⚠️ LA VIDÉO SE CHANGE SANS RENÉGOCIER. La connexion qui publie a
   toujours une piste vidéo, vide quand la caméra est coupée :
   allumer la caméra, partager son écran ou retourner la caméra du
   téléphone ne font que « replaceTrack ». Une renégociation au milieu
   d'un appel est le moment où ça décroche ; on n'en fait pas.
   ============================================================ */
(function () {
  'use strict';
  if (window.AppelEC) return;

  /* ---------- Les icônes : pleines, arrondies, currentColor ---------- */
  var TEL = 'M6.62 2.6c.62-.47 1.5-.36 1.98.25l2.2 2.86c.43.56.39 1.35-.1 1.86L9.4 8.92a12.6 12.6 0 0 0 5.68 5.68l1.35-1.3c.51-.49 1.3-.53 1.86-.1l2.86 2.2c.61.48.72 1.36.25 1.98l-1.28 1.68c-.86 1.13-2.36 1.57-3.7 1.06C10.3 18.1 5.9 13.7 3.9 7.68c-.51-1.34-.07-2.84 1.06-3.7z';
  var BARRE = '<path d="M3.5 3.5l17 17" stroke="TROU" stroke-width="4.6" stroke-linecap="round"/><path d="M3.5 3.5l17 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>';
  var DESSINS = {
    tel: '<path d="' + TEL + '" fill="currentColor"/>',
    raccrocher: '<path d="' + TEL + '" fill="currentColor" transform="rotate(135 12 12)"/>',
    micro: '<rect x="8.5" y="2" width="7" height="12.5" rx="3.5" fill="currentColor"/><path d="M5 11.2a7 7 0 0 0 14 0" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><path d="M12 18.4V21.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>',
    camera: '<rect x="1.8" y="6" width="13.5" height="12" rx="3" fill="currentColor"/><path d="M16.6 10.4 22.2 7v10l-5.6-3.4z" fill="currentColor"/>',
    ecran: '<rect x="2" y="3.5" width="20" height="13.5" rx="2.6" fill="currentColor"/><path d="M12 13.6V7.8M9.2 10.4 12 7.6l2.8 2.8" fill="none" stroke="TROU" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="7.5" y="19" width="9" height="2.2" rx="1.1" fill="currentColor"/>',
    retourner: '<path d="M4 7h3l1.6-2.3c.3-.4.8-.7 1.3-.7h4.2c.5 0 1 .3 1.3.7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" fill="currentColor"/><path d="M8.5 12.8a3.6 3.6 0 0 1 6.3-1.9M15.5 14.2a3.6 3.6 0 0 1-6.3 1.9" fill="none" stroke="TROU" stroke-width="1.8" stroke-linecap="round"/><path d="M15.1 9.2v1.9h-1.9M8.9 17.8v-1.9h1.9" fill="none" stroke="TROU" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    ajouter: '<circle cx="9.5" cy="7.8" r="4" fill="currentColor"/><path d="M2 20.5c0-4.1 3.4-6.7 7.5-6.7s7.5 2.6 7.5 6.7z" fill="currentColor"/><path d="M19.5 6.5v7M16 10h7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    reduire: '<path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    agrandir: '<path d="M6 14.5l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    hp: '<path d="M2.6 9.4c0-.8.6-1.4 1.4-1.4h2.9l4.5-3.6c.7-.6 1.8-.1 1.8.9v13.4c0 1-1.1 1.5-1.8.9L6.9 16H4c-.8 0-1.4-.6-1.4-1.4z" fill="currentColor"/><path d="M16.1 8.7a4.8 4.8 0 0 1 0 6.6M18.9 6.1a8.6 8.6 0 0 1 0 11.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };
  function ic(nom, taille, trou, barre) {
    var t = taille || 24;
    var corps = (DESSINS[nom] || '') + (barre ? BARRE : '');
    return '<svg class="aplIc" width="' + t + '" height="' + t + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      corps.replace(/TROU/g, trou || '#1F2A33') + '</svg>';
  }

  /* ---------- La feuille de style, posée une fois ---------- */
  var CSS = [
    '.aplIc{display:block;flex-shrink:0}',
    '.aplEcran{position:fixed;inset:0;z-index:2147483000;background:#07090B;color:#E9F1F5;display:flex;flex-direction:column;gap:12px;',
    '  padding:max(14px,env(safe-area-inset-top)) 14px max(16px,env(safe-area-inset-bottom));font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}',
    '.aplEcran.cache{display:none}',
    '.aplHaut{display:flex;align-items:center;gap:10px;min-width:0}',
    '.aplPoint{width:9px;height:9px;border-radius:50%;background:#B6FF0E;box-shadow:0 0 10px #B6FF0E;flex-shrink:0}',
    '.aplTitre{flex:1;min-width:0}.aplTitre b{display:block;font-size:16px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.aplTitre span{display:block;font-size:12px;color:#7E8C97;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.aplChrono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;color:#B6FF0E;flex-shrink:0}',
    '.aplPetit{border:1px solid #1F2A33;border-radius:10px;padding:6px 10px 6px 7px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px;background:transparent;color:inherit;cursor:pointer;font-family:inherit;flex-shrink:0;margin:0}',
    '.aplGrille{position:relative;flex:1;min-height:0;display:grid;gap:10px}',
    '.aplTuile{position:relative;border-radius:16px;background:#141A20;border:2px solid #1F2A33;display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:0;min-width:0}',
    '.aplTuile.parle{border-color:#B6FF0E}',
    '.aplTuile video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000}',
    '.aplTuile.ecran video{object-fit:contain}',
    '.aplTuile.moi video{transform:scaleX(-1)}',
    '.aplTuile.moi.ecran video{transform:none}',
    '.aplRond{width:84px;height:84px;border-radius:50%;background:#E4FFA8;color:#0B0B0B;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:28px;overflow:hidden}',
    '.aplRond img{width:100%;height:100%;object-fit:cover}',
    '.aplNom{position:absolute;left:10px;bottom:10px;background:rgba(0,0,0,.55);color:#fff;font-size:12px;font-weight:700;border-radius:8px;padding:3px 8px;display:flex;align-items:center;gap:5px;max-width:calc(100% - 20px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:2}',
    '.aplNote{position:absolute;right:10px;top:10px;font-size:11px;color:#9AA7B1;z-index:2}',
    '.aplTuile.sonne{flex-direction:column;gap:18px}',
    '.aplTuile.sonne .aplRond{animation:aplPulse 1.6s infinite}',
    '.aplChez{font-size:16px;font-weight:800;color:#E9F1F5;text-align:center;padding:0 16px;line-height:1.35}',
    '.aplChez small{display:block;font-size:12.5px;font-weight:400;color:#9AA7B1;margin-top:4px}',
    '.aplMoiFlotte{position:absolute;right:10px;bottom:10px;width:96px;height:132px;z-index:3;box-shadow:0 6px 18px rgba(0,0,0,.5)}',
    '.aplMoiFlotte .aplRond{width:44px;height:44px;font-size:16px}',
    '.aplMoiFlotte .aplNom{left:6px;bottom:6px;font-size:11px;padding:2px 6px}',
    '.aplBas{display:flex;justify-content:center;gap:14px;flex-wrap:wrap}',
    '.aplBt{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:70px;background:none;border:0;color:#C9D3DA;font:inherit;font-size:11.5px;cursor:pointer;padding:0;margin:0}',
    '.aplBt i{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#1F2A33;color:#fff}',
    '.aplBt.on i{background:#B6FF0E;color:#0B0B0B}',
    '.aplBt.coupe i{background:#3A2A20;color:#FFB4A0}',
    '.aplBt.rouge i{background:#E5484D;color:#fff}',
    '.aplBt[disabled]{opacity:.5;cursor:default}',
    '.aplMsg{position:absolute;left:50%;top:14px;transform:translateX(-50%);background:rgba(20,26,32,.95);border:1px solid #1F2A33;border-radius:12px;padding:8px 12px;font-size:13px;z-index:5;max-width:90%;text-align:center}',
    '.aplListe{position:absolute;left:50%;bottom:110px;transform:translateX(-50%);background:#141A20;border:1px solid #1F2A33;border-radius:14px;padding:10px;z-index:6;min-width:240px;max-width:92%}',
    '.aplListe b{display:block;font-size:13px;margin:0 0 6px}',
    '.aplListe button.choisi{background:#B6FF0E;color:#0B0B0B;font-weight:700}',
    '.aplListe button{display:block;width:100%;text-align:left;background:#1F2A33;color:#fff;border:0;border-radius:10px;padding:9px 11px;margin:0 0 6px;font:inherit;font-size:13px;cursor:pointer}',
    '.aplPastille{position:fixed;right:14px;top:max(14px,env(safe-area-inset-top));z-index:2147483000;background:#07090B;color:#E9F1F5;border:2px solid #B6FF0E;border-radius:16px;padding:9px 11px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 30px rgba(0,0,0,.35);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}',
    '.aplPastille b{display:flex;align-items:center;gap:6px;font-size:13px}.aplPastille small{display:block;font-size:11.5px;color:#7E8C97;font-family:ui-monospace,Menlo,monospace}',
    '.aplPastille button{border:0;cursor:pointer;font:inherit;font-weight:800;font-size:12px;border-radius:10px;padding:7px 10px;background:#1F2A33;color:#fff;display:flex;align-items:center;gap:4px;margin:0}',
    '.aplPastille button.rouge{background:#E5484D;border-radius:50%;width:34px;height:34px;padding:0;justify-content:center}',
    '.aplSonne{position:fixed;inset:0;z-index:2147483001;background:#07090B;color:#E9F1F5;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:70px 24px 60px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}',
    '.aplSonne .ecole{font-size:13px;color:#7E8C97;letter-spacing:.12em}',
    '.aplSonne .grand{width:110px;height:110px;border-radius:50%;background:#E4FFA8;color:#0B0B0B;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:38px;margin:26px auto 18px;box-shadow:0 0 0 10px rgba(182,255,14,.12),0 0 0 22px rgba(182,255,14,.06);animation:aplPulse 1.6s infinite}',
    '@keyframes aplPulse{0%,100%{box-shadow:0 0 0 10px rgba(182,255,14,.12),0 0 0 22px rgba(182,255,14,.06)}50%{box-shadow:0 0 0 16px rgba(182,255,14,.16),0 0 0 32px rgba(182,255,14,.05)}}',
    '.aplSonne h2{font-size:24px;font-weight:800;margin:0;color:#E9F1F5}',
    '.aplSonne .quoi{font-size:14px;color:#9AA7B1;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:6px}',
    '.aplSonne .choix{display:flex;gap:56px}',
    '.aplSonne .choix button{display:flex;flex-direction:column;align-items:center;gap:8px;background:none;border:0;color:#E9F1F5;font:inherit;font-size:13px;cursor:pointer;margin:0;padding:0}',
    '.aplSonne .choix i{width:70px;height:70px;border-radius:50%;display:flex;align-items:center;justify-content:center}',
    '.aplSonne .note{font-size:12px;color:#7E8C97;max-width:300px;line-height:1.5}',
    '@media (max-width:640px){.aplBas{gap:4px;flex-wrap:nowrap}.aplBt{flex:1 1 0;min-width:0;max-width:80px}.aplBt{font-size:11px}.aplBt span{text-align:center;line-height:1.2}.aplBt i{width:52px;height:52px}.aplRond{width:64px;height:64px;font-size:22px}}'
  ].join('\n');
  function poserLeStyle() {
    if (document.getElementById('aplCss')) return;
    var s = document.createElement('style');
    s.id = 'aplCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function echap(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function initiales(n) {
    var m = String(n || '').trim().split(/\s+/).filter(Boolean);
    return ((m[0] || '?').charAt(0) + (m.length > 1 ? m[m.length - 1].charAt(0) : '')).toUpperCase();
  }
  function telephone() {
    return !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches) || window.innerWidth < 700;
  }
  function chrono(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + (m < 10 && !h ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* ---------- La sonnerie : un son doux, fabriqué, sans fichier ---------- */
  var sonnerie = null;
  function sonner() {
    arreterLeSon();
    var ctx = null;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    var bip = function () {
      if (navigator.vibrate) { try { navigator.vibrate([400, 200, 400]); } catch (e) {} }
      if (!ctx) return;
      try {
        [0, 0.45].forEach(function (d) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = d ? 660 : 880;
          g.gain.setValueAtTime(0.0001, ctx.currentTime + d);
          g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + d + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d + 0.38);
          o.connect(g); g.connect(ctx.destination);
          o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.4);
        });
      } catch (e) {}
    };
    bip();
    sonnerie = { ctx: ctx, t: setInterval(bip, 2400) };
  }
  function arreterLeSon() {
    if (!sonnerie) return;
    clearInterval(sonnerie.t);
    try { if (sonnerie.ctx) sonnerie.ctx.close(); } catch (e) {}
    if (navigator.vibrate) { try { navigator.vibrate(0); } catch (e) {} }
    sonnerie = null;
  }

  /* ============================================================
     ÇA SONNE — l'écran « David t'appelle »
     o : { id, par, genre, avec[], surRepondre(), surRefuser() }
     ============================================================ */
  var sonneEnCours = null;
  function afficherSonnerie(o) {
    poserLeStyle();
    if (sonneEnCours && sonneEnCours.id === o.id) return sonneEnCours;
    fermerSonnerie();
    var video = o.genre !== 'vocal';
    var e = el('div', 'aplSonne');
    e.setAttribute('role', 'dialog');
    e.innerHTML =
      '<div><div class="ecole">ÉVOLUTION CONDUITES</div>' +
      '<span class="grand">' + echap(initiales(o.par)) + '</span>' +
      '<h2>' + echap(o.par || 'Quelqu’un') + ' t’appelle</h2>' +
      '<div class="quoi">' + ic(video ? 'camera' : 'tel', 16) + echap((video ? 'Appel vidéo' : 'Appel vocal') +
        ((o.avec && o.avec.length) ? ' · avec ' + o.avec.join(', ') : (o.fil ? ' · ' + o.fil : ''))) + '</div></div>' +
      '<div class="choix">' +
        '<button type="button" data-a="non"><i style="background:#E5484D;color:#fff">' + ic('raccrocher', 32) + '</i><span>Refuser</span></button>' +
        '<button type="button" data-a="oui"><i style="background:#B6FF0E;color:#0B0B0B">' + ic(video ? 'camera' : 'tel', 32) + '</i><span>Répondre</span></button>' +
      '</div>' +
      '<div class="note">' + (video ? 'Ta caméra et ton micro ne s’allument' : 'Ton micro ne s’allume') + ' qu’après « Répondre ». Rien n’est enregistré.</div>';
    document.body.appendChild(e);
    sonner();
    var fin = setTimeout(function () { fermerSonnerie(); }, 45000);
    sonneEnCours = { id: o.id, e: e, fin: fin };
    e.querySelector('[data-a="non"]').addEventListener('click', function () {
      fermerSonnerie(); if (o.surRefuser) o.surRefuser();
    });
    e.querySelector('[data-a="oui"]').addEventListener('click', function () {
      fermerSonnerie(); if (o.surRepondre) o.surRepondre();
    });
    return sonneEnCours;
  }
  function fermerSonnerie() {
    arreterLeSon();
    if (!sonneEnCours) return;
    clearTimeout(sonneEnCours.fin);
    if (sonneEnCours.e.parentNode) sonneEnCours.e.parentNode.removeChild(sonneEnCours.e);
    sonneEnCours = null;
  }

  /* ============================================================
     L'APPEL
     o : { route, billet, appel (id), genre, titre, sous, eleve (bool),
           surFin(resume) }
     ============================================================ */
  var courant = null;

  function poster(c, quoi, corps) {
    var b = { billet: c.billet, quoi: quoi };
    for (var k in (corps || {})) b[k] = corps[k];
    return fetch(c.route, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(b) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok || d.error) throw new Error(d.error || ('Erreur ' + r.status));
          return d;
        });
      });
  }

  /* Les opérations sur une connexion passent l'une après l'autre */
  function file(c) {
    var p = Promise.resolve();
    return function (travail) {
      p = p.then(function () { if (!c.fini) return travail(); }).catch(function (e) { message(c, (e && e.message) || String(e)); });
      return p;
    };
  }

  function ouvrir(o) {
    if (courant) { revenir(); return Promise.resolve(courant); }
    poserLeStyle();
    var c = {
      route: o.route, billet: o.billet, appel: o.appel, genre: o.genre === 'vocal' ? 'vocal' : 'video',
      titre: o.titre || 'Appel', eleve: !!o.eleve, surFin: o.surFin, tel: telephone(),
      cam: false, micro: true, partage: false, face: 'user', debut: Date.now(),
      etat: null, recus: [], niveaux: {}, fini: false, audios: {}, decroche: 0,
      son: true, sortie: '', sorties: []
    };
    /* La tonalité « ça sonne » de celui qui appelle : le contexte audio
       naît ici, pendant le geste (sinon Safari le laisse muet). */
    try { c.actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { c.actx = null; }
    courant = c;
    c.enFile = file(c);
    dessinerLEcran(c);
    message(c, 'Connexion…');

    var veutVideo = c.genre === 'video' && !o.sansCamera;
    var md = navigator.mediaDevices;
    if (!md || !md.getUserMedia || !window.RTCPeerConnection) {
      message(c, 'Ce navigateur ne sait pas passer d’appel. Essaie avec Chrome, Safari ou Firefox à jour.');
      setTimeout(function () { terminer(c, true); }, 4000);
      return Promise.resolve(c);
    }
    return md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true },
                             video: veutVideo ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false })
      .catch(function () {
        if (!veutVideo) throw new Error('Le micro est refusé : autorise-le dans le navigateur, puis rappelle.');
        message(c, 'Caméra refusée : l’appel continue sans image.');
        return md.getUserMedia({ audio: true, video: false });
      })
      .then(function (flux) {
        if (c.fini) { flux.getTracks().forEach(function (t) { t.stop(); }); return; }
        c.audio = flux.getAudioTracks()[0] || null;
        c.camPiste = flux.getVideoTracks()[0] || null;
        c.cam = !!c.camPiste;
        majMoi(c);
        return poster(c, 'rejoindre', { cam: c.cam ? 1 : 0 });
      })
      .then(function (d) {
        if (!d || c.fini) return;
        c.etat = d.appel; c.max = d.max || 6;
        var cfg = { bundlePolicy: 'max-bundle', iceServers: d.ice || [{ urls: 'stun:stun.cloudflare.com:3478' }] };
        c.pub = new RTCPeerConnection(cfg);
        c.sub = new RTCPeerConnection(cfg);
        c.trAudio = c.pub.addTransceiver(c.audio || 'audio', { direction: 'sendonly' });
        c.trVideo = c.pub.addTransceiver(c.camPiste || 'video', { direction: 'sendonly' });
        c.sub.ontrack = function () { dessinerLesTuiles(c); };
        [c.pub, c.sub].forEach(function (pc) {
          pc.onconnectionstatechange = function () {
            if (pc.connectionState === 'failed') message(c, 'La connexion a lâché. Raccroche et rappelle si ça ne revient pas.');
          };
        });
        return c.enFile(function () {
          return c.pub.createOffer()
            .then(function (offre) { return c.pub.setLocalDescription(offre); })
            .then(function () {
              return poster(c, 'publier', {
                offre: { type: 'offer', sdp: c.pub.localDescription.sdp },
                pistes: [{ mid: c.trAudio.mid, kind: 'audio' }, { mid: c.trVideo.mid, kind: 'video' }]
              });
            })
            .then(function (r) { return c.pub.setRemoteDescription(r.reponse); })
            .then(function () { message(c, ''); battre(c); });
        });
      })
      .catch(function (e) {
        message(c, (e && e.message) || 'L’appel n’a pas pu démarrer.');
        setTimeout(function () { terminer(c, true); }, 4000);
      })
      .then(function () { return c; });
  }

  /* Le battement : signe de vie, état de l'appel, pistes à recevoir */
  function battre(c) {
    if (c.fini) return;
    var tour = function () {
      if (c.fini) return;
      poster(c, 'pouls', { cam: c.cam ? 1 : 0, micro: c.micro ? 1 : 0, partage: c.partage ? 1 : 0 })
        .then(function (d) {
          if (c.fini) return;
          c.etat = d.appel || c.etat;
          if (d.dehors || (c.etat && c.etat.fini)) { terminer(c, false, c.etat && c.etat.decroche ? '' : 'Personne n’a répondu.'); return; }
          if (d.aRecevoir) recevoir(c);
          dessinerLesTuiles(c);
        })
        .catch(function () { /* un battement raté : le suivant rattrapera */ });
      niveaux(c);
    };
    tour();
    c.minuteur = setInterval(tour, 2000);
    c.horloge = setInterval(function () { majChrono(c); }, 1000);
  }

  function recevoir(c) {
    if (c.recoit) return;
    c.recoit = true;
    c.enFile(function () {
      return poster(c, 'recevoir', {}).then(function (d) {
        c.recus = d.recus || [];
        if (!d.renego || !d.offre) return;
        return c.sub.setRemoteDescription(d.offre)
          .then(function () { return c.sub.createAnswer(); })
          .then(function (rep) { return c.sub.setLocalDescription(rep); })
          .then(function () { return poster(c, 'renegocier', { reponse: { type: 'answer', sdp: c.sub.localDescription.sdp } }); });
      });
    }).then(function () { c.recoit = false; dessinerLesTuiles(c); }, function () { c.recoit = false; });
  }

  /* La piste reçue d'une personne : celle du transceiver de ce « mid » */
  function pisteDe(c, cle, kind) {
    if (!c.sub) return null;
    var r = null;
    c.recus.forEach(function (x) { if (x.cle === cle && x.kind === kind) r = x; });
    if (!r) return null;
    var tr = null;
    c.sub.getTransceivers().forEach(function (t) { if (t.mid === r.mid) tr = t; });
    return tr && tr.receiver && tr.receiver.track ? tr.receiver.track : null;
  }

  /* Qui parle : le niveau sonore de chaque piste reçue */
  function niveaux(c) {
    if (!c.sub || !c.sub.getStats) return;
    c.sub.getStats().then(function (st) {
      var parMid = {};
      st.forEach(function (x) {
        if (x.type === 'inbound-rtp' && x.kind === 'audio' && x.mid !== undefined) parMid[String(x.mid)] = x.audioLevel || 0;
      });
      c.niveaux = {};
      c.recus.forEach(function (r) { if (r.kind === 'audio' && parMid[r.mid] !== undefined) c.niveaux[r.cle] = parMid[r.mid]; });
    }).catch(function () {});
  }

  /* Ce que Cloudflare nous a envoyé : c'est ce qu'il compte */
  function octetsRecus(c) {
    if (!c.sub || !c.sub.getStats) return Promise.resolve(0);
    return c.sub.getStats().then(function (st) {
      var n = 0;
      st.forEach(function (x) {
        if (x.type === 'transport' && x.bytesReceived) n = Math.max(n, x.bytesReceived);
      });
      if (!n) st.forEach(function (x) { if (x.type === 'inbound-rtp' && x.bytesReceived) n += x.bytesReceived; });
      return n;
    }).catch(function () { return 0; });
  }

  /* ---------- L'écran ---------- */
  function dessinerLEcran(c) {
    var e = el('div', 'aplEcran');
    e.innerHTML =
      '<div class="aplHaut"><span class="aplPoint"></span>' +
        '<div class="aplTitre"><b>' + echap(c.titre) + '</b><span class="aplSous">' + (c.genre === 'video' ? 'Appel vidéo' : 'Appel vocal') + '</span></div>' +
        '<span class="aplChrono">00:00</span>' +
        '<button type="button" class="aplPetit" data-a="reduire">' + ic('reduire', 16) + 'Réduire</button>' +
      '</div>' +
      '<div class="aplGrille"></div>' +
      '<div class="aplBas"></div>';
    document.body.appendChild(e);
    c.e = e;
    c.grille = e.querySelector('.aplGrille');
    e.querySelector('[data-a="reduire"]').addEventListener('click', function () { reduire(c); });
    dessinerLesBoutons(c);
    dessinerLesTuiles(c);
  }

  function dessinerLesBoutons(c) {
    var bas = c.e.querySelector('.aplBas');
    bas.innerHTML = '';
    var bt = function (cle, icone, lab, cls, faire) {
      var b = el('button', 'aplBt' + (cls ? ' ' + cls : ''), '<i>' + icone + '</i><span>' + echap(lab) + '</span>');
      b.type = 'button'; b.setAttribute('data-a', cle);
      b.addEventListener('click', faire);
      bas.appendChild(b);
    };
    bt('micro', ic('micro', 26, c.micro ? '#1F2A33' : '#3A2A20', !c.micro), c.micro ? 'Micro' : 'Micro coupé', c.micro ? '' : 'coupe', function () { basculerMicro(c); });
    var oreille = c.son && c.genre === 'vocal' && sortieChoisie(c) && sortieChoisie(c).oreille;
    bt('son', ic(oreille ? 'tel' : 'hp', 26, c.son ? '#1F2A33' : '#3A2A20', !c.son),
       !c.son ? 'Haut\u2011parleur coupé' : (c.genre === 'vocal' && sortieChoisie(c) ? sortieChoisie(c).court : 'Haut\u2011parleur'),
       c.son ? '' : 'coupe', function () { toucherLeSon(c); });
    bt('camera', ic('camera', 26, c.cam ? '#1F2A33' : '#3A2A20', !c.cam), c.cam ? 'Caméra' : 'Caméra coupée', c.cam ? '' : 'coupe', function () { basculerCamera(c); });
    if (c.tel) { if (c.cam) bt('retourner', ic('retourner', 26), 'Retourner', '', function () { retourner(c); }); }
    else if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      bt('partage', ic('ecran', 26, c.partage ? '#B6FF0E' : '#1F2A33'), c.partage ? 'Arrêter le partage' : 'Partager l’écran', c.partage ? 'on' : '', function () { basculerPartage(c); });
    }
    if (!c.eleve) bt('ajouter', ic('ajouter', 26), 'Ajouter', '', function () { ajouter(c); });
    bt('raccrocher', ic('raccrocher', 28), 'Raccrocher', 'rouge', function () { terminer(c, true); });
  }

  function majChrono(c) {
    if (!c.e) return;
    var d = c.etat && c.etat.decroche;
    var t = c.e.querySelector('.aplChrono');
    if (t) t.textContent = d ? chrono(Date.now() - d) : 'ça sonne…';
    if (c.pastille) {
      var s = c.pastille.querySelector('small');
      if (s) s.textContent = d ? chrono(Date.now() - d) : 'ça sonne…';
    }
  }

  function majMoi(c) {
    if (!c.e) return;
    dessinerLesBoutons(c);
    dessinerLesTuiles(c);
  }

  /* Une tuile par personne dans l'appel. Les éléments vidéo restent
     d'un dessin à l'autre : les recréer ferait clignoter l'image. */
  function dessinerLesTuiles(c) {
    if (!c.grille) return;
    var gens = ((c.etat && c.etat.gens) || []).filter(function (x) { return x.etat === 'dedans'; });
    var moi = null, autres = [];
    gens.forEach(function (x) { if (x.moi) moi = x; else autres.push(x); });
    if (!moi) moi = { cle: '__moi', qui: 'Toi', moi: 1 };
    /* Personne n'a encore décroché : une vignette « Ça sonne chez … »
       tient la place de ceux qu'on appelle, et la tonalité joue. */
    var sonnent = ((c.etat && c.etat.gens) || []).filter(function (x) { return x.etat === 'invite' && !x.moi; });
    var attente = c.etat && !c.etat.decroche && !c.etat.fini && !autres.length && sonnent.length ? sonnent : null;
    if (attente) autres.push({ cle: '__sonne', qui: '', sonne: attente });
    tonalite(c, !!attente);
    if (!attente && c.actx && c.etat && (c.etat.decroche || autres.length)) fermerLaTonalite(c);
    var sous = c.e.querySelector('.aplSous');
    if (sous) {
      var partageur = null;
      gens.forEach(function (x) { if (x.partage && !x.moi) partageur = x; });
      var genre = c.genre === 'video' ? 'Appel vidéo' : 'Appel vocal';
      sous.textContent = partageur ? partageur.qui + ' partage son écran'
        : attente ? genre + ' · ça sonne…'
        : genre + ' · ' + (autres.length + 1) + ' personne' + (autres.length ? 's' : '') +
          (!autres.length && c.etat && !c.etat.decroche ? ' · ça sonne…' : '');
    }
    var partage = null;
    autres.forEach(function (x) { if (x.partage) partage = x; });
    if (!partage && c.partage) partage = moi;
    var g = c.grille;
    var ordre = [];
    var flottant = c.tel && !partage && autres.length ? moi : null;
    autres.forEach(function (x) { ordre.push(x); });
    if (!flottant) ordre.push(moi);
    if (partage) ordre = [partage].concat(ordre.filter(function (x) { return x !== partage; }));
    var n = ordre.length;
    if (partage) {
      g.style.gridTemplateColumns = c.tel ? '1fr' : '3fr 1fr';
      g.style.gridTemplateRows = c.tel ? '3fr 1fr' : 'repeat(' + Math.max(1, n - 1) + ',1fr)';
    } else if (c.tel) {
      g.style.gridTemplateColumns = n > 2 ? '1fr 1fr' : '1fr';
      g.style.gridTemplateRows = 'repeat(' + Math.ceil(n / (n > 2 ? 2 : 1)) + ',1fr)';
    } else {
      var col = n <= 1 ? 1 : n <= 4 ? 2 : 3;
      if (n === 3) col = 3;
      g.style.gridTemplateColumns = 'repeat(' + col + ',1fr)';
      g.style.gridTemplateRows = 'repeat(' + Math.ceil(n / col) + ',1fr)';
    }
    var vues = {};
    var avant = {};
    Array.prototype.forEach.call(g.querySelectorAll('.aplTuile'), function (t) { avant[t.getAttribute('data-cle')] = t; });
    var poser = function (x, flotte) {
      var cle = x.moi ? '__moi' : x.cle;
      vues[cle] = true;
      var t = avant[cle];
      if (x.sonne) {
        if (!t) { t = el('div', 'aplTuile sonne'); t.setAttribute('data-cle', cle); t.innerHTML = '<span class="aplRond"></span><span class="aplChez"></span>'; }
        var noms = [], bureau = false;
        x.sonne.forEach(function (y) { if (y.bureau) bureau = true; else if (noms.indexOf(y.qui) < 0) noms.push(y.qui); });
        var liste = noms.length > 1 ? noms.slice(0, -1).join(', ') + ' et ' + noms[noms.length - 1] : (noms[0] || '');
        var chez = noms.length ? 'Ça sonne chez ' + liste + (bureau ? ' et au bureau' : '') : 'Ça sonne au bureau';
        var r = t.querySelector('.aplRond');
        var dans = noms.length ? echap(initiales(noms[0])) : ic('tel', 40);
        if (r.getAttribute('data-q') !== dans) { r.setAttribute('data-q', dans); r.innerHTML = dans; }
        var h = echap(chez) + '…<small>' + (c.son ? 'Tu entends la tonalité tant que personne n’a décroché.' : 'Haut-parleur coupé : tonalité muette.') + '</small>';
        var z = t.querySelector('.aplChez');
        if (z.getAttribute('data-q') !== h) { z.setAttribute('data-q', h); z.innerHTML = h; }
        g.appendChild(t);
        return;
      }
      if (!t) {
        t = el('div', 'aplTuile');
        t.setAttribute('data-cle', cle);
        t.innerHTML = '<span class="aplRond"></span><span class="aplNom"></span><span class="aplNote"></span>';
      }
      t.className = 'aplTuile' + (x.moi ? ' moi' : '') + (flotte ? ' aplMoiFlotte' : '') +
        ((x.moi ? c.partage : x.partage) ? ' ecran' : '') + (!x.moi && (c.niveaux[x.cle] || 0) > 0.02 ? ' parle' : '');
      if (partage === x && !flotte && !c.tel) t.style.gridRow = '1 / span ' + Math.max(1, n - 1);
      else if (partage === x && c.tel) t.style.gridRow = '';
      else t.style.gridRow = '';
      var rond = t.querySelector('.aplRond');
      if (rond.textContent !== initiales(x.qui)) rond.textContent = initiales(x.qui);
      t.querySelector('.aplNom').innerHTML = (x.micro === 0 && !x.moi ? ic('micro', 13, '#000', true) : '') +
        echap(x.moi ? (flotte ? 'Toi' : (x.qui === 'Toi' ? 'Toi' : x.qui + ' · toi')) : x.qui + (x.genre === 'eleve' ? ' · élève' : ''));
      var piste = null;
      if (x.moi) piste = c.partage ? c.ecranPiste : (c.cam ? c.camPiste : null);
      else if (x.cam || x.partage) piste = pisteDe(c, x.cle, 'video');
      var v = t.querySelector('video');
      if (piste && piste.readyState !== 'ended') {
        if (!v) { v = document.createElement('video'); v.autoplay = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.muted = true; t.insertBefore(v, t.firstChild); }
        if (!v.srcObject || v.srcObject.getVideoTracks()[0] !== piste) { v.srcObject = new MediaStream([piste]); try { v.play(); } catch (e) {} }
      } else if (v) { v.parentNode.removeChild(v); }
      t.querySelector('.aplNote').textContent = (!x.moi && !x.cam && !x.partage && c.genre === 'video') ? 'caméra coupée' : '';
      if (!x.moi) jouerLeSon(c, x.cle);
      if (flotte) c.grille.appendChild(t); else g.appendChild(t);
    };
    ordre.forEach(function (x) { poser(x, false); });
    if (flottant) poser(flottant, true);
    Object.keys(avant).forEach(function (k) { if (!vues[k] && avant[k].parentNode) avant[k].parentNode.removeChild(avant[k]); });
    Object.keys(c.audios).forEach(function (k) {
      if (!autres.some(function (x) { return x.cle === k; })) { try { c.audios[k].srcObject = null; c.audios[k].remove(); } catch (e) {} delete c.audios[k]; }
    });
    majChrono(c);
  }

  /* Le son de chacun, dans un élément à part (jamais coupé par l'image) */
  function jouerLeSon(c, cle) {
    var p = pisteDe(c, cle, 'audio');
    if (!p) return;
    var a = c.audios[cle];
    if (!a) { a = document.createElement('audio'); a.autoplay = true; a.style.display = 'none'; document.body.appendChild(a); c.audios[cle] = a; }
    if (!a.srcObject || a.srcObject.getAudioTracks()[0] !== p) { a.srcObject = new MediaStream([p]); try { a.play(); } catch (e) {} }
    reglerUnSon(c, a);
  }
  function reglerUnSon(c, a) {
    a.muted = !c.son;
    if (c.sortie && a.setSinkId && a.__sortie !== c.sortie) {
      a.__sortie = c.sortie;
      a.setSinkId(c.sortie).catch(function () { a.__sortie = ''; });
    }
  }

  /* ---------- Le son qu'on entend : couper, et (vocal) où l'écouter ----------
     Un navigateur de téléphone ne laisse presque jamais une page choisir
     entre le haut-parleur et l'écouteur : le choix n'apparaît que si le
     téléphone donne plusieurs sorties (écouteur, Bluetooth…). Sinon le
     bouton coupe et remet le son, simplement. */
  function chercherLesSorties(c) {
    var md = navigator.mediaDevices;
    if (!md || !md.enumerateDevices || !('setSinkId' in HTMLMediaElement.prototype)) return Promise.resolve([]);
    return md.enumerateDevices().then(function (l) {
      var vus = {}, out = [];
      l.forEach(function (d) {
        if (d.kind !== 'audiooutput' || d.deviceId === 'communications' || vus[d.deviceId]) return;
        vus[d.deviceId] = 1;
        var nom = String(d.label || '').replace(/^(Par défaut|Default)\s*-\s*/i, '').trim();
        var oreille = /earpiece|receiver|écouteur du téléphone|combiné/i.test(nom);
        var parDefaut = d.deviceId === 'default' || d.deviceId === '';
        out.push({ id: d.deviceId, oreille: oreille,
                   nom: oreille ? 'À l’oreille (écouteur)' : parDefaut ? (c.tel ? 'Haut-parleur' : 'Sortie par défaut') : (nom || 'Autre sortie'),
                   court: oreille ? 'Écouteur' : parDefaut ? 'Haut\u2011parleur' : (nom || 'Autre').slice(0, 14) });
      });
      return out.length >= 2 ? out : [];
    }).catch(function () { return []; });
  }
  function sortieChoisie(c) {
    if (!c.sorties.length) return null;
    for (var i = 0; i < c.sorties.length; i++) if (c.sorties[i].id === (c.sortie || 'default')) return c.sorties[i];
    return c.sorties[0];
  }
  function appliquerLeSon(c) {
    Object.keys(c.audios).forEach(function (k) { reglerUnSon(c, c.audios[k]); });
    if (!c.son) tonalite(c, false);
    majMoi(c);
  }
  function toucherLeSon(c) {
    if (c.genre !== 'vocal') { c.son = !c.son; appliquerLeSon(c); return; }
    chercherLesSorties(c).then(function (l) {
      c.sorties = l;
      if (!l.length) { c.son = !c.son; appliquerLeSon(c); return; }
      var x = c.e && c.e.querySelector('.aplListe');
      if (x) { x.parentNode.removeChild(x); return; }
      x = el('div', 'aplListe', '<b>Où écouter ?</b>');
      var choisie = sortieChoisie(c);
      l.forEach(function (d) {
        var b = el('button', c.son && choisie === d ? 'choisi' : '', echap(d.nom));
        b.type = 'button';
        b.addEventListener('click', function () {
          c.son = true; c.sortie = d.id;
          Object.keys(c.audios).forEach(function (k) { c.audios[k].__sortie = ''; });
          if (x.parentNode) x.parentNode.removeChild(x);
          appliquerLeSon(c);
        });
        x.appendChild(b);
      });
      var coupe = el('button', c.son ? '' : 'choisi', 'Couper le son');
      coupe.type = 'button';
      coupe.addEventListener('click', function () { c.son = false; if (x.parentNode) x.parentNode.removeChild(x); appliquerLeSon(c); });
      x.appendChild(coupe);
      c.e.appendChild(x);
    });
  }

  /* ---------- La tonalité de celui qui appelle : 440 Hz, 1,5 s sur 5 ---------- */
  function tonalite(c, oui) {
    if (!oui || !c.son || c.fini || !c.actx) {
      if (c.tonaliteT) { clearInterval(c.tonaliteT); c.tonaliteT = null; }
      return;
    }
    if (c.tonaliteT) return;
    var ctx = c.actx;
    var bip = function () {
      try {
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
        o.type = 'sine'; o.frequency.value = 440;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.04);
        g.gain.setValueAtTime(0.09, t + 1.46);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 1.52);
      } catch (e) {}
    };
    bip();
    c.tonaliteT = setInterval(bip, 5000);
  }
  function fermerLaTonalite(c) {
    tonalite(c, false);
    if (c.actx) { try { c.actx.close(); } catch (e) {} c.actx = null; }
  }

  function message(c, t) {
    if (!c.e) return;
    var m = c.e.querySelector('.aplMsg');
    if (!t) { if (m) m.parentNode.removeChild(m); return; }
    if (!m) { m = el('div', 'aplMsg'); c.grille.appendChild(m); }
    m.textContent = t;
    if (c.msgMinuteur) clearTimeout(c.msgMinuteur);
    if (t !== 'Connexion…') c.msgMinuteur = setTimeout(function () { message(c, ''); }, 6000);
  }

  /* ---------- Les gestes ---------- */
  function basculerMicro(c) {
    c.micro = !c.micro;
    if (c.audio) c.audio.enabled = c.micro;
    majMoi(c);
  }
  function videoActive(c) { return c.partage ? c.ecranPiste : (c.cam ? c.camPiste : null); }
  function remplacer(c) {
    if (!c.trVideo) return Promise.resolve();
    return c.trVideo.sender.replaceTrack(videoActive(c) || null).catch(function () {});
  }
  function basculerCamera(c) {
    if (c.cam) {
      if (c.camPiste) c.camPiste.stop();
      c.camPiste = null; c.cam = false;
      remplacer(c); majMoi(c);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: c.face, width: { ideal: 640 }, height: { ideal: 480 } } })
      .then(function (f) { c.camPiste = f.getVideoTracks()[0]; c.cam = true; return remplacer(c); })
      .then(function () { majMoi(c); })
      .catch(function () { message(c, 'La caméra est refusée ou occupée.'); });
  }
  function retourner(c) {
    c.face = c.face === 'user' ? 'environment' : 'user';
    if (!c.cam) return;
    var vieille = c.camPiste;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: c.face } } })
      .catch(function () { return navigator.mediaDevices.getUserMedia({ video: { facingMode: c.face } }); })
      .then(function (f) { c.camPiste = f.getVideoTracks()[0]; if (vieille) vieille.stop(); return remplacer(c); })
      .then(function () { majMoi(c); })
      .catch(function () { message(c, 'Pas d’autre caméra sur cet appareil.'); });
  }
  function basculerPartage(c) {
    if (c.partage) {
      if (c.ecranPiste) c.ecranPiste.stop();
      c.ecranPiste = null; c.partage = false;
      remplacer(c); majMoi(c);
      return;
    }
    navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      .then(function (f) {
        c.ecranPiste = f.getVideoTracks()[0];
        c.partage = true;
        c.ecranPiste.onended = function () { if (c.partage) basculerPartage(c); };
        return remplacer(c);
      })
      .then(function () { majMoi(c); })
      .catch(function () { /* il a fermé la fenêtre du navigateur : rien */ });
  }
  function ajouter(c) {
    var l = c.e.querySelector('.aplListe');
    if (l) { l.parentNode.removeChild(l); return; }
    l = el('div', 'aplListe', '<b>Qui ajouter ?</b><div class="aplVide" style="font-size:12.5px;color:#9AA7B1">Lecture…</div>');
    c.e.appendChild(l);
    poster(c, 'candidats', {}).then(function (d) {
      var gens = d.gens || [];
      l.innerHTML = '<b>Qui ajouter ? (' + (c.max || 6) + ' au plus)</b>';
      if (!gens.length) l.innerHTML += '<div style="font-size:12.5px;color:#9AA7B1">Tout le monde du fil est déjà dans l’appel.</div>';
      gens.forEach(function (x) {
        var b = el('button', '', echap(x.qui + (x.genre === 'eleve' ? ' · élève' : '')));
        b.type = 'button';
        b.addEventListener('click', function () {
          b.disabled = true;
          poster(c, 'inviter', { cles: [x.cle] }).then(function () {
            message(c, '📞 Ça sonne chez ' + x.qui + '.');
            if (l.parentNode) l.parentNode.removeChild(l);
          }, function (e) { b.disabled = false; message(c, e.message); });
        });
        l.appendChild(b);
      });
    }, function (e) { l.innerHTML = '<b>' + echap(e.message) + '</b>'; });
  }

  /* ---------- Réduire / revenir ---------- */
  function reduire(c) {
    if (!c.e) return;
    c.e.classList.add('cache');
    var p = el('div', 'aplPastille');
    p.innerHTML = '<span class="aplPoint"></span><div><b>' + ic(c.genre === 'video' ? 'camera' : 'tel', 16) + echap(c.titre) + '</b><small></small></div>' +
      '<button type="button" data-a="revenir">' + ic('agrandir', 14) + 'Revenir</button>' +
      '<button type="button" class="rouge" data-a="raccrocher" title="Raccrocher">' + ic('raccrocher', 20) + '</button>';
    document.body.appendChild(p);
    c.pastille = p;
    p.querySelector('[data-a="revenir"]').addEventListener('click', function () { revenir(); });
    p.querySelector('[data-a="raccrocher"]').addEventListener('click', function () { terminer(c, true); });
    majChrono(c);
  }
  function revenir() {
    var c = courant;
    if (!c) return;
    if (c.pastille && c.pastille.parentNode) c.pastille.parentNode.removeChild(c.pastille);
    c.pastille = null;
    if (c.e) c.e.classList.remove('cache');
  }

  /* ---------- Raccrocher ---------- */
  function terminer(c, parMoi, mot) {
    if (c.fini) return;
    c.fini = true;
    clearInterval(c.minuteur); clearInterval(c.horloge);
    fermerLaTonalite(c);
    var fin = function (octets) {
      if (parMoi !== null) poster(c, 'quitter', { octets: octets || 0 }).catch(function () {});
      [c.audio, c.camPiste, c.ecranPiste].forEach(function (t) { if (t) { try { t.stop(); } catch (e) {} } });
      [c.pub, c.sub].forEach(function (pc) { if (pc) { try { pc.close(); } catch (e) {} } });
      Object.keys(c.audios).forEach(function (k) { try { c.audios[k].remove(); } catch (e) {} });
      if (mot && c.e) {
        message(c, mot);
        setTimeout(function () { fermerLEcran(c); }, 2200);
      } else fermerLEcran(c);
      if (courant === c) courant = null;
      if (c.surFin) { try { c.surFin({ mot: mot || '' }); } catch (e) {} }
    };
    octetsRecus(c).then(fin, function () { fin(0); });
  }
  function fermerLEcran(c) {
    if (c.e && c.e.parentNode) c.e.parentNode.removeChild(c.e);
    if (c.pastille && c.pastille.parentNode) c.pastille.parentNode.removeChild(c.pastille);
    c.e = null; c.pastille = null;
  }

  /* Fermer l'onglet en plein appel : on dit qu'on part (sinon les
     autres attendraient 25 secondes de silence). */
  window.addEventListener('pagehide', function () {
    var c = courant;
    if (!c || c.fini) return;
    try {
      navigator.sendBeacon(c.route, JSON.stringify({ billet: c.billet, quoi: 'quitter', octets: 0 }));
    } catch (e) {}
  });

  window.AppelEC = {
    ic: ic,
    ouvrir: ouvrir,
    revenir: revenir,
    sonner: afficherSonnerie,
    fermerSonnerie: fermerSonnerie,
    enCours: function () { return courant && !courant.fini ? { appel: courant.appel, titre: courant.titre } : null; },
    raccrocher: function () { if (courant) terminer(courant, true); }
  };
})();
