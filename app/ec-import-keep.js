/* Déployé le 24/10/2026 à 14:28 — v1262 */
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
  let i = 0;
  for(const e of jsons){
    i++;
    if(i % 25 === 0) dire('📝 Lecture des fiches : ' + i + ' sur ' + jsons.length + '…');
    let j = null;
    try{ j = JSON.parse(await (await e.lire()).text()); }catch(er){ continue; }
    const fi = ikFicheDepuisKeep(j, e.nom);
    if(!fi) continue;
    fi.pieces.forEach(pc => {
      const im = images[ikBase(pc).toLowerCase()] || imagesSansExt[ikSansExt(pc)];
      if(im) fi.images.push({ nom: im.nom, lire: im.lire });
    });
    fiches.push(fi);
  }
  /* épinglées d’abord, puis les plus récentes, comme dans Keep */
  fiches.sort((a, b) => (b.epinglee - a.epinglee) || ((b.quand || 0) - (a.quand || 0)));
  return fiches;
}

/* Déjà dans l’appli : même titre et même texte (un second import ne
   double rien) */
function ikDejaLa(fi){
  const n = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return (modelesTexte || []).some(m => n(m.titre || m.nom) === n(fi.titre) && n(m.contenu) === n(fi.contenu));
}

/* ---------- La fenêtre ---------- */
function ikEl(tag, cls, texte){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(texte !== undefined) e.textContent = texte;
  return e;
}

async function ouvrirImportKeep(){
  if(typeof chargerModelesTexte === 'function') await chargerModelesTexte();
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
      '<b>3.</b> Dépose-le ici. Rien ne part avant que tu appuies sur « Importer » : tu choisis d’abord la catégorie de chaque fiche.';
    corps.appendChild(aide);
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
        tri(fiches);
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

  /* ── 2 · Le tri : une catégorie par fiche ── */
  const tri = toutes => {
    const corbeille = toutes.filter(f => f.corbeille).length;
    const fiches = toutes.filter(f => !f.corbeille);
    const prive = (typeof maMarquePrivee === 'function') ? maMarquePrivee() : '';
    /* les catégories : celles de l’appli, puis les libellés Keep */
    let cats = ((typeof toutesLesEtiquettes === 'function') ? toutesLesEtiquettes() : [])
      .filter(c => !(typeof estEtiquetteTechnique === 'function' && estEtiquetteTechnique(c)));
    const nouvelles = [];
    fiches.forEach(f => f.libelles.forEach(l => {
      const deja = cats.find(c => (typeof normaliserMot === 'function' ? normaliserMot(c) === normaliserMot(l) : c.toLowerCase() === l.toLowerCase()));
      if(!deja && nouvelles.indexOf(l) === -1) nouvelles.push(l);
    }));
    cats = cats.concat(nouvelles);
    const trouverCat = l => cats.find(c => (typeof normaliserMot === 'function' ? normaliserMot(c) === normaliserMot(l) : c.toLowerCase() === l.toLowerCase())) || l;
    fiches.forEach(f => {
      f.deja = ikDejaLa(f);
      f.coche = !f.deja;
      f.cat = f.libelles.length ? trouverCat(f.libelles[0]) : '';
    });

    corps.innerHTML = '';
    const bilan = ikEl('div', 'ikBilan');
    const nArch = fiches.filter(f => f.archivee).length, nDeja = fiches.filter(f => f.deja).length;
    const nImg = fiches.reduce((s, f) => s + f.images.length, 0);
    bilan.textContent = fiches.length + ' fiche' + (fiches.length > 1 ? 's' : '') + ' trouvée' + (fiches.length > 1 ? 's' : '') +
      (nArch ? ' · ' + nArch + ' archivée' + (nArch > 1 ? 's' : '') : '') +
      (nImg ? ' · ' + nImg + ' photo' + (nImg > 1 ? 's' : '') : '') +
      (nDeja ? ' · ' + nDeja + ' déjà dans l’appli (décochée' + (nDeja > 1 ? 's' : '') + ')' : '') +
      (corbeille ? ' · ' + corbeille + ' dans la corbeille Keep, laissée' + (corbeille > 1 ? 's' : '') + ' de côté' : '');
    corps.appendChild(bilan);
    if(nouvelles.length){
      corps.appendChild(ikEl('div', 'ikAide', '🆕 Libellés Keep qui deviendront des catégories : ' + nouvelles.join(', ') +
        '. Tu peux les changer fiche par fiche.'));
    }

    /* la barre : chercher, tout cocher, une catégorie pour les cochées */
    const barre = ikEl('div', 'ikBarre');
    const cherche = document.createElement('input');
    cherche.type = 'search'; cherche.placeholder = '🔎 Chercher une fiche…'; cherche.className = 'ikCherche';
    cherche.setAttribute('aria-label', 'Chercher une fiche');
    barre.appendChild(cherche);
    const bTout = ikEl('button', 'btn btn-secondary ikPetit', '☑ Tout'); bTout.type = 'button';
    const bRien = ikEl('button', 'btn btn-secondary ikPetit', '☐ Rien'); bRien.type = 'button';
    barre.appendChild(bTout); barre.appendChild(bRien);
    corps.appendChild(barre);
    const barre2 = ikEl('div', 'ikBarre');
    barre2.appendChild(ikEl('span', 'ikLab', 'Aux fiches cochées :'));
    const selTous = ikEl('select', 'ikSel');
    selTous.setAttribute('aria-label', 'Catégorie pour toutes les fiches cochées');
    const bAppliquer = ikEl('button', 'btn btn-secondary ikPetit', 'Mettre cette catégorie'); bAppliquer.type = 'button';
    barre2.appendChild(selTous); barre2.appendChild(bAppliquer);
    corps.appendChild(barre2);

    const listeEl = ikEl('div', 'ikListe');
    corps.appendChild(listeEl);
    const pied = ikEl('div', 'ikPied');
    const compte = ikEl('div', 'ikCompte', '');
    const msg = ikEl('div', 'ikMsg', '');
    msg.setAttribute('role', 'status');
    const rangee = ikEl('div', 'btn-row');
    const bRetour = ikEl('button', 'btn btn-secondary', '↩ Autre fichier'); bRetour.type = 'button';
    const bGo = ikEl('button', 'btn btn-primary', '📥 Importer'); bGo.type = 'button';
    rangee.appendChild(bRetour); rangee.appendChild(bGo);
    pied.appendChild(compte); pied.appendChild(msg); pied.appendChild(rangee);
    corps.appendChild(pied);
    bRetour.addEventListener('click', () => { if(!occupe) depot(); });

    const NOUVELLE = '__nouvelle__';
    const remplir = (sel, valeur, avecVide) => {
      sel.innerHTML = '';
      if(avecVide !== false) sel.appendChild(new Option('— Sans catégorie —', ''));
      cats.forEach(c => sel.appendChild(new Option((nouvelles.indexOf(c) !== -1 ? '🆕 ' : '') + c, c)));
      if(prive) sel.appendChild(new Option('🔒 Ma catégorie privée (moi seul)', prive));
      sel.appendChild(new Option('➕ Nouvelle catégorie…', NOUVELLE));
      sel.value = valeur || '';
    };
    const creerCategorie = async () => {
      const t = await demander('Le nom de la nouvelle catégorie (un emoji devant, si tu veux) :', '', '➕ Nouvelle catégorie');
      const nom = String(t || '').replace(/·/g, '-').replace(/\s+/g, ' ').trim().slice(0, 40);
      if(!nom) return '';
      const deja = cats.find(c => c.toLowerCase() === nom.toLowerCase());
      if(deja) return deja;
      cats.push(nom); nouvelles.push(nom);
      return nom;
    };
    const lignes = [];
    const majCompte = () => {
      const n = fiches.filter(f => f.coche).length;
      const sans = fiches.filter(f => f.coche && !f.cat).length;
      compte.textContent = n + ' fiche' + (n > 1 ? 's' : '') + ' à importer' + (sans ? ' · ' + sans + ' sans catégorie' : '');
      bGo.disabled = !n;
      bGo.textContent = n ? '📥 Importer ' + n + ' fiche' + (n > 1 ? 's' : '') : '📥 Importer';
    };
    const toutesLesListes = () => lignes.forEach(l => remplir(l.sel, l.f.cat));
    fiches.forEach((f, k) => {
      const li = ikEl('div', 'ficheTexte ikLigne' + (f.coche ? '' : ' off'));
      if(f.couleur) li.setAttribute('data-couleur', f.couleur);
      const haut = ikEl('label', 'ikHaut');
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = f.coche; cb.className = 'ikCoche';
      cb.setAttribute('aria-label', 'Importer « ' + f.titre + ' »');
      haut.appendChild(cb);
      const tt = ikEl('span', 'ft ikTitre', f.titre);
      haut.appendChild(tt);
      li.appendChild(haut);
      const marques = [];
      if(f.epinglee) marques.push('📌 épinglée');
      if(f.archivee) marques.push('🗄️ archivée');
      if(f.liste) marques.push('☑️ liste');
      if(f.images.length) marques.push('🖼️ ' + f.images.length + ' photo' + (f.images.length > 1 ? 's' : ''));
      if(f.libelles.length) marques.push('🏷️ Keep : ' + f.libelles.join(', '));
      if(f.deja) marques.push('⚠️ déjà dans l’appli');
      if(f.contenu.length > IK_TAILLE_MAX) marques.push('✂️ très longue : coupée à ' + IK_TAILLE_MAX + ' caractères');
      if(marques.length){
        const m = ikEl('div', 'fe');
        marques.forEach(x => m.appendChild(ikEl('span', 'fetq' + (/déjà/.test(x) ? ' ikAlerte' : ''), x)));
        li.appendChild(m);
      }
      if(f.contenu) li.appendChild(ikEl('div', 'fp', f.contenu));
      const bas = ikEl('div', 'ikCat');
      bas.appendChild(ikEl('span', 'ikLab', 'Catégorie'));
      const sel = ikEl('select', 'ikSel');
      sel.setAttribute('aria-label', 'Catégorie de « ' + f.titre + ' »');
      remplir(sel, f.cat);
      bas.appendChild(sel);
      li.appendChild(bas);
      listeEl.appendChild(li);
      const l = { f: f, li: li, cb: cb, sel: sel, texte: (f.titre + ' ' + f.contenu + ' ' + f.libelles.join(' ')).toLowerCase() };
      lignes.push(l);
      cb.addEventListener('change', () => { f.coche = cb.checked; li.classList.toggle('off', !f.coche); majCompte(); });
      sel.addEventListener('change', async () => {
        if(sel.value === NOUVELLE){
          const n = await creerCategorie();
          f.cat = n || f.cat;
          toutesLesListes();
          remplir(selTous, selTous.value === NOUVELLE ? '' : selTous.value, true);
        }else f.cat = sel.value;
        if(!f.coche && f.cat){ f.coche = true; cb.checked = true; li.classList.remove('off'); }
        majCompte();
      });
    });
    remplir(selTous, '', true);
    selTous.addEventListener('change', async () => {
      if(selTous.value !== NOUVELLE) return;
      const n = await creerCategorie();
      toutesLesListes();
      remplir(selTous, n, true);
    });
    bAppliquer.addEventListener('click', () => {
      const v = selTous.value === NOUVELLE ? '' : selTous.value;
      let n = 0;
      lignes.forEach(l => { if(l.f.coche && l.li.style.display !== 'none'){ l.f.cat = v; l.sel.value = v; n++; } });
      if(typeof showToast === 'function') showToast(n + ' fiche' + (n > 1 ? 's' : '') + ' → ' + (v ? (v === prive ? '🔒 privée' : v) : 'sans catégorie'));
      majCompte();
    });
    const filtrer = () => {
      const q = cherche.value.trim().toLowerCase();
      lignes.forEach(l => { l.li.style.display = (!q || l.texte.indexOf(q) !== -1) ? '' : 'none'; });
    };
    cherche.addEventListener('input', filtrer);
    const cocher = oui => lignes.forEach(l => { if(l.li.style.display === 'none') return; l.f.coche = oui; l.cb.checked = oui; l.li.classList.toggle('off', !oui); });
    bTout.addEventListener('click', () => { cocher(true); majCompte(); });
    bRien.addEventListener('click', () => { cocher(false); majCompte(); });
    majCompte();

    /* ── 3 · L’import ── */
    bGo.addEventListener('click', async () => {
      const aFaire = fiches.filter(f => f.coche);
      if(!aFaire.length || occupe) return;
      occupe = true;
      bGo.disabled = true; bRetour.disabled = true;
      [cherche, bTout, bRien, selTous, bAppliquer].forEach(x => { x.disabled = true; });
      lignes.forEach(l => { l.cb.disabled = true; l.sel.disabled = true; });
      const rates = [];
      let faites = 0, photos = 0, photosRatees = 0;
      for(let k = 0; k < aFaire.length; k++){
        const f = aFaire[k];
        msg.className = 'ikMsg';
        msg.textContent = '📥 Fiche ' + (k + 1) + ' sur ' + aFaire.length + ' : ' + f.titre;
        const etiq = [f.cat, f.couleur ? PREFIXE_COULEUR + f.couleur : ''].filter(Boolean).join(SEP_ETIQ);
        const m = { id: nouvelIdModele(), usage: 'libre', titre: f.titre.slice(0, 200), etiquettes: etiq,
                    contenu: f.contenu.length > IK_TAILLE_MAX ? f.contenu.slice(0, IK_TAILLE_MAX) + '\n…' : f.contenu };
        try{
          await ikAvecPatience(() => enregistrerModeleTexte(m));
          faites++;
          const l = lignes.find(x => x.f === f);
          if(l){ l.li.classList.add('faite'); l.cb.checked = false; }
          f.coche = false;
          for(const im of f.images){
            try{
              const brut = await im.lire();
              const blob = brut.type ? brut : new Blob([brut], { type: ikTypeImage(im.nom) });
              const donnees = await compresserImage(blob);
              await ikAvecPatience(() => appelPrep({ action: 'ficheImageAdd', fiche: m.id, image: donnees }));
              photos++;
            }catch(e){ photosRatees++; }
          }
        }catch(e){
          rates.push(f.titre + ' : ' + ((e && e.message) || e));
        }
      }
      occupe = false;
      if(typeof perimerModeles === 'function') perimerModeles();
      fermer();
      if(typeof showToast === 'function') showToast('📥 ' + faites + ' fiche' + (faites > 1 ? 's' : '') + ' importée' + (faites > 1 ? 's' : '') + (photos ? ' · ' + photos + ' photo' + (photos > 1 ? 's' : '') : ''));
      if(rates.length || photosRatees){
        await informer((rates.length ? 'Fiches non importées (elles sont restées dans Keep) :\n\n' + rates.join('\n') + '\n\n' : '') +
          (photosRatees ? photosRatees + ' photo(s) n’ont pas pu suivre leur fiche (trop lourdes ou illisibles) : la fiche est importée sans elles.' : ''),
          '📥 Import Keep');
      }
      if(typeof afficherModelesTexte === 'function') afficherModelesTexte();
    });
  };

  depot();
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
