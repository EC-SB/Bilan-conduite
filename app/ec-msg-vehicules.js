/* Déployé le 14/11/2026 à 12:06 — v1436 */
/* ============================================================
   ec-msg-vehicules.js — 🚗 LES CONVERSATIONS DES VÉHICULES (v1390)

   David, le 10 novembre : « dans la messagerie, ajoute une catégorie
   après Permis : Véhicule, et crée une conversation de groupe équipe
   pour chaque véhicule, avec à la place de l'image le numéro de
   garage (que je puisse changer), et un nom du type “A3 1 GA-700-KR”
   que je puisse changer. En haut, le kilométrage, modifiable ici et
   lié à la fiche du véhicule. Et des boutons rapides : signaler un
   souci, un rendez-vous garage, un problème de carrosserie, un
   accident avec la position GPS, un pneu crevé avec la position GPS. »

   Ses réponses :
     · les boutons écrivent le message ET la Flotte (⚠️ Problème
       signalé, 🏭 Passage au garage prévu, la fiche carrosserie) ;
     · changer le garage ici déplace la voiture (fiche du véhicule et
       fiche du garage) ;
     · une conversation pour chaque véhicule qui n'est pas vendu, créée
       toute seule — motos, scooters et remorque compris.

   Le Worker fait le travail (voir « 🚗 LES CONVERSATIONS DES
   VÉHICULES » dans cloudflare-worker.js). Ici : la catégorie, le rond
   du garage, la barre du haut, les boutons et leurs petits
   formulaires (huit depuis la v1436 : ⛽ plein, 🧽 et 🚿 nettoyages).
   ============================================================ */

const VEH_EC = { infos: {}, lu: {}, enCours: {}, geste: null, gesteConv: '', km: false, nom: false };
const VEH_INFOS_DUREE = 180000;       /* la barre se relit au plus toutes les 3 min */
const VEH_SYNCHRO_DUREE = 6 * 3600e3; /* les conversations se tiennent à jour toutes les 6 h */

function estFilVehiculeEC(c){ return !!(c && c.vehicule); }

/* ---------- créer ce qui manque (une fois toutes les 6 h, ou forcé) ---------- */
async function assurerLesFilsVehiculesEC(force){
  if(typeof aDroit === 'function' && !aDroit('messagerie')) return;
  let dernier = 0;
  try{ dernier = Number(localStorage.getItem('ec_veh_synchro') || 0); }catch(e){}
  if(!force && Date.now() - dernier < VEH_SYNCHRO_DUREE) return;
  try{ localStorage.setItem('ec_veh_synchro', String(Date.now())); }catch(e){}
  try{
    const r = await appelPrep({ action: 'vehConvAssurer' });
    if(r && r.crees && typeof afficherMessagerie === 'function') afficherMessagerie(true);
  }catch(e){ /* la prochaine fois */ }
}

/* ---------- le rond : le numéro du garage ---------- */
function rondVehiculeEC(el, c){
  el.classList.add('ckAvVeh');
  el.textContent = c && c.garage ? String(c.garage) : '🚗';
  el.classList.toggle('sansGarage', !(c && c.garage));
  el.title = c && c.garage ? 'Garage n° ' + c.garage : 'Pas de garage attitré';
}

/* ---------- ce que la barre du haut montre ---------- */
async function infosVehiculeEC(id, force){
  if(!force && VEH_EC.infos[id] && Date.now() - (VEH_EC.lu[id] || 0) < VEH_INFOS_DUREE) return VEH_EC.infos[id];
  if(VEH_EC.enCours[id]) return VEH_EC.enCours[id];
  VEH_EC.enCours[id] = appelPrep({ action: 'vehInfos', id: id }).then(r => {
    VEH_EC.infos[id] = r || {}; VEH_EC.lu[id] = Date.now(); return VEH_EC.infos[id];
  }).finally(() => { delete VEH_EC.enCours[id]; });
  return VEH_EC.enCours[id];
}
function kmLisibleEC(n){ return Number(n || 0).toLocaleString('fr-FR') + ' km'; }
function dateCourteEC(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] : ''; }

function barreVehiculeEC(f){
  const c = f.conv || {};
  const z = document.createElement('div');
  z.className = 'msgVeh';
  const remplir = (r) => {
    z.innerHTML = '';
    const v = r && r.vehicule;
    if(!v){ z.innerHTML = '<span class="msgVehDoux">' + (r ? '🚗 Ce véhicule n’est plus dans la Flotte.' : '🚗 Lecture du véhicule…') + '</span>'; return; }
    const ligne = document.createElement('div');
    ligne.className = 'msgVehL';
    /* 🅿️ le garage — un menu pour qui a la Flotte en modification */
    const bg = document.createElement('button');
    bg.type = 'button';
    bg.className = 'msgVehB';
    bg.innerHTML = '🅿️ ' + (r.garage ? 'Garage n° <b>' + echapper(r.garage.numero) + '</b>' : 'Pas de garage') + (r.garages ? ' ▾' : '');
    if(r.garages) bg.addEventListener('click', ev => { ev.stopPropagation(); menuGarageVehiculeEC(f, bg, r); });
    else bg.disabled = true;
    ligne.appendChild(bg);
    /* 🔢 le kilométrage */
    if(VEH_EC.km === c.id){
      const k = document.createElement('div');
      k.className = 'msgVehKm';
      k.innerHTML = '<input type="number" inputmode="numeric" min="0" step="1" aria-label="Kilométrage"><button type="button" class="ok">✓</button><button type="button">✕</button>';
      const inp = k.querySelector('input');
      inp.value = v.km || '';
      inp.placeholder = String(v.km || '');
      const valider = async () => {
        const km = parseInt(String(inp.value).replace(/[^\d]/g, ''), 10);
        if(!km){ inp.focus(); return; }
        k.querySelector('.ok').disabled = true;
        try{
          const rep = await appelPrep({ action: 'vehKm', id: c.id, km: km });
          if(rep && rep.status === 'error') throw new Error(rep.message);
          VEH_EC.km = false;
          if(typeof showToast === 'function') showToast('🔢 ' + kmLisibleEC(km) + ' — la fiche du véhicule est à jour');
          await infosVehiculeEC(c.id, true);
          if(typeof rafraichirLeFil === 'function') await rafraichirLeFil();
          dessinerLeFil();
        }catch(e){ k.querySelector('.ok').disabled = false; if(typeof showToast === 'function') showToast('🔢 ' + (e.message || e)); }
      };
      k.querySelector('.ok').addEventListener('click', valider);
      k.querySelectorAll('button')[1].addEventListener('click', () => { VEH_EC.km = false; remplir(r); });
      inp.addEventListener('keydown', ev => { if(ev.key === 'Enter') valider(); if(ev.key === 'Escape'){ VEH_EC.km = false; remplir(r); } });
      ligne.appendChild(k);
      setTimeout(() => { try{ inp.focus(); inp.select(); }catch(e){} }, 30);
    }else{
      const bk = document.createElement('button');
      bk.type = 'button';
      bk.className = 'msgVehB km';
      bk.innerHTML = '🔢 <b>' + kmLisibleEC(v.km) + '</b>' + (v.kmLeveLe ? ' <span class="msgVehDoux">· ' + dateCourteEC(v.kmLeveLe) + '</span>' : '') + ' ✏️';
      bk.title = 'Changer le kilométrage (il va dans la fiche du véhicule)';
      bk.addEventListener('click', ev => { ev.stopPropagation(); VEH_EC.km = c.id; remplir(r); });
      if(f.peutEcrire) ligne.appendChild(bk);
      else { bk.disabled = true; ligne.appendChild(bk); }
    }
    if(v.immat){
      const pl = document.createElement('span');
      pl.className = 'msgVehPlaque';
      pl.textContent = v.immat;
      ligne.appendChild(pl);
    }
    z.appendChild(ligne);
    /* ce qui reste ouvert dans la Flotte : un souci, un rendez-vous */
    (r.ouverts || []).slice(0, 3).forEach(o => {
      const l = document.createElement('div');
      l.className = 'msgVehOuvert';
      l.textContent = (o.type === 'garage' ? '🔧 RDV ' + (dateCourteEC(o.date) || '') + (o.garage ? ' · ' + o.garage : '') + (o.libelle ? ' · ' + o.libelle : '')
                                            : (String(o.libelle || '⚠️ Problème signalé').replace(/\s*\(-?\d+\.\d+, -?\d+\.\d+\)\s*$/, '')));
      z.appendChild(l);
    });
  };
  remplir(VEH_EC.infos[c.id] || null);
  if(!VEH_EC.infos[c.id] || Date.now() - (VEH_EC.lu[c.id] || 0) >= VEH_INFOS_DUREE){
    infosVehiculeEC(c.id).then(r => { if(z.isConnected) remplir(r); }).catch(e => { if(z.isConnected) z.innerHTML = '<span class="msgVehDoux">⚠️ ' + echapper(e.message || e) + '</span>'; });
  }
  return z;
}

/* ---------- 🅿️ changer de garage ---------- */
function menuGarageVehiculeEC(f, ancre, r){
  const c = f.conv || {};
  const choisir = async (gid) => {
    try{
      const rep = await appelPrep({ action: 'vehGarage', id: c.id, garage: gid });
      if(rep && rep.status === 'error') throw new Error(rep.message);
      c.garage = rep && rep.garage ? String(rep.garage.numero) : '';
      const l = (conversationsEC || []).find(x => x.id === c.id);
      if(l) l.garage = c.garage;
      await infosVehiculeEC(c.id, true);
      if(typeof rafraichirLeFil === 'function') await rafraichirLeFil();
      dessinerLeFil();
      if(typeof dessinerLaListeMessagerie === 'function') dessinerLaListeMessagerie();
    }catch(e){ if(typeof showToast === 'function') showToast('🅿️ ' + (e.message || e)); }
  };
  const items = (r.garages || []).map(g => ({ emoji: (r.garage && r.garage.id === g.id) ? '✅' : '🅿️', texte: 'Garage n° ' + g.numero, faire: () => choisir(g.id) }));
  items.push({ sep: true });
  items.push({ emoji: '🚫', texte: 'Pas de garage attitré', faire: () => choisir('') });
  if(typeof menuGestesEC === 'function') menuGestesEC(ancre, '🅿️ Où dort ' + (r.vehicule.nom || 'ce véhicule') + ' ?', items);
}

/* ---------- ✏️ renommer ---------- */
function renommerVehiculeEC(f){
  VEH_EC.nom = (f.conv || {}).id;
  VEH_EC.geste = null;
  dessinerLeFil();
}
function formNomVehiculeEC(f){
  const c = f.conv || {};
  const z = document.createElement('div');
  z.className = 'ckCren msgVehForm';
  z.innerHTML = '<div class="lab">✏️ LE NOM DE LA CONVERSATION</div>' +
    '<div class="ligne"><label style="flex:1 1 100%">Nom<input type="text" maxlength="80" class="vehNom"></label></div>' +
    '<div class="ckNote">Par exemple « A3 1 GA-700-KR » : le modèle, le numéro, la plaque.</div>';
  const inp = z.querySelector('.vehNom');
  inp.value = c.titre || '';
  const info = VEH_EC.infos[c.id];
  if(info && info.titreConseille && info.titreConseille !== c.titre){
    const s = document.createElement('button');
    s.type = 'button'; s.className = 'msgVehSugg';
    s.textContent = '↺ ' + info.titreConseille;
    s.title = 'Reprendre le nom tiré de la Flotte';
    s.addEventListener('click', () => { inp.value = info.titreConseille; inp.focus(); });
    z.querySelector('.ckNote').appendChild(document.createTextNode(' ')); z.querySelector('.ckNote').appendChild(s);
  }
  const acts = document.createElement('div');
  acts.className = 'acts';
  acts.appendChild(ckBouton('💾 Renommer', 'Renommer la conversation', async () => {
    const t = inp.value.trim();
    if(!t){ inp.focus(); return; }
    const rep = await appelPrep({ action: 'vehTitre', id: c.id, titre: t });
    if(rep && rep.status === 'error') throw new Error(rep.message);
    VEH_EC.nom = false;
    c.titre = rep.titre || t;
    const l = (conversationsEC || []).find(x => x.id === c.id);
    if(l) l.titre = c.titre;
    if(typeof rafraichirLeFil === 'function') await rafraichirLeFil();
    dessinerLeFil();
    if(typeof dessinerLaListeMessagerie === 'function') dessinerLaListeMessagerie();
  }, 'p'));
  acts.appendChild(ckBouton('Annuler', '', () => { VEH_EC.nom = false; dessinerLeFil(); }));
  z.appendChild(acts);
  setTimeout(() => { try{ inp.focus(); }catch(e){} }, 30);
  return z;
}

/* ---------- ⚡ les boutons du véhicule ---------- */
/* ⛽🧽 v1436 — David, le 14 novembre : « il faut ajouter j'ai fait le
   plein, avec un pop pour mettre le nombre de litres et le coût, et
   nettoyage intérieur avec la date, et nettoyage extérieur avec la
   date ». Comme les cinq premiers : le message ET la Flotte. */
const GESTES_VEH_EC = [
  ['souci', '⚠️ Signaler un souci'],
  ['garage', '🔧 RDV garage'],
  ['carrosserie', '🩹 Carrosserie'],
  ['accident', '🚨 Accident 📍'],
  ['pneu', '🛞 Pneu crevé 📍'],
  ['plein', '⛽ J’ai fait le plein'],
  ['interieur', '🧽 Nettoyage intérieur'],
  ['exterieur', '🚿 Nettoyage extérieur']
];
function aujourdhuiIsoVehEC(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function boutonsGestesVehiculeEC(f){
  return GESTES_VEH_EC.map(([cle, nom]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ckVite ckViteVeh' + (VEH_EC.geste === cle && VEH_EC.gesteConv === (f.conv || {}).id ? ' on' : '');
    b.textContent = nom;
    if(cle === 'accident' || cle === 'pneu') b.title = 'Envoie le message avec ta position GPS, et l’inscrit dans la fiche du véhicule';
    b.addEventListener('click', () => ouvrirGesteVehiculeEC(f, cle));
    return b;
  });
}
async function ouvrirGesteVehiculeEC(f, cle){
  const c = f.conv || {};
  VEH_EC.nom = false;
  /* 🩹 la vraie fiche carrosserie, pour poser le point au bon endroit */
  if(cle === 'carrosserie' && typeof peutModifier === 'function' && peutModifier('carrosserie') &&
     typeof ouvrirCarrosserie === 'function' && typeof chargerCarrosserie === 'function'){
    try{
      await chargerCarrosserie(true);
      const v = (typeof vehiculesCarrosserie !== 'undefined' ? vehiculesCarrosserie : []).find(x => String(x.id) === String(c.vehicule));
      if(v){
        ouvrirCarrosserie(v, { apresNouveau: async (d) => {
          const t = (typeof typeDommage === 'function') ? typeDommage(d.type) : { nom: d.type, emoji: '' };
          const vue = ((typeof gabaritDuVehicule === 'function' ? gabaritDuVehicule(v).vues : []).find(x => x.cle === d.vue) || {}).nom || d.vue;
          try{
            const rep = await appelPrep({ action: 'vehGeste', id: c.id, geste: 'carrosserie', dejaSurLaFiche: true,
              texte: (t.emoji ? t.emoji + ' ' : '') + t.nom + ' — ' + vue + (d.detail ? ' : ' + d.detail : '') });
            if(rep && rep.status === 'error') throw new Error(rep.message);
            if(typeof rafraichirLeFil === 'function') await rafraichirLeFil();
            if(filOuvertEC && filOuvertEC.conv && filOuvertEC.conv.id === c.id) dessinerLeFil();
          }catch(e){ if(typeof showToast === 'function') showToast('Le message n’est pas parti : ' + (e.message || e)); }
        } });
        return;
      }
    }catch(e){ /* on retombe sur le petit formulaire */ }
  }
  VEH_EC.geste = (VEH_EC.geste === cle && VEH_EC.gesteConv === c.id) ? null : cle;
  VEH_EC.gesteConv = c.id;
  dessinerLeFil();
}
function demainIsoVehEC(){ const d = new Date(Date.now() + 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function formGesteVehiculeEC(f){
  const c = f.conv || {};
  const cle = VEH_EC.geste;
  const z = document.createElement('div');
  z.className = 'ckCren msgVehForm';
  const avecPos = cle === 'accident' || cle === 'pneu';
  if(cle === 'souci'){
    z.innerHTML = '<div class="lab">⚠️ SIGNALER UN SOUCI</div>' +
      '<div class="ligne"><label style="flex:1 1 100%">Ce qui se passe<textarea rows="2" class="vehTexte" placeholder="Ex : voyant moteur allumé, bruit au freinage…"></textarea></label></div>' +
      '<div class="ckNote">Le message part dans la conversation, et le souci s’inscrit dans la fiche du véhicule (⚠️ Problème signalé).</div>';
  }else if(cle === 'garage'){
    z.innerHTML = '<div class="lab">🔧 RENDEZ-VOUS GARAGE</div>' +
      '<div class="ligne"><label>Jour<input type="date" class="vehJour"></label><label>Heure<input type="time" step="900" class="vehHeure"></label>' +
      '<label>Où<input type="text" class="vehChez" placeholder="Garage, concession…"></label></div>' +
      '<div class="ligne"><label style="flex:1 1 100%">Pour quoi<input type="text" class="vehTexte" placeholder="Ex : révision, pneus, carrosserie…"></label></div>' +
      '<div class="ckNote">Le rendez-vous s’inscrit dans la fiche du véhicule (🏭 Passage au garage, prévu).</div>';
    z.querySelector('.vehJour').value = demainIsoVehEC();
    z.querySelector('.vehHeure').value = '09:00';
  }else if(cle === 'plein'){
    z.innerHTML = '<div class="lab">⛽ J’AI FAIT LE PLEIN</div>' +
      '<div class="ligne"><label>Litres<input type="text" inputmode="decimal" class="vehLitres" placeholder="Ex : 42,5"></label>' +
      '<label>Coût (€)<input type="text" inputmode="decimal" class="vehCout" placeholder="Ex : 78,20"></label></div>' +
      '<div class="ckNote vehPrixLitre"></div>' +
      '<div class="ckNote">Le message part dans la conversation, et le plein s’inscrit dans la fiche du véhicule (⛽ Plein).</div>';
    const prix = () => {
      const l = Number(String(z.querySelector('.vehLitres').value).replace(',', '.'));
      const e = Number(String(z.querySelector('.vehCout').value).replace(',', '.'));
      z.querySelector('.vehPrixLitre').textContent = (l > 0 && e > 0)
        ? 'Soit ' + (e / l).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' € le litre.' : '';
    };
    z.querySelector('.vehLitres').addEventListener('input', prix);
    z.querySelector('.vehCout').addEventListener('input', prix);
    setTimeout(() => { try{ z.querySelector('.vehLitres').focus(); }catch(e){} }, 30);
  }else if(cle === 'interieur' || cle === 'exterieur'){
    z.innerHTML = '<div class="lab">' + (cle === 'interieur' ? '🧽 NETTOYAGE INTÉRIEUR' : '🚿 NETTOYAGE EXTÉRIEUR') + '</div>' +
      '<div class="ligne"><label>Fait le<input type="date" class="vehJour"></label></div>' +
      '<div class="ckNote">Le message part dans la conversation, et le nettoyage s’inscrit dans la fiche du véhicule (🧽 Nettoyage).</div>';
    z.querySelector('.vehJour').value = aujourdhuiIsoVehEC();
    z.querySelector('.vehJour').max = aujourdhuiIsoVehEC();
  }else if(cle === 'carrosserie'){
    z.innerHTML = '<div class="lab">🩹 PROBLÈME DE CARROSSERIE</div>' +
      '<div class="ligne"><label style="flex:1 1 100%">Où, et quoi<textarea rows="2" class="vehTexte" placeholder="Ex : rayure porte arrière côté passager"></textarea></label></div>' +
      '<div class="ckNote">Le message part dans la conversation, et s’inscrit dans la fiche du véhicule. Le bureau posera le point sur la fiche carrosserie.</div>';
  }else{
    z.innerHTML = '<div class="lab">' + (cle === 'accident' ? '🚨 ACCIDENT' : '🛞 PNEU CREVÉ') + ' — AVEC TA POSITION</div>' +
      '<div class="ligne"><label style="flex:1 1 100%">Un mot (facultatif)<textarea rows="2" class="vehTexte" placeholder="' +
      (cle === 'accident' ? 'Ex : accrochage, personne de blessé' : 'Ex : avant droit, on attend la dépanneuse') + '"></textarea></label></div>' +
      '<div class="ckNote">Ta position GPS part avec le message (Google Maps et Waze dans la bulle), et l’alerte s’inscrit dans la fiche du véhicule.</div>';
  }
  const acts = document.createElement('div');
  acts.className = 'acts';
  acts.appendChild(ckBouton(avecPos ? '📍 Envoyer avec ma position' : '📨 Envoyer', 'Envoyer', async (b) => {
    const q = s => z.querySelector(s);
    const envoi = { action: 'vehGeste', id: c.id, geste: cle, texte: q('.vehTexte') ? q('.vehTexte').value.trim() : '' };
    if(cle === 'garage'){ envoi.date = q('.vehJour').value; envoi.heure = q('.vehHeure').value; envoi.chez = q('.vehChez').value.trim(); }
    /* ⛽ v1436 — les litres et le coût, obligatoires ; 🧽 la date */
    if(cle === 'plein'){
      envoi.litres = q('.vehLitres').value.trim();
      envoi.cout = q('.vehCout').value.trim().replace(/\s*€$/, '');
      const ok = v => /^\d+([.,]\d+)?$/.test(String(v).replace(/\s/g, '')) && Number(String(v).replace(/\s/g, '').replace(',', '.')) > 0;
      if(!ok(envoi.litres)){ q('.vehLitres').focus(); return; }
      if(!ok(envoi.cout)){ q('.vehCout').focus(); return; }
    }
    if(cle === 'interieur' || cle === 'exterieur'){
      envoi.date = q('.vehJour').value;
      if(!envoi.date){ q('.vehJour').focus(); return; }
    }
    if((cle === 'souci' || cle === 'carrosserie') && !envoi.texte){ q('.vehTexte').focus(); return; }
    if(avecPos){
      b.textContent = '📍 Position…';
      const p = await positionDuTelephoneEC();
      const adresse = await adresseDuPointEC(p.latitude, p.longitude);
      envoi.position = { lat: p.latitude, lng: p.longitude, precision: Math.round(p.accuracy || 0), adresse: adresse };
    }
    const rep = await appelPrep(envoi);
    if(rep && rep.status === 'error') throw new Error(rep.message);
    VEH_EC.geste = null;
    delete VEH_EC.lu[c.id];
    if(typeof showToast === 'function') showToast('✅ Envoyé, et noté dans la fiche du véhicule');
    if(typeof rafraichirLeFil === 'function') await rafraichirLeFil();
    dessinerLeFil();
  }, 'p'));
  acts.appendChild(ckBouton('Annuler', '', () => { VEH_EC.geste = null; dessinerLeFil(); }));
  z.appendChild(acts);
  return z;
}
/* Ce qui se pose entre l'en-tête et le fil, et au-dessus de la barre d'écriture */
function hautDuFilVehiculeEC(f){ return estFilVehiculeEC(f && f.conv) ? barreVehiculeEC(f) : null; }
function formulaireDuFilVehiculeEC(f){
  const c = (f && f.conv) || {};
  if(!estFilVehiculeEC(c) || !f.peutEcrire) return null;
  if(VEH_EC.nom === c.id) return formNomVehiculeEC(f);
  if(VEH_EC.geste && VEH_EC.gesteConv === c.id) return formGesteVehiculeEC(f);
  return null;
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-msg-vehicules.js'] = true;
