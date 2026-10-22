/* Déployé le 22/10/2026 à 10:11 — v1237 */
/* ============================================================
   ec-creneaux.js — 🗓️ LES CRÉNEAUX LIBRES (v1234)

   David, le 21 octobre : « comme tu sais lire Drivup, j'aimerais à
   un endroit une liste où des cours sont ouverts sur les moniteurs
   sans élève inscrit, ou alors quand c'est écrit Résa permis, ou
   alors sur une journée normale d'un moniteur s'il n'a aucun cours
   d'ouvert. Je me sers de ces créneaux pour proposer à ceux qui ont
   des permis prévus qui n'ont pas encore fait leur planning, ou
   alors quand je dois décaler des élèves. »

   Ses choix, sur le schéma :
   · la liste dans Élèves › 🗓️ Créneaux libres (sous Rappels de
     cours), avec « 👥 À placer » à côté (permis prévu, « 📆 Tout est
     planifié » pas coché dans 🎓 Suivi permis) ;
   · dans 🎓 Suivi permis, un bouton en haut ET à côté de « 📆 Il doit
     planifier encore des choses », qui ouvre une fenêtre où l'on
     coche des créneaux : 📋 copier le message, ou 💬 l'envoyer dans
     sa messagerie (« Le bureau ») ;
   · « rien d'ouvert » se compte sur des HORAIRES PAR MONITEUR, réglés
     ici (⚙️) ;
   · la lecture se refait à chaque clic du favori « 📥 » sur le
     planning d'une agence (quatre semaines à partir d'aujourd'hui).

   Ce que le favori envoie est réduit ici à l'essentiel (les colonnes
   des moniteurs de l'appli seulement) puis gardé par le Worker (D1),
   UNE lecture : la dernière.
   ============================================================ */

let creneauxEtat = { lecture: null, horaires: {}, masques: [], luA: 0 };
/* 🚫 v1235 — un créneau retiré à la main : « jour|heure|moniteur » */
function cleDuCreneau(c){ return c.jour + '|' + c.debut + '|' + c.moniteur; }
function creneauMasque(c){ return (creneauxEtat.masques || []).indexOf(cleDuCreneau(c)) !== -1; }
async function masquerLeCreneau(c, masque){
  const r = await appelPrep({ action: 'creneauxMasquer', cle: cleDuCreneau(c), masque: masque ? 1 : 0 });
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
  const k = cleDuCreneau(c);
  creneauxEtat.masques = (creneauxEtat.masques || []).filter(x => x !== k);
  if(masque) creneauxEtat.masques.push(k);
}
const filtresCreneaux = { genre: 'tout', moniteur: '', agence: '' };

/* « Lundi » … : les clés des horaires, du lundi au samedi */
const JOURS_CRENEAUX = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const NOMS_JOURS_CRENEAUX = { lun: 'Lun', mar: 'Mar', mer: 'Mer', jeu: 'Jeu', ven: 'Ven', sam: 'Sam' };
/* Tant qu'un moniteur n'a pas ses horaires : une journée ordinaire */
const HORAIRES_PAR_DEFAUT = { lun: '8-12 · 13-19', mar: '8-12 · 13-19', mer: '8-12 · 13-19',
                              jeu: '8-12 · 13-19', ven: '8-12 · 13-19', sam: '8-12' };
const DUREE_MINI_RIEN = 60;   /* un trou de moins d'une heure ne se propose pas */

function minutesCreneau(h){
  const m = String(h || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? (+m[1]) * 60 + (+m[2]) : NaN;
}
function heureCreneau(n){
  return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
}
function heureLisibleCreneau(h){
  const m = String(h || '').match(/^(\d{2}):(\d{2})$/);
  if(!m) return h;
  return (+m[1]) + 'h' + (m[2] === '00' ? '' : m[2]);
}
function jourPlusCreneau(iso, n){
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)).toISOString().slice(0, 10) : '';
}
function cleDuJourCreneau(iso){
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return '';
  return ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'][new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
}
function jourLongCreneau(iso){
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return iso;
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'numeric' });
}
function aujourdhuiCreneau(){
  return (typeof todayLocal === 'function') ? todayLocal() : new Date().toISOString().slice(0, 10);
}
function maintenantMinutesCreneau(){
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/* « 8-12 · 13h30–19h » → [[480, 720], [810, 1140]] */
function plagesDesHoraires(texte){
  const out = [];
  const re = /(\d{1,2})(?:[h:](\d{2}))?\s*[-–]\s*(\d{1,2})(?:[h:](\d{2}))?/g;
  let m;
  while((m = re.exec(String(texte || '')))){
    const a = (+m[1]) * 60 + (m[2] ? +m[2] : 0), b = (+m[3]) * 60 + (m[4] ? +m[4] : 0);
    if(b > a && a >= 0 && b <= 24 * 60) out.push([a, b]);
  }
  return out;
}
function horairesDuMoniteur(nom, horaires){
  const h = (horaires || {})[nom];
  return h && typeof h === 'object' ? Object.assign({}, HORAIRES_PAR_DEFAUT, h) : Object.assign({}, HORAIRES_PAR_DEFAUT);
}

/* ------------------------------------------------------------
   ① CE QUE LE FAVORI APPORTE → la lecture gardée
   ------------------------------------------------------------ */
const CRENEAU_LECON = /conduite|examen blanc|test exam blanc|eval voiture|remise a niveau|simu.*moniteur/;
const CRENEAU_PAS_LECON = /moto|remorque|voiturette|baby|theorie|salle|etg|code/;

function compacterCreneauxDrivup(c){
  const sa = v => (typeof sansAccentDrivup === 'function') ? sansAccentDrivup(v)
    : String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const moniteurDe = t => (typeof moniteurDeLAppliDrivup === 'function') ? moniteurDeLAppliDrivup(t) : '';
  const moniteurs = [];
  const index = {};
  /* v1236 — deux colonnes Drivup pour le même moniteur (« Chrystel »
     et « ChrystelAnQn ») : UN moniteur, et les cours des deux comptent.
     Sinon la colonne vide le donnait libre toute la journée. */
  (c.ressources || []).forEach(r => {
    const nom = moniteurDe(r.titre);
    if(!nom || index[String(r.id)] !== undefined) return;
    const deja = moniteurs.findIndex(m => m.nom === nom);
    if(deja !== -1){ index[String(r.id)] = deja; return; }
    index[String(r.id)] = moniteurs.length;
    moniteurs.push({ res: String(r.id), titre: String(r.titre || ''), nom: nom });
  });
  const prest = c.prestations || {};
  const min = h => { const m = String(h || '').match(/^(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : NaN; };
  /* Les repères posés sur une colonne (« .LOUDEAC », « . 3-4 », « 1. Passerelle ») */
  const estRepere = e => { const brut = String(prest[e.type] || '').trim(), t = String(e.titre || '').trim();
    return /^\d*\s*[.·•]/.test(brut) || /^[.·•]\s*[\w -]{0,20}$/.test(t); };
  const evs = (c.evenements || []).filter(e => index[String(e.res)] !== undefined);
  /* La séance d'un simulateur : le repère « . 3 », « . 3-4 » posé sur la
     même colonne, pendant le simulateur (relevé dans Drivup le 22/10).
     Un repère de voiture (« . 2 » à 7h45) commence avant : il ne compte pas. */
  const seanceDuRepere = e => {
    const d = min(e.debut), f = min(e.fin);
    const r = evs.find(x => x !== e && String(x.res) === String(e.res) && x.jour === e.jour && estRepere(x) &&
      min(x.debut) < f && min(x.fin) > d && (min(x.debut) >= d - 5 || min(x.fin) >= f - 5) && /^\d*\s*[.·•]\s*\d+(\s*(-|et|&)\s*\d+)?\s*$/i.test(String(prest[x.type] || x.titre || '').trim()));
    return r ? String(prest[r.type] || r.titre).replace(/^\d*\s*[.·•]\s*/, '').trim() : '';
  };
  const ev = [];
  evs.forEach(e => {
    const i = index[String(e.res)];
    const brut = String(prest[e.type] || '').trim();
    const nom = sa(brut);
    const titre = String(e.titre || '').trim();
    /* v1236 — un repère n'est pas un cours, mais le moniteur n'est pas
       libre pour autant (« .LOUDEAC » : il est à Loudéac) : occupé. */
    let genre = 'x', libelle = '';
    if(estRepere(e)){ ev.push([i, e.jour, e.debut, e.fin, 'x', '', '', '']); return; }
    const nbr = Number(e.nbr) || 0;
    const pl = String(e.places || '').match(/^(\d+)\/(\d+)$/);
    if(/simu.*moniteur/.test(nom) && (nbr === 1 || (pl && +pl[1] >= 1 && +pl[1] < +pl[2]))){
      /* 🕹️ le simulateur avec moniteur où il reste une place (2 au plus) */
      genre = 's';
      const seance = seanceDuRepere(e) || e.seance || '';
      libelle = (e.intitule || brut) + ' · 1/2 · ' + (seance ? 'séance « ' + seance + ' »' : 'séance pas écrite') +
        (e.inscrit ? ' · avec ' + e.inscrit : '');
    }else if(String(e.examen || '0') !== '0'){
      genre = 'p';   /* un permis : occupé, et on peut proposer juste après */
    }else if(/trajet/.test(nom)){
      genre = 't';
    }else if(!nbr && (/\b\d+\s*h\s*dispo\b/.test(nom) || /\b\d+\s*h\s*dispo\b/i.test(titre)) && !/pas de/.test(nom)){
      genre = 'd'; libelle = titre && !/^\s*$/.test(titre) ? titre : brut;   /* ✍️ « 1h dispo » écrit dans Drivup */
    }else if(/\br[ée]sap?\b/i.test(titre) || /\bresap?\b/.test(nom)){
      genre = 'r'; libelle = titre || brut;
    }else if(!nbr && String(e.examen || '0') === '0' && CRENEAU_LECON.test(nom) && !CRENEAU_PAS_LECON.test(nom)){
      genre = 'o'; libelle = brut + (e.places ? ' · ' + e.places : '');
    }
    const agence = (/loud/i.test(String(e.adresse || '')) || /loudeac/.test(nom)) ? 'L'
                 : (/brieuc/i.test(String(e.adresse || '')) || /brieuc/.test(nom)) ? 'SB' : '';
    const boite = genre === 's' ? (/\bbea\b/.test(nom) || /\bbea\b/i.test(e.intitule || '') ? 'bea' : 'bv') : genre !== 'o' ? '' : (/bv bea/.test(nom) ? '' : /\bbea\b/.test(nom) ? 'bea' : (/\bbv\b/.test(nom) || /^conduite \d/.test(nom)) ? 'bv' : '');
    ev.push([i, e.jour, e.debut, e.fin, genre, libelle, agence, boite]);
  });
  return { du: c.du, au: c.au, moniteurs: moniteurs, ev: ev };
}

async function enregistrerLesCreneauxDrivup(c){
  const lecture = compacterCreneauxDrivup(c);
  const r = await appelPrep({ action: 'creneauxPoser', lecture: lecture });
  if(!r || r.status !== 'ok') throw new Error((r && (r.message || r.error)) || 'refusé');
  creneauxEtat.luA = 0;
  const lignes = creneauxCalcules(Object.assign({}, lecture, { le: Date.now() }), creneauxEtat.horaires || {});
  return { ouverts: lignes.filter(x => x.genre === 'ouvert').length, resa: lignes.filter(x => x.genre === 'resa').length,
           simu: lignes.filter(x => x.genre === 'simu').length, dispo: lignes.filter(x => x.genre === 'dispo').length,
           rien: lignes.filter(x => x.genre === 'rien').length };
}

/* ------------------------------------------------------------
   ② LA LISTE, CALCULÉE À L'AFFICHAGE (les horaires peuvent changer)
   ------------------------------------------------------------ */
/* v1236 — les créneaux de 2h où l'on place les cours (David, le 22/10) */
const BLOCS_CRENEAU = [[480, 600], [600, 720], [780, 900], [900, 1020], [1020, 1140]];
function creneauxCalcules(lecture, horaires){
  if(!lecture || !Array.isArray(lecture.ev)) return [];
  const auj = aujourdhuiCreneau();
  const mnt = maintenantMinutesCreneau();
  const passe = (j, fin) => j < auj || (j === auj && minutesCreneau(fin) <= mnt);
  const out = [];
  const lieu = a => a === 'L' ? 'loudeac' : a === 'SB' ? 'sb' : '';
  const GENRE = { o: 'ouvert', s: 'simu', r: 'resa', d: 'dispo' };
  (lecture.ev || []).forEach(e => {
    if(!GENRE[e[4]] || passe(e[1], e[3])) return;
    const m = lecture.moniteurs[e[0]] || {};
    out.push({ genre: GENRE[e[4]], jour: e[1], debut: e[2], fin: e[3], moniteur: m.nom || m.titre || '',
               libelle: e[5] || '', agence: lieu(e[6]), boite: e[7] || '' });
  });
  /* « Rien d'ouvert » : ses horaires du jour, moins tout ce qui est posé,
     proposé par créneaux de 2h (8h-10h, 10h-12h, 13h-15h, 15h-17h,
     17h-19h) ; un créneau à moitié pris garde son trou d'1h ; après un
     permis, de l'heure de fin à 2h après (fini avant 12h, ou avant 19h). */
  (lecture.moniteurs || []).forEach((m, i) => {
    const h = horairesDuMoniteur(m.nom, horaires);
    for(let j = (lecture.du > auj ? lecture.du : auj); j && j <= lecture.au; j = jourPlusCreneau(j, 1)){
      const plagesJour = plagesDesHoraires(h[cleDuJourCreneau(j)] || '');
      if(!plagesJour.length) continue;
      const evJour = (lecture.ev || []).filter(e => e[0] === i && e[1] === j);
      const pris = evJour.map(e => [minutesCreneau(e[2]), minutesCreneau(e[3])]).filter(x => !isNaN(x[0]) && !isNaN(x[1]));
      const debutMin = (j === auj) ? Math.ceil(mnt / 15) * 15 : 0;
      /* le libre : ses horaires, moins ce qui est pris, moins le passé */
      let libres = plagesJour.map(x => [Math.max(x[0], debutMin), x[1]]).filter(x => x[1] > x[0]);
      pris.forEach(([a, b]) => {
        const reste = [];
        libres.forEach(([x, y]) => {
          if(b <= x || a >= y){ reste.push([x, y]); return; }
          if(a > x) reste.push([x, a]);
          if(b < y) reste.push([b, y]);
        });
        libres = reste;
      });
      const toutLibre = (a, b) => libres.some(([x, y]) => x <= a && b <= y);
      const poses = [];
      /* après un permis (et son trajet retour) */
      evJour.filter(e => e[4] === 'p').forEach(e => {
        let fin = minutesCreneau(e[3]);
        for(let k = 0; k < 3; k++){
          const t = evJour.find(x => x[4] === 't' && minutesCreneau(x[2]) >= fin - 5 && minutesCreneau(x[2]) <= fin + 15);
          if(!t) break;
          fin = Math.max(fin, minutesCreneau(t[3]));
        }
        const finP = fin + 120;
        const borne = fin < 720 ? 720 : 1140;
        if(finP <= borne && toutLibre(fin, finP) && !poses.some(x => x[0] < finP && fin < x[1])) poses.push([fin, finP, 'permis']);
      });
      BLOCS_CRENEAU.forEach(([a, b]) => {
        libres.forEach(([x, y]) => {
          const d = Math.max(a, x), f = Math.min(b, y);
          if(f - d < DUREE_MINI_RIEN) return;
          if(poses.some(p => p[0] < f && d < p[1])) return;
          poses.push([d, f, (d === a && f === b) ? 'bloc' : 'trou']);
        });
      });
      poses.forEach(([a, b, sorte]) => {
        out.push({ genre: 'rien', jour: j, debut: heureCreneau(a), fin: heureCreneau(b), moniteur: m.nom,
                   libelle: sorte === 'permis' ? 'Libre après son permis' : sorte === 'trou' ? 'Trou d’' + dureeCreneauTexte(b - a) : 'Rien d’ouvert sur sa journée',
                   agence: '', boite: '' });
      });
    }
  });
  const ordre = {};
  (lecture.moniteurs || []).forEach((m, i) => { ordre[m.nom] = i; });
  return out.sort((a, b) => (a.jour + a.debut).localeCompare(b.jour + b.debut) || ((ordre[a.moniteur] || 0) - (ordre[b.moniteur] || 0)));
}
function dureeCreneauTexte(n){
  const h = Math.floor(n / 60), m = n % 60;
  return h + 'h' + (m ? String(m).padStart(2, '0') : '');
}

async function chargerCreneaux(forcer){
  if(!forcer && creneauxEtat.luA && Date.now() - creneauxEtat.luA < 60000) return creneauxEtat;
  const r = await appelPrep({ action: 'creneauxLire' });
  creneauxEtat = { lecture: (r && r.lecture) || null, horaires: (r && r.horaires) || {}, masques: (r && r.masques) || [], luA: Date.now() };
  return creneauxEtat;
}

/* Les élèves à placer : permis à venir, « 📆 Tout est planifié » pas coché */
async function elevesAPlacerCreneaux(){
  try{
    if(typeof chargerSessionsPermis === 'function' && (typeof sessionsPermis === 'undefined' || !sessionsPermis.length)){
      await chargerSessionsPermis();
    }
  }catch(e){}
  const auj = aujourdhuiCreneau();
  const out = [];
  const vus = {};
  ((typeof sessionsPermis !== 'undefined' && sessionsPermis) || []).slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach(s => {
      if(!s || String(s.date || '') < auj) return;
      (s.eleves || []).forEach(p => {
        const nom = String((p && p.eleve) || '').trim();
        if(!nom || vus[nom]) return;
        const m = (typeof marquesDeLaPreparation === 'function') ? marquesDeLaPreparation(nom) : { planifie: true };
        if(m.planifie) return;
        vus[nom] = true;
        out.push({ eleve: nom, date: s.date, centre: s.centre || '', boite: boiteDeLEleveCreneau(nom) });
      });
    });
  return out;
}
function boiteDeLEleveCreneau(nom){
  try{
    const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
    const b = (f && typeof boiteDeLaFormation === 'function') ? String(boiteDeLaFormation(f.formation) || '').toUpperCase() : '';
    return b === 'BEA' ? 'bea' : b === 'BV' ? 'bv' : '';
  }catch(e){ return ''; }
}
function sessionDeLEleveCreneau(nom){
  const auj = aujourdhuiCreneau();
  const n = (typeof normaliserMot === 'function') ? normaliserMot(nom) : String(nom).toLowerCase();
  return ((typeof sessionsPermis !== 'undefined' && sessionsPermis) || []).slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .find(s => String(s.date || '') >= auj && (s.eleves || []).some(p => p && p.eleve &&
      ((typeof normaliserMot === 'function') ? normaliserMot(p.eleve) : String(p.eleve).toLowerCase()) === n)) || null;
}

/* ------------------------------------------------------------
   ③ L'ÉCRAN — Élèves › 🗓️ Créneaux libres
   ------------------------------------------------------------ */
const GENRES_CRENEAU = {
  ouvert: { nom: '🟢 Cours ouverts sans élève', court: '🟢 Cours ouvert', couleur: '#3d8b00' },
  resa:   { nom: '📌 Résa', court: '📌 Résa', couleur: '#B87A12' },
  rien:   { nom: '⬜ Rien d’ouvert', court: '⬜ Rien d’ouvert', couleur: '#8A857C' },
  simu:   { nom: '🕹️ Simu : 1 place', court: '🕹️ Simu 1 place', couleur: '#2F7FD8' },
  dispo:  { nom: '✍️ Dispo écrite', court: '✍️ Dispo', couleur: '#2E9E5B' }
};
function pastilleCreneau(texte, on, faire){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn pastilleVue ' + (on ? 'btn-primary' : 'btn-secondary');
  b.textContent = texte;
  b.addEventListener('click', faire);
  return b;
}
function ligneDeCreneau(c, proposer){
  const d = document.createElement('div');
  d.className = 'dvL crenL';
  d.dataset.genre = c.genre;
  d.dataset.jour = c.jour;
  const h = document.createElement('span');
  h.className = 'dvH';
  h.textContent = heureLisibleCreneau(c.debut);
  h.appendChild(document.createElement('br'));
  const f = document.createElement('span');
  f.style.cssText = 'font-weight:400;color:var(--muted);font-size:11.5px;';
  f.textContent = '→ ' + heureLisibleCreneau(c.fin);
  h.appendChild(f);
  const q = document.createElement('span');
  q.className = 'dvQui';
  const b = document.createElement('b');
  b.textContent = c.moniteur;
  const s = document.createElement('span');
  s.textContent = c.libelle + (c.agence ? ' · 📍 ' + (c.agence === 'loudeac' ? 'Loudéac' : 'St-Brieuc') : '');
  q.append(b, s);
  const g = GENRES_CRENEAU[c.genre];
  const et = document.createElement('span');
  et.className = 'dvEt';
  et.style.cssText = 'border:1.5px solid ' + g.couleur + ';color:' + g.couleur + ';';
  et.textContent = g.court;
  d.append(h, q, et);
  if(proposer){
    const masque = creneauMasque(c);
    if(masque) d.style.opacity = '.55';
    if(!masque){
      const p = document.createElement('button');
      p.type = 'button';
      p.className = 'btn btn-secondary';
      p.style.cssText = 'width:auto;margin:0;padding:6px 10px;font-size:12px;flex-shrink:0;';
      p.textContent = '📋 Proposer';
      p.addEventListener('click', () => fenetreCreneauxLibres('', c));
      d.appendChild(p);
    }
    /* 🚫 « ne pas le proposer » (« des fois on ne veut qu'un seul élève tout seul ») */
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'btn btn-secondary crenMasquer';
    x.style.cssText = 'width:auto;margin:0;padding:6px 9px;font-size:12px;flex-shrink:0;';
    x.textContent = masque ? '↩️ Remettre' : '🚫';
    x.title = masque ? 'Le remettre dans les créneaux à proposer' : 'Ne pas le proposer (rien ne change dans Drivup)';
    x.addEventListener('click', async () => {
      x.disabled = true;
      try{ await masquerLeCreneau(c, !masque); if(typeof proposer === 'function') proposer(); }
      catch(e){ x.disabled = false; if(typeof showToast === 'function') showToast('Impossible : ' + e.message); }
    });
    d.appendChild(x);
  }
  return d;
}

async function afficherCreneauxLibres(){
  const z = $('creneauxZone');
  if(!z) return;
  z.innerHTML = '<div class="empty">Lecture des créneaux…</div>';
  let e, placer;
  try{
    [e, placer] = await Promise.all([chargerCreneaux(true), elevesAPlacerCreneaux()]);
  }catch(err){
    z.innerHTML = '';
    const w = document.createElement('div'); w.className = 'empty'; w.textContent = '⚠️ ' + err.message; z.appendChild(w);
    return;
  }
  z.innerHTML = '';
  const lect = e.lecture;
  const info = document.createElement('div');
  info.style.cssText = 'font-size:12px;color:var(--muted);margin:-4px 0 12px;line-height:1.5;';
  if(!lect){
    info.textContent = 'Aucune lecture pour l’instant. Ouvre le planning d’une agence dans Drivup et clique le favori « 📥 Bilan de conduite » : les créneaux des quatre semaines à venir arrivent ici.';
    z.appendChild(info);
    z.appendChild(blocDesHorairesCreneaux([]));
    return;
  }
  const lu = lect.le ? new Date(lect.le) : null;
  info.textContent = 'Lu dans Drivup' + (lu ? ' le ' + lu.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }) +
    ' à ' + lu.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h') : '') +
    (lect.par ? ' (' + lect.par + ')' : '') + ' · jusqu’au ' + jourLongCreneau(lect.au) +
    ' — se met à jour à chaque clic du favori « 📥 » sur le planning d’une agence.';
  z.appendChild(info);
  if(lu && Date.now() - lu.getTime() > 3 * 86400000){
    const v = document.createElement('div');
    v.className = 'dvNote';
    v.style.cssText = 'color:var(--warn-text);margin:-6px 0 10px;';
    v.textContent = '⚠️ Lecture de plus de 3 jours : des cours ont pu être pris depuis. Reclique le favori sur le planning d’une agence.';
    z.appendChild(v);
  }

  const toutes = creneauxCalcules(lect, e.horaires);
  const cadre = document.createElement('div');
  cadre.style.cssText = 'display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;';
  const gauche = document.createElement('div');
  gauche.style.cssText = 'flex:2 1 520px;min-width:0;';
  const droite = document.createElement('div');
  droite.className = 'crenPlacer';
  droite.style.cssText = 'flex:1 1 260px;min-width:0;border:1px solid var(--line);border-radius:12px;padding:10px 12px;';

  const filtres = document.createElement('div');
  const liste = document.createElement('div');
  liste.id = 'creneauxListe';
  const dessiner = () => {
    filtres.innerHTML = '';
    const r1 = document.createElement('div'); r1.className = 'grillePastilles'; r1.style.marginBottom = '8px';
    const n = g => toutes.filter(x => (g === 'tout' || x.genre === g) && !creneauMasque(x)).length;
    [['tout', 'Tout'], ['ouvert', GENRES_CRENEAU.ouvert.nom], ['simu', GENRES_CRENEAU.simu.nom], ['resa', GENRES_CRENEAU.resa.nom], ['dispo', GENRES_CRENEAU.dispo.nom], ['rien', GENRES_CRENEAU.rien.nom]].forEach(([g, t]) => {
      const p = pastilleCreneau(t + ' · ' + n(g), filtresCreneaux.genre === g, () => { filtresCreneaux.genre = g; dessiner(); });
      p.dataset.genre = g; r1.appendChild(p);
    });
    const r2 = document.createElement('div'); r2.className = 'grillePastilles'; r2.style.marginBottom = '14px';
    r2.appendChild(pastilleCreneau('Tous les moniteurs', !filtresCreneaux.moniteur, () => { filtresCreneaux.moniteur = ''; dessiner(); }));
    (lect.moniteurs || []).forEach(m => r2.appendChild(pastilleCreneau(m.nom, filtresCreneaux.moniteur === m.nom, () => { filtresCreneaux.moniteur = m.nom; dessiner(); })));
    [['sb', '📍 St-Brieuc'], ['loudeac', '📍 Loudéac']].forEach(([a, t]) => r2.appendChild(pastilleCreneau(t, filtresCreneaux.agence === a,
      () => { filtresCreneaux.agence = filtresCreneaux.agence === a ? '' : a; dessiner(); })));
    filtres.append(r1, r2);

    liste.innerHTML = '';
    const filtrees = toutes.filter(x => (filtresCreneaux.genre === 'tout' || x.genre === filtresCreneaux.genre) &&
      (!filtresCreneaux.moniteur || x.moniteur === filtresCreneaux.moniteur) &&
      (!filtresCreneaux.agence || x.agence === filtresCreneaux.agence || (x.genre === 'rien' && !x.agence)));
    const vues = filtrees.filter(x => !creneauMasque(x));
    const retires = filtrees.filter(x => creneauMasque(x));
    if(!vues.length){
      const v = document.createElement('div'); v.className = 'empty'; v.textContent = 'Aucun créneau avec ces filtres.'; liste.appendChild(v);
    }
    let jc = '';
    vues.forEach(c => {
      if(c.jour !== jc){
        jc = c.jour;
        const t = document.createElement('div'); t.className = 'dvJour'; t.textContent = jourLongCreneau(c.jour); liste.appendChild(t);
      }
      liste.appendChild(ligneDeCreneau(c, dessiner));
    });
    /* 🚫 Ceux qu'on a retirés : à part, pour pouvoir les remettre */
    if(retires.length){
      const pli = document.createElement('details');
      pli.className = 'dvPli crenRetires';
      const su = document.createElement('summary');
      su.textContent = '🚫 ' + retires.length + ' créneau' + (retires.length > 1 ? 'x' : '') + ' retiré' + (retires.length > 1 ? 's' : '') + ' (pas proposé' + (retires.length > 1 ? 's' : '') + ')';
      pli.appendChild(su);
      retires.forEach(c => pli.appendChild(ligneDeCreneau(c, dessiner)));
      liste.appendChild(pli);
    }
  };
  dessiner();
  gauche.append(filtres, liste);

  const tp = document.createElement('div');
  tp.style.cssText = 'font-weight:800;font-size:14px;margin-bottom:2px;';
  tp.textContent = '👥 À placer';
  const sp = document.createElement('div');
  sp.style.cssText = 'font-size:11.5px;color:var(--muted);margin-bottom:8px;line-height:1.45;';
  sp.textContent = 'Permis prévu, « 📆 Tout est planifié » pas coché dans 🎓 Suivi permis. Touche un nom pour lui proposer des créneaux.';
  droite.append(tp, sp);
  if(!placer.length){
    const v = document.createElement('div'); v.style.cssText = 'font-size:12.5px;color:var(--muted);'; v.textContent = 'Personne à placer.';
    droite.appendChild(v);
  }
  placer.forEach(x => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'crenAPlacer';
    b.style.cssText = 'display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line);' +
      'padding:7px 0;margin:0;font-size:13px;line-height:1.4;color:inherit;cursor:pointer;';
    const n = document.createElement('b'); n.textContent = x.eleve;
    const d = document.createElement('span');
    d.style.cssText = 'display:block;color:var(--muted);font-size:12px;';
    d.textContent = 'Permis le ' + (typeof jourFrCs === 'function' ? jourFrCs(x.date) : x.date) +
      (x.boite ? ' · ' + x.boite.toUpperCase() : '') + ' · 📆 doit planifier';
    b.append(n, d);
    b.addEventListener('click', () => fenetreCreneauxLibres(x.eleve));
    droite.appendChild(b);
  });
  cadre.append(gauche, droite);
  z.appendChild(cadre);
  z.appendChild(blocDesHorairesCreneaux(lect.moniteurs || []));
}

/* ⚙️ Les horaires de chaque moniteur, pour « ⬜ Rien d'ouvert » */
function blocDesHorairesCreneaux(moniteurs){
  const d = document.createElement('details');
  d.className = 'dvPli crenHoraires';
  d.style.marginTop = '16px';
  const s = document.createElement('summary');
  s.textContent = '⚙️ Horaires des moniteurs (pour « ⬜ Rien d’ouvert »)';
  d.appendChild(s);
  const aide = document.createElement('div');
  aide.className = 'dvNote';
  aide.textContent = 'Une case par jour, plusieurs plages possibles (« 8-12 · 13h30-19 »). Vide = il ne travaille pas ce jour-là. ' +
    'Tout ce qui est posé dans sa colonne Drivup (cours, bureau, congés, RDV perso, « NON »…) compte comme occupé. ' +
    'Pas encore réglé : 8-12 · 13-19 en semaine, 8-12 le samedi.';
  d.appendChild(aide);
  if(!moniteurs.length){ return d; }
  const t = document.createElement('table');
  t.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;table-layout:fixed;';
  const tete = document.createElement('tr');
  const th0 = document.createElement('th'); th0.style.cssText = 'text-align:left;padding:4px;width:18%;'; th0.textContent = 'Moniteur';
  tete.appendChild(th0);
  JOURS_CRENEAUX.forEach(j => { const th = document.createElement('th'); th.style.padding = '4px'; th.textContent = NOMS_JOURS_CRENEAUX[j]; tete.appendChild(th); });
  t.appendChild(tete);
  moniteurs.forEach(m => {
    const tr = document.createElement('tr');
    const td0 = document.createElement('td'); td0.style.cssText = 'padding:4px;font-weight:700;border-top:1px solid var(--line);word-break:break-word;'; td0.textContent = m.nom;
    tr.appendChild(td0);
    const h = horairesDuMoniteur(m.nom, creneauxEtat.horaires);
    const champs = {};
    JOURS_CRENEAUX.forEach(j => {
      const td = document.createElement('td'); td.style.cssText = 'padding:3px;border-top:1px solid var(--line);';
      const i = document.createElement('input');
      i.type = 'text'; i.value = h[j] || ''; i.dataset.moniteur = m.nom; i.dataset.jour = j;
      i.style.cssText = 'width:100%;font-size:12px;padding:6px 4px;margin:0;text-align:center;';
      i.setAttribute('aria-label', m.nom + ' ' + NOMS_JOURS_CRENEAUX[j]);
      i.addEventListener('change', async () => {
        const nouv = {};
        JOURS_CRENEAUX.forEach(k => { nouv[k] = champs[k].value.trim(); });
        try{
          const r = await appelPrep({ action: 'creneauxHoraires', moniteur: m.nom, horaires: nouv });
          if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
          creneauxEtat.horaires[m.nom] = r.horaires || nouv;
          if(typeof showToast === 'function') showToast('Horaires de ' + m.nom + ' enregistrés ✅');
          const ouvert = d.open;
          await afficherCreneauxLibres();
          const nd = document.querySelector('#creneauxZone .crenHoraires');
          if(nd && ouvert) nd.open = true;
        }catch(e){ if(typeof showToast === 'function') showToast('Impossible : ' + e.message); }
      });
      champs[j] = i;
      td.appendChild(i); tr.appendChild(td);
    });
    t.appendChild(tr);
  });
  const enrobe = document.createElement('div');
  enrobe.style.cssText = 'overflow-x:auto;';
  enrobe.appendChild(t);
  d.appendChild(enrobe);
  return d;
}

/* ------------------------------------------------------------
   ④ LA FENÊTRE — cocher, puis 📋 copier ou 💬 envoyer
   ------------------------------------------------------------ */
function messageDesCreneaux(eleve, choisis, session){
  const prenom = String(eleve || '').trim().split(/\s+/)[0] || '';
  const l = [(prenom ? 'Bonjour ' + prenom + ', voici' : 'Voici') + ' des créneaux possibles pour tes cours' +
    (session ? ' avant ton permis du ' + (typeof jourFrCs === 'function' ? jourFrCs(session.date) : session.date) : '') + ' :'];
  choisis.forEach(c => l.push('· ' + jourLongCreneau(c.jour) + ' de ' + heureLisibleCreneau(c.debut) + ' à ' + heureLisibleCreneau(c.fin) +
    (c.agence ? ' (' + (c.agence === 'loudeac' ? 'Loudéac' : 'Saint-Brieuc') + ')' : '') +
    (c.genre === 'simu' ? ' — simulateur avec moniteur' + (/passerelle/i.test(c.libelle) ? ' (passerelle)' : '') : '')));
  l.push('Dis-nous lesquels te vont !');
  return l.join('\n');
}

async function fenetreCreneauxLibres(eleveDonne, creneauChoisi){
  let e;
  try{ e = await chargerCreneaux(false); }catch(err){ if(typeof showToast === 'function') showToast('Impossible : ' + err.message); return; }
  const placer = await elevesAPlacerCreneaux().catch(() => []);
  let eleve = String(eleveDonne || '');
  const toutes = creneauxCalcules(e.lecture, e.horaires);
  const choisis = {};
  if(creneauChoisi) choisis[creneauChoisi.jour + '|' + creneauChoisi.debut + '|' + creneauChoisi.moniteur] = true;
  let modifie = false;
  const f = { avant: true, boite: true, agence: '', genre: 'tout' };

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  fond.id = 'crenFond';
  const m = document.createElement('div');
  m.className = 'modal';
  m.style.maxWidth = 'min(580px, 94vw)';
  fond.appendChild(m);
  const h = document.createElement('h3');
  m.appendChild(h);
  const sous = document.createElement('div');
  sous.style.cssText = 'font-size:12.5px;color:var(--muted);margin:-4px 0 10px;line-height:1.5;';
  m.appendChild(sous);

  /* L'élève : donné, ou choisi (ceux à placer d'abord) */
  const choix = document.createElement('div');
  if(!eleveDonne){
    const lab = document.createElement('label');
    lab.textContent = 'Pour quel élève ?';
    lab.htmlFor = 'crenEleve';
    const i = document.createElement('input');
    i.type = 'text'; i.id = 'crenEleve'; i.setAttribute('list', 'crenEleves'); i.autocomplete = 'off';
    i.placeholder = 'Nom de l’élève (facultatif pour copier)';
    const dl = document.createElement('datalist'); dl.id = 'crenEleves';
    const noms = placer.map(x => x.eleve).concat(((typeof fichesEleves !== 'undefined' && fichesEleves) || []).map(x => x.eleve))
      .filter((v, k, a) => v && a.indexOf(v) === k).slice(0, 400);
    noms.forEach(n => { const o = document.createElement('option'); o.value = n; dl.appendChild(o); });
    i.addEventListener('change', () => { eleve = i.value.trim(); peindre(); });
    choix.append(lab, i, dl);
  }
  m.appendChild(choix);

  const pastilles = document.createElement('div');
  pastilles.className = 'grillePastilles';
  pastilles.style.margin = '6px 0 10px';
  m.appendChild(pastilles);
  const liste = document.createElement('div');
  liste.className = 'crenFenListe';
  liste.style.cssText = 'max-height:38vh;overflow-y:auto;';
  m.appendChild(liste);
  const tm = document.createElement('div');
  tm.style.cssText = 'font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700;margin:12px 0 6px;';
  tm.textContent = 'Le message (modifiable)';
  m.appendChild(tm);
  const zt = document.createElement('textarea');
  zt.className = 'crenMessage';
  zt.style.cssText = 'width:100%;height:120px;font-size:13px;line-height:1.5;';
  zt.addEventListener('input', () => { modifie = true; });
  m.appendChild(zt);
  const etat = document.createElement('div');
  etat.style.cssText = 'font-size:13px;margin-top:6px;min-height:1px;';
  m.appendChild(etat);
  const rang = document.createElement('div');
  rang.className = 'btn-row';
  rang.style.marginTop = '12px';
  const bF = document.createElement('button'); bF.className = 'btn btn-secondary'; bF.textContent = 'Fermer';
  const bC = document.createElement('button'); bC.className = 'btn btn-secondary crenCopier'; bC.textContent = '📋 Copier';
  const bE = document.createElement('button'); bE.className = 'btn btn-primary crenEnvoyer'; bE.textContent = '💬 Envoyer dans sa messagerie';
  rang.append(bF, bC, bE);
  m.appendChild(rang);

  const cleC = c => c.jour + '|' + c.debut + '|' + c.moniteur;
  function peindre(){
    const session = eleve ? sessionDeLEleveCreneau(eleve) : null;
    const boite = eleve ? boiteDeLEleveCreneau(eleve) : '';
    h.textContent = '🗓️ Créneaux libres' + (eleve ? ' — ' + eleve : '');
    const lect = e.lecture;
    sous.textContent = (session ? 'Permis le ' + (typeof jourFrCs === 'function' ? jourFrCs(session.date) : session.date) +
      (boite ? ' · ' + boite.toUpperCase() : '') + '. ' : '') +
      (lect && lect.le ? 'Lu dans Drivup le ' + new Date(lect.le).toLocaleDateString('fr-FR') + ' à ' +
        new Date(lect.le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h') + '.' :
        'Aucune lecture : clique le favori « 📥 » sur le planning d’une agence dans Drivup.');
    pastilles.innerHTML = '';
    if(session) pastilles.appendChild(pastilleCreneau('Avant le ' + (typeof jourFrCs === 'function' ? jourFrCs(session.date) : session.date), f.avant,
      () => { f.avant = !f.avant; peindre(); }));
    if(boite) pastilles.appendChild(pastilleCreneau(boite.toUpperCase() + ' seulement', f.boite, () => { f.boite = !f.boite; peindre(); }));
    [['sb', '📍 St-Brieuc'], ['loudeac', '📍 Loudéac']].forEach(([a, t]) => pastilles.appendChild(pastilleCreneau(t, f.agence === a,
      () => { f.agence = f.agence === a ? '' : a; peindre(); })));
    /* 🟢 📌 ⬜ : un genre à la fois, ou tout */
    ['ouvert', 'simu', 'resa', 'dispo', 'rien'].forEach(g => pastilles.appendChild(pastilleCreneau(GENRES_CRENEAU[g].court, f.genre === g,
      () => { f.genre = f.genre === g ? 'tout' : g; peindre(); })));

    const vues = toutes.filter(c => !creneauMasque(c) && (f.genre === 'tout' || c.genre === f.genre) && (!session || !f.avant || c.jour < session.date) &&
      (!boite || !f.boite || !c.boite || c.boite === boite) &&
      (!f.agence || c.agence === f.agence || (c.genre === 'rien' && !c.agence)) || choisis[cleC(c)]).slice(0, 400);
    liste.innerHTML = '';
    if(!vues.length){
      const v = document.createElement('div'); v.className = 'empty'; v.textContent = 'Aucun créneau avec ces filtres.'; liste.appendChild(v);
    }
    vues.forEach(c => {
      const lab = document.createElement('label');
      lab.style.cssText = 'display:flex;gap:9px;align-items:flex-start;font-size:13.5px;margin:0 0 7px;text-transform:none;' +
        'letter-spacing:0;font-weight:400;color:var(--text);cursor:pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.style.cssText = 'width:auto;margin-top:3px;flex-shrink:0;';
      cb.checked = !!choisis[cleC(c)];
      cb.dataset.cle = cleC(c);
      cb.addEventListener('change', () => { if(cb.checked) choisis[cleC(c)] = c; else delete choisis[cleC(c)]; majMessage(); });
      const t = document.createElement('span');
      t.style.cssText = 'flex:1;line-height:1.4;';
      const b = document.createElement('b');
      b.textContent = jourLongCreneau(c.jour) + ' · ' + heureLisibleCreneau(c.debut) + '–' + heureLisibleCreneau(c.fin);
      const mm = document.createTextNode(' — ' + c.moniteur);
      const d = document.createElement('span');
      d.style.cssText = 'display:block;font-size:12px;color:var(--muted);';
      d.textContent = GENRES_CRENEAU[c.genre].court + (c.genre === 'rien' ? '' : ' · ' + c.libelle) +
        (c.agence ? ' · 📍 ' + (c.agence === 'loudeac' ? 'Loudéac' : 'St-Brieuc') : '');
      t.append(b, mm, d);
      lab.append(cb, t);
      liste.appendChild(lab);
      if(choisis[cleC(c)] === true) choisis[cleC(c)] = c;
    });
    bE.disabled = !eleve;
    bE.title = eleve ? '' : 'Choisis l’élève pour l’envoyer dans sa messagerie';
    majMessage();
  }
  function majMessage(){
    if(modifie) return;
    const cs = Object.keys(choisis).map(k => choisis[k]).filter(c => c && c.jour)
      .sort((a, b) => (a.jour + a.debut).localeCompare(b.jour + b.debut));
    zt.value = messageDesCreneaux(eleve, cs, eleve ? sessionDeLEleveCreneau(eleve) : null);
  }
  bF.addEventListener('click', () => fermerFond(fond));
  bC.addEventListener('click', async () => {
    try{
      if(navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(zt.value);
      else { zt.select(); document.execCommand('copy'); }
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '📋 Copié : colle-le dans Messenger ou un SMS.';
    }catch(err){
      zt.select();
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Copie refusée par le navigateur : le texte est sélectionné, fais Ctrl+C.';
    }
  });
  bE.addEventListener('click', async () => {
    if(!eleve) return;
    bE.disabled = true;
    etat.style.color = 'var(--muted)';
    etat.textContent = '⏳ Envoi…';
    try{
      const r = await appelPrep({ action: 'creneauxProposer', eleve: eleve, texte: zt.value });
      if(!r || r.status !== 'ok') throw new Error((r && (r.message || r.error)) || 'refusé');
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '✅ Envoyé dans sa conversation « Le bureau ».';
    }catch(err){
      bE.disabled = false;
      etat.style.color = 'var(--warn-text)';
      etat.textContent = '⚠️ ' + err.message;
    }
  });
  peindre();
  document.body.appendChild(fond);
}

/* 🎓 Suivi permis : les boutons (en haut, et sous « 📆 Il doit planifier ») */
function boutonCreneauxPourLeSuivi(nom){
  const n = String(nom || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return ' <button type="button" class="btn btn-secondary crenBouton" data-eleve="' + n + '" ' +
    'style="width:auto;margin:4px 0 0 6px;padding:4px 9px;font-size:12px;">🗓️ Créneaux libres</button>';
}
document.addEventListener('click', ev => {
  const b = ev.target && ev.target.closest ? ev.target.closest('.crenBouton') : null;
  if(!b) return;
  ev.preventDefault();
  ev.stopPropagation();
  fenetreCreneauxLibres(b.getAttribute('data-eleve') || '');
}, true);

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-creneaux.js'] = true;
