/* Déployé le 10/11/2026 à 13:42 — v1403 */
/* ============================================================
   ec-verifs3d.js — 🧰 LES VÉRIFICATIONS EXTÉRIEURES, EN 3D

   David, le 9 novembre (schéma « Vérifications ») : chacun son
   modèle (une Q3 et une A3) ; l'intérieur viendra de ses photos
   (« une photo qui bouge »), pas d'une 3D dessinée. Le 10 : « tu
   peux préparer les prochaines livraisons ».

   Le jeu de l'élève (eleve.html, 🧰 Mes vérifs) pose une question
   EXTÉRIEURE de la banque (« Montrez où s'effectue le remplissage du
   liquide de refroidissement ») ; l'élève fait tourner SA voiture
   (A3 ou Q3, d'après la voiture qu'il a choisie), ouvre le capot s'il
   le faut, et touche le bon endroit. Ce fichier fournit la voiture,
   les gestes et la table « question → pièces » ; le jeu, lui, compte
   les points comme ses autres modes (jvNoter, jvResultat).

   ⚠️ LA TABLE EST ÉCRITE ICI, UNE FOIS. Seules les questions qui se
   MONTRENT dehors y sont (40 des 50 vérifications extérieures) ; une
   ampoule à changer, la plaque des pressions ou le triangle n'ont pas
   de place sur un modèle extérieur et restent aux autres modes.
   « Côté trottoir », c'est la droite (en France).

   creerVoitureVerifs3D(hote, { modele, immat, surPiece(part) })
   → { cibles(n), ouvrirCapot(oui), montrer(parts), eclair(part, ok),
       recentrer(), capotOuvert(), detruire() }
   ============================================================ */

const VERIFS3D_CIBLES = {
  2: ['laveGlace'], 50: ['laveGlace'],
  4: ['pneu', 'temoinUsure'], 68: ['pneu', 'temoinUsure'],
  6: ['plaque'],
  8: ['frein'], 70: ['frein'],
  10: ['balai'],
  12: ['refroidissement'], 72: ['refroidissement'],
  14: ['clignoD'], 74: ['clignoD'],
  16: ['antibrouillard'],
  18: ['clignoD', 'clignoG'], 76: ['clignoD', 'clignoG'],
  20: ['phare'], 78: ['phare'], 26: ['phare'], 82: ['phare'], 52: ['phare'], 92: ['phare'],
  22: ['jauge'], 80: ['jauge'],
  24: ['batterie'],
  28: ['catadioptre'],
  30: ['phare', 'feuAR'],
  32: ['temoinUsure'], 84: ['temoinUsure'],
  34: ['trappe'],
  36: ['huileRemplissage'],
  40: ['eclairagePlaque'],
  42: ['securiteEnfant'], 88: ['securiteEnfant'],
  44: ['recul'],
  46: ['feuAR'], 90: ['feuAR'],
  48: ['capot'], 64: ['capot'],
  60: ['hayon'], 62: ['hayon'],
  66: ['gicleur'], 100: ['gicleur']
};
/* Ce qui est sous le capot : pour l'atteindre, il faut d'abord l'ouvrir */
const VERIFS3D_SOUS_CAPOT = ['laveGlace', 'frein', 'refroidissement', 'jauge', 'batterie', 'huileRemplissage', 'moteur', 'baie'];
const VERIFS3D_NOMS = {
  capot: 'le capot', caisse: 'la carrosserie', pavillon: 'le toit', parebrise: 'le pare-brise', lunette: 'la lunette arrière',
  vitre: 'une vitre', pneu: 'un pneu', jante: 'une jante', phare: 'un phare (feux de route, de croisement, de position, diurnes)',
  clignoD: 'un clignotant droit (côté trottoir)', clignoG: 'un clignotant gauche', retro: 'un rétroviseur',
  feuAR: 'un feu arrière (position, stop)', catadioptre: 'un catadioptre (dispositif réfléchissant)',
  antibrouillard: 'le feu de brouillard arrière', recul: 'le feu de recul', plaque: 'une plaque d’immatriculation',
  eclairagePlaque: 'l’éclairage de la plaque arrière', trappe: 'la trappe à carburant', balai: 'un balai d’essuie-glace',
  gicleur: 'un gicleur de lave-glace', temoinUsure: 'le témoin d’usure du pneu', hayon: 'le hayon (le coffre)',
  securiteEnfant: 'la sécurité enfant', baie: 'le compartiment moteur', moteur: 'le moteur', huileRemplissage: 'le bouchon de remplissage d’huile',
  jauge: 'la jauge d’huile', refroidissement: 'le vase d’expansion (liquide de refroidissement)', frein: 'le bocal du liquide de frein',
  laveGlace: 'le bouchon du lave-glace', batterie: 'la batterie'
};
function verifs3dQuestions(){ return Object.keys(VERIFS3D_CIBLES).map(Number); }

async function creerVoitureVerifs3D(hote, o){
  await EC3D.charger();
  if(EC3D.scans) await EC3D.scans(false, 10000);   /* 📷 v1403 — le Q3 scanné */
  const T = EC3D.T;
  hote.innerHTML = '';
  let touche = false, ouvert = false, angle = 0, angleVise = 0;
  const scene = EC3D.Scene(hote, {
    mode: 'orbite', fov: 36, pres: 0.05, loin: 200, r: 7.6, phi: 1.18, theta: 2.1, rMin: 2.6, rMax: 12, phiMin: 0.15, phiMax: 1.5,
    fond: 0xE9E7E1, hemi: 0.58, dir: 0.8,
    visible: () => document.visibilityState === 'visible',
    surGeste: () => { touche = true; },
    toucher: (nx, ny) => {
      const h = scene.viser(nx, ny, [v.inter]);
      if(!h.length) return;
      let ob = h[0].object; while(ob && !ob.userData.part) ob = ob.parent;
      const part = ob ? ob.userData.part : 'caisse';
      if(o.surPiece) o.surPiece(part, h[0].point.clone());
    }
  });
  scene.cible.set(0, 0.7, 0);
  const v = EC3D.voiture3D({ modele: o.modele || 'a3', immat: o.immat || '', complet: true, capot: true, couleur: 0xDADBD5 });
  scene.scene.add(v.groupe);
  const sol = new T.Mesh(new T.CircleGeometry(4.2, 48), new T.MeshLambertMaterial({ color: 0xBDBDBD, transparent: true, opacity: 0.35 }));
  sol.rotation.x = -Math.PI / 2; sol.position.y = -0.002; scene.scene.add(sol);

  /* un éclat de couleur sur une pièce (vert : juste ; rouge : non) */
  const allumees = [];
  function teinter(part, couleur, duree){
    (v.parts[part] || []).forEach(m => {
      if(!m.material) return;
      if(!m.userData.matOrigine){ m.userData.matOrigine = m.material; m.material = m.material.clone(); }
      /* 📷 v1403 — une ZONE (invisible, posée sur le scan ou sur une pièce
         dessinée) : elle apparaît, en couleur, le temps de l'éclat */
      if(m.material.transparent && m.material.opacity < 0.05){ m.material.opacity = 0.62; m.material.color = new T.Color(couleur); m.renderOrder = 4; }
      else if(m.material.emissive){ m.material.emissive = new T.Color(couleur); m.material.emissiveIntensity = 0.9; }
      else if(m.material.color) m.material.color = new T.Color(couleur);   /* une plaque (sans lumière propre) : on la teinte */
      allumees.push({ m: m, fin: duree ? performance.now() + duree : 0 });
    });
  }
  function eteindre(m){ if(m.userData.matOrigine){ m.material.dispose(); m.material = m.userData.matOrigine; delete m.userData.matOrigine; m.renderOrder = 0; } }
  function toutEteindre(){ allumees.splice(0).forEach(x => eteindre(x.m)); }

  /* l'endroit d'une pièce, pour y emmener la caméra */
  /* une pièce qui existe en plusieurs exemplaires (4 pneus, 2 phares…) :
     celle qui est le plus près de la caméra */
  function ouEst(part){
    const l = v.parts[part] || [];
    if(!l.length) return null;
    let best = null, dmin = Infinity;
    l.forEach(m => {
      const p = new T.Vector3(), b = new T.Box3().setFromObject(m);
      b.getCenter(p);
      const d = p.distanceToSquared(scene.cam.position);
      if(d < dmin){ dmin = d; best = p; }
    });
    return best;
  }
  function viserLaPiece(part){
    const p = ouEst(part);
    if(!p) return;
    touche = true;
    const th = Math.atan2(p.x, p.z);
    const dessus = VERIFS3D_SOUS_CAPOT.indexOf(part) !== -1;
    scene.voler(new T.Vector3(p.x * 0.6, Math.max(0.5, p.y), p.z * 0.6), dessus ? 4.8 : 5.4, dessus ? 0.72 : 1.18, th, 0.9);
  }

  scene.demarrer(dt => {
    if(!touche && !scene.vol) scene.theta += 0.18 * dt;
    /* le capot s'ouvre et se ferme en douceur */
    angle += (angleVise - angle) * Math.min(1, dt * 6);
    if(v.pivot) v.pivot.rotation.z = angle;
    const t = performance.now();
    for(let i = allumees.length - 1; i >= 0; i--){
      const x = allumees[i];
      if(x.fin && t > x.fin){ eteindre(x.m); allumees.splice(i, 1); }
      else if(!x.fin && x.m.material && x.m.material.emissiveIntensity != null) x.m.material.emissiveIntensity = 0.55 + 0.45 * Math.sin(t / 180);
      else if(!x.fin && x.m.material && x.m.material.transparent && x.m.userData.matOrigine && x.m.userData.matOrigine.opacity < 0.05) x.m.material.opacity = 0.45 + 0.25 * Math.sin(t / 180);
    }
  });

  return {
    cibles: n => VERIFS3D_CIBLES[n] || [],
    capotOuvert: () => ouvert,
    ouvrirCapot(oui){ ouvert = !!oui; angleVise = ouvert ? 1.12 : 0; },
    /* la bonne réponse, montrée : elle brille, et la caméra y va */
    montrer(parts){
      toutEteindre();
      const p = parts[0];
      if(VERIFS3D_SOUS_CAPOT.indexOf(p) !== -1 && !ouvert){ ouvert = true; angleVise = 1.12; }
      parts.forEach(x => teinter(x, 0x57D97E, 0));
      viserLaPiece(p);
    },
    eclair(part, ok){ teinter(part, ok ? 0x57D97E : 0xFF5C33, 700); },
    recentrer(){ toutEteindre(); touche = false; ouvert = false; angleVise = 0; scene.voler(new T.Vector3(0, 0.7, 0), 7.6, 1.15, scene.theta, 0.8); },
    detruire(){ scene.detruire(); }
  };
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-verifs3d.js'] = true;
