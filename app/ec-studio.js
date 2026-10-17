/* Déployé le 17/10/2026 à 11:08 — v1200 */
/* ============================================================
   ec-studio.js
   🎨 Le studio de diapositives — v1199

   David, le 17 octobre 2026 : « est-ce que c'est possible
   d'ajouter un créateur de diapositive directement dedans ? Un
   genre de Canva ». Ses réponses au schéma : placement libre ;
   n'importe quelle couleur ; pas de modèle « Félicitations » (le
   prénom et la photo d'un élève sur la vitrine demandent son
   accord) ; plusieurs transitions entre les diapositives ; les
   modèles tout faits ET ses propres modèles.

   C'est l'étape ① sur trois : le studio, les modèles et les
   transitions. La photothèque (②) et la mise en page des télés
   avec les thèmes (③) viendront ensuite.

   ⚠️ UNE DIAPOSITIVE DU STUDIO EST UNE DESCRIPTION, PAS UNE IMAGE.
   Elle est rangée dans le classeur comme les autres (type
   « compo », la description dans « contenu ») : le carrousel, les
   dates, la pause et l'ordre marchent sans rien changer. Le texte
   reste du texte — net sur la télé, corrigé en deux secondes.
   Les photos, elles, sont dans le compartiment R2 (« ecran/ »),
   lues par des liens signés qui expirent : une cellule du classeur
   ne tient pas une photo, encore moins plusieurs.

   Le dessin est celui de ec-compo.js, le même que sur les télés.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const STUDIO_CHARTE = ['#B6FF0E', '#F4F1E8', '#FFFFFF', '#0B0E14', '#141922', '#FF5C33', '#6FB4FF', '#E8850C', '#FFD166', '#FF5C8A'];
const STUDIO_DEGRADES = [['#0B0E14', '#16210a', 120], ['#0B0E14', '#1b2b44', 120], ['#B6FF0E', '#6fb10a', 120],
                         ['#14161B', '#3a1a12', 120], ['#2a0f3a', '#0B0E14', 160], ['#0f3d5c', '#0B0E14', 160]];
const STUDIO_PICTOS = ['🚗', '🚙', '🏍️', '🛵', '🚦', '🛑', '⚠️', '🅿️', '🛣️', '⛽', '📅', '🗓️', '⏰', '📍', '📞', '💬',
                       '📣', '📢', '🎓', '🏆', '🎉', '⭐', '✅', '👍', '👆', '👉', '💡', '🔑', '✨', '🔥', '❤️', '☀️',
                       '❄️', '🍂', '🌸', '🎃', '🎄', '🥚', '🏢', '🧑‍🏫'];
const STUDIO_TRANSITIONS = [['', 'Comme les autres'], ['fondu', '✨ Fondu'], ['glisser', '⬅️ Glisser'],
                            ['monter', '⬆️ Monter'], ['zoom', '🔍 Zoom'], ['volet', '🪟 Volet']];
const STUDIO_DUREES = [[6, '6 secondes'], [10, '10 secondes'], [15, '15 secondes'], [25, '25 secondes'],
                       [40, '40 secondes'], [60, '1 minute'], [120, '2 minutes']];

/* La place déjà prise sur chaque télé, mesurée sur ecran.html
   (1600 × 900) et ramenée à la forme de la diapositive. */
function zonesDuStudio(format){
  const q = (typeof qrEcran !== 'undefined' && qrEcran) || null;
  const qrLa = f => !!(q && q.pageActive && (f === 'vitrine' ? q.vitrine : q.accueil));
  const panneau = (typeof diaposEcran !== 'undefined' ? diaposEcran : [])
    .some(d => d.type === 'panneau' && typeof etatDiapo === 'function' && etatDiapo(d) === 'ecran');
  if(format === 'vitrine'){
    return [].concat(
      panneau ? [{ k: 'panneau', x: 0, y: 0, w: 256, h: 824, t: '📝 Texte fixe' }] : [],
      [{ k: 'meteo', x: 325, y: 26, w: 661, h: 112, t: '🌤️ Météo' }],
      qrLa('vitrine') ? [{ k: 'qr', x: 770, y: 486, w: 230, h: 314, t: '🔳 QR' }] : []);
  }
  return [].concat(
    [{ k: 'planning', x: 24, y: 24, w: 389, h: 330, t: '📅 Les cours à venir' }],
    qrLa('accueil') ? [{ k: 'qr', x: 1346, y: 384, w: 230, h: 314, t: '🔳 QR' }] : []);
}

/* ============================================================
   LES SEPT MODÈLES — rangés pour laisser libres le planning et le
   QR, à l'accueil comme à la vitrine. Les textes sont des exemples
   à remplacer.
   ============================================================ */
function modelesDuStudio(){
  const CIT = '#B6FF0E', CREME = '#F4F1E8', NUIT = '#0B0E14', GRIS = '#C9CED6';
  /* [élément, place à l'accueil, place à la vitrine] */
  const m = (nom, fond, liste) => {
    const c = { nom: nom, fond: fond, el: [], pos: { accueil: {}, vitrine: {} }, transition: '', arrivee: 'ensemble' };
    liste.forEach(([e, a, v]) => {
      c.el.push(e);
      if(a) c.pos.accueil[e.id] = { x: a[0], y: a[1], w: a[2], h: a[3] || 0 };
      if(v) c.pos.vitrine[e.id] = { x: v[0], y: v[1], w: v[2], h: v[3] || 0 };
    });
    return c;
  };
  return [
    ['📣 Annonce', m('Annonce', { type: 'degrade', c1: NUIT, c2: '#1d2a10', angle: 120 }, [
      [{ id: 'a1', type: 'texte', txt: 'Nouveau', taille: 40, gras: true, couleur: CIT, maj: true, espace: 6 }, [470, 180, 820], [290, 170, 680]],
      [{ id: 'a2', type: 'texte', txt: 'Le code se révise\naussi sur ton téléphone', taille: 66, gras: true, couleur: CREME, interligne: 1.15 }, [470, 240, 840], [290, 230, 700]],
      [{ id: 'a3', type: 'texte', txt: 'Demande ton accès à l’accueil.', taille: 38, couleur: GRIS }, [470, 440, 760], [290, 500, 460]],
      [{ id: 'a4', type: 'logo', couleur: CIT }, [470, 600, 500, 60], [290, 720, 460, 56]]
    ])],
    ['📅 Événement', m('Portes ouvertes', { type: 'degrade', c1: NUIT, c2: '#16210a', angle: 120 }, [
      [{ id: 'e1', type: 'photo', cle: '', rayon: 28 }, [960, 40, 340, 260], [520, 160, 450, 280]],
      [{ id: 'e2', type: 'pastille', txt: 'SAM.\n24\nOCT.', taille: 40, grand: 1, fond: CIT, couleur: NUIT, rayon: 34, rot: -4 }, [470, 60, 210, 210], [290, 160, 200, 200]],
      [{ id: 'e3', type: 'texte', txt: 'Portes ouvertes', taille: 84, gras: true, couleur: CIT }, [470, 330, 860], [290, 380, 700]],
      [{ id: 'e4', type: 'texte', txt: 'De 10 h à 17 h · essai sur simulateur\net café offert', taille: 40, couleur: CREME, interligne: 1.35 }, [470, 450, 820], [290, 500, 460]],
      [{ id: 'e5', type: 'logo', couleur: CIT }, [470, 620, 500, 56], [290, 740, 460, 52]]
    ])],
    ['🏷️ Offre / prix', m('Offre', { type: 'couleur', c1: CIT }, [
      [{ id: 'o1', type: 'texte', txt: 'Stage code', taille: 56, gras: true, couleur: NUIT, maj: true, espace: 4 }, [470, 90, 820], [290, 170, 680]],
      [{ id: 'o2', type: 'texte', txt: '5 jours pour\nl’examen', taille: 96, gras: true, couleur: NUIT, interligne: 1 }, [470, 160, 820], [290, 230, 700]],
      [{ id: 'o3', type: 'pastille', txt: 'dès\nXX €', taille: 36, grand: 1, fond: NUIT, couleur: CIT, rayon: 26, rot: 5 }, [1070, 80, 250, 150], [290, 450, 240, 140]],
      [{ id: 'o4', type: 'texte', txt: 'Prochaine session : à préciser', taille: 40, gras: true, couleur: NUIT }, [470, 440, 820], [290, 610, 460]],
      [{ id: 'o5', type: 'texte', txt: 'Voir conditions à l’accueil', taille: 22, couleur: '#2b3a0a' }, [470, 640, 820], [290, 770, 460]]
    ])],
    ['📸 Photo + texte', m('Photo', { type: 'couleur', c1: NUIT }, [
      [{ id: 'p1', type: 'photo', cle: '', rayon: 0 }, [0, 0, 1600, 722], [0, 0, 1024, 824]],
      [{ id: 'p2', type: 'forme', fond: 'rgba(11,14,20,0)', fond2: 'rgba(11,14,20,0.9)', angle: 180 }, [0, 430, 1600, 292], [0, 200, 1024, 624]],
      [{ id: 'p3', type: 'texte', txt: 'Nos nouvelles voitures\nsont arrivées', taille: 66, gras: true, couleur: CREME, ombre: true }, [470, 520, 840], [290, 300, 680]]
    ])],
    ['🔒 Fermeture', m('Fermeture', { type: 'couleur', c1: '#14161B' }, [
      [{ id: 'f1', type: 'pastille', txt: 'FERMÉ', taille: 46, fond: '#FF5C33', couleur: '#FFFFFF', rayon: 40 }, [470, 130, 300, 80], [290, 170, 280, 76]],
      [{ id: 'f2', type: 'texte', txt: 'Mercredi 11 novembre', taille: 74, gras: true, couleur: CREME }, [470, 250, 840], [290, 270, 700]],
      [{ id: 'f3', type: 'texte', txt: 'Le bureau rouvre jeudi à 9 h.\nLes leçons sont maintenues.', taille: 42, couleur: GRIS, interligne: 1.35 }, [470, 370, 820], [290, 500, 460]],
      [{ id: 'f4', type: 'picto', txt: '🗓️' }, [1140, 110, 160, 160], [860, 380, 110, 110]]
    ])],
    ['🔳 Scannez', m('Scannez', { type: 'couleur', c1: NUIT }, [
      [{ id: 'q1', type: 'texte', txt: 'Prends rendez-vous\nen 30 secondes', taille: 60, gras: true, couleur: CREME }, [470, 150, 580], [290, 170, 680]],
      [{ id: 'q2', type: 'texte', txt: 'Visez le code avec l’appareil photo\nde votre téléphone.', taille: 36, couleur: GRIS, interligne: 1.35 }, [470, 360, 560], [290, 330, 460]],
      [{ id: 'q3', type: 'qr', bureau: 'saint-brieuc' }, [1050, 110, 250, 250], [290, 480, 240, 240]],
      [{ id: 'q4', type: 'picto', txt: '👆' }, [980, 380, 90, 90], [550, 560, 90, 90]]
    ])],
    ['⬜ Page vierge', m('', { type: 'couleur', c1: NUIT }, [
      [{ id: 'v1', type: 'texte', txt: 'Ton texte ici', taille: 60, gras: true, couleur: CREME, align: 'center' }, [470, 300, 840], [290, 350, 680]]
    ])]
  ];
}

/* ============================================================
   LES LIENS DES PHOTOS — demandés au Worker, gardés le temps de la
   page (ils valent quelques heures)
   ============================================================ */
let liensStudio = {};
async function liensDesPhotosStudio(cles){
  const manque = (cles || []).filter(k => k && !liensStudio[k]);
  if(!manque.length) return liensStudio;
  try{
    const r = await appelPrep({ action: 'ecranPhotosLiens', cles: manque.slice(0, 200) });
    Object.assign(liensStudio, (r && r.liens) || {});
  }catch(e){ /* sans lien, la vignette montre l'emplacement vide */ }
  return liensStudio;
}
function lienStudio(cle){
  const l = liensStudio[cle];
  if(!l) return '';
  /* Le Worker rend un chemin (« /parcours/fichier?… ») : il sert, pas GitHub */
  return l.charAt(0) === '/' ? String(CONFIG.WORKER_URL || '').replace(/\/$/, '') + l : l;
}
function qrStudio(bureau){
  return (typeof QR_BUREAUX !== 'undefined' && QR_BUREAUX[bureau]) || '';
}
function compoDeLaDiapo(d){
  try{ return Compo.nettoyer(JSON.parse(d.contenu || '{}')); }catch(e){ return Compo.nettoyer({}); }
}
/* Les liens de toutes les diapositives du studio, avant de dessiner la liste */
async function preparerLiensDesDiapos(diapos){
  if(typeof Compo === 'undefined') return;
  const cles = [];
  (diapos || []).forEach(d => { if(d.type === 'compo') Compo.photos(compoDeLaDiapo(d)).forEach(k => cles.push(k)); });
  if(cles.length) await liensDesPhotosStudio(cles);
}

/* La vignette d'une diapositive du studio, dans 🖼️ Diapositives */
function vignetteCompo(boite, d, largeur){
  if(typeof Compo === 'undefined') return;
  const format = d.ou === 'vitrine' ? 'vitrine' : 'accueil';
  Compo.rendre(boite, compoDeLaDiapo(d), format, { largeur: largeur, photo: lienStudio, qr: qrStudio });
}

/* ============================================================
   « ➕ NOUVELLE DIAPOSITIVE » : CE QU'ON CRÉE
   ============================================================ */
function ouvrirNouvelleDiapo(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const b = document.createElement('div');
  b.className = 'modal';
  b.style.cssText = 'max-width:min(520px,94vw);max-height:88vh;overflow-y:auto;';
  b.innerHTML = '<h3>Nouvelle diapositive</h3><div class="stChoix">' +
    '<button type="button" class="stGrand" data-choix="studio"><span class="ic">🎨</span><span><b>Créer une diapositive</b>' +
      '<small>Partir d’un modèle et l’arranger : textes, photos, couleurs, date, QR code. Elle tourne dans le carrousel.</small></span></button>' +
    '<div class="stSep">Ou bien</div>' +
    [['image', '📋', 'Une image toute faite', 'Faite ailleurs (Canva, une affiche…) : colle-la ou choisis le fichier'],
     ['video', '🎬', 'Une vidéo', 'L’adresse d’un fichier .mp4'],
     ['bandeau', '📢', 'Un texte défilant en bas', 'Pendant que le reste tourne'],
     ['fond', '🖼️', 'Le fond fixe de la vitrine', ''],
     ['panneau', '📝', 'Le texte fixe à gauche de la vitrine', '']]
      .map(([k, ic, t, s]) => '<button type="button" class="stAutre" data-choix="' + k + '">' + ic +
        '<span>' + t + (s ? '<small>' + s + '</small>' : '') + '</span></button>').join('') +
    '</div><div class="btn-row"><button type="button" class="btn btn-secondary" data-choix="annuler">Annuler</button></div>';
  b.addEventListener('click', ev => {
    const x = ev.target.closest('[data-choix]');
    if(!x) return;
    const k = x.dataset.choix;
    fermerFond(fond);
    if(k === 'studio') ouvrirModelesStudio();
    else if(k !== 'annuler') ouvrirEditeurDiapo(null, k);
  });
  fond.appendChild(b);
  document.body.appendChild(fond);
}

/* ============================================================
   LES MODÈLES : les sept, les tiens ⭐, et tes diapositives ⧉
   ============================================================ */
async function ouvrirModelesStudio(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const b = document.createElement('div');
  b.className = 'modal';
  b.style.cssText = 'width:min(1040px,96vw);max-height:90vh;overflow-y:auto;';
  /* .modal est bridé à 520 px (!important) sur grand écran : la galerie a besoin de place */
  b.style.setProperty('max-width', 'min(1040px, 96vw)', 'important');
  b.innerHTML = '<h3>🎨 Choisis un modèle</h3>' +
    '<div class="stPetit" style="margin:-8px 0 12px;">Tout se change ensuite : les textes, les couleurs, les photos, la place de chaque élément.</div>' +
    '<div class="stModeles" id="stModelesTout"></div>' +
    '<div class="stSep" style="margin-top:14px;">⭐ Tes modèles</div><div class="stModeles" id="stModelesPerso"><div class="stPetit">Lecture…</div></div>' +
    '<div class="stSep" style="margin-top:14px;">⧉ Repartir d’une diapositive déjà faite</div><div class="stModeles" id="stModelesDiapos"></div>' +
    '<div class="btn-row"><button type="button" class="btn btn-secondary" id="stModelesRetour">← Retour</button></div>';
  fond.appendChild(b);
  document.body.appendChild(fond);
  b.querySelector('#stModelesRetour').addEventListener('click', () => { fermerFond(fond); ouvrirNouvelleDiapo(); });

  const larg = () => {
    const g = b.querySelector('#stModelesTout');
    const n = innerWidth < 600 ? 2 : Math.max(2, Math.floor((g.clientWidth + 12) / 242));
    return Math.floor((g.clientWidth - (n - 1) * (innerWidth < 600 ? 8 : 12)) / n) - 18;
  };
  const carte = (nom, compo, quand, retirer) => {
    const c = document.createElement('div');
    c.className = 'stModele';
    c.setAttribute('role', 'button');
    c.tabIndex = 0;
    const v = document.createElement('div');
    c.appendChild(v);
    const t = document.createElement('b');
    t.textContent = nom;
    c.appendChild(t);
    Compo.rendre(v, compo, 'accueil', { largeur: larg(), photo: lienStudio, qr: qrStudio, edition: true });
    c.addEventListener('click', ev => {
      if(ev.target.closest('.stRetirer')) return;
      fermerFond(fond);
      quand();
    });
    if(retirer){
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'stRetirer';
      x.title = 'Retirer ce modèle';
      x.textContent = '🗑️';
      x.addEventListener('click', retirer);
      c.appendChild(x);
    }
    return c;
  };
  const tout = b.querySelector('#stModelesTout');
  modelesDuStudio().forEach(([nom, compo]) => tout.appendChild(carte(nom, compo, () => ouvrirStudio({ compo: compo }))));

  /* Tes diapositives du studio, à dupliquer */
  const zd = b.querySelector('#stModelesDiapos');
  const faites = (typeof diaposEcran !== 'undefined' ? diaposEcran : []).filter(d => d.type === 'compo');
  if(!faites.length) zd.innerHTML = '<div class="stPetit">Aucune pour l’instant : celles que tu feras ici apparaîtront ici.</div>';
  else{
    await preparerLiensDesDiapos(faites);
    faites.forEach(d => {
      const cc = compoDeLaDiapo(d);
      zd.appendChild(carte(d.titre || cc.nom || 'Sans titre', cc, () => ouvrirStudio({ compo: cc, copie: true })));
    });
  }

  /* Tes modèles ⭐ */
  const zp = b.querySelector('#stModelesPerso');
  const dessinerPerso = (liste) => {
    zp.innerHTML = '';
    if(!liste.length){
      zp.innerHTML = '<div class="stPetit">Aucun pour l’instant : dans le studio, « ⭐ Garder comme modèle » range une diapositive ici.</div>';
      return;
    }
    liste.forEach(x => zp.appendChild(carte('⭐ ' + x.nom, x.compo, () => ouvrirStudio({ compo: x.compo }), async ev => {
      ev.stopPropagation();
      if(!await confirmer('Retirer le modèle « ' + x.nom + ' » ?')) return;
      try{
        const r = await appelPrep({ action: 'ecranModeleSupprimer', id: x.id });
        dessinerPerso((r && r.modeles) || []);
        showToast('Modèle retiré ✅');
      }catch(e){ showToast('Impossible : ' + e.message); }
    })));
  };
  try{
    const r = await appelPrep({ action: 'ecranModeles' });
    Object.assign(liensStudio, (r && r.liens) || {});
    dessinerPerso((r && r.modeles) || []);
  }catch(e){
    zp.innerHTML = '<div class="stPetit">⚠️ ' + echEcran(e.message) + '</div>';
  }
}

/* ============================================================
   LE STUDIO
   ============================================================ */
let studio = null;

function ouvrirStudio(o){
  o = o || {};
  if(typeof Compo === 'undefined'){ showToast('Le fichier ec-compo.js manque : recharge la page.'); return; }
  const d = o.diapo || null;
  const compo = d ? compoDeLaDiapo(d) : Compo.nettoyer(JSON.parse(JSON.stringify(o.compo || {})));
  if(o.copie) compo.nom = (compo.nom ? compo.nom + ' (copie)' : '');
  studio = {
    d: d, c: compo, choix: '', pile: [], refaire: [], modifie: false, zones: true,
    ou: d ? (d.ou || 'les-deux') : 'les-deux',
    duree: d ? (Number(d.duree) || 15) : 15,
    du: d ? (d.du || '') : '', au: d ? (d.au || '') : '',
    format: (d && d.ou === 'vitrine') ? 'vitrine' : 'accueil',
    feuille: '', rendu: null
  };
  const z = document.createElement('div');
  /* « overlay show » : le retour arrière de l'appli (ec-demarrage.js)
     ferme une fenêtre ouverte par son bouton « Fermer » — le studio
     se comporte donc comme les autres fenêtres. */
  z.className = 'overlay show stStudio';
  z.id = 'stStudio';
  z.innerHTML =
    '<div class="stBarre">' +
      '<button type="button" class="btn btn-secondary" data-act="fermer" title="Fermer">←<span class="stCache"> Fermer</span></button>' +
      '<input type="text" class="stNom" id="stNom" maxlength="80" placeholder="Le nom de la diapositive">' +
      '<button type="button" class="btn btn-secondary" data-act="annuler" title="Annuler">↶</button>' +
      '<button type="button" class="btn btn-secondary stLarge" data-act="refaire" title="Refaire">↷</button>' +
      '<button type="button" class="btn btn-secondary stLarge" data-act="grand">▶️ Voir en grand</button>' +
      '<button type="button" class="btn btn-secondary stLarge" data-act="modele">⭐ Garder comme modèle</button>' +
      '<button type="button" class="btn btn-primary" data-act="enregistrer">💾 Enregistrer</button>' +
    '</div>' +
    '<div class="stCorps">' +
      '<div class="stToile">' +
        '<div class="stFormats" id="stFormats"></div>' +
        '<div class="stCadre" id="stCadre"><div id="stRendu"></div><div class="stCalque" id="stCalque"></div></div>' +
        '<div class="stAjout" id="stAjout">' +
          [['texte', '➕ Texte'], ['photo', '📷 Photo'], ['pastille', '🏷️ Pastille'], ['picto', '😀 Picto'],
           ['qr', '🔳 QR code'], ['logo', 'EC Logo'], ['forme', '▭ Forme']]
            .map(([k, t]) => '<button type="button" class="btn btn-secondary" data-ajout="' + k + '">' + t + '</button>').join('') +
        '</div>' +
        '<div class="stAjout stSeulTel">' +
          '<button type="button" class="btn btn-secondary" data-feuille="fond">🖼️ Le fond</button>' +
          '<button type="button" class="btn btn-secondary" data-feuille="diffusion">📺 Diffusion</button>' +
          '<button type="button" class="btn btn-secondary" data-act="grand">▶️ Voir</button>' +
          '<button type="button" class="btn btn-secondary" data-act="modele">⭐ Modèle</button>' +
        '</div>' +
      '</div>' +
      '<div class="stPanneau" id="stPanneau"></div>' +
    '</div>' +
    '<div class="stFeuille" id="stFeuille"></div>';
  document.body.appendChild(z);
  document.body.classList.add('stOuvert');
  z.querySelector('#stNom').value = compo.nom || '';
  z.querySelector('#stNom').addEventListener('input', ev => { studio.c.nom = ev.target.value; studio.modifie = true; });

  z.addEventListener('click', ev => {
    const a = ev.target.closest('[data-act]');
    if(a) return actionStudio(a.dataset.act);
    const aj = ev.target.closest('[data-ajout]');
    if(aj) return ajouterElementStudio(aj.dataset.ajout);
    const f = ev.target.closest('[data-feuille]');
    if(f){ studio.feuille = f.dataset.feuille; studio.choix = ''; dessinerStudio(); }
  });
  const cadre = z.querySelector('#stCadre');
  cadre.addEventListener('pointerdown', pointeurStudio);
  studio.clavier = ev => clavierStudio(ev);
  document.addEventListener('keydown', studio.clavier);
  /* Seule une vraie largeur nouvelle redessine : le clavier du
     téléphone change la hauteur, et redessiner ferait perdre le champ
     en cours de saisie. */
  studio.largeurVue = innerWidth;
  studio.redim = () => { if(studio && innerWidth !== studio.largeurVue){ studio.largeurVue = innerWidth; dessinerStudio(); } };
  addEventListener('resize', studio.redim);

  liensDesPhotosStudio(Compo.photos(compo)).then(() => dessinerStudio());
  dessinerStudio();
}

async function fermerStudio(){
  if(!studio) return;
  if(studio.modifie && !await confirmer('Fermer sans enregistrer ? Les changements seront perdus.')) return;
  document.removeEventListener('keydown', studio.clavier);
  removeEventListener('resize', studio.redim);
  const z = document.getElementById('stStudio');
  if(z) z.remove();
  document.body.classList.remove('stOuvert');
  studio = null;
}

function telStudio(){ return innerWidth < 900; }

/* ---------- L'historique : ↶ ↷ ---------- */
function memoriserStudio(){
  studio.pile.push(JSON.stringify(studio.c));
  if(studio.pile.length > 60) studio.pile.shift();
  studio.refaire = [];
  studio.modifie = true;
}

function actionStudio(a){
  if(!studio) return;
  if(a === 'fermer') return fermerStudio();
  if(a === 'annuler' || a === 'refaire'){
    const de = a === 'annuler' ? studio.pile : studio.refaire;
    const vers = a === 'annuler' ? studio.refaire : studio.pile;
    if(!de.length) return;
    vers.push(JSON.stringify(studio.c));
    studio.c = Compo.nettoyer(JSON.parse(de.pop()));
    if(studio.choix && !studio.c.el.some(e => e.id === studio.choix)) studio.choix = '';
    studio.modifie = true;
    return dessinerStudio();
  }
  if(a === 'grand') return voirEnGrandStudio();
  if(a === 'modele') return garderCommeModele();
  if(a === 'enregistrer') return enregistrerStudio();
  if(a === 'zones'){ studio.zones = !studio.zones; return dessinerStudio(); }
  if(a === 'devant' || a === 'derriere' || a === 'dupliquer' || a === 'supprimer') return elementStudio(a);
  if(a === 'modifier'){
    if(telStudio()){ studio.feuille = 'element'; dessinerStudio(); }
    const t = document.querySelector('#stStudio .stProps textarea');
    if(t) t.focus();
  }
  if(a === 'fermerFeuille'){ studio.feuille = ''; studio.choix = ''; dessinerStudio(); }
}

/* ---------- Ajouter un élément ---------- */
function nouvelIdStudio(){
  let i = studio.c.el.length + 1, id;
  do { id = 'x' + (i++).toString(36) + Math.floor(Math.random() * 1296).toString(36); }
  while(studio.c.el.some(e => e.id === id));
  return id;
}
function ajouterElementStudio(type){
  const id = nouvelIdStudio();
  const defauts = {
    texte: { txt: 'Ton texte', taille: 56, gras: true, couleur: '#F4F1E8' },
    photo: { cle: '', rayon: 24 },
    pastille: { txt: 'Nouveau', taille: 40, fond: '#B6FF0E', couleur: '#0B0E14', rayon: 26 },
    picto: { txt: '🚗' },
    qr: { bureau: 'saint-brieuc' },
    logo: { couleur: '#B6FF0E' },
    forme: { fond: '#B6FF0E', rayon: 24, opacite: 1 }
  };
  const tailles = { texte: [560, 0], photo: [420, 300], pastille: [260, 110], picto: [140, 140], qr: [240, 240], logo: [480, 56], forme: [300, 200] };
  memoriserStudio();
  studio.c.el.push(Object.assign({ id: id, type: type }, defauts[type]));
  ['accueil', 'vitrine'].forEach(f => {
    const W = Compo.BASES[f][0], H = Compo.BASES[f][1];
    const [w, h] = tailles[type];
    const ww = Math.min(w, W - 340);
    /* Au milieu de la place libre : à droite du planning à l'accueil,
       à droite du texte fixe à la vitrine */
    const x0 = f === 'accueil' ? 450 : 290;
    studio.c.pos[f][id] = { x: Math.round(x0 + (W - x0 - 280 - ww) / 2), y: Math.round((H - (h || 80)) / 2), w: ww, h: h };
  });
  studio.c = Compo.nettoyer(studio.c);
  studio.choix = id;
  studio.feuille = 'element';
  dessinerStudio();
  if(type === 'photo') choisirPhotoStudio(cle => {
    const e = studio.c.el.find(x => x.id === id);
    if(e){ e.cle = cle; dessinerStudio(); }
  });
}

function elementStudio(a){
  const id = studio.choix;
  const i = studio.c.el.findIndex(e => e.id === id);
  if(i < 0) return;
  memoriserStudio();
  if(a === 'supprimer'){
    studio.c.el.splice(i, 1);
    delete studio.c.pos.accueil[id];
    delete studio.c.pos.vitrine[id];
    studio.choix = '';
    if(telStudio()) studio.feuille = '';
  }else if(a === 'devant'){
    studio.c.el.push(studio.c.el.splice(i, 1)[0]);
  }else if(a === 'derriere'){
    studio.c.el.unshift(studio.c.el.splice(i, 1)[0]);
  }else if(a === 'dupliquer'){
    const n = JSON.parse(JSON.stringify(studio.c.el[i]));
    n.id = nouvelIdStudio();
    studio.c.el.push(n);
    ['accueil', 'vitrine'].forEach(f => {
      const p = studio.c.pos[f][id];
      if(p) studio.c.pos[f][n.id] = { x: p.x + 30, y: p.y + 30, w: p.w, h: p.h };
    });
    studio.choix = n.id;
  }
  studio.c = Compo.nettoyer(studio.c);
  dessinerStudio();
}

/* ---------- Une photo : prise ou choisie, envoyée dans R2 ---------- */
/* ============================================================
   📚 AJOUTER UNE PHOTO : prise, choisie, ou piochée dans la
   photothèque de l'école — v1200 (étape ② du studio)

   David : « vas-y pour l'étape 2 ». Les photos de l'école (les
   véhicules, les bureaux, les événements) se gardent une fois et se
   reprennent dans n'importe quelle diapositive, pour le fond comme
   pour un cadre.
   ============================================================ */
const RANGEMENTS_PHOTOS = [['vehicules', '🚗 Véhicules'], ['bureaux', '🏢 Bureaux'], ['evenements', '🎉 Événements'], ['autres', '📁 Autres']];

function choisirPhotoStudio(quand){
  ouvrirPhotosStudio(cle => {
    if(!studio) return;
    memoriserStudio();
    quand(cle);
  });
}

async function lirePhotothequeStudio(){
  const r = await appelPrep({ action: 'ecranPhotheque' });
  const photos = (r && r.photos) || [];
  photos.forEach(p => { liensStudio[p.cle] = p.lien; });
  return photos;
}

function ouvrirPhotosStudio(quand){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const b = document.createElement('div');
  b.className = 'modal';
  b.style.cssText = 'width:min(680px,96vw);max-height:90vh;overflow-y:auto;';
  b.style.setProperty('max-width', 'min(680px, 96vw)', 'important');
  b.innerHTML = '<h3>📷 Ajouter une photo</h3>' +
    '<div class="stRang">' +
      '<button type="button" class="btn btn-secondary" data-ph="camera">📷 Prendre une photo</button>' +
      '<button type="button" class="btn btn-secondary" data-ph="fichier">🖼️ Choisir un fichier</button>' +
    '</div>' +
    '<label class="stCocheL"><input type="checkbox" id="phGarder"> ➕ Garder dans la photothèque</label>' +
    '<div id="phGarderDetails" style="display:none;">' +
      '<label for="phNom">Son nom</label><input type="text" id="phNom" maxlength="60" placeholder="Ex : A3 n°4, le bureau de Loudéac…">' +
      '<label>Rangée dans</label><div class="stChips" id="phRangement">' +
        RANGEMENTS_PHOTOS.map(([k, t], i) => '<button type="button" class="btn ' + (i === 0 ? 'btn-primary' : 'btn-secondary') + '" data-rg="' + k + '">' + t + '</button>').join('') +
      '</div>' +
    '</div>' +
    '<div class="stSep" id="phTitre">📚 La photothèque de l’école</div>' +
    '<div class="stChips" id="phFiltres"></div>' +
    '<div class="stPhotos" id="phGrille"><div class="stPetit">Lecture…</div></div>' +
    '<div class="btn-row"><button type="button" class="btn btn-secondary" data-ph="annuler">Annuler</button>' +
      '<button type="button" class="btn btn-primary" data-ph="mettre" disabled>Mettre cette photo</button></div>' +
    '<input type="file" accept="image/*" capture="environment" id="phCamera" style="display:none">' +
    '<input type="file" accept="image/*" id="phFichier" style="display:none">';
  fond.appendChild(b);
  document.body.appendChild(fond);

  let photos = [], filtre = 'toutes', choisie = '', rangement = 'vehicules';
  const fermer = () => fermerFond(fond);

  const garder = b.querySelector('#phGarder');
  garder.addEventListener('change', () => { b.querySelector('#phGarderDetails').style.display = garder.checked ? 'block' : 'none'; });
  b.querySelectorAll('[data-rg]').forEach(x => x.addEventListener('click', () => {
    rangement = x.dataset.rg;
    b.querySelectorAll('[data-rg]').forEach(y => y.className = 'btn ' + (y === x ? 'btn-primary' : 'btn-secondary'));
  }));

  const dessiner = () => {
    const compte = k => photos.filter(p => k === 'toutes' || p.categorie === k).length;
    b.querySelector('#phTitre').textContent = '📚 La photothèque de l’école · ' + photos.length;
    b.querySelector('#phFiltres').innerHTML = [['toutes', 'Toutes']].concat(RANGEMENTS_PHOTOS)
      .filter(([k]) => k === 'toutes' || compte(k))
      .map(([k, t]) => '<button type="button" class="btn ' + (filtre === k ? 'btn-primary' : 'btn-secondary') + '" data-filtre="' + k + '">' + t + ' · ' + compte(k) + '</button>').join('');
    b.querySelectorAll('[data-filtre]').forEach(x => x.addEventListener('click', () => { filtre = x.dataset.filtre; dessiner(); }));
    const g = b.querySelector('#phGrille');
    g.innerHTML = '';
    const vues = photos.filter(p => filtre === 'toutes' || p.categorie === filtre);
    if(!vues.length){
      g.innerHTML = '<div class="stPetit">Pas encore de photo ici : coche « ➕ Garder dans la photothèque » en en ajoutant une, ' +
                    'elle sera là la prochaine fois.</div>';
    }
    vues.forEach(p => {
      const t = document.createElement('div');
      t.className = 'stPhoto' + (p.cle === choisie ? ' on' : '');
      t.setAttribute('role', 'button');
      t.tabIndex = 0;
      t.dataset.cle = p.cle;
      t.style.backgroundImage = 'url("' + String(lienStudio(p.cle)).replace(/"/g, '%22') + '")';
      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = p.nom || 'Sans nom';
      t.appendChild(n);
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'plus';
      plus.title = 'Renommer, ranger, retirer';
      plus.textContent = '⋯';
      plus.addEventListener('click', ev => {
        ev.stopPropagation();
        ouvrirRangerPhoto(p, liste => { photos = liste; if(!photos.some(x => x.cle === choisie)) choisie = ''; dessiner(); majBouton(); });
      });
      t.appendChild(plus);
      t.addEventListener('click', () => { choisie = p.cle; dessiner(); majBouton(); });
      t.addEventListener('dblclick', () => { choisie = p.cle; mettre(); });
      g.appendChild(t);
    });
  };
  const majBouton = () => { b.querySelector('[data-ph="mettre"]').disabled = !choisie; };
  const mettre = () => { if(!choisie) return; fermer(); quand(choisie); };

  const envoyer = async f => {
    if(!f) return;
    const boutons = b.querySelectorAll('[data-ph="camera"], [data-ph="fichier"]');
    boutons.forEach(x => { x.disabled = true; });
    showToast('Envoi de la photo…');
    try{
      const donnees = await reduirePhotoStudio(f);
      const nom = String(b.querySelector('#phNom').value || '').trim() ||
                  String(f.name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 60);
      const corps = { action: 'ecranPhotoPoser', photo: donnees };
      if(garder.checked) Object.assign(corps, { garder: '1', titre: nom, categorie: rangement });
      const r = await appelPrep(corps);
      if(!r || !r.cle) throw new Error((r && r.message) || 'Photo refusée.');
      liensStudio[r.cle] = r.lien;
      fermer();
      quand(r.cle);
      showToast(garder.checked ? 'Photo posée et gardée dans la photothèque ✅' : 'Photo posée ✅');
    }catch(e){
      showToast('Impossible : ' + e.message);
      boutons.forEach(x => { x.disabled = false; });
    }
  };
  b.querySelector('#phCamera').addEventListener('change', ev => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; envoyer(f); });
  b.querySelector('#phFichier').addEventListener('change', ev => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; envoyer(f); });
  b.addEventListener('click', ev => {
    const x = ev.target.closest('[data-ph]');
    if(!x) return;
    const k = x.dataset.ph;
    if(k === 'annuler') fermer();
    else if(k === 'camera') b.querySelector('#phCamera').click();
    else if(k === 'fichier') b.querySelector('#phFichier').click();
    else if(k === 'mettre') mettre();
  });

  lirePhotothequeStudio().then(l => { photos = l; dessiner(); }).catch(e => {
    b.querySelector('#phGrille').innerHTML = '<div class="stPetit">⚠️ ' + echEcran(e.message) + '</div>';
  });
}

/* ⋯ une photo de la photothèque : son nom, son rangement, la retirer */
function ouvrirRangerPhoto(p, apres){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const b = document.createElement('div');
  b.className = 'modal';
  let rangement = p.categorie || 'autres';
  b.innerHTML = '<h3>📚 Cette photo</h3>' +
    '<div class="stPhoto stPhotoGrande"></div>' +
    '<label for="phRNom">Son nom</label><input type="text" id="phRNom" maxlength="60">' +
    '<label>Rangée dans</label><div class="stChips">' +
      RANGEMENTS_PHOTOS.map(([k, t]) => '<button type="button" class="btn ' + (k === rangement ? 'btn-primary' : 'btn-secondary') + '" data-rg="' + k + '">' + t + '</button>').join('') +
    '</div>' +
    '<div class="stPetit" style="margin-bottom:10px;">La retirer ne l’enlève pas des diapositives qui s’en servent.</div>' +
    '<div class="btn-row"><button type="button" class="btn btn-secondary stRouge" data-r="retirer">Retirer de la photothèque</button></div>' +
    '<div class="btn-row"><button type="button" class="btn btn-secondary" data-r="annuler">Annuler</button>' +
      '<button type="button" class="btn btn-primary" data-r="ok">💾 Enregistrer</button></div>';
  b.querySelector('.stPhotoGrande').style.backgroundImage = 'url("' + String(lienStudio(p.cle)).replace(/"/g, '%22') + '")';
  b.querySelector('#phRNom').value = p.nom || '';
  fond.appendChild(b);
  document.body.appendChild(fond);
  b.querySelectorAll('[data-rg]').forEach(x => x.addEventListener('click', () => {
    rangement = x.dataset.rg;
    b.querySelectorAll('[data-rg]').forEach(y => y.className = 'btn ' + (y === x ? 'btn-primary' : 'btn-secondary'));
  }));
  const envoyer = async garder => {
    try{
      const r = await appelPrep({ action: 'ecranPhotoRanger', cle: p.cle, titre: b.querySelector('#phRNom').value.trim(),
                                  categorie: rangement, bib: garder ? '1' : '0' });
      ((r && r.photos) || []).forEach(x => { liensStudio[x.cle] = x.lien; });
      fermerFond(fond);
      showToast(garder ? 'Photo rangée ✅' : 'Retirée de la photothèque ✅');
      apres((r && r.photos) || []);
    }catch(e){ showToast('Impossible : ' + e.message); }
  };
  b.addEventListener('click', async ev => {
    const x = ev.target.closest('[data-r]');
    if(!x) return;
    if(x.dataset.r === 'annuler') fermerFond(fond);
    else if(x.dataset.r === 'ok') envoyer(true);
    else if(x.dataset.r === 'retirer'){
      if(await confirmer('Retirer « ' + (p.nom || 'cette photo') + ' » de la photothèque ?')) envoyer(false);
    }
  });
}

function reduirePhotoStudio(fichier){
  return new Promise((ok, ko) => {
    const l = new FileReader();
    l.onerror = () => ko(new Error('Lecture de la photo impossible.'));
    l.onload = () => {
      const img = new Image();
      img.onerror = () => ko(new Error('Image illisible.'));
      img.onload = () => {
        for(const [m, q] of [[1800, 0.84], [1500, 0.78], [1200, 0.72], [1000, 0.66]]){
          const k = Math.min(1, m / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k);
          c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          const d = c.toDataURL('image/jpeg', q);
          if(d.length < 1400000) return ok(d);
        }
        ko(new Error('La photo reste trop lourde.'));
      };
      img.src = l.result;
    };
    l.readAsDataURL(fichier);
  });
}

/* ============================================================
   LE DESSIN DU STUDIO
   ============================================================ */
function formatsPermisStudio(){
  return studio.ou === 'accueil' ? ['accueil'] : studio.ou === 'vitrine' ? ['vitrine'] : ['accueil', 'vitrine'];
}

function dessinerStudio(){
  if(!studio) return;
  const z = document.getElementById('stStudio');
  if(!z) return;
  const permis = formatsPermisStudio();
  if(permis.indexOf(studio.format) === -1) studio.format = permis[0];
  const tel = telStudio();
  z.classList.toggle('stTel', tel);

  /* Les formes d'écran */
  const fm = z.querySelector('#stFormats');
  fm.innerHTML = permis.map(f => '<button type="button" class="btn ' + (f === studio.format ? 'btn-primary' : 'btn-secondary') +
      '" data-format="' + f + '">' + (f === 'accueil' ? '🏠 Accueil' : '🪟 Vitrine') + '</button>').join('') +
    '<button type="button" class="btn btn-secondary" data-act="zones">' + (studio.zones ? '▦ Zones' : '▢ Zones') + '</button>' +
    (tel ? '' : '<span class="info">' + (studio.format === 'vitrine'
      ? 'La vitrine est plus haute que large : même contenu, rangé autrement'
      : 'Hachuré : la place déjà prise sur la télé') + '</span>');
  fm.querySelectorAll('[data-format]').forEach(b => b.addEventListener('click', () => {
    studio.format = b.dataset.format; studio.choix = studio.choix; dessinerStudio();
  }));

  /* La diapositive elle-même, au dessin de la télé */
  const cadre = z.querySelector('#stCadre');
  const W = Compo.BASES[studio.format][0], H = Compo.BASES[studio.format][1];
  const cs = getComputedStyle(cadre.parentElement);
  const dispo = cadre.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const hauteurMax = tel ? innerHeight * 0.42 : innerHeight - 220;
  const largeur = Math.max(200, Math.floor(Math.min(dispo, hauteurMax * W / H)));
  cadre.style.width = largeur + 'px';
  cadre.style.height = Math.round(largeur * H / W) + 'px';
  studio.rendu = Compo.rendre(z.querySelector('#stRendu'), studio.c, studio.format,
    { largeur: largeur, edition: true, photo: lienStudio, qr: qrStudio });
  dessinerCalqueStudio();

  /* Les réglages : à droite sur grand écran, en bas sur téléphone */
  const panneau = z.querySelector('#stPanneau');
  const feuille = z.querySelector('#stFeuille');
  if(tel){
    panneau.innerHTML = '';
    const quoi = studio.choix ? 'element' : studio.feuille;
    feuille.style.display = quoi ? 'block' : 'none';
    feuille.innerHTML = quoi ? '<div class="poignee"></div><button type="button" class="stFermerFeuille" data-act="fermerFeuille">✕</button>' : '';
    if(quoi === 'element') feuille.appendChild(blocElementStudio());
    else if(quoi === 'fond') feuille.appendChild(blocFondStudio());
    else if(quoi === 'diffusion') feuille.appendChild(blocDiffusionStudio());
  }else{
    feuille.style.display = 'none';
    panneau.innerHTML = '';
    panneau.appendChild(studio.choix ? blocElementStudio() : blocAideStudio());
    panneau.appendChild(blocFondStudio());
    panneau.appendChild(blocDiffusionStudio());
  }
}

function rectangleStudio(id){
  const p = studio.c.pos[studio.format][id];
  if(!p) return null;
  const el = studio.rendu && studio.rendu.els[id];
  const h = p.h || (el ? el.offsetHeight : 80);
  return { x: p.x, y: p.y, w: p.w, h: h };
}

function dessinerCalqueStudio(){
  const cal = document.getElementById('stCalque');
  if(!cal || !studio.rendu) return;
  const s = studio.rendu.echelle;
  cal.innerHTML = '';
  const zones = studio.zones ? zonesDuStudio(studio.format) : [];
  zones.forEach(zn => {
    const d = document.createElement('div');
    d.className = 'stZone';
    d.style.left = zn.x * s + 'px'; d.style.top = zn.y * s + 'px';
    d.style.width = zn.w * s + 'px'; d.style.height = zn.h * s + 'px';
    d.innerHTML = '<span>' + zn.t + '</span>';
    cal.appendChild(d);
  });
  if(!studio.choix) return;
  const r = rectangleStudio(studio.choix);
  if(!r){
    const n = document.createElement('div');
    n.className = 'stAbsent';
    n.innerHTML = 'Cet élément n’est pas sur cet écran. <button type="button" class="btn btn-secondary" data-placer="1">➕ L’y mettre</button>';
    n.querySelector('[data-placer]').addEventListener('click', () => {
      memoriserStudio();
      const autre = studio.format === 'accueil' ? 'vitrine' : 'accueil';
      const p = studio.c.pos[autre][studio.choix] || { x: 300, y: 300, w: 400, h: 0 };
      const W = Compo.BASES[studio.format][0];
      studio.c.pos[studio.format][studio.choix] = { x: Math.min(p.x, W - p.w), y: Math.min(p.y, 600), w: Math.min(p.w, W - 40), h: p.h };
      dessinerStudio();
    });
    cal.appendChild(n);
    return;
  }
  const b = document.createElement('div');
  b.className = 'stSel';
  b.style.left = (r.x * s - 6) + 'px'; b.style.top = (r.y * s - 6) + 'px';
  b.style.width = (r.w * s + 12) + 'px'; b.style.height = (r.h * s + 12) + 'px';
  cal.appendChild(b);
  const e = studio.c.el.find(x => x.id === studio.choix);
  const poignees = e && e.type === 'texte' ? ['nw', 'ne', 'sw', 'se', 'e'] : ['nw', 'ne', 'sw', 'se', 'e', 's'];
  poignees.forEach(k => {
    const p = document.createElement('div');
    p.className = 'stPoignee p-' + k;
    p.dataset.poignee = k;
    const px = { nw: 0, ne: 1, sw: 0, se: 1, e: 1, s: 0.5 }[k], py = { nw: 0, ne: 0, sw: 1, se: 1, e: 0.5, s: 1 }[k];
    p.style.left = (r.x * s - 6 + px * (r.w * s + 12)) + 'px';
    p.style.top = (r.y * s - 6 + py * (r.h * s + 12)) + 'px';
    cal.appendChild(p);
  });
  if(!telStudio()){
    const t = document.createElement('div');
    t.className = 'stOutils';
    t.innerHTML = '<button type="button" data-act="modifier" class="on">✏️ Modifier</button>' +
      '<button type="button" data-act="dupliquer" title="Dupliquer">⧉</button>' +
      '<button type="button" data-act="devant" title="Devant">⬆️</button>' +
      '<button type="button" data-act="supprimer" title="Supprimer">🗑️</button>';
    const haut = r.y * s > 56;
    t.style.left = Math.max(4, r.x * s) + 'px';
    t.style.top = (haut ? r.y * s - 48 : (r.y + r.h) * s + 12) + 'px';
    cal.appendChild(t);
  }
  /* Sous un bloc de l'écran ? On le dit, en orange */
  const touche = zonesDuStudio(studio.format).find(zn =>
    r.x < zn.x + zn.w && r.x + r.w > zn.x && r.y < zn.y + zn.h && r.y + r.h > zn.y);
  if(touche){
    const a = document.createElement('div');
    a.className = 'stAlerte';
    a.textContent = '⚠️ Passe sous ' + { planning: 'le planning', qr: 'le QR', meteo: 'la météo', panneau: 'le texte fixe' }[touche.k] + ' : réduis-le ou déplace-le';
    a.style.left = Math.max(4, r.x * s) + 'px';
    a.style.top = Math.min((r.y + r.h) * s + 14, cal.clientHeight - 30) + 'px';
    cal.appendChild(a);
  }
}

/* ---------- Toucher, glisser, agrandir ---------- */
function pointeurStudio(ev){
  if(!studio || !studio.rendu) return;
  const s = studio.rendu.echelle;
  const poignee = ev.target.closest('[data-poignee]');
  if(ev.target.closest('.stOutils') || ev.target.closest('.stAbsent')) return;
  const elDom = poignee ? null : ev.target.closest('.cmpEl');
  const id = poignee ? studio.choix : (elDom ? elDom.dataset.id : '');
  if(!id){
    if(studio.choix){ studio.choix = ''; if(telStudio()) studio.feuille = ''; dessinerStudio(); }
    return;
  }
  ev.preventDefault();
  if(id !== studio.choix){
    studio.choix = id;
    if(telStudio()) studio.feuille = 'element';
    dessinerStudio();
  }
  const p = studio.c.pos[studio.format][id];
  if(!p) return;
  const e = studio.c.el.find(x => x.id === id);
  const r0 = rectangleStudio(id);
  const depart = { x: ev.clientX, y: ev.clientY, p: Object.assign({}, p), taille: e.taille, r: r0 };
  const W = Compo.BASES[studio.format][0], H = Compo.BASES[studio.format][1];
  let bouge = false, guide = [];
  const cible = ev.currentTarget;
  try{ cible.setPointerCapture(ev.pointerId); }catch(x){}

  const autres = studio.c.el.filter(x => x.id !== id).map(x => rectangleStudio(x.id)).filter(Boolean);
  const aimanter = (val, lignes, seuil) => {
    let mieux = null;
    lignes.forEach(l => { const d = Math.abs(val - l); if(d <= seuil && (!mieux || d < mieux.d)) mieux = { l: l, d: d }; });
    return mieux;
  };

  const bouger = e2 => {
    const dx = (e2.clientX - depart.x) / s, dy = (e2.clientY - depart.y) / s;
    if(!bouge && Math.abs(dx) * s < 3 && Math.abs(dy) * s < 3) return;
    if(!bouge){ bouge = true; memoriserStudio(); }
    const q = studio.c.pos[studio.format][id];
    guide = [];
    if(!poignee){
      let x = depart.p.x + dx, y = depart.p.y + dy;
      const w = depart.r.w, h = depart.r.h, seuil = 9 / s;
      const vx = [W / 2].concat(...autres.map(o => [o.x, o.x + o.w / 2, o.x + o.w]));
      const vy = [H / 2].concat(...autres.map(o => [o.y, o.y + o.h / 2, o.y + o.h]));
      let best = null;
      [[x, 0], [x + w / 2, w / 2], [x + w, w]].forEach(([v, d]) => {
        const a = aimanter(v, vx, seuil); if(a && (!best || a.d < best.d)) best = { d: a.d, x: a.l - d, l: a.l };
      });
      if(best){ x = best.x; guide.push(['v', best.l]); }
      let bestY = null;
      [[y, 0], [y + h / 2, h / 2], [y + h, h]].forEach(([v, d]) => {
        const a = aimanter(v, vy, seuil); if(a && (!bestY || a.d < bestY.d)) bestY = { d: a.d, y: a.l - d, l: a.l };
      });
      if(bestY){ y = bestY.y; guide.push(['h', bestY.l]); }
      q.x = Math.round(x); q.y = Math.round(y);
    }else{
      const k = poignee.dataset.poignee;
      if(k === 'e'){
        q.w = Math.max(20, Math.round(depart.p.w + dx));
      }else if(k === 's'){
        q.h = Math.max(10, Math.round((depart.p.h || depart.r.h) + dy));
      }else{
        const gauche = k === 'nw' || k === 'sw', haut = k === 'nw' || k === 'ne';
        const nw = Math.max(20, depart.p.w + (gauche ? -dx : dx));
        const f = nw / depart.p.w;
        q.w = Math.round(nw);
        if(depart.p.h) q.h = Math.round(depart.p.h * f);
        if(e.type === 'texte' || e.type === 'pastille') e.taille = Math.max(10, Math.min(320, Math.round(depart.taille * f)));
        if(gauche) q.x = Math.round(depart.p.x + depart.p.w - nw);
        if(haut) q.y = Math.round(depart.p.y + depart.r.h - depart.r.h * f);
      }
    }
    studio.rendu = Compo.rendre(document.getElementById('stRendu'), studio.c, studio.format,
      { largeur: parseInt(document.getElementById('stCadre').style.width, 10), edition: true, photo: lienStudio, qr: qrStudio });
    dessinerCalqueStudio();
    const cal = document.getElementById('stCalque');
    guide.forEach(([sens, v]) => {
      const g = document.createElement('div');
      g.className = 'stGuide ' + sens;
      if(sens === 'v') g.style.left = v * s + 'px'; else g.style.top = v * s + 'px';
      cal.appendChild(g);
    });
  };
  const lacher = () => {
    cible.removeEventListener('pointermove', bouger);
    cible.removeEventListener('pointerup', lacher);
    cible.removeEventListener('pointercancel', lacher);
    if(bouge){ studio.c = Compo.nettoyer(studio.c); dessinerStudio(); }
  };
  cible.addEventListener('pointermove', bouger);
  cible.addEventListener('pointerup', lacher);
  cible.addEventListener('pointercancel', lacher);
}

function clavierStudio(ev){
  if(!studio) return;
  const dansChamp = /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target && ev.target.tagName) || '');
  if((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !dansChamp){ ev.preventDefault(); actionStudio(ev.shiftKey ? 'refaire' : 'annuler'); return; }
  if((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y' && !dansChamp){ ev.preventDefault(); actionStudio('refaire'); return; }
  if(dansChamp || !studio.choix) return;
  if(ev.key === 'Delete' || ev.key === 'Backspace'){ ev.preventDefault(); actionStudio('supprimer'); return; }
  const pas = ev.shiftKey ? 20 : 4;
  const d = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] }[ev.key];
  if(d){
    ev.preventDefault();
    const p = studio.c.pos[studio.format][studio.choix];
    if(!p) return;
    memoriserStudio();
    p.x += d[0]; p.y += d[1];
    dessinerStudio();
  }
}

/* ============================================================
   LES RÉGLAGES DE CE QU'ON A TOUCHÉ
   ============================================================ */
function htmlCouleursStudio(actuelle){
  return '<div class="stCouleurs">' + STUDIO_CHARTE.map(c => '<button type="button" class="' +
      (String(actuelle || '').toLowerCase() === c.toLowerCase() ? 'on' : '') + '" data-c="' + c + '" style="background:' + c + '" title="' + c + '"></button>').join('') +
    '<label class="stAutreCouleur" title="N’importe quelle couleur">🎨<input type="color" value="' +
      (/^#[0-9a-f]{6}$/i.test(actuelle || '') ? actuelle : '#ffffff') + '"></label></div>';
}
function brancherCouleursStudio(zone, quand){
  zone.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => quand(b.dataset.c, true)));
  const i = zone.querySelector('input[type=color]');
  if(i){
    i.addEventListener('input', () => quand(i.value, false));
    i.addEventListener('change', () => quand(i.value, true));
  }
}
function changerStudio(fn, redessinerPanneau){
  memoriserStudio();
  fn();
  studio.c = Compo.nettoyer(studio.c);
  if(redessinerPanneau) dessinerStudio();
  else{
    studio.rendu = Compo.rendre(document.getElementById('stRendu'), studio.c, studio.format,
      { largeur: parseInt(document.getElementById('stCadre').style.width, 10), edition: true, photo: lienStudio, qr: qrStudio });
    dessinerCalqueStudio();
  }
}
/* Un changement continu (on tape, on tire un curseur) ne fait qu'une
   marche dans l'historique : la première frappe mémorise, les
   suivantes non, jusqu'à ce qu'on quitte le champ. */
function continuStudio(champ, fn){
  let premier = true;
  champ.addEventListener('input', () => {
    if(premier){ memoriserStudio(); premier = false; }
    fn(champ.value);
    studio.c = Compo.nettoyer(studio.c);
    studio.rendu = Compo.rendre(document.getElementById('stRendu'), studio.c, studio.format,
      { largeur: parseInt(document.getElementById('stCadre').style.width, 10), edition: true, photo: lienStudio, qr: qrStudio });
    dessinerCalqueStudio();
  });
  champ.addEventListener('change', () => { premier = true; });
}

function blocAideStudio(){
  const b = document.createElement('div');
  b.className = 'stBloc';
  b.innerHTML = '<h4>✏️ Modifier</h4><div class="stPetit">Touche un élément de la diapositive pour le modifier, glisse-le pour le déplacer, tire un coin pour l’agrandir.</div>';
  return b;
}

function blocElementStudio(){
  const e = studio.c.el.find(x => x.id === studio.choix);
  const b = document.createElement('div');
  b.className = 'stBloc stProps';
  if(!e){ b.innerHTML = '<div class="stPetit">Touche un élément.</div>'; return b; }
  const titres = { texte: '✏️ Le texte', pastille: '🏷️ La pastille', photo: '📷 La photo', picto: '😀 Le pictogramme', qr: '🔳 Le QR code', logo: 'EC Le logo', forme: '▭ La forme' };
  let h = '<h4>' + titres[e.type] + '</h4>';
  const range = (k, min, max, v, lib) => '<label>' + lib + '</label><input class="stCurseur" type="range" data-k="' + k + '" min="' + min + '" max="' + max + '" step="1" value="' + v + '">';
  if(e.type === 'texte'){
    h += '<textarea rows="3" data-k="txt"></textarea>' +
      range('taille', 14, 220, e.taille, 'Taille') +
      '<label>Couleur</label><div data-couleur="couleur">' + htmlCouleursStudio(e.couleur) + '</div>' +
      '<div class="stRang"><button type="button" class="btn ' + (e.gras ? 'btn-primary' : 'btn-secondary') + '" data-bascule="gras" title="Gras"><b>B</b></button>' +
      [['left', '⬅︎'], ['center', '☰'], ['right', '➡︎']].map(([a, t]) => '<button type="button" class="btn ' + (e.align === a ? 'btn-primary' : 'btn-secondary') + '" data-align="' + a + '">' + t + '</button>').join('') +
      '<button type="button" class="btn ' + (e.maj ? 'btn-primary' : 'btn-secondary') + '" data-bascule="maj" title="Majuscules">Aa</button>' +
      '<button type="button" class="btn ' + (e.ombre ? 'btn-primary' : 'btn-secondary') + '" data-bascule="ombre" title="Ombre">🌑</button></div>';
  }else if(e.type === 'pastille'){
    const n = String(e.txt).split('\n').length;
    h += '<textarea rows="3" data-k="txt"></textarea>' +
      '<div class="stPetit">Une ligne par ligne de la pastille.</div>' +
      range('taille', 14, 160, e.taille, 'Taille') +
      '<label>Une ligne en grand</label><div class="stChips">' + [-1].concat(Array.from({ length: Math.min(n, 4) }, (_, i) => i))
        .map(i => '<button type="button" class="btn ' + (e.grand === i ? 'btn-primary' : 'btn-secondary') + '" data-grand="' + i + '">' + (i < 0 ? 'Aucune' : 'La ' + (i + 1) + '<sup>e</sup>') + '</button>').join('') + '</div>' +
      '<label>Le fond</label><div data-couleur="fond">' + htmlCouleursStudio(e.fond) + '</div>' +
      '<label>Le texte</label><div data-couleur="couleur">' + htmlCouleursStudio(e.couleur) + '</div>' +
      '<label>La forme</label>' + htmlFormesStudio(e.rayon) + range('rot', -20, 20, e.rot, 'Pencher');
  }else if(e.type === 'photo'){
    h += '<button type="button" class="btn btn-secondary" data-photo="1">📷 ' + (e.cle ? 'Changer la photo' : 'Choisir une photo') + '</button>' +
      '<label>Les coins</label>' + htmlFormesStudio(e.rayon, true) +
      '<label>Le cadre</label><div class="stChips"><button type="button" class="btn ' + (!e.cadre ? 'btn-primary' : 'btn-secondary') + '" data-sanscadre="1">Sans</button></div>' +
      '<div data-couleur="cadre">' + htmlCouleursStudio(e.cadre) + '</div>';
  }else if(e.type === 'picto'){
    h += '<div class="stPictos">' + STUDIO_PICTOS.map(p => '<button type="button" class="' + (p === e.txt ? 'on' : '') + '" data-picto="' + p + '">' + p + '</button>').join('') + '</div>' +
      range('rot', -30, 30, e.rot, 'Pencher');
  }else if(e.type === 'qr'){
    h += '<div class="stPetit">Le QR code de Saint-Brieuc. 🔒 Il reste noir sur blanc, avec sa marge blanche : c’est ce qui permet aux téléphones de le lire. Garde-le assez grand.</div>';
  }else if(e.type === 'logo'){
    h += '<label>La couleur du nom</label><div data-couleur="couleur">' + htmlCouleursStudio(e.couleur) + '</div>';
  }else if(e.type === 'forme'){
    h += '<label>La couleur</label><div data-couleur="fond">' + htmlCouleursStudio(e.fond) + '</div>' +
      '<label>En dégradé vers</label><div class="stChips"><button type="button" class="btn ' + (!e.fond2 ? 'btn-primary' : 'btn-secondary') + '" data-sansdegrade="1">Sans dégradé</button></div>' +
      '<div data-couleur="fond2">' + htmlCouleursStudio(e.fond2) + '</div>' +
      '<label>Les coins</label>' + htmlFormesStudio(e.rayon, true) +
      range('opacite', 10, 100, Math.round(e.opacite * 100), 'Opacité') + range('rot', -45, 45, e.rot, 'Pencher');
  }
  h += '<div class="stRang" style="margin-top:10px;">' +
    '<button type="button" class="btn btn-secondary" data-act="devant">⬆️ Devant</button>' +
    '<button type="button" class="btn btn-secondary" data-act="derriere">⬇️ Derrière</button>' +
    '<button type="button" class="btn btn-secondary" data-act="dupliquer">⧉</button>' +
    '<button type="button" class="btn btn-secondary stRouge" data-act="supprimer" title="Supprimer">🗑️</button></div>';
  b.innerHTML = h;

  const t = b.querySelector('textarea[data-k="txt"]');
  if(t){ t.value = e.txt; continuStudio(t, v => { e.txt = v; }); }
  b.querySelectorAll('input[type=range][data-k]').forEach(r => continuStudio(r, v => {
    const k = r.dataset.k;
    e[k] = k === 'opacite' ? Number(v) / 100 : Number(v);
  }));
  b.querySelectorAll('[data-couleur]').forEach(z => brancherCouleursStudio(z, (c, fin) => {
    const k = z.dataset.couleur;
    if(fin) changerStudio(() => { e[k] = c; }, true);
    else{ e[k] = c; studio.rendu = Compo.rendre(document.getElementById('stRendu'), studio.c, studio.format,
      { largeur: parseInt(document.getElementById('stCadre').style.width, 10), edition: true, photo: lienStudio, qr: qrStudio }); }
  }));
  b.querySelectorAll('[data-bascule]').forEach(x => x.addEventListener('click', () => changerStudio(() => { e[x.dataset.bascule] = !e[x.dataset.bascule]; }, true)));
  b.querySelectorAll('[data-align]').forEach(x => x.addEventListener('click', () => changerStudio(() => { e.align = x.dataset.align; }, true)));
  b.querySelectorAll('[data-grand]').forEach(x => x.addEventListener('click', () => changerStudio(() => { e.grand = Number(x.dataset.grand); }, true)));
  b.querySelectorAll('[data-rayon]').forEach(x => x.addEventListener('click', () => changerStudio(() => { e.rayon = Number(x.dataset.rayon); }, true)));
  b.querySelectorAll('[data-picto]').forEach(x => x.addEventListener('click', () => changerStudio(() => { e.txt = x.dataset.picto; }, true)));
  const sc = b.querySelector('[data-sanscadre]');
  if(sc) sc.addEventListener('click', () => changerStudio(() => { e.cadre = ''; }, true));
  const sd = b.querySelector('[data-sansdegrade]');
  if(sd) sd.addEventListener('click', () => changerStudio(() => { e.fond2 = ''; }, true));
  const ph = b.querySelector('[data-photo]');
  if(ph) ph.addEventListener('click', () => choisirPhotoStudio(cle => { e.cle = cle; studio.c = Compo.nettoyer(studio.c); dessinerStudio(); }));
  return b;
}

function htmlFormesStudio(rayon, photo){
  const choix = photo ? [[0, 'Droits'], [24, 'Arrondis'], [80, 'Très arrondis'], [2000, 'Rond']] : [[0, 'Droits'], [14, 'Doux'], [34, 'Arrondis'], [500, 'Pilule']];
  return '<div class="stChips">' + choix.map(([r, t]) => '<button type="button" class="btn ' +
    (Number(rayon) === r ? 'btn-primary' : 'btn-secondary') + '" data-rayon="' + r + '">' + t + '</button>').join('') + '</div>';
}

/* ---------- Le fond ---------- */
function blocFondStudio(){
  const f = studio.c.fond;
  const b = document.createElement('div');
  b.className = 'stBloc';
  b.innerHTML = '<h4>🖼️ Le fond</h4>' +
    '<div class="stRang">' + [['couleur', 'Couleur'], ['degrade', 'Dégradé'], ['photo', '📷 Photo']]
      .map(([k, t]) => '<button type="button" class="btn ' + (f.type === k ? 'btn-primary' : 'btn-secondary') + '" data-fond="' + k + '">' + t + '</button>').join('') + '</div>' +
    (f.type === 'couleur' ? '<div data-couleur="c1" style="margin-top:8px;">' + htmlCouleursStudio(f.c1) + '</div>' : '') +
    (f.type === 'degrade' ? '<div class="stCouleurs" style="margin-top:8px;">' + STUDIO_DEGRADES.map(([a, z, ang], i) =>
        '<button type="button" class="' + (f.c1 === a && f.c2 === z ? 'on' : '') + '" data-degrade="' + i + '" style="background:linear-gradient(' + ang + 'deg,' + a + ',' + z + ')"></button>').join('') + '</div>' +
      '<label>De</label><div data-couleur="c1">' + htmlCouleursStudio(f.c1) + '</div>' +
      '<label>Vers</label><div data-couleur="c2">' + htmlCouleursStudio(f.c2) + '</div>' : '') +
    (f.type === 'photo' ? '<button type="button" class="btn btn-secondary" data-fondphoto="1" style="margin-top:8px;">📷 ' + (f.cle ? 'Changer la photo' : 'Choisir une photo') + '</button>' +
      '<label>Assombrir</label><input class="stCurseur" type="range" min="0" max="85" value="' + Math.round(f.assombrir * 100) + '" data-assombrir="1">' +
      '<div class="stPetit">Plus c’est sombre, mieux le texte se lit.</div>' : '');
  b.querySelectorAll('[data-fond]').forEach(x => x.addEventListener('click', () => {
    if(x.dataset.fond === 'photo' && !f.cle){
      changerStudio(() => { studio.c.fond.type = 'photo'; }, true);
      choisirPhotoStudio(cle => { studio.c.fond.cle = cle; studio.c = Compo.nettoyer(studio.c); dessinerStudio(); });
      return;
    }
    changerStudio(() => { studio.c.fond.type = x.dataset.fond; }, true);
  }));
  b.querySelectorAll('[data-degrade]').forEach(x => x.addEventListener('click', () => changerStudio(() => {
    const [a, z, ang] = STUDIO_DEGRADES[Number(x.dataset.degrade)];
    Object.assign(studio.c.fond, { c1: a, c2: z, angle: ang });
  }, true)));
  b.querySelectorAll('[data-couleur]').forEach(z => brancherCouleursStudio(z, (c, fin) => {
    if(fin) changerStudio(() => { studio.c.fond[z.dataset.couleur] = c; }, true);
    else{ studio.c.fond[z.dataset.couleur] = c; studio.rendu = Compo.rendre(document.getElementById('stRendu'), studio.c, studio.format,
      { largeur: parseInt(document.getElementById('stCadre').style.width, 10), edition: true, photo: lienStudio, qr: qrStudio }); }
  }));
  const fp = b.querySelector('[data-fondphoto]');
  if(fp) fp.addEventListener('click', () => choisirPhotoStudio(cle => { studio.c.fond.cle = cle; studio.c = Compo.nettoyer(studio.c); dessinerStudio(); }));
  const as = b.querySelector('[data-assombrir]');
  if(as) continuStudio(as, v => { studio.c.fond.assombrir = Number(v) / 100; });
  return b;
}

/* ---------- La diffusion : où, combien de temps, comment elle arrive ---------- */
function blocDiffusionStudio(){
  const b = document.createElement('div');
  b.className = 'stBloc';
  b.innerHTML = '<h4>📺 La diffusion</h4>' +
    '<label for="stOu">Sur quel écran</label><select id="stOu">' +
      [['les-deux', '🏠🪟 Les deux'], ['accueil', '🏠 Accueil seulement'], ['vitrine', '🪟 Vitrine seulement']]
        .map(([k, t]) => '<option value="' + k + '"' + (studio.ou === k ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
    '<label for="stDuree">Durée à l’écran</label><select id="stDuree">' +
      STUDIO_DUREES.map(([k, t]) => '<option value="' + k + '"' + (Number(studio.duree) === k ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
    '<label>La transition pour arriver</label><div class="stTrans">' +
      STUDIO_TRANSITIONS.map(([k, t]) => '<button type="button" class="btn ' + (studio.c.transition === k ? 'btn-primary' : 'btn-secondary') + '" data-trans="' + k + '">' + t + '</button>').join('') + '</div>' +
    '<label>L’arrivée des éléments</label><div class="stChips">' +
      '<button type="button" class="btn ' + (studio.c.arrivee !== 'unparun' ? 'btn-primary' : 'btn-secondary') + '" data-arrivee="ensemble">Tout ensemble</button>' +
      '<button type="button" class="btn ' + (studio.c.arrivee === 'unparun' ? 'btn-primary' : 'btn-secondary') + '" data-arrivee="unparun">Un par un</button></div>' +
    '<div class="duo"><div><label for="stDu">À partir du</label><input type="date" id="stDu" value="' + (studio.du || '') + '"></div>' +
      '<div><label for="stAu">Jusqu’au</label><input type="date" id="stAu" value="' + (studio.au || '') + '"></div></div>' +
    '<div class="stPetit">Sans dates, elle passe en permanence.</div>';
  b.querySelector('#stOu').addEventListener('change', ev => { studio.ou = ev.target.value; studio.modifie = true; dessinerStudio(); });
  b.querySelector('#stDuree').addEventListener('change', ev => { studio.duree = Number(ev.target.value); studio.modifie = true; });
  b.querySelector('#stDu').addEventListener('change', ev => { studio.du = ev.target.value; studio.modifie = true; });
  b.querySelector('#stAu').addEventListener('change', ev => { studio.au = ev.target.value; studio.modifie = true; });
  b.querySelectorAll('[data-trans]').forEach(x => x.addEventListener('click', () => changerStudio(() => { studio.c.transition = x.dataset.trans; }, true)));
  b.querySelectorAll('[data-arrivee]').forEach(x => x.addEventListener('click', () => changerStudio(() => { studio.c.arrivee = x.dataset.arrivee; }, true)));
  return b;
}

/* ============================================================
   ▶️ VOIR EN GRAND — comme sur la télé, avec son arrivée
   ============================================================ */
function voirEnGrandStudio(){
  const o = document.createElement('div');
  o.className = 'stGrandEcran';
  o.innerHTML = '<div class="stGrandScene"></div><div class="stGrandAide">Touche pour revenir</div>';
  document.body.appendChild(o);
  const sc = o.querySelector('.stGrandScene');
  const W = Compo.BASES[studio.format][0], H = Compo.BASES[studio.format][1];
  const l = Math.min(innerWidth, innerHeight * W / H);
  sc.style.width = l + 'px';
  sc.style.height = (l * H / W) + 'px';
  sc.classList.add('anim', 'e-' + (studio.c.transition || 'fondu'));
  Compo.rendre(sc, studio.c, studio.format, { photo: lienStudio, qr: qrStudio, arrivee: true, delai: 0.6 });
  o.addEventListener('click', () => o.remove());
}

/* ============================================================
   💾 ENREGISTRER, ⭐ GARDER COMME MODÈLE
   ============================================================ */
function nomDuStudio(){
  const n = String((document.getElementById('stNom') || {}).value || studio.c.nom || '').trim();
  if(n) return n.slice(0, 80);
  const t = studio.c.el.find(e => e.type === 'texte' && String(e.txt).trim());
  return t ? String(t.txt).split('\n')[0].trim().slice(0, 80) : 'Diapositive';
}

async function enregistrerStudio(){
  const nom = nomDuStudio();
  studio.c.nom = nom;
  const c = Compo.nettoyer(studio.c);
  const json = JSON.stringify(c);
  if(json.length > 40000){ showToast('Diapositive trop chargée : retire quelques éléments.'); return; }
  if(studio.du && studio.au && studio.au < studio.du){ showToast('La date de fin est avant la date de début.'); return; }
  const bouton = document.querySelector('#stStudio [data-act="enregistrer"]');
  if(bouton){ bouton.disabled = true; bouton.textContent = 'Enregistrement…'; }
  const d = studio.d;
  try{
    await appelPrep({
      action: 'ecranSet', id: d ? d.id : '', type: 'compo', titre: nom, contenu: json, image: '',
      ou: studio.ou, duree: studio.duree,
      actif: d ? (d.actif ? 'oui' : 'non') : 'oui',
      du: studio.du, au: studio.au, ordre: d ? d.ordre : 0, par: ACCES.moniteur || ''
    });
    studio.modifie = false;
    showToast(d ? 'Diapositive modifiée ✅' : 'Diapositive ajoutée ✅');
    await fermerStudio();
    await afficherEcran();
    rangerPhotosStudio();
  }catch(e){
    showToast('Impossible : ' + e.message);
    if(bouton){ bouton.disabled = false; bouton.textContent = '💾 Enregistrer'; }
  }
}

/* Les photos qui ne servent plus à aucune diapositive partent du
   compartiment (le Worker garde aussi celles des modèles, et celles
   de moins d'un jour : une diapositive pas encore enregistrée). */
function rangerPhotosStudio(){
  try{
    const cles = [];
    (typeof diaposEcran !== 'undefined' ? diaposEcran : []).forEach(d => {
      if(d.type === 'compo') Compo.photos(compoDeLaDiapo(d)).forEach(k => cles.push(k));
    });
    appelPrep({ action: 'ecranPhotosRanger', utilisees: cles }).catch(() => {});
  }catch(e){}
}

function garderCommeModele(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  fond.style.zIndex = '200';
  const b = document.createElement('div');
  b.className = 'modal';
  b.innerHTML = '<h3>⭐ Garder comme modèle</h3>' +
    '<label for="stModeleNom">Le nom du modèle</label><input type="text" id="stModeleNom" maxlength="60">' +
    '<div class="stPetit" style="margin-bottom:12px;">Il apparaîtra dans « ⭐ Tes modèles » quand tu crées une diapositive.</div>' +
    '<div class="btn-row"><button type="button" class="btn btn-secondary" data-m="non">Annuler</button>' +
    '<button type="button" class="btn btn-primary" data-m="oui">⭐ Garder</button></div>';
  fond.appendChild(b);
  document.body.appendChild(fond);
  const champ = b.querySelector('#stModeleNom');
  champ.value = nomDuStudio();
  setTimeout(() => champ.focus(), 50);
  b.querySelector('[data-m="non"]').addEventListener('click', () => fermerFond(fond));
  b.querySelector('[data-m="oui"]').addEventListener('click', async ev => {
    const nom = champ.value.trim();
    if(!nom){ showToast('Donne-lui un nom.'); return; }
    ev.target.disabled = true;
    try{
      const c = Compo.nettoyer(Object.assign({}, studio.c, { nom: nom }));
      await appelPrep({ action: 'ecranModelePoser', titre: nom, compo: JSON.stringify(c) });
      fermerFond(fond);
      showToast('⭐ Modèle gardé ✅');
    }catch(e){ showToast('Impossible : ' + e.message); ev.target.disabled = false; }
  });
}

/* ============================================================
   ⚙️ RÉGLAGES › LES TRANSITIONS DU CARROUSEL
   ============================================================ */
let transitionEcran = null;
function blocTransitionsEcran(){
  const z = document.createElement('div');
  z.className = 'afQrBloc stTransBloc';
  const t = transitionEcran || { transition: 'fondu', transitionDuree: 'normale' };
  z.innerHTML = '<div><strong>✨ Les transitions</strong>' +
    '<div class="afResume" style="margin:4px 0 8px;">Le passage d’une diapositive à l’autre, pour tout le carrousel. Une diapositive du studio peut avoir la sienne.</div></div>' +
    '<div class="stTrans">' + [['fondu', '✨ Fondu'], ['glisser', '⬅️ Glisser'], ['monter', '⬆️ Monter'], ['zoom', '🔍 Zoom'], ['volet', '🪟 Volet'], ['hasard', '🎲 Au hasard']]
      .map(([k, l]) => '<button type="button" class="btn ' + (t.transition === k ? 'btn-primary' : 'btn-secondary') + '" data-cle="transition" data-val="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<label>Durée de la transition</label><div class="stChips">' + [['rapide', 'Rapide'], ['normale', 'Normale'], ['lente', 'Lente']]
      .map(([k, l]) => '<button type="button" class="btn ' + (t.transitionDuree === k ? 'btn-primary' : 'btn-secondary') + '" data-cle="transitionDuree" data-val="' + k + '">' + l + '</button>').join('') + '</div>';
  z.querySelectorAll('[data-cle]').forEach(b => b.addEventListener('click', async () => {
    try{
      const r = await appelPrep({ action: 'ecranReglagePoser', cle: b.dataset.cle, valeur: b.dataset.val });
      transitionEcran = (r && r.transition) || transitionEcran;
      showToast('Transition réglée ✅');
      dessinerOngletEcran();
    }catch(e){ showToast('Impossible : ' + e.message); }
  }));
  return z;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-studio.js'] = true;
