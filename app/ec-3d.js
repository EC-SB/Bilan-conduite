/* Déployé le 10/11/2026 à 11:56 — v1400 */
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
   · les voitures : une A3 et un Q3 dessinés en volumes, BLANCS comme
     les nôtres. ⚠️ PROVISOIRES : les scans de David (iPhone) les
     remplaceront, et seule la fonction voiture3D() changera ;
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
  function voiture3D(o){
    o = o || {};
    const PI = Math.PI;
    const a3 = o.modele === 'a3';
    const L = a3 ? 4.31 : 4.48, H = a3 ? 1.43 : 1.60, W = a3 ? 1.80 : 1.84, rw = a3 ? 0.33 : 0.36;
    const sx = L / 4.48, sy = H / 1.60;
    const X = x => x * sx, Y = y => y * sy;
    const g = new T.Group(), parts = {};
    const mCaisse = mat(o.couleur || 0xF4F5F2, { metalness: 0.2, roughness: 0.35 });
    const mVitre = new T.MeshStandardMaterial({ color: 0x22303D, roughness: 0.1, metalness: 0.4, side: T.DoubleSide });
    const mNoir = mat(0x1E2125, { roughness: 0.7 });
    const mPneu = mat(0x1A1B1E, { roughness: 0.92 });
    const mJante = mat(0xB8BEC6, { metalness: 0.6, roughness: 0.3 });
    const mBas = mat(0x2B2E33, { roughness: 0.8 });
    const inter = new T.Group(); g.add(inter);
    const nom = (m, n) => { m.userData.part = n; (parts[n] = parts[n] || []).push(m); return m; };
    const extruder = (shape, prof, m, biseau) => {
      const bt = biseau == null ? 0.05 : biseau;
      const geo = new T.ExtrudeGeometry(shape, { depth: Math.max(0.01, prof - 2 * bt), bevelEnabled: bt > 0, bevelThickness: bt, bevelSize: bt * 0.8, bevelSegments: o.leger ? 1 : 3, curveSegments: o.leger ? 6 : 14 });
      geo.translate(0, 0, -(prof - 2 * bt) / 2);
      return new T.Mesh(geo, m);
    };
    /* le bas de caisse, passages de roue compris */
    const cxR = 0.85, cxF = 3.53, ra = rw + 0.06, cy = rw;
    const yb = Y(0.24), ang = Math.asin(Math.max(-0.99, Math.min(0.99, (yb - cy) / ra)));
    const sh = new T.Shape();
    const capot = !!o.capot;
    sh.moveTo(X(0.03), Y(0.30)); sh.lineTo(X(0.0), Y(0.55)); sh.lineTo(X(0.03), Y(0.97)); sh.lineTo(X(0.18), Y(1.01)); sh.lineTo(X(3.25), Y(1.00));
    /* 🧰 v1400 — avec un capot qui s'ouvre : la caisse s'arrête sous lui */
    if(capot){ sh.lineTo(X(3.28), Y(0.74)); sh.lineTo(X(4.26), Y(0.72)); sh.lineTo(X(4.40), Y(0.66)); }
    else{ sh.quadraticCurveTo(X(3.7), Y(0.97), X(4.05), Y(0.90)); sh.quadraticCurveTo(X(4.32), Y(0.84), X(4.42), Y(0.74)); }
    sh.lineTo(X(4.48), Y(0.60)); sh.lineTo(X(4.47), Y(0.32)); sh.lineTo(X(4.30), yb);
    sh.lineTo(X(cxF) + ra * Math.cos(ang), yb); sh.absarc(X(cxF), cy, ra, ang, PI - ang, false);
    sh.lineTo(X(cxR) + ra * Math.cos(ang), yb); sh.absarc(X(cxR), cy, ra, ang, PI - ang, false);
    sh.lineTo(X(0.15), yb); sh.lineTo(X(0.03), Y(0.30));
    inter.add(nom(extruder(sh, W, mCaisse, 0.06), 'caisse'));
    const yt = Y(0.40), bas = new T.Shape();
    bas.moveTo(X(0.02), Y(0.30)); bas.lineTo(X(0.0), yt); bas.lineTo(X(4.475), yt); bas.lineTo(X(4.47), Y(0.32)); bas.lineTo(X(4.30), yb);
    bas.lineTo(X(cxF) + ra * Math.cos(ang), yb); bas.absarc(X(cxF), cy, ra, ang, PI - ang, false);
    bas.lineTo(X(cxR) + ra * Math.cos(ang), yb); bas.absarc(X(cxR), cy, ra, ang, PI - ang, false);
    bas.lineTo(X(0.15), yb); bas.lineTo(X(0.02), Y(0.30));
    inter.add(nom(extruder(bas, W + 0.014, mBas, 0.06), 'caisse'));
    /* le pavillon */
    const Wg = W - 0.30, gh = new T.Shape();
    gh.moveTo(X(0.06), Y(0.97)); gh.lineTo(X(0.22), Y(1.40)); gh.quadraticCurveTo(X(0.32), Y(1.56), X(0.62), Y(1.57));
    gh.lineTo(X(2.70), Y(1.585)); gh.quadraticCurveTo(X(2.80), Y(1.58), X(2.86), Y(1.52)); gh.lineTo(X(3.25), Y(1.00)); gh.lineTo(X(0.06), Y(0.97));
    inter.add(nom(extruder(gh, Wg, mCaisse, 0.05), 'pavillon'));
    if(!a3){ [-1, 1].forEach(c => { const b = boite(X(2.0), 0.035, 0.05, mat(0x8E959E, { metalness: 0.6 })); b.position.set(X(1.62), Y(1.585) + 0.04, c * (Wg / 2 - 0.08)); inter.add(nom(b, 'pavillon')); }); }
    /* les vitres */
    const quad = (p1, p2, n, larg, m) => {
      const geo = new T.BufferGeometry(), z = larg / 2, o2 = 0.012;
      const a = [p1[0] + n[0] * o2, p1[1] + n[1] * o2], b = [p2[0] + n[0] * o2, p2[1] + n[1] * o2];
      geo.setAttribute('position', new T.Float32BufferAttribute([a[0], a[1], -z, b[0], b[1], -z, b[0], b[1], z, a[0], a[1], -z, b[0], b[1], z, a[0], a[1], z], 3));
      geo.computeVertexNormals();
      return new T.Mesh(geo, m);
    };
    const normale = (p1, p2, sens) => { const dx = p2[0] - p1[0], dy = p2[1] - p1[1], l = Math.hypot(dx, dy); return [sens * dy / l, -sens * dx / l]; };
    const pbA = [X(3.20), Y(1.04)], pbB = [X(2.84), Y(1.52)];
    inter.add(nom(quad(pbA, pbB, normale(pbA, pbB, 1), Wg - 0.10, mVitre), 'parebrise'));
    const lnA = [X(0.10), Y(1.02)], lnB = [X(0.22), Y(1.38)];
    inter.add(nom(quad(lnA, lnB, normale(lnA, lnB, -1), Wg - 0.16, mVitre), 'lunette'));
    [[[1.80, 1.06], [1.80, 1.52], [2.66, 1.545], [3.12, 1.07]], [[0.98, 1.06], [0.98, 1.49], [1.72, 1.525], [1.72, 1.06]], [[0.24, 1.07], [0.32, 1.36], [0.90, 1.47], [0.90, 1.07]]].forEach(f => {
      const s2 = new T.Shape(); f.forEach((p, i) => { if(i) s2.lineTo(X(p[0]), Y(p[1])); else s2.moveTo(X(p[0]), Y(p[1])); });
      [-1, 1].forEach(c => { const m = new T.Mesh(new T.ShapeGeometry(s2), mVitre); m.position.z = c * (Wg / 2 + 0.006); inter.add(nom(m, 'vitre')); });
    });
    /* les roues */
    const roues = [];
    [[cxR, -1], [cxR, 1], [cxF, -1], [cxF, 1]].forEach(p => {
      const r = new T.Group();
      const pneu = cyl(rw, 0.24, mPneu, o.leger ? 14 : 30); pneu.rotation.x = PI / 2; r.add(nom(pneu, 'pneu'));
      const jante = cyl(rw * 0.64, 0.025, mJante, o.leger ? 10 : 24); jante.rotation.x = PI / 2; jante.position.z = p[1] * 0.115; r.add(nom(jante, 'jante'));
      r.position.set(X(p[0]), cy, p[1] * (W / 2 - 0.13));
      inter.add(r); roues.push(r);
    });
    /* les feux */
    const mPhare = lum(0xEAF2FF, { emissiveIntensity: 0.35 }), mOrange = lum(0xFF9A1F), mRouge = lum(0xD3242B, { emissiveIntensity: 0.4 });
    [-1, 1].forEach(c => {
      const ph = boite(0.16, Y(0.09), 0.36 * W / 1.84, mPhare); ph.position.set(X(4.36), Y(0.72), c * 0.58 * W / 1.84); inter.add(nom(ph, 'phare'));
      const cl = boite(0.15, Y(0.05), 0.10, mOrange); cl.position.set(X(4.33), Y(0.73), c * 0.81 * W / 1.84); inter.add(nom(cl, c > 0 ? 'clignoD' : 'clignoG'));
      const rt = boite(0.22, 0.13, 0.20, mCaisse); rt.position.set(X(3.05), Y(1.08), c * (W / 2 + 0.07)); inter.add(nom(rt, 'retro'));
      const fa = boite(0.08, Y(0.12), 0.38 * W / 1.84, mRouge); fa.position.set(X(0.03), Y(0.92), c * 0.57 * W / 1.84); inter.add(nom(fa, 'feuAR'));
    });
    if(!o.leger){
      [[1.55], [2.45]].forEach(p => { [-1, 1].forEach(c => { const b = boite(0.16, 0.03, 0.03, mNoir); b.position.set(X(p[0]), Y(0.92), c * (W / 2 + 0.01)); inter.add(nom(b, 'caisse')); }); });
    }
    /* ============================================================
       🧰 v1400 — TOUT CE QUE L'INSPECTEUR PEUT DEMANDER DEHORS
       (o.complet) : clignotants de rétro et arrière, catadioptres,
       feux de brouillard et de recul, plaques et leur éclairage, trappe,
       balais, gicleurs, témoins d'usure, hayon, sécurité enfant — et,
       avec o.capot, le compartiment moteur et le capot qui s'ouvre.
       Chaque pièce porte son nom (userData.part) : c'est lui que le
       jeu des vérifications compare à la bonne réponse.
       ============================================================ */
    let pivot = null;
    if(o.complet){
      const mBlanc = lum(0xF4F4F4, { emissiveIntensity: 0.25 });
      [-1, 1].forEach(c => {
        const rp = boite(0.06, 0.035, 0.13, mOrange); rp.position.set(X(3.05) + 0.1, Y(1.06), c * (W / 2 + 0.11)); inter.add(nom(rp, c > 0 ? 'clignoD' : 'clignoG'));
        const ca = boite(0.085, Y(0.05), 0.11, mOrange); ca.position.set(X(0.025), Y(0.92), c * 0.80 * W / 1.84); inter.add(nom(ca, c > 0 ? 'clignoD' : 'clignoG'));
        const cat = boite(0.03, 0.05, 0.12, mat(0xB0141C, { roughness: 0.25 })); cat.position.set(X(0.03) - 0.01, Y(0.46), c * 0.80 * W / 1.84); inter.add(nom(cat, 'catadioptre'));
        /* les gicleurs, au pied du pare-brise */
        const gi = boite(0.05, 0.025, 0.04, mNoir); gi.position.set(X(3.33), Y(capot ? 0.99 : 0.985), c * 0.22); inter.add(nom(gi, 'gicleur'));
        /* la sécurité enfant : sur la tranche de la porte arrière */
        const se = boite(0.03, 0.05, 0.03, mat(0xD3242B)); se.position.set(X(0.99), Y(0.80), c * (W / 2 + 0.008)); inter.add(nom(se, 'securiteEnfant'));
      });
      const af = boite(0.04, 0.05, 0.14, mRouge); af.position.set(X(0.02) - 0.01, Y(0.40), -0.52); inter.add(nom(af, 'antibrouillard'));
      const rc = boite(0.04, 0.05, 0.14, mBlanc); rc.position.set(X(0.02) - 0.01, Y(0.40), 0.52); inter.add(nom(rc, 'recul'));
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
      const pav = new T.Mesh(new T.PlaneGeometry(0.52, 0.11), new T.MeshBasicMaterial({ map: tex })); pav.rotation.y = PI / 2; pav.position.set(X(4.475) + 0.012, Y(0.46), 0); inter.add(nom(pav, 'plaque'));
      const par = new T.Mesh(new T.PlaneGeometry(0.52, 0.11), new T.MeshBasicMaterial({ map: tex })); par.rotation.y = -PI / 2; par.position.set(X(0.0) - 0.012, Y(0.62), 0); inter.add(nom(par, 'plaque'));
      [-0.2, 0.2].forEach(z => { const ep = boite(0.03, 0.02, 0.05, mBlanc); ep.position.set(X(0.0) - 0.02, Y(0.68), z); inter.add(nom(ep, 'eclairagePlaque')); });
      /* le hayon (le coffre) : la face arrière, entre les feux */
      const hy = boite(0.02, Y(0.30), Wg - 0.25, mCaisse); hy.position.set(X(0.035) - 0.015, Y(0.80), 0); inter.add(nom(hy, 'hayon'));
      /* la trappe à carburant : à droite, à l'arrière */
      const tr = new T.Mesh(new T.PlaneGeometry(0.18, 0.18), mat(0xC2C8CF, { metalness: 0.25, roughness: 0.35, side: T.DoubleSide })); tr.position.set(X(0.55), Y(0.86), W / 2 + 0.005); inter.add(nom(tr, 'trappe'));
      /* les balais d'essuie-glace */
      [-0.32, 0.30].forEach(z => { const b = boite(0.03, 0.025, 0.58, mNoir); b.position.set(X(3.17), Y(1.07), z); b.rotation.y = 0.15; inter.add(nom(b, 'balai')); });
      /* le témoin d'usure : un petit triangle sur le flanc de chaque pneu */
      roues.forEach((r, i) => {
        const cote = i % 2 ? 1 : -1;
        const tw = new T.Mesh(new T.CircleGeometry(0.035, 3), mat(0x4A4D52)); tw.position.set(0, rw * 0.84, cote * 0.121); if(cote < 0) tw.rotation.y = PI;
        r.add(nom(tw, 'temoinUsure'));
      });
      if(capot){
        const aile = new T.Shape(); aile.moveTo(X(3.28), Y(0.72)); aile.lineTo(X(3.28), Y(0.975)); aile.quadraticCurveTo(X(3.7), Y(0.95), X(4.05), Y(0.875)); aile.quadraticCurveTo(X(4.30), Y(0.82), X(4.40), Y(0.71)); aile.lineTo(X(4.40), Y(0.66)); aile.lineTo(X(4.26), Y(0.72)); aile.lineTo(X(3.28), Y(0.72));
        [-1, 1].forEach(c => { const m = extruder(aile, 0.10, mCaisse, 0.0); m.position.z = c * (W / 2 - 0.08); inter.add(nom(m, 'caisse')); });
        const y0 = Y(0.72);
        const baie = boite(X(0.98), 0.012, W - 0.30, mat(0x2A2E35, { roughness: 0.85 })); baie.position.set(X(3.77), y0 + 0.006, 0); inter.add(nom(baie, 'baie'));
        const mot = boite(0.46, 0.12, 0.62, mat(0x3B4048, { roughness: 0.6 })); mot.position.set(X(3.84), y0 + 0.06, -0.02); inter.add(nom(mot, 'moteur'));
        const cache = boite(0.40, 0.016, 0.52, mat(0x22252A, { roughness: 0.5 })); cache.position.set(X(3.84), y0 + 0.128, -0.02); inter.add(nom(cache, 'moteur'));
        const bh = cyl(0.042, 0.03, mat(0x15171A), 20); bh.position.set(X(3.80), y0 + 0.15, 0.12); inter.add(nom(bh, 'huileRemplissage'));
        const bhj = cyl(0.03, 0.006, mat(0xF2C200, { emissive: 0x3a2e00 }), 20); bhj.position.set(X(3.80), y0 + 0.168, 0.12); inter.add(nom(bhj, 'huileRemplissage'));
        const jg = new T.Mesh(new T.TorusGeometry(0.034, 0.010, 8, 22), mat(0xF2C200, { emissive: 0x4a3a00 })); jg.position.set(X(3.66), y0 + 0.165, -0.24); inter.add(nom(jg, 'jauge'));
        const tige = cyl(0.007, 0.13, mat(0xF2C200)); tige.position.set(X(3.66), y0 + 0.07, -0.24); inter.add(nom(tige, 'jauge'));
        const vase = boite(0.18, 0.12, 0.14, new T.MeshStandardMaterial({ color: 0xF4F4F0, transparent: true, opacity: 0.55, roughness: 0.2 })); vase.position.set(X(3.47), y0 + 0.07, 0.53 * W / 1.84); inter.add(nom(vase, 'refroidissement'));
        const rose = boite(0.165, 0.065, 0.125, mat(0xF27BB5, { emissive: 0x501030 })); rose.position.set(X(3.47), y0 + 0.045, 0.53 * W / 1.84); inter.add(nom(rose, 'refroidissement'));
        const bv = cyl(0.04, 0.03, mat(0x15171A), 18); bv.position.set(X(3.47), y0 + 0.145, 0.53 * W / 1.84); inter.add(nom(bv, 'refroidissement'));
        const fr = boite(0.10, 0.09, 0.10, new T.MeshStandardMaterial({ color: 0xF0E7C8, transparent: true, opacity: 0.75 })); fr.position.set(X(3.38), y0 + 0.055, -0.52 * W / 1.84); inter.add(nom(fr, 'frein'));
        const frb = cyl(0.03, 0.03, mat(0xE8C21A), 16); frb.position.set(X(3.38), y0 + 0.115, -0.52 * W / 1.84); inter.add(nom(frb, 'frein'));
        const lgc = cyl(0.018, 0.06, mat(0x2A2E35)); lgc.position.set(X(4.10), y0 + 0.03, -0.62 * W / 1.84); inter.add(nom(lgc, 'laveGlace'));
        const lg = cyl(0.042, 0.026, mat(0x2F7DE1, { emissive: 0x0a2050 }), 18); lg.position.set(X(4.10), y0 + 0.07, -0.62 * W / 1.84); inter.add(nom(lg, 'laveGlace'));
        const bat = boite(0.24, 0.15, 0.17, mat(0x1D1F23)); bat.position.set(X(3.52), y0 + 0.075, -0.22); inter.add(nom(bat, 'batterie'));
        const bp = boite(0.045, 0.03, 0.045, mat(0xD3242B)); bp.position.set(X(3.58), y0 + 0.165, -0.16); inter.add(nom(bp, 'batterie'));
        const bm = boite(0.045, 0.03, 0.045, mat(0x111111)); bm.position.set(X(3.46), y0 + 0.165, -0.28); inter.add(nom(bm, 'batterie'));
        const cs = new T.Shape(); cs.moveTo(X(3.26), Y(1.0)); cs.quadraticCurveTo(X(3.7), Y(0.975), X(4.05), Y(0.905)); cs.quadraticCurveTo(X(4.32), Y(0.845), X(4.43), Y(0.735));
        cs.lineTo(X(4.41), Y(0.705)); cs.quadraticCurveTo(X(4.30), Y(0.80), X(4.05), Y(0.86)); cs.quadraticCurveTo(X(3.7), Y(0.93), X(3.26), Y(0.955)); cs.lineTo(X(3.26), Y(1.0));
        const cap = extruder(cs, W - 0.10, mCaisse, 0.02); cap.position.set(-X(3.26), -Y(0.98), 0);
        pivot = new T.Group(); pivot.position.set(X(3.26), Y(0.98), 0); pivot.add(cap); inter.add(pivot); nom(cap, 'capot');
      }
    }
    inter.position.x = -L / 2;
    if(o.ombre !== false){
      const ombre = new T.Mesh(new T.PlaneGeometry(L * 1.35, W * 1.7), new T.MeshBasicMaterial({ map: ombreTexture(), transparent: true, depthWrite: false }));
      ombre.rotation.x = -PI / 2; ombre.position.y = 0.01; g.add(ombre);
    }
    return { groupe: g, inter: inter, parts: parts, roues: roues, pivot: pivot, L: L, W: W, H: Y(1.585) };
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
    voiture3D: voiture3D, modeleDuNom: modeleDuNom, liberer: liberer, el: el
  };
})();

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-3d.js'] = true;
