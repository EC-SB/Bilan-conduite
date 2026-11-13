/* Déployé le 13/11/2026 à 14:22 — v1427 */
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

   🎥 v1356 — LE MODE « COURS » (le code en visio). Même mécanique,
   autre écran : l'image du prof en grand (le boîtier HDMI), la liste
   des élèves à côté chez le prof, ✋ et le questionnaire chez
   l'élève. Le prof peut couper les micros des élèves et rendre la
   parole à un seul. L'élève ne publie jamais de caméra. La page qui
   ouvre le cours donne o.cours ({ numero, questionnaire, gestes,
   surInviter, surLien }) et, chez le prof, o.flux : l'image du
   boîtier et le son déjà mêlé (boîtier + micro).

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
    /* 🎥 le cours */
    '.aplCours{position:relative;flex:1;min-height:0;display:flex;gap:10px}',
    '.aplScene{position:relative;flex:1;min-width:0;min-height:0;border-radius:16px;background:#000;border:2px solid #1F2A33;overflow:hidden;display:flex;align-items:center;justify-content:center}',
    '.aplScene video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}',
    '.aplScene .attente{color:#9AA7B1;font-size:14px;text-align:center;padding:0 20px;line-height:1.5}',
    '.aplScene .etiq{position:absolute;left:10px;top:10px;background:rgba(0,0,0,.6);color:#fff;font-size:11.5px;font-weight:700;border-radius:8px;padding:3px 8px;z-index:2}',
    '.aplPlein{position:absolute;right:10px;top:10px;z-index:3;background:rgba(0,0,0,.6);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:10px;padding:6px 10px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;margin:0}',
    '.aplScene:fullscreen{border:0;border-radius:0}.aplScene:-webkit-full-screen{border:0;border-radius:0}',
    '.aplCote{width:290px;flex-shrink:0;background:#141A20;border:1px solid #1F2A33;border-radius:16px;padding:10px;overflow:auto;min-height:0}',
    '.aplCote .t{font-size:12px;font-weight:800;color:#9AA7B1;letter-spacing:.06em;margin:2px 4px 8px;display:flex;justify-content:space-between;gap:6px}',
    '.aplEl{display:flex;align-items:center;gap:9px;padding:7px 6px;border-radius:10px}',
    '.aplEl.parle{background:rgba(182,255,14,.12)}',
    '.aplEl .r{width:30px;height:30px;border-radius:50%;background:#E4FFA8;color:#0B0B0B;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '.aplEl.absent .r{background:#2A3540;color:#9AA7B1}',
    '.aplEl .n{flex:1;min-width:0;font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.aplEl .n small{display:block;font-weight:400;color:#7E8C97;font-size:11px}',
    '.aplEl .main{font-size:17px;animation:aplMain 1.2s infinite}',
    '@keyframes aplMain{0%,100%{transform:rotate(0)}50%{transform:rotate(-14deg)}}',
    '.aplEl button{border:0;border-radius:9px;padding:6px 8px;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer;background:#1F2A33;color:#fff;flex-shrink:0;margin:0}',
    '.aplEl button.on{background:#B6FF0E;color:#0B0B0B}',
    '.aplPg{font-weight:800;color:#C9D4DC}.aplPg.vert{color:#B6FF0E}.aplPg.orange{color:#FFB547}.aplPg.rouge{color:#FF8A70}',
    '.aplQuest{width:min(470px,46%);flex-shrink:0;background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;min-height:0}',
    '.aplQuest[hidden]{display:none}',
    '.aplQuest .tete{background:#141A20;color:#E9F1F5;display:flex;align-items:center;gap:8px;padding:8px 10px;font-size:13px;font-weight:700}',
    '.aplQuest .tete span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.aplQuest .tete a,.aplQuest .tete button{white-space:nowrap;flex-shrink:0;color:#E9F1F5;background:#1F2A33;border:0;border-radius:9px;padding:6px 9px;font:inherit;font-size:12px;cursor:pointer;text-decoration:none;margin:0}',
    '.aplQuest iframe{flex:1;border:0;width:100%;background:#fff;min-height:0}',
    '.aplBt .em{font-size:24px;line-height:1;font-style:normal}',
    '.aplCours .aplMsg{top:54px}',
    /* 📝 v1426 — la feuille de réponses (ou le Google Form) SOUS l'image, plus par-dessus */
    '.aplFeuille{width:min(470px,46%);flex-shrink:0;background:#0B0F13;border:1px solid #1F2A33;border-radius:16px;overflow:auto;min-height:0;padding:10px;overscroll-behavior:contain}',
    '.aplFeuille[hidden]{display:none}',
    '@media (max-width:640px){.aplCours{flex-direction:column}.aplCote{width:auto;max-height:36%}.aplQuest,.aplFeuille{position:relative;inset:auto;width:auto;flex:1;z-index:1}' +
      '.aplCours.avecPanneau .aplScene{flex:0 0 auto;width:100%;aspect-ratio:16/9;max-height:46%}.aplCours.avecPanneau .aplPlein{top:auto;bottom:8px;right:8px;padding:4px 9px;font-size:11.5px}}',
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
      son: true, sortie: o.sortie || '', sorties: [],
      /* 🎥 v1356 — le cours (voir l'en-tête) */
      cours: o.cours ? {
        numero: o.cours.numero || 0, questionnaire: o.cours.questionnaire || '', par: o.cours.par || '',
        feuille: typeof o.cours.feuille === 'function' ? o.cours.feuille : null,
        progres: typeof o.cours.progres === 'function' ? o.cours.progres : null,
        gestes: o.cours.gestes || [], surInviter: o.cours.surInviter, surLien: o.cours.surLien, surSon: o.cours.surSon,
        quest: false, main: false, coupeParProf: false, finSure: 0
      } : null
    };
    /* La tonalité « ça sonne » de celui qui appelle : le contexte audio
       naît ici, pendant le geste (sinon Safari le laisse muet). */
    try { c.actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { c.actx = null; }
    courant = c;
    c.enFile = file(c);
    dessinerLEcran(c);
    message(c, 'Connexion…');

    var veutVideo = c.genre === 'video' && !o.sansCamera && !(c.cours && c.eleve);
    var md = navigator.mediaDevices;
    if (o.flux && window.RTCPeerConnection) {
      /* 🎥 le prof : l'image et le son sont déjà prêts (le boîtier, le mélange) */
      c.audio = o.flux.getAudioTracks()[0] || null;
      c.camPiste = o.flux.getVideoTracks()[0] || null;
      c.cam = !!c.camPiste;
      majMoi(c);
      return rejoindreEtPublier(c);
    }
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
        return rejoindreEtPublier(c);
      }, function (e) {
        message(c, (e && e.message) || 'L’appel n’a pas pu démarrer.');
        setTimeout(function () { terminer(c, true); }, 4000);
      })
      .then(function () { return c; });
  }

  /* 🎚️ v1391 — « maxaveragebitrate » dans la réponse : c'est ce que l'autre
     bout accepte de recevoir, et le navigateur règle son Opus dessus */
  function opusHaut(sdp) {
    var m = String(sdp).match(/a=rtpmap:(\d+) opus\/48000/i);
    if (!m) return sdp;
    var re = new RegExp('a=fmtp:' + m[1] + ' [^\r\n]*');
    if (re.test(sdp)) return sdp.replace(re, function (l) { return /maxaveragebitrate/.test(l) ? l : l + ';maxaveragebitrate=128000'; });
    return sdp.replace(new RegExp('(a=rtpmap:' + m[1] + ' opus\\/48000[^\r\n]*)', 'i'), '$1\r\na=fmtp:' + m[1] + ' maxaveragebitrate=128000');
  }

  /* Entrer dans l'appel et publier ses pistes (micro, caméra ou boîtier) */
  function rejoindreEtPublier(c) {
    return poster(c, 'rejoindre', { cam: c.cam ? 1 : 0 })
      .then(function (d) {
        if (!d || c.fini) return;
        c.etat = d.appel; c.max = d.max || 6;
        var cfg = { bundlePolicy: 'max-bundle', iceServers: d.ice || [{ urls: 'stun:stun.cloudflare.com:3478' }] };
        c.pub = new RTCPeerConnection(cfg);
        c.sub = new RTCPeerConnection(cfg);
        /* 🎚️ v1391 — LE SON DU PROF EN BONNE QUALITÉ. Par défaut, l'Opus
           d'un appel part à ~32 kb/s, réglé pour la voix : le son d'une
           vidéo de cours y devient métallique. Le prof d'un cours monte à
           128 kb/s (ici, et dans la réponse, voir opusHaut). */
        var profDuCours = !!(c.cours && !c.eleve);
        try {
          c.trAudio = c.pub.addTransceiver(c.audio || 'audio', profDuCours
            ? { direction: 'sendonly', sendEncodings: [{ maxBitrate: 128000 }] } : { direction: 'sendonly' });
        } catch (e) { c.trAudio = c.pub.addTransceiver(c.audio || 'audio', { direction: 'sendonly' }); }
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
            .then(function (r) {
              var rep = r.reponse;
              if (profDuCours && rep && rep.sdp) rep = { type: rep.type, sdp: opusHaut(rep.sdp) };
              return c.pub.setRemoteDescription(rep);
            })
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
          if (d.dehors || (c.etat && c.etat.fini)) {
            terminer(c, false, c.cours ? 'Le cours est terminé. Merci, à bientôt !'
                                       : c.etat && c.etat.decroche ? '' : 'Personne n’a répondu.');
            return;
          }
          if (c.cours) appliquerLaParole(c);
          if (d.aRecevoir) recevoir(c);
          dessinerLesTuiles(c);
        })
        .catch(function () { /* un battement raté : le suivant rattrapera */ });
      niveaux(c);
    };
    tour();
    /* 📉 v1386 — UN COURS EN VISIO BAT MOINS VITE. Chaque battement est un
       appel au Worker : dix élèves toutes les 2 s pendant une heure, c'est
       18 000 appels — près d'un cinquième du plafond gratuit d'une journée.
       Un élève qui REGARDE bat toutes les 5 s, le prof toutes les 3 s ; un
       appel ordinaire garde ses 2 s. Le Worker compte un participant parti
       au bout de 25 s sans signe : la marge reste large. */
    c.minuteur = setInterval(tour, c.cours ? (c.eleve ? 5000 : 3000) : 2000);
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
    if (c.cours) { dessinerLEcranDuCours(c); return; }
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
    if (c.cours) { boutonsDuCours(c); return; }
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
    if (c.cours) { dessinerLeCours(c); return; }
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
    /* 🔈 v1391 — la sortie choisie, ou celle de l'ordinateur (vide) : on
       sait aussi revenir à la sortie par défaut */
    var voulue = c.sortie || '';
    if (a.setSinkId && (a.__sortie || '') !== voulue) {
      a.__sortie = voulue;
      a.setSinkId(voulue).catch(function () { a.__sortie = ''; });
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
    if (c.cours && c.cours.coupeParProf) {
      message(c, '🔇 Le prof a coupé les micros. Lève la main ✋ pour demander la parole.');
      return;
    }
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

  /* ============================================================
     🎥 LE COURS — v1356
     ============================================================ */
  function moiDansLAppel(c) {
    var g = (c.etat && c.etat.gens) || [];
    for (var i = 0; i < g.length; i++) if (g[i].moi) return g[i];
    return null;
  }

  function dessinerLEcranDuCours(c) {
    var k = c.cours;
    var e = el('div', 'aplEcran');
    e.innerHTML =
      '<div class="aplHaut"><span class="aplPoint"></span>' +
        '<div class="aplTitre"><b>' + echap(c.titre) + '</b><span class="aplSous">Cours de code en visio</span></div>' +
        '<span class="aplChrono">00:00</span>' +
        '<button type="button" class="aplPetit" data-a="reduire">' + ic('reduire', 16) + 'Réduire</button>' +
      '</div>' +
      '<div class="aplCours">' +
        '<div class="aplScene"><span class="etiq"></span><div class="attente"></div>' +
          (c.eleve ? '<button type="button" class="aplPlein" data-a="plein" title="En grand (tourne ton téléphone)">⤢ En grand</button>' : '') + '</div>' +
        (c.eleve ? '' : '<div class="aplCote"></div>') +
        (k.feuille ? '<div class="aplFeuille" hidden></div>' : '') +
        (k.questionnaire ? '<div class="aplQuest" hidden><div class="tete"><span>📝 Séance ' + echap(k.numero) + '</span>' +
          '<a href="' + echap(k.questionnaire) + '" target="_blank" rel="noopener">↗ À part</a>' +
          '<button type="button" data-a="fermerQuest">✕ Revenir au cours</button></div></div>' : '') +
      '</div>' +
      '<div class="aplBas"></div>';
    document.body.appendChild(e);
    c.e = e;
    c.grille = e.querySelector('.aplCours');
    e.querySelector('[data-a="reduire"]').addEventListener('click', function () { reduire(c); });
    /* ⤢ v1391 — David : « si l'élève a son téléphone en portrait, mon image
       est coupée ». En grand : le plein écran, et le téléphone passe en
       paysage (Android) ; sur iPhone, le lecteur plein écran d'Apple, qui
       tourne avec le téléphone. */
    var pl = e.querySelector('[data-a="plein"]');
    if (pl) pl.addEventListener('click', function () { pleinEcranDuCours(c); });
    var fq = e.querySelector('[data-a="fermerQuest"]');
    if (fq) fq.addEventListener('click', function () { basculerQuestionnaire(c, false); });
    boutonsDuCours(c);
    dessinerLeCours(c);
  }

  function pleinEcranDuCours(c) {
    var scene = c.e && c.e.querySelector('.aplScene');
    if (!scene) return;
    var d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      try { (d.exitFullscreen || d.webkitExitFullscreen).call(d); } catch (e) {}
      return;
    }
    var v = scene.querySelector('video');
    var demande = scene.requestFullscreen || scene.webkitRequestFullscreen;
    if (demande) {
      try {
        var p = demande.call(scene);
        var tourner = function () { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) {} };
        if (p && p.then) p.then(tourner, function () { if (v && v.webkitEnterFullscreen) v.webkitEnterFullscreen(); }); else tourner();
        return;
      } catch (e) {}
    }
    if (v && v.webkitEnterFullscreen) { try { v.webkitEnterFullscreen(); } catch (e) {} }
    else message(c, 'Tourne ton téléphone : l’image sera plus grande.');
  }

  /* 📱 v1425 — David, le 13 novembre, sur iPhone : « si j'appuie sur En
     grand et qu'ensuite je coupe En grand, ça freeze : en petit je n'ai
     que le son ; pour ravoir l'image il faut que je rappuie sur En grand
     puis sur play ». En sortant de son lecteur plein écran, l'iPhone met
     la vidéo en pause (le son, lui, passe par un autre lecteur et
     continue). On la relance dès qu'il en sort, et à chaque mise en pause
     qu'on n'a pas demandée : l'image du cours est en direct, il n'y a
     jamais de raison qu'elle reste figée. */
  function jouer(v) {
    try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function relancerLImage(v) {
    var plusTard = function () { setTimeout(function () { if (v.isConnected && v.srcObject && v.paused) jouer(v); }, 60); };
    v.addEventListener('webkitendfullscreen', plusTard);
    v.addEventListener('webkitpresentationmodechanged', function () { if (v.webkitPresentationMode !== 'fullscreen') plusTard(); });
    v.addEventListener('pause', plusTard);
    document.addEventListener('fullscreenchange', plusTard);
    document.addEventListener('webkitfullscreenchange', plusTard);
  }

  /* L'image du cours : le boîtier du prof (chez lui, son propre aperçu) */
  function dessinerLeCours(c) {
    var k = c.cours;
    var gens = (c.etat && c.etat.gens) || [];
    var parCle = c.etat && c.etat.parCle;
    var prof = null;
    gens.forEach(function (x) { if (x.cle === parCle) prof = x; });
    var scene = c.e.querySelector('.aplScene');
    var piste = c.eleve ? (prof && prof.etat === 'dedans' ? pisteDe(c, parCle, 'video') : null) : c.camPiste;
    var v = scene.querySelector('video');
    if (piste && piste.readyState !== 'ended') {
      if (!v) { v = document.createElement('video'); v.autoplay = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.muted = true; scene.insertBefore(v, scene.firstChild); relancerLImage(v); }
      if (!v.srcObject || v.srcObject.getVideoTracks()[0] !== piste) { v.srcObject = new MediaStream([piste]); jouer(v); }
      else if (v.paused) jouer(v);
    } else if (v) { v.parentNode.removeChild(v); }
    var att = scene.querySelector('.attente');
    att.textContent = piste ? '' : (c.eleve
      ? (prof && prof.etat === 'dedans' ? 'L’image du cours arrive…' : '⏳ ' + (k.par || 'Le prof') + ' arrive, le cours va commencer…')
      : 'Pas d’image : vérifie le boîtier.');
    scene.querySelector('.etiq').textContent = c.eleve ? (k.par ? 'Le cours de ' + k.par : 'Le cours') : 'Ce que voient les élèves';
    scene.querySelector('.etiq').style.display = piste ? '' : 'none';

    /* Le son de chacun (le prof, les élèves qui parlent) */
    gens.forEach(function (x) { if (!x.moi && x.etat === 'dedans') jouerLeSon(c, x.cle); });
    Object.keys(c.audios).forEach(function (cl) {
      if (!gens.some(function (x) { return x.cle === cl && x.etat === 'dedans' && !x.moi; })) {
        try { c.audios[cl].srcObject = null; c.audios[cl].remove(); } catch (e) {}
        delete c.audios[cl];
      }
    });

    var eleves = gens.filter(function (x) { return x.genre === 'eleve'; });
    var la = eleves.filter(function (x) { return x.etat === 'dedans'; });
    var mains = eleves.filter(function (x) { return x.etat === 'dedans' && x.main; });
    var sous = c.e.querySelector('.aplSous');
    if (sous) {
      sous.textContent = c.eleve
        ? (k.par ? 'avec ' + k.par + ' · ' : '') + la.length + ' élève' + (la.length > 1 ? 's' : '') + ' en visio'
        : la.length + ' présent' + (la.length > 1 ? 's' : '') + ' sur ' + eleves.length +
          (mains.length ? ' · ✋ ' + mains.length : '');
    }
    if (!c.eleve) dessinerLaListeDuCours(c, eleves);
    majChrono(c);
  }

  /* Chez le prof : les élèves, là ou pas encore, qui parle, qui lève la main */
  function dessinerLaListeDuCours(c, eleves) {
    var z = c.e.querySelector('.aplCote');
    if (!z) return;
    var rang = function (x) { return x.etat === 'dedans' ? (x.main ? 0 : 1) : x.etat === 'invite' ? 2 : 3; };
    var l = eleves.slice().sort(function (a, b) { return rang(a) - rang(b) || String(a.qui).localeCompare(String(b.qui), 'fr'); });
    var h = '<div class="t"><span>ÉLÈVES</span><span>' + l.filter(function (x) { return x.etat === 'dedans'; }).length + ' / ' + l.length + '</span></div>';
    if (!l.length) h += '<div style="font-size:12.5px;color:#9AA7B1;padding:4px">Personne pour l’instant.</div>';
    l.forEach(function (x) {
      var dedans = x.etat === 'dedans';
      var parle = dedans && (c.niveaux[x.cle] || 0) > 0.02 && !x.coupe && x.micro !== 0;
      var etat = dedans ? (x.coupe ? 'micro coupé' : x.micro === 0 ? 's’est mis en muet' : parle ? 'parle' : 'là')
               : x.etat === 'invite' ? 'pas encore là' : 'parti';
      /* 📝 v1427 — où il en est de ses réponses (ec-visio.js le lit) */
      var pg = c.cours.progres ? c.cours.progres(x.qui) : null;
      h += '<div class="aplEl' + (dedans ? '' : ' absent') + (parle ? ' parle' : '') + '">' +
        '<span class="r">' + echap(initiales(x.qui)) + '</span>' +
        '<span class="n">' + echap(x.qui) + '<small>' + echap(etat) +
          (pg && pg.texte ? ' · <b class="aplPg ' + echap(pg.couleur || '') + '">' + echap(pg.texte) + '</b>' : '') + '</small></span>' +
        (dedans && x.main ? '<span class="main" title="Lève la main">✋</span>' : '') +
        (dedans ? '<button type="button" data-parole="' + echap(x.cle) + '" data-ouvrir="' + (x.coupe ? 1 : 0) + '"' +
          (x.coupe ? ' class="on" title="Lui rendre la parole">🎙️ Parole' : ' title="Couper son micro">🔇 Couper') + '</button>' : '') +
      '</div>';
    });
    if (z.getAttribute('data-h') === h) return;
    z.setAttribute('data-h', h);
    z.innerHTML = h;
    Array.prototype.forEach.call(z.querySelectorAll('[data-parole]'), function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        poster(c, 'parole', { cle: b.getAttribute('data-parole'), ouvrir: Number(b.getAttribute('data-ouvrir')) })
          .then(function (d) { if (d.appel) c.etat = d.appel; dessinerLeCours(c); boutonsDuCours(c); },
                function (e) { b.disabled = false; message(c, e.message); });
      });
    });
  }

  function boutonsDuCours(c) {
    var k = c.cours;
    var bas = c.e.querySelector('.aplBas');
    bas.innerHTML = '';
    var bt = function (cle, dedans, lab, cls, faire) {
      var b = el('button', 'aplBt' + (cls ? ' ' + cls : ''), '<i>' + dedans + '</i><span>' + echap(lab) + '</span>');
      b.type = 'button'; b.setAttribute('data-a', cle);
      b.addEventListener('click', faire);
      bas.appendChild(b);
    };
    var em = function (t) { return '<b class="em">' + t + '</b>'; };
    if (c.eleve) {
      var coupe = k.coupeParProf;
      bt('micro', ic('micro', 26, c.micro ? '#1F2A33' : '#3A2A20', !c.micro),
         coupe ? 'Coupé par le prof' : c.micro ? 'Micro' : 'Micro coupé', c.micro ? '' : 'coupe', function () { basculerMicro(c); });
      bt('main', em('✋'), k.main ? 'Baisser la main' : 'Lever la main', k.main ? 'on' : '', function () { leverLaMain(c); });
      if (k.feuille) bt('quest', em('📝'), k.quest ? 'Replier mes réponses' : 'Mes réponses', k.quest ? 'on' : '', function () { basculerQuestionnaire(c); });
      else if (k.questionnaire) bt('quest', em('📝'), k.quest ? 'Fermer le questionnaire' : 'Questionnaire', k.quest ? 'on' : '', function () { basculerQuestionnaire(c); });
      bt('son', ic('hp', 26, c.son ? '#1F2A33' : '#3A2A20', !c.son), c.son ? 'Son' : 'Son coupé', c.son ? '' : 'coupe', function () { c.son = !c.son; appliquerLeSon(c); });
      bt('raccrocher', ic('raccrocher', 28), 'Quitter', 'rouge', function () { terminer(c, true); });
      return;
    }
    (k.gestes || []).forEach(function (g) {
      var on = !!g.on();
      var off = typeof g.labOff === 'function' ? g.labOff() : g.labOff;
      bt(g.cle, em(g.emoji), on ? g.lab : off, on ? '' : 'coupe', function () { g.faire(); boutonsDuCours(c); });
    });
    var eleves = ((c.etat && c.etat.gens) || []).filter(function (x) { return x.genre === 'eleve'; });
    var tousCoupes = eleves.length && eleves.every(function (x) { return x.coupe; });
    bt('micros', em(tousCoupes ? '🎙️' : '🔇'), tousCoupes ? 'Rouvrir les micros' : 'Couper les micros des élèves', tousCoupes ? 'on' : '', function () {
      poster(c, tousCoupes ? 'ouvrirTous' : 'couperTous', {})
        .then(function (d) { if (d.appel) c.etat = d.appel; dessinerLeCours(c); boutonsDuCours(c); },
              function (e) { message(c, e.message); });
    });
    /* ⚙️ v1391 — micro, son du boîtier et haut-parleur, pendant le cours */
    if (k.surSon) bt('reglageson', em('⚙️'), 'Réglages du son', '', function () { k.surSon(c); });
    if (k.surInviter) bt('inviter', ic('ajouter', 26), 'Inviter', '', function () { k.surInviter(c); });
    if (k.surLien) bt('lien', em('🔗'), 'Le lien', '', function () { k.surLien(c); });
    var sur = k.finSure && Date.now() - k.finSure < 5000;
    bt('terminer', em('⏹'), sur ? 'Sûr ? Terminer' : 'Terminer le cours', 'rouge', function () {
      if (!(k.finSure && Date.now() - k.finSure < 5000)) {
        k.finSure = Date.now();
        boutonsDuCours(c);
        setTimeout(function () { if (!c.fini) boutonsDuCours(c); }, 5100);
        return;
      }
      poster(c, 'terminer', {}).catch(function () {}).then(function () { terminer(c, true, 'Cours terminé.'); });
    });
  }

  /* L'élève : la parole coupée ou rendue par le prof */
  function appliquerLaParole(c) {
    if (!c.eleve || !c.cours) return;
    var k = c.cours;
    var moi = moiDansLAppel(c);
    if (!moi) return;
    var coupe = !!moi.coupe;
    var avant = { coupe: k.coupeParProf, main: k.main, micro: c.micro };
    if (coupe && !k.coupeParProf) {
      k.coupeParProf = true; c.micro = false;
      if (c.audio) c.audio.enabled = false;
      message(c, '🔇 Le prof a coupé les micros. Lève la main ✋ pour demander la parole.');
    } else if (!coupe && k.coupeParProf) {
      k.coupeParProf = false; c.micro = true;
      if (c.audio) c.audio.enabled = true;
      message(c, '🎙️ ' + (k.par || 'Le prof') + ' te donne la parole.');
    }
    k.main = !!moi.main;
    if (avant.coupe !== k.coupeParProf || avant.main !== k.main || avant.micro !== c.micro) boutonsDuCours(c);
  }

  function leverLaMain(c) {
    var k = c.cours;
    k.main = !k.main;
    boutonsDuCours(c);
    if (k.main) message(c, '✋ Main levée : le prof la voit.');
    poster(c, 'main', { main: k.main ? 1 : 0 }).then(function (d) { if (d.appel) c.etat = d.appel; },
      function (e) { k.main = !k.main; boutonsDuCours(c); message(c, e.message); });
  }

  /* 📝 « répondre directement pendant la visio pour ne pas avoir à
     changer de page » (David) : le Google Form dans un panneau */
  /* 📝 v1426 — David : « le questionnaire cache l'écran, on ne voit pas
     les questions ». Ses réponses se donnent maintenant dans l'appli
     (k.feuille, dessinée par eleve.html), SOUS l'image du cours ; le
     Google Form ne revient qu'en secours (séance pas encore prête), et
     lui aussi sous l'image. */
  function basculerQuestionnaire(c, oui) {
    var k = c.cours;
    var f = c.e && c.e.querySelector('.aplFeuille');
    if (f && !k.formSecours) {
      k.quest = oui === undefined ? !k.quest : !!oui;
      if (k.quest && !f.getAttribute('data-pret')) {
        f.setAttribute('data-pret', '1');
        k.feuille(f, function () {
          if (!k.questionnaire) return false;
          k.formSecours = true;
          f.hidden = true;
          basculerQuestionnaire(c, true);
          return true;
        });
      }
      f.hidden = !k.quest;
      if (c.grille) c.grille.classList.toggle('avecPanneau', !!k.quest);
      boutonsDuCours(c);
      return;
    }
    var p = c.e && c.e.querySelector('.aplQuest');
    if (!p) return;
    k.quest = oui === undefined ? !k.quest : !!oui;
    if (c.grille) c.grille.classList.toggle('avecPanneau', !!k.quest);
    if (k.quest && !p.querySelector('iframe')) {
      var f = document.createElement('iframe');
      f.src = k.questionnaire + (k.questionnaire.indexOf('?') === -1 ? '?' : '&') + 'embedded=true';
      f.setAttribute('title', 'Questionnaire de la séance');
      f.setAttribute('loading', 'lazy');
      p.appendChild(f);
    }
    p.hidden = !k.quest;
    boutonsDuCours(c);
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
    enCours: function () { return courant && !courant.fini ? { appel: courant.appel, titre: courant.titre, cours: !!courant.cours } : null; },
    /* 🎥 redessiner les boutons du cours (un interrupteur changé par la page) */
    majCours: function () { if (courant && courant.cours && courant.e) boutonsDuCours(courant); },
    /* 🔈 v1391 — où l'on entend les autres (vide = la sortie par défaut) */
    sortie: function (id) {
      if (!courant || courant.fini) return;
      courant.sortie = id || '';
      appliquerLeSon(courant);
    },
    raccrocher: function () { if (courant) terminer(courant, true); }
  };
})();
