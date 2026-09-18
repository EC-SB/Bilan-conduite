/* Déployé le 18/09/2026 à 11:11 — v1034 */
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
        id: (g && g.id) || '',
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
        blocs.push({ type:t.type, texte:'', fichier:'', titre:'', duree:0 });
        dessiner();
      });
      za.appendChild(b);
    });

    const bVoir = document.createElement('button');
    bVoir.className = 'btn btn-secondary';
    bVoir.style.cssText = 'padding:10px;font-size:13px;';
    bVoir.textContent = '👁️ Voir comme l\'élève';
    bVoir.addEventListener('click', () => apercuDuGuide(
      cadre.querySelector('#pdTitre').value.trim(), blocs));
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

  const enregistrer = async (quelEtat) => {
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

    try{
      await appelPrep({
        action: 'parcoursGuideSet',
        id: (x && x.id) || '',
        groupe: idGroupe,
        titre: t,
        etat: quelEtat,
        blocs: blocs,
        par: (typeof ACCES !== 'undefined' && ACCES.moniteur) || ''
      });
      showToast(quelEtat === 'publie' ? 'Guide publié ✅' : 'Brouillon gardé ✅');
      parcoursGroupeOuvert = idGroupe;
      afficherParcours();
    }catch(e){ showToast('Impossible : ' + e.message); }
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
    /* La clé du fichier déposé : elle ne se tape pas, elle se gagne
       en déposant. Cachée, mais relue comme les autres cases. */
    const f = document.createElement('input');
    f.type = 'hidden';
    f.dataset.champ = 'fichier';
    f.value = estUneCleDeFichier(b.fichier) ? b.fichier : '';
    l.appendChild(f);

    /* Le nom que l'élève lira sous le bloc. Il reste modifiable :
       « IMG_4417.mp4 » ne dit rien à personne. */
    const nom = document.createElement('input');
    nom.type = 'text';
    nom.dataset.champ = 'titre';
    nom.style.cssText = 'margin:8px 0 0;font-size:13px;width:100%;' +
      'font-family:inherit;';
    nom.placeholder = (b.type === 'video') ? 'Le créneau, vu de l’intérieur'
                    : (b.type === 'image') ? 'Le panneau à reconnaître'
                    : 'La fiche à imprimer';
    /* ⚠️ LES GUIDES D'AVANT LA v1034 PORTENT UN NOM TAPÉ À LA MAIN
       DANS « fichier ». On ne le jette pas : il devient le nom
       affiché, et le bloc se signale comme « à déposer ». */
    nom.value = b.titre || (estUneCleDeFichier(b.fichier) ? '' : (b.fichier || ''));
    l.appendChild(nom);

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
    choix.accept = (b.type === 'video') ? 'video/mp4'
                 : (b.type === 'image') ? 'image/jpeg,image/png,image/webp'
                 : 'application/pdf';
    l.appendChild(choix);

    const redire = () => {
      const pose = !!f.value;
      etat.style.color = pose ? 'var(--accent-text)' : 'var(--warn-text)';
      etat.textContent = pose
        ? '✅ Fichier déposé' + (b.poids ? ' — ' + poidsLisible(b.poids) : '')
        : '⚠️ Aucun fichier déposé : ce bloc ne montrera rien à l’élève.';
      boutons.innerHTML = '';

      const bDep = document.createElement('button');
      bDep.className = 'btn btn-secondary';
      bDep.style.cssText = 'width:auto;margin:0;padding:7px 11px;font-size:12px;';
      bDep.textContent = pose ? '🔄 Remplacer' : '📤 Déposer le fichier';
      bDep.addEventListener('click', () => choix.click());
      boutons.appendChild(bDep);

      if(pose){
        const bVoir = document.createElement('button');
        bVoir.className = 'btn btn-secondary';
        bVoir.style.cssText = 'width:auto;margin:0;padding:7px 11px;font-size:12px;';
        bVoir.textContent = '👁️ Vérifier';
        bVoir.addEventListener('click', async () => {
          bVoir.disabled = true;
          try{ await montrerLeFichier(b.type, f.value, nom.value); }
          catch(e){ showToast('Impossible : ' + e.message); }
          finally{ bVoir.disabled = false; }
        });
        boutons.appendChild(bVoir);
      }
    };

    choix.addEventListener('change', async () => {
      const fic = choix.files && choix.files[0];
      choix.value = '';
      if(!fic) return;

      boutons.innerHTML = '';
      barre.style.display = 'block';
      dedans.style.width = '0';
      etat.style.color = 'var(--muted)';
      etat.textContent = '📤 Dépôt de ' + fic.name + ' (' +
                         poidsLisible(fic.size) + ')…';
      try{
        const cle = await deposerUnFichier(b.type, fic, (p) => {
          dedans.style.width = p + '%';
          etat.textContent = '📤 Dépôt… ' + p + ' %';
        });
        f.value = cle;
        b.poids = fic.size;
        /* Le nom d'origine sert de proposition, jamais d'écrasement :
           un titre déjà écrit à la main vaut mieux que « IMG_4417 ». */
        if(!nom.value.trim()) nom.value = fic.name.replace(/\.[^.]+$/, '');
        showToast('Fichier déposé ✅');
      }catch(e){
        etat.style.color = 'var(--red)';
        etat.textContent = '❌ ' + (e.message || 'dépôt impossible');
        showToast('Dépôt impossible : ' + e.message);
      }finally{
        barre.style.display = 'none';
        redire();
      }
    });

    redire();
  }

  return l;
}

/* ⚠️ VÉRIFIER AVANT DE PUBLIER. Un .mp4 qui contient du VP9 s'ouvre
   ici en carré noir — et c'est exactement le cas de deux vidéos du
   NAS. Le voir maintenant coûte dix secondes ; le voir par un élève
   qui écrit « ça marche pas » coûte une semaine. */
async function montrerLeFichier(genre, cle, nom){
  const lien = await lienDuFichierDeGuide(cle);
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
                                   !estUneCleDeFichier(b.fichier));
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
      const pose = estUneCleDeFichier(b.fichier);
      bouts.push(t.emoji + ' ' + (b.titre || t.nom) +
                 (pose ? '' : '  ⚠️ AUCUN FICHIER DÉPOSÉ — ce bloc ' +
                              'sera vide chez l\'élève'));
    }
    bouts.push('');
  });
  fenetre(bouts.join('\n').trim() || 'Ce guide est vide.',
          [{ nom: 'Fermer', valeur: true }],
          '👁️ Comme l\'élève le verra');
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-parcours.js'] = true;
