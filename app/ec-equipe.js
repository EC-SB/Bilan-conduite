/* Déployé le 16/10/2026 à 16:18 — v1195 */
/* ============================================================
   ec-equipe.js — 👥 L'ÉQUIPE et 🏫 L'ÉCOLE — v1189

   David, le 16 octobre : suivre les moniteurs (leurs papiers, leurs
   arrêts, leurs heures, leurs résultats) et les échéances de l'école
   (agrément, réactualisation de Chrystel, label qualité, Qualiopi,
   garantie financière). Schéma v2 validé le 16/10.

   · Outils › L'équipe › 👥 Équipe : la liste, puis une fiche à
     quatre onglets — 📄 Papiers · 🏖️ Absences · ⏱️ Heures ·
     📈 Résultats.
   · Outils › L'équipe › 🏫 L'école : les échéances de l'école.
   · ⋯ › 👤 Ma fiche : chacun ouvre SA fiche, dépose ses papiers et
     ses arrêts (un administrateur valide).
   · Le bandeau : la famille « 📄 Papiers et échéances ».
   · La liste et 💶 Paie se suivent : le formulaire d'une personne EST
     celui du salarié (ouvrirSalarie, ec-paie.js), avec ce qui lui
     manquait. Le Worker fait le reste (accorderEquipeEtPaie).

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const GENRES_PAPIER_EC = [
  ['autorisation', '🪪', 'Autorisation d’enseigner'],
  ['medical',      '🩺', 'Certificat médical (médecin agréé)'],
  ['permis',       '🚗', 'Permis de conduire'],
  ['travail',      '🏥', 'Médecine du travail'],
  ['diplome',      '🎓', 'Diplôme'],
  ['formation',    '📚', 'Formation'],
  ['atre',         '⏳', 'ATRE (autorisation temporaire)'],
  ['autre',        '📄', 'Autre document']
];
const GENRES_ECOLE_EC = [
  ['agrement',        '📜', 'Agrément préfectoral'],
  ['reactualisation', '🎓', 'Réactualisation des connaissances de l’exploitant'],
  ['label',           '🏅', 'Label qualité'],
  ['qualiopi',        '✅', 'Qualiopi'],
  ['garantie',        '🛡️', 'Garantie financière'],
  ['autre',           '📌', 'Autre échéance']
];
const FONCTIONS_EC = [['enseigne', '🎓 Enseigne la conduite'], ['bureau', '🏢 Bureau'], ['autre', '✳️ Autre']];
const CATEGORIES_EC = ['B', 'BE', 'A', 'A2', 'A1', 'AM'];

let equipeEC = { liste: null, filtre: 'tous', fiche: null, onglet: 'papiers', mois: '', comptes: null };
let alertesEquipeEC = { lignes: [], aValider: 0, lu: false, estAdmin: 0 };

/* ---------- petites briques ---------- */
const eEq = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function jourEq(iso){
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}
function isoAujEq(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function isoPlusMoisEq(iso, n){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if(!m) return '';
  return new Date(Date.UTC(+m[1], +m[2] - 1 + n, +m[3])).toISOString().slice(0, 10);
}
/* 0 rien · 4 dans les 4 mois · 2 dans les 2 mois · 9 expiré — même règle que le Worker */
function niveauEq(iso){
  if(!iso) return 0;
  const a = isoAujEq();
  if(iso < a) return 9;
  if(iso <= isoPlusMoisEq(a, 2)) return 2;
  if(iso <= isoPlusMoisEq(a, 4)) return 4;
  return 0;
}
function moisAvantEq(iso){
  const a = new Date(isoAujEq() + 'T12:00:00'), b = new Date(iso + 'T12:00:00');
  const m = Math.round((b - a) / (30.4 * 86400000));
  return m <= 1 ? 'moins d’un mois' : m + ' mois';
}
const PAST_EQ = {
  ok:   ['🟢', 'À jour', 'var(--accent-text)', 'rgba(182,255,14,.16)'],
  bien: ['🟠', '', 'var(--warn-text)', 'var(--warn-bg)'],
  ko:   ['🔴', 'Expiré', 'var(--red)', 'rgba(229,72,77,.10)'],
  vide: ['⚪', 'À renseigner', 'var(--muted)', 'rgba(127,127,127,.12)'],
  att:  ['⏳', 'À valider', 'var(--warn-text)', 'rgba(255,190,60,.22)'],
  ref:  ['✖', 'Refusé', 'var(--muted)', 'rgba(127,127,127,.12)']
};
function pastilleEq(k, t){
  const p = PAST_EQ[k] || PAST_EQ.vide;
  return '<span class="eqPast" style="background:' + p[3] + ';color:' + p[2] + ';">' + p[0] + ' ' + eEq(t || p[1]) + '</span>';
}
function etatDeLEcheance(iso){
  const n = niveauEq(iso);
  return n === 9 ? ['ko', 'Expiré'] : n ? ['bien', moisAvantEq(iso)] : ['ok', ''];
}
function genreEq(liste, cle){ return liste.find(g => g[0] === cle) || liste[liste.length - 1]; }
function petitBoutonEq(texte, titre, faire, fort){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'eqPetit' + (fort ? ' fort' : '');
  b.textContent = texte;
  if(titre) b.title = titre;
  b.addEventListener('click', ev => { ev.stopPropagation(); faire(b); });
  return b;
}

/* ============================================================
   👁️ L'INTERRUPTEUR « IL LE VOIT » — v1194

   David, le 16 octobre : « mets-moi des interrupteurs au bout de
   chaque chose pour voir ce qu'ils peuvent voir ou non » — une ligne,
   un interrupteur, personne par personne, tout caché au départ. Le
   tri se fait dans le Worker : ce qui est coupé ne part pas vers la
   personne (voir « CE QUE LA PERSONNE VOIT DE SA FICHE »).
   ============================================================ */
const GENRES_MULTIPLES_EQ = { formation: 1, diplome: 1, autre: 1 };
function cleVuePapierEq(p){
  return GENRES_MULTIPLES_EQ[p.genre] && p.id ? 'papier:' + p.id : 'papier:' + p.genre;
}
/* La page de l'administration pose les interrupteurs ; celle de la
   personne lit seulement ce qui lui est montré. */
function reglageDesVuesEq(d){ return !!(d && d.estAdmin && d.peutModifier); }
function voitEq(d, cle){
  if(d && d.estAdmin) return true;
  return ((d && d.vues) || []).indexOf(cle) !== -1;
}
function interrupteurVueEq(d, cle){
  const f = d.fiche;
  const qui = f.compte || f.nom;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'eqVue';
  const peindre = () => {
    const oui = (d.vues || []).indexOf(cle) !== -1;
    b.classList.toggle('oui', oui);
    b.setAttribute('aria-pressed', oui ? 'true' : 'false');
    b.title = oui ? qui + ' le voit dans sa fiche — appuie pour le lui cacher'
                  : 'Caché à ' + qui + ' — appuie pour le lui montrer';
    b.innerHTML = '<span class="eqVueRail"><span class="eqVueBille"></span></span><span class="eqVueOeil">' + (oui ? '👁️' : '🙈') + '</span>';
  };
  peindre();
  b.addEventListener('click', async ev => {
    ev.stopPropagation();
    d.vues = d.vues || [];
    const avant = d.vues.indexOf(cle) !== -1;
    if(avant) d.vues = d.vues.filter(k => k !== cle); else d.vues.push(cle);
    peindre();
    b.disabled = true;
    try{ await appelPrep({ action: 'equipeVue', personne: f.id, cle: cle, visible: avant ? '0' : '1' }); }
    catch(e){
      if(avant) d.vues.push(cle); else d.vues = d.vues.filter(k => k !== cle);
      peindre();
      showToast('Impossible : ' + e.message);
    }finally{ b.disabled = false; }
  });
  return b;
}

/* ---------- un fichier choisi : une photo réduite, ou un PDF ---------- */
async function fichierPourLEquipe(f){
  if(!f) return '';
  if(f.type === 'application/pdf'){
    if(f.size > 10 * 1024 * 1024) throw new Error('PDF trop lourd (10 Mo au plus).');
    return await new Promise((ok, ko) => { const l = new FileReader(); l.onload = () => ok(l.result); l.onerror = () => ko(new Error('Fichier illisible.')); l.readAsDataURL(f); });
  }
  if(!/^image\//.test(f.type || '')) throw new Error('Il faut une photo ou un PDF.');
  const u = URL.createObjectURL(f);
  try{
    const img = await new Promise((ok, ko) => { const x = new Image(); x.onload = () => ok(x); x.onerror = () => ko(new Error('Photo illisible.')); x.src = u; });
    /* 2000 px : un papier doit rester lisible, numéro compris */
    const k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  }finally{ URL.revokeObjectURL(u); }
}
/* Le bloc « 📷 Prendre une photo · 📄 Choisir un fichier » d'un formulaire */
function blocFichierEq(boite, libelle, aide){
  const z = document.createElement('div');
  z.innerHTML = '<label>' + eEq(libelle) + '</label>' +
    '<div class="eqDuoBt"><button type="button" class="btn btn-secondary" data-f="photo">📷 Prendre une photo</button>' +
    '<button type="button" class="btn btn-secondary" data-f="fichier">📄 Choisir un fichier</button></div>' +
    '<div class="eqFichierChoisi" style="font-size:12px;margin:6px 0 4px;"></div>' +
    (aide ? '<div class="eqAide">' + eEq(aide) + '</div>' : '');
  const etat = { fichier: null };
  const dit = z.querySelector('.eqFichierChoisi');
  const choisir = (camera) => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = camera ? 'image/*' : 'image/*,application/pdf';
    if(camera) i.setAttribute('capture', 'environment');
    i.addEventListener('change', () => {
      etat.fichier = i.files && i.files[0] || null;
      dit.textContent = etat.fichier ? '📎 ' + etat.fichier.name : '';
    });
    i.click();
  };
  z.querySelector('[data-f="photo"]').addEventListener('click', () => choisir(true));
  z.querySelector('[data-f="fichier"]').addEventListener('click', () => choisir(false));
  boite.appendChild(z);
  return etat;
}
async function ouvrirUnScan(quoi, id){
  try{
    const d = await appelPrep({ action: 'equipeScan', quoi: quoi, id: id });
    if(d && d.lien) window.open(d.lien, '_blank', 'noopener');
  }catch(e){ showToast('Impossible : ' + e.message); }
}

/* ============================================================
   👥 LA LISTE
   ============================================================ */
async function afficherEquipe(){
  const z = $('equipeZone');
  if(!z) return;
  if(equipeEC.fiche) return dessinerFicheEquipe(z);
  z.innerHTML = '<div class="empty">Lecture…</div>';
  try{
    const d = await appelPrep({ action: 'equipeListe' });
    equipeEC.liste = (d && d.equipe) || [];
    equipeEC.paieLue = !!(d && d.paieLue);
  }catch(e){
    z.innerHTML = '<div class="empty">⚠️ ' + eEq(e.message) + '</div>';
    return;
  }
  dessinerListeEquipe(z);
}

function etatDeLaPersonne(p){
  if(p.aValider) return ['att', p.aValider + ' à valider'];
  if(p.prochaine && p.prochaine.niveau === 9) return ['ko', 'Expiré'];
  if(p.prochaine && p.prochaine.niveau) return ['bien', moisAvantEq(p.prochaine.date)];
  if(p.manque && p.manque.length) return ['vide', 'À renseigner'];
  return ['ok', ''];
}
function phraseDeLaPersonne(p){
  if(p.prochaine && p.prochaine.niveau === 9) return p.prochaine.quoi + ' expiré(e) le ' + jourEq(p.prochaine.date);
  if(p.prochaine && p.prochaine.niveau) return p.prochaine.quoi + ' : échéance le ' + jourEq(p.prochaine.date);
  if(p.manque && p.manque.length){
    const n = { autorisation: 'autorisation d’enseigner', medical: 'certificat médical', travail: 'médecine du travail' };
    return 'À renseigner : ' + p.manque.map(m => n[m] || m).join(', ');
  }
  if(p.prochaine) return 'Prochaine échéance : ' + p.prochaine.quoi + ', ' + jourEq(p.prochaine.date);
  return 'Aucune échéance enregistrée';
}
function roleDeLaPersonne(p){
  const f = p.fonction === 'enseigne' ? 'Enseigne' : p.fonction === 'bureau' ? 'Bureau' : p.fonction === 'autre' ? 'Autre' : 'Fonction à préciser';
  return f + (p.categories ? ' · ' + p.categories.split(',').join(' · ') : '') + (p.site ? ' · ' + p.site : '');
}

function dessinerListeEquipe(z){
  const l = equipeEC.liste || [];
  const actifs = l.filter(p => p.actif);
  const anciens = l.filter(p => !p.actif);
  const n = (f) => actifs.filter(f).length;
  const filtres = [
    ['tous', 'Tous ' + actifs.length, () => true],
    ['enseigne', '🎓 Enseignants ' + n(p => p.fonction === 'enseigne'), p => p.fonction === 'enseigne'],
    ['bureau', '🏢 Bureau ' + n(p => p.fonction === 'bureau'), p => p.fonction === 'bureau'],
    ['valider', '⏳ À valider ' + actifs.reduce((t, p) => t + (p.aValider || 0), 0), p => p.aValider > 0]
  ];
  if(anciens.length) filtres.push(['anciens', '📦 Anciens ' + anciens.length, () => true]);
  const choisi = filtres.find(f => f[0] === equipeEC.filtre) || filtres[0];
  const montres = (choisi[0] === 'anciens' ? anciens : actifs).filter(choisi[2]);

  z.innerHTML = '';
  const aide = document.createElement('div');
  aide.className = 'eqAide';
  aide.style.marginBottom = '12px';
  aide.textContent = 'Toute l’équipe salariée, et ceux qui enseignent hors paie. Cette liste et 💶 Paie se suivent : une personne créée ici apparaît dans la Paie, et l’inverse ; un nom changé ou un départ suit des deux côtés.' +
    (equipeEC.paieLue ? '' : ' (La Paie n’a pas pu être relue : la liste est celle d’hier.)');
  z.appendChild(aide);

  const f = document.createElement('div');
  f.className = 'eqFiltres';
  filtres.forEach(x => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (x === choisi ? 'btn-primary' : 'btn-secondary');
    b.textContent = x[1];
    b.addEventListener('click', () => { equipeEC.filtre = x[0]; dessinerListeEquipe(z); });
    f.appendChild(b);
  });
  z.appendChild(f);

  if(peutModifier('equipe')){
    const b = document.createElement('button');
    b.className = 'btn btn-primary';
    b.style.margin = '8px 0 2px';
    b.textContent = '➕ Ajouter quelqu’un à l’équipe';
    b.addEventListener('click', () => ouvrirSalarie(null, { depuis: 'equipe' }));
    z.appendChild(b);
  }

  if(!montres.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = choisi[0] === 'valider' ? 'Rien à valider.' : 'Personne ici pour le moment.';
    z.appendChild(v);
  }
  montres.forEach(p => {
    const [k, t] = etatDeLaPersonne(p);
    const d = document.createElement('div');
    d.className = 'eqLigne eqClic';
    d.innerHTML =
      '<span class="eqRond"></span>' +
      '<span class="eqCorps"><strong>' + eEq(p.nom) + '</strong> <span class="eqGris">· ' + eEq(roleDeLaPersonne(p)) + '</span>' +
        '<div style="font-size:12.5px;color:' + PAST_EQ[k][2] + ';">' + eEq(phraseDeLaPersonne(p)) + '</div>' +
        '<div class="eqGris">' + (p.dansPaie ? '💶 dans la paie' : p.horsPaie ? '🚫 hors paie' : '💶 plus dans la paie') +
          (p.compte ? ' · 🔑 compte « ' + eEq(p.compte) + ' »' : ' · 🔑 aucun compte relié') + '</div></span>' +
      '<span class="eqDroite">' + pastilleEq(k, t) + '<span class="eqGris" style="font-size:18px;">›</span></span>';
    /* 🖼️ v1195 — la photo de la messagerie, à la place des initiales */
    poserPhotoEq(d.querySelector('.eqRond'), p);
    d.addEventListener('click', () => ouvrirFicheEquipe(p.id));
    z.appendChild(d);
  });
  if(typeof chargerPhotosProfil === 'function'){
    chargerPhotosProfil(false).then(change => { if(change) z.querySelectorAll('.eqRond').forEach((r, i) => poserPhotoEq(r, montres[i])); }).catch(() => {});
  }
}

/* ============================================================
   🖼️ LA PHOTO DE LA MESSAGERIE — v1195

   David : « il faut que la photo de la messagerie soit liée ici aussi
   et qu'on puisse la changer ici aussi ». C'est LA MÊME : même clé
   (« user:<compte> »), même fenêtre (ouvrirFenetrePhotoProfil), mêmes
   règles — chacun la sienne, les administrateurs celle de tout le
   monde. La changer ici la change dans la messagerie, et l'inverse.
   ============================================================ */
function initialesEq(nom){
  return (nom || '?').trim().split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
}
function clePhotoEq(f){
  return (typeof clePhotoProfil === 'function') ? clePhotoProfil('user', f.compte || f.nom) : '';
}
function poserPhotoEq(el, f){
  if(!el || !f) return;
  el.setAttribute('data-photo-eq', f.compte || f.nom || '');
  el.setAttribute('data-nom', f.nom || '');
  const crayon = el.querySelector('.eqRondCrayon');
  if(typeof poserPhotoDans === 'function') poserPhotoDans(el, clePhotoEq(f), initialesEq(f.nom));
  else el.textContent = initialesEq(f.nom);
  if(crayon) el.appendChild(crayon);
}
/* Après un changement de photo : la fiche et la liste se repeignent */
function repeindreEquipeApresPhoto(){
  try{
    document.querySelectorAll('[data-photo-eq]').forEach(el => {
      const f = { nom: el.getAttribute('data-nom') || '', compte: el.getAttribute('data-photo-eq') || '' };
      poserPhotoEq(el, f);
    });
  }catch(e){}
}

/* ============================================================
   👥 LA FICHE
   ============================================================ */
async function ouvrirFicheEquipe(id, onglet){
  equipeEC.fiche = { id: id, d: null };
  equipeEC.onglet = onglet || equipeEC.onglet || 'papiers';
  /* Dans l'appli pour l'administration ; en fenêtre pour « Ma fiche » */
  const z = $('equipeZone');
  if(aDroit('equipe') && z){
    if(typeof afficherOnglet === 'function'){ try{ afficherOnglet('outils'); afficherVue('outils', 'equipe'); return; }catch(e){} }
    return dessinerFicheEquipe(z);
  }
  return ouvrirMaFicheEnFenetre(id);
}

async function chargerFicheEquipe(){
  const d = await appelPrep({ action: 'equipeFiche', id: equipeEC.fiche.id });
  equipeEC.fiche.d = d;
  return d;
}

async function dessinerFicheEquipe(z, enFenetre){
  z.innerHTML = '<div class="empty">Lecture…</div>';
  let d;
  try{ d = await chargerFicheEquipe(); }
  catch(e){ z.innerHTML = '<div class="empty">⚠️ ' + eEq(e.message) + '</div>'; return; }
  const f = d.fiche;
  z.innerHTML = '';

  const h = document.createElement('div');
  h.className = 'eqEntete';
  if(!enFenetre){
    const r = document.createElement('button');
    r.className = 'btn btn-secondary';
    r.style.cssText = 'width:auto;margin:0;padding:8px 12px;';
    r.textContent = '← L’équipe';
    r.addEventListener('click', () => { equipeEC.fiche = null; afficherEquipe(); });
    h.appendChild(r);
  }
  /* 🖼️ v1195 — sa photo, celle de la messagerie. Un appui la change :
     la sienne pour la personne, celle de tout le monde pour un admin. */
  const ph = document.createElement('button');
  ph.type = 'button';
  ph.className = 'eqRond eqRondFiche';
  ph.setAttribute('data-photo-eq', f.compte || f.nom);
  ph.setAttribute('data-nom', f.nom);
  poserPhotoEq(ph, f);
  const changePhoto = typeof ouvrirFenetrePhotoProfil === 'function' &&
    (!d.estAdmin || (typeof ACCES !== 'undefined' && (ACCES.role === 'admin' || (typeof aDroit === 'function' && aDroit('messagerie_admin')))));
  if(changePhoto){
    ph.title = 'Changer la photo (la même que dans la messagerie)';
    ph.insertAdjacentHTML('beforeend', '<span class="eqRondCrayon">📷</span>');
    ph.addEventListener('click', () => ouvrirFenetrePhotoProfil(d.estAdmin
      ? { cible: 'user', nom: f.compte || f.nom, titre: 'La photo de ' + f.nom }
      : { cible: 'moi' }));
  }else ph.disabled = true;
  h.appendChild(ph);
  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:180px;';
  t.innerHTML = '<div style="font-weight:800;font-size:17px;">' + eEq(f.nom) + (f.actif ? '' : ' <span class="eqGris">· ancien</span>') + '</div>' +
    '<div class="eqGris">' + eEq(roleDeLaPersonne(f)) +
      (f.compte ? ' · 🔑 compte « ' + eEq(f.compte) + ' »' : '') +
      (f.dansPaie ? ' · 💶 dans la paie' + (d.salarie ? ' (' + String(d.salarie.baseHebdo || '').replace('.', ',') + ' h)' : '') : ' · 🚫 hors paie') + '</div>';
  h.appendChild(t);
  if(d.peutModifier){
    const m = document.createElement('button');
    m.className = 'btn btn-secondary';
    m.style.cssText = 'width:auto;margin:0;padding:8px 12px;';
    m.textContent = '✏️ Modifier';
    m.addEventListener('click', () => {
      const s = d.salarie ? Object.assign({}, d.salarie, { id: f.paieId, nom: f.nom }) : null;
      ouvrirSalarie(s, { depuis: 'equipe', fiche: f });
    });
    h.appendChild(m);
  }
  z.appendChild(h);

  const o = document.createElement('div');
  o.className = 'eqOnglets';
  /* 👁️ v1194 — chez la personne, un onglet dont rien ne lui est
     montré n'apparaît pas. Papiers et Absences restent : c'est là
     qu'elle dépose ses papiers et déclare un arrêt. */
  const ongletsVus = [['coord', '🪪 Coordonnées'], ['papiers', '📄 Papiers'], ['absences', '🏖️ Absences'], ['heures', '⏱️ Heures'], ['resultats', '📈 Résultats']]
    .filter(x => d.estAdmin || x[0] === 'papiers' || x[0] === 'absences' ||
                 (d.vues || []).some(k => k.indexOf(x[0] + ':') === 0));
  if(!ongletsVus.some(x => x[0] === equipeEC.onglet)) equipeEC.onglet = 'papiers';
  if(reglageDesVuesEq(d)){
    const a = document.createElement('div');
    a.className = 'eqAide eqAideVue';
    a.innerHTML = '👁️ Les interrupteurs au bout de chaque ligne disent ce que <strong>' + eEq(f.compte || f.nom) +
      '</strong> voit dans ⋯ › 👤 Ma fiche. Tout est caché au départ.' +
      (f.compte ? '' : ' <span style="color:var(--warn-text);">Aucun compte n’est relié à cette fiche : il ne voit rien tant qu’on n’en relie pas un (✏️ Modifier).</span>');
    z.appendChild(a);
  }
  ongletsVus.forEach(x => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (x[0] === equipeEC.onglet ? 'btn-primary' : 'btn-secondary');
    b.textContent = x[1];
    b.addEventListener('click', () => { equipeEC.onglet = x[0]; dessinerFicheEquipe(z, enFenetre); });
    o.appendChild(b);
  });
  z.appendChild(o);

  const corps = document.createElement('div');
  z.appendChild(corps);
  const redessiner = () => dessinerFicheEquipe(z, enFenetre);
  if(equipeEC.onglet === 'coord') dessinerCoordonneesEq(corps, d, redessiner);
  else if(equipeEC.onglet === 'absences') dessinerAbsencesEq(corps, d, redessiner);
  else if(equipeEC.onglet === 'heures') dessinerHeuresEq(corps, d);
  else if(equipeEC.onglet === 'resultats') dessinerResultatsEq(corps, d);
  else dessinerPapiersEq(corps, d, redessiner);
}

/* ---------- 🪪 Coordonnées — v1195 ---------- */
const COORD_EQ = [
  ['adresse',  '🏠', 'Adresse'],
  ['portable', '📱', 'Portable'],
  ['mail',     '✉️', 'Adresse mail'],
  ['rib',      '🏦', 'RIB']
];
function dessinerCoordonneesEq(z, d, redessiner){
  const f = d.fiche;
  const c = d.coord || {};
  let rien = true;
  COORD_EQ.forEach(([k, ic, nom]) => {
    const v = c[k];
    if(v === null || v === undefined) return;          /* caché à la personne */
    rien = false;
    const l = document.createElement('div');
    l.className = 'eqLigne';
    l.style.alignItems = 'flex-start';
    let valeur = '';
    if(k === 'rib'){
      valeur = v.aFichier ? 'Déposé' + (v.par ? ' par ' + eEq(v.par) : '') + (v.le ? ' le ' + new Date(v.le).toLocaleDateString('fr-FR') : '')
                          : '<span class="eqGris">Pas encore déposé</span>';
    }else if(!v){
      valeur = '<span class="eqGris">Pas encore renseigné</span>';
    }else if(k === 'portable'){
      valeur = '<a href="tel:' + eEq(String(v).replace(/[^+0-9]/g, '')) + '">' + eEq(v) + '</a>';
    }else if(k === 'mail'){
      valeur = '<a href="mailto:' + eEq(v) + '">' + eEq(v) + '</a>';
    }else valeur = eEq(v);
    const aide = k === 'mail' ? '<div class="eqGris">La même que dans ⚙️ Accès : les alertes et les mails de l’appli y partent.</div>'
               : k === 'rib' ? '<div class="eqGris">Le document seul (photo ou PDF) : aucun numéro n’est tapé dans l’appli.</div>' : '';
    l.innerHTML = '<span class="eqIc">' + ic + '</span><span class="eqCorps"><strong>' + nom + '</strong>' +
      '<div style="font-size:13.5px;overflow-wrap:anywhere;">' + valeur + '</div>' + aide + '</span>';
    const dr = document.createElement('span');
    dr.className = 'eqDroite';
    if(k === 'rib'){
      if(v.aFichier) dr.appendChild(petitBoutonEq('📎 Voir', 'Ouvrir le RIB', () => ouvrirUnScan('rib', f.id)));
      dr.appendChild(petitBoutonEq(v.aFichier ? '🔁 Remplacer' : '➕ Déposer', 'Photo ou PDF du RIB', () => deposerRibEq(f, redessiner)));
      if(v.aFichier) dr.appendChild(petitBoutonEq('🗑️', 'Retirer le RIB', async () => {
        if(!await confirmer('Retirer le RIB de ' + f.nom + ' ?')) return;
        try{ await appelPrep({ action: 'equipeCoordonnees', id: f.id, ribRetirer: '1' }); showToast('RIB retiré'); redessiner(); }
        catch(e){ showToast('Impossible : ' + e.message); }
      }));
    }else{
      dr.appendChild(petitBoutonEq('✏️', 'Modifier', () => modifierCoordEq(f, k, nom, v || '', redessiner)));
    }
    if(reglageDesVuesEq(d)) dr.appendChild(interrupteurVueEq(d, 'coord:' + k));
    l.appendChild(dr);
    z.appendChild(l);
  });
  if(rien){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Rien à afficher pour le moment.';
    z.appendChild(v);
  }
}
function modifierCoordEq(f, k, nom, actuel, apres){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(440px, 94vw)';
  const type = k === 'mail' ? 'email' : k === 'portable' ? 'tel' : 'text';
  boite.innerHTML = '<h3>' + eEq(nom) + ' — ' + eEq(f.nom) + '</h3>' +
    (k === 'adresse'
      ? '<label for="eqcV">Adresse</label><textarea id="eqcV" rows="3" placeholder="N°, rue, code postal, ville"></textarea>'
      : '<label for="eqcV">' + eEq(nom) + '</label><input type="' + type + '" id="eqcV" ' +
        (k === 'portable' ? 'inputmode="tel" placeholder="06 12 34 56 78"' : 'inputmode="email" placeholder="prenom@exemple.fr"') + '>') +
    (k === 'mail' ? '<div class="eqAide" style="margin-top:6px;">C’est aussi l’adresse de ⚙️ Accès : la changer ici la change là-bas.</div>' : '');
  boite.querySelector('#eqcV').value = actuel;
  const r = document.createElement('div');
  r.className = 'btn-row';
  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary'; bA.textContent = 'Annuler';
  bA.addEventListener('click', () => fermerFond(fond));
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary'; bOk.textContent = '💾 Enregistrer';
  bOk.addEventListener('click', async () => {
    bOk.disabled = true;
    try{
      await appelPrep({ action: 'equipeCoordonnees', id: f.id, [k]: boite.querySelector('#eqcV').value.trim() });
      fermerFond(fond); showToast('Enregistré ✅'); apres && apres();
    }catch(e){ showToast('Impossible : ' + e.message); bOk.disabled = false; }
  });
  r.append(bA, bOk);
  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  try{ boite.querySelector('#eqcV').focus(); }catch(e){}
}
function deposerRibEq(f, apres){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(440px, 94vw)';
  boite.innerHTML = '<h3>🏦 RIB — ' + eEq(f.nom) + '</h3>';
  const fichier = blocFichierEq(boite, '📎 Le RIB', 'Photo ou PDF, 10 Mo au plus. Il remplace le précédent.');
  const r = document.createElement('div');
  r.className = 'btn-row';
  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary'; bA.textContent = 'Annuler';
  bA.addEventListener('click', () => fermerFond(fond));
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary'; bOk.textContent = '📤 Déposer';
  bOk.addEventListener('click', async () => {
    if(!fichier.fichier){ showToast('Choisis la photo ou le PDF du RIB.'); return; }
    bOk.disabled = true;
    try{
      await appelPrep({ action: 'equipeCoordonnees', id: f.id, rib: await fichierPourLEquipe(fichier.fichier) });
      fermerFond(fond); showToast('RIB déposé ✅'); apres && apres();
    }catch(e){ showToast('Impossible : ' + e.message); bOk.disabled = false; }
  });
  r.append(bA, bOk);
  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}

/* ---------- 📄 Papiers ---------- */
function dessinerPapiersEq(z, d, redessiner){
  const f = d.fiche;
  const papiers = d.papiers || [];
  const enseigne = f.fonction === 'enseigne';
  /* Les papiers attendus selon la fonction, même s'ils manquent */
  /* 🏥 v1194 — la médecine du travail n'est plus attendue d'office
     (David : « je la rajoute uniquement si je veux »). */
  const attendus = enseigne ? ['autorisation', 'medical', 'permis'] : [];
  const lignes = [];
  papiers.filter(p => p.etat === 'attente').forEach(p => lignes.push(p));
  attendus.forEach(g => { if(!papiers.some(p => p.genre === g && p.etat === 'valide') && voitEq(d, 'papier:' + g)) lignes.push({ genre: g, manquant: true }); });
  papiers.filter(p => p.etat === 'valide').forEach(p => lignes.push(p));
  papiers.filter(p => p.etat === 'refuse').slice(0, 3).forEach(p => lignes.push(p));

  lignes.forEach(p => {
    const g = genreEq(GENRES_PAPIER_EC, p.genre);
    const l = document.createElement('div');
    l.className = 'eqLigne' + (p.etat === 'attente' ? ' eqAttente' : '');
    l.style.alignItems = 'flex-start';
    let etat, txt = '';
    if(p.manquant){ etat = ['vide', '']; }
    else if(p.etat === 'attente') etat = ['att', ''];
    else if(p.etat === 'refuse') etat = ['ref', ''];
    else if(p.echeance) etat = etatDeLEcheance(p.echeance);
    else etat = ['ok', ''];
    const titre = p.manquant ? g[2] : (p.titre || g[2]);
    const sous = p.manquant ? 'Pas encore enregistré' :
      [p.numero ? 'N° ' + p.numero : '', p.categories, p.delivreLe ? 'du ' + jourEq(p.delivreLe) : '',
       p.genre === 'medical' ? (p.limite === 'limitee' ? 'durée limitée par le médecin' : p.limite === 'sans' ? 'sans limitation' : '') : '']
        .filter(Boolean).join(' · ');
    if(!p.manquant){
      if(p.echeance) txt = (etat[0] === 'ko' ? 'Expiré le ' : 'Valable jusqu’au ') + jourEq(p.echeance) + (p.prorogee ? ' (prorogée d’un an)' : '');
      else if(p.genre !== 'formation' && p.genre !== 'autre' && p.genre !== 'diplome') txt = 'Échéance à renseigner';
      else txt = 'Sans échéance';
    }
    const note = p.manquant ? '' :
      p.etat === 'attente' ? 'Déposé par ' + p.deposePar + ' — à valider' :
      p.etat === 'refuse' ? 'Refusé par ' + p.valideePar :
      (p.remarque || (p.deposePar && p.valideePar && p.deposePar !== p.valideePar ? 'Déposé par ' + p.deposePar + ' · validé par ' + p.valideePar : ''));
    l.innerHTML = '<span class="eqIc">' + g[1] + '</span>' +
      '<span class="eqCorps"><strong>' + eEq(titre) + '</strong>' +
        (sous ? '<div style="font-size:12.5px;">' + eEq(sous) + '</div>' : '') +
        (txt ? '<div style="font-size:12.5px;font-weight:700;color:' + PAST_EQ[etat[0]][2] + ';">' + eEq(txt) + '</div>' : '') +
        (note ? '<div class="eqGris">' + eEq(note) + '</div>' : '') + '</span>';
    const dr = document.createElement('span');
    dr.className = 'eqDroite';
    dr.innerHTML = pastilleEq(etat[0], etat[1]);
    if(p.aFichier) dr.appendChild(petitBoutonEq('📎 Scan', 'Voir le scan', () => ouvrirUnScan('papier', p.id)));
    if(p.manquant) dr.appendChild(petitBoutonEq('➕ Ajouter', 'Enregistrer ce papier', () => ouvrirPapierEq(f, { genre: p.genre }, redessiner)));
    else if(p.etat === 'attente' && d.peutModifier){
      dr.appendChild(petitBoutonEq('✅ Valider', 'Le papier remplace l’ancien', async () => {
        try{ await appelPrep({ action: 'equipePapierValider', id: p.id, decision: 'oui' }); showToast('Validé ✅'); redessiner(); chargerAlertesEquipe(); }
        catch(e){ showToast('Impossible : ' + e.message); }
      }, true));
      dr.appendChild(petitBoutonEq('✖ Refuser', '', async () => {
        try{ await appelPrep({ action: 'equipePapierValider', id: p.id, decision: 'non' }); showToast('Refusé'); redessiner(); chargerAlertesEquipe(); }
        catch(e){ showToast('Impossible : ' + e.message); }
      }));
    }else if(p.etat === 'valide' && d.peutModifier){
      dr.appendChild(petitBoutonEq('✏️', 'Corriger', () => ouvrirPapierEq(f, p, redessiner)));
    }
    /* 👁️ v1194 — sauf un dépôt en attente : c'est sa démarche, il le voit */
    if(reglageDesVuesEq(d) && (p.manquant || p.etat === 'valide')) dr.appendChild(interrupteurVueEq(d, cleVuePapierEq(p)));
    l.appendChild(dr);
    z.appendChild(l);
  });
  if(!lignes.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = d.estAdmin ? 'Aucun papier enregistré.' : 'Rien à afficher pour le moment.';
    z.appendChild(v);
  }

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.marginTop = '12px';
  b.textContent = d.peutModifier ? '➕ Ajouter un papier ou une formation' : '➕ Déposer un papier (l’administration le valide)';
  b.addEventListener('click', () => ouvrirPapierEq(f, null, redessiner));
  z.appendChild(b);
  const a = document.createElement('div');
  a.className = 'eqAide';
  a.style.marginTop = '10px';
  a.textContent = 'Du certificat médical, on ne garde que l’avis (apte, avec ou sans limitation) et ses dates. Les scans sont rangés à part, visibles par l’administration et par la personne. ' +
    'Autorisation d’enseigner : 6 ans au plus depuis le certificat médical, renouvellement à déposer en préfecture au moins 2 mois avant (arrêté du 9 février 2026).';
  z.appendChild(a);
}

function ouvrirPapierEq(f, p, apres){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(480px, 94vw)';
  const edit = p && p.id;
  boite.innerHTML =
    '<h3>' + (edit ? 'Corriger un papier' : 'Un papier pour ' + eEq(f.nom)) + '</h3>' +
    '<label for="eqpGenre">Quoi</label>' +
    '<select id="eqpGenre">' + GENRES_PAPIER_EC.map(g => '<option value="' + g[0] + '">' + g[1] + ' ' + g[2] + '</option>').join('') + '</select>' +
    '<div id="eqpTitreZ"><label for="eqpTitre">Intitulé</label><input type="text" id="eqpTitre" placeholder="Ex : Éco-conduite, 7 h"></div>' +
    '<div class="duo"><div><label for="eqpNumero">Numéro</label><input type="text" id="eqpNumero" placeholder="Facultatif"></div>' +
      '<div><label for="eqpCat">Catégories</label><input type="text" id="eqpCat" placeholder="Ex : B, BE"></div></div>' +
    '<div class="duo"><div><label for="eqpDu">Délivré le</label><input type="date" id="eqpDu"></div>' +
      '<div><label for="eqpAu">Valable jusqu’au</label><input type="date" id="eqpAu"></div></div>' +
    '<div id="eqpMedZ"><label for="eqpLimite">L’avis du médecin</label><select id="eqpLimite"><option value="sans">Apte, sans limitation de durée</option><option value="limitee">Apte, durée limitée par le médecin</option></select></div>' +
    '<label id="eqpProZ" class="eqCase"><input type="checkbox" id="eqpPro"> Prorogée d’un an (en cours au 16/02/2026, arrêté du 9 février 2026)</label>' +
    '<label for="eqpRem">Remarque</label><input type="text" id="eqpRem" placeholder="Facultatif">';
  const fichier = blocFichierEq(boite, '📎 Le scan', 'Photo ou PDF, 10 Mo au plus.' + (edit ? ' Laisser vide garde le scan actuel.' : ''));
  const q = s => boite.querySelector(s);
  if(p){
    q('#eqpGenre').value = p.genre || 'autre';
    q('#eqpTitre').value = p.titre && p.id ? p.titre : '';
    q('#eqpNumero').value = p.numero || '';
    q('#eqpCat').value = p.categories || '';
    q('#eqpDu').value = p.delivreLe || '';
    q('#eqpAu').value = p.valableJusqua || '';
    q('#eqpLimite').value = p.limite || 'sans';
    q('#eqpPro').checked = !!p.prorogee;
    q('#eqpRem').value = p.remarque || '';
  }
  const majChamps = () => {
    const g = q('#eqpGenre').value;
    q('#eqpTitreZ').style.display = (g === 'formation' || g === 'autre' || g === 'diplome') ? '' : 'none';
    q('#eqpMedZ').style.display = g === 'medical' ? '' : 'none';
    q('#eqpProZ').style.display = g === 'autorisation' ? '' : 'none';
  };
  q('#eqpGenre').addEventListener('change', majChamps);
  majChamps();

  const r = document.createElement('div');
  r.className = 'btn-row';
  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary'; bA.textContent = 'Annuler';
  bA.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bA);
  if(edit && peutModifier('equipe')){
    const bS = document.createElement('button');
    bS.className = 'btn btn-secondary';
    bS.style.cssText = 'color:var(--red);border-color:var(--red);';
    bS.textContent = '🗑️';
    bS.addEventListener('click', async () => {
      if(!await confirmer('Retirer ce papier et son scan ?')) return;
      try{ await appelPrep({ action: 'equipePapierRetirer', id: p.id }); fermerFond(fond); apres && apres(); chargerAlertesEquipe(); }
      catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bS);
  }
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = edit ? '💾 Enregistrer' : (peutModifier('equipe') ? '➕ Ajouter' : '📤 Déposer');
  bOk.addEventListener('click', async () => {
    const g = q('#eqpGenre').value;
    bOk.disabled = true;
    try{
      const data = fichier.fichier ? await fichierPourLEquipe(fichier.fichier) : '';
      const rep = await appelPrep({ action: 'equipePapierPoser', id: edit ? p.id : '', personne: f.id, genre: g,
        titre: q('#eqpTitreZ').style.display === 'none' ? '' : q('#eqpTitre').value.trim(),
        numero: q('#eqpNumero').value.trim(), categories: q('#eqpCat').value.trim(),
        delivreLe: q('#eqpDu').value, valableJusqua: q('#eqpAu').value,
        limite: g === 'medical' ? q('#eqpLimite').value : '', prorogee: (g === 'autorisation' && q('#eqpPro').checked) ? '1' : '0',
        remarque: q('#eqpRem').value.trim(), fichier: data });
      fermerFond(fond);
      showToast(rep && rep.etat === 'attente' ? 'Déposé : l’administration va le valider ✅' : 'Enregistré ✅');
      apres && apres();
      chargerAlertesEquipe();
    }catch(e){ showToast('Impossible : ' + e.message); bOk.disabled = false; }
  });
  r.appendChild(bOk);
  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}

/* ---------- 🏖️ Absences ---------- */
const TYPES_ABS_EQ = { cp: ['🏖️', 'Congés payés'], arret: ['🤒', 'Arrêt de travail'], ferie: ['📅', 'Jour férié'], recup: ['🕐', 'Récupération'] };
function dessinerAbsencesEq(z, d, redessiner){
  const f = d.fiche;
  const lignes = [];
  /* Les arrêts déposés, à valider ou refusés (pas encore dans la Paie) */
  (d.arrets || []).filter(a => a.etat !== 'valide').forEach(a => lignes.push({ sorte: 'depot', a: a, du: a.du }));
  /* Les absences de la Paie, avec la copie si elle existe */
  (d.absences || []).forEach(x => {
    const copie = (d.arrets || []).find(a => a.absenceId === x.id && a.etat === 'valide');
    lignes.push({ sorte: 'paie', x: x, copie: copie, du: x.du });
  });
  /* Des arrêts validés hors paie (personne hors paie) */
  (d.arrets || []).filter(a => a.etat === 'valide' && !a.absenceId).forEach(a => lignes.push({ sorte: 'hors', a: a, du: a.du }));
  lignes.sort((a, b) => String(b.du).localeCompare(String(a.du)));

  if(!lignes.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = d.estAdmin ? 'Aucune absence enregistrée.' : 'Rien à afficher pour le moment.';
    z.appendChild(v);
  }
  lignes.slice(0, 40).forEach(L => {
    const l = document.createElement('div');
    l.className = 'eqLigne' + (L.sorte === 'depot' && L.a.etat === 'attente' ? ' eqAttente' : '');
    l.style.alignItems = 'flex-start';
    const du = L.sorte === 'paie' ? L.x.du : L.a.du, au = L.sorte === 'paie' ? L.x.au : L.a.au;
    const ty = L.sorte === 'paie' ? (TYPES_ABS_EQ[L.x.type] || ['📝', 'Absence']) : TYPES_ABS_EQ.arret;
    const periode = 'Du ' + jourEq(du) + (au ? ' au ' + jourEq(au) : ' (fin inconnue)');
    const note = L.sorte === 'depot' ? (L.a.etat === 'attente' ? 'Déclaré par ' + L.a.deposePar + (L.a.aFichier ? ' · copie jointe' : ' · sans copie') + ' — à valider'
                                                             : 'Refusé par ' + L.a.valideePar)
               : L.sorte === 'paie' ? (L.copie ? 'Copie déposée par ' + L.copie.deposePar : (L.x.type === 'arret' ? 'Sans copie de l’arrêt' : 'Saisi dans 💶 Paie'))
               : 'Hors paie';
    l.innerHTML = '<span class="eqIc">' + ty[0] + '</span><span class="eqCorps"><strong>' + eEq(ty[1]) + '</strong>' +
      '<div style="font-size:12.5px;">' + eEq(periode) + '</div><div class="eqGris">' + eEq(note) + '</div></span>';
    const dr = document.createElement('span');
    dr.className = 'eqDroite';
    const k = L.sorte === 'depot' ? (L.a.etat === 'attente' ? 'att' : 'ref') : (L.sorte === 'paie' && L.x.type === 'arret' && !L.copie ? 'vide' : 'ok');
    dr.innerHTML = pastilleEq(k, k === 'vide' ? 'Copie à joindre' : k === 'ok' ? (L.sorte === 'hors' ? 'Validé' : 'Dans la paie') : '');
    const cop = L.sorte === 'paie' ? L.copie : L.a;
    if(cop && cop.aFichier) dr.appendChild(petitBoutonEq('📎 Copie de l’arrêt', '', () => ouvrirUnScan('arret', cop.id)));
    if(L.sorte === 'depot' && L.a.etat === 'attente' && d.peutModifier){
      dr.appendChild(petitBoutonEq('✅ Valider', 'L’arrêt entre dans la Paie', async () => {
        try{ await appelPrep({ action: 'equipeArretValider', id: L.a.id, decision: 'oui' }); showToast('Validé : l’arrêt est dans la Paie ✅'); redessiner(); chargerAlertesEquipe(); }
        catch(e){ showToast('Impossible : ' + e.message); }
      }, true));
      dr.appendChild(petitBoutonEq('✖ Refuser', '', async () => {
        try{ await appelPrep({ action: 'equipeArretValider', id: L.a.id, decision: 'non' }); showToast('Refusé'); redessiner(); chargerAlertesEquipe(); }
        catch(e){ showToast('Impossible : ' + e.message); }
      }));
    }
    if(L.sorte === 'paie' && L.x.type === 'arret' && !L.copie && d.peutModifier){
      dr.appendChild(petitBoutonEq('📎 Joindre', 'Joindre la copie de l’arrêt', () => joindreCopieEq(f, L.x, redessiner)));
    }
    /* 👁️ v1194 */
    if(reglageDesVuesEq(d) && L.sorte !== 'depot') dr.appendChild(interrupteurVueEq(d, L.sorte === 'paie' ? 'absence:' + L.x.id : 'arret:' + L.a.id));
    l.appendChild(dr);
    z.appendChild(l);
  });

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.marginTop = '12px';
  b.textContent = '🤒 Déclarer un arrêt et déposer la copie';
  b.addEventListener('click', () => ouvrirArretEq(f, d.peutModifier, redessiner));
  z.appendChild(b);
  const a = document.createElement('div');
  a.className = 'eqAide';
  a.style.marginTop = '10px';
  a.textContent = 'Ce sont les mêmes absences que dans 💶 Paie : un arrêt déclaré ici y apparaît (après validation s’il vient de la personne), et l’inverse. ' +
    'La copie est le volet employeur de l’avis d’arrêt : il ne porte pas le motif médical.';
  z.appendChild(a);
}

function ouvrirArretEq(f, admin, apres){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(460px, 94vw)';
  boite.innerHTML = '<h3>🤒 Arrêt de travail — ' + eEq(f.nom) + '</h3>' +
    '<div class="duo"><div><label for="eqaDu">Du</label><input type="date" id="eqaDu"></div>' +
    '<div><label for="eqaAu">Au</label><input type="date" id="eqaAu"></div></div>' +
    '<div class="eqAide" style="margin:-6px 0 12px;">Laisse « Au » vide si la fin n’est pas connue.</div>' +
    '<label for="eqaRem">Remarque pour le gestionnaire</label><input type="text" id="eqaRem" placeholder="Facultatif">';
  const fichier = blocFichierEq(boite, '📎 Copie de l’arrêt', 'Le volet employeur de l’avis d’arrêt (photo ou PDF).' +
    (admin ? '' : ' L’administration valide, puis l’arrêt entre dans la Paie.'));
  const r = document.createElement('div');
  r.className = 'btn-row';
  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary'; bA.textContent = 'Annuler';
  bA.addEventListener('click', () => fermerFond(fond));
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary'; bOk.textContent = admin ? '➕ Enregistrer' : '📤 Déclarer';
  bOk.addEventListener('click', async () => {
    const du = boite.querySelector('#eqaDu').value;
    if(!du){ showToast('Indique le premier jour.'); return; }
    bOk.disabled = true;
    try{
      const data = fichier.fichier ? await fichierPourLEquipe(fichier.fichier) : '';
      const rep = await appelPrep({ action: 'equipeArretDeclarer', personne: f.id, du: du, au: boite.querySelector('#eqaAu').value,
                                    remarque: boite.querySelector('#eqaRem').value.trim(), fichier: data });
      fermerFond(fond);
      showToast(rep && rep.etat === 'attente' ? 'Déclaré : l’administration va le valider ✅' : 'Enregistré dans la Paie ✅');
      apres && apres();
      chargerAlertesEquipe();
    }catch(e){ showToast('Impossible : ' + e.message); bOk.disabled = false; }
  });
  r.append(bA, bOk);
  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}

/* Joindre la copie d'un arrêt déjà dans la Paie (depuis la fiche ou la Paie) */
function joindreCopieEq(f, x, apres){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(440px, 94vw)';
  boite.innerHTML = '<h3>📎 Copie de l’arrêt</h3><div class="eqAide">Du ' + jourEq(x.du) + (x.au ? ' au ' + jourEq(x.au) : '') + ' — ' + eEq(f.nom) + '</div>';
  const fichier = blocFichierEq(boite, 'La copie', 'Le volet employeur de l’avis d’arrêt (photo ou PDF).');
  const r = document.createElement('div');
  r.className = 'btn-row';
  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary'; bA.textContent = 'Annuler';
  bA.addEventListener('click', () => fermerFond(fond));
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary'; bOk.textContent = '📎 Joindre';
  bOk.addEventListener('click', async () => {
    if(!fichier.fichier){ showToast('Choisis la copie.'); return; }
    bOk.disabled = true;
    try{
      await appelPrep({ action: 'equipeArretCopie', absenceId: x.id, idSalarie: f.paieId, du: x.du, au: x.au,
                        fichier: await fichierPourLEquipe(fichier.fichier) });
      fermerFond(fond); showToast('Copie jointe ✅'); apres && apres();
    }catch(e){ showToast('Impossible : ' + e.message); bOk.disabled = false; }
  });
  r.append(bA, bOk);
  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}

/* ---------- ⏱️ Heures ---------- */
function moisEq(){
  if(!equipeEC.mois){ const a = isoAujEq(); equipeEC.mois = a.slice(0, 7); }
  return equipeEC.mois;
}
function moisLettresEq(m){
  const n = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return n[parseInt(m.slice(5, 7), 10) - 1] + ' ' + m.slice(0, 4);
}
function selecteurMoisEq(z, redessiner){
  const r = document.createElement('div');
  r.className = 'eqMois';
  const decaler = n => { const [a, m] = moisEq().split('-').map(Number); const d = new Date(a, m - 1 + n, 1);
    equipeEC.mois = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); redessiner(); };
  const g = document.createElement('button'); g.className = 'btn btn-secondary'; g.textContent = '‹'; g.addEventListener('click', () => decaler(-1));
  const t = document.createElement('div'); t.className = 'eqMoisT'; t.textContent = moisLettresEq(moisEq());
  const dr = document.createElement('button'); dr.className = 'btn btn-secondary'; dr.textContent = '›'; dr.addEventListener('click', () => decaler(1));
  r.append(g, t, dr);
  z.appendChild(r);
}
function tuileEq(gros, petit, sous, cle){
  return '<div class="eqTuile"' + (cle ? ' data-cle="' + cle + '"' : '') + '><div class="eqGros">' + eEq(gros) + '</div><div class="eqPetitT">' + eEq(petit) + '</div>' +
         (sous ? '<div class="eqGris">' + eEq(sous) + '</div>' : '') + '</div>';
}
function familleDuBilanEq(type){
  const t = String(type || '').toLowerCase();
  if(/examen\s*officiel|^examen$/.test(t)) return ['🎯', 'Examens officiels'];
  if(/blanc/.test(t)) return ['📝', 'Examens blancs'];
  if(/simu/.test(t)) return ['🖥️', 'Simulateur'];
  if(/post|aac|supervis|rdv/.test(t)) return ['🤝', 'RDV AAC / post-permis'];
  if(/valuation/.test(t)) return ['📊', 'Évaluations'];
  if(/moto|plateau|2r|deux/.test(t)) return ['🏍️', 'Moto'];
  if(/remorque|\bbe\b/.test(t)) return ['🚚', 'Remorque'];
  return ['🚗', 'Conduite'];
}
async function dessinerHeuresEq(z, d){
  const f = d.fiche;
  const redessiner = () => { z.innerHTML = ''; dessinerHeuresEq(z, d); };
  selecteurMoisEq(z, redessiner);
  const m = moisEq();
  const bloc = document.createElement('div');
  bloc.innerHTML = '<div class="empty">Lecture des bilans…</div>';
  z.appendChild(bloc);
  const nomM = f.compte || f.nom;
  let bilans = [];
  if(voitEq(d, 'heures:cours')){
    try{
      const r = await appelPrep({ action: 'search', moniteur: nomM, leger: 1, maxi: 3000 });
      bilans = (r && r.resultats) || [];
    }catch(e){ bilans = null; }
  }
  const duMois = (bilans || []).filter(b => {
    const t = String(b.date || '');
    const iso = /^\d{4}-\d{2}/.test(t) ? t.slice(0, 7) : (/^(\d{2})\/(\d{2})\/(\d{4})/.exec(t) ? t.replace(/^(\d{2})\/(\d{2})\/(\d{4}).*$/, '$3-$2') : '');
    return iso === m;
  });
  const parFam = {};
  duMois.forEach(b => { const fa = familleDuBilanEq(b.type); const k = fa[1]; parFam[k] = parFam[k] || { ic: fa[0], n: 0 }; parFam[k].n++; });
  let h = '';
  if(!voitEq(d, 'heures:cours')){ /* 👁️ caché à la personne */ }
  else if(bilans === null) h += '<div class="eqTitreBloc" data-cle="heures:cours">COURS DONNÉS — D’APRÈS LES BILANS</div><div class="eqAide">Les bilans n’ont pas pu être lus.</div>';
  else {
    h += '<div class="eqTitreBloc" data-cle="heures:cours">COURS DONNÉS — D’APRÈS LES BILANS</div>';
    h += '<div class="eqGrille">' + tuileEq(String(duMois.length), duMois.length > 1 ? 'cours au total' : 'cours', '') +
      Object.keys(parFam).sort((a, b) => parFam[b].n - parFam[a].n).map(k => tuileEq(String(parFam[k].n), parFam[k].ic + ' ' + k, '')).join('') + '</div>' +
      '<div class="eqAide" style="margin-top:6px;">Un cours = un bilan enregistré à son nom (« ' + eEq(nomM) + ' »). L’appli ne connaît pas la durée d’un cours : elle compte les cours, pas les heures.</div>';
  }
  /* Les examens présentés, d'après 📈 Réussite */
  let res = null;
  try{ if(voitEq(d, 'heures:examens') && typeof chargerResultats === 'function') res = await chargerResultats(); }catch(e){ res = null; }
  if(res){
    const siens = res.filter(r => (typeof memeNom === 'function' ? memeNom(r.moniteur, nomM) || memeNom(r.moniteur, f.nom) : false) && String(r.iso || '').slice(0, 7) === m);
    h += '<div class="eqTitreBloc" data-cle="heures:examens">EXAMENS ACCOMPAGNÉS</div><div class="eqGrille">' +
      tuileEq(String(siens.length), '🎯 Candidats présentés', siens.length ? siens.filter(r => r.resultat === 'obtenu').length + ' reçu(s)' : '') + '</div>';
  }
  /* La paie, relue — rien n'est saisi ici */
  if(f.dansPaie && d.salarie && voitEq(d, 'heures:paie')){
    const abs = (d.absences || []).filter(a => String(a.du || '').slice(0, 7) === m || String(a.au || '').slice(0, 7) === m);
    const compte = t => abs.filter(a => a.type === t).length;
    h += '<div class="eqTitreBloc" data-cle="heures:paie">PAIE — REPRIS DE 💶 PAIE</div><div class="eqGrille">' +
      tuileEq(String(d.salarie.baseHebdo || '').replace('.', ',') + ' h', 'Contrat par semaine', (d.salarie.joursSemaine || '') + ' jours') +
      tuileEq(String(compte('cp')), '🏖️ Congés', 'sur le mois') + tuileEq(String(compte('arret')), '🤒 Arrêts', 'sur le mois') +
      tuileEq(String(compte('recup')), '🕐 Récupérations', 'sur le mois') + '</div>' +
      '<div class="eqAide" style="margin-top:6px;">Les heures supplémentaires et le message au gestionnaire restent dans 💶 Paie.</div>';
  }
  bloc.innerHTML = h || '<div class="empty">Rien à afficher pour le moment.</div>';
  poserLesInterrupteursEq(bloc, d);
}

/* 👁️ v1194 — un interrupteur au bout de chaque titre de bloc / tuile */
function poserLesInterrupteursEq(bloc, d){
  if(!reglageDesVuesEq(d)) return;
  bloc.querySelectorAll('[data-cle]').forEach(t => {
    t.classList.add('eqAvecVue');
    t.appendChild(interrupteurVueEq(d, t.getAttribute('data-cle')));
  });
}

/* ---------- 📈 Résultats ---------- */
async function dessinerResultatsEq(z, d){
  const f = d.fiche;
  const nomM = f.compte || f.nom;
  const bloc = document.createElement('div');
  bloc.innerHTML = '<div class="empty">Lecture des résultats…</div>';
  z.appendChild(bloc);
  let res = null;
  try{ if(typeof chargerResultats === 'function') res = await chargerResultats(); }catch(e){ res = null; }
  if(!res || typeof calculerTaux !== 'function'){ bloc.innerHTML = '<div class="empty">Les résultats ne sont pas accessibles.</div>'; return; }
  const auj = isoAujEq();
  const depuis = isoPlusMoisEq(auj.slice(0, 7) + '-01', -11);
  const periode = res.filter(r => String(r.iso || '') >= depuis && String(r.iso || '') <= auj);
  const siens = periode.filter(r => memeNom(r.moniteur, nomM) || memeNom(r.moniteur, f.nom));
  const t = calculerTaux(siens), t1 = calculerTaux(premiersPassages(siens)), ecole = calculerTaux(periode.filter(aUnMoniteur));
  const pc = x => (typeof pourcent === 'function') ? pourcent(x) : (x === null ? '—' : x + ' %');
  const tuiles = [
    voitEq(d, 'resultats:reussite') ? tuileEq(pc(t.taux), 'Réussite', t.reussis + ' reçu(s) sur ' + t.total + ' passage(s)', 'resultats:reussite') : '',
    voitEq(d, 'resultats:premier') ? tuileEq(pc(t1.taux), '1er passage', t1.reussis + ' sur ' + t1.total, 'resultats:premier') : '',
    voitEq(d, 'resultats:ecole') ? tuileEq(pc(ecole.taux), 'Moyenne de l’école', 'tous moniteurs', 'resultats:ecole') : ''
  ].join('');
  bloc.innerHTML = tuiles ? '<div class="eqTitreBloc">LES 12 DERNIERS MOIS — LE MÊME CALCUL QUE 📈 RÉUSSITE</div><div class="eqGrille">' + tuiles + '</div>' +
    (t.total && !t.fiable && voitEq(d, 'resultats:reussite') ? '<div class="eqAide" style="margin-top:6px;">Peu de passages : le taux bouge vite.</div>' : '')
    : '<div class="empty">Rien à afficher pour le moment.</div>';
  poserLesInterrupteursEq(bloc, d);
}

/* ============================================================
   🏫 L'ÉCOLE
   ============================================================ */
async function afficherEcole(){
  const z = $('ecoleZone');
  if(!z) return;
  z.innerHTML = '<div class="empty">Lecture…</div>';
  let d;
  try{ d = await appelPrep({ action: 'ecoleListe' }); }
  catch(e){ z.innerHTML = '<div class="empty">⚠️ ' + eEq(e.message) + '</div>'; return; }
  const liste = (d && d.echeances) || [];
  z.innerHTML = '<div class="eqAide" style="margin-bottom:12px;">Ce que la préfecture et les auditeurs demandent à l’école. Les alertes partent 4 mois puis 2 mois avant chaque échéance.</div>';
  const attendus = ['agrement', 'reactualisation', 'label', 'qualiopi', 'garantie'];
  const lignes = liste.slice();
  attendus.forEach(g => { if(!liste.some(x => x.genre === g)) lignes.push({ genre: g, manquant: true }); });
  lignes.forEach(x => {
    const g = genreEq(GENRES_ECOLE_EC, x.genre);
    const l = document.createElement('div');
    l.className = 'eqLigne';
    l.style.alignItems = 'flex-start';
    const etat = x.manquant ? ['vide', ''] : x.echeance ? etatDeLEcheance(x.echeance) : ['ok', ''];
    const lignesTxt = [];
    if(!x.manquant){
      const sous = [x.numero ? 'N° ' + x.numero : '', x.delivreLe ? 'du ' + jourEq(x.delivreLe) : ''].filter(Boolean).join(' · ');
      if(sous) lignesTxt.push('<div style="font-size:12.5px;">' + eEq(sous) + '</div>');
      if(x.echeance) lignesTxt.push('<div style="font-size:12.5px;font-weight:700;color:' + PAST_EQ[etat[0]][2] + ';">' +
        eEq((etat[0] === 'ko' ? 'Expiré le ' : 'Valable jusqu’au ') + jourEq(x.echeance) + (x.prorogee ? ' (prorogé d’un an)' : '')) + '</div>');
      if(x.auditDu) lignesTxt.push('<div style="font-size:12.5px;font-weight:700;">Audit de surveillance : entre le ' + jourEq(x.auditDu) + (x.auditAu ? ' et le ' + jourEq(x.auditAu) : '') + '</div>');
      if(x.genre === 'agrement' && x.echeance) lignesTxt.push('<div class="eqGris">Renouvellement à déposer avant le ' + jourEq(isoPlusMoisEq(x.echeance, -2)) + ', avec l’attestation de réactualisation de l’exploitant.</div>');
      if(x.remarque) lignesTxt.push('<div class="eqGris">' + eEq(x.remarque) + '</div>');
    }else lignesTxt.push('<div class="eqGris">Pas encore enregistré</div>');
    l.innerHTML = '<span class="eqIc">' + g[1] + '</span><span class="eqCorps"><strong>' + eEq(x.titre || g[2]) + '</strong>' + lignesTxt.join('') + '</span>';
    const dr = document.createElement('span');
    dr.className = 'eqDroite';
    dr.innerHTML = pastilleEq(etat[0], etat[1]);
    if(x.aFichier) dr.appendChild(petitBoutonEq('📎 Scan', '', () => ouvrirUnScan('ecole', x.id)));
    if(peutModifier('equipe')) dr.appendChild(petitBoutonEq(x.manquant ? '➕ Ajouter' : '✏️', '', () => ouvrirEcheanceEcole(x.manquant ? { genre: x.genre } : x)));
    l.appendChild(dr);
    z.appendChild(l);
  });
  /* Les véhicules qui atteignent 7 ans, repris de la Flotte */
  ajouterVehiculesSeptAns(z);
  if(peutModifier('equipe')){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.marginTop = '12px';
    b.textContent = '➕ Ajouter une échéance (assurance, contrôle…)';
    b.addEventListener('click', () => ouvrirEcheanceEcole({ genre: 'autre' }));
    z.appendChild(b);
  }
}

async function ajouterVehiculesSeptAns(z){
  if(!aDroit('flotte')) return;
  const place = document.createElement('div');
  z.appendChild(place);
  let v = [];
  try{ const d = await appelPrep({ action: 'flotteList' }); v = (d && d.vehicules) || []; }catch(e){ return; }
  const auj = isoAujEq();
  const lignes = v.filter(x => x && x.miseEnCirculation && String(x.etat || 'actif') === 'actif')
    .map(x => ({ nom: [x.nom, x.modele].filter(Boolean).join(' · ') || 'Véhicule', sept: isoPlusMoisEq(String(x.miseEnCirculation).slice(0, 10), 84) }))
    .filter(x => x.sept && x.sept <= isoPlusMoisEq(auj, 12))
    .sort((a, b) => a.sept.localeCompare(b.sept));
  const l = document.createElement('div');
  l.className = 'eqLigne';
  l.style.alignItems = 'flex-start';
  const pire = lignes.length ? etatDeLEcheance(lignes[0].sept) : ['ok', ''];
  l.innerHTML = '<span class="eqIc">🚗</span><span class="eqCorps"><strong>Véhicules de 7 ans</strong>' +
    '<div style="font-size:12.5px;">Repris de la Flotte (date de mise en circulation)</div>' +
    (lignes.length ? lignes.map(x => '<div style="font-size:12.5px;font-weight:700;color:' + PAST_EQ[etatDeLEcheance(x.sept)[0]][2] + ';">' +
       eEq(x.nom) + ' : ' + (x.sept < auj ? 'a eu 7 ans le ' : 'atteint 7 ans le ') + jourEq(x.sept) + '</div>').join('')
     : '<div style="font-size:12.5px;font-weight:700;color:var(--accent-text);">Aucun véhicule n’atteint 7 ans dans les 12 mois</div>') +
    '<div class="eqGris">Au-delà de 7 ans, plus d’enseignement en A, A1, A2, B, B1.</div></span>' +
    '<span class="eqDroite">' + pastilleEq(pire[0], pire[1]) + '</span>';
  place.appendChild(l);
}

function ouvrirEcheanceEcole(x){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(480px, 94vw)';
  const edit = x && x.id;
  boite.innerHTML = '<h3>' + (edit ? 'Corriger une échéance' : 'Une échéance de l’école') + '</h3>' +
    '<label for="ecGenre">Quoi</label><select id="ecGenre">' + GENRES_ECOLE_EC.map(g => '<option value="' + g[0] + '">' + g[1] + ' ' + g[2] + '</option>').join('') + '</select>' +
    '<label for="ecTitre">Intitulé</label><input type="text" id="ecTitre" placeholder="Laisser vide : le nom ci-dessus">' +
    '<label for="ecNumero">Numéro</label><input type="text" id="ecNumero" placeholder="Facultatif">' +
    '<div class="duo"><div><label for="ecDu">Délivré le</label><input type="date" id="ecDu"></div>' +
      '<div><label for="ecAu">Valable jusqu’au</label><input type="date" id="ecAu"></div></div>' +
    '<label id="ecProZ" class="eqCase"><input type="checkbox" id="ecPro"> Prorogé d’un an (en cours au 16/02/2026, arrêté du 9 février 2026)</label>' +
    '<div id="ecAuditZ"><div class="duo"><div><label for="ecAudDu">Audit de surveillance : du</label><input type="date" id="ecAudDu"></div>' +
      '<div><label for="ecAudAu">au</label><input type="date" id="ecAudAu"></div></div>' +
      '<div class="eqAide" style="margin:-6px 0 12px;">Label et Qualiopi : 3 ans, avec un audit de surveillance entre le 14ᵉ et le 22ᵉ mois.</div></div>' +
    '<label for="ecRem">Remarque</label><input type="text" id="ecRem" placeholder="Facultatif">';
  const fichier = blocFichierEq(boite, '📎 Le scan', 'Photo ou PDF, 10 Mo au plus.' + (edit ? ' Laisser vide garde le scan actuel.' : ''));
  const q = s => boite.querySelector(s);
  q('#ecGenre').value = (x && x.genre) || 'autre';
  if(edit){
    q('#ecTitre').value = x.titre && x.titre !== genreEq(GENRES_ECOLE_EC, x.genre)[2] ? x.titre : '';
    q('#ecNumero').value = x.numero || ''; q('#ecDu').value = x.delivreLe || ''; q('#ecAu').value = x.valableJusqua || '';
    q('#ecPro').checked = !!x.prorogee; q('#ecAudDu').value = x.auditDu || ''; q('#ecAudAu').value = x.auditAu || '';
    q('#ecRem').value = x.remarque || '';
  }
  const maj = () => {
    const g = q('#ecGenre').value;
    q('#ecProZ').style.display = g === 'agrement' ? '' : 'none';
    q('#ecAuditZ').style.display = (g === 'label' || g === 'qualiopi') ? '' : 'none';
    /* Label / Qualiopi : la fenêtre d'audit se propose depuis la date d'obtention */
    if((g === 'label' || g === 'qualiopi') && q('#ecDu').value && !q('#ecAudDu').value){
      q('#ecAudDu').value = isoPlusMoisEq(q('#ecDu').value, 14);
      q('#ecAudAu').value = isoPlusMoisEq(q('#ecDu').value, 22);
      if(!q('#ecAu').value) q('#ecAu').value = isoPlusMoisEq(q('#ecDu').value, 36);
    }
  };
  q('#ecGenre').addEventListener('change', maj);
  q('#ecDu').addEventListener('change', maj);
  maj();
  const r = document.createElement('div');
  r.className = 'btn-row';
  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary'; bA.textContent = 'Annuler';
  bA.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bA);
  if(edit){
    const bS = document.createElement('button');
    bS.className = 'btn btn-secondary'; bS.style.cssText = 'color:var(--red);border-color:var(--red);'; bS.textContent = '🗑️';
    bS.addEventListener('click', async () => {
      if(!await confirmer('Retirer cette échéance et son scan ?')) return;
      try{ await appelPrep({ action: 'ecoleRetirer', id: x.id }); fermerFond(fond); afficherEcole(); chargerAlertesEquipe(); }
      catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bS);
  }
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary'; bOk.textContent = edit ? '💾 Enregistrer' : '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    bOk.disabled = true;
    try{
      const g = q('#ecGenre').value;
      await appelPrep({ action: 'ecolePoser', id: edit ? x.id : '', genre: g, titre: q('#ecTitre').value.trim(),
        numero: q('#ecNumero').value.trim(), delivreLe: q('#ecDu').value, valableJusqua: q('#ecAu').value,
        prorogee: (g === 'agrement' && q('#ecPro').checked) ? '1' : '0',
        auditDu: q('#ecAuditZ').style.display === 'none' ? '' : q('#ecAudDu').value,
        auditAu: q('#ecAuditZ').style.display === 'none' ? '' : q('#ecAudAu').value,
        remarque: q('#ecRem').value.trim(),
        fichier: fichier.fichier ? await fichierPourLEquipe(fichier.fichier) : '' });
      fermerFond(fond); showToast('Enregistré ✅'); afficherEcole(); chargerAlertesEquipe();
    }catch(e){ showToast('Impossible : ' + e.message); bOk.disabled = false; }
  });
  r.appendChild(bOk);
  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}

/* ============================================================
   👤 MA FICHE — chacun la sienne, depuis ⋯
   ============================================================ */
async function ouvrirMaFiche(){
  try{
    const d = await appelPrep({ action: 'equipeMaFiche' });
    if(!d || !d.id){
      showToast('Aucune fiche n’est encore reliée à ton compte : l’administration la relie dans 👥 Équipe.');
      return;
    }
    if(aDroit('equipe')) return ouvrirFicheEquipe(d.id);
    ouvrirMaFicheEnFenetre(d.id);
  }catch(e){ showToast('Impossible : ' + e.message); }
}
function ouvrirMaFicheEnFenetre(id){
  equipeEC.fiche = { id: id, d: null };
  if(!equipeEC.onglet || equipeEC.onglet === 'resultats') equipeEC.onglet = 'papiers';
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(720px, 96vw);max-height:92vh;overflow-y:auto;';
  boite.innerHTML = '<h3>👤 Ma fiche</h3>';
  const z = document.createElement('div');
  boite.appendChild(z);
  const r = document.createElement('div');
  r.className = 'btn-row';
  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary'; bF.textContent = 'Fermer';
  bF.addEventListener('click', () => { equipeEC.fiche = null; fermerFond(fond); });
  r.appendChild(bF);
  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  dessinerFicheEquipe(z, true);
}

/* ============================================================
   🔔 LE BANDEAU — famille « 📄 Papiers et échéances »
   ============================================================ */
async function chargerAlertesEquipe(){
  if(!(typeof ACCES !== 'undefined' && ACCES && ACCES.code)) return;
  try{
    const d = await appelPrep({ action: 'equipeAlertes' });
    alertesEquipeEC = { lignes: (d && d.lignes) || [], aValider: Number((d && d.aValider) || 0), lu: true, estAdmin: Number((d && d.estAdmin) || 0) };
  }catch(e){ return; }
  if(typeof dessinerBandeau === 'function') try{ dessinerBandeau(); }catch(e){}
}
function lignesEcheances(){
  if(!alertesEquipeEC.lu) return [];
  const out = [];
  const ouvrir = (l) => () => {
    if(l.sorte === 'papier' && l.personne){
      if(aDroit('equipe')) ouvrirFicheEquipe(l.personne, 'papiers'); else ouvrirMaFicheEnFenetre(l.personne);
    }else{ try{ afficherOnglet('outils'); afficherVue('outils', 'ecole'); }catch(e){} }
  };
  alertesEquipeEC.lignes.forEach(l => {
    const ic = { autorisation: '🪪', medical: '🩺', permis: '🚗', travail: '🏥', atre: '⏳', agrement: '📜', reactualisation: '🎓',
                 label: '🏅', qualiopi: '✅', garantie: '🛡️' }[l.genre] || '📄';
    const exp = l.niveau === 9;
    const texte = l.nom + ' — ' + l.quoi + (l.sorte === 'audit' ? ' : la fenêtre s’ouvre le ' + jourEq(l.date)
      : exp ? ' expiré(e) depuis le ' + jourEq(l.date) : ' : échéance le ' + jourEq(l.date));
    const sous = l.sorte === 'audit' ? 'Audit de surveillance' + (l.fin ? ' jusqu’au ' + jourEq(l.fin) : '')
      : (l.genre === 'autorisation' || l.genre === 'agrement') ? (exp ? 'À renouveler sans attendre' : 'Dépôt en préfecture avant le ' + jourEq(isoPlusMoisEq(l.date, -2)))
      : l.genre === 'medical' ? 'Rendez-vous chez un médecin agréé' : (exp ? 'À renouveler' : 'Dans ' + moisAvantEq(l.date));
    out.push({ id: 'echeance:' + l.id + ':' + l.niveau, famille: 'echeances', emoji: ic, texte: texte, sous: sous,
               urgente: exp, groupe: (exp || l.niveau === 2) ? 'auj' : 'sem', action: ouvrir(l), actionTexte: 'Ouvrir' });
  });
  if(alertesEquipeEC.aValider){
    const n = alertesEquipeEC.aValider;
    out.push({ id: 'echeance:valider:' + n, famille: 'echeances', emoji: '⏳', urgente: false, groupe: 'auj',
               texte: n + (n > 1 ? ' papiers ou arrêts déposés à valider' : ' papier ou arrêt déposé à valider'),
               sous: 'Déposé par quelqu’un de l’équipe depuis sa fiche',
               action: () => { equipeEC.filtre = 'valider'; equipeEC.fiche = null; try{ afficherOnglet('outils'); afficherVue('outils', 'equipe'); }catch(e){} },
               actionTexte: 'Voir' });
  }
  return out;
}

/* Au démarrage, puis toutes les 30 minutes : les échéances bougent au jour, pas à la minute */
(function(){
  let n = 0;
  /* ⋯ › 👤 Ma fiche : visible une fois connecté */
  const bMa = document.getElementById('maFicheBtn');
  if(bMa){
    bMa.style.display = 'none';
    bMa.addEventListener('click', () => {
      const m = document.getElementById('plusMenu');
      if(m) m.style.display = 'none';
      ouvrirMaFiche();
    });
  }
  const essayer = () => {
    if(typeof ACCES !== 'undefined' && ACCES && ACCES.code){
      if(bMa) bMa.style.display = 'flex';
      chargerAlertesEquipe();
      return;
    }
    if(++n < 240) setTimeout(essayer, 1000);
  };
  setTimeout(essayer, 3000);
  setInterval(() => { if(typeof ACCES !== 'undefined' && ACCES && ACCES.code) chargerAlertesEquipe(); }, 30 * 60000);
  /* La notification d'une échéance ouvre 👥 Équipe (ou Ma fiche) */
  const allerALEquipe = () => {
    let k = 0;
    const go = () => {
      if(!(typeof ACCES !== 'undefined' && ACCES && ACCES.code)){ if(++k < 120) setTimeout(go, 500); return; }
      if(aDroit('equipe')){ try{ equipeEC.fiche = null; afficherOnglet('outils'); afficherVue('outils', 'equipe'); }catch(e){} }
      else ouvrirMaFiche();
    };
    go();
  };
  try{
    const u = new URL(location.href);
    if(u.searchParams.get('vue') === 'equipe'){
      u.searchParams.delete('vue');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
      allerALEquipe();
    }
  }catch(e){}
  if(navigator.serviceWorker){
    navigator.serviceWorker.addEventListener('message', ev => {
      const d = ev && ev.data;
      if(d && d.quoi === 'ouvrirVue' && d.vue === 'equipe') allerALEquipe();
    });
  }
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-equipe.js'] = true;
