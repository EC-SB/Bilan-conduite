/* Déployé le 13/10/2026 à 10:57 — v1163 */
/* ============================================================
   ec-photos-profil.js — 🖼️ LES PHOTOS À LA PLACE DES INITIALES

   David, le 13 octobre : « laisse-moi la possibilité de mettre une
   image ici à la place des initiales, sous format rond, que l'élève
   peut changer s'il veut ; pour l'équipe chacun peut mettre ce qu'il
   veut ; pour les groupes c'est le bureau qui décide, et les admins
   peuvent changer toutes les photos comme ils veulent, de tout le
   monde et des groupes. Quand il n'y a pas de photo, laisse les
   initiales. »

   Ses réponses au schéma : les initiales en rond aussi ; la photo
   aussi dans les bulles du fil, comme Messenger ; une photo du
   bureau choisie par les administrateurs ; et la photo de l'élève
   aussi en tête de son dossier et sur Mes prochains cours.

   ⚠️ UNE SEULE CARTE DES PHOTOS, LUE UNE FOIS. Le Worker rend toutes
   les photos d'un coup, chacune par un lien signé qui reste le même
   pendant des heures : le navigateur les garde, et chaque écran qui
   montre quelqu'un — la liste, le fil, le dossier, la carte d'un
   cours — lit la même carte. Personne ne redemande une photo.

   ⚠️ LES CLÉS SONT CELLES DU WORKER : « eleve:<nom normalisé> »,
   « user:<nom normalisé> », « groupe:<id> », « bureau ». Le nom se
   normalise comme partout dans la messagerie (normaliserMessagerie).
   ============================================================ */

let photosProfilEC = {};
let photosProfilLuesA = 0;
let photosProfilEnCours = null;
const PHOTOS_PROFIL_FRAICHES = 30 * 60 * 1000;   /* les liens tiennent au moins une heure */
const PHOTO_PROFIL_COTE = 256;

function normaliserPourPhoto(v){
  return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function clePhotoProfil(genre, v){
  if(genre === 'bureau') return 'bureau';
  if(genre === 'groupe') return 'groupe:' + String(v || '');
  const n = normaliserPourPhoto(v);
  return n ? genre + ':' + n : '';
}

function lienPhotoProfil(cle){
  const l = cle && photosProfilEC[cle];
  if(!l) return '';
  const base = (typeof CONFIG !== 'undefined' && CONFIG.WORKER_URL) || '';
  return base + l;
}

/* Rend true si la carte a changé — l'appelant redessine alors. */
async function chargerPhotosProfil(force){
  if(!force && photosProfilLuesA && Date.now() - photosProfilLuesA < PHOTOS_PROFIL_FRAICHES){
    return false;
  }
  if(photosProfilEnCours) return photosProfilEnCours;
  photosProfilEnCours = (async () => {
    let change = false;
    try{
      const d = await appelPrep({ action: 'photosProfil' });
      if(d && d.photos){
        change = JSON.stringify(d.photos) !== JSON.stringify(photosProfilEC);
        photosProfilEC = d.photos;
        photosProfilLuesA = Date.now();
      }
    }catch(e){ /* sans photos : les initiales, comme avant */ }
    photosProfilEnCours = null;
    return change;
  })();
  return photosProfilEnCours;
}

function initialesPourPhoto(nom){
  const mots = String(nom || '').replace(/[^\p{L}\s'-]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if(!mots.length) return '';
  return (mots[0].charAt(0) + (mots.length > 1 ? mots[mots.length - 1].charAt(0) : '')).toUpperCase();
}

/* Remplit un élément : la photo si elle existe, sinon ce qu'il
   portait (les initiales). ⚠️ UNE PHOTO QUI NE CHARGE PAS rend les
   initiales — jamais un carré cassé. */
function poserPhotoDans(el, cle, repli){
  const lien = lienPhotoProfil(cle);
  el.classList.toggle('aPhoto', !!lien);
  if(!lien){ el.textContent = repli || ''; return el; }
  el.textContent = '';
  const i = document.createElement('img');
  i.alt = '';
  i.loading = 'lazy';
  i.decoding = 'async';
  i.src = lien;
  i.addEventListener('error', () => {
    el.classList.remove('aPhoto');
    el.textContent = repli || '';
  });
  el.appendChild(i);
  return el;
}

/* Un rond tout fait : photo, ou initiales. */
function rondPhoto(cle, nom, taille, classe){
  const r = document.createElement('span');
  r.className = 'phRond' + (classe ? ' ' + classe : '');
  if(taille){
    r.style.width = taille + 'px';
    r.style.height = taille + 'px';
    r.style.fontSize = Math.max(10, Math.round(taille * 0.34)) + 'px';
  }
  return poserPhotoDans(r, cle, initialesPourPhoto(nom));
}

/* La photo d'un fil : le groupe, l'élève, ou le collègue en face. */
function clePhotoDuFil(c, membres){
  if(!c) return '';
  if(c.genre === 'groupe') return clePhotoProfil('groupe', c.id);
  if(c.eleve) return clePhotoProfil('eleve', c.eleve);
  const moi = normaliserPourPhoto((typeof ACCES !== 'undefined' && ACCES.moniteur) || '');
  const autres = (membres || c.membres || [])
    .filter(m => m.genre === 'user' && normaliserPourPhoto(m.qui) !== moi);
  return autres.length === 1 ? clePhotoProfil('user', autres[0].qui) : '';
}

function clePhotoDuMessage(m){
  if(!m) return '';
  if(m.auteurGenre === 'eleve') return clePhotoProfil('eleve', m.auteur);
  if(m.auteurGenre === 'user') return clePhotoProfil('user', m.auteur);
  return '';
}

/* ------------------------------------------------------------
   QUI CHANGE QUOI — la même règle que le Worker, qui seul décide
   ------------------------------------------------------------ */
function estAdminDesPhotosEC(){
  return (typeof aDroit === 'function' && aDroit('messagerie_admin')) ||
         (typeof ACCES !== 'undefined' && ACCES.role === 'admin');
}
function peutChangerPhotoGroupe(){
  return estAdminDesPhotosEC() || (typeof aDroit === 'function' && aDroit('messagerie_bureau'));
}

/* ------------------------------------------------------------
   REDESSINER CE QUI MONTRE DES GENS — après un changement, ou quand
   la carte arrive. Chaque écran se redessine s'il est là.
   ------------------------------------------------------------ */
function repeindreLesPhotos(){
  try{ if(typeof dessinerLaListeMessagerie === 'function' && typeof zoneListeMsg === 'function' && zoneListeMsg()) dessinerLaListeMessagerie(); }catch(e){}
  try{ if(typeof filOuvertEC !== 'undefined' && filOuvertEC && typeof dessinerLeFil === 'function') dessinerLeFil(); }catch(e){}
  try{ if(typeof ckDessinerLeRail === 'function') ckDessinerLeRail(); }catch(e){}
  try{ if(typeof elevePageOuverte !== 'undefined' && elevePageOuverte && typeof dessinerPageEleve === 'function') dessinerPageEleve(); }catch(e){}
  try{ if(typeof afficherPrepares === 'function') afficherPrepares(false, true); }catch(e){}
}

/* La carte, puis un redessin seulement si elle a changé. */
function photosPuisRedessin(){
  chargerPhotosProfil(false).then(change => { if(change) repeindreLesPhotos(); }).catch(() => {});
}

/* ------------------------------------------------------------
   RÉDUIRE : un carré au centre, 256 px, en JPEG

   ⚠️ LE CANVAS EFFACE LES EXIF, et c'est voulu : une photo de
   téléphone porte le lieu où elle a été prise. Même règle que les
   photos de la messagerie (reduireLaPhoto).
   ------------------------------------------------------------ */
async function reduirePhotoProfil(fichier){
  if(!fichier || !/^image\//.test(fichier.type || '')) throw new Error('Ce fichier n’est pas une image.');
  if(fichier.size > 25 * 1024 * 1024) throw new Error('Cette image est trop lourde (25 Mo au plus).');
  const img = (typeof lireLImage === 'function') ? await lireLImage(fichier) : null;
  if(!img) throw new Error('Image illisible.');
  const l0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight;
  if(!l0 || !h0) throw new Error('Image illisible.');
  const cote = Math.min(l0, h0);
  const t = document.createElement('canvas');
  t.width = t.height = PHOTO_PROFIL_COTE;
  const c = t.getContext('2d');
  c.fillStyle = '#FFFFFF';
  c.fillRect(0, 0, PHOTO_PROFIL_COTE, PHOTO_PROFIL_COTE);
  c.drawImage(img, (l0 - cote) / 2, (h0 - cote) / 2, cote, cote, 0, 0, PHOTO_PROFIL_COTE, PHOTO_PROFIL_COTE);
  if(img.close) try{ img.close(); }catch(e){}
  return t.toDataURL('image/jpeg', 0.86);
}

/* ------------------------------------------------------------
   LA FENÊTRE — la même pour soi, pour un élève, un collègue, un
   groupe ou le bureau. « quoi » : { cible, nom, id, titre }.
   ------------------------------------------------------------ */
function ouvrirFenetrePhotoProfil(quoi){
  const cible = quoi.cible;
  const cle = cible === 'moi' ? clePhotoProfil('user', (typeof ACCES !== 'undefined' && ACCES.moniteur) || '')
            : cible === 'groupe' ? clePhotoProfil('groupe', quoi.id)
            : cible === 'bureau' ? 'bureau'
            : clePhotoProfil(cible, quoi.nom);
  const sienne = cible === 'moi';
  let flux = null;

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const m = document.createElement('div');
  m.className = 'modal phFenetre';
  m.style.cssText = 'max-width:min(420px,94vw);text-align:center;';

  const titre = document.createElement('h3');
  titre.style.marginTop = '0';
  titre.textContent = quoi.titre || (sienne ? 'Ta photo' : 'La photo de ' + (quoi.nom || ''));
  m.appendChild(titre);

  const cadre = document.createElement('div');
  cadre.className = 'phApercu';
  m.appendChild(cadre);
  const peindreApercu = () => {
    cadre.innerHTML = '';
    const r = rondPhoto(cle, cible === 'groupe' || cible === 'bureau' ? '' : (sienne ? ACCES.moniteur : quoi.nom), 128, 'phGrand');
    if(!r.textContent && !r.querySelector('img')) r.textContent = cible === 'bureau' ? '🏢' : '👥';
    cadre.appendChild(r);
  };
  peindreApercu();

  const aide = document.createElement('div');
  aide.className = 'phAide';
  aide.textContent = sienne
    ? 'Elle remplace tes initiales dans la messagerie, pour toute l’équipe.'
    : cible === 'groupe' ? 'Elle s’affiche devant le groupe, pour tous ses membres.'
    : cible === 'bureau' ? 'Les élèves la voient devant leur fil « Le bureau ».'
    : 'Elle remplace ses initiales, pour tout le monde. Tu peux la changer parce que tu es administrateur — c’est noté au journal.';
  m.appendChild(aide);

  const rangee = (cls) => { const r = document.createElement('div'); r.className = 'btn-row ' + (cls || ''); m.appendChild(r); return r; };
  const bouton = (r, texte, classe, faire) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (classe || 'btn-secondary');
    b.textContent = texte;
    b.addEventListener('click', faire);
    r.appendChild(b);
    return b;
  };

  const arreterCamera = () => {
    if(flux){ try{ flux.getTracks().forEach(p => p.stop()); }catch(e){} }
    flux = null;
  };
  const fermer = () => { arreterCamera(); if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };

  const envoyer = async (corps, ok) => {
    m.classList.add('occupe');
    try{
      const d = await appelPrep(Object.assign({ action: 'photoProfilPoser', cible: cible,
        nom: quoi.nom || '', id: quoi.id || '' }, corps));
      if(d && d.status === 'error') throw new Error(d.message || 'refusé');
      if(d && d.photos){ photosProfilEC = d.photos; photosProfilLuesA = Date.now(); }
      if(typeof showToast === 'function') showToast(ok);
      fermer();
      repeindreLesPhotos();
    }catch(e){
      m.classList.remove('occupe');
      if(typeof showToast === 'function') showToast('Pas enregistrée : ' + ((e && e.message) || e));
    }
  };
  const depuisFichier = async (f) => {
    try{ await envoyer({ photo: await reduirePhotoProfil(f) }, 'Photo enregistrée ✅'); }
    catch(e){ if(typeof showToast === 'function') showToast((e && e.message) || String(e)); }
  };
  const choisir = (appareil) => {
    const z = document.createElement('input');
    z.type = 'file';
    z.accept = 'image/*';
    if(appareil) z.setAttribute('capture', sienne ? 'user' : 'environment');
    z.style.display = 'none';
    document.body.appendChild(z);
    z.addEventListener('change', () => {
      const f = z.files && z.files[0];
      if(z.parentNode) z.parentNode.removeChild(z);
      if(f) depuisFichier(f);
    });
    z.click();
  };

  /* 📷 Sur un téléphone, l'appareil photo s'ouvre ; sur un ordinateur,
     la webcam dans la fenêtre, puis « Déclencher ». */
  const prendre = async () => {
    const tactile = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    if(tactile || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)){ choisir(true); return; }
    try{ flux = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
    catch(e){ choisir(false); return; }
    cadre.innerHTML = '';
    const v = document.createElement('video');
    v.className = 'phVideo';
    v.muted = true; v.playsInline = true; v.setAttribute('playsinline', '');
    v.srcObject = flux;
    cadre.appendChild(v);
    try{ const j = v.play(); if(j && j.catch) j.catch(() => {}); }catch(e){}
    r1.style.display = 'none';
    r2.style.display = 'none';
    const r3 = rangee();
    bouton(r3, 'Annuler', 'btn-secondary', () => { arreterCamera(); r3.remove(); r1.style.display = ''; r2.style.display = ''; peindreApercu(); });
    bouton(r3, '📸 Déclencher', 'btn-primary', async () => {
      const l = v.videoWidth, h = v.videoHeight;
      if(!l || !h){ if(typeof showToast === 'function') showToast('La caméra n’est pas encore prête.'); return; }
      const t = document.createElement('canvas');
      t.width = l; t.height = h;
      t.getContext('2d').drawImage(v, 0, 0, l, h);
      arreterCamera();
      t.toBlob(b => { if(b) depuisFichier(new File([b], 'photo.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', 0.92);
    });
  };

  const r1 = rangee('phDeux');
  bouton(r1, '📷 Prendre une photo', 'btn-secondary', prendre).id = 'phPrendre';
  bouton(r1, '🖼️ Choisir une photo', 'btn-secondary', () => choisir(false)).id = 'phChoisir';
  const r2 = rangee();
  if(lienPhotoProfil(cle)){
    const x = bouton(r2, '🗑️ Retirer — revenir aux initiales', 'btn-secondary phRetirer',
      () => envoyer({ retirer: '1' }, 'Photo retirée ✅'));
    x.id = 'phRetirer';
  }
  /* Fermer sur sa propre ligne, sous « Retirer » — comme le schéma. */
  bouton(lienPhotoProfil(cle) ? rangee() : r2, 'Fermer', 'btn-secondary', fermer).id = 'phFermer';

  fond.appendChild(m);
  fond.addEventListener('click', ev => { if(ev.target === fond) fermer(); });
  document.body.appendChild(fond);
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-photos-profil.js'] = true;
