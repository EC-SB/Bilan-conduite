/* Déployé le 18/09/2026 à 15:12 — v1038 */
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

/* Les quatre types de blocs, et rien d'autre. Un bloc = une chose :
   c'est ce qui rend l'ordre totalement libre, parce que rien n'est
   accroché à rien. */
const BLOCS_PARCOURS = [
  { type:'texte', emoji:'📝', nom:'Texte' },
  { type:'video', emoji:'🎬', nom:'Vidéo' },
  { type:'image', emoji:'🖼️', nom:'Image' },
  { type:'pdf',   emoji:'📄', nom:'PDF' }
];

function blocConnu(type){
  return BLOCS_PARCOURS.find(b => b.type === type) || BLOCS_PARCOURS[0];
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

  const lignes = () => Array.prototype.slice.call(
    conteneur.querySelectorAll('[data-rang]'));

  const rendreLOrdre = () => lignes().map(l => l.dataset.rang);

  /* La ligne sous le doigt, à cette hauteur-là */
  const sousLeDoigt = (y) => lignes().find(l => {
    if(l === pris) return false;
    const r = l.getBoundingClientRect();
    return y >= r.top && y <= r.bottom;
  });

  conteneur.addEventListener('pointerdown', (e) => {
    const poignee = e.target.closest('[data-poignee]');
    if(!poignee) return;
    const ligne = poignee.closest('[data-rang]');
    if(!ligne) return;

    e.preventDefault();
    pris = ligne;
    ligne.style.opacity = '.55';
    ligne.style.outline = '2px solid var(--accent-text)';
    try{ poignee.setPointerCapture(e.pointerId); }catch(err){}

    const bouger = (ev) => {
      if(!pris) return;
      const cible = sousLeDoigt(ev.clientY);
      if(!cible) return;
      const r = cible.getBoundingClientRect();
      const avant = ev.clientY < (r.top + r.height / 2);
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
    if(!ligne) return;
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

function dessinerParcours(){
  const zone = $('parcoursZone');
  if(!zone) return;
  zone.innerHTML = '';

  const duo = document.createElement('div');
  duo.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;' +
    'align-items:flex-start;';
  duo.appendChild(colonneDesGroupes());
  const g = parcoursGroupes.find(x => x.id === parcoursGroupeOuvert);
  if(g) duo.appendChild(colonneDesGuides(g));
  zone.appendChild(duo);
}


/* ---------- La colonne des groupes ---------- */
function colonneDesGroupes(){
  const col = document.createElement('div');
  col.style.cssText = 'flex:1 1 300px;min-width:0;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;margin-bottom:4px;';
  t.textContent = '🧩 Les groupes';
  col.appendChild(t);

  const s = document.createElement('div');
  s.style.cssText = 'font-size:11.5px;color:var(--muted);margin-bottom:9px;';
  s.textContent = parcoursGroupes.length
    ? 'Attrape ⠿ pour changer leur ordre chez l\'élève.'
    : '';
  col.appendChild(s);

  const liste = document.createElement('div');
  liste.id = 'parcoursListeGroupes';

  if(!parcoursGroupes.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Aucun groupe pour l\'instant. Le premier remplacera ' +
      'un de tes groupes Facebook.';
    liste.appendChild(v);
  }

  parcoursGroupes.forEach(g => liste.appendChild(ligneDeGroupe(g)));
  col.appendChild(liste);

  listeRangeable(liste, ordre => {
    appelPrep({ action: 'parcoursOrdre', quoi: 'groupes', ids: ordre })
      .then(() => { afficherParcours(); })
      .catch(e => showToast('Ordre non enregistré : ' + e.message));
  });

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-top:9px;padding:10px;font-size:13px;';
  b.textContent = '➕ Nouveau groupe';
  b.addEventListener('click', () => ouvrirLeGroupe(null));
  col.appendChild(b);

  return col;
}

function ligneDeGroupe(g){
  const l = document.createElement('div');
  l.dataset.rang = g.id;
  l.style.cssText = 'display:flex;align-items:center;gap:9px;padding:10px 11px;' +
    'border:1px solid ' + ((g.id === parcoursGroupeOuvert)
      ? 'var(--orange)' : 'var(--line)') + ';' +
    'border-radius:12px;margin-bottom:8px;' +
    (g.fermeLe ? 'opacity:.55;' : '');

  const poignee = document.createElement('span');
  poignee.dataset.poignee = '1';
  poignee.style.cssText = 'cursor:grab;color:var(--muted);font-size:15px;' +
    'flex-shrink:0;touch-action:none;padding:2px 4px;';
  poignee.textContent = '⠿';
  l.appendChild(poignee);

  const nom = document.createElement('button');
  nom.className = 'btn btn-secondary';
  /* ⚠️ « text-align » ne suffit pas : .btn est un conteneur flex
     centré, et le centrage l'emporte. Un nom de groupe se lit à
     gauche, comme tous les autres noms de l'application. */
  nom.style.cssText = 'flex:1;min-width:0;justify-content:flex-start;' +
    'text-align:left;margin:0;padding:4px 6px;' +
    'border:none;background:transparent;font-size:13px;font-weight:700;' +
    'color:' + ((g.id === parcoursGroupeOuvert) ? 'var(--accent-text)' : 'var(--cream)') + ';';
  nom.textContent = (g.icone ? g.icone + ' ' : '') + g.nom +
    (g.fermeLe ? ' · fermé le ' + g.fermeLe : '');
  nom.addEventListener('click', () => {
    parcoursGroupeOuvert = (parcoursGroupeOuvert === g.id) ? '' : g.id;
    dessinerParcours();
  });
  l.appendChild(nom);

  const n = document.createElement('span');
  n.style.cssText = 'font-size:11px;color:var(--muted);flex-shrink:0;';
  const nb = guidesDuGroupe(g.id).length;
  n.textContent = nb ? nb + ' guide' + (nb > 1 ? 's' : '') : '—';
  l.appendChild(n);

  const fleches = document.createElement('span');
  fleches.style.cssText = 'flex-shrink:0;color:var(--muted);font-size:13px;';
  fleches.innerHTML = '<span data-monter style="cursor:pointer;padding:0 3px;" ' +
    'title="Monter">▲</span><span data-descendre style="cursor:pointer;' +
    'padding:0 3px;" title="Descendre">▼</span>';
  l.appendChild(fleches);

  const mod = document.createElement('span');
  mod.style.cssText = 'flex-shrink:0;cursor:pointer;font-size:13px;';
  mod.textContent = '✏️';
  mod.title = 'Modifier le groupe';
  mod.addEventListener('click', () => ouvrirLeGroupe(g));
  l.appendChild(mod);

  return l;
}


/* ---------- Créer ou modifier un groupe ---------- */
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


/* ---------- La colonne des guides du groupe ouvert ---------- */
function colonneDesGuides(g){
  const col = document.createElement('div');
  col.style.cssText = 'flex:1 1 340px;min-width:0;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;margin-bottom:4px;';
  t.textContent = (g.icone ? g.icone + ' ' : '') + g.nom;
  col.appendChild(t);

  const s = document.createElement('div');
  s.style.cssText = 'font-size:11.5px;color:var(--muted);margin-bottom:9px;';
  const liste = guidesDuGroupe(g.id);
  const publies = liste.filter(x => x.etat === 'publie').length;
  s.textContent = liste.length
    ? liste.length + ' guide(s) · ' + publies + ' publié(s)'
    : 'Aucun guide pour l\'instant.';
  col.appendChild(s);

  const zl = document.createElement('div');
  zl.id = 'parcoursListeGuides';
  liste.forEach((x, i) => zl.appendChild(ligneDeGuide(x, i + 1)));
  col.appendChild(zl);

  listeRangeable(zl, ordre => {
    appelPrep({ action: 'parcoursOrdre', quoi: 'guides', ids: ordre })
      .then(() => { afficherParcours(); })
      .catch(e => showToast('Ordre non enregistré : ' + e.message));
  });

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-top:9px;padding:10px;font-size:13px;';
  b.textContent = '➕ Nouveau guide';
  b.addEventListener('click', () => ouvrirLeGuide(null, g));
  col.appendChild(b);

  return col;
}

function ligneDeGuide(x, rang){
  const l = document.createElement('div');
  l.dataset.rang = x.id;
  l.style.cssText = 'display:flex;align-items:center;gap:9px;padding:10px 11px;' +
    'border:1px solid var(--line);border-radius:12px;margin-bottom:8px;';

  const poignee = document.createElement('span');
  poignee.dataset.poignee = '1';
  poignee.style.cssText = 'cursor:grab;color:var(--muted);font-size:15px;' +
    'flex-shrink:0;touch-action:none;padding:2px 4px;';
  poignee.textContent = '⠿';
  l.appendChild(poignee);

  const num = document.createElement('span');
  num.style.cssText = 'flex:0 0 auto;width:24px;height:24px;border-radius:50%;' +
    'background:var(--orange-soft);color:var(--on-accent);display:flex;' +
    'align-items:center;justify-content:center;font-size:11px;font-weight:800;';
  num.textContent = String(rang);
  l.appendChild(num);

  const nom = document.createElement('button');
  nom.className = 'btn btn-secondary';
  nom.style.cssText = 'flex:1;min-width:0;justify-content:flex-start;' +
    'text-align:left;margin:0;padding:4px 6px;' +
    'border:none;background:transparent;font-size:13px;color:var(--cream);';
  nom.textContent = x.titre;
  nom.addEventListener('click', () => ouvrirLeGuide(x, null));
  l.appendChild(nom);

  const det = document.createElement('span');
  det.style.cssText = 'font-size:11px;color:var(--muted);flex-shrink:0;';
  det.textContent = resumeDesBlocs(x.compte) +
    (x.etat === 'publie' ? '' : ' · brouillon');
  l.appendChild(det);

  const fleches = document.createElement('span');
  fleches.style.cssText = 'flex-shrink:0;color:var(--muted);font-size:13px;';
  fleches.innerHTML = '<span data-monter style="cursor:pointer;padding:0 3px;" ' +
    'title="Monter">▲</span><span data-descendre style="cursor:pointer;' +
    'padding:0 3px;" title="Descendre">▼</span>';
  l.appendChild(fleches);

  return l;
}

function resumeDesBlocs(compte){
  const c = compte || {};
  const bouts = BLOCS_PARCOURS
    .filter(b => c[b.type])
    .map(b => c[b.type] + ' ' + b.emoji);
  return bouts.length ? bouts.join(' ') : 'vide';
}


/* ============================================================
   L'ÉDITEUR EN BLOCS

   Un guide est une pile. Un bloc = une chose. Quatre types, et
   l'ordre est libre parce que rien n'est accroché à rien.
   ============================================================ */
async function ouvrirLeGuide(x, groupe){
  const zone = $('parcoursZone');
  if(!zone) return;

  const neuf = !x;
  let blocs = [];
  let titre = '';
  let etat = 'brouillon';
  const idGroupe = neuf ? groupe.id : x.groupe;
  /* ⚠️ L'IDENTIFIANT EST DÉCIDÉ ICI, UNE FOIS — v1036.

     C'est LA correction de « le guide se duplique » : un guide neuf
     partait sans identifiant, et le classeur en créait donc un
     nouveau à chaque envoi reçu. Or l'envoi réessaie tout seul au
     bout de douze secondes, et réveiller le classeur mange ces douze
     secondes à lui seul. Voir idProposeParLEcran. */
  const idPose = (x && x.id) || idProposeParLEcran('gd');

  if(!neuf){
    zone.innerHTML = '<div class="empty">Lecture du guide…</div>';
    try{
      const d = await appelPrep({ action: 'parcoursGuide', id: x.id });
      const g = (d && d.guide) || {};
      blocs = (g.blocs || []).slice();
      titre = g.titre || '';
      etat = g.etat || 'brouillon';
    }catch(e){
      showToast('Lecture impossible : ' + e.message);
      dessinerParcours();
      return;
    }
  }

  const cadre = document.createElement('div');
  cadre.style.cssText = 'border:1px solid var(--orange);border-radius:14px;' +
    'padding:14px;max-width:560px;';

  const dessiner = () => {
    cadre.innerHTML =
      '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">' +
        (neuf ? '➕ Nouveau guide' : '✏️ ' + String(titre).replace(/</g, '&lt;')) +
      '</div>' +
      '<label for="pdTitre">Le titre du guide</label>' +
      '<input type="text" id="pdTitre" placeholder="Le créneau, pas à pas" ' +
        'style="margin-bottom:13px;">' +
      '<div style="font-size:11.5px;color:var(--muted);margin-bottom:7px;">' +
        'Le déroulé — attrape ⠿ et fais glisser</div>' +
      '<div id="pdBlocs"></div>' +
      '<div id="pdAjout" style="display:flex;gap:6px;margin:11px 0 12px;' +
        'flex-wrap:wrap;"></div>';

    cadre.querySelector('#pdTitre').value = titre;

    const zb = cadre.querySelector('#pdBlocs');
    if(!blocs.length){
      const v = document.createElement('div');
      v.className = 'empty';
      v.style.cssText = 'font-size:12.5px;';
      v.textContent = 'Ce guide est vide. Ajoute un bloc ci-dessous — ' +
        'du texte seul suffit.';
      zb.appendChild(v);
    }
    blocs.forEach((b, i) => zb.appendChild(ligneDeBloc(b, i)));

    /* ⚠️ RETIRER UN BLOC, C'EST LE RETIRER DE LA PILE — pas
       seulement effacer sa ligne à l'écran. Une ligne effacée sans
       son bloc, et tout ce qui suit se décale d'un cran au moment
       de relire les cases : le texte du bloc 3 atterrirait dans le
       bloc 2. On relit la frappe en cours, on retire, on redessine. */
    zb.addEventListener('click', (e) => {
      const s = e.target.closest && e.target.closest('[data-retirer]');
      if(!s) return;
      const ligne = s.closest('[data-rang]');
      if(!ligne) return;
      relireLesBlocs(cadre, blocs);
      const i = Number(String(ligne.dataset.rang || '').slice(1));
      if(!isNaN(i) && i >= 0 && i < blocs.length) blocs.splice(i, 1);
      dessiner();
    });

    listeRangeable(zb, ordre => {
      /* Le rang de l'écran fait foi : on réordonne le tableau
         d'après lui, et l'enregistrement réécrira les numéros. */
      relireLesBlocs(cadre, blocs);
      const parCle = {};
      blocs.forEach((b, i) => { parCle['b' + i] = b; });
      blocs = ordre.map(c => parCle[c]).filter(Boolean);
      dessiner();
    });

    const za = cadre.querySelector('#pdAjout');
    BLOCS_PARCOURS.forEach(t => {
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'flex:1;min-width:88px;margin:0;padding:9px;' +
        'font-size:12px;border-style:dashed;';
      b.textContent = t.emoji + ' ' + t.nom;
      b.addEventListener('click', () => {
        /* ⚠️ ON RELIT L'ÉCRAN AVANT D'AJOUTER — v1036.

           David, le 18 septembre : « quand je rajoute un bloc dans un
           guide, ça supprime ce que je viens de mettre ».

           C'était exact, et c'est cette ligne qui manquait. dessiner()
           reconstruit TOUTE la pile depuis le tableau « blocs » ; ce
           qui est tapé dans les cases ne rejoint ce tableau que par
           relireLesBlocs. Sans cet appel, ajouter un bloc redessinait
           l'écran à partir d'un tableau resté au dernier état connu —
           et tout ce qui avait été tapé depuis disparaissait.

           ⚠️ ET ÇA NE PERDAIT PAS QUE DU TEXTE. La clé d'un fichier
           tout juste déposé vit elle aussi dans une case de l'écran :
           ajouter un bloc après avoir déposé une vidéo de 180 Mo la
           perdait, silencieusement. Il fallait la redéposer sans
           jamais savoir pourquoi.

           ⚠️ TROIS GESTES SUR QUATRE LE FAISAIENT DÉJÀ — retirer un
           bloc, le monter, le descendre. Seul « ajouter » ne le
           faisait pas. Une moitié posée, l'autre oubliée. */
        relireLesBlocs(cadre, blocs);
        /* En FIN de pile : un bloc s'ajoute à la suite de ce qu'on
           vient d'écrire, et se déplace ensuite au doigt. */
        blocs.push({ type:t.type, texte:'', fichier:'', titre:'', duree:0 });
        dessiner();
      });
      za.appendChild(b);
    });

    const bVoir = document.createElement('button');
    bVoir.className = 'btn btn-secondary';
    bVoir.style.cssText = 'padding:10px;font-size:13px;';
    bVoir.textContent = '👁️ Voir comme l\'élève';
    /* ⚠️ L'APERÇU AUSSI RELIT L'ÉCRAN. Montrer « comme l'élève le
       verra » à partir d'un tableau périmé, c'est montrer autre chose
       que ce qui sera publié — et c'est pire que ne rien montrer. */
    bVoir.addEventListener('click', () => {
      relireLesBlocs(cadre, blocs);
      apercuDuGuide(cadre.querySelector('#pdTitre').value.trim(), blocs);
    });
    cadre.appendChild(bVoir);

    const bBr = document.createElement('button');
    bBr.className = 'btn btn-secondary';
    bBr.style.cssText = 'padding:10px;font-size:13px;';
    bBr.textContent = (etat === 'publie')
      ? '💾 Repasser en brouillon' : '💾 Garder en brouillon';
    bBr.addEventListener('click', () => enregistrer('brouillon'));
    cadre.appendChild(bBr);

    const bPub = document.createElement('button');
    bPub.className = 'btn btn-primary';
    bPub.style.cssText = 'padding:11px;font-size:13px;';
    bPub.textContent = '✅ Publier le guide';
    bPub.addEventListener('click', () => enregistrer('publie'));
    cadre.appendChild(bPub);

    if(!neuf){
      const bSup = document.createElement('button');
      bSup.className = 'btn btn-secondary';
      bSup.style.cssText = 'padding:10px;font-size:13px;color:var(--red);' +
        'border-color:var(--red);';
      bSup.textContent = '🗑️ Supprimer ce guide';
      bSup.addEventListener('click', async () => {
        if(!await confirmer('Supprimer « ' + titre + ' » ?\n\n' +
            'Ses blocs partent avec lui, et ça ne se défait pas.')) return;
        try{
          await appelPrep({ action: 'parcoursGuideDelete', id: x.id });
          showToast('Guide supprimé ✅');
          afficherParcours();
        }catch(e){ showToast('Impossible : ' + e.message); }
      });
      cadre.appendChild(bSup);
    }

    const bAnn = document.createElement('button');
    bAnn.className = 'btn btn-secondary';
    bAnn.style.cssText = 'padding:10px;font-size:13px;';
    bAnn.textContent = 'Fermer sans enregistrer';
    bAnn.addEventListener('click', () => dessinerParcours());
    cadre.appendChild(bAnn);
  };

  /* ⚠️ UN SEUL ENREGISTREMENT À LA FOIS — v1036. Les boutons du
     guide ne se verrouillaient pas : deux appuis sur une tablette
     qui ne répond pas tout de suite, c'étaient deux guides. Ceux du
     groupe, eux, se verrouillaient déjà — une moitié posée, l'autre
     oubliée. */
  let enregistrementEnCours = false;

  const enregistrer = async (quelEtat) => {
    if(enregistrementEnCours) return;
    const t = cadre.querySelector('#pdTitre').value.trim();
    if(!t){ showToast('Donne un titre au guide.'); return; }
    /* Ce qui est tapé dans les cases l'emporte : on relit l'écran
       avant d'envoyer, sinon la dernière frappe se perdrait. */
    relireLesBlocs(cadre, blocs);

    /* ⚠️ PUBLIER UN BLOC VIDE, C'EST PUBLIER UN TROU — v1034.

       Un bloc 🎬 sans fichier déposé ne montre rien chez l'élève, et
       plus rien ne le signale une fois le guide publié : il faut
       rouvrir le guide pour s'en apercevoir. On le dit ici, une fois,
       et on laisse le choix — garder en brouillon un guide dont il
       manque une vidéo est parfaitement légitime. */
    if(quelEtat === 'publie'){
      const manquants = blocsSansFichier(blocs);
      if(manquants.length && !await confirmer(
          manquants.length + ' bloc(s) n\'ont pas de fichier déposé :\n' +
          manquants.map(m => '· ' + blocConnu(m.type).emoji + ' ' +
                             (m.titre || blocConnu(m.type).nom)).join('\n') +
          '\n\nPublié tel quel, l\'élève verra ces blocs VIDES.\n\n' +
          'Publier quand même ?')) return;
    }

    enregistrementEnCours = true;
    cadre.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try{
      await appelPrep({
        action: 'parcoursGuideSet',
        id: idPose,
        groupe: idGroupe,
        titre: t,
        etat: quelEtat,
        blocs: blocs,
        par: (typeof ACCES !== 'undefined' && ACCES.moniteur) || ''
      });
      showToast(quelEtat === 'publie' ? 'Guide publié ✅' : 'Brouillon gardé ✅');
      parcoursGroupeOuvert = idGroupe;
      afficherParcours();
    }catch(e){
      showToast('Impossible : ' + e.message);
      /* L'écran reprend la main : le guide n'est pas parti, il faut
         pouvoir réessayer sans tout retaper. */
      enregistrementEnCours = false;
      cadre.querySelectorAll('button').forEach(b => { b.disabled = false; });
    }
  };

  zone.innerHTML = '';
  zone.appendChild(cadre);
  dessiner();
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
function dessinerLesVignettes(zone, genre, cles, liens, retirer){
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

  if(b.type === 'texte'){
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
    if(ta) blocs[i].texte = ta.value;
    if(f) blocs[i].fichier = f.value.trim();
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
  return (blocs || []).filter(b => b.type !== 'texte' &&
                                   clesDuBloc(b).length === 0);
}

/* ⚠️ VOIR AVANT DE PUBLIER. Composer à l'aveugle, c'est publier
   puis corriger — et corriger après, ça se voit. */
function apercuDuGuide(titre, blocs){
  const bouts = [];
  bouts.push('📘 ' + (titre || 'Sans titre'));
  bouts.push('');
  (blocs || []).forEach(b => {
    const t = blocConnu(b.type);
    if(b.type === 'texte'){
      bouts.push(String(b.texte || '').trim() || '(texte vide)');
    }else{
      /* ⚠️ ON MONTRE CE QUE L'ÉLÈVE VERRA, pas la clé du fichier.
         « guides/xK3p… » ne veut rien dire pour personne, et un
         aperçu qui ment sur ce point ne sert à rien. */
      const combien = clesDuBloc(b).length;
      bouts.push(t.emoji + ' ' + (b.titre || t.nom) +
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

async function afficherSuiviParcours(){
  const zone = $('parcoursSuiviZone');
  if(!zone) return;
  zone.innerHTML = '<div class="empty">Lecture des parcours…</div>';

  try{
    const d = await appelPrep({ action: 'parcoursSuivi' });
    suiviParcours = (d && d.lignes) || [];
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
  if(l.reste && l.prochain){
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
  const pc = l.total ? Math.round((l.faits / l.total) * 100) : 0;
  const barre = document.createElement('div');
  barre.style.cssText = 'height:5px;border-radius:3px;background:var(--line);' +
    'overflow:hidden;margin:5px 0 4px;max-width:220px;';
  const dedans = document.createElement('div');
  dedans.style.cssText = 'height:100%;width:' + pc + '%;background:' +
    (u >= 2 ? 'var(--red)' : 'var(--accent-text)') + ';';
  barre.appendChild(dedans);
  meta.appendChild(barre);

  const s = document.createElement('span');
  s.textContent = l.total
    ? l.faits + ' étape' + ((l.faits > 1) ? 's' : '') + ' sur ' + l.total +
      (l.reste ? ' · ' + l.reste + ' à voir' : ' · à jour')
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

  row.appendChild(meta);

  /* Ouvrir sa fiche : c'est là qu'on ouvre ou qu'on ferme, sans
     quitter l'écran pour un autre. */
  row.addEventListener('click', () => {
    if(typeof ouvrirFicheEleve === 'function') ouvrirFicheEleve(l.eleve);
    else showToast('Fiche indisponible depuis cet écran.');
  });

  return row;
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

/* ⚠️ ON FILTRE SUR DES MOTS, PAS SUR LA FORMATION ENTIÈRE.

   « AAC BV » et « BEA AAC » sont deux formations différentes, et
   pourtant « AAC » doit attraper les deux — c'est bien ce que disait
   le schéma : BV, BEA, AAC, CS, Moto, BE. Filtrer sur le libellé
   complet donnait un bouton par formation, et « AAC » ne cochait que
   ceux dont la fiche dit exactement « AAC BV ».

   ⚠️ ET LES MOTS VIENNENT DU RÉPERTOIRE, pas d'une liste écrite ici.
   Le jour où tu ajoutes une formation, son mot apparaît tout seul —
   une liste en dur, c'est une formation ajoutée d'un côté et
   introuvable de l'autre.

   Les sites ne sont pas proposés : le répertoire ne dit pas où un
   élève prend ses cours, c'est le bilan qui le dit. */
function motsDeFormation(texte){
  return String(texte || '').split(/[\s|,;]+/)
    .map(x => x.trim()).filter(Boolean);
}

function filtresDAnnonce(){
  const vus = [];
  elevesPourAnnonce.forEach(e => {
    motsDeFormation(e.formation).forEach(t => {
      if(vus.indexOf(t) === -1) vus.push(t);
    });
  });
  return vus.sort((a, b) => a.localeCompare(b, 'fr'));
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

  choisisPourAnnonce = {};
  let tousLesEleves = true;

  const qui = c.querySelector('#anQui');
  const zoneSel = c.querySelector('#anSelection');

  const bPub = document.createElement('button');
  bPub.className = 'btn btn-primary';
  bPub.style.cssText = 'padding:11px;font-size:13px;margin-top:12px;';

  const compte = () => Object.keys(choisisPourAnnonce)
    .filter(n => choisisPourAnnonce[n]).length;

  /* ⚠️ LE NOMBRE EST ÉCRIT SUR LE BOUTON. */
  const redireBouton = () => {
    const n = tousLesEleves ? elevesPourAnnonce.length : compte();
    bPub.textContent = '📣 Publier pour ' + n + ' élève' + (n > 1 ? 's' : '');
    bPub.disabled = (n === 0);
  };

  const dessinerSelection = () => {
    zoneSel.innerHTML = '';
    if(tousLesEleves){
      const m = document.createElement('div');
      m.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;';
      m.textContent = 'Elle s\'affichera chez les ' +
        elevesPourAnnonce.length + ' élèves qui ont un coin révisions ouvert.';
      zoneSel.appendChild(m);
      redireBouton();
      return;
    }

    /* Les filtres : ils COCHENT, ils ne verrouillent pas. */
    const zf = document.createElement('div');
    zf.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px;';
    filtresDAnnonce().forEach(f => {
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;margin:0;padding:6px 10px;font-size:11.5px;';
      b.textContent = f;
      b.addEventListener('click', () => {
        elevesPourAnnonce.forEach(e => {
          /* ⚠️ MOT ENTIER, pas « contient ». « BV » se trouve dans
             « B78>BV » comme dans « AAC BV » : chercher un morceau
             cocherait des élèves d'une autre formation. */
          if(motsDeFormation(e.formation).indexOf(f) !== -1){
            choisisPourAnnonce[e.eleve] = true;
          }
        });
        dessinerSelection();
      });
      zf.appendChild(b);
    });
    zoneSel.appendChild(zf);

    const zt = document.createElement('div');
    zt.style.cssText = 'font-size:11.5px;color:var(--muted);margin-bottom:8px;';
    zt.innerHTML = '<span data-tout style="cursor:pointer;' +
      'color:var(--accent-text);">Tout cocher</span> · ' +
      '<span data-rien style="cursor:pointer;color:var(--accent-text);">' +
      'Tout décocher</span>';
    zt.querySelector('[data-tout]').addEventListener('click', () => {
      elevesPourAnnonce.forEach(e => { choisisPourAnnonce[e.eleve] = true; });
      dessinerSelection();
    });
    zt.querySelector('[data-rien]').addEventListener('click', () => {
      choisisPourAnnonce = {};
      dessinerSelection();
    });
    zoneSel.appendChild(zt);

    const liste = document.createElement('div');
    liste.style.cssText = 'max-height:260px;overflow-y:auto;' +
      'border:1px solid var(--line);border-radius:10px;padding:8px;';
    elevesPourAnnonce.forEach(e => {
      const l = document.createElement('label');
      l.style.cssText = 'display:flex;align-items:center;gap:9px;' +
        'text-transform:none;font-size:13px;color:var(--cream);' +
        'margin:0 0 5px;font-weight:400;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!choisisPourAnnonce[e.eleve];
      cb.style.cssText = 'width:17px;height:17px;flex-shrink:0;margin:0;';
      cb.addEventListener('change', () => {
        choisisPourAnnonce[e.eleve] = cb.checked;
        redireBouton();
      });
      l.appendChild(cb);
      const n = document.createElement('span');
      n.style.cssText = 'flex:1;min-width:0;';
      n.textContent = e.eleve;
      l.appendChild(n);
      if(e.formation){
        const f = document.createElement('span');
        f.style.cssText = 'font-size:11px;color:var(--muted);flex-shrink:0;';
        f.textContent = e.formation;
        l.appendChild(f);
      }
      liste.appendChild(l);
    });
    zoneSel.appendChild(liste);
    redireBouton();
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
      : Object.keys(choisisPourAnnonce).filter(n => choisisPourAnnonce[n]);
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
