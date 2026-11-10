/* Déployé le 10/11/2026 à 11:41 — v1398 */
/* ============================================================
   ec-trajet3d.js — 🧊 LE TRAJET DU COURS, REJOUÉ EN 3D

   David, le 9 novembre (schéma « Trajet ») : rejoué en 3D « pour
   l'élève (la page du mail) ET pour l'équipe (le dossier de
   l'élève) ». Les deux ouvrent déjà la même page, carte.html : le
   bouton 🗺️ des anciens cours du dossier, le « 🗺️ Tracé de
   l'examen » des rendez-vous post-permis, et le lien du mail. La 3D
   s'y ajoute donc une seule fois, en bouton (le Plan reste par
   défaut, comme pour le parc).

   ⚠️ CE QUI EST REJOUÉ, C'EST LE TRACÉ — PAS LA CONDUITE. La page
   n'a que des points, sans aucune heure (le lien n'en porte pas) :
   la voiture avance à VITESSE RÉGULIÈRE le long du trait, de façon
   à parcourir le cours en une minute environ. Ce n'est pas sa
   vitesse, et la page le dit. Aucune vitesse n'existe nulle part
   (CNIL).

   Les points de travail (📍 ⚠️ ☠️) sont des poteaux numérotés sur le
   chemin : quand la voiture y arrive, elle marque une pause et ce
   que dit le bilan s'affiche (thème, l'inspecteur, le moniteur).

   Appel : rejouerTrajet3D(hote, { points: [[lat, lon], …],
   reperes: [{ n, heure, nom, lat, lon, type, theme, insp, mon }],
   natures: { repere: { icone, couleur, mot }, … } })
   → { detruire() }. Il faut EC3D (ec-3d.js), chargé avant.
   ============================================================ */

async function rejouerTrajet3D(hote, o){
  await EC3D.charger();
  const T = EC3D.T, k = EC3D.k;
  const natures = o.natures || {};
  const nature = t => natures[t] || natures.repere || { icone: '📍', couleur: '#3B6900', mot: 'Point de travail' };
  const ech = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  hote.innerHTML = '';
  hote.style.position = hote.style.position || 'relative';
  let visible = true;
  const scene = EC3D.Scene(hote, {
    mode: 'carte', fov: 42, pres: 0.5, loin: 60000, r: 140, phi: 1.0, theta: 0, rMin: 25, rMax: 30000, phiMin: 0.15, phiMax: 1.38,
    fond: 0xEDEAE2, brume: [0xEDEAE2, 400, 1600], hemi: 0.72, dir: 0.75,
    visible: () => visible && document.visibilityState === 'visible',
    surGeste: () => { suivre = false; majBoutons(); },
    toucher: (nx, ny) => {
      const h = scene.viser(nx, ny, poteaux.map(p => p.groupe));
      if(!h.length) return;
      let ob = h[0].object; while(ob && ob.userData.rang === undefined) ob = ob.parent;
      if(ob) ouvrirPoint(ob.userData.rang, false);
    }
  });
  const sol = EC3D.Sol(scene.scene), bat = EC3D.Batiments(scene.scene);

  /* ---- le chemin, en mètres (Mercator) ---- */
  const P = (o.points || []).map(p => { const m = EC3D.versMonde(p[0], p[1]); return new T.Vector3(m.x, 0, m.z); });
  const cum = [0];
  for(let i = 1; i < P.length; i++) cum.push(cum[i - 1] + P[i].distanceTo(P[i - 1]));
  const L = cum[cum.length - 1] || 1;
  const surLeChemin = d => {
    d = Math.max(0, Math.min(L, d));
    let i = 1; while(i < cum.length - 1 && cum[i] < d) i++;
    const a = P[i - 1], b = P[i], t = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    return { pos: new T.Vector3().lerpVectors(a, b, t), cap: Math.atan2(-(b.z - a.z), b.x - a.x), i: i };
  };

  /* ---- le ruban : le trait entier en pâle, le parcouru en vert ---- */
  const ruban = (larg, y, couleur, opacite) => {
    const pos = [], idx = [];
    for(let i = 0; i < P.length; i++){
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l * larg / 2, nz = dx / l * larg / 2;
      pos.push(P[i].x + nx, y, P[i].z + nz, P[i].x - nx, y, P[i].z - nz);
      if(i){ const j = (i - 1) * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: couleur, side: T.DoubleSide, transparent: opacite < 1, opacity: opacite, depthWrite: false }));
    scene.scene.add(m);
    return m;
  };
  ruban(9 * k, 0.25, 0xFFFFFF, 0.95);
  ruban(5 * k, 0.35, 0x9FC56A, 0.9);
  const fait = ruban(5.2 * k, 0.45, 0x3B6900, 1);
  fait.geometry.setDrawRange(0, 0);

  /* départ et arrivée */
  const borne = (p, couleur) => {
    const m = new T.Mesh(new T.CylinderGeometry(3 * k, 3 * k, 0.6, 24), new T.MeshLambertMaterial({ color: couleur }));
    m.position.copy(p); m.position.y = 0.3; scene.scene.add(m);
  };
  if(P.length){ borne(P[0], 0xFFFFFF); borne(P[P.length - 1], 0x14161B); }

  /* ---- les points de travail : des poteaux numérotés ---- */
  const disque = (texte, couleur) => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
    g.fillStyle = couleur; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 60px -apple-system, Segoe UI, Roboto, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(texte), 64, 68);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    return t;
  };
  const poteaux = [];
  (o.reperes || []).forEach((r, rang) => {
    if(!isFinite(r.lat) || !isFinite(r.lon)) return;
    const m = EC3D.versMonde(r.lat, r.lon), ici = new T.Vector3(m.x, 0, m.z);
    /* où il se trouve sur le chemin : le sommet le plus proche */
    let best = 0, dmin = Infinity;
    P.forEach((p, i) => { const d = p.distanceToSquared(ici); if(d < dmin){ dmin = d; best = i; } });
    const nat = nature(r.type);
    const g = new T.Group();
    g.userData.rang = rang;
    const h = 14 * k;
    const tige = new T.Mesh(new T.CylinderGeometry(0.35 * k, 0.35 * k, h, 8), new T.MeshLambertMaterial({ color: 0x3A3B37 }));
    tige.position.y = h / 2; g.add(tige);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: disque(r.n, nat.couleur), depthTest: false }));
    sp.scale.set(7 * k, 7 * k, 1); sp.position.y = h + 3.5 * k; sp.renderOrder = 10; g.add(sp);
    g.position.copy(ici);
    scene.scene.add(g);
    poteaux.push({ r: r, rang: rang, nat: nat, groupe: g, d: cum[best], vu: false });
  });
  poteaux.sort((a, b) => a.d - b.d);

  /* ---- la voiture (provisoire, comme dans le parc) ---- */
  const v = EC3D.voiture3D({ modele: o.modele || 'a3' });
  scene.scene.add(v.groupe);

  /* ---- l'interface : lecture, vitesse, curseur, carte du point ---- */
  const css = (e, s) => { e.style.cssText = s; return e; };
  const barre = css(document.createElement('div'), 'position:absolute;left:8px;right:8px;bottom:8px;z-index:3;display:flex;gap:6px;align-items:center;' +
    'background:rgba(255,255,255,.94);border:1px solid #DCDCD3;border-radius:14px;padding:6px 8px;box-shadow:0 2px 10px rgba(0,0,0,.12);');
  const bouton = (txt, titre) => { const b = css(document.createElement('button'), 'border:0;background:#F2F2EC;color:#14161B;border-radius:999px;padding:7px 11px;' +
    'font-size:14px;font-weight:700;cursor:pointer;flex:0 0 auto;font-family:inherit;'); b.type = 'button'; b.textContent = txt; b.title = titre; barre.appendChild(b); return b; };
  const bDebut = bouton('⏮', 'Au départ');
  const bLire = bouton('▶', 'Lire / pause');
  const curseur = css(document.createElement('input'), 'flex:1 1 auto;min-width:60px;accent-color:#3B6900;margin:0;');
  curseur.type = 'range'; curseur.min = 0; curseur.max = 1000; curseur.value = 0; curseur.setAttribute('aria-label', 'Avancement du trajet');
  barre.appendChild(curseur);
  const bVit = bouton('×1', 'Vitesse de lecture');
  hote.appendChild(barre);
  const haut = css(document.createElement('div'), 'position:absolute;left:8px;top:8px;right:8px;z-index:3;display:flex;gap:6px;flex-wrap:wrap;pointer-events:none;');
  const pil = (txt, titre) => { const b = css(document.createElement('button'), 'pointer-events:auto;border:1px solid #DCDCD3;background:rgba(255,255,255,.94);color:#14161B;' +
    'border-radius:999px;padding:6px 11px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 1px 4px rgba(0,0,0,.12);');
    b.type = 'button'; b.textContent = txt; b.title = titre; haut.appendChild(b); return b; };
  const bSuivre = pil('🎥 Suivre la voiture', 'La caméra derrière la voiture');
  const bTout = pil('⤢ Tout le trajet', 'Voir le trajet entier');
  hote.appendChild(haut);
  const fiche = css(document.createElement('div'), 'position:absolute;left:8px;right:8px;bottom:62px;z-index:3;display:none;background:#fff;color:#14161B;' +
    'border:1px solid #DCDCD3;border-radius:14px;padding:10px 12px;font-size:14px;line-height:1.5;box-shadow:0 4px 18px rgba(0,0,0,.18);max-height:45%;overflow:auto;');
  hote.appendChild(fiche);
  const note = css(document.createElement('div'), 'position:absolute;right:8px;top:44px;z-index:2;font-size:11px;color:#3A3B37;background:rgba(255,255,255,.85);' +
    'border-radius:8px;padding:2px 8px;pointer-events:none;max-width:70%;text-align:right;');
  note.textContent = 'Rejoué à vitesse régulière : ce n’est pas la vitesse de la voiture.';
  hote.appendChild(note);
  /* dite une fois, puis elle s'efface (elle revient à chaque lecture) */
  const dire = () => { note.style.transition = 'none'; note.style.opacity = '1'; clearTimeout(note._t);
    note._t = setTimeout(() => { note.style.transition = 'opacity .8s'; note.style.opacity = '0'; }, 6000); };
  dire();

  /* ---- l'état de la lecture ---- */
  const DUREE = Math.max(25, Math.min(90, L / k / 1000 * 7));   /* ~7 s par km, entre 25 s et 1 min 30 */
  let d = 0, lit = false, vitesse = 1, pause = 0, suivre = true, cap = surLeChemin(0).cap, prochain = 0;
  function majBoutons(){
    bLire.textContent = lit ? '⏸' : '▶';
    bVit.textContent = '×' + vitesse;
    bSuivre.style.background = suivre ? '#3B6900' : 'rgba(255,255,255,.94)';
    bSuivre.style.color = suivre ? '#fff' : '#14161B';
  }
  function placer(sansVol){
    const s = surLeChemin(d);
    v.groupe.position.copy(s.pos);
    let dc = s.cap - cap; dc = Math.atan2(Math.sin(dc), Math.cos(dc));
    cap = sansVol ? s.cap : cap + dc * 0.18;
    v.groupe.rotation.y = cap;
    /* le trait parcouru */
    fait.geometry.setDrawRange(0, Math.max(0, (s.i - 1)) * 6);
    curseur.value = Math.round(d / L * 1000);
  }
  function ouvrirPoint(rang, enRoute){
    const p = poteaux.find(x => x.rang === rang);
    if(!p) return;
    const r = p.r, nat = p.nat;
    let h = '<div style="display:flex;gap:9px;align-items:flex-start;"><span style="flex:0 0 auto;min-width:24px;height:24px;border-radius:12px;background:' + nat.couleur +
      ';color:#fff;font-weight:800;font-size:12.5px;display:inline-flex;align-items:center;justify-content:center;">' + ech(r.n) + '</span><div style="flex:1;min-width:0;">' +
      '<b>' + ech(nat.icone) + ' ' + ech(r.theme || r.nom || nat.mot) + '</b>' + (r.heure ? ' <span style="color:#64655F;font-size:12.5px;">· ' + ech(r.heure) + '</span>' : '');
    if(r.insp) h += '<div style="margin-top:4px;">👨‍✈️ ' + ech(r.insp) + '</div>';
    if(r.mon) h += '<div style="margin-top:2px;">🔱 ' + ech(r.mon) + '</div>';
    h += '</div><button type="button" aria-label="Fermer" style="border:0;background:none;font-size:18px;cursor:pointer;color:#64655F;padding:0 2px;">✕</button></div>';
    fiche.innerHTML = h;
    fiche.style.display = '';
    fiche.querySelector('button').addEventListener('click', () => { fiche.style.display = 'none'; });
    if(!enRoute){
      /* touché à la main : la voiture y va */
      d = p.d; placer(true); prochain = poteaux.indexOf(p) + 1;
      if(suivre) cadrerVoiture(0.9);
    }
  }
  function cadrerVoiture(duree){
    const s = surLeChemin(d);
    scene.voler(s.pos, 110, 1.0, cap - Math.PI / 2, duree || 1.0);   /* θ = cap − π/2 : derrière elle */
  }
  function cadrerTout(){
    let x1 = Infinity, x2 = -Infinity, z1 = Infinity, z2 = -Infinity;
    P.forEach(p => { x1 = Math.min(x1, p.x); x2 = Math.max(x2, p.x); z1 = Math.min(z1, p.z); z2 = Math.max(z2, p.z); });
    const ext = Math.max(x2 - x1, z2 - z1, 300);
    scene.voler(new T.Vector3((x1 + x2) / 2, 0, (z1 + z2) / 2), ext * 1.25 + 200, 0.75, 0, 1.2);
  }

  bLire.addEventListener('click', () => {
    if(d >= L - 0.01){ d = 0; prochain = 0; poteaux.forEach(p => { p.vu = false; }); }
    lit = !lit; pause = 0;
    if(lit) dire();
    if(lit){ fiche.style.display = 'none'; if(!suivre){ suivre = true; cadrerVoiture(0.9); } }
    majBoutons();
  });
  bDebut.addEventListener('click', () => { d = 0; prochain = 0; poteaux.forEach(p => { p.vu = false; }); placer(true); fiche.style.display = 'none'; if(suivre) cadrerVoiture(0.8); });
  bVit.addEventListener('click', () => { vitesse = vitesse === 1 ? 2 : vitesse === 2 ? 4 : 1; majBoutons(); });
  curseur.addEventListener('input', () => {
    d = curseur.value / 1000 * L; placer(true);
    prochain = poteaux.findIndex(p => p.d > d); if(prochain < 0) prochain = poteaux.length;
  });
  bSuivre.addEventListener('click', () => { suivre = true; majBoutons(); cadrerVoiture(0.9); });
  bTout.addEventListener('click', () => { suivre = false; majBoutons(); cadrerTout(); });

  /* ---- chaque image ---- */
  let majSol = 0;
  scene.demarrer(dt => {
    if(lit){
      if(pause > 0){ pause -= dt; }
      else{
        d += L / DUREE * dt * vitesse;
        /* un point de travail atteint : on s'arrête dessus, on lit */
        if(prochain < poteaux.length && d >= poteaux[prochain].d){
          d = poteaux[prochain].d;
          ouvrirPoint(poteaux[prochain].rang, true);
          pause = 2.6 / Math.sqrt(vitesse);
          prochain++;
        }
        if(d >= L){ d = L; lit = false; majBoutons(); }
      }
      placer(false);
    }
    if(suivre && !scene.vol){
      /* derrière la voiture, sans à-coups */
      scene.cible.lerp(v.groupe.position, Math.min(1, dt * 5));
      let dt2 = (cap - Math.PI / 2) - scene.theta; dt2 = Math.atan2(Math.sin(dt2), Math.cos(dt2));
      if(lit) scene.theta += dt2 * Math.min(1, dt * 1.5);
    }
    /* la voiture un peu grossie de loin, pour qu'on la voie */
    v.groupe.scale.setScalar(Math.max(1.6, Math.min(14, scene.r / 60)) * k);
    /* les poteaux aussi : lisibles de loin comme de près */
    const ep = Math.max(1, Math.min(8, scene.r / 220));
    poteaux.forEach(p => p.groupe.scale.setScalar(ep));
    if(scene.scene.fog){ scene.scene.fog.near = scene.r * 2; scene.scene.fog.far = scene.r * 6; }
    scene.cam.far = scene.r * 8; scene.cam.near = Math.max(0.3, scene.r / 500); scene.cam.updateProjectionMatrix();
    majSol -= dt;
    if(majSol <= 0){ majSol = 0.35; sol.autour(scene.cible.x, scene.cible.z, scene.r); bat.autour(scene.cible.x, scene.cible.z, scene.r); }
  });

  placer(true);
  majBoutons();
  /* d'abord tout le trajet, puis on se pose derrière la voiture */
  cadrerTout();
  suivre = false; majBoutons();
  return {
    detruire(){ visible = false; scene.detruire(); },
    ouvrir(rang){ lit = false; majBoutons(); ouvrirPoint(rang, false); },
    montrer(oui){ visible = !!oui; }
  };
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-trajet3d.js'] = true;
