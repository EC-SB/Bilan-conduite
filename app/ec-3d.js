/* Déployé le 10/11/2026 à 13:42 — v1403 */
/* ============================================================
   ec-3d.js — 🧊 LE SOCLE DE LA 3D (three.js)

   David, le 9 novembre, sur le schéma 3D (« c'est nikel ») puis le
   10 : « oui fais ça » — le parc en direct d'abord, puis le trajet
   du cours, puis la carrosserie. Ce fichier est ce que les trois
   partagent :
   · charger three.js (une fois, au premier appui sur « 🧊 3D » :
     personne ne le télécharge s'il ne s'en sert pas) ;
   · une scène (rendu, caméra, lumières, gestes au doigt et à la
     souris, étiquettes HTML qui suivent un point 3D) ;
   · les voitures : le Q3 SCANNÉ par David (v1403, modeles/q3.glb),
     et, sans scan (l'A3 pour l'instant, ou un scan qui ne charge pas),
     une A3 Sportback et un Q3 MOULÉS d'après leurs cotes (voiture3D) ;
   · le sol de carte (Plan IGN, les mêmes tuiles que la carte à plat,
     par le Worker) et les bâtiments en relief (BD TOPO de l'IGN, par
     le Worker : /batiments).

   Le monde est en mètres « Web Mercator » autour d'une origine
   (Saint-Brieuc) : x vers l'est, z vers le SUD (le nord est en −z).
   Le Mercator grandit les distances de 1/cos(latitude) ; les
   hauteurs et les voitures sont grandies d'autant (EC3D.k) pour que
   tout reste à la même échelle.
   ============================================================ */

const EC3D = (function(){
  const URL_THREE = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const C = 40075016.686;                 /* le tour de la Terre, en mètres Mercator à z0 */
  const ORIGINE = { lat: 48.5136, lon: -2.7603 };   /* Saint-Brieuc */
  let T = null, chargement = null;

  function charger(){
    if(T) return Promise.resolve(T);
    if(window.THREE && window.THREE.WebGLRenderer){ T = window.THREE; return Promise.resolve(T); }
    if(chargement) return chargement;
    chargement = new Promise((ok, non) => {
      const s = document.createElement('script');
      s.src = URL_THREE;
      s.async = true;
      s.onload = () => { if(window.THREE){ T = window.THREE; ok(T); } else { chargement = null; non(new Error('three.js chargé mais introuvable')); } };
      s.onerror = () => { chargement = null; non(new Error('Pas de réseau pour la 3D (three.js)')); };
      document.head.appendChild(s);
    });
    return chargement;
  }
  /* La 3D est-elle possible ici ? (un vieux téléphone sans WebGL : non) */
  function possible(){
    try{ const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch(e){ return false; }
  }

  /* ---- les coordonnées ---- */
  function mx(lon){ return (lon + 180) / 360 * C; }
  function my(lat){ const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * C; }
  const OX = mx(ORIGINE.lon), OY = my(ORIGINE.lat);
  const k = 1 / Math.cos(ORIGINE.lat * Math.PI / 180);
  function versMonde(lat, lon){ return { x: mx(lon) - OX, z: my(lat) - OY }; }
  function versGeo(x, z){
    const lon = (x + OX) / C * 360 - 180;
    const n = Math.PI - 2 * Math.PI * (z + OY) / C;
    return { lat: 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lon: lon };
  }
  function tailleTuile(z){ return C / Math.pow(2, z); }
  function tuileDe(x, zMonde, z){ const s = tailleTuile(z); return { tx: Math.floor((x + OX) / s), ty: Math.floor((zMonde + OY) / s) }; }
  function base(){ return (typeof CONFIG === 'object' && CONFIG && CONFIG.WORKER_URL) ? CONFIG.WORKER_URL : ''; }

  /* ---- petits outils ---- */
  function el(tag, cls, html){ const e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; }
  function mat(c, o){ return new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.08 }, o || {})); }
  function lum(c, o){ return new T.MeshStandardMaterial(Object.assign({ color: c, emissive: c, emissiveIntensity: 0.55, roughness: 0.3 }, o || {})); }
  function boite(w, h, d, m){ return new T.Mesh(new T.BoxGeometry(w, h, d), m); }
  function cyl(r, h, m, s){ return new T.Mesh(new T.CylinderGeometry(r, r, h, s || 20), m); }
  function lisse(a, b, t){ return a + (b - a) * t; }
  function liberer(o){
    if(!o) return;
    o.traverse && o.traverse(m => {
      if(m.geometry) m.geometry.dispose();
      if(m.material){ (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { if(x.map) x.map.dispose(); x.dispose(); }); }
    });
  }

  /* ============================================================
     LA SCÈNE
     o.mode : 'carte' — un doigt déplace, deux doigts tournent et
              zooment (comme une carte) ; souris : glisser = déplacer,
              clic droit ou Maj = tourner, molette = zoom.
              'orbite' — un doigt tourne autour (la carrosserie).
     ============================================================ */
  function Scene(hote, o){
    o = o || {};
    const s = this;
    s.hote = hote; s.o = o;
    s.rendu = new T.WebGLRenderer({ antialias: true, alpha: !o.fond });
    s.rendu.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    s.rendu.outputEncoding = T.sRGBEncoding;
    if(o.fond) s.rendu.setClearColor(o.fond, 1); else s.rendu.setClearColor(0x000000, 0);
    const cv = s.rendu.domElement;
    cv.style.cssText = 'position:absolute;inset:0;display:block;touch-action:none;';
    hote.appendChild(cv);
    s.calque = el('div', 'ec3dCalque');
    s.calque.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    hote.appendChild(s.calque);
    s.scene = new T.Scene();
    if(o.brume) s.scene.fog = new T.Fog(o.brume[0], o.brume[1], o.brume[2]);
    s.cam = new T.PerspectiveCamera(o.fov || 38, 1, o.pres || 0.5, o.loin || 20000);
    s.scene.add(new T.HemisphereLight(0xffffff, 0xa59f92, o.hemi || 0.62));
    const d = new T.DirectionalLight(0xffffff, o.dir || 0.85); d.position.set(4, 9, 5); s.scene.add(d);
    const d2 = new T.DirectionalLight(0xffffff, 0.25); d2.position.set(-6, 4, -5); s.scene.add(d2);
    s.cible = new T.Vector3(); s.r = o.r || 10; s.theta = o.theta || 0; s.phi = o.phi || 0.9;
    s.rMin = o.rMin || 2; s.rMax = o.rMax || 60; s.phiMin = o.phiMin || 0.2; s.phiMax = o.phiMax || 1.35;
    s.vol = null; s.etiquettes = []; s.touche = false; s.vie = true; s.dernier = 0;
    s.ray = new T.Raycaster();
    const pts = {};
    let depart = null, dist0 = 0, ang0 = 0, bouge = 0, t0 = 0, tourner = false;
    const surSol = (cx, cy) => {
      const r = cv.getBoundingClientRect();
      s.ray.setFromCamera(new T.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), s.cam);
      const p = new T.Vector3();
      return s.ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -s.cible.y), p) ? p : null;
    };
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      try{ cv.setPointerCapture(e.pointerId); }catch(x){}
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      const ids = Object.keys(pts);
      if(ids.length === 1){
        depart = { x: e.clientX, y: e.clientY, sol: surSol(e.clientX, e.clientY) };
        bouge = 0; t0 = Date.now();
        tourner = o.mode !== 'carte' || e.button === 2 || e.shiftKey || e.ctrlKey;
      }
      if(ids.length === 2){
        const a = pts[ids[0]], b = pts[ids[1]];
        dist0 = Math.hypot(a.x - b.x, a.y - b.y); ang0 = Math.atan2(b.y - a.y, b.x - a.x);
      }
      s.touche = true; s.vol = null;
      if(s.o.surGeste) s.o.surGeste();
    });
    cv.addEventListener('pointermove', e => {
      if(!pts[e.pointerId]) return;
      const p = pts[e.pointerId], dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      const ids = Object.keys(pts);
      if(ids.length === 1){
        bouge += Math.abs(dx) + Math.abs(dy);
        if(tourner){
          s.theta -= dx * 0.008; s.phi = Math.max(s.phiMin, Math.min(s.phiMax, s.phi - dy * 0.006));
        }else if(depart && depart.sol){
          const ici = surSol(e.clientX, e.clientY);
          if(ici){ s.cible.x += depart.sol.x - ici.x; s.cible.z += depart.sol.z - ici.z; s.majCamera(); }
        }
      }else if(ids.length === 2){
        const a = pts[ids[0]], b = pts[ids[1]];
        const dd = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
        if(dist0) s.r = Math.max(s.rMin, Math.min(s.rMax, s.r * dist0 / dd));
        let da = ang - ang0; da = Math.atan2(Math.sin(da), Math.cos(da));
        s.theta -= da;
        /* deux doigts qui montent ou descendent ensemble : on incline */
        s.phi = Math.max(s.phiMin, Math.min(s.phiMax, s.phi - dy * 0.003));
        dist0 = dd; ang0 = ang; bouge += 99;
      }
    });
    const fin = e => {
      if(!pts[e.pointerId]) return;
      const seul = Object.keys(pts).length === 1;
      delete pts[e.pointerId];
      if(Object.keys(pts).length === 1){
        const id = Object.keys(pts)[0];
        depart = { x: pts[id].x, y: pts[id].y, sol: surSol(pts[id].x, pts[id].y) }; tourner = o.mode !== 'carte';
      }
      if(seul && bouge < 8 && Date.now() - t0 < 600 && s.o.toucher){
        const r = cv.getBoundingClientRect();
        s.o.toucher(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, e);
      }
    };
    cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      s.r = Math.max(s.rMin, Math.min(s.rMax, s.r * Math.exp(e.deltaY * 0.0012)));
      s.touche = true; s.vol = null;
      if(s.o.surGeste) s.o.surGeste();
    }, { passive: false });
    s.taille();
    if(window.ResizeObserver){ s.obs = new ResizeObserver(() => s.taille()); s.obs.observe(hote); }
  }
  Scene.prototype.taille = function(){
    const w = this.hote.clientWidth || 300, h = this.hote.clientHeight || 300;
    this.rendu.setSize(w, h, false);
    this.rendu.domElement.style.width = w + 'px'; this.rendu.domElement.style.height = h + 'px';
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
  };
  Scene.prototype.voler = function(cible, r, phi, theta, duree){
    this.vol = { de: { c: this.cible.clone(), r: this.r, phi: this.phi, theta: this.theta },
                 a: { c: cible.clone(), r: r == null ? this.r : r, phi: phi == null ? this.phi : phi, theta: theta == null ? this.theta : theta },
                 t: 0, d: duree || 1.2 };
  };
  Scene.prototype.viser = function(nx, ny, objets){
    this.ray.setFromCamera(new T.Vector2(nx, ny), this.cam);
    return this.ray.intersectObjects(objets, true);
  };
  Scene.prototype.etiquette = function(html, cls, ou){
    const e = el('div', 'ec3dEtq ' + (cls || ''), html);
    e.style.cssText = 'position:absolute;left:0;top:0;will-change:transform;';
    this.calque.appendChild(e);
    const x = { el: e, ou: ou, dx: 0, dy: 0, vis: true };
    this.etiquettes.push(x);
    return x;
  };
  Scene.prototype.retirerEtiquette = function(x){
    if(!x) return;
    this.etiquettes = this.etiquettes.filter(y => y !== x);
    if(x.el && x.el.parentNode) x.el.parentNode.removeChild(x.el);
  };
  Scene.prototype.majCamera = function(){
    const c = this.cam, sp = Math.sin(this.phi);
    c.position.set(this.cible.x + this.r * sp * Math.sin(this.theta), this.cible.y + this.r * Math.cos(this.phi),
                   this.cible.z + this.r * sp * Math.cos(this.theta));
    c.lookAt(this.cible);
  };
  Scene.prototype.image = function(dt){
    const s = this;
    if(s.vol){
      s.vol.t += dt / s.vol.d;
      let t = Math.min(1, s.vol.t); t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      s.cible.lerpVectors(s.vol.de.c, s.vol.a.c, t);
      s.r = Math.exp(lisse(Math.log(s.vol.de.r), Math.log(s.vol.a.r), t));
      s.phi = lisse(s.vol.de.phi, s.vol.a.phi, t);
      let dth = s.vol.a.theta - s.vol.de.theta; dth = Math.atan2(Math.sin(dth), Math.cos(dth));
      s.theta = s.vol.de.theta + dth * t;
      if(s.vol.t >= 1) s.vol = null;
    }
    s.majCamera();
    s.rendu.render(s.scene, s.cam);
    const w = s.hote.clientWidth, h = s.hote.clientHeight, v = new T.Vector3();
    s.etiquettes.forEach(x => {
      if(!x.vis){ x.el.style.display = 'none'; return; }
      const p = (typeof x.ou === 'function') ? x.ou() : x.ou;
      if(!p){ x.el.style.display = 'none'; return; }
      v.copy(p).project(s.cam);
      if(v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2){ x.el.style.display = 'none'; return; }
      x.el.style.display = '';
      x.el.style.transform = 'translate(' + ((v.x + 1) / 2 * w + x.dx).toFixed(1) + 'px,' + ((1 - v.y) / 2 * h + x.dy).toFixed(1) + 'px)';
    });
  };
  /* La boucle : seulement quand on regarde (o.visible) — sinon rien ne tourne */
  Scene.prototype.demarrer = function(chaqueImage){
    const s = this;
    s.vie = true;
    const pas = (t) => {
      if(!s.vie) return;
      /* ⚡ v1399 — sa fenêtre est fermée (retirée de la page) : la scène
         se libère d'elle-même (un téléphone n'a qu'une poignée de 3D) */
      if(!s.hote.isConnected){ s.detruire(); return; }
      requestAnimationFrame(pas);
      if(s.o.visible && !s.o.visible()) { s.dernier = 0; return; }
      const dt = s.dernier ? Math.min(0.1, (t - s.dernier) / 1000) : 0.016;
      s.dernier = t;
      if(chaqueImage) chaqueImage(dt);
      s.image(dt);
    };
    requestAnimationFrame(pas);
  };
  Scene.prototype.detruire = function(){
    this.vie = false;
    if(this.obs) this.obs.disconnect();
    liberer(this.scene);
    try{ this.rendu.dispose(); this.rendu.forceContextLoss && this.rendu.forceContextLoss(); }catch(e){}
    this.hote.innerHTML = '';
  };

  /* ============================================================
     LES VOITURES — A3 et Q3, blanches. En mètres : x de l'arrière
     vers l'avant, y vers le haut, z vers la DROITE de la voiture.
     Le groupe est centré ; son avant regarde vers +x.
     ⚠️ PROVISOIRES : remplacées par les scans de David.
     ============================================================ */
  function ombreTexture(){
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    r.addColorStop(0, 'rgba(0,0,0,.42)'); r.addColorStop(0.55, 'rgba(0,0,0,.18)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  }
  /* ============================================================
     📷 LES SCANS DES VOITURES (v1403)

     David, le 10 novembre : un Q3 scanné à l'iPhone (Scaniverse).
     Nettoyé ici (le sol et l'abri autour retirés, remis droit, l'avant
     vers +x, allégé à 45 000 triangles et une texture de 2048 px) :
     modeles/q3.glb, et une version légère pour le parc en direct
     (modeles/q3-leger.glb). Lus sans GLTFLoader : un .glb, c'est un
     en-tête, du JSON et un bloc binaire — trente lignes.

     Le fichier est à côté de ce script (le même dossier « modeles »
     dans l'appli et dans l'espace élève). Pas de scan, ou trop lent :
     la voiture dessinée prend sa place, rien ne casse.
     ============================================================ */
  const ICI = (() => { try{ const s = document.currentScript && document.currentScript.src; return s ? s.replace(/[?#].*$/, '').replace(/[^\/]*$/, '') : ''; }catch(e){ return ''; } })();
  const SCANS_FICHIERS = { 'q3': 'modeles/q3.glb?v=1', 'q3-leger': 'modeles/q3-leger.glb?v=1' };
  const SCANS_CHARGES = {};
  const scansEnCours = {};
  function lireGLB(buf){
    const dv = new DataView(buf);
    if(dv.getUint32(0, true) !== 0x46546C67) return Promise.reject(new Error('pas un glb'));
    const l0 = dv.getUint32(12, true);
    const js = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, l0)));
    const off = 20 + l0 + 8, bv = js.bufferViews;
    const acc = i => {
      const a = js.accessors[i], v = bv[a.bufferView], n = { VEC3: 3, VEC2: 2, SCALAR: 1 }[a.type];
      const deb = off + (v.byteOffset || 0) + (a.byteOffset || 0);
      return a.componentType === 5125 ? new Uint32Array(buf.slice(deb, deb + a.count * 4)) : new Float32Array(buf.slice(deb, deb + a.count * n * 4));
    };
    const pr = js.meshes[0].primitives[0];
    const im = bv[js.images[0].bufferView];
    const url = URL.createObjectURL(new Blob([new Uint8Array(buf, off + (im.byteOffset || 0), im.byteLength)], { type: js.images[0].mimeType || 'image/jpeg' }));
    return new Promise((ok, non) => {
      const img = new Image();
      img.onload = () => {
        const tex = new T.Texture(img); tex.flipY = false; tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; tex.needsUpdate = true;
        URL.revokeObjectURL(url);
        ok({ p: acc(pr.attributes.POSITION), u: acc(pr.attributes.TEXCOORD_0), i: acc(pr.indices), tex: tex });
      };
      img.onerror = () => { URL.revokeObjectURL(url); non(new Error('texture')); };
      img.src = url;
    });
  }
  function scan(nom){
    if(!SCANS_FICHIERS[nom]) return Promise.resolve(null);
    if(SCANS_CHARGES[nom]) return Promise.resolve(SCANS_CHARGES[nom]);
    if(!scansEnCours[nom]){
      scansEnCours[nom] = fetch(ICI + SCANS_FICHIERS[nom])
        .then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
        .then(lireGLB)
        .then(x => (SCANS_CHARGES[nom] = x))
        .catch(e => { delete scansEnCours[nom]; console.log('Scan ' + nom + ' : ' + ((e && e.message) || e)); return null; });
    }
    return scansEnCours[nom];
  }
  /* les scans, avant de dessiner : la version légère (parc) ou la complète ;
     on n'attend pas plus de « delai » ms — la voiture dessinée attend son tour */
  function scans(leger, delai){
    const l = Object.keys(SCANS_FICHIERS).filter(k => /-leger$/.test(k) === !!leger);
    return Promise.race([Promise.all(l.map(scan)), new Promise(ok => setTimeout(ok, delai || 12000))]);
  }

  /* ============================================================
     🚗 v1403 — L'A3 SPORTBACK ET LE Q3, MOULÉS D'APRÈS LEURS COTES

     David, le 10 novembre : « c'est une galère la 3D, essaye de coder
     les modèles A3 Sportback après 2021 et Q3 après 2021 ». Les scans
     iPhone sont abandonnés : les deux voitures sont dessinées ici.

     ⚠️ CE NE SONT PLUS DES PROFILS EXTRUDÉS (une tranche de côté
     étirée sur la largeur) : la carrosserie est MOULÉE, section après
     section, de l'arrière à l'avant — la largeur s'arrondit aux
     angles, les flancs se bombent, le vitrage rentre vers le toit
     (le « tumblehome »), les passages de roue sont creusés dans le bas
     de caisse. Les cotes sont celles des catalogues :
       · A3 Sportback (8Y, 2020→) : 4,34 × 1,82 × 1,45 m, empattement
         2,64 m, roues 225/45 R17 ;
       · Q3 (F3, 2018→) : 4,48 × 1,85 × 1,62 m (barres de toit
         comprises), empattement 2,68 m, roues 235/55 R18, bas de
         caisse et passages de roue en noir.
     Pas de logo ni d'anneaux (la marque est déposée) : la calandre est
     une calandre, les feux sont des feux.

     ⚠️ CHAQUE MORCEAU GARDE SON NOM (userData.part) : la carrosserie,
     le toit, le pare-brise, la lunette, les vitres, le hayon, le capot
     — c'est ce que comparent le jeu des vérifications (ec-verifs3d.js)
     et la carrosserie (ec-carro3d.js, qui vise par rayons, donc suit
     toute forme). Les petites pièces (feux, plaques, trappe, balais…)
     sont POSÉES SUR LA CARROSSERIE par un rayon lancé vers elle : elles
     épousent la forme au lieu de flotter à une cote recopiée.

     Repère : x de l'arrière (0) vers l'avant (L) avant recentrage,
     y vers le haut (le sol à 0), z vers la DROITE (côté trottoir) —
     le conducteur est en −z.
     ============================================================ */
  const MODELES_3D = {
    a3: {
      L: 4.343, W: 1.816, rw: 0.317, xr: 0.819, xf: 3.455, voie: 1.55,
      /* le dessus, de l'arrière à l'avant : hayon, lunette, toit, pare-brise, capot, nez */
      haut: [[0, 0.62], [0.03, 0.90], [0.08, 1.04], [0.16, 1.18], [0.26, 1.31], [0.34, 1.375], [0.50, 1.405], [0.90, 1.43],
             [1.60, 1.449], [2.10, 1.44], [2.40, 1.405], [2.62, 1.32], [2.85, 1.18], [3.10, 1.005], [3.40, 0.955], [3.80, 0.90],
             [4.10, 0.84], [4.25, 0.77], [4.32, 0.66], [4.343, 0.54]],
      bas: [[0, 0.40], [0.04, 0.28], [0.16, 0.21], [0.40, 0.18], [4.05, 0.18], [4.22, 0.22], [4.31, 0.27], [4.343, 0.33]],
      ceinture: [[0, 1.00], [0.5, 1.04], [3.1, 0.975], [4.343, 0.95]],
      R: [0.42, 0.55],             /* l'arrondi des angles, vus de dessus : arrière, avant */
      toit: 0.35,                  /* ce que le vitrage rentre, de la ceinture au toit */
      vitres: { ws: [3.12, 2.45], b: [1.80, 1.88], q: [0.95, 0.99], c: 0.58, cPente: 0.9 },
      noir: 0, barres: false,
      feuxAvY: 0.76, feuxArY: 0.98, plaqueArY: 0.80, plaqueArSurHayon: true, hayonBas: 0.56
    },
    q3: {
      L: 4.48, W: 1.849, rw: 0.358, xr: 0.90, xf: 3.62, voie: 1.58,
      /* relevé sur le scan de David (10 novembre) */
      haut: [[0, 0.75], [0.06, 1.05], [0.15, 1.18], [0.30, 1.27], [0.42, 1.40], [0.55, 1.50], [0.80, 1.555], [1.20, 1.58],
             [2.30, 1.575], [2.55, 1.55], [2.70, 1.52], [2.85, 1.45], [3.00, 1.33], [3.20, 1.15], [3.38, 1.085], [3.60, 1.035],
             [3.90, 0.99], [4.10, 0.945], [4.25, 0.89], [4.38, 0.81], [4.48, 0.68]],
      bas: [[0, 0.50], [0.05, 0.36], [0.18, 0.28], [0.45, 0.25], [4.15, 0.25], [4.33, 0.29], [4.44, 0.36], [4.48, 0.44]],
      ceinture: [[0, 1.15], [0.6, 1.14], [3.38, 1.11], [4.48, 1.09]],
      R: [0.40, 0.50],
      toit: 0.29,
      vitres: { ws: [3.38, 2.80], b: [2.03, 2.12], q: [1.16, 1.21], c: 0.66, cPente: 0.90 },
      noir: 0.46, barres: true,
      feuxAvY: 0.80, feuxArY: 1.01, plaqueArY: 0.96, plaqueArSurHayon: true, hayonBas: 0.79
    }
  };

  /* une courbe douce qui passe par les points (Hermite monotone : pas de bosse parasite) */
  function courbe(pts){
    const n = pts.length, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const d = [], m = new Array(n).fill(0);
    for(let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / ((xs[i + 1] - xs[i]) || 1e-6));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for(let i = 1; i < n - 1; i++) m[i] = (d[i - 1] * d[i] <= 0) ? 0 : (d[i - 1] + d[i]) / 2;
    for(let i = 0; i < n - 1; i++){
      if(d[i] === 0){ m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if(s > 9){ const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return x => {
      if(x <= xs[0]) return ys[0];
      if(x >= xs[n - 1]) return ys[n - 1];
      let i = 0; while(i < n - 2 && x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }

  function voiture3D(o){
    o = o || {};
    const PI = Math.PI;
    const M = MODELES_3D[o.modele === 'q3' ? 'q3' : 'a3'];
    const L = M.L, W = M.W, Wh = W / 2, rw = M.rw;
    const g = new T.Group(), parts = {}, inter = new T.Group();
    g.add(inter);
    const nom = (m, n) => { m.userData.part = n; (parts[n] = parts[n] || []).push(m); return m; };

    const mCaisse = mat(o.couleur || 0xF4F5F2, { metalness: 0.25, roughness: 0.28 });
    const mVitre = new T.MeshStandardMaterial({ color: 0x1B2530, roughness: 0.08, metalness: 0.55, side: T.DoubleSide });
    const mNoir = mat(0x1E2125, { roughness: 0.65 });
    const mNoirBrillant = mat(0x111316, { roughness: 0.2, metalness: 0.3 });
    const mPlastique = mat(0x2B2E33, { roughness: 0.85 });
    const mPneu = mat(0x1A1B1E, { roughness: 0.92 });
    const mJante = mat(0xB9BFC7, { metalness: 0.65, roughness: 0.28 });
    const mAlu = mat(0xA9AFB7, { metalness: 0.7, roughness: 0.3 });

    /* ---- les profils ---- */
    const haut = courbe(M.haut), bas0 = courbe(M.bas), ceint = courbe(M.ceinture);
    const ra = rw + 0.05;
    const bas = x => {
      let y = bas0(x);
      [M.xr, M.xf].forEach(cx => { const d = Math.abs(x - cx); if(d < ra) y = Math.max(y, rw + Math.sqrt(ra * ra - d * d)); });
      return y;
    };
    const demi = x => {
      let w = Wh;
      const arr = (d, R) => d < R ? Wh - R + Math.sqrt(Math.max(0, R * R - (R - d) * (R - d))) : Wh;
      w = Math.min(w, arr(x, M.R[0]), arr(L - x, M.R[1]));
      return w;
    };
    const ceinture = x => Math.min(haut(x), ceint(x));

    /* la forme du haut de la section à x : où le flanc tourne vers le toit */
    const geom = x => {
      const yb = bas(x), yt = haut(x), yc = ceinture(x), wb = demi(x), h = Math.max(0, yt - yc), part = Math.min(1, h / 0.32);
      const wt = wb - (0.06 + part * (M.toit - 0.06)), rr = Math.min(0.11, h * 0.32);
      return { yb: yb, yt: yt, yc: yc, wb: wb, wt: wt, rr: rr, bord: wt - rr * 0.55, yBord: yt - rr * 0.55 };
    };
    /* ---- la section à l'abscisse x : du dessous (axe) au dessus (axe), côté droit ---- */
    const NS = o.leger ? 9 : 18;     /* points par moitié de section, après lissage */
    function section(x){
      const yb = bas(x), yt = haut(x), yc = ceinture(x), wb = demi(x);
      const hBas = Math.max(0.02, yc - yb), h = Math.max(0, yt - yc);
      const part = Math.min(1, h / 0.32);
      const wt = wb - (0.06 + part * (M.toit - 0.06));
      const rr = Math.min(0.11, h * 0.32);
      const bombe = 0.035 + 0.02 * part;
      const P = [
        [0, yb], [wb * 0.6, yb], [wb - 0.09, yb + 0.004], [wb - 0.03, yb + Math.min(0.06, hBas * 0.2)],
        [wb, yb + hBas * 0.42], [wb, yb + hBas * 0.74], [wb - 0.022, yc - Math.min(0.03, hBas * 0.08)], [wb - 0.06, yc],
        [(wb - 0.06) * 0.5 + wt * 0.5, yc + (h - rr) * 0.5], [wt, yt - rr], [wt - rr * 0.5, yt - rr * 0.1], [wt - rr - 0.02, yt],
        [wt * 0.45, yt + bombe * 0.8], [0, yt + bombe]
      ];
      /* lissage : Catmull-Rom, le même nombre de points à chaque section */
      const out = [];
      const k = P.length - 1;
      for(let i = 0; i <= NS; i++){
        const u = i / NS * k, j = Math.min(k - 1, Math.floor(u)), t = u - j;
        const p0 = P[Math.max(0, j - 1)], p1 = P[j], p2 = P[j + 1], p3 = P[Math.min(k, j + 2)];
        const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
        out.push([Math.max(0, cr(p0[0], p1[0], p2[0], p3[0])), cr(p0[1], p1[1], p2[1], p3[1])]);
      }
      out[0][0] = 0; out[NS][0] = 0;
      return out;
    }

    /* ---- la peau : sections de l'arrière à l'avant, puis on la coupe en morceaux nommés ---- */
    const NX = o.leger ? 34 : 96;
    const xs = [];
    for(let i = 0; i < NX; i++) xs.push(L * (1 - Math.cos(PI * i / (NX - 1))) / 2);
    const sects = xs.map(section);
    const nb = 2 * NS + 1;                                   /* de −z à +z en passant par le dessus et le dessous */
    const pos = [];
    xs.forEach((x, i) => {
      const s = sects[i];
      for(let j = NS; j >= 0; j--) pos.push(x, s[j][1], -s[j][0]);      /* le haut, côté gauche → l'axe du dessous */
    });
    /* ⚠️ une section fermée : on la parcourt dessous → droite → dessus → gauche, en anneau */
    const anneau = (i) => {
      const s = sects[i], r = [];
      for(let j = 0; j <= NS; j++) r.push([s[j][0], s[j][1]]);            /* dessous → dessus, à droite */
      for(let j = NS - 1; j >= 1; j--) r.push([-s[j][0], s[j][1]]);       /* dessus → dessous, à gauche */
      return r;
    };
    const P = [], I = [];
    const na = 2 * NS;
    xs.forEach((x, i) => { anneau(i).forEach(p => P.push(x, p[1], p[0])); });
    for(let i = 0; i < NX - 1; i++){
      for(let j = 0; j < na; j++){
        const a = i * na + j, b = i * na + (j + 1) % na, c = (i + 1) * na + j, d = (i + 1) * na + (j + 1) % na;
        I.push(a, c, b, b, c, d);
      }
    }
    /* les deux bouts : bouchés par un éventail depuis leur centre */
    [0, NX - 1].forEach((i, k) => {
      const cIdx = P.length / 3;
      const r = anneau(i);
      let cy = 0; r.forEach(p => { cy += p[1]; }); cy /= r.length;
      P.push(xs[i], cy, 0);
      for(let j = 0; j < na; j++){
        const a = i * na + j, b = i * na + (j + 1) % na;
        if(k === 0) I.push(cIdx, a, b); else I.push(cIdx, b, a);
      }
    });
    const peau = new T.BufferGeometry();
    peau.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    peau.setIndex(I);
    peau.computeVertexNormals();
    const N = peau.attributes.normal.array;

    /* ============================================================
       LA PEINTURE : QUATRE TOILES PROJETÉES (côté, avant, arrière, dessus)

       Chaque triangle prend la toile vers laquelle il regarde le plus,
       et sa coordonnée de texture est sa position vue de là. Les vitres,
       la calandre, les feux, les joints de portes sont DESSINÉS sur ces
       toiles (des courbes nettes) au lieu de suivre les triangles (des
       marches d'escalier). Les pièces que le jeu demande gardent leur
       volume nommé, posé dessus (voir plus bas).
       ============================================================ */
    const Ht = 1.75;
    const V = M.vitres;
    const capotDe = { x0: V.ws[0] + 0.02, x1: L - 0.07 };
    const fonce = (g2, x0, y0, x1, y1) => { const d = g2.createLinearGradient(x0, y0, x1, y1); d.addColorStop(0, '#2E3B48'); d.addColorStop(0.5, '#18212B'); d.addColorStop(1, '#0F151C'); return d; };
    const blanc = '#F2F3F0', noirP = '#2A2D32', noirB = '#14171B', joint = 'rgba(40,44,50,.75)';
    const toile = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g2 = c.getContext('2d'); g2.fillStyle = blanc; g2.fillRect(0, 0, w, h); f(g2, w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };
    const Q = o.leger ? 0.5 : 1;
    /* ---- le côté (x, y) ---- */
    const texCote = toile(Math.round(2048 * Q), Math.round(820 * Q), (g2, w, h) => {
      const X = x => x / L * w, Y = y => h - y / Ht * h;
      const yb = x => ceinture(x) + 0.012;
      /* le bas noir du Q3, et ses élargisseurs d'ailes */
      if(M.noir){
        g2.fillStyle = noirP; g2.fillRect(0, Y(M.noir), w, h);
        [M.xr, M.xf].forEach(cx => { g2.beginPath(); g2.arc(X(cx), Y(rw), (ra + 0.075) / L * w, 0, 2 * PI); g2.fill(); });
      }else{
        g2.fillStyle = 'rgba(0,0,0,.10)'; g2.fillRect(X(M.xr + ra), Y(0.30), X(M.xf - ra) - X(M.xr + ra), Y(0.26) - Y(0.30));
        /* la ligne de caractère au-dessus des roues */
        g2.strokeStyle = 'rgba(0,0,0,.12)'; g2.lineWidth = 3 * Q; g2.beginPath(); g2.moveTo(X(0.15), Y(0.86)); g2.lineTo(X(L - 0.25), Y(0.82)); g2.stroke();
      }
      /* l'intérieur des passages de roue (le dessous les voit par cette toile) et le dessous */
      g2.fillStyle = '#17191C';
      [M.xr, M.xf].forEach(cx => { g2.beginPath(); g2.arc(X(cx), Y(rw), (ra - 0.004) / L * w, 0, 2 * PI); g2.fill(); });
      for(let x = 0; x <= L; x += 0.02){ const y = bas(x); if(y < rw) g2.fillRect(X(x) - 1, Y(y + 0.006), X(0.02) + 2, h); }
      /* les vitres : la surface vitrée d'un seul tenant, puis les montants par-dessus */
      const pts = [];
      const xC0 = V.c, xA0 = V.ws[0] - 0.10;
      const ytop = x => geom(x).yBord - 0.035;
      pts.push([xC0, yb(xC0)]);
      for(let k = 0; k <= 10; k++){ const x = xC0 + 0.12 + k / 10 * 0.0; }
      /* le montant arrière monte en biais vers l'avant */
      const xCt = xC0 + (ytop(xC0 + 0.45) - yb(xC0)) / V.cPente;
      pts.push([xCt, ytop(xCt)]);
      for(let x = xCt; x < V.ws[1] - 0.06; x += 0.05) pts.push([x, ytop(x)]);
      pts.push([V.ws[1] - 0.06, ytop(V.ws[1] - 0.06)]);
      pts.push([xA0, yb(xA0)]);
      g2.fillStyle = fonce(g2, 0, Y(1.6), 0, Y(0.9));
      g2.beginPath(); pts.forEach((p, i) => { if(i) g2.lineTo(X(p[0]), Y(p[1])); else g2.moveTo(X(p[0]), Y(p[1])); }); g2.closePath(); g2.fill();
      /* le reflet du ciel */
      g2.save(); g2.clip(); g2.fillStyle = 'rgba(190,210,230,.16)'; g2.beginPath(); g2.moveTo(X(xC0), Y(1.7)); g2.lineTo(X(xC0 + 1.4), Y(1.7)); g2.lineTo(X(xC0 + 0.9), Y(0.9)); g2.lineTo(X(xC0 - 0.5), Y(0.9)); g2.fill(); g2.restore();
      /* le joint chromé/noir du tour de vitre */
      g2.strokeStyle = M.noir ? '#1B1E22' : '#8D939A'; g2.lineWidth = 6 * Q; g2.beginPath(); pts.forEach((p, i) => { if(i) g2.lineTo(X(p[0]), Y(p[1])); else g2.moveTo(X(p[0]), Y(p[1])); }); g2.closePath(); g2.stroke();
      /* les montants : central (noir brillant), entre porte et custode */
      g2.fillStyle = noirB;
      [V.b, V.q].forEach(b => { g2.beginPath(); g2.moveTo(X(b[0]), Y(yb(b[0]))); g2.lineTo(X(b[1]), Y(yb(b[1]))); g2.lineTo(X(b[1] - 0.04), Y(ytop(b[1]))); g2.lineTo(X(b[0] - 0.04), Y(ytop(b[0]))); g2.closePath(); g2.fill(); });
      /* les joints de portes */
      g2.strokeStyle = joint; g2.lineWidth = 2.2 * Q;
      const ligne = (l) => { g2.beginPath(); l.forEach((p, i) => { if(i) g2.lineTo(X(p[0]), Y(p[1])); else g2.moveTo(X(p[0]), Y(p[1])); }); g2.stroke(); };
      const yS = M.noir ? M.noir + 0.01 : 0.28;
      ligne([[xA0 + 0.02, yb(xA0)], [xA0 + 0.06, 0.80], [M.xf - ra - 0.03, 0.62], [M.xf - ra - 0.03, yS]]);             /* l'avant de la porte avant */
      ligne([[V.b[0] + 0.03, yb(V.b[0])], [V.b[0] + 0.05, yS]]);                                                        /* entre les portes */
      ligne([[V.q[0] + 0.02, yb(V.q[0])], [V.q[0] + 0.02, rw + ra + 0.06], [M.xr + ra * 0.75, rw + ra * 0.70], [M.xr + ra + 0.02, yS]]);   /* l'arrière de la porte arrière */
      ligne([[0.02, yb(0.2) - 0.02], [L - 0.05, yb(L - 0.2) - 0.02]].map(p => p));
      /* le bas des portes */
      ligne([[M.xr + ra + 0.02, yS + 0.005], [M.xf - ra - 0.03, yS + 0.005]]);
      /* les poignées */
      g2.fillStyle = '#C9CED4';
      [V.b[1] + 0.36, V.q[1] + 0.36].forEach(x => { const y = yb(x) - 0.12; g2.beginPath(); g2.roundRect ? g2.roundRect(X(x), Y(y + 0.012), X(0.16), Y(0) - Y(0.024), 6 * Q) : g2.rect(X(x), Y(y + 0.012), X(0.16), Y(0) - Y(0.024)); g2.fill(); });
      /* les feux qui tournent sur l'aile (vus du côté) */
      g2.fillStyle = '#E8EEF5'; g2.beginPath(); g2.moveTo(X(L - 0.22), Y(M.feuxAvY + 0.03)); g2.lineTo(X(L - 0.02), Y(M.feuxAvY + 0.05)); g2.lineTo(X(L - 0.02), Y(M.feuxAvY - 0.05)); g2.lineTo(X(L - 0.18), Y(M.feuxAvY - 0.03)); g2.fill();
      g2.fillStyle = '#B0151E'; g2.beginPath(); g2.moveTo(X(0.02), Y(M.feuxArY + 0.055)); g2.lineTo(X(0.24), Y(M.feuxArY + 0.04)); g2.lineTo(X(0.22), Y(M.feuxArY - 0.03)); g2.lineTo(X(0.02), Y(M.feuxArY - 0.05)); g2.fill();
    });
    /* ---- l'avant (z, y) : calandre, prises d'air, phares ---- */
    const texAvant = toile(Math.round(1024 * Q), Math.round(1024 * Q), (g2, w, h) => {
      const Z = z => (z + Wh) / W * w, Y = y => h - y / Ht * h;
      const yP = M.feuxAvY;
      /* la calandre : un grand hexagone sombre, sans emblème */
      const gh = M.noir ? 0.54 : 0.50, gb = M.noir ? 0.30 : 0.27, lh = M.noir ? 0.40 : 0.36, lb = M.noir ? 0.33 : 0.30, lm = M.noir ? 0.45 : 0.40;
      const yM = (gh + gb) / 2 + 0.06;
      g2.fillStyle = noirB; g2.beginPath();
      g2.moveTo(Z(-lh), Y(yP - 0.04)); g2.lineTo(Z(lh), Y(yP - 0.04)); g2.lineTo(Z(lm), Y(yM)); g2.lineTo(Z(lb), Y(gb)); g2.lineTo(Z(-lb), Y(gb)); g2.lineTo(Z(-lm), Y(yM)); g2.closePath(); g2.fill();
      g2.strokeStyle = '#9AA0A7'; g2.lineWidth = 6 * Q; g2.stroke();
      g2.save(); g2.clip(); g2.strokeStyle = '#3A3F46'; g2.lineWidth = 3 * Q;
      for(let y = gb; y < yP; y += 0.035){ g2.beginPath(); g2.moveTo(Z(-0.6), Y(y)); g2.lineTo(Z(0.6), Y(y)); g2.stroke(); }
      for(let z = -0.6; z < 0.6; z += 0.07){ g2.beginPath(); g2.moveTo(Z(z), Y(gb)); g2.lineTo(Z(z), Y(yP)); g2.stroke(); }
      g2.restore();
      [-1, 1].forEach(c => {
        /* les phares : fins, en biseau vers l'extérieur */
        g2.fillStyle = '#20262E'; g2.beginPath();
        g2.moveTo(Z(c * (lh + 0.02)), Y(yP - 0.03)); g2.lineTo(Z(c * (Wh - 0.03)), Y(yP + 0.035)); g2.lineTo(Z(c * (Wh - 0.05)), Y(yP + 0.085)); g2.lineTo(Z(c * (lh + 0.05)), Y(yP + 0.05)); g2.closePath(); g2.fill();
        g2.strokeStyle = '#F4F9FF'; g2.lineWidth = 7 * Q; g2.beginPath(); g2.moveTo(Z(c * (lh + 0.06)), Y(yP + 0.03)); g2.lineTo(Z(c * (Wh - 0.06)), Y(yP + 0.07)); g2.stroke();
        g2.fillStyle = '#DDE7F2'; [0.52, 0.64].forEach(z => { g2.beginPath(); g2.arc(Z(c * z), Y(yP + 0.025), 0.022 / W * w, 0, 2 * PI); g2.fill(); });
        /* les prises d'air sur les côtés */
        g2.fillStyle = noirB; g2.beginPath();
        g2.moveTo(Z(c * (lb + 0.08)), Y(gb + 0.02)); g2.lineTo(Z(c * (Wh - 0.10)), Y(gb + 0.05)); g2.lineTo(Z(c * (Wh - 0.08)), Y(gb + 0.15)); g2.lineTo(Z(c * (lm + 0.06)), Y(gb + 0.14)); g2.closePath(); g2.fill();
      });
      /* la lèvre du bas */
      g2.fillStyle = M.noir ? noirP : '#3A3E44'; g2.fillRect(0, Y(gb - 0.05), w, h);
    });
    /* ---- l'arrière (z, y) : lunette, feux, hayon ---- */
    const texArriere = toile(Math.round(1024 * Q), Math.round(1024 * Q), (g2, w, h) => {
      const Z = z => (z + Wh) / W * w, Y = y => h - y / Ht * h;
      const yF = M.feuxArY, yL0 = ceinture(0.25) + 0.03, yL1 = haut(0.5) - 0.06;
      /* la lunette */
      g2.fillStyle = fonce(g2, 0, Y(yL1), 0, Y(yL0));
      g2.beginPath(); g2.moveTo(Z(-Wh + 0.30), Y(yL0)); g2.lineTo(Z(Wh - 0.30), Y(yL0)); g2.lineTo(Z(Wh - 0.40), Y(yL1)); g2.lineTo(Z(-Wh + 0.40), Y(yL1)); g2.closePath(); g2.fill();
      /* le becquet */
      g2.fillStyle = noirB; g2.fillRect(Z(-0.35), Y(yL1 + 0.04), Z(0.35) - Z(-0.35), Y(yL1) - Y(yL1 + 0.04));
      /* les feux, en bandeau vers les angles */
      [-1, 1].forEach(c => {
        g2.fillStyle = '#7E0D14'; g2.beginPath();
        g2.moveTo(Z(c * 0.30), Y(yF - 0.04)); g2.lineTo(Z(c * (Wh - 0.02)), Y(yF - 0.05)); g2.lineTo(Z(c * (Wh - 0.03)), Y(yF + 0.06)); g2.lineTo(Z(c * 0.32), Y(yF + 0.05)); g2.closePath(); g2.fill();
        g2.strokeStyle = '#FF3B44'; g2.lineWidth = 5 * Q; g2.beginPath(); g2.moveTo(Z(c * 0.34), Y(yF + 0.015)); g2.lineTo(Z(c * (Wh - 0.06)), Y(yF + 0.01)); g2.stroke();
        g2.fillStyle = '#B0141C'; g2.fillRect(Z(c * (Wh - 0.14)) - (c > 0 ? 0 : 14 * Q), Y((M.noir ? 0.42 : 0.38)), 14 * Q, 6 * Q);
      });
      /* les joints du hayon */
      g2.strokeStyle = joint; g2.lineWidth = 2.5 * Q; g2.beginPath();
      const yH0 = M.hayonBas;
      g2.moveTo(Z(-Wh + 0.24), Y(yL1 + 0.05)); g2.lineTo(Z(-Wh + 0.30), Y(yF)); g2.lineTo(Z(-0.30), Y(yF - 0.06)); g2.lineTo(Z(-0.42), Y(yH0)); g2.lineTo(Z(0.42), Y(yH0)); g2.lineTo(Z(0.30), Y(yF - 0.06)); g2.lineTo(Z(Wh - 0.30), Y(yF)); g2.lineTo(Z(Wh - 0.24), Y(yL1 + 0.05)); g2.stroke();
      /* le bas du bouclier */
      g2.fillStyle = M.noir ? noirP : '#3A3E44'; g2.fillRect(0, Y(M.noir ? 0.55 : 0.30), w, h);
      if(!M.noir){ g2.fillStyle = '#9AA0A7'; g2.fillRect(Z(-0.55), Y(0.30), Z(0.55) - Z(-0.55), 4 * Q); }
    });
    /* ---- le dessus (x, z) : pare-brise, toit, capot ---- */
    const texDessus = toile(Math.round(2048 * Q), Math.round(1024 * Q), (g2, w, h) => {
      const X = x => x / L * w, Z = z => (z + Wh) / W * h;
      const bordV = x => Math.max(0.2, geom(x).bord - 0.075);
      const wsB = bordV(V.ws[0] - 0.02);
      /* le pare-brise : ses bords suivent la tournure du toit (le montant reste blanc des deux côtés) */
      g2.fillStyle = fonce(g2, X(V.ws[1]), 0, X(V.ws[0]), 0);
      g2.beginPath();
      for(let x = V.ws[1]; x <= V.ws[0]; x += 0.03) g2.lineTo(X(x), Z(-bordV(x)));
      for(let x = V.ws[0]; x >= V.ws[1]; x -= 0.03) g2.lineTo(X(x), Z(bordV(x)));
      g2.closePath(); g2.fill();
      /* la grille d'auvent, au pied du pare-brise */
      g2.fillStyle = noirP; g2.fillRect(X(V.ws[0]), Z(-wsB), X(0.07), Z(wsB) - Z(-wsB));
      /* la lunette, vue d'en haut (sa partie couchée) */
      const xr0 = 0.06, xr1 = M.lunette || 0.48;
      g2.fillStyle = fonce(g2, X(xr0), 0, X(xr1), 0);
      g2.beginPath();
      for(let x = xr0; x <= xr1; x += 0.02) g2.lineTo(X(x), Z(-bordV(x) + 0.02));
      for(let x = xr1; x >= xr0; x -= 0.02) g2.lineTo(X(x), Z(bordV(x) - 0.02));
      g2.closePath(); g2.fill();
      g2.fillStyle = noirB; g2.fillRect(X(xr1 - 0.01), Z(-0.35), X(0.05), Z(0.35) - Z(-0.35));
      /* les nervures du capot */
      g2.strokeStyle = 'rgba(0,0,0,.10)'; g2.lineWidth = 3 * Q;
      [-1, 1].forEach(c => { g2.beginPath(); g2.moveTo(X(V.ws[0] + 0.1), Z(c * 0.42)); g2.lineTo(X(L - 0.12), Z(c * 0.50)); g2.stroke(); });
      /* le joint du capot */
      if(!o.capot){ g2.strokeStyle = joint; g2.lineWidth = 2 * Q; g2.strokeRect(X(capotDe.x0), Z(-Wh + 0.06), X(capotDe.x1) - X(capotDe.x0), Z(Wh - 0.06) - Z(-Wh + 0.06)); }
    });
    const mProj = (t) => new T.MeshStandardMaterial({ map: t, color: o.couleur ? new T.Color(o.couleur).convertSRGBToLinear().lerp(new T.Color(0xffffff), 0) : 0xffffff, metalness: 0.18, roughness: 0.32 });
    const mats = { cote: mProj(texCote), avant: mProj(texAvant), arriere: mProj(texArriere), dessus: mProj(texDessus) };
    mats.dessous = mats.cote;
    if(o.couleur){ Object.keys(mats).forEach(k => { if(mats[k].map) mats[k].color = new T.Color(o.couleur); }); }

    /* ---- chaque triangle : sa toile, son morceau (le nom que le jeu lit) ---- */
    const nomDe = (cx, cy, cz, nx, ny, nz, toileNom) => {
      const yc = ceinture(cx);
      if(o.capot && cx > capotDe.x0 && cx < capotDe.x1 && ny > 0.42 && cy > yc - 0.14 && Math.abs(cz) < Wh - 0.05) return 'capot';
      if(cy <= yc + 0.008){
        if(cx < 0.22 && nx < -0.45 && cy > M.hayonBas && Math.abs(cz) < Wh - 0.24) return 'hayon';
        return 'caisse';
      }
      if(toileNom === 'dessus') return (cx > V.ws[1] - 0.05) ? 'parebrise' : (cx < 0.52 ? 'lunette' : 'pavillon');
      if(toileNom === 'arriere') return 'lunette';
      if(toileNom === 'cote') return 'vitre';
      return 'caisse';
    };
    const tas = {};
    const ix = peau.index.array, pp = peau.attributes.position.array;
    for(let t = 0; t < ix.length; t += 3){
      const a = ix[t], b = ix[t + 1], c = ix[t + 2];
      const cx = (pp[a * 3] + pp[b * 3] + pp[c * 3]) / 3, cy = (pp[a * 3 + 1] + pp[b * 3 + 1] + pp[c * 3 + 1]) / 3, cz = (pp[a * 3 + 2] + pp[b * 3 + 2] + pp[c * 3 + 2]) / 3;
      const nx = (N[a * 3] + N[b * 3] + N[c * 3]) / 3, ny = (N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1]) / 3, nz = (N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2]) / 3;
      const ax = Math.abs(nx), az = Math.abs(nz);
      let toileNom = ny < -0.75 ? 'dessous' : (ny >= ax && ny >= az) ? 'dessus' : (az >= ax) ? 'cote' : (nx > 0 ? 'avant' : 'arriere');
      /* le flanc du vitrage et l'épaule sous lui restent sur la toile du côté :
         sinon la limite côté/dessus passe à travers la vitre, en dents de scie */
      if(toileNom === 'dessus' && az > 0.2){ const gq = geom(cx); if(cy > gq.yc - 0.06 && cy < gq.yBord) toileNom = 'cote'; }
      const nm = nomDe(cx, cy, cz, nx, ny, nz, toileNom);
      const cle = nm + '|' + toileNom;
      const z = tas[cle] = tas[cle] || { nm: nm, tl: toileNom, p: [], n: [], u: [] };
      [a, b, c].forEach(v => {
        const x = pp[v * 3], y = pp[v * 3 + 1], zz = pp[v * 3 + 2];
        z.p.push(x, y, zz); z.n.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]);
        if(toileNom === 'cote' || toileNom === 'dessous') z.u.push(x / L, y / Ht);
        else if(toileNom === 'avant' || toileNom === 'arriere') z.u.push((zz + Wh) / W, y / Ht);
        else z.u.push(x / L, 1 - (zz + Wh) / W);
      });
    }
    const peaux = [];
    let pivot = null, capotMesh = null;
    const capots = [];
    Object.keys(tas).forEach(cle => {
      const z = tas[cle];
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(z.p, 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute(z.n, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(z.u, 2));
      const m = new T.Mesh(geo, z.nm === 'capot' ? mats[z.tl].clone() : mats[z.tl]);
      if(z.nm === 'capot'){ m.material.side = T.DoubleSide; capots.push(m); }
      else inter.add(m);
      nom(m, z.nm);
      peaux.push(m);
    });
    if(capots.length){ capotMesh = new T.Group(); capots.forEach(m => capotMesh.add(m)); }
    peau.dispose();

    /* ============================================================
       📷 LE SCAN, QUAND IL Y EN A UN (David, le 10 novembre : un Q3
       scanné à l'iPhone, Scaniverse). C'est LUI qu'on voit : la vraie
       voiture, lettrage compris. La peau dessinée ci-dessus sert alors
       seulement à savoir où sont les choses ; le scan est découpé en
       morceaux nommés (capot, toit, hayon…) par les mêmes règles, et
       les pièces du jeu deviennent des zones invisibles posées SUR lui.
       ============================================================ */
    const scan = (typeof SCANS_CHARGES === 'object' && SCANS_CHARGES[(o.modele === 'q3' ? 'q3' : 'a3') + (o.leger ? '-leger' : '')]) || null;
    let corpsScan = null;
    if(scan && o.scan !== false){
      peaux.forEach(m => { if(m.parent) m.parent.remove(m); });
      capotMesh = null; capots.length = 0;
      const sp = scan.p, si = scan.i, su = scan.u, decX = L / 2;
      const mScan = new T.MeshBasicMaterial({ map: scan.tex });
      const tas2 = {};
      const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
      for(let t = 0; t < si.length; t += 3){
        const ia = si[t], ib = si[t + 1], ic = si[t + 2];
        a.set(sp[ia * 3] + decX, sp[ia * 3 + 1], sp[ia * 3 + 2]); b.set(sp[ib * 3] + decX, sp[ib * 3 + 1], sp[ib * 3 + 2]); c.set(sp[ic * 3] + decX, sp[ic * 3 + 1], sp[ic * 3 + 2]);
        n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).normalize();
        const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3;
        const ax2 = Math.abs(n.x), az2 = Math.abs(n.z);
        const tl = n.y < -0.75 ? 'dessous' : (n.y >= ax2 && n.y >= az2) ? 'dessus' : (az2 >= ax2) ? 'cote' : (n.x > 0 ? 'avant' : 'arriere');
        const nm = nomDe(cx, cy, cz, n.x, n.y, n.z, tl);
        const z = tas2[nm] = tas2[nm] || { p: [], u: [] };
        [ia, ib, ic].forEach(v => { z.p.push(sp[v * 3] + decX, sp[v * 3 + 1], sp[v * 3 + 2]); z.u.push(su[v * 2], su[v * 2 + 1]); });
      }
      corpsScan = [];
      Object.keys(tas2).forEach(nm => {
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.Float32BufferAttribute(tas2[nm].p, 3));
        geo.setAttribute('uv', new T.Float32BufferAttribute(tas2[nm].u, 2));
        const m = new T.Mesh(geo, nm === 'capot' ? new T.MeshBasicMaterial({ map: scan.tex, side: T.DoubleSide }) : mScan);
        m.userData.scan = true;
        nom(m, nm);
        if(nm === 'capot'){ capotMesh = new T.Group(); capotMesh.add(m); }
        else inter.add(m);
        corpsScan.push(m);
      });
    }

    /* ---- poser une pièce sur la peau : un rayon vers elle ---- */
    const ray = new T.Raycaster();
    const corps = corpsScan || peaux;
    const surPeau = (origine, dir) => {
      ray.set(origine, dir.clone().normalize());
      const h = ray.intersectObjects(corps, false);
      if(!h.length) return null;
      const n = h[0].face ? h[0].face.normal.clone() : dir.clone().negate();
      if(n.dot(dir) > 0) n.negate();
      return { p: h[0].point.clone(), n: n };
    };
    const VZ = new T.Vector3(0, 0, 1);
    /* une plaque (forme 2D) posée à plat sur la peau, tournée selon la normale */
    const poser = (geo, m, hit, decal, rot) => {
      const me = new T.Mesh(geo, m);
      /* face à la normale, le haut de la pièce vers le haut (pas de vrille) */
      me.position.copy(hit.p).addScaledVector(hit.n, decal == null ? 0.006 : decal);
      me.up.set(0, 1, 0);
      if(Math.abs(hit.n.y) > 0.95) me.up.set(1, 0, 0);
      me.lookAt(me.position.clone().add(hit.n));
      if(rot) me.rotateZ(rot);
      return me;
    };
    const forme = (pts, arrondi) => {
      const s = new T.Shape();
      pts.forEach((p, i) => { if(i) s.lineTo(p[0], p[1]); else s.moveTo(p[0], p[1]); });
      return new T.ShapeGeometry(s, arrondi || 1);
    };
    const avant = (y, z) => surPeau(new T.Vector3(L + 1, y, z), new T.Vector3(-1, 0, 0));
    const arriere = (y, z) => surPeau(new T.Vector3(-1, y, z), new T.Vector3(1, 0, 0));
    const cote = (x, y, c) => surPeau(new T.Vector3(x, y, c * 3), new T.Vector3(0, 0, -c));
    const dessus = (x, z) => surPeau(new T.Vector3(x, 4, z), new T.Vector3(0, -1, 0));
    /* sur l'angle avant/arrière : un rayon en biais, pour les feux qui tournent sur l'aile */
    const angle = (bout, y, z, biais) => {
      const sx = bout > 0 ? 1 : -1;
      const o2 = new T.Vector3(bout > 0 ? L + 1 : -1, y, z + Math.sign(z) * biais);
      return surPeau(o2, new T.Vector3(-sx, 0, -Math.sign(z) * biais).normalize());
    };

    /* ---- les passages de roue : le fond noir, pour ne pas voir à travers ---- */
    [M.xr, M.xf].forEach(cx => {
      const fond = boite(ra * 2 - 0.05, 0.5, W - 0.42, mNoir);
      fond.position.set(cx, rw + 0.15, 0);
      inter.add(nom(fond, 'caisse'));
      [-1, 1].forEach(c => {
        const arc = new T.Mesh(new T.CylinderGeometry(ra - 0.005, ra - 0.005, 0.30, 24, 1, true, 0, PI), new T.MeshStandardMaterial({ color: 0x15171A, roughness: 0.9, side: T.DoubleSide }));
        arc.rotation.x = PI / 2; arc.rotation.y = PI / 2; arc.position.set(cx, rw, c * (Wh - 0.19));
        inter.add(nom(arc, 'caisse'));
      });
    });

    /* ---- les roues ---- */
    const roues = [];
    const profilPneu = [];
    const lp = 0.235, rj = rw * 0.66;
    for(let i = 0; i <= 12; i++){
      const a = -PI / 2 + PI * i / 12;
      profilPneu.push(new T.Vector2(rj + (rw - rj) * (0.55 + 0.45 * Math.cos(a)) , lp / 2 * Math.sin(a)));
    }
    [[M.xr, -1], [M.xr, 1], [M.xf, -1], [M.xf, 1]].forEach(p => {
      const r = new T.Group();
      const pneu = new T.Mesh(new T.LatheGeometry(profilPneu, o.leger ? 16 : 36), mPneu);
      pneu.rotation.x = PI / 2; r.add(nom(pneu, 'pneu'));
      const flanc = new T.Mesh(new T.RingGeometry(rj, rw * 0.9, o.leger ? 16 : 36), new T.MeshStandardMaterial({ color: 0x1A1B1E, roughness: 0.9, side: T.DoubleSide }));
      flanc.position.z = p[1] * lp / 2 * 0.98; r.add(nom(flanc, 'pneu'));
      const jante = new T.Mesh(new T.CylinderGeometry(rj, rj, 0.05, o.leger ? 14 : 30), mJante); jante.rotation.x = PI / 2; jante.position.z = p[1] * (lp / 2 - 0.035); r.add(nom(jante, 'jante'));
      if(!o.leger){
        const creux = new T.Mesh(new T.CircleGeometry(rj * 0.93, 30), mat(0x2A2D32, { roughness: 0.6 }));
        creux.position.z = p[1] * (lp / 2 - 0.005); if(p[1] < 0) creux.rotation.y = PI; r.add(nom(creux, 'jante'));
        for(let k = 0; k < 5; k++){
          const br = boite(rj * 0.92, 0.05, 0.025, mJante);
          br.geometry.translate(rj * 0.46, 0, 0);
          br.rotation.z = k * 2 * PI / 5 + 0.3; br.position.z = p[1] * (lp / 2 + 0.002);
          r.add(nom(br, 'jante'));
        }
        const moyeu = cyl(rj * 0.22, 0.03, mAlu, 16); moyeu.rotation.x = PI / 2; moyeu.position.z = p[1] * (lp / 2 + 0.006); r.add(nom(moyeu, 'jante'));
        const disque = cyl(rj * 0.82, 0.02, mat(0x6E737A, { metalness: 0.5, roughness: 0.5 }), 24); disque.rotation.x = PI / 2; disque.position.z = p[1] * (lp / 2 - 0.08); r.add(nom(disque, 'jante'));
      }
      r.position.set(p[0], rw, p[1] * (M.voie / 2));
      inter.add(r); roues.push(r);
    });

    /* ---- les feux : dessinés sur les toiles ; ici, leurs ZONES (invisibles)
       que le jeu des vérifications touche et allume ---- */
    const mOrange = lum(0xFF9A1F), mRouge = lum(0xC81E28, { emissiveIntensity: 0.45 });
    const ZONE = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide });
    const zone = (geo, hit, decal) => poser(geo, ZONE, hit, decal == null ? 0.012 : decal);
    [-1, 1].forEach(c => {
      const hph = angle(1, M.feuxAvY + 0.03, c * 0.72 * Wh, 0.35);
      if(hph){
        inter.add(nom(zone(forme([[-0.19, -0.06], [0.19, -0.06], [0.19, 0.07], [-0.19, 0.07]]), hph), 'phare'));
        const cl = zone(forme([[-0.06, -0.05], [0.06, -0.05], [0.06, 0.05], [-0.06, 0.05]]), hph, 0.016);
        cl.position.addScaledVector(new T.Vector3(0, 0, c), 0.14);
        inter.add(nom(cl, c > 0 ? 'clignoD' : 'clignoG'));
      }
      const hfa = angle(-1, M.feuxArY, c * 0.72 * Wh, 0.30);
      if(hfa){
        inter.add(nom(zone(forme([[-0.22, -0.06], [0.22, -0.06], [0.22, 0.07], [-0.22, 0.07]]), hfa), 'feuAR'));
        const ca = zone(forme([[-0.07, -0.05], [0.07, -0.05], [0.07, 0.0], [-0.07, 0.0]]), hfa, 0.016);
        ca.position.addScaledVector(new T.Vector3(0, 0, c), 0.10);
        inter.add(nom(ca, c > 0 ? 'clignoD' : 'clignoG'));
      }
      /* le rétroviseur : coque couleur caisse sur un pied noir */
      const xr2 = V.ws[0] - 0.24;
      const hr = cote(xr2, ceinture(xr2) + 0.06, c);
      if(hr){
        const rt = new T.Group();
        const coque = new T.Mesh(new T.SphereGeometry(0.11, o.leger ? 8 : 18, o.leger ? 6 : 12), mCaisse);
        coque.scale.set(0.95, 0.62, 1.15); rt.add(nom(coque, 'retro'));
        const glace = new T.Mesh(new T.CircleGeometry(0.075, 16), mVitre); glace.position.set(-0.075, 0, 0); glace.rotation.y = -PI / 2; glace.scale.set(1, 0.6, 1.3); rt.add(nom(glace, 'retro'));
        const pied = boite(0.10, 0.04, 0.10, mNoir); pied.position.set(0.03, -0.03, -c * 0.10); rt.add(nom(pied, 'retro'));
        rt.position.copy(hr.p); rt.position.z += c * 0.13; rt.position.y += 0.01;
        inter.add(rt);
        const rp = boite(0.02, 0.022, 0.13, mOrange); rp.position.copy(rt.position); rp.position.x += 0.085; rp.position.y -= 0.02; rp.position.z += c * 0.03; inter.add(nom(rp, c > 0 ? 'clignoD' : 'clignoG'));
      }
    });

    /* barres de toit (Q3) */
    if(M.barres){
      [-1, 1].forEach(c => {
        const pts = [];
        for(let k = 0; k <= 12; k++){
          const x = 0.45 + (V.ws[1] - 0.45) * k / 12, h = dessus(x, c * (demi(x) - M.toit - 0.02));
          if(h) pts.push(h.p.clone().add(new T.Vector3(0, 0.035, 0)));
        }
        if(pts.length > 2){
          const barre = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.017, 6, false), mAlu);
          inter.add(nom(barre, 'pavillon'));
        }
      });
    }

    /* ============================================================
       🧰 TOUT CE QUE L'INSPECTEUR PEUT DEMANDER DEHORS (o.complet)
       et, avec o.capot, le compartiment moteur et le capot qui
       s'ouvre. Mêmes noms qu'avant la v1403 : le jeu ne change pas.
       ============================================================ */
    if(o.complet){
      const mBlanc = lum(0xF4F4F4, { emissiveIntensity: 0.3 });
      [-1, 1].forEach(c => {
        const hc = arriere(M.noir ? 0.40 : 0.36, c * 0.80 * Wh);
        if(hc){ const cat = poser(forme([[-0.08, -0.03], [0.08, -0.03], [0.08, 0.03], [-0.08, 0.03]]), ZONE, hc, 0.01); inter.add(nom(cat, 'catadioptre')); }
        /* la sécurité enfant : sur la tranche arrière de la porte arrière */
        const hs = cote(V.q[0] - 0.05, ceinture(V.q[0]) - 0.30, c);
        if(hs){ const se = poser(forme([[-0.02, -0.025], [0.02, -0.025], [0.02, 0.025], [-0.02, 0.025]]), mat(0xD3242B), hs, 0.008); inter.add(nom(se, 'securiteEnfant')); }
        /* les gicleurs : au pied du pare-brise */
        const hg = dessus(V.ws[0] + 0.10, c * 0.24);
        if(hg){ const gi = boite(0.05, 0.022, 0.035, mNoir); gi.position.copy(hg.p).addScaledVector(hg.n, 0.01); inter.add(nom(gi, 'gicleur')); }
      });
      const hb = arriere(M.noir ? 0.40 : 0.34, -0.48);
      if(hb){ const af = poser(forme([[-0.07, -0.02], [0.07, -0.02], [0.07, 0.02], [-0.07, 0.02]]), mRouge, hb, 0.008); inter.add(nom(af, 'antibrouillard')); }
      const hrc = arriere(M.noir ? 0.40 : 0.34, 0.48);
      if(hrc){ const rc = poser(forme([[-0.07, -0.02], [0.07, -0.02], [0.07, 0.02], [-0.07, 0.02]]), mBlanc, hrc, 0.008); inter.add(nom(rc, 'recul')); }
      /* les plaques */
      const tex = (() => {
        const c = document.createElement('canvas'); c.width = 520; c.height = 110;
        const g2 = c.getContext('2d');
        g2.fillStyle = '#fff'; g2.fillRect(0, 0, 520, 110);
        g2.fillStyle = '#1F4FB5'; g2.fillRect(0, 0, 58, 110); g2.fillRect(462, 0, 58, 110);
        g2.fillStyle = '#FFD200'; g2.font = 'bold 30px sans-serif'; g2.textAlign = 'center'; g2.fillText('F', 29, 92);
        g2.fillStyle = '#111'; g2.font = 'bold 74px sans-serif'; g2.fillText(String(o.immat || 'EC-000-AA').slice(0, 10), 260, 82);
        g2.strokeStyle = '#111'; g2.lineWidth = 6; g2.strokeRect(3, 3, 514, 104);
        const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
      })();
      const mPlaque = new T.MeshBasicMaterial({ map: tex });
      const hpa = avant(M.noir ? 0.50 : 0.43, 0);
      if(hpa){ const pav = poser(new T.PlaneGeometry(0.52, 0.11), mPlaque, hpa, 0.02); inter.add(nom(pav, 'plaque')); }
      const hpr = arriere(M.plaqueArY, 0);
      if(hpr){
        const par = poser(new T.PlaneGeometry(0.52, 0.11), mPlaque, hpr, 0.012); inter.add(nom(par, 'plaque'));
        [-0.18, 0.18].forEach(z => { const ep = boite(0.02, 0.012, 0.05, mBlanc); ep.position.copy(hpr.p).addScaledVector(hpr.n, 0.02); ep.position.y += 0.068; ep.position.z += z; inter.add(nom(ep, 'eclairagePlaque')); });
      }
      /* la trappe à carburant : à droite, à l'arrière */
      const ht = cote(0.62 + (M.noir ? 0.06 : 0), ceinture(0.62) - 0.13, 1);
      if(ht){
        const tr = poser(new T.CircleGeometry(0.085, 24), mat(o.couleur || 0xF4F5F2, { metalness: 0.25, roughness: 0.32, side: T.DoubleSide }), ht, 0.008);
        inter.add(nom(tr, 'trappe'));
        const bord = poser(new T.RingGeometry(0.085, 0.092, 24), mNoir, ht, 0.007); inter.add(nom(bord, 'trappe'));
      }
      /* les balais : couchés au pied du pare-brise */
      [-0.30, 0.28].forEach((z, k) => {
        const x = V.ws[0] - 0.08;
        const hw = dessus(x, z);
        if(hw){
          const b = boite(0.025, 0.02, 0.60, mNoir);
          b.position.copy(hw.p).addScaledVector(hw.n, 0.018);
          b.rotation.y = k ? 0.18 : 0.12;
          inter.add(nom(b, 'balai'));
        }
      });
      /* le témoin d'usure : un petit triangle sur le flanc de chaque pneu */
      roues.forEach((r, i) => {
        const cote2 = i % 2 ? 1 : -1;
        const tw = new T.Mesh(new T.CircleGeometry(0.05, 3), mat(0x4A4D52)); tw.position.set(0, rw * 0.80, cote2 * (lp / 2 + 0.004)); if(cote2 < 0) tw.rotation.y = PI;
        r.add(nom(tw, 'temoinUsure'));
      });
      if(o.capot && capotMesh){
        /* ---- le compartiment moteur, sous le capot (toujours dessiné, scan ou non) ---- */
        const baie = m => { m.userData.baie = true; return m; };
        const x0 = capotDe.x0 + 0.05, x1 = L - 0.30;
        const yH = Math.min(haut(x0), haut(x1));
        const y0 = yH - 0.27;
        const lx = x1 - x0, cx = (x0 + x1) / 2, lz = 2 * (demi(x1) - 0.14);
        /* le bac s'arrête sous le capot (là où il est le plus bas, à l'avant) */
        const hb = Math.max(0.12, haut(x1 + 0.10) - 0.05 - y0);
        const bac = new T.Mesh(new T.BoxGeometry(lx + 0.10, hb, lz + 0.06), new T.MeshStandardMaterial({ color: 0x2A2E35, roughness: 0.85, side: T.BackSide }));
        bac.position.set(cx, y0 + hb / 2, 0); inter.add(baie(nom(bac, 'baie')));
        const mot = boite(0.46, 0.13, 0.62, mat(0x3B4048, { roughness: 0.6 })); mot.position.set(cx + 0.06, y0 + 0.065, -0.02); inter.add(baie(nom(mot, 'moteur')));
        const cache = boite(0.40, 0.016, 0.52, mat(0x22252A, { roughness: 0.5 })); cache.position.set(cx + 0.06, y0 + 0.138, -0.02); inter.add(baie(nom(cache, 'moteur')));
        const bh = cyl(0.042, 0.03, mat(0x15171A), 20); bh.position.set(cx + 0.02, y0 + 0.16, 0.12); inter.add(baie(nom(bh, 'huileRemplissage')));
        const bhj = cyl(0.03, 0.006, mat(0xF2C200, { emissive: 0x3a2e00 }), 20); bhj.position.set(cx + 0.02, y0 + 0.178, 0.12); inter.add(baie(nom(bhj, 'huileRemplissage')));
        const jg = new T.Mesh(new T.TorusGeometry(0.034, 0.010, 8, 22), mat(0xF2C200, { emissive: 0x4a3a00 })); jg.position.set(cx - 0.14, y0 + 0.175, -0.24); inter.add(baie(nom(jg, 'jauge')));
        const tige = cyl(0.007, 0.13, mat(0xF2C200)); tige.position.set(cx - 0.14, y0 + 0.08, -0.24); inter.add(baie(nom(tige, 'jauge')));
        const zd = lz / 2 - 0.13;
        const vase = boite(0.18, 0.12, 0.14, new T.MeshStandardMaterial({ color: 0xF4F4F0, transparent: true, opacity: 0.55, roughness: 0.2 })); vase.position.set(x0 + 0.16, y0 + 0.07, zd); inter.add(baie(nom(vase, 'refroidissement')));
        const rose = boite(0.165, 0.065, 0.125, mat(0xF27BB5, { emissive: 0x501030 })); rose.position.set(x0 + 0.16, y0 + 0.045, zd); inter.add(baie(nom(rose, 'refroidissement')));
        const bv = cyl(0.04, 0.03, mat(0x15171A), 18); bv.position.set(x0 + 0.16, y0 + 0.145, zd); inter.add(baie(nom(bv, 'refroidissement')));
        const fr = boite(0.10, 0.09, 0.10, new T.MeshStandardMaterial({ color: 0xF0E7C8, transparent: true, opacity: 0.75 })); fr.position.set(x0 + 0.08, y0 + 0.055, -zd); inter.add(baie(nom(fr, 'frein')));
        const frb = cyl(0.03, 0.03, mat(0xE8C21A), 16); frb.position.set(x0 + 0.08, y0 + 0.115, -zd); inter.add(baie(nom(frb, 'frein')));
        const lgc = cyl(0.018, 0.06, mat(0x2A2E35)); lgc.position.set(x1 - 0.06, y0 + 0.03, -zd + 0.02); inter.add(baie(nom(lgc, 'laveGlace')));
        const lg = cyl(0.042, 0.026, mat(0x2F7DE1, { emissive: 0x0a2050 }), 18); lg.position.set(x1 - 0.06, y0 + 0.07, -zd + 0.02); inter.add(baie(nom(lg, 'laveGlace')));
        const bat = boite(0.24, 0.15, 0.17, mat(0x1D1F23)); bat.position.set(x0 + 0.22, y0 + 0.075, -0.22); inter.add(baie(nom(bat, 'batterie')));
        const bp = boite(0.045, 0.03, 0.045, mat(0xD3242B)); bp.position.set(x0 + 0.28, y0 + 0.165, -0.16); inter.add(baie(nom(bp, 'batterie')));
        const bm = boite(0.045, 0.03, 0.045, mat(0x111111)); bm.position.set(x0 + 0.16, y0 + 0.165, -0.28); inter.add(baie(nom(bm, 'batterie')));
        /* ---- le capot : la peau découpée, sur sa charnière (au pied du pare-brise) ---- */
        const hx = capotDe.x0, hy = haut(hx) + 0.01;
        capotMesh.position.set(-hx, -hy, 0);
        pivot = new T.Group(); pivot.position.set(hx, hy, 0); pivot.add(capotMesh); inter.add(pivot);
      }
    }else if(capotMesh){ inter.add(capotMesh); }

    if(corpsScan){
      const ZONE2 = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide });
      const enlever = [];
      inter.traverse(m => {
        if(!m.isMesh || m.userData.scan || m.userData.baie) return;
        if(m.userData.part) m.material = ZONE2; else enlever.push(m);
      });
      enlever.forEach(m => { if(m.parent) m.parent.remove(m); });
    }
    inter.position.x = -L / 2;
    if(o.ombre !== false){
      const ombre = new T.Mesh(new T.PlaneGeometry(L * 1.3, W * 1.6), new T.MeshBasicMaterial({ map: ombreTexture(), transparent: true, depthWrite: false }));
      ombre.rotation.x = -PI / 2; ombre.position.y = 0.01; g.add(ombre);
    }
    let hMax = 0; M.haut.forEach(p => { hMax = Math.max(hMax, p[1]); });
    return { groupe: g, inter: inter, parts: parts, roues: roues, pivot: pivot, L: L, W: W, H: hMax + (M.barres ? 0.05 : 0.04) };
  }

  /* A3 ou Q3, d'après le nom de la voiture (« Q3 10 », « A3 2 ») */
  function modeleDuNom(nom){ return /(^|\s)q\s*3|^q\s*\d/i.test(String(nom || '')) ? 'q3' : 'a3'; }

  /* ============================================================
     LE SOL : les tuiles du Plan IGN (les mêmes que la carte à plat)
     ============================================================ */
  function Sol(scene, o){
    this.scene = scene; this.o = o || {};
    this.tuiles = new Map();       /* "z/x/y" → mesh */
    this.chargeur = new T.TextureLoader();
    this.chargeur.setCrossOrigin('anonymous');
    this.groupe = new T.Group();
    scene.add(this.groupe);
  }
  /* Les tuiles autour d'un point, au zoom qui convient à la distance */
  Sol.prototype.autour = function(x, z, r){
    /* une tuile d'à peu près 0,8 × la distance de la caméra : 5 × 5 à 7 × 7 tuiles */
    const zoom = Math.max(10, Math.min(17, Math.floor(Math.log2(C / (0.8 * r)))));
    const s = tailleTuile(zoom), n = 2;   /* 5 × 5 tuiles : au-delà, la brume */
    const c = tuileDe(x, z, zoom), voulues = new Set();
    for(let dx = -n; dx <= n; dx++) for(let dy = -n; dy <= n; dy++){
      const tx = c.tx + dx, ty = c.ty + dy;
      if(tx < 0 || ty < 0) continue;
      const cle = zoom + '/' + tx + '/' + ty;
      voulues.add(cle);
      if(!this.tuiles.has(cle)) this.poser(zoom, tx, ty, cle);
    }
    /* les autres zooms partent quand ceux-ci sont là (pas de trou) */
    this.tuiles.forEach((m, cle) => {
      if(voulues.has(cle)) return;
      if(+cle.split('/')[0] === zoom){ this.enlever(cle); return; }
      if(m.userData.pret && [...voulues].every(v => { const t = this.tuiles.get(v); return t && t.userData.pret; })) this.enlever(cle);
    });
  };
  Sol.prototype.poser = function(zoom, tx, ty, cle){
    const s = tailleTuile(zoom);
    const geo = new T.PlaneGeometry(s, s);
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xF7F5F0, depthWrite: true }));
    m.rotation.x = -Math.PI / 2;
    /* les zooms fins au-dessus des grossiers (un cheveu), sans se battre */
    m.position.set(tx * s + s / 2 - OX, -0.4 + (zoom - 11) * 0.02, ty * s + s / 2 - OY);
    m.renderOrder = zoom;
    m.userData.pret = false;
    this.tuiles.set(cle, m);
    this.groupe.add(m);
    this.chargeur.load(base() + '/tuile?z=' + zoom + '&x=' + tx + '&y=' + ty, tex => {
      if(!this.tuiles.has(cle)){ tex.dispose(); return; }
      tex.encoding = T.sRGBEncoding;
      tex.anisotropy = 4;
      m.material.dispose();
      m.material = new T.MeshBasicMaterial({ map: tex });
      m.userData.pret = true;
    }, undefined, () => { m.userData.pret = true; });
  };
  Sol.prototype.enlever = function(cle){
    const m = this.tuiles.get(cle);
    if(!m) return;
    this.groupe.remove(m); liberer(m);
    this.tuiles.delete(cle);
  };

  /* ============================================================
     LES BÂTIMENTS EN RELIEF — BD TOPO de l'IGN, par le Worker
     (/batiments?x=&y= : une tuile de zoom 15, ~1,2 km de côté).
     Réponse : { b: [[hauteur, lon, lat, lon, lat, …], …] }.
     Un bâtiment sans hauteur connue en prend 6 m (deux niveaux).
     ============================================================ */
  const ZOOM_BAT = 15;
  function Batiments(scene){
    this.scene = scene;
    this.tuiles = new Map();
    this.groupe = new T.Group();
    this.mat = new T.MeshLambertMaterial({ color: 0xF1EEE6 });
    scene.add(this.groupe);
  }
  Batiments.prototype.autour = function(x, z, r){
    this.groupe.visible = r < 2600;
    if(!this.groupe.visible) return;
    const c = tuileDe(x, z, ZOOM_BAT), n = r < 1500 ? 1 : 2, voulues = new Set();
    for(let dx = -n; dx <= n; dx++) for(let dy = -n; dy <= n; dy++){
      const cle = (c.tx + dx) + '/' + (c.ty + dy);
      voulues.add(cle);
      if(!this.tuiles.has(cle)) this.charger(c.tx + dx, c.ty + dy, cle);
    }
    /* on garde un peu de marge : revenir en arrière ne recharge rien */
    if(this.tuiles.size > 40){
      this.tuiles.forEach((m, cle) => { if(!voulues.has(cle) && this.tuiles.size > 30){ if(m && m.isObject3D){ this.groupe.remove(m); liberer(m); } this.tuiles.delete(cle); } });
    }
  };
  Batiments.prototype.charger = function(tx, ty, cle){
    this.tuiles.set(cle, 'enCours');
    fetch(base() + '/batiments?x=' + tx + '&y=' + ty)
      .then(r => r.ok ? r.json() : { b: [] })
      .then(d => {
        if(this.tuiles.get(cle) !== 'enCours') return;
        const m = this.fabriquer((d && d.b) || []);
        this.tuiles.set(cle, m || 'vide');
        if(m) this.groupe.add(m);
      })
      .catch(() => { this.tuiles.delete(cle); });
  };
  /* Tous les bâtiments d'une tuile en UNE géométrie (un seul dessin) */
  Batiments.prototype.fabriquer = function(liste){
    if(!liste.length) return null;
    const pos = [], nor = [], idx = [];
    let base = 0;
    liste.forEach(b => {
      const h = Math.max(2.5, Math.min(120, Number(b[0]) || 6)) * k;
      const pts = [];
      for(let i = 1; i + 1 < b.length; i += 2){ const p = versMonde(b[i + 1], b[i]); pts.push([p.x, p.z]); }
      if(pts.length > 2 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
      if(pts.length < 3) return;
      /* les murs */
      for(let i = 0; i < pts.length; i++){
        const a = pts[i], c = pts[(i + 1) % pts.length];
        const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1;
        let nx = dz / l, nz = -dx / l;
        pos.push(a[0], 0, a[1], c[0], 0, c[1], c[0], h, c[1], a[0], h, a[1]);
        for(let j = 0; j < 4; j++) nor.push(nx, 0, nz);
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3, base, base + 2, base + 1, base, base + 3, base + 2);
        base += 4;
      }
      /* le toit */
      const contour = pts.map(p => new T.Vector2(p[0], p[1]));
      let tri;
      try{ tri = T.ShapeUtils.triangulateShape(contour, []); }catch(e){ tri = []; }
      const b0 = base;
      pts.forEach(p => { pos.push(p[0], h, p[1]); nor.push(0, 1, 0); });
      tri.forEach(t => idx.push(b0 + t[0], b0 + t[2], b0 + t[1], b0 + t[0], b0 + t[1], b0 + t[2]));
      base += pts.length;
    });
    if(!pos.length) return null;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    geo.setIndex(idx);
    return new T.Mesh(geo, this.mat);
  };

  return {
    charger: charger, possible: possible, get T(){ return T; },
    versMonde: versMonde, versGeo: versGeo, k: k, ORIGINE: ORIGINE,
    Scene: function(h, o){ return new Scene(h, o); },
    Sol: function(s, o){ return new Sol(s, o); },
    Batiments: function(s){ return new Batiments(s); },
    voiture3D: voiture3D, scans: scans, modeleDuNom: modeleDuNom, liberer: liberer, el: el
  };
})();

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-3d.js'] = true;
