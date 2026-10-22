/* Déployé le 22/10/2026 à 15:14 — v1244 */
/* ============================================================
   ec-courriers.js — ✉️ LES COURRIERS SUR PAPIER À EN-TÊTE (v1243)

   David, le 22 octobre : « dans Outils › Ce qu'on écrit, un endroit
   pour envoyer des courriers types : un courrier vierge avec juste
   l'en-tête et le pied de page, la possibilité de mettre ma signature
   avec le tampon, un courrier pour les convocations examen. Il faut
   que l'on puisse créer d'autres modèles, lier à un élève au besoin,
   envoyer par mail. » Puis : « ajouter des tampons et des signatures
   qui s'intègrent », « avec l'en-tête de Loudéac ».

   Ses arbitrages sur le schéma (schema-courriers.html) :
   · toutes les signatures servent à tous les administrateurs ;
   · l'image se pose LIBREMENT sur la page (glisser, taille, ⟳), et
     sa place est gardée par le modèle ;
   · le Siret au pied des deux en-têtes ;
   · écrire et envoyer = le droit « courriers » (bureau + admins par
     le rôle) ; modèles, en-têtes et signatures = administrateurs ;
   · toutes les propositions A à H — celles-ci sont dans cette
     livraison : B (les modèles prêts), D (l'onglet du dossier), G
     (le numéro de courrier), et la relance de paiement en modèle.

   ⚠️ CE QU'ON VOIT EST CE QUI SORT. La page de l'écran et le PDF
   sont dessinés avec LA MÊME police (Carlito, aux largeurs de
   Calibri, celle des modèles Word de David), les mêmes mesures en
   millimètres et les mêmes lignes. Le PDF ne photographie pas
   l'écran : il récrit le texte, ligne par ligne — net à l'impression,
   et léger dans un mail.
   ============================================================ */

const CR = {
  d: null,            /* courriersLire : modèles, réglages, images */
  faits: [],          /* les derniers courriers */
  res: null,          /* polices, logo, badge (ec-courriers-ressources.js) */
  ed: null,           /* le courrier ou le modèle ouvert */
  aOuvrir: null,      /* { eleve, modele } demandé depuis un dossier */
  cherche: ''
};

/* ---------- Les mesures de la page, en millimètres ----------
   Celles des fichiers de David : marges 1,27 cm, logo 6,28 × 2,5 cm,
   badge 3,57 × 0,62 cm, nom en 14 pt gras, lignes en 11 pt, corps en
   14 pt, pied en 8 pt centré. */
const CR_PT = 0.3527778;
const CR_MM = {
  largeur: 210, hauteur: 297, marge: 12.7,
  logoL: 62.8, logoH: 25.0,
  telL: 35.7, telH: 6.2, telMarge: 0.6,
  nomPt: 14, lignePt: 11, interligne: 1.2,
  corpsPt: 14, piedPt: 8, piedInterligne: 1.35,
  ecartCorps: 12, basPied: 10, ecartPied: 9
};
function crHauteurTete(e){
  const n = (e.lignes || []).length + (e.mail ? 1 : 0) + (e.web ? 1 : 0);
  return CR_MM.nomPt * CR_MM.interligne * CR_PT + n * CR_MM.lignePt * CR_MM.interligne * CR_PT + CR_MM.telH + 2 * CR_MM.telMarge;
}
function crHautCorps(e){ return CR_MM.marge + crHauteurTete(e) + CR_MM.ecartCorps; }
function crHautPied(e){
  return CR_MM.hauteur - CR_MM.basPied - (e.pied || []).length * CR_MM.piedPt * CR_MM.piedInterligne * CR_PT;
}
function crBasCorps(e){ return crHautPied(e) - CR_MM.ecartPied; }
const CR_LARGEUR_CORPS = CR_MM.largeur - 2 * CR_MM.marge;
/* 📇 v1244 — F : le destinataire, à la place de la fenêtre d'une
   enveloppe « fenêtre à droite » (11 cm du bord gauche, sous le logo). */
const CR_DEST = { x: 110, y: 47, pt: 12 };
function crLignesDest(d){ return d ? [d.nom].concat(d.lignes || []).filter(Boolean) : []; }
function crHautCorpsDe(e, dest){
  const n = crLignesDest(dest).length;
  return n ? Math.max(crHautCorps(e), CR_DEST.y + n * CR_DEST.pt * CR_MM.interligne * CR_PT + 10) : crHautCorps(e);
}

/* ---------- Les cases ---------- */
const CR_CASES = [
  ['date',         '📅', 'Date du jour (22/10/26)'],
  ['dateLongue',   '📅', 'Date du jour (22 octobre 2026)'],
  ['civilite',     '👤', 'Monsieur / Madame'],
  ['e',            '👤', '(e) — accord'],
  ['eleve',        '👤', 'Prénom Nom'],
  ['naissance',    '🎂', 'Date de naissance'],
  ['neph',         '🪪', 'NEPH'],
  ['categorie',    '🚗', 'Catégorie (B, A2…)'],
  ['formation',    '🎓', 'Formation'],
  ['inscription',  '📥', 'Date d’inscription'],
  ['examenDate',   '📅', 'Date d’examen'],
  ['examenHeure',  '🕐', 'Heure de passage'],
  ['examenCentre', '📍', 'Centre d’examen'],
  ['jours',        '📆', 'Jours et heures'],
  ['nbLecons',     '🚗', 'Nombre de leçons'],
  ['signataire',   '✍️', 'Signataire'],
  ['fonction',     '✍️', 'Sa fonction']
];
function crInfoCase(c){
  if(/^libre:/.test(c)) return ['✏️', c.slice(6)];
  const x = CR_CASES.find(k => k[0] === c);
  return x ? [x[1], x[2]] : ['❔', c];
}

/* ---------- Petits outils ---------- */
function crEl(tag, cls, texte){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(texte != null) e.textContent = texte;
  return e;
}
function crBouton(texte, cls, quoi){
  const b = crEl('button', 'btn ' + (cls || 'btn-secondary'), texte);
  b.type = 'button';
  if(quoi) b.addEventListener('click', quoi);
  return b;
}
function crPuces(choix, valeur, quoi){
  const r = crEl('div', 'crPuces');
  choix.forEach(([v, t]) => {
    const b = crEl('button', 'crPuce' + (v === valeur ? ' on' : ''), t);
    b.type = 'button';
    b.addEventListener('click', () => {
      r.querySelectorAll('.crPuce').forEach(x => x.classList.toggle('on', x === b));
      quoi(v);
    });
    r.appendChild(b);
  });
  return r;
}
function crLab(t){ return crEl('div', 'crLab', t); }
function crAide(t){ return crEl('div', 'crAide', t); }
function crEstAdmin(){ return !!(CR.d && CR.d.admin); }
function crPeutEcrire(){ return typeof niveauDroit === 'function' && niveauDroit('courriers') === 'm'; }
function crModele(id){ return ((CR.d && CR.d.modeles) || []).find(m => m.id === id) || null; }
function crEntete(k){ return (CR.d && CR.d.reglages && CR.d.reglages.entetes && CR.d.reglages.entetes[k]) || null; }
function crImage(id){ return ((CR.d && CR.d.images) || []).find(i => String(i.id) === String(id)) || null; }
/* L'image d'une pose : la bibliothèque, ou la signature de l'élève (H) */
function crImageDeLaPose(p, ed){
  if(p.img === 'eleve') return ed && ed.signatureEleve ? { donnees: ed.signatureEleve.donnees, sorte: 'eleve' } : null;
  return crImage(p.img);
}
function crSignataire(id){
  const l = (CR.d && CR.d.reglages && CR.d.reglages.signataires) || [];
  return l.find(s => s.id === id) || l[0] || { id: '', nom: '', fonction: '' };
}
const CR_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function crIso(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function crJourIso(v){
  const t = String(v || '').trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return m[1] + '-' + m[2] + '-' + m[3];
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if(m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return '';
}
function crDateCourte(iso){ const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1].slice(2) : ''; }
function crDateFr(iso){ const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function crDateLongue(iso, sansAnnee){
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return '';
  return m[3] + ' ' + CR_MOIS[+m[2] - 1] + (sansAnnee ? '' : ' ' + m[1]);
}
function crHeure(h){ const m = String(h || '').match(/^(\d{1,2})[:h](\d{2})/); return m ? m[1].padStart(2, '0') + 'h' + (m[2] === '00' ? '' : m[2]) : ''; }
function crMinutes(h){ const m = String(h || '').match(/^(\d{1,2})[:h](\d{2})/); return m ? +m[1] * 60 + +m[2] : null; }
function crHhmm(n){ return String(Math.floor(n / 60) % 24).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0'); }

/* La catégorie du permis, d'après la formation de l'appli */
function crCategorie(formation){
  const f = String(formation || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if(!f) return '';
  if(/permis be|remorque|^be\b/.test(f)) return 'BE';
  if(/\ba2\b/.test(f)) return 'A2';
  if(/\ba1\b/.test(f)) return 'A1';
  if(/\bam\b/.test(f)) return 'AM';
  if(/moto a\b|^a$|passerelle a\b/.test(f)) return 'A';
  return 'B';
}
/* « le 05 novembre 2026 de 08h à 10h et le 06 novembre de 08h à 16h » */
function crPhraseDesJours(jours){
  const l = (jours || []).filter(j => j.jour).slice().sort((a, b) => (a.jour + a.de).localeCompare(b.jour + b.de));
  if(!l.length) return '';
  let annee = '';
  const bouts = l.map(j => {
    const a = j.jour.slice(0, 4);
    const t = 'le ' + crDateLongue(j.jour, a === annee) + (j.de ? ' de ' + crHeure(j.de) : '') + (j.a ? ' à ' + crHeure(j.a) : '');
    annee = a;
    return t;
  });
  return bouts.length === 1 ? bouts[0] : bouts.slice(0, -1).join(', ') + ' et ' + bouts[bouts.length - 1];
}

/* ---------- Le tamis, côté écran ----------
   Même règle que le Worker (corpsDeCourrierPropre) : des lignes, du
   gras, de l'italique, du souligné, des cases. Rien d'autre n'entre
   dans la page, et rien d'autre n'en sort. */
function crCorpsPropre(html){
  const doc = new DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
  const sortie = document.createElement('div');
  const copier = (src, dst) => {
    src.childNodes.forEach(n => {
      if(n.nodeType === 3){ dst.appendChild(document.createTextNode(n.textContent)); return; }
      if(n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if(tag === 'br'){ dst.appendChild(document.createElement('br')); return; }
      if(tag === 'span' && n.getAttribute('data-case')){
        const c = n.getAttribute('data-case');
        if(/^(libre:[^"<>&]{1,60}|[a-zA-Z]{1,20})$/.test(c)){
          const s = document.createElement('span');
          s.setAttribute('data-case', c);
          dst.appendChild(s);
        }
        return;
      }
      if(['div', 'p', 'b', 'strong', 'i', 'em', 'u'].indexOf(tag) !== -1){
        const e = document.createElement(tag === 'p' ? 'div' : tag);
        if(tag === 'div' || tag === 'p'){
          const a = (n.style && n.style.textAlign) || n.getAttribute('align') || '';
          if(/^(left|right|center|justify)$/.test(a)) e.style.textAlign = a;
        }
        copier(n, e);
        dst.appendChild(e);
        return;
      }
      if(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template'].indexOf(tag) !== -1) return;
      copier(n, dst);    /* une balise inconnue : son texte reste */
    });
  };
  copier(doc.body.firstChild || doc.body, sortie);
  return sortie.innerHTML;
}

/* ---------- Les ressources : chargées une fois ---------- */
let crResEnCours = null;
function crChargerRessources(){
  if(CR.res) return Promise.resolve(CR.res);
  if(crResEnCours) return crResEnCours;
  crResEnCours = new Promise((ok, non) => {
    const fini = async () => {
      const r = window.EC_COURRIERS_RES;
      if(!r){ non(new Error('Ressources des courriers introuvables')); return; }
      /* La même police à l'écran que dans le PDF : sans crénage, sans
         ligatures — jsPDF n'en fait pas, l'écran n'en fera pas. */
      try{
        const b64 = s => { const t = atob(s); const o = new Uint8Array(t.length); for(let i = 0; i < t.length; i++) o[i] = t.charCodeAt(i); return o.buffer; };
        const faces = [['normal', 'normal', r.polices.normal], ['bold', 'normal', r.polices.bold],
                       ['normal', 'italic', r.polices.italic], ['bold', 'italic', r.polices.bolditalic]];
        for(const [poids, style, data] of faces){
          const f = new FontFace('CarlitoEC', b64(data), { weight: poids, style: style });
          await f.load();
          document.fonts.add(f);
        }
      }catch(e){ console.warn('Police des courriers :', e); }
      CR.res = r;
      ok(r);
    };
    if(window.EC_COURRIERS_RES){ fini(); return; }
    const s = document.createElement('script');
    const v = (typeof VERSION_MODULES !== 'undefined') ? VERSION_MODULES : Date.now();
    s.src = 'app/ec-courriers-ressources.js?v=' + v;
    s.onload = fini;
    s.onerror = () => { crResEnCours = null; non(new Error('Ressources des courriers injoignables')); };
    document.head.appendChild(s);
  });
  return crResEnCours;
}

/* ============================================================
   LA PAGE — l'en-tête, le corps, les images, le pied
   ============================================================ */
function crDessinerPage(o){
  const e = crEntete(o.entete) || crEntete('sb');
  const page = crEl('div', 'crPage');
  page.style.width = CR_MM.largeur + 'mm';
  page.style.height = CR_MM.hauteur + 'mm';

  /* L'en-tête */
  const tete = crEl('div', 'crTete');
  tete.style.cssText = 'left:' + CR_MM.marge + 'mm;top:' + CR_MM.marge + 'mm;right:' + CR_MM.marge + 'mm;';
  const logo = document.createElement('img');
  logo.className = 'crLogo';
  logo.src = CR.res ? CR.res.logo : '';
  logo.alt = '';
  logo.style.cssText = 'width:' + CR_MM.logoL + 'mm;height:' + CR_MM.logoH + 'mm;';
  tete.appendChild(logo);
  tete.appendChild(crEl('div', 'crTeteNom', e.titre));
  (e.lignes || []).forEach(l => tete.appendChild(crEl('div', 'crTeteL', l)));
  const tel = document.createElement('img');
  tel.className = 'crTel';
  tel.src = CR.res ? CR.res.tel : '';
  tel.alt = '';
  tel.style.cssText = 'width:' + CR_MM.telL + 'mm;height:' + CR_MM.telH + 'mm;margin:' + CR_MM.telMarge + 'mm 0;';
  const web = [e.mail, e.web].filter(Boolean).map(t => crEl('div', 'crTeteL' + (e.liens ? ' lien' : ''), t));
  if(e.telApres){ web.forEach(x => tete.appendChild(x)); tete.appendChild(tel); }
  else{ tete.appendChild(tel); web.forEach(x => tete.appendChild(x)); }
  page.appendChild(tete);

  /* Le corps */
  const corps = crEl('div', 'crCorps');
  /* Le destinataire (F) */
  const lignesDest = crLignesDest(o.dest);
  if(lignesDest.length){
    const dz = crEl('div', 'crDest');
    dz.style.cssText = 'left:' + CR_DEST.x + 'mm;top:' + CR_DEST.y + 'mm;width:' + (CR_MM.largeur - CR_MM.marge - CR_DEST.x) + 'mm;';
    lignesDest.forEach((l, i) => dz.appendChild(crEl('div', i === 0 ? 'nom' : '', l)));
    page.appendChild(dz);
  }
  const haut = crHautCorpsDe(e, o.dest);
  corps.style.cssText = 'left:' + CR_MM.marge + 'mm;top:' + haut + 'mm;width:' + CR_LARGEUR_CORPS + 'mm;';
  corps.innerHTML = crCorpsPropre(o.corps || '<div><br></div>');
  page.appendChild(corps);

  /* La fin de la page 1 : un trait, pour voir ce qui passera page 2 */
  const fin = crEl('div', 'crFinPage');
  fin.style.top = crBasCorps(e) + 'mm';
  page.appendChild(fin);

  /* La référence du courrier (G) */
  const ref = crEl('div', 'crRef', o.numero ? 'Réf. ' + o.numero : '');
  ref.style.cssText = 'left:' + CR_MM.marge + 'mm;top:' + (crHautPied(e) - 5.5) + 'mm;';
  page.appendChild(ref);

  /* Le pied */
  const pied = crEl('div', 'crPied');
  pied.style.top = crHautPied(e) + 'mm';
  (e.pied || []).forEach(l => pied.appendChild(crEl('div', '', l)));
  page.appendChild(pied);

  /* Les images posées */
  const poses = crEl('div', 'crPoses');
  page.appendChild(poses);
  return { page, corps, poses, fin, pied, ref, entete: e, haut: haut };
}

/* La page s'allonge quand le texte dépasse : on voit la suite, et le
   trait dit où la page 1 s'arrête. Le PDF, lui, coupe en pages. */
function crAjusterPage(v){
  if(!v || !v.page) return false;
  const e = v.entete;
  const pxMm = 3.7795275591;
  const hautCorps = v.corps.offsetHeight / pxMm;
  const bas = (v.haut || crHautCorps(e)) + hautCorps;
  const depasse = bas > crBasCorps(e) + 0.5;
  const extra = depasse ? bas - crBasCorps(e) + 4 : 0;
  v.page.style.height = (CR_MM.hauteur + extra) + 'mm';
  v.pied.style.top = (crHautPied(e) + extra) + 'mm';
  v.ref.style.top = (crHautPied(e) - 5.5 + extra) + 'mm';
  v.fin.style.display = depasse ? 'block' : 'none';
  return depasse;
}

/* Les valeurs des cases */
function crFicheDe(nom){
  if(!nom) return null;
  if(typeof ficheDe === 'function') return ficheDe(nom);
  return null;
}
function crValeurCalculee(c, ed){
  const f = crFicheDe(ed.eleve) || {};
  const sig = crSignataire(ed.signataire);
  const auj = crIso(new Date());
  switch(c){
    case 'date':        return crDateCourte(auj);
    case 'dateLongue':  return crDateLongue(auj);
    case 'civilite':    return ed.civilite === 'F' ? 'Madame' : (ed.civilite === 'M' ? 'Monsieur' : '');
    case 'e':           return ed.civilite === 'F' ? 'e' : '';
    case 'eleve':       return ed.eleve || '';
    case 'naissance':   return crDateFr(crJourIso(f.naissance));
    case 'neph':        return String(f.neph || '');
    case 'categorie':   return crCategorie(f.formation);
    case 'formation':   return String(f.formation || '');
    case 'inscription': return crDateFr(crJourIso(f.ajoute));
    case 'examenDate':  return ed.examen && ed.examen.date ? crDateLongue(ed.examen.date) : '';
    case 'examenHeure': return ed.examen && ed.examen.heure ? crHeure(ed.examen.heure) : '';
    case 'examenCentre':return ed.examen ? String(ed.examen.centre || '') : '';
    case 'jours':       return crPhraseDesJours(ed.jours);
    case 'nbLecons': {
      const b = (typeof eleveDuBureau === 'function') ? eleveDuBureau(ed.eleve) : null;
      const n = b ? Math.max(Number(b.lecons) || 0, Number(b.leconNum) || 0) : 0;
      return n ? String(n) : '';
    }
    case 'signataire':  return sig.nom || '';
    case 'fonction':    return sig.fonction || '';
  }
  return '';
}
function crValeur(c, ed){
  if(ed.cases && Object.prototype.hasOwnProperty.call(ed.cases, c)) return ed.cases[c];
  return crValeurCalculee(c, ed);
}
/* Les cases que le texte emploie, dans l'ordre */
function crCasesDuCorps(corps){
  const vues = [];
  corps.querySelectorAll('[data-case]').forEach(s => {
    const c = s.getAttribute('data-case');
    if(vues.indexOf(c) === -1) vues.push(c);
  });
  return vues;
}
/* Remplir les cases de la page (le texte autour ne bouge pas) */
function crRemplirCases(corps, ed, modeModele){
  corps.querySelectorAll('[data-case]').forEach(s => {
    const c = s.getAttribute('data-case');
    s.setAttribute('contenteditable', 'false');
    if(modeModele){
      const [ic, nom] = crInfoCase(c);
      s.className = 'crPuceCase' + (/^libre:/.test(c) ? ' libre' : '');
      s.textContent = ic + ' ' + nom;
      return;
    }
    const v = crValeur(c, ed);
    s.className = 'crVal' + (v ? '' : (c === 'e' ? ' rien' : ' vide'));
    s.textContent = v || (c === 'e' ? '' : '[' + crInfoCase(c)[1] + ']');
    s.toggleAttribute('data-vide', !v && c !== 'e');
  });
}
/* Ce qui se range : les cases redeviennent des cases vides */
function crCorpsARanger(corps){
  const c = corps.cloneNode(true);
  c.querySelectorAll('[data-case]').forEach(s => { s.textContent = ''; s.removeAttribute('class'); s.removeAttribute('contenteditable'); s.removeAttribute('data-vide'); });
  return crCorpsPropre(c.innerHTML);
}

/* ============================================================
   LES SIGNATURES ET LES TAMPONS POSÉS — librement (choix de David)
   Une image se glisse, se tire au coin pour changer de taille, se
   tourne avec ⟳, et part avec ✕. Les positions sont en millimètres
   depuis le coin de la page : celles du PDF.
   ============================================================ */
function crDessinerPoses(v, ed, quand){
  v.poses.innerHTML = '';
  (ed.poses || []).forEach((p, i) => {
    const img = crImageDeLaPose(p, ed);
    const el = crEl('div', 'crPose');
    el.style.cssText = 'left:' + p.x + 'mm;top:' + p.y + 'mm;width:' + p.w + 'mm;transform:rotate(' + (p.r || 0) + 'deg);';
    if(img){
      const im = document.createElement('img');
      im.src = img.donnees; im.alt = ''; im.draggable = false;
      el.appendChild(im);
    }else{
      /* Une image que ce compte ne reçoit pas (pas administrateur), ou
         retirée depuis : sa place, sans elle. Elle ne sortira pas. */
      el.classList.add('absente');
      el.appendChild(crEl('div', 'crPoseVide', crEstAdmin() ? '✍️ image retirée' : '✍️ signature (posée par un administrateur)'));
      el.style.height = (p.w * 0.45) + 'mm';
    }
    /* La signature de l'élève se déplace par qui écrit le courrier ;
       celles de l'école, par un administrateur. */
    if(crEstAdmin() || (p.img === 'eleve' && crPeutEcrire())){
      const barre = crEl('div', 'crPoseBarre');
      const tourne = crEl('button', '', '⟳'); tourne.type = 'button'; tourne.title = 'Tourner';
      const ote = crEl('button', '', '✕'); ote.type = 'button'; ote.title = 'Retirer de la page';
      barre.append(crEl('span', '', '⠿'), tourne, ote);
      const coin = crEl('div', 'crPoseCoin');
      el.append(barre, coin);
      ote.addEventListener('click', ev => {
        ev.stopPropagation();
        ed.poses.splice(i, 1);
        if(p.img === 'eleve') ed.signatureEleve = null;
        crDessinerPoses(v, ed, quand); if(quand) quand();
      });
      tourne.addEventListener('click', ev => {
        ev.stopPropagation();
        const r = Number(p.r || 0);
        p.r = r >= 15 ? -15 : r + 5;
        el.style.transform = 'rotate(' + p.r + 'deg)';
        if(quand) quand();
      });
      crRendreDeplacable(el, coin, p, v, quand);
    }
    v.poses.appendChild(el);
  });
}
function crEchelle(v){
  const r = v.page.getBoundingClientRect();
  return r.width / (CR_MM.largeur * 3.7795275591) || 1;
}
function crRendreDeplacable(el, coin, p, v, quand){
  const mmParPx = () => 1 / (3.7795275591 * crEchelle(v));
  const suivre = (ev, bouge) => {
    ev.preventDefault();
    const x0 = ev.clientX, y0 = ev.clientY;
    const a = { x: p.x, y: p.y, w: p.w };
    const k = mmParPx();
    const haut = Math.max(10, v.page.offsetHeight / 3.7795275591);
    const move = e2 => {
      const dx = (e2.clientX - x0) * k, dy = (e2.clientY - y0) * k;
      bouge(a, dx, dy, haut);
      el.style.left = p.x + 'mm'; el.style.top = p.y + 'mm'; el.style.width = p.w + 'mm';
    };
    const fin = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', fin);
      window.removeEventListener('pointercancel', fin);
      el.classList.remove('bouge');
      if(quand) quand();
    };
    el.classList.add('bouge');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', fin);
    window.addEventListener('pointercancel', fin);
  };
  const arrondi = n => Math.round(n * 10) / 10;
  el.addEventListener('pointerdown', ev => {
    if(ev.target === coin || ev.target.tagName === 'BUTTON') return;
    suivre(ev, (a, dx, dy, haut) => {
      p.x = arrondi(Math.max(-p.w / 2, Math.min(CR_MM.largeur - p.w / 2, a.x + dx)));
      p.y = arrondi(Math.max(0, Math.min(haut - 8, a.y + dy)));
    });
  });
  coin.addEventListener('pointerdown', ev => {
    ev.stopPropagation();
    suivre(ev, (a, dx) => { p.w = arrondi(Math.max(10, Math.min(190, a.w + dx))); });
  });
}
/* Poser une image de la bibliothèque : sous le nom du signataire */
function crPoserImage(ed, img){
  if(!ed.poses) ed.poses = [];
  if(ed.poses.length >= 8){ showToast('⚠️ Huit images au plus sur une page.'); return; }
  const e = crEntete(ed.entete) || crEntete('sb');
  const w = img.sorte === 'tampon' ? 45 : (img.sorte === 'deux' ? 70 : 50);
  ed.poses.push({ img: String(img.id), x: 20, y: Math.max(crHautCorps(e) + 40, crBasCorps(e) - 75), w: w, r: 0 });
}

/* ============================================================
   L'IMAGE DÉPOSÉE : fond blanc retiré, recadrée, encre au choix
   Tout se fait dans le navigateur ; seul le PNG final part.
   ============================================================ */
function crChargerImage(src){
  return new Promise((ok, non) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => non(new Error('Image illisible')); i.src = src; });
}
function crLireFichier(f){
  return new Promise((ok, non) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => non(new Error('Fichier illisible')); r.readAsDataURL(f); });
}
function crTraiterImage(img, o){
  const max = 1200;
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.max(1, Math.round(img.naturalWidth * k)), H = Math.max(1, Math.round(img.naturalHeight * k));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H), p = d.data;
  const seuil = 150 + Math.round((o.fond == null ? 70 : o.fond) * 1.0);   /* 150 → 250 */
  const plage = 110;
  const encre = o.encre === 'noire' ? [20, 20, 26] : (o.encre === 'bleue' ? [24, 44, 140] : null);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for(let i = 0, n = 0; i < p.length; i += 4, n++){
    const l = (p[i] + p[i + 1] + p[i + 2]) / 3;
    const a = l >= seuil ? 0 : Math.min(255, Math.round((seuil - l) * 255 / plage));
    if(encre){ p[i] = encre[0]; p[i + 1] = encre[1]; p[i + 2] = encre[2]; }
    p[i + 3] = a;
    if(a > 24){ const px = n % W, py = (n / W) | 0; if(px < x0) x0 = px; if(px > x1) x1 = px; if(py < y0) y0 = py; if(py > y1) y1 = py; }
  }
  x.putImageData(d, 0, 0);
  if(x1 < 0) return null;
  const m = 6;
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const k2 = Math.min(1, 900 / cw);
  const s = document.createElement('canvas'); s.width = Math.round(cw * k2); s.height = Math.round(ch * k2);
  s.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, s.width, s.height);
  return s.toDataURL('image/png');
}

/* ============================================================
   LE PDF — récrit ligne par ligne, avec la police de l'écran
   ============================================================ */
/* Le texte de la page en blocs (une ligne d'écran = un bloc) et en
   morceaux (gras, italique, souligné). */
function crBlocsDuCorps(corps){
  const blocs = [];
  let cur = null;
  const nouveau = align => { cur = { align: align || 'left', runs: [] }; blocs.push(cur); };
  const marcher = (noeud, st, align) => {
    noeud.childNodes.forEach(n => {
      if(n.nodeType === 3){
        const t = n.textContent.replace(/[\s ]+/g, ' ');
        if(!t) return;
        if(!cur) nouveau(align);
        cur.runs.push({ t: t, b: st.b, i: st.i, u: st.u });
        return;
      }
      if(n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if(tag === 'br'){ if(!cur) nouveau(align); cur = null; return; }
      if(n.hasAttribute('data-case')){
        if(n.hasAttribute('data-vide')) return;      /* une case vide ne s'imprime pas */
        const t = n.textContent.replace(/[\s ]+/g, ' ');
        if(!t) return;
        if(!cur) nouveau(align);
        cur.runs.push({ t: t, b: st.b, i: st.i, u: st.u });
        return;
      }
      if(tag === 'div' || tag === 'p'){
        cur = null;
        const avant = blocs.length;
        const a = (n.style && n.style.textAlign) || align;
        marcher(n, st, a);
        if(blocs.length === avant) nouveau(a);
        cur = null;
        return;
      }
      const s2 = Object.assign({}, st);
      if(tag === 'b' || tag === 'strong') s2.b = true;
      if(tag === 'i' || tag === 'em') s2.i = true;
      if(tag === 'u') s2.u = true;
      marcher(n, s2, align);
    });
  };
  marcher(corps, { b: false, i: false, u: false }, 'left');
  return blocs;
}
function crStyle(r){ return r.b && r.i ? 'bolditalic' : (r.b ? 'bold' : (r.i ? 'italic' : 'normal')); }
/* Couper un bloc en lignes, comme le navigateur : mot par mot */
function crLignesDuBloc(doc, bloc, largeur, taille){
  const mots = [];
  bloc.runs.forEach(r => {
    (r.t.match(/\s+|[^\s]+/g) || []).forEach(m => {
      doc.setFont('CarlitoEC', crStyle(r)); doc.setFontSize(taille);
      mots.push({ t: m, r: r, w: doc.getTextWidth(m), esp: /^\s+$/.test(m) });
    });
  });
  const lignes = [];
  let ligne = [], l = 0;
  const pousser = () => {
    while(ligne.length && ligne[ligne.length - 1].esp) ligne.pop();
    lignes.push(ligne); ligne = []; l = 0;
  };
  mots.forEach(m => {
    if(m.esp && !ligne.length) return;
    if(!m.esp && l + m.w > largeur + 0.01 && ligne.length){
      pousser();
    }
    if(!m.esp && m.w > largeur){
      /* Un mot plus long que la ligne : coupé lettre à lettre */
      let bout = '';
      [...m.t].forEach(ch => {
        doc.setFont('CarlitoEC', crStyle(m.r));
        const w = doc.getTextWidth(bout + ch);
        if(w > largeur && bout){ ligne.push({ t: bout, r: m.r, w: doc.getTextWidth(bout), esp: false }); pousser(); bout = ch; }
        else bout += ch;
      });
      if(bout){ const w = doc.getTextWidth(bout); ligne.push({ t: bout, r: m.r, w: w, esp: false }); l += w; }
      return;
    }
    ligne.push(m); l += m.w;
  });
  pousser();
  return lignes;
}
function crImagePivotee(src, r){
  return crChargerImage(src).then(im => {
    if(!r) return { src: src, w: im.naturalWidth, h: im.naturalHeight, wr: im.naturalWidth, hr: im.naturalHeight };
    const a = r * Math.PI / 180, W = im.naturalWidth, H = im.naturalHeight;
    const cw = Math.ceil(Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a)));
    const ch = Math.ceil(Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a)));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const x = c.getContext('2d');
    x.translate(cw / 2, ch / 2); x.rotate(a); x.drawImage(im, -W / 2, -H / 2);
    return { src: c.toDataURL('image/png'), w: W, h: H, wr: cw, hr: ch };
  });
}
/* La ligne de base comme le navigateur la place : la demi-interligne,
   puis la hauteur de montée de Carlito (1950 / 2048, descente 550). */
function crBase(y, h, taille){ return y + (h - 1.2207 * taille * CR_PT) / 2 + 0.9521 * taille * CR_PT; }
/* « doc » donné : le courrier s'ajoute à la suite (A — les
   convocations d'une session en un seul PDF à imprimer). */
async function crFabriquerPdf(v, ed, docCommun){
  const jsPDF = await chargerJsPDF();
  await crChargerRessources();
  const res = CR.res;
  const doc = docCommun || new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  if(!doc.__crPolices){
    [['normal', 'normal'], ['bold', 'bold'], ['italic', 'italic'], ['bolditalic', 'bolditalic']].forEach(([k, st]) => {
      doc.addFileToVFS('CarlitoEC-' + k + '.ttf', res.polices[k]);
      doc.addFont('CarlitoEC-' + k + '.ttf', 'CarlitoEC', st);
    });
    doc.__crPolices = true;
  }else{
    doc.addPage();
  }
  const premiere = doc.getNumberOfPages();
  const e = v.entete;
  const pt = CR_PT;
  const tete = () => {
    doc.addImage(res.logo, 'PNG', CR_MM.largeur - CR_MM.marge - CR_MM.logoL, CR_MM.marge - 0.5, CR_MM.logoL, CR_MM.logoH, 'logo', 'FAST');
    let y = CR_MM.marge;
    doc.setTextColor(0, 0, 0);
    const ligne = (t, taille, style, lien) => {
      const h = taille * CR_MM.interligne * pt;
      doc.setFont('CarlitoEC', style); doc.setFontSize(taille);
      if(lien) doc.setTextColor(5, 99, 193);
      /* La ligne de base, comme le navigateur : demi-interligne + ascendante */
      doc.text(t, CR_MM.marge, crBase(y, h, taille));
      if(lien){
        const w = doc.getTextWidth(t);
        doc.setDrawColor(5, 99, 193); doc.setLineWidth(0.18);
        doc.line(CR_MM.marge, crBase(y, h, taille) + 0.6, CR_MM.marge + w, crBase(y, h, taille) + 0.6);
        doc.setTextColor(0, 0, 0);
      }
      y += h;
    };
    const badge = () => { doc.addImage(res.tel, 'PNG', CR_MM.marge, y + CR_MM.telMarge, CR_MM.telL, CR_MM.telH, 'tel', 'FAST'); y += CR_MM.telH + 2 * CR_MM.telMarge; };
    ligne(e.titre, CR_MM.nomPt, 'bold');
    (e.lignes || []).forEach(l => ligne(l, CR_MM.lignePt, 'normal'));
    const web = () => [e.mail, e.web].filter(Boolean).forEach(t => ligne(t, CR_MM.lignePt, 'normal', e.liens));
    if(e.telApres){ web(); badge(); } else { badge(); web(); }
  };
  const pied = () => {
    let y = crHautPied(e);
    doc.setFont('CarlitoEC', 'normal'); doc.setFontSize(CR_MM.piedPt); doc.setTextColor(0, 0, 0);
    const h = CR_MM.piedPt * CR_MM.piedInterligne * pt;
    (e.pied || []).forEach(l => { doc.text(l, CR_MM.largeur / 2, crBase(y, h, CR_MM.piedPt), { align: 'center' }); y += h; });
    if(ed.numero){
      doc.setFontSize(CR_MM.piedPt); doc.setTextColor(120, 120, 120);
      doc.text('Réf. ' + ed.numero, CR_MM.marge, crBase(crHautPied(e) - 5.5, CR_MM.piedPt * CR_MM.interligne * pt, CR_MM.piedPt));
      doc.setTextColor(0, 0, 0);
    }
  };
  tete(); pied();

  /* Le destinataire (F) */
  const lignesDest = crLignesDest(ed.dest);
  if(lignesDest.length){
    const hd = CR_DEST.pt * CR_MM.interligne * pt;
    let yd = CR_DEST.y;
    lignesDest.forEach((l, i) => {
      doc.setFont('CarlitoEC', i === 0 ? 'bold' : 'normal'); doc.setFontSize(CR_DEST.pt); doc.setTextColor(0, 0, 0);
      doc.text(l, CR_DEST.x, crBase(yd, hd, CR_DEST.pt));
      yd += hd;
    });
  }

  /* Le corps */
  const taille = CR_MM.corpsPt;
  const h = taille * CR_MM.interligne * pt;
  let y = crHautCorpsDe(e, ed.dest);
  let page = 1;
  crBlocsDuCorps(v.corps).forEach(bloc => {
    const lignes = bloc.runs.length ? crLignesDuBloc(doc, bloc, CR_LARGEUR_CORPS, taille) : [[]];
    lignes.forEach((ligne, li) => {
      if(y + h > crBasCorps(e) + 0.2){
        doc.addPage(); page++; tete(); pied();
        y = crHautCorps(e);
      }
      const total = ligne.reduce((s, m) => s + m.w, 0);
      const derniere = li === lignes.length - 1;
      let x = CR_MM.marge, ajout = 0;
      if(bloc.align === 'right') x += CR_LARGEUR_CORPS - total;
      else if(bloc.align === 'center') x += (CR_LARGEUR_CORPS - total) / 2;
      else if(bloc.align === 'justify' && !derniere){
        const esp = ligne.filter(m => m.esp).length;
        if(esp) ajout = (CR_LARGEUR_CORPS - total) / esp;
      }
      const base = crBase(y, h, taille);
      ligne.forEach(m => {
        const w = m.w + (m.esp ? ajout : 0);
        if(!m.esp){
          doc.setFont('CarlitoEC', crStyle(m.r)); doc.setFontSize(taille);
          doc.text(m.t, x, base);
        }
        if(m.r.u){ doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.25); doc.line(x, base + 0.9, x + w, base + 0.9); }
        x += w;
      });
      y += h;
    });
  });

  /* Les images, à leur place sur la page 1 du courrier */
  doc.setPage(premiere);
  for(const p of (ed.poses || [])){
    const img = crImageDeLaPose(p, ed);
    if(!img) continue;
    const t = await crImagePivotee(img.donnees, Number(p.r) || 0);
    const hNat = p.w * t.h / t.w;
    const cx = p.x + p.w / 2, cy = p.y + hNat / 2;
    const wr = p.w * t.wr / t.w, hr = p.w * t.hr / t.w;
    doc.addImage(t.src, 'PNG', cx - wr / 2, cy - hr / 2, wr, hr, undefined, 'FAST');
  }
  doc.setProperties({ title: (ed.titre || 'Courrier') + (ed.eleve ? ' — ' + ed.eleve : ''), creator: 'Évolution Conduites' });
  return doc;
}
function crNomDuPdf(ed){
  return ((ed.titre || 'Courrier') + (ed.eleve ? ' - ' + ed.eleve : '') + (ed.numero ? ' - ' + ed.numero : ''))
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ._()-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) + '.pdf';
}
function crTelecharger(b64, nom){
  const bin = atob(b64); const o = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([o], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function crImprimer(b64){
  const bin = atob(b64); const o = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([o], { type: 'application/pdf' }));
  /* Un PDF s'imprime depuis un cadre caché sur ordinateur ; sur une
     tablette, il s'ouvre et on imprime depuis la visionneuse. */
  const tactile = /Android|iPhone|iPad/i.test(navigator.userAgent || '');
  if(tactile){ window.open(url, '_blank'); return; }
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
  f.src = url;
  f.onload = () => { try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){ window.open(url, '_blank'); } };
  document.body.appendChild(f);
  setTimeout(() => { f.remove(); URL.revokeObjectURL(url); }, 120000);
}

/* ============================================================
   L'ÉCRAN — ✉️ Courriers (Outils › Ce qu'on écrit)
   ============================================================ */
async function afficherCourriers(){
  const z = $('courriersZone');
  if(!z) return;
  if(!CR.ed) z.innerHTML = '<div class="empty">Chargement…</div>';
  try{
    const [d, f] = await Promise.all([
      appelPrep({ action: 'courriersLire' }),
      appelPrep({ action: 'courriersFaits', limite: 40 }),
      crChargerRessources(),
      (typeof fichesEleves !== 'undefined' && !fichesEleves.length && typeof chargerFiches === 'function') ? chargerFiches() : null,
      crChargerContacts()
    ]);
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'lecture impossible');
    CR.d = d;
    CR.faits = (f && f.courriers) || [];
  }catch(e){
    z.innerHTML = '';
    z.appendChild(crEl('div', 'empty', '⚠️ ' + ((e && e.message) || e)));
    return;
  }
  /* Un dossier a demandé un courrier pour son élève */
  if(CR.aOuvrir){
    const o = CR.aOuvrir; CR.aOuvrir = null;
    if(o.fait) return crRouvrirFait(o.fait);
    if(o.modele) return crEcrire(o.modele, o.eleve || '', o.cases ? { casesDepart: o.cases } : null);
    /* Depuis un dossier : on choisit le modèle, l'élève est déjà là */
    CR.pourEleve = o.eleve || '';
    return crAccueil();
  }
  if(CR.ed) return;           /* un courrier ouvert reste ouvert */
  crAccueil();
}

function crAccueil(){
  CR.ed = null;
  const z = $('courriersZone');
  if(!z) return;
  z.innerHTML = '';
  z.appendChild(crEl('div', 'crIntro', 'Les courriers sur papier à en-tête de l’école : on choisit un modèle, l’élève si besoin, et l’appli remplit ce qu’elle sait. On relit sur la vraie page, on pose la signature et le tampon, puis 📄 PDF, 🖨️ impression ou ✉️ mail. À ne pas confondre avec « Modèles messages », qui sont des textes sans en-tête.'));

  const barre = crEl('div', 'crBarre');
  const cherche = document.createElement('input');
  cherche.type = 'search';
  cherche.placeholder = '🔎 Chercher un modèle, un élève, un numéro de courrier…';
  cherche.value = CR.cherche;
  barre.appendChild(cherche);
  if(crPeutEcrire()) barre.appendChild(crBouton('📇 Carnet d’adresses', '', crFenetreCarnet));
  if(crEstAdmin()){
    barre.appendChild(crBouton('➕ Nouveau modèle', 'btn-primary', () => crEditerModele(null)));
    barre.appendChild(crBouton('✍️ Signatures et tampons', '', crFenetreImages));
    barre.appendChild(crBouton('🏢 En-têtes et signataires', '', crFenetreEntetes));
  }
  z.appendChild(barre);
  if(CR.pourEleve){
    const pour = crEl('div', 'crPour');
    pour.append(crEl('span', '', '👤 Pour '), crEl('b', '', CR.pourEleve), crEl('span', '', ' — choisis le courrier.'));
    const x = crEl('button', 'crMini', '✕'); x.type = 'button'; x.title = 'Sans élève';
    x.addEventListener('click', () => { CR.pourEleve = ''; pour.remove(); });
    pour.appendChild(x);
    z.appendChild(pour);
  }

  const grille = crEl('div', 'crGrille');
  const liste = crEl('div', '');
  z.append(crEl('div', 'crSt', '✏️ Écrire un courrier'), grille, crEl('div', 'crSt', '🗂️ Derniers courriers'), liste);

  const dessiner = () => {
    const q = (typeof normaliserMot === 'function' ? normaliserMot(cherche.value) : cherche.value.toLowerCase()).trim();
    grille.innerHTML = '';
    (CR.d.modeles || []).filter(m => !q || (typeof normaliserMot === 'function' ? normaliserMot(m.nom + ' ' + m.aide) : (m.nom + ' ' + m.aide).toLowerCase()).indexOf(q) !== -1)
      .forEach(m => {
        const c = crEl('div', 'crModele');
        c.setAttribute('role', 'button'); c.tabIndex = 0;
        const ic = crEl('span', 'crModeleIc', m.icone || '📄');
        const t = crEl('div', '');
        t.append(crEl('b', '', m.nom), crEl('small', '', m.aide || ''));
        const tags = crEl('div', 'crTags');
        if(m.eleve === 'obligatoire') tags.appendChild(crEl('span', 'crTag', '👤 lié à un élève'));
        if(m.qui === 'admins') tags.appendChild(crEl('span', 'crTag gris', '👑 admins'));
        if((m.poses || []).length) tags.appendChild(crEl('span', 'crTag gris', '✍️ signé'));
        if(tags.childNodes.length) t.appendChild(tags);
        c.append(ic, t);
        if(crPeutEcrire()){
          c.addEventListener('click', () => crEcrire(m.id, CR.pourEleve || ''));
          c.addEventListener('keydown', ev => { if(ev.key === 'Enter') crEcrire(m.id, CR.pourEleve || ''); });
        }
        if(crEstAdmin()){
          const ed = crEl('button', 'crModeleEd', '✏️'); ed.type = 'button'; ed.title = 'Modifier le modèle';
          ed.addEventListener('click', ev => { ev.stopPropagation(); crEditerModele(m.id); });
          c.appendChild(ed);
        }
        grille.appendChild(c);
      });
    if(crEstAdmin() && !q){
      const a = crEl('div', 'crModele ajout');
      a.append(crEl('span', 'crModeleIc', '➕'), (() => { const t = crEl('div', ''); t.append(crEl('b', '', 'Nouveau modèle'), crEl('small', '', 'Un titre, un texte, des cases à remplir.')); return t; })());
      a.addEventListener('click', () => crEditerModele(null));
      grille.appendChild(a);
    }
    crDessinerFaits(liste, q ? CR.faits.filter(x => (typeof normaliserMot === 'function' ? normaliserMot([x.numero, x.titre, x.eleve, x.par].join(' ')) : '').indexOf(q) !== -1) : CR.faits, true);
  };
  let minuteur = null;
  cherche.addEventListener('input', () => {
    CR.cherche = cherche.value;
    clearTimeout(minuteur);
    minuteur = setTimeout(async () => {
      dessiner();
      /* Au-delà des 40 derniers : on demande au Worker */
      if(cherche.value.trim().length >= 3){
        try{
          const r = await appelPrep({ action: 'courriersFaits', cherche: cherche.value.trim(), limite: 60 });
          if(r && r.courriers && CR.cherche === cherche.value) crDessinerFaits(liste, r.courriers, true);
        }catch(e){}
      }
    }, 250);
  });
  dessiner();
}

/* La liste des courriers faits (l'écran et le dossier de l'élève) */
function crEtatDuFait(x){
  const dernier = (x.envois || [])[x.envois.length - 1];
  if(x.statut === 'brouillon') return '💾 brouillon';
  if(x.statut === 'envoye'){
    const m = (x.envois || []).filter(e => e.comment === 'mail').pop();
    return '✉️ ' + ((m && m.a) || 'envoyé');
  }
  if(x.statut === 'imprime') return '🖨️ imprimé';
  return dernier ? '📄 PDF' : '';
}
function crDessinerFaits(zone, liste, avecEleve){
  zone.innerHTML = '';
  if(!liste.length){ zone.appendChild(crEl('div', 'empty', 'Aucun courrier pour le moment.')); return; }
  const t = crEl('table', 'crTable');
  const tete = crEl('tr', '');
  ['Le', 'N°', 'Courrier'].concat(avecEleve ? ['Élève'] : []).concat(['Par', 'Fait', '']).forEach(h => tete.appendChild(crEl('th', '', h)));
  t.appendChild(tete);
  liste.forEach(x => {
    const l = crEl('tr', '');
    l.appendChild(crEl('td', 'crNowrap', String(x.majLe || '').slice(0, 16)));
    l.appendChild(crEl('td', 'crNowrap crDoux', x.numero || '—'));
    l.appendChild(crEl('td', '', x.titre || ''));
    if(avecEleve) l.appendChild(crEl('td', '', x.eleve || '—'));
    l.appendChild(crEl('td', '', x.par || ''));
    l.appendChild(crEl('td', 'crDoux', crEtatDuFait(x)));
    const a = crEl('td', 'crNowrap crActions');
    const ouvrir = crEl('button', '', '👁️'); ouvrir.type = 'button'; ouvrir.title = 'Rouvrir';
    ouvrir.addEventListener('click', () => crOuvrirDepuisListe(x.id));
    a.appendChild(ouvrir);
    if(x.pdf){
      const p = crEl('button', '', '📄'); p.type = 'button'; p.title = 'Le PDF';
      p.addEventListener('click', async () => {
        try{
          const r = await appelPrep({ action: 'courrierPdf', id: x.id });
          if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'PDF introuvable');
          crTelecharger(r.pdf, crNomDuPdf({ titre: r.titre, eleve: r.eleve, numero: r.numero }));
        }catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); }
      });
      a.appendChild(p);
    }
    if(crEstAdmin()){
      const s = crEl('button', '', '🗑️'); s.type = 'button'; s.title = 'Supprimer';
      s.addEventListener('click', async () => {
        if(!await confirmer('Supprimer le courrier ' + (x.numero || '') + ' « ' + x.titre + ' » ' + (x.eleve ? '(' + x.eleve + ')' : '') + ' et son PDF ?', 'Supprimer un courrier', true)) return;
        try{
          await appelPrep({ action: 'courrierRetirer', id: x.id });
          CR.faits = CR.faits.filter(y => y.id !== x.id);
          l.remove();
          showToast('🗑️ Courrier supprimé');
        }catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); }
      });
      a.appendChild(s);
    }
    l.appendChild(a);
    t.appendChild(l);
  });
  const enveloppe = crEl('div', 'crTableEnv');
  enveloppe.appendChild(t);
  zone.appendChild(enveloppe);
}
function crOuvrirDepuisListe(id){
  const vue = document.querySelector('.card[data-vue="courriers"]');
  if(vue && vue.offsetParent && CR.d) return crRouvrirFait(id);
  ouvrirCourriersPour({ fait: id });
}
async function crRouvrirFait(id){
  try{
    const r = await appelPrep({ action: 'courrierOuvrir', id: id });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Courrier introuvable');
    const x = r.courrier, d = x.donnees || {};
    crEcrire(x.modele, x.eleve, { id: x.id, numero: x.numero, corps: d.corps, cases: d.cases || {}, jours: d.jours || [],
      entete: d.entete || x.entete, signataire: d.signataire, poses: d.poses || [], civilite: d.civilite || '', titre: x.titre, dest: d.dest || null, signatureEleve: d.signatureEleve || null });
  }catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); }
}

/* Depuis un dossier d'élève (D), ou un autre écran */
function ouvrirCourriersPour(o){
  CR.aOuvrir = o || null;
  CR.ed = null;
  if(typeof afficherOnglet === 'function') afficherOnglet('outils');
  if(typeof afficherVue === 'function') afficherVue('outils', 'courriers');
}

/* ============================================================
   ✏️ ÉCRIRE UN COURRIER
   ============================================================ */
/* L'en-tête de l'élève : l'agence de ses cours Drivup (le mois passé
   et le mois à venir), sinon le centre de son examen, sinon
   Saint-Brieuc. */
const crAgences = {};
async function crEnteteDeLEleve(nom, ed){
  const cle = typeof normaliserMot === 'function' ? normaliserMot(nom) : String(nom).toLowerCase();
  if(crAgences[cle]) return crAgences[cle];
  let lo = 0, sb = 0;
  try{
    if(typeof aDroit === 'function' && aDroit('rappels')){
      const a = new Date(), b = new Date(); a.setDate(a.getDate() - 31); b.setDate(b.getDate() + 31);
      const r = await appelPrep({ action: 'drivupPlanning', du: crIso(a), au: crIso(b) });
      ((r && r.cours) || []).forEach(c => {
        if((typeof normaliserMot === 'function' ? normaliserMot(c.eleve || '') : '') !== cle) return;
        if(/loud/i.test(c.agence || '')) lo++; else if(c.agence) sb++;
      });
    }
  }catch(e){}
  let k = lo > sb ? 'lo' : (sb ? 'sb' : '');
  if(!k) k = (ed && ed.examen && /loud/i.test(ed.examen.centre || '')) ? 'lo' : 'sb';
  crAgences[cle] = k;
  return k;
}
/* La date d'examen, et les jours à reprendre (convocation) */
async function crPreparerExamen(ed){
  ed.examen = null;
  if(!ed.eleve) return;
  try{
    if(typeof sessionsPermis !== 'undefined' && !(sessionsPermis || []).length && typeof chargerSessionsPermis === 'function'){
      await chargerSessionsPermis().catch(() => null);
    }
  }catch(e){}
  const t = (typeof sessionDeLEleve === 'function') ? sessionDeLEleve(ed.eleve) : null;
  if(!t || !t.session || !t.session.date) return;
  const s = t.session;
  ed.examen = { date: s.date, heure: (t.place && t.place.heure) || s.heureDebut || '', centre: s.centre || '', debut: s.heureDebut || '' };
  /* Les jours : l'examen (de l'heure de la session à la fin de la
     journée d'examen), et ses cours des quatre jours d'avant. */
  if(ed.joursRepris) return;
  const jours = [];
  try{
    if(typeof aDroit === 'function' && aDroit('rappels')){
      const d0 = new Date(s.date + 'T12:00:00'); const d1 = new Date(d0); d0.setDate(d0.getDate() - 4); d1.setDate(d1.getDate() - 1);
      const r = await appelPrep({ action: 'drivupPlanning', du: crIso(d0), au: crIso(d1) });
      const cle = typeof normaliserMot === 'function' ? normaliserMot(ed.eleve) : ed.eleve.toLowerCase();
      ((r && r.cours) || []).filter(c => (typeof normaliserMot === 'function' ? normaliserMot(c.eleve || '') : '') === cle && !c.examen)
        .forEach(c => jours.push({ jour: c.jour, de: c.debut || '', a: c.fin || '', quoi: 'leçon' }));
    }
  }catch(e){}
  const heures = (s.eleves || []).map(p => crMinutes(p.heure)).filter(n => n !== null);
  const debut = crMinutes(s.heureDebut) !== null ? crMinutes(s.heureDebut) : (heures.length ? Math.min(...heures) : null);
  const duree = (typeof dureeSession === 'function') ? dureeSession(s) : 30;
  const fin = heures.length ? Math.ceil((Math.max(...heures) + duree) / 60) * 60 : (debut !== null ? debut + 480 : null);
  jours.push({ jour: s.date, de: debut !== null ? crHhmm(debut) : '', a: fin !== null ? crHhmm(Math.max(fin, (debut || 0) + 60)) : '', quoi: 'examen' });
  ed.jours = jours;
  ed.joursRepris = true;
}

async function crEcrire(modeleId, eleve, reprise){
  const z = $('courriersZone');
  if(!z || !CR.d) return;
  const m = crModele(modeleId) || crModele('vierge') || (CR.d.modeles || [])[0];
  if(!m){ showToast('⚠️ Aucun modèle de courrier.'); return; }
  const r = reprise || {};
  const ed = CR.ed = {
    sorte: 'courrier', id: r.id || '', numero: r.numero || '', modele: m.id, titre: r.titre || m.nom,
    eleve: eleve || '', entete: r.entete || (m.entete !== 'auto' ? m.entete : 'sb'),
    signataire: r.signataire || m.signataire || '', cases: Object.assign({}, r.cases || {}),
    jours: (r.jours || []).slice(), joursRepris: !!(r.jours && r.jours.length), poses: JSON.parse(JSON.stringify(r.poses || m.poses || [])),
    civilite: r.civilite || '', examen: null, corps: r.corps || m.corps, modifie: false,
    dest: r.dest || null, signatureEleve: r.signatureEleve || null
  };
  if(r.casesDepart) Object.assign(ed.cases, r.casesDepart);
  if(!ed.civilite && ed.eleve){ const f = crFicheDe(ed.eleve); if(f && (f.genre === 'F' || f.genre === 'M')) ed.civilite = f.genre; }
  const vraieReprise = !!(reprise && (reprise.id || reprise.corps));
  if(!vraieReprise && ed.eleve) await crPreparerExamen(ed);
  else if(ed.eleve) await crPreparerExamen(Object.assign(ed, { joursRepris: true }));
  if(!r.entete && m.entete === 'auto' && ed.eleve) ed.entete = await crEnteteDeLEleve(ed.eleve, ed);
  crDessinerEcriture();
}

function crDessinerEcriture(){
  const z = $('courriersZone');
  const ed = CR.ed;
  const m = crModele(ed.modele) || { nom: ed.titre, eleve: 'facultatif', mail: {} };
  z.innerHTML = '';
  const retour = crEl('button', 'crRetour', '← Les courriers'); retour.type = 'button';
  retour.addEventListener('click', async () => {
    if(ed.modifie && !ed.id && !await confirmer('Quitter ce courrier sans le garder ?', 'Courrier', false)) return;
    CR.pourEleve = '';
    crAccueil();
  });
  z.appendChild(retour);
  z.appendChild(crEl('h3', 'crTitre', (m.icone || '📄') + ' ' + ed.titre + (ed.numero ? ' · ' + ed.numero : '')));

  const deux = crEl('div', 'crDeux');
  const gauche = crEl('div', 'crForm');
  const droite = crEl('div', 'crApercu');
  deux.append(gauche, droite);
  z.appendChild(deux);

  /* La page, à droite */
  const cadre = crEl('div', 'crCadrePage');
  const v = crDessinerPage({ entete: ed.entete, corps: ed.corps, numero: ed.numero, dest: ed.dest });
  v.corps.setAttribute('contenteditable', 'true');
  v.corps.spellcheck = true;
  cadre.appendChild(v.page);
  droite.appendChild(cadre);
  ed.v = v;
  const alerte = crEl('div', 'crAlerte');
  const majPage = () => {
    crRemplirCases(v.corps, ed, false);
    const depasse = crAjusterPage(v);
    crMettreALEchelle(cadre, v);
    const vides = [...v.corps.querySelectorAll('[data-vide]')].map(s => crInfoCase(s.getAttribute('data-case'))[1]);
    alerte.innerHTML = '';
    if(vides.length) alerte.appendChild(crEl('div', 'crAvert', '⚠️ À remplir : ' + [...new Set(vides)].join(', ') + ' (une case vide ne s’imprime pas).'));
    if(depasse) alerte.appendChild(crEl('div', 'crAvert doux', '⤵ Le texte dépasse le trait : la fin passera sur une 2ᵉ page.'));
  };
  v.corps.addEventListener('input', () => { ed.modifie = true; crAjusterPage(v); crMettreALEchelle(cadre, v); });
  /* Toucher une case sur la page mène à sa case du formulaire */
  v.corps.addEventListener('click', ev => {
    const s = ev.target.closest && ev.target.closest('[data-case]');
    if(!s) return;
    const c = s.getAttribute('data-case');
    const champ = gauche.querySelector('[data-pour="' + CSS.escape(c === 'e' ? 'civilite' : c) + '"]');
    if(champ){ champ.scrollIntoView({ block: 'center', behavior: 'smooth' }); const i = champ.querySelector('input,select,button'); if(i) i.focus(); }
  });

  /* Le formulaire, à gauche */
  gauche.appendChild(crLab('Modèle'));
  const selM = document.createElement('select');
  (CR.d.modeles || []).forEach(x => { const o = document.createElement('option'); o.value = x.id; o.textContent = (x.icone || '') + ' ' + x.nom; if(x.id === ed.modele) o.selected = true; selM.appendChild(o); });
  selM.addEventListener('change', async () => {
    if(ed.modifie && !await confirmer('Changer de modèle remplace le texte de la page. Continuer ?', 'Modèle', false)){ selM.value = ed.modele; return; }
    crEcrire(selM.value, ed.eleve);
  });
  gauche.appendChild(selM);

  if(m.eleve !== 'jamais'){
    gauche.appendChild(crLab('Élève' + (m.eleve === 'obligatoire' ? '' : ' (facultatif)')));
    const inp = document.createElement('input');
    inp.type = 'text'; inp.value = ed.eleve; inp.placeholder = '🔎 Nom de l’élève…';
    inp.setAttribute('list', 'crListeEleves');
    let dl = $('crListeEleves');
    if(!dl){ dl = document.createElement('datalist'); dl.id = 'crListeEleves'; document.body.appendChild(dl); }
    dl.innerHTML = '';
    ((typeof fichesEleves !== 'undefined' && fichesEleves) || []).slice(0, 3000).forEach(f => { const o = document.createElement('option'); o.value = f.eleve; dl.appendChild(o); });
    inp.addEventListener('change', async () => {
      const nom = inp.value.trim();
      const f = nom ? crFicheDe(nom) : null;
      ed.eleve = f ? f.eleve : nom;
      inp.value = ed.eleve;
      /* Un autre élève : ce que l'appli sait se recalcule ; ce que tu as
         tapé dans les cases libres reste. */
      Object.keys(ed.cases).forEach(k => { if(!/^libre:/.test(k)) delete ed.cases[k]; });
      ed.civilite = f && (f.genre === 'F' || f.genre === 'M') ? f.genre : '';
      ed.joursRepris = false; ed.jours = [];
      await crPreparerExamen(ed);
      if(m.entete === 'auto' && ed.eleve) ed.entete = await crEnteteDeLEleve(ed.eleve, ed);
      ed.corps = crCorpsARanger(v.corps);
      crDessinerEcriture();
    });
    gauche.appendChild(inp);
    const f = crFicheDe(ed.eleve);
    if(ed.eleve && !f) gauche.appendChild(crAide('⚠️ Cet élève n’est pas dans le répertoire : ce que l’appli sait de lui ne peut pas être repris.'));
    else if(f) gauche.appendChild(crAide([f.formation, ed.examen ? 'examen le ' + crDateFr(ed.examen.date) + (ed.examen.centre ? ' à ' + ed.examen.centre : '') : ''].filter(Boolean).join(' · ')));
  }

  gauche.appendChild(crLab('En-tête'));
  gauche.appendChild(crPuces([['sb', '📍 Saint-Brieuc'], ['lo', '📍 Loudéac']], ed.entete, k => {
    ed.entete = k; ed.corps = crCorpsARanger(v.corps); crDessinerEcriture();
  }));
  if(m.entete === 'auto') gauche.appendChild(crAide('Choisi d’office selon l’agence de l’élève.'));

  const cases = crCasesDuCorps(v.corps);
  if(cases.indexOf('civilite') !== -1 || cases.indexOf('e') !== -1){
    const b = crEl('div', ''); b.setAttribute('data-pour', 'civilite');
    b.appendChild(crLab('Civilité'));
    b.appendChild(crPuces([['M', 'Monsieur'], ['F', 'Madame']], ed.civilite, k => { ed.civilite = k; majPage(); }));
    if(cases.indexOf('e') !== -1) b.appendChild(crAide('« convoqué / convoquée », « né / née » suivent.'));
    gauche.appendChild(b);
  }
  if(cases.indexOf('jours') !== -1){
    const b = crEl('div', ''); b.setAttribute('data-pour', 'jours');
    b.appendChild(crLab('Jours et heures'));
    const lj = crEl('div', 'crJours');
    const dessinerJours = () => {
      lj.innerHTML = '';
      ed.jours.forEach((j, i) => {
        const r = crEl('div', 'crJour');
        const dj = document.createElement('input'); dj.type = 'date'; dj.value = j.jour;
        const de = document.createElement('input'); de.type = 'time'; de.value = j.de;
        const a = document.createElement('input'); a.type = 'time'; a.value = j.a;
        const x = crEl('button', 'crMini', '✕'); x.type = 'button'; x.title = 'Retirer ce jour';
        dj.addEventListener('change', () => { j.jour = dj.value; majPage(); });
        de.addEventListener('change', () => { j.de = de.value; majPage(); });
        a.addEventListener('change', () => { j.a = a.value; majPage(); });
        x.addEventListener('click', () => { ed.jours.splice(i, 1); dessinerJours(); majPage(); });
        r.append(dj, crEl('span', '', 'de'), de, crEl('span', '', 'à'), a, x);
        if(j.quoi) r.appendChild(crEl('span', 'crDoux', j.quoi));
        lj.appendChild(r);
      });
    };
    dessinerJours();
    const plus = crEl('button', 'crLien', '➕ Ajouter un jour'); plus.type = 'button';
    plus.addEventListener('click', () => { ed.jours.push({ jour: '', de: '08:00', a: '10:00', quoi: '' }); dessinerJours(); majPage(); });
    b.append(lj, plus);
    if(ed.examen) b.appendChild(crAide('Repris de 🎓 Suivi permis (examen) et du planning Drivup (ses cours des 4 jours d’avant). À vérifier.'));
    gauche.appendChild(b);
  }
  const autres = cases.filter(c => ['civilite', 'e', 'jours', 'signataire', 'fonction'].indexOf(c) === -1);
  if(autres.length){
    gauche.appendChild(crLab('Les cases du modèle'));
    autres.forEach(c => {
      const b = crEl('div', 'crCase'); b.setAttribute('data-pour', c);
      const [ic, nom] = crInfoCase(c);
      b.appendChild(crEl('label', '', ic + ' ' + nom));
      const i = document.createElement('input'); i.type = 'text';
      i.value = crValeur(c, ed);
      i.placeholder = /^libre:/.test(c) ? 'à taper' : 'l’appli ne le sait pas : à taper';
      i.addEventListener('input', () => { ed.cases[c] = i.value; majPage(); });
      b.appendChild(i);
      gauche.appendChild(b);
    });
  }
  if(cases.indexOf('signataire') !== -1 || cases.indexOf('fonction') !== -1){
    const b = crEl('div', ''); b.setAttribute('data-pour', 'signataire');
    b.appendChild(crLab('Signé par'));
    const s = document.createElement('select');
    ((CR.d.reglages && CR.d.reglages.signataires) || []).forEach(x => { const o = document.createElement('option'); o.value = x.id; o.textContent = x.nom + ' — ' + x.fonction; if(x.id === crSignataire(ed.signataire).id) o.selected = true; s.appendChild(o); });
    s.addEventListener('change', () => { ed.signataire = s.value; delete ed.cases.signataire; delete ed.cases.fonction; majPage(); });
    b.appendChild(s);
    gauche.appendChild(b);
  }

  /* 📮 Le destinataire (F) */
  gauche.appendChild(crLab('Destinataire sur la page'));
  const selD = document.createElement('select');
  const optD = (v2, t2) => { const o = document.createElement('option'); o.value = v2; o.textContent = t2; selD.appendChild(o); return o; };
  optD('', '— aucun (pas d’adresse sur la page) —');
  (CR.contacts || []).forEach(c => optD('c' + c.id, '📇 ' + c.nom));
  optD('libre', '✏️ L’écrire pour ce courrier…');
  optD('nouveau', '➕ Nouvelle adresse dans le carnet…');
  selD.value = ed.dest ? (ed.dest.contact && (CR.contacts || []).some(c => c.id === ed.dest.contact) ? 'c' + ed.dest.contact : 'libre') : '';
  gauche.appendChild(selD);
  const zoneLibre = document.createElement('textarea');
  zoneLibre.rows = 4; zoneLibre.placeholder = 'Nom\nAdresse\nCode postal et ville';
  zoneLibre.value = ed.dest && selD.value === 'libre' ? crLignesDest(ed.dest).join('\n') : '';
  zoneLibre.style.display = selD.value === 'libre' ? '' : 'none';
  zoneLibre.style.marginTop = '6px';
  gauche.appendChild(zoneLibre);
  const redessinerDest = () => { ed.corps = crCorpsARanger(v.corps); ed.modifie = true; crDessinerEcriture(); };
  zoneLibre.addEventListener('change', () => {
    const l = zoneLibre.value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 7);
    ed.dest = l.length ? { nom: l[0], lignes: l.slice(1), mail: '' } : null;
    redessinerDest();
  });
  selD.addEventListener('change', async () => {
    const val = selD.value;
    if(val === 'libre'){ zoneLibre.style.display = ''; zoneLibre.focus(); return; }
    if(val === 'nouveau'){
      const c = await crFenetreContact(null);
      if(c){ ed.dest = { nom: c.nom, lignes: c.lignes, mail: c.mail, contact: c.id }; }
      redessinerDest();
      return;
    }
    if(!val){ ed.dest = null; redessinerDest(); return; }
    const c = (CR.contacts || []).find(x => 'c' + x.id === val);
    ed.dest = c ? { nom: c.nom, lignes: c.lignes, mail: c.mail, contact: c.id } : null;
    redessinerDest();
  });
  gauche.appendChild(crAide('Placé pour une enveloppe à fenêtre à droite. Son mail, s’il en a un, est proposé à l’envoi.'));

  /* Signatures et tampons */
  gauche.appendChild(crLab('Signature et tampon'));
  if(crEstAdmin()){
    const r = crEl('div', 'crPuces');
    (CR.d.images || []).forEach(img => {
      const b = crEl('button', 'crPuce', (img.sorte === 'tampon' ? '🔵 ' : (img.sorte === 'deux' ? '✍️🔵 ' : '✍️ ')) + img.nom); b.type = 'button';
      b.addEventListener('click', () => { crPoserImage(ed, img); ed.modifie = true; crDessinerPoses(v, ed, () => { ed.modifie = true; }); });
      r.appendChild(b);
    });
    const plus = crEl('button', 'crPuce', '➕'); plus.type = 'button'; plus.title = 'Ajouter une signature ou un tampon';
    plus.addEventListener('click', crFenetreImages);
    r.appendChild(plus);
    gauche.appendChild(r);
    gauche.appendChild(crAide((CR.d.images || []).length ? 'Touche une image pour la poser sur la page, puis glisse-la où tu veux ; le coin change sa taille, ⟳ la tourne.' : 'Aucune image pour le moment : ➕ pour déposer une signature ou un tampon.'));
  }else{
    gauche.appendChild(crAide('La signature et le tampon se posent par un administrateur.'));
  }

  /* ✍️ H — la signature de l'élève, au doigt sur la tablette */
  if(ed.eleve && crPeutEcrire()){
    gauche.appendChild(crLab('Signature de l’élève'));
    const bs = crBouton(ed.signatureEleve ? '✍️ Refaire signer ' + ed.eleve : '✍️ Faire signer ' + ed.eleve, '', async () => {
      const png = await crPadDeSignature(ed.eleve);
      if(!png) return;
      ed.signatureEleve = { donnees: png, quand: new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) };
      const e2 = crEntete(ed.entete) || crEntete('sb');
      const deja = (ed.poses || []).find(p => p.img === 'eleve');
      if(!deja) ed.poses.push({ img: 'eleve', x: 120, y: Math.max(crHautCorps(e2) + 40, crBasCorps(e2) - 55), w: 55, r: 0 });
      ed.modifie = true;
      ed.corps = crCorpsARanger(v.corps);
      crDessinerEcriture();
    });
    bs.style.cssText = 'width:auto;margin:0;';
    gauche.appendChild(bs);
    gauche.appendChild(crAide(ed.signatureEleve ? 'Signé le ' + ed.signatureEleve.quand + '. Elle se glisse sur la page comme les autres, et ne sert qu’à ce courrier.'
                                                : 'Il signe au doigt sur l’écran ; sa signature se pose sur la page, et ne sert qu’à ce courrier.'));
  }

  /* Ce qu'on en fait */
  const act = crEl('div', 'crActions2');
  act.append(
    crBouton('✉️ Envoyer par mail', 'btn-primary', () => crFenetreMail()),
    crBouton('📄 PDF', '', () => crFinir('pdf')),
    crBouton('🖨️ Imprimer', '', () => crFinir('impression')),
    crBouton('💾 Brouillon', '', () => crGarder(false))
  );
  if(!crPeutEcrire()) act.querySelectorAll('button').forEach(b => { b.disabled = true; });
  gauche.append(alerte, act);

  crDessinerPoses(v, ed, () => { ed.modifie = true; });
  majPage();
  /* Les images de la page s'ajustent quand la police est prête */
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => { crAjusterPage(v); crMettreALEchelle(cadre, v); });
}
/* La page tient dans sa colonne : on la réduit, sans la redessiner */
function crMettreALEchelle(cadre, v){
  const l = cadre.clientWidth || 600;
  const pagePx = CR_MM.largeur * 3.7795275591;
  const k = Math.min(1, (l - 4) / pagePx);
  v.page.style.transform = 'scale(' + k + ')';
  cadre.style.height = (v.page.offsetHeight * k + 4) + 'px';
}
window.addEventListener('resize', () => {
  if(CR.ed && CR.ed.v){ const c = CR.ed.v.page.parentNode; if(c) crMettreALEchelle(c, CR.ed.v); }
});

/* ---------- Garder, numéroter, fabriquer, envoyer ---------- */
function crDonneesARanger(ed){
  const cases = {};
  crCasesDuCorps(ed.v.corps).forEach(c => { cases[c] = crValeur(c, ed); });
  return { corps: crCorpsARanger(ed.v.corps), cases: cases, jours: ed.jours, entete: ed.entete, signataire: ed.signataire,
           poses: ed.poses, civilite: ed.civilite, dest: ed.dest || null, signatureEleve: ed.signatureEleve || null };
}
async function crGarder(numeroter){
  const ed = CR.ed;
  const r = await appelPrep({ action: 'courrierPoser', id: ed.id || '', modele: ed.modele, titre: ed.titre, eleve: ed.eleve,
                              entete: ed.entete, donnees: crDonneesARanger(ed), numeroter: !!numeroter });
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Le courrier n’a pas pu être gardé');
  ed.id = r.id;
  if(r.numero && r.numero !== ed.numero){
    ed.numero = r.numero;
    ed.v.ref.textContent = 'Réf. ' + r.numero;
    const t = document.querySelector('#courriersZone .crTitre');
    if(t && t.textContent.indexOf(r.numero) === -1) t.textContent += ' · ' + r.numero;
  }
  ed.modifie = false;
  if(!numeroter) showToast('💾 Brouillon gardé');
  return r;
}
async function crFinir(comment, mail, messagerie){
  const ed = CR.ed;
  if(!ed || ed.occupe) return false;
  const m = crModele(ed.modele) || {};
  if(m.eleve === 'obligatoire' && !ed.eleve){ showToast('⚠️ Choisis l’élève : ce modèle est lié à un élève.'); return false; }
  const vides = [...ed.v.corps.querySelectorAll('[data-vide]')].map(s => crInfoCase(s.getAttribute('data-case'))[1]);
  if(vides.length && !await confirmer('Des cases sont vides et ne s’imprimeront pas : ' + [...new Set(vides)].join(', ') + '.\nContinuer quand même ?', 'Cases vides', false)) return false;
  ed.occupe = true;
  const boutons = document.querySelectorAll('#courriersZone .crActions2 button');
  boutons.forEach(b => { b.disabled = true; });
  try{
    showToast(comment === 'mail' ? '✉️ Envoi…' : '📄 Fabrication du PDF…');
    await crGarder(true);
    const doc = await crFabriquerPdf(ed.v, ed);
    const b64 = doc.output('datauristring').split(',')[1];
    const r = await appelPrep({ action: 'courrierFinir', id: ed.id, pdf: b64, comment: comment, mail: mail || null,
                                messagerie: !!messagerie, eleve: ed.eleve, titre: ed.titre, numero: ed.numero });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Le courrier n’est pas parti');
    if(comment === 'pdf') crTelecharger(b64, crNomDuPdf(ed));
    if(comment === 'impression') crImprimer(b64);
    const msg = r.messagerie ? (r.messagerie.envoye ? ' · 💬 dans sa messagerie' : ' · 💬 pas dans sa messagerie (' + r.messagerie.motif + ')') : '';
    showToast(comment === 'mail' ? ((r.envoyeA || []).length ? '✉️ Envoyé à ' + r.envoyeA.join(', ') : '✉️ Envoyé') + msg
                                 : (comment === 'pdf' ? '📄 PDF prêt — ' + ed.numero : '🖨️ ' + ed.numero + ' prêt à imprimer'));
    try{ const f = await appelPrep({ action: 'courriersFaits', limite: 40 }); CR.faits = (f && f.courriers) || CR.faits; }catch(e){}
    return true;
  }catch(e){
    showToast('⚠️ ' + ((e && e.message) || e));
    return false;
  }finally{
    ed.occupe = false;
    boutons.forEach(b => { b.disabled = !crPeutEcrire(); });
  }
}

/* ============================================================
   LES FENÊTRES
   ============================================================ */
function crFenetre(titre, large){
  const fond = crEl('div', 'overlay show');
  const boite = crEl('div', 'modal crModal' + (large ? ' large' : ''));
  boite.appendChild(crEl('h3', '', titre));
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { if(fond.parentNode) fond.remove(); };
  fond.addEventListener('click', ev => { if(ev.target === fond) fermer(); });
  return { fond, boite, fermer };
}

/* ✉️ Envoyer par mail */
function crFenetreMail(){
  const ed = CR.ed;
  if(!ed) return;
  const m = crModele(ed.modele) || { mail: {} };
  const f = crFicheDe(ed.eleve) || {};
  const prenom = String(ed.eleve || '').trim().split(/\s+/)[0] || '';
  const fen = crFenetre('✉️ Envoyer « ' + ed.titre + ' »');
  const b = fen.boite;
  b.appendChild(crAide('Part de contact@evolutionconduites.fr, comme les bilans, avec le courrier en PDF.'));
  b.appendChild(crLab('À'));
  const adresses = [];
  const zA = crEl('div', 'crPuces');
  const ajouter = (a, etiquette, on) => {
    if(!a) return;
    const x = { a: a, on: on };
    adresses.push(x);
    const p = crEl('button', 'crPuce' + (on ? ' on' : ''), (etiquette ? etiquette + ' · ' : '') + a); p.type = 'button';
    p.addEventListener('click', () => { x.on = !x.on; p.classList.toggle('on', x.on); });
    zA.appendChild(p);
  };
  if(f.email) ajouter(String(f.email).trim(), ed.eleve, true);
  if(ed.dest && ed.dest.mail) ajouter(ed.dest.mail, ed.dest.nom, !f.email);
  if(f.mailPrescripteur && String(f.mailPrescripteur).trim() !== String(f.email || '').trim()) ajouter(String(f.mailPrescripteur).trim(), 'accompagnateur', false);
  b.appendChild(zA);
  const autre = document.createElement('input'); autre.type = 'email'; autre.placeholder = '+ une autre adresse (employeur, parent, lycée…), séparées par des virgules';
  b.appendChild(autre);
  if(!f.email && ed.eleve) b.appendChild(crAide('⚠️ Pas de mail dans la fiche de ' + ed.eleve + ' : tape l’adresse.'));
  b.appendChild(crLab('Objet'));
  const objet = document.createElement('input'); objet.type = 'text';
  objet.value = String((m.mail && m.mail.objet) || ed.titre).replace(/\{prenom\}/g, prenom);
  b.appendChild(objet);
  b.appendChild(crLab('Message'));
  const texte = document.createElement('textarea'); texte.rows = 6;
  texte.value = String((m.mail && m.mail.texte) || 'Bonjour,\n\nVous trouverez ci-joint notre courrier.\n\nL’équipe Évolution Conduites').replace(/\{prenom\}/g, prenom);
  b.appendChild(texte);
  b.appendChild(crLab('Pièce jointe'));
  b.appendChild(crEl('div', 'crPj', '📄 ' + crNomDuPdf(Object.assign({}, ed, { numero: ed.numero || 'EC-…' }))));
  const copie = crEl('label', 'crCoche');
  const cc = document.createElement('input'); cc.type = 'checkbox';
  copie.append(cc, document.createTextNode(' M’en envoyer une copie (mon adresse de ⚙️ Accès)'));
  b.appendChild(copie);
  /* 💬 E — le PDF aussi dans son fil « Le bureau » */
  const cm = document.createElement('input'); cm.type = 'checkbox';
  if(ed.eleve){
    const lm = crEl('label', 'crCoche');
    cm.checked = true;
    lm.append(cm, document.createTextNode(' 💬 Aussi dans sa messagerie (fil « Le bureau », s’il a son espace élève)'));
    b.appendChild(lm);
  }
  b.appendChild(crAide('Une copie du PDF se range dans son dossier (onglet ✉️ Courriers) et le mail apparaît dans ✉️ Mails envoyés.'));
  const r = crEl('div', 'btn-row');
  const go = crBouton('✉️ Envoyer', 'btn-primary', async () => {
    const liste = adresses.filter(x => x.on).map(x => x.a)
      .concat(autre.value.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean));
    const bonnes = liste.filter(a => /^[^\s@<>",;]+@[^\s@<>",;]+\.[a-z]{2,}$/i.test(a));
    if(!bonnes.length && !cm.checked){ showToast('⚠️ Aucune adresse mail valide.'); return; }
    if(bonnes.length !== liste.length){ showToast('⚠️ Une adresse est mal écrite : ' + liste.filter(a => bonnes.indexOf(a) === -1).join(', ')); return; }
    if(bonnes.length > 5){ showToast('⚠️ Cinq adresses au plus.'); return; }
    go.disabled = true;
    const ok = await crFinir('mail', { a: bonnes, objet: objet.value, texte: texte.value, copieMoi: cc.checked }, cm.checked);
    go.disabled = false;
    if(ok) fen.fermer();
  });
  r.append(crBouton('Annuler', '', fen.fermer), go);
  b.appendChild(r);
}

/* ✍️ Signatures et tampons — administrateurs */
function crFenetreImages(){
  if(!crEstAdmin()) return;
  const fen = crFenetre('✍️ Signatures et tampons', true);
  const b = fen.boite;
  b.appendChild(crAide('Une image par signature et par tampon, ou les deux ensemble. Elles servent à tous les administrateurs et ne sont jamais montrées à personne d’autre.'));
  const liste = crEl('div', 'crImages');
  b.appendChild(liste);
  const dessiner = () => {
    liste.innerHTML = '';
    if(!(CR.d.images || []).length) liste.appendChild(crEl('div', 'empty', 'Aucune image pour le moment.'));
    (CR.d.images || []).forEach(img => {
      const l = crEl('div', 'crImg');
      const vig = crEl('div', 'crVig');
      const im = document.createElement('img'); im.src = img.donnees; im.alt = '';
      vig.appendChild(im);
      const t = crEl('div', 'crImgT');
      t.append(crEl('b', '', img.nom), crEl('small', '', (img.sorte === 'tampon' ? '🔵 Tampon' : (img.sorte === 'deux' ? '✍️🔵 Signature + tampon' : '✍️ Signature')) + (img.par ? ' · ' + img.par : '') + (img.majLe ? ' · ' + img.majLe : '')));
      const ren = crEl('button', 'crMini', '✏️'); ren.type = 'button'; ren.title = 'Renommer';
      ren.addEventListener('click', async () => {
        const n = await demander('Le nom de cette image :', img.nom, 'Renommer');
        if(!n || n === img.nom) return;
        try{ const d = await appelPrep({ action: 'courrierImagePoser', id: img.id, titre: n, sorte: img.sorte }); if(d && d.status === 'ok'){ CR.d = d; dessiner(); } }
        catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); }
      });
      const sup = crEl('button', 'crMini', '🗑️'); sup.type = 'button'; sup.title = 'Retirer';
      sup.addEventListener('click', async () => {
        if(!await confirmer('Retirer « ' + img.nom + ' » ? Les courriers déjà faits gardent leur PDF ; les modèles qui la posaient ne la poseront plus.', 'Retirer une image', true)) return;
        try{ const d = await appelPrep({ action: 'courrierImageRetirer', id: img.id }); if(d && d.status === 'ok'){ CR.d = d; dessiner(); } }
        catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); }
      });
      l.append(vig, t, ren, sup);
      liste.appendChild(l);
    });
  };
  dessiner();

  /* ➕ Ajouter */
  b.appendChild(crEl('div', 'crSt', '➕ Ajouter une image'));
  const etat = { sorte: 'signature', fond: 70, encre: '', brut: null, img: null, png: null };
  b.appendChild(crPuces([['signature', '✍️ Signature'], ['tampon', '🔵 Tampon'], ['deux', '✍️🔵 Les deux']], etat.sorte, v => { etat.sorte = v; }));
  const nom = document.createElement('input'); nom.type = 'text'; nom.placeholder = 'Son nom (ex. « Signature David », « Tampon Loudéac »)';
  b.appendChild(nom);
  const fic = document.createElement('input'); fic.type = 'file'; fic.accept = 'image/*';
  b.appendChild(fic);
  b.appendChild(crAide('Une photo ou un scan, sur une feuille blanche, bien à plat et bien éclairée.'));
  const deux = crEl('div', 'crAvantApres');
  const av = crEl('div', 'crAA'); av.appendChild(crEl('small', '', 'Ta photo'));
  const ap = crEl('div', 'crAA'); ap.appendChild(crEl('small', '', 'Ce qui sera posé sur la page'));
  const imAv = document.createElement('img'); imAv.alt = '';
  const surPage = crEl('div', 'crSurPage', 'Veuillez agréer, madame, monsieur, mes sincères salutations. David EDOM — Directeur Général');
  const imAp = document.createElement('img'); imAp.alt = '';
  surPage.appendChild(imAp);
  av.appendChild(imAv); ap.appendChild(surPage);
  deux.append(av, ap);
  deux.style.display = 'none';
  b.appendChild(deux);
  const reglages = crEl('div', 'crReglImg');
  reglages.style.display = 'none';
  const glis = document.createElement('input'); glis.type = 'range'; glis.min = '0'; glis.max = '100'; glis.value = String(etat.fond);
  const lg = crEl('label', 'crGlis'); lg.append(crEl('span', '', '✨ Fond blanc retiré'), glis);
  reglages.appendChild(lg);
  reglages.appendChild(crEl('div', 'crGlis', '🖋️ Encre'));
  reglages.appendChild(crPuces([['', 'Telle quelle'], ['noire', '⚫ Noire'], ['bleue', '🔵 Bleue']], '', v => { etat.encre = v; refaire(); }));
  b.appendChild(reglages);
  const refaire = () => {
    if(!etat.img) return;
    etat.png = crTraiterImage(etat.img, { fond: Number(glis.value), encre: etat.encre });
    imAp.src = etat.png || '';
    if(!etat.png) showToast('⚠️ Rien à garder : baisse « Fond blanc retiré ».');
  };
  glis.addEventListener('input', refaire);
  fic.addEventListener('change', async () => {
    const f = fic.files && fic.files[0];
    if(!f) return;
    try{
      etat.brut = await crLireFichier(f);
      etat.img = await crChargerImage(etat.brut);
      imAv.src = etat.brut;
      deux.style.display = ''; reglages.style.display = '';
      refaire();
    }catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); }
  });
  const r = crEl('div', 'btn-row');
  const go = crBouton('💾 Enregistrer l’image', 'btn-primary', async () => {
    if(!etat.png){ showToast('⚠️ Choisis d’abord une photo.'); return; }
    if(etat.png.length > 1200000){ showToast('⚠️ Image trop lourde : recadre-la plus près.'); return; }
    go.disabled = true;
    try{
      const d = await appelPrep({ action: 'courrierImagePoser', titre: nom.value.trim() || (etat.sorte === 'tampon' ? 'Tampon' : 'Signature'), sorte: etat.sorte, image: etat.png });
      if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'Image refusée');
      CR.d = d;
      dessiner();
      fic.value = ''; nom.value = ''; etat.img = null; etat.png = null; deux.style.display = 'none'; reglages.style.display = 'none';
      showToast('✍️ Image enregistrée');
      if(CR.ed && CR.ed.sorte === 'courrier') crDessinerEcriture();
    }catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); }
    go.disabled = false;
  });
  r.append(crBouton('Fermer', '', fen.fermer), go);
  b.appendChild(r);
}

/* 🏢 En-têtes et signataires — administrateurs */
function crFenetreEntetes(){
  if(!crEstAdmin()) return;
  const reg = JSON.parse(JSON.stringify(CR.d.reglages));
  const fen = crFenetre('🏢 En-têtes et signataires', true);
  const b = fen.boite;
  ['sb', 'lo'].forEach(k => {
    const e = reg.entetes[k];
    b.appendChild(crEl('div', 'crSt', e.nom));
    const champ = (lab, val, quoi) => {
      const l = crEl('label', 'crCase'); l.appendChild(crEl('span', '', lab));
      const i = document.createElement('input'); i.type = 'text'; i.value = val || '';
      i.addEventListener('input', () => quoi(i.value));
      l.appendChild(i); b.appendChild(l);
    };
    champ('Nom', e.titre, v => { e.titre = v; });
    champ('Adresse (ligne 1)', e.lignes[0], v => { e.lignes[0] = v; });
    champ('Adresse (ligne 2)', e.lignes[1], v => { e.lignes[1] = v; });
    champ('Mail', e.mail, v => { e.mail = v; });
    champ('Site', e.web, v => { e.web = v; });
    const l = crEl('label', 'crCase'); l.appendChild(crEl('span', '', 'Pied de page (une ligne par ligne)'));
    const t = document.createElement('textarea'); t.rows = 5; t.value = (e.pied || []).join('\n');
    t.addEventListener('input', () => { e.pied = t.value.split('\n').map(x => x.trim()).filter(Boolean); });
    l.appendChild(t); b.appendChild(l);
  });
  b.appendChild(crEl('div', 'crSt', '✍️ Les signataires'));
  const ls = crEl('div', '');
  const dessinerSig = () => {
    ls.innerHTML = '';
    reg.signataires.forEach((s, i) => {
      const r = crEl('div', 'crSig');
      const n = document.createElement('input'); n.type = 'text'; n.value = s.nom; n.placeholder = 'Nom';
      const f = document.createElement('input'); f.type = 'text'; f.value = s.fonction; f.placeholder = 'Fonction';
      const x = crEl('button', 'crMini', '✕'); x.type = 'button';
      n.addEventListener('input', () => { s.nom = n.value; });
      f.addEventListener('input', () => { s.fonction = f.value; });
      x.addEventListener('click', () => { reg.signataires.splice(i, 1); dessinerSig(); });
      r.append(n, f, x); ls.appendChild(r);
    });
  };
  dessinerSig();
  const plus = crEl('button', 'crLien', '➕ Ajouter un signataire'); plus.type = 'button';
  plus.addEventListener('click', () => { reg.signataires.push({ id: 's' + Date.now().toString(36), nom: '', fonction: '' }); dessinerSig(); });
  b.append(ls, plus);
  const r = crEl('div', 'btn-row');
  const go = crBouton('💾 Enregistrer', 'btn-primary', async () => {
    go.disabled = true;
    try{
      const d = await appelPrep({ action: 'courriersReglagesPoser', reglages: reg });
      if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'Réglages refusés');
      CR.d = d;
      fen.fermer();
      showToast('🏢 En-têtes enregistrés');
      if(CR.ed && CR.ed.sorte === 'courrier'){ CR.ed.corps = crCorpsARanger(CR.ed.v.corps); crDessinerEcriture(); }
      else if(CR.ed && CR.ed.sorte === 'modele'){ CR.ed.m.corps = crCorpsARanger(CR.ed.v.corps); crDessinerModele(); }
    }catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); go.disabled = false; }
  });
  r.append(crBouton('Annuler', '', fen.fermer), go);
  b.appendChild(r);
}

/* ============================================================
   ➕ / ✏️ UN MODÈLE — administrateurs
   La vraie page à droite : on y écrit le texte, on y glisse les cases
   et les images ; tout ce qui est réglé ici revient à chaque courrier.
   ============================================================ */
function crEditerModele(id){
  if(!crEstAdmin()) return;
  const src = id ? crModele(id) : null;
  const m = src ? JSON.parse(JSON.stringify(src)) : {
    id: '', icone: '📄', nom: '', aide: '', eleve: 'facultatif', entete: 'auto', signataire: '', qui: 'bureau', poses: [],
    corps: '<div><br></div>', mail: { objet: '', texte: 'Bonjour {prenom},\n\nVous trouverez ci-joint notre courrier.\n\nL’équipe Évolution Conduites' }
  };
  CR.ed = { sorte: 'modele', m: m, entete: m.entete === 'lo' ? 'lo' : 'sb', poses: m.poses, modifie: false };
  crDessinerModele();
}
function crDessinerModele(){
  const z = $('courriersZone');
  const ed = CR.ed, m = ed.m;
  z.innerHTML = '';
  const retour = crEl('button', 'crRetour', '← Les courriers'); retour.type = 'button';
  retour.addEventListener('click', async () => {
    if(ed.modifie && !await confirmer('Quitter sans enregistrer le modèle ?', 'Modèle', false)) return;
    crAccueil();
  });
  z.appendChild(retour);
  z.appendChild(crEl('h3', 'crTitre', m.id ? '✏️ Le modèle « ' + m.nom + ' »' : '➕ Nouveau modèle'));
  const deux = crEl('div', 'crDeux');
  const gauche = crEl('div', 'crForm');
  const droite = crEl('div', 'crApercu');
  deux.append(gauche, droite);
  z.appendChild(deux);
  const touche = () => { ed.modifie = true; };

  const champ = (lab, val, quoi, long) => {
    gauche.appendChild(crLab(lab));
    const i = document.createElement(long ? 'textarea' : 'input');
    if(!long) i.type = 'text'; else i.rows = 5;
    i.value = val || '';
    i.addEventListener('input', () => { quoi(i.value); touche(); });
    gauche.appendChild(i);
    return i;
  };
  const rangNom = crEl('div', 'crNomIc');
  gauche.appendChild(crLab('Nom du modèle'));
  const ic = document.createElement('input'); ic.type = 'text'; ic.value = m.icone; ic.maxLength = 4; ic.className = 'crIc';
  const nm = document.createElement('input'); nm.type = 'text'; nm.value = m.nom; nm.placeholder = 'ex. Attestation pour l’employeur';
  ic.addEventListener('input', () => { m.icone = ic.value; touche(); });
  nm.addEventListener('input', () => { m.nom = nm.value; touche(); });
  rangNom.append(ic, nm);
  gauche.appendChild(rangNom);
  champ('Petite aide (sous le nom)', m.aide, v => { m.aide = v; });
  gauche.appendChild(crLab('L’élève'));
  gauche.appendChild(crPuces([['obligatoire', '👤 Obligatoire'], ['facultatif', 'Facultatif'], ['jamais', 'Jamais']], m.eleve, v => { m.eleve = v; touche(); }));
  gauche.appendChild(crLab('En-tête'));
  gauche.appendChild(crPuces([['auto', 'Selon l’agence de l’élève'], ['sb', '📍 Saint-Brieuc'], ['lo', '📍 Loudéac']], m.entete, v => {
    m.entete = v; touche();
    const k = v === 'lo' ? 'lo' : 'sb';
    if(k !== ed.entete){ ed.entete = k; m.corps = crCorpsARanger(ed.v.corps); crDessinerModele(); }
  }));
  gauche.appendChild(crLab('Signé par'));
  const s = document.createElement('select');
  ((CR.d.reglages && CR.d.reglages.signataires) || []).forEach(x => { const o = document.createElement('option'); o.value = x.id; o.textContent = x.nom + ' — ' + x.fonction; if(x.id === crSignataire(m.signataire).id) o.selected = true; s.appendChild(o); });
  s.addEventListener('change', () => { m.signataire = s.value; touche(); });
  gauche.appendChild(s);
  gauche.appendChild(crLab('Qui peut s’en servir'));
  gauche.appendChild(crPuces([['bureau', 'Bureau + admins'], ['admins', '👑 Admins seulement']], m.qui, v => { m.qui = v; touche(); }));
  gauche.appendChild(crLab('Signature et tampon posés d’office'));
  const r = crEl('div', 'crPuces');
  (CR.d.images || []).forEach(img => {
    const b = crEl('button', 'crPuce', (img.sorte === 'tampon' ? '🔵 ' : (img.sorte === 'deux' ? '✍️🔵 ' : '✍️ ')) + img.nom); b.type = 'button';
    b.addEventListener('click', () => { crPoserImage(ed, img); m.poses = ed.poses; touche(); crDessinerPoses(ed.v, ed, touche); });
    r.appendChild(b);
  });
  const plus = crEl('button', 'crPuce', '➕'); plus.type = 'button'; plus.addEventListener('click', crFenetreImages);
  r.appendChild(plus);
  gauche.appendChild(r);
  gauche.appendChild(crAide('Leur place sur la page est gardée par le modèle ; on peut encore la changer sur chaque courrier.'));
  gauche.appendChild(crEl('div', 'crSt', '✉️ Le mail qui l’accompagne'));
  champ('Objet', m.mail.objet, v => { m.mail.objet = v; });
  champ('Message ({prenom} = le prénom de l’élève)', m.mail.texte, v => { m.mail.texte = v; }, true);

  const act = crEl('div', 'crActions2');
  const go = crBouton('💾 Enregistrer le modèle', 'btn-primary', async () => {
    m.corps = crCorpsARanger(ed.v.corps);
    m.poses = ed.poses;
    if(!m.nom.trim()){ showToast('⚠️ Donne un nom au modèle.'); return; }
    go.disabled = true;
    try{
      const d = await appelPrep({ action: 'courrierModelePoser', id: m.id || '', modele: m });
      if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'Modèle refusé');
      CR.d = d;
      m.id = d.id;
      ed.modifie = false;
      showToast('💾 Modèle enregistré');
      crAccueil();
    }catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); go.disabled = false; }
  });
  act.appendChild(go);
  if(m.id){
    act.appendChild(crBouton('👁️ Essayer', '', async () => {
      if(ed.modifie && !await confirmer('Essayer avec le texte enregistré (tes changements ne le sont pas encore) ?', 'Modèle', false)) return;
      crEcrire(m.id, '');
    }));
    if(m.id !== 'vierge'){
      act.appendChild(crBouton('🗑️ Retirer', '', async () => {
        if(!await confirmer('Retirer le modèle « ' + m.nom + ' » ? Les courriers déjà faits restent.', 'Retirer un modèle', true)) return;
        try{ const d = await appelPrep({ action: 'courrierModeleRetirer', id: m.id }); if(d && d.status === 'ok'){ CR.d = d; crAccueil(); } }
        catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); }
      }));
    }
  }
  gauche.appendChild(act);

  /* La barre d'écriture et la page */
  const outils = crEl('div', 'crOutils');
  const cmd = (t, titre, c, v) => {
    const b = crEl('button', 'crOutil', t); b.type = 'button'; b.title = titre;
    b.addEventListener('mousedown', ev => ev.preventDefault());
    b.addEventListener('click', () => { ed.v.corps.focus(); document.execCommand(c, false, v || null); touche(); });
    outils.appendChild(b);
  };
  cmd('G', 'Gras', 'bold'); cmd('I', 'Italique', 'italic'); cmd('S', 'Souligné', 'underline');
  cmd('⯇', 'À gauche', 'justifyLeft'); cmd('≡', 'Centré', 'justifyCenter'); cmd('⯈', 'À droite', 'justifyRight'); cmd('☰', 'Justifié', 'justifyFull');
  droite.appendChild(outils);
  const ins = crEl('div', 'crInsere');
  ins.appendChild(crEl('span', 'crLab', '➕ Insérer une case :'));
  let curseur = null;
  const garderCurseur = () => {
    const sel = window.getSelection();
    if(sel && sel.rangeCount && ed.v.corps.contains(sel.anchorNode)) curseur = sel.getRangeAt(0).cloneRange();
  };
  const inserer = c => {
    const span = document.createElement('span');
    span.setAttribute('data-case', c);
    if(curseur && ed.v.corps.contains(curseur.startContainer)){
      curseur.deleteContents(); curseur.insertNode(span);
      curseur.setStartAfter(span); curseur.collapse(true);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(curseur);
    }else{
      let dernier = ed.v.corps.lastElementChild;
      if(!dernier){ dernier = document.createElement('div'); ed.v.corps.appendChild(dernier); }
      dernier.appendChild(span);
    }
    crRemplirCases(ed.v.corps, ed, true);
    crAjusterPage(ed.v); crMettreALEchelle(cadre, ed.v);
    touche();
  };
  CR_CASES.forEach(([c, i, nom]) => {
    const b = crEl('button', 'crPuceCase', i + ' ' + nom); b.type = 'button';
    b.addEventListener('mousedown', ev => ev.preventDefault());
    b.addEventListener('click', () => inserer(c));
    ins.appendChild(b);
  });
  const libre = crEl('button', 'crPuceCase libre', '✏️ Case libre…'); libre.type = 'button';
  libre.addEventListener('mousedown', ev => ev.preventDefault());
  libre.addEventListener('click', async () => {
    const garde = curseur;
    const n = await demander('Le nom de la case, tapée au moment d’écrire le courrier (ex. « Montant restant dû ») :', '', 'Case libre');
    const propre = String(n || '').replace(/["<>&]/g, '').trim().slice(0, 60);
    if(!propre) return;
    curseur = garde;
    inserer('libre:' + propre);
  });
  ins.appendChild(libre);
  droite.appendChild(ins);
  droite.appendChild(crAide('Une case que l’appli connaît se remplit seule ; une « case libre » se tape au moment d’écrire le courrier. Entrée = une nouvelle ligne.'));

  const cadre = crEl('div', 'crCadrePage');
  const v = crDessinerPage({ entete: ed.entete, corps: m.corps });
  v.corps.setAttribute('contenteditable', 'true');
  ed.v = v;
  crRemplirCases(v.corps, ed, true);
  ['keyup', 'mouseup', 'input', 'focus'].forEach(t => v.corps.addEventListener(t, garderCurseur));
  v.corps.addEventListener('input', () => { touche(); crAjusterPage(v); crMettreALEchelle(cadre, v); });
  cadre.appendChild(v.page);
  droite.appendChild(cadre);
  crDessinerPoses(v, ed, () => { m.poses = ed.poses; touche(); });
  crAjusterPage(v); crMettreALEchelle(cadre, v);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => { crAjusterPage(v); crMettreALEchelle(cadre, v); });
}

/* ============================================================
   📁 L'ONGLET « ✉️ COURRIERS » DU DOSSIER DE L'ÉLÈVE (D)
   ============================================================ */
async function ongletCourriersEleve(corps, nom){
  const z = crEl('div', 'crDossier');
  corps.appendChild(z);
  if(typeof niveauDroit === 'function' && niveauDroit('courriers') === 'm'){
    z.appendChild(crBouton('✉️ Faire un courrier à ' + nom, 'btn-primary', () => ouvrirCourriersPour({ eleve: nom })));
  }
  const liste = crEl('div', '');
  liste.appendChild(crEl('div', 'empty', 'Lecture des courriers…'));
  z.appendChild(liste);
  try{
    const r = await appelPrep({ action: 'courriersFaits', eleve: nom, limite: 100 });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'lecture impossible');
    crDessinerFaits(liste, r.courriers || [], false);
  }catch(e){
    liste.innerHTML = '';
    liste.appendChild(crEl('div', 'empty', '⚠️ ' + ((e && e.message) || e)));
  }
}


/* ============================================================
   📇 F — LE CARNET D'ADRESSES
   Pour écrire à quelqu'un qui n'est pas élève (employeur, lycée,
   mission locale…) : son adresse dans la fenêtre de l'enveloppe, et
   son mail proposé à l'envoi.
   ============================================================ */
async function crChargerContacts(){
  try{
    const r = await appelPrep({ action: 'courriersContacts' });
    CR.contacts = (r && r.contacts) || [];
  }catch(e){ CR.contacts = CR.contacts || []; }
  return CR.contacts;
}
function crFenetreContact(c){
  return new Promise(fini => {
    const fen = crFenetre(c ? '📇 ' + c.nom : '📇 Nouvelle adresse');
    const b = fen.boite;
    const champ = (lab, val, ph) => { b.appendChild(crLab(lab)); const i = document.createElement('input'); i.type = 'text'; i.value = val || ''; i.placeholder = ph || ''; b.appendChild(i); return i; };
    const nom = champ('Nom (1ʳᵉ ligne, en gras)', c && c.nom, 'ex. Mission locale de Saint-Brieuc');
    b.appendChild(crLab('Adresse'));
    const adr = document.createElement('textarea'); adr.rows = 4; adr.placeholder = 'Service\nRue\nCode postal et ville';
    adr.value = c ? (c.lignes || []).join('\n') : '';
    b.appendChild(adr);
    const mail = champ('Mail (facultatif)', c && c.mail, 'contact@exemple.fr');
    const note = champ('Note (pour nous)', c && c.note, '');
    const r = crEl('div', 'btn-row');
    const go = crBouton('💾 Enregistrer', 'btn-primary', async () => {
      if(!nom.value.trim()){ showToast('⚠️ Le nom est obligatoire.'); return; }
      go.disabled = true;
      try{
        const d = await appelPrep({ action: 'courrierContactPoser', id: c ? c.id : '',
          contact: { nom: nom.value.trim(), lignes: adr.value.split('\n').map(x => x.trim()).filter(Boolean), mail: mail.value.trim(), note: note.value.trim() } });
        if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'Adresse refusée');
        CR.contacts = d.contacts || [];
        const pose = c ? CR.contacts.find(x => x.id === c.id) : CR.contacts.filter(x => x.nom === nom.value.trim()).pop();
        fen.fermer();
        showToast('📇 Adresse enregistrée');
        fini(pose || null);
      }catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); go.disabled = false; }
    });
    r.append(crBouton('Annuler', '', () => { fen.fermer(); fini(null); }), go);
    b.appendChild(r);
  });
}
async function crFenetreCarnet(){
  await crChargerContacts();
  const fen = crFenetre('📇 Carnet d’adresses', true);
  const b = fen.boite;
  b.appendChild(crAide('Les destinataires qui ne sont pas des élèves. On les choisit dans « Destinataire sur la page » en écrivant un courrier.'));
  const liste = crEl('div', 'crImages');
  b.appendChild(liste);
  const dessiner = () => {
    liste.innerHTML = '';
    if(!CR.contacts.length) liste.appendChild(crEl('div', 'empty', 'Le carnet est vide.'));
    CR.contacts.forEach(c => {
      const l = crEl('div', 'crImg');
      const t = crEl('div', 'crImgT');
      t.append(crEl('b', '', c.nom), crEl('small', '', [(c.lignes || []).join(', '), c.mail].filter(Boolean).join(' · ')));
      const ed = crEl('button', 'crMini', '✏️'); ed.type = 'button';
      ed.addEventListener('click', async () => { await crFenetreContact(c); dessiner(); });
      const sup = crEl('button', 'crMini', '🗑️'); sup.type = 'button';
      sup.addEventListener('click', async () => {
        if(!await confirmer('Retirer « ' + c.nom + ' » du carnet ? Les courriers déjà faits gardent son adresse.', 'Carnet d’adresses', true)) return;
        try{ const d = await appelPrep({ action: 'courrierContactRetirer', id: c.id }); CR.contacts = (d && d.contacts) || []; dessiner(); }
        catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); }
      });
      l.append(t, ed, sup);
      liste.appendChild(l);
    });
  };
  dessiner();
  const r = crEl('div', 'btn-row');
  r.append(crBouton('Fermer', '', fen.fermer), crBouton('➕ Nouvelle adresse', 'btn-primary', async () => { await crFenetreContact(null); dessiner(); }));
  b.appendChild(r);
}

/* ============================================================
   ✉️ A — LES CONVOCATIONS DE TOUTE UNE SESSION
   Depuis 🎓 Suivi permis : chaque élève a sa convocation (ses jours
   repris, l'en-tête de son agence, son numéro). Un envoi pour tous,
   ou un seul PDF pour imprimer la pile.
   ============================================================ */
async function crAssurerDonnees(){
  await crChargerRessources();
  if(!CR.d){
    const d = await appelPrep({ action: 'courriersLire' });
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'Courriers illisibles');
    CR.d = d;
  }
  if(typeof fichesEleves !== 'undefined' && !fichesEleves.length && typeof chargerFiches === 'function') await chargerFiches();
}
/* Un courrier prêt, dessiné hors de l'écran : pour le PDF */
async function crCourrierHorsEcran(modeleId, eleve, regle){
  const m = crModele(modeleId);
  const ed = { sorte: 'courrier', id: '', numero: '', modele: m.id, titre: m.nom, eleve: eleve, entete: 'sb',
               signataire: m.signataire || '', cases: {}, jours: [], joursRepris: false,
               poses: JSON.parse(JSON.stringify(m.poses || [])), civilite: '', examen: null, corps: m.corps, dest: null };
  const f = crFicheDe(eleve);
  if(f && (f.genre === 'F' || f.genre === 'M')) ed.civilite = f.genre;
  await crPreparerExamen(ed);
  ed.entete = m.entete !== 'auto' ? m.entete : await crEnteteDeLEleve(eleve, ed);
  if(regle) regle(ed);
  return ed;
}
function crPageHorsEcran(ed){
  let z = $('crHorsEcran');
  if(!z){ z = document.createElement('div'); z.id = 'crHorsEcran'; z.style.cssText = 'position:fixed;left:-30000px;top:0;width:900px;'; document.body.appendChild(z); }
  z.innerHTML = '';
  const v = crDessinerPage({ entete: ed.entete, corps: ed.corps, numero: ed.numero, dest: ed.dest });
  z.appendChild(v.page);
  crRemplirCases(v.corps, ed, false);
  ed.v = v;
  return v;
}
async function crConvocationsDeSession(sess){
  try{ await crAssurerDonnees(); }catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); return; }
  const m = crModele('convocation');
  if(!m){ showToast('⚠️ Le modèle « Convocation à l’examen » a été retiré.'); return; }
  const date = sess.date ? crDateLongue(sess.date) : 'date à définir';
  const fen = crFenetre('✉️ Convocations — session du ' + date, true);
  const b = fen.boite;
  b.appendChild(crAide([sess.centre, sess.heureDebut ? 'à ' + crHeure(sess.heureDebut) : '', sess.moniteur ? 'moniteur ' + sess.moniteur : ''].filter(Boolean).join(' · ') +
    ' — chaque élève a la sienne, avec ses jours repris et l’en-tête de son agence.'));
  const zone = crEl('div', 'crTableEnv');
  zone.appendChild(crEl('div', 'empty', 'Préparation des convocations…'));
  b.appendChild(zone);
  const noms = [...new Set((sess.eleves || []).map(p => p.eleve).filter(Boolean))];
  const lignes = [];
  for(const nom of noms){
    const ed = await crCourrierHorsEcran('convocation', nom);
    const f = crFicheDe(nom) || {};
    lignes.push({ nom, ed, mail: String(f.email || '').trim(), coche: true });
  }
  const t = crEl('table', 'crTable');
  const tete = crEl('tr', '');
  ['', 'Élève', 'Civilité', 'Jours repris', 'Mail', 'En-tête'].forEach(h => tete.appendChild(crEl('th', '', h)));
  t.appendChild(tete);
  lignes.forEach(l => {
    const tr = crEl('tr', '');
    const c = document.createElement('input'); c.type = 'checkbox'; c.checked = l.coche;
    c.addEventListener('change', () => { l.coche = c.checked; compter(); });
    const td0 = crEl('td', ''); td0.appendChild(c); tr.appendChild(td0);
    tr.appendChild(crEl('td', '', l.nom));
    const tdC = crEl('td', '');
    tdC.appendChild(crPuces([['M', 'M.'], ['F', 'Mme']], l.ed.civilite, v => { l.ed.civilite = v; }));
    tr.appendChild(tdC);
    tr.appendChild(crEl('td', 'crDoux', crPhraseDesJours(l.ed.jours) || '⚠️ aucun jour repris'));
    tr.appendChild(crEl('td', l.mail ? '' : 'crAvertTexte', l.mail ? '✅' : 'pas de mail'));
    const tdE = crEl('td', '');
    tdE.appendChild(crPuces([['sb', 'SB'], ['lo', 'Loudéac']], l.ed.entete, v => { l.ed.entete = v; }));
    tr.appendChild(tdE);
    t.appendChild(tr);
  });
  zone.innerHTML = '';
  zone.appendChild(t);
  const optM = crEl('label', 'crCoche');
  const cm = document.createElement('input'); cm.type = 'checkbox'; cm.checked = true;
  optM.append(cm, document.createTextNode(' 💬 Aussi dans leur messagerie (fil « Le bureau »)'));
  b.appendChild(optM);
  const etat = crEl('div', 'crAide', '');
  b.appendChild(etat);
  const r = crEl('div', 'btn-row');
  const bMail = crBouton('', 'btn-primary', () => lancer('mail'));
  const bPdf = crBouton('', '', () => lancer('impression'));
  const compter = () => {
    const sel = lignes.filter(l => l.coche);
    bMail.textContent = '✉️ Envoyer ' + sel.filter(l => l.mail || cm.checked).length + ' convocation(s)';
    bPdf.textContent = '📄 Les ' + sel.length + ' en un PDF (à imprimer)';
  };
  cm.addEventListener('change', compter);
  compter();
  r.append(crBouton('Fermer', '', fen.fermer), bPdf, bMail);
  b.appendChild(r);
  if(!crPeutEcrire()){ bMail.disabled = true; bPdf.disabled = true; }

  let occupe = false;
  async function lancer(comment){
    if(occupe) return;
    const sel = lignes.filter(l => l.coche && (comment !== 'mail' || l.mail || cm.checked));
    if(!sel.length){ showToast('⚠️ Personne à qui l’envoyer.'); return; }
    occupe = true; bMail.disabled = true; bPdf.disabled = true;
    let faits = 0; const ratés = [];
    const jsPDF = await chargerJsPDF();
    const commun = comment === 'impression' ? new jsPDF({ unit: 'mm', format: 'a4', compress: true }) : null;
    for(const l of sel){
      etat.textContent = (comment === 'mail' ? '✉️ Envoi… ' : '📄 Préparation… ') + (faits + 1) + ' / ' + sel.length + ' — ' + l.nom;
      try{
        const ed = l.ed;
        const v = crPageHorsEcran(ed);
        const cases = {};
        crCasesDuCorps(v.corps).forEach(c => { cases[c] = crValeur(c, ed); });
        const p = await appelPrep({ action: 'courrierPoser', id: ed.id || '', modele: ed.modele, titre: ed.titre, eleve: ed.eleve, entete: ed.entete,
          numeroter: true, donnees: { corps: crCorpsARanger(v.corps), cases, jours: ed.jours, entete: ed.entete, signataire: ed.signataire,
                                      poses: ed.poses, civilite: ed.civilite, dest: null } });
        if(!p || p.status !== 'ok') throw new Error((p && p.message) || 'refusé');
        ed.id = p.id; ed.numero = p.numero; v.ref.textContent = 'Réf. ' + p.numero;
        const doc = await crFabriquerPdf(v, ed);
        const b64 = doc.output('datauristring').split(',')[1];
        if(commun) await crFabriquerPdf(v, ed, commun);
        const prenom = String(ed.eleve).trim().split(/\s+/)[0] || '';
        const mail = comment === 'mail' ? { a: l.mail ? [l.mail] : [], objet: String((m.mail && m.mail.objet) || ed.titre).replace(/\{prenom\}/g, prenom),
                                           texte: String((m.mail && m.mail.texte) || '').replace(/\{prenom\}/g, prenom) } : null;
        const fin = await appelPrep({ action: 'courrierFinir', id: ed.id, pdf: b64, comment: comment, mail: mail,
                                      messagerie: comment === 'mail' && cm.checked, eleve: ed.eleve, titre: ed.titre, numero: ed.numero });
        if(!fin || fin.status !== 'ok') throw new Error((fin && fin.message) || 'pas parti');
        faits++;
      }catch(e){ ratés.push(l.nom + ' (' + ((e && e.message) || e) + ')'); }
    }
    if(commun && faits) crImprimer(commun.output('datauristring').split(',')[1]);
    etat.textContent = (comment === 'mail' ? '✉️ ' + faits + ' convocation(s) envoyée(s)' : '📄 ' + faits + ' convocation(s) prêtes à imprimer') +
      (ratés.length ? ' · ⚠️ pas fait : ' + ratés.join(' ; ') : '');
    showToast(etat.textContent);
    occupe = false; bMail.disabled = false; bPdf.disabled = false;
    try{ const f = await appelPrep({ action: 'courriersFaits', limite: 40 }); CR.faits = (f && f.courriers) || CR.faits; }catch(e){}
  }
}
function boutonConvocationsDeSession(){
  return (typeof niveauDroit === 'function' && niveauDroit('courriers') === 'm');
}

/* ============================================================
   💶 C — LA RELANCE, LÀ OÙ L'ON VOIT « IL DOIT DE L'ARGENT »
   ============================================================ */
function boutonRelancePourLeSuivi(nom, reste){
  if(typeof niveauDroit !== 'function' || niveauDroit('courriers') !== 'm') return '';
  const n = String(nom || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const r = String(reste || '').replace(/[^0-9.,]/g, '');
  return ' <button type="button" class="btn btn-secondary crRelanceBouton" data-eleve="' + n + '" data-reste="' + r + '" ' +
    'style="width:auto;margin:4px 0 0 6px;padding:4px 9px;font-size:12px;">✉️ Relance</button>';
}
document.addEventListener('click', ev => {
  const b = ev.target && ev.target.closest ? ev.target.closest('.crRelanceBouton') : null;
  if(!b) return;
  ev.preventDefault();
  ev.stopPropagation();
  const reste = b.getAttribute('data-reste') || '';
  ouvrirCourriersPour({ eleve: b.getAttribute('data-eleve') || '', modele: 'relance',
                        cases: reste && parseFloat(reste.replace(',', '.')) > 0 ? { 'libre:Montant restant dû': reste } : null });
}, true);


/* ============================================================
   ✍️ H — LE PAD DE SIGNATURE
   Plein écran, au doigt ou au stylet. Rend un PNG transparent,
   recadré au plus près — ou null si on renonce.
   ============================================================ */
function crPadDeSignature(nom){
  return new Promise(fini => {
    const fond = crEl('div', 'crPad');
    const boite = crEl('div', 'crPadBoite');
    boite.appendChild(crEl('div', 'crPadTitre', '✍️ Signature de ' + nom));
    boite.appendChild(crEl('div', 'crAide', 'Signe avec le doigt dans le cadre, puis « Valider ».'));
    const c = document.createElement('canvas');
    c.className = 'crPadToile';
    boite.appendChild(c);
    const r = crEl('div', 'btn-row');
    const fermer = v => { fond.remove(); window.removeEventListener('resize', taille); fini(v); };
    const effacer = crBouton('🧽 Effacer', '', () => { x.clearRect(0, 0, c.width, c.height); traits = 0; });
    r.append(crBouton('Annuler', '', () => fermer(null)), effacer, crBouton('✅ Valider', 'btn-primary', () => {
      if(!traits){ showToast('⚠️ Rien n’est signé.'); return; }
      fermer(crSignatureRecadree(c));
    }));
    boite.appendChild(r);
    fond.appendChild(boite);
    document.body.appendChild(fond);
    const x = c.getContext('2d');
    let traits = 0;
    const taille = () => {
      const k = window.devicePixelRatio || 1;
      const l = c.clientWidth, h = c.clientHeight;
      c.width = Math.round(l * k); c.height = Math.round(h * k);
      x.setTransform(k, 0, 0, k, 0, 0);
      x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#17286e'; x.lineWidth = 2.6;
      traits = 0;
    };
    taille();
    window.addEventListener('resize', taille);
    let dernier = null;
    const point = ev => { const b = c.getBoundingClientRect(); return { x: ev.clientX - b.left, y: ev.clientY - b.top }; };
    c.addEventListener('pointerdown', ev => { ev.preventDefault(); c.setPointerCapture(ev.pointerId); dernier = point(ev); x.beginPath(); x.arc(dernier.x, dernier.y, 1.2, 0, 7); x.fillStyle = '#17286e'; x.fill(); traits++; });
    c.addEventListener('pointermove', ev => {
      if(!dernier) return;
      ev.preventDefault();
      const p = point(ev);
      x.beginPath(); x.moveTo(dernier.x, dernier.y);
      x.quadraticCurveTo(dernier.x, dernier.y, (dernier.x + p.x) / 2, (dernier.y + p.y) / 2);
      x.lineTo(p.x, p.y); x.stroke();
      dernier = p;
    });
    const fin = () => { dernier = null; };
    c.addEventListener('pointerup', fin); c.addEventListener('pointercancel', fin); c.addEventListener('pointerleave', fin);
  });
}
function crSignatureRecadree(c){
  const x = c.getContext('2d');
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for(let y = 0; y < c.height; y++) for(let i = 0; i < c.width; i++){
    if(d[(y * c.width + i) * 4 + 3] > 10){ if(i < x0) x0 = i; if(i > x1) x1 = i; if(y < y0) y0 = y; if(y > y1) y1 = y; }
  }
  if(x1 < 0) return null;
  const m = 8;
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(c.width - 1, x1 + m); y1 = Math.min(c.height - 1, y1 + m);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const k = Math.min(1, 700 / w);
  const s = document.createElement('canvas'); s.width = Math.round(w * k); s.height = Math.round(h * k);
  s.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, s.width, s.height);
  return s.toDataURL('image/png');
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-courriers.js'] = true;
