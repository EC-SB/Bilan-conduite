/* Déployé le 20/11/2026 à 16:47 — v1518 */
/* ============================================================
   💥 LE CONSTAT AMIABLE — v1518 (Outils › 💥 Constat amiable)

   David, le 20 novembre : « une aide pour remplir un constat amiable
   avec un modèle de ce que le moniteur doit remplir », « qu'on voie
   une image d'un vrai constat qui se remplit tout seul à peu près si
   on répond à des questions », « car les moniteurs vont remplir un
   vrai constat papier », et « pouvoir prendre en photo le constat
   papier s'il veut et des photos en plus autant qu'il veut ».

   Ce que l'écran fait :
     · treize questions, une à la fois ; le constat dessiné à côté se
       remplit case par case (la case de la question en vert) ;
     · ce que l'appli sait déjà est écrit d'avance : l'école (case 6,
       l'en-tête des courriers), la voiture (7, la Flotte), l'assurance
       (8, Gestion › Flotte › 🛡️), le moniteur conducteur (9, sa fiche
       Équipe), l'élève dans les observations (14) ;
     · à la fin, la lecture « case par case » pour recopier au
       téléphone, et l'envoi : la photo du constat signé (facultative),
       des photos en plus autant qu'il veut, le fil de la voiture, un
       message au bureau avec la date limite, un dégât en carrosserie.

   ⚠️ LE MODÈLE N'EST PAS LE CONSTAT. Rien ne remplace le papier signé
   par les deux conducteurs : l'écran aide à le remplir, il ne
   l'envoie à aucun assureur.

   ⚠️ LES RÉPONSES TIENNENT DANS CE TÉLÉPHONE (localStorage), le temps
   de recopier : un appel qui coupe l'appli au bord de la route ne
   doit pas faire tout recommencer. Les photos, elles, ne s'y gardent
   pas (trop lourdes) : elles partent à l'envoi.
   ============================================================ */

const CA = { ctx: null, charge: false, r: null, lecture: -1, photos: { papier: [], autres: [] }, envoi: null, reduites: new Map() };
const CA_PAR_ENVOI = 10;
const CA_CIRC = ['en stationnement / à l’arrêt', 'quittait un stationnement / ouvrait une portière', 'prenait un stationnement',
  'sortait d’un parking, d’un lieu privé, d’un chemin de terre', 's’engageait dans un parking, un lieu privé, un chemin de terre',
  's’engageait sur une place à sens giratoire', 'roulait sur une place à sens giratoire',
  'heurtait à l’arrière, en roulant dans le même sens et sur une même file', 'roulait dans le même sens et sur une file différente',
  'changeait de file', 'doublait', 'virait à droite', 'virait à gauche', 'reculait',
  'empiétait sur une voie réservée à la circulation en sens inverse', 'venait de droite (dans un carrefour)',
  'n’avait pas observé un signal de priorité ou un feu rouge'];
const CA_QUESTIONS = [
  { k: 'quand', titre: 'C’est arrivé quand, avec quelle voiture ?', aide: 'L’heure et l’élève du cours sont déjà mis : corrige si besoin.', cases: [1, 7, 14] },
  { k: 'ou', titre: 'Où ?', aide: '📍 « Ma position » donne la rue ; sinon tape le carrefour et la ville.', cases: [2] },
  { k: 'blesses', titre: 'Quelqu’un est blessé, même légèrement ?', aide: 'Oui : le 15 ou le 112 d’abord, puis le bureau.', cases: [3] },
  { k: 'autres', titre: 'D’autres dégâts ? (poteau, barrière, voiture garée…)', cases: [4] },
  { k: 'temoins', titre: 'Des témoins ?', aide: 'Un passant ou un autre conducteur : son nom et son téléphone.', cases: [5] },
  { k: 'cote', titre: 'Sur le constat, notre voiture est A ou B ?', aide: 'Le côté que vous avez choisi avec l’autre conducteur. Le modèle suit.', cases: [6, 7, 8, 9], cote: 'nous' },
  { k: 'autre', titre: 'L’autre voiture et son conducteur', aide: 'Recopie sa carte verte et son permis — ou laisse-le remplir son côté lui-même.', cases: [6, 7, 8, 9], cote: 'lui' },
  { k: 'nous', titre: 'Que faisait notre voiture ?', aide: 'Coche seulement ce qui est vrai. Le nombre de cases se compte tout seul.', cases: [12], cote: 'nous' },
  { k: 'lui', titre: 'Et l’autre voiture ?', aide: 'Ce que l’autre conducteur coche de son côté.', cases: [12], cote: 'lui' },
  { k: 'choc', titre: 'Où a été le premier choc ?', aide: 'Touche l’endroit sur chaque voiture.', cases: [10] },
  { k: 'degats', titre: 'Les dégâts qu’on voit', aide: 'En quelques mots, sur chaque voiture.', cases: [11] },
  { k: 'croquis', titre: 'Le croquis', aide: 'Choisis ce qui ressemble : le dessin se fait, tu le recopies.', cases: [13] },
  { k: 'obs', titre: 'Nos observations', aide: 'Déjà écrit pour un cours. Un désaccord s’ajoute ici.', cases: [14], cote: 'nous' }
];
const CA_CROQUIS = [
  ['giratoire', '🔄 Rond-point', 'l’une roulait sur le rond-point, l’autre s’y engageait'],
  ['carrefour', '✚ Carrefour', 'l’une venait de droite'],
  ['arriere', '⬆️ Même file, par l’arrière', 'l’une a heurté l’autre à l’arrière'],
  ['file', '↗️ Changement de file', 'l’une changeait de file'],
  ['stationnement', '🅿️ Stationnement, marche arrière', 'l’une sortait d’une place ou reculait'],
  ['face', '⇅ Sens inverse', 'l’une empiétait sur la voie d’en face']
];
const CA_CHOCS = { avg: 'avant gauche', av: 'avant', avd: 'avant droit', g: 'côté gauche', d: 'côté droit', arg: 'arrière gauche', ar: 'arrière', ard: 'arrière droit' };

/* ---------- petits outils ---------- */
function caEsc(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function caIso(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function caJour(iso){ const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function caHeureDite(h){ return /^\d{2}:\d{2}$/.test(String(h || '')) ? h.replace(':', ' h ') : ''; }
function caCoupe(t, n){ t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; }
function caLignes(t, n){ const out = []; let l = ''; String(t || '').split(/\s+/).filter(Boolean).forEach(m => { if(l && (l + ' ' + m).length > n){ out.push(l); l = m; } else l = l ? l + ' ' + m : m; }); if(l) out.push(l); return out; }
function caCleLocale(){ return 'ec_constat_' + String((typeof ACCES !== 'undefined' && ACCES && ACCES.nom) || ''); }
function caNomVoiture(v){
  const t = String(v.titre || v.nom || v.modele || ''), im = String(v.immat || '');
  return t + (im && t.indexOf(im) === -1 ? ' · ' + im : '') + (v.modele && t.indexOf(v.modele) === -1 ? ' (' + v.modele + ')' : '');
}
function caLui(){ return CA.r.cote === 'B' ? 'A' : 'B'; }
/* « François EXEMPLE » → nom EXEMPLE, prénom François ; « Paul Autre » → AUTRE, Paul */
function caNomPrenom(n){
  const mots = String(n || '').trim().split(/\s+/).filter(Boolean);
  if(mots.length < 2) return [mots.join(' ').toUpperCase(), ''];
  const maj = mots.filter(m => m.length > 1 && m === m.toUpperCase() && /[A-ZÀ-Ý]/.test(m));
  if(maj.length && maj.length < mots.length) return [maj.join(' '), mots.filter(m => maj.indexOf(m) === -1).join(' ')];
  return [mots[mots.length - 1].toUpperCase(), mots.slice(0, -1).join(' ')];
}

/* ---------- les réponses ---------- */
function caNeuf(){
  const d = new Date();
  return { v: 1, vehicule: '', eleve: '', neph: '', date: caIso(d), heure: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'),
    pays: 'France', lieu: '', position: null, blesses: '', autresVeh: '', autresObj: '', temoins: '', cote: 'A',
    autre: { nom: '', prenom: '', adresse: '', cp: '', vehicule: '', immat: '', pays: 'France', assureur: '', contrat: '', carteVerte: '', agence: '', permis: '', luiMeme: false },
    circNous: [], circLui: [], chocNous: '', chocLui: '', degatsNous: '', degatsLui: '', croquis: '', inverse: false, rue1: '', rue2: '', obsPlus: '',
    etape: 0, fini: false, envoye: '' };
}
function caLireBrouillon(){
  try{
    const x = JSON.parse(localStorage.getItem(caCleLocale()) || 'null');
    if(x && x.v === 1){ const n = caNeuf(); return Object.assign(n, x, { autre: Object.assign(n.autre, x.autre || {}) }); }
  }catch(e){}
  return null;
}
function caGarder(){ try{ localStorage.setItem(caCleLocale(), JSON.stringify(CA.r)); }catch(e){} }
function caOublier(){ try{ localStorage.removeItem(caCleLocale()); }catch(e){} }
function caVoiture(){ return ((CA.ctx && CA.ctx.vehicules) || []).find(v => String(v.id) === String(CA.r.vehicule)) || null; }
function caObsBase(){
  const r = CA.r;
  return 'Véhicule école à double commande, leçon de conduite en cours.' +
    (r.eleve ? ' Élève au volant sous la responsabilité de l’enseignant : ' + r.eleve + (r.neph ? ' (NEPH ' + r.neph + ')' : '') + '.' : '');
}
function caObs(){ const p = String(CA.r.obsPlus || '').trim(); return caObsBase() + (p ? ' ' + p : ''); }
/* L'élève et l'heure du cours : celui du moniteur qui est en cours, sinon le dernier commencé, sinon le premier */
function caCoursProbable(){
  const l = ((CA.ctx && CA.ctx.cours) || []).filter(c => c.mien && !c.examen);
  if(!l.length) return null;
  const d = new Date(), h = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  return l.find(c => c.debut <= h && (!c.fin || h <= c.fin)) || l.filter(c => c.debut <= h).pop() || l[0];
}
function caNephDe(nom){
  const c = ((CA.ctx && CA.ctx.cours) || []).find(x => x.eleve === nom && x.neph);
  if(c) return c.neph;
  const e = ((CA.ctx && CA.ctx.eleves) || []).find(x => x.nom === nom);
  return e ? e.neph : '';
}

/* ---------- ce qu'on écrit de chaque côté ---------- */
function caNous(){
  const c = CA.ctx || {}, r = CA.r, v = caVoiture(), a = c.assurance || {}, e = c.ecole || {}, k = c.conducteur || {};
  const [nom, prenom] = caNomPrenom(k.nom);
  const p = k.permis;
  return {
    preneur: [e.societe || e.nom || '', e.societe ? e.nom : '', e.adresse || '(l’adresse de l’école)', (e.ville || '') + ' · France'],
    vehicule: v ? [v.modele || v.nom, String(v.immat || '').toUpperCase(), 'France'] : ['', '', ''],
    assurance: c.assurancePosee
      ? [a.assureur, a.contrat ? 'Contrat ' + a.contrat : '', a.carteVerte ? 'Carte verte ' + a.carteVerte : '',
         (a.du || a.au) ? 'du ' + caJour(a.du) + ' au ' + caJour(a.au) : '', a.agence, a.degats === 'non' ? 'non' : 'oui']
      : ['(la carte verte de la voiture)', '', '', '', '', ''],
    conducteur: [nom, prenom, 'né le … (à écrire)', k.adresse || '(ton adresse)',
      p && p.numero ? 'Permis ' + p.numero + (p.categories ? ' · ' + p.categories : '') : '(ton permis : n° et catégorie)',
      p && p.valableJusqua ? 'valable jusqu’au ' + caJour(p.valableJusqua) : ''],
    choc: r.chocNous, degats: r.degatsNous, circ: r.circNous, obs: caObs()
  };
}
function caLuiDonnees(){
  const r = CA.r, o = r.autre || {};
  if(o.luiMeme) return { preneur: ['(il remplit son côté)', '', '', ''], vehicule: ['', '', ''], assurance: ['', '', '', '', '', ''],
    conducteur: ['', '', '', '', '', ''], choc: r.chocLui, degats: r.degatsLui, circ: r.circLui, obs: '' };
  return {
    preneur: [String(o.nom || '').toUpperCase(), o.prenom, o.adresse, [o.cp, o.pays].filter(Boolean).join(' · ')],
    vehicule: [o.vehicule, String(o.immat || '').toUpperCase(), o.pays],
    assurance: [o.assureur, o.contrat ? 'Contrat ' + o.contrat : '', o.carteVerte ? 'Carte verte ' + o.carteVerte : '', '', o.agence, ''],
    conducteur: [String(o.nom || '').toUpperCase(), o.prenom, '', o.adresse, o.permis ? 'Permis ' + o.permis : '', ''],
    choc: r.chocLui, degats: r.degatsLui, circ: r.circLui, obs: ''
  };
}

/* ============================================================
   LE CONSTAT, DESSINÉ (1000 × 1414, la feuille A4)
   ============================================================ */
const CA_MAIN = 'font-family="Segoe Print, Bradley Hand, Comic Sans MS, cursive" fill="#0B3D91"';
const CA_IMP = 'font-family="Arial, Helvetica, sans-serif" fill="#1F2A37"';
function caEcrit(x, y, t, taille, max){ return t ? '<text x="' + x + '" y="' + y + '" ' + CA_MAIN + ' font-size="' + (taille || 13) + '">' + caEsc(max ? caCoupe(t, max) : t) + '</text>' : ''; }
function caImp(x, y, t, taille, gras, coul){ return '<text x="' + x + '" y="' + y + '" ' + CA_IMP + ' font-size="' + (taille || 9) + '"' + (gras ? ' font-weight="700"' : '') + (coul ? ' style="fill:' + coul + '"' : '') + '>' + caEsc(t) + '</text>'; }
function caBoite(x, y, w, h, n, titre, coul, fond, actif){
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + (fond || '#fff') + '" stroke="' + (coul || '#59606B') + '" stroke-width="1.3"/>' +
    (actif ? '<rect x="' + (x - 3) + '" y="' + (y - 3) + '" width="' + (w + 6) + '" height="' + (h + 6) + '" rx="6" fill="rgba(198,244,50,.28)" stroke="#9BD400" stroke-width="3"/>' : '') +
    '<circle cx="' + (x + 12) + '" cy="' + (y + 12) + '" r="9" fill="' + (coul || '#59606B') + '"/>' +
    '<text x="' + (x + 12) + '" y="' + (y + 16) + '" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">' + n + '</text>' +
    caImp(x + 26, y + 15, titre, 9, true);
}
function caCoche(x, y, on){ return '<rect x="' + x + '" y="' + y + '" width="11" height="11" fill="#fff" stroke="#59606B"/>' + (on ? '<path d="M' + (x + 1) + ' ' + (y + 6) + ' l3 4 l7 -10" stroke="#0B3D91" stroke-width="2.2" fill="none"/>' : ''); }
const CA_FLECHES = { avd: [30, -46, 18, -34], avg: [-30, -46, -18, -34], ard: [30, 46, 18, 34], arg: [-30, 46, -18, 34],
                     av: [0, -64, 0, -46], ar: [0, 64, 0, 46], d: [44, 0, 26, 0], g: [-44, 0, -26, 0] };
function caVoitureDessus(cx, cy, coul, choc){
  let s = '<rect x="' + (cx - 22) + '" y="' + (cy - 42) + '" width="44" height="84" rx="14" fill="#fff" stroke="' + coul + '" stroke-width="1.6"/>' +
    '<rect x="' + (cx - 16) + '" y="' + (cy - 26) + '" width="32" height="18" rx="4" fill="none" stroke="' + coul + '"/>' +
    '<rect x="' + (cx - 16) + '" y="' + (cy + 12) + '" width="32" height="14" rx="4" fill="none" stroke="' + coul + '"/>' + caImp(cx - 34, cy - 47, 'avant', 7);
  const f = CA_FLECHES[choc];
  if(f) s += '<line x1="' + (cx + f[0]) + '" y1="' + (cy + f[1]) + '" x2="' + (cx + f[2]) + '" y2="' + (cy + f[3]) + '" stroke="#0B3D91" stroke-width="2.6" marker-end="url(#caFl)"/>';
  return s;
}
function caColonne(x, lettre, ici, iciCote){
  const V = lettre === CA.r.cote ? caNous() : caLuiDonnees();
  const bleu = lettre === 'A';
  const coul = bleu ? '#2F6DB5' : '#C9A400', fond = bleu ? '#E3EFFB' : '#FFF7CF';
  const actif = (n) => ici.indexOf(n) !== -1 && (!iciCote || iciCote === lettre || [10, 11].indexOf(n) !== -1);
  let s = '<rect x="' + x + '" y="252" width="310" height="22" rx="4" fill="' + coul + '"/>' +
    '<text x="' + (x + 155) + '" y="268" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#fff">VÉHICULE ' + lettre + (lettre === CA.r.cote ? ' — la voiture école' : '') + '</text>';
  s += caBoite(x, 280, 310, 128, 6, 'Preneur d’assurance / assuré', coul, fond, actif(6));
  ['Nom', 'Prénom', 'Adresse', 'Code postal · Pays'].forEach((l, i) => { s += caImp(x + 10, 312 + i * 24, l, 7.5) + caEcrit(x + 96, 314 + i * 24, V.preneur[i], 12, 30); });
  s += caBoite(x, 414, 310, 84, 7, 'Véhicule', coul, fond, actif(7));
  ['Marque, type', 'N° d’immatriculation', 'Pays d’immatriculation'].forEach((l, i) => { s += caImp(x + 10, 446 + i * 20, l, 7.5) + caEcrit(x + 120, 448 + i * 20, V.vehicule[i], 12, 26); });
  s += caBoite(x, 504, 310, 172, 8, 'Société d’assurance', coul, fond, actif(8));
  ['Nom', 'N° de contrat', 'N° de carte verte', 'Attestation valable', 'Agence', 'Dégâts au véhicule assurés'].forEach((l, i) => { s += caImp(x + 10, 536 + i * 24, l, 7.5) + caEcrit(x + 104, 538 + i * 24, V.assurance[i], 11.5, 30); });
  s += caBoite(x, 682, 310, 168, 9, 'Conducteur', coul, fond, actif(9));
  ['Nom', 'Prénom', 'Date de naissance', 'Adresse', 'Permis n° · catégorie', 'Permis valable jusqu’au'].forEach((l, i) => { s += caImp(x + 10, 714 + i * 23, l, 7.5) + caEcrit(x + 104, 716 + i * 23, V.conducteur[i], i === 3 ? 10 : 11, i === 3 ? 38 : 30); });
  s += caBoite(x, 856, 310, 130, 10, 'Point de choc initial', coul, fond, actif(10));
  s += caVoitureDessus(x + 155, 928, coul, V.choc);
  s += caBoite(x, 992, 310, 82, 11, 'Dégâts apparents', coul, fond, actif(11));
  caLignes(V.degats, 36).slice(0, 2).forEach((l, i) => { s += caEcrit(x + 12, 1036 + i * 20, l, 12); });
  return s;
}
/* ---------- le croquis : six situations ---------- */
function caAuto(x, y, rot, lettre){
  const bleu = lettre === 'A';
  return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')"><rect x="-10" y="-16" width="20" height="32" rx="5" fill="' + (bleu ? '#9CC3EE' : '#FFE27A') + '" stroke="' + (bleu ? '#2F6DB5' : '#C9A400') + '" stroke-width="1.4"/>' +
    '<rect x="-7" y="-11" width="14" height="7" rx="2" fill="none" stroke="' + (bleu ? '#2F6DB5' : '#C9A400') + '"/>' +
    '<text transform="rotate(' + (-rot) + ')" y="4" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="' + (bleu ? '#0B3D91' : '#5A4700') + '">' + lettre + '</text></g>';
}
function caFleche(x1, y1, x2, y2){ return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#0B3D91" stroke-width="2" marker-end="url(#caFl)"/>'; }
function caRoute(x, y, w, h){ return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#EEF0F2" stroke="#59606B"/>'; }
function caPointilles(x1, y1, x2, y2){ return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#59606B" stroke-dasharray="10 8"/>'; }
function caCroquisSVG(){
  const r = CA.r;
  if(!r.croquis) return '';
  /* le premier rôle (celui qui roulait, qui était devant…) est la voiture école, sauf « inverser » */
  const un = r.inverse ? caLui() : r.cote, deux = r.inverse ? r.cote : caLui();
  const rue1 = caCoupe(r.rue1, 28), rue2 = caCoupe(r.rue2, 28);
  let s = '';
  if(r.croquis === 'giratoire'){
    s = caRoute(-300, -14, 238, 28) + caRoute(62, -14, 240, 28) + caRoute(-14, 62, 28, 30) +
      '<circle r="62" fill="#EEF0F2" stroke="#59606B"/><circle r="26" fill="#fff" stroke="#59606B"/>' +
      '<g transform="rotate(-35)">' + caAuto(0, -44, 90, un) + '</g>' + caAuto(-92, 0, 90, deux) + caFleche(-76, 0, -56, -10) +
      caEcrit(-296, -22, rue1, 11) + caEcrit(70, -22, rue2, 11);
  }else if(r.croquis === 'carrefour'){
    s = caRoute(-300, -18, 600, 36) + caRoute(-18, -88, 36, 176) + '<rect x="-18" y="-18" width="36" height="36" fill="#EEF0F2"/>' +
      caAuto(9, 52, 0, un) + caFleche(9, 34, 9, 14) + caAuto(62, -9, -90, deux) + caFleche(44, -9, 24, -9) +
      caEcrit(-296, -24, rue1, 11) + caEcrit(26, -64, rue2, 11);
  }else if(r.croquis === 'arriere'){
    s = caRoute(-300, -22, 600, 44) + caPointilles(-300, 0, 300, 0) +
      caAuto(40, 11, 90, un) + caAuto(-14, 11, 90, deux) + caFleche(4, 11, 22, 11) + caEcrit(-296, -28, rue1, 11);
  }else if(r.croquis === 'file'){
    s = caRoute(-300, -22, 600, 44) + caPointilles(-300, 0, 300, 0) +
      caAuto(40, -11, 90, un) + caAuto(-6, 11, 60, deux) + caFleche(8, 4, 24, -4) + caEcrit(-296, -28, rue1, 11);
  }else if(r.croquis === 'stationnement'){
    s = caRoute(-300, -6, 600, 44) + caPointilles(-300, 16, 300, 16) +
      [-120, -80, -40, 0, 40].map(x => '<rect x="' + x + '" y="-50" width="40" height="44" fill="#fff" stroke="#59606B"/>').join('') +
      caAuto(60, 5, 90, un) + caAuto(20, -24, 200, deux) + caFleche(26, -4, 34, 2) + caEcrit(-296, -12, rue1, 11);
  }else if(r.croquis === 'face'){
    s = caRoute(-300, -22, 600, 44) + caPointilles(-300, 0, 300, 0) +
      caAuto(-30, 11, 90, un) + caFleche(-12, 11, 6, 11) + caAuto(40, -3, -90, deux) + caFleche(22, -3, 6, 4) + caEcrit(-296, -28, rue1, 11);
  }
  return '<g transform="translate(500 1194)">' + s + '</g>';
}
function caSVG(ici, iciCote){
  const r = CA.r, nous = caNous(), lui = caLuiDonnees();
  const R = (n) => ici.indexOf(n) !== -1;
  let s = '<svg viewBox="0 0 1000 1414" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Le constat amiable, rempli d’après les réponses">' +
    '<defs><marker id="caFl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#0B3D91"/></marker></defs>' +
    '<rect width="1000" height="1414" fill="#fff"/>' +
    '<text x="500" y="38" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#1F2A37">CONSTAT AMIABLE D’ACCIDENT AUTOMOBILE</text>' +
    '<text x="500" y="58" text-anchor="middle" font-family="Arial" font-size="10" fill="#59606B">ne constitue pas une reconnaissance de responsabilité, mais un relevé des identités et des faits</text>';
  s += caBoite(20, 72, 210, 74, 1, 'Date de l’accident · heure', '', '', R(1)) + caEcrit(46, 118, caJour(r.date) + '  ' + caHeureDite(r.heure), 14);
  s += caBoite(240, 72, 400, 74, 2, 'Localisation : pays · lieu', '', '', R(2)) + caEcrit(266, 110, r.pays, 13) + caEcrit(266, 132, r.lieu, 13, 52);
  s += caBoite(650, 72, 330, 74, 3, 'Blessé(s) même léger(s)', '', '', R(3)) + caImp(676, 120, 'non', 9) + caCoche(700, 111, r.blesses === 'non') + caImp(740, 120, 'oui', 9) + caCoche(762, 111, r.blesses === 'oui');
  s += caBoite(20, 154, 470, 86, 4, 'Dégâts matériels autres qu’aux véhicules A et B', '', '', R(4)) +
    caImp(46, 195, 'à des véhicules', 8.5) + caImp(150, 195, 'non', 8.5) + caCoche(172, 186, r.autresVeh === 'non') + caImp(200, 195, 'oui', 8.5) + caCoche(220, 186, r.autresVeh === 'oui') +
    caImp(46, 222, 'à des objets', 8.5) + caImp(150, 222, 'non', 8.5) + caCoche(172, 213, r.autresObj === 'non') + caImp(200, 222, 'oui', 8.5) + caCoche(220, 213, r.autresObj === 'oui');
  s += caBoite(500, 154, 480, 86, 5, 'Témoins : noms, adresses, tél.', '', '', R(5));
  caLignes(r.temoins, 58).slice(0, 2).forEach((l, i) => { s += caEcrit(526, 200 + i * 20, l, 13); });
  s += caColonne(20, 'A', ici, iciCote) + caColonne(670, 'B', ici, iciCote);
  s += caBoite(338, 252, 324, 822, 12, 'Circonstances', '#59606B', '#FAFAFA', R(12));
  const cA = r.cote === 'A' ? nous.circ : lui.circ, cB = r.cote === 'A' ? lui.circ : nous.circ;
  s += caImp(352, 286, 'A', 10, true, '#2F6DB5') + caImp(640, 286, 'B', 10, true, '#9A7C00') + caImp(380, 286, '* cocher les cases utiles', 7.5);
  CA_CIRC.forEach((t, i) => {
    const y = 300 + i * 43;
    s += caCoche(348, y, cA.indexOf(i + 1) !== -1) + caCoche(638, y, cB.indexOf(i + 1) !== -1) + caImp(368, y + 9, (i + 1) + '', 8.5, true);
    const mots = t.split(' '); let l1 = '', l2 = '';
    mots.forEach(m => { if((l1 + ' ' + m).length < 44 && !l2) l1 = (l1 ? l1 + ' ' : '') + m; else l2 = (l2 ? l2 + ' ' : '') + m; });
    s += caImp(384, y + 9, l1, 8) + (l2 ? caImp(384, y + 20, l2, 8) : '');
  });
  s += caImp(352, 1048, 'nombre de cases cochées', 8, true) + '<rect x="352" y="1054" width="26" height="16" fill="#fff" stroke="#2F6DB5"/><rect x="622" y="1054" width="26" height="16" fill="#fff" stroke="#C9A400"/>' +
    (cA.length ? caEcrit(360, 1067, String(cA.length), 13) : '') + (cB.length ? caEcrit(630, 1067, String(cB.length), 13) : '');
  s += caBoite(20, 1084, 960, 200, 13, 'Croquis de l’accident au moment du choc', '', '', R(13)) + caCroquisSVG();
  const xObs = r.cote === 'A' ? 20 : 670;
  s += caBoite(20, 1292, 310, 106, 14, 'Mes observations (A)', '#2F6DB5', '#E3EFFB', R(14) && (iciCote || r.cote) === 'A');
  s += caBoite(670, 1292, 310, 106, 14, 'Mes observations (B)', '#C9A400', '#FFF7CF', R(14) && (iciCote || r.cote) === 'B');
  caLignes(nous.obs, 50).slice(0, 5).forEach((l, i) => { s += caEcrit(xObs + 10, 1324 + i * 14.5, l, 10); });
  s += caBoite(338, 1292, 324, 106, 15, 'Signature des conducteurs', '', '', R(15)) + caImp(352, 1330, 'A', 10, true, '#2F6DB5') + caImp(640, 1330, 'B', 10, true, '#9A7C00') + caImp(380, 1388, 'à signer sur le papier, rien ne s’ajoute après', 7.5);
  return s + '</svg>';
}

/* ============================================================
   L'ÉCRAN
   ============================================================ */
async function afficherConstat(){
  const z = document.getElementById('constatZone');
  if(!z) return;
  if(!CA.r) CA.r = caLireBrouillon();
  if(!CA.ctx){
    if(CA.charge) return;
    CA.charge = true;
    z.innerHTML = '<div class="empty">Chargement…</div>';
    try{
      CA.ctx = await appelPrep({ action: 'constatContexte' });
    }catch(e){
      CA.charge = false;
      z.innerHTML = '<div class="empty">Le constat ne s’ouvre pas : ' + caEsc(e.message || e) + '</div>';
      return;
    }
    CA.charge = false;
  }
  if(!CA.r){
    CA.r = caNeuf();
    const c = caCoursProbable();
    if(c){ CA.r.eleve = c.eleve; CA.r.neph = c.neph || caNephDe(c.eleve); }
    const vs = CA.ctx.vehicules || [];
    if(vs.length === 1) CA.r.vehicule = vs[0].id;
  }
  caDessiner();
}
function caQuestion(){ return CA_QUESTIONS[Math.max(0, Math.min(CA_QUESTIONS.length - 1, CA.r.etape || 0))]; }
function caIci(){
  if(CA.lecture >= 0){ const c = caCasesALire()[CA.lecture]; return c ? [c.n] : []; }
  if(CA.r.fini) return [];
  return caQuestion().cases;
}
function caIciCote(){
  if(CA.lecture >= 0) return CA.r.cote;
  if(CA.r.fini) return '';
  const q = caQuestion();
  return q.cote === 'nous' ? CA.r.cote : q.cote === 'lui' ? caLui() : '';
}
function caDessiner(){
  const z = document.getElementById('constatZone');
  if(!z) return;
  z.innerHTML = '<p class="cqIntro">Une question à la fois : le constat se remplit à côté, case par case. À la fin, <b>tu le recopies sur ton constat papier</b>. ' +
    'La voiture, l’assurance et le moniteur sont déjà écrits ; l’élève est cité dans les observations.</p>' +
    '<details class="cqSurPlace"><summary>🚨 Sur place, dans l’ordre</summary><ol>' +
      '<li><b>Sécurité d’abord</b> : warnings, gilets, triangle. Un blessé, même léger : le <b>15</b> ou le <b>112</b>, puis le bureau.</li>' +
      '<li><b>Les photos</b> : les deux voitures entières, les dégâts de près, les deux plaques, le carrefour ou la rue, la carte verte de l’autre conducteur.</li>' +
      '<li><b>Le constat</b>, avec l’autre conducteur : un seul exemplaire pour les deux voitures.</li>' +
      '<li><b>Ne signe rien que tu ne partages pas.</b> Un désaccord s’écrit dans la case 14. Rien ne s’ajoute après les signatures.</li>' +
      '<li><b>Chacun garde un exemplaire.</b> Photographie le constat signé et envoie-le au bureau : l’assureur doit le recevoir sous <b>5 jours ouvrés</b>.</li>' +
    '</ol></details>' +
    '<div class="cqGrille"><div class="cqQ" id="caPanneau"></div><div><div class="cqPapier" id="caPapier"></div>' +
    '<div class="cqDit">En vert, la case que la question remplit. Notre voiture est en ' + caEsc(CA.r.cote) + ' : si vous avez pris l’autre côté, le modèle suit.</div></div></div>';
  caPanneau();
  caPapier();
}
function caPapier(){
  const p = document.getElementById('caPapier');
  if(p) p.innerHTML = caSVG(caIci(), caIciCote());
  const dit = document.querySelector('#constatZone .cqDit');
  if(dit) dit.textContent = 'En vert, la case que la question remplit. Notre voiture est en ' + CA.r.cote + ' : si vous avez pris l’autre côté, le modèle suit.';
}
function caMaj(){ caGarder(); caPapier(); const rc = document.getElementById('caRecap'); if(rc) rc.textContent = caRecap(); }
function caRecap(){
  const v = caVoiture(), r = CA.r, k = (CA.ctx && CA.ctx.conducteur) || {};
  return [v ? '🚗 ' + (v.titre || v.modele) : '🚗 voiture ?', (String(k.nom || '').split(' ')[0] || '') + (r.eleve ? ' avec ' + r.eleve : ''),
          caJour(r.date).slice(0, 5) + (r.heure ? ' à ' + caHeureDite(r.heure) : '')].filter(Boolean).join(' · ');
}
function caProg(){
  return '<div class="cqProg">' + CA_QUESTIONS.map((q, i) => '<button type="button" data-ca-aller="' + i + '" aria-label="Question ' + (i + 1) + '" class="' +
    (CA.r.fini || i < CA.r.etape ? 'fait' : (i === CA.r.etape ? 'ici' : '')) + '"></button>').join('') + '</div>';
}

/* ---------- les champs d'une question ---------- */
function caChamp(chemin, label, type, attrs){
  const v = chemin.split('.').reduce((o, k) => (o ? o[k] : ''), CA.r);
  return '<label class="cqLab">' + label + (type === 'textarea'
    ? '<textarea data-r="' + chemin + '" rows="3"' + (attrs || '') + '>' + caEsc(v) + '</textarea>'
    : '<input type="' + (type || 'text') + '" data-r="' + chemin + '" value="' + caEsc(v) + '"' + (attrs || '') + '>') + '</label>';
}
function caBoutons(cle, choix){
  return '<div class="cqChoix">' + choix.map(([val, txt]) => '<button type="button" data-choix="' + cle + '" data-val="' + val + '" class="' + (CA.r[cle] === val ? 'on' : '') + '">' + txt + '</button>').join('') + '</div>';
}
function caCorps(q){
  const r = CA.r, ctx = CA.ctx || {};
  if(q.k === 'quand'){
    const vs = ctx.vehicules || [];
    const cours = ctx.cours || [];
    const miens = cours.filter(c => c.mien), autres = cours.filter(c => !c.mien);
    const opt = (nom, txt) => '<option value="' + caEsc(nom) + '"' + (r.eleve === nom ? ' selected' : '') + '>' + caEsc(txt) + '</option>';
    let el = '<option value="">— Aucun élève au volant —</option>';
    if(miens.length) el += '<optgroup label="Mes cours d’aujourd’hui">' + miens.map(c => opt(c.eleve, c.debut.replace(':', 'h') + ' · ' + c.eleve)).join('') + '</optgroup>';
    if(autres.length) el += '<optgroup label="Les autres cours d’aujourd’hui">' + autres.map(c => opt(c.eleve, c.debut.replace(':', 'h') + ' · ' + c.eleve + (c.moniteur ? ' (' + c.moniteur + ')' : ''))).join('') + '</optgroup>';
    el += '<optgroup label="Tous les élèves">' + (ctx.eleves || []).map(e => opt(e.nom, e.nom)).join('') + '</optgroup>';
    if(r.eleve && !(ctx.eleves || []).some(e => e.nom === r.eleve) && !cours.some(c => c.eleve === r.eleve)) el += opt(r.eleve, r.eleve);
    return '<div class="cqDeux">' + caChamp('date', 'Le jour', 'date', ' max="' + caIso(new Date()) + '"') + caChamp('heure', 'L’heure', 'time') + '</div>' +
      '<label class="cqLab">La voiture<select data-r="vehicule"><option value="">— Choisir la voiture —</option>' +
        vs.map(v => '<option value="' + caEsc(v.id) + '"' + (String(r.vehicule) === String(v.id) ? ' selected' : '') + '>' + caEsc(caNomVoiture(v)) + '</option>').join('') + '</select></label>' +
      '<label class="cqLab">L’élève au volant<select data-r="eleve">' + el + '</select></label>';
  }
  if(q.k === 'ou'){
    return '<div class="cqDeux">' + caChamp('pays', 'Le pays') + '</div>' + caChamp('lieu', 'La rue ou le carrefour, et la ville', 'text', ' placeholder="ex. : rond-point de …, Saint-Brieuc"') +
      '<button type="button" class="btn btn-secondary cqPetit" data-ca="position">📍 Ma position</button>' +
      (r.position ? '<div class="cqRecap">📍 Position notée (à ' + caEsc(r.position.precision || '?') + ' m près) : elle part avec l’envoi au bureau.</div>' : '');
  }
  if(q.k === 'blesses') return caBoutons('blesses', [['non', '🙂 Non, personne'], ['oui', '🚑 Oui, quelqu’un est blessé']]) +
    (r.blesses === 'oui' ? '<div class="cqAlerte">🚑 Le <b>15</b> ou le <b>112</b> d’abord. Puis appelle le bureau. Le constat attendra.</div>' : '');
  if(q.k === 'autres'){
    const b = (cle, val, txt) => '<button type="button" data-choix="' + cle + '" data-val="' + val + '" class="' + (r[cle] === val ? 'on' : '') + '">' + txt + '</button>';
    return '<div class="cqSous">À un autre véhicule (une voiture garée…)</div><div class="cqChoix cqLigne">' + b('autresVeh', 'non', 'Non') + b('autresVeh', 'oui', 'Oui') + '</div>' +
      '<div class="cqSous">À un objet (poteau, barrière, mur…)</div><div class="cqChoix cqLigne">' + b('autresObj', 'non', 'Non') + b('autresObj', 'oui', 'Oui') + '</div>';
  }
  if(q.k === 'temoins') return caChamp('temoins', 'Nom, adresse, téléphone (ou rien)', 'textarea', ' placeholder="ex. : Mme Exemple Anne, 06 00 00 00 00"');
  if(q.k === 'cote'){
    const ass = ctx.assurancePosee ? '' : '<div class="cqAlerte">🛡️ L’assurance des voitures n’est pas encore réglée (Gestion › Flotte) : recopie la carte verte de la boîte à gants.</div>';
    const k = ctx.conducteur || {};
    const manque = [k.adresse ? '' : 'ton adresse', (k.permis && k.permis.numero) ? '' : 'ton permis'].filter(Boolean);
    return '<div class="cqChoix cqLigne cqAB">' + ['A', 'B'].map(l => '<button type="button" data-choix="cote" data-val="' + l + '" class="cq' + l + (r.cote === l ? ' on' : '') + '">' + l + '</button>').join('') + '</div>' + ass +
      (manque.length ? '<div class="cqRecap">✍️ ' + caEsc(manque.join(' et ')) + ' : à écrire toi-même' + (k.fiche ? ' (pas dans ta fiche Équipe, ou pas visible pour toi).' : ' (tu n’as pas de fiche Équipe).') + '</div>' : '') +
      '<div class="cqRecap">✍️ Ta date de naissance : à écrire toi-même.</div>';
  }
  if(q.k === 'autre'){
    const o = r.autre;
    return '<label class="cqCase"><input type="checkbox" data-r="autre.luiMeme"' + (o.luiMeme ? ' checked' : '') + '> Il remplit son côté lui-même</label>' +
      (o.luiMeme ? '' : '<div class="cqDeux">' + caChamp('autre.nom', 'Son nom') + caChamp('autre.prenom', 'Son prénom') + '</div>' +
        caChamp('autre.adresse', 'Son adresse') + '<div class="cqDeux">' + caChamp('autre.cp', 'Code postal, ville') + caChamp('autre.pays', 'Pays') + '</div>' +
        '<div class="cqDeux">' + caChamp('autre.vehicule', 'Sa voiture (marque, modèle)') + caChamp('autre.immat', 'Son immatriculation') + '</div>' +
        '<div class="cqDeux">' + caChamp('autre.assureur', 'Son assureur') + caChamp('autre.contrat', 'N° de contrat') + '</div>' +
        '<div class="cqDeux">' + caChamp('autre.carteVerte', 'N° de carte verte') + caChamp('autre.agence', 'Son agence') + '</div>' +
        caChamp('autre.permis', 'Son permis (n°, catégorie)') +
        '<div class="cqRecap">📷 Le plus sûr : une photo de sa carte verte et de son permis, envoyée avec les autres à la fin.</div>');
  }
  if(q.k === 'nous' || q.k === 'lui'){
    const cle = q.k === 'nous' ? 'circNous' : 'circLui';
    return '<div class="cqChoix cqCirc">' + CA_CIRC.map((t, i) => '<button type="button" data-circ="' + cle + '" data-n="' + (i + 1) + '" class="' + (r[cle].indexOf(i + 1) !== -1 ? 'on' : '') + '"><b>' + (i + 1) + '</b>' + caEsc(t) + '</button>').join('') + '</div>' +
      '<div class="cqRecap">' + r[cle].length + ' case' + (r[cle].length > 1 ? 's' : '') + ' cochée' + (r[cle].length > 1 ? 's' : '') + ' : le nombre s’écrit en bas de la case 12.</div>';
  }
  if(q.k === 'choc'){
    const auto = (cle, titre, lettre) => {
      const bleu = lettre === 'A', coul = bleu ? '#2F6DB5' : '#C9A400';
      const Z = { avg: [-30, -54], av: [0, -64], avd: [30, -54], g: [-40, 0], d: [40, 0], arg: [-30, 54], ar: [0, 64], ard: [30, 54] };
      return '<div class="cqAuto"><div class="cqSous">' + titre + ' (' + lettre + ')</div><svg viewBox="-60 -96 120 180" role="group" aria-label="' + caEsc(titre) + '">' +
        '<rect x="-24" y="-46" width="48" height="92" rx="14" fill="' + (bleu ? '#E3EFFB' : '#FFF7CF') + '" stroke="' + coul + '" stroke-width="2"/>' +
        '<rect x="-17" y="-28" width="34" height="18" rx="4" fill="none" stroke="' + coul + '"/><text x="0" y="-82" text-anchor="middle" font-size="10" font-family="Arial" fill="currentColor">avant</text>' +
        Object.keys(Z).map(k => '<circle class="cqZone' + (r[cle] === k ? ' on' : '') + '" data-choc="' + cle + '" data-val="' + k + '" cx="' + Z[k][0] + '" cy="' + Z[k][1] + '" r="12" tabindex="0" role="button" aria-label="' + CA_CHOCS[k] + '"><title>' + CA_CHOCS[k] + '</title></circle>').join('') +
        '</svg><div class="cqRecap cqCentre">' + (r[cle] ? caEsc(CA_CHOCS[r[cle]]) : 'touche un rond') + '</div></div>';
    };
    return '<div class="cqDeux cqChocs">' + auto('chocNous', 'Notre voiture', r.cote) + auto('chocLui', 'L’autre voiture', caLui()) + '</div>';
  }
  if(q.k === 'degats') return caChamp('degatsNous', 'Sur notre voiture (' + r.cote + ')', 'text', ' placeholder="ex. : pare-choc avant droit, phare droit"') +
    caChamp('degatsLui', 'Sur l’autre voiture (' + caLui() + ')', 'text');
  if(q.k === 'croquis'){
    return '<div class="cqChoix">' + CA_CROQUIS.map(([k, t, d]) => '<button type="button" data-choix="croquis" data-val="' + k + '" class="' + (r.croquis === k ? 'on' : '') + '"><span>' + t + '<small>' + d + '</small></span></button>').join('') + '</div>' +
      (r.croquis ? '<button type="button" class="btn btn-secondary cqPetit" data-ca="inverser">⇄ Inverser les deux voitures</button>' : '') +
      '<div class="cqDeux">' + caChamp('rue1', 'Le nom de la rue') + caChamp('rue2', 'L’autre rue (s’il y en a une)') + '</div>' +
      '<div class="cqRecap">Sur le papier : les voies, le sens de chaque voiture (A, B), leur place au moment du choc, les panneaux et le nom des rues.</div>';
  }
  if(q.k === 'obs'){
    return '<div class="cqDeja">' + caEsc(caObsBase()) + '</div>' + caChamp('obsPlus', 'Ce que tu ajoutes (un désaccord, un détail)', 'textarea');
  }
  return '';
}
function caPanneau(){
  const p = document.getElementById('caPanneau');
  if(!p) return;
  const r = CA.r;
  if(CA.lecture >= 0){
    const l = caCasesALire(), c = l[CA.lecture];
    p.innerHTML = caProg() + '<div class="cqNum">Case ' + c.n + ' · ' + (CA.lecture + 1) + ' sur ' + l.length + '</div><div class="cqTitre">' + caEsc(c.titre) + '</div>' +
      '<div class="cqLire">' + (c.lignes.length ? c.lignes.map(x => '<div>' + caEsc(x) + '</div>').join('') : '<div class="vide">rien à écrire</div>') + '</div>' +
      (c.conseil ? '<div class="cqAide">' + caEsc(c.conseil) + '</div>' : '') +
      '<div class="cqBas"><button type="button" class="btn btn-secondary" data-ca="lirePrec"' + (CA.lecture ? '' : ' disabled') + '>← Case précédente</button>' +
      (CA.lecture < l.length - 1 ? '<button type="button" class="btn btn-primary" data-ca="lireSuiv">Case suivante →</button>' : '<button type="button" class="btn btn-primary" data-ca="lireFin">✅ C’est recopié</button>') + '</div>' +
      '<button type="button" class="btn btn-secondary cqPetit" data-ca="lireFin">✕ Fermer la lecture</button>';
  }else if(r.fini){
    p.innerHTML = caProg() + '<div class="cqNum">C’est rempli</div><div class="cqTitre">✅ Ton modèle est prêt</div>' +
      '<div class="cqAide">Recopie chaque case sur ton constat papier, signez, gardez chacun un exemplaire. Puis envoie la photo du constat signé au bureau.</div>' +
      (r.envoye ? '<div class="cqOk">📨 Envoyé au bureau le ' + caEsc(r.envoye) + '.</div>' : '') +
      '<div class="cqBoutons cqColonne">' +
        '<button type="button" class="btn btn-primary" data-ca="envoyer">📷 Envoyer le constat au bureau</button>' +
        '<button type="button" class="btn btn-secondary" data-ca="lire">📱 Lire case par case</button>' +
        '<button type="button" class="btn btn-secondary" data-ca="revoir">✏️ Revoir une réponse</button>' +
        '<button type="button" class="btn btn-secondary" data-ca="neuf">🗑️ Tout recommencer</button>' +
      '</div><div class="cqRecap" id="caRecap">' + caEsc(caRecap()) + '</div>';
  }else{
    const q = caQuestion(), i = r.etape;
    const coteDit = q.cote === 'nous' ? ' · voiture ' + r.cote : q.cote === 'lui' ? ' · voiture ' + caLui() : '';
    p.innerHTML = caProg() + '<div class="cqNum">Question ' + (i + 1) + ' sur ' + CA_QUESTIONS.length + ' · case ' + q.cases.join(', ') + coteDit + '</div>' +
      '<div class="cqTitre">' + caEsc(q.titre) + '</div>' + (q.aide ? '<div class="cqAide">' + caEsc(q.aide) + '</div>' : '') +
      '<div class="cqCorps">' + caCorps(q) + '</div>' +
      '<div class="cqBas"><button type="button" class="btn btn-secondary" data-ca="prec"' + (i ? '' : ' disabled') + '>← Précédent</button>' +
      '<button type="button" class="btn btn-primary" data-ca="suiv">' + (i < CA_QUESTIONS.length - 1 ? 'Suivant →' : '✅ Terminé') + '</button></div>' +
      '<div class="cqRecap" id="caRecap">' + caEsc(caRecap()) + '</div>';
  }
  caBrancher(p);
}
function caAller(etape){
  CA.r.etape = Math.max(0, Math.min(CA_QUESTIONS.length - 1, etape));
  CA.r.fini = false; CA.lecture = -1;
  caGarder(); caPanneau(); caPapier();
  const p = document.getElementById('caPanneau');
  if(p && p.getBoundingClientRect().top < 0) p.scrollIntoView({ block: 'start' });
}
function caBrancher(p){
  p.querySelectorAll('[data-r]').forEach(el => {
    const ev = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date' || el.type === 'time') ? 'change' : 'input';
    el.addEventListener(ev, () => {
      const chemin = el.getAttribute('data-r').split('.');
      const val = el.type === 'checkbox' ? el.checked : el.value;
      let o = CA.r;
      for(let k = 0; k < chemin.length - 1; k++) o = o[chemin[k]];
      o[chemin[chemin.length - 1]] = val;
      if(chemin[0] === 'eleve') CA.r.neph = val ? caNephDe(val) : '';
      if(chemin.join('.') === 'autre.luiMeme'){ caGarder(); caPanneau(); caPapier(); return; }
      caMaj();
    });
  });
  p.querySelectorAll('[data-choix]').forEach(b => b.addEventListener('click', () => {
    const cle = b.getAttribute('data-choix'), val = b.getAttribute('data-val');
    CA.r[cle] = val;
    caGarder(); caPanneau(); caPapier();
  }));
  p.querySelectorAll('[data-circ]').forEach(b => b.addEventListener('click', () => {
    const l = CA.r[b.getAttribute('data-circ')], n = Number(b.getAttribute('data-n'));
    const i = l.indexOf(n);
    if(i === -1) l.push(n); else l.splice(i, 1);
    l.sort((x, y) => x - y);
    caGarder(); caPanneau(); caPapier();
  }));
  p.querySelectorAll('[data-choc]').forEach(c => {
    const faire = () => { CA.r[c.getAttribute('data-choc')] = c.getAttribute('data-val'); caGarder(); caPanneau(); caPapier(); };
    c.addEventListener('click', faire);
    c.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); faire(); } });
  });
  p.querySelectorAll('[data-ca-aller]').forEach(b => b.addEventListener('click', () => caAller(Number(b.getAttribute('data-ca-aller')))));
  p.querySelectorAll('[data-ca]').forEach(b => b.addEventListener('click', () => caGeste(b.getAttribute('data-ca'), b)));
}
async function caGeste(g, b){
  const r = CA.r;
  if(g === 'prec') return caAller(r.etape - 1);
  if(g === 'suiv'){
    if(r.etape === 0 && !r.vehicule){ showToast('Choisis la voiture.'); return; }
    if(r.etape < CA_QUESTIONS.length - 1) return caAller(r.etape + 1);
    r.fini = true; caGarder(); caPanneau(); caPapier(); return;
  }
  if(g === 'revoir') return caAller(0);
  if(g === 'neuf'){
    if(!(await caConfirmer('Effacer toutes les réponses et recommencer ?'))) return;
    caOublier(); CA.r = null; CA.photos = { papier: [], autres: [] }; CA.envoi = null; CA.reduites = new Map();
    return afficherConstat();
  }
  if(g === 'inverser'){ r.inverse = !r.inverse; caGarder(); caPapier(); return; }
  if(g === 'position'){
    const avant = b.textContent;
    b.disabled = true; b.textContent = '📍 Position…';
    try{
      if(typeof positionDuTelephoneEC !== 'function') throw new Error('la position n’est pas disponible ici');
      const c = await positionDuTelephoneEC();
      const adr = typeof adresseDuPointEC === 'function' ? await adresseDuPointEC(c.latitude, c.longitude) : '';
      r.position = { lat: c.latitude, lng: c.longitude, precision: Math.round(c.accuracy || 0), adresse: adr };
      if(adr) r.lieu = adr;
      caGarder(); caPanneau(); caPapier();
    }catch(e){ showToast('📍 ' + (e.message || e)); b.disabled = false; b.textContent = avant; }
    return;
  }
  if(g === 'lire'){ CA.lecture = 0; caPanneau(); caPapier(); return; }
  if(g === 'lireSuiv'){ CA.lecture++; caPanneau(); caPapier(); return; }
  if(g === 'lirePrec'){ CA.lecture = Math.max(0, CA.lecture - 1); caPanneau(); caPapier(); return; }
  if(g === 'lireFin'){ CA.lecture = -1; caPanneau(); caPapier(); return; }
  if(g === 'envoyer') return caFenetreEnvoi();
}
function caConfirmer(texte){
  if(typeof confirmer === 'function') return confirmer(texte, '🗑️ Tout recommencer', true);
  return Promise.resolve(false);
}

/* ---------- la lecture case par case (notre côté) ---------- */
function caCasesALire(){
  const r = CA.r, n = caNous(), l = r.cote;
  const lignes = (a) => (a || []).filter(Boolean);
  const croquis = CA_CROQUIS.find(c => c[0] === r.croquis);
  return [
    { n: 1, titre: 'Date de l’accident · heure', lignes: [caJour(r.date) + (r.heure ? '  ' + caHeureDite(r.heure) : '')] },
    { n: 2, titre: 'Localisation', lignes: lignes([r.pays, r.lieu]) },
    { n: 3, titre: 'Blessé(s) même léger(s)', lignes: r.blesses ? ['☑ ' + r.blesses] : [] },
    { n: 4, titre: 'Dégâts matériels autres qu’aux véhicules A et B', lignes: lignes([r.autresVeh ? 'à des véhicules : ☑ ' + r.autresVeh : '', r.autresObj ? 'à des objets : ☑ ' + r.autresObj : '']) },
    { n: 5, titre: 'Témoins', lignes: lignes([r.temoins]) },
    { n: 6, titre: 'Véhicule ' + l + ' — Preneur d’assurance / assuré', lignes: lignes(n.preneur) },
    { n: 7, titre: 'Véhicule ' + l + ' — Véhicule', lignes: lignes(n.vehicule) },
    { n: 8, titre: 'Véhicule ' + l + ' — Société d’assurance', lignes: lignes(n.assurance.slice(0, 5)).concat(n.assurance[5] ? ['Dégâts au véhicule assurés : ☑ ' + n.assurance[5]] : []) },
    { n: 9, titre: 'Véhicule ' + l + ' — Conducteur', lignes: lignes(n.conducteur), conseil: 'C’est toi, le moniteur : pas l’élève.' },
    { n: 10, titre: 'Véhicule ' + l + ' — Point de choc initial', lignes: n.choc ? ['une flèche : ' + CA_CHOCS[n.choc]] : [] },
    { n: 11, titre: 'Véhicule ' + l + ' — Dégâts apparents', lignes: lignes([n.degats]) },
    { n: 12, titre: 'Circonstances — colonne ' + l, lignes: n.circ.map(i => '☑ ' + i + ' — ' + CA_CIRC[i - 1]).concat(n.circ.length ? ['nombre de cases cochées : ' + n.circ.length] : []),
      conseil: 'Seulement notre colonne : l’autre conducteur coche la sienne.' },
    { n: 13, titre: 'Croquis de l’accident', lignes: croquis ? [croquis[1].replace(/^\S+\s/, '') + (r.rue1 ? ' — ' + r.rue1 : '') + (r.rue2 ? ', ' + r.rue2 : '')] : [],
      conseil: 'Recopie le dessin : les voies, le sens de chaque voiture (A, B), les panneaux, le nom des rues.' },
    { n: 14, titre: 'Mes observations (' + l + ')', lignes: [n.obs], conseil: 'C’est ici qu’on écrit un désaccord.' },
    { n: 15, titre: 'Signature', lignes: ['Ta signature, et celle de l’autre conducteur'], conseil: 'Rien ne s’ajoute après les signatures. Chacun garde un exemplaire.' }
  ];
}

/* ============================================================
   📷 L'ENVOI AU BUREAU
   ============================================================ */
function caFenetreEnvoi(){
  const r = CA.r, v = caVoiture();
  if(!v){ showToast('Choisis d’abord la voiture (question 1).'); return caAller(0); }
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const b = document.createElement('div');
  b.className = 'modal caEnvoi';
  const limite = caLimite(r.date);
  const recap = '🚗 ' + (v.titre || v.modele) + (r.eleve ? ' · cours de ' + r.eleve : '') + ' · le ' + caJour(r.date).slice(0, 5) + (r.heure ? ' à ' + caHeureDite(r.heure) : '');
  b.innerHTML = '<h3>📷 Envoyer le constat au bureau</h3><p class="caResume">' + caEsc(recap) + '</p>' +
    '<label>Le constat signé <small>(facultatif — recto, verso…)</small></label><div class="caPhotos" id="caPhPapier"></div>' +
    '<label>Les dégâts, l’autre voiture, le lieu, sa carte verte… <small>(autant que tu veux)</small></label><div class="caPhotos" id="caPhAutres"></div>' +
    '<label for="caDegats">Les dégâts sur notre voiture (case 11)</label><input type="text" id="caDegats" maxlength="300">' +
    '<label for="caMot">Un mot pour le bureau</label><textarea id="caMot" rows="3" maxlength="1200" placeholder="ce qui s’est passé, en deux phrases"></textarea>' +
    '<label>Ce qui part</label><ul class="caPart">' +
      '<li><input type="checkbox" id="caPFil" checked><span><label for="caPFil">💬 Les photos dans le fil de la voiture « ' + caEsc(v.titre || v.modele) + ' »</label><small>Toute l’équipe voit ce qui est arrivé à la voiture ; une ligne s’ajoute à son historique (Flotte).</small></span></li>' +
      '<li><input type="checkbox" id="caPBureau" checked><span><label for="caPBureau">📨 Un message au bureau</label><small>« Constat à envoyer à l’assureur avant le ' + caEsc(limite) + ' (5 jours ouvrés). » Avec la photo du constat.</small></span></li>' +
      '<li><input type="checkbox" id="caPDegat" checked><span><label for="caPDegat">🩹 Un dégât dans la carrosserie de la voiture</label><small>Gestion › Flotte › Carrosserie, à l’endroit du choc, avec une photo.</small></span></li>' +
    '</ul><div class="caEtat" id="caEtat" hidden></div>' +
    '<div class="btn-row" style="margin-top:14px;"><button class="btn btn-secondary" type="button" id="caAnnuler">Annuler</button><button class="btn btn-primary" type="button" id="caPartir">📨 Envoyer</button></div>';
  fond.appendChild(b);
  document.body.appendChild(fond);
  b.querySelector('#caDegats').value = r.degatsNous || '';
  const fermer = () => { caLibererVignettes(b); fermerFond(fond); };
  b.querySelector('#caAnnuler').addEventListener('click', fermer);
  fond.addEventListener('click', e => { if(e.target === fond && !CA.enCours) fermer(); });
  caVignettes(b, 'papier', 'caPhPapier', '📄');
  caVignettes(b, 'autres', 'caPhAutres', '📷');
  b.querySelector('#caPartir').addEventListener('click', () => caPartir(b, fond));
  if(CA.envoi && CA.envoi.id) caEtatEnvoi(b, CA.envoi.etat || '', true);
}
function caLimite(iso){
  const d = new Date(String(iso || caIso(new Date())) + 'T12:00:00');
  let n = 5;
  while(n > 0){ d.setDate(d.getDate() + 1); if(d.getDay() !== 0 && d.getDay() !== 6) n--; }
  return d.toLocaleDateString('fr-FR', { weekday: 'long' }) + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}
function caLibererVignettes(b){ b.querySelectorAll('img[data-url]').forEach(i => { try{ URL.revokeObjectURL(i.getAttribute('data-url')); }catch(e){} }); }
function caVignettes(b, ou, id, emoji){
  const z = b.querySelector('#' + id);
  if(!z) return;
  caLibererVignettes(z);
  z.innerHTML = '';
  CA.photos[ou].forEach((f, i) => {
    const d = document.createElement('div');
    d.className = 'caPhoto pleine';
    const img = document.createElement('img');
    const u = URL.createObjectURL(f);
    img.src = u; img.alt = ''; img.setAttribute('data-url', u);
    d.appendChild(img);
    const x = document.createElement('button');
    x.type = 'button'; x.className = 'caRetirer'; x.textContent = '✕'; x.setAttribute('aria-label', 'Retirer cette photo');
    x.addEventListener('click', () => { if(CA.enCours) return; CA.photos[ou].splice(i, 1); caVignettes(b, ou, id, emoji); });
    d.appendChild(x);
    z.appendChild(d);
  });
  const plus = document.createElement('label');
  plus.className = 'caPhoto';
  plus.innerHTML = '<span>＋ ' + emoji + '<br>Photo</span>';
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.hidden = true;
  inp.addEventListener('change', () => {
    const l = Array.prototype.slice.call(inp.files || []).filter(f => /^image\//.test(f.type || 'image/'));
    CA.photos[ou] = CA.photos[ou].concat(l);
    caVignettes(b, ou, id, emoji);
  });
  plus.appendChild(inp);
  z.appendChild(plus);
}
function caEtatEnvoi(b, texte, erreur){
  const e = b.querySelector('#caEtat');
  if(!e) return;
  e.hidden = !texte;
  e.className = 'caEtat' + (erreur ? ' erreur' : '');
  e.textContent = texte || '';
}
async function caReduite(f){
  if(CA.reduites.has(f)) return CA.reduites.get(f);
  const p = await reduireLaPhoto(f);
  const x = { photo: p.data, l: p.l, h: p.h };
  CA.reduites.set(f, x);
  return x;
}
async function caPartir(b, fond){
  if(CA.enCours) return;
  const r = CA.r, v = caVoiture();
  const parties = { fil: b.querySelector('#caPFil').checked, bureau: b.querySelector('#caPBureau').checked, degat: b.querySelector('#caPDegat').checked };
  if(!parties.fil && !parties.bureau && !parties.degat){ showToast('Coche au moins une chose à envoyer.'); return; }
  const papier = CA.photos.papier.slice(), autres = CA.photos.autres.slice();
  const bouton = b.querySelector('#caPartir'), ann = b.querySelector('#caAnnuler');
  CA.enCours = true; bouton.disabled = true; ann.disabled = true;
  const degats = b.querySelector('#caDegats').value.trim();
  r.degatsNous = degats; caGarder();
  try{
    /* 1. le constat (une seule fois : un nouvel essai ne renvoie que les photos manquantes) */
    if(!CA.envoi || !CA.envoi.id){
      caEtatEnvoi(b, 'Envoi du constat…');
      let photoDegat = '';
      if(parties.degat && typeof photoReduite === 'function'){
        const f = autres[0] || papier[0];
        if(f){ try{ photoDegat = await photoReduite(f); }catch(e){ photoDegat = ''; } }
      }
      const o = r.autre || {};
      const autre = o.luiMeme ? '' : [[o.vehicule, String(o.immat || '').toUpperCase()].filter(Boolean).join(' '),
        [String(o.nom || '').toUpperCase(), o.prenom].filter(Boolean).join(' '), o.assureur ? 'assuré chez ' + o.assureur : ''].filter(Boolean).join(' — ');
      const rep = await appelPrep({ action: 'constatEnvoyer', vehicule: v.id, date: r.date, heure: r.heure, lieu: [r.lieu, r.pays && r.pays !== 'France' ? r.pays : ''].filter(Boolean).join(', '),
        eleve: r.eleve, neph: r.neph, autre: autre, degats: degats, mot: b.querySelector('#caMot').value.trim(), blesses: r.blesses, choc: r.chocNous, cote: r.cote,
        position: r.position || undefined, nbPhotos: (parties.fil || parties.bureau) ? papier.length + autres.length : 0, photoDegat: photoDegat, parties: parties });
      const lots = [];
      const ajouter = (ou, l, texte) => { for(let i = 0; i < l.length; i += CA_PAR_ENVOI) lots.push({ ou: ou, fichiers: l.slice(i, i + CA_PAR_ENVOI), texte: i ? '' : texte, fait: false }); };
      if(rep.convVehicule){ ajouter('vehicule', papier, '📄 Le constat signé'); ajouter('vehicule', autres, '📷 Les photos de l’accident'); }
      if(rep.convBureau){ ajouter('bureau', papier, '📄 Le constat signé — à envoyer à l’assureur'); if(!rep.convVehicule) ajouter('bureau', autres, '📷 Les photos de l’accident'); }
      CA.envoi = { id: rep.id, lots: lots, rep: rep };
      if(rep.dommageErreur) showToast(rep.dommageErreur);
    }
    /* 2. les photos, dix par dix */
    const lots = CA.envoi.lots, total = lots.reduce((n, l) => n + l.fichiers.length, 0);
    let faites = lots.filter(l => l.fait).reduce((n, l) => n + l.fichiers.length, 0);
    for(const lot of lots){
      if(lot.fait) continue;
      caEtatEnvoi(b, '📷 Photos : ' + faites + ' sur ' + total + '…');
      const photos = [];
      for(const f of lot.fichiers) photos.push(await caReduite(f));
      await appelPrep({ action: 'constatPhotos', constat: CA.envoi.id, ou: lot.ou, photos: photos, texte: lot.texte });
      lot.fait = true;
      faites += lot.fichiers.length;
    }
    const d = new Date();
    r.envoye = caJour(caIso(d)).slice(0, 5) + ' à ' + String(d.getHours()).padStart(2, '0') + ' h ' + String(d.getMinutes()).padStart(2, '0');
    caGarder();
    CA.enCours = false;
    caLibererVignettes(b);
    fermerFond(fond);
    CA.photos = { papier: [], autres: [] }; CA.envoi = null; CA.reduites = new Map();
    showToast('📨 Constat envoyé' + (total ? ' avec ' + total + ' photo' + (total > 1 ? 's' : '') : '') + '.');
    caPanneau();
  }catch(e){
    CA.enCours = false; bouton.disabled = false; ann.disabled = false;
    if(CA.envoi && CA.envoi.id){
      bouton.textContent = '🔁 Renvoyer les photos manquantes';
      caEtatEnvoi(b, 'Le constat est parti, mais des photos non : ' + (e.message || e) + '. Réessaie : seules les manquantes repartent.', true);
    }else{
      caEtatEnvoi(b, 'Rien n’est parti : ' + (e.message || e), true);
    }
  }
}

/* ============================================================
   🛡️ L'ASSURANCE DES VOITURES — Gestion › Flotte, une fois pour toutes
   ============================================================ */
async function afficherAssuranceFlotte(){
  const zone = document.getElementById('flotteZone');
  if(!zone) return;
  let c = document.getElementById('caAssurance');
  if(!c){
    c = document.createElement('div');
    c.id = 'caAssurance'; c.className = 'amBloc caAssBloc';
    zone.parentNode.insertBefore(c, zone);
  }
  let d;
  try{ d = await appelPrep({ action: 'flotteAssurance' }); }
  catch(e){ c.innerHTML = '<div class="caResume">🛡️ L’assurance ne se lit pas : ' + caEsc(e.message || e) + '</div>'; return; }
  const peut = typeof niveauDroit !== 'function' || niveauDroit('flotte') === 'm';
  const a = d.assurance || {};
  const champ = (k, l, type) => '<div><label for="caAs_' + k + '">' + l + '</label><input type="' + (type || 'text') + '" id="caAs_' + k + '" value="' + caEsc(a[k]) + '"' + (peut ? '' : ' disabled') + '></div>';
  c.innerHTML = '<details' + (d.posee ? '' : ' open') + '><summary>🛡️ L’assurance des voitures' + (d.posee ? ' — ' + caEsc(a.assureur) + (a.au ? ', jusqu’au ' + caEsc(caJour(a.au)) : '') : ' — à remplir') + '</summary>' +
    '<div class="caResume">Le même contrat pour toutes les voitures. Repris tel quel dans le modèle de constat (Outils › 💥 Constat amiable, case 8).</div>' +
    '<div class="caAssGrille">' + champ('assureur', 'Assureur') + champ('contrat', 'N° de contrat') + champ('carteVerte', 'N° de carte verte') +
      champ('agence', 'Agence (nom, téléphone)') + champ('du', 'Valable du', 'date') + champ('au', 'Au', 'date') +
      '<div><label for="caAs_degats">Les dégâts au véhicule sont assurés</label><select id="caAs_degats"' + (peut ? '' : ' disabled') + '><option value="oui">Oui</option><option value="non"' + (a.degats === 'non' ? ' selected' : '') + '>Non</option></select></div>' +
    '</div>' + (d.majPar ? '<div class="caResume" style="margin-top:8px">Modifié le ' + caEsc(d.majLe) + ' par ' + caEsc(d.majPar) + '.</div>' : '') +
    (peut ? '<div class="btn-row" style="margin-top:12px;"><button class="btn btn-primary" type="button" id="caAsOk" style="width:auto;">💾 Enregistrer</button></div>' : '') + '</details>';
  const ok = c.querySelector('#caAsOk');
  if(ok) ok.addEventListener('click', async () => {
    if(ok.disabled) return;
    ok.disabled = true;
    const v = {};
    ['assureur', 'contrat', 'carteVerte', 'agence', 'du', 'au', 'degats'].forEach(k => { v[k] = c.querySelector('#caAs_' + k).value.trim(); });
    try{
      await appelPrep({ action: 'flotteAssurancePoser', assurance: v });
      if(CA.ctx){ CA.ctx.assurance = v; CA.ctx.assurancePosee = 1; }
      showToast('🛡️ Assurance enregistrée');
      afficherAssuranceFlotte();
    }catch(e){ showToast('Impossible : ' + (e.message || e)); ok.disabled = false; }
  });
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-constat.js'] = true;
