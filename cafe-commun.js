/* Déployé le 17/11/2026 à 18:53 — v1456 */
/* ============================================================
   cafe-commun.js — ☕ LE COIN CAFÉ, MÊME ÉCRAN DES DEUX CÔTÉS

   David, le 17 novembre : « un chifoumi caché dans l'app qui nous
   permet de proposer un duel à un autre utilisateur », puis le pile
   ou face, la course de voitures (« chacun mise sur une des
   voitures ; si on est plusieurs, autant de voitures que de
   joueurs ») et mes idées, toutes gardées : Feu vert, Courte paille,
   Créneau parfait, Morpion, Le juste chiffre (le duel du code est
   retiré). Le tournoi : un administrateur choisit les joueurs et
   les jeux. Défier un élève : aucune trace, la partie s'ouvre dans
   son App le temps de jouer.

   Ce fichier est chargé par l'application (index.html, via
   app/ec-coin-cafe.js) ET par l'espace élève (eleve.html) : les
   fenêtres et les jeux sont les mêmes. Chaque page lui donne sa
   porte vers le Worker, ses classes de fenêtre et de boutons (la
   fenêtre de l'appli d'un côté, celle de l'espace élève de l'autre),
   et dit qui est là. Le Worker tient le jeu (voir « LE COIN CAFÉ »
   dans cloudflare-worker.js) : ici, on montre et on envoie les coups.

   ⚠️ ÉCRIT EN ES5 (var, function), comme eleve.html et
   appel-commun.js : les vieux téléphones des élèves lisent la page
   entière ou rien.

   ⚠️ L'HEURE EST CELLE DU SERVEUR. Le feu qui passe au vert, le
   départ de la course, le temps qui reste : tout se cale sur
   « heure » rendue par le Worker (écart mesuré à chaque réponse),
   pour que deux téléphones voient la même chose au même moment.
   ============================================================ */
(function () {
  'use strict';
  if (window.CafeEC) return;

  var JEUX = {
    chifoumi: { au: 'au chifoumi', nom: 'Chifoumi', e: '✊✋✌️', ic: '✊', s: 'en duel · 1 à 7 manches', min: 2, max: 2, temps: true, manches: true, eleve: true },
    pileface: { au: 'à pile ou face', nom: 'Pile ou face', e: '🪙', ic: '🪙', s: 'en duel', min: 2, max: 2, temps: true, manches: true, eleve: true },
    course: { au: 'à la course', nom: 'La course', e: '🏎️', ic: '🏎️', s: '2 à 8 joueurs · chacun sa voiture', min: 2, max: 8, temps: false, manches: true, eleve: true },
    feuvert: { au: 'au feu vert', nom: 'Feu vert', e: '🚦', ic: '🚦', s: 'le plus rapide au démarrage', min: 2, max: 8, temps: false, manches: true, eleve: true },
    paille: { au: 'à la courte paille', nom: 'Courte paille', e: '🥢', ic: '🥢', s: 'qui va chercher les cafés ?', min: 2, max: 8, temps: false, manches: false, eleve: false },
    creneau: { au: 'au créneau parfait', nom: 'Créneau parfait', e: '🅿️', ic: '🅿️', s: 'arrêter la voiture au plus près', min: 2, max: 8, temps: false, manches: true, eleve: true },
    morpion: { au: 'au morpion', nom: 'Morpion', e: '⭕❌', ic: '⭕', s: 'en duel', min: 2, max: 2, temps: true, manches: true, eleve: true },
    chiffre: { au: 'au juste chiffre', nom: 'Le juste chiffre', e: '🎯', ic: '🎯', s: 'le plus proche du nombre secret', min: 2, max: 8, temps: true, manches: true, eleve: true }
  };
  var ORDRE = ['chifoumi', 'pileface', 'course', 'feuvert', 'paille', 'creneau', 'morpion', 'chiffre'];
  var VOITURES = { rouge: '#E2382B', bleue: '#2F6FE0', jaune: '#F2B705', verte: '#3E9B2F', orange: '#F07D1A', violette: '#8A4FD8', rose: '#E64C9A', noire: '#2B2D31' };
  var NOMS_V = ['rouge', 'bleue', 'jaune', 'verte', 'orange', 'violette', 'rose', 'noire'];
  var MAINS = { p: '✊', f: '✋', c: '✌️' };
  var NOM_MAIN = { p: 'Pierre', f: 'Feuille', c: 'Ciseaux' };
  var TEMPS = [[5, '5 s'], [15, '15 s'], [60, '1 min'], [0, 'Sans limite']];

  var O = null;                 /* ce que la page a branché */
  var F = null;                 /* la fenêtre ouverte : { fond, boite, corps, bas, ecran, id } */
  var ecart = 0;                /* heure du serveur − heure d'ici */
  var parties = {};             /* id → dernière partie lue */
  var vus = {};                 /* parties dont la fin a été vue (on ne la rouvre pas) */
  var plusTard = {};            /* invitations remises à plus tard */
  var reduits = {};             /* parties mises de côté (l'équipe seulement) */
  var minuteurPartie = 0, minuteurFond = 0, rafVivant = 0;
  var enCours = false;          /* une lecture est partie */
  var choixDefi = null;         /* le défi en préparation */
  var signature = '';

  /* ---------- petites aides ---------- */
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function maintenant() { return Date.now() + ecart; }
  function initiale(nom) { var m = String(nom || '?').trim().split(/\s+/); return (m.length > 1 && /^[A-ZÉÈ]{2,}$/.test(m[0]) ? m[1].charAt(0) : m[0].charAt(0)).toUpperCase(); }
  function prenom(nom) {
    var m = String(nom || '').trim().split(/\s+/);
    /* « MARTIN Léa » → « Léa » ; « David » → « David » */
    if (m.length > 1 && /^[A-ZÉÈÀÇ\-']{2,}$/.test(m[0])) return m.slice(1).join(' ');
    return m[0] || '';
  }
  function joueur(p, cle) { for (var i = 0; i < p.joueurs.length; i++) if (p.joueurs[i].cle === cle) return p.joueurs[i]; return null; }
  function nomDe(p, cle) { var j = joueur(p, cle); return j ? prenom(j.nom) : ''; }
  function actifs(p) { return p.joueurs.filter(function (j) { return j.rep === 'oui'; }); }
  function autres(p) { return actifs(p).filter(function (j) { return j.cle !== p.moi; }); }
  function besoin(p) { return Math.floor(Number(p.reglages.manches || 1) / 2) + 1; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function vibrer(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {} }
  /* le petit message du bas : celui de la page, sinon le nôtre */
  var bulle = null, bulleT = 0;
  function toast(t) {
    if (O && O.toast) { O.toast(t); return; }
    if (!bulle) {
      bulle = el('div', '');
      bulle.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:#14161B;color:#fff;border-radius:12px;padding:10px 16px;font-size:14px;font-weight:700;max-width:90vw;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25);transition:opacity .2s';
      document.body.appendChild(bulle);
    }
    bulle.textContent = t;
    bulle.style.opacity = '1';
    clearTimeout(bulleT);
    bulleT = setTimeout(function () { bulle.style.opacity = '0'; }, 2600);
  }
  function voiture(couleur, n, cls) {
    var c = VOITURES[couleur] || couleur || '#888';
    return '<svg class="' + (cls || '') + '" viewBox="0 0 68 30" aria-hidden="true"><path d="M6 22 L8 14 Q10 11 15 11 L24 11 L31 5 Q33 4 37 4 L48 4 Q52 4 55 8 L58 12 Q64 13 65 17 L65 22 Z" fill="' + c + '" stroke="rgba(0,0,0,.25)"/>' +
      '<path d="M33 7 L38 6 L47 6 Q50 6 52 9 L54 12 L28 12 Z" fill="#CFE8FF" opacity=".9"/>' +
      '<circle cx="18" cy="23" r="5.2" fill="#1d1f22"/><circle cx="18" cy="23" r="2.2" fill="#9aa0a6"/>' +
      '<circle cx="52" cy="23" r="5.2" fill="#1d1f22"/><circle cx="52" cy="23" r="2.2" fill="#9aa0a6"/>' +
      (n ? '<text x="22" y="20" font-size="8" font-weight="800" fill="#fff" font-family="Inter,Arial">' + esc(n) + '</text>' : '') + '</svg>';
  }

  /* ---------- le style ---------- */
  var CSS =
    '.cfLab{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:14px 0 7px}' +
    '.cfLab:first-child{margin-top:0}' +
    '.cfCorps{font-size:14.5px;line-height:1.5;color:var(--cream);max-height:calc(100vh - 190px);overflow-y:auto;margin:0 -4px;padding:0 4px}' +
    '.cfAide{font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.45}' +
    '.cfChips{display:flex;gap:6px;flex-wrap:wrap}' +
    '.cfChips button{width:auto;margin:0;min-height:0;height:auto;padding:7px 13px;border-radius:999px;border:1px solid var(--line);background:var(--navy-deep,#fff);color:var(--cream);font:inherit;font-weight:700;font-size:13.5px;cursor:pointer;box-shadow:none}' +
    '.cfChips button.on{background:linear-gradient(180deg,#D8FF6A,#B6FF0E);color:#111;border-color:transparent;box-shadow:0 4px 12px rgba(150,220,0,.28)}' +
    '.cfChips button:disabled{opacity:.45;cursor:not-allowed}' +
    '.cfChamp{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--line);border-radius:12px;font:inherit;font-size:14px;background:var(--navy-deep,#fff);color:var(--cream);margin:0}' +
    '.cfBas{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}' +
    '.cfBas .btn{flex:1 1 120px;min-width:0;margin:0}' +
    '.cfMode{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;border-radius:14px;background:var(--navy,#F0F1EA);border:1px solid var(--line);margin-bottom:12px}' +
    '.cfMode button{margin:0;min-height:0;height:auto;padding:9px 6px;border-radius:11px;border:0;background:transparent;color:var(--muted);font:inherit;font-weight:800;font-size:13.5px;cursor:pointer;width:auto}' +
    '.cfMode button.on{background:var(--navy-deep,#fff);color:var(--cream);box-shadow:0 2px 6px rgba(0,0,0,.08)}' +
    '.cfGrille{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}' +
    '@media (max-width:440px){.cfGrille{grid-template-columns:repeat(2,1fr)}}' +
    '.cfJeu{position:relative;border:1px solid var(--line);border-radius:16px;background:var(--navy-deep,#fff);padding:12px 8px 10px;text-align:center;font-weight:800;font-size:13.5px;color:var(--cream);cursor:pointer;margin:0;width:auto;height:auto;min-height:0;font-family:inherit;box-shadow:none}' +
    '.cfJeu:hover,.cfJeu:focus-visible{border-color:#B6FF0E;outline:none}' +
    '.cfJeu .e{display:block;font-size:30px;line-height:1.15;margin-bottom:3px}' +
    '.cfJeu small{display:block;font-weight:500;font-size:11.5px;color:var(--muted);margin-top:2px;line-height:1.3}' +
    '.cfLigne{display:flex;align-items:center;gap:10px;padding:9px 11px;border:1px solid var(--line);border-radius:13px;background:var(--navy-deep,#fff);font-size:13.5px;font-weight:700;margin-top:6px;color:var(--cream)}' +
    '.cfLigne > div{min-width:0;flex:1}' +
    '.cfLigne small{display:block;font-weight:500;color:var(--muted);font-size:12px}' +
    '.cfLigne .go{flex:0 0 auto;width:auto;margin:0;min-height:0;height:auto;padding:6px 12px;border-radius:999px;border:0;background:linear-gradient(180deg,#D8FF6A,#B6FF0E);font:inherit;font-size:12.5px;font-weight:800;color:#111;cursor:pointer}' +
    '.cfDeux{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}' +
    '.cfDeux button{flex:1 1 140px;margin:0;width:auto;min-height:0;height:auto;padding:9px 10px;border:1px solid var(--line);border-radius:12px;font:inherit;font-weight:700;font-size:13px;background:var(--navy-deep,#fff);color:var(--cream);cursor:pointer}' +
    '.cfDeux button.adm{border-style:dashed}' +
    '.cfDeux button small{display:block;font-weight:500;color:var(--muted);font-size:11px}' +
    '.cfQui{display:flex;flex-direction:column;gap:6px}' +
    '.cfP{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:13px;background:var(--navy-deep,#fff);font-weight:700;font-size:14.5px;cursor:pointer;color:var(--cream);text-align:left;width:100%;margin:0;font-family:inherit;min-height:0;height:auto;box-shadow:none}' +
    '.cfP small{display:block;font-weight:500;font-size:12px;color:var(--muted)}' +
    '.cfP .bil{margin-left:auto;font-size:12px;font-weight:700;color:var(--muted);text-align:right}' +
    '.cfP.on{border:2px solid #B6FF0E;background:#F6FFE6;color:#111}' +
    '.cfAv{width:36px;height:36px;border-radius:50%;border:2px solid #B6FF0E;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#3d6b00;background:#F3FFE0;flex:0 0 auto}' +
    '.cfManche{text-align:center;font-weight:800;font-size:13px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}' +
    '.cfPast{display:flex;justify-content:center;gap:6px;margin:6px 0 12px;flex-wrap:wrap}' +
    '.cfPast i{width:26px;height:26px;border-radius:50%;border:1px solid var(--line);display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-size:12px;font-weight:800;color:var(--cream)}' +
    '.cfPast i.g{background:#B6FF0E;border-color:transparent;color:#111}' +
    '.cfPast i.p{background:#FFE1D8;border-color:transparent;color:#B03A12}' +
    '.cfPast i.n{background:var(--line);border-color:transparent}' +
    '.cfPast i.c{outline:2px solid #B6FF0E;outline-offset:2px}' +
    '.cfScore{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin:2px 0 12px}' +
    '.cfJ{display:flex;flex-direction:column;align-items:center;gap:5px;font-weight:800;font-size:14px;text-align:center}' +
    '.cfJ .cfAv{width:54px;height:54px;border-width:3px;font-size:17px}' +
    '.cfJ small{font-weight:600;font-size:12px;color:var(--muted)}' +
    '.cfJ small.ok{color:#3d6b00}' +
    '.cfPts{font-size:38px;font-weight:800;letter-spacing:.04em;font-variant-numeric:tabular-nums;color:var(--cream)}' +
    '.cfTab{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:2px 0 12px}' +
    '.cfTab span{display:inline-flex;align-items:center;gap:6px;padding:5px 10px 5px 5px;border-radius:999px;border:1px solid var(--line);font-weight:700;font-size:13px;background:var(--navy-deep,#fff)}' +
    '.cfTab span .cfAv{width:24px;height:24px;font-size:11px;border-width:2px}' +
    '.cfTab span b{font-variant-numeric:tabular-nums}' +
    '.cfTab span.moi{border-color:#B6FF0E}' +
    '.cfMains{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}' +
    '.cfMains button{height:auto;padding:14px 6px 10px;margin:0;border-radius:18px;border:1px solid var(--line);background:var(--navy-deep,#fff);color:var(--cream);font:inherit;font-weight:800;font-size:14px;display:flex;flex-direction:column;align-items:center;gap:4px;box-shadow:0 2px 6px rgba(0,0,0,.05);cursor:pointer;width:auto;min-height:0}' +
    '.cfMains button span{font-size:42px;line-height:1.1}' +
    '.cfMains button.on{border:2px solid #B6FF0E;background:#F6FFE6;color:#111}' +
    '.cfMains button:disabled{cursor:default}' +
    '.cfMains button:disabled:not(.on){opacity:.45}' +
    '.cfTemps{height:8px;border-radius:6px;background:var(--line);overflow:hidden;margin:12px 0 4px}' +
    '.cfTemps i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#B6FF0E,#8FD400);border-radius:6px}' +
    '.cfEtat{text-align:center;font-size:13.5px;font-weight:600;color:var(--muted);margin-top:6px}' +
    '.cfGage{text-align:center;font-size:12.5px;color:var(--muted);margin-top:10px}' +
    '.cfDuel{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin:18px 0 8px}' +
    '.cfDuel .m{font-size:64px;text-align:center;line-height:1}' +
    '.cfDuel .m.g{filter:drop-shadow(0 6px 14px rgba(150,220,0,.55));transform:scale(1.08)}' +
    '.cfDuel .m.p{opacity:.45}' +
    '.cfDuel .vs{font-weight:800;color:var(--muted);font-size:14px}' +
    '.cfDuel small{display:block;font-size:12px;font-weight:700;color:var(--muted);text-align:center;margin-top:4px}' +
    '.cfVerdict{text-align:center;font-weight:800;font-size:17px;margin:8px 0 2px;color:var(--cream)}' +
    '.cfVerdict small{display:block;font-weight:600;font-size:13px;color:var(--muted);margin-top:2px}' +
    '.cfBravo{text-align:center;font-size:52px;line-height:1;margin:2px 0 6px}' +
    '.cfPalm{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:4px}' +
    '.cfPalm td{padding:6px 4px;border-top:1px solid var(--line)}' +
    '.cfPalm td:last-child{text-align:right;font-weight:800}' +
    '.cfInv{text-align:center}' +
    '.cfInv .gros{font-size:46px;line-height:1;margin:4px 0 8px}' +
    '.cfInv .regle{display:inline-flex;flex-direction:column;gap:4px;text-align:left;background:var(--navy,#F6F7F1);border:1px solid var(--line);border-radius:14px;padding:10px 14px;font-size:14px;margin-top:10px}' +
    '.cfPiece{width:130px;height:130px;margin:6px auto 10px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFF6C9,#F2C94C 55%,#C99A1A);box-shadow:inset 0 -6px 0 rgba(0,0,0,.12),0 10px 24px rgba(201,154,26,.35);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#6b4e00;letter-spacing:.06em}' +
    '.cfPiece.tourne{animation:cfTourne 1.7s cubic-bezier(.2,.7,.3,1)}' +
    '@keyframes cfTourne{0%{transform:rotateY(0) translateY(0)}40%{transform:rotateY(1080deg) translateY(-40px)}100%{transform:rotateY(2160deg) translateY(0)}}' +
    '.cfChoix{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.cfChoix button{padding:14px 6px;margin:0;border-radius:16px;border:1px solid var(--line);background:var(--navy-deep,#fff);font:inherit;font-weight:800;font-size:15px;color:var(--cream);width:auto;height:auto;min-height:0;cursor:pointer}' +
    '.cfPiste{border-radius:16px;background:#3B3F45;padding:10px 0;position:relative;overflow:hidden;margin-top:10px}' +
    '.cfVoie{position:relative;height:46px;border-bottom:2px dashed rgba(255,255,255,.35)}' +
    '.cfVoie:last-child{border-bottom:0}' +
    '.cfVoie .nom{position:absolute;left:10px;top:4px;font-size:11px;font-weight:800;color:rgba(255,255,255,.78);z-index:1}' +
    '.cfVoie .car{position:absolute;top:12px;left:4px;width:68px;height:30px;will-change:transform}' +
    '.cfVoie .car svg{width:68px;height:30px;display:block}' +
    '.cfArrivee{position:absolute;top:0;bottom:0;right:34px;width:16px;background:repeating-conic-gradient(#fff 0 25%,#111 0 50%) 0 0/8px 8px}' +
    '.cfDecompte{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:54px;font-weight:800;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.5);pointer-events:none}' +
    '.cfVoitures{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}' +
    '.cfV{border:1px solid var(--line);border-radius:14px;padding:8px 10px;display:flex;align-items:center;gap:10px;background:var(--navy-deep,#fff);font-weight:800;font-size:13.5px;color:var(--cream);cursor:pointer;width:auto;margin:0;height:auto;min-height:0;font-family:inherit;text-align:left;box-shadow:none}' +
    '.cfV svg{width:62px;height:28px;flex:0 0 auto}' +
    '.cfV small{display:block;font-weight:600;font-size:12px;color:var(--muted)}' +
    '.cfV.on{border:2px solid #B6FF0E;background:#F6FFE6;color:#111}' +
    '.cfV:disabled{opacity:.5;cursor:not-allowed}' +
    '.cfPodium{display:flex;align-items:flex-end;justify-content:center;gap:8px;margin:6px 0 4px}' +
    '.cfPodium div{width:110px;text-align:center;font-weight:800;font-size:13px}' +
    '.cfPodium .marche{border-radius:10px 10px 0 0;background:var(--navy,#F0F1EA);border:1px solid var(--line);display:flex;align-items:flex-start;justify-content:center;padding-top:6px;font-size:20px}' +
    '.cfPodium svg{width:72px;height:32px;display:block;margin:0 auto 4px}' +
    '.cfFeu{width:86px;margin:4px auto 12px;background:#2A2D31;border-radius:22px;padding:10px;display:flex;flex-direction:column;gap:8px;align-items:center}' +
    '.cfFeu i{width:56px;height:56px;border-radius:50%;background:#4a4d52}' +
    '.cfFeu i.r{background:#FF4B2B;box-shadow:0 0 22px rgba(255,75,43,.8)}' +
    '.cfFeu i.v{background:#3BD45B;box-shadow:0 0 26px rgba(59,212,91,.9)}' +
    '.cfGros{display:block;width:100%;padding:20px;margin:0;border-radius:20px;border:0;font:inherit;font-size:20px;font-weight:800;background:var(--navy,#F0F1EA);color:var(--muted);height:auto;min-height:0;cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none}' +
    '.cfGros.vert{background:linear-gradient(180deg,#D8FF6A,#B6FF0E);color:#111}' +
    '.cfGros:disabled{cursor:default}' +
    '.cfPailles{display:flex;justify-content:center;gap:16px;align-items:flex-end;height:150px;margin:8px 0 6px}' +
    '.cfPailles div{display:flex;flex-direction:column;align-items:center;gap:6px;font-weight:800;font-size:12.5px;justify-content:flex-end;height:100%}' +
    '.cfPailles i{width:12px;border-radius:6px;background:linear-gradient(180deg,#F7E08A,#D9B44A);box-shadow:0 2px 4px rgba(0,0,0,.12);transition:height .6s ease}' +
    '.cfPailles .court i{background:linear-gradient(180deg,#FF9B7A,#E2552F)}' +
    '.cfPailles .cache i{background:var(--line)}' +
    '.cfCren{position:relative;height:110px;border-radius:16px;background:#3B3F45;overflow:hidden;margin-top:6px}' +
    '.cfCren .trottoir{position:absolute;left:0;right:0;bottom:0;height:16px;background:#8C8F94}' +
    '.cfCren .trait{position:absolute;top:10px;bottom:16px;width:3px;margin-left:-1.5px;background:#B6FF0E;box-shadow:0 0 10px rgba(182,255,14,.8)}' +
    '.cfCren .mur{position:absolute;top:0;bottom:0;right:0;width:10px;background:repeating-linear-gradient(45deg,#E2382B 0 8px,#fff 8px 16px)}' +
    '.cfCren .car{position:absolute;bottom:20px;left:0;width:68px;height:30px;margin-left:-34px;will-change:transform}' +
    '.cfCren .car svg{width:68px;height:30px;display:block}' +
    '.cfCren .ombre{position:absolute;bottom:20px;width:68px;height:30px;margin-left:-34px;opacity:.35}' +
    '.cfMorp{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:280px;margin:4px auto 0}' +
    '.cfMorp button{aspect-ratio:1/1;margin:0;width:auto;height:auto;min-height:72px;border-radius:16px;border:1px solid var(--line);background:var(--navy-deep,#fff);font-size:40px;font-weight:800;color:var(--cream);cursor:pointer;padding:0;line-height:1}' +
    '.cfMorp button.l{background:#F6FFE6;border:2px solid #B6FF0E}' +
    '.cfMorp button:disabled{cursor:default}' +
    '.cfNb{display:flex;gap:8px;align-items:center}' +
    '.cfNb input{flex:1;font-size:22px;font-weight:800;text-align:center;padding:10px;border:1px solid var(--line);border-radius:14px;background:var(--navy-deep,#fff);color:var(--cream);margin:0;min-width:0}' +
    '.cfNb .btn{flex:0 0 auto;width:auto;margin:0}' +
    '.cfTableau{display:grid;gap:14px;align-items:center;overflow-x:auto}' +
    '.cfTCol{display:flex;flex-direction:column;gap:10px;justify-content:space-around;height:100%}' +
    '.cfMatch{border:1px solid var(--line);border-radius:12px;background:var(--navy-deep,#fff);overflow:hidden;font-size:13px;font-weight:700;min-width:120px}' +
    '.cfMatch div{display:flex;justify-content:space-between;gap:6px;padding:6px 9px}' +
    '.cfMatch div + div{border-top:1px solid var(--line)}' +
    '.cfMatch .g{background:#F3FFE0;color:#111}' +
    '.cfMatch .att{color:var(--muted);font-weight:600}' +
    '.cfTTete{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);text-align:center;margin-bottom:6px}' +
    '.cfCotillons{position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden}' +
    '.cfCotillons i{position:absolute;top:-20px;width:8px;height:14px;border-radius:2px;animation:cfTombe 2.6s linear forwards}' +
    '@keyframes cfTombe{to{transform:translateY(110vh) rotate(540deg);opacity:.9}}' +
    '.cfAnneau{position:fixed;z-index:99998;pointer-events:none;border-radius:50%}' +
    '.cfAnneau svg{width:100%;height:100%;display:block;transform:rotate(-90deg)}' +
    '@media (prefers-reduced-motion:reduce){.cfPiece.tourne,.cfCotillons i{animation:none}}';

  function poserLeStyle() {
    if (document.getElementById('cafeStyle')) return;
    var s = document.createElement('style');
    s.id = 'cafeStyle';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ============================================================
     LA FENÊTRE : celle de la page (l'appli ou l'espace élève)
     ============================================================ */
  function fermer(sansRelire) {
    if (!F) return;
    var f = F;
    F = null;
    signature = '';
    clearTimeout(minuteurPartie);
    if (f.fond && f.fond.parentNode) f.fond.parentNode.removeChild(f.fond);
    document.removeEventListener('keydown', echap, true);
    if (!sansRelire) planifierFond(1500);
  }
  function echap(ev) {
    if (ev.key !== 'Escape' || !F) return;
    if (F.ecran === 'jeu' && F.id && parties[F.id] && parties[F.id].etat === 'encours') return;
    if (F.ecran === 'invite' && F.id) plusTard[F.id] = true;
    ev.stopPropagation();
    fermer();
  }
  function fenetre(ecran, titre, largeur) {
    var garde = F && F.fond && F.fond.parentNode ? F : null;
    if (!garde) {
      var fond = el('div', O.classes.fond);
      fond.setAttribute('data-cafe', '1');
      var boite = el('div', O.classes.boite);
      boite.setAttribute('role', 'dialog');
      boite.setAttribute('aria-modal', 'true');
      var t = el(O.classes.titreTag || 'h3', O.classes.titre || '');
      var corps = el('div', 'cfCorps');
      var bas = el('div', 'cfBas');
      boite.appendChild(t); boite.appendChild(corps); boite.appendChild(bas);
      fond.appendChild(boite);
      document.body.appendChild(fond);
      fond.addEventListener('click', function (e) { if (e.target === fond && F && F.ecran !== 'jeu' && F.ecran !== 'invite') fermer(); });
      document.addEventListener('keydown', echap, true);
      garde = F = { fond: fond, boite: boite, titre: t, corps: corps, bas: bas };
    }
    F.ecran = ecran;
    F.id = '';
    F.boite.style.maxWidth = 'min(' + (largeur || 460) + 'px, 94vw)';
    F.boite.style.width = '100%';
    F.titre.textContent = titre;
    F.corps.innerHTML = '';
    F.bas.innerHTML = '';
    signature = '';
    return F;
  }
  function bouton(texte, principal, faire, danger) {
    var b = el('button', 'btn ' + (principal ? 'btn-primary' : 'btn-secondary'));
    b.type = 'button';
    b.textContent = texte;
    if (danger) b.style.cssText = 'color:var(--red,#E2382B);border-color:var(--red,#E2382B);';
    b.addEventListener('click', faire);
    return b;
  }
  function chips(liste, actif, choisir, desact) {
    var z = el('div', 'cfChips');
    liste.forEach(function (x) {
      var b = el('button', String(x[0]) === String(actif) ? 'on' : '');
      b.type = 'button';
      b.textContent = x[1];
      if (desact && desact(x[0])) b.disabled = true;
      b.addEventListener('click', function () { choisir(x[0]); });
      z.appendChild(b);
    });
    return z;
  }
  function lab(t) { return el('div', 'cfLab', esc(t)); }

  /* ============================================================
     PARLER AU WORKER
     ============================================================ */
  function appeler(quoi, donnees) {
    var t0 = Date.now();
    return O.appeler(quoi, donnees || {}).then(function (r) {
      if (r && r.heure) ecart = Math.round(r.heure - (t0 + Date.now()) / 2);
      if (r && r.partie && r.partie.heure) ecart = Math.round(r.partie.heure - (t0 + Date.now()) / 2);
      if (r && r.status === 'error') throw new Error(r.message || 'Refusé');
      return r;
    });
  }
  function agir(id, quoi, donnees) {
    var d = donnees || {};
    d.id = id; d.quoi = quoi;
    return appeler('agir', d).then(function (r) {
      if (r && r.partie) recevoir([r.partie]);
      return r;
    }).catch(function (e) { toast('⚠️ ' + (e.message || e)); throw e; });
  }
  function recevoir(liste) {
    (liste || []).forEach(function (p) {
      var avant = parties[p.id];
      if (avant && avant.v > p.v && avant.etat === p.etat) return;
      parties[p.id] = p;
    });
    if (F && F.id && parties[F.id] && (F.ecran === 'jeu' || F.ecran === 'attente' || F.ecran === 'invite')) montrerPartie(parties[F.id]);
  }

  /* La relecture de fond : les invitations, et la partie qui reprend */
  function planifierFond(ms) {
    clearTimeout(minuteurFond);
    minuteurFond = setTimeout(lireFond, ms);
  }
  function lireFond() {
    clearTimeout(minuteurFond);
    if (!O || !O.pret()) { planifierFond(3000); return; }   /* pas encore connecté : rien ne part */
    if (document.hidden) { planifierFond(20000); return; }
    if (F && F.id) { planifierFond(20000); return; }   /* la partie ouverte se relit d'elle-même */
    if (enCours) { planifierFond(5000); return; }
    enCours = true;
    appeler('etat', {}).then(function (r) {
      enCours = false;
      var l = (r && r.parties) || [];
      var gardes = {};
      l.forEach(function (p) { gardes[p.id] = true; parties[p.id] = p; });
      Object.keys(parties).forEach(function (id) { if (!gardes[id] && parties[id].etat !== 'encours') delete parties[id]; });
      if (F && F.ecran === 'coin') dessinerEnCours();
      if (!F) ouvrirCeQuiAttend(l);
      planifierFond(l.some(function (p) { return p.etat === 'invite' || p.etat === 'encours'; }) ? 8000 : 20000);
    }).catch(function () { enCours = false; planifierFond(30000); });
  }
  /* Une invitation pour moi, ou une partie qui a commencé : on l'ouvre */
  function ouvrirCeQuiAttend(l) {
    var p = null;
    for (var i = 0; i < l.length && !p; i++) {
      var x = l[i];
      var moi = joueur(x, x.moi);
      if (!moi) continue;
      if (x.etat === 'invite' && moi.rep === '?' && !plusTard[x.id]) p = x;
      else if (x.etat === 'encours' && moi.rep === 'oui' && !reduits[x.id]) p = x;
      else if (x.etat === 'invite' && x.par && x.par.cle === x.moi && O.mode === 'equipe' && !reduits[x.id] && !vus[x.id] && !plusTard[x.id]) { /* il attend : on ne rouvre pas tout seul */ }
    }
    if (p) ouvrirPartie(p.id);
  }

  /* ============================================================
     ☕ LE COIN CAFÉ (l'équipe)
     ============================================================ */
  var modeDefi = 'equipe';
  function ouvrirCoin() {
    if (!O || O.mode !== 'equipe') return;
    var f = fenetre('coin', '☕ Le coin café', 560);
    var mode = el('div', 'cfMode');
    mode.setAttribute('role', 'tablist');
    [['equipe', '👥 Défier l’équipe'], ['eleve', '🎓 Défier un élève']].forEach(function (m) {
      var b = el('button', modeDefi === m[0] ? 'on' : '', esc(m[1]));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { modeDefi = m[0]; ouvrirCoin(); });
      mode.appendChild(b);
    });
    f.corps.appendChild(mode);
    f.corps.appendChild(lab('Les jeux'));
    var g = el('div', 'cfGrille');
    ORDRE.forEach(function (k) {
      var J = JEUX[k];
      if (modeDefi === 'eleve' && !J.eleve) return;
      var b = el('button', 'cfJeu', '<span class="e">' + J.e + '</span>' + esc(J.nom) + '<small>' + esc(modeDefi === 'eleve' && J.max > 2 ? 'en duel avec l’élève' : J.s) + '</small>');
      b.type = 'button';
      b.addEventListener('click', function () { preparerDefi(k); });
      g.appendChild(b);
    });
    f.corps.appendChild(g);
    var ec = el('div', '');
    ec.id = 'cfEnCours';
    f.corps.appendChild(ec);
    dessinerEnCours();
    var deux = el('div', 'cfDeux');
    var bp = el('button', '', '🏆 Palmarès');
    bp.type = 'button';
    bp.addEventListener('click', ouvrirPalmares);
    deux.appendChild(bp);
    if (O.admin && O.admin()) {
      var bt = el('button', 'adm', '🏟️ Lancer un tournoi<small>administrateurs</small>');
      bt.type = 'button';
      bt.addEventListener('click', preparerTournoi);
      deux.appendChild(bt);
    }
    f.corps.appendChild(deux);
    f.bas.appendChild(bouton('Fermer', false, function () { fermer(); }));
    lireFond();
  }
  function dessinerEnCours() {
    var z = document.getElementById('cfEnCours');
    if (!z) return;
    var l = Object.keys(parties).map(function (k) { return parties[k]; })
      .filter(function (p) { return p.etat === 'invite' || p.etat === 'encours'; })
      .sort(function (a, b) { return b.cree - a.cree; });
    z.innerHTML = '';
    if (!l.length) return;
    z.appendChild(lab('En cours'));
    l.forEach(function (p) {
      var J = JEUX[p.jeu] || { nom: p.jeu, ic: '🎲' };
      var moi = joueur(p, p.moi) || {};
      var ad = autres(p).concat(p.joueurs.filter(function (j) { return j.rep === '?' && j.cle !== p.moi; }));
      var avec = ad.map(function (j) { return prenom(j.nom); }).filter(function (x, i, t) { return t.indexOf(x) === i; }).join(', ');
      var titre, sous, go;
      if (p.etat === 'invite' && moi.rep === '?') {
        titre = p.tournoi ? '🏟️ ' + (p.tournoi.nom || 'Tournoi') + ' : ton match ' + J.au : prenom(p.par && p.par.nom) + (J.max > 2 ? ' t’invite ' : ' te défie ') + J.au;
        sous = libelleReglages(p); go = 'J’y vais';
      } else if (p.etat === 'invite') {
        titre = J.nom + ' avec ' + avec; sous = 'en attente des réponses'; go = 'Voir';
      } else {
        titre = J.nom + ' avec ' + avec; sous = 'en cours · manche ' + ((p.s && p.s.manche) || 1); go = 'Reprendre';
      }
      var ligne = el('div', 'cfLigne', '<span style="font-size:20px">' + J.ic + '</span><div>' + esc(titre) + '<small>' + esc(sous) + '</small></div>');
      var b = el('button', 'go', esc(go));
      b.type = 'button';
      b.addEventListener('click', function () { delete reduits[p.id]; delete plusTard[p.id]; ouvrirPartie(p.id); });
      ligne.appendChild(b);
      z.appendChild(ligne);
    });
  }
  function libelleReglages(p) {
    var J = JEUX[p.jeu] || {};
    var l = [];
    if (J.manches && Number(p.reglages.manches) > 1) l.push('au meilleur de ' + p.reglages.manches);
    if (J.temps) l.push(Number(p.reglages.temps) ? (Number(p.reglages.temps) >= 60 ? '1 min' : p.reglages.temps + ' s') + ' par coup' : 'sans limite');
    if (p.reglages.gage) l.push('gage');
    return l.join(' · ') || J.s;
  }

  /* ---------- le défi : qui, combien de manches, le temps, le gage ---------- */
  function preparerDefi(jeu, depuis) {
    var J = JEUX[jeu];
    choixDefi = depuis || { jeu: jeu, joueurs: [], eleve: '', manches: 3, temps: 15, gage: J.max > 2 && jeu === 'course' ? 'Le dernier paie les croissants 🥐' : (jeu === 'paille' ? 'Va chercher les cafés ☕' : ''), voiture: 'bleue', cherche: '' };
    choixDefi.mode = depuis ? depuis.mode : modeDefi;
    dessinerDefi();
  }
  function dessinerDefi() {
    var c = choixDefi, J = JEUX[c.jeu];
    var f = fenetre('defi', J.ic + ' ' + J.nom + (J.max > 2 ? '' : ' — un duel'), J.max > 2 ? 560 : 480);
    var moi = O.moi();
    if (c.mode === 'eleve') {
      f.corps.appendChild(lab('L’élève que tu défies'));
      var champ = el('input', 'cfChamp');
      champ.type = 'search';
      champ.placeholder = 'Chercher un élève';
      champ.value = c.cherche || '';
      f.corps.appendChild(champ);
      var liste = el('div', 'cfQui');
      liste.style.marginTop = '8px';
      f.corps.appendChild(liste);
      var dessinerEleves = function () {
        liste.innerHTML = '';
        var q = String(champ.value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        var tous = (O.eleves ? O.eleves() : []) || [];
        var l = tous.filter(function (n) { return !q || String(n).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(q) !== -1; });
        if (c.eleve && l.indexOf(c.eleve) === -1) l.unshift(c.eleve);
        l.slice(0, q ? 12 : 6).forEach(function (n) {
          var b = el('button', 'cfP' + (c.eleve === n ? ' on' : ''), '<span class="cfAv">' + esc(initiale(n)) + '</span><div>' + esc(n) + '</div>');
          b.type = 'button';
          b.addEventListener('click', function () { c.eleve = (c.eleve === n ? '' : n); dessinerEleves(); majLancer(); });
          liste.appendChild(b);
        });
        if (!l.length) liste.appendChild(el('div', 'cfAide', 'Aucun élève ne correspond.'));
      };
      champ.addEventListener('input', function () { c.cherche = champ.value; dessinerEleves(); });
      dessinerEleves();
      f.corps.appendChild(el('div', 'cfAide', 'Le défi s’ouvre dans son App. Rien ne reste dans son dossier ni dans le palmarès.'));
    } else {
      f.corps.appendChild(lab(J.max > 2 ? 'Les joueurs (2 à ' + J.max + ')' : 'Qui tu défies'));
      var comptes = (O.comptes ? O.comptes() : []).filter(function (x) { return x.nom && x.nom !== moi.nom; });
      var q2 = el('div', J.max > 2 ? 'cfChips' : 'cfQui');
      comptes.forEach(function (x) {
        var on = c.joueurs.indexOf(x.nom) !== -1;
        var b;
        if (J.max > 2) {
          b = el('button', on ? 'on' : '', (on ? '✓ ' : '') + esc(prenom(x.nom)));
        } else {
          b = el('button', 'cfP' + (on ? ' on' : ''), '<span class="cfAv">' + esc(initiale(x.nom)) + '</span><div>' + esc(x.nom) + '<small>' + esc(x.role === 'admin' ? 'Administrateur' : x.role === 'bureau' ? 'Bureau' : 'Moniteur') + '</small></div>');
        }
        b.type = 'button';
        b.addEventListener('click', function () {
          var i = c.joueurs.indexOf(x.nom);
          if (J.max <= 2) c.joueurs = (i === -1 ? [x.nom] : []);
          else if (i === -1) { if (c.joueurs.length + 1 >= J.max) { toast(J.nom + ' : ' + J.max + ' joueurs au plus.'); return; } c.joueurs.push(x.nom); }
          else c.joueurs.splice(i, 1);
          dessinerDefi();
        });
        q2.appendChild(b);
      });
      f.corps.appendChild(q2);
      if (!comptes.length) f.corps.appendChild(el('div', 'cfAide', 'Personne d’autre dans l’appli pour le moment.'));
      if (J.max > 2) f.corps.appendChild(el('div', 'cfAide', (c.joueurs.length + 1) + ' joueur' + (c.joueurs.length ? 's' : '') + (c.jeu === 'course' ? ' : ' + (c.joueurs.length + 1) + ' voitures sur la piste.' : '.')));
    }
    if (c.jeu === 'course') {
      f.corps.appendChild(lab('Ta voiture (ta mise)'));
      var vz = el('div', 'cfVoitures');
      NOMS_V.slice(0, Math.max(2, (c.mode === 'eleve' ? 2 : c.joueurs.length + 1))).forEach(function (v, i) {
        var b = el('button', 'cfV' + (c.voiture === v ? ' on' : ''), voiture(v, String(i + 1)) + '<div>La ' + esc(v) + '<small>' + (c.voiture === v ? 'à toi' : 'libre') + '</small></div>');
        b.type = 'button';
        b.addEventListener('click', function () { c.voiture = v; dessinerDefi(); });
        vz.appendChild(b);
      });
      f.corps.appendChild(vz);
    }
    if (J.manches) {
      f.corps.appendChild(lab(c.jeu === 'course' ? 'En combien de courses' : 'En combien de manches'));
      f.corps.appendChild(chips([[1, '1 seule'], [3, 'Au meilleur de 3'], [5, 'Au meilleur de 5'], [7, 'Au meilleur de 7']], c.manches, function (v) { c.manches = v; dessinerDefi(); }));
      if (c.manches > 1) f.corps.appendChild(el('div', 'cfAide', 'Au meilleur de ' + c.manches + ' : le premier à ' + (Math.floor(c.manches / 2) + 1) + ' ' + (c.jeu === 'course' ? 'courses' : 'manches') + ' gagne.' + (c.jeu === 'course' ? '' : ' Une égalité se rejoue.')));
    }
    if (J.temps) {
      f.corps.appendChild(lab('Temps pour jouer chaque coup'));
      f.corps.appendChild(chips(TEMPS, c.temps, function (v) { c.temps = v; dessinerDefi(); }));
      f.corps.appendChild(el('div', 'cfAide', 'Le temps écoulé, le coup part au hasard.'));
    }
    f.corps.appendChild(lab('Le gage (si tu veux)'));
    var gage = el('input', 'cfChamp');
    gage.value = c.gage || '';
    gage.maxLength = 120;
    gage.placeholder = 'Le perdant paie les croissants 🥐';
    gage.addEventListener('input', function () { c.gage = gage.value; });
    f.corps.appendChild(gage);
    f.bas.appendChild(bouton('Retour', false, function () { modeDefi = c.mode; ouvrirCoin(); }));
    var go = bouton(c.jeu === 'course' ? '🏁 Lancer la course' : (J.max > 2 ? J.ic + ' Lancer' : '⚔️ Lancer le duel'), true, lancer);
    go.id = 'cfLancer';
    f.bas.appendChild(go);
    var majLancer = function () { go.disabled = c.mode === 'eleve' ? !c.eleve : c.joueurs.length < 1; };
    majLancer();
  }
  function lancer() {
    var c = choixDefi;
    var b = document.getElementById('cfLancer');
    if (b) b.disabled = true;
    appeler('lancer', { jeu: c.jeu, joueurs: c.mode === 'eleve' ? [] : c.joueurs, eleve: c.mode === 'eleve' ? c.eleve : '', manches: c.manches, temps: c.temps, gage: c.gage, voiture: c.voiture })
      .then(function (r) {
        if (r && r.partie) { parties[r.partie.id] = r.partie; ouvrirPartie(r.partie.id); }
      }).catch(function (e) { if (b) b.disabled = false; toast('⚠️ ' + (e.message || e)); });
  }

  /* ============================================================
     UNE PARTIE : l'invitation, l'attente, le jeu, la fin
     ============================================================ */
  function ouvrirPartie(id) {
    var p = parties[id];
    if (!p) return;
    var f = fenetre('jeu', '', 480);
    f.id = id;
    montrerPartie(p);
    relirePartie();
  }
  function relirePartie() {
    clearTimeout(minuteurPartie);
    if (!F || !F.id) return;
    var id = F.id;
    var p = parties[id];
    var vite = p && p.etat === 'encours' && p.s && (p.s.phase === 'feu' || p.s.phase === 'course' || p.s.phase === 'creneau');
    minuteurPartie = setTimeout(function () {
      if (!F || F.id !== id) return;
      appeler('etat', { id: id }).then(function (r) {
        var l = (r && r.parties) || [];
        if (l.length) recevoir(l);
        else if (F && F.id === id) { fenetre('jeu', '☕ Le coin café', 420); F.corps.appendChild(el('div', 'cfEtat', 'Cette partie est terminée.')); F.bas.appendChild(bouton('Fermer', false, function () { fermer(); })); return; }
        var q = parties[id];
        if (q && (q.etat === 'invite' || q.etat === 'encours')) relirePartie();
      }).catch(function () { relirePartie(); });
    }, document.hidden ? 4000 : (vite ? 700 : 1100));
  }
  function signatureDe(p) {
    var s = p.s || {};
    return [p.etat, p.v === undefined ? '' : '', s.manche, s.phase, JSON.stringify(s.coups || ''), JSON.stringify(s.reflexes || ''),
      JSON.stringify(s.ecarts || ''), JSON.stringify(s.props || ''), s.trait || '', s.grille || '', s.choisit || '',
      JSON.stringify(s.scores || ''), p.joueurs.map(function (j) { return j.rep + j.voiture; }).join(','), s.depart || '', s.vert || ''].join('|');
  }
  function montrerPartie(p) {
    if (!F) return;
    var sig = signatureDe(p);
    if (sig === signature && F.id === p.id) return;
    var J = JEUX[p.jeu] || { nom: p.jeu, ic: '🎲' };
    var moi = joueur(p, p.moi) || {};
    /* garder ce qu'il est en train de taper */
    var tape = F.corps.querySelector('.cfNb input');
    var valeur = tape ? tape.value : '';
    signature = sig;
    F.anim = null;
    F.ecran = p.etat === 'invite' && moi.rep === '?' ? 'invite' : (p.etat === 'invite' ? 'attente' : 'jeu');
    F.corps.innerHTML = '';
    F.bas.innerHTML = '';
    F.boite.style.maxWidth = 'min(' + (p.jeu === 'course' ? 560 : 480) + 'px, 94vw)';
    var adv = autres(p);
    var titreDuel = adv.length === 1 && actifs(p).length === 2 ? '⚔️ ' + prenom(moi.nom) + ' contre ' + prenom(adv[0].nom) : J.ic + ' ' + J.nom;
    if (p.tournoi && p.tournoi.nom) titreDuel = '🏟️ ' + p.tournoi.nom;
    if (p.etat === 'invite' && moi.rep === '?') { F.titre.textContent = p.tournoi ? '🏟️ ' + (p.tournoi.nom || 'Tournoi') : (J.max > 2 ? J.ic + ' ' + J.nom : '⚔️ Un duel'); dessinerInvitation(p); return; }
    if (p.etat === 'invite') { F.titre.textContent = J.ic + ' ' + J.nom; dessinerAttente(p); return; }
    if (p.etat === 'fini' || p.etat === 'annule' || p.etat === 'expire') { F.titre.textContent = titreDuel; dessinerFin(p); return; }
    F.titre.textContent = titreDuel;
    var D = DESSINS[p.jeu];
    if (D) D(p, F.corps);
    if (valeur) { var t2 = F.corps.querySelector('.cfNb input'); if (t2 && !t2.disabled) t2.value = valeur; }
    if (p.reglages.gage && p.jeu !== 'paille') F.corps.appendChild(el('div', 'cfGage', '🎲 Gage : ' + esc(p.reglages.gage)));
    if (moi.rep === 'oui' && p.jeu !== 'paille') {
      F.bas.appendChild(bouton('Abandonner', false, function (ev) { abandonner(p, ev.currentTarget); }));
      if (O.mode === 'equipe') F.bas.appendChild(bouton('Mettre de côté', false, function () { reduits[p.id] = true; fermer(); toast('☕ La partie continue : « café » dans la loupe pour la reprendre.'); }));
    } else if (p.jeu !== 'paille') {
      F.bas.appendChild(bouton('Fermer', false, function () { fermer(); }));
    }
    animer();
  }
  function abandonner(p, b) {
    var faire = function () { agir(p.id, 'abandon').catch(function () {}); };
    if (O.confirmer) { O.confirmer('Abandonner la partie ? ' + (actifs(p).length === 2 ? 'L’autre gagne.' : 'Les autres continuent sans toi.'), 'Abandonner').then(function (ok) { if (ok) faire(); }); return; }
    /* sans fenêtre de confirmation (l'espace élève) : un deuxième appui */
    if (b && b.getAttribute('data-sur')) { faire(); return; }
    if (b) {
      b.setAttribute('data-sur', '1');
      b.textContent = 'Vraiment abandonner ?';
      setTimeout(function () { b.removeAttribute('data-sur'); b.textContent = 'Abandonner'; }, 3000);
    }
  }

  /* ---------- l'invitation ---------- */
  function dessinerInvitation(p) {
    var J = JEUX[p.jeu];
    var c = F.corps;
    var par = prenom(p.par && p.par.nom);
    var html = '<div class="cfInv"><div class="gros">' + J.e + '</div><b style="font-size:17px">' +
      (p.tournoi ? 'Ton match ' + esc(J.au) : (J.max > 2 ? esc(par) + ' t’invite ' + esc(J.au) : esc(par) + ' te défie ' + esc(J.au))) + ' !</b>' +
      '<div><span class="regle">';
    if (J.manches && Number(p.reglages.manches) > 1) html += '<span>🎯 Au meilleur de ' + p.reglages.manches + (p.jeu === 'course' ? ' courses' : ' manches') + '</span>';
    if (J.temps) html += '<span>⏱️ ' + (Number(p.reglages.temps) ? (Number(p.reglages.temps) >= 60 ? '1 min' : p.reglages.temps + ' s') + ' par coup' : 'Sans limite de temps') + '</span>';
    var avec = p.joueurs.filter(function (j) { return j.cle !== p.moi && j.rep !== 'non'; }).map(function (j) { return prenom(j.nom); });
    if (avec.length > 1 || p.tournoi) html += '<span>👥 Avec ' + esc(avec.join(', ')) + '</span>';
    if (p.reglages.gage) html += '<span>🎲 ' + esc(p.reglages.gage) + '</span>';
    html += '</span></div></div>';
    c.innerHTML = html;
    var voitureChoisie = '';
    if (p.jeu === 'course') {
      c.appendChild(lab('Ta voiture (ta mise)'));
      var vz = el('div', 'cfVoitures');
      var n = p.joueurs.filter(function (j) { return j.rep !== 'non'; }).length;
      var libres = NOMS_V.slice(0, Math.max(2, n)).filter(function () { return true; });
      libres.forEach(function (v, i) {
        var prise = p.joueurs.filter(function (j) { return j.cle !== p.moi && j.voiture === v; })[0];
        var b = el('button', 'cfV', voiture(v, String(i + 1)) + '<div>La ' + esc(v) + '<small>' + (prise ? esc(prenom(prise.nom)) + ' l’a prise' : 'libre') + '</small></div>');
        b.type = 'button';
        b.disabled = !!prise;
        b.addEventListener('click', function () {
          voitureChoisie = v;
          Array.prototype.forEach.call(vz.children, function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          go.disabled = false;
        });
        vz.appendChild(b);
      });
      c.appendChild(vz);
    }
    F.bas.appendChild(bouton(p.tournoi ? 'Plus tard' : 'Pas maintenant', false, function () {
      if (p.tournoi) { plusTard[p.id] = true; fermer(); return; }
      plusTard[p.id] = true;
      agir(p.id, 'repondre', { oui: false }).then(function () { fermer(); }).catch(function () { fermer(); });
    }));
    var go = bouton(J.ic + ' J’accepte', true, function () {
      go.disabled = true;
      agir(p.id, 'repondre', { oui: true, voiture: voitureChoisie }).catch(function () { go.disabled = false; });
    });
    if (p.jeu === 'course') go.disabled = true;
    F.bas.appendChild(go);
    if (p.tournoi) {
      var forfait = el('div', 'cfAide', '<a href="#" style="color:var(--muted)">Déclarer forfait</a> (l’autre passe au tour suivant)');
      forfait.style.textAlign = 'center';
      forfait.querySelector('a').addEventListener('click', function (e) {
        e.preventDefault();
        agir(p.id, 'repondre', { oui: false }).catch(function () {});
      });
      c.appendChild(forfait);
    }
    vibrer(30);
  }

  /* ---------- celui qui a lancé attend les réponses ---------- */
  function dessinerAttente(p) {
    var c = F.corps;
    c.appendChild(lab('Les réponses'));
    var q = el('div', 'cfQui');
    p.joueurs.forEach(function (j) {
      var etat = j.rep === 'oui' ? '✅ prêt' + (j.voiture ? ' · la ' + j.voiture : '') : j.rep === 'non' ? '✕ pas maintenant' : '⏳ attend…';
      q.appendChild(el('div', 'cfP', '<span class="cfAv">' + esc(initiale(j.nom)) + '</span><div>' + esc(j.nom) + '<small>' + esc(etat) + '</small></div>'));
    });
    c.appendChild(q);
    var J = JEUX[p.jeu];
    c.appendChild(el('div', 'cfAide', p.joueurs.some(function (j) { return j.eleve; })
      ? 'Le défi attend qu’il ouvre son App (10 minutes au plus).'
      : 'Ils ont reçu l’invitation. Sans réponse, elle s’efface au bout de 10 minutes.'));
    var estPar = p.par && p.par.cle === p.moi;
    if (estPar) F.bas.appendChild(bouton('Annuler la partie', false, function () { agir(p.id, 'abandon').catch(function () {}); }));
    else F.bas.appendChild(bouton('Fermer', false, function () { fermer(); }));
    if (estPar && J.max > 2 && actifs(p).length >= 2) {
      F.bas.appendChild(bouton('Commencer à ' + actifs(p).length, true, function () { agir(p.id, 'commencer').catch(function () {}); }));
    }
  }

  /* ---------- la fin ---------- */
  function dessinerFin(p) {
    var c = F.corps;
    var J = JEUX[p.jeu];
    var dejaVu = vus[p.id];
    vus[p.id] = true;
    if (p.etat !== 'fini') {
      c.appendChild(el('div', 'cfBravo', p.etat === 'expire' ? '⏳' : '✕'));
      c.appendChild(el('div', 'cfVerdict', esc(p.raison || 'La partie est annulée.')));
      F.bas.appendChild(bouton('Fermer', false, function () { fermer(); }));
      return;
    }
    var gagne = p.gagnant && p.gagnant === p.moi;
    if (p.jeu === 'paille') {
      c.appendChild(el('div', 'cfBravo', '🥢'));
      c.appendChild(el('div', 'cfVerdict', esc(p.perdant === p.moi ? 'Tu as tiré la courte paille' : nomDe(p, p.perdant) + ' a tiré la courte paille') +
        (p.reglages.gage ? '<small>' + esc(p.reglages.gage) + '</small>' : '')));
    } else {
      c.appendChild(el('div', 'cfBravo', gagne ? '🏆' : (p.gagnant ? '🏁' : '🤝')));
      var sc = p.s && p.s.scores ? p.s.scores : {};
      var txt = p.gagnant ? (gagne ? 'Tu gagnes' : nomDe(p, p.gagnant) + ' gagne') : 'Personne ne gagne';
      var a = actifs(p).concat(p.joueurs.filter(function (j) { return j.rep === 'parti'; }));
      if (a.length === 2 && p.gagnant) {
        var autre = a[0].cle === p.gagnant ? a[1] : a[0];
        txt += ' ' + (sc[p.gagnant] || 0) + ' – ' + (sc[autre.cle] || 0);
      }
      var sous = p.raison ? p.raison : '';
      if (p.reglages.gage && p.perdant) sous = (sous ? sous + ' · ' : '') + '🎲 ' + (p.perdant === p.moi ? 'Pour toi' : 'Pour ' + nomDe(p, p.perdant)) + ' : ' + p.reglages.gage;
      c.appendChild(el('div', 'cfVerdict', esc(txt) + (sous ? '<small>' + esc(sous) + '</small>' : '')));
      if (p.s && p.s.histo && p.s.histo.length) {
        var pa = el('div', 'cfPast');
        pa.style.marginTop = '12px';
        p.s.histo.forEach(function (h) { if (h.g) pa.appendChild(el('i', h.g === p.moi ? 'g' : (a.length === 2 ? 'p' : 'n'), esc(initiale(nomDe(p, h.g))))); });
        c.appendChild(pa);
      }
      if (a.length > 2) c.appendChild(tableauScores(p));
    }
    if (p.tournoi) c.appendChild(el('div', 'cfAide', '🏟️ ' + esc(p.tournoi.nom || 'Tournoi') + ' : ' + (p.gagnant ? esc(nomDe(p, p.gagnant)) + ' passe au tour suivant.' : '')));
    if (!p.eleve && O.mode === 'equipe') {
      var palm = el('div', '');
      c.appendChild(palm);
      appeler('palmares', {}).then(function (r) {
        var l = (r && r.palmares && r.palmares[p.jeu]) || [];
        if (!l.length) return;
        palm.appendChild(lab(p.jeu === 'paille' ? 'Les courtes pailles de l’équipe' : 'Le palmarès de l’équipe · ' + J.nom));
        palm.appendChild(tablePalmares(p.jeu, l.slice(0, 5)));
      }).catch(function () {});
    }
    F.bas.appendChild(bouton('Fermer', false, function () { fermer(); }));
    if (O.mode === 'equipe' && !p.tournoi && (p.par && p.par.cle === p.moi || joueur(p, p.moi))) {
      F.bas.appendChild(bouton('🔁 Revanche', true, function () { revanche(p); }));
    }
    if (!dejaVu && (gagne || (p.jeu === 'paille' && p.perdant !== p.moi))) cotillons();
  }
  function revanche(p) {
    var autresNoms = p.joueurs.filter(function (j) { return j.cle !== p.moi && j.rep !== 'non' && !j.eleve; }).map(function (j) { return j.nom; });
    var eleve = p.joueurs.filter(function (j) { return j.eleve; }).map(function (j) { return j.nom; })[0] || '';
    var moi = joueur(p, p.moi) || {};
    appeler('lancer', { jeu: p.jeu, joueurs: eleve ? [] : autresNoms, eleve: eleve, manches: p.reglages.manches, temps: p.reglages.temps, gage: p.reglages.gage, voiture: moi.voiture || 'bleue' })
      .then(function (r) { if (r && r.partie) { parties[r.partie.id] = r.partie; ouvrirPartie(r.partie.id); } })
      .catch(function (e) { toast('⚠️ ' + (e.message || e)); });
  }
  function cotillons() {
    try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
    var z = el('div', 'cfCotillons');
    var cols = ['#B6FF0E', '#FFB020', '#FF5C33', '#4FA3FF', '#C77DFF'];
    var h = '';
    for (var i = 0; i < 70; i++) {
      h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + cols[i % 5] + ';animation-delay:' + (Math.random() * 0.9).toFixed(2) + 's;transform:rotate(' + Math.round(Math.random() * 180) + 'deg)"></i>';
    }
    z.innerHTML = h;
    document.body.appendChild(z);
    setTimeout(function () { if (z.parentNode) z.parentNode.removeChild(z); }, 4000);
  }

  /* ============================================================
     LES JEUX : ce qu'on voit pendant la partie
     ============================================================ */
  function entete(p, c) {
    var J = JEUX[p.jeu];
    var s = p.s || {};
    var m = Number(p.reglages.manches || 1);
    if (J.manches) c.appendChild(el('div', 'cfManche', (p.jeu === 'course' ? 'Course ' : 'Manche ') + (s.manche || 1) + (m > 1 ? ' · au meilleur de ' + m : '')));
    if (J.manches && m > 1) {
      var pa = el('div', 'cfPast');
      var duel = actifs(p).length === 2;
      var n = 0;
      (s.histo || []).forEach(function (h) { if (h.g) { n++; pa.appendChild(el('i', h.g === p.moi ? 'g' : (duel ? 'p' : 'n'), esc(initiale(nomDe(p, h.g))))); } });
      var reste = Math.max(1, m - n);
      for (var i = 0; i < Math.min(reste, 7 - n); i++) pa.appendChild(el('i', i === 0 && s.phase !== 'revele' ? 'c' : '', String(n + i + 1)));
      c.appendChild(pa);
    }
  }
  /* le score : deux grands noms en duel, des pastilles à plusieurs */
  function score(p, c, etats) {
    var a = actifs(p);
    var s = p.s || {};
    if (a.length === 2) {
      var moi = a[0].cle === p.moi ? a[0] : (a[1].cle === p.moi ? a[1] : a[0]);
      var lui = moi === a[0] ? a[1] : a[0];
      var et = etats || {};
      var bloc = function (j) {
        var t = et[j.cle] || '';
        return '<div class="cfJ"><span class="cfAv">' + esc(initiale(j.nom)) + '</span>' + esc(prenom(j.nom)) + '<small class="' + (/✔/.test(t) ? 'ok' : '') + '">' + esc(t) + '</small></div>';
      };
      c.appendChild(el('div', 'cfScore', bloc(moi) + '<div class="cfPts">' + (s.scores[moi.cle] || 0) + ' – ' + (s.scores[lui.cle] || 0) + '</div>' + bloc(lui)));
    } else {
      c.appendChild(tableauScores(p, etats));
    }
  }
  function tableauScores(p, etats) {
    var s = p.s || {};
    var z = el('div', 'cfTab');
    actifs(p).slice().sort(function (x, y) { return (s.scores[y.cle] || 0) - (s.scores[x.cle] || 0); }).forEach(function (j) {
      var t = etats && etats[j.cle] ? ' · ' + etats[j.cle] : '';
      z.appendChild(el('span', j.cle === p.moi ? 'moi' : '', '<span class="cfAv">' + esc(initiale(j.nom)) + '</span>' + esc(prenom(j.nom)) + ' <b>' + ((s.scores && s.scores[j.cle]) || 0) + '</b>' + esc(t)));
    });
    return z;
  }
  function barreTemps(c, limite, total) {
    if (!limite) return;
    var b = el('div', 'cfTemps', '<i></i>');
    b.setAttribute('data-limite', String(limite));
    b.setAttribute('data-total', String(total));
    c.appendChild(b);
  }
  function etatTexte(c, t) { var e = el('div', 'cfEtat', esc(t)); c.appendChild(e); return e; }
  function verdict(p, c, texte) {
    var s = p.s, d = s.derniere || {};
    var sous = d.egal ? 'Égalité : on rejoue la manche' : (d.g === p.moi ? 'Manche pour toi' : 'Manche pour ' + nomDe(p, d.g));
    if (p.jeu === 'course') sous = d.g === p.moi ? 'Point pour toi' : 'Point pour ' + nomDe(p, d.g);
    if (s.gagnant) sous += ' · fin de la partie…';
    c.appendChild(el('div', 'cfVerdict', esc(texte) + '<small>' + esc(sous) + '</small>'));
  }

  var DESSINS = {
    chifoumi: function (p, c) {
      var s = p.s;
      entete(p, c);
      var a = actifs(p);
      if (s.phase === 'revele') {
        var d = s.derniere.d || {};
        var moi = a[0].cle === p.moi ? a[0] : a[1], lui = moi === a[0] ? a[1] : a[0];
        var cm = d.coups[moi.cle], cl = d.coups[lui.cle];
        var h = d.hasard || [];
        c.appendChild(el('div', 'cfDuel', '<div><div class="m ' + (s.derniere.g === moi.cle ? 'g' : (s.derniere.egal ? '' : 'p')) + '">' + MAINS[cm] + '</div><small>' + esc(prenom(moi.nom)) + (h.indexOf(moi.cle) !== -1 ? ' · au hasard' : '') + '</small></div><div class="vs">contre</div>' +
          '<div><div class="m ' + (s.derniere.g === lui.cle ? 'g' : (s.derniere.egal ? '' : 'p')) + '">' + MAINS[cl] + '</div><small>' + esc(prenom(lui.nom)) + (h.indexOf(lui.cle) !== -1 ? ' · au hasard' : '') + '</small></div>'));
        var phrase = { pc: 'La pierre casse les ciseaux', cf: 'Les ciseaux coupent la feuille', fp: 'La feuille enveloppe la pierre' };
        var gx = s.derniere.g === moi.cle ? cm : cl, px = s.derniere.g === moi.cle ? cl : cm;
        verdict(p, c, s.derniere.egal ? MAINS[cm] + ' contre ' + MAINS[cl] : MAINS[gx] + ' ' + (phrase[gx + px] || ''));
        score(p, c, {});
        return;
      }
      var etats = {};
      a.forEach(function (j) { etats[j.cle] = s.coups[j.cle] ? (j.cle === p.moi ? '✔️ tu as joué' : '✔️ a joué') : (j.cle === p.moi ? 'à toi de jouer' : 'réfléchit…'); });
      score(p, c, etats);
      var mains = el('div', 'cfMains');
      var joue = s.coups[p.moi];
      ['p', 'f', 'c'].forEach(function (k) {
        var b = el('button', joue === k ? 'on' : '', '<span>' + MAINS[k] + '</span>' + NOM_MAIN[k]);
        b.type = 'button';
        b.disabled = !!joue;
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(mains.children, function (x) { x.disabled = true; });
          b.classList.add('on');
          vibrer(10);
          agir(p.id, 'jouer', { coup: k }).catch(function () { signature = ''; montrerPartie(parties[p.id]); });
        });
        mains.appendChild(b);
      });
      c.appendChild(mains);
      barreTemps(c, s.limite, Number(p.reglages.temps) * 1000);
      var lui = autres(p)[0];
      etatTexte(c, joue ? (lui && s.coups[lui.cle] ? 'Les deux ont joué…' : 'On attend ' + (lui ? prenom(lui.nom) : 'l’autre') + '…')
        : (lui && s.coups[lui.cle] ? prenom(lui.nom) + ' a déjà choisi — on ne voit son coup qu’une fois les deux joués' : 'Choisis en secret'));
    },

    pileface: function (p, c) {
      var s = p.s;
      entete(p, c);
      if (s.phase === 'revele') {
        var d = s.derniere.d;
        var piece = el('div', 'cfPiece tourne', d.tombe === 'pile' ? 'PILE' : 'FACE');
        c.appendChild(piece);
        var v = el('div', '');
        c.appendChild(v);
        setTimeout(function () {
          verdict(p, v, (d.tombe === 'pile' ? 'Pile !' : 'Face !') + ' ' + (d.par === p.moi ? 'Tu avais pris ' : nomDe(p, d.par) + ' avait pris ') + d.choix + (d.hasard ? ' (au hasard)' : ''));
          score(p, v, {});
        }, 1700);
        return;
      }
      var etats = {};
      actifs(p).forEach(function (j) { etats[j.cle] = j.cle === s.choisit ? (j.cle === p.moi ? 'à toi de choisir' : 'choisit…') : 'prend l’autre côté'; });
      score(p, c, etats);
      if (s.choisit === p.moi) {
        var ch = el('div', 'cfChoix');
        ['pile', 'face'].forEach(function (k) {
          var b = el('button', '', '🪙 ' + (k === 'pile' ? 'Pile' : 'Face'));
          b.type = 'button';
          b.addEventListener('click', function () {
            Array.prototype.forEach.call(ch.children, function (x) { x.disabled = true; });
            agir(p.id, 'jouer', { coup: k }).catch(function () { signature = ''; montrerPartie(parties[p.id]); });
          });
          ch.appendChild(b);
        });
        c.appendChild(ch);
        barreTemps(c, s.limite, Number(p.reglages.temps) * 1000);
        etatTexte(c, 'Tu choisis ton côté, l’autre prend l’autre. Puis la pièce tourne.');
      } else {
        c.appendChild(el('div', 'cfPiece', '?'));
        barreTemps(c, s.limite, Number(p.reglages.temps) * 1000);
        etatTexte(c, nomDe(p, s.choisit) + ' choisit son côté…');
      }
    },

    course: function (p, c) {
      var s = p.s;
      entete(p, c);
      var a = actifs(p);
      if (s.phase === 'revele') {
        var ordre = s.derniere.d.ordre || [];
        var pod = el('div', 'cfPodium');
        var places = [[1, 52, '🥈'], [0, 76, '🥇'], [2, 36, '🥉']];
        places.forEach(function (x) {
          var cle = ordre[x[0]];
          if (!cle) return;
          var j = joueur(p, cle);
          pod.appendChild(el('div', '', voiture(j.voiture) + esc(prenom(j.nom)) + '<div class="marche" style="height:' + x[1] + 'px">' + x[2] + '</div>'));
        });
        c.appendChild(el('div', 'cfBravo', '🏁'));
        verdict(p, c, 'La ' + (joueur(p, ordre[0]) || {}).voiture + ' gagne la course ' + s.manche + ' !');
        c.appendChild(pod);
        if (ordre.length > 3) c.appendChild(el('div', 'cfAide', ordre.slice(3).map(function (k, i) { return (i + 4) + 'e : ' + nomDe(p, k); }).join(' · ')).cloneNode(true));
        c.appendChild(tableauScores(p));
        return;
      }
      var piste = el('div', 'cfPiste');
      piste.appendChild(el('div', 'cfArrivee'));
      a.forEach(function (j, i) {
        var v = el('div', 'cfVoie', '<span class="nom">' + esc(prenom(j.nom)) + (j.cle === p.moi ? ' (toi)' : '') + '</span>');
        var car = el('div', 'car', voiture(j.voiture, String(NOMS_V.indexOf(j.voiture) + 1)));
        car.setAttribute('data-cle', j.cle);
        v.appendChild(car);
        piste.appendChild(v);
      });
      var dec = el('div', 'cfDecompte', '');
      piste.appendChild(dec);
      c.appendChild(piste);
      var et = etatTexte(c, '🏁 Les voitures avancent toutes seules, au hasard : on regarde et on crie !');
      F.anim = { genre: 'course', p: p, piste: piste, dec: dec, et: et };
      c.appendChild(tableauScores(p));
    },

    feuvert: function (p, c) {
      var s = p.s;
      entete(p, c);
      if (s.phase === 'revele') {
        var r = s.derniere.d.reflexes || {};
        var l = Object.keys(r).sort(function (x, y) { var a = r[x] > 0 ? r[x] : 99999 - r[x], b = r[y] > 0 ? r[y] : 99999 - r[y]; return a - b; });
        verdict(p, c, s.derniere.egal ? 'Personne n’a appuyé à temps' : '🚦 ' + (s.derniere.g === p.moi ? 'Tu es le plus rapide' : nomDe(p, s.derniere.g) + ' est le plus rapide'));
        var t = el('table', 'cfPalm');
        l.forEach(function (k) { var v = r[k]; t.appendChild(el('tr', '', '<td>' + esc(nomDe(p, k)) + '</td><td>' + (v > 0 ? (v / 1000).toFixed(2).replace('.', ',') + ' s' : v === -1 ? 'faux départ' : 'trop tard') + '</td>')); });
        c.appendChild(t);
        score(p, c, {});
        return;
      }
      var feu = el('div', 'cfFeu', '<i></i><i></i><i></i>');
      c.appendChild(feu);
      var deja = s.reflexes && s.reflexes[p.moi];
      var b = el('button', 'cfGros', deja ? (deja === -1 ? 'Faux départ !' : 'Appuyé : ' + (deja / 1000).toFixed(2).replace('.', ',') + ' s') : 'Prêts ?');
      b.type = 'button';
      b.disabled = !!deja;
      c.appendChild(b);
      etatTexte(c, 'Au vert, appuie le plus vite possible. Appuyer avant : faux départ.');
      F.anim = { genre: 'feu', p: p, feu: feu, b: b, vertVu: 0, joue: !!deja };
      var appui = function (ev) {
        if (ev) ev.preventDefault();
        var A = F && F.anim;
        if (!A || A.genre !== 'feu' || A.joue) return;
        A.joue = true;
        b.disabled = true;
        var ms = 0, faux = false;
        if (!A.vertVu) faux = true; else ms = Math.round((window.performance && performance.now ? performance.now() : Date.now()) - A.vertVu);
        b.textContent = faux ? 'Faux départ !' : 'Appuyé : ' + (ms / 1000).toFixed(2).replace('.', ',') + ' s';
        b.classList.remove('vert');
        vibrer(faux ? 60 : 12);
        agir(p.id, 'jouer', faux ? { faux: true } : { ms: ms }).catch(function () {});
      };
      b.addEventListener('pointerdown', appui);
      b.addEventListener('click', appui);
      score(p, c, {});
    },

    paille: function (p, c) {
      var s = p.s;
      c.appendChild(el('div', 'cfAide', esc(p.reglages.gage ? '🥢 ' + p.reglages.gage : '🥢 Qui va chercher les cafés ?')).cloneNode(true));
      c.lastChild.style.textAlign = 'center';
      var z = el('div', 'cfPailles');
      (s.ordreTirage || []).forEach(function (k) {
        var d = el('div', 'cache', '<i style="height:20px"></i>' + esc(nomDe(p, k)));
        d.setAttribute('data-cle', k);
        z.appendChild(d);
      });
      c.appendChild(z);
      var v = el('div', 'cfVerdict', 'On tire…');
      c.appendChild(v);
      F.anim = { genre: 'paille', p: p, z: z, v: v };
    },

    creneau: function (p, c) {
      var s = p.s;
      entete(p, c);
      if (s.phase === 'revele') {
        var r = s.derniere.d.ecarts || {};
        var l = Object.keys(r).sort(function (x, y) { return (r[x] < 0 ? 99999 : r[x]) - (r[y] < 0 ? 99999 : r[y]); });
        verdict(p, c, s.derniere.egal ? 'Ex aequo : on rejoue' : '🅿️ ' + (s.derniere.g === p.moi ? 'Ton créneau est le meilleur' : 'Le meilleur créneau : ' + nomDe(p, s.derniere.g)));
        var t = el('table', 'cfPalm');
        l.forEach(function (k) { var v = r[k]; t.appendChild(el('tr', '', '<td>' + esc(nomDe(p, k)) + '</td><td>' + (v < 0 ? '💥 dans le mur' : 'à ' + v + ' cm du trait') + '</td>')); });
        c.appendChild(t);
        score(p, c, {});
        return;
      }
      var zone = el('div', 'cfCren', '<div class="trottoir"></div><div class="mur"></div><div class="trait" style="left:' + s.cible + '%"></div>');
      var car = el('div', 'car', voiture('bleue'));
      zone.appendChild(car);
      var dec = el('div', 'cfDecompte', '');
      zone.appendChild(dec);
      c.appendChild(zone);
      var deja = s.ecarts && s.ecarts[p.moi];
      var b = el('button', 'cfGros vert', deja !== undefined && deja !== -9 ? (deja < 0 ? '💥 Dans le mur' : 'Arrêtée à ' + deja + ' cm') : '🛑 STOP');
      b.type = 'button';
      b.disabled = deja !== undefined && deja !== -9;
      c.appendChild(b);
      etatTexte(c, 'La voiture recule toute seule. Arrête-la le plus près possible du trait vert.');
      F.anim = { genre: 'creneau', p: p, car: car, dec: dec, b: b, joue: b.disabled, pos: 0 };
      var stop = function (ev) {
        if (ev) ev.preventDefault();
        var A = F && F.anim;
        if (!A || A.genre !== 'creneau' || A.joue || maintenant() < s.depart) return;
        A.joue = true;
        b.disabled = true;
        var pos = A.pos;
        var cm = Math.round(Math.abs(pos - s.cible) * 10);
        b.textContent = 'Arrêtée à ' + cm + ' cm';
        vibrer(12);
        agir(p.id, 'jouer', { pos: pos }).catch(function () {});
      };
      b.addEventListener('pointerdown', stop);
      b.addEventListener('click', stop);
      score(p, c, {});
    },

    morpion: function (p, c) {
      var s = p.s;
      entete(p, c);
      var a = actifs(p);
      var monSym = s.x === p.moi ? '❌' : '⭕';
      var etats = {};
      a.forEach(function (j) { etats[j.cle] = (s.x === j.cle ? '❌' : '⭕') + (s.phase === 'jouer' && s.trait === j.cle ? (j.cle === p.moi ? ' · à toi' : ' · joue…') : ''); });
      var g = s.phase === 'revele' ? (s.derniere.d.grille || s.grille) : s.grille;
      var ligne = s.phase === 'revele' ? (s.derniere.d.ligne || []) : [];
      if (s.phase === 'revele') verdict(p, c, s.derniere.egal ? 'Match nul' : (s.derniere.g === p.moi ? 'Trois ' + monSym + ' en ligne !' : nomDe(p, s.derniere.g) + ' aligne trois ' + (s.x === s.derniere.g ? '❌' : '⭕')));
      score(p, c, s.phase === 'revele' ? {} : etats);
      var gr = el('div', 'cfMorp');
      for (var i = 0; i < 9; i++) {
        (function (i) {
          var v = g.charAt(i);
          var b = el('button', ligne.indexOf(i) !== -1 ? 'l' : '', v === 'X' ? '❌' : v === 'O' ? '⭕' : '');
          b.type = 'button';
          b.setAttribute('aria-label', 'Case ' + (i + 1));
          b.disabled = s.phase !== 'jouer' || s.trait !== p.moi || v !== '.';
          b.addEventListener('click', function () {
            Array.prototype.forEach.call(gr.children, function (x) { x.disabled = true; });
            b.textContent = monSym;
            agir(p.id, 'jouer', { 'case': i }).catch(function () { signature = ''; montrerPartie(parties[p.id]); });
          });
          gr.appendChild(b);
        })(i);
      }
      c.appendChild(gr);
      if (s.phase === 'jouer') {
        barreTemps(c, s.limite, Number(p.reglages.temps) * 1000);
        etatTexte(c, s.trait === p.moi ? 'À toi : tu as les ' + monSym : 'À ' + nomDe(p, s.trait) + ' de jouer…');
      }
    },

    chiffre: function (p, c) {
      var s = p.s;
      entete(p, c);
      if (s.phase === 'revele') {
        var d = s.derniere.d;
        c.appendChild(el('div', 'cfPiece', String(d.secret)));
        verdict(p, c, s.derniere.egal ? 'Ex aequo : on rejoue' : (s.derniere.g === p.moi ? 'Tu es le plus proche' : nomDe(p, s.derniere.g) + ' est le plus proche'));
        var t = el('table', 'cfPalm');
        Object.keys(d.props).sort(function (x, y) { return Math.abs(d.props[x] - d.secret) - Math.abs(d.props[y] - d.secret); })
          .forEach(function (k) { t.appendChild(el('tr', '', '<td>' + esc(nomDe(p, k)) + '</td><td>' + d.props[k] + ' (à ' + Math.abs(d.props[k] - d.secret) + ')</td>')); });
        c.appendChild(t);
        score(p, c, {});
        return;
      }
      var etats = {};
      actifs(p).forEach(function (j) { etats[j.cle] = s.props[j.cle] ? (j.cle === p.moi ? '✔️ ' + s.props[j.cle] : '✔️ a proposé') : (j.cle === p.moi ? 'à toi' : 'réfléchit…'); });
      score(p, c, etats);
      c.appendChild(el('div', 'cfPiece', '?'));
      var mien = s.props[p.moi];
      var nb = el('div', 'cfNb');
      var inp = el('input', '');
      inp.type = 'number'; inp.min = '1'; inp.max = '100'; inp.inputMode = 'numeric';
      inp.placeholder = '1 à 100';
      if (mien) { inp.value = String(mien); inp.disabled = true; }
      var go = bouton('Proposer', true, function () {
        var n = Math.round(Number(inp.value));
        if (!(n >= 1 && n <= 100)) { toast('Un nombre entre 1 et 100.'); return; }
        go.disabled = true; inp.disabled = true;
        agir(p.id, 'jouer', { n: n }).catch(function () { go.disabled = false; inp.disabled = false; });
      });
      go.disabled = !!mien;
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
      nb.appendChild(inp); nb.appendChild(go);
      c.appendChild(nb);
      barreTemps(c, s.limite, Number(p.reglages.temps) * 1000);
      etatTexte(c, 'Un nombre secret entre 1 et 100 : le plus proche prend la manche.');
    }
  };

  /* ---------- ce qui bouge : le temps, la course, le feu, le créneau ---------- */
  function animer() {
    if (rafVivant) return;
    rafVivant = 1;
    var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 33); };
    var pas = function () {
      if (!F || !F.fond || !F.fond.parentNode) { rafVivant = 0; return; }
      var t = maintenant();
      var barres = F.corps.querySelectorAll('[data-limite]');
      for (var i = 0; i < barres.length; i++) {
        var lim = Number(barres[i].getAttribute('data-limite')), tot = Number(barres[i].getAttribute('data-total')) || 15000;
        var f = Math.max(0, Math.min(1, (lim - t) / tot));
        barres[i].firstChild.style.width = (f * 100).toFixed(1) + '%';
      }
      var A = F.anim;
      if (A && A.p && parties[A.p.id] && parties[A.p.id].s) {
        var s = A.p.s;
        if (A.genre === 'course') {
          var avant = s.depart - t;
          A.dec.textContent = avant > 0 ? String(Math.ceil(avant / 1000)) : (avant > -700 ? 'Partez !' : '');
          var largeur = A.piste.clientWidth - 34 - 72;
          var cars = A.piste.querySelectorAll('.car');
          for (var k = 0; k < cars.length; k++) {
            var tr = s.troncons[cars[k].getAttribute('data-cle')] || [];
            var e = t - s.depart, pos = 0;
            if (e > 0 && tr.length) {
              var n = 0; while (n < tr.length && tr[n] < e) n++;
              if (n >= tr.length) pos = 1;
              else { var deb = n ? tr[n - 1] : 0; pos = (n + (e - deb) / Math.max(1, tr[n] - deb)) / tr.length; }
            }
            cars[k].style.transform = 'translateX(' + Math.round(pos * largeur) + 'px)';
          }
          if (t > s.arrivee) A.et.textContent = '🏁 Arrivée ! ' + nomDe(A.p, s.ordre[0]) + ' gagne la course.';
        } else if (A.genre === 'feu') {
          var lamp = A.feu.children;
          if (t < s.depart) { A.b.textContent = A.joue ? A.b.textContent : 'Prêts ?'; }
          else if (t < s.vert) {
            var nr = Math.min(3, 1 + Math.floor((t - s.depart) / 500));
            for (var r = 0; r < 3; r++) lamp[r].className = r < nr ? 'r' : '';
            if (!A.joue) A.b.textContent = 'Attends le vert…';
          } else {
            if (!A.vertVu) { A.vertVu = (window.performance && performance.now ? performance.now() : Date.now()); }
            for (var g = 0; g < 3; g++) lamp[g].className = 'v';
            if (!A.joue) { A.b.textContent = 'APPUIE !'; A.b.classList.add('vert'); }
          }
        } else if (A.genre === 'creneau') {
          var av = s.depart - t;
          A.dec.textContent = av > 0 ? String(Math.ceil(av / 1000)) : '';
          if (!A.joue) {
            A.pos = Math.max(0, Math.min(100, (t - s.depart) / 1000 * s.vitesse));
            if (A.pos >= 100) {
              A.joue = true; A.b.disabled = true; A.b.textContent = '💥 Dans le mur';
              agir(A.p.id, 'jouer', { pos: 100, mur: true }).catch(function () {});
            }
          }
          A.car.style.left = A.pos + '%';
        } else if (A.genre === 'paille') {
          var ordre = s.ordreTirage || [];
          var ecoule = t - (s.jusqua - (1500 + 900 * ordre.length + 2500));
          var vus2 = Math.max(0, Math.floor((ecoule - 1500) / 900) + 1);
          var divs = A.z.children;
          for (var q = 0; q < divs.length; q++) {
            if (q < vus2) {
              var cle = divs[q].getAttribute('data-cle');
              divs[q].className = cle === s.court ? 'court' : '';
              divs[q].firstChild.style.height = s.longueurs[cle] + 'px';
            }
          }
          if (vus2 >= ordre.length) A.v.textContent = s.court === A.p.moi ? 'Tu as tiré la courte paille !' : nomDe(A.p, s.court) + ' a tiré la courte paille';
        }
      }
      raf(pas);
    };
    raf(pas);
  }

  /* ============================================================
     🏆 LE PALMARÈS, un classement par jeu
     ============================================================ */
  var jeuPalmares = 'chifoumi';
  function tablePalmares(jeu, l) {
    var t = el('table', 'cfPalm');
    var med = ['🥇', '🥈', '🥉'];
    l.forEach(function (x, i) {
      var droite = jeu === 'paille' ? (x.defaites + ' courte' + (x.defaites > 1 ? 's' : '') + ' paille' + (x.defaites > 1 ? 's' : '') + ' · ' + (x.victoires + x.defaites) + ' tirage' + (x.victoires + x.defaites > 1 ? 's' : ''))
        : (x.victoires + ' victoire' + (x.victoires > 1 ? 's' : '') + ' · ' + x.defaites + ' défaite' + (x.defaites > 1 ? 's' : ''));
      t.appendChild(el('tr', '', '<td>' + (med[i] || (i + 1) + '.') + ' ' + esc(x.nom) + '</td><td>' + esc(droite) + '</td>'));
    });
    return t;
  }
  function ouvrirPalmares() {
    var f = fenetre('palmares', '🏆 Le palmarès de l’équipe', 560);
    var z = el('div', '', '<div class="cfEtat">Un instant…</div>');
    f.corps.appendChild(z);
    f.bas.appendChild(bouton('Retour', false, ouvrirCoin));
    appeler('palmares', {}).then(function (r) {
      if (!F || F.ecran !== 'palmares') return;
      z.innerHTML = '';
      var pal = (r && r.palmares) || {};
      z.appendChild(chips(ORDRE.map(function (k) { return [k, JEUX[k].ic + ' ' + JEUX[k].nom]; }), jeuPalmares, function (k) { jeuPalmares = k; ouvrirPalmares(); }));
      var l = pal[jeuPalmares] || [];
      if (jeuPalmares === 'paille') l = l.slice().sort(function (a, b) { return a.defaites - b.defaites || b.victoires - a.victoires; });
      z.appendChild(lab(JEUX[jeuPalmares].nom));
      if (l.length) z.appendChild(tablePalmares(jeuPalmares, l));
      else z.appendChild(el('div', 'cfAide', 'Personne n’y a encore joué.'));
      var ts = (r && r.tournois) || [];
      if (ts.length) {
        z.appendChild(lab('Les tournois'));
        ts.forEach(function (t) {
          var g = t.gagnant ? trouverNom(t, t.gagnant) : '';
          var ligne = el('div', 'cfLigne', '<span style="font-size:20px">🏟️</span><div>' + esc(t.nom) + '<small>' + esc(t.etat === 'fini' ? '🏆 ' + g : t.etat === 'annule' ? 'arrêté' : 'en cours') + '</small></div>');
          var b = el('button', 'go', 'Tableau');
          b.type = 'button';
          b.addEventListener('click', function () { ouvrirTournoi(t); });
          ligne.appendChild(b);
          z.appendChild(ligne);
        });
      }
    }).catch(function (e) { z.innerHTML = '<div class="cfEtat">⚠️ ' + esc(e.message || e) + '</div>'; });
  }
  function trouverNom(t, cle) {
    for (var r = 0; r < t.tours.length; r++) for (var i = 0; i < t.tours[r].length; i++) {
      var m = t.tours[r][i];
      if (m.a && m.a.cle === cle) return m.a.nom;
      if (m.b && m.b.cle === cle) return m.b.nom;
    }
    return '';
  }

  /* ============================================================
     🏟️ LE TOURNOI (administrateurs) : les joueurs, un jeu par tour
     ============================================================ */
  var choixTournoi = null;
  function nomDuTour(r, n) {
    var reste = n - r;
    return reste === 1 ? 'Finale' : reste === 2 ? 'Demi-finales' : reste === 3 ? 'Quarts' : reste === 4 ? 'Huitièmes' : 'Tour ' + (r + 1);
  }
  function preparerTournoi() {
    choixTournoi = choixTournoi || { nom: '', joueurs: [], jeux: ['chifoumi'], manches: 3, temps: 15, gage: '' };
    dessinerTournoi();
  }
  function dessinerTournoi() {
    var c = choixTournoi;
    var f = fenetre('tournoi', '🏟️ Lancer un tournoi', 560);
    f.corps.appendChild(lab('Le nom'));
    var nom = el('input', 'cfChamp');
    nom.placeholder = 'Tournoi du vendredi';
    nom.value = c.nom;
    nom.maxLength = 60;
    nom.addEventListener('input', function () { c.nom = nom.value; });
    f.corps.appendChild(nom);
    f.corps.appendChild(lab('Les joueurs (3 à 16)'));
    var comptes = (O.comptes ? O.comptes() : []).filter(function (x) { return x.nom; });
    f.corps.appendChild(chips(comptes.map(function (x) { return [x.nom, (c.joueurs.indexOf(x.nom) !== -1 ? '✓ ' : '') + prenom(x.nom)]; }), '', function (n) {
      var i = c.joueurs.indexOf(n);
      if (i === -1) c.joueurs.push(n); else c.joueurs.splice(i, 1);
      dessinerTournoi();
    }));
    var z = f.corps.lastChild;
    Array.prototype.forEach.call(z.children, function (b, i) { if (c.joueurs.indexOf(comptes[i].nom) !== -1) b.className = 'on'; });
    var taille = 2; while (taille < c.joueurs.length) taille *= 2;
    var tours = c.joueurs.length >= 2 ? Math.round(Math.log(taille) / Math.LN2) : 1;
    f.corps.appendChild(el('div', 'cfAide', c.joueurs.length + ' joueur' + (c.joueurs.length > 1 ? 's' : '') + (c.joueurs.length >= 3 ? ' : ' + tours + ' tour' + (tours > 1 ? 's' : '') + (taille > c.joueurs.length ? ', ' + (taille - c.joueurs.length) + ' exempt' + (taille - c.joueurs.length > 1 ? 's' : '') + ' au premier tour (tirés au hasard)' : '') : '')));
    f.corps.appendChild(lab('Le jeu de chaque tour'));
    for (var r = 0; r < tours; r++) {
      (function (r) {
        if (!c.jeux[r]) c.jeux[r] = c.jeux[r - 1] || 'chifoumi';
        var ligne = el('div', '', '<div class="cfAide" style="margin:6px 0 4px;font-weight:700">' + esc(nomDuTour(r, tours)) + '</div>');
        ligne.appendChild(chips(ORDRE.filter(function (k) { return k !== 'paille'; }).map(function (k) { return [k, JEUX[k].ic + ' ' + JEUX[k].nom]; }), c.jeux[r], function (k) { c.jeux[r] = k; dessinerTournoi(); }));
        f.corps.appendChild(ligne);
      })(r);
    }
    c.jeux.length = Math.max(1, tours);
    f.corps.appendChild(lab('En combien de manches (chaque match)'));
    f.corps.appendChild(chips([[1, '1 seule'], [3, 'Au meilleur de 3'], [5, 'Au meilleur de 5'], [7, 'Au meilleur de 7']], c.manches, function (v) { c.manches = v; dessinerTournoi(); }));
    f.corps.appendChild(lab('Temps pour jouer chaque coup'));
    f.corps.appendChild(chips(TEMPS, c.temps, function (v) { c.temps = v; dessinerTournoi(); }));
    f.corps.appendChild(lab('Le gage (si tu veux)'));
    var gage = el('input', 'cfChamp');
    gage.value = c.gage;
    gage.maxLength = 120;
    gage.placeholder = 'Le perdant de la finale paie le petit-déjeuner';
    gage.addEventListener('input', function () { c.gage = gage.value; });
    f.corps.appendChild(gage);
    f.bas.appendChild(bouton('Retour', false, ouvrirCoin));
    var go = bouton('🏟️ Lancer le tournoi', true, function () {
      go.disabled = true;
      appeler('tournoiLancer', { nom: c.nom, joueurs: c.joueurs, jeux: c.jeux, manches: c.manches, temps: c.temps, gage: c.gage }).then(function (r) {
        choixTournoi = null;
        toast('🏟️ Le tournoi est lancé : les joueurs reçoivent leur match.');
        if (r && r.tournoi) ouvrirTournoi(r.tournoi);
      }).catch(function (e) { go.disabled = false; toast('⚠️ ' + (e.message || e)); });
    });
    go.disabled = c.joueurs.length < 3 || c.joueurs.length > 16;
    f.bas.appendChild(go);
  }
  function ouvrirTournoi(t) {
    var f = fenetre('tableau', '🏟️ ' + t.nom, Math.min(900, 220 + 190 * t.tours.length));
    var J0 = t.jeux.map(function (k) { return (JEUX[k] || {}).ic + ' ' + (JEUX[k] || {}).nom; });
    f.corps.appendChild(el('div', 'cfAide', esc(t.jeux.every(function (k) { return k === t.jeux[0]; }) ? J0[0] : t.jeux.map(function (k, r) { return nomDuTour(r, t.tours.length) + ' : ' + J0[r]; }).join(' · ')) +
      (Number(t.reglages.manches) > 1 ? ' · au meilleur de ' + t.reglages.manches : '') + (t.reglages.gage ? ' · 🎲 ' + esc(t.reglages.gage) : '')));
    var tab = el('div', 'cfTableau');
    tab.style.marginTop = '12px';
    tab.style.gridTemplateColumns = 'repeat(' + t.tours.length + ', minmax(130px,1fr)) 50px';
    t.tours.forEach(function (tour, r) {
      var col = el('div', '', '<div class="cfTTete">' + esc(nomDuTour(r, t.tours.length)) + '</div>');
      var cc = el('div', 'cfTCol');
      tour.forEach(function (m) {
        var ligne = function (x) {
          if (!x) return '<div class="att">' + (r === 0 ? 'exempt' : '…') + '<span></span></div>';
          return '<div class="' + (m.gagnant === x.cle ? 'g' : '') + '">' + esc(prenom(x.nom)) + '<span>' + (m.gagnant === x.cle ? '✓' : '') + '</span></div>';
        };
        cc.appendChild(el('div', 'cfMatch', ligne(m.a) + ligne(m.b)));
      });
      col.appendChild(cc);
      tab.appendChild(col);
    });
    tab.appendChild(el('div', '', '<div style="text-align:center;font-size:34px">🏆</div>' + (t.gagnant ? '<div style="text-align:center;font-weight:800;font-size:13px">' + esc(prenom(trouverNom(t, t.gagnant))) + '</div>' : '')));
    f.corps.appendChild(tab);
    f.corps.appendChild(el('div', 'cfAide', t.etat === 'encours' ? 'Chaque match se joue quand les deux sont là : ils reçoivent l’invitation comme pour un duel. Refuser son match, c’est déclarer forfait.' : (t.etat === 'annule' ? 'Ce tournoi a été arrêté.' : '')));
    f.bas.appendChild(bouton('Retour', false, ouvrirPalmares));
    if (t.etat === 'encours' && O.admin && O.admin()) {
      f.bas.appendChild(bouton('Arrêter le tournoi', false, function () {
        var faire = function () { appeler('tournoiArreter', { id: t.id }).then(function () { toast('Le tournoi est arrêté.'); ouvrirPalmares(); }).catch(function (e) { toast('⚠️ ' + (e.message || e)); }); };
        if (O.confirmer) O.confirmer('Arrêter « ' + t.nom + ' » ? Les matchs en cours s’arrêtent.', 'Arrêter le tournoi').then(function (ok) { if (ok) faire(); }); else faire();
      }, true));
    }
  }

  /* ============================================================
     LA PORTE CACHÉE : 2 secondes sur un élément (le logo « EC »)
     ============================================================ */
  function porteCachee(cible, ouvrir) {
    if (!cible || cible.__cafe) return;
    cible.__cafe = true;
    var t = null, anneau = null, x0 = 0, y0 = 0, ouvert = 0;
    var annuler = function () { clearTimeout(t); t = null; if (anneau && anneau.parentNode) anneau.parentNode.removeChild(anneau); anneau = null; };
    cible.addEventListener('pointerdown', function (ev) {
      if (ev.button !== undefined && ev.button !== 0) return;
      annuler();
      x0 = ev.clientX; y0 = ev.clientY;
      var r = cible.getBoundingClientRect();
      anneau = el('div', 'cfAnneau', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#B6FF0E" stroke-width="7" stroke-linecap="round" stroke-dasharray="289" stroke-dashoffset="289"><animate attributeName="stroke-dashoffset" from="289" to="0" dur="2s" fill="freeze"/></circle></svg>');
      var m = Math.max(r.width, r.height) + 22;
      anneau.style.left = (r.left + r.width / 2 - m / 2) + 'px';
      anneau.style.top = (r.top + r.height / 2 - m / 2) + 'px';
      anneau.style.width = m + 'px';
      anneau.style.height = m + 'px';
      setTimeout(function () { if (anneau) document.body.appendChild(anneau); }, 250);
      t = setTimeout(function () { annuler(); ouvert = Date.now(); vibrer(25); ouvrir(); }, 2000);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { cible.addEventListener(n, annuler); });
    cible.addEventListener('pointermove', function (ev) { if (t && Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 12) annuler(); });
    cible.addEventListener('contextmenu', function (ev) { if (t || Date.now() - ouvert < 800) ev.preventDefault(); });
    cible.addEventListener('click', function (ev) { if (Date.now() - ouvert < 800) { ev.preventDefault(); ev.stopPropagation(); } }, true);
  }

  /* ============================================================
     LE BRANCHEMENT
     ============================================================ */
  window.CafeEC = {
    JEUX: JEUX,
    brancher: function (o) {
      O = o;
      poserLeStyle();
      planifierFond(4000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) planifierFond(600); });
    },
    ouvrir: function () { ouvrirCoin(); },
    relire: function () { planifierFond(50); },
    /* la notification d'un défi : l'invitation (ou la partie) s'ouvre ;
       sinon, côté équipe, le coin café */
    aLaUne: function () {
      if (!O || !O.pret()) return;
      appeler('etat', {}).then(function (r) {
        var l = (r && r.parties) || [];
        l.forEach(function (p) { parties[p.id] = p; delete plusTard[p.id]; delete reduits[p.id]; });
        if (F) fermer(true);
        ouvrirCeQuiAttend(l);
        if (!F && O.mode === 'equipe') ouvrirCoin();
      }).catch(function () {});
    },
    porteCachee: porteCachee,
    ouvrirPartie: function (id) { ouvrirPartie(id); },
    fermer: function () { fermer(true); parties = {}; },
    _etat: function () { return { F: F && { ecran: F.ecran, id: F.id }, parties: parties, ecart: ecart }; }
  };
})();
