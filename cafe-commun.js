/* Déployé le 19/11/2026 à 16:49 — v1498 */
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

   v1458 — David, le 18 novembre : « ajoute un démineur dans le coin
   café et d'autres jeux solo, sur la course en fait il faut qu'on
   appuie, et qu'on puisse jouer contre l'ordinateur ». La course se
   gagne en tapant ; « 🤖 L'ordinateur » (Facile, Moyen, Fort) joue
   tous les jeux à plusieurs sauf la courte paille ; cinq jeux solo
   (démineur, Memory des panneaux, serpent, 2048, Sudoku du jour) et
   leurs records. Voir « LES JEUX SOLO » plus bas.

   v1459 — David : « je n'ai qu'une notif et pas de pop-up ». La
   notification prévient la page ouverte (sw.js), qui relit tout de
   suite ; et pendant un cours, l'invitation arrive en bandeau, sans
   rien couper. Voir « PENDANT UN COURS, UN BANDEAU ».

   v1460 — « 📰 Infos et horoscope » : les actualités par filtre, la
   météo et l'horoscope, lus par le Worker dans des flux RSS. Voir
   « LES INFOS ».

   v1461 — David : une catégorie « Infos et horoscope » dans le coin
   café, comme « Défier l'équipe » et « Jeux solo », avec trois
   boutons (Horoscope, Infos, Météo) ; plus de texte pour tous les
   horoscopes (jour, semaine, mois, saison) et le résumé entier des
   articles, pas seulement le titre.

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
  function initiale(nom) {
    if (/^L’ordinateur$/.test(String(nom || ''))) return '🤖'; var m = String(nom || '?').trim().split(/\s+/); return (m.length > 1 && /^[A-ZÉÈ]{2,}$/.test(m[0]) ? m[1].charAt(0) : m[0].charAt(0)).toUpperCase(); }
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
    '.cfMode{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:4px;border-radius:14px;background:var(--navy,#F0F1EA);border:1px solid var(--line);margin-bottom:12px}' +
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
    /* ⏸️ v1459 — le bandeau d'un défi reçu pendant un cours */
    '.cfBandeau{position:fixed;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:9990;display:flex;align-items:center;gap:10px;max-width:min(360px,calc(100vw - 24px));padding:9px 10px 9px 12px;border-radius:14px;background:#14161B;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.28);font:700 13.5px/1.3 Inter,system-ui,sans-serif;animation:cfBandeauIn .25s ease-out}' +
    '.cfBandeau .ic{font-size:20px;flex:0 0 auto}' +
    '.cfBandeau > div{min-width:0;flex:1}' +
    '.cfBandeau small{display:block;font-weight:500;font-size:11.5px;color:rgba(255,255,255,.7)}' +
    '.cfBandeau button{flex:0 0 auto;width:auto;margin:0;min-height:0;height:auto;border:0;border-radius:999px;font:inherit;cursor:pointer}' +
    '.cfBandeau .go{padding:7px 13px;background:linear-gradient(180deg,#D8FF6A,#B6FF0E);color:#111;font-size:12.5px;font-weight:800}' +
    '.cfBandeau .non{padding:5px 8px;background:transparent;color:rgba(255,255,255,.75);font-size:15px;line-height:1}' +
    '@keyframes cfBandeauIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}' +
    '@media (max-width:560px){.cfBandeau{left:12px;right:12px;max-width:none}}' +
    /* 📰 v1460 — les infos */
    '.cfInfos{margin-top:12px}' +
    '.cfInfo{display:flex;gap:11px;align-items:flex-start;padding:10px 11px;border:1px solid var(--line);border-radius:13px;background:var(--navy-deep,#fff);color:var(--cream);text-decoration:none;margin-top:7px}' +
    '.cfInfo:hover{border-color:#B6FF0E}' +
    '.cfInfo .im{flex:0 0 76px;width:76px;height:56px;object-fit:cover;border-radius:9px;background:var(--line)}' +
    '.cfInfo > div{min-width:0;flex:1}' +
    '.cfInfo b{display:block;font-size:14px;line-height:1.3}' +
    '.cfInfo small{display:block;font-size:11.5px;color:var(--muted);margin-top:3px;font-weight:600}' +
    '.cfInfo p{margin:5px 0 0;font-size:13px;line-height:1.45;color:var(--cream);opacity:.82}' +
    '.cfInfosPied{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;font-size:12px;color:var(--muted)}' +
    '.cfInfosPied button{width:auto;margin:0;min-height:0;height:auto;padding:5px 11px;border-radius:999px;border:1px solid var(--line);background:var(--navy-deep,#fff);color:var(--cream);font:inherit;font-weight:700;font-size:12px;cursor:pointer}' +
    '.cfAide a{color:inherit;text-decoration:underline}' +
    '.cfAncien{color:var(--orange,#C2410C)}' +
    '.cfSignes{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:7px;margin-top:9px}' +
    '.cfSignes button{margin:0;width:auto;min-height:0;height:auto;padding:9px 6px;border:1px solid var(--line);border-radius:13px;background:var(--navy-deep,#fff);color:var(--cream);font:inherit;font-weight:800;font-size:13px;cursor:pointer;text-align:center}' +
    '.cfSignes button .e,.cfHoro .e,.cfHoroL .e{display:block;font-size:24px;line-height:1.1}' +
    '.cfSignes button small{display:block;font-weight:500;font-size:10.5px;color:var(--muted);margin-top:2px}' +
    '.cfHoro{padding:14px;border-radius:16px;background:linear-gradient(160deg,rgba(182,255,14,.22),rgba(182,255,14,.05));border:1px solid rgba(150,220,0,.45)}' +
    '.cfHoro .tete{display:flex;gap:11px;align-items:center;font-size:18px;font-weight:800;color:var(--cream)}' +
    '.cfHoro .tete .e{font-size:34px}' +
    '.cfHoro .tete small{display:block;font-size:12px;font-weight:600;color:var(--muted)}' +
    '.cfHoro p{margin:10px 0 0;font-size:14.5px;line-height:1.55;color:var(--cream)}' +
    '.cfHoro .bas{display:flex;gap:10px;align-items:center;justify-content:flex-end;margin-top:10px;flex-wrap:wrap}' +
    '.cfHoroParts .part{margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}' +
    '.cfHoroParts .part:first-child{border-top:0;padding-top:0}' +
    '.cfHoroParts .part > b{display:block;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}' +
    '.cfHoroParts .part p{margin:3px 0 0;font-size:14.5px;line-height:1.55;color:var(--cream)}' +
    '.cfHoroParts .suite{font-weight:800;font-size:13px;color:inherit;white-space:nowrap}' +
    '.cfHoroL .cfHoroParts .part p{font-size:13.5px}' +
    '.cfHoro .suite{font-weight:800;font-size:13px;color:var(--cream)}' +
    '.cfHoro .changer{width:auto;margin:0;min-height:0;height:auto;padding:5px 11px;border-radius:999px;border:1px solid var(--line);background:var(--navy-deep,#fff);color:var(--muted);font:inherit;font-weight:700;font-size:12px;cursor:pointer}' +
    '.cfHoroL{border:1px solid var(--line);border-radius:12px;background:var(--navy-deep,#fff);margin-top:6px}' +
    '.cfHoroL summary{display:flex;align-items:center;gap:9px;padding:9px 11px;cursor:pointer;font-weight:800;font-size:13.5px;color:var(--cream);list-style:none}' +
    '.cfHoroL summary::-webkit-details-marker{display:none}' +
    '.cfHoroL summary .e{font-size:19px}' +
    '.cfHoroL summary small{font-weight:500;font-size:11.5px;color:var(--muted);margin-left:auto}' +
    '.cfHoroL .txt{padding:0 12px 11px;font-size:13.5px;line-height:1.5;color:var(--cream)}' +
    '.cfHoroL .txt a{font-weight:800;color:inherit}' +
    '.cfMeteo{padding:12px 13px;border:1px solid var(--line);border-radius:15px;background:var(--navy-deep,#fff);margin-top:8px}' +
    '.cfMeteo .tete{display:flex;gap:11px;align-items:center;font-size:16px;font-weight:800;color:var(--cream)}' +
    '.cfMeteo .tete > div{flex:1;min-width:0}' +
    '.cfMeteo .tete .e{font-size:32px}' +
    '.cfMeteo .tete small{display:block;font-size:12px;font-weight:600;color:var(--muted)}' +
    '.cfMeteo .tete .t{font-size:30px;font-weight:800}' +
    '.cfMeteo .conseil{margin-top:9px;padding:7px 10px;border-radius:10px;background:rgba(242,183,5,.16);font-size:12.5px;font-weight:700;color:var(--cream)}' +
    '.cfMeteo .jours{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:9px}' +
    '.cfMeteo .j{text-align:center;padding:7px 4px;border-radius:11px;background:var(--navy,#F0F1EA)}' +
    '.cfMeteo .j small{display:block;font-size:11px;color:var(--muted);font-weight:700;text-transform:capitalize}' +
    '.cfMeteo .j .e{display:block;font-size:22px;margin:2px 0}' +
    '.cfMeteo .j b{font-size:13px;color:var(--cream)}' +
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
    /* 🕹️ v1458 — les jeux solo */
    '.cfSolo{margin-top:10px}' +
    '.cfSoloBarre{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-weight:700;font-size:14px;margin:0 0 10px}' +
    '.cfSoloBarre button{width:auto;margin:0;min-height:0;height:auto;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:var(--navy-deep,#fff);color:var(--cream);font:inherit;font-weight:700;font-size:13px;cursor:pointer}' +
    '.cfSoloBarre button.on{background:linear-gradient(180deg,#D8FF6A,#B6FF0E);color:#111;border-color:transparent}' +
    '.cfDem{display:grid;gap:2px;margin:0 auto;user-select:none;-webkit-user-select:none;touch-action:manipulation}' +
    '.cfDem div{aspect-ratio:1/1;border-radius:5px;background:linear-gradient(180deg,#E9ECE3,#D3D7CC);box-shadow:inset 0 -2px 0 rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:clamp(11px,2.6vw,16px);cursor:pointer;color:#111;line-height:1}' +
    '.cfDem div.ouv{background:var(--navy-deep,#fff);box-shadow:none;border:1px solid var(--line);cursor:default}' +
    '.cfDem div.dr{background:#FFF1D6}' +
    '.cfDem div.boum{background:#FF5C33}' +
    '.cfDem .n1{color:#1E5BC6}.cfDem .n2{color:#2E8B14}.cfDem .n3{color:#D52B1E}.cfDem .n4{color:#5B2A86}.cfDem .n5{color:#8A3B12}.cfDem .n6{color:#0E7C7B}.cfDem .n7{color:#111}.cfDem .n8{color:#666}' +
    '.cfMem{display:grid;gap:8px}' +
    '.cfCarte{position:relative;aspect-ratio:3/4;margin:0;width:auto;height:auto;min-height:0;padding:0;border-radius:12px;border:1px solid var(--line);background:linear-gradient(160deg,#D8FF6A,#8FD400);cursor:pointer;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.08)}' +
    '.cfCarte .dos{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:rgba(0,0,0,.45);letter-spacing:.05em}' +
    '.cfCarte .face{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:var(--navy-deep,#fff);padding:6px}' +
    '.cfCarte .face svg{width:72%;height:auto;max-height:70%}' +
    '.cfCarte .face small{font-size:9.5px;font-weight:700;color:var(--muted);text-align:center;line-height:1.15;display:none}' +
    '.cfCarte.vue .face,.cfCarte.ok .face{display:flex}' +
    '.cfCarte.ok{border:2px solid #B6FF0E;cursor:default}' +
    '.cfCarte.ok .face small{display:block}' +
    '.cfSerp{position:relative;margin:0 auto;width:max-content;border-radius:14px;overflow:hidden;touch-action:none}' +
    '.cfSerp canvas{display:block}' +
    '.cfSurCadre{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25)}' +
    '.cfSurCadre .cfGros{width:auto;padding:14px 26px}' +
    '.cfFleches{display:grid;grid-template-columns:repeat(3,56px);gap:6px;justify-content:center;margin:10px auto 0}' +
    '.cfFleches button{height:48px;margin:0;min-height:0;width:auto;padding:0;border-radius:12px;border:1px solid var(--line);background:var(--navy-deep,#fff);font-size:18px;color:var(--cream);cursor:pointer;touch-action:manipulation}' +
    '.cfTuiles{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px;border-radius:14px;background:#BBADA0;max-width:340px;margin:0 auto;touch-action:none}' +
    '.cfTuiles div{aspect-ratio:1/1;border-radius:8px;background:rgba(238,228,218,.35);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:clamp(18px,6vw,30px);color:#776E65}' +
    '.cfTuiles .v2{background:#EEE4DA}.cfTuiles .v4{background:#EDE0C8}.cfTuiles .v8{background:#F2B179;color:#fff}.cfTuiles .v16{background:#F59563;color:#fff}' +
    '.cfTuiles .v32{background:#F67C5F;color:#fff}.cfTuiles .v64{background:#F65E3B;color:#fff}.cfTuiles .v128{background:#EDCF72;color:#fff;font-size:clamp(16px,5vw,26px)}' +
    '.cfTuiles .v256{background:#EDCC61;color:#fff;font-size:clamp(16px,5vw,26px)}.cfTuiles .v512{background:#EDC850;color:#fff;font-size:clamp(16px,5vw,26px)}' +
    '.cfTuiles .v1024{background:#EDC53F;color:#fff;font-size:clamp(13px,4vw,22px)}.cfTuiles .v2048,.cfTuiles .v4096{background:#B6FF0E;color:#111;font-size:clamp(13px,4vw,22px)}' +
    '.cfSdk{display:grid;grid-template-columns:repeat(9,1fr);max-width:360px;margin:0 auto;border:2px solid var(--cream);border-radius:6px;overflow:hidden;user-select:none;-webkit-user-select:none}' +
    '.cfSdk div{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;font-size:clamp(14px,4.4vw,20px);font-weight:700;color:#1E5BC6;border-right:1px solid var(--line);border-bottom:1px solid var(--line);cursor:pointer;background:var(--navy-deep,#fff)}' +
    '.cfSdk div.bd{border-right:2px solid var(--cream)}.cfSdk div.bb{border-bottom:2px solid var(--cream)}' +
    '.cfSdk div.donne{color:var(--cream);font-weight:800}' +
    '.cfSdk div.meme{background:#F3FFE0}.cfSdk div.sel{background:#D8FF6A}.cfSdk div.faux{color:#D52B1E}' +
    '.cfPad{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;max-width:360px;margin:10px auto 0}' +
    '.cfPad button{height:44px;margin:0;min-height:0;width:auto;padding:0;border-radius:10px;border:1px solid var(--line);background:var(--navy-deep,#fff);font:inherit;font-size:18px;font-weight:800;color:var(--cream);cursor:pointer;touch-action:manipulation}' +
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
    stopSolo();
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
    stopSolo();
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
      fond.addEventListener('click', function (e) { if (e.target === fond && F && F.ecran !== 'jeu' && F.ecran !== 'invite' && F.ecran !== 'solo') fermer(); });
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
      /* 📊 v1498 — l'onglet des statistiques : David seul (le serveur le dit) */
      if (r && r.statistiques !== undefined) {
        var avant = statsVisibles;
        statsVisibles = !!r.statistiques;
        if (!avant && statsVisibles && F && F.ecran === 'coin') ouvrirCoin();
      }
      var l = (r && r.parties) || [];
      var gardes = {};
      l.forEach(function (p) { gardes[p.id] = true; parties[p.id] = p; });
      Object.keys(parties).forEach(function (id) { if (!gardes[id] && parties[id].etat !== 'encours') delete parties[id]; });
      if (F && F.ecran === 'coin') dessinerEnCours();
      if (!F) ouvrirCeQuiAttend(l);
      else if (F.ecran === 'infos') ouvrirCeQuiAttend(l, false, true);   /* 📰 on lit : un bandeau, pas une fenêtre */
      planifierFond(l.some(function (p) { return p.etat === 'invite' || p.etat === 'encours'; }) ? 8000 : 20000);
    }).catch(function () { enCours = false; planifierFond(30000); });
  }
  /* Une invitation pour moi, ou une partie qui a commencé : on l'ouvre */
  function ouvrirCeQuiAttend(l, force, bandeauSeul) {
    var p = null;
    for (var i = 0; i < l.length && !p; i++) {
      var x = l[i];
      var moi = joueur(x, x.moi);
      if (!moi) continue;
      if (x.etat === 'invite' && moi.rep === '?' && !plusTard[x.id]) p = x;
      else if (x.etat === 'encours' && moi.rep === 'oui' && !reduits[x.id]) p = x;
      else if (x.etat === 'invite' && x.par && x.par.cle === x.moi && O.mode === 'equipe' && !reduits[x.id] && !vus[x.id] && !plusTard[x.id]) { /* il attend : on ne rouvre pas tout seul */ }
    }
    if (!p) { cacherBandeau(); return; }
    /* ⏸️ v1459 — pendant un cours (ou un appel), pas de fenêtre : un
       bandeau. Et une invitation montrée en bandeau le reste, même le
       cours fini : la fenêtre ne surgit pas au moment du bilan. */
    if (!force && (bandeauSeul || enBandeau[p.id] || occupe())) { montrerBandeau(p); return; }
    cacherBandeau();
    ouvrirPartie(p.id);
  }

  /* ============================================================
     ⏸️ v1459 — PENDANT UN COURS, UN BANDEAU ET PAS UNE FENÊTRE

     David, le 18 novembre : « je n'ai qu'une notif et pas de pop-up
     qui apparaît pour jouer — attention, si on met un pop-up il ne
     faut pas que ça coupe un cours ». La page dit si elle est
     occupée (O.occupe : un cours en route, un appel, la visio) ; si
     oui, l'invitation arrive dans un petit bandeau en bas, qui ne
     prend ni l'écran ni le clavier : « Jouer » ouvre la partie, « ✕ »
     la remet à plus tard (elle reste dans le coin café). Rien ne
     sonne, rien ne vibre.
     ============================================================ */
  var bandeau = null, bandeauId = '', enBandeau = {};
  function occupe() { try { return !!(O && O.occupe && O.occupe()); } catch (e) { return false; } }
  function cacherBandeau() {
    if (bandeau && bandeau.parentNode) bandeau.parentNode.removeChild(bandeau);
    bandeau = null; bandeauId = '';
  }
  function montrerBandeau(p) {
    enBandeau[p.id] = true;
    var J = JEUX[p.jeu] || { nom: p.jeu, ic: '🎲', au: '', max: 2 };
    var moi = joueur(p, p.moi) || {};
    var invite = p.etat === 'invite' && moi.rep === '?';
    var titre = invite
      ? (p.tournoi ? '🏟️ Ton match ' + J.au : prenom(p.par && p.par.nom) + (J.max > 2 ? ' t’invite ' : ' te défie ') + J.au)
      : 'Ta partie ' + (J.au ? J.au.replace(/^(au|à la|à|aux) /, 'de ') : '') + ' continue';
    var sous = invite ? 'quand tu veux · rien ne s’ouvre pendant ton cours' : 'reprends-la quand tu veux';
    var cle = p.id + '|' + titre;
    if (bandeau && bandeauId === cle) { placerBandeau(); return; }
    cacherBandeau();
    bandeau = el('div', 'cfBandeau', '<span class="ic">' + esc(J.ic) + '</span><div>' + esc(titre) + '<small>' + esc(sous) + '</small></div>');
    bandeau.setAttribute('role', 'status');
    bandeau.setAttribute('data-cafe-bandeau', p.id);
    bandeauId = cle;
    var go = el('button', 'go', invite ? 'Jouer' : 'Reprendre');
    go.type = 'button';
    go.addEventListener('click', function () { var id = p.id; cacherBandeau(); delete plusTard[id]; delete reduits[id]; ouvrirPartie(id); });
    var non = el('button', 'non', '✕');
    non.type = 'button';
    non.title = 'Plus tard (la partie reste dans le coin café)';
    non.setAttribute('aria-label', 'Plus tard');
    non.addEventListener('click', function () { if (invite) plusTard[p.id] = true; else reduits[p.id] = true; cacherBandeau(); });
    bandeau.appendChild(go);
    bandeau.appendChild(non);
    document.body.appendChild(bandeau);
    placerBandeau();
  }
  /* ⚠️ AU-DESSUS DE LA BARRE DU BAS. Sur un téléphone, les onglets
     (Cours, Élèves, Gestion ; ceux de l'espace élève) sont collés en
     bas de l'écran : posé dessus, le bandeau les cachait — on ne
     pouvait plus changer d'écran pendant le cours. On cherche ce qui
     est fixé en bas, et on se pose juste au-dessus. */
  function placerBandeau() {
    if (!bandeau) return;
    var bas = 0;
    bandeau.style.pointerEvents = 'none';
    bandeau.style.visibility = 'hidden';
    try {
      [[0.5, 6], [0.15, 6], [0.85, 6], [0.5, 24], [0.15, 24], [0.85, 24], [0.5, 48]].forEach(function (pt) {
        var e = document.elementFromPoint(window.innerWidth * pt[0], window.innerHeight - pt[1]);
        while (e && e !== document.body && e !== document.documentElement) {
          var cs = window.getComputedStyle(e);
          if (cs.position === 'fixed' || cs.position === 'sticky') {
            var r = e.getBoundingClientRect();
            if (r.top > window.innerHeight / 2) bas = Math.max(bas, window.innerHeight - r.top);
            break;
          }
          e = e.parentElement;
        }
      });
    } catch (e) {}
    bandeau.style.pointerEvents = '';
    bandeau.style.visibility = '';
    bandeau.style.bottom = bas ? Math.round(bas + 8) + 'px' : '';
  }
  window.addEventListener('resize', function () { placerBandeau(); });

  /* ============================================================
     ☕ LE COIN CAFÉ (l'équipe)
     ============================================================ */
  var modeDefi = 'equipe';
  function ouvrirCoin() {
    if (!O || O.mode !== 'equipe') return;
    var f = fenetre('coin', '☕ Le coin café', 560);
    var mode = el('div', 'cfMode');
    mode.setAttribute('role', 'tablist');
    [['equipe', '👥 L’équipe'], ['eleve', '🎓 Un élève'], ['ordi', '🤖 L’ordinateur']].forEach(function (m) {
      var b = el('button', modeDefi === m[0] ? 'on' : '', esc(m[1]));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { modeDefi = m[0]; ouvrirCoin(); });
      mode.appendChild(b);
    });
    f.corps.appendChild(mode);
    f.corps.appendChild(lab(modeDefi === 'ordi' ? 'Contre l’ordinateur' : (modeDefi === 'eleve' ? 'Défier un élève' : 'Défier l’équipe')));
    var g = el('div', 'cfGrille');
    ORDRE.forEach(function (k) {
      var J = JEUX[k];
      if (modeDefi !== 'equipe' && !J.eleve) return;   /* ni élève ni ordinateur à la courte paille */
      var sous = modeDefi === 'eleve' && J.max > 2 ? 'en duel avec l’élève' : (modeDefi === 'ordi' ? 'Facile, Moyen ou Fort' : J.s);
      var b = el('button', 'cfJeu', '<span class="e">' + J.e + '</span>' + esc(J.nom) + '<small>' + esc(sous) + '</small>');
      b.type = 'button';
      b.addEventListener('click', function () { preparerDefi(k); });
      g.appendChild(b);
    });
    f.corps.appendChild(g);
    /* 🕹️ v1458 — les jeux solo (pas pour un élève : il n'a pas le coin café) */
    if (modeDefi !== 'eleve') {
      f.corps.appendChild(lab('Jeux solo'));
      var gs = el('div', 'cfGrille');
      ORDRE_SOLO.forEach(function (k) {
        var S = SOLO[k];
        var b = el('button', 'cfJeu', '<span class="e">' + S.e + '</span>' + esc(S.nom) + '<small>' + esc(S.s) + '</small>');
        b.type = 'button';
        b.addEventListener('click', function () { ouvrirSolo(k); });
        gs.appendChild(b);
      });
      f.corps.appendChild(gs);
    }
    /* 📰 v1461 — David : « sépare infos et horoscope dans une catégorie,
       comme Défier l'équipe et Jeux solo, avec chacun son bouton
       (Horoscope, Infos, Météo) ». */
    f.corps.appendChild(lab('Infos et horoscope'));
    var gi = el('div', 'cfGrille');
    [['horoscope', '🔮', 'Horoscope', 'ton signe : jour, semaine, mois'],
     ['infos', '📰', 'Infos', 'monde, France, Saint-Brieuc, route, sport'],
     ['meteo', '⛅', 'Météo', 'Saint-Brieuc et Loudéac']].forEach(function (x) {
      var b = el('button', 'cfJeu', '<span class="e">' + x[1] + '</span>' + esc(x[2]) + '<small>' + esc(x[3]) + '</small>');
      b.type = 'button';
      b.setAttribute('data-infos', x[0]);
      b.addEventListener('click', function () { ouvrirInfos(x[0]); });
      gi.appendChild(b);
    });
    f.corps.appendChild(gi);
    var ec = el('div', '');
    ec.id = 'cfEnCours';
    f.corps.appendChild(ec);
    dessinerEnCours();
    var deux = el('div', 'cfDeux');
    var bp = el('button', '', '🏆 Palmarès');
    bp.type = 'button';
    bp.addEventListener('click', ouvrirPalmares);
    deux.appendChild(bp);
    if (statsVisibles && O.mode === 'equipe') {
      var bs = el('button', 'adm', '📊 Statistiques<small>toi seul</small>');
      bs.type = 'button';
      bs.addEventListener('click', function () { ouvrirStats(); });
      deux.appendChild(bs);
    }
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
  /* 🤖 v1458 — contre l'ordinateur : son niveau, les manches, le temps */
  var NIVEAUX = [['facile', '🙂 Facile'], ['moyen', '😐 Moyen'], ['fort', '😈 Fort']];
  function dessinerDefiOrdi() {
    var c = choixDefi, J = JEUX[c.jeu];
    c.niveau = c.niveau || 'moyen';
    var f = fenetre('defi', J.ic + ' ' + J.nom + ' — contre l’ordinateur', 480);
    f.corps.appendChild(lab('Son niveau'));
    f.corps.appendChild(chips(NIVEAUX, c.niveau, function (v) { c.niveau = v; dessinerDefi(); }));
    var aides = {
      chifoumi: 'Facile joue au hasard ; Moyen joue contre ce que tu joues le plus ; Fort lit tes habitudes.',
      pileface: 'Au pile ou face, l’ordinateur ne peut pas tricher : c’est le hasard à tous les niveaux.',
      course: 'Il tape à sa vitesse : Facile 4,6 appuis par seconde, Moyen 6,4, Fort 8,2.',
      feuvert: 'Ses réflexes : Facile vers 0,5 s, Moyen vers 0,35 s, Fort vers 0,24 s.',
      creneau: 'Facile s’arrête souvent loin du trait (et touche parfois le mur), Fort presque dessus.',
      morpion: 'Facile joue au hasard ; Moyen gagne ou bloque quand il peut ; Fort ne perd jamais.',
      chiffre: 'Facile répond au hasard ; Moyen tombe à 20 près ; Fort à 7 près.'
    };
    f.corps.appendChild(el('div', 'cfAide', esc(aides[c.jeu] || '')));
    if (c.jeu === 'course') {
      f.corps.appendChild(lab('Ta voiture'));
      var vz = el('div', 'cfVoitures');
      NOMS_V.slice(0, 4).forEach(function (v, i) {
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
    }
    if (J.temps) {
      f.corps.appendChild(lab('Temps pour jouer chaque coup'));
      f.corps.appendChild(chips(TEMPS, c.temps, function (v) { c.temps = v; dessinerDefi(); }));
    }
    f.bas.appendChild(bouton('Retour', false, function () { modeDefi = 'ordi'; ouvrirCoin(); }));
    var go = bouton('🤖 Jouer', true, lancer);
    go.id = 'cfLancer';
    f.bas.appendChild(go);
  }
  function dessinerDefi() {
    if (choixDefi && choixDefi.mode === 'ordi') { dessinerDefiOrdi(); return; }
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
    appeler('lancer', c.mode === 'ordi'
      ? { jeu: c.jeu, ordi: c.niveau || 'moyen', manches: c.manches, temps: c.temps, voiture: c.voiture }
      : { jeu: c.jeu, joueurs: c.mode === 'eleve' ? [] : c.joueurs, eleve: c.mode === 'eleve' ? c.eleve : '', manches: c.manches, temps: c.temps, gage: c.gage, voiture: c.voiture })
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
    cacherBandeau();
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
    var titreDuel = adv.length === 1 && actifs(p).length === 2 ? '⚔️ ' + prenom(moi.nom) + ' contre ' + (adv[0].bot ? 'l’ordinateur · ' + nomNiveau(adv[0].niveau) : prenom(adv[0].nom)) : J.ic + ' ' + J.nom;
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
    var botF = p.joueurs.filter(function (j) { return j.bot; })[0];
    if (botF && O.mode === 'equipe') {
      var palo = el('div', '');
      c.appendChild(palo);
      appeler('palmares', {}).then(function (r) {
        var l = ((r && r.ordi && r.ordi[p.jeu]) || []).filter(function (x) { return x.cle === p.moi; });
        if (!l.length) return;
        palo.appendChild(lab('Toi contre l’ordinateur · ' + J.nom));
        palo.appendChild(tableOrdi(l, true));
      }).catch(function () {});
    } else if (!p.eleve && O.mode === 'equipe') {
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
    var bot = p.joueurs.filter(function (j) { return j.bot; })[0];
    if (bot) {
      appeler('lancer', { jeu: p.jeu, ordi: bot.niveau || 'moyen', manches: p.reglages.manches, temps: p.reglages.temps, voiture: moi.voiture || 'bleue' })
        .then(function (r) { if (r && r.partie) { parties[r.partie.id] = r.partie; ouvrirPartie(r.partie.id); } })
        .catch(function (e) { toast('⚠️ ' + (e.message || e)); });
      return;
    }
    autresNoms = autresNoms.filter(function (n) { return n !== 'L’ordinateur'; });
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
        /* les temps : ceux qui ont franchi la ligne, et les appuis des autres */
        var tps = s.derniere.d.temps || {}, ap = s.derniere.d.appuis || {};
        c.appendChild(el('div', 'cfAide', esc(ordre.map(function (k, i) {
          return (i + 1) + (i ? 'e' : 'er') + ' ' + nomDe(p, k) + ' : ' + (tps[k] ? (tps[k] / 1000).toFixed(2).replace('.', ',') + ' s' : (ap[k] || 0) + ' appuis');
        }).join(' · '))));
        c.lastChild.style.textAlign = 'center';
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
      /* 🏎️ v1458 — David : « en fait il faut qu'on appuie ». Chaque
         appui fait avancer SA voiture ; le compte part au Worker
         plusieurs fois par seconde (pas à chaque appui : un doigt rapide
         en ferait dix requêtes). La barre d'espace marche aussi. */
      var moiJ = joueur(p, p.moi);
      var b = null;
      if (moiJ && moiJ.rep === 'oui') {
        b = el('button', 'cfGros', 'Prêts ?');
        b.type = 'button';
        b.disabled = true;
        b.style.marginTop = '10px';
        c.appendChild(b);
      }
      var et = etatTexte(c, moiJ && moiJ.rep === 'oui' ? 'Tape le plus vite possible (ou la barre d’espace) : chaque appui fait avancer ta voiture.' : 'La course…');
      F.anim = { genre: 'course', p: p, piste: piste, dec: dec, et: et, b: b, n: (s.appuis && s.appuis[p.moi]) || 0, envoye: (s.appuis && s.appuis[p.moi]) || 0, affiche: {}, minuteur: 0 };
      if (b) {
        var taper = function (ev) {
          if (ev) ev.preventDefault();
          var A = F && F.anim;
          if (!A || A.genre !== 'course' || A.p.id !== p.id) return;
          var q = parties[p.id];
          if (!q || !q.s || q.s.phase !== 'course' || maintenant() < q.s.depart || A.n >= q.s.but) return;
          A.n++;
          if (A.n >= q.s.but) envoyerAppuis(true);
          else if (!A.minuteur) A.minuteur = setTimeout(function () { envoyerAppuis(false); }, 220);
        };
        b.addEventListener('pointerdown', taper);
        b.addEventListener('click', function (ev) { ev.preventDefault(); });
        F.anim.taper = taper;
      }
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

  /* 🏎️ le compte d'appuis part au Worker (regroupé) */
  function envoyerAppuis(force) {
    var A = F && F.anim;
    if (!A || A.genre !== 'course') return;
    clearTimeout(A.minuteur);
    A.minuteur = 0;
    if (A.n === A.envoye && !force) return;
    var n = A.n, id = A.p.id;
    A.envoye = n;
    appeler('agir', { id: id, quoi: 'jouer', n: n }).then(function (r) { if (r && r.partie) recevoir([r.partie]); }).catch(function () {});
  }

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
        if (A.genre === 'course' && A.p.s.but) {
          var q2 = parties[A.p.id] || A.p, s2 = q2.s || s;
          var avant2 = s.depart - t;
          A.dec.textContent = avant2 > 0 ? String(Math.ceil(avant2 / 1000)) : (avant2 > -700 ? 'Partez !' : '');
          if (A.b && s2.phase === 'course') {
            if (avant2 > 0) { A.b.disabled = true; A.b.textContent = 'Prêts ?'; A.b.classList.remove('vert'); }
            else if (A.n >= s.but) { A.b.disabled = true; A.b.textContent = '🏁 Arrivé !'; A.b.classList.remove('vert'); }
            else { A.b.disabled = false; A.b.textContent = '👆 TAPE ! ' + A.n + ' / ' + s.but; A.b.classList.add('vert'); }
          }
          var larg2 = A.piste.clientWidth - 34 - 72;
          var cars2 = A.piste.querySelectorAll('.car');
          for (var k2 = 0; k2 < cars2.length; k2++) {
            var cle2 = cars2[k2].getAttribute('data-cle');
            var but = s.but || 50, vise;
            if (cle2 === A.p.moi && A.b) vise = A.n;
            else if (s2.vitesses && s2.vitesses[cle2] && !(s2.arrivees && s2.arrivees[cle2])) vise = Math.min(but, Math.max(0, (t - s.depart) / 1000 * s2.vitesses[cle2]));
            else vise = (s2.appuis && s2.appuis[cle2]) || 0;
            var dejaA = A.affiche[cle2] || 0;
            var pos2 = dejaA + (vise - dejaA) * 0.35;
            A.affiche[cle2] = pos2;
            cars2[k2].style.transform = 'translateX(' + Math.round(Math.min(1, pos2 / but) * larg2) + 'px)';
          }
          var arr2 = s2.arrivees ? Object.keys(s2.arrivees) : [];
          if (arr2.length) A.et.textContent = '🏁 ' + arr2.map(function (k3) { return k3 === A.p.moi ? 'Tu as' : nomDe(A.p, k3) + ' a'; }).join(', ') + ' franchi la ligne !';
        } else if (A.genre === 'course') {
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
     🕹️ LES JEUX SOLO — v1458

     David, le 18 novembre : « ajoute un démineur dans le coin café
     et d'autres jeux solo » ; ses choix : le démineur, le Memory des
     panneaux, le serpent, 2048 et le Sudoku (une grille par jour).
     Tout se joue dans la page ; seul le résultat part au Worker
     (cafeRecord), qui garde le meilleur de chacun — visible par
     toute l'équipe, à part du classement des duels.
     ============================================================ */
  var SOLO = {
    demineur: { nom: 'Démineur', e: '💣', s: 'facile, moyen ou difficile', niveaux: [['facile', 'Facile'], ['moyen', 'Moyen'], ['difficile', 'Difficile']] },
    memory: { nom: 'Memory des panneaux', e: '🚸', s: 'retrouver les paires', niveaux: [['facile', '6 paires'], ['moyen', '8 paires'], ['difficile', '12 paires']] },
    serpent: { nom: 'Le serpent', e: '🐍', s: 'ramasser les plots', niveaux: null },
    '2048': { nom: '2048', e: '🔢', s: 'glisser les tuiles', niveaux: null },
    sudoku: { nom: 'Sudoku du jour', e: '✏️', s: 'une grille par jour', niveaux: [['facile', 'Facile'], ['moyen', 'Moyen'], ['difficile', 'Difficile']] }
  };
  var ORDRE_SOLO = ['demineur', 'memory', 'serpent', '2048', 'sudoku'];
  var niveauSolo = {};
  var soloStop = null;            /* arrête les minuteurs et les écouteurs du jeu en cours */
  var soloTouche = null;          /* le clavier, pour le jeu en cours */

  function stopSolo() {
    if (soloStop) { try { soloStop(); } catch (e) {} }
    soloStop = null;
    soloTouche = null;
    finirSession();
  }

  /* 📊 v1498 — LE TEMPS PASSÉ À UN JEU SOLO, pour les statistiques de
     David. Compté page visible seulement (un onglet oublié ne compte
     pas), envoyé quand on quitte la partie : nouvelle partie, retour,
     fermeture. Le serveur ne garde qu'une heure au plus, et rien sous
     5 secondes. */
  var session = null;             /* { jeu, debut (0 = page cachée), cumul } */
  function debutSession(jeu) {
    finirSession();
    session = { jeu: jeu, debut: document.hidden ? 0 : Date.now(), cumul: 0 };
  }
  function finirSession() {
    if (!session) return;
    var x = session;
    session = null;
    var ms = x.cumul + (x.debut ? Date.now() - x.debut : 0);
    var sec = Math.round(ms / 1000);
    if (sec < 5 || !O || O.mode !== 'equipe') return;
    appeler('temps', { jeu: x.jeu, secondes: Math.min(sec, 3600) }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () {
    if (!session) return;
    if (document.hidden) { if (session.debut) { session.cumul += Date.now() - session.debut; session.debut = 0; } }
    else if (!session.debut) session.debut = Date.now();
  });
  window.addEventListener('pagehide', function () { finirSession(); });
  function deuxChiffres(n) { return (n < 10 ? '0' : '') + n; }
  function minSec(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + deuxChiffres(s % 60); }
  function formatRecord(jeu, v) {
    if (jeu === 'demineur') return (v / 10).toFixed(1).replace('.', ',') + ' s';
    if (jeu === 'memory') { var c = Math.floor(v / 10000); return c + ' coup' + (c > 1 ? 's' : '') + ' · ' + minSec(v % 10000); }
    if (jeu === 'serpent') return v + ' plot' + (v > 1 ? 's' : '');
    if (jeu === '2048') return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' points';
    if (jeu === 'sudoku') return minSec(v);
    return String(v);
  }

  function ouvrirSolo(jeu, niveau) {
    var S = SOLO[jeu];
    if (!S) return;
    if (niveau) niveauSolo[jeu] = niveau;
    var n = S.niveaux ? (niveauSolo[jeu] || S.niveaux[0][0]) : '';
    var f = fenetre('solo', S.e + ' ' + S.nom, jeu === 'demineur' && n === 'difficile' ? 560 : 480);
    if (S.niveaux) f.corps.appendChild(chips(S.niveaux, n, function (v) { ouvrirSolo(jeu, v); }));
    var zone = el('div', 'cfSolo');
    f.corps.appendChild(zone);
    var message = el('div', 'cfEtat', '');
    f.corps.appendChild(message);
    var recs = el('div', '');
    f.corps.appendChild(recs);
    var montrerRecords = function () {
      appeler('palmares', {}).then(function (r) {
        if (!F || F.ecran !== 'solo') return;
        var l = (r && r.records && r.records[jeu] && r.records[jeu][n]) || [];
        recs.innerHTML = '';
        if (!l.length) return;
        recs.appendChild(lab('Les records de l’équipe' + (S.niveaux ? ' · ' + S.niveaux.filter(function (x) { return x[0] === n; })[0][1] : '')));
        recs.appendChild(tableRecords(jeu, l, 5));
      }).catch(function () {});
    };
    var finir = function (valeur, texte) {
      message.innerHTML = '<b>' + esc(texte) + '</b>';
      if (!(valeur > 0)) return;
      appeler('record', { jeu: jeu, niveau: n, valeur: valeur }).then(function (r) {
        var t = r.premier ? '🏅 Ton premier score' : (r.record ? '🏅 Nouveau record ! (avant : ' + formatRecord(jeu, r.ancien) + ')' : 'Ton record : ' + formatRecord(jeu, r.meilleur));
        message.innerHTML = '<b>' + esc(texte) + '</b><br>' + esc(t + ' · ' + r.rang + (r.rang === 1 ? 'er' : 'e') + ' de l’équipe');
        if (r.record || r.premier) cotillons();
        montrerRecords();
      }).catch(function () {});
    };
    var jeux = { demineur: jeuDemineur, memory: jeuMemory, serpent: jeuSerpent, '2048': jeu2048, sudoku: jeuSudoku };
    var lancerJeu = function () {
      stopSolo();
      zone.innerHTML = '';
      message.textContent = '';
      soloStop = jeux[jeu](zone, n, finir, message);
      debutSession(jeu);   /* 📊 v1498 */
    };
    lancerJeu();
    montrerRecords();
    f.bas.appendChild(bouton('Retour', false, function () { ouvrirCoin(); }));
    if (jeu !== 'sudoku') f.bas.appendChild(bouton('🔄 Nouvelle partie', true, lancerJeu));
  }
  function tableRecords(jeu, l, combien) {
    var t = el('table', 'cfPalm');
    var med = ['🥇', '🥈', '🥉'];
    l.slice(0, combien || 50).forEach(function (x, i) {
      t.appendChild(el('tr', '', '<td>' + (med[i] || (i + 1) + '.') + ' ' + esc(x.nom) + '</td><td>' + esc(formatRecord(jeu, x.valeur)) + '</td>'));
    });
    return t;
  }
  function chrono(cible) {
    var t0 = 0, fin = 0, m = 0;
    return {
      lancer: function () { if (t0) return; t0 = Date.now(); m = setInterval(function () { cible.textContent = '⏱️ ' + minSec((Date.now() - t0) / 1000); }, 250); },
      arreter: function () { if (!fin && t0) fin = Date.now(); clearInterval(m); return t0 ? (fin - t0) : 0; },
      ms: function () { return t0 ? Date.now() - t0 : 0; }
    };
  }
  /* le doigt qui glisse : haut, bas, gauche, droite */
  function glisser(cible, faire) {
    var x0 = 0, y0 = 0, dedans = false;
    cible.addEventListener('touchstart', function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; dedans = true; }, { passive: true });
    cible.addEventListener('touchmove', function (e) { if (dedans) e.preventDefault(); }, { passive: false });
    cible.addEventListener('touchend', function (e) {
      if (!dedans) return;
      dedans = false;
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      faire(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'g') : (dy > 0 ? 'b' : 'h'));
    });
  }
  function fleches(faire) {
    var z = el('div', 'cfFleches');
    [['', ''], ['h', '▲'], ['', ''], ['g', '◀'], ['b', '▼'], ['d', '▶']].forEach(function (x) {
      if (!x[0]) { z.appendChild(el('span', '')); return; }
      var b = el('button', '', x[1]);
      b.type = 'button';
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); faire(x[0]); });
      z.appendChild(b);
    });
    return z;
  }
  var TOUCHES = { ArrowUp: 'h', ArrowDown: 'b', ArrowLeft: 'g', ArrowRight: 'd', z: 'h', s: 'b', q: 'g', d: 'd', w: 'h', a: 'g' };

  /* ---------- 💣 LE DÉMINEUR ---------- */
  function jeuDemineur(zone, niveau, finir, message) {
    var cfg = { facile: [9, 9, 10], moyen: [12, 12, 24], difficile: [16, 16, 48] }[niveau] || [9, 9, 10];
    var L = cfg[0], H = cfg[1], M = cfg[2], N = L * H;
    var mines = null, vu = [], drap = [], fini = false, modeDrapeau = false;
    var barre = el('div', 'cfSoloBarre', '<span>💣 <b>' + M + '</b></span><span class="t">⏱️ 0:00</span>');
    var bd = el('button', '', '🚩 Drapeau');
    bd.type = 'button';
    bd.addEventListener('click', function () { modeDrapeau = !modeDrapeau; bd.className = modeDrapeau ? 'on' : ''; });
    barre.appendChild(bd);
    zone.appendChild(barre);
    var ch = chrono(barre.querySelector('.t'));
    var g = el('div', 'cfDem');
    g.style.gridTemplateColumns = 'repeat(' + L + ', 1fr)';
    g.style.maxWidth = (L * 34) + 'px';
    var cases = [];
    for (var i = 0; i < N; i++) { var c = el('div', ''); c.setAttribute('data-i', String(i)); cases.push(c); g.appendChild(c); vu.push(false); drap.push(false); }
    zone.appendChild(g);
    zone.appendChild(el('div', 'cfAide', 'Appui long (ou clic droit, ou 🚩) pour poser un drapeau. Toucher un chiffre entouré de ses drapeaux ouvre le reste.'));
    zone.lastChild.style.textAlign = 'center';
    function voisins(i) {
      var x = i % L, y = Math.floor(i / L), r = [];
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        var nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < L && ny < H) r.push(ny * L + nx);
      }
      return r;
    }
    function compte(i) { return voisins(i).filter(function (j) { return mines[j]; }).length; }
    function poser(i0) {
      mines = [];
      for (var k = 0; k < N; k++) mines.push(false);
      var interdit = voisins(i0).concat([i0]);
      var place = 0;
      while (place < M) {
        var j = Math.floor(Math.random() * N);
        if (mines[j] || interdit.indexOf(j) !== -1) continue;
        mines[j] = true; place++;
      }
    }
    function peindre(i) {
      var c = cases[i];
      if (vu[i]) {
        var n = mines[i] ? -1 : compte(i);
        c.className = 'ouv' + (n > 0 ? ' n' + n : '');
        c.textContent = mines[i] ? '💣' : (n || '');
      } else {
        c.className = drap[i] ? 'dr' : '';
        c.textContent = drap[i] ? '🚩' : '';
      }
    }
    function majCompte() { barre.querySelector('b').textContent = String(M - drap.filter(Boolean).length); }
    function ouvrir(i) {
      if (vu[i] || drap[i]) return;
      var pile = [i];
      while (pile.length) {
        var k = pile.pop();
        if (vu[k] || drap[k]) continue;
        vu[k] = true; peindre(k);
        if (!mines[k] && compte(k) === 0) voisins(k).forEach(function (j) { if (!vu[j]) pile.push(j); });
      }
    }
    function perdu(i) {
      fini = true; ch.arreter();
      for (var k = 0; k < N; k++) if (mines[k]) { vu[k] = true; drap[k] = false; peindre(k); }
      cases[i].className += ' boum';
      vibrer(80);
      message.innerHTML = '<b>💥 Perdu ! « Nouvelle partie » pour recommencer.</b>';
    }
    function verifier() {
      var ouverts = vu.filter(Boolean).length;
      if (ouverts === N - M) {
        fini = true;
        var ds = Math.max(1, Math.round(ch.arreter() / 100));
        for (var k = 0; k < N; k++) if (mines[k]) { drap[k] = true; peindre(k); }
        finir(ds, '🎉 Déminé en ' + formatRecord('demineur', ds) + ' !');
      }
    }
    function jouer(i, drapeau) {
      if (fini) return;
      if (drapeau) { if (vu[i]) return; drap[i] = !drap[i]; peindre(i); majCompte(); return; }
      if (!mines) { poser(i); ch.lancer(); }
      if (vu[i]) {
        /* le chiffre entouré de ses drapeaux : on ouvre le reste */
        var v = voisins(i);
        if (v.filter(function (j) { return drap[j]; }).length !== compte(i)) return;
        for (var a = 0; a < v.length; a++) { var j = v[a]; if (!drap[j] && !vu[j]) { if (mines[j]) { perdu(j); return; } ouvrir(j); } }
        verifier();
        return;
      }
      if (drap[i]) return;
      if (mines[i]) { perdu(i); return; }
      ouvrir(i);
      verifier();
    }
    var long = 0, longFait = false;
    g.addEventListener('pointerdown', function (e) {
      var c = e.target.closest ? e.target.closest('[data-i]') : null;
      if (!c) return;
      longFait = false;
      clearTimeout(long);
      long = setTimeout(function () { longFait = true; vibrer(15); jouer(Number(c.getAttribute('data-i')), true); }, 420);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { g.addEventListener(n, function () { clearTimeout(long); }); });
    g.addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('[data-i]') : null;
      if (!c || longFait) { longFait = false; return; }
      jouer(Number(c.getAttribute('data-i')), modeDrapeau);
    });
    g.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      var c = e.target.closest ? e.target.closest('[data-i]') : null;
      if (c && !longFait) jouer(Number(c.getAttribute('data-i')), true);
      longFait = false;
    });
    return function () { ch.arreter(); clearTimeout(long); };
  }

  /* ---------- 🚸 LE MEMORY DES PANNEAUX ---------- */
  var PANNEAUX = [
    ['stop', 'Stop', '<polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill="#D52B1E" stroke="#fff" stroke-width="4"/><text x="50" y="60" font-size="26" font-weight="800" fill="#fff" text-anchor="middle" font-family="Arial">STOP</text>'],
    ['sens', 'Sens interdit', '<circle cx="50" cy="50" r="46" fill="#D52B1E" stroke="#fff" stroke-width="3"/><rect x="18" y="42" width="64" height="16" fill="#fff"/>'],
    ['cedez', 'Cédez le passage', '<polygon points="4,8 96,8 50,92" fill="#fff" stroke="#D52B1E" stroke-width="10" stroke-linejoin="round"/>'],
    ['danger', 'Danger', '<polygon points="50,6 96,90 4,90" fill="#fff" stroke="#D52B1E" stroke-width="9" stroke-linejoin="round"/><rect x="46" y="36" width="8" height="30" fill="#111"/><rect x="46" y="72" width="8" height="8" fill="#111"/>'],
    ['l30', 'Limité à 30', '<circle cx="50" cy="50" r="44" fill="#fff" stroke="#D52B1E" stroke-width="10"/><text x="50" y="64" font-size="40" font-weight="800" fill="#111" text-anchor="middle" font-family="Arial">30</text>'],
    ['l50', 'Limité à 50', '<circle cx="50" cy="50" r="44" fill="#fff" stroke="#D52B1E" stroke-width="10"/><text x="50" y="64" font-size="40" font-weight="800" fill="#111" text-anchor="middle" font-family="Arial">50</text>'],
    ['l90', 'Limité à 90', '<circle cx="50" cy="50" r="44" fill="#fff" stroke="#D52B1E" stroke-width="10"/><text x="50" y="64" font-size="40" font-weight="800" fill="#111" text-anchor="middle" font-family="Arial">90</text>'],
    ['stat', 'Stationnement interdit', '<circle cx="50" cy="50" r="44" fill="#1E5BC6" stroke="#D52B1E" stroke-width="10"/><line x1="20" y1="20" x2="80" y2="80" stroke="#D52B1E" stroke-width="10"/>'],
    ['arret', 'Arrêt et stationnement interdits', '<circle cx="50" cy="50" r="44" fill="#1E5BC6" stroke="#D52B1E" stroke-width="10"/><line x1="20" y1="20" x2="80" y2="80" stroke="#D52B1E" stroke-width="10"/><line x1="80" y1="20" x2="20" y2="80" stroke="#D52B1E" stroke-width="10"/>'],
    ['prio', 'Route prioritaire', '<polygon points="50,3 97,50 50,97 3,50" fill="#fff" stroke="#333" stroke-width="2"/><polygon points="50,20 80,50 50,80 20,50" fill="#F5C400"/>'],
    ['finprio', 'Fin de route prioritaire', '<polygon points="50,3 97,50 50,97 3,50" fill="#fff" stroke="#333" stroke-width="2"/><polygon points="50,20 80,50 50,80 20,50" fill="#F5C400"/><line x1="26" y1="74" x2="74" y2="26" stroke="#111" stroke-width="8"/>'],
    ['droit', 'Tout droit obligatoire', '<circle cx="50" cy="50" r="46" fill="#1E5BC6" stroke="#fff" stroke-width="3"/><rect x="44" y="34" width="12" height="44" fill="#fff"/><polygon points="50,14 70,38 30,38" fill="#fff"/>']
  ];
  function panneau(i) { return '<svg viewBox="0 0 100 100" aria-hidden="true">' + PANNEAUX[i][2] + '</svg>'; }
  function jeuMemory(zone, niveau, finir) {
    var paires = { facile: 6, moyen: 8, difficile: 12 }[niveau] || 6;
    var choix = [];
    for (var i = 0; i < PANNEAUX.length; i++) choix.push(i);
    choix.sort(function () { return Math.random() - 0.5; });
    choix = choix.slice(0, paires);
    var jeu = choix.concat(choix).sort(function () { return Math.random() - 0.5; });
    var barre = el('div', 'cfSoloBarre', '<span>🔁 <b>0</b> coup</span><span class="t">⏱️ 0:00</span><span>✅ <i>0</i> / ' + paires + '</span>');
    zone.appendChild(barre);
    var ch = chrono(barre.querySelector('.t'));
    var g = el('div', 'cfMem');
    g.style.gridTemplateColumns = 'repeat(' + (paires === 12 ? 6 : 4) + ', 1fr)';
    var cartes = [];
    var ouvertes = [], trouvees = 0, coups = 0, bloque = false, fin = false, attente = 0;
    jeu.forEach(function (k, i) {
      var b = el('button', 'cfCarte', '<span class="dos">EC</span><span class="face">' + panneau(k) + '<small>' + esc(PANNEAUX[k][1]) + '</small></span>');
      b.type = 'button';
      b.setAttribute('aria-label', 'Carte ' + (i + 1));
      b.addEventListener('click', function () {
        if (bloque || fin || b.classList.contains('vue') || b.classList.contains('ok')) return;
        ch.lancer();
        b.classList.add('vue');
        ouvertes.push(i);
        if (ouvertes.length < 2) return;
        coups++;
        barre.querySelector('b').textContent = String(coups);
        barre.querySelector('b').nextSibling.textContent = coups > 1 ? ' coups' : ' coup';
        var a = ouvertes[0], c = ouvertes[1];
        ouvertes = [];
        if (jeu[a] === jeu[c]) {
          cartes[a].classList.add('ok'); cartes[c].classList.add('ok');
          trouvees++;
          barre.querySelector('i').textContent = String(trouvees);
          if (trouvees === paires) {
            fin = true;
            var secs = Math.round(ch.arreter() / 1000);
            finir(coups * 10000 + Math.min(9999, secs), '🎉 Toutes les paires en ' + coups + ' coups et ' + minSec(secs) + ' !');
          }
        } else {
          bloque = true;
          attente = setTimeout(function () { cartes[a].classList.remove('vue'); cartes[c].classList.remove('vue'); bloque = false; }, 850);
        }
      });
      cartes.push(b);
      g.appendChild(b);
    });
    zone.appendChild(g);
    return function () { ch.arreter(); clearTimeout(attente); };
  }

  /* ---------- 🐍 LE SERPENT ---------- */
  function jeuSerpent(zone, niveau, finir, message) {
    var N = 15;
    var barre = el('div', 'cfSoloBarre', '<span>🔺 <b>0</b> plot</span><span class="vit">🚗 vitesse 1</span>');
    zone.appendChild(barre);
    var cadre = el('div', 'cfSerp');
    var cv = document.createElement('canvas');
    cadre.appendChild(cv);
    var go = el('button', 'cfGros vert', '▶️ Jouer');
    go.type = 'button';
    var surCadre = el('div', 'cfSurCadre');
    surCadre.appendChild(go);
    cadre.appendChild(surCadre);
    zone.appendChild(cadre);
    var dir = 'd', prochaine = 'd', corps = [], plot = null, score = 0, enJeu = false, minuteur = 0, pas = 170;
    var taille = Math.min(360, Math.max(240, (zone.clientWidth || 340) - 8));
    var dpr = window.devicePixelRatio || 1;
    cv.width = taille * dpr; cv.height = taille * dpr;
    cv.style.width = taille + 'px'; cv.style.height = taille + 'px';
    var cx = cv.getContext('2d');
    cx.scale(dpr, dpr);
    var c = taille / N;
    function placerPlot() {
      var libre;
      do { libre = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; }
      while (corps.some(function (p) { return p.x === libre.x && p.y === libre.y; }));
      plot = libre;
    }
    function dessiner() {
      cx.fillStyle = '#3B3F45'; cx.fillRect(0, 0, taille, taille);
      cx.strokeStyle = 'rgba(255,255,255,.06)';
      for (var i = 1; i < N; i++) { cx.beginPath(); cx.moveTo(i * c, 0); cx.lineTo(i * c, taille); cx.stroke(); cx.beginPath(); cx.moveTo(0, i * c); cx.lineTo(taille, i * c); cx.stroke(); }
      if (plot) {
        cx.fillStyle = '#F07D1A';
        cx.beginPath(); cx.moveTo(plot.x * c + c / 2, plot.y * c + 3); cx.lineTo(plot.x * c + c - 3, plot.y * c + c - 3); cx.lineTo(plot.x * c + 3, plot.y * c + c - 3); cx.closePath(); cx.fill();
        cx.fillStyle = '#fff'; cx.fillRect(plot.x * c + c * 0.32, plot.y * c + c * 0.55, c * 0.36, c * 0.12);
      }
      corps.forEach(function (p, i) {
        cx.fillStyle = i === 0 ? '#8FD400' : '#B6FF0E';
        var m = i === 0 ? 1 : 2;
        cx.fillRect(p.x * c + m, p.y * c + m, c - 2 * m, c - 2 * m);
      });
      if (corps.length) {
        var h = corps[0];
        cx.fillStyle = '#111';
        cx.beginPath(); cx.arc(h.x * c + c * 0.35, h.y * c + c * 0.38, c * 0.09, 0, 7); cx.arc(h.x * c + c * 0.65, h.y * c + c * 0.38, c * 0.09, 0, 7); cx.fill();
      }
    }
    function tourner(d) {
      var oppose = { h: 'b', b: 'h', g: 'd', d: 'g' };
      if (enJeu && d !== oppose[dir]) prochaine = d;
    }
    function tic() {
      if (!enJeu) return;
      if (document.hidden) { minuteur = setTimeout(tic, 300); return; }
      dir = prochaine;
      var h = corps[0];
      var n = { x: h.x + (dir === 'd' ? 1 : dir === 'g' ? -1 : 0), y: h.y + (dir === 'b' ? 1 : dir === 'h' ? -1 : 0) };
      var mange = plot && n.x === plot.x && n.y === plot.y;
      var queue = mange ? corps : corps.slice(0, -1);
      if (n.x < 0 || n.y < 0 || n.x >= N || n.y >= N || queue.some(function (p) { return p.x === n.x && p.y === n.y; })) {
        enJeu = false;
        vibrer(80);
        dessiner();
        go.textContent = '🔄 Rejouer';
        surCadre.style.display = '';
        if (score > 0) finir(score, '💥 Fin de la partie : ' + score + ' plot' + (score > 1 ? 's' : '') + ' ramassé' + (score > 1 ? 's' : '') + '.');
        else message.innerHTML = '<b>💥 Perdu ! Rejoue pour ramasser des plots.</b>';
        return;
      }
      corps.unshift(n);
      if (mange) {
        score++;
        barre.querySelector('b').textContent = String(score);
        barre.querySelector('b').nextSibling.textContent = score > 1 ? ' plots' : ' plot';
        pas = Math.max(75, 170 - score * 5);
        barre.querySelector('.vit').textContent = '🚗 vitesse ' + (1 + Math.floor((170 - pas) / 19));
        placerPlot();
      } else corps.pop();
      dessiner();
      minuteur = setTimeout(tic, pas);
    }
    function demarrer() {
      corps = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
      dir = 'd'; prochaine = 'd'; score = 0; pas = 170;
      barre.querySelector('b').textContent = '0';
      message.textContent = '';
      placerPlot();
      enJeu = true;
      surCadre.style.display = 'none';
      dessiner();
      minuteur = setTimeout(tic, pas);
    }
    go.addEventListener('click', demarrer);
    glisser(cadre, tourner);
    zone.appendChild(fleches(tourner));
    zone.appendChild(el('div', 'cfAide', 'Les flèches du clavier, un glissé du doigt, ou les flèches ci-dessus.'));
    zone.lastChild.style.textAlign = 'center';
    soloTouche = function (ev) { var d = TOUCHES[ev.key]; if (d && enJeu) { ev.preventDefault(); tourner(d); } };
    dessiner();
    return function () { enJeu = false; clearTimeout(minuteur); };
  }

  /* ---------- 🔢 2048 ---------- */
  function jeu2048(zone, niveau, finir, message) {
    var g = [], score = 0, fin = false, gagne = false;
    for (var i = 0; i < 16; i++) g.push(0);
    var barre = el('div', 'cfSoloBarre', '<span>⭐ <b>0</b> points</span><span class="max">🔝 2</span>');
    zone.appendChild(barre);
    var plateau = el('div', 'cfTuiles');
    zone.appendChild(plateau);
    function ajouter() {
      var libres = [];
      g.forEach(function (v, i) { if (!v) libres.push(i); });
      if (!libres.length) return;
      g[libres[Math.floor(Math.random() * libres.length)]] = Math.random() < 0.9 ? 2 : 4;
    }
    function dessiner() {
      plateau.innerHTML = '';
      var max = 0;
      g.forEach(function (v) {
        max = Math.max(max, v);
        plateau.appendChild(el('div', 'v' + Math.min(v, 4096), v ? String(v) : ''));
      });
      barre.querySelector('b').textContent = String(score);
      barre.querySelector('.max').textContent = '🔝 ' + max;
      if (max >= 2048 && !gagne) { gagne = true; message.innerHTML = '<b>🎉 2048 ! Continue pour faire mieux.</b>'; cotillons(); }
    }
    function ligne(l) {
      var t = l.filter(Boolean), out = [];
      for (var i = 0; i < t.length; i++) {
        if (t[i] === t[i + 1]) { out.push(t[i] * 2); score += t[i] * 2; i++; }
        else out.push(t[i]);
      }
      while (out.length < 4) out.push(0);
      return out;
    }
    function bouger(d) {
      if (fin) return;
      var avant = g.join(',');
      for (var k = 0; k < 4; k++) {
        var idx = [];
        for (var j = 0; j < 4; j++) {
          if (d === 'g') idx.push(k * 4 + j);
          else if (d === 'd') idx.push(k * 4 + 3 - j);
          else if (d === 'h') idx.push(j * 4 + k);
          else idx.push((3 - j) * 4 + k);
        }
        var r = ligne(idx.map(function (i) { return g[i]; }));
        idx.forEach(function (i, n) { g[i] = r[n]; });
      }
      if (g.join(',') === avant) return;
      ajouter();
      dessiner();
      if (bloque()) {
        fin = true;
        finir(score, '🧱 Plus de coup possible : ' + formatRecord('2048', score) + '.');
      }
    }
    function bloque() {
      for (var i = 0; i < 16; i++) {
        if (!g[i]) return false;
        if (i % 4 < 3 && g[i] === g[i + 1]) return false;
        if (i < 12 && g[i] === g[i + 4]) return false;
      }
      return true;
    }
    ajouter(); ajouter(); dessiner();
    glisser(plateau, bouger);
    zone.appendChild(fleches(bouger));
    zone.appendChild(el('div', 'cfAide', 'Les flèches du clavier, un glissé du doigt, ou les flèches ci-dessus. Deux tuiles pareilles se rejoignent.'));
    zone.lastChild.style.textAlign = 'center';
    soloTouche = function (ev) { var d = TOUCHES[ev.key]; if (d) { ev.preventDefault(); bouger(d); } };
    return function () { fin = true; };
  }

  /* ---------- ✏️ LE SUDOKU DU JOUR ----------
     Une grille par jour et par niveau, LA MÊME POUR TOUTE L'ÉQUIPE :
     elle se tire avec la date comme graine. Elle se fait une fois sur
     cet appareil (gardée dans le navigateur) ; seule la première fois
     qu'on la finit compte pour le record — la refaire, on la connaît. */
  function graine(t) {
    var h = 1779033703 ^ t.length;
    for (var i = 0; i < t.length; i++) { h = Math.imul(h ^ t.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }
  function sdkPossibles(g, i) {
    var r = Math.floor(i / 9), c = i % 9, pris = 0;
    for (var k = 0; k < 9; k++) { pris |= 1 << g[r * 9 + k]; pris |= 1 << g[k * 9 + c]; }
    var br = r - r % 3, bc = c - c % 3;
    for (var y = 0; y < 3; y++) for (var x = 0; x < 3; x++) pris |= 1 << g[(br + y) * 9 + bc + x];
    return pris;
  }
  function sdkCompter(g, limite) {
    var best = -1, bestN = 10, bestM = 0;
    for (var i = 0; i < 81; i++) {
      if (g[i]) continue;
      var m = sdkPossibles(g, i), n = 0;
      for (var v = 1; v <= 9; v++) if (!(m & (1 << v))) n++;
      if (n < bestN) { bestN = n; best = i; bestM = m; if (n === 0) return 0; }
    }
    if (best === -1) return 1;
    var total = 0;
    for (var w = 1; w <= 9 && total < limite; w++) {
      if (bestM & (1 << w)) continue;
      g[best] = w;
      total += sdkCompter(g, limite - total);
      g[best] = 0;
    }
    return total;
  }
  function sdkRemplir(g, rnd) {
    for (var i = 0; i < 81; i++) {
      if (g[i]) continue;
      var m = sdkPossibles(g, i), l = [];
      for (var v = 1; v <= 9; v++) if (!(m & (1 << v))) l.push(v);
      for (var k = l.length - 1; k > 0; k--) { var j = Math.floor(rnd() * (k + 1)); var x = l[k]; l[k] = l[j]; l[j] = x; }
      for (var a = 0; a < l.length; a++) { g[i] = l[a]; if (sdkRemplir(g, rnd)) return true; }
      g[i] = 0;
      return false;
    }
    return true;
  }
  function sdkGrille(jour, niveau) {
    var cle = 'cafe_sudoku:' + jour + ':' + niveau;
    try { var d = JSON.parse(localStorage.getItem(cle) || 'null'); if (d && d.g && d.s) return d; } catch (e) {}
    var rnd = graine('EC-sudoku-' + jour + '-' + niveau);
    var sol = []; for (var i = 0; i < 81; i++) sol.push(0);
    sdkRemplir(sol, rnd);
    var g = sol.slice();
    var ordre = []; for (var k = 0; k < 81; k++) ordre.push(k);
    for (var q = 80; q > 0; q--) { var j = Math.floor(rnd() * (q + 1)); var x = ordre[q]; ordre[q] = ordre[j]; ordre[j] = x; }
    var vise = { facile: 40, moyen: 32, difficile: 26 }[niveau] || 40;
    var restent = 81;
    for (var n = 0; n < 81 && restent > vise; n++) {
      var p = ordre[n], garde = g[p];
      g[p] = 0;
      if (sdkCompter(g.slice(), 2) !== 1) g[p] = garde; else restent--;
    }
    var out = { g: g, s: sol };
    try { localStorage.setItem(cle, JSON.stringify(out)); } catch (e) {}
    return out;
  }
  function jourDeParis() {
    try { return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }); } catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function jeuSudoku(zone, niveau, finir, message) {
    var jour = jourDeParis();
    var G = sdkGrille(jour, niveau);
    var cleJeu = 'cafe_sudoku_jeu:' + jour + ':' + niveau;
    var etat = null;
    try { etat = JSON.parse(localStorage.getItem(cleJeu) || 'null'); } catch (e) {}
    if (!etat || !etat.v) etat = { v: G.g.slice(), ecoule: 0, fait: false, temps: 0 };
    var v = etat.v, choisie = -1, debut = Date.now(), fini = etat.fait;
    var jj = jour.split('-');
    var barre = el('div', 'cfSoloBarre', '<span>📅 Grille du ' + jj[2] + '/' + jj[1] + '</span><span class="t">⏱️ ' + minSec(etat.ecoule) + '</span>');
    zone.appendChild(barre);
    var g = el('div', 'cfSdk');
    var cases = [];
    for (var i = 0; i < 81; i++) {
      var c = el('div', '');
      c.setAttribute('data-i', String(i));
      if ((i % 9) % 3 === 2 && i % 9 !== 8) c.className = 'bd';
      if (Math.floor(i / 9) % 3 === 2 && Math.floor(i / 9) !== 8) c.className += ' bb';
      cases.push(c);
      g.appendChild(c);
    }
    zone.appendChild(g);
    var pad = el('div', 'cfPad');
    for (var n = 1; n <= 10; n++) {
      (function (n) {
        var b = el('button', '', n === 10 ? '⌫' : String(n));
        b.type = 'button';
        b.addEventListener('click', function () { poser(n === 10 ? 0 : n); });
        pad.appendChild(b);
      })(n);
    }
    zone.appendChild(pad);
    function ecoule() { return fini ? etat.temps : etat.ecoule + Math.round((Date.now() - debut) / 1000); }
    var m = setInterval(function () { if (!fini) barre.querySelector('.t').textContent = '⏱️ ' + minSec(ecoule()); }, 500);
    function garder() { etat.v = v; etat.ecoule = ecoule(); try { localStorage.setItem(cleJeu, JSON.stringify(etat)); } catch (e) {} }
    function conflit(i) {
      if (!v[i]) return false;
      var r = Math.floor(i / 9), c2 = i % 9, br = r - r % 3, bc = c2 - c2 % 3;
      for (var k = 0; k < 9; k++) {
        if (r * 9 + k !== i && v[r * 9 + k] === v[i]) return true;
        if (k * 9 + c2 !== i && v[k * 9 + c2] === v[i]) return true;
        var j = (br + Math.floor(k / 3)) * 9 + bc + k % 3;
        if (j !== i && v[j] === v[i]) return true;
      }
      return false;
    }
    function peindre() {
      var meme = choisie >= 0 ? v[choisie] : 0;
      cases.forEach(function (c, i) {
        c.textContent = v[i] ? String(v[i]) : '';
        c.classList.toggle('donne', !!G.g[i]);
        c.classList.toggle('sel', i === choisie);
        c.classList.toggle('meme', !!meme && v[i] === meme && i !== choisie);
        c.classList.toggle('faux', !G.g[i] && conflit(i));
      });
    }
    function poser(n) {
      if (fini || choisie < 0 || G.g[choisie]) return;
      v[choisie] = n;
      peindre();
      garder();
      for (var i = 0; i < 81; i++) if (v[i] !== G.s[i]) return;
      fini = true;
      etat.temps = ecoule();
      var dejaFait = etat.fait;
      etat.fait = true;
      garder();
      if (dejaFait) message.innerHTML = '<b>✅ Grille finie.</b>';
      else finir(Math.max(1, etat.temps), '🎉 Grille finie en ' + minSec(etat.temps) + ' !');
    }
    g.addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('[data-i]') : null;
      if (!c) return;
      choisie = Number(c.getAttribute('data-i'));
      peindre();
    });
    soloTouche = function (ev) {
      if (/^[1-9]$/.test(ev.key)) { ev.preventDefault(); poser(Number(ev.key)); return; }
      if (ev.key === 'Backspace' || ev.key === 'Delete' || ev.key === '0') { ev.preventDefault(); poser(0); return; }
      var d = TOUCHES[ev.key];
      if (d && /^Arrow/.test(ev.key)) {
        ev.preventDefault();
        if (choisie < 0) choisie = 0;
        else choisie = d === 'd' ? Math.min(80, choisie + 1) : d === 'g' ? Math.max(0, choisie - 1) : d === 'b' ? Math.min(80, choisie + 9) : Math.max(0, choisie - 9);
        peindre();
      }
    };
    if (fini) message.innerHTML = '<b>✅ Grille du jour déjà finie en ' + minSec(etat.temps) + '. La prochaine arrive demain.</b>';
    else zone.appendChild(el('div', 'cfAide', 'La même grille pour toute l’équipe aujourd’hui. Touche une case, puis un chiffre. Seule ta première fois compte.'));
    if (zone.lastChild.className === 'cfAide') zone.lastChild.style.textAlign = 'center';
    peindre();
    return function () { if (!fini) garder(); clearInterval(m); };
  }

  /* ============================================================
     🏆 LE PALMARÈS, un classement par jeu
     ============================================================ */
  var jeuPalmares = 'chifoumi';
  function nomNiveau(n) { return n === 'facile' ? 'Facile' : n === 'fort' ? 'Fort' : 'Moyen'; }
  /* 🤖 contre l'ordinateur : une ligne par personne, ses scores par niveau */
  function tableOrdi(l, sansNom) {
    var parQui = {};
    l.forEach(function (x) { (parQui[x.cle] = parQui[x.cle] || { nom: x.nom, n: {} }).n[x.niveau] = x; });
    var t = el('table', 'cfPalm');
    Object.keys(parQui).forEach(function (k) {
      var q = parQui[k];
      var d = ['facile', 'moyen', 'fort'].filter(function (n) { return q.n[n]; }).map(function (n) {
        return (n === 'facile' ? '🙂 ' : n === 'fort' ? '😈 ' : '😐 ') + q.n[n].victoires + ' – ' + q.n[n].defaites;
      }).join(' · ');
      t.appendChild(el('tr', '', '<td>' + (sansNom ? 'Gagnées – perdues' : esc(q.nom)) + '</td><td>' + esc(d) + '</td>'));
    });
    return t;
  }
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
      z.appendChild(chips(ORDRE.map(function (k) { return [k, JEUX[k].ic + ' ' + JEUX[k].nom]; }).concat(ORDRE_SOLO.map(function (k) { return [k, SOLO[k].e + ' ' + SOLO[k].nom]; })), jeuPalmares, function (k) { jeuPalmares = k; ouvrirPalmares(); }));
      if (SOLO[jeuPalmares]) {
        /* 🏅 un jeu solo : les records, niveau par niveau */
        var S = SOLO[jeuPalmares], rec = (r && r.records && r.records[jeuPalmares]) || {};
        (S.niveaux || [['', '']]).forEach(function (nv) {
          z.appendChild(lab('🏅 ' + S.nom + (nv[1] ? ' · ' + nv[1] : '')));
          var lr = rec[nv[0]] || [];
          if (lr.length) z.appendChild(tableRecords(jeuPalmares, lr, 10));
          else z.appendChild(el('div', 'cfAide', 'Pas encore de record.'));
        });
      } else {
        var l = pal[jeuPalmares] || [];
        if (jeuPalmares === 'paille') l = l.slice().sort(function (a, b) { return a.defaites - b.defaites || b.victoires - a.victoires; });
        z.appendChild(lab(JEUX[jeuPalmares].nom + ' · entre collègues'));
        if (l.length) z.appendChild(tablePalmares(jeuPalmares, l));
        else z.appendChild(el('div', 'cfAide', 'Personne n’y a encore joué.'));
        /* 🤖 contre l'ordinateur : à part */
        var lo = (r && r.ordi && r.ordi[jeuPalmares]) || [];
        if (lo.length) { z.appendChild(lab('🤖 Contre l’ordinateur')); z.appendChild(tableOrdi(lo)); }
      }
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
  /* ============================================================
     📊 v1498 — LES STATISTIQUES (David seul)

     David, le 19/11 : « un onglet statistiques visible que par moi du
     coin café, avec le nombre de fois joué par personne par jeu, le
     temps passé par jeu ». Par personne, puis par jeu, puis jour par
     jour, sur la période choisie. Le serveur refuse les autres.
     ============================================================ */
  var periodeStats = 7;
  var statsVisibles = false;
  function dureeDite(s) {
    s = Math.max(0, Math.round(Number(s) || 0));
    if (s < 60) return s + ' s';
    var m = Math.round(s / 60);
    if (m < 60) return m + ' min';
    return Math.floor(m / 60) + ' h ' + deuxChiffres(m % 60);
  }
  function nomDuJeu(k) {
    var ordi = /:ordi$/.test(k), b = k.replace(/:ordi$/, '');
    var J = JEUX[b], S = SOLO[b];
    var t = J ? J.ic + ' ' + J.nom : S ? S.e + ' ' + S.nom : b;
    return t + (ordi ? ' (🤖 ordi)' : '');
  }
  function jourDitCourt(j) {
    var m = String(j || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return j;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var noms = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    return noms[d.getDay()] + ' ' + m[3] + '/' + m[2];
  }
  function ouvrirStats() {
    var f = fenetre('stats', '📊 Les statistiques du coin café', 560);
    f.corps.appendChild(chips([[1, 'Aujourd’hui'], [7, '7 jours'], [30, '30 jours'], [0, 'Tout']], periodeStats,
      function (v) { periodeStats = Number(v); ouvrirStats(); }));
    var z = el('div', '', '<div class="cfEtat">Un instant…</div>');
    f.corps.appendChild(z);
    f.bas.appendChild(bouton('Retour', false, ouvrirCoin));
    appeler('stats', { jours: periodeStats }).then(function (r) {
      if (!F || F.ecran !== 'stats') return;
      z.innerHTML = '';
      var l = (r && r.lignes) || [];
      if (!l.length) {
        z.appendChild(el('div', 'cfAide', 'Personne n’a joué sur cette période.' + (r && r.debut ? '' : ' Les parties se comptent depuis la v1498 ; avant, rien n’était noté.')));
        return;
      }
      /* par personne : le total, puis jeu par jeu */
      var gens = {};
      l.forEach(function (x) {
        var g = gens[x.cle] = gens[x.cle] || { nom: x.nom, parties: 0, secondes: 0, jeux: [] };
        g.parties += x.parties; g.secondes += x.secondes; g.jeux.push(x);
      });
      var ordre = Object.keys(gens).sort(function (a, b) { return gens[b].secondes - gens[a].secondes || gens[b].parties - gens[a].parties; });
      z.appendChild(lab('Par personne'));
      ordre.forEach(function (k) {
        var g = gens[k];
        var t = el('table', 'cfPalm');
        t.appendChild(el('tr', '', '<td><b>' + esc(prenom(g.nom) || g.nom) + '</b></td><td>' + g.parties + ' partie' + (g.parties > 1 ? 's' : '') + ' · ' + esc(dureeDite(g.secondes)) + '</td>'));
        g.jeux.sort(function (a, b) { return b.secondes - a.secondes || b.parties - a.parties; }).forEach(function (x) {
          t.appendChild(el('tr', '', '<td style="padding-left:18px;font-weight:400">' + esc(nomDuJeu(x.jeu)) + '</td><td style="font-weight:600">' +
            x.parties + ' · ' + esc(dureeDite(x.secondes)) + '</td>'));
        });
        z.appendChild(t);
      });
      /* par jeu : toute l'équipe */
      var jeux = {};
      l.forEach(function (x) {
        var j = jeux[x.jeu] = jeux[x.jeu] || { parties: 0, secondes: 0, gens: 0 };
        j.parties += x.parties; j.secondes += x.secondes; j.gens += 1;
      });
      z.appendChild(lab('Par jeu'));
      var tj = el('table', 'cfPalm');
      Object.keys(jeux).sort(function (a, b) { return jeux[b].secondes - jeux[a].secondes || jeux[b].parties - jeux[a].parties; }).forEach(function (k) {
        var j = jeux[k];
        tj.appendChild(el('tr', '', '<td>' + esc(nomDuJeu(k)) + '<br><small style="color:var(--muted);font-weight:400">' + j.gens + ' joueur' + (j.gens > 1 ? 's' : '') + '</small></td><td>' +
          j.parties + ' partie' + (j.parties > 1 ? 's' : '') + ' · ' + esc(dureeDite(j.secondes)) + '</td>'));
      });
      z.appendChild(tj);
      /* jour par jour */
      var pj = (r && r.parJour) || [];
      if (pj.length > 1) {
        z.appendChild(lab('Jour par jour'));
        var td = el('table', 'cfPalm');
        pj.forEach(function (x) {
          td.appendChild(el('tr', '', '<td>' + esc(jourDitCourt(x.jour)) + '</td><td>' + x.parties + ' partie' + (x.parties > 1 ? 's' : '') + ' · ' + esc(dureeDite(x.secondes)) + '</td>'));
        });
        z.appendChild(td);
      }
      z.appendChild(el('div', 'cfAide', 'Comptées depuis le ' + esc(jourDitCourt(r.debut)) + '. Une partie à plusieurs compte pour chaque joueur, du départ à la fin ; ' +
        'un jeu solo, le temps passé page ouverte (une heure au plus). Les parties avec un élève ne laissent aucune trace, ici non plus.'));
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
     📰 v1460 — LES INFOS : ACTUALITÉS, HOROSCOPE, MÉTÉO

     David, le 18 novembre : « rajoute-moi l'horoscope, les actualités
     monde, France, Saint-Brieuc, auto-école etc. par filtre ». Le
     Worker lit les flux RSS des journaux (et Open-Meteo pour la
     météo) et garde sa lecture pour toute l'équipe ; ici, on montre :
     des titres, la source, l'heure, et un appui ouvre l'article sur le
     site du journal. L'horoscope : chacun choisit son signe une fois
     (gardé sur cet appareil), il s'affiche en grand, les 11 autres
     dessous.
     ============================================================ */
  /* 📰 v1461 — trois fenêtres : l'horoscope, les infos (avec leurs
     filtres), la météo. Chacune a son bouton dans le coin café. */
  var FILTRES_ACTUS = [['monde', '🌍 Monde'], ['france', '🇫🇷 France'],
    ['local', '📍 Saint-Brieuc · Loudéac'], ['route', '🚗 Auto-école et route'], ['sport', '⚽ Sport']];
  var TITRES_INFOS = { horoscope: '🔮 L’horoscope', infos: '📰 Les infos', meteo: '⛅ La météo' };
  var infosLues = {};           /* filtre → dernière réponse, le temps de la page */
  function memo(cle, val) {
    try {
      if (val === undefined) return localStorage.getItem(cle) || '';
      if (val === null) localStorage.removeItem(cle); else localStorage.setItem(cle, val);
    } catch (e) {}
    return '';
  }
  var filtreActus = '', genreInfos = 'infos', vueInfos = '';
  function ouvrirInfos(genre, relire) {
    if (!O || O.mode !== 'equipe') return;
    genreInfos = TITRES_INFOS[genre] ? genre : 'infos';
    var f = fenetre('infos', TITRES_INFOS[genreInfos], 600);
    if (genreInfos === 'infos') {
      if (!filtreActus) filtreActus = memo('ec_cafe_infos') || 'monde';
      if (!FILTRES_ACTUS.some(function (x) { return x[0] === filtreActus; })) filtreActus = 'monde';
      f.corps.appendChild(chips(FILTRES_ACTUS, filtreActus, function (k) { filtreActus = k; memo('ec_cafe_infos', k); ouvrirInfos('infos'); }));
    }
    var z = el('div', 'cfInfos');
    f.corps.appendChild(z);
    f.bas.appendChild(bouton('Retour', false, ouvrirCoin));
    var filtre = genreInfos === 'infos' ? filtreActus : genreInfos;
    vueInfos = filtre;
    var r0 = infosLues[filtre];
    if (r0 && !relire && Date.now() - r0._lu < 5 * 60000) { dessinerInfos(z, r0); return; }
    z.innerHTML = '<div class="cfEtat">' + (genreInfos === 'meteo' ? 'Un instant, je regarde le ciel…' : (genreInfos === 'horoscope' ? 'Un instant, je lis les astres…' : 'Un instant, je lis les journaux…')) + '</div>';
    appeler('infos', { filtre: filtre, relire: relire ? 1 : 0 }).then(function (r) {
      r._lu = Date.now();
      infosLues[filtre] = r;
      if (!F || F.ecran !== 'infos' || vueInfos !== filtre) return;
      dessinerInfos(z, r);
    }).catch(function (e) {
      if (!F || F.ecran !== 'infos' || vueInfos !== filtre) return;
      z.innerHTML = '';
      z.appendChild(el('div', 'cfEtat', '⚠️ ' + esc(e.message || e)));
    });
  }
  function quandDit(d) {
    if (!d) return '';
    var m = Math.round((Date.now() - d) / 60000);
    if (m < 1) return 'à l’instant';
    if (m < 60) return 'il y a ' + m + ' min';
    if (m < 24 * 60) return 'il y a ' + Math.round(m / 60) + ' h';
    var x = new Date(d);
    return 'le ' + ('0' + x.getDate()).slice(-2) + '/' + ('0' + (x.getMonth() + 1)).slice(-2);
  }
  function heureDe(d) { var x = new Date(d); return ('0' + x.getHours()).slice(-2) + ':' + ('0' + x.getMinutes()).slice(-2); }
  function lienExterne(href, cls, html) {
    var a = el('a', cls, html);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }
  function dessinerInfos(z, r) {
    z.innerHTML = '';
    if (r.ancien) z.appendChild(el('div', 'cfAide cfAncien', '⚠️ Pas de réponse pour l’instant : voici la lecture de ' + heureDe(r.quand) + '.'));
    if (r.filtre === 'horoscope') dessinerHoroscope(z, r);
    else if (r.filtre === 'meteo') dessinerMeteo(z, r);
    else dessinerArticles(z, r);
    /* le pied : quand, relire, d'où ça vient */
    var pied = el('div', 'cfInfosPied');
    var maj = el('span', '', 'Mis à jour à ' + heureDe(r.quand || Date.now()));
    var rl = el('button', '', '↻ Relire');
    rl.type = 'button';
    rl.addEventListener('click', function () { delete infosLues[r.filtre]; ouvrirInfos(genreInfos, true); });
    pied.appendChild(maj);
    pied.appendChild(rl);
    z.appendChild(pied);
    /* une ligne par nom : « muet » seulement si aucun de ses flux n'a répondu */
    var parNom = {}, noms = [];
    (r.sources || []).forEach(function (s) { if (!(s.nom in parNom)) { parNom[s.nom] = false; noms.push(s.nom); } if (s.ok) parNom[s.nom] = true; });
    var src = noms.map(function (n) { return esc(n) + (parNom[n] ? '' : ' (muet)'); });
    if (src.length) z.appendChild(el('div', 'cfAide', 'Sources : ' + src.join(' · ') + '.'));
  }
  function dessinerArticles(z, r) {
    var l = r.articles || [];
    if (!l.length) { z.appendChild(el('div', 'cfEtat', 'Rien de neuf pour l’instant.')); return; }
    l.forEach(function (a) {
      var c = lienExterne(a.l, 'cfInfo', '');
      if (a.i) {
        var im = el('img', 'im');
        im.alt = '';
        im.loading = 'lazy';
        im.referrerPolicy = 'no-referrer';
        im.onerror = function () { if (im.parentNode) im.parentNode.removeChild(im); };
        im.src = a.i;
        c.appendChild(im);
      }
      c.appendChild(el('div', '', '<b>' + esc(a.t) + '</b><small>' + esc([a.s, quandDit(a.d)].filter(Boolean).join(' · ')) + '</small>' +
        (a.r ? '<p>' + esc(a.r) + '</p>' : '')));
      z.appendChild(c);
    });
  }
  function jourDit(d) {
    try { return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return ''; }
  }
  function dessinerHoroscope(z, r) {
    var l = r.signes || [];
    var moi = memo('ec_cafe_signe');
    var S = null;
    l.forEach(function (s) { if (s.cle === moi) S = s; });
    if (!S) {
      z.appendChild(lab('Ton signe ?'));
      z.appendChild(el('div', 'cfAide', 'Choisis-le une fois : il s’affichera en premier à chaque visite (sur cet appareil).'));
      var g = el('div', 'cfSignes');
      l.forEach(function (s) {
        var b = el('button', '', '<span class="e">' + esc(s.e) + '</span>' + esc(s.nom) + '<small>' + esc(s.dates) + '</small>');
        b.type = 'button';
        b.addEventListener('click', function () { memo('ec_cafe_signe', s.cle); dessinerInfos(z, r); });
        g.appendChild(b);
      });
      z.appendChild(g);
      return;
    }
    /* 🔮 v1461 — « plus de texte, pour tous les horoscopes » : le jour,
       la semaine, le mois et la saison, tels que le flux les donne. Un
       texte que le site a coupé garde son « Lire la suite ». */
    var parties = function (s) {
      var l = (s.parties && s.parties.length) ? s.parties : (s.texte ? [{ quoi: 'jour', titre: 'Aujourd’hui', texte: s.texte, lien: s.lien, coupe: true }] : []);
      var b = el('div', 'cfHoroParts');
      l.forEach(function (x) {
        var p = el('div', 'part', '<b>' + esc(x.titre) + '</b><p>' + esc(x.texte) + '</p>');
        if (x.lien && x.coupe) p.lastChild.appendChild(document.createTextNode(' '));
        if (x.lien && x.coupe) p.lastChild.appendChild(lienExterne(x.lien, 'suite', 'Lire la suite ↗'));
        b.appendChild(p);
      });
      return b;
    };
    var c = el('div', 'cfHoro');
    c.appendChild(el('div', 'tete', '<span class="e">' + esc(S.e) + '</span><div>' + esc(S.nom) +
      '<small>' + esc(S.ok && S.date ? 'Horoscope du ' + jourDit(S.date) : S.dates) + '</small></div>'));
    if (S.ok) c.appendChild(parties(S));
    else c.appendChild(el('p', '', 'Pas d’horoscope pour l’instant : le site ne répond pas.'));
    var bas = el('div', 'bas');
    var ch = el('button', 'changer', 'Changer de signe');
    ch.type = 'button';
    ch.addEventListener('click', function () { memo('ec_cafe_signe', null); dessinerInfos(z, r); });
    bas.appendChild(ch);
    c.appendChild(bas);
    z.appendChild(c);
    z.appendChild(lab('Les autres signes'));
    l.forEach(function (s) {
      if (s.cle === S.cle) return;
      var d = el('details', 'cfHoroL');
      d.appendChild(el('summary', '', '<span class="e">' + esc(s.e) + '</span>' + esc(s.nom) + '<small>' + esc(s.dates) + '</small>'));
      var p = el('div', 'txt');
      if (s.ok) p.appendChild(parties(s)); else p.textContent = 'Pas d’horoscope pour l’instant.';
      d.appendChild(p);
      z.appendChild(d);
    });
    z.appendChild(el('div', 'cfAide', 'Horoscope : <a href="https://www.mon-horoscope-du-jour.com/" target="_blank" rel="noopener noreferrer">Mon Horoscope du Jour</a>.'));
  }
  function degres(x) { return (x === null || x === undefined || isNaN(Number(x))) ? '–' : Math.round(Number(x)) + '°'; }
  function dessinerMeteo(z, r) {
    var l = r.villes || [];
    l.forEach(function (v) {
      var c = el('div', 'cfMeteo');
      if (!v.ok) { c.appendChild(el('div', 'tete', '<div>' + esc(v.nom) + '<small>la météo ne répond pas</small></div>')); z.appendChild(c); return; }
      var m = v.maintenant || {};
      c.appendChild(el('div', 'tete', '<span class="e">' + esc(m.e) + '</span><div>' + esc(v.nom) +
        '<small>' + esc(m.lib) + ' · ressenti ' + degres(m.ressenti) + ' · vent ' + Math.round(Number(m.vent) || 0) + ' km/h' +
        (Number(m.rafales) >= 40 ? ' (rafales ' + Math.round(Number(m.rafales)) + ')' : '') + '</small></div><b class="t">' + degres(m.t) + '</b>'));
      if (v.conseil) c.appendChild(el('div', 'conseil', esc(v.conseil)));
      var j = el('div', 'jours');
      (v.jours || []).forEach(function (x, i) {
        var nom = i === 0 ? 'Aujourd’hui' : (i === 1 ? 'Demain' : (function () { try { return new Date(x.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long' }); } catch (e) { return x.date; } })());
        j.appendChild(el('div', 'j', '<small>' + esc(nom) + '</small><span class="e">' + esc(x.e) + '</span><b>' + degres(x.min) + ' / ' + degres(x.max) + '</b><small>' +
          (Number(x.pluie) > 0 ? '💧 ' + Math.round(Number(x.pluie)) + ' %' : 'sec') + '</small>'));
      });
      c.appendChild(j);
      z.appendChild(c);
    });
    z.appendChild(el('div', 'cfAide', 'Météo : <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>.'));
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
      /* la barre d'espace (ou Entrée) tape pendant la course */
      document.addEventListener('keydown', function (ev) {
        /* 🕹️ le clavier du jeu solo ouvert (pas quand on écrit dans un champ) */
        if (soloTouche && F && F.ecran === 'solo' && !(ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName))) { soloTouche(ev); return; }
        var A = F && F.anim;
        if (!A || A.genre !== 'course' || !A.taper || ev.repeat) return;
        if (ev.key === ' ' || ev.key === 'Enter') A.taper(ev);
      });
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
        ouvrirCeQuiAttend(l, true);   /* on a touché la notification : on l'ouvre, même pendant un cours */
        if (!F && O.mode === 'equipe') ouvrirCoin();
      }).catch(function () {});
    },
    porteCachee: porteCachee,
    ouvrirPartie: function (id) { ouvrirPartie(id); },
    fermer: function () { fermer(true); cacherBandeau(); parties = {}; enBandeau = {}; },
    _etat: function () { return { F: F && { ecran: F.ecran, id: F.id }, parties: parties, ecart: ecart }; }
  };
})();
