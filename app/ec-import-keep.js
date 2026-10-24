/* Déployé le 24/10/2026 à 15:03 — v1263 */
/* ============================================================
   ec-import-keep.js — 📥 MES FICHES GOOGLE KEEP, DANS « CE QU’ON
   ÉCRIT ET ENVOIE (KEEP) » — v1262

   David, le 24 octobre : « comment est-ce que je peux faire pour
   récupérer toutes mes fiches Keep et les mettre sur l’appli ? » —
   « c’est un mélange de plein de choses » — « il faut que ça aille
   dans Modèles messages, que je décide dans quelle catégorie ça va
   par fiche, et que je puisse créer des catégories pour certaines
   fiches quand elles ne sont pas faites ». Puis : « renomme cet
   onglet en Ce qu’on écrit et envoie (keep) : c’est l’outil qu’on a
   créé pour remplacer Keep, lié à la messagerie ».

   Ses choix :
     · le tri se fait DANS L’APPLI : il dépose le zip de Google
       Takeout, chaque fiche s’affiche, il choisit sa catégorie, il
       importe — et il peut recommencer plus tard ;
     · la catégorie est PRÉ-REMPLIE avec le libellé Keep (créée si
       elle n’existe pas), il la change s’il veut ;
     · les photos suivent la fiche, les listes deviennent ☐ / ☑ ;
     · les fiches archivées viennent (pastille 🗄️, décochables), la
       corbeille reste dans Keep.

   ⚠️ LE ZIP SE LIT DANS LE NAVIGATEUR. Rien ne part au serveur avant
   qu’il appuie sur « Importer » : ni les fiches qu’il décoche, ni
   celles de la corbeille. Pas de bibliothèque à charger : un zip,
   c’est une table des matières à la fin et des morceaux compressés
   (« deflate ») que le navigateur sait ouvrir lui-même
   (DecompressionStream).

   ⚠️ CHAQUE FICHE PASSE PAR LA PORTE DE TOUTES LES FICHES
   (enregistrerModeleTexte, ficheImageAdd) : usage « Texte libre »,
   jamais un emplacement de l’application.
   ============================================================ */

/* ---------- Le zip ---------- */
async function ikLireZip(blob){
  const buf = new Uint8Array(await blob.arrayBuffer());
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  /* la fin de la table des matières, en partant de la fin */
  let fin = -1;
  for(let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--){
    if(dv.getUint32(i, true) === 0x06054b50){ fin = i; break; }
  }
  if(fin < 0) throw new Error('Ce fichier n’est pas un zip lisible.');
  let n = dv.getUint16(fin + 10, true);
  let debut = dv.getUint32(fin + 16, true);
  /* un très gros zip (ZIP64) range ces deux nombres ailleurs */
  if(debut === 0xffffffff || n === 0xffff){
    const loc = fin - 20;
    if(loc >= 0 && dv.getUint32(loc, true) === 0x07064b50){
      const z64 = Number(dv.getBigUint64(loc + 8, true));
      if(dv.getUint32(z64, true) === 0x06064b50){
        n = Number(dv.getBigUint64(z64 + 32, true));
        debut = Number(dv.getBigUint64(z64 + 48, true));
      }
    }
  }
  const dec = new TextDecoder('utf-8');
  const fichiers = [];
  let p = debut;
  for(let k = 0; k < n; k++){
    if(dv.getUint32(p, true) !== 0x02014b50) break;
    const methode = dv.getUint16(p + 10, true);
    let taille = dv.getUint32(p + 20, true);
    const lnom = dv.getUint16(p + 28, true), lext = dv.getUint16(p + 30, true), lcom = dv.getUint16(p + 32, true);
    let local = dv.getUint32(p + 42, true);
    const nom = dec.decode(buf.subarray(p + 46, p + 46 + lnom));
    /* ZIP64 : la vraie taille et la vraie position sont dans l’extra */
    if(taille === 0xffffffff || local === 0xffffffff){
      let e = p + 46 + lnom;
      const fe = e + lext;
      while(e + 4 <= fe){
        const id = dv.getUint16(e, true), l = dv.getUint16(e + 2, true);
        if(id === 0x0001){
          let q = e + 4;
          if(dv.getUint32(p + 24, true) === 0xffffffff){ q += 8; }
          if(taille === 0xffffffff){ taille = Number(dv.getBigUint64(q, true)); q += 8; }
          if(local === 0xffffffff){ local = Number(dv.getBigUint64(q, true)); }
          break;
        }
        e += 4 + l;
      }
    }
    fichiers.push({ nom: nom, methode: methode, taille: taille, local: local });
    p += 46 + lnom + lext + lcom;
  }
  const lire = async f => {
    const d = f.local + 30 + dv.getUint16(f.local + 26, true) + dv.getUint16(f.local + 28, true);
    const brut = buf.subarray(d, d + f.taille);
    if(f.methode === 0) return new Blob([brut]);
    if(f.methode !== 8) throw new Error('Compression inconnue');
    if(!('DecompressionStream' in window)) throw new Error('Ce navigateur ne sait pas ouvrir un zip : mets-le à jour, ou dézippe le fichier et dépose les fichiers .json.');
    const flux = new Blob([brut]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(flux).blob();
  };
  return fichiers.filter(f => !/\/$/.test(f.nom)).map(f => ({ nom: f.nom, lire: () => lire(f) }));
}

/* ---------- Les fiches Keep ---------- */
const IK_COULEURS = { RED: 'rouge', ORANGE: 'orange', YELLOW: 'jaune', GREEN: 'vert', TEAL: 'menthe',
  BLUE: 'bleu', CERULEAN: 'bleu', PURPLE: 'violet', PINK: 'rose', BROWN: 'orange', GRAY: '' };
const IK_TAILLE_MAX = 45000;   /* une cellule du classeur, avec de la marge */

function ikBase(nom){ return String(nom || '').split('/').pop(); }
function ikSansExt(nom){ return ikBase(nom).replace(/\.[^.]+$/, '').toLowerCase(); }
function ikEstImage(nom){ return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(nom); }
function ikTypeImage(nom){
  const e = (String(nom).match(/\.([^.]+)$/) || [])[1] || '';
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' }[e.toLowerCase()] || 'image/jpeg';
}

/* Une fiche Keep (son JSON) → ce que l’appli enregistre */
function ikFicheDepuisKeep(j, nomFichier){
  if(!j || typeof j !== 'object') return null;
  if(!('textContent' in j) && !('listContent' in j) && !('title' in j)) return null;
  const titreBrut = String(j.title || '').trim();
  let corps = String(j.textContent || '').replace(/\r\n/g, '\n');
  const liste = Array.isArray(j.listContent) ? j.listContent : [];
  const lignes = liste.map(x => (x && x.isChecked ? '☑ ' : '☐ ') + String((x && x.text) || '').trim()).filter(l => l.length > 2);
  if(lignes.length) corps = (corps ? corps.replace(/\s+$/, '') + '\n' : '') + lignes.join('\n');
  /* les liens que Keep a reconnus, s’ils ne sont pas déjà dans le texte */
  (Array.isArray(j.annotations) ? j.annotations : []).forEach(a => {
    const u = a && a.url;
    if(u && corps.indexOf(u) === -1) corps += (corps ? '\n' : '') + '🔗 ' + (a.title ? a.title + ' — ' : '') + u;
  });
  corps = corps.replace(/\s+$/, '');
  const premiere = (corps.split('\n').find(l => l.trim()) || '').replace(/^[☐☑]\s*/, '').trim();
  const titre = titreBrut || (premiere.length > 60 ? premiere.slice(0, 57).trim() + '…' : premiere) || 'Sans titre';
  const quand = Number(j.userEditedTimestampUsec || j.createdTimestampUsec || 0);
  return {
    source: nomFichier,
    titre: titre,
    contenu: corps,
    libelles: (Array.isArray(j.labels) ? j.labels : []).map(l => String((l && l.name) || '').trim()).filter(Boolean),
    couleur: IK_COULEURS[String(j.color || '').toUpperCase()] || '',
    archivee: !!j.isArchived,
    corbeille: !!j.isTrashed,
    epinglee: !!j.isPinned,
    liste: lignes.length > 0,
    quand: quand ? new Date(quand / 1000) : null,
    pieces: (Array.isArray(j.attachments) ? j.attachments : []).map(a => String((a && a.filePath) || '')).filter(Boolean),
    images: []
  };
}

/* Tous les fichiers déposés (zips, .json, images) → les fiches */
async function ikLireDepot(liste, dire){
  const entrees = [];
  for(const f of liste){
    if(/\.zip$/i.test(f.name) || f.type === 'application/zip' || f.type === 'application/x-zip-compressed'){
      dire('📦 Ouverture de ' + f.name + '…');
      (await ikLireZip(f)).forEach(e => entrees.push(e));
    }else{
      entrees.push({ nom: f.webkitRelativePath || f.name, lire: async () => f });
    }
  }
  /* les images, par nom (avec et sans extension : Takeout écrit
     « .jpeg » dans la fiche et range « .jpg » dans le dossier) */
  const images = {}, imagesSansExt = {};
  entrees.filter(e => ikEstImage(e.nom)).forEach(e => {
    images[ikBase(e.nom).toLowerCase()] = e;
    imagesSansExt[ikSansExt(e.nom)] = e;
  });
  const jsons = entrees.filter(e => /\.json$/i.test(e.nom));
  const fiches = [];
  /* ⚠️ PAR PAQUETS DE 64, PAS UNE À UNE : chaque fiche se décompresse
     à part, et les attendre l’une après l’autre faisait patienter de
     longues secondes sur les milliers de fiches de David. */
  const lireUne = async e => {
    let j = null;
    try{ j = JSON.parse(await (await e.lire()).text()); }catch(er){ return null; }
    const fi = ikFicheDepuisKeep(j, e.nom);
    if(!fi) return null;
    fi.pieces.forEach(pc => {
      const im = images[ikBase(pc).toLowerCase()] || imagesSansExt[ikSansExt(pc)];
      if(im) fi.images.push({ nom: im.nom, lire: im.lire });
    });
    return fi;
  };
  for(let i = 0; i < jsons.length; i += 64){
    dire('📝 Lecture des fiches : ' + Math.min(jsons.length, i + 64) + ' sur ' + jsons.length + '…');
    (await Promise.all(jsons.slice(i, i + 64).map(lireUne))).forEach(fi => { if(fi) fiches.push(fi); });
  }
  /* épinglées d’abord, puis les plus récentes, comme dans Keep */
  fiches.sort((a, b) => (b.epinglee - a.epinglee) || ((b.quand || 0) - (a.quand || 0)));
  return fiches;
}

/* Déjà dans l’appli : même titre et même texte (un second import ne
   double rien). ⚠️ UNE TABLE, PAS UNE BOUCLE : 6 888 fiches comparées
   chacune à des milliers de fiches, c’était des dizaines de millions
   de comparaisons — l’écran se figeait. */
function ikCleDeFiche(titre, texte){
  const n = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return n(titre) + '\u0000' + n(texte);
}
let ikDejaVues = null;
function ikDejaLa(fi){
  if(!ikDejaVues){
    ikDejaVues = new Set();
    (modelesTexte || []).forEach(m => ikDejaVues.add(ikCleDeFiche(m.titre || m.nom, m.contenu)));
  }
  return ikDejaVues.has(ikCleDeFiche(fi.titre, fi.contenu));
}

/* ---------- La fenêtre ---------- */
function ikEl(tag, cls, texte){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(texte !== undefined) e.textContent = texte;
  return e;
}

/* ============================================================
   LA FENÊTRE — TRIER PAR LIBELLÉ, PUIS FICHE PAR FICHE (v1262)

   David, capture à l'appui (6 888 fiches, une centaine de libellés) :
   « pas pratique du tout pour voir ce que je garde ou pas, dans quelle
   catégorie je les mets, et si je dois créer de nouvelles catégories
   si je ne veux pas forcément mettre les intitulés qui existaient ».
   Ses choix :
     · en deux temps : d'abord ses LIBELLÉS Keep, chacun avec son
       nombre de fiches et « Va dans » (une catégorie de l'appli,
       ➕ une nouvelle, 🔒 privée, 📭 sans catégorie, 🚫 ne pas
       importer) ; puis il OUVRE un libellé pour voir ses fiches,
       50 par 50, et en changer ou en décocher une ;
     · au départ, chaque libellé est « ⏳ à décider » : rien n'est
       importé et aucune catégorie n'est créée sans lui.
   Une fiche suit son libellé (le premier, s'il en a plusieurs) tant
   qu'il ne la change pas.

   ⚠️ SES CHOIX SONT GARDÉS SUR CET APPAREIL. Trier 6 888 fiches ne
   se fait pas d'une traite : il ferme, il revient, il redépose le
   même zip, et tout est là — y compris les fiches déjà importées,
   qui ne repartent pas une seconde fois.
   ============================================================ */
const IK_CLE = 'ec_import_keep_v1';
const IK_PAGE = 50;
const IK_NON = '__non__', IK_SANS = '__sans__', IK_NOUVELLE = '__nouvelle__', IK_LIB = '__lib__';

function ikLireMemoire(){
  try{ const o = JSON.parse(localStorage.getItem(IK_CLE) || '{}'); return { dest: o.dest || {}, choix: o.choix || {}, nouvelles: o.nouvelles || [] }; }
  catch(e){ return { dest: {}, choix: {}, nouvelles: [] }; }
}
function ikGarderMemoire(m){
  try{ localStorage.setItem(IK_CLE, JSON.stringify(m)); }catch(e){ /* l'appareil refuse : les choix vivent le temps de la fenêtre */ }
}

async function ouvrirImportKeep(){
  if(typeof chargerModelesTexte === 'function') await chargerModelesTexte(true);
  ikDejaVues = null;
  if(typeof chargerOrdreEtiquettes === 'function') await chargerOrdreEtiquettes();

  const fond = ikEl('div', 'overlay show');
  const boite = ikEl('div', 'modal ikFenetre');
  boite.setAttribute('role', 'dialog');
  boite.setAttribute('aria-label', 'Importer mes fiches Google Keep');
  boite.appendChild(ikEl('h3', '', '📥 Importer mes fiches Google Keep'));
  const corps = ikEl('div', 'ikCorps');
  boite.appendChild(corps);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  let occupe = false;
  const fermer = () => { if(occupe) return; try{ fermerFond(fond); }catch(e){ fond.remove(); } };
  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });

  /* ── 1 · Le dépôt ── */
  const depot = () => {
    corps.innerHTML = '';
    const aide = ikEl('div', 'ikAide');
    aide.innerHTML = '<b>1.</b> Sur <b>takeout.google.com</b> : « Tout désélectionner », coche seulement <b>Keep</b>, ' +
      '« Étape suivante », export <b>une fois</b> en <b>.zip</b>, « Créer une exportation ».<br>' +
      '<b>2.</b> Google t’envoie un e-mail avec le lien : télécharge le zip.<br>' +
      '<b>3.</b> Dépose-le ici. Tu trieras d’abord tes libellés Keep, puis les fiches si tu veux. Rien ne part avant « Importer ».';
    corps.appendChild(aide);
    const mem = ikLireMemoire();
    const nDec = Object.keys(mem.dest).length, nFaites = Object.values(mem.choix).filter(c => c && c.fait).length;
    if(nDec || nFaites){
      corps.appendChild(ikEl('div', 'ikAide ikReprise', '💾 Tes choix d’avant sont gardés sur cet appareil (' + nDec + ' libellé' + (nDec > 1 ? 's' : '') + ' décidé' + (nDec > 1 ? 's' : '') +
        (nFaites ? ', ' + nFaites + ' fiche' + (nFaites > 1 ? 's' : '') + ' déjà importée' + (nFaites > 1 ? 's' : '') : '') + ') : redépose le même zip pour reprendre.'));
    }
    const zone = ikEl('label', 'ikDepot');
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.accept = '.zip,.json,image/*,application/zip';
    inp.className = 'ikFichier';
    zone.appendChild(ikEl('span', 'ikDepotGros', '📂 Choisir le zip de Google (ou le déposer ici)'));
    zone.appendChild(ikEl('span', 'ikDepotPetit', 'Takeout a coupé ton export en plusieurs zips ? Choisis-les tous. Déjà dézippé ? Choisis les fichiers .json et les photos.'));
    zone.appendChild(inp);
    corps.appendChild(zone);
    const msg = ikEl('div', 'ikMsg', '');
    msg.setAttribute('role', 'status');
    corps.appendChild(msg);
    const rangee = ikEl('div', 'btn-row');
    const bF = ikEl('button', 'btn btn-secondary', 'Fermer'); bF.type = 'button';
    bF.addEventListener('click', fermer);
    rangee.appendChild(bF);
    corps.appendChild(rangee);
    const lire = async liste => {
      if(!liste || !liste.length) return;
      occupe = true;
      const dire = t => { msg.textContent = t; msg.className = 'ikMsg'; };
      try{
        const fiches = await ikLireDepot(Array.prototype.slice.call(liste), dire);
        occupe = false;
        if(!fiches.length){
          msg.className = 'ikMsg ko';
          msg.textContent = '⚠️ Aucune fiche Keep dans ce fichier. Il faut le zip de Takeout (ou les fichiers .json du dossier « Keep »).';
          return;
        }
        trier(fiches);
      }catch(e){
        occupe = false;
        msg.className = 'ikMsg ko';
        msg.textContent = '⚠️ ' + ((e && e.message) || e);
      }
    };
    inp.addEventListener('change', () => lire(inp.files));
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('survol'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('survol'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('survol'); lire(e.dataTransfer && e.dataTransfer.files); });
  };

  /* ── 2 · Le tri ── */
  const trier = toutes => {
    const mem = ikLireMemoire();
    const corbeille = toutes.filter(f => f.corbeille).length;
    const fiches = toutes.filter(f => !f.corbeille);
    const prive = (typeof maMarquePrivee === 'function') ? maMarquePrivee() : '';
    const memeNom = (a, b) => (typeof normaliserMot === 'function') ? normaliserMot(a) === normaliserMot(b) : String(a).toLowerCase() === String(b).toLowerCase();
    let cats = ((typeof toutesLesEtiquettes === 'function') ? toutesLesEtiquettes() : [])
      .filter(c => !(typeof estEtiquetteTechnique === 'function' && estEtiquetteTechnique(c)));
    mem.nouvelles.forEach(n => { if(!cats.some(c => memeNom(c, n))) cats.push(n); });
    const sauver = () => ikGarderMemoire(mem);

    /* les groupes : un par libellé (le premier de la fiche) */
    const groupes = new Map();
    fiches.forEach(f => {
      f.deja = ikDejaLa(f);
      const g = f.libelles[0] || '';
      if(!groupes.has(g)) groupes.set(g, { nom: g, fiches: [] });
      groupes.get(g).fiches.push(f);
    });
    const libs = Array.from(groupes.values()).sort((a, b) => (a.nom === '') - (b.nom === '') || b.fiches.length - a.fiches.length || a.nom.localeCompare(b.nom, 'fr'));

    const choixDe = f => mem.choix[f.source] || {};
    const poserChoix = (f, k, v) => { const c = mem.choix[f.source] = Object.assign({}, mem.choix[f.source]); if(v === undefined) delete c[k]; else c[k] = v; if(!Object.keys(c).length) delete mem.choix[f.source]; };
    const destDe = g => mem.dest[g.nom] || '';
    const etat = f => {
      const c = choixDe(f), g = groupes.get(f.libelles[0] || '');
      const d = destDe(g);
      const cat = c.cat !== undefined ? c.cat : d;
      const coche = c.coche !== undefined ? c.coche : (!f.deja && d !== IK_NON);
      return { fait: !!c.fait, cat: cat, coche: coche, propre: c.cat !== undefined || c.coche !== undefined,
               pret: !c.fait && coche && cat !== '' && cat !== IK_NON, attend: !c.fait && coche && cat === '' };
    };
    const nomDest = v => v === '' ? '⏳ À décider' : v === IK_NON ? '🚫 Ne pas importer' : v === IK_SANS ? '📭 Sans catégorie' : v === prive ? '🔒 Ma catégorie privée' : v;
    const remplir = (sel, valeur, libelle) => {
      sel.innerHTML = '';
      if(libelle !== undefined) sel.appendChild(new Option('↳ Comme le libellé (' + nomDest(libelle) + ')', IK_LIB));
      else sel.appendChild(new Option('⏳ À décider', ''));
      const og = document.createElement('optgroup'); og.label = 'Les catégories de l’appli';
      cats.forEach(c => og.appendChild(new Option((mem.nouvelles.indexOf(c) !== -1 ? '🆕 ' : '') + c, c)));
      sel.appendChild(og);
      const og2 = document.createElement('optgroup'); og2.label = 'Autre';
      og2.appendChild(new Option('➕ Nouvelle catégorie…', IK_NOUVELLE));
      if(prive) og2.appendChild(new Option('🔒 Ma catégorie privée (moi seul)', prive));
      og2.appendChild(new Option('📭 Sans catégorie', IK_SANS));
      og2.appendChild(new Option('🚫 Ne pas importer', IK_NON));
      sel.appendChild(og2);
      sel.value = valeur;
      if(sel.value !== valeur) sel.value = (libelle !== undefined) ? IK_LIB : '';
    };
    const creerCategorie = async propose => {
      const t = await demander('Le nom de la nouvelle catégorie (un emoji devant, si tu veux) :', propose || '', '➕ Nouvelle catégorie');
      const nom = String(t || '').replace(/·/g, '-').replace(/\s+/g, ' ').trim().slice(0, 40);
      if(!nom) return null;
      const deja = cats.find(c => memeNom(c, nom));
      if(deja) return deja;
      cats.push(nom); mem.nouvelles.push(nom); sauver();
      return nom;
    };
    let vue = { quoi: 'libelles', filtre: 'tous', cherche: '' };

    const totaux = () => {
      let pret = 0, attend = 0, non = 0, fait = 0, photos = 0;
      fiches.forEach(f => { const e = etat(f); if(e.fait) fait++; else if(e.pret){ pret++; photos += f.images.length; } else if(e.attend) attend++; else non++; });
      return { pret, attend, non, fait, photos };
    };

    /* ⚠️ LA LISTE GARDE SA PLACE. Chaque choix redessine (les
       compteurs suivent) : sans ceci, choisir la catégorie de la
       30ᵉ fiche ramenait en haut de la liste. */
    let placeDe = '';
    const dessiner = () => {
      const l0 = corps.querySelector('.ikListe');
      const cle = vue.quoi + '|' + (vue.groupe ? vue.groupe.nom : vue.recherche || '') + '|' + (vue.filtre || '');
      const y = (l0 && placeDe === cle) ? l0.scrollTop : 0;
      corps.innerHTML = '';
      if(vue.quoi === 'fiches') dessinerFiches(); else dessinerLibelles();
      placeDe = cle;
      const l1 = corps.querySelector('.ikListe');
      if(l1 && y) l1.scrollTop = y;
    };

    /* ── 2a · les libellés ── */
    const dessinerLibelles = () => {
      const t = totaux();
      const nDec = libs.filter(g => destDe(g) !== '').length;
      const tete = ikEl('div', 'ikBilan');
      tete.textContent = fiches.length + ' fiches · ' + libs.length + ' libellés' + (corbeille ? ' · ' + corbeille + ' dans la corbeille Keep (laissées de côté)' : '');
      corps.appendChild(tete);
      const comp = ikEl('div', 'ikCompteurs');
      [['✅', nDec + ' / ' + libs.length + ' libellés décidés'], ['📥', t.pret + ' fiches prêtes'], ['⏳', t.attend + ' à décider'],
       ['🚫', t.non + ' non importées']].concat(t.fait ? [['☑️', t.fait + ' déjà importées']] : []).forEach(([e, x]) => comp.appendChild(ikEl('span', 'ikCompteur', e + ' ' + x)));
      corps.appendChild(comp);
      const barre = ikEl('div', 'ikBarre');
      const ch = document.createElement('input');
      ch.type = 'search'; ch.placeholder = '🔎 Un libellé, ou un mot dans les fiches…'; ch.className = 'ikCherche'; ch.value = vue.cherche;
      ch.setAttribute('aria-label', 'Chercher un libellé ou une fiche');
      barre.appendChild(ch);
      const bCh = ikEl('button', 'btn btn-secondary ikPetit', '🔎 Dans les fiches'); bCh.type = 'button';
      bCh.title = 'Montrer toutes les fiches qui contiennent ce mot';
      barre.appendChild(bCh);
      corps.appendChild(barre);
      const filtres = ikEl('div', 'ikFiltres');
      [['tous', 'Tous'], ['attendre', '⏳ À décider'], ['decides', '✅ Décidés']].forEach(([k, x]) => {
        const b = ikEl('button', 'vbPuce' + (vue.filtre === k ? ' on' : ''), x); b.type = 'button';
        b.setAttribute('aria-pressed', vue.filtre === k ? 'true' : 'false');
        b.addEventListener('click', () => { vue.filtre = k; dessiner(); });
        filtres.appendChild(b);
      });
      corps.appendChild(filtres);
      const liste = ikEl('div', 'ikListe ikLibs');
      const entete = ikEl('div', 'ikLibEntete');
      entete.appendChild(ikEl('span', '', '🏷️ Tes libellés Keep'));
      entete.appendChild(ikEl('span', '', 'Va dans'));
      liste.appendChild(entete);
      const lignes = [];
      libs.forEach(g => {
        const d = destDe(g);
        if(vue.filtre === 'attendre' && d !== '') return;
        if(vue.filtre === 'decides' && d === '') return;
        const li = ikEl('div', 'ikLib' + (d === '' ? ' attend' : d === IK_NON ? ' non' : ''));
        const nom = ikEl('button', 'ikLibNom'); nom.type = 'button';
        nom.appendChild(ikEl('b', '', g.nom || '📭 Sans libellé'));
        const changees = g.fiches.filter(f => etat(f).propre).length, faites = g.fiches.filter(f => choixDe(f).fait).length;
        nom.appendChild(ikEl('small', '', g.fiches.length + ' fiche' + (g.fiches.length > 1 ? 's' : '') +
          (changees ? ' · ' + changees + ' changée' + (changees > 1 ? 's' : '') : '') + (faites ? ' · ' + faites + ' importée' + (faites > 1 ? 's' : '') : '') + '  ›'));
        nom.title = 'Voir les fiches de ce libellé';
        nom.addEventListener('click', () => { vue = { quoi: 'fiches', groupe: g, page: 1, cherche: '', filtre: vue.filtre, retour: ch.value }; dessiner(); });
        li.appendChild(nom);
        const sel = ikEl('select', 'ikSel');
        sel.setAttribute('aria-label', 'Où va le libellé « ' + (g.nom || 'sans libellé') + ' »');
        remplir(sel, d);
        sel.addEventListener('change', async () => {
          let v = sel.value;
          if(v === IK_NOUVELLE){ v = await creerCategorie((typeof sansGras === 'function') ? sansGras(g.nom) : g.nom); if(v === null){ remplir(sel, d); return; } }
          if(v === '') delete mem.dest[g.nom]; else mem.dest[g.nom] = v;
          sauver(); dessiner();
        });
        li.appendChild(sel);
        liste.appendChild(li);
        lignes.push({ li: li, texte: (g.nom || 'sans libellé').toLowerCase() });
      });
      if(lignes.length === 0) liste.appendChild(ikEl('div', 'empty', vue.filtre === 'attendre' ? '✅ Tous les libellés sont décidés.' : 'Aucun libellé.'));
      corps.appendChild(liste);
      const filtrer = () => { vue.cherche = ch.value; const q = ch.value.trim().toLowerCase(); lignes.forEach(l => { l.li.style.display = (!q || l.texte.indexOf(q) !== -1) ? '' : 'none'; }); };
      ch.addEventListener('input', filtrer); filtrer();
      bCh.addEventListener('click', () => {
        const q = ch.value.trim();
        if(!q){ ch.focus(); return; }
        vue = { quoi: 'fiches', groupe: null, recherche: q, page: 1, cherche: '', filtre: vue.filtre, retour: q }; dessiner();
      });
      ch.addEventListener('keydown', e => { if(e.key === 'Enter') bCh.click(); });
      if(mem.nouvelles.length) corps.appendChild(ikEl('div', 'ikAide ikNouvelles', '🆕 Catégories qui seront créées : ' + mem.nouvelles.join(' · ')));
      pied(t);
    };

    /* ── 2b · les fiches d'un libellé (ou d'une recherche) ── */
    const dessinerFiches = () => {
      const g = vue.groupe;
      const tous = g ? g.fiches : fiches.filter(f => (f.titre + ' ' + f.contenu + ' ' + f.libelles.join(' ')).toLowerCase().indexOf(vue.recherche.toLowerCase()) !== -1);
      const haut = ikEl('div', 'ikBarre');
      const bR = ikEl('button', 'btn btn-secondary ikPetit', '‹ Tous les libellés'); bR.type = 'button';
      bR.addEventListener('click', () => { vue = { quoi: 'libelles', filtre: vue.filtre, cherche: vue.retour || '' }; dessiner(); });
      haut.appendChild(bR);
      corps.appendChild(haut);
      const titre = ikEl('div', 'ikBilan', g ? '🏷️ ' + (g.nom || '📭 Sans libellé') + ' · ' + tous.length + ' fiche' + (tous.length > 1 ? 's' : '')
                                              : '🔎 « ' + vue.recherche + ' » · ' + tous.length + ' fiche' + (tous.length > 1 ? 's' : ''));
      corps.appendChild(titre);
      if(g){
        const b = ikEl('div', 'ikBarre');
        b.appendChild(ikEl('span', 'ikLab', 'Ce libellé va dans :'));
        const sel = ikEl('select', 'ikSel');
        sel.setAttribute('aria-label', 'Où va ce libellé');
        remplir(sel, destDe(g));
        sel.addEventListener('change', async () => {
          let v = sel.value;
          if(v === IK_NOUVELLE){ v = await creerCategorie((typeof sansGras === 'function') ? sansGras(g.nom) : g.nom); if(v === null){ remplir(sel, destDe(g)); return; } }
          if(v === '') delete mem.dest[g.nom]; else mem.dest[g.nom] = v;
          sauver(); dessiner();
        });
        b.appendChild(sel);
        corps.appendChild(b);
      }
      const outils = ikEl('div', 'ikBarre');
      const ch = document.createElement('input');
      ch.type = 'search'; ch.placeholder = '🔎 Chercher dans ces fiches…'; ch.className = 'ikCherche'; ch.value = vue.cherche || '';
      ch.setAttribute('aria-label', 'Chercher dans ces fiches');
      outils.appendChild(ch);
      const bTout = ikEl('button', 'btn btn-secondary ikPetit', '☑ Toutes'); bTout.type = 'button';
      const bRien = ikEl('button', 'btn btn-secondary ikPetit', '☐ Aucune'); bRien.type = 'button';
      const bRaz = ikEl('button', 'btn btn-secondary ikPetit', '↺ Comme le libellé'); bRaz.type = 'button';
      bRaz.title = 'Toutes ces fiches reprennent le choix de leur libellé';
      outils.appendChild(bTout); outils.appendChild(bRien); outils.appendChild(bRaz);
      corps.appendChild(outils);
      const q = (vue.cherche || '').trim().toLowerCase();
      const vues = q ? tous.filter(f => (f.titre + ' ' + f.contenu).toLowerCase().indexOf(q) !== -1) : tous;
      const liste = ikEl('div', 'ikListe');
      vues.slice(0, vue.page * IK_PAGE).forEach(f => liste.appendChild(ligneFiche(f)));
      if(!vues.length) liste.appendChild(ikEl('div', 'empty', 'Aucune fiche.'));
      if(vues.length > vue.page * IK_PAGE){
        const plus = ikEl('button', 'btn btn-secondary ikPlus', 'Afficher ' + Math.min(IK_PAGE, vues.length - vue.page * IK_PAGE) + ' de plus (' + (vues.length - vue.page * IK_PAGE) + ' restantes)');
        plus.type = 'button';
        plus.addEventListener('click', () => { const y = liste.scrollTop; vue.page++; dessiner(); const l2 = corps.querySelector('.ikListe'); if(l2) l2.scrollTop = y; });
        liste.appendChild(plus);
      }
      corps.appendChild(liste);
      let tempo = null;
      ch.addEventListener('input', () => { clearTimeout(tempo); tempo = setTimeout(() => { vue.cherche = ch.value; vue.page = 1; dessiner(); const c2 = corps.querySelector('.ikCherche'); if(c2){ c2.focus(); c2.setSelectionRange(c2.value.length, c2.value.length); } }, 250); });
      bTout.addEventListener('click', () => { vues.forEach(f => { if(!choixDe(f).fait) poserChoix(f, 'coche', true); }); sauver(); dessiner(); });
      bRien.addEventListener('click', () => { vues.forEach(f => { if(!choixDe(f).fait) poserChoix(f, 'coche', false); }); sauver(); dessiner(); });
      bRaz.addEventListener('click', () => { vues.forEach(f => { poserChoix(f, 'coche', undefined); poserChoix(f, 'cat', undefined); }); sauver(); dessiner(); });
      pied(totaux());
    };

    const ligneFiche = f => {
      const e = etat(f);
      const g = groupes.get(f.libelles[0] || '');
      const li = ikEl('div', 'ficheTexte ikLigne' + (e.fait ? ' faite' : (!e.coche || e.cat === IK_NON) ? ' off' : ''));
      if(f.couleur) li.setAttribute('data-couleur', f.couleur);
      const haut = ikEl('label', 'ikHaut');
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = e.fait || (e.coche && e.cat !== IK_NON); cb.disabled = e.fait; cb.className = 'ikCoche';
      cb.setAttribute('aria-label', 'Importer « ' + f.titre + ' »');
      haut.appendChild(cb);
      haut.appendChild(ikEl('span', 'ft ikTitre', f.titre));
      li.appendChild(haut);
      const marques = [];
      if(e.fait) marques.push('☑️ déjà importée');
      if(f.epinglee) marques.push('📌 épinglée');
      if(f.archivee) marques.push('🗄️ archivée');
      if(f.liste) marques.push('☑️ liste');
      if(f.images.length) marques.push('🖼️ ' + f.images.length + ' photo' + (f.images.length > 1 ? 's' : ''));
      if(f.libelles.length > 1) marques.push('🏷️ aussi : ' + f.libelles.slice(1).join(', '));
      if(!vue.groupe && f.libelles.length) marques.push('🏷️ ' + f.libelles[0]);
      if(f.deja && !e.fait) marques.push('⚠️ déjà dans l’appli');
      if(f.contenu.length > IK_TAILLE_MAX) marques.push('✂️ coupée à ' + IK_TAILLE_MAX + ' caractères');
      if(marques.length){
        const m = ikEl('div', 'fe');
        marques.forEach(x => m.appendChild(ikEl('span', 'fetq' + (/déjà dans/.test(x) ? ' ikAlerte' : ''), x)));
        li.appendChild(m);
      }
      if(f.contenu) li.appendChild(ikEl('div', 'fp', f.contenu));
      if(!e.fait){
        const bas = ikEl('div', 'ikCat');
        bas.appendChild(ikEl('span', 'ikLab', 'Va dans'));
        const sel = ikEl('select', 'ikSel');
        sel.setAttribute('aria-label', 'Catégorie de « ' + f.titre + ' »');
        const c = choixDe(f);
        remplir(sel, c.cat !== undefined ? c.cat : IK_LIB, destDe(g));
        bas.appendChild(sel);
        li.appendChild(bas);
        sel.addEventListener('change', async () => {
          let v = sel.value;
          if(v === IK_NOUVELLE){ v = await creerCategorie(); if(v === null){ remplir(sel, c.cat !== undefined ? c.cat : IK_LIB, destDe(g)); return; } }
          poserChoix(f, 'cat', v === IK_LIB ? undefined : v);
          if(v !== IK_NON && v !== IK_LIB) poserChoix(f, 'coche', true);
          sauver(); dessiner();
        });
        cb.addEventListener('change', () => {
          poserChoix(f, 'coche', cb.checked);
          if(cb.checked && etat(f).cat === IK_NON) poserChoix(f, 'cat', '');
          sauver(); dessiner();
        });
      }
      return li;
    };

    /* ── le pied : combien, et le bouton ── */
    const pied = t => {
      const p = ikEl('div', 'ikPied');
      p.appendChild(ikEl('div', 'ikCompte', t.pret
        ? '📥 ' + t.pret + ' fiche' + (t.pret > 1 ? 's' : '') + ' prête' + (t.pret > 1 ? 's' : '') + (t.photos ? ' · ' + t.photos + ' photo' + (t.photos > 1 ? 's' : '') : '') +
          ' · ≈ ' + ikDuree((t.pret + t.photos) * 1.15) + (t.attend ? ' · ⏳ ' + t.attend + ' encore à décider (elles attendront)' : '')
        : (t.attend ? '⏳ Choisis où vont tes libellés : rien n’est prêt à importer.' : 'Rien à importer.')));
      const r = ikEl('div', 'btn-row');
      const bA = ikEl('button', 'btn btn-secondary', '↩ Autre fichier'); bA.type = 'button';
      bA.addEventListener('click', () => { if(!occupe) depot(); });
      const bGo = ikEl('button', 'btn btn-primary', t.pret ? '📥 Importer ' + t.pret + ' fiche' + (t.pret > 1 ? 's' : '') : '📥 Importer'); bGo.type = 'button';
      bGo.disabled = !t.pret;
      bGo.addEventListener('click', () => importer());
      r.appendChild(bA); r.appendChild(bGo);
      p.appendChild(r);
      corps.appendChild(p);
    };

    /* ── 3 · L'import : on peut l'arrêter, et le reprendre ── */
    const importer = async () => {
      const aFaire = fiches.filter(f => etat(f).pret);
      if(!aFaire.length || occupe) return;
      const nPh = aFaire.reduce((s, f) => s + f.images.length, 0);
      if(aFaire.length > 30 && !await confirmer(aFaire.length + ' fiches' + (nPh ? ' et ' + nPh + ' photos' : '') + ' à importer, ≈ ' + ikDuree((aFaire.length + nPh) * 1.15) + '.\n\n' +
          'Garde cet onglet ouvert. Tu peux arrêter quand tu veux et reprendre plus tard : ce qui est fait ne se refait pas.', '📥 Importer')) return;
      occupe = true;
      corps.innerHTML = '';
      const t0 = Date.now();
      const titre = ikEl('div', 'ikBilan', '📥 Import en cours…');
      const barre = ikEl('div', 'ikBarreProg'); const plein = ikEl('i', ''); barre.appendChild(plein);
      const ligne = ikEl('div', 'ikMsg', ''); ligne.setAttribute('role', 'status');
      const r = ikEl('div', 'btn-row');
      const bStop = ikEl('button', 'btn btn-secondary', '⏸ Arrêter'); bStop.type = 'button';
      let stop = false;
      bStop.addEventListener('click', () => { stop = true; bStop.disabled = true; bStop.textContent = '⏸ Arrêt après cette fiche…'; });
      r.appendChild(bStop);
      corps.appendChild(titre); corps.appendChild(barre); corps.appendChild(ligne); corps.appendChild(r);
      const rates = [];
      let faites = 0, photos = 0, photosRatees = 0;
      for(let k = 0; k < aFaire.length && !stop; k++){
        const f = aFaire[k], e = etat(f);
        const reste = (Date.now() - t0) / Math.max(1, k) * (aFaire.length - k) / 1000;
        ligne.textContent = 'Fiche ' + (k + 1) + ' sur ' + aFaire.length + ' : ' + f.titre + (k > 3 ? ' · encore ≈ ' + ikDuree(reste) : '');
        plein.style.width = Math.round(k * 100 / aFaire.length) + '%';
        const cat = e.cat === IK_SANS ? '' : e.cat;
        const etiq = [cat, f.couleur ? PREFIXE_COULEUR + f.couleur : ''].filter(Boolean).join(SEP_ETIQ);
        const m = { id: nouvelIdModele(), usage: 'libre', titre: f.titre.slice(0, 200), etiquettes: etiq,
                    contenu: f.contenu.length > IK_TAILLE_MAX ? f.contenu.slice(0, IK_TAILLE_MAX) + '\n…' : f.contenu };
        try{
          await ikAvecPatience(() => enregistrerModeleTexte(m));
          faites++;
          poserChoix(f, 'fait', true); sauver();
          for(const im of f.images){
            try{
              const brut = await im.lire();
              const blob = brut.type ? brut : new Blob([brut], { type: ikTypeImage(im.nom) });
              const donnees = await compresserImage(blob);
              await ikAvecPatience(() => appelPrep({ action: 'ficheImageAdd', fiche: m.id, image: donnees }));
              photos++;
            }catch(er){ photosRatees++; }
          }
        }catch(er){
          rates.push(f.titre + ' : ' + ((er && er.message) || er));
        }
      }
      occupe = false;
      if(typeof perimerModeles === 'function') perimerModeles();
      if(typeof showToast === 'function') showToast('📥 ' + faites + ' fiche' + (faites > 1 ? 's' : '') + ' importée' + (faites > 1 ? 's' : '') + (photos ? ' · ' + photos + ' photo' + (photos > 1 ? 's' : '') : ''));
      if(rates.length || photosRatees){
        await informer((rates.length ? rates.length + ' fiche(s) non importée(s) — elles restent prêtes, tu peux relancer :\n\n' + rates.slice(0, 20).join('\n') + (rates.length > 20 ? '\n…' : '') + '\n\n' : '') +
          (photosRatees ? photosRatees + ' photo(s) n’ont pas pu suivre leur fiche (trop lourdes ou illisibles) : la fiche est importée sans elles.' : ''), '📥 Import Keep');
      }
      if(typeof afficherModelesTexte === 'function') afficherModelesTexte();
      vue = { quoi: 'libelles', filtre: 'tous', cherche: '' };
      dessiner();
    };

    dessiner();
  };

  depot();
}

function ikDuree(secondes){
  const s = Math.max(0, Math.round(secondes));
  if(s < 90) return Math.max(1, s) + ' s';
  const m = Math.round(s / 60);
  if(m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0');
}

/* Le classeur limite le nombre d’écritures par minute : on attend un
   peu entre deux fiches, et on réessaie quand il dit « trop vite ». */
let ikDernierAppel = 0;
async function ikAvecPatience(faire){
  for(let essai = 0; essai < 4; essai++){
    const attente = 1100 - (Date.now() - ikDernierAppel);
    if(attente > 0) await new Promise(r => setTimeout(r, attente));
    ikDernierAppel = Date.now();
    try{
      const r = await faire();
      if(r && r.status === 'error') throw new Error(r.message || 'refusé');
      return r;
    }catch(e){
      const t = String((e && e.message) || e);
      if(essai < 3 && /quota|429|rate|trop de|too many/i.test(t)){
        await new Promise(r => setTimeout(r, 20000 * (essai + 1)));
        continue;
      }
      throw e;
    }
  }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-import-keep.js'] = true;
