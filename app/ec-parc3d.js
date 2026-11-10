/* Déployé le 10/11/2026 à 13:42 — v1403 */
/* ============================================================
   ec-parc3d.js — 🧊 LE PARC EN DIRECT, EN 3D

   David, le 9 novembre (schéma « Parc en direct ») : « bâtiments en
   relief », « le Plan par défaut, la 3D en bouton », des voitures qui
   ressemblent à une A3 et un Q3, toutes blanches. Le 10 : « oui fais
   ça » (le parc d'abord).

   ⚠️ LA 3D NE DEMANDE RIEN DE PLUS. Elle dessine exactement ce que la
   carte à plat reçoit déjà (ec-direct.js, etatCarteDirect) : les
   voitures en direct, les dernières positions connues, les bureaux.
   Aucune requête de plus au Worker pour les voitures, toujours ni
   vitesse ni historique (CNIL). Seuls le sol (les mêmes tuiles du
   Plan IGN) et les bâtiments (BD TOPO, /batiments, gardés dans R2)
   se chargent en plus — et seulement quand on appuie sur « 🧊 3D ».

   Ce qui bouge : une voiture qui reçoit une nouvelle position GLISSE
   jusqu'à elle (2,5 s) au lieu de sauter, le nez dans le sens du
   déplacement. Elle n'est jamais montrée plus loin que sa dernière
   position reçue : on n'invente pas de trajet.

   Toucher une voiture (ou une ligne de la liste, comme à plat) : la
   caméra la suit. « ⤢ Vue d'ensemble » revient sur toutes.
   ============================================================ */

const parc3d = { actif: false, pret: false, enCours: false, scene: null, sol: null, bat: null, hote: null,
                 objets: new Map(), suivie: '', cadre: false, majSol: 0, erreur: '' };

/* La bascule « 🗺️ Plan · 🧊 3D », au-dessus de la carte (une fois) */
function poserBasculeDirect(){
  const carte = $('directCarte');
  if(!carte || $('directBascule')) return;
  const b = document.createElement('div');
  b.id = 'directBascule';
  b.style.cssText = 'display:flex;gap:6px;margin:0 0 8px;align-items:center;flex-wrap:wrap;';
  b.innerHTML = '<div role="tablist" style="display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:3px;background:var(--navy-deep);">' +
    '<button type="button" data-v="plan" role="tab" style="width:auto;margin:0;border:0;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;">🗺️ Plan</button>' +
    '<button type="button" data-v="3d" role="tab" style="width:auto;margin:0;border:0;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;">🧊 3D</button></div>' +
    '<span id="directBasculeMot" style="font-size:12px;color:var(--muted);"></span>';
  carte.parentNode.insertBefore(b, carte);
  b.querySelectorAll('button[data-v]').forEach(x => x.addEventListener('click', () => basculerParc3D(x.dataset.v === '3d')));
  peindreBasculeDirect();
}
function peindreBasculeDirect(){
  const b = $('directBascule');
  if(!b) return;
  b.querySelectorAll('button[data-v]').forEach(x => {
    const on = (x.dataset.v === '3d') === parc3d.actif;
    x.style.background = on ? 'var(--orange)' : 'transparent';
    x.style.color = on ? 'var(--on-accent, #0B0B0B)' : 'var(--cream)';
    x.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

async function basculerParc3D(oui){
  const carte = $('directCarte');
  if(!carte) return;
  if(oui && typeof EC3D === 'object' && !EC3D.possible()){
    if(typeof showToast === 'function') showToast('Cet appareil ne sait pas afficher la 3D : on reste sur le Plan.');
    return;
  }
  parc3d.actif = !!oui;
  peindreBasculeDirect();
  let hote = $('directCarte3D');
  if(!oui){
    if(hote) hote.style.display = 'none';
    carte.style.display = '';
    etatCarteDirect.cleVue = '';            /* le plan se redessine à neuf */
    dessinerVoituresEnDirect(true);
    return;
  }
  if(!hote){
    hote = document.createElement('div');
    hote.id = 'directCarte3D';
    hote.style.cssText = 'position:relative;overflow:hidden;border:1px solid var(--line);border-radius:12px;background:#EDEAE2;';
    carte.parentNode.insertBefore(hote, carte.nextSibling);
  }
  hote.style.height = (carte.clientHeight ? Math.max(320, Math.min(520, Math.round(carte.clientWidth * 0.62))) : 360) + 'px';
  hote.style.display = '';
  carte.style.display = 'none';
  const mot = $('directBasculeMot');
  if(!parc3d.pret){
    if(parc3d.enCours) return;
    parc3d.enCours = true;
    if(mot) mot.textContent = '⏳ La 3D se prépare…';
    try{
      await EC3D.charger();
      /* 📷 v1403 — le Q3 scanné, en version légère (4 s au plus : sinon la voiture dessinée) */
      if(EC3D.scans) await EC3D.scans(true, 4000);
      creerParc3D(hote);
      parc3d.pret = true;
      if(mot) mot.textContent = '';
    }catch(e){
      parc3d.actif = false;
      if(mot) mot.textContent = '';
      if(typeof showToast === 'function') showToast('⚠️ ' + ((e && e.message) || 'La 3D ne se charge pas.'));
      basculerParc3D(false);
      return;
    }finally{ parc3d.enCours = false; }
  }
  parc3d.cadre = false;
  dessinerVoituresEnDirect(true);
}

function creerParc3D(hote){
  const T = EC3D.T;
  hote.innerHTML = '';
  const scene = EC3D.Scene(hote, {
    mode: 'carte', fov: 40, pres: 1, loin: 400000, r: 1400, phi: 0.82, theta: 0, rMin: 60, rMax: 90000, phiMin: 0.15, phiMax: 1.3,
    fond: 0xEDEAE2, brume: [0xEDEAE2, 3000, 9000], hemi: 0.72, dir: 0.75,
    visible: () => parc3d.actif && carteDirectSousLesYeux(),
    surGeste: () => { parc3d.cadre = true; parc3d.bouge = true; if(parc3d.btEnsemble) parc3d.btEnsemble.style.display = ''; },
    toucher: (nx, ny) => {
      const groupes = []; parc3d.objets.forEach(o => { if(o.groupe) groupes.push(o.groupe); });
      const h = scene.viser(nx, ny, groupes);
      if(!h.length) return;
      let o = h[0].object; while(o && !o.userData.cle) o = o.parent;
      if(o) suivreDansLeParc3D(o.userData.cle);
    }
  });
  parc3d.scene = scene;
  parc3d.hote = hote;
  parc3d.sol = EC3D.Sol(scene.scene);
  parc3d.bat = EC3D.Batiments(scene.scene);

  /* les boutons sur la scène */
  const outils = document.createElement('div');
  outils.style.cssText = 'position:absolute;left:8px;top:8px;display:flex;gap:6px;flex-wrap:wrap;z-index:2;';
  const bt = (txt, titre, faire) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = txt; b.title = titre;
    b.style.cssText = 'width:auto;margin:0;border:1px solid #DCDCD3;background:rgba(255,255,255,.92);color:#14161B;' +
      'border-radius:999px;padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.12);';
    b.addEventListener('click', faire);
    outils.appendChild(b);
    return b;
  };
  parc3d.btEnsemble = bt('⤢ Vue d’ensemble', 'Toutes les voitures', () => {
    etatCarteDirect.suivie = ''; parc3d.cadre = false; parc3d.bouge = false; dessinerVoituresEnDirect(true);
  });
  bt('↻', 'Tourner d’un quart de tour', () => { scene.voler(scene.cible, scene.r, scene.phi, scene.theta + Math.PI / 2, 0.8); });
  bt('🧭', 'Le nord en haut, vue inclinée', () => { scene.voler(scene.cible, scene.r, 0.82, 0, 0.8); });
  hote.appendChild(outils);
  const aide = document.createElement('div');
  aide.style.cssText = 'position:absolute;left:8px;bottom:8px;font-size:11.5px;color:#3A3B37;background:rgba(255,255,255,.85);' +
    'border-radius:8px;padding:3px 8px;pointer-events:none;z-index:2;max-width:calc(100% - 16px);';
  aide.textContent = '☝️ Un doigt déplace · deux doigts tournent, zooment et inclinent · touche une voiture pour la suivre';
  hote.appendChild(aide);
  const mention = document.createElement('div');
  mention.style.cssText = 'position:absolute;right:6px;top:8px;font-size:10.5px;color:#3A3B37;background:rgba(255,255,255,.82);' +
    'border-radius:6px;padding:2px 7px;pointer-events:none;z-index:2;';
  mention.textContent = 'Plan IGN · bâtiments BD TOPO — © IGN';
  hote.appendChild(mention);
  setTimeout(() => { aide.style.transition = 'opacity .6s'; aide.style.opacity = '0'; }, 9000);

  scene.demarrer(dt => animerParc3D(dt));
}

/* Une étiquette comme à plat : sombre en direct, claire sinon */
function etiquetteParc3D(genre, html){
  const sombre = genre === 'direct';
  return '<span style="position:absolute;left:0;bottom:6px;transform:translateX(-50%);white-space:nowrap;' +
    'background:' + (sombre ? '#14161B' : genre === 'bureau' ? '#FFFFFF' : '#F2F2EC') + ';color:' + (sombre ? '#C9CBC4' : '#3A3B37') + ';' +
    'border:' + (genre === 'bureau' ? '2px solid #3B6900' : '1px solid ' + (sombre ? '#14161B' : '#B9BAB2')) + ';' +
    'border-radius:8px;padding:4px 9px;font-size:12.5px;line-height:1.3;box-shadow:0 2px 6px rgba(0,0,0,.25);pointer-events:auto;cursor:pointer;">' + html + '</span>';
}

/* ---- Ce que la carte reçoit, posé dans la scène ---- */
function majParc3D(actives, anciennes){
  if(!parc3d.actif || !parc3d.pret) return;
  const T = EC3D.T, sc = parc3d.scene;
  const voulus = new Map();
  (actives || []).forEach(v => {
    if(!isFinite(v.lat) || !isFinite(v.lon)) return;
    voulus.set(v.cle, { genre: 'direct', nom: v.voiture || 'Voiture ?', lat: v.lat, lon: v.lon,
      html: echapper(emojiDeLaVoiture(v.voiture)) + ' <strong style="color:#B6FF0E;">' + echapper((v.voiture || 'Voiture ?') + ' · ' + (v.qui || '')) +
            '</strong> · <span data-recu="' + v.recu + '" data-genre="vu">il y a ' + ageEnMotsDirect(Date.now() - v.recu) + '</span>' });
  });
  (anciennes || []).forEach(f => {
    voulus.set('d:' + f.cle, { genre: 'derniere', nom: f.nom, lat: f.point.lat, lon: f.point.lon,
      html: echapper(emojiDeLaVoiture(f.nom)) + ' <strong>' + echapper(f.nom) + '</strong> · dernière position ' + echapper(dateHeureDirect(f.point.quand)) });
  });
  /* 🏠 les bureaux : ceux qui ont des voitures, ou celui qu'on a choisi */
  const auBureau = {};
  voituresConnuesDirect().forEach(f => {
    if(f.etat !== 'bureau') return;
    const b = bureauDuNomDirect(f.derniere.auBureau);
    if(b) (auBureau[b.id] = auBureau[b.id] || []).push(f.nom);
  });
  bureauxDirect().forEach(b => {
    const l = auBureau[b.id] || [];
    if(!l.length && etatCarteDirect.suivie !== 'b:' + b.id) return;
    if(!isFinite(b.lat) || !isFinite(b.lon)) return;
    voulus.set('b:' + b.id, { genre: 'bureau', nom: b.nom, lat: b.lat, lon: b.lon,
      html: '🏠 <strong>Bureau de ' + echapper(b.nom) + '</strong>' + (l.length ? ' · ' + echapper(l.join(', ')) : ' · aucune voiture') });
  });

  /* ce qui n'est plus là s'en va */
  parc3d.objets.forEach((o, cle) => {
    if(voulus.has(cle)) return;
    if(o.groupe){ sc.scene.remove(o.groupe); EC3D.liberer(o.groupe); }
    sc.retirerEtiquette(o.etq);
    parc3d.objets.delete(cle);
  });
  /* ce qui arrive, ou bouge */
  voulus.forEach((w, cle) => {
    const p = EC3D.versMonde(w.lat, w.lon);
    let o = parc3d.objets.get(cle);
    if(o && o.genre !== w.genre){
      if(o.groupe){ sc.scene.remove(o.groupe); EC3D.liberer(o.groupe); }
      sc.retirerEtiquette(o.etq); parc3d.objets.delete(cle); o = null;
    }
    if(!o){
      o = { cle: cle, genre: w.genre, de: new T.Vector3(p.x, 0, p.z), vers: new T.Vector3(p.x, 0, p.z), ici: new T.Vector3(p.x, 0, p.z), t: 1, cap: 0, capVise: 0 };
      if(w.genre === 'bureau'){
        o.groupe = new T.Group();
        const mat = new T.MeshLambertMaterial({ color: 0x3B6900 });
        const mat2 = new T.MeshLambertMaterial({ color: 0xFFFFFF });
        const pied = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 3, 10), mat); pied.position.y = 1.5; o.groupe.add(pied);
        const tete = new T.Mesh(new T.SphereGeometry(1.1, 18, 12), mat2); tete.position.y = 3.6; o.groupe.add(tete);
        const anneau = new T.Mesh(new T.TorusGeometry(1.1, 0.22, 8, 24), mat); anneau.position.y = 3.6; anneau.rotation.x = Math.PI / 2; o.groupe.add(anneau);
        o.haut = 5;
      }else{
        const v = EC3D.voiture3D({ modele: EC3D.modeleDuNom(w.nom), leger: true });
        o.groupe = v.groupe; o.haut = v.H;
        if(w.genre === 'direct'){
          const disque = new T.Mesh(new T.CircleGeometry(3.2, 28), new T.MeshBasicMaterial({ color: 0xB6FF0E, transparent: true, opacity: 0.85, depthWrite: false }));
          disque.rotation.x = -Math.PI / 2; disque.position.y = 0.03; o.groupe.add(disque); o.disque = disque;
        }else{
          o.groupe.traverse(m => { if(m.material){ m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.5; m.material.depthWrite = false; } });
        }
      }
      o.groupe.userData.cle = cle;
      o.groupe.position.copy(o.ici);
      sc.scene.add(o.groupe);
      o.etq = sc.etiquette('', 'parc3dEtq', () => o.ici.clone().add(new T.Vector3(0, (o.haut || 2) * o.echelle + 1, 0)));
      o.etq.el.addEventListener('click', () => suivreDansLeParc3D(cle));
      o.echelle = 1;
      parc3d.objets.set(cle, o);
    }else if(Math.hypot(p.x - o.vers.x, p.z - o.vers.z) > 0.5){
      /* une nouvelle position : on glisse depuis là où on la montre */
      o.de.copy(o.ici); o.vers.set(p.x, 0, p.z); o.t = 0;
      if(o.de.distanceTo(o.vers) > 3) o.capVise = Math.atan2(-(o.vers.z - o.de.z), o.vers.x - o.de.x);
    }
    if(o.etq.el.dataset.html !== w.html){ o.etq.el.innerHTML = etiquetteParc3D(w.genre, w.html); o.etq.el.dataset.html = w.html; }
  });

  /* la caméra : celle qu'on suit, sinon toutes (tant qu'on n'a pas touché) */
  const s = etatCarteDirect.suivie;
  if(parc3d.btEnsemble) parc3d.btEnsemble.style.display = (s || parc3d.bouge) ? '' : 'none';
  if(s && parc3d.objets.has(s)){
    if(parc3d.suivie !== s){
      parc3d.suivie = s;
      const o = parc3d.objets.get(s);
      sc.voler(o.ici, 260, 0.95, sc.theta, 1.4);
    }
  }else{
    parc3d.suivie = '';
    if(!parc3d.cadre){ cadrerParc3D(); parc3d.cadre = true; }
  }
}

function suivreDansLeParc3D(cle){
  etatCarteDirect.suivie = cle;
  parc3d.suivie = '';
  dessinerVoituresEnDirect(true);
}

/* Toutes les voitures (sinon nos deux villes) dans le cadre */
function cadrerParc3D(){
  const sc = parc3d.scene, T = EC3D.T;
  const pts = [];
  parc3d.objets.forEach(o => pts.push(o.vers));
  if(!pts.length) VOITURES_PAR_DEFAUT.slice(0, 1).forEach(p => { const m = EC3D.versMonde(p.lat, p.lon); pts.push(new T.Vector3(m.x, 0, m.z)); });
  let x1 = Infinity, x2 = -Infinity, z1 = Infinity, z2 = -Infinity;
  pts.forEach(p => { x1 = Math.min(x1, p.x); x2 = Math.max(x2, p.x); z1 = Math.min(z1, p.z); z2 = Math.max(z2, p.z); });
  const c = new T.Vector3((x1 + x2) / 2, 0, (z1 + z2) / 2);
  const ext = Math.max(x2 - x1, z2 - z1);
  const r = Math.max(700, Math.min(90000, ext * 1.5 + 500));
  sc.voler(c, r, 0.82, sc.theta, 1.3);
}

/* Chaque image : les glissades, le suivi, le sol et les bâtiments */
function animerParc3D(dt){
  const sc = parc3d.scene;
  if(!sc) return;
  /* les voitures : grandies quand on est loin (comme des pastilles) */
  const echelle = Math.max(1, Math.min(40, sc.r / 70)) * EC3D.k;
  parc3d.objets.forEach(o => {
    if(o.t < 1){
      o.t = Math.min(1, o.t + dt / 2.5);
      const t = o.t < 0.5 ? 2 * o.t * o.t : 1 - Math.pow(-2 * o.t + 2, 2) / 2;
      o.ici.lerpVectors(o.de, o.vers, t);
    }
    let d = o.capVise - o.cap; d = Math.atan2(Math.sin(d), Math.cos(d));
    o.cap += d * Math.min(1, dt * 3);
    o.groupe.position.copy(o.ici);
    if(o.genre !== 'bureau') o.groupe.rotation.y = o.cap;
    o.echelle = echelle;
    o.groupe.scale.setScalar(echelle);
    if(o.disque) o.disque.material.opacity = 0.55 + 0.3 * Math.sin(performance.now() / 300);
  });
  /* on suit la voiture choisie (après le vol) */
  if(parc3d.suivie && !sc.vol){
    const o = parc3d.objets.get(parc3d.suivie);
    if(o) sc.cible.lerp(o.ici, Math.min(1, dt * 4));
  }
  /* la brume repousse le bord du monde à la distance qu'il faut */
  if(sc.scene.fog){ sc.scene.fog.near = sc.r * 1.6; sc.scene.fog.far = sc.r * 4.5; }
  sc.cam.far = sc.r * 6; sc.cam.near = Math.max(0.5, sc.r / 400); sc.cam.updateProjectionMatrix();
  parc3d.majSol -= dt;
  if(parc3d.majSol <= 0){
    parc3d.majSol = 0.4;
    parc3d.sol.autour(sc.cible.x, sc.cible.z, sc.r);
    parc3d.bat.autour(sc.cible.x, sc.cible.z, sc.r);
  }
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-parc3d.js'] = true;
