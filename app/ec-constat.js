/* Déployé le 26/11/2026 à 15:41 — v1588 */
/* ============================================================
   💥 LE CONSTAT AMIABLE — v1518, v1520 (Outils › 💥 Constat amiable)

   David, le 20 novembre : « une aide pour remplir un constat amiable
   avec un modèle de ce que le moniteur doit remplir », « qu'on voie
   une image d'un vrai constat qui se remplit tout seul à peu près si
   on répond à des questions », « car les moniteurs vont remplir un
   vrai constat papier », et « pouvoir prendre en photo le constat
   papier s'il veut et des photos en plus autant qu'il veut ».

   v1520 — David, avec un vrai constat rempli en modèle :
     · « 📱 Pas de constat papier » : on remplit aussi le côté de l'autre
       véhicule, les deux conducteurs signent sur l'écran, et l'autre
       reçoit sa copie (PDF du constat européen) par le mail de l'école,
       le bureau aussi ;
     · ce que l'appli n'a pas de NOTRE côté se remplit aussi (sa date de
       naissance, son téléphone, ce qui manque à sa fiche) ;
     · les cases comme sur le papier : l'assuré a son téléphone ou mail,
       le pays à part ; l'agence d'assurance a son nom, son adresse, son
       pays, son téléphone ; la remorque (BE) ;
     · le croquis devient un vrai outil de dessin : voitures A et B à
       glisser et tourner, autres véhicules, panneaux (stop, cédez le
       passage, feu, sens interdit, passage piéton, priorité à droite),
       crayon, flèches, texte ;
     · « 📷 Juste envoyer la photo du constat » sans rien remplir ;
     · « ❓ Une question sur une case » : il touche la case, il lit quoi
       y écrire ; « 💬 Demander au bureau » envoie sa question.

   ⚠️ LE MODÈLE N'EST PAS UNE DÉCLARATION À L'ASSUREUR. L'appli remplit
   le constat, il le fait signer ; c'est l'école (le bureau) qui
   l'envoie à l'assureur.

   ⚠️ LES RÉPONSES TIENNENT DANS CE TÉLÉPHONE (localStorage), le temps
   de recopier ou de signer : un appel qui coupe l'appli au bord de la
   route ne doit pas faire tout recommencer. Les photos, elles, ne s'y
   gardent pas (trop lourdes) : elles partent à l'envoi.
   ============================================================ */

const CA = { ctx: null, charge: false, r: null, lecture: -1, aide: 0, aideCote: '', photos: { papier: [], autres: [] }, envoi: null, reduites: new Map() };
const CA_PAR_ENVOI = 10;
const CA_CIRC = ['en stationnement / à l’arrêt', 'quittait un stationnement / ouvrait une portière', 'prenait un stationnement',
  'sortait d’un parking, d’un lieu privé, d’un chemin de terre', 's’engageait dans un parking, un lieu privé, un chemin de terre',
  's’engageait sur une place à sens giratoire', 'roulait sur une place à sens giratoire',
  'heurtait à l’arrière, en roulant dans le même sens et sur une même file', 'roulait dans le même sens et sur une file différente',
  'changeait de file', 'doublait', 'virait à droite', 'virait à gauche', 'reculait',
  'empiétait sur une voie réservée à la circulation en sens inverse', 'venait de droite (dans un carrefour)',
  'n’avait pas observé un signal de priorité ou un feu rouge'];
/* Les questions. « modes » : seulement dans ces modes ; « sautLuiMeme » : sautée
   quand l'autre remplit son côté lui-même (constat papier). */
const CA_QUESTIONS = [
  { k: 'quand', titre: 'C’est arrivé quand, avec quelle voiture ?', aide: 'L’heure et l’élève du cours sont déjà mis : corrige si besoin.', cases: [1, 7, 14] },
  { k: 'ou', titre: 'Où ?', aide: '📍 « Ma position » donne la rue ; sinon tape le carrefour et la ville.', cases: [2] },
  { k: 'blesses', titre: 'Quelqu’un est blessé, même légèrement ?', aide: 'Oui : le 15 ou le 112 d’abord, puis le bureau.', cases: [3] },
  { k: 'autres', titre: 'D’autres dégâts ? (poteau, barrière, voiture garée…)', cases: [4] },
  { k: 'temoins', titre: 'Des témoins ?', aide: 'Un passant ou un autre conducteur : son nom et son téléphone.', cases: [5] },
  { k: 'cote', titre: 'Sur le constat, notre voiture est A ou B ?', aide: 'Le côté que vous avez choisi avec l’autre conducteur. Le modèle suit.', cases: [6, 7, 8, 9], cote: 'nous' },
  { k: 'nosInfos', titre: 'Notre côté : ce que l’appli ne sait pas', aide: 'Rien d’obligatoire : ce que tu remplis ici s’écrit dans le constat.', cases: [6, 9], cote: 'nous' },
  { k: 'autreAssure', titre: 'L’autre véhicule : l’assuré', aide: 'Comme sur sa carte verte (attestation d’assurance).', cases: [6], cote: 'lui' },
  { k: 'autreVehicule', titre: 'Sa voiture et son assurance', aide: 'Sa plaque, puis sa carte verte : la société, le contrat, l’agence.', cases: [7, 8], cote: 'lui', sautLuiMeme: true },
  { k: 'autreConducteur', titre: 'Son conducteur', aide: 'Comme sur son permis de conduire.', cases: [9], cote: 'lui', sautLuiMeme: true },
  { k: 'nous', titre: 'Que faisait notre voiture ?', aide: 'Coche seulement ce qui est vrai. Le nombre de cases se compte tout seul.', cases: [12], cote: 'nous' },
  { k: 'lui', titre: 'Et l’autre voiture ?', aide: 'Ce que l’autre conducteur coche de son côté.', cases: [12], cote: 'lui' },
  { k: 'choc', titre: 'Où a été le premier choc ?', aide: 'Touche l’endroit sur chaque voiture.', cases: [10] },
  { k: 'degats', titre: 'Les dégâts qu’on voit', aide: 'En quelques mots, sur chaque voiture.', cases: [11] },
  { k: 'croquis', titre: 'Le croquis', aide: 'Choisis ce qui ressemble, puis ✏️ dessine : bouge les voitures, ajoute les panneaux, les flèches, le nom des rues.', cases: [13] },
  { k: 'obs', titre: 'Nos observations', aide: 'Déjà écrit pour un cours. Un désaccord s’ajoute ici.', cases: [14], cote: 'nous' },
  { k: 'obsLui', titre: 'Ses observations', aide: 'Ce que l’autre conducteur veut écrire de son côté (facultatif).', cases: [14], cote: 'lui', modes: ['tablette'] },
  { k: 'signer', titre: 'Les signatures', aide: 'Relisez le constat ensemble, puis chacun signe dans sa case. Rien ne s’ajoute après.', cases: [15], modes: ['tablette'] }
];
const CA_CHOCS = { avg: 'avant gauche', av: 'avant', avd: 'avant droit', g: 'côté gauche', d: 'côté droit', arg: 'arrière gauche', ar: 'arrière', ard: 'arrière droit' };
/* Les fonds du croquis (800 × 400) et la place des deux voitures */
const CA_FONDS = [
  ['vide', '▦ Vide (quadrillé)', 'on dessine tout'],
  ['giratoire', '🔄 Rond-point', 'l’une roulait sur le rond-point, l’autre s’y engageait'],
  ['carrefour', '✚ Carrefour', 'l’une venait de droite'],
  ['arriere', '⬆️ Même file, par l’arrière', 'l’une a heurté l’autre à l’arrière'],
  ['file', '↗️ Changement de file', 'l’une changeait de file'],
  ['stationnement', '🅿️ Stationnement, marche arrière', 'l’une sortait d’une place ou reculait'],
  ['face', '⇅ Sens inverse', 'l’une empiétait sur la voie d’en face']
];
const CA_PLACES = {
  vide: [[330, 200, 90], [470, 200, 90]],
  giratoire: [[455, 108, 125], [262, 200, 90]],
  carrefour: [[412, 300, 0], [540, 188, 270]],
  arriere: [[470, 215, 90], [360, 215, 90]],
  file: [[470, 180, 90], [380, 225, 60]],
  stationnement: [[470, 222, 90], [400, 148, 200]],
  face: [[350, 225, 90], [460, 186, 270]]
};
/* La palette du croquis : à glisser sur le dessin */
const CA_OBJETS = [
  ['moto', '🏍️', 'Moto'], ['camion', '🚚', 'Camion'], ['velo', '🚲', 'Vélo'], ['pieton', '🚶', 'Piéton'],
  ['stop', 'STOP', 'Stop'], ['cedez', '▽', 'Cédez le passage'], ['feu', '🚦', 'Feu tricolore'], ['sensInterdit', '⛔', 'Sens interdit'],
  ['passage', '▤', 'Passage piéton'], ['prioDroite', '⚠', 'Priorité à droite']
];
/* ❓ Ce qu'on écrit dans chaque case (l'aide par case) */
const CA_AIDE_CASES = {
  1: ['Date de l’accident · heure', 'Le jour et l’heure de l’accident.'],
  2: ['Localisation', 'Le pays, puis le lieu précis : la rue (avec le numéro si possible), le carrefour, la ville.'],
  3: ['Blessé(s) même léger(s)', 'Coche oui si quelqu’un est blessé, même un peu. Un blessé : le 15 ou le 112 d’abord, puis le bureau.'],
  4: ['Dégâts matériels autres qu’aux véhicules A et B', 'Des dégâts à autre chose que les deux voitures : un autre véhicule (une voiture garée…) ou un objet (poteau, barrière, mur…). Sinon : non, non.'],
  5: ['Témoins', 'Le nom, l’adresse et le téléphone d’un témoin. Un passant ou un autre conducteur compte plus qu’un passager.'],
  6: ['Preneur d’assurance / assuré', 'Celui qui est assuré pour la voiture. Pour nous : l’auto-école, pas l’élève ni le moniteur.'],
  7: ['Véhicule', 'Marque et modèle, la plaque, le pays. La partie « Remorque » : seulement s’il y a une remorque (BE).'],
  8: ['Société d’assurance', 'Recopie la carte verte (l’attestation d’assurance) de la boîte à gants : la société, le contrat, la carte verte, les dates, l’agence. Les dégâts au véhicule sont assurés : oui.'],
  9: ['Conducteur', 'Celui qui conduisait. Pendant un cours, c’est toi, le moniteur : pas l’élève. Ton permis, ta date de naissance.'],
  10: ['Point de choc initial', 'Une flèche sur le dessin de la voiture, là où elle a été touchée en premier.'],
  11: ['Dégâts apparents', 'Ce qu’on voit sur la voiture : pare-choc, phare, aile, rétroviseur…'],
  12: ['Circonstances', 'Chacun coche, dans SA colonne, ce que faisait sa voiture. Puis le nombre de cases cochées, en bas.'],
  13: ['Croquis', 'Les voies, le sens de chaque voiture (A, B) avec une flèche, leur place au moment du choc, les panneaux et feux, le nom des rues.'],
  14: ['Mes observations', 'Pour nous : véhicule école à double commande, leçon en cours, l’élève au volant. Un désaccord s’écrit ici, AVANT de signer.'],
  15: ['Signature des conducteurs', 'Les deux conducteurs signent. Rien ne s’ajoute après les signatures. Chacun garde un exemplaire.']
};

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
function caJoindre(){ return Array.prototype.slice.call(arguments).filter(x => String(x || '').trim()).join(' · '); }
/* « François EXEMPLE » → nom EXEMPLE, prénom François ; « Paul Autre » → AUTRE, Paul */
function caNomPrenom(n){
  const mots = String(n || '').trim().split(/\s+/).filter(Boolean);
  if(mots.length < 2) return [mots.join(' ').toUpperCase(), ''];
  const maj = mots.filter(m => m.length > 1 && m === m.toUpperCase() && /[A-ZÀ-Ý]/.test(m));
  if(maj.length && maj.length < mots.length) return [maj.join(' '), mots.filter(m => maj.indexOf(m) === -1).join(' ')];
  return [mots[mots.length - 1].toUpperCase(), mots.slice(0, -1).join(' ')];
}

/* ---------- les réponses ---------- */
function caAutreNeuf(){
  return { luiMeme: false, pNom: '', pPrenom: '', pAdresse: '', pCp: '', pPays: 'France', pTel: '',
    vehicule: '', immat: '', vPays: 'France', rImmat: '', rPays: '',
    assureur: '', contrat: '', carteVerte: '', du: '', au: '', agNom: '', agAdresse: '', agPays: '', agTel: '', degats: '',
    meme: true, cNom: '', cPrenom: '', cNaissance: '', cAdresse: '', cPays: '', cTel: '', permis: '', categories: '', valable: '', mail: '' };
}
function caNeuf(){
  const d = new Date();
  return { v: 2, mode: '', q: 'quand', vehicule: '', remorque: '', eleve: '', neph: '', date: caIso(d), heure: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'),
    pays: 'France', lieu: '', position: null, blesses: '', autresVeh: '', autresObj: '', temoins: '', cote: 'A',
    nous: { naissance: '', tel: '', adresse: '', permis: '', categories: '', valable: '' },
    autre: caAutreNeuf(),
    circNous: [], circLui: [], chocNous: '', chocLui: '', degatsNous: '', degatsLui: '',
    croquis: { fond: '', objets: [], traits: [] }, obsPlus: '', obsLui: '',
    sigNous: '', sigLui: '', relu: false, mailEnvoye: '', fini: false, envoye: '' };
}
function caLireBrouillon(){
  try{
    const x = JSON.parse(localStorage.getItem(caCleLocale()) || 'null');
    if(x && x.v === 2){
      const n = caNeuf();
      return Object.assign(n, x, { autre: Object.assign(n.autre, x.autre || {}), nous: Object.assign(n.nous, x.nous || {}),
        croquis: Object.assign(n.croquis, x.croquis || {}) });
    }
  }catch(e){}
  return null;
}
function caGarder(){ try{ localStorage.setItem(caCleLocale(), JSON.stringify(CA.r)); }catch(e){} }
function caOublier(){ try{ localStorage.removeItem(caCleLocale()); }catch(e){} }
function caVoiture(){ return ((CA.ctx && CA.ctx.vehicules) || []).find(v => String(v.id) === String(CA.r.vehicule)) || null; }
function caRemorque(){ return ((CA.ctx && CA.ctx.vehicules) || []).find(v => String(v.id) === String(CA.r.remorque)) || null; }
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
/* Les questions de ce mode, dans l'ordre */
function caQuestions(){
  const r = CA.r, mode = r.mode === 'tablette' ? 'tablette' : 'papier';
  return CA_QUESTIONS.filter(q => (!q.modes || q.modes.indexOf(mode) !== -1) && !(q.sautLuiMeme && mode === 'papier' && r.autre.luiMeme));
}
function caRang(){ const l = caQuestions(); const i = l.findIndex(q => q.k === CA.r.q); return i === -1 ? 0 : i; }

/* ---------- ce qu'on écrit de chaque côté ---------- */
function caNous(){
  const c = CA.ctx || {}, r = CA.r, v = caVoiture(), rem = caRemorque(), a = c.assurance || {}, e = c.ecole || {}, k = c.conducteur || {}, N = r.nous || {};
  const [nom, prenom] = caNomPrenom(k.nom);
  const p = k.permis || {};
  const permis = N.permis || p.numero || '', cat = N.categories || p.categories || '', valable = N.valable || p.valableJusqua || '';
  const pays = a.preneurPays || 'France';
  return {
    preneur: [a.preneurNom || e.societe || e.nom || '', a.preneurPrenom != null && a.preneurNom ? a.preneurPrenom : (e.societe ? e.nom : ''),
      a.preneurAdresse || e.adresse || '(l’adresse de l’école)', caJoindre(a.preneurCP || e.ville, pays), a.preneurTel || e.mail || ''],
    vehicule: [v ? (v.modele || v.nom) : '', v ? String(v.immat || '').toUpperCase() : '', v ? 'France' : '',
      rem ? caJoindre('Remorque ' + String(rem.immat || '').toUpperCase(), 'France') : ''],
    assurance: c.assurancePosee
      ? [a.assureur, a.contrat ? 'Contrat ' + a.contrat : '', a.carteVerte ? 'Carte verte ' + a.carteVerte : '',
         (a.du || a.au) ? 'du ' + caJour(a.du) + ' au ' + caJour(a.au) : '', a.agenceNom || a.agence || '', a.agenceAdresse || '',
         caJoindre(a.agencePays, a.agenceTel), a.degats === 'non' ? 'non' : 'oui']
      : ['(la carte verte de la voiture)', '', '', '', '', '', '', ''],
    conducteur: [nom, prenom, N.naissance ? caJour(N.naissance) : (r.mode === 'tablette' ? '' : 'né le … (à écrire)'),
      N.adresse || k.adresse || (r.mode === 'tablette' ? '' : '(ton adresse)'), caJoindre(N.adresse || k.adresse ? 'France' : '', N.tel || k.tel || ''),
      permis ? caJoindre('Permis ' + permis, cat) : (r.mode === 'tablette' ? '' : '(ton permis : n° et catégorie)'),
      valable ? 'valable jusqu’au ' + (caJour(valable) || valable) : ''],
    choc: r.chocNous, degats: r.degatsNous, circ: r.circNous, obs: caObs()
  };
}
function caLuiDonnees(){
  const r = CA.r, o = r.autre || {};
  if(o.luiMeme && r.mode !== 'tablette') return { preneur: ['(il remplit son côté)', '', '', '', ''], vehicule: ['', '', '', ''], assurance: ['', '', '', '', '', '', '', ''],
    conducteur: ['', '', '', '', '', '', ''], choc: r.chocLui, degats: r.degatsLui, circ: r.circLui, obs: '' };
  const c = o.meme ? { nom: o.pNom, prenom: o.pPrenom, adresse: o.pAdresse, pays: o.pPays, tel: o.pTel } : { nom: o.cNom, prenom: o.cPrenom, adresse: o.cAdresse, pays: o.cPays, tel: o.cTel };
  return {
    preneur: [String(o.pNom || '').toUpperCase(), o.pPrenom, o.pAdresse, caJoindre(o.pCp, o.pPays), o.pTel],
    vehicule: [o.vehicule, String(o.immat || '').toUpperCase(), o.immat ? o.vPays : '', o.rImmat ? caJoindre('Remorque ' + String(o.rImmat).toUpperCase(), o.rPays) : ''],
    assurance: [o.assureur, o.contrat ? 'Contrat ' + o.contrat : '', o.carteVerte ? 'Carte verte ' + o.carteVerte : '',
      (o.du || o.au) ? 'du ' + (caJour(o.du) || '…') + ' au ' + (caJour(o.au) || '…') : '', o.agNom, o.agAdresse, caJoindre(o.agPays, o.agTel), o.degats],
    conducteur: [String(c.nom || '').toUpperCase(), c.prenom, o.cNaissance ? caJour(o.cNaissance) : '', c.adresse, caJoindre(c.pays, c.tel),
      o.permis ? caJoindre('Permis ' + o.permis, o.categories) : '', o.valable ? 'valable jusqu’au ' + (caJour(o.valable) || o.valable) : ''],
    choc: r.chocLui, degats: r.degatsLui, circ: r.circLui, obs: r.mode === 'tablette' ? String(r.obsLui || '') : ''
  };
}

/* ============================================================
   LE CROQUIS : LES OBJETS (800 × 400), dessinés pareil dans l'outil
   et dans la case 13 du constat
   ============================================================ */
const CA_ROUTE = '#E4E7EB', CA_BORD = '#59606B';
/* une route = un trait épais bordé (le bord, puis le fond, puis les pointillés) */
function caTraitRoute(d, pointilles){
  return '<path d="' + d + '" fill="none" stroke="' + CA_BORD + '" stroke-width="64" stroke-linecap="butt"/>' +
    '<path d="' + d + '" fill="none" stroke="' + CA_ROUTE + '" stroke-width="60" stroke-linecap="butt"/>' +
    (pointilles === false ? '' : '<path d="' + d + '" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="12 10"/>');
}
function caDessinObjet(o){
  const t = o.t;
  if(t === 'rDroite') return caTraitRoute('M -160 0 L 160 0');
  if(t === 'rCourbeD') return caTraitRoute('M -60 160 L -60 40 Q -60 -60 40 -60 L 160 -60');
  if(t === 'rCourbeG') return '<g transform="scale(-1 1)">' + caTraitRoute('M -60 160 L -60 40 Q -60 -60 40 -60 L 160 -60') + '</g>';
  if(t === 'rCarrefour' || t === 'rT'){
    const h = 'M -180 0 L 180 0', v = t === 'rT' ? 'M 0 0 L 0 180' : 'M 0 -180 L 0 180';
    return '<path d="' + h + '" stroke="' + CA_BORD + '" stroke-width="64" fill="none"/><path d="' + v + '" stroke="' + CA_BORD + '" stroke-width="64" fill="none"/>' +
      '<path d="' + h + '" stroke="' + CA_ROUTE + '" stroke-width="60" fill="none"/><path d="' + v + '" stroke="' + CA_ROUTE + '" stroke-width="60" fill="none"/>' +
      '<path d="M -180 0 L -34 0 M 34 0 L 180 0' + (t === 'rT' ? '' : ' M 0 -180 L 0 -34') + ' M 0 34 L 0 180" stroke="#fff" stroke-width="2" stroke-dasharray="12 10" fill="none"/>' +
      '<path d="M -34 -31 L -34 31 M 34 -31 L 34 31 M -31 -34 L 31 -34 M -31 34 L 31 34" stroke="#fff" stroke-width="3" fill="none"/>';
  }
  if(t === 'rGiratoire'){
    /* 🔄 v1521 — David : « quand on met un giratoire, il faut qu'on puisse
       choisir le nombre de branches » : de 2 à 8, réparties tout autour
       (on tourne le giratoire pour les orienter). */
    const n = caBranchesGiratoire(o);
    const angles = Array.from({ length: n }, (_, i) => Math.round(i * 360 / n));
    let s = '';
    angles.forEach(a => { s += '<g transform="rotate(' + a + ')">' + '<path d="M 98 0 L 190 0" stroke="' + CA_BORD + '" stroke-width="64" fill="none"/></g>'; });
    s += '<circle r="70" fill="none" stroke="' + CA_BORD + '" stroke-width="64"/>';
    angles.forEach(a => { s += '<g transform="rotate(' + a + ')"><path d="M 90 0 L 190 0" stroke="' + CA_ROUTE + '" stroke-width="60" fill="none"/><path d="M 106 0 L 190 0" stroke="#fff" stroke-width="2" stroke-dasharray="12 10" fill="none"/></g>'; });
    s += '<circle r="70" fill="none" stroke="' + CA_ROUTE + '" stroke-width="60"/><circle r="38" fill="#DDEFD2" stroke="' + CA_BORD + '" stroke-width="2"/>';
    return s;
  }
  if(t === 'rParking'){
    let s = '<rect x="-90" y="-40" width="180" height="80" fill="' + CA_ROUTE + '" stroke="' + CA_BORD + '" stroke-width="2"/>';
    for(let i = 0; i <= 4; i++) s += '<line x1="' + (-90 + i * 45) + '" y1="-40" x2="' + (-90 + i * 45) + '" y2="40" stroke="#fff" stroke-width="3"/>';
    return s + '<text x="0" y="-48" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#2F6DB5">P</text>';
  }
  if(t === 'autoA' || t === 'autoB'){
    const l = t === 'autoA' ? 'A' : 'B', bleu = l === 'A', coul = bleu ? '#2F6DB5' : '#C9A400';
    return '<rect x="-13" y="-22" width="26" height="44" rx="7" fill="' + (bleu ? '#9CC3EE' : '#FFE27A') + '" stroke="' + coul + '" stroke-width="2"/>' +
      '<rect x="-9" y="-15" width="18" height="9" rx="2" fill="none" stroke="' + coul + '" stroke-width="1.5"/>' +
      '<path d="M 0 -32 L -6 -24 L 6 -24 Z" fill="' + coul + '"/>' +
      '<text transform="rotate(' + (-(o.r || 0)) + ')" y="5" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="' + (bleu ? '#0B3D91' : '#5A4700') + '">' + l + '</text>';
  }
  if(t === 'stop') return '<path d="M -7 -17 L 7 -17 L 17 -7 L 17 7 L 7 17 L -7 17 L -17 7 L -17 -7 Z" fill="#C8102E" stroke="#fff" stroke-width="1.5"/><text y="3.5" text-anchor="middle" font-family="Arial" font-size="9" font-weight="700" fill="#fff">STOP</text>';
  if(t === 'cedez') return '<path d="M 0 16 L -18 -15 L 18 -15 Z" fill="#fff" stroke="#C8102E" stroke-width="4" stroke-linejoin="round"/>';
  if(t === 'prioDroite') return '<path d="M 0 -17 L -18 14 L 18 14 Z" fill="#fff" stroke="#C8102E" stroke-width="4" stroke-linejoin="round"/><path d="M -5 -2 L 5 8 M 5 -2 L -5 8" stroke="#111" stroke-width="2.5"/>';
  if(t === 'feu') return '<rect x="-8" y="-20" width="16" height="40" rx="4" fill="#222"/><circle cy="-11" r="4.5" fill="#E5484D"/><circle cy="0" r="4.5" fill="#F5A524"/><circle cy="11" r="4.5" fill="#30A46C"/>';
  if(t === 'sensInterdit') return '<circle r="16" fill="#C8102E" stroke="#fff" stroke-width="1.5"/><rect x="-11" y="-3.5" width="22" height="7" fill="#fff"/>';
  if(t === 'passage'){
    let s = '<rect x="-36" y="-26" width="72" height="52" fill="' + CA_ROUTE + '"/>';
    for(let i = 0; i < 6; i++) s += '<rect x="' + (-34 + i * 12) + '" y="-26" width="7" height="52" fill="#fff" stroke="#C9CDD3" stroke-width="0.5"/>';
    return s;
  }
  if(t === 'texte') return '<text text-anchor="middle" y="6" font-family="Segoe Print, Bradley Hand, Comic Sans MS, cursive" font-size="17" fill="#0B3D91">' + caEsc(o.txt || '') + '</text>';
  const em = { moto: '🏍️', camion: '🚚', velo: '🚲', pieton: '🚶' }[t];
  if(em) return '<text text-anchor="middle" dominant-baseline="central" font-size="30">' + em + '</text>';
  return '';
}
function caBranchesGiratoire(o){ const n = Math.round(Number(o && o.n)); return n >= 2 && n <= 8 ? n : 4; }
function caOrdreObjet(o){ return /^r/.test(o.t) ? 0 : (o.t === 'passage' ? 1 : (o.t === 'texte' ? 4 : (/^auto/.test(o.t) ? 3 : 2))); }
function caDessinTrait(tr){
  if(tr.t === 'crayon') return '<path d="' + caEsc(tr.d) + '" fill="none" stroke="#0B3D91" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  if(tr.t === 'fleche') return '<line x1="' + tr.x1 + '" y1="' + tr.y1 + '" x2="' + tr.x2 + '" y2="' + tr.y2 + '" stroke="#0B3D91" stroke-width="3.5" marker-end="url(#caFl)"/>';
  return '';
}
/* Tout le croquis : avec « marquer », chaque objet porte son numéro (l'outil) */
function caCroquisContenu(cq, marquer, choisi, choisiT){
  const objets = (cq.objets || []).map((o, i) => ({ o: o, i: i })).sort((a, b) => caOrdreObjet(a.o) - caOrdreObjet(b.o) || a.i - b.i);
  let s = '';
  const un = (x) => '<g' + (marquer ? ' data-oid="' + x.i + '" class="caObj' + (choisi === x.i ? ' choisi' : '') + '"' : '') +
    ' transform="translate(' + (+x.o.x || 0) + ' ' + (+x.o.y || 0) + ') rotate(' + (+x.o.r || 0) + ') scale(' + (+x.o.s || 1) + ')">' +
    caDessinObjet(x.o) + (marquer && choisi === x.i ? '<circle r="' + (/^r/.test(x.o.t) ? 30 : 26) + '" fill="none" stroke="#9BD400" stroke-width="3" stroke-dasharray="6 4"/>' : '') + '</g>';
  objets.filter(x => caOrdreObjet(x.o) <= 1).forEach(x => { s += un(x); });
  (cq.traits || []).forEach((tr, i) => {
    if(!marquer){ s += caDessinTrait(tr); return; }
    /* 🗑️ v1521 — un trait se touche aussi (une bande large invisible), pour l'effacer seul */
    const zone = tr.t === 'crayon' ? '<path d="' + caEsc(tr.d) + '" fill="none" stroke="transparent" stroke-width="18" stroke-linecap="round"/>'
      : '<line x1="' + tr.x1 + '" y1="' + tr.y1 + '" x2="' + tr.x2 + '" y2="' + tr.y2 + '" stroke="transparent" stroke-width="18"/>';
    const halo = choisiT === i ? (tr.t === 'crayon' ? '<path d="' + caEsc(tr.d) + '" fill="none" stroke="#C6F432" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<line x1="' + tr.x1 + '" y1="' + tr.y1 + '" x2="' + tr.x2 + '" y2="' + tr.y2 + '" stroke="#C6F432" stroke-width="10" stroke-linecap="round"/>') : '';
    s += '<g data-tid="' + i + '" class="caTrait">' + halo + caDessinTrait(tr) + zone + '</g>';
  });
  objets.filter(x => caOrdreObjet(x.o) > 1).forEach(x => { s += un(x); });
  return s;
}
function caQuadrillage(l, h, pas){
  let s = '';
  for(let x = pas; x < l; x += pas) s += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + h + '" stroke="#D7E1EC" stroke-width="1"/>';
  for(let y = pas; y < h; y += pas) s += '<line x1="0" y1="' + y + '" x2="' + l + '" y2="' + y + '" stroke="#D7E1EC" stroke-width="1"/>';
  return s;
}
/* Un modèle tout fait : ses routes, et les deux voitures à leur place */
function caModeleCroquis(fond){
  const R = (t, x, y, r, s) => ({ t: t, x: x, y: y, r: r || 0, s: s || 1 });
  const routes = {
    vide: [],
    giratoire: [R('rGiratoire', 400, 200, 0, 0.95)],
    carrefour: [R('rCarrefour', 400, 200)],
    arriere: [R('rDroite', 240, 200), R('rDroite', 560, 200)],
    file: [R('rDroite', 240, 200), R('rDroite', 560, 200)],
    stationnement: [R('rDroite', 240, 245), R('rDroite', 560, 245), R('rParking', 400, 145)],
    face: [R('rDroite', 240, 200), R('rDroite', 560, 200)]
  }[fond] || [];
  const p = CA_PLACES[fond] || CA_PLACES.vide;
  const nous = CA.r.cote === 'B' ? 'autoB' : 'autoA', lui = CA.r.cote === 'B' ? 'autoA' : 'autoB';
  return routes.concat([R(nous, p[0][0], p[0][1], p[0][2]), R(lui, p[1][0], p[1][1], p[1][2])]);
}

/* ============================================================
   LE CONSTAT, DESSINÉ (1000 × 1414, la feuille A4, comme le papier)
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
/* ❓ l'aide par case : une zone qu'on touche, posée par-dessus la case */
function caZone(x, y, w, h, n, cote){ return '<rect class="caZoneCase" data-case="' + n + '" data-cote="' + (cote || '') + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="transparent"/>'; }
function caCoche(x, y, on){ return '<rect x="' + x + '" y="' + y + '" width="11" height="11" fill="#fff" stroke="#59606B"/>' + (on ? '<path d="M' + (x + 1) + ' ' + (y + 6) + ' l3 4 l7 -10" stroke="#0B3D91" stroke-width="2.2" fill="none"/>' : ''); }
const CA_FLECHES = { avd: [30, -46, 18, -34], avg: [-30, -46, -18, -34], ard: [30, 46, 18, 34], arg: [-30, 46, -18, 34],
                     av: [0, -64, 0, -46], ar: [0, 64, 0, 46], d: [44, 0, 26, 0], g: [-44, 0, -26, 0] };
function caVoitureDessus(cx, cy, coul, choc){
  let s = '<g transform="translate(' + cx + ' ' + cy + ') scale(0.78)"><rect x="-22" y="-42" width="44" height="84" rx="14" fill="#fff" stroke="' + coul + '" stroke-width="1.6"/>' +
    '<rect x="-16" y="-26" width="32" height="18" rx="4" fill="none" stroke="' + coul + '"/>' +
    '<rect x="-16" y="12" width="32" height="14" rx="4" fill="none" stroke="' + coul + '"/>' + caImp(-62, -34, 'avant', 9);
  const f = CA_FLECHES[choc];
  if(f) s += '<line x1="' + f[0] + '" y1="' + f[1] + '" x2="' + f[2] + '" y2="' + f[3] + '" stroke="#0B3D91" stroke-width="3.2" marker-end="url(#caFl)"/>';
  return s + '</g>';
}
function caColonne(x, lettre, ici, iciCote, zones){
  const V = lettre === CA.r.cote ? caNous() : caLuiDonnees();
  const bleu = lettre === 'A';
  const coul = bleu ? '#2F6DB5' : '#C9A400', fond = bleu ? '#E3EFFB' : '#FFF7CF';
  const actif = (n) => ici.indexOf(n) !== -1 && (!iciCote || iciCote === lettre || [10, 11].indexOf(n) !== -1);
  const lignes = (y0, pas, libelles, valeurs, x2, taille, max) => libelles.map((l, i) => caImp(x + 10, y0 + i * pas, l, 7.5) + caEcrit(x + x2, y0 + 2 + i * pas, valeurs[i], taille, max)).join('');
  let s = '<rect x="' + x + '" y="252" width="310" height="22" rx="4" fill="' + coul + '"/>' +
    '<text x="' + (x + 155) + '" y="268" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#fff">VÉHICULE ' + lettre + (lettre === CA.r.cote ? ' — la voiture école' : '') + '</text>';
  s += caBoite(x, 280, 310, 136, 6, 'Preneur d’assurance / assuré', coul, fond, actif(6)) +
    lignes(310, 21, ['Nom', 'Prénom', 'Adresse', 'Code postal · Pays', 'Tél. ou e-mail'], V.preneur, 96, 11.5, 30);
  s += caBoite(x, 422, 310, 92, 7, 'Véhicule', coul, fond, actif(7)) +
    lignes(448, 18, ['Marque, type', 'N° d’immatriculation', 'Pays d’immatriculation', 'Remorque : n° · pays'], V.vehicule, 120, 11, 26);
  s += caBoite(x, 520, 310, 200, 8, 'Société d’assurance', coul, fond, actif(8)) +
    lignes(548, 21, ['Nom', 'N° de contrat', 'N° de carte verte', 'Attestation valable', 'Agence (nom)', 'Adresse', 'Pays · tél. ou e-mail', 'Dégâts au véhicule assurés'], V.assurance, 104, 11, 30);
  s += caBoite(x, 726, 310, 176, 9, 'Conducteur', coul, fond, actif(9)) +
    lignes(754, 21, ['Nom', 'Prénom', 'Date de naissance', 'Adresse', 'Pays · tél. ou e-mail', 'Permis n° · catégorie', 'Permis valable jusqu’au'], V.conducteur, 104, 10.5, 34);
  s += caBoite(x, 908, 310, 110, 10, 'Point de choc initial', coul, fond, actif(10));
  s += caVoitureDessus(x + 155, 966, coul, V.choc);
  s += caBoite(x, 1024, 310, 56, 11, 'Dégâts apparents', coul, fond, actif(11));
  caLignes(V.degats, 40).slice(0, 2).forEach((l, i) => { s += caEcrit(x + 12, 1054 + i * 17, l, 11); });
  if(zones) [[6, 280, 136], [7, 422, 92], [8, 520, 200], [9, 726, 176], [10, 908, 110], [11, 1024, 56]].forEach(z => { s += caZone(x, z[1], 310, z[2], z[0], lettre); });
  return s;
}
/* final : sans case en vert (le PDF) ; zones : l'aide par case */
function caSVG(ici, iciCote, o){
  o = o || {};
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
  s += caColonne(20, 'A', ici, iciCote, o.zones) + caColonne(670, 'B', ici, iciCote, o.zones);
  s += caBoite(338, 252, 324, 828, 12, 'Circonstances', '#59606B', '#FAFAFA', R(12));
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
  /* 13 : le croquis, sur son quadrillage (800 × 400 réduit dans la case) */
  s += caBoite(20, 1086, 960, 200, 13, 'Croquis de l’accident au moment du choc', '', '', R(13));
  s += '<g transform="translate(308 1092)"><svg width="384" height="192" viewBox="0 0 800 400"><rect width="800" height="400" fill="#F7FAFD"/>' +
    caQuadrillage(800, 400, 40) + caCroquisContenu(r.croquis || {}, false) + '</svg></g>';
  /* 14 et 15 */
  const xObs = r.cote === 'A' ? 20 : 670, xObsLui = r.cote === 'A' ? 670 : 20;
  s += caBoite(20, 1294, 310, 106, 14, 'Mes observations (A)', '#2F6DB5', '#E3EFFB', R(14) && (iciCote || r.cote) === 'A');
  s += caBoite(670, 1294, 310, 106, 14, 'Mes observations (B)', '#C9A400', '#FFF7CF', R(14) && (iciCote || r.cote) === 'B');
  caLignes(nous.obs, 50).slice(0, 5).forEach((l, i) => { s += caEcrit(xObs + 10, 1326 + i * 14.5, l, 10); });
  caLignes(lui.obs, 50).slice(0, 5).forEach((l, i) => { s += caEcrit(xObsLui + 10, 1326 + i * 14.5, l, 10); });
  s += caBoite(338, 1294, 324, 106, 15, 'Signature des conducteurs', '', '', R(15)) + caImp(352, 1332, 'A', 10, true, '#2F6DB5') + caImp(640, 1332, 'B', 10, true, '#9A7C00') +
    caImp(380, 1394, 'à signer par les deux, rien ne s’ajoute après', 7.5);
  const sig = (d, x) => d ? '<image href="' + caEsc(d) + '" x="' + x + '" y="1318" width="148" height="64" preserveAspectRatio="xMidYMid meet"/>' : '';
  const sA = r.cote === 'A' ? r.sigNous : r.sigLui, sB = r.cote === 'A' ? r.sigLui : r.sigNous;
  s += sig(sA, 352) + sig(sB, 500);
  if(o.zones){
    [[1, 20, 72, 210, 74], [2, 240, 72, 400, 74], [3, 650, 72, 330, 74], [4, 20, 154, 470, 86], [5, 500, 154, 480, 86], [12, 338, 252, 324, 828], [13, 20, 1086, 960, 200], [15, 338, 1294, 324, 106]]
      .forEach(z => { s += caZone(z[1], z[2], z[3], z[4], z[0], ''); });
    s += caZone(20, 1294, 310, 106, 14, 'A') + caZone(670, 1294, 310, 106, 14, 'B');
  }
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
    const vs = (CA.ctx.vehicules || []).filter(v => !/remorque/i.test(v.categorie || ''));
    if(vs.length === 1) CA.r.vehicule = vs[0].id;
  }
  if(!CA.r.croquis.objets.length) CA.r.croquis.objets = caModeleCroquis('vide');
  caDessiner();
}
function caQuestion(){ const l = caQuestions(); return l[caRang()] || l[0]; }
function caIci(){
  const r = CA.r;
  if(r.mode === 'aide') return CA.aide ? [CA.aide] : [];
  if(CA.lecture >= 0){ const c = caCasesALire()[CA.lecture]; return c ? [c.n] : []; }
  if(r.fini || !r.mode || r.mode === 'photo') return [];
  return caQuestion().cases;
}
function caIciCote(){
  const r = CA.r;
  if(r.mode === 'aide') return CA.aideCote || '';
  if(CA.lecture >= 0) return r.cote;
  if(r.fini || !r.mode || r.mode === 'photo') return '';
  const q = caQuestion();
  return q.cote === 'nous' ? r.cote : q.cote === 'lui' ? caLui() : '';
}
/* 🛡️ v1588 — L'ASSURANCE, SOUS « SUR PLACE ». David, le 26/11 : « en
   dessous de sur place, un tiroir avec l'assurance et directement les
   informations de l'assurance écrites ». Ce sont celles de Gestion ›
   Flotte › 🛡️ L'assurance des voitures (constatContexte), les mêmes
   que la case 8 du constat : on les lit d'un coup d'œil, sans chercher
   la carte verte dans la boîte à gants. */
function caTiroirAssurance(){
  const c = CA.ctx || {}, a = c.assurance || {};
  let corps;
  if(!c.assurancePosee){
    corps = '<p>L’assurance des voitures n’est pas encore remplie (Gestion › Flotte › 🛡️ L’assurance des voitures). ' +
      'En attendant : la <b>carte verte</b> est dans la boîte à gants.</p>';
  }else{
    const tel = String(a.agenceTel || '').trim();
    const telLien = /^[+\d][\d .\-()]{6,}$/.test(tel)
      ? '<a href="tel:' + caEsc(tel.replace(/[^\d+]/g, '')) + '">' + caEsc(tel) + '</a>' : caEsc(tel);
    const lignes = [
      ['Société d’assurance', caEsc(a.assureur)],
      ['N° de contrat', caEsc(a.contrat)],
      ['N° de carte verte', caEsc(a.carteVerte)],
      ['Attestation valable', (a.du || a.au) ? 'du ' + caEsc(caJour(a.du)) + ' au ' + caEsc(caJour(a.au)) : ''],
      ['Agence', caEsc(a.agenceNom || a.agence)],
      ['Adresse de l’agence', caEsc(a.agenceAdresse)],
      ['Téléphone ou e-mail', telLien + (a.agencePays ? (telLien ? ' · ' : '') + caEsc(a.agencePays) : '')],
      ['Dégâts au véhicule assurés', a.degats === 'non' ? 'non' : 'oui'],
      ['Preneur d’assurance', caEsc(caJoindre(a.preneurNom, a.preneurPrenom))]
    ].filter(l => String(l[1] || '').trim());
    corps = '<table class="cqAssTable">' + lignes.map(l => '<tr><th>' + l[0] + '</th><td>' + l[1] + '</td></tr>').join('') + '</table>' +
      '<p class="cqAssNote">Le même contrat pour toutes les voitures, déjà recopié dans la case 8 du constat.</p>';
  }
  /* 🚗 v1588 — « et la liste des véhicules avec leurs immatriculations » (David, le 26/11) */
  const vs = (c.vehicules || []).filter(v => v && (v.immat || v.nom || v.modele));
  const veh = vs.length
    ? '<h5 class="cqAssTitre">🚗 Nos véhicules</h5><table class="cqAssTable">' + vs.map(v =>
        '<tr><th>' + caEsc(v.titre || v.nom || v.modele || '') + (v.site ? ' <span class="cqAssMod">' + caEsc(v.site) + '</span>' : '') +
        (/remorque/i.test(v.categorie || '') ? ' <span class="cqAssMod">remorque</span>' : '') + '</th>' +
        '<td class="cqAssImmat">' + caEsc(String(v.immat || '—').toUpperCase()) + '</td></tr>').join('') + '</table>'
    : '<p class="cqAssNote">Aucun véhicule dans Gestion › Flotte pour l’instant.</p>';
  return '<details class="cqSurPlace cqAssurance"><summary>🛡️ L’assurance et nos véhicules</summary>' + corps + veh + '</details>';
}
function caDessiner(){
  const z = document.getElementById('constatZone');
  if(!z) return;
  z.innerHTML = '<p class="cqIntro">Une question à la fois : le constat se remplit à côté, case par case. ' +
    'La voiture, l’assurance et le moniteur sont déjà écrits ; l’élève est cité dans les observations.</p>' +
    '<details class="cqSurPlace"' + (CA.r.mode ? '' : ' open') + '><summary>🚨 Sur place, dans l’ordre</summary><ol>' +
      '<li><b>Sécurité d’abord</b> : warnings, gilets, triangle. Un blessé, même léger : le <b>15</b> ou le <b>112</b>, puis le bureau.</li>' +
      '<li><b>Les photos</b> : les deux voitures entières, les dégâts de près, les deux plaques, le carrefour ou la rue, ' +
        'et chez l’autre conducteur : <b>sa plaque d’immatriculation</b>, <b>son permis de conduire</b> et <b>sa carte verte</b>.</li>' +
      '<li><b>Le constat</b>, avec l’autre conducteur : un seul exemplaire pour les deux voitures (sur papier, ou ici sur l’écran).</li>' +
      '<li><b>Ne signe rien que tu ne partages pas.</b> Un désaccord s’écrit dans la case 14. Rien ne s’ajoute après les signatures.</li>' +
      '<li><b>Chacun garde un exemplaire.</b> Envoie le constat signé au bureau tout de suite : l’assureur doit le recevoir sous <b>5 jours ouvrés</b>.</li>' +
    '</ol></details>' +
    caTiroirAssurance() +
    '<div class="cqGrille"><div class="cqQ" id="caPanneau"></div><div><div class="cqPapier" id="caPapier"></div>' +
    '<div class="cqDit"></div></div></div>';
  caPanneau();
  caPapier();
}
function caPapier(){
  const p = document.getElementById('caPapier');
  const aide = CA.r.mode === 'aide';
  if(p){
    p.innerHTML = caSVG(caIci(), caIciCote(), { zones: aide });
    p.classList.toggle('cqTouche', aide);
    if(aide) p.querySelectorAll('.caZoneCase').forEach(zc => zc.addEventListener('click', () => {
      CA.aide = Number(zc.getAttribute('data-case'));
      CA.aideCote = zc.getAttribute('data-cote') || '';
      caPanneau(); caPapier();
      const pa = document.getElementById('caPanneau');
      if(pa && pa.getBoundingClientRect().top < 0) pa.scrollIntoView({ block: 'start' });
    }));
  }
  const dit = document.querySelector('#constatZone .cqDit');
  if(dit) dit.textContent = aide ? 'Touche une case du constat pour lire ce qu’il faut y écrire.'
    : 'En vert, la case que la question remplit. Notre voiture est en ' + CA.r.cote + ' : si vous avez pris l’autre côté, le modèle suit.';
}
function caMaj(){ caGarder(); caPapier(); const rc = document.getElementById('caRecap'); if(rc) rc.textContent = caRecap(); }
function caRecap(){
  const v = caVoiture(), r = CA.r, k = (CA.ctx && CA.ctx.conducteur) || {};
  return [v ? '🚗 ' + (v.titre || v.modele) : '🚗 voiture ?', (String(k.nom || '').split(' ')[0] || '') + (r.eleve ? ' avec ' + r.eleve : ''),
          caJour(r.date).slice(0, 5) + (r.heure ? ' à ' + caHeureDite(r.heure) : '')].filter(Boolean).join(' · ');
}
function caProg(){
  const l = caQuestions(), i0 = caRang();
  return '<div class="cqProg">' + l.map((q, i) => '<button type="button" data-ca-aller="' + q.k + '" aria-label="Question ' + (i + 1) + '" class="' +
    (CA.r.fini || i < i0 ? 'fait' : (i === i0 ? 'ici' : '')) + '"></button>').join('') + '</div>';
}
function caLienAccueil(){ return '<button type="button" class="cqLien" data-ca="accueil">↩ Autre façon de faire</button>'; }

/* ---------- les champs ---------- */
function caLirePath(chemin){ return chemin.split('.').reduce((o, k) => (o ? o[k] : ''), CA.r); }
function caPoserPath(chemin, val){
  const c = chemin.split('.');
  let o = CA.r;
  for(let k = 0; k < c.length - 1; k++) o = o[c[k]];
  o[c[c.length - 1]] = val;
}
function caChamp(chemin, label, type, attrs){
  const v = caLirePath(chemin);
  if(type === 'checkbox') return '<label class="cqCase"><input type="checkbox" data-r="' + chemin + '"' + (v ? ' checked' : '') + '> ' + label + '</label>';
  return '<label class="cqLab">' + label + (type === 'textarea'
    ? '<textarea data-r="' + chemin + '" rows="3"' + (attrs || '') + '>' + caEsc(v) + '</textarea>'
    : '<input type="' + (type || 'text') + '" data-r="' + chemin + '" value="' + caEsc(v) + '"' + (attrs || '') + '>') + '</label>';
}
function caDeux(a, b){ return '<div class="cqDeux">' + a + b + '</div>'; }
function caBoutons(cle, choix){
  const v = caLirePath(cle);
  return '<div class="cqChoix">' + choix.map(([val, txt]) => '<button type="button" data-choix="' + cle + '" data-val="' + val + '" class="' + (v === val ? 'on' : '') + '">' + txt + '</button>').join('') + '</div>';
}
function caSu(t){ return '<div class="cqSous">' + t + '</div>'; }
function caCorps(q){
  const r = CA.r, ctx = CA.ctx || {}, tab = r.mode === 'tablette';
  if(q.k === 'quand') return caCorpsCours(true);
  if(q.k === 'ou'){
    return caDeux(caChamp('pays', 'Le pays'), '') + caChamp('lieu', 'La rue ou le carrefour, et la ville', 'text', ' placeholder="ex. : rond-point de …, Saint-Brieuc"') +
      '<button type="button" class="btn btn-secondary cqPetit" data-ca="position">📍 Ma position</button>' +
      (r.position ? '<div class="cqRecap">📍 Position notée (à ' + caEsc(r.position.precision || '?') + ' m près) : elle part avec l’envoi au bureau.</div>' : '');
  }
  if(q.k === 'blesses') return caBoutons('blesses', [['non', '🙂 Non, personne'], ['oui', '🚑 Oui, quelqu’un est blessé']]) +
    (r.blesses === 'oui' ? '<div class="cqAlerte">🚑 Le <b>15</b> ou le <b>112</b> d’abord. Puis appelle le bureau. Le constat attendra.</div>' : '');
  if(q.k === 'autres'){
    const b = (cle, val, txt) => '<button type="button" data-choix="' + cle + '" data-val="' + val + '" class="' + (r[cle] === val ? 'on' : '') + '">' + txt + '</button>';
    return caSu('À un autre véhicule (une voiture garée…)') + '<div class="cqChoix cqLigne">' + b('autresVeh', 'non', 'Non') + b('autresVeh', 'oui', 'Oui') + '</div>' +
      caSu('À un objet (poteau, barrière, mur…)') + '<div class="cqChoix cqLigne">' + b('autresObj', 'non', 'Non') + b('autresObj', 'oui', 'Oui') + '</div>';
  }
  if(q.k === 'temoins') return caChamp('temoins', 'Nom, adresse, téléphone (ou rien)', 'textarea', ' placeholder="ex. : Mme Exemple Anne, 06 00 00 00 00"');
  if(q.k === 'cote'){
    const ass = ctx.assurancePosee ? '' : '<div class="cqAlerte">🛡️ L’assurance des voitures n’est pas encore réglée (Gestion › Flotte) : recopie la carte verte de la boîte à gants.</div>';
    return '<div class="cqChoix cqLigne cqAB">' + ['A', 'B'].map(l => '<button type="button" data-choix="cote" data-val="' + l + '" class="cq' + l + (r.cote === l ? ' on' : '') + '">' + l + '</button>').join('') + '</div>' + ass;
  }
  if(q.k === 'nosInfos'){
    const k = ctx.conducteur || {}, p = k.permis || {};
    let s = caDeux(caChamp('nous.naissance', 'Ta date de naissance', 'date'), caChamp('nous.tel', 'Ton téléphone ou ton mail', 'text', k.tel ? ' placeholder="' + caEsc(k.tel) + '"' : ''));
    if(!k.adresse) s += caChamp('nous.adresse', 'Ton adresse (pas dans ta fiche Équipe)', 'text');
    if(!p.numero) s += caDeux(caChamp('nous.permis', 'Ton n° de permis', 'text'), caChamp('nous.categories', 'Catégories', 'text', ' placeholder="B, BE…"'));
    if(!p.valableJusqua) s += caChamp('nous.valable', 'Ton permis valable jusqu’au (s’il y a une date)', 'date');
    return s + '<div class="cqRecap">' + (k.fiche ? 'Le reste vient de ta fiche Équipe et de 🛡️ L’assurance des voitures.' : 'Tu n’as pas de fiche Équipe : ton nom vient de ton compte.') + '</div>';
  }
  if(q.k === 'autreAssure'){
    const o = r.autre;
    return (tab ? '' : caChamp('autre.luiMeme', 'Il remplit son côté lui-même', 'checkbox')) +
      ((o.luiMeme && !tab) ? '' :
        caDeux(caChamp('autre.pNom', 'Nom'), caChamp('autre.pPrenom', 'Prénom')) + caChamp('autre.pAdresse', 'Adresse') +
        caDeux(caChamp('autre.pCp', 'Code postal, ville'), caChamp('autre.pPays', 'Pays')) + caChamp('autre.pTel', 'Téléphone ou e-mail') +
        (tab ? caChamp('autre.mail', 'Son mail, pour lui envoyer sa copie du constat', 'email') : '') +
        '<div class="cqRecap">📷 Le plus sûr : une photo de sa carte verte, de son permis et de sa plaque, envoyée avec les autres à la fin.</div>');
  }
  if(q.k === 'autreVehicule'){
    return caDeux(caChamp('autre.vehicule', 'Marque, modèle'), caChamp('autre.immat', 'Immatriculation')) + caChamp('autre.vPays', 'Pays d’immatriculation') +
      '<details class="cqPlus"' + (r.autre.rImmat ? ' open' : '') + '><summary>Une remorque ?</summary>' + caDeux(caChamp('autre.rImmat', 'Immatriculation de la remorque'), caChamp('autre.rPays', 'Pays')) + '</details>' +
      caSu('Sa société d’assurance (carte verte)') + caDeux(caChamp('autre.assureur', 'Nom de la société'), caChamp('autre.contrat', 'N° de contrat')) +
      caChamp('autre.carteVerte', 'N° de carte verte') + caDeux(caChamp('autre.du', 'Valable du', 'date'), caChamp('autre.au', 'Au', 'date')) +
      caSu('Son agence (ou bureau, courtier)') + caChamp('autre.agNom', 'Nom') + caChamp('autre.agAdresse', 'Adresse') +
      caDeux(caChamp('autre.agPays', 'Pays'), caChamp('autre.agTel', 'Téléphone ou e-mail')) +
      caSu('Les dégâts à son véhicule sont assurés ?') + '<div class="cqChoix cqLigne">' +
        [['oui', 'Oui'], ['non', 'Non']].map(([v, t]) => '<button type="button" data-choix="autre.degats" data-val="' + v + '" class="' + (r.autre.degats === v ? 'on' : '') + '">' + t + '</button>').join('') + '</div>';
  }
  if(q.k === 'autreConducteur'){
    const o = r.autre;
    return caChamp('autre.meme', 'Le conducteur est l’assuré (même nom, même adresse)', 'checkbox') +
      (o.meme ? '' : caDeux(caChamp('autre.cNom', 'Nom'), caChamp('autre.cPrenom', 'Prénom')) + caChamp('autre.cAdresse', 'Adresse') +
        caDeux(caChamp('autre.cPays', 'Pays'), caChamp('autre.cTel', 'Téléphone ou e-mail'))) +
      caChamp('autre.cNaissance', 'Date de naissance', 'date') +
      caDeux(caChamp('autre.permis', 'N° de permis'), caChamp('autre.categories', 'Catégories', 'text', ' placeholder="B…"')) +
      caChamp('autre.valable', 'Permis valable jusqu’au (s’il y a une date)', 'date');
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
    return '<button type="button" class="btn btn-primary" data-ca="dessiner">✏️ Dessiner le croquis</button>' +
      caSu('Ou partir d’un modèle tout fait') +
      '<div class="cqChoix">' + CA_FONDS.map(([k, t, d]) => '<button type="button" data-fond="' + k + '" class="' + (r.croquis.fond === k ? 'on' : '') + '"><span>' + t + '<small>' + d + '</small></span></button>').join('') + '</div>' +
      '<div class="cqRecap">Dans l’outil : bouge et tourne les voitures, ajoute des routes, des places, les panneaux, des flèches, le nom des rues.</div>';
  }
  if(q.k === 'obs') return '<div class="cqDeja">' + caEsc(caObsBase()) + '</div>' + caChamp('obsPlus', 'Ce que tu ajoutes (un désaccord, un détail)', 'textarea');
  if(q.k === 'obsLui') return caChamp('obsLui', 'Ce que l’autre conducteur écrit', 'textarea');
  if(q.k === 'signer'){
    return caChamp('autre.mail', 'Le mail de l’autre conducteur, pour sa copie', 'email') +
      caChamp('relu', 'Nous avons relu le constat ensemble', 'checkbox') +
      '<div class="cqSigs">' + caPadHtml('sigNous', 'Notre conducteur (' + r.cote + ')') + caPadHtml('sigLui', 'L’autre conducteur (' + caLui() + ')') + '</div>';
  }
  return '';
}
/* Le cours : la date, l'heure, la voiture (et sa remorque), l'élève */
function caCorpsCours(avecRemorque){
  const r = CA.r, ctx = CA.ctx || {};
  const vs = (ctx.vehicules || []).filter(v => !/remorque/i.test(v.categorie || ''));
  const rems = (ctx.vehicules || []).filter(v => /remorque/i.test(v.categorie || ''));
  const cours = ctx.cours || [];
  const miens = cours.filter(c => c.mien), autres = cours.filter(c => !c.mien);
  const opt = (nom, txt) => '<option value="' + caEsc(nom) + '"' + (r.eleve === nom ? ' selected' : '') + '>' + caEsc(txt) + '</option>';
  let el = '<option value="">— Aucun élève au volant —</option>';
  if(miens.length) el += '<optgroup label="Mes cours d’aujourd’hui">' + miens.map(c => opt(c.eleve, c.debut.replace(':', 'h') + ' · ' + c.eleve)).join('') + '</optgroup>';
  if(autres.length) el += '<optgroup label="Les autres cours d’aujourd’hui">' + autres.map(c => opt(c.eleve, c.debut.replace(':', 'h') + ' · ' + c.eleve + (c.moniteur ? ' (' + c.moniteur + ')' : ''))).join('') + '</optgroup>';
  el += '<optgroup label="Tous les élèves">' + (ctx.eleves || []).map(e => opt(e.nom, e.nom)).join('') + '</optgroup>';
  if(r.eleve && !(ctx.eleves || []).some(e => e.nom === r.eleve) && !cours.some(c => c.eleve === r.eleve)) el += opt(r.eleve, r.eleve);
  return caDeux(caChamp('date', 'Le jour', 'date', ' max="' + caIso(new Date()) + '"'), caChamp('heure', 'L’heure', 'time')) +
    '<label class="cqLab">La voiture<select data-r="vehicule"><option value="">— Choisir la voiture —</option>' +
      vs.map(v => '<option value="' + caEsc(v.id) + '"' + (String(r.vehicule) === String(v.id) ? ' selected' : '') + '>' + caEsc(caNomVoiture(v)) + '</option>').join('') + '</select></label>' +
    (avecRemorque && rems.length ? '<label class="cqLab">Une remorque (BE) ?<select data-r="remorque"><option value="">— Pas de remorque —</option>' +
      rems.map(v => '<option value="' + caEsc(v.id) + '"' + (String(r.remorque) === String(v.id) ? ' selected' : '') + '>' + caEsc(caNomVoiture(v)) + '</option>').join('') + '</select></label>' : '') +
    '<label class="cqLab">L’élève au volant<select data-r="eleve">' + el + '</select></label>';
}

/* ---------- le panneau de gauche ---------- */
function caPanneau(){
  const p = document.getElementById('caPanneau');
  if(!p) return;
  const r = CA.r;
  if(!r.mode){
    p.innerHTML = '<div class="cqNum">Un accrochage pendant un cours</div><div class="cqTitre">Comment on fait ?</div>' +
      '<div class="cqChoix cqModes">' +
        '<button type="button" data-mode="papier"><b>📄</b><span>J’ai un constat papier<small>L’appli me guide, question par question : je recopie sur le papier.</small></span></button>' +
        '<button type="button" data-mode="tablette"><b>📱</b><span>Pas de constat papier<small>On le remplit ici, les deux conducteurs signent sur l’écran, l’autre reçoit sa copie par mail.</small></span></button>' +
        '<button type="button" data-mode="photo"><b>📷</b><span>Juste envoyer la photo du constat<small>Il est déjà rempli et signé : je l’envoie au bureau, sans rien remplir ici.</small></span></button>' +
        '<button type="button" data-mode="aide"><b>❓</b><span>Une question sur une case<small>Je touche la case du constat et je lis quoi y écrire ; ou je demande au bureau.</small></span></button>' +
      '</div>' + (r.fini || r.q !== 'quand' ? '<div class="cqRecap">Tes réponses sont gardées : choisis comment continuer.</div>' : '');
  }else if(r.mode === 'photo'){
    p.innerHTML = caLienAccueil() + '<div class="cqNum">Le constat est déjà rempli et signé</div><div class="cqTitre">📷 L’envoyer au bureau</div>' +
      '<div class="cqAide">Choisis la voiture, puis prends le constat en photo (recto, verso) et les dégâts.</div>' +
      '<div class="cqCorps">' + caCorpsCours(false) + caChamp('lieu', 'Où (rue, ville)', 'text') +
      '<button type="button" class="btn btn-secondary cqPetit" data-ca="position">📍 Ma position</button></div>' +
      '<div class="cqBoutons cqColonne"><button type="button" class="btn btn-primary" data-ca="envoyer">📷 Envoyer le constat au bureau</button></div>' +
      (r.envoye ? '<div class="cqOk">📨 Envoyé au bureau le ' + caEsc(r.envoye) + '.</div>' : '');
  }else if(r.mode === 'aide'){
    const n = CA.aide;
    const a = CA_AIDE_CASES[n];
    let sait = '';
    if(n && [6, 7, 8, 9, 10, 11, 14].indexOf(n) !== -1 && (!CA.aideCote || CA.aideCote === r.cote)){
      const N = caNous();
      const l = { 6: N.preneur, 7: N.vehicule, 8: N.assurance, 9: N.conducteur, 14: [N.obs] }[n] || [];
      const vus = l.filter(x => x && !/^\(/.test(x));
      if(vus.length) sait = '<div class="cqSous">Pour nous, l’appli sait déjà :</div><div class="cqLire">' + vus.map(x => '<div>' + caEsc(x) + '</div>').join('') + '</div>';
    }
    p.innerHTML = caLienAccueil() + '<div class="cqNum">❓ Une question sur une case</div>' +
      '<div class="cqCases">' + Array.from({ length: 15 }, (_, i) => '<button type="button" data-aide="' + (i + 1) + '" class="' + (n === i + 1 ? 'on' : '') + '">' + (i + 1) + '</button>').join('') + '</div>' +
      (a ? '<div class="cqTitre">Case ' + n + ' — ' + caEsc(a[0]) + '</div><div class="cqAide cqAideCase">' + caEsc(a[1]) + '</div>' + sait
         : '<div class="cqAide">Touche un numéro, ou directement la case sur le constat.</div>') +
      '<div class="cqBoutons cqColonne"><button type="button" class="btn btn-secondary" data-ca="question">💬 Demander au bureau</button></div>';
  }else if(CA.lecture >= 0){
    const l = caCasesALire(), c = l[CA.lecture];
    p.innerHTML = caProg() + '<div class="cqNum">Case ' + c.n + ' · ' + (CA.lecture + 1) + ' sur ' + l.length + '</div><div class="cqTitre">' + caEsc(c.titre) + '</div>' +
      '<div class="cqLire">' + (c.lignes.length ? c.lignes.map(x => '<div>' + caEsc(x) + '</div>').join('') : '<div class="vide">rien à écrire</div>') + '</div>' +
      (c.conseil ? '<div class="cqAide">' + caEsc(c.conseil) + '</div>' : '') +
      '<div class="cqBas"><button type="button" class="btn btn-secondary" data-ca="lirePrec"' + (CA.lecture ? '' : ' disabled') + '>← Case précédente</button>' +
      (CA.lecture < l.length - 1 ? '<button type="button" class="btn btn-primary" data-ca="lireSuiv">Case suivante →</button>' : '<button type="button" class="btn btn-primary" data-ca="lireFin">✅ C’est recopié</button>') + '</div>' +
      '<button type="button" class="btn btn-secondary cqPetit" data-ca="lireFin">✕ Fermer la lecture</button>';
  }else if(r.fini){
    const tab = r.mode === 'tablette';
    p.innerHTML = caLienAccueil() + caProg() + '<div class="cqNum">C’est rempli</div><div class="cqTitre">✅ ' + (tab ? 'Le constat est signé' : 'Ton modèle est prêt') + '</div>' +
      '<div class="cqAide">' + (tab ? 'Envoie sa copie à l’autre conducteur (et au bureau), puis envoie le constat et les photos au bureau.'
        : 'Recopie chaque case sur ton constat papier, signez, gardez chacun un exemplaire. Puis envoie la photo du constat signé au bureau.') + '</div>' +
      (r.mailEnvoye ? '<div class="cqOk">📨 Copie envoyée à ' + caEsc(r.autre.mail) + ' le ' + caEsc(r.mailEnvoye) + '.</div>' : '') +
      (r.envoye ? '<div class="cqOk">📨 Envoyé au bureau le ' + caEsc(r.envoye) + '.</div>' : '') +
      '<div class="cqBoutons cqColonne">' +
        (tab ? '<button type="button" class="btn btn-primary" data-ca="mail">📨 Envoyer sa copie (PDF) à l’autre conducteur</button>' : '') +
        '<button type="button" class="btn ' + (tab ? 'btn-secondary' : 'btn-primary') + '" data-ca="envoyer">📷 Envoyer le constat au bureau</button>' +
        (tab ? '<button type="button" class="btn btn-secondary" data-ca="pdf">📄 Télécharger le PDF</button>' : '<button type="button" class="btn btn-secondary" data-ca="lire">📱 Lire case par case</button>') +
        '<button type="button" class="btn btn-secondary" data-ca="revoir">✏️ Revoir une réponse</button>' +
        '<button type="button" class="btn btn-secondary" data-ca="neuf">🗑️ Tout recommencer</button>' +
      '</div><div class="cqRecap" id="caRecap">' + caEsc(caRecap()) + '</div>';
  }else{
    const l = caQuestions(), i = caRang(), q = l[i];
    const coteDit = q.cote === 'nous' ? ' · voiture ' + r.cote : q.cote === 'lui' ? ' · voiture ' + caLui() : '';
    p.innerHTML = caLienAccueil() + caProg() + '<div class="cqNum">' + (r.mode === 'tablette' ? '📱 ' : '📄 ') + 'Question ' + (i + 1) + ' sur ' + l.length + ' · case ' + q.cases.join(', ') + coteDit + '</div>' +
      '<div class="cqTitre">' + caEsc(q.titre) + '</div>' + (q.aide ? '<div class="cqAide">' + caEsc(q.aide) + '</div>' : '') +
      '<div class="cqCorps">' + caCorps(q) + '</div>' +
      '<div class="cqBas"><button type="button" class="btn btn-secondary" data-ca="prec"' + (i ? '' : ' disabled') + '>← Précédent</button>' +
      '<button type="button" class="btn btn-primary" data-ca="suiv">' + (i < l.length - 1 ? 'Suivant →' : '✅ Terminé') + '</button></div>' +
      '<div class="cqRecap" id="caRecap">' + caEsc(caRecap()) + '</div>';
  }
  caBrancher(p);
}
function caAller(k){
  const l = caQuestions();
  CA.r.q = l.some(q => q.k === k) ? k : l[0].k;
  CA.r.fini = false; CA.lecture = -1;
  caGarder(); caPanneau(); caPapier();
  const p = document.getElementById('caPanneau');
  if(p && p.getBoundingClientRect().top < 0) p.scrollIntoView({ block: 'start' });
}
function caBrancher(p){
  p.querySelectorAll('[data-r]').forEach(el => {
    const ev = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date' || el.type === 'time') ? 'change' : 'input';
    el.addEventListener(ev, () => {
      const chemin = el.getAttribute('data-r');
      caPoserPath(chemin, el.type === 'checkbox' ? el.checked : el.value);
      if(chemin === 'eleve') CA.r.neph = el.value ? caNephDe(el.value) : '';
      if(el.type === 'checkbox' && chemin !== 'relu'){ caGarder(); caPanneau(); caPapier(); return; }
      caMaj();
    });
  });
  p.querySelectorAll('[data-choix]').forEach(b => b.addEventListener('click', () => {
    caPoserPath(b.getAttribute('data-choix'), b.getAttribute('data-val'));
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
  p.querySelectorAll('[data-fond]').forEach(b => b.addEventListener('click', () => {
    const f = b.getAttribute('data-fond');
    const cq = CA.r.croquis;
    /* un modèle remplace les routes et la place des deux voitures ; le reste est gardé */
    cq.objets = caModeleCroquis(f).concat((cq.objets || []).filter(o => !/^r/.test(o.t) && !/^auto/.test(o.t)));
    cq.fond = f;
    caGarder(); caPanneau(); caPapier();
  }));
  p.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    const m = b.getAttribute('data-mode');
    CA.r.mode = m; CA.lecture = -1; CA.aide = 0; CA.aideCote = '';
    if(m === 'papier' || m === 'tablette'){ const l = caQuestions(); if(!l.some(q => q.k === CA.r.q)) CA.r.q = l[0].k; }
    caGarder(); caDessiner();
  }));
  p.querySelectorAll('[data-aide]').forEach(b => b.addEventListener('click', () => { CA.aide = Number(b.getAttribute('data-aide')); CA.aideCote = ''; caPanneau(); caPapier(); }));
  p.querySelectorAll('[data-ca-aller]').forEach(b => b.addEventListener('click', () => caAller(b.getAttribute('data-ca-aller'))));
  p.querySelectorAll('[data-ca]').forEach(b => b.addEventListener('click', () => caGeste(b.getAttribute('data-ca'), b)));
  p.querySelectorAll('canvas[data-pad]').forEach(cv => caPad(cv));
}
async function caGeste(g, b){
  const r = CA.r;
  if(g === 'accueil'){ r.mode = ''; CA.lecture = -1; caGarder(); return caDessiner(); }
  if(g === 'prec'){ const l = caQuestions(); return caAller(l[Math.max(0, caRang() - 1)].k); }
  if(g === 'suiv'){
    const l = caQuestions(), i = caRang(), q = l[i];
    if(q.k === 'quand' && !r.vehicule){ showToast('Choisis la voiture.'); return; }
    if(q.k === 'signer'){
      if(!r.sigNous || !r.sigLui){ showToast('Il faut les deux signatures.'); return; }
      if(!r.relu){ showToast('Coche « Nous avons relu le constat ensemble ».'); return; }
    }
    if(i < l.length - 1) return caAller(l[i + 1].k);
    r.fini = true; caGarder(); caPanneau(); caPapier(); return;
  }
  if(g === 'revoir') return caAller(caQuestions()[0].k);
  if(g === 'neuf'){
    if(!(await caConfirmer('Effacer toutes les réponses et recommencer ?'))) return;
    caOublier(); CA.r = null; CA.photos = { papier: [], autres: [] }; CA.envoi = null; CA.reduites = new Map();
    return afficherConstat();
  }
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
  if(g === 'dessiner') return caEditeurCroquis();
  if(g === 'lire'){ CA.lecture = 0; caPanneau(); caPapier(); return; }
  if(g === 'lireSuiv'){ CA.lecture++; caPanneau(); caPapier(); return; }
  if(g === 'lirePrec'){ CA.lecture = Math.max(0, CA.lecture - 1); caPanneau(); caPapier(); return; }
  if(g === 'lireFin'){ CA.lecture = -1; caPanneau(); caPapier(); return; }
  if(g === 'envoyer'){
    if(r.mode === 'photo' && !r.vehicule){ showToast('Choisis la voiture.'); return; }
    return caFenetreEnvoi();
  }
  if(g === 'mail') return caFenetreMail();
  if(g === 'pdf') return caTelechargerPdf(b);
  if(g === 'question') return caFenetreQuestion();
}
function caConfirmer(texte){
  if(typeof confirmer === 'function') return confirmer(texte, '🗑️ Tout recommencer', true);
  return Promise.resolve(false);
}

/* ---------- ✍️ les signatures (un trait au doigt, gardé en image) ---------- */
function caPadHtml(cle, titre){
  return '<div class="cqSig"><div class="cqSous">' + caEsc(titre) + '</div><canvas data-pad="' + cle + '" width="560" height="200" aria-label="Signature : ' + caEsc(titre) + '"></canvas>' +
    '<button type="button" class="btn btn-secondary cqPetit" data-ca-effacer="' + cle + '">Effacer</button></div>';
}
function caPad(cv){
  const cle = cv.getAttribute('data-pad');
  const c = cv.getContext('2d');
  c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#0B3D91';
  if(CA.r[cle]){ const im = new Image(); im.onload = () => c.drawImage(im, 0, 0, cv.width, cv.height); im.src = CA.r[cle]; }
  let dessine = false, avant = null;
  const pt = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * cv.width / b.width, (e.clientY - b.top) * cv.height / b.height]; };
  cv.addEventListener('pointerdown', e => { dessine = true; avant = pt(e); try{ cv.setPointerCapture(e.pointerId); }catch(x){} e.preventDefault(); });
  cv.addEventListener('pointermove', e => {
    if(!dessine) return;
    const p = pt(e);
    c.beginPath(); c.moveTo(avant[0], avant[1]); c.lineTo(p[0], p[1]); c.stroke();
    avant = p;
  });
  const fin = () => { if(!dessine) return; dessine = false; CA.r[cle] = cv.toDataURL('image/png'); caGarder(); caPapier(); };
  cv.addEventListener('pointerup', fin);
  cv.addEventListener('pointercancel', fin);
  const eff = cv.parentNode.querySelector('[data-ca-effacer]');
  if(eff) eff.addEventListener('click', () => { c.clearRect(0, 0, cv.width, cv.height); CA.r[cle] = ''; caGarder(); caPapier(); });
}

/* ---------- la lecture case par case (notre côté) ---------- */
function caCasesALire(){
  const r = CA.r, n = caNous(), l = r.cote;
  const lignes = (a) => (a || []).filter(x => x && !/^\(/.test(x));
  const fd = CA_FONDS.find(c => c[0] === r.croquis.fond);
  return [
    { n: 1, titre: 'Date de l’accident · heure', lignes: [caJour(r.date) + (r.heure ? '  ' + caHeureDite(r.heure) : '')] },
    { n: 2, titre: 'Localisation', lignes: lignes([r.pays, r.lieu]) },
    { n: 3, titre: 'Blessé(s) même léger(s)', lignes: r.blesses ? ['☑ ' + r.blesses] : [] },
    { n: 4, titre: 'Dégâts matériels autres qu’aux véhicules A et B', lignes: lignes([r.autresVeh ? 'à des véhicules : ☑ ' + r.autresVeh : '', r.autresObj ? 'à des objets : ☑ ' + r.autresObj : '']) },
    { n: 5, titre: 'Témoins', lignes: lignes([r.temoins]) },
    { n: 6, titre: 'Véhicule ' + l + ' — Preneur d’assurance / assuré', lignes: lignes(n.preneur) },
    { n: 7, titre: 'Véhicule ' + l + ' — Véhicule', lignes: lignes(n.vehicule) },
    { n: 8, titre: 'Véhicule ' + l + ' — Société d’assurance', lignes: lignes(n.assurance.slice(0, 7)).concat(n.assurance[7] && n.assurance[0] && !/^\(/.test(n.assurance[0]) ? ['Dégâts au véhicule assurés : ☑ ' + n.assurance[7]] : []) },
    { n: 9, titre: 'Véhicule ' + l + ' — Conducteur', lignes: lignes(n.conducteur), conseil: 'C’est toi, le moniteur : pas l’élève. Ta date de naissance, si elle n’est pas là, tu l’écris.' },
    { n: 10, titre: 'Véhicule ' + l + ' — Point de choc initial', lignes: n.choc ? ['une flèche : ' + CA_CHOCS[n.choc]] : [] },
    { n: 11, titre: 'Véhicule ' + l + ' — Dégâts apparents', lignes: lignes([n.degats]) },
    { n: 12, titre: 'Circonstances — colonne ' + l, lignes: n.circ.map(i => '☑ ' + i + ' — ' + CA_CIRC[i - 1]).concat(n.circ.length ? ['nombre de cases cochées : ' + n.circ.length] : []),
      conseil: 'Seulement notre colonne : l’autre conducteur coche la sienne.' },
    { n: 13, titre: 'Croquis de l’accident', lignes: fd && fd[0] !== 'vide' ? [fd[1].replace(/^\S+\s/, '')] : [],
      conseil: 'Recopie le dessin du constat à côté : les voies, le sens de chaque voiture (A, B), les panneaux, le nom des rues.' },
    { n: 14, titre: 'Mes observations (' + l + ')', lignes: [n.obs], conseil: 'C’est ici qu’on écrit un désaccord.' },
    { n: 15, titre: 'Signature', lignes: ['Ta signature, et celle de l’autre conducteur'], conseil: 'Rien ne s’ajoute après les signatures. Chacun garde un exemplaire.' }
  ];
}

/* ============================================================
   ✏️ L'OUTIL DE DESSIN DU CROQUIS

   David : « un vrai outil de schéma » — les voitures qu'on bouge, un stop,
   un cédez-le-passage, dessiner à la main ; des morceaux de route tout faits
   (giratoires, carrefours, routes droites, courbes à droite et à gauche) et
   des places de stationnement. Tout se glisse, se tourne, se grossit.
   ============================================================ */
const CA_ROUTES = [['rDroite', '━', 'Route droite'], ['rCourbeD', '↱', 'Courbe à droite'], ['rCourbeG', '↰', 'Courbe à gauche'],
  ['rCarrefour', '✚', 'Carrefour'], ['rT', '┳', 'Carrefour en T'], ['rGiratoire', '◎', 'Giratoire'], ['rParking', '🅿️', 'Places de stationnement']];
function caEditeurCroquis(){
  const cq = CA.r.croquis;
  const E = { objets: JSON.parse(JSON.stringify(cq.objets || [])), traits: JSON.parse(JSON.stringify(cq.traits || [])), outil: 'main', choisi: -1, choisiT: -1, hist: [], trace: null, glisse: null };
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const b = document.createElement('div');
  b.className = 'modal caEdit';
  const bouton = (cls, html, titre, attrs) => '<button type="button" class="' + cls + '"' + (titre ? ' title="' + caEsc(titre) + '" aria-label="' + caEsc(titre) + '"' : '') + (attrs || '') + '>' + html + '</button>';
  const palette = (titre, l) => '<div class="caEdGrp"><span>' + titre + '</span>' + l.map(([t, ic, nom]) => bouton('caEdObj', '<i>' + ic + '</i><small>' + caEsc(nom) + '</small>', nom, ' data-ajout="' + t + '"')).join('') + '</div>';
  b.innerHTML = '<div class="caEdTete"><h3>✏️ Le croquis</h3>' +
      bouton('btn btn-secondary caEdPetit', '↩', 'Annuler le dernier geste', ' data-ed="annuler"') +
      bouton('btn btn-secondary caEdPetit', '🗑️ Tout effacer', '', ' data-ed="vider"') +
      bouton('btn btn-secondary caEdPetit', '✕', 'Fermer sans garder', ' data-ed="fermer"') +
      bouton('btn btn-primary caEdPetit', '✓ Fini', '', ' data-ed="fini"') + '</div>' +
    '<div class="caEdOutils">' + [['main', '✋ Déplacer'], ['crayon', '✏️ Crayon'], ['fleche', '➡️ Flèche'], ['texte', '🔤 Texte']]
      .map(([k, t]) => bouton('caEdOutil', t, '', ' data-outil="' + k + '"')).join('') + '</div>' +
    '<div class="caEdPalette">' +
      palette('Routes', CA_ROUTES) +
      palette('Véhicules', [['autoA', '🚗', 'Voiture A'], ['autoB', '🚙', 'Voiture B']].concat(CA_OBJETS.slice(0, 4))) +
      palette('Panneaux', CA_OBJETS.slice(4)) +
    '</div>' +
    '<div class="caEdChoix" hidden>' + bouton('caEdMini', '⟲', 'Tourner à gauche', ' data-ed="tg"') + bouton('caEdMini', '⟳', 'Tourner à droite', ' data-ed="td"') +
      bouton('caEdMini', '↻ 90°', 'Un quart de tour', ' data-ed="t90"') + bouton('caEdMini', '➖', 'Plus petit', ' data-ed="moins"') + bouton('caEdMini', '➕', 'Plus grand', ' data-ed="plus"') +
      '<span class="caEdSep"></span>' +
      bouton('caEdMini caEdTxt', '✏️ Texte', 'Changer le texte', ' data-ed="texte"') +
      '<span class="caEdBr">' + bouton('caEdMini', '−', 'Une branche de moins', ' data-ed="brMoins"') + '<b class="caEdBrN"></b>' + bouton('caEdMini', '+', 'Une branche de plus', ' data-ed="brPlus"') + '</span>' +
      bouton('caEdMini caEdSuppr', '🗑️ Effacer la sélection', 'Effacer ce qui est choisi (touche Suppr)', ' data-ed="retirer"') + '</div>' +
    '<div class="caEdCadre"><svg id="caEdSvg" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg"></svg></div>' +
    '<div class="caEdDit">✋ Glisse les voitures, routes et panneaux ; touche-les pour les tourner ou les grossir. ✏️ Dessine à la main, ➡️ trace le sens des voitures, 🔤 écris le nom des rues.</div>';
  fond.appendChild(b);
  document.body.appendChild(fond);
  const svg = b.querySelector('#caEdSvg');
  const garder = () => { E.hist.push(JSON.stringify({ o: E.objets, t: E.traits })); if(E.hist.length > 50) E.hist.shift(); };
  const dessiner = () => {
    svg.innerHTML = '<defs><marker id="caFl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#0B3D91"/></marker></defs>' +
      '<rect width="800" height="400" fill="#F7FAFD"/>' + caQuadrillage(800, 400, 40) + caCroquisContenu(E, true, E.choisi, E.choisiT) +
      (E.trace ? (E.trace.t === 'crayon' ? caDessinTrait({ t: 'crayon', d: E.trace.d }) : caDessinTrait(E.trace)) : '');
    b.querySelectorAll('[data-outil]').forEach(x => x.classList.toggle('on', x.getAttribute('data-outil') === E.outil));
    const ch = b.querySelector('.caEdChoix');
    const unTrait = E.choisiT >= 0 && !!E.traits[E.choisiT];
    ch.hidden = !unTrait && (E.choisi < 0 || !E.objets[E.choisi]);
    /* un trait choisi : seulement l'effacer */
    ch.querySelectorAll('.caEdMini:not(.caEdSuppr), .caEdSep').forEach(x => { x.style.display = unTrait ? 'none' : ''; });
    const br = b.querySelector('.caEdBr'), gir = E.objets[E.choisi] && E.objets[E.choisi].t === 'rGiratoire';
    if(br){ br.style.display = gir ? '' : 'none'; if(gir) br.querySelector('.caEdBrN').textContent = caBranchesGiratoire(E.objets[E.choisi]) + ' branches'; }
    const txt = b.querySelector('.caEdTxt');
    if(txt) txt.style.display = (E.objets[E.choisi] && E.objets[E.choisi].t === 'texte') ? '' : 'none';
    svg.style.cursor = E.outil === 'main' ? 'grab' : 'crosshair';
  };
  const pt = (e) => { const m = svg.getScreenCTM().inverse(); const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m); return [Math.round(p.x), Math.round(p.y)]; };
  const ecrire = async (defaut) => {
    const t = (typeof demander === 'function') ? await demander('Le texte à poser sur le croquis (le nom d’une rue…)', defaut || '', '🔤 Texte') : window.prompt('Le texte', defaut || '');
    return String(t || '').trim().slice(0, 40);
  };
  svg.addEventListener('pointerdown', e => {
    const [x, y] = pt(e);
    if(E.outil === 'main'){
      const gt = e.target.closest('[data-tid]');
      const g = e.target.closest('[data-oid]');
      /* un objet passe avant un trait qu'il recouvre, un trait avant une route */
      if(gt && !(g && !/^r/.test((E.objets[Number(g.getAttribute('data-oid'))] || {}).t || ''))){
        E.choisiT = Number(gt.getAttribute('data-tid')); E.choisi = -1; dessiner(); return;
      }
      E.choisiT = -1;
      if(!g){ E.choisi = -1; dessiner(); return; }
      const i = Number(g.getAttribute('data-oid'));
      E.choisi = i;
      garder();
      E.glisse = { i: i, dx: x - (E.objets[i].x || 0), dy: y - (E.objets[i].y || 0), bouge: false };
    }else if(E.outil === 'crayon'){
      E.trace = { t: 'crayon', d: 'M ' + x + ' ' + y };
    }else if(E.outil === 'fleche'){
      E.trace = { t: 'fleche', x1: x, y1: y, x2: x, y2: y };
    }else return;
    try{ svg.setPointerCapture(e.pointerId); }catch(z){}
    e.preventDefault();
    dessiner();
  });
  svg.addEventListener('pointermove', e => {
    const [x, y] = pt(e);
    if(E.glisse){
      const o = E.objets[E.glisse.i];
      o.x = Math.max(0, Math.min(800, x - E.glisse.dx)); o.y = Math.max(0, Math.min(400, y - E.glisse.dy));
      E.glisse.bouge = true;
      dessiner();
    }else if(E.trace && E.trace.t === 'crayon'){ E.trace.d += ' L ' + x + ' ' + y; dessiner(); }
    else if(E.trace && E.trace.t === 'fleche'){ E.trace.x2 = x; E.trace.y2 = y; dessiner(); }
  });
  const fin = async (e) => {
    if(E.glisse){ if(!E.glisse.bouge) E.hist.pop(); E.glisse = null; dessiner(); return; }
    if(E.trace){
      const tr = E.trace;
      E.trace = null;
      const assez = tr.t === 'crayon' ? tr.d.split(' L ').length > 2 : Math.hypot(tr.x2 - tr.x1, tr.y2 - tr.y1) > 14;
      if(assez){ garder(); E.traits.push(tr); }
      dessiner();
      return;
    }
    if(E.outil === 'texte' && e && e.type === 'pointerup'){
      const [x, y] = pt(e);
      const t = await ecrire('');
      if(t){ garder(); E.objets.push({ t: 'texte', x: x, y: y, r: 0, s: 1, txt: t }); E.choisi = E.objets.length - 1; E.outil = 'main'; }
      dessiner();
    }
  };
  svg.addEventListener('pointerup', fin);
  svg.addEventListener('pointercancel', () => { E.glisse = null; E.trace = null; dessiner(); });
  b.querySelectorAll('[data-outil]').forEach(x => x.addEventListener('click', () => { E.outil = x.getAttribute('data-outil'); if(E.outil !== 'main'){ E.choisi = -1; E.choisiT = -1; } dessiner(); }));
  b.querySelectorAll('[data-ajout]').forEach(x => x.addEventListener('click', () => {
    const t = x.getAttribute('data-ajout');
    garder();
    /* une seule voiture A, une seule B : la remettre au milieu */
    const deja = /^auto/.test(t) ? E.objets.findIndex(o => o.t === t) : -1;
    if(deja !== -1){ E.objets[deja].x = 400; E.objets[deja].y = 200; E.choisi = deja; }
    else { E.objets.push({ t: t, x: 400, y: 200, r: 0, s: /^r/.test(t) ? 0.8 : 1 }); E.choisi = E.objets.length - 1; }
    E.outil = 'main';
    E.choisiT = -1;
    dessiner();
  }));
  /* 🗑️ v1521 — David : « un bouton effacer la sélection pour supprimer un seul objet facilement » */
  const effacerChoix = () => {
    if(E.choisiT >= 0 && E.traits[E.choisiT]){ garder(); E.traits.splice(E.choisiT, 1); E.choisiT = -1; }
    else if(E.choisi >= 0 && E.objets[E.choisi]){ garder(); E.objets.splice(E.choisi, 1); E.choisi = -1; }
    dessiner();
  };
  const clavier = (e) => {
    if(!document.body.contains(b)){ document.removeEventListener('keydown', clavier); return; }
    if(e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    if(document.querySelectorAll('.overlay.show').length > 1) return;   /* la fenêtre du texte est ouverte */
    if(e.key === 'Delete' || e.key === 'Backspace'){ e.preventDefault(); effacerChoix(); }
  };
  document.addEventListener('keydown', clavier);
  const fermer = () => { document.removeEventListener('keydown', clavier); fermerFond(fond); };
  b.querySelectorAll('[data-ed]').forEach(x => x.addEventListener('click', async () => {
    const g = x.getAttribute('data-ed'), o = E.objets[E.choisi];
    if(g === 'fermer') return fermer();
    if(g === 'fini'){
      CA.r.croquis.objets = E.objets; CA.r.croquis.traits = E.traits;
      caGarder(); fermer(); caPapier(); caPanneau();
      return;
    }
    if(g === 'annuler'){
      const h = E.hist.pop();
      if(h){ const v = JSON.parse(h); E.objets = v.o; E.traits = v.t; if(E.choisi >= E.objets.length) E.choisi = -1; if(E.choisiT >= E.traits.length) E.choisiT = -1; }
      return dessiner();
    }
    if(g === 'vider'){ garder(); E.objets = caModeleCroquis('vide'); E.traits = []; E.choisi = -1; E.choisiT = -1; return dessiner(); }
    if(g === 'retirer') return effacerChoix();
    if(!o) return;
    garder();
    if(g === 'tg') o.r = ((o.r || 0) - 15 + 360) % 360;
    if(g === 'td') o.r = ((o.r || 0) + 15) % 360;
    if(g === 't90') o.r = ((o.r || 0) + 90) % 360;
    if(g === 'moins') o.s = Math.max(0.3, Math.round((o.s || 1) * 0.85 * 100) / 100);
    if(g === 'plus') o.s = Math.min(3, Math.round((o.s || 1) * 1.18 * 100) / 100);
    if(g === 'brMoins' || g === 'brPlus'){
      const n = caBranchesGiratoire(o) + (g === 'brPlus' ? 1 : -1);
      if(n < 2 || n > 8){ E.hist.pop(); showToast(n < 2 ? 'Deux branches au moins.' : 'Huit branches au plus.'); }
      else o.n = n;
    }
    if(g === 'texte'){ const t = await ecrire(o.txt); if(t) o.txt = t; else E.hist.pop(); }
    dessiner();
  }));
  dessiner();
}
/* ============================================================
   📷 L'ENVOI AU BUREAU
   ============================================================ */
async function caFenetreEnvoi(){
  const r = CA.r, v = caVoiture();
  if(!v){ showToast('Choisis d’abord la voiture.'); if(r.mode === 'papier' || r.mode === 'tablette') caAller('quand'); return; }
  /* 📱 sans papier : le constat signé part comme « la photo du constat » */
  if(r.mode === 'tablette' && !CA.photos.papier.some(f => f.caConstat)){
    try{
      const blob = await caImageConstat();
      const f = new File([blob], 'constat-signe.jpg', { type: 'image/jpeg' });
      f.caConstat = true;
      CA.photos.papier.unshift(f);
    }catch(e){ showToast('Le constat signé n’a pas pu se joindre : ' + (e.message || e)); }
  }
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const b = document.createElement('div');
  b.className = 'modal caEnvoi';
  const limite = caLimite(r.date);
  const recap = '🚗 ' + (v.titre || v.modele) + (r.eleve ? ' · cours de ' + r.eleve : '') + ' · le ' + caJour(r.date).slice(0, 5) + (r.heure ? ' à ' + caHeureDite(r.heure) : '');
  b.innerHTML = '<h3>📷 Envoyer le constat au bureau</h3><p class="caResume">' + caEsc(recap) + '</p>' +
    '<label>' + (r.mode === 'tablette' ? 'Le constat signé sur l’écran <small>(déjà joint)</small>' : 'Le constat signé <small>(facultatif — recto, verso…)</small>') + '</label><div class="caPhotos" id="caPhPapier"></div>' +
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
      const autre = (o.luiMeme && r.mode !== 'tablette') ? '' : [[o.vehicule, String(o.immat || '').toUpperCase()].filter(Boolean).join(' '),
        [String(o.pNom || '').toUpperCase(), o.pPrenom].filter(Boolean).join(' '), o.assureur ? 'assuré chez ' + o.assureur : ''].filter(Boolean).join(' — ');
      const rep = await appelPrep({ action: 'constatEnvoyer', vehicule: v.id, date: r.date, heure: r.heure, lieu: [r.lieu, r.pays && r.pays !== 'France' ? r.pays : ''].filter(Boolean).join(', '), mode: r.mode,
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
   📄 LE CONSTAT EN IMAGE ET EN PDF (le modèle européen, rempli et signé)
   ============================================================ */
async function caCanvasConstat(){
  const svg = caSVG([], '', {}).replace('<svg viewBox="0 0 1000 1414"', '<svg width="1000" height="1414" viewBox="0 0 1000 1414"');
  const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try{
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('le dessin du constat ne se lit pas')); i.src = u; });
    const cv = document.createElement('canvas');
    cv.width = 1654; cv.height = 2339;
    const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
    c.drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  }finally{ URL.revokeObjectURL(u); }
}
async function caImageConstat(){
  const cv = await caCanvasConstat();
  return new Promise((ok, ko) => cv.toBlob(b => b ? ok(b) : ko(new Error('image impossible')), 'image/jpeg', 0.88));
}
function caChargerScript(url, pret){
  if(pret()) return Promise.resolve();
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => pret() ? ok() : ko(new Error('la bibliothèque PDF ne répond pas'));
    s.onerror = () => ko(new Error('la bibliothèque PDF est injoignable'));
    document.head.appendChild(s);
  });
}
async function caPdfConstat(){
  await caChargerScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => !!(window.jspdf && window.jspdf.jsPDF));
  const cv = await caCanvasConstat();
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  doc.addImage(cv.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, 210, 297);
  doc.setProperties({ title: 'Constat amiable du ' + caJour(CA.r.date), creator: 'Évolution Conduites' });
  return { b64: doc.output('datauristring').split(',')[1], blob: doc.output('blob') };
}
function caNomPdf(){ return 'Constat amiable ' + caJour(CA.r.date).replace(/\//g, '-') + '.pdf'; }
async function caTelechargerPdf(b){
  const avant = b ? b.textContent : '';
  if(b){ b.disabled = true; b.textContent = '📄 Le PDF se prépare…'; }
  try{
    const p = await caPdfConstat();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(p.blob);
    a.download = caNomPdf();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }catch(e){ showToast('Le PDF ne se fait pas : ' + (e.message || e)); }
  if(b){ b.disabled = false; b.textContent = avant; }
}
/* 📨 sa copie, par le mail de l'école (et le bureau en copie) */
function caFenetreMail(){
  const r = CA.r;
  if(!r.sigNous || !r.sigLui){ showToast('Il faut d’abord les deux signatures.'); return caAller('signer'); }
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const b = document.createElement('div');
  b.className = 'modal caEnvoi';
  b.innerHTML = '<h3>📨 Sa copie du constat</h3>' +
    '<p class="caResume">Le constat rempli et signé, en PDF (le modèle européen), part par le mail de l’école. Le bureau le reçoit aussi, pour l’assureur.</p>' +
    '<label for="caMailA">Le mail de l’autre conducteur</label><input type="email" id="caMailA" autocomplete="off">' +
    '<div class="caEtat" id="caEtatMail" hidden></div>' +
    '<div class="btn-row" style="margin-top:14px;"><button class="btn btn-secondary" type="button" id="caMailNon">Annuler</button><button class="btn btn-primary" type="button" id="caMailOk">📨 Envoyer</button></div>';
  fond.appendChild(b);
  document.body.appendChild(fond);
  const i = b.querySelector('#caMailA');
  i.value = r.autre.mail || (/@/.test(r.autre.pTel || '') ? r.autre.pTel : '');
  b.querySelector('#caMailNon').addEventListener('click', () => fermerFond(fond));
  const ok = b.querySelector('#caMailOk');
  ok.addEventListener('click', async () => {
    const a = i.value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(a)){ showToast('Ce mail ne semble pas complet.'); i.focus(); return; }
    ok.disabled = true;
    const etat = b.querySelector('#caEtatMail');
    etat.hidden = false; etat.className = 'caEtat'; etat.textContent = '📄 Le PDF se prépare…';
    try{
      const p = await caPdfConstat();
      etat.textContent = '📨 Envoi…';
      await appelPrep({ action: 'constatMail', a: a, pdf: p.b64, nom: caNomPdf(), date: r.date, heure: r.heure, lieu: r.lieu,
        vehicule: r.vehicule, autre: [String(r.autre.pNom || '').toUpperCase(), r.autre.pPrenom].filter(Boolean).join(' ') });
      r.autre.mail = a;
      const d = new Date();
      r.mailEnvoye = caJour(caIso(d)).slice(0, 5) + ' à ' + String(d.getHours()).padStart(2, '0') + ' h ' + String(d.getMinutes()).padStart(2, '0');
      caGarder();
      fermerFond(fond);
      showToast('📨 Sa copie est partie (et au bureau).');
      caPanneau();
    }catch(e){
      ok.disabled = false;
      etat.className = 'caEtat erreur';
      etat.textContent = 'Rien n’est parti : ' + (e.message || e);
    }
  });
  setTimeout(() => i.focus(), 50);
}
/* 💬 une question au bureau, sans rien remplir */
function caFenetreQuestion(){
  const r = CA.r, v = caVoiture();
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const b = document.createElement('div');
  b.className = 'modal caEnvoi';
  b.innerHTML = '<h3>💬 Demander au bureau</h3>' +
    '<p class="caResume">' + (CA.aide ? 'Ta question sur la case ' + CA.aide + ' (' + caEsc(CA_AIDE_CASES[CA.aide][0]) + ').' : 'Ta question sur le constat.') + ' Le bureau te répond dans la messagerie, ou te rappelle.</p>' +
    '<label for="caQTexte">Ta question</label><textarea id="caQTexte" rows="4" maxlength="1500" placeholder="ex. : l’autre conducteur n’a pas sa carte verte, je fais comment ?"></textarea>' +
    '<div class="btn-row" style="margin-top:14px;"><button class="btn btn-secondary" type="button" id="caQNon">Annuler</button><button class="btn btn-primary" type="button" id="caQOk">💬 Envoyer</button></div>';
  fond.appendChild(b);
  document.body.appendChild(fond);
  b.querySelector('#caQNon').addEventListener('click', () => fermerFond(fond));
  const ok = b.querySelector('#caQOk');
  ok.addEventListener('click', async () => {
    const t = b.querySelector('#caQTexte').value.trim();
    if(t.length < 3){ showToast('Écris ta question.'); return; }
    ok.disabled = true;
    try{
      await appelPrep({ action: 'constatQuestion', texte: (CA.aide ? '(case ' + CA.aide + ' — ' + CA_AIDE_CASES[CA.aide][0] + ') ' : '') + t,
        vehicule: v ? v.id : '', lieu: r.lieu, position: r.position || undefined });
      fermerFond(fond);
      showToast('💬 Envoyé au bureau.');
    }catch(e){ ok.disabled = false; showToast('Non envoyé : ' + (e.message || e)); }
  });
  setTimeout(() => b.querySelector('#caQTexte').focus(), 50);
}

/* ============================================================
   🛡️ L'ASSURANCE DES VOITURES — Gestion › Flotte, une fois pour toutes
   (v1520 : comme sur le vrai constat — l'agence a son nom, son adresse,
   son pays, son téléphone ; et l'assuré, case 6, a son téléphone ou mail)
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
  const a = d.assurance || {}, ec = d.ecole || {};
  if(!a.agenceNom && a.agence) a.agenceNom = a.agence;
  const champ = (k, l, type, ph) => '<div><label for="caAs_' + k + '">' + l + '</label><input type="' + (type || 'text') + '" id="caAs_' + k + '" value="' + caEsc(a[k]) + '"' +
    (ph ? ' placeholder="' + caEsc(ph) + '"' : '') + (peut ? '' : ' disabled') + '></div>';
  const titre = (t) => '<div class="caAssT">' + t + '</div>';
  c.innerHTML = '<details' + (d.posee ? '' : ' open') + '><summary>🛡️ L’assurance des voitures' + (d.posee ? ' — ' + caEsc(a.assureur) + (a.au ? ', jusqu’au ' + caEsc(caJour(a.au)) : '') : ' — à remplir') + '</summary>' +
    '<div class="caResume">Le même contrat pour toutes les voitures. Repris tel quel dans le constat amiable (Outils › 💥 Constat amiable, cases 6 et 8).</div>' +
    titre('La société d’assurance (case 8)') +
    '<div class="caAssGrille">' + champ('assureur', 'Nom') + champ('contrat', 'N° de contrat') + champ('carteVerte', 'N° de carte verte') +
      '<div><label for="caAs_degats">Les dégâts au véhicule sont assurés</label><select id="caAs_degats"' + (peut ? '' : ' disabled') + '><option value="oui">Oui</option><option value="non"' + (a.degats === 'non' ? ' selected' : '') + '>Non</option></select></div>' +
      champ('du', 'Attestation valable du', 'date') + champ('au', 'Au', 'date') + '</div>' +
    titre('L’agence (ou bureau, ou courtier)') +
    '<div class="caAssGrille">' + champ('agenceNom', 'Nom') + champ('agenceAdresse', 'Adresse', 'text', 'numéro, rue, code postal, ville') +
      champ('agencePays', 'Pays', 'text', 'France') + champ('agenceTel', 'Téléphone ou e-mail') + '</div>' +
    titre('L’assuré : l’auto-école (case 6)') +
    '<div class="caAssGrille">' + champ('preneurNom', 'Nom', 'text', ec.societe || ec.nom || '') + champ('preneurPrenom', 'Prénom (ou le nom de l’école)', 'text', ec.societe ? ec.nom : '') +
      champ('preneurAdresse', 'Adresse', 'text', ec.adresse || '') + champ('preneurCP', 'Code postal, ville', 'text', ec.ville || '') +
      champ('preneurPays', 'Pays', 'text', 'France') + champ('preneurTel', 'Téléphone ou e-mail', 'text', ec.mail || '') + '</div>' +
    '<div class="caResume" style="margin-top:6px">Une case de l’assuré laissée vide reprend l’en-tête des courriers (en gris).</div>' +
    (d.majPar ? '<div class="caResume" style="margin-top:8px">Modifié le ' + caEsc(d.majLe) + ' par ' + caEsc(d.majPar) + '.</div>' : '') +
    (peut ? '<div class="btn-row" style="margin-top:12px;"><button class="btn btn-primary" type="button" id="caAsOk" style="width:auto;">💾 Enregistrer</button></div>' : '') + '</details>';
  const ok = c.querySelector('#caAsOk');
  if(ok) ok.addEventListener('click', async () => {
    if(ok.disabled) return;
    ok.disabled = true;
    const v = {};
    ['assureur', 'contrat', 'carteVerte', 'du', 'au', 'degats', 'agenceNom', 'agenceAdresse', 'agencePays', 'agenceTel',
     'preneurNom', 'preneurPrenom', 'preneurAdresse', 'preneurCP', 'preneurPays', 'preneurTel'].forEach(k => { v[k] = c.querySelector('#caAs_' + k).value.trim(); });
    try{
      const rep = await appelPrep({ action: 'flotteAssurancePoser', assurance: v });
      if(CA.ctx){ CA.ctx.assurance = (rep && rep.assurance) || v; CA.ctx.assurancePosee = 1; }
      showToast('🛡️ Assurance enregistrée');
      afficherAssuranceFlotte();
    }catch(e){ showToast('Impossible : ' + (e.message || e)); ok.disabled = false; }
  });
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-constat.js'] = true;
