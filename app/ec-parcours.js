/* Déployé le 31/10/2026 à 16:18 — v1324 */
/* ============================================================
   ec-parcours.js
   Le parcours d'apprentissage : les groupes et leurs guides.

   Ce qui remplace les huit groupes Facebook privés. David, le
   17 septembre : « je dois pouvoir mettre ce que je veux comme je
   veux et choisir l'ordre du déroulé du guide comme je veux par un
   cliqué-glissé », et « créer un nouveau groupe aussi ».

   ⚠️ RIEN N'EST OUVERT DE BASE. Créer un groupe ne l'ouvre chez
   personne : la liste des formations dit seulement ce que le bouton
   « Cocher ce que prévoit sa formation » proposera dans l'onglet 🔑
   de la fiche élève. C'est la règle du 17 septembre, et elle ne
   souffre pas d'exception — un groupe neuf qui s'ouvrirait tout
   seul arriverait chez deux cents élèves d'un coup.

   ⚠️ UN GROUPE SE FERME, IL NE S'EFFACE PAS. Ses guides et ce que
   les élèves ont vu restent. Effacer un groupe effacerait la
   progression de ceux qui l'ont suivi, et ça ne se récupère pas.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let parcoursGroupes = [];
let parcoursGuides = [];
let parcoursGroupeOuvert = '';
let parcoursCharge = false;

/* ============================================================
   LES TYPES DE BLOCS — ET CELUI QUI MANQUAIT

   Un bloc = une chose : c'est ce qui rend l'ordre totalement libre,
   parce que rien n'est accroché à rien.

   ⚠️ LE BLOC « TITRE » EXISTAIT PARTOUT SAUF ICI, ET ÇA A COÛTÉ
   TOUTE LA v1056.

   Le classeur découpe un guide en ÉTAPES sur ses blocs de type
   « titre » — c'est segmentsDuGuide, et c'est ce qui permet à
   l'élève de cocher partie par partie au lieu de cocher le guide
   entier. Le type était déclaré là-bas (TYPES_DE_BLOC), le
   découpage écrit, le comptage des étapes fait, l'écran du bureau
   prêt à les afficher.

   Mais la palette de l'éditeur n'en proposait que quatre, et pas
   celui-là. Aucun guide n'a donc jamais contenu de titre : tous
   retombaient sur l'étape unique de repli, l'élève cochait une
   seule case pour tout, et David — le 5 octobre 2026 — ne pouvait
   pas savoir si le bloc de texte du bas avait été lu. « Je ne peux
   pas mettre de titre supplémentaire dans mon guide. »

   Une mécanique complète, du classeur jusqu'à l'écran, rendue
   inatteignable par un bouton absent. Elle ne tombait pas en
   panne — elle ne démarrait jamais.

   ⚠️ IL EST EN TÊTE DE LISTE, et c'est voulu : c'est lui qui donne
   sa structure au guide, et il doit se voir en premier.

   ⚠️ ET LE REPLI DE blocConnu NE SUIT PLUS LE PREMIER DE LA LISTE.
   Il rendait « BLOCS_PARCOURS[0] » : un type inconnu — un guide
   d'une version future, une cellule abîmée — serait devenu un
   titre, donc une coupure d'étape, donc un découpage faux chez tous
   les élèves de ce groupe. Le repli nomme désormais « texte », qui
   ne structure rien et n'abîme rien.
   ============================================================ */
const BLOCS_PARCOURS = [
  { type:'titre', emoji:'🏷️', nom:'Titre d\'étape' },
  { type:'texte', emoji:'📝', nom:'Texte' },
  { type:'video', emoji:'🎬', nom:'Vidéo' },
  { type:'image', emoji:'🖼️', nom:'Image' },
  { type:'pdf',   emoji:'📄', nom:'PDF' }
];

/* Les blocs qui ne portent aucun fichier : ils s'écrivent, ils ne
   se déposent pas. Nommés une fois — « tout sauf texte » était
   écrit à trois endroits, et le titre serait devenu un média sans
   fichier dans les trois. */
function blocEcrit(type){
  return type === 'texte' || type === 'titre';
}

function blocConnu(type){
  return BLOCS_PARCOURS.find(b => b.type === type) ||
         BLOCS_PARCOURS.find(b => b.type === 'texte');
}

/* ============================================================
   UN GUIDE NE S'ÉCRIT PAS DEUX FOIS — v1036

   David, le 18 septembre : « quand j'enregistre le brouillon d'un
   guide, le guide se duplique ».

   ⚠️ C'EST LA PANNE DU BILAN EN QUATRE EXEMPLAIRES, À L'IDENTIQUE.

   L'envoi borne son attente à douze secondes et RÉESSAIE UNE FOIS
   (voir fetchFiable). Écrire un guide passe par le classeur, et
   réveiller le classeur mange à lui seul ces douze secondes : la
   première tentative expire, la seconde part — et comme un guide
   neuf s'envoyait SANS identifiant, le classeur en créait un second.
   Deux guides, un seul appui, et rien pour le dire.

   ⚠️ ET LES BOUTONS DU GUIDE NE SE VERROUILLAIENT PAS. Deux appuis
   sur une tablette qui ne répond pas tout de suite, c'était deux
   guides de plus. Ceux du groupe, eux, se verrouillaient déjà : une
   moitié posée, l'autre oubliée.

   La correction est celle de la v974 : L'ÉCRITURE SE RECONNAÎT.
   L'identifiant est décidé ICI, une seule fois, quand l'éditeur
   s'ouvre — pas par le classeur à la réception. Le rejeu retrouve
   alors SA ligne et la corrige au lieu d'en semer une seconde.

   Même alphabet et même forme que idNeuf, côté classeur, pour qu'un
   identifiant se lise pareil d'où qu'il vienne. Les quatre
   caractères tirés au sort évitent que deux postes qui enregistrent
   dans la même milliseconde se marchent dessus.
   ============================================================ */
function idProposeParLEcran(prefixe){
  const lettres = 'abcdefghijkmnopqrstuvwxyz23456789';
  let queue = '';
  for(let i = 0; i < 4; i++){
    queue += lettres[Math.floor(Math.random() * lettres.length)];
  }
  return prefixe + Date.now() + '-' + queue;
}


/* ============================================================
   UNE LISTE QU'ON RANGE AU DOIGT — À UN SEUL ENDROIT

   Les groupes, les guides et les blocs se rangent tous les trois de
   la même façon. Trois copies de ce code, ce seraient trois
   comportements qui finiraient par diverger, et deux qu'on
   oublierait de réparer.

   ⚠️ ET LES FLÈCHES RESTENT. Le glisser-déposer natif des
   navigateurs ne marche pas au doigt sur les tablettes Android des
   moniteurs ; on l'écrit donc en « pointer events », qui marchent
   partout. Mais un geste unique qui accroche, c'est un écran
   inutilisable ce jour-là : ▲ et ▼ font le même travail, et elles
   ne dépendent d'aucun capteur.
   ============================================================ */
function listeRangeable(conteneur, quandChange){
  if(!conteneur) return;

  let pris = null;

  /* ⚠️ LES LIGNES DIRECTES SEULEMENT — v1323 : une étape (rangeable)
     porte ses blocs (rangeables aussi) ; sans ça, attraper un bloc
     aurait déplacé l'étape entière, ou l'inverse. */
  const lignes = () => Array.prototype.filter.call(
    conteneur.children, l => l.dataset && l.dataset.rang);

  const rendreLOrdre = () => lignes().map(l => l.dataset.rang);

  /* La ligne sous le doigt, à cette hauteur-là */
  /* ⚠️ ET EN DEUX DIMENSIONS — v1323 : les guides sont des cartes en
     grille. Une ligne pleine largeur se juge en hauteur, une carte en
     largeur. */
  const sousLeDoigt = (x, y) => lignes().find(l => {
    if(l === pris) return false;
    const r = l.getBoundingClientRect();
    return y >= r.top && y <= r.bottom && x >= r.left && x <= r.right;
  });

  conteneur.addEventListener('pointerdown', (e) => {
    const poignee = e.target.closest('[data-poignee]');
    if(!poignee) return;
    const ligne = poignee.closest('[data-rang]');
    if(!ligne || ligne.parentNode !== conteneur) return;

    e.preventDefault();
    pris = ligne;
    ligne.style.opacity = '.55';
    ligne.style.outline = '2px solid var(--accent-text)';
    try{ poignee.setPointerCapture(e.pointerId); }catch(err){}

    const bouger = (ev) => {
      if(!pris) return;
      const cible = sousLeDoigt(ev.clientX, ev.clientY);
      if(!cible) return;
      const r = cible.getBoundingClientRect();
      const enGrille = r.width < conteneur.getBoundingClientRect().width * 0.8;
      const avant = enGrille ? ev.clientX < (r.left + r.width / 2) : ev.clientY < (r.top + r.height / 2);
      cible.parentNode.insertBefore(pris, avant ? cible : cible.nextSibling);
    };

    const lacher = () => {
      if(!pris) return;
      pris.style.opacity = '';
      pris.style.outline = '';
      pris = null;
      document.removeEventListener('pointermove', bouger);
      document.removeEventListener('pointerup', lacher);
      document.removeEventListener('pointercancel', lacher);
      quandChange(rendreLOrdre());
    };

    document.addEventListener('pointermove', bouger);
    document.addEventListener('pointerup', lacher);
    document.addEventListener('pointercancel', lacher);
  });

  /* Les flèches : le même résultat, sans capteur. */
  conteneur.addEventListener('click', (e) => {
    const b = e.target.closest('[data-monter], [data-descendre]');
    if(!b) return;
    const ligne = b.closest('[data-rang]');
    if(!ligne || ligne.parentNode !== conteneur) return;
    e.stopPropagation();
    const monte = b.hasAttribute('data-monter');
    const voisin = monte ? ligne.previousElementSibling : ligne.nextElementSibling;
    if(!voisin || !voisin.dataset || !voisin.dataset.rang) return;
    if(monte) ligne.parentNode.insertBefore(ligne, voisin);
    else ligne.parentNode.insertBefore(voisin, ligne);
    quandChange(rendreLOrdre());
  });
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */
async function afficherParcours(){
  const zone = $('parcoursZone');
  if(!zone) return;

  if(!parcoursCharge){
    zone.innerHTML = '<div class="empty">Lecture des groupes…</div>';
  }

  try{
    const d = await appelPrep({ action: 'parcoursList' });
    parcoursGroupes = (d && d.groupes) || [];
    parcoursGuides = (d && d.guides) || [];
    parcoursCharge = true;
  }catch(e){
    zone.innerHTML = '<div class="message erreur">Lecture impossible : ' +
      String(e.message).replace(/</g, '&lt;') + '</div>';
    return;
  }

  /* Un groupe fermé entre-temps ne reste pas ouvert à l'écran */
  if(parcoursGroupeOuvert &&
     !parcoursGroupes.some(g => g.id === parcoursGroupeOuvert)){
    parcoursGroupeOuvert = '';
  }
  dessinerParcours();
}

function guidesDuGroupe(id){
  return parcoursGuides.filter(g => g.groupe === id)
    .sort((a, b) => a.ordre - b.ordre);
}

/* ============================================================
   🎬 LA LISTE — v1323 (schéma « Groupes et guides », 31 octobre)

   David : « c'est long de créer les titres d'étapes, mettre les choses
   dedans, et c'est pas assez ergonomique, surtout la création de
   guide ». Ses réponses : B sur l'ordinateur (sommaire, étape, aperçu
   de l'élève), A sur le téléphone (étapes en cartes) ; la liste en
   onglets et en cartes ; un guide publié change chez l'élève tout de
   suite (enregistrement automatique) ; plusieurs fichiers d'un coup,
   un bloc par fichier ; pas de bouton dupliquer.

   Les groupes sont des onglets ; les guides du groupe ouvert, des
   cartes (leurs étapes, leur état, ce qui manque). L'ordre se range
   toujours au doigt (⠿) ou aux flèches.
   ============================================================ */
function dessinerParcours(){
  const zone = $('parcoursZone');
  if(!zone) return;
  poserLeStyleDuParcours();
  zone.innerHTML = '';

  if(!parcoursGroupes.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Aucun groupe pour l\'instant. Le premier remplacera un de tes groupes Facebook.';
    zone.appendChild(v);
    const b = document.createElement('button');
    b.className = 'btn btn-primary';
    b.style.cssText = 'margin-top:9px;padding:11px;font-size:13px;';
    b.textContent = '➕ Nouveau groupe';
    b.addEventListener('click', () => ouvrirLeGroupe(null));
    zone.appendChild(b);
    return;
  }
  if(!parcoursGroupes.some(x => x.id === parcoursGroupeOuvert)){
    parcoursGroupeOuvert = (parcoursGroupes.find(x => !x.fermeLe) || parcoursGroupes[0]).id;
  }
  const g = parcoursGroupes.find(x => x.id === parcoursGroupeOuvert);

  /* Les groupes, en onglets */
  const ong = document.createElement('div');
  ong.className = 'pcOnglets';
  ong.setAttribute('role', 'tablist');
  parcoursGroupes.forEach(x => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (x.id === g.id ? 'btn-primary' : 'btn-secondary');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', x.id === g.id ? 'true' : 'false');
    b.dataset.groupe = x.id;
    if(x.fermeLe) b.style.opacity = '.55';
    const n = guidesDuGroupe(x.id).length;
    b.innerHTML = echParcours((x.icone ? x.icone + ' ' : '') + x.nom) + ' <small>' + n + '</small>' +
      (x.fermeLe ? ' <small>· fermé</small>' : '');
    b.addEventListener('click', () => { parcoursGroupeOuvert = x.id; dessinerParcours(); });
    ong.appendChild(b);
  });
  const bNg = document.createElement('button');
  bNg.type = 'button';
  bNg.className = 'btn btn-secondary pcPointille';
  bNg.textContent = '➕ Groupe';
  bNg.addEventListener('click', () => ouvrirLeGroupe(null));
  ong.appendChild(bNg);
  const vide = document.createElement('span');
  vide.style.flex = '1';
  ong.appendChild(vide);
  const bMg = document.createElement('button');
  bMg.type = 'button';
  bMg.className = 'btn btn-secondary';
  bMg.textContent = '✏️ Le groupe';
  bMg.addEventListener('click', () => ouvrirLeGroupe(g));
  ong.appendChild(bMg);
  zone.appendChild(ong);

  const liste = guidesDuGroupe(g.id);
  const aide = document.createElement('div');
  aide.className = 'pcAide';
  const publies = liste.filter(x => x.etat === 'publie').length;
  aide.textContent = (liste.length ? liste.length + ' guide' + (liste.length > 1 ? 's' : '') + ' · ' + publies + ' publié' + (publies > 1 ? 's' : '') + ' — ' : '') +
    (g.fermeLe ? 'groupe fermé le ' + g.fermeLe + ' (rouvre-le dans ✏️ Le groupe). ' : '') +
    'Attrape ⠿ pour changer l’ordre chez l’élève · un appui ouvre le guide.';
  zone.appendChild(aide);

  const grille = document.createElement('div');
  grille.className = 'pcGrille';
  grille.id = 'parcoursListeGuides';
  liste.forEach((x, i) => grille.appendChild(carteDeGuide(x, i + 1)));
  const nouv = document.createElement('button');
  nouv.type = 'button';
  nouv.className = 'pcCarteNeuve';
  nouv.textContent = '➕ Nouveau guide';
  nouv.addEventListener('click', () => ouvrirLeGuide(null, g));
  grille.appendChild(nouv);
  zone.appendChild(grille);

  listeRangeable(grille, ordre => {
    appelPrep({ action: 'parcoursOrdre', quoi: 'guides', ids: ordre })
      .then(() => { afficherParcours(); })
      .catch(e => showToast('Ordre non enregistré : ' + e.message));
  });
}

function echParcours(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function carteDeGuide(x, rang){
  const c = document.createElement('div');
  c.className = 'pcCarteG';
  c.dataset.rang = x.id;
  c.tabIndex = 0;
  c.setAttribute('role', 'button');
  c.setAttribute('aria-label', 'Ouvrir le guide ' + x.titre);
  const cp = x.compte || {};
  const etapes = Number(cp.titre || 0) || (x.nbBlocs ? 1 : 0);
  const types = [['video', '🎬'], ['image', '🖼️'], ['pdf', '📄'], ['texte', '📝']].filter(t => cp[t[0]]).map(t => t[1] + ' ' + cp[t[0]]);
  const manque = Number(x.manquants || 0);
  c.innerHTML =
    '<div class="l1"><span class="pcPoi" data-poignee="1" title="Attrape pour ranger">⠿</span><span class="pcNum">' + rang + '</span>' +
      '<span class="t">' + echParcours(x.titre) + '</span></div>' +
    '<div class="d">' + (etapes ? etapes + ' étape' + (etapes > 1 ? 's' : '') : 'vide') + (types.length ? ' · ' + types.join(' · ') : '') + '</div>' +
    (manque ? '<div class="w">⚠️ ' + manque + ' fichier' + (manque > 1 ? 's' : '') + ' à déposer</div>' : '') +
    '<div class="bas"><span class="pcPuce ' + (x.etat === 'publie' ? 'pcPub">✅ Publié' : 'pcBro">✏️ Brouillon') + '</span><span style="flex:1"></span>' +
      '<span class="pcFl" data-monter title="Plus tôt">◀</span><span class="pcFl" data-descendre title="Plus tard">▶</span></div>';
  const ouvrir = (e) => {
    if(e && e.target && e.target.closest && e.target.closest('[data-poignee],[data-monter],[data-descendre]')) return;
    ouvrirLeGuide(x, null);
  };
  c.addEventListener('click', ouvrir);
  c.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrir(e); } });
  return c;
}

/* Le style de l'écran, posé une fois */
function poserLeStyleDuParcours(){
  if(document.getElementById('pcStyle')) return;
  const s = document.createElement('style');
  s.id = 'pcStyle';
  s.textContent =
    '.pcOnglets{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}' +
    '.pcOnglets .btn{width:auto;margin:0;padding:9px 13px;font-size:13px;min-height:40px}' +
    '.pcPointille{border-style:dashed!important}' +
    '.pcAide{font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.5}' +
    '.pcGrille{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}' +
    '.pcCarteG{border:1px solid var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:6px;min-height:118px;cursor:pointer;background:var(--navy-deep)}' +
    '.pcCarteG:hover,.pcCarteG:focus-visible{border-color:var(--orange)}' +
    '.pcCarteG .l1{display:flex;gap:8px;align-items:center}' +
    '.pcCarteG .t{font-size:15px;font-weight:800;flex:1;min-width:0;line-height:1.3}' +
    '.pcCarteG .d{font-size:12px;color:var(--muted)}' +
    '.pcCarteG .w{font-size:12px;color:var(--warn-text, #b4471a)}' +
    '.pcCarteG .bas{margin-top:auto;display:flex;gap:6px;align-items:center}' +
    '.pcCarteNeuve{border:2px dashed var(--line);border-radius:14px;min-height:118px;font-weight:800;color:var(--accent-text);font-size:14px;background:transparent;cursor:pointer;font-family:inherit}' +
    '.pcCarteNeuve:hover{border-color:var(--orange)}' +
    '.pcPoi{cursor:grab;color:var(--muted);font-size:15px;flex-shrink:0;touch-action:none;padding:2px 4px}' +
    '.pcFl{cursor:pointer;color:var(--muted);font-size:12px;padding:4px 6px}' +
    '.pcNum{flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:var(--orange);color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px}' +
    '.pcNum.intro{background:var(--line);color:var(--muted)}' +
    '.pcPuce{font-size:11px;font-weight:800;border-radius:999px;padding:4px 9px;white-space:nowrap}' +
    '.pcPub{background:var(--orange-soft);color:var(--on-accent)}' +
    '.pcBro{border:1px solid var(--line);color:var(--muted)}' +
    /* L'éditeur */
    '.pcBarre{position:sticky;top:8px;z-index:20;display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:var(--navy-deep);border:1px solid var(--line);border-radius:14px;padding:9px 12px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.08)}' +
    '.pcBarre .btn{width:auto;margin:0;padding:9px 13px;font-size:13px;min-height:40px}' +
    '.pcRetour{font-size:13px;font-weight:700;color:var(--muted);background:none;border:none;cursor:pointer;font-family:inherit;padding:6px 4px;white-space:nowrap}' +
    '.pcTitreG{flex:1 1 220px;min-width:0;font-size:18px!important;font-weight:800;margin:0!important;border:1px solid transparent!important;background:transparent!important;padding:6px 8px!important}' +
    '.pcTitreG:hover,.pcTitreG:focus{border-color:var(--line)!important}' +
    '.pcSauve{font-size:12px;color:var(--muted);white-space:nowrap}' +
    '.pcSauve.ko{color:var(--red)}' +
    '.pcTrois{display:grid;grid-template-columns:250px minmax(0,1fr) 300px;gap:14px;align-items:start}' +
    '.pcSom{border:1px solid var(--line);border-radius:14px;padding:10px;position:sticky;top:76px}' +
    '.pcSomT{font-size:11.5px;font-weight:800;color:var(--muted);margin:2px 4px 8px;text-transform:uppercase;letter-spacing:.04em}' +
    '.pcSomL{display:flex;gap:8px;align-items:center;padding:8px 9px;border-radius:10px;font-size:13.5px;font-weight:700;margin-bottom:4px;border:1px solid transparent;cursor:pointer;line-height:1.3}' +
    '.pcSomL:hover{border-color:var(--line)}' +
    '.pcSomL.on{border-color:var(--orange);background:var(--orange-soft);color:var(--on-accent)}' +
    '.pcSomL .pcNum{width:22px;height:22px;font-size:11px}' +
    '.pcSomL .t{flex:1;min-width:0}' +
    '.pcSomL .vide{font-weight:400;font-style:italic;opacity:.75}' +
    '.pcSom .btn{margin:8px 0 0;border-style:dashed;padding:10px;font-size:13px}' +
    '.pcEt{border:1px solid var(--line);border-radius:14px;margin-bottom:10px}' +
    '.pcEtT{display:flex;gap:8px;align-items:center;padding:10px 12px}' +
    '.pcEtNom{flex:1;min-width:0;font-size:16px!important;font-weight:800;margin:0!important;border:1px solid transparent!important;background:transparent!important;padding:6px!important}' +
    '.pcEtNom:hover,.pcEtNom:focus{border-color:var(--line)!important}' +
    '.pcEtNom.grand{font-size:19px!important}' +
    '.pcIco{color:var(--muted);font-size:14px;flex-shrink:0;cursor:pointer;padding:4px 5px;background:none;border:none;font-family:inherit}' +
    '.pcMeta{font-size:12px;color:var(--muted);white-space:nowrap}' +
    '.pcCorps{padding:0 12px 12px}' +
    '.pcBlocs>[data-rang]{background:var(--navy-deep)}' +
    '.pcAjout{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px}' +
    '.pcAjout .btn{width:auto;margin:0;padding:8px 12px;font-size:13px;border-style:dashed;min-height:40px}.pcAjout>.pcMeta{flex:1 1 100%}' +
    '.pcDepose{flex:1 1 100%;font-size:12px;color:var(--muted);border:1.5px dashed var(--line);border-radius:10px;padding:10px;text-align:center;cursor:pointer;line-height:1.45}' +
    '.pcDepose.sur{border-color:var(--orange);background:var(--orange-soft);color:var(--on-accent)}' +
    '.pcNav{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin-top:4px}' +
    '.pcNav button{background:none;border:none;cursor:pointer;font-family:inherit;font-size:13px;color:var(--muted);padding:6px 0}' +
    '.pcNav button.suiv{font-weight:800;color:var(--accent-text)}' +
    '.pcNouv{display:flex;gap:8px;flex-wrap:wrap}' +
    '.pcNouv .btn{margin:0;border-style:dashed;padding:13px;font-size:14px}' +
    '.pcTel{border:10px solid #1d2420;border-radius:32px;overflow:hidden;background:#f2f1ec;color:#1d2420;font-size:13px;position:sticky;top:76px}' +
    '.pcTel .h{background:#fff;padding:10px 12px;font-weight:800;border-bottom:1px solid #e3e1d8}' +
    '.pcTel .c{padding:12px;max-height:62vh;overflow:auto}' +
    '.pcTel .e{background:#fff;border:1px solid #e3e1d8;border-radius:12px;padding:10px;margin-bottom:8px}' +
    '.pcTel p{margin:6px 0;white-space:pre-wrap;line-height:1.5}' +
    '.pcTel .vid{background:#111;color:#fff;border-radius:8px;height:120px;display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden;position:relative}' +
    '.pcTel .vid video{width:100%;height:100%;object-fit:cover}' +
    '.pcTel .lg{font-size:11px;margin-top:4px;color:#5f6b63}' +
    '.pcTel .vu{background:#B6FF0E;border-radius:10px;padding:9px;text-align:center;font-weight:800}' +
    '.pcTel .imgs{display:flex;gap:4px;overflow:hidden}.pcTel .imgs img{height:90px;border-radius:6px;object-fit:cover}' +
    '@media (max-width:600px){.pcBarre .pcTitreG{flex:1 1 100%;order:2}.pcBarre .pcRetour,.pcBarre .pcPuce{order:1}.pcBarre .pcSauve{order:1;flex:1}.pcBarre .btn{order:3;flex:1}' +
      '.pcCorps{padding:0 8px 10px}.pcAjout .btn{flex:1 1 40%}.pcEtT{padding:8px 8px;gap:4px;flex-wrap:wrap;justify-content:flex-end}.pcEtT .pcMeta{display:none}.pcEtT .pcNum{margin-right:auto}.pcEtT .pcEtNom{flex:1 1 100%;order:9}}';
  document.head.appendChild(s);
}


async function ouvrirLeGroupe(g){
  const zone = $('parcoursZone');
  if(!zone) return;

  const neuf = !g;
  /* ⚠️ DÉCIDÉ À L'OUVERTURE, PAS À LA RÉCEPTION — v1036. Voir
     idProposeParLEcran : c'est ce qui fait qu'un envoi rejoué
     retrouve SA ligne au lieu d'en créer une seconde. */
  const idPose = (g && g.id) || idProposeParLEcran('g');
  const cadre = document.createElement('div');
  cadre.style.cssText = 'border:1px solid var(--orange);border-radius:14px;' +
    'padding:14px;max-width:460px;';

  cadre.innerHTML =
    '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">' +
      (neuf ? '➕ Nouveau groupe' : '✏️ Modifier le groupe') + '</div>' +
    '<label for="pgIcone">Son icône et son nom</label>' +
    '<div style="display:flex;gap:7px;margin-bottom:13px;">' +
      '<input type="text" id="pgIcone" maxlength="4" style="width:58px;' +
        'text-align:center;font-size:17px;margin:0;">' +
      '<input type="text" id="pgNom" style="flex:1;min-width:0;margin:0;" ' +
        'placeholder="Cours mises en pratique">' +
    '</div>' +
    '<label>Proposé à quelles formations</label>' +
    '<div id="pgFormations" style="display:flex;flex-wrap:wrap;gap:6px;' +
      'margin-bottom:9px;"></div>' +
    '<div style="font-size:11px;color:var(--muted);line-height:1.5;' +
      'margin-bottom:14px;">⚠️ Ça ne l\'ouvre chez personne. Ça dit seulement ' +
      'ce que le bouton « Cocher ce que prévoit sa formation » proposera, ' +
      'dans l\'onglet 🔑 de la fiche élève. <b>Tu ouvres à la main.</b></div>';

  const zf = cadre.querySelector('#pgFormations');
  const choisies = (g && g.formations) ? g.formations.slice() : [];

  /* ⚠️ LA LISTE DES FORMATIONS N'EST PAS ÉCRITE ICI. C'est
     FORMATIONS_BASE (ec-fenetres.js), celle des fiches élèves. Une
     seconde liste, c'est une formation ajoutée d'un côté et
     introuvable de l'autre. */
  const base = (typeof FORMATIONS_BASE !== 'undefined') ? FORMATIONS_BASE : [];
  base.forEach(f => {
    const p = document.createElement('span');
    const pris = () => choisies.indexOf(f.cle) !== -1;
    const peindre = () => {
      p.style.cssText = 'padding:5px 10px;border-radius:20px;font-size:11.5px;' +
        'cursor:pointer;' + (pris()
          ? 'background:var(--orange);color:var(--on-accent);font-weight:700;'
          : 'border:1px solid var(--line);color:var(--cream);');
    };
    p.textContent = f.nom || f.cle;
    peindre();
    p.addEventListener('click', () => {
      const i = choisies.indexOf(f.cle);
      if(i === -1) choisies.push(f.cle); else choisies.splice(i, 1);
      peindre();
    });
    zf.appendChild(p);
  });

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.style.cssText = 'padding:11px;font-size:13px;';
  bOk.textContent = neuf ? '✅ Créer le groupe' : '✅ Enregistrer';
  cadre.appendChild(bOk);

  if(!neuf){
    const bF = document.createElement('button');
    bF.className = 'btn btn-secondary';
    bF.style.cssText = 'padding:10px;font-size:13px;' +
      (g.fermeLe ? '' : 'color:var(--red);border-color:var(--red);');
    bF.textContent = g.fermeLe ? '↩️ Rouvrir le groupe' : '🗑️ Fermer le groupe';
    bF.addEventListener('click', async () => {
      const rouvre = !!g.fermeLe;
      if(!rouvre && !await confirmer(
          'Fermer « ' + g.nom + ' » ?\n\n' +
          'Il disparaît de chez les élèves et des propositions.\n' +
          'Ses guides et ce qu\'ils ont vu sont conservés — ' +
          'et tu peux le rouvrir.')) return;
      bF.disabled = true;
      try{
        await appelPrep({ action: 'parcoursGroupeSet', id: g.id, nom: g.nom,
                          icone: g.icone, formations: g.formations,
                          ferme: rouvre ? 'non' : 'oui' });
        showToast(rouvre ? 'Groupe rouvert ✅' : 'Groupe fermé ✅');
        afficherParcours();
      }catch(e){ showToast('Impossible : ' + e.message); bF.disabled = false; }
    });
    cadre.appendChild(bF);

    /* 🎬 v1323 — les groupes sont des onglets : leur ordre se règle ici */
    const rg = parcoursGroupes.findIndex(x => x.id === g.id);
    const ord = document.createElement('div');
    ord.style.cssText = 'display:flex;gap:6px;margin:4px 0;';
    [['◀ Plus tôt chez l’élève', -1], ['Plus tard chez l’élève ▶', 1]].forEach(([lab, sens]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.style.cssText = 'flex:1;margin:0;padding:9px;font-size:12.5px;';
      b.textContent = lab;
      const cible = rg + sens;
      b.disabled = cible < 0 || cible >= parcoursGroupes.length;
      b.addEventListener('click', async () => {
        const ids = parcoursGroupes.map(x => x.id);
        ids.splice(cible, 0, ids.splice(rg, 1)[0]);
        b.disabled = true;
        try{
          await appelPrep({ action: 'parcoursOrdre', quoi: 'groupes', ids: ids });
          showToast('Ordre enregistré ✅');
          afficherParcours();
        }catch(e){ showToast('Ordre non enregistré : ' + e.message); b.disabled = false; }
      });
      ord.appendChild(b);
    });
    cadre.appendChild(ord);
  }

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.style.cssText = 'padding:10px;font-size:13px;';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => dessinerParcours());
  cadre.appendChild(bAnn);

  bOk.addEventListener('click', async () => {
    const nom = cadre.querySelector('#pgNom').value.trim();
    if(!nom){ showToast('Donne un nom au groupe.'); return; }
    bOk.disabled = true;
    try{
      const rep = await appelPrep({
        action: 'parcoursGroupeSet',
        id: idPose,
        nom: nom,
        icone: cadre.querySelector('#pgIcone').value.trim(),
        formations: choisies,
        par: (typeof ACCES !== 'undefined' && ACCES.moniteur) || ''
      });
      showToast(neuf ? 'Groupe créé ✅' : 'Groupe enregistré ✅');
      if(neuf && rep && rep.id) parcoursGroupeOuvert = rep.id;
      afficherParcours();
    }catch(e){ showToast('Impossible : ' + e.message); bOk.disabled = false; }
  });

  zone.innerHTML = '';
  zone.appendChild(cadre);
  const ci = cadre.querySelector('#pgIcone');
  const cn = cadre.querySelector('#pgNom');
  if(g){ ci.value = g.icone || ''; cn.value = g.nom || ''; }
  cn.focus();
}


/* Le résumé d'un guide par ses types de blocs (« 3 🎬 2 📝 ») */
function resumeDesBlocs(compte){
  const c = compte || {};
  const bouts = BLOCS_PARCOURS
    .filter(b => c[b.type])
    .map(b => c[b.type] + ' ' + b.emoji);
  return bouts.length ? bouts.join(' ') : 'vide';
}

/* ============================================================
   🎬 L'ÉDITEUR D'UN GUIDE — v1323

   ⚠️ LE GUIDE RESTE UNE PILE DE BLOCS, ET C'EST VOULU. Le classeur, le
   Worker et l'espace élève découpent un guide en ÉTAPES sur ses blocs
   « titre » (segmentsDuGuide). L'éditeur le montre maintenant par
   étapes — un titre et ce qui le suit — et le remet en pile pour
   l'enregistrer. Rien ne change ailleurs : les guides d'avant s'ouvrent
   tels quels, la progression des élèves ne bouge pas.

   · Ordinateur (zone de 900 px ou plus) : le sommaire des étapes à
     gauche, l'étape au milieu, ce que voit l'élève à droite (B).
   · Téléphone : les étapes en cartes repliables (A).
   · Ce qu'on ajoute se range DANS l'étape (fini les blocs à remonter).
   · Plusieurs fichiers glissés d'un coup : un bloc par fichier.
   · ⚠️ ENREGISTREMENT AUTOMATIQUE, et un guide publié change chez
     l'élève tout de suite (David).
   · ⚠️ TOUT S'ENREGISTRE, LE VIDE COMPRIS — v1324. David : « il faut
     que ça enregistre même si j'ai mis une vidéo et que la vidéo n'y
     est pas : c'est pour me repérer en attendant que je finisse toutes
     les vidéos ». Chez l'élève, un bloc sans fichier ne montre rien
     (rendreBloc, eleve.html) : il ne voit pas de cadre vide.
   · 📁 v1324 — « changer des étapes, ou des guides, pour les mettre dans
     d'autres groupes si je me suis trompé » : ⋯ › Changer de groupe,
     et ↪️ sur une étape pour l'envoyer dans un autre guide.
   ============================================================ */
const PC_LARGE = 900;
const PC_DELAI = 2500;

/* Les étapes d'une pile : ce qui précède le premier titre est une
   « introduction » (titre: null) — les guides d'avant les étapes. */
function versEtapesParcours(blocs){
  const out = [];
  (blocs || []).forEach(b => {
    if(b && b.type === 'titre'){ out.push({ titre: b, contenus: [] }); return; }
    if(!out.length) out.push({ titre: null, contenus: [] });
    out[out.length - 1].contenus.push(b);
  });
  return out;
}
function blocVideParcours(b){
  if(!b) return true;
  if(b.type === 'texte') return !String(b.texte || '').trim();
  if(b.type === 'titre') return !String(b.titre || '').trim();
  return clesDuBloc(b).length === 0;
}
/* La pile, TOUT compris (v1324 : le vide aussi, pour se repérer) */
function versBlocsParcours(etapes){
  const out = [];
  (etapes || []).forEach(et => {
    if(et.titre) out.push(et.titre);
    et.contenus.forEach(b => out.push(b));
  });
  return out;
}
/* Relire UN bloc à l'écran (la même règle que relireLesBlocs) */
function relireUnBloc(ligne, b){
  if(!ligne || !b) return;
  const ta = ligne.querySelector('[data-champ="texte"]');
  const f = ligne.querySelector('[data-champ="fichier"]');
  const n = ligne.querySelector('[data-champ="titre"]');
  const mt = ligne.querySelector('[data-champ="montage"]');
  if(ta) b.texte = ta.value;
  if(f) b.fichier = f.value.trim();
  if(mt){
    let m = null;
    try{ m = mt.value ? JSON.parse(mt.value) : null; }catch(e){ m = null; }
    if(m){ delete m.liens; b.montage = m; } else delete b.montage;
  }
  if(n) b.titre = n.value.trim();
}
/* Le type d'un fichier glissé */
function genreDuFichierParcours(f){
  const t = String((f && f.type) || '').toLowerCase(), n = String((f && f.name) || '').toLowerCase();
  if(t === 'video/mp4' || /\.mp4$/.test(n)) return 'video';
  if(/^image\/(jpeg|png|webp)$/.test(t) || /\.(jpe?g|png|webp)$/.test(n)) return 'image';
  if(t === 'application/pdf' || /\.pdf$/.test(n)) return 'pdf';
  return '';
}

async function ouvrirLeGuide(x, groupe){
  const zone = $('parcoursZone');
  if(!zone) return;
  poserLeStyleDuParcours();
  let neuf = !x;
  let blocs = [];
  const E = { titre: '', etat: 'brouillon', ici: 0, corps: [], dernier: '', enCours: false, encore: false,
              minuterie: null, apercu: null, statut: '', large: null, versionVue: false };
  let idGroupe = neuf ? groupe.id : x.groupe;
  let grp = parcoursGroupes.find(g => g.id === idGroupe) || groupe || {};
  /* L'identifiant est décidé ici, une fois : un rejeu retrouve sa ligne (v1036) */
  const idPose = (x && x.id) || idProposeParLEcran('gd');

  if(!neuf){
    zone.innerHTML = '<div class="empty">Lecture du guide…</div>';
    try{
      const d = await appelPrep({ action: 'parcoursGuide', id: x.id });
      const g = (d && d.guide) || {};
      blocs = (g.blocs || []).slice();
      E.titre = g.titre || '';
      E.etat = g.etat || 'brouillon';
    }catch(e){
      showToast('Lecture impossible : ' + e.message);
      dessinerParcours();
      return;
    }
  }
  E.etapes = versEtapesParcours(blocs);
  if(!E.etapes.length) E.etapes.push({ titre: { type: 'titre', titre: '', texte: '', fichier: '', duree: 0 }, contenus: [] });
  E.etapes[0].ouverte = true;
  E.dernier = neuf ? '' : JSON.stringify({ t: E.titre, e: E.etat, g: idGroupe, b: versBlocsParcours(E.etapes) });

  const racine = document.createElement('div');
  racine.className = 'pcEd';
  racine.id = 'pcEditeur';

  /* ── relire ce qui est à l'écran ── */
  const relireEtape = (i) => {
    const corps = E.corps[i];
    if(!corps) return;
    const lignes = Array.prototype.filter.call(corps.querySelector('.pcBlocs').children, l => l.dataset && l.dataset.rang);
    lignes.forEach((l, k) => relireUnBloc(l, E.etapes[i].contenus[k]));
  };
  const relireTout = () => {
    E.corps.forEach((c, i) => relireEtape(i));
    const tg = racine.querySelector('.pcTitreG');
    if(tg) E.titre = tg.value;
    racine.querySelectorAll('[data-etape-nom]').forEach(inp => {
      const et = E.etapes[Number(inp.dataset.etapeNom)];
      if(et && et.titre) et.titre.titre = inp.value;
    });
  };
  const instantane = () => JSON.stringify({ t: E.titre.trim(), e: E.etat, g: idGroupe, b: versBlocsParcours(E.etapes) });

  /* ── l'enregistrement automatique ── */
  const dire = (t, ko) => {
    E.statut = t;
    const s = racine.querySelector('.pcSauve');
    if(s){ s.textContent = t; s.classList.toggle('ko', !!ko); }
  };
  const planifier = () => {
    clearTimeout(E.minuterie);
    E.planifie = true;
    E.minuterie = setTimeout(sauver, PC_DELAI);
  };
  const sauver = async () => {
    clearTimeout(E.minuterie);
    E.planifie = false;
    if(!document.body.contains(racine)) return;
    if(E.enCours){ E.encore = true; return; }
    relireTout();
    if(!E.titre.trim()){ dire('✏️ Donne un titre au guide : il s’enregistrera tout seul'); return; }
    /* Chaque titre d'étape garde son identifiant (v1223) — posés sur tous, vides compris */
    poserLesIdsDesTitres(versBlocsParcours(E.etapes));
    const snap = instantane();
    if(snap === E.dernier){ if(!E.statut || /Enregistrement|Modifié/.test(E.statut)) dire('💾 Enregistré'); return; }
    E.enCours = true;
    dire('⏳ Enregistrement…');
    const tous = versBlocsParcours(E.etapes);
    try{
      const rep = await appelPrep({ action: 'parcoursGuideSet', id: idPose, groupe: idGroupe, titre: E.titre.trim(), etat: E.etat,
                                    blocs: versBlocsParcours(E.etapes),
                                    par: (typeof ACCES !== 'undefined' && ACCES.moniteur) || '' });
      if(rep && rep.status === 'error') throw new Error(rep.message || 'refusé');
      E.dernier = snap;
      neuf = false;
      const h = new Date();
      dire('💾 Enregistré à ' + String(h.getHours()).padStart(2, '0') + ':' + String(h.getMinutes()).padStart(2, '0'));
      /* 🎬 v1252 — un classeur d'avant la v250 jette la recette du montage */
      if(!E.versionVue && tous.some(b => b && b.montage) && rep && rep.versionScript !== undefined && Number(rep.versionScript) < 250){
        E.versionVue = true;
        informer('⚠️ Le montage n’a pas été gardé : le script Google Sheets n’est pas à jour (v' + rep.versionScript +
                 ', il faut la v250).\n\nLa vidéo est bien déposée ; mets le script à jour, puis rouvre le guide et refais « 🎬 Monter la vidéo ».');
      }
      /* 🎞️ v1253 — les vidéos d'origine des vidéos floutées, seulement maintenant */
      effacerLesFichiersRemplaces(tous).catch(() => {});
      const l = parcoursGuides.find(g => g.id === idPose);
      if(l){ l.titre = E.titre.trim(); l.etat = E.etat; l.groupe = idGroupe; }
      majBarre();
    }catch(e){
      dire('⚠️ Pas enregistré : ' + (e.message || 'erreur') + ' — nouvel essai dans 10 s', true);
      E.minuterie = setTimeout(sauver, 10000);
    }finally{
      E.enCours = false;
      if(E.encore){ E.encore = false; planifier(); }
    }
  };
  const modifie = () => { dire('✏️ Modifié…'); planifier(); };
  /* Une vidéo montée, un fichier déposé : le bloc change sans frappe. On regarde. */
  const veille = setInterval(() => {
    if(!document.body.contains(racine)){ clearInterval(veille); window.removeEventListener('resize', auRedimensionnement); return; }
    if(E.enCours) return;
    relireTout();
    if(E.titre.trim() && instantane() !== E.dernier && !E.planifie){ dire('✏️ Modifié…'); planifier(); }
  }, 5000);

  /* ── quitter ── */
  const quitter = async () => {
    relireTout();
    if(E.titre.trim() && instantane() !== E.dernier){ await sauver(); }
    let n = 0;
    while(E.enCours && n++ < 60) await new Promise(r => setTimeout(r, 250));
    if(E.titre.trim() && instantane() !== E.dernier &&
       !await confirmer('Le guide n’a pas pu être enregistré (' + E.statut + ').\n\nQuitter quand même ? Les derniers changements seront perdus.')) return;
    if(!E.titre.trim() && neuf){
      if(versBlocsParcours(E.etapes).some(b => !blocVideParcours(b)) &&
         !await confirmer('Ce guide n’a pas de titre : il n’est pas enregistré.\n\nQuitter quand même ?')) return;
    }
    clearInterval(veille);
    window.removeEventListener('resize', auRedimensionnement);
    parcoursGroupeOuvert = idGroupe;
    afficherParcours();
  };

  /* ── les gestes sur les étapes ── */
  const nouvelleEtape = (titre) => ({ titre: { type: 'titre', titre: titre || '', texte: '', fichier: '', duree: 0 }, contenus: [] });
  const ajouterEtape = () => {
    relireTout();
    E.etapes.push(nouvelleEtape(''));
    E.ici = E.etapes.length - 1;
    E.etapes[E.ici].ouverte = true;
    dessiner();
    const f = racine.querySelector('[data-etape-nom="' + E.ici + '"]');
    if(f) f.focus();
    modifie();
  };
  const plusieursEtapes = async () => {
    relireTout();
    const boite = document.createElement('div');
    boite.innerHTML = '<div style="font-size:14px;line-height:1.55;margin-bottom:10px;">Une étape par ligne. Elles s’ajoutent à la suite, vides, prêtes à remplir.</div>';
    const ta = document.createElement('textarea');
    ta.id = 'pcLot';
    ta.rows = 7;
    ta.placeholder = 'Le carrefour à l’indonésienne\nLa priorité à droite cachée\nLe stop sans visibilité';
    ta.style.cssText = 'width:100%;font-family:inherit;font-size:15px;line-height:1.7;margin:0;';
    boite.appendChild(ta);
    const cpt = document.createElement('div');
    cpt.style.cssText = 'font-size:12px;color:var(--muted);margin-top:8px;';
    boite.appendChild(cpt);
    const lignes = () => ta.value.split('\n').map(l => l.replace(/^\s*[#\-•*\d.)]+\s*/, '').trim()).filter(Boolean);
    ta.addEventListener('input', () => { const n = lignes().length; cpt.textContent = n ? n + ' étape' + (n > 1 ? 's' : '') + ' seront créées.' : ''; });
    setTimeout(() => ta.focus(), 50);
    const ok = await fenetre(boite, [{ nom: 'Annuler', valeur: false }, { nom: '➕ Créer les étapes', valeur: true, principal: true }], '📋 Plusieurs étapes d’un coup');
    const l = lignes();
    if(!ok || !l.length) return;
    /* Une première étape encore vide (guide neuf) prend la première ligne */
    const der = E.etapes[E.etapes.length - 1];
    let k = 0;
    if(der && der.titre && !der.titre.titre.trim() && !der.contenus.length){ der.titre.titre = l[0]; k = 1; }
    const debut = E.etapes.length - (k ? 1 : 0);
    l.slice(k).forEach(t => E.etapes.push(nouvelleEtape(t)));
    E.ici = debut;
    E.etapes[debut].ouverte = true;
    dessiner();
    modifie();
    showToast('➕ ' + l.length + ' étape' + (l.length > 1 ? 's' : '') + ' créée' + (l.length > 1 ? 's' : ''));
  };
  const supprimerEtape = async (i) => {
    relireTout();
    const et = E.etapes[i];
    const pleins = et.contenus.filter(b => !blocVideParcours(b)).length;
    if((pleins || (et.titre && et.titre.titre.trim())) &&
       !await confirmer('Supprimer l’étape « ' + ((et.titre && et.titre.titre.trim()) || 'sans nom') + ' »' +
                        (et.contenus.length ? ' et ses ' + et.contenus.length + ' bloc' + (et.contenus.length > 1 ? 's' : '') : '') + ' ?')) return;
    E.etapes.splice(i, 1);
    if(!E.etapes.length) E.etapes.push(nouvelleEtape(''));
    E.ici = Math.min(E.ici, E.etapes.length - 1);
    dessiner();
    modifie();
  };
  const rangerEtapes = (ordre) => {
    relireTout();
    const parCle = {};
    E.etapes.forEach((et, i) => { parCle['e' + i] = et; });
    const ici = E.etapes[E.ici];
    const intro = E.etapes.filter(et => !et.titre);
    E.etapes = intro.concat(ordre.map(c => parCle[c]).filter(Boolean));
    E.ici = Math.max(0, E.etapes.indexOf(ici));
    dessiner();
    modifie();
  };

  /* ── une étape : ses blocs, « ajouter ici », les fichiers glissés ── */
  const corpsDEtape = (et, i) => {
    const corps = document.createElement('div');
    corps.className = 'pcCorps';
    corps.dataset.corps = i;
    const zb = document.createElement('div');
    zb.className = 'pcBlocs';
    zb.id = 'pdBlocs' + i;
    if(!et.contenus.length){
      const v = document.createElement('div');
      v.className = 'pcAide';
      v.textContent = et.titre ? 'Étape vide : ajoute ce que l’élève verra.' : 'Rien avant la première étape.';
      zb.appendChild(v);
    }
    et.contenus.forEach((b, k) => zb.appendChild(ligneDeBloc(b, k)));
    corps.appendChild(zb);
    zb.addEventListener('click', (e) => {
      const s = e.target.closest && e.target.closest('[data-retirer]');
      if(!s) return;
      const ligne = s.closest('[data-rang]');
      if(!ligne || ligne.parentNode !== zb) return;
      relireTout();
      const k = Number(String(ligne.dataset.rang || '').slice(1));
      if(!isNaN(k) && k >= 0 && k < et.contenus.length){
        et.contenus.splice(k, 1);
      }
      dessiner();
      modifie();
    });
    listeRangeable(zb, ordre => {
      relireTout();
      const parCle = {};
      et.contenus.forEach((b, k) => { parCle['b' + k] = b; });
      et.contenus = ordre.map(c => parCle[c]).filter(Boolean);
      dessiner();
      modifie();
    });

    const aj = document.createElement('div');
    aj.className = 'pcAjout';
    aj.innerHTML = '<span class="pcMeta" style="margin-right:2px;">Ajouter dans cette étape :</span>';
    BLOCS_PARCOURS.filter(t => t.type !== 'titre').forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.dataset.ajout = t.type;
      b.textContent = '＋ ' + t.emoji + ' ' + t.nom;
      b.addEventListener('click', () => {
        relireTout();
        et.contenus.push({ type: t.type, texte: '', fichier: '', titre: '', duree: 0 });
        E.ici = i; et.ouverte = true;
        dessiner();
        const c2 = E.corps[i];
        const rangees = c2 ? Array.prototype.filter.call(c2.querySelector('.pcBlocs').children, l => l.dataset && l.dataset.rang) : [];
        const der = rangees[rangees.length - 1];
        if(der){
          der.scrollIntoView({ block: 'nearest' });
          /* Un média : on choisit le fichier tout de suite (même geste) */
          const fi = t.type !== 'texte' && der.querySelector('input[type=file]');
          if(fi) fi.click();
          const ta = t.type === 'texte' && der.querySelector('textarea');
          if(ta) ta.focus();
        }
        modifie();
      });
      aj.appendChild(b);
    });
    const dz = document.createElement('div');
    dz.className = 'pcDepose';
    dz.tabIndex = 0;
    dz.setAttribute('role', 'button');
    dz.textContent = '⬇️ Glisse ici tes vidéos (MP4), images et PDF — un bloc par fichier · ou touche pour les choisir';
    const choix = document.createElement('input');
    choix.type = 'file';
    choix.multiple = true;
    choix.accept = 'video/mp4,image/jpeg,image/png,image/webp,application/pdf';
    choix.style.display = 'none';
    dz.addEventListener('click', () => choix.click());
    dz.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); choix.click(); } });
    choix.addEventListener('change', () => {
      const l = choix.files ? Array.prototype.slice.call(choix.files) : [];
      choix.value = '';
      if(l.length) deposerDansLEtape(et, i, l, dz);
    });
    corps.addEventListener('dragover', (e) => { if(e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') !== -1){ e.preventDefault(); dz.classList.add('sur'); } });
    corps.addEventListener('dragleave', (e) => { if(!corps.contains(e.relatedTarget)) dz.classList.remove('sur'); });
    corps.addEventListener('drop', (e) => {
      if(!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      e.preventDefault();
      dz.classList.remove('sur');
      deposerDansLEtape(et, i, Array.prototype.slice.call(e.dataTransfer.files), dz);
    });
    aj.appendChild(dz);
    aj.appendChild(choix);
    corps.appendChild(aj);
    E.corps[i] = corps;
    return corps;
  };

  /* Plusieurs fichiers d'un coup : un bloc par fichier, le type reconnu */
  const deposerDansLEtape = async (et, i, fichiers, dz) => {
    const bons = fichiers.filter(genreDuFichierParcours);
    const refuses = fichiers.length - bons.length;
    if(!bons.length){ showToast('Seulement des vidéos MP4, des images (JPEG, PNG, WebP) et des PDF.'); return; }
    const neufs = [];
    for(let n = 0; n < bons.length; n++){
      const f = bons[n], genre = genreDuFichierParcours(f);
      const rang = bons.length > 1 ? ' (' + (n + 1) + '/' + bons.length + ')' : '';
      dz.textContent = '📤 ' + f.name + rang + '…';
      try{
        const cle = await deposerUnFichier(genre, f, (pc) => { dz.textContent = '📤 ' + f.name + rang + ' — ' + pc + ' %'; });
        let lien = '';
        try{ lien = await lienDuFichierDeGuide(cle); }catch(e){ lien = ''; }
        neufs.push({ type: genre, texte: '', fichier: cle, titre: f.name.replace(/\.[^.]+$/, ''), duree: 0, poids: f.size, lien: lien, liens: lien ? [lien] : [] });
      }catch(e){
        showToast('Dépôt impossible (' + f.name + ') : ' + e.message);
      }
    }
    if(!document.body.contains(racine)) return;
    relireTout();
    et.contenus = et.contenus.concat(neufs);
    E.ici = Math.max(0, E.etapes.indexOf(et)); et.ouverte = true;
    dessiner();
    if(neufs.length) showToast('✅ ' + neufs.length + ' fichier' + (neufs.length > 1 ? 's' : '') + ' ajouté' + (neufs.length > 1 ? 's' : '') +
                               (refuses ? ' · ' + refuses + ' ignoré' + (refuses > 1 ? 's' : '') + ' (ni MP4, ni image, ni PDF)' : ''));
    modifie();
  };

  /* ── ce que voit l'élève (ordinateur) ── */
  const dessinerApercu = () => {
    const z = E.apercu;
    if(!z) return;
    const et = E.etapes[E.ici];
    const avecTitre = E.etapes.filter(x => x.titre).length;
    const n = et && et.titre ? E.etapes.filter(x => x.titre).indexOf(et) + 1 : 0;
    let h = '<div class="h">' + echParcours((grp.icone ? grp.icone + ' ' : '') + (E.titre || 'Le guide')) + '</div><div class="c">' +
      (n ? '<div class="lg" style="margin:0 0 6px;">Étape ' + n + ' sur ' + avecTitre + '</div>' : '') + '<div class="e">' +
      (et && et.titre ? '<b>' + echParcours(et.titre.titre || 'Étape sans nom') + '</b>' : '');
    ((et && et.contenus) || []).forEach(b => {
      if(b.type === 'texte'){ if(String(b.texte || '').trim()) h += '<p>' + echParcours(b.texte) + '</p>'; return; }
      const liens = liensDuBloc(b), cles = clesDuBloc(b);
      if(b.type === 'video'){
        h += '<div class="vid">' + (liens[0] ? '<video src="' + echParcours(liens[0]) + '#t=0.5" preload="metadata" muted playsinline></video>' : '') +
             '<span style="position:absolute;">▶</span></div><div class="lg">' + echParcours(b.titre || 'Vidéo') + (cles.length ? '' : ' — ⚠️ pas encore déposée') + '</div>';
      }else if(b.type === 'image'){
        h += '<div class="imgs">' + (liens.length ? liens.slice(0, 3).map(l => '<img src="' + echParcours(l) + '" alt="">').join('') : '<div class="vid" style="background:#e3e1d8;color:#5f6b63;font-size:13px;width:100%;">🖼️</div>') +
             '</div><div class="lg">' + echParcours(b.titre || 'Images') + (cles.length > 1 ? ' · ' + cles.length + ' images' : '') + (cles.length ? '' : ' — ⚠️ pas encore déposée') + '</div>';
      }else if(b.type === 'pdf'){
        h += '<p>📄 <u>' + echParcours(b.titre || 'Le document') + '</u>' + (cles.length ? '' : ' — ⚠️ pas encore déposé') + '</p>';
      }
    });
    h += '</div>' + (n ? '<div class="vu">✅ J’ai vu cette étape</div>' : '') + '</div>';
    z.innerHTML = h;
  };
  let minApercu = null;
  racine.addEventListener('input', (e) => {
    if(e.target && e.target.classList && e.target.classList.contains('pcTitreG')) E.titre = e.target.value;
    if(e.target && e.target.dataset && e.target.dataset.etapeNom !== undefined){
      const et = E.etapes[Number(e.target.dataset.etapeNom)];
      if(et && et.titre) et.titre.titre = e.target.value;
      const l = racine.querySelector('.pcSomL[data-i="' + e.target.dataset.etapeNom + '"] .t');
      if(l){ l.textContent = e.target.value || 'Étape sans nom'; l.classList.toggle('vide', !e.target.value.trim()); }
    }
    modifie();
    clearTimeout(minApercu);
    minApercu = setTimeout(() => { relireEtape(E.ici); dessinerApercu(); }, 300);
  });
  racine.addEventListener('change', () => modifie());

  /* ── la barre du haut ── */
  const majBarre = () => {
    const p = racine.querySelector('.pcBarre .pcPuce');
    if(p){ p.className = 'pcPuce ' + (E.etat === 'publie' ? 'pcPub' : 'pcBro'); p.textContent = E.etat === 'publie' ? '✅ Publié' : '✏️ Brouillon'; }
    const bp = racine.querySelector('.pcPublier');
    if(bp) bp.style.display = E.etat === 'publie' ? 'none' : '';
  };
  const publier = async () => {
    relireTout();
    if(!E.titre.trim()){ showToast('Donne un titre au guide.'); const t = racine.querySelector('.pcTitreG'); if(t) t.focus(); return; }
    const manquants = blocsSansFichier(versBlocsParcours(E.etapes));
    const sansNom = E.etapes.filter(et => et.titre && !et.titre.titre.trim()).length;
    if((manquants.length || sansNom) && !await confirmer(
        (manquants.length ? manquants.length + ' bloc(s) sans fichier déposé :\n' + manquants.map(m => '· ' + blocConnu(m.type).emoji + ' ' + (m.titre || blocConnu(m.type).nom)).join('\n') + '\n\n' : '') +
        (sansNom ? sansNom + ' étape(s) sans nom.\n\n' : '') +
        'Tout est gardé ; chez l’élève, un bloc sans fichier ne montre rien tant que tu n’as pas déposé le fichier.\n\nPublier quand même ?')) return;
    E.etat = 'publie';
    majBarre();
    await sauver();
    if(instantane() === E.dernier) showToast('Guide publié ✅ — il est chez les élèves de ce groupe');
  };
  const menu = async () => {
    relireTout();
    const choix = [];
    if(parcoursGroupes.length > 1) choix.push({ nom: '📁 Changer de groupe', valeur: 'groupe' });
    if(E.etat === 'publie') choix.push({ nom: '✏️ Repasser en brouillon', valeur: 'brouillon' });
    if(!neuf) choix.push({ nom: '🗑️ Supprimer ce guide', valeur: 'suppr' });
    choix.push({ nom: 'Fermer', valeur: '' });
    const v = await fenetre(E.etat === 'publie' ? 'Ce guide est publié : chaque changement arrive chez l’élève tout de suite.' :
                            'Ce guide est en brouillon : l’élève ne le voit pas.', choix, '⋯ ' + (E.titre || 'Le guide'));
    if(v === 'groupe'){ await changerDeGroupe(); return; }
    if(v === 'brouillon'){
      if(!await confirmer('Repasser « ' + E.titre + ' » en brouillon ?\n\nIl disparaît de chez les élèves jusqu’à ce que tu le republies.')) return;
      E.etat = 'brouillon'; majBarre(); await sauver();
    }else if(v === 'suppr'){
      if(!await confirmer('Supprimer « ' + E.titre + ' » ?\n\nSes étapes et ses blocs partent avec lui, et ça ne se défait pas.')) return;
      try{
        clearInterval(veille); clearTimeout(E.minuterie);
        await appelPrep({ action: 'parcoursGuideDelete', id: idPose });
        showToast('Guide supprimé ✅');
        parcoursGroupeOuvert = idGroupe;
        afficherParcours();
      }catch(e){ showToast('Impossible : ' + e.message); }
    }
  };
  /* 📁 v1324 — le guide part dans un autre groupe (il s'y range en dernier) */
  const changerDeGroupe = async () => {
    relireTout();
    if(!E.titre.trim()){ showToast('Donne d’abord un titre au guide.'); return; }
    const boite = document.createElement('div');
    boite.innerHTML = '<div style="font-size:14px;line-height:1.55;margin-bottom:10px;">« ' + echParcours(E.titre.trim()) + ' » va dans le groupe :</div>';
    const sel = document.createElement('select');
    sel.id = 'pcAutreGroupe';
    sel.style.cssText = 'width:100%;margin:0;';
    parcoursGroupes.filter(g => g.id !== idGroupe).forEach(g => {
      const o = document.createElement('option');
      o.value = g.id;
      o.textContent = (g.icone ? g.icone + ' ' : '') + g.nom + (g.fermeLe ? ' (fermé)' : '');
      sel.appendChild(o);
    });
    boite.appendChild(sel);
    const a = document.createElement('div');
    a.style.cssText = 'font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;';
    a.textContent = 'Il se range à la fin de ce groupe. Ce que les élèves ont déjà vu reste vu ; il n’apparaît que chez ceux à qui ce groupe est ouvert.';
    boite.appendChild(a);
    const ok = await fenetre(boite, [{ nom: 'Annuler', valeur: false }, { nom: '📁 Déplacer', valeur: true, principal: true }], '📁 Changer de groupe');
    const cible = sel.value;
    if(!ok || !cible || cible === idGroupe) return;
    const avant = idGroupe;
    idGroupe = cible;
    grp = parcoursGroupes.find(g => g.id === cible) || {};
    await sauver();
    if(instantane() !== E.dernier){ idGroupe = avant; grp = parcoursGroupes.find(g => g.id === avant) || {}; showToast('Pas déplacé : ' + E.statut); dessiner(); return; }
    try{
      const ids = parcoursGuides.filter(g => g.groupe === cible && g.id !== idPose).sort((x1, x2) => x1.ordre - x2.ordre).map(g => g.id).concat([idPose]);
      await appelPrep({ action: 'parcoursOrdre', quoi: 'guides', ids: ids });
    }catch(e){ /* il est dans le groupe ; seul son rang reste à refaire */ }
    showToast('📁 Guide déplacé dans « ' + (grp.nom || 'l’autre groupe') + ' » ✅');
    dessiner();
  };

  /* ↪️ v1324 — une étape (son nom et tout ce qu'elle contient) part dans un
     autre guide, de ce groupe ou d'un autre. L'autre guide s'enregistre
     d'abord : si ça échoue, rien n'est retiré d'ici. */
  const deplacerEtape = async (i) => {
    relireTout();
    const et = E.etapes[i];
    if(!et || !et.titre) return;
    const nom = (et.titre.titre || '').trim() || 'Étape sans nom';
    const boite = document.createElement('div');
    boite.innerHTML = '<div style="font-size:14px;line-height:1.55;margin-bottom:10px;">L’étape « ' + echParcours(nom) + ' »' +
      (et.contenus.length ? ' et ses ' + et.contenus.length + ' bloc' + (et.contenus.length > 1 ? 's' : '') : '') + ' vont à la fin du guide :</div>';
    const sel = document.createElement('select');
    sel.id = 'pcAutreGuide';
    sel.style.cssText = 'width:100%;margin:0;';
    sel.innerHTML = '<option value="" disabled selected>Choisis le guide…</option>';
    parcoursGroupes.forEach(g => {
      const og = document.createElement('optgroup');
      og.label = (g.icone ? g.icone + ' ' : '') + g.nom;
      guidesDuGroupe(g.id).filter(x2 => x2.id !== idPose).forEach(x2 => {
        const o = document.createElement('option');
        o.value = x2.id;
        o.textContent = x2.titre + (x2.etat === 'publie' ? '' : ' (brouillon)');
        og.appendChild(o);
      });
      const o = document.createElement('option');
      o.value = 'neuf:' + g.id;
      o.textContent = '➕ Un nouveau guide « ' + nom + ' »';
      og.appendChild(o);
      sel.appendChild(og);
    });
    boite.appendChild(sel);
    const a = document.createElement('div');
    a.style.cssText = 'font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;';
    a.textContent = 'Les élèves qui l’avaient déjà cochée devront la recocher dans l’autre guide.';
    boite.appendChild(a);
    const ok = await fenetre(boite, [{ nom: 'Annuler', valeur: false }, { nom: '↪️ Déplacer l’étape', valeur: true, principal: true }], '↪️ Déplacer une étape');
    const v = sel.value;
    if(ok && !v){ showToast('Choisis le guide où mettre l’étape.'); return; }
    if(!ok || !v) return;
    const morceau = [et.titre].concat(et.contenus).map(b => JSON.parse(JSON.stringify(b)));
    try{
      if(/^neuf:/.test(v)){
        const g = v.slice(5);
        delete morceau[0].id;
        poserLesIdsDesTitres(morceau);
        const r = await appelPrep({ action: 'parcoursGuideSet', id: idProposeParLEcran('gd'), groupe: g, titre: nom, etat: 'brouillon', blocs: morceau,
                                    par: (typeof ACCES !== 'undefined' && ACCES.moniteur) || '' });
        if(r && r.status === 'error') throw new Error(r.message || 'refusé');
      }else{
        const cible = parcoursGuides.find(x2 => x2.id === v);
        const d = await appelPrep({ action: 'parcoursGuide', id: v });
        const g = (d && d.guide) || {};
        const leurs = (g.blocs || []).slice();
        const pris = {};
        leurs.forEach(b => { if(b && b.type === 'titre' && b.id) pris[String(b.id)] = true; });
        if(morceau[0].id && pris[String(morceau[0].id)]) delete morceau[0].id;
        const tout = leurs.concat(morceau);
        poserLesIdsDesTitres(tout);
        const r = await appelPrep({ action: 'parcoursGuideSet', id: v, groupe: (cible && cible.groupe) || g.groupe, titre: g.titre || (cible && cible.titre) || 'Guide',
                                    etat: g.etat || (cible && cible.etat) || 'brouillon', blocs: tout, par: (typeof ACCES !== 'undefined' && ACCES.moniteur) || '' });
        if(r && r.status === 'error') throw new Error(r.message || 'refusé');
      }
    }catch(e){ await informer('L’étape n’a pas été déplacée : ' + e.message + '\n\nElle est toujours ici.', '⚠️ Pas déplacée'); return; }
    E.etapes.splice(i, 1);
    if(!E.etapes.length) E.etapes.push(nouvelleEtape(''));
    E.ici = Math.min(E.ici, E.etapes.length - 1);
    dessiner();
    await sauver();
    showToast('↪️ Étape déplacée ✅');
  };

  const barre = () => {
    const b = document.createElement('div');
    b.className = 'pcBarre';
    const r = document.createElement('button');
    r.type = 'button'; r.className = 'pcRetour';
    r.textContent = '‹ ' + ((grp.icone ? grp.icone + ' ' : '') + (grp.nom || 'Les guides'));
    r.addEventListener('click', quitter);
    const t = document.createElement('input');
    t.type = 'text'; t.className = 'pcTitreG'; t.id = 'pdTitre';
    t.placeholder = 'Le titre du guide'; t.value = E.titre;
    t.setAttribute('aria-label', 'Le titre du guide');
    const p = document.createElement('span'); p.className = 'pcPuce';
    const s = document.createElement('span'); s.className = 'pcSauve'; s.setAttribute('role', 'status'); s.textContent = E.statut || (neuf ? '✏️ Donne un titre au guide : il s’enregistrera tout seul' : '💾 Enregistré');
    b.append(r, t, p, s);
    if(!E.large){
      const v = document.createElement('button');
      v.type = 'button'; v.className = 'btn btn-secondary'; v.textContent = '👁️ Voir';
      v.addEventListener('click', () => { relireTout(); apercuDuGuide(E.titre.trim(), versBlocsParcours(E.etapes)); });
      b.appendChild(v);
    }
    const pub = document.createElement('button');
    pub.type = 'button'; pub.className = 'btn btn-primary pcPublier'; pub.textContent = '✅ Publier';
    pub.addEventListener('click', publier);
    const m = document.createElement('button');
    m.type = 'button'; m.className = 'btn btn-secondary'; m.textContent = '⋯'; m.setAttribute('aria-label', 'Plus');
    m.addEventListener('click', menu);
    b.append(pub, m);
    return b;
  };

  /* ── l'en-tête d'une étape (nom, ranger, supprimer) ── */
  const enteteDEtape = (et, i, carte) => {
    const h = document.createElement('div');
    h.className = 'pcEtT';
    const avecTitre = E.etapes.filter(x => x.titre);
    if(et.titre && carte){
      const p = document.createElement('span'); p.className = 'pcPoi'; p.dataset.poignee = '1'; p.textContent = '⠿'; p.title = 'Attrape pour ranger l’étape';
      h.appendChild(p);
    }
    const num = document.createElement('span');
    num.className = 'pcNum' + (et.titre ? '' : ' intro');
    num.textContent = et.titre ? String(avecTitre.indexOf(et) + 1) : '•';
    h.appendChild(num);
    if(et.titre){
      const inp = document.createElement('input');
      inp.type = 'text'; inp.className = 'pcEtNom' + (carte ? '' : ' grand');
      inp.dataset.etapeNom = String(i);
      inp.placeholder = 'Nom de l’étape…'; inp.value = et.titre.titre || '';
      inp.setAttribute('aria-label', 'Nom de l’étape ' + (avecTitre.indexOf(et) + 1));
      h.appendChild(inp);
    }else{
      const s = document.createElement('span');
      s.style.cssText = 'flex:1;font-size:14px;font-weight:700;color:var(--muted);';
      s.textContent = avecTitre.length ? 'Avant la première étape' : 'Tout le guide (une seule étape)';
      h.appendChild(s);
    }
    if(carte){
      const meta = document.createElement('span');
      meta.className = 'pcMeta';
      const em = et.contenus.map(b => blocConnu(b.type).emoji).join(' ');
      const manque = et.contenus.filter(b => !blocEcrit(b.type) && !clesDuBloc(b).length).length;
      meta.innerHTML = echParcours(em) + (manque ? ' · <span style="color:var(--warn-text, #b4471a)">⚠️ ' + manque + ' fichier' + (manque > 1 ? 's' : '') + ' à déposer</span>' : '');
      h.appendChild(meta);
      if(et.titre){
        const fl = document.createElement('span');
        fl.innerHTML = '<span class="pcIco" data-monter title="Monter l’étape">▲</span><span class="pcIco" data-descendre title="Descendre l’étape">▼</span>';
        h.appendChild(fl);
      }
    }
    if(et.titre){
      const dep = document.createElement('button');
      dep.type = 'button'; dep.className = 'pcIco pcDeplacer'; dep.textContent = '↪️'; dep.title = 'Déplacer l’étape vers un autre guide';
      dep.setAttribute('aria-label', 'Déplacer l’étape vers un autre guide');
      dep.addEventListener('click', (e) => { e.stopPropagation(); deplacerEtape(i); });
      h.appendChild(dep);
      const sup = document.createElement('button');
      sup.type = 'button'; sup.className = 'pcIco'; sup.textContent = '🗑️'; sup.title = 'Supprimer l’étape';
      sup.addEventListener('click', (e) => { e.stopPropagation(); supprimerEtape(i); });
      h.appendChild(sup);
    }
    if(carte){
      const tg = document.createElement('button');
      tg.type = 'button'; tg.className = 'pcIco'; tg.textContent = et.ouverte ? '▾' : '▸';
      tg.setAttribute('aria-expanded', et.ouverte ? 'true' : 'false');
      tg.title = et.ouverte ? 'Replier' : 'Déplier';
      tg.addEventListener('click', () => { relireTout(); et.ouverte = !et.ouverte; E.ici = i; dessiner(); });
      h.appendChild(tg);
    }
    return h;
  };

  /* ── l'écran : B (ordinateur) ou A (téléphone) ── */
  const dessiner = () => {
    const y = window.scrollY;
    E.large = (zone.clientWidth || racine.clientWidth || window.innerWidth) >= PC_LARGE;
    E.corps = [];
    E.apercu = null;
    racine.innerHTML = '';
    racine.appendChild(barre());
    majBarre();
    E.ici = Math.max(0, Math.min(E.ici, E.etapes.length - 1));
    if(E.large){
      const g = document.createElement('div');
      g.className = 'pcTrois';
      /* le sommaire */
      const som = document.createElement('div');
      som.className = 'pcSom';
      som.innerHTML = '<div class="pcSomT">Les étapes</div>';
      const ligneSom = (et, i) => {
        const l = document.createElement('div');
        l.className = 'pcSomL' + (i === E.ici ? ' on' : '');
        l.dataset.i = String(i);
        if(et.titre) l.dataset.rang = 'e' + i;
        const manque = et.contenus.some(b => !blocEcrit(b.type) && !clesDuBloc(b).length);
        const nom = et.titre ? (et.titre.titre || '').trim() : '';
        const avecTitre = E.etapes.filter(x => x.titre);
        l.innerHTML = (et.titre ? '<span class="pcPoi" data-poignee="1" title="Attrape pour ranger">⠿</span>' : '') +
          '<span class="pcNum' + (et.titre ? '' : ' intro') + '">' + (et.titre ? avecTitre.indexOf(et) + 1 : '•') + '</span>' +
          '<span class="t' + (et.titre && !nom ? ' vide' : '') + '">' + echParcours(et.titre ? (nom || 'Étape sans nom') : (avecTitre.length ? 'Avant la 1re étape' : 'Tout le guide')) + '</span>' +
          (manque ? '<span title="Un fichier manque">⚠️</span>' : (et.contenus.some(b => b.type === 'video') ? '<span>🎬</span>' : ''));
        l.addEventListener('click', (e) => {
          if(e.target.closest && e.target.closest('[data-poignee]')) return;
          relireTout(); E.ici = i; dessiner();
        });
        return l;
      };
      E.etapes.forEach((et, i) => { if(!et.titre) som.appendChild(ligneSom(et, i)); });
      const listeE = document.createElement('div');
      E.etapes.forEach((et, i) => { if(et.titre) listeE.appendChild(ligneSom(et, i)); });
      som.appendChild(listeE);
      listeRangeable(listeE, rangerEtapes);
      const bN = document.createElement('button');
      bN.type = 'button'; bN.className = 'btn btn-secondary'; bN.textContent = '➕ Nouvelle étape';
      bN.addEventListener('click', ajouterEtape);
      const bP = document.createElement('button');
      bP.type = 'button'; bP.className = 'btn btn-secondary'; bP.style.fontSize = '12px'; bP.textContent = '📋 Plusieurs d’un coup';
      bP.addEventListener('click', plusieursEtapes);
      som.append(bN, bP);
      /* l'étape */
      const mil = document.createElement('div');
      const et = E.etapes[E.ici];
      const carte = document.createElement('div');
      carte.className = 'pcEt';
      carte.appendChild(enteteDEtape(et, E.ici, false));
      carte.appendChild(corpsDEtape(et, E.ici));
      mil.appendChild(carte);
      const nav = document.createElement('div');
      nav.className = 'pcNav';
      const prec = E.etapes[E.ici - 1], suiv = E.etapes[E.ici + 1];
      const bPr = document.createElement('button'); bPr.type = 'button';
      bPr.textContent = prec ? '‹ Étape précédente' : '';
      if(prec) bPr.addEventListener('click', () => { relireTout(); E.ici--; dessiner(); });
      const bSu = document.createElement('button'); bSu.type = 'button'; bSu.className = 'suiv';
      bSu.textContent = suiv ? 'Étape suivante : ' + ((suiv.titre && suiv.titre.titre) || 'sans nom') + ' ›' : '➕ Nouvelle étape';
      bSu.addEventListener('click', () => { if(suiv){ relireTout(); E.ici++; dessiner(); } else ajouterEtape(); });
      nav.append(bPr, bSu);
      mil.appendChild(nav);
      /* l'aperçu */
      const ap = document.createElement('div');
      ap.innerHTML = '<div class="pcSomT" style="margin:0 0 8px;">👁️ Ce que voit l’élève</div>';
      const tel = document.createElement('div');
      tel.className = 'pcTel';
      ap.appendChild(tel);
      E.apercu = tel;
      g.append(som, mil, ap);
      racine.appendChild(g);
      dessinerApercu();
    }else{
      const liste = document.createElement('div');
      E.etapes.forEach((et, i) => {
        const c = document.createElement('div');
        c.className = 'pcEt';
        if(et.titre) c.dataset.rang = 'e' + i;
        c.appendChild(enteteDEtape(et, i, true));
        if(et.ouverte) c.appendChild(corpsDEtape(et, i));
        liste.appendChild(c);
      });
      racine.appendChild(liste);
      listeRangeable(liste, rangerEtapes);
      const nv = document.createElement('div');
      nv.className = 'pcNouv';
      const bN = document.createElement('button');
      bN.type = 'button'; bN.className = 'btn btn-secondary'; bN.style.flex = '2 1 200px'; bN.textContent = '➕ Nouvelle étape';
      bN.addEventListener('click', ajouterEtape);
      const bP = document.createElement('button');
      bP.type = 'button'; bP.className = 'btn btn-secondary'; bP.style.flex = '1 1 160px'; bP.textContent = '📋 Plusieurs étapes d’un coup';
      bP.addEventListener('click', plusieursEtapes);
      nv.append(bN, bP);
      racine.appendChild(nv);
    }
    if(Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
  };
  const auRedimensionnement = () => {
    const large = (zone.clientWidth || window.innerWidth) >= PC_LARGE;
    if(large !== E.large && document.body.contains(racine)){ relireTout(); dessiner(); }
  };
  window.addEventListener('resize', auRedimensionnement);

  zone.innerHTML = '';
  zone.appendChild(racine);
  dessiner();
  if(neuf){ const t = racine.querySelector('.pcTitreG'); if(t) t.focus(); }
  /* pour les bancs */
  racine._pc = { E: E, sauver: sauver, relireTout: relireTout, quitter: quitter };
}

/* ============================================================
   DÉPOSER UN FICHIER — v1034, étape 2 du parcours

   Avant : on TAPAIT le nom du fichier à la main, et une note disait
   « le fichier se déposera sur Cloudflare ». Le fichier n'allait
   nulle part. Un guide publié avec trois vidéos nommées à la main
   n'aurait rien montré à personne, et rien ne l'aurait dit.

   ⚠️ ET ÇA NE MONTE PAS EN UNE FOIS. Le corps d'une requête est
   plafonné à 100 Mo chez Cloudflare, et les vidéos du NAS montent à
   180 Mo. Le fichier part donc en morceaux de la taille que le
   Worker annonce — jamais une taille décidée ici : R2 refuse une
   découpe irrégulière, et il la refuse À LA FIN, quand tout est
   monté.

   ⚠️ UN DÉPÔT QUI ÉCHOUE SE RANGE DERRIÈRE LUI. Les morceaux déjà
   montés restent facturés tant que l'envoi n'est ni refermé ni
   abandonné. On abandonne donc, même quand c'est le réseau qui a
   lâché — surtout quand c'est le réseau qui a lâché.
   ============================================================ */
function estUneCleDeFichier(v){
  return /^guides\/[A-Za-z0-9]{22}\.[a-z0-9]{1,5}$/.test(String(v || ''));
}

/* ============================================================
   UN BLOC MÉDIA PORTE UNE LISTE — v1036

   David : « pour les images il faut la possibilité de mettre un
   carrousel d'images ».

   ⚠️ UNE SEULE FORME POUR LES TROIS TYPES. Un bloc 🎬 ou 📄 tient une
   liste d'UN fichier ; un bloc 🖼️ en tient autant qu'on veut. Deux
   formes selon le type auraient fait deux chemins de lecture, deux
   chemins de dépôt, et un des deux aurait fini par oublier quelque
   chose — c'est toujours comme ça que ça se passe.

   ⚠️ ET LES GUIDES D'AVANT CONTINUENT DE SE LIRE. « fichier » portait
   une clé seule : elle devient une liste d'un élément. Un nom tapé à
   la main d'avant la v1034 n'est pas une clé — il ne devient rien du
   tout, et le bloc se signale comme « à déposer ».
   ============================================================ */
function clesDuBloc(b){
  return String((b && b.fichier) || '').split('|')
    .map(x => x.trim())
    .filter(estUneCleDeFichier);
}

/* Les adresses signées que le relais a jointes au guide, dans le
   même ordre que les clés. */
function liensDuBloc(b){
  if(!b) return [];
  if(Array.isArray(b.liens)) return b.liens.slice();
  return b.lien ? [b.lien] : [];
}

/* ⚠️ VOIR CE QU'ON A DÉPOSÉ, PAS LIRE « ✅ Fichier déposé ». Sur un
   guide de six blocs, la phrase ne disait pas LEQUEL : il fallait
   ouvrir chacun pour savoir si on avait mis la bonne vidéo. */
function dessinerLesVignettes(zone, genre, cles, liens, retirer, deplacer){
  if(!zone) return;
  zone.innerHTML = '';
  if(!cles.length) return;

  cles.forEach((cle, i) => {
    const lien = liens[i] || '';
    const c = document.createElement('div');
    c.style.cssText = 'position:relative;width:88px;height:64px;' +
      'border:1px solid var(--line);border-radius:8px;overflow:hidden;' +
      'background:var(--navy);flex-shrink:0;display:flex;' +
      'align-items:center;justify-content:center;font-size:22px;' +
      'cursor:pointer;';

    if(!lien){
      /* Déposé, mais sans adresse signée — un guide relu par la voie
         de secours. On le dit plutôt que de montrer un carré vide. */
      c.textContent = (genre === 'video') ? '🎬'
                    : (genre === 'image') ? '🖼️' : '📄';
      c.title = 'Déposé — aperçu indisponible';
    }else if(genre === 'image'){
      const im = document.createElement('img');
      im.src = lien;
      im.alt = '';
      im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      c.appendChild(im);
    }else if(genre === 'video'){
      /* ⚠️ « preload=metadata » SUFFIT POUR LA PREMIÈRE IMAGE, et ne
         télécharge pas les 180 Mo. Une vignette qui charge la vidéo
         entière rendrait l'écran plus lent que ce qu'on répare. */
      const v = document.createElement('video');
      v.src = lien;
      v.preload = 'metadata';
      v.muted = true;
      v.playsInline = true;
      v.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      c.appendChild(v);
      const p = document.createElement('span');
      p.textContent = '▶';
      p.style.cssText = 'position:absolute;left:50%;top:50%;' +
        'transform:translate(-50%,-50%);color:#fff;font-size:20px;' +
        'text-shadow:0 0 6px rgba(0,0,0,.8);pointer-events:none;';
      c.appendChild(p);
    }else{
      c.textContent = '📄';
    }

    /* Ouvrir en grand : c'est la vérification d'avant, posée au même
       endroit que la vignette. */
    c.addEventListener('click', async () => {
      try{ await montrerLeFichier(genre, cle, '', lien); }
      catch(e){ showToast('Impossible : ' + e.message); }
    });

    if(typeof retirer === 'function'){
      const x = document.createElement('span');
      x.textContent = '×';
      x.title = 'Retirer';
      x.style.cssText = 'position:absolute;top:1px;right:3px;' +
        'color:#fff;background:rgba(0,0,0,.55);border-radius:50%;' +
        'width:18px;height:18px;line-height:17px;text-align:center;' +
        'font-size:14px;cursor:pointer;';
      x.addEventListener('click', (e) => { e.stopPropagation(); retirer(i); });
      c.appendChild(x);
    }

    /* ⚠️ L'ORDRE DU CARROUSEL SE CHOISIT — v1039.

       David : « je dois pouvoir choisir l'ordre du carrousel ». Les
       images partaient dans l'ordre où elles avaient été déposées, et
       douze panneaux pris au hasard d'un explorateur de fichiers, ce
       n'est pas un ordre.

       ⚠️ DES FLÈCHES, PAS UN GLISSER-DÉPOSER. Le doigt sur une
       vignette de 88 px, c'est le geste qui accroche — et c'est déjà
       la raison pour laquelle les blocs ont gardé leurs ▲▼. */
    if(typeof deplacer === 'function' && cles.length > 1){
      const fl = document.createElement('div');
      fl.style.cssText = 'position:absolute;left:0;right:0;bottom:0;' +
        'display:flex;justify-content:space-between;' +
        'background:rgba(0,0,0,.55);';
      [['\u25C0', -1, 'Vers la gauche'], ['\u25B6', 1, 'Vers la droite']]
        .forEach(function(t){
          const b = document.createElement('span');
          b.textContent = t[0];
          b.title = t[2];
          const bloque = (t[1] < 0 && i === 0) ||
                         (t[1] > 0 && i === cles.length - 1);
          b.style.cssText = 'flex:1;text-align:center;font-size:11px;' +
            'line-height:16px;color:' + (bloque ? '#666' : '#fff') + ';' +
            (bloque ? '' : 'cursor:pointer;');
          if(!bloque){
            b.addEventListener('click', (e) => {
              e.stopPropagation();
              deplacer(i, i + t[1]);
            });
          }
          fl.appendChild(b);
        });
      c.appendChild(fl);
    }

    zone.appendChild(c);
  });
}

function poidsLisible(octets){
  const o = Number(octets) || 0;
  if(o < 1024) return o + ' o';
  if(o < 1048576) return Math.round(o / 1024) + ' Ko';
  return (Math.round(o / 104857.6) / 10) + ' Mo';
}

async function deposerUnFichier(genre, fichier, avance){
  const ouvert = await appelPrep({
    action: 'parcoursDepotOuvrir',
    genre: genre,
    nom: fichier.name,
    taille: fichier.size
  });
  if(!ouvert || !ouvert.cle) throw new Error('Dépôt refusé');

  const taille = Number(ouvert.morceau) || 0;
  if(!(taille > 0)) throw new Error('Taille de morceau non annoncée');
  const total = Math.max(1, Math.ceil(fichier.size / taille));
  const morceaux = [];

  try{
    for(let n = 1; n <= total; n++){
      const debut = (n - 1) * taille;
      const bout = fichier.slice(debut, Math.min(debut + taille, fichier.size));
      const adresse = CONFIG.PARCOURS_MORCEAU_URL +
        '?cle=' + encodeURIComponent(ouvert.cle) +
        '&envoi=' + encodeURIComponent(ouvert.envoi) +
        '&jusqua=' + encodeURIComponent(ouvert.jusqua) +
        '&billet=' + encodeURIComponent(ouvert.billet) +
        '&n=' + n;
      /* ⚠️ PAS « fetchFiable » ICI. Elle rejoue l'appel quand le
         réseau tousse : un morceau de 8 Mio rejoué en aveugle, c'est
         le même numéro de morceau envoyé deux fois, et R2 garde le
         dernier. Ça marche — sauf que la boucle, elle, a déjà pris
         l'étiquette du premier. Le recollage échoue alors tout à la
         fin, sur un message que personne ne sait lire. */
      const r = await fetch(adresse, { method: 'POST', body: bout });
      if(!r.ok){
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || ('morceau ' + n + ' refusé (HTTP ' + r.status + ')'));
      }
      const d = await r.json();
      morceaux.push({ n: d.n, etag: d.etag });
      if(avance) avance(Math.round((n / total) * 100));
    }

    const fini = await appelPrep({
      action: 'parcoursDepotFermer',
      cle: ouvert.cle, envoi: ouvert.envoi, morceaux: morceaux
    });
    if(!fini || fini.status !== 'ok') throw new Error('Recollage refusé');
    return ouvert.cle;

  }catch(e){
    /* On range derrière soi avant de remonter l'erreur. */
    try{
      await appelPrep({ action: 'parcoursDepotAnnuler',
                        cle: ouvert.cle, envoi: ouvert.envoi });
    }catch(_){ /* le ménage de R2 s'en chargera */ }
    throw e;
  }
}

/* Le lien signé, demandé au moment de regarder — jamais gardé : il
   expire, et un lien périmé dans une page ouverte depuis deux heures
   ne montrerait qu'un carré noir. */
async function lienDuFichierDeGuide(cle){
  const d = await appelPrep({ action: 'parcoursFichierLien', cle: cle });
  if(!d || !d.lien) throw new Error('Lien indisponible');
  return CONFIG.WORKER_URL + d.lien;
}

function ligneDeBloc(b, i){
  const t = blocConnu(b.type);
  const l = document.createElement('div');
  l.dataset.rang = 'b' + i;
  l.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'margin-bottom:8px;padding:9px 10px;';

  const tete = document.createElement('div');
  tete.style.cssText = 'display:flex;align-items:center;gap:8px;';

  const poignee = document.createElement('span');
  poignee.dataset.poignee = '1';
  poignee.style.cssText = 'cursor:grab;color:var(--muted);font-size:15px;' +
    'flex-shrink:0;touch-action:none;padding:2px 4px;';
  poignee.textContent = '⠿';
  tete.appendChild(poignee);

  const nom = document.createElement('span');
  nom.style.cssText = 'flex:1;min-width:0;font-size:12.5px;font-weight:700;';
  nom.textContent = t.emoji + ' ' + t.nom;
  tete.appendChild(nom);

  const fleches = document.createElement('span');
  fleches.style.cssText = 'flex-shrink:0;color:var(--muted);font-size:13px;';
  fleches.innerHTML = '<span data-monter style="cursor:pointer;padding:0 3px;" ' +
    'title="Monter">▲</span><span data-descendre style="cursor:pointer;' +
    'padding:0 3px;" title="Descendre">▼</span>';
  tete.appendChild(fleches);

  const sup = document.createElement('span');
  sup.style.cssText = 'flex-shrink:0;cursor:pointer;font-size:13px;';
  sup.textContent = '🗑️';
  sup.title = 'Retirer ce bloc';
  sup.dataset.retirer = '1';
  tete.appendChild(sup);

  l.appendChild(tete);

  if(b.type === 'titre'){
    /* ⚠️ UNE LIGNE, PAS UN PAVÉ. Un titre d'étape est ce que l'élève
       verra en tête de la partie, et ce que le bureau lira dans le
       suivi : « Les vérifications intérieures ». Un textarea
       inviterait à y écrire un paragraphe, et le paragraphe
       deviendrait le nom de l'étape partout.

       ⚠️ ET LE CHAMP S'APPELLE « titre », comme sous une vidéo :
       c'est relireLesBlocs qui le range dans b.titre, et c'est
       b.titre que segmentsDuGuide lit côté classeur. Un autre nom
       de champ, et l'étape s'appellerait « Segment sans nom ». */
    const it = document.createElement('input');
    it.type = 'text';
    it.dataset.champ = 'titre';
    it.style.cssText = 'margin:8px 0 0;font-size:14px;font-weight:700;' +
      'width:100%;';
    it.placeholder = 'Ex : Les vérifications intérieures';
    it.value = b.titre || '';
    l.appendChild(it);

    const aide = document.createElement('div');
    aide.style.cssText = 'font-size:11px;color:var(--muted);margin-top:5px;' +
      'line-height:1.45;';
    aide.textContent = 'Coupe le guide en étapes : tout ce qui suit ce ' +
      'titre, jusqu\'au prochain, fait une étape que l\'élève coche ' +
      'séparément. Sans aucun titre, le guide ne fait qu\'une seule étape.';
    l.appendChild(aide);
  }else if(b.type === 'texte'){
    const ta = document.createElement('textarea');
    ta.dataset.champ = 'texte';
    ta.rows = 3;
    /* La charte donne aux textarea une police à chasse fixe et une
       largeur qui n'est pas celle de la carte : ici on écrit des
       phrases, pas du code. */
    ta.style.cssText = 'margin:8px 0 0;font-size:13px;width:100%;' +
      'font-family:inherit;line-height:1.6;';
    ta.placeholder = 'Ce que l\'élève doit lire ici.';
    ta.value = b.texte || '';
    l.appendChild(ta);
  }else{
    /* ============================================================
       UN BLOC MÉDIA PORTE UNE LISTE — v1036

       David : « pour les images il faut la possibilité de mettre un
       carrousel d'images ».

       ⚠️ UNE SEULE FORME POUR LES TROIS TYPES. Un bloc 🎬 ou 📄 tient
       une liste d'UN fichier ; un bloc 🖼️ en tient autant qu'on veut.
       Deux formes — « fichier » pour les uns, « fichiers » pour les
       autres — auraient fait deux chemins de lecture, deux chemins de
       dépôt, et un des deux aurait fini par oublier quelque chose.

       ⚠️ ET LES GUIDES D'AVANT CONTINUENT DE SE LIRE : un « fichier »
       seul devient une liste d'un élément. Voir clesDuBloc.
       ============================================================ */
    /* 🎬 v1252 — la vidéo a désormais son éditeur de montage : voir
       ligneDuBlocVideo, juste en dessous. */
    if(b.type === 'video' && typeof ECMontage !== 'undefined' &&
       typeof ouvrirEditeurMontage === 'function'){
      ligneDuBlocVideo(b, l);
      return l;
    }
    let cles = clesDuBloc(b);
    let liens = liensDuBloc(b);
    const plusieurs = (b.type === 'image');

    /* Les clés, rangées dans une case cachée : elles ne se tapent
       pas, elles se gagnent en déposant. */
    const f = document.createElement('input');
    f.type = 'hidden';
    f.dataset.champ = 'fichier';
    f.value = cles.join('|');
    l.appendChild(f);

    /* Le nom que l'élève lira sous le bloc. Il reste modifiable :
       « IMG_4417.mp4 » ne dit rien à personne. */
    const nom = document.createElement('input');
    nom.type = 'text';
    nom.dataset.champ = 'titre';
    nom.style.cssText = 'margin:8px 0 0;font-size:13px;width:100%;' +
      'font-family:inherit;';
    nom.placeholder = (b.type === 'video') ? 'Le créneau, vu de l’intérieur'
                    : plusieurs ? 'Les panneaux à reconnaître'
                    : 'La fiche à imprimer';
    /* ⚠️ LES GUIDES D'AVANT LA v1034 PORTENT UN NOM TAPÉ À LA MAIN
       DANS « fichier ». On ne le jette pas : il devient le nom
       affiché, et le bloc se signale comme « à déposer ». */
    nom.value = b.titre ||
      (estUneCleDeFichier(b.fichier) ? '' : String(b.fichier || ''));
    l.appendChild(nom);

    /* ⚠️ DES VIGNETTES, PAS UNE PHRASE — v1036.

       David : « j'ai besoin d'un aperçu de ce que j'ai déposé, pour
       les images une miniature, et pour les vidéos aussi, comme pour
       les pdf ». « ✅ Fichier déposé » ne dit PAS lequel : sur un
       guide de six blocs, il fallait ouvrir chacun pour savoir si on
       avait mis la bonne vidéo.

       ⚠️ ET LES LIENS ARRIVENT AVEC LE GUIDE. Le relais les signe en
       même temps qu'il rend les blocs : sans ça, il faudrait un appel
       par vignette — une lecture rapide suivie de six lentes. */
    const galerie = document.createElement('div');
    galerie.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;' +
      'margin-top:8px;';
    l.appendChild(galerie);

    const etat = document.createElement('div');
    etat.style.cssText = 'font-size:11.5px;margin-top:6px;line-height:1.5;';
    l.appendChild(etat);

    const barre = document.createElement('div');
    barre.style.cssText = 'display:none;height:5px;border-radius:3px;' +
      'background:var(--line);margin-top:6px;overflow:hidden;';
    const dedans = document.createElement('div');
    dedans.style.cssText = 'height:100%;width:0;background:var(--orange);' +
      'transition:width .2s;';
    barre.appendChild(dedans);
    l.appendChild(barre);

    const boutons = document.createElement('div');
    boutons.style.cssText = 'display:flex;gap:6px;margin-top:7px;flex-wrap:wrap;';
    l.appendChild(boutons);

    const choix = document.createElement('input');
    choix.type = 'file';
    choix.style.display = 'none';
    /* Plusieurs d'un coup pour un carrousel : douze panneaux ne se
       déposent pas douze fois. */
    if(plusieurs) choix.multiple = true;
    choix.accept = (b.type === 'video') ? 'video/mp4'
                 : plusieurs ? 'image/jpeg,image/png,image/webp'
                 : 'application/pdf';
    l.appendChild(choix);

    const redire = () => {
      f.value = cles.join('|');
      b.lien = liens[0] || '';
      etat.style.color = cles.length ? 'var(--accent-text)' : 'var(--warn-text)';
      etat.textContent = cles.length
        ? (plusieurs
            ? '✅ ' + cles.length + ' image' + (cles.length > 1 ? 's' : '')
            : '✅ Fichier déposé' +
              (b.poids ? ' — ' + poidsLisible(b.poids) : ''))
        : '⚠️ Aucun fichier déposé : ce bloc ne montrera rien à l’élève.';

      dessinerLesVignettes(galerie, b.type, cles, liens, (i) => {
        cles.splice(i, 1);
        liens.splice(i, 1);
        redire();
      }, (de, vers) => {
        if(vers < 0 || vers >= cles.length) return;
        /* ⚠️ LES DEUX LISTES BOUGENT ENSEMBLE. Déplacer la clé sans
           son adresse signée afficherait la vignette de la voisine —
           et on publierait le carrousel en croyant l'avoir rangé. */
        cles.splice(vers, 0, cles.splice(de, 1)[0]);
        liens.splice(vers, 0, liens.splice(de, 1)[0]);
        redire();
      });

      boutons.innerHTML = '';
      const bDep = document.createElement('button');
      bDep.className = 'btn btn-secondary';
      bDep.style.cssText = 'width:auto;margin:0;padding:7px 11px;font-size:12px;';
      bDep.textContent = plusieurs
        ? (cles.length ? '➕ Ajouter des images' : '📤 Déposer des images')
        : (cles.length ? '🔄 Remplacer' : '📤 Déposer le fichier');
      bDep.addEventListener('click', () => choix.click());
      boutons.appendChild(bDep);
    };

    choix.addEventListener('change', async () => {
      const fics = choix.files ? Array.prototype.slice.call(choix.files) : [];
      choix.value = '';
      if(!fics.length) return;
      /* Un bloc à un seul fichier remplace ; un carrousel ajoute. */
      const aFaire = plusieurs ? fics : fics.slice(0, 1);

      boutons.innerHTML = '';
      barre.style.display = 'block';
      etat.style.color = 'var(--muted)';

      for(let n = 0; n < aFaire.length; n++){
        const fic = aFaire[n];
        const rang = aFaire.length > 1 ? ' (' + (n + 1) + '/' + aFaire.length + ')' : '';
        dedans.style.width = '0';
        etat.textContent = '📤 Dépôt de ' + fic.name + ' (' +
                           poidsLisible(fic.size) + ')' + rang + '…';
        try{
          const cle = await deposerUnFichier(b.type, fic, (pc) => {
            dedans.style.width = pc + '%';
            etat.textContent = '📤 Dépôt' + rang + '… ' + pc + ' %';
          });
          let lien = '';
          /* La vignette du fichier qu'on vient de déposer : une
             adresse signée, demandée une fois, pour CE fichier. */
          try{ lien = await lienDuFichierDeGuide(cle); }catch(e){ lien = ''; }

          if(plusieurs){ cles.push(cle); liens.push(lien); }
          else{ cles = [cle]; liens = [lien]; b.poids = fic.size; }

          /* Le nom d'origine sert de proposition, jamais
             d'écrasement : un titre écrit à la main vaut mieux que
             « IMG_4417 ». */
          if(!nom.value.trim()) nom.value = fic.name.replace(/\.[^.]+$/, '');
        }catch(e){
          etat.style.color = 'var(--red)';
          etat.textContent = '❌ ' + (e.message || 'dépôt impossible');
          showToast('Dépôt impossible : ' + e.message);
          break;
        }
      }
      barre.style.display = 'none';
      redire();
      showToast('Dépôt terminé ✅');
    });

    redire();
  }
  return l;
}

/* ============================================================
   🎬 LE BLOC VIDÉO ET SON MONTAGE — v1252

   David, le 23 octobre : « que je puisse mettre des vidéos dans les
   groupes sans avoir à passer par un logiciel de montage avant ».
   Choisir la vidéo ouvre l'éditeur AVANT le dépôt (ec-montage-
   editeur.js) ; on y coupe, on titre, on habille, puis on enregistre
   — ou on dépose sans montage. Ensuite, le bloc montre ce qui a été
   monté, avec « 🎬 Modifier le montage » et « 🔄 Remplacer la vidéo »
   (le schéma v2, § 3, à l'identique).

   ⚠️ LA VIDÉO BRUTE N'EST JAMAIS TOUCHÉE. La recette se range dans
   « montage », à côté des clés : modifier le montage ne redépose
   rien, et ce qui est coupé reste là, rien n'est perdu.

   ⚠️ PLUSIEURS VIDÉOS BOUT À BOUT : leurs clés s'alignent dans
   « fichier », séparées par « | », comme les images d'un carrousel.
   Le relais les signe déjà dans cet ordre — la recette dit laquelle
   joue quand.

   ⚠️ ET LE NOM A ENFIN SON ÉTIQUETTE (défaut E2 / P1 de l'audit : un
   champ sans étiquette ne se lit pas au lecteur d'écran, et son
   exemple grisé disparaît dès qu'on tape).
   ============================================================ */
let numeroDeChampVideo = 0;
function ligneDuBlocVideo(b, l){
  const M = ECMontage;
  let cles = clesDuBloc(b);
  let liens = liensDuBloc(b);
  let liensM = (b.montage && b.montage.liens) || {};
  let montage = (b.montage && typeof b.montage === 'object' && cles.length)
    ? M.recettePropre(b.montage, cles.length) : null;

  const f = document.createElement('input');
  f.type = 'hidden'; f.dataset.champ = 'fichier';
  l.appendChild(f);
  const mt = document.createElement('input');
  mt.type = 'hidden'; mt.dataset.champ = 'montage';
  l.appendChild(mt);

  const idNom = 'pdNomVideo' + (++numeroDeChampVideo);
  const lab = document.createElement('label');
  lab.htmlFor = idNom;
  lab.textContent = 'Nom affiché à l’élève';
  lab.style.cssText = 'display:block;margin:10px 0 4px;font-size:13px;font-weight:700;' +
    'text-transform:none;letter-spacing:0;color:var(--text);';
  l.appendChild(lab);
  const nom = document.createElement('input');
  nom.type = 'text'; nom.id = idNom; nom.dataset.champ = 'titre';
  nom.style.cssText = 'margin:0;font-size:14px;width:100%;font-family:inherit;min-height:44px;';
  nom.value = b.titre || (estUneCleDeFichier(b.fichier) ? '' : String(b.fichier || ''));
  l.appendChild(nom);

  const rangee = document.createElement('div');
  rangee.style.cssText = 'display:flex;gap:10px;margin-top:10px;align-items:flex-start;';
  l.appendChild(rangee);

  const barre = document.createElement('div');
  barre.style.cssText = 'display:none;height:5px;border-radius:3px;' +
    'background:var(--line);margin-top:6px;overflow:hidden;';
  const dedans = document.createElement('div');
  dedans.style.cssText = 'height:100%;width:0;background:var(--orange);transition:width .2s;';
  barre.appendChild(dedans);
  l.appendChild(barre);

  const boutons = document.createElement('div');
  boutons.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin-top:10px;';
  l.appendChild(boutons);

  const choix = document.createElement('input');
  choix.type = 'file'; choix.accept = 'video/mp4'; choix.style.display = 'none';
  choix.tabIndex = -1; choix.setAttribute('aria-hidden', 'true');
  l.appendChild(choix);
  let remplacer = false;

  const bouton = (texte, prim, quoi) => {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'btn ' + (prim ? 'btn-primary' : 'btn-secondary');
    x.style.cssText = 'width:auto;margin:0;min-height:44px;padding:10px 14px;font-size:14px;';
    x.textContent = texte;
    x.addEventListener('click', quoi);
    return x;
  };

  const redire = () => {
    f.value = cles.join('|');
    mt.value = montage ? JSON.stringify(montage) : '';
    b.fichier = f.value;
    b.lien = liens[0] || '';
    b.liens = liens.slice();
    if(montage){ b.montage = JSON.parse(mt.value); b.montage.liens = liensM; b.duree = montage.duree; }
    else delete b.montage;

    rangee.innerHTML = '';
    if(cles.length){
      /* La vignette : la première image de ce que l'élève verra. */
      const vg = document.createElement('button');
      vg.type = 'button';
      vg.setAttribute('aria-label', 'Voir la vidéo comme l’élève la verra');
      vg.style.cssText = 'position:relative;width:64px;height:96px;flex-shrink:0;border:1px solid var(--line);' +
        'border-radius:10px;overflow:hidden;background:#000;padding:0;margin:0;cursor:pointer;';
      if(liens[0]){
        const v = document.createElement('video');
        const seg = montage ? M.segments(montage)[0] : null;
        const tv = (montage && montage.fabrique) ? montage.fabrique.de + 0.5 : (seg ? seg.de + 0.1 : 0.1);
        v.src = liens[(seg ? montage.clips[seg.ci].i : 0)] + '#t=' + tv;
        v.preload = 'metadata'; v.muted = true; v.playsInline = true;
        v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
        v.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;';
        vg.appendChild(v);
      }
      const p = document.createElement('span');
      p.textContent = '▶'; p.setAttribute('aria-hidden', 'true');
      p.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#fff;' +
        'font-size:20px;text-shadow:0 0 6px rgba(0,0,0,.8);';
      vg.appendChild(p);
      vg.addEventListener('click', () => {
        montrerLaVideoDuBloc({ cles: cles, liens: liens, montage: montage, liensM: liensM }, nom.value.trim())
          .catch(e => showToast('Impossible : ' + e.message));
      });
      rangee.appendChild(vg);
    }
    const infos = document.createElement('div');
    infos.style.cssText = 'flex:1;min-width:0;font-size:13.5px;line-height:1.5;';
    if(!cles.length){
      infos.style.color = 'var(--warn-text)';
      infos.textContent = '⚠️ Aucune vidéo déposée : ce bloc ne montrera rien à l’élève.';
    }else{
      const t = document.createElement('div');
      t.style.cssText = 'font-weight:700;color:var(--accent-text);';
      t.textContent = '✅ Vidéo' + (cles.length > 1 ? 's' : '') + ' déposée' + (cles.length > 1 ? 's (' + cles.length + ')' : '') +
                      (b.poids ? ' — ' + poidsLisible(b.poids) : '');
      infos.appendChild(t);
      const d = document.createElement('div');
      const fa = montage && montage.fabrique;
      d.textContent = fa
        ? '🎞️ Vidéo fabriquée' + (fa.le ? ' le ' + fa.le : '') + (fa.flou ? ' (floutée)' : '') + ' : tout est dans l’image.'
        : montage ? '🎬 Montage : ' + M.resume(montage) : '🎬 Sans montage : la vidéo telle quelle.';
      infos.appendChild(d);
      if(montage && montage.sousTitres && montage.sousTitres.on){
        const st = document.createElement('div');
        st.textContent = '💬 Sous-titres : ' + montage.sousTitres.n + ' phrase' + (montage.sousTitres.n > 1 ? 's' : '') + ' (bouton « CC » chez l’élève)';
        infos.appendChild(st);
      }
      if(fa){
        const e = document.createElement('div');
        e.style.color = 'var(--muted)';
        e.textContent = 'La vidéo d’origine ' + (b._aEffacer && b._aEffacer.length ? 'sera effacée à l’enregistrement du guide.' : 'est effacée : le flou ne peut plus être défait.');
        infos.appendChild(e);
      }else if(montage){
        const e = document.createElement('div');
        e.style.color = 'var(--muted)';
        e.textContent = 'L’élève voit ' + M.mmss(M.dureeTotale(montage)) +
                        ' · ce qui est coupé reste gardé, rien n’est perdu';
        infos.appendChild(e);
      }
    }
    rangee.appendChild(infos);

    boutons.innerHTML = '';
    if(cles.length && montage && montage.fabrique){
      boutons.appendChild(bouton('💬 Sous-titres', true, () => sousTitresSeuls()));
      boutons.appendChild(bouton('🔄 Remplacer la vidéo', false, () => { remplacer = true; choix.click(); }));
    }else if(cles.length){
      boutons.appendChild(bouton(montage ? '🎬 Modifier le montage' : '🎬 Monter la vidéo', true, () => modifier()));
      /* 🎞️ v1253 — l'option B : le montage devient un vrai fichier MP4,
         à envoyer ailleurs (Messenger…). Sur l'ordinateur seulement. */
      if(montage && typeof ECFabrique !== 'undefined' && window.VideoEncoder && !/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '')){
        boutons.appendChild(bouton('🎞️ Télécharger en MP4', false, () => telechargerLeMontage()));
      }
      boutons.appendChild(bouton('🔄 Remplacer la vidéo', false, () => { remplacer = true; choix.click(); }));
    }else{
      boutons.appendChild(bouton('📤 Choisir la vidéo', true, () => { remplacer = false; choix.click(); }));
    }
  };

  /* Déposer ce que l'éditeur a rendu : les vidéos neuves, la musique
     neuve. Ce qui était déjà déposé garde sa clé. */
  const deposer = async (res) => {
    /* 🎞️ v1253 — UNE VIDÉO FABRIQUÉE (le flou) : on ne dépose QUE le
       fichier fabriqué ; les vidéos d'origine déjà déposées seront
       effacées à l'enregistrement du guide (pas avant : le guide
       enregistré les montre encore). */
    if(res.fabrique){
      const fab = res.fabrique;
      const fic = new File([fab.blob], 'video.mp4', { type: 'video/mp4' });
      barre.style.display = 'block'; boutons.innerHTML = '';
      rangee.textContent = '📤 Dépôt de la vidéo fabriquée (' + poidsLisible(fic.size) + ')…';
      const cle = await deposerUnFichier('video', fic, (pc) => { dedans.style.width = pc + '%'; rangee.textContent = '📤 Dépôt de la vidéo fabriquée… ' + pc + ' %'; });
      let lien = '';
      try{ lien = await lienDuFichierDeGuide(cle); }catch(e){ lien = ''; }
      const raw = res.clips.filter(c => c.cle).map(c => c.cle).concat(cles.filter(c => c !== cle));
      aEffacerAvecLeGuide(b, raw.filter((x, i, l) => l.indexOf(x) === i));
      const rf = M.recettePropre({
        clips: [{ i: 0, debut: 0, fin: fab.duree, duree: fab.duree, l: fab.l, h: fab.h }],
        copy: { on: false }, fili: { on: false }, gen: { on: false },
        titre: { on: false, texte: res.recette.titre.texte, sous: res.recette.titre.sous },
        textes: [], muets: [], flous: [], musique: { on: false }, tr: res.recette.tr,
        fabrique: { de: fab.de, a: fab.a, flou: true, duree: fab.duree, le: new Date().toLocaleDateString('fr-FR') },
        sousTitres: res.recette.sousTitres, fichiers: {}
      }, 1);
      cles = [cle]; liens = [lien]; liensM = { polices: {} }; b.poids = fic.size;
      barre.style.display = 'none';
      await deposerLesSousTitres(rf, res.sousTitres);
      return rf;
    }
    const aEnvoyer = res.clips.filter(c => c.fichier).length +
                     ((res.musique && res.musique.fichier) ? 1 : 0);
    let rang = 0, poids = 0, ancien = 0;
    const nCles = [], nLiens = [];
    boutons.innerHTML = '';
    barre.style.display = aEnvoyer ? 'block' : 'none';
    const dire = (t) => { rangee.innerHTML = ''; const x = document.createElement('div'); x.style.cssText = 'font-size:13.5px;color:var(--muted);'; x.setAttribute('role', 'status'); x.textContent = t; rangee.appendChild(x); };
    for(const c of res.clips){
      if(!c.fichier){ nCles.push(c.cle); nLiens.push(c.lien || ''); ancien++; continue; }
      rang++;
      const quoi = aEnvoyer > 1 ? ' (' + rang + '/' + aEnvoyer + ')' : '';
      dire('📤 Dépôt de ' + c.fichier.name + ' (' + poidsLisible(c.fichier.size) + ')' + quoi + '…');
      dedans.style.width = '0';
      const cle = await deposerUnFichier('video', c.fichier, (pc) => {
        dedans.style.width = pc + '%'; dire('📤 Dépôt' + quoi + '… ' + pc + ' %');
      });
      let lien = '';
      try{ lien = await lienDuFichierDeGuide(cle); }catch(e){ lien = ''; }
      nCles.push(cle); nLiens.push(lien); poids += c.fichier.size;
    }
    const nLiensM = { polices: {} };
    const recette = res.recette;
    if(res.musique && res.musique.fichier){
      rang++;
      dire('📤 Dépôt de la musique' + (aEnvoyer > 1 ? ' (' + rang + '/' + aEnvoyer + ')' : '') + '…');
      dedans.style.width = '0';
      const nomM = res.musique.fichier.name;
      const fic = new File([res.musique.fichier], /\.m4a$/i.test(nomM) ? 'musique.m4a' : 'musique.mp3',
                           { type: res.musique.fichier.type });
      const cle = await deposerUnFichier('audio', fic, (pc) => { dedans.style.width = pc + '%'; });
      recette.fichiers.musique = cle;
      try{ nLiensM.musique = await lienDuFichierDeGuide(cle); }catch(e){ nLiensM.musique = ''; }
    }else if(res.musique && res.musique.cle){
      recette.fichiers.musique = res.musique.cle;
      nLiensM.musique = res.musique.lien || '';
    }
    Object.keys((recette.fichiers && recette.fichiers.polices) || {}).forEach(k => {
      nLiensM.polices[k] = (liensM.polices || {})[k] || '';
    });
    barre.style.display = 'none';
    const ancienSt = liensM.soustitres || '';
    cles = nCles; liens = nLiens; liensM = nLiensM;
    if(ancienSt) liensM.soustitres = ancienSt;
    if(poids) b.poids = ancien ? (Number(b.poids) || 0) + poids : poids;
    await deposerLesSousTitres(recette, res.sousTitres);
    return recette;
  };

  /* 💬 v1253 — les sous-titres relus partent dans un petit fichier
     .vtt ; s'ils n'ont pas changé, la recette garde celui d'avant. */
  const deposerLesSousTitres = async (recette, st) => {
    const avant = montage && montage.fichiers && montage.fichiers.soustitres;
    if(!st || !st.change){
      /* rien de touché : on garde le fichier d'avant tel quel (même si
         l'éditeur n'a pas pu le relire) */
      if(avant){ recette.fichiers.soustitres = avant; recette.sousTitres = M.copie(montage.sousTitres); }
      else recette.sousTitres = { on: false, n: 0 };
      return;
    }
    if(avant) aEffacerAvecLeGuide(b, [avant]);
    if(!st.cues.length){ recette.sousTitres = { on: false, n: 0 }; delete liensM.soustitres; return; }
    const fic = new File([M.versVTT(st.cues)], 'soustitres.vtt', { type: 'text/vtt' });
    const cle = await deposerUnFichier('soustitres', fic, () => {});
    recette.fichiers.soustitres = cle;
    recette.sousTitres.n = st.cues.length;
    try{ liensM.soustitres = await lienDuFichierDeGuide(cle); }catch(e){ liensM.soustitres = ''; }
  };

  /* 💬 Une vidéo fabriquée : seuls ses sous-titres se reprennent. */
  const sousTitresSeuls = async () => {
    const fa = montage.fabrique;
    let lien = liens[0];
    try{ lien = await lienDuFichierDeGuide(cles[0]); }catch(e){}
    let lienSt = '';
    if(montage.fichiers && montage.fichiers.soustitres){ try{ lienSt = await lienDuFichierDeGuide(montage.fichiers.soustitres); }catch(e){} }
    const res = await ouvrirEditeurMontage({
      mode: 'soustitres', titre: nom.value.trim(), sousTitres: lienSt,
      clips: [{ cle: cles[0], lien: lien, nom: (nom.value.trim() || 'Vidéo') + '.mp4' }],
      recette: { clips: [{ i: 0, debut: fa.de, fin: fa.a, duree: fa.duree, l: montage.clips[0].l, h: montage.clips[0].h }],
                 copy: { on: false }, titre: { on: false, texte: montage.titre.texte }, fili: { on: false }, gen: { on: false },
                 sousTitres: montage.sousTitres }
    });
    if(!res || !res.sousTitres) return;
    try{
      const rf = M.copie(montage);
      rf.sousTitres = { on: !!res.on, n: res.sousTitres.cues.length };
      await deposerLesSousTitres(rf, res.sousTitres);
      montage = M.recettePropre(rf, 1);
      redire();
      showToast('Sous-titres enregistrés ✅ — le guide s’enregistre tout seul');
    }catch(e){ redire(); showToast('Dépôt impossible : ' + e.message); }
  };

  /* 🎞️ Télécharger le montage en un vrai fichier MP4 (option B). */
  const telechargerLeMontage = async () => {
    try{
      const frais = await Promise.all(cles.map(c => lienDuFichierDeGuide(c).catch(() => '')));
      const fm = montage.fichiers || {};
      let mus = null;
      if(montage.musique.on && fm.musique){ try{ mus = await lienDuFichierDeGuide(fm.musique); }catch(e){} }
      let cues = [];
      if(montage.sousTitres.on && fm.soustitres){
        try{ const l = await lienDuFichierDeGuide(fm.soustitres); cues = M.depuisVTT(await (await fetch(l)).text()); }catch(e){}
      }
      const reg = await ECMontageEditeur.reglagesVideo();
      const lp = {};
      for(const k of Object.keys(fm.polices || {})){ try{ lp[k] = await lienDuFichierDeGuide(fm.polices[k]); }catch(e){} }
      const persos = ECMontageEditeur.persosDe(M.squelettePropre(reg.reglages || {}), lp);
      const x = await ECFabrique.fenetre({
        titre: 'Fabrication du fichier MP4', dureeEstimee: M.dureeContenu(montage),
        recette: montage, clips: frais.map((l, i) => ({ lien: l || liens[i] })), musique: mus, persos: persos,
        sousTitres: cues, incruster: cues.length > 0
      });
      ECFabrique.telecharger(x.blob, nom.value.trim() || 'video');
      showToast('🎞️ Fichier MP4 prêt (' + poidsLisible(x.blob.size) + ')');
    }catch(e){ showToast('Fabrication impossible : ' + e.message); }
  };

  /* Ouvrir l'éditeur — sur une vidéo neuve, ou sur ce qui est déposé. */
  const ouvrir = async (clips, recette, musique, nouveau, lienSt) => {
    const res = await ouvrirEditeurMontage({
      clips: clips, recette: recette, musique: musique, nouveau: nouveau, sousTitres: lienSt || '',
      liensPolices: liensM.polices || {},
      titre: nom.value.trim() || (clips[0] && clips[0].fichier ? clips[0].fichier.name.replace(/\.[^.]+$/, '') : '')
    });
    if(!res) return;
    try{
      if(res.sans){
        const fic = clips[0].fichier;
        const r2 = await deposer({ clips: [{ fichier: fic }], recette: { fichiers: {} }, musique: null });
        void r2;
        montage = null; liensM = {};
        b.poids = fic.size;
        if(!nom.value.trim()) nom.value = fic.name.replace(/\.[^.]+$/, '');
      }else{
        montage = await deposer(res);
        if(!nom.value.trim()) nom.value = montage.titre.texte ||
          (res.clips[0] && res.clips[0].fichier ? res.clips[0].fichier.name.replace(/\.[^.]+$/, '') : '');
      }
      redire();
      showToast(res.sans ? 'Vidéo déposée ✅' : 'Montage enregistré ✅ — le guide s’enregistre tout seul');
    }catch(e){
      barre.style.display = 'none';
      redire();
      showToast('Dépôt impossible : ' + e.message);
    }
  };

  const modifier = async () => {
    /* Des liens neufs : ceux du guide ont peut-être expiré (une heure). */
    const frais = await Promise.all(cles.map(c => lienDuFichierDeGuide(c).catch(() => '')));
    liens = frais.map((x, i) => x || liens[i] || '');
    const fm = (montage && montage.fichiers) || {};
    let musique = null;
    if(fm.musique){
      let lm = liensM.musique || '';
      try{ lm = await lienDuFichierDeGuide(fm.musique); }catch(e){}
      musique = { cle: fm.musique, lien: lm, nom: (montage && montage.musique.nom) || 'La musique choisie' };
    }
    const lp = {};
    for(const k of Object.keys(fm.polices || {})){
      try{ lp[k] = await lienDuFichierDeGuide(fm.polices[k]); }catch(e){ lp[k] = (liensM.polices || {})[k] || ''; }
    }
    liensM = Object.assign({}, liensM, { polices: Object.assign({}, liensM.polices || {}, lp) });
    const clips = cles.map((c, i) => ({ cle: c, lien: liens[i], nom: (nom.value.trim() || 'Vidéo') + (cles.length > 1 ? ' ' + (i + 1) : '') + '.mp4', poids: 0 }));
    let lienSt = '';
    if(fm.soustitres){ try{ lienSt = await lienDuFichierDeGuide(fm.soustitres); }catch(e){} }
    await ouvrir(clips, montage, musique, false, lienSt);
  };

  choix.addEventListener('change', async () => {
    const fic = choix.files && choix.files[0];
    choix.value = '';
    if(!fic) return;
    /* Remplacer garde l'habillage et le titre ; les coupes, les textes
       et les silences étaient ceux de l'autre vidéo. */
    const garde = (remplacer && montage) ? Object.assign({}, montage, { clips: [], textes: [], muets: [] }) : null;
    await ouvrir([{ fichier: fic }], garde, null, true);
  });

  redire();
}

/* 🎞️ v1253 — LES FICHIERS REMPLACÉS S'EFFACENT AVEC LE GUIDE, PAS
   AVANT. La vidéo d'origine d'une vidéo floutée doit disparaître (la
   plaque ne doit plus exister nulle part) — mais tant que le guide
   n'est pas enregistré, c'est elle qu'il montre encore. La liste est
   portée par le bloc lui-même, cachée de l'envoi (non énumérable) :
   un autre guide ne peut pas l'effacer par erreur. */
function aEffacerAvecLeGuide(b, cles){
  if(!b._aEffacer) Object.defineProperty(b, '_aEffacer', { value: [], enumerable: false, writable: true });
  (cles || []).forEach(c => { if(estUneCleDeFichier(c) && b._aEffacer.indexOf(c) === -1) b._aEffacer.push(c); });
}
async function effacerLesFichiersRemplaces(blocs){
  const garder = {};
  (blocs || []).forEach(b => clesDuBloc(b).forEach(c => { garder[c] = 1; }));
  for(const b of (blocs || [])){
    const l = (b && b._aEffacer) || [];
    while(l.length){
      const c = l.shift();
      if(garder[c]) continue;   /* encore montrée par un bloc : on la garde */
      try{ await appelPrep({ action: 'parcoursFichierSuppr', cle: c }); }catch(e){ /* le ménage de R2 s'en chargera */ }
    }
  }
}

/* L'aperçu « comme l'élève la verra » : le même lecteur que chez lui. */
async function montrerLaVideoDuBloc(x, titre){
  if(!x.montage){ return montrerLeFichier('video', x.cles[0], titre, x.liens[0]); }
  const liens = await Promise.all(x.cles.map((c, i) => x.liens[i] ? Promise.resolve(x.liens[i]) : lienDuFichierDeGuide(c)));
  const reg = await ECMontageEditeur.reglagesVideo();
  const persos = ECMontageEditeur.persosDe(ECMontage.squelettePropre(reg.reglages || {}), (x.liensM && x.liensM.polices) || {});
  const boite = document.createElement('div');
  boite.style.cssText = 'max-width:100%;color:var(--text);';
  const lec = ECMontage.lecteur(boite, {
    recette: x.montage, clips: liens.map(l => ({ lien: l })),
    musique: (x.montage.musique.on && x.liensM && x.liensM.musique) ? x.liensM.musique : null,
    persos: persos, titre: titre, peutPasser: () => true,
    sousTitres: (x.liensM && x.liensM.soustitres) || ''
  });
  await fenetre(boite, [{ nom: 'Fermer', valeur: true }], '👁️ ' + (titre || 'La vidéo'));
  lec.detruire();
}

/* ⚠️ VÉRIFIER AVANT DE PUBLIER. Un .mp4 qui contient du VP9 s'ouvre
   ici en carré noir — et c'est exactement le cas de deux vidéos du
   NAS. Le voir maintenant coûte dix secondes ; le voir par un élève
   qui écrit « ça marche pas » coûte une semaine. */
async function montrerLeFichier(genre, cle, nom, dejaLa){
  /* Le lien arrive avec le guide depuis la v1036 : on ne redemande
     que s'il manque — un fichier déposé à l'instant, ou un guide lu
     par la voie de secours. */
  const lien = dejaLa || await lienDuFichierDeGuide(cle);
  const boite = document.createElement('div');
  boite.style.cssText = 'max-width:100%;';

  if(genre === 'video'){
    const v = document.createElement('video');
    v.controls = true;
    v.playsInline = true;
    v.preload = 'metadata';
    v.src = lien;
    v.style.cssText = 'width:100%;max-height:60vh;border-radius:10px;' +
      'background:#000;';
    boite.appendChild(v);
  }else if(genre === 'image'){
    const im = document.createElement('img');
    im.src = lien;
    im.alt = nom || '';
    im.style.cssText = 'width:100%;border-radius:10px;';
    boite.appendChild(im);
  }else{
    const a = document.createElement('a');
    a.href = lien;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = '📄 Ouvrir ' + (nom || 'le PDF');
    a.style.cssText = 'color:var(--accent-text);font-size:14px;';
    boite.appendChild(a);
  }

  await fenetre(boite, [{ nom: 'Fermer', valeur: true }],
                '👁️ ' + (nom || 'Le fichier'));
}

/* Ce que l'écran porte, reversé dans la pile avant l'envoi. */
function relireLesBlocs(cadre, blocs){
  const lignes = cadre.querySelectorAll('#pdBlocs [data-rang]');
  for(let i = 0; i < lignes.length && i < blocs.length; i++){
    const ta = lignes[i].querySelector('[data-champ="texte"]');
    const f = lignes[i].querySelector('[data-champ="fichier"]');
    const n = lignes[i].querySelector('[data-champ="titre"]');
    const mt = lignes[i].querySelector('[data-champ="montage"]');
    if(ta) blocs[i].texte = ta.value;
    if(f) blocs[i].fichier = f.value.trim();
    /* 🎬 v1252 — la recette du montage part avec le bloc (sans ses
       liens signés : ils expirent, le relais les refait). Vide : la
       vidéo est déposée sans montage. */
    if(mt){
      let m = null;
      try{ m = mt.value ? JSON.parse(mt.value) : null; }catch(e){ m = null; }
      if(m){ delete m.liens; blocs[i].montage = m; } else delete blocs[i].montage;
    }
    /* ⚠️ LE NOM SE RELIT AUSSI — v1034. Il était absent de cette
       boucle : le titre tapé sous une vidéo se serait perdu à
       l'enregistrement, sans une erreur, sans un mot. C'est le même
       oubli que la fiche du brouillon, et il ne se voit jamais au
       moment où on le commet. */
    if(n) blocs[i].titre = n.value.trim();
  }
  return blocs;
}

/* ⚠️ CE QUI EMPÊCHE DE PUBLIER. Un bloc média sans fichier déposé
   ne montre RIEN chez l'élève, et rien ne le dit une fois publié. On
   le dit avant. */
function blocsSansFichier(blocs){
  return (blocs || []).filter(b => !blocEcrit(b.type) &&
                                   clesDuBloc(b).length === 0);
}

function poserLesIdsDesTitres(blocs){
  const pris = {};
  (blocs || []).forEach(b => { if(b && b.type === 'titre' && b.id) pris[String(b.id)] = true; });
  let rang = 0;
  (blocs || []).forEach(b => {
    if(!b || b.type !== 'titre') return;
    rang++;
    if(b.id) return;
    let id = 't' + rang;
    while(pris[id]) id = 't' + rang + '-' + Math.random().toString(36).slice(2, 6);
    pris[id] = true;
    b.id = id;
  });
  return blocs;
}

/* ⚠️ VOIR AVANT DE PUBLIER. Composer à l'aveugle, c'est publier
   puis corriger — et corriger après, ça se voit. */
function apercuDuGuide(titre, blocs){
  const bouts = [];
  bouts.push('📘 ' + (titre || 'Sans titre'));
  bouts.push('');
  (blocs || []).forEach(b => {
    const t = blocConnu(b.type);
    if(b.type === 'titre'){
      /* L'aperçu doit montrer la COUPURE, pas une ligne de plus :
         c'est elle qu'on vient vérifier avant de publier. */
      bouts.push('── ' + (String(b.titre || '').trim() ||
                          '(étape sans nom)').toUpperCase() + ' ──');
    }else if(b.type === 'texte'){
      bouts.push(String(b.texte || '').trim() || '(texte vide)');
    }else{
      /* ⚠️ ON MONTRE CE QUE L'ÉLÈVE VERRA, pas la clé du fichier.
         « guides/xK3p… » ne veut rien dire pour personne, et un
         aperçu qui ment sur ce point ne sert à rien. */
      const combien = clesDuBloc(b).length;
      bouts.push(t.emoji + ' ' + (b.titre || t.nom) +
                 (b.type === 'video' && b.montage ? '  (montée : ' +
                   (typeof ECMontage !== 'undefined' ? ECMontage.resume(ECMontage.recettePropre(b.montage)) : 'oui') + ')' : '') +
                 (combien > 1 ? '  (' + combien + ' images)' : '') +
                 (combien ? '' : '  ⚠️ AUCUN FICHIER DÉPOSÉ — ce bloc ' +
                                 'sera vide chez l\'élève'));
    }
    bouts.push('');
  });
  fenetre(bouts.join('\n').trim() || 'Ce guide est vide.',
          [{ nom: 'Fermer', valeur: true }],
          '👁️ Comme l\'élève le verra');
}

/* ============================================================
   🎓 SUIVI > PARCOURS — v1037, étape 5

   David : « tu vois qui avance, qui arrive au cours sans rien avoir
   vu, et tu ouvres ou fermes sans quitter la fiche ».

   ⚠️ LE SECOND EST LE SEUL QUI COMPTE VRAIMENT. « 3 sur 6 » ne dit
   rien tout seul ; c'est « elle a cours jeudi et n'a rien regardé »
   qui fait décrocher le téléphone. La liste est donc rangée par
   URGENCE, pas par nom.

   ⚠️ ET LE CAS LE PLUS SILENCIEUX PASSE EN PREMIER : un élève à qui
   on a coché des groupes SANS ouvrir son module ne voit rien du
   tout. Rien à l'écran ne le disait — ni chez lui, ni ici.
   ============================================================ */
let suiviParcours = [];
/* Le catalogue des guides — titre, groupe, icône — rangé par
   identifiant. Il arrive UNE fois avec le suivi plutôt que recopié
   chez chacun des deux cents élèves. */
let guidesDuSuivi = {};
/* L'élève dont le détail est déplié. Un seul à la fois : deux
   panneaux ouverts sur une liste qu'on parcourt, ça se referme mal. */
let detailDuSuivi = '';

async function afficherSuiviParcours(){
  const zone = $('parcoursSuiviZone');
  if(!zone) return;
  zone.innerHTML = '<div class="empty">Lecture des parcours…</div>';

  try{
    const d = await appelPrep({ action: 'parcoursSuivi' });
    suiviParcours = (d && d.lignes) || [];
    guidesDuSuivi = (d && d.guides) || {};
  }catch(e){
    zone.innerHTML = '<div class="message erreur">Lecture impossible : ' +
      String(e.message).replace(/</g, '&lt;') + '</div>';
    return;
  }
  dessinerSuiviParcours();
}

/* ⚠️ L'URGENCE SE CALCULE, ELLE NE SE DEVINE PAS À L'ŒIL. Trois
   degrés, et ils se lisent dans cet ordre :
     1. le module fermé alors qu'on lui a coché des groupes ;
     2. un cours qui approche avec des étapes non vues ;
     3. le reste. */
function urgenceDuParcours(l){
  if(!l.ouvert && l.groupes) return 3;
  if(etapesDuSuiviParcours(l).reste && l.prochain){
    const j = joursAvantLeCours(l.prochain);
    if(j !== null && j <= 2) return 2;
    return 1;
  }
  return 0;
}

/* ⚠️ PAS « joursAvant » : ce nom est DÉJÀ pris par ec-postpermis.js.
   Sans modules, le dernier fichier chargé écrase l'autre — et on
   passe la journée à corriger un fichier que le navigateur n'exécute
   jamais. Le test des doublons l'a vu tout de suite. */
function joursAvantLeCours(iso){
  const t = String(iso || '').trim();
  if(!/^\d{4}-\d{2}-\d{2}/.test(t)) return null;
  const d = new Date(t.slice(0, 10) + 'T12:00:00');
  if(isNaN(d.getTime())) return null;
  const auj = new Date();
  auj.setHours(12, 0, 0, 0);
  return Math.round((d - auj) / 86400000);
}

function dessinerSuiviParcours(){
  const zone = $('parcoursSuiviZone');
  if(!zone) return;
  zone.innerHTML = '';

  if(!suiviParcours.length){
    zone.innerHTML = '<div class="empty">Aucun élève n\'a de parcours ouvert. ' +
      'Ça se fait dans l\'onglet 🔑 de sa fiche.</div>';
    return;
  }

  const rangees = suiviParcours.slice().sort((a, b) => {
    const ua = urgenceDuParcours(a), ub = urgenceDuParcours(b);
    if(ua !== ub) return ub - ua;
    /* À urgence égale, le cours le plus proche d'abord ; sans cours,
       le plus en retard. */
    if(a.prochain !== b.prochain){
      if(!a.prochain) return 1;
      if(!b.prochain) return -1;
      return a.prochain < b.prochain ? -1 : 1;
    }
    if(a.reste !== b.reste) return b.reste - a.reste;
    return String(a.eleve).localeCompare(String(b.eleve), 'fr');
  });

  const muets = rangees.filter(x => urgenceDuParcours(x) === 3).length;
  const presses = rangees.filter(x => urgenceDuParcours(x) === 2).length;

  const chapeau = document.createElement('div');
  chapeau.style.cssText = 'font-size:12.5px;color:var(--muted);' +
    'margin-bottom:11px;line-height:1.6;';
  /* ⚠️ LE PLURIEL S'ACCORDE. « 1 ne voi(en)t rien » sur l'écran qu'on
     lit tous les matins, c'est une phrase qui dit qu'on n'a pas
     regardé ce qu'on écrivait. */
  const sPluriel = (n) => (n > 1) ? 's' : '';
  chapeau.innerHTML = rangees.length + ' élève' + sPluriel(rangees.length) +
    ' avec un parcours' +
    (muets ? ' · <b style="color:var(--red);">' + muets +
             (muets > 1 ? ' ne voient rien' : ' ne voit rien') + '</b>' : '') +
    (presses ? ' · <b style="color:var(--warn-text);">' + presses +
               (presses > 1 ? ' ont cours' : ' a cours') +
               ' dans deux jours ou moins</b>' : '');
  zone.appendChild(chapeau);

  rangees.forEach(l => zone.appendChild(ligneDuSuiviParcours(l)));
}

function ligneDuSuiviParcours(l){
  const u = urgenceDuParcours(l);
  const row = document.createElement('div');
  row.className = 'history-item';
  row.style.cursor = 'pointer';

  const meta = document.createElement('div');
  meta.className = 'meta';

  const t = document.createElement('strong');
  t.textContent = l.eleve || '(sans nom)';
  meta.appendChild(t);

  /* ⚠️ LA BARRE DIT LA PROGRESSION SANS QU'ON LISE LES CHIFFRES. */
  const e = etapesDuSuiviParcours(l);
  const pc = e.total ? Math.round((e.faits / e.total) * 100) : 0;
  const barre = document.createElement('div');
  barre.style.cssText = 'height:5px;border-radius:3px;background:var(--line);' +
    'overflow:hidden;margin:5px 0 4px;max-width:220px;';
  const dedans = document.createElement('div');
  dedans.style.cssText = 'height:100%;width:' + pc + '%;background:' +
    (u >= 2 ? 'var(--red)' : 'var(--accent-text)') + ';';
  barre.appendChild(dedans);
  meta.appendChild(barre);

  const s = document.createElement('span');
  s.textContent = e.total
    ? e.faits + ' étape' + ((e.faits > 1) ? 's' : '') + ' sur ' + e.total +
      (e.reste ? ' · ' + e.reste + ' à voir' : ' · à jour') +
      /* ⚠️ L'ACCORD SUIT LE NOMBRE DE GUIDES TERMINÉS, pas le
         total : « 1/3 guides terminé » était faux des deux côtés à
         la fois. Même exigence que le pluriel du chapeau juste
         au-dessus — une phrase bancale sur l'écran qu'on lit tous
         les matins dit qu'on n'a pas regardé ce qu'on écrivait. */
      (l.total ? ' · ' + l.faits + ' guide' + ((l.faits > 1) ? 's' : '') +
                 ' terminé' + ((l.faits > 1) ? 's' : '') + ' sur ' + l.total : '')
    : (l.groupes ? 'Ses groupes n\'ont aucun guide publié'
                 : 'Aucun groupe ouvert');
  meta.appendChild(s);

  if(l.prochain){
    const j = joursAvantLeCours(l.prochain);
    const q = document.createElement('span');
    q.style.cssText = 'font-size:11.5px;color:' +
      (u >= 2 ? 'var(--warn-text)' : 'var(--muted)') + ';';
    q.textContent = '📅 Cours le ' +
      ((typeof jourCourtIso === 'function') ? jourCourtIso(l.prochain)
                                            : l.prochain) +
      (l.prochainHeure ? ' à ' + l.prochainHeure : '') +
      (j === 0 ? ' — aujourd’hui' : (j === 1 ? ' — demain' : ''));
    meta.appendChild(q);
  }

  /* ⚠️ LE CAS MUET, DIT EN TOUTES LETTRES. */
  if(u === 3){
    const w = document.createElement('span');
    w.style.cssText = 'color:var(--red);font-size:12px;';
    w.textContent = '⚠️ Ses groupes sont cochés mais 🎬 Son parcours est ' +
      'FERMÉ : il ne voit rien.';
    meta.appendChild(w);
  }

  /* ⚠️ CE QU'IL A VU, GUIDE PAR GUIDE — v1040.

     David : « dans parcours des élèves je n'ai pas le détail de ce
     que l'élève a vu ». La ligne disait « 3 étapes sur 7 » — un
     nombre ne dit pas LESQUELLES, et c'est lesquelles qu'on regarde
     avant un cours. */
  const deplie = (detailDuSuivi === l.eleve);
  if(deplie) meta.appendChild(detailDuParcours(l));

  row.appendChild(meta);

  /* Ouvrir sa fiche : c'est là qu'on ouvre ou qu'on ferme, sans
     quitter l'écran pour un autre. ⚠️ ELLE PASSE SUR UN BOUTON À
     ELLE : la ligne entière sert maintenant à déplier, et une ligne
     qui fait deux choses selon l'endroit où l'on clique finit par
     faire la mauvaise. */
  const bFiche = document.createElement('button');
  bFiche.className = 'btn btn-secondary';
  bFiche.style.cssText = 'width:auto;margin:6px 0 0;padding:5px 10px;' +
    'font-size:11.5px;';
  bFiche.textContent = '🔑 Sa fiche';
  bFiche.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if(typeof ouvrirFicheEleve === 'function') ouvrirFicheEleve(l.eleve);
    else showToast('Fiche indisponible depuis cet écran.');
  });
  meta.appendChild(bFiche);

  row.addEventListener('click', () => {
    detailDuSuivi = deplie ? '' : l.eleve;
    dessinerSuiviParcours();
  });

  return row;
}

/* ============================================================
   LE DÉTAIL D'UN ÉLÈVE — TOUT, ÉTAPE PAR ÉTAPE

   David : « dans le suivi du parcours des élèves on avait dit qu'il
   fallait le détail de tout ».

   ⚠️ ET « [object Object] » ÉTAIT ÉCRIT À DROITE DE CHAQUE GUIDE.
   Ce n'était pas une faute d'affichage, c'était un contrat changé
   d'un seul côté : la v1056 du classeur a fait passer l'élève de
   « je coche un guide » à « je valide segment par segment », et
   « vus » a cessé de porter une DATE pour porter une FICHE PAR
   SEGMENT — { vuLe, revuLe, vues }. L'écran, lui, posait toujours
   cette valeur dans un textContent : un objet s'y écrit
   « [object Object] », sans erreur, sans rien dans la console.

   Un contrat qui change d'un côté et pas de l'autre ne fait pas de
   bruit. C'est pour ça qu'il faut l'écrire ici.

   ⚠️ LES DEUX FORMES SONT ACCEPTÉES. Apps Script et le Worker
   répondent tous les deux à « parcoursSuivi », et rien ne garantit
   qu'ils soient déployés à la même minute. Un écran qui ne sait
   lire qu'une des deux réponses se casse pendant le déploiement —
   c'est-à-dire précisément quand on le regarde.

   ⚠️ ET LA RÈGLE DU « GUIDE VU » EST CELLE DU CLASSEUR, MOT POUR
   MOT. Un guide est vu quand tous ses segments le sont, ou quand la
   coche du guide entier a été posée — ce qu'ont fait les élèves
   d'avant la v1056, et qui ne doit pas les faire repartir de zéro.
   Si cet écran comptait autrement, il annoncerait un compte et le
   classeur un autre.
   ============================================================ */

/* Le compte qui parle : des ÉTAPES — les segments que l'élève coche
   un par un — et plus des guides entiers. Un guide de six segments
   dont il en a vu cinq n'est pas « 0 sur 1 ».

   Repli sur le compte des guides si la réponse vient d'une version
   plus ancienne du classeur : l'écran affiche alors ce qu'il
   affichait avant, au lieu de n'afficher rien.

   ⚠️ « …DuSuiviParcours », PAS « …DuParcours » : ce dernier nom est
   DÉJÀ pris par ec-questionnaire.js, chargé APRÈS ce fichier. Sa
   fonction aurait écrasé celle-ci sans un mot, et le compte des
   étapes aurait tranquillement affiché autre chose. Deux fonctions
   de même nom ne font pas d'erreur — elles font un silence. */
function etapesDuSuiviParcours(l){
  const total = (l.segmentsTotal === undefined || l.segmentsTotal === null)
    ? (l.total || 0) : l.segmentsTotal;
  const faits = (l.segmentsFaits === undefined || l.segmentsFaits === null)
    ? (l.faits || 0) : l.segmentsFaits;
  return { total: total, faits: faits, reste: Math.max(0, total - faits) };
}

/* Les fiches d'un guide, ramenées à une seule forme : la clé est
   l'identifiant du segment, la clé vide étant le guide entier. */
function fichesDuGuide(l, id){
  const v = (l.vus || {})[id];
  if(!v) return {};
  /* La forme d'avant la v1056 : une date, pour le guide entier. */
  if(typeof v === 'string') return v ? { '': { vuLe: v, revuLe: '', vues: 1 } } : {};
  const out = {};
  Object.keys(v).forEach(k => {
    const f = v[k];
    if(typeof f === 'string'){ if(f) out[k] = { vuLe: f, revuLe: '', vues: 1 }; }
    else if(f && (f.vuLe || f.revuLe || f.vues)) out[k] = f;
  });
  return out;
}

/* « 18/09/2026 20:14 » → « 2026-09-18 20:14 ». La règle de
   jourEtHeureComparables dans Apps Script, à l'identique : deux
   dates se comparent en texte, sans créer d'objets. */
function horodateDuParcours(texte){
  const m = String(texte || '')
    .match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
  if(!m) return '';
  return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) +
         ' ' + (m[4] || '00:00');
}

/* La même règle que « guideVuLe » côté classeur. */
function vuLeDuGuide(segments, fiches){
  const f = fiches || {};
  if(f[''] && f[''].vuLe) return f[''].vuLe;
  const segs = segments || [];
  if(!segs.length) return '';
  let dernier = '';
  for(let i = 0; i < segs.length; i++){
    const fi = f[segs[i].id];
    if(!fi || !fi.vuLe) return '';
    if(!dernier || horodateDuParcours(fi.vuLe) > horodateDuParcours(dernier)){
      dernier = fi.vuLe;
    }
  }
  return dernier;
}

/* « 18/09/2026 20:14 » → « 18/09 à 20:14 ». L'année n'apprend rien
   sur un écran qu'on lit le matin même. */
function quandCourtParcours(texte){
  const m = String(texte || '')
    .match(/(\d{1,2})\/(\d{1,2})\/\d{4}(?:\s+(\d{1,2}:\d{2}))?/);
  if(!m) return String(texte || '');
  return m[1] + '/' + m[2] + (m[3] ? ' à ' + m[3] : '');
}

/* ============================================================
   🎓 LE PARCOURS D'UN ÉLÈVE, EN PASTILLES — v1221

   David, capture à l'appui : « le parcours des élèves est illisible,
   on voit pas bien ». Il a choisi les PASTILLES (S2) : une carte par
   guide, une pastille par segment — verte et « ✓ » s'il l'a vu, avec
   le nombre de fois, grise s'il reste à voir. Toucher une pastille
   ouvre une bulle : quand il l'a vu, combien de fois, et ce que le
   segment contient.

   ⚠️ DEUX DÉFAUTS DE SA CAPTURE, RÉPARÉS ICI :
     · « guides/RWceaq….jpg|guides/… » s'affichait comme TITRE d'une
       image : c'est la liste des fichiers que l'éditeur range dans
       le titre quand on n'en a pas écrit. Une clé de fichier n'est
       pas un titre — on écrit « 3 images ».
     · « COURS DE THEORIE DE LA CO� » : le classeur coupe l'aperçu à
       120 caractères, et les lettres « en gras » venues de Facebook
       tiennent DEUX caractères chacune. Couper entre les deux laisse
       une moitié de lettre, qui s'affiche « � ». On l'enlève, et on
       met « … » : c'était bien une coupure.

   ⚠️ CE QUE LA DONNÉE SAIT, ET CE QU'ELLE NE SAIT PAS — v1061.
   L'élève valide un SEGMENT, jamais un bloc. Ce que la bulle liste
   est ce que le segment CONTIENT, pas des coches séparées.
   ============================================================ */
function detailDuParcours(l, catalogue){
  /* ⚠️ LE CATALOGUE SE PASSE, IL NE SE DEVINE PLUS — v1061. */
  const cat = catalogue || guidesDuSuivi || {};
  const d = document.createElement('div');
  d.className = 'svP';
  /* ⚠️ DANS L'ÉCRAN DE SUIVI, LA LIGNE ENTIÈRE SE REPLIE AU CLIC.
     Toucher une pastille ne doit pas replier ce qu'on lit. */
  d.addEventListener('click', ev => ev.stopPropagation());

  const liste = (l.liste || []);
  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'svNote';
    v.textContent = 'Ses groupes n\'ont aucun guide publié.';
    d.appendChild(v);
    return d;
  }

  /* Rangés par groupe, dans l'ordre où ils lui arrivent. */
  const groupes = [];
  const parId = {};
  liste.forEach(id => {
    const g = cat[id] || {};
    const cle = g.groupe || '';
    if(!parId[cle]){
      parId[cle] = { nom: g.groupeNom || 'Son parcours',
                     icone: g.groupeIcone || '', ids: [] };
      groupes.push(parId[cle]);
    }
    parId[cle].ids.push(id);
  });

  const ctxS = { l: l, cat: cat, d: d, catalogue: catalogue };
  groupes.forEach(g => {
    const t = document.createElement('div');
    t.className = 'svGrp';
    const nomG = document.createElement('span');
    nomG.textContent = (g.icone ? g.icone + ' ' : '') + g.nom;
    t.appendChild(nomG);
    /* ↺ v1222 — tout le groupe, pour cet élève */
    const cibles = g.ids.map(id => ciblesDuGuide(l, id, cat[id] || {}, null)).filter(Boolean);
    if(peutToucherLeParcours() && cibles.length){
      const r = document.createElement('button');
      r.type = 'button';
      r.className = 'svLien';
      r.textContent = '↺ Remettre le groupe à voir';
      r.addEventListener('click', () => remettreAVoirDuSuivi(ctxS, cibles,
        'Remettre à voir TOUT le groupe « ' + g.nom + ' » pour ' + l.eleve + ' ?'));
      t.appendChild(r);
    }
    d.appendChild(t);
    g.ids.forEach(id => d.appendChild(carteDuGuideSuivi(l, id, cat[id] || {}, ctxS)));
  });

  const note = document.createElement('div');
  note.className = 'svNote';
  note.textContent = 'ⓘ Touche un segment pour voir quand il l’a vu et ce qu’il contient. ' +
    'Le ✓ porte sur le segment entier : pour suivre une chose à part, mets-lui ' +
    'un 🏷️ Titre d’étape devant dans le guide.';
  d.appendChild(note);
  return d;
}

function carteDuGuideSuivi(l, id, g2, ctxS){
  const segs = g2.segments || [];
  const fiches = fichesDuGuide(l, id);
  const tout = !!(fiches[''] && fiches[''].vuLe);
  const vuLe = vuLeDuGuide(segs, fiches);

  /* Un guide dépublié dont on ne connaît plus le découpage vaut un
     segment : le guide entier. */
  const lesSegs = segs.length ? segs
    : [{ id: '', titre: 'Le guide entier', blocs: [] }];
  const etats = lesSegs.map(sg => {
    const f = segs.length ? (tout ? (fiches[sg.id] || fiches['']) : fiches[sg.id])
                          : (vuLe ? (fiches[''] || { vuLe: vuLe }) : null);
    return { sg: sg, f: f, vu: !!(f && f.vuLe) || tout || (!segs.length && !!vuLe) };
  });
  const faits = etats.filter(x => x.vu).length;

  const c = document.createElement('div');
  c.className = 'svCarte';

  const h = document.createElement('div');
  h.className = 'svTete';
  const rond = document.createElement('span');
  rond.className = 'svRond ' + (faits === etats.length ? 'fini' : (faits ? 'encours' : ''));
  rond.textContent = faits === etats.length ? '✓' : '';
  h.appendChild(rond);
  const nom = document.createElement('b');
  /* ⚠️ UN GUIDE QUE LE CATALOGUE NE CONNAÎT PAS GARDE SON IDENTIFIANT. */
  nom.textContent = g2.titre || ('(guide ' + id + ')');
  h.appendChild(nom);
  const mini = document.createElement('span');
  mini.className = 'svMini';
  const remp = document.createElement('i');
  remp.style.width = Math.round(faits / Math.max(1, etats.length) * 100) + '%';
  mini.appendChild(remp);
  h.appendChild(mini);
  const cpt = document.createElement('span');
  cpt.className = 'svCpt';
  cpt.textContent = faits + ' / ' + etats.length;
  h.appendChild(cpt);
  /* ↺ v1222 — tout le guide, pour cet élève */
  const ciblesG = ciblesDuGuide(l, id, g2, null);
  if(ctxS && peutToucherLeParcours() && ciblesG){
    const r = document.createElement('button');
    r.type = 'button';
    r.className = 'svRaz';
    r.title = 'Remettre ce guide à voir';
    r.setAttribute('aria-label', 'Remettre ce guide à voir');
    r.textContent = '↺';
    r.addEventListener('click', () => remettreAVoirDuSuivi(ctxS, [ciblesG],
      'Remettre à voir tout le guide « ' + (g2.titre || id) + ' » pour ' + l.eleve + ' ?'));
    h.appendChild(r);
  }
  c.appendChild(h);

  const pills = document.createElement('div');
  pills.className = 'svPills';
  const bulle = document.createElement('div');
  bulle.className = 'svBulle';
  bulle.style.display = 'none';
  let ouverte = -1;

  const demandes = (l.revoir || []).filter(r => r.guide === id);
  const remisG = (l.remis || {})[id] || {};
  etats.forEach((x, i) => {
    x.guide = id;
    x.tous = lesSegs.map(sg => sg.id || '');
    x.demandes = demandes.filter(r => String(r.segment || '') === String(x.sg.id || ''));
    x.remis = x.vu ? null : (remisG[x.sg.id || ''] || null);
    /* 🎬 v1225 — la part de vidéo vraiment regardée (sa meilleure) */
    x.aVideo = (x.sg.blocs || []).some(b => b.type === 'video');
    const pv = ((l.videos || {})[id] || {})[x.sg.id || ''];
    x.pctVideo = (pv === undefined || pv === null) ? null : Number(pv) || 0;
    const epingle = x.demandes.some(r => !r.vuLe);
    const p = document.createElement('button');
    p.type = 'button';
    p.className = 'svPill' + (x.vu ? ' vu' : '') + (epingle ? ' epingle' : '');
    p.textContent = (epingle ? '📌 ' : '') + (x.vu ? '✓ ' : '') + (x.sg.titre || '(étape sans titre)');
    const n = x.f && x.f.vuLe ? (Number(x.f.vues) || 1) : 0;
    if(n){
      const b = document.createElement('span');
      b.className = 'svFois';
      b.textContent = n + '×';
      p.appendChild(b);
    }
    /* 🎬 « 35 % » tant que la vidéo n'est pas vue à 90 % — David :
       « j'ai besoin d'avoir le pourcentage de vidéo vu » */
    if(x.aVideo && x.pctVideo !== null && x.pctVideo < 90){
      const b = document.createElement('span');
      b.className = 'svPct';
      b.textContent = '🎬 ' + x.pctVideo + ' %';
      p.appendChild(b);
    }
    const ouvrir = () => {
      const avant = pills.querySelector('.svPill.ici');
      if(avant) avant.classList.remove('ici');
      if(ouverte === i){ ouverte = -1; bulle.style.display = 'none'; bulleDuSuiviOuverte = ''; return; }
      ouverte = i;
      bulleDuSuiviOuverte = l.eleve + '|' + id + '::' + (x.sg.id || '');
      p.classList.add('ici');
      remplirLaBulleDuSuivi(bulle, x, ctxS);
      bulle.style.display = '';
    };
    p.addEventListener('click', ouvrir);
    pills.appendChild(p);
    /* Après une action, la bulle qu'on regardait se rouvre. */
    if(bulleDuSuiviOuverte === l.eleve + '|' + id + '::' + (x.sg.id || '')) setTimeout(() => { if(ouverte !== i) ouvrir(); }, 0);
  });
  c.appendChild(pills);
  c.appendChild(bulle);
  return c;
}

function remplirLaBulleDuSuivi(bulle, x, ctxS){
  bulle.textContent = '';
  const l1 = document.createElement('div');
  const t = document.createElement('b');
  t.textContent = x.sg.titre || '(étape sans titre)';
  l1.appendChild(t);
  const f = x.f;
  if(f && f.vuLe){
    const n = Number(f.vues) || 1;
    l1.appendChild(document.createTextNode(' — vu le ' + quandCourtParcours(f.vuLe) + ' · '));
    const fo = document.createElement('b');
    fo.className = 'svVert';
    fo.textContent = n + ' fois';
    l1.appendChild(fo);
    if(f.revuLe && f.revuLe !== f.vuLe){
      l1.appendChild(document.createTextNode(' · dernière le ' + quandCourtParcours(f.revuLe)));
    }
  }else{
    l1.appendChild(document.createTextNode(x.vu ? ' — vu (guide entier coché)' : ' — pas encore vu'));
  }
  bulle.appendChild(l1);
  /* 🎬 v1225 — la vidéo : la part vraiment regardée */
  if(x.aVideo){
    const r = document.createElement('div');
    r.className = 'svInfo';
    r.textContent = x.pctVideo === null
      ? '🎬 Vidéo : aucune lecture mesurée'
      : '🎬 Vidéo regardée à ' + x.pctVideo + ' %' + (x.pctVideo >= 90 ? ' ✓' : '') + ' (sa meilleure fois)';
    bulle.appendChild(r);
  }
  /* ↺ v1222 — remis à voir : son histoire reste */
  if(x.remis && x.remis.remisLe){
    const r = document.createElement('div');
    r.className = 'svInfo';
    r.textContent = '↺ Remis à voir le ' + quandCourtParcours(x.remis.remisLe) +
      (x.remis.vuLe ? ' — avant : vu la 1re fois le ' + quandCourtParcours(x.remis.vuLe) + ', ' +
        (Number(x.remis.vues) || 1) + ' fois' : '');
    bulle.appendChild(r);
  }
  /* 📌 v1222 — ce qu'on lui a demandé de revoir */
  (x.demandes || []).forEach(dm => {
    const r = document.createElement('div');
    r.className = 'svInfo';
    r.textContent = '📌 Demandé le ' + quandMsParcours(dm.le) + (dm.par ? ' par ' + dm.par : '') +
      (dm.source === 'bilan' ? ' (bilan du cours)' : dm.source === 'message' ? ' (messagerie)' : '') +
      (dm.mot ? ' « ' + dm.mot + ' »' : '') +
      (dm.vuLe ? ' — ✓ revu le ' + quandMsParcours(dm.vuLe) : ' — pas encore revu');
    if(!dm.vuLe && ctxS && peutToucherLeParcours()){
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'svLien';
      b.textContent = 'Retirer';
      b.addEventListener('click', async () => {
        b.disabled = true;
        try{ await appelPrep({ action: 'parcoursRevoirRetirer', id: dm.id }); await rafraichirLeDetailDuSuivi(ctxS); }
        catch(e){ b.disabled = false; showToast('Impossible : ' + e.message); }
      });
      r.appendChild(b);
    }
    bulle.appendChild(r);
  });
  /* Absent d'une réponse plus ancienne : on n'affiche alors rien de
     plus, au lieu de n'afficher rien du tout. */
  (x.sg.blocs || []).forEach(b => bulle.appendChild(blocDuSuivi(b, x.vu)));
  if(ctxS && peutToucherLeParcours()){
    const ac = document.createElement('div');
    ac.className = 'svActions';
    const bP = document.createElement('button');
    bP.type = 'button';
    bP.className = 'btn btn-secondary';
    bP.textContent = '📌 Lui demander de revoir';
    bP.addEventListener('click', () => demanderDeRevoirDuSuivi(ctxS, x, bP));
    ac.appendChild(bP);
    if(x.vu){
      const bR = document.createElement('button');
      bR.type = 'button';
      bR.className = 'btn btn-secondary';
      bR.textContent = '↺ Remettre à voir';
      bR.addEventListener('click', () => remettreAVoirDuSuivi(ctxS,
        [{ guide: x.guide, segments: [x.sg.id || ''], tous: x.tous }],
        'Remettre « ' + (x.sg.titre || 'ce segment') + ' » à voir pour ' + ctxS.l.eleve + ' ?'));
      ac.appendChild(bR);
    }
    bulle.appendChild(ac);
  }
}

/* « COURS DE LA CO\uD835 » → « COURS DE LA CO… ». Une moitié de lettre
   — ou le « � » qu'elle devient en route — ne s'affiche jamais. */
function apercuNettoye(texte){
  const s0 = String(texte || '');
  let s = '';
  for(let i = 0; i < s0.length; i++){
    const c = s0.charCodeAt(i);
    if(c >= 0xD800 && c <= 0xDBFF){
      const n = s0.charCodeAt(i + 1);
      if(n >= 0xDC00 && n <= 0xDFFF){ s += s0.charAt(i) + s0.charAt(i + 1); i++; }
      continue;
    }
    if(c >= 0xDC00 && c <= 0xDFFF) continue;
    if(c === 0xFFFD) continue;
    s += s0.charAt(i);
  }
  s = s.trim();
  const coupe = s0.length >= 120 || /�\s*$/.test(s0) ||
                /[\uD800-\uDBFF]\s*$/.test(s0);
  return (coupe && s && !/…$/.test(s)) ? s + '…' : s;
}

/* ============================================================
   ↺ 📌 REMETTRE À VOIR, DEMANDER DE REVOIR — v1222

   David : « il faut que l'on puisse réinitialiser les statistiques
   par groupe et par segment » — pour UN élève, en gardant
   l'historique (son choix) ; « et qu'on puisse dire à l'élève
   d'aller voir tel ou tel endroit » — 📌, avec une notification.
   Les deux demandent « 🎬 Parcours : Modifier ».
   ============================================================ */
let bulleDuSuiviOuverte = '';

function peutToucherLeParcours(){
  return typeof peutModifier === 'function' && peutModifier('parcours');
}

/* Ce qu'il y a à remettre à voir dans un guide (un segment, ou tous
   ceux qu'il a vus) — rien s'il n'a rien vu. */
function ciblesDuGuide(l, id, g2, seulement){
  const segs = (g2 && g2.segments) || [];
  const fiches = fichesDuGuide(l, id);
  const tous = segs.length ? segs.map(sg => sg.id || '') : [''];
  const vus = seulement ? [seulement]
    : Object.keys(fiches).filter(k => fiches[k] && fiches[k].vuLe);
  if(!vus.length) return null;
  return { guide: id, segments: vus, tous: tous };
}

async function remettreAVoirDuSuivi(ctxS, cibles, question){
  const oui = await confirmer(question + '\n\nSes dates et son nombre de fois sont gardés ; ' +
    'la pastille repasse « à voir », chez nous et chez lui.', '↺ Remettre à voir');
  if(!oui) return;
  try{
    const r = await appelPrep({ action: 'parcoursRemettreAVoir', eleve: ctxS.l.eleve, cibles: cibles });
    if(r && r.status === 'error') throw new Error(r.message || 'refusé');
    showToast('↺ Remis à voir');
    await rafraichirLeDetailDuSuivi(ctxS);
  }catch(e){ showToast('Impossible : ' + e.message); }
}

async function demanderDeRevoirDuSuivi(ctxS, x, bouton){
  const mot = await demander('Un mot pour ' + ctxS.l.eleve + ' (facultatif) — il le lira en tête de « Réviser » :',
    '', '📌 « ' + (x.sg.titre || 'Segment') + ' » à revoir');
  if(mot === null || mot === undefined) return;
  if(bouton) bouton.disabled = true;
  try{
    const r = await appelPrep({ action: 'parcoursRevoirPoser', eleve: ctxS.l.eleve, guide: x.guide,
                                segment: x.sg.id || '', titre: x.sg.titre || '', mot: String(mot || '').trim() });
    if(r && r.status === 'error') throw new Error(r.message || 'refusé');
    showToast('📌 Demandé — il est prévenu');
    await rafraichirLeDetailDuSuivi(ctxS);
  }catch(e){ if(bouton) bouton.disabled = false; showToast('Impossible : ' + e.message); }
}

/* Relit CET élève, et redessine là où on est : la liste du suivi
   (ses compteurs changent aussi), ou le bloc de son dossier. */
async function rafraichirLeDetailDuSuivi(ctxS){
  const d = await appelPrep({ action: 'parcoursSuivi', eleve: ctxS.l.eleve });
  const cible = String(ctxS.l.eleve || '').trim().toLowerCase();
  const neuve = ((d && d.lignes) || []).find(x => String(x.eleve || '').trim().toLowerCase() === cible);
  if(!neuve) return;
  const k = suiviParcours.findIndex(x => String(x.eleve || '').trim().toLowerCase() === cible);
  if(k !== -1 && !ctxS.catalogue){
    suiviParcours[k] = neuve;
    Object.assign(guidesDuSuivi, (d && d.guides) || {});
    dessinerSuiviParcours();
    return;
  }
  const cat = Object.assign({}, ctxS.cat, (d && d.guides) || {});
  if(ctxS.d && ctxS.d.parentNode) ctxS.d.replaceWith(detailDuParcours(neuve, cat));
}

/* 1 761 000 000 000 → « 21/10 à 14:05 » */
function quandMsParcours(ms){
  const t = new Date(Number(ms) || 0);
  if(!Number(ms) || isNaN(t.getTime())) return '';
  const z = n => String(n).padStart(2, '0');
  return z(t.getDate()) + '/' + z(t.getMonth() + 1) + ' à ' + z(t.getHours()) + ':' + z(t.getMinutes());
}

/* Une clé de fichier n'est pas un titre. */
function titreLisibleDuBloc(b){
  const t = String((b && b.titre) || '').trim();
  if(!t) return '';
  if(/(^|\|)\s*guides\//i.test(t)) return '';
  if(/^[\w.\/-]+\.(jpe?g|png|gif|webp|heic|avif|mp4|mov|m4v|webm|pdf)$/i.test(t)) return '';
  return t;
}


/* ============================================================
   UNE CHOSE DANS UNE ÉTAPE

   Une image se reconnaît à son image, le reste à son nom. C'est la
   demande, mot pour mot : « avec une image ou le titre ».

   ⚠️ LA VIGNETTE SE DEMANDE AU MOMENT OÙ ON LA REGARDE. Le lien
   d'un fichier est signé et il expire : le préparer à l'avance, pour
   deux cents élèves, ce serait signer des milliers d'adresses dont
   on n'ouvrira pas trois. On le demande donc quand le panneau d'un
   élève s'ouvre, et pour lui seul.
   ============================================================ */
const EMOJI_DU_BLOC = { video: '🎬', image: '🖼️', pdf: '📄', texte: '📝' };
const NOM_DU_BLOC = { video: 'Vidéo', image: 'Image', pdf: 'PDF' };

function blocDuSuivi(b, vu){
  const li = document.createElement('div');
  li.style.cssText = 'display:flex;gap:7px;align-items:center;font-size:11.5px;' +
    'margin:5px 0 0;' +
    (vu ? 'color:var(--soft);' : 'color:var(--muted);');

  if(b.type === 'texte'){
    const e = document.createElement('span');
    e.style.cssText = 'flex-shrink:0;';
    e.textContent = EMOJI_DU_BLOC.texte;
    li.appendChild(e);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;overflow:hidden;' +
      'text-overflow:ellipsis;white-space:nowrap;font-style:italic;';
    t.textContent = '« ' + (apercuNettoye(b.apercu) || 'texte vide') + ' »';
    li.appendChild(t);
    return li;
  }

  const cles = b.cles || [];

  /* Trois vignettes au plus : au-delà, c'est une galerie, et on
     affiche le compte. */
  if(b.type === 'image' && cles.length){
    const bande = document.createElement('span');
    bande.style.cssText = 'display:flex;gap:3px;flex-shrink:0;';
    cles.slice(0, 3).forEach(cle => bande.appendChild(vignetteDuSuivi(cle)));
    li.appendChild(bande);
  }else{
    const e = document.createElement('span');
    e.style.cssText = 'flex-shrink:0;';
    e.textContent = EMOJI_DU_BLOC[b.type] || '📎';
    li.appendChild(e);
  }

  const n = document.createElement('span');
  n.style.cssText = 'flex:1;min-width:0;overflow:hidden;' +
    'text-overflow:ellipsis;white-space:nowrap;';
  /* ⚠️ « guides/RWce….jpg|guides/… » n'est pas un titre — v1221 */
  n.textContent = titreLisibleDuBloc(b) ||
    ((b.type === 'image' && cles.length > 1) ? cles.length + ' images'
                                              : (NOM_DU_BLOC[b.type] || 'Fichier'));
  li.appendChild(n);

  /* ⚠️ UN BLOC MÉDIA SANS FICHIER NE MONTRE RIEN CHEZ L'ÉLÈVE, et
     l'éditeur refuse de publier ainsi. En retrouver un ici veut dire
     que le guide a été publié avant ce garde-fou : on le dit. */
  if(!cles.length){
    const v = document.createElement('span');
    v.style.cssText = 'flex-shrink:0;font-size:10.5px;color:var(--warn-text);';
    v.textContent = 'aucun fichier';
    li.appendChild(v);
  }else if(cles.length > 1 && titreLisibleDuBloc(b)){
    const c = document.createElement('span');
    c.style.cssText = 'flex-shrink:0;font-size:10.5px;';
    c.textContent = cles.length + ' images';
    li.appendChild(c);
  }

  return li;
}

function vignetteDuSuivi(cle){
  const z = document.createElement('span');
  z.style.cssText = 'display:inline-block;width:34px;height:26px;' +
    'border-radius:4px;border:1px solid var(--line);' +
    'background:var(--navy-deep);overflow:hidden;flex-shrink:0;';

  if(typeof lienDuFichierDeGuide !== 'function') return z;

  /* ⚠️ UNE VIGNETTE QUI NE VIENT PAS NE DIT RIEN DE PLUS QU'UN
     CADRE VIDE. Le détail reste lisible sans elle : on ne fait
     échouer ni la ligne, ni le panneau. */
  lienDuFichierDeGuide(cle).then(url => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    z.appendChild(img);
  }).catch(() => { /* le cadre reste vide */ });

  return z;
}


/* ============================================================
   LE PARCOURS D'UN SEUL ÉLÈVE — pour son dossier

   David : « j'ai le suivi dans parcours élèves de tous les élèves
   mais pas dans le dossier élève de chacun ; il me le faut aussi
   dans Accès, en dessous ».

   ⚠️ C'EST LE MÊME BLOC QUE DANS L'ÉCRAN DE SUIVI, et ça ne doit
   jamais devenir deux. Le jour où une colonne s'ajoute, elle doit
   s'ajouter une fois — sinon un des deux écrans l'aura et l'autre
   non, et c'est celui qu'on regarde le moins qui mentira.

   ⚠️ ET ON NE DEMANDE QUE LUI. « parcoursSuivi » sans nom calcule
   les deux cents élèves et renvoie le catalogue entier : l'appeler
   à chaque ouverture de fiche, ce serait payer deux cents pour en
   afficher un. Le paramètre « eleve » existe depuis la v227 du
   classeur ; avec un script plus ancien il est simplement ignoré,
   et on filtre ici — l'écran marche dans les deux cas, il est juste
   plus lent avec l'ancien.
   ============================================================ */
async function blocParcoursDeLEleve(nom){
  const d = await appelPrep({ action: 'parcoursSuivi', eleve: nom });
  const lignes = (d && d.lignes) || [];
  const cat = (d && d.guides) || {};

  const cible = String(nom || '').trim().toLowerCase();
  const sien = lignes.find(x =>
    String(x.eleve || '').trim().toLowerCase() === cible) || null;

  const z = document.createElement('div');

  if(!sien){
    z.innerHTML = '<div style="font-size:12.5px;color:var(--muted);' +
      'line-height:1.5;">Aucun groupe du parcours ne lui est ouvert. ' +
      'Ça se coche juste au-dessus, puis il faut ouvrir son ' +
      '🎬 coin révisions.</div>';
    return z;
  }

  const e = etapesDuSuiviParcours(sien);
  const tete = document.createElement('div');
  tete.style.cssText = 'font-size:13px;font-weight:700;margin-bottom:6px;';
  tete.textContent = e.total
    ? e.faits + ' étape' + ((e.faits > 1) ? 's' : '') + ' sur ' + e.total +
      (e.reste ? ' · ' + e.reste + ' à voir' : ' · à jour')
    : 'Ses groupes n\'ont aucun guide publié';
  z.appendChild(tete);

  if(!sien.ouvert && sien.groupes){
    const w = document.createElement('div');
    w.style.cssText = 'color:var(--red);font-size:12px;margin-bottom:6px;';
    w.textContent = '⚠️ Ses groupes sont cochés mais son parcours est ' +
      'FERMÉ : il ne voit rien.';
    z.appendChild(w);
  }

  z.appendChild(detailDuParcours(sien, cat));
  return z;
}

/* « 2026-09-22 » → « 22/09 ». */
function jourCourtIso(iso){
  const t = String(iso || '').trim();
  if(!/^\d{4}-\d{2}-\d{2}/.test(t)) return t;
  return t.slice(8, 10) + '/' + t.slice(5, 7);
}

/* ============================================================
   📣 LES ANNONCES — v1038, étape 6

   David : le groupe généraliste, c'est « un groupe dans lequel on
   met des informations ». Il n'a pas de guides, il a des annonces.

   Trois précautions, et elles ne sont pas décoratives :

   ⚠️ LE NOMBRE EST ÉCRIT SUR LE BOUTON. « Publier pour 14 élèves »
   se relit avant d'appuyer ; « Publier » ne se relit pas. On ne
   publie jamais à un nombre qu'on n'a pas lu.

   ⚠️ LES FILTRES COCHENT, ILS NE VERROUILLENT PAS. Après avoir
   filtré sur AAC, on peut encore décocher quelqu'un à la main. Un
   filtre qui décide à ta place finit par envoyer à quelqu'un que tu
   n'avais pas vu.

   ⚠️ ET UNE DATE DE RETRAIT. Une annonce sans fin devient un décor :
   au bout de trois semaines plus personne ne la lit, et la suivante
   non plus.
   ============================================================ */
let annoncesBureau = [];
let elevesPourAnnonce = [];
let choisisPourAnnonce = {};

async function afficherAnnonces(){
  const zone = $('annoncesZone');
  if(!zone) return;
  zone.innerHTML = '<div class="empty">Lecture des annonces…</div>';
  try{
    const d = await appelPrep({ action: 'annoncesList' });
    annoncesBureau = (d && d.annonces) || [];
    elevesPourAnnonce = (d && d.eleves) || [];
  }catch(e){
    zone.innerHTML = '<div class="message erreur">Lecture impossible : ' +
      String(e.message).replace(/</g, '&lt;') + '</div>';
    return;
  }
  dessinerAnnonces();
}

/* ⚠️ UN BOUTON PAR FORMATION ENTIÈRE — corrigé en v1040.

   David : « les filtres ne sont pas bons, tu as pris un mot par un
   mot : "NE PAS UTILISER OLD" met quatre boutons, "Remise à niveau"
   trois ».

   Il a raison, et ma raison d'alors était mauvaise. Je découpais
   pour qu'« AAC » attrape « AAC BV » ET « BEA AAC ». Mais un
   libellé n'est pas une phrase : le découper fabrique « à »,
   « niveau », « PAS », « UTILISER » — des boutons qui ne veulent
   rien dire et qui cochent n'importe qui.

   La formation entière, donc, telle que le répertoire l'écrit. Pour
   attraper tous les AAC on clique les deux boutons qui contiennent
   AAC : les filtres s'ajoutent, ils ne se remplacent pas.

   ⚠️ ET ILS BASCULENT. Un filtre qui ne fait qu'ajouter est une
   porte à sens unique : cliqué par erreur, il ne se reprend pas.
   Un deuxième clic retire exactement ce que le premier avait mis. */
function formationsDAnnonce(){
  const vus = [];
  elevesPourAnnonce.forEach(e => {
    const f = String(e.formation || '').trim();
    if(f && vus.indexOf(f) === -1) vus.push(f);
  });
  return vus.sort((a, b) => a.localeCompare(b, 'fr'));
}

/* Les rangs des élèves d'une formation. ⚠️ ON RAISONNE SUR LE RANG,
   PAS SUR LE NOM — voir choisisPourAnnonce. */
function rangsDeLaFormation(f){
  const out = [];
  elevesPourAnnonce.forEach((e, i) => {
    if(String(e.formation || '').trim() === f) out.push(i);
  });
  return out;
}

/* « Jean-Luc DÉBÉ » se trouve en tapant « debe ». */
function sansAccent(t){
  return String(t || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function dessinerAnnonces(){
  const zone = $('annoncesZone');
  if(!zone) return;
  zone.innerHTML = '';
  zone.appendChild(cadreNouvelleAnnonce());
  zone.appendChild(listeDesAnnonces());
}

function cadreNouvelleAnnonce(){
  const c = document.createElement('div');
  c.style.cssText = 'border:1px solid var(--orange);border-radius:14px;' +
    'padding:14px;max-width:620px;margin-bottom:16px;';

  c.innerHTML =
    '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">' +
      '📣 Nouvelle annonce</div>' +
    '<label for="anTexte">Le texte</label>' +
    '<textarea id="anTexte" rows="3" placeholder="Le bureau sera fermé le ' +
      'samedi 27 septembre…" style="font-family:inherit;font-size:13.5px;' +
      'line-height:1.6;"></textarea>' +
    '<label for="anRetrait">Retirer automatiquement le</label>' +
    '<input type="date" id="anRetrait" style="margin-bottom:13px;">' +
    '<div style="font-size:11px;color:var(--muted);margin:-9px 0 13px;' +
      'line-height:1.5;">Une annonce sans fin devient un décor : au bout ' +
      'de trois semaines plus personne ne la lit.</div>' +
    '<label>À qui</label>' +
    '<div id="anQui" style="display:flex;gap:6px;margin-bottom:11px;' +
      'flex-wrap:wrap;"></div>' +
    '<div id="anSelection"></div>';

  /* ⚠️ LA SÉLECTION SE RANGE PAR RANG, PAS PAR NOM — corrigé en v1040.

     David : « quand on décoche une sélection ça n'enlève pas tous les
     élèves ». Reproduit : la sélection était rangée sous le NOM de
     l'élève. Deux homonymes dans un répertoire de cent vingt, ça
     arrive — et ils partageaient alors une seule case. Cocher l'un
     cochait l'autre au redessin suivant, et le compteur du bouton,
     qui comptait les NOMS retenus, annonçait un nombre différent de
     ce qui était coché à l'écran. Une fiche sans nom les rassemblait
     tous. On compte des rangs : il y en a autant que de lignes. */
  choisisPourAnnonce = {};
  let tousLesEleves = true;
  let recherche = '';

  const qui = c.querySelector('#anQui');
  const zoneSel = c.querySelector('#anSelection');

  const bPub = document.createElement('button');
  bPub.className = 'btn btn-primary';
  bPub.style.cssText = 'padding:11px;font-size:13px;margin-top:12px;';

  const estChoisi = (i) => !!choisisPourAnnonce[i];
  const rangsChoisis = () => Object.keys(choisisPourAnnonce)
    .filter(i => choisisPourAnnonce[i]).map(Number);
  const compte = () => rangsChoisis().length;

  /* Les rangs que la recherche laisse voir. */
  const rangsVisibles = () => {
    const q = sansAccent(recherche).trim();
    const out = [];
    elevesPourAnnonce.forEach((e, i) => {
      if(!q || sansAccent(e.eleve).indexOf(q) !== -1 ||
         sansAccent(e.formation).indexOf(q) !== -1) out.push(i);
    });
    return out;
  };

  /* ⚠️ LE NOMBRE EST ÉCRIT SUR LE BOUTON. */
  const redireBouton = () => {
    const n = tousLesEleves ? elevesPourAnnonce.length : compte();
    bPub.textContent = '📣 Publier pour ' + n + ' élève' + (n > 1 ? 's' : '');
    bPub.disabled = (n === 0);
  };

  /* ⚠️ RAFRAÎCHIR SANS TOUT REDESSINER. Redessiner cent vingt lignes
     à chaque case cochée, c'est ce qui rendait l'écran poussif — et
     c'est aussi ce qui replaçait la liste en haut au milieu d'un
     défilement. */
  let majEtat = () => {};

  const dessinerSelection = () => {
    zoneSel.innerHTML = '';
    if(tousLesEleves){
      const m = document.createElement('div');
      m.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;';
      m.textContent = 'Elle s\'affichera chez les ' +
        elevesPourAnnonce.length + ' élèves qui ont un coin révisions ouvert.';
      zoneSel.appendChild(m);
      majEtat = () => {};
      redireBouton();
      return;
    }

    /* Les filtres : une formation entière chacun, et ils basculent. */
    const zf = document.createElement('div');
    zf.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px;';
    const puces = [];
    formationsDAnnonce().forEach(f => {
      const rangs = rangsDeLaFormation(f);
      const b = document.createElement('button');
      b.style.cssText = 'width:auto;margin:0;padding:6px 10px;font-size:11.5px;';
      b.textContent = f + ' (' + rangs.length + ')';
      b.setAttribute('data-formation', f);
      b.addEventListener('click', () => {
        /* Tous cochés → on retire. Sinon → on complète. */
        const tousMis = rangs.every(estChoisi);
        rangs.forEach(i => {
          if(tousMis) delete choisisPourAnnonce[i];
          else choisisPourAnnonce[i] = true;
        });
        majEtat();
      });
      puces.push([b, rangs]);
      zf.appendChild(b);
    });
    zoneSel.appendChild(zf);

    /* ⚠️ UNE BARRE DE RECHERCHE — David, v1040. Chercher un nom dans
       cent vingt à la molette, c'est une liste qu'on n'utilise pas.
       Elle cache des lignes, elle ne décoche rien : ce qui est choisi
       le reste, et le compteur du bas le dit. */
    const ch = document.createElement('input');
    ch.type = 'search';
    ch.placeholder = '🔎 Chercher un élève…';
    ch.value = recherche;
    ch.style.cssText = 'margin:0 0 8px;font-size:13px;padding:8px 10px;';
    zoneSel.appendChild(ch);

    const zt = document.createElement('div');
    zt.style.cssText = 'font-size:11.5px;color:var(--muted);margin-bottom:8px;' +
      'line-height:1.6;';
    zt.innerHTML = '<span data-tout style="cursor:pointer;' +
      'color:var(--accent-text);font-weight:700;"></span> · ' +
      '<span data-rien style="cursor:pointer;color:var(--accent-text);' +
      'font-weight:700;"></span><br><span data-compte></span>';
    zoneSel.appendChild(zt);

    const liste = document.createElement('div');
    liste.style.cssText = 'max-height:260px;overflow-y:auto;' +
      'border:1px solid var(--line);border-radius:10px;padding:8px;';
    zoneSel.appendChild(liste);

    const cases = {};

    const dessinerLignes = () => {
      liste.innerHTML = '';
      const vus = rangsVisibles();
      for(const k in cases) delete cases[k];
      if(!vus.length){
        const v = document.createElement('div');
        v.style.cssText = 'font-size:12px;color:var(--muted);padding:6px;';
        v.textContent = 'Personne ne correspond à « ' + recherche + ' ».';
        liste.appendChild(v);
        return;
      }
      vus.forEach(i => {
        const e = elevesPourAnnonce[i];
        const l = document.createElement('label');
        l.style.cssText = 'display:flex;align-items:center;gap:9px;' +
          'text-transform:none;font-size:13px;color:var(--cream);' +
          'margin:0 0 5px;font-weight:400;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        /* ⚠️ CE N'EST PAS ICI QU'ON DIT SI ELLE EST COCHÉE. majEtat()
           le fait, juste après, pour toutes : l'écrire aux deux
           endroits, c'est s'assurer qu'un jour l'un des deux sera
           corrigé sans l'autre. */
        cb.setAttribute('data-rang', String(i));
        cb.style.cssText = 'width:17px;height:17px;flex-shrink:0;margin:0;';
        cb.addEventListener('change', () => {
          if(cb.checked) choisisPourAnnonce[i] = true;
          else delete choisisPourAnnonce[i];
          majEtat();
        });
        cases[i] = cb;
        l.appendChild(cb);
        const n = document.createElement('span');
        n.style.cssText = 'flex:1;min-width:0;';
        n.textContent = e.eleve || '(fiche sans nom)';
        l.appendChild(n);
        if(e.formation){
          const f = document.createElement('span');
          f.style.cssText = 'font-size:11px;color:var(--muted);flex-shrink:0;';
          f.textContent = e.formation;
          l.appendChild(f);
        }
        liste.appendChild(l);
      });
    };

    /* ⚠️ CE QUI EST CHOISI ET CACHÉ SE DIT EN TOUTES LETTRES. Sans
       ça, la recherche fabrique exactement le défaut que David
       décrivait : un compteur qui ne correspond pas à l'écran. */
    majEtat = () => {
      const vus = rangsVisibles();
      const n = compte();
      const caches = rangsChoisis().filter(i => vus.indexOf(i) === -1).length;
      zt.querySelector('[data-tout]').textContent =
        'Cocher les ' + vus.length + ' affichés';
      zt.querySelector('[data-rien]').textContent =
        recherche ? 'Tout décocher (' + n + ')' : 'Tout décocher';
      zt.querySelector('[data-compte]').textContent = n
        ? n + ' élève' + (n > 1 ? 's' : '') + ' choisi' + (n > 1 ? 's' : '') +
          (caches ? ' · dont ' + caches + ' que la recherche ne montre pas'
                  : '')
        : 'Personne de choisi pour l\'instant.';
      puces.forEach(([b, rangs]) => {
        const tousMis = rangs.length && rangs.every(estChoisi);
        b.className = 'btn ' + (tousMis ? 'btn-primary' : 'btn-secondary');
      });
      for(const i in cases) cases[i].checked = estChoisi(Number(i));
      redireBouton();
    };

    ch.addEventListener('input', () => {
      recherche = ch.value;
      dessinerLignes();
      majEtat();
    });
    zt.querySelector('[data-tout]').addEventListener('click', () => {
      rangsVisibles().forEach(i => { choisisPourAnnonce[i] = true; });
      majEtat();
    });
    /* ⚠️ TOUT DÉCOCHER DÉCOCHE TOUT, y compris ce que la recherche
       cache. C'est l'inverse de « cocher les affichés », et c'est
       voulu : on publie à qui est coché, pas à qui est visible. */
    zt.querySelector('[data-rien]').addEventListener('click', () => {
      choisisPourAnnonce = {};
      majEtat();
    });

    dessinerLignes();
    majEtat();
  };

  [['Tout le monde', true], ['Une sélection', false]].forEach(([nom, tous]) => {
    const b = document.createElement('button');
    b.className = tous ? 'btn btn-primary' : 'btn btn-secondary';
    b.style.cssText = 'width:auto;margin:0;padding:8px 13px;font-size:12.5px;';
    b.textContent = nom;
    b.addEventListener('click', () => {
      tousLesEleves = tous;
      [...qui.children].forEach((x, i) => {
        x.className = 'btn ' + ((i === 0) === tous ? 'btn-primary' : 'btn-secondary');
      });
      dessinerSelection();
    });
    qui.appendChild(b);
  });

  bPub.addEventListener('click', async () => {
    const t = c.querySelector('#anTexte').value.trim();
    if(!t){ showToast('Écris le texte de l\'annonce.'); return; }
    const noms = tousLesEleves ? []
      : rangsChoisis().map(i => (elevesPourAnnonce[i] || {}).eleve)
          .filter(x => x);
    if(!tousLesEleves && !noms.length){
      showToast('Choisis au moins un élève.'); return;
    }
    bPub.disabled = true;
    try{
      await appelPrep({
        action: 'annonceSet',
        /* L'identifiant vient de l'écran : l'envoi réessaie tout
           seul, et une annonce publiée deux fois s'affiche deux
           fois. Même règle que les guides. */
        id: idProposeParLEcran('an'),
        texte: t,
        pour: tousLesEleves ? 'tous' : '',
        noms: noms,
        retirerLe: c.querySelector('#anRetrait').value || '',
        par: (typeof ACCES !== 'undefined' && ACCES.moniteur) || ''
      });
      showToast('Annonce publiée ✅');
      afficherAnnonces();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bPub.disabled = false;
    }
  });

  c.appendChild(bPub);
  dessinerSelection();
  return c;
}

function listeDesAnnonces(){
  const z = document.createElement('div');
  if(!annoncesBureau.length){
    z.innerHTML = '<div class="empty">Aucune annonce pour l\'instant.</div>';
    return z;
  }

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;margin-bottom:8px;';
  t.textContent = '📋 Les annonces';
  z.appendChild(t);

  annoncesBureau.forEach(a => {
    const l = document.createElement('div');
    l.className = 'history-item';
    if(!a.enCours) l.style.opacity = '.5';

    const m = document.createElement('div');
    m.className = 'meta';

    const txt = document.createElement('strong');
    txt.style.cssText = 'white-space:pre-wrap;line-height:1.5;';
    txt.textContent = a.texte;
    m.appendChild(txt);

    const s = document.createElement('span');
    s.textContent = 'Publiée le ' + a.publieLe + (a.par ? ' par ' + a.par : '') +
      ' · ' + (a.tous ? 'pour tous les élèves'
                      : 'pour ' + a.noms.length + ' élève' +
                        (a.noms.length > 1 ? 's' : '')) +
      (a.retirerLe ? ' · retrait le ' + jourCourtIso(a.retirerLe) : '') +
      (a.retireLe ? ' · RETIRÉE le ' + a.retireLe
                  : (a.enCours ? '' : ' · terminée'));
    m.appendChild(s);
    l.appendChild(m);

    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;padding:6px 10px;font-size:12px;margin:0;' +
      'flex-shrink:0;';
    b.textContent = a.retireLe ? '↩️ Remettre' : '🗑️ Retirer';
    b.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      b.disabled = true;
      try{
        await appelPrep({ action: 'annonceRetirer', id: a.id,
                          remettre: a.retireLe ? 'oui' : 'non' });
        showToast(a.retireLe ? 'Remise ✅' : 'Retirée ✅');
        afficherAnnonces();
      }catch(e){ showToast('Impossible : ' + e.message); b.disabled = false; }
    });
    l.appendChild(b);

    z.appendChild(l);
  });
  return z;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-parcours.js'] = true;
