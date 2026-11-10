/* Déployé le 10/11/2026 à 11:56 — v1400 */
/* ============================================================
   ec-carro3d.js — 🧊 LA CARROSSERIE EN 3D

   David, le 9 novembre (schéma « Carrosserie ») : un modèle par
   gabarit, qui RESSEMBLE à une A3 ou à un Q3, tous blancs. Le 10 :
   « vas-y » (après le parc et le trajet).

   ⚠️ LA DONNÉE NE CHANGE PAS — c'est la règle du 8 septembre (voir
   ec-carrosserie.js) : un dommage reste UNE VUE ET DEUX POURCENTAGES.
   La 3D n'est qu'une autre façon de les montrer et de les poser :
   · pour montrer un dommage, on lance un rayon depuis le côté de sa
     vue, à ses pourcentages, et la pastille se pose là où il touche
     la carrosserie ;
   · pour en poser un, le point touché sur la carrosserie redevient
     une vue (le côté qu'il regarde) et deux pourcentages — ceux que
     les vues à plat montrent au même endroit.
   Changer de modèle (les scans de David remplaceront ces volumes)
   ne déplace donc jamais un dommage enregistré.

   Seulement pour les voitures (A3, Q3) : les deux-roues et les
   remorques gardent leurs vues à plat.

   vueCarrosserie3D(hote, v, liste, { ouvrir(d), nouveau({vue,x,y}) })
   → { detruire() }
   ============================================================ */

let carro3dCourante = null;

async function vueCarrosserie3D(hote, v, liste, o){
  if(carro3dCourante){ try{ carro3dCourante.detruire(); }catch(e){} carro3dCourante = null; }
  await EC3D.charger();
  const T = EC3D.T;
  const modele = (typeof gabaritDuVehicule === 'function' && gabaritDuVehicule(v) === GABARITS.q3) ? 'q3' : 'a3';
  hote.innerHTML = '';
  let touche = false;
  const scene = EC3D.Scene(hote, {
    mode: 'orbite', fov: 35, pres: 0.05, loin: 200, r: 8.4, phi: 1.12, theta: 2.35, rMin: 3.6, rMax: 14, phiMin: 0.2, phiMax: 1.52,
    fond: 0xE9E7E1, hemi: 0.75, dir: 0.85,
    visible: () => document.visibilityState === 'visible',
    surGeste: () => { touche = true; },
    toucher: (nx, ny) => {
      let h = scene.viser(nx, ny, marques.map(m => m.boule));
      if(h.length){ const d = h[0].object.userData.d; if(d && o.ouvrir) o.ouvrir(d); return; }
      h = scene.viser(nx, ny, [voit.inter]);
      if(h.length) proposer(h[0]); else fermer();
    }
  });
  scene.cible.set(0, 0.75, 0);
  const voit = EC3D.voiture3D({ modele: modele, immat: v.immat || '' });
  scene.scene.add(voit.groupe);
  const sol = new T.Mesh(new T.CircleGeometry(4.2, 48), new T.MeshLambertMaterial({ color: 0xBDBDBD, transparent: true, opacity: 0.35 }));
  sol.rotation.x = -Math.PI / 2; sol.position.y = -0.002; scene.scene.add(sol);
  const L = voit.L, W = voit.W, Ht = voit.H;

  /* ---- vue + pourcentages → un point de la carrosserie ----
     Les repères des vues à plat (viewBox 0–100) : côté, la voiture
     va de x≈5 à x≈97 (l'avant à gauche côté conducteur, à droite côté
     passager), du sol y≈83 au toit y≈20 ; de face, de x≈14 à x≈86 ;
     de dessus, l'avant en haut (y≈2), de x≈24 à x≈76. */
  function versLaVoiture(d){
    const x = Number(d.x), y = Number(d.y), or = new T.Vector3(), dir = new T.Vector3();
    if(d.vue === 'gauche'){ or.set(L / 2 - (x - 5) / 92 * L, (83 - y) / 63 * Ht, -6); dir.set(0, 0, 1); }
    else if(d.vue === 'droite'){ or.set(L / 2 - (95 - x) / 92 * L, (83 - y) / 63 * Ht, 6); dir.set(0, 0, -1); }
    else if(d.vue === 'avant'){ or.set(6, (84 - y) / 73 * Ht, W / 2 - (x - 14) / 72 * W); dir.set(-1, 0, 0); }
    else if(d.vue === 'arriere'){ or.set(-6, (84 - y) / 73 * Ht, -W / 2 + (x - 14) / 72 * W); dir.set(1, 0, 0); }
    else { or.set(L / 2 - (y - 2) / 96 * L, 6, -W / 2 + (x - 24) / 52 * W); dir.set(0, -1, 0); }
    scene.ray.set(or, dir);
    const h = scene.ray.intersectObject(voit.inter, true);
    if(h.length) return { p: h[0].point, n: h[0].face ? h[0].face.normal.clone().transformDirection(h[0].object.matrixWorld) : dir.clone().negate() };
    /* rien touché (un point posé dans le vide d'une vue) : posé au bord */
    return { p: or.clone().addScaledVector(dir, 6 - (d.vue === 'dessus' ? Ht : (d.vue === 'gauche' || d.vue === 'droite') ? W / 2 : L / 2)), n: dir.clone().negate() };
  }
  /* ---- un point touché → la vue qu'il regarde et ses pourcentages ---- */
  function versLaVue(p, n){
    const a = { x: Math.abs(n.x), y: Math.abs(n.y), z: Math.abs(n.z) };
    let vue, x, y;
    if(a.z >= a.x && a.z >= a.y){
      vue = n.z < 0 ? 'gauche' : 'droite';
      y = 83 - p.y / Ht * 63;
      x = vue === 'gauche' ? 5 + (L / 2 - p.x) / L * 92 : 95 - (L / 2 - p.x) / L * 92;
    }else if(a.x >= a.y){
      vue = n.x > 0 ? 'avant' : 'arriere';
      y = 84 - p.y / Ht * 73;
      x = vue === 'avant' ? 14 + (W / 2 - p.z) / W * 72 : 14 + (p.z + W / 2) / W * 72;
    }else{
      vue = 'dessus';
      y = 2 + (L / 2 - p.x) / L * 96;
      x = 24 + (p.z + W / 2) / W * 52;
    }
    const r1 = q => Math.round(Math.max(0, Math.min(100, q)) * 10) / 10;
    return { vue: vue, x: r1(x), y: r1(y) };
  }

  /* ---- les dommages, en pastilles ---- */
  const marques = (liste || []).map(d => {
    const q = versLaVoiture(d), col = (typeof couleurDuDommage === 'function') ? couleurDuDommage(d) : '#E8A33D';
    const c3 = col.indexOf('var(') === 0 ? '#E8A33D' : col;
    const boule = new T.Mesh(new T.SphereGeometry(0.07, 16, 12), new T.MeshBasicMaterial({ color: new T.Color(c3) }));
    boule.position.copy(q.p).addScaledVector(q.n, 0.03); boule.userData.d = d; scene.scene.add(boule);
    const anneau = new T.Mesh(new T.RingGeometry(0.09, 0.14, 28), new T.MeshBasicMaterial({ color: new T.Color(c3), transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false }));
    anneau.position.copy(q.p).addScaledVector(q.n, 0.012); anneau.lookAt(q.p.clone().add(q.n)); scene.scene.add(anneau);
    const ty = (typeof typeDommage === 'function') ? typeDommage(d.type) : { emoji: '•' };
    const e = scene.etiquette('<span style="position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer;' +
      'display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:' + c3 + ';' +
      'border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);font-size:13px;">' + ty.emoji + '</span>', 'carro3dEtq', boule.position);
    e.el.addEventListener('click', () => { if(o.ouvrir) o.ouvrir(d); });
    return { d: d, boule: boule, etq: e, p: q.p, n: q.n };
  });

  /* ---- le haut : les vues d'un geste ; le bas : la carte du point ---- */
  const css = (el, s) => { el.style.cssText = s; return el; };
  const haut = css(document.createElement('div'), 'position:absolute;left:6px;right:6px;top:6px;z-index:3;display:flex;gap:5px;flex-wrap:wrap;');
  const VUES = [['gauche', 'Conducteur', Math.PI, 1.2], ['droite', 'Passager', 0, 1.2], ['avant', 'Avant', Math.PI / 2, 1.2],
                ['arriere', 'Arrière', -Math.PI / 2, 1.2], ['dessus', 'Dessus', Math.PI, 0.22]];
  VUES.forEach(([cle, nom, th, ph]) => {
    const b = css(document.createElement('button'), 'width:auto;margin:0;border:1px solid #DCDCD3;background:rgba(255,255,255,.92);color:#14161B;' +
      'border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;');
    b.type = 'button'; b.textContent = nom;
    b.addEventListener('click', () => { touche = true; scene.voler(new T.Vector3(0, 0.75, 0), 7.6, ph, th, 0.8); });
    haut.appendChild(b);
  });
  hote.appendChild(haut);
  const carte = css(document.createElement('div'), 'position:absolute;left:8px;right:8px;bottom:8px;z-index:3;display:none;background:#fff;color:#14161B;' +
    'border:1px solid #DCDCD3;border-radius:14px;padding:10px 12px;font-size:13.5px;line-height:1.45;box-shadow:0 4px 18px rgba(0,0,0,.18);');
  hote.appendChild(carte);
  const aide = css(document.createElement('div'), 'position:absolute;left:8px;bottom:8px;right:8px;z-index:2;font-size:11.5px;color:#3A3B37;' +
    'background:rgba(255,255,255,.85);border-radius:8px;padding:4px 8px;pointer-events:none;text-align:center;');
  aide.textContent = '☝️ Fais tourner · touche une pastille pour la relire · touche la carrosserie pour noter un dommage';
  hote.appendChild(aide);

  const NOMS = { gauche: 'Côté conducteur', droite: 'Côté passager', avant: 'Avant', arriere: 'Arrière', dessus: 'Dessus' };
  let neuf = null;
  function fermer(){
    carte.style.display = 'none'; aide.style.display = '';
    if(neuf){ scene.scene.remove(neuf); EC3D.liberer(neuf); neuf = null; }
  }
  function proposer(h){
    fermer();
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    const q = versLaVue(h.point, n);
    neuf = new T.Mesh(new T.SphereGeometry(0.075, 16, 12), new T.MeshBasicMaterial({ color: 0xB6FF0E }));
    neuf.position.copy(h.point).addScaledVector(n, 0.03);
    scene.scene.add(neuf);
    touche = true;
    carte.innerHTML = '<div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap;"><div style="flex:1 1 160px;min-width:0;"><b>➕ Un dommage ici ?</b>' +
      '<div style="font-size:12px;color:#64655F;">' + NOMS[q.vue] + ' — les vues à plat le montrent au même endroit.</div></div>' +
      '<button type="button" data-ok style="width:auto;margin:0;border:0;border-radius:999px;padding:8px 14px;background:#B6FF0E;color:#0B0B0B;font-weight:800;cursor:pointer;font-family:inherit;">➕ Noter</button>' +
      '<button type="button" data-x style="width:auto;margin:0;border:1px solid #DCDCD3;border-radius:999px;padding:8px 12px;background:#fff;color:#14161B;font-weight:700;cursor:pointer;font-family:inherit;">Annuler</button></div>';
    carte.style.display = ''; aide.style.display = 'none';
    carte.querySelector('[data-x]').addEventListener('click', fermer);
    carte.querySelector('[data-ok]').addEventListener('click', () => { fermer(); if(o.nouveau) o.nouveau(q); });
  }

  /* la voiture tourne doucement tant qu'on n'y a pas touché */
  scene.demarrer(dt => {
    if(!touche && !scene.vol) scene.theta += 0.22 * dt;
    /* une pastille cachée derrière la voiture s'estompe */
    marques.forEach(m => {
      const vers = m.p.clone().sub(scene.cam.position).normalize();
      const visible = vers.dot(m.n) < 0.15;
      m.etq.el.style.opacity = visible ? '1' : '0.25';
    });
  });
  setTimeout(() => { aide.style.transition = 'opacity .6s'; aide.style.opacity = '0'; }, 8000);

  const api = { detruire(){ scene.detruire(); }, versLaVue: versLaVue, versLaVoiture: versLaVoiture, scene: scene, voit: voit };
  carro3dCourante = api;
  return api;
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-carro3d.js'] = true;
